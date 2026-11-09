"""Weekly references, runtime authority and bounded work for Room Assist."""
from copy import deepcopy
import asyncio
from datetime import UTC, datetime, timedelta, tzinfo
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch
from zoneinfo import ZoneInfo

from . import test_scheduler_application as application
from . import test_api as api_tests
from . import test_room_group_runtime as group_tests
from .test_confirmation_deadlines import _Clock
from .helpers import NOW, scheduler_module
from custom_components.velair import api
from custom_components.velair.execution import ExecutionAuthority
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.delivery_guard import record_delivery_receipt
from custom_components.velair.models import normalize_preconditioning_data
from custom_components.velair.room_sensor_schedule import (
    PreparedRoomSensorSchedule, RoomSensorScheduleRuntime, normalize_room_sensor_schedule,
)


def period(start="08:00", end="20:00", source="sensor.office", days=None):
    return {"weekdays": days or ["tuesday"], "start": start, "end": end, "source": source}


def schedule(*periods, default=None, enabled=True):
    return {"enabled": enabled, "default_source": default, "periods": list(periods)}


class RoomSensorScheduleModelTest(unittest.TestCase):
    def test_absent_field_is_not_added_to_legacy_normalized_data(self):
        self.assertNotIn("room_sensor_schedule", normalize_preconditioning_data(None))

    def test_disabled_configuration_is_retained_and_validated(self):
        value = schedule(period(), enabled=False)
        self.assertEqual(normalize_preconditioning_data({"room_sensor_schedule": value})["room_sensor_schedule"], value)

    def test_invalid_schedules_are_rejected(self):
        cases = [None, [], {"enabled": "yes"}, {"periods": {}},
                 schedule(period("08:00", "08:00")), schedule(period("24:00")),
                 schedule(period(source="climate.room")), schedule(period(source="sensor.bad id")),
                 schedule(period(days=["holiday"])), schedule(period(days=["tuesday", "tuesday"])),
                 schedule(period(), period("19:00", "22:00")),
                 schedule(period("22:00", "02:00", days=["sunday"]),
                          period("01:00", "03:00", days=["monday"]))]
        for value in cases:
            with self.subTest(value=value), self.assertRaises(ValueError):
                normalize_room_sensor_schedule(value)

    def test_touching_half_open_periods_and_overnight_week_boundary(self):
        config = normalize_room_sensor_schedule(schedule(
            period("22:00", "02:00", days=["sunday"]),
            period("02:00", "03:00", source="sensor.bedroom", days=["monday"])))
        prepared = PreparedRoomSensorSchedule(config)
        self.assertEqual(prepared.source_at(datetime(2026, 5, 18, 1, 59, tzinfo=UTC)), "sensor.office")
        self.assertEqual(prepared.source_at(datetime(2026, 5, 18, 2, 0, tzinfo=UTC)), "sensor.bedroom")
        self.assertIsNone(prepared.source_at(datetime(2026, 5, 18, 3, 0, tzinfo=UTC)))

    def test_same_source_boundaries_are_not_deadlines(self):
        prepared = PreparedRoomSensorSchedule(normalize_room_sensor_schedule(
            schedule(period(), default="sensor.office")))
        self.assertEqual(prepared.boundaries, ())
        self.assertIsNone(prepared.resolve(NOW).next_change)

    def test_spring_gap_changes_reference_at_actual_clock_jump(self):
        madrid = ZoneInfo("Europe/Madrid")
        prepared = PreparedRoomSensorSchedule(normalize_room_sensor_schedule(
            schedule(period("02:15", "04:00", days=["sunday"])) ))
        resolution = prepared.resolve(datetime(2026, 3, 29, 1, 55, tzinfo=madrid))
        self.assertIsNone(resolution.source)
        self.assertEqual(resolution.next_change.isoformat(), "2026-03-29T03:00:00+02:00")
        self.assertEqual(resolution.next_source, "sensor.office")

    def test_fall_fold_can_change_source_without_a_configured_boundary(self):
        madrid = ZoneInfo("Europe/Madrid")
        prepared = PreparedRoomSensorSchedule(normalize_room_sensor_schedule(
            schedule(period("01:30", "02:30", days=["sunday"])) ))
        resolution = prepared.resolve(datetime(2026, 10, 25, 2, 45, tzinfo=madrid, fold=0))
        self.assertIsNone(resolution.source)
        self.assertEqual(resolution.next_change.isoformat(), "2026-10-25T02:00:00+01:00")
        self.assertEqual(resolution.next_source, "sensor.office")

    def test_compiled_resolution_reused_until_boundary(self):
        runtime = RoomSensorScheduleRuntime()
        config = normalize_preconditioning_data({"room_sensor_assist_enabled": True,
            "room_sensor_schedule": schedule(period())})
        runtime.configure("climate.a", config, NOW)
        prepared = runtime.entries["climate.a"]["prepared"]
        with patch.object(prepared, "resolve", wraps=prepared.resolve) as resolve:
            for _ in range(100):
                self.assertEqual(runtime.config("climate.a", NOW)["room_temperature_entity_id"], "sensor.office")
            resolve.assert_not_called()

    def test_absolute_index_reuses_past_and_future_queries_without_expansion(self):
        runtime = RoomSensorScheduleRuntime()
        runtime.configure("climate.a", normalize_preconditioning_data({
            "room_sensor_assist_enabled": True, "room_sensor_schedule": schedule(period())}), NOW)
        entry = runtime.entries["climate.a"]
        prepared = entry["prepared"]
        before = {key: entry[key] for key in ("resolution", "at", "zone", "deadline", "authority_source", "effective")}
        queries = [NOW.replace(hour=7), NOW + timedelta(days=7), NOW + timedelta(days=14)]
        for query in queries:
            runtime.query("climate.a", query)
        with patch.object(prepared, "_build_window", wraps=prepared._build_window) as build:
            # Replacing boundaries with an iterable that cannot be walked proves
            # warmed lookups use the absolute index rather than weekly expansion.
            class NoWalk(tuple):
                def __iter__(self):
                    raise AssertionError("weekly boundaries walked on a warm query")
            prepared.boundaries = NoWalk(prepared.boundaries)
            for _ in range(10):
                for query in queries:
                    runtime.query("climate.a", query)
                    runtime.window_valid("climate.a", query, query + timedelta(minutes=30), query)
                runtime.earliest_start("climate.a", NOW - timedelta(minutes=30), NOW + timedelta(minutes=30), NOW)
            build.assert_not_called()
        self.assertEqual({key: entry[key] for key in before}, before)

    def test_absolute_index_is_bounded_and_timezone_specific(self):
        prepared = PreparedRoomSensorSchedule(normalize_room_sensor_schedule(schedule(period())))
        for week in range(8):
            prepared.resolve(NOW + timedelta(days=week * 7))
            self.assertLessEqual(len(prepared._windows), 4)
        with patch.object(prepared, "_build_window", wraps=prepared._build_window) as build:
            prepared.resolve(NOW + timedelta(days=49))
            build.assert_not_called()
            prepared.resolve((NOW + timedelta(days=49)).astimezone(ZoneInfo("Europe/Madrid")))
            self.assertEqual(build.call_count, 1)
            self.assertEqual(len(prepared._windows), 4)

    def test_historical_query_across_week_midnight_preserves_live_authority(self):
        runtime = RoomSensorScheduleRuntime()
        monday = datetime(2026, 5, 18, 0, 2, tzinfo=UTC)
        runtime.configure("climate.a", normalize_preconditioning_data({
            "room_sensor_assist_enabled": True,
            "room_sensor_schedule": schedule(period("23:30", "00:30", days=["sunday"]))}), monday)
        entry = runtime.entries["climate.a"]
        before = {key: entry[key] for key in ("resolution", "at", "zone", "deadline", "authority_source", "effective")}
        historical = monday - timedelta(minutes=4)
        for _ in range(3):
            resolution = runtime.query("climate.a", historical)
            self.assertEqual(resolution.source, "sensor.office")
            self.assertEqual(resolution.next_change, monday.replace(minute=30))
            self.assertEqual({key: entry[key] for key in before}, before)
        runtime.resolve("climate.a", historical)
        self.assertEqual(runtime.next_deadline(), monday.replace(minute=30))

    def test_offset_rollback_exposes_previous_week_fold_boundary_in_utc_future(self):
        class WeekRollback(tzinfo):
            """Monday 00:30 repeats the preceding Sunday from 23:30."""
            transition = datetime(2026, 5, 17, 23, 30)

            def utcoffset(self, value):
                wall = value.replace(tzinfo=None)
                if wall < self.transition:
                    return timedelta(hours=1)
                if wall < self.transition + timedelta(hours=1) and not value.fold:
                    return timedelta(hours=1)
                return timedelta(0)

            def dst(self, value):
                return timedelta(0)

            def fromutc(self, value):
                instant = value.replace(tzinfo=None)
                if instant < self.transition:
                    return (value + timedelta(hours=1)).replace(fold=0)
                return value.replace(fold=int(instant < self.transition + timedelta(hours=1)))

        zone = WeekRollback()
        now = datetime(2026, 5, 18, 0, 15, tzinfo=zone, fold=0)
        runtime = RoomSensorScheduleRuntime()
        runtime.configure("climate.a", normalize_preconditioning_data({
            "room_sensor_assist_enabled": True,
            "room_sensor_schedule": schedule(period("23:40", "23:50", days=["sunday"]))}), now)
        entry = runtime.entries["climate.a"]
        before = {key: entry[key] for key in ("resolution", "at", "zone", "deadline", "authority_source", "effective")}
        result = runtime.query("climate.a", now)
        self.assertIsNone(result.source)
        # Local Monday's previous Sunday still has a second, future UTC fold.
        self.assertEqual(result.next_change.astimezone(UTC), datetime(2026, 5, 17, 23, 40, tzinfo=UTC))
        self.assertEqual(result.next_change.weekday(), 6)
        self.assertEqual(result.next_change.fold, 1)
        self.assertEqual(result.next_source, "sensor.office")
        self.assertEqual({key: entry[key] for key in before}, before)

    def test_disabled_and_master_disabled_never_compile_intervals(self):
        runtime = RoomSensorScheduleRuntime()
        with patch("custom_components.velair.room_sensor_schedule.PreparedRoomSensorSchedule") as compile_:
            for master, enabled in ((False, True), (True, False)):
                runtime.configure("climate.a", normalize_preconditioning_data({
                    "room_sensor_assist_enabled": master,
                    "room_sensor_schedule": schedule(period(), enabled=enabled)}), NOW)
            compile_.assert_not_called()
        self.assertEqual(runtime.entries, {})
        self.assertIsNone(runtime.next_deadline())

    def test_delayed_drain_returning_to_same_reference_does_not_change_authority(self):
        runtime = RoomSensorScheduleRuntime()
        config = normalize_preconditioning_data({"room_sensor_assist_enabled": True,
            "room_sensor_schedule": schedule(period("18:10", "18:20", source=None), default="sensor.office")})
        runtime.configure("climate.a", config, NOW)
        self.assertEqual(runtime.drain(NOW + timedelta(minutes=30)), [])
        self.assertGreater(runtime.next_deadline(), NOW + timedelta(minutes=30))

    def test_clock_rewind_queues_source_retirement_then_new_local_deadline(self):
        runtime = RoomSensorScheduleRuntime()
        config = normalize_preconditioning_data({"room_sensor_assist_enabled": True,
            "room_sensor_schedule": schedule(period())})
        runtime.configure("climate.a", config, NOW)
        earlier = NOW.replace(hour=7)
        result = runtime.resolve("climate.a", earlier)
        self.assertIsNone(result.source)
        self.assertEqual(runtime.next_deadline(), earlier)
        self.assertEqual(runtime.drain(earlier), ["climate.a"])
        self.assertEqual(runtime.next_deadline(), earlier.replace(hour=8))

    def test_timezone_change_replaces_old_deadline_even_with_same_source(self):
        runtime = RoomSensorScheduleRuntime()
        config = normalize_preconditioning_data({"room_sensor_assist_enabled": True,
            "room_sensor_schedule": schedule(period())})
        runtime.configure("climate.a", config, NOW)
        new_zone = NOW.astimezone(ZoneInfo("Pacific/Honolulu"))
        result = runtime.resolve("climate.a", new_zone)
        self.assertEqual(result.source, "sensor.office")
        self.assertEqual(runtime.next_deadline(), result.next_change)
        self.assertEqual(result.next_change.hour, 20)

    def test_historical_and_future_predicates_do_not_mutate_live_authority(self):
        runtime = RoomSensorScheduleRuntime()
        config = normalize_preconditioning_data({"room_sensor_assist_enabled": True,
            "room_sensor_schedule": schedule(period())})
        runtime.configure("climate.a", config, NOW)
        entry = runtime.entries["climate.a"]
        before = {key: entry[key] for key in ("resolution", "at", "deadline", "authority_source", "effective")}
        for query in (NOW.replace(hour=7), NOW + timedelta(days=2)):
            runtime.earliest_start("climate.a", query, query + timedelta(hours=1), query)
            runtime.window_valid("climate.a", query, query + timedelta(hours=1), query)
            self.assertEqual({key: entry[key] for key in before}, before)
        self.assertEqual(runtime.drain(NOW), [])
        self.assertEqual(runtime.next_deadline(), NOW.replace(hour=20))


