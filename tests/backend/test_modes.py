"""Backend tests for Velair-owned climate modes."""

from __future__ import annotations

import importlib
from copy import deepcopy
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import AsyncMock

from .helpers import (
    FakeClimateManager,
    FakeHass,
    VelairScheduler,
    normalize_schedule_data,
)
from .test_profiles import _profile
from custom_components.velair.models import normalize_modes, validate_modes
from custom_components.velair.models import serialize_schedule_data
from custom_components.velair import api as api_module
from custom_components.velair.temperature import CELSIUS


class VelairModeModelTest(unittest.TestCase):
    """Verify storage normalization and strict write validation."""

    def test_normalization_drops_legacy_helper_invalid_duplicates_and_orphans(self) -> None:
        data = normalize_schedule_data(
            {
                "profiles": [_profile()],
                "profile_helper_binding": {"entity_id": "input_select.old"},
                "modes": [
                    {"key": "away-mode", "name": "  Away  ", "profile_ids": ["away"]},
                    {"key": "duplicate-name", "name": "away", "profile_ids": ["away"]},
                    {"key": "reserved", "name": "manual", "profile_ids": ["away"]},
                    {"key": "orphan", "name": "Holiday", "profile_ids": ["missing"]},
                ],
                "global": {
                    "mode": "auto",
                    "active_profile_id": "away",
                    "active_mode_id": "away-mode",
                },
            },
            ["climate.salon"],
        )

        self.assertEqual(
            data["modes"],
            [{"key": "away-mode", "name": "Away", "profile_ids": ["away"]}],
        )
        self.assertEqual(data["global_"]["active_mode_id"], "away-mode")
        self.assertNotIn("profile_helper_binding", data)

    def test_selected_mode_requires_matching_active_profile(self) -> None:
        data = normalize_schedule_data(
            {
                "profiles": [_profile()],
                "modes": [
                    {"key": "away-mode", "name": "Away", "profile_ids": ["away"]}
                ],
                "global": {
                    "active_profile_id": None,
                    "active_mode_id": "away-mode",
                },
            },
            ["climate.salon"],
        )
        self.assertIsNone(data["global_"]["active_mode_id"])

    def test_normalization_clears_a_conflicting_active_profile_set(self) -> None:
        data = normalize_schedule_data(
            {
                "profiles": [
                    _profile(key="away"),
                    _profile(key="sleep"),
                ],
                "global": {
                    "active_profile_ids": ["away", "sleep"],
                    "active_mode_id": "missing",
                },
            },
            ["climate.salon"],
        )

        self.assertEqual(data["global_"]["active_profile_ids"], [])
        self.assertIsNone(data["global_"]["active_mode_id"])

    def test_unpublished_storage_names_migrate_once_and_serialize_canonically(self) -> None:
        data = normalize_schedule_data(
            {
                "profiles": [_profile()],
                "profile_modes": [
                    {"key": "away-mode", "name": "Away", "profile_id": "away"}
                ],
                "global": {
                    "active_profile_id": "away",
                    "active_profile_mode_id": "away-mode",
                },
            },
            ["climate.salon"],
        )

        self.assertEqual(data["global_"]["active_mode_id"], "away-mode")
        self.assertEqual(
            data["modes"],
            [{"key": "away-mode", "name": "Away", "profile_ids": ["away"]}],
        )
        serialized = serialize_schedule_data(data)
        self.assertIn("modes", serialized)
        self.assertNotIn("profile_modes", serialized)
        self.assertIn("active_mode_id", serialized["global"])
        self.assertNotIn("active_profile_mode_id", serialized["global"])
        self.assertNotIn("profile_id", serialized["modes"][0])

    def test_strict_validation_rejects_reserved_and_casefold_duplicate_names(self) -> None:
        with self.assertRaisesRegex(ValueError, "unique keys and names"):
            validate_modes(
                [
                    {"key": "one", "name": "Away", "profile_ids": ["away"]},
                    {"key": "two", "name": " away ", "profile_ids": ["away"]},
                ],
                {"away"},
            )
        self.assertEqual(normalize_modes([], {"away"}), [])
        for reserved_name in (
            "Default",
            "predeterminado",
            "manual",
            "unknown",
            "UNAVAILABLE",
        ):
            with self.subTest(reserved_name=reserved_name):
                with self.assertRaisesRegex(ValueError, "non-reserved names"):
                    validate_modes(
                        [
                            {
                                "key": "reserved",
                                "name": reserved_name,
                                "profile_ids": ["away"],
                            }
                        ],
                        {"away"},
                    )

    def test_names_are_trimmed_limited_and_cannot_contain_control_characters(self) -> None:
        accepted = normalize_modes(
            [
                {
                    "key": "limit",
                    "name": f" {'a' * 255} ",
                    "profile_ids": ["away"],
                },
                {"key": "long", "name": "b" * 256, "profile_ids": ["away"]},
                {"key": "control", "name": "Away\nmode", "profile_ids": ["away"]},
            ],
            {"away"},
        )
        self.assertEqual(len(accepted), 1)
        self.assertEqual(accepted[0]["name"], "a" * 255)

        for invalid_name in (
            "b" * 256,
            "Away\tmode",
            "Away\x7fmode",
            "\tAway\t",
        ):
            with self.subTest(name=invalid_name[:20]):
                with self.assertRaisesRegex(
                    ValueError, "255 characters or fewer without control characters"
                ):
                    validate_modes(
                        [
                            {
                                "key": "invalid",
                                "name": invalid_name,
                                "profile_ids": ["away"],
                            }
                        ],
                        {"away"},
                    )

    def test_strict_validation_accepts_disjoint_profiles_and_rejects_conflicts(self) -> None:
        with self.assertRaisesRegex(ValueError, "one or more"):
            validate_modes(
                [{"key": "mode", "name": "Away", "profile_ids": []}],
                {"away": {"climate.salon"}},
            )
        with self.assertRaisesRegex(ValueError, "no zone configured"):
            validate_modes(
                [{"key": "mode", "name": "Away", "profile_ids": ["away", "home"]}],
                {
                    "away": {"climate.salon"},
                    "home": {"climate.salon"},
                },
            )
        self.assertEqual(
            validate_modes(
                [{"key": "mode", "name": "Away", "profile_ids": ["away", "home"]}],
                {
                    "away": {"climate.salon"},
                    "home": {"climate.bedroom"},
                },
            )[0]["profile_ids"],
            ["away", "home"],
        )


