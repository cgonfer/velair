"""Persistence, portability and API contracts for shared range references."""
from copy import deepcopy
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from .helpers import FakeHass, NOW, VelairScheduler
from custom_components.velair import api
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.models import normalize_schedule_data
from custom_components.velair.target_format_policy import (
    selected_range_boundary, validate_range_reference,
)


class RangeReferenceConfigurationTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.entity = "climate.room"
        self.hass = FakeHass()
        self.hass.states[self.entity] = SimpleNamespace(state="heat", attributes={
            "supported_features": 3,
            "hvac_modes": ["off", "heat", "cool", "auto", "heat_cool"],
            "temperature": 22, "target_temp_low": 20, "target_temp_high": 24,
            "current_temperature": 20, "target_temp_step": .5,
            "min_temp": 16, "max_temp": 30,
        })
        self.data = normalize_schedule_data({}, [self.entity])
        self.saves = []

        async def save():
            self.saves.append(deepcopy(self.data))

        self.scheduler = VelairScheduler(
            self.hass, self.data, ClimateManager(self.hass), save
        )
        self.clock = patch("custom_components.velair.scheduler.dt_util.now", return_value=NOW)
        self.clock.start()

    async def asyncTearDown(self):
        self.clock.stop()
        await self.scheduler._climate_delivery.async_stop()

    def test_strict_values_and_no_implicit_fixed_or_auto_reference(self):
        for value in (None, [], {"auto": "low"}, {"heat_cool": "high"},
                      {"heat": None}, {"heat": "temperature"}, {"cool": []}):
            with self.subTest(value=value), self.assertRaises(ValueError):
                validate_range_reference(value)
        for mode in ("heat", "cool", "auto", "heat_cool", None):
            self.assertIsNone(selected_range_boundary({}, mode))
        zone = {"target_range_reference": {"heat": "high", "cool": "low"}}
        self.assertEqual(selected_range_boundary(zone, "heat"), "high")
        self.assertEqual(selected_range_boundary(zone, "cool"), "low")
        self.assertIsNone(selected_range_boundary(zone, "auto"))

    async def test_save_clear_reload_and_scalar_policy_preserve_device_selection(self):
        reference = {"heat": "high", "cool": "low"}
        await self.scheduler.async_update_zone_range_reference(self.entity, reference, 0)
        self.assertEqual(self.saves[-1]["zones"][self.entity]["target_range_reference"], reference)
        self.assertEqual(self.data["configuration_revision"], 1)
        reference["heat"] = "low"
        self.assertEqual(self.data["zones"][self.entity]["target_range_reference"]["heat"], "high")
        restored = normalize_schedule_data(deepcopy(self.data), [self.entity])
        self.assertEqual(restored["zones"][self.entity]["target_range_reference"],
                         {"heat": "high", "cool": "low"})
        # Format and advanced interpretation are independent device properties.
        self.assertEqual(self.scheduler.get_target_format_policy(self.entity)["formats_by_mode"]["heat"], "single")
        await self.scheduler.async_update_zone_range_reference(self.entity, {}, 1)
        self.assertFalse(self.data["zones"][self.entity].get("target_range_reference"))

    async def test_revision_validation_and_unmanaged_updates_are_pure(self):
        before = deepcopy(self.data)
        for entity, value, revision in (
            (self.entity, {"heat": "low"}, 5),
            ("climate.unmanaged", {"heat": "low"}, 0),
            (self.entity, {"auto": "low"}, 0),
        ):
            with self.subTest(entity=entity, value=value), self.assertRaises(ValueError):
                await self.scheduler.async_update_zone_range_reference(entity, value, revision)
        self.assertEqual(self.data, before)
        self.assertFalse(self.saves)

    async def test_failed_write_rolls_back_before_retiring_runtime(self):
        before = deepcopy(self.data)
        with patch.object(self.scheduler, "_async_save_data", AsyncMock(side_effect=OSError("storage unavailable"))), \
                patch.object(self.scheduler, "_async_clear_room_sensor_assist", AsyncMock()) as clear:
            with self.assertRaises(OSError):
                await self.scheduler.async_update_zone_range_reference(self.entity, {"heat": "high"}, 0)
            clear.assert_not_awaited()
        self.assertEqual(self.data, before)

    def test_portable_roundtrip_preserves_selection_and_legacy_omission(self):
        self.data["zones"][self.entity]["target_range_reference"] = {"heat": "high", "cool": "low"}
        exported = api._export_zones(self.data["zones"])
        payload = {"format": api.EXPORT_FORMAT, "model_version": 23,
                   "temperature_unit": "°C", "sections": {"zones": exported}}
        runtime = {"scheduler": self.scheduler,
                   "storage": SimpleNamespace(data=self.data, effective_temperature_unit="°C")}
        imported = api._build_import_data(runtime, payload, ["zones"])
        self.assertEqual(imported["zones"][self.entity]["target_range_reference"], {"heat": "high", "cool": "low"})
        exported[self.entity].pop("target_range_reference")
        payload["model_version"] = 22
        legacy = api._build_import_data(runtime, payload, ["zones"])
        self.assertNotIn("target_range_reference", legacy["zones"][self.entity])
        exported[self.entity]["target_range_reference"] = {"auto": "high"}
        with self.assertRaises(ValueError):
            api._build_import_data(runtime, payload, ["zones"])

    async def test_websocket_uses_shared_backend_and_rejects_stale_revision(self):
        runtime = {"scheduler": self.scheduler,
                   "storage": SimpleNamespace(temperature_migration_required=False),
                   "operation_active": None, "operation_recovery": None}
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        message = {"id": 1, "type": "velair/update_zone_range_reference", "entity_id": self.entity,
                   "target_range_reference": {"heat": "high"}, "expected_revision": 0}
        with patch.object(api, "_get_runtime", return_value=runtime), \
                patch.object(api, "_build_schedule_response", return_value={"saved": True}):
            await api.ws_update_zone_range_reference(self.hass, connection, message)
            connection.send_result.assert_called_once_with(1, {"saved": True})
            await api.ws_update_zone_range_reference(self.hass, connection, message)
        self.assertEqual(connection.send_error.call_args.args[1], "revision_conflict")


if __name__ == "__main__":
    unittest.main()
