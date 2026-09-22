"""Pure, conservative insights for Environmental Comfort assessments."""

from __future__ import annotations

import math
from typing import Any, Literal, TypedDict

from .environmental_metrics import (
    relative_humidity_from_absolute_humidity_g_m3,
)
from .temperature import CELSIUS, absolute_temperature


class ComfortInsight(TypedDict):
    """Stable runtime insight projection consumed by UI and automations."""

    code: str
    kind: Literal["primary", "context"]
    tone: Literal["positive", "neutral", "cool", "warm", "attention", "critical"]
    metrics: list[str]


class ComfortRangeSummary(TypedDict):
    """Backend-owned relationship between configured ranges and current data."""

    status: Literal["within_range", "outside_range", "mixed", "unavailable"]
    thermal_relation: Literal[
        "aligned", "mixed", "not_evaluated", "unavailable"
    ]
    positions: dict[str, Literal["below", "within", "above"] | None]


class VentilationOpportunity(TypedDict):
    """Stable backend-owned ventilation opportunity projection."""

    state: Literal[
        "unavailable",
        "no_opportunity",
        "may_help",
        "comfort_possible",
        "trade_off",
        "already_comfortable",
    ]
    evaluation_scope: Literal[
        "temperature_only", "temperature_and_humidity"
    ] | None
    potential_effects: list[
        Literal["cooling", "warming", "drying", "humidifying"]
    ]
    blocked_by: list[Literal["temperature", "humidity"]]
    reason: str


def build_ventilation_opportunity(
    assessment: dict[str, Any],
    *,
    humidity_monitored: bool,
    outdoor_humidity_configured: bool,
    outdoor_comfort_zone: dict[str, Any] | None,
) -> VentilationOpportunity:
    """Project one conservative automation-friendly ventilation state."""

    def result(
        state: VentilationOpportunity["state"],
        reason: str,
        *,
        scope: VentilationOpportunity["evaluation_scope"] = None,
        effects: list[str] | None = None,
        blocked: list[str] | None = None,
    ) -> VentilationOpportunity:
        return {
            "state": state,
            "evaluation_scope": scope,
            "potential_effects": list(effects or []),
            "blocked_by": list(blocked or []),
            "reason": reason,
        }  # type: ignore[return-value]

    if not assessment.get("enabled"):
        return result("unavailable", "monitoring_off")
    outdoor = assessment.get("outdoor")
    if not isinstance(outdoor, dict) or not outdoor.get("enabled"):
        return result("unavailable", "outdoor_comparison_disabled")

    indoor_temperature = assessment.get("temperature")
    if not _is_current(indoor_temperature):
        return result("unavailable", "indoor_temperature_unavailable")
    indoor_humidity = assessment.get("humidity")
    if humidity_monitored and not _is_current(indoor_humidity):
        return result("unavailable", "indoor_humidity_unavailable")

    outdoor_temperature = outdoor.get("temperature")
    if not _is_current(outdoor_temperature):
        return result("unavailable", "outdoor_temperature_unavailable")
    outdoor_humidity = outdoor.get("humidity")
    if (
        humidity_monitored
        and outdoor_humidity_configured
        and not _is_current(outdoor_humidity)
    ):
        return result("unavailable", "outdoor_humidity_unavailable")

    scope: VentilationOpportunity["evaluation_scope"] = (
        "temperature_and_humidity"
        if humidity_monitored and outdoor_humidity_configured
        else "temperature_only"
    )
    if assessment.get("condition") == "comfortable":
        return result(
            "already_comfortable",
            "already_comfortable",
            scope=scope,
        )

    comparison = outdoor.get("comparison")
    comparison = comparison if isinstance(comparison, dict) else {}
    effects: list[str] = []
    blocked: list[str] = []
    for dimension in ("temperature", "humidity"):
        item = comparison.get(dimension)
        if not isinstance(item, dict):
            continue
        potential = item.get("potential")
        if potential in ("cooling", "warming", "drying", "humidifying"):
            effects.append(potential)
        for blocker in item.get("blocked_by", []):
            if blocker in ("temperature", "humidity") and blocker not in blocked:
                blocked.append(blocker)

    if blocked:
        return result(
            "trade_off",
            "known_trade_off",
            scope=scope,
            effects=effects,
            blocked=blocked,
        )
    if not effects:
        return result(
            "no_opportunity",
            "no_useful_difference",
            scope=scope,
        )

    temperature = float(outdoor_temperature["value"])
    temperature_inside = (
        isinstance(outdoor_comfort_zone, dict)
        and float(outdoor_comfort_zone.get("temperature_min", temperature + 1))
        <= temperature
        <= float(outdoor_comfort_zone.get("temperature_max", temperature - 1))
    )
    humidity_inside = not humidity_monitored
    if humidity_monitored and outdoor_humidity_configured and _is_current(outdoor_humidity):
        effective = (
            outdoor_comfort_zone.get("effective_humidity_range")
            if isinstance(outdoor_comfort_zone, dict)
            else None
        )
        if isinstance(effective, dict):
            minimum = effective.get("minimum")
            maximum = effective.get("maximum")
            humidity = float(outdoor_humidity["value"])
            humidity_inside = (
                isinstance(minimum, int | float)
                and not isinstance(minimum, bool)
                and isinstance(maximum, int | float)
                and not isinstance(maximum, bool)
                and float(minimum) <= humidity <= float(maximum)
            )

    if temperature_inside and humidity_inside:
        return result(
            "comfort_possible",
            "outdoor_conditions_within_comfort",
            scope=scope,
            effects=effects,
        )
    return result(
        "may_help",
        (
            "outdoor_humidity_not_configured"
            if humidity_monitored and not outdoor_humidity_configured
            else "moves_toward_comfort"
        ),
        scope=scope,
        effects=effects,
    )


