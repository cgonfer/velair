"""Demand estimation, Room Assist ownership and event/timer delivery regressions."""
from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from .helpers import FakeHass, NOW
from custom_components.velair import shared_demand as module
from custom_components.velair.shared_demand import SharedDemandController, normalize_groups


def group(**changes):
    return dict(id="boiler", name="Boiler", enabled=True, switch_entity_id="switch.boiler",
                direction="heat", hysteresis=0.3, minimum_off_seconds=0, off_delay_seconds=0,
                zones={"climate.room": {}}, suspended=False, **changes)


def state(mode="heat", temperature=20, target=21, **attributes):
    return SimpleNamespace(state=mode, attributes={"current_temperature": temperature,
        "temperature": target, **attributes}, last_changed=NOW - timedelta(hours=1),
        context=SimpleNamespace(id="external", parent_id=None))


class SharedDemandValidationTests(unittest.TestCase):
    def test_timing_requires_whole_seconds_and_accepts_integral_floats(self):
        for field in ("minimum_off_seconds", "on_delay_seconds", "off_delay_seconds"):
            for value in (0.1, 1.5, 86399.9):
                with self.subTest(field=field, value=value):
                    raw = group()
                    raw[field] = value
                    with self.assertRaisesRegex(ValueError, field + " must be a whole number"):
                        normalize_groups([raw], ["climate.room"])
                    self.assertEqual(raw[field], value)
            for value in (0, 1.0, 86400):
                with self.subTest(field=field, value=value):
                    raw = group()
                    raw[field] = value
                    self.assertEqual(normalize_groups([raw], ["climate.room"])[0][field], value)

    def test_defaults_and_override_inheritance(self):
        raw = group()
        del raw["enabled"]
        raw["zones"]["climate.room"]["hysteresis"] = 0.6
        normalized = normalize_groups([raw], ["climate.room"])
        self.assertFalse(normalized[0]["enabled"])
        self.assertEqual(normalized[0]["on_delay_seconds"], 0)
        self.assertEqual(normalized[0]["zones"]["climate.room"], {"hysteresis": 0.6})
        normalized[0]["zones"]["climate.room"]["hysteresis"] = 1
        self.assertEqual(raw["zones"]["climate.room"]["hysteresis"], 0.6)

    def test_rejects_unsafe_replacements(self):
        invalid = []
        for key, values in {
            "enabled": [1, "true"], "suspended": [1], "direction": ["auto", "off"],
            "hysteresis": [True, float("nan"), float("inf"), -1, "0.3"],
            "minimum_off_seconds": [-1, float("nan")],
            "on_delay_seconds": [True, -1, float("nan"), float("inf"), 86401, "30"],
            "suspension_reason": ["manual", True, None],
            "switch_entity_id": ["climate.room", "switch.bad name", None],
            "zones": [{}, {"climate.unmanaged": {}}, {"climate.room": {"extra": 1}}],
        }.items():
            for value in values:
                item = group(); item[key] = value; invalid.append([item])
        invalid += [[group(), group()], "bad", None]
        for value in invalid:
            with self.subTest(value=value), self.assertRaises(ValueError):
                normalize_groups(value, ["climate.room"])


class SharedDemandRuntimeTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.hass = FakeHass()
        self.hass.config = SimpleNamespace(units=SimpleNamespace(temperature_unit="°C"))
        self.hass.states["climate.room"] = state()
        self.hass.states["switch.boiler"] = state("off")
        self.data = {"zones": {"climate.room": {"enabled": True}},
                     "settings": {"shared_demand_groups": [group()]}}
        self.save = AsyncMock()
        self.assist = {"active": False}
        self.scheduler = SimpleNamespace(_data=self.data,
            get_shared_demand_room_assist=lambda _id: self.assist)
        self.controller = SharedDemandController(self.hass, self.data, self.save, self.scheduler)
        self.calls = []
        async def service(domain, action, data, **kwargs):
            self.calls.append((domain, action, data, kwargs))
        self.hass.services.async_call = service
        self.patches = [
            patch.object(module.core, "Context", lambda: SimpleNamespace(id=uuid4().hex), create=True),
            patch.object(module.dt_util, "now", return_value=NOW),
            patch.object(module, "async_track_point_in_time", return_value=lambda: None),
            patch.object(module, "async_track_state_change_event", return_value=lambda: None),
        ]
        for item in self.patches: item.start()

    async def asyncTearDown(self):
        await self.controller.async_stop()
        for item in reversed(self.patches): item.stop()

    async def flush(self):
        for _ in range(15):
            task = self.controller._task
            if task is None: return
            await task
        self.fail("Worker failed to settle")

    async def start(self):
        await self.controller.async_start(); await self.flush()

    def demand(self, **changes):
        raw = self.data["settings"]["shared_demand_groups"][0]
        raw.update(changes)
        return self.controller._zone_demand(raw, "climate.room", raw["zones"]["climate.room"])

    async def test_heat_hysteresis_retains_until_target_and_resets_target(self):
        self.hass.states["climate.room"] = state(temperature=20.8)
        self.assertFalse(self.demand()["demand"])
        self.hass.states["climate.room"] = state(temperature=20.7)
        self.assertTrue(self.demand()["demand"])
        self.hass.states["climate.room"] = state(temperature=20.9)
        self.assertTrue(self.demand()["demand"])
        self.hass.states["climate.room"] = state(temperature=21)
        self.assertFalse(self.demand()["demand"])
        self.hass.states["climate.room"] = state(temperature=20)
        self.assertTrue(self.demand()["demand"])
        self.hass.states["climate.room"] = state(temperature=20, target=20.1)
        self.assertFalse(self.demand()["demand"])

    async def test_cool_hysteresis_and_zero_hysteresis_stable_at_target(self):
        for temperature, expected in [(24.1, False), (24.3, True), (24.1, True), (24, False)]:
            self.hass.states["climate.room"] = state("cool", temperature, 24)
            self.assertEqual(self.demand(direction="cool")["demand"], expected)
        self.hass.states["climate.room"] = state("cool", 24, 24)
        for _ in range(3): self.assertFalse(self.demand(hysteresis=0)["demand"])

    async def test_group_default_and_individual_override(self):
        self.hass.states["climate.room"] = state(temperature=20.5)
        self.assertTrue(self.demand()["demand"])
        self.data["settings"]["shared_demand_groups"][0]["zones"]["climate.room"] = {"hysteresis": 0.6}
        self.assertFalse(self.demand()["demand"])

    async def test_room_assist_committed_phase_overrides_compensated_setpoint(self):
        self.hass.states["climate.room"] = state(temperature=18, target=25)
        self.assist = dict(active=True, valid=True, direction="heat", demand=False)
        self.assertEqual(self.demand()["source"], "room_assist")
        self.assertFalse(self.demand()["demand"])
        self.assist["demand"] = True
        self.assertTrue(self.demand()["demand"])
        self.assist["direction"] = "cool"
        self.assertFalse(self.demand()["demand"])
        self.assist["valid"] = False
        self.assertIsNone(self.demand()["demand"])

    async def test_invalid_temperature_or_mode_never_holds_old_demand(self):
        self.assertTrue(self.demand()["demand"])
        for mode, temperature in [("off", 20), ("cool", 20), ("unavailable", 20), ("heat", float("nan")), ("heat", True)]:
            self.hass.states["climate.room"] = state(mode, temperature)
            self.assertIsNot(self.demand()["demand"], True)
        self.hass.states["climate.room"] = state(temperature=20.9)
        self.assertFalse(self.demand()["demand"])

    async def test_auto_requires_ordered_native_range(self):
        self.hass.states["climate.room"] = state("auto", 18, 25)
        self.assertIsNone(self.demand()["demand"])
        self.hass.states["climate.room"] = state("heat_cool", 18, None, target_temp_low=20, target_temp_high=24)
        self.assertTrue(self.demand()["demand"])
        self.assertFalse(self.demand(direction="cool")["demand"])
        self.hass.states["climate.room"].attributes["target_temp_high"] = 19
        self.assertIsNone(self.demand()["demand"])

    async def test_explicit_climate_unit_converts_delta_only(self):
        self.hass.states["climate.room"] = state(temperature=69.5, target=70, temperature_unit="°F")
        result = self.demand()
        self.assertAlmostEqual(result["hysteresis"], 0.54)
        self.assertFalse(result["demand"])

    async def test_burst_coalesces_and_no_duplicate_services_or_writes(self):
        await self.controller.async_start()
        first = self.controller._task
        for _ in range(1000): self.controller.request_refresh()
        self.assertIs(self.controller._task, first)
        await self.flush()
        self.assertEqual(len(self.calls), 1)
        for _ in range(30):
            self.controller.request_refresh(); await self.flush()
        self.assertEqual(len(self.calls), 1)
        self.save.assert_not_awaited()

    async def test_minimum_off_single_timer_and_restart_uses_actual_state(self):
        raw = self.data["settings"]["shared_demand_groups"][0]
        raw["minimum_off_seconds"] = 120
        self.hass.states["switch.boiler"].last_changed = NOW - timedelta(seconds=10)
        await self.start()
        self.assertFalse(self.calls)
        self.assertEqual(len(self.controller._timers), 1)
        for _ in range(30): self.controller.request_refresh()
        await self.flush()
        self.assertEqual(len(self.controller._timers), 1)
        with patch.object(module.dt_util, "now", return_value=NOW + timedelta(seconds=110)):
            self.controller.request_refresh(); await self.flush()
        self.assertEqual(self.calls[0][1], "turn_on")
        self.assertFalse(self.controller._timers)

    async def test_off_delay_cancels_when_demand_returns(self):
        self.data["settings"]["shared_demand_groups"][0]["off_delay_seconds"] = 60
        self.hass.states["switch.boiler"] = state("on")
        self.hass.states["climate.room"] = state(temperature=21)
        await self.start()
        self.assertEqual(self.controller.get_statuses()["boiler"]["status"], "off_delay")
        self.assertFalse(self.calls)
        self.hass.states["climate.room"] = state(temperature=20)
        self.controller.request_refresh(); await self.flush()
        self.assertFalse(self.controller._timers)
        self.assertNotIn("boiler", self.controller._no_demand_since)
        self.hass.states["climate.room"] = state(temperature=21)
        with patch.object(module.dt_util, "now", return_value=NOW + timedelta(seconds=30)):
            self.controller.request_refresh(); await self.flush()
        self.assertEqual(self.controller._timers["boiler"][0], NOW + timedelta(seconds=90))
        with patch.object(module.dt_util, "now", return_value=NOW + timedelta(seconds=90)):
            self.controller.request_refresh(); await self.flush()
        self.assertEqual(self.calls[-1][1], "turn_off")

    async def test_manual_off_suspends_and_save_cannot_bypass_resume(self):
        self.hass.states["switch.boiler"] = state("on")
        await self.start()
        old, new = self.hass.states["switch.boiler"], state("off")
        self.hass.states["switch.boiler"] = new
        self.controller._state_changed(SimpleNamespace(data={"entity_id": "switch.boiler", "old_state": old, "new_state": new}))
        await self.flush()
        self.assertTrue(self.data["settings"]["shared_demand_groups"][0]["suspended"])
        self.assertEqual(self.data["configuration_revision"], 1)
        await self.controller.async_update_groups([group()]); await self.flush()
        self.assertFalse(self.calls)
        self.assertTrue(self.controller.get_statuses()["boiler"]["suspended"])
        await self.controller.async_resume("boiler"); await self.flush()
        self.assertEqual(self.calls[-1][1], "turn_on")

    async def test_owned_off_context_does_not_suspend(self):
        self.hass.states["switch.boiler"] = state("on")
        self.hass.states["climate.room"] = state(temperature=21)
        await self.start()
        context = self.calls[0][3]["context"]
        new = state("off"); new.context = context
        self.hass.states["switch.boiler"] = new
        self.controller._state_changed(SimpleNamespace(data={"entity_id": "switch.boiler", "old_state": state("on"), "new_state": new}))
        await self.flush()
        self.assertFalse(self.controller.get_statuses()["boiler"]["suspended"])
        self.save.assert_not_awaited()

    async def test_save_rollback_has_no_runtime_effect(self):
        await self.start()
        previous = deepcopy(self.data)
        self.save.side_effect = RuntimeError("disk")
        replacement = group(); replacement["enabled"] = False
        with self.assertRaises(RuntimeError): await self.controller.async_update_groups([replacement])
        self.assertEqual(self.data.get("configuration_revision", 0), 0)
        self.assertEqual(self.data["settings"], previous["settings"])
        self.assertTrue(self.controller._groups["boiler"]["enabled"])

    async def test_disabling_owned_output_turns_it_off(self):
        self.hass.states["switch.boiler"] = state("on")
        await self.start()
        replacement = group(); replacement["enabled"] = False
        await self.controller.async_update_groups([replacement]); await self.flush()
        self.assertEqual(self.calls[-1][1], "turn_off")
        self.assertEqual(self.controller.get_statuses()["boiler"]["status"], "disabled")

    async def test_failures_have_bounded_retries_despite_sensor_traffic(self):
        self.hass.services.async_call = AsyncMock(side_effect=RuntimeError("offline"))
        with self.assertLogs(module._LOGGER, level="WARNING"):
            await self.start()
        for _ in range(100): self.controller.request_refresh()
        await self.flush()
        self.assertEqual(self.hass.services.async_call.await_count, 1)
        for seconds in (2, 12):
            with patch.object(module.dt_util, "now", return_value=NOW + timedelta(seconds=seconds)):
                self.controller.request_refresh()
                with self.assertLogs(module._LOGGER, level="WARNING"): await self.flush()
        self.assertEqual(self.hass.services.async_call.await_count, 3)
        with patch.object(module.dt_util, "now", return_value=NOW + timedelta(hours=1)):
            self.controller.request_refresh(); await self.flush()
        self.assertEqual(self.hass.services.async_call.await_count, 3)
        self.assertFalse(self.controller._timers)

    async def test_listener_scope_sources_irrelevant_attributes_and_unload(self):
        self.data["zones"]["climate.room"]["preconditioning"] = {"room_temperature_entity_id": "sensor.external"}
        await self.start()
        self.assertEqual(set(self.controller._entities), {"switch.boiler", "climate.room", "sensor.external"})
        old, new = state(), state(extra=123)
        self.controller._state_changed(SimpleNamespace(data={"entity_id": "climate.room", "old_state": old, "new_state": new}))
        self.assertIsNone(self.controller._task)
        await self.controller.async_stop()
        self.assertFalse(self.controller._timers)
        self.assertFalse(self.controller._entities)
        self.controller.request_refresh()
        self.assertIsNone(self.controller._task)

    async def test_runtime_blocked_velair_switch_never_called(self):
        import sys
        from types import ModuleType
        registry = ModuleType("homeassistant.helpers.entity_registry")
        registry.async_get = lambda _hass: SimpleNamespace(async_get=lambda _id: SimpleNamespace(platform="velair"))
        import homeassistant.helpers as ha_helpers
        with patch.dict(sys.modules, {"homeassistant.helpers.entity_registry": registry}), patch.object(
            ha_helpers, "entity_registry", registry, create=True
        ):
            await self.start()
        self.assertFalse(self.calls)
        self.assertEqual(self.controller.get_statuses()["boiler"]["status"], "invalid_output")

    async def test_sensor_event_evaluates_only_affected_group(self):
        self.hass.states["climate.other"] = state(temperature=18)
        self.hass.states["switch.other"] = state("off")
        self.data["zones"]["climate.other"] = {"enabled": True}
        other = group(); other.update(id="other", switch_entity_id="switch.other", zones={"climate.other": {}})
        self.data["settings"]["shared_demand_groups"].append(other)
        await self.start()
        self.hass.states["climate.room"] = state(temperature=20.1)
        with patch.object(self.controller, "_evaluate", wraps=self.controller._evaluate) as evaluate:
            self.controller._state_changed(SimpleNamespace(data={"entity_id": "climate.room", "old_state": state(), "new_state": self.hass.states["climate.room"]}))
            await self.flush()
        self.assertEqual(evaluate.await_count, 1)
        self.assertEqual(evaluate.call_args.args[0]["id"], "boiler")

    async def test_reading_only_does_not_publish_expensive_frontend_update(self):
        await self.start()
        self.hass.states["climate.room"] = state(temperature=20.1)
        with patch.object(module, "async_dispatcher_send") as publish:
            self.controller._state_changed(SimpleNamespace(data={"entity_id": "climate.room", "old_state": state(), "new_state": self.hass.states["climate.room"]}))
            await self.flush()
            publish.assert_called_once_with(self.hass, module.SIGNAL_SHARED_DEMAND_LIVE_UPDATED)
        self.assertEqual(self.controller.get_statuses()["boiler"]["zones"]["climate.room"]["temperature"], 20.1)

    async def test_room_assist_range_hold_without_direction(self):
        self.assist = dict(active=True, valid=True, direction=None, demand=False)
        self.assertFalse(self.demand()["demand"])
        self.assertEqual(self.demand()["source"], "room_assist")

    async def test_live_reference_preserves_units_and_detached_committed_snapshot(self):
        self.hass.states["climate.room"] = state(temperature=68, target=70, temperature_unit="°F")
        await self.start()
        snapshot = self.controller.get_statuses()
        zone = snapshot["boiler"]["zones"]["climate.room"]
        self.assertEqual((zone["temperature_unit"], zone["sensor_entity_id"]), ("°F", "climate.room"))
        self.assertAlmostEqual(zone["start_temperature"], 69.46)
        phases = deepcopy(self.controller._phases)
        zone["temperature"] = -100
        self.assertEqual(self.controller.get_statuses()["boiler"]["zones"]["climate.room"]["temperature"], 68)
        self.assertEqual(phases, self.controller._phases)

    async def test_live_disabled_and_off_readings_are_observations_without_control(self):
        raw = self.data["settings"]["shared_demand_groups"][0]
        raw["enabled"] = False
        await self.start()
        self.assertEqual(self.controller.get_statuses()["boiler"]["zones"], {})
        before = self.controller.get_live_statuses()["boiler"]["zones"]["climate.room"]
        self.assertEqual((before["temperature"], before["reason"], before["demand"]), (20, "disabled", None))
        self.hass.states["climate.room"] = state(temperature=20.2)
        with patch.object(module, "async_dispatcher_send") as publish:
            self.controller._state_changed(SimpleNamespace(data={"entity_id": "climate.room",
                "old_state": state(), "new_state": self.hass.states["climate.room"]}))
            await self.flush()
            publish.assert_called_once_with(self.hass, module.SIGNAL_SHARED_DEMAND_LIVE_UPDATED)
        self.assertEqual(self.controller.get_live_statuses()["boiler"]["zones"]["climate.room"]["temperature"], 20.2)
        self.assertFalse(self.controller._phases)
        self.assertFalse(self.calls)
        self.save.assert_not_awaited()
        self.assist = dict(active=True, valid=True, direction="heat", demand=True,
                           temperature=19, temperature_unit="°C", sensor_entity_id="sensor.room")
        self.controller.reconfigure(); await self.flush()
        observed = self.controller.get_live_statuses()["boiler"]["zones"]["climate.room"]
        self.assertEqual((observed["source"], observed["temperature"], observed["sensor_entity_id"]),
                         ("room_assist", 19, "sensor.room"))
        self.assertIsNone(observed["demand"])
        self.assist = {"active": False}
        raw["enabled"] = True
        self.hass.states["climate.room"] = state("off", temperature=19.5)
        self.controller.reconfigure(); await self.flush()
        off = self.controller.get_live_statuses()["boiler"]["zones"]["climate.room"]
        self.assertEqual((off["temperature"], off["reason"], off["demand"]), (19.5, "off", False))
        self.assertNotIn("start_temperature", off)

    async def test_live_assist_copies_real_reference_and_direction_boundaries(self):
        self.assist = dict(active=True, valid=True, direction=None, demand=False,
            temperature=21.5, temperature_unit="°C", sensor_entity_id="sensor.room",
            thresholds={"heat": {"target": 20, "start_temperature": 19.7, "stop_temperature": 19.7},
                        "cool": {"target": 24, "start_temperature": 24.3, "stop_temperature": 24.3}})
        result = self.demand()
        self.assertEqual(result["sensor_entity_id"], "sensor.room")
        self.assertEqual(result["temperature"], 21.5)
        self.assertEqual(result["target"], 20)
        self.assertEqual(result["stop_temperature"], 19.7)
        self.assist.update(valid=False)
        self.assertNotIn("temperature", self.demand())

    async def test_malformed_load_disables_and_dangling_zone_is_unknown(self):
        self.data["settings"]["shared_demand_groups"] = [{"id": "broken", "zones": None}]
        with self.assertLogs(module._LOGGER, level="ERROR"):
            await self.start()
        self.assertFalse(self.calls)
        self.assertEqual(self.controller.get_statuses()["_configuration"]["status"], "invalid_configuration")
        self.data["settings"]["shared_demand_groups"] = [group()]
        del self.data["zones"]["climate.room"]
        self.controller.reconfigure(); await self.flush()
        self.assertFalse(self.calls)
        self.assertIsNone(self.controller.get_statuses()["boiler"]["zones"]["climate.room"]["demand"])

    async def test_manual_suspension_storage_failure_stays_suspended_in_memory(self):
        self.hass.states["switch.boiler"] = state("on")
        await self.start()
        self.save.side_effect = RuntimeError("storage")
        new = state("off"); self.hass.states["switch.boiler"] = new
        self.controller._state_changed(SimpleNamespace(data={"entity_id": "switch.boiler", "old_state": state("on"), "new_state": new}))
        with self.assertLogs(module._LOGGER, level="ERROR"): await self.flush()
        self.controller.request_refresh(); await self.flush()
        self.assertTrue(self.controller.get_statuses()["boiler"]["suspended"])
        self.assertFalse(self.calls)
        self.assertFalse(self.data["settings"]["shared_demand_groups"][0]["suspended"])

    async def test_disabled_output_cleanup_retries_and_reports_failure(self):
        self.hass.states["switch.boiler"] = state("on")
        await self.start()
        self.hass.services.async_call = AsyncMock(side_effect=RuntimeError("offline"))
        with self.assertLogs(module._LOGGER, level="WARNING"):
            await self.controller.async_update_groups([]); await self.flush()
        self.assertEqual(self.controller.get_statuses()["cleanup:switch.boiler"]["status"], "delivery_failed")
        self.assertIn("switch.boiler", self.controller._entities)
        self.assertEqual(len(self.controller._timers), 1)
        self.hass.services.async_call.side_effect = None
        with patch.object(module.dt_util, "now", return_value=NOW + timedelta(seconds=2)):
            self.controller._queue(set()); await self.flush()
        self.assertNotIn("switch.boiler", self.controller._retired)
        self.assertFalse(self.controller._timers)

    async def test_unit_migration_blocks_native_demand_and_turns_supply_off(self):
        self.hass.states["switch.boiler"] = state("on")
        self.scheduler.temperature_migration_blocked = True
        await self.start()
        self.assertEqual(self.calls[-1][1], "turn_off")
        self.assertFalse(self.controller.get_statuses()["boiler"]["demand"])
        self.assertEqual(self.controller.get_statuses()["boiler"]["status"], "temperature_migration_blocked")
        self.assertFalse(self.controller._phases)

    async def test_failed_suspension_persistence_recovers_with_bounded_timer(self):
        self.hass.states["switch.boiler"] = state("on")
        await self.start()
        self.save.side_effect = RuntimeError("storage")
        new = state("off"); self.hass.states["switch.boiler"] = new
        self.controller._state_changed(SimpleNamespace(data={"entity_id": "switch.boiler", "old_state": state("on"), "new_state": new}))
        with self.assertLogs(module._LOGGER, level="ERROR"): await self.flush()
        self.assertEqual(self.controller.get_statuses()["boiler"]["status"], "suspension_persistence_failed")
        self.assertEqual(len(self.controller._timers), 1)
        for _ in range(100): self.controller.request_refresh()
        await self.flush()
        self.assertEqual(self.save.await_count, 1)
        self.save.side_effect = None
        with patch.object(module.dt_util, "now", return_value=NOW + timedelta(seconds=2)):
            self.controller._queue({"boiler"}); await self.flush()
        self.assertTrue(self.data["settings"]["shared_demand_groups"][0]["suspended"])
        self.assertEqual(self.controller.get_statuses()["boiler"]["status"], "suspended")
        self.assertEqual(self.save.await_count, 2)
        self.assertFalse(self.controller._timers)
        await self.controller.async_stop()
        replacement = SharedDemandController(self.hass, self.data, self.save, self.scheduler)
        await replacement.async_start()
        await replacement._task
        self.assertTrue(replacement.get_statuses()["boiler"]["suspended"])
        await replacement.async_stop()
        self.assertFalse(self.calls)

    async def test_manual_off_while_service_inflight_prevents_delayed_own_on(self):
        started, finish = asyncio.Event(), asyncio.Event()
        async def delayed_service(domain, action, data, **kwargs):
            self.calls.append((domain, action, data, kwargs))
            if action == "turn_on":
                self.hass.states["switch.boiler"] = state("on")
                started.set()
                await finish.wait()
                own = state("on"); own.context = kwargs["context"]
                self.hass.states["switch.boiler"] = own
            else:
                own = state("off"); own.context = kwargs["context"]
                self.hass.states["switch.boiler"] = own
        self.hass.services.async_call = delayed_service
        await self.controller.async_start()
        await started.wait()
        new = state("off"); self.hass.states["switch.boiler"] = new
        self.controller._state_changed(SimpleNamespace(data={"entity_id": "switch.boiler", "old_state": state("on"), "new_state": new}))
        finish.set()
        await self.flush()
        self.assertEqual([call[1] for call in self.calls], ["turn_on", "turn_off"])
        self.assertEqual(self.hass.states["switch.boiler"].state, "off")
        self.assertTrue(self.controller.get_statuses()["boiler"]["suspended"])

    async def test_unload_turns_owned_running_supply_off_once(self):
        self.hass.states["switch.boiler"] = state("on")
        await self.start()
        await self.controller.async_stop()
        self.assertEqual([item[1] for item in self.calls], ["turn_off"])
        await self.controller.async_stop()
        self.assertEqual(len(self.calls), 1)

    async def test_removed_output_cleanup_survives_restart(self):
        self.hass.states["switch.boiler"] = state("unavailable")
        await self.start()
        await self.controller.async_update_groups([]); await self.flush()
        self.assertEqual(self.data["settings"]["shared_demand_cleanup"], ["switch.boiler"])
        await self.controller.async_stop()
        self.hass.states["switch.boiler"] = state("on")
        replacement = SharedDemandController(self.hass, self.data, self.save, self.scheduler)
        await replacement.async_start(); await replacement._task
        self.assertEqual(self.calls[-1][1], "turn_off")
        self.assertEqual(self.data["settings"]["shared_demand_cleanup"], [])
        await replacement.async_stop()

    async def test_suspended_delayed_on_off_failure_retries_without_reenabling(self):
        await self.start()
        own = state("on"); own.context = self.calls[0][3]["context"]
        self.hass.states["switch.boiler"] = own
        self.controller._safety_suspended.add("boiler")
        self.hass.services.async_call = AsyncMock(side_effect=RuntimeError("busy"))
        self.controller._queue({"boiler"})
        with self.assertLogs(module._LOGGER, level="WARNING"): await self.flush()
        self.assertEqual(self.controller.get_statuses()["boiler"]["status"], "delivery_failed")
        self.assertTrue(self.controller.get_statuses()["boiler"]["suspended"])
        self.assertEqual(len(self.controller._timers), 1)
        self.hass.services.async_call.side_effect = None
        with patch.object(module.dt_util, "now", return_value=NOW + timedelta(seconds=2)):
            self.controller._queue({"boiler"}); await self.flush()
        self.assertEqual(self.hass.services.async_call.await_count, 2)
        self.assertEqual(self.hass.services.async_call.call_args.args[1], "turn_off")
        self.assertFalse(self.controller._timers)

    async def test_failed_save_interleaved_refresh_never_installs_staged_groups(self):
        self.hass.states["switch.boiler"] = state("on")
        self.hass.states["switch.other"] = state("off")
        await self.start()
        started, finish = asyncio.Event(), asyncio.Event()
        async def save():
            started.set()
            await finish.wait()
            raise RuntimeError("storage")
        self.controller._save = save
        changed = group(); changed["switch_entity_id"] = "switch.other"
        task = asyncio.create_task(self.controller.async_update_groups([changed]))
        await started.wait()
        for _ in range(5): self.controller.request_refresh()
        self.assertEqual(self.controller._groups["boiler"]["switch_entity_id"], "switch.boiler")
        self.assertNotIn("switch.other", self.controller._entities)
        self.assertFalse(self.controller._retired)
        finish.set()
        with self.assertRaises(RuntimeError): await task
        await self.flush()
        self.assertEqual(self.controller._groups["boiler"]["switch_entity_id"], "switch.boiler")
        self.assertFalse(self.calls)
        self.assertFalse(self.controller._retired)

    async def test_resume_waits_for_save_and_preserves_newer_group_edits(self):
        raw = self.data["settings"]["shared_demand_groups"][0]
        raw["suspended"] = True
        await self.start()
        started, finish = asyncio.Event(), asyncio.Event()
        async def save():
            started.set()
            await finish.wait()
        self.controller._save = save
        replacement = deepcopy(raw); replacement["hysteresis"] = 0.7
        saving = asyncio.create_task(self.controller.async_update_groups([replacement]))
        await started.wait()
        resuming = asyncio.create_task(self.controller.async_resume("boiler"))
        await asyncio.sleep(0)
        finish.set()
        await saving; await resuming; await self.flush()
        result = self.data["settings"]["shared_demand_groups"][0]
        self.assertEqual(result["hysteresis"], 0.7)
        self.assertFalse(result["suspended"])

    async def test_shared_group_keeps_supply_until_all_zones_clear_demand(self):
        self.hass.states["climate.other"] = state(temperature=21)
        self.data["zones"]["climate.other"] = {"enabled": True}
        self.data["settings"]["shared_demand_groups"][0]["zones"]["climate.other"] = {}
        await self.start()
        self.assertEqual([call[1] for call in self.calls], ["turn_on"])
        own = state("on"); own.context = self.calls[0][3]["context"]
        self.hass.states["switch.boiler"] = own
        self.hass.states["climate.other"] = state(temperature=20)
        self.controller.request_refresh(); await self.flush()
        self.hass.states["climate.room"] = state(temperature=21)
        self.controller.request_refresh(); await self.flush()
        self.assertTrue(self.controller.get_statuses()["boiler"]["demand"])
        self.assertEqual(len(self.calls), 1)
        self.hass.states["climate.other"] = state(temperature=21)
        self.controller.request_refresh(); await self.flush()
        self.assertFalse(self.controller.get_statuses()["boiler"]["demand"])
        self.assertEqual([call[1] for call in self.calls], ["turn_on", "turn_off"])

    async def test_controller_staging_and_scheduler_settings_share_mutation_lock(self):
        await self.start()
        self.scheduler._profile_mutation_lock = asyncio.Lock()
        entered, finish = asyncio.Event(), asyncio.Event()
        async def failed_save():
            entered.set(); await finish.wait(); raise RuntimeError("storage")
        self.controller._save = failed_save
        changed = group(); changed["hysteresis"] = 0.7
        saving = asyncio.create_task(self.controller.async_update_groups([changed]))
        await entered.wait()
        async def unrelated_settings():
            async with self.scheduler._profile_mutation_lock:
                self.data["settings"] = {**self.data["settings"], "display_style": "compact"}
        unrelated = asyncio.create_task(unrelated_settings())
        await asyncio.sleep(0)
        self.assertFalse(unrelated.done())
        finish.set()
        with self.assertRaises(RuntimeError): await saving
        await unrelated; await self.flush()
        self.assertEqual(self.data["settings"]["shared_demand_groups"][0]["hysteresis"], 0.3)
        self.assertEqual(self.data["settings"]["display_style"], "compact")

    async def test_worker_takes_scheduler_lock_before_controller_lock(self):
        self.hass.states["switch.boiler"] = state("on")
        await self.start()
        self.scheduler._profile_mutation_lock = asyncio.Lock()
        async with self.scheduler._profile_mutation_lock:
            new = state("off"); self.hass.states["switch.boiler"] = new
            self.controller._state_changed(SimpleNamespace(data={"entity_id": "switch.boiler", "old_state": state("on"), "new_state": new}))
            await asyncio.sleep(0); await asyncio.sleep(0)
            self.assertFalse(self.controller._lock.locked())
            self.save.assert_not_awaited()
        await self.flush()
        self.assertTrue(self.data["settings"]["shared_demand_groups"][0]["suspended"])

    async def test_off_delay_uses_elapsed_seconds_across_autumn_clock_fold(self):
        from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
        try:
            madrid = ZoneInfo("Europe/Madrid")
        except ZoneInfoNotFoundError:
            self.skipTest("IANA timezone data unavailable")
        start = datetime(2026, 10, 25, 2, 59, tzinfo=madrid, fold=0)
        self.hass.states["switch.boiler"] = state("on")
        self.hass.states["climate.room"] = state(temperature=21)
        self.data["settings"]["shared_demand_groups"][0]["off_delay_seconds"] = 120
        with patch.object(module.dt_util, "now", return_value=start): await self.start()
        deadline = self.controller._timers["boiler"][0]
        self.assertEqual(deadline, datetime(2026, 10, 25, 1, 1, tzinfo=timezone.utc))
        self.assertEqual(deadline.utcoffset(), timedelta())
        after_60_seconds = datetime(2026, 10, 25, 2, 0, tzinfo=madrid, fold=1)
        with patch.object(module.dt_util, "now", return_value=after_60_seconds):
            self.controller.request_refresh(); await self.flush()
        self.assertFalse(self.calls)
        after_120_seconds = datetime(2026, 10, 25, 2, 1, tzinfo=madrid, fold=1)
        with patch.object(module.dt_util, "now", return_value=after_120_seconds):
            self.controller.request_refresh(); await self.flush()
        self.assertEqual(self.calls[-1][1], "turn_off")

    async def test_minimum_off_uses_elapsed_seconds_across_spring_clock_jump(self):
        from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
        try:
            madrid = ZoneInfo("Europe/Madrid")
        except ZoneInfoNotFoundError:
            self.skipTest("IANA timezone data unavailable")
        start = datetime(2026, 3, 29, 1, 59, tzinfo=madrid)
        self.hass.states["switch.boiler"].last_changed = start
        self.data["settings"]["shared_demand_groups"][0]["minimum_off_seconds"] = 120
        after_60_seconds = datetime(2026, 3, 29, 3, 0, tzinfo=madrid)
        with patch.object(module.dt_util, "now", return_value=after_60_seconds): await self.start()
        deadline = self.controller._timers["boiler"][0]
        self.assertEqual(deadline, datetime(2026, 3, 29, 1, 1, tzinfo=timezone.utc))
        self.assertEqual(deadline.utcoffset(), timedelta())
        self.assertFalse(self.calls)
        after_120_seconds = datetime(2026, 3, 29, 3, 1, tzinfo=madrid)
        with patch.object(module.dt_util, "now", return_value=after_120_seconds):
            self.controller.request_refresh(); await self.flush()
        self.assertEqual(self.calls[-1][1], "turn_on")

    async def test_mixed_climate_respects_per_mode_range_policy_over_stale_scalar(self):
        self.hass.states["climate.room"] = state("heat", 21, 30, target_temp_low=20, target_temp_high=24)
        policy = {"formats_by_mode": {"heat": "range"}}
        self.scheduler.get_target_format_policy = lambda _id: policy
        self.assertFalse(self.demand()["demand"])
        self.assertEqual(self.demand()["target"], 20)
        policy["formats_by_mode"]["heat"] = "single"
        self.hass.states["climate.room"].attributes["temperature"] = 22
        self.assertTrue(self.demand()["demand"])
        self.assertEqual(self.demand()["target"], 22)
        policy["formats_by_mode"]["heat"] = "range"
        self.hass.states["climate.room"].attributes["target_temp_low"] = None
        self.assertIsNone(self.demand()["demand"])

    async def test_auto_scalar_policy_never_consumes_stale_range(self):
        self.hass.states["climate.room"] = state("auto", 18, 22, target_temp_low=20, target_temp_high=24)
        self.scheduler.get_target_format_policy = lambda _id: {"formats_by_mode": {"auto": "single"}}
        self.assertIsNone(self.demand()["demand"])

    async def test_unknown_format_with_both_shapes_fails_closed(self):
        self.hass.states["climate.room"] = state("heat", 18, 30, target_temp_low=20, target_temp_high=24)
        self.assertIsNone(self.demand()["demand"])

    async def test_capability_change_refreshes_target_shape_without_temperature_change(self):
        await self.start()
        old = state(supported_features=1, hvac_modes=["heat", "off"])
        new = state(supported_features=3, hvac_modes=["heat", "off"])
        with patch.object(self.controller, "_evaluate", wraps=self.controller._evaluate) as evaluate:
            self.controller._state_changed(SimpleNamespace(data={"entity_id": "climate.room", "old_state": old, "new_state": new}))
            await self.flush()
        self.assertEqual(evaluate.await_count, 1)

    async def test_hysteresis_modes_complete_heating_and_cooling_cycles(self):
        for direction in ("heat", "cool"):
            for band_mode, stop_distance in (("at_target", 0), ("symmetric", 0.5), ("custom", 0.8)):
                with self.subTest(direction=direction, band_mode=band_mode):
                    self.controller._phases.clear()
                    sign = -1 if direction == "heat" else 1
                    start = 21 + sign * 0.5
                    stop = 21 - sign * stop_distance
                    steps = [(21 + sign * 0.1, False), (start, True),
                             (21 + sign * 0.1, True), (21, bool(stop_distance)),
                             (stop, False), (21 + sign * 0.1, False)]
                    for measured, expected in steps:
                        self.hass.states["climate.room"] = state(direction, measured, 21)
                        result = self.demand(direction=direction, hysteresis_mode=band_mode,
                                             hysteresis=0.5, hysteresis_stop=0.8)
                        self.assertEqual(result["demand"], expected, (band_mode, direction, measured))
                        self.assertEqual(result["start_temperature"], start)
                        self.assertEqual(result["stop_temperature"], stop)

    async def test_custom_zone_offsets_inherit_independently(self):
        raw = self.data["settings"]["shared_demand_groups"][0]
        raw.update(hysteresis_mode="custom", hysteresis=0.3, hysteresis_stop=0.6)
        for override, expected_start, expected_stop in (
            ({}, 20.7, 21.6),
            ({"hysteresis": 0.8}, 20.2, 21.6),
            ({"hysteresis_stop": 0.2}, 20.7, 21.2),
            ({"hysteresis": 0.4, "hysteresis_stop": 0}, 20.6, 21),
        ):
            with self.subTest(override=override):
                raw["zones"]["climate.room"] = override
                result = self.demand()
                self.assertAlmostEqual(result["start_temperature"], expected_start)
                self.assertAlmostEqual(result["stop_temperature"], expected_stop)

    async def test_symmetric_mode_uses_zone_start_override_on_both_sides(self):
        raw = self.data["settings"]["shared_demand_groups"][0]
        raw["zones"]["climate.room"] = {"hysteresis": 0.8, "hysteresis_stop": 4}
        result = self.demand(hysteresis_mode="symmetric", hysteresis_stop=5)
        self.assertAlmostEqual(result["start_temperature"], 20.2)
        self.assertAlmostEqual(result["stop_temperature"], 21.8)
        self.assertEqual(raw["zones"]["climate.room"]["hysteresis_stop"], 4)

    async def test_mode_or_effective_stop_change_discards_retained_phase(self):
        self.hass.states["climate.room"] = state(temperature=20.7)
        self.assertTrue(self.demand(hysteresis_mode="at_target")["demand"])
        self.hass.states["climate.room"] = state(temperature=20.9)
        self.assertFalse(self.demand(hysteresis_mode="symmetric")["demand"])
        self.hass.states["climate.room"] = state(temperature=20.7)
        self.assertTrue(self.demand()["demand"])
        self.hass.states["climate.room"] = state(temperature=20.9)
        self.assertFalse(self.demand(hysteresis_mode="custom", hysteresis_stop=0.3)["demand"])
        self.hass.states["climate.room"] = state(temperature=20.7)
        self.assertTrue(self.demand()["demand"])
        self.hass.states["climate.room"] = state(temperature=21.1)
        self.assertTrue(self.demand()["demand"])
        self.assertFalse(self.demand(hysteresis_stop=0.4)["demand"])

    async def test_zero_offsets_are_stable_at_target_in_every_mode(self):
        for direction in ("heat", "cool"):
            for band_mode in ("at_target", "symmetric", "custom"):
                self.hass.states["climate.room"] = state(direction, 21, 21)
                for _ in range(3):
                    self.assertFalse(self.demand(direction=direction, hysteresis_mode=band_mode,
                                                 hysteresis=0, hysteresis_stop=0)["demand"])

    async def test_room_assist_ignores_all_shared_hysteresis_modes(self):
        for band_mode in ("at_target", "symmetric", "custom"):
            for direction in ("heat", "cool"):
                self.hass.states["climate.room"] = state(direction, 0, 40)
                for committed in (False, True):
                    self.assist = dict(active=True, valid=True, direction=direction, demand=committed)
                    result = self.demand(direction=direction, hysteresis_mode=band_mode,
                                         hysteresis=18, hysteresis_stop=18)
                    self.assertEqual(result["demand"], committed)
                    self.assertEqual(result["source"], "room_assist")
                    self.assertNotIn("start_temperature", result)

    async def test_custom_stop_delta_converts_with_explicit_entity_unit(self):
        self.hass.states["climate.room"] = state(temperature=69, target=70, temperature_unit="°F")
        result = self.demand(hysteresis_mode="custom", hysteresis=0.5, hysteresis_stop=0.2)
        self.assertAlmostEqual(result["start_temperature"], 69.1)
        self.assertAlmostEqual(result["stop_temperature"], 70.36)
        self.assertAlmostEqual(result["hysteresis_stop"], 0.36)


    async def test_large_range_stop_offsets_allow_overlapping_heat_and_cool_demand(self):
        # Each supply group follows its configured band independently. This
        # documents the installation risk; the runtime does not arbitrate them.
        heat = group(hysteresis_mode="custom", hysteresis_stop=5)
        cool = deepcopy(heat)
        cool.update(id="cooling", direction="cool", switch_entity_id="switch.cooling")
        self.scheduler.get_target_format_policy = lambda _id: {
            "formats_by_mode": {"heat_cool": "range"}}
        for measured, expected_heat, expected_cool in (
            (19.7, True, False), (24.3, True, True), (25, False, True),
            (19.7, True, True), (19, True, False),
        ):
            self.hass.states["climate.room"] = state("heat_cool", measured, None,
                target_temp_low=20, target_temp_high=24)
            heating = self.controller._zone_demand(heat, "climate.room", {})
            cooling = self.controller._zone_demand(cool, "climate.room", {})
            self.assertEqual((heating["demand"], cooling["demand"]),
                             (expected_heat, expected_cool), measured)
            self.assertEqual(heating["stop_temperature"], 25)
            self.assertEqual(cooling["stop_temperature"], 19)

    async def test_sensor_readings_inside_each_hysteresis_band_do_not_broadcast(self):
        await self.start()
        raw = self.data["settings"]["shared_demand_groups"][0]
        for band_mode in ("at_target", "symmetric", "custom"):
            with self.subTest(band_mode=band_mode):
                raw.update(hysteresis_mode=band_mode, hysteresis_stop=0.8)
                self.hass.states["climate.room"] = state(temperature=20)
                self.controller.reconfigure(); await self.flush()
                before_calls = len(self.calls)
                with patch.object(module, "async_dispatcher_send") as publish:
                    for reading in (20.1, 20.2, 20.3, 20.4, 20.5):
                        old = self.hass.states["climate.room"]
                        new = state(temperature=reading)
                        self.hass.states["climate.room"] = new
                        self.controller._state_changed(SimpleNamespace(data={
                            "entity_id": "climate.room", "old_state": old, "new_state": new}))
                        await self.flush()
                    self.assertEqual(publish.call_count, 5)
                    self.assertTrue(all(call.args[1] == module.SIGNAL_SHARED_DEMAND_LIVE_UPDATED
                                        for call in publish.call_args_list))
                self.assertEqual(len(self.calls), before_calls)
                self.assertEqual(self.controller.get_statuses()["boiler"]["zones"]
                                 ["climate.room"]["temperature"], 20.5)
        self.save.assert_not_awaited()


    async def test_explicit_unit_conversion_overflow_clears_demand_without_nonfinite_status(self):
        import json
        for field in ("hysteresis", "hysteresis_stop"):
            with self.subTest(field=field):
                self.hass.states["climate.room"] = state(temperature=20)
                self.assertTrue(self.demand(hysteresis_mode="custom", hysteresis=0.3,
                                           hysteresis_stop=0.3)["demand"])
                self.hass.states["climate.room"] = state(temperature=69, target=70,
                                                         temperature_unit="\u00b0F")
                result = self.demand(**{field: 1e308})
                self.assertIsNone(result["demand"])
                self.assertEqual(result["reason"], "invalid_hysteresis")
                self.assertFalse(self.controller._phases)
                json.dumps(result, allow_nan=False)

    async def test_threshold_arithmetic_overflow_clears_demand_without_nonfinite_status(self):
        import json
        for direction, target, start_offset, stop_offset in (
            ("heat", -1e308, 1e308, 0), ("heat", 1e308, 0, 1e308),
            ("cool", 1e308, 1e308, 0), ("cool", -1e308, 0, 1e308),
        ):
            with self.subTest(direction=direction, target=target):
                self.hass.states["climate.room"] = state(direction,
                    20 if direction == "heat" else 22, 21)
                self.assertTrue(self.demand(direction=direction, hysteresis_mode="custom",
                    hysteresis=0.3, hysteresis_stop=0.3)["demand"])
                self.hass.states["climate.room"] = state(direction, 0, target)
                result = self.demand(hysteresis=start_offset, hysteresis_stop=stop_offset)
                self.assertIsNone(result["demand"])
                self.assertEqual(result["reason"], "invalid_hysteresis")
                self.assertFalse(self.controller._phases)
                json.dumps(result, allow_nan=False)


