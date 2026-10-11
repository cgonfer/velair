import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { live } from "lit/directives/live.js";
import { plannedReturnDelay, plannedReturnTimeline, plannedReturnTimelineLabels, plannedReturnPreparationMarker, plannedReturnPreparationEstimates, plannedReturnPreparationSummary } from "../domain/planned-return-timeline";
import { languageFromHass } from "../i18n";
import { settingsStyles } from "../styles/settings-styles";
import { renderInlineHelp } from "../views/inline-help";
import { inlineHelpStyles } from "../styles/inline-help-styles";
import { baseStyles } from "../styles/base-styles";
import { orderedWeekdays } from "../domain/settings";
import { VelairApiClient } from "../api/client";
import { backendErrorMessage } from "../domain/backend-errors";
import { plannedReturnDraft, plannedReturnEpisodeActive, returnWallTime, returnWallTimeToIso } from "../domain/planned-return";
import { plannedReturnPreparationStyles, renderPlannedReturnPreparation } from "../views/planned-return-preparation-view";
import type { HomeAssistant, PlannedReturnConfig, PlannedReturnStatus, ScheduleResponse } from "../types";
import type { TranslationKey } from "../translations";

export class PlannedReturnElement extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ attribute: false }) public data?: ScheduleResponse;
  @property({ attribute: false }) public t: (key: TranslationKey, values?: Record<string, string | number>) => string = (key) => key;
  @property({ attribute: false }) public weekdayName: (day: string) => string = (day) => day;
  @property({ type: Boolean }) public settings = false;
  @property({ type: Boolean }) public compact = false;
  @property({ type: Boolean, reflect: true }) public embedded = false;
  @state() private timelineNow = Date.now();
  private timelineTimer?: ReturnType<typeof setTimeout>;
  private readonly timelineVisibility = (): void => {
    this.timelineNow = Date.now();
    this.syncTimelineClock();
  };
  private syncTimelineClock(): void {
    if (!this.isConnected || this.ownerDocument.visibilityState === "hidden"
      || !plannedReturnTimeline(this.data?.planned_return_status)) {
      if (this.timelineTimer !== undefined) clearTimeout(this.timelineTimer);
      this.timelineTimer = undefined;
      return;
    }
    // Draft edits and live state pushes must not postpone the minute tick.
    if (this.timelineTimer !== undefined) return;
    this.timelineTimer = setTimeout(() => {
      this.timelineTimer = undefined;
      this.timelineNow = Date.now();
    }, 60_000);
  }
  @state() private draft = plannedReturnDraft();
  @state() private dirty = false;
  @state() private busy = false;
  @state() private error?: string;
  @state() private arrival = "";
  @state() private sourceToAdd = "";
  @state() private sourcesExpanded = false;
  @state() private runtimeSourcesExpanded = false;
  @state() private preparationExpanded = false;
  @state() private preparationEstimatesExpanded = false;
  private preparationEstimatesEpisode = "";
  @state() private manualTime = "";
  @state() private manualDate = "";
  @state() private arrivalDirty = false;
  @state() private arrivalEditorOpen = false;
  private arrivalBaseline = "";
  @state() private delayUnit: "minutes" | "hours" = "minutes";
  @state() private delayValue = "10";
  private readonly warnBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (!this.arrivalDirty) return;
    event.preventDefault();
    event.returnValue = "";
  };

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("beforeunload", this.warnBeforeUnload);
    this.ownerDocument.addEventListener("visibilitychange", this.timelineVisibility);
    this.timelineNow = Date.now();
    this.syncTimelineClock();
  }
  public disconnectedCallback(): void {
    this.dismissPreparationHelp();
    window.removeEventListener("beforeunload", this.warnBeforeUnload);
    this.ownerDocument.removeEventListener("visibilitychange", this.timelineVisibility);
    if (this.timelineTimer !== undefined) clearTimeout(this.timelineTimer);
    this.timelineTimer = undefined;
    super.disconnectedCallback();
  }

  public static styles = [baseStyles, settingsStyles, plannedReturnPreparationStyles, inlineHelpStyles, css`
    :host { container-type: inline-size; display: block; min-width: 0; color: var(--primary-text-color); }
    section { padding: 20px; border: 1px solid var(--divider-color); border-radius: 12px; background: var(--card-background-color); margin-block: 12px; }
    h3 { margin: 0 0 12px; font-size: 1.05rem; }
    p { color: var(--secondary-text-color); line-height: 1.5; margin: 8px 0; }
    .planned-return-settings { border: 0; padding: 0; background: transparent; margin: 0; }
    .planned-return-status { padding: 0; border: 0; border-radius: 0; background: transparent; }
    .settings-zone-order { margin: 12px 0; }
    .section-heading { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 12px; align-items: start; margin-bottom: 14px; }
    .section-heading > ha-icon { --mdc-icon-size: 24px; justify-self: center; }
    .section-heading p { margin: 4px 0 0; }
    .field-label { color: var(--primary-text-color); font-weight: 600; line-height: 1.4; }
    .select-wrap { display: block; position: relative; min-width: 0; }
    .select-wrap select { appearance: none; width: 100%; margin: 0; padding-right: 30px; padding-left: 40px; text-overflow: ellipsis; }
    .select-wrap > ha-icon { position: absolute; pointer-events: none; left: 12px; top: 50%; transform: translateY(-50%); --mdc-icon-size: 18px; color: var(--secondary-text-color); }
    .select-wrap::after { border: solid var(--secondary-text-color); border-radius: 1px; border-width: 0 2px 2px 0; content: ""; height: 7px; pointer-events: none; position: absolute; right: 11px; top: 50%; transform: translateY(-62%) rotate(45deg); transition: transform 120ms ease; width: 7px; }
    .select-wrap:has(select:open)::after { transform: translateY(-28%) rotate(225deg); }
    .select-wrap:has(select:disabled) { opacity: .65; }
    .footer-actions { justify-content: flex-end; }
    .fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 14px; }
    label { display: flex; flex-direction: column; gap: 6px; }
    input, select, button { box-sizing: border-box; min-height: 44px; font: inherit; color: var(--primary-text-color); background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 8px; padding: 8px 12px; max-width: 100%; }
    input, select { height: 38px; min-height: 38px; padding: 9px; font-size: 13px; line-height: 18px; background: var(--card-background-color); }
    input:focus-visible, select:focus-visible, button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .status-bar { display: grid; gap: 12px; }
    .status-item.routine-status { display: block; border: 1px solid var(--divider-color); border-radius: 8px; }
    .routine-header, .quick-return-heading { display: flex; align-items: center; gap: 12px; }
    .routine-header > ha-icon, .quick-return-heading > ha-icon { --mdc-icon-size: 24px; color: var(--secondary-text-color); flex: 0 0 auto; }
    .routine-header .status-copy, .quick-return-heading .status-copy { font-weight: 600; }
    .routine-status.is-enabled .routine-header > ha-icon { color: var(--success-color, #2e7d32); }
    .routine-flow { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr); gap: 12px; align-items: center; margin-top: 20px; }
    .routine-step { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; text-align: center; overflow-wrap: anywhere; }
    .routine-step > ha-icon { --mdc-icon-size: 24px; color: var(--primary-color); }
    .routine-step strong { font-weight: 600; overflow-wrap: anywhere; }
    .routine-step small, .flow-delay { font-size: 12px; color: var(--secondary-text-color); }
    .flow-delay { display: inline-flex; align-items: center; justify-content: center; gap: 5px; flex-wrap: wrap; }
    .flow-delay ha-icon { --mdc-icon-size: 16px; }
    .flow-arrow { --mdc-icon-size: 20px; color: var(--secondary-text-color); }
    .occupancy-panel { min-width: 0; border: 1px solid var(--divider-color); border-radius: 8px; background: var(--secondary-background-color); overflow: hidden; }
    .runtime-source-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
    .runtime-sources-toggle { background: transparent; border-color: transparent; width: 44px; height: 44px; padding: 0; flex: 0 0 auto; }
    .runtime-sources-toggle:hover { background: color-mix(in srgb, var(--secondary-text-color) 8%, transparent); }
    .runtime-sources-toggle ha-icon { --mdc-icon-size: 20px; }
    .source-list.runtime-sources { padding: 8px 12px; padding-inline-end: 56px; margin: 0; }
    .runtime-sources li > span:last-child { flex: 0 1 auto; max-width: 40%; text-align: end; }
    .runtime-sources[hidden] { display: none; }
    .quick-return-panel { padding: 12px; border: 1px solid var(--divider-color); border-radius: 8px; background: var(--secondary-background-color); min-width: 0; }
    :host([embedded]) .planned-return-status { margin: 0; }
    :host([embedded]) .quick-return-panel { border: 0; border-radius: 0; background: transparent; }
    .quick-return-panel .actions { margin-top: 12px; }
    .quick-return-panel .help { margin-bottom: 0; }
    .absence-confirmation { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 6px 12px; align-items: center; margin-top: 18px; padding-block: 4px; }
    .absence-confirmation > ha-icon { --mdc-icon-size: 24px; color: var(--primary-color); }
    .absence-confirmation-summary { min-width: 0; }
    .absence-confirmation-heading { font-weight: 600; line-height: 22px; }
    .absence-confirmation-deadline { color: var(--primary-text-color); font-weight: 600; line-height: 22px; }
    .absence-confirmation .help { grid-column: 2 / -1; margin: 0; line-height: 20px; }
    .episode-layout { display: grid; gap: 14px; min-width: 0; }
    .episode-layout:has(> .return-timeline > .preparation-estimate) { row-gap: 6px; }
    .arrival-editor { min-width: 0; }
    @container (min-width: 641px) {
      .panel-episode .arrival-editor,
      .panel-episode .episode-buttons { width: min(100%, 420px); justify-self: end; }
    }
    .arrival-editor, .arrival-editor-close { animation: arrival-editor-enter 150ms ease-out; }
    @keyframes arrival-editor-enter { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    @media (prefers-reduced-motion: reduce) { .arrival-editor, .arrival-editor-close { animation: none; } }
    .arrival-value-controls { display: flex; align-items: center; gap: 6px; max-width: 100%; }
    button.arrival-editor-close { min-height: 44px; }
    .arrival-editor-close ha-icon { --mdc-icon-size: 18px; }
    .arrival-fields { display: flex; flex-wrap: wrap; align-items: end; gap: 10px; min-width: 0; }
    .arrival-fields label { min-width: 0; flex: 1 1 130px; line-height: 20px; }
    .arrival-fields input { width: 100%; }
    .episode-actions .arrival-fields { flex: 1 1 280px; }
    .episode-buttons { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 16px; align-items: center; min-width: 0; }
    .episode-confirm-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; min-width: 0; }
    .episode-action { display: inline-flex; gap: 6px; align-items: center; justify-content: center; min-height: 44px; padding: 8px 10px; font-size: 14px; }
    .episode-action ha-icon { --mdc-icon-size: 18px; flex: 0 0 auto; }
    button.episode-action.primary { --episode-action-color: var(--primary-color); }
    button.episode-action.danger { --episode-action-color: var(--error-color, #c62828); }
    button.episode-action.success { --episode-action-color: var(--success-color, #2e7d32); }
    button.episode-action { background: color-mix(in srgb, var(--episode-action-color) 70%, #000); border-color: transparent; color: #fff; }
    button.episode-action:hover:not(:disabled), button.episode-action:focus-visible:not(:disabled) { background: color-mix(in srgb, var(--episode-action-color) 60%, #000); }
    .quick-return-panel button:disabled {
      background: color-mix(in srgb, var(--disabled-text-color, var(--secondary-text-color)) 12%, var(--secondary-background-color));
      border-color: var(--divider-color);
      color: var(--disabled-text-color, var(--secondary-text-color));
      cursor: not-allowed;
      opacity: 1;
    }
    .arrival-unsaved { color: var(--warning-color, #c99500); }
    .actions.manual-departure { align-items: end; }
    .manual-departure .arrival-fields { flex: 0 1 360px; }
    .manual-departure > label { display: block; font-weight: 600; }
    .manual-departure > input { flex: 0 1 auto; }
    .manual-departure .start-return { margin-inline-start: auto; flex: 0 0 auto; min-height: 44px; padding: 8px 12px; font-size: 14px; }
    @container (max-width: 540px) {
      .manual-departure .arrival-fields { flex-basis: 100%; }
      .manual-departure .start-return { margin-inline-start: auto; }
    }
    @container (max-width: 420px) { .manual-departure > label { flex-basis: 100%; } }
    @container (max-width: 420px) { .routine-flow { grid-template-columns: minmax(0, 1fr); gap: 10px; } .flow-arrow { justify-self: center; transform: rotate(90deg); } .aggregate-occupancy { flex-wrap: wrap; } .runtime-source-controls { margin-left: auto; } }
    .status-item { display: flex; align-items: center; gap: 12px; flex: 1 1 220px; min-width: 0; padding: 12px; border-radius: 10px; background: var(--secondary-background-color); }
    .status-item > ha-icon { --mdc-icon-size: 24px; flex: 0 0 auto; color: var(--secondary-text-color); }
    .status-copy { min-width: 0; flex: 1; } .status-copy small { display: block; color: var(--secondary-text-color); margin-bottom: 4px; }
    .status-copy strong { font-weight: 600; overflow-wrap: anywhere; }
    .status-item.is-enabled, .status-item.is-home { background: color-mix(in srgb, var(--success-color, #2e7d32) 8%, var(--secondary-background-color)); }
    .status-item.is-enabled > ha-icon, .status-item.is-home > ha-icon { color: var(--success-color, #2e7d32); }
    .status-item.is-preparing { background: color-mix(in srgb, var(--primary-color) 7%, var(--secondary-background-color)); }
    .status-item.is-preparing > ha-icon { color: var(--primary-color); }
    .status-item ha-switch { flex: 0 0 auto; }
    .occupancy-panel .status-unknown-help { margin: 0; padding: 10px 12px; }
    .unmonitored-occupancy > .help { margin: 0; padding-block-end: 12px; padding-inline: 48px 12px; line-height: 20px; }
    .days { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-block: 14px; }
    @container (max-width: 420px) { .days { grid-template-columns: minmax(0, 1fr); } }
    @container (min-width: 650px) { .days { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    @container (min-width: 1000px) { .days { grid-template-columns: repeat(7, minmax(0, 1fr)); } }
    .help { font-size: 12px; margin: 8px 0 16px; }
    input { min-width: 0; } .day input[type=time] { width: 100%; }
    .day { display: flex; gap: 8px; align-items: center; } .day label { flex: 1; min-width: 0; }
    .source-add { display: grid; grid-template-columns: minmax(0, 1fr) 44px; align-items: end; gap: 8px; } .source-add label { min-width: 0; }
    .configured-source-panel { width: calc(100% - 52px); min-width: 0; margin-top: 12px; }
    .sources-toggle { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; width: 100%; padding: 8px 10px; text-align: start; background: transparent; border-color: transparent; }
    .sources-toggle:hover:not(:disabled) { background: color-mix(in srgb, var(--secondary-text-color) 8%, transparent); }
    .sources-toggle[aria-expanded="true"] { border-bottom-color: var(--divider-color); border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
    .sources-toggle > ha-icon { --mdc-icon-size: 20px; flex: 0 0 auto; color: var(--secondary-text-color); }
    .source-counts { display: flex; flex-wrap: wrap; gap: 8px 12px; min-width: 0; margin-inline-start: auto; }
    .source-count { display: inline-flex; align-items: center; gap: 5px; color: var(--secondary-text-color); }
    .source-count ha-icon { --mdc-icon-size: 18px; }
    .source-count.home { color: var(--success-color, #2e7d32); }
    .source-count-value { display: none; }
    @container (max-width: 540px) {
      .configured-source-panel { width: 100%; }
      .sources-toggle { gap: 8px; }
      .source-counts { gap: 8px; }
      .source-count-value { display: inline; }
      .source-count-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
      .source-list.configured-sources { width: 100%; }
    }
    .configured-sources[hidden] { display: none; }
    .source-list { list-style: none; padding: 0; margin: 8px 0 0; }
    .source-list.configured-sources { padding-inline: 12px; box-sizing: border-box; }
    .source-list li > ha-icon { display: flex; justify-content: center; width: 44px; }
    .source-list li { display: flex; gap: 12px; align-items: center; min-height: 44px; overflow-wrap: anywhere; padding-block: 4px; margin-block: 4px; }
    .source-list ha-icon { --mdc-icon-size: 18px; flex: 0 0 auto; }
    .source-copy { flex: 1; min-width: 0; } .source-copy small { display: block; color: var(--secondary-text-color); }
    .source-list button { margin-left: auto; }
    .icon-button { width: 44px; height: 44px; flex: 0 0 44px; padding: 0; }
    .icon-button ha-icon { --mdc-icon-size: 20px; }
    button.icon-button, button.icon-button.success, button.icon-button.danger, button.icon-button.primary { background: transparent; border-color: transparent; }
    button.icon-button.primary { color: var(--primary-color); }
    button.icon-button.success { color: var(--success-color, #2e7d32); }
    button.icon-button.danger { color: var(--error-color, #c62828); }
    button.icon-button.success:hover:not(:disabled), button.icon-button.success:focus-visible { background: color-mix(in srgb, var(--success-color, #2e7d32) 10%, transparent); }
    button.icon-button.danger:hover:not(:disabled), button.icon-button.danger:focus-visible { background: color-mix(in srgb, var(--error-color, #c62828) 10%, transparent); }
    button.icon-button.primary:hover:not(:disabled), button.icon-button.primary:focus-visible { background: color-mix(in srgb, var(--primary-color) 10%, transparent); }
    button.icon-button.success.add-source:not(:disabled) { background: var(--success-color, #2e7d32); border-color: var(--success-color, #2e7d32); border-radius: 999px; color: var(--text-primary-color, #fff); }
    button.icon-button.success.add-source:not(:disabled) ha-icon { --mdc-icon-size: 18px; }
    button.icon-button.success.add-source:hover:not(:disabled), button.icon-button.success.add-source:focus-visible:not(:disabled) { background: color-mix(in srgb, var(--success-color, #2e7d32) 85%, #000); }
    .absence-rule { display: flex; flex-wrap: wrap; align-items: end; gap: 16px; margin-top: 20px; }
    .delay-field { display: flex; flex-direction: column; gap: 6px; flex: 0 1 230px; min-width: 0; }
    .delay-controls { display: grid; grid-template-columns: 80px minmax(0, 1fr); gap: 8px; }
    .delay-controls .select-wrap select { padding-left: 12px; }
    .absence-rule > label:last-child { flex: 1 1 240px; min-width: 0; }
    .return-mode { margin-top: 20px; }
    .return-mode > label { max-width: 520px; }
    .weekly-label { display: block; margin-top: 20px; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; align-items: end; }
    button { cursor: pointer; } button:disabled { cursor: default; opacity: .5; }
    .primary { background: var(--primary-color); color: var(--text-primary-color, white); }
    .error { color: var(--error-color); white-space: pre-line; } ul { padding-left: 20px; } li { margin: 8px 0; }
    fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
    .quick-return-heading { flex-wrap: nowrap; align-items: center; }
    .quick-return-panel ha-icon { display: inline-flex; align-items: center; justify-content: center; line-height: 1; vertical-align: middle; flex-shrink: 0; }
    .return-header-details { display: flex; align-items: center; justify-content: flex-end; min-width: 0; max-width: 55%; }
    .return-title-group { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
    .return-title-group > ha-icon { --mdc-icon-size: 24px; color: var(--secondary-text-color); flex: 0 0 auto; }
    .return-title-copy { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
    .return-title-copy .status-copy { line-height: 24px; }
    .return-title-line { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 6px; row-gap: 2px; align-items: center; min-width: 0; max-width: 100%; }
    .return-title-line > .return-context-status { grid-column: 1; }
    .return-title-line:has(> .preparation-info) > .return-context-status { contain: inline-size; width: 100%; }
    .return-title-line > .return-context-status span { min-width: 0; overflow-wrap: anywhere; }
    .return-title-line > .preparation-info { grid-column: 2; grid-row: 1 / span 2; display: grid; grid-template-rows: subgrid; }
    .return-title-line .preparation-info .inline-help-wrapper { grid-row: 1 / span 2; display: grid; grid-template-rows: subgrid; }
    .return-title-line .preparation-info button.inline-help { grid-row: 1 / span 2; height: 100%; display: grid; grid-template-rows: subgrid; }
    .return-title-line .preparation-info button.inline-help ha-icon { grid-row: 1; align-self: center; }
    .return-title-line .status-copy { min-width: 0; overflow-wrap: anywhere; }
    .compact-return-indicators { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 12px; }
    .compact-return-indicators ha-icon { --mdc-icon-size: 18px; }
    .compact-return-delay { display: inline-flex; align-items: center; gap: 4px; color: var(--secondary-text-color); font-size: 13px; white-space: nowrap; }
    .return-timeline { margin: 0; min-width: 0; }
    .return-mode-chip { display: inline-flex; align-items: center; gap: 6px; justify-self: start; min-width: 0; max-width: 100%; padding: 0; border: 0; font-size: 12px; line-height: 18px; color: var(--secondary-text-color); background: transparent; }
    .return-mode-chip.arrival-mode { justify-self: end; }
    .return-mode-chip span { overflow-wrap: anywhere; }
    .return-mode-chip ha-icon { --mdc-icon-size: 16px; }
    .return-timeline-rail { display: grid; grid-template-columns: 18px minmax(0, 1fr) 18px; gap: 12px; align-items: center; margin-top: 16px; }
    .return-timeline-icon { display: inline-flex; align-items: center; justify-content: center; color: var(--secondary-text-color); }
    .return-timeline-icon ha-icon { --mdc-icon-size: 18px; }
    .return-timeline-line { position: relative; min-width: 0; }
    .return-timeline-endpoints { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; align-items: start; margin-top: 2px; }
    .return-timeline-endpoints > div { display: flex; flex-direction: column; align-items: flex-start; gap: 0; min-width: 0; }
    .return-timeline-endpoints > div:last-child { text-align: end; align-items: flex-end; }
    .return-time-value { display: flex; align-items: center; min-height: 44px; font-size: 16px; font-weight: 600; line-height: 22px; overflow-wrap: anywhere; }
    .return-timeline-track { height: 4px; border-radius: 4px; background: var(--divider-color); position: relative; }
    .return-timeline-track::before, .return-timeline-track::after { content: ""; position: absolute; top: -3px; width: 2px; height: 10px; background: var(--secondary-text-color); opacity: .5; }
    .return-timeline-track::before { left: 0; } .return-timeline-track::after { right: 0; }
    .return-timeline-elapsed { position: absolute; inset: 0 auto 0 0; border-radius: inherit; background: linear-gradient(90deg, color-mix(in srgb, var(--primary-color) 45%, var(--divider-color)), var(--primary-color)); }
    .return-timeline-marker { box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-color) 16%, transparent); position: absolute; top: 50%; width: 10px; height: 10px; border-radius: 50%; background: var(--primary-color); transform: translate(-50%, -50%); }
    @container (max-width: 420px) { .compact-return-indicators { justify-content: flex-end; gap: 8px; }  }
    .return-context-status { display: inline-flex; align-items: center; gap: 5px; min-width: 0; max-width: 100%; color: var(--secondary-text-color); font-size: 12px; line-height: 18px; }
    .return-context-status ha-icon { --mdc-icon-size: 14px; }
    .return-context-status.state-preparing { color: color-mix(in srgb, var(--primary-color) 45%, var(--primary-text-color)); }
    .return-context-status.state-error { color: color-mix(in srgb, var(--error-color, #c62828) 45%, var(--primary-text-color)); }
    .saved-return-arrival { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin-inline-start: 36px; min-width: 0; color: var(--secondary-text-color); }
    .saved-return-arrival .arrival-value-controls { min-width: 0; max-width: 100%; }
    .saved-return-arrival .arrival-context { position: relative; }
    .saved-return-arrival .arrival-icon { position: absolute; inset-inline-start: -36px; top: 50%; transform: translateY(-50%); }
    .arrival-context { display: inline-flex; align-items: center; gap: 6px; min-width: 0; font-size: 13px; line-height: 20px; }
    .arrival-label { white-space: nowrap; }
    button.arrival-edit-trigger { display: inline-flex; align-items: center; gap: 6px; padding: 3px 0; border: 0; background: transparent; color: var(--primary-text-color); font-size: 16px; font-weight: 600; line-height: 22px; min-height: 44px; text-align: inherit; max-width: 100%; }
    .arrival-edit-trigger .arrival-trigger-value { text-decoration: underline; text-underline-offset: 3px; overflow-wrap: anywhere; }
    button.arrival-edit-trigger.pending-arrival-chip { font-size: 14px; font-weight: 500; line-height: 20px; padding: 0; }
    .pending-arrival-chip .pending-arrival-surface { padding: 5px 10px; border: 1px solid var(--divider-color); border-radius: 8px; background: color-mix(in srgb, var(--primary-color) 8%, transparent); }
    .pending-arrival-chip .arrival-trigger-value { text-decoration: none; }
    button.pending-arrival-chip:hover:not(:disabled), button.pending-arrival-chip:focus-visible { background: transparent; }
    .pending-arrival-chip:hover:not(:disabled) .pending-arrival-surface, .pending-arrival-chip:focus-visible .pending-arrival-surface { background: color-mix(in srgb, var(--primary-color) 15%, transparent); }
    .pending-arrival-chip:disabled .pending-arrival-surface { background: color-mix(in srgb, var(--secondary-text-color) 6%, transparent); color: var(--secondary-text-color); }
    .arrival-edit-trigger ha-icon { --mdc-icon-size: 16px; color: var(--primary-color); flex: 0 0 auto; }
    .arrival-edit-trigger:hover:not(:disabled), .arrival-edit-trigger:focus-visible { color: var(--primary-color); background: color-mix(in srgb, var(--primary-color) 6%, transparent); }
    .quick-return-panel button.arrival-edit-trigger:disabled { background: transparent; border: 0; }
    .preparation-marker { position: absolute; top: -3px; width: 3px; height: 10px; transform: translateX(-50%); background: var(--primary-color); border-radius: 2px; }
    .return-timeline-endpoints .arrival-value-controls { align-items: center; }
    .return-timeline-endpoints .arrival-edit-trigger { align-items: center; padding-block: 0; }
    .preparation-info { display: inline-flex; align-items: center; flex: 0 0 auto; }
    .preparation-info button.inline-help { width: 44px; height: 44px; min-height: 44px; padding: 0; justify-content: flex-start; border: 0; background: transparent; color: var(--secondary-text-color); }
    .preparation-info button.inline-help:hover, .preparation-info button.inline-help:focus-visible { background: color-mix(in srgb, var(--primary-color) 7%, transparent); }
    .preparation-estimate { margin: 12px 0 0; border-radius: 8px; background: color-mix(in srgb, var(--primary-color) 8%, transparent); color: var(--primary-text-color); }
    .preparation-estimate button.preparation-estimate-toggle { display: flex; align-items: center; gap: 7px; width: 100%; min-height: 44px; padding: 9px 12px; border: 0; background: transparent; text-align: start; color: inherit; font-size: 12px; line-height: 18px; }
    .preparation-estimate-toggle > span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
    .preparation-estimate-toggle ha-icon { --mdc-icon-size: 16px; flex: 0 0 auto; color: var(--primary-color); }
    .preparation-estimate-toggle:hover, .preparation-estimate-toggle:focus-visible { background: color-mix(in srgb, var(--primary-color) 7%, transparent); }
    .preparation-estimate-rooms { list-style: none; margin: 0; padding: 4px 12px; border-top: 1px solid var(--divider-color); }
    .preparation-estimate-rooms li { display: flex; align-items: center; gap: 12px; padding: 8px 0; margin: 0; }
    .preparation-estimate-room { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; font-size: 13px; }
    .preparation-estimate-room ha-icon { --mdc-icon-size: 18px; flex: 0 0 auto; color: var(--secondary-text-color); }
    .preparation-estimate-room span { overflow-wrap: anywhere; }
    .preparation-estimate-rooms time { max-width: 50%; text-align: end; font-size: 12px; line-height: 18px; color: var(--secondary-text-color); }
    button.episode-action.cancel-return { min-height: 44px; padding: 0; border: 0; background: transparent; }
    .cancel-return-surface { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 32px; padding: 4px 10px; box-sizing: border-box; border-radius: 8px; background: color-mix(in srgb, var(--error-color, #c62828) 70%, #000); color: #fff; font-size: 13px; line-height: 20px; }
    button.episode-action.cancel-return:hover:not(:disabled), button.episode-action.cancel-return:focus-visible:not(:disabled) { background: transparent; }
    .cancel-return:hover:not(:disabled) .cancel-return-surface, .cancel-return:focus-visible:not(:disabled) .cancel-return-surface { background: color-mix(in srgb, var(--error-color, #c62828) 60%, #000); }
    button.episode-action.cancel-return:focus-visible { outline: 2px solid var(--error-color, #c62828); outline-offset: 2px; }
    .quick-return-panel button.cancel-return:disabled { background: transparent; border: 0; }
    .cancel-return:disabled .cancel-return-surface { background: color-mix(in srgb, var(--disabled-text-color, var(--secondary-text-color)) 12%, var(--secondary-background-color)); color: var(--disabled-text-color, var(--secondary-text-color)); }
    button.compact-editor-action { min-height: 44px; padding: 0; border: 0; background: transparent; }
    .editor-action-surface { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 32px; padding: 4px 10px; box-sizing: border-box; border-radius: 8px; background: color-mix(in srgb, var(--episode-action-color) 70%, #000); color: #fff; font-size: 13px; line-height: 20px; }
    button.compact-editor-action:hover:not(:disabled), button.compact-editor-action:focus-visible:not(:disabled) { background: transparent; }
    .compact-editor-action:hover:not(:disabled) .editor-action-surface, .compact-editor-action:focus-visible:not(:disabled) .editor-action-surface { background: color-mix(in srgb, var(--episode-action-color) 60%, #000); }
    .quick-return-panel button.compact-editor-action:disabled { background: transparent; border: 0; }
    .compact-editor-action:disabled .editor-action-surface { background: color-mix(in srgb, var(--disabled-text-color, var(--secondary-text-color)) 12%, var(--secondary-background-color)); color: var(--disabled-text-color, var(--secondary-text-color)); }

  `];

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("data")) {
      this.dismissPreparationHelp();
      const status = this.data?.planned_return_status;
      const episode = status && plannedReturnTimeline(status) && plannedReturnPreparationEstimates(status).length
        ? `${Date.parse(status.departure_at!)}|${Date.parse(status.return_at!)}|${status.origin}|${status.away_mode_id}|${status.destination_mode_id}` : "";
      if (episode !== this.preparationEstimatesEpisode) this.preparationEstimatesExpanded = false;
      this.preparationEstimatesEpisode = episode;
    }
    if (changed.has("data") || changed.has("hass") || changed.has("compact")) this.timelineNow = Date.now();
    if (!this.manualDate) this.manualDate = this.today;
    if (!this.manualTime) {
      const now = new Date();
      const next = returnWallTime(new Date(now.getTime() + 60 * 60_000).toISOString(), this.timeZone);
      this.manualTime = next.slice(0, 10) === returnWallTime(now.toISOString(), this.timeZone).slice(0, 10) ? next.slice(11) : "23:59";
    }
    if (changed.has("data") && !this.dirty) { this.draft = plannedReturnDraft(this.data?.planned_return); this.syncDelayValue(); }
    if (changed.has("data") && this.data?.planned_return_status?.return_at) this.arrivalBaseline = returnWallTime(this.data.planned_return_status.return_at, this.timeZone);
    if (changed.has("data") && (!this.data?.planned_return_status || !plannedReturnEpisodeActive(this.data.planned_return_status))) this.arrivalEditorOpen = false;
    if (changed.has("data") && this.arrivalDirty) {
      const status = this.data?.planned_return_status;
      if (!status || !this.hasArrivalControls(status) || (status.return_at && this.arrival === returnWallTime(status.return_at, this.timeZone))) this.arrivalDirty = false;
    }
    if ((changed.has("data") || changed.has("hass")) && !this.arrivalDirty) {
      this.arrival = returnWallTime(this.data?.planned_return_status?.return_at ?? new Date().toISOString(), this.timeZone);
      this.arrivalBaseline = this.arrival;
    }
  }
  protected updated(changed: PropertyValues): void {
    this.syncTimelineClock();
    if (changed.has("busy")) this.dispatchEvent(new CustomEvent("planned-return-busy", { bubbles: true, composed: true, detail: this.busy }));
    if (changed.has("dirty") || changed.has("arrivalDirty")) this.dispatchEvent(new CustomEvent("velair-dirty-changed", { bubbles: true, composed: true, detail: { dirty: this.dirty || this.arrivalDirty, scope: "planned-return" } }));
  }
  private get today(): string { return returnWallTime(new Date().toISOString(), this.timeZone).slice(0, 10); }
  private get timeZone(): string { return this.hass?.config?.time_zone ?? "UTC"; }
  private syncDelayValue(): void { this.delayValue = String(this.delayUnit === "hours" ? Math.round(this.draft.absence_delay_minutes / 60 * 100) / 100 : this.draft.absence_delay_minutes); }
  private get delayValid(): boolean {
    const value = Number(this.delayValue);
    return this.delayValue.trim() !== "" && Number.isFinite(value) && value >= 0 && value <= (this.delayUnit === "hours" ? 24 : 1440) && (this.delayUnit === "hours" || Number.isInteger(value));
  }
  private editDelay(e: Event): void {
    if (this.busy) return;
    this.delayValue = (e.target as HTMLInputElement).value;
    this.dirty = true;
    if (this.delayValid) this.patch({ absence_delay_minutes: Math.round(Number(this.delayValue) * (this.delayUnit === "hours" ? 60 : 1)) });
  }
  private patch(patch: Partial<PlannedReturnConfig>): void { if (this.busy) return; this.draft = { ...this.draft, ...patch }; this.dirty = true; }
  private async run(action: (api: VelairApiClient) => Promise<ScheduleResponse>, savesConfiguration = false, closesArrivalEditor = false): Promise<void> {
    if (!this.hass || this.busy) return;
    this.busy = true; this.error = undefined;
    let restoreArrivalFocus = false;
    try {
      const data = await action(new VelairApiClient(this.hass));
      if (savesConfiguration) this.dirty = false;
      if (!savesConfiguration) this.arrivalDirty = false;
      if (closesArrivalEditor) { this.arrivalEditorOpen = false; restoreArrivalFocus = true; }
      this.data = data;
      this.dispatchEvent(new CustomEvent("planned-return-updated", { detail: data, bubbles: true, composed: true }));
    } catch (error) { this.error = backendErrorMessage(error, this.t("plannedReturnError")); }
    finally { this.busy = false; }
    if (restoreArrivalFocus && this.isConnected) {
      await this.updateComplete;
      this.focusArrivalControl();
    }
  }
  private modeSelect(field: "away_mode_id" | "destination_mode_id", label: TranslationKey) {
    const value = this.draft[field];
    const selectedMode = this.data?.modes?.find((mode) => mode.key === value);
    const customIcon = selectedMode && "icon" in selectedMode && typeof selectedMode.icon === "string" ? selectedMode.icon : undefined;
    const icon = value === "default" ? "mdi:calendar-clock-outline" : customIcon ?? "mdi:format-list-bulleted";
    return html`<label><span class="field-label">${this.t(label)}</span><span class="select-wrap"><ha-icon icon=${icon}></ha-icon><select data-field=${field} .value=${value} ?disabled=${this.busy} @change=${(e: Event) => this.patch({ [field]: (e.target as HTMLSelectElement).value })}>
      <option value="default" ?selected=${value === "default"}>${this.t("modeDefault")}</option>
      ${value !== "default" && !selectedMode ? html`<option value=${value} selected>${value}</option>` : nothing}
      ${(this.data?.modes ?? []).map((mode) => html`<option value=${mode.key} ?selected=${value === mode.key}>${mode.name}</option>`)}
    </select></span></label>`;
  }
  private sourceState(id: string): "home" | "away" | "unknown" {
    const saved = this.data?.planned_return_status?.sources?.find((source) => source.entity_id === id);
    if (saved) return saved.state;
    const value = this.hass?.states?.[id]?.state;
    if (id === "zone.home") {
      if (value === undefined || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) return "unknown";
      const count = Number(value);
      return Number.isFinite(count) && Number.isInteger(count) && count >= 0 ? (count > 0 ? "home" : "away") : "unknown";
    }
    return value === "on" || value === "home" ? "home" : value === "off" || value === "not_home" ? "away" : "unknown";
  }
  private renderSourceSummary() {
    const counts = { home: 0, away: 0, unknown: 0 };
    for (const id of this.draft.occupancy_entity_ids) counts[this.sourceState(id)]++;
    return html`<button type="button" class="sources-toggle" aria-expanded=${String(this.sourcesExpanded)} aria-controls="configured-occupancy-sources" ?disabled=${this.busy} @click=${() => { this.sourcesExpanded = !this.sourcesExpanded; }}>
      <ha-icon icon=${this.sourcesExpanded ? "mdi:chevron-down" : "mdi:chevron-right"}></ha-icon>
      <span>${this.t("plannedReturnSourceCount", { count: this.draft.occupancy_entity_ids.length })}</span>
      <span class="source-counts">
        <span class="source-count home" data-count="home" title=${this.t("plannedReturnSourceHomeCount", { count: counts.home })}><ha-icon icon="mdi:home-account" aria-hidden="true"></ha-icon><span class="source-count-label">${this.t("plannedReturnSourceHomeCount", { count: counts.home })}</span><span class="source-count-value" aria-hidden="true">${counts.home}</span></span>
        <span class="source-count away" data-count="away" title=${this.t("plannedReturnSourceAwayCount", { count: counts.away })}><ha-icon icon="mdi:home-outline" aria-hidden="true"></ha-icon><span class="source-count-label">${this.t("plannedReturnSourceAwayCount", { count: counts.away })}</span><span class="source-count-value" aria-hidden="true">${counts.away}</span></span>
        ${counts.unknown ? html`<span class="source-count unknown" data-count="unknown" title=${this.t("plannedReturnSourceUnknownCount", { count: counts.unknown })}><ha-icon icon="mdi:home-question-outline" aria-hidden="true"></ha-icon><span class="source-count-label">${this.t("plannedReturnSourceUnknownCount", { count: counts.unknown })}</span><span class="source-count-value" aria-hidden="true">${counts.unknown}</span></span>` : nothing}
      </span>
    </button>`;
  }
  private renderSettings() {
    const sources = this.draft.occupancy_entity_ids;
    const candidates = Object.keys(this.hass?.states ?? {}).filter((id) => /^(binary_sensor|input_boolean|group)\./.test(id) || id === "zone.home");
    const invalid = this.draft.enabled && (!sources.length || sources.some((id) => !candidates.includes(id)));
    return html`<section class="planned-return-settings">
      <form @submit=${(e: Event) => { e.preventDefault(); if (!invalid && this.delayValid) void this.run((api) => api.updatePlannedReturn(this.draft), true); }}>
      <fieldset ?disabled=${this.busy}>
        <p class="help">${this.t("plannedReturnConflictHelp")}</p>
        <section class="settings-zone-order presence-settings">
          <div class="section-heading"><ha-icon class="settings-startup-icon" icon="mdi:home-account"></ha-icon><div><span class="section-label">${this.t("plannedReturnPresence")}</span><p>${this.t("plannedReturnPresenceDescription")}</p></div></div>
          <div class="occupancy-fields">
            <div><div class="source-add"><label><span class="field-label">${this.t("plannedReturnOccupancy")}</span><span class="select-wrap"><ha-icon icon="mdi:home-account"></ha-icon><select data-field="occupancy_entity_ids" .value=${this.sourceToAdd} ?disabled=${this.busy} aria-invalid=${invalid ? "true" : "false"} @change=${(e: Event) => { this.sourceToAdd = (e.target as HTMLSelectElement).value; }}><option value="">${this.t("none")}</option>${candidates.filter((id) => !sources.includes(id)).map((id) => html`<option value=${id}>${this.hass?.states?.[id]?.attributes?.friendly_name ? `${this.hass.states[id].attributes!.friendly_name} (${id})` : id}</option>`)}</select></span></label><button class="icon-button success add-source" type="button" title=${this.t("plannedReturnAddSource")} aria-label=${this.t("plannedReturnAddSource")} ?disabled=${this.busy || !this.sourceToAdd} @click=${() => { this.patch({ occupancy_entity_ids: [...sources, this.sourceToAdd] }); this.sourceToAdd = ""; }}><ha-icon icon="mdi:plus"></ha-icon></button></div>
            <div class="configured-source-panel">${this.renderSourceSummary()}<ul id="configured-occupancy-sources" class="source-list configured-sources" ?hidden=${!this.sourcesExpanded}>${sources.map((id) => html`<li data-source=${id}><ha-icon icon=${this.hass?.states?.[id]?.attributes?.icon ?? "mdi:home-account"}></ha-icon><span class="source-copy">${this.hass?.states?.[id]?.attributes?.friendly_name ?? id}<small>${id}</small></span><button class="icon-button danger remove-source" type="button" ?disabled=${this.busy} title=${this.t("plannedReturnRemoveSource", { entity: id })} aria-label=${this.t("plannedReturnRemoveSource", { entity: id })} @click=${() => this.patch({ occupancy_entity_ids: sources.filter((source) => source !== id) })}><ha-icon icon="mdi:trash-can"></ha-icon></button></li>`)}</ul></div></div>
          </div>
          ${invalid ? html`<p class="error" role="alert">${this.t("plannedReturnSensorInvalid")}</p>` : nothing}
          <div class="absence-rule"><div class="delay-field"><label class="field-label" for="absence-delay">${this.t("plannedReturnEmptyFor")}</label><div class="delay-controls"><input id="absence-delay" type="number" min="0" max=${this.delayUnit === "hours" ? "24" : "1440"} step=${this.delayUnit === "hours" ? "any" : "1"} required ?disabled=${this.busy} aria-invalid=${this.delayValid ? "false" : "true"} .value=${live(this.delayValue)} @input=${(e: Event) => this.editDelay(e)} @blur=${() => { if (!this.busy && this.delayValid) this.syncDelayValue(); }}><span class="select-wrap"><select class="delay-unit" data-field="delay_unit" aria-label=${this.t("plannedReturnDelayUnit")} .value=${this.delayUnit} ?disabled=${this.busy} @change=${(e: Event) => { if (this.busy) return; this.delayUnit = (e.target as HTMLSelectElement).value as "minutes" | "hours"; this.syncDelayValue(); }}><option value="minutes">${this.t("plannedReturnMinutes")}</option><option value="hours">${this.t("plannedReturnHours")}</option></select></span></div></div>${this.modeSelect("away_mode_id", "plannedReturnActivateAway")}</div>${this.delayUnit === "hours" && this.delayValid ? html`<p class="help effective-delay">${this.t("plannedReturnEffectiveDelay", { minutes: this.draft.absence_delay_minutes })}</p>` : nothing}
        </section>
        <section class="settings-zone-order weekly-settings">
          <div class="section-heading"><ha-icon class="settings-startup-icon" icon="mdi:home-clock-outline"></ha-icon><div><span class="section-label">${this.t("plannedReturnPrepareArrival")}</span><p>${this.t("plannedReturnWeeklyDescription")}</p></div></div>
          <span class="field-label weekly-label">${this.t("plannedReturnWeekly")}</span>
          <div class="days">${orderedWeekdays(this.data?.settings?.first_weekday ?? "monday").map((day) => html`<div class="day" data-weekday=${day}><label>${this.weekdayName(day)}<input type="time" ?disabled=${this.busy} .value=${this.draft.weekly[day] ?? ""} @input=${(e: Event) => this.patch({ weekly: { ...this.draft.weekly, [day]: (e.target as HTMLInputElement).value || null } })}></label></div>`)}</div>
          <p class="help timezone-help">${this.t("plannedReturnTimezone", { zone: this.timeZone })}</p>
          <div class="return-mode">${this.modeSelect("destination_mode_id", "plannedReturnActivateDestination")}<p class="help">${this.t("plannedReturnArrivalPreparation")}</p></div>
        </section>
        <div class="actions footer-actions"><button type="button" ?disabled=${this.busy || !this.dirty} @click=${() => { this.draft = plannedReturnDraft(this.data?.planned_return); this.syncDelayValue(); this.dirty = false; this.error = undefined; }}>${this.t("cancel")}</button><button class="primary" type="submit" ?disabled=${this.busy || invalid || !this.delayValid || !this.dirty}>${this.t("save")}</button></div>
      </fieldset></form></section>`;
  }
  private get displayHour12(): boolean | undefined { return this.hass?.locale?.time_format === "12" ? true : this.hass?.locale?.time_format === "24" ? false : undefined; }
  private displayTime(iso: string): string {
    return new Date(iso).toLocaleString(this.hass?.language ?? "en", { timeZone: this.timeZone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: this.displayHour12 });
  }
  private adjust(): void {
    const iso = returnWallTimeToIso(this.arrival, this.timeZone, Date.now());
    if (!iso) { this.error = this.t("plannedReturnInvalidTime"); return; }
    void this.run((api) => api.adjustPlannedReturn(iso), false, true);
  }
  private start(): void {
    if (this.busy || this.dirty || !this.data?.planned_return_status?.can_start) return;
    const iso = returnWallTimeToIso(`${this.manualDate}T${this.manualTime}`, this.timeZone, Date.now());
    if (!iso || Date.parse(iso) <= Date.now()) { this.error = this.t("plannedReturnInvalidTime"); return; }
    void this.run((api) => api.startPlannedReturn(iso));
  }
  private renderNotices() { return this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing; }
  private hasArrivalControls(status: PlannedReturnStatus): boolean {
    return plannedReturnEpisodeActive(status);
  }
  private editArrival(e: Event, part: "date" | "time"): void {
    if (this.busy) { (e.target as HTMLInputElement).value = part === "date" ? this.arrival.slice(0, 10) : this.arrival.slice(11); return; }
    const value = (e.target as HTMLInputElement).value;
    this.arrival = part === "date" ? `${value}T${this.arrival.slice(11)}` : `${this.arrival.slice(0, 10)}T${value}`;
    this.arrivalDirty = this.arrival !== this.arrivalBaseline;
  }
  private routineMode(id: string): string {
    return id === "default" ? this.t("modeDefault") : this.data?.modes?.find((mode) => mode.key === id)?.name ?? id;
  }
  private renderRoutine() {
    const config = this.settings ? this.draft : plannedReturnDraft(this.data?.planned_return);
    return html`<div class=${`status-item routine-status ${config.enabled ? "is-enabled" : ""}`}>
      <div class="routine-header" role="group" aria-label=${`${this.t("plannedReturnAutomaticOrigin")}: ${this.t(config.enabled ? "plannedReturnRoutineEnabled" : "plannedReturnRoutineDisabled")}`}><ha-icon icon=${config.enabled ? "mdi:calendar-check-outline" : "mdi:calendar-blank-outline"}></ha-icon><div class="status-copy">${this.t("plannedReturnAutomaticOrigin")}</div>${this.settings ? html`<ha-switch class="routine-toggle" .checked=${config.enabled} ?disabled=${this.busy} aria-label=${this.t("plannedReturnEnabled")} @change=${(e: Event) => { const toggle = e.target as HTMLInputElement; if (this.busy) { toggle.checked = this.draft.enabled; return; } this.patch({ enabled: Boolean(toggle.checked) }); }}></ha-switch>` : nothing}</div>
      <div class="routine-flow">
        <div class="routine-step away-step"><ha-icon icon="mdi:home-export-outline"></ha-icon><small>${this.t("plannedReturnAway")}</small><strong>${this.routineMode(config.away_mode_id)}</strong><span class="flow-delay" title=${this.t("plannedReturnConfirmationSummary", { minutes: config.absence_delay_minutes })}><ha-icon icon="mdi:timer-outline"></ha-icon>${this.t("plannedReturnDelaySummary", { minutes: config.absence_delay_minutes })}</span></div>
        <ha-icon class="flow-arrow" icon="mdi:arrow-right"></ha-icon>
        <div class="routine-step preparation-step" title=${this.t("plannedReturnPreparationHelp")}><ha-icon icon="mdi:clock-fast"></ha-icon><span>${this.t("plannedReturnZonePreparation")}</span><small>${this.t("plannedReturnAdaptiveSummary")}</small></div>
        <ha-icon class="flow-arrow" icon="mdi:arrow-right"></ha-icon>
        <div class="routine-step destination-step"><ha-icon icon="mdi:home-import-outline"></ha-icon><small>${this.t("plannedReturnDestination")}</small><strong>${this.routineMode(config.destination_mode_id)}</strong></div>
      </div>
      ${renderPlannedReturnPreparation({
        preparation: this.data?.planned_return_status?.preparation,
        data: this.data,
        hass: this.hass,
        t: this.t,
        expanded: this.preparationExpanded,
        toggle: () => { this.preparationExpanded = !this.preparationExpanded; },
        displayTime: (iso) => this.displayTime(iso),
      })}
    </div>`;
  }
  private hasSavedOccupancySources(status: PlannedReturnStatus): boolean {
    return (this.data?.planned_return?.occupancy_entity_ids ?? (status.sources ?? []).map((source) => source.entity_id)).length > 0;
  }
  private renderOccupancy(status: PlannedReturnStatus) {
    if (!this.hasSavedOccupancySources(status)) return html`<div class="occupancy-panel unmonitored-occupancy"><div class="status-item aggregate-occupancy"><ha-icon icon="mdi:home-outline" aria-hidden="true"></ha-icon><div class="status-copy"><small>${this.t("plannedReturnHousehold")}</small><strong>${this.t("plannedReturnOccupancyUnmonitored")}</strong></div></div><p class="help">${this.t("plannedReturnOccupancyUnmonitoredHelp")}</p></div>`;
    const counts = { home: 0, away: 0, unknown: 0 };
    for (const source of status.sources ?? []) counts[source.state]++;
    const icon = status.occupancy === "home" ? "mdi:home-account" : status.occupancy === "away" ? "mdi:home-outline" : "mdi:home-question-outline";
    return html`<div class="occupancy-panel">
      <div class=${`status-item aggregate-occupancy ${status.occupancy === "home" ? "is-home" : ""}`}><ha-icon icon=${icon}></ha-icon><div class="status-copy"><small>${this.t("plannedReturnHousehold")}</small><strong>${this.t(`plannedReturnOccupancy_${status.occupancy}` as TranslationKey)}</strong></div><div class="runtime-source-controls">
        <span class="source-count home" data-runtime-count="home" role="img" title=${this.t("plannedReturnSourceHomeCount", { count: counts.home })} aria-label=${this.t("plannedReturnSourceHomeCount", { count: counts.home })}><ha-icon icon="mdi:home-account"></ha-icon>${counts.home}</span>
        <span class="source-count away" data-runtime-count="away" role="img" title=${this.t("plannedReturnSourceAwayCount", { count: counts.away })} aria-label=${this.t("plannedReturnSourceAwayCount", { count: counts.away })}><ha-icon icon="mdi:home-outline"></ha-icon>${counts.away}</span>
        ${counts.unknown ? html`<span class="source-count unknown" data-runtime-count="unknown" role="img" title=${this.t("plannedReturnSourceUnknownCount", { count: counts.unknown })} aria-label=${this.t("plannedReturnSourceUnknownCount", { count: counts.unknown })}><ha-icon icon="mdi:home-question-outline"></ha-icon>${counts.unknown}</span>` : nothing}
        <button type="button" class="runtime-sources-toggle" aria-label=${this.t("plannedReturnShowSources")} aria-expanded=${String(this.runtimeSourcesExpanded)} aria-controls="runtime-occupancy-sources" @click=${() => { this.runtimeSourcesExpanded = !this.runtimeSourcesExpanded; }}><ha-icon icon=${this.runtimeSourcesExpanded ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon></button>
      </div></div>
      <ul id="runtime-occupancy-sources" class="source-list runtime-sources" ?hidden=${!this.runtimeSourcesExpanded}>${(status.sources ?? []).map((source) => html`<li data-source=${source.entity_id}><ha-icon icon=${this.hass?.states?.[source.entity_id]?.attributes?.icon ?? "mdi:home-account"}></ha-icon><span class="source-copy">${this.hass?.states?.[source.entity_id]?.attributes?.friendly_name ?? source.entity_id}<small>${source.entity_id}</small></span><span>${this.t(`plannedReturnOccupancy_${source.state}` as TranslationKey)}</span></li>`)}</ul>
      ${status.occupancy === "unknown" ? html`<p class="help status-unknown-help">${this.t("plannedReturnUnknownHelp")}</p>` : nothing}
    </div>`;
  }
  private dismissPreparationHelp(): void {
    const button = this.shadowRoot?.querySelector<HTMLButtonElement>("#return-preparation-help-trigger");
    if (button?.getAttribute("aria-expanded") === "true") button.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  }
  private focusArrivalControl(): void {
    const trigger = this.shadowRoot?.querySelector<HTMLButtonElement>(".arrival-edit-trigger");
    if (trigger && !trigger.disabled) trigger.focus();
    else this.shadowRoot?.querySelector<HTMLButtonElement>(".return-cancel-footer .cancel-return:not(:disabled)")?.focus();
  }
  private openArrivalEditor(): void {
    this.dismissPreparationHelp();
    this.arrivalEditorOpen = true;
    void this.updateComplete.then(() => this.shadowRoot?.querySelector<HTMLInputElement>("#episode-return-date")?.focus());
  }
  private async closeArrivalEditor(): Promise<void> {
    if (this.busy) return;
    const controls = Array.from(this.shadowRoot?.querySelectorAll<HTMLElement>(".arrival-editor,.arrival-editor-close") ?? []);
    if (controls.some((control) => Boolean(control.animate)) && !globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      await Promise.all(controls.filter((control) => Boolean(control.animate)).map((control) => control.animate([{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-4px)" }], { duration: 130, easing: "ease-out" }).finished.catch(() => undefined)));
    }
    const savedArrival = this.data?.planned_return_status?.return_at;
    this.arrival = savedArrival ? returnWallTime(savedArrival, this.timeZone) : this.arrivalBaseline;
    this.arrivalBaseline = this.arrival;
    this.arrivalDirty = false;
    this.error = undefined;
    this.arrivalEditorOpen = false;
    await this.updateComplete;
    this.focusArrivalControl();
  }
  private renderArrivalTrigger(status: PlannedReturnStatus, label?: string, pending = false) {
    return html`<div class="arrival-value-controls"><button type="button" class=${`arrival-edit-trigger${pending ? " pending-arrival-chip" : ""}`} ?disabled=${this.busy || !status.can_start} aria-label=${`${this.t("plannedReturnEditArrival")}: ${status.return_at ? this.displayTime(status.return_at) : this.t("plannedReturnNoTime")}`} aria-expanded=${String(this.arrivalEditorOpen)} aria-controls="episode-arrival-editor" @click=${() => this.openArrivalEditor()}>${pending ? nothing : html`<ha-icon icon="mdi:pencil-outline" aria-hidden="true"></ha-icon>`}<span class=${`arrival-trigger-value${pending ? " pending-arrival-surface" : ""}`}>${label ?? (status.return_at ? this.displayTime(status.return_at) : this.t("plannedReturnNoTime"))}</span></button></div>`;
  }
  private renderEpisodeCancel(status: PlannedReturnStatus) {
    if (this.arrivalEditorOpen || !plannedReturnEpisodeActive(status) || !(status.can_cancel ?? !status.dismissed)) return nothing;
    return html`<button type="button" class="episode-action danger cancel-return" title=${this.t("plannedReturnCancelAction")} aria-label=${this.t("plannedReturnCancelAction")} ?disabled=${this.busy} @click=${() => void this.run((api) => api.cancelPlannedReturn())}><span class="cancel-return-surface"><ha-icon icon="mdi:close" aria-hidden="true"></ha-icon><span>${this.t("cancel")}</span></span></button>`;
  }
  private renderEpisodeActions(status: PlannedReturnStatus) {
    if (!this.arrivalEditorOpen) return nothing;
    return html`<div class="episode-buttons"><button type="button" class="episode-action primary compact-editor-action arrival-editor-close" ?disabled=${this.busy} title=${this.t("plannedReturnCloseEditor")} aria-label=${this.t("plannedReturnCloseEditor")} @click=${() => void this.closeArrivalEditor()}><span class="editor-action-surface"><ha-icon icon="mdi:arrow-left" aria-hidden="true"></ha-icon><span>${this.t("plannedReturnEditorBack")}</span></span></button><div class="episode-confirm-actions"><button type="button" class="episode-action success compact-editor-action change-arrival" title=${this.t("plannedReturnChange")} aria-label=${this.t("plannedReturnChange")} ?disabled=${this.busy || !status.can_start || !this.arrivalDirty} @click=${() => this.adjust()}><span class="editor-action-surface"><ha-icon icon="mdi:check" aria-hidden="true"></ha-icon><span>${this.t("plannedReturnChangeAction")}</span></span></button></div></div>`;
  }
  private renderEpisode(status: PlannedReturnStatus) {
    const timeline = plannedReturnTimeline(status, this.timelineNow);
    return html`<div class=${`episode-layout${this.compact ? "" : " panel-episode"}`}>
      ${timeline ? this.renderTimeline(status) : html`<div class="saved-return-arrival"><span class="arrival-context"><span class="arrival-icon" role="img" title=${this.t("plannedReturnArrival")} aria-label=${this.t("plannedReturnArrival")}><ha-icon icon="mdi:home-import-outline" aria-hidden="true"></ha-icon></span><span class="arrival-label">${this.t("plannedReturnArrival")}</span></span>${this.renderArrivalTrigger(status, undefined, true)}</div>`}
      ${this.arrivalEditorOpen ? html`<div id="episode-arrival-editor" class="arrival-editor"><div class="arrival-fields"><label for="episode-return-date">${this.t("plannedReturnDate")}<input id="episode-return-date" type="date" min=${this.today} ?disabled=${this.busy || !status.can_start} .value=${this.arrival.slice(0, 10)} @input=${(e: Event) => this.editArrival(e, "date")}></label><label for="episode-return-time">${this.t("plannedReturnTime")}<input id="episode-return-time" type="time" ?disabled=${this.busy || !status.can_start} .value=${this.arrival.slice(11)} @input=${(e: Event) => this.editArrival(e, "time")}></label></div></div>` : nothing}
      ${this.arrivalEditorOpen ? this.renderEpisodeActions(status) : (status.can_cancel ?? !status.dismissed) ? html`<div class="return-cancel-footer">${this.renderEpisodeCancel(status)}</div>` : nothing}
    </div>`;
  }
  private renderCompactIndicators(status: PlannedReturnStatus) {
    if (!this.hasSavedOccupancySources(status)) return nothing;
    const counts = { home: 0, away: 0, unknown: 0 };
    for (const source of status.sources ?? []) counts[source.state]++;
    const minutes = this.data?.planned_return?.absence_delay_minutes ?? 10;
    const confirmed = plannedReturnEpisodeActive(status) && (["away", "preparing"].includes(status.state) || status.state === "error" && Boolean(status.departure_at));
    return html`<div class="compact-return-indicators">
      ${(["home", "away", "unknown"] as const).map((state) => state === "unknown" && !counts.unknown ? nothing : html`<span class=${`source-count ${state}`} data-runtime-count=${state} role="img" title=${this.t(state === "home" ? "plannedReturnSourceHomeCount" : state === "away" ? "plannedReturnSourceAwayCount" : "plannedReturnSourceUnknownCount", { count: counts[state] })} aria-label=${this.t(state === "home" ? "plannedReturnSourceHomeCount" : state === "away" ? "plannedReturnSourceAwayCount" : "plannedReturnSourceUnknownCount", { count: counts[state] })}><ha-icon aria-hidden="true" icon=${state === "home" ? "mdi:home-account" : state === "away" ? "mdi:home-outline" : "mdi:home-question-outline"}></ha-icon><span aria-hidden="true">${counts[state]}</span></span>`)}
      ${!confirmed ? html`<span class="compact-return-delay" role="img" title=${this.t("plannedReturnConfirmationSummary", { minutes })} aria-label=${this.t("plannedReturnConfirmationSummary", { minutes })}><ha-icon aria-hidden="true" icon="mdi:timer-outline"></ha-icon><span aria-hidden="true">${plannedReturnDelay(minutes)}</span></span>` : nothing}
    </div>`;
  }
  private renderTimeline(status: PlannedReturnStatus) {
    const timeline = plannedReturnTimeline(status, this.timelineNow);
    if (!timeline) return nothing;
    const labels = plannedReturnTimelineLabels(timeline.departure, timeline.arrival, this.timeZone,
      languageFromHass(this.hass), this.displayHour12);
    const preparationMarker = plannedReturnPreparationMarker(status, timeline.departure, timeline.arrival);
    const estimates = plannedReturnPreparationEstimates(status);
    const preparationTime = preparationMarker ? (labels.differentDates ? this.displayTime(new Date(preparationMarker.start).toISOString()) : plannedReturnTimelineLabels(timeline.departure, preparationMarker.start, this.timeZone, languageFromHass(this.hass), this.displayHour12).arrival) : "";
    const departureMode = status.away_mode_id ? this.routineMode(status.away_mode_id) : undefined;
    const arrivalMode = status.destination_mode_id ? this.routineMode(status.destination_mode_id) : undefined;
    return html`<div class="return-timeline" role="group" aria-label=${this.t("plannedReturnTimeline")}>

      <div class="return-timeline-rail">
        <span class="return-timeline-icon departure-icon" role="img" title=${this.t("plannedReturnDeparted")} aria-label=${this.t("plannedReturnDeparted")}><ha-icon icon="mdi:home-export-outline" aria-hidden="true"></ha-icon></span>
        <div class="return-timeline-line"><div class="return-timeline-track" role="progressbar" aria-label=${this.t("plannedReturnTimeline")} aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(timeline.progress * 100)} aria-valuetext=${this.t("plannedReturnTimelineValue", { time: this.displayTime(new Date(this.timelineNow).toISOString()), percent: Math.round(timeline.progress * 100) })}>
          <span class="return-timeline-elapsed" aria-hidden="true" style=${`width: ${timeline.progress * 100}%`}></span>
        </div><span class="return-timeline-marker" role="img" title=${this.t("plannedReturnTimelineNow")} aria-label=${`${this.t("plannedReturnTimelineNow")}: ${this.displayTime(new Date(this.timelineNow).toISOString())}`} style=${`left: ${timeline.progress * 100}%`}></span>${preparationMarker ? html`<span class="preparation-marker" style=${`left: ${preparationMarker.progress * 100}%`} role="img" title=${this.t("plannedReturnPreparationEstimate", { time: this.displayTime(new Date(preparationMarker.start).toISOString()) })} aria-label=${this.t("plannedReturnPreparationEstimate", { time: this.displayTime(new Date(preparationMarker.start).toISOString()) })}></span>` : nothing}</div>
        <span class="return-timeline-icon arrival-icon" role="img" title=${this.t("plannedReturnArrival")} aria-label=${this.t("plannedReturnArrival")}><ha-icon icon="mdi:home-import-outline" aria-hidden="true"></ha-icon></span>
      </div>
      <div class="return-timeline-endpoints"><div class="return-endpoint-data departure-data"><strong class="return-time-value" aria-label=${`${this.t("plannedReturnDeparted")}: ${this.displayTime(status.departure_at!)}`}><span>${labels.departure}</span></strong>${departureMode ? html`<span class="return-mode-chip departure-mode" role="img" title=${`${this.t("plannedReturnAway")}: ${departureMode}`} aria-label=${`${this.t("plannedReturnAway")}: ${departureMode}`}><ha-icon icon="mdi:format-list-bulleted" aria-hidden="true"></ha-icon><span>${departureMode}</span></span>` : nothing}</div><div class="return-endpoint-data arrival-data">${this.renderArrivalTrigger(status, labels.arrival)}${arrivalMode ? html`<span class="return-mode-chip arrival-mode" role="img" title=${`${this.t("plannedReturnDestination")}: ${arrivalMode}`} aria-label=${`${this.t("plannedReturnDestination")}: ${arrivalMode}`}><ha-icon icon="mdi:format-list-bulleted" aria-hidden="true"></ha-icon><span>${arrivalMode}</span></span>` : nothing}</div></div>

      ${preparationMarker && !this.arrivalEditorOpen ? html`<div class="preparation-estimate"><button type="button" class="preparation-estimate-toggle" title=${this.t("plannedReturnPreparationEstimateHelp")} aria-expanded=${String(this.preparationEstimatesExpanded)} aria-controls="preparation-estimate-rooms" @click=${() => { this.preparationEstimatesExpanded = !this.preparationEstimatesExpanded; }}><ha-icon icon="mdi:clock-fast" aria-hidden="true"></ha-icon><span>${this.t("plannedReturnPreparationEstimate", { time: preparationTime })}</span><ha-icon icon=${this.preparationEstimatesExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} aria-hidden="true"></ha-icon></button><ul id="preparation-estimate-rooms" class="preparation-estimate-rooms" ?hidden=${!this.preparationEstimatesExpanded}>${estimates.map((estimate) => {
        const entity = this.hass?.states?.[estimate.entity_id];
        const time = plannedReturnTimelineLabels(timeline.departure, estimate.start, this.timeZone, languageFromHass(this.hass), this.displayHour12).arrival;
        return html`<li data-entity-id=${estimate.entity_id}><span class="preparation-estimate-room"><ha-icon icon=${entity?.attributes?.icon ?? "mdi:thermostat"} aria-hidden="true"></ha-icon><span>${entity?.attributes?.friendly_name ?? estimate.entity_id}</span></span><time datetime=${new Date(estimate.start).toISOString()} title=${this.displayTime(new Date(estimate.start).toISOString())}>${time}</time></li>`;
      })}</ul></div>` : nothing}
    </div>`;
  }
  private renderAbsenceConfirmation(status: PlannedReturnStatus) {
    if (status.state !== "confirming_absence") return nothing;
    const deadline = status.absence_confirm_at;
    const instant = deadline && /(?:Z|[+-]\d{2}:\d{2})$/.test(deadline) ? Date.parse(deadline) : NaN;
    const label = Number.isFinite(instant) ? plannedReturnTimelineLabels(Date.now(), instant, this.timeZone, languageFromHass(this.hass), this.displayHour12).arrival : undefined;
    return html`<div class="absence-confirmation" role="status" title=${this.t("plannedReturnStateHelp_confirming_absence")}><ha-icon icon="mdi:timer-sand" aria-hidden="true"></ha-icon><div class="absence-confirmation-summary"><span class="absence-confirmation-heading">${this.t("plannedReturnCheckingEmpty")}${label ? html` <time class="absence-confirmation-deadline" datetime=${deadline!}>${this.t("plannedReturnCheckingUntil", { time: label }).replace(/^./u, (letter) => letter.toLocaleLowerCase())}</time>` : nothing}</span></div><p class="help">${this.t("plannedReturnCheckingHelp")}</p></div>`;
  }
  private renderPreparationHelp(status: PlannedReturnStatus) {
    const timeline = plannedReturnTimeline(status, this.timelineNow);
    if (this.arrivalEditorOpen || !timeline || plannedReturnPreparationMarker(status, timeline.departure, timeline.arrival)) return nothing;
    const summary = plannedReturnPreparationSummary(status);
    const summaryKey: TranslationKey = summary === "unknown" ? "plannedReturnPreparationNoEstimate" : summary === "none" || summary === "arrival_only" ? `plannedReturnPreparationCategory_${summary}` : `plannedReturnPreparationState_${summary}`;
    return html`<span class="preparation-info">${renderInlineHelp("return-preparation-help", this.t("plannedReturnRoomPreparation"), [this.t(summaryKey), this.t(summary === "unknown" ? "plannedReturnPreparationNoEstimateHelp" : "plannedReturnPreparationConfigurationHelp")])}</span>`;
  }
  private renderQuickReturn(status: PlannedReturnStatus) {
    const active = plannedReturnEpisodeActive(status);
    const pending = status.state === "armed" || status.state === "confirming_absence";
    const phaseIcon = status.state === "error" ? "mdi:alert-circle-outline" : pending ? "mdi:exit-run" : status.state === "preparing" ? "mdi:home-clock-outline" : "mdi:clock-outline";
    const validArrival = Boolean(returnWallTimeToIso(`${this.manualDate}T${this.manualTime}`, this.timeZone, Date.now()));
    return html`<div class="quick-return-panel">
      <div class="quick-return-heading"><div class="return-title-group">${this.embedded ? nothing : html`<ha-icon icon="mdi:home-clock-outline" aria-hidden="true"></ha-icon>`}<div class="return-title-copy"><div class="return-title-line"><div class="status-copy">${this.t("plannedReturnControls")}</div>${this.renderPreparationHelp(status)}${active && status.state !== "confirming_absence" ? html`<span class=${`return-context-status state-${status.state}`} role="status" title=${this.t(`plannedReturnStateHelp_${status.state}` as TranslationKey)}><ha-icon icon=${phaseIcon} aria-hidden="true"></ha-icon><span>${this.t(`plannedReturnState_${status.state}` as TranslationKey)}</span></span>` : nothing}</div></div></div>${this.compact ? html`<div class="return-header-details">${this.renderCompactIndicators(status)}</div>` : nothing}</div>
      ${this.renderAbsenceConfirmation(status)}
      ${active ? this.renderEpisode(status) : html`<div class="actions manual-departure"><div class="arrival-fields">
        <label for="manual-return-date">${this.t("plannedReturnDate")}<input id="manual-return-date" type="date" min=${this.today} .value=${this.manualDate} ?disabled=${this.busy} @input=${(e: Event) => { this.manualDate = (e.target as HTMLInputElement).value; }}></label>
        <label for="manual-return-time">${this.t("plannedReturnTime")}<input id="manual-return-time" type="time" .value=${this.manualTime} ?disabled=${this.busy} @input=${(e: Event) => { this.manualTime = (e.target as HTMLInputElement).value; }}></label>
      </div><button class="start-return primary compact" ?disabled=${this.busy || this.dirty || !status.can_start || !validArrival} @click=${() => this.start()}>${this.t("plannedReturnLeaving")}</button></div><p class="help manual-departure-help">${this.t(this.hasSavedOccupancySources(status) ? "plannedReturnLeavingHelp" : "plannedReturnLeavingWithoutSourcesHelp")}</p>`}
      ${this.arrivalDirty && active ? html`<p class="help arrival-unsaved" role="status">${this.t("plannedReturnArrivalUnsaved")}</p>` : nothing}
      ${this.dirty ? html`<p class="help">${this.t("plannedReturnSaveFirst")}</p>` : nothing}
      ${!status.can_start ? html`<p class="help quick-return-unavailable">${this.t("plannedReturnQuickUnavailable")}</p>` : nothing}
      ${status.error ? html`<p class="error" role="alert">${status.error}</p>` : nothing}
      ${this.renderNotices()}
    </div>`;
  }
  private renderStatus() {
    const status: PlannedReturnStatus | undefined = this.data?.planned_return_status ?? (this.settings ? { state: "disabled", occupancy: "unknown", sources: [], origin: null, can_start: false, return_at: null, absence_confirm_at: null, zones: [], error: null, notice: null } : undefined);
    if (!status) return nothing;
    return html`<section class="planned-return-status">${this.settings || this.compact ? nothing : html`<h3>${this.t("plannedReturn")}</h3>`}
      <div class="status-bar">${this.compact ? nothing : html`${this.renderRoutine()}${this.renderOccupancy(status)}`}${this.renderQuickReturn(status)}</div>
      ${this.settings || this.compact ? nothing : html`<p class="help">${this.t("plannedReturnTimezone", { zone: this.timeZone })}</p>`}
    </section>`;
  }
  protected render() { return this.settings ? html`${this.renderStatus()}${this.renderSettings()}` : this.renderStatus(); }
}
if (!customElements.get("velair-planned-return")) customElements.define("velair-planned-return", PlannedReturnElement);
