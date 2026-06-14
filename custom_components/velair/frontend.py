"""Frontend panel registration for Velair."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import async_remove_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.panel_custom import async_register_panel
from homeassistant.core import HomeAssistant

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

PANEL_COMPONENT_NAME = "velair-main-panel"
PANEL_URL_PATH = "velair"
PANEL_TITLE = "Velair"
PANEL_ICON = "mdi:home-thermometer-outline"

FRONTEND_DIR = Path(__file__).parent / "frontend"
FRONTEND_URL = f"/{DOMAIN}_frontend"


async def async_setup_frontend(hass: HomeAssistant) -> None:
    """Register the Velair sidebar panel."""
    module_url = await _async_get_module_url(hass)

    await async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_COMPONENT_NAME,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        module_url=module_url,
        config={
            "module_url": module_url,
        },
        require_admin=False,
    )


async def async_unload_frontend(hass: HomeAssistant) -> None:
    """Remove the Velair sidebar panel."""
    async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)


async def _async_get_module_url(hass: HomeAssistant) -> str:
    """Return the preferred frontend module URL."""
    frontend_bundle = FRONTEND_DIR / "velair-card.js"
    bundle_version: str | int
    if frontend_bundle.exists():
        bundle_version = frontend_bundle.stat().st_mtime_ns
    else:
        bundle_version = "missing"
        _LOGGER.error(
            "Velair frontend bundle not found at %s. Run npm.cmd run build and "
            "copy custom_components/velair including its frontend directory.",
            frontend_bundle,
        )

    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                FRONTEND_URL,
                str(FRONTEND_DIR),
                False,
            )
        ]
    )
    return f"{FRONTEND_URL}/velair-card.js?v={bundle_version}"
