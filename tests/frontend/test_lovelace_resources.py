"""Behavioral coverage for automatic Lovelace resource maintenance."""

from __future__ import annotations

import asyncio
import importlib
import json
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from .test_frontend_contracts import (
    FakeHass,
    ROOT,
    _install_custom_component_package_stub,
    _install_homeassistant_stubs,
    _loaded_velair_integration,
)

CURRENT = "/velair_frontend/velair-card.js"
LEGACY = "/local/velair-card.js"


class ResourceCollection:
    """Model HA's lazy disk load and CRUD interface, not direct store writes."""

    def __init__(self, items=(), *, yaml=False, fail=None):
        self.loaded = yaml
        self.disk = [dict(item) for item in items]
        self.items = list(self.disk) if yaml else []
        self.calls = []
        self.fail = fail
        if not yaml:
            self.store = SimpleNamespace(key="lovelace_resources", version=1)

    async def async_get_info(self):
        await asyncio.sleep(0)
        if self.fail == "load":
            raise OSError("cannot read resource collection")
        if not self.loaded:
            self.items = [dict(item) for item in self.disk]
            self.loaded = True
        return {"resources": len(self.items)}

    def async_items(self):
        if not self.loaded:
            raise AssertionError("Resource list read before loading")
        return list(self.items)

    async def _mutation(self, operation, *args):
        if not self.loaded or not hasattr(self, "store"):
            raise AssertionError("Mutation of unloaded or YAML resources")
        self.calls.append((operation, *args))
        await asyncio.sleep(0)
        if self.fail == operation:
            raise OSError(f"cannot {operation} resource")

    async def async_create_item(self, data):
        await self._mutation("create", data)
        item = {"id": "new", "url": data["url"], "type": data["res_type"]}
        self.items.append(item)
        return item

    async def async_update_item(self, item_id, data):
        await self._mutation("update", item_id, data)
        for i, item in enumerate(self.items):
            if item["id"] == item_id:
                self.items[i] = {**item, "url": data["url"], "type": data["res_type"]}
                return self.items[i]
        raise KeyError(item_id)

    async def async_delete_item(self, item_id):
        await self._mutation("delete", item_id)
        self.items = [item for item in self.items if item["id"] != item_id]


def resource(item_id, url=CURRENT, resource_type="module"):
    return {"id": item_id, "url": url, "type": resource_type}


class LovelaceResourceTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        modules = patch.dict(sys.modules)
        modules.__enter__()
        self.addCleanup(modules.__exit__, None, None, None)
        self.panels = _install_homeassistant_stubs()
        _install_custom_component_package_stub()
        sys.modules.pop("custom_components.velair.frontend", None)
        self.frontend = importlib.import_module("custom_components.velair.frontend")
        temp = TemporaryDirectory(prefix="velair-lovelace-test-")
        self.addCleanup(temp.cleanup)
        self.bundle = Path(temp.name) / "velair-card.js"
        self.bundle.write_text("// test bundle", encoding="utf-8")
        os.utime(self.bundle, ns=(1_000_000_000, 1_000_000_000))
        self.frontend.FRONTEND_DIR = self.bundle.parent
        self.hass = FakeHass()

    def attach(self, collection, *, old=False):
        self.hass.data["lovelace"] = (
            {"resources": collection} if old else SimpleNamespace(resources=collection)
        )
        return collection

    async def ensure_resource(self):
        await self.frontend.async_setup_frontend_resources(self.hass)

    async def test_first_install_loads_existing_disk_entries_before_creating(self):
        other = resource("other", "/hacsfiles/other/card.js?hacstag=1")
        collection = self.attach(ResourceCollection([other]))
        await self.ensure_resource()
        self.assertEqual(collection.items, [other, resource("new", CURRENT + "?v=1000000000")])
        self.assertEqual([call[0] for call in collection.calls], ["create"])

    async def test_registers_resource_during_early_integration_setup(self):
        collection = self.attach(ResourceCollection())
        with _loaded_velair_integration(self.frontend) as integration:
            self.assertTrue(await integration.async_setup(self.hass, {}))
        self.assertEqual(len(collection.items), 1)
        self.assertEqual(self.panels["panels"], [])
        self.assertEqual(len(self.hass.http.views), 1)

    async def test_panel_and_resource_share_exact_module_url(self):
        collection = self.attach(ResourceCollection())
        await self.frontend.async_setup_frontend(self.hass)
        self.assertEqual(collection.items[0]["url"], self.panels["panels"][0][1]["module_url"])

    async def test_repeated_setup_and_restart_do_not_write_again(self):
        collection = self.attach(ResourceCollection())
        await self.ensure_resource()
        await self.ensure_resource()
        saved = [dict(item) for item in collection.items]
        self.hass = FakeHass()
        restarted = self.attach(ResourceCollection(saved))
        await self.ensure_resource()
        self.assertEqual(restarted.items, saved)
        self.assertEqual(restarted.calls, [])
        self.assertEqual(len(collection.calls), 1)

    async def test_upgrade_and_downgrade_update_same_resource_id(self):
        collection = self.attach(ResourceCollection([resource("existing")]))
        for stamp in (1_000_000_000, 2_000_000_000, 1_000_000_000):
            os.utime(self.bundle, ns=(stamp, stamp))
            await self.ensure_resource()
            self.assertEqual(collection.items, [resource("existing", f"{CURRENT}?v={stamp}")])
        self.assertEqual([call[0] for call in collection.calls], ["update"] * 3)

    async def test_existing_parameters_and_fragment_do_not_create_second_entry(self):
        collection = self.attach(ResourceCollection([resource("existing", CURRENT + "?v=old&custom=1#fragment")]))
        await self.ensure_resource()
        self.assertEqual(collection.items, [resource("existing", CURRENT + "?v=1000000000")])
        self.assertEqual(collection.calls[0][0], "update")

    async def test_wrong_type_is_corrected(self):
        collection = self.attach(ResourceCollection([resource("existing", CURRENT, "js")]))
        await self.ensure_resource()
        self.assertEqual(collection.items[0]["type"], "module")
        self.assertEqual(collection.items[0]["id"], "existing")

    async def test_old_lovelace_mapping_is_supported(self):
        collection = self.attach(ResourceCollection(), old=True)
        await self.ensure_resource()
        self.assertEqual(len(collection.items), 1)

    async def test_legacy_entry_migrates_without_changing_id(self):
        collection = self.attach(ResourceCollection([resource("legacy", LEGACY + "?v=old")]))
        await self.ensure_resource()
        self.assertEqual(collection.items, [resource("legacy", CURRENT + "?v=1000000000")])

    async def test_duplicates_keep_current_correct_type_and_preserve_other_resources(self):
        other = resource("other", "/local/some-other-card.js")
        collection = self.attach(ResourceCollection([
            resource("legacy", LEGACY), resource("wrong", CURRENT, "js"),
            resource("keep", CURRENT + "?v=old"), resource("duplicate"), other,
        ]))
        await self.ensure_resource()
        self.assertEqual(collection.items, [resource("keep", CURRENT + "?v=1000000000"), other])
        self.assertEqual(collection.calls[0][0], "update")
        self.assertEqual([call[0] for call in collection.calls[1:]], ["delete"] * 3)

    async def test_only_legacy_duplicates_are_migrated_and_consolidated(self):
        collection = self.attach(ResourceCollection([resource("keep", LEGACY), resource("dup", LEGACY + "?v=1")]))
        await self.ensure_resource()
        self.assertEqual(collection.items, [resource("keep", CURRENT + "?v=1000000000")])

    async def test_external_and_similarly_named_paths_are_untouched(self):
        others = [resource(str(i), url) for i, url in enumerate((
            "https://example.org" + CURRENT, "//example.org" + CURRENT,
            "/local/other/velair-card.js", CURRENT + ".old", "/velair_frontend/other.js",
        ))]
        collection = self.attach(ResourceCollection(others))
        await self.ensure_resource()
        self.assertEqual(collection.items[:-1], others)
        self.assertEqual([call[0] for call in collection.calls], ["create"])

    async def test_concurrent_setup_creates_only_one_entry(self):
        collection = self.attach(ResourceCollection())
        await asyncio.gather(*(self.ensure_resource() for _ in range(5)))
        self.assertEqual(len(collection.items), 1)
        self.assertEqual([call[0] for call in collection.calls], ["create"])

    async def test_valid_yaml_is_silent_and_never_modified(self):
        for url in (CURRENT, CURRENT + "?v=manual"):
            with self.subTest(url=url):
                item = resource("yaml", url)
                collection = self.attach(ResourceCollection([item], yaml=True))
                with self.assertNoLogs(self.frontend.__name__, level="WARNING"):
                    await self.ensure_resource()
                self.assertEqual(collection.items, [item])
                self.assertEqual(collection.calls, [])

    async def test_yaml_problems_only_log_manual_instructions(self):
        for items in ([], [resource("old", LEGACY)], [resource("wrong", CURRENT, "js")],
                      [resource("a"), resource("b")]):
            with self.subTest(items=items):
                collection = self.attach(ResourceCollection(items, yaml=True))
                with self.assertLogs(self.frontend.__name__, level="WARNING") as logs:
                    await self.ensure_resource()
                self.assertIn("YAML", logs.output[0])
                self.assertIn(CURRENT, logs.output[0])
                self.assertEqual(collection.items, items)
                self.assertEqual(collection.calls, [])

    async def test_missing_lovelace_logs_instructions_and_panel_still_loads(self):
        with self.assertLogs(self.frontend.__name__, level="WARNING"):
            await self.frontend.async_setup_frontend(self.hass)
        self.assertEqual(len(self.panels["panels"]), 1)

    async def test_missing_bundle_preserves_existing_resource_entries(self):
        collection = self.attach(ResourceCollection([resource("old", LEGACY)]))
        self.bundle.unlink()
        with self.assertLogs(self.frontend.__name__, level="ERROR"):
            await self.ensure_resource()
        self.assertEqual(collection.items, [resource("old", LEGACY)])
        self.assertEqual(collection.calls, [])

    async def test_load_and_create_failures_leave_panel_available_and_retryable(self):
        for operation in ("load", "create"):
            with self.subTest(operation=operation):
                collection = self.attach(ResourceCollection(fail=operation))
                with self.assertLogs(self.frontend.__name__, level="ERROR"):
                    await self.frontend.async_setup_frontend(self.hass)
                collection.fail = None
                await self.ensure_resource()
                self.assertEqual(len(collection.items), 1)
        self.assertEqual(len(self.panels["panels"]), 2)

    async def test_failed_update_does_not_delete_fallbacks(self):
        items = [resource("current"), resource("old", LEGACY)]
        collection = self.attach(ResourceCollection(items, fail="update"))
        with self.assertLogs(self.frontend.__name__, level="ERROR"):
            await self.ensure_resource()
        self.assertEqual(collection.items, items)
        self.assertEqual([call[0] for call in collection.calls], ["update"])
        collection.fail = None
        await self.ensure_resource()
        self.assertEqual(collection.items, [resource("current", CURRENT + "?v=1000000000")])

    async def test_failed_duplicate_deletion_keeps_updated_entry_and_can_retry(self):
        collection = self.attach(ResourceCollection([resource("current"), resource("old", LEGACY)], fail="delete"))
        with self.assertLogs(self.frontend.__name__, level="ERROR"):
            await self.ensure_resource()
        self.assertEqual(collection.items[0], resource("current", CURRENT + "?v=1000000000"))
        self.assertEqual(len(collection.items), 2)
        collection.fail = None
        await self.ensure_resource()
        self.assertEqual(len(collection.items), 1)

    async def test_unload_retains_persisted_resource(self):
        collection = self.attach(ResourceCollection())
        await self.ensure_resource()
        await self.frontend.async_unload_frontend(self.hass)
        self.assertEqual(len(collection.items), 1)
        self.assertEqual([call[0] for call in collection.calls], ["create"])

    def test_manifest_orders_setup_after_optional_lovelace(self):
        manifest = json.loads((ROOT / "custom_components/velair/manifest.json").read_text())
        self.assertIn("lovelace", manifest["after_dependencies"])
        self.assertNotIn("lovelace", manifest["dependencies"])
