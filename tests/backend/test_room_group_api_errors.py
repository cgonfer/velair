"""Room-group WebSocket failures retain actionable errors and commit semantics."""

from copy import deepcopy
from types import MappingProxyType, SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from .helpers import FakeHass, normalize_schedule_data, VelairScheduler
from custom_components.velair import api
from custom_components.velair.climate_manager import ClimateManager


GROUP = {"id": "group.room", "name": "Room", "members": ["climate.a", "climate.b"],
         "temperature_entity_id": "climate.a", "delivery_mode": "all"}


class RoomGroupApiErrorsTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.hass = FakeHass()
        self.hass.config.units = SimpleNamespace(temperature_unit="°C")
        for member in GROUP["members"]:
            self.hass.states[member] = SimpleNamespace(state="heat", attributes=MappingProxyType({
                "hvac_modes": ["off", "heat", "cool"], "supported_features": 1,
                "current_temperature": 19.0, "temperature": 20.0,
                "min_temp": 5.0, "max_temp": 35.0, "target_temp_step": .5}))
        self.data = normalize_schedule_data(None, GROUP["members"])
        self.save = AsyncMock()
        self.physical = ClimateManager(self.hass)
        self.scheduler = VelairScheduler(self.hass, self.data, self.physical, self.save)
        self.runtime = {"scheduler": self.scheduler,
                        "climate_manager": self.physical,
                        "storage": SimpleNamespace(data=self.data, temperature_migration_required=False,
                                                   _climate_entities=GROUP["members"]),
                        "entry": SimpleNamespace(options={}, data={})}
        self.connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        self.runtime_patch = patch.object(api, "_get_runtime", return_value=self.runtime)
        self.runtime_patch.start()
        self.addCleanup(self.runtime_patch.stop)

    async def asyncTearDown(self):
        await self.scheduler.async_stop()

    def message(self):
        return {"id": 7, "group": deepcopy(GROUP), "expected_revision": 0,
                "source_entity_id": "climate.a"}

    def assert_error(self, code, *fragments):
        self.connection.send_result.assert_not_called()
        self.connection.send_error.assert_called_once()
        message_id, actual_code, message = self.connection.send_error.call_args.args
        self.assertEqual(message_id, 7)
        self.assertEqual(actual_code, code)
        for fragment in fragments:
            self.assertIn(fragment, message)
        self.assertNotIn("Traceback", message)

    async def create_group(self):
        await self.scheduler.async_set_room_group(GROUP, 0, "climate.a")
        return {"id": 7, "group_id": GROUP["id"],
                "expected_revision": self.data["configuration_revision"]}

    async def test_preview_and_save_accept_immutable_home_assistant_attributes(self):
        await api.ws_preview_room_group(self.hass, self.connection, self.message())
        self.connection.send_error.assert_not_called()
        self.connection.send_result.assert_called_once()
        self.assertEqual(self.data["room_groups"], {})
        self.save.assert_not_awaited()
        self.connection.send_result.reset_mock()
        await api.ws_set_room_group(self.hass, self.connection, self.message())
        self.connection.send_error.assert_not_called()
        response = self.connection.send_result.call_args.args[1]
        self.assertEqual(response["room_groups"][GROUP["id"]], GROUP)
        self.assertIn(GROUP["id"], response["control_unit_states"])
        self.save.assert_awaited_once()

    async def test_unexpected_preview_error_is_logged_with_reason_without_mutation(self):
        with patch.object(self.scheduler, "_validate_group_candidate", side_effect=TypeError("read-only attributes")):
            with self.assertLogs(api._LOGGER.name, level="ERROR") as logs:
                await api.ws_preview_room_group(self.hass, self.connection, self.message())
        self.assert_error("room_group_preview_failed", "preview", "read-only attributes")
        self.assertTrue(logs.records[0].exc_info)
        self.save.assert_not_awaited()

    async def test_preview_blank_exception_still_identifies_the_failure(self):
        with patch.object(self.scheduler, "preview_room_group", side_effect=RuntimeError()):
            with self.assertLogs(api._LOGGER.name, level="ERROR"):
                await api.ws_preview_room_group(self.hass, self.connection, self.message())
        self.assert_error("room_group_preview_failed", "Reason: RuntimeError")

    async def test_save_storage_failure_is_actionable_and_rolls_back(self):
        previous = deepcopy(self.data)
        self.save.side_effect = OSError("disk unavailable")
        with self.assertLogs(api._LOGGER.name, level="ERROR"):
            await api.ws_set_room_group(self.hass, self.connection, self.message())
        self.assert_error("room_group_save_failed", "disk unavailable", "Reload the panel")
        self.assertEqual(self.data, previous)

    async def test_dissolve_storage_failure_is_actionable_and_rolls_back(self):
        message = await self.create_group()
        previous = deepcopy(self.data)
        self.save.side_effect = OSError("disk unavailable")
        with self.assertLogs(api._LOGGER.name, level="ERROR"):
            await api.ws_remove_room_group(self.hass, self.connection, message)
        self.assert_error("room_group_remove_failed", "dissolving", "disk unavailable")
        self.assertEqual(self.data, previous)

    async def test_save_response_failure_reports_that_configuration_was_saved(self):
        with patch.object(api, "_build_schedule_response", side_effect=ValueError("state unavailable")):
            with self.assertLogs(api._LOGGER.name, level="ERROR"):
                await api.ws_set_room_group(self.hass, self.connection, self.message())
        self.assert_error("room_group_response_failed", "was saved", "state unavailable", "Reload the panel")
        self.assertEqual(self.data["room_groups"][GROUP["id"]], GROUP)
        self.save.assert_awaited_once()

    async def test_dissolve_response_failure_reports_that_group_was_dissolved(self):
        message = await self.create_group()
        with patch.object(api, "_build_schedule_response", side_effect=RuntimeError("state unavailable")):
            with self.assertLogs(api._LOGGER.name, level="ERROR"):
                await api.ws_remove_room_group(self.hass, self.connection, message)
        self.assert_error("room_group_response_failed", "was dissolved", "state unavailable")
        self.assertEqual(self.data["room_groups"], {})
        self.assertEqual(self.save.await_count, 2)

    async def test_postcommit_runtime_failure_does_not_claim_save_was_rolled_back(self):
        with patch.object(self.scheduler, "_async_write_state", side_effect=RuntimeError("state publication failed")):
            with self.assertLogs(api._LOGGER.name, level="ERROR"):
                await api.ws_set_room_group(self.hass, self.connection, self.message())
        self.assert_error("room_group_save_failed", "Could not complete", "state publication failed", "Reload the panel")
        self.assertEqual(self.data["room_groups"][GROUP["id"]], GROUP)
        self.save.assert_awaited_once()

    async def test_real_validation_rejections_keep_their_reason(self):
        message = self.message()
        message["group"]["members"] = ["climate.a", "climate.unmanaged"]
        for handler in (api.ws_preview_room_group, api.ws_set_room_group):
            with self.subTest(handler=handler.__name__):
                self.connection.send_error.reset_mock()
                await handler(self.hass, self.connection, message)
                self.assert_error("invalid_configuration", "configured climate entities")
        self.save.assert_not_awaited()

    async def test_stale_revisions_remain_typed_for_all_group_operations(self):
        for handler, message in (
            (api.ws_preview_room_group, {**self.message(), "expected_revision": 5}),
            (api.ws_set_room_group, {**self.message(), "expected_revision": 5}),
            (api.ws_remove_room_group, {"id": 7, "group_id": GROUP["id"], "expected_revision": 5}),
        ):
            with self.subTest(handler=handler.__name__):
                self.connection.send_error.reset_mock()
                await handler(self.hass, self.connection, message)
                self.assert_error("revision_conflict", "Configuration changed")
        self.save.assert_not_awaited()
