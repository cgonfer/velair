"""Options flow cannot remove a physical member while group ownership persists."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from . import helpers  # Install the small HA runtime used by the backend suite.


class _ConfigFlow:
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__()


class RoomGroupOptionsTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        entries = sys.modules["homeassistant.config_entries"]
        selector = SimpleNamespace()
        name = "custom_components.velair._room_group_options_test"
        spec = importlib.util.spec_from_file_location(name, Path(__file__).parents[2] / "custom_components/velair/config_flow.py")
        self.module = importlib.util.module_from_spec(spec)
        with patch.object(entries, "ConfigFlow", _ConfigFlow, create=True), \
                patch.object(entries, "ConfigFlowResult", dict, create=True), \
                patch.object(entries, "OptionsFlowWithReload", object, create=True), \
                patch.dict(sys.modules, {"homeassistant.helpers.selector": selector}):
            spec.loader.exec_module(self.module)
        self.flow = self.module.VelairOptionsFlow()
        self.saved = {"room_groups": {"group.room": {"members": ["climate.one", "climate.two"]}}}
        self.flow.config_entry = SimpleNamespace(
            entry_id="test", options={}, data={"climate_entities": ["climate.one", "climate.two"]},
            runtime_data=SimpleNamespace(storage=SimpleNamespace(data=self.saved)),
        )
        self.flow.hass = SimpleNamespace()
        self.flow.async_create_entry = Mock(side_effect=lambda **kwargs: {"type": "create_entry", **kwargs})
        self.flow.async_show_form = Mock(side_effect=lambda **kwargs: {"type": "form", **kwargs})
        self.flow.add_suggested_values_to_schema = Mock(return_value={})
        self.module._climate_entities_schema = Mock(return_value={})

    async def test_deselecting_group_member_returns_actionable_form_error(self):
        result = await self.flow.async_step_init({"climate_entities": ["climate.one"]})
        self.assertEqual(result["type"], "form")
        self.assertEqual(result["errors"], {"climate_entities": "grouped_climate_entities"})
        self.flow.async_create_entry.assert_not_called()

    async def test_unchanged_members_and_additional_climate_are_allowed(self):
        result = await self.flow.async_step_init({"climate_entities": ["climate.one", "climate.two", "climate.three"]})
        self.assertEqual(result["type"], "create_entry")

    async def test_unloaded_integration_reads_ownership_from_store(self):
        self.flow.config_entry.runtime_data = None
        store = SimpleNamespace(async_load=AsyncMock(return_value=self.saved))
        with patch.object(self.module, "Store", return_value=store):
            result = await self.flow.async_step_init({"climate_entities": ["climate.two"]})
        store.async_load.assert_awaited_once()
        self.assertEqual(result["errors"], {"climate_entities": "grouped_climate_entities"})
