"""Zone runtime context exposed through the override sensor attributes."""

from __future__ import annotations

from types import SimpleNamespace
import unittest

from .helpers import (
    NOW,
    FakeClimateManager,
    FakeHass,
    VelairScheduler,
    empty_week_schedule,
    normalize_schedule_data,
)
from .test_sensor_entities import sensor_module


class ZoneContextTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.entity_id = "climate.salon"
        self.hass = FakeHass()
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="cool",
            attributes={"temperature": 24, "current_temperature": 26},
        )
        self.data = normalize_schedule_data(
            {
                "zones": {
                    self.entity_id: {
                        "enabled": True,
                        "schedule": empty_week_schedule(),
                    }
                }
            },
            [self.entity_id],
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "00:00",
                "action": "set_temperature",
                "temperature": 24.0,
                "hvac_mode": "cool",
            }
        ]
        self.scheduler = VelairScheduler(
            self.hass, self.data, FakeClimateManager(), self._save
        )
        self.scheduler._climate_manager.current_hvac_modes[self.entity_id] = "cool"

    async def _save(self) -> None:
        return None

    def test_context_before_any_delivery_is_compact(self) -> None:
        context = self.scheduler.get_zone_context(self.entity_id)
        self.assertEqual("default", context["schedule_source"])
        self.assertEqual("automatic", context["control_mode"])
        self.assertIn(context["runtime_state"], ("scheduled", "idle"))
        self.assertNotIn("last_applied_source", context)
        self.assertNotIn("manual_source", context)
        self.assertEqual({}, self.scheduler.get_zone_context("climate.unknown"))

    async def test_last_applied_target_is_recorded_with_its_source(self) -> None:
        await self.scheduler.async_apply_current_schedule(self.entity_id)
        context = self.scheduler.get_zone_context(self.entity_id)
        self.assertEqual("current_schedule", context["last_applied_source"])
        self.assertEqual(24.0, context["last_applied_temperature"])
        self.assertEqual("set_temperature", context["last_applied_action"])
        self.assertEqual("cool", context["last_applied_hvac_mode"])
        self.assertTrue(str(context["last_applied_at"]).startswith(str(NOW.year)))

    async def test_manual_adjustment_context_is_exposed(self) -> None:
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "until_resumed"}
        )
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 24.0},
            current={"temperature": 20.0},
        )
        context = self.scheduler.get_zone_context(self.entity_id)
        self.assertEqual("manual", context["control_mode"])
        self.assertEqual("external_change", context["manual_source"])
        self.assertEqual("until_resumed", context["manual_policy"])
        self.assertEqual(["temperature"], context["manual_changed_fields"])
        self.assertIn("manual_since", context)
        self.assertNotIn("manual_until", context)

        await self.scheduler.async_resume_automatic_control(self.entity_id)
        context = self.scheduler.get_zone_context(self.entity_id)
        self.assertEqual("automatic", context["control_mode"])
        self.assertNotIn("manual_source", context)

    def test_profile_context_is_exposed(self) -> None:
        data = normalize_schedule_data(
            {
                "zones": {
                    self.entity_id: {
                        "enabled": True,
                        "schedule": empty_week_schedule(),
                    }
                },
                "profiles": [
                    {
                        "key": "away",
                        "name": "Away",
                        "zones": {
                            self.entity_id: {
                                "behavior": "schedule",
                                "schedule": empty_week_schedule(),
                            }
                        },
                    }
                ],
                "global_": {"mode": "auto", "active_profile_ids": ["away"]},
            },
            [self.entity_id],
        )
        scheduler = VelairScheduler(self.hass, data, FakeClimateManager(), self._save)
        context = scheduler.get_zone_context(self.entity_id)
        self.assertEqual("away", context["effective_profile_id"])
        self.assertEqual("Away", context["effective_profile_name"])
        self.assertEqual("profile", context["schedule_source"])

    def test_override_sensor_merges_context_attributes(self) -> None:
        scheduler = SimpleNamespace(
            get_zone_override_status=lambda entity_id: {"state": "none"},
            get_zone_context=lambda entity_id: {
                "runtime_state": "scheduled",
                "control_mode": "automatic",
                "schedule_source": "default",
                "last_applied_source": "scheduled_event",
                "last_applied_temperature": 24.0,
                "ignored_key": "dropped",
            },
        )
        entry = SimpleNamespace(
            runtime_data=SimpleNamespace(
                scheduler=scheduler,
                temperature_unit="°C",
                configured_entities=["climate.living_room"],
            ),
            entry_id="entry",
            options={},
            data={},
        )
        sensor = sensor_module.ZoneOverrideStateSensor(entry, "climate.living_room")
        attributes = sensor.extra_state_attributes
        self.assertEqual("scheduled", attributes["runtime_state"])
        self.assertEqual("automatic", attributes["control_mode"])
        self.assertEqual(24.0, attributes["last_applied_temperature"])
        self.assertNotIn("ignored_key", attributes)


if __name__ == "__main__":
    unittest.main()
