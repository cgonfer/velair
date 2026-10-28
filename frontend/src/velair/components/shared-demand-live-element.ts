import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { VelairApiClient } from "../api/client";
import type { VelairViewHost } from "../host-types";
import type { HomeAssistant, SharedDemandLiveVisibility, SharedDemandStatus, SharedDemandZoneStatus, SharedSupply } from "../types";
import type { TranslationKey } from "../translations";
import { cardStyles } from "../styles/card-styles";
import { profileStyles } from "../styles/profile-styles";
import { observePanelDialogAlignment } from "../views/panel-dialog-alignment";

/** Read-only monitor of backend demand. Never evaluates a configuration draft. */
export class VelairSharedDemandLive extends LitElement {
  @property({ attribute: false }) host?: VelairViewHost;
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) supply?: SharedSupply;
  @property({ attribute: false }) supplyTemperatureUnit?: string;
  @property({ type: Boolean }) unsaved = false;
  @property({ type: Boolean }) embedded = false;
  @property({ attribute: false }) visibility?: SharedDemandLiveVisibility;
  @property({ type: String }) heading?: string;
  @state() private _open = false;
  @state() private _phase: "loading" | "live" | "error" | "disconnected" | "unavailable" = "loading";
  @state() private _status?: SharedDemandStatus;
  @state() private _now = Date.now();
  private _clock?: ReturnType<typeof setTimeout>;
  private _alignmentCleanup?: () => void;
  private _generation = 0;
  private _unsubscribe?: () => Promise<void> | void;
  private _connection?: HomeAssistant["connection"];
  private _onDisconnected = () => { this._stop(); this._phase = "disconnected"; };
  private _onReady = () => { if (this._active) void this._subscribe(); };
  private get _active() { return this.isConnected && Boolean(this.supply) && (this.embedded || this._open); }
  private _visible(key: keyof SharedDemandLiveVisibility) { return !this.embedded || this.visibility?.[key] !== false; }

  static styles = [cardStyles, profileStyles, css`
    :host { display: block; color: var(--primary-text-color); min-width: 0; }
    .live-trigger { display: flex; justify-content: flex-end; margin-bottom: 8px; }
    .live-embedded { container: supply-live / inline-size; min-width: 0; }
    .live-embedded h2 { font-size: 18px; margin: 0; }
    .live-embedded .documentation-dialog-header { grid-template-columns: minmax(0, 1fr); }
    .live-embedded > .live-meta { margin-bottom: 12px; }
    .live-summary.one-fact { grid-template-columns: minmax(0, 1fr); }
    .live-dialog.documentation-dialog { position: fixed; left: var(--live-dialog-center, 50%); right: auto; margin-inline: 0; transform: translateX(-50%); width: min(720px, calc(100vw - 32px), var(--live-dialog-container-width, 720px)); }
    .live-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 16px; }
    .live-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; color: var(--secondary-text-color); font-size: 12px; }
    .live-meta.is-live { color: var(--success-color, #43a047); }
    .live-dot { height: 8px; width: 8px; border-radius: 50%; background: currentColor; flex: 0 0 auto; }
    .live-subtitle { color: var(--secondary-text-color); margin: 4px 0 16px; overflow-wrap: anywhere; }
    .live-summary { background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: var(--ha-card-border-radius, 12px); display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 0; padding: 16px; gap: 12px; }
    .live-summary-fact { display: grid; align-content: start; grid-template-columns: 24px minmax(0, 1fr); gap: 4px 12px; min-width: 0; margin: 0; }
    .live-summary-fact + .live-summary-fact { border-inline-start: 1px solid var(--divider-color); padding-inline-start: 16px; }
    .live-summary-fact > ha-icon { grid-column: 1; grid-row: 1 / span 2; align-self: center; color: var(--primary-color); --mdc-icon-size: 24px; }
    .live-summary-fact dt, .live-summary-fact dd { grid-column: 2; overflow-wrap: anywhere; }
    .live-control { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 16px; color: var(--secondary-text-color); font-size: 12px; margin: 12px 0; }
    .live-grid { display: grid; grid-template-columns: minmax(0, 1fr); align-items: start; gap: 12px; }
    .live-room { container: live-room / inline-size; background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: var(--ha-card-border-radius, 12px); padding: 16px; min-width: 0; overflow-wrap: anywhere; }
    .live-room-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; margin-bottom: 6px; }
    .live-room-header .pill { flex-shrink: 0; }
    h3 { font-size: 16px; margin: 0; }
    .live-values { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 16px 0 8px; }
    .live-values div { display: grid; gap: 4px; }
    dt, .live-source { color: var(--secondary-text-color); font-size: 12px; }
    dd { margin: 0; font-size: 18px; font-weight: 600; }
    .heat { --live-demand-color: var(--warning-color, #ff9800); }
    .cool { --live-demand-color: var(--info-color, var(--primary-color)); }
    .live-room.cool.is-requesting .pill.warning { background: color-mix(in srgb, var(--live-demand-color) 22%, transparent); border-color: color-mix(in srgb, var(--live-demand-color) 60%, var(--divider-color)); }
    .live-axis { margin: 84px 44px 0; position: relative; height: 110px; }
    .live-axis.readings-staggered { margin-top: 132px; }
    .live-axis.staggered { height: 180px; }
    .live-track { position: relative; height: 12px; border-radius: 4px; background: color-mix(in srgb, var(--disabled-text-color, var(--secondary-text-color)) 30%, transparent); }
    .live-band { position: absolute; inset-block: 0; background-color: color-mix(in srgb, var(--primary-color) 10%, transparent); background-image: repeating-linear-gradient(135deg, color-mix(in srgb, var(--primary-color) 30%, transparent) 0 1px, transparent 1px 6px); border-block: 1px solid color-mix(in srgb, var(--primary-color) 28%, transparent); box-sizing: border-box; }
    .live-demand, .legend-request { position: absolute; inset-block: 0; overflow: hidden; color: var(--live-demand-color); }
    .live-demand::before, .legend-request::before { content: ""; position: absolute; top: 5px; height: 2px; inset-inline: 0; background: currentColor; }
    .live-demand::after, .legend-request::after { content: ""; position: absolute; top: 2px; height: 8px; width: min(6px, 100%); right: 0; background: currentColor; clip-path: polygon(0 0, 100% 50%, 0 100%); }
    .cool .live-demand::after, .cool .legend-request::after { right: auto; left: 0; clip-path: polygon(100% 0, 0 50%, 100% 100%); }
    .live-boundary { position: absolute; width: 2px; height: 22px; top: 50%; background: var(--primary-text-color); transform: translate(-50%, -50%); }
    .live-marker { position: absolute; width: 14px; height: 14px; top: -3px; border: 2px solid var(--primary-text-color); border-radius: 50%; background: var(--secondary-text-color); transform: translateX(-50%); }
    .is-requesting .live-marker { background: var(--live-demand-color); }
    .live-boundary.limit-secondary { background: var(--secondary-text-color); }
    .is-requesting .live-boundary.limit-primary { background: var(--live-demand-color); }
    .live-threshold.limit-secondary strong { color: var(--secondary-text-color); font-weight: 400; }
    .live-threshold.limit-primary strong { font-weight: 700; }
    .is-requesting .live-threshold.limit-primary small, .is-requesting .live-threshold.limit-primary strong { color: var(--live-demand-color); }
    .live-target { position: absolute; top: 50%; height: 30px; border-inline-start: 1px dashed var(--secondary-text-color); transform: translateY(-50%); }
    /* Avoid transformed label stacking contexts: every text mask must paint
       above every connector, including connectors from later sibling labels. */
    .live-threshold { display: grid; gap: 3px; position: absolute; top: 28px; width: 88px; margin-inline-start: -44px; text-align: center; line-height: 1.4; }
    .live-threshold.lower { top: 100px; }
    .live-threshold small, .live-threshold strong, .live-distance { position: relative; z-index: 1; background: var(--card-background-color); }
    .live-threshold small { color: var(--secondary-text-color); font-size: 11px; }
    .live-threshold strong { font-size: 13px; font-weight: 600; }
    .live-threshold::before { content: ""; position: absolute; z-index: 0; width: 1px; background: var(--secondary-text-color); height: 4px; top: -6px; left: 50%; }
    .live-threshold.lower::before { height: 76px; top: -78px; }
    .live-reading { top: -64px; }
    .live-reading.upper { top: -112px; }
    .live-reading strong { font-size: 15px; }
    .live-reading::before { top: auto; bottom: -22px; height: 18px; }
    .live-reading.upper::before { height: 66px; bottom: -70px; }
    .live-reading.target::before { background: none; border-inline-start: 1px dashed var(--secondary-text-color); }
    .live-distance { color: var(--secondary-text-color); font-size: 11px; }
    .live-help.external-controller-conditions { background: transparent; border: 0; margin: 0; padding: 0; }
    .live-help.external-controller-conditions > summary { display: inline-grid; grid-template-columns: 16px minmax(0, 1fr) 16px; max-width: 100%; box-sizing: border-box; min-height: 32px; padding: 4px 0; gap: 6px; color: var(--secondary-text-color); font-size: 12px; font-weight: 400; }
    .live-help > summary:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 4px; }
    .live-help > summary > span { min-width: 0; overflow-wrap: anywhere; }
    .live-help > summary > ha-icon { --mdc-icon-size: 16px; flex: 0 0 16px; }
    .live-help .external-controller-expand-icon { margin-inline-start: 0; }
    .live-help .external-controller-conditions-body { padding: 4px 0 12px; }
    .live-dialog .live-help p { font-size: 13px; margin: 6px 0; }
    .live-reference { margin-top: 8px; }
    @container live-room (min-width: 360px) {
      .live-axis.readings-staggered:not(.readings-near):not(.readings-tight) { margin-top: 84px; }
      .live-axis:not(.readings-near):not(.readings-tight) .live-reading.upper { top: -64px; }
      .live-axis:not(.readings-near):not(.readings-tight) .live-reading.upper::before { height: 18px; bottom: -22px; }
      .live-axis.staggered:not(.limits-near):not(.limits-tight) { height: 110px; }
      .live-axis:not(.limits-near):not(.limits-tight) .live-threshold.lower { top: 28px; }
      .live-axis:not(.limits-near):not(.limits-tight) .live-threshold.lower::before { height: 4px; top: -6px; }
    }
    @container live-room (min-width: 600px) {
      .live-axis.readings-staggered:not(.readings-tight) { margin-top: 84px; }
      .live-axis:not(.readings-tight) .live-reading.upper { top: -64px; }
      .live-axis:not(.readings-tight) .live-reading.upper::before { height: 18px; bottom: -22px; }
      .live-axis.staggered:not(.limits-tight) { height: 110px; }
      .live-axis:not(.limits-tight) .live-threshold.lower { top: 28px; }
      .live-axis:not(.limits-tight) .live-threshold.lower::before { height: 4px; top: -6px; }
    }
    .live-legend { display: flex; flex-wrap: wrap; gap: 8px 16px; color: var(--secondary-text-color); font-size: 12px; margin-block: 12px; }
    .live-legend span { display: inline-flex; align-items: center; gap: 6px; }
    .legend-current { width: 9px; height: 9px; border-radius: 50%; background: var(--secondary-text-color); }
    .legend-target { height: 16px; border-inline-start: 1px dashed var(--secondary-text-color); }
    .legend-band { width: 20px; height: 10px; background-color: color-mix(in srgb, var(--primary-color) 10%, transparent); background-image: repeating-linear-gradient(135deg, color-mix(in srgb, var(--primary-color) 42%, transparent) 0 1px, transparent 1px 4px); border-block: 1px solid color-mix(in srgb, var(--primary-color) 34%, transparent); box-sizing: border-box; }
    .legend-demand { display: inline-block; position: relative; width: 24px; height: 12px; }
    .live-reason { margin: 8px 0 12px; }
    .live-error { color: var(--error-color); }
    @container supply-live (max-width: 560px) {
      .live-room { padding: 12px; }
      .live-axis { margin-inline: 16px; }
      .live-summary { grid-template-columns: minmax(0, 1fr); padding: 10px 12px; gap: 8px; }
      .live-summary-fact { grid-template-columns: 18px minmax(0, 1fr) max-content; align-items: center; gap: 8px; }
      .live-summary-fact > ha-icon { grid-row: 1; --mdc-icon-size: 18px; }
      .live-summary-fact dt { grid-column: 2; }
      .live-summary-fact dd { grid-column: 3; font-size: 16px; }
      .live-summary-fact + .live-summary-fact { border-inline-start: 0; border-block-start: 1px solid var(--divider-color); padding-inline-start: 0; padding-block-start: 8px; }
    }
    @media (max-width: 560px) {
      .live-dialog.documentation-dialog { width: calc(100vw - 16px); max-width: calc(100vw - 16px); max-height: calc(100dvh - 16px); padding: 12px; }
      .live-room { padding: 12px; }
      .live-axis { margin-inline: 16px; }
      .live-help.external-controller-conditions > summary { min-height: 44px; }
      .live-summary { grid-template-columns: minmax(0, 1fr); padding: 10px 12px; gap: 8px; }
      .live-summary-fact { grid-template-columns: 18px minmax(0, 1fr) max-content; align-items: center; gap: 8px; }
      .live-summary-fact > ha-icon { grid-row: 1; --mdc-icon-size: 18px; }
      .live-summary-fact dt { grid-column: 2; }
      .live-summary-fact dd { grid-column: 3; font-size: 16px; }
      .live-summary-fact + .live-summary-fact { border-inline-start: 0; border-block-start: 1px solid var(--divider-color); padding-inline-start: 0; padding-block-start: 8px; }
    }
  `];

  connectedCallback(): void { super.connectedCallback(); this.requestUpdate(); }
  disconnectedCallback(): void { this._stopAlignment(); this._stop(); this._unlisten(); super.disconnectedCallback(); }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has("embedded")) { this._stopAlignment(); this._open = false; }
    if (!this._active) {
      if (this._open && !this.supply) this._dialog()?.close();
      if (!this.supply) this._open = false;
      if (this._connection || this._unsubscribe || this._status || this._clock) this._stop();
      this._unlisten();
      return;
    }
    if (this.hass?.connection !== this._connection || changed.has("embedded")) {
      this._unlisten();
      this._connection = this.hass?.connection;
      this._connection?.addEventListener?.("disconnected", this._onDisconnected);
      this._connection?.addEventListener?.("ready", this._onReady);
      void this._subscribe();
    } else if (changed.has("supply") && (changed.get("supply") as SharedSupply | undefined)?.id !== this.supply?.id) {
      void this._subscribe();
    }
  }

  private _dialog() { return this.shadowRoot?.querySelector<HTMLDialogElement>("dialog"); }
  private _unlisten() {
    this._connection?.removeEventListener?.("disconnected", this._onDisconnected);
    this._connection?.removeEventListener?.("ready", this._onReady);
    this._connection = undefined;
  }
  private _stop() {
    clearTimeout(this._clock);
    this._clock = undefined;
    ++this._generation;
    const unsubscribe = this._unsubscribe;
    this._unsubscribe = undefined;
    this._status = undefined;
    if (unsubscribe) void Promise.resolve().then(unsubscribe).catch(() => undefined);
  }
  private async _subscribe() {
    this._stop();
    const supplyId = this.supply?.id;
    if (!supplyId || !this._active) return;
    const generation = this._generation;
    this._phase = "loading";
    if (!this.hass) { this._phase = "disconnected"; return; }
    try {
      const unsubscribe = await new VelairApiClient(this.hass).subscribeSharedDemand(message => {
        if (generation !== this._generation || !this._active || this.supply?.id !== supplyId) return;
        this._status = message.loaded ? message.shared_demand?.[supplyId] : undefined;
        this._phase = this._status ? "live" : "unavailable";
        this._refreshClock();
      });
      if (generation !== this._generation || !this._active || this.supply?.id !== supplyId) {
        await unsubscribe();
      } else this._unsubscribe = unsubscribe;
    } catch { if (generation === this._generation && this._active) { this._status = undefined; this._phase = "error"; } }
  }
  private _show() {
    this._phase = "loading";
    this._open = true;
    const dialog = this._dialog();
    dialog?.showModal();
    this._stopAlignment();
    if (dialog) this._alignmentCleanup = observePanelDialogAlignment(dialog, this, "live-dialog");
  }
  private _stopAlignment() {
    this._alignmentCleanup?.();
    this._alignmentCleanup = undefined;
  }
  private _closed() {
    this._open = false;
    this._stopAlignment();
    this._stop();
    this._unlisten();
    this.shadowRoot?.querySelector<HTMLButtonElement>("[data-live-trigger]")?.focus();
  }
  private _backdrop(event: MouseEvent) {
    if (event.target !== event.currentTarget) return;
    const dialog = event.currentTarget as HTMLDialogElement;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }
  private _t(key: TranslationKey, values?: Record<string, string | number>) { return this.host!._t(key, values); }
  private _temperature(value?: number, unit?: string) {
    return typeof value === "number" && Number.isFinite(value) && unit
      ? `${new Intl.NumberFormat(this.hass?.locale?.language ?? this.hass?.language, { maximumFractionDigits: 2 }).format(value)} ${unit}` : "—";
  }
  private _offset(value: number, target: number, unit: string) {
    const difference = Number((value - target).toPrecision(12));
    return difference === 0 ? this._t("sharedDemandLiveAtTarget", { distance: this._temperature(0, unit) })
      : this._t(difference < 0 ? "sharedDemandLiveBelowTarget" : "sharedDemandLiveAboveTarget", { distance: this._temperature(Math.abs(difference), unit) });
  }
  private _compactOffset(value: number, target: number, unit: string) {
    const difference = Number((value - target).toPrecision(12));
    return difference === 0 ? this._t("sharedDemandLiveAtTargetShort")
      : this._t("sharedDemandLiveTargetOffset", { offset: `${difference > 0 ? "+" : ""}${this._temperature(difference, unit)}` });
  }
  private _hysteresisQuestion(id: string) {
    const unit = this.supplyTemperatureUnit ?? this.hass?.config?.unit_system?.temperature;
    const start = this.supply!.zones[id]?.hysteresis ?? this.supply!.hysteresis;
    return unit && this.supply!.hysteresis_mode !== "custom"
      ? this._t("sharedDemandLiveWhyHysteresisValue", { distance: this._temperature(start, unit) })
      : this._t("sharedDemandLiveWhyHysteresis");
  }
  private _inactiveSupplyLimits(id: string) {
    const supply = this.supply!;
    const unit = this.supplyTemperatureUnit ?? this.hass?.config?.unit_system?.temperature;
    if (!unit) return nothing;
    const start = supply.zones[id]?.hysteresis ?? supply.hysteresis;
    const stop = supply.hysteresis_mode === "symmetric" ? start
      : supply.hysteresis_mode === "custom" ? supply.zones[id]?.hysteresis_stop ?? supply.hysteresis_stop ?? 0 : 0;
    return html` ${this._t("sharedDemandLiveInactiveSupply", { start: this._temperature(start, unit), stop: this._temperature(stop, unit) })}`;
  }
  private _groupLabel() {
    if (this._status?.status === "suspended") return this._t(this._status.suspension_reason === "external_off"
      ? "sharedDemandExternalOffPaused" : "sharedDemandPaused");
    const keys: Record<string, TranslationKey> = { disabled: "sharedDemandDisabled", suspended: "sharedDemandExternalOffPaused", invalid_output: "sharedDemandInvalidOutput", suspension_persistence_failed: "sharedDemandSuspensionSaveFailed", temperature_migration_blocked: "sharedDemandMigrationBlocked", unavailable: "sharedDemandOutputUnavailable", on_delay: "sharedDemandWaitingOnDelay", minimum_off: "sharedDemandWaitingMinimumOff", off_delay: "sharedDemandWaitingOffDelay", delivery_failed: "sharedDemandDeliveryFailed", demand: "sharedDemandDemand", idle: "sharedDemandNoDemand" };
    return this._t(keys[this._status?.status ?? ""] ?? "sharedDemandUnknown");
  }
  private _waitingDeadline() {
    if (!["on_delay", "minimum_off", "off_delay"].includes(this._status?.status ?? "")) return undefined;
    const deadline = this._status?.pending_until ? Date.parse(this._status.pending_until) : NaN;
    return Number.isFinite(deadline) ? deadline : undefined;
  }
  /** Local countdown only: backend snapshots alone determine control and demand. */
  private _refreshClock() {
    clearTimeout(this._clock);
    this._clock = undefined;
    this._now = Date.now();
    const deadline = this._waitingDeadline();
    if (this._active && deadline !== undefined && deadline > this._now) {
      this._clock = setTimeout(() => this._refreshClock(), Math.min(1000, deadline - this._now));
    }
  }
  private _waitLabel() {
    const deadline = this._waitingDeadline();
    if (deadline === undefined) return nothing;
    const seconds = Math.ceil((deadline - this._now) / 1000);
    const key = this._status?.status === "on_delay" ? "sharedDemandLiveOnDelay"
      : this._status?.status === "minimum_off" ? "sharedDemandLiveMinimumOff" : "sharedDemandLiveOffDelay";
    return html`<span class="live-countdown">${seconds > 0 ? this._t(key, { seconds }) : this._t("sharedDemandLiveAwaitingUpdate")}</span>`;
  }
  private _reason(zone: SharedDemandZoneStatus) {
    const reasons: Record<string, TranslationKey> = { disabled: "sharedDemandLiveDisabled", suspended: "sharedDemandLiveSuspended", off: "sharedDemandLiveOff", incompatible_mode: "sharedDemandLiveIncompatible", unavailable: "sharedDemandLiveMissing", missing_temperature: "sharedDemandLiveMissing", ambiguous_target: "sharedDemandLiveAmbiguous", unmanaged: "sharedDemandLiveUnmanaged", invalid_hysteresis: "sharedDemandLiveInvalid" };
    if (zone.reason) return this._t(reasons[zone.reason] ?? "sharedDemandLiveUnknown");
    if (zone.demand == null) return this._t("sharedDemandLiveUnknown");
    if (zone.start_temperature === undefined || zone.stop_temperature === undefined || !zone.temperature_unit) return this._t("sharedDemandLiveNoData");
    if (zone.start_temperature === zone.stop_temperature) return this._t("sharedDemandLiveCoincident");
    return this._t(zone.demand ? "sharedDemandLiveHold" : this.supply!.direction === "cool" ? "sharedDemandLiveWaitCool" : "sharedDemandLiveWaitHeat", { temperature: this._temperature(zone.demand ? zone.stop_temperature : zone.start_temperature, zone.temperature_unit) });
  }
  private _room(id: string) {
    const zone = this._status?.zones?.[id] ?? { reason: this._status?.status };
    const cooling = this.supply!.direction === "cool";
    const current = zone.temperature, target = zone.target, start = zone.start_temperature, stop = zone.stop_temperature;
    const graph = [current, target, start, stop].every(value => typeof value === "number" && Number.isFinite(value)) && Boolean(zone.temperature_unit);
    const low = graph ? Math.min(current!, target!, start!, stop!) : 0;
    const high = graph ? Math.max(current!, target!, start!, stop!) : 1;
    const padding = Math.max((high - low) * .2, .25);
    const position = (value: number) => 100 * (value - low + padding) / (high - low + padding * 2);
    const coincident = start === stop;
    // Keep 88px labels apart even on the smallest supported mobile axis.
    // Both label pairs retain their true positions, using a second row when close.
    const staggered = graph && !coincident && Math.abs(position(start!) - position(stop!)) < 70;
    const readingsStaggered = graph && Math.abs(position(current!) - position(target!)) < 70;
    // Wider cards can share label rows without changing any temperature position.
    const density = (name: string, gap: number) => gap < 20 ? `${name}-tight` : gap < 35 ? `${name}-near` : "";
    // Labels explain the committed backend state; temperatures only distinguish
    // the initiation side from the retained band, never infer demand.
    const active = zone.demand === true;
    const idle = zone.demand === false;
    const retained = active && !coincident && (cooling ? current! < start! : current! > start!);
    const startLabel: TranslationKey = idle ? "sharedDemandLiveStartsAt" : retained ? "sharedDemandLiveRestartsAt" : cooling ? "sharedDemandLiveUpperLimit" : "sharedDemandLiveLowerLimit";
    const stopLabel: TranslationKey = active ? "sharedDemandLiveStopsAt" : cooling ? "sharedDemandLiveLowerLimit" : "sharedDemandLiveUpperLimit";
    const importance = (isStart: boolean) => (isStart ? idle : active) ? "limit-primary" : "limit-secondary";
    const boundary = (value: number, label: TranslationKey, isStart: boolean, lower = false) => html`<span class=${`live-threshold ${importance(isStart)}${lower ? " lower" : ""}`} style=${`left:${position(value)}%`}><small>${this._t(label)}</small><strong>${this._temperature(value, zone.temperature_unit)}</strong><span class="live-distance" aria-label=${this._offset(value, target!, zone.temperature_unit!)}>${this._compactOffset(value, target!, zone.temperature_unit!)}</span></span>`;
    // A late backend state can briefly retain demand at/past Stop. Do not draw
    // a request backwards: the current point remains accented, with no segment.
    const requestDistance = graph ? (cooling ? position(current!) - position(stop!) : position(stop!) - position(current!)) : 0;
    const request = zone.demand === true ? "sharedDemandLiveRequest" : zone.demand === false ? "sharedDemandLiveNoRequest" : "sharedDemandUnknown";
    return html`<article class=${`live-room ${cooling ? "cool" : "heat"}${active ? " is-requesting" : ""}`} data-live-zone=${id}>
      <header class="live-room-header"><h3>${this.host!._friendlyEntityName(id)}</h3><span class=${zone.demand ? "pill warning" : "pill"}>${this._t(request)}</span></header>
      <div class="live-source">${id} · ${this._t(zone.demand == null ? "sharedDemandLiveObserved" : zone.source === "room_assist" ? "sharedDemandLiveAssist" : zone.source === "estimated" ? "sharedDemandLiveEstimated" : "sharedDemandUnknown")}</div>
      ${graph ? html`<div class=${`live-axis${staggered ? " staggered" : ""}${readingsStaggered ? " readings-staggered" : ""} ${density("readings", Math.abs(position(current!) - position(target!)))} ${density("limits", Math.abs(position(start!) - position(stop!)))}`}>
        <span class="live-threshold live-reading current" style=${`left:${position(current!)}%`}><small>${this._t("sharedDemandLiveCurrent")}</small><strong>${this._temperature(current, zone.temperature_unit)}</strong></span>
        <span class=${`live-threshold live-reading target${readingsStaggered ? " upper" : ""}`} style=${`left:${position(target!)}%`}><small>${this._t("sharedDemandLiveTarget")}</small><strong>${this._temperature(target, zone.temperature_unit)}</strong></span>
        <div class="live-track" aria-hidden="true">
          <span class="live-band" style=${`left:${position(Math.min(start!, stop!))}%;width:${Math.abs(position(stop!) - position(start!))}%`}></span>
          ${target !== start && target !== stop ? html`<span class="live-target" style=${`left:${position(target!)}%`}></span>` : nothing}
          ${active && requestDistance > 0 ? html`<span class="live-demand" style=${`left:${Math.min(position(current!), position(stop!))}%;width:${requestDistance}%`}></span>` : nothing}
          <span class=${`live-boundary ${coincident ? active || idle ? "limit-primary" : "limit-secondary" : importance(true)}`} style=${`left:${position(start!)}%`}></span>${!coincident ? html`<span class=${`live-boundary ${importance(false)}`} style=${`left:${position(stop!)}%`}></span>` : nothing}
          <span class="live-marker" style=${`left:${position(current!)}%`}></span>
        </div>
        ${coincident ? boundary(start!, active ? "sharedDemandLiveStopsAt" : idle ? "sharedDemandLiveStartsAt" : "sharedDemandLiveSwitchingThreshold", !active)
          : html`${boundary(Math.min(start!, stop!), cooling ? stopLabel : startLabel, !cooling)}${boundary(Math.max(start!, stop!), cooling ? startLabel : stopLabel, cooling, staggered)}`}
      </div>
      ${zone.source === "room_assist" ? html`<details class="external-controller-conditions live-help">
        <summary><ha-icon icon="mdi:help-circle-outline" aria-hidden="true"></ha-icon><span>${this._hysteresisQuestion(id)}</span><ha-icon class="external-controller-expand-icon" icon="mdi:chevron-down" aria-hidden="true"></ha-icon></summary>
        <div class="external-controller-conditions-body"><p>${this._t("sharedDemandLiveAssistPriority")}</p><p>${this._t("sharedDemandLiveAssistExplanation")}</p><p>${this._inactiveSupplyLimits(id)}</p><p>${this._t("sharedDemandLiveAssistModes")}</p></div>
      </details>` : nothing}` : html`<dl class="live-values"><div><dt>${this._t("sharedDemandLiveCurrent")}</dt><dd>${this._temperature(current, zone.temperature_unit)}</dd></div><div><dt>${this._t("sharedDemandLiveTarget")}</dt><dd>${this._temperature(target, zone.temperature_unit)}</dd></div></dl><p class="live-reason">${this._reason(zone)}</p>`}
      ${zone.sensor_entity_id && zone.sensor_entity_id !== id ? html`<div class="live-source live-reference">${this._t("sharedDemandLiveSensor", { sensor: this.host!._friendlyEntityName(zone.sensor_entity_id) })}</div>` : nothing}
    </article>`;
  }
  private _renderConnection() {
    if (!this._visible("connection") && this._phase === "live") return nothing;
    const phases: Record<typeof this._phase, TranslationKey> = { loading: "sharedDemandLiveLoading", live: "sharedDemandLiveConnected", error: "sharedDemandLiveError", disconnected: "sharedDemandLiveDisconnected", unavailable: "sharedDemandLiveNoData" };
    return html`<div class=${`live-meta${this._phase === "live" ? " is-live" : ""}`} role="status">${this._phase === "live" ? html`<span class="live-dot" aria-hidden="true"></span>` : nothing}<span class=${this._phase === "error" ? "live-error" : ""}>${this._t(phases[this._phase])}</span>${this._phase === "error" || this._phase === "unavailable" ? html`<button type="button" class="command-button" @click=${() => this._subscribe()}>${this._t("sharedDemandLiveRetry")}</button>` : nothing}</div>`;
  }
  private _renderContent() {
    const output = this._status?.output_state;
    const ids = Object.keys(this.supply!.zones);
    const requesting = ids.filter(id => this._status?.zones?.[id]?.demand === true).length;
    const total = ids.length;
    const unknown = ids.filter(id => this._status?.zones?.[id]?.demand == null).length;
    const showSwitch = this._visible("switchState"), showCount = this._visible("roomCount");
    const showDescription = this._visible("demandDescription") || !["demand", "idle"].includes(this._status?.status ?? "");
    const unknownOutput = output !== "on" && output !== "off";
    const showControl = showDescription || unknownOutput || unknown > 0 || Boolean(this._waitingDeadline());
    return html`
        ${this._visible("header") ? html`<header class="documentation-dialog-header"><div class="live-heading"><h2>${this.embedded && this.heading ? this.heading : this._t("sharedDemandLive")}</h2>${this._renderConnection()}</div>${!this.embedded ? html`<button class="documentation-close" type="button" autofocus aria-label=${this._t("close")} @click=${() => this._dialog()?.close()}><ha-icon icon="mdi:close" aria-hidden="true"></ha-icon></button>` : nothing}</header>
        <div class="live-subtitle">${this.supply!.name} · ${this._t(this.supply!.direction === "cool" ? "sharedDemandCool" : "sharedDemandHeat")}</div>` : this._renderConnection()}
        ${this.unsaved ? html`<p class="subtle">${this._t("sharedDemandLiveSaved")}</p>` : nothing}
        ${this._status ? html`${showSwitch || showCount ? html`<div class=${`live-summary${showSwitch !== showCount ? " one-fact" : ""}`}>
          ${showSwitch ? html`<dl class="live-summary-fact"><ha-icon icon="mdi:power" aria-hidden="true"></ha-icon><dt>${this._t("sharedDemandSwitchState")}</dt><dd>${this._t(output === "on" ? "sharedDemandOn" : output === "off" ? "sharedDemandOff" : output === "unavailable" ? "sharedDemandUnavailable" : "sharedDemandUnknown")}</dd></dl>` : nothing}
          ${showCount ? html`<dl class="live-summary-fact"><ha-icon icon="mdi:home-thermometer-outline" aria-hidden="true"></ha-icon><dt>${this._t("sharedDemandLiveRoomDemand")}</dt><dd>${this._t(unknown === total && total > 0 ? "sharedDemandUnknown" : unknown > 0 ? "sharedDemandLiveRoomRatioUnknown" : "sharedDemandLiveRoomRatio", { count: requesting, total, unknown })}</dd></dl>` : nothing}
        </div>` : nothing}
          ${showControl ? html`<div class="live-control" role="status">${showDescription ? html`<span>${this._groupLabel()}</span>` : nothing}${unknownOutput ? html`<span>${this._t(output === "unavailable" ? "sharedDemandOutputUnavailable" : "sharedDemandUnknown")}</span>` : nothing}${unknown > 0 && !showCount ? html`<span>${this._t("sharedDemandLiveRoomRatioUnknown", { count: requesting, total, unknown })}</span>` : nothing}${this._waitLabel()}</div>` : nothing}
          ${this._visible("legend") ? html`<div class="live-legend" aria-label=${this._t("sharedDemandLiveBand")}><span><i class="legend-current" aria-hidden="true"></i>${this._t("sharedDemandLiveCurrentLegend")}</span><span><i class="legend-target" aria-hidden="true"></i>${this._t("sharedDemandLiveTargetLegend")}</span><span><i class="legend-band" aria-hidden="true"></i>${this._t("sharedDemandLiveBand")}</span><span><i class="legend-demand" aria-hidden="true"><i class="legend-request" style="left:0;width:100%"></i></i>${this._t("sharedDemandLiveActiveRequest")}</span></div>` : nothing}
          <div class="live-grid">${ids.map(id => this._room(id))}</div>` : nothing}`;
  }
  render() {
    if (!this.host || !this.supply) return nothing;
    if (this.embedded) return html`<section class=${`live-embedded ${this.supply.direction}`} aria-label=${`${this._t("sharedDemandLive")}: ${this.supply.name}`}>${this._renderContent()}</section>`;
    return html`<div class="live-trigger"><button type="button" class="command-button" data-live-trigger aria-haspopup="dialog" @click=${this._show}><ha-icon icon="mdi:chart-timeline-variant" aria-hidden="true"></ha-icon><span>${this._t("sharedDemandLive")}</span></button></div>
      <dialog class=${`documentation-dialog live-dialog ${this.supply.direction}`} aria-label=${`${this._t("sharedDemandLive")}: ${this.supply.name}`} @close=${this._closed} @click=${this._backdrop}>${this._renderContent()}</dialog>`;
  }
}
if (!customElements.get("velair-shared-demand-live")) customElements.define("velair-shared-demand-live", VelairSharedDemandLive);
