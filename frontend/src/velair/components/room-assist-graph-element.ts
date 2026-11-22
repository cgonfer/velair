import { LitElement, css, html, nothing, svg, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { appliedAssistRange, roomAssistDeadbandZone, scheduledAssistRange } from "../domain/room-assist";
import { controlUnitId, controlUnitState } from "../domain/control-units";
import { formatTemperatureRange } from "../domain/formatters";
import { layoutRoomAssistChips, roomAssistGraphDomain, roomAssistRailLabelPlacement } from "../domain/room-assist-graph";
import type { VelairViewHost } from "../host-types";
import type { PreconditioningSettings, RoomSensorAssistStatus } from "../types";
import type { TranslationKey } from "../translations";
import { inlineHelpStyles } from "../styles/inline-help-styles";
import { dismissInlineHelpWithin, inlineHelpAnchorHandlers, renderInlineHelp, renderInlineHelpTooltip } from "../views/inline-help";

type Value = number | [number, number];
type Role = { id: string; label: string; value: Value; color: string; help: TranslationKey };
type Rail = { id: string; from: number; to: number; y: number; text: string; color: string; arrow?: boolean; wait?: boolean; brake?: boolean; info?: string; hidden?: boolean };
type Intent = NonNullable<RoomSensorAssistStatus["control_intent"]>;
const values = (value: Value) => typeof value === "number" ? [value] : value;
const center = (value: Value) => values(value).reduce((sum, item) => sum + item, 0) / values(value).length;
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Presentation only. Never advances a phase or sends an action while rendering. */
export class VelairRoomAssistGraph extends LitElement {
  @property({ attribute: false }) host?: VelairViewHost;
  @property({ attribute: false }) status?: RoomSensorAssistStatus;
  @property({ attribute: false }) settings?: PreconditioningSettings;
  @property() entityId = "";
  @property() language = "";
  @property({ type: Boolean }) showDeadband = true;
  @state() private detailed = false;
  @state() private detailView: "explanation" | "data" | null = null;
  @state() private width = 800;
  @state() private sizes: Record<string, { width: number; height: number }> = {};
  private observer?: ResizeObserver;
  private measureFrame?: number;

  static styles = [inlineHelpStyles, css`
    :host { display:block; min-width:0; color:var(--primary-text-color); font:inherit; --ra-room:var(--success-color,#43864a); --ra-target:var(--error-color,#ba5047); --ra-applied:var(--primary-color,#148cac); --ra-muted:var(--secondary-text-color,#666); --ra-adjust:var(--success-color,#5c9064); --ra-paper:var(--card-background-color,#fff); --ra-fill:var(--secondary-background-color,#eee); --ra-rule:var(--divider-color,#ccc); }
    :host { container-type:inline-size; --ra-compact-height:24px; --ra-compact-line-height:16px; }
    * { box-sizing:border-box; }
    .graph { min-width:0; border:1px solid var(--ra-rule); border-radius:8px; padding:10px 12px; background:var(--ra-fill); }
    .toolbar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px 8px; margin-bottom:12px; }
    .status { display:flex; flex-wrap:wrap; gap:6px; font-size:11px; min-width:0; }
    .status span { border:1px solid var(--ra-rule); border-radius:14px; padding:3px 8px; min-height:var(--ra-compact-height); line-height:var(--ra-compact-line-height); }
    .status .extra { color:var(--ra-applied); border-color:color-mix(in srgb,var(--ra-applied) 40%,var(--ra-rule)); }
    .modes { display:inline-flex; height:var(--ra-compact-height); margin-inline-start:auto; gap:1px; padding:1px; border:1px solid var(--ra-rule); border-radius:5px; background:var(--ra-paper); }
    button { font:inherit; color:inherit; cursor:pointer; }
    .modes button { position:relative; display:inline-flex; align-items:center; justify-content:center; height:calc(var(--ra-compact-height) - 4px); min-height:calc(var(--ra-compact-height) - 4px); font-size:11px; line-height:var(--ra-compact-line-height); white-space:nowrap; border:0; border-radius:3px; padding:0 8px; background:transparent; color:var(--ra-muted); }
    .modes button[aria-pressed=true] { color:var(--primary-color); background:color-mix(in srgb,var(--primary-color) 12%,var(--ra-paper)); }
    .canvas { position:relative; min-width:0; isolation:isolate; }
    .canvas:has(.inline-help-tooltip.visible) { z-index:3; }
    .canvas>svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none; }
    .tag { position:absolute; z-index:2; }
    .tag:has(.inline-help-tooltip.visible),.rail-label:has(.inline-help-tooltip.visible) { z-index:3; }
    .chip { position:relative; display:flex; align-items:center; gap:5px; white-space:nowrap; border:1px solid color-mix(in srgb,var(--family) 35%,var(--ra-rule)); border-left:3px solid var(--family); background:var(--ra-paper); border-radius:6px; padding:0 6px; height:var(--ra-compact-height); min-height:var(--ra-compact-height); font-size:11px; line-height:var(--ra-compact-line-height); max-width:100%; }
    .chip strong { font-size:12px; font-weight:600; }
    .chip small { font-size:10px; color:var(--ra-muted); }
    .rail-label { position:absolute; z-index:1; max-width:100%; white-space:normal; padding:0 4px; font-size:11px; line-height:18px; text-align:center; color:var(--rail-color); background:var(--ra-fill); border:1px solid transparent; border-radius:12px; }
    .rail-text { display:inline-block; }
    .rail-label.inline { white-space:nowrap; border-color:var(--rail-color); padding:2px 8px; background:color-mix(in srgb,var(--ra-paper) 32%,var(--ra-fill)); }
    .rail-label.control { color:var(--ra-muted); }
    .rail-label.control.inline { border-color:color-mix(in srgb,var(--rail-color) 28%,var(--ra-rule)); background:color-mix(in srgb,var(--ra-paper) 65%,var(--ra-fill)); }
    .rail-label .inline-help-wrapper { vertical-align:middle; }
    .rail-label .inline-help { width:20px; height:20px; min-width:20px; }
    .rail-label .inline-help ha-icon { --mdc-icon-size:14px; }
    .legend { display:flex; gap:5px; align-items:center; flex-wrap:wrap; font-size:11px; line-height:18px; color:var(--ra-muted); margin-top:6px; }
    .hatch-key { width:20px; height:8px; background:repeating-linear-gradient(135deg,transparent 0 3px,color-mix(in srgb,var(--primary-color) 45%,transparent) 3px 4px); border-bottom:1px solid var(--primary-color); }
    .explanation { padding:8px 2px 2px; font-size:13px; line-height:1.5; }
    .detail-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:4px; }
    .detail-toggle { display:inline-flex; align-items:center; justify-content:center; gap:7px; color:var(--ra-muted); background:transparent; border:0; border-radius:8px; padding:8px 10px; font-size:12px; line-height:20px; min-height:36px; }
    .detail-toggle:hover { color:var(--primary-text-color); background:color-mix(in srgb,var(--primary-text-color) 4%,transparent); }
    .detail-toggle[aria-expanded=true] { color:var(--primary-text-color); background:color-mix(in srgb,var(--primary-text-color) 6%,transparent); }
    .detail-icon,.data-chevron { display:inline-flex; align-items:center; justify-content:center; line-height:0; }
    .detail-icon { flex:0 0 18px; width:18px; height:18px; --mdc-icon-size:18px; }
    .data-chevron { flex:0 0 16px; width:16px; height:16px; --mdc-icon-size:16px; }
    .detail-toggle[aria-expanded=true] .data-chevron { transform:rotate(180deg); }
    .detail-panel { border-top:1px solid var(--ra-rule); padding-top:16px; margin-top:12px; }
    [hidden] { display:none!important; }
    .human-explanation { max-width:76ch; }
    .human-explanation p { margin:0; }
    .human-explanation p+p { margin-top:10px; }
    .data { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px 28px; }
    .data section { min-width:0; }
    h4 { font-size:13px; font-weight:600; margin:0 0 10px; }
    dl { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(0,1fr); gap:8px 16px; margin:0; font-size:12px; }
    dt { color:var(--ra-muted); }
    dd { margin:0; text-align:end; overflow-wrap:anywhere; font-variant-numeric:tabular-nums; }
    .data-reference { color:var(--ra-muted); font-size:12px; margin:12px 0 8px; }
    .data-origin { grid-column:1/-1; border-top:1px solid var(--ra-rule); padding-top:16px; }
    .data-origin-fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px 28px; }
    .data-origin-fields dl { grid-template-columns:1fr; gap:4px; }
    .data-origin-fields dd { text-align:start; }
    .data-origin code { font:inherit; font-family:var(--code-font-family,monospace); overflow-wrap:anywhere; }
    button:focus-visible { outline:2px solid var(--primary-color); outline-offset:2px; }
    @container(max-width:650px) { .data,.data-origin-fields { grid-template-columns:1fr; } }
    @media(max-width:650px) { .data,.data-origin-fields { grid-template-columns:1fr; } .detail-actions { justify-content:flex-start; } .detail-toggle { gap:5px; padding-inline:6px; } .detail-icon { flex-basis:16px; width:16px; height:16px; --mdc-icon-size:16px; } .data-chevron { flex-basis:14px; width:14px; height:14px; --mdc-icon-size:14px; } }
    @media(pointer:coarse) { .detail-toggle { min-height:44px; } .modes button::before { content:""; position:absolute; inset:-12px 0; } .chip::before { content:""; position:absolute; inset:-5px -1px; } }
  `];

  connectedCallback() {
    super.connectedCallback();
    if (typeof ResizeObserver !== "undefined") {
      this.observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width;
        if (width && Math.abs(width - this.width) > .5) this.width = width;
      });
    }
    void this.updateComplete.then(() => {
      if (this.isConnected) {
        const canvas = this.renderRoot.querySelector(".canvas");
        if (canvas) this.observer?.observe(canvas);
        this.requestUpdate();
      }
    });
    if (typeof document.fonts?.ready?.then === "function") void document.fonts.ready.then(() => { if (this.isConnected) this.requestUpdate(); });
  }

  protected firstUpdated() {
    const canvas = this.renderRoot.querySelector(".canvas");
    if (canvas) this.observer?.observe(canvas);
  }

  protected updated(changed: PropertyValues) {
    if (changed.has("status") || changed.has("entityId")) dismissInlineHelpWithin(this);
    if (changed.has("entityId")) this.detailView = null;
    if (changed.has("status")) {
      const canvas = this.renderRoot.querySelector(".canvas");
      if (canvas) this.observer?.observe(canvas);
    }
    if (this.measureFrame !== undefined) return;
    this.measureFrame = requestAnimationFrame(() => {
      this.measureFrame = undefined;
      const next: typeof this.sizes = {};
      for (const item of this.renderRoot.querySelectorAll<HTMLElement>("[data-measure]")) {
        const bounds = item.getBoundingClientRect();
        const text = item.querySelector<HTMLElement>(".rail-text");
        next[item.dataset.measure!] = text ? { width: Math.ceil(Math.min(this.width - 8, text.getBoundingClientRect().width + (item.querySelector(".inline-help-wrapper") ? 24 : 0) + 20)), height: Math.ceil(bounds.height) } : { width: Math.ceil(bounds.width), height: Math.ceil(bounds.height) };
      }
      if (JSON.stringify(next) !== JSON.stringify(this.sizes)) this.sizes = next;
    });
  }

  disconnectedCallback() {
    this.observer?.disconnect();
    if (this.measureFrame !== undefined) cancelAnimationFrame(this.measureFrame);
    this.measureFrame = undefined;
    dismissInlineHelpWithin(this);
    super.disconnectedCallback();
  }

  private t(key: TranslationKey, params?: Record<string, string>) { return this.host!._t(key, params); }
  private format(value: number) { return this.host!._formatTemperature(value, this.entityId); }
  private formatValue(value: Value) { return typeof value === "number" ? this.format(value) : formatTemperatureRange(value[0], value[1], this.host!._temperatureUnit(this.entityId)); }
  private signed(value: number) { return `${value > 0 ? "+" : value < 0 ? "−" : ""}${this.format(Math.abs(value))}`; }

  protected render() {
    if (!this.host || !this.status) return nothing;
    const s = this.status;
    const intent = s.control_intent;
    const valid = intent?.valid === true;
    const direction = valid ? intent.direction : null;
    const threshold = direction ? intent?.thresholds?.[direction] : undefined;
    const demand = valid ? intent.demand : null;
    const prep = valid && intent.source === "preconditioning";
    const next = threshold && demand !== null ? demand ? threshold.stop_temperature : threshold.start_temperature : undefined;
    const scheduled = scheduledAssistRange(s);
    const applied = appliedAssistRange(s);
    const nativeRange = Boolean(scheduled && !s.target_boundary);
    const margin = this.showDeadband ? roomAssistDeadbandZone(s, this.settings?.room_sensor_assist_deadband ?? 0) : undefined;
    const offset = s.preconditioning_offset;
    const braking = s.braking;
    const evidence = s.reference_setpoint ?? s;
    const equipmentStep = finite(evidence.target_temp_step) ? evidence.target_temp_step
      : this.host._entityTemperatureStep?.(controlUnitId(this.host._data, this.entityId));
    const brakeStop = valid && !prep && braking?.effective_level !== "default" && !braking?.reason && finite(braking?.stop_temperature);
    // A guard must have actually intervened; equality with a bound is not evidence.
    const guardEffect = valid && !prep && braking?.active && !braking.reason && Boolean(evidence.scheduled_target_guard)
      && finite(evidence.calculated_temperature) && finite(evidence.applied_temperature) && finite(braking.setpoint_bound)
      && (evidence.scheduled_target_guard === "heating_ceiling" ? evidence.calculated_temperature > braking.setpoint_bound : evidence.calculated_temperature < braking.setpoint_bound)
      && !s.limited_by && Math.abs(evidence.applied_temperature - evidence.calculated_temperature) > .000001
      && (!s.reference_setpoint || Math.abs(s.reference_setpoint.applied_temperature - s.reference_setpoint.requested_temperature) < .000001);
    const roles: Role[] = [];
    const add = (id: string, label: TranslationKey, value: Value | undefined, color: string, help: TranslationKey) => {
      if (value !== undefined && values(value).every(finite)) roles.push({ id, label: this.t(label), value, color, help });
    };
    add("room", "raGraphRoom", finite(s.room_temperature) ? s.room_temperature : undefined, "var(--ra-room)", "raGraphRoomHelp");
    add("target", "raGraphTarget", scheduled ? [scheduled.low, scheduled.high] : finite(s.target_temperature) ? s.target_temperature : undefined, "var(--ra-target)", "raGraphTargetHelp");
    add("equipment", "raGraphEquipment", finite(s.climate_temperature) ? s.climate_temperature : undefined, "var(--ra-muted)", "raGraphEquipmentHelp");
    const accepted = s.status === "assisting" || s.status === "holding";
    const scalarApplied = accepted ? finite(s.applied_temperature) ? s.applied_temperature : s.climate_target_temperature : finite(s.climate_target_temperature) ? s.climate_target_temperature : s.applied_temperature;
    add("setpoint", "raGraphSetpoint", applied ? [applied.low, applied.high] : finite(scalarApplied) ? scalarApplied : undefined, "var(--ra-applied)", valid ? "raGraphSetpointHelp" : "raGraphPendingHelp");
    if (!roles.length) return nothing;
    const physicalSide = s.limited_by ?? (offset?.limited_by === "maximum" || offset?.limited_by === "minimum" ? offset.limited_by : undefined);
    const attrs = controlUnitState(this.host._data, this.host.hass, controlUnitId(this.host._data, this.entityId))?.attributes;
    const physicalValue = finite(s.limit_temperature) ? s.limit_temperature : physicalSide === "maximum" ? attrs?.max_temp : physicalSide === "minimum" ? attrs?.min_temp : undefined;
    const temperatures = roles.flatMap((role) => values(role.value));
    if (margin) temperatures.push(margin.low, margin.high);
    if (finite(next)) temperatures.push(next);
    if (finite(physicalValue)) temperatures.push(physicalValue);
    const domain = roomAssistGraphDomain(temperatures);
    const width = Math.max(200, this.width);
    const x = (value: number) => 14 + (value - domain.low) / (domain.high - domain.low) * (width - 28);
    const layout = layoutRoomAssistChips(roles.map((role) => ({ id: role.id, x: x(center(role.value)), width: this.sizes[role.id]?.width ?? 135, height: this.sizes[role.id]?.height ?? 24, below: role.id === "setpoint" && Array.isArray(role.value) })), width);
    const axis = layout.axis;
    const rails: Rail[] = [];
    const color = "color-mix(in srgb,var(--primary-color,#148cac) 25%,var(--ra-muted))";
    const expectedTravel = direction === "heat" ? 1 : -1;
    const canDrawDemand = demand !== true || (finite(next) && finite(s.room_temperature) && (next - s.room_temperature) * expectedTravel > .000001);
    const nextLabel = prep ? "raGraphFinish" : demand ? brakeStop ? "raGraphBrake" : "raGraphStop" : "raGraphResume";
    const controlText = finite(next) ? `${this.t(nextLabel)} · ${this.format(next)}` : this.t(valid && demand === false ? "raGraphNoDemand" : "raGraphUnknown");
    const info = prep && threshold && finite(next) ? this.t("raGraphPreparationHelp", { threshold: this.format(next), target: this.format(threshold.target), operation: direction === "cool" ? "+" : "−", margin: this.format(Math.abs(threshold.target - next)) }) : undefined;
    if (finite(s.room_temperature) && finite(next)) rails.push({ id: "control", from: canDrawDemand ? x(s.room_temperature) : x(next), to: x(next), hidden: !canDrawDemand, y: axis + 23, text: controlText, color: demand ? color : "var(--ra-muted)", arrow: true, wait: demand === false, brake: Boolean(demand && brakeStop), info });
    const targetRole = roles.find((role) => role.id === "target");
    const appliedRole = roles.find((role) => role.id === "setpoint");
    const additionalStart = scheduled ? 138 : 77;
    if (this.detailed) {
      const room = s.room_temperature;
      const target = scheduled && s.target_boundary ? scheduled[s.target_boundary] : scheduled ? finite(room) && room < scheduled.low ? scheduled.low : finite(room) && room > scheduled.high ? scheduled.high : undefined : s.target_temperature;
      if (finite(room) && finite(target)) {
        const delta = room - target;
        rails.push({ id: "gap", from: x(room), to: x(target), y: axis + additionalStart, text: Math.abs(delta) < .000001 ? this.t("raGraphAtTarget") : this.t(delta < 0 ? "raGraphBelow" : "raGraphAbove", { value: this.format(Math.abs(delta)) }), color: "var(--ra-muted)" });
      }
      const from = scheduled ? targetRole && center(targetRole.value) : s.climate_temperature;
      const to = appliedRole && center(appliedRole.value);
      if (finite(from) && finite(to) && Math.abs(to - from) > .000001) rails.push({ id: "total", from: x(from), to: x(to), y: axis + additionalStart + 43, text: this.t(scheduled ? "raGraphBandShift" : "raGraphTotal", { value: this.signed(to - from) }), color: "var(--ra-adjust)" });
      if (offset && appliedRole && Math.abs(offset.applied) > .000001) {
        const base = offset.base_target;
        const initial = "temperature" in base ? base.temperature : (base.target_temp_low + base.target_temp_high) / 2;
        rails.push({ id: "extra", from: x(initial), to: x(center(appliedRole.value)), y: axis + additionalStart + 86, text: `${this.t("raGraphExtra", { value: this.signed(offset.applied) })} · ${this.t("raGraphIncluded")}`, color: "var(--ra-applied)" });
      }
    }
    const lastRail = rails.length ? Math.max(...rails.map((rail) => rail.y)) : axis + 16;
    let height = Math.max(lastRail + 48, scheduled ? axis + 108 : axis + 62);
    const sections = margin ? nativeRange && scheduled ? [[margin.low, scheduled.low], [scheduled.high, margin.high]] : [[margin.low, margin.high]] : [];
    const displayedMargin = margin ? nativeRange && scheduled
      ? Math.max(0, scheduled.low - margin.low, margin.high - scheduled.high)
      : (margin.high - margin.low) / 2 : 0;
    const bound = finite(physicalValue) && physicalSide ? { value: physicalValue, text: this.t(physicalSide === "maximum" ? "raGraphMaximum" : "raGraphMinimum", { value: this.format(physicalValue) }) } : undefined;
    // Reserve a separate lane after every chip and relation, especially on mobile.
    const physicalLabelY = height + 4;
    const physicalLabelWidth = this.sizes.physical?.width ?? 130;
    if (bound) height += (this.sizes.physical?.height ?? 22) + 12;
    const correctionRespectsBound = this.correctionRespectsBound(s, intent);
    const requestLabel = this.t(demand === true ? direction === "cool" ? "raGraphCool" : "raGraphHeat" : demand === false ? "raGraphNoDemand" : "raGraphUnknown");
    const detailId = `ra-detail-${this.entityId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
    const sensorDifference = finite(s.room_temperature) && finite(s.climate_temperature)
      ? Math.round((s.climate_temperature - s.room_temperature) * 1e6) / 1e6 : undefined;
    const roleDetails = new Map<string, string[]>();
    for (const role of roles) {
      const detail = [`${role.label} ${this.formatValue(role.value)}. ${this.t(role.help)}`];
      if ((role.id === "room" || role.id === "equipment") && finite(sensorDifference)) {
        detail.push(this.t("raGraphSensorDifference", { value: this.signed(sensorDifference) }));
      }
      if (role.id === "target") {
        if (margin) detail.push(this.t(nativeRange ? "raGraphOuterMargin" : "raGraphMargin", { value: this.format(displayedMargin) }));
        if (prep && finite(next)) detail.push(`${this.t("raGraphFinish")} · ${this.format(next)}`);
      }
      if (role.id === "setpoint") {
        if (offset) {
          const base = offset.base_target;
          detail.push([
            this.t("preconditioningOffsetBase", { value: this.formatValue("temperature" in base ? base.temperature : [base.target_temp_low, base.target_temp_high]) }),
            this.t("preconditioningOffsetRequested", { value: this.signed(offset.requested) }),
            this.t("preconditioningOffsetApplied", { value: this.signed(offset.applied) }),
          ].join(" · "));
        }
        if (guardEffect) {
          detail.push([
            this.t("raGraphGuardEffect"),
            `${this.t("raGraphCalculated")}: ${this.format(evidence.calculated_temperature!)}`,
            `${this.t("raGraphGuard")}: ${this.format(braking!.setpoint_bound!)}`,
          ].join(" · "));
        }
        if (finite(equipmentStep)) detail.push(`${this.t("raGraphStep")}: ${this.format(equipmentStep)}`);
        if (bound) detail.push(bound.text);
      }
      roleDetails.set(role.id, detail);
    }
    return html`
      <div class="graph">
        <div class="toolbar"><div class="status"><span>${requestLabel}${finite(next) && !rails.some(rail => rail.id === "control") ? ` · ${controlText}` : ""}</span>${offset ? html`<span class="extra">${this.t("raGraphExtra", { value: this.signed(offset.applied) })}${offset.limited_by ? ` / ${this.signed(offset.requested)} · ${this.t("raGraphLimited")}` : ""}</span>` : nothing}</div><div class="modes" aria-label=${this.t("roomSensorTemperatureScale")}>${[false, true].map((detail) => html`<button type="button" aria-pressed=${String(this.detailed === detail)} @click=${() => { dismissInlineHelpWithin(this); this.detailed = detail; }}>${this.t(detail ? "raGraphDetailed" : "raGraphNormal")}</button>`)}</div></div>
        <div class="canvas" style=${`height:${height}px`} role="group" aria-label=${this.t("roomSensorTemperatureScale")}>
          <svg viewBox=${`0 0 ${width} ${height}`} aria-hidden="true">
            <defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" x2="0" y1="0" y2="5" stroke="var(--primary-color)" stroke-width="1" opacity=".45"/></pattern></defs>
            ${sections.filter(([low, high]) => high > low).map(([low, high]) => svg`<g data-room-assist-margin><rect x=${x(low)} y=${axis - 8} width=${x(high) - x(low)} height="8" fill="url(#hatch)"/></g>`)}
            <line x1="4" x2=${width - 4} y1=${axis} y2=${axis} stroke="var(--ra-rule)" stroke-width="3"/>
            ${bound ? svg`<line data-physical-limit x1=${x(bound.value)} x2=${x(bound.value)} y1=${axis - 14} y2=${physicalLabelY - 3} stroke="var(--ra-muted)" stroke-width="1" opacity=".6"/>` : nothing}
            ${roles.map((role) => {
              const chip = layout.chips.find((item) => item.id === role.id)!;
              const range = Array.isArray(role.value) ? role.value : undefined;
              const below = role.id === "setpoint" && range;
              const connectorEnd = range ? below ? axis + 45 : axis - 14 : axis - 6;
              return svg`<line data-chip-stem=${role.id} x1=${chip.x} x2=${chip.x} y1=${below ? chip.top : chip.top + chip.height} y2=${connectorEnd} stroke=${role.color} stroke-width="1" opacity=".6"/>
                ${range ? svg`<line x1=${x(range![0])} x2=${x(range![1])} y1=${connectorEnd} y2=${connectorEnd} stroke=${role.color} stroke-width="1.5"/>${range!.map((value) => svg`<line x1=${x(value)} x2=${x(value)} y1=${connectorEnd} y2=${axis} stroke=${role.color} stroke-width="1"/><rect x=${x(value) - 3} y=${axis - 3} width="6" height="6" fill="var(--ra-paper)" stroke=${role.color} stroke-width="1.5"/>`)}` : nothing}`;
            })}
            ${this.renderPoints(roles, x, axis)}
            ${rails.map((rail) => this.renderRail(rail))}
          </svg>
          ${roles.map((role) => {
            const chip = layout.chips.find((item) => item.id === role.id)!;
            const id = `ra-${role.id}-${this.entityId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
            return html`<span class="tag" style=${`left:${chip.left}px;top:${chip.top}px;max-width:${width - 8}px;--family:${role.color}`}><button class="chip" data-measure=${role.id} id=${`${id}-trigger`} type="button" aria-controls=${id} aria-describedby=${id} aria-expanded="false" @pointerenter=${inlineHelpAnchorHandlers.pointerenter} @pointerleave=${inlineHelpAnchorHandlers.pointerleave} @focus=${inlineHelpAnchorHandlers.focus} @focusout=${inlineHelpAnchorHandlers.focusout} @click=${inlineHelpAnchorHandlers.click} @keydown=${inlineHelpAnchorHandlers.keydown}>${role.label}<strong>${this.formatValue(role.value)}</strong>${role.id === "setpoint" && guardEffect ? html`<small>· ${this.t("raGraphBraked")}</small>` : nothing}</button>${renderInlineHelpTooltip(id, `${id}-trigger`, roleDetails.get(role.id)!)}</span>`;
          })}
          ${rails.map((rail) => this.renderRailLabel(rail, width))}
          ${bound ? html`<span class="rail-label physical" data-measure="physical" style=${`left:${Math.max(0, Math.min(width - physicalLabelWidth, x(bound.value) - physicalLabelWidth / 2))}px;top:${physicalLabelY}px;--rail-color:var(--ra-muted)`}>${bound.text}</span>` : nothing}
        </div>
        ${margin ? html`<div class="legend" title=${this.t("raGraphBandHelp")}><span class="hatch-key" aria-hidden="true"></span>${this.t(nativeRange ? "raGraphOuterMargin" : "raGraphMargin", { value: this.format(displayedMargin) })}</div>` : nothing}
      </div>
      <div class="explanation" @keydown=${(event: KeyboardEvent) => {
        if (event.key !== "Escape" || !this.detailView) return;
        const view = this.detailView;
        this.detailView = null;
        this.renderRoot.querySelector<HTMLButtonElement>(`[data-detail-toggle="${view}"]`)?.focus();
        event.stopPropagation();
      }}>
        <div class="detail-actions">
          ${(["explanation", "data"] as const).map(view => html`<button class="detail-toggle" data-detail-toggle=${view} id=${`${detailId}-${view}-trigger`} type="button" aria-controls=${`${detailId}-${view}`} aria-expanded=${String(this.detailView === view)} @click=${() => { this.detailView = this.detailView === view ? null : view; }}><ha-icon class="detail-icon" icon=${view === "explanation" ? "mdi:text-box-outline" : "mdi:format-list-bulleted-square"} aria-hidden="true"></ha-icon><span>${this.t(view === "explanation" ? "raGraphViewExplanation" : "raGraphTechnicalData")}</span><ha-icon class="data-chevron" icon="mdi:chevron-down" aria-hidden="true"></ha-icon></button>`)}
        </div>
        <div class="detail-panel" ?hidden=${this.detailView === null}>
          <div id=${`${detailId}-explanation`} role="region" aria-labelledby=${`${detailId}-explanation-trigger`} ?hidden=${this.detailView !== "explanation"}>${this.renderExplanation(roles, intent, next, guardEffect, correctionRespectsBound, bound?.value)}</div>
          <div id=${`${detailId}-data`} role="region" aria-labelledby=${`${detailId}-data-trigger`} ?hidden=${this.detailView !== "data"}>${this.renderData(roles, intent, guardEffect, correctionRespectsBound, equipmentStep)}</div>
        </div>
      </div>
    `;
  }

  private renderExplanation(roles: Role[], intent: Intent | undefined, next: number | undefined, guardEffect: boolean | undefined, correctionRespectsBound: boolean | undefined, physicalLimit: number | undefined) {
    const s = this.status!;
    const parts: string[] = [];
    if (!intent?.valid || intent.demand === null) {
      return html`<div class="human-explanation"><p>${this.t("raGraphContextUnconfirmed")}</p></div>`;
    }
    if (intent.source === "preconditioning") parts.push(this.t("raGraphContextPreparation"));
    else if (intent.demand === false) parts.push(this.t(finite(next) ? "raGraphContextPaused" : "raGraphContextNeutral"));
    else if (s.hysteresis_phase && intent.direction && finite(s.room_temperature) && finite(next)) {
      const target = intent.thresholds?.[intent.direction]?.target;
      const sign = intent.direction === "heat" ? 1 : -1;
      if (finite(target) && (s.room_temperature - target) * sign >= 0 && (next - s.room_temperature) * sign > .000001) parts.push(this.t("raGraphContextTargetReached"));
    }
    const accepted = (s.status === "assisting" || s.status === "holding") && roles.some(role => role.id === "setpoint");
    if (accepted && finite(s.room_temperature) && finite(s.climate_temperature)) {
      const difference = s.climate_temperature - s.room_temperature;
      parts.push(this.t(Math.abs(difference) < .000001 ? "raGraphContextSensorsAgree" : difference > 0 ? "raGraphContextEquipmentWarmer" : "raGraphContextEquipmentCooler"));
    }
    if (!parts.length) parts.push(this.t(finite(s.room_temperature) ? "raGraphContextRoomReference" : "raGraphContextMissingReadings"));
    const limits: string[] = [];
    if (guardEffect) limits.push(this.t("raGraphContextBrakingApplied"));
    else if (correctionRespectsBound) limits.push(this.t("raGraphExplainCompliant"));
    if (finite(physicalLimit)) limits.push(this.t("raGraphContextPhysicalLimit"));
    else if (s.preconditioning_offset?.limited_by === "step") limits.push(this.t("raGraphContextStep"));
    return html`<div class="human-explanation"><p>${parts.join(" ")}</p>${limits.length ? html`<p>${limits.join(" ")}</p>` : nothing}</div>`;
  }

  private renderPoints(roles: Role[], x: (value: number) => number, axis: number) {
    const groups = new Map<number, Role[]>();
    for (const role of roles) if (typeof role.value === "number") groups.set(role.value, [...(groups.get(role.value) ?? []), role]);
    return [...groups].map(([value, group]) => group.length === 1 ? svg`<circle data-temperature-point=${group[0].id} cx=${x(value)} cy=${axis} r="6" fill=${group[0].id === "target" ? group[0].color : "var(--ra-paper)"} stroke=${group[0].color} stroke-width="2"/>` : svg`<circle cx=${x(value)} cy=${axis} r="7" fill="var(--ra-paper)"/>${group.map((role, index) => {
      const start = (-90 + index * 360 / group.length) * Math.PI / 180;
      const end = (-90 + (index + 1) * 360 / group.length) * Math.PI / 180;
      return svg`<path data-temperature-point=${role.id} d=${`M ${x(value)} ${axis} L ${x(value) + 6 * Math.cos(start)} ${axis + 6 * Math.sin(start)} A 6 6 0 0 1 ${x(value) + 6 * Math.cos(end)} ${axis + 6 * Math.sin(end)} Z`} fill=${role.color}/>`;
    })}<circle cx=${x(value)} cy=${axis} r="3" fill="var(--ra-paper)"/>`);
  }

  private renderRail(rail: Rail) {
    if (rail.hidden) return svg`<line data-control-threshold x1=${rail.to} x2=${rail.to} y1=${rail.y - 4} y2=${rail.y + 4} stroke=${rail.color} stroke-width="1.4"/>`;
    const sign = Math.sign(rail.to - rail.from);
    // Leave room for the stop bars without moving a short arrow behind its origin.
    const stopGap = rail.brake ? Math.min(5, Math.abs(rail.to - rail.from) / 2) : 0;
    const tip = rail.to - sign * stopGap;
    const head = Math.min(6, Math.abs(tip - rail.from) / 2);
    return svg`<g data-label-rail=${rail.id}><line data-demand=${rail.arrow ? String(!rail.wait) : nothing} x1=${rail.from} x2=${rail.arrow ? tip : rail.to} y1=${rail.y} y2=${rail.y} stroke=${rail.color} stroke-width=${rail.arrow && !rail.wait ? "1.4" : "1.2"} stroke-linecap="round" stroke-dasharray=${rail.wait ? "3 4" : nothing}/>
      ${rail.arrow ? svg`<path d=${`M ${tip - sign * head} ${rail.y - 3} L ${tip} ${rail.y} L ${tip - sign * head} ${rail.y + 3}`} fill="none" stroke=${rail.color} stroke-width=${rail.wait ? "1.2" : "1.4"} stroke-linecap="round" stroke-linejoin="round"/>` : [rail.from, rail.to].map((point) => svg`<line x1=${point} x2=${point} y1=${rail.y - 3} y2=${rail.y + 3} stroke=${rail.color} stroke-width="1"/>`)}
      ${rail.brake ? [-1.5, 1.5].map((offset) => svg`<line data-brake-stop x1=${rail.to + offset} x2=${rail.to + offset} y1=${rail.y - 5} y2=${rail.y + 5} stroke=${rail.color} stroke-width="1.4"/>`) : nothing}</g>`;
  }

  private renderRailLabel(rail: Rail, width: number) {
    const measured = this.sizes[`rail-${rail.id}`];
    const labelWidth = measured?.width ?? Math.min(240, width - 8);
    const placement = roomAssistRailLabelPlacement(rail.from, rail.to, labelWidth);
    const labelHeight = measured?.height ?? (placement.inline ? 24 : 20);
    const left = Math.max(0, Math.min(width - labelWidth, placement.center - labelWidth / 2));
    return html`<span class=${`rail-label ${rail.id}${placement.inline ? " inline" : ""}`} data-placement=${placement.inline ? "inline" : "below"} data-measure=${`rail-${rail.id}`} style=${`left:${left}px;width:${labelWidth}px;top:${placement.inline ? rail.y - labelHeight / 2 : rail.y + 8}px;--rail-color:${rail.color}`}><span class="rail-text">${rail.text}</span>${rail.info ? renderInlineHelp(`ra-preparation-${this.entityId.replace(/[^a-zA-Z0-9_-]/g, "-")}`, this.t("raGraphFinish"), rail.info) : nothing}</span>`;
  }

  private correctionRespectsBound(s: RoomSensorAssistStatus, intent?: Intent) {
    const evidence = s.reference_setpoint ?? s;
    const brake = s.braking;
    return intent?.valid === true && intent?.source !== "preconditioning" && brake?.active && !brake.reason && brake.effective_level !== "default"
      && finite(brake.setpoint_bound) && finite(evidence.calculated_temperature)
      && ((s.effective_hvac_mode ?? s.hvac_mode) === "cool"
        ? evidence.calculated_temperature >= brake.setpoint_bound
        : evidence.calculated_temperature <= brake.setpoint_bound);
  }

  private renderData(roles: Role[], intent: Intent | undefined, guardEffect: boolean | undefined, correctionRespectsBound: boolean | undefined, equipmentStep: number | undefined) {
    const s = this.status!;
    const confirmed = intent?.valid === true && intent.demand !== null;
    const accepted = confirmed && (s.status === "assisting" || s.status === "holding");
    const evidence = s.reference_setpoint ?? s;
    const same = (a: Value, b: Value) => values(a).length === values(b).length && values(a).every((value, index) => Math.abs(value - values(b)[index]) < .000001);
    const rowText = (label: string, value: unknown) => value === undefined || value === null ? nothing : html`<dt>${label}</dt><dd>${value}</dd>`;
    const row = (label: TranslationKey, value: unknown) => rowText(this.t(label), value);
    const temp = (value: unknown) => finite(value) ? this.format(value) : undefined;
    type Stage = { label: TranslationKey; value: Value };
    const stages = (items: Stage[]) => {
      const groups: { labels: TranslationKey[]; value: Value }[] = [];
      for (const item of items) {
        const last = groups.at(-1);
        if (last && same(last.value, item.value)) last.labels.push(item.label);
        else groups.push({ labels: [item.label], value: item.value });
      }
      return groups.map(group => rowText(group.labels.map(label => this.t(label)).join(" · "), this.formatValue(group.value)));
    };
    const output = roles.find(role => role.id === "setpoint")?.value;
    const reported: Value | undefined = finite(s.climate_target_temp_low) && finite(s.climate_target_temp_high)
      ? [s.climate_target_temp_low, s.climate_target_temp_high] : finite(s.climate_target_temperature) ? s.climate_target_temperature : undefined;
    const rangeStages: Stage[] = [];
    const scalarStages: Stage[] = [];
    if (accepted) {
      if (finite(s.requested_target_temp_low) && finite(s.requested_target_temp_high)) rangeStages.push({ label: "raGraphRequestedRange", value: [s.requested_target_temp_low, s.requested_target_temp_high] });
      if (Array.isArray(output)) rangeStages.push({ label: "raGraphDataAppliedRange", value: output });
      if (!Array.isArray(output) || s.reference_setpoint) {
        for (const [label, value] of [
          ["raGraphDataCalculated", evidence.calculated_temperature], ["raGraphDataRequested", evidence.requested_temperature],
          ["raGraphBeforeStep", evidence.pre_step_temperature], ["raGraphDataApplied", evidence.applied_temperature],
        ] as const) if (finite(value)) scalarStages.push({ label, value });
      }
    }
    const thresholdRows: (ReturnType<typeof html> | typeof nothing)[] = [];
    const boundaries: number[] = [];
    if (confirmed) for (const [side, threshold] of Object.entries(intent.thresholds ?? {})) {
      if (!threshold || (intent.direction && intent.direction !== side)) continue;
      const points: Stage[] = [];
      if (finite(threshold.stop_temperature)) { points.push({ label: "raGraphStop", value: threshold.stop_temperature }); boundaries.push(threshold.stop_temperature); }
      if (finite(threshold.start_temperature)) { points.push({ label: "raGraphResume", value: threshold.start_temperature }); boundaries.push(threshold.start_temperature); }
      if (!intent.direction) thresholdRows.push(html`<dt class="data-direction">${this.host!._modeLabel(side)}</dt><dd></dd>`);
      thresholdRows.push(...stages(points));
    }
    const uniqueBoundary = (value: unknown) => {
      if (!finite(value) || boundaries.some(boundary => same(boundary, value))) return undefined;
      boundaries.push(value);
      return this.format(value);
    };
    const braking = s.braking;
    const level = (value: string) => this.t(value === "high" ? "roomSensorAssistBrakingHigh" : value === "moderate" ? "roomSensorAssistBrakingModerate" : "roomSensorAssistBrakingDefault");
    const brakingState = !confirmed ? this.t("raGraphUnavailable") : intent.source === "preconditioning" ? this.t("raGraphBrakingDeferred")
      : braking?.reason ? this.t("roomSensorAssistBrakingInactive") : braking?.effective_level !== "default" && braking ? this.t(braking.active ? "roomSensorBrakingActive" : "roomSensorBrakingWaiting") : undefined;
    const scheduled = scheduledAssistRange(s);
    const runtimeMargin = finite(s.deadband_low) && finite(s.deadband_high)
      ? scheduled && !s.target_boundary ? Math.max(0, scheduled.low - s.deadband_low, s.deadband_high - scheduled.high) : (s.deadband_high - s.deadband_low) / 2 : undefined;
    const configuredMargin = this.settings?.room_sensor_assist_deadband;
    const offset = s.preconditioning_offset;
    const base = offset?.base_target;
    const baseValue: Value | undefined = base ? "temperature" in base ? base.temperature : [base.target_temp_low, base.target_temp_high] : undefined;
    const extras: Stage[] = offset ? [{ label: "raGraphDataRequested", value: offset.requested }, { label: "raGraphDataApplied", value: offset.applied }] : [];
    const extraRows = (() => {
      if (!offset) return nothing;
      return same(offset.requested, offset.applied) ? row("raGraphDataRequestedApplied", this.signed(offset.applied))
        : extras.map(item => row(item.label, this.signed(item.value as number)));
    })();
    const eligibleBrake = confirmed && intent.source !== "preconditioning" && braking && !braking.reason && braking.effective_level !== "default";
    const hasLimits = (accepted && evidence.scheduled_target_guard) || (eligibleBrake && finite(braking.setpoint_bound)) || (confirmed && (guardEffect || correctionRespectsBound)) || finite(s.limit_temperature) || offset?.limited_by;
    const origin = s.room_temperature_entity_id || s.active_from || s.start || s.target_when;
    return html`<div class="data">
      ${rangeStages.length || scalarStages.length || output !== undefined || finite(equipmentStep) ? html`<section data-group="command"><h4>${this.t("raGraphDataCommand")}</h4><dl>
        ${stages(rangeStages)}
        ${!accepted ? row("raGraphDataReported", reported === undefined ? this.t("raGraphUnavailable") : this.formatValue(reported))
          : !rangeStages.length && !scalarStages.length ? row("raGraphDataReported", output === undefined ? undefined : this.formatValue(output)) : nothing}
        ${!rangeStages.length ? stages(scalarStages) : nothing}
        ${row("raGraphStep", temp(equipmentStep))}
      </dl>${rangeStages.length && scalarStages.length ? html`<p class="data-reference">${this.t(s.reference_setpoint?.boundary === "high" ? "raGraphDataReferenceHigh" : "raGraphDataReferenceLow")}</p><dl>${stages(scalarStages)}</dl>` : nothing}</section>` : nothing}
      <section data-group="control"><h4>${this.t("raGraphDataControl")}</h4><dl>
        ${row("raGraphSource", this.t(confirmed ? intent.source === "preconditioning" ? "raGraphPreparing" : "raGraphOrdinary" : "raGraphUnavailable"))}
        ${row("raGraphMode", s.effective_hvac_mode || s.hvac_mode ? this.host!._modeLabel(s.effective_hvac_mode || s.hvac_mode!) : undefined)}
        ${thresholdRows}
        ${row("raGraphPhase", confirmed && s.hysteresis_phase ? this.t(s.hysteresis_phase === "towards_lower" ? "raGraphDataTowardsLower" : "raGraphDataTowardsUpper") : undefined)}
        ${row("raGraphDataCycleTarget", confirmed ? uniqueBoundary(s.hysteresis_target) : undefined)}
        ${row("raGraphLowMargin", uniqueBoundary(s.deadband_low))}${row("raGraphHighMargin", uniqueBoundary(s.deadband_high))}
        ${braking ? braking.configured_level !== braking.effective_level
          ? html`${row("raGraphBrakingLevel", level(braking.configured_level))}${row("raGraphBrakingState", `${level(braking.effective_level)}${brakingState ? ` · ${brakingState}` : ""}`)}`
          : row("raGraphDataBraking", `${level(braking.configured_level)}${brakingState ? ` · ${brakingState}` : ""}`) : nothing}
        ${row("raGraphDataConfiguredMargin", finite(configuredMargin) && (!finite(runtimeMargin) || !same(configuredMargin, runtimeMargin)) ? this.format(configuredMargin) : undefined)}
        ${row("roomSensorAssistMaxDelta", temp(this.settings?.room_sensor_assist_max_delta))}
      </dl></section>
      ${offset ? html`<section data-group="preparation"><h4>${this.t("raGraphDataExtra")}</h4><dl>
        ${row("raGraphBase", baseValue !== undefined && (output === undefined || !same(baseValue, output)) ? this.formatValue(baseValue) : undefined)}
        ${extraRows}
      </dl></section>` : nothing}
      ${hasLimits ? html`<section data-group="limits"><h4>${this.t("raGraphDataLimits")}</h4><dl>
        ${row("raGraphDataProtection", accepted && evidence.scheduled_target_guard ? this.t(evidence.scheduled_target_guard === "heating_ceiling" ? "raGraphDataHeatingCeiling" : "raGraphDataCoolingFloor") : undefined)}
        ${row("raGraphGuard", eligibleBrake ? temp(braking.setpoint_bound) : undefined)}
        ${row("raGraphDataBrakingEffect", confirmed && (guardEffect || correctionRespectsBound) ? this.t(guardEffect ? "raGraphGuardEffect" : "raGraphNoAdditionalBrake") : undefined)}
        ${row(s.limited_by === "minimum" ? "raGraphMinimumLabel" : "raGraphMaximumLabel", temp(s.limit_temperature))}
        ${row("raGraphDataExtraLimit", offset?.limited_by && (offset.limited_by !== s.limited_by || !finite(s.limit_temperature)) ? this.t(offset.limited_by === "step" ? "preconditioningOffsetStep" : offset.limited_by === "minimum" ? "preconditioningOffsetMinimum" : "preconditioningOffsetMaximum") : undefined)}
      </dl></section>` : nothing}
      ${origin ? html`<section class="data-origin" data-group="origin"><h4>${this.t("raGraphDataOrigin")}</h4><div class="data-origin-fields">
        ${s.room_temperature_entity_id ? html`<dl>${row("roomSensorTemperatureEntity", html`<code>${s.room_temperature_entity_id}</code>`)}</dl>` : nothing}
        ${s.active_from ? html`<dl>${row("raGraphActiveSince", this.host!._formatDateTime(s.active_from))}</dl>` : s.start ? html`<dl>${row("raGraphSchedule", this.host!._formatScheduleTime(s.start))}</dl>` : nothing}
        ${s.target_when && s.target_when !== s.active_from ? html`<dl>${row("raGraphPreparationTarget", this.host!._formatDateTime(s.target_when))}</dl>` : nothing}
      </div></section>` : nothing}
    </div>`;
  }
}

if (!customElements.get("velair-room-assist-graph")) customElements.define("velair-room-assist-graph", VelairRoomAssistGraph);

export function renderRoomAssistGraph(host: VelairViewHost, entityId: string, status: RoomSensorAssistStatus, settings?: PreconditioningSettings, showDeadband = true) {
  return html`<velair-room-assist-graph .host=${host} .entityId=${entityId} .status=${status} .settings=${settings} .showDeadband=${showDeadband} .language=${host._language?.() ?? ""}></velair-room-assist-graph>`;
}