class VelairModeSchedulerTest(unittest.IsolatedAsyncioTestCase):
    """Verify atomic mode/profile lifecycle semantics."""

    def setUp(self) -> None:
        self.data = normalize_schedule_data(None, ["climate.salon"])
        self.saves = 0

        async def save() -> None:
            self.saves += 1

        self.manager = FakeClimateManager()
        self.scheduler = VelairScheduler(FakeHass(), self.data, self.manager, save)

    async def _add_away(self) -> None:
        await self.scheduler.async_set_profile(_profile())
        await self.scheduler.async_set_velair_mode(
            {"key": "away-mode", "name": "Away", "profile_ids": ["away"]}
        )

    async def test_mode_activates_disjoint_profiles_as_one_atomic_set(self) -> None:
        data = normalize_schedule_data(
            None, ["climate.salon", "climate.bedroom"]
        )
        manager = FakeClimateManager()
        scheduler = VelairScheduler(FakeHass(), data, manager, AsyncMock())
        away = _profile(key="away", temperature=18)
        bedroom = _profile(key="bedroom", temperature=19)
        bedroom["name"] = "Bedroom"
        bedroom["zones"] = {
            "climate.bedroom": bedroom["zones"].pop("climate.salon")
        }
        for blocks in bedroom["zones"]["climate.bedroom"]["schedule"].values():
            for block in blocks:
                block["hvac_mode"] = "cool"
        await scheduler.async_set_profile(away)
        await scheduler.async_set_profile(bedroom)
        await scheduler.async_set_velair_mode(
            {
                "key": "night",
                "name": "Night",
                "profile_ids": ["away", "bedroom"],
            }
        )

        await scheduler.async_select_velair_mode("night")

        self.assertEqual(scheduler.active_profile_ids, ["away", "bedroom"])
        self.assertEqual(scheduler.active_mode_id, "night")
        self.assertEqual(
            scheduler._active_profile_for_zone("climate.salon")["key"], "away"
        )
        self.assertEqual(
            scheduler._active_profile_for_zone("climate.bedroom")["key"],
            "bedroom",
        )
        profile_events = [
            event
            for event_type, event in scheduler._hass.bus.events
            if event_type == "velair_event"
            and event.get("event") == "profile_changed"
        ]
        self.assertEqual(profile_events[-1]["profile_ids"], ["away", "bedroom"])
        self.assertEqual(profile_events[-1]["previous_profile_ids"], [])
        self.assertIn(
            ("set_temperature", "climate.salon", 18.0, True, "heat"),
            manager.calls,
        )
        self.assertIn(
            ("set_temperature", "climate.bedroom", 19.0, True, "cool"),
            manager.calls,
        )

        await scheduler.async_activate_profile("away")
        self.assertEqual(scheduler.active_profile_ids, ["away"])
        self.assertIsNone(scheduler.active_mode_id)

    async def test_custom_direct_manual_normal_and_same_profile_transitions(self) -> None:
        await self._add_away()
        await self.scheduler.async_select_velair_mode("away-mode")
        self.assertEqual(self.scheduler.active_profile_ids, ["away"])
        self.assertEqual(self.scheduler.active_mode_id, "away-mode")
        self.assertEqual(self.scheduler.operation_status["kind"], "mode_change")
        self.assertEqual(self.scheduler.operation_status["target_id"], "away-mode")
        self.assertEqual(self.scheduler.operation_status["state"], "completed")
        profile_events = [
            event
            for event_type, event in self.scheduler._hass.bus.events
            if event_type == "velair_event"
            and event.get("event") == "profile_changed"
        ]
        self.assertEqual(profile_events[-1]["source"], "select")

        self.manager.calls.clear()
        self.scheduler._hass.bus.events.clear()
        await self.scheduler.async_activate_profile("away", source="panel")
        self.assertEqual(self.scheduler.active_profile_ids, ["away"])
        self.assertIsNone(self.scheduler.active_mode_id)
        self.assertEqual(self.manager.calls, [])
        self.assertFalse(
            any(
                event.get("event") == "profile_changed"
                for _event_type, event in self.scheduler._hass.bus.events
            )
        )

        await self.scheduler.async_select_velair_mode("away-mode")
        await self.scheduler.async_clear_velair_mode()
        self.assertEqual(self.scheduler.active_profile_ids, ["away"])
        self.assertIsNone(self.scheduler.active_mode_id)
        self.assertEqual(self.scheduler.operation_status["kind"], "mode_change")
        self.assertEqual(self.scheduler.operation_status["target_id"], "manual")
        self.assertEqual(self.scheduler.operation_status["total"], 0)

        await self.scheduler.async_activate_profile(None, source="service")
        self.assertEqual(self.scheduler.active_profile_ids, [])
        self.assertIsNone(self.scheduler.active_mode_id)
        self.assertEqual(
            self.scheduler.operation_status["kind"],
            "profile_activation",
        )

    async def test_reselect_and_two_modes_for_same_profile_do_not_reapply(self) -> None:
        await self._add_away()
        await self.scheduler.async_set_velair_mode(
            {"key": "home-mode", "name": "Home", "profile_ids": ["away"]}
        )
        await self.scheduler.async_select_velair_mode("away-mode")
        self.manager.calls.clear()
        self.scheduler._hass.bus.events.clear()
        saves_before = self.saves

        await self.scheduler.async_select_velair_mode("away-mode")
        self.assertEqual(self.saves, saves_before)

        await self.scheduler.async_select_velair_mode("home-mode")
        self.assertEqual(self.scheduler.active_profile_ids, ["away"])
        self.assertEqual(self.scheduler.active_mode_id, "home-mode")
        self.assertEqual(self.manager.calls, [])
        self.assertFalse(
            any(
                event.get("event") == "profile_changed"
                for _event_type, event in self.scheduler._hass.bus.events
            )
        )
        self.assertEqual(self.saves, saves_before + 1)

    async def test_panel_mode_selection_reports_panel_as_transition_source(self) -> None:
        await self._add_away()
        await self.scheduler.async_select_velair_mode("away-mode", source="panel")
        profile_events = [
            event
            for event_type, event in self.scheduler._hass.bus.events
            if event_type == "velair_event" and event.get("event") == "profile_changed"
        ]
        self.assertEqual(profile_events[-1]["source"], "panel")

    async def test_selected_mode_survives_startup_without_bypassing_apply_setting(self) -> None:
        for apply_current_schedule in (False, True):
            with self.subTest(apply_current_schedule=apply_current_schedule):
                data = normalize_schedule_data(None, ["climate.salon"])

                async def save() -> None:
                    return None

                manager = FakeClimateManager()
                scheduler = VelairScheduler(FakeHass(), data, manager, save)
                await scheduler.async_set_profile(_profile(temperature=18))
                await scheduler.async_set_velair_mode(
                    {"key": "away-mode", "name": "Away", "profile_ids": ["away"]}
                )
                await scheduler.async_select_velair_mode("away-mode")
                manager.calls.clear()

                await scheduler.async_start(
                    apply_current_schedule=apply_current_schedule
                )

                self.assertEqual(scheduler.active_profile_ids, ["away"])
                self.assertEqual(scheduler.active_mode_id, "away-mode")
                if apply_current_schedule:
                    self.assertIn(
                        ("set_temperature", "climate.salon", 18.0, True, "heat"),
                        manager.calls,
                    )
                else:
                    self.assertEqual(manager.calls, [])

    async def test_mode_and_profile_deletion_have_distinct_active_behavior(self) -> None:
        await self._add_away()
        await self.scheduler.async_select_velair_mode("away-mode")
        await self.scheduler.async_delete_velair_mode("away-mode")
        self.assertEqual(self.scheduler.active_profile_ids, ["away"])
        self.assertIsNone(self.scheduler.active_mode_id)

        await self.scheduler.async_set_velair_mode(
            {"key": "away-mode", "name": "Away", "profile_ids": ["away"]}
        )
        await self.scheduler.async_select_velair_mode("away-mode")
        await self.scheduler.async_delete_profile("away")
        self.assertEqual(self.scheduler.active_profile_ids, [])
        self.assertIsNone(self.scheduler.active_mode_id)
        self.assertEqual(self.scheduler.get_modes(), [])

    async def test_import_modes_validates_target_profiles_and_preserves_only_valid_marker(self) -> None:
        await self._add_away()
        await self.scheduler.async_select_velair_mode("away-mode")

        await self.scheduler.async_replace_portable_data(
            modes=[
                {"key": "away-mode", "name": "Away renamed", "profile_ids": ["away"]}
            ]
        )
        self.assertEqual(self.scheduler.active_mode_id, "away-mode")

        await self.scheduler.async_replace_portable_data(modes=[])
        self.assertEqual(self.scheduler.active_profile_ids, ["away"])
        self.assertIsNone(self.scheduler.active_mode_id)

        with self.assertRaisesRegex(ValueError, "existing profile mappings"):
            await self.scheduler.async_replace_portable_data(
                modes=[
                    {"key": "bad", "name": "Bad", "profile_ids": ["missing"]}
                ]
            )

    async def test_profile_only_import_prunes_modes_and_active_selection(self) -> None:
        await self._add_away()
        await self.scheduler.async_select_velair_mode("away-mode")

        await self.scheduler.async_replace_portable_data(profiles=[])

        self.assertEqual(self.scheduler.get_profiles(), [])
        self.assertEqual(self.scheduler.get_modes(), [])
        self.assertEqual(self.scheduler.active_profile_ids, [])
        self.assertIsNone(self.scheduler.active_mode_id)

    async def test_profile_only_import_rejects_conflicts_in_the_active_set(self) -> None:
        data = normalize_schedule_data(
            None,
            ["climate.salon", "climate.bedroom"],
        )

        async def save() -> None:
            return None

        scheduler = VelairScheduler(FakeHass(), data, FakeClimateManager(), save)
        away = _profile(key="away")
        bedroom = _profile(key="bedroom")
        bedroom["zones"]["climate.bedroom"] = bedroom["zones"].pop(
            "climate.salon"
        )
        await scheduler.async_set_profile(away)
        await scheduler.async_set_profile(bedroom)
        await scheduler.async_set_velair_mode(
            {
                "key": "whole-home",
                "name": "Whole home",
                "profile_ids": ["away", "bedroom"],
            }
        )
        await scheduler.async_select_velair_mode("whole-home")
        conflicting_bedroom = deepcopy(bedroom)
        conflicting_bedroom["zones"]["climate.salon"] = (
            conflicting_bedroom["zones"].pop("climate.bedroom")
        )
        before = deepcopy(data)

        with self.assertRaisesRegex(ValueError, "active set configure the same zone"):
            await scheduler.async_replace_portable_data(
                profiles=[away, conflicting_bedroom]
            )

        self.assertEqual(data, before)

    async def test_edit_rejects_conflict_in_manual_multi_profile_set(self) -> None:
        data = normalize_schedule_data(
            None,
            ["climate.salon", "climate.bedroom"],
        )

        async def save() -> None:
            return None

        scheduler = VelairScheduler(FakeHass(), data, FakeClimateManager(), save)
        away = _profile(key="away")
        bedroom = _profile(key="bedroom")
        bedroom["zones"]["climate.bedroom"] = bedroom["zones"].pop(
            "climate.salon"
        )
        await scheduler.async_set_profile(away)
        await scheduler.async_set_profile(bedroom)
        await scheduler.async_set_velair_mode(
            {
                "key": "whole-home",
                "name": "Whole home",
                "profile_ids": ["away", "bedroom"],
            }
        )
        await scheduler.async_select_velair_mode("whole-home")
        await scheduler.async_delete_velair_mode("whole-home")
        conflicting_bedroom = deepcopy(bedroom)
        conflicting_bedroom["zones"]["climate.salon"] = (
            conflicting_bedroom["zones"].pop("climate.bedroom")
        )
        before = deepcopy(data)

        with self.assertRaisesRegex(
            ValueError,
            "Active profiles cannot configure the same zone",
        ):
            await scheduler.async_set_profile(conflicting_bedroom)

        self.assertEqual(data, before)

    async def test_import_remapped_selected_mode_never_activates_new_profile(self) -> None:
        for combined in (False, True):
            with self.subTest(combined=combined):
                data = normalize_schedule_data(None, ["climate.salon"])

                async def save() -> None:
                    return None

                manager = FakeClimateManager()
                scheduler = VelairScheduler(FakeHass(), data, manager, save)
                await scheduler.async_set_profile(_profile())
                await scheduler.async_set_velair_mode(
                    {"key": "away-mode", "name": "Away", "profile_ids": ["away"]}
                )
                await scheduler.async_set_profile(
                    _profile(key="summer", temperature=24)
                )
                await scheduler.async_select_velair_mode("away-mode")
                manager.calls.clear()
                scheduler._hass.bus.events.clear()
                replacement_modes = [
                    {"key": "away-mode", "name": "Away", "profile_ids": ["summer"]}
                ]

                if combined:
                    await scheduler.async_replace_portable_data(
                        profiles=scheduler.get_profiles(),
                        modes=replacement_modes,
                    )
                else:
                    await scheduler.async_replace_portable_data(
                        modes=replacement_modes
                    )

                self.assertEqual(scheduler.active_profile_ids, ["away"])
                self.assertIsNone(scheduler.active_mode_id)
                self.assertFalse(
                    any(
                        event.get("profile_ids") == ["summer"]
                        for _event_type, event in scheduler._hass.bus.events
                    )
                )
                if not combined:
                    self.assertEqual(manager.calls, [])

    async def test_selected_mode_rename_does_not_reapply_or_fire_profile_event(self) -> None:
        await self._add_away()
        await self.scheduler.async_select_velair_mode("away-mode")
        self.manager.calls.clear()
        self.scheduler._hass.bus.events.clear()
        saves_before = self.saves

        await self.scheduler.async_set_velair_mode(
            {"key": "away-mode", "name": "Vacation", "profile_ids": ["away"]}
        )

        self.assertEqual(self.scheduler.active_profile_ids, ["away"])
        self.assertEqual(self.scheduler.active_mode_id, "away-mode")
        self.assertEqual(self.scheduler.get_modes()[0]["name"], "Vacation")
        self.assertEqual(self.manager.calls, [])
        self.assertFalse(
            any(
                event.get("event") == "profile_changed"
                for _event_type, event in self.scheduler._hass.bus.events
            )
        )
        self.assertEqual(self.saves, saves_before + 1)

    async def test_selected_mode_remap_transitions_profile_and_keeps_selection(self) -> None:
        await self._add_away()
        await self.scheduler.async_set_profile(_profile(key="summer", temperature=24))
        await self.scheduler.async_select_velair_mode("away-mode")
        self.manager.calls.clear()
        self.scheduler._hass.bus.events.clear()

        await self.scheduler.async_set_velair_mode(
            {"key": "away-mode", "name": "Away", "profile_ids": ["summer"]}
        )

        self.assertEqual(self.scheduler.active_profile_ids, ["summer"])
        self.assertEqual(self.scheduler.active_mode_id, "away-mode")
        self.assertIn(
            ("set_temperature", "climate.salon", 24.0, True, "heat"),
            self.manager.calls,
        )
        profile_events = [
            event
            for event_type, event in self.scheduler._hass.bus.events
            if event_type == "velair_event"
            and event.get("event") == "profile_changed"
        ]
        self.assertEqual(profile_events[-1]["previous_profile_ids"], ["away"])
        self.assertEqual(profile_events[-1]["profile_ids"], ["summer"])
        self.assertEqual(profile_events[-1]["source"], "mode_updated")

    async def test_selected_mode_remap_rolls_back_mode_and_profile_on_save_failure(self) -> None:
        await self._add_away()
        await self.scheduler.async_set_profile(_profile(key="summer", temperature=24))
        await self.scheduler.async_select_velair_mode("away-mode")
        before = deepcopy(self.data)
        self.manager.calls.clear()

        async def fail_save() -> None:
            raise RuntimeError("storage unavailable")

        self.scheduler._async_save_data = fail_save
        with self.assertRaisesRegex(RuntimeError, "storage unavailable"):
            await self.scheduler.async_set_velair_mode(
                {"key": "away-mode", "name": "Away", "profile_ids": ["summer"]}
            )

        self.assertEqual(self.data, before)
        self.assertEqual(self.manager.calls, [])