class RoomSensorScheduleRuntimeTest(unittest.IsolatedAsyncioTestCase):
    _async_save = application.VelairSchedulerPreconditioningTest._async_save

    def setUp(self):
        self.clock = [NOW]
        clock = patch.object(scheduler_module.dt_util, "now", lambda: self.clock[0])
        clock.start()
        self.addCleanup(clock.stop)
        application.VelairSchedulerPreconditioningTest.setUp(self)
        self.zone = self.data["zones"][self.entity_id]
        self.zone["schedule"]["tuesday"] = [
            {"start": "00:00", "action": "set_temperature", "temperature": 21, "hvac_mode": "heat"}]
        self.zone["preconditioning"].update(enabled=False, room_sensor_assist_enabled=True,
            room_temperature_entity_id="sensor.fixed",
            room_sensor_schedule=schedule(period("18:01", "18:02")))
        self.hass.states[self.entity_id] = SimpleNamespace(state="heat",
            attributes={"current_temperature": 21, "temperature": 21})
        for sensor in ("sensor.fixed", "sensor.office", "sensor.bedroom"):
            self.hass.states[sensor] = SimpleNamespace(state="19", attributes={"unit_of_measurement": "°C"})
        self.climate.steps[self.entity_id] = 0.5
        self.climate.limits[self.entity_id] = (5, 35)
        self.scheduler._prepare_runtime_projection(configuration=True)

    async def asyncTearDown(self):
        await self.scheduler.async_stop()

    async def tick(self, seconds):
        self.clock[0] = NOW + timedelta(seconds=seconds)
        await self.scheduler._handle_timer(self.clock[0])

    def test_native_source_is_explicit_and_fixed_sensor_is_preserved(self):
        status = self.scheduler.get_room_sensor_assist_status(self.entity_id)
        self.assertTrue(status["configured"])
        self.assertEqual(status["reason"], "native_reference")
        self.assertIsNone(status["room_sensor_schedule"]["effective_source"])
        self.assertEqual(status["room_sensor_schedule"]["next_source"], "sensor.office")
        self.assertEqual(self.scheduler._current_temperature(self.entity_id), 21)
        self.assertEqual(self.zone["preconditioning"]["room_temperature_entity_id"], "sensor.fixed")

    async def test_native_external_native_delivers_once_each_without_saves(self):
        self.scheduler.async_schedule_next_event()
        saves = self.save_count
        await self.tick(60)
        self.assertEqual(len(self.climate.calls), 1)
        self.assertEqual(self.scheduler._room_sensor_assist_states[self.entity_id].room_temperature_entity_id, "sensor.office")
        self.assertEqual(self.scheduler._temperature_source_entity_id(self.entity_id), "sensor.office")
        self.assertIn("sensor.office", self.scheduler._room_sensor_assist_entities)
        self.assertNotIn("sensor.fixed", self.scheduler._room_sensor_assist_entities)
        await self.tick(120)
        self.assertEqual(len(self.climate.calls), 2)
        self.assertEqual(self.climate.calls[-1][2], 21)
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)
        self.assertEqual(self.save_count, saves)

    async def test_equal_readings_still_switch_source_and_retire_phase(self):
        self.zone["preconditioning"]["room_sensor_schedule"] = schedule(
            period("18:01", "18:02", source="sensor.bedroom"), default="sensor.office")
        self.scheduler.async_schedule_next_event()
        await self.scheduler.async_apply_current_schedule()
        old = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.climate.calls.clear()
        await self.tick(60)
        self.assertEqual(len(self.climate.calls), 1)
        state = self.scheduler._room_sensor_assist_states[self.entity_id]
        self.assertIsNot(state, old)
        self.assertEqual(state.room_temperature_entity_id, "sensor.bedroom")

    async def test_coincident_thermal_boundary_sends_only_latest_target(self):
        self.zone["schedule"]["tuesday"].append(
            {"start": "18:01", "action": "set_temperature", "temperature": 23, "hvac_mode": "heat"})
        self.scheduler.async_schedule_next_event()
        await self.tick(60)
        self.assertEqual(len(self.climate.calls), 1)
        self.assertEqual(self.scheduler._room_sensor_assist_states[self.entity_id].target_temperature, 23)

    async def test_delayed_timer_does_not_replay_intermediate_reference(self):
        self.scheduler.async_schedule_next_event()
        await self.tick(180)
        self.assertEqual(self.climate.calls, [])
        self.assertEqual(self.save_count, 0)

    async def test_unavailable_sensor_delivers_nominal_and_recovers(self):
        self.hass.states["sensor.office"].state = "unavailable"
        self.scheduler.async_schedule_next_event()
        await self.tick(60)
        self.assertEqual(self.climate.calls[-1][2], 21)
        status = self.scheduler.get_room_sensor_assist_status(self.entity_id)
        self.assertEqual(status["reason"], "room_sensor_unavailable")
        self.assertEqual(status["room_temperature_entity_id"], "sensor.office")
        self.hass.states["sensor.office"].state = "19"
        await self.scheduler._async_refresh_room_sensor_assist_from_current_event(self.entity_id)
        self.assertIn(self.entity_id, self.scheduler._room_sensor_assist_states)

    async def test_pause_manual_boost_stopped_external_do_not_deliver_on_reference_change(self):
        for kind in ("pause", "manual", "boost", "stopped", "external"):
            with self.subTest(kind=kind):
                self.clock[0] = NOW
                self.zone.pop("execution", None)
                self.zone["override"] = None
                self.scheduler._stopped = False
                self.scheduler._prepare_runtime_projection(configuration=True)
                if kind == "pause":
                    await self.scheduler.async_pause_zone(self.entity_id, pause_id="window")
                elif kind == "manual":
                    await self.scheduler.async_pause_zone(self.entity_id, pause_id="manual_adjustment")
                elif kind == "boost":
                    self.zone["override"] = {"type": "boost", "temperature": 24,
                        "until": (NOW + timedelta(hours=1)).isoformat()}
                elif kind == "stopped":
                    self.scheduler._stopped = True
                else:
                    self.zone["execution"] = {"type": "external", "provider": "test"}
                    self.scheduler._execution_authority = ExecutionAuthority(self.data)
                self.scheduler.async_schedule_next_event()
                self.climate.calls.clear()
                self.clock[0] = NOW + timedelta(seconds=60)
                await self.scheduler._handle_timer(self.clock[0])
                self.assertEqual(self.climate.calls, [])
                status = self.scheduler.get_room_sensor_assist_status(self.entity_id)
                self.assertEqual(status["status"], "blocked")
                self.assertNotIn(status["reason"], ("native_reference", "room_sensor_unavailable"))
                self.zone.pop("pauses", None)
        self.scheduler._stopped = False

    async def assert_boost_confirmation_survives_boundary(self, *, paused=False):
        if paused:
            await self.scheduler.async_set_mode("paused")
        self.climate.snapshots[self.entity_id] = {"hvac_mode": "heat", "temperature": 21}
        coordinator = self.scheduler._climate_delivery
        coordinator._receipt_matcher = ClimateManager(self.hass).compare_receipt
        original = self.climate.async_set_temperature
        attempts = []
        async def physical(entity, target, **kwargs):
            attempts.append(target)
            await original(entity, target, **kwargs)
            # The first accepted Boost command has no device echo. Its retry
            # after the source boundary is observed and can confirm normally.
            if len(attempts) > 1:
                self.hass.states[entity].attributes["temperature"] = target
            record_delivery_receipt(entity, {"temperature": target})
        self.climate.async_set_temperature = physical
        clock = _Clock()
        with patch.object(asyncio.get_running_loop(), "call_later", clock.call_later):
            await self.scheduler.async_set_zone_boost(self.entity_id, 24,
                (NOW + timedelta(hours=1)).isoformat(), hvac_mode="heat")
            self.assertEqual(attempts, [24])
            self.assertIn(self.entity_id, coordinator._receipts)
            deadline = coordinator._confirmation_deadlines[self.entity_id]
            resolver = coordinator._eligible[self.entity_id]
            generation = coordinator._generations[self.entity_id]
            assist_generation = self.scheduler._room_sensor_assist_generation(self.entity_id)
            saves = self.save_count
            await self.tick(60)
            self.assertEqual(self.scheduler._temperature_source_entity_id(self.entity_id), "sensor.office")
            self.assertEqual(attempts, [24])
            self.assertEqual(self.save_count, saves)
            self.assertEqual(coordinator._generations[self.entity_id], generation)
            self.assertEqual(self.scheduler._room_sensor_assist_generation(self.entity_id), assist_generation)
            self.assertIs(coordinator._eligible[self.entity_id], resolver)
            self.assertIs(coordinator._confirmation_deadlines[self.entity_id], deadline)
            self.assertFalse(deadline.cancelled)
            self.assertTrue(coordinator.retry_current(self.entity_id))
            clock.advance(2)
            for _ in range(20):
                await asyncio.sleep(0)
            self.assertEqual(attempts, [24, 24])
            self.assertNotIn(self.entity_id, coordinator._receipts)
            self.assertEqual(coordinator._retry_counts[self.entity_id], 1)
        await self.scheduler.async_cancel_zone_boost(self.entity_id)
        if paused:
            await self.scheduler.async_set_mode("auto", apply_current_schedule=True)
        self.assertEqual(self.scheduler._room_sensor_assist_states[self.entity_id].room_temperature_entity_id,
                         "sensor.office")
        self.assertEqual(self.scheduler._room_sensor_assist_states[self.entity_id].target_temperature, 21)

    async def test_pending_boost_confirmation_and_recovery_survive_reference_boundary(self):
        await self.assert_boost_confirmation_survives_boundary()

    async def test_paused_scheduler_boost_recovery_and_resume_use_current_reference(self):
        await self.assert_boost_confirmation_survives_boundary(paused=True)

    async def test_disabling_schedule_restores_fixed_sensor_and_retains_periods(self):
        config = deepcopy(self.zone["preconditioning"]["room_sensor_schedule"])
        config["enabled"] = False
        await self.scheduler.async_update_zone_preconditioning(self.entity_id, {"room_sensor_schedule": config})
        self.assertEqual(self.scheduler._temperature_source_entity_id(self.entity_id), "sensor.fixed")
        self.assertEqual(self.zone["preconditioning"]["room_sensor_schedule"], config)
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_schedules.entries)

    async def test_enable_assist_without_fixed_sensor_with_valid_schedule(self):
        self.zone["preconditioning"]["room_temperature_entity_id"] = None
        self.zone["preconditioning"]["room_sensor_assist_enabled"] = False
        self.scheduler._prepare_runtime_projection(configuration=True)
        await self.scheduler.async_set_room_sensor_assist(self.entity_id, True)
        self.assertTrue(self.zone["preconditioning"]["room_sensor_assist_enabled"])

    async def test_setting_new_native_reference_restores_latest_nominal_once(self):
        self.zone["preconditioning"]["room_sensor_schedule"] = schedule(default="sensor.office")
        self.scheduler.async_schedule_next_event()
        await self.scheduler.async_apply_current_schedule()
        self.climate.calls.clear()
        await self.scheduler.async_update_zone_preconditioning(self.entity_id,
            {"room_sensor_schedule": schedule(default=None)})
        self.assertEqual(len(self.climate.calls), 1)
        self.assertEqual(self.climate.calls[0][2], 21)
        self.assertNotIn(self.entity_id, self.scheduler._room_sensor_assist_states)

    def test_repeated_status_reads_do_not_compile_or_expand_source_schedule(self):
        prepared = self.scheduler._room_sensor_schedules.entries[self.entity_id]["prepared"]
        with patch.object(prepared, "resolve", wraps=prepared.resolve) as resolve:
            for _ in range(20):
                self.scheduler.get_room_sensor_assist_status(self.entity_id)
            resolve.assert_not_called()

    def test_published_calendar_is_plain_mutable_and_fully_detached(self):
        first = self.scheduler.get_published_configuration()
        calendar = first["zones"][self.entity_id]["preconditioning"]["room_sensor_schedule"]
        self.assertIs(type(calendar), dict)
        self.assertIs(type(calendar["periods"]), list)
        self.assertIs(type(calendar["periods"][0]), dict)
        self.assertIs(type(calendar["periods"][0]["weekdays"]), list)
        calendar["default_source"] = "sensor.bedroom"
        calendar["periods"][0]["source"] = "sensor.bedroom"
        calendar["periods"][0]["weekdays"].append("wednesday")
        calendar["periods"].append(period("22:00", "23:00"))
        expected = schedule(period("18:01", "18:02"))
        self.assertEqual(self.zone["preconditioning"]["room_sensor_schedule"], expected)
        second = self.scheduler.get_published_configuration()
        self.assertEqual(second["zones"][self.entity_id]["preconditioning"]["room_sensor_schedule"], expected)
        self.assertIsNot(second["zones"][self.entity_id]["preconditioning"]["room_sensor_schedule"], calendar)

    def test_committed_inplace_calendar_change_replaces_published_copy_sources(self):
        first = self.scheduler.get_published_configuration()
        calendar = self.zone["preconditioning"]["room_sensor_schedule"]
        calendar["periods"][0]["weekdays"].append("wednesday")
        calendar["default_source"] = "sensor.bedroom"
        self.scheduler._prepare_runtime_projection(configuration=True)
        second = self.scheduler.get_published_configuration()
        self.assertEqual(second["zones"][self.entity_id]["preconditioning"]["room_sensor_schedule"], calendar)
        self.assertEqual(first["zones"][self.entity_id]["preconditioning"]["room_sensor_schedule"],
                         schedule(period("18:01", "18:02")))

    def api_runtime(self):
        self.zone["preconditioning"] = normalize_preconditioning_data(self.zone["preconditioning"])
        self.scheduler._prepare_runtime_projection(configuration=True)
        return {"scheduler": self.scheduler,
                "storage": SimpleNamespace(data=self.data, _climate_entities=[self.entity_id],
                                           effective_temperature_unit="°C"),
                "entry": SimpleNamespace(options={}, data={})}

    def test_live_api_calendar_is_bounded_summary_and_detail_is_full(self):
        response = api._build_schedule_response(self.api_runtime())
        summary = response["zones"][self.entity_id]["preconditioning"]["room_sensor_schedule"]
        self.assertEqual(summary, {"enabled": True, "default_source": None, "period_count": 1})
        self.assertNotIn("periods", summary)
        summary["enabled"] = False
        detail = self.scheduler.get_room_sensor_schedule_configuration(self.entity_id)
        self.assertEqual(detail, {"entity_id": self.entity_id,
            "room_sensor_schedule": schedule(period("18:01", "18:02"))})
        detail["room_sensor_schedule"]["periods"][0]["weekdays"].append("wednesday")
        self.assertEqual(self.scheduler.get_room_sensor_schedule_configuration(self.entity_id)[
            "room_sensor_schedule"], schedule(period("18:01", "18:02")))
        # Default full getter remains available to exports and existing callers.
        self.assertIn("periods", self.scheduler.get_published_configuration()[
            "zones"][self.entity_id]["preconditioning"]["room_sensor_schedule"])

    def test_disabled_calendar_summary_and_detail_preserve_configuration(self):
        self.zone["preconditioning"]["room_sensor_schedule"]["enabled"] = False
        self.scheduler._prepare_runtime_projection(configuration=True)
        response = api._build_schedule_response(self.api_runtime())
        summary = response["zones"][self.entity_id]["preconditioning"]["room_sensor_schedule"]
        self.assertEqual(summary, {"enabled": False, "default_source": None, "period_count": 1})
        self.assertEqual(self.scheduler.get_room_sensor_schedule_configuration(self.entity_id)[
            "room_sensor_schedule"], schedule(period("18:01", "18:02"), enabled=False))

    async def test_readonly_detail_handler_validates_managed_target_and_does_not_save(self):
        runtime = self.api_runtime()
        with patch.object(api, "_get_runtime", return_value=runtime):
            for entity in (self.entity_id, "climate.unmanaged", "sensor.office"):
                connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
                await api.ws_get_room_sensor_schedule(self.hass, connection,
                    {"id": 1, "type": "velair/get_room_sensor_schedule", "entity_id": entity})
                if entity == self.entity_id:
                    connection.send_result.assert_called_once_with(1,
                        {"entity_id": self.entity_id,
                         "room_sensor_schedule": schedule(period("18:01", "18:02"))})
                    connection.send_error.assert_not_called()
                else:
                    connection.send_result.assert_not_called()
                    self.assertEqual(connection.send_error.call_args.args[:2], (1, "invalid_entity"))
        self.assertEqual(self.save_count, 0)
        self.assertEqual(self.climate.calls, [])

    async def test_detail_and_live_summary_publish_only_committed_settings_during_save(self):
        old = schedule(period("18:01", "18:02"))
        updated = schedule(period("08:00", "17:00"), default="sensor.bedroom")
        during = []
        save = self.scheduler._async_save_data
        async def inspect_pending():
            during.append((self.scheduler.get_room_sensor_schedule_configuration(self.entity_id),
                           self.scheduler.get_published_configuration_summary()))
            await save()
        self.scheduler._async_save_data = inspect_pending
        await self.scheduler.async_update_zone_preconditioning(self.entity_id,
            {"room_sensor_schedule": updated})
        self.assertEqual(during[0][0]["room_sensor_schedule"], old)
        self.assertEqual(during[0][1]["zones"][self.entity_id]["preconditioning"]["room_sensor_schedule"],
                         {"enabled": True, "default_source": None, "period_count": 1})
        self.assertEqual(self.scheduler.get_room_sensor_schedule_configuration(self.entity_id)[
            "room_sensor_schedule"], updated)

    async def test_failed_save_keeps_previous_detail_and_summary(self):
        async def fail():
            raise OSError("storage unavailable")
        self.scheduler._async_save_data = fail
        with self.assertRaisesRegex(OSError, "storage unavailable"):
            await self.scheduler.async_update_zone_preconditioning(self.entity_id,
                {"room_sensor_schedule": schedule(default="sensor.bedroom")})
        self.assertEqual(self.scheduler.get_room_sensor_schedule_configuration(self.entity_id)[
            "room_sensor_schedule"], schedule(period("18:01", "18:02")))

    def test_early_windows_must_not_cross_reference_boundaries(self):
        runtime = self.scheduler._room_sensor_schedules
        self.assertFalse(runtime.window_valid(self.entity_id, NOW, NOW + timedelta(minutes=2), NOW))
        self.assertFalse(runtime.window_valid(self.entity_id, NOW, NOW + timedelta(minutes=1), NOW))
        self.assertTrue(runtime.window_valid(self.entity_id, NOW, NOW + timedelta(seconds=30), NOW))

    async def test_cooling_and_heat_cool_ranges_restore_nominal_once(self):
        for mode, values in (("cool", {"temperature": 24}),
                             ("heat_cool", {"target_temp_low": 20, "target_temp_high": 24})):
            with self.subTest(mode=mode):
                self.clock[0] = NOW
                self.scheduler._timer_cursor = NOW
                self.zone["schedule"]["tuesday"] = [{"start": "00:00", "action": "set_temperature",
                    "hvac_mode": mode, **values}]
                self.hass.states[self.entity_id].state = mode
                self.hass.states[self.entity_id].attributes["current_temperature"] = 26
                self.hass.states["sensor.office"].state = "27"
                self.climate.temperature_range_support[self.entity_id] = True
                self.climate.hvac_modes[self.entity_id] = ["off", "heat", "cool", "heat_cool"]
                self.scheduler.async_schedule_next_event()
                self.climate.calls.clear()
                await self.tick(60)
                self.assertEqual(len(self.climate.calls), 1)
                self.assertIn(self.entity_id, self.scheduler._room_sensor_assist_states)
                await self.tick(120)
                self.assertEqual(len(self.climate.calls), 2)
                final = self.climate.calls[-1]
                self.assertEqual(final[2:4] if mode == "heat_cool" else final[2],
                                 (20, 24) if mode == "heat_cool" else 24)

    async def test_restart_resolves_current_reference_without_replaying_changes(self):
        from .helpers import VelairScheduler, normalize_schedule_data
        from custom_components.velair.models import serialize_schedule_data
        stored = deepcopy(serialize_schedule_data(normalize_schedule_data(
            {"zones": self.data["zones"]}, [self.entity_id])))
        await self.scheduler.async_stop()
        self.clock[0] = NOW + timedelta(seconds=60)
        loaded = normalize_schedule_data(stored, [self.entity_id])
        self.scheduler = VelairScheduler(self.hass, loaded, self.climate, self._async_save)
        self.assertEqual(self.scheduler._temperature_source_entity_id(self.entity_id), "sensor.office")
        self.assertEqual(self.scheduler._current_temperature(self.entity_id), 19)
        self.assertEqual(self.climate.calls, [])

    def test_forecast_rebuilt_for_equal_reading_source_change_and_schedule_edit(self):
        self.zone["preconditioning"].update(enabled=True, fallback_minutes_per_degree=30)
        self.zone["schedule"]["tuesday"] = [{"start": "19:00", "action": "set_temperature",
            "temperature": 21, "hvac_mode": "heat"}]
        self.zone["preconditioning"]["room_sensor_schedule"] = schedule(period("18:01", "21:00"))
        self.hass.states[self.entity_id].attributes["current_temperature"] = 19
        self.scheduler.async_schedule_next_event()
        def target():
            return next(event for event in self.scheduler._iter_future_events(self.clock[0])
                        if event.weekday == "tuesday" and event.start == "19:00")
        self.assertIsNone(target().target_when)
        self.clock[0] += timedelta(minutes=1)
        self.scheduler._prepare_runtime_projection(self.clock[0])
        self.assertIsNotNone(target().target_when)
        self.assertEqual(target().preconditioning_diagnostics["final_lead_minutes"], 59)
        # Current office source stays the same, but a future native interval now
        # crosses the planned early window. Rebuild even when predicted lead is equal.
        self.zone["preconditioning"]["room_sensor_schedule"] = schedule(
            period("18:30", "18:45", source=None), default="sensor.office")
        self.scheduler._prepare_runtime_projection(self.clock[0], configuration=True)
        self.assertIsNone(target().target_when)

    def test_learning_prediction_and_api_readiness_use_only_current_source(self):
        self.zone["preconditioning"]["enabled"] = True
        samples = [{**api_tests._sample("heat", "complete", minutes=40),
                    "temperature_source_entity_id": "sensor.office"} for _ in range(5)]
        self.data["preconditioning_learning"] = {
            self.entity_id: {"heat": {"observations": samples}, "cool": {"observations": []}}}
        self.scheduler._prepare_runtime_projection(configuration=True)
        summary = api._build_preconditioning_learning_response(
            self.data, api_tests.FakeClimateCapabilities(["heat"]), self.scheduler)[self.entity_id]
        self.assertEqual(summary["total_samples"], 0)
        self.assertEqual(summary["status"], "learning")
        self.clock[0] += timedelta(minutes=1)
        self.scheduler._prepare_runtime_projection(self.clock[0])
        summary = api._build_preconditioning_learning_response(
            self.data, api_tests.FakeClimateCapabilities(["heat"]), self.scheduler)[self.entity_id]
        self.assertEqual(summary["total_samples"], 5)
        self.assertEqual(summary["status"], "ready")
        self.assertEqual(len(self.data["preconditioning_learning"][self.entity_id]["heat"]["observations"]), 5)

    async def test_scalar_learning_session_crossing_reference_is_discarded(self):
        self.zone["preconditioning"]["enabled"] = True
        session = scheduler_module._PreconditioningSession(
            entity_id=self.entity_id, direction="heat", started_at=NOW,
            target_when=NOW + timedelta(minutes=2), weekday="tuesday", start="00:00",
            target_temperature=21, target_kind="scalar", target_boundary="temperature",
            start_temperature=19, hvac_mode="heat", startup_minutes=10,
            outdoor_temp_start=None, temperature_source_entity_id=self.entity_id)
        self.scheduler._preconditioning_sessions[self.entity_id] = session
        self.clock[0] += timedelta(minutes=1)
        await self.scheduler._async_observe_preconditioning_temperature(self.entity_id, self.clock[0], 22)
        self.assertNotIn(self.entity_id, self.scheduler._preconditioning_sessions)
        self.assertEqual(self.save_count, 0)

    def test_api_status_and_learning_reads_never_validate_calendar_again(self):
        from custom_components.velair import room_sensor_schedule
        for enabled in (False, True):
            self.zone["preconditioning"]["room_sensor_schedule"]["enabled"] = enabled
            self.zone["preconditioning"]["enabled"] = True
            self.scheduler._prepare_runtime_projection(configuration=True)
            with patch.object(room_sensor_schedule, "normalize_room_sensor_schedule",
                              wraps=room_sensor_schedule.normalize_room_sensor_schedule) as validate:
                for _ in range(10):
                    self.scheduler.get_room_sensor_assist_status(self.entity_id)
                    self.scheduler._current_temperature(self.entity_id)
                    self.scheduler._iter_future_events(self.clock[0])
                    api._build_preconditioning_learning_response(self.data,
                        api_tests.FakeClimateCapabilities(["heat"]), self.scheduler)
                validate.assert_not_called()

    async def test_transition_does_not_compile_or_deliver_unrelated_zone(self):
        other = "climate.other"
        self.data["zones"][other] = deepcopy(self.zone)
        self.data["zones"][other]["preconditioning"].pop("room_sensor_schedule")
        self.hass.states[other] = deepcopy(self.hass.states[self.entity_id])
        self.scheduler.async_schedule_next_event()
        with patch("custom_components.velair.room_sensor_schedule.PreparedRoomSensorSchedule",
                   wraps=PreparedRoomSensorSchedule) as compile_:
            await self.tick(60)
            compile_.assert_not_called()
        self.assertEqual({call[1] for call in self.climate.calls}, {self.entity_id})

    async def test_invalid_schedule_update_is_atomic(self):
        before = deepcopy(self.data)
        with self.assertRaisesRegex(ValueError, "overlap"):
            await self.scheduler.async_update_zone_preconditioning(self.entity_id,
                {"room_sensor_schedule": schedule(period(), period("19:00", "22:00"))})
        self.assertEqual(self.data, before)
        self.assertEqual(self.save_count, 0)

    def test_optout_registered_callback_has_no_schedule_runtime_dependency(self):
        self.zone["preconditioning"].pop("room_sensor_schedule")
        callbacks = []
        def track(_hass, entities, callback):
            callbacks.append((tuple(entities), callback))
            return lambda: None
        with patch.object(scheduler_module, "async_track_state_change_event", side_effect=track):
            self.scheduler.async_schedule_next_event()
        callback = callbacks[-1][1]
        self.assertEqual(callback, self.scheduler._handle_room_sensor_assist_state_change)
        # The ordinary registered callback queues its existing debounce without
        # consulting the optional scheduling controller at all.
        with patch.object(self.scheduler, "_room_sensor_schedules", object()):
            callback(SimpleNamespace(data={"entity_id": "sensor.fixed"}))
        self.assertIsNotNone(self.scheduler._unsub_room_sensor_assist_timer)

    async def test_same_sensor_schedule_toggle_rebinds_real_callback_and_limits_mixed_drain(self):
        self.zone["preconditioning"].pop("room_sensor_schedule")
        other = "climate.other"
        self.data["zones"][other] = deepcopy(self.zone)
        self.data["zones"][other]["preconditioning"]["room_temperature_entity_id"] = "sensor.other"
        self.hass.states[other] = deepcopy(self.hass.states[self.entity_id])
        self.hass.states["sensor.other"] = deepcopy(self.hass.states["sensor.fixed"])
        callbacks = []
        def track(_hass, entities, callback):
            callbacks.append((tuple(entities), callback))
            return lambda: None
        with patch.object(scheduler_module, "async_track_state_change_event", side_effect=track):
            self.scheduler.async_schedule_next_event()
            legacy_entities, legacy = callbacks[-1]
            self.assertEqual(legacy, self.scheduler._handle_room_sensor_assist_state_change)
            self.zone["preconditioning"]["room_sensor_schedule"] = schedule(default="sensor.fixed")
            self.scheduler.async_schedule_next_event()
            scheduled_entities, scheduled = callbacks[-1]
            self.assertEqual(scheduled_entities, legacy_entities)
            self.assertEqual(scheduled, self.scheduler._handle_scheduled_room_sensor_assist_state_change)
            with patch.object(self.scheduler, "_async_refresh_room_sensor_assist_candidates", new_callable=AsyncMock) as drain:
                scheduled(SimpleNamespace(data={"entity_id": "sensor.fixed"}))
                self.scheduler._handle_room_sensor_assist_timer(self.clock[0])
                await asyncio.sleep(0)
                drain.assert_awaited_once_with([self.entity_id])
            # Repeated ingress accumulates both affected sources while arming
            # the existing debounce only once, rather than repeating no-op work.
            with patch.object(self.scheduler, "_schedule_room_sensor_assist_refresh",
                              wraps=self.scheduler._schedule_room_sensor_assist_refresh) as arm, \
                 patch.object(self.scheduler, "_async_refresh_room_sensor_assist_candidates", new_callable=AsyncMock) as drain:
                scheduled(SimpleNamespace(data={"entity_id": "sensor.fixed"}))
                scheduled(SimpleNamespace(data={"entity_id": "sensor.fixed"}))
                scheduled(SimpleNamespace(data={"entity_id": "sensor.other"}))
                arm.assert_called_once_with()
                self.assertEqual(self.scheduler._pending_room_sensor_sources, {"sensor.fixed", "sensor.other"})
                self.scheduler._handle_room_sensor_assist_timer(self.clock[0])
                await asyncio.sleep(0)
                drain.assert_awaited_once_with(sorted([self.entity_id, other]))
            self.zone["preconditioning"]["room_sensor_schedule"]["enabled"] = False
            self.scheduler.async_schedule_next_event()
            disabled_entities, disabled = callbacks[-1]
            self.assertEqual(disabled_entities, legacy_entities)
            self.assertEqual(disabled, self.scheduler._handle_room_sensor_assist_state_change)
            self.assertIsNone(self.scheduler._pending_room_sensor_sources)
            # A scheduled callback queued before the rebind must not narrow a
            # later legacy batch and drop another zone's coalesced update.
            with patch.object(self.scheduler, "_async_refresh_room_sensor_assist_candidates", new_callable=AsyncMock) as drain:
                scheduled(SimpleNamespace(data={"entity_id": "sensor.fixed"}))
                disabled(SimpleNamespace(data={"entity_id": "sensor.other"}))
                self.assertIsNone(self.scheduler._pending_room_sensor_sources)
                self.scheduler._handle_room_sensor_assist_timer(self.clock[0])
                await asyncio.sleep(0)
                drain.assert_awaited_once_with(sorted([self.entity_id, other]))

    def configure_sensor_replanning(self):
        self.zone["preconditioning"].update(enabled=True, fallback_minutes_per_degree=20,
            room_sensor_schedule=schedule(default="sensor.office"))
        self.zone["schedule"]["tuesday"] = [{"start": "22:00", "action": "set_temperature",
            "temperature": 21, "hvac_mode": "heat"}]
        self.scheduler.async_schedule_next_event()

    def test_actual_sensor_replan_changes_start_without_configuration_or_calendar_work(self):
        self.configure_sensor_replanning()
        previous = self.scheduler.next_event.when
        prepared = self.scheduler._room_sensor_schedules.entries[self.entity_id]["prepared"]
        with patch.object(self.scheduler._schedule_projection, "prepare_configuration",
                          wraps=self.scheduler._schedule_projection.prepare_configuration) as configure, \
             patch.object(prepared, "resolve", wraps=prepared.resolve) as resolve:
            self.hass.states["sensor.office"].state = "20"
            self.scheduler._handle_preconditioning_replan_state_change(SimpleNamespace(data={
                "entity_id": "sensor.office", "new_state": self.hass.states["sensor.office"]}))
            self.assertIsNotNone(self.scheduler._unsub_preconditioning_replan_timer)
            self.clock[0] += timedelta(seconds=20)
            self.scheduler._handle_preconditioning_replan_timer(self.clock[0])
            configure.assert_not_called()
            resolve.assert_not_called()
        self.assertGreater(self.scheduler.next_event.when, previous)
        self.assertIsNotNone(self.scheduler._unsub_timer)

    async def test_sensor_replan_falls_back_for_changed_horizon_timezone_capability_or_missing_preparation(self):
        self.configure_sensor_replanning()
        for case in ("day", "timezone", "capability", "missing", "pending", "cursor"):
            with self.subTest(case=case):
                self.clock[0] = NOW
                self.scheduler._timer_cursor = NOW
                self.scheduler._prepare_runtime_projection(NOW, configuration=True, refresh_horizon=True)
                if case == "day":
                    self.clock[0] += timedelta(days=1)
                elif case == "timezone":
                    self.clock[0] = NOW.astimezone(ZoneInfo("Europe/Madrid"))
                elif case == "capability":
                    self.climate.steps[self.entity_id] = 0.25
                elif case == "missing":
                    self.scheduler._schedule_projection.schedules.pop(self.entity_id)
                elif case == "pending":
                    self.scheduler._projection_horizon_refresh_pending = True
                else:
                    self.scheduler._timer_cursor = NOW - timedelta(days=10)
                with patch.object(self.scheduler._schedule_projection, "prepare_configuration",
                                  wraps=self.scheduler._schedule_projection.prepare_configuration) as configure:
                    self.scheduler._handle_preconditioning_replan_timer(self.clock[0])
                    self.assertGreater(configure.call_count, 0)

    def test_prepared_sensor_replan_keeps_source_deadline_and_cursor_scan_armed(self):
        self.configure_sensor_replanning()
        self.zone["preconditioning"]["room_sensor_schedule"] = schedule(period("18:01", "23:00"))
        self.scheduler.async_schedule_next_event()
        self.scheduler._timer_cursor = NOW - timedelta(minutes=1)
        self.clock[0] += timedelta(seconds=20)
        with patch.object(self.scheduler._schedule_projection, "prepare_configuration",
                          wraps=self.scheduler._schedule_projection.prepare_configuration) as configure, \
             patch.object(scheduler_module, "async_track_point_in_time", return_value=lambda: None) as track:
            self.scheduler._handle_preconditioning_replan_timer(self.clock[0])
            configure.assert_not_called()
        self.assertEqual(track.call_args.args[2], NOW + timedelta(minutes=1))
        self.assertEqual(self.scheduler.next_event.when.hour, 22)

    def test_default_reschedule_still_sees_nested_configuration_mutations(self):
        self.configure_sensor_replanning()
        self.zone["schedule"]["tuesday"][0]["temperature"] = 23
        self.zone["preconditioning"]["room_sensor_schedule"]["default_source"] = None
        self.scheduler.async_schedule_next_event()
        self.assertEqual(self.scheduler.next_event.temperature, 23)
        self.assertEqual(self.scheduler._temperature_source_entity_id(self.entity_id), self.entity_id)

    async def test_historical_cursor_forecast_does_not_rewind_live_source_deadline(self):
        self.clock[0] = NOW.replace(hour=0, minute=2) + timedelta(days=1)
        self.zone["preconditioning"].update(enabled=True, fallback_minutes_per_degree=30,
            room_sensor_schedule=schedule(period("00:01", "23:00", days=["wednesday"])))
        self.zone["schedule"]["tuesday"] = []
        self.zone["schedule"]["wednesday"] = [{"start": "00:30", "action": "set_temperature",
            "temperature": 21, "hvac_mode": "heat"}]
        self.hass.states[self.entity_id].attributes["current_temperature"] = 19
        self.scheduler._prepare_runtime_projection(self.clock[0], configuration=True, refresh_horizon=True)
        self.scheduler._timer_cursor = self.clock[0] - timedelta(minutes=3)
        entry = self.scheduler._room_sensor_schedules.entries[self.entity_id]
        before = {key: entry[key] for key in ("resolution", "at", "deadline", "authority_source", "effective")}
        for _ in range(2):
            self.scheduler._calculate_next_action_time(self.clock[0])
            self.assertEqual({key: entry[key] for key in before}, before)
            self.assertEqual(self.scheduler._room_sensor_schedules.next_deadline(),
                             self.clock[0].replace(hour=23, minute=0))
        self.assertEqual(self.scheduler._room_sensor_schedules.drain(self.clock[0]), [])

    async def test_preconditioning_reset_preserves_sensor_schedule(self):
        expected = deepcopy(self.zone["preconditioning"]["room_sensor_schedule"])
        await self.scheduler.async_reset_zone_preconditioning_settings(self.entity_id)
        self.assertEqual(self.zone["preconditioning"]["room_sensor_schedule"], expected)