def build_comfort_range_summary(
    assessment: dict[str, Any],
) -> ComfortRangeSummary:
    """Summarize ranges without replacing the compatible physical condition.

    Humidex remains observational. The summary makes disagreement explicit
    instead of turning the index into a categorical hot/cold verdict.
    """
    temperature_position = _metric_range_position(
        assessment.get("temperature"),
        below_condition="cold",
        within_condition="comfortable",
        above_condition="hot",
    )
    humidity = assessment.get("humidity")
    humidity_position = _metric_range_position(
        humidity,
        below_condition="dry",
        within_condition="comfortable",
        above_condition="humid",
    )
    derived = assessment.get("derived_metrics")
    derived = derived if isinstance(derived, dict) else {}
    humidex = derived.get("humidex")
    humidex_availability = (
        humidex.get("availability") if isinstance(humidex, dict) else None
    )
    humidex_position = (
        humidex.get("temperature_range_position")
        if humidex_availability == "current" and isinstance(humidex, dict)
        else None
    )
    if humidex_position not in ("below", "within", "above"):
        humidex_position = None

    positions: dict[str, Literal["below", "within", "above"] | None] = {
        "temperature": temperature_position,
        "humidity": humidity_position,
        "humidex": humidex_position,
    }
    if temperature_position is None:
        return {
            "status": "unavailable",
            "thermal_relation": "unavailable",
            "positions": positions,
        }

    if humidex_availability == "not_monitored":
        thermal_relation = "not_evaluated"
    elif humidex_availability != "current" or humidex_position is None:
        thermal_relation = "unavailable"
    elif temperature_position == humidex_position:
        thermal_relation = "aligned"
    else:
        thermal_relation = "mixed"

    humidity_monitored_unusable = (
        isinstance(humidity, dict)
        and humidity.get("availability") != "not_monitored"
        and humidity_position is None
    )
    if thermal_relation == "unavailable" or humidity_monitored_unusable:
        status = "unavailable"
    elif thermal_relation == "mixed":
        status = "mixed"
    else:
        evaluated_positions = [temperature_position]
        if humidity_position is not None:
            evaluated_positions.append(humidity_position)
        if humidex_position is not None:
            evaluated_positions.append(humidex_position)
        status = (
            "within_range"
            if all(position == "within" for position in evaluated_positions)
            else "outside_range"
        )
    return {
        "status": status,
        "thermal_relation": thermal_relation,
        "positions": positions,
    }


