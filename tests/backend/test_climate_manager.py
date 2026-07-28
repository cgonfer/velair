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
    ) -> tuple[ClimateManager, _ServiceRecorder]:
        attributes = {
            "unit_of_measurement": UnitOfTemperature.CELSIUS,
            "min_temp": 5,
            "max_temp": 35,
        }
        if supported_modes is not None:
            attributes["hvac_modes"] = supported_modes
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
