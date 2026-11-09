"""User notification helpers for temperature-data migration."""

from __future__ import annotations

import asyncio
import logging

from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


def notification_id(entry_id: str) -> str:
    """Return the stable persistent-notification identifier for one entry."""
    return f"{DOMAIN}_temperature_migration_{entry_id}"


async def async_notify_temperature_migration(
    hass: HomeAssistant,
    entry_id: str,
    reason: str | None = None,
) -> bool:
    """Notify the user that scheduling is blocked pending migration."""
    try:
        await hass.services.async_call(
            "persistent_notification",
            "create",
            {
                "notification_id": notification_id(entry_id),
                "title": (
                    "Velair reset required"
                    if reason == "legacy_celsius_upgrade_reset_required"
                    else "Velair temperature unit changed"
                ),
                "message": (
                    (
                        "This Velair version found published legacy Celsius data while "
                        "Home Assistant uses Fahrenheit. The scheduler has stopped. "
                        "[Open Velair](/velair) and use Reset Velair to create safe "
                        "Fahrenheit defaults."
                    )
                    if reason == "legacy_celsius_upgrade_reset_required"
                    else (
                        "Home Assistant now uses a different temperature unit from "
                        "Velair's stored data. The scheduler has stopped to avoid applying "
                        "incorrect targets. [Open Velair](/velair), review the change, "
                        "and migrate all stored temperatures to the current unit."
                    )
                ),
            },
            blocking=True,
        )
    except Exception:  # Home Assistant service availability must not weaken the block.
        _LOGGER.exception("Unable to create the Velair temperature migration notification")
        return False
    return True


async def async_dismiss_temperature_migration_notification(
    hass: HomeAssistant,
    entry_id: str,
) -> bool:
    """Dismiss a resolved temperature migration notification."""
    try:
        await hass.services.async_call(
            "persistent_notification",
            "dismiss",
            {"notification_id": notification_id(entry_id)},
            blocking=True,
        )
    except Exception:  # A stale notice is safer than preventing scheduler recovery.
        _LOGGER.exception("Unable to dismiss the Velair temperature migration notification")
        return False
    return True


class TemperatureMigrationNotifications:
    """Serialize notification transitions without polling or per-report tasks."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        self._hass = hass
        self._entry_id = entry_id
        self._requested = (False, None)
        self._delivered = self._requested
        self._task = None
        self._running = False
        self.stopped = False

    @callback
    def request(self, blocked: bool, reason: str | None = None) -> None:
        """Merge reports while retaining the latest blocked state and reason."""
        if self.stopped:
            return
        requested = (bool(blocked), reason if blocked else None)
        if self._requested[0] and not blocked:
            # Clear even after a failed create: its remote outcome may be unknown.
            self._delivered = None
        self._requested = requested
        if self._running or requested == self._delivered:
            return
        self._running = True
        task = self._hass.async_create_task(self._run())
        self._task = None if task.done() else task
        if self.stopped:
            task.cancel()

    async def _run(self) -> None:
        try:
            while not self.stopped and self._requested != self._delivered:
                requested = self._requested
                blocked, reason = requested
                if blocked:
                    succeeded = await async_notify_temperature_migration(
                        self._hass, self._entry_id, reason,
                    )
                else:
                    succeeded = await async_dismiss_temperature_migration_notification(
                        self._hass, self._entry_id,
                    )
                if succeeded:
                    self._delivered = requested
                if self._requested == requested:
                    # Failed I/O retries only after another report, never in a loop.
                    break
        finally:
            self._task = None
            self._running = False

    async def async_wait(self) -> None:
        """Await requested transitions without letting a reader cancel the worker."""
        while (task := self._task) is not None:
            await asyncio.shield(task)

    @callback
    def stop(self) -> None:
        """Reject late reports and cancel notification I/O on unload."""
        self.stopped = True
        if self._task is not None:
            self._task.cancel()

    async def async_stop(self) -> None:
        """Finish worker cancellation before the integration is retired."""
        task = self._task
        self.stop()
        if task is not None and task is not asyncio.current_task():
            await asyncio.gather(task, return_exceptions=True)