def _load_select_module():
    module_names = (
        "homeassistant.components.select",
        "homeassistant.helpers.entity_platform",
        "custom_components.velair.entity",
    )
    previous = {name: sys.modules.get(name) for name in module_names}
    package = sys.modules["custom_components.velair"]
    previous_entry_type = getattr(package, "VelairConfigEntry", None)

    class FakeVelairEntity:
        def __init__(self, entry, key: str) -> None:
            self._entry = entry
            self._attr_unique_id = f"{entry.entry_id}_{key}"

        @property
        def scheduler(self):
            return self._entry.runtime_data.scheduler

    try:
        platform = ModuleType("homeassistant.components.select")
        platform.SelectEntity = object
        sys.modules["homeassistant.components.select"] = platform
        entity_platform = ModuleType("homeassistant.helpers.entity_platform")
        entity_platform.AddConfigEntryEntitiesCallback = object
        sys.modules["homeassistant.helpers.entity_platform"] = entity_platform
        entity = ModuleType("custom_components.velair.entity")
        entity.VelairEntity = FakeVelairEntity
        sys.modules["custom_components.velair.entity"] = entity
        package.VelairConfigEntry = object
        return importlib.import_module("custom_components.velair.select")
    finally:
        for name, old in previous.items():
            if old is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = old
        if previous_entry_type is None:
            delattr(package, "VelairConfigEntry")
        else:
            package.VelairConfigEntry = previous_entry_type


