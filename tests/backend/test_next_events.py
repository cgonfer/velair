"""Next schedule event calculation tests."""

from __future__ import annotations

import unittest

from .helpers import (
    ACTION_SET_TEMPERATURE,
    ACTION_TURN_OFF,
    FakeClimateManager,
    FakeHass,
    NOW,
    VelairScheduler,
    _make_scheduler,
    _scheduler_data_for_zones,
)

class VelairSchedulerNextEventTest(unittest.TestCase):
    """Verify next-event calculation details."""

    def test_next_events_returns_all_zones_at_earliest_time(self) -> None:
        data = _scheduler_data_for_zones(["climate.salon", "climate.bedroom"])
        data["zones"]["climate.salon"]["schedule"]["tuesday"] = [
            {
                "start": "19:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 20,
                "hvac_mode": "heat",
            }
        ]
        data["zones"]["climate.bedroom"]["schedule"]["tuesday"] = [
            {
                "start": "19:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 18,
                "hvac_mode": "cool",
            }
        ]

        events = _make_scheduler(data).calculate_next_events(NOW)

        self.assertEqual([event.entity_id for event in events], ["climate.salon", "climate.bedroom"])
        self.assertEqual({event.start for event in events}, {"19:00"})
        self.assertEqual({event.temperature for event in events}, {18.0, 20.0})

    def test_next_events_by_zone_keeps_later_zone_when_preconditioning_is_earlier(
        self,
    ) -> None:
        data = _scheduler_data_for_zones(["climate.salon", "climate.bedroom"])
        data["zones"]["climate.salon"]["preconditioning"] = {
            "enabled": True,
            "max_lead_minutes": 60,
            "minimum_delta_temperature": 0.3,
            "fallback_minutes_per_degree": 1,
        }
        data["zones"]["climate.salon"]["schedule"]["tuesday"] = [
            {
                "start": "19:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 20,
                "hvac_mode": "heat",
            }
        ]
        data["zones"]["climate.bedroom"]["schedule"]["tuesday"] = [
            {
                "start": "19:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 18,
                "hvac_mode": "cool",
            }
        ]

        hass = FakeHass()
        hass.states["climate.salon"] = type(
            "State",
            (),
            {"state": "heat", "attributes": {"current_temperature": 18}},
        )()
        hass.states["climate.bedroom"] = type(
            "State",
            (),
            {"state": "cool", "attributes": {"current_temperature": 18}},
        )()

        async def _async_save() -> None:
            return None

        scheduler = VelairScheduler(
            hass,
            data,
            FakeClimateManager(),
            _async_save,
        )
        execution_events = scheduler.calculate_next_events(NOW)
        ui_events = scheduler.calculate_next_events_by_zone(NOW)

        self.assertEqual([event.entity_id for event in execution_events], ["climate.salon"])
        self.assertEqual([event.entity_id for event in ui_events], ["climate.salon", "climate.bedroom"])
        self.assertEqual(ui_events[0].start, "19:00")
        self.assertIsNotNone(ui_events[0].target_when)
        self.assertEqual(ui_events[1].when.isoformat(), "2026-05-19T19:00:00+00:00")

    def test_next_events_skip_disabled_zones_and_active_overrides(self) -> None:
        data = _scheduler_data_for_zones(["climate.salon", "climate.bedroom", "climate.office"])
        for entity_id in data["zones"]:
            data["zones"][entity_id]["schedule"]["tuesday"] = [
                {
                    "start": "19:00",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 20,
                }
            ]
        data["zones"]["climate.bedroom"]["enabled"] = False
        data["zones"]["climate.office"]["override"] = {
            "type": "boost",
            "until": "2026-05-19T20:00:00+00:00",
            "temperature": 24,
        }

        events = _make_scheduler(data).calculate_next_events(NOW)

        self.assertEqual([event.entity_id for event in events], ["climate.salon"])

    def test_next_event_turn_off_has_no_temperature(self) -> None:
        data = _scheduler_data_for_zones(["climate.salon"])
        data["zones"]["climate.salon"]["schedule"]["tuesday"] = [
            {
                "start": "19:00",
                "action": ACTION_TURN_OFF,
            }
        ]

        event = _make_scheduler(data).calculate_next_event(NOW)

        self.assertIsNotNone(event)
        self.assertEqual(event.action, ACTION_TURN_OFF)
        self.assertIsNone(event.temperature)

