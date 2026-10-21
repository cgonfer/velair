"""Fixed next-block expiry for independently owned service pauses."""

from copy import deepcopy
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from zoneinfo import ZoneInfo

from .helpers import (
    FakeClimateManager,
    FakeHass,
    NOW,
    VelairScheduler,
    empty_week_schedule,
    normalize_schedule_data,
)
from custom_components.velair import scheduler as scheduler_module


class PauseUntilNextBlockTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.entity_id = "climate.salon"
        self.hass = FakeHass()
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat", attributes={"temperature": 20, "current_temperature": 18}
        )
        self.climate = FakeClimateManager()
        self.data = normalize_schedule_data(
            {"zones": {self.entity_id: {
                "enabled": True, "schedule": empty_week_schedule(),
            }}},
            [self.entity_id],
        )
        self.zone = self.data["zones"][self.entity_id]
        self.zone["schedule"]["tuesday"] = [self._block("19:00")]
        self.saved = 0
        self.fail_save = False
        self.scheduler = VelairScheduler(self.hass, self.data, self.climate, self._save)

    async def _save(self) -> None:
        if self.fail_save:
            raise RuntimeError("save failed")
        self.saved += 1

    @staticmethod
    def _block(start: str, hvac_mode: str = "heat") -> dict:
        return {
            "start": start, "action": "set_temperature",
            "temperature": 22, "hvac_mode": hvac_mode,
        }

    async def _pause(self, **kwargs) -> None:
        await self.scheduler.async_pause_zone(
            self.entity_id, pause_id="automation", until_next_block=True, **kwargs
        )

    async def test_expiry_survives_schedule_edit_and_normalized_reload(self) -> None:
        await self._pause()
        expiry = (NOW + timedelta(hours=1)).isoformat()
        self.assertEqual(self.zone["pauses"][0]["until"], expiry)
        await self.scheduler.async_set_daily_schedule(
            self.entity_id, "tuesday", [self._block("23:00")]
        )
        self.assertEqual(
            self.data["zones"][self.entity_id]["pauses"][0]["until"], expiry
        )
        reloaded = normalize_schedule_data(deepcopy(self.data), [self.entity_id])
        scheduler = VelairScheduler(self.hass, reloaded, self.climate, self._save)
        self.assertEqual(reloaded["zones"][self.entity_id]["pauses"][0]["until"], expiry)
        with patch.object(scheduler_module.dt_util, "now", return_value=NOW + timedelta(hours=1)):
            await scheduler._handle_timer(NOW + timedelta(hours=1))
        self.assertEqual(reloaded["zones"][self.entity_id]["pauses"], [])

    async def test_other_pause_remains_when_next_block_pause_expires(self) -> None:
        await self.scheduler.async_pause_zone(self.entity_id, pause_id="window")
        await self._pause()
        self.climate.calls.clear()
        with patch.object(scheduler_module.dt_util, "now", return_value=NOW + timedelta(hours=1)):
            await self.scheduler._handle_timer(NOW + timedelta(hours=1))
        self.assertEqual([reason["pause_id"] for reason in self.zone["pauses"]], ["window"])
        self.assertEqual(self.climate.calls, [])

    async def test_final_pause_expiry_applies_heating_and_cooling_block(self) -> None:
        for mode in ("heat", "cool"):
            with self.subTest(mode=mode):
                self.zone["schedule"]["tuesday"] = [self._block("19:00", mode)]
                await self._pause()
                self.climate.calls.clear()
                with patch.object(scheduler_module.dt_util, "now", return_value=NOW + timedelta(hours=1)):
                    await self.scheduler._handle_timer(NOW + timedelta(hours=1))
                self.assertEqual(self.zone["pauses"], [])
                self.assertIn(("set_temperature", self.entity_id, 22, True, mode), self.climate.calls)

    async def test_repeated_id_is_noop_until_next_boundary_changes(self) -> None:
        await self._pause()
        initial = deepcopy(self.zone["pauses"][0])
        saves = self.saved
        with patch.object(scheduler_module.dt_util, "now", return_value=NOW + timedelta(minutes=10)):
            await self._pause()
        self.assertEqual(self.saved, saves)
        self.assertEqual(self.zone["pauses"], [initial])
        self.zone["schedule"]["tuesday"] = [self._block("20:00")]
        with patch.object(scheduler_module.dt_util, "now", return_value=NOW + timedelta(minutes=20)):
            await self._pause()
        self.assertEqual(len(self.zone["pauses"]), 1)
        self.assertEqual(self.zone["pauses"][0]["until"], (NOW + timedelta(hours=2)).isoformat())
        self.assertEqual(self.zone["pauses"][0]["started_at"], initial["started_at"])

    async def test_weekly_wrap_skips_block_at_exact_request_time(self) -> None:
        self.zone["schedule"]["tuesday"] = [self._block("18:00")]
        await self._pause()
        self.assertEqual(self.zone["pauses"][0]["until"], (NOW + timedelta(days=7)).isoformat())

    def test_spring_gap_expires_at_first_valid_local_minute(self) -> None:
        tz = ZoneInfo("Europe/Madrid")
        self.zone["schedule"] = empty_week_schedule()
        self.zone["schedule"]["sunday"] = [self._block("02:30")]
        expiry = self.scheduler._next_schedule_block_until(
            self.entity_id, datetime(2026, 3, 29, 1, 0, tzinfo=tz)
        )
        self.assertEqual(expiry, "2026-03-29T03:00:00+02:00")
        self.assertEqual(
            datetime.fromisoformat(expiry).astimezone(timezone.utc),
            datetime(2026, 3, 29, 1, 0, tzinfo=timezone.utc),
        )

    def test_fall_overlap_chooses_first_occurrence_before_block(self) -> None:
        tz = ZoneInfo("Europe/Madrid")
        self.zone["schedule"] = empty_week_schedule()
        self.zone["schedule"]["sunday"] = [self._block("02:30")]
        expiry = self.scheduler._next_schedule_block_until(
            self.entity_id, datetime(2026, 10, 25, 1, 0, tzinfo=tz)
        )
        self.assertEqual(expiry, "2026-10-25T02:30:00+02:00")

    def test_fall_overlap_does_not_replay_block_after_first_occurrence(self) -> None:
        tz = ZoneInfo("Europe/Madrid")
        self.zone["schedule"] = empty_week_schedule()
        self.zone["schedule"]["sunday"] = [self._block("02:30")]
        for fold in (0, 1):
            with self.subTest(fold=fold):
                expiry = self.scheduler._next_schedule_block_until(
                    self.entity_id, datetime(2026, 10, 25, 2, 45, tzinfo=tz, fold=fold)
                )
                self.assertEqual(expiry, "2026-11-01T02:30:00+01:00")

    async def test_turn_off_pause_applies_block_when_it_expires(self) -> None:
        await self._pause(action="turn_off")
        self.assertIn(("turn_off", self.entity_id), self.climate.calls)
        self.climate.calls.clear()
        with patch.object(scheduler_module.dt_util, "now", return_value=NOW + timedelta(hours=1)):
            await self.scheduler._handle_timer(NOW + timedelta(hours=1))
        self.assertEqual(self.zone["pauses"], [])
        self.assertIn(("set_temperature", self.entity_id, 22, True, "heat"), self.climate.calls)

    async def test_nominal_boundary_is_not_advanced_by_preconditioning(self) -> None:
        self.zone["preconditioning"].update({
            "enabled": True, "max_lead_minutes": 60,
            "minimum_delta_temperature": 0.5, "fallback_minutes_per_degree": 15,
        })
        event = self.scheduler.calculate_next_event(NOW)
        self.assertIsNotNone(event)
        self.assertEqual(event.target_when, NOW + timedelta(hours=1))
        self.assertLess(event.when, event.target_when)
        await self._pause()
        self.assertEqual(self.zone["pauses"][0]["until"], (NOW + timedelta(hours=1)).isoformat())

    async def test_active_boost_does_not_hide_nominal_boundary(self) -> None:
        self.climate.snapshots[self.entity_id] = {"hvac_mode": "heat", "temperature": 20}
        await self.scheduler.async_set_zone_boost(
            self.entity_id, 24, (NOW + timedelta(hours=3)).isoformat(), hvac_mode="heat"
        )
        await self._pause()
        self.assertEqual(self.zone["pauses"][0]["until"], (NOW + timedelta(hours=1)).isoformat())

    async def test_active_profile_schedule_determines_boundary(self) -> None:
        profile_schedule = empty_week_schedule()
        profile_schedule["tuesday"] = [self._block("21:00", "cool")]
        self.data["profiles"] = [{
            "key": "summer", "name": "Summer", "icon": "mdi:sun-thermometer",
            "zones": {self.entity_id: {"behavior": "schedule", "schedule": profile_schedule}},
        }]
        self.data["global_"]["active_profile_ids"] = ["summer"]
        self.data["global_"]["base_profile_ids"] = ["summer"]
        await self._pause()
        self.assertEqual(self.zone["pauses"][0]["until"], (NOW + timedelta(hours=3)).isoformat())

    async def test_missing_future_block_rejects_without_changing_existing_pause(self) -> None:
        await self.scheduler.async_pause_zone(self.entity_id, pause_id="window")
        self.zone["schedule"] = empty_week_schedule()
        before = deepcopy(self.zone)
        saves = self.saved
        self.hass.bus.events.clear()
        self.climate.calls.clear()
        with self.assertRaisesRegex(ValueError, "No future schedule block"):
            await self._pause(action="turn_off")
        self.assertEqual(self.zone, before)
        self.assertEqual(self.saved, saves)
        self.assertEqual(self.hass.bus.events, [])
        self.assertEqual(self.climate.calls, [])

    async def test_conflicting_expiry_options_reject_before_mutation(self) -> None:
        for options in ({"until": (NOW + timedelta(hours=2)).isoformat()}, {"duration_minutes": 15}):
            with self.subTest(options=options):
                before = deepcopy(self.zone)
                with self.assertRaisesRegex(ValueError, "cannot be combined"):
                    await self._pause(**options)
                self.assertEqual(self.zone, before)
        self.assertEqual(self.saved, 0)
        self.assertEqual(self.climate.calls, [])

    async def test_failed_save_restores_existing_pause_and_does_not_turn_off(self) -> None:
        await self.scheduler.async_pause_zone(self.entity_id, pause_id="window")
        before = deepcopy(self.zone)
        self.fail_save = True
        self.climate.calls.clear()
        self.hass.bus.events.clear()
        with self.assertRaisesRegex(RuntimeError, "save failed"):
            await self._pause(action="turn_off")
        self.assertEqual(self.zone, before)
        self.assertEqual(self.climate.calls, [])
        self.assertEqual(self.hass.bus.events, [])
