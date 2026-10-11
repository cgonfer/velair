"""Schedule template persistence tests."""

from __future__ import annotations

import unittest

from .helpers import (
    ACTION_SET_TEMPERATURE,
    FakeClimateManager,
    FakeHass,
    VelairScheduler,
    _scheduler_data_for_zones,
)

class VelairSchedulerTemplateTest(unittest.IsolatedAsyncioTestCase):
    """Verify custom template persistence operations."""

    def setUp(self) -> None:
        self.data = _scheduler_data_for_zones(["climate.salon"])
        self.save_count = 0
        self.climate = FakeClimateManager()
        self.scheduler = VelairScheduler(
            FakeHass(),
            self.data,
            self.climate,
            self._async_save,
        )

    async def _async_save(self) -> None:
        self.save_count += 1

    async def test_set_schedule_template_creates_and_updates_template(self) -> None:
        blocks = [
            {
                "start": "08:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
            }
        ]

        key = await self.scheduler.async_set_schedule_template("Morning", blocks)
        await self.scheduler.async_set_schedule_template("Warm morning", blocks, key)

        self.assertEqual(len(self.data["templates"]), 1)
        self.assertEqual(self.data["templates"][0]["key"], key)
        self.assertEqual(self.data["templates"][0]["name"], "Warm morning")
        self.assertEqual(self.save_count, 2)

    async def test_set_schedule_template_allows_empty_template_drafts(self) -> None:
        key = await self.scheduler.async_set_schedule_template("New template", [])

        self.assertEqual(self.data["templates"], [
            {
                "key": key,
                "name": "New template",
                "blocks": [],
            }
        ])

    async def test_editing_templates_preserves_positions_and_new_templates_append(self) -> None:
        keys = [await self.scheduler.async_set_schedule_template(name, [])
                for name in ("First", "Middle", "Last")]
        for index, key in enumerate(keys):
            with self.subTest(position=index):
                await self.scheduler.async_set_schedule_template(f"Edited {index}", [], key)
                self.assertEqual([item["key"] for item in self.data["templates"]], keys)
                self.assertEqual(self.data["templates"][index]["name"], f"Edited {index}")
        added = await self.scheduler.async_set_schedule_template("New", [])
        self.assertEqual([item["key"] for item in self.data["templates"]], keys + [added])

    async def test_set_schedule_template_is_not_limited_to_one_climate_range(self) -> None:
        self.climate.limits["climate.salon"] = (18.0, 22.0)

        key = await self.scheduler.async_set_schedule_template(
            "Cross climate template",
            [
                {
                    "start": "08:00",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 5,
                }
            ],
        )

        self.assertEqual(self.data["templates"][0]["key"], key)
        self.assertEqual(self.data["templates"][0]["blocks"][0]["temperature"], 5)
        self.assertEqual(self.save_count, 1)

    async def test_set_schedule_template_preserves_optional_climate_settings(self) -> None:
        key = await self.scheduler.async_set_schedule_template(
            "Night AC",
            [
                {
                    "start": "22:00",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 24,
                    "hvac_mode": "cool",
                    "fan_mode": "quiet",
                    "preset_mode": "eco",
                    "swing_mode": "vertical",
                    "swing_horizontal_mode": "left",
                    "humidity": 45,
                }
            ],
        )

        self.assertEqual(
            [{**template, "blocks": [{field: value for field, value in block.items() if field != "slot_id"} for block in template["blocks"]]} for template in self.data["templates"]],
            [
                {
                    "key": key,
                    "name": "Night AC",
                    "blocks": [
                        {
                            "start": "22:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 24,
                            "hvac_mode": "cool",
                            "fan_mode": "quiet",
                            "preset_mode": "eco",
                            "swing_mode": "vertical",
                            "swing_horizontal_mode": "left",
                            "humidity": 45,
                        }
                    ],
                }
            ],
        )
        self.assertEqual(self.save_count, 1)

    async def test_delete_schedule_template_removes_template(self) -> None:
        self.data["templates"] = [
            {
                "key": "evening",
                "name": "Evening",
                "blocks": [],
            }
        ]

        await self.scheduler.async_delete_schedule_template("evening")

        self.assertEqual(self.data["templates"], [])
        self.assertEqual(self.save_count, 1)

