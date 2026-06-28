"""Frontend panel registration for Velair."""

from __future__ import annotations

import logging
from pathlib import Path

from aiohttp import hdrs, web
from homeassistant.components.frontend import async_remove_panel
from homeassistant.components.panel_custom import async_register_panel
from homeassistant.core import HomeAssistant
from homeassistant.helpers.http import HomeAssistantView

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

PANEL_COMPONENT_NAME = "velair-sidebar-panel"
PANEL_URL_PATH = "velair"
PANEL_TITLE = "Velair"
PANEL_ICON = "mdi:home-thermometer-outline"

FRONTEND_DIR = Path(__file__).parent / "frontend"
FRONTEND_URL = f"/{DOMAIN}_frontend"
FRONTEND_MODULE_URL = f"{FRONTEND_URL}/velair-card.js"
FRONTEND_ROUTE_REGISTERED = f"{DOMAIN}_frontend_route_registered"
FRONTEND_FILES = {"velair-card.js", "velair-card.js.map"}
NO_CACHE_HEADERS = {
    hdrs.CACHE_CONTROL: "no-store, no-cache, must-revalidate",
    hdrs.PRAGMA: "no-cache",
}


class VelairFrontendView(HomeAssistantView):
    """Serve Velair frontend assets without retaining stale bundles."""

    url = f"{FRONTEND_URL}/{{filename}}"
    name = "api:velair:frontend"
    requires_auth = False

    async def get(self, request: web.Request, filename: str) -> web.FileResponse:
        """Return a supported frontend asset with explicit no-cache headers."""
        if filename not in FRONTEND_FILES:
            raise web.HTTPNotFound

        path = FRONTEND_DIR / filename
        if not path.is_file():
            raise web.HTTPNotFound

        return web.FileResponse(path, headers=NO_CACHE_HEADERS)


async def async_setup_frontend(hass: HomeAssistant) -> None:
    """Register the Velair sidebar panel."""
    _register_frontend_route(hass)
    module_url = _frontend_module_url()

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


def _register_frontend_route(hass: HomeAssistant) -> None:
    """Register the stable frontend route once for the Home Assistant runtime."""
    if hass.data.get(FRONTEND_ROUTE_REGISTERED):
        return

    hass.http.register_view(VelairFrontendView())
    hass.data[FRONTEND_ROUTE_REGISTERED] = True


def _frontend_module_url() -> str:
    """Return a cache-busted URL for the isolated sidebar module."""
    frontend_bundle = FRONTEND_DIR / "velair-card.js"
    if frontend_bundle.exists():
        version: str | int = frontend_bundle.stat().st_mtime_ns
    else:
        version = "missing"
        _LOGGER.error(
            "Velair frontend bundle not found at %s. Run npm.cmd run build and "
            "copy custom_components/velair including its frontend directory.",
            frontend_bundle,
        )
    return f"{FRONTEND_MODULE_URL}?v={version}"
