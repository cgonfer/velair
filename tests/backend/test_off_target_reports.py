"""Device off placeholders and minimum resets must not become Manual adjustments."""

from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from .helpers import FakeHass, NOW, VelairScheduler, empty_week_schedule, normalize_schedule_data
from custom_components.velair.climate_change_monitor import ClimateChangeMonitor
from custom_components.velair.climate_delivery import Delivery
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.room_groups import build_group_candidate


ENTITY = "climate.off_report"


class OffTargetReportsTest(unittest.IsolatedAsyncioTestCase):
    def state(self, mode="off", target=20.5, *, entity=ENTITY, context=None, **attributes):
        return SimpleNamespace(entity_id=entity, state=mode, context=context, attributes={
            "temperature": target, "current_temperature": 19,
            "min_temp": 5, "max_temp": 30, "target_temp_step": .5,
            "supported_features": 1, "hvac_modes": ["heat", "off", "cool", "heat_cool"],
            **attributes,
        })

    def fixture(self, *, policy="until_next_block", initial=None, schedule=None, raw=None, unit="°C"):
        hass = FakeHass()
        hass.config.units = SimpleNamespace(temperature_unit=unit)
        hass.states[ENTITY] = initial or self.state()
        week = empty_week_schedule()
        week["tuesday"] = schedule or [{"start": "00:00", "action": "turn_off"}]
        data = normalize_schedule_data({
            **(raw or {}),
            "zones": {ENTITY: {"enabled": True, "schedule": week,
                "external_change_policy": {"action": policy}}},
        }, [ENTITY])
        manager = ClimateManager(hass)
        scheduler = VelairScheduler(hass, data, manager, AsyncMock())
        monitor = ClimateChangeMonitor(hass, [ENTITY], manager, scheduler)
        monitor.async_start()
        self.addCleanup(monitor.async_stop)
        self.addAsyncCleanup(scheduler.async_stop)
        return SimpleNamespace(hass=hass, data=data, manager=manager,
            scheduler=scheduler, monitor=monitor)

    async def report(self, fixture, new, *, event_context=None):
        old = fixture.hass.states[new.entity_id]
        fixture.hass.states[new.entity_id] = new
        fixture.monitor._handle_state_change(SimpleNamespace(
            data={"entity_id": new.entity_id, "old_state": old, "new_state": new},
            context=event_context,
        ))
        tasks = list(fixture.monitor._tasks)
        if tasks:
            await asyncio.gather(*tasks)

    def control_mode(self, fixture, entity=ENTITY):
        return fixture.scheduler.get_zone_runtime_statuses()[entity]["control_mode"]

    def external_events(self, fixture):
        return [data for _, data in fixture.hass.bus.events
            if data.get("event") == "external_climate_change_detected"]

    async def test_delayed_zero_remains_automatic_for_every_policy_after_settling(self):
        for policy in ("keep_automatic", "until_next_block", "for_duration", "until_resumed"):
            for delay in (5, 60, 180):
                with self.subTest(policy=policy, delay=delay):
                    f = self.fixture(policy=policy, initial=self.state("heat"))
                    with patch("custom_components.velair.climate_manager.monotonic", return_value=100):
                        await f.manager.async_turn_off(ENTITY)
                        await self.report(f, self.state())
                    with patch("custom_components.velair.climate_manager.monotonic", return_value=100 + delay):
                        await self.report(f, self.state(target=0,
                            context=SimpleNamespace(id="device-poll", user_id=None, parent_id=None)))
                    self.assertEqual(self.control_mode(f), "automatic")
                    self.assertEqual(f.data["zones"][ENTITY]["pauses"], [])
                    self.assertEqual(self.external_events(f), [])

    async def test_coalesced_owned_off_and_zero_remains_automatic(self):
        f = self.fixture(initial=self.state("heat"))
        await f.manager.async_turn_off(ENTITY)
        await self.report(f, self.state(target=0))
        self.assertEqual(self.control_mode(f), "automatic")
        self.assertEqual(self.external_events(f), [])

    async def test_missing_or_malformed_explicit_bounds_keep_external_detection(self):
        bounds = [
            {}, {"min_temp": 5}, {"max_temp": 30},
            {"min_temp": None, "max_temp": 30},
            {"min_temp": 5, "max_temp": None},
            {"min_temp": 30, "max_temp": 5},
            {"min_temp": 5, "max_temp": 5},
            {"min_temp": float("nan"), "max_temp": 30},
            {"min_temp": 5, "max_temp": float("inf")},
            {"min_temp": True, "max_temp": 30},
            {"min_temp": "5", "max_temp": "30"},
        ]
        for limits in bounds:
            with self.subTest(limits=limits):
                old, new = self.state(), self.state(target=0)
                for state in (old, new):
                    state.attributes.pop("min_temp")
                    state.attributes.pop("max_temp")
                    state.attributes.update(limits)
                f = self.fixture(initial=old)
                await self.report(f, new)
                self.assertEqual(self.control_mode(f), "manual")
                self.assertEqual(self.external_events(f)[0]["changed_fields"], ["temperature"])

    async def test_valid_off_targets_including_bounds_still_enter_manual(self):
        for target in (5, 22, 30):
            with self.subTest(target=target):
                f = self.fixture()
                await self.report(f, self.state(target=target))
                self.assertEqual(self.control_mode(f), "manual")

        f = self.fixture(initial=self.state(min_temp=-5))
        await self.report(f, self.state(target=0, min_temp=-5))
        self.assertEqual(self.control_mode(f), "manual")

    async def test_missing_or_nonfinite_new_target_is_not_treated_as_numeric_placeholder(self):
        for target in (None, float("nan"), float("inf"), "0", True):
            with self.subTest(target=target):
                f = self.fixture()
                await self.report(f, self.state(target=target))
                self.assertEqual(self.control_mode(f), "manual")
                self.assertEqual(self.external_events(f)[0]["changed_fields"], ["temperature"])

    async def test_fahrenheit_uses_declared_native_limits(self):
        f = self.fixture(unit="°F", initial=self.state(target=68, min_temp=41, max_temp=86,
            temperature_unit="°F", target_temp_step=1))
        await self.report(f, self.state(target=32, min_temp=41, max_temp=86,
            temperature_unit="°F", target_temp_step=1))
        self.assertEqual(self.control_mode(f), "automatic")
        self.assertEqual(self.external_events(f), [])

    async def test_scalar_and_range_values_must_all_be_outside_declared_bounds(self):
        for low, high, expected in ((0, 40, "automatic"), (0, 24, "manual")):
            with self.subTest(low=low, high=high):
                old = self.state(target=None, supported_features=2,
                    target_temp_low=20, target_temp_high=23)
                f = self.fixture(initial=old)
                await self.report(f, self.state(target=None, supported_features=2,
                    target_temp_low=low, target_temp_high=high))
                self.assertEqual(self.control_mode(f), expected)
        f = self.fixture()
        await self.report(f, self.state(target=40))
        self.assertEqual(self.control_mode(f), "automatic")

    async def test_explicit_user_or_automation_context_is_not_suppressed(self):
        for context in (SimpleNamespace(id="user", user_id="person", parent_id=None),
                        SimpleNamespace(id="automation", user_id=None, parent_id="other")):
            with self.subTest(context=context):
                f = self.fixture()
                await self.report(f, self.state(target=0, context=context))
                self.assertEqual(self.control_mode(f), "manual")
        f = self.fixture()
        await self.report(f, self.state(target=0),
            event_context=SimpleNamespace(id="event", user_id="person", parent_id=None))
        self.assertEqual(self.control_mode(f), "manual")

    async def test_external_power_changes_and_on_targets_remain_manual(self):
        cases = [(self.state(), self.state("heat", 0)),
                 (self.state("heat"), self.state("off", 0)),
                 (self.state("heat"), self.state("heat", 0)),
                 (self.state("cool"), self.state("cool", 0))]
        for old, new in cases:
            with self.subTest(old=old.state, new=new.state):
                f = self.fixture(initial=old)
                await self.report(f, new)
                self.assertEqual(self.control_mode(f), "manual")

    async def test_off_device_with_temperature_only_or_on_intent_still_enters_manual(self):
        for block in ({"start": "00:00", "temperature": 21, "hvac_mode": "heat"},
                      {"start": "00:00", "temperature": 21, "temperature_only": True}):
            with self.subTest(block=block):
                f = self.fixture(schedule=[block])
                await self.report(f, self.state(target=0))
                self.assertEqual(self.control_mode(f), "manual")

    async def test_existing_manual_session_is_preserved_and_receives_change(self):
        f = self.fixture(policy="until_resumed")
        await f.scheduler.async_enter_manual_adjustment(ENTITY)
        previous = deepcopy(f.data["zones"][ENTITY]["pauses"])
        await self.report(f, self.state(target=0))
        self.assertEqual(self.control_mode(f), "manual")
        self.assertEqual(len(f.data["zones"][ENTITY]["pauses"]), 1)
        self.assertEqual(f.data["zones"][ENTITY]["pauses"][0]["started_at"], previous[0]["started_at"])
        self.assertEqual(self.external_events(f)[0]["changed_fields"], ["temperature"])

    async def test_placeholder_does_not_cancel_delivery_before_listener_runs(self):
        for mode in ("off", "heat"):
            with self.subTest(mode=mode):
                f = self.fixture(initial=self.state(mode))
                committed = []

                async def apply():
                    if mode == "heat":
                        await f.manager.async_turn_off(ENTITY)
                    f.hass.states[ENTITY] = self.state(target=0)
                    await asyncio.sleep(0)

                async def commit(_is_current):
                    committed.append(True)

                self.assertTrue(await f.scheduler._climate_delivery.async_deliver(ENTITY,
                    lambda: Delivery(apply, commit=commit,
                        is_current=lambda: not f.scheduler._pending_external_change_blocks_delivery(ENTITY))))
                self.assertEqual(committed, [True])
                self.assertEqual(f.monitor.pending_external_fields(ENTITY), set())
                # Process the same queued observation after successful bookkeeping.
                old = f.monitor._last_states[ENTITY]
                f.monitor._handle_state_change(SimpleNamespace(data={"entity_id": ENTITY,
                    "old_state": old, "new_state": f.hass.states[ENTITY]}))
                if f.monitor._tasks:
                    await asyncio.gather(*list(f.monitor._tasks))
                self.assertEqual(self.control_mode(f), "automatic")
                self.assertEqual(self.external_events(f), [])

    async def test_pending_preview_does_not_resolve_or_mutate_delivery_authority(self):
        f = self.fixture()
        f.hass.states[ENTITY] = self.state(target=0)
        configuration = deepcopy(f.data)
        generation = f.scheduler._schedule_projection.generation
        with patch.object(f.scheduler, "_resolve_authoritative_delivery_event",
                side_effect=AssertionError("Pending preview must stay read-only")), \
             patch.object(f.scheduler, "_prepare_runtime_projection",
                side_effect=AssertionError("Pending preview must not prepare calendars")):
            for _ in range(3):
                self.assertEqual(f.monitor.pending_external_fields(ENTITY), set())
        self.assertEqual(f.data, configuration)
        self.assertEqual(f.scheduler._schedule_projection.generation, generation)

    async def test_profile_and_owned_pauses_filter_only_when_their_action_is_off(self):
        for source in ("profile", "pause"):
            for action in ("turn_off", "none"):
                with self.subTest(source=source, action=action):
                    f = self.fixture(raw={"profiles": [{"key": "away", "name": "Away",
                        "zones": {ENTITY: {"behavior": "pause", "action": action}}}]})
                    if source == "profile":
                        await f.scheduler.async_activate_profile("away")
                    else:
                        await f.scheduler.async_pause_zone(ENTITY, pause_id="window", action=action)
                    calls = list(f.hass.services.calls)
                    await self.report(f, self.state(target=0))
                    self.assertEqual(self.control_mode(f), "automatic")
                    self.assertEqual(len(self.external_events(f)), 0 if action == "turn_off" else 1)
                    self.assertEqual(f.hass.services.calls, calls)

    async def test_unprepared_or_stale_authority_does_not_suppress_pending_input(self):
        f = self.fixture()
        f.hass.states[ENTITY] = self.state(target=0)
        with patch.object(f.scheduler._schedule_projection, "capabilities_current", return_value=False):
            self.assertEqual(f.monitor.pending_external_fields(ENTITY), {"temperature"})
        with patch.object(f.scheduler._schedule_projection, "preparing", True):
            self.assertEqual(f.monitor.pending_external_fields(ENTITY), {"temperature"})
        with patch.dict(f.scheduler._projection_pending_entities, {ENTITY: object()}):
            self.assertEqual(f.monitor.pending_external_fields(ENTITY), {"temperature"})
        with patch.object(f.scheduler._planned_return, "control_ready", return_value=False):
            self.assertEqual(f.monitor.pending_external_fields(ENTITY), {"temperature"})
        with patch.object(f.scheduler._planned_return, "suppress_departure_delivery", return_value=True):
            self.assertEqual(f.monitor.pending_external_fields(ENTITY), {"temperature"})

    async def test_planned_and_preconditioning_on_targets_override_nominal_off(self):
        f = self.fixture()
        f.hass.states[ENTITY] = self.state(target=0)
        on = SimpleNamespace(action="set_temperature")
        with patch.object(f.scheduler._planned_return, "target", return_value=on), \
             patch.object(f.scheduler, "_profile_zone_behavior",
                return_value={"behavior": "pause", "action": "turn_off"}):
            self.assertEqual(f.monitor.pending_external_fields(ENTITY), {"temperature"})
        with patch.object(f.scheduler, "_room_sensor_assist_target_event", return_value=on):
            self.assertEqual(f.monitor.pending_external_fields(ENTITY), {"temperature"})

    async def test_next_heat_and_cool_blocks_still_apply_after_zero_report(self):
        for mode, temperature in (("heat", 21), ("cool", 24)):
            with self.subTest(mode=mode):
                f = self.fixture(schedule=[{"start": "00:00", "action": "turn_off"},
                    {"start": "19:00", "temperature": temperature, "hvac_mode": mode}])
                await self.report(f, self.state(target=0))
                f.hass.services.calls.clear()
                with patch("custom_components.velair.scheduler.dt_util.now", return_value=NOW + timedelta(hours=1)):
                    await f.scheduler.async_apply_current_schedule(ENTITY)
                    self.assertEqual(self.control_mode(f), "automatic")
                self.assertTrue(any(service == "set_hvac_mode" and data["hvac_mode"] == mode
                    for _, service, data, _ in f.hass.services.calls))
                self.assertTrue(any(service == "set_temperature" and data.get("temperature") == temperature
                    for _, service, data, _ in f.hass.services.calls))

    async def test_mode_selection_applies_new_profile_after_zero_report(self):
        week = empty_week_schedule()
        week["tuesday"] = [{"start": "00:00", "temperature": 22, "hvac_mode": "heat"}]
        f = self.fixture(raw={
            "profiles": [{"key": "home", "name": "Home", "zones": {
                ENTITY: {"behavior": "schedule", "schedule": week}}}],
            "modes": [{"key": "home-mode", "name": "Home", "profile_ids": ["home"]}],
        })
        await self.report(f, self.state(target=0))
        await f.scheduler.async_select_velair_mode("home-mode")
        self.assertEqual(self.control_mode(f), "automatic")
        self.assertTrue(any(service == "set_temperature" and data.get("temperature") == 22
            for _, service, data, _ in f.hass.services.calls))

    async def test_group_uses_reporting_members_limits_instead_of_controllers(self):
        for peer_minimum, expected in ((5, "automatic"), (-5, "manual")):
            with self.subTest(peer_minimum=peer_minimum):
                peer, group = "climate.peer", "group.off_report"
                hass = FakeHass()
                hass.config.units = SimpleNamespace(temperature_unit="°C")
                hass.states[ENTITY] = self.state()
                hass.states[peer] = self.state(entity=peer, min_temp=peer_minimum)
                data, _ = build_group_candidate(normalize_schedule_data(None, [ENTITY, peer]),
                    [ENTITY, peer], {"id": group, "name": "Off group", "members": [ENTITY, peer],
                        "temperature_entity_id": ENTITY, "delivery_mode": "selected",
                        "delivery_entity_id": ENTITY}, ENTITY)
                data["zones"][group]["schedule"]["tuesday"] = [{"start": "00:00", "action": "turn_off"}]
                data["zones"][group]["external_change_policy"]["action"] = "until_resumed"
                manager = ClimateManager(hass)
                scheduler = VelairScheduler(hass, data, manager, AsyncMock())
                monitor = ClimateChangeMonitor(hass, [ENTITY, peer], manager, scheduler)
                monitor.async_start()
                self.addCleanup(monitor.async_stop)
                self.addAsyncCleanup(scheduler.async_stop)
                f = SimpleNamespace(hass=hass, data=data, manager=manager, scheduler=scheduler, monitor=monitor)
                await self.report(f, self.state(entity=peer, target=0, min_temp=peer_minimum))
                self.assertEqual(self.control_mode(f, group), expected)

    async def test_minimum_reset_all_orders_keep_every_policy_automatic(self):
        for mode in ("heat", "cool"):
            for order in ("minimum_first", "off_first", "combined"):
                for policy in ("keep_automatic", "until_next_block", "for_duration", "until_resumed"):
                    with self.subTest(mode=mode, order=order, policy=policy):
                        f = self.fixture(policy=policy, initial=self.state(mode, 19.5, min_temp=7, max_temp=35))
                        context = SimpleNamespace(id="device-report", user_id=None, parent_id=None)
                        with patch("custom_components.velair.climate_manager.monotonic", return_value=100):
                            await f.manager.async_turn_off(ENTITY)
                        reports = {
                            "minimum_first": [(mode, 7), ("off", 7)],
                            "off_first": [("off", 19.5), ("off", 7)],
                            "combined": [("off", 7)],
                        }[order]
                        with patch("custom_components.velair.climate_manager.monotonic", return_value=109):
                            for reported_mode, target in reports:
                                await self.report(f, self.state(reported_mode, target,
                                    min_temp=7, max_temp=35, context=context))
                        self.assertEqual(self.control_mode(f), "automatic")
                        self.assertEqual(f.data["zones"][ENTITY]["pauses"], [])
                        self.assertEqual(self.external_events(f), [])

    async def test_minimum_reset_pending_preview_does_not_cancel_delivery(self):
        for order in ("minimum_first", "off_first", "combined"):
            with self.subTest(order=order):
                f = self.fixture(initial=self.state("heat", 19.5, min_temp=7, max_temp=35))
                committed = []

                async def apply():
                    await f.manager.async_turn_off(ENTITY)
                    reports = {
                        "minimum_first": [("heat", 7), ("off", 7)],
                        "off_first": [("off", 19.5), ("off", 7)],
                        "combined": [("off", 7)],
                    }[order]
                    for mode, target in reports:
                        new = self.state(mode, target, min_temp=7, max_temp=35)
                        old = f.hass.states[ENTITY]
                        f.hass.states[ENTITY] = new
                        authority = deepcopy(f.data)
                        generation = f.scheduler._schedule_projection.generation
                        with patch.object(f.scheduler, "_resolve_authoritative_delivery_event",
                                side_effect=AssertionError("Pending preview must stay read-only")):
                            for _ in range(2):
                                self.assertEqual(f.monitor.pending_external_fields(ENTITY), set())
                        self.assertEqual(f.data, authority)
                        self.assertEqual(f.scheduler._schedule_projection.generation, generation)
                        f.monitor._handle_state_change(SimpleNamespace(data={
                            "entity_id": ENTITY, "old_state": old, "new_state": new}))
                        await asyncio.sleep(0)

                async def commit(_is_current):
                    committed.append(True)

                self.assertTrue(await f.scheduler._climate_delivery.async_deliver(ENTITY,
                    lambda: Delivery(apply, commit=commit,
                        is_current=lambda: not f.scheduler._pending_external_change_blocks_delivery(ENTITY))))
                self.assertEqual(committed, [True])
                self.assertEqual(self.control_mode(f), "automatic")
                self.assertEqual(self.external_events(f), [])

    async def test_minimum_registration_precedes_service_and_budget_starts_at_delivery(self):
        f = self.fixture(initial=self.state("heat", 19.5, min_temp=7, max_temp=35))
        clock = [100]

        async def call(*_args, **_kwargs):
            await self.report(f, self.state("heat", 7, min_temp=7, max_temp=35))
            self.assertEqual(self.external_events(f), [])
            clock[0] = 200

        with patch("custom_components.velair.climate_manager.monotonic", side_effect=lambda: clock[0]), \
             patch.object(f.hass.services, "async_call", side_effect=call):
            await f.manager.async_turn_off(ENTITY)
        with patch("custom_components.velair.climate_manager.monotonic", return_value=209):
            await self.report(f, self.state("off", 7, min_temp=7, max_temp=35))
        self.assertEqual(self.control_mode(f), "automatic")
        self.assertEqual(self.external_events(f), [])

    async def test_minimum_requires_recent_off_and_expires_at_settling_boundary(self):
        for delay in (None, 45, 60):
            with self.subTest(delay=delay):
                f = self.fixture(initial=self.state("heat", 19.5, min_temp=7, max_temp=35))
                with patch("custom_components.velair.climate_manager.monotonic", return_value=100):
                    if delay is not None:
                        await f.manager.async_turn_off(ENTITY)
                    f.hass.states[ENTITY] = self.state("off", 19.5, min_temp=7, max_temp=35)
                    f.monitor._last_states[ENTITY] = f.hass.states[ENTITY]
                with patch("custom_components.velair.climate_manager.monotonic", return_value=100 + (delay or 0)):
                    await self.report(f, self.state("off", 7, min_temp=7, max_temp=35))
                self.assertEqual(self.control_mode(f), "manual")
                self.assertEqual(self.external_events(f)[0]["changed_fields"], ["temperature"])

    async def test_recent_off_keeps_other_valid_targets_external(self):
        for target in (7.1, 7.5, 22, 35):
            with self.subTest(target=target):
                f = self.fixture(initial=self.state("heat", 19.5, min_temp=7, max_temp=35))
                await f.manager.async_turn_off(ENTITY)
                await self.report(f, self.state("off", 19.5, min_temp=7, max_temp=35))
                await self.report(f, self.state("off", target, min_temp=7, max_temp=35))
                self.assertEqual(self.control_mode(f), "manual")
                self.assertEqual(self.external_events(f)[0]["changed_fields"], ["temperature"])

    async def test_minimum_reset_preserves_explicit_state_and_event_contexts(self):
        contexts = [SimpleNamespace(id="user", user_id="person", parent_id=None),
                    SimpleNamespace(id="automation", user_id=None, parent_id="other")]
        for event_only in (False, True):
            for context in contexts:
                with self.subTest(event_only=event_only, context=context):
                    f = self.fixture(initial=self.state("heat", 19.5, min_temp=7, max_temp=35))
                    await f.manager.async_turn_off(ENTITY)
                    await self.report(f, self.state("off", 19.5, min_temp=7, max_temp=35))
                    await self.report(f, self.state("off", 7, min_temp=7, max_temp=35,
                        context=None if event_only else context),
                        event_context=context if event_only else None)
                    self.assertEqual(self.control_mode(f), "manual")
                    self.assertEqual(self.external_events(f)[0]["changed_fields"], ["temperature"])

    async def test_minimum_reset_requires_effective_off_authority(self):
        for block in ({"start": "00:00", "temperature": 21, "hvac_mode": "heat"},
                      {"start": "00:00", "temperature": 24, "hvac_mode": "cool"},
                      {"start": "00:00", "temperature": 21, "temperature_only": True}):
            with self.subTest(block=block):
                f = self.fixture(schedule=[block], initial=self.state("heat", 19.5, min_temp=7, max_temp=35))
                await f.manager.async_turn_off(ENTITY)
                await self.report(f, self.state("off", 19.5, min_temp=7, max_temp=35))
                await self.report(f, self.state("off", 7, min_temp=7, max_temp=35))
                self.assertEqual(self.control_mode(f), "manual")
                self.assertEqual(self.external_events(f)[0]["changed_fields"], ["temperature"])

    async def test_new_commands_retire_off_minimum_recognition(self):
        for command in ("hvac", "temperature", "failed_temperature"):
            with self.subTest(command=command):
                f = self.fixture(initial=self.state("heat", 19.5, min_temp=7, max_temp=35))
                await f.manager.async_turn_off(ENTITY)
                await self.report(f, self.state("off", 19.5, min_temp=7, max_temp=35))
                if command == "hvac":
                    await f.manager.async_set_hvac_mode(ENTITY, "heat")
                elif command == "temperature":
                    await f.manager.async_set_temperature(ENTITY, 21)
                else:
                    with patch.object(f.hass.services, "async_call", side_effect=RuntimeError("Rejected target")):
                        with self.assertRaises(RuntimeError):
                            await f.manager.async_set_temperature(ENTITY, 21)
                old = self.state("off", 19.5, min_temp=7, max_temp=35)
                new = self.state("off", 7, min_temp=7, max_temp=35)
                self.assertFalse(f.manager.is_recent_off_minimum_report(ENTITY, old, new))

    async def test_failed_or_cancelled_off_leaves_no_minimum_ownership(self):
        for failure in (RuntimeError("Rejected off"), asyncio.CancelledError()):
            with self.subTest(failure=type(failure).__name__):
                f = self.fixture(initial=self.state("heat", 19.5, min_temp=7, max_temp=35))
                with patch.object(f.hass.services, "async_call", side_effect=failure):
                    with self.assertRaises(type(failure)):
                        await f.manager.async_turn_off(ENTITY)
                await self.report(f, self.state("heat", 7, min_temp=7, max_temp=35))
                self.assertEqual(self.control_mode(f), "manual")
                self.assertEqual(self.external_events(f)[0]["changed_fields"], ["temperature"])

    async def test_minimum_is_optional_and_never_confirms_off_by_itself(self):
        from custom_components.velair.delivery_guard import capture_delivery_receipt
        for target in (7, 19.5):
            with self.subTest(target=target):
                f = self.fixture(initial=self.state("heat", 19.5, min_temp=7, max_temp=35))
                with capture_delivery_receipt() as receipt:
                    await f.manager.async_turn_off(ENTITY)
                self.assertEqual(receipt, {ENTITY: {"hvac_mode": "off"}})
                f.hass.states[ENTITY] = self.state("heat", 7, min_temp=7, max_temp=35)
                self.assertFalse(f.manager.compare_receipt(receipt)["matches"])
                f.hass.states[ENTITY] = self.state("off", target, min_temp=7, max_temp=35)
                self.assertTrue(f.manager.compare_receipt(receipt)["matches"])
                self.assertNotIn("temperature", f.manager.command_settling_diagnostics(ENTITY)["fields"])
                self.assertEqual(f.manager.command_settling_diagnostics(ENTITY)["mismatches"], {})

    async def test_next_heat_and_cool_blocks_apply_after_minimum_reset(self):
        for mode, temperature in (("heat", 21), ("cool", 24)):
            with self.subTest(mode=mode):
                f = self.fixture(initial=self.state("heat", 19.5, min_temp=7, max_temp=35),
                    schedule=[{"start": "00:00", "action": "turn_off"},
                        {"start": "19:00", "temperature": temperature, "hvac_mode": mode}])
                await f.manager.async_turn_off(ENTITY)
                await self.report(f, self.state("off", 7, min_temp=7, max_temp=35))
                f.hass.services.calls.clear()
                with patch("custom_components.velair.scheduler.dt_util.now", return_value=NOW + timedelta(hours=1)):
                    await f.scheduler.async_apply_current_schedule(ENTITY)
                self.assertEqual(self.control_mode(f), "automatic")
                self.assertTrue(any(service == "set_hvac_mode" and data["hvac_mode"] == mode
                    for _, service, data, _ in f.hass.services.calls))
                self.assertTrue(any(service == "set_temperature" and data.get("temperature") == temperature
                    for _, service, data, _ in f.hass.services.calls))

    async def test_group_minimum_reset_uses_reporting_members_native_limits(self):
        peer, group = "climate.peer", "group.off_report"
        for commanded, expected in ((True, "automatic"), (False, "manual")):
            with self.subTest(commanded=commanded):
                hass = FakeHass()
                hass.config.units = SimpleNamespace(temperature_unit="°C")
                hass.states[ENTITY] = self.state("heat", 20)
                hass.states[peer] = self.state("heat", 68, entity=peer,
                    min_temp=44.6, max_temp=95, temperature_unit="°F", target_temp_step=1)
                data, _ = build_group_candidate(normalize_schedule_data(None, [ENTITY, peer]),
                    [ENTITY, peer], {"id": group, "name": "Off group", "members": [ENTITY, peer],
                        "temperature_entity_id": ENTITY, "delivery_mode": "selected",
                        "delivery_entity_id": peer}, ENTITY)
                data["zones"][group]["schedule"]["tuesday"] = [{"start": "00:00", "action": "turn_off"}]
                data["zones"][group]["external_change_policy"]["action"] = "until_resumed"
                manager = ClimateManager(hass)
                scheduler = VelairScheduler(hass, data, manager, AsyncMock())
                monitor = ClimateChangeMonitor(hass, [ENTITY, peer], manager, scheduler)
                monitor.async_start()
                self.addCleanup(monitor.async_stop)
                self.addAsyncCleanup(scheduler.async_stop)
                f = SimpleNamespace(hass=hass, data=data, manager=manager, scheduler=scheduler, monitor=monitor)
                if commanded:
                    await manager.async_turn_off(peer)
                await self.report(f, self.state("heat", 44.6, entity=peer,
                    min_temp=44.6, max_temp=95, temperature_unit="°F", target_temp_step=1))
                if commanded:
                    await self.report(f, self.state("off", 44.6, entity=peer,
                        min_temp=44.6, max_temp=95, temperature_unit="°F", target_temp_step=1))
                self.assertEqual(self.control_mode(f, group), expected)
                self.assertEqual(len(self.external_events(f)), 0 if commanded else 1)