def build_comfort_insights(
    assessment: dict[str, Any],
    *,
    temperature_unit: str,
) -> list[ComfortInsight]:
    """Build ordered observational insights from current indoor readings."""
    insights: list[ComfortInsight] = []
    co2 = assessment.get("co2")
    if _is_current(co2) and co2.get("condition") in ("elevated", "poor"):
        co2_condition = str(co2["condition"])
        insights.append(
            {
                "code": f"co2_{co2_condition}",
                "kind": "context",
                "tone": "critical" if co2_condition == "poor" else "attention",
                "metrics": ["co2"],
            }
        )

    outdoor = assessment.get("outdoor")
    comparison = outdoor.get("comparison") if isinstance(outdoor, dict) else None
    comparison = comparison if isinstance(comparison, dict) else {}
    comparison_items = [
        item for item in comparison.values() if isinstance(item, dict)
    ]
    blocked = any(item.get("blocked_by") for item in comparison_items)
    if blocked:
        insights.append(
            {
                "code": "ventilation_has_tradeoff",
                "kind": "context",
                "tone": "attention",
                "metrics": ["temperature", "humidity", "outdoor"],
            }
        )
    else:
        opportunity_codes = {
            "cooling": "ventilation_may_help_cool",
            "warming": "ventilation_may_help_warm",
            "drying": "ventilation_may_help_reduce_humidity",
            "humidifying": "ventilation_may_help_increase_humidity",
        }
        for dimension in ("temperature", "humidity"):
            item = comparison.get(dimension)
            potential = item.get("potential") if isinstance(item, dict) else None
            code = opportunity_codes.get(potential)
            if code:
                insights.append(
                    {
                        "code": code,
                        "kind": "context",
                        "tone": "cool" if potential in ("cooling", "drying") else "warm",
                        "metrics": [dimension, "outdoor"],
                    }
                )

    derived = assessment.get("derived_metrics")
    derived = derived if isinstance(derived, dict) else {}
    humidex = derived.get("humidex")
    temperature = assessment.get("temperature")
    if _is_current(humidex) and _is_current(temperature):
        temperature_c = _temperature_celsius(
            float(temperature["value"]), temperature_unit
        )
        if float(humidex["value"]) - temperature_c >= 1.0:
            insights.append(
                {
                    "code": "humidex_feels_warmer",
                    "kind": "context",
                    "tone": "warm",
                    "metrics": ["temperature", "humidex"],
                }
            )

    return insights


