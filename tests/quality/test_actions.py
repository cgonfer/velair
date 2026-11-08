from __future__ import annotations

import copy
import json
import re
import subprocess
import sys
import unittest

from tests.quality.test_site import dashboard_report, site

actions = site.action_evidence


class ActionEvidenceTests(unittest.TestCase):
    def test_api_only_journeys_do_not_claim_screen_coverage(self):
        model = actions.describe(dashboard_report())
        for identifier in ('schedule.execute-boundary', 'control.manual-resume'):
            item = next(item for item in model['actions'] if item['id'] == identifier)
            self.assertEqual(item['coverageLabel'], 'Scope')
            self.assertEqual(item['coverage'], 'Home Assistant runtime (API)')
            self.assertNotIn('Desktop', item['variants'][0]['coverage'])
            self.assertIn('Scope: Home Assistant runtime (API)', site.action_cards({'actions':[item], 'unclassified':0}))

    def test_historical_reports_do_not_claim_strengthened_journeys(self):
        report = dashboard_report()
        report['actionEvidenceVersion'] = 1
        report['scenarios'] = []
        for definition in actions.catalogue()['actions']:
            if definition['source'] != 'browser' or definition.get('sinceEvidenceVersion', 1) > 1:
                continue
            for variant in definition['variants']:
                if variant.get('minEvidenceVersion', 1) > 1:
                    continue
                for project in variant['projects']:
                    report['scenarios'].append({'id':f'browser/{project}/{variant["title"]}', 'status':'pass', 'actionId':definition['id'], 'actionVariant':variant['id'], 'project':project})
        old = actions.describe(report)
        profile = next(item for item in old['actions'] if item['id']=='profile.create-activate')
        self.assertEqual(profile['status'], 'pass')
        self.assertIn('activation after reload is not checked', profile['checks'])
        self.assertNotIn('schedule.execute-boundary', {item['id'] for item in old['actions']})
        report['actionEvidenceVersion'] = 2
        current = actions.describe(report)
        for identifier in ('profile.create-activate','schedule.edit-save','schedule.execute-boundary','control.manual-resume','schedule.save-recovery'):
            self.assertEqual(next(item for item in current['actions'] if item['id']==identifier)['status'], 'not-run')

    def test_current_load_action_requires_observed_draft_preservation(self):
        report = dashboard_report()
        row = next(item for item in report['scenarios'] if item['id']=='load/combined_activity')
        row.pop('editingEvidence')
        self.assertEqual(next(item for item in actions.describe(report)['actions'] if item['id']=='household.use-velair')['status'], 'not-run')
        row['editingEvidence'] = 'draft-preserved-during-updates'
        self.assertEqual(next(item for item in actions.describe(report)['actions'] if item['id']=='household.use-velair')['status'], 'pass')

    def test_catalogue_has_unique_stable_ids_and_exact_scopes(self):
        catalogue = actions.catalogue()
        self.assertEqual(catalogue["schemaVersion"], 1)
        definitions = catalogue["actions"]
        self.assertEqual(len({item["id"] for item in definitions}), len(definitions))
        titles = []
        for definition in definitions:
            self.assertRegex(definition["id"], r"^[a-z][a-z0-9.-]+$")
            self.assertTrue(definition["name"] and definition["checks"])
            self.assertEqual(len({item["id"] for item in definition["variants"]}), len(definition["variants"]))
            for variant in definition["variants"]:
                if definition["source"] == "browser":
                    titles.append(variant["title"])
                    self.assertTrue(set(variant["projects"]) <= set(actions.DEVICES))
                else:
                    self.assertTrue(variant["scenario"].startswith("load/"))
            for step in definition["steps"]:
                self.assertRegex(step, r"^[a-z][a-z0-9.-]+$")
        self.assertEqual(len(set(titles)), len(titles))

    def test_complete_actions_and_conditions_are_separate_from_visual_approval(self):
        model = actions.describe(dashboard_report())
        self.assertTrue(all(item["status"] == "pass" for item in model["actions"]))
        schedule = next(item for item in model["actions"] if item["id"] == "schedule.edit-save")
        self.assertEqual(schedule["result"], "Passed · 9/9 checks")
        self.assertEqual(len(schedule["variants"]), 3)
        restart = next(item for item in model["actions"] if item["id"] == "schedule.restart")
        self.assertEqual(restart["coverage"], "Desktop")
        self.assertEqual(restart["result"], "Passed · 1/1 checks")
        self.assertEqual(len(model["conditions"]), 2)
        self.assertEqual(model["visuals"][0]["status"], "unreviewed")
        self.assertNotIn("passed", model["visuals"][0]["result"].lower())
        self.assertEqual(model["unclassified"], 0)

    def test_missing_cooling_on_mobile_does_not_claim_complete_schedule_coverage(self):
        report = dashboard_report()
        report["scenarios"] = [row for row in report["scenarios"] if not (row.get("actionId") == "schedule.edit-save" and row.get("actionVariant") == "cooling-usable" and row.get("project") == "mobile")]
        schedule = next(item for item in actions.describe(report)["actions"] if item["id"] == "schedule.edit-save")
        self.assertEqual(schedule["status"], "partial")
        self.assertIn("8/9", schedule["result"])
        cooling = next(item for item in schedule["variants"] if item["id"] == "cooling-usable")
        self.assertEqual(cooling["coverage"], "Desktop, Tablet")
        self.assertIn({"variant": "Cooling", "device": "Mobile", "step": "Not checked successfully", "result": "Not run"}, schedule["failures"])

    def test_failure_uses_only_the_named_trusted_stage(self):
        report = dashboard_report()
        failed = next(row for row in report["scenarios"] if row.get("actionId") == "schedule.edit-save" and row.get("actionVariant") == "cooling-usable" and row.get("project") == "mobile")
        failed.update(status="fail", failureStep="schedule.save", error="credential-that-must-never-appear")
        model = actions.describe(report)
        schedule = next(item for item in model["actions"] if item["id"] == "schedule.edit-save")
        self.assertEqual(schedule["status"], "fail")
        self.assertEqual(schedule["result"], "Failed · 8/9 checks passed")
        self.assertEqual(schedule["failures"][0]["step"], "Saving and confirming the stored value")
        self.assertNotIn("credential-that-must-never-appear", json.dumps(model))
        failed["failureStep"] = "credential-that-must-never-appear"
        self.assertIn("step not recorded", next(item for item in actions.describe(report)["actions"] if item["id"] == "schedule.edit-save")["failures"][0]["step"])

    def test_legacy_is_exact_and_unknown_explicit_identity_never_falls_back(self):
        report = dashboard_report()
        for row in report["scenarios"]:
            for key in ("actionId", "actionVariant", "project"):
                row.pop(key, None)
        self.assertTrue(all(item["status"] == "pass" for item in actions.describe(report)["actions"]))
        row = next(item for item in report["scenarios"] if "heat schedule" in item["id"])
        row["actionId"] = "unclassified"
        self.assertEqual(actions.describe(report)["unclassified"], 1)
        row.pop("actionId")
        row["id"] += " extra claim"
        self.assertEqual(actions.describe(report)["unclassified"], 1)

    def test_annotated_identity_survives_a_display_title_change(self):
        report = dashboard_report()
        row = next(item for item in report["scenarios"] if item.get("actionId") == "schedule.restart")
        row["id"] = "browser/desktop/a new technical test title"
        restart = next(item for item in actions.describe(report)["actions"] if item["id"] == "schedule.restart")
        self.assertEqual(restart["status"], "pass")

    def test_absent_and_skipped_results_are_never_passed(self):
        model = actions.describe({"suite": "scope", "scenarios": []})
        self.assertTrue(all(item["status"] == "not-run" for item in model["actions"]))
        report = dashboard_report()
        for row in report["scenarios"]:
            row["status"] = "not-run"
        self.assertTrue(all(item["status"] == "not-run" for item in actions.describe(report)["actions"]))

    def test_measurements_are_named_actual_operations_not_browser_test_durations(self):
        model = actions.describe(dashboard_report())
        measured = next(item for item in model["actions"] if item["id"] == "household.use-velair")
        self.assertEqual([item["median"] for item in measured["metrics"]], [60, 270])
        self.assertEqual([item["count"] for item in measured["metrics"]], [3, 3])
        self.assertTrue(all(not item["metrics"] for item in model["actions"] if item["id"] != measured["id"]))

    def test_household_action_needs_its_actual_navigation_and_save_evidence(self):
        report = dashboard_report()
        row = next(item for item in report["scenarios"] if item["id"] == "load/combined_activity")
        row["samples"]["save_persist_ms"] = []
        model = actions.describe(report)
        self.assertEqual(next(item for item in model["actions"] if item["id"] == "household.use-velair")["status"], "not-run")
        row["samples"]["save_persist_ms"] = [270]
        row["load"]["completed"] -= 1
        self.assertEqual(next(item for item in actions.describe(report)["actions"] if item["id"] == "household.use-velair")["status"], "fail")

    def test_active_conditions_require_real_device_activity_and_valid_counters(self):
        for load in ({"requested": 0, "completed": 0, "observed": 0, "expected_observed": 0}, {"requested": 5, "completed": 5, "observed": 0, "expected_observed": 0}, {"requested": 5, "completed": 5, "observed": 5, "expected_observed": 5, "failed": False}):
            report = dashboard_report()
            next(item for item in report["scenarios"] if item["id"] == "load/combined_activity")["load"] = load
            model = actions.describe(report)
            self.assertEqual(next(item for item in model["actions"] if item["id"] == "household.use-velair")["status"], "not-run")
            self.assertEqual(next(item for item in model["conditions"] if item["id"] == "household.idle")["status"], "pass")

    def test_cli_uses_the_same_model_and_rejects_invalid_nonfinite_data(self):
        report = dashboard_report()
        result = subprocess.run([sys.executable, str(actions.CATALOG_PATH.with_suffix(".py"))], input=json.dumps(report), text=True, capture_output=True, check=True)
        self.assertEqual(json.loads(result.stdout), actions.describe(report))
        broken = copy.deepcopy(report)
        broken["scenarios"][0]["samples"] = {"x": [float("nan")]}
        invalid = subprocess.run([sys.executable, str(actions.CATALOG_PATH.with_suffix(".py"))], input=json.dumps(broken), text=True, capture_output=True)
        self.assertNotEqual(invalid.returncode, 0)
        self.assertNotIn("credential", invalid.stderr)
