import { LitElement, css, html, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { PANEL_VIEWS } from "../constants";
import { languageFromHass, translate } from "../i18n";
import type { SupportedLanguage, TranslationKey } from "../translations";
import type { HomeAssistant, VelairPanelInfo, VelairPanelRoute, VelairPanelView } from "../types";
import { panelDestination, panelPath, parsePanelPath, scheduleUsageFromSearch, type PanelDestination, type PanelSubsection } from "../domain/panel-routes";
import type { VelairCard } from "../components/velair-card-element";
import { panelTabIcon } from "./tabs";
import { PanelScheduleSession } from "../controllers/panel-schedule-session";

export class VelairPanel extends LitElement {
  private readonly _scheduleSession = new PanelScheduleSession();
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ type: Boolean }) public narrow = false;
  @property({ attribute: false }) public panel?: VelairPanelInfo;
  @property({ attribute: false }) public route?: VelairPanelRoute;
  @state() private _activeView: VelairPanelView = "overview";
  @state() private _activeViewDirty = false;
  @state() private _pendingLearningDiagnosticEntity?: string;
  @state() private _pendingResourceUsage?: import("../types").ResourceUsage;
  @state() private _pendingPresetKey?: string;
  private _usesScopedDirtyEvents = false;
  @state() private _activeSubsection?: PanelSubsection;
  private _routeInitialized = false;
  private _applyingDestination = false;
  private _historyPosition = 0;
  private _restoringHistory = false;
  private readonly _locationChanged = (event: Event) => this._readLocation(
    window.location.pathname,
    event.type === "location-changed" && !(event as CustomEvent<{ replace?: boolean }>).detail?.replace,
  );

  public connectedCallback(): void {
    super.connectedCallback();
    this._scheduleSession.connect(this.hass);
    window.addEventListener("popstate", this._locationChanged);
    window.addEventListener("location-changed", this._locationChanged);
  }

  public disconnectedCallback(): void {
    this._scheduleSession.disconnect();
    window.removeEventListener("popstate", this._locationChanged);
    window.removeEventListener("location-changed", this._locationChanged);
    super.disconnectedCallback();
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has("hass")) this._scheduleSession.setHass(this.hass);
    if (changed.has("route") || !this._routeInitialized) {
      if (!this.route && !window.location.pathname.startsWith("/velair")) return;
      // Home Assistant supplies a path relative to the panel prefix.
      const routePath = this.route?.path || "";
      const path = !this._routeInitialized && this.route
        ? (routePath.startsWith(this._prefix()) ? routePath : `${this._prefix()}/${routePath.replace(/^\/+/, "")}`)
        : window.location.pathname;
      this._readLocation(path);
    }
  }

  private _prefix(): string { return this.route?.prefix?.replace(/\/$/, "") || "/velair"; }

  private _destination(): PanelDestination { return panelDestination(this._activeView, this._activeSubsection); }

  private _readLocation(path = window.location.pathname, pushedByHa = false): void {
    if (!window.location.pathname.startsWith(`${this._prefix()}/`) && window.location.pathname !== this._prefix()) return;
    if (this._restoringHistory) {
      if (window.history.state?.velairPosition === this._historyPosition) this._restoringHistory = false;
      return;
    }
    const destination = parsePanelPath(path, this._prefix());
    const existingPosition = window.history.state?.velairPosition as number | undefined;
    const position = existingPosition ?? (pushedByHa && this._routeInitialized
      ? this._historyPosition + 1 : undefined);
    if (pushedByHa && existingPosition === undefined && position !== undefined) {
      window.history.replaceState({ ...window.history.state, velairPosition: position }, "");
    }
    if (!this._selectDestination(destination)) {
      if (typeof position === "number" && position !== this._historyPosition) {
        this._restoringHistory = true;
        window.history.go(this._historyPosition - position);
      } else this._writeLocation(this._destination(), true);
      return;
    }
    this._historyPosition = position ?? this._historyPosition;
    this._routeInitialized = true;
    if (destination.view === "schedules") {
      const usage = scheduleUsageFromSearch(window.location.search, destination.subsection);
      if (usage) this._pendingResourceUsage = usage;
      const params = new URLSearchParams(window.location.search);
      if (params.has("entity_id") || params.has("weekday") || params.has("profile_key")) {
        params.delete("entity_id"); params.delete("weekday"); params.delete("profile_key");
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`);
      }
    }
    this._writeLocation(destination, true);
  }

  private _writeLocation(destination: PanelDestination, replace = false): void {
    const path = panelPath(destination, this._prefix());
    const current = window.location.pathname;
    if (!replace && path === current) return;
    if (!replace) this._historyPosition++;
    // Match HA navigation semantics: replaced entries retain router/dialog state,
    // while pushed entries point back to the actual previous URL.
    const state = replace
      ? { ...window.history.state, velairPosition: this._historyPosition }
      : { from: `${current}${window.location.search}${window.location.hash}`, velairPosition: this._historyPosition };
    window.history[replace ? "replaceState" : "pushState"](state, "", `${path}${window.location.search}${window.location.hash}`);
    if (path !== current) window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace } }));
  }

  private _selectDestination(destination: PanelDestination): boolean {
    const activeCard = this.renderRoot.querySelector<VelairCard>("velair-panel-card");
    if ((destination.view !== this._activeView || destination.subsection !== this._activeSubsection) && activeCard?.canNavigatePanel && !activeCard.canNavigatePanel()) return false;
    if (destination.view !== this._activeView) {
      if (this._activeViewDirty && !window.confirm(this._t("discardUnsavedChanges"))) return false;
      this._activeViewDirty = false;
      this._usesScopedDirtyEvents = false;
      this._pendingLearningDiagnosticEntity = undefined;
      this._pendingResourceUsage = undefined;
      this._pendingPresetKey = undefined;
    } else if (destination.subsection !== this._activeSubsection) {
      const card = this.renderRoot.querySelector<VelairCard>("velair-panel-card");
      this._applyingDestination = true;
      try {
        if (card?.selectPanelSubsection && !card.selectPanelSubsection(destination.subsection)) return false;
      } finally { this._applyingDestination = false; }
    }
    this._activeView = destination.view;
    this._activeSubsection = destination.subsection;
    return true;
  }

  protected render() {
    return html`
      <main class=${this.narrow ? "panel narrow" : "panel"}>
        <div class="header">
          <div class="toolbar">
            <ha-menu-button .hass=${this.hass} .narrow=${true}></ha-menu-button>
            <div class="main-title">Velair</div>
          </div>
          <ha-tab-group
            class="panel-tabs"
            .active=${this._activeView}
            active=${this._activeView}
          >
            ${PANEL_VIEWS.map(
              (view) => html`
                <ha-tab-group-tab
                  slot="nav"
                  panel=${view}
                  ?active=${view === this._activeView}
                  @click=${(event: Event) => this._handleTabClick(view, event)}
                >
                  ${this._t(view === "modes" ? "modesTitle" : view === "planned-return" ? "plannedReturn" : view === "supply-control" ? "supplyControl" : view === "room-groups" ? "roomGroups" : view)}
                </ha-tab-group-tab>
              `,
            )}
          </ha-tab-group>
        </div>
        <section class="view panel-content">
          ${this._renderActiveView()}
        </section>
      </main>
    `;
  }

  private _renderActiveView() {
    return keyed(
      this._activeView,
      html`<velair-panel-card
        .scheduleSession=${this._scheduleSession}
        .hass=${this.hass}
        .view=${this._activeView}
        .subsection=${this._activeSubsection}
        @velair-subsection-changed=${(event: CustomEvent<PanelSubsection>) => {
          if (this._applyingDestination) return;
          const destination = panelDestination(this._activeView, event.detail);
          this._activeSubsection = destination.subsection;
          this._writeLocation(destination);
        }}
        .learningDiagnosticEntity=${this._pendingLearningDiagnosticEntity}
        @velair-open-learning-diagnostics=${(event: CustomEvent<string>) => { if (this._selectView("diagnostics")) this._pendingLearningDiagnosticEntity = event.detail; }}
        .resourceUsage=${this._pendingResourceUsage}
        .presetKey=${this._pendingPresetKey}
        view=${this._activeView}
        @velair-dirty-changed=${(event: CustomEvent<{ dirty: boolean }>) => {
          this._usesScopedDirtyEvents = true;
          this._activeViewDirty = Boolean(event.detail?.dirty);
        }}
        @velair-open-resource-usage=${(event: CustomEvent<import("../types").ResourceUsage>) => { if (this._selectView("schedules", undefined, event.detail.source === "default" ? "default" : "profiles")) this._pendingResourceUsage = event.detail; }}
        @velair-open-planned-return=${() => this._selectView("planned-return")}
        @velair-open-preset=${(event: CustomEvent<string>) => { if (this._selectView("templates", undefined, "presets")) this._pendingPresetKey = event.detail; }}
        @profile-dirty-changed=${(event: CustomEvent<boolean>) => {
          // Compatibility for an already-rendered 1.5/early-1.6 Profile view.
          if (!this._usesScopedDirtyEvents || event.detail) this._activeViewDirty = Boolean(event.detail);
        }}
      ></velair-panel-card>`,
    );
  }

  private _handleTabClick(view: VelairPanelView, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this._selectView(view, event);
  }

  private _selectView(view: VelairPanelView, source?: Event | HTMLElement, subsection?: PanelSubsection): boolean {
    if (!PANEL_VIEWS.includes(view)) return false;
    const destination = panelDestination(view, subsection ?? (view === this._activeView ? this._activeSubsection : undefined));
    if (!this._selectDestination(destination)) return false;
    this._writeLocation(destination);
    this._syncTabGroupActive(view, source);
    return true;
  }

  private _syncTabGroupActive(view: VelairPanelView, source?: Event | HTMLElement): void {
    const sourceElement =
      source instanceof Event ? (source.currentTarget as HTMLElement | null) : source;
    const tabGroup = (
      sourceElement?.matches("ha-tab-group")
        ? sourceElement
        : sourceElement?.closest("ha-tab-group")
    ) as (HTMLElement & { active?: string }) | null | undefined;

    if (!tabGroup) {
      return;
    }

    tabGroup.active = view;
    tabGroup.setAttribute("active", view);
    tabGroup.querySelectorAll("ha-tab-group-tab").forEach((tab) => {
      const isActive = tab.getAttribute("panel") === view;
      tab.toggleAttribute("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
    });
  }

  private _toPanelView(value?: string | null): VelairPanelView | undefined {
    if (value === "profiles") return "modes";
    return this._isPanelView(value) ? value : undefined;
  }

  private _isPanelView(value?: string | null): value is VelairPanelView {
    return typeof value === "string" && PANEL_VIEWS.includes(value as VelairPanelView);
  }

  private _viewIcon(view: VelairPanelView): string {
    return panelTabIcon(view);
  }

  private _t(
    key: TranslationKey,
    replacements: Record<string, string | number> = {},
  ): string {
    return translate(this._language(), key, replacements);
  }

  private _language(): SupportedLanguage {
    return languageFromHass(this.hass);
  }

  static styles = css`
    :host {
      display: block;
      min-height: 100%;
    }

    .panel {
      box-sizing: border-box;
      display: grid;
      gap: 0;
      min-height: 100%;
      width: 100%;
    }

    .panel.narrow {
      min-height: 100%;
    }

    .header {
      background: var(--app-header-background-color, var(--primary-background-color));
      border-bottom: 1px solid var(--divider-color);
      color: var(--app-header-text-color, var(--primary-text-color));
      box-sizing: border-box;
      min-height: 104px;
      max-width: 100%;
      min-width: 0;
      position: sticky;
      top: 0;
      width: 100%;
      z-index: 30;
    }

    .toolbar {
      align-items: center;
      box-sizing: border-box;
      display: flex;
      height: 56px;
      padding: 0 16px;
    }

    ha-menu-button {
      display: none;
      flex: 0 0 auto;
    }

    .main-title {
      color: inherit;
      flex: 0 1 auto;
      font-size: 22px;
      font-weight: 400;
      letter-spacing: 0;
      line-height: 56px;
      margin: 0 0 0 24px;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .panel-tabs {
      color: var(--primary-text-color);
      display: block;
      height: 48px;
      max-width: 100%;
      min-width: 0;
      --track-width: 2px;
      width: 100%;
    }

    ha-tab-group::part(nav) {
      margin-inline: 24px;
      min-height: 48px;
    }

    ha-tab-group::part(tabs) {
      border-block-end: 0;
      border-bottom: 0;
      display: flex;
      min-height: 48px;
    }

    ha-tab-group::part(scroll-button) {
      color: var(--secondary-text-color);
      flex: 0 0 1.5em;
      width: 1.5em;
    }

    ha-tab-group::part(scroll-button__base) {
      min-width: 1.5em;
      padding-inline: 0;
      width: 1.5em;
    }

    ha-tab-group-tab {
      border-block-end: solid var(--track-width) transparent;
      box-sizing: border-box;
      color: var(--secondary-text-color);
      flex: 0 0 auto;
      font-size: var(--ha-font-size-m);
      font-weight: 700;
    }

    ha-tab-group-tab::part(base) {
      align-items: center;
      box-sizing: border-box;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      padding: 1em 1.5em;
      transition: color var(--wa-transition-fast) var(--wa-transition-easing);
      user-select: none;
      white-space: nowrap;
    }

    ha-tab-group-tab[active] {
      border-block-end: solid var(--track-width) var(--indicator-color);
      color: var(--primary-text-color);
      margin-block-end: 0 !important;
    }

    ha-tab-group-tab[active]::part(base) {
      color: var(--primary-text-color);
    }

    .panel-content {
      box-sizing: border-box;
      margin: 0 auto;
      max-width: 1120px;
      min-width: 0;
      padding: 16px 24px 24px;
      width: 100%;
    }

    velair-panel-card {
      --velair-operation-sticky-top: 112px;
      display: block;
    }

    .panel-empty {
      align-items: center;
      display: grid;
      gap: 16px;
      grid-template-columns: auto minmax(0, 1fr);
      padding: 20px;
    }

    .panel-empty ha-icon {
      color: var(--primary-color);
      height: 28px;
      width: 28px;
    }

    .panel-empty h2 {
      color: var(--primary-text-color);
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 0;
      margin: 0;
    }

    @media (max-width: 870px) {
      .header {
        min-height: 104px;
      }

      .toolbar {
        height: 56px;
        padding: 0 16px;
      }

      ha-menu-button {
        display: block;
      }

      .main-title {
        font-size: 22px;
        line-height: 56px;
      }

      .panel-content {
        padding-top: 16px;
      }
    }

    @media (max-width: 640px) {
      .header {
        min-height: 104px;
      }

      .toolbar {
        height: 56px;
        padding: 0 16px;
      }

      .panel-content {
        padding: 8px 8px 16px;
      }
    }
  `;
}
