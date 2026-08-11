"""Native heat/cool temperature range model tests."""

from __future__ import annotations

import unittest

from . import helpers  # noqa: F401 - installs Home Assistant test stubs

from custom_components.velair.models import (
    WEEKDAYS,
    normalize_schedule_blocks,
    normalize_schedule_data,
    temperature_target_from_mapping,
    validate_climate_profiles,
)
from custom_components.velair.storage import convert_portable_temperature_data


class TemperatureTargetModelTest(unittest.TestCase):
    def test_normalizes_complete_range_without_scalar_target(self) -> None:
        blocks = normalize_schedule_blocks(
            [
                {
                    "start": "07:00",
                    "target_temp_low": 20,
                    "target_temp_high": 24,
                    "hvac_mode": "heat_cool",
                }
            ]
        )

        self.assertEqual(
            blocks[0],
            {
                "start": "07:00",
                "action": "set_temperature",
                "target_temp_low": 20.0,
                "target_temp_high": 24.0,
                "hvac_mode": "heat_cool",
            },
        )

    def test_rejects_scalar_mixed_with_range(self) -> None:
        with self.assertRaisesRegex(ValueError, "either temperature"):
            temperature_target_from_mapping(
                {
                    "temperature": 22,
                    "target_temp_low": 20,
                    "target_temp_high": 24,
                }
            )

    def test_rejects_incomplete_or_inverted_range(self) -> None:
        with self.assertRaisesRegex(ValueError, "provided together"):
            temperature_target_from_mapping({"target_temp_low": 20})
        with self.assertRaisesRegex(ValueError, "must not be greater"):
            temperature_target_from_mapping(
                {"target_temp_low": 25, "target_temp_high": 20}
            )

    def test_stored_schedule_keeps_range_blocks(self) -> None:
        data = normalize_schedule_data(
            {
                "zones": {
                    "climate.room": {
                        "schedule": {
                            "monday": [
                                {
                                    "start": "08:00",
                                    "target_temp_low": 19,
                                    "target_temp_high": 23,
                                    "hvac_mode": "heat_cool",
                                }
                            ]
                        }
                    }
                }
            },
            ["climate.room"],
        )

        block = data["zones"]["climate.room"]["schedule"]["monday"][0]
        self.assertEqual(block["target_temp_low"], 19)
        self.assertEqual(block["target_temp_high"], 23)
        self.assertNotIn("temperature", block)

    def test_strict_profile_validation_accepts_range_blocks(self) -> None:
        schedule = {weekday: [] for weekday in WEEKDAYS}
        schedule["monday"] = [
            {
                "start": "08:00",
                "target_temp_low": 20,
                "target_temp_high": 24,
                "hvac_mode": "heat_cool",
            }
        ]

        profiles = validate_climate_profiles(
            [
                {
                    "key": "home",
                    "name": "Home",
                    "icon": "",
                    "color": "#3949ab",
                    "description": "",
                    "zones": {
                        "climate.room": {
                            "behavior": "schedule",
                            "schedule": schedule,
                        }
                    },
                }
            ],
            ["climate.room"],
        )

        block = profiles[0]["zones"]["climate.room"]["schedule"]["monday"][0]
        self.assertEqual(block["target_temp_low"], 20)
        self.assertEqual(block["target_temp_high"], 24)

    def test_portable_conversion_converts_both_range_boundaries(self) -> None:
        converted = convert_portable_temperature_data(
            {
                "zones": {
                    "climate.room": {
                        "schedule": {
                            "monday": [
                                {
                                    "start": "08:00",
                                    "target_temp_low": 20,
                                    "target_temp_high": 24,
                                }
                            ]
                        }
                    }
                }
            },
            "°C",
            "°F",
            None,
        )

        block = converted["zones"]["climate.room"]["schedule"]["monday"][0]
        self.assertEqual(block["target_temp_low"], 68)
        self.assertEqual(block["target_temp_high"], 75.2)


if __name__ == "__main__":
    unittest.main()