select_module = _load_select_module()


class VelairModeSelectEntityTest(unittest.IsolatedAsyncioTestCase):
    """Verify native select options, state derivation, and forwarding."""

    async def test_builtins_and_custom_selection(self) -> None:
        scheduler = SimpleNamespace(
            temperature_migration_blocked=False,
            active_profile_ids=[],
            active_mode_id=None,
            get_modes=lambda: [
                {"key": "away-mode", "name": "Away", "profile_ids": ["away"]}
            ],
            async_deactivate_profile=AsyncMock(),
            async_clear_velair_mode=AsyncMock(),
            async_select_velair_mode=AsyncMock(),
        )
        entry = SimpleNamespace(
            entry_id="entry", runtime_data=SimpleNamespace(scheduler=scheduler)
        )
        entity = select_module.VelairModeSelect(entry)

        self.assertEqual(entity._attr_unique_id, "entry_mode")
        self.assertEqual(entity._attr_translation_key, "mode")
        self.assertEqual(entity.options, ["Default", "Manual", "Away"])
        self.assertEqual(entity.current_option, "Default")
        scheduler.active_profile_ids = ["away"]
        self.assertEqual(entity.current_option, "Manual")
        scheduler.active_mode_id = "away-mode"
        self.assertEqual(entity.current_option, "Away")

        await entity.async_select_option("Away")
        scheduler.async_select_velair_mode.assert_awaited_once_with("away-mode")
        await entity.async_select_option("Manual")
        scheduler.async_clear_velair_mode.assert_awaited_once_with()
        await entity.async_select_option("Default")
        scheduler.async_deactivate_profile.assert_awaited_once_with(source="select")


