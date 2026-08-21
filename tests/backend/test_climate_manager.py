"""Climate service adapter unit tests."""

from __future__ import annotations

from types import SimpleNamespace
import unittest

from . import helpers  # noqa: F401 - installs Home Assistant test stubs
from homeassistant.const import UnitOfTemperature

from custom_components.velair.climate_manager import ClimateManager


class _ServiceRecorder:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str, dict, bool]] = []

    async def async_call(
        self,
        domain: str,
        service: str,
        data: dict,
        *,
        blocking: bool = False,
    ) -> None:
        self.calls.append((domain, service, data, blocking))


class _ContextServiceRecorder:
    def __init__(self, *, fail: bool = False) -> None:
        self.fail = fail

    async def async_call(self, _domain, _service, _data, *, blocking=False, context=None):
        if self.fail:
            raise RuntimeError("service failed")


class _LogicalActionRecorder:
    def __init__(self, manager=None, *, fail_service: str | None = None) -> None:
        self.manager = manager
        self.fail_service = fail_service
        self.calls: list[tuple[str, dict, object]] = []
        self.expectations_at_call: list[list[dict]] = []

    async def async_call(
        self, _domain, service, data, *, blocking=False, context=None
    ) -> None:
        self.calls.append((service, data, context))
        if self.manager is not None:
            self.expectations_at_call.append(
                list(self.manager._expected.get(data["entity_id"], []))
            )
        if service == self.fail_service:
            raise RuntimeError("service failed")


