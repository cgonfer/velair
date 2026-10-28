"""Strict public request validation for Profile selection actions."""

from __future__ import annotations

import voluptuous as vol

from homeassistant.helpers import config_validation as cv


def profile_id(value):
    """Require a real non-empty identifier rather than coercing arbitrary values."""
    if not isinstance(value, str) or not value.strip():
        raise vol.Invalid("Profile ID must be non-empty text")
    return value.strip()


def profile_ids(value):
    """Validate an explicit ordered list; empty lists remain intentional."""
    if not isinstance(value, list):
        raise vol.Invalid("profile_ids must be a list")
    result = [profile_id(item) for item in value]
    if len(set(result)) != len(result):
        raise vol.Invalid("Profile IDs must be unique")
    return result


def climate_entity_id(value):
    """Accept a climate or stable room control-unit identifier."""
    if not isinstance(value, str):
        raise vol.Invalid("entity_id must identify a climate entity")
    result = cv.entity_id(value)
    if not result.startswith(("climate.", "group.")):
        raise vol.Invalid("entity_id must identify a climate or room group")
    return result


def climate_entity_ids(value):
    """Normalize one explicit entity or a list, rejecting duplicate targets."""
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        raise vol.Invalid("entity_id must be a climate entity or a list")
    result = [climate_entity_id(item) for item in value]
    if len(set(result)) != len(result):
        raise vol.Invalid("Climate entity IDs must be unique")
    return result


def profile_set_request(data):
    """Validate the complete service request before scheduler dispatch."""
    if "profile_ids" not in data:
        raise vol.Invalid("profile_ids is required")
    return {**data, "profile_ids": profile_ids(data["profile_ids"])}


def zone_profile_request(data):
    """Keep an omitted Profile distinct from explicitly requesting Default."""
    if "entity_id" not in data or "profile_id" not in data:
        raise vol.Invalid("entity_id and profile_id are required")
    return {**data, "entity_id": climate_entity_id(data["entity_id"]),
            "profile_id": None if data["profile_id"] is None else profile_id(data["profile_id"])}


def clear_overrides_request(data):
    """Normalize explicit clear targets without broadening a missing target."""
    if "entity_id" not in data:
        raise vol.Invalid("entity_id is required")
    return {**data, "entity_id": climate_entity_ids(data["entity_id"])}
