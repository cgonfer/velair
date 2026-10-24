"""Adversarial group edits with actual switch acknowledgements and gated writes."""
from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from . import test_shared_demand as fixtures
from . import test_temperature as temperatures
from custom_components.velair import api


class SharedDemandAuditTests(unittest.IsolatedAsyncioTestCase):
    setUp = fixtures.SharedDemandRuntimeTests.setUp
    asyncTearDown = fixtures.SharedDemandRuntimeTests.asyncTearDown
    flush = fixtures.SharedDemandRuntimeTests.flush
    start = fixtures.SharedDemandRuntimeTests.start

    def switch(self, value, *, context=None, changed=None):
        old = self.hass.states["switch.boiler"]
        new = SimpleNamespace(state=value, attributes={},
                              last_changed=changed or fixtures.module._utc_now(),
                              context=context or SimpleNamespace(id="manual", parent_id=None))
        self.hass.states["switch.boiler"] = new
        if "switch.boiler" in self.controller._entities:
            self.controller._state_changed(SimpleNamespace(data={
                "entity_id": "switch.boiler", "old_state": old, "new_state": new}))

    def acknowledge_services(self):
        async def service(domain, action, data, **kwargs):
            self.calls.append((domain, action, data, kwargs))
            self.switch("on" if action == "turn_on" else "off", context=kwargs["context"])
        self.hass.services.async_call = service

    async def test_metadata_edits_preserve_retained_heating_and_cooling(self):
        self.acknowledge_services()
        for direction, target, initial, retained in [("heat", 21, 20, 20.9), ("cool", 24, 25, 24.1)]:
            with self.subTest(direction=direction):
                raw = self.data["settings"]["shared_demand_groups"][0]
                raw.update(direction=direction, hysteresis_mode="at_target")
                self.hass.states["climate.room"] = fixtures.state(direction, initial, target)
                await self.controller.async_start()
                self.controller.reconfigure()
                await self.flush()
                self.hass.states["climate.room"] = fixtures.state(direction, retained, target)
                self.controller.request_refresh()
                await self.flush()
                self.assertTrue(self.controller.get_statuses()["boiler"]["demand"])
                calls = len(self.calls)
                updated = deepcopy(self.data["settings"]["shared_demand_groups"])
                updated[0].update(name="Renamed", hysteresis_stop=0.8)
                updated[0]["zones"]["climate.room"]["hysteresis_stop"] = 0.4
                await self.controller.async_update_groups(updated)
                await self.flush()
                self.assertTrue(self.controller.get_statuses()["boiler"]["demand"])
                self.assertEqual(len(self.calls), calls)

    async def test_rename_does_not_extend_continuous_switch_off_delay(self):
        self.acknowledge_services()
        self.data["settings"]["shared_demand_groups"][0]["off_delay_seconds"] = 60
        self.hass.states["switch.boiler"] = fixtures.state("on")
        self.hass.states["climate.room"] = fixtures.state(temperature=22)
        await self.start()
        deadline = self.controller._timers["boiler"][0]
        fixtures.module.dt_util.now.return_value = fixtures.NOW + timedelta(seconds=40)
        updated = deepcopy(self.data["settings"]["shared_demand_groups"])
        updated[0]["name"] = "Renamed"
        await self.controller.async_update_groups(updated)
        await self.flush()
        self.assertEqual(self.controller._timers["boiler"][0], deadline)
        self.assertEqual(self.calls, [])

    async def test_metadata_commit_notifies_other_panels_without_new_control_action(self):
        self.acknowledge_services()
        await self.start()
        calls = len(self.calls)
        updated = deepcopy(self.data["settings"]["shared_demand_groups"])
        updated[0]["name"] = "Renamed"
        with patch.object(fixtures.module, "async_dispatcher_send") as notifications:
            await self.controller.async_update_groups(updated)
            await self.flush()
            notifications.assert_called_once_with(self.hass, fixtures.module.SIGNAL_SHARED_DEMAND_UPDATED)
        self.assertEqual(len(self.calls), calls)

    async def test_newer_manual_off_wins_over_pending_resume(self):
        self.acknowledge_services()
        self.data["settings"]["shared_demand_groups"][0]["suspended"] = True
        self.hass.states["switch.boiler"] = fixtures.state("on")
        await self.start()
        entered, release = asyncio.Event(), asyncio.Event()

        async def delayed_save():
            entered.set()
            await release.wait()

        self.save.side_effect = delayed_save
        resume = asyncio.create_task(self.controller.async_resume("boiler"))
        await entered.wait()
        self.switch("off")
        release.set()
        await resume
        await self.flush()
        self.assertFalse(any(call[1] == "turn_on" for call in self.calls))
        self.assertTrue(self.data["settings"]["shared_demand_groups"][0]["suspended"])
        self.assertEqual(self.controller._pending_suspensions, set())

    async def test_reenable_uses_latest_real_off_transition(self):
        self.acknowledge_services()
        raw = self.data["settings"]["shared_demand_groups"][0]
        raw["minimum_off_seconds"] = 120
        await self.start()
        updated = deepcopy(self.data["settings"]["shared_demand_groups"])
        updated[0]["enabled"] = False
        await self.controller.async_update_groups(updated)
        await self.flush()
        self.switch("on", changed=fixtures.NOW + timedelta(seconds=600))
        self.switch("off", changed=fixtures.NOW + timedelta(seconds=610))
        fixtures.module.dt_util.now.return_value = fixtures.NOW + timedelta(seconds=620)
        updated[0]["enabled"] = True
        calls = len(self.calls)
        await self.controller.async_update_groups(updated)
        await self.flush()
        self.assertEqual(len(self.calls), calls)
        status = self.controller.get_statuses()["boiler"]
        self.assertEqual(status["status"], "minimum_off")
        self.assertEqual(self.controller._timers["boiler"][0], fixtures.NOW + timedelta(seconds=730))

    async def test_malformed_temperature_drops_demand_without_aborting_worker(self):
        self.acknowledge_services()
        await self.start()
        self.hass.states["climate.room"] = fixtures.state(temperature=10 ** 400)
        self.controller.request_refresh()
        await self.flush()
        status = self.controller.get_statuses()["boiler"]
        self.assertFalse(status["demand"])
        self.assertEqual(status["zones"]["climate.room"]["reason"], "missing_temperature")
        self.assertEqual(self.hass.states["switch.boiler"].state, "off")

    async def test_sensor_burst_coalesces_without_writes_services_or_broadcasts(self):
        self.acknowledge_services()
        await self.start()
        self.calls.clear()
        self.save.reset_mock()
        with patch.object(self.hass, "async_create_task", wraps=self.hass.async_create_task) as jobs, \
                patch.object(fixtures.module, "async_dispatcher_send") as broadcasts:
            for index in range(1000):
                old = self.hass.states["climate.room"]
                new = fixtures.state(temperature=20 + index / 10000)
                self.hass.states["climate.room"] = new
                self.controller._state_changed(SimpleNamespace(data={
                    "entity_id": "climate.room", "old_state": old, "new_state": new}))
            await self.flush()
            self.assertEqual(jobs.call_count, 1)
            broadcasts.assert_not_called()
        self.assertEqual(self.calls, [])
        self.save.assert_not_awaited()
        self.assertEqual(self.controller._timers, {})

    async def test_manual_off_survives_temperature_migration_commit_and_restart(self):
        storage = temperatures.make_storage(temperatures.CELSIUS)
        await storage.async_load(["climate.room"])
        storage.data["zones"]["climate.room"]["enabled"] = True
        storage.data["settings"]["shared_demand_groups"] = [fixtures.group()]
        self.data = storage.data
        self.scheduler._data = self.data
        self.scheduler._profile_mutation_lock = asyncio.Lock()
        self.scheduler.set_temperature_migration_blocked = lambda value: setattr(self.scheduler, "temperature_migration_blocked", value)
        self.scheduler.async_restore_room_sensor_assist_after_temperature_operation = AsyncMock()
        self.scheduler.handle_temperature_unit_change = Mock()
        self.scheduler.async_start = AsyncMock()
        self.controller._data = self.data
        self.controller._save = storage.async_save
        self.hass.states["switch.boiler"] = fixtures.state("on")
        await self.start()
        storage._hass.config.units.temperature_unit = temperatures.FAHRENHEIT
        storage._store = gated = temperatures.GatedStore()
        runtime = {"storage": storage, "scheduler": self.scheduler,
                   "entry": SimpleNamespace(entry_id="audit", options={}, data={})}
        connection = Mock()
        with patch.object(api, "_get_runtime", return_value=runtime), \
                patch.object(api, "_build_schedule_response", return_value={}), \
                patch.object(api, "async_dismiss_temperature_migration_notification", new=AsyncMock()):
            migration = asyncio.create_task(api.ws_resolve_temperature_migration(self.hass, connection, {
                "id": 1, "source_unit": temperatures.CELSIUS, "migration_id": "audit", "expected_revision": 0}))
            await gated.first_started.wait()
            self.switch("off")
            for _ in range(5):
                await asyncio.sleep(0)
            gated.release_first.set()
            await migration
            await self.flush()
        connection.send_error.assert_not_called()
        self.assertTrue(gated.data["settings"]["shared_demand_groups"][0]["suspended"])
        restarted = temperatures.make_storage(temperatures.FAHRENHEIT, gated.data)
        await restarted.async_load(["climate.room"])
        self.assertTrue(restarted.data["settings"]["shared_demand_groups"][0]["suspended"])

    async def test_orderly_unload_settles_an_interrupted_manual_suspension_write(self):
        storage = temperatures.make_storage(temperatures.CELSIUS)
        await storage.async_load(["climate.room"])
        storage.data["zones"]["climate.room"]["enabled"] = True
        storage.data["settings"]["shared_demand_groups"] = [fixtures.group()]
        await storage.async_save()
        committed = deepcopy(storage._store.data)
        storage._store = gated = temperatures.GatedStore()
        gated.data = committed
        self.data = storage.data
        self.scheduler._data = self.data
        self.controller._data = self.data
        self.controller._save = storage.async_save
        self.hass.states["switch.boiler"] = fixtures.state("on")
        await self.start()
        self.switch("off")
        await gated.first_started.wait()
        await self.controller.async_stop()
        restarted = temperatures.make_storage(temperatures.CELSIUS, gated.data)
        await restarted.async_load(["climate.room"])
        self.assertTrue(restarted.data["settings"]["shared_demand_groups"][0]["suspended"])
        self.assertEqual(len(gated.saved), 2)