class ClimateManagerOwnershipLedgerTest(unittest.IsolatedAsyncioTestCase):
    def _manager(self, *, fail: bool = False) -> ClimateManager:
        state = SimpleNamespace(
            state="cool",
            attributes={
                "temperature": 20.0,
                "target_temp_step": 0.5,
                "min_temp": 5,
                "max_temp": 35,
                "supported_features": 1,
                "hvac_modes": ["off", "heat", "cool"],
            },
        )
        hass = SimpleNamespace(
            services=_ContextServiceRecorder(fail=fail),
            states={"climate.room": state},
            config=SimpleNamespace(units=SimpleNamespace(temperature_unit="°C")),
        )
        return ClimateManager(hass)

    async def test_failed_service_removes_context_and_expectation(self) -> None:
        manager = self._manager(fail=True)
        with self.assertRaisesRegex(RuntimeError, "service failed"):
            await manager.async_set_hvac_mode("climate.room", "heat")
        self.assertEqual({}, manager._contexts)
        self.assertEqual([], manager._expected.get("climate.room", []))

    async def test_mode_and_scalar_target_register_one_complete_intent_up_front(
        self,
    ) -> None:
        manager = self._manager()
        manager._hass.states["climate.room"].state = "off"
        recorder = _LogicalActionRecorder(manager)
        manager._hass.services = recorder

        await manager.async_set_temperature(
            "climate.room", 21.0, ensure_on=True, hvac_mode="heat"
        )

        self.assertEqual(
            ["set_hvac_mode", "set_temperature"],
            [call[0] for call in recorder.calls],
        )
        self.assertIs(recorder.calls[0][2], recorder.calls[1][2])
        self.assertEqual(1, len(recorder.expectations_at_call[0]))
        self.assertEqual(
            {"hvac_mode": "heat", "temperature": 21.0},
            recorder.expectations_at_call[0][0]["expected"],
        )
        self.assertEqual(1, len(manager._expected["climate.room"]))

    async def test_mode_and_cooling_target_are_owned_when_echo_is_coalesced(
        self,
    ) -> None:
        manager = self._manager()
        manager._hass.states["climate.room"].state = "off"
        await manager.async_set_temperature(
            "climate.room", 24.0, ensure_on=True, hvac_mode="cool"
        )
        context_id = manager._expected["climate.room"][0]["context_id"]
        old = SimpleNamespace(
            state="off", attributes={"temperature": 20.0}, context=None
        )
        new = SimpleNamespace(
            state="cool",
            attributes={"temperature": 24.0},
            context=SimpleNamespace(id=context_id),
        )

        self.assertEqual(
            {"hvac_mode", "temperature"},
            manager.owned_state_change_fields("climate.room", new, old),
        )

    async def test_turning_off_owns_coalesced_scalar_target_disappearance(self) -> None:
        manager = self._manager()
        manager._hass.states["climate.room"].state = "heat"
        manager._hass.states["climate.room"].attributes["temperature"] = 21.0

        await manager.async_set_hvac_mode("climate.room", "off")

        candidate = manager._expected["climate.room"][0]
        context_id = candidate["context_id"]
        self.assertEqual("disappear", candidate["structural_transition"]["direction"])
        self.assertEqual(
            {"temperature": 21.0},
            candidate["structural_transition"]["values"],
        )
        old = SimpleNamespace(
            state="heat", attributes={"temperature": 21.0}, context=None
        )
        new = SimpleNamespace(
            state="off", attributes={}, context=SimpleNamespace(id=context_id)
        )

        self.assertEqual(
            {"hvac_mode", "temperature"},
            manager.owned_state_change_fields("climate.room", new, old),
        )
        self.assertNotIn("climate.room", manager._expected)

    async def test_turning_off_retains_disappearance_after_separate_mode_echo(
        self,
    ) -> None:
        manager = self._manager()
        state = manager._hass.states["climate.room"]
        state.state = "cool"
        state.attributes["temperature"] = 24.0
        await manager.async_set_hvac_mode("climate.room", "off")
        context_id = manager._expected["climate.room"][0]["context_id"]
        old = SimpleNamespace(
            state="cool", attributes={"temperature": 24.0}, context=None
        )
        mode_echo = SimpleNamespace(
            state="off",
            attributes={"temperature": 24.0},
            context=SimpleNamespace(id=context_id),
        )

        self.assertEqual(
            {"hvac_mode"},
            manager.owned_state_change_fields("climate.room", mode_echo, old),
        )
        self.assertEqual({}, manager._expected["climate.room"][0]["expected"])
        disappearance = SimpleNamespace(
            state="off", attributes={}, context=SimpleNamespace(id=context_id)
        )
        self.assertEqual(
            {"temperature"},
            manager.owned_state_change_fields(
                "climate.room", disappearance, mode_echo
            ),
        )

    async def test_turning_off_accepts_contextless_echo_by_captured_value(self) -> None:
        manager = self._manager()
        state = manager._hass.states["climate.room"]
        state.state = "heat"
        state.attributes["temperature"] = 21.0
        await manager.async_set_hvac_mode("climate.room", "off")
        old = SimpleNamespace(
            state="heat", attributes={"temperature": 21.0}, context=None
        )
        mode_echo = SimpleNamespace(
            state="off", attributes={"temperature": 21.0}, context=None
        )
        disappearance = SimpleNamespace(state="off", attributes={}, context=None)

        self.assertEqual(
            {"hvac_mode"},
            manager.owned_state_change_fields("climate.room", mode_echo, old),
        )
        self.assertEqual(
            {"temperature"},
            manager.owned_state_change_fields(
                "climate.room", disappearance, mode_echo
            ),
        )

    async def test_turning_off_rejects_echo_with_different_context(self) -> None:
        manager = self._manager()
        state = manager._hass.states["climate.room"]
        state.state = "heat"
        state.attributes["temperature"] = 21.0
        await manager.async_set_hvac_mode("climate.room", "off")
        old = SimpleNamespace(
            state="heat", attributes={"temperature": 21.0}, context=None
        )
        new = SimpleNamespace(
            state="off",
            attributes={},
            context=SimpleNamespace(id="external-context"),
        )

        self.assertEqual(
            set(), manager.owned_state_change_fields("climate.room", new, old)
        )
        candidate = manager._expected["climate.room"][0]
        self.assertNotIn("structural_transition", candidate)
        later_contextless = SimpleNamespace(state="off", attributes={}, context=None)
        off_with_target = SimpleNamespace(
            state="off", attributes={"temperature": 21.0}, context=None
        )
        self.assertEqual(
            set(),
            manager.owned_state_change_fields(
                "climate.room", later_contextless, off_with_target
            ),
        )

    async def test_turning_off_divergent_finite_target_is_external_and_invalidates(
        self,
    ) -> None:
        manager = self._manager()
        state = manager._hass.states["climate.room"]
        state.state = "heat"
        state.attributes["temperature"] = 21.0
        await manager.async_set_hvac_mode("climate.room", "off")
        context_id = manager._expected["climate.room"][0]["context_id"]
        old = SimpleNamespace(
            state="heat", attributes={"temperature": 21.0}, context=None
        )
        divergent = SimpleNamespace(
            state="off",
            attributes={"temperature": 22.0},
            context=SimpleNamespace(id=context_id),
        )

        self.assertEqual(
            {"hvac_mode"},
            manager.owned_state_change_fields("climate.room", divergent, old),
        )
        self.assertNotIn("climate.room", manager._expected)

    async def test_turning_off_old_target_must_match_captured_value(self) -> None:
        manager = self._manager()
        state = manager._hass.states["climate.room"]
        state.state = "heat"
        state.attributes["temperature"] = 21.0
        await manager.async_set_hvac_mode("climate.room", "off")
        context_id = manager._expected["climate.room"][0]["context_id"]
        old = SimpleNamespace(
            state="heat", attributes={"temperature": 20.0}, context=None
        )
        new = SimpleNamespace(
            state="off", attributes={}, context=SimpleNamespace(id=context_id)
        )

        self.assertEqual(
            {"hvac_mode"},
            manager.owned_state_change_fields("climate.room", new, old),
        )
        self.assertNotIn("climate.room", manager._expected)

    async def test_turning_off_owns_range_disappearance_coalesced_and_separate(
        self,
    ) -> None:
        for coalesced in (True, False):
            with self.subTest(coalesced=coalesced):
                manager = self._manager()
                state = manager._hass.states["climate.room"]
                state.state = "heat_cool"
                state.attributes.pop("temperature", None)
                state.attributes.update(
                    {
                        "target_temp_low": 19.0,
                        "target_temp_high": 24.0,
                        "supported_features": 2,
                        "hvac_modes": ["off", "heat_cool"],
                    }
                )
                await manager.async_set_hvac_mode("climate.room", "off")
                context_id = manager._expected["climate.room"][0]["context_id"]
                old = SimpleNamespace(
                    state="heat_cool",
                    attributes={"target_temp_low": 19.0, "target_temp_high": 24.0},
                    context=None,
                )
                if coalesced:
                    new = SimpleNamespace(
                        state="off",
                        attributes={},
                        context=SimpleNamespace(id=context_id),
                    )
                    self.assertEqual(
                        {"hvac_mode", "target_temp_low", "target_temp_high"},
                        manager.owned_state_change_fields("climate.room", new, old),
                    )
                else:
                    mode_echo = SimpleNamespace(
                        state="off",
                        attributes={
                            "target_temp_low": 19.0,
                            "target_temp_high": 24.0,
                        },
                        context=SimpleNamespace(id=context_id),
                    )
                    low_gone = SimpleNamespace(
                        state="off",
                        attributes={"target_temp_high": 24.0},
                        context=SimpleNamespace(id=context_id),
                    )
                    all_gone = SimpleNamespace(
                        state="off",
                        attributes={},
                        context=SimpleNamespace(id=context_id),
                    )
                    self.assertEqual(
                        {"hvac_mode"},
                        manager.owned_state_change_fields(
                            "climate.room", mode_echo, old
                        ),
                    )
                    self.assertEqual(
                        {"target_temp_low"},
                        manager.owned_state_change_fields(
                            "climate.room", low_gone, mode_echo
                        ),
                    )
                    self.assertEqual(
                        {"target_temp_high"},
                        manager.owned_state_change_fields(
                            "climate.room", all_gone, low_gone
                        ),
                    )

    async def test_failed_turn_off_cleans_disappearance_expectation(self) -> None:
        manager = self._manager(fail=True)
        manager._hass.states["climate.room"].state = "heat"
        manager._hass.states["climate.room"].attributes["temperature"] = 21.0

        with self.assertRaisesRegex(RuntimeError, "service failed"):
            await manager.async_set_hvac_mode("climate.room", "off")

        self.assertEqual({}, manager._expected)
        self.assertEqual({}, manager._contexts)

    async def test_turn_off_service_fallback_captures_current_target(self) -> None:
        manager = self._manager()
        state = manager._hass.states["climate.room"]
        state.state = "cool"
        state.attributes["temperature"] = 24.0
        state.attributes["hvac_modes"] = ["heat", "cool"]
        recorder = _LogicalActionRecorder(manager)
        manager._hass.services = recorder

        await manager.async_turn_off("climate.room")

        self.assertEqual(["turn_off"], [call[0] for call in recorder.calls])
        candidate = manager._expected["climate.room"][0]
        self.assertEqual({"hvac_mode": "off"}, candidate["expected"])
        self.assertEqual(
            {"temperature": 24.0},
            candidate["structural_transition"]["values"],
        )

    async def test_contextless_off_selects_candidate_by_captured_target(self) -> None:
        manager = self._manager()
        state = manager._hass.states["climate.room"]
        state.state = "heat"
        state.attributes["temperature"] = 21.0
        await manager.async_set_hvac_mode("climate.room", "off")
        state.attributes["temperature"] = 22.0
        await manager.async_set_hvac_mode("climate.room", "off")
        old = SimpleNamespace(
            state="heat", attributes={"temperature": 22.0}, context=None
        )
        new = SimpleNamespace(state="off", attributes={}, context=None)

        self.assertEqual(
            {"hvac_mode", "temperature"},
            manager.owned_state_change_fields("climate.room", new, old),
        )
        remaining = manager._expected["climate.room"]
        self.assertEqual({}, remaining[0]["expected"])
        self.assertFalse(remaining[0]["structural_transition"]["mode_confirmed"])

    async def test_contextless_split_off_selects_disappearance_by_captured_target(
        self,
    ) -> None:
        manager = self._manager()
        state = manager._hass.states["climate.room"]
        state.state = "heat"
        state.attributes["temperature"] = 21.0
        await manager.async_set_hvac_mode("climate.room", "off")
        state.attributes["temperature"] = 22.0
        await manager.async_set_hvac_mode("climate.room", "off")
        old = SimpleNamespace(
            state="heat", attributes={"temperature": 22.0}, context=None
        )
        mode_echo = SimpleNamespace(
            state="off", attributes={"temperature": 22.0}, context=None
        )
        gone = SimpleNamespace(state="off", attributes={}, context=None)

        self.assertEqual(
            {"hvac_mode"},
            manager.owned_state_change_fields("climate.room", mode_echo, old),
        )
        self.assertEqual(
            {"temperature"},
            manager.owned_state_change_fields("climate.room", gone, mode_echo),
        )

    async def test_duplicate_contextless_off_permission_is_one_shot(self) -> None:
        manager = self._manager()
        state = manager._hass.states["climate.room"]
        state.state = "heat"
        state.attributes["temperature"] = 21.0
        await manager.async_set_hvac_mode("climate.room", "off")
        await manager.async_set_hvac_mode("climate.room", "off")
        old = SimpleNamespace(
            state="heat", attributes={"temperature": 21.0}, context=None
        )
        new = SimpleNamespace(state="off", attributes={}, context=None)

        self.assertEqual(
            {"hvac_mode", "temperature"},
            manager.owned_state_change_fields("climate.room", new, old),
        )
        self.assertNotIn("climate.room", manager._expected)
        off_with_target = SimpleNamespace(
            state="off", attributes={"temperature": 21.0}, context=None
        )
        self.assertEqual(
            set(),
            manager.owned_state_change_fields(
                "climate.room", new, off_with_target
            ),
        )

    async def test_exact_context_selects_only_its_off_candidate(self) -> None:
        manager = self._manager()
        state = manager._hass.states["climate.room"]
        state.state = "heat"
        state.attributes["temperature"] = 21.0
        await manager.async_set_hvac_mode("climate.room", "off")
        first_context = manager._expected["climate.room"][0]["context_id"]
        state.attributes["temperature"] = 22.0
        await manager.async_set_hvac_mode("climate.room", "off")
        second_context = manager._expected["climate.room"][1]["context_id"]
        old = SimpleNamespace(
            state="heat", attributes={"temperature": 22.0}, context=None
        )
        new = SimpleNamespace(
            state="off", attributes={}, context=SimpleNamespace(id=second_context)
        )

        self.assertEqual(
            {"hvac_mode", "temperature"},
            manager.owned_state_change_fields("climate.room", new, old),
        )
        self.assertEqual(
            [first_context],
            [item["context_id"] for item in manager._expected["climate.room"]],
        )

    async def test_restored_scalar_target_is_one_shot_before_final_target(self) -> None:
        manager = self._manager()
        state = manager._hass.states["climate.room"]
        state.state = "off"
        state.attributes.pop("temperature", None)
        await manager.async_set_temperature(
            "climate.room", 21.0, ensure_on=True, hvac_mode="heat"
        )
        context_id = manager._expected["climate.room"][0]["context_id"]
        old = SimpleNamespace(state="off", attributes={}, context=None)
        restored = SimpleNamespace(
            state="heat",
            attributes={"temperature": 20.0},
            context=SimpleNamespace(id=context_id),
        )

        self.assertEqual(
            {"hvac_mode", "temperature"},
            manager.owned_state_change_fields("climate.room", restored, old),
        )
        self.assertEqual(
            {"temperature": 21.0},
            manager._expected["climate.room"][0]["expected"],
        )
        second_appearance = SimpleNamespace(
            state="heat",
            attributes={"temperature": 19.0},
            context=SimpleNamespace(id=context_id),
        )
        self.assertEqual(
            set(),
            manager.owned_state_change_fields(
                "climate.room",
                second_appearance,
                SimpleNamespace(state="heat", attributes={}, context=None),
            ),
        )
        divergent = SimpleNamespace(
            state="heat",
            attributes={"temperature": 19.0},
            context=SimpleNamespace(id=context_id),
        )
        self.assertEqual(
            set(),
            manager.owned_state_change_fields("climate.room", divergent, restored),
        )
        final = SimpleNamespace(
            state="heat",
            attributes={"temperature": 21.0},
            context=SimpleNamespace(id=context_id),
        )
        self.assertEqual(
            {"temperature"},
            manager.owned_state_change_fields("climate.room", final, divergent),
        )

    async def test_separate_cooling_mode_then_restored_target_requires_same_context(
        self,
    ) -> None:
        manager = self._manager()
        state = manager._hass.states["climate.room"]
        state.state = "off"
        state.attributes.pop("temperature", None)
        await manager.async_set_temperature(
            "climate.room", 24.0, ensure_on=True, hvac_mode="cool"
        )
        context_id = manager._expected["climate.room"][0]["context_id"]
        old = SimpleNamespace(state="off", attributes={}, context=None)
        mode_echo = SimpleNamespace(
            state="cool", attributes={}, context=SimpleNamespace(id=context_id)
        )
        self.assertEqual(
            {"hvac_mode"},
            manager.owned_state_change_fields("climate.room", mode_echo, old),
        )
        contextless_target = SimpleNamespace(
            state="cool", attributes={"temperature": 20.0}, context=None
        )
        self.assertEqual(
            set(),
            manager.owned_state_change_fields(
                "climate.room", contextless_target, mode_echo
            ),
        )

        same_context_target = SimpleNamespace(
            state="cool",
            attributes={"temperature": 20.0},
            context=SimpleNamespace(id=context_id),
        )
        self.assertEqual(
            {"temperature"},
            manager.owned_state_change_fields(
                "climate.room", same_context_target, mode_echo
            ),
        )

    async def test_restored_native_range_is_owned_without_consuming_final_range(
        self,
    ) -> None:
        manager = self._manager()
        state = manager._hass.states["climate.room"]
        state.state = "off"
        state.attributes.pop("temperature", None)
        state.attributes.update({
            "supported_features": 2,
            "hvac_modes": ["off", "heat_cool"],
        })
        await manager.async_set_temperature_range(
            "climate.room", 19.0, 24.0, ensure_on=True, hvac_mode="heat_cool"
        )
        context_id = manager._expected["climate.room"][0]["context_id"]
        old = SimpleNamespace(state="off", attributes={}, context=None)
        restored_low = SimpleNamespace(
            state="heat_cool",
            attributes={"target_temp_low": 18.0},
            context=SimpleNamespace(id=context_id),
        )
        self.assertEqual(
            {"hvac_mode", "target_temp_low"},
            manager.owned_state_change_fields("climate.room", restored_low, old),
        )
        restored_range = SimpleNamespace(
            state="heat_cool",
            attributes={"target_temp_low": 18.0, "target_temp_high": 25.0},
            context=SimpleNamespace(id=context_id),
        )
        self.assertEqual(
            {"target_temp_high"},
            manager.owned_state_change_fields(
                "climate.room", restored_range, restored_low
            ),
        )
        self.assertEqual(
            {"target_temp_low": 19.0, "target_temp_high": 24.0},
            manager._expected["climate.room"][0]["expected"],
        )
        final = SimpleNamespace(
            state="heat_cool",
            attributes={"target_temp_low": 19.0, "target_temp_high": 24.0},
            context=SimpleNamespace(id=context_id),
        )
        self.assertEqual(
            {"target_temp_low", "target_temp_high"},
            manager.owned_state_change_fields("climate.room", final, restored_range),
        )

    async def test_non_numeric_and_non_finite_old_targets_can_transition_once(
        self,
    ) -> None:
        for initial in ("unknown", float("nan")):
            with self.subTest(initial=initial):
                manager = self._manager()
                state = manager._hass.states["climate.room"]
                state.state = "off"
                state.attributes["temperature"] = initial
                await manager.async_set_temperature(
                    "climate.room", 21.0, ensure_on=True, hvac_mode="heat"
                )
                context_id = manager._expected["climate.room"][0]["context_id"]
                old = SimpleNamespace(
                    state="off", attributes={"temperature": initial}, context=None
                )
                restored = SimpleNamespace(
                    state="heat",
                    attributes={"temperature": 20.0},
                    context=SimpleNamespace(id=context_id),
                )
                self.assertEqual(
                    {"hvac_mode", "temperature"},
                    manager.owned_state_change_fields(
                        "climate.room", restored, old
                    ),
                )

    async def test_consumed_range_field_cannot_use_structural_permission_again(
        self,
    ) -> None:
        manager = self._manager()
        state = manager._hass.states["climate.room"]
        state.state = "off"
        state.attributes.pop("temperature", None)
        state.attributes.update({
            "supported_features": 2,
            "hvac_modes": ["off", "heat_cool"],
        })
        await manager.async_set_temperature_range(
            "climate.room", 19.0, 24.0, ensure_on=True, hvac_mode="heat_cool"
        )
        context_id = manager._expected["climate.room"][0]["context_id"]
        old = SimpleNamespace(state="off", attributes={}, context=None)
        final_low = SimpleNamespace(
            state="heat_cool",
            attributes={"target_temp_low": 19.0},
            context=SimpleNamespace(id=context_id),
        )
        self.assertEqual(
            {"hvac_mode", "target_temp_low"},
            manager.owned_state_change_fields("climate.room", final_low, old),
        )

        reappeared_low = SimpleNamespace(
            state="heat_cool",
            attributes={"target_temp_low": 18.0},
            context=SimpleNamespace(id=context_id),
        )
        missing_low = SimpleNamespace(
            state="heat_cool",
            attributes={},
            context=SimpleNamespace(id=context_id),
        )
        self.assertEqual(
            set(),
            manager.owned_state_change_fields(
                "climate.room", reappeared_low, missing_low
            ),
        )
        self.assertEqual(
            {"target_temp_high": 24.0},
            manager._expected["climate.room"][0]["expected"],
        )

    async def test_target_only_and_on_to_on_do_not_allow_structural_transition(
        self,
    ) -> None:
        manager = self._manager()
        state = manager._hass.states["climate.room"]
        state.state = "heat"
        state.attributes.pop("temperature", None)
        await manager.async_set_temperature("climate.room", 21.0)
        context_id = manager._expected["climate.room"][0]["context_id"]
        old = SimpleNamespace(state="heat", attributes={}, context=None)
        divergent = SimpleNamespace(
            state="heat",
            attributes={"temperature": 20.0},
            context=SimpleNamespace(id=context_id),
        )
        self.assertEqual(
            set(),
            manager.owned_state_change_fields("climate.room", divergent, old),
        )

    async def test_coalesced_divergent_target_remains_external(self) -> None:
        manager = self._manager()
        manager._hass.states["climate.room"].state = "off"
        await manager.async_set_temperature(
            "climate.room", 21.0, ensure_on=True, hvac_mode="heat"
        )
        context_id = manager._expected["climate.room"][0]["context_id"]
        old = SimpleNamespace(
            state="off", attributes={"temperature": 20.0}, context=None
        )
        new = SimpleNamespace(
            state="heat",
            attributes={"temperature": 22.0},
            context=SimpleNamespace(id=context_id),
        )

        self.assertEqual(
            {"hvac_mode"},
            manager.owned_state_change_fields("climate.room", new, old),
        )
        self.assertEqual(
            {"temperature": 21.0},
            manager._expected["climate.room"][0]["expected"],
        )

    async def test_scalar_and_range_shape_transitions_are_fully_owned(self) -> None:
        manager = self._manager()
        state = manager._hass.states["climate.room"]
        state.state = "heat"
        state.attributes.update({
            "supported_features": 3,
            "hvac_modes": ["off", "heat", "cool", "heat_cool"],
            "temperature": 21.0,
        })
        await manager.async_set_temperature_range(
            "climate.room", 19.0, 24.0, hvac_mode="heat_cool"
        )
        old = SimpleNamespace(
            state="heat", attributes={"temperature": 21.0}, context=None
        )
        new = SimpleNamespace(
            state="heat_cool",
            attributes={"target_temp_low": 19.0, "target_temp_high": 24.0},
            context=None,
        )
        self.assertEqual(
            {"hvac_mode", "temperature", "target_temp_low", "target_temp_high"},
            manager.owned_state_change_fields("climate.room", new, old),
        )

        state.state = "heat_cool"
        state.attributes.pop("temperature", None)
        state.attributes.update({"target_temp_low": 19.0, "target_temp_high": 24.0})
        await manager.async_set_temperature(
            "climate.room", 22.0, hvac_mode="heat"
        )
        back = SimpleNamespace(
            state="heat", attributes={"temperature": 22.0}, context=None
        )
        self.assertEqual(
            {"hvac_mode", "temperature", "target_temp_low", "target_temp_high"},
            manager.owned_state_change_fields("climate.room", back, new),
        )

    async def test_failed_first_logical_stage_cleans_shared_expectation(self) -> None:
        manager = self._manager()
        manager._hass.states["climate.room"].state = "off"
        recorder = _LogicalActionRecorder(manager, fail_service="set_hvac_mode")
        manager._hass.services = recorder

        with self.assertRaisesRegex(RuntimeError, "service failed"):
            await manager.async_set_temperature(
                "climate.room", 21.0, ensure_on=True, hvac_mode="heat"
            )

        self.assertEqual(["set_hvac_mode"], [call[0] for call in recorder.calls])
        self.assertEqual({}, manager._contexts)
        self.assertEqual({}, manager._expected)

    async def test_failed_target_retains_only_accepted_mode_ownership(self) -> None:
        manager = self._manager()
        manager._hass.states["climate.room"].state = "off"
        recorder = _LogicalActionRecorder(manager, fail_service="set_temperature")
        manager._hass.services = recorder

        with self.assertRaisesRegex(RuntimeError, "service failed"):
            await manager.async_set_temperature(
                "climate.room", 21.0, ensure_on=True, hvac_mode="heat"
            )

        self.assertEqual(
            ["set_hvac_mode", "set_temperature"],
            [call[0] for call in recorder.calls],
        )
        self.assertIs(recorder.calls[0][2], recorder.calls[1][2])
        context_id = recorder.calls[0][2].id
        self.assertIn(context_id, manager._contexts)
        self.assertEqual(
            {"hvac_mode": "heat"},
            manager._expected["climate.room"][0]["expected"],
        )
        self.assertNotIn(
            "structural_transition", manager._expected["climate.room"][0]
        )

        old = SimpleNamespace(
            state="off", attributes={"temperature": 20.0}, context=None
        )
        late_echo = SimpleNamespace(
            state="heat",
            attributes={"temperature": 22.0},
            context=SimpleNamespace(id=context_id),
        )
        self.assertEqual(
            {"hvac_mode"},
            manager.owned_state_change_fields("climate.room", late_echo, old),
        )
        self.assertEqual({}, manager._contexts)
        self.assertEqual({}, manager._expected)

    async def test_temperature_matching_uses_native_step_tolerance(self) -> None:
        manager = self._manager()
        await manager.async_set_temperature("climate.room", 21.0)
        old = SimpleNamespace(state="cool", attributes={"temperature": 20.0}, context=None)
        new = SimpleNamespace(state="cool", attributes={"temperature": 21.2}, context=None)
        self.assertTrue(manager.owns_state_change("climate.room", new, old))

    async def test_coalesced_mode_and_target_consumes_all_matching_candidates(self) -> None:
        manager = self._manager()
        await manager.async_set_hvac_mode("climate.room", "heat")
        await manager.async_set_temperature("climate.room", 21.0)
        old = SimpleNamespace(state="off", attributes={"temperature": 20.0}, context=None)
        new = SimpleNamespace(state="heat", attributes={"temperature": 21.0}, context=None)
        self.assertTrue(manager.owns_state_change("climate.room", new, old))
        self.assertEqual([], manager._expected.get("climate.room", []))

    async def test_unrelated_change_does_not_consume_temperature_candidate(self) -> None:
        manager = self._manager()
        await manager.async_set_temperature("climate.room", 21.0)
        old = SimpleNamespace(state="off", attributes={"temperature": 21.0}, context=None)
        new = SimpleNamespace(state="heat", attributes={"temperature": 21.0}, context=None)
        self.assertFalse(manager.owns_state_change("climate.room", new, old))
        self.assertEqual(1, len(manager._expected["climate.room"]))

    async def test_known_context_with_divergent_control_state_is_external(self) -> None:
        manager = self._manager()
        await manager.async_set_hvac_mode("climate.room", "cool")
        context_id = manager._expected["climate.room"][0]["context_id"]
        old = SimpleNamespace(
            state="off", attributes={"temperature": 24.0}, context=None
        )
        new = SimpleNamespace(
            state="heat",
            attributes={"temperature": 24.0},
            context=SimpleNamespace(id=context_id),
        )
        self.assertEqual(
            set(), manager.owned_state_change_fields("climate.room", new, old)
        )

    async def test_coalesced_external_mode_keeps_expected_temperature_owned(self) -> None:
        manager = self._manager()
        await manager.async_set_temperature("climate.room", 21.0)
        old = SimpleNamespace(
            state="off", attributes={"temperature": 20.0}, context=None
        )
        new = SimpleNamespace(
            state="heat", attributes={"temperature": 21.0}, context=None
        )
        self.assertEqual(
            {"temperature"},
            manager.owned_state_change_fields("climate.room", new, old),
        )
        self.assertEqual([], manager._expected.get("climate.room", []))

    async def test_context_correlation_is_still_field_scoped(self) -> None:
        manager = self._manager()
        await manager.async_set_temperature("climate.room", 21.0)
        context_id = manager._expected["climate.room"][0]["context_id"]
        old = SimpleNamespace(
            state="off", attributes={"temperature": 20.0}, context=None
        )
        new = SimpleNamespace(
            state="heat",
            attributes={"temperature": 21.0},
            context=SimpleNamespace(id=context_id),
        )
        self.assertEqual(
            {"temperature"},
            manager.owned_state_change_fields("climate.room", new, old),
        )

    async def test_expectation_ledger_is_bounded_per_entity(self) -> None:
        manager = self._manager()
        first_context = None
        for index in range(33):
            await manager.async_set_temperature(
                "climate.room", 10.0 + (index % 20) * 0.5
            )
            if first_context is None:
                first_context = manager._expected["climate.room"][0]["context_id"]
        self.assertEqual(32, len(manager._expected["climate.room"]))
        self.assertNotIn(first_context, manager._contexts)

    async def test_non_observable_option_call_does_not_register_context(self) -> None:
        manager = self._manager()
        await manager._async_call(
            "set_fan_mode",
            {"entity_id": "climate.room", "fan_mode": "quiet"},
        )
        self.assertEqual({}, manager._contexts)
        self.assertEqual({}, manager._expected)

    async def test_owned_context_registry_is_globally_bounded(self) -> None:
        manager = self._manager()
        for index in range(257):
            entity_id = f"climate.room_{index}"
            manager._hass.states[entity_id] = SimpleNamespace(
                state="off",
                attributes={
                    "target_temp_step": 0.5,
                    "min_temp": 5,
                    "max_temp": 35,
                    "supported_features": 1,
                    "hvac_modes": ["off", "heat"],
                },
            )
            await manager.async_set_temperature(
                entity_id, 20.0, ensure_on=True, hvac_mode="heat"
            )
        self.assertEqual(256, len(manager._contexts))
        self.assertNotIn("climate.room_0", manager._expected)
        self.assertEqual(
            256,
            sum(len(candidates) for candidates in manager._expected.values()),
        )
        self.assertIn(
            "structural_transition",
            manager._expected["climate.room_256"][0],
        )

    def test_heat_cool_snapshot_excludes_stale_scalar_target(self) -> None:
        manager = self._manager()
        state = SimpleNamespace(
            state="heat_cool",
            attributes={
                "temperature": 21.0,
                "target_temp_low": 19.0,
                "target_temp_high": 24.0,
                "supported_features": 3,
                "min_temp": 5,
                "max_temp": 35,
            },
        )
        self.assertEqual(
            {
                "hvac_mode": "heat_cool",
                "target_temp_low": 19.0,
                "target_temp_high": 24.0,
            },
            manager.climate_state_snapshot_from_state("climate.room", state),
        )


