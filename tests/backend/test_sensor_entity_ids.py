"""Explicit registry review and rename safety contracts."""

from copy import deepcopy
import importlib
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

import attr

from .test_entity_registry import registry_module


@attr.s(frozen=True, auto_attribs=True)
class RegistryEntry:
    entity_id: str
    unique_id: str
    config_entry_id: str = "entry"
    platform: str = "velair"
    name: str | None = "My custom name"
    original_name: str = "Translated original"
    object_id_base: str = "old"
    suggested_object_id: str | None = "old_suggestion"
    disabled_by: str | None = "user"
    has_entity_name: bool = False
    device_id: str | None = None
    _cache: dict = attr.ib(factory=dict, eq=False, init=False)


class Registry:
    def __init__(self):
        self.entities = {
            f"sensor.old_{key}": RegistryEntry(
                f"sensor.old_{key}", f"entry_climate_living_room_{key}")
            for key in registry_module.ZONE_SENSOR_UNIQUE_ID_SUFFIXES
        }
        self.updated = []
        self.failures = set()

    def async_regenerate_entity_id(self, entry, *, reserved_entity_ids):
        assert entry.name is None
        assert entry.suggested_object_id is None
        base = f"sensor.velair_{entry.object_id_base}"
        proposed = base
        index = 2
        while proposed in reserved_entity_ids or (proposed in self.entities and proposed != entry.entity_id):
            proposed = f"{base}_{index}"
            index += 1
        return proposed

    def async_update_entity(self, entity_id, *, new_entity_id):
        self.updated.append((entity_id, new_entity_id))
        if entity_id in self.failures:
            raise ValueError("Test registry failure")
        if new_entity_id in self.entities:
            raise ValueError("ID occupied")
        self.entities[new_entity_id] = attr.evolve(self.entities.pop(entity_id), entity_id=new_entity_id)


