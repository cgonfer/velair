"""Control entity behavior tests."""

from __future__ import annotations

import importlib
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import AsyncMock

from . import helpers


def _load_switch_module():
    """Load switch.py with the small Home Assistant entity surface it needs."""
    module_names = (
        "homeassistant.components.switch",
        "homeassistant.helpers.entity_platform",
        "custom_components.velair.entity",
    )
    previous_modules = {
        name: sys.modules.get(name)
        for name in module_names
    }
    package = sys.modules["custom_components.velair"]
    previous_entry_type = getattr(package, "VelairConfigEntry", None)

    class FakeVelairEntity:
        def __init__(self, entry, key: str) -> None:
            self._entry = entry
            self._attr_unique_id = f"{entry.entry_id}_{key}"

        @property
        def scheduler(self):
            return self._entry.runtime_data.scheduler

    try:
        switch_platform = ModuleType("homeassistant.components.switch")
        switch_platform.SwitchEntity = object
        sys.modules["homeassistant.components.switch"] = switch_platform

        entity_platform = ModuleType("homeassistant.helpers.entity_platform")
        entity_platform.AddConfigEntryEntitiesCallback = object
        sys.modules["homeassistant.helpers.entity_platform"] = entity_platform

        velair_entity = ModuleType("custom_components.velair.entity")
        velair_entity.VelairEntity = FakeVelairEntity
        sys.modules["custom_components.velair.entity"] = velair_entity

        package.VelairConfigEntry = object
        return importlib.import_module("custom_components.velair.switch")
    finally:
        for name, previous in previous_modules.items():
            if previous is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = previous
        if previous_entry_type is None:
            delattr(package, "VelairConfigEntry")
        else:
            package.VelairConfigEntry = previous_entry_type


switch_module = _load_switch_module()


class AutomaticSchedulingSwitchTest(unittest.IsolatedAsyncioTestCase):
    """Verify the only writable entity maps cleanly to stop and resume."""

    async def test_switch_stops_indefinitely_and_resumes_current_schedule(self) -> None:
        scheduler = SimpleNamespace(
            mode=helpers.MODE_AUTO,
            temperature_migration_blocked=False,
            async_set_mode=AsyncMock(),
        )
        entry = SimpleNamespace(
            entry_id="entry",
            runtime_data=SimpleNamespace(scheduler=scheduler),
        )
        entity = switch_module.AutomaticSchedulingSwitch(entry)

        self.assertTrue(entity.available)
        self.assertTrue(entity.is_on)
        await entity.async_turn_off()
        scheduler.async_set_mode.assert_awaited_once_with(helpers.MODE_PAUSED)

        scheduler.async_set_mode.reset_mock()
        scheduler.mode = helpers.MODE_PAUSED
        self.assertFalse(entity.is_on)
        await entity.async_turn_on()
        scheduler.async_set_mode.assert_awaited_once_with(
            helpers.MODE_AUTO,
            apply_current_schedule=True,
        )

        scheduler.temperature_migration_blocked = True
        self.assertFalse(entity.available)

    def test_platforms_include_the_native_mode_select(self) -> None:
        self.assertEqual(
            helpers.const_module.PLATFORMS,
            ("sensor", "select", "switch"),
        )


if __name__ == "__main__":
    unittest.main()