def build_outdoor_comparison(
    *,
    indoor_temperature: dict[str, Any],
    indoor_humidity: dict[str, Any],
    indoor_absolute_humidity: dict[str, Any],
    outdoor_temperature: dict[str, Any],
    outdoor_humidity: dict[str, Any],
    outdoor_absolute_humidity: dict[str, Any],
    temperature_min: float,
    temperature_max: float,
    humidity_min: float | None,
    humidity_max: float | None,
    temperature_unit: str,
    temperature_threshold: float,
    humidity_threshold: float,
    absolute_humidity_threshold: float,
) -> dict[str, dict[str, Any]]:
    """Return conservative, observational indoor/outdoor comparisons.

    The policy deliberately describes opportunities, never commands. Missing
    humidity does not suppress a useful thermal comparison, while a known
    worsening of the other monitored dimension converts an opportunity into a
    trade-off.
    """
    temperature_availability = _combined_availability(
        indoor_temperature, outdoor_temperature
    )
    temperature_result: dict[str, Any] = {
        "availability": temperature_availability,
        "delta": None,
        "effect": None,
        "potential": None,
        "blocked_by": [],
    }
    thermal_threshold = temperature_threshold
    if temperature_availability == "current":
        indoor_value = float(indoor_temperature["value"])
        outdoor_value = float(outdoor_temperature["value"])
        delta = outdoor_value - indoor_value
        temperature_result["delta"] = round(delta, 2)
        temperature_result["effect"] = (
            "cooler"
            if delta <= -thermal_threshold
            else "warmer" if delta >= thermal_threshold else "similar"
        )
        if (
            indoor_value > temperature_max
            and delta <= -thermal_threshold
            and _range_distance(outdoor_value, temperature_min, temperature_max)
            < _range_distance(indoor_value, temperature_min, temperature_max)
        ):
            temperature_result["potential"] = "cooling"
        elif (
            indoor_value < temperature_min
            and delta >= thermal_threshold
            and _range_distance(outdoor_value, temperature_min, temperature_max)
            < _range_distance(indoor_value, temperature_min, temperature_max)
        ):
            temperature_result["potential"] = "warming"

    humidity_availability = _combined_availability(
        indoor_temperature,
        indoor_humidity,
        indoor_absolute_humidity,
        outdoor_temperature,
        outdoor_humidity,
        outdoor_absolute_humidity,
    )
    if outdoor_humidity.get("availability") == "not_monitored":
        humidity_availability = "not_monitored"
    humidity_result: dict[str, Any] = {
        "availability": humidity_availability,
        "absolute_humidity_delta": None,
        "equivalent_indoor_relative_humidity": None,
        "equivalent_indoor_relative_humidity_delta": None,
        "effect": None,
        "potential": None,
        "blocked_by": [],
    }
    if humidity_availability == "current":
        indoor_temperature_c = absolute_temperature(
            float(indoor_temperature["value"]), temperature_unit, CELSIUS
        )
        projected_humidity = relative_humidity_from_absolute_humidity_g_m3(
            indoor_temperature_c,
            float(outdoor_absolute_humidity["value"]),
        )
        if projected_humidity is None:
            humidity_result["availability"] = "invalid"
        else:
            indoor_humidity_value = float(indoor_humidity["value"])
            humidity_delta = projected_humidity - indoor_humidity_value
            absolute_delta = (
                float(outdoor_absolute_humidity["value"])
                - float(indoor_absolute_humidity["value"])
            )
            humidity_result.update(
                {
                    "absolute_humidity_delta": round(absolute_delta, 2),
                    "equivalent_indoor_relative_humidity": round(projected_humidity, 2),
                    "equivalent_indoor_relative_humidity_delta": round(
                        humidity_delta, 2
                    ),
                    "effect": (
                        "drier"
                        if humidity_delta <= -humidity_threshold
                        and absolute_delta <= -absolute_humidity_threshold
                        else "more_humid"
                        if humidity_delta >= humidity_threshold
                        and absolute_delta >= absolute_humidity_threshold
                        else "similar"
                    ),
                }
            )
            if (
                humidity_min is not None
                and humidity_max is not None
                and indoor_humidity_value > humidity_max
                and humidity_delta <= -humidity_threshold
                and absolute_delta <= -absolute_humidity_threshold
                and _range_distance(projected_humidity, humidity_min, humidity_max)
                < _range_distance(indoor_humidity_value, humidity_min, humidity_max)
            ):
                humidity_result["potential"] = "drying"
            elif (
                humidity_min is not None
                and humidity_max is not None
                and indoor_humidity_value < humidity_min
                and humidity_delta >= humidity_threshold
                and absolute_delta >= absolute_humidity_threshold
                and _range_distance(projected_humidity, humidity_min, humidity_max)
                < _range_distance(indoor_humidity_value, humidity_min, humidity_max)
            ):
                humidity_result["potential"] = "humidifying"

    if (
        temperature_result["potential"]
        and humidity_min is not None
        and humidity_max is not None
        and _known_humidity_worsening(
            indoor_humidity,
            humidity_result,
            humidity_min,
            humidity_max,
            humidity_threshold,
            absolute_humidity_threshold,
        )
    ):
        temperature_result["blocked_by"] = ["humidity"]
    if humidity_result["potential"] and _known_temperature_worsening(
        indoor_temperature,
        outdoor_temperature,
        temperature_min,
        temperature_max,
        thermal_threshold,
    ):
        humidity_result["blocked_by"] = ["temperature"]

    return {"temperature": temperature_result, "humidity": humidity_result}


