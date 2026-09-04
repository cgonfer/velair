"""Shared backend test helpers for Velair."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import importlib
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace


ROOT = Path(__file__).resolve().parents[2]
NOW = datetime(2026, 5, 19, 18, 0, tzinfo=timezone.utc)  # Tuesday


def _install_homeassistant_stubs() -> None:
    """Install the small subset of Home Assistant modules used by scheduler.py."""
    homeassistant = ModuleType("homeassistant")
    homeassistant.__path__ = []
    sys.modules.setdefault("homeassistant", homeassistant)

    components = ModuleType("homeassistant.components")
    components.__path__ = []
    sys.modules["homeassistant.components"] = components

    websocket_api = ModuleType("homeassistant.components.websocket_api")
    websocket_api.ActiveConnection = object
    websocket_api.async_register_command = lambda *args, **kwargs: None
    websocket_api.async_response = lambda func: func
    websocket_api.event_message = lambda message_id, data: {
        "id": message_id,
        "event": data,
    }
    websocket_api.websocket_command = lambda *args, **kwargs: (lambda func: func)
    sys.modules["homeassistant.components.websocket_api"] = websocket_api

    const = ModuleType("homeassistant.const")
    const.ATTR_ENTITY_ID = "entity_id"
    const.UnitOfTemperature = SimpleNamespace(CELSIUS="°C", FAHRENHEIT="°F")
    const.Platform = SimpleNamespace(
        SENSOR="sensor",
        SELECT="select",
        SWITCH="switch",
    )
    sys.modules["homeassistant.const"] = const

    core = ModuleType("homeassistant.core")
    core.CALLBACK_TYPE = object
    core.HomeAssistant = object
    core.ServiceCall = object
    core.callback = _callback
    core.valid_entity_id = lambda value: (
        isinstance(value, str)
        and value.count(".") == 1
        and all(part and " " not in part for part in value.split("."))
    )
    sys.modules["homeassistant.core"] = core

    exceptions = ModuleType("homeassistant.exceptions")
    exceptions.HomeAssistantError = RuntimeError
    sys.modules["homeassistant.exceptions"] = exceptions

    config_entries = ModuleType("homeassistant.config_entries")
    config_entries.ConfigEntry = object
    sys.modules["homeassistant.config_entries"] = config_entries

    helpers = ModuleType("homeassistant.helpers")
    helpers.__path__ = []
    sys.modules["homeassistant.helpers"] = helpers

    config_validation = ModuleType("homeassistant.helpers.config_validation")
    config_validation.boolean = bool
    config_validation.config_entry_only_config_schema = lambda domain: {
        "config_entry_only": domain
    }
    config_validation.entity_id = str
    config_validation.string = str
    config_validation.ensure_list = _ensure_list
    sys.modules["homeassistant.helpers.config_validation"] = config_validation

    storage = ModuleType("homeassistant.helpers.storage")
    storage.Store = object
    sys.modules["homeassistant.helpers.storage"] = storage

    dispatcher = ModuleType("homeassistant.helpers.dispatcher")
    dispatcher.async_dispatcher_connect = lambda *args, **kwargs: (lambda: None)
    dispatcher.async_dispatcher_send = lambda *args, **kwargs: None
    sys.modules["homeassistant.helpers.dispatcher"] = dispatcher

    event = ModuleType("homeassistant.helpers.event")
    event.async_track_point_in_time = lambda *args, **kwargs: (lambda: None)
    event.async_track_state_change_event = lambda *args, **kwargs: (lambda: None)
    event.async_call_later = lambda *args, **kwargs: (lambda: None)
    sys.modules["homeassistant.helpers.event"] = event

    util = ModuleType("homeassistant.util")
    util.__path__ = []
    sys.modules["homeassistant.util"] = util

    dt = ModuleType("homeassistant.util.dt")
    dt.now = lambda: NOW
    dt.as_local = lambda value: value
    dt.as_utc = lambda value: value.astimezone(timezone.utc)
    dt.parse_datetime = _parse_datetime
    sys.modules["homeassistant.util.dt"] = dt


def _install_voluptuous_stub() -> None:
    """Install the tiny voluptuous surface needed to import api.py."""
    voluptuous = ModuleType("voluptuous")
    voluptuous.Invalid = ValueError
    voluptuous.PREVENT_EXTRA = 0
    voluptuous.All = lambda *validators, **kwargs: (
        lambda value: _apply_validators(value, validators)
    )
    voluptuous.Any = lambda *validators, **kwargs: (
        lambda value: _apply_any_validator(value, validators)
    )
    voluptuous.Coerce = lambda converter: converter
    voluptuous.Equal = lambda expected: lambda value: value
    voluptuous.In = lambda options: lambda value: value
    voluptuous.Length = lambda *args, **kwargs: lambda value: value
    voluptuous.Optional = lambda key, **kwargs: key
    voluptuous.Range = lambda *args, **kwargs: lambda value: value
    voluptuous.Required = lambda key, **kwargs: key
    voluptuous.Schema = lambda schema, **kwargs: _schema_validator(
        schema,
        prevent_extra=kwargs.get("extra") == voluptuous.PREVENT_EXTRA,
    )
    sys.modules.setdefault("voluptuous", voluptuous)


def _apply_validators(value, validators):
    result = value
    for validator in validators:
        if isinstance(validator, list):
            continue
        if callable(validator):
            result = validator(result)
    return result


def _schema_validator(schema, *, prevent_extra=False):
    def validate(value):
        if prevent_extra and isinstance(schema, dict) and isinstance(value, dict):
            unexpected = set(value) - set(schema)
            if unexpected:
                raise ValueError(f"extra keys not allowed: {sorted(unexpected)}")
        return value
    return validate


def _apply_any_validator(value, validators):
    for validator in validators:
        if validator is None and value is None:
            return value
        if callable(validator):
            try:
                return validator(value)
            except Exception:
                continue
        if value == validator:
            return value
    return value


def _install_custom_component_package_stub() -> None:
    """Load integration modules without executing the package __init__."""
    custom_components = ModuleType("custom_components")
    custom_components.__path__ = [str(ROOT / "custom_components")]
    sys.modules.setdefault("custom_components", custom_components)

    package = ModuleType("custom_components.velair")
    package.__path__ = [str(ROOT / "custom_components" / "velair")]
    sys.modules.setdefault("custom_components.velair", package)


def _parse_datetime(value: str | None) -> datetime | None:
    if value is None:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        if value.endswith("Z"):
            return datetime.fromisoformat(f"{value[:-1]}+00:00")
        return None


def _ensure_list(value):
    if isinstance(value, list):
        return value
    return [value]


def _callback(func):
    func.__velair_test_callback__ = True
    return func


_install_homeassistant_stubs()
_install_voluptuous_stub()
_install_custom_component_package_stub()

scheduler_module = importlib.import_module("custom_components.velair.scheduler")
models_module = importlib.import_module("custom_components.velair.models")
const_module = importlib.import_module("custom_components.velair.const")

VelairScheduler = scheduler_module.VelairScheduler
DEFAULT_SCHEDULE_TEMPLATES_VERSION = models_module.DEFAULT_SCHEDULE_TEMPLATES_VERSION
DEFAULT_PRECONDITIONING_MAX_LEAD_MINUTES = (
    models_module.DEFAULT_PRECONDITIONING_MAX_LEAD_MINUTES
)
WEEKDAYS = models_module.WEEKDAYS
empty_week_schedule = models_module.empty_week_schedule
normalize_schedule_blocks = models_module.normalize_schedule_blocks
normalize_schedule_data = models_module.normalize_schedule_data
normalize_panel_settings = models_module.normalize_panel_settings
normalize_comfort_data = models_module.normalize_comfort_data
normalize_preconditioning_data = models_module.normalize_preconditioning_data
ACTION_SET_TEMPERATURE = const_module.ACTION_SET_TEMPERATURE
ACTION_TURN_OFF = const_module.ACTION_TURN_OFF
EVENT_TYPE_BOOST_ENDED = const_module.EVENT_TYPE_BOOST_ENDED
EVENT_TYPE_BOOST_STARTED = const_module.EVENT_TYPE_BOOST_STARTED
EVENT_TYPE_CLIMATE_TARGET_APPLIED = const_module.EVENT_TYPE_CLIMATE_TARGET_APPLIED
EVENT_TYPE_COMFORT_ASSESSMENT_CHANGED = (
    const_module.EVENT_TYPE_COMFORT_ASSESSMENT_CHANGED
)
EVENT_TYPE_PRECONDITIONING_OBSERVATION_RECORDED = (
    const_module.EVENT_TYPE_PRECONDITIONING_OBSERVATION_RECORDED
)
EVENT_TYPE_PRECONDITIONING_PLAN_CANCELLED = (
    const_module.EVENT_TYPE_PRECONDITIONING_PLAN_CANCELLED
)
EVENT_TYPE_PRECONDITIONING_PLAN_UPDATED = (
    const_module.EVENT_TYPE_PRECONDITIONING_PLAN_UPDATED
)
EVENT_TYPE_ROOM_SENSOR_ASSIST_RESTORED = (
    const_module.EVENT_TYPE_ROOM_SENSOR_ASSIST_RESTORED
)
EVENT_TYPE_ROOM_SENSOR_ASSIST_STATE_CHANGED = (
    const_module.EVENT_TYPE_ROOM_SENSOR_ASSIST_STATE_CHANGED
)
EVENT_TYPE_ROOM_SENSOR_ASSIST_UPDATED = const_module.EVENT_TYPE_ROOM_SENSOR_ASSIST_UPDATED
EVENT_TYPE_SCHEDULER_MODE_CHANGED = const_module.EVENT_TYPE_SCHEDULER_MODE_CHANGED
EVENT_TYPE_ZONE_PAUSED = const_module.EVENT_TYPE_ZONE_PAUSED
EVENT_TYPE_ZONE_RESUMED = const_module.EVENT_TYPE_ZONE_RESUMED
EVENT_VELAIR = const_module.EVENT_VELAIR
MODE_AUTO = const_module.MODE_AUTO
MODE_PAUSED = const_module.MODE_PAUSED
ZONE_PAUSE_ACTION_TURN_OFF = const_module.ZONE_PAUSE_ACTION_TURN_OFF


class FakeServices:
    """Capture Home Assistant service calls used by the scheduler."""

    def __init__(self, *, logbook_enabled: bool = False) -> None:
        self.logbook_enabled = logbook_enabled
        self.calls: list[tuple] = []

    def has_service(self, domain: str, service: str) -> bool:
        return self.logbook_enabled and domain == "logbook" and service == "log"

    async def async_call(
        self,
        domain: str,
        service: str,
        data: dict,
        *,
        blocking: bool = False,
    ) -> None:
        self.calls.append((domain, service, data, blocking))


class FakeStates(dict):
    """Tiny state registry stand-in."""


class FakeBus:
    """Capture Home Assistant events fired by the scheduler."""

    def __init__(self) -> None:
        self.events: list[tuple[str, dict]] = []

    def async_fire(self, event_type: str, event_data: dict) -> None:
        self.events.append((event_type, event_data))


class FakeHass:
    """Tiny Home Assistant stand-in used by scheduler timer setup."""

    def __init__(self, *, language: str = "en", logbook_enabled: bool = False) -> None:
        self.config = SimpleNamespace(language=language)
        self.bus = FakeBus()
        self.services = FakeServices(logbook_enabled=logbook_enabled)
        self.states = FakeStates()

    def async_create_task(self, awaitable):
        return asyncio.create_task(awaitable)


class FakeClimateManager:
    """Capture climate calls made by the scheduler."""

    def __init__(self) -> None:
        self.calls: list[tuple] = []
        self.limits: dict[str, tuple[float, float]] = {}
        self.snapshots: dict[str, dict] = {}
        self.steps: dict[str, float] = {}
        self.climate_options: dict[str, dict[str, list[str]]] = {}
        self.single_temperature_support: dict[tuple[str, str | None], bool] = {}
        self.temperature_range_support: dict[str, bool] = {}
        self.hvac_modes: dict[str, list[str]] = {}
        self.current_hvac_modes: dict[str, str] = {}

    async def async_set_temperature(
        self,
        entity_id: str,
        temperature: float,
        *,
        ensure_on: bool = False,
        fan_mode: str | None = None,
        hvac_mode: str | None = None,
        humidity: float | None = None,
        preset_mode: str | None = None,
        swing_mode: str | None = None,
        swing_horizontal_mode: str | None = None,
    ) -> None:
        options = {
            "fan_mode": fan_mode,
            "humidity": humidity,
            "preset_mode": preset_mode,
            "swing_mode": swing_mode,
            "swing_horizontal_mode": swing_horizontal_mode,
        }
        if any(value is not None for value in options.values()):
            self.calls.append((
                "set_temperature",
                entity_id,
                temperature,
                ensure_on,
                hvac_mode,
                options,
            ))
            return
        self.calls.append(("set_temperature", entity_id, temperature, ensure_on, hvac_mode))

    async def async_set_temperature_range(
        self,
        entity_id: str,
        target_temp_low: float,
        target_temp_high: float,
        *,
        ensure_on: bool = False,
        fan_mode: str | None = None,
        hvac_mode: str | None = None,
        humidity: float | None = None,
        preset_mode: str | None = None,
        swing_mode: str | None = None,
        swing_horizontal_mode: str | None = None,
    ) -> None:
        self.calls.append(
            (
                "set_temperature_range",
                entity_id,
                target_temp_low,
                target_temp_high,
                ensure_on,
                hvac_mode,
            )
        )

    async def async_turn_off(self, entity_id: str) -> None:
        self.calls.append(("turn_off", entity_id))

    def climate_state_snapshot(self, entity_id: str) -> dict:
        return dict(self.snapshots.get(entity_id, {}))

    async def async_restore_state(self, entity_id: str, snapshot: dict) -> None:
        self.calls.append(("restore_state", entity_id, dict(snapshot)))

    def temperature_limits(self, entity_id: str) -> tuple[float, float]:
        return self.limits.get(entity_id, (5.0, 35.0))

    def temperature_step(self, entity_id: str) -> float:
        return self.steps.get(entity_id, 0.5)

    def supported_hvac_modes(self, entity_id: str) -> list[str]:
        return self.hvac_modes.get(entity_id, ["off", "heat", "cool"])

    def supported_climate_options(self, entity_id: str) -> dict[str, list[str]]:
        return self.climate_options.get(entity_id, {})

    def effective_hvac_mode(
        self,
        entity_id: str,
        requested_hvac_mode: str | None,
        *,
        ensure_on: bool,
        range_target: bool = False,
    ) -> str | None:
        """Mirror the fallback used by ClimateManager for scheduler tests."""
        if requested_hvac_mode is not None:
            return requested_hvac_mode
        current_mode = self.current_hvac_modes.get(entity_id)
        if current_mode is not None and (not ensure_on or current_mode != "off"):
            return current_mode
        modes = [mode for mode in self.supported_hvac_modes(entity_id) if mode != "off"]
        if range_target:
            return "heat_cool" if "heat_cool" in modes else None
        for mode in modes:
            if mode != "heat_cool" or self.supports_single_temperature_target(
                entity_id,
                mode,
                ensure_on=ensure_on,
            ):
                return mode
        return None

    def supports_single_temperature_target(
        self,
        entity_id: str,
        requested_hvac_mode: str | None,
        *,
        ensure_on: bool = False,
    ) -> bool:
        return self.single_temperature_support.get(
            (entity_id, requested_hvac_mode),
            True,
        )

    def supports_temperature_range_target(self, entity_id: str) -> bool:
        return self.temperature_range_support.get(entity_id, False)

    def validate_temperature_target(
        self,
        entity_id: str,
        *,
        range_target: bool,
        hvac_mode: str | None,
        ensure_on: bool,
    ) -> None:
        if range_target:
            if not self.supports_temperature_range_target(entity_id):
                raise ValueError(f"{entity_id} does not support a temperature range target")
            if hvac_mode is not None and hvac_mode != "heat_cool":
                raise ValueError(
                    f"{entity_id} cannot apply a temperature range while in {hvac_mode} mode"
                )
            return
        if not self.supports_single_temperature_target(
            entity_id, hvac_mode, ensure_on=ensure_on
        ) and not (
            ensure_on
            and self.current_hvac_modes.get(entity_id) == "off"
            and hvac_mode != "heat_cool"
        ):
            raise ValueError(f"{entity_id} does not support a single temperature target")

    def validate_configured_temperature_target(
        self,
        entity_id: str,
        *,
        range_target: bool,
        hvac_mode: str | None,
    ) -> None:
        modes = self.supported_hvac_modes(entity_id)
        candidates = [hvac_mode] if hvac_mode is not None else [
            mode for mode in modes if mode != "off"
        ]
        if hvac_mode is not None and hvac_mode not in modes:
            raise ValueError(f"HVAC mode {hvac_mode} is not supported by {entity_id}")
        if range_target:
            if not self.supports_temperature_range_target(entity_id):
                raise ValueError(f"{entity_id} does not support a temperature range target")
            if "heat_cool" not in candidates:
                raise ValueError(f"{entity_id} has no compatible range target mode")
            return
        compatible = any(
            mode != "off"
            and (
                (
                    mode != "heat_cool"
                    and (
                        self.current_hvac_modes.get(entity_id) == "off"
                        or self.supports_single_temperature_target(
                            entity_id,
                            mode,
                            ensure_on=True,
                        )
                    )
                )
                or self.supports_single_temperature_target(
                    entity_id,
                    mode,
                    ensure_on=True,
                )
            )
            for mode in candidates
        )
        if not compatible:
            raise ValueError(f"{entity_id} has no compatible single temperature target mode")
        if (
            self.current_hvac_modes.get(entity_id) != "off"
            and not any(
                self.supports_single_temperature_target(
                    entity_id,
                    mode,
                    ensure_on=True,
                )
                for mode in candidates
            )
        ):
            raise ValueError(f"{entity_id} does not support a single temperature target")


def _scheduler_data_for_zones(entity_ids: list[str]):
    return {
        "version": 1,
        "global_": {
            "mode": MODE_AUTO,
            "paused_until": None,
            "paused_started_at": None,
        },
        "zones": {
            entity_id: {
                "enabled": True,
                "schedule": empty_week_schedule(),
                "override": None,
            }
            for entity_id in entity_ids
        },
        "settings": normalize_panel_settings(None, entity_ids),
        "templates": [],
        "templates_seeded": True,
    }


def _make_scheduler(data):
    async def _async_save() -> None:
        return None

    return VelairScheduler(
        FakeHass(),
        data,
        FakeClimateManager(),
        _async_save,
    )


if __name__ == "__main__":
    unittest.main()
