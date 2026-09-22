"""Documentation contracts for optional Comfort derived metrics."""

from __future__ import annotations

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
USER_GUIDE = ROOT / "docs" / "user" / "comfort.md"
DEVELOPER_GUIDE = ROOT / "docs" / "developer" / "comfort.md"
API_GUIDE = ROOT / "docs" / "developer" / "api.md"
DIAGNOSTICS_GUIDE = ROOT / "docs" / "user" / "diagnostics.md"
MANUAL_TESTING = ROOT / "docs" / "developer" / "manual-testing.md"


class ComfortMetricsDocumentationTests(unittest.TestCase):
    """Keep user-facing and developer metric contracts discoverable."""

    def test_user_guide_documents_velair_behavior_and_units(self) -> None:
        guide = " ".join(USER_GUIDE.read_text(encoding="utf-8").split())
        for phrase in (
            "Calculated by Velair",
            "Home Assistant entity",
            "canonical unitless Humidex value",
            "does not establish that condensation will occur",
            "mass of water vapour per cubic metre of air",
            "Velair does not create three additional proxy sensor entities",
            "single-climate Velair card",
            "enabled derived metric's semantic state changes",
            "compact comparison scale",
            "does not claim that the room is comfortable or dangerous",
            "## Comfort Models",
            "**Guided psychrometric range**",
            "**Custom range by temperature**",
            "does not classify it or produce humidity guidance",
        ):
            self.assertIn(phrase, guide)

    def test_developer_guide_documents_reproducible_calculations(self) -> None:
        guide = " ".join(DEVELOPER_GUIDE.read_text(encoding="utf-8").split())
        for phrase in (
            "a = 17.625",
            "b = 243.04",
            "absolute_humidity_g_m3 = 216.7",
            "humidex = T + 0.5555",
            "(1 / 273.16) - (1 / (273.16 + dew_point_c))",
            "-100 < temperature_c < 100",
            "0 < relative_humidity <= 100",
            "revised `273.16` Kelvin conversion",
            "resolved source remains listed when its reading is currently missing or stale",
            "`temperature_range_position`",
            "epsilon of `1e-6`",
            "Dew point and absolute humidity deliberately omit this key",
            "comfort_ranges.build_comfort_zone",
            "constant vapour-pressure boundaries",
            "samples 17 points",
            "clamp((T - temperature_min)",
            "does not fall back to the Simple range",
        ):
            self.assertIn(phrase, guide)

    def test_surfaces_portability_and_manual_checks_are_documented(self) -> None:
        self.assertIn(
            "Portable model v9 adds each zone's optional Comfort `derived_metrics`",
            API_GUIDE.read_text(encoding="utf-8"),
        )
        diagnostics = " ".join(
            DIAGNOSTICS_GUIDE.read_text(encoding="utf-8").split()
        )
        for phrase in (
            "derived reading",
            "stable issue codes",
            "Environmental condition",
            "does not create separate proxy entities",
        ):
            self.assertIn(phrase, diagnostics)
        manual = MANUAL_TESTING.read_text(encoding="utf-8")
        self.assertIn("In a Fahrenheit Home Assistant installation", manual)
        self.assertIn("exports no calculated values", manual)
        api = " ".join(API_GUIDE.read_text(encoding="utf-8").split())
        self.assertIn("Humidex payload alone", api)
        self.assertIn("Range position does not create an insight", api)
        self.assertIn("Portable model v11 adds each zone's Comfort model", api)
        self.assertIn("comfort_zone", diagnostics)
        self.assertIn("portable model v11", manual)


if __name__ == "__main__":
    unittest.main()
