"""Recover only the independent climate that silently ignores a shared deadline."""

import asyncio
from collections import Counter
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from .helpers import FakeHass, NOW, VelairScheduler, normalize_schedule_data, scheduler_module
from . import test_runtime_diagnostics as diagnostics_tests
from custom_components.velair.climate_delivery import ClimateDeliveryCoordinator
from custom_components.velair.climate_manager import ClimateManager


class SilentClimateDeliveryTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.clock = NOW - timedelta(minutes=1)
        self.clock_patch = patch.object(scheduler_module.dt_util, "now", lambda: self.clock)
        self.clock_patch.start()
        self.addCleanup(self.clock_patch.stop)
        self.entities = ("climate.hall", "climate.bathroom", "climate.living_room")
        self.ignored = self.entities[0]
        self.hass = FakeHass()
        self.hass.loop = asyncio.get_running_loop()
        self.subscriptions = []
        self.targets = []
        self.service_calls = []
        self.observations = []
        self.ignore_attempts = 1
        self.retry_started = asyncio.Event()
        self.release_retry = None
        self.accepted_without_echo = set()
        self.diagnostics = diagnostics_tests.diagnostics_module.RuntimeDiagnosticsManager(
            self.hass, list(self.entities),
        )
        for entity in self.entities:
            self.hass.states[entity] = SimpleNamespace(
                state="heat",
                attributes={
                    "temperature": 22.0, "current_temperature": 20.0,
                    "hvac_modes": ["off", "heat", "cool"],
                    "min_temp": 5.0, "max_temp": 30.0,
                    "target_temp_step": 0.5, "supported_features": 1,
                },
            )
        self.hass.services = SimpleNamespace(
            async_call=self.service_call, has_service=lambda *_args: False,
        )
        self.tracking = patch(
            "custom_components.velair.climate_delivery.async_track_state_change_event",
            self.track_states,
        )
        self.tracking.start()
        self.addCleanup(self.tracking.stop)
        self.coordinator = ClimateDeliveryCoordinator(self.hass, self.observe_delivery)
        data = normalize_schedule_data({
            "zones": {entity: {
                "enabled": True,
                "schedule": {"tuesday": [
                    {"start": "00:00", "temperature": 22, "hvac_mode": "heat"},
                    {"start": "18:00", "temperature": 21.5, "hvac_mode": "heat"},
                ]},
            } for entity in self.entities},
        }, list(self.entities))
        self.scheduler = VelairScheduler(
            self.hass, data, ClimateManager(self.hass), self.save,
            climate_delivery=self.coordinator,
        )

    async def asyncTearDown(self):
        await self.scheduler.async_stop()
        self.diagnostics.async_stop()

    async def save(self):
        return None

    def observe_delivery(self, entity, status, details):
        self.observations.append((entity, status, deepcopy(details)))
        self.diagnostics.observe_delivery(entity, status, details)

    def track_states(self, _hass, entities, callback):
        entry = (tuple(entities), callback)
        self.subscriptions.append(entry)

        def unsubscribe():
            if entry in self.subscriptions:
                self.subscriptions.remove(entry)

        return unsubscribe

    def report_target(self, entity, temperature, *, state=None):
        old = self.hass.states[entity]
        new = SimpleNamespace(
            state=old.state if state is None else state,
            attributes={**old.attributes, "temperature": temperature},
        )
        self.hass.states[entity] = new
        event = SimpleNamespace(data={
            "entity_id": entity, "old_state": old, "new_state": new,
        })
        for entities, callback in list(self.subscriptions):
            if entity in entities:
                callback(event)

    async def service_call(self, domain, service, payload, **_kwargs):
        self.service_calls.append((domain, service, deepcopy(payload)))
        if domain != "climate" or service != "set_temperature":
            return
        entity = payload["entity_id"]
        self.targets.append((entity, payload["temperature"]))
        count = sum(sent_entity == entity for sent_entity, _target in self.targets)
        if entity == self.ignored and count == 2 and self.release_retry is not None:
            self.retry_started.set()
            await self.release_retry.wait()
        if entity in self.accepted_without_echo:
            return
        if entity == self.ignored and count <= self.ignore_attempts:
            return  # Successful HA call, but the entity still reports 22 degrees.
        self.report_target(entity, payload["temperature"])

    async def drain(self):
        for _ in range(30):
            await asyncio.sleep(0)

    async def apply_shared_deadline(self):
        # Zero-duration deadlines make the recovery deterministic without sleeping.
        self.clock = NOW
        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (0, 0)), \
             patch("custom_components.velair.climate_delivery.FINAL_CONFIRMATION_DELAY", 0, create=True):
            await self.scheduler._handle_timer(NOW)
            await self.drain()

    async def test_only_silent_climate_is_retried_and_recovery_is_recorded(self):
        await self.apply_shared_deadline()
        self.assertEqual(Counter(entity for entity, _target in self.targets), {
            self.ignored: 2, self.entities[1]: 1, self.entities[2]: 1,
        })
        self.assertEqual({target for _entity, target in self.targets}, {21.5})
        self.assertTrue(all(
            self.hass.states[entity].attributes["temperature"] == 21.5
            for entity in self.entities
        ))
        confirmation = self.diagnostics._delivery[self.ignored]["confirmation"]
        self.assertEqual(confirmation["status"], "recovered")
        self.assertEqual(confirmation["retry_count"], 1)
        recovered = [item for item in self.diagnostics._history
                     if item["category"] == "delivery"
                     and item["data"].get("status") == "recovered"]
        self.assertEqual([item["entity_id"] for item in recovered], [self.ignored])
        applied = [data for _kind, data in self.hass.bus.events
                   if data.get("event") == "climate_target_applied"]
        self.assertEqual(Counter(data["entity_id"] for data in applied), {
            entity: 1 for entity in self.entities
        })

    async def test_persistent_silent_climate_stops_after_two_retries(self):
        self.ignore_attempts = 100
        await self.apply_shared_deadline()
        self.assertEqual(Counter(entity for entity, _target in self.targets), {
            self.ignored: 3, self.entities[1]: 1, self.entities[2]: 1,
        })
        self.assertEqual(
            self.diagnostics._delivery[self.ignored]["confirmation"]["status"],
            "unconfirmed",
        )
        sent = list(self.targets)
        await self.drain()
        self.assertEqual(self.targets, sent)

    async def test_matching_climates_create_no_confirmation_background_work(self):
        self.ignore_attempts = 0
        await self.apply_shared_deadline()
        self.assertEqual(Counter(entity for entity, _target in self.targets), {
            entity: 1 for entity in self.entities
        })
        self.assertFalse(any(self.coordinator._tasks.values()))
        self.assertEqual(len(self.subscriptions), len(self.entities))
        self.assertFalse(any(item["category"] == "delivery"
                             for item in self.diagnostics._history))
        self.assertEqual(len(self.service_calls), 2 * len(self.entities))
        self.assertFalse(any(service == "update_entity"
                             for _domain, service, _payload in self.service_calls))

    async def test_waiting_for_one_climate_never_blocks_other_deadline_deliveries(self):
        self.clock = NOW
        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (60, 60)):
            await asyncio.wait_for(self.scheduler._handle_timer(NOW), timeout=1)
            self.assertEqual(Counter(entity for entity, _target in self.targets), {
                entity: 1 for entity in self.entities
            })
            self.assertEqual(self.hass.states[self.ignored].attributes["temperature"], 22)
            self.assertTrue(all(
                self.hass.states[entity].attributes["temperature"] == 21.5
                for entity in self.entities[1:]
            ))

    async def test_delayed_report_confirms_without_resending(self):
        self.clock = NOW
        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (60, 60)):
            await self.scheduler._handle_timer(NOW)
            self.report_target(self.ignored, 21.5)
            await self.drain()
        self.assertEqual(Counter(entity for entity, _target in self.targets), {
            entity: 1 for entity in self.entities
        })
        self.assertEqual(
            self.diagnostics._delivery[self.ignored]["confirmation"]["status"],
            "confirmed",
        )
        self.assertFalse(any(self.coordinator._tasks.values()))

    async def test_stopping_retires_pending_recovery_without_later_commands(self):
        self.clock = NOW
        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (60, 60)):
            await self.scheduler._handle_timer(NOW)
            await self.coordinator.async_stop()
            sent = list(self.targets)
            self.report_target(self.ignored, 22)
            await self.drain()
        self.assertEqual(self.targets, sent)
        self.assertFalse(self.subscriptions)
        self.assertFalse(any(self.coordinator._tasks.values()))

    async def test_cooling_deadline_retries_only_silent_climate(self):
        for entity in self.entities:
            self.hass.states[entity].state = "cool"
            self.hass.states[entity].attributes["temperature"] = 24
            block = self.scheduler._data["zones"][entity]["schedule"]["tuesday"][1]
            block.update(temperature=23.5, hvac_mode="cool")
        self.scheduler._prepare_runtime_projection(configuration=True, refresh_horizon=True)
        await self.apply_shared_deadline()
        self.assertEqual(Counter(entity for entity, _target in self.targets), {
            self.ignored: 2, self.entities[1]: 1, self.entities[2]: 1,
        })
        self.assertEqual({target for _entity, target in self.targets}, {23.5})

    async def test_null_range_cleanup_fields_do_not_trigger_recovery(self):
        self.ignore_attempts = 0
        for entity in self.entities:
            self.hass.states[entity].attributes.update(target_temp_low=16, target_temp_high=16)
        await self.apply_shared_deadline()
        self.assertEqual(Counter(entity for entity, _target in self.targets), {
            entity: 1 for entity in self.entities
        })
        self.assertFalse(any(self.coordinator._tasks.values()))

    async def test_late_report_after_exhaustion_clears_failure_without_more_commands(self):
        self.ignore_attempts = 100
        await self.apply_shared_deadline()
        sent = list(self.targets)
        self.report_target(self.ignored, 21.5)
        await self.drain()
        self.assertEqual(self.targets, sent)
        self.assertIn(
            self.diagnostics._delivery[self.ignored]["confirmation"]["status"],
            ("confirmed", "recovered"),
        )
        self.assertFalse(any(self.coordinator._tasks.values()))

    async def test_diagnostics_reads_never_trigger_recovery_work(self):
        self.clock = NOW
        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (60, 60)):
            await self.scheduler._handle_timer(NOW)
            sent = list(self.targets)
            runtime = {
                "scheduler": self.scheduler,
                "climate_manager": self.scheduler._climate_manager,
                "storage": SimpleNamespace(
                    data=self.scheduler._data, temperature_migration_required=False,
                ),
            }
            for _ in range(5):
                snapshot = self.diagnostics.snapshot(runtime)
                self.assertIn(self.ignored, snapshot["units"])
            await self.drain()
            self.assertEqual(self.targets, sent)

    async def test_slow_recovery_does_not_block_a_new_target_for_another_climate(self):
        self.clock = NOW
        self.release_retry = asyncio.Event()
        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (0, 0)), \
             patch("custom_components.velair.climate_delivery.FINAL_CONFIRMATION_DELAY", 0, create=True):
            await self.scheduler._handle_timer(NOW)
            await asyncio.wait_for(self.retry_started.wait(), timeout=1)
            other = self.entities[1]
            self.scheduler._data["zones"][other]["schedule"]["tuesday"][1]["temperature"] = 20.5
            self.scheduler._prepare_runtime_projection(configuration=True, refresh_horizon=True)
            await asyncio.wait_for(self.scheduler.async_apply_current_schedule(other), timeout=1)
            self.assertEqual(self.hass.states[other].attributes["temperature"], 20.5)
            self.assertEqual(self.hass.states[self.ignored].attributes["temperature"], 22)
            self.release_retry.set()
            await self.drain()
        self.assertEqual(Counter(entity for entity, _target in self.targets), {
            self.ignored: 2, other: 2, self.entities[2]: 1,
        })

    async def test_retry_confirms_the_newly_calculated_physical_target(self):
        zone = self.scheduler._data["zones"][self.ignored]
        zone["schedule"]["tuesday"][1]["temperature"] = 18
        zone["preconditioning"].update(
            enabled=False, room_sensor_assist_enabled=True,
            room_temperature_entity_id="sensor.room", room_sensor_assist_max_delta=2,
        )
        self.hass.states[self.ignored].attributes["current_temperature"] = 18
        self.hass.states["sensor.room"] = SimpleNamespace(
            state="16.5", attributes={"unit_of_measurement": "°C"},
        )
        original_service = self.service_call

        async def change_reading_after_first_acceptance(domain, service, payload, **kwargs):
            await original_service(domain, service, payload, **kwargs)
            if (domain == "climate" and service == "set_temperature"
                    and payload["entity_id"] == self.ignored
                    and sum(entity == self.ignored for entity, _target in self.targets) == 1):
                self.hass.loop.call_soon(
                    setattr, self.hass.states["sensor.room"], "state", "17.5",
                )

        self.hass.services.async_call = change_reading_after_first_acceptance
        self.scheduler._prepare_runtime_projection(configuration=True, refresh_horizon=True)
        await self.apply_shared_deadline()
        self.assertEqual([target for entity, target in self.targets if entity == self.ignored], [19.5, 18.5])
        evidence = self.diagnostics._delivery[self.ignored]["confirmation"]
        self.assertEqual(evidence["status"], "recovered")
        self.assertEqual(evidence["expected"][self.ignored]["temperature"], 18.5)
        self.assertEqual(evidence["observed"][self.ignored]["temperature"], 18.5)

    async def test_real_reconnection_preserves_existing_current_intent_recovery(self):
        self.ignore_attempts = 100
        await self.apply_shared_deadline()
        self.assertEqual(sum(entity == self.ignored for entity, _target in self.targets), 3)
        self.ignore_attempts = 3
        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", (0, 0)), \
             patch("custom_components.velair.climate_delivery.FINAL_CONFIRMATION_DELAY", 0, create=True):
            self.report_target(self.ignored, 22, state="unavailable")
            self.report_target(self.ignored, 22, state="heat")
            await self.drain()
        self.assertEqual(sum(entity == self.ignored for entity, _target in self.targets), 4)
        self.assertEqual(self.hass.states[self.ignored].attributes["temperature"], 21.5)
