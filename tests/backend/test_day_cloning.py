"""Atomic day cloning preserves live template and climate preset references."""
import asyncio
from copy import deepcopy
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from . import test_linked_schedule_acceptance as acceptance
from .test_services import _ServiceRegistry
from custom_components.velair import api, services
from custom_components.velair.const import DOMAIN, SERVICE_COPY_DAY_SCHEDULE
from custom_components.velair.execution import ExecutionAuthority
from custom_components.velair.models import WEEKDAYS
from custom_components.velair.schedule_resources import resolve_week


class DayCloningTest(unittest.IsolatedAsyncioTestCase):
    setUp = acceptance.LinkedScheduleAcceptanceTest.setUp
    save = acceptance.LinkedScheduleAcceptanceTest.save
    link = acceptance.LinkedScheduleAcceptanceTest.link
    profile = acceptance.LinkedScheduleAcceptanceTest.profile

    def add_target(self, entity="climate.bedroom"):
        self.data["zones"][entity] = deepcopy(self.data["zones"]["climate.salon"])
        self.data["zones"][entity]["template_links"] = {}
        self.data["zones"][entity]["schedule"] = {day: [] for day in WEEKDAYS}

    def full_source(self):
        self.data["templates"][0]["blocks"][0] = {"slot_id": "morning", "start": "07:00", "preset_key": "usual"}
        self.data["zones"]["climate.salon"]["template_links"]["tuesday"] = {"mode": "full", "template_key": "workday"}

    async def clone(self, days=("wednesday",), **kwargs):
        await self.scheduler.async_copy_day_schedule("climate.salon", "tuesday", list(days), **kwargs)

    async def test_hours_clone_preserves_bindings_and_follows_new_template_times(self):
        source = deepcopy(self.data["zones"]["climate.salon"]["template_links"]["tuesday"])
        await self.clone(expected_revision=0)
        zone = self.data["zones"]["climate.salon"]
        self.assertEqual(zone["template_links"]["wednesday"], {"mode": "hours", **source})
        self.assertEqual(zone["schedule"]["wednesday"], [])
        blocks = deepcopy(self.data["templates"][0]["blocks"])
        blocks[0]["start"] = "08:00"
        await self.scheduler.async_set_schedule_template("Workday", blocks, "workday", expected_revision=1)
        self.assertEqual(resolve_week(self.data, zone)["wednesday"][0], {"start": "08:00", "action": "set_temperature", "temperature": 20, "hvac_mode": "heat"})

    async def test_full_clone_preserves_mode_and_follows_template_configuration(self):
        self.full_source()
        await self.clone()
        zone = self.data["zones"]["climate.salon"]
        self.assertEqual(zone["template_links"]["wednesday"], {"mode": "full", "template_key": "workday"})
        blocks = deepcopy(self.data["templates"][0]["blocks"])
        blocks[0]["preset_key"] = "summer"
        await self.scheduler.async_set_schedule_template("Workday", blocks, "workday", expected_revision=1)
        self.assertEqual(resolve_week(self.data, zone)["wednesday"][0]["temperature"], 25)

    async def test_own_source_removes_target_link_and_retains_preset_reference(self):
        zone = self.data["zones"]["climate.salon"]
        zone["template_links"]["wednesday"] = self.link("usual")
        zone["template_links"].pop("tuesday")
        zone["schedule"]["tuesday"] = [{"start": "07:00", "preset_key": "usual"}]
        await self.clone()
        self.assertNotIn("wednesday", zone["template_links"])
        self.assertEqual(zone["schedule"]["wednesday"], [{"start": "07:00", "preset_key": "usual"}])
        await self.scheduler.async_update_block_preset("usual", {"temperature": 19})
        self.assertEqual(resolve_week(self.data, zone)["wednesday"][0]["temperature"], 19)

    async def test_cross_climate_multiple_days_single_save_and_independent_binding_copies(self):
        self.add_target()
        self.add_target("climate.office")
        await self.clone(days=("wednesday", "thursday"), target_entity_ids=["climate.bedroom", "climate.office"], expected_revision=0)
        self.assertEqual(self.saves, 1)
        for entity in ("climate.bedroom", "climate.office"):
            for day in ("wednesday", "thursday"):
                zone = self.data["zones"][entity]
                self.assertEqual(zone["schedule"][day], [])
                self.assertEqual(zone["template_links"][day]["bindings"]["morning"], {"preset_key": "usual"})
        self.data["zones"]["climate.bedroom"]["template_links"]["wednesday"]["bindings"]["morning"] = {"action": "turn_off"}
        self.assertEqual(self.data["zones"]["climate.office"]["template_links"]["wednesday"]["bindings"]["morning"], {"preset_key": "usual"})

    async def test_incompatible_target_rejects_all_targets_without_materializing(self):
        self.full_source()
        self.add_target()
        self.add_target("climate.office")
        self.climate.hvac_modes["climate.office"] = ["off", "cool"]
        before = deepcopy(self.data)
        with self.assertRaises(ValueError):
            await self.clone(target_entity_ids=["climate.bedroom", "climate.office"], expected_revision=0)
        self.assertEqual(self.data, before)
        self.assertEqual(self.saves, 0)

    async def test_empty_link_is_preserved(self):
        self.data["templates"][0]["blocks"] = []
        zone = self.data["zones"]["climate.salon"]
        zone["template_links"]["tuesday"] = {"mode": "hours", "template_key": "workday", "bindings": {}}
        for profile in self.data["profiles"]:
            profile["zones"]["climate.salon"]["template_links"] = {}
        await self.clone()
        self.assertEqual(zone["template_links"]["wednesday"], {"mode": "hours", "template_key": "workday", "bindings": {}})

    async def test_legacy_manual_copy_without_revision_remains_supported(self):
        zone = self.data["zones"]["climate.salon"]
        zone["template_links"] = {}
        zone["schedule"]["tuesday"] = [{"start": "07:00", "action": "set_temperature", "temperature": 19}]
        await self.clone()
        self.assertEqual(zone["schedule"]["wednesday"], zone["schedule"]["tuesday"])

    async def test_revision_conflict_and_bad_targets_are_atomic(self):
        before = deepcopy(self.data)
        for kwargs in ({"expected_revision": 9}, {"target_entity_ids": ["climate.unmanaged"]}, {"target_entity_ids": []}):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                await self.clone(**kwargs)
            self.assertEqual(self.data, before)
        for source, targets in (("bad", ["monday"]), ("tuesday", []), ("tuesday", ["bad"])):
            with self.assertRaises(ValueError):
                await self.scheduler.async_copy_day_schedule("climate.salon", source, targets)
        self.assertEqual(self.saves, 0)

    async def test_source_is_read_after_acquiring_global_lock(self):
        await self.scheduler._profile_mutation_lock.acquire()
        task = asyncio.create_task(self.clone())
        await asyncio.sleep(0)
        self.assertFalse(task.done())
        self.data["zones"]["climate.salon"]["template_links"]["tuesday"]["bindings"]["morning"] = {"preset_key": "summer"}
        self.scheduler._profile_mutation_lock.release()
        await task
        self.assertEqual(self.data["zones"]["climate.salon"]["template_links"]["wednesday"]["bindings"]["morning"], {"preset_key": "summer"})

    async def test_hidden_default_clone_does_not_override_active_profile(self):
        self.data["global_"]["active_profile_ids"] = ["summer"]
        self.data["global_"]["base_profile_ids"] = ["summer"]
        await self.clone(days=("monday",))
        self.assertEqual(self.climate.calls, [])
        self.assertEqual(self.data["profiles"][0]["zones"]["climate.salon"]["template_links"]["tuesday"]["bindings"]["morning"], {"preset_key": "winter"})

    async def test_window_pause_survives_cloning_current_day(self):
        self.add_target()
        await self.scheduler.async_pause_zone("climate.bedroom", pause_id="window")
        pauses = deepcopy(self.data["zones"]["climate.bedroom"]["pauses"])
        self.climate.calls.clear()
        await self.clone(days=("tuesday",), target_entity_ids=["climate.bedroom"])
        self.assertEqual(self.data["zones"]["climate.bedroom"]["pauses"], pauses)
        self.assertEqual(self.climate.calls, [])

    async def test_boost_survives_cloning_current_day(self):
        self.add_target()
        self.climate.snapshots["climate.bedroom"] = {"hvac_mode": "heat", "temperature": 20}
        await self.scheduler.async_set_zone_boost("climate.bedroom", 24, "2026-05-19T20:00:00+00:00", hvac_mode="heat")
        override = deepcopy(self.data["zones"]["climate.bedroom"]["override"])
        self.climate.calls.clear()
        await self.clone(days=("tuesday",), target_entity_ids=["climate.bedroom"])
        self.assertEqual(self.data["zones"]["climate.bedroom"]["override"], override)
        self.assertEqual(self.climate.calls, [])

    async def test_persistence_failure_restores_all_destination_days(self):
        self.add_target()
        before = deepcopy(self.data)
        self.fail_save = True
        with self.assertRaises(RuntimeError):
            await self.clone(days=("tuesday", "wednesday"), target_entity_ids=["climate.salon", "climate.bedroom"])
        self.assertEqual(self.data, before)
        self.assertEqual(self.climate.calls, [])

    async def test_cloning_does_not_clamp_out_of_limits_to_repair_a_target(self):
        self.add_target()
        self.climate.limits["climate.bedroom"] = (5, 19)
        before = deepcopy(self.data)
        with self.assertRaises(ValueError):
            await self.clone(target_entity_ids=["climate.bedroom"])
        self.assertEqual(self.data, before)
        self.assertEqual(self.saves, 0)

    async def test_own_cross_climate_copy_adapts_step_without_changing_presets(self):
        self.add_target()
        self.climate.steps["climate.bedroom"] = 1
        source = self.data["zones"]["climate.salon"]
        source["template_links"].pop("tuesday")
        source["schedule"]["tuesday"] = [{"start": "07:00", "action": "set_temperature", "temperature": 20.5}, {"start": "08:00", "preset_key": "usual"}]
        presets = deepcopy(self.data["block_presets"])
        await self.clone(target_entity_ids=["climate.bedroom"])
        target = self.data["zones"]["climate.bedroom"]["schedule"]["wednesday"]
        self.assertEqual(target[0]["temperature"], 20.5)
        effective = self.scheduler.get_configuration_resources()["resolved_default_schedules"]["climate.bedroom"]["wednesday"]
        self.assertNotEqual(effective[0]["temperature"], 20.5)
        self.assertEqual(effective[0]["temperature"] % 1, 0)
        self.assertEqual(target[1], {"start": "08:00", "preset_key": "usual"})
        self.assertEqual(source["schedule"]["tuesday"][0]["temperature"], 20.5)
        self.assertEqual(self.data["block_presets"], presets)

    async def test_external_restriction_rejects_and_success_has_no_local_delivery(self):
        self.add_target()
        self.data["zones"]["climate.bedroom"]["execution"] = {"type": "external", "provider": "test"}
        self.scheduler._execution_authority = ExecutionAuthority(self.data)
        provider = SimpleNamespace(ensure_schedule_supported=Mock(side_effect=ValueError("Unsupported schedule")), async_schedule_saved=AsyncMock())
        self.scheduler._external_execution = provider
        before = deepcopy(self.data)
        with self.assertRaises(ValueError):
            await self.clone(target_entity_ids=["climate.bedroom"])
        self.assertEqual(self.data, before)
        provider.ensure_schedule_supported.side_effect = None
        await self.clone(days=("tuesday",), target_entity_ids=["climate.bedroom"])
        provider.async_schedule_saved.assert_awaited_once()
        self.assertEqual(self.climate.calls, [])

    async def test_service_clones_latest_linked_source_without_revision(self):
        registry = _ServiceRegistry()
        hass = SimpleNamespace(services=registry, data={DOMAIN: {"entry": {"scheduler": self.scheduler, "storage": SimpleNamespace(temperature_migration_required=False)}}})
        await services.async_setup_services(hass)
        handler, schema = registry.handlers[(DOMAIN, SERVICE_COPY_DAY_SCHEDULE)]
        self.full_source()
        await handler(SimpleNamespace(data=schema({"entity_id": "climate.salon", "source_weekday": "tuesday", "target_weekdays": ["wednesday"]})))
        self.assertEqual(self.data["zones"]["climate.salon"]["template_links"]["wednesday"]["mode"], "full")

    async def test_ws_forwards_multi_climate_and_revision(self):
        scheduler = SimpleNamespace(async_copy_day_schedule=AsyncMock())
        runtime = {"scheduler": scheduler, "storage": SimpleNamespace(temperature_migration_required=False)}
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        payload = {"id": 1, "entity_id": "climate.salon", "source_weekday": "tuesday", "target_weekdays": ["wednesday"], "target_entity_ids": ["climate.bedroom"], "expected_revision": 3}
        with patch.object(api, "_get_runtime", return_value=runtime), patch.object(api, "_build_schedule_response", return_value={}):
            await api.ws_copy_day_schedule(None, connection, payload)
        scheduler.async_copy_day_schedule.assert_awaited_once_with("climate.salon", "tuesday", ["wednesday"], target_entity_ids=["climate.bedroom"], expected_revision=3)
        connection.send_error.assert_not_called()
