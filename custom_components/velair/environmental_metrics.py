"""Pure calculations for optional derived environmental metrics.

All calculations use degrees Celsius internally.  The formulas are implemented
locally so Comfort never depends on another Home Assistant integration.
"""

from __future__ import annotations

import math


# Magnus constants recommended by Alduchov and Eskridge for liquid water.
_MAGNUS_A = 17.625
_MAGNUS_B = 243.04
_TEMPERATURE_RANGE_EPSILON = 1e-6


def dew_point_celsius(temperature_c: float, relative_humidity: float) -> float | None:
    """Return dew point in Celsius, or None for unusable input.

    Reference: Alduchov, O. A. and Eskridge, R. E. (1996), Improved Magnus
    Form Approximation of Saturation Vapor Pressure.
    """
    if not _valid_inputs(temperature_c, relative_humidity):
        return None
    gamma = math.log(relative_humidity / 100.0) + (
        _MAGNUS_A * temperature_c / (_MAGNUS_B + temperature_c)
    )
    denominator = _MAGNUS_A - gamma
    if denominator == 0:
        return None
    return _finite_or_none(_MAGNUS_B * gamma / denominator)


def absolute_humidity_g_m3(
    temperature_c: float,
    relative_humidity: float,
) -> float | None:
    """Return absolute humidity in grams per cubic metre.

    Saturation vapour pressure uses the Magnus approximation above.  Vapour
    density then follows the ideal-gas relation with the water-vapour gas
    constant (216.7 when pressure is expressed in hPa).
    """
    if not _valid_inputs(temperature_c, relative_humidity):
        return None
    saturation_hpa = saturation_vapour_pressure_hpa(temperature_c)
    if saturation_hpa is None:
        return None
    vapour_pressure_hpa = relative_humidity / 100.0 * saturation_hpa
    return _finite_or_none(216.7 * vapour_pressure_hpa / (temperature_c + 273.15))


def relative_humidity_from_absolute_humidity_g_m3(
    temperature_c: float,
    absolute_humidity: float,
) -> float | None:
    """Return relative humidity at ``temperature_c`` for water-vapour density.

    This is the inverse of :func:`absolute_humidity_g_m3` and is used to
    project outdoor air to the indoor temperature without pretending that the
    outdoor relative-humidity percentage transfers unchanged indoors.
    """
    if not _valid_temperature(temperature_c) or not (
        math.isfinite(absolute_humidity) and absolute_humidity >= 0
    ):
        return None
    saturation_hpa = saturation_vapour_pressure_hpa(temperature_c)
    if saturation_hpa is None or saturation_hpa <= 0:
        return None
    vapour_pressure_hpa = absolute_humidity * (temperature_c + 273.15) / 216.7
    relative_humidity = 100.0 * vapour_pressure_hpa / saturation_hpa
    if not math.isfinite(relative_humidity) or relative_humidity > 100:
        return None
    return round(relative_humidity, 3)


def saturation_vapour_pressure_hpa(temperature_c: float) -> float | None:
    """Return saturation vapour pressure in hPa using the Magnus form."""
    if not _valid_temperature(temperature_c):
        return None
    return _finite_or_none(
        6.1094
        * math.exp(_MAGNUS_A * temperature_c / (_MAGNUS_B + temperature_c))
    )


def humidex_celsius(temperature_c: float, relative_humidity: float) -> float | None:
    """Return the Canadian Humidex value on its Celsius-equivalent scale.

    The calculation follows Environment and Climate Change Canada's dew-point
    formulation.  Humidex describes perceived heat; it is not a universal
    indoor-comfort score.
    """
    dew_point = dew_point_celsius(temperature_c, relative_humidity)
    if dew_point is None:
        return None
    vapour_pressure_hpa = 6.11 * math.exp(
        5417.7530 * ((1.0 / 273.16) - (1.0 / (273.16 + dew_point)))
    )
    return _finite_or_none(
        temperature_c + (0.5555 * (vapour_pressure_hpa - 10.0))
    )


def humidex_temperature_range_position(
    humidex: float,
    minimum_c: float,
    maximum_c: float,
) -> str | None:
    """Classify Humidex against a configured temperature range in Celsius.

    The bounds are inclusive. A small epsilon avoids unstable classification
    when a converted or calculated value differs only by floating-point noise.
    """
    if not all(math.isfinite(value) for value in (humidex, minimum_c, maximum_c)):
        return None
    if minimum_c > maximum_c:
        return None
    if humidex < minimum_c - _TEMPERATURE_RANGE_EPSILON:
        return "below"
    if humidex > maximum_c + _TEMPERATURE_RANGE_EPSILON:
        return "above"
    return "within"


def _valid_inputs(temperature_c: float, relative_humidity: float) -> bool:
    """Return whether temperature and relative humidity can be calculated."""
    return (
        _valid_temperature(temperature_c)
        and math.isfinite(relative_humidity)
        and 0 < relative_humidity <= 100
    )


def _valid_temperature(temperature_c: float) -> bool:
    """Return whether a Celsius air temperature is physically usable here."""
    return math.isfinite(temperature_c) and -100 < temperature_c < 100


def _finite_or_none(value: float) -> float | None:
    """Return a finite rounded calculation result."""
    return round(value, 3) if math.isfinite(value) else None
