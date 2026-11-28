"""Durable Boost handoff data and adapter validation contracts."""

from copy import deepcopy
from types import SimpleNamespace
import unittest

from . import helpers  # noqa: F401
from .test_climate_restore_delivery import _DelayedClimate
from custom_components.velair.api import _export_zones
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.group_climate_manager import GroupClimateManager
from custom_components.velair.models import normalize_schedule_data, serialize_schedule_data
from custom_components.velair.storage import _convert_scheduler_temperatures


def _checkpoint():
    return {
        "id": "return-1", "ended_at": "2026-05-19T18:00:00+00:00", "reason": "manual",
        "announced": True, "mode_retired": True,
        "boost": {"type": "boost", "started_at": "2026-05-19T17:00:00+00:00",
                  "until": "2026-05-19T19:00:00+00:00", "temperature": 22,
                  "previous_state": {"hvac_mode": "cool", "temperature": 24,
                                     "preset_mode": "permanent"}},
    }


class BoostReturnStorageTest(unittest.TestCase):
    def test_round_trip_keeps_local_checkpoint_without_reviving_boost(self):
        pending = _checkpoint()
        data = normalize_schedule_data({"zones": {"climate.room": {
            "pending_boost_return": pending}}}, ["climate.room"])
        restored = normalize_schedule_data(serialize_schedule_data(data), ["climate.room"])
        self.assertEqual(restored["zones"]["climate.room"]["pending_boost_return"], pending)
        self.assertIsNone(restored["zones"]["climate.room"]["override"])
        self.assertNotIn("pending_boost_return", _export_zones(restored["zones"])["climate.room"])

    def test_invalid_checkpoints_and_active_overrides_do_not_reappear(self):
        for mutation in ({"id": ""}, {"ended_at": "not-a-date"},
                         {"ended_at": "2026-05-19T18:00:00"}, {"reason": "other"},
                         {"boost": {}}, {"id": "x" * 129}):
            with self.subTest(mutation=mutation):
                pending = {**_checkpoint(), **mutation}
                data = normalize_schedule_data({"zones": {"climate.room": {
                    "pending_boost_return": pending}}}, ["climate.room"])
                self.assertNotIn("pending_boost_return", data["zones"]["climate.room"])
        data = normalize_schedule_data({"zones": {"climate.room": {
            "pending_boost_return": _checkpoint(), "override": _checkpoint()["boost"]}}},
            ["climate.room"])
        self.assertNotIn("pending_boost_return", data["zones"]["climate.room"])

    def test_unit_conversion_includes_original_and_member_snapshot_targets(self):
        pending = _checkpoint()
        pending["boost"]["previous_state"]["group_members"] = {
            "climate.member": {"hvac_mode": "heat_cool", "target_temp_low": 20, "target_temp_high": 24}}
        data = {"zones": {"climate.room": {"pending_boost_return": pending}}}
        original = deepcopy(data)
        _convert_scheduler_temperatures(data, "°C", "°F")
        boost = data["zones"]["climate.room"]["pending_boost_return"]["boost"]
        self.assertEqual(boost["temperature"], 71.6)
        self.assertEqual(boost["previous_state"]["temperature"], 75.2)
        self.assertEqual(boost["previous_state"]["group_members"]["climate.member"]["target_temp_low"], 68)
        _convert_scheduler_temperatures(data, "°F", "°C")
        self.assertEqual(data, original)


class BoostReturnAdapterTest(unittest.TestCase):
    def test_saved_off_resolves_without_inheriting_current_boost_mode(self):
        device = _DelayedClimate("cool")
        manager = ClimateManager(device.hass)
        self.assertEqual(manager.boost_return_hvac_mode(
            "climate.room", {"hvac_mode": "off"}, range_target=False), "heat")
        device.reported.attributes["supported_features"] |= 2
        self.assertEqual(manager.boost_return_hvac_mode(
            "climate.room", {"hvac_mode": "off"}, range_target=True), "heat_cool")
        for saved in ({}, {"hvac_mode": "not_supported"}):
            with self.assertRaises(ValueError):
                manager.boost_return_hvac_mode("climate.room", saved, range_target=False)

    def test_options_deduplicate_defaults_but_preserve_explicit_block_commands(self):
        device = _DelayedClimate("heat")
        manager = ClimateManager(device.hass)
        snapshot = {"preset_mode": "permanent"}
        self.assertEqual(manager.boost_return_options(
            "climate.room", snapshot, {}, hvac_mode="heat"), {})
        self.assertEqual(manager.boost_return_options(
            "climate.room", snapshot, {}, hvac_mode="cool"), snapshot)
        self.assertEqual(manager.boost_return_options(
            "climate.room", snapshot, {"preset_mode": "temporary"}, hvac_mode="cool"),
            {"preset_mode": "temporary"})

    def test_group_requires_saved_modes_for_all_members_and_one_common_mode(self):
        device = _DelayedClimate("heat")
        device.hass.states["climate.other"] = deepcopy(device.reported)
        physical = ClimateManager(device.hass)
        group = GroupClimateManager(device.hass, {"room_groups": {"group.room": {
            "members": ["climate.room", "climate.other"], "control_mode": "all"}}}, physical)
        snapshot = {"group_members": {"climate.room": {"hvac_mode": "cool"},
                                      "climate.other": {"hvac_mode": "cool"}}}
        self.assertEqual(group.boost_return_hvac_mode("group.room", snapshot, range_target=False), "cool")
        snapshot["group_members"]["climate.other"]["hvac_mode"] = "heat"
        with self.assertRaisesRegex(ValueError, "different saved"):
            group.boost_return_hvac_mode("group.room", snapshot, range_target=False)
        del snapshot["group_members"]["climate.other"]
        with self.assertRaisesRegex(ValueError, "Missing saved"):
            group.boost_return_hvac_mode("group.room", snapshot, range_target=False)


class BoostReturnGroupOptionsTest(unittest.IsolatedAsyncioTestCase):
    async def test_member_saved_options_survive_unless_current_block_overrides_them(self):
        for block_options in ({}, {"preset_mode": "none"}):
            with self.subTest(block_options=block_options):
                devices = {member: _DelayedClimate("heat")
                           for member in ("climate.one", "climate.two")}

                async def route(domain, service, data, **kwargs):
                    await devices[data["entity_id"]].async_call(domain, service, data, **kwargs)

                hass = SimpleNamespace(
                    states={member: device.reported for member, device in devices.items()},
                    services=SimpleNamespace(async_call=route),
                    config=devices["climate.one"].hass.config)
                physical = ClimateManager(hass)
                group = GroupClimateManager(hass, {"room_groups": {"group.room": {
                    "name": "Room", "members": list(devices), "temperature_entity_id": "climate.one",
                    "delivery_mode": "all"}}}, physical)
                saved = {"group_members": {
                    "climate.one": {"hvac_mode": "cool", "preset_mode": "permanent"},
                    "climate.two": {"hvac_mode": "cool", "preset_mode": "temporary"}}}
                group._boost_return_provider = lambda _: (saved, block_options)
                await group.async_set_temperature("group.room", 20, hvac_mode="cool",
                                                  preset_mode="permanent")
                for member, device in devices.items():
                    expected_preset = block_options.get("preset_mode", saved["group_members"][member]["preset_mode"])
                    self.assertEqual(device.device.attributes["preset_mode"], expected_preset)
                    self.assertEqual(device.device.attributes["temperature"], 20)
                    self.assertEqual(device.device.state, "cool")
                    self.assertEqual(device.calls[-1][0], "set_temperature")
