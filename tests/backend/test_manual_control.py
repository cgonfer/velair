"""Manual-adjustment policy tests."""

from __future__ import annotations

from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock
from datetime import timedelta
import asyncio

from .helpers import (
    FakeClimateManager,
    FakeHass,
    VelairScheduler,
    empty_week_schedule,
    normalize_schedule_data,
    NOW,
)
from custom_components.velair.climate_change_monitor import (
    ClimateChangeMonitor,
    _control_change,
)
from custom_components.velair.api import _export_zones
from custom_components.velair.const import (
    EXTERNAL_CHANGE_POLICY_OPTIONS,
    MANUAL_ADJUSTMENT_POLICY_OPTIONS,
)


class ManualControlTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.entity_id = "climate.salon"
        self.hass = FakeHass()
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="cool",
            attributes={"temperature": 24, "current_temperature": 26},
        )
        self.data = normalize_schedule_data(
            {
                "zones": {
                    self.entity_id: {
                        "enabled": True,
                        "schedule": empty_week_schedule(),
                    }
                }
            },
            [self.entity_id],
        )
        self.saved = 0
        self.fail_save = False
        self.scheduler = VelairScheduler(
            self.hass, self.data, FakeClimateManager(), self._save
        )

    async def _save(self) -> None:
        if self.fail_save:
            raise RuntimeError("save failed")
        self.saved += 1

    def test_default_policy_keeps_automatic_control(self) -> None:
        policy = self.data["zones"][self.entity_id]["external_change_policy"]
        self.assertEqual("keep_automatic", policy["action"])
        self.assertEqual(120, policy["duration_minutes"])
        self.assertFalse(any(
            item.get("pause_id") == "velair.manual_adjustment"
            for item in self.data["zones"][self.entity_id]["pauses"]
        ))

    def test_explicit_legacy_duration_is_preserved(self) -> None:
        data = normalize_schedule_data(
            {
                "zones": {
                    self.entity_id: {
                        "enabled": True,
                        "schedule": empty_week_schedule(),
                        "external_change_policy": {
                            "action": "for_duration",
                            "duration_minutes": 60,
                        },
                    }
                }
            },
            [self.entity_id],
        )

        self.assertEqual(
            {"action": "for_duration", "duration_minutes": 60},
            data["zones"][self.entity_id]["external_change_policy"],
        )

    def test_all_existing_manual_policy_values_remain_persisted(self) -> None:
        for action in ("until_next_block", "for_duration", "until_resumed"):
            with self.subTest(action=action):
                data = normalize_schedule_data(
                    {
                        "zones": {
                            self.entity_id: {
                                "enabled": True,
                                "schedule": empty_week_schedule(),
                                "external_change_policy": {
                                    "action": action,
                                    "duration_minutes": 75,
                                },
                            }
                        }
                    },
                    [self.entity_id],
                )
                self.assertEqual(
                    {"action": action, "duration_minutes": 75},
                    data["zones"][self.entity_id]["external_change_policy"],
                )

    async def test_duration_policy_enters_and_resumes_manual_control(self) -> None:
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "for_duration", "duration_minutes": 30}
        )
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 24.0},
            current={"temperature": 23.0},
        )

        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertEqual("manual", runtime["control_mode"])
        self.assertEqual("manual", runtime["control_mode"])
        self.assertEqual(
            "velair.manual_adjustment",
            self.data["zones"][self.entity_id]["pauses"][0]["pause_id"],
        )

        await self.scheduler.async_resume_automatic_control(self.entity_id)
        self.assertEqual(
            "automatic",
            self.scheduler.get_zone_runtime_statuses()[self.entity_id]["control_mode"],
        )
        self.assertFalse(any(
            item.get("pause_id") == "velair.manual_adjustment"
            for item in self.data["zones"][self.entity_id]["pauses"]
        ))

    async def test_default_policy_reports_external_change_without_entering_manual(self) -> None:
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["hvac_mode"],
            previous={"hvac_mode": "off"},
            current={"hvac_mode": "heat"},
        )
        self.assertFalse(any(
            item.get("pause_id") == "velair.manual_adjustment"
            for item in self.data["zones"][self.entity_id]["pauses"]
        ))
        event = next(
            data for _event_type, data in self.hass.bus.events
            if data.get("event") == "external_climate_change_detected"
        )
        self.assertEqual("keep_automatic", event["policy"])
        self.assertFalse(any(
            data.get("event") == "zone_control_changed"
            for _event_type, data in self.hass.bus.events
        ))

    async def test_keep_automatic_reapplies_scalar_heat_and_cool_schedule_targets(self) -> None:
        for hvac_mode, target in (("heat", 21.0), ("cool", 24.0)):
            with self.subTest(hvac_mode=hvac_mode):
                self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [{
                    "start": "00:00",
                    "action": "set_temperature",
                    "temperature": target,
                    "hvac_mode": hvac_mode,
                }]
                self.scheduler._climate_manager.calls.clear()
                await self.scheduler.async_handle_external_climate_change(
                    self.entity_id,
                    changed_fields=["temperature"],
                    previous={"temperature": target},
                    current={"temperature": target + 1},
                )
                self.assertIn(
                    ("set_temperature", self.entity_id, target, True, hvac_mode),
                    self.scheduler._climate_manager.calls,
                )
                self.assertEqual(
                    "automatic",
                    self.scheduler.get_zone_runtime_statuses()[self.entity_id]["control_mode"],
                )

    async def test_keep_automatic_reapplies_off_and_native_range_targets(self) -> None:
        zone = self.data["zones"][self.entity_id]
        zone["schedule"]["tuesday"] = [{"start": "00:00", "action": "turn_off"}]
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["hvac_mode"],
            previous={"hvac_mode": "off"},
            current={"hvac_mode": "heat"},
        )
        self.assertIn(("turn_off", self.entity_id), self.scheduler._climate_manager.calls)

        zone["schedule"]["tuesday"] = [{
            "start": "00:00",
            "action": "set_temperature",
            "target_temp_low": 19.0,
            "target_temp_high": 24.0,
            "hvac_mode": "heat_cool",
        }]
        self.scheduler._climate_manager.temperature_range_support[self.entity_id] = True
        self.scheduler._climate_manager.hvac_modes[self.entity_id] = ["off", "heat_cool"]
        self.scheduler._climate_manager.calls.clear()
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["target_temp_low", "target_temp_high"],
            previous={"target_temp_low": 19.0, "target_temp_high": 24.0},
            current={"target_temp_low": 18.0, "target_temp_high": 25.0},
        )
        self.assertIn(
            ("set_temperature_range", self.entity_id, 19.0, 24.0, True, "heat_cool"),
            self.scheduler._climate_manager.calls,
        )

    async def test_keep_automatic_reapplies_boost_and_respects_pause_gates(self) -> None:
        self.scheduler._climate_manager.snapshots[self.entity_id] = {
            "hvac_mode": "cool", "temperature": 24.0,
        }
        await self.scheduler.async_set_zone_boost(
            self.entity_id, 20.0, (NOW + timedelta(hours=1)).isoformat(), hvac_mode="cool"
        )
        self.scheduler._climate_manager.calls.clear()
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 20.0},
            current={"temperature": 23.0},
        )
        self.assertIn(
            ("set_temperature", self.entity_id, 20.0, True, "cool"),
            self.scheduler._climate_manager.calls,
        )
        self.assertEqual("automatic", self.scheduler.get_zone_runtime_statuses()[self.entity_id]["control_mode"])

        self.data["zones"][self.entity_id]["override"] = None
        await self.scheduler.async_pause_zone(self.entity_id, pause_id="window", action="none")
        self.scheduler._climate_manager.calls.clear()
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 20.0},
            current={"temperature": 23.0},
        )
        self.assertEqual([], self.scheduler._climate_manager.calls)

    async def test_keep_automatic_respects_profile_global_disabled_stopped_and_no_target_gates(self) -> None:
        zone = self.data["zones"][self.entity_id]
        zone["schedule"]["tuesday"] = [{
            "start": "00:00", "action": "set_temperature", "temperature": 21.0,
            "hvac_mode": "heat",
        }]
        original_profile_behavior = self.scheduler._profile_zone_behavior
        for behavior, expected_call in (
            ({"behavior": "pause", "action": "none"}, None),
            ({"behavior": "pause", "action": "turn_off"}, ("turn_off", self.entity_id)),
        ):
            with self.subTest(profile_behavior=behavior):
                self.scheduler._profile_zone_behavior = lambda _entity_id, value=behavior: value
                self.scheduler._climate_manager.calls.clear()
                await self.scheduler.async_handle_external_climate_change(
                    self.entity_id,
                    changed_fields=["temperature"],
                    previous={"temperature": 21.0},
                    current={"temperature": 22.0},
                )
                if expected_call is None:
                    self.assertEqual([], self.scheduler._climate_manager.calls)
                else:
                    self.assertIn(expected_call, self.scheduler._climate_manager.calls)
        self.scheduler._profile_zone_behavior = original_profile_behavior

        for gate in ("global_pause", "disabled", "stopped", "no_target"):
            with self.subTest(gate=gate):
                self.data["global_"]["mode"] = "auto"
                zone["enabled"] = True
                self.scheduler._stopped = False
                zone["schedule"]["tuesday"] = [{
                    "start": "00:00", "action": "set_temperature", "temperature": 21.0,
                    "hvac_mode": "heat",
                }]
                if gate == "global_pause":
                    self.data["global_"]["mode"] = "paused"
                elif gate == "disabled":
                    zone["enabled"] = False
                elif gate == "stopped":
                    self.scheduler._stopped = True
                else:
                    zone["schedule"] = empty_week_schedule()
                self.scheduler._climate_manager.calls.clear()
                await self.scheduler.async_handle_external_climate_change(
                    self.entity_id,
                    changed_fields=["temperature"],
                    previous={"temperature": 21.0},
                    current={"temperature": 22.0},
                )
                self.assertEqual([], self.scheduler._climate_manager.calls)
        self.scheduler._stopped = False

    async def test_keep_automatic_delivery_uses_the_per_climate_delivery_lock(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [{
            "start": "00:00", "action": "set_temperature", "temperature": 21.0,
            "hvac_mode": "heat",
        }]

        async def assert_delivery_owner(*_args, **_kwargs):
            self.assertIs(
                asyncio.current_task(),
                self.scheduler._climate_delivery._owners.get(self.entity_id),
            )

        self.scheduler._climate_manager.async_set_temperature = assert_delivery_owner
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 22.0},
            current={"temperature": 23.0},
        )

    async def test_keep_automatic_failed_delivery_stays_automatic_and_observational(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [{
            "start": "00:00", "action": "set_temperature", "temperature": 21.0,
            "hvac_mode": "heat",
        }]
        self.scheduler._async_apply_event = AsyncMock(return_value=False)

        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 21.0},
            current={"temperature": 23.0},
        )

        self.assertEqual(
            "automatic",
            self.scheduler.get_zone_runtime_statuses()[self.entity_id]["control_mode"],
        )
        self.assertTrue(any(
            data.get("event") == "external_climate_change_detected"
            and data.get("policy") == "keep_automatic"
            for _event_type, data in self.hass.bus.events
        ))
        self.assertFalse(any(
            data.get("event") == "zone_control_changed"
            for _event_type, data in self.hass.bus.events
        ))

    async def test_keep_automatic_explicit_manual_uses_until_resumed_without_mutating_setting(self) -> None:
        self.scheduler._climate_manager.snapshots[self.entity_id] = {
            "hvac_mode": "cool", "temperature": 23.0,
        }
        await self.scheduler.async_enter_manual_adjustment(self.entity_id)
        manual = self.scheduler.get_zone_runtime_statuses()[self.entity_id]["manual_control"]
        self.assertEqual("until_resumed", manual["policy"])
        self.assertEqual("explicit", manual["source"])
        self.assertEqual(
            "keep_automatic",
            self.data["zones"][self.entity_id]["external_change_policy"]["action"],
        )

    async def test_until_resumed_entry_event_omits_null_until(self) -> None:
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "until_resumed"}
        )

        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 24.0},
            current={"temperature": 23.0},
        )

        event = next(
            data
            for _event_type, data in self.hass.bus.events
            if data.get("event") == "zone_control_changed"
            and data.get("control_mode") == "manual"
        )
        self.assertEqual("until_resumed", event["policy"])
        self.assertNotIn("until", event)

    async def test_reserved_pause_owner_rejected_from_public_pause_apis(self) -> None:
        with self.assertRaisesRegex(ValueError, "reserved"):
            await self.scheduler.async_pause_zone(
                self.entity_id, pause_id="velair.manual_adjustment"
            )
        with self.assertRaisesRegex(ValueError, "reserved"):
            await self.scheduler.async_resume_zone(
                self.entity_id, pause_id="velair.manual_adjustment"
            )

    async def test_generic_pause_and_resume_all_preserve_manual_authority(self) -> None:
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "until_resumed"}
        )
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 24.0},
            current={"temperature": 23.0},
        )
        await self.scheduler.async_pause_zone(self.entity_id, pause_id="window")
        await self.scheduler.async_resume_zone(self.entity_id, resume_all=True)
        reasons = self.data["zones"][self.entity_id]["pauses"]
        self.assertEqual(
            ["velair.manual_adjustment"],
            [item.get("pause_id") for item in reasons],
        )
        await self.scheduler.async_pause_zone(self.entity_id)
        reasons = self.data["zones"][self.entity_id]["pauses"]
        self.assertTrue(any(item.get("pause_id") == "velair.manual_adjustment" for item in reasons))
        self.assertTrue(any("pause_id" not in item for item in reasons))

    async def test_existing_turn_off_pause_wins_external_turn_on(self) -> None:
        await self.scheduler.async_pause_zone(
            self.entity_id, pause_id="window", action="turn_off"
        )
        self.scheduler._climate_manager.calls.clear()
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["hvac_mode"],
            previous={"hvac_mode": "off"},
            current={"hvac_mode": "cool"},
        )
        self.assertIn(("turn_off", self.entity_id), self.scheduler._climate_manager.calls)
        self.assertEqual("automatic", self.scheduler.get_zone_runtime_statuses()[self.entity_id]["control_mode"])

    async def test_external_change_during_boost_enters_manual_without_restoring_boost(self) -> None:
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "until_resumed"}
        )
        self.scheduler._climate_manager.snapshots[self.entity_id] = {
            "hvac_mode": "cool",
            "temperature": 24.0,
        }
        await self.scheduler.async_set_zone_boost(
            self.entity_id,
            20.0,
            (NOW + timedelta(hours=1)).isoformat(),
            hvac_mode="cool",
        )
        self.scheduler._climate_manager.calls.clear()

        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 20.0},
            current={"temperature": 23.0},
            observed_snapshot={"hvac_mode": "cool", "temperature": 23.0},
        )

        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertEqual("manual", runtime["control_mode"])
        self.assertEqual(
            ["velair.manual_adjustment"],
            [item.get("pause_id") for item in self.data["zones"][self.entity_id]["pauses"]],
        )
        self.assertEqual(
            [("restore_state", self.entity_id, {"hvac_mode": "cool", "temperature": 23.0})],
            self.scheduler._climate_manager.calls,
        )

    async def test_full_event_snapshot_wins_over_newer_live_room_assist_state(self) -> None:
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "until_resumed"}
        )
        # Simulate Room Assist changing the live entity before the queued
        # external-change task acquires the zone lock.
        self.scheduler._climate_manager.snapshots[self.entity_id] = {
            "hvac_mode": "cool",
            "temperature": 19.0,
        }
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["hvac_mode"],
            previous={"hvac_mode": "off"},
            current={"hvac_mode": "cool"},
            observed_snapshot={"hvac_mode": "cool", "temperature": 23.0},
        )
        self.assertIn(
            (
                "restore_state",
                self.entity_id,
                {"hvac_mode": "cool", "temperature": 23.0},
            ),
            self.scheduler._climate_manager.calls,
        )

    async def test_global_pause_and_disabled_zone_do_not_enter_manual(self) -> None:
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "until_resumed"}
        )
        self.data["global_"]["mode"] = "paused"
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 24.0},
            current={"temperature": 23.0},
        )
        self.assertEqual("automatic", self.scheduler.get_zone_runtime_statuses()[self.entity_id]["control_mode"])
        self.data["global_"]["mode"] = "auto"
        self.data["zones"][self.entity_id]["enabled"] = False
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 23.0},
            current={"temperature": 22.0},
        )
        self.assertFalse(any(item.get("pause_id") == "velair.manual_adjustment" for item in self.data["zones"][self.entity_id]["pauses"]))

    async def test_policy_change_while_manual_only_changes_future_default(self) -> None:
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "until_resumed"}
        )
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 24.0},
            current={"temperature": 23.0},
        )
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "for_duration", "duration_minutes": 15}
        )
        manual = self.scheduler.get_zone_runtime_statuses()[self.entity_id]["manual_control"]
        self.assertEqual("until_resumed", manual["policy"])
        self.assertNotIn("until", manual)
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "keep_automatic"}
        )
        self.assertEqual("manual", self.scheduler.get_zone_runtime_statuses()[self.entity_id]["control_mode"])

        self.scheduler._climate_manager.calls.clear()
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 23.0},
            current={"temperature": 22.0},
        )
        manual = self.scheduler.get_zone_runtime_statuses()[self.entity_id]["manual_control"]
        self.assertEqual("until_resumed", manual["policy"])
        self.assertIn(
            ("restore_state", self.entity_id, {"temperature": 22.0}),
            self.scheduler._climate_manager.calls,
        )
        repeated_event = [
            data
            for _event_type, data in self.hass.bus.events
            if data.get("event") == "external_climate_change_detected"
        ][-1]
        self.assertEqual("until_resumed", repeated_event["policy"])
        self.assertEqual(
            "keep_automatic",
            self.data["zones"][self.entity_id]["external_change_policy"]["action"],
        )

    async def test_explicit_manual_captures_live_state_without_mutating_default(self) -> None:
        self.scheduler._climate_manager.snapshots[self.entity_id] = {
            "hvac_mode": "heat_cool",
            "target_temp_low": 19.0,
            "target_temp_high": 24.0,
        }
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "for_duration", "duration_minutes": 90}
        )

        await self.scheduler.async_enter_manual_adjustment(self.entity_id)

        manual = self.scheduler.get_zone_runtime_statuses()[self.entity_id]["manual_control"]
        self.assertEqual("explicit", manual["source"])
        self.assertEqual("for_duration", manual["policy"])
        self.assertEqual(90, manual["duration_minutes"])
        self.assertEqual("for_duration", self.data["zones"][self.entity_id]["external_change_policy"]["action"])
        self.assertIn(
            (
                "restore_state",
                self.entity_id,
                {"hvac_mode": "heat_cool", "target_temp_low": 19.0, "target_temp_high": 24.0},
            ),
            self.scheduler._climate_manager.calls,
        )

    async def test_explicit_manual_supports_off_and_rejects_unavailable(self) -> None:
        self.scheduler._climate_manager.snapshots[self.entity_id] = {"hvac_mode": "off"}
        await self.scheduler.async_enter_manual_adjustment(self.entity_id)
        self.assertEqual("manual", self.scheduler.get_zone_runtime_statuses()[self.entity_id]["control_mode"])
        await self.scheduler.async_resume_automatic_control(self.entity_id)

        self.scheduler._climate_manager.snapshots[self.entity_id] = {}
        with self.assertRaisesRegex(ValueError, "unknown or unavailable"):
            await self.scheduler.async_enter_manual_adjustment(self.entity_id)

    async def test_explicit_manual_uses_each_persisted_policy_exactly(self) -> None:
        self.scheduler._climate_manager.snapshots[self.entity_id] = {
            "hvac_mode": "cool", "temperature": 23.0
        }
        for policy in ("until_next_block", "for_duration", "until_resumed"):
            await self.scheduler.async_update_external_change_policy(
                self.entity_id,
                {"action": policy, "duration_minutes": 35},
            )
            await self.scheduler.async_enter_manual_adjustment(self.entity_id)
            manual = self.scheduler.get_zone_runtime_statuses()[self.entity_id]["manual_control"]
            self.assertEqual(policy, manual["policy"])
            if policy == "for_duration":
                self.assertEqual(35, manual["duration_minutes"])
            await self.scheduler.async_resume_automatic_control(self.entity_id)

    async def test_explicit_manual_rejects_scheduler_and_pause_gates(self) -> None:
        self.scheduler._climate_manager.snapshots[self.entity_id] = {
            "hvac_mode": "cool", "temperature": 24.0
        }
        self.data["global_"]["mode"] = "paused"
        with self.assertRaisesRegex(ValueError, "Automatic scheduling"):
            await self.scheduler.async_enter_manual_adjustment(self.entity_id)
        self.data["global_"]["mode"] = "auto"
        await self.scheduler.async_pause_zone(self.entity_id, pause_id="window")
        with self.assertRaisesRegex(ValueError, "climate is paused"):
            await self.scheduler.async_enter_manual_adjustment(self.entity_id)

    async def test_runtime_projects_explicit_manual_availability_gates(self) -> None:
        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertTrue(runtime["manual_adjustment_allowed"])

        self.scheduler.set_temperature_migration_blocked(True)
        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertFalse(runtime["manual_adjustment_allowed"])
        self.assertEqual(
            "temperature_migration",
            runtime["manual_adjustment_unavailable_reason"],
        )
        self.scheduler.set_temperature_migration_blocked(False)

        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertNotIn("manual_adjustment_unavailable_reason", runtime)

        self.hass.states[self.entity_id].state = "unavailable"
        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertFalse(runtime["manual_adjustment_allowed"])
        self.assertEqual("unavailable", runtime["manual_adjustment_unavailable_reason"])
        self.hass.states[self.entity_id].state = "cool"

        self.data["zones"][self.entity_id]["enabled"] = False
        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertEqual("disabled", runtime["manual_adjustment_unavailable_reason"])
        self.data["zones"][self.entity_id]["enabled"] = True

        self.data["global_"]["mode"] = "paused"
        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertEqual("scheduler_not_auto", runtime["manual_adjustment_unavailable_reason"])
        self.data["global_"]["mode"] = "auto"

        profile_behavior = self.scheduler._profile_zone_behavior
        self.scheduler._profile_zone_behavior = lambda _entity_id: {"behavior": "pause"}
        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertEqual("profile_paused", runtime["manual_adjustment_unavailable_reason"])
        self.scheduler._profile_zone_behavior = profile_behavior

        await self.scheduler.async_pause_zone(self.entity_id, pause_id="window")
        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertEqual("zone_paused", runtime["manual_adjustment_unavailable_reason"])
        await self.scheduler.async_resume_zone(self.entity_id, pause_id="window")

        self.scheduler._climate_manager.snapshots[self.entity_id] = {
            "hvac_mode": "cool", "temperature": 24.0
        }
        await self.scheduler.async_set_zone_boost(
            self.entity_id,
            22.0,
            (NOW + timedelta(hours=1)).isoformat(),
            hvac_mode="cool",
        )
        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertTrue(runtime["manual_adjustment_allowed"])

    async def test_temperature_migration_blocks_manual_mutations_and_external_detection(self) -> None:
        previous_policy = dict(
            self.data["zones"][self.entity_id]["external_change_policy"]
        )
        self.scheduler.set_temperature_migration_blocked(True)

        with self.assertRaisesRegex(ValueError, "Temperature migration"):
            await self.scheduler.async_update_external_change_policy(
                self.entity_id, {"action": "until_resumed"}
            )
        with self.assertRaisesRegex(ValueError, "Temperature migration"):
            await self.scheduler.async_enter_manual_adjustment(self.entity_id)
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 24.0},
            current={"temperature": 23.0},
        )

        self.assertEqual(
            previous_policy,
            self.data["zones"][self.entity_id]["external_change_policy"],
        )
        self.assertFalse(any(
            item.get("pause_id") == "velair.manual_adjustment"
            for item in self.data["zones"][self.entity_id]["pauses"]
        ))
        self.assertEqual([], self.hass.bus.events)

    async def test_temperature_migration_prevents_resuming_an_active_manual_session(self) -> None:
        self.scheduler._climate_manager.snapshots[self.entity_id] = {
            "hvac_mode": "cool", "temperature": 24.0
        }
        await self.scheduler.async_enter_manual_adjustment(self.entity_id)
        self.scheduler.set_temperature_migration_blocked(True)

        with self.assertRaisesRegex(ValueError, "Temperature migration"):
            await self.scheduler.async_resume_automatic_control(self.entity_id)

        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertEqual("manual", runtime["control_mode"])

    async def test_manual_runtime_projects_live_scalar_instead_of_schedule(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [{
            "start": "00:00", "action": "set_temperature", "temperature": 21.0,
        }]
        self.hass.states[self.entity_id].attributes["temperature"] = 23.0
        await self.scheduler.async_pause_zone(
            self.entity_id,
            pause_id="velair.manual_adjustment",
            internal=True,
            manual_policy="until_resumed",
        )

        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertEqual(23.0, runtime["target_temperature"])

    async def test_manual_runtime_projects_live_native_range(self) -> None:
        self.hass.states[self.entity_id].state = "heat_cool"
        self.hass.states[self.entity_id].attributes = {
            "target_temp_low": 19.0,
            "target_temp_high": 24.0,
            "supported_features": 2,
        }
        await self.scheduler.async_pause_zone(
            self.entity_id,
            pause_id="velair.manual_adjustment",
            internal=True,
            manual_policy="until_resumed",
        )

        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertEqual(19.0, runtime["target_temp_low"])
        self.assertEqual(24.0, runtime["target_temp_high"])

    async def test_policy_update_without_duration_preserves_stored_duration(self) -> None:
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "for_duration", "duration_minutes": 90}
        )

        normalized = await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "until_resumed"}
        )

        self.assertEqual(90, normalized["duration_minutes"])
        self.assertEqual(
            90,
            self.data["zones"][self.entity_id]["external_change_policy"][
                "duration_minutes"
            ],
        )

    async def test_repeated_until_next_block_preserves_real_block_expiry(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {"start": "19:00", "action": "set_temperature", "temperature": 22}
        ]
        self.scheduler.async_schedule_next_event()
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "until_next_block"}
        )
        for previous, current in ((24.0, 23.0), (23.0, 22.5)):
            await self.scheduler.async_handle_external_climate_change(
                self.entity_id,
                changed_fields=["temperature"],
                previous={"temperature": previous},
                current={"temperature": current},
            )
        manual = self.scheduler.get_zone_runtime_statuses()[self.entity_id]["manual_control"]
        self.assertEqual("2026-05-19T19:00:00+00:00", manual["until"])

    async def test_profile_pause_skips_manual_control(self) -> None:
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "until_resumed"}
        )
        self.scheduler._profile_zone_behavior = lambda _entity_id: {"behavior": "pause"}
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 24.0},
            current={"temperature": 23.0},
        )
        self.assertEqual("automatic", self.scheduler.get_zone_runtime_statuses()[self.entity_id]["control_mode"])

    async def test_restore_failure_keeps_single_authoritative_manual_pause(self) -> None:
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "until_resumed"}
        )
        self.scheduler._climate_manager.snapshots[self.entity_id] = {
            "hvac_mode": "cool", "temperature": 23
        }
        self.scheduler._climate_manager.async_restore_state = AsyncMock(
            side_effect=RuntimeError("restore failed")
        )
        self.scheduler._async_write_state = Mock()
        with self.assertRaisesRegex(RuntimeError, "restore failed"):
            await self.scheduler.async_handle_external_climate_change(
                self.entity_id,
                changed_fields=["temperature"],
                previous={"temperature": 24.0},
                current={"temperature": 23.0},
            )
        self.assertEqual("manual", self.scheduler.get_zone_runtime_statuses()[self.entity_id]["control_mode"])
        self.assertTrue(any(
            data.get("event") == "zone_control_changed"
            and data.get("control_mode") == "manual"
            for _event_type, data in self.hass.bus.events
        ))
        entry_event = next(
            data
            for _event_type, data in self.hass.bus.events
            if data.get("event") == "zone_control_changed"
            and data.get("control_mode") == "manual"
        )
        self.assertNotIn("until", entry_event)
        self.assertGreaterEqual(self.scheduler._async_write_state.call_count, 1)

    async def test_external_snapshot_restore_runs_inside_delivery_lock(self) -> None:
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "until_resumed"}
        )
        self.scheduler._climate_manager.snapshots[self.entity_id] = {
            "hvac_mode": "cool", "temperature": 23
        }

        async def assert_delivery_owner(_entity_id, _snapshot):
            self.assertIs(
                asyncio.current_task(),
                self.scheduler._climate_delivery._owners.get(self.entity_id),
            )

        self.scheduler._climate_manager.async_restore_state = assert_delivery_owner
        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 24.0},
            current={"temperature": 23.0},
        )

    async def test_save_failure_rolls_back_manual_pause(self) -> None:
        self.data["zones"][self.entity_id]["external_change_policy"] = {
            "action": "until_resumed", "duration_minutes": 60
        }
        self.fail_save = True
        with self.assertRaisesRegex(RuntimeError, "save failed"):
            await self.scheduler.async_handle_external_climate_change(
                self.entity_id,
                changed_fields=["temperature"],
                previous={"temperature": 24.0},
                current={"temperature": 23.0},
            )
        self.assertEqual("automatic", self.scheduler.get_zone_runtime_statuses()[self.entity_id]["control_mode"])

    async def test_manual_expiry_emits_control_change_with_other_pause_remaining(self) -> None:
        await self.scheduler.async_pause_zone(
            self.entity_id,
            until=(NOW + timedelta(minutes=1)).isoformat(),
            pause_id="velair.manual_adjustment",
            internal=True,
            manual_policy="for_duration",
        )
        await self.scheduler.async_pause_zone(self.entity_id, pause_id="window")
        await self.scheduler._async_clear_expired_zone_overrides(
            NOW + timedelta(minutes=2)
        )
        self.assertTrue(any(item.get("pause_id") == "window" for item in self.data["zones"][self.entity_id]["pauses"]))
        self.assertTrue(any(
            data.get("event") == "zone_control_changed" and data.get("control_mode") == "automatic"
            for _event_type, data in self.hass.bus.events
        ))

    def test_portable_zones_include_policy_but_not_manual_runtime(self) -> None:
        exported = _export_zones(self.data["zones"])[self.entity_id]
        self.assertEqual("keep_automatic", exported["external_change_policy"]["action"])
        self.assertNotIn("manual_control", exported)


