"""API reads follow the current loaded instance across readiness awaits."""
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch
from .helpers import FakeHass
from custom_components.velair import api


class ProjectionApiReadinessTest(unittest.IsolatedAsyncioTestCase):
    async def test_unload_while_waiting_rejects_response_and_subscription(self):
        for handler in (api.ws_get_schedule, api.ws_subscribe_updates):
            with self.subTest(handler=handler.__name__):
                current = [None]
                async def ready():
                    current[0] = None
                current[0] = {"scheduler": SimpleNamespace(async_ensure_projection_ready=ready)}
                connection = SimpleNamespace(send_error=Mock(), send_result=Mock(),
                    send_message=Mock(), subscriptions={})
                with patch.object(api, "_get_runtime", side_effect=lambda _: current[0]), \
                     patch.object(api, "_build_schedule_response", side_effect=AssertionError("unloaded response")):
                    await handler(FakeHass(), connection, {"id": 7})
                connection.send_error.assert_called_once_with(7, "not_loaded", "Integration is not loaded")
                connection.send_result.assert_not_called()
                connection.send_message.assert_not_called()
                self.assertEqual(connection.subscriptions, {})

    async def test_reload_while_waiting_reads_only_replacement_instance(self):
        replacement = {"scheduler": SimpleNamespace(async_ensure_projection_ready=AsyncMock())}
        current = [None]
        async def ready():
            current[0] = replacement
        previous = {"scheduler": SimpleNamespace(async_ensure_projection_ready=ready)}
        current[0] = previous
        connection = SimpleNamespace(send_error=Mock(), send_result=Mock())
        with patch.object(api, "_get_runtime", side_effect=lambda _: current[0]), \
             patch.object(api, "_build_schedule_response", return_value={"replacement": True}) as build:
            await api.ws_get_schedule(FakeHass(), connection, {"id": 8})
        replacement["scheduler"].async_ensure_projection_ready.assert_awaited_once()
        build.assert_called_once_with(replacement)
        connection.send_result.assert_called_once_with(8, {"replacement": True})
        connection.send_error.assert_not_called()
