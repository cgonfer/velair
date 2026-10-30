"""Project logical room groups onto the existing climate service adapter."""

from __future__ import annotations

from copy import deepcopy
import math
from types import SimpleNamespace

from homeassistant.exceptions import HomeAssistantError

from .climate_manager import ClimateManager
from .temperature import absolute_temperature, temperature_delta


class _GroupStates:
    def __init__(self, adapter):
        self.adapter = adapter

    def get(self, entity_id):
        return self.adapter.state(entity_id)


class _GroupHass:
    """Keep projections private to this adapter, never in HA's state machine."""

    def __init__(self, hass, adapter):
        self._hass = hass
        self.states = _GroupStates(adapter)

    def __getattr__(self, name):
        return getattr(self._hass, name)


class GroupClimateManager(ClimateManager):
    """Reuse validation and transport policy with one logical group target."""

    def __init__(self, hass, data, physical):
        self._physical_hass = hass
        self._data = data
        self._physical = physical
        self.delivery_status = {}
        super().__init__(_GroupHass(hass, self))

    def members(self, entity_id):
        group = self._data.get("room_groups", {}).get(entity_id)
        if group is None:
            return [entity_id]
        if group.get("delivery_mode") == "selected":
            return [group["delivery_entity_id"]]
        return list(group["members"])

    def state(self, entity_id):
        group = self._data.get("room_groups", {}).get(entity_id)
        if group is None:
            return self._physical_hass.states.get(entity_id)
        members = self.members(entity_id)
        states = [self._physical_hass.states.get(member) for member in members]
        known = [state for state in states if state is not None]
        if not known:
            return None
        # HA State attributes are read-only, including after deepcopy. Project
        # into a mutable detached mapping without changing the physical state.
        attributes = deepcopy(dict(known[0].attributes))
        unit = getattr(getattr(self._physical_hass.config, "units", None), "temperature_unit", "°C")
        if unit not in ("°C", "°F"):
            unit = "°C"
        attributes["temperature_unit"] = unit
        attributes["unit_of_measurement"] = unit
        for key in ("hvac_modes", "fan_modes", "preset_modes", "swing_modes", "swing_horizontal_modes"):
            attributes[key] = [value for value in attributes.get(key, [])
                               if all(value in state.attributes.get(key, []) for state in known)]
        features = int(attributes.get("supported_features", 0))
        for state in known[1:]:
            features &= int(state.attributes.get("supported_features", 0))
        attributes["supported_features"] = features
        limits = [self._physical.temperature_limits(member) for member in members]
        converted = [(absolute_temperature(low, self._physical.temperature_unit(member), unit),
                      absolute_temperature(high, self._physical.temperature_unit(member), unit))
                     for member, (low, high) in zip(members, limits)]
        attributes["min_temp"] = max(low for low, _high in converted)
        attributes["max_temp"] = min(high for _low, high in converted)
        steps = [temperature_delta(step, self._physical.temperature_unit(member), unit)
                 for member in members if (step := self._physical.temperature_step(member)) is not None]
        if steps:
            attributes["target_temp_step"] = max(steps)
        reference = self._physical_hass.states.get(group["temperature_entity_id"])
        attributes["current_temperature"] = None
        if reference is not None and reference.state not in ("unknown", "unavailable"):
            value = (reference.attributes.get("current_temperature")
                     if group["temperature_entity_id"].startswith("climate.") else reference.state)
            try:
                source_unit = reference.attributes.get("unit_of_measurement", reference.attributes.get("temperature_unit", unit))
                numeric = float(value)
                if not isinstance(value, bool) and math.isfinite(numeric):
                    attributes["current_temperature"] = absolute_temperature(numeric, source_unit, unit)
            except (TypeError, ValueError):
                pass
        available = any(state.state not in ("unknown", "unavailable") for state in known)
        attributes["group_availability"] = ("available" if len(known) == len(members)
            and all(state.state not in ("unknown", "unavailable") for state in known) else "partial" if available else "unavailable")
        modes = {state.state for state in known if state.state not in ("unknown", "unavailable")}
        mode = next(iter(modes)) if len(modes) == 1 else "mixed" if modes else "unavailable"
        attributes["group_state"] = "mixed" if len(modes) > 1 else mode
        attributes["friendly_name"] = group["name"]
        attributes["members"] = list(group["members"])
        actions = {state.attributes.get("hvac_action") for state in known}
        attributes["hvac_action"] = next(iter(actions)) if len(actions) == 1 else "idle"
        for key in ("temperature", "target_temp_low", "target_temp_high"):
            values = [absolute_temperature(float(state.attributes[key]), self._physical.temperature_unit(member), unit)
                      if state is not None and isinstance(state.attributes.get(key), (int, float)) else None
                      for member, state in zip(members, states)]
            attributes[key] = values[0] if all(value == values[0] for value in values) else None
        return SimpleNamespace(entity_id=entity_id, state=mode if available else "unavailable", attributes=attributes)

    async def _async_call(self, service, data, **kwargs):
        entity_id = data.get("entity_id")
        if entity_id not in self._data.get("room_groups", {}):
            return await self._physical._async_call(service, data, **kwargs)
        status = {}
        unit = self.temperature_unit(entity_id)
        mirror_context = self._physical._new_owned_context()
        group_members = self._data["room_groups"][entity_id]["members"]
        for member in group_members:
            expected = self._physical._expected_for_service(service, data)
            if expected:
                self._physical._register_expected_action(member, mirror_context, expected)
        for member in self.members(entity_id):
            payload = {**data, "entity_id": member}
            for key in ("temperature", "target_temp_low", "target_temp_high"):
                if isinstance(payload.get(key), (int, float)):
                    payload[key] = self._physical.normalize_target_temperature(
                        member, absolute_temperature(payload[key], unit, self._physical.temperature_unit(member)))
            try:
                state = self._physical_hass.states.get(member)
                if state is None or state.state in ("unknown", "unavailable"):
                    raise HomeAssistantError("Climate is unavailable")
                await self._physical._async_call(service, payload, **kwargs)
                status[member] = {"status": "success"}
            except Exception as err:
                status[member] = {"status": "failed", "message": str(err)}
        self.delivery_status[entity_id] = status
        for member in group_members:
            if all(item["status"] == "success" for item in status.values()):
                self._physical._mark_expected_action_delivered(member, mirror_context.id)
            else:
                self._physical._discard_expected_action(member, mirror_context.id)
        if any(item["status"] == "failed" for item in status.values()):
            raise HomeAssistantError(f"Room group delivery failed: {', '.join(member for member, item in status.items() if item['status'] == 'failed')}")

    def _supports_target_feature(self, entity_id, *, range_target):
        if entity_id not in self._data.get("room_groups", {}):
            return self._physical._supports_target_feature(entity_id, range_target=range_target)
        return all(self._physical._supports_target_feature(member, range_target=range_target)
                   for member in self.members(entity_id))

    def validate_temperature_target(self, entity_id, *, range_target, hvac_mode, ensure_on, temperature_only=False):
        super().validate_temperature_target(entity_id, range_target=range_target,
            hvac_mode=hvac_mode, ensure_on=ensure_on, temperature_only=temperature_only)
        if entity_id in self._data.get("room_groups", {}) and hvac_mode is None and not temperature_only:
            modes = {self._physical.effective_hvac_mode(member, None, ensure_on=ensure_on, range_target=range_target)
                     for member in self.members(entity_id)
                     if (state := self._physical_hass.states.get(member)) is not None
                     and state.state not in ("unknown", "unavailable")}
            if len(modes) > 1:
                raise ValueError("Group members have different effective HVAC modes; choose an explicit group mode")

    async def _async_set_temperature_target(self, entity_id, target, *, blocking, ensure_on, hvac_mode, range_target, climate_options):
        """Retain physical mode fallback, validation and complete action ownership."""
        if entity_id not in self._data.get("room_groups", {}):
            return await self._physical._async_set_temperature_target(
                entity_id, target, blocking=blocking, ensure_on=ensure_on,
                hvac_mode=hvac_mode, range_target=range_target, climate_options=climate_options)
        members = self.members(entity_id)
        unit = self.temperature_unit(entity_id)
        status = {}
        converted_targets = {}
        for member in members:
            member_unit = self._physical.temperature_unit(member)
            converted = {key: self._physical.normalize_target_temperature(member,
                         absolute_temperature(value, unit, member_unit))
                         if isinstance(value, (int, float)) else value for key, value in target.items()}
            for key, value in target.items():
                if isinstance(value, (int, float)) and not math.isclose(
                    absolute_temperature(converted[key], member_unit, unit), value, abs_tol=1e-6):
                    raise HomeAssistantError("Group target is no longer compatible with every member's temperature grid")
            converted_targets[member] = converted
        # A selected controller can propagate to its peers without preserving
        # HA context. Register bounded target expectations before sending it.
        group = self._data["room_groups"][entity_id]
        mirror_context = self._physical._new_owned_context()
        mirrored = list(group["members"])
        for member in mirrored:
            expected = {key: absolute_temperature(value, unit, self._physical.temperature_unit(member))
                        if isinstance(value, (int, float)) else value for key, value in target.items()}
            if hvac_mode is not None:
                expected["hvac_mode"] = hvac_mode
            self._physical._register_expected_action(member, mirror_context, expected)
        for member in members:
            converted = converted_targets[member]
            try:
                self._physical.validate_temperature_target(member, range_target=range_target,
                    hvac_mode=hvac_mode, ensure_on=ensure_on, temperature_only=not ensure_on and hvac_mode is None)
                state = self._physical_hass.states.get(member)
                if state is None or state.state in ("unknown", "unavailable"):
                    raise HomeAssistantError("Climate is unavailable")
                await self._physical._async_set_temperature_target(member, converted,
                    blocking=blocking, ensure_on=ensure_on, hvac_mode=hvac_mode,
                    range_target=range_target, climate_options=climate_options)
                status[member] = {"status": "success"}
            except Exception as err:
                status[member] = {"status": "failed", "message": str(err)}
        self.delivery_status[entity_id] = status
        for member in mirrored:
            if all(item["status"] == "success" for item in status.values()):
                self._physical._mark_expected_action_delivered(member, mirror_context.id)
            else:
                self._physical._discard_expected_action(member, mirror_context.id)
        if any(item["status"] == "failed" for item in status.values()):
            raise HomeAssistantError("Room group temperature delivery was incomplete")

    def climate_state_snapshot(self, entity_id):
        if entity_id not in self._data.get("room_groups", {}):
            return self._physical.climate_state_snapshot(entity_id)
        return {**super().climate_state_snapshot(entity_id),
                "group_members": {member: self._convert_snapshot(self._physical.climate_state_snapshot(member),
                                  self._physical.temperature_unit(member), self.temperature_unit(entity_id))
                                  for member in self.members(entity_id)}}

    @staticmethod
    def _convert_snapshot(snapshot, source_unit, target_unit):
        result = deepcopy(snapshot)
        for field in ("temperature", "target_temp_low", "target_temp_high"):
            if isinstance(result.get(field), (int, float)):
                result[field] = absolute_temperature(result[field], source_unit, target_unit)
        return result

    async def async_restore_state(self, entity_id, snapshot):
        if "group_members" not in snapshot:
            return await super().async_restore_state(entity_id, snapshot)
        failures = []
        for member in self.members(entity_id):
            if member not in snapshot["group_members"]:
                continue
            try:
                restored = self._convert_snapshot(snapshot["group_members"][member],
                    self.temperature_unit(entity_id), self._physical.temperature_unit(member))
                await self._physical.async_restore_state(member, restored)
            except Exception:
                failures.append(member)
        if failures:
            raise HomeAssistantError(f"Could not restore group members: {', '.join(failures)}")
