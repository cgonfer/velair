"""Supply edits publish durable configuration to real scheduler/API readers."""
import asyncio
from copy import deepcopy
from types import SimpleNamespace
import sys
import unittest
from unittest.mock import AsyncMock, Mock, patch

from .helpers import FakeHass, VelairScheduler
from .test_shared_demand_contracts import supply_group
from custom_components.velair import api, shared_demand
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.models import normalize_schedule_data


class SharedDemandPublicationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.hass = FakeHass()
        self.hass.states["switch.boiler"] = SimpleNamespace(state="off", attributes={})
        self.data = normalize_schedule_data({}, ["climate.room"])
        self.data["settings"]["shared_demand_groups"] = [supply_group()]
        self.save = AsyncMock()
        self.scheduler = VelairScheduler(self.hass, self.data, ClimateManager(self.hass), self.save)
        self.controller = shared_demand.SharedDemandController(self.hass, self.data, self.save, self.scheduler)
        self.runtime = {
            "scheduler": self.scheduler, "shared_demand": self.controller,
            "storage": SimpleNamespace(data=self.data, _climate_entities=["climate.room"],
                                       temperature_migration_required=False),
            "entry": SimpleNamespace(options={}, data={}),
        }
        self.connection = Mock(user=SimpleNamespace(is_admin=True))
        registry = SimpleNamespace(async_get=lambda _: SimpleNamespace(platform="test"))
        self.patches = [patch.object(api, "_get_runtime", return_value=self.runtime),
                        patch.object(sys.modules["homeassistant.helpers"], "entity_registry",
                                     SimpleNamespace(async_get=lambda _: registry), create=True)]
        for item in self.patches:
            item.start()

    async def asyncTearDown(self):
        await self.controller.async_stop()
        await self.scheduler.async_stop()
        for item in reversed(self.patches):
            item.stop()

    def response(self):
        return api._build_schedule_response(self.runtime)

    async def test_disable_then_save_again_uses_committed_state_and_revision_for_heat_and_cool(self):
        for direction in ("heat", "cool"):
            with self.subTest(direction=direction):
                groups = deepcopy(self.data["settings"]["shared_demand_groups"])
                groups[0].update(enabled=True, direction=direction)
                self.data["settings"]["shared_demand_groups"] = deepcopy(groups)
                self.scheduler._prepare_runtime_projection(configuration=True)
                self.connection.reset_mock()
                revision = self.response()["configuration_revision"]
                groups[0]["enabled"] = False
                # Capture the broadcast at the producer boundary, before any later refresh.
                broadcasts = []
                with patch.object(shared_demand, "async_dispatcher_send",
                                  side_effect=lambda *_: broadcasts.append(self.response())):
                    await api.ws_update_shared_demand(self.hass, self.connection,
                        {"id": 1, "groups": groups, "expected_revision": revision})
                self.connection.send_error.assert_not_called()
                saved = self.connection.send_result.call_args.args[1]
                self.assertFalse(saved["settings"]["shared_demand_groups"][0]["enabled"])
                self.assertEqual(saved["configuration_revision"], revision + 1)
                self.assertEqual(broadcasts[-1]["configuration_revision"], revision + 1)
                self.assertFalse(broadcasts[-1]["settings"]["shared_demand_groups"][0]["enabled"])
                groups[0]["name"] = "Disabled supply"
                await api.ws_update_shared_demand(self.hass, self.connection,
                    {"id": 2, "groups": groups, "expected_revision": saved["configuration_revision"]})
                self.connection.send_error.assert_not_called()
                self.assertEqual(self.response()["settings"]["shared_demand_groups"][0]["name"], "Disabled supply")

    async def test_manual_suspension_and_resume_publish_new_revision(self):
        self.controller._groups = {"boiler": deepcopy(supply_group())}
        self.controller._pending_suspensions.add("boiler")
        revision = self.response()["configuration_revision"]
        await self.controller._persist_suspensions()
        suspended = self.response()
        self.assertTrue(suspended["settings"]["shared_demand_groups"][0]["suspended"])
        self.assertEqual(suspended["configuration_revision"], revision + 1)
        await api.ws_resume_shared_demand(self.hass, self.connection,
            {"id": 1, "group_id": "boiler", "expected_revision": suspended["configuration_revision"]})
        self.connection.send_error.assert_not_called()
        resumed = self.connection.send_result.call_args.args[1]
        self.assertFalse(resumed["settings"]["shared_demand_groups"][0]["suspended"])
        self.assertEqual(resumed["configuration_revision"], revision + 2)

    async def test_pending_failed_or_cancelled_save_never_publishes_proposed_configuration(self):
        for failure in (OSError("storage unavailable"), asyncio.CancelledError()):
            with self.subTest(failure=type(failure).__name__):
                before = self.response()
                entered, release = asyncio.Event(), asyncio.Event()

                async def blocked_save():
                    entered.set()
                    await release.wait()
                    raise failure

                self.save.side_effect = blocked_save
                groups = deepcopy(self.data["settings"]["shared_demand_groups"])
                groups[0]["enabled"] = False
                task = asyncio.create_task(self.controller.async_update_groups(groups))
                await entered.wait()
                try:
                    # A concurrent observation must not promote a not-yet-durable edit.
                    self.scheduler._prepare_runtime_projection(configuration=True)
                    pending = self.response()
                    self.assertEqual(pending["settings"], before["settings"])
                    self.assertEqual(pending["configuration_revision"], before["configuration_revision"])
                finally:
                    release.set()
                    with self.assertRaises(type(failure)):
                        await task
                self.scheduler._prepare_runtime_projection(configuration=True)
                self.assertEqual(self.response()["settings"], before["settings"])
                self.assertEqual(self.response()["configuration_revision"], before["configuration_revision"])

    async def test_cancelled_cleanup_keeps_uncommitted_removal_out_of_publication(self):
        self.data["settings"]["shared_demand_cleanup"] = ["switch.retired"]
        self.scheduler._prepare_runtime_projection(configuration=True)
        self.controller._cleanup_confirmed.add("switch.retired")
        self.save.side_effect = asyncio.CancelledError()
        with self.assertRaises(asyncio.CancelledError):
            await self.controller._persist_completed_cleanup()
        self.assertEqual(self.data["settings"]["shared_demand_cleanup"], ["switch.retired"])
        self.scheduler._prepare_runtime_projection(configuration=True)
        published = self.scheduler.get_published_configuration()
        self.assertEqual(published["settings"]["shared_demand_cleanup"], ["switch.retired"])
        self.assertIn("switch.retired", self.controller._cleanup_confirmed)