class SensorEntityIdReviewTest(unittest.TestCase):
    def setUp(self):
        self.reset_registry()
        registry_patch = patch.object(registry_module.er, "async_get", lambda _: self.registry, create=True)
        registry_patch.start()
        self.addCleanup(registry_patch.stop)

    def reset_registry(self):
        self.registry = Registry()
        self.entry = SimpleNamespace(entry_id="entry", data={"climate_entities": ["climate.living_room"]}, options={})
        self.hass = SimpleNamespace(data={"velair": {"entry": {"entry": self.entry}}})

    def preview(self):
        return registry_module.preview_sensor_entity_ids(self.hass, self.entry)

    def apply(self, preview, ids):
        return registry_module.apply_sensor_entity_ids(self.hass, self.entry, preview["preview_id"], ids)

    def test_preview_is_read_only_and_includes_nine_disabled_custom_rows(self):
        before = deepcopy(self.registry.entities)
        self.registry.entities["sensor.foreign"] = RegistryEntry("sensor.foreign", "entry_climate_living_room_control", platform="foreign")
        self.registry.entities["sensor.unmanaged"] = RegistryEntry("sensor.unmanaged", "entry_climate_other_control")
        self.registry.entities["sensor.global"] = RegistryEntry("sensor.global", "entry_next_climate_event")
        preview = self.preview()
        self.assertEqual(9, len(preview["rows"]))
        self.assertTrue(all(row["status"] == "ready" for row in preview["rows"]))
        self.assertTrue(all(row["name"] == "My custom name" for row in preview["rows"]))
        self.assertEqual(before, {key: self.registry.entities[key] for key in before})
        self.assertEqual([], self.registry.updated)

    def test_selected_only_preserves_unique_id_name_and_disabled_state(self):
        preview = self.preview()
        row = preview["rows"][0]
        before = self.registry.entities[row["entity_id"]]
        result = self.apply(preview, [row["entity_id"]])
        self.assertEqual("applied", result["status"])
        after = self.registry.entities[row["proposed_entity_id"]]
        self.assertEqual(attr.evolve(before, entity_id=after.entity_id), after)
        self.assertEqual(1, len(self.registry.updated))
        self.assertEqual("unchanged", next(r["status"] for r in result["preview"]["rows"] if r["entity_id"] == after.entity_id))

    def test_empty_duplicates_unknown_and_unchanged_are_rejected_before_write(self):
        preview = self.preview()
        entity_id = preview["rows"][0]["entity_id"]
        for ids in ([], [entity_id, entity_id], ["sensor.foreign"]):
            with self.subTest(ids=ids), self.assertRaisesRegex(ValueError, "invalid_sensor_entity_ids"):
                self.apply(preview, ids)
        self.assertEqual([], self.registry.updated)

    def test_config_ownership_current_name_current_id_and_occupancy_invalidate(self):
        for change in ("config", "ownership", "name", "id", "occupancy", "source"):
            with self.subTest(change=change):
                self.reset_registry()
                preview = self.preview()
                entity_id = preview["rows"][0]["entity_id"]
                if change == "config":
                    self.entry.options["test"] = True
                elif change == "source":
                    self.entry.data["climate_entities"] = ["climate.renamed"]
                elif change == "ownership":
                    self.registry.entities[entity_id] = attr.evolve(self.registry.entities[entity_id], config_entry_id="other")
                elif change == "name":
                    self.registry.entities[entity_id] = attr.evolve(self.registry.entities[entity_id], name="New name")
                elif change == "id":
                    self.registry.entities["sensor.custom"] = self.registry.entities.pop(entity_id)
                else:
                    proposed = preview["rows"][0]["proposed_entity_id"]
                    self.registry.entities[proposed] = RegistryEntry(proposed, "foreign")
                with self.assertRaisesRegex(ValueError, "sensor_entity_ids_stale"):
                    self.apply(preview, [entity_id])
                self.assertEqual([], self.registry.updated)

    def test_native_collision_suffix_is_used(self):
        self.registry.entities["sensor.velair_living_room_control"] = RegistryEntry("sensor.velair_living_room_control", "foreign")
        row = next(row for row in self.preview()["rows"] if row["sensor_key"] == "control")
        self.assertEqual("sensor.velair_living_room_control_2", row["proposed_entity_id"])

    def test_legacy_registry_without_native_generator_is_safe_conflict(self):
        self.registry.async_regenerate_entity_id = None
        preview = self.preview()
        self.assertTrue(all(row["status"] == "conflict" for row in preview["rows"]))
        with self.assertRaisesRegex(ValueError, "invalid_sensor_entity_ids"):
            self.apply(preview, [preview["rows"][0]["entity_id"]])

    def test_legacy_native_allocator_and_allocator_without_reserved_keyword(self):
        self.registry.async_regenerate_entity_id = None
        for supports_reserved in (False, True):
            def allocate(domain, candidate, *, current_entity_id=None, **kwargs):
                if not supports_reserved and kwargs:
                    raise TypeError("No reserved keyword")
                return f"{domain}.{candidate}"
            self.registry.async_get_available_entity_id = allocate
            preview = self.preview()
            self.assertTrue(all(row["status"] == "ready" for row in preview["rows"]))
            self.assertEqual("sensor.living_room_air_quality", next(
                row["proposed_entity_id"] for row in preview["rows"]
                if row["sensor_key"] == "air_quality"))

    def test_registry_serializer_cache_does_not_invalidate_preview(self):
        preview = self.preview()
        for item in self.registry.entities.values():
            item._cache["display"] = {"name": item.name}
        self.assertEqual(preview, self.preview())

    def test_legacy_allocator_uses_native_device_name_prefix(self):
        self.registry.async_regenerate_entity_id = None
        self.registry.entities = {
            entity_id: attr.evolve(item, has_entity_name=True, device_id="device")
            for entity_id, item in self.registry.entities.items()
        }
        self.registry.async_generate_entity_id = lambda domain, candidate, **kwargs: f"{domain}.{candidate.lower().replace(' ', '_')}"
        device_registry = SimpleNamespace(async_get=lambda _: SimpleNamespace(
            async_get=lambda _: SimpleNamespace(name_by_user="My Velair", name="Velair")))
        with patch.dict("sys.modules", {"homeassistant.helpers.device_registry": device_registry}):
            preview = self.preview()
        self.assertTrue(all(row["proposed_entity_id"].startswith("sensor.my_velair_living_room_")
                            for row in preview["rows"]))

    def test_invalid_native_proposal_cannot_be_selected(self):
        self.registry.async_regenerate_entity_id = lambda *args, **kwargs: "switch.foreign"
        preview = self.preview()
        self.assertTrue(all(row["status"] == "conflict" for row in preview["rows"]))
        with self.assertRaisesRegex(ValueError, "invalid_sensor_entity_ids"):
            self.apply(preview, [preview["rows"][0]["entity_id"]])
        self.assertEqual([], self.registry.updated)

    def test_unchanged_row_cannot_be_applied(self):
        preview = self.preview()
        row = preview["rows"][0]
        result = self.apply(preview, [row["entity_id"]])
        with self.assertRaisesRegex(ValueError, "invalid_sensor_entity_ids"):
            self.apply(result["preview"], [row["proposed_entity_id"]])

    def test_failed_rename_rolls_back_and_failed_rollback_reports_recovery(self):
        for rollback_fails in (False, True):
            with self.subTest(rollback_fails=rollback_fails):
                self.reset_registry()
                before = deepcopy(self.registry.entities)
                preview = self.preview()
                first, second = preview["rows"][:2]
                self.registry.failures.add(second["entity_id"])
                if rollback_fails:
                    self.registry.failures.add(first["proposed_entity_id"])
                result = self.apply(preview, [first["entity_id"], second["entity_id"]])
                self.assertEqual("recovery_required" if rollback_fails else "rolled_back", result["status"])
                self.assertEqual(1 if rollback_fails else 0, len(result["renamed"]))
                if not rollback_fails:
                    self.assertEqual(before, self.registry.entities)

    def test_exception_after_registry_commit_rolls_back_the_failed_row(self):
        before = deepcopy(self.registry.entities)
        preview = self.preview()
        row = preview["rows"][0]
        original_update = self.registry.async_update_entity

        def mutate_then_raise(entity_id, *, new_entity_id):
            original_update(entity_id, new_entity_id=new_entity_id)
            if entity_id == row["entity_id"]:
                raise RuntimeError("Listener failed after commit")

        self.registry.async_update_entity = mutate_then_raise
        result = self.apply(preview, [row["entity_id"]])
        self.assertEqual("rolled_back", result["status"])
        self.assertEqual([], result["renamed"])
        self.assertEqual(before, self.registry.entities)

    def test_websocket_requires_admin_and_loaded_runtime_without_scheduler_calls(self):
        api = importlib.import_module("custom_components.velair.api")
        connection = SimpleNamespace(user=SimpleNamespace(is_admin=False), send_error=Mock(), send_result=Mock())
        api.ws_preview_sensor_entity_ids(self.hass, connection, {"id": 1})
        self.assertEqual("unauthorized", connection.send_error.call_args.args[1])
        api.ws_apply_sensor_entity_ids(self.hass, connection, {"id": 1, "preview_id": "old", "entity_ids": []})
        self.assertEqual("unauthorized", connection.send_error.call_args.args[1])
        connection.user.is_admin = True
        with patch.dict("sys.modules", {"custom_components.velair.entity_registry": registry_module}):
            api.ws_preview_sensor_entity_ids(self.hass, connection, {"id": 2})
        self.assertEqual(9, len(connection.send_result.call_args.args[1]["rows"]))
        self.hass.data.clear()
        api.ws_apply_sensor_entity_ids(self.hass, connection, {"id": 3, "preview_id": "old", "entity_ids": []})
        self.assertEqual("not_loaded", connection.send_error.call_args.args[1])
