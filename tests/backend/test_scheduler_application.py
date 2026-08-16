"""Scheduler application, override, service, and portability behavior tests."""

from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock
from zoneinfo import ZoneInfo

from .helpers import (
    ACTION_SET_TEMPERATURE,
    ACTION_TURN_OFF,
    DEFAULT_PRECONDITIONING_MAX_LEAD_MINUTES,
    DEFAULT_SCHEDULE_TEMPLATES_VERSION,
    EVENT_TYPE_BOOST_ENDED,
    EVENT_TYPE_BOOST_STARTED,
    EVENT_TYPE_CLIMATE_TARGET_APPLIED,
    EVENT_TYPE_COMFORT_ASSESSMENT_CHANGED,
    EVENT_TYPE_PRECONDITIONING_OBSERVATION_RECORDED,
    EVENT_TYPE_PRECONDITIONING_PLAN_CANCELLED,
    EVENT_TYPE_PRECONDITIONING_PLAN_UPDATED,
    EVENT_TYPE_ROOM_SENSOR_ASSIST_RESTORED,
    EVENT_TYPE_ROOM_SENSOR_ASSIST_STATE_CHANGED,
    EVENT_TYPE_ROOM_SENSOR_ASSIST_UPDATED,
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


class VelairSchedulerComfortTest(unittest.IsolatedAsyncioTestCase):
    """Verify local comfort monitoring status and events."""

    def setUp(self) -> None:
        self.entity_id = "climate.salon"
        self.hass = FakeHass()
        self.climate = FakeClimateManager()
        self.save_count = 0
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
        self.scheduler = VelairScheduler(
            self.hass,
            self.data,
            self.climate,
            self._async_save,
        )

    async def _async_save(self) -> None:
        self.save_count += 1

    async def test_comfort_assessment_uses_climate_and_configured_sensors(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 22, "current_humidity": 45},
        )
        self.hass.states["sensor.salon_co2"] = SimpleNamespace(
            state="850",
            attributes={},
        )
        await self.scheduler.async_update_zone_comfort(
            self.entity_id,
            {
                "enabled": True,
                "co2_entity_id": "sensor.salon_co2",
                "temperature_min": 20,
                "temperature_max": 24,
                "humidity_min": 40,
                "humidity_max": 60,
                "co2_attention": 1000,
                "co2_poor": 1500,
            },
        )

        assessment = self.scheduler.get_comfort_assessments()[self.entity_id]

        self.assertEqual(assessment["condition"], "comfortable")
        self.assertEqual(assessment["air_quality"], "good")
        self.assertEqual(assessment["data_quality"], "complete")
        self.assertEqual(assessment["data_issues"], [])
        self.assertEqual(assessment["temperature"]["value"], 22.0)
        self.assertEqual(assessment["humidity"]["value"], 45.0)
        self.assertEqual(assessment["co2"]["value"], 850.0)

    async def test_comfort_listener_tracks_only_enabled_zones(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 22},
        )

        self.assertEqual(self.scheduler._comfort_candidate_entities(), set())

        await self.scheduler.async_update_zone_comfort(
            self.entity_id,
            {
                "enabled": True,
                "temperature_entity_id": "sensor.salon_temperature",
            },
        )

        self.assertEqual(
            self.scheduler._comfort_candidate_entities(),
            {self.entity_id, "sensor.salon_temperature"},
        )

    async def test_comfort_ignores_disabled_humidity_source(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 22, "current_humidity": 75},
        )
        await self.scheduler.async_update_zone_comfort(
            self.entity_id,
            {
                "enabled": True,
                "humidity_enabled": False,
                "humidity_entity_id": "sensor.salon_humidity",
            },
        )

        assessment = self.scheduler.get_comfort_assessments()[self.entity_id]

        self.assertEqual(assessment["condition"], "comfortable")
        self.assertEqual(
            assessment["humidity"]["availability"],
            "not_monitored",
        )
        self.assertEqual(assessment["data_quality"], "complete")
        self.assertNotIn(
            "sensor.salon_humidity",
            self.scheduler._comfort_candidate_entities(),
        )

    async def test_comfort_assessment_change_fires_automation_event(self) -> None:
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="22",
            attributes={},
        )
        await self.scheduler.async_update_zone_comfort(
            self.entity_id,
            {
                "enabled": True,
                "temperature_entity_id": "sensor.salon_temperature",
                "temperature_min": 20,
                "temperature_max": 24,
            },
        )
        self.hass.bus.events.clear()

        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="26",
            attributes={},
        )
        self.scheduler._handle_comfort_state_change(
            SimpleNamespace(data={"entity_id": "sensor.salon_temperature"})
        )

        self.assertEqual(len(self.hass.bus.events), 1)
        event_type, event_data = self.hass.bus.events[0]
        self.assertEqual(event_type, EVENT_VELAIR)
        self.assertEqual(
            event_data["event"],
            EVENT_TYPE_COMFORT_ASSESSMENT_CHANGED,
        )
        self.assertEqual(event_data["entity_id"], self.entity_id)
        self.assertEqual(event_data["condition"], "hot")
        self.assertEqual(event_data["air_quality"], "not_monitored")
        self.assertEqual(event_data["data_quality"], "complete")
        self.assertEqual(event_data["data_issues"], [])

    async def test_comfort_event_reports_partial_assessment_when_sensor_is_missing(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 22},
        )
        self.hass.states["sensor.salon_humidity"] = SimpleNamespace(
            state="45",
            attributes={},
        )
        await self.scheduler.async_update_zone_comfort(
            self.entity_id,
            {
                "enabled": True,
                "humidity_entity_id": "sensor.salon_humidity",
                "temperature_min": 20,
                "temperature_max": 24,
                "humidity_min": 40,
                "humidity_max": 60,
            },
        )
        self.hass.bus.events.clear()

        del self.hass.states["sensor.salon_humidity"]
        self.scheduler._handle_comfort_state_change(
            SimpleNamespace(data={"entity_id": "sensor.salon_humidity"})
        )

        self.assertEqual(len(self.hass.bus.events), 1)
        _, event_data = self.hass.bus.events[0]
        self.assertEqual(
            event_data["event"],
            EVENT_TYPE_COMFORT_ASSESSMENT_CHANGED,
        )
        self.assertEqual(event_data["condition"], "temperature_comfortable")
        self.assertEqual(event_data["data_quality"], "partial")
        self.assertEqual(event_data["data_issues"], ["humidity_missing"])

    async def test_comfort_uses_current_humidity_when_temperature_is_missing(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_humidity": 45},
        )
        await self.scheduler.async_update_zone_comfort(
            self.entity_id,
            {
                "enabled": True,
                "temperature_min": 20,
                "temperature_max": 24,
                "humidity_min": 40,
                "humidity_max": 60,
            },
        )

        assessment = self.scheduler.get_comfort_assessments()[self.entity_id]

        self.assertEqual(assessment["condition"], "humidity_comfortable")
        self.assertEqual(assessment["temperature"]["availability"], "missing")
        self.assertEqual(assessment["humidity"]["condition"], "comfortable")
        self.assertEqual(assessment["data_quality"], "partial")
        self.assertEqual(
            assessment["data_issues"],
            ["temperature_missing"],
        )

    async def test_comfort_uses_climate_humidity_attribute(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 22, "humidity": 45},
        )
        await self.scheduler.async_update_zone_comfort(
            self.entity_id,
            {"enabled": True},
        )

        assessment = self.scheduler.get_comfort_assessments()[self.entity_id]

        self.assertEqual(assessment["condition"], "comfortable")
        self.assertEqual(assessment["humidity"]["availability"], "current")
        self.assertEqual(assessment["humidity"]["value"], 45.0)
        self.assertEqual(assessment["data_quality"], "complete")

    async def test_comfort_marks_exposed_non_numeric_humidity_as_missing(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={
                "current_temperature": 22,
                "current_humidity": "unknown",
            },
        )
        await self.scheduler.async_update_zone_comfort(
            self.entity_id,
            {"enabled": True},
        )

        assessment = self.scheduler.get_comfort_assessments()[self.entity_id]

        self.assertEqual(assessment["condition"], "temperature_comfortable")
        self.assertEqual(assessment["humidity"]["availability"], "missing")
        self.assertEqual(assessment["data_quality"], "partial")
        self.assertEqual(assessment["data_issues"], ["humidity_missing"])

    async def test_comfort_has_no_readings_when_all_sources_are_stale(self) -> None:
        original_now = scheduler_module.dt_util.now
        now = datetime(2026, 7, 8, 18, 0, tzinfo=timezone.utc)
        scheduler_module.dt_util.now = lambda: now
        self.addCleanup(setattr, scheduler_module.dt_util, "now", original_now)
        stale_updated = now - timedelta(minutes=121)
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_humidity": 45},
            last_updated=stale_updated,
        )
        await self.scheduler.async_update_zone_comfort(
            self.entity_id,
            {
                "enabled": True,
                "stale_after_minutes": 120,
            },
        )

        assessment = self.scheduler.get_comfort_assessments()[self.entity_id]

        self.assertEqual(assessment["condition"], "no_readings")
        self.assertEqual(assessment["temperature"]["availability"], "stale")
        self.assertEqual(assessment["humidity"]["availability"], "stale")
        self.assertEqual(assessment["data_quality"], "stale")
        self.assertEqual(
            assessment["data_issues"],
            ["humidity_stale", "temperature_stale"],
        )

    async def test_comfort_value_change_refreshes_state_without_automation_event(self) -> None:
        original_dispatcher = scheduler_module.async_dispatcher_send
        dispatcher = Mock()
        scheduler_module.async_dispatcher_send = dispatcher
        self.addCleanup(
            setattr,
            scheduler_module,
            "async_dispatcher_send",
            original_dispatcher,
        )
        self.hass.states["sensor.salon_humidity"] = SimpleNamespace(
            state="40",
            attributes={},
        )
        await self.scheduler.async_update_zone_comfort(
            self.entity_id,
            {
                "enabled": True,
                "humidity_entity_id": "sensor.salon_humidity",
                "humidity_min": 40,
                "humidity_max": 60,
            },
        )
        self.hass.bus.events.clear()
        dispatcher.reset_mock()

        self.hass.states["sensor.salon_humidity"] = SimpleNamespace(
            state="45",
            attributes={},
        )
        self.scheduler._handle_comfort_state_change(
            SimpleNamespace(data={"entity_id": "sensor.salon_humidity"})
        )

        dispatcher.assert_called_once()
        self.assertEqual(self.hass.bus.events, [])
        assessment = self.scheduler.get_comfort_assessments()[self.entity_id]
        self.assertEqual(assessment["condition"], "humidity_comfortable")
        self.assertEqual(assessment["humidity"]["value"], 45.0)

    def test_comfort_combines_temperature_and_humidity_conditions(self) -> None:
        combinations = {
            ("cold", "dry"): "cold_and_dry",
            ("cold", "comfortable"): "cold",
            ("cold", "humid"): "cold_and_humid",
            ("comfortable", "dry"): "dry",
            ("comfortable", "comfortable"): "comfortable",
            ("comfortable", "humid"): "humid",
            ("hot", "dry"): "hot_and_dry",
            ("hot", "comfortable"): "hot",
            ("hot", "humid"): "hot_and_humid",
        }

        for (temperature, humidity), expected in combinations.items():
            with self.subTest(temperature=temperature, humidity=humidity):
                condition = self.scheduler._comfort_environment_condition(
                    {
                        "availability": "current",
                        "condition": temperature,
                    },
                    {
                        "availability": "current",
                        "condition": humidity,
                    },
                )
                self.assertEqual(condition, expected)

    async def test_comfort_reports_each_air_quality_level(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 22},
        )
        self.hass.states["sensor.salon_co2"] = SimpleNamespace(
            state="850",
            attributes={},
        )
        await self.scheduler.async_update_zone_comfort(
            self.entity_id,
            {
                "enabled": True,
                "co2_entity_id": "sensor.salon_co2",
                "co2_attention": 1000,
                "co2_poor": 1500,
            },
        )

        for value, expected in ((850, "good"), (1200, "elevated"), (1700, "poor")):
            with self.subTest(value=value):
                self.hass.states["sensor.salon_co2"] = SimpleNamespace(
                    state=str(value),
                    attributes={},
                )
                assessment = self.scheduler.get_comfort_assessments()[self.entity_id]
                self.assertEqual(assessment["air_quality"], expected)

    async def test_comfort_enable_preserves_existing_sensor_config(self) -> None:
        await self.scheduler.async_update_zone_comfort(
            self.entity_id,
            {
                "enabled": False,
                "temperature_entity_id": "sensor.salon_temperature",
                "humidity_entity_id": "sensor.salon_humidity",
                "co2_entity_id": "sensor.salon_co2",
            },
        )

        settings = await self.scheduler.async_update_zone_comfort(
            self.entity_id,
            {"enabled": True},
        )

        self.assertTrue(settings["enabled"])
        self.assertTrue(settings["humidity_enabled"])
        self.assertEqual(settings["temperature_entity_id"], "sensor.salon_temperature")
        self.assertEqual(settings["humidity_entity_id"], "sensor.salon_humidity")
        self.assertEqual(settings["co2_entity_id"], "sensor.salon_co2")


