"""Save completion boundaries and authoritative validation without UI preflights."""

import asyncio
from copy import deepcopy
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock

from . import test_linked_schedule_acceptance as acceptance
from custom_components.velair.execution import ExecutionAuthority
from custom_components.velair.schedule_resources import ConfigurationResourceError


class ScheduleSaveCompletionTest(unittest.IsolatedAsyncioTestCase):
    setUp = acceptance.LinkedScheduleAcceptanceTest.setUp
    save = acceptance.LinkedScheduleAcceptanceTest.save
    link = acceptance.LinkedScheduleAcceptanceTest.link
    profile = acceptance.LinkedScheduleAcceptanceTest.profile

    async def asyncTearDown(self):
        await self.scheduler._climate_delivery.async_stop()

    def independent_days(self):
        zone = self.data["zones"]["climate.salon"]
        zone["template_links"] = {}
        zone["schedule"]["tuesday"] = [
            {"start": "07:00", "temperature": 20, "hvac_mode": "heat"}
        ]

    async def test_save_waits_for_storage_then_active_climate_and_queues_other_mutations(self):
        self.independent_days()
        self.data["zones"]["climate.other"] = deepcopy(self.data["zones"]["climate.salon"])
        storage_started, storage_release = asyncio.Event(), asyncio.Event()
        climate_started, climate_release = asyncio.Event(), asyncio.Event()
        persisted = []

        async def store():
            storage_started.set()
            await storage_release.wait()
            persisted.append(deepcopy(self.data))

        original_apply = self.climate.async_set_temperature

        async def apply(*args, **kwargs):
            climate_started.set()
            await climate_release.wait()
            await original_apply(*args, **kwargs)

        self.scheduler._async_save_data = store
        self.climate.async_set_temperature = apply
        task = asyncio.create_task(self.scheduler.async_set_daily_schedule(
            "climate.salon", "tuesday",
            [{"start": "07:00", "temperature": 24, "hvac_mode": "cool"}], expected_revision=0,
        ))
        other = None
        try:
            await asyncio.wait_for(storage_started.wait(), 2)
            self.assertFalse(task.done())
            self.assertFalse(climate_started.is_set())
            self.assertEqual(persisted, [])
            storage_release.set()
            await asyncio.wait_for(climate_started.wait(), 2)
            self.assertEqual(persisted[0]["configuration_revision"], 1)
            self.assertFalse(task.done())
            other = asyncio.create_task(self.scheduler.async_set_schedule_days(
                "climate.other", day_layout_key="all", expected_revision=1,
            ))
            # Give the second request a turn to acquire the shared mutation lock.
            await asyncio.sleep(0)
            self.assertFalse(other.done())
            self.assertEqual(self.data["configuration_revision"], 1)
            climate_release.set()
            await asyncio.wait_for(asyncio.gather(task, other), 2)
            self.assertEqual(self.data["configuration_revision"], 2)
            self.assertIn(("set_temperature", "climate.salon", 24.0, True, "cool"), self.climate.calls)
        finally:
            storage_release.set()
            climate_release.set()
            await asyncio.gather(*(item for item in (task, other) if item), return_exceptions=True)

    async def test_future_only_save_does_not_wait_for_a_local_climate_call(self):
        self.independent_days()
        self.climate.async_set_temperature = AsyncMock(side_effect=AssertionError("Unexpected delivery"))
        await self.scheduler.async_set_daily_schedule(
            "climate.salon", "wednesday",
            [{"start": "07:00", "temperature": 24, "hvac_mode": "cool"}], expected_revision=0,
        )
        self.assertEqual(self.saves, 1)
        self.climate.async_set_temperature.assert_not_called()

    async def test_future_external_save_is_persisted_before_awaited_publication(self):
        self.independent_days()
        self.data["zones"]["climate.salon"]["execution"] = {"type": "external", "provider": "test"}
        started, release = asyncio.Event(), asyncio.Event()

        async def publish(entity_id, week):
            self.assertEqual(self.saves, 1)
            self.assertEqual(week["wednesday"][0]["temperature"], 24)
            started.set()
            await release.wait()

        authority = ExecutionAuthority(self.data)
        self.scheduler._execution_authority = authority
        self.scheduler._external_execution = SimpleNamespace(
            authority=authority, ensure_schedule_supported=Mock(), async_schedule_saved=publish,
        )
        task = asyncio.create_task(self.scheduler.async_set_daily_schedule(
            "climate.salon", "wednesday",
            [{"start": "07:00", "temperature": 24, "hvac_mode": "cool"}], expected_revision=0,
        ))
        try:
            await asyncio.wait_for(started.wait(), 2)
            self.assertFalse(task.done())
            self.assertEqual(self.data["configuration_revision"], 1)
            self.assertEqual(self.climate.calls, [])
        finally:
            release.set()
            await asyncio.wait_for(task, 2)

    async def test_mutations_reject_invalid_resources_without_previews_or_partial_saves(self):
        before = deepcopy(self.data)
        self.scheduler.preview_daily_schedule = Mock(side_effect=AssertionError("Unexpected preview"))
        self.scheduler.preview_profile = Mock(side_effect=AssertionError("Unexpected preview"))
        profile = deepcopy(self.data["profiles"][0])
        profile["zones"]["climate.salon"]["template_links"]["tuesday"] = {"mode": "full", "template_key": "missing"}
        requests = [
            lambda: self.scheduler.async_set_daily_schedule("climate.salon", "monday", [{"start": "07:00", "preset_key": "missing"}], expected_revision=0),
            lambda: self.scheduler.async_set_schedule_days("climate.salon", ["monday", "wednesday"], template_link={"mode": "full", "template_key": "missing"}, expected_revision=0),
            lambda: self.scheduler.async_set_profile(profile, expected_revision=0),
            lambda: self.scheduler.async_set_schedule_days("climate.salon", day_layout_key="all", expected_revision=99),
        ]
        for index, request in enumerate(requests):
            with self.subTest(request=index), self.assertRaises(ConfigurationResourceError):
                await request()
            self.assertEqual(self.data, before)
            self.assertEqual(self.saves, 0)
        self.scheduler.preview_daily_schedule.assert_not_called()
        self.scheduler.preview_profile.assert_not_called()
