"""Climate profile backend tests."""

from __future__ import annotations

import asyncio
from copy import deepcopy
import unittest
from types import SimpleNamespace

from .helpers import (
    ACTION_SET_TEMPERATURE,
    FakeClimateManager,
    FakeHass,
    MODE_PAUSED,
    NOW,
    VelairScheduler,
    normalize_schedule_data,
)
from custom_components.velair.models import (
    climate_profile_color,
    normalize_climate_profiles,
    validate_climate_profiles,
)
from custom_components.velair.const import MAX_PROFILE_DESCRIPTION_LENGTH
from custom_components.velair.scheduler import _RoomSensorAssistState
from custom_components.velair.storage import convert_portable_temperature_data
from custom_components.velair.temperature import CELSIUS, FAHRENHEIT


def _profile(
    *,
    key: str = "away",
    behavior: str = "schedule",
    temperature: float = 18,
    action: str = "none",
) -> dict:
    zone: dict = {"behavior": behavior}
    if behavior == "schedule":
        zone["schedule"] = {
            weekday: (
                [{"start": "17:00", "temperature": temperature, "hvac_mode": "heat"}]
                if weekday == "tuesday"
                else []
            )
            for weekday in (
                "monday", "tuesday", "wednesday", "thursday",
                "friday", "saturday", "sunday",
            )
        }
    if behavior == "pause":
        zone["action"] = action
    return {
        "key": key,
        "name": "Away",
        "icon": "mdi:home-export-outline",
        "description": "Reduced climate use",
        "zones": {"climate.salon": zone},
    }


class ProfileNormalizationTest(unittest.TestCase):
    def test_normalization_persists_explicit_or_stable_default_color(self) -> None:
        legacy_profile = _profile()
        explicit_profile = _profile(key="summer")
        explicit_profile["color"] = "#ABCDEF"

        normalized = normalize_climate_profiles(
            [legacy_profile, explicit_profile],
            ["climate.salon"],
        )

        self.assertEqual(normalized[0]["color"], climate_profile_color("away"))
        self.assertEqual(normalized[1]["color"], "#abcdef")

    def test_normalization_drops_unmanaged_zones_and_hydrates_week(self) -> None:
        profile = _profile()
        profile["zones"]["climate.unmanaged"] = {"behavior": "pause"}
        profile["zones"]["climate.salon"]["schedule"] = {
            "tuesday": [{"start": "7:00", "temperature": 24, "hvac_mode": "cool"}]
        }

        normalized = normalize_climate_profiles([profile], ["climate.salon"])

        self.assertEqual(set(normalized[0]["zones"]), {"climate.salon"})
        schedule = normalized[0]["zones"]["climate.salon"]["schedule"]
        self.assertEqual(set(schedule), {
            "monday", "tuesday", "wednesday", "thursday",
            "friday", "saturday", "sunday",
        })
        self.assertEqual(schedule["tuesday"][0]["hvac_mode"], "cool")

    def test_active_profile_is_persisted_only_when_definition_exists(self) -> None:
        data = normalize_schedule_data(
            {"global": {"mode": "auto", "active_profile_id": "away"}, "profiles": [_profile()]},
            ["climate.salon"],
        )
        self.assertEqual(data["global_"]["active_profile_id"], "away")
        self.assertEqual(data["version"], 2)

        missing = normalize_schedule_data(
            {"global": {"mode": "auto", "active_profile_id": "missing"}, "profiles": [_profile()]},
            ["climate.salon"],
        )
        self.assertIsNone(missing["global_"]["active_profile_id"])

    def test_profile_schedule_temperatures_convert_and_snap(self) -> None:
        profile = _profile(temperature=20)
        hass = SimpleNamespace(
            states={
                "climate.salon": SimpleNamespace(
                    attributes={"min_temp": 41, "max_temp": 95, "target_temp_step": 1}
                )
            }
        )

        converted = convert_portable_temperature_data(
            {"profiles": [profile]}, CELSIUS, FAHRENHEIT, hass
        )

        self.assertEqual(
            converted["profiles"][0]["zones"]["climate.salon"]["schedule"]["tuesday"][0]["temperature"],
            68,
        )

    def test_strict_validation_rejects_malformed_or_lossy_profiles(self) -> None:
        duplicate = [_profile(), _profile()]
        null_temperature = _profile()
        null_temperature["zones"]["climate.salon"]["schedule"]["tuesday"][0][
            "temperature"
        ] = None
        malformed_block = _profile()
        malformed_block["zones"]["climate.salon"]["schedule"]["tuesday"] = [None]
        unsupported_field = _profile()
        unsupported_field["unexpected"] = True
        invalid_color = _profile()
        invalid_color["color"] = None

        cases = (
            ([None], "must be an object"),
            (duplicate, "Duplicate climate profile key"),
            ([null_temperature], "finite number"),
            ([malformed_block], "Invalid block"),
            ([unsupported_field], "unsupported fields"),
            ([invalid_color], "#RRGGBB"),
        )
        for profiles, message in cases:
            with self.subTest(message=message):
                with self.assertRaisesRegex(ValueError, message):
                    validate_climate_profiles(profiles, ["climate.salon"])

    def test_strict_validation_preserves_valid_profile_data(self) -> None:
        profile = _profile()
        profile["color"] = "#ABCDEF"

        validated = validate_climate_profiles([profile], ["climate.salon"])

        self.assertEqual(len(validated), 1)
        self.assertEqual(validated[0]["key"], "away")
        self.assertEqual(validated[0]["color"], "#abcdef")
        self.assertEqual(
            validated[0]["zones"]["climate.salon"]["schedule"]["tuesday"][0][
                "temperature"
            ],
            18.0,
        )


