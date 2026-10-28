"""Group step validation matches published grids and existing fallback behavior."""

from copy import deepcopy
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock

from .helpers import FakeHass, normalize_schedule_data, VelairScheduler
from custom_components.velair.climate_manager import ClimateManager


class RoomGroupTemperatureStepsTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.ids = ["climate.a", "climate.b", "climate.c"]
        self.hass = FakeHass()
        self.hass.config.units = SimpleNamespace(temperature_unit="°C")
        for entity in self.ids:
            self.hass.states[entity] = SimpleNamespace(state="heat", attributes={
                "hvac_modes": ["off", "heat", "cool"], "supported_features": 1,
                "current_temperature": 19.0, "temperature": 20.0,
                "min_temp": 5.0, "max_temp": 35.0,
            })
        self.data = normalize_schedule_data(None, self.ids)
        for zone in self.data["zones"].values():
            zone["target_temp_step_override"] = .5
        self.save = AsyncMock()
        self.scheduler = VelairScheduler(self.hass, self.data, ClimateManager(self.hass), self.save)
        self.group = {"id": "group.room", "name": "Room", "members": self.ids,
                      "temperature_entity_id": self.ids[0], "delivery_mode": "all"}

    async def asyncTearDown(self):
        await self.scheduler.async_stop()

    async def test_one_published_step_and_two_manual_fallbacks_create_reload_and_deliver(self):
        self.hass.states["climate.b"].attributes["target_temp_step"] = .5
        self.assertEqual([self.scheduler.get_temperature_step(entity) for entity in self.ids], [.5, .5, .5])
        before = deepcopy(self.data)
        for source in self.ids:
            with self.subTest(source=source):
                self.scheduler.preview_room_group(self.group, 0, source)
                self.assertEqual(self.data, before)
        self.save.assert_not_awaited()
        await self.scheduler.async_set_room_group(self.group, 0, "climate.a")
        self.assertEqual(self.scheduler.get_temperature_step("group.room"), .5)
        reloaded = normalize_schedule_data(deepcopy(self.data), self.ids)
        self.assertEqual(reloaded["zones"]["group.room"]["target_temp_step_override"], .5)
        restored = VelairScheduler(self.hass, reloaded, ClimateManager(self.hass), AsyncMock())
        try:
            self.assertEqual(restored.get_temperature_step("group.room"), .5)
            restored.preview_room_group(self.group, reloaded["configuration_revision"])
        finally:
            await restored.async_stop()
        for mode, target in (("heat", 21.5), ("cool", 18.5)):
            with self.subTest(mode=mode):
                self.hass.services.calls.clear()
                await self.scheduler.async_set_temperature("group.room", target, hvac_mode=mode)
                calls = [call[2] for call in self.hass.services.calls if call[0] == "climate" and call[1] == "set_temperature"]
                self.assertEqual({call["entity_id"] for call in calls}, set(self.ids))
                self.assertTrue(all(call["temperature"] == target for call in calls))

    async def test_missing_step_at_any_member_position_is_not_a_conflict(self):
        for missing in self.ids:
            for entity in self.ids:
                self.hass.states[entity].attributes["target_temp_step"] = .5
            self.hass.states[missing].attributes.pop("target_temp_step")
            with self.subTest(missing=missing):
                self.scheduler.preview_room_group(self.group, 0, missing)
        self.save.assert_not_awaited()

    async def test_all_unreported_preserve_adopted_manual_and_last_known_fallbacks(self):
        for field in ("target_temp_step_override", "last_reported_target_temp_step"):
            self.data["zones"]["climate.a"][field] = .2
            with self.subTest(field=field):
                candidate = deepcopy(self.data)
                self.scheduler.preview_room_group(self.group, candidate.get("configuration_revision", 0), "climate.a")
                await self.scheduler.async_set_room_group(self.group, candidate.get("configuration_revision", 0), "climate.a")
                self.assertEqual(self.scheduler.get_temperature_step("group.room"), .2)
                await self.scheduler.async_remove_room_group("group.room", self.data["configuration_revision"])

    async def test_true_mismatch_lists_steps_entities_and_unit_before_save(self):
        self.hass.states["climate.a"].attributes["target_temp_step"] = .5
        self.hass.states["climate.c"].attributes["target_temp_step"] = .2
        for action in ("preview", "save"):
            with self.subTest(action=action), self.assertRaises(ValueError) as caught:
                if action == "preview":
                    self.scheduler.preview_room_group(self.group, 0, "climate.a")
                else:
                    await self.scheduler.async_set_room_group(self.group, 0, "climate.a")
            message = str(caught.exception)
            for fragment in ("climate.a: 0.5", "climate.b: not reported", "climate.c: 0.2", "°C"):
                self.assertIn(fragment, message)
        self.save.assert_not_awaited()
        self.assertEqual(self.data["room_groups"], {})

    async def test_missing_step_does_not_bypass_shared_minimum_grid_alignment(self):
        self.hass.states["climate.a"].attributes["target_temp_step"] = .5
        self.hass.states["climate.b"].attributes["min_temp"] = 5.25
        with self.assertRaisesRegex(ValueError, "climate.b: 5.25"):
            self.scheduler.preview_room_group(self.group, 0, "climate.a")
        self.save.assert_not_awaited()

    async def test_selected_recipient_does_not_compare_other_members_steps(self):
        self.hass.states["climate.a"].attributes["target_temp_step"] = .2
        self.hass.states["climate.c"].attributes["target_temp_step"] = .5
        selected = {**self.group, "delivery_mode": "selected", "delivery_entity_id": "climate.c"}
        self.scheduler.preview_room_group(selected, 0, "climate.a")
        await self.scheduler.async_set_room_group(selected, 0, "climate.a")
        self.assertEqual(self.scheduler.get_temperature_step("group.room"), .5)

    async def test_reported_steps_convert_to_common_unit_before_comparison(self):
        self.hass.states["climate.a"].attributes["target_temp_step"] = .5
        self.hass.states["climate.c"].attributes.update(target_temp_step=.9, unit_of_measurement="°F")
        self.scheduler.preview_room_group(self.group, 0, "climate.a")
        self.save.assert_not_awaited()
