"""Atomic, destination-owned template application and grouped layouts."""
import asyncio
from copy import deepcopy
import unittest
from unittest.mock import Mock, AsyncMock, patch
from types import SimpleNamespace

from . import test_linked_schedule_acceptance as acceptance
from custom_components.velair.models import WEEKDAYS, normalize_schedule_data
from custom_components.velair.schedule_resources import ConfigurationResourceError, resolve_week
from custom_components.velair import api


class TemplateApplicationTest(unittest.IsolatedAsyncioTestCase):
    setUp = acceptance.LinkedScheduleAcceptanceTest.setUp
    save = acceptance.LinkedScheduleAcceptanceTest.save
    link = acceptance.LinkedScheduleAcceptanceTest.link
    profile = acceptance.LinkedScheduleAcceptanceTest.profile

    def request(self, **changes):
        return {"template_key": "workday", "source": "default", "day_layout_key": "weekdays_weekend", "mode": "copy", "groups": [{"entity_id": "climate.salon", "weekdays": list(WEEKDAYS[:5])}], "expected_revision": 0, **changes}

    def preview(self, **changes):
        return self.scheduler.preview_template_application(**self.request(**changes))

    async def apply(self, **changes):
        await self.scheduler.async_apply_template_application(**self.request(**changes))

    async def test_copy_is_single_save_and_retains_unselected_days(self):
        zone = self.data["zones"]["climate.salon"]
        zone["schedule"]["saturday"] = [{"start": "10:00", "action": "turn_off"}]
        original = deepcopy(self.data)
        preview = self.preview()
        self.assertTrue(preview["can_apply"])
        self.assertEqual(self.data, original)
        self.assertEqual(preview["warnings"][0]["code"], "mixed_unselected_group")
        await self.apply()
        self.assertEqual(self.saves, 1)
        self.assertEqual(zone["day_layout_key"], "weekdays_weekend")
        for day in WEEKDAYS[:5]:
            self.assertNotIn(day, zone["template_links"])
            self.assertEqual(zone["schedule"][day][0], {"start": "07:00", "action": "turn_off"})
        self.assertEqual(zone["schedule"]["saturday"], original["zones"]["climate.salon"]["schedule"]["saturday"])

    async def test_hours_mixed_group_requires_explicit_base_and_keeps_presets(self):
        preview = self.preview(mode="hours")
        self.assertFalse(preview["can_apply"])
        self.assertTrue(preview["groups"][0]["requires_base"])
        group = {**self.request()["groups"][0], "base_weekday": "tuesday"}
        preview = self.preview(mode="hours", groups=[group])
        self.assertTrue(preview["can_apply"])
        self.assertEqual(preview["groups"][0]["proposals"][0]["binding"], {"preset_key": "usual"})
        await self.apply(mode="hours", groups=[group])
        links = self.data["zones"]["climate.salon"]["template_links"]
        for day in WEEKDAYS[:5]:
            self.assertEqual(links[day]["bindings"]["morning"], {"preset_key": "usual"})
        links["monday"]["bindings"]["morning"] = {"action": "turn_off"}
        self.assertEqual(links["tuesday"]["bindings"]["morning"], {"preset_key": "usual"})

    async def test_empty_destination_never_uses_template_climate_settings(self):
        self.data["templates"][0]["blocks"][0].update(action="set_temperature", temperature=20)
        group = {"entity_id": "climate.salon", "weekdays": ["monday"]}
        preview = self.preview(mode="hours", day_layout_key="individual", groups=[group])
        self.assertEqual(len(preview["groups"][0]["pending"]), 2)
        before = deepcopy(self.data)
        with self.assertRaises(ConfigurationResourceError):
            await self.apply(mode="hours", day_layout_key="individual", groups=[group])
        self.assertEqual(before, self.data)
        self.assertEqual(self.saves, 0)

    async def test_manual_settings_complete_empty_destination(self):
        group = {"entity_id": "climate.salon", "weekdays": ["monday"], "bindings": {"morning": {"preset_key": "summer"}, "night": {"action": "turn_off"}}}
        await self.apply(mode="hours", day_layout_key="individual", groups=[group])
        self.assertEqual(resolve_week(self.data, self.data["zones"]["climate.salon"])["monday"][0]["hvac_mode"], "cool")

    async def test_donor_exact_then_previous_then_following(self):
        zone = self.data["zones"]["climate.salon"]
        zone["schedule"]["monday"] = [{"start": "06:00", "preset_key": "usual"}, {"start": "08:00", "action": "turn_off"}]
        preview = self.preview(mode="hours", day_layout_key="individual", groups=[{"entity_id": "climate.salon", "weekdays": ["monday"]}])
        proposals = preview["groups"][0]["proposals"]
        self.assertEqual([proposal["donor_start"] for proposal in proposals], ["06:00", "08:00"])
        self.assertEqual(proposals[0]["origin"], "previous")
        zone["schedule"]["monday"] = [{"start": "08:00", "action": "turn_off"}]
        self.assertEqual(self.preview(mode="hours", day_layout_key="individual", groups=[{"entity_id": "climate.salon", "weekdays": ["monday"]}])["groups"][0]["proposals"][0]["origin"], "next")

    async def test_invalid_manual_assignment_does_not_fall_back(self):
        group = {"entity_id": "climate.salon", "weekdays": ["tuesday"], "bindings": {"morning": {"preset_key": "missing"}}}
        preview = self.preview(mode="hours", day_layout_key="individual", groups=[group])
        self.assertFalse(preview["can_apply"])
        self.assertEqual(preview["groups"][0]["pending"][0]["slot_id"], "morning")

    async def test_full_links_propagate_and_reload(self):
        await self.apply(mode="full", day_layout_key="all", groups=[{"entity_id": "climate.salon", "weekdays": list(WEEKDAYS)}])
        self.assertEqual(self.saves, 1)
        self.data["templates"][0]["blocks"][0]["start"] = "08:00"
        reloaded = normalize_schedule_data(deepcopy(self.data), ["climate.salon"])
        self.assertEqual(resolve_week(reloaded, reloaded["zones"]["climate.salon"])["saturday"][0]["start"], "08:00")

    async def test_copy_preserves_live_preset_without_template_link(self):
        self.data["templates"][0]["blocks"][0] = {"slot_id": "morning", "start": "07:00", "preset_key": "usual"}
        await self.apply()
        self.assertEqual(self.data["zones"]["climate.salon"]["schedule"]["monday"][0], {"start": "07:00", "preset_key": "usual"})

    async def test_profile_conversion_preserves_other_zones_and_selection(self):
        self.data["profiles"][0]["zones"]["climate.salon"] = {"behavior": "pause", "action": "turn_off"}
        selection = deepcopy(self.data["global_"])
        preview = self.preview(source="profile", profile_key="winter", mode="full")
        self.assertEqual(preview["warnings"][0]["code"], "profile_behavior_changed")
        await self.apply(source="profile", profile_key="winter", mode="full")
        self.assertEqual(self.data["global_"], selection)
        zone = self.data["profiles"][0]["zones"]["climate.salon"]
        self.assertEqual(zone["behavior"], "schedule")
        self.assertNotIn("action", zone)
        self.assertEqual(zone["schedule"]["sunday"], [])
        reloaded = normalize_schedule_data(deepcopy(self.data), ["climate.salon"])
        self.assertEqual(reloaded["profiles"][0]["zones"]["climate.salon"]["behavior"], "schedule")

    async def test_invalid_requests_never_save(self):
        before = deepcopy(self.data)
        for changes in ({"expected_revision": True}, {"expected_revision": 1}, {"groups": []}, {"groups": [{"entity_id": "climate.unmanaged", "weekdays": list(WEEKDAYS[:5])}]}, {"groups": [{"entity_id": "climate.salon", "weekdays": ["monday"]}]}, {"groups": self.request()["groups"] * 2}, {"source": "profile", "profile_key": "missing"}, {"template_key": "missing"}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                await self.apply(**changes)
        self.assertEqual(before, self.data)
        self.assertEqual(self.saves, 0)

    async def test_storage_failure_restores_entire_candidate(self):
        before = deepcopy(self.data)
        self.fail_save = True
        with self.assertRaises(RuntimeError):
            await self.apply(mode="full")
        self.assertEqual(self.data, before)
        self.assertEqual(self.saves, 0)

    async def test_multi_zone_storage_failure_rolls_back_layouts_revision_and_selection(self):
        self.data["zones"]["climate.bedroom"] = deepcopy(self.data["zones"]["climate.salon"])
        self.data["zones"]["climate.bedroom"]["day_layout_key"] = "all"
        self.data["global_"]["zone_profile_overrides"] = {"climate.salon": None}
        before = deepcopy(self.data)
        self.fail_save = True
        groups = [{"entity_id": entity, "weekdays": list(WEEKDAYS[:5])} for entity in self.data["zones"]]
        with self.assertRaises(RuntimeError):
            await self.apply(mode="full", groups=groups)
        self.assertEqual(self.data, before)
        self.assertEqual(self.data["configuration_revision"], 0)
        self.assertEqual(self.saves, 0)

    async def test_hours_donor_from_existing_full_link_preserves_raw_preset(self):
        self.data["templates"].append({"key": "donor", "name": "Donor", "blocks": [
            {"slot_id": "early", "start": "06:00", "preset_key": "summer"},
            {"slot_id": "late", "start": "22:00", "action": "turn_off"},
        ]})
        zone = self.data["zones"]["climate.salon"]
        zone["template_links"]["monday"] = {"template_key": "donor", "mode": "full"}
        group = {"entity_id": "climate.salon", "weekdays": ["monday"]}
        preview = self.preview(mode="hours", day_layout_key="individual", groups=[group])
        self.assertTrue(preview["can_apply"])
        self.assertEqual(preview["groups"][0]["proposals"][0]["binding"], {"preset_key": "summer"})
        await self.apply(mode="hours", day_layout_key="individual", groups=[group])
        self.assertEqual(zone["template_links"]["monday"]["bindings"]["morning"], {"preset_key": "summer"})
        self.data["block_presets"][2]["config"]["temperature"] = 26
        self.assertEqual(resolve_week(self.data, zone)["monday"][0]["temperature"], 26)

    async def test_external_whole_week_constraint_blocks_valid_donors_atomically(self):
        self.scheduler._is_external_execution = lambda _entity: True
        whole_week = Mock(side_effect=ValueError("Maximum weekly transitions exceeded"))
        self.scheduler._external_execution = SimpleNamespace(
            ensure_provider_available=Mock(), ensure_block_supported=Mock(),
            ensure_schedule_supported=whole_week,
        )
        group = {"entity_id": "climate.salon", "weekdays": list(WEEKDAYS[:5]), "base_weekday": "tuesday"}
        preview = self.preview(mode="hours", groups=[group])
        self.assertFalse(preview["can_apply"])
        self.assertEqual(len(preview["groups"][0]["proposals"]), 2)
        self.assertEqual(preview["groups"][0]["pending"], [])
        self.assertIn("Maximum weekly", preview["groups"][0]["errors"][0]["message"])
        whole_week.assert_called_once()
        before = deepcopy(self.data)
        with self.assertRaises(ConfigurationResourceError):
            await self.apply(mode="hours", groups=[group])
        self.assertEqual(self.data, before)
        self.assertEqual(self.saves, 0)

    async def test_concurrent_requests_use_revision_inside_lock(self):
        results = await asyncio.gather(self.apply(), self.apply(), return_exceptions=True)
        self.assertEqual(sum(isinstance(result, ConfigurationResourceError) for result in results), 1)
        self.assertEqual(self.saves, 1)

    async def test_incompatible_target_rejects_whole_batch(self):
        self.data["zones"]["climate.bedroom"] = deepcopy(self.data["zones"]["climate.salon"])
        self.climate.hvac_modes["climate.bedroom"] = ["off", "cool"]
        self.data["templates"][0]["blocks"][0] = {"slot_id": "morning", "start": "07:00", "preset_key": "usual"}
        groups = [{"entity_id": entity, "weekdays": list(WEEKDAYS[:5])} for entity in self.data["zones"]]
        self.assertFalse(self.preview(mode="full", groups=groups)["can_apply"])
        before = deepcopy(self.data)
        with self.assertRaises(ConfigurationResourceError):
            await self.apply(mode="full", groups=groups)
        self.assertEqual(self.data, before)
        self.assertEqual(self.saves, 0)

    async def test_profile_expansion_rejects_mode_and_base_conflicts(self):
        self.data["zones"]["climate.bedroom"] = deepcopy(self.data["zones"]["climate.salon"])
        self.data["profiles"][0]["zones"] = {"climate.bedroom": {"behavior": "normal"}}
        self.data["modes"] = [{"key": "together", "name": "Together", "icon": "mdi:calendar", "profile_ids": ["winter", "summer"]}]
        preview = self.preview(source="profile", profile_key="winter")
        self.assertFalse(preview["can_apply"])
        self.assertTrue(preview["errors"])
        self.data["modes"] = []
        self.data["global_"]["active_profile_ids"] = ["winter", "summer"]
        self.data["global_"]["base_profile_ids"] = ["winter", "summer"]
        self.assertFalse(self.preview(source="profile", profile_key="winter")["can_apply"])
        self.assertEqual(self.saves, 0)

    async def test_external_unavailability_is_error_not_manual_binding_request(self):
        self.scheduler._is_external_execution = lambda _entity: True
        self.scheduler._external_execution = SimpleNamespace(ensure_provider_available=Mock(side_effect=ValueError("Provider unavailable")))
        preview = self.preview(mode="hours")
        self.assertFalse(preview["can_apply"])
        self.assertEqual(preview["groups"][0]["pending"], [])
        self.assertIn("Provider unavailable", preview["groups"][0]["errors"][0]["message"])

    async def test_hours_falls_back_after_incompatible_donor(self):
        self.climate.hvac_modes["climate.salon"] = ["off", "cool"]
        self.data["zones"]["climate.salon"]["schedule"]["monday"] = [{"start": "07:00", "preset_key": "usual"}, {"start": "06:00", "preset_key": "summer"}]
        preview = self.preview(mode="hours", day_layout_key="individual", groups=[{"entity_id": "climate.salon", "weekdays": ["monday"]}])
        self.assertEqual(preview["groups"][0]["proposals"][0]["binding"], {"preset_key": "summer"})


class TemplateApplicationApiTest(unittest.IsolatedAsyncioTestCase):
    async def test_handlers_expose_preview_and_standard_save_response(self):
        scheduler = SimpleNamespace(preview_template_application=Mock(return_value={"can_apply": True}), async_apply_template_application=AsyncMock())
        runtime = {"scheduler": scheduler, "storage": SimpleNamespace(temperature_migration_required=False), "operation_active": None, "operation_recovery": None}
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock(), send_message=Mock())
        request = {"template_key": "workday", "source": "default", "day_layout_key": "all", "mode": "full", "groups": [{"entity_id": "climate.salon", "weekdays": list(WEEKDAYS)}], "expected_revision": 0}
        with patch.object(api, "_get_runtime", return_value=runtime), patch.object(api, "_build_schedule_response", return_value={"configuration_revision": 1}):
            await api.ws_preview_template_application(None, connection, {"id": 3, "type": "velair/preview_template_application", **request})
            scheduler.preview_template_application.assert_called_once_with(**request)
            connection.send_result.assert_called_with(3, {"can_apply": True})
            await api.ws_apply_template_application(None, connection, {"id": 4, "type": "velair/apply_template_application", **request})
            scheduler.async_apply_template_application.assert_awaited_once_with(**request)
            connection.send_result.assert_called_with(4, {"configuration_revision": 1})

    async def test_incomplete_apply_returns_structured_errors(self):
        error = ConfigurationResourceError("incomplete_application", "Review groups")
        error.details = {"groups": [{"pending": [{"slot_id": "morning"}]}]}
        runtime = {"scheduler": SimpleNamespace(async_apply_template_application=AsyncMock(side_effect=error)), "storage": SimpleNamespace(temperature_migration_required=False), "operation_active": None, "operation_recovery": None}
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock(), send_message=Mock())
        with patch.object(api, "_get_runtime", return_value=runtime):
            await api.ws_apply_template_application(None, connection, {"id": 1, "type": "velair/apply_template_application"})
        connection.send_result.assert_not_called()
        self.assertEqual(connection.send_message.call_args.args[0]["error"]["details"], error.details)