class VelairModePortableApiTest(unittest.TestCase):
    """Verify portable v5 mode sections and v4 compatibility."""

    def test_v5_exports_modes_and_v4_remains_valid(self) -> None:
        data = normalize_schedule_data(
            {
                "profiles": [_profile()],
                "modes": [
                    {"key": "away-mode", "name": "Away", "profile_ids": ["away"]}
                ],
            },
            ["climate.salon"],
        )
        storage = SimpleNamespace(
            data=data,
            effective_temperature_unit=CELSIUS,
            raw_data=lambda: {
                **data,
                "global": data["global_"],
            },
        )
        runtime = {
            "storage": storage,
            "entry": SimpleNamespace(options={}),
        }
        payload = api_module._build_export_payload(runtime, ["modes"])
        self.assertEqual(payload["model_version"], 5)
        self.assertEqual(payload["sections"]["modes"], data["modes"])

        self.assertEqual(
            api_module._validate_import_payload(
                {
                    "format": api_module.EXPORT_FORMAT,
                    "model_version": 4,
                    "temperature_unit": CELSIUS,
                    "sections": {"profiles": []},
                }
            ),
            {"profiles": []},
        )

    def test_mode_only_import_requires_local_profile(self) -> None:
        data = normalize_schedule_data(None, ["climate.salon"])
        runtime = {
            "storage": SimpleNamespace(
                data=data,
                effective_temperature_unit=CELSIUS,
                _hass=FakeHass(),
            )
        }
        payload = {
            "format": api_module.EXPORT_FORMAT,
            "model_version": 5,
            "temperature_unit": CELSIUS,
            "sections": {
                "modes": [
                    {"key": "away-mode", "name": "Away", "profile_ids": ["away"]}
                ]
            },
        }
        with self.assertRaisesRegex(ValueError, "existing profile mappings"):
            api_module._build_import_data(runtime, payload, ["modes"])


if __name__ == "__main__":
    unittest.main()
