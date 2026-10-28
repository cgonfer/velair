"""Validation for persisted shared climate supplies."""
from __future__ import annotations

from collections.abc import Iterable
import math
import re

_ENTITY = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")


def _number(value: object, name: str, maximum: float | None = None) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be a finite number")
    try:
        result = float(value)
    except OverflowError as err:
        raise ValueError(f"{name} must be a finite number") from err
    if not math.isfinite(result) or result < 0:
        raise ValueError(f"{name} must be a finite nonnegative number")
    if maximum is not None and result > maximum:
        raise ValueError(f"{name} must be between 0 and {maximum:g}")
    return result


def _seconds(value: object, name: str) -> float:
    """Match the editor's whole-second timing contract on every write path."""
    result = _number(value, name, 86400)
    if not result.is_integer():
        raise ValueError(f"{name} must be a whole number of seconds")
    return result


def normalize_groups(value: object, managed_ids: Iterable[str]) -> list[dict]:
    """Validate an entire replacement; never silently drop unsafe configuration."""
    if not isinstance(value, list) or len(value) > 100:
        raise ValueError("shared_demand_groups must be a list of at most 100 shared supplies")
    managed = set(managed_ids)
    group_ids: set[str] = set()
    outputs: set[str] = set()
    result = []
    allowed = {"id", "name", "enabled", "switch_entity_id", "direction", "hysteresis", "hysteresis_mode", "hysteresis_stop",
               "minimum_off_seconds", "on_delay_seconds", "off_delay_seconds", "zones", "suspended", "suspension_reason"}
    for raw in value:
        if not isinstance(raw, dict) or set(raw) - allowed:
            raise ValueError("Invalid shared supply fields")
        group_id, name = raw.get("id"), raw.get("name")
        output, direction = raw.get("switch_entity_id"), raw.get("direction")
        if not isinstance(group_id, str) or not group_id.strip() or len(group_id) > 100 or group_id in group_ids:
            raise ValueError("Shared supply ids must be unique nonempty strings")
        if not isinstance(name, str) or not name.strip() or len(name) > 100:
            raise ValueError("Shared supply name is required (maximum 100 characters)")
        if not isinstance(output, str) or not _ENTITY.fullmatch(output) or not output.startswith("switch.") or output in outputs:
            raise ValueError("Each shared supply requires a unique switch entity")
        if direction not in ("heat", "cool"):
            raise ValueError("Supply direction must be heat or cool")
        if raw.get("hysteresis_mode", "at_target") not in ("at_target", "symmetric", "custom"):
            raise ValueError("Supply hysteresis mode must be at_target, symmetric or custom")
        for key in ("enabled", "suspended"):
            if key in raw and not isinstance(raw[key], bool):
                raise ValueError(f"{key} must be a boolean")
        if "suspension_reason" in raw and raw["suspension_reason"] not in ("external_off", "imported"):
            raise ValueError("suspension_reason must be external_off or imported")
        zones = raw.get("zones")
        if not isinstance(zones, dict) or not zones:
            raise ValueError("Shared supply requires at least one managed climate")
        normalized_zones = {}
        for entity_id, settings in zones.items():
            if entity_id not in managed or not isinstance(entity_id, str) or not entity_id.startswith(("climate.", "group.")) or not _ENTITY.fullmatch(entity_id):
                raise ValueError("Supply thermostats must reference managed climate entities or room groups")
            if not isinstance(settings, dict) or set(settings) - {"hysteresis", "hysteresis_stop"}:
                raise ValueError("Invalid supply thermostat override")
            normalized_zones[entity_id] = {
                field: _number(settings[field], field)
                for field in ("hysteresis", "hysteresis_stop") if field in settings
            }
        result.append({
            "id": group_id, "name": name.strip(), "enabled": raw.get("enabled", False),
            "switch_entity_id": output, "direction": direction,
            "hysteresis": _number(raw.get("hysteresis", 0.3), "hysteresis"),
            "minimum_off_seconds": _seconds(raw.get("minimum_off_seconds", 0), "minimum_off_seconds"),
            "on_delay_seconds": _seconds(raw.get("on_delay_seconds", 0), "on_delay_seconds"),
            "off_delay_seconds": _seconds(raw.get("off_delay_seconds", 0), "off_delay_seconds"),
            "zones": normalized_zones, "suspended": raw.get("suspended", False),
        })
        if raw.get("suspended") and "suspension_reason" in raw:
            result[-1]["suspension_reason"] = raw["suspension_reason"]
        # Optional fields stay absent for legacy configurations. Keep explicitly
        # configured custom stop distances even while another mode is selected.
        if "hysteresis_mode" in raw:
            result[-1]["hysteresis_mode"] = raw["hysteresis_mode"]
        if "hysteresis_stop" in raw:
            result[-1]["hysteresis_stop"] = _number(raw["hysteresis_stop"], "hysteresis_stop")
        group_ids.add(group_id)
        outputs.add(output)
    return result