class ExternalChangeProjectionTest(unittest.TestCase):
    def test_keep_automatic_is_the_first_external_option_but_not_a_manual_policy(self) -> None:
        self.assertEqual("keep_automatic", EXTERNAL_CHANGE_POLICY_OPTIONS[0])
        self.assertNotIn("keep_automatic", MANUAL_ADJUSTMENT_POLICY_OPTIONS)
        self.assertEqual(
            ("until_next_block", "for_duration", "until_resumed"),
            MANUAL_ADJUSTMENT_POLICY_OPTIONS,
        )

    def test_missing_keep_automatic_and_invalid_external_policies_normalize_to_keep_automatic(self) -> None:
        for raw_policy in (None, {"action": "keep_automatic"}, {"action": "invalid"}):
            zone = {"enabled": True, "schedule": empty_week_schedule()}
            if raw_policy is not None:
                zone["external_change_policy"] = raw_policy
            data = normalize_schedule_data(
                {"zones": {"climate.salon": zone}},
                ["climate.salon"],
            )
            self.assertEqual(
                "keep_automatic",
                data["zones"]["climate.salon"]["external_change_policy"]["action"],
            )

    def test_malformed_manual_policy_normalizes_to_until_next_block(self) -> None:
        data = normalize_schedule_data(
            {
                "zones": {
                    "climate.salon": {
                        "enabled": True,
                        "schedule": empty_week_schedule(),
                        "pauses": [{
                            "started_at": NOW.isoformat(),
                            "action": "none",
                            "pause_id": "velair.manual_adjustment",
                            "manual_policy": "keep_automatic",
                        }],
                    }
                }
            },
            ["climate.salon"],
        )
        self.assertEqual(
            "until_next_block",
            data["zones"]["climate.salon"]["pauses"][0]["manual_policy"],
        )

    def test_projects_mode_and_native_range_without_environment_changes(self) -> None:
        old = SimpleNamespace(
            state="off",
            attributes={
                "target_temp_low": 20,
                "target_temp_high": 24,
                "current_temperature": 27,
            },
        )
        new = SimpleNamespace(
            state="heat_cool",
            attributes={
                "target_temp_low": 19,
                "target_temp_high": 25,
                "current_temperature": 26,
            },
        )
        changed, previous, current = _control_change(old, new)
        self.assertEqual(
            ["hvac_mode", "target_temp_low", "target_temp_high"], changed
        )
        self.assertEqual("off", previous["hvac_mode"])
        self.assertEqual(25.0, current["target_temp_high"])


