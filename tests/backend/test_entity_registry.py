"""Entity registry cleanup tests."""

from __future__ import annotations

import importlib
import sys
from types import ModuleType, SimpleNamespace
import unittest

from . import helpers


def _load_registry_module():
    """Load registry maintenance with a small Home Assistant registry stub."""
    module_name = "homeassistant.helpers.entity_registry"
    previous_module = sys.modules.get(module_name)
    entity_registry = ModuleType(module_name)
    sys.modules[module_name] = entity_registry
    try:
        module = importlib.import_module("custom_components.velair.entity_registry")
        return module, entity_registry
    finally:
        if previous_module is None:
            sys.modules.pop(module_name, None)
        else:
            sys.modules[module_name] = previous_module


registry_module, entity_registry_module = _load_registry_module()


class FakeRegistry:
    """Small registry surface used by cleanup_entity_registry."""

    def __init__(self, entities: dict[str, SimpleNamespace]) -> None:
        self.entities = entities
        self.removed: list[str] = []
        self.updated: list[tuple[str, dict[str, str]]] = []

    def async_get_entity_id(
        self,
        domain: str,
        platform: str,
        unique_id: str,
    ) -> str | None:
        for entity_id, entry in self.entities.items():
            if (
                entity_id.startswith(f"{domain}.")
                and entry.platform == platform
                and entry.unique_id == unique_id
            ):
                return entity_id
        return None

    def async_remove(self, entity_id: str) -> None:
        self.removed.append(entity_id)

    def async_update_entity(self, entity_id: str, **changes: str) -> None:
        self.updated.append((entity_id, changes))


def _entry(
    unique_id: str,
    *,
    config_entry_id: str = "entry",
    platform: str = "velair",
) -> SimpleNamespace:
    return SimpleNamespace(
        config_entry_id=config_entry_id,
        platform=platform,
        unique_id=unique_id,
    )


class EntityRegistryCleanupTest(unittest.TestCase):
    """Verify cleanup removes only obsolete Velair entities."""

    def test_cleanup_removes_stale_zone_sensors_and_retired_select(self) -> None:
        registry = FakeRegistry(
            {
                "sensor.living_target": _entry(
                    "entry_climate_living_active_target_temperature"
                ),
                "sensor.old_target": _entry(
                    "entry_climate_old_active_target_temperature"
                ),
                "sensor.old_comfort": _entry(
                    "entry_climate_old_environmental_condition"
                ),
                "sensor.next_event": _entry("entry_next_climate_event"),
                "sensor.other_entry": _entry(
                    "other_climate_old_environmental_condition",
                    config_entry_id="other",
                ),
                "sensor.other_platform": _entry(
                    "entry_climate_old_environmental_condition",
                    platform="other",
                ),
                "sensor.unknown_velair_sensor": _entry(
                    "entry_climate_old_future_sensor"
                ),
                "select.scheduler_mode": _entry("entry_scheduler_mode"),
            }
        )
        entity_registry_module.async_get = lambda hass: registry

        registry_module.cleanup_entity_registry(
            SimpleNamespace(),
            SimpleNamespace(entry_id="entry"),
            ["climate.living"],
        )

        self.assertEqual(
            set(registry.removed),
            {
                "sensor.old_target",
                "sensor.old_comfort",
                "select.scheduler_mode",
            },
        )

    def test_cleanup_preserves_all_current_zone_sensor_unique_ids(self) -> None:
        entities = {
            f"sensor.zone_{index}": _entry(
                registry_module._zone_sensor_unique_id(
                    "entry",
                    "climate.living",
                    suffix,
                )
            )
            for index, suffix in enumerate(
                helpers.const_module.ZONE_SENSOR_UNIQUE_ID_SUFFIXES
            )
        }
        registry = FakeRegistry(entities)
        entity_registry_module.async_get = lambda hass: registry

        registry_module.cleanup_entity_registry(
            SimpleNamespace(),
            SimpleNamespace(entry_id="entry"),
            ["climate.living"],
        )

        self.assertEqual(registry.removed, [])

    def test_cleanup_migrates_default_mode_select_entity_id_and_unique_id(self) -> None:
        registry = FakeRegistry(
            {
                "select.velair_profile_mode": _entry("entry_profile_mode"),
            }
        )
        entity_registry_module.async_get = lambda hass: registry

        registry_module.cleanup_entity_registry(
            SimpleNamespace(),
            SimpleNamespace(entry_id="entry"),
            [],
        )

        self.assertEqual(
            registry.updated,
            [
                (
                    "select.velair_profile_mode",
                    {
                        "new_unique_id": "entry_mode",
                        "new_entity_id": "select.velair_mode",
                    },
                )
            ],
        )

    def test_cleanup_preserves_customized_mode_select_entity_id(self) -> None:
        registry = FakeRegistry(
            {
                "select.house_state": _entry("entry_profile_mode"),
            }
        )
        entity_registry_module.async_get = lambda hass: registry

        registry_module.cleanup_entity_registry(
            SimpleNamespace(),
            SimpleNamespace(entry_id="entry"),
            [],
        )

        self.assertEqual(
            registry.updated,
            [
                (
                    "select.house_state",
                    {"new_unique_id": "entry_mode"},
                )
            ],
        )


if __name__ == "__main__":
    unittest.main()
