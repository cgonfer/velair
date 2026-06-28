"""Unit tests for Velair frontend panel registration."""

from __future__ import annotations

import asyncio
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from types import ModuleType, SimpleNamespace
import unittest


ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SOURCE = ROOT / "frontend" / "src" / "velair-card.ts"
FRONTEND_CARD_ELEMENT_SOURCE = ROOT / "frontend" / "src" / "velair" / "components" / "velair-card-element.ts"
FRONTEND_API_SOURCE = ROOT / "frontend" / "src" / "velair" / "api" / "client.ts"
FRONTEND_CONSTANTS_SOURCE = ROOT / "frontend" / "src" / "velair" / "constants.ts"
FRONTEND_I18N_SOURCE = ROOT / "frontend" / "src" / "velair" / "i18n.ts"
FRONTEND_REGISTRATION_SOURCE = ROOT / "frontend" / "src" / "velair" / "registration.ts"
FRONTEND_SCHEDULE_EVENTS_SOURCE = ROOT / "frontend" / "src" / "velair" / "domain" / "schedule-events.ts"
FRONTEND_PORTABLE_DOMAIN_SOURCE = ROOT / "frontend" / "src" / "velair" / "domain" / "portable.ts"
FRONTEND_SETTINGS_DOMAIN_SOURCE = ROOT / "frontend" / "src" / "velair" / "domain" / "settings.ts"
FRONTEND_FORMATTERS_DOMAIN_SOURCE = ROOT / "frontend" / "src" / "velair" / "domain" / "formatters.ts"
FRONTEND_ENTITY_DIAGNOSTICS_DOMAIN_SOURCE = ROOT / "frontend" / "src" / "velair" / "domain" / "entity-diagnostics.ts"
FRONTEND_TYPES_SOURCE = ROOT / "frontend" / "src" / "velair" / "types.ts"
FRONTEND_HOST_TYPES_SOURCE = ROOT / "frontend" / "src" / "velair" / "host-types.ts"
FRONTEND_TRANSLATIONS_DIR = ROOT / "frontend" / "src" / "velair" / "translations"
FRONTEND_STYLES_SOURCE = ROOT / "frontend" / "src" / "velair" / "styles" / "card-styles.ts"
FRONTEND_BASE_STYLES_SOURCE = ROOT / "frontend" / "src" / "velair" / "styles" / "base-styles.ts"
FRONTEND_NOTICE_STYLES_SOURCE = ROOT / "frontend" / "src" / "velair" / "styles" / "notice-styles.ts"
FRONTEND_OVERVIEW_STYLES_SOURCE = ROOT / "frontend" / "src" / "velair" / "styles" / "overview-styles.ts"
FRONTEND_PORTABILITY_STYLES_SOURCE = ROOT / "frontend" / "src" / "velair" / "styles" / "portability-styles.ts"
FRONTEND_RESPONSIVE_STYLES_SOURCE = ROOT / "frontend" / "src" / "velair" / "styles" / "responsive-styles.ts"
FRONTEND_SETTINGS_STYLES_SOURCE = ROOT / "frontend" / "src" / "velair" / "styles" / "settings-styles.ts"
FRONTEND_PRECONDITIONING_STYLES_SOURCE = ROOT / "frontend" / "src" / "velair" / "styles" / "preconditioning-styles.ts"
FRONTEND_TEMPLATE_STYLES_SOURCE = ROOT / "frontend" / "src" / "velair" / "styles" / "template-styles.ts"
FRONTEND_TIMELINE_STYLES_SOURCE = ROOT / "frontend" / "src" / "velair" / "styles" / "timeline-styles.ts"
FRONTEND_CLIMATE_DOMAIN_SOURCE = ROOT / "frontend" / "src" / "velair" / "domain" / "climate.ts"
FRONTEND_DRAFT_BLOCKS_DOMAIN_SOURCE = ROOT / "frontend" / "src" / "velair" / "domain" / "draft-blocks.ts"
FRONTEND_OVERRIDES_DOMAIN_SOURCE = ROOT / "frontend" / "src" / "velair" / "domain" / "overrides.ts"
FRONTEND_TEMPLATES_DOMAIN_SOURCE = ROOT / "frontend" / "src" / "velair" / "domain" / "templates.ts"
FRONTEND_TIMELINE_DOMAIN_SOURCE = ROOT / "frontend" / "src" / "velair" / "domain" / "timeline.ts"
FRONTEND_CARD_EDITOR_SOURCE = ROOT / "frontend" / "src" / "velair" / "views" / "card-editor.ts"
FRONTEND_CARD_CONTENT_SOURCE = ROOT / "frontend" / "src" / "velair" / "views" / "card-content.ts"
FRONTEND_TABS_SOURCE = ROOT / "frontend" / "src" / "velair" / "views" / "tabs.ts"
FRONTEND_PANEL_SOURCE = ROOT / "frontend" / "src" / "velair" / "views" / "panel.ts"
FRONTEND_OVERVIEW_VIEW_SOURCE = ROOT / "frontend" / "src" / "velair" / "views" / "overview-view.ts"
FRONTEND_SCHEDULE_VIEW_SOURCE = ROOT / "frontend" / "src" / "velair" / "views" / "schedule-view.ts"
FRONTEND_SETTINGS_VIEW_SOURCE = ROOT / "frontend" / "src" / "velair" / "views" / "settings-view.ts"
FRONTEND_PRECONDITIONING_VIEW_SOURCE = ROOT / "frontend" / "src" / "velair" / "views" / "preconditioning-view.ts"
FRONTEND_TEMPLATES_VIEW_SOURCE = ROOT / "frontend" / "src" / "velair" / "views" / "templates-view.ts"
FRONTEND_CARD_CONTEXT_SOURCE = ROOT / "frontend" / "src" / "velair" / "controllers" / "card-context.ts"
FRONTEND_CLIMATE_DISPLAY_SOURCE = ROOT / "frontend" / "src" / "velair" / "controllers" / "climate-display.ts"
FRONTEND_DRAFT_VALIDATION_SOURCE = ROOT / "frontend" / "src" / "velair" / "controllers" / "draft-validation.ts"
FRONTEND_OVERVIEW_DATA_SOURCE = ROOT / "frontend" / "src" / "velair" / "controllers" / "overview-data.ts"
FRONTEND_SCHEDULE_ACTIONS_SOURCE = ROOT / "frontend" / "src" / "velair" / "controllers" / "schedule-actions.ts"
FRONTEND_SCHEDULE_STATE_SOURCE = ROOT / "frontend" / "src" / "velair" / "controllers" / "schedule-state.ts"
FRONTEND_DRAFT_ACTIONS_SOURCE = ROOT / "frontend" / "src" / "velair" / "controllers" / "draft-actions.ts"
FRONTEND_TEMPLATE_ACTIONS_SOURCE = ROOT / "frontend" / "src" / "velair" / "controllers" / "template-actions.ts"
FRONTEND_SCHEDULER_CONTROLS_SOURCE = ROOT / "frontend" / "src" / "velair" / "controllers" / "scheduler-controls.ts"
FRONTEND_NOTICE_ACTIONS_SOURCE = ROOT / "frontend" / "src" / "velair" / "controllers" / "notice-actions.ts"
FRONTEND_PORTABILITY_ACTIONS_SOURCE = ROOT / "frontend" / "src" / "velair" / "controllers" / "portability-actions.ts"
FRONTEND_SETTINGS_ACTIONS_SOURCE = ROOT / "frontend" / "src" / "velair" / "controllers" / "settings-actions.ts"
FRONTEND_TIMELINE_INTERACTIONS_SOURCE = ROOT / "frontend" / "src" / "velair" / "controllers" / "timeline-interactions.ts"
FRONTEND_NOTICE_VIEW_SOURCE = ROOT / "frontend" / "src" / "velair" / "views" / "notice-view.ts"
SERVICES_YAML_SOURCE = ROOT / "custom_components" / "velair" / "services.yaml"


def _frontend_implementation_source() -> str:
    """Return the public entry plus split implementation modules for source contracts."""
    return "\n".join(
        path.read_text(encoding="utf-8")
        for path in (
            FRONTEND_SOURCE,
            FRONTEND_CARD_ELEMENT_SOURCE,
            FRONTEND_HOST_TYPES_SOURCE,
            FRONTEND_CARD_CONTENT_SOURCE,
            FRONTEND_OVERVIEW_VIEW_SOURCE,
            FRONTEND_SCHEDULE_VIEW_SOURCE,
            FRONTEND_SETTINGS_VIEW_SOURCE,
            FRONTEND_PRECONDITIONING_VIEW_SOURCE,
            FRONTEND_TEMPLATES_VIEW_SOURCE,
            FRONTEND_CARD_CONTEXT_SOURCE,
            FRONTEND_CLIMATE_DISPLAY_SOURCE,
            FRONTEND_DRAFT_VALIDATION_SOURCE,
            FRONTEND_OVERVIEW_DATA_SOURCE,
            FRONTEND_SCHEDULE_ACTIONS_SOURCE,
            FRONTEND_SCHEDULE_STATE_SOURCE,
            FRONTEND_DRAFT_ACTIONS_SOURCE,
            FRONTEND_TEMPLATE_ACTIONS_SOURCE,
            FRONTEND_SCHEDULER_CONTROLS_SOURCE,
            FRONTEND_NOTICE_ACTIONS_SOURCE,
            FRONTEND_PORTABILITY_ACTIONS_SOURCE,
            FRONTEND_SETTINGS_ACTIONS_SOURCE,
            FRONTEND_TIMELINE_INTERACTIONS_SOURCE,
            FRONTEND_NOTICE_VIEW_SOURCE,
        )
    )


