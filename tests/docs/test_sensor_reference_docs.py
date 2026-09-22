"""Documentation contracts for the user-facing sensor reference."""

from pathlib import Path
import ast
import unittest


ROOT = Path(__file__).resolve().parents[2]
GUIDE = ROOT / "docs" / "user" / "sensors.md"
DOCS_INDEX = ROOT / "docs" / "README.md"
ROOT_README = ROOT / "README.md"
USAGE = ROOT / "docs" / "user" / "usage.md"
SENSOR = ROOT / "custom_components" / "velair" / "sensor.py"


EXPECTED_TITLES = {
    "NextClimateEventSensor": "Next Climate Event",
    "CurrentScheduleStateSensor": "Current Schedule State",
    "DiagnosticsStatusSensor": "Diagnostics Status",
    "ZoneActiveTargetTemperatureSensor": "Zone Active Target Temperature",
    "ZoneEnvironmentalConditionSensor": "Zone Environmental Condition",
    "ZoneVentilationOpportunitySensor": "Zone Ventilation Opportunity",
    "ZoneAirQualitySensor": "Zone Air Quality",
    "ZoneOverrideStateSensor": "Zone Override State",
    "ZoneControlSensor": "Zone Control",
    "ZoneDeliveryDiagnosticsSensor": "Zone Delivery Diagnostics",
    "ZonePreconditioningStartSensor": "Zone Preconditioning Start",
    "ZoneRoomAssistStateSensor": "Zone Room Assist State",
}


def _sensor_classes() -> list[ast.ClassDef]:
    tree = ast.parse(SENSOR.read_text(encoding="utf-8"))
    return [
        node
        for node in tree.body
        if isinstance(node, ast.ClassDef) and node.name in EXPECTED_TITLES
    ]


def _enum_options(sensor_class: ast.ClassDef) -> tuple[str, ...]:
    for node in sensor_class.body:
        if not isinstance(node, ast.Assign):
            continue
        if not any(
            isinstance(target, ast.Name) and target.id == "_attr_options"
            for target in node.targets
        ):
            continue
        return tuple(ast.literal_eval(node.value))
    return ()


class SensorReferenceDocumentationTest(unittest.TestCase):
    """Keep the sensor reference discoverable and complete."""

    def test_reference_is_linked_from_primary_docs(self) -> None:
        self.assertTrue(GUIDE.is_file())
        self.assertIn("user/sensors.md", DOCS_INDEX.read_text(encoding="utf-8"))
        self.assertIn("docs/user/sensors.md", ROOT_README.read_text(encoding="utf-8"))
        self.assertIn("[Sensor Reference](sensors.md)", USAGE.read_text(encoding="utf-8"))

    def test_every_sensor_class_has_a_reference_section(self) -> None:
        guide = GUIDE.read_text(encoding="utf-8")

        self.assertEqual(set(EXPECTED_TITLES), {item.name for item in _sensor_classes()})
        for title in EXPECTED_TITLES.values():
            self.assertIn(f"### {title}", guide)

    def test_enum_sensor_states_are_documented(self) -> None:
        guide = GUIDE.read_text(encoding="utf-8")

        for sensor_class in _sensor_classes():
            for option in _enum_options(sensor_class):
                self.assertIn(option, guide)


if __name__ == "__main__":
    unittest.main()