class VelairSchedulerSavedScheduleTest(unittest.IsolatedAsyncioTestCase):
    """Verify when saved schedules should be applied immediately."""

    def setUp(self) -> None:
        self.entity_id = "climate.salon"
        self.hass = FakeHass()
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat", attributes={"current_temperature": 20}
        )
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

    async def test_temperature_migration_blocks_mode_changes_before_side_effects(
        self,
    ) -> None:
        self.scheduler._room_sensor_assist_states[self.entity_id] = object()
        self.scheduler.set_temperature_migration_blocked(True)

        for mode, apply_current_schedule in (
            (MODE_PAUSED, False),
            (MODE_AUTO, True),
        ):
            with self.subTest(mode=mode):
                with self.assertRaisesRegex(ValueError, "Temperature migration"):
                    await self.scheduler.async_set_mode(
                        mode,
                        apply_current_schedule=apply_current_schedule,
                    )

        self.assertEqual(self.data["global_"]["mode"], MODE_AUTO)
        self.assertEqual(self.climate.calls, [])
        self.assertEqual(self.save_count, 0)
        self.assertIn(self.entity_id, self.scheduler._room_sensor_assist_states)

    async def test_mode_room_assist_failure_restores_auto_authority(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        async def fail_clear(*_args, **_kwargs) -> None:
            raise RuntimeError("restore failed")

        self.scheduler._async_clear_room_sensor_assist = fail_clear
        with self.assertRaisesRegex(RuntimeError, "restore failed"):
            await self.scheduler.async_set_mode(MODE_PAUSED)

        self.assertEqual(self.data["global_"]["mode"], MODE_AUTO)
        self.assertEqual(self.climate.calls, [])
        self.assertTrue(self.scheduler._climate_delivery.is_deferred(self.entity_id))

    async def test_schedule_save_cancellation_restores_data_and_eligibility(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        before = deepcopy(self.data)
        save_started = asyncio.Event()

        async def wait_forever() -> None:
            save_started.set()
            await asyncio.Event().wait()

        self.scheduler._async_save_data = wait_forever
        task = asyncio.create_task(
            self.scheduler.async_set_daily_schedule(
                self.entity_id,
                "tuesday",
                [
                    {
                        "start": "17:00",
                        "action": ACTION_SET_TEMPERATURE,
                        "temperature": 24,
                        "hvac_mode": "cool",
                    }
                ],
            )
        )
        await save_started.wait()
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task

        self.assertEqual(self.data, before)
        self.assertEqual(self.climate.calls, [])
        self.assertTrue(self.scheduler._climate_delivery.is_deferred(self.entity_id))

    async def test_expired_global_mode_cancellation_restores_auto_intent(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        self.data["global_"]["mode"] = MODE_AUTO
        self.data["global_"]["paused_until"] = "2026-05-19T17:00:00+00:00"
        before = deepcopy(self.data)
        save_started = asyncio.Event()

        async def wait_forever() -> None:
            save_started.set()
            await asyncio.Event().wait()

        self.scheduler._async_save_data = wait_forever
        task = asyncio.create_task(
            self.scheduler._async_clear_expired_global_mode(NOW)
        )
        await save_started.wait()
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task

        self.assertEqual(self.data, before)
        self.assertEqual(self.climate.calls, [])
        self.assertTrue(self.scheduler._climate_delivery.is_deferred(self.entity_id))

    async def test_queued_timer_does_not_apply_after_migration_block(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "18:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        self.scheduler.set_temperature_migration_blocked(True)

        await self.scheduler._handle_timer(NOW)

        self.assertEqual(self.climate.calls, [])

    async def test_queued_turn_off_keeps_assist_recovery_state_when_blocked(self) -> None:
        assist_state = object()
        self.scheduler._room_sensor_assist_states[self.entity_id] = assist_state
        self.scheduler.set_temperature_migration_blocked(True)
        event = scheduler_module.ClimateEvent(
            entity_id=self.entity_id,
            when=NOW,
            temperature=None,
            weekday="tuesday",
            start="18:00",
            action=ACTION_TURN_OFF,
        )

        await self.scheduler._async_apply_event(event)

        self.assertIs(
            self.scheduler._room_sensor_assist_states[self.entity_id], assist_state
        )
        self.assertEqual(self.climate.calls, [])

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

    async def test_saving_today_applies_supported_optional_climate_settings(self) -> None:
        self.climate.climate_options[self.entity_id] = {
            "fan_mode": ["auto", "low"],
            "preset_mode": ["sleep"],
            "swing_mode": ["off", "vertical"],
            "swing_horizontal_mode": ["auto"],
            "humidity": ["30", "60"],
        }

        await self.scheduler.async_set_daily_schedule(
            self.entity_id,
            "tuesday",
            [
                {
                    "start": "17:00",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 24,
                    "hvac_mode": "cool",
                    "fan_mode": "low",
                    "preset_mode": "sleep",
                    "swing_mode": "vertical",
                    "swing_horizontal_mode": "auto",
                    "humidity": 50,
                }
            ],
        )

        self.assertEqual(
            self.climate.calls,
            [
                (
                    "set_temperature",
                    self.entity_id,
                    24,
                    True,
                    "cool",
                    {
                        "fan_mode": "low",
                        "humidity": 50.0,
                        "preset_mode": "sleep",
                        "swing_mode": "vertical",
                        "swing_horizontal_mode": "auto",
                    },
                )
            ],
        )

    async def test_saving_schedule_drops_unsupported_optional_climate_settings(self) -> None:
        self.climate.climate_options[self.entity_id] = {
            "fan_mode": ["auto"],
            "preset_mode": ["eco"],
            "swing_mode": ["off"],
            "humidity": ["30", "60"],
        }

        await self.scheduler.async_set_daily_schedule(
            self.entity_id,
            "wednesday",
            [
                {
                    "start": "22:00",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 24,
                    "hvac_mode": "cool",
                    "fan_mode": "low",
                    "preset_mode": "sleep",
                    "swing_mode": "vertical",
                    "swing_horizontal_mode": "auto",
                    "humidity": 80,
                }
            ],
        )

        self.assertEqual(
            self.data["zones"][self.entity_id]["schedule"]["wednesday"],
            [
                {
                    "start": "22:00",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 24.0,
                    "hvac_mode": "cool",
                }
            ],
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
            state="heat",
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
            self.scheduler.get_zone_override_status(self.entity_id),
            {
                "state": "boost",
                "started_at": NOW.isoformat(),
                "until": "2026-05-19T20:00:00+00:00",
                "action": None,
            },
        )
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
                    "restoration": {
                        "type": "previous_state",
                        "state": previous_state,
                    },
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
                    "restoration": {
                        "type": "schedule",
                        "source": "boost_ended",
                        "target": {
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 21.0,
                            "hvac_mode": "heat",
                            "weekday": "tuesday",
                            "start": "17:00",
                        },
                    },
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

    async def test_boost_save_failure_rolls_back_without_immediate_redelivery(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        self.climate.snapshots[self.entity_id] = {
            "hvac_mode": "heat",
            "temperature": 21,
        }
        before = deepcopy(self.data)

        async def fail_save() -> None:
            raise RuntimeError("storage unavailable")

        self.scheduler._async_save_data = fail_save
        with self.assertRaisesRegex(RuntimeError, "storage unavailable"):
            await self.scheduler.async_set_zone_boost(
                self.entity_id,
                23,
                "2026-05-19T20:00:00+00:00",
                hvac_mode="heat",
            )

        self.assertEqual(self.data, before)
        self.assertEqual(self.climate.calls, [])
        self.assertTrue(self.scheduler._climate_delivery.is_deferred(self.entity_id))

    async def test_pause_cancelled_during_save_restores_authority_and_data(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        before = deepcopy(self.data)
        save_started = asyncio.Event()

        async def wait_forever() -> None:
            save_started.set()
            await asyncio.Event().wait()

        self.scheduler._async_save_data = wait_forever
        task = asyncio.create_task(self.scheduler.async_pause_zone(self.entity_id))
        await save_started.wait()
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task

        self.assertEqual(self.data, before)
        self.assertEqual(self.climate.calls, [])
        self.assertTrue(self.scheduler._climate_delivery.is_deferred(self.entity_id))

    async def test_resume_save_failure_restores_turn_off_pause_eligibility(self) -> None:
        override = {
            "type": "pause",
            "started_at": NOW.isoformat(),
            "action": ZONE_PAUSE_ACTION_TURN_OFF,
        }
        self.data["zones"][self.entity_id]["pauses"] = [
            {
                "started_at": NOW.isoformat(),
                "action": ZONE_PAUSE_ACTION_TURN_OFF,
            }
        ]
        self.data["zones"][self.entity_id]["override"] = override

        async def fail_save() -> None:
            raise RuntimeError("storage unavailable")

        self.scheduler._async_save_data = fail_save
        with self.assertRaisesRegex(RuntimeError, "storage unavailable"):
            await self.scheduler.async_resume_zone(self.entity_id)

        self.assertEqual(self.data["zones"][self.entity_id]["override"], override)
        self.assertEqual(self.climate.calls, [])
        self.assertTrue(self.scheduler._climate_delivery.is_deferred(self.entity_id))

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

    async def test_saving_inherited_source_day_applies_changed_block(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["monday"] = [
            {"start": "17:00", "temperature": 20, "hvac_mode": "heat"}
        ]

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

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 22.0, True, "heat")],
        )

    async def test_saving_future_day_does_not_reapply_current_block(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["monday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 22,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler.async_set_daily_schedule(
            self.entity_id,
            "wednesday",
            [{"start": "17:00", "temperature": 20, "hvac_mode": "heat"}],
        )

        self.assertEqual(self.climate.calls, [])

    async def test_future_and_identical_saves_preserve_active_runtime_state(
        self,
    ) -> None:
        current_blocks = [
            {"start": "17:00", "temperature": 21, "hvac_mode": "heat"}
        ]
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = deepcopy(
            current_blocks
        )
        assist_state = scheduler_module._RoomSensorAssistState(
            entity_id=self.entity_id,
            target_temperature=21.0,
            applied_temperature=22.0,
            applied_offset=1.0,
            direction="heat",
            hvac_mode="heat",
            room_temperature_entity_id="sensor.salon_temperature",
            weekday="tuesday",
            start="17:00",
        )
        session = scheduler_module._PreconditioningSession(
            entity_id=self.entity_id,
            direction="heat",
            started_at=NOW,
            target_when=NOW + timedelta(hours=1),
            weekday="tuesday",
            start="17:00",
            target_temperature=21.0,
            target_kind="scalar",
            target_boundary="temperature",
            start_temperature=18.0,
            hvac_mode="heat",
            startup_minutes=60,
            outdoor_temp_start=None,
        )
        self.scheduler._room_sensor_assist_states[self.entity_id] = assist_state
        self.scheduler._preconditioning_sessions[self.entity_id] = session

        await self.scheduler.async_set_daily_schedule(
            self.entity_id,
            "wednesday",
            [{"start": "09:00", "temperature": 19, "hvac_mode": "heat"}],
        )
        await self.scheduler.async_set_daily_schedule(
            self.entity_id,
            "tuesday",
            deepcopy(current_blocks),
        )

        self.assertIs(
            self.scheduler._room_sensor_assist_states[self.entity_id],
            assist_state,
        )
        self.assertIs(
            self.scheduler._preconditioning_sessions[self.entity_id],
            session,
        )
        self.assertNotIn(
            self.entity_id,
            self.scheduler._room_sensor_assist_suppressed,
        )
        self.assertEqual(self.climate.calls, [])

    async def test_same_intent_new_source_updates_assist_metadata_without_service(
        self,
    ) -> None:
        schedule = self.data["zones"][self.entity_id]["schedule"]
        schedule["monday"] = [
            {"start": "08:00", "temperature": 21, "hvac_mode": "heat"}
        ]
        schedule["tuesday"] = [
            {"start": "17:00", "temperature": 21, "hvac_mode": "heat"}
        ]
        state = scheduler_module._RoomSensorAssistState(
            entity_id=self.entity_id,
            target_temperature=21.0,
            applied_temperature=22.0,
            applied_offset=1.0,
            direction="heat",
            hvac_mode="heat",
            room_temperature_entity_id="sensor.salon_temperature",
            weekday="tuesday",
            start="17:00",
        )
        self.scheduler._room_sensor_assist_states[self.entity_id] = state

        async def update_metadata(entity_id: str) -> None:
            event = self.scheduler.get_current_event(entity_id)
            self.scheduler._room_sensor_assist_states[entity_id] = (
                scheduler_module._RoomSensorAssistState(
                    entity_id=state.entity_id,
                    target_temperature=state.target_temperature,
                    applied_temperature=state.applied_temperature,
                    applied_offset=state.applied_offset,
                    direction=state.direction,
                    hvac_mode=state.hvac_mode,
                    room_temperature_entity_id=state.room_temperature_entity_id,
                    weekday=event.weekday,
                    start=event.start,
                )
            )

        self.scheduler._async_refresh_room_sensor_assist_from_current_event = (
            update_metadata
        )

        await self.scheduler.async_clear_schedule(self.entity_id, "tuesday")

        refreshed = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertEqual((refreshed.weekday, refreshed.start), ("monday", "08:00"))
        self.assertEqual(self.climate.calls, [])

    async def test_copying_same_intent_to_today_only_updates_source(self) -> None:
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

        self.assertEqual(self.climate.calls, [])
        event = self.scheduler.get_current_event(self.entity_id)
        self.assertEqual((event.weekday, event.start), ("tuesday", "17:00"))

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

    async def test_copying_to_inherited_source_day_applies_changed_block(self) -> None:
        schedule = self.data["zones"][self.entity_id]["schedule"]
        schedule["monday"] = [
            {"start": "17:00", "temperature": 22, "hvac_mode": "heat"}
        ]
        schedule["sunday"] = [
            {"start": "17:00", "temperature": 20, "hvac_mode": "heat"}
        ]

        await self.scheduler.async_copy_day_schedule(
            self.entity_id,
            "sunday",
            ["monday"],
        )

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 20, True, "heat")],
        )

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
        self.assertEqual(
            self.scheduler.get_zone_override_status(self.entity_id),
            {
                "state": "paused",
                "started_at": NOW.isoformat(),
                "until": None,
                "action": "none",
                "pause_count": 1,
                "pause_ids": [],
                "manual": True,
                "pauses": [
                    {
                        "started_at": NOW.isoformat(),
                        "action": "none",
                    }
                ],
            },
        )
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

    async def test_owned_zone_pause_is_persisted_and_exposed(self) -> None:
        await self.scheduler.async_pause_zone(
            self.entity_id,
            pause_id=" window_guard ",
        )

        self.assertEqual(
            self.data["zones"][self.entity_id]["override"]["pause_id"],
            "window_guard",
        )
        self.assertEqual(
            self.scheduler.get_zone_override_status(self.entity_id)["pause_id"],
            "window_guard",
        )
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
                    "pause_id": "window_guard",
                },
            ),
            self.hass.bus.events,
        )

    async def test_owned_pause_upserts_without_replacing_other_reasons(
        self,
    ) -> None:
        clear_assist = AsyncMock()
        invalidate_delivery = Mock()
        self.scheduler._async_clear_room_sensor_assist = clear_assist
        self.scheduler._invalidate_climate_delivery = invalidate_delivery

        for current_pause_id in (None, "same_owner", "other_owner"):
            with self.subTest(current_pause_id=current_pause_id):
                override = {
                    "type": "pause",
                    "started_at": "2026-05-19T17:00:00+00:00",
                    "action": "none",
                }
                if current_pause_id is not None:
                    override["pause_id"] = current_pause_id
                self.data["zones"][self.entity_id]["override"] = override.copy()
                self.data["zones"][self.entity_id]["pauses"] = [
                    {key: value for key, value in override.items() if key != "type"}
                ]
                previous_save_count = self.save_count
                previous_event_count = len(self.hass.bus.events)

                await self.scheduler.async_pause_zone(
                    self.entity_id,
                    until="2026-05-19T22:00:00+00:00",
                    action=ZONE_PAUSE_ACTION_TURN_OFF,
                    pause_id=(
                        "same_owner"
                        if current_pause_id == "same_owner"
                        else "new_owner"
                    ),
                )

                reasons = self.data["zones"][self.entity_id]["pauses"]
                expected_count = 1 if current_pause_id == "same_owner" else 2
                self.assertEqual(len(reasons), expected_count)
                self.assertEqual(self.save_count, previous_save_count + 1)
                self.assertGreater(len(self.hass.bus.events), previous_event_count)

        self.assertEqual(clear_assist.await_count, 3)
        self.assertEqual(invalidate_delivery.call_count, 3)

    async def test_manual_pause_can_replace_owned_pause(self) -> None:
        self.data["zones"][self.entity_id]["override"] = {
            "type": "pause",
            "started_at": "2026-05-19T17:00:00+00:00",
            "action": "none",
            "pause_id": "window_guard",
        }

        await self.scheduler.async_pause_zone(
            self.entity_id,
            action=ZONE_PAUSE_ACTION_TURN_OFF,
        )

        override = self.data["zones"][self.entity_id]["override"]
        self.assertEqual(override["action"], ZONE_PAUSE_ACTION_TURN_OFF)
        self.assertNotIn("pause_id", override)

    async def test_concurrent_owned_pauses_are_serialized(self) -> None:
        save_started = asyncio.Event()
        allow_save = asyncio.Event()

        async def blocking_save() -> None:
            self.save_count += 1
            save_started.set()
            await allow_save.wait()

        self.scheduler._async_save_data = blocking_save
        first = asyncio.create_task(
            self.scheduler.async_pause_zone(
                self.entity_id,
                pause_id="first_owner",
            )
        )
        await save_started.wait()
        second = asyncio.create_task(
            self.scheduler.async_pause_zone(
                self.entity_id,
                pause_id="second_owner",
            )
        )
        await asyncio.sleep(0)
        self.assertFalse(second.done())

        allow_save.set()
        await asyncio.gather(first, second)

        self.assertEqual(self.save_count, 2)
        self.assertEqual(
            [item["pause_id"] for item in self.data["zones"][self.entity_id]["pauses"]],
            ["first_owner", "second_owner"],
        )

    async def test_selective_resume_keeps_other_pause_without_reapplying_schedule(self) -> None:
        await self.scheduler.async_pause_zone(self.entity_id, pause_id="window")
        await self.scheduler.async_pause_zone(
            self.entity_id,
            pause_id="occupancy",
            action=ZONE_PAUSE_ACTION_TURN_OFF,
        )
        self.climate.calls.clear()

        await self.scheduler.async_resume_zone(self.entity_id, pause_id="window")

        self.assertEqual(
            [item["pause_id"] for item in self.data["zones"][self.entity_id]["pauses"]],
            ["occupancy"],
        )
        self.assertEqual(
            self.data["zones"][self.entity_id]["override"]["action"],
            ZONE_PAUSE_ACTION_TURN_OFF,
        )
        self.assertEqual(self.climate.calls, [])

    async def test_manual_pause_reports_owned_reasons_it_replaces(self) -> None:
        await self.scheduler.async_pause_zone(self.entity_id, pause_id="window")
        await self.scheduler.async_pause_zone(self.entity_id, pause_id="occupancy")
        self.hass.bus.events.clear()

        await self.scheduler.async_pause_zone(self.entity_id)

        removed = [
            data
            for event_type, data in self.hass.bus.events
            if event_type == EVENT_VELAIR and data.get("event") == "zone_pause_removed"
        ]
        self.assertEqual(
            {(item["pause_id"], item["reason"]) for item in removed},
            {("window", "replaced"), ("occupancy", "replaced")},
        )
        added = [
            data
            for event_type, data in self.hass.bus.events
            if event_type == EVENT_VELAIR and data.get("event") == "zone_pause_added"
        ]
        self.assertEqual(len(added), 1)
        self.assertNotIn("pause_id", added[0])

    async def test_same_pause_id_replay_is_noop_and_changed_reason_updates(self) -> None:
        await self.scheduler.async_pause_zone(self.entity_id, pause_id="window")
        saves = self.save_count
        await self.scheduler.async_pause_zone(self.entity_id, pause_id="window")
        self.assertEqual(self.save_count, saves)

        await self.scheduler.async_pause_zone(
            self.entity_id,
            pause_id="window",
            action=ZONE_PAUSE_ACTION_TURN_OFF,
        )
        self.assertEqual(self.save_count, saves + 1)
        self.assertEqual(len(self.data["zones"][self.entity_id]["pauses"]), 1)
        self.assertEqual(
            self.data["zones"][self.entity_id]["pauses"][0]["action"],
            ZONE_PAUSE_ACTION_TURN_OFF,
        )

    async def test_additional_turn_off_reason_does_not_repeat_physical_off(self) -> None:
        await self.scheduler.async_pause_zone(
            self.entity_id,
            pause_id="window",
            action=ZONE_PAUSE_ACTION_TURN_OFF,
        )
        self.assertEqual(self.climate.calls, [("turn_off", self.entity_id)])
        self.climate.calls.clear()

        await self.scheduler.async_pause_zone(
            self.entity_id,
            pause_id="occupancy",
            action=ZONE_PAUSE_ACTION_TURN_OFF,
        )

        self.assertEqual(self.climate.calls, [])
        self.assertEqual(len(self.data["zones"][self.entity_id]["pauses"]), 2)

    async def test_expiry_removes_only_due_pause_reason(self) -> None:
        self.data["zones"][self.entity_id]["pauses"] = [
            {
                "started_at": "2026-05-19T16:00:00+00:00",
                "until": "2026-05-19T17:00:00+00:00",
                "action": "none",
                "pause_id": "window",
            },
            {
                "started_at": "2026-05-19T16:30:00+00:00",
                "until": "2026-05-19T19:00:00+00:00",
                "action": "none",
                "pause_id": "occupancy",
            },
        ]
        self.data["zones"][self.entity_id]["override"] = {
            "type": "pause",
            "started_at": "2026-05-19T16:00:00+00:00",
            "until": "2026-05-19T19:00:00+00:00",
            "action": "none",
        }

        expired = await self.scheduler._async_clear_expired_zone_overrides(NOW)

        self.assertEqual(expired, {})
        self.assertEqual(
            [item["pause_id"] for item in self.data["zones"][self.entity_id]["pauses"]],
            ["occupancy"],
        )

    async def test_pause_waits_for_concurrent_boost_mutation(self) -> None:
        self.climate.snapshots[self.entity_id] = {
            "hvac_mode": "heat",
            "temperature": 20,
        }
        save_started = asyncio.Event()
        allow_save = asyncio.Event()

        async def blocking_save() -> None:
            self.save_count += 1
            if self.save_count == 1:
                save_started.set()
                await allow_save.wait()

        self.scheduler._async_save_data = blocking_save
        boost = asyncio.create_task(
            self.scheduler.async_set_zone_boost(
                self.entity_id,
                23,
                "2026-05-19T20:00:00+00:00",
                hvac_mode="heat",
            )
        )
        await save_started.wait()
        pause = asyncio.create_task(
            self.scheduler.async_pause_zone(
                self.entity_id,
                pause_id="window_guard",
            )
        )
        await asyncio.sleep(0)
        self.assertFalse(pause.done())

        allow_save.set()
        await asyncio.gather(boost, pause)

        self.assertEqual(
            self.data["zones"][self.entity_id]["override"]["pause_id"],
            "window_guard",
        )
        self.assertTrue(
            any(
                event_type == EVENT_VELAIR
                and data.get("event") == EVENT_TYPE_BOOST_ENDED
                and data.get("reason") == "zone_paused"
                for event_type, data in self.hass.bus.events
            )
        )

    async def test_pause_waits_for_concurrent_boost_cancellation(self) -> None:
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
        save_started = asyncio.Event()
        allow_save = asyncio.Event()

        async def blocking_save() -> None:
            self.save_count += 1
            save_started.set()
            await allow_save.wait()

        self.scheduler._async_save_data = blocking_save
        cancel = asyncio.create_task(
            self.scheduler.async_cancel_zone_boost(self.entity_id)
        )
        await save_started.wait()
        pause = asyncio.create_task(
            self.scheduler.async_pause_zone(
                self.entity_id,
                pause_id="window_guard",
            )
        )
        await asyncio.sleep(0)
        self.assertFalse(pause.done())

        allow_save.set()
        await asyncio.gather(cancel, pause)

        self.assertEqual(
            self.data["zones"][self.entity_id]["override"]["pause_id"],
            "window_guard",
        )

    async def test_expiry_rechecks_after_concurrent_pause_mutation(self) -> None:
        self.data["zones"][self.entity_id]["override"] = {
            "type": "pause",
            "started_at": "2026-05-19T16:00:00+00:00",
            "until": "2026-05-19T17:00:00+00:00",
            "action": "none",
        }
        save_started = asyncio.Event()
        allow_save = asyncio.Event()

        async def blocking_save() -> None:
            self.save_count += 1
            save_started.set()
            await allow_save.wait()

        self.scheduler._async_save_data = blocking_save
        pause = asyncio.create_task(
            self.scheduler.async_pause_zone(
                self.entity_id,
                pause_id="window_guard",
            )
        )
        await save_started.wait()
        expiry = asyncio.create_task(
            self.scheduler._async_clear_expired_zone_overrides(NOW)
        )
        await asyncio.sleep(0)
        self.assertTrue(expiry.done())

        allow_save.set()
        await pause
        expired = await expiry

        self.assertEqual(expired, {})
        self.assertEqual(
            self.data["zones"][self.entity_id]["override"]["pause_id"],
            "window_guard",
        )

    async def test_expiry_waits_for_concurrent_resume_mutation(self) -> None:
        self.data["zones"][self.entity_id]["override"] = {
            "type": "pause",
            "started_at": "2026-05-19T16:00:00+00:00",
            "until": "2026-05-19T17:00:00+00:00",
            "action": "none",
        }
        save_started = asyncio.Event()
        allow_save = asyncio.Event()

        async def blocking_save() -> None:
            self.save_count += 1
            save_started.set()
            await allow_save.wait()

        self.scheduler._async_save_data = blocking_save
        resume = asyncio.create_task(
            self.scheduler.async_resume_zone(
                self.entity_id,
                apply_current_schedule=False,
            )
        )
        await save_started.wait()
        expiry = asyncio.create_task(
            self.scheduler._async_clear_expired_zone_overrides(NOW)
        )
        await asyncio.sleep(0)
        self.assertTrue(expiry.done())

        allow_save.set()
        await resume
        expired = await expiry

        self.assertEqual(expired, {})
        self.assertIsNone(self.data["zones"][self.entity_id]["override"])

    async def test_expiry_does_not_wait_for_unrelated_zone_lock(self) -> None:
        second_entity_id = "climate.second"
        self.data["zones"][second_entity_id] = deepcopy(
            self.data["zones"][self.entity_id]
        )
        self.data["zones"][second_entity_id]["override"] = {
            "type": "pause",
            "started_at": "2026-05-19T16:00:00+00:00",
            "until": "2026-05-19T17:00:00+00:00",
            "action": "none",
        }
        unrelated_lock = self.scheduler._zone_override_lock(self.entity_id)
        await unrelated_lock.acquire()
        try:
            expired = await asyncio.wait_for(
                self.scheduler._async_clear_expired_zone_overrides(NOW),
                timeout=0.1,
            )
        finally:
            unrelated_lock.release()

        self.assertEqual(set(expired), {second_entity_id})
        self.assertIsNone(self.data["zones"][second_entity_id]["override"])

    async def test_expired_pause_does_not_apply_schedule_over_new_pause(self) -> None:
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
            "started_at": "2026-05-19T16:00:00+00:00",
            "until": "2026-05-19T17:00:00+00:00",
            "action": "none",
        }
        clear_expired = self.scheduler._async_clear_expired_zone_overrides

        async def clear_then_establish_new_pause(now):
            expired = await clear_expired(now)
            await self.scheduler.async_pause_zone(
                self.entity_id,
                pause_id="window_guard",
            )
            return expired

        self.scheduler._async_clear_expired_zone_overrides = (
            clear_then_establish_new_pause
        )

        await self.scheduler._handle_timer(NOW)

        self.assertEqual(self.climate.calls, [])
        self.assertEqual(
            self.data["zones"][self.entity_id]["override"]["pause_id"],
            "window_guard",
        )

    async def test_expired_boost_does_not_restore_state_over_new_pause(self) -> None:
        self.data["zones"][self.entity_id]["override"] = {
            "type": "boost",
            "started_at": "2026-05-19T16:00:00+00:00",
            "until": "2026-05-19T17:00:00+00:00",
            "temperature": 23,
            "previous_state": {"hvac_mode": "heat", "temperature": 20},
        }
        clear_expired = self.scheduler._async_clear_expired_zone_overrides

        async def clear_then_establish_new_pause(now):
            expired = await clear_expired(now)
            await self.scheduler.async_pause_zone(
                self.entity_id,
                pause_id="window_guard",
            )
            return expired

        self.scheduler._async_clear_expired_zone_overrides = (
            clear_then_establish_new_pause
        )

        await self.scheduler._handle_timer(NOW)

        self.assertEqual(self.climate.calls, [])
        self.assertEqual(
            self.data["zones"][self.entity_id]["override"]["pause_id"],
            "window_guard",
        )

    async def test_owned_resume_only_clears_matching_pause(self) -> None:
        await self.scheduler.async_pause_zone(
            self.entity_id,
            pause_id="window_guard",
        )
        previous_save_count = self.save_count
        previous_event_count = len(self.hass.bus.events)

        await self.scheduler.async_resume_zone(
            self.entity_id,
            pause_id="other_owner",
        )

        self.assertIsNotNone(self.data["zones"][self.entity_id]["override"])
        self.assertEqual(self.save_count, previous_save_count)
        self.assertEqual(len(self.hass.bus.events), previous_event_count)

        await self.scheduler.async_resume_zone(
            self.entity_id,
            apply_current_schedule=False,
            pause_id="window_guard",
        )

        self.assertIsNone(self.data["zones"][self.entity_id]["override"])
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
                    "pause_id": "window_guard",
                },
            ),
            self.hass.bus.events,
        )

    async def test_owned_resume_does_not_clear_manual_pause(self) -> None:
        await self.scheduler.async_pause_zone(self.entity_id)
        previous_save_count = self.save_count

        await self.scheduler.async_resume_zone(
            self.entity_id,
            pause_id="window_guard",
        )

        self.assertIsNotNone(self.data["zones"][self.entity_id]["override"])
        self.assertEqual(self.save_count, previous_save_count)

    async def test_service_resume_uses_explicit_event_and_logbook_reason(self) -> None:
        self.hass.services.logbook_enabled = True
        await self.scheduler.async_pause_zone(
            self.entity_id,
            pause_id="window_guard",
        )
        self.hass.bus.events.clear()
        self.hass.services.calls.clear()

        await self.scheduler.async_resume_zone(
            self.entity_id,
            apply_current_schedule=False,
            pause_id="window_guard",
            reason="service",
        )

        resumed = [
            event
            for event in self.hass.bus.events
            if event[1].get("event") == EVENT_TYPE_ZONE_RESUMED
        ]
        self.assertEqual(resumed[0][1]["reason"], "service")
        self.assertEqual(
            self.hass.services.calls[-1][2]["message"],
            "Resumed climate.salon through a service or automation",
        )

    async def test_manual_resume_remains_compatible_with_owned_pause(self) -> None:
        await self.scheduler.async_pause_zone(
            self.entity_id,
            pause_id="window_guard",
        )

        await self.scheduler.async_resume_zone(
            self.entity_id,
            apply_current_schedule=False,
        )

        self.assertIsNone(self.data["zones"][self.entity_id]["override"])

    async def test_invalid_pause_id_is_rejected_before_side_effects(self) -> None:
        clear_assist = AsyncMock()
        self.scheduler._async_clear_room_sensor_assist = clear_assist

        with self.assertRaises(ValueError):
            await self.scheduler.async_pause_zone(
                self.entity_id,
                pause_id="invalid owner",
            )

        self.assertIsNone(self.data["zones"][self.entity_id]["override"])
        self.assertEqual(self.save_count, 0)
        clear_assist.assert_not_awaited()

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

    async def test_resuming_applies_inherited_previous_day_block(self) -> None:
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

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 21.0, True, "heat")],
        )

    async def test_current_event_before_first_today_comes_from_previous_day(
        self,
    ) -> None:
        self.data["zones"][self.entity_id]["schedule"]["monday"] = [
            {"start": "22:00", "temperature": 19, "hvac_mode": "heat"}
        ]
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {"start": "20:00", "temperature": 22, "hvac_mode": "heat"}
        ]

        event = self.scheduler.get_current_event(self.entity_id)

        self.assertIsNotNone(event)
        self.assertEqual(event.temperature, 19)
        self.assertEqual(event.weekday, "monday")
        self.assertEqual(event.start, "22:00")
        self.assertEqual(
            event.when,
            datetime(2026, 5, 18, 22, 0, tzinfo=timezone.utc),
        )

    async def test_current_event_crosses_multiple_empty_days(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["saturday"] = [
            {"start": "09:00", "temperature": 24, "hvac_mode": "cool"}
        ]

        event = self.scheduler.get_current_event(self.entity_id)

        self.assertIsNotNone(event)
        self.assertEqual(event.temperature, 24)
        self.assertEqual(event.weekday, "saturday")
        self.assertEqual(
            event.when,
            datetime(2026, 5, 16, 9, 0, tzinfo=timezone.utc),
        )

    async def test_current_event_wraps_from_sunday_to_monday(self) -> None:
        original_now = scheduler_module.dt_util.now
        monday = datetime(2026, 5, 18, 7, 0, tzinfo=timezone.utc)
        scheduler_module.dt_util.now = lambda: monday
        self.addCleanup(setattr, scheduler_module.dt_util, "now", original_now)
        self.data["zones"][self.entity_id]["schedule"]["sunday"] = [
            {"start": "23:00", "temperature": 20, "hvac_mode": "heat"}
        ]

        event = self.scheduler.get_current_event(self.entity_id)

        self.assertIsNotNone(event)
        self.assertEqual(event.weekday, "sunday")
        self.assertEqual(
            event.when,
            datetime(2026, 5, 17, 23, 0, tzinfo=timezone.utc),
        )

    async def test_current_event_uses_previous_week_before_first_weekly_block(
        self,
    ) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {"start": "20:00", "temperature": 21, "hvac_mode": "heat"}
        ]

        event = self.scheduler.get_current_event(self.entity_id)

        self.assertIsNotNone(event)
        self.assertEqual(event.weekday, "tuesday")
        self.assertEqual(
            event.when,
            datetime(2026, 5, 12, 20, 0, tzinfo=timezone.utc),
        )

    async def test_current_event_is_none_when_entire_week_is_empty(self) -> None:
        self.assertIsNone(self.scheduler.get_current_event(self.entity_id))

    async def test_fall_back_current_and_future_use_utc_order_without_duplicate(
        self,
    ) -> None:
        madrid = ZoneInfo("Europe/Madrid")
        schedule = self.data["zones"][self.entity_id]["schedule"]
        schedule["sunday"] = [
            {"start": "02:30", "temperature": 21, "hvac_mode": "heat"}
        ]
        before_overlap = datetime(2026, 10, 25, 1, 50, tzinfo=madrid)

        future = self.scheduler._iter_future_events(before_overlap)

        overlap_events = [
            event
            for event in future
            if event.weekday == "sunday" and event.start == "02:30"
            and event.when.date() == before_overlap.date()
        ]
        self.assertEqual(len(overlap_events), 1)
        self.assertEqual(overlap_events[0].when.fold, 0)

        between_folds = datetime(2026, 10, 25, 2, 15, tzinfo=madrid, fold=1)
        current = self.scheduler._current_schedule_event(
            self.entity_id,
            between_folds,
        )
        future = self.scheduler._iter_future_events(between_folds)

        self.assertEqual(current.when.fold, 0)
        self.assertFalse(
            any(
                event.when.date() == between_folds.date()
                and event.start == "02:30"
                for event in future
            )
        )

        after_overlap = datetime(2026, 10, 25, 3, 5, tzinfo=madrid)
        current = self.scheduler._current_schedule_event(
            self.entity_id,
            after_overlap,
        )
        self.assertEqual(current.when.fold, 0)

    async def test_spring_forward_gap_moves_to_first_valid_local_minute(self) -> None:
        madrid = ZoneInfo("Europe/Madrid")
        self.data["zones"][self.entity_id]["schedule"]["sunday"] = [
            {"start": "02:10", "temperature": 19, "hvac_mode": "heat"},
            {"start": "02:50", "temperature": 21, "hvac_mode": "heat"},
        ]
        before_gap = datetime(2026, 3, 29, 1, 50, tzinfo=madrid)

        future = self.scheduler._iter_future_events(before_gap)
        gap_events = [
            event
            for event in future
            if event.when.date() == before_gap.date()
            and event.start in {"02:10", "02:50"}
        ]
        self.assertEqual(len(gap_events), 1)
        gap_event = gap_events[0]

        self.assertEqual((gap_event.when.hour, gap_event.when.minute), (3, 0))
        self.assertEqual((gap_event.start, gap_event.temperature), ("02:50", 21.0))
        after_gap = datetime(2026, 3, 29, 3, 5, tzinfo=madrid)
        current = self.scheduler._current_schedule_event(self.entity_id, after_gap)
        self.assertEqual((current.when.hour, current.when.minute), (3, 0))
        self.assertEqual((current.start, current.temperature), ("02:50", 21.0))

    async def test_inherited_event_preserves_range_and_turn_off_actions(self) -> None:
        schedule = self.data["zones"][self.entity_id]["schedule"]
        schedule["monday"] = [
            {
                "start": "16:00",
                "target_temp_low": 20,
                "target_temp_high": 24,
                "hvac_mode": "heat_cool",
            }
        ]

        range_event = self.scheduler.get_current_event(self.entity_id)

        self.assertEqual(range_event.target_temp_low, 20)
        self.assertEqual(range_event.target_temp_high, 24)
        self.assertEqual(range_event.hvac_mode, "heat_cool")

        schedule["monday"] = [{"start": "16:00", "action": ACTION_TURN_OFF}]
        off_event = self.scheduler.get_current_event(self.entity_id)

        self.assertEqual(off_event.action, ACTION_TURN_OFF)
        self.assertIsNone(off_event.temperature)

    async def test_clearing_today_reveals_and_applies_inherited_block(self) -> None:
        schedule = self.data["zones"][self.entity_id]["schedule"]
        schedule["monday"] = [
            {"start": "08:00", "temperature": 19, "hvac_mode": "heat"}
        ]
        schedule["tuesday"] = [
            {"start": "17:00", "temperature": 22, "hvac_mode": "heat"}
        ]

        await self.scheduler.async_clear_schedule(self.entity_id, "tuesday")

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 19, True, "heat")],
        )

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
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat", attributes={"current_temperature": 20}
        )
        self.climate = FakeClimateManager()
        self.save_count = 0
        self.data = {
            "version": 1,
            "global_": {
                "mode": MODE_AUTO,
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

    def test_climate_reading_trusts_finite_home_assistant_value(self) -> None:
        self.climate.limits[self.entity_id] = (5, 30)
        self.climate.temperature_unit = lambda _entity_id: scheduler_module.CELSIUS
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": -4},
        )
        self.assertEqual(self.scheduler._climate_current_temperature(self.entity_id), -4)

        self.climate.limits[self.entity_id] = (41, 86)
        self.climate.temperature_unit = lambda _entity_id: scheduler_module.FAHRENHEIT
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={
                "current_temperature": 158,
                "temperature": 158,
                "unit_of_measurement": scheduler_module.FAHRENHEIT,
            },
        )

        self.assertEqual(self.scheduler._climate_current_temperature(self.entity_id), 158)
        status = self.scheduler._room_sensor_assist_status(self.entity_id)
        self.assertEqual(status["climate_temperature"], 158)
        self.assertIsNone(status["climate_target_temperature"])

        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={
                "current_temperature": 70,
                "temperature": 70,
                "unit_of_measurement": scheduler_module.FAHRENHEIT,
            },
        )
        status = self.scheduler._room_sensor_assist_status(self.entity_id)
        self.assertEqual(status["climate_temperature"], 70)
        self.assertEqual(status["climate_target_temperature"], 70)

    def test_climate_reading_rejects_non_finite_live_values(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={
                "current_temperature": float("inf"),
                "temperature": float("nan"),
            },
        )

        self.assertIsNone(self.scheduler._climate_current_temperature(self.entity_id))
        status = self.scheduler._room_sensor_assist_status(self.entity_id)
        self.assertIsNone(status["climate_temperature"])
        self.assertIsNone(status["climate_target_temperature"])

    def test_temperature_source_only_converts_a_distinct_external_sensor(self) -> None:
        self.climate.temperature_unit = lambda _entity_id: scheduler_module.FAHRENHEIT
        climate_state = SimpleNamespace(
            state="heat",
            attributes={
                "current_temperature": 70,
                "unit_of_measurement": scheduler_module.FAHRENHEIT,
            },
        )
        sensor_state = SimpleNamespace(
            state="20",
            attributes={"unit_of_measurement": scheduler_module.CELSIUS},
        )

        self.assertEqual(
            self.scheduler._temperature_from_source_state(
                self.entity_id,
                self.entity_id,
                climate_state,
            ),
            70,
        )
        self.assertEqual(
            self.scheduler._temperature_from_source_state(
                self.entity_id,
                "sensor.room_temperature",
                sensor_state,
            ),
            68,
        )

        self.climate.temperature_unit = lambda _entity_id: scheduler_module.CELSIUS
        fahrenheit_sensor_state = SimpleNamespace(
            state="68",
            attributes={"unit_of_measurement": scheduler_module.FAHRENHEIT},
        )
        self.assertEqual(
            self.scheduler._temperature_from_source_state(
                self.entity_id,
                "sensor.room_temperature",
                fahrenheit_sensor_state,
            ),
            20,
        )

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
            "room_temperature_entity_id": "sensor.salon_temperature",
            "room_sensor_assist_enabled": True,
            "room_sensor_assist_max_delta": 4,
        }

        result = await self.scheduler.async_reset_zone_preconditioning_settings(
            self.entity_id
        )

        expected = normalize_preconditioning_data(None)
        expected["enabled"] = True
        expected["room_temperature_entity_id"] = "sensor.salon_temperature"
        expected["room_sensor_assist_enabled"] = True
        expected["room_sensor_assist_max_delta"] = 4.0
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

    async def test_reset_zone_preconditioning_settings_uses_fahrenheit_defaults(
        self,
    ) -> None:
        self.climate.temperature_unit = lambda _entity_id: "°F"
        self.data["zones"][self.entity_id]["preconditioning"] = {
            "enabled": True,
            "minimum_delta_temperature": 4,
            "fallback_minutes_per_degree": 30,
            "room_temperature_entity_id": "sensor.salon_temperature",
            "room_sensor_assist_enabled": True,
            "room_sensor_assist_max_delta": 7.2,
            "room_sensor_assist_debounce_seconds": 35,
        }

        result = await self.scheduler.async_reset_zone_preconditioning_settings(
            self.entity_id
        )

        self.assertEqual(result["minimum_delta_temperature"], 1.0)
        self.assertEqual(result["fallback_minutes_per_degree"], 14.0)
        self.assertEqual(result["room_sensor_assist_max_delta"], 7.2)
        self.assertEqual(result["room_sensor_assist_debounce_seconds"], 35)

    async def test_fahrenheit_thermal_tuning_uses_direct_runtime_bounds(self) -> None:
        self.climate.temperature_unit = lambda _entity_id: "°F"

        minimum = self.scheduler._normalize_preconditioning_for_entity(
            self.entity_id, {"fallback_minutes_per_degree": 0.6}
        )
        maximum = self.scheduler._normalize_preconditioning_for_entity(
            self.entity_id, {"fallback_minutes_per_degree": 66.7}
        )
        invalid = self.scheduler._normalize_preconditioning_for_entity(
            self.entity_id, {"fallback_minutes_per_degree": 0.5}
        )

        self.assertEqual(minimum["fallback_minutes_per_degree"], 0.6)
        self.assertEqual(maximum["fallback_minutes_per_degree"], 66.7)
        self.assertEqual(invalid["fallback_minutes_per_degree"], 14.0)

    async def test_celsius_preconditioning_updates_enforce_runtime_bounds(self) -> None:
        self.climate.temperature_unit = lambda _entity_id: scheduler_module.CELSIUS

        for values in (
            {
                "minimum_delta_temperature": 0,
                "room_sensor_assist_max_delta": 0.1,
                "fallback_minutes_per_degree": 1,
            },
            {
                "minimum_delta_temperature": 5,
                "room_sensor_assist_max_delta": 10,
                "fallback_minutes_per_degree": 120,
            },
        ):
            await self.scheduler.async_update_zone_preconditioning(
                self.entity_id, values
            )

        for key, value in (
            ("minimum_delta_temperature", -0.1),
            ("minimum_delta_temperature", 5.1),
            ("room_sensor_assist_max_delta", 0),
            ("room_sensor_assist_max_delta", 10.1),
            ("fallback_minutes_per_degree", 0.9),
            ("fallback_minutes_per_degree", 120.1),
        ):
            with self.subTest(key=key, value=value):
                with self.assertRaisesRegex(ValueError, "must be between"):
                    await self.scheduler.async_update_zone_preconditioning(
                        self.entity_id, {key: value}
                    )

        self.assertEqual(self.save_count, 2)

    async def test_fahrenheit_preconditioning_updates_enforce_runtime_bounds(self) -> None:
        self.climate.temperature_unit = lambda _entity_id: scheduler_module.FAHRENHEIT

        for values in (
            {
                "minimum_delta_temperature": 0,
                "room_sensor_assist_max_delta": 0.1,
                "fallback_minutes_per_degree": 0.6,
            },
            {
                "minimum_delta_temperature": 9,
                "room_sensor_assist_max_delta": 18,
                "fallback_minutes_per_degree": 66.7,
            },
        ):
            await self.scheduler.async_update_zone_preconditioning(
                self.entity_id, values
            )

        for key, value in (
            ("minimum_delta_temperature", -0.1),
            ("minimum_delta_temperature", 9.1),
            ("room_sensor_assist_max_delta", 0),
            ("room_sensor_assist_max_delta", 18.1),
            ("fallback_minutes_per_degree", 0.5),
            ("fallback_minutes_per_degree", 66.8),
        ):
            with self.subTest(key=key, value=value):
                with self.assertRaisesRegex(ValueError, "must be between"):
                    await self.scheduler.async_update_zone_preconditioning(
                        self.entity_id, {key: value}
                    )

        self.assertEqual(self.save_count, 2)

    async def test_fahrenheit_comfort_missing_or_invalid_uses_runtime_defaults(self) -> None:
        self.climate.temperature_unit = lambda _entity_id: "°F"

        missing = self.scheduler._normalize_comfort_for_entity(self.entity_id, None)
        invalid = self.scheduler._normalize_comfort_for_entity(
            self.entity_id,
            {"temperature_min": 90, "temperature_max": 70},
        )

        self.assertEqual(
            (missing["temperature_min"], missing["temperature_max"]),
            (68.0, 75.0),
        )
        self.assertEqual(
            (invalid["temperature_min"], invalid["temperature_max"]),
            (68.0, 75.0),
        )

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

    def test_preconditioning_uses_configured_room_temperature_sensor(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 20},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="18",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
            }
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

    def test_preconditioning_replan_listens_to_room_temperature_sensor(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 20},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="18",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
            }
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

        self.scheduler._handle_preconditioning_replan_state_change(
            SimpleNamespace(
                data={
                    "entity_id": "sensor.salon_temperature",
                    "new_state": SimpleNamespace(
                        state="18.5",
                        attributes={"unit_of_measurement": "°C"},
                    ),
                }
            )
        )

        self.assertIsNotNone(self.scheduler._unsub_preconditioning_replan_timer)

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
                "target_kind": "scalar",
                "target_boundary": "temperature",
                "boundary_temperature": 21.0,
                "target_temperature": 21.0,
                "current_temperature": 18.0,
                "temperature_delta": 3.0,
                "hvac_mode": "heat",
                "model_source": "initial_model",
                "complete_sample_count": 0,
                "partial_sample_count": 0,
                "invalid_sample_count": 0,
                "similar_sample_count": 0,
                "comfort_percentile": 80,
                "used_outdoor_temperature": False,
                "preconditioning_diagnostics": {
                    "direction": "heat",
                    "target_kind": "scalar",
                    "target_boundary": "temperature",
                    "boundary_temperature": 21.0,
                    "current_temperature": 18.0,
                    "delta_temperature": 3.0,
                    "complete_sample_count": 0,
                    "partial_sample_count": 0,
                    "invalid_sample_count": 0,
                    "similar_sample_count": 0,
                    "comfort_percentile": 80,
                    "complete_rate_minutes_per_degree": None,
                    "complete_estimate_minutes": 90,
                    "partial_floor_minutes": 0,
                    "combined_estimate_minutes": 90,
                    "rounded_estimate_minutes": 90,
                    "final_lead_minutes": 90,
                    "limited_by_min_start": False,
                    "limited_by_max_lead": False,
                    "source": "initial_model",
                    "used_outdoor_temperature": False,
                    "initial_model_lead_minutes": 90,
                },
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

    def test_removed_preconditioning_plan_fires_one_cancellation_event(self) -> None:
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
        self.hass.bus.events.clear()

        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = []
        self.scheduler.async_schedule_next_event()
        self.scheduler.async_schedule_next_event()

        cancelled = [
            data
            for event_type, data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and data["event"] == EVENT_TYPE_PRECONDITIONING_PLAN_CANCELLED
        ]
        self.assertEqual(len(cancelled), 1)
        self.assertEqual(cancelled[0]["entity_id"], self.entity_id)
        self.assertEqual(cancelled[0]["scheduled_when"], "2026-05-19T20:00:00+00:00")
        self.assertEqual(
            cancelled[0]["preconditioning_when"],
            "2026-05-19T18:30:00+00:00",
        )
        self.assertEqual(cancelled[0]["lead_minutes"], 90)
        self.assertEqual(cancelled[0]["reason"], "no_longer_planned")

    async def test_leaving_auto_mode_cancels_published_preconditioning_plan(
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
        self.hass.bus.events.clear()

        await self.scheduler.async_set_mode(MODE_PAUSED)

        cancelled = [
            data
            for event_type, data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and data["event"] == EVENT_TYPE_PRECONDITIONING_PLAN_CANCELLED
        ]
        self.assertEqual(len(cancelled), 1)
        self.assertEqual(cancelled[0]["entity_id"], self.entity_id)
        self.assertEqual(cancelled[0]["reason"], "scheduler_not_auto")

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
        self.assertEqual(
            planned["preconditioning_diagnostics"]["source"],
            "history",
        )

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

    async def test_captured_preconditioning_event_is_rejected_when_plan_is_disabled(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat", attributes={"current_temperature": 18}
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
        self.assertIsNotNone(event.target_when)
        self.data["zones"][self.entity_id]["preconditioning"]["enabled"] = False

        applied = await self.scheduler._async_apply_event(
            event,
            source="scheduled_event",
            applied_at=event.when,
        )

        self.assertFalse(applied)
        self.assertEqual(self.climate.calls, [])
        self.assertEqual(self.scheduler._preconditioning_sessions, {})

    async def test_slow_preconditioning_apply_is_discarded_by_data_reset(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat", attributes={"current_temperature": 18}
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
        self.assertIsNotNone(event.target_when)
        started = asyncio.Event()
        release = asyncio.Event()
        original_set_temperature = self.climate.async_set_temperature

        async def slow_set_temperature(*args, **kwargs) -> None:
            started.set()
            await release.wait()
            await original_set_temperature(*args, **kwargs)

        self.climate.async_set_temperature = slow_set_temperature
        apply_task = asyncio.create_task(
            self.scheduler._async_apply_event(
                event,
                source="scheduled_event",
                applied_at=event.when,
            )
        )
        await started.wait()
        reset_task = asyncio.create_task(self.scheduler.async_prepare_data_reset())
        await asyncio.sleep(0)
        release.set()
        await asyncio.gather(apply_task, reset_task)

        self.assertEqual(self.scheduler._preconditioning_sessions, {})
        self.assertEqual(self.scheduler._applied_preconditioning_targets, {})
        self.assertFalse(
            self.scheduler._climate_delivery.is_deferred(self.entity_id)
        )
        self.assertFalse(
            any(
                event_type == EVENT_VELAIR
                and payload.get("event") == EVENT_TYPE_CLIMATE_TARGET_APPLIED
                for event_type, payload in self.hass.bus.events
            )
        )

    async def test_slow_preconditioning_apply_is_discarded_when_disabled(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat", attributes={"current_temperature": 18}
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
        started = asyncio.Event()
        release = asyncio.Event()
        original_set_temperature = self.climate.async_set_temperature

        async def slow_set_temperature(*args, **kwargs) -> None:
            started.set()
            await release.wait()
            await original_set_temperature(*args, **kwargs)

        self.climate.async_set_temperature = slow_set_temperature
        apply_task = asyncio.create_task(
            self.scheduler._async_apply_event(
                event,
                source="scheduled_event",
                applied_at=event.when,
            )
        )
        await started.wait()
        disable_task = asyncio.create_task(
            self.scheduler.async_update_zone_preconditioning(
                self.entity_id, {"enabled": False}
            )
        )
        await asyncio.sleep(0)
        release.set()
        await asyncio.gather(apply_task, disable_task)

        self.assertFalse(
            self.data["zones"][self.entity_id]["preconditioning"]["enabled"]
        )
        self.assertEqual(self.scheduler._preconditioning_sessions, {})
        self.assertEqual(self.scheduler._applied_preconditioning_targets, {})
        self.assertFalse(
            any(
                event_type == EVENT_VELAIR
                and payload.get("event") == EVENT_TYPE_CLIMATE_TARGET_APPLIED
                for event_type, payload in self.hass.bus.events
            )
        )

    async def test_preconditioning_update_save_failure_restores_exact_config(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        previous = deepcopy(
            self.data["zones"][self.entity_id]["preconditioning"]
        )

        async def fail_save() -> None:
            raise RuntimeError("save failed")

        self.scheduler._async_save_data = fail_save
        with self.assertRaisesRegex(RuntimeError, "save failed"):
            await self.scheduler.async_update_zone_preconditioning(
                self.entity_id, {"enabled": False}
            )

        self.assertEqual(
            self.data["zones"][self.entity_id]["preconditioning"], previous
        )
        self.assertEqual(self.climate.calls, [])
        self.assertTrue(
            self.scheduler._climate_delivery.is_deferred(self.entity_id)
        )

    async def test_room_assist_disable_save_failure_preserves_active_runtime(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 20, "temperature": 25},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="15", attributes={"unit_of_measurement": "°C"}
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 3,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            }
        ]
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )
        previous_config = deepcopy(
            self.data["zones"][self.entity_id]["preconditioning"]
        )
        previous_state = self.scheduler._room_sensor_assist_states[self.entity_id]
        previous_suppressed = set(self.scheduler._room_sensor_assist_suppressed)
        self.climate.calls.clear()

        async def fail_save() -> None:
            raise RuntimeError("save failed")

        self.scheduler._async_save_data = fail_save
        with self.assertRaisesRegex(RuntimeError, "save failed"):
            await self.scheduler.async_update_zone_preconditioning(
                self.entity_id, {"room_sensor_assist_enabled": False}
            )

        self.assertEqual(
            self.data["zones"][self.entity_id]["preconditioning"],
            previous_config,
        )
        self.assertIs(
            self.scheduler._room_sensor_assist_states[self.entity_id],
            previous_state,
        )
        self.assertEqual(
            self.scheduler._room_sensor_assist_suppressed,
            previous_suppressed,
        )
        self.assertEqual(self.climate.calls, [])
        self.assertTrue(
            self.scheduler._climate_delivery.is_deferred(self.entity_id)
        )

    async def test_room_assist_restore_failure_retries_persisted_disabled_intent(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 20, "temperature": 25},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="15", attributes={"unit_of_measurement": "°C"}
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 3,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            }
        ]
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )
        self.climate.calls.clear()
        original_set_temperature = self.climate.async_set_temperature
        attempts = 0

        async def fail_first_restore(*args, **kwargs) -> None:
            nonlocal attempts
            attempts += 1
            if attempts == 1:
                raise scheduler_module.HomeAssistantError("restore failed")
            await original_set_temperature(*args, **kwargs)

        self.climate.async_set_temperature = fail_first_restore
        delivery_module = sys.modules["custom_components.velair.climate_delivery"]
        previous_retry_delays = delivery_module.RETRY_DELAYS
        delivery_module.RETRY_DELAYS = (0, 0)
        self.addCleanup(
            setattr,
            delivery_module,
            "RETRY_DELAYS",
            previous_retry_delays,
        )

        result = await self.scheduler.async_update_zone_preconditioning(
            self.entity_id, {"room_sensor_assist_enabled": False}
        )
        for _ in range(5):
            if self.climate.calls:
                break
            await asyncio.sleep(0)

        self.assertFalse(result["room_sensor_assist_enabled"])
        self.assertFalse(
            self.data["zones"][self.entity_id]["preconditioning"][
                "room_sensor_assist_enabled"
            ]
        )
        self.assertEqual(attempts, 2)
        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 25.0, True, "heat")],
        )
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)
        self.assertTrue(
            self.scheduler._climate_delivery.is_deferred(self.entity_id)
        )

    async def test_preconditioning_learning_save_failure_restores_learning(self) -> None:
        samples = [_preconditioning_sample("heat", "complete", 30)]
        self.data["preconditioning_learning"] = {
            self.entity_id: _preconditioning_learning(samples)
        }
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        previous = deepcopy(self.data["preconditioning_learning"])

        async def fail_save() -> None:
            raise RuntimeError("save failed")

        self.scheduler._async_save_data = fail_save
        with self.assertRaisesRegex(RuntimeError, "save failed"):
            await self.scheduler.async_reset_zone_preconditioning_learning(
                self.entity_id, "heat"
            )

        self.assertEqual(self.data["preconditioning_learning"], previous)
        self.assertEqual(self.climate.calls, [])
        self.assertTrue(
            self.scheduler._climate_delivery.is_deferred(self.entity_id)
        )

    async def test_slow_preconditioning_apply_is_discarded_by_settings_reset(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat", attributes={"current_temperature": 18}
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
        started = asyncio.Event()
        release = asyncio.Event()
        original_set_temperature = self.climate.async_set_temperature

        async def slow_set_temperature(*args, **kwargs) -> None:
            started.set()
            await release.wait()
            await original_set_temperature(*args, **kwargs)

        self.climate.async_set_temperature = slow_set_temperature
        apply_task = asyncio.create_task(
            self.scheduler._async_apply_event(
                event,
                source="scheduled_event",
                applied_at=event.when,
            )
        )
        await started.wait()
        await self.scheduler.async_reset_zone_preconditioning_settings(
            self.entity_id
        )
        release.set()
        await apply_task

        self.assertEqual(self.scheduler._preconditioning_sessions, {})
        self.assertEqual(self.scheduler._applied_preconditioning_targets, {})
        self.assertFalse(
            any(
                event_type == EVENT_VELAIR
                and payload.get("event") == EVENT_TYPE_CLIMATE_TARGET_APPLIED
                for event_type, payload in self.hass.bus.events
            )
        )

    async def test_preconditioning_settings_reset_save_failure_restores_config(
        self,
    ) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        previous = deepcopy(
            self.data["zones"][self.entity_id]["preconditioning"]
        )

        async def fail_save() -> None:
            raise RuntimeError("save failed")

        self.scheduler._async_save_data = fail_save
        with self.assertRaisesRegex(RuntimeError, "save failed"):
            await self.scheduler.async_reset_zone_preconditioning_settings(
                self.entity_id
            )

        self.assertEqual(
            self.data["zones"][self.entity_id]["preconditioning"], previous
        )
        self.assertEqual(self.climate.calls, [])
        self.assertTrue(
            self.scheduler._climate_delivery.is_deferred(self.entity_id)
        )

    async def test_identical_schedule_save_preserves_applied_preconditioning_target(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 18},
        )
        block = {
            "start": "19:00",
            "action": ACTION_SET_TEMPERATURE,
            "temperature": 21,
            "hvac_mode": "heat",
        }
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [block.copy()]
        stale_event = self.scheduler.calculate_next_event(NOW)
        self.assertIsNotNone(stale_event)
        self.assertLess(stale_event.when, NOW)
        self.assertEqual(
            stale_event.target_when,
            datetime(2026, 5, 19, 19, 0, tzinfo=timezone.utc),
        )
        self.scheduler._mark_preconditioning_applied(stale_event)

        await self.scheduler.async_set_daily_schedule(
            self.entity_id,
            "tuesday",
            [block.copy()],
        )
        await asyncio.sleep(0)

        self.assertEqual(self.climate.calls, [])
        self.assertTrue(
            self.scheduler._is_applied_preconditioning_event(stale_event)
        )

    async def test_room_sensor_assist_applies_dynamic_heat_target(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 22, "temperature": 22},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20.5",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "enabled": False,
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 2,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 22,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler.async_apply_current_schedule()

        self.assertEqual(
            self.climate.calls[-2:],
            [
                ("set_temperature", self.entity_id, 22.0, True, "heat"),
                ("set_temperature", self.entity_id, 23.5, True, "heat"),
            ],
        )
        events = [
            event_data
            for event_type, event_data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and event_data["event"] == EVENT_TYPE_ROOM_SENSOR_ASSIST_UPDATED
        ]
        self.assertEqual(events[-1]["room_temperature_entity_id"], "sensor.salon_temperature")
        self.assertEqual(events[-1]["target_temperature"], 22.0)
        self.assertEqual(events[-1]["applied_temperature"], 23.5)
        self.assertEqual(events[-1]["assist_delta"], 1.5)
        self.assertEqual(events[-1]["applied_offset"], 1.5)

    async def test_room_sensor_assist_works_without_adaptive_preconditioning(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 21},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "enabled": False,
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 5,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler.async_apply_current_schedule()

        self.assertEqual(
            self.climate.calls[-2:],
            [
                ("set_temperature", self.entity_id, 25.0, True, "heat"),
                ("set_temperature", self.entity_id, 22.0, True, "heat"),
            ],
        )

    async def test_room_sensor_assist_keep_uses_effective_mode_when_climate_is_off(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.climate.current_hvac_modes[self.entity_id] = "off"
        self.climate.hvac_modes[self.entity_id] = ["off", "heat", "cool"]
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="off",
            attributes={"current_temperature": 17, "temperature": 18},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="18",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "enabled": False,
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 5,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
            }
        ]

        await self.scheduler.async_apply_current_schedule()

        self.assertEqual(
            self.climate.calls[-2:],
            [
                ("set_temperature", self.entity_id, 21.0, True, None),
                ("set_temperature", self.entity_id, 20.0, True, None),
            ],
        )
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertEqual(state.direction, "heat")
        self.assertEqual(state.applied_temperature, 20.0)

    async def test_room_sensor_assist_status_explains_active_adjustment(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 21},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "enabled": False,
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 5,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler.async_apply_current_schedule()

        status = self.scheduler.get_room_sensor_assist_statuses()[self.entity_id]
        self.assertEqual(status["status"], "assisting")
        self.assertEqual(status["room_temperature_entity_id"], "sensor.salon_temperature")
        self.assertEqual(status["target_temperature"], 25.0)
        self.assertEqual(status["applied_temperature"], 22.0)
        self.assertEqual(status["climate_target_temperature"], 21.0)
        self.assertEqual(status["room_temperature"], 20.0)
        self.assertEqual(status["climate_temperature"], 17.1)
        self.assertEqual(status["assist_delta"], 5.0)
        self.assertEqual(status["applied_offset"], 4.9)
        self.assertEqual(status["direction"], "heat")
        self.assertEqual(status["start"], "17:00")
        self.assertEqual(status["active_from"], "2026-05-19T17:00:00+00:00")
        self.assertIsNone(status["target_when"])

        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.2, "temperature": 22},
        )
        status = self.scheduler.get_room_sensor_assist_statuses()[self.entity_id]
        self.assertEqual(status["applied_temperature"], 22.0)
        self.assertEqual(status["climate_temperature"], 17.2)
        self.assertEqual(status["applied_offset"], 4.8)

    async def test_room_sensor_assist_status_ignores_removed_active_block(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 25},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="17",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "enabled": False,
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 8,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "09:45",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            }
        ]
        await self.scheduler.async_apply_current_schedule()
        self.assertIn(self.entity_id, self.scheduler._room_sensor_assist_states)

        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = []

        status = self.scheduler.get_room_sensor_assist_statuses()[self.entity_id]
        self.assertEqual(status["status"], "idle")
        self.assertIsNone(status["target_temperature"])
        self.assertIsNone(status["applied_temperature"])
        self.assertIsNone(status["start"])
        self.assertIsNone(status["active_from"])
        self.assertIsNone(status["target_when"])

    async def test_room_sensor_assist_refresh_clears_removed_active_block(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 25},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="17",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "enabled": False,
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 8,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "09:45",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            }
        ]
        await self.scheduler.async_apply_current_schedule()
        self.assertIn(self.entity_id, self.scheduler._room_sensor_assist_states)
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = []

        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )

        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)

    async def test_room_sensor_assist_missing_step_is_unavailable_and_only_restores(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 25},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 5,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            }
        ]
        await self.scheduler._async_refresh_room_sensor_assist(
            self.entity_id,
            target_temperature=25,
            hvac_mode="heat",
            weekday="tuesday",
            start="17:00",
            reason="test",
        )
        self.assertIn(self.entity_id, self.scheduler._room_sensor_assist_states)

        self.climate.temperature_step = lambda _entity_id: None
        status = self.scheduler._room_sensor_assist_status(self.entity_id)

        self.assertEqual(status["status"], "unavailable")
        self.assertEqual(status["reason"], "missing_target_step")
        self.assertIsNone(status["applied_temperature"])
        self.assertIsNone(status["direction"])
        self.assertEqual(status["assist_delta"], 0.0)
        self.assertEqual(status["applied_offset"], 0.0)

        self.climate.calls.clear()
        await self.scheduler._async_refresh_room_sensor_assist(
            self.entity_id,
            target_temperature=25,
            hvac_mode="heat",
            weekday="tuesday",
            start="17:00",
            reason="test",
        )

        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)
        self.assertEqual(len(self.climate.calls), 1)
        self.assertEqual(self.climate.calls[0][0], "set_temperature")
        self.assertEqual(self.climate.calls[0][2], 25)

    async def test_enable_room_sensor_assist_requires_configured_sensor(self) -> None:
        with self.assertRaisesRegex(ValueError, "requires a configured room"):
            await self.scheduler.async_set_room_sensor_assist(self.entity_id, True)

        self.data["zones"][self.entity_id]["preconditioning"].update(
            {"room_temperature_entity_id": "sensor.salon_temperature"}
        )

        await self.scheduler.async_set_room_sensor_assist(self.entity_id, True)
        await self.scheduler.async_set_room_sensor_assist(self.entity_id, True)

        self.assertTrue(
            self.data["zones"][self.entity_id]["preconditioning"][
                "room_sensor_assist_enabled"
            ]
        )
        state_events = [
            event_data
            for event_type, event_data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and event_data["event"] == EVENT_TYPE_ROOM_SENSOR_ASSIST_STATE_CHANGED
        ]
        self.assertEqual(
            state_events,
            [
                {
                    "domain": "velair",
                    "event": EVENT_TYPE_ROOM_SENSOR_ASSIST_STATE_CHANGED,
                    "entity_id": self.entity_id,
                    "enabled": True,
                    "previous_enabled": False,
                    "room_temperature_entity_id": "sensor.salon_temperature",
                    "max_delta": 2.0,
                    "debounce_seconds": 20,
                }
            ],
        )

    async def test_disable_room_sensor_assist_clears_active_assist(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 21},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 5,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            }
        ]
        await self.scheduler.async_apply_current_schedule()

        await self.scheduler.async_set_room_sensor_assist(self.entity_id, False)

        self.assertFalse(
            self.data["zones"][self.entity_id]["preconditioning"][
                "room_sensor_assist_enabled"
            ]
        )
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)
        self.assertEqual(
            self.climate.calls[-1],
            ("set_temperature", self.entity_id, 25.0, False, "heat"),
        )
        state_event = next(
            event_data
            for event_type, event_data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and event_data["event"] == EVENT_TYPE_ROOM_SENSOR_ASSIST_STATE_CHANGED
        )
        self.assertFalse(state_event["enabled"])
        self.assertTrue(state_event["previous_enabled"])
        self.assertEqual(
            state_event["room_temperature_entity_id"],
            "sensor.salon_temperature",
        )

    async def test_room_sensor_assist_aligns_heat_target_to_climate_step(self) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 21},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="18",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "enabled": False,
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 2,
            }
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
            self.climate.calls[-2:],
            [
                ("set_temperature", self.entity_id, 21.0, True, "heat"),
                ("set_temperature", self.entity_id, 19.0, True, "heat"),
            ],
        )

    async def test_room_sensor_assist_keeps_watching_after_heat_target_reached(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 21},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="21.5",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "enabled": False,
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 2,
            }
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
            self.climate.calls[-2:],
            [
                ("set_temperature", self.entity_id, 21.0, True, "heat"),
                ("set_temperature", self.entity_id, 16.5, True, "heat"),
            ],
        )
        self.assertIn(self.entity_id, self.scheduler._room_sensor_assist_states)
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="19",
            attributes={"unit_of_measurement": "°C"},
        )
        self.climate.calls.clear()

        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 19.0, True, "heat")],
        )

    async def test_room_sensor_assist_recalculates_when_active_heat_target_increases(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 21},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="21.5",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "enabled": False,
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 2,
            }
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
        self.climate.calls.clear()
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="22",
            attributes={"unit_of_measurement": "°C"},
        )

        await self.scheduler.async_set_daily_schedule(
            self.entity_id,
            "tuesday",
            [
                {
                    "start": "17:00",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 24,
                    "hvac_mode": "heat",
                }
            ],
        )

        self.assertEqual(
            self.climate.calls[-2:],
            [
                ("set_temperature", self.entity_id, 24.0, True, "heat"),
                ("set_temperature", self.entity_id, 19.0, True, "heat"),
            ],
        )

    def test_room_sensor_assist_listens_to_active_block_without_existing_state(
        self,
    ) -> None:
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
            attributes={"current_temperature": 17.1, "temperature": 21},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 2,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]

        self.scheduler.async_schedule_next_event()

        self.assertEqual(self.scheduler._room_sensor_assist_states, {})
        self.assertEqual(
            self.scheduler._room_sensor_assist_entities,
            (self.entity_id, "sensor.salon_temperature"),
        )
        self.assertIn(
            [self.entity_id, "sensor.salon_temperature"],
            [call.args[1] for call in tracker.call_args_list],
        )

    async def test_room_sensor_assist_refreshes_active_block_without_existing_state(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 21},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 2,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        self.scheduler.async_schedule_next_event()
        self.assertEqual(self.scheduler._room_sensor_assist_states, {})

        self.scheduler._handle_room_sensor_assist_timer(NOW)
        await asyncio.sleep(0)
        await asyncio.sleep(0)

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 18.0, True, "heat")],
        )

    async def test_room_sensor_assist_sensor_change_refreshes_active_block(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 25},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="21",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 4,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            }
        ]

        self.scheduler.async_schedule_next_event()
        self.assertEqual(self.climate.calls, [])

        write_state = Mock()
        self.scheduler._async_write_state = write_state

        self.scheduler._handle_room_sensor_assist_state_change(
            SimpleNamespace(data={"entity_id": "sensor.salon_temperature"})
        )
        self.assertIsNotNone(self.scheduler._unsub_room_sensor_assist_timer)
        self.scheduler._handle_room_sensor_assist_timer(NOW)
        await asyncio.sleep(0)

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 21.0, True, "heat")],
        )
        write_state.assert_called_once_with()

    async def test_start_dismisses_stale_room_assist_limit_notification_once(self) -> None:
        await self.scheduler.async_start()
        await self.scheduler.async_start()

        dismisses = [
            call
            for call in self.hass.services.calls
            if call[0:2] == ("persistent_notification", "dismiss")
        ]
        self.assertEqual(
            dismisses,
            [
                (
                    "persistent_notification",
                    "dismiss",
                    {"notification_id": "velair_room_assist_limit_climate_salon"},
                    True,
                )
            ],
        )
    async def test_room_sensor_assist_zero_debounce_refreshes_immediately(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 25},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="21",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 4,
                "room_sensor_assist_debounce_seconds": 0,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            }
        ]

        self.scheduler.async_schedule_next_event()
        self.scheduler._handle_room_sensor_assist_state_change(
            SimpleNamespace(data={"entity_id": "sensor.salon_temperature"})
        )
        await asyncio.sleep(0)

        self.assertIsNone(self.scheduler._unsub_room_sensor_assist_timer)
        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 21.0, True, "heat")],
        )

    async def test_room_sensor_assist_caps_heat_delta_at_max_delta(self) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 25},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="18",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 6,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            }
        ]

        self.scheduler.async_schedule_next_event()
        self.scheduler._handle_room_sensor_assist_state_change(
            SimpleNamespace(data={"entity_id": "sensor.salon_temperature"})
        )
        self.scheduler._handle_room_sensor_assist_timer(NOW)
        await asyncio.sleep(0)

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 23.0, True, "heat")],
        )

    async def test_room_sensor_assist_uses_due_preconditioning_without_session(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 20},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="22",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 5,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "19:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 24,
                "hvac_mode": "heat",
            }
        ]

        status = self.scheduler.get_room_sensor_assist_statuses()[self.entity_id]
        self.assertEqual(status["status"], "ready")
        self.assertEqual(status["target_temperature"], 24.0)
        self.assertIsNone(status["applied_temperature"])
        self.assertEqual(status["start"], "19:00")
        self.assertEqual(status["active_from"], "2026-05-19T17:50:00+00:00")
        self.assertEqual(status["target_when"], "2026-05-19T19:00:00+00:00")

        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 19.0, True, "heat")],
        )

    async def test_room_sensor_assist_status_prefers_applied_preconditioning_time(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 20},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="22",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 5,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "19:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 24,
                "hvac_mode": "heat",
            }
        ]
        event = self.scheduler.calculate_next_event(NOW)
        self.assertIsNotNone(event)
        self.assertEqual(event.when, datetime(2026, 5, 19, 17, 50, tzinfo=timezone.utc))
        self.scheduler._mark_preconditioning_applied(event)
        self.scheduler._start_preconditioning_session(event, "heat", NOW)

        status = self.scheduler.get_room_sensor_assist_statuses()[self.entity_id]

        self.assertEqual(status["status"], "ready")
        self.assertEqual(status["target_temperature"], 24.0)
        self.assertEqual(status["start"], "19:00")
        self.assertEqual(status["active_from"], "2026-05-19T17:50:00+00:00")
        self.assertEqual(status["target_when"], "2026-05-19T19:00:00+00:00")

    async def test_room_sensor_assist_keeps_preconditioning_target_during_session(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 21},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="18",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 5,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            },
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            },
        ]

        await self.scheduler._handle_timer(NOW)

        self.assertEqual(
            self.climate.calls[-2:],
            [
                ("set_temperature", self.entity_id, 25.0, True, "heat"),
                ("set_temperature", self.entity_id, 22.0, True, "heat"),
            ],
        )
        self.climate.calls.clear()
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20",
            attributes={"unit_of_measurement": "°C"},
        )

        self.scheduler._handle_room_sensor_assist_state_change(
            SimpleNamespace(data={"entity_id": "sensor.salon_temperature"})
        )
        self.scheduler._handle_room_sensor_assist_timer(NOW)
        await asyncio.sleep(0)

        self.assertEqual(self.climate.calls, [])
        self.assertEqual(
            self.scheduler._room_sensor_assist_states[self.entity_id].target_temperature,
            25.0,
        )

    async def test_room_sensor_assist_keeps_runtime_target_if_session_is_missing(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 17.1, "temperature": 21},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="18",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 5,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            },
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            },
        ]
        await self.scheduler._handle_timer(NOW)
        self.assertEqual(
            self.scheduler._room_sensor_assist_states[self.entity_id].target_temperature,
            25.0,
        )
        self.scheduler._preconditioning_sessions.pop(self.entity_id)
        self.climate.calls.clear()
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20",
            attributes={"unit_of_measurement": "°C"},
        )

        self.scheduler._handle_room_sensor_assist_state_change(
            SimpleNamespace(data={"entity_id": "sensor.salon_temperature"})
        )
        self.scheduler._handle_room_sensor_assist_timer(NOW)
        await asyncio.sleep(0)

        self.assertEqual(self.climate.calls, [])
        self.assertEqual(
            self.scheduler._room_sensor_assist_states[self.entity_id].target_temperature,
            25.0,
        )

    async def test_room_sensor_assist_keeps_cooling_preconditioning_target(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="cool",
            attributes={"current_temperature": 25.1, "temperature": 24},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="26",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 3,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 24,
                "hvac_mode": "cool",
            },
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 20,
                "hvac_mode": "cool",
            },
        ]

        await self.scheduler._handle_timer(NOW)

        self.assertEqual(
            self.climate.calls[-2:],
            [
                ("set_temperature", self.entity_id, 20.0, True, "cool"),
                ("set_temperature", self.entity_id, 22.5, True, "cool"),
            ],
        )
        self.climate.calls.clear()
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="22",
            attributes={"unit_of_measurement": "°C"},
        )

        self.scheduler._handle_room_sensor_assist_state_change(
            SimpleNamespace(data={"entity_id": "sensor.salon_temperature"})
        )
        self.scheduler._handle_room_sensor_assist_timer(NOW)
        await asyncio.sleep(0)

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 23.5, True, "cool")],
        )
        self.assertEqual(
            self.scheduler._room_sensor_assist_states[self.entity_id].target_temperature,
            20.0,
        )

    async def test_room_sensor_assist_uses_climate_step_as_minimum_change(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 22, "temperature": 22},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20.1",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 2,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 22,
                "hvac_mode": "heat",
            }
        ]
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(
            self.climate.calls[-1],
            ("set_temperature", self.entity_id, 23.5, True, "heat"),
        )
        self.climate.calls.clear()
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20.2",
            attributes={"unit_of_measurement": "°C"},
        )

        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )

        self.assertEqual(self.climate.calls, [])

    async def test_room_sensor_assist_aligns_cool_target_to_climate_step(self) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="cool",
            attributes={"current_temperature": 25.1, "temperature": 22},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="24",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 2,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 22,
                "hvac_mode": "cool",
            }
        ]

        await self.scheduler.async_apply_current_schedule()

        self.assertEqual(
            self.climate.calls[-2:],
            [
                ("set_temperature", self.entity_id, 22.0, True, "cool"),
                ("set_temperature", self.entity_id, 23.5, True, "cool"),
            ],
        )

    async def test_room_sensor_assist_zero_error_tracks_exact_climate_reading(self) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="cool",
            attributes={"current_temperature": 25, "temperature": 22},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="22",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "enabled": False,
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 22,
                "hvac_mode": "cool",
            }
        ]

        await self.scheduler.async_apply_current_schedule()

        self.assertEqual(
            self.climate.calls[-2:],
            [
                ("set_temperature", self.entity_id, 22.0, True, "cool"),
                ("set_temperature", self.entity_id, 25.0, True, "cool"),
            ],
        )
        self.climate.calls.clear()
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="cool",
            attributes={"current_temperature": 26, "temperature": 25.0},
        )

        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 26.0, True, "cool")],
        )
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertEqual(state.applied_temperature, 26.0)
        status = self.scheduler._room_sensor_assist_status(self.entity_id)
        self.assertEqual(status["status"], "holding")
        self.assertEqual(status["assist_delta"], 0.0)
        self.assertEqual(status["applied_offset"], 0.0)

    def test_room_sensor_assist_non_driving_target_never_crosses_schedule(self) -> None:
        self.climate.steps[self.entity_id] = 0.5
        config = normalize_preconditioning_data(
            {"minimum_delta_temperature": 0, "room_sensor_assist_max_delta": 5}
        )

        cooling_hold = self.scheduler._room_sensor_assist_target(
            self.entity_id,
            config,
            "cool",
            22,
            21,
            19,
        )
        heating_hold = self.scheduler._room_sensor_assist_target(
            self.entity_id,
            config,
            "heat",
            20,
            21,
            24,
        )

        self.assertEqual(cooling_hold.applied_temperature, 22.0)
        self.assertEqual(cooling_hold.requested_temperature, 22.0)
        self.assertEqual(cooling_hold.calculated_temperature, 20.0)
        self.assertEqual(cooling_hold.scheduled_target_guard, "cooling_floor")
        self.assertEqual(cooling_hold.assist_delta, 1.0)
        self.assertEqual(heating_hold.applied_temperature, 20.0)
        self.assertEqual(heating_hold.requested_temperature, 20.0)
        self.assertEqual(heating_hold.calculated_temperature, 23.0)
        self.assertEqual(heating_hold.scheduled_target_guard, "heating_ceiling")
        self.assertEqual(heating_hold.assist_delta, 1.0)

    def test_room_sensor_assist_signed_protection_uses_native_fahrenheit_values(self) -> None:
        self.climate.temperature_unit = lambda _entity_id: scheduler_module.FAHRENHEIT
        self.climate.steps[self.entity_id] = 1
        self.climate.limits[self.entity_id] = (41, 95)
        config = normalize_preconditioning_data(
            {"minimum_delta_temperature": 0, "room_sensor_assist_max_delta": 9}
        )

        cooling_guard = self.scheduler._room_sensor_assist_target(
            self.entity_id, config, "cool", 72, 70, 68
        )
        cooling_inverse = self.scheduler._room_sensor_assist_target(
            self.entity_id, config, "cool", 72, 70, 76
        )
        heating_guard = self.scheduler._room_sensor_assist_target(
            self.entity_id, config, "heat", 68, 70, 72
        )

        self.assertEqual(
            (
                cooling_guard.calculated_temperature,
                cooling_guard.applied_temperature,
                cooling_guard.scheduled_target_guard,
            ),
            (70, 72, "cooling_floor"),
        )
        self.assertEqual(
            (
                cooling_inverse.calculated_temperature,
                cooling_inverse.applied_temperature,
                cooling_inverse.scheduled_target_guard,
            ),
            (78, 78, None),
        )
        self.assertEqual(
            (
                heating_guard.calculated_temperature,
                heating_guard.applied_temperature,
                heating_guard.scheduled_target_guard,
            ),
            (70, 68, "heating_ceiling"),
        )

    def test_room_sensor_assist_keeps_stronger_inverse_target_on_safe_side(self) -> None:
        self.climate.steps[self.entity_id] = 0.5
        config = normalize_preconditioning_data(
            {"minimum_delta_temperature": 0, "room_sensor_assist_max_delta": 5}
        )

        cooling_inverse = self.scheduler._room_sensor_assist_target(
            self.entity_id,
            config,
            "cool",
            22,
            21,
            25,
        )
        heating_inverse = self.scheduler._room_sensor_assist_target(
            self.entity_id,
            config,
            "heat",
            20,
            21,
            18,
        )

        self.assertEqual(cooling_inverse.applied_temperature, 26.0)
        self.assertEqual(heating_inverse.applied_temperature, 17.0)
        self.assertIsNone(cooling_inverse.scheduled_target_guard)
        self.assertIsNone(heating_inverse.scheduled_target_guard)

    def test_room_sensor_assist_protection_applies_at_deadband_boundary(self) -> None:
        self.climate.steps[self.entity_id] = 0.5
        config = normalize_preconditioning_data(
            {"minimum_delta_temperature": 0.5, "room_sensor_assist_max_delta": 5}
        )

        cooling_hold = self.scheduler._room_sensor_assist_target(
            self.entity_id,
            config,
            "cool",
            22,
            22.5,
            19,
        )
        heating_hold = self.scheduler._room_sensor_assist_target(
            self.entity_id,
            config,
            "heat",
            20,
            19.5,
            24,
        )

        self.assertEqual(cooling_hold.assist_delta, 0.0)
        self.assertEqual(cooling_hold.calculated_temperature, 19.0)
        self.assertEqual(cooling_hold.applied_temperature, 22.0)
        self.assertEqual(cooling_hold.scheduled_target_guard, "cooling_floor")
        self.assertIsNone(cooling_hold.limited_by)
        self.assertEqual(heating_hold.assist_delta, 0.0)
        self.assertEqual(heating_hold.calculated_temperature, 24.0)
        self.assertEqual(heating_hold.applied_temperature, 20.0)
        self.assertEqual(heating_hold.scheduled_target_guard, "heating_ceiling")
        self.assertIsNone(heating_hold.limited_by)

    def test_room_sensor_assist_does_not_invent_device_hysteresis_margin(self) -> None:
        self.climate.steps[self.entity_id] = 0.5
        config = normalize_preconditioning_data(
            {"minimum_delta_temperature": 0, "room_sensor_assist_max_delta": 5}
        )

        result = self.scheduler._room_sensor_assist_target(
            self.entity_id,
            config,
            "heat",
            18,
            18,
            16.5,
        )

        self.assertEqual(result.assist_delta, 0.0)
        self.assertEqual(result.calculated_temperature, 16.5)
        self.assertEqual(result.applied_temperature, 16.5)
        self.assertIsNone(result.scheduled_target_guard)
        self.assertIsNone(result.limited_by)

    async def test_room_sensor_assist_cool_hold_does_not_follow_internal_sensor_down(self) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="cool",
            attributes={"current_temperature": 21, "temperature": 22},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="22",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 22,
                "hvac_mode": "cool",
            }
        ]

        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.climate.calls[-1], (
            "set_temperature", self.entity_id, 22.0, True, "cool"
        ))
        self.climate.calls.clear()
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="cool",
            attributes={"current_temperature": 19, "temperature": 22},
        )

        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )

        self.assertEqual(self.climate.calls, [])
        self.assertEqual(
            self.scheduler._room_sensor_assist_states[
                self.entity_id
            ].applied_temperature,
            22.0,
        )
        status = self.scheduler._room_sensor_assist_status(self.entity_id)
        self.assertEqual(status["status"], "holding")
        self.assertEqual(status["scheduled_target_guard"], "cooling_floor")
        self.assertEqual(status["calculated_temperature"], 19.0)
        events = [
            event_data
            for event_type, event_data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and event_data["event"] == EVENT_TYPE_ROOM_SENSOR_ASSIST_UPDATED
        ]
        self.assertEqual(events[-1]["scheduled_target_guard"], "cooling_floor")
        self.assertEqual(events[-1]["calculated_temperature"], 21.0)

    async def test_room_sensor_assist_heat_hold_does_not_follow_internal_sensor_up(self) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 23, "temperature": 22},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="22",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 22,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.climate.calls[-1], (
            "set_temperature", self.entity_id, 22.0, True, "heat"
        ))
        self.climate.calls.clear()
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 25, "temperature": 22},
        )

        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )

        self.assertEqual(self.climate.calls, [])
        self.assertEqual(
            self.scheduler._room_sensor_assist_states[
                self.entity_id
            ].applied_temperature,
            22.0,
        )
        status = self.scheduler._room_sensor_assist_status(self.entity_id)
        self.assertEqual(status["status"], "holding")
        self.assertEqual(status["scheduled_target_guard"], "heating_ceiling")
        self.assertEqual(status["calculated_temperature"], 25.0)

    async def test_room_sensor_assist_heat_target_moves_inverse_after_crossing(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 22, "temperature": 22},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20.5",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 3,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 22,
                "hvac_mode": "heat",
            }
        ]
        await self.scheduler.async_apply_current_schedule()
        self.climate.calls.clear()
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="23",
            attributes={"unit_of_measurement": "°C"},
        )

        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 21.0, True, "heat")],
        )
        events = [
            event_data
            for event_type, event_data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and event_data["event"] == EVENT_TYPE_ROOM_SENSOR_ASSIST_UPDATED
        ]
        self.assertEqual(events[-1]["assist_delta"], 1.0)
        self.assertEqual(events[-1]["applied_offset"], -1.0)

        self.climate.calls.clear()
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="21",
            attributes={"unit_of_measurement": "°C"},
        )
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 23.0, True, "heat")],
        )

    async def test_room_sensor_assist_cool_target_moves_inverse_after_crossing(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="cool",
            attributes={"current_temperature": 25.1, "temperature": 22},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="24",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 3,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 22,
                "hvac_mode": "cool",
            }
        ]
        await self.scheduler.async_apply_current_schedule()
        self.climate.calls.clear()
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="21",
            attributes={"unit_of_measurement": "°C"},
        )

        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 26.5, True, "cool")],
        )
        events = [
            event_data
            for event_type, event_data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and event_data["event"] == EVENT_TYPE_ROOM_SENSOR_ASSIST_UPDATED
        ]
        self.assertEqual(events[-1]["assist_delta"], 1.0)
        self.assertEqual(events[-1]["applied_offset"], 1.4)

    async def test_room_sensor_assist_auto_changes_rounding_direction_on_crossing(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="auto",
            attributes={"current_temperature": 22.2, "temperature": 22},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 3,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 22,
                "hvac_mode": "auto",
            }
        ]
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(self.climate.calls[-1][2], 24.0)
        self.assertEqual(
            self.scheduler._room_sensor_assist_states[self.entity_id].direction,
            "heat",
        )
        self.climate.calls.clear()
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="24",
            attributes={"unit_of_measurement": "°C"},
        )

        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 20.5, True, "auto")],
        )
        self.assertEqual(
            self.scheduler._room_sensor_assist_states[self.entity_id].direction,
            "cool",
        )

    async def test_room_sensor_assist_auto_holding_has_no_fixed_mode_guard(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="auto",
            attributes={"current_temperature": 25.2, "temperature": 22},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="22",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 3,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 22,
                "hvac_mode": "auto",
            }
        ]

        await self.scheduler.async_apply_current_schedule()

        self.assertEqual(
            self.climate.calls[-1],
            ("set_temperature", self.entity_id, 25.0, True, "auto"),
        )
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertEqual(state.applied_temperature, 25.0)
        self.assertEqual(state.applied_offset, -0.2)
        self.assertIsNone(state.scheduled_target_guard)
        self.assertEqual(
            self.scheduler._room_sensor_assist_status(self.entity_id)["status"],
            "holding",
        )

    async def test_room_sensor_assist_scalar_heat_cool_changes_direction(self) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool",
            attributes={"current_temperature": 22.2, "temperature": 22},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 3,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 22,
                "hvac_mode": "heat_cool",
            }
        ]

        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(
            self.climate.calls[-1],
            ("set_temperature", self.entity_id, 24.0, True, "heat_cool"),
        )
        self.climate.calls.clear()
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="24",
            attributes={"unit_of_measurement": "°C"},
        )

        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 20.5, True, "heat_cool")],
        )
        self.assertEqual(
            self.scheduler._room_sensor_assist_states[self.entity_id].direction,
            "cool",
        )

    async def test_room_sensor_assist_rejects_range_only_effective_mode(self) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.climate.single_temperature_support[(self.entity_id, "heat_cool")] = False
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool",
            attributes={"current_temperature": 22, "temperature": None},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 22,
                "hvac_mode": "heat_cool",
            }
        ]

        await self.scheduler._async_refresh_room_sensor_assist(
            self.entity_id,
            target_temperature=22,
            hvac_mode="heat_cool",
            weekday="tuesday",
            start="17:00",
            reason="current_schedule",
        )

        self.assertEqual(self.climate.calls, [])
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)
        self.assertNotIn(
            self.entity_id,
            self.scheduler._room_sensor_assist_candidate_climates(),
        )
        status = self.scheduler._room_sensor_assist_status(self.entity_id)
        self.assertEqual(status["status"], "unavailable")
        self.assertEqual(status["reason"], "unsupported_temperature_range")

    async def test_room_sensor_assist_refreshes_block_metadata_without_service_call(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 20, "temperature": 21},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="15",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 3,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            }
        ]

        await self.scheduler._async_refresh_room_sensor_assist(
            self.entity_id,
            target_temperature=25,
            hvac_mode="heat",
            weekday="tuesday",
            start="17:00",
            reason="current_schedule",
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "18:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 26,
                "hvac_mode": "heat",
            }
        ]
        await self.scheduler._async_refresh_room_sensor_assist(
            self.entity_id,
            target_temperature=26,
            hvac_mode="heat",
            weekday="tuesday",
            start="18:00",
            reason="current_schedule",
        )

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 23.0, True, "heat")],
        )
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertEqual(state.target_temperature, 26)
        self.assertEqual(state.start, "18:00")
        self.assertEqual(state.applied_offset, 3.0)

    async def test_room_sensor_assist_slow_scalar_refresh_is_restored_by_pause(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 20, "temperature": 25},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="15", attributes={"unit_of_measurement": "°C"}
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 3,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            }
        ]
        started = asyncio.Event()
        release = asyncio.Event()
        original_set_temperature = self.climate.async_set_temperature

        async def slow_first_set_temperature(*args, **kwargs) -> None:
            if not started.is_set():
                started.set()
                await release.wait()
            await original_set_temperature(*args, **kwargs)

        self.climate.async_set_temperature = slow_first_set_temperature
        refresh = asyncio.create_task(
            self.scheduler._async_refresh_room_sensor_assist_from_current_event(
                self.entity_id
            )
        )
        await started.wait()
        pause = asyncio.create_task(self.scheduler.async_pause_zone(self.entity_id))
        await asyncio.sleep(0)
        release.set()
        await asyncio.gather(refresh, pause)

        self.assertEqual(
            self.climate.calls,
            [
                ("set_temperature", self.entity_id, 23.0, True, "heat"),
                ("set_temperature", self.entity_id, 25.0, False, "heat"),
            ],
        )
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)
        self.assertEqual(self.scheduler._room_sensor_assist_entities, ())
        self.assertIn(self.entity_id, self.scheduler._room_sensor_assist_suppressed)

    async def test_room_sensor_assist_slow_range_refresh_is_restored_by_pause(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.climate.temperature_range_support[self.entity_id] = True
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool",
            attributes={
                "current_temperature": 22,
                "target_temp_low": 20,
                "target_temp_high": 24,
            },
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="19", attributes={"unit_of_measurement": "°C"}
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 2,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "target_temp_low": 20,
                "target_temp_high": 24,
                "hvac_mode": "heat_cool",
            }
        ]
        started = asyncio.Event()
        release = asyncio.Event()
        original_set_range = self.climate.async_set_temperature_range

        async def slow_first_set_range(*args, **kwargs) -> None:
            if not started.is_set():
                started.set()
                await release.wait()
            await original_set_range(*args, **kwargs)

        self.climate.async_set_temperature_range = slow_first_set_range
        refresh = asyncio.create_task(
            self.scheduler._async_refresh_room_sensor_assist_from_current_event(
                self.entity_id
            )
        )
        await started.wait()
        pause = asyncio.create_task(self.scheduler.async_pause_zone(self.entity_id))
        await asyncio.sleep(0)
        release.set()
        await asyncio.gather(refresh, pause)

        self.assertEqual(
            self.climate.calls,
            [
                ("set_temperature_range", self.entity_id, 23.0, 27.0, True, "heat_cool"),
                ("set_temperature_range", self.entity_id, 20, 24, False, "heat_cool"),
            ],
        )
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)
        self.assertEqual(self.scheduler._room_sensor_assist_entities, ())

    async def test_room_sensor_assist_clear_invalidates_already_queued_refresh(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 20, "temperature": 25},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="15", attributes={"unit_of_measurement": "°C"}
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 3,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            }
        ]
        lock = self.scheduler._room_sensor_assist_lock(self.entity_id)
        await lock.acquire()
        refresh = asyncio.create_task(
            self.scheduler._async_refresh_room_sensor_assist_from_current_event(
                self.entity_id
            )
        )
        await asyncio.sleep(0)
        clear = asyncio.create_task(
            self.scheduler._async_clear_room_sensor_assist(
                self.entity_id, restore=True, reason="test_clear"
            )
        )
        await asyncio.sleep(0)
        lock.release()
        await asyncio.gather(refresh, clear)

        self.assertEqual(self.climate.calls, [])
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)
        self.assertEqual(self.scheduler._room_sensor_assist_entities, ())

    async def test_room_sensor_assist_revalidates_hvac_mode_for_queued_refresh(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 20, "temperature": 25},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="15", attributes={"unit_of_measurement": "°C"}
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
            }
        )
        block = {
            "start": "17:00",
            "action": ACTION_SET_TEMPERATURE,
            "temperature": 25,
            "hvac_mode": "heat",
        }
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [block]
        lock = self.scheduler._room_sensor_assist_lock(self.entity_id)
        await lock.acquire()
        refresh = asyncio.create_task(
            self.scheduler._async_refresh_room_sensor_assist(
                self.entity_id,
                target_temperature=25,
                hvac_mode="heat",
                weekday="tuesday",
                start="17:00",
                reason="stale_mode",
            )
        )
        await asyncio.sleep(0)
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {**block, "hvac_mode": "cool"}
        ]
        lock.release()
        await refresh

        self.assertEqual(self.climate.calls, [])
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)

    async def test_temperature_migration_restore_follows_slow_assist_refresh(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 20, "temperature": 25},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="15", attributes={"unit_of_measurement": "°C"}
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 3,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "heat",
            }
        ]
        started = asyncio.Event()
        release = asyncio.Event()
        original_set_temperature = self.climate.async_set_temperature

        async def slow_first_set_temperature(*args, **kwargs) -> None:
            if not started.is_set():
                started.set()
                await release.wait()
            await original_set_temperature(*args, **kwargs)

        self.climate.async_set_temperature = slow_first_set_temperature
        refresh = asyncio.create_task(
            self.scheduler._async_refresh_room_sensor_assist(
                self.entity_id,
                target_temperature=25,
                hvac_mode="heat",
                weekday="tuesday",
                start="17:00",
                reason="migration_race",
                force_apply=True,
            )
        )
        await started.wait()
        self.scheduler.set_temperature_migration_blocked(True)
        restore = asyncio.create_task(
            self.scheduler.async_restore_room_sensor_assist_after_temperature_operation(
                "°C", "°C", reason="temperature_migration"
            )
        )
        await asyncio.sleep(0)
        release.set()
        await asyncio.gather(refresh, restore)

        self.assertEqual(
            self.climate.calls,
            [
                ("set_temperature", self.entity_id, 23.0, True, "heat"),
                ("set_temperature", self.entity_id, 25.0, False, "heat"),
            ],
        )
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)
        self.assertEqual(self.scheduler._room_sensor_assist_entities, ())

    async def test_stop_during_scalar_base_apply_prevents_assist_revival(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 20, "temperature": 25},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="15", attributes={"unit_of_measurement": "°C"}
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
            }
        )
        block = {
            "start": "17:00",
            "action": ACTION_SET_TEMPERATURE,
            "temperature": 25,
            "hvac_mode": "heat",
        }
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [block]
        event = scheduler_module.ClimateEvent(
            entity_id=self.entity_id,
            when=NOW,
            temperature=25,
            weekday="tuesday",
            start="17:00",
            hvac_mode="heat",
        )
        started = asyncio.Event()
        release = asyncio.Event()
        original_set_temperature = self.climate.async_set_temperature

        async def slow_base_set(*args, **kwargs) -> None:
            started.set()
            await release.wait()
            await original_set_temperature(*args, **kwargs)

        self.climate.async_set_temperature = slow_base_set
        apply_event = asyncio.create_task(self.scheduler._async_apply_event(event))
        await started.wait()
        stop = asyncio.create_task(self.scheduler.async_stop())
        await asyncio.sleep(0)
        release.set()
        await asyncio.gather(apply_event, stop)

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 25, True, "heat")],
        )
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)
        self.assertEqual(self.scheduler._room_sensor_assist_entities, ())
        self.assertNotIn(self.entity_id, self.scheduler._preconditioning_sessions)

    async def test_stop_during_range_base_apply_prevents_assist_revival(self) -> None:
        self.climate.temperature_range_support[self.entity_id] = True
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool",
            attributes={
                "current_temperature": 22,
                "target_temp_low": 20,
                "target_temp_high": 24,
            },
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="19", attributes={"unit_of_measurement": "°C"}
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
            }
        )
        block = {
            "start": "17:00",
            "action": ACTION_SET_TEMPERATURE,
            "target_temp_low": 20,
            "target_temp_high": 24,
            "hvac_mode": "heat_cool",
        }
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [block]
        event = scheduler_module.ClimateEvent(
            entity_id=self.entity_id,
            when=NOW,
            temperature=None,
            target_temp_low=20,
            target_temp_high=24,
            weekday="tuesday",
            start="17:00",
            hvac_mode="heat_cool",
        )
        started = asyncio.Event()
        release = asyncio.Event()
        original_set_range = self.climate.async_set_temperature_range

        async def slow_base_set_range(*args, **kwargs) -> None:
            started.set()
            await release.wait()
            await original_set_range(*args, **kwargs)

        self.climate.async_set_temperature_range = slow_base_set_range
        apply_event = asyncio.create_task(self.scheduler._async_apply_event(event))
        await started.wait()
        stop = asyncio.create_task(self.scheduler.async_stop())
        await asyncio.sleep(0)
        release.set()
        await asyncio.gather(apply_event, stop)

        self.assertEqual(
            self.climate.calls,
            [("set_temperature_range", self.entity_id, 20, 24, True, "heat_cool")],
        )
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)
        self.assertEqual(self.scheduler._room_sensor_assist_entities, ())

    def test_room_sensor_assist_minimum_delta_is_symmetric_deadband(self) -> None:
        self.climate.steps[self.entity_id] = 0.5
        config = normalize_preconditioning_data(
            {"minimum_delta_temperature": 1, "room_sensor_assist_max_delta": 5}
        )

        below_target = self.scheduler._room_sensor_assist_target(
            self.entity_id,
            config,
            "heat",
            22,
            21,
            22,
        )
        above_target = self.scheduler._room_sensor_assist_target(
            self.entity_id,
            config,
            "cool",
            22,
            23,
            22,
        )

        self.assertEqual(below_target.applied_temperature, 22.0)
        self.assertEqual(below_target.assist_delta, 0.0)
        self.assertEqual(below_target.applied_offset, 0.0)
        self.assertEqual(above_target.applied_temperature, 22.0)
        self.assertEqual(above_target.assist_delta, 0.0)
        self.assertEqual(above_target.applied_offset, 0.0)

    def test_room_sensor_assist_signed_target_respects_climate_limits(self) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.climate.limits[self.entity_id] = (5, 30)
        config = normalize_preconditioning_data(
            {"minimum_delta_temperature": 0, "room_sensor_assist_max_delta": 5}
        )

        maximum_limited = self.scheduler._room_sensor_assist_target(
                self.entity_id,
                config,
                "heat",
                25,
                15,
                29,
        )
        minimum_limited = self.scheduler._room_sensor_assist_target(
                self.entity_id,
                config,
                "cool",
                15,
                25,
                6,
        )
        self.assertEqual(maximum_limited.applied_temperature, 30.0)
        self.assertEqual(maximum_limited.requested_temperature, 34.0)
        self.assertEqual(maximum_limited.limited_by, "maximum")
        self.assertEqual(maximum_limited.limit_temperature, 30)
        self.assertEqual(minimum_limited.applied_temperature, 5.0)
        self.assertEqual(minimum_limited.requested_temperature, 1.0)
        self.assertEqual(minimum_limited.limited_by, "minimum")
        self.assertEqual(minimum_limited.limit_temperature, 5)

    async def test_room_sensor_assist_recalculates_for_higher_cool_block(
        self,
    ) -> None:
        before_transition = datetime(2026, 5, 19, 17, 30, tzinfo=timezone.utc)
        transition = datetime(2026, 5, 19, 18, 0, tzinfo=timezone.utc)
        original_now = scheduler_module.dt_util.now
        scheduler_module.dt_util.now = lambda: before_transition
        self.addCleanup(setattr, scheduler_module.dt_util, "now", original_now)
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="cool",
            attributes={"current_temperature": 25, "temperature": 20},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "enabled": False,
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 20,
                "hvac_mode": "cool",
            },
            {
                "start": "18:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "cool",
            },
        ]
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(
            self.climate.calls[-1],
            ("set_temperature", self.entity_id, 25.0, True, "cool"),
        )
        self.climate.calls.clear()
        scheduler_module.dt_util.now = lambda: transition

        await self.scheduler._handle_timer(transition)

        self.assertEqual(
            self.climate.calls,
            [
                ("set_temperature", self.entity_id, 25.0, True, "cool"),
                ("set_temperature", self.entity_id, 27.0, True, "cool"),
            ],
        )
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertEqual(state.target_temperature, 25.0)
        self.assertEqual(state.start, "18:00")

    async def test_room_sensor_assist_callback_uses_new_current_cool_block(
        self,
    ) -> None:
        before_transition = datetime(2026, 5, 19, 17, 30, tzinfo=timezone.utc)
        transition = datetime(2026, 5, 19, 18, 0, tzinfo=timezone.utc)
        original_now = scheduler_module.dt_util.now
        scheduler_module.dt_util.now = lambda: before_transition
        self.addCleanup(setattr, scheduler_module.dt_util, "now", original_now)
        self.climate.steps[self.entity_id] = 0.5
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="cool",
            attributes={"current_temperature": 25, "temperature": 20},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "enabled": False,
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 20,
                "hvac_mode": "cool",
            },
            {
                "start": "18:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 25,
                "hvac_mode": "cool",
            },
        ]
        await self.scheduler.async_apply_current_schedule()
        self.climate.calls.clear()
        scheduler_module.dt_util.now = lambda: transition

        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )

        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertEqual(state.target_temperature, 25.0)
        self.assertEqual(state.start, "18:00")

    async def test_room_sensor_assist_uses_zero_correction_when_room_reaches_target(
        self,
    ) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 22, "temperature": 22},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="20.5",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 22,
                "hvac_mode": "heat",
            }
        ]
        await self.scheduler.async_apply_current_schedule()
        self.climate.calls.clear()
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="22",
            attributes={"unit_of_measurement": "°C"},
        )

        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 22.0, True, "heat")],
        )
        events = [
            event_data
            for event_type, event_data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and event_data["event"] == EVENT_TYPE_ROOM_SENSOR_ASSIST_UPDATED
        ]
        self.assertEqual(events[-1]["assist_delta"], 0.0)
        self.assertEqual(events[-1]["applied_offset"], 0.0)

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

    async def test_late_preconditioning_window_scheduled_due_now_applies(
        self,
    ) -> None:
        due_now = datetime(2026, 5, 19, 19, 40, tzinfo=timezone.utc)
        original_now = scheduler_module.dt_util.now
        scheduler_module.dt_util.now = lambda: due_now
        self.addCleanup(setattr, scheduler_module.dt_util, "now", original_now)
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
        await asyncio.sleep(0)

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 21.0, True, "heat")],
        )

    def test_applied_preconditioning_window_remains_visible_until_target(
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
        event = self.scheduler.calculate_next_event(
            datetime(2026, 5, 19, 19, 40, tzinfo=timezone.utc)
        )
        self.assertIsNotNone(event)
        self.scheduler._mark_preconditioning_applied(event)

        events = self.scheduler.calculate_next_events_by_zone(
            datetime(2026, 5, 19, 19, 41, tzinfo=timezone.utc)
        )

        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].entity_id, self.entity_id)
        self.assertEqual(events[0].when, datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc))
        self.assertEqual(
            events[0].target_when,
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc),
        )

    def test_applied_preconditioning_window_uses_target_as_next_timer(
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
        event = self.scheduler.calculate_next_event(
            datetime(2026, 5, 19, 19, 40, tzinfo=timezone.utc)
        )
        self.assertIsNotNone(event)
        self.scheduler.next_event = event
        self.scheduler._mark_preconditioning_applied(event)

        self.assertEqual(
            self.scheduler._calculate_next_action_time(
                datetime(2026, 5, 19, 19, 41, tzinfo=timezone.utc)
            ),
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc),
        )

    async def test_applied_preconditioning_window_is_not_reapplied(
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
        event = self.scheduler.calculate_next_event(
            datetime(2026, 5, 19, 19, 40, tzinfo=timezone.utc)
        )
        self.assertIsNotNone(event)
        self.scheduler._mark_preconditioning_applied(event)

        await self.scheduler._handle_timer(
            datetime(2026, 5, 19, 19, 41, tzinfo=timezone.utc)
        )

        self.assertEqual(self.climate.calls, [])

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

    def test_heat_cool_preconditioning_uses_effective_cooling_direction(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool",
            attributes={"current_temperature": 26},
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 23,
                "hvac_mode": "heat_cool",
            }
        ]

        event = self.scheduler.calculate_next_event(NOW)

        self.assertIsNotNone(event)
        self.assertEqual(event.hvac_mode, "heat_cool")
        self.assertEqual(event.when, datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc))
        self.assertEqual(
            event.target_when,
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc),
        )
        self.assertIsNotNone(event.preconditioning_diagnostics)
        assert event.preconditioning_diagnostics is not None
        self.assertEqual(event.preconditioning_diagnostics["direction"], "cool")

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

    def test_sync_home_assistant_callbacks_run_on_event_loop(self) -> None:
        callbacks = (
            self.scheduler._handle_preconditioning_state_change,
            self.scheduler._handle_preconditioning_replan_state_change,
            self.scheduler._handle_preconditioning_replan_timer,
            self.scheduler._handle_room_sensor_assist_state_change,
            self.scheduler._handle_room_sensor_assist_timer,
            self.scheduler._handle_comfort_state_change,
        )

        for handler in callbacks:
            with self.subTest(handler=handler.__name__):
                self.assertTrue(
                    getattr(
                        handler.__func__,
                        "__velair_test_callback__",
                        False,
                    )
                )

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

    def test_preconditioning_ignores_room_sensor_when_assist_is_disabled(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 21},
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="18",
            attributes={"unit_of_measurement": "°C"},
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": False,
            }
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
        self.assertEqual(
            self.scheduler._temperature_source_entity_id(self.entity_id),
            self.entity_id,
        )

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
        recorded = [
            event_data
            for event_type, event_data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and event_data["event"]
            == EVENT_TYPE_PRECONDITIONING_OBSERVATION_RECORDED
        ]
        self.assertEqual(len(recorded), 1)
        self.assertEqual(recorded[0]["entity_id"], self.entity_id)
        self.assertEqual(recorded[0]["direction"], "heat")
        self.assertEqual(recorded[0]["quality"], "complete")
        self.assertEqual(recorded[0]["minutes_to_reach"], 50)
        self.assertEqual(recorded[0]["stored_sample_count"], 1)

    async def test_active_target_reports_block_started_by_preconditioning(self) -> None:
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

        active_target = self.scheduler.get_active_target_event(self.entity_id)
        self.assertIsNotNone(active_target)
        assert active_target is not None
        self.assertEqual(active_target.temperature, 21)
        self.assertEqual(active_target.hvac_mode, "heat")
        self.assertEqual(active_target.when, datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc))
        self.assertEqual(
            active_target.target_when,
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc),
        )

    async def test_recorded_observation_event_uses_final_invalid_quality(self) -> None:
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
            datetime(2026, 5, 19, 18, 31, tzinfo=timezone.utc),
            20.8,
        )

        recorded = next(
            event_data
            for event_type, event_data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and event_data["event"]
            == EVENT_TYPE_PRECONDITIONING_OBSERVATION_RECORDED
        )
        self.assertEqual(recorded["quality"], "invalid")
        self.assertEqual(recorded["invalid_reason"], "out_of_bounds")
        self.assertEqual(recorded["stored_sample_count"], 1)

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


    async def test_room_sensor_assist_range_preserves_width_across_boundaries(self) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.climate.limits[self.entity_id] = (5, 35)
        config = normalize_preconditioning_data(
            {
                "minimum_delta_temperature": 0.3,
                "room_sensor_assist_max_delta": 2,
            }
        )

        cases = (
            (19.0, (23.0, 27.0, 1.0, 3.0), "heat"),
            (19.7, (20.0, 24.0, 0.0, 0.0), None),
            (20.0, (20.0, 24.0, 0.0, 0.0), None),
            (22.0, (20.0, 24.0, 0.0, 0.0), None),
            (24.0, (20.0, 24.0, 0.0, 0.0), None),
            (24.3, (20.0, 24.0, 0.0, 0.0), None),
            (25.0, (17.5, 21.5, 1.0, -2.5), "cool"),
        )
        for room_temperature, expected, direction in cases:
            with self.subTest(room_temperature=room_temperature):
                result = self.scheduler._room_sensor_assist_range_target(
                    self.entity_id,
                    config,
                    20,
                    24,
                    room_temperature,
                    22.2,
                )

                self.assertEqual(
                    (
                        result.applied_low,
                        result.applied_high,
                        result.assist_delta,
                        result.range_shift,
                    ),
                    expected,
                )
                self.assertEqual(result.applied_high - result.applied_low, 4)
                self.assertEqual(
                    self.scheduler._room_sensor_assist_range_direction(
                        config, 20, 24, room_temperature
                    ),
                    direction,
                )

    def test_room_sensor_assist_range_uses_native_fahrenheit_step_and_limits(self) -> None:
        self.climate.temperature_unit = lambda _entity_id: scheduler_module.FAHRENHEIT
        self.climate.steps[self.entity_id] = 1
        self.climate.limits[self.entity_id] = (41, 95)
        config = normalize_preconditioning_data(
            {"minimum_delta_temperature": 1, "room_sensor_assist_max_delta": 4}
        )

        result = self.scheduler._room_sensor_assist_range_target(
            self.entity_id,
            config,
            68,
            75,
            64,
            77,
        )

        self.assertEqual(
            (
                result.applied_low,
                result.applied_high,
                result.assist_delta,
                result.range_shift,
                result.limited_by,
            ),
            (81, 88, 4, 13, None),
        )
        self.assertEqual(result.applied_high - result.applied_low, 7)

    async def test_room_sensor_assist_batch_isolates_zone_failures(self) -> None:
        refreshed: list[str] = []

        async def refresh(entity_id: str) -> None:
            refreshed.append(entity_id)
            if entity_id == "climate.first":
                raise RuntimeError("offline")

        self.scheduler._async_refresh_room_sensor_assist_from_current_event = refresh
        write_state = Mock()
        self.scheduler._async_write_state = write_state

        with self.assertLogs("custom_components.velair.scheduler", level="ERROR"):
            await self.scheduler._async_refresh_room_sensor_assist_candidates(
                ["climate.first", "climate.second"]
            )

        self.assertEqual(refreshed, ["climate.first", "climate.second"])
        write_state.assert_called_once_with()

    async def test_room_sensor_assist_range_preserves_submillidegree_step(self) -> None:
        self.climate.steps[self.entity_id] = 0.0005
        self.climate.limits[self.entity_id] = (20, 21)
        config = normalize_preconditioning_data(
            {"minimum_delta_temperature": 0.1, "room_sensor_assist_max_delta": 0.5}
        )

        result = self.scheduler._room_sensor_assist_range_target(
            self.entity_id,
            config,
            20.1,
            20.1005,
            19.5,
            20.2,
        )

        self.assertAlmostEqual(result.applied_high - result.applied_low, 0.0005, places=6)
        self.assertAlmostEqual(
            result.requested_high - result.requested_low,
            0.0005,
            places=6,
        )

    async def test_room_sensor_assist_range_holding_positions_band_and_clamps_shift(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        config = normalize_preconditioning_data(
            {"minimum_delta_temperature": 0.3, "room_sensor_assist_max_delta": 5}
        )

        holding = self.scheduler._room_sensor_assist_range_target(
            self.entity_id, config, 20, 24, 22, 18
        )
        self.assertEqual(
            (holding.applied_low, holding.applied_high, holding.assist_delta, holding.range_shift),
            (17.5, 21.5, 0.0, -2.5),
        )
        self.climate.limits[self.entity_id] = (5, 25)
        limited = self.scheduler._room_sensor_assist_range_target(
            self.entity_id, config, 20, 24, 10, 24
        )
        self.assertEqual(
            (limited.applied_low, limited.applied_high, limited.assist_delta, limited.range_shift),
            (21.0, 25.0, 5.0, 1.0),
        )
        self.assertEqual(limited.applied_high - limited.applied_low, 4)
        self.assertEqual((limited.requested_low, limited.requested_high), (29.0, 33.0))
        self.assertEqual(limited.limited_by, "maximum")
        self.assertEqual(limited.limit_temperature, 25)

        minimum_limited = self.scheduler._room_sensor_assist_range_target(
            self.entity_id, config, 20, 24, 30, 6
        )
        self.assertEqual(
            (minimum_limited.applied_low, minimum_limited.applied_high),
            (5.0, 9.0),
        )
        self.assertEqual(
            (minimum_limited.requested_low, minimum_limited.requested_high),
            (-3.0, 1.0),
        )
        self.assertEqual(minimum_limited.limited_by, "minimum")
        self.assertEqual(minimum_limited.limit_temperature, 5)

    async def test_room_sensor_assist_range_hold_does_not_follow_internal_sensor(self) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.climate.temperature_range_support[self.entity_id] = True
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool",
            attributes={
                "current_temperature": 18,
                "target_temp_low": 20,
                "target_temp_high": 24,
            },
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="22", attributes={"unit_of_measurement": "°C"}
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "target_temp_low": 20,
                "target_temp_high": 24,
                "hvac_mode": "heat_cool",
            }
        ]

        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(
            self.climate.calls[-1],
            (
                "set_temperature_range",
                self.entity_id,
                17.5,
                21.5,
                True,
                "heat_cool",
            ),
        )
        self.climate.calls.clear()
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool",
            attributes={
                "current_temperature": 16,
                "target_temp_low": 17.5,
                "target_temp_high": 21.5,
            },
        )

        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )

        self.assertEqual(self.climate.calls, [])
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertEqual(
            (state.applied_target_temp_low, state.applied_target_temp_high),
            (17.5, 21.5),
        )
        self.assertEqual(state.range_shift, -2.5)

    async def test_room_sensor_assist_range_holding_reports_infeasible_limits(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.climate.limits[self.entity_id] = (5, 25)
        config = normalize_preconditioning_data(
            {"minimum_delta_temperature": 0.3, "room_sensor_assist_max_delta": 5}
        )

        maximum = self.scheduler._room_sensor_assist_range_target(
            self.entity_id, config, 20, 24, 22, 30
        )
        self.assertEqual((maximum.requested_low, maximum.requested_high), (26.5, 30.5))
        self.assertEqual((maximum.applied_low, maximum.applied_high), (21.0, 25.0))
        self.assertEqual(maximum.limited_by, "maximum")

        minimum = self.scheduler._room_sensor_assist_range_target(
            self.entity_id, config, 20, 24, 22, 0
        )
        self.assertEqual((minimum.requested_low, minimum.requested_high), (-0.5, 3.5))
        self.assertEqual((minimum.applied_low, minimum.applied_high), (5.0, 9.0))
        self.assertEqual(minimum.limited_by, "minimum")

    async def test_room_sensor_assist_range_transitions_and_restores_exact_payload(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.climate.temperature_range_support[self.entity_id] = True
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool",
            attributes={
                "current_temperature": 22,
                "target_temp_low": 20,
                "target_temp_high": 24,
            },
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="19", attributes={"unit_of_measurement": "°C"}
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 2,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "target_temp_low": 20,
                "target_temp_high": 24,
                "hvac_mode": "heat_cool",
            }
        ]

        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(
            self.climate.calls[-1],
            ("set_temperature_range", self.entity_id, 23.0, 27.0, True, "heat_cool"),
        )
        self.assertIn(self.entity_id, self.scheduler._room_sensor_assist_candidate_climates())
        status = self.scheduler._room_sensor_assist_status(self.entity_id)
        self.assertEqual(status["status"], "assisting")
        self.assertEqual(status["target_temp_low"], 20)
        self.assertEqual(status["target_temp_high"], 24)
        self.assertEqual(status["applied_target_temp_low"], 23)
        self.assertEqual(status["applied_target_temp_high"], 27)
        self.assertEqual(status["climate_target_temp_low"], 20)
        self.assertEqual(status["climate_target_temp_high"], 24)
        self.assertEqual(status["range_shift"], 3)
        self.assertIsNone(status["applied_offset"])
        updated = [
            data
            for event_type, data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and data["event"] == EVENT_TYPE_ROOM_SENSOR_ASSIST_UPDATED
        ][-1]
        self.assertEqual(updated["target_temp_low"], 20)
        self.assertEqual(updated["target_temp_high"], 24)
        self.assertEqual(updated["applied_target_temp_low"], 23)
        self.assertEqual(updated["applied_target_temp_high"], 27)
        self.assertEqual(updated["range_shift"], 3)
        self.assertNotIn("target_temperature", updated)
        self.assertNotIn("applied_temperature", updated)
        self.assertNotIn("applied_offset", updated)

        # Reapplying a scheduled block first restores its base range. Room Assist
        # must then resend the assisted range even when its calculated target has
        # not changed since the previous application.
        self.climate.calls.clear()
        current_event = self.scheduler.get_current_event(self.entity_id)
        self.assertIsNotNone(current_event)
        await self.scheduler._async_apply_event(current_event)
        self.assertEqual(
            self.climate.calls[-2:],
            [
                (
                    "set_temperature_range",
                    self.entity_id,
                    20.0,
                    24.0,
                    True,
                    "heat_cool",
                ),
                (
                    "set_temperature_range",
                    self.entity_id,
                    23.0,
                    27.0,
                    True,
                    "heat_cool",
                ),
            ],
        )

        self.climate.calls.clear()
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )
        self.assertEqual(self.climate.calls, [])

        self.hass.states["sensor.salon_temperature"].state = "22"
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )
        self.assertEqual(self.climate.calls[-1][2:4], (20.0, 24.0))
        self.assertEqual(
            self.scheduler._room_sensor_assist_status(self.entity_id)["status"],
            "holding",
        )

        self.hass.states["sensor.salon_temperature"].state = "25"
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )
        self.assertEqual(self.climate.calls[-1][2:4], (17.0, 21.0))
        self.assertEqual(
            self.scheduler._room_sensor_assist_status(self.entity_id)["direction"],
            "cool",
        )

        await self.scheduler._async_clear_room_sensor_assist(
            self.entity_id, restore=True, reason="test_restore"
        )
        self.assertEqual(self.climate.calls[-1][2:4], (20, 24))
        restored = [
            data
            for event_type, data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and data["event"] == EVENT_TYPE_ROOM_SENSOR_ASSIST_RESTORED
        ][-1]
        self.assertEqual(restored["target_temp_low"], 20)
        self.assertEqual(restored["target_temp_high"], 24)
        self.assertEqual(restored["applied_target_temp_low"], 20)
        self.assertEqual(restored["applied_target_temp_high"], 24)
        self.assertEqual(restored["range_shift"], 0.0)
        self.assertNotIn("target_temperature", restored)
        self.assertNotIn("applied_temperature", restored)
        self.assertNotIn("applied_offset", restored)

        self.scheduler._room_sensor_assist_suppressed.discard(self.entity_id)
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )
        self.climate.limits[self.entity_id] = (45, 95)
        self.climate.steps[self.entity_id] = 1
        self.climate.calls.clear()
        await self.scheduler.async_restore_room_sensor_assist_after_temperature_operation(
            "°C", "°F", reason="temperature_migration"
        )
        self.assertEqual(
            self.climate.calls,
            [("set_temperature_range", self.entity_id, 68.0, 75.0, False, "heat_cool")],
        )
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)

    async def test_room_sensor_assist_range_limit_notifies_once_and_dismisses_on_recovery(
        self,
    ) -> None:
        self.climate.steps[self.entity_id] = 0.5
        self.climate.limits[self.entity_id] = (5, 25)
        self.climate.temperature_range_support[self.entity_id] = True
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool",
            attributes={
                "current_temperature": 24,
                "target_temp_low": 20,
                "target_temp_high": 24,
            },
        )
        self.hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="10", attributes={"unit_of_measurement": "°C"}
        )
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
                "room_sensor_assist_max_delta": 5,
            }
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "target_temp_low": 20,
                "target_temp_high": 24,
                "hvac_mode": "heat_cool",
            }
        ]

        await self.scheduler.async_apply_current_schedule()

        status = self.scheduler._room_sensor_assist_status(self.entity_id)
        self.assertEqual(status["limited_by"], "maximum")
        self.assertEqual(status["limit_temperature"], 25)
        self.assertEqual(status["requested_target_temp_low"], 29)
        self.assertEqual(status["requested_target_temp_high"], 33)
        self.assertEqual(status["applied_target_temp_low"], 21)
        self.assertEqual(status["applied_target_temp_high"], 25)
        create_calls = [
            call
            for call in self.hass.services.calls
            if call[0:2] == ("persistent_notification", "create")
        ]
        self.assertEqual(len(create_calls), 1)
        self.assertIn("requested 29–33 °C", create_calls[0][2]["message"])
        self.assertIn("applied 21–25 °C", create_calls[0][2]["message"])

        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )
        self.assertEqual(
            len(
                [
                    call
                    for call in self.hass.services.calls
                    if call[0:2] == ("persistent_notification", "create")
                ]
            ),
            1,
        )

        self.hass.states[self.entity_id].attributes["current_temperature"] = 23
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )
        changed_create_calls = [
            call
            for call in self.hass.services.calls
            if call[0:2] == ("persistent_notification", "create")
        ]
        self.assertEqual(len(changed_create_calls), 2)
        self.assertIn("requested 28–32 °C", changed_create_calls[-1][2]["message"])

        self.hass.states["sensor.salon_temperature"].state = "22"
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(
            self.entity_id
        )
        recovered = self.scheduler._room_sensor_assist_status(self.entity_id)
        self.assertIsNone(recovered["limited_by"])
        self.assertIn(
            (
                "persistent_notification",
                "dismiss",
                {"notification_id": "velair_room_assist_limit_climate_salon"},
                True,
            ),
            self.hass.services.calls,
        )

    async def test_room_sensor_assist_scalar_limit_notification_reports_values(self) -> None:
        state = scheduler_module._RoomSensorAssistState(
            entity_id=self.entity_id,
            target_temperature=25,
            applied_temperature=30,
            applied_offset=1,
            direction="heat",
            hvac_mode="heat",
            room_temperature_entity_id="sensor.salon_temperature",
            weekday="tuesday",
            start="17:00",
            limited_by="maximum",
            limit_temperature=30,
            requested_temperature=34,
        )

        await self.scheduler._async_update_room_sensor_assist_limit_notification(state)

        create = self.hass.services.calls[-1]
        self.assertEqual(create[0:2], ("persistent_notification", "create"))
        self.assertIn("requested 34 °C", create[2]["message"])
        self.assertIn("applied 30 °C", create[2]["message"])
        self.assertIn("supported limit is 30 °C", create[2]["message"])

    async def test_room_sensor_assist_limit_notification_uses_climate_fahrenheit_unit(self) -> None:
        self.climate.temperature_unit = lambda _entity_id: scheduler_module.FAHRENHEIT
        state = scheduler_module._RoomSensorAssistState(
            entity_id=self.entity_id,
            target_temperature=None,
            applied_temperature=None,
            applied_offset=None,
            target_temp_low=68,
            target_temp_high=75,
            applied_target_temp_low=88,
            applied_target_temp_high=95,
            range_shift=20,
            direction="heat",
            hvac_mode="heat_cool",
            room_temperature_entity_id="sensor.salon_temperature",
            weekday="tuesday",
            start="17:00",
            limited_by="maximum",
            limit_temperature=95,
            requested_target_temp_low=92,
            requested_target_temp_high=99,
        )

        await self.scheduler._async_update_room_sensor_assist_limit_notification(state)

        message = self.hass.services.calls[-1][2]["message"]
        self.assertIn("requested 92–99 °F", message)
        self.assertIn("applied 88–95 °F", message)
        self.assertIn("supported limit is 95 °F", message)

    async def test_room_sensor_assist_notification_failure_is_isolated(self) -> None:
        async def failing_call(*args, **kwargs) -> None:
            raise RuntimeError("notification service unavailable")

        self.hass.services.async_call = failing_call
        state = scheduler_module._RoomSensorAssistState(
            entity_id=self.entity_id,
            target_temperature=25,
            applied_temperature=30,
            applied_offset=1,
            direction="heat",
            hvac_mode="heat",
            room_temperature_entity_id="sensor.salon_temperature",
            weekday="tuesday",
            start="17:00",
            limited_by="maximum",
            limit_temperature=30,
            requested_temperature=34,
        )

        with self.assertLogs(
            "custom_components.velair.room_assist_notifications", level="ERROR"
        ):
            await self.scheduler._async_update_room_sensor_assist_limit_notification(
                state
            )

        self.assertNotIn(
            self.entity_id,
            self.scheduler._room_sensor_assist_limit_notifications,
        )

    async def test_room_sensor_assist_clear_dismisses_all_limits_after_restore_failure(
        self,
    ) -> None:
        second_entity_id = "climate.second"
        self.data["zones"][second_entity_id] = deepcopy(
            self.data["zones"][self.entity_id]
        )
        for entity_id in (self.entity_id, second_entity_id):
            self.scheduler._room_sensor_assist_states[entity_id] = (
                scheduler_module._RoomSensorAssistState(
                    entity_id=entity_id,
                    target_temperature=25,
                    applied_temperature=30,
                    applied_offset=1,
                    direction="heat",
                    hvac_mode="heat",
                    room_temperature_entity_id="sensor.room",
                    weekday="tuesday",
                    start="17:00",
                    limited_by="maximum",
                    limit_temperature=30,
                    requested_temperature=34,
                )
            )
            self.scheduler._room_sensor_assist_limit_notifications[entity_id] = (
                "maximum",
            )

        original_set_temperature = self.climate.async_set_temperature

        async def fail_first(entity_id, *args, **kwargs) -> None:
            if entity_id == self.entity_id:
                raise RuntimeError("restore failed")
            await original_set_temperature(entity_id, *args, **kwargs)

        self.climate.async_set_temperature = fail_first

        with self.assertLogs("custom_components.velair.scheduler", level="ERROR"):
            with self.assertRaisesRegex(RuntimeError, "restore failed"):
                await self.scheduler._async_clear_room_sensor_assist(
                    restore=True,
                    reason="test_failure",
                )

        self.assertEqual(self.scheduler._room_sensor_assist_states, {})
        dismiss_ids = {
            call[2]["notification_id"]
            for call in self.hass.services.calls
            if call[0:2] == ("persistent_notification", "dismiss")
        }
        self.assertEqual(
            dismiss_ids,
            {
                "velair_room_assist_limit_climate_salon",
                "velair_room_assist_limit_climate_second",
            },
        )
        self.assertIn(
            ("set_temperature", second_entity_id, 25, False, "heat"),
            self.climate.calls,
        )

    async def test_stop_tears_down_runtime_after_room_assist_restore_failure(self) -> None:
        self.scheduler._room_sensor_assist_states[self.entity_id] = (
            scheduler_module._RoomSensorAssistState(
                entity_id=self.entity_id,
                target_temperature=25,
                applied_temperature=30,
                applied_offset=1,
                direction="heat",
                hvac_mode="heat",
                room_temperature_entity_id="sensor.room",
                weekday="tuesday",
                start="17:00",
                limited_by="maximum",
                limit_temperature=30,
                requested_temperature=34,
            )
        )
        self.scheduler._room_sensor_assist_limit_notifications[self.entity_id] = (
            "maximum",
        )
        timer_unsub = Mock()
        assist_unsub = Mock()
        assist_timer_unsub = Mock()
        self.scheduler._unsub_timer = timer_unsub
        self.scheduler._unsub_room_sensor_assist_listener = assist_unsub
        self.scheduler._unsub_room_sensor_assist_timer = assist_timer_unsub

        async def fail_restore(*args, **kwargs) -> None:
            raise RuntimeError("restore failed")

        self.climate.async_set_temperature = fail_restore

        with self.assertLogs("custom_components.velair.scheduler", level="ERROR"):
            await self.scheduler.async_stop()

        timer_unsub.assert_called_once_with()
        assist_unsub.assert_called_once_with()
        assist_timer_unsub.assert_called_once_with()
        self.assertEqual(self.scheduler._room_sensor_assist_states, {})
        self.assertEqual(self.scheduler._room_sensor_assist_entities, ())


