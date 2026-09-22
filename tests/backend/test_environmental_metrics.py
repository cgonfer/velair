"""Tests for Velair's optional environmental calculations."""

from __future__ import annotations

import math
import unittest

from . import helpers as _helpers  # noqa: F401  # Install HA import stubs.
from custom_components.velair.environmental_metrics import (
    absolute_humidity_g_m3,
    dew_point_celsius,
    humidex_celsius,
    humidex_temperature_range_position,
    relative_humidity_from_absolute_humidity_g_m3,
)


class EnvironmentalMetricsTest(unittest.TestCase):
    """Verify authoritative calculations and invalid-input handling."""

    def test_reference_values_at_twenty_five_celsius_and_fifty_percent(self) -> None:
        self.assertAlmostEqual(dew_point_celsius(25, 50), 13.858, places=3)
        self.assertAlmostEqual(absolute_humidity_g_m3(25, 50), 11.490, places=3)
        self.assertAlmostEqual(humidex_celsius(25, 50), 28.288, places=3)

    def test_humidex_is_perceived_heat_not_the_air_temperature(self) -> None:
        result = humidex_celsius(30, 75)

        self.assertIsNotNone(result)
        self.assertGreater(result, 40)

    def test_absolute_humidity_inverse_recovers_relative_humidity(self) -> None:
        absolute = absolute_humidity_g_m3(25, 50)

        self.assertIsNotNone(absolute)
        self.assertAlmostEqual(
            relative_humidity_from_absolute_humidity_g_m3(25, absolute),
            50,
            places=2,
        )

    def test_absolute_humidity_inverse_rejects_supersaturated_projection(self) -> None:
        self.assertIsNone(
            relative_humidity_from_absolute_humidity_g_m3(20, 100)
        )

    def test_humidex_temperature_range_position_uses_inclusive_celsius_bounds(self) -> None:
        self.assertEqual(humidex_temperature_range_position(19.9, 20, 24), "below")
        self.assertEqual(humidex_temperature_range_position(20, 20, 24), "within")
        self.assertEqual(humidex_temperature_range_position(24, 20, 24), "within")
        self.assertEqual(humidex_temperature_range_position(24.1, 20, 24), "above")

    def test_humidex_temperature_range_position_tolerates_float_noise(self) -> None:
        self.assertEqual(
            humidex_temperature_range_position(20 - 0.0000005, 20, 24),
            "within",
        )
        self.assertEqual(
            humidex_temperature_range_position(24 + 0.0000005, 20, 24),
            "within",
        )

    def test_humidex_temperature_range_position_rejects_invalid_values(self) -> None:
        for values in (
            (math.nan, 20, 24),
            (22, math.inf, 24),
            (22, 20, math.inf),
            (22, 24, 20),
        ):
            with self.subTest(values=values):
                self.assertIsNone(humidex_temperature_range_position(*values))

    def test_invalid_inputs_are_not_calculated(self) -> None:
        for temperature, humidity in (
            (20, 0),
            (20, 101),
            (math.nan, 50),
            (20, math.inf),
        ):
            with self.subTest(temperature=temperature, humidity=humidity):
                self.assertIsNone(dew_point_celsius(temperature, humidity))
                self.assertIsNone(absolute_humidity_g_m3(temperature, humidity))
                self.assertIsNone(humidex_celsius(temperature, humidity))
