"""Accepted Room Assist targets survive concurrent measurement updates."""

import asyncio
from contextlib import asynccontextmanager, ExitStack
from copy import deepcopy
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from . import test_room_assist_single_delivery as transport
from .helpers import NOW, scheduler_module


class _DeliveryHarness:
    """Use production delivery with deterministic HA services and events."""

    def __init__(self, *, mode="heat", range_target=True):
        self.fixture = transport.RoomAssistTransportTest(
            "test_heat_has_one_physical_temperature_service"
        )
        self.fixture.setUp()
        self.mode = mode
        self.range_target = range_target
        self.entity = self.fixture.entity_id
        self.block = self.fixture.configure(
            mode=mode, target=20 if mode == "heat" else 24,
            room="17.8" if mode == "heat" else "26.4",
            climate_temperature=20,
        )
        self.block.update(fan_mode="auto", preset_mode="activity", swing_mode="on")
        zone = self.fixture.data["zones"][self.entity]
        zone["preconditioning"].update(
            room_sensor_assist_max_delta=3, room_sensor_assist_deadband=0.3,
        )
        if range_target:
            self.block.pop("temperature")
            self.block.update(target_temp_low=20, target_temp_high=24)
            zone.update(
                target_range_modes=[mode],
                target_range_reference={mode: "low" if mode == "heat" else "high"},
            )
        self.fixture.use_real_adapter()
        self.hass = self.fixture.hass
        self.scheduler = self.fixture.scheduler
        attributes = self.hass.states[self.entity].attributes
        attributes.update(
            fan_modes=["auto"], preset_modes=["activity"], swing_modes=["on"],
            fan_mode="auto", preset_mode="activity", swing_mode="on",
        )
        if range_target:
            attributes.pop("temperature")
            attributes.update(
                supported_features=2, target_temp_low=22.5, target_temp_high=26.5,
            )
        self.subscriptions = []
        self.timers = []
        self.calls = []
        self.notifications = []
        self.after_service = None
        self.after_notification = None
        self.stack = ExitStack()
        self.stack.enter_context(patch.object(
            scheduler_module, "async_track_state_change_event", self.track_states,
        ))
        self.stack.enter_context(patch.object(
            scheduler_module, "async_track_point_in_time", self.track_timer,
        ))
        self.stack.enter_context(patch(
            "custom_components.velair.climate_delivery.async_track_state_change_event",
            self.track_states,
        ))
        self.hass.services.async_call = self.service
        self.scheduler._prepare_runtime_projection(configuration=True)
        self.scheduler._refresh_room_sensor_assist_listener()

    def track_states(self, _hass, entities, callback):
        item = (frozenset(entities), callback)
        self.subscriptions.append(item)

        def unsubscribe():
            if item in self.subscriptions:
                self.subscriptions.remove(item)

        return unsubscribe

    def track_timer(self, _hass, callback, when):
        item = (callback, when)
        self.timers.append(item)

        def unsubscribe():
            if item in self.timers:
                self.timers.remove(item)

        return unsubscribe

    def publish(self, *, attributes=None, state=None, entity=None):
        entity = entity or self.entity
        old = self.hass.states[entity]
        new = SimpleNamespace(
            state=old.state if state is None else state,
            attributes={**old.attributes, **(attributes or {})},
            entity_id=entity, context=None,
        )
        self.hass.states[entity] = new
        if old.state == new.state and old.attributes == new.attributes:
            return
        event = SimpleNamespace(data={
            "entity_id": entity, "old_state": old, "new_state": new,
        })
        for entities, callback in list(self.subscriptions):
            if entity in entities:
                callback(event)

    def drift(self):
        current = self.hass.states[self.entity].attributes["current_temperature"]
        self.publish(attributes={"current_temperature": 20.1 if current == 20 else 20})

    async def service(self, domain, name, data, **_kwargs):
        if domain != "climate":
            if domain == "persistent_notification":
                self.notifications.append((name, deepcopy(data)))
                await asyncio.sleep(0)
                if self.after_notification is not None:
                    await self.after_notification(name)
            return
        self.calls.append((name, deepcopy(data)))
        if name == "set_hvac_mode":
            self.publish(state=data["hvac_mode"])
        else:
            self.publish(attributes={key: value for key, value in data.items()
                                     if key != "entity_id"})
        await asyncio.sleep(0)
        if self.after_service is not None:
            await self.after_service(name)

    @property
    def cache(self):
        return self.scheduler._room_sensor_assist_states.get(self.entity)

    @property
    def targets(self):
        return [data for name, data in self.calls if name == "set_temperature"]

    @property
    def updated_events(self):
        return [data for _event, data in self.hass.bus.events
                if data.get("event") == "room_sensor_assist_updated"]

    @property
    def assist_timers(self):
        return [item for item in self.timers
                if item[0].__name__ == "_handle_room_sensor_assist_timer"]

    async def drain(self):
        for _ in range(45):
            await asyncio.sleep(0)

    async def tick(self):
        timers = self.assist_timers
        if len(timers) != 1:
            raise AssertionError(f"Expected one Room Assist timer, got {len(timers)}")
        item = timers[0]
        self.timers.remove(item)
        item[0](NOW)
        await self.drain()

    async def apply(self):
        await self.scheduler.async_apply_current_schedule()
        await self.drain()

    async def close(self):
        try:
            self.after_service = None
            self.after_notification = None
            await self.scheduler.async_stop()
        finally:
            self.stack.close()
            self.fixture.doCleanups()


