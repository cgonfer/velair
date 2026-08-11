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