class RoomSensorSchedulePortabilityTest(unittest.TestCase):
    def test_v26_round_trip_and_malformed_import_leave_storage_intact(self):
        runtime = api_tests.PortableTemperatureContractTest()._runtime(api.CELSIUS)
        runtime["entry"] = SimpleNamespace(options={})
        config = schedule(period("22:00", "02:00", days=["sunday"]), default="sensor.bedroom")
        runtime["storage"].data["zones"]["climate.salon"]["preconditioning"]["room_sensor_schedule"] = config
        payload = api._build_export_payload(runtime, ["zones"])
        self.assertEqual(payload["model_version"], 26)
        imported = api._build_import_data(runtime, payload, ["zones"])
        self.assertEqual(imported["zones"]["climate.salon"]["preconditioning"]["room_sensor_schedule"], config)
        before = deepcopy(runtime["storage"].data)
        payload["sections"]["zones"]["climate.salon"]["preconditioning"]["room_sensor_schedule"] = schedule(
            period(), period("19:00", "22:00"))
        with self.assertRaisesRegex(ValueError, "overlap"):
            api._build_import_data(runtime, payload, ["zones"])
        self.assertEqual(runtime["storage"].data, before)

    def test_websocket_schema_validates_periods(self):
        self.assertEqual(api.PRECONDITIONING_SCHEMA({"room_sensor_schedule": schedule(period())})[
            "room_sensor_schedule"], schedule(period()))
        with self.assertRaises(ValueError):
            api.normalize_room_sensor_schedule(schedule(period(source="climate.bad")))


