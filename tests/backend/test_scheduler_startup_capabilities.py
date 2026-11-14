"""Recover linked schedules after climate capabilities arrive during startup."""
from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import timedelta
import inspect
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from .helpers import FakeHass, NOW, normalize_schedule_data, scheduler_module
from custom_components.velair import climate_delivery
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.room_groups import build_group_candidate


ENTITY = "climate.room"


class _StartupHass(FakeHass):
    def __init__(self):
        super().__init__()
        self.tasks = set()
        self.listeners = []
        self.timers = []
        self.services = SimpleNamespace(async_call=self.call, has_service=lambda *_: False)
        self.calls = []

    def async_create_task(self, awaitable):
        task = asyncio.create_task(awaitable)
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)
        return task

    def track_state(self, _hass, entities, callback):
        listener = [set(entities), callback, True]
        self.listeners.append(listener)
        return lambda: listener.__setitem__(2, False)

    def track_timer(self, _hass, callback, when):
        timer = [when, callback, True]
        self.timers.append(timer)
        return lambda: timer.__setitem__(2, False)

    def publish(self, entity, state):
        old = self.states.get(entity)
        self.states[entity] = state
        event = SimpleNamespace(data={"entity_id": entity, "old_state": old, "new_state": state})
        for entities, callback, active in list(self.listeners):
            if active and entity in entities:
                result = callback(event)
                if inspect.isawaitable(result):
                    self.async_create_task(result)

    async def drain(self):
        # Tasks may enqueue one further producer when a delivery is handed off.
        for _ in range(20):
            pending = [task for task in self.tasks if not task.done()]
            if not pending:
                await asyncio.sleep(0)
                if not self.tasks:
                    return
            else:
                await asyncio.gather(*pending)
        raise AssertionError("Startup recovery did not settle")

    async def call(self, domain, service, data, *, blocking=False, context=None):
        self.calls.append((domain, service, deepcopy(data)))
        if domain != "climate":
            return
        entity = data["entity_id"]
        previous = self.states[entity]
        attrs = dict(previous.attributes)
        mode = previous.state
        if service == "set_temperature":
            attrs.update({key: value for key, value in data.items()
                          if key in ("temperature", "target_temp_low", "target_temp_high")})
        elif service == "set_hvac_mode":
            mode = data["hvac_mode"]
        elif service == "turn_off":
            mode = "off"
        self.publish(entity, SimpleNamespace(entity_id=entity, state=mode, attributes=attrs))


class SchedulerStartupCapabilitiesTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.hass = _StartupHass()
        self.clock = [NOW]
        for module in (scheduler_module, climate_delivery):
            self.enterContext(patch.object(module, "async_track_state_change_event", self.hass.track_state))
        self.enterContext(patch.object(scheduler_module, "async_track_point_in_time", self.hass.track_timer))
        self.enterContext(patch.object(scheduler_module.dt_util, "now", lambda: self.clock[0]))

    def state(self, mode="heat", *, ready=True, temperature=17, entity=ENTITY):
        attrs = {"current_temperature": 18, "temperature": temperature,
                 "supported_features": 1, "min_temp": 5, "max_temp": 35,
                 "target_temp_step": .5, "temperature_unit": "°C"}
        attrs["hvac_modes"] = ["off", mode] if ready else []
        return SimpleNamespace(entity_id=entity, state=mode, attributes=attrs)

    def make_scheduler(self, mode="heat", *, initial="incomplete", resource="template", group=False, other=False):
        if initial != "missing":
            state = self.state(mode, ready=initial == "ready")
            if initial in ("unknown", "unavailable"):
                state.state = initial
            self.hass.states[ENTITY] = state
        target = 20 if mode == "heat" else 24
        data = normalize_schedule_data({
            "templates_seeded": True,
            "templates": [{"key": "workday", "name": "Workday", "blocks": [
                {"slot_id": "current", "start": "17:00", "action": "set_temperature", "temperature": target, "hvac_mode": mode},
                {"slot_id": "next", "start": "19:00", "action": "set_temperature", "temperature": target + 1, "hvac_mode": mode},
            ]}],
            "zones": {ENTITY: {"enabled": True, "schedule": {},
                                "template_links": {"tuesday": {"template_key": "workday", "mode": "full"}}}},
        }, [ENTITY])
        if resource == "preset":
            data["block_presets"] = [{"key": "comfort", "name": "Comfort", "config": {
                "action": "set_temperature", "temperature": target, "hvac_mode": mode}}]
            data["zones"][ENTITY]["template_links"] = {}
            data["zones"][ENTITY]["schedule"]["tuesday"] = [
                {"start": "17:00", "preset_key": "comfort"},
                {"start": "19:00", "action": "set_temperature", "temperature": target + 1, "hvac_mode": mode}]
        elif resource == "direct":
            data["zones"][ENTITY]["template_links"] = {}
            data["zones"][ENTITY]["schedule"]["tuesday"] = [
                {key: value for key, value in block.items() if key != "slot_id"}
                for block in data["templates"][0]["blocks"]]
        if other:
            data["zones"]["climate.other"] = deepcopy(data["zones"][ENTITY])
            other_zone = data["zones"]["climate.other"]
            other_zone["template_links"] = {}
            other_zone["schedule"]["tuesday"] = [
                {"start": "18:30", "action": "set_temperature", "temperature": 22, "hvac_mode": "heat"},
                {"start": "19:30", "action": "set_temperature", "temperature": 23, "hvac_mode": "heat"}]
            self.hass.states["climate.other"] = self.state(entity="climate.other")
        if group:
            second = "climate.second"
            data["zones"][second] = deepcopy(data["zones"][ENTITY])
            self.hass.states[second] = self.state(mode, ready=False, entity=second)
            data, _ = build_group_candidate(data, [ENTITY, second], {
                "id": "group.room", "name": "Room", "members": [ENTITY, second],
                "temperature_entity_id": ENTITY, "delivery_mode": "all"}, ENTITY)
        self.data = data
        self.scheduler = scheduler_module.VelairScheduler(self.hass, data, ClimateManager(self.hass), AsyncMock())
        self.addAsyncCleanup(self.scheduler.async_stop)
        return target

    def temperature_calls(self):
        return [data for domain, service, data in self.hass.calls
                if domain == "climate" and service == "set_temperature"]

    def assert_next_timer(self):
        expected = NOW + timedelta(hours=1)
        self.assertIsNotNone(self.scheduler.next_event, "Capability recovery left the scheduler idle")
        self.assertEqual(self.scheduler.next_event.when, expected)
        timers = [timer for timer in self.hass.timers if timer[2] and timer[0] == expected]
        self.assertEqual(len(timers), 1, "The future block needs one armed timer")
        return timers[0]

    async def assert_future_delivery(self, target):
        timer = self.assert_next_timer()
        self.clock[0] = timer[0]
        timer[2] = False
        await timer[1](timer[0])
        await self.hass.drain()
        self.assertEqual(self.temperature_calls()[-1]["temperature"], target + 1)

    async def test_disabled_startup_application_recovers_future_timer_without_current_delivery(self):
        target = self.make_scheduler()
        await self.scheduler.async_start(apply_current_schedule=False)
        self.assertIsNone(self.scheduler.next_event)
        self.hass.publish(ENTITY, self.state())
        await self.hass.drain()
        self.assertEqual(self.temperature_calls(), [])
        await self.assert_future_delivery(target)

    async def test_enabled_startup_application_recovers_current_target_and_future_timer(self):
        target = self.make_scheduler("cool")
        await self.scheduler.async_start(apply_current_schedule=True)
        self.assertIsNone(self.scheduler.next_event)
        self.hass.publish(ENTITY, self.state("cool"))
        await self.hass.drain()
        self.assertEqual([call["temperature"] for call in self.temperature_calls()], [target])
        self.assert_next_timer()
        self.hass.publish(ENTITY, self.state("cool", temperature=target))
        await self.hass.drain()
        self.assertEqual(len(self.temperature_calls()), 1, "Ordinary reports must not replay startup delivery")
        await self.assert_future_delivery(target)

    async def check_initial_state_recovery(self, initial, *, enabled, mode="heat", resource="template"):
        target = self.make_scheduler(mode, initial=initial, resource=resource)
        await self.scheduler.async_start(apply_current_schedule=enabled)
        self.hass.publish(ENTITY, self.state(mode))
        await self.hass.drain()
        self.assertEqual([call["temperature"] for call in self.temperature_calls()], [target] if enabled else [])
        await self.assert_future_delivery(target)

    async def test_missing_entity_appears_with_startup_application_disabled(self):
        await self.check_initial_state_recovery("missing", enabled=False)

    async def test_unknown_entity_recovers_with_startup_application_enabled(self):
        await self.check_initial_state_recovery("unknown", enabled=True)

    async def test_unavailable_entity_recovers_with_startup_application_disabled(self):
        await self.check_initial_state_recovery("unavailable", enabled=False, mode="cool")

    async def test_preset_schedule_recovers_with_missing_modes(self):
        await self.check_initial_state_recovery("incomplete", enabled=True, resource="preset")

    async def test_direct_schedule_does_not_gain_startup_permission_when_capabilities_arrive(self):
        await self.check_initial_state_recovery("incomplete", enabled=False, resource="direct")

    async def test_group_recovers_only_after_both_delivery_members_report_capabilities(self):
        target = self.make_scheduler("cool", group=True)
        await self.scheduler.async_start(apply_current_schedule=True)
        self.hass.publish(ENTITY, self.state("cool"))
        await self.hass.drain()
        self.assertEqual(self.temperature_calls(), [])
        self.hass.publish("climate.second", self.state("cool", entity="climate.second"))
        await self.hass.drain()
        self.assertEqual({call["entity_id"] for call in self.temperature_calls()}, {ENTITY, "climate.second"})
        self.assertTrue(all(call["temperature"] == target for call in self.temperature_calls()))
        self.assertEqual(self.scheduler.next_event.entity_id, "group.room")
        await self.assert_future_delivery(target)

    async def test_selected_group_delivery_waits_only_for_its_selected_member(self):
        target = self.make_scheduler(group=True)
        self.data["room_groups"]["group.room"].update(
            delivery_mode="selected", delivery_entity_id="climate.second")
        await self.scheduler.async_start(apply_current_schedule=True)
        self.hass.publish("climate.second", self.state(entity="climate.second"))
        await self.hass.drain()
        self.assertEqual(self.temperature_calls(), [
            {"entity_id": "climate.second", "temperature": target}])
        self.assertEqual(self.scheduler.next_event.entity_id, "group.room")
        self.assert_next_timer()

    async def test_native_range_schedule_recovers_without_scalar_target_or_extra_mode_change(self):
        self.make_scheduler("heat_cool")
        for offset, block in enumerate(self.data["templates"][0]["blocks"]):
            block.pop("temperature")
            block.pop("hvac_mode")
            block.update(target_temp_low=19 + offset, target_temp_high=23 + offset)
        await self.scheduler.async_start(apply_current_schedule=True)
        ready = self.state("heat_cool")
        ready.attributes.pop("temperature")
        ready.attributes.update(supported_features=2, target_temp_low=17, target_temp_high=27)
        self.hass.publish(ENTITY, ready)
        await self.hass.drain()
        self.assertEqual(self.temperature_calls(), [
            {"entity_id": ENTITY, "target_temp_low": 19, "target_temp_high": 23}])
        self.assertFalse(any(service == "set_hvac_mode" for _, service, _ in self.hass.calls))
        timer = self.assert_next_timer()
        self.clock[0] = timer[0]
        timer[2] = False
        await timer[1](timer[0])
        await self.hass.drain()
        self.assertEqual(self.temperature_calls()[-1],
                         {"entity_id": ENTITY, "target_temp_low": 20, "target_temp_high": 24})

    async def test_waiting_zone_keeps_overdue_block_when_ready_zone_advances_global_cursor(self):
        target = self.make_scheduler(other=True)
        await self.scheduler.async_start(apply_current_schedule=False)
        due = NOW + timedelta(minutes=30)
        timers = [timer for timer in self.hass.timers if timer[2] and timer[0] == due]
        self.assertEqual(len(timers), 1)
        self.clock[0] = due
        timers[0][2] = False
        await timers[0][1](due)
        self.assertEqual([call["entity_id"] for call in self.temperature_calls()], ["climate.other"])
        self.clock[0] = NOW + timedelta(hours=1, minutes=1)
        self.hass.publish(ENTITY, self.state())
        await self.hass.drain()
        self.assertEqual([call["temperature"] for call in self.temperature_calls() if call["entity_id"] == ENTITY], [target + 1])
        self.assertEqual(self.scheduler.next_event.when, NOW + timedelta(hours=1, minutes=30))

    async def test_saved_schedule_resets_waiting_baseline_before_capabilities_recover(self):
        self.make_scheduler()
        await self.scheduler.async_start(apply_current_schedule=False)
        self.clock[0] = NOW + timedelta(minutes=45)
        # Off actions remain valid while modes are missing. Saving applies the
        # current action once; recovery must not treat its earlier start as a
        # newly crossed deadline from the old startup waiting episode.
        await self.scheduler.async_set_daily_schedule(
            ENTITY, "tuesday", blocks=[
                {"start": "18:30", "action": "turn_off"},
                {"start": "19:00", "action": "turn_off"},
            ], unlink_template=True, expected_revision=self.data["configuration_revision"])
        await self.hass.drain()
        self.assertEqual(self.scheduler._capability_waiting_cursors[ENTITY], self.clock[0],
                         "A committed schedule starts a new waiting episode at its save time")

        def off_calls():
            return [data for domain, service, data in self.hass.calls
                    if domain == "climate" and service == "turn_off"]

        self.assertEqual(off_calls(), [{"entity_id": ENTITY}])
        self.clock[0] = NOW + timedelta(minutes=50)
        self.hass.publish(ENTITY, self.state())
        await self.hass.drain()
        self.assertEqual(off_calls(), [{"entity_id": ENTITY}],
                         "Readiness replayed a block whose start preceded the schedule save")
        timer = self.assert_next_timer()
        self.clock[0] = timer[0]
        timer[2] = False
        await timer[1](timer[0])
        await self.hass.drain()
        # Identical consecutive Off targets may reuse accepted delivery, but
        # the next deadline must still be processed and the following one armed.
        self.assertGreater(self.scheduler.next_event.when, timer[0])
        self.assertTrue(any(active and when == self.scheduler.next_event.when
                            for when, _, active in self.hass.timers))

    async def test_ready_during_startup_notification_cleanup_applies_exactly_once(self):
        target = self.make_scheduler()

        async def finish_loading(*_):
            self.hass.publish(ENTITY, self.state())
            await self.hass.drain()
            return True

        with patch.object(scheduler_module, "async_dismiss_room_assist_limit_notification", finish_loading):
            await self.scheduler.async_start(apply_current_schedule=True)
        await self.hass.drain()
        self.assertEqual([call["temperature"] for call in self.temperature_calls()], [target])
        self.assert_next_timer()

    async def test_capability_worker_consuming_another_zone_during_startup_does_not_replay_it(self):
        target = self.make_scheduler(initial="ready", other=True)
        self.data["zones"]["climate.other"] = deepcopy(self.data["zones"][ENTITY])
        original = self.hass.services.async_call
        published = False

        async def report_capabilities_during_first_delivery(domain, service, data, **kwargs):
            nonlocal published
            if data.get("entity_id") == "climate.other" and not published:
                published = True
                updated = self.state()
                updated.attributes["max_temp"] = 30
                self.hass.publish(ENTITY, updated)
                await self.hass.drain()
            await original(domain, service, data, **kwargs)

        self.hass.services.async_call = report_capabilities_during_first_delivery
        await self.scheduler.async_start(apply_current_schedule=True)
        await self.hass.drain()
        calls = self.temperature_calls()
        self.assertEqual([call["entity_id"] for call in calls].count(ENTITY), 1)
        self.assertEqual([call["entity_id"] for call in calls].count("climate.other"), 1)
        self.assertTrue(all(call["temperature"] == target for call in calls))

    async def test_pause_created_while_waiting_cancels_pending_startup_application(self):
        self.make_scheduler()
        await self.scheduler.async_start(apply_current_schedule=True)
        await self.scheduler.async_pause_zone(ENTITY, pause_id="window")
        self.hass.publish(ENTITY, self.state())
        await self.hass.drain()
        self.assertEqual(self.temperature_calls(), [])
        self.assertIn("window", [pause["pause_id"] for pause in self.data["zones"][ENTITY]["pauses"]])

    async def test_disabled_zone_does_not_receive_pending_startup_application(self):
        self.make_scheduler()
        self.data["zones"][ENTITY]["enabled"] = False
        await self.scheduler.async_start(apply_current_schedule=True)
        self.hass.publish(ENTITY, self.state())
        await self.hass.drain()
        self.assertEqual(self.temperature_calls(), [])

    async def test_stop_removes_recovery_listener_and_pending_permission(self):
        self.make_scheduler()
        await self.scheduler.async_start(apply_current_schedule=True)
        await self.scheduler.async_stop()
        self.hass.publish(ENTITY, self.state())
        await self.hass.drain()
        self.assertEqual(self.temperature_calls(), [])
        self.assertFalse(any(active for _, _, active in self.hass.listeners))

    async def test_modes_arriving_before_target_features_do_not_consume_startup_permission(self):
        target = self.make_scheduler()
        await self.scheduler.async_start(apply_current_schedule=True)
        self.hass.publish(ENTITY, SimpleNamespace(entity_id=ENTITY, state="heat", attributes={"hvac_modes": ["off", "heat"]}))
        await self.hass.drain()
        self.assertEqual(self.temperature_calls(), [])
        self.assertEqual(self.scheduler.get_schedule_resolution_status(ENTITY)["status"], "waiting_capabilities")
        self.hass.publish(ENTITY, self.state())
        await self.hass.drain()
        self.assertEqual([call["temperature"] for call in self.temperature_calls()], [target])
        self.assert_next_timer()

    async def test_direct_schedule_waits_for_target_capabilities_after_modes_arrive(self):
        target = self.make_scheduler(resource="direct")
        await self.scheduler.async_start(apply_current_schedule=True)
        self.hass.publish(ENTITY, SimpleNamespace(
            entity_id=ENTITY, state="heat", attributes={"hvac_modes": ["off", "heat"]}))
        await self.hass.drain()
        self.assertEqual(self.temperature_calls(), [], "Modes alone do not establish target capabilities")
        self.hass.publish(ENTITY, self.state())
        await self.hass.drain()
        self.assertEqual([call["temperature"] for call in self.temperature_calls()], [target])
        self.assert_next_timer()

    async def test_keep_mode_schedule_resolves_current_cooling_mode_after_capabilities_arrive(self):
        target = self.make_scheduler("cool")
        for block in self.data["templates"][0]["blocks"]:
            block.pop("hvac_mode")
        await self.scheduler.async_start(apply_current_schedule=True)
        self.hass.publish(ENTITY, self.state("cool"))
        await self.hass.drain()
        self.assertEqual([call["temperature"] for call in self.temperature_calls()], [target])
        self.assertFalse(any(service == "set_hvac_mode" for _, service, _ in self.hass.calls))
        await self.assert_future_delivery(target)

    async def test_later_capability_change_rearms_without_replaying_consumed_startup_target(self):
        self.make_scheduler(initial="ready")
        await self.scheduler.async_start(apply_current_schedule=True)
        self.assertEqual(len(self.temperature_calls()), 1)
        updated = self.state(temperature=20)
        updated.attributes["max_temp"] = 30
        self.hass.publish(ENTITY, updated)
        await self.hass.drain()
        self.assertEqual(len(self.temperature_calls()), 1)
        self.assert_next_timer()

    async def test_reported_incompatible_mode_remains_invalid_until_compatible_capability_change(self):
        target = self.make_scheduler()
        await self.scheduler.async_start(apply_current_schedule=True)
        with self.assertLogs("custom_components.velair.scheduler", level="ERROR"):
            self.hass.publish(ENTITY, self.state("cool"))
            await self.hass.drain()
        self.assertEqual(self.temperature_calls(), [])
        self.assertIsNone(self.scheduler.next_event)
        self.assertEqual(self.scheduler.get_schedule_resolution_status(ENTITY)["status"], "invalid")
        self.hass.publish(ENTITY, self.state())
        await self.hass.drain()
        self.assertEqual([call["temperature"] for call in self.temperature_calls()], [target])
        self.assert_next_timer()

    async def test_global_manual_mode_created_while_waiting_prevents_startup_delivery(self):
        self.make_scheduler()
        await self.scheduler.async_start(apply_current_schedule=True)
        await self.scheduler.async_set_mode("manual")
        self.hass.publish(ENTITY, self.state())
        await self.hass.drain()
        self.assertEqual(self.temperature_calls(), [])
        self.assertEqual(self.scheduler.mode, "manual")

    async def test_restored_boost_is_preserved_when_startup_schedule_becomes_ready(self):
        self.make_scheduler()
        boost = {"type": "boost", "temperature": 26, "hvac_mode": "heat",
                 "started_at": NOW.isoformat(), "until": (NOW + timedelta(hours=2)).isoformat()}
        self.data["zones"][ENTITY]["override"] = deepcopy(boost)
        await self.scheduler.async_start(apply_current_schedule=True)
        self.hass.publish(ENTITY, self.state())
        await self.hass.drain()
        self.assertEqual(self.temperature_calls(), [])
        self.assertEqual(self.data["zones"][ENTITY]["override"], boost)
