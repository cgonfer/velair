"""Frontend panel registration for Velair."""

from __future__ import annotations

import asyncio
from collections.abc import Mapping
import logging
from pathlib import Path
from urllib.parse import urlsplit

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
BRAND_DIR = Path(__file__).parent / "brand"
FRONTEND_URL = f"/{DOMAIN}_frontend"
FRONTEND_MODULE_URL = f"{FRONTEND_URL}/velair-card.js"
FRONTEND_ICON_FILENAME = "velair-icon.png"
FRONTEND_ROUTE_REGISTERED = f"{DOMAIN}_frontend_route_registered"
RESOURCE_LOCK = f"{DOMAIN}_frontend_resource_lock"
LEGACY_MODULE_URL = "/local/velair-card.js"
RESOURCE_HELP = (
    "For optional dashboard cards, use /velair_frontend/velair-card.js with "
    "type module. See https://github.com/cgonfer/velair/blob/main/"
    "docs/user/troubleshooting.md#a-lovelace-card-shows-configuration-error"
)
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
        if filename in FRONTEND_FILES:
            path = FRONTEND_DIR / filename
        elif filename == FRONTEND_ICON_FILENAME:
            path = BRAND_DIR / "icon.png"
        else:
            raise web.HTTPNotFound

        if not path.is_file():
            raise web.HTTPNotFound

        return web.FileResponse(path, headers=NO_CACHE_HEADERS)


async def async_setup_frontend(hass: HomeAssistant) -> None:
    """Register the Velair sidebar panel."""
    await async_setup_frontend_route(hass)
    module_url = await hass.async_add_executor_job(_frontend_module_url)
    await async_setup_frontend_resources(hass, module_url=module_url)

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


async def async_setup_frontend_route(hass: HomeAssistant) -> None:
    """Register the stable frontend route once for the Home Assistant runtime."""
    if hass.data.get(FRONTEND_ROUTE_REGISTERED):
        return

    hass.http.register_view(VelairFrontendView())
    hass.data[FRONTEND_ROUTE_REGISTERED] = True


def _resource_path(url: str) -> str | None:
    """Recognize only Velair's exact local routes, regardless of query string."""
    try:
        parts = urlsplit(url)
    except ValueError:
        return None
    if not parts.scheme and not parts.netloc and parts.path in (
        FRONTEND_MODULE_URL, LEGACY_MODULE_URL
    ):
        return parts.path
    return None


async def async_setup_frontend_resources(
    hass: HomeAssistant, *, module_url: str | None = None
) -> None:
    """Ensure one current Lovelace module without disrupting integration setup."""
    lock = hass.data.setdefault(RESOURCE_LOCK, asyncio.Lock())
    async with lock:
        try:
            lovelace = hass.data.get("lovelace")
            if lovelace is None:
                _LOGGER.warning("Lovelace resources are unavailable. %s", RESOURCE_HELP)
                return
            # Home Assistant changed Lovelace data from a mapping to a dataclass.
            resources = (
                lovelace.get("resources")
                if isinstance(lovelace, Mapping)
                else lovelace.resources
            )
            if resources is None:
                _LOGGER.warning("Lovelace resources are unavailable. %s", RESOURCE_HELP)
                return

            # This public method loads storage and marks it loaded on both old
            # and current HA. Inspecting async_items() alone can miss disk data.
            await resources.async_get_info()
            entries = [
                item for item in resources.async_items()
                if _resource_path(item.get("url", "")) is not None
            ]
            if getattr(resources, "store", None) is None:
                if not (
                    len(entries) == 1
                    and _resource_path(entries[0]["url"]) == FRONTEND_MODULE_URL
                    and entries[0].get("type") == "module"
                ):
                    _LOGGER.warning(
                        "Velair's YAML-managed Lovelace resource is missing, "
                        "outdated, duplicated or has the wrong type; update the "
                        "resources in YAML manually. %s", RESOURCE_HELP,
                    )
                return

            if module_url is None:
                module_url = await hass.async_add_executor_job(_frontend_module_url)
            if module_url.endswith("?v=missing"):
                return

            if not entries:
                await resources.async_create_item(
                    {"url": module_url, "res_type": "module"}
                )
                _LOGGER.info("Registered Velair dashboard resource %s", module_url)
                return

            # Prefer the current route and type, preserving the selected ID.
            keeper = min(entries, key=lambda item: (
                _resource_path(item["url"]) != FRONTEND_MODULE_URL,
                item.get("type") != "module",
            ))
            if keeper["url"] != module_url or keeper.get("type") != "module":
                await resources.async_update_item(
                    keeper["id"], {"url": module_url, "res_type": "module"}
                )
                _LOGGER.info("Updated Velair dashboard resource to %s", module_url)
            # Never remove a working fallback before updating its replacement.
            for item in entries:
                if item["id"] != keeper["id"]:
                    await resources.async_delete_item(item["id"])
                    _LOGGER.info("Removed duplicate Velair dashboard resource")
        except Exception:  # Optional cards must not prevent climate scheduling.
            _LOGGER.exception(
                "Unable to register the Velair dashboard resource. %s", RESOURCE_HELP
            )


def _frontend_module_url() -> str:
    """Return the same versioned URL for the sidebar and dashboard module."""
    frontend_bundle = FRONTEND_DIR / "velair-card.js"
    try:
        version: str | int = frontend_bundle.stat().st_mtime_ns
    except FileNotFoundError:
        version = "missing"
        _LOGGER.error(
            "Velair frontend bundle not found at %s. Run npm.cmd run build and "
            "copy custom_components/velair including its frontend directory.",
            frontend_bundle,
        )
    return f"{FRONTEND_MODULE_URL}?v={version}"
