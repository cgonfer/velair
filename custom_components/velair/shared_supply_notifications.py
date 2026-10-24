"""Best-effort, bounded reporting of confirmed shared supply corrections."""
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
        self._pending: dict[str, tuple[str, str, str, str]] = {}
        self._last: dict[str, tuple[str, datetime]] = {}
        self._task: asyncio.Task | None = None

    @callback
    def retain(self, groups: dict) -> None:
        """Discard reporting state when a supply is removed or reassigned."""
        self._pending = {key: value for key, value in self._pending.items()
                         if key in groups and groups[key]["switch_entity_id"] == value[0]}
        self._last = {key: value for key, value in self._last.items() if key in groups}

    @callback
    def queue(self, group: dict, state, now: datetime) -> None:
        group_id, output = group["id"], group["switch_entity_id"]
        last = self._last.get(group_id)
        if last is not None and last[0] == output and now - last[1] < _COOLDOWN:
            return
        # Reserve both channels before I/O, including failures and event bursts.
        self._last[group_id] = (output, now)
        name = state.attributes.get("friendly_name") or output
        self._pending[group_id] = (output, str(name), group["direction"], group["name"])
        if self._task is None or self._task.done():
            self._task = self._hass.async_create_task(self._run())

    async def _run(self) -> None:
        try:
            while self._pending:
                group_id = next(iter(self._pending))
                output, name, direction, supply_name = self._pending.pop(group_id)
                message = (
                    f'Velair turned off {name} ({output}) for shared supply "{supply_name}" '
                    "after an external turn-on was detected. Automatic Supply control was enabled "
                    "and the associated thermostats had no estimated "
                    f"{'heating' if direction == 'heat' else 'cooling'} demand. "
                    "Review or disable automatic control in Supply control."
                )
                channels = [("persistent_notification", "create", {
                    "notification_id": f"velair_supply_control_{group_id}",
                    "title": "Velair: shared supply turned off",
                    "message": message + " [Open Supply control](/velair/supply-control).",
                })]
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
                        _LOGGER.warning("Could not report shared supply correction through %s", domain, exc_info=True)
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