class VelairSchedulerZoneRuntimeStatusTest(unittest.TestCase):
    """Verify Overview runtime projection precedence and fields."""

    def setUp(self) -> None:
        self.entity_id = "climate.salon"
        self.data = helpers_data = normalize_schedule_data(None, [self.entity_id])
        self.scheduler = VelairScheduler(FakeHass(), helpers_data, FakeClimateManager(), Mock())
        self.scheduler._room_sensor_assist_status = Mock(return_value={"room_temperature": 20.0, "applied_temperature": 22.0})
        self.scheduler._iter_current_events = Mock(return_value=[])
        self.scheduler.get_active_target_event = Mock(return_value=None)
        self.scheduler._current_hvac_mode = Mock(return_value="heat")
        self.scheduler._hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 20.0, "temperature": 22.0},
        )

    def test_stopped_and_paused_take_precedence_over_boost(self) -> None:
        self.scheduler._get_active_zone_override = Mock(return_value={"type": "boost", "temperature": 23.0})
        self.data["global_"]["mode"] = "off"
        self.assertEqual(self.scheduler._zone_runtime_status(self.entity_id)["state"], "stopped")
        self.data["global_"]["mode"] = MODE_PAUSED
        self.assertEqual(self.scheduler._zone_runtime_status(self.entity_id)["state"], "paused")

    def test_boost_projects_primary_values_and_until(self) -> None:
        self.scheduler._get_active_zone_override = Mock(return_value={"type": "boost", "temperature": 23.0, "until": "2026-05-19T20:00:00+00:00"})
        result = self.scheduler._zone_runtime_status(self.entity_id)
        self.assertEqual(result["state"], "boost")
        self.assertEqual((result["room_temperature"], result["target_temperature"], result["applied_temperature"]), (20.0, 23.0, 22.0))
        self.assertEqual(result["hvac_mode"], "heat")
        self.assertEqual(result["until"], "2026-05-19T20:00:00+00:00")

    def test_idle_uses_current_climate_target_as_fallback(self) -> None:
        self.scheduler._get_active_zone_override = Mock(return_value=None)
        self.scheduler._hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={"current_temperature": 19.0, "temperature": 21.5},
        )

        result = self.scheduler._zone_runtime_status(self.entity_id)

        self.assertEqual(result["state"], "idle")
        self.assertEqual(result["target_temperature"], 21.5)

    def test_idle_rejects_a_climate_target_outside_supported_limits(self) -> None:
        self.scheduler._get_active_zone_override = Mock(return_value=None)
        self.scheduler._room_sensor_assist_status = Mock(return_value={})
        self.scheduler._climate_manager.limits[self.entity_id] = (41, 86)
        self.scheduler._climate_manager.temperature_unit = (
            lambda _entity_id: scheduler_module.FAHRENHEIT
        )
        self.scheduler._hass.states[self.entity_id] = SimpleNamespace(
            state="cool",
            attributes={
                "current_temperature": 72.3,
                "temperature": 145,
                "unit_of_measurement": scheduler_module.FAHRENHEIT,
            },
        )

        result = self.scheduler._zone_runtime_status(self.entity_id)

        self.assertAlmostEqual(result["room_temperature"], 72.3)
        self.assertIsNone(result["target_temperature"])
        self.assertIsNone(result["applied_temperature"])

    def test_room_temperature_uses_climate_when_room_assist_is_disabled(self) -> None:
        self.scheduler._get_active_zone_override = Mock(return_value=None)
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": False,
            }
        )
        self.scheduler._hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="18.0",
            attributes={},
        )

        result = self.scheduler._zone_runtime_status(self.entity_id)

        self.assertEqual(result["room_temperature"], 20.0)

    def test_room_temperature_uses_sensor_when_room_assist_is_enabled(self) -> None:
        self.scheduler._get_active_zone_override = Mock(return_value=None)
        self.data["zones"][self.entity_id]["preconditioning"].update(
            {
                "room_temperature_entity_id": "sensor.salon_temperature",
                "room_sensor_assist_enabled": True,
            }
        )
        self.scheduler._hass.states["sensor.salon_temperature"] = SimpleNamespace(
            state="18.0",
            attributes={},
        )

        result = self.scheduler._zone_runtime_status(self.entity_id)

        self.assertEqual(result["room_temperature"], 18.0)

    def test_preconditioning_precedes_scheduled_and_exposes_interval(self) -> None:
        self.scheduler._get_active_zone_override = Mock(return_value=None)
        now = scheduler_module.dt_util.now()
        event = SimpleNamespace(temperature=21.0, when=now - timedelta(minutes=30), target_when=now + timedelta(minutes=30))
        self.scheduler.get_active_target_event = Mock(return_value=event)
        self.scheduler._iter_current_events = Mock(return_value=[SimpleNamespace(temperature=20.0, target_when=None)])
        result = self.scheduler._zone_runtime_status(self.entity_id)
        self.assertEqual(result["state"], "preconditioning")
        self.assertEqual(result["target_temperature"], 21.0)
        self.assertEqual(result["active_from"], event.when.isoformat())
        self.assertEqual(result["target_when"], event.target_when.isoformat())


