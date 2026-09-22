"""Documentation contracts for per-zone control and delivery sensors."""

from pathlib import Path
import ast
import unittest


ROOT = Path(__file__).resolve().parents[2]
GUIDE = ROOT / "docs" / "user" / "zone-sensors.md"
DOCS_INDEX = ROOT / "docs" / "README.md"
ROOT_README = ROOT / "README.md"
USAGE = ROOT / "docs" / "user" / "usage.md"
DIAGNOSTICS = ROOT / "docs" / "user" / "diagnostics.md"
SENSOR = ROOT / "custom_components" / "velair" / "sensor.py"


def _sensor_class(name: str) -> ast.ClassDef:
    tree = ast.parse(SENSOR.read_text(encoding="utf-8"))
    return next(
        node
        for node in tree.body
        if isinstance(node, ast.ClassDef) and node.name == name
    )


def _enum_options(name: str) -> tuple[str, ...]:
    sensor_class = _sensor_class(name)
    assignment = next(
        node
        for node in sensor_class.body
        if isinstance(node, ast.Assign)
        and any(
            isinstance(target, ast.Name) and target.id == "_attr_options"
            for target in node.targets
        )
    )
    return tuple(ast.literal_eval(assignment.value))


def _attribute_names(name: str) -> tuple[str, ...]:
    sensor_class = _sensor_class(name)
    method = next(
        node
        for node in sensor_class.body
        if isinstance(node, ast.FunctionDef)
        and node.name == "extra_state_attributes"
    )
    string_tuples = [
        tuple(
            item.value
            for item in node.elts
            if isinstance(item, ast.Constant) and isinstance(item.value, str)
        )
        for node in ast.walk(method)
        if isinstance(node, ast.Tuple)
    ]
    return max(string_tuples, key=len)


class ZoneSensorDocumentationTest(unittest.TestCase):
    """Keep both sensor contracts complete and discoverable."""

    def test_guide_is_linked_from_primary_documentation(self) -> None:
        self.assertTrue(GUIDE.is_file())
        self.assertIn(
            "user/zone-sensors.md",
            DOCS_INDEX.read_text(encoding="utf-8"),
        )
        self.assertIn(
            "docs/user/zone-sensors.md",
            ROOT_README.read_text(encoding="utf-8"),
        )
        self.assertIn(
            "Zone Control and Delivery Sensors](zone-sensors.md)",
            USAGE.read_text(encoding="utf-8"),
        )
        self.assertIn(
            "zone-sensors.md#zone-delivery-diagnostics",
            DIAGNOSTICS.read_text(encoding="utf-8"),
        )

    def test_control_sensor_contract_is_documented(self) -> None:
        guide = GUIDE.read_text(encoding="utf-8")

        for required in (*_enum_options("ZoneControlSensor"), *_attribute_names("ZoneControlSensor")):
            self.assertIn(f"`{required}`", guide)

        for required in (
            "## Zone Control",
            "`profile_id` / `profile_name`",
            "`mode_id` / `mode_name`",
            "different from Velair Mode **Manual**",
        ):
            self.assertIn(required, guide)

    def test_environmental_condition_contract_and_examples_are_documented(self) -> None:
        guide = GUIDE.read_text(encoding="utf-8")

        for required in (
            *_enum_options("ZoneEnvironmentalConditionSensor"),
            *_attribute_names("ZoneEnvironmentalConditionSensor"),
        ):
            self.assertIn(f"`{required}`", guide)

        for required in (
            "## Environmental Condition",
            "### Environmental Condition Attributes",
            "### Entity Or Event?",
            "temperature_range_position",
            "ventilation_may_help_cool",
            "range_status_changed",
            "payload remains present with `availability`",
            "actual entity ID",
        ):
            self.assertIn(required, guide)

    def test_delivery_sensor_contract_and_boundaries_are_documented(self) -> None:
        guide = GUIDE.read_text(encoding="utf-8")
        normalized = " ".join(guide.split())

        for required in (
            *_enum_options("ZoneDeliveryDiagnosticsSensor"),
            *_attribute_names("ZoneDeliveryDiagnosticsSensor"),
        ):
            self.assertIn(f"`{required}`", guide)

        for required in (
            "## Zone Delivery Diagnostics",
            "disabled by default",
            "`last_accepted_target_temp_low` / `last_accepted_target_temp_high`",
            "does not confirm transport delivery",
            "runtime-only",
            "not represented by this local delivery sensor",
        ):
            self.assertIn(required, normalized)


if __name__ == "__main__":
    unittest.main()
