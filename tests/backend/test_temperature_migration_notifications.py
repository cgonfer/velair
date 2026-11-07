"""Migration notification coalescing preserves transitions, retries and unload."""
from __future__ import annotations

import asyncio
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from . import helpers
from custom_components.velair import temperature_migration as notices
from . import test_unload as unload_tests


class MigrationNotificationTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tasks = []
        self.service = AsyncMock()
        self.hass = SimpleNamespace(
            services=SimpleNamespace(async_call=self.service),
            async_create_task=self.spawn,
        )
        self.controller = notices.TemperatureMigrationNotifications(self.hass, "entry")
        self.addAsyncCleanup(self.controller.async_stop)

    def spawn(self, coro):
        task = asyncio.create_task(coro)
        self.tasks.append(task)
        return task

    async def settle(self):
        for _ in range(4):
            await asyncio.sleep(0)

    async def test_identical_burst_has_one_worker_and_one_notification(self):
        for _ in range(20):
            self.controller.request(True, "home_assistant_unit_changed")
        self.assertEqual(len(self.tasks), 1)
        await self.controller.async_wait()
        self.service.assert_awaited_once()
        for _ in range(20):
            self.controller.request(True, "home_assistant_unit_changed")
        self.assertEqual(len(self.tasks), 1)
        self.assertIsNone(self.controller._task)

    async def test_initial_unblocked_state_does_not_create_work(self):
        self.controller.request(False)
        await self.controller.async_wait()
        self.assertEqual(self.tasks, [])
        self.service.assert_not_awaited()

    async def test_changed_reason_during_io_is_delivered_after_current_request(self):
        started, release = asyncio.Event(), asyncio.Event()
        async def call(*args, **kwargs):
            if self.service.await_count == 1:
                started.set()
                await release.wait()
        self.service.side_effect = call
        self.controller.request(True, "home_assistant_unit_changed")
        await started.wait()
        for _ in range(20):
            self.controller.request(True, "legacy_celsius_upgrade_reset_required")
        self.assertEqual(len(self.tasks), 1)
        release.set()
        await self.controller.async_wait()
        self.assertEqual(self.service.await_count, 2)
        self.assertEqual(self.service.call_args.args[2]["title"], "Velair reset required")

    async def test_unblock_waits_for_create_then_dismisses(self):
        started, release = asyncio.Event(), asyncio.Event()
        async def call(_domain, service, *args, **kwargs):
            if service == "create":
                started.set()
                await release.wait()
        self.service.side_effect = call
        self.controller.request(True)
        await started.wait()
        self.controller.request(False)
        release.set()
        await self.controller.async_wait()
        self.assertEqual([call.args[1] for call in self.service.call_args_list], ["create", "dismiss"])
        self.assertEqual(len(self.tasks), 1)

    async def test_rapid_reblock_keeps_latest_notification(self):
        started, release = asyncio.Event(), asyncio.Event()
        async def call(*args, **kwargs):
            if self.service.await_count == 1:
                started.set()
                await release.wait()
        self.service.side_effect = call
        self.controller.request(True, "home_assistant_unit_changed")
        await started.wait()
        self.controller.request(False)
        self.controller.request(True, "legacy_celsius_upgrade_reset_required")
        release.set()
        await self.controller.async_wait()
        self.assertEqual([call.args[1] for call in self.service.call_args_list], ["create", "create"])
        self.assertEqual(self.service.call_args.args[2]["title"], "Velair reset required")

    async def test_failed_create_retries_on_next_report_without_spinning(self):
        self.service.side_effect = [RuntimeError("offline"), None]
        with self.assertLogs(notices.__name__, level="ERROR"):
            self.controller.request(True)
            await self.controller.async_wait()
        await self.settle()
        self.assertEqual(self.service.await_count, 1)
        self.assertIsNone(self.controller._task)
        self.controller.request(True)
        await self.controller.async_wait()
        self.assertEqual(self.service.await_count, 2)
        self.controller.request(True)
        self.assertEqual(len(self.tasks), 2)

    async def test_failed_dismiss_retries_on_next_report(self):
        self.controller.request(True)
        await self.controller.async_wait()
        self.service.side_effect = [RuntimeError("offline"), None]
        with self.assertLogs(notices.__name__, level="ERROR"):
            self.controller.request(False)
            await self.controller.async_wait()
        self.assertEqual(self.service.await_count, 2)
        self.controller.request(False)
        await self.controller.async_wait()
        self.assertEqual(self.service.await_count, 3)

    async def test_failed_create_still_allows_unblock_cleanup(self):
        self.service.side_effect = [RuntimeError("offline"), None]
        with self.assertLogs(notices.__name__, level="ERROR"):
            self.controller.request(True)
            await self.controller.async_wait()
        self.controller.request(False)
        await self.controller.async_wait()
        self.assertEqual([call.args[1] for call in self.service.call_args_list], ["create", "dismiss"])

    async def test_stop_cancels_worker_and_rejects_late_reports(self):
        started = asyncio.Event()
        async def call(*args, **kwargs):
            started.set()
            await asyncio.Event().wait()
        self.service.side_effect = call
        self.controller.request(True)
        await started.wait()
        await self.controller.async_stop()
        self.assertIsNone(self.controller._task)
        self.assertFalse(self.controller._running)
        self.assertTrue(all(task.done() for task in self.tasks))
        self.controller.request(True, "new reason")
        self.assertEqual(len(self.tasks), 1)

    async def test_eager_reentrant_report_cannot_start_another_worker(self):
        old_factory = asyncio.get_running_loop().get_task_factory()
        asyncio.get_running_loop().set_task_factory(asyncio.eager_task_factory)
        self.addCleanup(asyncio.get_running_loop().set_task_factory, old_factory)
        self.service.side_effect = lambda *args, **kwargs: self.controller.request(True)
        self.controller.request(True)
        await self.controller.async_wait()
        self.assertEqual(len(self.tasks), 1)
        self.service.assert_awaited_once()
        self.assertFalse(self.controller._running)


class BootstrapNotificationTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.integration = unload_tests._load_integration_init()
        self.tasks, self.callbacks, self.unloads = [], [], []
        self.storage = SimpleNamespace(
            data={"zones": {}}, temperature_migration_required=True,
            temperature_migration_status=lambda: {"reason": "home_assistant_unit_changed"},
            async_load=AsyncMock(return_value={"zones": {}}), async_save=AsyncMock(),
        )
        self.scheduler = SimpleNamespace(
            set_temperature_migration_blocked=lambda value: setattr(self.scheduler, "temperature_migration_blocked", value),
            temperature_migration_blocked=True, handle_schedule_timezone_change=Mock(),
            async_capture_reported_target_temp_steps=AsyncMock(), async_start=AsyncMock(),
        )
        diagnostics = SimpleNamespace(
            async_load_policy=AsyncMock(), observe_delivery=Mock(), observe_target_applied=Mock(),
            async_start=Mock(), async_stop=Mock(), async_finish_startup=Mock(),
        )
        shared = SimpleNamespace(request_refresh=Mock(), async_start=AsyncMock())
        monitor = SimpleNamespace(async_start=Mock(), async_stop=Mock())
        self.hass = SimpleNamespace(
            data={}, services=SimpleNamespace(async_call=AsyncMock()), async_create_task=self.spawn,
            bus=SimpleNamespace(async_listen=lambda *_args: lambda: None),
            config_entries=SimpleNamespace(async_forward_entry_setups=AsyncMock()),
        )
        self.entry = SimpleNamespace(entry_id="entry", async_on_unload=self.unloads.append)
        replacements = {
            "VelairStorage": Mock(return_value=self.storage),
            "ClimateManager": Mock(return_value=SimpleNamespace(temperature_unit=Mock())),
            "ExternalExecutionManager": Mock(), "build_provider_registry": Mock(),
            "RuntimeDiagnosticsManager": Mock(return_value=diagnostics),
            "ClimateDeliveryCoordinator": Mock(), "VelairScheduler": Mock(return_value=self.scheduler),
            "ClimateChangeMonitor": Mock(return_value=monitor),
            "SharedDemandController": Mock(return_value=shared),
            "TemperatureMigrationNotifications": notices.TemperatureMigrationNotifications,
            "get_configured_climate_entities": lambda _entry: ["climate.synthetic"],
            "async_setup_api": Mock(), "cleanup_entity_registry": Mock(),
            "async_track_state_change_event": self.track,
        }
        for name, value in replacements.items():
            self.enterContext(patch.object(self.integration, name, value))
        self.assertTrue(await self.integration.async_setup_entry(self.hass, self.entry))
        self.controller = self.entry.runtime_data.temperature_notifications
        self.addAsyncCleanup(self.controller.async_stop)

    def spawn(self, coro):
        task = asyncio.create_task(coro)
        self.tasks.append(task)
        return task

    def track(self, _hass, _entities, callback):
        self.callbacks.append(callback)
        return lambda: None

    def report(self):
        self.callbacks[0](SimpleNamespace(event_type="state_changed", data={"entity_id": "climate.synthetic"}))

    async def drain(self):
        await asyncio.gather(*self.tasks)

    async def test_real_bootstrap_listener_coalesces_repeated_blocked_reports(self):
        for _ in range(20):
            self.report()
        await self.drain()
        self.assertEqual(len(self.tasks), 21)
        self.assertEqual(self.hass.services.async_call.await_count, 1)
        self.assertEqual(self.scheduler.async_capture_reported_target_temp_steps.await_count, 21)
        self.scheduler.async_start.assert_not_awaited()

    async def test_unblock_dismiss_failure_still_resumes_scheduler(self):
        self.hass.services.async_call.side_effect = RuntimeError("notification offline")
        self.storage.temperature_migration_required = False
        with self.assertLogs(notices.__name__, level="ERROR"):
            self.report()
            await self.drain()
        self.scheduler.async_start.assert_awaited_once()
        self.assertFalse(self.scheduler.temperature_migration_blocked)

    async def test_late_callback_after_owned_stop_does_not_spawn_work(self):
        await self.controller.async_stop()
        tasks = len(self.tasks)
        self.report()
        self.assertEqual(len(self.tasks), tasks)

    async def test_reblock_during_dismiss_does_not_resume_stale_scheduler(self):
        started, release = asyncio.Event(), asyncio.Event()
        async def call(_domain, service, *args, **kwargs):
            if service == "dismiss":
                started.set()
                await release.wait()
        self.hass.services.async_call.side_effect = call
        self.storage.temperature_migration_required = False
        self.report()
        await started.wait()
        self.storage.temperature_migration_required = True
        self.storage.temperature_migration_status = lambda: {"reason": "legacy_celsius_upgrade_reset_required"}
        self.report()
        release.set()
        await self.drain()
        self.scheduler.async_start.assert_not_awaited()
        self.assertTrue(self.scheduler.temperature_migration_blocked)
        self.assertEqual([call.args[1] for call in self.hass.services.async_call.call_args_list], ["create", "dismiss", "create"])
        self.assertEqual(self.hass.services.async_call.call_args.args[2]["title"], "Velair reset required")


if __name__ == "__main__":
    unittest.main()
