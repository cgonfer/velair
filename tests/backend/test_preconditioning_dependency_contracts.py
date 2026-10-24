"""Persistence, portability and public contracts for preconditioning masters."""

from copy import deepcopy
from datetime import datetime, timezone
from types import SimpleNamespace
import unittest

from . import helpers
from .test_api import api_module
from custom_components.velair.models import (
    ClimateEvent,
    normalize_preconditioning_data,
    normalize_schedule_data,
    serialize_schedule_data,
    validate_preconditioning_dependencies,
)


class PreconditioningDependencyContractsTest(unittest.TestCase):
    def setUp(self):
        self.data = normalize_schedule_data(None, ["climate.master", "climate.child", "climate.other"])

    def _link(self, child="climate.child", master="climate.master"):
        self.data["zones"][child]["preconditioning"]["master_entity_id"] = master

    def _runtime(self):
        return {"storage": SimpleNamespace(data=self.data, effective_temperature_unit="°C"),
                "entry": SimpleNamespace(options={})}

    def test_legacy_independent_and_disabled_source(self):
        self.assertIsNone(normalize_preconditioning_data(None)["master_entity_id"])
        self._link()
        validate_preconditioning_dependencies(self.data["zones"])
        restored = normalize_schedule_data(serialize_schedule_data(self.data), list(self.data["zones"]))
        self.assertEqual(restored["zones"]["climate.child"]["preconditioning"]["master_entity_id"], "climate.master")

    def test_invalid_graphs_and_external_ownership(self):
        for links in (
            {"climate.child": "climate.child"},
            {"climate.child": "climate.missing"},
            {"climate.child": "climate.master", "climate.master": "climate.other"},
            {"climate.child": "climate.master", "climate.master": "climate.child"},
        ):
            with self.subTest(links=links):
                zones = deepcopy(self.data["zones"])
                for entity, master in links.items():
                    zones[entity]["preconditioning"]["master_entity_id"] = master
                with self.assertRaises(ValueError):
                    validate_preconditioning_dependencies(zones)
        self._link()
        self.data["zones"]["climate.master"]["execution"] = {"type": "external", "provider": "test"}
        with self.assertRaises(ValueError):
            validate_preconditioning_dependencies(self.data["zones"])

    def test_multiple_dependents_and_dangling_reference_remains_visible_on_load(self):
        self._link()
        self._link("climate.other")
        validate_preconditioning_dependencies(self.data["zones"])
        restored = normalize_schedule_data(serialize_schedule_data(self.data), ["climate.child"])
        self.assertEqual(restored["zones"]["climate.child"]["preconditioning"]["master_entity_id"], "climate.master")

    def test_runtime_anchors_roundtrip_but_are_not_portable(self):
        self._link()
        anchor = {"accepted_start": "2026-10-19T08:00:00+00:00", "target_when": "2026-10-19T09:00:00+00:00",
                  "expires_at": "2026-10-19T10:00:00+00:00", "context": "selection-1"}
        self.data["preconditioning_accepted_anchors"] = {"occurrence": anchor}
        restored = normalize_schedule_data(serialize_schedule_data(self.data), list(self.data["zones"]))
        self.assertEqual(restored["preconditioning_accepted_anchors"], {"occurrence": anchor})
        payload = api_module._build_export_payload(self._runtime(), ["zones"])
        self.assertEqual(payload["model_version"], 22)
        self.assertNotIn("preconditioning_accepted_anchors", str(payload))
        imported = api_module._build_import_data(self._runtime(), payload, ["zones"])
        self.assertEqual(imported["zones"]["climate.child"]["preconditioning"]["master_entity_id"], "climate.master")

    def test_import_validates_merged_inbound_links_atomically(self):
        self._link()
        before = deepcopy(self.data)
        payload = {"format": api_module.EXPORT_FORMAT, "model_version": 19, "sections": {"zones": {
            "climate.master": {"preconditioning": {"master_entity_id": "climate.other"}}
        }}}
        with self.assertRaises(ValueError):
            api_module._build_import_data(self._runtime(), payload, ["zones"])
        self.assertEqual(self.data, before)
        payload["sections"]["zones"]["climate.master"]["preconditioning"]["master_entity_id"] = "climate.missing"
        with self.assertRaises(ValueError):
            api_module._build_import_data(self._runtime(), payload, ["zones"])

    def test_malformed_anchors_are_discarded_and_count_is_bounded(self):
        anchor = {"accepted_start": "2026-10-19T08:00:00+00:00", "target_when": "2026-10-19T09:00:00+00:00",
                  "expires_at": "2026-10-19T10:00:00+00:00"}
        raw = serialize_schedule_data(self.data)
        raw["preconditioning_accepted_anchors"] = {str(index): deepcopy(anchor) for index in range(100)}
        raw["preconditioning_accepted_anchors"]["bad"] = {**anchor, "accepted_start": "2026-10-19T08:00:00"}
        restored = normalize_schedule_data(raw, list(self.data["zones"]))
        self.assertLessEqual(len(restored["preconditioning_accepted_anchors"]), 48)
        self.assertNotIn("bad", restored["preconditioning_accepted_anchors"])

    def test_blocked_nominal_event_keeps_dependency_metadata(self):
        dependency = {"master_entity_id": "climate.master", "reason": "master_no_preconditioning", "reason_detail": "master_preconditioning_disabled", "effective_start": None}
        event = ClimateEvent(entity_id="climate.child", when=datetime(2026, 10, 19, 9, tzinfo=timezone.utc),
                             temperature=21, weekday="monday", start="09:00", preconditioning_dependency=dependency)
        self.assertIsNone(api_module._serialize_event(event)["target_when"])
        self.assertEqual(api_module._serialize_event(event)["preconditioning_dependency"], dependency)
