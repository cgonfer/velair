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

    const = ModuleType("homeassistant.const")
    const.ATTR_ENTITY_ID = "entity_id"
    const.Platform = SimpleNamespace(
        SENSOR="sensor",
        SELECT="select",
        SWITCH="switch",
    )
    sys.modules["homeassistant.const"] = const

    core = ModuleType("homeassistant.core")
    core.CALLBACK_TYPE = object
    core.HomeAssistant = object
    sys.modules["homeassistant.core"] = core

    helpers = ModuleType("homeassistant.helpers")
    helpers.__path__ = []
    sys.modules["homeassistant.helpers"] = helpers

    dispatcher = ModuleType("homeassistant.helpers.dispatcher")
    dispatcher.async_dispatcher_send = lambda *args, **kwargs: None
    sys.modules["homeassistant.helpers.dispatcher"] = dispatcher

    event = ModuleType("homeassistant.helpers.event")
    event.async_track_point_in_time = lambda *args, **kwargs: (lambda: None)
    sys.modules["homeassistant.helpers.event"] = event

    util = ModuleType("homeassistant.util")
    util.__path__ = []
    sys.modules["homeassistant.util"] = util

    dt = ModuleType("homeassistant.util.dt")
    dt.now = lambda: NOW
    dt.as_local = lambda value: value
    dt.parse_datetime = _parse_datetime
    sys.modules["homeassistant.util.dt"] = dt


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


_install_homeassistant_stubs()
_install_custom_component_package_stub()

scheduler_module = importlib.import_module("custom_components.velair.scheduler")
models_module = importlib.import_module("custom_components.velair.models")
const_module = importlib.import_module("custom_components.velair.const")

VelairScheduler = scheduler_module.VelairScheduler
DEFAULT_SCHEDULE_TEMPLATES_VERSION = models_module.DEFAULT_SCHEDULE_TEMPLATES_VERSION
WEEKDAYS = models_module.WEEKDAYS
empty_week_schedule = models_module.empty_week_schedule
normalize_schedule_blocks = models_module.normalize_schedule_blocks
normalize_schedule_data = models_module.normalize_schedule_data
normalize_panel_settings = models_module.normalize_panel_settings
ACTION_SET_TEMPERATURE = const_module.ACTION_SET_TEMPERATURE
ACTION_TURN_OFF = const_module.ACTION_TURN_OFF
EVENT_TYPE_BOOST_ENDED = const_module.EVENT_TYPE_BOOST_ENDED
EVENT_TYPE_BOOST_STARTED = const_module.EVENT_TYPE_BOOST_STARTED
EVENT_TYPE_CLIMATE_TARGET_APPLIED = const_module.EVENT_TYPE_CLIMATE_TARGET_APPLIED
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

    async def async_set_temperature(
        self,
        entity_id: str,
        temperature: float,
        *,
        ensure_on: bool = False,
        hvac_mode: str | None = None,
    ) -> None:
        self.calls.append(("set_temperature", entity_id, temperature, ensure_on, hvac_mode))

    async def async_turn_off(self, entity_id: str) -> None:
        self.calls.append(("turn_off", entity_id))

    def climate_state_snapshot(self, entity_id: str) -> dict:
        return dict(self.snapshots.get(entity_id, {}))

    async def async_restore_state(self, entity_id: str, snapshot: dict) -> None:
        self.calls.append(("restore_state", entity_id, dict(snapshot)))

    def temperature_limits(self, entity_id: str) -> tuple[float, float]:
        return self.limits.get(entity_id, (5.0, 35.0))


def _scheduler_data_for_zones(entity_ids: list[str]):
    return {
        "version": 1,
        "global_": {
            "mode": MODE_AUTO,
            "vacation": None,
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
