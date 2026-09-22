"""Documentation contracts for runtime-only Comfort insights."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]


class ComfortInsightsDocumentationTest(unittest.TestCase):
    """Keep the conservative insight contract discoverable."""

    def test_user_guide_documents_scope_and_prudent_rules(self) -> None:
        guide = (ROOT / "docs/user/comfort.md").read_text(encoding="utf-8")
        for text in (
            "## Comfort insights",
            "Outdoor data does not change",
            "at least 1 °C",
            "information button explains the potential",
            "pointer hover, keyboard focus, or tap",
        ):
            self.assertIn(text, guide)

    def test_developer_contract_and_api_fields_are_documented(self) -> None:
        developer = (ROOT / "docs/developer/comfort.md").read_text(encoding="utf-8")
        api = (ROOT / "docs/developer/api.md").read_text(encoding="utf-8")
        sensor = (ROOT / "docs/user/zone-sensors.md").read_text(encoding="utf-8")
        event = (ROOT / "docs/user/automation-events.md").read_text(encoding="utf-8")
        for field in ("`code`", "`kind`", "`tone`", "`metrics`"):
            self.assertIn(field, developer)
            self.assertIn(field, sensor)
        self.assertIn("runtime-only ordered `insights`", api)
        self.assertIn("code: co2_elevated", event)
        self.assertIn("including an empty list when the last insight disappears", developer)
        self.assertIn("`indoor_absolute_humidity`", developer)
        self.assertIn("indoor_absolute_humidity:", event)

    def test_public_docs_record_no_persistence_or_control_effect(self) -> None:
        api = (ROOT / "docs/developer/api.md").read_text(encoding="utf-8")
        sensor = (ROOT / "docs/user/zone-sensors.md").read_text(encoding="utf-8")
        user = (ROOT / "docs/user/comfort.md").read_text(encoding="utf-8")

        self.assertIn("runtime-only ordered `insights`", api)
        self.assertIn("observational and do not control a climate", api)
        self.assertIn("Opening or refreshing the panel does not emit comfort automation events", api)
        self.assertIn("ordered runtime-only `insights` list", sensor)
        self.assertIn("does not open or close windows", user)

    def test_configurable_ventilation_guidance_is_documented_across_surfaces(self) -> None:
        user = (ROOT / "docs/user/comfort.md").read_text(encoding="utf-8")
        developer = (ROOT / "docs/developer/comfort.md").read_text(encoding="utf-8")
        api = (ROOT / "docs/developer/api.md").read_text(encoding="utf-8")
        diagnostics = (ROOT / "docs/user/diagnostics.md").read_text(encoding="utf-8")
        event = (ROOT / "docs/user/automation-events.md").read_text(encoding="utf-8")

        self.assertIn("**Ventilation guidance**", user)
        for document in (developer, api):
            self.assertIn("ventilation_temperature_threshold", document)
            self.assertIn("ventilation_humidity_threshold", document)
            self.assertIn("ventilation_absolute_humidity_threshold", document)
        for document in (developer, diagnostics, event):
            self.assertIn("guidance_thresholds", document)

    def test_range_transition_event_contract_is_documented(self) -> None:
        user = (ROOT / "docs/user/comfort.md").read_text(encoding="utf-8")
        sensor = (ROOT / "docs/user/zone-sensors.md").read_text(encoding="utf-8")
        diagnostics = (ROOT / "docs/user/diagnostics.md").read_text(encoding="utf-8")
        developer = (ROOT / "docs/developer/comfort.md").read_text(encoding="utf-8")
        event = (ROOT / "docs/user/automation-events.md").read_text(encoding="utf-8")

        for field in (
            "previous_range_summary",
            "range_summary_changed",
            "range_status_changed",
        ):
            self.assertIn(field, user)
            self.assertIn(field, diagnostics)
            self.assertIn(field, developer)
            self.assertIn(field, event)
        self.assertIn("| `range_summary` |", sensor)
        self.assertIn(
            "state_attr('sensor.velair_environmental_condition_living_room'",
            sensor,
        )
        for code in (
            "within_range",
            "outside_range",
            "mixed",
            "unavailable",
            "aligned",
            "not_evaluated",
            "below",
            "within",
            "above",
            "null",
        ):
            self.assertIn(code, developer)
            self.assertIn(code, event)

        self.assertIn('"thermal_relation": "not_evaluated"', user)
        self.assertIn('"humidex": null', user)


if __name__ == "__main__":
    unittest.main()