@asynccontextmanager
async def delivery(**kwargs):
    harness = _DeliveryHarness(**kwargs)
    try:
        yield harness
    finally:
        await harness.close()


class RoomAssistDeliveryFreshnessTest(unittest.IsolatedAsyncioTestCase):
    async def test_naviclim_range_records_accepted_target_and_stops_identical_resends(self):
        async with delivery() as harness:
            async def drift_after_target(name):
                if name == "set_temperature":
                    harness.drift()

            harness.after_service = drift_after_target
            await harness.apply()
            self.assertIsNotNone(harness.cache)
            self.assertEqual(harness.targets, [{
                "entity_id": harness.entity,
                "target_temp_low": 22.5, "target_temp_high": 26.5,
            }])
            self.assertEqual(len(harness.calls), 5)
            coordinator = harness.scheduler._climate_delivery
            self.assertTrue(coordinator._receipt_evidence[harness.entity]["matches"])
            self.assertEqual(coordinator._confirmation_deadlines, {})
            listeners = len(harness.subscriptions)
            for index in range(8):
                harness.publish(attributes={"hvac_action": "heating" if index % 2 else "idle"})
                await harness.tick()
                self.assertEqual(len(harness.calls), 5)
                self.assertIsNotNone(harness.cache)
                self.assertEqual(len(harness.subscriptions), listeners)
                self.assertEqual(harness.assist_timers, [])
                self.assertIsNone(harness.scheduler._room_sensor_assist_task)
                self.assertFalse(any(not task.done()
                                     for tasks in coordinator._tasks.values()
                                     for task in tasks))

    async def test_scalar_and_range_heat_and_cool_keep_newly_accepted_targets(self):
        for mode in ("heat", "cool"):
            for range_target in (False, True):
                for previous_cache in (False, True):
                    with self.subTest(mode=mode, range_target=range_target,
                                      previous_cache=previous_cache):
                        async with delivery(mode=mode, range_target=range_target) as harness:
                            previous = None
                            if previous_cache:
                                await harness.apply()
                                self.assertIsNotNone(harness.cache)
                                previous = harness.targets[-1]
                                harness.publish(
                                    entity="sensor.room",
                                    state="18.3" if mode == "heat" else "25.9",
                                )
                                harness.calls.clear()

                            async def drift_after_target(name):
                                if name == "set_temperature":
                                    harness.drift()

                            harness.after_service = drift_after_target
                            if previous_cache:
                                await harness.tick()
                            else:
                                await harness.apply()
                            self.assertEqual(len(harness.targets), 1)
                            sent = harness.targets[0]
                            self.assertIsNotNone(harness.cache)
                            if previous is not None:
                                self.assertNotEqual(sent, previous)
                            if range_target:
                                self.assertEqual(
                                    (harness.cache.applied_target_temp_low,
                                     harness.cache.applied_target_temp_high),
                                    (sent["target_temp_low"], sent["target_temp_high"]),
                                )
                            else:
                                self.assertEqual(harness.cache.applied_temperature,
                                                 sent["temperature"])
                            accepted_calls = len(harness.calls)
                            for index in range(2):
                                harness.publish(attributes={
                                    "hvac_action": "idle" if index == 0 else "heating",
                                })
                                await harness.tick()
                            self.assertEqual(len(harness.calls), accepted_calls)

    async def test_new_reading_that_changes_target_still_sends_correction(self):
        for range_target in (False, True):
            with self.subTest(range_target=range_target):
                async with delivery(range_target=range_target) as harness:
                    async def change_room_after_target(name):
                        if name == "set_temperature":
                            harness.publish(entity="sensor.room", state="18.8")

                    harness.after_service = change_room_after_target
                    await harness.apply()
                    first = harness.targets[-1]
                    self.assertIsNotNone(harness.cache)
                    harness.after_service = None
                    await harness.tick()
                    self.assertEqual(len(harness.targets), 2)
                    self.assertNotEqual(harness.targets[-1], first)
                    self.assertIsNotNone(harness.cache)

    async def test_room_sensor_drift_preserves_accepted_equivalent_target(self):
        async with delivery() as harness:
            harness.publish(entity="sensor.room", state="17.7")

            async def change_room_after_target(name):
                if name == "set_temperature":
                    harness.publish(entity="sensor.room", state="17.8")

            harness.after_service = change_room_after_target
            await harness.apply()
            self.assertIsNotNone(harness.cache)
            await harness.tick()
            self.assertEqual(len(harness.targets), 1)
            self.assertEqual(harness.assist_timers, [])

    async def test_measurement_drift_during_intermediate_service_stops_remainder(self):
        for service in ("set_hvac_mode", "set_preset_mode"):
            with self.subTest(service=service):
                async with delivery() as harness:
                    async def drift_mid_sequence(name):
                        if name == service:
                            harness.drift()

                    harness.after_service = drift_mid_sequence
                    await harness.apply()
                    self.assertEqual(harness.targets, [])
                    self.assertEqual(harness.calls[-1][0], service)
                    self.assertIsNone(harness.cache)
                    self.assertEqual(harness.updated_events, [])

    async def test_control_replacement_during_final_call_still_blocks_commit(self):
        for replacement in ("parent_generation", "room_assist_generation", "mode",
                            "disabled", "source", "schedule", "migration",
                            "paused", "stopped"):
            with self.subTest(replacement=replacement):
                async with delivery() as harness:
                    async def replace_control(name):
                        if name != "set_temperature":
                            return
                        harness.drift()
                        if replacement == "parent_generation":
                            harness.scheduler._climate_delivery.cancel(harness.entity)
                        elif replacement == "room_assist_generation":
                            harness.scheduler._room_sensor_assist_generations[harness.entity] = 1
                        elif replacement == "mode":
                            harness.publish(state="off")
                        elif replacement == "disabled":
                            harness.fixture.data["zones"][harness.entity]["enabled"] = False
                        elif replacement == "source":
                            harness.scheduler._room_sensor_assist_generations[harness.entity] = 1
                            harness.fixture.data["zones"][harness.entity]["preconditioning"][
                                "room_temperature_entity_id"
                            ] = "sensor.other"
                        elif replacement == "schedule":
                            harness.block["target_temp_low"] = 19
                            harness.scheduler._prepare_runtime_projection(configuration=True)
                        elif replacement == "migration":
                            harness.scheduler.set_temperature_migration_blocked(True)
                        elif replacement == "paused":
                            harness.fixture.data["global_"]["mode"] = "paused"
                        elif replacement == "stopped":
                            harness.scheduler._stopped = True

                    harness.after_service = replace_control
                    await harness.apply()
                    self.assertEqual(len(harness.targets), 1)
                    self.assertIsNone(harness.cache)
                    self.assertEqual(harness.updated_events, [])

    async def test_failed_or_cancelled_final_service_does_not_commit_acceptance(self):
        for error in (ValueError("rejected target"), asyncio.CancelledError()):
            with self.subTest(error=type(error).__name__):
                async with delivery() as harness:
                    async def reject_target(name):
                        if name == "set_temperature":
                            harness.drift()
                            raise error

                    harness.after_service = reject_target
                    with self.assertRaises(type(error)):
                        await harness.apply()
                    self.assertIsNone(harness.cache)
                    self.assertEqual(harness.updated_events, [])

    async def test_notification_measurement_drift_does_not_replay_accepted_target(self):
        async with delivery() as harness:
            harness.publish(attributes={"max_temp": 26.5})
            harness.publish(entity="sensor.room", state="16")
            harness.scheduler._prepare_runtime_projection(configuration=True)

            async def notify(_name):
                harness.drift()

            harness.after_notification = notify
            await harness.apply()
            self.assertIsNotNone(harness.cache)
            self.assertEqual(harness.cache.limited_by, "maximum")
            self.assertEqual(len(harness.notifications), 1)
            self.assertEqual(len(harness.updated_events), 1)
            harness.after_notification = None
            await harness.tick()
            self.assertEqual(len(harness.targets), 1)
            self.assertEqual(harness.assist_timers, [])
