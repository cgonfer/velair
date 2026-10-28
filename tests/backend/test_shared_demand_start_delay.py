"""Continuous aggregate demand confirmation and safe explicit resume."""
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from . import test_shared_demand as fixtures
from . import test_shared_demand_audit as audit


class SharedDemandStartDelayTests(unittest.IsolatedAsyncioTestCase):
    setUp = fixtures.SharedDemandRuntimeTests.setUp
    asyncTearDown = fixtures.SharedDemandRuntimeTests.asyncTearDown
    flush = fixtures.SharedDemandRuntimeTests.flush
    start = fixtures.SharedDemandRuntimeTests.start
    switch = audit.SharedDemandAuditTests.switch

    def now(self, seconds):
        fixtures.module.dt_util.now.return_value = fixtures.NOW + timedelta(seconds=seconds)

    def room(self, entity="climate.room", **kwargs):
        old = self.hass.states.get(entity)
        new = fixtures.state(**kwargs)
        self.hass.states[entity] = new
        self.controller._state_changed(SimpleNamespace(data={
            "entity_id": entity, "old_state": old, "new_state": new}))

    async def configure(self, **kwargs):
        self.data["settings"]["shared_demand_groups"][0].update(on_delay_seconds=30, **kwargs)
        await self.start()

    async def test_heat_cool_wait_for_deadline_and_callback_starts_without_polling(self):
        callbacks = []
        with patch.object(fixtures.module, "async_track_point_in_time",
                          side_effect=lambda _h, cb, when: callbacks.append((cb, when)) or (lambda: None)):
            for direction, temperature in (("heat", 20), ("cool", 22)):
                with self.subTest(direction=direction):
                    self.now(0)
                    self.hass.states["climate.room"] = fixtures.state(direction, temperature, 21)
                    await self.configure(direction=direction)
                    self.assertFalse(self.calls)
                    status = self.controller.get_live_statuses()["boiler"]
                    self.assertEqual(status["status"], "on_delay")
                    self.assertEqual(status["pending_until"], (fixtures.NOW + timedelta(seconds=30)).isoformat())
                    self.assertTrue(status["zones"]["climate.room"]["demand"])
                    self.now(29)
                    self.controller.request_refresh()
                    await self.flush()
                    self.assertFalse(self.calls)
                    callback, when = callbacks[-1]
                    self.now(30)
                    callback(when)
                    await self.flush()
                    self.assertEqual(self.calls[-1][1], "turn_on")
                    await self.controller.async_stop()
                    self.calls.clear()

    async def test_on_delay_and_minimum_off_overlap_with_later_reason(self):
        self.hass.states["switch.boiler"].last_changed = fixtures.NOW - timedelta(seconds=10)
        await self.configure(minimum_off_seconds=60)
        status = self.controller.get_statuses()["boiler"]
        self.assertEqual(status["status"], "minimum_off")
        self.assertEqual(status["pending_until"], (fixtures.NOW + timedelta(seconds=50)).isoformat())
        self.now(50)
        self.controller.request_refresh()
        await self.flush()
        self.assertEqual(self.calls[-1][1], "turn_on")

    async def test_shorter_protection_does_not_add_to_demand_confirmation(self):
        self.hass.states["switch.boiler"].last_changed = fixtures.NOW
        await self.configure(minimum_off_seconds=10)
        self.assertEqual(self.controller.get_statuses()["boiler"]["status"], "on_delay")
        self.now(30)
        self.controller.request_refresh()
        await self.flush()
        self.assertEqual(self.calls[-1][1], "turn_on")

    async def test_coalesced_idle_or_unknown_interruption_restarts_window(self):
        await self.configure()
        for seconds, temperature in ((20, 22), (40, None)):
            self.now(seconds)
            self.room(temperature=temperature)
            self.room(temperature=20)
            await self.flush()
            self.assertEqual(self.controller._timers["boiler"][0], fixtures.NOW + timedelta(seconds=seconds + 30))
            self.assertFalse(self.calls)

    async def test_known_room_handoff_preserves_aggregate_confirmation(self):
        self.data["zones"]["climate.other"] = {"enabled": True}
        self.data["settings"]["shared_demand_groups"][0]["zones"]["climate.other"] = {}
        self.hass.states["climate.other"] = fixtures.state(temperature=22)
        await self.configure()
        self.now(15)
        self.room("climate.other", temperature=20)
        self.room(temperature=22)
        await self.flush()
        self.assertEqual(self.controller._timers["boiler"][0], fixtures.NOW + timedelta(seconds=30))
        self.now(30)
        self.controller.request_refresh()
        await self.flush()
        self.assertEqual(self.calls[-1][1], "turn_on")

    async def test_coalesced_room_assist_commits_reset_without_device_events(self):
        self.assist = dict(active=True, valid=True, direction="heat", demand=True)
        await self.configure()
        for seconds, valid in ((20, True), (40, False)):
            self.now(seconds)
            self.assist.update(valid=valid, demand=False)
            self.controller.request_refresh()
            self.assist.update(valid=True, demand=True)
            self.controller.request_refresh()
            await self.flush()
            self.assertFalse(self.calls)
            self.assertEqual(self.controller._timers["boiler"][0],
                             fixtures.NOW + timedelta(seconds=seconds + 30))

    async def test_unknown_aggregate_and_unavailable_output_cancel_timer(self):
        await self.configure()
        self.room(temperature=None)
        await self.flush()
        self.assertNotIn("boiler", self.controller._timers)
        self.assertNotIn("boiler", self.controller._demand_since)
        self.now(20)
        self.room(temperature=20)
        await self.flush()
        self.switch("unavailable")
        await self.flush()
        self.assertNotIn("boiler", self.controller._demand_since)
        self.now(25)
        self.switch("off")
        await self.flush()
        self.assertEqual(self.controller._timers["boiler"][0], fixtures.NOW + timedelta(seconds=55))

    async def test_resume_starts_new_confirmation_and_preserves_actual_off_protection(self):
        self.hass.states["switch.boiler"] = fixtures.state("on")
        await self.configure(minimum_off_seconds=60)
        self.now(10)
        self.switch("off")
        await self.flush()
        self.assertEqual(self.controller.get_statuses()["boiler"]["suspension_reason"], "external_off")
        self.assertEqual(self.data["settings"]["shared_demand_groups"][0]["suspension_reason"], "external_off")
        self.now(20)
        await self.controller.async_resume("boiler")
        await self.flush()
        self.assertNotIn("suspension_reason", self.data["settings"]["shared_demand_groups"][0])
        self.assertFalse(self.calls)
        self.assertEqual(self.controller._timers["boiler"][0], fixtures.NOW + timedelta(seconds=70))
        self.now(70)
        self.controller.request_refresh()
        await self.flush()
        self.assertEqual(self.calls[-1][1], "turn_on")

    async def test_resume_reads_new_target_and_does_not_force_on_without_demand(self):
        self.hass.states["switch.boiler"] = fixtures.state("on")
        await self.configure()
        self.switch("off")
        await self.flush()
        self.room(target=19)
        await self.flush()
        await self.controller.async_resume("boiler")
        await self.flush()
        self.assertEqual(self.controller.get_statuses()["boiler"]["status"], "idle")
        self.assertFalse(self.calls)
        self.assertFalse(self.controller._timers)

    async def test_disable_restart_and_metadata_edit_timing(self):
        await self.configure()
        self.now(15)
        groups = deepcopy(self.data["settings"]["shared_demand_groups"])
        groups[0]["name"] = "Renamed"
        await self.controller.async_update_groups(groups)
        await self.flush()
        self.assertEqual(self.controller._timers["boiler"][0], fixtures.NOW + timedelta(seconds=30))
        groups[0]["enabled"] = False
        await self.controller.async_update_groups(groups)
        await self.flush()
        self.assertFalse(self.controller._demand_since)
        groups[0]["enabled"] = True
        await self.controller.async_update_groups(groups)
        await self.flush()
        self.assertEqual(self.controller._timers["boiler"][0], fixtures.NOW + timedelta(seconds=45))
        await self.controller.async_stop()
        self.now(20)
        await self.controller.async_start()
        await self.flush()
        self.assertEqual(self.controller._timers["boiler"][0], fixtures.NOW + timedelta(seconds=50))
