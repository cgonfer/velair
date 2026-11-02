"""Local delivery reads its inputs; publications reconcile all zones."""
import asyncio
from contextlib import contextmanager
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch
from .helpers import FakeHass, FakeClimateManager, VelairScheduler, NOW, normalize_schedule_data, scheduler_module
from custom_components.velair import api

LOCAL, OTHER = "climate.local", "climate.other"
MASTER, SIBLING = "climate.master", "climate.sibling"


def sensor(entity):
    return "sensor." + entity.split(".")[1]


class NoForeignCopy(dict):
    def __deepcopy__(self, memo):
        raise AssertionError("Local guard copied unrelated configuration")


class LocalStates:
    def __init__(self, states, allowed):
        self.states, self.allowed, self.reads = states, set(allowed), []
    def get(self, entity, default=None):
        if entity is not None and entity not in self.allowed:
            raise AssertionError("Local guard read unrelated HA entity: " + str(entity))
        self.reads.append(entity)
        return self.states.get(entity, default)
    def __getitem__(self, entity):
        value = self.get(entity)
        if value is None:
            raise KeyError(entity)
        return value


class LocalProjectionGuardTest(unittest.IsolatedAsyncioTestCase):
    def make(self, *, returning=False, master=False):
        entities = (LOCAL, MASTER, SIBLING, OTHER) if master else (LOCAL, OTHER)
        hass, manager = FakeHass(), FakeClimateManager()
        zones = {}
        for entity in entities:
            zones[entity] = {"enabled": True, "schedule": {"tuesday": [
                {"start": "00:00", "temperature": 18 if returning else 21, "hvac_mode": "heat"},
                {"start": "19:00", "temperature": 21, "hvac_mode": "heat"}]},
                "preconditioning": {"enabled": returning, "room_sensor_assist_enabled": True,
                    "room_temperature_entity_id": sensor(entity), "max_lead_minutes": 180,
                    "fallback_minutes_per_degree": 40}}
            hass.states[entity] = SimpleNamespace(state="heat", attributes={
                "current_temperature": 16 if returning else 20, "temperature": 21,
                "hvac_modes": ["off", "heat", "cool"], "min_temp": 5, "max_temp": 35,
                "target_temp_step": .5})
            hass.states[sensor(entity)] = SimpleNamespace(state="16" if returning else "20.5",
                attributes={"unit_of_measurement": "°C"})
            manager.current_hvac_modes[entity] = "heat"
        if master:
            for entity in (LOCAL, SIBLING):
                zones[entity]["preconditioning"]["master_entity_id"] = MASTER
        data = normalize_schedule_data({"zones": zones, "templates": [], "templates_seeded": True}, list(entities))
        if returning:
            data["planned_return_episode"] = {"state": "away", "origin": "manual",
                "started_at": (NOW-timedelta(hours=1)).isoformat(),
                "return_at": (NOW+timedelta(minutes=90)).isoformat(),
                "away_mode_id": "default", "destination_mode_id": "default", "preparing_entities": []}
        scheduler = VelairScheduler(hass, data, manager, AsyncMock())
        self.addAsyncCleanup(scheduler.async_stop)
        return SimpleNamespace(s=scheduler, hass=hass, manager=manager, data=data)

    @contextmanager
    def local_reads(self, f, entities=(LOCAL,)):
        allowed = set(entities) | {sensor(entity) for entity in entities}
        states = LocalStates(f.hass.states, allowed)
        foreign = set(f.data["zones"]) - set(entities)
        previous = {entity: f.data["zones"][entity]["preconditioning"] for entity in foreign}
        try:
            for entity in foreign:
                f.data["zones"][entity]["preconditioning"] = NoForeignCopy(previous[entity])
            with patch.object(f.hass, "states", states):
                yield states.reads
        finally:
            for entity, value in previous.items():
                f.data["zones"][entity]["preconditioning"] = value

    def payload(self, f):
        return api._build_schedule_response({"scheduler": f.s,
            "storage": SimpleNamespace(data=f.data, _climate_entities=list(f.data["zones"])),
            "entry": SimpleNamespace(data={}, options={}), "climate_manager": f.manager})

    def request(self, f, target):
        return f.s._room_sensor_assist_request_is_authoritative(LOCAL,
            target_temperature=target.temperature, target_temp_low=target.target_temp_low,
            target_temp_high=target.target_temp_high, hvac_mode=target.hvac_mode,
            weekday=target.weekday, start=target.start)

    async def test_local_guards_ignore_pending_foreign_inputs_then_publication_reconciles(self):
        f = self.make()
        target = f.s.get_active_target_event(LOCAL)
        f.hass.states[sensor(OTHER)].state = "17"
        f.hass.states[OTHER].attributes["current_temperature"] = 23
        with self.local_reads(f) as reads:
            self.assertTrue(self.request(f, target))
            self.assertTrue(f.s._delivery_projection_is_current(LOCAL, target))
        self.assertIn(LOCAL, reads)
        self.assertNotIn(OTHER, reads)
        f.s._async_write_state()
        payload = self.payload(f)
        self.assertEqual(payload["room_sensor_assist"][OTHER]["room_temperature"], 17)
        self.assertEqual(payload["room_sensor_assist"][LOCAL]["room_temperature"], 20.5)
        self.assertEqual(f.manager.calls, [])

    async def test_child_guard_reads_master_but_neither_sibling_nor_unrelated_zone(self):
        f = self.make(master=True)
        target = f.s.get_active_target_event(LOCAL)
        f.hass.states[sensor(MASTER)].state = "19"
        f.hass.states[sensor(SIBLING)].state = "17"
        with self.local_reads(f, (LOCAL, MASTER)) as reads:
            self.assertTrue(self.request(f, target))
            self.assertTrue(f.s._delivery_projection_is_current(LOCAL, target))
        self.assertIn(MASTER, reads)
        self.assertNotIn(SIBLING, reads)
        self.assertNotIn(OTHER, reads)
        f.s._async_write_state()
        self.assertEqual(self.payload(f)["room_sensor_assist"][SIBLING]["room_temperature"], 17)

    async def test_local_guard_revalidates_temperature_and_clock_after_await(self):
        for changed in ("temperature", "time"):
            with self.subTest(changed=changed):
                clock = [NOW]
                with patch.object(scheduler_module.dt_util, "now", lambda: clock[0]):
                    f = self.make()
                    target = f.s.get_active_target_event(LOCAL)
                    original_states = f.hass.states
                    entered, release = asyncio.Event(), asyncio.Event()
                    original = f.manager.async_set_temperature
                    async def delayed(*args, **kwargs):
                        entered.set()
                        await release.wait()
                        await original(*args, **kwargs)
                    f.manager.async_set_temperature = delayed
                    task = None
                    try:
                        with self.local_reads(f):
                            task = asyncio.create_task(f.s._async_refresh_room_sensor_assist(
                                LOCAL, target_temperature=target.temperature, hvac_mode=target.hvac_mode,
                                weekday=target.weekday, start=target.start, reason="local-await"))
                            await asyncio.wait_for(entered.wait(), 2)
                            if changed == "temperature":
                                original_states[sensor(LOCAL)].state = "19"
                            else:
                                clock[0] = NOW + timedelta(hours=1)
                            release.set()
                            await asyncio.wait_for(task, 2)
                        self.assertEqual(len(f.manager.calls), 1)
                        self.assertNotIn(LOCAL, f.s._room_sensor_assist_states)
                        self.assertNotIn(LOCAL, f.s._room_sensor_assist_inflight)
                    finally:
                        release.set()
                        if task is not None:
                            await asyncio.gather(task, return_exceptions=True)

    async def test_scoped_return_changes_control_without_rebuilding_public_status(self):
        f = self.make(returning=True)
        r = f.s._planned_return
        before = deepcopy(r.status())
        self.assertEqual(r.target(LOCAL, NOW).temperature, 21)
        f.hass.states[sensor(LOCAL)].state = "21"
        f.hass.states[sensor(OTHER)].state = "17"
        with self.local_reads(f):
            r.prepare(NOW, entities={LOCAL}, publish=False)
            self.assertIsNone(r.target(LOCAL, NOW))
            self.assertEqual(r.target(OTHER, NOW).temperature, 21)
            self.assertEqual(r.status(), before)
        f.s._async_write_state()
        payload = self.payload(f)
        self.assertEqual(payload["room_sensor_assist"][LOCAL]["room_temperature"], 21)
        self.assertEqual(payload["room_sensor_assist"][OTHER]["room_temperature"], 17)
        self.assertNotEqual(r.status(), before)
        self.assertEqual(f.manager.calls, [])

    async def test_scoped_return_rechecks_accepted_master_without_reading_siblings(self):
        f = self.make(returning=True, master=True)
        r = f.s._planned_return
        master_plan = next(event for event in r.plans(NOW) if event.entity_id == MASTER)
        with patch.object(f.s, "_async_release_preconditioning_dependents", new_callable=AsyncMock):
            self.assertTrue(await f.s._async_apply_event(master_plan, source="planned_return", applied_at=NOW))
        f.s._prepare_runtime_projection()
        target = r.target(LOCAL, NOW)
        self.assertIsNotNone(target)
        self.assertEqual(target.temperature, 21)
        commands = deepcopy(f.manager.calls)
        f.hass.states[MASTER].state = "unavailable"
        f.hass.states[sensor(SIBLING)].state = "17"
        with self.local_reads(f, (LOCAL, MASTER)):
            r.prepare(NOW, entities={LOCAL, MASTER}, publish=False)
            self.assertIsNone(r.target(LOCAL, NOW))
            self.assertFalse(self.request(f, target))
            self.assertFalse(f.s._delivery_projection_is_current(LOCAL, target))
        self.assertEqual(f.manager.calls, commands)
        f.s._async_write_state()
        payload = self.payload(f)
        self.assertEqual(payload["room_sensor_assist"][SIBLING]["room_temperature"], 17)
        rows = payload["planned_return_status"]["preparation"]["zones"]
        row = next(row for row in rows if row["entity_id"] == LOCAL)
        self.assertEqual(row["preconditioning_dependency"]["reason_detail"], "master_unavailable")

    async def test_local_clock_pass_preserves_foreign_transition_for_publication(self):
        clock = [NOW]
        with patch.object(scheduler_module.dt_util, "now", lambda: clock[0]):
            f = self.make()
            await f.s.async_set_daily_schedule(OTHER, "tuesday", [
                {"start": "00:00", "temperature": 21, "hvac_mode": "heat"},
                {"start": "18:30", "temperature": 24, "hvac_mode": "heat"},
                {"start": "20:00", "temperature": 22, "hvac_mode": "heat"}])
            clock[0] = NOW + timedelta(minutes=31)
            target = f.s.get_active_target_event(LOCAL)
            with self.local_reads(f):
                self.assertTrue(self.request(f, target))
                self.assertTrue(f.s._delivery_projection_is_current(LOCAL, target))
            f.s._async_write_state()
            payload = self.payload(f)
            self.assertEqual(payload["room_sensor_assist"][OTHER]["target_temperature"], 24)
            upcoming = next(row for row in payload["next_effective_events"] if row["entity_id"] == OTHER)
            self.assertEqual(upcoming["when"], (NOW + timedelta(hours=2)).isoformat())

    async def test_reported_target_shape_echo_keeps_explicit_feature_delivery_current(self):
        from custom_components.velair.climate_manager import ClimateManager
        f = self.make()
        f.hass.config.units = SimpleNamespace(temperature_unit="°C")
        f.data["zones"][LOCAL]["preconditioning"]["room_sensor_assist_enabled"] = False
        old = f.hass.states[LOCAL]
        f.hass.states[LOCAL] = SimpleNamespace(state="off", attributes={
            **old.attributes, "supported_features": 1})
        physical = ClimateManager(f.hass)
        scheduler = VelairScheduler(f.hass, f.data, physical, AsyncMock())
        self.addAsyncCleanup(scheduler.async_stop)
        services = []
        async def call(_domain, name, data, **kwargs):
            services.append(name)
            attributes = dict(f.hass.states[LOCAL].attributes)
            if name == "set_hvac_mode":
                attributes.pop("temperature", None)
            elif name == "set_temperature":
                attributes["temperature"] = data["temperature"]
            f.hass.states[LOCAL] = SimpleNamespace(state="heat", attributes=attributes)
            await asyncio.sleep(0)
        f.hass.services.async_call = call
        self.assertTrue(await scheduler.async_apply_current_schedule(LOCAL))
        self.assertEqual(services, ["set_hvac_mode", "set_temperature"])
        self.assertTrue(scheduler._schedule_projection.capabilities_current(LOCAL))
        self.assertIsNone(scheduler._projection_capability_task)

    async def test_fallback_target_shape_change_requires_prepared_capability_refresh(self):
        f = self.make()
        f.s._prepare_runtime_projection(configuration=True)
        target = f.s.get_active_target_event(LOCAL)
        state = deepcopy(f.hass.states[LOCAL])
        state.attributes["supported_features"] = 0
        state.attributes.pop("temperature")
        state.attributes.update(target_temp_low=20, target_temp_high=24)
        f.hass.states[LOCAL] = state
        self.assertFalse(self.request(f, target))
        self.assertIsNotNone(f.s._projection_capability_task)
        self.assertEqual(f.manager.calls, [])
