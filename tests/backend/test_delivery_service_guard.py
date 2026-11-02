"""Physical service sequences stop when their current authority is withdrawn."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
import unittest

from . import helpers  # noqa: F401
from custom_components.velair.climate_delivery import ClimateDeliveryCoordinator, Delivery
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.group_climate_manager import GroupClimateManager
from custom_components.velair.delivery_guard import DeliverySuperseded, check_delivery, delivery_guard


class DeliveryServiceGuardTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.entity = "climate.room"
        self.calls = []
        self.after_service = lambda: None
        self.hass = SimpleNamespace(
            states={self.entity: SimpleNamespace(state="off", attributes={
                "hvac_modes": ["off", "heat", "cool"],
                "supported_features": 1,
                "min_temp": 7, "max_temp": 35, "target_temp_step": 0.5,
                "temperature": 20, "current_temperature": 18,
            })},
            async_create_task=asyncio.create_task,
        )

        async def call(domain, service, data, *, blocking=False, context=None):
            self.calls.append((service, dict(data)))
            await asyncio.sleep(0)
            self.after_service()

        self.hass.services = SimpleNamespace(async_call=call)
        self.manager = ClimateManager(self.hass)
        self.coordinator = ClimateDeliveryCoordinator(self.hass)
        self.addAsyncCleanup(self.coordinator.async_stop)

    async def apply(self):
        await self.manager.async_set_temperature(self.entity, 22, hvac_mode="heat")

    async def test_replaced_during_mode_call_never_sends_remaining_target(self):
        commits = []

        async def commit(is_current):
            commits.append(is_current())

        self.after_service = lambda: self.coordinator.cancel(self.entity)
        delivered = await self.coordinator.async_deliver(
            self.entity, lambda: Delivery(self.apply, commit)
        )
        self.assertFalse(delivered)
        self.assertEqual([service for service, _ in self.calls], ["set_hvac_mode"])
        self.assertEqual(commits, [])
        self.assertFalse(self.coordinator.is_deferred(self.entity))

    async def test_changed_live_authority_stops_sequence_without_listener(self):
        authority = [True]
        self.after_service = lambda: authority.__setitem__(0, False)
        delivered = await self.coordinator.async_deliver(
            self.entity, lambda: Delivery(self.apply, is_current=lambda: authority[0])
        )
        self.assertFalse(delivered)
        self.assertEqual([service for service, _ in self.calls], ["set_hvac_mode"])
        self.assertFalse(self.coordinator.is_deferred(self.entity))

    async def test_unavailable_after_first_call_remains_recoverable(self):
        self.after_service = lambda: setattr(self.hass.states[self.entity], "state", "unavailable")
        delivered = await self.coordinator.async_deliver(
            self.entity, lambda: Delivery(self.apply)
        )
        self.assertFalse(delivered)
        self.assertEqual([service for service, _ in self.calls], ["set_hvac_mode"])
        self.assertTrue(self.coordinator.is_deferred(self.entity))

    async def test_new_intent_after_cancel_can_complete(self):
        self.after_service = lambda: self.coordinator.cancel(self.entity)
        await self.coordinator.async_deliver(self.entity, lambda: Delivery(self.apply))
        self.after_service = lambda: None
        self.calls.clear()
        self.assertTrue(await self.coordinator.async_deliver(self.entity, lambda: Delivery(self.apply)))
        self.assertEqual([service for service, _ in self.calls], ["set_hvac_mode", "set_temperature"])

    async def test_guard_does_not_leak_to_ha_tasks_or_after_scope(self):
        with delivery_guard(lambda: False):
            with self.assertRaises(DeliverySuperseded):
                check_delivery()
            await asyncio.create_task(self.manager._async_call(
                "set_temperature", {"entity_id": self.entity, "temperature": 21}
            ))
        check_delivery()
        await self.manager._async_call("set_temperature", {
            "entity_id": self.entity, "temperature": 22,
        })
        self.assertEqual([data["temperature"] for _, data in self.calls], [21, 22])

    async def test_nested_guard_cannot_reauthorize_cancelled_outer_sequence(self):
        with delivery_guard(lambda: False):
            with delivery_guard(lambda: True):
                with self.assertRaises(DeliverySuperseded):
                    check_delivery()
        check_delivery()

    async def test_unavailable_after_final_accepted_call_preserves_acceptance_and_recovery(self):
        commits = []

        def unavailable_after_target():
            if self.calls[-1][0] == "set_temperature":
                self.hass.states[self.entity].state = "unavailable"

        async def commit(is_current):
            commits.append(is_current())

        self.after_service = unavailable_after_target
        self.assertTrue(await self.coordinator.async_deliver(
            self.entity, lambda: Delivery(self.apply, commit)
        ))
        self.assertEqual(commits, [True])
        self.assertTrue(self.coordinator.is_deferred(self.entity))

    async def test_group_cancel_stops_members_without_converting_to_failure_retry(self):
        from copy import deepcopy
        peer = "climate.peer"
        group = "velair_group.room"
        self.hass.states[peer] = deepcopy(self.hass.states[self.entity])
        self.hass.config = SimpleNamespace(units=SimpleNamespace(temperature_unit="°C"))
        data = {"room_groups": {group: {
            "name": "Room", "members": [self.entity, peer], "delivery_mode": "all",
            "temperature_entity_id": self.entity,
        }}}
        manager = GroupClimateManager(self.hass, data, self.manager)
        self.coordinator._state_provider = manager.state
        self.coordinator._entity_provider = manager.members

        async def apply_group():
            await manager.async_set_temperature(group, 22, hvac_mode="heat")

        self.after_service = lambda: self.coordinator.cancel(group)
        self.assertFalse(await self.coordinator.async_deliver(group, lambda: Delivery(apply_group)))
        self.assertEqual([service for service, _ in self.calls], ["set_hvac_mode"])
        self.assertFalse(self.coordinator.is_deferred(group))

    async def test_context_fallback_rechecks_after_suspended_type_error(self):
        authority = [True]
        attempts = []

        async def call(_domain, _service, _data, **kwargs):
            attempts.append(kwargs)
            await asyncio.sleep(0)
            authority[0] = False
            raise TypeError("unexpected keyword argument 'context'")

        self.hass.services.async_call = call
        with delivery_guard(lambda: authority[0]):
            with self.assertRaises(DeliverySuperseded):
                await self.manager._async_call("set_temperature", {
                    "entity_id": self.entity, "temperature": 22,
                })
        self.assertEqual(len(attempts), 1)
        self.assertIn("context", attempts[0])

    async def test_group_mode_and_restore_cancel_without_remaining_member_calls(self):
        from copy import deepcopy
        for action in ("mode", "restore"):
            with self.subTest(action=action):
                peer = "climate.peer"
                group = "velair_group.room"
                self.hass.states[peer] = deepcopy(self.hass.states[self.entity])
                self.hass.config = SimpleNamespace(units=SimpleNamespace(temperature_unit="°C"))
                data = {"room_groups": {group: {
                    "name": "Room", "members": [self.entity, peer], "delivery_mode": "all",
                    "temperature_entity_id": self.entity,
                }}}
                manager = GroupClimateManager(self.hass, data, self.manager)
                self.coordinator._state_provider = manager.state
                self.coordinator._entity_provider = manager.members
                self.calls.clear()

                async def apply_group():
                    if action == "mode":
                        await manager.async_set_hvac_mode(group, "heat")
                    else:
                        await manager.async_restore_state(group, {
                            "group_members": {
                                member: {"temperature": 22, "hvac_mode": "heat"}
                                for member in (self.entity, peer)
                            }
                        })

                self.after_service = lambda: self.coordinator.cancel(group)
                self.assertFalse(await self.coordinator.async_deliver(group, lambda: Delivery(apply_group)))
                self.assertEqual(len(self.calls), 1)
                self.assertEqual(self.calls[0][1]["entity_id"], self.entity)
                self.assertFalse(self.coordinator.is_deferred(group))

    async def test_group_rechecks_each_physical_member_after_await(self):
        from copy import deepcopy
        from unittest.mock import patch
        peer = "climate.peer"
        group = "velair_group.room"
        self.hass.states[peer] = deepcopy(self.hass.states[self.entity])
        self.hass.config = SimpleNamespace(units=SimpleNamespace(temperature_unit="°C"))
        data = {"room_groups": {group: {
            "name": "Room", "members": [self.entity, peer], "delivery_mode": "all",
            "temperature_entity_id": self.entity,
        }}}
        manager = GroupClimateManager(self.hass, data, self.manager)
        self.coordinator._state_provider = manager.state
        self.coordinator._entity_provider = manager.members

        def unavailable_after_mode():
            if self.calls[-1][1]["entity_id"] == self.entity:
                self.hass.states[self.entity].state = "unavailable"

        async def apply_group():
            await manager.async_set_temperature(group, 22, hvac_mode="heat")

        self.after_service = unavailable_after_mode
        with patch("custom_components.velair.climate_delivery.RETRY_DELAYS", ()):
            self.assertFalse(await self.coordinator.async_deliver(group, lambda: Delivery(apply_group)))
            await asyncio.sleep(0)
        own = [service for service, data in self.calls if data["entity_id"] == self.entity]
        self.assertEqual(own, ["set_hvac_mode"])
        self.assertTrue(any(data["entity_id"] == peer for _, data in self.calls))
        self.assertTrue(self.coordinator.is_deferred(group))

    async def test_context_fallback_rechecks_physical_availability(self):
        attempts = []

        async def call(_domain, _service, _data, **kwargs):
            attempts.append(kwargs)
            await asyncio.sleep(0)
            self.hass.states[self.entity].state = "unavailable"
            raise TypeError("unexpected keyword argument 'context'")

        self.hass.services.async_call = call
        with delivery_guard(lambda: True):
            with self.assertRaisesRegex(RuntimeError, "Climate is unavailable"):
                await self.manager._async_call("set_temperature", {
                    "entity_id": self.entity, "temperature": 22,
                })
        self.assertEqual(len(attempts), 1)
