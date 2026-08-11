"""Persistent notification helpers for Room Assist target limits."""

from __future__ import annotations

import logging

from homeassistant.core import HomeAssistant

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


def notification_id(entity_id: str) -> str:
    """Return the stable notification identifier for one climate entity."""
    safe_entity_id = entity_id.replace(".", "_")
    return f"{DOMAIN}_room_assist_limit_{safe_entity_id}"


async def async_notify_room_assist_limit(
    hass: HomeAssistant,
    entity_id: str,
    limited_by: str,
    *,
    requested: str,
    applied: str,
    limit: str,
) -> bool:
    """Create or replace the persistent notification for an active limit."""
    boundary = "maximum" if limited_by == "maximum" else "minimum"
    try:
        await hass.services.async_call(
            "persistent_notification",
            "create",
            {
                "notification_id": notification_id(entity_id),
                "title": "Velair Room Assist target limited",
                "message": (
                    f"Room Assist has reached the {boundary} target supported by "
                    f"`{entity_id}`. It requested {requested}; the supported limit is "
                    f"{limit}, so Velair applied {applied}. Further correction is "
                    "limited until "
                    "the readings return within the thermostat's supported range. "
                    "[Open Velair](/velair)."
                ),
            },
            blocking=True,
        )
    except Exception:  # Notification availability must not block climate control.
        _LOGGER.exception(
            "Unable to create the Room Assist target-limit notification for %s",
            entity_id,
        )
        return False
    return True


async def async_dismiss_room_assist_limit_notification(
    hass: HomeAssistant,
    entity_id: str,
) -> bool:
    """Dismiss a resolved Room Assist target-limit notification."""
    try:
        await hass.services.async_call(
            "persistent_notification",
            "dismiss",
            {"notification_id": notification_id(entity_id)},
            blocking=True,
        )
    except Exception:  # A stale notice must not block Room Assist recovery.
        _LOGGER.exception(
            "Unable to dismiss the Room Assist target-limit notification for %s",
            entity_id,
        )
        return False
    return True
