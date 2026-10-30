"""Restoration must not let delayed preset feedback overwrite the final target."""

from copy import deepcopy
from types import SimpleNamespace
import unittest

from . import helpers  # noqa: F401 - installs Home Assistant test stubs
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.group_climate_manager import GroupClimateManager


class _DelayedClimate:
    """Accept commands immediately, but publish their state only on flush().

    Preset commands copy the last *reported* target, as integrations with a
    delayed device cache can do. HVAC commands reset the native preset/target.
    Physical state and Home Assistant observations deliberately remain separate.
    """

    def __init__(self, mode="heat", preset="permanent", *, range_target=False):
        attributes = {
            "temperature": 20.5, "preset_mode": preset,
            "preset_modes": ["none", "temporary", "permanent"],
            "hvac_modes": ["off", "heat", "cool", "heat_cool"],
            "supported_features": 17, "min_temp": 5, "max_temp": 35,
            "target_temp_step": 0.5, "temperature_unit": "°C",
        }
        if range_target:
            attributes.pop("temperature")
            attributes.update(supported_features=18, target_temp_low=20, target_temp_high=25)
        self.reported = SimpleNamespace(state=mode, attributes=attributes, context=None)
        self.device = deepcopy(self.reported)
        self.calls = []
        self.pending = []
        self.fail_service = None
        self.hass = SimpleNamespace(
            states={"climate.room": self.reported}, services=self,
            config=SimpleNamespace(units=SimpleNamespace(temperature_unit="°C")),
        )

    async def async_call(self, domain, service, data, *, blocking=False, context=None):
        self.calls.append((service, dict(data), context))
        if service == self.fail_service:
            raise RuntimeError("device rejected command")
        if service == "set_hvac_mode":
            self.device.state = data["hvac_mode"]
            self.device.attributes["preset_mode"] = "none"
            for field in ("temperature", "target_temp_low"):
                if field in self.device.attributes:
                    self.device.attributes[field] = 16
        elif service == "turn_off":
            self.device.state = "off"
        elif service == "set_preset_mode":
            self.device.attributes["preset_mode"] = data["preset_mode"]
            for field in ("temperature", "target_temp_low", "target_temp_high"):
                if field in self.reported.attributes:
                    self.device.attributes[field] = self.reported.attributes[field]
        else:
            self.device.attributes.update({key: value for key, value in data.items() if key != "entity_id"})
        observation = deepcopy(self.device)
        observation.context = context
        self.pending.append(observation)

    def flush(self, manager):
        """Deliver delayed observations and return attribution for each echo."""
        owned = []
        for observation in self.pending:
            previous = self.reported
            self.reported = observation
            self.hass.states["climate.room"] = observation
            owned.append(manager.owned_state_change_fields("climate.room", observation, previous))
        self.pending.clear()
        return owned


