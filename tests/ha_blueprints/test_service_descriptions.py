"""Validate shipped service selectors using real Home Assistant YAML parsing."""

from pathlib import Path

from homeassistant.helpers.selector import validate_selector
from homeassistant.util.yaml import load_yaml


SERVICES = Path(__file__).resolve().parents[2] / "custom_components/velair/services.yaml"


def _validate_fields(fields, path):
    """Include selectors in collapsible service field sections."""
    for name, field in fields.items():
        field_path = f"{path}.{name}"
        if "selector" in field:
            try:
                validate_selector(field["selector"])
            except Exception as error:
                raise AssertionError(f"Invalid service selector: {field_path}") from error
        if "fields" in field:
            _validate_fields(field["fields"], field_path)


def test_service_selectors_accept_home_assistant_yaml_values():
    """YAML tokens such as unquoted off must not become non-string options."""
    for service, description in load_yaml(str(SERVICES)).items():
        _validate_fields(description.get("fields", {}), service)


def test_daily_schedule_example_preserves_off_device_option():
    """The service editor example must send the device option string, not null."""
    example = load_yaml(str(SERVICES))["set_daily_schedule"]["fields"]["blocks"]["example"]
    assert example[-1]["swing_mode"] == "off"
