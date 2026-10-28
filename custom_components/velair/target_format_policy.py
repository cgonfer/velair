"""Resolve configured temperature representation without claiming device verification."""
from __future__ import annotations

from typing import Any

CONDITIONING_MODES = {"heat", "cool", "auto", "heat_cool"}


def validate_range_reference(value: Any) -> dict[str, str]:
    """Validate the explicit per-mode boundary used for fixed range control."""
    if not isinstance(value, dict) or any(
        mode not in ("heat", "cool") or boundary not in ("low", "high")
        for mode, boundary in value.items()
    ):
        raise ValueError("target_range_reference must map heat or cool to low or high")
    return dict(value)


def selected_range_boundary(zone: dict, mode: str | None) -> str | None:
    """Resolve user-confirmed fixed-mode semantics without inferring auto behavior."""
    if mode not in ("heat", "cool"):
        return None
    reference = zone.get("target_range_reference", {})
    boundary = reference.get(mode) if isinstance(reference, dict) else None
    return boundary if boundary in ("low", "high") else None


def validate_range_modes(value: Any) -> list[str]:
    """Validate persisted syntax separately from changing entity capabilities."""
    if not isinstance(value, list) or any(
        not isinstance(mode, str) or mode not in CONDITIONING_MODES | {"dry", "fan_only"}
        for mode in value
    ) or len(set(value)) != len(value):
        raise ValueError("target_range_modes must contain unique non-off HVAC modes")
    return list(value)


def resolve_target_format_policy(entity_id: str, attributes: dict, zone: dict | None = None,
                                 *, available: bool = True) -> dict:
    """Return capabilities and policy from one observation and candidate settings."""
    zone = zone or {}
    modes = [mode for mode in attributes.get("hvac_modes", []) if isinstance(mode, str)]
    try:
        features = int(attributes.get("supported_features", 0) or 0)
    except (TypeError, ValueError):
        features = 0
    single = bool(features & 1) if features else "temperature" in attributes
    pair = bool(features & 2) if features else all(
        field in attributes for field in ("target_temp_low", "target_temp_high"))
    kind = ("mixed" if single and pair else "single" if single else "range" if pair else "unknown") if available else "unknown"
    configured = zone.get("target_range_modes")
    selected = list(configured) if configured is not None else (["heat_cool"] if "heat_cool" in modes else [])
    invalid = [mode for mode in selected if mode not in modes] if available and modes else []
    formats = {}
    for mode in modes:
        if mode == "off":
            continue
        if kind == "unknown":
            formats[mode] = "unknown"
        elif kind == "mixed":
            formats[mode] = "range" if mode in selected else "single"
        elif kind == "range":
            formats[mode] = "range" if mode in CONDITIONING_MODES else "unknown"
        else:
            formats[mode] = "single"
    return {"entity_id": entity_id, "kind": kind, "configured_modes": configured,
            "range_modes": [mode for mode, shape in formats.items() if shape == "range"],
            "formats_by_mode": formats, "invalid_modes": invalid,
            "uncertain": kind == "unknown" or not formats or bool(invalid), "hvac_modes": modes}
