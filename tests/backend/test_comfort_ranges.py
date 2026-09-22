"""Tests for backend-owned Comfort range geometry."""

from __future__ import annotations

import unittest

from . import helpers as _helpers  # noqa: F401
from custom_components.velair.comfort_ranges import build_comfort_zone
from custom_components.velair.models import normalize_comfort_data
from custom_components.velair.temperature import FAHRENHEIT


class ComfortRangesTest(unittest.TestCase):
    """Verify simple and temperature-aware effective ranges."""

    def test_simple_model_keeps_rectangular_range(self) -> None:
        zone = build_comfort_zone(
            normalize_comfort_data(
                {
                    "temperature_min": 20,
                    "temperature_max": 24,
                    "humidity_min": 40,
                    "humidity_max": 60,
                }
            ),
            22,
        )

        self.assertEqual(zone["model"], "simple")
        self.assertEqual(
            zone["effective_humidity_range"],
            {"temperature": 22.0, "minimum": 40.0, "maximum": 60.0},
        )
        self.assertEqual(zone["points"][0]["humidity_min"], 40.0)
        self.assertEqual(zone["points"][1]["humidity_max"], 60.0)

    def test_temperature_aware_model_interpolates_linearly(self) -> None:
        zone = build_comfort_zone(
            normalize_comfort_data(
                {
                    "comfort_model": "temperature_aware",
                    "temperature_min": 20,
                    "temperature_max": 24,
                    "temperature_aware": {
                        "at_temperature_min": {"minimum": 40, "maximum": 60},
                        "at_temperature_max": {"minimum": 34, "maximum": 50},
                    },
                }
            ),
            22,
        )

        self.assertEqual(
            zone["effective_humidity_range"],
            {"temperature": 22.0, "minimum": 37.0, "maximum": 55.0},
        )

    def test_guided_model_uses_midpoint_as_reference_and_samples_curve(self) -> None:
        zone = build_comfort_zone(
            normalize_comfort_data(
                {
                    "comfort_model": "guided",
                    "temperature_min": 20,
                    "temperature_max": 24,
                    "humidity_min": 40,
                    "humidity_max": 60,
                }
            ),
            22,
        )

        self.assertEqual(zone["model"], "guided")
        self.assertEqual(len(zone["points"]), 17)
        self.assertEqual(
            zone["reference"],
            {"temperature": 22.0, "humidity_min": 40.0, "humidity_max": 60.0},
        )
        self.assertEqual(
            zone["effective_humidity_range"],
            {"temperature": 22.0, "minimum": 40.0, "maximum": 60.0},
        )
        self.assertGreater(
            zone["points"][0]["humidity_min"],
            zone["points"][-1]["humidity_min"],
        )

    def test_guided_model_is_equivalent_in_fahrenheit(self) -> None:
        celsius = build_comfort_zone(
            normalize_comfort_data(
                {
                    "comfort_model": "guided",
                    "temperature_min": 20,
                    "temperature_max": 24,
                    "humidity_min": 40,
                    "humidity_max": 60,
                }
            ),
            23,
        )
        fahrenheit = build_comfort_zone(
            normalize_comfort_data(
                {
                    "comfort_model": "guided",
                    "temperature_min": 68,
                    "temperature_max": 75.2,
                    "humidity_min": 40,
                    "humidity_max": 60,
                }
            ),
            73.4,
            FAHRENHEIT,
        )

        self.assertEqual(
            fahrenheit["effective_humidity_range"]["minimum"],
            celsius["effective_humidity_range"]["minimum"],
        )
        self.assertEqual(
            fahrenheit["effective_humidity_range"]["maximum"],
            celsius["effective_humidity_range"]["maximum"],
        )
        self.assertEqual(
            [point["humidity_min"] for point in fahrenheit["points"]],
            [point["humidity_min"] for point in celsius["points"]],
        )

    def test_guided_model_clamps_extreme_humidity_without_inverting_band(self) -> None:
        zone = build_comfort_zone(
            normalize_comfort_data(
                {
                    "comfort_model": "guided",
                    "temperature_min": 0,
                    "temperature_max": 40,
                    "humidity_min": 80,
                    "humidity_max": 100,
                }
            ),
            0,
        )

        self.assertEqual(zone["points"][0]["humidity_min"], 100.0)
        self.assertEqual(zone["points"][0]["humidity_max"], 100.0)
        self.assertTrue(
            all(
                point["humidity_min"] <= point["humidity_max"]
                for point in zone["points"]
            )
        )

    def test_guided_model_has_no_effective_range_for_invalid_temperature(self) -> None:
        config = normalize_comfort_data({"comfort_model": "guided"})

        self.assertIsNone(
            build_comfort_zone(config, None)["effective_humidity_range"]
        )
        self.assertIsNone(
            build_comfort_zone(config, float("inf"))["effective_humidity_range"]
        )

    def test_temperature_aware_model_clamps_without_extrapolation(self) -> None:
        config = normalize_comfort_data(
            {
                "comfort_model": "temperature_aware",
                "temperature_min": 20,
                "temperature_max": 24,
                "temperature_aware": {
                    "at_temperature_min": {"minimum": 40, "maximum": 60},
                    "at_temperature_max": {"minimum": 34, "maximum": 50},
                },
            }
        )

        self.assertEqual(
            build_comfort_zone(config, 15)["effective_humidity_range"]["maximum"],
            60.0,
        )
        self.assertEqual(
            build_comfort_zone(config, 30)["effective_humidity_range"]["minimum"],
            34.0,
        )

    def test_missing_temperature_has_no_effective_humidity_range(self) -> None:
        config = normalize_comfort_data({"comfort_model": "temperature_aware"})

        self.assertIsNone(
            build_comfort_zone(config, None)["effective_humidity_range"]
        )
