"""Zone hold tests: pause reasons that keep delivering a temperature target."""

from __future__ import annotations

from datetime import timedelta
from types import SimpleNamespace
import unittest

from .helpers import (
    NOW,
    FakeClimateManager,
    FakeHass,
    VelairScheduler,
    empty_week_schedule,
    normalize_schedule_data,
    scheduler_module,
)


def _velair_events(hass: FakeHass, name: str) -> list[dict]:
    """Return fired Velair event payloads with the given event name."""
    return [
        data
        for event_type, data in hass.bus.events
        if data.get("event") == name or event_type == name
    ]


class ZoneHoldTest(unittest.IsolatedAsyncioTestCase):
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
        # NOW is a Tuesday; one all-day block at 24 °C cooling.
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {
                "start": "00:00",
                "action": "set_temperature",
                "temperature": 24.0,
                "hvac_mode": "cool",
            }
        ]
        self.saved = 0
        self.scheduler = VelairScheduler(
            self.hass, self.data, FakeClimateManager(), self._save
        )
        self.scheduler._climate_manager.current_hvac_modes[self.entity_id] = "cool"
        self.scheduler._climate_manager.hvac_modes[self.entity_id] = [
            "off", "heat", "cool",
        ]
        self._original_now = scheduler_module.dt_util.now

    def tearDown(self) -> None:
        scheduler_module.dt_util.now = self._original_now

    async def _save(self) -> None:
        self.saved += 1

    def _set_now(self, value) -> None:
        scheduler_module.dt_util.now = lambda: value

    @property
    def calls(self) -> list[tuple]:
        return self.scheduler._climate_manager.calls

    def _delivered_temperatures(self) -> list[float]:
        return [call[2] for call in self.calls if call[0] == "set_temperature"]

    async def _hold(self, pause_id: str, temperature: float, **kwargs) -> None:
        await self.scheduler.async_pause_zone(
            self.entity_id,
            action="hold",
            pause_id=pause_id,
            temperature=temperature,
            **kwargs,
        )

    async def test_absolute_hold_delivers_its_target(self) -> None:
        await self._hold("vacancy", 26.0, label="vacant 30 min")

        self.assertEqual([26.0], self._delivered_temperatures())
        status = self.scheduler.get_zone_override_status(self.entity_id)
        self.assertEqual("hold", status["state"])
        self.assertEqual("hold", status["action"])
        self.assertEqual(26.0, status["effective_temperature"])
        self.assertEqual("absolute", status["constraint"])
        self.assertEqual("vacant 30 min", status["label"])
        self.assertEqual(["vacancy"], status["pause_ids"])
        self.assertEqual(1, status["hold_count"])

    async def test_raise_only_hold_never_lowers_the_schedule_target(self) -> None:
        await self._hold("vacancy", 22.0, constraint="raise_only")
        self.assertEqual([24.0], self._delivered_temperatures())

        await self._hold("vacancy", 27.0, constraint="raise_only")
        self.assertEqual([24.0, 27.0], self._delivered_temperatures())

    async def test_lower_only_hold_never_raises_the_schedule_target(self) -> None:
        await self._hold("comfort", 22.0, constraint="lower_only")
        self.assertEqual([22.0], self._delivered_temperatures())

        await self._hold("comfort", 26.0, constraint="lower_only")
        self.assertEqual([22.0, 24.0], self._delivered_temperatures())

    async def test_holds_fold_in_start_order_and_resume_redelivers(self) -> None:
        await self._hold("away", 27.0, constraint="raise_only")
        self._set_now(NOW + timedelta(minutes=1))
        await self._hold("user", 22.0, constraint="absolute")
        self.assertEqual([27.0, 22.0], self._delivered_temperatures())

        await self.scheduler.async_resume_zone(self.entity_id, pause_id="user")
        self.assertEqual([27.0, 22.0, 27.0], self._delivered_temperatures())
        status = self.scheduler.get_zone_override_status(self.entity_id)
        self.assertEqual("hold", status["state"])
        self.assertEqual(["away"], status["pause_ids"])

    async def test_same_pause_id_updates_the_hold_in_place(self) -> None:
        await self._hold("vacancy", 25.0)
        started = self.data["zones"][self.entity_id]["pauses"][0]["started_at"]
        self._set_now(NOW + timedelta(minutes=5))
        await self._hold("vacancy", 27.0, label="stage 2")

        reasons = self.data["zones"][self.entity_id]["pauses"]
        self.assertEqual(1, len(reasons))
        self.assertEqual(started, reasons[0]["started_at"])
        self.assertEqual(27.0, reasons[0]["temperature"])
        self.assertEqual("stage 2", reasons[0]["label"])
        self.assertEqual([25.0, 27.0], self._delivered_temperatures())

    async def test_identical_hold_replay_is_a_no_op(self) -> None:
        await self._hold("vacancy", 25.0, constraint="raise_only")
        saved = self.saved
        await self._hold("vacancy", 25.0, constraint="raise_only")
        self.assertEqual(saved, self.saved)
        self.assertEqual([25.0], self._delivered_temperatures())

    async def test_plain_pause_freezes_above_any_hold(self) -> None:
        await self._hold("vacancy", 27.0)
        await self.scheduler.async_pause_zone(
            self.entity_id, action="none", pause_id="window"
        )
        self.assertEqual(
            "paused", self.scheduler.get_zone_override_status(self.entity_id)["state"]
        )
        self.calls.clear()

        await self._hold("vacancy", 28.0)
        self.assertEqual([], self.calls)

        await self.scheduler.async_resume_zone(self.entity_id, pause_id="window")
        self.assertEqual([28.0], self._delivered_temperatures())
        self.assertEqual(
            "hold", self.scheduler.get_zone_override_status(self.entity_id)["state"]
        )

    async def test_turn_off_pause_beats_a_hold(self) -> None:
        await self._hold("vacancy", 27.0)
        await self.scheduler.async_pause_zone(
            self.entity_id, action="turn_off", pause_id="window"
        )
        self.assertIn(("turn_off", self.entity_id), self.calls)
        self.assertEqual(
            "paused", self.scheduler.get_zone_override_status(self.entity_id)["state"]
        )

    async def test_manual_adjustment_freezes_a_hold_until_resumed(self) -> None:
        await self.scheduler.async_update_external_change_policy(
            self.entity_id, {"action": "until_resumed"}
        )
        await self._hold("vacancy", 27.0)
        self.calls.clear()

        await self.scheduler.async_handle_external_climate_change(
            self.entity_id,
            changed_fields=["temperature"],
            previous={"temperature": 27.0},
            current={"temperature": 20.0},
        )
        # Velair locks in the human value once and then stops delivering;
        # the hold must not be re-sent while Manual adjustment is active.
        self.assertEqual([], self._delivered_temperatures())
        self.assertEqual(
            [("restore_state", self.entity_id, {"temperature": 20.0})], self.calls
        )
        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertEqual("manual", runtime["control_mode"])
        self.calls.clear()

        await self.scheduler.async_resume_automatic_control(self.entity_id)
        self.assertEqual([27.0], self._delivered_temperatures())
        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertEqual("hold", runtime["state"])
        self.assertEqual(27.0, runtime["target_temperature"])

    async def test_hold_carries_hvac_mode(self) -> None:
        await self._hold("night", 21.0, hvac_mode="heat")
        self.assertIn(
            ("set_temperature", self.entity_id, 21.0, True, "heat"),
            self.calls,
        )

    async def test_hold_requires_a_target_and_rejects_fields_on_plain_pauses(self) -> None:
        with self.assertRaises(ValueError):
            await self.scheduler.async_pause_zone(
                self.entity_id, action="hold", pause_id="vacancy"
            )
        with self.assertRaises(ValueError):
            await self.scheduler.async_pause_zone(
                self.entity_id, action="none", pause_id="window", temperature=25.0
            )
        with self.assertRaises(ValueError):
            await self._hold("vacancy", 25.0, constraint="sideways")
        with self.assertRaises(ValueError):
            await self._hold("vacancy", 25.0, hvac_mode="dry")
        with self.assertRaises(ValueError):
            await self._hold("vacancy", 40.0)
        self.assertEqual([], self.data["zones"][self.entity_id]["pauses"])

    async def test_hold_temperature_snaps_to_the_entity_step(self) -> None:
        await self._hold("vacancy", 25.3)
        self.assertEqual(25.5, self.data["zones"][self.entity_id]["pauses"][0]["temperature"])
        self.assertEqual([25.5], self._delivered_temperatures())

    async def test_boost_is_refused_while_a_hold_is_active(self) -> None:
        await self._hold("vacancy", 27.0)
        with self.assertRaises(ValueError):
            await self.scheduler.async_set_zone_boost(
                self.entity_id, 20.0, (NOW + timedelta(hours=1)).isoformat()
            )

    async def test_expired_hold_returns_to_the_schedule(self) -> None:
        await self.scheduler.async_pause_zone(
            self.entity_id,
            action="hold",
            pause_id="vacancy",
            temperature=27.0,
            until=(NOW + timedelta(minutes=10)).isoformat(),
        )
        self.assertEqual([27.0], self._delivered_temperatures())

        later = NOW + timedelta(minutes=11)
        self._set_now(later)
        await self.scheduler._handle_timer(later)

        self.assertEqual([], self.data["zones"][self.entity_id]["pauses"])
        self.assertEqual([27.0, 24.0], self._delivered_temperatures())
        self.assertEqual(
            "none", self.scheduler.get_zone_override_status(self.entity_id)["state"]
        )

    async def test_expired_hold_redelivers_the_remaining_hold(self) -> None:
        await self.scheduler.async_pause_zone(
            self.entity_id,
            action="hold",
            pause_id="away",
            temperature=28.0,
            constraint="raise_only",
            until=(NOW + timedelta(minutes=10)).isoformat(),
        )
        self._set_now(NOW + timedelta(minutes=1))
        await self._hold("vacancy", 26.0, constraint="raise_only")
        self.assertEqual([28.0, 28.0], self._delivered_temperatures())

        later = NOW + timedelta(minutes=11)
        self._set_now(later)
        await self.scheduler._handle_timer(later)

        self.assertEqual(
            ["vacancy"],
            [item["pause_id"] for item in self.data["zones"][self.entity_id]["pauses"]],
        )
        self.assertEqual([28.0, 28.0, 26.0], self._delivered_temperatures())

    async def test_events_carry_hold_fields(self) -> None:
        await self._hold("vacancy", 27.0, constraint="raise_only", label="stage 3")

        added = _velair_events(self.hass, "zone_pause_added")
        self.assertEqual(1, len(added))
        self.assertEqual("hold", added[0]["action"])
        self.assertEqual(27.0, added[0]["temperature"])
        self.assertEqual("raise_only", added[0]["constraint"])
        self.assertEqual("stage 3", added[0]["label"])
        paused = _velair_events(self.hass, "zone_paused")
        self.assertEqual(1, len(paused))
        self.assertEqual(27.0, paused[0]["temperature"])

    async def test_active_target_sensor_follows_the_hold(self) -> None:
        await self._hold("vacancy", 27.0)
        event = self.scheduler.get_active_target_event(self.entity_id)
        self.assertIsNotNone(event)
        self.assertEqual(27.0, event.temperature)

    def test_hold_reasons_survive_normalization(self) -> None:
        data = normalize_schedule_data(
            {
                "zones": {
                    self.entity_id: {
                        "enabled": True,
                        "schedule": empty_week_schedule(),
                        "pauses": [
                            {
                                "started_at": NOW.isoformat(),
                                "action": "hold",
                                "pause_id": "vacancy",
                                "temperature": 26,
                                "constraint": "raise_only",
                                "hvac_mode": "cool",
                                "fan_mode": "auto",
                                "label": "x" * 100,
                            },
                            {
                                "started_at": NOW.isoformat(),
                                "action": "hold",
                                "pause_id": "broken",
                            },
                        ],
                    }
                }
            },
            [self.entity_id],
        )
        reasons = data["zones"][self.entity_id]["pauses"]
        self.assertEqual(2, len(reasons))
        self.assertEqual("hold", reasons[0]["action"])
        self.assertEqual(26.0, reasons[0]["temperature"])
        self.assertEqual("raise_only", reasons[0]["constraint"])
        self.assertEqual("cool", reasons[0]["hvac_mode"])
        self.assertEqual("auto", reasons[0]["fan_mode"])
        self.assertEqual(64, len(reasons[0]["label"]))
        # A hold without a usable target downgrades to a plain pause.
        self.assertEqual("none", reasons[1]["action"])
        override = data["zones"][self.entity_id]["override"]
        self.assertEqual("none", override["action"])


if __name__ == "__main__":
    unittest.main()
