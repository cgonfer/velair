"""Climate service adapter."""

from __future__ import annotations

import logging
import math
from types import SimpleNamespace
from time import monotonic
from typing import Any
from uuid import uuid4

from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant

try:
    from homeassistant.core import Context
except ImportError:  # Test stubs do not expose Home Assistant's Context.
    Context = None  # type: ignore[assignment,misc]
from homeassistant.const import UnitOfTemperature

from .const import (
    ATTR_FAN_MODE,
    ATTR_HVAC_MODE,
    ATTR_HUMIDITY,
    ATTR_PRESET_MODE,
    ATTR_SWING_HORIZONTAL_MODE,
    ATTR_SWING_MODE,
    ATTR_TARGET_TEMP_HIGH,
    ATTR_TARGET_TEMP_LOW,
    ATTR_TEMPERATURE,
    HVAC_MODE_OFF,
)
from .temperature import absolute_temperature

CLIMATE_DOMAIN = "climate"
CLIMATE_SERVICE_SET_HVAC_MODE = "set_hvac_mode"
CLIMATE_SERVICE_SET_FAN_MODE = "set_fan_mode"
CLIMATE_SERVICE_SET_HUMIDITY = "set_humidity"
CLIMATE_SERVICE_SET_PRESET_MODE = "set_preset_mode"
CLIMATE_SERVICE_SET_SWING_HORIZONTAL_MODE = "set_swing_horizontal_mode"
CLIMATE_SERVICE_SET_SWING_MODE = "set_swing_mode"
CLIMATE_SERVICE_SET_TEMPERATURE = "set_temperature"
CLIMATE_SERVICE_TURN_OFF = "turn_off"
CLIMATE_SERVICE_TURN_ON = "turn_on"
CLIMATE_MODE_ATTRIBUTES = {
    ATTR_FAN_MODE: "fan_modes",
    ATTR_PRESET_MODE: "preset_modes",
    ATTR_SWING_MODE: "swing_modes",
    ATTR_SWING_HORIZONTAL_MODE: "swing_horizontal_modes",
}
CLIMATE_OPTION_SERVICES = {
    ATTR_FAN_MODE: CLIMATE_SERVICE_SET_FAN_MODE,
    ATTR_PRESET_MODE: CLIMATE_SERVICE_SET_PRESET_MODE,
    ATTR_SWING_MODE: CLIMATE_SERVICE_SET_SWING_MODE,
    ATTR_SWING_HORIZONTAL_MODE: CLIMATE_SERVICE_SET_SWING_HORIZONTAL_MODE,
    ATTR_HUMIDITY: CLIMATE_SERVICE_SET_HUMIDITY,
}

_LOGGER = logging.getLogger(__name__)

DEFAULT_MIN_TEMPERATURE = 5.0
DEFAULT_MAX_TEMPERATURE = 35.0
STATE_UNAVAILABLE = "unavailable"
STATE_UNKNOWN = "unknown"
RANGE_HVAC_MODES = {"heat_cool"}
FEATURE_TARGET_TEMPERATURE = 1
FEATURE_TARGET_TEMPERATURE_RANGE = 2
MAX_EXPECTED_ACTIONS_PER_ENTITY = 32
MAX_OWNED_CONTEXTS = 256