class ClimateRestoreDeliveryTests(unittest.IsolatedAsyncioTestCase):
    async def test_unchanged_snapshot_options_only_restore_target_with_delayed_feedback(self):
        for mode in ("heat", "cool"):
            with self.subTest(mode=mode):
                device = _DelayedClimate(mode)
                device.reported.attributes.update(fan_mode="auto", swing_mode="off", humidity=45)
                manager = ClimateManager(device.hass)
                snapshot = {"hvac_mode": mode, "temperature": 18.5,
                            "preset_mode": "permanent", "fan_mode": "auto",
                            "swing_mode": "off", "humidity": 45}
                original = deepcopy(snapshot)

                await manager.async_restore_state("climate.room", snapshot)

                self.assertEqual([call[0] for call in device.calls], ["set_temperature"])
                self.assertEqual(device.device.attributes["temperature"], 18.5)
                self.assertEqual(device.device.attributes["preset_mode"], "permanent")
                self.assertEqual(device.reported.attributes["temperature"], 20.5)
                self.assertEqual(snapshot, original)
                self.assertEqual(device.flush(manager), [{"temperature"}])
                self.assertEqual(manager.command_settling_diagnostics("climate.room")["mismatches"], {})

    async def test_changed_preset_cannot_overwrite_restored_target_from_stale_cache(self):
        device = _DelayedClimate(preset="temporary")
        manager = ClimateManager(device.hass)

        await manager.async_restore_state("climate.room", {
            "hvac_mode": "heat", "temperature": 18.5, "preset_mode": "permanent",
        })

        self.assertEqual([call[0] for call in device.calls], ["set_preset_mode", "set_temperature"])
        self.assertEqual(device.pending[0].attributes["temperature"], 20.5)
        self.assertEqual(device.device.attributes["temperature"], 18.5)
        self.assertEqual(device.device.attributes["preset_mode"], "permanent")
        self.assertEqual(device.reported.attributes["preset_mode"], "temporary")
        self.assertIs(device.calls[0][2], device.calls[1][2])
        device.flush(manager)
        self.assertEqual(device.reported.attributes["temperature"], 18.5)

    async def test_changed_hvac_restores_preset_even_if_it_matched_before_command(self):
        device = _DelayedClimate("cool")
        manager = ClimateManager(device.hass)

        await manager.async_restore_state("climate.room", {
            "hvac_mode": "heat", "temperature": 18.5, "preset_mode": "permanent",
        })

        self.assertEqual([call[0] for call in device.calls],
                         ["set_hvac_mode", "set_preset_mode", "set_temperature"])
        self.assertEqual(device.pending[0].attributes["preset_mode"], "none")
        self.assertEqual(device.device.state, "heat")
        self.assertEqual(device.device.attributes["preset_mode"], "permanent")
        self.assertEqual(device.device.attributes["temperature"], 18.5)
        self.assertTrue(all(call[2] is device.calls[0][2] for call in device.calls))
        echoes = device.flush(manager)
        self.assertIn("hvac_mode", echoes[0])
        self.assertIn("temperature", echoes[-1])

    async def test_explicit_scalar_targets_apply_options_before_target_in_heating_and_cooling(self):
        for mode in ("heat", "cool"):
            with self.subTest(mode=mode):
                device = _DelayedClimate(mode)
                manager = ClimateManager(device.hass)
                await manager.async_set_temperature("climate.room", 18.5,
                    hvac_mode=mode, preset_mode="permanent", fan_mode="auto")

                self.assertEqual([call[0] for call in device.calls],
                    ["set_hvac_mode", "set_fan_mode", "set_preset_mode", "set_temperature"])
                self.assertEqual(device.device.attributes["temperature"], 18.5)
                self.assertEqual(device.reported.attributes["temperature"], 20.5)
                device.flush(manager)
                self.assertEqual(manager.command_settling_diagnostics("climate.room")["mismatches"], {})

    async def test_native_range_is_last_after_preset_with_delayed_feedback(self):
        device = _DelayedClimate("heat_cool", "temporary", range_target=True)
        manager = ClimateManager(device.hass)
        await manager.async_restore_state("climate.room", {
            "hvac_mode": "heat_cool", "target_temp_low": 18.5,
            "target_temp_high": 24, "preset_mode": "permanent",
        })

        self.assertEqual([call[0] for call in device.calls], ["set_preset_mode", "set_temperature"])
        self.assertEqual(device.calls[-1][1], {
            "entity_id": "climate.room", "target_temp_low": 18.5, "target_temp_high": 24,
        })
        self.assertEqual(device.device.attributes["target_temp_low"], 18.5)
        self.assertEqual(device.device.attributes["target_temp_high"], 24)
        self.assertEqual(device.reported.attributes["target_temp_low"], 20)
        self.assertEqual(device.flush(manager)[-1], {"target_temp_low", "target_temp_high"})

    async def test_off_snapshot_never_sends_its_temperature_or_options(self):
        for mode in ("off", "heat"):
            with self.subTest(mode=mode):
                device = _DelayedClimate(mode)
                manager = ClimateManager(device.hass)
                await manager.async_restore_state("climate.room", {
                    "hvac_mode": "off", "temperature": 18.5, "preset_mode": "permanent",
                })
                self.assertEqual([call[0] for call in device.calls], [] if mode == "off" else ["set_hvac_mode"])
                self.assertEqual(device.device.state, "off")

    async def test_temperature_only_snapshot_does_not_restore_mode_or_options(self):
        device = _DelayedClimate("off")
        manager = ClimateManager(device.hass)
        await manager.async_restore_state("climate.room", {
            "temperature_only": True, "hvac_mode": "heat",
            "temperature": 18.5, "preset_mode": "temporary",
        })
        self.assertEqual([call[0] for call in device.calls], ["set_temperature"])
        self.assertEqual(device.device.state, "off")
        self.assertEqual(device.device.attributes["preset_mode"], "permanent")

    async def test_option_failure_does_not_send_or_expect_undelivered_temperature(self):
        for change_mode in (False, True):
            with self.subTest(change_mode=change_mode):
                device = _DelayedClimate("cool" if change_mode else "heat", "temporary")
                device.fail_service = "set_preset_mode"
                manager = ClimateManager(device.hass)
                with self.assertRaisesRegex(RuntimeError, "device rejected"):
                    await manager.async_restore_state("climate.room", {
                        "hvac_mode": "heat", "temperature": 18.5, "preset_mode": "permanent",
                    })
                self.assertNotIn("set_temperature", [call[0] for call in device.calls])
                expected = manager._expected.get("climate.room", [])
                self.assertEqual([item["expected"] for item in expected],
                                 [{"hvac_mode": "heat"}] if change_mode else [])

    async def test_options_only_explicit_action_still_reapplies_matching_preset(self):
        device = _DelayedClimate()
        manager = ClimateManager(device.hass)
        await manager.async_apply_climate_options("climate.room", preset_mode="permanent")
        self.assertEqual([call[0] for call in device.calls], ["set_preset_mode"])

    async def test_final_target_failure_keeps_only_successfully_delivered_hvac_expectation(self):
        for change_mode in (False, True):
            with self.subTest(change_mode=change_mode):
                device = _DelayedClimate("cool" if change_mode else "heat", "temporary")
                device.fail_service = "set_temperature"
                manager = ClimateManager(device.hass)
                with self.assertRaisesRegex(RuntimeError, "device rejected"):
                    await manager.async_restore_state("climate.room", {
                        "hvac_mode": "heat", "temperature": 18.5, "preset_mode": "permanent",
                    })
                self.assertEqual(device.device.attributes["preset_mode"], "permanent")
                self.assertEqual(device.device.attributes["temperature"], 20.5)
                self.assertEqual([item["expected"] for item in manager._expected.get("climate.room", [])],
                                 [{"hvac_mode": "heat"}] if change_mode else [])

    async def test_group_target_preserves_preset_before_final_physical_target(self):
        for delivery_mode in ("all", "selected"):
            with self.subTest(delivery_mode=delivery_mode):
                device = _DelayedClimate()
                physical = ClimateManager(device.hass)
                manager = GroupClimateManager(device.hass, {"room_groups": {"group.room": {
                    "name": "Room", "members": ["climate.room"],
                    "temperature_entity_id": "climate.room", "delivery_mode": delivery_mode,
                    "delivery_entity_id": "climate.room",
                }}}, physical)
                await manager.async_set_temperature("group.room", 18.5, preset_mode="permanent")
                self.assertEqual([call[0] for call in device.calls], ["set_preset_mode", "set_temperature"])
                self.assertEqual(device.device.attributes["temperature"], 18.5)
                self.assertEqual(manager.delivery_status["group.room"]["climate.room"]["status"], "success")

    async def test_group_member_failure_does_not_block_other_members_final_target(self):
        devices = {"climate.one": _DelayedClimate(), "climate.two": _DelayedClimate()}
        devices["climate.one"].fail_service = "set_temperature"

        async def route(domain, service, data, **kwargs):
            await devices[data["entity_id"]].async_call(domain, service, data, **kwargs)

        hass = SimpleNamespace(
            states={member: device.reported for member, device in devices.items()},
            services=SimpleNamespace(async_call=route), config=devices["climate.one"].hass.config,
        )
        physical = ClimateManager(hass)
        manager = GroupClimateManager(hass, {"room_groups": {"group.room": {
            "name": "Room", "members": list(devices), "temperature_entity_id": "climate.one",
            "delivery_mode": "all",
        }}}, physical)

        with self.assertRaisesRegex(RuntimeError, "incomplete"):
            await manager.async_set_temperature("group.room", 18.5, preset_mode="permanent")

        self.assertEqual(manager.delivery_status["group.room"]["climate.one"]["status"], "failed")
        self.assertEqual(manager.delivery_status["group.room"]["climate.two"]["status"], "success")
        self.assertEqual(devices["climate.one"].device.attributes["temperature"], 20.5)
        self.assertEqual(devices["climate.two"].device.attributes["temperature"], 18.5)
        for device in devices.values():
            self.assertEqual([call[0] for call in device.calls], ["set_preset_mode", "set_temperature"])
        self.assertFalse(physical._expected.get("climate.one"))
