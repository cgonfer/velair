"""Storage helpers for Velair."""

from __future__ import annotations

import asyncio
from copy import deepcopy
import logging
import math
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN
from .models import SchedulerData, normalize_schedule_data, serialize_schedule_data
from .temperature import (
    CELSIUS,
    FAHRENHEIT,
    absolute_temperature,
    normalize_temperature_unit,
    rate_per_degree,
    temperature_delta,
)

STORAGE_VERSION = 1
TEMPERATURE_FORMAT_KEY = "temperature_format"
RUNTIME_TEMPERATURE_FORMAT = "runtime_v1"
CANONICAL_TEMPERATURE_FORMAT = "celsius_v1"  # Published v1.1 compatibility.
TEMPERATURE_UNIT_KEY = "temperature_unit"
TEMPERATURE_REVISION_KEY = "temperature_revision"
LAST_TEMPERATURE_MIGRATION_KEY = "last_temperature_migration"
TEMPERATURE_MIGRATION_REASON_KEY = "temperature_migration_reason"
LEGACY_CELSIUS_RESET_REASON = "legacy_celsius_upgrade_reset_required"

_LOGGER = logging.getLogger(__name__)


class VelairStorage:
    """Typed wrapper around Home Assistant's Store helper."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        """Initialize storage."""
        self._store: Store[dict[str, Any]] = Store(
            hass,
            STORAGE_VERSION,
            f"{DOMAIN}.{entry_id}",
        )
        self.data: SchedulerData | None = None
        self._hass = hass
        self._climate_entities: list[str] = []
        self._temperature_unit = self._home_unit()
        self._temperature_revision = 0
        self._last_temperature_migration: dict[str, Any] | None = None
        self._temperature_migration_reason: str | None = None
        self._migration_lock = asyncio.Lock()

    async def async_load(self, climate_entities: list[str]) -> SchedulerData:
        """Load and normalize scheduler data."""
        raw_data = await self._store.async_load()
        self._climate_entities = climate_entities
        if raw_data is None:
            self._temperature_unit = self._home_unit()
            runtime_data = self._fresh_runtime_defaults()
        else:
            # Velair v1.1 and celsius_v1 both persisted Celsius semantics.
            declared_unit = raw_data.get(TEMPERATURE_UNIT_KEY)
            legacy_celsius = (
                declared_unit not in (CELSIUS, FAHRENHEIT)
                and raw_data.get(TEMPERATURE_FORMAT_KEY) != RUNTIME_TEMPERATURE_FORMAT
            )
            self._temperature_unit = (
                declared_unit
                if declared_unit in (CELSIUS, FAHRENHEIT)
                else CELSIUS
            )
            revision = raw_data.get(TEMPERATURE_REVISION_KEY, 0)
            self._temperature_revision = revision if isinstance(revision, int) and revision >= 0 else 0
            last = raw_data.get(LAST_TEMPERATURE_MIGRATION_KEY)
            self._last_temperature_migration = deepcopy(last) if isinstance(last, dict) else None
            stored_reason = raw_data.get(TEMPERATURE_MIGRATION_REASON_KEY)
            self._temperature_migration_reason = (
                LEGACY_CELSIUS_RESET_REASON
                if (
                    self._temperature_unit != self._home_unit()
                    and (
                        legacy_celsius
                        or stored_reason == LEGACY_CELSIUS_RESET_REASON
                    )
                )
                else None
            )
            runtime_data = deepcopy(raw_data)
            if self._temperature_unit == FAHRENHEIT:
                runtime_data = self._hydrate_fahrenheit_defaults(runtime_data)
        self.data = normalize_schedule_data(runtime_data, climate_entities)
        await self.async_save()
        return self.data

    async def async_save(self) -> None:
        """Save current scheduler data."""
        async with self._migration_lock:
            if self.data is None:
                return
            await self._store.async_save(self._raw_payload(self.data))

    @property
    def effective_temperature_unit(self) -> str:
        """Return the unit of the currently hydrated in-memory model."""
        return self._temperature_unit

    @property
    def home_assistant_temperature_unit(self) -> str:
        """Return Home Assistant's currently configured temperature unit."""
        return self._home_unit()

    @property
    def temperature_migration_required(self) -> bool:
        """Return whether legacy data needs an explicit source-unit choice."""
        return self._temperature_unit != self._home_unit()

    def temperature_migration_status(self) -> dict[str, Any]:
        """Return serializable legacy temperature migration state."""
        target = self._home_unit()
        return {
            "required": self.temperature_migration_required,
            "reason": (
                self._temperature_migration_reason
                or (
                    "home_assistant_unit_changed"
                    if self.temperature_migration_required
                    else None
                )
            ),
            "source_unit": self._temperature_unit,
            "target_unit": target,
            "temperature_revision": self._temperature_revision,
            "last_temperature_migration": deepcopy(self._last_temperature_migration),
        }

    async def async_resolve_temperature_migration(
        self,
        source_unit: str,
        *,
        migration_id: str,
        expected_revision: int,
    ) -> bool:
        """Atomically migrate every thermal value to Home Assistant's unit."""
        if not migration_id:
            raise ValueError("migration_id is required")
        async with self._migration_lock:
            if self._temperature_migration_reason == LEGACY_CELSIUS_RESET_REASON:
                raise ValueError(
                    "Published legacy Celsius data must be reset to create Fahrenheit defaults"
                )
            if (
                self._last_temperature_migration
                and self._last_temperature_migration.get("migration_id") == migration_id
            ):
                return False
            if expected_revision != self._temperature_revision:
                raise ValueError("Temperature data changed; reload Velair and try again")
            target_unit = self._home_unit()
            if source_unit != self._temperature_unit:
                raise ValueError("source_unit does not match stored temperature_unit")
            if source_unit == target_unit:
                raise ValueError("No temperature migration is required")
            if self.data is None:
                raise ValueError("Storage is not loaded")

            # serialize_schedule_data intentionally preserves some nested
            # dictionaries. Migration must operate on a fully detached graph
            # so a failed Store write cannot leak converted values to runtime.
            migrated = deepcopy(serialize_schedule_data(self.data))
            _convert_scheduler_temperatures(
                migrated,
                source_unit,
                target_unit,
            )
            _snap_migrated_editable_temperatures(
                migrated, target_unit, self._hass, source_unit=source_unit
            )
            migrated = normalize_schedule_data(migrated, self._climate_entities)
            next_revision = self._temperature_revision + 1
            last = {
                "migration_id": migration_id,
                "source_unit": source_unit,
                "target_unit": target_unit,
                "temperature_revision": next_revision,
            }
            payload = self._raw_payload(
                migrated,
                unit=target_unit,
                revision=next_revision,
                last=last,
            )
            # Commit storage before publishing the migrated runtime dictionary.
            await self._store.async_save(payload)
            self.data.clear()
            self.data.update(migrated)
            self._temperature_unit = target_unit
            self._temperature_revision = next_revision
            self._last_temperature_migration = last
            self._temperature_migration_reason = None
            return True

    def raw_data(self) -> dict[str, Any]:
        """Return serialized raw values in the stored runtime unit."""
        if self.data is None:
            return {}
        return serialize_schedule_data(self.data)

    def default_runtime_data(self) -> SchedulerData:
        """Return fresh defaults expressed in each climate's runtime unit."""
        return normalize_schedule_data(self._fresh_runtime_defaults(), self._climate_entities)

    async def async_reset_to_defaults(self) -> SchedulerData:
        """Atomically replace storage with defaults in Home Assistant's unit."""
        async with self._migration_lock:
            target_unit = self._home_unit()
            defaults = self.default_runtime_data()
            next_revision = self._temperature_revision + 1
            payload = serialize_schedule_data(defaults)
            payload[TEMPERATURE_FORMAT_KEY] = RUNTIME_TEMPERATURE_FORMAT
            payload[TEMPERATURE_UNIT_KEY] = target_unit
            payload[TEMPERATURE_REVISION_KEY] = next_revision
            await self._store.async_save(payload)
            if self.data is None:
                self.data = defaults
            else:
                self.data.clear()
                self.data.update(defaults)
            self._temperature_unit = target_unit
            self._temperature_revision = next_revision
            self._last_temperature_migration = None
            self._temperature_migration_reason = None
            return self.data

    @property
    def legacy_temperature_reset_required(self) -> bool:
        """Return whether published Celsius data should be replaced, not migrated."""
        return (
            self.temperature_migration_required
            and self._temperature_migration_reason == LEGACY_CELSIUS_RESET_REASON
        )

    def _home_unit(self) -> str:
        return normalize_temperature_unit(
            getattr(getattr(self._hass.config, "units", None), "temperature_unit", None)
        )

    def _fresh_runtime_defaults(self) -> dict[str, Any]:
        data = serialize_schedule_data(normalize_schedule_data(None, self._climate_entities))
        target = self._home_unit()
        if target != CELSIUS:
            _convert_scheduler_temperatures(
                data, CELSIUS, target,
            )
            _round_fahrenheit_defaults(data)
        return data

    def _hydrate_fahrenheit_defaults(self, data: dict[str, Any]) -> dict[str, Any]:
        """Fill missing partial Fahrenheit scopes before C-default normalization."""
        hydrated = deepcopy(data)
        defaults = self._fresh_runtime_defaults()
        hydrated["settings"] = {
            **defaults.get("settings", {}),
            **(hydrated.get("settings") if isinstance(hydrated.get("settings"), dict) else {}),
        }
        zones = hydrated.get("zones")
        if not isinstance(zones, dict):
            zones = {}
            hydrated["zones"] = zones
        for entity_id in self._climate_entities:
            zone = zones.get(entity_id)
            zone = zone if isinstance(zone, dict) else {}
            default_zone = defaults["zones"][entity_id]
            zone["preconditioning"] = {
                **default_zone["preconditioning"],
                **(zone.get("preconditioning") if isinstance(zone.get("preconditioning"), dict) else {}),
            }
            zone["comfort"] = {
                **default_zone["comfort"],
                **(zone.get("comfort") if isinstance(zone.get("comfort"), dict) else {}),
            }
            zones[entity_id] = zone
        if not isinstance(hydrated.get("templates"), list):
            hydrated["templates"] = defaults["templates"]
            hydrated["templates_seeded"] = True
            hydrated["templates_seeded_version"] = defaults["templates_seeded_version"]
        return hydrated

    def _raw_payload(
        self,
        data: SchedulerData,
        *,
        unit: str | None = None,
        revision: int | None = None,
        last: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = serialize_schedule_data(data)
        payload[TEMPERATURE_FORMAT_KEY] = RUNTIME_TEMPERATURE_FORMAT
        payload[TEMPERATURE_UNIT_KEY] = unit or self._temperature_unit
        payload[TEMPERATURE_REVISION_KEY] = (
            self._temperature_revision if revision is None else revision
        )
        migration = self._last_temperature_migration if last is None else last
        if migration is not None:
            payload[LAST_TEMPERATURE_MIGRATION_KEY] = deepcopy(migration)
        if self._temperature_migration_reason is not None:
            payload[TEMPERATURE_MIGRATION_REASON_KEY] = self._temperature_migration_reason
        return payload


def _convert_blocks(blocks: Any, source: str, target: str) -> None:
    if not isinstance(blocks, list):
        return
    for block in blocks:
        if isinstance(block, dict) and isinstance(block.get("temperature"), (int, float)):
            block["temperature"] = round(
                absolute_temperature(block["temperature"], source, target), 6
            )


def _round_fahrenheit_defaults(data: dict[str, Any]) -> None:
    """Use practical whole-degree defaults for a fresh Fahrenheit model."""
    settings = data.get("settings")
    if isinstance(settings, dict):
        settings["min_temperature"] = 41.0
        settings["max_temperature"] = 95.0

    templates = data.get("templates")
    if isinstance(templates, list):
        for template in templates:
            if not isinstance(template, dict):
                continue
            for block in template.get("blocks", []):
                if isinstance(block, dict) and isinstance(
                    block.get("temperature"), (int, float)
                ):
                    block["temperature"] = float(round(block["temperature"]))

    zones = data.get("zones")
    if not isinstance(zones, dict):
        return
    for zone in zones.values():
        if not isinstance(zone, dict):
            continue
        comfort = zone.get("comfort")
        if isinstance(comfort, dict):
            comfort["temperature_min"] = 68.0
            comfort["temperature_max"] = 75.0
        preconditioning = zone.get("preconditioning")
        if isinstance(preconditioning, dict):
            preconditioning["minimum_delta_temperature"] = 1.0
            preconditioning["room_sensor_assist_max_delta"] = 4.0
            preconditioning["fallback_minutes_per_degree"] = 14.0


def _nearest_step(value: float, step: float, anchor: float = 0.0) -> float:
    """Round a value to the nearest positive step using half-up semantics."""
    count = math.floor(((float(value) - anchor) / step) + 0.5 + 0.000000001)
    return round(anchor + count * step, 6)


def _entity_target_grid(
    hass: HomeAssistant,
    entity_id: str,
    unit: str,
    *,
    source_unit: str | None = None,
) -> tuple[float, float, float | None]:
    """Return safe limits and the exact target step published by HA."""
    default_limits = (41.0, 95.0) if unit == FAHRENHEIT else (5.0, 35.0)
    states = getattr(hass, "states", None)
    state = states.get(entity_id) if states is not None else None
    attributes = getattr(state, "attributes", {}) if state is not None else {}
    try:
        minimum = float(attributes.get("min_temp", default_limits[0]))
        maximum = float(attributes.get("max_temp", default_limits[1]))
    except (TypeError, ValueError):
        minimum, maximum = default_limits
    if not all(math.isfinite(value) for value in (minimum, maximum)) or minimum >= maximum:
        minimum, maximum = default_limits
    try:
        raw_step = float(attributes["target_temp_step"])
    except (KeyError, TypeError, ValueError):
        step = None
    else:
        step = raw_step if math.isfinite(raw_step) and raw_step > 0 else None
    if (
        source_unit in (CELSIUS, FAHRENHEIT)
        and source_unit != unit
        and _grid_looks_like_unit(minimum, maximum, source_unit)
        and not _grid_looks_like_unit(minimum, maximum, unit)
    ):
        minimum = absolute_temperature(minimum, source_unit, unit)
        maximum = absolute_temperature(maximum, source_unit, unit)
    return minimum, maximum, step


def _grid_looks_like_unit(minimum: float, maximum: float, unit: str) -> bool:
    """Identify the ordinary HA climate grid scale during a unit transition."""
    if unit == FAHRENHEIT:
        return maximum > 60.0 or minimum > 40.0
    return maximum <= 60.0 and minimum < 40.0


def _template_target_step(
    hass: HomeAssistant,
    entity_ids: list[str],
    unit: str,
    *,
    source_unit: str | None = None,
) -> tuple[float, float | None]:
    """Return the combined minimum and step used by frontend validation."""
    default_minimum = 41.0 if unit == FAHRENHEIT else 5.0
    if not entity_ids:
        return default_minimum, None
    grids = [
        _entity_target_grid(
            hass, entity_id, unit, source_unit=source_unit
        )
        for entity_id in entity_ids
    ]
    steps = [grid[2] for grid in grids if grid[2] is not None]
    shared_step = (
        steps[0]
        if len(steps) == len(grids)
        and all(abs(step - steps[0]) <= 0.000000001 for step in steps[1:])
        else None
    )
    return min(grid[0] for grid in grids), shared_step


def _snap_migrated_editable_temperatures(
    data: dict[str, Any],
    unit: str,
    hass: HomeAssistant,
    *,
    source_unit: str | None = None,
) -> None:
    """Normalize migrated editable fields while preserving learning precision."""
    zones = data.get("zones")
    entity_ids = list(zones) if isinstance(zones, dict) else []
    _template_minimum, template_step = _template_target_step(
        hass, entity_ids, unit, source_unit=source_unit
    )
    templates = data.get("templates")
    if isinstance(templates, list):
        for template in templates:
            if not isinstance(template, dict):
                continue
            for block in template.get("blocks", []):
                if isinstance(block, dict) and isinstance(block.get("temperature"), (int, float)):
                    block["temperature"] = _nearest_step(
                        block["temperature"], template_step or 0.1
                    )

    profiles = data.get("profiles")
    if isinstance(profiles, list):
        for profile in profiles:
            profile_zones = profile.get("zones") if isinstance(profile, dict) else None
            if not isinstance(profile_zones, dict):
                continue
            for entity_id, profile_zone in profile_zones.items():
                if not isinstance(profile_zone, dict):
                    continue
                minimum, maximum, step = _entity_target_grid(
                    hass, entity_id, unit, source_unit=source_unit
                )
                target_step = step or 0.1
                first = math.ceil((minimum / target_step) - 0.000001) * target_step
                last = math.floor((maximum / target_step) + 0.000001) * target_step
                schedule = profile_zone.get("schedule")
                if not isinstance(schedule, dict):
                    continue
                for blocks in schedule.values():
                    if not isinstance(blocks, list):
                        continue
                    for block in blocks:
                        if not isinstance(block, dict) or not isinstance(
                            block.get("temperature"), (int, float)
                        ):
                            continue
                        bounded = max(first, min(last, float(block["temperature"])))
                        block["temperature"] = max(
                            first, min(last, _nearest_step(bounded, target_step))
                        )

    settings = data.get("settings")
    if isinstance(settings, dict):
        for key in ("min_temperature", "max_temperature"):
            if isinstance(settings.get(key), (int, float)):
                settings[key] = _nearest_step(settings[key], 0.5)

    if not isinstance(zones, dict):
        return
    for entity_id, zone in zones.items():
        if not isinstance(zone, dict):
            continue
        minimum, maximum, step = _entity_target_grid(
            hass, entity_id, unit, source_unit=source_unit
        )

        def snap_target(mapping: Any, key: str) -> None:
            if not isinstance(mapping, dict) or not isinstance(mapping.get(key), (int, float)):
                return
            target_step = step or 0.1
            first = math.ceil((minimum / target_step) - 0.000001) * target_step
            last = math.floor((maximum / target_step) + 0.000001) * target_step
            if first > last:
                mapping[key] = max(minimum, min(maximum, float(mapping[key])))
                return
            bounded = max(first, min(last, float(mapping[key])))
            mapping[key] = max(
                first, min(last, _nearest_step(bounded, target_step))
            )

        schedule = zone.get("schedule")
        if isinstance(schedule, dict):
            for blocks in schedule.values():
                if isinstance(blocks, list):
                    for block in blocks:
                        snap_target(block, "temperature")
        override = zone.get("override")
        snap_target(override, "temperature")
        if isinstance(override, dict):
            snap_target(override.get("previous_state"), "temperature")

        comfort = zone.get("comfort")
        if isinstance(comfort, dict):
            for key in ("temperature_min", "temperature_max"):
                if isinstance(comfort.get(key), (int, float)):
                    comfort[key] = _nearest_step(comfort[key], 0.5)

        preconditioning = zone.get("preconditioning")
        if isinstance(preconditioning, dict):
            for key in (
                "minimum_delta_temperature",
                "room_sensor_assist_max_delta",
                "fallback_minutes_per_degree",
            ):
                if isinstance(preconditioning.get(key), (int, float)):
                    preconditioning[key] = _nearest_step(preconditioning[key], 0.1)


def _convert_scheduler_temperatures(
    data: dict[str, Any],
    source: str,
    target: str,
) -> None:
    """Explicitly migrate every persisted thermal field source to target."""
    zones = data.get("zones", {})
    if isinstance(zones, dict):
        for entity_id, zone in zones.items():
            if not isinstance(zone, dict):
                continue
            schedule = zone.get("schedule", {})
            if isinstance(schedule, dict):
                for blocks in schedule.values():
                    _convert_blocks(blocks, source, target)
            override = zone.get("override")
            if isinstance(override, dict) and isinstance(override.get("temperature"), (int, float)):
                override["temperature"] = round(absolute_temperature(override["temperature"], source, target), 6)
            previous_state = override.get("previous_state") if isinstance(override, dict) else None
            if isinstance(previous_state, dict) and isinstance(previous_state.get("temperature"), (int, float)):
                previous_state["temperature"] = round(
                    absolute_temperature(previous_state["temperature"], source, target),
                    6,
                )
            pre = zone.get("preconditioning")
            if isinstance(pre, dict):
                for key in ("minimum_delta_temperature", "room_sensor_assist_max_delta"):
                    if isinstance(pre.get(key), (int, float)):
                        pre[key] = round(temperature_delta(pre[key], source, target), 6)
                if isinstance(pre.get("fallback_minutes_per_degree"), (int, float)):
                    pre["fallback_minutes_per_degree"] = rate_per_degree(pre["fallback_minutes_per_degree"], source, target)
            comfort = zone.get("comfort")
            if isinstance(comfort, dict):
                for key in ("temperature_min", "temperature_max"):
                    if isinstance(comfort.get(key), (int, float)):
                        comfort[key] = round(absolute_temperature(comfort[key], source, target), 6)
    templates = data.get("templates", [])
    if isinstance(templates, list):
        for template in templates:
            if isinstance(template, dict):
                _convert_blocks(template.get("blocks"), source, target)
    profiles = data.get("profiles", [])
    if isinstance(profiles, list):
        for profile in profiles:
            profile_zones = profile.get("zones") if isinstance(profile, dict) else None
            if not isinstance(profile_zones, dict):
                continue
            for profile_zone in profile_zones.values():
                schedule = profile_zone.get("schedule") if isinstance(profile_zone, dict) else None
                if isinstance(schedule, dict):
                    for blocks in schedule.values():
                        _convert_blocks(blocks, source, target)
    settings = data.get("settings")
    if isinstance(settings, dict):
        for key in ("min_temperature", "max_temperature"):
            if isinstance(settings.get(key), (int, float)):
                settings[key] = round(absolute_temperature(settings[key], source, target), 6)
    learning = data.get("preconditioning_learning", {})
    if isinstance(learning, dict):
        for entity_id, directions in learning.items():
            if not isinstance(directions, dict):
                continue
            for history in directions.values():
                if not isinstance(history, dict):
                    continue
                for observation in history.get("observations", []):
                    if not isinstance(observation, dict):
                        continue
                    for key in (
                        "target_temp",
                        "initial_temp",
                        "observed_temp",
                        "outdoor_temp_start",
                        "outdoor_temp_target",
                    ):
                        if isinstance(observation.get(key), (int, float)):
                            observation[key] = round(absolute_temperature(observation[key], source, target), 6)
                    if isinstance(observation.get("delta_t"), (int, float)):
                        observation["delta_t"] = round(temperature_delta(observation["delta_t"], source, target), 6)


def convert_portable_temperature_data(
    data: dict[str, Any], source: str, target: str, hass: HomeAssistant | None
) -> dict[str, Any]:
    """Convert selected portable sections to the active HA temperature grid."""
    converted = deepcopy(data)
    if source != target:
        _convert_scheduler_temperatures(converted, source, target)
    if hass is not None:
        _snap_migrated_editable_temperatures(
            converted, target, hass, source_unit=source
        )
    return converted