class VelairSchedulerTemperatureRangeTest(unittest.IsolatedAsyncioTestCase):
    """Verify native range schedules remain exclusive through application."""

    def setUp(self) -> None:
        self.entity_id = "climate.salon"
        self.hass = FakeHass()
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool", attributes={"current_temperature": 22}
        )
        self.climate = FakeClimateManager()
        self.climate.temperature_range_support[self.entity_id] = True
        self.climate.hvac_modes[self.entity_id] = ["off", "heat", "cool", "heat_cool"]
        self.climate.current_hvac_modes[self.entity_id] = "off"
        self.data = normalize_schedule_data(None, [self.entity_id])

        async def async_save() -> None:
            return None

        self.scheduler = VelairScheduler(
            self.hass, self.data, self.climate, async_save
        )

    async def test_resume_applies_explicit_heat_when_off_climate_hides_scalar_feature(self) -> None:
        schedule = empty_week_schedule()
        schedule["tuesday"] = [
            {
                "start": "00:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 20,
                "hvac_mode": "heat",
            }
        ]
        self.climate.current_hvac_modes[self.entity_id] = "off"
        self.climate.single_temperature_support[(self.entity_id, "heat")] = False
        await self.scheduler.async_set_profile(
            {
                "key": "melview",
                "name": "Melview",
                "color": "#336699",
                "zones": {
                    self.entity_id: {
                        "behavior": "schedule",
                        "schedule": schedule,
                    }
                },
            }
        )
        await self.scheduler.async_activate_profile("melview")
        self.climate.calls.clear()
        self.data["global_"]["mode"] = MODE_PAUSED

        await self.scheduler.async_set_mode(MODE_AUTO, apply_current_schedule=True)

        self.assertIn(
            ("set_temperature", self.entity_id, 20.0, True, "heat"),
            self.climate.calls,
        )

    async def test_profile_scalar_schedule_can_be_saved_while_off_feature_is_hidden(self) -> None:
        schedule = empty_week_schedule()
        schedule["tuesday"] = [
            {
                "start": "00:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 20,
                "hvac_mode": "heat",
            }
        ]
        self.climate.current_hvac_modes[self.entity_id] = "off"
        self.climate.single_temperature_support[(self.entity_id, "heat")] = False

        await self.scheduler.async_set_profile(
            {
                "key": "melview",
                "name": "Melview",
                "color": "#336699",
                "zones": {
                    self.entity_id: {
                        "behavior": "schedule",
                        "schedule": schedule,
                    }
                },
            }
        )

        stored = next(
            profile for profile in self.data["profiles"]
            if profile["key"] == "melview"
        )
        block = stored["zones"][self.entity_id]["schedule"]["tuesday"][0]
        self.assertEqual(block["start"], "00:00")
        self.assertEqual(block["temperature"], 20.0)
        self.assertEqual(block["hvac_mode"], "heat")

    async def test_saved_range_is_snapped_and_applied_as_range(self) -> None:
        await self.scheduler.async_set_daily_schedule(
            self.entity_id,
            "monday",
            [
                {
                    "start": "08:00",
                    "action": ACTION_SET_TEMPERATURE,
                    "target_temp_low": 19.6,
                    "target_temp_high": 24.4,
                    "hvac_mode": "heat_cool",
                }
            ],
        )
        block = self.data["zones"][self.entity_id]["schedule"]["monday"][0]
        self.assertEqual(block["target_temp_low"], 19.5)
        self.assertEqual(block["target_temp_high"], 24.5)
        self.assertNotIn("temperature", block)

        event = scheduler_module.ClimateEvent(
            entity_id=self.entity_id,
            when=NOW,
            temperature=None,
            target_temp_low=19.5,
            target_temp_high=24.5,
            weekday="monday",
            start="08:00",
            hvac_mode="heat_cool",
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "08:00",
                "action": ACTION_SET_TEMPERATURE,
                "target_temp_low": 19.5,
                "target_temp_high": 24.5,
                "hvac_mode": "heat_cool",
            }
        ]
        await self.scheduler._async_apply_event(event)

        self.assertIn(
            (
                "set_temperature_range",
                self.entity_id,
                19.5,
                24.5,
                True,
                "heat_cool",
            ),
            self.climate.calls,
        )
        self.assertFalse(
            any(call[0] == "set_temperature" for call in self.climate.calls)
        )

    async def test_range_profile_and_mode_apply_native_range(self) -> None:
        schedule = empty_week_schedule()
        schedule["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "target_temp_low": 20,
                "target_temp_high": 24,
                "hvac_mode": "heat_cool",
            }
        ]
        await self.scheduler.async_set_profile(
            {
                "key": "comfort",
                "name": "Comfort",
                "color": "#336699",
                "zones": {
                    self.entity_id: {
                        "behavior": "schedule",
                        "schedule": schedule,
                    }
                },
            }
        )

        await self.scheduler.async_activate_profile("comfort")

        expected = (
            "set_temperature_range",
            self.entity_id,
            20.0,
            24.0,
            True,
            "heat_cool",
        )
        self.assertIn(expected, self.climate.calls)
        self.assertFalse(any(call[0] == "set_temperature" for call in self.climate.calls))

        await self.scheduler.async_deactivate_profile()
        self.climate.calls.clear()
        await self.scheduler.async_set_velair_mode(
            {"key": "comfort-mode", "name": "Comfort", "profile_ids": ["comfort"]}
        )
        await self.scheduler.async_select_velair_mode("comfort-mode")

        self.assertIn(expected, self.climate.calls)
        self.assertFalse(any(call[0] == "set_temperature" for call in self.climate.calls))

    async def test_range_schedule_rejects_entity_without_range_capability(self) -> None:
        self.climate.temperature_range_support[self.entity_id] = False

        with self.assertRaisesRegex(ValueError, "does not support"):
            await self.scheduler.async_set_daily_schedule(
                self.entity_id,
                "monday",
                [
                    {
                        "start": "08:00",
                        "action": ACTION_SET_TEMPERATURE,
                        "target_temp_low": 20,
                        "target_temp_high": 24,
                        "hvac_mode": "heat_cool",
                    }
                ],
            )

    async def test_portable_import_rejects_range_for_scalar_only_climate_atomically(self) -> None:
        self.climate.temperature_range_support[self.entity_id] = False
        imported_zones = deepcopy(self.data["zones"])
        imported_zones[self.entity_id]["schedule"]["monday"] = [
            {
                "start": "08:00",
                "action": ACTION_SET_TEMPERATURE,
                "target_temp_low": 20,
                "target_temp_high": 24,
                "hvac_mode": "heat_cool",
            }
        ]
        original_zones = deepcopy(self.data["zones"])

        with self.assertRaisesRegex(ValueError, "does not support"):
            await self.scheduler.async_replace_portable_data(zones=imported_zones)

        self.assertEqual(self.data["zones"], original_zones)
        self.assertEqual(self.climate.calls, [])

    async def test_rejected_manual_range_keeps_room_assist_runtime_unchanged(self) -> None:
        self.climate.temperature_range_support[self.entity_id] = False
        assist_state = object()
        self.scheduler._room_sensor_assist_states[self.entity_id] = assist_state

        with self.assertRaisesRegex(ValueError, "does not support"):
            await self.scheduler.async_set_temperature(
                self.entity_id,
                None,
                target_temp_low=20,
                target_temp_high=24,
                hvac_mode="heat_cool",
            )

        self.assertIs(
            self.scheduler._room_sensor_assist_states[self.entity_id], assist_state
        )
        self.assertEqual(self.climate.calls, [])

    def test_idle_runtime_reports_live_native_range(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool",
            attributes={
                "current_temperature": 22,
                "min_temp": 5,
                "max_temp": 35,
                "target_temp_low": 20,
                "target_temp_high": 24,
            },
        )

        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]

        self.assertEqual(runtime["target_temp_low"], 20)
        self.assertEqual(runtime["target_temp_high"], 24)

    def test_idle_runtime_ignores_stale_range_outside_heat_cool(self) -> None:
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat",
            attributes={
                "current_temperature": 20,
                "temperature": 21,
                "min_temp": 5,
                "max_temp": 35,
                "target_temp_low": 18,
                "target_temp_high": 24,
            },
        )

        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]

        self.assertEqual(runtime["target_temperature"], 21)
        self.assertNotIn("target_temp_low", runtime)
        self.assertNotIn("target_temp_high", runtime)

    async def test_scheduled_range_writes_logbook_entry(self) -> None:
        self.hass.services.logbook_enabled = True
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool",
            attributes={"friendly_name": "Salon"},
        )
        event = scheduler_module.ClimateEvent(
            entity_id=self.entity_id,
            when=NOW,
            temperature=None,
            target_temp_low=20,
            target_temp_high=24,
            weekday="tuesday",
            start="18:00",
            hvac_mode="heat_cool",
        )
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "18:00",
                "action": ACTION_SET_TEMPERATURE,
                "target_temp_low": 20,
                "target_temp_high": 24,
                "hvac_mode": "heat_cool",
            }
        ]

        await self.scheduler._async_apply_event(event)

        self.assertIn(
            (
                "logbook",
                "log",
                {
                    "name": "Velair",
                    "message": "Adjusted Salon to 20–24 °C (Heat/Cool)",
                    "entity_id": self.entity_id,
                },
                False,
            ),
            self.hass.services.calls,
        )
        applied = next(
            payload
            for event_type, payload in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and payload.get("event") == EVENT_TYPE_CLIMATE_TARGET_APPLIED
        )
        self.assertNotIn("temperature", applied)
        self.assertEqual(applied["target_temp_low"], 20)
        self.assertEqual(applied["target_temp_high"], 24)

    async def test_range_boost_remains_active_and_restores_range_snapshot(self) -> None:
        previous_state = {
            "hvac_mode": "heat_cool",
            "target_temp_low": 18,
            "target_temp_high": 23,
        }
        self.climate.snapshots[self.entity_id] = previous_state

        await self.scheduler.async_set_zone_boost(
            self.entity_id,
            None,
            "2026-05-19T19:00:00+00:00",
            target_temp_low=20,
            target_temp_high=24,
            hvac_mode="heat_cool",
        )

        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertEqual(runtime["state"], "boost")
        self.assertEqual(runtime["target_temp_low"], 20)
        self.assertEqual(runtime["target_temp_high"], 24)

        await self.scheduler.async_cancel_zone_boost(self.entity_id)

        self.assertIsNone(self.data["zones"][self.entity_id]["override"])
        self.assertIn(
            ("restore_state", self.entity_id, previous_state),
            self.climate.calls,
        )

    async def test_expired_range_boost_restores_previous_range(self) -> None:
        previous_state = {
            "hvac_mode": "heat_cool",
            "target_temp_low": 18,
            "target_temp_high": 23,
        }
        self.data["zones"][self.entity_id]["override"] = {
            "type": "boost",
            "started_at": "2026-05-19T17:00:00+00:00",
            "until": "2026-05-19T17:30:00+00:00",
            "target_temp_low": 20,
            "target_temp_high": 24,
            "hvac_mode": "heat_cool",
            "previous_state": previous_state,
        }

        await self.scheduler._handle_timer(NOW)

        self.assertIsNone(self.data["zones"][self.entity_id]["override"])
        self.assertEqual(
            self.climate.calls,
            [("restore_state", self.entity_id, previous_state)],
        )

    def _range_preconditioning_config(self):
        config = self.data["zones"][self.entity_id]["preconditioning"]
        config["enabled"] = True
        config["minimum_delta_temperature"] = 0.5
        return config

    def _range_block(self):
        return {
            "start": "20:00",
            "action": ACTION_SET_TEMPERATURE,
            "target_temp_low": 20,
            "target_temp_high": 24,
            "hvac_mode": "heat_cool",
        }

    def test_range_preconditioning_resolves_effective_boundary(self) -> None:
        config = self._range_preconditioning_config()
        block = self._range_block()

        below = self.scheduler._resolve_preconditioning_target(
            self.entity_id, config, block, current_temperature=19.4
        )
        inside = self.scheduler._resolve_preconditioning_target(
            self.entity_id, config, block, current_temperature=22
        )
        lower_deadband = self.scheduler._resolve_preconditioning_target(
            self.entity_id, config, block, current_temperature=19.5
        )
        upper_deadband = self.scheduler._resolve_preconditioning_target(
            self.entity_id, config, block, current_temperature=24.5
        )
        above = self.scheduler._resolve_preconditioning_target(
            self.entity_id, config, block, current_temperature=24.6
        )

        self.assertEqual(
            (below.kind, below.direction, below.boundary_temperature, below.boundary),
            ("range", "heat", 20, "low"),
        )
        self.assertIsNone(inside)
        self.assertIsNone(lower_deadband)
        self.assertIsNone(upper_deadband)
        self.assertEqual(
            (above.kind, above.direction, above.boundary_temperature, above.boundary),
            ("range", "cool", 24, "high"),
        )

    def test_range_preconditioning_uses_native_fahrenheit_boundary_and_deadband(self) -> None:
        self.climate.temperature_unit = lambda _entity_id: scheduler_module.FAHRENHEIT
        config = self._range_preconditioning_config()
        config["minimum_delta_temperature"] = 1
        block = {
            "start": "20:00",
            "action": ACTION_SET_TEMPERATURE,
            "target_temp_low": 68,
            "target_temp_high": 75,
            "hvac_mode": "heat_cool",
        }

        heating = self.scheduler._resolve_preconditioning_target(
            self.entity_id, config, block, current_temperature=66.5
        )
        inside_deadband = self.scheduler._resolve_preconditioning_target(
            self.entity_id, config, block, current_temperature=67
        )
        cooling = self.scheduler._resolve_preconditioning_target(
            self.entity_id, config, block, current_temperature=76.5
        )

        self.assertEqual(
            (
                heating.direction,
                heating.boundary,
                heating.boundary_temperature,
            ),
            ("heat", "low", 68),
        )
        self.assertIsNone(inside_deadband)
        self.assertEqual(
            (
                cooling.direction,
                cooling.boundary,
                cooling.boundary_temperature,
            ),
            ("cool", "high", 75),
        )

    def test_range_preconditioning_uses_heat_cool_fallback_when_climate_is_off(self) -> None:
        config = self._range_preconditioning_config()
        self.climate.hvac_modes[self.entity_id] = ["off", "heat", "cool", "heat_cool"]
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="off",
            attributes={"current_temperature": 18},
        )

        resolved = self.scheduler._resolve_preconditioning_target(
            self.entity_id,
            config,
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "target_temp_low": 20,
                "target_temp_high": 24,
            },
        )

        self.assertIsNotNone(resolved)
        self.assertEqual(
            (resolved.kind, resolved.direction, resolved.boundary_temperature),
            ("range", "heat", 20),
        )

    def test_range_preconditioning_keep_respects_incompatible_running_mode(self) -> None:
        config = self._range_preconditioning_config()
        self.climate.hvac_modes[self.entity_id] = ["off", "cool", "heat_cool"]
        self.climate.current_hvac_modes[self.entity_id] = "cool"

        resolved = self.scheduler._resolve_preconditioning_target(
            self.entity_id,
            config,
            {
                "start": "20:00",
                "action": ACTION_SET_TEMPERATURE,
                "target_temp_low": 20,
                "target_temp_high": 24,
            },
            current_temperature=18,
        )

        self.assertIsNone(resolved)

    def test_range_preconditioning_plans_below_and_above_but_not_inside(self) -> None:
        self._range_preconditioning_config()
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            self._range_block()
        ]
        for current, expected_direction in ((19, "heat"), (25, "cool"), (22, None)):
            with self.subTest(current=current):
                self.hass.states[self.entity_id] = SimpleNamespace(
                    state="heat_cool",
                    attributes={"current_temperature": current},
                )
                event = self.scheduler.calculate_next_event(NOW)
                self.assertIsNotNone(event)
                if expected_direction is None:
                    self.assertIsNone(event.target_when)
                else:
                    self.assertEqual(
                        event.preconditioning_diagnostics["direction"],
                        expected_direction,
                    )
                    self.assertEqual(
                        event.preconditioning_diagnostics["target_kind"], "range"
                    )

    def test_range_preconditioning_plan_event_uses_authoritative_diagnostics(self) -> None:
        self._range_preconditioning_config()
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            self._range_block()
        ]
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool",
            attributes={"current_temperature": 18},
        )

        self.scheduler.async_schedule_next_event()

        planned = next(
            data
            for event_type, data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and data["event"] == EVENT_TYPE_PRECONDITIONING_PLAN_UPDATED
        )
        diagnostics = planned["preconditioning_diagnostics"]
        self.assertIsNone(planned["target_temperature"])
        self.assertEqual((planned["target_temp_low"], planned["target_temp_high"]), (20, 24))
        self.assertEqual(
            (
                planned["direction"],
                planned["target_kind"],
                planned["target_boundary"],
                planned["boundary_temperature"],
                planned["current_temperature"],
                planned["temperature_delta"],
            ),
            ("heat", "range", "low", 20, 18, 2),
        )
        for top_level, diagnostic in (
            ("direction", "direction"),
            ("target_kind", "target_kind"),
            ("target_boundary", "target_boundary"),
            ("boundary_temperature", "boundary_temperature"),
            ("current_temperature", "current_temperature"),
            ("temperature_delta", "delta_temperature"),
        ):
            self.assertEqual(planned[top_level], diagnostics[diagnostic])

    async def test_range_preconditioning_applies_union_and_records_boundary(self) -> None:
        self._range_preconditioning_config()
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            self._range_block()
        ]
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool",
            attributes={"current_temperature": 19},
        )
        event = self.scheduler.calculate_next_event(NOW)
        self.assertIsNotNone(event)
        assert event is not None
        await self.scheduler._async_apply_event(
            event,
            applied_at=event.when,
        )
        self.assertIn(
            ("set_temperature_range", self.entity_id, 20, 24, True, "heat_cool"),
            self.climate.calls,
        )
        self.assertFalse(any(call[0] == "set_temperature" for call in self.climate.calls))

        await self.scheduler._async_observe_preconditioning_temperature(
            self.entity_id,
            event.when + timedelta(minutes=30),
            25,
        )
        observation = self.data["preconditioning_learning"][self.entity_id]["heat"][
            "observations"
        ][0]
        self.assertEqual(observation["target_temp"], 20)
        self.assertEqual(observation["target_temp_low"], 20)
        self.assertEqual(observation["target_temp_high"], 24)
        self.assertEqual(observation["target_boundary"], "low")
        self.assertTrue(observation["reached"])

    async def test_range_preconditioning_records_partial_at_target_time(self) -> None:
        self._range_preconditioning_config()
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            self._range_block()
        ]
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool",
            attributes={"current_temperature": 19},
        )
        event = self.scheduler.calculate_next_event(NOW)
        self.assertIsNotNone(event)
        assert event is not None
        await self.scheduler._async_apply_event(
            event,
            applied_at=event.when,
        )
        self.assertIn(self.entity_id, self.scheduler._preconditioning_sessions)
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool",
            attributes={"current_temperature": 19.2},
        )

        await self.scheduler._async_expire_preconditioning_sessions(
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc)
        )

        observation = self.data["preconditioning_learning"][self.entity_id]["heat"][
            "observations"
        ][0]
        self.assertEqual(observation["quality"], "partial")
        self.assertFalse(observation["reached"])
        self.assertEqual(observation["target_boundary"], "low")

    async def test_range_cooling_applies_union_and_completes_on_upper_boundary(self) -> None:
        self._range_preconditioning_config()
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            self._range_block()
        ]
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat_cool",
            attributes={"current_temperature": 25},
        )
        event = self.scheduler.calculate_next_event(NOW)
        self.assertIsNotNone(event)
        assert event is not None
        self.assertEqual(
            event.target_when,
            datetime(2026, 5, 19, 20, 0, tzinfo=timezone.utc),
        )

        await self.scheduler._async_apply_event(
            event,
            applied_at=event.when,
        )
        self.assertIn(self.entity_id, self.scheduler._preconditioning_sessions)
        await self.scheduler._async_observe_preconditioning_temperature(
            self.entity_id,
            event.when + timedelta(minutes=30),
            24.5,
        )

        self.assertIn(
            ("set_temperature_range", self.entity_id, 20, 24, True, "heat_cool"),
            self.climate.calls,
        )
        self.assertFalse(any(call[0] == "set_temperature" for call in self.climate.calls))
        self.assertNotIn(self.entity_id, self.scheduler._preconditioning_sessions)
        observation = self.data["preconditioning_learning"][self.entity_id]["cool"][
            "observations"
        ][0]
        self.assertEqual(observation["target_temp"], 24)
        self.assertEqual(observation["target_temp_low"], 20)
        self.assertEqual(observation["target_temp_high"], 24)
        self.assertEqual(observation["target_boundary"], "high")
        self.assertTrue(observation["reached"])

