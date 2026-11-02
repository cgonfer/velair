"""Shared observation reads must preserve fresh scheduler decisions."""

from __future__ import annotations

from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from .helpers import (
    FakeClimateManager,
    FakeHass,
    NOW,
    VelairScheduler,
    empty_week_schedule,
    normalize_schedule_data,
    scheduler_module,
)
from custom_components.velair.models import ClimateEvent


class SchedulerObservationSnapshotTest(unittest.TestCase):
    """Exercise actual scheduler calculations, rather than mocked status getters."""

    def setUp(self):
        self.entity = "climate.observation"
        self.sensor = "sensor.observation_room"
        self.clock = [NOW]
        clock_patch = patch.object(
            scheduler_module.dt_util, "now", lambda: self.clock[0]
        )
        clock_patch.start()
        self.addCleanup(clock_patch.stop)
        week = empty_week_schedule()
        week["tuesday"] = [self.block("00:00", 20), self.block("19:00", 22)]
        self.data = normalize_schedule_data(
            {"zones": {self.entity: {
                "enabled": True,
                "schedule": week,
                "preconditioning": {
                    "enabled": False,
                    "room_temperature_entity_id": self.sensor,
                    "room_sensor_assist_enabled": True,
                },
                "comfort": {"enabled": True, "temperature_entity_id": self.sensor},
            }}},
            [self.entity],
        )
        self.hass = FakeHass()
        self.hass.states[self.entity] = SimpleNamespace(
            state="heat", attributes={
                "current_temperature": 19, "temperature": 20,
                "current_humidity": 45,
            },
        )
        self.hass.states[self.sensor] = SimpleNamespace(
            state="18.5", attributes={"unit_of_measurement": "°C"}
        )
        self.climate = FakeClimateManager()
        self.climate.steps[self.entity] = 0.5
        self.climate.hvac_modes[self.entity] = ["off", "heat", "cool", "heat_cool"]
        self.climate.limits[self.entity] = (5, 35)
        self.climate.temperature_range_support[self.entity] = True
        self.scheduler = VelairScheduler(
            self.hass, self.data, self.climate, AsyncMock()
        )
        self.zone = self.data["zones"][self.entity]

    @staticmethod
    def block(start, target, mode="heat"):
        return {"start": start, "temperature": target, "hvac_mode": mode,
                "action": "set_temperature"}

    def observations(self):
        return {
            "target": self.scheduler.get_active_target_event(self.entity),
            "assist": self.scheduler.get_room_sensor_assist_status(self.entity),
            "comfort": self.scheduler.get_comfort_assessment(self.entity),
            "runtime": self.scheduler.get_zone_runtime_statuses(),
        }

    def assert_scoped_matches_fresh(self):
        self.scheduler._prepare_runtime_projection(configuration=True)
        expected = self.observations()
        with self.scheduler.observation_snapshot():
            self.assertEqual(self.observations(), expected)
            self.assertEqual(self.observations(), expected)
        return expected

    def test_heating_cooling_and_native_range_payloads_match_unshared_reads(self):
        for mode, target in (("heat", {"temperature": 20}),
                             ("cool", {"temperature": 24}),
                             ("heat_cool", {"target_temp_low": 20, "target_temp_high": 24})):
            with self.subTest(mode=mode):
                self.zone["schedule"]["tuesday"] = [
                    {"start": "00:00", "action": "set_temperature", "hvac_mode": mode,
                     **target}
                ]
                self.hass.states[self.entity].state = mode
                self.assert_scoped_matches_fresh()

    def test_one_zone_shares_target_and_status_across_all_read_consumers(self):
        self.zone["preconditioning"]["enabled"] = True
        with patch.object(self.scheduler, "_iter_future_events",
                          wraps=self.scheduler._iter_future_events) as expand:
            with self.scheduler.observation_snapshot():
                first = self.observations()
                for _ in range(5):
                    self.assertEqual(self.observations(), first)
            self.assertEqual(expand.call_count, 0)

    def test_nested_scopes_reuse_result_and_outer_exit_discards_it(self):
        self.zone["preconditioning"]["enabled"] = True
        with patch.object(self.scheduler, "_iter_future_events",
                          wraps=self.scheduler._iter_future_events) as expand:
            with self.scheduler.observation_snapshot():
                first = self.scheduler.get_active_target_event(self.entity)
                with self.scheduler.observation_snapshot():
                    self.assertEqual(self.scheduler.get_active_target_event(self.entity), first)
                self.assertEqual(self.scheduler.get_active_target_event(self.entity), first)
            self.assertEqual(expand.call_count, 0)
            with self.scheduler.observation_snapshot():
                self.assertEqual(self.scheduler.get_active_target_event(self.entity), first)
            self.assertEqual(expand.call_count, 0)

    def test_exception_discards_scope_and_cannot_leave_stale_results(self):
        with self.assertRaisesRegex(RuntimeError, "reader failed"):
            with self.scheduler.observation_snapshot():
                self.scheduler.get_active_target_event(self.entity)
                raise RuntimeError("reader failed")
        self.zone["schedule"]["tuesday"][0]["temperature"] = 23
        self.scheduler._prepare_runtime_projection(configuration=True)
        with self.scheduler.observation_snapshot():
            self.assertEqual(self.scheduler.get_active_target_event(self.entity).temperature, 23)

    def test_new_scope_sees_sensor_and_configuration_changes(self):
        before = self.assert_scoped_matches_fresh()
        self.hass.states[self.sensor].state = "21.5"
        self.zone["schedule"]["tuesday"][0]["temperature"] = 23
        after = self.assert_scoped_matches_fresh()
        self.assertEqual(after["target"].temperature, 23)
        self.assertEqual(after["assist"]["room_temperature"], 21.5)
        self.assertNotEqual(before["assist"], after["assist"])

    def test_new_scope_sees_scheduler_mode_and_room_assist_toggle(self):
        self.assert_scoped_matches_fresh()
        self.data["global_"]["mode"] = "paused"
        self.assertEqual(self.assert_scoped_matches_fresh()["assist"]["status"], "blocked")
        self.zone["preconditioning"]["room_sensor_assist_enabled"] = False
        self.assertEqual(self.assert_scoped_matches_fresh()["assist"]["status"], "disabled")

    def test_new_scope_sees_profile_selection_and_pause(self):
        self.assert_scoped_matches_fresh()
        profile_week = empty_week_schedule()
        profile_week["tuesday"] = [self.block("00:00", 24)]
        self.data["profiles"] = [{
            "key": "selected", "name": "Selected", "color": "#112233",
            "zones": {self.entity: {"behavior": "schedule", "schedule": profile_week}},
        }]
        self.data["global_"]["active_profile_ids"] = ["selected"]
        self.data["global_"]["base_profile_ids"] = ["selected"]
        self.assertEqual(self.assert_scoped_matches_fresh()["target"].temperature, 24)
        self.zone["pauses"] = [{"action": "none", "started_at": NOW.isoformat()}]
        self.zone["override"] = {"type": "pause", "action": "none"}
        self.assertIsNone(self.assert_scoped_matches_fresh()["target"])

    def test_temperature_only_scalar_and_range_previews_preserve_fresh_authority(self):
        for target in ({"temperature": 20}, {"target_temp_low": 20, "target_temp_high": 24}):
            for mode in ("heat", "cool", "heat_cool", "off"):
                with self.subTest(target=target, mode=mode):
                    self.zone["schedule"]["tuesday"] = [{
                        "start": "00:00", "action": "set_temperature",
                        "temperature_only": True, **target,
                    }]
                    self.hass.states[self.entity].state = mode
                    expected = self.assert_scoped_matches_fresh()
                    self.assertTrue(expected["target"].temperature_only)
                    with self.scheduler.observation_snapshot():
                        self.scheduler.get_room_sensor_assist_status(self.entity)
                        block = self.zone["schedule"]["tuesday"][0]
                        field = "temperature" if "temperature" in block else "target_temp_low"
                        block[field] = 21
                        self.scheduler._prepare_runtime_projection(configuration=True)
                        current = self.scheduler._resolve_authoritative_delivery_event(self.entity)
                        self.assertEqual(getattr(current, field), 21)
                        self.assertTrue(current.temperature_only)

    def test_temperature_only_preview_with_paused_scheduler_or_profile_matches_fresh(self):
        self.zone["schedule"]["tuesday"] = [{
            "start": "00:00", "action": "set_temperature",
            "temperature_only": True, "temperature": 20,
        }]
        self.data["global_"]["mode"] = "paused"
        self.assert_scoped_matches_fresh()
        self.data["global_"]["mode"] = "auto"
        self.data["profiles"] = [{
            "key": "paused_profile", "name": "Paused", "color": "#112233",
            "zones": {self.entity: {"behavior": "pause", "action": "leave_as_is"}},
        }]
        self.data["global_"]["active_profile_ids"] = ["paused_profile"]
        self.data["global_"]["base_profile_ids"] = ["paused_profile"]
        self.assert_scoped_matches_fresh()

    def test_block_boundary_and_clock_rewind_get_fresh_results(self):
        boundary = NOW + timedelta(hours=1)
        for instant, expected in ((boundary - timedelta(microseconds=1), 20),
                                  (boundary, 22), (NOW, 20)):
            with self.subTest(instant=instant):
                self.clock[0] = instant
                self.assertEqual(self.assert_scoped_matches_fresh()["target"].temperature, expected)

    def test_boost_expiry_and_clock_rewind_get_fresh_results(self):
        boundary = NOW + timedelta(minutes=10)
        self.zone["override"] = {
            "type": "boost", "temperature": 25, "hvac_mode": "heat",
            "until": boundary.isoformat(), "started_at": NOW.isoformat(),
        }
        for instant, expected in ((NOW, 25), (boundary, 20), (NOW, 25)):
            with self.subTest(instant=instant):
                self.clock[0] = instant
                self.assertEqual(self.assert_scoped_matches_fresh()["target"].temperature, expected)

    def test_due_preconditioning_and_comfort_deadline_match_fresh_control(self):
        self.zone["schedule"]["tuesday"] = [
            self.block("00:00", 20), self.block("21:00", 23)
        ]
        self.zone["preconditioning"].update({
            "enabled": True, "max_lead_minutes": 180,
            "minimum_delta_temperature": 0.3, "fallback_minutes_per_degree": 20,
        })
        early = next(event for event in self.scheduler._iter_future_events(NOW)
                     if event.start == "21:00" and event.target_when is not None)
        for instant, expected in ((early.when - timedelta(microseconds=1), 20),
                                  (early.when, 23), (early.target_when, 23), (NOW, 20)):
            with self.subTest(instant=instant):
                self.clock[0] = instant
                self.assertEqual(self.assert_scoped_matches_fresh()["target"].temperature, expected)

    def test_disabled_room_assist_keeps_generic_schedule_target_and_full_payload(self):
        self.zone["preconditioning"]["room_sensor_assist_enabled"] = False
        expected = self.assert_scoped_matches_fresh()
        self.assertEqual(expected["assist"]["status"], "disabled")
        self.assertEqual(expected["target"].temperature, 20)
        self.assertEqual(expected["assist"]["target_temperature"], 20)
        self.assertIn("climate_temperature", expected["assist"])

    def test_scoped_public_results_are_detached_from_cached_payloads(self):
        with self.scheduler.observation_snapshot():
            original = self.observations()
            changed = self.observations()
            changed["assist"]["target_temperature"] = -99
            changed["comfort"]["temperature"]["value"] = -99
            changed["runtime"][self.entity]["state"] = "corrupted"
            self.assertEqual(self.observations(), original)

    def test_cached_events_detach_nested_diagnostics(self):
        event = ClimateEvent(
            self.entity, NOW, 20, "tuesday", "00:00", hvac_mode="heat",
            preconditioning_diagnostics={"nested": {"values": [1]}},
        )
        with patch.object(self.scheduler, "_room_sensor_assist_target_event", return_value=event):
            with self.scheduler.observation_snapshot():
                first = self.scheduler.get_active_target_event(self.entity)
                first.preconditioning_diagnostics["nested"]["values"].append(2)
                second = self.scheduler.get_active_target_event(self.entity)
                self.assertEqual(second.preconditioning_diagnostics["nested"]["values"], [1])
        self.assertEqual(event.preconditioning_diagnostics["nested"]["values"], [1])

    def test_private_control_resolver_does_not_reuse_observer_target(self):
        with self.scheduler.observation_snapshot():
            self.assertEqual(self.scheduler.get_active_target_event(self.entity).temperature, 20)
            self.zone["schedule"]["tuesday"][0]["temperature"] = 24
            self.scheduler._prepare_runtime_projection(configuration=True)
            self.assertEqual(self.scheduler._room_sensor_assist_target_event(self.entity).temperature, 24)

    def test_publication_shares_calculations_across_inline_dispatch_listeners(self):
        self.zone["preconditioning"]["enabled"] = True
        snapshots = []

        def dispatch(_hass, _signal):
            for _ in range(8):
                snapshots.append(self.observations())

        with patch.object(scheduler_module, "async_dispatcher_send", side_effect=dispatch), \
             patch.object(self.scheduler, "_iter_future_events",
                          wraps=self.scheduler._iter_future_events) as expand:
            self.scheduler._async_write_state()
            self.assertEqual(len(snapshots), 8)
            self.assertTrue(all(snapshot == snapshots[0] for snapshot in snapshots))
            self.assertEqual(expand.call_count, 0)

    def test_nested_publication_rebases_outer_scope_without_restoring_old_cache(self):
        published = []

        def dispatch(_hass, _signal):
            published.append(self.scheduler.get_active_target_event(self.entity).temperature)

        with patch.object(scheduler_module, "async_dispatcher_send", side_effect=dispatch):
            with self.scheduler.observation_snapshot():
                self.assertEqual(self.scheduler.get_active_target_event(self.entity).temperature, 20)
                self.zone["schedule"]["tuesday"][0]["temperature"] = 24
                self.scheduler._prepare_runtime_projection(configuration=True)
                self.scheduler._async_write_state()
                self.assertEqual(published, [24])
                self.assertEqual(self.scheduler.get_active_target_event(self.entity).temperature, 24)

    def test_publication_during_projection_does_not_reinsert_previous_result(self):
        original = self.scheduler._room_sensor_assist_target_event
        interrupted = False

        def build(entity, **kwargs):
            nonlocal interrupted
            result = original(entity, **kwargs)
            if not interrupted:
                interrupted = True
                self.zone["schedule"]["tuesday"][0]["temperature"] = 24
                self.scheduler._prepare_runtime_projection(configuration=True)
                self.scheduler._async_write_state()
            return result

        with patch.object(self.scheduler, "_room_sensor_assist_target_event", side_effect=build):
            with self.scheduler.observation_snapshot():
                self.assertEqual(self.scheduler.get_active_target_event(self.entity).temperature, 24)
                self.assertEqual(self.scheduler.get_active_target_event(self.entity).temperature, 24)

    def test_master_and_siblings_keep_filtered_schedule_semantics(self):
        master = "climate.master"
        sibling = "climate.sibling"
        for entity, start in ((master, "19:00"), (sibling, "19:20")):
            self.data["zones"][entity] = deepcopy(self.zone)
            self.data["zones"][entity]["schedule"]["tuesday"] = [
                self.block("00:00", 20), self.block(start, 23)
            ]
            self.hass.states[entity] = deepcopy(self.hass.states[self.entity])
            self.climate.steps[entity] = 0.5
        for entity in (self.entity, master, sibling):
            self.data["zones"][entity]["preconditioning"].update({
                "enabled": True, "max_lead_minutes": 180,
                "minimum_delta_temperature": 0.3, "fallback_minutes_per_degree": 20,
            })
        self.zone["preconditioning"]["master_entity_id"] = master
        self.data["zones"][sibling]["preconditioning"]["master_entity_id"] = master
        self.scheduler._prepare_runtime_projection(configuration=True)
        expected = {
            entity: self.scheduler.get_active_target_event(entity)
            for entity in (self.entity, sibling, master)
        }
        with self.scheduler.observation_snapshot():
            actual = {
                entity: self.scheduler.get_active_target_event(entity)
                for entity in (self.entity, sibling, master)
            }
            self.assertEqual(actual, expected)
            for entity in (master, sibling, self.entity):
                self.assertEqual(self.scheduler.get_active_target_event(entity), expected[entity])

    def test_first_observation_preserves_invalid_session_cleanup(self):
        session = scheduler_module._PreconditioningSession(
            entity_id=self.entity, direction="heat", started_at=NOW - timedelta(minutes=5),
            target_when=NOW + timedelta(hours=1), weekday="tuesday", start="19:00",
            target_temperature=21, target_kind="scalar", target_boundary="temperature",
            start_temperature=18, hvac_mode="heat", startup_minutes=65,
            outdoor_temp_start=None,
        )
        self.scheduler._preconditioning_sessions[self.entity] = session
        self.scheduler._prepare_runtime_projection(configuration=True)
        expected = self.scheduler.get_active_target_event(self.entity)
        self.assertNotIn(self.entity, self.scheduler._preconditioning_sessions)
        self.scheduler._preconditioning_sessions[self.entity] = session
        self.scheduler._prepare_runtime_projection(configuration=True)
        with self.scheduler.observation_snapshot():
            self.assertEqual(self.scheduler.get_active_target_event(self.entity), expected)
            self.assertNotIn(self.entity, self.scheduler._preconditioning_sessions)

    def test_first_observation_preserves_expired_applied_marker_cleanup(self):
        marker = scheduler_module._AppliedPreconditioningTarget(
            active_from=NOW - timedelta(hours=1),
            target_when=NOW - timedelta(microseconds=1),
        )
        self.scheduler._applied_preconditioning_targets["expired"] = marker
        self.scheduler._prepare_runtime_projection(configuration=True)
        expected = self.scheduler.get_active_target_event(self.entity)
        self.assertNotIn("expired", self.scheduler._applied_preconditioning_targets)
        self.scheduler._applied_preconditioning_targets["expired"] = marker
        self.scheduler._prepare_runtime_projection(configuration=True)
        with self.scheduler.observation_snapshot():
            self.assertEqual(self.scheduler.get_active_target_event(self.entity), expected)
            self.assertNotIn("expired", self.scheduler._applied_preconditioning_targets)

    def test_planned_return_deadline_and_cancellation_get_fresh_results(self):
        self.zone["preconditioning"]["enabled"] = True
        destination = empty_week_schedule()
        destination["tuesday"] = [self.block("00:00", 24)]
        self.data["profiles"] = [{
            "key": "return_profile", "name": "Return", "color": "#112233",
            "zones": {self.entity: {"behavior": "schedule", "schedule": destination}},
        }]
        self.data["modes"] = [{
            "key": "return_mode", "name": "Return", "profile_ids": ["return_profile"],
        }]
        arrival = NOW + timedelta(minutes=30)
        self.data["planned_return_episode"] = {
            "state": "away", "origin": "manual",
            "started_at": (NOW - timedelta(hours=1)).isoformat(),
            "departure_at": (NOW - timedelta(hours=1)).isoformat(),
            "return_at": arrival.isoformat(), "away_mode_id": "default",
            "destination_mode_id": "return_mode", "preparing_entities": [],
        }
        self.assertEqual(self.assert_scoped_matches_fresh()["target"].temperature, 24)
        self.clock[0] = arrival
        self.assertNotEqual(self.assert_scoped_matches_fresh()["target"].temperature, 24)
        self.clock[0] = NOW
        self.assertEqual(self.assert_scoped_matches_fresh()["target"].temperature, 24)
        self.data["planned_return_episode"]["state"] = "cancelled"
        self.assertNotEqual(self.assert_scoped_matches_fresh()["target"].temperature, 24)

    def test_observation_reads_preserve_stored_configuration_and_make_no_climate_calls(self):
        before = deepcopy(self.data)
        with self.scheduler.observation_snapshot():
            self.observations()
        self.assertEqual(self.data, before)
        self.assertEqual(self.climate.calls, [])


if __name__ == "__main__":
    unittest.main()