def _is_current(metric: object) -> bool:
    """Return whether a metric has one usable current numeric reading."""
    return (
        isinstance(metric, dict)
        and metric.get("availability") == "current"
        and isinstance(metric.get("value"), int | float)
        and not isinstance(metric.get("value"), bool)
        and math.isfinite(float(metric["value"]))
    )


def _metric_range_position(
    metric: object,
    *,
    below_condition: str,
    within_condition: str,
    above_condition: str,
) -> Literal["below", "within", "above"] | None:
    """Project an existing ranged metric classification onto one position."""
    if not _is_current(metric):
        return None
    condition = metric.get("condition")
    if condition == below_condition:
        return "below"
    if condition == within_condition:
        return "within"
    if condition == above_condition:
        return "above"
    return None


def _temperature_celsius(value: float, unit: str) -> float:
    """Convert the runtime temperature to Celsius for Humidex comparison."""
    return (value - 32.0) * 5.0 / 9.0 if unit == "°F" else value


def _combined_availability(*metrics: dict[str, Any]) -> str:
    """Combine dependencies without hiding stale or invalid data."""
    values = {metric.get("availability") for metric in metrics}
    if "not_monitored" in values:
        return "not_monitored"
    if "stale" in values:
        return "stale"
    if "invalid" in values:
        return "invalid"
    if values == {"current"}:
        return "current"
    return "missing"


def _range_distance(value: float, minimum: float, maximum: float) -> float:
    """Return distance to an inclusive range."""
    return minimum - value if value < minimum else value - maximum if value > maximum else 0.0


def _known_humidity_worsening(
    indoor_humidity: dict[str, Any],
    comparison: dict[str, Any],
    minimum: float,
    maximum: float,
    humidity_threshold: float,
    absolute_humidity_threshold: float,
) -> bool:
    """Return whether projected outdoor moisture clearly worsens humidity."""
    if comparison.get("availability") != "current" or not _is_current(indoor_humidity):
        return False
    projected = comparison.get("equivalent_indoor_relative_humidity")
    delta = comparison.get("equivalent_indoor_relative_humidity_delta")
    absolute_delta = comparison.get("absolute_humidity_delta")
    if not all(isinstance(value, int | float) for value in (projected, delta, absolute_delta)):
        return False
    indoor = float(indoor_humidity["value"])
    return (
        abs(float(delta)) >= humidity_threshold
        and abs(float(absolute_delta)) >= absolute_humidity_threshold
        and _range_distance(float(projected), minimum, maximum)
        > _range_distance(indoor, minimum, maximum)
    )


def _known_temperature_worsening(
    indoor_temperature: dict[str, Any],
    outdoor_temperature: dict[str, Any],
    minimum: float,
    maximum: float,
    threshold: float,
) -> bool:
    """Return whether outdoor temperature clearly worsens thermal comfort."""
    if not _is_current(indoor_temperature) or not _is_current(outdoor_temperature):
        return False
    indoor = float(indoor_temperature["value"])
    outdoor = float(outdoor_temperature["value"])
    return (
        abs(outdoor - indoor) >= threshold
        and _range_distance(outdoor, minimum, maximum)
        > _range_distance(indoor, minimum, maximum)
    )