class ClimateManagerHvacFallbackTest(unittest.IsolatedAsyncioTestCase):
    """Verify the public HVAC fallback contract against service calls."""

    def _manager(
        self,
        state_value: str,
        supported_modes: list[str] | None,
        *,
        extra_attributes: dict | None = None,
    ) -> tuple[ClimateManager, _ServiceRecorder]:
        attributes = {
            "unit_of_measurement": UnitOfTemperature.CELSIUS,
            "min_temp": 5,
            "max_temp": 35,
        }
        if supported_modes is not None:
            attributes["hvac_modes"] = supported_modes
        if extra_attributes is not None:
            attributes.update(extra_attributes)
        state = SimpleNamespace(state=state_value, attributes=attributes)
        services = _ServiceRecorder()
        hass = SimpleNamespace(
            states=SimpleNamespace(get=lambda _entity_id: state),
            services=services,
            config=SimpleNamespace(
                units=SimpleNamespace(
                    temperature_unit=UnitOfTemperature.CELSIUS
                )
            ),
        )
        return ClimateManager(hass), services

    async def test_omitted_mode_preserves_an_already_running_mode(self) -> None:
        manager, services = self._manager("cool", ["off", "heat", "cool"])

        await manager.async_set_temperature(
            "climate.room",
            24,
            ensure_on=True,
        )

        self.assertEqual(
            [call[1] for call in services.calls],
            ["set_temperature"],
        )

    async def test_omitted_mode_uses_first_supported_non_off_mode_when_off(
        self,
    ) -> None:
        manager, services = self._manager("off", ["off", "cool", "heat"])

        await manager.async_set_temperature(
            "climate.room",
            24,
            ensure_on=True,
        )

        self.assertEqual(
            [call[1] for call in services.calls],
            ["set_hvac_mode", "set_temperature"],
        )
        self.assertEqual(services.calls[0][2]["hvac_mode"], "cool")

    async def test_explicit_mode_wins_over_current_mode(self) -> None:
        manager, services = self._manager("heat", ["off", "heat", "cool"])

        await manager.async_set_temperature(
            "climate.room",
            24,
            ensure_on=True,
            hvac_mode="cool",
        )

        self.assertEqual(
            [call[1] for call in services.calls],
            ["set_hvac_mode", "set_temperature"],
        )
        self.assertEqual(services.calls[0][2]["hvac_mode"], "cool")

    async def test_missing_supported_modes_falls_back_to_turn_on(self) -> None:
        manager, services = self._manager("off", None)

        await manager.async_set_temperature(
            "climate.room",
            24,
            ensure_on=True,
        )

        self.assertEqual(
            [call[1] for call in services.calls],
            ["turn_on", "set_temperature"],
        )

    async def test_explicit_heat_cool_rejects_a_range_only_climate(self) -> None:
        manager, services = self._manager(
            "heat_cool",
            ["off", "heat", "cool", "heat_cool"],
            extra_attributes={
                "temperature": None,
                "target_temp_low": 20,
                "target_temp_high": 24,
            },
        )

        with self.assertRaisesRegex(
            ValueError,
            "requires separate target_temp_low and target_temp_high values",
        ):
            await manager.async_set_temperature(
                "climate.room",
                22,
                ensure_on=True,
                hvac_mode="heat_cool",
            )

        self.assertEqual(services.calls, [])

    async def test_combined_capabilities_reject_single_heat_cool_target(self) -> None:
        manager, services = self._manager(
            "heat",
            ["off", "heat", "cool", "heat_cool"],
            extra_attributes={
                "temperature": 21,
                "supported_features": 3,
            },
        )

        with self.assertRaisesRegex(ValueError, "requires separate target_temp_low"):
            await manager.async_set_temperature(
                "climate.room",
                22,
                ensure_on=True,
                hvac_mode="heat_cool",
            )

        self.assertEqual(services.calls, [])

    async def test_omitted_mode_rejects_current_range_only_heat_cool(self) -> None:
        manager, services = self._manager(
            "heat_cool",
            ["off", "heat", "cool", "heat_cool"],
            extra_attributes={"target_temp_low": 20, "target_temp_high": 24},
        )

        with self.assertRaisesRegex(ValueError, "in heat_cool mode"):
            await manager.async_set_temperature(
                "climate.room",
                22,
                ensure_on=True,
            )

        self.assertEqual(services.calls, [])

    def test_stored_keep_scalar_ignores_transient_heat_cool_mode(self) -> None:
        manager, _services = self._manager(
            "heat_cool",
            ["off", "heat", "cool", "heat_cool"],
            extra_attributes={"supported_features": 3},
        )

        manager.validate_configured_temperature_target(
            "climate.room",
            range_target=False,
            hvac_mode=None,
        )

    def test_stored_target_shape_rejects_explicit_incompatible_modes(self) -> None:
        manager, _services = self._manager(
            "heat",
            ["off", "heat", "cool", "heat_cool"],
            extra_attributes={"supported_features": 3},
        )

        with self.assertRaisesRegex(ValueError, "single temperature target"):
            manager.validate_configured_temperature_target(
                "climate.room",
                range_target=False,
                hvac_mode="heat_cool",
            )
        with self.assertRaisesRegex(ValueError, "range target"):
            manager.validate_configured_temperature_target(
                "climate.room",
                range_target=True,
                hvac_mode="cool",
            )

    def test_stored_keep_range_requires_a_heat_cool_mode(self) -> None:
        manager, _services = self._manager(
            "heat",
            ["off", "heat", "cool"],
            extra_attributes={"supported_features": 3},
        )

        with self.assertRaisesRegex(ValueError, "range target"):
            manager.validate_configured_temperature_target(
                "climate.room",
                range_target=True,
                hvac_mode=None,
            )

    async def test_single_target_heat_cool_keeps_temperature_payload(self) -> None:
        manager, services = self._manager(
            "heat_cool",
            ["off", "heat_cool"],
            extra_attributes={"temperature": 22},
        )

        await manager.async_set_temperature(
            "climate.room",
            23,
            ensure_on=True,
        )

        self.assertEqual(
            services.calls,
            [
                (
                    "climate",
                    "set_temperature",
                    {"entity_id": "climate.room", "temperature": 23},
                    True,
                )
            ],
        )

    async def test_explicit_heat_scalar_starts_off_dynamic_feature_climate_first(self) -> None:
        manager, services = self._manager(
            "off",
            ["off", "heat", "cool", "heat_cool"],
            extra_attributes={"supported_features": 392},
        )

        await manager.async_set_temperature(
            "climate.room",
            20,
            ensure_on=True,
            hvac_mode="heat",
        )

        self.assertEqual(
            [call[1] for call in services.calls],
            ["set_hvac_mode", "set_temperature"],
        )
        self.assertEqual(services.calls[0][2]["hvac_mode"], "heat")

    async def test_keep_scalar_off_chooses_compatible_mode_before_temperature(self) -> None:
        manager, services = self._manager(
            "off",
            ["off", "heat_cool", "heat", "cool"],
            extra_attributes={"supported_features": 392},
        )

        await manager.async_set_temperature("climate.room", 20, ensure_on=True)

        self.assertEqual(
            [call[1] for call in services.calls],
            ["set_hvac_mode", "set_temperature"],
        )
        self.assertEqual(services.calls[0][2]["hvac_mode"], "heat")

    async def test_scalar_without_ensure_on_still_requires_current_feature(self) -> None:
        manager, services = self._manager(
            "off",
            ["off", "heat", "cool"],
            extra_attributes={"supported_features": 392},
        )

        with self.assertRaisesRegex(ValueError, "single temperature target"):
            await manager.async_set_temperature(
                "climate.room",
                20,
                ensure_on=False,
            )

        self.assertEqual(services.calls, [])

    async def test_keep_range_off_chooses_heat_cool_before_range(self) -> None:
        manager, services = self._manager(
            "off",
            ["off", "heat", "heat_cool"],
            extra_attributes={"supported_features": 394},
        )

        await manager.async_set_temperature_range(
            "climate.room",
            20,
            24,
            ensure_on=True,
        )

        self.assertEqual(
            [call[1] for call in services.calls],
            ["set_hvac_mode", "set_temperature"],
        )
        self.assertEqual(services.calls[0][2]["hvac_mode"], "heat_cool")

    async def test_range_target_uses_exact_home_assistant_payload(self) -> None:
        manager, services = self._manager(
            "heat_cool",
            ["off", "heat", "cool", "heat_cool"],
            extra_attributes={
                "supported_features": 2,
                "target_temp_low": 20,
                "target_temp_high": 24,
            },
        )

        await manager.async_set_temperature_range(
            "climate.room", 19.6, 24.4, ensure_on=True
        )

        self.assertEqual(
            services.calls,
            [
                (
                    "climate",
                    "set_temperature",
                    {
                        "entity_id": "climate.room",
                        "target_temp_low": 19.6,
                        "target_temp_high": 24.4,
                    },
                    True,
                )
            ],
        )

    async def test_off_range_target_prefers_heat_cool_fallback(self) -> None:
        manager, services = self._manager(
            "off",
            ["off", "cool", "heat_cool", "heat"],
            extra_attributes={"supported_features": 2},
        )

        await manager.async_set_temperature_range(
            "climate.room", 20, 24, ensure_on=True
        )

        self.assertEqual([call[1] for call in services.calls], ["set_hvac_mode", "set_temperature"])
        self.assertEqual(services.calls[0][2]["hvac_mode"], "heat_cool")

    async def test_range_target_rejects_inverted_bounds_before_service_call(self) -> None:
        manager, services = self._manager(
            "heat_cool", ["off", "heat_cool"], extra_attributes={"supported_features": 2}
        )

        with self.assertRaisesRegex(ValueError, "target_temp_low"):
            await manager.async_set_temperature_range("climate.room", 25, 20)

        self.assertEqual(services.calls, [])

    async def test_declared_single_feature_rejects_range_even_with_range_attributes(self) -> None:
        manager, services = self._manager(
            "heat_cool",
            ["off", "heat_cool"],
            extra_attributes={
                "supported_features": 1,
                "target_temp_low": 20,
                "target_temp_high": 24,
            },
        )

        with self.assertRaisesRegex(ValueError, "does not support a temperature range"):
            await manager.async_set_temperature_range("climate.room", 20, 24)

        self.assertEqual(services.calls, [])

    async def test_declared_range_feature_rejects_scalar_even_with_temperature_attribute(self) -> None:
        manager, services = self._manager(
            "heat",
            ["off", "heat", "heat_cool"],
            extra_attributes={"supported_features": 2, "temperature": 21},
        )

        with self.assertRaisesRegex(ValueError, "does not support a single temperature"):
            await manager.async_set_temperature("climate.room", 21)

        self.assertEqual(services.calls, [])

    async def test_native_range_rejects_auto_even_when_entity_advertises_it(self) -> None:
        manager, services = self._manager(
            "auto",
            ["off", "auto", "heat_cool"],
            extra_attributes={
                "supported_features": 3,
                "target_temp_low": 20,
                "target_temp_high": 24,
            },
        )

        with self.assertRaisesRegex(ValueError, "while in auto mode"):
            await manager.async_set_temperature_range(
                "climate.room", 20, 24, hvac_mode="auto"
            )

        self.assertEqual(services.calls, [])

    async def test_dual_feature_heat_cool_requires_native_range(self) -> None:
        manager, services = self._manager(
            "heat_cool",
            ["off", "heat", "cool", "heat_cool"],
            extra_attributes={
                "supported_features": 3,
                "temperature": 22,
                "target_temp_low": 20,
                "target_temp_high": 24,
            },
        )

        with self.assertRaisesRegex(ValueError, "requires separate target_temp_low"):
            await manager.async_set_temperature("climate.room", 22)

        self.assertEqual(services.calls, [])

    async def test_range_rejects_unadvertised_heat_cool_mode_before_service_call(self) -> None:
        manager, services = self._manager(
            "heat",
            ["off", "heat"],
            extra_attributes={"supported_features": 2},
        )

        with self.assertRaisesRegex(ValueError, "does not support HVAC mode heat_cool"):
            await manager.async_set_temperature_range(
                "climate.room", 20, 24, hvac_mode="heat_cool"
            )

        self.assertEqual(services.calls, [])

    async def test_range_snapshot_is_restored_without_scalar_temperature(self) -> None:
        manager, services = self._manager(
            "heat_cool",
            ["off", "heat_cool"],
            extra_attributes={
                "supported_features": 2,
                "target_temp_low": 20,
                "target_temp_high": 24,
            },
        )
        snapshot = manager.climate_state_snapshot("climate.room")

        self.assertNotIn("temperature", snapshot)
        self.assertEqual(snapshot["target_temp_low"], 20)
        self.assertEqual(snapshot["target_temp_high"], 24)

        await manager.async_restore_state("climate.room", snapshot)
        self.assertEqual(services.calls[-1][2], {
            "entity_id": "climate.room",
            "target_temp_low": 20,
            "target_temp_high": 24,
        })

    def test_heat_cool_snapshot_prefers_range_when_entity_exposes_both_targets(self) -> None:
        manager, _services = self._manager(
            "heat_cool",
            ["off", "heat", "cool", "heat_cool"],
            extra_attributes={
                "supported_features": 3,
                "temperature": 22,
                "target_temp_low": 20,
                "target_temp_high": 24,
            },
        )

        snapshot = manager.climate_state_snapshot("climate.room")

        self.assertNotIn("temperature", snapshot)
        self.assertEqual(snapshot["target_temp_low"], 20)
        self.assertEqual(snapshot["target_temp_high"], 24)

    def test_snapshot_ignores_stale_range_attributes_without_range_feature(self) -> None:
        manager, _services = self._manager(
            "heat_cool",
            ["off", "heat", "cool", "heat_cool"],
            extra_attributes={
                "supported_features": 1,
                "temperature": 22,
                "target_temp_low": 20,
                "target_temp_high": 24,
            },
        )

        snapshot = manager.climate_state_snapshot("climate.room")

        self.assertEqual(snapshot["temperature"], 22)
        self.assertNotIn("target_temp_low", snapshot)
        self.assertNotIn("target_temp_high", snapshot)

    async def test_off_range_only_climate_fails_before_heat_cool_fallback(self) -> None:
        manager, services = self._manager(
            "off",
            ["off", "heat_cool"],
            extra_attributes={"target_temp_low": 20, "target_temp_high": 24},
        )

        with self.assertRaisesRegex(ValueError, "in heat_cool mode"):
            await manager.async_set_temperature(
                "climate.room",
                22,
                ensure_on=True,
            )

        self.assertEqual(services.calls, [])

    async def test_off_combined_capability_climate_uses_single_target_fallback(self) -> None:
        manager, services = self._manager(
            "off",
            ["off", "heat_cool", "heat", "cool"],
            extra_attributes={"supported_features": 3},
        )

        await manager.async_set_temperature(
            "climate.room",
            22,
            ensure_on=True,
        )

        self.assertEqual(
            [call[1] for call in services.calls],
            ["set_hvac_mode", "set_temperature"],
        )
        self.assertEqual(services.calls[0][2]["hvac_mode"], "heat")


