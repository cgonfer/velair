"""External ownership changes expose only durable configuration to API readers."""

import asyncio
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from .helpers import FakeClimateManager, FakeHass, NOW, VelairScheduler, normalize_schedule_data, scheduler_module
from custom_components.velair import api
from custom_components.velair.external_execution.manager import ExternalExecutionManager
from custom_components.velair.external_execution.models import ExternalScheduleCapabilities


ZONE, OTHER = "climate.external_candidate", "climate.local"
OWNER = {"type": "external", "provider": "test_provider"}


class _Provider:
    capabilities = ExternalScheduleCapabilities(
        provider="test_provider", name="Test provider", supported_hvac_modes=("heat", "cool"),
    )

    def __init__(self):
        self.started, self.release = asyncio.Event(), asyncio.Event()
        self.release.set()
        self.failure = None
        self.calls = []

    def compatible_entities(self, entities):
        return [entity for entity in entities if entity == ZONE]

    async def async_publish(self, entity, schedule, unit):
        self.calls.append((entity, deepcopy(schedule), unit))
        self.started.set()
        await self.release.wait()
        if self.failure:
            raise self.failure


class ExternalExecutionPublicationTests(unittest.IsolatedAsyncioTestCase):
    def make(self, *, external=False, direction="heat"):
        hass, climate, provider = FakeHass(), FakeClimateManager(), _Provider()
        data = normalize_schedule_data({}, [ZONE, OTHER])
        for entity in (ZONE, OTHER):
            for day in data["zones"][entity]["schedule"]:
                data["zones"][entity]["schedule"][day] = [
                    {"start": "00:00", "temperature": 20, "hvac_mode": direction},
                    {"start": "18:00", "temperature": 22, "hvac_mode": direction},
                ]
            hass.states[entity] = SimpleNamespace(state=direction, attributes={
                "current_temperature": 20, "temperature": 20,
                "hvac_modes": ["off", "heat", "cool"], "min_temp": 5, "max_temp": 35,
                "target_temp_step": .5,
            })
            climate.current_hvac_modes[entity] = direction
        if external:
            data["zones"][ZONE]["execution"] = deepcopy(OWNER)
        else:
            # A handoff clears these only after the same durable ownership write.
            data["zones"][ZONE]["override"] = {
                "type": "boost", "temperature": 23, "until": (NOW + timedelta(hours=1)).isoformat(),
            }
            data["zones"][ZONE]["pauses"] = [{
                "id": "test-pause", "action": "keep", "until": (NOW + timedelta(hours=1)).isoformat(),
            }]
        entered, release = asyncio.Event(), asyncio.Event()
        writes = []
        failure = [None]

        async def save():
            entered.set()
            await release.wait()
            if failure[0]:
                raise failure[0]
            writes.append(deepcopy(data))

        manager = ExternalExecutionManager(data, {"test_provider": provider}, save, lambda _entity: "°C")
        # Prepare the projection before the deadline that the concurrent timer crosses.
        with patch.object(scheduler_module.dt_util, "now", lambda: NOW - timedelta(minutes=1)):
            scheduler = VelairScheduler(hass, data, climate, save, external_execution=manager)
        self.addAsyncCleanup(scheduler.async_stop)
        return SimpleNamespace(hass=hass, climate=climate, provider=provider, data=data,
            manager=manager, scheduler=scheduler, entered=entered, release=release,
            writes=writes, failure=failure)

    def response(self, fixture):
        return api._build_schedule_response({"scheduler": fixture.scheduler,
            "storage": SimpleNamespace(data=fixture.data, _climate_entities=[ZONE, OTHER]),
            "entry": SimpleNamespace(options={}, data={}), "external_execution": fixture.manager,
            "climate_manager": fixture.climate})

    def assert_owner(self, response, external):
        self.assertEqual(response["zones"][ZONE].get("execution"), OWNER if external else None)
        self.assertEqual(ZONE in response["external_execution"]["zones"], external)

    async def exercise_storage(self, *, external, direction, outcome):
        with patch.object(scheduler_module.dt_util, "now", lambda: NOW):
            fixture = self.make(external=external, direction=direction)
            if external:
                # Returning local must retain the previous publication evidence
                # until the storage transaction actually withdraws ownership.
                await fixture.manager.async_publish(ZONE, fixture.data["zones"][ZONE]["schedule"])
            previous_provider_calls = len(fixture.provider.calls)
            before = self.response(fixture)
            task = asyncio.create_task(fixture.scheduler.async_set_zone_execution(
                ZONE, None if external else "test_provider"))
            try:
                await asyncio.wait_for(fixture.entered.wait(), 2)
                # Run a genuine concurrent timer, including its configuration publication.
                await asyncio.wait_for(fixture.scheduler._handle_timer(NOW), 2)
                during = self.response(fixture)
                self.assert_owner(during, external)
                self.assertEqual(during["external_execution"]["zones"], before["external_execution"]["zones"])
                for key in ("override", "pauses"):
                    self.assertEqual(during["zones"][ZONE].get(key), before["zones"][ZONE].get(key))
                self.assertTrue(any(call[0] == "set_temperature" and call[1] == OTHER
                    and call[2] == 22 and call[4] == direction for call in fixture.climate.calls))
                self.assertFalse(any(call[1] == ZONE for call in fixture.climate.calls))
                self.assertEqual(len(fixture.provider.calls), previous_provider_calls)
                self.assertFalse(fixture.writes)
                if outcome == "failure":
                    fixture.failure[0] = OSError("storage unavailable")
                if outcome == "cancel":
                    task.cancel()
                else:
                    fixture.release.set()
                if outcome == "success":
                    await asyncio.wait_for(task, 2)
                    self.assert_owner(self.response(fixture), not external)
                    self.assertEqual(len(fixture.writes), 1)
                else:
                    with self.assertRaises(asyncio.CancelledError if outcome == "cancel" else OSError):
                        await asyncio.wait_for(task, 2)
                    after = self.response(fixture)
                    self.assert_owner(after, external)
                    self.assertEqual(after["external_execution"]["zones"], before["external_execution"]["zones"])
                    for key in ("override", "pauses"):
                        self.assertEqual(after["zones"][ZONE].get(key), before["zones"][ZONE].get(key))
                    self.assertFalse(fixture.writes)
                    self.assertEqual(len(fixture.provider.calls), previous_provider_calls)
                self.assertEqual(fixture.scheduler._projection_save_depth, 0)
                self.assertEqual(fixture.scheduler._projection_pending_entities, {})
            finally:
                fixture.release.set()
                fixture.provider.release.set()
                if not task.done():
                    task.cancel()
                await asyncio.gather(task, return_exceptions=True)

    async def test_successful_handoffs_keep_previous_publication_until_storage_succeeds(self):
        for external in (False, True):
            for direction in ("heat", "cool"):
                with self.subTest(external=external, direction=direction):
                    await self.exercise_storage(external=external, direction=direction, outcome="success")

    async def test_failed_handoffs_never_publish_proposed_configuration(self):
        for external in (False, True):
            with self.subTest(external=external):
                await self.exercise_storage(external=external, direction="heat", outcome="failure")

    async def test_cancelled_handoffs_never_publish_proposed_configuration(self):
        for external in (False, True):
            with self.subTest(external=external):
                await self.exercise_storage(external=external, direction="cool", outcome="cancel")

    async def test_committed_owner_is_visible_while_provider_pending_and_survives_provider_errors(self):
        for outcome in ("success", "failure", "cancel"):
            with self.subTest(outcome=outcome), patch.object(scheduler_module.dt_util, "now", lambda: NOW):
                fixture = self.make()
                fixture.release.set()
                fixture.provider.release.clear()
                task = asyncio.create_task(fixture.scheduler.async_set_zone_execution(ZONE, "test_provider"))
                try:
                    await asyncio.wait_for(fixture.provider.started.wait(), 2)
                    response = self.response(fixture)
                    self.assert_owner(response, True)
                    self.assertEqual(response["external_execution"]["zones"][ZONE]["publication"]["state"], "publishing")
                    self.assertEqual(len(fixture.writes), 1)
                    self.assertEqual(fixture.scheduler._projection_save_depth, 0)
                    self.assertFalse(any(call[1] == ZONE for call in fixture.climate.calls))
                    if outcome == "cancel":
                        task.cancel()
                        with self.assertRaises(asyncio.CancelledError):
                            await asyncio.wait_for(task, 2)
                    else:
                        if outcome == "failure":
                            fixture.provider.failure = RuntimeError("provider unavailable")
                        fixture.provider.release.set()
                        await asyncio.wait_for(task, 2)
                    after = self.response(fixture)
                    self.assert_owner(after, True)
                    publication = after["external_execution"]["zones"][ZONE]["publication"]
                    self.assertEqual(publication["state"] if publication else None,
                        {"success": "published", "failure": "failed", "cancel": None}[outcome])
                finally:
                    fixture.provider.release.set()
                    if not task.done():
                        task.cancel()
                    await asyncio.gather(task, return_exceptions=True)
