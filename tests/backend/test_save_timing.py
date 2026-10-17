"""Opt-in save timing classification, isolation, privacy and lock semantics."""

import asyncio
import logging
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

from . import test_linked_schedule_acceptance as acceptance
from custom_components.velair import api, save_timing


class SaveTimingTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.clock = 0.0
        self.clock_patch = patch.object(save_timing, "perf_counter", side_effect=lambda: self.clock)
        self.clock_mock = self.clock_patch.start()
        self.addCleanup(self.clock_patch.stop)
        self.enabled_patch = patch.object(save_timing._LOGGER, "isEnabledFor", return_value=True)
        self.enabled_patch.start()
        self.addCleanup(self.enabled_patch.stop)
        self.log_patch = patch.object(save_timing._LOGGER, "debug")
        self.log = self.log_patch.start()
        self.addCleanup(self.log_patch.stop)

    async def test_disabled_tracing_does_not_read_clock_or_change_result(self):
        @save_timing.trace_schedule_save("daily")
        async def save():
            with save_timing.measure_save_phase("storage"):
                return 42

        with patch.object(save_timing._LOGGER, "isEnabledFor", return_value=False):
            self.assertEqual(await save(), 42)
        self.clock_mock.assert_not_called()
        self.log.assert_not_called()

    async def test_inclusive_phases_counts_and_private_payloads(self):
        @save_timing.trace_schedule_save("daily")
        async def save(payload):
            with save_timing.measure_save_phase("storage"):
                self.clock += 0.025
            with save_timing.measure_save_phase("reconcile"):
                with save_timing.measure_save_phase("reschedule"):
                    self.clock += 0.100
                self.clock += 0.300
            with save_timing.trace_save_operation("response"):
                self.clock += 0.010
            return payload

        payload = {"entity_id": "climate.private_name", "temperature": 22.34567, "weekday": "private-day"}
        self.assertIs(await save(payload), payload)
        args = self.log.call_args.args
        self.assertEqual(args[1], "daily")
        self.assertEqual(args[3], "returned")
        self.assertAlmostEqual(args[4], 435)
        self.assertEqual(args[5], {"storage": 25, "reconcile": 400, "reschedule": 100, "response": 10})
        self.assertEqual(args[6], {"storage": 1, "reconcile": 1, "reschedule": 1, "response": 1})
        text = args[0] % args[1:]
        for sensitive in ("climate.private_name", "22.34567", "private-day"):
            self.assertNotIn(sensitive, text)
        self.assertIsNone(save_timing._CURRENT_TRACE.get())

    async def test_exception_and_cancellation_propagate_without_logging_their_text(self):
        for error in (ValueError("private-error"), asyncio.CancelledError("private-cancellation")):
            with self.subTest(error=type(error).__name__):
                @save_timing.trace_schedule_save("daily")
                async def save():
                    with save_timing.measure_save_phase("storage"):
                        self.clock += 0.020
                        raise error

                with self.assertRaises(type(error)):
                    await save()
                args = self.log.call_args.args
                self.assertEqual(args[3], "raised")
                self.assertNotIn("private-", args[0] % args[1:])
                self.assertIsNone(save_timing._CURRENT_TRACE.get())

    async def test_concurrent_operations_and_late_tasks_do_not_share_timings(self):
        release = asyncio.Event()

        @save_timing.trace_schedule_save("daily")
        async def first():
            with save_timing.measure_save_phase("storage"):
                await release.wait()

        task = asyncio.create_task(first())
        await asyncio.sleep(0)
        with save_timing.trace_save_operation("response"):
            with save_timing.measure_save_phase("response_body"):
                self.clock += 0.010
        release.set()
        await task
        summaries = {call.args[1]: call.args for call in self.log.call_args_list}
        self.assertEqual(set(summaries["daily"][5]), {"storage"})
        self.assertEqual(set(summaries["response"][5]), {"response_body"})
        self.assertNotEqual(summaries["daily"][2], summaries["response"][2])

        async def late():
            await asyncio.sleep(0)
            with save_timing.measure_save_phase("late_work"):
                self.clock += 0.100

        with save_timing.trace_save_operation("daily"):
            late_task = asyncio.create_task(late())
        await late_task
        self.assertNotIn("late_work", self.log.call_args.args[5])

    async def test_timed_lock_is_released_after_error_and_cancelled_waiter(self):
        lock = asyncio.Lock()
        with self.assertRaisesRegex(ValueError, "expected"):
            async with save_timing.timed_save_lock(lock, "configuration_lock_wait"):
                self.assertTrue(lock.locked())
                raise ValueError("expected")
        self.assertFalse(lock.locked())
        await lock.acquire()

        async def waiter():
            async with save_timing.timed_save_lock(lock, "configuration_lock_wait"):
                self.fail("Cancelled waiter must not acquire the lock")

        task = asyncio.create_task(waiter())
        await asyncio.sleep(0)
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertTrue(lock.locked())
        lock.release()
        self.assertFalse(lock.locked())


class ScheduleSaveTimingIntegrationTest(unittest.IsolatedAsyncioTestCase):
    setUp = acceptance.LinkedScheduleAcceptanceTest.setUp
    save = acceptance.LinkedScheduleAcceptanceTest.save
    link = acceptance.LinkedScheduleAcceptanceTest.link
    profile = acceptance.LinkedScheduleAcceptanceTest.profile

    async def asyncTearDown(self):
        await self.scheduler._climate_delivery.async_stop()

    async def test_real_handler_classifies_storage_reconcile_and_response(self):
        clock = [0.0]

        async def storage():
            clock[0] += 0.200
            await self.save()

        async def reconcile(*_args, **_kwargs):
            clock[0] += 0.400

        @save_timing.trace_save_operation("response")
        def response(_runtime):
            clock[0] += 0.100
            return {"saved": True}

        self.scheduler._async_save_data = storage
        self.scheduler._async_finalize_schedule_mutation = reconcile
        runtime = {"scheduler": self.scheduler, "storage": SimpleNamespace(temperature_migration_required=False)}
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        with (
            patch.object(save_timing, "perf_counter", side_effect=lambda: clock[0]),
            patch.object(save_timing._LOGGER, "isEnabledFor", return_value=True),
            patch.object(save_timing._LOGGER, "debug") as log,
            patch.object(api, "_get_runtime", return_value=runtime),
            patch.object(api, "_build_schedule_response", side_effect=response),
        ):
            await api.ws_set_daily_schedule(None, connection, {
                "id": 1, "entity_id": "climate.salon", "weekday": "monday",
                "blocks": [{"start": "07:00", "temperature": 24, "hvac_mode": "cool"}],
                "expected_revision": 0,
            })
        connection.send_error.assert_not_called()
        connection.send_result.assert_called_once_with(1, {"saved": True})
        args = log.call_args.args
        self.assertAlmostEqual(args[4], 700)
        self.assertEqual(args[5]["storage"], 200)
        self.assertEqual(args[5]["reconcile"], 400)
        self.assertEqual(args[5]["response"], 100)
        self.assertEqual(args[5]["configuration_lock_wait"], 0)
        self.assertEqual(args[5]["zone_lock_wait"], 0)
        self.assertGreaterEqual(args[6]["validation"], 2)
        self.assertIn("reschedule", args[6])

    async def test_response_builds_outside_saves_can_be_traced_independently(self):
        # Subscription callbacks can run after the request context has finished.
        with self.assertLogs(save_timing._LOGGER, level=logging.DEBUG) as captured:
            with save_timing.trace_save_operation("response"):
                pass
        self.assertIn("operation=response", captured.output[0])
        self.assertNotIn("climate.", captured.output[0])
