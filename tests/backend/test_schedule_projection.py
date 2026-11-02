"""Nominal calendar and prepared hot-path regression coverage."""
from dataclasses import FrozenInstanceError
from datetime import datetime, timedelta, timezone
import unittest
from unittest.mock import patch
from zoneinfo import ZoneInfo

from .helpers import empty_week_schedule, scheduler_module
from custom_components.velair.schedule_projection import PreparedSchedule


class PreparedScheduleTest(unittest.TestCase):
    def build(self, week, now):
        return PreparedSchedule("climate.room", week, now,
            scheduler_module._local_schedule_occurrences, scheduler_module._parse_start_time,
            scheduler_module.VelairScheduler._projection_event)

    @staticmethod
    def block(start, target=20, **fields):
        return {"start": start, "temperature": target, **fields}

    def test_carry_over_and_successor_include_off(self):
        week = empty_week_schedule()
        week["monday"] = [self.block("23:00")]
        week["tuesday"] = [{"start": "19:00", "action": "turn_off"}, self.block("20:00", 22)]
        now = datetime(2026, 5, 19, 18, tzinfo=timezone.utc)
        prepared = self.build(week, now)
        self.assertEqual(prepared.current(now).weekday, "monday")
        self.assertEqual(prepared.next_nominal(now).action, "turn_off")
        self.assertFalse(prepared.window_is_valid(now, now.replace(hour=20)))
        self.assertTrue(prepared.window_is_valid(now.replace(hour=19, minute=1), now.replace(hour=20)))

    def test_queries_do_not_reenter_calendar(self):
        week = empty_week_schedule()
        week["tuesday"] = [self.block("12:00"), self.block("21:00", 18)]
        now = datetime(2026, 5, 19, 18, tzinfo=timezone.utc)
        with patch.object(scheduler_module, "_local_schedule_occurrences", wraps=scheduler_module._local_schedule_occurrences) as calendar:
            prepared = self.build(week, now)
            self.assertGreater(calendar.call_count, 0)
            calendar.side_effect = AssertionError("reader rebuilt calendar")
            for _ in range(4):
                self.assertEqual(prepared.current(now).temperature, 20)
                self.assertEqual(prepared.next_nominal(now).temperature, 18)
                self.assertTrue(prepared.future(now))
                self.assertTrue(prepared.window_is_valid(now.replace(hour=20), now.replace(hour=21)))

    def test_inputs_and_results_detached(self):
        week = empty_week_schedule()
        week["tuesday"] = [self.block("12:00")]
        now = datetime(2026, 5, 19, 18, tzinfo=timezone.utc)
        prepared = self.build(week, now)
        week["tuesday"][0]["temperature"] = 31
        result = prepared.current(now)
        with self.assertRaises(FrozenInstanceError):
            result.temperature = 30
        self.assertEqual(prepared.current(now).temperature, 20)
        self.assertEqual(prepared.blocks[("tuesday", "12:00")]["temperature"], 20)

    def test_gap_collision_keeps_last_wall_block(self):
        zone = ZoneInfo("Europe/Madrid")
        now = datetime(2026, 3, 29, 1, 30, tzinfo=zone)
        week = empty_week_schedule()
        week["sunday"] = [self.block("02:10"), self.block("02:50", 21),
                          self.block("03:00", 22), self.block("04:00", 18)]
        prepared = self.build(week, now)
        self.assertEqual(prepared.current(datetime(2026, 3, 29, 3, 1, tzinfo=zone)).start, "03:00")
        self.assertEqual([row.event.start for row in prepared.future(now) if row.day == now.date()], ["03:00", "04:00"])

    def test_fold_is_one_transition_at_first_instant(self):
        zone = ZoneInfo("Europe/Madrid")
        now = datetime(2026, 10, 25, 1, 30, tzinfo=zone)
        week = empty_week_schedule()
        week["sunday"] = [self.block("02:30", 21)]
        prepared = self.build(week, now)
        repeated = datetime(2026, 10, 25, 2, 45, tzinfo=zone, fold=1)
        self.assertEqual(prepared.current(repeated).when.fold, 0)
        self.assertFalse(any(row.day == now.date() for row in prepared.future(repeated)))

    def test_empty_week_and_horizon_timezone_identity(self):
        now = datetime(2026, 5, 19, 18, tzinfo=timezone(timedelta(hours=1), "first"))
        prepared = self.build(empty_week_schedule(), now)
        self.assertIsNone(prepared.current(now))
        self.assertIsNone(prepared.next_nominal(now))
        self.assertEqual(prepared.future(now), ())
        self.assertTrue(prepared.is_current_horizon(now + timedelta(minutes=1)))
        self.assertTrue(prepared.is_current_horizon(now + timedelta(days=1)))
        self.assertFalse(prepared.is_current_horizon(now + timedelta(days=2)))
        self.assertFalse(prepared.is_current_horizon(now.replace(tzinfo=timezone(timedelta(hours=1), "second"))))

    def test_internal_nominal_reads_borrow_frozen_events_without_copies(self):
        now = datetime(2026, 5, 19, 18, tzinfo=timezone.utc)
        week = empty_week_schedule()
        week["tuesday"] = [self.block("12:00"), self.block("21:00", 22)]
        prepared = self.build(week, now)
        borrowed = prepared.current(now, copy=False)
        self.assertIsNot(borrowed, prepared.current(now))
        self.assertIsNone(borrowed.preconditioning_diagnostics)
        self.assertIsNone(borrowed.preconditioning_dependency)
        with patch("custom_components.velair.schedule_projection.deepcopy",
                   side_effect=AssertionError("internal nominal copy")):
            self.assertIs(prepared.current(now, copy=False), borrowed)
            self.assertTrue(prepared.window_is_valid(now.replace(hour=20), now.replace(hour=21)))
