"""Only confirmed supply corrections are reported, without changing control."""
from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from . import test_shared_demand as fixtures
from . import test_shared_demand_audit as audit


class SharedSupplyNotificationTests(unittest.IsolatedAsyncioTestCase):
    setUp = fixtures.SharedDemandRuntimeTests.setUp
    asyncTearDown = fixtures.SharedDemandRuntimeTests.asyncTearDown
    start = fixtures.SharedDemandRuntimeTests.start
    switch = audit.SharedDemandAuditTests.switch

    async def flush(self):
        await fixtures.SharedDemandRuntimeTests.flush(self)
        task = self.controller._supply_notifications._task
        if task is not None:
            await task

    def services(self, *, acknowledge=True, fail_notification=False, fail_switch=False):
        self.hass.services.has_service = lambda domain, service: True

        async def service(domain, action, data, **kwargs):
            self.calls.append((domain, action, data, kwargs))
            if domain == "switch":
                if fail_switch:
                    raise RuntimeError("switch failure")
                if acknowledge:
                    self.switch("on" if action == "turn_on" else "off", context=kwargs["context"])
            elif domain == "persistent_notification" and fail_notification:
                raise RuntimeError("notification failure")
        self.hass.services.async_call = service

    async def idle(self, **changes):
        self.data["settings"]["shared_demand_groups"][0].update(changes)
        self.hass.states["climate.room"] = fixtures.state(temperature=22)
        self.services()
        await self.start()

    def notices(self, domain="persistent_notification"):
        return [call for call in self.calls if call[0] == domain]

    async def test_confirmed_inline_ack_reports_clear_reason_and_stable_id(self):
        await self.idle()
        self.switch("on")
        await self.flush()
        self.assertEqual(len(self.notices()), 1)
        self.assertEqual(len(self.notices("logbook")), 1)
        payload = self.notices()[0][2]
        self.assertEqual(payload["notification_id"], "velair_supply_control_boiler")
        for fragment in ("turned off", "external turn-on", "heating demand", "switch.boiler", "/velair/supply-control"):
            self.assertIn(fragment, payload["message"])
        self.assertNotIn("manually", payload["message"])

    async def test_acceptance_alone_does_not_report_but_delayed_ack_does(self):
        await self.idle()
        self.services(acknowledge=False)
        self.switch("on")
        await self.flush()
        self.assertEqual(self.notices(), [])
        context = self.notices("switch")[-1][3]["context"]
        self.switch("off", context=context)
        await self.flush()
        self.assertEqual(len(self.notices()), 1)

    async def test_parent_context_acknowledges_specific_correction_command(self):
        await self.idle()
        self.services(acknowledge=False)
        self.switch("on")
        await self.flush()
        context = self.notices("switch")[-1][3]["context"]
        self.switch("off", context=SimpleNamespace(id="child", parent_id=context.id))
        await self.flush()
        self.assertEqual(len(self.notices()), 1)

    async def test_room_assist_unknown_and_true_excluded_false_included(self):
        await self.idle()
        for assist, expected in [
            (dict(active=True, valid=False, direction="heat", demand=False), 0),
            (dict(active=True, valid=True, direction="heat", demand=True), 0),
            (dict(active=True, valid=True, direction="heat", demand=False), 1),
        ]:
            with self.subTest(assist=assist):
                self.assist = assist
                self.hass.states["switch.boiler"] = fixtures.state("off")
                self.switch("on")
                await self.flush()
                self.assertEqual(len(self.notices()), expected)

    async def test_notification_preview_preserves_hysteresis_cache(self):
        await self.idle()
        prior = deepcopy(self.controller._phases)
        self.hass.states["climate.room"] = fixtures.state(temperature=20)
        group = self.controller._groups["boiler"]
        self.assertFalse(self.controller._notice_eligible(group))
        self.assertEqual(self.controller._phases, prior)

    async def test_external_ack_does_not_prove_velair_correction(self):
        await self.idle()
        self.services(acknowledge=False)
        self.switch("on")
        await self.flush()
        self.switch("off")
        await self.flush()
        self.assertEqual(len(self.notices()), 1)
        self.assertIn("paused until", self.notices()[0][2]["message"])
        self.assertTrue(self.controller.get_statuses()["boiler"]["suspended"])

    async def test_relevant_output_attribute_changes_keep_context_tracking_bounded(self):
        await self.idle()
        self.services(acknowledge=False)
        self.switch("on")
        await self.flush()
        for index in range(20):
            old = self.hass.states["switch.boiler"]
            new = fixtures.state("on", temperature=index)
            self.hass.states["switch.boiler"] = new
            self.controller._state_changed(SimpleNamespace(data={
                "entity_id": "switch.boiler", "old_state": old, "new_state": new}))
            await self.flush()
        self.assertGreater(len(self.notices("switch")), 3)
        self.assertEqual(len(self.controller._external_ons["boiler"][1]), 3)
        self.assertEqual(self.notices(), [])
        latest = self.notices("switch")[-1][3]["context"]
        self.switch("off", context=latest)
        await self.flush()
        self.assertEqual(len(self.notices()), 1)

    async def test_initial_on_normal_demand_off_and_owned_on_never_report(self):
        self.services()
        self.hass.states["switch.boiler"] = fixtures.state("on")
        self.hass.states["climate.room"] = fixtures.state(temperature=22)
        await self.start()
        self.assertEqual(self.notices(), [])
        self.hass.states["climate.room"] = fixtures.state(temperature=20)
        self.controller.request_refresh()
        await self.flush()
        self.hass.states["climate.room"] = fixtures.state(temperature=22)
        self.controller.request_refresh()
        await self.flush()
        self.assertEqual(self.notices(), [])
        context = SimpleNamespace(id=self.controller._contexts[-1], parent_id=None)
        self.switch("on", context=context)
        await self.flush()
        self.assertEqual(self.notices(), [])

    async def test_unknown_temperature_and_unavailable_output_never_report(self):
        await self.idle()
        self.hass.states["climate.room"] = fixtures.state(temperature=float("nan"))
        self.switch("on")
        await self.flush()
        self.assertEqual(self.notices(), [])
        self.switch("unavailable")
        self.switch("on")
        await self.flush()
        self.assertEqual(self.notices(), [])

    async def test_demand_changed_before_delayed_ack_drops_notice(self):
        await self.idle()
        self.services(acknowledge=False)
        self.switch("on")
        await self.flush()
        context = self.notices("switch")[-1][3]["context"]
        self.hass.states["climate.room"] = fixtures.state(temperature=20)
        self.switch("off", context=context)
        await self.flush()
        self.assertEqual(self.notices(), [])

    async def test_off_delay_and_failed_delivery_keep_candidate_until_ack(self):
        await self.idle(off_delay_seconds=30)
        self.switch("on")
        await self.flush()
        self.assertEqual(self.calls, [])
        fixtures.module.dt_util.now.return_value = fixtures.NOW + timedelta(seconds=31)
        self.services(fail_switch=True)
        self.controller._queue({"boiler"})
        await self.flush()
        self.assertEqual(self.notices(), [])
        fixtures.module.dt_util.now.return_value = fixtures.NOW + timedelta(seconds=34)
        self.services()
        self.controller._queue({"boiler"})
        await self.flush()
        self.assertEqual(len(self.notices()), 1)

    async def test_repeated_external_turnons_rate_limit_both_channels(self):
        await self.idle()
        for _ in range(1000):
            self.switch("on")
            await self.flush()
        self.assertEqual(len(self.notices()), 1)
        self.assertEqual(len(self.notices("logbook")), 1)
        fixtures.module.dt_util.now.return_value = fixtures.NOW + timedelta(minutes=15)
        self.switch("on")
        await self.flush()
        self.assertEqual(len(self.notices()), 2)

    async def test_waiting_candidate_sensor_burst_keeps_evaluation_coalesced(self):
        await self.idle(off_delay_seconds=60)
        self.switch("on")
        await self.flush()
        phases = deepcopy(self.controller._phases)
        with patch.object(self.controller, "_notice_eligible", wraps=self.controller._notice_eligible) as previews:
            for index in range(1000):
                old = self.hass.states["climate.room"]
                new = fixtures.state(temperature=22 + index / 10000)
                self.hass.states["climate.room"] = new
                self.controller._state_changed(SimpleNamespace(data={
                    "entity_id": "climate.room", "old_state": old, "new_state": new}))
            previews.assert_not_called()
            self.assertEqual(self.controller._phases, phases)
            await self.flush()
            self.assertEqual(previews.call_count, 1)
        self.assertEqual(self.notices(), [])

    async def test_notification_failure_does_not_prevent_logbook_or_control(self):
        await self.idle()
        self.services(fail_notification=True)
        self.switch("on")
        await self.flush()
        self.assertEqual(self.hass.states["switch.boiler"].state, "off")
        self.assertEqual(len(self.notices("logbook")), 1)
        self.switch("on")
        await self.flush()
        self.assertEqual(len(self.notices()), 1)

    async def test_absent_logbook_is_skipped(self):
        await self.idle()
        self.hass.services.has_service = lambda domain, service: domain == "persistent_notification"
        self.switch("on")
        await self.flush()
        self.assertEqual(len(self.notices()), 1)
        self.assertEqual(self.notices("logbook"), [])

    async def test_external_off_reports_pause_once_with_independent_correction_cooldown(self):
        await self.idle()
        self.switch("on")
        await self.flush()
        self.assertEqual(len(self.notices()), 1)
        # A recent correction must not suppress a subsequent pause notification.
        self.hass.states["climate.room"] = fixtures.state(temperature=20)
        self.controller.request_refresh()
        await self.flush()
        self.switch("off")
        await self.flush()
        self.assertEqual(len(self.notices()), 2)
        self.assertEqual(len(self.notices("logbook")), 2)
        payload = self.notices()[-1][2]
        self.assertEqual(payload["notification_id"], "velair_supply_control_boiler_paused")
        for fragment in ("outside Velair", "paused until", "Resume automatic control", "Boiler"):
            self.assertIn(fragment, payload["message"])
        self.assertNotIn("manually", payload["message"])
        for _ in range(20):
            self.controller.request_refresh()
        await self.flush()
        self.switch("on")
        self.switch("off")
        await self.flush()
        self.assertEqual(len(self.notices()), 2)

    async def test_pause_notification_failure_keeps_paused_and_records_activity(self):
        self.services(fail_notification=True)
        self.hass.states["switch.boiler"] = fixtures.state("on")
        await self.start()
        self.switch("off")
        await self.flush()
        self.assertTrue(self.controller.get_statuses()["boiler"]["suspended"])
        self.assertEqual(len(self.notices("logbook")), 1)
        self.assertIn("paused until", self.notices("logbook")[0][2]["message"])

    async def test_suspension_and_reconfiguration_drop_pending_candidate(self):
        await self.idle()
        self.services(acknowledge=False)
        self.switch("on")
        await self.flush()
        context = self.notices("switch")[-1][3]["context"]
        replacement = deepcopy(self.data["settings"]["shared_demand_groups"])
        replacement[0]["enabled"] = False
        await self.controller.async_update_groups(replacement)
        self.switch("off", context=context)
        await self.flush()
        self.assertEqual(self.notices(), [])

    async def test_notification_worker_does_not_hold_control_and_stops_cleanly(self):
        await self.idle()
        entered = asyncio.Event()
        previous = self.hass.services.async_call

        async def service(domain, action, data, **kwargs):
            if domain == "persistent_notification":
                entered.set()
                await asyncio.Event().wait()
            else:
                await previous(domain, action, data, **kwargs)
        self.hass.services.async_call = service
        self.switch("on")
        await fixtures.SharedDemandRuntimeTests.flush(self)
        await entered.wait()
        self.assertFalse(self.controller._lock.locked())
        self.assertEqual(self.hass.states["switch.boiler"].state, "off")
        await self.controller.async_stop()
        self.assertIsNone(self.controller._supply_notifications._task)
        self.assertEqual(self.controller._external_ons, {})

    async def test_cooling_and_independent_supplies_have_separate_cooldowns(self):
        await self.idle(direction="cool")
        self.hass.states["climate.room"] = fixtures.state("cool", 20, 21)
        self.switch("on")
        await self.flush()
        self.assertIn("cooling demand", self.notices()[0][2]["message"])
        helper = self.controller._supply_notifications
        other = deepcopy(self.data["settings"]["shared_demand_groups"][0])
        other.update(id="other", switch_entity_id="switch.other")
        helper.queue(other, fixtures.state("off"), fixtures.NOW)
        await self.flush()
        self.assertEqual(len(self.notices()), 2)


if __name__ == "__main__":
    unittest.main()
