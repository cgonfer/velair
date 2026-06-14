"""Storage model normalization tests."""

from __future__ import annotations

import unittest

from .helpers import (
    ACTION_SET_TEMPERATURE,
    ACTION_TURN_OFF,
    DEFAULT_SCHEDULE_TEMPLATES_VERSION,
    MODE_AUTO,
    empty_week_schedule,
    normalize_schedule_blocks,
    normalize_schedule_data,
)

class ScheduleBlockNormalizationTest(unittest.TestCase):
    """Verify storage-facing schedule block normalization."""

    def test_normalize_blocks_sorts_times_and_preserves_mode(self) -> None:
        blocks = normalize_schedule_blocks(
            [
                {
                    "start": "18:30",
                    "temperature": "19.5",
                    "hvac_mode": "heat",
                },
                {
                    "start": "6:05",
                    "temperature": 21,
                },
            ]
        )

        self.assertEqual(
            blocks,
            [
                {
                    "start": "06:05",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 21.0,
                },
                {
                    "start": "18:30",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 19.5,
                    "hvac_mode": "heat",
                },
            ],
        )

    def test_normalize_blocks_rejects_duplicate_start_times(self) -> None:
        with self.assertRaisesRegex(ValueError, "Duplicate schedule start time"):
            normalize_schedule_blocks(
                [
                    {
                        "start": "08:00",
                        "temperature": 20,
                    },
                    {
                        "start": "8:00",
                        "temperature": 21,
                    },
                ]
            )

    def test_normalize_turn_off_block_does_not_require_temperature(self) -> None:
        self.assertEqual(
            normalize_schedule_blocks(
                [
                    {
                        "start": "23:00",
                        "action": ACTION_TURN_OFF,
                    }
                ]
            ),
            [
                {
                    "start": "23:00",
                    "action": ACTION_TURN_OFF,
                }
            ],
        )

    def test_normalize_schedule_data_adds_missing_zones_and_drops_unmanaged(self) -> None:
        data = normalize_schedule_data(
            {
                "global": {
                    "mode": "boost",
                    "paused_until": "2026-05-19T19:00:00+00:00",
                    "paused_started_at": "2026-05-19T18:00:00+00:00",
                },
                "zones": {
                    "climate.unmanaged": {
                        "enabled": True,
                        "schedule": {},
                    },
                    "climate.salon": {
                        "enabled": False,
                        "schedule": {
                            "tuesday": [
                                {
                                    "start": "18:00",
                                    "temperature": 20,
                                }
                            ],
                        },
                    },
                },
            },
            ["climate.salon", "climate.bedroom"],
        )

        self.assertEqual(set(data["zones"]), {"climate.salon", "climate.bedroom"})
        self.assertEqual(
            data["settings"],
            {
                "first_weekday": "monday",
                "zone_order": [],
                "min_temperature": 5.0,
                "max_temperature": 35.0,
            },
        )
        self.assertEqual(data["global_"]["mode"], MODE_AUTO)
        self.assertEqual(
            data["global_"]["paused_started_at"],
            "2026-05-19T18:00:00+00:00",
        )
        self.assertFalse(data["zones"]["climate.salon"]["enabled"])
        self.assertTrue(data["zones"]["climate.bedroom"]["enabled"])
        self.assertEqual(
            data["zones"]["climate.salon"]["schedule"]["tuesday"],
            [
                {
                    "start": "18:00",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 20.0,
                }
            ],
        )

    def test_normalize_schedule_data_preserves_panel_settings(self) -> None:
        data = normalize_schedule_data(
            {
                "settings": {
                    "first_weekday": "sunday",
                    "zone_order": ["climate.bedroom", "climate.unmanaged", "climate.salon"],
                    "min_temperature": 12,
                    "max_temperature": 28.5,
                },
            },
            ["climate.salon", "climate.bedroom"],
        )

        self.assertEqual(
            data["settings"],
            {
                "first_weekday": "sunday",
                "zone_order": ["climate.bedroom", "climate.salon"],
                "min_temperature": 12.0,
                "max_temperature": 28.5,
            },
        )

    def test_normalize_schedule_data_preserves_valid_custom_templates(self) -> None:
        data = normalize_schedule_data(
            {
                "templates": [
                    {
                        "key": "evening",
                        "name": "Evening",
                        "blocks": [
                            {
                                "start": "22:00",
                                "temperature": 18,
                            },
                            {
                                "start": "18:00",
                                "temperature": 21,
                                "hvac_mode": "heat",
                            },
                        ],
                    },
                    {
                        "key": "broken",
                        "name": "",
                        "blocks": [],
                    },
                ],
            },
            ["climate.salon"],
        )

        self.assertEqual(
            data["templates"],
            [
                {
                    "key": "home_day",
                    "name": "Home day",
                    "blocks": [
                        {
                            "start": "07:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 21.0,
                        },
                        {
                            "start": "23:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 17.0,
                        },
                    ],
                },
                {
                    "key": "away_workday",
                    "name": "Away workday",
                    "blocks": [
                        {
                            "start": "06:30",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 21.0,
                        },
                        {
                            "start": "08:30",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 18.0,
                        },
                        {
                            "start": "17:30",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 21.0,
                        },
                        {
                            "start": "23:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 17.0,
                        },
                    ],
                },
                {
                    "key": "all_day_comfort",
                    "name": "All-day comfort",
                    "blocks": [
                        {
                            "start": "00:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 21.0,
                        }
                    ],
                },
                {
                    "key": "night_setback",
                    "name": "Night setback",
                    "blocks": [
                        {
                            "start": "00:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 17.0,
                        },
                        {
                            "start": "06:30",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 21.0,
                        },
                        {
                            "start": "23:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 17.0,
                        },
                    ],
                },
                {
                    "key": "off_day",
                    "name": "Off all day",
                    "blocks": [
                        {
                            "start": "00:00",
                            "action": ACTION_TURN_OFF,
                        }
                    ],
                },
                {
                    "key": "clear_day",
                    "name": "Clear day",
                    "blocks": [],
                },
                {
                    "key": "evening",
                    "name": "Evening",
                    "blocks": [
                        {
                            "start": "18:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 21.0,
                            "hvac_mode": "heat",
                        },
                        {
                            "start": "22:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 18.0,
                        },
                    ],
                }
            ],
        )

    def test_normalize_schedule_data_does_not_reseed_deleted_templates(self) -> None:
        data = normalize_schedule_data(
            {
                "templates": [],
                "templates_seeded": True,
                "templates_seeded_version": DEFAULT_SCHEDULE_TEMPLATES_VERSION,
            },
            ["climate.salon"],
        )

        self.assertEqual(data["templates"], [])
        self.assertTrue(data["templates_seeded"])
        self.assertEqual(
            data["templates_seeded_version"],
            DEFAULT_SCHEDULE_TEMPLATES_VERSION,
        )

    def test_normalize_schedule_data_adds_new_default_templates_once(self) -> None:
        data = normalize_schedule_data(
            {
                "templates": [],
                "templates_seeded": True,
            },
            ["climate.salon"],
        )

        self.assertEqual(
            data["templates"],
            [
                {
                    "key": "clear_day",
                    "name": "Clear day",
                    "blocks": [],
                }
            ],
        )
        self.assertTrue(data["templates_seeded"])
        self.assertEqual(
            data["templates_seeded_version"],
            DEFAULT_SCHEDULE_TEMPLATES_VERSION,
        )

    def test_normalize_schedule_data_preserves_boost_previous_state(self) -> None:
        data = normalize_schedule_data(
            {
                "zones": {
                    "climate.salon": {
                        "enabled": True,
                        "schedule": empty_week_schedule(),
                        "override": {
                            "type": "boost",
                            "started_at": "2026-05-19T17:00:00+00:00",
                            "until": "2026-05-19T17:30:00+00:00",
                            "temperature": 23,
                            "hvac_mode": "heat",
                            "previous_state": {
                                "hvac_mode": "cool",
                                "temperature": "19",
                            },
                        },
                    }
                }
            },
            ["climate.salon"],
        )

        override = data["zones"]["climate.salon"]["override"]

        self.assertIsNotNone(override)
        self.assertEqual(
            override["previous_state"],
            {
                "hvac_mode": "cool",
                "temperature": 19.0,
            },
        )

    def test_normalize_schedule_data_preserves_zone_pause_override(self) -> None:
        data = normalize_schedule_data(
            {
                "zones": {
                    "climate.salon": {
                        "enabled": True,
                        "schedule": empty_week_schedule(),
                        "override": {
                            "type": "pause",
                            "started_at": "2026-05-19T17:00:00+00:00",
                            "until": "2026-05-19T18:00:00+00:00",
                            "action": ACTION_TURN_OFF,
                        },
                    }
                }
            },
            ["climate.salon"],
        )

        self.assertEqual(
            data["zones"]["climate.salon"]["override"],
            {
                "type": "pause",
                "started_at": "2026-05-19T17:00:00+00:00",
                "until": "2026-05-19T18:00:00+00:00",
                "action": ACTION_TURN_OFF,
            },
        )