def _install_homeassistant_stubs() -> dict[str, list]:
    """Install the small subset of Home Assistant modules used by frontend.py."""
    calls: dict[str, list] = {
        "panels": [],
        "removed_panels": [],
    }

    homeassistant = sys.modules.setdefault("homeassistant", ModuleType("homeassistant"))
    homeassistant.__path__ = []

    aiohttp = ModuleType("aiohttp")
    aiohttp.hdrs = SimpleNamespace(
        CACHE_CONTROL="Cache-Control",
        PRAGMA="Pragma",
    )
    aiohttp_web = ModuleType("aiohttp.web")

    class FileResponse:
        def __init__(self, path, headers=None) -> None:
            self.path = path
            self.headers = dict(headers or {})

    class HTTPNotFound(Exception):
        pass

    aiohttp_web.FileResponse = FileResponse
    aiohttp_web.HTTPNotFound = HTTPNotFound
    aiohttp_web.Request = object
    aiohttp.web = aiohttp_web
    sys.modules["aiohttp"] = aiohttp
    sys.modules["aiohttp.web"] = aiohttp_web

    components = ModuleType("homeassistant.components")
    components.__path__ = []
    sys.modules["homeassistant.components"] = components

    frontend = ModuleType("homeassistant.components.frontend")
    frontend.async_remove_panel = (
        lambda hass, path, **kwargs: calls["removed_panels"].append((path, kwargs))
    )
    sys.modules["homeassistant.components.frontend"] = frontend

    http = ModuleType("homeassistant.components.http")
    sys.modules["homeassistant.components.http"] = http

    helpers = ModuleType("homeassistant.helpers")
    helpers.__path__ = []
    sys.modules["homeassistant.helpers"] = helpers

    helpers_http = ModuleType("homeassistant.helpers.http")

    class HomeAssistantView:
        pass

    helpers_http.HomeAssistantView = HomeAssistantView
    sys.modules["homeassistant.helpers.http"] = helpers_http

    panel_custom = ModuleType("homeassistant.components.panel_custom")

    async def async_register_panel(hass, *args, **kwargs):
        calls["panels"].append((args, kwargs))

    panel_custom.async_register_panel = async_register_panel
    sys.modules["homeassistant.components.panel_custom"] = panel_custom

    const = ModuleType("homeassistant.const")
    const.ATTR_ENTITY_ID = "entity_id"
    const.Platform = SimpleNamespace(
        SENSOR="sensor",
        SELECT="select",
        SWITCH="switch",
    )
    sys.modules["homeassistant.const"] = const

    core = ModuleType("homeassistant.core")
    core.HomeAssistant = object
    sys.modules["homeassistant.core"] = core

    return calls


def _install_custom_component_package_stub() -> None:
    """Load integration modules without executing the package __init__."""
    custom_components = ModuleType("custom_components")
    custom_components.__path__ = [str(ROOT / "custom_components")]
    sys.modules.setdefault("custom_components", custom_components)

    package = ModuleType("custom_components.velair")
    package.__path__ = [str(ROOT / "custom_components" / "velair")]
    sys.modules.setdefault("custom_components.velair", package)


class FakeHttp:
    """Capture frontend view registrations."""

    def __init__(self) -> None:
        self.views = []

    def register_view(self, view) -> None:
        self.views.append(view)


class FakeHass:
    """Tiny Home Assistant stand-in for frontend registration."""

    def __init__(self) -> None:
        self.data = {}
        self.http = FakeHttp()


class FrontendRegistrationTest(unittest.TestCase):
    """Validate the sidebar panel registration helpers."""

    def setUp(self) -> None:
        self.calls = _install_homeassistant_stubs()
        _install_custom_component_package_stub()
        sys.modules.pop("custom_components.velair.frontend", None)
        self.frontend = __import__(
            "custom_components.velair.frontend",
            fromlist=["frontend"],
        )

    def test_setup_registers_stable_panel_url_when_bundle_is_missing(self) -> None:
        """Panel registration never falls back to the Lovelace /local bundle."""
        with TemporaryDirectory() as temp_dir:
            self.frontend.FRONTEND_DIR = Path(temp_dir) / "missing"
            hass = FakeHass()

            asyncio.run(self.frontend.async_setup_frontend(hass))

        self.assertEqual(
            self.calls["panels"][0][1]["module_url"],
            "/velair_frontend/velair-card.js?v=missing",
        )
        self.assertEqual(self.calls["panels"][0][1]["webcomponent_name"], "velair-sidebar-panel")
        self.assertEqual(self.calls["panels"][0][1]["frontend_url_path"], "velair")

    def test_setup_serves_cache_busted_isolated_sidebar_module(self) -> None:
        """The sidebar bypasses stale external resources and custom elements."""
        with TemporaryDirectory() as temp_dir:
            frontend_dir = Path(temp_dir)
            (frontend_dir / "velair-card.js").write_text("", encoding="utf-8")
            self.frontend.FRONTEND_DIR = frontend_dir
            hass = FakeHass()

            asyncio.run(self.frontend.async_setup_frontend(hass))

            response = asyncio.run(hass.http.views[0].get(None, "velair-card.js"))

        self.assertTrue(
            self.calls["panels"][0][1]["module_url"].startswith(
                "/velair_frontend/velair-card.js?v="
            )
        )
        self.assertEqual(
            self.calls["panels"][0][1]["webcomponent_name"],
            "velair-sidebar-panel",
        )
        self.assertEqual(len(hass.http.views), 1)
        self.assertEqual(
            response.headers["Cache-Control"],
            "no-store, no-cache, must-revalidate",
        )
        self.assertEqual(response.headers["Pragma"], "no-cache")

    def test_setup_registers_frontend_route_only_once(self) -> None:
        """Config entry reloads should not register duplicate HTTP routes."""
        hass = FakeHass()

        asyncio.run(self.frontend.async_setup_frontend(hass))
        asyncio.run(self.frontend.async_setup_frontend(hass))

        self.assertEqual(len(hass.http.views), 1)

    def test_unload_removes_panel_and_extra_module(self) -> None:
        """Unload cleans up the sidebar panel and registered module."""
        hass = FakeHass()

        asyncio.run(self.frontend.async_unload_frontend(hass))

        self.assertEqual(self.calls["removed_panels"][0][0], "velair")


