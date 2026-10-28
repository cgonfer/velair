"""Best-effort, bounded reporting of confirmed shared supply corrections and pauses."""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
import logging

from homeassistant.core import callback

_LOGGER = logging.getLogger(__name__)
_COOLDOWN = timedelta(minutes=15)


class SharedSupplyNotifications:
    """Keep reporting I/O out of the supply control worker and its locks."""

    def __init__(self, hass) -> None:
        self._hass = hass
        self._pending: dict[tuple[str, str], tuple[str, str, str, str]] = {}
        self._last: dict[tuple[str, str], tuple[str, datetime]] = {}
        self._task: asyncio.Task | None = None

    @callback
    def retain(self, groups: dict) -> None:
        """Discard reporting state when a supply is removed or reassigned."""
        self._pending = {key: value for key, value in self._pending.items()
                         if key[0] in groups and groups[key[0]]["switch_entity_id"] == value[0]}
        self._last = {key: value for key, value in self._last.items() if key[0] in groups}

    @callback
    def queue(self, group: dict, state, now: datetime, *, kind: str = "correction") -> None:
        group_id, output = group["id"], group["switch_entity_id"]
        key = (group_id, kind)
        last = self._last.get(key)
        if last is not None and last[0] == output and now - last[1] < _COOLDOWN:
            return
        # Reserve both channels before I/O, including failures and event bursts.
        self._last[key] = (output, now)
        name = state.attributes.get("friendly_name") or output
        self._pending[key] = (output, str(name), group["direction"], group["name"])
        if self._task is None or self._task.done():
            self._task = self._hass.async_create_task(self._run())

    async def _run(self) -> None:
        try:
            while self._pending:
                key = next(iter(self._pending))
                group_id, kind = key
                output, name, direction, supply_name = self._pending.pop(key)
                message = (
                    f'Velair turned off {name} ({output}) for shared supply "{supply_name}" '
                    "after an external turn-on was detected. Automatic Supply control was enabled "
                    "and the associated thermostats had no estimated "
                    f"{'heating' if direction == 'heat' else 'cooling'} demand. "
                    "Review or disable automatic control in Supply control."
                )
                title = "Velair: shared supply turned off"
                notification_id = f"velair_supply_control_{group_id}"
                if kind == "suspension":
                    title = "Velair: automatic Supply control paused"
                    notification_id += "_paused"
                    message = (
                        f'{name} ({output}) for shared supply "{supply_name}" was turned off '
                        "outside Velair. Automatic Supply control is paused until you resume it. "
                        "Open Supply control and select Resume automatic control."
                    )
                channels = []
                if self._hass.services.has_service("persistent_notification", "create"):
                    channels.append(("persistent_notification", "create", {
                        "notification_id": notification_id,
                        "title": title,
                        "message": message + " [Open Supply control](/velair/supply-control).",
                    }))
                if self._hass.services.has_service("logbook", "log"):
                    channels.append(("logbook", "log", {
                        "name": "Velair Supply control", "message": message,
                        "entity_id": output, "domain": "velair",
                    }))
                for domain, service, payload in channels:
                    try:
                        await self._hass.services.async_call(
                            domain, service, payload, blocking=domain != "logbook")
                    except Exception:
                        _LOGGER.warning("Could not report shared supply event through %s", domain, exc_info=True)
        finally:
            self._task = None

    async def async_stop(self) -> None:
        self._pending.clear()
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._last.clear()
