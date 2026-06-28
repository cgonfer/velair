"""Scheduler application, override, service, and portability behavior tests."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
import unittest
from unittest.mock import Mock

from .helpers import (
    ACTION_SET_TEMPERATURE,
    ACTION_TURN_OFF,
    DEFAULT_PRECONDITIONING_MAX_LEAD_MINUTES,
    DEFAULT_SCHEDULE_TEMPLATES_VERSION,
    EVENT_TYPE_BOOST_ENDED,
    EVENT_TYPE_BOOST_STARTED,
    EVENT_TYPE_CLIMATE_TARGET_APPLIED,
    EVENT_TYPE_PRECONDITIONING_PLAN_UPDATED,
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
    normalize_preconditioning_data,
    scheduler_module,
)


def _preconditioning_sample(
    mode: str,
    quality: str,
    minutes: int,
    *,
    delta_t: float = 3,
    created_at: str = "2026-05-19T19:00:00+00:00",
) -> dict[str, object]:
    """Return one stored adaptive preconditioning sample."""
    reached = quality == "complete"
    target_temp = 21.0 if mode == "heat" else 23.0
    initial_temp = target_temp - delta_t if mode == "heat" else target_temp + delta_t
    return {
        "entity_id": "climate.salon",
        "mode": mode,
        "created_at": created_at,
        "scheduled_time": "2026-05-19T20:00:00+00:00",
        "start_time": "2026-05-19T18:00:00+00:00",
        "target_temp": target_temp,
        "initial_temp": initial_temp,
        "observed_temp": target_temp,
        "outdoor_temp_start": None,
        "outdoor_temp_target": None,
        "delta_t": delta_t,
        "startup_minutes": minutes,
        "reached": reached,
        "minutes_to_reach": minutes if reached else None,
        "quality": quality,
    }


def _preconditioning_learning(
    samples: list[dict[str, object]],
) -> dict[str, dict[str, list[dict[str, object]]]]:
    """Return stored learning data split by preconditioning direction."""
    return {
        "heat": {
            "observations": [
                sample for sample in samples if sample.get("mode") == "heat"
            ]
        },
        "cool": {
            "observations": [
                sample for sample in samples if sample.get("mode") == "cool"
            ]
        },
    }


def _stored_preconditioning_observations(
    data: dict[str, object],
    entity_id: str,
    direction: str,
) -> list[dict[str, object]]:
    """Return stored observations for one scheduler test direction."""
    return (
        data.get("preconditioning_learning", {})
        .get(entity_id, {})
        .get(direction, {})
        .get("observations", [])
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
        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 23, True, "heat")],
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
                    "reason": "expired",
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

    async def test_cancel_boost_applies_current_explicit_schedule_block(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        self.climate.snapshots[self.entity_id] = {
            "hvac_mode": "cool",
            "temperature": 19,
        }
        await self.scheduler.async_set_zone_boost(
            self.entity_id,
            23,
            "2026-05-19T20:00:00+00:00",
            hvac_mode="cool",
        )

        await self.scheduler.async_cancel_zone_boost(self.entity_id)

        self.assertIsNone(self.data["zones"][self.entity_id]["override"])
        self.assertEqual(
            self.climate.calls,
            [
                ("set_temperature", self.entity_id, 23, True, "cool"),
                ("set_temperature", self.entity_id, 21.0, True, "heat"),
            ],
        )
        self.assertIn(
            (
                EVENT_VELAIR,
                {
                    "domain": "velair",
                    "event": EVENT_TYPE_BOOST_ENDED,
                    "entity_id": self.entity_id,
                    "temperature": 23,
                    "hvac_mode": "cool",
                    "started_at": NOW.isoformat(),
                    "until": "2026-05-19T20:00:00+00:00",
                    "reason": "manual",
                },
            ),
            self.hass.bus.events,
        )

    async def test_temporary_pause_expiration_fires_mode_change_event(self) -> None:
        await self.scheduler.async_set_mode(
            MODE_PAUSED,
            paused_until="2026-05-19T19:00:00+00:00",
        )

        await self.scheduler._handle_timer(
            datetime(2026, 5, 19, 19, 0, tzinfo=timezone.utc)
        )

        self.assertIn(
            (
                EVENT_VELAIR,
                {
                    "domain": "velair",
                    "event": EVENT_TYPE_SCHEDULER_MODE_CHANGED,
                    "mode": MODE_AUTO,
                    "previous_mode": MODE_PAUSED,
                    "paused_until": None,
                    "paused_started_at": NOW.isoformat(),
                },
            ),
            self.hass.bus.events,
        )

    async def test_manual_temperature_can_fire_service_automation_event(self) -> None:
        await self.scheduler.async_set_temperature(
            self.entity_id,
            22,
            ensure_on=True,
            hvac_mode="heat",
            event_source="service_set_temperature",
        )

        self.assertIn(
            (
                EVENT_VELAIR,
                {
                    "domain": "velair",
                    "event": EVENT_TYPE_CLIMATE_TARGET_APPLIED,
                    "entity_id": self.entity_id,
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 22,
                    "hvac_mode": "heat",
                    "source": "service_set_temperature",
                },
            ),
            self.hass.bus.events,
        )

    async def test_replacing_boost_preserves_original_previous_state(self) -> None:
        original_state = {"hvac_mode": "cool", "temperature": 19}
        self.climate.snapshots[self.entity_id] = original_state
        await self.scheduler.async_set_zone_boost(
            self.entity_id,
            22,
            "2026-05-19T19:00:00+00:00",
            hvac_mode="heat",
        )
        self.climate.snapshots[self.entity_id] = {
            "hvac_mode": "heat",
            "temperature": 22,
        }

        await self.scheduler.async_set_zone_boost(
            self.entity_id,
            24,
            "2026-05-19T20:00:00+00:00",
            hvac_mode="heat",
        )
        await self.scheduler.async_cancel_zone_boost(self.entity_id)

        self.assertEqual(
            self.climate.calls[-1],
            ("restore_state", self.entity_id, original_state),
        )

    async def test_cancel_boost_restores_previous_state_without_current_block(
        self,
    ) -> None:
        previous_state = {"hvac_mode": "cool", "temperature": 19}
        self.climate.snapshots[self.entity_id] = previous_state
        await self.scheduler.async_set_zone_boost(
            self.entity_id,
            23,
            "2026-05-19T20:00:00+00:00",
            hvac_mode="heat",
        )

        await self.scheduler.async_cancel_zone_boost(self.entity_id)

        self.assertEqual(
            self.climate.calls,
            [
                ("set_temperature", self.entity_id, 23, True, "heat"),
                ("restore_state", self.entity_id, previous_state),
            ],
        )

    async def test_cancel_boost_restores_previous_state_for_keep_block(self) -> None:
        previous_state = {"hvac_mode": "cool", "temperature": 19}
        self.climate.snapshots[self.entity_id] = previous_state
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
            }
        ]
        await self.scheduler.async_set_zone_boost(
            self.entity_id,
            23,
            "2026-05-19T20:00:00+00:00",
            hvac_mode="heat",
        )

        await self.scheduler.async_cancel_zone_boost(self.entity_id)

        self.assertEqual(
            self.climate.calls[-1],
            ("restore_state", self.entity_id, previous_state),
        )

    async def test_cancel_boost_is_idempotent_without_active_boost(self) -> None:
        await self.scheduler.async_cancel_zone_boost(self.entity_id)

        self.assertEqual(self.save_count, 0)
        self.assertEqual(self.climate.calls, [])

    async def test_boost_requires_a_restorable_climate_state(self) -> None:
        with self.assertRaisesRegex(ValueError, "state is unavailable"):
            await self.scheduler.async_set_zone_boost(
                self.entity_id,
                23,
                "2026-05-19T20:00:00+00:00",
                hvac_mode="heat",
            )

        self.assertIsNone(self.data["zones"][self.entity_id]["override"])
        self.assertEqual(self.climate.calls, [])

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

    async def test_portable_learning_import_preserves_unlisted_climates(self) -> None:
        imported = _preconditioning_learning(
            [_preconditioning_sample("heat", "complete", 35)]
        )
        existing = _preconditioning_learning(
            [_preconditioning_sample("cool", "complete", 50)]
        )
        self.data["preconditioning_learning"] = {
            self.entity_id: _preconditioning_learning([]),
            "climate.other": existing,
        }

        await self.scheduler.async_replace_portable_data(
            preconditioning_learning={self.entity_id: imported},
        )

        self.assertEqual(self.save_count, 1)
        self.assertEqual(
            self.data["preconditioning_learning"][self.entity_id],
            imported,
        )
        self.assertIs(
            self.data["preconditioning_learning"]["climate.other"],
            existing,
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


class VelairSchedulerPreconditioningTest(unittest.IsolatedAsyncioTestCase):
    """Verify adaptive preconditioning scheduler behavior."""

    def setUp(self) -> None:
        self.entity_id = "climate.salon"
        self.hass = FakeHass()
        self.climate = FakeClimateManager()
        self.save_count = 0
        self.data = {
            "version": 1,
            "global_": {
                "mode": MODE_AUTO,
                "vacation": None,
                "paused_until": None,
                "paused_started_at": None,
            },
            "zones": {
                self.entity_id: {
                    "enabled": True,
                    "schedule": empty_week_schedule(),
                    "override": None,
                    "preconditioning": {
                        "enabled": True,
                        "max_lead_minutes": 180,
                        "minimum_delta_temperature": 0.3,
                        "fallback_minutes_per_degree": 20,
                    },
                }
            },
            "settings": normalize_panel_settings(None, [self.entity_id]),
            "templates": [],
            "templates_seeded": True,
        }
        self.scheduler = VelairScheduler(
            self.hass,
            self.data,
            self.climate,
            self._async_save,
        )

    async def _async_save(self) -> None:
        self.save_count += 1

    async def test_reset_zone_preconditioning_learning_deletes_zone_observations(
        self,
    ) -> None:
        self.data["preconditioning_learning"] = {
            self.entity_id: _preconditioning_learning(
                [
                    _preconditioning_sample("heat", "complete", 30, delta_t=1),
                    _preconditioning_sample("cool", "complete", 40, delta_t=2),
                ]
            ),
            "climate.other": _preconditioning_learning(
                [
                    _preconditioning_sample("heat", "complete", 60, delta_t=2)
                ]
            ),
        }

        await self.scheduler.async_reset_zone_preconditioning_learning(
            self.entity_id,
            "heat",
        )

        heat = _stored_preconditioning_observations(
            self.data,
            self.entity_id,
            "heat",
        )
        cool = _stored_preconditioning_observations(
            self.data,
            self.entity_id,
            "cool",
        )
        self.assertEqual(heat, [])
        self.assertEqual(len(cool), 1)
        self.assertIn("climate.other", self.data["preconditioning_learning"])
        self.assertEqual(self.save_count, 1)

    async def test_reset_zone_preconditioning_settings_keeps_enablement_and_learning(
        self,
    ) -> None:
        learning = _preconditioning_learning(
            [_preconditioning_sample("heat", "complete", 30, delta_t=1)]
        )
        self.data["preconditioning_learning"] = {self.entity_id: learning}
        self.data["zones"][self.entity_id]["preconditioning"] = {
            "enabled": True,
            "max_lead_minutes": 720,
            "minimum_delta_temperature": 2,
            "learning_history_size": 500,
            "similar_sample_count": 100,
            "comfort_percentile": 95,
            "adaptive_percentile_enabled": False,
            "partial_expiry_days": 365,
            "recency_decay_days": 365,
            "min_start_minutes": 120,
            "fallback_minutes_per_degree": 120,
            "use_outdoor_temperature": False,
            "outdoor_temperature_entity_id": "sensor.outdoor",
        }

        result = await self.scheduler.async_reset_zone_preconditioning_settings(
            self.entity_id
        )

        expected = normalize_preconditioning_data(None)
        expected["enabled"] = True
        self.assertEqual(result, expected)
        self.assertEqual(
            result["max_lead_minutes"],
            DEFAULT_PRECONDITIONING_MAX_LEAD_MINUTES,
        )
        self.assertEqual(
            self.data["preconditioning_learning"][self.entity_id],
            learning,
        )
        self.assertEqual(self.save_count, 1)

    async def test_reset_zone_preconditioning_settings_rejects_unmanaged_entity(
        self,
    ) -> None:
        with self.assertRaises(ValueError):
            await self.scheduler.async_reset_zone_preconditioning_settings(
                "climate.unmanaged"
            )

        self.assertEqual(self.save_count, 0)

    async def test_reset_zone_preconditioning_learning_rejects_unmanaged_entity(
        self,
    ) -> None:
        with self.assertRaises(ValueError):
            await self.scheduler.async_reset_zone_preconditioning_learning(
                "climate.unmanaged",
                "heat",
            )

        self.assertEqual(self.save_count, 0)

    async def test_reset_zone_preconditioning_learning_rejects_unknown_direction(
        self,
    ) -> None:
        with self.assertRaises(ValueError):
            await self.scheduler.async_reset_zone_preconditioning_learning(
                self.entity_id,
                "dry",
            )

        self.assertEqual(self.save_count, 0)

    def test_adaptive_heating_preconditioning_moves_apply_time_earlier(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        event = self.scheduler.calculate_next_event(NOW)

        self.assertIsNotNone(event)
        self.assertEqual(event.when, datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc))
        self.assertEqual(
            event.target_when,
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc),
        )
        self.assertEqual(event.start, "20:00")

    def test_calculating_preconditioning_for_display_does_not_fire_event(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        event = self.scheduler.calculate_next_event(NOW)

        self.assertIsNotNone(event)
        self.assertEqual(self.hass.bus.events, [])

    def test_scheduling_fires_preconditioning_plan_only_when_it_changes(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        self.scheduler.async_schedule_next_event()
        self.scheduler.async_schedule_next_event()

        planned = [
            data
            for event_type, data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and data["event"] == EVENT_TYPE_PRECONDITIONING_PLAN_UPDATED
        ]
        self.assertEqual(len(planned), 1)
        self.assertEqual(
            planned[0],
            {
                "domain": "velair",
                "event": EVENT_TYPE_PRECONDITIONING_PLAN_UPDATED,
                "entity_id": self.entity_id,
                "scheduled_when": "2026-05-19T20:00:00+00:00",
                "preconditioning_when": "2026-05-19T18:30:00+00:00",
                "lead_minutes": 90,
                "direction": "heat",
                "target_temperature": 21.0,
                "current_temperature": 18.0,
                "temperature_delta": 3.0,
                "hvac_mode": "heat",
                "model_source": "initial_model",
                "complete_sample_count": 0,
                "partial_sample_count": 0,
                "similar_sample_count": 0,
                "comfort_percentile": 80,
                "used_outdoor_temperature": False,
                "outdoor_temperature": None,
                "weekday": "tuesday",
                "start": "20:00",
            },
        )

        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 20},
        )
        self.scheduler.async_schedule_next_event()

        planned = [
            data
            for event_type, data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and data["event"] == EVENT_TYPE_PRECONDITIONING_PLAN_UPDATED
        ]
        self.assertEqual(len(planned), 2)
        self.assertEqual(planned[-1]["preconditioning_when"], "2026-05-19T19:10:00+00:00")
        self.assertEqual(planned[-1]["lead_minutes"], 50)
        self.assertEqual(planned[-1]["temperature_delta"], 1.0)

    def test_cooling_plan_event_reports_history_model(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="cool",
            attributes={"current_temperature": 26},
        )
        self.data["preconditioning_learning"] = {
            self.entity_id: _preconditioning_learning(
                [
                    _preconditioning_sample("cool", "complete", minutes, delta_t=3)
                    for minutes in (60, 65, 70, 75, 80)
                ]
            )
        }
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 23,
                "hvac_mode": "cool",
            }
        ]

        self.scheduler.async_schedule_next_event()

        planned = next(
            data
            for event_type, data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and data["event"] == EVENT_TYPE_PRECONDITIONING_PLAN_UPDATED
        )
        self.assertEqual(planned["direction"], "cool")
        self.assertEqual(planned["model_source"], "history")
        self.assertEqual(planned["complete_sample_count"], 5)
        self.assertEqual(planned["similar_sample_count"], 5)

    def test_disabled_preconditioning_registers_no_temperature_listener(self) -> None:
        original_tracker = scheduler_module.async_track_state_change_event
        tracker = Mock(return_value=Mock())
        scheduler_module.async_track_state_change_event = tracker
        self.addCleanup(
            setattr,
            scheduler_module,
            "async_track_state_change_event",
            original_tracker,
        )
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["preconditioning"]["enabled"] = False
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        self.scheduler.async_schedule_next_event()

        tracker.assert_not_called()
        self.assertEqual(self.scheduler._preconditioning_replan_entities, ())
        self.assertFalse(
            any(
                data.get("event") == EVENT_TYPE_PRECONDITIONING_PLAN_UPDATED
                for _, data in self.hass.bus.events
            )
        )

    async def test_enabling_preconditioning_registers_only_that_climate(self) -> None:
        original_tracker = scheduler_module.async_track_state_change_event
        tracker = Mock(return_value=Mock())
        scheduler_module.async_track_state_change_event = tracker
        self.addCleanup(
            setattr,
            scheduler_module,
            "async_track_state_change_event",
            original_tracker,
        )
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["preconditioning"]["enabled"] = False
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler.async_update_zone_preconditioning(
            self.entity_id,
            {"enabled": True},
        )

        tracker.assert_called_once()
        self.assertEqual(tracker.call_args.args[1], [self.entity_id])
        self.assertEqual(
            self.scheduler._preconditioning_replan_entities,
            (self.entity_id,),
        )

    async def test_disabled_preconditioning_discards_stale_learning_session(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        event = self.scheduler.calculate_next_event(NOW)
        self.assertIsNotNone(event)
        self.scheduler._start_preconditioning_session(
            event,
            "heat",
            datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc),
        )
        self.assertIn(self.entity_id, self.scheduler._preconditioning_sessions)
        self.data["zones"][self.entity_id]["preconditioning"]["enabled"] = False

        await self.scheduler._async_observe_preconditioning_temperature(
            self.entity_id,
            datetime(2026, 5, 19, 19, 20, tzinfo=timezone.utc),
            20.8,
        )

        self.assertNotIn(self.entity_id, self.scheduler._preconditioning_sessions)
        self.assertEqual(
            _stored_preconditioning_observations(
                self.data,
                self.entity_id,
                "heat",
            ),
            [],
        )

    async def test_disabled_preconditioning_expiration_saves_no_observation(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        event = self.scheduler.calculate_next_event(NOW)
        self.assertIsNotNone(event)
        self.scheduler._start_preconditioning_session(
            event,
            "heat",
            datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc),
        )
        self.data["zones"][self.entity_id]["preconditioning"]["enabled"] = False

        await self.scheduler._async_expire_preconditioning_sessions(
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc)
        )

        self.assertNotIn(self.entity_id, self.scheduler._preconditioning_sessions)
        self.assertEqual(
            _stored_preconditioning_observations(
                self.data,
                self.entity_id,
                "heat",
            ),
            [],
        )

    def test_adaptive_heating_preconditioning_skips_when_target_is_already_met(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 21.2},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        event = self.scheduler.calculate_next_event(NOW)

        self.assertIsNotNone(event)
        self.assertEqual(event.when, datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc))
        self.assertIsNone(event.target_when)

    async def test_due_preconditioning_event_applies_target_temperature(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler._handle_timer(
            datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc)
        )

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 21.0, True, "heat")],
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
                    "start": "20:00",
                    "source": "scheduled_event",
                    "target_when": "2026-05-19T20:00:00+00:00",
                },
            ),
            self.hass.bus.events,
        )

    def test_late_preconditioning_window_reports_event_due_now(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        event = self.scheduler.calculate_next_event(
            datetime(2026, 5, 19, 19, 40, tzinfo=timezone.utc)
        )

        self.assertIsNotNone(event)
        self.assertEqual(event.when, datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc))
        self.assertEqual(
            event.target_when,
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc),
        )

    async def test_late_preconditioning_window_applies_once(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler._handle_timer(
            datetime(2026, 5, 19, 19, 40, tzinfo=timezone.utc)
        )
        await self.scheduler._handle_timer(
            datetime(2026, 5, 19, 19, 41, tzinfo=timezone.utc)
        )

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 21.0, True, "heat")],
        )

    async def test_late_preconditioning_window_stores_observed_learning_time(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler._handle_timer(
            datetime(2026, 5, 19, 19, 40, tzinfo=timezone.utc)
        )
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 19.2},
        )
        await self.scheduler._handle_timer(
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc)
        )

        observations = _stored_preconditioning_observations(
            self.data,
            self.entity_id,
            "heat",
        )
        self.assertEqual(len(observations), 1)
        self.assertEqual(observations[0]["quality"], "partial")
        self.assertEqual(observations[0]["start_time"], "2026-05-19T19:40:00+00:00")
        self.assertEqual(observations[0]["scheduled_time"], "2026-05-19T20:00:00+00:00")
        self.assertEqual(observations[0]["startup_minutes"], 20)

    def test_adaptive_cooling_preconditioning_moves_apply_time_earlier(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="cool",
            attributes={"current_temperature": 26},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 23,
                "hvac_mode": "cool",
            }
        ]

        event = self.scheduler.calculate_next_event(NOW)

        self.assertIsNotNone(event)
        self.assertEqual(event.when, datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc))
        self.assertEqual(
            event.target_when,
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc),
        )

    def test_adaptive_preconditioning_uses_ready_learned_heating_lead(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["preconditioning_learning"] = {
            self.entity_id: _preconditioning_learning(
                [
                    *[
                        _preconditioning_sample("heat", "complete", minutes, delta_t=3)
                        for minutes in (60, 65, 70, 75, 80)
                    ],
                ]
            )
        }
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        event = self.scheduler.calculate_next_event(NOW)

        self.assertIsNotNone(event)
        self.assertEqual(event.when, datetime(2026, 5, 19, 18, 45, tzinfo=timezone.utc))
        self.assertEqual(
            event.target_when,
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc),
        )

    def test_adaptive_preconditioning_scales_lead_by_needed_delta(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 19},
        )
        self.data["preconditioning_learning"] = {
            self.entity_id: _preconditioning_learning(
                [
                    *[
                        _preconditioning_sample("heat", "complete", minutes, delta_t=2)
                        for minutes in (40, 50, 60, 70, 80)
                    ],
                ]
            )
        }
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        event = self.scheduler.calculate_next_event(NOW)

        self.assertIsNotNone(event)
        self.assertEqual(event.when, datetime(2026, 5, 19, 18, 50, tzinfo=timezone.utc))
        self.assertEqual(
            event.target_when,
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc),
        )

    def test_adaptive_preconditioning_extends_lead_after_partial_attempt(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["preconditioning_learning"] = {
            self.entity_id: _preconditioning_learning(
                [
                    *[
                        _preconditioning_sample("heat", "complete", minutes, delta_t=3)
                        for minutes in (60, 65, 70, 75, 80)
                    ],
                    _preconditioning_sample("heat", "partial", 90, delta_t=3),
                ]
            )
        }
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        event = self.scheduler.calculate_next_event(NOW)

        self.assertIsNotNone(event)
        self.assertEqual(event.when, datetime(2026, 5, 19, 18, 10, tzinfo=timezone.utc))
        self.assertEqual(
            event.target_when,
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc),
        )

    def test_adaptive_preconditioning_uses_initial_model_until_ready(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["preconditioning_learning"] = {
            self.entity_id: _preconditioning_learning(
                [
                    _preconditioning_sample("heat", "complete", 70, delta_t=3),
                    _preconditioning_sample("heat", "partial", 80, delta_t=3),
                ]
            )
        }
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        event = self.scheduler.calculate_next_event(NOW)

        self.assertIsNotNone(event)
        self.assertEqual(event.when, datetime(2026, 5, 19, 18, 20, tzinfo=timezone.utc))

    def test_preconditioning_temperature_change_replans_next_event_after_debounce(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        self.scheduler.async_schedule_next_event()
        self.assertIsNotNone(self.scheduler.next_event)
        self.assertEqual(
            self.scheduler.next_event.when,
            datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc),
        )
        write_state = Mock()
        self.scheduler._async_write_state = write_state

        next_state = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 20},
        )
        self.hass.states[self.entity_id] = next_state
        self.scheduler._handle_preconditioning_replan_state_change(
            SimpleNamespace(
                data={"entity_id": self.entity_id, "new_state": next_state}
            )
        )

        self.assertIsNotNone(self.scheduler._unsub_preconditioning_replan_timer)

        self.scheduler._handle_preconditioning_replan_timer(
            datetime(2026, 5, 19, 18, 0, 30, tzinfo=timezone.utc)
        )

        self.assertIsNotNone(self.scheduler.next_event)
        self.assertEqual(
            self.scheduler.next_event.when,
            datetime(2026, 5, 19, 19, 10, tzinfo=timezone.utc),
        )
        write_state.assert_called_once_with()

    def test_preconditioning_temperature_change_ignores_small_movements(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.scheduler.async_schedule_next_event()

        next_state = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18.1},
        )
        self.scheduler._handle_preconditioning_replan_state_change(
            SimpleNamespace(
                data={"entity_id": self.entity_id, "new_state": next_state}
            )
        )

        self.assertIsNone(self.scheduler._unsub_preconditioning_replan_timer)

    def test_preconditioning_temperature_change_ignores_active_learning_session(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        self.scheduler.async_schedule_next_event()
        event = self.scheduler.next_event
        self.assertIsNotNone(event)
        self.scheduler._start_preconditioning_session(
            event,
            "heat",
            datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc),
        )

        next_state = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 20},
        )
        self.scheduler._handle_preconditioning_replan_state_change(
            SimpleNamespace(
                data={"entity_id": self.entity_id, "new_state": next_state}
            )
        )

        self.assertIsNone(self.scheduler._unsub_preconditioning_replan_timer)

    async def test_reached_preconditioning_target_stores_learning_observation(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler._handle_timer(
            datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc)
        )
        await self.scheduler._async_observe_preconditioning_temperature(
            self.entity_id,
            datetime(2026, 5, 19, 19, 20, tzinfo=timezone.utc),
            20.8,
        )

        observations = _stored_preconditioning_observations(
            self.data,
            self.entity_id,
            "heat",
        )
        self.assertEqual(self.save_count, 1)
        self.assertEqual(len(observations), 1)
        self.assertEqual(
            observations[0],
            {
                "entity_id": self.entity_id,
                "mode": "heat",
                "created_at": "2026-05-19T19:20:00+00:00",
                "scheduled_time": "2026-05-19T20:00:00+00:00",
                "start_time": "2026-05-19T18:30:00+00:00",
                "target_temp": 21.0,
                "initial_temp": 18.0,
                "observed_temp": 20.8,
                "outdoor_temp_start": None,
                "outdoor_temp_target": None,
                "delta_t": 3.0,
                "startup_minutes": 90,
                "reached": True,
                "minutes_to_reach": 50,
                "quality": "complete",
            },
        )

    async def test_preconditioning_session_stores_local_outdoor_temperature(
        self,
    ) -> None:
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "use_outdoor_temperature": True,
                "outdoor_temperature_entity_id": "sensor.outdoor_temperature",
            }
        )
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.hass.states["sensor.outdoor_temperature"] = SimpleNamespace(
            state="4.5",
            attributes={},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler._handle_timer(
            datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc)
        )
        self.hass.states["sensor.outdoor_temperature"] = SimpleNamespace(
            state="5.2",
            attributes={},
        )
        await self.scheduler._async_observe_preconditioning_temperature(
            self.entity_id,
            datetime(2026, 5, 19, 19, 20, tzinfo=timezone.utc),
            20.8,
        )

        observations = _stored_preconditioning_observations(
            self.data,
            self.entity_id,
            "heat",
        )
        self.assertEqual(len(observations), 1)
        self.assertEqual(observations[0]["outdoor_temp_start"], 4.5)
        self.assertEqual(observations[0]["outdoor_temp_target"], 5.2)

    async def test_partial_preconditioning_progress_stores_learning_observation(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler._handle_timer(
            datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc)
        )
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 19.2},
        )
        await self.scheduler._handle_timer(
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc)
        )

        observations = _stored_preconditioning_observations(
            self.data,
            self.entity_id,
            "heat",
        )
        self.assertEqual(len(observations), 1)
        self.assertEqual(observations[0]["quality"], "partial")
        self.assertEqual(observations[0]["delta_t"], 3.0)
        self.assertIsNone(observations[0]["minutes_to_reach"])

    async def test_active_preconditioning_session_schedules_target_expiration(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler._handle_timer(
            datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc)
        )

        self.assertEqual(
            self.scheduler._calculate_next_action_time(
                datetime(2026, 5, 19, 18, 31, tzinfo=timezone.utc)
            ),
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc),
        )

    async def test_preconditioning_without_useful_progress_stores_partial_floor(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler._handle_timer(
            datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc)
        )
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18.1},
        )
        await self.scheduler._handle_timer(
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc)
        )

        observations = _stored_preconditioning_observations(
            self.data,
            self.entity_id,
            "heat",
        )
        self.assertEqual(len(observations), 1)
        self.assertEqual(observations[0]["quality"], "partial")
        self.assertFalse(observations[0]["reached"])

    async def test_preconditioning_learning_session_is_discarded_by_boost(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        self.climate.snapshots[self.entity_id] = {
            "hvac_mode": "heat",
            "temperature": 18,
        }
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler._handle_timer(
            datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc)
        )
        await self.scheduler.async_set_zone_boost(
            self.entity_id,
            23,
            "2026-05-19T19:30:00+00:00",
            hvac_mode="heat",
        )
        await self.scheduler._async_observe_preconditioning_temperature(
            self.entity_id,
            datetime(2026, 5, 19, 19, 20, tzinfo=timezone.utc),
            20.8,
        )

        observations = _stored_preconditioning_observations(
            self.data,
            self.entity_id,
            "heat",
        )
        self.assertEqual(observations, [])