class FrontendSourceContractTest(unittest.TestCase):
    """Guard the panel/card contract that keeps tab views independent."""

    def test_service_duration_selectors_allow_week_long_overrides(self) -> None:
        """Boost and pause service selectors should allow longer practical durations."""
        services_source = SERVICES_YAML_SOURCE.read_text(encoding="utf-8")

        self.assertNotIn("max: 240", services_source)
        self.assertNotIn("max: 1440", services_source)
        self.assertGreaterEqual(services_source.count("max: 10080"), 3)

    def test_cancel_boost_service_has_a_managed_climate_selector(self) -> None:
        """Manual boost cancellation must target one explicit climate entity."""
        services_source = SERVICES_YAML_SOURCE.read_text(encoding="utf-8")

        self.assertIn("cancel_boost:", services_source)
        cancel_boost = services_source.split("cancel_boost:", 1)[1].split(
            "\npause:",
            1,
        )[0]
        self.assertIn("entity_id:", cancel_boost)
        self.assertIn("domain: climate", cancel_boost)

    def test_frontend_has_modular_foundation_files(self) -> None:
        """Shared types, constants, and time helpers should stay outside the main element."""
        source = _frontend_implementation_source()
        constants_source = FRONTEND_CONSTANTS_SOURCE.read_text(encoding="utf-8")
        i18n_source = FRONTEND_I18N_SOURCE.read_text(encoding="utf-8")
        types_source = FRONTEND_TYPES_SOURCE.read_text(encoding="utf-8")
        host_types_source = FRONTEND_HOST_TYPES_SOURCE.read_text(encoding="utf-8")
        styles_source = FRONTEND_STYLES_SOURCE.read_text(encoding="utf-8")
        base_styles_source = FRONTEND_BASE_STYLES_SOURCE.read_text(encoding="utf-8")
        notice_styles_source = FRONTEND_NOTICE_STYLES_SOURCE.read_text(encoding="utf-8")
        overview_styles_source = FRONTEND_OVERVIEW_STYLES_SOURCE.read_text(encoding="utf-8")
        portability_styles_source = FRONTEND_PORTABILITY_STYLES_SOURCE.read_text(encoding="utf-8")
        responsive_styles_source = FRONTEND_RESPONSIVE_STYLES_SOURCE.read_text(encoding="utf-8")
        settings_styles_source = FRONTEND_SETTINGS_STYLES_SOURCE.read_text(encoding="utf-8")
        preconditioning_styles_source = FRONTEND_PRECONDITIONING_STYLES_SOURCE.read_text(encoding="utf-8")
        template_styles_source = FRONTEND_TEMPLATE_STYLES_SOURCE.read_text(encoding="utf-8")
        timeline_styles_source = FRONTEND_TIMELINE_STYLES_SOURCE.read_text(encoding="utf-8")
        editor_source = FRONTEND_CARD_EDITOR_SOURCE.read_text(encoding="utf-8")
        registration_source = FRONTEND_REGISTRATION_SOURCE.read_text(encoding="utf-8")
        tabs_source = FRONTEND_TABS_SOURCE.read_text(encoding="utf-8")
        panel_source = FRONTEND_PANEL_SOURCE.read_text(encoding="utf-8")
        card_context_source = FRONTEND_CARD_CONTEXT_SOURCE.read_text(encoding="utf-8")
        draft_validation_source = FRONTEND_DRAFT_VALIDATION_SOURCE.read_text(encoding="utf-8")
        translation_index = (FRONTEND_TRANSLATIONS_DIR / "index.ts").read_text(encoding="utf-8")
        translation_template = (FRONTEND_TRANSLATIONS_DIR / "template.ts").read_text(encoding="utf-8")
        time_source = (ROOT / "frontend" / "src" / "velair" / "schedule-time.ts").read_text(
            encoding="utf-8",
        )

        self.assertIn('from "./velair/components/velair-card-element"', source)
        self.assertIn('from "../types"', source)
        self.assertIn('from "../constants"', source)
        self.assertIn('from "../schedule-time"', source)
        self.assertIn('from "../styles/card-styles"', source)
        self.assertIn('from "../translations"', source)
        self.assertIn('from "../i18n"', source)
        self.assertIn('from "../controllers/card-context"', source)
        self.assertIn('from "../controllers/draft-validation"', source)
        self.assertIn('from "./velair/registration"', source)
        self.assertIn('from "./velair/views/card-editor"', source)
        self.assertIn('from "./velair/views/panel"', source)
        self.assertIn("export type ScheduleResponse", types_source)
        self.assertIn(
            "export const cardStyles = [baseStyles, noticeStyles, overviewStyles, portabilityStyles, preconditioningStyles, settingsStyles, templateStyles, timelineStyles, css`",
            styles_source,
        )
        self.assertIn("`, responsiveStyles];", styles_source)
        self.assertIn("export const baseStyles = css`", base_styles_source)
        self.assertIn(".section-heading", base_styles_source)
        self.assertIn(".section-heading ha-icon", base_styles_source)
        self.assertIn(".section-label", base_styles_source)
        self.assertIn("export const noticeStyles = css`", notice_styles_source)
        self.assertIn("export const NOTICE_AUTO_DISMISS_MS = 5_000", constants_source)
        self.assertIn("position: fixed", notice_styles_source)
        self.assertIn("bottom: 16px", notice_styles_source)
        self.assertIn("@keyframes velair-notice-in", notice_styles_source)
        self.assertIn("transition: width 500ms linear", notice_styles_source)
        self.assertIn("export const overviewStyles = css`", overview_styles_source)
        self.assertIn("export const portabilityStyles = css`", portability_styles_source)
        self.assertIn("export const responsiveStyles = css`", responsive_styles_source)
        self.assertIn("export const settingsStyles = css`", settings_styles_source)
        self.assertIn("export const preconditioningStyles = css`", preconditioning_styles_source)
        self.assertIn("export const templateStyles = css`", template_styles_source)
        self.assertIn("export const timelineStyles = css`", timeline_styles_source)
        self.assertIn("export class VelairCardEditor", editor_source)
        self.assertIn("export const PANEL_VIEWS", constants_source)
        self.assertIn("export const PANEL_TABS", tabs_source)
        self.assertIn("export class VelairPanel", panel_source)
        self.assertIn("export const TRANSLATIONS", translation_index)
        self.assertIn("import.meta.glob", translation_index)
        self.assertIn('language !== "template"', translation_index)
        self.assertIn('language !== "types"', translation_index)
        self.assertNotIn('import { es } from "./es"', translation_index)
        self.assertIn("translationTemplate", translation_template)
        self.assertIn("export function translate", i18n_source)
        self.assertIn("export function weekdayName", i18n_source)
        self.assertIn("export function dictionaryLabel", i18n_source)
        self.assertIn("export function registerVelairFrontend", registration_source)
        self.assertIn("export function effectiveView", card_context_source)
        self.assertIn("export function shouldUpdateForHass", card_context_source)
        self.assertIn("export function translateForHost", card_context_source)
        self.assertIn("export function orderedZoneIdsForHost", card_context_source)
        self.assertIn("export function hasDraftValidationError", draft_validation_source)
        self.assertIn("export function temperatureError", draft_validation_source)
        self.assertIn("export function minutesFromTime", time_source)
        self.assertIn("export function nextStartTime", time_source)
        self.assertIn("export type VelairViewHost", host_types_source)
        self.assertIn("export function asVelairViewHost", host_types_source)
        for view_source_path in (
            FRONTEND_CARD_CONTENT_SOURCE,
            FRONTEND_NOTICE_VIEW_SOURCE,
            FRONTEND_OVERVIEW_VIEW_SOURCE,
            FRONTEND_SCHEDULE_VIEW_SOURCE,
            FRONTEND_SETTINGS_VIEW_SOURCE,
            FRONTEND_PRECONDITIONING_VIEW_SOURCE,
            FRONTEND_TEMPLATES_VIEW_SOURCE,
        ):
            view_source = view_source_path.read_text(encoding="utf-8")
            self.assertIn('from "../host-types"', view_source)
            self.assertNotIn("Host = any", view_source)
        for controller_source_path in (
            FRONTEND_CLIMATE_DISPLAY_SOURCE,
            FRONTEND_DRAFT_ACTIONS_SOURCE,
            FRONTEND_DRAFT_VALIDATION_SOURCE,
            FRONTEND_NOTICE_ACTIONS_SOURCE,
            FRONTEND_OVERVIEW_DATA_SOURCE,
            FRONTEND_PORTABILITY_ACTIONS_SOURCE,
            FRONTEND_SCHEDULE_ACTIONS_SOURCE,
            FRONTEND_SCHEDULE_STATE_SOURCE,
            FRONTEND_SCHEDULER_CONTROLS_SOURCE,
            FRONTEND_SETTINGS_ACTIONS_SOURCE,
            FRONTEND_CARD_CONTEXT_SOURCE,
            FRONTEND_TEMPLATE_ACTIONS_SOURCE,
            FRONTEND_TIMELINE_INTERACTIONS_SOURCE,
        ):
            self.assertNotIn("Host = any", controller_source_path.read_text(encoding="utf-8"))

    def test_preconditioning_has_a_dedicated_panel_view(self) -> None:
        """Preconditioning controls should stay out of the general Settings view."""
        constants_source = FRONTEND_CONSTANTS_SOURCE.read_text(encoding="utf-8")
        content_source = FRONTEND_CARD_CONTENT_SOURCE.read_text(encoding="utf-8")
        responsive_styles_source = FRONTEND_RESPONSIVE_STYLES_SOURCE.read_text(encoding="utf-8")
        settings_source = FRONTEND_SETTINGS_VIEW_SOURCE.read_text(encoding="utf-8")
        tabs_source = FRONTEND_TABS_SOURCE.read_text(encoding="utf-8")

        self.assertIn('"preconditioning"', constants_source)
        self.assertIn('view: "preconditioning"', tabs_source)
        self.assertIn('view === "preconditioning"', content_source)
        self.assertIn("renderPreconditioningView(host, visibleZoneIds)", content_source)
        self.assertNotIn("renderPreconditioningView", settings_source)
        self.assertNotIn("preconditioning-config", settings_source)
        self.assertNotIn("_saveZonePreconditioning", settings_source)
        self.assertIn("@container (max-width: 760px)", responsive_styles_source)
        self.assertIn(".preconditioning-config-sections,\n    .preconditioning-directions", responsive_styles_source)
        self.assertIn("@container (max-width: 600px)", responsive_styles_source)
        self.assertIn(".preconditioning-config-row,\n    .preconditioning-sensor-row", responsive_styles_source)

    def test_panel_passes_active_view_to_card(self) -> None:
        """The sidebar panel must pass the selected view to the rendered card."""
        source = _frontend_implementation_source()
        api_source = FRONTEND_API_SOURCE.read_text(encoding="utf-8")
        entity_diagnostics_domain_source = FRONTEND_ENTITY_DIAGNOSTICS_DOMAIN_SOURCE.read_text(encoding="utf-8")
        portable_domain_source = FRONTEND_PORTABLE_DOMAIN_SOURCE.read_text(encoding="utf-8")
        registration_source = FRONTEND_REGISTRATION_SOURCE.read_text(encoding="utf-8")
        settings_domain_source = FRONTEND_SETTINGS_DOMAIN_SOURCE.read_text(encoding="utf-8")
        panel_source = FRONTEND_PANEL_SOURCE.read_text(encoding="utf-8")

        self.assertIn(".view=${this._activeView}", panel_source)
        self.assertIn("view=${this._activeView}", panel_source)
        self.assertIn("<velair-panel-card", panel_source)
        self.assertNotIn("<velair-card", panel_source)
        self.assertNotIn("<velair-scheduler-view", panel_source)
        self.assertIn("registerVelairFrontend({", source)
        self.assertNotIn('"velair-scheduler-view"', source)
        self.assertIn("customElements.define(name, constructor)", registration_source)
        self.assertIn("window.customCards", registration_source)
        self.assertIn("keyed(", panel_source)
        self.assertIn('<section class="view panel-content">', panel_source)
        self.assertIn("?active=${view === this._activeView}", panel_source)
        self.assertIn("@click=${(event: Event) => this._handleTabClick(view, event)}", panel_source)
        self.assertIn('tabGroup.setAttribute("active", view)', panel_source)
        self.assertIn('tab.toggleAttribute("active", isActive)', panel_source)
        self.assertIn("event.stopPropagation()", panel_source)
        self.assertNotIn("wa-tab-panel", panel_source)
        self.assertNotIn("panel-tab-label", panel_source)
        self.assertNotIn("@wa-tab-show", panel_source)
        self.assertNotIn("@active-changed", panel_source)

    def test_tab_handler_keeps_tab_group_active_in_sync(self) -> None:
        """The tab click handler should keep the HA active contract in sync."""
        source = FRONTEND_PANEL_SOURCE.read_text(encoding="utf-8")

        self.assertIn("private _handleTabClick", source)
        self.assertIn("private _syncTabGroupActive", source)
        self.assertIn("tabGroup.active = view", source)
        self.assertIn('tab.setAttribute("aria-selected", String(isActive))', source)

    def test_card_renders_from_host_view_attribute(self) -> None:
        """The embedded card should use the host view attribute when present."""
        source = _frontend_implementation_source()
        constants_source = FRONTEND_CONSTANTS_SOURCE.read_text(encoding="utf-8")
        editor_source = FRONTEND_CARD_EDITOR_SOURCE.read_text(encoding="utf-8")

        self.assertIn("const view = host._effectiveView();", source)
        self.assertIn('return effectiveView(this.getAttribute("view"), this.view, this._config.view);', source)
        self.assertIn("data-view=${view}", source)
        self.assertIn("return renderCardContent(asVelairViewHost(this));", source)
        self.assertIn("renderViewContent(host, view,", source)
        self.assertIn("export const LOVELACE_CARD_VIEWS", constants_source)
        self.assertIn('"overview-status"', constants_source)
        self.assertIn('"overview-boosts"', constants_source)
        self.assertIn('"overview-events"', constants_source)
        self.assertIn('"overview-timeline"', constants_source)
        self.assertIn('"overview-zones"', constants_source)
        self.assertIn('"schedules"', constants_source)
        self.assertIn('"preconditioning"', constants_source)
        self.assertIn('view: "overview-status"', source)
        self.assertIn("this._config.view", source)
        self.assertIn('if (view === "overview-status")', source)
        self.assertIn('if (view === "overview-boosts")', source)
        self.assertIn('if (view === "overview-events")', source)
        self.assertIn('if (view === "overview-timeline")', source)
        self.assertIn('if (view === "overview-zones")', source)
        self.assertIn('if (view === "preconditioning")', source)
        self.assertNotIn('view === "full"', source)
        self.assertIn("LOVELACE_CARD_VIEWS.map", editor_source)
        self.assertIn("cardViewOverviewStatus", editor_source)

    def test_overview_view_has_status_events_and_zone_metrics(self) -> None:
        """The overview tab should be a complete read-only status view."""
        source = _frontend_implementation_source()
        formatters_domain_source = FRONTEND_FORMATTERS_DOMAIN_SOURCE.read_text(encoding="utf-8")
        overrides_domain_source = FRONTEND_OVERRIDES_DOMAIN_SOURCE.read_text(encoding="utf-8")
        schedule_events_source = FRONTEND_SCHEDULE_EVENTS_SOURCE.read_text(encoding="utf-8")
        timeline_domain_source = FRONTEND_TIMELINE_DOMAIN_SOURCE.read_text(encoding="utf-8")
        overview_styles_source = FRONTEND_OVERVIEW_STYLES_SOURCE.read_text(encoding="utf-8")
        responsive_styles_source = FRONTEND_RESPONSIVE_STYLES_SOURCE.read_text(encoding="utf-8")
        en_source = (FRONTEND_TRANSLATIONS_DIR / "en.ts").read_text(encoding="utf-8")
        es_source = (FRONTEND_TRANSLATIONS_DIR / "es.ts").read_text(encoding="utf-8")
        template_source = (FRONTEND_TRANSLATIONS_DIR / "template.ts").read_text(encoding="utf-8")

        self.assertIn("renderOverviewSummary(host, zoneIds)", source)
        self.assertIn("renderOverviewActiveBoosts(host, visibleZoneIds)", source)
        self.assertIn("renderNextEvents(host, visibleZoneIds)", source)
        self.assertIn("renderOverviewTimelines(host, visibleZoneIds)", source)
        self.assertIn("renderOverviewZones(host, visibleZoneIds)", source)
        self.assertIn("const visibleZoneIds = host._visibleZoneIds", source)
        self.assertIn("function renderOverviewSectionHeading", source)
        self.assertIn('class="overview-section-title section-heading"', source)
        self.assertIn('"mdi:calendar-clock"', source)
        self.assertIn('"mdi:timeline-clock-outline"', source)
        self.assertIn('"mdi:thermostat"', source)
        self.assertIn('from "../controllers/overview-data"', source)
        self.assertIn("const overviewHost = asOverviewDataHost(host)", source)
        self.assertIn("export function currentTemperature", source)
        self.assertIn("export function overviewNextEvents", source)
        self.assertIn("export function nextEventForEntity", source)
        self.assertIn("nextEventForZone(entityId, zone", source)
        self.assertIn("export function scheduledEventAt", schedule_events_source)
        self.assertIn("export function nextScheduleEventAfter", schedule_events_source)
        self.assertIn("activeOverrideForEntity(overviewHost, entityId, zone)", source)
        self.assertIn("export function eventDateTime", schedule_events_source)
        self.assertIn("private _dateLocale", source)
        self.assertIn("formatDateTime(value, host._dateLocale())", source)
        self.assertIn("export function formatDateTime", formatters_domain_source)
        self.assertIn("date.toLocaleString(locale", formatters_domain_source)
        self.assertIn("export function formatRemaining", formatters_domain_source)
        self.assertIn("export function formatEventAction", formatters_domain_source)
        self.assertIn("for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1)", schedule_events_source)
        self.assertIn("export function renderEventDetails", source)
        self.assertIn("event-details", source)
        self.assertIn("event-mode", source)
        self.assertIn("overview-boost-status", source)
        self.assertIn("overview-boost-panel", source)
        self.assertIn("overview-scheduler-state", source)
        self.assertIn("overview-scheduler-detail", source)
        self.assertIn("overviewSchedulerState(host)", source)
        self.assertIn("status-${schedulerState.state}", source)
        self.assertIn('state: "running"', source)
        self.assertIn('state: "paused"', source)
        self.assertIn('state: "stopped"', source)
        self.assertIn("activeBoosts", source)
        self.assertIn("overview-zone-table", source)
        self.assertIn("overview-zone-table-scroll", source)
        self.assertIn("overview-zone-cell sticky", source)
        self.assertIn("renderOverviewZoneSetpoint", source)
        self.assertIn("renderOverviewZoneState", source)
        self.assertIn('target === host._t("off") && mode === host._t("off")', source)
        self.assertIn("overview-zone-setpoint", source)
        self.assertIn("overview-zone-transition", source)
        self.assertIn("overview-zone-arrow", source)
        self.assertIn('icon="mdi:arrow-right"', source)
        self.assertIn("overviewZoneTargetState", source)
        self.assertIn("overviewZoneModeState", source)
        self.assertIn("scheduledEventAt(entityId, zone, new Date())", source)
        self.assertIn("overview-pause-input", source)
        self.assertIn("renderOverviewSchedulerControls(host)", source)
        self.assertIn("host._pauseScheduler(false, { showSuccess: false })", source)
        self.assertIn("host._pauseScheduler(true, { showSuccess: false })", source)
        self.assertIn("host._resumeScheduler({ showSuccess: false })", source)
        self.assertIn("showSuccess?: boolean", source)
        self.assertIn("export function renderOverviewActiveBoosts", source)
        self.assertNotIn('renderOverviewMetric(host._t("managedZones")', source)
        self.assertNotIn('renderOverviewMetric(host._t("boost")', source)
        self.assertNotIn('renderOverviewMetric(host._t("nextEvents")', source)
        self.assertNotIn("renderOverviewMetric", source)
        self.assertNotIn("overview-block-summary", source)
        self.assertNotIn("overview-zone-next", source)
        self.assertNotIn("zoneScheduleBlockCounts", source)
        self.assertNotIn('"scheduleBlocks"', en_source)
        self.assertNotIn('"scheduleBlocks"', es_source)
        self.assertNotIn('"scheduleBlocks"', template_source)
        self.assertNotIn('"today"', en_source)
        self.assertNotIn('"week"', en_source)
        self.assertNotIn("renderOverviewModeMetric", source)
        self.assertIn("export function boostDetailText", source)
        self.assertIn("export function climateMode", source)
        self.assertIn("overview-zone-transition-symbol", source)
        self.assertIn(".overview-zone-transition-symbol", overview_styles_source)
        self.assertNotIn("climateModeIcon(host.hass?.states?.[entityId]?.state)", source)
        self.assertIn("mdi:lightning-bolt", source)
        self.assertIn("export function renderBoostEventDetails", source)
        self.assertIn("renderBoostEventDetails(host, entityId, override)", source)
        self.assertIn('class="event-list overview-boost-list"', source)
        self.assertIn('class="event-details"', source)
        self.assertIn('class="event-time"', source)
        self.assertIn('class="event-target"', source)
        self.assertIn('class="event-mode"', source)
        self.assertNotIn("overview-boost-chip", source)
        self.assertIn("private _canResumeScheduler", source)
        self.assertIn("private _schedulerStatusLabel", source)
        self.assertIn("private _schedulerModeLabel", source)
        self.assertIn("private _hvacActionLabel", source)
        self.assertIn("schedulerStatuses", source)
        self.assertIn("hvacModes", source)
        self.assertIn("overview-mode-value", source)
        self.assertNotIn("climateModeClass(overviewHost, entityId)", source)
        self.assertIn("export function renderOverviewTimelines", source)
        self.assertIn("export function renderOverviewTimelineName", source)
        self.assertIn("overview-timeline-panel", source)
        self.assertIn("overview-timeline-layout", source)
        self.assertIn("overview-timeline-now-line", source)
        self.assertIn("overview-timeline-block", source)
        self.assertIn("renderOverviewTimelineBoost", source)
        self.assertIn("renderOverviewTimelinePause", source)
        self.assertIn("timelineBoostBlockFromOverride", source)
        self.assertIn("timelinePauseBlockFromOverride", timeline_domain_source)
        self.assertIn("overview-timeline-boost", source)
        self.assertIn("overview-timeline-pause", source)
        self.assertIn("paused-indefinite", source)
        self.assertNotIn('"overview-timeline-track paused"', source)
        self.assertIn("activePauseOverrideForEntity", source)
        self.assertIn("pauseDetailText", source)
        self.assertIn("host._formatDateTime(new Date(startedMs).toISOString())", source)
        self.assertIn("host._formatDateTime(new Date(untilMs).toISOString())", source)
        self.assertNotIn("timeFromBoostEnd(pauseBlock.startMinute)", source)
        self.assertNotIn("timeFromBoostEnd(pauseBlock.endMinute)", source)
        self.assertIn("mdi:lightning-bolt", source)
        self.assertIn('icon="mdi:pause-circle"', source)
        self.assertIn('icon="mdi:pause"', source)
        self.assertIn("overview-timeline-tap-detail", source)
        self.assertIn("_showOverviewTimelineDetail", source)
        self.assertIn("_overviewTimelineDetailAnchor", source)
        self.assertIn("_overviewTimelineDetailEntityId", source)
        self.assertIn("host._overviewTimelineDetailEntityId === entityId", source)
        self.assertIn("--overview-detail-left", source)
        self.assertIn("overviewTimelineDetailPlacementClass", source)
        self.assertIn("align-end", source)
        self.assertIn("align-start", source)
        self.assertIn("align-center", source)
        self.assertIn("timelineBlock.left + timelineBlock.width / 2", source)
        self.assertIn("boostBlock.left + boostBlock.width / 2", source)
        self.assertIn("_clearOverviewTimelineDetail", source)
        self.assertIn("window.matchMedia", source)
        self.assertIn("overviewTimelineBlockModeLabel", source)
        self.assertIn("block.action === ACTION_TURN_OFF", source)
        self.assertIn("overview-timeline-block-main", source)
        self.assertIn("overviewStatusRunning", en_source)
        self.assertIn("overviewStatusRunning", es_source)
        self.assertIn("overviewStatusRunning", template_source)
        self.assertIn("overviewStatusStopped", en_source)
        self.assertIn("overviewStatusStopped", es_source)
        self.assertIn("overviewStatusStopped", template_source)
        self.assertIn("pauseActive", en_source)
        self.assertIn("pauseActive", es_source)
        self.assertIn("pauseActive", template_source)
        self.assertIn("pauseFrom", en_source)
        self.assertIn("pauseTo", en_source)
        self.assertIn("timelineBlocksFromScheduleBlocks(blocks)", source)
        self.assertIn("timelineNowMarker(host._currentTimelineNow())", source)
        self.assertIn('host._t("todayTimeline")', source)
        self.assertIn(".overview-timeline-scroll", overview_styles_source)
        self.assertIn("overflow-x: auto", overview_styles_source)
        self.assertIn("padding-bottom: 8px", overview_styles_source)
        self.assertIn("scrollbar-gutter: stable", overview_styles_source)
        self.assertIn("position: sticky", overview_styles_source)
        self.assertIn("grid-template-columns: var(--overview-timeline-name-column) minmax(480px, 1fr)", overview_styles_source)
        self.assertIn("min-width: calc(var(--overview-timeline-name-column) + 480px)", overview_styles_source)
        self.assertIn(".overview-timeline-block-main", overview_styles_source)
        self.assertIn(".overview-scheduler-state", overview_styles_source)
        self.assertIn(".overview-scheduler-detail", overview_styles_source)
        self.assertIn("grid-column: 1 / -1", overview_styles_source)
        self.assertIn(".overview-status-card.status-running", overview_styles_source)
        self.assertIn(".overview-status-card.status-paused", overview_styles_source)
        self.assertIn(".overview-status-card.status-stopped", overview_styles_source)
        self.assertIn(".overview-state-value.running ha-icon", overview_styles_source)
        self.assertIn(".overview-status-card .pause-progress", overview_styles_source)
        self.assertIn("border-radius: 0", overview_styles_source)
        self.assertIn("--overview-pause-digits: 6ch", overview_styles_source)
        self.assertIn("calc(var(--overview-pause-digits) + 18px) 28px 34px", overview_styles_source)
        self.assertIn("--overview-pause-digits: 4ch", responsive_styles_source)
        self.assertIn(".overview-boost-list", overview_styles_source)
        self.assertIn("grid-template-columns: 1fr", overview_styles_source)
        self.assertIn("grid-template-columns: minmax(110px, 1fr) max-content", overview_styles_source)
        self.assertIn("grid-template-columns: 18ch 8ch 12ch", overview_styles_source)
        self.assertIn("justify-content: end", overview_styles_source)
        self.assertIn("width: max-content", overview_styles_source)
        self.assertIn("overflow-x: auto", overview_styles_source)
        self.assertIn(".overview-summary {\n  margin: 0;", overview_styles_source)
        self.assertIn(".event-list {\n  min-width: 0;\n  overflow-x: auto;\n  overscroll-behavior-x: contain;\n  padding-bottom: 8px;", overview_styles_source)
        self.assertIn(".event-time", overview_styles_source)
        self.assertIn(".event-target", overview_styles_source)
        self.assertIn("min-width: 560px", responsive_styles_source)
        self.assertIn("--ha-card-background: transparent", responsive_styles_source)
        self.assertIn(".card {\n      padding: 0;", responsive_styles_source)
        self.assertNotIn(".overview-boost-chip", overview_styles_source)
        self.assertIn(".overview-empty-state", overview_styles_source)
        self.assertIn("grid-template-columns: 28px minmax(0, 1fr)", overview_styles_source)
        self.assertIn(".next .event-list", overview_styles_source)
        self.assertIn("margin-top: 14px", overview_styles_source)
        self.assertIn("grid-template-columns: minmax(110px, 150px) max-content", responsive_styles_source)
        self.assertIn("grid-template-columns: 18ch 8ch 12ch", responsive_styles_source)
        self.assertIn(".next .event-list.has-preconditioning .event-details", responsive_styles_source)
        self.assertIn("grid-template-columns: 40ch 8ch 12ch", responsive_styles_source)
        self.assertIn("grid-template-columns: 16px 17ch 16px 17ch", responsive_styles_source)
        self.assertIn(".next .event-list.has-preconditioning .event-time-single .target-time", responsive_styles_source)
        self.assertIn("grid-column: 4", responsive_styles_source)
        self.assertIn("justify-content: flex-start", responsive_styles_source)
        self.assertIn("grid-template-columns: 42ch 8ch 12ch", overview_styles_source)
        self.assertIn("--overview-timeline-name-column: 168px", overview_styles_source)
        self.assertIn("left: calc(var(--overview-timeline-name-column) + 10px)", responsive_styles_source)
        self.assertIn(".overview-timeline-block-main {\n      left: calc(var(--overview-timeline-name-column) + 12px);", responsive_styles_source)
        self.assertIn("max-width: min(150px, calc(100vw - var(--overview-timeline-name-column) - 32px))", responsive_styles_source)
        self.assertIn(".overview-timeline-boost", overview_styles_source)
        self.assertIn(".overview-timeline-pause", overview_styles_source)
        self.assertIn(".overview-timeline-name.paused", overview_styles_source)
        self.assertIn(".overview-timeline-track.paused-indefinite .overview-timeline-block", overview_styles_source)
        self.assertNotIn(".overview-timeline-track.paused .overview-timeline-block", overview_styles_source)
        self.assertIn("color-mix(in srgb, var(--card-background-color) 84%, var(--secondary-text-color) 16%)", overview_styles_source)
        self.assertIn("color-mix(in srgb, var(--card-background-color) 74%, var(--secondary-text-color) 26%)", overview_styles_source)
        self.assertNotIn("backdrop-filter: grayscale(1) saturate(0.2)", overview_styles_source)
        self.assertNotIn("color-mix(in srgb, var(--card-background-color) 62%, transparent)", overview_styles_source)
        self.assertIn("filter: grayscale(0.9) saturate(0.35)", overview_styles_source)
        self.assertIn(".overview-timeline-boost::before", overview_styles_source)
        self.assertIn(".overview-timeline-boost::after", overview_styles_source)
        self.assertIn("velair-overview-boost-bars", overview_styles_source)
        self.assertIn("z-index: 7", overview_styles_source)
        self.assertIn("z-index: 6", overview_styles_source)
        self.assertIn("z-index: 4", overview_styles_source)
        self.assertIn("linear-gradient(\n      110deg", overview_styles_source)
        self.assertIn("animation-delay: -2.4s", overview_styles_source)
        self.assertIn("transform: translateX(-130%)", overview_styles_source)
        self.assertIn("transform: translateX(260%)", overview_styles_source)
        self.assertIn("opacity: 0", overview_styles_source)
        self.assertIn("opacity: 1", overview_styles_source)
        self.assertIn("isolation: isolate", overview_styles_source)
        self.assertIn("z-index: 0", overview_styles_source)
        self.assertNotIn("repeating-linear-gradient", overview_styles_source)
        self.assertIn(".overview-timeline-tap-detail", overview_styles_source)
        self.assertIn("position: absolute", overview_styles_source)
        self.assertIn("top: 50%", overview_styles_source)
        self.assertIn(".overview-timeline-tap-detail.align-start", overview_styles_source)
        self.assertIn(".overview-timeline-tap-detail.align-center", overview_styles_source)
        self.assertIn(".overview-timeline-tap-detail.align-end", overview_styles_source)
        self.assertIn("left: max(8px, var(--overview-detail-left, 50%))", overview_styles_source)
        self.assertIn("left: clamp(88px, var(--overview-detail-left, 50%), calc(100% - 88px))", overview_styles_source)
        self.assertIn("right: max(8px, calc(100% - var(--overview-detail-left, 50%)))", overview_styles_source)
        self.assertIn("transform: translate(-50%, -50%)", overview_styles_source)
        self.assertIn("prefers-reduced-motion", overview_styles_source)
        self.assertIn("flex-wrap: wrap", overview_styles_source)
        self.assertIn("overflow: hidden", overview_styles_source)
        self.assertIn("(hover: none), (pointer: coarse)", overview_styles_source)
        self.assertNotIn("overview-timeline-detail", source)
        self.assertNotIn("overview-timeline-detail", overview_styles_source)
        self.assertNotIn("_overviewTimelineDetailTimeout", source)
        self.assertNotIn("window.clearTimeout(this._overviewTimelineDetailTimeout)", source)
        self.assertNotIn("position: fixed", overview_styles_source)
        self.assertNotIn(".overview-timeline-boost:hover .overview-timeline-detail", overview_styles_source)
        self.assertNotIn(".overview-timeline-block:hover .overview-timeline-detail", overview_styles_source)

    def test_schedules_view_has_clear_editor_context(self) -> None:
        """The schedule tab should expose the selected zone/day and editing actions clearly."""
        source = _frontend_implementation_source()
        card_styles_source = FRONTEND_STYLES_SOURCE.read_text(encoding="utf-8")
        draft_blocks_domain_source = FRONTEND_DRAFT_BLOCKS_DOMAIN_SOURCE.read_text(encoding="utf-8")
        overrides_domain_source = FRONTEND_OVERRIDES_DOMAIN_SOURCE.read_text(encoding="utf-8")
        timeline_styles_source = FRONTEND_TIMELINE_STYLES_SOURCE.read_text(encoding="utf-8")
        timeline_domain_source = FRONTEND_TIMELINE_DOMAIN_SOURCE.read_text(encoding="utf-8")
        responsive_styles_source = FRONTEND_RESPONSIVE_STYLES_SOURCE.read_text(encoding="utf-8")
        card_element_source = FRONTEND_CARD_ELEMENT_SOURCE.read_text(encoding="utf-8")
        schedule_state_source = FRONTEND_SCHEDULE_STATE_SOURCE.read_text(encoding="utf-8")
        en_source = (FRONTEND_TRANSLATIONS_DIR / "en.ts").read_text(encoding="utf-8")

        self.assertIn("export function renderScheduleZonePicker", source)
        self.assertIn("const isInitialDataLoad = !host._data", schedule_state_source)
        self.assertIn("host._selectedWeekday = data.settings.first_weekday", schedule_state_source)
        self.assertNotIn("private _previousEffectiveView", card_element_source)
        self.assertNotIn("private _scheduleViewNeedsInitialSelection", card_element_source)
        self.assertNotIn("todayWeekday()", card_element_source)
        self.assertIn("schedule-zone-picker", source)
        self.assertIn(".schedule-zone-picker {\n      display: grid;\n      gap: 8px;\n      margin-top: 0;", card_styles_source)
        self.assertIn("schedule-editor-heading", source)
        self.assertIn("schedule-editor-badges", source)
        self.assertIn("renderTemplatePanel(host)", source)
        self.assertIn("renderDayTab(host, weekday", source)
        self.assertIn("host._weekdayName(weekday).slice", source)
        self.assertIn("timelineBlocksFromDrafts(host._blocksForSource(source))", source)
        self.assertIn("sortDraftBlocksByStart(host._blocksForSource(source))", source)
        self.assertIn("minuteFromTimelinePosition(clientX, rect.left, rect.width)", source)
        self.assertIn("export function timelineBlocksFromDrafts", timeline_domain_source)
        self.assertIn("export function timelineBlocksFromScheduleBlocks", timeline_domain_source)
        self.assertIn("export function sortDraftBlocksByStart", timeline_domain_source)
        self.assertIn("export function timelineModeClass", timeline_domain_source)
        self.assertIn("export function timelineMinuteFromDate", timeline_domain_source)
        self.assertIn("export function timelineNowMarker", timeline_domain_source)
        self.assertIn("--timeline-handle: #d95f24", timeline_styles_source)
        self.assertIn("--timeline-handle: #2d7dd2", timeline_styles_source)
        self.assertIn(".overview-timeline-block.mode-heat", timeline_styles_source)
        self.assertIn(".overview-timeline-boost.mode-heat", timeline_styles_source)
        self.assertIn(".overview-timeline-block.mode-cool", timeline_styles_source)
        self.assertIn(".overview-timeline-boost.mode-cool", timeline_styles_source)
        self.assertIn("var(--timeline-handle, var(--primary-color))", timeline_styles_source)
        self.assertIn("timeline-now-marker", timeline_styles_source)
        self.assertIn(".timeline-hours > span", timeline_styles_source)
        self.assertIn(".timeline-hours > span:nth-of-type(5)", timeline_styles_source)
        self.assertIn("left: 100%", timeline_styles_source)
        self.assertIn("top: 50%", timeline_styles_source)
        self.assertIn("transform: translate(-100%, -50%)", timeline_styles_source)
        self.assertIn("min-height: 22px", timeline_styles_source)
        self.assertIn("pointer-events: none", timeline_styles_source)
        self.assertIn("var(--timeline-now-left)", timeline_styles_source)
        self.assertIn("var(--primary-color) 82%", timeline_styles_source)
        self.assertIn("var(--primary-color) 58%", timeline_styles_source)
        self.assertIn("z-index: 2", timeline_styles_source)
        self.assertIn("renderTimelineNowMarker(host)", source)
        self.assertIn("timelineNowMarker(host._currentTimelineNow())", source)
        self.assertIn('host._t("currentTime", { time: marker.label })', source)
        self.assertIn("private _timelineNow = new Date()", source)
        self.assertIn("private _timelineNowTick", source)
        self.assertIn("private _syncTimelineNowTick", source)
        self.assertIn("private _stopTimelineNowTick", source)
        self.assertIn("this._stopTimelineNowTick()", source)
        self.assertIn("export function renderDraftListHeader", source)
        self.assertIn("renderDraftListHeader(host)", source)
        self.assertIn("export function renderAddBlockButton", source)
        self.assertIn('renderAddBlockButton(host, "schedule")', source)
        self.assertIn('aria-label=${host._t("addBlock")}', source)
        self.assertNotIn('<span>${host._t("addBlock")}</span>', source)
        self.assertIn('host._t("time")', source)
        self.assertIn('"time": "Time"', en_source)
        self.assertIn('"currentTime": "Current time: {time}"', en_source)
        self.assertIn(".draft-list {", card_styles_source)
        self.assertIn(".zones {\n      display: flex;\n      gap: 8px;\n      overflow-x: auto;\n      padding-bottom: 8px;", card_styles_source)
        self.assertIn("grid-template-columns: minmax(94px, 1fr) minmax(112px, 1fr) minmax(90px, 0.8fr) 40px", card_styles_source)
        self.assertIn("column-gap: 4px", card_styles_source)
        self.assertIn("padding: 12px", card_styles_source)
        self.assertIn("row-gap: 10px", card_styles_source)
        self.assertIn("display: contents", card_styles_source)
        self.assertIn(".editable-block > label > .label", card_styles_source)
        self.assertIn(".editable-block input", card_styles_source)
        self.assertIn(".editable-block select", card_styles_source)
        self.assertIn("appearance: none", card_styles_source)
        self.assertIn("padding-right: 24px", card_styles_source)
        self.assertIn("select-wrap", source)
        self.assertIn("displayedModeOptions", source)
        self.assertIn("editableBlockModeSelectKey", source)
        self.assertIn(".value=${selectedMode}", source)
        self.assertIn(".selected=${mode === selectedMode}", source)
        self.assertIn(".select-wrap::after", card_styles_source)
        self.assertIn(".select-wrap:has(select:open)::after", card_styles_source)
        self.assertIn("border-width: 0 2px 2px 0", card_styles_source)
        self.assertIn(".draft-add-row", card_styles_source)
        self.assertIn(".draft-add-button", card_styles_source)
        self.assertIn("grid-column: 1 / -1", card_styles_source)
        self.assertIn("justify-content: center", card_styles_source)
        self.assertIn("padding: 2px 0", card_styles_source)
        self.assertIn("border-radius: 999px", card_styles_source)
        self.assertIn("height: 34px", card_styles_source)
        self.assertIn("--mdc-icon-size: 18px", card_styles_source)
        self.assertIn(".draft-list-header span", card_styles_source)
        self.assertIn("padding: 2px 8px 4px", card_styles_source)
        self.assertIn("min-width: 0", card_styles_source)
        self.assertIn("grid-template-columns: auto minmax(0, 1fr) auto auto", responsive_styles_source)
        self.assertIn(".editable-block .icon-button.danger", card_styles_source)
        self.assertIn("color: var(--error-color, #c62828)", card_styles_source)
        self.assertIn(".editable-block .icon-button", responsive_styles_source)
        self.assertIn('icon="mdi:trash-can"', source)
        self.assertIn("normalizeDraftBlocksDomain(host._blocksForSource(source)", source)
        self.assertIn("export function normalizeDraftBlocks", draft_blocks_domain_source)
        self.assertIn("export function draftBlockTemperatureError", draft_blocks_domain_source)
        self.assertIn("export function clampBlocksToTemperatureLimits", draft_blocks_domain_source)
        self.assertIn("draftBlocksFromScheduleBlocks(blocks)", source)
        self.assertIn("addDraftBlock(blocks, nextStartTime", source)
        self.assertIn("removeDraftBlockDomain(host._blocksForSource(source), index)", source)
        self.assertIn("updateDraftBlockDomain(blocks, index, field, value)", source)
        self.assertIn("export function draftBlocksFromScheduleBlocks", draft_blocks_domain_source)
        self.assertIn("export function addDraftBlock", draft_blocks_domain_source)
        self.assertIn("temperature: Number(lastBlock?.temperature || 21)", draft_blocks_domain_source)
        self.assertIn('hvac_mode: ""', draft_blocks_domain_source)
        self.assertIn("export function updateDraftBlock", draft_blocks_domain_source)
        self.assertIn("export function isActiveBoostOverride", overrides_domain_source)
        self.assertIn("export function isActivePauseOverride", overrides_domain_source)
        self.assertIn('override.type !== "boost"', overrides_domain_source)
        self.assertIn('override.type !== "pause"', overrides_domain_source)
        self.assertIn("isActiveBoostOverride(override)", source)
        self.assertIn('"daySchedule": "Day schedule"', en_source)
        self.assertIn('"scheduleEditor": "Schedule editor"', en_source)

    def test_templates_view_renders_library_and_preview(self) -> None:
        """The templates tab should render a real template library."""
        source = _frontend_implementation_source()
        base_styles_source = FRONTEND_BASE_STYLES_SOURCE.read_text(encoding="utf-8")
        responsive_styles_source = FRONTEND_RESPONSIVE_STYLES_SOURCE.read_text(encoding="utf-8")
        template_styles_source = FRONTEND_TEMPLATE_STYLES_SOURCE.read_text(encoding="utf-8")
        templates_domain_source = FRONTEND_TEMPLATES_DOMAIN_SOURCE.read_text(encoding="utf-8")
        en_source = (FRONTEND_TRANSLATIONS_DIR / "en.ts").read_text(encoding="utf-8")

        self.assertIn("return renderTemplatesView(host, selectedEntity)", source)
        self.assertIn("export function renderTemplatesView", source)
        self.assertIn("template-library", source)
        self.assertIn(".template-library {\n  display: grid;\n  gap: 12px;\n  margin-top: 0;", template_styles_source)
        self.assertIn("template-library-layout", source)
        self.assertIn("template-list", source)
        self.assertIn("template-list-heading", source)
        self.assertIn('class="section-heading"', source)
        self.assertIn('icon="mdi:content-copy"', source)
        self.assertIn("template-list-heading .section-heading", template_styles_source)
        self.assertIn("private _templateListClass", source)
        self.assertIn("templateCount > 5", source)
        self.assertIn("@media (max-width: 900px)", responsive_styles_source)
        self.assertIn("container-type: inline-size", base_styles_source)
        self.assertIn("@container (max-width: 900px)", responsive_styles_source)
        self.assertIn(".template-library-layout", template_styles_source)
        self.assertIn("private _syncTemplateListScrollIndicators", source)
        self.assertIn("can-scroll-down", source)
        self.assertIn("template-detail", source)
        self.assertIn("template-block-list", source)
        self.assertIn('renderAddBlockButton(host, "template")', source)
        self.assertIn("private _selectTemplate", source)
        self.assertIn("private _resetTemplateDraft", source)
        self.assertIn("private _blocksForSource", source)
        self.assertIn("private async _createTemplate", source)
        self.assertIn("private async _saveSelectedTemplateFromLibrary", source)
        self.assertIn("template-item-delete", source)
        self.assertIn(".template-item .icon-button.danger.template-item-delete", template_styles_source)
        self.assertIn("color: var(--error-color, #c62828)", template_styles_source)
        self.assertIn("template-name-field", source)
        self.assertIn("template-detail-actions", source)
        self.assertIn("template-editor", source)
        self.assertIn("template-apply-panel", source)
        self.assertIn("template-apply-grid", source)
        self.assertIn(".template-apply-scroll-wrap {\n  min-width: 0;\n  overflow: auto;\n  padding-bottom: 8px;", template_styles_source)
        self.assertIn(".template-apply-panel .copy-header .command-button", responsive_styles_source)
        self.assertIn("mdi:check-circle-outline", source)
        self.assertNotIn("template-apply-scroll-wrap::before", source)
        self.assertIn("export function renderTemplateApplyPanel", source)
        self.assertIn("private async _applyTemplateToTargets", source)
        self.assertIn("private _toggleTemplateApplyTarget", source)
        self.assertIn('renderTimeline(host, selectedEntity, "template")', source)
        self.assertIn('renderEditableBlock(host, block, index, "template")', source)
        self.assertIn('host._normalizeDraftBlocks("template")', source)
        self.assertIn("if (host._templateNameDraftKey === key)", source)
        self.assertIn("void host._saveSelectedTemplateFromLibrary(selectedTemplate)", source)
        self.assertIn("selectTemplateToBegin", source)
        self.assertIn("template.key === host._selectedTemplateKey", source)
        self.assertNotIn("?? templates[0]", source)
        self.assertIn("scheduleTemplatesFromStored(this._data?.templates)", source)
        self.assertIn("export function scheduleTemplatesFromStored", templates_domain_source)
        self.assertIn("export function uniqueTemplateName", templates_domain_source)
        self.assertIn("export function newTemplateKey", templates_domain_source)
        self.assertIn("toggleTemplateApplyTarget(host._templateApplyTargets", source)
        self.assertIn("templateApplyTargetsFromKeys(host._templateApplyTargets", source)
        self.assertIn("export function templateApplyTargetKey", templates_domain_source)
        self.assertIn("export function templateApplyTargetsFromKeys", templates_domain_source)
        self.assertIn('"createTemplate": "Create template"', en_source)
        self.assertIn('"newTemplate": "New template"', en_source)
        self.assertIn('"applyTo": "Apply to"', en_source)
        self.assertIn('"applyToAction": "Apply to..."', en_source)
        self.assertIn('"applyTemplateTo": "Apply {template} to..."', en_source)
        self.assertNotIn('"clearBlocks":', en_source)
        self.assertNotIn("_clearTemplateDraft", source)
        self.assertNotIn("_clearSelectedDay", source)
        self.assertNotIn("_clearing", source)

    def test_settings_view_persists_panel_weekday_and_zone_order(self) -> None:
        """The settings tab should persist thermostat preferences through the backend."""
        source = _frontend_implementation_source()
        api_source = FRONTEND_API_SOURCE.read_text(encoding="utf-8")
        entity_diagnostics_domain_source = FRONTEND_ENTITY_DIAGNOSTICS_DOMAIN_SOURCE.read_text(encoding="utf-8")
        portable_domain_source = FRONTEND_PORTABLE_DOMAIN_SOURCE.read_text(encoding="utf-8")
        registration_source = FRONTEND_REGISTRATION_SOURCE.read_text(encoding="utf-8")
        settings_domain_source = FRONTEND_SETTINGS_DOMAIN_SOURCE.read_text(encoding="utf-8")
        settings_styles_source = FRONTEND_SETTINGS_STYLES_SOURCE.read_text(encoding="utf-8")
        responsive_styles_source = FRONTEND_RESPONSIVE_STYLES_SOURCE.read_text(encoding="utf-8")
        panel_source = FRONTEND_PANEL_SOURCE.read_text(encoding="utf-8")
        constants_source = FRONTEND_CONSTANTS_SOURCE.read_text(encoding="utf-8")
        types_source = FRONTEND_TYPES_SOURCE.read_text(encoding="utf-8")
        en_source = (FRONTEND_TRANSLATIONS_DIR / "en.ts").read_text(encoding="utf-8")

        self.assertNotIn("localStorage", source)
        self.assertIn("api.updateSettings(settings)", source)
        self.assertIn('type: "velair/update_settings"', api_source)
        self.assertIn("PanelSettings", source)
        self.assertIn("export type PanelSettings", types_source)
        self.assertIn("settings: PanelSettings", types_source)
        self.assertIn("return renderSettingsView(host, visibleZoneIds)", source)
        self.assertIn("export function renderSettingsView", source)
        self.assertIn("settings-zone-order", source)
        self.assertIn('icon="mdi:sort"', source)
        self.assertIn(".settings-zone-order > .section-heading", settings_styles_source)
        self.assertIn(".settings-view {\n  display: grid;\n  gap: 12px;\n  margin-top: 0;", settings_styles_source)
        self.assertIn("settings-startup", source)
        self.assertIn("settings-portability", source)
        self.assertIn("api.exportData([...host._exportSections])", source)
        self.assertIn("api.importData(host._importPayload, [...host._importSections])", source)
        self.assertIn('type: "velair/export_data"', api_source)
        self.assertIn('type: "velair/import_data"', api_source)
        self.assertIn("importOverwriteWarning", source)
        self.assertIn("portable-warning", source)
        self.assertIn("const exportItems = new Map", source)
        self.assertIn("const importItems = new Map", source)
        self.assertIn("exportItems.get(section)", source)
        self.assertIn("importItems.get(section)", source)
        self.assertIn("item && typeof item.value === \"number\"", source)
        self.assertNotIn("portabilitySelectedData", source)
        self.assertNotIn("portabilityFileContains", source)
        self.assertIn("portable-file-control", source)
        self.assertIn("portable-file-button", source)
        self.assertIn("portable-file-name", source)
        self.assertIn("chooseFile", source)
        self.assertIn("noFileSelected", source)
        self.assertIn("private _portableExportSummaryItems", source)
        self.assertIn("private _portableImportSummaryItems", source)
        self.assertNotIn("portable-summary", source)
        self.assertIn("PORTABLE_MODEL_VERSION", source)
        self.assertIn("velair_portable_data", constants_source)
        self.assertIn("validatePortablePayload(payload)", source)
        self.assertIn("export function validatePortablePayload", portable_domain_source)
        self.assertIn("portableSectionsFromPayload(host._importPayload)", source)
        self.assertIn("export function portableSectionsFromPayload", portable_domain_source)
        self.assertIn("export function portableExportSummaryItems", portable_domain_source)
        self.assertIn("export function portableImportSummaryItems", portable_domain_source)
        self.assertIn("private _downloadPortablePayload", source)
        self.assertIn("portability-export-card", source)
        self.assertNotIn("private _headerVersionLabel", panel_source)
        self.assertNotIn('class="version"', panel_source)
        self.assertIn("velairFrontendVersion", registration_source)
        self.assertIn("settings-maintenance", source)
        self.assertIn("maintenance-grid", source)
        self.assertIn("frontendBuild", source)
        self.assertIn("VELAIR_RELEASE_VERSION || versions.integration", source)
        self.assertIn("portableFormatVersion", source)
        self.assertIn("internalStorageVersion", source)
        self.assertIn("integrationVersion", source)
        self.assertIn("api.resetData()", source)
        self.assertIn('type: "velair/reset_data"', api_source)
        self.assertIn("confirmReset", source)
        self.assertIn("resetVelairDescription", source)
        self.assertIn("settings-capability-section", source)
        self.assertIn("settings-capability-row", source)
        self.assertIn(".settings-capability-row {\n      align-items: start;", responsive_styles_source)
        self.assertIn("grid-template-columns: minmax(104px, 0.8fr) minmax(0, 1fr)", responsive_styles_source)
        self.assertIn(".settings-zone-row > .settings-drag-handle", responsive_styles_source)
        self.assertIn('class="settings-drag-handle"', source)
        self.assertNotIn('class="settings-zone-row"\n      draggable="true"', source)
        self.assertIn("flex-direction: column", responsive_styles_source)
        self.assertNotIn('class="settings-entity-status warning"', source)
        self.assertIn("settings-mode-tags", source)
        self.assertIn("mode-chip", source)
        self.assertIn("export function renderSettingsZoneOrderRow", source)
        self.assertIn("private async _updateSettingsFirstWeekday", source)
        self.assertIn('class="select-wrap"', source)
        self.assertIn('host._t("firstWeekday")', source)
        self.assertIn("private async _saveSettings", source)
        self.assertIn("private _updateSettingsZoneOrder", source)
        self.assertIn("private _moveSettingsZone", source)
        self.assertIn("private _handleSettingsZoneDrop", source)
        self.assertIn("private _temperatureLimits", source)
        self.assertIn("private _entityTemperatureLimits", source)
        self.assertIn("private _templateTemperatureLimits", source)
        self.assertIn("private _clampBlocksForEntity", source)
        self.assertIn("private _climateSupportedModes", source)
        self.assertIn("private _unsupportedModeError", source)
        self.assertIn('"unsupportedModeForClimate": "{entity} does not support {mode} at {start}.', en_source)
        self.assertNotIn("delete nextBlock.hvac_mode", source)
        self.assertIn("private _climateProvidedData", source)
        self.assertIn("entityDiagnosticState(", source)
        self.assertIn("export function entityDiagnosticState", entity_diagnostics_domain_source)
        self.assertIn("private _entityExists", source)
        self.assertIn("host._orderedZoneIds(host._data?.configured_entities ?? [])", source)
        self.assertIn("orderedZoneIds(entityIds, host._config.zone_order)", source)
        self.assertIn("export function orderedZoneIds", settings_domain_source)
        self.assertIn("export function orderedWeekdays", settings_domain_source)
        self.assertIn("export function combinedTemperatureLimits", settings_domain_source)
        self.assertIn("toggleSetValue(host._copyTargets", source)
        self.assertIn("toggleSetValue(host._zoneTargets", source)
        self.assertIn("export function toggleSetValue", settings_domain_source)
        self.assertIn("delete nextConfig.selected_entity", source)
        self.assertIn("apply_active_schedule_on_startup", source)
        self.assertIn('"unableSaveSettings": "Unable to save settings"', en_source)
        self.assertIn('"managedEntityMissing": "Not found"', en_source)
        self.assertNotIn("settings-temperature-limits", source)
        self.assertNotIn('selectedZone: "Initial zone",\n    settings: "Settings",\n    settingsPanelIntro: "Panel preferences', source)

    def test_hass_updates_are_limited_to_managed_climate_state_changes(self) -> None:
        """Climate state refreshes should not require schedule reloads or rerender every HA change."""
        source = _frontend_implementation_source()
        climate_domain_source = FRONTEND_CLIMATE_DOMAIN_SOURCE.read_text(encoding="utf-8")

        self.assertIn("private _shouldUpdateForHass", source)
        self.assertIn("host._data?.configured_entities ?? []", source)
        self.assertIn("climateStateSignature(value.states?.[entityId])", source)
        self.assertIn("export function climateStateSignature", climate_domain_source)
        self.assertIn("attributes?.current_temperature", climate_domain_source)
        self.assertIn("attributes?.hvac_action", climate_domain_source)


if __name__ == "__main__":
    unittest.main()