class SharedDemandBandValidationTests(unittest.TestCase):
    def test_legacy_shape_and_optional_custom_values_are_preserved(self):
        legacy = normalize_groups([group()], ["climate.room"])[0]
        self.assertNotIn("hysteresis_mode", legacy)
        self.assertNotIn("hysteresis_stop", legacy)
        for mode in ("at_target", "symmetric", "custom"):
            raw = group(hysteresis_mode=mode, hysteresis_stop=0.8)
            raw["zones"]["climate.room"] = {"hysteresis_stop": 0.2}
            normalized = normalize_groups([raw], ["climate.room"])[0]
            self.assertEqual(normalized["hysteresis_mode"], mode)
            self.assertEqual(normalized["hysteresis_stop"], 0.8)
            self.assertEqual(normalized["zones"]["climate.room"], {"hysteresis_stop": 0.2})
            self.assertEqual(raw["zones"]["climate.room"], {"hysteresis_stop": 0.2})

    def test_invalid_modes_and_stop_offsets_are_rejected(self):
        for mode in (None, True, 1, [], {}, "unknown", "AT_TARGET"):
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                normalize_groups([group(hysteresis_mode=mode)], ["climate.room"])
        for value in (None, True, -0.1, 10 ** 1000, float("nan"), float("inf"), "0.3"):
            for level in ("group", "zone"):
                with self.subTest(value=value, level=level), self.assertRaises(ValueError):
                    raw = group()
                    if level == "group": raw["hysteresis_stop"] = value
                    else: raw["zones"]["climate.room"] = {"hysteresis_stop": value}
                    normalize_groups([raw], ["climate.room"])
        raw = group()
        raw["zones"]["climate.room"] = {"hysteresis_mode": "symmetric"}
        with self.assertRaises(ValueError): normalize_groups([raw], ["climate.room"])

    def test_offsets_above_old_raw_unit_cap_are_valid_but_timer_caps_remain(self):
        for offset in (18.1, 21.6, 120):
            raw = group(hysteresis_mode="custom", hysteresis_stop=offset)
            raw["hysteresis"] = offset
            raw["zones"]["climate.room"] = {"hysteresis": offset, "hysteresis_stop": offset}
            normalized = normalize_groups([raw], ["climate.room"])[0]
            self.assertEqual(normalized["hysteresis"], offset)
            self.assertEqual(normalized["hysteresis_stop"], offset)
            self.assertEqual(normalized["zones"]["climate.room"],
                             {"hysteresis": offset, "hysteresis_stop": offset})
        for field in ("minimum_off_seconds", "on_delay_seconds", "off_delay_seconds"):
            raw = group(); raw[field] = 86401
            with self.subTest(field=field), self.assertRaises(ValueError):
                normalize_groups([raw], ["climate.room"])
