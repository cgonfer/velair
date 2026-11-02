"""External control is visible before queued ownership listeners complete."""
from copy import deepcopy
import asyncio
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock

from .helpers import FakeHass, FakeClimateManager, VelairScheduler, normalize_schedule_data
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.climate_change_monitor import ClimateChangeMonitor
from custom_components.velair.climate_delivery import ClimateDeliveryCoordinator, Delivery
from custom_components.velair.room_groups import build_group_candidate

ENTITY = "climate.pending"


class PendingExternalChangesTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.hass = FakeHass()
        self.hass.config.units = SimpleNamespace(temperature_unit="°C")
        self.hass.states[ENTITY] = self.state("off", 20)
        self.manager = ClimateManager(self.hass)
        self.scheduler = SimpleNamespace(async_handle_external_climate_change=AsyncMock())
        self.monitor = ClimateChangeMonitor(self.hass, [ENTITY], self.manager, self.scheduler)
        self.monitor.async_start()
        self.coordinator = ClimateDeliveryCoordinator(self.hass)
        self.addAsyncCleanup(self.coordinator.async_stop)
        self.addCleanup(self.monitor.async_stop)

    def state(self, mode, target, context=None):
        return SimpleNamespace(entity_id=ENTITY, state=mode, context=context, attributes={
            "temperature": target, "current_temperature": 18,
            "hvac_modes": ["off", "heat", "cool"], "supported_features": 1,
            "min_temp": 7, "max_temp": 35, "target_temp_step": .5})

    async def test_preview_preserves_every_ownership_ledger(self):
        context = self.manager._new_owned_context()
        self.manager._register_expected_action(ENTITY, context, {"temperature": 22})
        old, new = self.hass.states[ENTITY], self.state("off", 22)
        names = ("_contexts", "_expected", "_settling", "_settling_mismatches", "_field_generations")
        before = deepcopy(tuple(getattr(self.manager, name) for name in names))
        for _ in range(3):
            self.assertEqual(self.manager.preview_owned_state_change_fields(ENTITY, new, old), {"temperature"})
        self.assertEqual(tuple(getattr(self.manager, name) for name in names), before)
        self.assertEqual(self.manager.owned_state_change_fields(ENTITY, new, old), {"temperature"})

    async def test_live_user_change_stops_remaining_calls_before_listener(self):
        calls = []
        async def service(_domain, name, data, **kwargs):
            calls.append(name)
            await asyncio.sleep(0)
            self.hass.states[ENTITY] = self.state("heat", 26,
                SimpleNamespace(id="manual", parent_id=None, user_id="user"))
        self.hass.services.async_call = service
        async def apply():
            await self.manager.async_set_temperature(ENTITY, 22, hvac_mode="heat")
        self.assertFalse(await self.coordinator.async_deliver(ENTITY, lambda: Delivery(
            apply, is_current=lambda: not self.monitor.pending_external_fields(ENTITY))))
        self.assertEqual(calls, ["set_hvac_mode"])
        self.scheduler.async_handle_external_climate_change.assert_not_awaited()

    async def test_owned_echoes_do_not_cancel_before_listener(self):
        calls = []
        async def service(_domain, name, data, **kwargs):
            calls.append(name)
            await asyncio.sleep(0)
            self.hass.states[ENTITY] = self.state("heat", data.get("temperature", 20), kwargs.get("context"))
        self.hass.services.async_call = service
        async def apply():
            await self.manager.async_set_temperature(ENTITY, 22, hvac_mode="heat")
        self.assertTrue(await self.coordinator.async_deliver(ENTITY, lambda: Delivery(
            apply, is_current=lambda: not self.monitor.pending_external_fields(ENTITY))))
        self.assertEqual(calls, ["set_hvac_mode", "set_temperature"])
        self.scheduler.async_handle_external_climate_change.assert_not_awaited()

    async def test_token_survives_queued_processing_and_ignores_own_handler(self):
        entered, release = asyncio.Event(), asyncio.Event()
        async def process(*args, **kwargs):
            self.assertEqual(self.monitor.pending_external_fields(ENTITY), set())
            entered.set()
            await release.wait()
        self.scheduler.async_handle_external_climate_change.side_effect = process
        old = self.hass.states[ENTITY]
        new = self.state("off", 26, SimpleNamespace(id="manual", parent_id=None, user_id="user"))
        self.hass.states[ENTITY] = new
        self.monitor._handle_state_change(SimpleNamespace(data={
            "entity_id": ENTITY, "old_state": old, "new_state": new}))
        self.assertEqual(self.monitor.pending_external_fields(ENTITY), {"temperature"})
        await entered.wait()
        self.assertEqual(self.monitor.pending_external_fields(ENTITY), {"temperature"})
        tasks = list(self.monitor._tasks)
        release.set()
        await asyncio.gather(*tasks)
        self.assertEqual(self.monitor.pending_external_fields(ENTITY), set())
        self.assertEqual(self.monitor._pending_changes, {})
        self.assertEqual(self.monitor._processing_tokens, {})

    async def test_stop_removes_pending_authority(self):
        self.hass.states[ENTITY] = self.state("heat", 26,
            SimpleNamespace(id="manual", parent_id=None, user_id="user"))
        self.assertTrue(self.monitor.pending_external_fields(ENTITY))
        self.monitor.async_stop()
        self.assertEqual(self.monitor.pending_external_fields(ENTITY), set())


class PendingExternalPolicyTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.hass = FakeHass()
        self.hass.states[ENTITY] = SimpleNamespace(state="heat", attributes={"current_temperature": 18})
        self.data = normalize_schedule_data(None, [ENTITY])
        self.scheduler = VelairScheduler(self.hass, self.data, FakeClimateManager(), AsyncMock())
        self.scheduler.pending_external_change_fields = lambda entity: {"temperature"} if entity == ENTITY else set()
        self.addAsyncCleanup(self.scheduler._climate_delivery.async_stop)

    async def test_keep_automatic_does_not_withdraw_authority(self):
        self.assertFalse(self.scheduler._pending_external_change_blocks_delivery(ENTITY))
        self.data["zones"][ENTITY]["external_change_policy"]["action"] = "until_resumed"
        self.assertTrue(self.scheduler._pending_external_change_blocks_delivery(ENTITY))

    async def test_options_only_intent_does_not_claim_external_target(self):
        self.data["zones"][ENTITY]["external_change_policy"]["action"] = "until_resumed"
        event = SimpleNamespace(action="set_climate_options", temperature_only=False)
        self.assertFalse(self.scheduler._pending_external_change_blocks_delivery(ENTITY, event))

    async def test_temperature_only_ignores_only_hvac_change(self):
        self.data["zones"][ENTITY]["external_change_policy"]["action"] = "until_resumed"
        event = SimpleNamespace(action="set_temperature", temperature_only=True)
        self.scheduler.pending_external_change_fields = lambda entity: {"hvac_mode"}
        self.assertFalse(self.scheduler._pending_external_change_blocks_delivery(ENTITY, event))
        self.scheduler.pending_external_change_fields = lambda entity: {"hvac_mode", "temperature"}
        self.assertTrue(self.scheduler._pending_external_change_blocks_delivery(ENTITY, event))

    async def test_selected_controller_group_yields_for_peer_change(self):
        peer, group = "climate.peer", "group.pending"
        members = [ENTITY, peer]
        self.hass.states[peer] = self.hass.states[ENTITY]
        candidate, _ = build_group_candidate(normalize_schedule_data(None, members), members, {
            "id": group, "name": "Pending", "members": members,
            "temperature_entity_id": ENTITY, "delivery_mode": "selected", "delivery_entity_id": ENTITY,
        }, ENTITY)
        candidate["zones"][group]["external_change_policy"]["action"] = "until_resumed"
        scheduler = VelairScheduler(self.hass, candidate, FakeClimateManager(), AsyncMock())
        self.addAsyncCleanup(scheduler._climate_delivery.async_stop)
        scheduler.pending_external_change_fields = lambda entity: {"temperature"} if entity == peer else set()
        self.assertTrue(scheduler._pending_external_change_blocks_delivery(group))
