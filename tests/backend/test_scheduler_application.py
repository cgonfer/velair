"""Scheduler application, override, service, and portability behavior tests."""

from __future__ import annotations

from types import SimpleNamespace
import unittest

from .helpers import (
    ACTION_SET_TEMPERATURE,
    ACTION_TURN_OFF,
    DEFAULT_SCHEDULE_TEMPLATES_VERSION,
    EVENT_TYPE_BOOST_ENDED,
    EVENT_TYPE_BOOST_STARTED,
    EVENT_TYPE_CLIMATE_TARGET_APPLIED,
    EVENT_TYPE_SCHEDULER_MODE_CHANGED,
    EVENT_TYPE_ZONE_PAUSED,
    EVENT_TYPE_ZONE_RESUMED,
    EVENT_VELAIR,
    FakeClimateManager,
    FakeHass,
    MODE_AUTO,
    MODE_PAUSED,
    NOW,
    VelairScheduler,
    ZONE_PAUSE_ACTION_TURN_OFF,
    empty_week_schedule,
    normalize_schedule_data,
    normalize_panel_settings,
)

class VelairSchedulerSavedScheduleTest(unittest.IsolatedAsyncioTestCase):
    """Verify when saved schedules should be applied immediately."""

    def setUp(self) -> None:
        self.entity_id = "climate.salon"
        self.hass = FakeHass()
        self.climate = FakeClimateManager()
        self.save_count = 0
        self.data = self._make_data()
        self.scheduler = VelairScheduler(
            self.hass,
            self.data,
            self.climate,
            self._async_save,
        )

    async def _async_save(self) -> None:
        self.save_count += 1

    def _make_data(self, mode: str = MODE_AUTO):
        return {
            "version": 1,
            "global_": {
                "mode": mode,
                "vacation": None,
                "paused_until": None,
                "paused_started_at": None,
            },
            "zones": {
                self.entity_id: {
                    "enabled": True,
                    "schedule": empty_week_schedule(),
                    "override": None,
                }
            },
            "settings": normalize_panel_settings(None, [self.entity_id]),
            "templates": [],
            "templates_seeded": True,
        }

    async def test_saving_today_applies_current_block(self) -> None:
        await self.scheduler.async_set_daily_schedule(
            self.entity_id,
            "tuesday",
            [
                {
                    "start": "17:00",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 21,
                    "hvac_mode": "heat",
                }
            ],
        )

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 21, True, "heat")],
        )

    async def test_schedule_application_fires_automation_event(self) -> None:
        await self.scheduler.async_set_daily_schedule(
            self.entity_id,
            "tuesday",
            [
                {
                    "start": "17:00",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 21,
                    "hvac_mode": "heat",
                }
            ],
        )

        self.assertIn(
            (
                EVENT_VELAIR,
                {
                    "domain": "velair",
                    "event": EVENT_TYPE_CLIMATE_TARGET_APPLIED,
                    "entity_id": self.entity_id,
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 21.0,
                    "hvac_mode": "heat",
                    "weekday": "tuesday",
                    "start": "17:00",
                    "source": "schedule_saved",
                },
            ),
            self.hass.bus.events,
        )

    async def test_schedule_application_writes_logbook_when_available(self) -> None:
        self.hass.services.logbook_enabled = True
        self.hass.states[self.entity_id] = SimpleNamespace(
            attributes={"friendly_name": "Salon"}
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler.async_apply_current_schedule()

        self.assertEqual(
            self.hass.services.calls,
            [
                (
                    "logbook",
                    "log",
                    {
                        "name": "Velair",
                        "message": "Adjusted Salon to 21 °C (Heat)",
                        "entity_id": self.entity_id,
                    },
                    False,
                )
            ],
        )

    async def test_pause_writes_spanish_logbook_entry_when_available(self) -> None:
        self.hass.config.language = "es"
        self.hass.services.logbook_enabled = True

        await self.scheduler.async_set_mode(
            MODE_PAUSED,
            paused_until="2026-05-19T19:00:00+00:00",
        )

        self.assertEqual(
            self.hass.services.calls[-1],
            (
                "logbook",
                "log",
                {
                    "name": "Velair",
                    "message": "Planificador pausado hasta 2026-05-19T19:00:00+00:00",
                },
                False,
            ),
        )

    async def test_scheduler_mode_change_fires_automation_event(self) -> None:
        await self.scheduler.async_set_mode(
            MODE_PAUSED,
            paused_until="2026-05-19T19:00:00+00:00",
        )

        self.assertIn(
            (
                EVENT_VELAIR,
                {
                    "domain": "velair",
                    "event": EVENT_TYPE_SCHEDULER_MODE_CHANGED,
                    "mode": MODE_PAUSED,
                    "previous_mode": MODE_AUTO,
                    "paused_until": "2026-05-19T19:00:00+00:00",
                    "paused_started_at": NOW.isoformat(),
                },
            ),
            self.hass.bus.events,
        )

    async def test_boost_stores_start_time_for_timeline_visibility(self) -> None:
        self.climate.snapshots[self.entity_id] = {
            "hvac_mode": "heat",
            "temperature": 20,
        }

        await self.scheduler.async_set_zone_boost(
            self.entity_id,
            23,
            "2026-05-19T20:00:00+00:00",
            hvac_mode="heat",
        )

        override = self.data["zones"][self.entity_id]["override"]

        self.assertIsNotNone(override)
        self.assertEqual(override["started_at"], NOW.isoformat())
        self.assertEqual(override["until"], "2026-05-19T20:00:00+00:00")
        self.assertEqual(
            override["previous_state"],
            {
                "hvac_mode": "heat",
                "temperature": 20,
            },
        )
        self.assertIn(
            (
                EVENT_VELAIR,
                {
                    "domain": "velair",
                    "event": EVENT_TYPE_BOOST_STARTED,
                    "entity_id": self.entity_id,
                    "temperature": 23,
                    "hvac_mode": "heat",
                    "started_at": NOW.isoformat(),
                    "until": "2026-05-19T20:00:00+00:00",
                },
            ),
            self.hass.bus.events,
        )

    async def test_expired_boost_restores_previous_state_without_current_block(
        self,
    ) -> None:
        previous_state = {"hvac_mode": "cool", "temperature": 19}
        self.data["zones"][self.entity_id]["override"] = {
            "type": "boost",
            "started_at": "2026-05-19T17:00:00+00:00",
            "until": "2026-05-19T17:30:00+00:00",
            "temperature": 23,
            "hvac_mode": "heat",
            "previous_state": previous_state,
        }

        await self.scheduler._handle_timer(NOW)

        self.assertIsNone(self.data["zones"][self.entity_id]["override"])
        self.assertEqual(
            self.climate.calls,
            [("restore_state", self.entity_id, previous_state)],
        )
        self.assertIn(
            (
                EVENT_VELAIR,
                {
                    "domain": "velair",
                    "event": EVENT_TYPE_BOOST_ENDED,
                    "entity_id": self.entity_id,
                    "temperature": 23,
                    "hvac_mode": "heat",
                    "started_at": "2026-05-19T17:00:00+00:00",
                    "until": "2026-05-19T17:30:00+00:00",
                },
            ),
            self.hass.bus.events,
        )

    async def test_expired_boost_applies_current_explicit_schedule_block(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        self.data["zones"][self.entity_id]["override"] = {
            "type": "boost",
            "started_at": "2026-05-19T17:00:00+00:00",
            "until": "2026-05-19T17:30:00+00:00",
            "temperature": 23,
            "hvac_mode": "heat",
            "previous_state": {"hvac_mode": "cool", "temperature": 19},
        }

        await self.scheduler._handle_timer(NOW)

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 21.0, True, "heat")],
        )

    async def test_expired_boost_restores_previous_state_for_keep_block(self) -> None:
        previous_state = {"hvac_mode": "cool", "temperature": 19}
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
            }
        ]
        self.data["zones"][self.entity_id]["override"] = {
            "type": "boost",
            "started_at": "2026-05-19T17:00:00+00:00",
            "until": "2026-05-19T17:30:00+00:00",
            "temperature": 23,
            "hvac_mode": "heat",
            "previous_state": previous_state,
        }

        await self.scheduler._handle_timer(NOW)

        self.assertEqual(
            self.climate.calls,
            [("restore_state", self.entity_id, previous_state)],
        )

    async def test_expired_boost_applies_current_turn_off_block(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_TURN_OFF,
            }
        ]
        self.data["zones"][self.entity_id]["override"] = {
            "type": "boost",
            "started_at": "2026-05-19T17:00:00+00:00",
            "until": "2026-05-19T17:30:00+00:00",
            "temperature": 23,
            "hvac_mode": "heat",
            "previous_state": {"hvac_mode": "cool", "temperature": 19},
        }

        await self.scheduler._handle_timer(NOW)

        self.assertEqual(self.climate.calls, [("turn_off", self.entity_id)])

    async def test_temperature_limits_are_enforced_for_saved_blocks(self) -> None:
        self.climate.limits[self.entity_id] = (18.0, 22.0)

        with self.assertRaisesRegex(ValueError, "Temperature must be between 18 and 22"):
            await self.scheduler.async_set_daily_schedule(
                self.entity_id,
                "tuesday",
                [
                    {
                        "start": "17:00",
                        "action": ACTION_SET_TEMPERATURE,
                        "temperature": 16,
                    }
                ],
            )

    async def test_update_settings_persists_order_and_temperature_limits(self) -> None:
        await self.scheduler.async_update_settings(
            {
                "first_weekday": "sunday",
                "zone_order": [self.entity_id],
                "min_temperature": 12,
                "max_temperature": 28,
            }
        )

        self.assertEqual(self.save_count, 1)
        self.assertEqual(
            self.data["settings"],
            {
                "first_weekday": "sunday",
                "zone_order": [self.entity_id],
                "min_temperature": 12.0,
                "max_temperature": 28.0,
            },
        )

    async def test_portable_import_replaces_selected_sections(self) -> None:
        next_zones = {
            self.entity_id: {
                "enabled": True,
                "schedule": {
                    **empty_week_schedule(),
                    "monday": [
                        {
                            "start": "08:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 20,
                            "hvac_mode": "heat",
                        }
                    ],
                },
                "override": None,
            }
        }
        next_templates = [
            {
                "key": "portable",
                "name": "Portable",
                "blocks": [
                    {
                        "start": "08:00",
                        "action": ACTION_SET_TEMPERATURE,
                        "temperature": 20,
                    }
                ],
            }
        ]
        next_settings = normalize_panel_settings(
            {"first_weekday": "sunday", "zone_order": [self.entity_id]},
            [self.entity_id],
        )

        await self.scheduler.async_replace_portable_data(
            zones=next_zones,
            templates=next_templates,
            settings=next_settings,
        )

        self.assertEqual(self.save_count, 1)
        self.assertEqual(self.data["zones"], next_zones)
        self.assertEqual(self.data["templates"], next_templates)
        self.assertTrue(self.data["templates_seeded"])
        self.assertEqual(self.data["settings"], next_settings)

    async def test_portable_import_can_replace_templates_only(self) -> None:
        original_zones = self.data["zones"]
        original_settings = self.data["settings"]
        next_templates = [
            {
                "key": "portable",
                "name": "Portable",
                "blocks": [
                    {
                        "start": "08:00",
                        "action": ACTION_SET_TEMPERATURE,
                        "temperature": 20,
                        "hvac_mode": "heat",
                    }
                ],
            }
        ]

        await self.scheduler.async_replace_portable_data(templates=next_templates)

        self.assertEqual(self.save_count, 1)
        self.assertIs(self.data["zones"], original_zones)
        self.assertIs(self.data["settings"], original_settings)
        self.assertEqual(self.data["templates"], next_templates)
        self.assertTrue(self.data["templates_seeded"])
        self.assertEqual(
            self.data["templates_seeded_version"],
            DEFAULT_SCHEDULE_TEMPLATES_VERSION,
        )

    async def test_reset_data_replaces_entire_model_with_defaults(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["monday"] = [
            {
                "start": "08:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
            }
        ]
        self.data["templates"] = [
            {
                "key": "custom",
                "name": "Custom",
                "blocks": [
                    {
                        "start": "08:00",
                        "action": ACTION_SET_TEMPERATURE,
                        "temperature": 21,
                    }
                ],
            }
        ]

        default_data = normalize_schedule_data(None, [self.entity_id])
        await self.scheduler.async_reset_data(default_data)

        self.assertEqual(self.save_count, 1)
        self.assertEqual(self.data, default_data)
        self.assertEqual(self.data["zones"][self.entity_id]["schedule"]["monday"], [])
        self.assertNotIn(
            "custom",
            {template["key"] for template in self.data["templates"]},
        )

    async def test_saving_other_day_does_not_apply_previous_day_block(self) -> None:
        await self.scheduler.async_set_daily_schedule(
            self.entity_id,
            "monday",
            [
                {
                    "start": "17:00",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 22,
                    "hvac_mode": "heat",
                }
            ],
        )

        self.assertEqual(self.climate.calls, [])

    async def test_copying_schedule_to_today_applies_current_block(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["monday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 20,
                "hvac_mode": "cool",
            }
        ]

        await self.scheduler.async_copy_day_schedule(
            self.entity_id,
            "monday",
            ["tuesday", "wednesday"],
        )

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 20, True, "cool")],
        )

    async def test_copying_schedule_without_today_does_not_apply(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["monday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 20,
            }
        ]

        await self.scheduler.async_copy_day_schedule(
            self.entity_id,
            "monday",
            ["wednesday"],
        )

        self.assertEqual(self.climate.calls, [])

    async def test_saving_today_does_not_apply_when_scheduler_is_paused(self) -> None:
        self.data["global_"]["mode"] = MODE_PAUSED

        await self.scheduler.async_set_daily_schedule(
            self.entity_id,
            "tuesday",
            [
                {
                    "start": "17:00",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 21,
                }
            ],
        )

        self.assertEqual(self.climate.calls, [])

    async def test_saving_today_does_not_override_active_boost(self) -> None:
        self.data["zones"][self.entity_id]["override"] = {
            "type": "boost",
            "until": "2026-05-19T19:00:00+00:00",
            "temperature": 24,
            "hvac_mode": "heat",
        }

        await self.scheduler.async_set_daily_schedule(
            self.entity_id,
            "tuesday",
            [
                {
                    "start": "17:00",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 21,
                    "hvac_mode": "heat",
                }
            ],
        )

        self.assertEqual(self.climate.calls, [])

    async def test_zone_pause_does_not_report_as_active_boost(self) -> None:
        await self.scheduler.async_pause_zone(self.entity_id)

        self.assertEqual(self.scheduler.get_active_overrides(), {})
        self.assertIn(
            (
                EVENT_VELAIR,
                {
                    "domain": "velair",
                    "event": EVENT_TYPE_ZONE_PAUSED,
                    "entity_id": self.entity_id,
                    "started_at": NOW.isoformat(),
                    "until": None,
                    "action": "none",
                },
            ),
            self.hass.bus.events,
        )

    async def test_zone_pause_skips_current_schedule_application(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler.async_pause_zone(self.entity_id)
        await self.scheduler.async_apply_current_schedule(self.entity_id)

        self.assertEqual(self.climate.calls, [])

    async def test_zone_pause_turn_off_action_turns_climate_off(self) -> None:
        await self.scheduler.async_pause_zone(
            self.entity_id,
            action=ZONE_PAUSE_ACTION_TURN_OFF,
        )

        self.assertEqual(self.climate.calls, [("turn_off", self.entity_id)])
        self.assertIn(
            (
                EVENT_VELAIR,
                {
                    "domain": "velair",
                    "event": EVENT_TYPE_CLIMATE_TARGET_APPLIED,
                    "entity_id": self.entity_id,
                    "action": ACTION_TURN_OFF,
                    "temperature": None,
                    "hvac_mode": None,
                    "weekday": None,
                    "start": None,
                    "source": "zone_paused",
                },
            ),
            self.hass.bus.events,
        )

    async def test_resume_zone_applies_current_schedule(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        await self.scheduler.async_pause_zone(self.entity_id)
        self.climate.calls.clear()
        self.hass.bus.events.clear()

        await self.scheduler.async_resume_zone(self.entity_id)

        self.assertIsNone(self.data["zones"][self.entity_id]["override"])
        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 21, True, "heat")],
        )
        self.assertIn(
            (
                EVENT_VELAIR,
                {
                    "domain": "velair",
                    "event": EVENT_TYPE_ZONE_RESUMED,
                    "entity_id": self.entity_id,
                    "started_at": NOW.isoformat(),
                    "until": None,
                    "action": "none",
                    "reason": "manual",
                },
            ),
            self.hass.bus.events,
        )

    async def test_expired_zone_pause_applies_current_schedule(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        self.data["zones"][self.entity_id]["override"] = {
            "type": "pause",
            "started_at": "2026-05-19T17:00:00+00:00",
            "until": "2026-05-19T17:30:00+00:00",
            "action": "none",
        }

        await self.scheduler._handle_timer(NOW)

        self.assertIsNone(self.data["zones"][self.entity_id]["override"])
        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 21, True, "heat")],
        )
        self.assertIn(
            (
                EVENT_VELAIR,
                {
                    "domain": "velair",
                    "event": EVENT_TYPE_ZONE_RESUMED,
                    "entity_id": self.entity_id,
                    "started_at": "2026-05-19T17:00:00+00:00",
                    "until": "2026-05-19T17:30:00+00:00",
                    "action": "none",
                    "reason": "expired",
                },
            ),
            self.hass.bus.events,
        )

    async def test_saving_today_turn_off_block_applies_turn_off(self) -> None:
        await self.scheduler.async_set_daily_schedule(
            self.entity_id,
            "tuesday",
            [
                {
                    "start": "17:00",
                    "action": ACTION_TURN_OFF,
                }
            ],
        )

        self.assertEqual(self.climate.calls, [("turn_off", self.entity_id)])

    async def test_temporary_pause_stores_and_clears_started_at(self) -> None:
        await self.scheduler.async_set_mode(
            MODE_PAUSED,
            paused_until="2026-05-19T19:00:00+00:00",
        )

        self.assertEqual(
            self.data["global_"]["paused_started_at"],
            NOW.isoformat(),
        )

        await self.scheduler.async_set_mode(MODE_AUTO)

        self.assertIsNone(self.data["global_"]["paused_started_at"])

    async def test_resuming_does_not_apply_previous_day_blocks(self) -> None:
        self.data["global_"]["mode"] = MODE_PAUSED
        self.data["zones"][self.entity_id]["schedule"]["monday"] = [
            {
                "start": "08:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler.async_set_mode(MODE_AUTO, apply_current_schedule=True)

        self.assertEqual(self.climate.calls, [])

    async def test_resuming_applies_today_current_block(self) -> None:
        self.data["global_"]["mode"] = MODE_PAUSED
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler.async_set_mode(MODE_AUTO, apply_current_schedule=True)

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 21, True, "heat")],
        )

    async def test_start_can_apply_current_schedule_when_enabled(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 19,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler.async_start(apply_current_schedule=True)

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 19, True, "heat")],
        )

    async def test_start_does_not_apply_current_schedule_by_default(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 19,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler.async_start()

        self.assertEqual(self.climate.calls, [])