class ClimateManager:
    """Apply target temperatures through Home Assistant climate services."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the climate manager."""
        self._hass = hass
        self._contexts: dict[str, float] = {}
        self._expected: dict[str, list[dict[str, Any]]] = {}

    async def _async_call(
        self,
        service: str,
        data: dict[str, Any],
        *,
        blocking: bool = True,
        context: Any | None = None,
        register_expected: bool = True,
    ) -> None:
        """Call climate while marking the resulting state as Velair-owned."""
        context = context or self._new_owned_context()
        self._prune_owned_actions()
        entity_id = data.get(ATTR_ENTITY_ID)
        if register_expected and isinstance(entity_id, str):
            expected = self._expected_for_service(service, data)
            structural_transition_fields: set[str] = set()
            structural_transition_values: dict[str, float] = {}
            if expected.get(ATTR_HVAC_MODE) == HVAC_MODE_OFF:
                state = self._hass.states.get(entity_id)
                if state is not None and state.state != HVAC_MODE_OFF:
                    for field in (
                        ATTR_TEMPERATURE,
                        ATTR_TARGET_TEMP_LOW,
                        ATTR_TARGET_TEMP_HIGH,
                    ):
                        value = state.attributes.get(field)
                        if not self._is_finite_observed_target(value):
                            continue
                        structural_transition_fields.add(field)
                        structural_transition_values[field] = float(value)
            self._register_expected_action(
                entity_id,
                context,
                expected,
                structural_transition_fields=structural_transition_fields,
                structural_transition_direction="disappear",
                structural_transition_values=structural_transition_values,
            )
        try:
            try:
                await self._hass.services.async_call(
                    CLIMATE_DOMAIN, service, data, blocking=blocking, context=context
                )
            except TypeError as err:
                if "context" not in str(err):
                    raise
                await self._hass.services.async_call(
                    CLIMATE_DOMAIN, service, data, blocking=blocking
                )
        except Exception:
            if register_expected and isinstance(entity_id, str):
                self._discard_expected_action(entity_id, context.id)
            raise

    @staticmethod
    def _new_owned_context() -> Any:
        """Create one context for a complete logical climate action."""
        return Context() if Context is not None else SimpleNamespace(id=uuid4().hex)

    @staticmethod
    def _expected_for_service(
        service: str, data: dict[str, Any]
    ) -> dict[str, Any]:
        """Build the observable final-state expectation for one service call."""
        expected = {
            key: value
            for key, value in data.items()
            if key in {
                ATTR_HVAC_MODE,
                ATTR_TEMPERATURE,
                ATTR_TARGET_TEMP_LOW,
                ATTR_TARGET_TEMP_HIGH,
            }
        }
        if service == CLIMATE_SERVICE_TURN_OFF:
            expected[ATTR_HVAC_MODE] = HVAC_MODE_OFF
        elif service == CLIMATE_SERVICE_TURN_ON:
            expected["__not_off__"] = True
        return expected

    def _register_expected_action(
        self,
        entity_id: str,
        context: Any,
        expected: dict[str, Any],
        *,
        structural_transition_fields: set[str] | None = None,
        structural_transition_direction: str = "appear",
        structural_transition_values: dict[str, float] | None = None,
    ) -> None:
        """Register one bounded expectation for a logical climate action."""
        if not expected:
            return
        expiry = monotonic() + 120
        self._contexts[context.id] = expiry
        while len(self._contexts) > MAX_OWNED_CONTEXTS:
            self._discard_owned_context(next(iter(self._contexts)))
        candidates = self._expected.setdefault(entity_id, [])
        candidate = {
            "expires": expiry,
            "context_id": context.id,
            "expected": expected,
        }
        if structural_transition_fields:
            candidate["structural_transition"] = {
                "fields": set(structural_transition_fields),
                "mode_confirmed": False,
                "direction": structural_transition_direction,
                "values": dict(structural_transition_values or {}),
            }
        candidates.append(candidate)
        if len(candidates) > MAX_EXPECTED_ACTIONS_PER_ENTITY:
            evicted = candidates[:-MAX_EXPECTED_ACTIONS_PER_ENTITY]
            del candidates[:-MAX_EXPECTED_ACTIONS_PER_ENTITY]
            for item in evicted:
                self._contexts.pop(item["context_id"], None)

    def _discard_expected_action(self, entity_id: str, context_id: str) -> None:
        """Discard a failed logical action without leaving stale ownership."""
        self._contexts.pop(context_id, None)
        remaining = [
            item for item in self._expected.get(entity_id, [])
            if item["context_id"] != context_id
        ]
        if remaining:
            self._expected[entity_id] = remaining
        else:
            self._expected.pop(entity_id, None)

    def _discard_owned_context(self, context_id: str) -> None:
        """Discard one context and every expectation associated with it."""
        self._contexts.pop(context_id, None)
        for entity_id in list(self._expected):
            remaining = [
                item for item in self._expected[entity_id]
                if item["context_id"] != context_id
            ]
            if remaining:
                self._expected[entity_id] = remaining
            else:
                self._expected.pop(entity_id, None)

    def _retain_expected_action_fields(
        self, entity_id: str, context_id: str, fields: set[str]
    ) -> None:
        """Keep only fields belonging to an already accepted action stage."""
        candidates = self._expected.get(entity_id, [])
        retained = False
        for item in candidates:
            if item["context_id"] != context_id:
                continue
            item["expected"] = {
                key: value for key, value in item["expected"].items()
                if key in fields
            }
            item.pop("structural_transition", None)
            retained = bool(item["expected"])
            break
        if not retained:
            self._discard_expected_action(entity_id, context_id)

    def owned_state_change_fields(
        self, entity_id: str, new_state: Any, old_state: Any | None = None
    ) -> set[str]:
        """Return changed control fields attributable to Velair.

        Home Assistant integrations can retain a service Context while also
        reporting an unrelated device-side change. Context therefore narrows
        candidate selection but never replaces field and value correlation.
        """
        self._prune_owned_actions()
        context_id = getattr(getattr(new_state, "context", None), "id", None)
        candidates = self._expected.get(entity_id, [])
        context_matches_candidate = context_id is not None and any(
            item["context_id"] == context_id for item in candidates
        )
        changed_fields = self._observed_changed_fields(old_state, new_state)
        ordered_fields = [
            field
            for field in (
                ATTR_HVAC_MODE,
                ATTR_TEMPERATURE,
                ATTR_TARGET_TEMP_LOW,
                ATTR_TARGET_TEMP_HIGH,
            )
            if field in changed_fields
        ]
        if context_id is None:
            ordered = sorted(
                candidates,
                key=lambda item: not (
                    item.get("structural_transition", {}).get("direction")
                    == "disappear"
                    and self._disappearance_candidate_matches_state(
                        entity_id, item, old_state
                    )
                ),
            )
        else:
            ordered = sorted(
                candidates,
                key=lambda item: item["context_id"] != context_id,
            )
        owned: set[str] = set()
        consumed: dict[int, set[str]] = {}
        structural_uses: dict[int, set[str]] = {}
        structural_invalidations: dict[int, set[str]] = {}
        for field in ordered_fields:
            expected_key = field
            matched = False
            for item in ordered:
                expected = item["expected"]
                if field == ATTR_HVAC_MODE and "__not_off__" in expected:
                    expected_key = "__not_off__"
                else:
                    expected_key = field
                if expected_key not in expected:
                    continue
                transition = item.get("structural_transition")
                if (
                    field == ATTR_HVAC_MODE
                    and transition is not None
                    and transition.get("direction") == "disappear"
                ):
                    if context_id is not None:
                        if item["context_id"] != context_id:
                            continue
                    elif not self._disappearance_candidate_matches_state(
                        entity_id, item, old_state
                    ):
                        continue
                if not self._expected_matches(
                    entity_id, new_state, {expected_key: expected[expected_key]}
                ):
                    continue
                owned.add(field)
                consumed.setdefault(id(item), set()).add(expected_key)
                if (
                    field == ATTR_HVAC_MODE
                    and transition is not None
                ):
                    if item["context_id"] == context_id:
                        transition["mode_confirmed"] = True
                    elif (
                        context_id is None
                        and transition.get("direction") == "disappear"
                    ):
                        for candidate in candidates:
                            candidate_transition = candidate.get(
                                "structural_transition"
                            )
                            if (
                                candidate_transition is not None
                                and candidate_transition.get("direction")
                                == "disappear"
                                and self._disappearance_candidate_matches_state(
                                    entity_id, candidate, old_state
                                )
                            ):
                                candidate_transition["mode_confirmed"] = True
                if field == ATTR_HVAC_MODE and context_id is None:
                    for candidate in candidates:
                        if candidate["expected"].get(ATTR_HVAC_MODE) == HVAC_MODE_OFF:
                            consumed.setdefault(id(candidate), set()).add(
                                ATTR_HVAC_MODE
                            )
                matched = True
                break
            if matched or field == ATTR_HVAC_MODE:
                continue
            for item in ordered:
                transition = item.get("structural_transition")
                if (
                    transition is None
                    or field not in transition["fields"]
                    or old_state is None
                ):
                    continue
                direction = transition.get("direction", "appear")
                if direction == "disappear":
                    if (
                        context_id is not None
                        and item["context_id"] != context_id
                    ):
                        if not context_matches_candidate:
                            structural_invalidations.setdefault(
                                id(item), set()
                            ).add(field)
                        continue
                    if (
                        not transition["mode_confirmed"]
                        or new_state.state != HVAC_MODE_OFF
                    ):
                        structural_invalidations.setdefault(id(item), set()).add(
                            field
                        )
                        continue
                    captured = transition.get("values", {}).get(field)
                    old_value = old_state.attributes.get(field)
                    new_value = new_state.attributes.get(field)
                    if (
                        captured is None
                        or not self._target_values_match(
                            entity_id, old_value, captured
                        )
                        or self._is_finite_observed_target(new_value)
                    ):
                        structural_invalidations.setdefault(id(item), set()).add(
                            field
                        )
                        continue
                    owned.add(field)
                    structural_uses.setdefault(id(item), set()).add(field)
                    if context_id is None:
                        for candidate in candidates:
                            if candidate is item:
                                continue
                            candidate_transition = candidate.get(
                                "structural_transition"
                            )
                            if (
                                candidate_transition is None
                                or candidate_transition.get("direction")
                                != "disappear"
                                or not candidate_transition["mode_confirmed"]
                                or field not in candidate_transition["fields"]
                            ):
                                continue
                            candidate_value = candidate_transition.get(
                                "values", {}
                            ).get(field)
                            if self._target_values_match(
                                entity_id, candidate_value, captured
                            ):
                                structural_invalidations.setdefault(
                                    id(candidate), set()
                                ).add(field)
                    break
                if (
                    not transition["mode_confirmed"]
                    or field not in item["expected"]
                    or item["context_id"] != context_id
                    or self._is_finite_observed_target(
                        old_state.attributes.get(field)
                    )
                ):
                    continue
                try:
                    actual = float(new_state.attributes.get(field))
                except (TypeError, ValueError):
                    continue
                if not math.isfinite(actual):
                    continue
                owned.add(field)
                structural_uses.setdefault(id(item), set()).add(field)
                break

        for item in candidates:
            resolved_fields = (
                structural_uses.get(id(item), set())
                | structural_invalidations.get(id(item), set())
            )
            if not resolved_fields:
                continue
            transition = item["structural_transition"]
            transition["fields"].difference_update(resolved_fields)
            values = transition.get("values")
            if values is not None:
                for field in resolved_fields:
                    values.pop(field, None)
            if not transition["fields"]:
                item.pop("structural_transition", None)

        remaining: list[dict[str, Any]] = []
        for item in candidates:
            consumed_fields = consumed.get(id(item), set())
            for key in consumed_fields:
                item["expected"].pop(key, None)
            transition = item.get("structural_transition")
            if transition is not None:
                transition["fields"].difference_update(consumed_fields)
                if not transition["fields"]:
                    item.pop("structural_transition", None)
            if item["expected"] or "structural_transition" in item:
                remaining.append(item)
        if remaining:
            self._expected[entity_id] = remaining
        else:
            self._expected.pop(entity_id, None)

        live_contexts = {item["context_id"] for item in remaining}
        for item in candidates:
            candidate_context = item["context_id"]
            if candidate_context not in live_contexts:
                self._contexts.pop(candidate_context, None)
        return owned

    def owns_state_change(
        self, entity_id: str, new_state: Any, old_state: Any | None = None
    ) -> bool:
        """Compatibility helper for callers interested in whole-event ownership."""
        changed = self._observed_changed_fields(old_state, new_state)
        return changed == self.owned_state_change_fields(entity_id, new_state, old_state)

    def _observed_changed_fields(self, old_state: Any | None, new_state: Any) -> set[str]:
        if old_state is None:
            return {
                ATTR_HVAC_MODE,
                ATTR_TEMPERATURE,
                ATTR_TARGET_TEMP_LOW,
                ATTR_TARGET_TEMP_HIGH,
            }
        changed = {
            key for key in (ATTR_TEMPERATURE, ATTR_TARGET_TEMP_LOW, ATTR_TARGET_TEMP_HIGH)
            if old_state.attributes.get(key) != new_state.attributes.get(key)
        }
        if old_state.state != new_state.state:
            changed.add(ATTR_HVAC_MODE)
        return changed

    def _expected_matches(
        self, entity_id: str, new_state: Any, expected: dict[str, Any]
    ) -> bool:
        step = max(0.001, self.temperature_step(entity_id) or 0.1)
        for key, value in expected.items():
            if key == "__not_off__":
                if new_state.state == HVAC_MODE_OFF:
                    return False
                continue
            actual = (
                new_state.state
                if key == ATTR_HVAC_MODE
                else new_state.attributes.get(key)
            )
            if key in (ATTR_TEMPERATURE, ATTR_TARGET_TEMP_LOW, ATTR_TARGET_TEMP_HIGH):
                if value is None:
                    if actual is not None:
                        return False
                    continue
                try:
                    if abs(float(actual) - float(value)) > (step / 2 + 1e-6):
                        return False
                except (TypeError, ValueError):
                    return False
            elif actual != value:
                return False
        return True

    @staticmethod
    def _is_finite_observed_target(value: Any) -> bool:
        """Return whether an observed target is a finite numeric value."""
        try:
            return math.isfinite(float(value))
        except (TypeError, ValueError):
            return False

    def _target_values_match(
        self, entity_id: str, observed: Any, expected: Any
    ) -> bool:
        """Return whether two finite targets match at the entity's native step."""
        if not self._is_finite_observed_target(observed):
            return False
        step = max(0.001, self.temperature_step(entity_id) or 0.1)
        return abs(float(observed) - float(expected)) <= (step / 2 + 1e-6)

    def _disappearance_candidate_matches_state(
        self, entity_id: str, candidate: dict[str, Any], state: Any | None
    ) -> bool:
        """Correlate a contextless off echo with its captured target values."""
        if state is None:
            return False
        transition = candidate.get("structural_transition")
        values = transition.get("values", {}) if transition is not None else {}
        if not values:
            return True
        compared = False
        for field, captured in values.items():
            observed = state.attributes.get(field)
            if not self._is_finite_observed_target(observed):
                continue
            compared = True
            if not self._target_values_match(entity_id, observed, captured):
                return False
        return compared

    def _prune_owned_actions(self) -> None:
        now = monotonic()
        self._contexts = {key: expiry for key, expiry in self._contexts.items() if expiry > now}
        for entity_id, candidates in list(self._expected.items()):
            remaining = [item for item in candidates if item["expires"] > now]
            if remaining:
                self._expected[entity_id] = remaining
            else:
                self._expected.pop(entity_id, None)

    async def async_set_temperature(
        self,
        entity_id: str,
        temperature: float,
        *,
        blocking: bool = True,
        ensure_on: bool = False,
        fan_mode: str | None = None,
        hvac_mode: str | None = None,
        humidity: float | None = None,
        preset_mode: str | None = None,
        swing_mode: str | None = None,
        swing_horizontal_mode: str | None = None,
    ) -> None:
        """Set the target temperature for a climate entity."""
        temperature = self.normalize_target_temperature(entity_id, temperature)
        self.validate_temperature_target(
            entity_id,
            range_target=False,
            hvac_mode=hvac_mode,
            ensure_on=ensure_on,
        )
        target: dict[str, Any] = {ATTR_TEMPERATURE: temperature}
        state = self._hass.states.get(entity_id)
        if state is not None:
            for key in (ATTR_TARGET_TEMP_LOW, ATTR_TARGET_TEMP_HIGH):
                if key in state.attributes:
                    target[key] = None
        await self._async_set_temperature_target(
            entity_id,
            target,
            blocking=blocking,
            ensure_on=ensure_on,
            hvac_mode=hvac_mode,
            range_target=False,
        )
        await self.async_apply_climate_options(
            entity_id,
            fan_mode=fan_mode,
            humidity=humidity,
            preset_mode=preset_mode,
            swing_mode=swing_mode,
            swing_horizontal_mode=swing_horizontal_mode,
        )

    async def async_set_temperature_range(
        self,
        entity_id: str,
        target_temp_low: float,
        target_temp_high: float,
        *,
        blocking: bool = True,
        ensure_on: bool = False,
        fan_mode: str | None = None,
        hvac_mode: str | None = None,
        humidity: float | None = None,
        preset_mode: str | None = None,
        swing_mode: str | None = None,
        swing_horizontal_mode: str | None = None,
    ) -> None:
        """Set a native lower and upper target temperature range."""
        low = self.normalize_target_temperature(entity_id, target_temp_low)
        high = self.normalize_target_temperature(entity_id, target_temp_high)
        if low > high:
            raise ValueError("target_temp_low must not be greater than target_temp_high")
        self.validate_temperature_target(
            entity_id,
            range_target=True,
            hvac_mode=hvac_mode,
            ensure_on=ensure_on,
        )
        target = {
            ATTR_TARGET_TEMP_LOW: low,
            ATTR_TARGET_TEMP_HIGH: high,
        }
        state = self._hass.states.get(entity_id)
        if state is not None and ATTR_TEMPERATURE in state.attributes:
            target[ATTR_TEMPERATURE] = None
        await self._async_set_temperature_target(
            entity_id,
            target,
            blocking=blocking,
            ensure_on=ensure_on,
            hvac_mode=hvac_mode,
            range_target=True,
        )
        await self.async_apply_climate_options(
            entity_id,
            fan_mode=fan_mode,
            humidity=humidity,
            preset_mode=preset_mode,
            swing_mode=swing_mode,
            swing_horizontal_mode=swing_horizontal_mode,
        )

    async def _async_set_temperature_target(
        self,
        entity_id: str,
        target: dict[str, Any],
        *,
        blocking: bool,
        ensure_on: bool,
        hvac_mode: str | None,
        range_target: bool,
    ) -> None:
        """Deliver one logical mode-and-target intent with shared ownership."""
        mode_service: str | None = None
        mode_data: dict[str, Any] = {ATTR_ENTITY_ID: entity_id}
        expected = dict(target)
        if hvac_mode is not None:
            mode_service = CLIMATE_SERVICE_SET_HVAC_MODE
            mode_data[ATTR_HVAC_MODE] = hvac_mode
            expected[ATTR_HVAC_MODE] = hvac_mode
        elif ensure_on and self._current_hvac_mode(entity_id) == HVAC_MODE_OFF:
            target_mode = self._resolve_first_non_off_hvac_mode(
                entity_id, range_target=range_target
            )
            if target_mode is None:
                mode_service = CLIMATE_SERVICE_TURN_ON
                expected["__not_off__"] = True
            else:
                mode_service = CLIMATE_SERVICE_SET_HVAC_MODE
                mode_data[ATTR_HVAC_MODE] = target_mode
                expected[ATTR_HVAC_MODE] = target_mode

        context = self._new_owned_context()
        self._prune_owned_actions()
        state = self._hass.states.get(entity_id)
        structural_transition_fields: set[str] = set()
        if (
            state is not None
            and state.state == HVAC_MODE_OFF
            and (
                expected.get(ATTR_HVAC_MODE) not in (None, HVAC_MODE_OFF)
                or "__not_off__" in expected
            )
        ):
            structural_transition_fields = {
                field for field, value in target.items()
                if value is not None
                and not self._is_finite_observed_target(
                    state.attributes.get(field)
                )
            }
        self._register_expected_action(
            entity_id,
            context,
            expected,
            structural_transition_fields=structural_transition_fields,
        )
        if mode_service is not None:
            try:
                await self._async_call(
                    mode_service,
                    mode_data,
                    blocking=True,
                    context=context,
                    register_expected=False,
                )
            except Exception:
                self._discard_expected_action(entity_id, context.id)
                raise
        try:
            temperature_data = {
                ATTR_ENTITY_ID: entity_id,
                **{key: value for key, value in target.items() if value is not None},
            }
            await self._async_call(
                CLIMATE_SERVICE_SET_TEMPERATURE,
                temperature_data,
                blocking=blocking,
                context=context,
                register_expected=False,
            )
        except Exception:
            if mode_service is None:
                self._discard_expected_action(entity_id, context.id)
            else:
                mode_fields = (
                    {ATTR_HVAC_MODE}
                    if ATTR_HVAC_MODE in expected
                    else {"__not_off__"}
                )
                self._retain_expected_action_fields(
                    entity_id, context.id, mode_fields
                )
            raise

    async def async_apply_climate_options(
        self,
        entity_id: str,
        *,
        fan_mode: str | None = None,
        humidity: float | None = None,
        preset_mode: str | None = None,
        swing_mode: str | None = None,
        swing_horizontal_mode: str | None = None,
    ) -> None:
        """Apply optional climate settings through Home Assistant services."""
        options: dict[str, Any] = {
            ATTR_FAN_MODE: fan_mode,
            ATTR_PRESET_MODE: preset_mode,
            ATTR_SWING_MODE: swing_mode,
            ATTR_SWING_HORIZONTAL_MODE: swing_horizontal_mode,
            ATTR_HUMIDITY: humidity,
        }
        for attr, value in options.items():
            if value is None or value == "":
                continue
            await self._async_call(
                CLIMATE_OPTION_SERVICES[attr],
                {
                    ATTR_ENTITY_ID: entity_id,
                    attr: value,
                },
                blocking=True,
            )

    def climate_state_snapshot(self, entity_id: str) -> dict[str, Any]:
        """Return the restorable climate state for an entity."""
        state = self._hass.states.get(entity_id)
        return self.climate_state_snapshot_from_state(entity_id, state)

    def climate_state_snapshot_from_state(
        self, entity_id: str, state: Any | None
    ) -> dict[str, Any]:
        """Build a restorable snapshot from one immutable state observation."""
        if state is None:
            return {}

        if state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return {}

        snapshot: dict[str, Any] = {}
        snapshot[ATTR_HVAC_MODE] = state.state

        minimum, maximum = self._temperature_limits_from_attributes(
            entity_id, state.attributes
        )
        low = _coerce_optional_float(state.attributes.get(ATTR_TARGET_TEMP_LOW))
        high = _coerce_optional_float(state.attributes.get(ATTR_TARGET_TEMP_HIGH))
        valid_range = (
            low is not None
            and high is not None
            and minimum <= low <= high <= maximum
        )
        try:
            features = int(state.attributes.get("supported_features", 0) or 0)
        except (TypeError, ValueError):
            features = 0
        supports_range = (
            bool(features & FEATURE_TARGET_TEMPERATURE_RANGE)
            if features
            else (
                ATTR_TARGET_TEMP_LOW in state.attributes
                and ATTR_TARGET_TEMP_HIGH in state.attributes
            )
        )
        if state.state == "heat_cool" and valid_range and supports_range:
            snapshot[ATTR_TARGET_TEMP_LOW] = low
            snapshot[ATTR_TARGET_TEMP_HIGH] = high
        else:
            try:
                temperature = float(state.attributes[ATTR_TEMPERATURE])
            except (KeyError, TypeError, ValueError):
                temperature = None
            if (
                temperature is not None
                and math.isfinite(temperature)
                and minimum <= temperature <= maximum
            ):
                snapshot[ATTR_TEMPERATURE] = temperature
            elif valid_range and supports_range:
                snapshot[ATTR_TARGET_TEMP_LOW] = low
                snapshot[ATTR_TARGET_TEMP_HIGH] = high
        for attr in CLIMATE_MODE_ATTRIBUTES:
            value = state.attributes.get(attr)
            if isinstance(value, str) and value:
                snapshot[attr] = value
        try:
            humidity = float(state.attributes[ATTR_HUMIDITY])
        except (KeyError, TypeError, ValueError):
            humidity = None
        if humidity is not None and math.isfinite(humidity):
            snapshot[ATTR_HUMIDITY] = humidity

        return snapshot

    async def async_restore_state(
        self,
        entity_id: str,
        snapshot: dict[str, Any],
    ) -> None:
        """Restore a climate entity from a stored state snapshot."""
        hvac_mode = snapshot.get(ATTR_HVAC_MODE)
        temperature = snapshot.get(ATTR_TEMPERATURE)
        target_temp_low = snapshot.get(ATTR_TARGET_TEMP_LOW)
        target_temp_high = snapshot.get(ATTR_TARGET_TEMP_HIGH)
        climate_options = self._climate_options_from_snapshot(snapshot)

        if hvac_mode == HVAC_MODE_OFF:
            await self.async_turn_off(entity_id)
            return

        if temperature is not None:
            await self.async_set_temperature(
                entity_id,
                float(temperature),
                ensure_on=hvac_mode is not None,
                hvac_mode=hvac_mode,
                **climate_options,
            )
            return

        if target_temp_low is not None and target_temp_high is not None:
            await self.async_set_temperature_range(
                entity_id,
                float(target_temp_low),
                float(target_temp_high),
                ensure_on=hvac_mode is not None,
                hvac_mode=hvac_mode,
                **climate_options,
            )
            return

        if hvac_mode is not None:
            await self.async_set_hvac_mode(entity_id, str(hvac_mode))
        await self.async_apply_climate_options(entity_id, **climate_options)

    async def async_ensure_on(
        self,
        entity_id: str,
        *,
        hvac_mode: str | None = None,
        range_target: bool = False,
    ) -> None:
        """Ensure a climate entity is not off before setting temperature."""
        state = self._hass.states.get(entity_id)
        if state is None or state.state != HVAC_MODE_OFF:
            return

        target_mode = hvac_mode or self._resolve_first_non_off_hvac_mode(
            entity_id, range_target=range_target
        )
        if target_mode is None:
            await self._async_call(
                CLIMATE_SERVICE_TURN_ON,
                {ATTR_ENTITY_ID: entity_id},
                blocking=True,
            )
            return

        await self.async_set_hvac_mode(entity_id, target_mode)

    async def async_set_hvac_mode(self, entity_id: str, hvac_mode: str) -> None:
        """Set a climate entity HVAC mode."""
        _LOGGER.debug("Setting %s HVAC mode to %s", entity_id, hvac_mode)
        await self._async_call(
            CLIMATE_SERVICE_SET_HVAC_MODE,
            {
                ATTR_ENTITY_ID: entity_id,
                ATTR_HVAC_MODE: hvac_mode,
            },
            blocking=True,
        )

    async def async_turn_off(self, entity_id: str) -> None:
        """Turn off a climate entity."""
        state = self._hass.states.get(entity_id)
        supported_modes = state.attributes.get("hvac_modes") if state is not None else None
        if isinstance(supported_modes, list) and HVAC_MODE_OFF in supported_modes:
            await self.async_set_hvac_mode(entity_id, HVAC_MODE_OFF)
            return

        _LOGGER.debug("Turning off %s", entity_id)
        await self._async_call(
            CLIMATE_SERVICE_TURN_OFF,
            {ATTR_ENTITY_ID: entity_id},
            blocking=True,
        )

    def _resolve_first_non_off_hvac_mode(
        self, entity_id: str, *, range_target: bool = False
    ) -> str | None:
        """Resolve the first supported HVAC mode that is not off."""
        state = self._hass.states.get(entity_id)
        if state is None:
            return None

        supported_modes = state.attributes.get("hvac_modes")
        if not isinstance(supported_modes, list):
            return None

        non_off_modes = [
            mode
            for mode in supported_modes
            if isinstance(mode, str) and mode != HVAC_MODE_OFF
        ]
        if range_target and "heat_cool" in non_off_modes:
            return "heat_cool"
        for mode in non_off_modes:
            if range_target:
                if mode in RANGE_HVAC_MODES:
                    return mode
                continue
            if (
                not self._requires_temperature_range(entity_id, mode)
                and (
                    mode not in RANGE_HVAC_MODES
                    or self._supports_target_feature(entity_id, range_target=False)
                )
            ):
                return mode
        return None if range_target else (non_off_modes[0] if non_off_modes else None)

    def effective_hvac_mode(
        self,
        entity_id: str,
        requested_hvac_mode: str | None,
        *,
        ensure_on: bool,
        range_target: bool = False,
    ) -> str | None:
        """Return the mode that a temperature operation would effectively use."""
        if requested_hvac_mode is not None:
            return requested_hvac_mode
        state = self._hass.states.get(entity_id)
        if state is None:
            return None
        if ensure_on and state.state == HVAC_MODE_OFF:
            return self._resolve_first_non_off_hvac_mode(
                entity_id, range_target=range_target
            )
        return state.state

    def supports_single_temperature_target(
        self,
        entity_id: str,
        requested_hvac_mode: str | None,
        *,
        ensure_on: bool = False,
    ) -> bool:
        """Return whether one temperature can represent the effective mode."""
        if not self._supports_target_feature(entity_id, range_target=False):
            return False
        effective_hvac_mode = self.effective_hvac_mode(
            entity_id,
            requested_hvac_mode,
            ensure_on=ensure_on,
        )
        return not self._requires_temperature_range(entity_id, effective_hvac_mode)

    def _requires_temperature_range(
        self,
        entity_id: str,
        effective_hvac_mode: str | None,
    ) -> bool:
        """Return whether one target cannot represent the active climate range."""
        return (
            effective_hvac_mode in RANGE_HVAC_MODES
            and self._supports_target_feature(entity_id, range_target=True)
        )

    def supports_temperature_range_target(self, entity_id: str) -> bool:
        """Return whether the entity supports a native target range."""
        return self._supports_target_feature(entity_id, range_target=True)

    def validate_temperature_target(
        self,
        entity_id: str,
        *,
        range_target: bool,
        hvac_mode: str | None,
        ensure_on: bool,
    ) -> None:
        """Validate one target kind and effective mode without changing state."""
        if hvac_mode is not None and hvac_mode not in self.supported_hvac_modes(entity_id):
            raise ValueError(f"{entity_id} does not support HVAC mode {hvac_mode}")
        effective_mode = self.effective_hvac_mode(
            entity_id,
            hvac_mode,
            ensure_on=ensure_on,
            range_target=range_target,
        )
        feature_may_be_hidden_while_off = (
            not range_target
            and ensure_on
            and self._current_hvac_mode(entity_id) == HVAC_MODE_OFF
            and effective_mode not in RANGE_HVAC_MODES
        )
        if (
            ensure_on
            and effective_mode in (None, HVAC_MODE_OFF)
            and self.supported_hvac_modes(entity_id)
        ):
            target_kind = "range" if range_target else "single temperature"
            raise ValueError(
                f"{entity_id} has no compatible non-off mode for a "
                f"{target_kind} target"
            )
        if range_target:
            if effective_mode not in RANGE_HVAC_MODES:
                raise ValueError(
                    f"{entity_id} cannot apply a temperature range while in "
                    f"{effective_mode or 'unknown'} mode"
                )
            self._validate_target_feature(entity_id, range_target=True)
            return
        if self._requires_temperature_range(entity_id, effective_mode):
            raise ValueError(
                f"{entity_id} requires separate target_temp_low and "
                f"target_temp_high values in {effective_mode} mode"
            )
        if not feature_may_be_hidden_while_off:
            self._validate_target_feature(entity_id, range_target=False)

    def validate_configured_temperature_target(
        self,
        entity_id: str,
        *,
        range_target: bool,
        hvac_mode: str | None,
    ) -> None:
        """Validate a stored target without depending on transient climate state.

        An explicit mode must itself accept the target shape. Keep is valid when
        the entity advertises at least one compatible non-off mode; runtime
        delivery validates the actual effective mode again before applying it.
        """
        supported_modes = self.supported_hvac_modes(entity_id)
        if hvac_mode is not None:
            if hvac_mode not in supported_modes:
                raise ValueError(
                    f"HVAC mode {hvac_mode} is not supported by {entity_id}"
                )
            candidate_modes = [hvac_mode]
        else:
            candidate_modes = [
                mode for mode in supported_modes if mode != HVAC_MODE_OFF
            ]

        if range_target:
            if not any(mode in RANGE_HVAC_MODES for mode in candidate_modes):
                raise ValueError(
                    f"{entity_id} has no compatible non-off mode for a range target"
                )
            self._validate_target_feature(entity_id, range_target=True)
            return

        if not any(
            mode != HVAC_MODE_OFF
            and not self._requires_temperature_range(entity_id, mode)
            for mode in candidate_modes
        ):
            raise ValueError(
                f"{entity_id} has no compatible non-off mode for a single "
                "temperature target"
            )
        scalar_feature_may_be_hidden_while_off = (
            self._current_hvac_mode(entity_id) == HVAC_MODE_OFF
            and any(
                mode != HVAC_MODE_OFF and mode not in RANGE_HVAC_MODES
                for mode in candidate_modes
            )
        )
        if not scalar_feature_may_be_hidden_while_off:
            self._validate_target_feature(entity_id, range_target=False)

    def _current_hvac_mode(self, entity_id: str) -> str | None:
        """Return the current Home Assistant state for one climate entity."""
        state = self._hass.states.get(entity_id)
        return state.state if state is not None else None

    def _target_features(self, entity_id: str) -> int:
        """Return Home Assistant climate target feature flags."""
        state = self._hass.states.get(entity_id)
        attributes = state.attributes if state is not None else {}
        try:
            return int(attributes.get("supported_features", 0))
        except (TypeError, ValueError):
            return 0

    def _validate_target_feature(self, entity_id: str, *, range_target: bool) -> None:
        """Reject target kinds the entity does not advertise or expose."""
        if self._supports_target_feature(entity_id, range_target=range_target):
            return
        kind = "temperature range" if range_target else "single temperature"
        raise ValueError(f"{entity_id} does not support a {kind} target")

    def _supports_target_feature(self, entity_id: str, *, range_target: bool) -> bool:
        """Return target support, using attributes only when no feature mask exists."""
        features = self._target_features(entity_id)
        required = (
            FEATURE_TARGET_TEMPERATURE_RANGE
            if range_target
            else FEATURE_TARGET_TEMPERATURE
        )
        if features:
            return bool(features & required)
        state = self._hass.states.get(entity_id)
        attrs = state.attributes if state is not None else {}
        return (
            ATTR_TARGET_TEMP_LOW in attrs and ATTR_TARGET_TEMP_HIGH in attrs
            if range_target
            else (
                ATTR_TEMPERATURE in attrs
                or not (
                    features & FEATURE_TARGET_TEMPERATURE_RANGE
                    or (
                        ATTR_TARGET_TEMP_LOW in attrs
                        and ATTR_TARGET_TEMP_HIGH in attrs
                    )
                )
            )
        )

    def temperature_limits(self, entity_id: str) -> tuple[float, float]:
        """Return a climate entity target temperature range."""
        state = self._hass.states.get(entity_id)
        attributes = state.attributes if state is not None else {}
        return self._temperature_limits_from_attributes(entity_id, attributes)

    def _temperature_limits_from_attributes(
        self, entity_id: str, attributes: dict[str, Any]
    ) -> tuple[float, float]:
        """Resolve target limits using attributes from one state observation."""
        unit = self.temperature_unit(entity_id)
        default_minimum = absolute_temperature(
            DEFAULT_MIN_TEMPERATURE,
            UnitOfTemperature.CELSIUS,
            unit,
        )
        default_maximum = absolute_temperature(
            DEFAULT_MAX_TEMPERATURE,
            UnitOfTemperature.CELSIUS,
            unit,
        )
        min_temperature = _coerce_temperature(
            attributes.get("min_temp"),
            default_minimum,
        )
        max_temperature = _coerce_temperature(
            attributes.get("max_temp"),
            default_maximum,
        )

        if (
            min_temperature >= max_temperature
            or _temperature_grid_is_stale(min_temperature, max_temperature, unit)
        ):
            return default_minimum, default_maximum

        return min_temperature, max_temperature

    def normalize_target_temperature(
        self, entity_id: str, temperature: float
    ) -> float:
        """Clamp and snap a target to Home Assistant's zero-anchored step grid."""
        value = float(temperature)
        if not math.isfinite(value):
            raise ValueError("Temperature must be a finite number")
        minimum, maximum = self.temperature_limits(entity_id)
        step = self.temperature_step(entity_id)
        tolerance = step / 2 if step is not None else 0.0
        if value < minimum - tolerance or value > maximum + tolerance:
            raise ValueError(
                f"Temperature must be between {minimum:g} and {maximum:g}"
            )
        if step is None:
            return round(max(minimum, min(maximum, value)), 6)
        first = math.ceil((minimum / step) - 0.000001) * step
        last = math.floor((maximum / step) + 0.000001) * step
        if first > last:
            return round(max(minimum, min(maximum, value)), 6)
        bounded = max(first, min(last, value))
        step_count = math.floor((bounded / step) + 0.5 + 0.000000001)
        snapped = step_count * step
        return round(max(first, min(last, snapped)), 6)

    def temperature_step(self, entity_id: str) -> float | None:
        """Return the exact target step published by Home Assistant, if valid."""
        state = self._hass.states.get(entity_id)
        attributes = state.attributes if state is not None else {}
        step = _coerce_temperature(attributes.get("target_temp_step"), math.nan)
        return step if math.isfinite(step) and step > 0 else None

    def temperature_unit(self, entity_id: str) -> str:
        """Return the effective temperature unit for one climate entity."""
        configured = getattr(
            getattr(getattr(self._hass, "config", None), "units", None),
            "temperature_unit",
            None,
        )
        if configured in (UnitOfTemperature.CELSIUS, UnitOfTemperature.FAHRENHEIT):
            return configured
        state = self._hass.states.get(entity_id)
        attributes = state.attributes if state is not None else {}
        unit = attributes.get("unit_of_measurement")
        if unit in (UnitOfTemperature.CELSIUS, UnitOfTemperature.FAHRENHEIT):
            return unit
        return UnitOfTemperature.CELSIUS

    def supported_hvac_modes(self, entity_id: str) -> list[str]:
        """Return supported HVAC modes for one climate entity."""
        state = self._hass.states.get(entity_id)
        supported_modes = state.attributes.get("hvac_modes") if state is not None else None
        if not isinstance(supported_modes, list):
            return []

        return [mode for mode in supported_modes if isinstance(mode, str)]

    def supported_climate_options(self, entity_id: str) -> dict[str, list[str]]:
        """Return supported optional climate settings for one climate entity."""
        state = self._hass.states.get(entity_id)
        attributes = state.attributes if state is not None else {}
        options: dict[str, list[str]] = {}
        for attr, supported_attr in CLIMATE_MODE_ATTRIBUTES.items():
            supported_values = attributes.get(supported_attr)
            if isinstance(supported_values, list):
                options[attr] = [
                    value for value in supported_values if isinstance(value, str)
                ]
        min_humidity, max_humidity = self.humidity_limits(entity_id)
        if min_humidity is not None and max_humidity is not None:
            options[ATTR_HUMIDITY] = [f"{min_humidity:g}", f"{max_humidity:g}"]
        return options

    def humidity_limits(self, entity_id: str) -> tuple[float | None, float | None]:
        """Return target humidity limits when the climate exposes them."""
        state = self._hass.states.get(entity_id)
        attributes = state.attributes if state is not None else {}
        min_humidity = _coerce_optional_float(attributes.get("min_humidity"))
        max_humidity = _coerce_optional_float(attributes.get("max_humidity"))
        if min_humidity is None and max_humidity is None and ATTR_HUMIDITY not in attributes:
            return None, None
        min_humidity = 0.0 if min_humidity is None else min_humidity
        max_humidity = 100.0 if max_humidity is None else max_humidity
        if min_humidity >= max_humidity:
            return None, None
        return min_humidity, max_humidity

    def _climate_options_from_snapshot(self, snapshot: dict[str, Any]) -> dict[str, Any]:
        """Return restorable optional climate settings from a snapshot."""
        options: dict[str, Any] = {}
        for attr in CLIMATE_MODE_ATTRIBUTES:
            value = snapshot.get(attr)
            if isinstance(value, str) and value:
                options[attr] = value
        if ATTR_HUMIDITY in snapshot:
            try:
                options[ATTR_HUMIDITY] = float(snapshot[ATTR_HUMIDITY])
            except (TypeError, ValueError):
                pass
        return options


def _coerce_temperature(value: object, fallback: float) -> float:
    """Return a valid numeric temperature."""
    try:
        temperature = float(value)
    except (TypeError, ValueError):
        return fallback

    return temperature if math.isfinite(temperature) else fallback


def _temperature_grid_is_stale(
    minimum: float,
    maximum: float,
    unit: str,
) -> bool:
    """Return whether entity limits still use the previous HA unit scale."""
    if unit == UnitOfTemperature.FAHRENHEIT:
        return maximum <= 60.0 and minimum < 40.0
    return maximum > 60.0 or minimum > 40.0


def _coerce_optional_float(value: object) -> float | None:
    """Return a numeric value or None."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None