class ClimateChangeMonitorTest(unittest.IsolatedAsyncioTestCase):
    async def test_only_external_fields_are_forwarded(self) -> None:
        manager = SimpleNamespace(
            owned_state_change_fields=lambda *_args: {"temperature"},
            climate_state_snapshot_from_state=lambda _entity_id, state: {
                "hvac_mode": state.state,
                "temperature": state.attributes["temperature"],
            },
        )
        scheduler = SimpleNamespace(
            async_handle_external_climate_change=AsyncMock()
        )
        monitor = ClimateChangeMonitor(
            FakeHass(), ["climate.salon"], manager, scheduler
        )
        old = SimpleNamespace(
            entity_id="climate.salon",
            state="off",
            attributes={"temperature": 20.0},
            context=None,
        )
        new = SimpleNamespace(
            entity_id="climate.salon",
            state="heat",
            attributes={"temperature": 21.0},
            context=None,
        )
        monitor._handle_state_change(
            SimpleNamespace(data={"old_state": old, "new_state": new})
        )
        await asyncio.sleep(0)
        scheduler.async_handle_external_climate_change.assert_awaited_once_with(
            "climate.salon",
            changed_fields=["hvac_mode"],
            previous={"hvac_mode": "off"},
            current={"hvac_mode": "heat"},
            observed_snapshot={"hvac_mode": "heat", "temperature": 21.0},
        )
