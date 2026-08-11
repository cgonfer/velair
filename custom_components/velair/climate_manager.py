"""Climate service adapter."""

from __future__ import annotations

import logging
import math
from typing import Any

from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant
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


class ClimateManager:
    """Apply target temperatures through Home Assistant climate services."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the climate manager."""
        self._hass = hass

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
        if hvac_mode is not None:
            await self.async_set_hvac_mode(entity_id, hvac_mode)
        elif ensure_on:
            await self.async_ensure_on(entity_id, hvac_mode=hvac_mode)

        await self._hass.services.async_call(
            CLIMATE_DOMAIN,
            CLIMATE_SERVICE_SET_TEMPERATURE,
            {
                ATTR_ENTITY_ID: entity_id,
                ATTR_TEMPERATURE: temperature,
            },
            blocking=blocking,
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
        if hvac_mode is not None:
            await self.async_set_hvac_mode(entity_id, hvac_mode)
        elif ensure_on:
            await self.async_ensure_on(entity_id, range_target=True)
        await self._hass.services.async_call(
            CLIMATE_DOMAIN,
            CLIMATE_SERVICE_SET_TEMPERATURE,
            {
                ATTR_ENTITY_ID: entity_id,
                ATTR_TARGET_TEMP_LOW: low,
                ATTR_TARGET_TEMP_HIGH: high,
            },
            blocking=blocking,
        )
        await self.async_apply_climate_options(
            entity_id,
            fan_mode=fan_mode,
            humidity=humidity,
            preset_mode=preset_mode,
            swing_mode=swing_mode,
            swing_horizontal_mode=swing_horizontal_mode,
        )

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
            await self._hass.services.async_call(
                CLIMATE_DOMAIN,
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
        if state is None:
            return {}

        if state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return {}

        snapshot: dict[str, Any] = {}
        snapshot[ATTR_HVAC_MODE] = state.state

        minimum, maximum = self.temperature_limits(entity_id)
        low = _coerce_optional_float(state.attributes.get(ATTR_TARGET_TEMP_LOW))
        high = _coerce_optional_float(state.attributes.get(ATTR_TARGET_TEMP_HIGH))
        valid_range = (
            low is not None
            and high is not None
            and minimum <= low <= high <= maximum
        )
        supports_range = self._supports_target_feature(entity_id, range_target=True)
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
            await self._hass.services.async_call(
                CLIMATE_DOMAIN,
                CLIMATE_SERVICE_TURN_ON,
                {ATTR_ENTITY_ID: entity_id},
                blocking=True,
            )
            return

        await self.async_set_hvac_mode(entity_id, target_mode)

    async def async_set_hvac_mode(self, entity_id: str, hvac_mode: str) -> None:
        """Set a climate entity HVAC mode."""
        _LOGGER.debug("Setting %s HVAC mode to %s", entity_id, hvac_mode)
        await self._hass.services.async_call(
            CLIMATE_DOMAIN,
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
        await self._hass.services.async_call(
            CLIMATE_DOMAIN,
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
            if not self._requires_temperature_range(entity_id, mode):
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
        if effective_hvac_mode not in RANGE_HVAC_MODES:
            return False
        state = self._hass.states.get(entity_id)
        attributes = state.attributes if state is not None else {}
        try:
            supported_features = int(attributes.get("supported_features", 0))
        except (TypeError, ValueError):
            supported_features = 0
        if supported_features:
            return bool(supported_features & FEATURE_TARGET_TEMPERATURE_RANGE)
        return (
            ATTR_TARGET_TEMP_LOW in attributes
            and ATTR_TARGET_TEMP_HIGH in attributes
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
        if range_target:
            self._validate_target_feature(entity_id, range_target=True)
            if ensure_on and effective_mode in (None, HVAC_MODE_OFF):
                raise ValueError(
                    f"{entity_id} has no compatible non-off mode for a range target"
                )
            if effective_mode not in RANGE_HVAC_MODES:
                raise ValueError(
                    f"{entity_id} cannot apply a temperature range while in "
                    f"{effective_mode or 'unknown'} mode"
                )
            return
        if self._requires_temperature_range(entity_id, effective_mode):
            raise ValueError(
                f"{entity_id} requires separate target_temp_low and "
                f"target_temp_high values in {effective_mode} mode"
            )
        self._validate_target_feature(entity_id, range_target=False)

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
