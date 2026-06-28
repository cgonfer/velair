import { LitElement, css, html } from "lit";
import { property, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { PANEL_VIEWS } from "../constants";
import { languageFromHass, translate } from "../i18n";
import type { SupportedLanguage, TranslationKey } from "../translations";
import type { HomeAssistant, VelairPanelInfo, VelairPanelRoute, VelairPanelView } from "../types";
import { panelTabIcon } from "./tabs";

export class VelairPanel extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ type: Boolean }) public narrow = false;
  @property({ attribute: false }) public panel?: VelairPanelInfo;
  @property({ attribute: false }) public route?: VelairPanelRoute;
  @state() private _activeView: VelairPanelView = "overview";

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
                  ${this._t(view)}
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
        .hass=${this.hass}
        .view=${this._activeView}
        view=${this._activeView}
      ></velair-panel-card>`,
    );
  }

  private _handleTabClick(view: VelairPanelView, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this._selectView(view, event);
  }

  private _selectView(view: VelairPanelView, source?: Event | HTMLElement): void {
    if (!PANEL_VIEWS.includes(view)) {
      return;
    }

    this._activeView = view;
    this._syncTabGroupActive(view, source);
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
      position: fixed;
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
      padding: 120px 24px 24px;
      width: 100%;
    }

    velair-panel-card {
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
        padding-top: 120px;
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
        padding: 112px 8px 16px;
      }
    }
  `;
}