class ProfileSchedulerTest(unittest.IsolatedAsyncioTestCase):
    def _scheduler(self):
        data = normalize_schedule_data(None, ["climate.salon", "climate.bedroom"])
        data["zones"]["climate.salon"]["schedule"]["tuesday"] = [
            {"start": "17:00", "action": ACTION_SET_TEMPERATURE, "temperature": 21.0}
        ]
        data["zones"]["climate.bedroom"]["schedule"]["tuesday"] = [
            {"start": "17:00", "action": ACTION_SET_TEMPERATURE, "temperature": 20.0}
        ]
        manager = FakeClimateManager()
        saves: list[bool] = []

        async def save() -> None:
            saves.append(True)

        scheduler = VelairScheduler(FakeHass(), data, manager, save)
        return scheduler, data, manager, saves

    async def test_activation_uses_profile_schedule_and_omitted_zone_normal(self) -> None:
        scheduler, data, manager, _saves = self._scheduler()
        await scheduler.async_set_profile(_profile(temperature=18))

        await scheduler.async_activate_profile("away")

        self.assertEqual(data["global_"]["active_profile_id"], "away")
        self.assertIn(("set_temperature", "climate.salon", 18.0, True, "heat"), manager.calls)
        self.assertEqual(scheduler.get_current_event("climate.bedroom").temperature, 20.0)
        self.assertTrue(
            scheduler._room_sensor_assist_scheduled_target_exists(
                "climate.salon",
                "tuesday",
                "17:00",
                18.0,
                "heat",
            )
        )
        self.assertFalse(
            scheduler._room_sensor_assist_scheduled_target_exists(
                "climate.salon",
                "tuesday",
                "17:00",
                21.0,
                None,
            )
        )

    async def test_activation_applies_a_cooling_profile_schedule(self) -> None:
        scheduler, _data, manager, _saves = self._scheduler()
        profile = _profile(temperature=24)
        profile["zones"]["climate.salon"]["schedule"]["tuesday"][0][
            "hvac_mode"
        ] = "cool"
        await scheduler.async_set_profile(profile)

        await scheduler.async_activate_profile("away")

        self.assertIn(
            ("set_temperature", "climate.salon", 24.0, True, "cool"),
            manager.calls,
        )

    async def test_updating_the_active_profile_reapplies_its_changed_schedule(self) -> None:
        scheduler, data, manager, _saves = self._scheduler()
        await scheduler.async_set_profile(_profile(temperature=18))
        await scheduler.async_activate_profile("away")
        manager.calls.clear()

        await scheduler.async_set_profile(_profile(temperature=19))

        self.assertEqual(data["global_"]["active_profile_id"], "away")
        self.assertIn(
            ("set_temperature", "climate.salon", 19.0, True, "heat"),
            manager.calls,
        )

    async def test_one_climate_failure_does_not_block_other_affected_zones(self) -> None:
        scheduler, data, manager, saves = self._scheduler()
        profile = _profile(temperature=18)
        profile["zones"]["climate.bedroom"] = deepcopy(
            profile["zones"]["climate.salon"]
        )
        profile["zones"]["climate.bedroom"]["schedule"]["tuesday"][0][
            "temperature"
        ] = 19
        await scheduler.async_set_profile(profile)
        manager.calls.clear()
        original_set_temperature = manager.async_set_temperature

        async def fail_salon(entity_id, temperature, **kwargs):
            if entity_id == "climate.salon":
                raise RuntimeError("device unavailable")
            await original_set_temperature(entity_id, temperature, **kwargs)

        manager.async_set_temperature = fail_salon

        with self.assertLogs("custom_components.velair.scheduler", level="ERROR") as logs:
            await scheduler.async_activate_profile("away")

        self.assertEqual(data["global_"]["active_profile_id"], "away")
        self.assertTrue(saves)
        self.assertIn("Failed to apply profile behavior for climate.salon", logs.output[0])
        self.assertIn(
            ("set_temperature", "climate.bedroom", 19.0, True, "heat"),
            manager.calls,
        )

    async def test_next_events_use_profile_schedule_normal_fallback_and_pause(self) -> None:
        scheduler, _data, _manager, _saves = self._scheduler()
        await scheduler.async_set_profile(_profile(temperature=18))
        await scheduler.async_activate_profile("away")

        events = {
            event.entity_id: event
            for event in scheduler.calculate_next_events_by_zone(NOW)
        }
        self.assertEqual(events["climate.salon"].temperature, 18.0)
        self.assertEqual(events["climate.salon"].hvac_mode, "heat")
        self.assertEqual(events["climate.bedroom"].temperature, 20.0)

        await scheduler.async_set_profile(
            _profile(behavior="pause", action="none")
        )
        events = {
            event.entity_id: event
            for event in scheduler.calculate_next_events_by_zone(NOW)
        }
        self.assertNotIn("climate.salon", events)
        self.assertEqual(events["climate.bedroom"].temperature, 20.0)

    async def test_preconditioning_replan_candidates_use_profile_schedule(self) -> None:
        scheduler, data, _manager, _saves = self._scheduler()
        for blocks in data["zones"]["climate.salon"]["schedule"].values():
            blocks.clear()
        data["zones"]["climate.salon"]["preconditioning"]["enabled"] = True
        await scheduler.async_set_profile(_profile(temperature=18))
        await scheduler.async_activate_profile("away")

        self.assertIn(
            "climate.salon",
            scheduler._preconditioning_replan_entity_ids(NOW),
        )

    async def test_profile_write_rejects_unmanaged_zone(self) -> None:
        scheduler, _data, _manager, _saves = self._scheduler()
        profile = _profile()
        profile["zones"]["climate.unmanaged"] = {"behavior": "pause"}

        with self.assertRaisesRegex(ValueError, "not managed"):
            await scheduler.async_set_profile(profile)

    async def test_profile_write_rejects_null_temperature_without_mutation(self) -> None:
        scheduler, data, manager, saves = self._scheduler()
        profile = _profile()
        profile["zones"]["climate.salon"]["schedule"]["tuesday"][0][
            "temperature"
        ] = None
        before = deepcopy(data)

        with self.assertRaisesRegex(ValueError, "finite number"):
            await scheduler.async_set_profile(profile)

        self.assertEqual(data, before)
        self.assertEqual(manager.calls, [])
        self.assertEqual(saves, [])

    async def test_profile_write_rejects_an_explicit_invalid_key(self) -> None:
        scheduler, data, _manager, saves = self._scheduler()
        profile = _profile()
        profile["key"] = 123
        before = deepcopy(data)

        with self.assertRaisesRegex(ValueError, "key must be non-empty text"):
            await scheduler.async_set_profile(profile)

        self.assertEqual(data, before)
        self.assertEqual(saves, [])

    async def test_unknown_profile_activation_and_deletion_are_rejected(self) -> None:
        scheduler, data, manager, saves = self._scheduler()

        with self.assertRaisesRegex(ValueError, "Unknown climate profile"):
            await scheduler.async_activate_profile("missing")
        with self.assertRaisesRegex(ValueError, "Unknown climate profile"):
            await scheduler.async_delete_profile("missing")

        self.assertIsNone(data["global_"]["active_profile_id"])
        self.assertEqual(manager.calls, [])
        self.assertEqual(saves, [])

    async def test_profile_color_is_persisted_and_validated(self) -> None:
        scheduler, data, _manager, _saves = self._scheduler()
        profile = _profile()
        profile["color"] = "#A1B2C3"

        await scheduler.async_set_profile(profile)
        self.assertEqual(data["profiles"][0]["color"], "#a1b2c3")

        profile["color"] = "blue"
        with self.assertRaisesRegex(ValueError, "#RRGGBB"):
            await scheduler.async_set_profile(profile)
        with self.assertRaisesRegex(ValueError, "#RRGGBB"):
            await scheduler.async_replace_portable_data(profiles=[profile])

    async def test_profile_description_length_is_enforced_for_writes_and_imports(self) -> None:
        scheduler, _data, _manager, _saves = self._scheduler()
        profile = _profile()
        profile["description"] = "a" * MAX_PROFILE_DESCRIPTION_LENGTH
        await scheduler.async_set_profile(profile)

        profile["description"] += "a"
        with self.assertRaisesRegex(ValueError, "characters or fewer"):
            await scheduler.async_set_profile(profile)
        with self.assertRaisesRegex(ValueError, "characters or fewer"):
            await scheduler.async_replace_portable_data(profiles=[profile])

    async def test_invalid_profile_keeps_multisection_import_atomic(self) -> None:
        scheduler, data, _manager, _saves = self._scheduler()
        before = deepcopy(data)
        profile = _profile()
        profile["description"] = "a" * (MAX_PROFILE_DESCRIPTION_LENGTH + 1)
        replacement_zones = deepcopy(data["zones"])
        replacement_zones["climate.salon"]["schedule"]["tuesday"] = []

        with self.assertRaisesRegex(ValueError, "characters or fewer"):
            await scheduler.async_replace_portable_data(
                zones=replacement_zones,
                settings={
                    **data["settings"],
                    "first_weekday": "sunday",
                },
                profiles=[profile],
            )

        self.assertEqual(data, before)

    async def test_activation_rolls_back_runtime_when_storage_fails(self) -> None:
        scheduler, data, manager, _saves = self._scheduler()
        await scheduler.async_set_profile(_profile(temperature=18))

        async def fail_save() -> None:
            raise RuntimeError("storage unavailable")

        scheduler._async_save_data = fail_save
        with self.assertRaisesRegex(RuntimeError, "storage unavailable"):
            await scheduler.async_activate_profile("away")

        self.assertIsNone(data["global_"]["active_profile_id"])
        self.assertEqual(manager.calls, [])

    async def test_profile_definition_mutations_roll_back_when_storage_fails(self) -> None:
        scheduler, data, _manager, _saves = self._scheduler()
        await scheduler.async_set_profile(_profile(temperature=18))
        before = deepcopy(data)

        async def fail_save() -> None:
            raise RuntimeError("storage unavailable")

        scheduler._async_save_data = fail_save
        with self.assertRaisesRegex(RuntimeError, "storage unavailable"):
            await scheduler.async_set_profile(_profile(key="summer", temperature=24))
        self.assertEqual(data, before)

        with self.assertRaisesRegex(RuntimeError, "storage unavailable"):
            await scheduler.async_delete_profile("away")
        self.assertEqual(data, before)

    async def test_startup_applies_persisted_profile_pause_off_when_enabled(self) -> None:
        scheduler, data, manager, _saves = self._scheduler()
        await scheduler.async_set_profile(_profile(behavior="pause", action="turn_off"))
        data["global_"]["active_profile_id"] = "away"
        manager.calls.clear()

        await scheduler.async_start(apply_current_schedule=True)

        self.assertIn(("turn_off", "climate.salon"), manager.calls)

    async def test_startup_keeps_persisted_profile_without_forcing_climates_when_disabled(self) -> None:
        scheduler, data, manager, _saves = self._scheduler()
        await scheduler.async_set_profile(_profile(temperature=18))
        data["global_"]["active_profile_id"] = "away"
        manager.calls.clear()

        await scheduler.async_start(apply_current_schedule=False)

        self.assertEqual(data["global_"]["active_profile_id"], "away")
        self.assertEqual(manager.calls, [])
        self.assertEqual(scheduler.get_current_event("climate.salon").temperature, 18.0)

    async def test_startup_applies_persisted_profile_schedule_when_enabled(self) -> None:
        scheduler, data, manager, _saves = self._scheduler()
        await scheduler.async_set_profile(_profile(temperature=18))
        data["global_"]["active_profile_id"] = "away"
        manager.calls.clear()

        await scheduler.async_start(apply_current_schedule=True)

        self.assertEqual(data["global_"]["active_profile_id"], "away")
        self.assertIn(
            ("set_temperature", "climate.salon", 18.0, True, "heat"),
            manager.calls,
        )

    async def test_concurrent_activations_are_serialized(self) -> None:
        scheduler, data, _manager, _saves = self._scheduler()
        await scheduler.async_set_profile(_profile(key="away", temperature=18))
        await scheduler.async_set_profile(_profile(key="summer", temperature=24))
        first_save_started = asyncio.Event()
        release_first_save = asyncio.Event()
        save_count = 0

        async def gated_save() -> None:
            nonlocal save_count
            save_count += 1
            if save_count == 1:
                first_save_started.set()
                await release_first_save.wait()

        scheduler._async_save_data = gated_save
        first = asyncio.create_task(scheduler.async_activate_profile("away"))
        await first_save_started.wait()
        second = asyncio.create_task(scheduler.async_activate_profile("summer"))
        await asyncio.sleep(0)

        self.assertFalse(second.done())
        release_first_save.set()
        await asyncio.gather(first, second)

        self.assertEqual(data["global_"]["active_profile_id"], "summer")
        self.assertEqual(save_count, 2)

    async def test_profile_pause_restores_room_assist_target_before_holding(self) -> None:
        scheduler, _data, manager, _saves = self._scheduler()
        await scheduler.async_set_profile(_profile(behavior="pause", action="none"))
        scheduler._room_sensor_assist_states["climate.salon"] = _RoomSensorAssistState(
            entity_id="climate.salon",
            target_temperature=21.0,
            applied_temperature=23.0,
            direction="heat",
            hvac_mode="heat",
            room_temperature_entity_id="sensor.salon_temperature",
            weekday="tuesday",
            start="17:00",
        )

        await scheduler.async_activate_profile("away")

        self.assertIn(
            ("set_temperature", "climate.salon", 21.0, False, "heat"),
            manager.calls,
        )
        self.assertNotIn("climate.salon", scheduler._room_sensor_assist_states)

    async def test_portable_replacement_reapplies_active_profile_or_normal(self) -> None:
        scheduler, data, manager, _saves = self._scheduler()
        await scheduler.async_set_profile(_profile(temperature=18))
        await scheduler.async_activate_profile("away")
        manager.calls.clear()

        imported = normalize_climate_profiles(
            [_profile(temperature=24)],
            list(data["zones"]),
        )
        await scheduler.async_replace_portable_data(profiles=imported)

        self.assertEqual(data["global_"]["active_profile_id"], "away")
        self.assertIn(("set_temperature", "climate.salon", 24.0, True, "heat"), manager.calls)

        manager.calls.clear()
        await scheduler.async_replace_portable_data(profiles=[])

        self.assertIsNone(data["global_"]["active_profile_id"])
        self.assertIn(("set_temperature", "climate.salon", 21.0, True, None), manager.calls)

    async def test_profile_pause_turns_off_and_clears_boost_without_restoration(self) -> None:
        scheduler, data, manager, _saves = self._scheduler()
        await scheduler.async_set_profile(_profile(behavior="pause", action="turn_off"))
        data["zones"]["climate.salon"]["override"] = {
            "type": "boost", "temperature": 23, "previous_state": {"temperature": 21}
        }

        await scheduler.async_activate_profile("away")

        self.assertIsNone(data["zones"]["climate.salon"]["override"])
        self.assertIn(("turn_off", "climate.salon"), manager.calls)
        self.assertFalse(any(call[0] == "restore_state" for call in manager.calls))
        self.assertIsNone(scheduler.get_current_event("climate.salon"))

    async def test_activation_preserves_boosts_in_unchanged_zones(self) -> None:
        scheduler, data, _manager, _saves = self._scheduler()
        salon_boost = {"type": "boost", "temperature": 23, "previous_state": {}}
        bedroom_boost = {"type": "boost", "temperature": 22, "previous_state": {}}
        data["zones"]["climate.salon"]["override"] = deepcopy(salon_boost)
        data["zones"]["climate.bedroom"]["override"] = deepcopy(bedroom_boost)
        await scheduler.async_set_profile(_profile(temperature=18))

        await scheduler.async_activate_profile("away")

        self.assertIsNone(data["zones"]["climate.salon"]["override"])
        self.assertEqual(
            data["zones"]["climate.bedroom"]["override"],
            bedroom_boost,
        )

    async def test_zone_pause_outranks_profile_activation(self) -> None:
        scheduler, data, manager, _saves = self._scheduler()
        await scheduler.async_set_profile(_profile(temperature=18))
        data["zones"]["climate.salon"]["override"] = {
            "type": "pause",
            "started_at": NOW.isoformat(),
            "until": None,
            "action": "none",
        }
        manager.calls.clear()

        await scheduler.async_activate_profile("away")

        self.assertEqual(data["global_"]["active_profile_id"], "away")
        self.assertEqual(manager.calls, [])

    async def test_global_pause_outranks_profile_activation(self) -> None:
        scheduler, data, manager, _saves = self._scheduler()
        await scheduler.async_set_profile(_profile(behavior="pause", action="turn_off"))
        data["global_"]["mode"] = MODE_PAUSED

        await scheduler.async_activate_profile("away")

        self.assertEqual(manager.calls, [])
        self.assertEqual(data["global_"]["active_profile_id"], "away")

    async def test_deactivation_is_idempotent_and_applies_normal_schedule(self) -> None:
        scheduler, data, manager, saves = self._scheduler()
        await scheduler.async_set_profile(_profile(temperature=18))
        await scheduler.async_activate_profile("away")
        manager.calls.clear()
        before = len(saves)

        await scheduler.async_activate_profile(None)
        await scheduler.async_activate_profile(None)

        self.assertEqual(data["global_"]["active_profile_id"], None)
        self.assertIn(("set_temperature", "climate.salon", 21.0, True, None), manager.calls)
        self.assertEqual(len(saves), before + 1)

    async def test_activation_and_active_deletion_fire_profile_changed_events(self) -> None:
        scheduler, data, _manager, _saves = self._scheduler()
        await scheduler.async_set_profile(_profile(temperature=18))
        scheduler._hass.bus.events.clear()

        await scheduler.async_activate_profile("away")
        await scheduler.async_delete_profile("away")

        events = [
            event_data
            for event_type, event_data in scheduler._hass.bus.events
            if event_type == "velair_event"
            and event_data.get("event") == "profile_changed"
        ]
        self.assertEqual(
            events,
            [
                {
                    "domain": "velair",
                    "event": "profile_changed",
                    "profile_id": "away",
                    "previous_profile_id": None,
                },
                {
                    "domain": "velair",
                    "event": "profile_changed",
                    "profile_id": None,
                    "previous_profile_id": "away",
                },
            ],
        )
        self.assertEqual(data["profiles"], [])
        self.assertIsNone(data["global_"]["active_profile_id"])


if __name__ == "__main__":
    unittest.main()
