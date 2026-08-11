"""Scheduler integration tests for resilient climate delivery."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from .helpers import (
    ACTION_SET_TEMPERATURE,
    EVENT_TYPE_CLIMATE_TARGET_APPLIED,
    EVENT_VELAIR,
    FakeClimateManager,
    FakeHass,
    MODE_AUTO,
    VelairScheduler,
    empty_week_schedule,
    normalize_panel_settings,
)
from homeassistant.exceptions import HomeAssistantError
from custom_components.velair.models import ClimateEvent

NOW = datetime(2026, 5, 19, 18, 0, tzinfo=timezone.utc)


class SchedulerDeliveryTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.entity_id = "climate.salon"
        self.hass = FakeHass()
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat", attributes={"current_temperature": 20}
        )
        self.climate = FakeClimateManager()
        schedule = empty_week_schedule()
        schedule["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
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
                    "schedule": schedule,
                    "override": None,
                }
            },
            "settings": normalize_panel_settings(None, [self.entity_id]),
            "templates": [],
            "templates_seeded": True,
        }
        self.scheduler = VelairScheduler(
            self.hass, self.data, self.climate, self._async_save
        )

    async def asyncTearDown(self) -> None:
        await self.scheduler._climate_delivery.async_stop()

    async def _async_save(self) -> None:
        return None

    async def test_reconnect_applies_changed_authoritative_schedule(self) -> None:
        callbacks = []

        def track(_hass, _entity_ids, callback):
            callbacks.append(callback)
            return lambda: callbacks.remove(callback) if callback in callbacks else None

        self.hass.states[self.entity_id] = SimpleNamespace(
            state="unavailable", attributes={}
        )
        with patch(
            "custom_components.velair.climate_delivery.async_track_state_change_event",
            track,
        ):
            await self.scheduler.async_apply_current_schedule()
            self.assertEqual(self.climate.calls, [])
            self.assertFalse(any(
                event_type == EVENT_VELAIR
                and data.get("event") == EVENT_TYPE_CLIMATE_TARGET_APPLIED
                for event_type, data in self.hass.bus.events
            ))

            self.data["zones"][self.entity_id]["schedule"]["tuesday"][0].update(
                {"temperature": 24, "hvac_mode": "cool"}
            )
            self.hass.states[self.entity_id] = SimpleNamespace(
                state="cool", attributes={}
            )
            callbacks[0](object())
            await asyncio.sleep(0)
            await asyncio.sleep(0)

        self.assertEqual(
            self.climate.calls,
            [("set_temperature", self.entity_id, 24.0, True, "cool")],
        )

    async def test_pause_cancels_pending_unavailable_schedule(self) -> None:
        callbacks = []

        def track(_hass, _entity_ids, callback):
            callbacks.append(callback)
            return lambda: callbacks.remove(callback) if callback in callbacks else None

        self.hass.states[self.entity_id] = SimpleNamespace(
            state="unavailable", attributes={}
        )
        with patch(
            "custom_components.velair.climate_delivery.async_track_state_change_event",
            track,
        ):
            await self.scheduler.async_apply_current_schedule()
            await self.scheduler.async_pause_zone(self.entity_id)
            self.hass.states[self.entity_id] = SimpleNamespace(
                state="heat", attributes={}
            )
            for callback in list(callbacks):
                callback(object())
            await asyncio.sleep(0)
            await asyncio.sleep(0)

        self.assertEqual(self.climate.calls, [])

    async def test_manual_unavailable_target_fails_once_and_is_not_replayed(self) -> None:
        callbacks = []

        def track(_hass, _entity_ids, callback):
            callbacks.append(callback)
            return lambda: callbacks.remove(callback) if callback in callbacks else None

        self.hass.states[self.entity_id] = SimpleNamespace(
            state="unavailable", attributes={}
        )
        with patch(
            "custom_components.velair.climate_delivery.async_track_state_change_event",
            track,
        ):
            with self.assertRaises(HomeAssistantError):
                await self.scheduler.async_set_temperature(
                    self.entity_id,
                    22,
                    ensure_on=True,
                    hvac_mode="heat",
                )

            self.assertEqual(callbacks, [])
            self.hass.states[self.entity_id] = SimpleNamespace(
                state="heat", attributes={}
            )
            await asyncio.sleep(0)

        self.assertEqual(self.climate.calls, [])

    async def test_slow_superseded_event_cannot_publish_old_applied_event(self) -> None:
        started = asyncio.Event()
        release = asyncio.Event()
        original = self.climate.async_set_temperature

        async def slow_first(*args, **kwargs):
            if not started.is_set():
                started.set()
                await release.wait()
            await original(*args, **kwargs)

        self.climate.async_set_temperature = slow_first
        old = ClimateEvent(
            entity_id=self.entity_id,
            when=NOW,
            temperature=21,
            weekday="tuesday",
            start="17:00",
            hvac_mode="heat",
        )
        new = ClimateEvent(
            entity_id=self.entity_id,
            when=NOW,
            temperature=24,
            weekday="tuesday",
            start="17:00",
            hvac_mode="cool",
        )

        old_task = asyncio.create_task(self.scheduler._async_apply_event(old))
        await started.wait()
        self.data["zones"][self.entity_id]["schedule"]["tuesday"][0].update(
            {"temperature": 24, "hvac_mode": "cool"}
        )
        new_task = asyncio.create_task(self.scheduler._async_apply_event(new))
        await asyncio.sleep(0)
        release.set()
        await asyncio.gather(old_task, new_task)

        applied = [
            data
            for event_type, data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and data.get("event") == EVENT_TYPE_CLIMATE_TARGET_APPLIED
        ]
        self.assertEqual([event["temperature"] for event in applied], [24])

    async def test_slow_room_assist_commit_cannot_publish_superseded_event(self) -> None:
        assist_started = asyncio.Event()
        release_assist = asyncio.Event()
        assist_calls = 0

        async def slow_first_assist(*_args, **_kwargs) -> None:
            nonlocal assist_calls
            assist_calls += 1
            if assist_calls == 1:
                assist_started.set()
                await release_assist.wait()

        self.scheduler._async_refresh_room_sensor_assist = slow_first_assist
        old = ClimateEvent(
            entity_id=self.entity_id,
            when=NOW,
            temperature=21,
            weekday="tuesday",
            start="17:00",
            hvac_mode="heat",
        )
        new = ClimateEvent(
            entity_id=self.entity_id,
            when=NOW,
            temperature=24,
            weekday="tuesday",
            start="17:00",
            hvac_mode="cool",
        )

        old_task = asyncio.create_task(self.scheduler._async_apply_event(old))
        await assist_started.wait()
        self.data["zones"][self.entity_id]["schedule"]["tuesday"][0].update(
            {"temperature": 24, "hvac_mode": "cool"}
        )
        new_task = asyncio.create_task(self.scheduler._async_apply_event(new))
        await asyncio.sleep(0)
        release_assist.set()
        await asyncio.gather(old_task, new_task)

        applied = [
            data
            for event_type, data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and data.get("event") == EVENT_TYPE_CLIMATE_TARGET_APPLIED
        ]
        self.assertEqual([event["temperature"] for event in applied], [24])
        self.assertEqual(self.scheduler._preconditioning_sessions, {})

    async def test_migration_block_supersedes_slow_apply_before_commit(self) -> None:
        started = asyncio.Event()
        release = asyncio.Event()
        original = self.climate.async_set_temperature

        async def slow(*args, **kwargs):
            started.set()
            await release.wait()
            await original(*args, **kwargs)

        self.climate.async_set_temperature = slow
        apply_task = asyncio.create_task(
            self.scheduler.async_apply_current_schedule()
        )
        await started.wait()
        self.scheduler.set_temperature_migration_blocked(True)
        release.set()
        await apply_task

        self.assertFalse(any(
            event_type == EVENT_VELAIR
            and data.get("event") == EVENT_TYPE_CLIMATE_TARGET_APPLIED
            for event_type, data in self.hass.bus.events
        ))
        self.assertEqual(self.scheduler._preconditioning_sessions, {})

    async def test_public_schedule_save_invalidates_slow_room_assist_apply(self) -> None:
        assist_started = asyncio.Event()
        release_assist = asyncio.Event()
        calls = 0

        async def slow_first_assist(*_args, **_kwargs) -> None:
            nonlocal calls
            calls += 1
            if calls == 1:
                assist_started.set()
                await release_assist.wait()

        self.scheduler._async_refresh_room_sensor_assist = slow_first_assist
        old_task = asyncio.create_task(
            self.scheduler.async_apply_current_schedule(source="old_schedule")
        )
        await assist_started.wait()
        save_task = asyncio.create_task(
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
        await asyncio.sleep(0)
        release_assist.set()
        await asyncio.gather(old_task, save_task)

        applied = [
            data
            for event_type, data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and data.get("event") == EVENT_TYPE_CLIMATE_TARGET_APPLIED
        ]
        self.assertEqual([event["temperature"] for event in applied], [24])

    async def test_room_assist_failure_retries_before_applied_side_effects(self) -> None:
        attempts = 0

        async def fail_first_assist(*_args, **_kwargs) -> None:
            nonlocal attempts
            attempts += 1
            if attempts == 1:
                raise HomeAssistantError("temporary Room Assist failure")

        self.scheduler._async_refresh_room_sensor_assist = fail_first_assist
        event = ClimateEvent(
            entity_id=self.entity_id,
            when=NOW,
            temperature=21,
            weekday="tuesday",
            start="17:00",
            hvac_mode="heat",
        )
        with patch(
            "custom_components.velair.climate_delivery.RETRY_DELAYS", (0, 0)
        ):
            await self.scheduler._async_apply_event(event)
            self.assertFalse(any(
                event_type == EVENT_VELAIR
                and data.get("event") == EVENT_TYPE_CLIMATE_TARGET_APPLIED
                for event_type, data in self.hass.bus.events
            ))
            self.assertEqual(self.scheduler._preconditioning_sessions, {})
            await asyncio.sleep(0)
            await asyncio.sleep(0)

        applied = [
            data
            for event_type, data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and data.get("event") == EVENT_TYPE_CLIMATE_TARGET_APPLIED
        ]
        self.assertEqual(attempts, 2)
        self.assertEqual(len(applied), 1)

    async def test_listener_room_assist_failure_uses_two_current_retries(self) -> None:
        async def initial_assist(*_args, **_kwargs) -> None:
            return None

        self.scheduler._async_refresh_room_sensor_assist = initial_assist
        await self.scheduler.async_apply_current_schedule()
        self.hass.bus.events.clear()
        self.climate.calls.clear()
        attempts = 0

        async def fail_twice(*_args, **_kwargs) -> None:
            nonlocal attempts
            attempts += 1
            if attempts <= 2:
                raise HomeAssistantError("listener Room Assist failure")

        self.scheduler._async_refresh_room_sensor_assist = fail_twice
        with patch(
            "custom_components.velair.climate_delivery.RETRY_DELAYS", (0, 0)
        ):
            await self.scheduler._async_refresh_room_sensor_assist_candidates(
                [self.entity_id]
            )
            self.data["zones"][self.entity_id]["schedule"]["tuesday"][0].update(
                {"temperature": 24, "hvac_mode": "cool"}
            )
            for _ in range(5):
                await asyncio.sleep(0)

        applied = [
            data
            for event_type, data in self.hass.bus.events
            if event_type == EVENT_VELAIR
            and data.get("event") == EVENT_TYPE_CLIMATE_TARGET_APPLIED
        ]
        self.assertEqual(attempts, 3)
        self.assertEqual(len(applied), 1)
        self.assertTrue(
            all(call[2:5] == (24.0, True, "cool") for call in self.climate.calls)
        )