class RoomSensorScheduleGroupTest(unittest.IsolatedAsyncioTestCase):
    setUp = group_tests.RoomGroupRuntimeTest.setUp
    asyncTearDown = group_tests.RoomGroupRuntimeTest.asyncTearDown

    async def test_group_native_uses_its_existing_member_reference(self):
        config = self.data["zones"]["group.room"]["preconditioning"]
        config.update(room_sensor_assist_enabled=True, room_temperature_entity_id="sensor.room",
                      room_sensor_schedule=schedule(default=None))
        self.scheduler._prepare_runtime_projection(configuration=True)
        self.assertEqual(self.scheduler._current_temperature("group.room"), 19)
        self.assertEqual(self.scheduler._temperature_source_entity_id("group.room"), "climate.a")
        self.assertEqual(self.scheduler.get_room_sensor_assist_status("group.room")["reason"], "native_reference")
        self.assertNotIn("group.room", self.scheduler._room_sensor_assist_candidate_climates())

    async def test_detail_maps_member_to_committed_group_owner_and_handles_absent_calendar(self):
        self.assertEqual(self.scheduler.get_room_sensor_schedule_configuration("climate.a"),
                         {"entity_id": "group.room", "room_sensor_schedule": None})
        value = schedule(period(days=["monday"]), default=None)
        self.data["zones"]["group.room"]["preconditioning"]["room_sensor_schedule"] = value
        self.scheduler._prepare_runtime_projection(configuration=True)
        self.assertEqual(self.scheduler.get_room_sensor_schedule_configuration("climate.b"),
                         {"entity_id": "group.room", "room_sensor_schedule": value})

