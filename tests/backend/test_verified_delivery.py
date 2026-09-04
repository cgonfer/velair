"""Tests for opt-in readback confirmation and cross-zone delivery stagger."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import sys
from time import monotonic
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from . import helpers  # noqa: F401 - installs Home Assistant test stubs

sys.modules["homeassistant.core"].Event = object
from .helpers import (
    ACTION_SET_TEMPERATURE,
    EVENT_TYPE_CLIMATE_TARGET_APPLIED,
    EVENT_VELAIR,
    FakeClimateManager,
    FakeHass,
    MODE_AUTO,
    VelairScheduler,
    empty_week_schedule,
    normalize_panel_settings,
    normalize_schedule_data,
)
from custom_components.velair import api as api_module
from custom_components.velair import runtime_diagnostics as diagnostics_module
from custom_components.velair.climate_delivery import (
    ClimateDeliveryCoordinator,
    Delivery,
    DeliveryConfirmation,
    _target_converged,
)
from custom_components.velair.const import EVENT_TYPE_DELIVERY_OUTCOME
from custom_components.velair.models import normalize_zone_delivery

NOW = datetime(2026, 5, 19, 18, 0, tzinfo=timezone.utc)
ENTITY = "climate.room"
OTHER = "climate.other"


def _state(mode: str, **attributes):
    return SimpleNamespace(state=mode, attributes=attributes)


class _Hass:
    def __init__(self) -> None:
        self.states: dict[str, SimpleNamespace] = {}

    def async_create_task(self, awaitable):
        return asyncio.create_task(awaitable)


class _Watchers:
    """Capture the event-driven listeners and timers the coordinator installs."""

    def __init__(self) -> None:
        self.state_callbacks: list = []
        self.timers: list[dict] = []

    def track(self, _hass, _entity_ids, callback):
        self.state_callbacks.append(callback)

        def unsubscribe() -> None:
            if callback in self.state_callbacks:
                self.state_callbacks.remove(callback)

        return unsubscribe

    def call_later(self, _hass, delay, callback):
        timer = {"delay": delay, "callback": callback, "cancelled": False, "fired": False}
        self.timers.append(timer)

        def cancel() -> None:
            timer["cancelled"] = True

        return cancel

    @property
    def pending_timers(self) -> list[dict]:
        return [timer for timer in self.timers if not timer["cancelled"] and not timer["fired"]]

    def fire_state(self) -> None:
        for callback in list(self.state_callbacks):
            callback(object())

    def fire_timer(self) -> None:
        timer = self.pending_timers[-1]
        timer["fired"] = True
        timer["callback"](NOW)


async def _settle(rounds: int = 4) -> None:
    for _ in range(rounds):
        await asyncio.sleep(0)


class ConfirmationCoordinatorTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.hass = _Hass()
        self.hass.states[ENTITY] = _state("heat", temperature=19.0, target_temp_step=0.5)
        self.observed: list[tuple[str, str, dict | None]] = []
        self.outcomes: list[dict] = []
        self.coordinator = ClimateDeliveryCoordinator(
            self.hass,
            lambda entity_id, status, details: self.observed.append(
                (entity_id, status, details)
            ),
        )
        self.watchers = _Watchers()
        self._patches = [
            patch(
                "custom_components.velair.climate_delivery.async_track_state_change_event",
                self.watchers.track,
            ),
            patch(
                "custom_components.velair.climate_delivery.async_call_later",
                self.watchers.call_later,
            ),
        ]
        for item in self._patches:
            item.start()
        self.applies: list[str] = []

    async def asyncTearDown(self) -> None:
        await self.coordinator.async_stop()
        for item in self._patches:
            item.stop()

    def _resolver(self, label: str, requested: dict | None = None, *, attempts: int = 3):
        def resolve():
            async def apply() -> None:
                self.applies.append(label)

            return Delivery(
                apply,
                confirm=DeliveryConfirmation(
                    requested=lambda: requested or {
                        "action": ACTION_SET_TEMPERATURE,
                        "hvac_mode": "heat",
                        "temperature": 21.0,
                        "step": 0.5,
                    },
                    timeout=25.0,
                    attempts=attempts,
                    source="scheduled_event",
                    on_outcome=self.outcomes.append,
                ),
            )

        return resolve

    def _statuses(self, entity_id: str = ENTITY) -> list[str]:
        return [status for observed, status, _ in self.observed if observed == entity_id]

    async def test_convergence_within_timeout_confirms_first_attempt(self) -> None:
        self.assertTrue(
            await self.coordinator.async_deliver(ENTITY, self._resolver("initial"))
        )

        status = self.coordinator.confirmation_status(ENTITY)
        self.assertEqual("pending", status["outcome"])
        self.assertEqual(1, status["attempts"])
        self.assertIsNotNone(status["last_attempt_at"])
        self.assertIsNone(status["confirmed_at"])
        self.assertEqual(1, len(self.watchers.pending_timers))
        self.assertEqual(25.0, self.watchers.pending_timers[0]["delay"])
        self.assertIn("confirming", self._statuses())

        self.hass.states[ENTITY] = _state("heat", temperature=21.0, target_temp_step=0.5)
        self.watchers.fire_state()

        status = self.coordinator.confirmation_status(ENTITY)
        self.assertEqual("confirmed", status["outcome"])
        self.assertEqual(1, status["attempts"])
        self.assertIsNotNone(status["confirmed_at"])
        self.assertEqual([], self.watchers.pending_timers)
        self.assertEqual(["initial"], self.applies)
        self.assertEqual(1, len(self.outcomes))
        self.assertEqual(
            {
                "entity_id": ENTITY,
                "outcome": "confirmed",
                "attempts": 1,
                "source": "scheduled_event",
                "requested": {"hvac_mode": "heat", "temperature": 21.0},
                "observed": {"hvac_mode": "heat", "temperature": 21.0},
            },
            self.outcomes[0],
        )
        self.assertEqual("confirmed", self._statuses()[-1])

    async def test_no_convergence_re_delivers_through_resolver_until_unconfirmed(self) -> None:
        initial = self._resolver("initial")
        recovery = self._resolver("re-sent")
        await self.coordinator.async_deliver(
            ENTITY, initial, recovery_resolver=recovery
        )

        for expected_attempt in (2, 3):
            self.watchers.fire_timer()
            await _settle()
            self.assertEqual(
                expected_attempt,
                self.coordinator.confirmation_status(ENTITY)["attempts"],
            )
            self.assertEqual("pending", self.coordinator.confirmation_status(ENTITY)["outcome"])

        self.watchers.fire_timer()
        await _settle()

        self.assertEqual(["initial", "re-sent", "re-sent"], self.applies)
        status = self.coordinator.confirmation_status(ENTITY)
        self.assertEqual("unconfirmed", status["outcome"])
        self.assertEqual(3, status["attempts"])
        self.assertIsNone(status["confirmed_at"])
        self.assertEqual([], self.watchers.pending_timers)
        self.assertEqual(1, len(self.outcomes))
        self.assertEqual("unconfirmed", self.outcomes[0]["outcome"])
        self.assertEqual(3, self.outcomes[0]["attempts"])
        self.assertEqual({"hvac_mode": "heat", "temperature": 19.0}, self.outcomes[0]["observed"])
        self.assertEqual(
            ["success", "confirming", "success", "confirming", "success", "confirming", "unconfirmed"],
            [status for status in self._statuses() if status != "cancelled"],
        )

    async def test_convergence_on_second_attempt_reports_two_attempts(self) -> None:
        await self.coordinator.async_deliver(ENTITY, self._resolver("initial"))
        self.watchers.fire_timer()
        await _settle()
        self.assertEqual(2, self.coordinator.confirmation_status(ENTITY)["attempts"])

        self.hass.states[ENTITY] = _state("heat", temperature=21.0, target_temp_step=0.5)
        self.watchers.fire_state()

        status = self.coordinator.confirmation_status(ENTITY)
        self.assertEqual("confirmed", status["outcome"])
        self.assertEqual(2, status["attempts"])
        self.assertEqual(["initial", "initial"], self.applies)
        self.assertEqual(2, self.outcomes[0]["attempts"])
        self.assertEqual("confirmed", self.outcomes[0]["outcome"])

    async def test_single_attempt_configuration_gives_up_after_first_timeout(self) -> None:
        await self.coordinator.async_deliver(ENTITY, self._resolver("initial", attempts=1))

        self.watchers.fire_timer()
        await _settle()

        self.assertEqual(["initial"], self.applies)
        self.assertEqual("unconfirmed", self.coordinator.confirmation_status(ENTITY)["outcome"])
        self.assertEqual(1, self.outcomes[0]["attempts"])

    async def test_already_converged_state_confirms_without_waiting(self) -> None:
        self.hass.states[ENTITY] = _state("heat", temperature=21.0, target_temp_step=0.5)

        await self.coordinator.async_deliver(ENTITY, self._resolver("initial"))

        self.assertEqual("confirmed", self.coordinator.confirmation_status(ENTITY)["outcome"])
        self.assertEqual([], self.watchers.pending_timers)
        self.assertEqual(1, len(self.outcomes))

    async def test_superseded_generation_cancels_watcher_and_timer(self) -> None:
        await self.coordinator.async_deliver(ENTITY, self._resolver("initial"))
        confirmation_callbacks = len(self.watchers.state_callbacks)
        self.assertEqual(1, len(self.watchers.pending_timers))

        self.coordinator.cancel(ENTITY)

        self.assertEqual([], self.watchers.pending_timers)
        self.assertLess(len(self.watchers.state_callbacks), confirmation_callbacks)
        self.assertIsNone(self.coordinator.confirmation_status(ENTITY)["outcome"])
        self.hass.states[ENTITY] = _state("heat", temperature=21.0, target_temp_step=0.5)
        self.watchers.fire_state()
        self.assertEqual([], self.outcomes)

    async def test_newer_delivery_replaces_pending_confirmation(self) -> None:
        await self.coordinator.async_deliver(ENTITY, self._resolver("old"))
        old_timer = self.watchers.pending_timers[0]

        await self.coordinator.async_deliver(
            ENTITY,
            self._resolver(
                "new",
                {"action": ACTION_SET_TEMPERATURE, "hvac_mode": "cool", "temperature": 24.0, "step": 0.5},
            ),
        )

        self.assertTrue(old_timer["cancelled"])
        self.assertEqual(1, len(self.watchers.pending_timers))
        self.hass.states[ENTITY] = _state("cool", temperature=24.0, target_temp_step=0.5)
        self.watchers.fire_state()
        self.assertEqual(1, len(self.outcomes))
        self.assertEqual({"hvac_mode": "cool", "temperature": 24.0}, self.outcomes[0]["requested"])
        self.assertEqual(1, self.outcomes[0]["attempts"])

    async def test_stop_cancels_pending_confirmation(self) -> None:
        await self.coordinator.async_deliver(ENTITY, self._resolver("initial"))

        await self.coordinator.async_stop()

        self.assertEqual([], self.watchers.pending_timers)
        self.assertEqual([], self.watchers.state_callbacks)

    async def test_delivery_without_confirmation_clears_stale_outcome(self) -> None:
        await self.coordinator.async_deliver(ENTITY, self._resolver("initial", attempts=1))
        self.watchers.fire_timer()
        await _settle()
        self.assertEqual("unconfirmed", self.coordinator.confirmation_status(ENTITY)["outcome"])

        async def apply() -> None:
            self.applies.append("plain")

        await self.coordinator.async_deliver(ENTITY, lambda: Delivery(apply))

        self.assertIsNone(self.coordinator.confirmation_status(ENTITY)["outcome"])
        self.assertEqual(0, self.coordinator.confirmation_status(ENTITY)["attempts"])

    async def test_nothing_to_confirm_leaves_no_pending_watch(self) -> None:
        def resolve():
            async def apply() -> None:
                return None

            return Delivery(apply, confirm=DeliveryConfirmation(requested=lambda: None))

        await self.coordinator.async_deliver(ENTITY, resolve)

        self.assertIsNone(self.coordinator.confirmation_status(ENTITY)["outcome"])
        self.assertEqual([], self.watchers.pending_timers)

    async def test_turn_off_delivery_confirms_when_state_is_off(self) -> None:
        await self.coordinator.async_deliver(
            ENTITY, self._resolver("off", {"action": "turn_off", "hvac_mode": "off"})
        )
        self.assertEqual("pending", self.coordinator.confirmation_status(ENTITY)["outcome"])

        self.hass.states[ENTITY] = _state("off", temperature=19.0)
        self.watchers.fire_state()

        self.assertEqual("confirmed", self.coordinator.confirmation_status(ENTITY)["outcome"])
        self.assertEqual({"hvac_mode": "off"}, self.outcomes[0]["requested"])

    async def test_range_delivery_requires_both_ends_to_converge(self) -> None:
        requested = {
            "action": ACTION_SET_TEMPERATURE,
            "hvac_mode": "heat_cool",
            "target_temp_low": 20.0,
            "target_temp_high": 24.0,
            "step": 0.5,
        }
        await self.coordinator.async_deliver(ENTITY, self._resolver("range", requested))

        self.hass.states[ENTITY] = _state(
            "heat_cool", target_temp_low=20.0, target_temp_high=26.0, target_temp_step=0.5
        )
        self.watchers.fire_state()
        self.assertEqual("pending", self.coordinator.confirmation_status(ENTITY)["outcome"])

        self.hass.states[ENTITY] = _state(
            "heat_cool", target_temp_low=20.2, target_temp_high=24.0, target_temp_step=0.5
        )
        self.watchers.fire_state()
        self.assertEqual("confirmed", self.coordinator.confirmation_status(ENTITY)["outcome"])
        self.assertEqual(
            {"hvac_mode": "heat_cool", "target_temp_low": 20.2, "target_temp_high": 24.0},
            self.outcomes[0]["observed"],
        )

    async def test_observer_failure_does_not_break_confirmation(self) -> None:
        def failing_observer(_entity_id, _status, _details) -> None:
            raise RuntimeError("diagnostics unavailable")

        coordinator = ClimateDeliveryCoordinator(self.hass, failing_observer)
        with patch("custom_components.velair.climate_delivery._LOGGER.exception"):
            await coordinator.async_deliver(ENTITY, self._resolver("initial"))
            self.hass.states[ENTITY] = _state("heat", temperature=21.0, target_temp_step=0.5)
            self.watchers.fire_state()

        self.assertEqual("confirmed", coordinator.confirmation_status(ENTITY)["outcome"])
        self.assertEqual(1, len(self.outcomes))
        await coordinator.async_stop()


class ConvergenceRuleTests(unittest.TestCase):
    def test_tolerance_is_half_of_the_target_step(self) -> None:
        requested = {"action": ACTION_SET_TEMPERATURE, "hvac_mode": "cool", "temperature": 24.5}

        self.assertTrue(
            _target_converged(_state("cool", temperature=24.4, target_temp_step=0.5), requested)
        )
        self.assertTrue(
            _target_converged(_state("cool", temperature=24.75, target_temp_step=0.5), requested)
        )
        self.assertFalse(
            _target_converged(_state("cool", temperature=24.0, target_temp_step=0.5), {**requested, "temperature": 25.0})
        )
        self.assertFalse(
            _target_converged(_state("cool", temperature=24.8, target_temp_step=0.5), requested)
        )

    def test_step_from_request_wins_over_reported_attribute(self) -> None:
        requested = {"action": ACTION_SET_TEMPERATURE, "hvac_mode": "heat", "temperature": 21.0, "step": 1.0}

        self.assertTrue(
            _target_converged(_state("heat", temperature=21.4, target_temp_step=0.1), requested)
        )

    def test_missing_step_defaults_to_half_degree(self) -> None:
        requested = {"action": ACTION_SET_TEMPERATURE, "hvac_mode": "heat", "temperature": 21.0}

        self.assertTrue(_target_converged(_state("heat", temperature=21.2), requested))
        self.assertFalse(_target_converged(_state("heat", temperature=21.3), requested))

    def test_hvac_mode_must_match_when_requested(self) -> None:
        requested = {"action": ACTION_SET_TEMPERATURE, "hvac_mode": "cool", "temperature": 24.0}

        self.assertFalse(_target_converged(_state("heat", temperature=24.0), requested))
        self.assertTrue(_target_converged(_state("cool", temperature=24.0), requested))

    def test_ensure_on_without_mode_accepts_any_running_mode(self) -> None:
        requested = {"action": ACTION_SET_TEMPERATURE, "hvac_mode": None, "temperature": 24.0}

        self.assertTrue(_target_converged(_state("heat", temperature=24.0), requested))
        self.assertTrue(_target_converged(_state("fan_only", temperature=24.0), requested))
        self.assertFalse(_target_converged(_state("off", temperature=24.0), requested))

    def test_turn_off_converges_only_when_off(self) -> None:
        requested = {"action": "turn_off", "hvac_mode": "off"}

        self.assertTrue(_target_converged(_state("off"), requested))
        self.assertFalse(_target_converged(_state("heat"), requested))

    def test_unavailable_or_missing_state_never_converges(self) -> None:
        requested = {"action": ACTION_SET_TEMPERATURE, "hvac_mode": "heat", "temperature": 21.0}

        self.assertFalse(_target_converged(None, requested))
        self.assertFalse(_target_converged(_state("unavailable", temperature=21.0), requested))
        self.assertFalse(_target_converged(_state("heat"), requested))


class StaggerTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.hass = _Hass()
        self.hass.states[ENTITY] = _state("heat", temperature=19.0)
        self.hass.states[OTHER] = _state("heat", temperature=19.0)
        self.stagger = 0.0
        self.coordinator = ClimateDeliveryCoordinator(
            self.hass, stagger_seconds=lambda: self.stagger
        )
        self.starts: list[tuple[str, float]] = []

    async def asyncTearDown(self) -> None:
        await self.coordinator.async_stop()

    def _resolver(self, label: str):
        def resolve():
            async def apply() -> None:
                self.starts.append((label, monotonic()))

            return Delivery(apply)

        return resolve

    async def test_stagger_spaces_consecutive_starts_across_entities(self) -> None:
        self.stagger = 0.05

        results = await asyncio.gather(
            self.coordinator.async_deliver(ENTITY, self._resolver(ENTITY)),
            self.coordinator.async_deliver(OTHER, self._resolver(OTHER)),
        )

        self.assertEqual([True, True], results)
        self.assertEqual([ENTITY, OTHER], [label for label, _ in self.starts])
        self.assertGreaterEqual(self.starts[1][1] - self.starts[0][1], 0.045)

    async def test_zero_stagger_keeps_parallel_starts(self) -> None:
        results = await asyncio.gather(
            self.coordinator.async_deliver(ENTITY, self._resolver(ENTITY)),
            self.coordinator.async_deliver(OTHER, self._resolver(OTHER)),
        )

        self.assertEqual([True, True], results)
        self.assertLess(self.starts[1][1] - self.starts[0][1], 0.02)
        self.assertIsNone(self.coordinator._last_sequence_start)

    async def test_superseded_waiter_is_dropped_without_executing(self) -> None:
        self.stagger = 0.05
        first = asyncio.create_task(
            self.coordinator.async_deliver(ENTITY, self._resolver(ENTITY))
        )
        waiting = asyncio.create_task(
            self.coordinator.async_deliver(OTHER, self._resolver("obsolete"))
        )
        await _settle()
        self.assertEqual([ENTITY], [label for label, _ in self.starts])

        self.coordinator.cancel(OTHER)
        self.assertTrue(await first)
        self.assertFalse(await waiting)
        await asyncio.sleep(0.08)

        self.assertEqual([ENTITY], [label for label, _ in self.starts])

    async def test_newer_intent_replaces_waiting_delivery(self) -> None:
        self.stagger = 0.05
        first = asyncio.create_task(
            self.coordinator.async_deliver(ENTITY, self._resolver(ENTITY))
        )
        obsolete = asyncio.create_task(
            self.coordinator.async_deliver(OTHER, self._resolver("obsolete"))
        )
        await _settle()
        replacement = asyncio.create_task(
            self.coordinator.async_deliver(OTHER, self._resolver("replacement"))
        )

        self.assertTrue(await first)
        self.assertFalse(await obsolete)
        self.assertTrue(await replacement)
        self.assertEqual([ENTITY, "replacement"], [label for label, _ in self.starts])
        self.assertGreaterEqual(self.starts[1][1] - self.starts[0][1], 0.045)

    async def test_same_entity_serialization_still_works_with_stagger(self) -> None:
        self.stagger = 0.02

        async def step() -> None:
            self.starts.append(("serialized", monotonic()))

        await self.coordinator.async_deliver(ENTITY, self._resolver(ENTITY))
        await self.coordinator.async_serialize(ENTITY, step)

        self.assertEqual([ENTITY, "serialized"], [label for label, _ in self.starts])


class SchedulerConfirmationTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.entity_id = "climate.salon"
        self.hass = FakeHass()
        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat", attributes={"current_temperature": 20, "temperature": 18, "target_temp_step": 0.5}
        )
        self.climate = FakeClimateManager()
        schedule = empty_week_schedule()
        schedule["tuesday"] = [
            {
                "start": "17:00",
                "action": ACTION_SET_TEMPERATURE,
                "temperature": 21,
                "hvac_mode": "heat",
            }
        ]
        self.data = {
            "version": 1,
            "global_": {"mode": MODE_AUTO, "paused_until": None, "paused_started_at": None},
            "zones": {
                self.entity_id: {
                    "enabled": True,
                    "schedule": schedule,
                    "override": None,
                    "delivery": {"confirm": True, "confirm_timeout_seconds": 10, "confirm_attempts": 2},
                }
            },
            "settings": normalize_panel_settings(None, [self.entity_id]),
            "templates": [],
            "templates_seeded": True,
        }
        self.saves = 0
        self.scheduler = VelairScheduler(self.hass, self.data, self.climate, self._async_save)
        self.watchers = _Watchers()
        self._patches = [
            patch(
                "custom_components.velair.climate_delivery.async_track_state_change_event",
                self.watchers.track,
            ),
            patch(
                "custom_components.velair.climate_delivery.async_call_later",
                self.watchers.call_later,
            ),
        ]
        for item in self._patches:
            item.start()

    async def asyncTearDown(self) -> None:
        await self.scheduler._climate_delivery.async_stop()
        for item in self._patches:
            item.stop()

    async def _async_save(self) -> None:
        self.saves += 1

    def _events(self, name: str) -> list[dict]:
        return [
            data
            for event_type, data in self.hass.bus.events
            if event_type == EVENT_VELAIR and data.get("event") == name
        ]

    async def test_scheduled_delivery_confirms_and_publishes_outcome(self) -> None:
        await self.scheduler.async_apply_current_schedule()

        self.assertEqual(
            [("set_temperature", self.entity_id, 21.0, True, "heat")], self.climate.calls
        )
        self.assertEqual(1, len(self._events(EVENT_TYPE_CLIMATE_TARGET_APPLIED)))
        self.assertEqual([], self._events(EVENT_TYPE_DELIVERY_OUTCOME))
        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertEqual("pending", runtime["delivery"]["outcome"])
        self.assertEqual(1, runtime["delivery"]["attempts"])
        self.assertEqual(10.0, self.watchers.pending_timers[0]["delay"])

        self.hass.states[self.entity_id] = SimpleNamespace(
            state="heat", attributes={"temperature": 21.0, "target_temp_step": 0.5}
        )
        self.watchers.fire_state()

        outcomes = self._events(EVENT_TYPE_DELIVERY_OUTCOME)
        self.assertEqual(1, len(outcomes))
        self.assertEqual(
            {
                "domain": "velair",
                "event": EVENT_TYPE_DELIVERY_OUTCOME,
                "entity_id": self.entity_id,
                "outcome": "confirmed",
                "attempts": 1,
                "source": "current_schedule",
                "requested": {"hvac_mode": "heat", "temperature": 21.0},
                "observed": {"hvac_mode": "heat", "temperature": 21.0},
            },
            outcomes[0],
        )
        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertEqual("confirmed", runtime["delivery"]["outcome"])
        self.assertIsNotNone(runtime["delivery"]["confirmed_at"])

    async def test_timeout_re_resolves_current_intent_then_reports_unconfirmed(self) -> None:
        await self.scheduler.async_apply_current_schedule()
        self.data["zones"][self.entity_id]["schedule"]["tuesday"][0].update(
            {"temperature": 23, "hvac_mode": "cool"}
        )

        self.watchers.fire_timer()
        await _settle(6)

        self.assertEqual(
            [
                ("set_temperature", self.entity_id, 21.0, True, "heat"),
                ("set_temperature", self.entity_id, 23.0, True, "cool"),
            ],
            self.climate.calls,
        )
        self.assertEqual(2, self.scheduler.get_zone_runtime_statuses()[self.entity_id]["delivery"]["attempts"])

        self.watchers.fire_timer()
        await _settle(6)

        outcomes = self._events(EVENT_TYPE_DELIVERY_OUTCOME)
        self.assertEqual(1, len(outcomes))
        self.assertEqual("unconfirmed", outcomes[0]["outcome"])
        self.assertEqual(2, outcomes[0]["attempts"])
        self.assertEqual({"hvac_mode": "cool", "temperature": 23.0}, outcomes[0]["requested"])
        self.assertEqual(
            "unconfirmed",
            self.scheduler.get_zone_runtime_statuses()[self.entity_id]["delivery"]["outcome"],
        )
        self.assertEqual(2, len(self.climate.calls))

    async def test_confirmation_is_opt_in_per_zone(self) -> None:
        self.data["zones"][self.entity_id]["delivery"]["confirm"] = False

        await self.scheduler.async_apply_current_schedule()

        self.assertEqual([], self.watchers.pending_timers)
        runtime = self.scheduler.get_zone_runtime_statuses()[self.entity_id]
        self.assertEqual(
            {"outcome": None, "attempts": 0, "confirmed_at": None, "last_attempt_at": None},
            runtime["delivery"],
        )

    async def test_turn_off_schedule_confirms_against_off_state(self) -> None:
        self.data["zones"][self.entity_id]["schedule"]["tuesday"] = [
            {"start": "17:00", "action": "turn_off"}
        ]

        await self.scheduler.async_apply_current_schedule()
        self.assertEqual([("turn_off", self.entity_id)], self.climate.calls)
        self.assertEqual("pending", self.scheduler.get_zone_runtime_statuses()[self.entity_id]["delivery"]["outcome"])

        self.hass.states[self.entity_id] = SimpleNamespace(state="off", attributes={})
        self.watchers.fire_state()

        outcomes = self._events(EVENT_TYPE_DELIVERY_OUTCOME)
        self.assertEqual({"hvac_mode": "off"}, outcomes[0]["requested"])
        self.assertEqual("confirmed", outcomes[0]["outcome"])

    async def test_pause_cancels_pending_confirmation(self) -> None:
        await self.scheduler.async_apply_current_schedule()
        self.assertEqual(1, len(self.watchers.pending_timers))

        await self.scheduler.async_pause_zone(self.entity_id)

        self.assertEqual([], self.watchers.pending_timers)
        self.assertIsNone(self.scheduler.get_zone_runtime_statuses()[self.entity_id]["delivery"]["outcome"])

    async def test_zone_delivery_settings_round_trip(self) -> None:
        updated = await self.scheduler.async_update_zone_delivery(
            self.entity_id, {"confirm_attempts": 9, "confirm_timeout_seconds": 60}
        )

        self.assertEqual(
            {"confirm": True, "confirm_timeout_seconds": 60, "confirm_attempts": 5}, updated
        )
        self.assertEqual(updated, self.data["zones"][self.entity_id]["delivery"])
        self.assertEqual(1, self.saves)

        with self.assertRaises(ValueError):
            await self.scheduler.async_update_zone_delivery("climate.unknown", {"confirm": True})

    async def test_failed_save_restores_previous_delivery_settings(self) -> None:
        async def failing_save() -> None:
            raise OSError("storage unavailable")

        self.scheduler._async_save_data = failing_save

        with self.assertRaises(OSError):
            await self.scheduler.async_update_zone_delivery(self.entity_id, {"confirm": False})

        self.assertTrue(self.data["zones"][self.entity_id]["delivery"]["confirm"])

    async def test_stagger_setting_round_trip_and_clamp(self) -> None:
        settings = await self.scheduler.async_update_settings({"delivery_stagger_seconds": 45})

        self.assertEqual(30, settings["delivery_stagger_seconds"])
        self.assertEqual(30, self.data["settings"]["delivery_stagger_seconds"])

        settings = await self.scheduler.async_update_settings({"delivery_stagger_seconds": 3})
        self.assertEqual(3, settings["delivery_stagger_seconds"])
        self.assertEqual("monday", settings["first_weekday"])


class NormalizationTests(unittest.TestCase):
    def test_zone_delivery_defaults_and_clamps(self) -> None:
        self.assertEqual(
            {"confirm": False, "confirm_timeout_seconds": 25, "confirm_attempts": 3},
            normalize_zone_delivery(None),
        )
        self.assertEqual(
            {"confirm": True, "confirm_timeout_seconds": 120, "confirm_attempts": 1},
            normalize_zone_delivery(
                {"confirm": True, "confirm_timeout_seconds": 999, "confirm_attempts": 0}
            ),
        )
        self.assertEqual(
            {"confirm": False, "confirm_timeout_seconds": 5, "confirm_attempts": 5},
            normalize_zone_delivery(
                {"confirm": "", "confirm_timeout_seconds": 1, "confirm_attempts": "7"}
            ),
        )
        self.assertEqual(
            {"confirm": False, "confirm_timeout_seconds": 25, "confirm_attempts": 3},
            normalize_zone_delivery({"confirm_timeout_seconds": "bad", "confirm_attempts": None}),
        )

    def test_schedule_data_normalizes_delivery_on_both_zone_paths(self) -> None:
        data = normalize_schedule_data(
            {
                "zones": {
                    "climate.salon": {
                        "enabled": True,
                        "schedule": empty_week_schedule(),
                        "delivery": {"confirm": True, "confirm_timeout_seconds": 40},
                    }
                }
            },
            ["climate.salon", "climate.bedroom"],
        )

        self.assertEqual(
            {"confirm": True, "confirm_timeout_seconds": 40, "confirm_attempts": 3},
            data["zones"]["climate.salon"]["delivery"],
        )
        self.assertEqual(
            {"confirm": False, "confirm_timeout_seconds": 25, "confirm_attempts": 3},
            data["zones"]["climate.bedroom"]["delivery"],
        )

    def test_panel_settings_stagger_defaults_and_clamps(self) -> None:
        self.assertEqual(0, normalize_panel_settings(None, [])["delivery_stagger_seconds"])
        self.assertEqual(
            30, normalize_panel_settings({"delivery_stagger_seconds": 90}, [])["delivery_stagger_seconds"]
        )
        self.assertEqual(
            0, normalize_panel_settings({"delivery_stagger_seconds": -4}, [])["delivery_stagger_seconds"]
        )
        self.assertEqual(
            7, normalize_panel_settings({"delivery_stagger_seconds": "7"}, [])["delivery_stagger_seconds"]
        )

    def test_export_includes_delivery_settings(self) -> None:
        exported = api_module._export_zones(
            {
                "climate.salon": {
                    "enabled": True,
                    "schedule": {},
                    "delivery": {"confirm": True, "confirm_timeout_seconds": 30, "confirm_attempts": 2},
                }
            }
        )

        self.assertEqual(
            {"confirm": True, "confirm_timeout_seconds": 30, "confirm_attempts": 2},
            exported["climate.salon"]["delivery"],
        )

    def test_import_keeps_delivery_settings_from_portable_zone(self) -> None:
        imported = api_module._normalize_import_zones(
            {
                "climate.salon": {
                    "schedule": {},
                    "delivery": {"confirm": True, "confirm_attempts": 4},
                }
            },
            {
                "climate.salon": {"enabled": True, "schedule": empty_week_schedule()},
            },
        )

        self.assertEqual(
            {"confirm": True, "confirm_timeout_seconds": 25, "confirm_attempts": 4},
            imported["climate.salon"]["delivery"],
        )


class ApiTests(unittest.IsolatedAsyncioTestCase):
    async def test_update_zone_delivery_forwards_to_scheduler(self) -> None:
        scheduler = SimpleNamespace(async_update_zone_delivery=AsyncMock())
        runtime = {
            "scheduler": scheduler,
            "storage": SimpleNamespace(temperature_migration_required=False),
            "operation_active": None,
            "operation_recovery": None,
        }
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        response = {"zones": {}}
        with (
            patch.object(api_module, "_get_runtime", lambda _hass: runtime),
            patch.object(api_module, "_build_schedule_response", lambda _runtime: response),
        ):
            await api_module.ws_update_zone_delivery(
                SimpleNamespace(),
                connection,
                {
                    "id": 7,
                    "type": "velair/update_zone_delivery",
                    "entity_id": "climate.salon",
                    "delivery": {"confirm": True, "confirm_attempts": 2},
                },
            )

        scheduler.async_update_zone_delivery.assert_awaited_once_with(
            "climate.salon", {"confirm": True, "confirm_attempts": 2}
        )
        connection.send_result.assert_called_once_with(7, response)
        connection.send_error.assert_not_called()

    async def test_update_zone_delivery_reports_validation_errors(self) -> None:
        scheduler = SimpleNamespace(
            async_update_zone_delivery=AsyncMock(side_effect=ValueError("unknown climate"))
        )
        runtime = {
            "scheduler": scheduler,
            "storage": SimpleNamespace(temperature_migration_required=False),
            "operation_active": None,
            "operation_recovery": None,
        }
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        with patch.object(api_module, "_get_runtime", lambda _hass: runtime):
            await api_module.ws_update_zone_delivery(
                SimpleNamespace(),
                connection,
                {
                    "id": 8,
                    "type": "velair/update_zone_delivery",
                    "entity_id": "climate.missing",
                    "delivery": {"confirm": True},
                },
            )

        connection.send_error.assert_called_once_with(8, "invalid_delivery", "unknown climate")
        connection.send_result.assert_not_called()

    async def test_update_settings_forwards_stagger(self) -> None:
        scheduler = SimpleNamespace(async_update_settings=AsyncMock())
        runtime = {
            "scheduler": scheduler,
            "storage": SimpleNamespace(temperature_migration_required=False),
            "entry": SimpleNamespace(options={}),
            "operation_active": None,
            "operation_recovery": None,
        }
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        with (
            patch.object(api_module, "_get_runtime", lambda _hass: runtime),
            patch.object(api_module, "_build_schedule_response", lambda _runtime: {}),
        ):
            await api_module.ws_update_settings(
                SimpleNamespace(),
                connection,
                {"id": 9, "type": "velair/update_settings", "delivery_stagger_seconds": 3},
            )

        scheduler.async_update_settings.assert_awaited_once_with({"delivery_stagger_seconds": 3})


class DiagnosticsTests(unittest.TestCase):
    def setUp(self) -> None:
        climate = SimpleNamespace(
            state="heat",
            attributes={"hvac_modes": ["heat", "off"], "min_temp": 7.0, "max_temp": 35.0},
        )
        self.hass = SimpleNamespace(
            states={"climate.living_room": climate},
            loop=SimpleNamespace(call_soon=lambda callback: callback()),
            bus=SimpleNamespace(async_fire=Mock(), async_listen=lambda *_args: (lambda: None)),
        )
        self.manager = diagnostics_module.RuntimeDiagnosticsManager(
            self.hass, ["climate.living_room"]
        )
        scheduler = SimpleNamespace(
            temperature_migration_blocked=False,
            mode="auto",
            get_operational_status=lambda: "scheduled",
            get_room_sensor_assist_statuses=lambda: {},
            get_comfort_assessments=lambda: {},
            get_zone_runtime_statuses=lambda: {"climate.living_room": {"state": "scheduled"}},
        )
        data = {
            "global_": {"mode": "auto", "active_profile_ids": []},
            "profiles": [],
            "modes": [],
            "zones": {
                "climate.living_room": {
                    "enabled": True,
                    "preconditioning": {},
                    "comfort": {},
                    "delivery": {"confirm": True, "confirm_timeout_seconds": 25, "confirm_attempts": 3},
                }
            },
        }
        self.runtime = {
            "scheduler": scheduler,
            "storage": SimpleNamespace(data=data, temperature_migration_required=False),
            "operation_recovery": None,
        }

    def test_attempts_and_outcomes_are_retained_in_delivery_history(self) -> None:
        self.manager.async_start(self.runtime)
        self.manager.observe_delivery("climate.living_room", "success")
        self.manager.observe_delivery(
            "climate.living_room",
            "confirming",
            {"attempt": 1, "attempts": 3, "requested": {"hvac_mode": "heat", "temperature": 21.0}},
        )
        self.manager.observe_delivery(
            "climate.living_room",
            "confirming",
            {"attempt": 2, "attempts": 3, "requested": {"hvac_mode": "heat", "temperature": 21.0}},
        )
        self.manager.observe_delivery(
            "climate.living_room",
            "confirmed",
            {
                "attempts": 2,
                "requested": {"hvac_mode": "heat", "temperature": 21.0, "secret": "x"},
                "observed": {"hvac_mode": "heat", "temperature": 21.0, "context_id": "abc"},
            },
        )

        snapshot = self.manager.snapshot(self.runtime)
        history = [item for item in snapshot["history"] if item["category"] == "delivery"]
        self.assertEqual(
            ["confirmed", "confirming", "confirming"],
            [item["data"]["status"] for item in history],
        )
        self.assertEqual({"attempt": 2, "attempts": 3}, {
            key: history[1]["data"][key] for key in ("attempt", "attempts")
        })
        self.assertEqual("info", history[0]["severity"])
        self.assertEqual(
            {"hvac_mode": "heat", "temperature": 21.0}, history[0]["data"]["observed"]
        )
        self.assertNotIn("secret", str(history[0]))
        self.assertNotIn("context_id", str(history[0]))
        unit = snapshot["units"]["climate.living_room"]
        self.assertEqual("confirmed", unit["delivery"]["status"])
        self.assertEqual("confirmed", unit["delivery"]["confirmation"]["outcome"])
        self.assertEqual(2, unit["delivery"]["confirmation"]["attempts"])
        self.assertIsNotNone(unit["delivery"]["confirmation"]["confirmed_at"])
        self.assertEqual("ok", unit["status"])

    def test_unconfirmed_outcome_is_a_warning_issue_and_counted(self) -> None:
        self.manager.async_start(self.runtime)
        self.manager.async_finish_startup()
        self.manager.observe_delivery("climate.living_room", "confirming", {"attempt": 1, "attempts": 1})
        self.manager.observe_delivery("climate.living_room", "unconfirmed", {"attempts": 1})

        summary = self.manager.automation_summary()
        self.assertEqual("warning", summary["status"])
        self.assertIn("delivery_unconfirmed", summary["issue_codes"])
        self.assertEqual(1, summary["unconfirmed_deliveries"])
        self.assertEqual(0, summary["confirmed_deliveries_today"])
        self.assertEqual(1, summary["unconfirmed_deliveries_today"])
        payloads = [call.args[1] for call in self.hass.bus.async_fire.call_args_list]
        self.assertEqual(["delivery_unconfirmed"], [payload["code"] for payload in payloads])
        history = [item for item in self.manager.snapshot(self.runtime)["history"] if item["category"] == "delivery"]
        self.assertEqual("warning", history[0]["severity"])

        self.manager.observe_delivery("climate.living_room", "success")
        self.manager.observe_delivery("climate.living_room", "confirming", {"attempt": 1, "attempts": 3})
        self.manager.observe_delivery("climate.living_room", "confirmed", {"attempts": 1})

        summary = self.manager.automation_summary()
        self.assertEqual("ok", summary["status"])
        self.assertEqual(0, summary["unconfirmed_deliveries"])
        self.assertEqual(1, summary["confirmed_deliveries_today"])
        self.assertEqual(1, summary["unconfirmed_deliveries_today"])

    def test_disabled_delivery_category_drops_confirmation_history(self) -> None:
        self.manager.async_start(self.runtime)
        self.manager._history_categories["delivery"] = False
        self.manager.observe_delivery("climate.living_room", "confirming", {"attempt": 1, "attempts": 3})
        self.manager.observe_delivery("climate.living_room", "confirmed", {"attempts": 1})

        snapshot = self.manager.snapshot(self.runtime)
        self.assertEqual([], snapshot["history"])
        self.assertEqual("confirmed", snapshot["units"]["climate.living_room"]["delivery"]["confirmation"]["outcome"])


if __name__ == "__main__":
    unittest.main()
