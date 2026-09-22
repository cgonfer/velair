"""Tests for conservative runtime-only Comfort insights."""

from __future__ import annotations

import unittest

from . import helpers as _helpers  # noqa: F401
from custom_components.velair.comfort_insights import (
    build_comfort_insights,
    build_comfort_range_summary,
    build_outdoor_comparison,
    build_ventilation_opportunity,
)
from custom_components.velair.environmental_metrics import absolute_humidity_g_m3


def _metric(value, *, condition=None, availability="current"):
    return {
        "availability": availability,
        "condition": condition,
        "value": value,
    }


class ComfortInsightsTest(unittest.TestCase):
    """Verify stable ordering, prudence, and unit handling."""

    def test_orders_co2_and_derived_context(self) -> None:
        assessment = {
            "condition": "hot_and_humid",
            "temperature": _metric(26, condition="hot"),
            "humidity": _metric(68, condition="humid"),
            "co2": _metric(1200, condition="elevated"),
            "derived_metrics": {
                "humidex": _metric(30),
                "dew_point": _metric(19),
                "absolute_humidity": _metric(16),
            },
        }

        insights = build_comfort_insights(assessment, temperature_unit="°C")

        self.assertEqual(
            [insight["code"] for insight in insights],
            [
                "co2_elevated",
                "humidex_feels_warmer",
            ],
        )
        self.assertTrue(all(insight["kind"] == "context" for insight in insights))

    def test_humidex_margin_is_compared_in_celsius_for_fahrenheit_zone(self) -> None:
        assessment = {
            "condition": "comfortable",
            "temperature": _metric(77, condition="comfortable"),
            "humidity": _metric(50, condition="comfortable"),
            "co2": _metric(None, availability="not_monitored"),
            "derived_metrics": {"humidex": _metric(26)},
        }

        insights = build_comfort_insights(assessment, temperature_unit="°F")

        self.assertIn("humidex_feels_warmer", [item["code"] for item in insights])

    def test_humidex_under_one_degree_margin_is_not_presented(self) -> None:
        assessment = {
            "condition": "comfortable",
            "temperature": _metric(25, condition="comfortable"),
            "humidity": _metric(50, condition="comfortable"),
            "derived_metrics": {"humidex": _metric(25.9)},
        }

        insights = build_comfort_insights(assessment, temperature_unit="°C")

        self.assertNotIn("humidex_feels_warmer", [item["code"] for item in insights])

    def test_range_summary_keeps_condition_compatible_and_reports_mixed_thermal_indicators(self) -> None:
        assessment = {
            "condition": "comfortable",
            "temperature": _metric(23, condition="comfortable"),
            "humidity": _metric(50, condition="comfortable"),
            "derived_metrics": {
                "humidex": {
                    **_metric(25),
                    "temperature_range_position": "above",
                }
            },
        }

        summary = build_comfort_range_summary(assessment)

        self.assertEqual(assessment["condition"], "comfortable")
        self.assertEqual(summary["status"], "mixed")
        self.assertEqual(summary["thermal_relation"], "mixed")
        self.assertEqual(
            summary["positions"],
            {"temperature": "within", "humidity": "within", "humidex": "above"},
        )

    def test_range_summary_covers_temperature_humidex_position_matrix(self) -> None:
        condition_for = {"below": "cold", "within": "comfortable", "above": "hot"}
        for temperature_position in ("below", "within", "above"):
            for humidex_position in ("below", "within", "above"):
                with self.subTest(
                    temperature=temperature_position,
                    humidex=humidex_position,
                ):
                    summary = build_comfort_range_summary(
                        {
                            "temperature": _metric(
                                22,
                                condition=condition_for[temperature_position],
                            ),
                            "humidity": _metric(None, availability="not_monitored"),
                            "derived_metrics": {
                                "humidex": {
                                    **_metric(22),
                                    "temperature_range_position": humidex_position,
                                }
                            },
                        }
                    )
                    aligned = temperature_position == humidex_position
                    self.assertEqual(
                        summary["thermal_relation"],
                        "aligned" if aligned else "mixed",
                    )
                    self.assertEqual(
                        summary["status"],
                        (
                            "within_range"
                            if aligned and temperature_position == "within"
                            else "outside_range" if aligned else "mixed"
                        ),
                    )

    def test_range_summary_uses_all_current_configured_dimensions(self) -> None:
        within = {
            "temperature": _metric(22, condition="comfortable"),
            "humidity": _metric(50, condition="comfortable"),
            "derived_metrics": {
                "humidex": {
                    **_metric(23),
                    "temperature_range_position": "within",
                }
            },
        }
        humidity_outside = {
            **within,
            "humidity": _metric(70, condition="humid"),
        }

        self.assertEqual(
            build_comfort_range_summary(within)["status"], "within_range"
        )
        self.assertEqual(
            build_comfort_range_summary(humidity_outside)["status"],
            "outside_range",
        )

    def test_range_summary_distinguishes_disabled_and_unusable_humidex(self) -> None:
        base = {
            "temperature": _metric(22, condition="comfortable"),
            "humidity": _metric(None, availability="not_monitored"),
        }
        disabled = {
            **base,
            "derived_metrics": {
                "humidex": _metric(None, availability="not_monitored")
            },
        }
        unusable = {
            **base,
            "derived_metrics": {"humidex": _metric(None, availability="stale")},
        }

        disabled_summary = build_comfort_range_summary(disabled)
        unusable_summary = build_comfort_range_summary(unusable)
        self.assertEqual(disabled_summary["status"], "within_range")
        self.assertEqual(disabled_summary["thermal_relation"], "not_evaluated")
        self.assertEqual(unusable_summary["status"], "unavailable")
        self.assertEqual(unusable_summary["thermal_relation"], "unavailable")

    def test_range_summary_rejects_non_finite_and_boolean_readings(self) -> None:
        for value in (True, float("nan"), float("inf"), float("-inf")):
            with self.subTest(value=value):
                assessment = {
                    "temperature": _metric(value, condition="comfortable"),
                    "derived_metrics": {
                        "humidex": {
                            **_metric(22),
                            "temperature_range_position": "within",
                        }
                    },
                }
                self.assertEqual(
                    build_comfort_range_summary(assessment)["status"],
                    "unavailable",
                )

    def test_range_summary_does_not_ignore_unusable_monitored_humidity(self) -> None:
        for availability, value in (
            ("missing", None),
            ("stale", 50),
            ("invalid", None),
            ("current", True),
            ("current", float("nan")),
        ):
            with self.subTest(availability=availability, value=value):
                summary = build_comfort_range_summary(
                    {
                        "temperature": _metric(22, condition="comfortable"),
                        "humidity": _metric(
                            value,
                            condition=(
                                "comfortable" if availability == "current" else None
                            ),
                            availability=availability,
                        ),
                        "derived_metrics": {
                            "humidex": _metric(None, availability="not_monitored")
                        },
                    }
                )
                self.assertEqual(summary["status"], "unavailable")
                self.assertEqual(summary["thermal_relation"], "not_evaluated")

        disabled = build_comfort_range_summary(
            {
                "temperature": _metric(22, condition="comfortable"),
                "humidity": _metric(None, availability="not_monitored"),
                "derived_metrics": {
                    "humidex": _metric(None, availability="not_monitored")
                },
            }
        )
        self.assertEqual(disabled["status"], "within_range")

    def test_unusable_metrics_do_not_generate_context(self) -> None:
        assessment = {
            "condition": "no_readings",
            "co2": _metric(1500, condition="poor", availability="stale"),
            "derived_metrics": {
                "humidex": _metric(None, availability="missing"),
                "dew_point": _metric(None, availability="invalid"),
                "absolute_humidity": _metric(12, availability="stale"),
            },
        }

        self.assertEqual(
            build_comfort_insights(assessment, temperature_unit="°C"), []
        )

    def test_no_readings_and_each_unusable_state_have_stable_empty_insights(self) -> None:
        """Unavailable inputs never produce speculative insight cards."""
        for availability in ("not_monitored", "missing", "stale", "invalid"):
            with self.subTest(availability=availability):
                assessment = {
                    "condition": "no_readings",
                    "co2": _metric(None, availability=availability),
                    "derived_metrics": {
                        metric: _metric(None, availability=availability)
                        for metric in ("humidex", "dew_point", "absolute_humidity")
                    },
                }
                self.assertEqual(
                    build_comfort_insights(assessment, temperature_unit="°C"), []
                )

    def test_dew_point_and_absolute_humidity_do_not_create_permanent_insights(self) -> None:
        insights = build_comfort_insights(
            {
                "condition": "temperature_comfortable",
                "temperature": _metric(22, condition="comfortable"),
                "derived_metrics": {
                    "dew_point": _metric(10),
                    "absolute_humidity": _metric(10),
                },
            },
            temperature_unit="°C",
        )

        self.assertEqual(insights, [])

    def _comparison(
        self,
        indoor_temperature,
        indoor_humidity,
        outdoor_temperature,
        outdoor_humidity,
        *,
        unit="°C",
        temperature_threshold=None,
        humidity_threshold=5.0,
        absolute_humidity_threshold=1.0,
        humidity_min=40,
        humidity_max=60,
    ):
        def absolute(temperature, humidity):
            if humidity is None:
                return _metric(None, availability="not_monitored")
            value = absolute_humidity_g_m3(temperature, humidity)
            return _metric(value)

        return build_outdoor_comparison(
            indoor_temperature=_metric(indoor_temperature),
            indoor_humidity=(
                _metric(indoor_humidity)
                if indoor_humidity is not None
                else _metric(None, availability="not_monitored")
            ),
            indoor_absolute_humidity=absolute(
                (indoor_temperature - 32) * 5 / 9 if unit == "°F" else indoor_temperature,
                indoor_humidity,
            ),
            outdoor_temperature=_metric(outdoor_temperature),
            outdoor_humidity=(
                _metric(outdoor_humidity)
                if outdoor_humidity is not None
                else _metric(None, availability="not_monitored")
            ),
            outdoor_absolute_humidity=absolute(
                (outdoor_temperature - 32) * 5 / 9 if unit == "°F" else outdoor_temperature,
                outdoor_humidity,
            ),
            temperature_min=68 if unit == "°F" else 20,
            temperature_max=75.2 if unit == "°F" else 24,
            humidity_min=humidity_min,
            humidity_max=humidity_max,
            temperature_unit=unit,
            temperature_threshold=(
                temperature_threshold
                if temperature_threshold is not None
                else 1.8 if unit == "°F" else 1.0
            ),
            humidity_threshold=humidity_threshold,
            absolute_humidity_threshold=absolute_humidity_threshold,
        )

    def test_outdoor_comparison_finds_combined_cooling_and_drying(self) -> None:
        comparison = self._comparison(28, 70, 20, 80)

        self.assertEqual(comparison["temperature"]["potential"], "cooling")
        self.assertEqual(comparison["humidity"]["potential"], "drying")
        self.assertEqual(comparison["temperature"]["blocked_by"], [])
        assessment = {
            "co2": _metric(None, availability="not_monitored"),
            "derived_metrics": {},
            "outdoor": {"comparison": comparison},
        }
        self.assertEqual(
            [item["code"] for item in build_comfort_insights(
                assessment, temperature_unit="°C"
            )],
            ["ventilation_may_help_cool", "ventilation_may_help_reduce_humidity"],
        )

    def test_known_humidity_conflict_becomes_tradeoff(self) -> None:
        comparison = self._comparison(28, 70, 25, 95)

        self.assertEqual(comparison["temperature"]["potential"], "cooling")
        self.assertEqual(comparison["temperature"]["blocked_by"], ["humidity"])
        assessment = {
            "co2": _metric(None, availability="not_monitored"),
            "derived_metrics": {},
            "outdoor": {"comparison": comparison},
        }
        self.assertEqual(
            [item["code"] for item in build_comfort_insights(
                assessment, temperature_unit="°C"
            )],
            ["ventilation_has_tradeoff"],
        )

    def test_known_temperature_conflict_becomes_tradeoff(self) -> None:
        comparison = self._comparison(22, 70, 10, 90)

        self.assertEqual(comparison["humidity"]["potential"], "drying")
        self.assertEqual(comparison["humidity"]["blocked_by"], ["temperature"])
        assessment = {
            "co2": _metric(None, availability="not_monitored"),
            "derived_metrics": {},
            "outdoor": {"comparison": comparison},
        }
        self.assertEqual(
            [item["code"] for item in build_comfort_insights(
                assessment, temperature_unit="°C"
            )],
            ["ventilation_has_tradeoff"],
        )

    def test_outdoor_comparison_finds_warming_and_humidifying(self) -> None:
        comparison = self._comparison(18, 30, 22, 35)

        self.assertEqual(comparison["temperature"]["potential"], "warming")
        self.assertEqual(comparison["humidity"]["potential"], "humidifying")
        self.assertEqual(comparison["humidity"]["blocked_by"], [])

    def test_missing_outdoor_humidity_keeps_thermal_scope(self) -> None:
        comparison = self._comparison(28, 70, 20, None)

        self.assertEqual(comparison["temperature"]["potential"], "cooling")
        self.assertEqual(comparison["temperature"]["blocked_by"], [])
        self.assertEqual(comparison["humidity"]["availability"], "not_monitored")

    def test_fahrenheit_uses_delta_conversion_not_absolute_offset(self) -> None:
        comparison = self._comparison(82.4, 70, 68, 40, unit="°F")

        self.assertEqual(comparison["temperature"]["delta"], -14.4)
        self.assertEqual(comparison["temperature"]["potential"], "cooling")

    def test_custom_thresholds_gate_ventilation_opportunities(self) -> None:
        comparison = self._comparison(
            28,
            70,
            20,
            80,
            temperature_threshold=10,
            humidity_threshold=50,
            absolute_humidity_threshold=10,
        )

        self.assertIsNone(comparison["temperature"]["potential"])
        self.assertIsNone(comparison["humidity"]["potential"])

    def test_outdoor_guidance_uses_effective_temperature_aware_humidity_range(self) -> None:
        comparison = self._comparison(
            24,
            56,
            18,
            55,
            humidity_min=34,
            humidity_max=50,
        )

        self.assertEqual(comparison["humidity"]["potential"], "drying")

    def test_outdoor_guidance_skips_humidity_potential_without_effective_range(self) -> None:
        comparison = self._comparison(
            24,
            70,
            18,
            55,
            humidity_min=None,
            humidity_max=None,
        )

        self.assertIsNone(comparison["humidity"]["potential"])

    def _ventilation_assessment(
        self,
        *,
        condition="hot",
        indoor_humidity=70,
        outdoor_temperature=22,
        outdoor_humidity=50,
        temperature_potential="cooling",
        humidity_potential=None,
        blocked_by=None,
        outdoor_humidity_availability="current",
    ):
        return {
            "enabled": True,
            "condition": condition,
            "temperature": _metric(28, condition="hot"),
            "humidity": (
                _metric(indoor_humidity, condition="humid")
                if indoor_humidity is not None
                else _metric(None, availability="not_monitored")
            ),
            "outdoor": {
                "enabled": True,
                "temperature": _metric(outdoor_temperature),
                "humidity": _metric(
                    outdoor_humidity,
                    availability=outdoor_humidity_availability,
                ),
                "comparison": {
                    "temperature": {
                        "potential": temperature_potential,
                        "blocked_by": blocked_by or [],
                    },
                    "humidity": {
                        "potential": humidity_potential,
                        "blocked_by": [],
                    },
                },
            },
        }

    @staticmethod
    def _outdoor_zone(*, humidity_min=40, humidity_max=60):
        return {
            "temperature_min": 20,
            "temperature_max": 24,
            "effective_humidity_range": {
                "temperature": 22,
                "minimum": humidity_min,
                "maximum": humidity_max,
            },
        }

    def test_ventilation_reports_strict_combined_comfort_possible(self) -> None:
        result = build_ventilation_opportunity(
            self._ventilation_assessment(humidity_potential="drying"),
            humidity_monitored=True,
            outdoor_humidity_configured=True,
            outdoor_comfort_zone=self._outdoor_zone(),
        )

        self.assertEqual(result["state"], "comfort_possible")
        self.assertEqual(result["evaluation_scope"], "temperature_and_humidity")
        self.assertEqual(result["potential_effects"], ["cooling", "drying"])

    def test_ventilation_without_optional_outdoor_humidity_stays_cautious(self) -> None:
        assessment = self._ventilation_assessment(
            outdoor_humidity=None,
            outdoor_humidity_availability="not_monitored",
        )
        result = build_ventilation_opportunity(
            assessment,
            humidity_monitored=True,
            outdoor_humidity_configured=False,
            outdoor_comfort_zone=self._outdoor_zone(),
        )

        self.assertEqual(result["state"], "may_help")
        self.assertEqual(result["evaluation_scope"], "temperature_only")
        self.assertEqual(result["reason"], "outdoor_humidity_not_configured")

    def test_ventilation_temperature_only_can_reach_comfort_when_humidity_disabled(self) -> None:
        for availability in ("stale", "missing"):
            with self.subTest(availability=availability):
                result = build_ventilation_opportunity(
                    self._ventilation_assessment(
                        indoor_humidity=None,
                        outdoor_humidity=None,
                        outdoor_humidity_availability=availability,
                    ),
                    humidity_monitored=False,
                    outdoor_humidity_configured=True,
                    outdoor_comfort_zone=self._outdoor_zone(),
                )

                self.assertEqual(result["state"], "comfort_possible")
                self.assertEqual(result["evaluation_scope"], "temperature_only")

    def test_ventilation_reports_no_opportunity_without_useful_difference(self) -> None:
        result = build_ventilation_opportunity(
            self._ventilation_assessment(
                indoor_humidity=None,
                temperature_potential=None,
            ),
            humidity_monitored=False,
            outdoor_humidity_configured=False,
            outdoor_comfort_zone=self._outdoor_zone(),
        )

        self.assertEqual(
            result,
            {
                "state": "no_opportunity",
                "evaluation_scope": "temperature_only",
                "potential_effects": [],
                "blocked_by": [],
                "reason": "no_useful_difference",
            },
        )

    def test_ventilation_configured_missing_dependency_is_unavailable(self) -> None:
        result = build_ventilation_opportunity(
            self._ventilation_assessment(
                outdoor_humidity=None,
                outdoor_humidity_availability="stale",
            ),
            humidity_monitored=True,
            outdoor_humidity_configured=True,
            outdoor_comfort_zone=self._outdoor_zone(),
        )

        self.assertEqual(result["state"], "unavailable")
        self.assertEqual(result["reason"], "outdoor_humidity_unavailable")

    def test_ventilation_tradeoff_and_already_comfortable_precedence(self) -> None:
        tradeoff = build_ventilation_opportunity(
            self._ventilation_assessment(blocked_by=["humidity"]),
            humidity_monitored=True,
            outdoor_humidity_configured=True,
            outdoor_comfort_zone=self._outdoor_zone(),
        )
        comfortable = build_ventilation_opportunity(
            self._ventilation_assessment(condition="comfortable"),
            humidity_monitored=True,
            outdoor_humidity_configured=True,
            outdoor_comfort_zone=self._outdoor_zone(),
        )

        self.assertEqual(tradeoff["state"], "trade_off")
        self.assertEqual(tradeoff["blocked_by"], ["humidity"])
        self.assertEqual(comfortable["state"], "already_comfortable")


if __name__ == "__main__":
    unittest.main()
