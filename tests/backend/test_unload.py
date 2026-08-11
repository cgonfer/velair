"""Config-entry unload ordering and cleanup tests."""

from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import AsyncMock

from . import helpers


def _module(name: str, **attributes) -> ModuleType:
    module = ModuleType(name)
    for key, value in attributes.items():
        setattr(module, key, value)
    return module


def _load_integration_init():
    """Load the real integration entrypoint with narrow dependency stubs."""
    import homeassistant.config_entries as config_entries
    import homeassistant.const as ha_const
    import homeassistant.core as core
    import homeassistant.helpers as ha_helpers

    class ConfigEntry:
        @classmethod
        def __class_getitem__(cls, _item):
            return cls

    config_entries.ConfigEntry = ConfigEntry
    ha_const.EVENT_CORE_CONFIG_UPDATE = "core_config_updated"
    core.Event = object
    typing_module = _module(
        "homeassistant.helpers.typing",
        ConfigType=dict,
    )
    entity_registry_module = _module(
        "homeassistant.helpers.entity_registry",
        EntityRegistry=object,
        async_get=lambda _hass: None,
    )
    ha_helpers.entity_registry = entity_registry_module
    dependencies = {
        "custom_components.velair.api": _module(
            "custom_components.velair.api", async_setup_api=AsyncMock()
        ),
        "custom_components.velair.climate_delivery": _module(
            "custom_components.velair.climate_delivery",
            ClimateDeliveryCoordinator=object,
        ),
        "custom_components.velair.climate_manager": _module(
            "custom_components.velair.climate_manager", ClimateManager=object
        ),
        "custom_components.velair.config_helpers": _module(
            "custom_components.velair.config_helpers",
            get_configured_climate_entities=lambda _entry: [],
            should_apply_active_schedule_on_startup=lambda _entry: False,
        ),
        "custom_components.velair.entity_registry": _module(
            "custom_components.velair.entity_registry",
            cleanup_entity_registry=lambda *_args: None,
        ),
        "custom_components.velair.frontend": _module(
            "custom_components.velair.frontend",
            async_setup_frontend=AsyncMock(),
            async_setup_frontend_route=AsyncMock(),
            async_unload_frontend=AsyncMock(),
        ),
        "custom_components.velair.scheduler": _module(
            "custom_components.velair.scheduler", VelairScheduler=object
        ),
        "custom_components.velair.services": _module(
            "custom_components.velair.services",
            async_setup_services=AsyncMock(),
            async_unload_services=AsyncMock(),
        ),
        "custom_components.velair.storage": _module(
            "custom_components.velair.storage", VelairStorage=object
        ),
        "custom_components.velair.temperature_migration": _module(
            "custom_components.velair.temperature_migration",
            async_dismiss_temperature_migration_notification=AsyncMock(),
            async_notify_temperature_migration=AsyncMock(),
        ),
        "homeassistant.helpers.typing": typing_module,
        "homeassistant.helpers.entity_registry": entity_registry_module,
    }
    previous = {name: sys.modules.get(name) for name in dependencies}
    sys.modules.update(dependencies)
    try:
        path = Path(helpers.ROOT) / "custom_components" / "velair" / "__init__.py"
        spec = importlib.util.spec_from_file_location(
            "custom_components.velair._unload_test_subject", path
        )
        module = importlib.util.module_from_spec(spec)
        module.__package__ = "custom_components.velair"
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        return module
    finally:
        for name, old_module in previous.items():
            if old_module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = old_module


integration = _load_integration_init()


class VelairUnloadTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        integration.PLATFORMS = ("sensor",)
        integration.async_unload_frontend = AsyncMock()
        integration.async_unload_services = AsyncMock()
        self.scheduler = SimpleNamespace(async_stop=AsyncMock())
        self.delivery = SimpleNamespace(async_stop=AsyncMock())
        self.entry = SimpleNamespace(
            entry_id="entry-1",
            runtime_data=SimpleNamespace(
                scheduler=self.scheduler,
                climate_delivery=self.delivery,
            ),
        )
        self.unload_platforms = AsyncMock(return_value=True)
        self.hass = SimpleNamespace(
            config_entries=SimpleNamespace(
                async_unload_platforms=self.unload_platforms
            ),
            data={"velair": {"entry-1": object()}},
        )

    async def test_platform_unload_false_keeps_runtime_running(self) -> None:
        self.unload_platforms.return_value = False

        self.assertFalse(
            await integration.async_unload_entry(self.hass, self.entry)
        )

        self.scheduler.async_stop.assert_not_awaited()
        self.delivery.async_stop.assert_not_awaited()
        integration.async_unload_frontend.assert_not_awaited()
        self.assertIn("entry-1", self.hass.data["velair"])

    async def test_scheduler_stop_failure_still_completes_successful_unload(self) -> None:
        self.scheduler.async_stop.side_effect = RuntimeError("restore failed")

        with self.assertLogs(
            "custom_components.velair._unload_test_subject", level="ERROR"
        ):
            self.assertTrue(
                await integration.async_unload_entry(self.hass, self.entry)
            )

        self.delivery.async_stop.assert_awaited_once_with()
        integration.async_unload_frontend.assert_awaited_once_with(self.hass)
        integration.async_unload_services.assert_awaited_once_with(self.hass)
        self.assertNotIn("entry-1", self.hass.data["velair"])


if __name__ == "__main__":
    unittest.main()