class ClimateManagerTemperatureLimitsTest(unittest.TestCase):
    """Verify fallback limits use the climate's effective unit."""

    def test_fahrenheit_fallback_limits_accept_normal_fahrenheit_targets(self) -> None:
        state = SimpleNamespace(
            attributes={"unit_of_measurement": UnitOfTemperature.FAHRENHEIT}
        )
        hass = SimpleNamespace(
            states=SimpleNamespace(get=lambda _entity_id: state),
            config=SimpleNamespace(
                units=SimpleNamespace(temperature_unit=UnitOfTemperature.FAHRENHEIT)
            ),
        )

        minimum, maximum = ClimateManager(hass).temperature_limits("climate.room")

        self.assertEqual((minimum, maximum), (41, 95))
        self.assertLessEqual(minimum, 70)
        self.assertGreaterEqual(maximum, 70)

    def test_invalid_declared_limits_fall_back_in_effective_unit(self) -> None:
        state = SimpleNamespace(
            attributes={
                "unit_of_measurement": UnitOfTemperature.FAHRENHEIT,
                "min_temp": 90,
                "max_temp": 40,
            }
        )
        hass = SimpleNamespace(
            states=SimpleNamespace(get=lambda _entity_id: state),
            config=SimpleNamespace(units=SimpleNamespace(temperature_unit="unsupported")),
        )

        self.assertEqual(
            ClimateManager(hass).temperature_limits("climate.room"),
            (41, 95),
        )

    def test_snapshot_excludes_non_finite_or_out_of_range_target(self) -> None:
        state = SimpleNamespace(
            state="heat",
            attributes={
                "unit_of_measurement": UnitOfTemperature.FAHRENHEIT,
                "min_temp": 41,
                "max_temp": 86,
                "temperature": 145,
            },
        )
        hass = SimpleNamespace(
            states=SimpleNamespace(get=lambda _entity_id: state),
            config=SimpleNamespace(
                units=SimpleNamespace(temperature_unit=UnitOfTemperature.FAHRENHEIT)
            ),
        )
        manager = ClimateManager(hass)

        self.assertEqual(
            manager.climate_state_snapshot("climate.room"),
            {"hvac_mode": "heat"},
        )

        state.attributes["temperature"] = float("nan")
        self.assertEqual(
            manager.climate_state_snapshot("climate.room"),
            {"hvac_mode": "heat"},
        )

        state.attributes["temperature"] = 70
        self.assertEqual(
            manager.climate_state_snapshot("climate.room"),
            {"hvac_mode": "heat", "temperature": 70},
        )

        state.attributes["humidity"] = float("inf")
        self.assertNotIn(
            "humidity",
            manager.climate_state_snapshot("climate.room"),
        )

    def test_missing_or_invalid_step_is_not_invented(self) -> None:
        state = SimpleNamespace(
            attributes={"unit_of_measurement": UnitOfTemperature.FAHRENHEIT}
        )
        hass = SimpleNamespace(
            states=SimpleNamespace(get=lambda _entity_id: state),
            config=SimpleNamespace(
                units=SimpleNamespace(temperature_unit=UnitOfTemperature.FAHRENHEIT)
            ),
        )
        manager = ClimateManager(hass)

        self.assertIsNone(manager.temperature_step("climate.room"))

        state.attributes["target_temp_step"] = float("nan")
        self.assertIsNone(manager.temperature_step("climate.room"))

        state.attributes.update({"min_temp": float("inf"), "max_temp": float("nan")})
        self.assertEqual(manager.temperature_limits("climate.room"), (41, 95))

    def test_fahrenheit_targets_snap_to_zero_anchored_grid(self) -> None:
        state = SimpleNamespace(
            attributes={
                "unit_of_measurement": UnitOfTemperature.FAHRENHEIT,
                "min_temp": 41.3,
                "max_temp": 95,
            }
        )
        hass = SimpleNamespace(
            states=SimpleNamespace(get=lambda _entity_id: state),
            config=SimpleNamespace(
                units=SimpleNamespace(temperature_unit=UnitOfTemperature.FAHRENHEIT)
            ),
        )
        manager = ClimateManager(hass)

        self.assertEqual(manager.normalize_target_temperature("climate.room", 42), 42)

    def test_configured_fahrenheit_ignores_stale_celsius_entity_grid(self) -> None:
        state = SimpleNamespace(
            attributes={
                "unit_of_measurement": UnitOfTemperature.CELSIUS,
                "min_temp": 5,
                "max_temp": 35,
                "target_temp_step": 0.5,
            }
        )
        hass = SimpleNamespace(
            states=SimpleNamespace(get=lambda _entity_id: state),
            config=SimpleNamespace(
                units=SimpleNamespace(temperature_unit=UnitOfTemperature.FAHRENHEIT)
            ),
        )
        manager = ClimateManager(hass)

        self.assertEqual(manager.temperature_unit("climate.room"), UnitOfTemperature.FAHRENHEIT)
        self.assertEqual(manager.temperature_limits("climate.room"), (41, 95))
        self.assertEqual(manager.temperature_step("climate.room"), 0.5)
        self.assertEqual(manager.normalize_target_temperature("climate.room", 70), 70)

        state.attributes["target_temp_step"] = 0.2
        self.assertEqual(manager.temperature_step("climate.room"), 0.2)
        self.assertEqual(manager.normalize_target_temperature("climate.room", 70.1), 70.2)


if __name__ == "__main__":
    unittest.main()
