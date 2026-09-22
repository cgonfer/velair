"""Backend-owned comfort-zone geometry and effective humidity ranges."""

from __future__ import annotations

import math
from typing import Any

from .environmental_metrics import saturation_vapour_pressure_hpa
from .models import ComfortData
from .temperature import CELSIUS, absolute_temperature

_GUIDED_SAMPLE_COUNT = 17


def build_comfort_zone(
    config: ComfortData,
    temperature_value: object,
    temperature_unit: str = CELSIUS,
) -> dict[str, Any]:
    """Return configured geometry and the humidity range effective now.

    Temperature-aware limits are linearly interpolated between the configured
    temperature boundaries. Values outside that interval use the nearest
    boundary, so the model never extrapolates beyond user intent.
    """
    temperature_min = float(config["temperature_min"])
    temperature_max = float(config["temperature_max"])
    model = config["comfort_model"]
    reference: dict[str, float] | None = None
    if model == "temperature_aware":
        cold = config["temperature_aware"]["at_temperature_min"]
        warm = config["temperature_aware"]["at_temperature_max"]
        points = _linear_points(temperature_min, temperature_max, cold, warm)
    elif model == "guided":
        reference_temperature = (temperature_min + temperature_max) / 2
        reference = {
            "temperature": round(reference_temperature, 3),
            "humidity_min": float(config["humidity_min"]),
            "humidity_max": float(config["humidity_max"]),
        }
        points = _guided_points(
            temperature_min,
            temperature_max,
            float(config["humidity_min"]),
            float(config["humidity_max"]),
            temperature_unit,
        )
        cold = {
            "minimum": points[0]["humidity_min"],
            "maximum": points[0]["humidity_max"],
        }
        warm = {
            "minimum": points[-1]["humidity_min"],
            "maximum": points[-1]["humidity_max"],
        }
    else:
        cold = {
            "minimum": float(config["humidity_min"]),
            "maximum": float(config["humidity_max"]),
        }
        warm = dict(cold)
        points = _linear_points(temperature_min, temperature_max, cold, warm)
    effective = (
        {
            "temperature": (
                float(temperature_value)
                if _is_finite_number(temperature_value)
                else None
            ),
            "minimum": float(cold["minimum"]),
            "maximum": float(cold["maximum"]),
        }
        if model == "simple"
        else _guided_humidity_range(
            temperature_value,
            temperature_min,
            temperature_max,
            float(config["humidity_min"]),
            float(config["humidity_max"]),
            temperature_unit,
        )
        if model == "guided"
        else _effective_humidity_range(
            temperature_value,
            temperature_min,
            temperature_max,
            cold,
            warm,
        )
    )
    result = {
        "model": model,
        "temperature_min": temperature_min,
        "temperature_max": temperature_max,
        "points": points,
        "effective_humidity_range": effective,
    }
    if reference is not None:
        result["reference"] = reference
    return result


def _linear_points(
    temperature_min: float,
    temperature_max: float,
    cold: dict[str, float],
    warm: dict[str, float],
) -> list[dict[str, float]]:
    """Return the two endpoints used by rectangular and custom models."""
    return [
        {
            "temperature": temperature_min,
            "humidity_min": float(cold["minimum"]),
            "humidity_max": float(cold["maximum"]),
        },
        {
            "temperature": temperature_max,
            "humidity_min": float(warm["minimum"]),
            "humidity_max": float(warm["maximum"]),
        },
    ]


def _guided_points(
    temperature_min: float,
    temperature_max: float,
    humidity_min: float,
    humidity_max: float,
    temperature_unit: str,
) -> list[dict[str, float]]:
    """Sample the guided constant-vapour-pressure envelope."""
    step = (temperature_max - temperature_min) / (_GUIDED_SAMPLE_COUNT - 1)
    return [
        {
            "temperature": round(temperature_min + step * index, 3),
            **_guided_boundaries(
                temperature_min + step * index,
                temperature_min,
                temperature_max,
                humidity_min,
                humidity_max,
                temperature_unit,
            ),
        }
        for index in range(_GUIDED_SAMPLE_COUNT)
    ]


def _guided_humidity_range(
    temperature_value: object,
    temperature_min: float,
    temperature_max: float,
    humidity_min: float,
    humidity_max: float,
    temperature_unit: str,
) -> dict[str, float] | None:
    if not _is_finite_number(temperature_value):
        return None
    temperature = float(temperature_value)
    boundaries = _guided_boundaries(
        temperature,
        temperature_min,
        temperature_max,
        humidity_min,
        humidity_max,
        temperature_unit,
    )
    return {
        "temperature": temperature,
        "minimum": boundaries["humidity_min"],
        "maximum": boundaries["humidity_max"],
    }


def _guided_boundaries(
    temperature: float,
    temperature_min: float,
    temperature_max: float,
    humidity_min: float,
    humidity_max: float,
    temperature_unit: str,
) -> dict[str, float]:
    reference = (temperature_min + temperature_max) / 2
    reference_c = absolute_temperature(reference, temperature_unit, CELSIUS)
    temperature_c = absolute_temperature(temperature, temperature_unit, CELSIUS)
    reference_saturation = saturation_vapour_pressure_hpa(reference_c)
    current_saturation = saturation_vapour_pressure_hpa(temperature_c)
    if not reference_saturation or not current_saturation:
        return {"humidity_min": humidity_min, "humidity_max": humidity_max}

    def project(relative_humidity: float) -> float:
        vapour_pressure = reference_saturation * relative_humidity / 100
        return round(min(100.0, max(0.0, 100 * vapour_pressure / current_saturation)), 2)

    return {
        "humidity_min": project(humidity_min),
        "humidity_max": project(humidity_max),
    }


def _effective_humidity_range(
    temperature_value: object,
    temperature_min: float,
    temperature_max: float,
    cold: dict[str, float],
    warm: dict[str, float],
) -> dict[str, float] | None:
    """Interpolate and clamp the effective humidity range."""
    if (
        isinstance(temperature_value, bool)
        or not isinstance(temperature_value, int | float)
        or not math.isfinite(float(temperature_value))
        or temperature_max <= temperature_min
    ):
        return None
    temperature = float(temperature_value)
    ratio = min(
        1.0,
        max(0.0, (temperature - temperature_min) / (temperature_max - temperature_min)),
    )
    minimum = float(cold["minimum"]) + ratio * (
        float(warm["minimum"]) - float(cold["minimum"])
    )
    maximum = float(cold["maximum"]) + ratio * (
        float(warm["maximum"]) - float(cold["maximum"])
    )
    return {
        "temperature": temperature,
        "minimum": round(minimum, 2),
        "maximum": round(maximum, 2),
    }


def _is_finite_number(value: object) -> bool:
    """Return whether value is a finite, non-boolean number."""
    return (
        isinstance(value, int | float)
        and not isinstance(value, bool)
        and math.isfinite(float(value))
    )
