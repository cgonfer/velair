import { LitElement, css, html, noChange, nothing, svg, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { keyed } from "lit/directives/keyed.js";
import type { VelairViewHost } from "../host-types";
import type { ScheduleResponse, SharedSupply } from "../types";
import { convertTemperatureDelta } from "../domain/temperature-units";
import { backendErrorMessage } from "../domain/backend-errors";
import { cardStyles } from "../styles/card-styles";
import { profileStyles } from "../styles/profile-styles";
import { dismissDisconnectedInlineHelp, dismissInlineHelpWithin, renderInlineHelp } from "../views/inline-help";
import { renderDocumentationHelp } from "../views/documentation-links";

export type SharedSupplyLibraryDraft = {
  supplies: SharedSupply[];
  revision: number;
  snapshot: string;
  newSupplyIds: string[];
  selectedSupplyId: string;
  error?: string;
  validationAttempted?: boolean;
};

type ValidationField = "name" | "switch" | "direction" | "hysteresis-mode" | "zone" | "hysteresis" | "hysteresis-stop" | "override" | "override-stop" | "minimum-off" | "off-delay";
type ValidationIssue = {
  supplyId: string;
  field: ValidationField;
  cause: "sharedDemandNameRequired" | "sharedDemandNameTooLong" | "sharedDemandSwitchRequired" | "sharedDemandSwitchInvalid" | "sharedDemandSwitchDuplicate" | "sharedDemandZonesRequired" | "sharedDemandZoneUnmanaged" | "sharedDemandDirectionInvalid" | "sharedDemandModeInvalid" | "sharedDemandSecondsInvalid" | "sharedDemandHysteresisInvalid" | "sharedDemandHiddenStopInvalid";
  section?: "demand" | "rooms" | "timing";
  zoneId?: string;
  conflictName?: string;
};

/** Drafts stay local until the backend validates and saves the complete supply list. */
export class VelairSharedDemandSettings extends LitElement {
  @property({ attribute: false }) host?: VelairViewHost;
  @property({ attribute: false }) data?: ScheduleResponse;
  @property({ attribute: false }) settingsSaving = false;
  @property({ attribute: false }) draft?: SharedSupplyLibraryDraft;
  @state() private _draft?: SharedSupply[];
  @state() private _selectedSupplyId = "";
  @state() private _busy = false;
  @state() private _error = "";
  @state() private _validationAttempted = false;
  private _visibleIssues: ValidationIssue[] = [];
  private _revision = 0;
  private _snapshot = "";
  private _newSupplies = new Set<string>();
  private _focusSupply = "";
  private _focusAfterRemoval?: string;

  static styles = [cardStyles, profileStyles, css`
    :host { --shared-demand-control-gap: 4px; color: var(--primary-text-color); container-type: inline-size; font-family: var(--ha-font-family-body, inherit); font-weight: 400; }
    .shared-demand-output { overflow-wrap: anywhere; }
    .shared-demand-list { container: supply-list / inline-size; }
    .shared-demand-list-summary, .shared-demand-list-identity, .shared-demand-list-control { display: grid; gap: 3px; min-width: 0; }
    .shared-demand-list-summary { gap: 6px 12px; }
    @container supply-list (min-width: 288px) {
      .shared-demand-list-summary { align-items: start; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); }
    }
    .shared-demand-detail { container: supply-detail / inline-size; }
    .shared-demand-supply-header.template-detail-heading { display: grid; gap: 4px; grid-template-columns: minmax(0, 1fr); margin: 0; }
    .shared-demand-header-top { align-items: center; display: flex; flex-wrap: wrap; gap: 4px 12px; min-width: 0; }
    .shared-demand-header-top .shared-demand-enabled { margin-inline-start: auto; }
    .shared-demand-header-editor { align-items: end; display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr) auto; min-width: 0; }
    .shared-demand-header-editor .template-name-field { display: grid; gap: var(--shared-demand-control-gap); }
    .shared-demand-header-editor > .field-error { grid-column: 1 / -1; }
    .shared-demand-supply-header .template-detail-actions { align-items: center; flex-wrap: wrap; margin-right: 0; max-width: 100%; min-width: 0; }
    .shared-demand-purpose { align-items: center; display: flex; flex-wrap: wrap; gap: 4px; color: var(--secondary-text-color); font-size: 12px; }
    .shared-demand-purpose ha-icon, .shared-demand-fact-value ha-icon { --mdc-icon-size: 16px; }
    .shared-demand-facts.shared-demand-status { border-top: 1px solid var(--divider-color); display: grid; gap: var(--shared-demand-control-gap) 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 0; padding-top: 12px; }
    .shared-demand-fact { display: grid; grid-row: span 2; grid-template-rows: subgrid; gap: var(--shared-demand-control-gap); min-width: 0; }
    .shared-demand-fact dt { align-items: center; display: flex; gap: 2px; min-height: 24px; }
    .shared-demand-fact dd { align-self: start; margin: 0; }
    .shared-demand-fact .select-wrap { min-width: 0; }
    @supports not (grid-template-rows: subgrid) {
      .shared-demand-fact { grid-template-rows: minmax(24px, auto) auto; }
    }
    .shared-demand-fact-value { align-items: center; display: flex; flex-wrap: wrap; gap: 4px 6px; font-size: 13px; overflow-wrap: anywhere; }
    .shared-demand-fact .pill { white-space: normal; }
    .shared-demand-list-item .template-item-main > span { overflow-wrap: anywhere; }
    .shared-demand-identity { display: grid; gap: 4px; min-width: 0; }
    .shared-demand-status .pill { font-size: 11px; white-space: normal; }
    .shared-demand-enabled { align-items: center; display: flex; gap: 8px; justify-self: end; min-height: 44px; }
    .shared-demand-enabled ha-switch { flex: 0 0 auto; }
    .shared-demand-fields { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); min-width: 0; }
    .shared-demand-field { display: grid; gap: var(--shared-demand-control-gap); min-width: 0; }
    .shared-demand-field > .label, .shared-demand-field > .settings-policy-heading { align-items: center; display: flex; min-height: 24px; }
    .shared-demand-field .select-wrap { min-width: 0; }
    .shared-demand-section input:not([type="checkbox"]), .shared-demand-section .select-wrap { margin-top: 0; }
    .shared-demand-field > .field-error { margin-top: 0; }
    .shared-demand-fact dt .inline-help-wrapper, .shared-demand-field > .settings-policy-heading .inline-help-wrapper { height: 24px; position: relative; width: 32px; }
    .shared-demand-fact dt .inline-help, .shared-demand-field > .settings-policy-heading .inline-help { height: 32px; position: absolute; top: -4px; width: 32px; }
    .shared-demand-actions { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
    .shared-demand-copy { line-height: 1.5; overflow-wrap: anywhere; }
    .shared-demand-room-assist-info { align-items: flex-start; margin-top: 0; }
    .shared-demand-zones.target-range-options { box-shadow: none; inset: auto; max-height: none; position: static; }
    .shared-demand-zone { align-items: start; display: grid; gap: var(--shared-demand-control-gap) 12px; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); padding: 6px 4px; }
    .shared-demand-zone.selected { grid-template-rows: auto auto auto; }
    .shared-demand-zone.selected > .checkbox-label { align-self: center; grid-column: 1; grid-row: 2; }
    .shared-demand-zone + .shared-demand-zone { border-top: 1px solid var(--divider-color); }
    .shared-demand-zone .checkbox-label { align-items: center; padding: 0 4px; }
    .shared-demand-zone .checkbox-label input { height: 18px; }
    .shared-demand-zone-name { font-size: 14px; }
    .shared-demand-zone-name small { display: block; font-size: 11px; }
    .shared-demand-zone-options { align-items: start; display: grid; gap: var(--shared-demand-control-gap) 8px; grid-column: 2; grid-row: 1 / span 3; grid-template-columns: minmax(0, 1fr); grid-template-rows: subgrid; min-width: 0; }
    .shared-demand-zone-options > .label { align-items: center; display: flex; min-height: 24px; }
    .shared-demand-zone-options > .select-wrap { align-self: center; margin-top: 0; min-width: 0; }
    .shared-demand-zone-details { display: grid; gap: 4px; min-width: 0; }
    @supports not (grid-template-rows: subgrid) {
      .shared-demand-zone-options { grid-template-rows: 24px auto auto; }
      .shared-demand-zone.selected > .checkbox-label { align-self: start; grid-row: 1 / span 3; margin-top: calc(24px + var(--shared-demand-control-gap)); }
    }
    .shared-demand-zone-status { grid-column: 1 / -1; line-height: 1.4; padding: 0 4px; }
    .shared-demand-section select[aria-invalid="true"] { border-color: var(--error-color); }
    .shared-demand-error { color: var(--error-color); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
    .shared-demand-save-error { align-items: center; background: var(--ha-card-background, var(--card-background-color)); border-inline-start: 3px solid var(--error-color); display: flex; gap: 8px; margin: 0; padding: 8px 10px; width: 100%; box-sizing: border-box; }
    .shared-demand-save-error > span { flex: 1; min-width: 0; }
    .shared-demand-supply { min-width: 0; overflow-wrap: anywhere; }
    .shared-demand-output-control { display: grid; gap: 4px; grid-template-columns: minmax(0, 1fr); min-width: 0; }
    .shared-demand-output-control .select-wrap { margin-top: 0; }
    .shared-demand-switch-state { align-items: center; color: var(--secondary-text-color); display: flex; gap: 4px; font-size: 12px; line-height: 1.4; }
    .shared-demand-switch-state ha-icon { --mdc-icon-size: 16px; }
    .shared-demand-output-wait { margin-top: 6px; }
    .shared-demand-disclosure .external-controller-conditions-body { display: grid; gap: 12px; padding-top: 12px; }
    .shared-demand-disclosure > summary { box-sizing: border-box; min-height: 44px; }
    .shared-demand-disclosure > summary strong { overflow: visible; overflow-wrap: anywhere; text-overflow: clip; white-space: normal; }
    .shared-demand-disclosure > summary:focus-visible { border-radius: 4px; outline: 2px solid var(--primary-color); outline-offset: 3px; }
    .shared-demand-band-values { align-items: start; display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 130px), 1fr)); min-width: 0; }
    .shared-demand-effective { grid-column: 1 / -1; }
    .shared-demand-hysteresis-controls { align-items: start; display: grid; gap: 8px 12px; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); }
    .shared-demand-hysteresis-controls.custom { grid-template-columns: minmax(0, 1.7fr) repeat(2, minmax(0, 1fr)); }
    .shared-demand-hysteresis-controls > .shared-demand-band-values { display: contents; }
    .shared-demand-hysteresis-controls > .shared-demand-band-values > .field-error { grid-column: 1 / -1; }
    .shared-demand-fields, .shared-demand-band-values, .shared-demand-hysteresis-controls { row-gap: 0; }
    .shared-demand-fields > .shared-demand-field,
    .shared-demand-band-values > .shared-demand-field,
    .shared-demand-hysteresis-controls > .shared-demand-field { grid-row: span 3; grid-template-rows: subgrid; padding-bottom: 8px; row-gap: 0; }
    .shared-demand-fields > .shared-demand-field { padding-bottom: 12px; }
    .shared-demand-fields > .shared-demand-field > .settings-policy-heading,
    .shared-demand-band-values > .shared-demand-field > .label,
    .shared-demand-hysteresis-controls > .shared-demand-field > .settings-policy-heading { margin-bottom: var(--shared-demand-control-gap); }
    .shared-demand-fields > .shared-demand-field > .field-error,
    .shared-demand-band-values > .shared-demand-field > .field-error,
    .shared-demand-hysteresis-controls > .shared-demand-field > .field-error { margin-top: 4px; }
    .shared-demand-warning { color: var(--warning-color, var(--primary-text-color)); font-size: 12px; line-height: 1.5; }
    .shared-demand-preview { border: 1px solid var(--divider-color); border-radius: 8px; display: grid; gap: 8px; margin: 0; min-width: 0; padding: 12px; }
    .shared-demand-preview figcaption { color: var(--secondary-text-color); display: grid; font-size: 12px; line-height: 1.5; }
    .shared-demand-preview figcaption::before { content: attr(data-caption-space); grid-area: 1 / 1; visibility: hidden; }
    .shared-demand-preview figcaption > span { grid-area: 1 / 1; }
    .shared-demand-preview.placeholder { color: var(--secondary-text-color); }
    .shared-demand-preview.placeholder .preview-demand, .shared-demand-preview.placeholder .preview-stop { fill: var(--disabled-text-color); }
    .shared-demand-preview.placeholder .preview-connector, .shared-demand-preview.placeholder .preview-target, .shared-demand-preview.placeholder .preview-dimension { stroke: var(--disabled-text-color); }
    .shared-demand-preview-title { align-items: center; display: flex; flex-wrap: wrap; gap: 6px; font-size: 13px; }
    .shared-demand-preview-title ha-icon { --mdc-icon-size: 18px; }
    .shared-demand-preview-plot { height: 248px; min-width: 0; position: relative; }
    .shared-demand-preview svg { display: block; height: 248px; position: absolute; inset: 0; width: 100%; }
    .shared-demand-preview-axis-row { align-items: center; display: flex; gap: 8px; min-width: 0; padding-inline: 2.67%; }
    .shared-demand-preview-axis-label { color: var(--secondary-text-color); font-size: 11px; overflow-wrap: anywhere; }
    .shared-demand-preview .shared-demand-preview-axis-row svg { flex: 1 0 32px; height: 8px; min-width: 32px; position: static; width: auto; }
    .shared-demand-preview .preview-demand { fill: var(--warning-color, #ff9800); }
    .shared-demand-preview.cool .preview-demand { fill: var(--info-color, var(--primary-color)); }
    .shared-demand-preview .preview-off { fill: var(--disabled-text-color); opacity: .3; }
    .shared-demand-preview .preview-hold { fill: var(--primary-text-color); opacity: .12; }
    .shared-demand-preview .preview-axis { stroke: var(--secondary-text-color); stroke-width: 1; }
    .shared-demand-preview .preview-target { stroke: var(--primary-text-color); stroke-dasharray: 3 3; stroke-width: 1; }
    .shared-demand-preview .preview-stop { fill: var(--primary-text-color); }
    .shared-demand-preview .preview-connector, .shared-demand-preview .preview-dimension { fill: none; stroke: var(--secondary-text-color); stroke-width: 1; }
    .shared-demand-preview-callout, .shared-demand-preview-target, .shared-demand-preview-distance { position: absolute; text-align: center; transform: translateX(-50%); overflow-wrap: anywhere; }
    .shared-demand-preview-callout { display: grid; gap: 2px; width: 50%; padding: 2px 0; background: var(--ha-card-background, var(--card-background-color)); border-radius: 4px; }
    .shared-demand-preview-callout small { color: var(--secondary-text-color); font-size: 11px; }
    .shared-demand-preview-callout strong { font-size: 13px; font-weight: 600; }
    .shared-demand-preview-callout[data-preview-start] { top: 136px; }
    .shared-demand-preview-callout[data-preview-stop] { top: 192px; }
    .shared-demand-preview-target { font-size: 12px; top: 0; width: 66%; }
    .shared-demand-preview-distance { background: var(--ha-card-background, var(--card-background-color)); color: var(--secondary-text-color); font-size: 11px; max-width: 50%; padding: 0 3px; }
    fieldset { border: 0; display: grid; gap: 12px; margin: 0; min-width: 0; padding: 0; }
    @container (max-width: 560px) {
      .shared-demand-enabled { justify-self: start; }
    }
    @container (max-width: 360px) {
      .shared-demand-facts.shared-demand-status { grid-template-columns: minmax(0, 1fr); }
    }
    @container supply-detail (max-width: 560px) {
      .shared-demand-fact { grid-column: 1 / -1; }
      .shared-demand-zone, .shared-demand-zone.selected { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto; }
      .shared-demand-zone.selected > .checkbox-label { align-self: start; grid-column: 1; grid-row: auto; margin-top: 0; }
      .shared-demand-zone-options { grid-column: 1; grid-row: auto; grid-template-rows: auto auto auto; margin-inline-start: 32px; }
    }
    @container supply-detail (max-width: 480px) {
      .shared-demand-hysteresis-controls { grid-template-columns: minmax(0, 1fr); }
      .shared-demand-hysteresis-controls.custom { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .shared-demand-hysteresis-controls > .shared-demand-mode { grid-column: 1 / -1; }
    }
    @media (any-pointer: coarse) {
      :host { --shared-demand-control-gap: 10px; }
      .shared-demand-section input:not([type="checkbox"]), .shared-demand-section select { height: 44px; }
      .shared-demand-section .inline-help { height: 44px; width: 44px; }
      .shared-demand-fact dt .inline-help-wrapper, .shared-demand-field > .settings-policy-heading .inline-help-wrapper { width: 44px; }
      .shared-demand-fact dt .inline-help, .shared-demand-field > .settings-policy-heading .inline-help { height: 44px; top: -10px; width: 44px; }
      .shared-demand-section .icon-button, .shared-demand-section .template-item .icon-button.danger.template-item-delete { height: 44px; width: 44px; }
      .shared-demand-list-item { grid-template-columns: minmax(0, 1fr) 44px; }
    }
  `];

  public disconnectedCallback(): void {
    dismissInlineHelpWithin(this);
    super.disconnectedCallback();
  }

  public get hasUnsavedChanges(): boolean {
    return this._draft !== undefined && JSON.stringify(this._draft) !== this._snapshot;
  }

  public get busy(): boolean {
    return this._busy;
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("draft") && this.draft && !this._draft) {
      this._draft = structuredClone(this.draft.supplies);
      this._revision = this.draft.revision;
      this._snapshot = this.draft.snapshot;
      this._newSupplies = new Set(this.draft.newSupplyIds);
      this._selectedSupplyId = this.draft.selectedSupplyId;
      this._error = this.draft.error ?? "";
      this._validationAttempted = Boolean(this.draft.validationAttempted);
    }
    // Reverting every edit ends the draft, including its revision and Resume guard.
    // A clean editor must follow subsequent backend updates rather than retain a snapshot.
    if (this._draft && JSON.stringify(this._draft) === this._snapshot) {
      this._draft = undefined;
      this._newSupplies.clear();
      this._validationAttempted = false;
    }
    const supplies = this._supplies();
    if (!supplies.some(supply => supply.id === this._selectedSupplyId)) this._selectedSupplyId = supplies[0]?.id ?? "";
  }

  protected updated(changed: Map<string, unknown>): void {
    dismissDisconnectedInlineHelp();
    if (["_draft", "_selectedSupplyId", "_busy", "_error", "_validationAttempted"].some(key => changed.has(key))) {
      const draft: SharedSupplyLibraryDraft | undefined = this._draft ? {
        supplies: structuredClone(this._draft), revision: this._revision, snapshot: this._snapshot,
        newSupplyIds: [...this._newSupplies], selectedSupplyId: this._selectedSupplyId, error: this._error,
        validationAttempted: this._validationAttempted,
      } : undefined;
      this.dispatchEvent(new CustomEvent("velair-dirty-changed", {
        bubbles: true, composed: true, detail: { dirty: this.hasUnsavedChanges, draft, busy: this._busy },
      }));
    }
    if (this._focusSupply) {
      const supplyId = this._focusSupply;
      this._focusSupply = "";
      [...this.renderRoot.querySelectorAll<HTMLElement>("[data-supply-id]")]
        .find(supply => supply.dataset.supplyId === supplyId)?.querySelector<HTMLInputElement>('[data-field="name"]')?.focus();
    }
    if (this._focusAfterRemoval !== undefined) {
      const id = this._focusAfterRemoval;
      this._focusAfterRemoval = undefined;
      const adjacent = [...this.renderRoot.querySelectorAll<HTMLButtonElement>("[data-select-supply]")].find(button => button.dataset.selectSupply === id);
      (adjacent ?? this.renderRoot.querySelector<HTMLButtonElement>('[data-action="add"]'))?.focus();
    }
  }

  private get _controlsDisabled(): boolean {
    return this._busy || this.settingsSaving || Boolean(this.host?._settingsSaving);
  }

  private _supplies(): SharedSupply[] {
    return this._draft ?? this.data?.settings?.shared_demand_groups ?? [];
  }

  private _begin(): SharedSupply[] {
    if (!this._draft) {
      this._revision = this.data?.configuration_revision ?? 0;
      this._snapshot = JSON.stringify(this.data?.settings?.shared_demand_groups ?? []);
      this._draft = structuredClone(this.data?.settings?.shared_demand_groups ?? []);
    }
    this._error = "";
    return this._draft;
  }

  private _patch(id: string, patch: Partial<SharedSupply>): void {
    if (this._controlsDisabled) return;
    this._draft = this._begin().map(supply => supply.id === id ? { ...supply, ...patch } : supply);
  }

  private _select(id: string): void {
    if (this._controlsDisabled || id === this._selectedSupplyId) return;
    dismissInlineHelpWithin(this);
    this._selectedSupplyId = id;
  }

  private _add(): void {
    if (this._controlsDisabled) return;
    const id = crypto.randomUUID();
    this._newSupplies.add(id);
    this._focusSupply = id;
    this._selectedSupplyId = id;
    this._draft = [...this._begin(), {
      id, name: "", enabled: false, switch_entity_id: "", direction: "heat", hysteresis_mode: "at_target",
      hysteresis: Number(convertTemperatureDelta(0.3, "°C", this.data?.temperature_unit).toFixed(2)),
      minimum_off_seconds: 0, off_delay_seconds: 0, zones: {}, suspended: false,
    }];
  }

  private _remove(id: string): void {
    if (this._controlsDisabled) return;
    dismissInlineHelpWithin(this);
    const previous = this._begin();
    const index = previous.findIndex(supply => supply.id === id);
    this._draft = previous.filter(supply => supply.id !== id);
    this._newSupplies.delete(id);
    if (this._selectedSupplyId === id) this._selectedSupplyId = this._draft[index]?.id ?? this._draft.at(-1)?.id ?? "";
    this._focusAfterRemoval = this._draft[index]?.id ?? this._draft.at(-1)?.id ?? "";
  }

  private _switches(): string[] {
    const hass = this.host?.hass;
    const registry = (hass as unknown as { entities?: Record<string, { platform?: string }> })?.entities;
    return Object.keys(hass?.states ?? {}).filter(id => id.startsWith("switch.")
      && registry?.[id]?.platform !== "velair" && !id.startsWith("switch.velair_")).sort();
  }

  private _numericValid(value: number | undefined, seconds = false, optional = false): boolean {
    return optional && value === undefined || typeof value === "number" && Number.isFinite(value)
      && value >= 0 && (!seconds || Number.isSafeInteger(value) && value <= 86400);
  }

  private _supplyNumbersValid(supply: SharedSupply): boolean {
    return this._numericValid(supply.hysteresis) && this._numericValid(supply.hysteresis_stop, false, true)
      && this._numericValid(supply.minimum_off_seconds, true) && this._numericValid(supply.off_delay_seconds, true)
      && Object.values(supply.zones).every(zone => this._numericValid(zone.hysteresis, false, true)
        && this._numericValid(zone.hysteresis_stop, false, true));
  }

  private _numericErrorId(supply: SharedSupply, field: string, zoneId?: string): string {
    return `shared-demand-error-${encodeURIComponent(supply.id)}-${encodeURIComponent(zoneId ?? "supply")}-${field}`;
  }

  private _numericError(supply: SharedSupply, field: string, valid: boolean, seconds = false, zoneId?: string) {
    return valid ? nothing : html`<span class="field-error" id=${this._numericErrorId(supply, field, zoneId)} role="status">${this.host!._t(seconds ? "sharedDemandSecondsInvalid" : "sharedDemandHysteresisInvalid")}</span>`;
  }

  private _hiddenStopError(supply: SharedSupply, zoneId?: string) {
    const value = zoneId ? supply.zones[zoneId]?.hysteresis_stop : supply.hysteresis_stop;
    return (supply.hysteresis_mode ?? "at_target") !== "custom" && !this._numericValid(value, false, true)
      ? html`<p class="field-error" role="status">${this.host!._t("sharedDemandHiddenStopInvalid")}</p>` : nothing;
  }

  private _validationIssues(supplies: SharedSupply[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const switches = new Map<string, SharedSupply>();
    const allowedSwitches = new Set(this._switches());
    const stored = new Map((this.data?.settings?.shared_demand_groups ?? []).map(supply => [supply.id, supply]));
    const managed = new Set(this.data?.configured_entities ?? []);
    for (const supply of supplies) {
      const add = (field: ValidationField, cause: ValidationIssue["cause"], section?: ValidationIssue["section"], zoneId?: string, conflictName?: string) => issues.push({ supplyId: supply.id, field, cause, section, zoneId, conflictName });
      const preservedDisabledOutput = !supply.enabled && stored.get(supply.id)?.switch_entity_id === supply.switch_entity_id;
      if (!supply.name.trim()) add("name", "sharedDemandNameRequired");
      else if (supply.name.trim().length > 100) add("name", "sharedDemandNameTooLong");
      if (!supply.switch_entity_id) add("switch", "sharedDemandSwitchRequired");
      else if (!(allowedSwitches.has(supply.switch_entity_id) || preservedDisabledOutput)) add("switch", "sharedDemandSwitchInvalid");
      const conflicting = switches.get(supply.switch_entity_id);
      if (supply.switch_entity_id && conflicting) add("switch", "sharedDemandSwitchDuplicate", undefined, undefined, conflicting.name || this.host!._t("sharedDemandUnnamedSupply"));
      else switches.set(supply.switch_entity_id, supply);
      if (!["heat", "cool"].includes(supply.direction)) add("direction", "sharedDemandDirectionInvalid");
      if (!["at_target", "symmetric", "custom"].includes(supply.hysteresis_mode ?? "at_target")) add("hysteresis-mode", "sharedDemandModeInvalid", "demand");
      if (!this._numericValid(supply.hysteresis)) add("hysteresis", "sharedDemandHysteresisInvalid", "demand");
      if (!this._numericValid(supply.hysteresis_stop, false, true)) add((supply.hysteresis_mode ?? "at_target") === "custom" ? "hysteresis-stop" : "hysteresis-mode", (supply.hysteresis_mode ?? "at_target") === "custom" ? "sharedDemandHysteresisInvalid" : "sharedDemandHiddenStopInvalid", "demand");
      if (!this._numericValid(supply.minimum_off_seconds, true)) add("minimum-off", "sharedDemandSecondsInvalid", "timing");
      if (!this._numericValid(supply.off_delay_seconds, true)) add("off-delay", "sharedDemandSecondsInvalid", "timing");
      if (!Object.keys(supply.zones).length) add("zone", "sharedDemandZonesRequired", "rooms");
      for (const [id, zone] of Object.entries(supply.zones)) {
        if (!managed.has(id)) add("zone", "sharedDemandZoneUnmanaged", "rooms", id);
        if (!this._numericValid(zone.hysteresis, false, true)) add("override", "sharedDemandHysteresisInvalid", "rooms", id);
        if (!this._numericValid(zone.hysteresis_stop, false, true)) add((supply.hysteresis_mode ?? "at_target") === "custom" ? "override-stop" : "hysteresis-mode", (supply.hysteresis_mode ?? "at_target") === "custom" ? "sharedDemandHysteresisInvalid" : "sharedDemandHiddenStopInvalid", (supply.hysteresis_mode ?? "at_target") === "custom" ? "rooms" : "demand", id);
      }
    }
    return issues;
  }

  private _fieldIssue(supply: SharedSupply, field: ValidationField, zoneId?: string) {
    return this._visibleIssues.find(issue => issue.supplyId === supply.id && issue.field === field && (!issue.zoneId || issue.zoneId === zoneId || field === "hysteresis-mode"));
  }

  private _fieldErrorId(supply: SharedSupply, field: ValidationField, zoneId?: string) {
    return `shared-demand-validation-${encodeURIComponent(supply.id)}-${field}-${encodeURIComponent(zoneId ?? "supply")}`;
  }

  private _fieldError(supply: SharedSupply, field: ValidationField, zoneId?: string) {
    const issue = this._fieldIssue(supply, field, zoneId);
    return issue ? html`<span class="field-error" id=${this._fieldErrorId(supply, field, zoneId)}>${this.host!._t(issue.cause, { supply: issue.conflictName ?? "" })}</span>` : nothing;
  }

  private _issueMessage(issue: ValidationIssue): string {
    const supply = this._supplies().find(supply => supply.id === issue.supplyId);
    const labels = { name: "sharedDemandName", switch: "sharedDemandSwitch", direction: "sharedDemandDirection", "hysteresis-mode": "sharedDemandMode", zone: "sharedDemandThermostats", hysteresis: "sharedDemandStartDistance", "hysteresis-stop": "sharedDemandStopDistance", override: "sharedDemandStartDistance", "override-stop": "sharedDemandStopDistance", "minimum-off": "sharedDemandMinimumOff", "off-delay": "sharedDemandOffDelay" } as const;
    const label = (issue.field === "hysteresis" || issue.field === "override") && supply?.hysteresis_mode === "symmetric" ? "sharedDemandSymmetricDistance" : labels[issue.field];
    const zoneName = issue.zoneId ? this.host!._friendlyEntityName(issue.zoneId) : "";
    const zoneContext = issue.zoneId ? ` — ${zoneName}${zoneName === issue.zoneId ? "" : ` (${issue.zoneId})`}` : "";
    return `${supply?.name.trim() || this.host!._t("sharedDemandUnnamedSupply")}${zoneContext} — ${this.host!._t(label)}: ${this.host!._t(issue.cause, { supply: issue.conflictName ?? "" })}`;
  }

  private async _revealSaveError(issue?: ValidationIssue): Promise<void> {
    if (issue && this._controlsDisabled) return;
    if (issue) this._selectedSupplyId = issue.supplyId;
    await this.updateComplete;
    const header = this.renderRoot.querySelector<HTMLElement>(".template-detail-heading");
    const section = issue?.section ? this.renderRoot.querySelector<HTMLDetailsElement>(`[data-section="${issue.section}"]`) : undefined;
    if (section) {
      section.open = true;
    }
    const field = issue ? [...this.renderRoot.querySelectorAll<HTMLElement>(`[data-field="${issue.field}"]`)].find(field => !issue.zoneId || issue.field === "hysteresis-mode" || field.closest<HTMLElement>("[data-zone-id]")?.dataset.zoneId === issue.zoneId) : undefined;
    const focusTarget = field ?? (issue ? section?.querySelector<HTMLElement>("summary") : undefined);
    focusTarget?.focus();
    (focusTarget ?? this.renderRoot.querySelector<HTMLElement>("[data-save-error]") ?? header)?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }

  private async _save(): Promise<void> {
    if (!this.host?.hass || !this._draft || this._controlsDisabled) return;
    if ((this.data?.configuration_revision ?? 0) !== this._revision
      || JSON.stringify(this.data?.settings?.shared_demand_groups ?? []) !== this._snapshot) {
      this._error = this.host._t("sharedDemandStale"); await this._revealSaveError(); return;
    }
    this._validationAttempted = true;
    this._error = "";
    const issue = this._validationIssues(this._draft)[0];
    if (issue) {
      await this._revealSaveError(issue); return;
    }
    this._busy = true; this._error = "";
    try {
      const data = await this.host.hass.connection.sendMessagePromise<ScheduleResponse>({
        type: "velair/update_shared_demand", groups: this._draft.map(supply => ({ ...supply, name: supply.name.trim() })),
        expected_revision: this._revision,
      });
      this.host._applyScheduleData(data);
      this.data = data;
      this._draft = undefined;
      this._validationAttempted = false;
      this._newSupplies.clear();
    } catch (error) {
      this._error = backendErrorMessage(error, this.host._t("sharedDemandSaveFailed"));
      void this._revealSaveError();
    } finally { this._busy = false; }
  }

  private async _resume(id: string): Promise<void> {
    if (!this.host?.hass || this._controlsDisabled || this._draft) return;
    this._busy = true; this._error = "";
    try {
      const data = await this.host.hass.connection.sendMessagePromise<ScheduleResponse>({
        type: "velair/resume_shared_demand", group_id: id,
        expected_revision: this.data?.configuration_revision ?? 0,
      });
      this.host._applyScheduleData(data); this.data = data;
    } catch (error) {
      this._error = backendErrorMessage(error, this.host._t("sharedDemandResumeFailed"));
      void this._revealSaveError();
    } finally { this._busy = false; }
  }

  private _zone(supply: SharedSupply, id: string, checked: boolean): void {
    const zones = { ...supply.zones };
    if (checked) zones[id] = {}; else delete zones[id];
    this._patch(supply.id, { zones });
  }

  private _override(supply: SharedSupply, id: string, value?: number, field: "hysteresis" | "hysteresis_stop" = "hysteresis"): void {
    const zone = { ...supply.zones[id] };
    if (value === undefined) delete zone[field]; else zone[field] = value;
    this._patch(supply.id, { zones: { ...supply.zones, [id]: zone } });
  }

  private _useSupplyValues(supply: SharedSupply, id: string, inherit: boolean): void {
    this._patch(supply.id, { zones: { ...supply.zones, [id]: inherit ? {} : { ...supply.zones[id], hysteresis: supply.zones[id]?.hysteresis ?? supply.hysteresis } } });
  }

  private _bandSummary(supply: SharedSupply, id?: string): string {
    const zone = id ? supply.zones[id] : undefined;
    const start = zone?.hysteresis ?? supply.hysteresis;
    const mode = supply.hysteresis_mode ?? "at_target";
    const stop = mode === "symmetric" ? start : mode === "custom" ? zone?.hysteresis_stop ?? supply.hysteresis_stop ?? 0 : 0;
    if (!this._numericValid(start) || !this._numericValid(stop)) return "";
    const key = supply.direction === "heat"
      ? mode === "at_target" ? "sharedDemandEffectiveHeatAtTarget" : "sharedDemandEffectiveHeat"
      : mode === "at_target" ? "sharedDemandEffectiveCoolAtTarget" : "sharedDemandEffectiveCool";
    return this.host!._t(key, { start, stop, unit: this.data?.temperature_unit ?? "°C" });
  }

  private _bandFields(supply: SharedSupply, id?: string) {
    const t = this.host!._t.bind(this.host);
    const unit = this.data?.temperature_unit ?? "°C";
    const mode = supply.hysteresis_mode ?? "at_target";
    const zone = id ? supply.zones[id] : undefined;
    const change = (field: "hysteresis" | "hysteresis_stop", event: Event) => {
      const input = event.target as HTMLInputElement;
      if (id) this._override(supply, id, input.value.trim() === "" && !input.validity.badInput ? undefined : input.valueAsNumber, field);
      else this._patch(supply.id, { [field]: input.valueAsNumber });
    };
    const start = id ? zone?.hysteresis : supply.hysteresis;
    const stop = id ? zone?.hysteresis_stop : supply.hysteresis_stop ?? 0;
    const startValid = this._numericValid(start, false, Boolean(id));
    const stopValid = this._numericValid(stop, false, Boolean(id));
    const numberValue = (value: number | undefined) => value === undefined ? "" : Number.isFinite(value) ? String(value) : noChange;
    return html`<div class="shared-demand-band-values">
      <label class="shared-demand-field"><span class="label">${t(mode === "symmetric" ? "sharedDemandSymmetricDistance" : "sharedDemandStartDistance")} (${unit})</span>
        <input data-field=${id ? "override" : "hysteresis"} type="number" min="0" step="any" ?required=${!id}
          class=${startValid ? "" : "invalid"} aria-invalid=${String(!startValid)} aria-describedby=${startValid ? nothing : this._numericErrorId(supply, "hysteresis", id)}
          .value=${numberValue(start)} placeholder=${Number.isFinite(supply.hysteresis) ? String(supply.hysteresis) : ""}
          @input=${(event: Event) => change("hysteresis", event)}>
        ${this._numericError(supply, "hysteresis", startValid, false, id)}</label>
      ${mode === "custom" ? html`<label class="shared-demand-field"><span class="label">${t("sharedDemandStopDistance")} (${unit})</span>
        <input data-field=${id ? "override-stop" : "hysteresis-stop"} type="number" min="0" step="any" ?required=${!id}
          class=${stopValid ? "" : "invalid"} aria-invalid=${String(!stopValid)} aria-describedby=${stopValid ? nothing : this._numericErrorId(supply, "hysteresis-stop", id)}
          .value=${numberValue(stop)} placeholder=${Number.isFinite(supply.hysteresis_stop ?? 0) ? String(supply.hysteresis_stop ?? 0) : ""}
          @input=${(event: Event) => change("hysteresis_stop", event)}>
        ${this._numericError(supply, "hysteresis-stop", stopValid, false, id)}</label>` : nothing}
      ${this._hiddenStopError(supply, id)}
      ${id ? html`<p class="subtle shared-demand-copy shared-demand-effective">${this._bandSummary(supply, id)}</p>` : nothing}
    </div>`;
  }

  /** An illustrative target explains the configured band without using live room data. */
  private _bandPreview(supply: SharedSupply) {
    const t = this.host!._t.bind(this.host);
    const unit = this.data?.temperature_unit ?? "°C";
    const target = unit === "°F" ? 72 : 22;
    const mode = supply.hysteresis_mode ?? "at_target";
    const start = supply.hysteresis;
    const stop = mode === "symmetric" ? start : mode === "custom" ? supply.hysteresis_stop ?? 0 : 0;
    const heating = supply.direction === "heat";
    const startTemperature = heating ? target - start : target + start;
    const stopTemperature = heating ? target + stop : target - stop;
    const span = start + stop;
    const valid = this._numericValid(start) && this._numericValid(stop)
      && [startTemperature, stopTemperature, span].every(Number.isFinite);
    // Fit the band inside the label-safe centre, retaining the start/stop ratio.
    // This is a schematic example: absolute distances change the readings,
    // rather than pushing markers out towards the edges and bending leaders.
    const coincident = valid && startTemperature === stopTemperature;
    const startX = coincident ? 150 : heating ? 100 : 200;
    const stopX = coincident ? 150 : heating ? 200 : 100;
    const targetX = !valid || coincident ? 150 : 100 + 100 * ((heating ? start : stop) / span);
    const left = Math.min(startX, stopX);
    const right = Math.max(startX, stopX);
    const format = (value: number) => {
      if (!valid) return "—";
      const rounded = Number(value.toPrecision(15));
      // Keep a small valid distance visible instead of rounding its threshold to the target.
      return `${value !== target && rounded === target ? value : rounded} ${unit}`;
    };
    const startOperator = heating ? coincident ? "<" : "≤" : coincident ? ">" : "≥";
    const stopOperator = heating ? "≥" : "≤";
    const percent = (position: number) => `${position / 3}%`;
    const dimension = (position: number, y: number, field: string) => {
      if (position === targetX) return nothing;
      return svg`<path class="preview-dimension" data-dimension=${field} d=${`M ${position} ${y - 3} V ${y + 3} M ${position} ${y} H ${targetX} M ${targetX} ${y - 3} V ${y + 3}`}></path>`;
    };
    return html`<figure class=${`shared-demand-preview ${heating ? "heat" : "cool"}${valid ? "" : " placeholder"}`} data-hysteresis-preview ?data-preview-placeholder=${!valid} aria-hidden=${!valid ? "true" : nothing}>
      <div class="shared-demand-preview-title"><ha-icon icon=${heating ? "mdi:fire" : "mdi:snowflake"} aria-hidden="true"></ha-icon><strong>${t(heating ? "sharedDemandPreviewHeating" : "sharedDemandPreviewCooling")}</strong></div>
      <div class="shared-demand-preview-plot">
        <svg viewBox="0 0 300 248" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <rect class=${heating ? "preview-demand" : "preview-off"} x="8" y="76" width=${left - 8} height="16" rx="3"></rect>
          ${!coincident ? svg`<rect class="preview-hold" x=${left} y="76" width=${right - left} height="16"></rect>` : nothing}
          <rect class=${heating ? "preview-off" : "preview-demand"} x=${right} y="76" width=${292 - right} height="16" rx="3"></rect>
          <path class="preview-connector" d=${`M ${targetX} 23 V 30`}></path>
          <line class="preview-target" x1=${targetX} x2=${targetX} y1="30" y2="94"></line>
          ${dimension(startX, 44, "start")}${dimension(stopX, 62, "stop")}
          <path class="preview-demand" d=${`M ${startX - 4} 68 L ${startX + 4} 68 L ${startX} 75 Z`}></path>
          <path class="preview-stop" d=${`M ${stopX - 4} 100 L ${stopX + 4} 100 L ${stopX} 93 Z`}></path>
          <path class="preview-connector" d=${`M ${startX} 93 V 136 M ${stopX} 101 V 192`}></path>
        </svg>
        <strong class="shared-demand-preview-target" data-preview-target style=${`left: ${percent(targetX)}`}>${t("sharedDemandPreviewTarget", { temperature: format(target) })}</strong>
        ${valid && startX !== targetX ? html`<span class="shared-demand-preview-distance" data-distance="start" role="img" aria-label=${`${t("sharedDemandStartDistance")}: ${format(start)}`} style=${`top: 32px; left: ${percent((startX + targetX) / 2)}`}>${format(start)}</span>` : nothing}
        ${valid && stopX !== targetX ? html`<span class="shared-demand-preview-distance" data-distance="stop" role="img" aria-label=${`${t("sharedDemandStopDistance")}: ${format(stop)}`} style=${`top: 50px; left: ${percent((stopX + targetX) / 2)}`}>${format(stop)}</span>` : nothing}
        <span class="shared-demand-preview-callout" data-preview-start style=${`left: ${percent(startX)}`}><small>${t("sharedDemandPreviewStart")}</small><strong>${valid ? `${startOperator} ${format(startTemperature)}` : "—"}</strong></span>
        <span class="shared-demand-preview-callout" data-preview-stop style=${`left: ${percent(stopX)}`}><small>${t("sharedDemandPreviewStop")}</small><strong>${valid ? `${stopOperator} ${format(stopTemperature)}` : "—"}</strong></span>
      </div>
      <div class="shared-demand-preview-axis-row">
        <span class="shared-demand-preview-axis-label">${t("sharedDemandPreviewAxis", { unit })}</span>
        <svg viewBox="0 0 300 8" preserveAspectRatio="none" aria-hidden="true" focusable="false"><line class="preview-axis" x1="0" x2="296" y1="4" y2="4"></line><path class="preview-stop" d="M 294 1 L 300 4 L 294 7 Z"></path></svg>
      </div>
      <figcaption data-caption-space=${t("sharedDemandPreviewRetain")}><span>${valid ? t(coincident ? "sharedDemandPreviewCoincident" : "sharedDemandPreviewRetain") : nothing}</span></figcaption>
    </figure>`;
  }

  private _disclosure(section: string, icon: string, title: string, body: TemplateResult, open = false) {
    return html`<details class="external-controller-conditions shared-demand-disclosure" data-section=${section} .open=${open ? true : noChange}>
      <summary><ha-icon icon=${icon} aria-hidden="true"></ha-icon><strong>${title}</strong><ha-icon class="external-controller-expand-icon" icon="mdi:chevron-down" aria-hidden="true"></ha-icon></summary>
      <div class="external-controller-conditions-body">${body}</div>
    </details>`;
  }

  /** Runtime facts describe saved configuration, never the editing draft. */
  private _controlState(supply: SharedSupply) {
    const stored = this.data?.settings?.shared_demand_groups?.find(value => value.id === supply.id);
    const status = this.data?.shared_demand_status?.[supply.id];
    const sameOutput = Boolean(stored && stored.switch_entity_id === supply.switch_entity_id);
    const suspended = Boolean(status?.suspended || status?.status === "suspended" || status?.status === "suspension_persistence_failed" || stored?.suspended);
    const enabled = status?.enabled ?? stored?.enabled ?? false;
    const key = !sameOutput ? "sharedDemandUnknown" : suspended ? "sharedDemandControlSuspended"
      : !enabled ? "sharedDemandDisabled" : !status || status.status === "invalid_output" || status.status === "temperature_migration_blocked"
        ? "sharedDemandUnknown" : "sharedDemandActive";
    const evaluated = sameOutput && enabled && !suspended && Boolean(status)
      && !["disabled", "invalid_output", "temperature_migration_blocked"].includes(status!.status ?? "")
      && typeof status?.demand === "boolean";
    const zones = Object.values(status?.zones ?? {});
    const demandKey = status?.demand === true ? "sharedDemandDemandPresent"
      : zones.length && zones.every(zone => zone.demand === false) ? "sharedDemandDemandAbsent" : "sharedDemandUnknown";
    return { sameOutput, suspended, key, evaluated, demandKey } as const;
  }

  private _listNotice(supply: SharedSupply) {
    const status = this.data?.shared_demand_status?.[supply.id];
    const key = status?.status === "suspension_persistence_failed" ? "sharedDemandSuspensionSaveFailed"
      : status?.status === "delivery_failed" ? "sharedDemandDeliveryFailed"
      : status?.status === "unavailable" ? "sharedDemandOutputUnavailable"
      : status?.status === "temperature_migration_blocked" ? "sharedDemandMigrationBlocked"
      : status?.status === "invalid_output" ? "sharedDemandInvalidOutput"
      : status?.suspended || supply.suspended ? "sharedDemandSuspended" : undefined;
    return key ? html`<span class="shared-demand-warning">${this.host!._t(key)}</span>` : nothing;
  }

  private _renderSaveAction() {
    const label = this.host!._t("sharedDemandSave");
    return html`<button class="icon-button primary" data-action="save" type="button" title=${label} aria-label=${label}
      ?disabled=${this._controlsDisabled || !this.hasUnsavedChanges || !this._supplies().every(supply => this._supplyNumbersValid(supply))} @click=${this._save}><ha-icon icon="mdi:content-save" aria-hidden="true"></ha-icon></button>`;
  }

  private _renderSaveError() {
    const issue = this._visibleIssues[0];
    const message = this._error || (issue ? this._issueMessage(issue) : "");
    return message ? html`<div class="shared-demand-error shared-demand-save-error" data-save-error role="alert"><span>${message}</span>
      ${!this._error && issue ? html`<button class="icon-button" type="button" data-action="correct-error" ?disabled=${this._controlsDisabled} title=${this.host!._t("sharedDemandReviewField")} aria-label=${this.host!._t("sharedDemandReviewField")} @click=${() => this._revealSaveError(issue)}><ha-icon icon="mdi:arrow-right" aria-hidden="true"></ha-icon></button>` : nothing}</div>` : nothing;
  }

  private _renderSupply(supply: SharedSupply, availableSwitches: string[]) {
    const host = this.host!;
    const t = host._t.bind(host);
    const status = this.data?.shared_demand_status?.[supply.id];
    const control = this._controlState(supply);
    const suspended = control.suspended;
    const switches = [...availableSwitches];
    if (supply.switch_entity_id && !switches.includes(supply.switch_entity_id)) switches.push(supply.switch_entity_id);
    const zoneIds = [...new Set([...(this.data?.configured_entities ?? []), ...Object.keys(supply.zones)])];
    const sameOutput = control.sameOutput;
    const switchState = sameOutput ? status?.output_state ?? host.hass?.states?.[supply.switch_entity_id]?.state : undefined;
    const switchLabel = switchState === "on" ? t("sharedDemandOn") : switchState === "off" ? t("sharedDemandOff")
      : switchState === "unavailable" ? t("sharedDemandUnavailable") : t("sharedDemandUnknown");
    const disabled = this._controlsDisabled;
    const domId = encodeURIComponent(supply.id);
    const mode = supply.hysteresis_mode ?? "at_target";
    const isNew = this._newSupplies.has(supply.id);
    return html`<article class="shared-demand-supply" data-supply-id=${supply.id}>
      <fieldset ?disabled=${disabled}>
        <header class="template-detail-heading shared-demand-supply-header shared-demand-identity">
          <div class="shared-demand-header-top">
            ${this.hasUnsavedChanges ? html`<span class="pill warning">${t("unsaved")}</span>` : nothing}
            <div class="shared-demand-enabled"><span class="label">${t("sharedDemandEnabled")}</span>
            ${renderInlineHelp(`shared-demand-control-help-${domId}`, t("sharedDemandEnabled"), t("sharedDemandControlHelp"))}
            <ha-switch data-field="enabled" .checked=${supply.enabled} .disabled=${disabled} ?disabled=${disabled}
              aria-label=${`${t("sharedDemandEnabled")}: ${supply.name || t("sharedDemandName")}`}
              @change=${(e: Event) => this._patch(supply.id, { enabled: Boolean((e.target as HTMLInputElement).checked) })}></ha-switch>
            </div>
          </div>
          <div class="shared-demand-header-editor">
            <label class="template-name-field"><span class="label">${t("sharedDemandName")}</span>
              <div class="template-name-input-wrap"><ha-icon icon="mdi:pencil" aria-hidden="true"></ha-icon><input data-field="name" aria-label=${t("sharedDemandName")} .value=${supply.name} maxlength="100" required
                class=${this._fieldIssue(supply, "name") ? "invalid" : ""} aria-invalid=${String(Boolean(this._fieldIssue(supply, "name")))} aria-describedby=${this._fieldIssue(supply, "name") ? this._fieldErrorId(supply, "name") : nothing}
                @input=${(e: Event) => this._patch(supply.id, { name: (e.target as HTMLInputElement).value })}></div>
            </label>
            <div class="template-detail-actions">${this._renderSaveAction()}</div>
            ${this._fieldError(supply, "name")}
          </div>
          ${this._renderSaveError()}
        </header>
        <dl class="shared-demand-facts shared-demand-status">
          <div class="shared-demand-fact shared-demand-supply"><dt class="label"><label for=${`shared-demand-switch-${domId}`}>${t("sharedDemandSwitch")}</label>
            ${renderInlineHelp(`shared-demand-state-help-${domId}`, t("sharedDemandSwitchState"), t("sharedDemandStateHelp"))}</dt><dd>
            <div class="shared-demand-output-control">
            <span class="select-wrap"><select id=${`shared-demand-switch-${domId}`} data-field="switch" .value=${supply.switch_entity_id}
              aria-invalid=${String(Boolean(this._fieldIssue(supply, "switch")))} aria-describedby=${this._fieldIssue(supply, "switch") ? this._fieldErrorId(supply, "switch") : nothing}
              @change=${(e: Event) => this._patch(supply.id, { switch_entity_id: (e.target as HTMLSelectElement).value })}>
              <option value="" ?selected=${!supply.switch_entity_id}>${t("sharedDemandChooseSwitch")}</option>
              ${switches.map(id => html`<option value=${id} ?selected=${id === supply.switch_entity_id}>${host._friendlyEntityName(id)} (${id})</option>`)}
            </select></span>
            <span class="shared-demand-switch-state" data-fact="switch-state" aria-live="polite" aria-label=${t("sharedDemandSwitchState")}>
              <ha-icon icon="mdi:power" aria-hidden="true"></ha-icon><span>${t("sharedDemandSwitchState")}: ${switchLabel}</span>
            </span></div>
            ${this._fieldError(supply, "switch")}
            ${sameOutput && (status?.status === "minimum_off" || status?.status === "off_delay") ? html`<span class="shared-demand-output-wait pill warning" role="status">${t(status.status === "minimum_off" ? "sharedDemandWaitingMinimumOff" : "sharedDemandWaitingOffDelay")}</span>` : nothing}
          </dd></div>
          <div class="shared-demand-fact"><dt class="label"><label for=${`shared-demand-purpose-${domId}`}>${t("sharedDemandDirection")}</label>${renderInlineHelp(`shared-demand-purpose-help-${domId}`, t("sharedDemandDirection"), t("sharedDemandPurposeHelp"))}</dt><dd>
            <span class="select-wrap"><select id=${`shared-demand-purpose-${domId}`} data-field="direction" .value=${supply.direction}
              aria-invalid=${String(Boolean(this._fieldIssue(supply, "direction")))} aria-describedby=${this._fieldIssue(supply, "direction") ? this._fieldErrorId(supply, "direction") : nothing}
              @change=${(e: Event) => this._patch(supply.id, { direction: (e.target as HTMLSelectElement).value as "heat" | "cool" })}>
              <option value="heat" ?selected=${supply.direction === "heat"}>${t("sharedDemandHeat")}</option><option value="cool" ?selected=${supply.direction === "cool"}>${t("sharedDemandCool")}</option>
            </select></span>
            ${this._fieldError(supply, "direction")}
          </dd></div>
          ${control.evaluated ? html`<div class="shared-demand-fact" data-fact="demand" aria-live="polite"><dt class="label">${t("sharedDemandDemand")}</dt><dd class="shared-demand-fact-value"><ha-icon icon="mdi:thermometer-lines" aria-hidden="true"></ha-icon><span>${t(control.demandKey)}</span></dd></div>` : nothing}
        </dl>
        ${status?.status === "delivery_failed" ? html`<p class="shared-demand-error" role="status">${t("sharedDemandDeliveryFailed")}</p>` : nothing}
        ${status?.status === "unavailable" ? html`<p class="shared-demand-warning" role="status">${t("sharedDemandOutputUnavailable")}</p>` : nothing}
        ${status?.status === "temperature_migration_blocked" ? html`<p class="shared-demand-warning" role="status">${t("sharedDemandMigrationBlocked")}</p>` : nothing}
        ${status?.status === "invalid_output" ? html`<p class="shared-demand-error" role="status">${t("sharedDemandInvalidOutput")}</p>` : nothing}
        ${status?.status === "suspension_persistence_failed" ? html`<p class="shared-demand-error" role="status">${t("sharedDemandSuspensionSaveFailed")}</p>` : nothing}
        ${suspended ? html`<div class="shared-demand-actions"><span class="shared-demand-warning">${t("sharedDemandControlSuspended")}</span><button class="command-button primary compact" data-action="resume" ?disabled=${disabled || Boolean(this._draft)} @click=${() => this._resume(supply.id)}><ha-icon icon="mdi:play" aria-hidden="true"></ha-icon><span>${t("sharedDemandResume")}</span></button></div>` : nothing}
        ${this._disclosure("timing", "mdi:timer-outline", t("sharedDemandAdvanced"), html`<p class="subtle shared-demand-copy">${t("sharedDemandTimingDescription")}</p><div class="shared-demand-fields">
          <div class="shared-demand-field"><div class="settings-policy-heading"><label class="label" for=${`shared-demand-minimum-off-${domId}`}>${t("sharedDemandMinimumOff")}</label>${renderInlineHelp(`shared-demand-minimum-off-help-${domId}`, t("sharedDemandMinimumOff"), t("sharedDemandMinimumOffHelp"))}</div><input id=${`shared-demand-minimum-off-${domId}`} data-field="minimum-off" type="number" min="0" max="86400" step="1" required
            class=${this._numericValid(supply.minimum_off_seconds, true) ? "" : "invalid"} aria-invalid=${String(!this._numericValid(supply.minimum_off_seconds, true))} aria-describedby=${this._numericValid(supply.minimum_off_seconds, true) ? nothing : this._numericErrorId(supply, "minimum-off")} .value=${Number.isFinite(supply.minimum_off_seconds) ? String(supply.minimum_off_seconds) : noChange}
            @input=${(e: Event) => this._patch(supply.id, { minimum_off_seconds: (e.target as HTMLInputElement).valueAsNumber })}>
            ${this._numericError(supply, "minimum-off", this._numericValid(supply.minimum_off_seconds, true), true)}</div>
          <div class="shared-demand-field"><div class="settings-policy-heading"><label class="label" for=${`shared-demand-off-delay-${domId}`}>${t("sharedDemandOffDelay")}</label>${renderInlineHelp(`shared-demand-off-delay-help-${domId}`, t("sharedDemandOffDelay"), t("sharedDemandOffDelayHelp"))}</div><input id=${`shared-demand-off-delay-${domId}`} data-field="off-delay" type="number" min="0" max="86400" step="1" required
            class=${this._numericValid(supply.off_delay_seconds, true) ? "" : "invalid"} aria-invalid=${String(!this._numericValid(supply.off_delay_seconds, true))} aria-describedby=${this._numericValid(supply.off_delay_seconds, true) ? nothing : this._numericErrorId(supply, "off-delay")} .value=${Number.isFinite(supply.off_delay_seconds) ? String(supply.off_delay_seconds) : noChange}
            @input=${(e: Event) => this._patch(supply.id, { off_delay_seconds: (e.target as HTMLInputElement).valueAsNumber })}>
            ${this._numericError(supply, "off-delay", this._numericValid(supply.off_delay_seconds, true), true)}</div>
        </div>`, !this._numericValid(supply.minimum_off_seconds, true) || !this._numericValid(supply.off_delay_seconds, true))}
        ${this._disclosure("demand", "mdi:thermometer-lines", t("sharedDemandDemandSettings"), html`
          <p class="notice external-execution-notice shared-demand-room-assist-info"><ha-icon icon="mdi:information-outline" aria-hidden="true"></ha-icon><span>${t("sharedDemandRoomAssist")}</span></p>
          <div class=${mode === "custom" ? "shared-demand-hysteresis-controls custom" : "shared-demand-hysteresis-controls"}>
          <div class="shared-demand-field shared-demand-mode"><div class="settings-policy-heading"><label class="label" for=${`shared-demand-mode-${domId}`}>${t("sharedDemandMode")}</label>
            ${renderInlineHelp(`shared-demand-hysteresis-help-${domId}`, t("sharedDemandMode"), t("sharedDemandModeHelp"))}</div><span class="select-wrap"><select id=${`shared-demand-mode-${domId}`} data-field="hysteresis-mode" .value=${mode}
            aria-invalid=${String(Boolean(this._fieldIssue(supply, "hysteresis-mode")))} aria-describedby=${this._fieldIssue(supply, "hysteresis-mode") ? this._fieldErrorId(supply, "hysteresis-mode") : nothing}
            @change=${(event: Event) => this._patch(supply.id, { hysteresis_mode: (event.target as HTMLSelectElement).value as NonNullable<SharedSupply["hysteresis_mode"]> })}>
            <option value="at_target" ?selected=${mode === "at_target"}>${t("sharedDemandModeAtTarget")}</option>
            <option value="symmetric" ?selected=${mode === "symmetric"}>${t("sharedDemandModeSymmetric")}</option>
            <option value="custom" ?selected=${mode === "custom"}>${t("sharedDemandModeCustom")}</option>
          </select></span>${this._fieldError(supply, "hysteresis-mode")}</div>
          ${this._bandFields(supply)}
          </div>
          ${this._bandPreview(supply)}
          ${mode !== "at_target" ? html`<p class="shared-demand-warning">${t("sharedDemandBeyondTargetWarning")}</p>` : nothing}
        `, !this._numericValid(supply.hysteresis) || !this._numericValid(supply.hysteresis_stop, false, true))}
        ${this._disclosure("rooms", "mdi:home-thermometer-outline", t("sharedDemandThermostats"), html`
          ${this._fieldError(supply, "zone")}
          <div class="target-range-options shared-demand-zones">${zoneIds.map(id => {
            const selected = supply.zones[id] !== undefined;
            const zone = supply.zones[id];
            const overridden = zone?.hysteresis !== undefined || zone?.hysteresis_stop !== undefined;
            const zoneStatus = sameOutput ? status?.zones?.[id] : undefined;
            const inheritId = `shared-demand-inherit-${domId}-${encodeURIComponent(id)}`;
            return html`<div class=${selected ? "shared-demand-zone selected" : "shared-demand-zone"} data-zone-id=${id}>
              <label class="checkbox-label"><input type="checkbox" data-field="zone" .checked=${selected}
                aria-invalid=${String(Boolean(this._fieldIssue(supply, "zone", id)))} aria-describedby=${this._fieldIssue(supply, "zone", id) ? this._fieldErrorId(supply, "zone", this._fieldIssue(supply, "zone", id)?.zoneId) : nothing}
                @change=${(event: Event) => this._zone(supply, id, (event.target as HTMLInputElement).checked)}>
                <span class="shared-demand-zone-name">${host._friendlyEntityName(id)}<small class="subtle">${id}</small></span></label>
              ${this._fieldIssue(supply, "zone", id)?.zoneId ? this._fieldError(supply, "zone", id) : nothing}
              ${selected ? html`<div class="shared-demand-zone-options">
                <label class="label" for=${inheritId}>${t("sharedDemandValues")}</label><span class="select-wrap"><select id=${inheritId} data-field="inherit" .value=${overridden ? "custom" : "inherit"}
                  @change=${(event: Event) => this._useSupplyValues(supply, id, (event.target as HTMLSelectElement).value === "inherit")}>
                  <option value="inherit" ?selected=${!overridden}>${t("sharedDemandUseSupplyValues")}</option>
                  <option value="custom" ?selected=${overridden}>${t("sharedDemandCustomValues")}</option>
                </select></span>
                <div class="shared-demand-zone-details">
                ${overridden ? this._bandFields(supply, id) : html`<p class="subtle shared-demand-copy">${this._bandSummary(supply, id)}</p>`}
                ${zoneStatus ? html`<span class="subtle shared-demand-zone-status">${zoneStatus.demand === true ? t("sharedDemandDemand") : zoneStatus.demand === false ? t("sharedDemandNoDemand") : t("sharedDemandUnknown")}${zoneStatus.source === "room_assist" ? html` · ${t("targetRangeBlockerRoomAssist")}` : nothing}</span>` : nothing}
                </div>
              </div>` : nothing}
            </div>`;
          })}</div>`, isNew || Object.values(supply.zones).some(zone => !this._numericValid(zone.hysteresis, false, true) || !this._numericValid(zone.hysteresis_stop, false, true)))}

      </fieldset>
    </article>`;
  }

  render() {
    if (!this.host || !this.data) return nothing;
    const t = this.host._t.bind(this.host);
    const supplies = this._supplies();
    this._visibleIssues = this._validationIssues(supplies).filter(issue => this._validationAttempted || issue.cause === "sharedDemandSecondsInvalid" || issue.cause === "sharedDemandHysteresisInvalid" || issue.cause === "sharedDemandHiddenStopInvalid");
    const switches = this._switches();
    const selected = supplies.find(supply => supply.id === this._selectedSupplyId);
    const supplyIds = new Set(supplies.map(supply => supply.id));
    const orphanFaults = Object.entries(this.data.shared_demand_status ?? {}).filter(([id, status]) => !supplyIds.has(id)
      && (id === "_configuration" || status.status === "delivery_failed" || status.status === "invalid_output" || status.status === "cleanup_persistence_failed"));
    return html`<section class="templates-view shared-demand-section" aria-label=${t("sharedDemandTitle")}>
      <header class="profile-intro"><ha-icon icon="mdi:heat-pump-outline"></ha-icon><span><strong>${t("supplyControl")}</strong><small>${t("sharedDemandDescription")}</small></span>${renderDocumentationHelp(this.host, "sharedSupply")}</header>
      ${orphanFaults.map(([id, status]) => {
        const output = typeof status.switch_entity_id === "string" ? status.switch_entity_id
          : id.startsWith("cleanup:switch.") ? id.slice("cleanup:".length) : "";
        const message = status.status === "cleanup_persistence_failed" ? "sharedDemandCleanupSaveFailed"
          : id === "_configuration" || status.status === "invalid_output" ? "sharedDemandInvalidOutput" : "sharedDemandDeliveryFailed";
        return html`<p class="shared-demand-error" role="status">${output ? html`${this.host!._friendlyEntityName(output)} (${output}): ` : nothing}${t(message)}</p>`;
      })}
      <div class="template-library">
        ${supplies.length ? html`<div class="template-library-layout">
          <div class="template-list-wrap shared-demand-list">
            <div class="template-list-heading"><div class="section-heading"><ha-icon icon="mdi:heat-pump-outline" aria-hidden="true"></ha-icon><span class="section-label">${t("sharedDemandLibrary")} (${supplies.length})</span></div>
              <button class="icon-button primary" data-action="add" type="button" title=${t("sharedDemandAdd")} aria-label=${t("sharedDemandAdd")} ?disabled=${this._controlsDisabled} @click=${this._add}><ha-icon icon="mdi:plus" aria-hidden="true"></ha-icon></button>
            </div>
            <div class="template-list" role="group" aria-label=${t("sharedDemandSelectSupply")}>
              ${repeat(supplies, supply => supply.id, supply => html`<div class=${supply.id === selected?.id ? "template-item shared-demand-list-item active" : "template-item shared-demand-list-item"}>
                <button class="template-item-main" type="button" data-select-supply=${supply.id} aria-pressed=${String(supply.id === selected?.id)} ?disabled=${this._controlsDisabled} @click=${() => this._select(supply.id)}>
                  <span class="resource-item-heading"><strong title=${supply.name || t("sharedDemandName")}>${supply.name || t("sharedDemandName")}</strong></span>
                  <span class="shared-demand-list-summary">
                    <span class="shared-demand-list-identity">
                      <span class="shared-demand-purpose"><ha-icon icon=${supply.direction === "heat" ? "mdi:fire" : "mdi:snowflake"} aria-hidden="true"></ha-icon>${t(supply.direction === "heat" ? "sharedDemandHeatingSupply" : "sharedDemandCoolingSupply")}</span>
                      <span class="shared-demand-output">${t("sharedDemandListSwitch", { name: supply.switch_entity_id ? this.host!._friendlyEntityName(supply.switch_entity_id) : t("sharedDemandChooseSwitch") })}</span>
                    </span>
                    <span class="shared-demand-list-control">
                      <span>${t("sharedDemandRoomCount", { count: Object.keys(supply.zones).length })}</span>
                      <span>${t("sharedDemandListControl", { state: t(this._controlState(supply).key) })}</span>
                    </span>
                  </span>
                  ${!this._supplyNumbersValid(supply) ? html`<span class="field-error" data-numeric-invalid>${t("sharedDemandNumericInvalid")}</span>` : nothing}
                  ${this._listNotice(supply)}
                </button>
                <span class="resource-delete-control" title=${t("sharedDemandRemove")}><button class="icon-button danger template-item-delete" data-action="remove" data-remove-supply=${supply.id} type="button"
                  ?disabled=${this._controlsDisabled} title=${t("sharedDemandRemove")} aria-label=${`${t("sharedDemandRemove")}: ${supply.name || t("sharedDemandName")}`}
                  @click=${(event: Event) => { event.stopPropagation(); this._remove(supply.id); }}><ha-icon icon="mdi:trash-can"></ha-icon></button></span>
              </div>`)}
            </div>
          </div>
          <div class="template-detail shared-demand-detail">${selected ? keyed(selected.id, this._renderSupply(selected, switches)) : nothing}</div>
        </div>` : !this.hasUnsavedChanges && !this._error ? html`<div class="template-placeholder compact shared-demand-empty-state"><span>${t("sharedDemandEmpty")}</span>
          <button class="icon-button primary" data-action="add" type="button" title=${t("sharedDemandAdd")} aria-label=${t("sharedDemandAdd")} ?disabled=${this._controlsDisabled} @click=${this._add}><ha-icon icon="mdi:plus" aria-hidden="true"></ha-icon></button>
        </div>` : html`<div class="template-detail shared-demand-detail shared-demand-empty-state"><div class="template-detail-heading">
          <div class="shared-demand-identity">${this.hasUnsavedChanges ? html`<span class="pill warning">${t("unsaved")}</span>` : nothing}<span class="subtle">${t("sharedDemandEmpty")}</span></div>
          <div class="template-detail-actions"><button class="icon-button primary" data-action="add" type="button" title=${t("sharedDemandAdd")} aria-label=${t("sharedDemandAdd")} ?disabled=${this._controlsDisabled} @click=${this._add}><ha-icon icon="mdi:plus" aria-hidden="true"></ha-icon></button>
            ${this.hasUnsavedChanges ? this._renderSaveAction() : nothing}</div>
        </div>${this._renderSaveError()}</div>`}
      </div>
    </section>`;
  }
}

if (!customElements.get("velair-shared-demand-settings")) customElements.define("velair-shared-demand-settings", VelairSharedDemandSettings);
