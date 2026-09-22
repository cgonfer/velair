"""Temperature unit conversion helpers for Velair."""

from __future__ import annotations

import math
from typing import Any

from homeassistant.const import UnitOfTemperature

CELSIUS = UnitOfTemperature.CELSIUS
FAHRENHEIT = UnitOfTemperature.FAHRENHEIT


def normalize_temperature_unit(value: Any, fallback: str = CELSIUS) -> str:
    """Return a supported Home Assistant temperature unit."""
    return value if value in (CELSIUS, FAHRENHEIT) else fallback


def absolute_temperature(value: float, source: str, target: str) -> float:
    """Convert an absolute temperature between Celsius and Fahrenheit."""
    source = normalize_temperature_unit(source)
    target = normalize_temperature_unit(target)
    number = float(value)
    if source == target:
        return number
    if source == CELSIUS:
        return (number * 9 / 5) + 32
    return (number - 32) * 5 / 9


def temperature_delta(value: float, source: str, target: str) -> float:
    """Convert a temperature difference between Celsius and Fahrenheit."""
    source = normalize_temperature_unit(source)
    target = normalize_temperature_unit(target)
    number = float(value)
    if source == target:
        return number
    return number * 9 / 5 if source == CELSIUS else number * 5 / 9


def snap_temperature_to_step(
    value: float,
    minimum: float,
    maximum: float,
    step: float,
) -> float:
    """Clamp and snap an absolute target to a minimum-anchored device grid."""
    bounded = max(minimum, min(maximum, float(value)))
    count = math.floor(((bounded - minimum) / step) + 0.5 + 0.000000001)
    last = minimum + math.floor(
        ((maximum - minimum) / step) + 0.000000001
    ) * step
    return round(max(minimum, min(last, minimum + count * step)), 6)


def rate_per_degree(value: float, source: str, target: str) -> float:
    """Convert a minutes-per-degree rate between temperature scales."""
    source = normalize_temperature_unit(source)
    target = normalize_temperature_unit(target)
    number = float(value)
    if source == target:
        return number
    return number * 5 / 9 if source == CELSIUS else number * 9 / 5


def state_temperature_unit(state: Any, fallback: str) -> str:
    """Return the temperature unit declared by a Home Assistant state."""
    attributes = getattr(state, "attributes", {}) if state is not None else {}
    return normalize_temperature_unit(attributes.get("unit_of_measurement"), fallback)
