"""Home Assistant diagnostics support for Velair."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant

from . import VelairConfigEntry

async def async_get_config_entry_diagnostics(
    hass: HomeAssistant,
    entry: VelairConfigEntry,
) -> dict[str, Any]:
    """Return a privacy-conscious standard diagnostics report."""
    manager = entry.runtime_data.diagnostics
    runtime = hass.data[entry.domain][entry.entry_id]
    return {"entry": {"version": entry.version}, **manager.export_snapshot(runtime)}
