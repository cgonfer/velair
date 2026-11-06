import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { WEEKDAYS } from "../constants";
import { VelairApiClient } from "../api/client";
import { temperatureSensorOptions } from "../domain/preconditioning";
import { roomSensorScheduleDraft, roomSensorScheduleError, roomSensorSchedulesEqual } from "../domain/room-sensor-schedule";
import { renderInlineHelp, dismissInlineHelpWithin } from "../views/inline-help";
import { inlineHelpStyles } from "../styles/inline-help-styles";
import { renderAddListButton } from "../views/add-list-button";
import type { VelairViewHost } from "../host-types";
import type { PreconditioningSettings, PreconditioningSettingsUpdate, RoomSensorAssistStatus, RoomSensorSchedule, RoomSensorSchedulePeriod } from "../types";

/** Local editing state only. Saving always goes through the backend-owned settings API. */
export class VelairRoomSensorSchedule extends LitElement {
  @property({ attribute: false }) host?: VelairViewHost;
  @property({ attribute: false, hasChanged: (value?: PreconditioningSettings, old?: PreconditioningSettings) =>
    value?.room_sensor_schedule?.enabled !== old?.room_sensor_schedule?.enabled
    || value?.room_sensor_schedule?.default_source !== old?.room_sensor_schedule?.default_source
    || periodCount(value?.room_sensor_schedule) !== periodCount(old?.room_sensor_schedule)
    || value?.room_temperature_entity_id !== old?.room_temperature_entity_id
    || value?.room_sensor_assist_enabled !== old?.room_sensor_assist_enabled }) settings?: PreconditioningSettings;
  @property({ attribute: false, hasChanged: (value?: RoomSensorAssistStatus, old?: RoomSensorAssistStatus) =>
    value?.reason !== old?.reason
    || value?.room_sensor_schedule?.enabled !== old?.room_sensor_schedule?.enabled
    || value?.room_sensor_schedule?.effective_source !== old?.room_sensor_schedule?.effective_source
    || value?.room_sensor_schedule?.next_change !== old?.room_sensor_schedule?.next_change
    || value?.room_sensor_schedule?.next_source !== old?.room_sensor_schedule?.next_source }) runtime?: RoomSensorAssistStatus;
  @property() entityId = "";
  @property({ type: Boolean }) showLiveStatus = true;
  @property({ type: Boolean }) showEditor = true;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) editRequested = false;
  @property() language = "";
  @state() private _open = false;
  @state() private _draft?: RoomSensorSchedule;
  @state() private _fixedDraft: string | null = null;
  private _savedFixed: string | null = null;
  private _savedSchedule?: RoomSensorSchedule;
  @state() private _saving = false;
  @state() private _loading = false;
  @state() private _requestError?: "roomSensorScheduleLoadError" | "roomSensorScheduleVerificationError";
  private _requestGeneration = 0;
  private _sensorOptions: ReturnType<typeof temperatureSensorOptions> = [];

  static styles = [inlineHelpStyles, css`
    :host { display: block; min-width: 0; container-type: inline-size; font: inherit; color: var(--primary-text-color); }
    section { min-width: 0; }
    .reference-choice { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; }
    .reference-mode-heading { display: flex; align-items: center; gap: 8px; max-width: 100%; min-width: 0; }
    .reference-mode-heading h3 { margin: 0; font-size: 13px; font-weight: 600; }
    .reference-mode-heading > ha-icon { --mdc-icon-size: 20px; flex: 0 0 20px; color: var(--primary-color); }
    .reference-modes { display: inline-flex; flex: 0 0 auto; margin-inline-start: auto; box-sizing: border-box; max-width: 100%; gap: 3px; padding: 3px; border: 1px solid var(--divider-color); border-radius: 7px; }
    .reference-mode { min-height: 36px; padding: 8px 18px; border: 1px solid transparent; border-radius: 5px; background: transparent; color: var(--secondary-text-color); font-size: 13px; white-space: nowrap; }
    .reference-mode[aria-pressed=true] { border-color: var(--primary-color); color: var(--primary-text-color); background: color-mix(in srgb, var(--primary-color) 12%, transparent); }
    .fixed-field { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, 260px); align-items: center; gap: 12px; min-width: 0; }
    .field-heading { display: inline-flex; align-items: center; gap: 4px; min-width: 0; }
    .default-field-heading { display: grid; gap: 4px; min-width: 0; }
    .default-field { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, 260px); align-items: center; gap: 12px; min-width: 0; }
    .reference-editor { display: grid; gap: 14px; margin-top: 22px; min-width: 0; }
    .schedule-fields { display: grid; gap: 12px; }
    p { margin: 0; }
    p, small { color: var(--secondary-text-color); font-size: 12px; line-height: 1.45; }
    label { display: grid; gap: 6px; min-width: 0; font-size: 13px; }
    .period { display: grid; gap: 12px; min-width: 0; padding: 4px 0 4px 12px; border-inline-start: 2px solid color-mix(in srgb, var(--primary-color) 18%, var(--divider-color)); }
    .days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; min-width: 0; margin: 0; padding: 0; border: 0; }
    .days legend { font-size: 12px; margin-bottom: 8px; color: var(--secondary-text-color); }
    .days label { position: relative; display: flex; justify-content: center; align-items: center; min-width: 0; min-height: 34px; border: 1px solid var(--divider-color); border-radius: 5px; cursor: pointer; }
    .days label:has(input:checked) { border-color: var(--primary-color); background: color-mix(in srgb, var(--primary-color) 9%, transparent); }
    .days label:has(input:focus-visible) { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .days label span { white-space: nowrap; }
    .days input { position: absolute; width: 1px; height: 1px; margin: 0; opacity: 0; clip-path: inset(50%); }
    .period-controls { display: grid; grid-template-columns: minmax(100px, 130px) minmax(100px, 130px) minmax(0, 1fr) 36px; gap: 10px; align-items: end; min-width: 0; }
    select, input[type=time] { box-sizing: border-box; width: 100%; min-width: 0; height: 38px; padding: 7px 9px; border: 1px solid var(--divider-color); border-radius: 5px; color: var(--primary-text-color); background: var(--card-background-color); font: inherit; font-size: 14px; }
    .select-wrap { display: block; position: relative; min-width: 0; }
    .select-wrap select { appearance: none; padding-right: 30px; border-radius: 8px; text-overflow: ellipsis; }
    .select-wrap::after { border: solid var(--secondary-text-color); border-radius: 1px; border-width: 0 2px 2px 0; content: ""; height: 7px; pointer-events: none; position: absolute; right: 11px; top: 50%; transform: translateY(-62%) rotate(45deg); transition: transform 120ms ease; width: 7px; }
    .select-wrap:has(select:open)::after { transform: translateY(-28%) rotate(225deg); }
    select:disabled { cursor: default; opacity: .55; }
    input[type=checkbox] { accent-color: var(--primary-color); }
    button { font: inherit; cursor: pointer; }
    .action { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; padding: 7px 12px; border: 1px solid var(--divider-color); border-radius: 5px; color: var(--primary-color); background: transparent; font-size: 13px; }
    .action ha-icon { --mdc-icon-size: 18px; }
    .action.primary { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: var(--primary-color); }
    .action.neutral { color: var(--primary-text-color); }
    .icon-button { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; padding: 0; }
    .icon-button ha-icon { --mdc-icon-size: 18px; }
    .icon-button.danger.resource-item-delete { width: 34px; height: 34px; border: 0; background: transparent; color: var(--error-color, #c62828); }
    .icon-button.danger.resource-item-delete:hover { background: color-mix(in srgb, var(--error-color, #c62828) 10%, transparent); border-radius: 5px; }
    .draft-add-row { display: flex; justify-content: center; align-items: center; padding: 2px 0; }
    .draft-add-button { width: 34px; height: 34px; border-radius: 999px; border: 1px solid var(--success-color, #2e7d32); background: var(--success-color, #2e7d32); color: var(--text-primary-color, #fff); }
    button:disabled { opacity: .5; cursor: default; }
    button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .footer { justify-content: flex-end; padding-top: 2px; }
    .error { color: var(--error-color); }
    .status { display: grid; gap: 3px; }
    @container (max-width: 620px) {
      .period-controls { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
      .period-source { grid-column: 1 / -1; }
      .resource-item-delete { grid-column: 2; justify-self: end; }
    }
    @container (max-width: 440px) {
      .days { gap: 3px; }
      .days label { font-size: 12px; }
      .days label span { overflow: visible; text-overflow: clip; }
      .period { padding-inline-start: 10px; }
    }
    @container (max-width: 480px) {
      .reference-modes { display: flex; }
      .reference-mode { flex: 1; padding-inline: 10px; }
      .default-field, .fixed-field { grid-template-columns: minmax(0, 1fr); gap: 6px; }
    }
  `];

  protected willUpdate(changes: Map<PropertyKey, unknown>) {
    if (changes.has("entityId")) this._cancel();
    if (changes.has("settings") && this._draft && this._savedSchedule
      && roomSensorSchedulesEqual(this._draft, this._savedSchedule) && this._fixedDraft === this._savedFixed
      && (Boolean(this.settings?.room_sensor_schedule?.enabled) !== this._savedSchedule.enabled
        || this.settings?.room_sensor_schedule?.default_source !== this._savedSchedule.default_source
        || periodCount(this.settings?.room_sensor_schedule) !== this._savedSchedule.periods.length
        || (this.settings?.room_temperature_entity_id ?? null) !== this._savedFixed)) this._cancel();
    if (this.showEditor && !this._draft && !this._loading
      && ((this.editRequested && changes.has("editRequested"))
        || (this.settings?.room_sensor_schedule?.enabled && (changes.has("settings") || changes.has("entityId") || changes.has("showEditor") || changes.has("disabled"))))) void this._edit();
  }

  disconnectedCallback() {
    this._cancel();
    super.disconnectedCallback();
  }

  private _cancel() {
    dismissInlineHelpWithin(this);
    this._requestGeneration++;
    this._open = false;
    this._draft = undefined;
    this._savedSchedule = undefined;
    this._fixedDraft = null;
    this._savedFixed = null;
    this._loading = false;
    this._saving = false;
    this._requestError = undefined;
  }

  private _close() {
    this._cancel();
    this.dispatchEvent(new CustomEvent("room-sensor-schedule-closed", { bubbles: true, composed: true }));
    if (this.showEditor && this.settings?.room_sensor_schedule?.enabled) void this._edit();
  }

  private _currentRequest(entity: string, generation: number): boolean {
    return this.isConnected && this.entityId === entity && this._requestGeneration === generation;
  }

  private async _read(entity: string): Promise<RoomSensorSchedule | undefined> {
    if (!this.host?.hass) throw new Error("Home Assistant is unavailable");
    const detail = await new VelairApiClient(this.host.hass).getRoomSensorSchedule(entity);
    const owner = this.host._data?.member_to_unit?.[entity] ?? entity;
    if (detail.entity_id !== owner) throw new Error("Unexpected sensor schedule owner");
    const value = detail.room_sensor_schedule;
    if (value === null) return undefined;
    // A summary must never become an empty draft: that would erase unknown periods.
    if (!value || !Array.isArray(value.periods) || typeof value.enabled !== "boolean"
      || (value.default_source !== null && typeof value.default_source !== "string")
      || roomSensorScheduleError(value)) throw new Error("Invalid sensor schedule detail");
    return value;
  }

  private async _edit() {
    if (!this.showEditor || this.disabled || this._saving) return;
    this._open = true;
    if (this._draft || this._loading) return;
    this.dispatchEvent(new CustomEvent("room-sensor-schedule-open", { bubbles: true, composed: true }));
    const entity = this.entityId;
    const generation = ++this._requestGeneration;
    this._loading = true;
    this._requestError = undefined;
    try {
      const saved = await this._read(entity);
      if (this._currentRequest(entity, generation)) {
        this._savedFixed = this.settings?.room_temperature_entity_id ?? null;
        this._fixedDraft = this._savedFixed;
        this._draft = roomSensorScheduleDraft(saved, this._savedFixed);
        this._savedSchedule = structuredClone(this._draft);
      }
    } catch {
      if (this._currentRequest(entity, generation)) this._requestError = "roomSensorScheduleLoadError";
    } finally {
      if (this._currentRequest(entity, generation)) this._loading = false;
    }
  }

  private async _selectMode(enabled: boolean) {
    if (!this.showEditor || this.disabled || this._saving || this._loading) return;
    if (!this._draft && !enabled && !this.settings?.room_sensor_schedule?.enabled && !this._requestError) return;
    if (!this._draft) {
      const entity = this.entityId;
      const opening = this._edit();
      const generation = this._requestGeneration;
      await opening;
      if (!this._currentRequest(entity, generation) || !this._draft) return;
    }
    dismissInlineHelpWithin(this);
    this._change({ enabled });
  }

  private _setFixed(event: Event) {
    if (this.disabled || this._saving || this._loading || !this.host) return;
    const source = (event.currentTarget as HTMLSelectElement).value || null;
    if (this._draft) this._fixedDraft = source;
    else void this.host._saveZonePreconditioning(this.entityId, source
      ? { room_temperature_entity_id: source }
      : { room_temperature_entity_id: null, room_sensor_assist_enabled: false });
  }

  private _fixedPicker(source: string | null) {
    const host = this.host!;
    const options = temperatureSensorOptions(host.hass, source ?? "");
    return html`<div class="fixed-field sensor-picker-row">
      <div class="field-heading"><label for="fixed-source">${host._t("roomSensorReferenceSensor")}</label>
        ${renderInlineHelp("room-sensor-fixed-help", host._t("roomSensorTemperatureEntity"), host._t("roomSensorTemperatureEntityHelp"))}</div>
      <span class="select-wrap"><select id="fixed-source" data-field="fixed-source" .value=${source ?? ""} ?disabled=${this.disabled || this._saving || this._loading} @change=${this._setFixed}>
        <option value="" ?selected=${!source}>${host._t("roomSensorSelectSensor")}</option>
        ${options.map(sensor => html`<option value=${sensor.entityId} ?selected=${sensor.entityId === source} title=${sensor.entityId}>${options.some(other => other.entityId !== sensor.entityId && other.label === sensor.label) ? `${sensor.label} · ${sensor.entityId}` : sensor.label}</option>`)}
      </select></span>
    </div>`;
  }

  private _change(update: Partial<RoomSensorSchedule>) {
    this._draft = { ...this._draft!, ...update };
  }

  private _period(index: number, update: Partial<RoomSensorSchedulePeriod>) {
    this._change({ periods: this._draft!.periods.map((period, candidate) => candidate === index ? { ...period, ...update } : period) });
  }

  private _sourceLabel(source: string | null) {
    return source === null ? this.host!._t("roomSensorScheduleNative") : this.host!._friendlyEntityName(source);
  }

  private _sourcePicker(source: string | null, change: (source: string | null) => void, attributes: { id?: string; describedBy?: string } = {}) {
    const host = this.host!;
    const options = source && !this._sensorOptions.some(option => option.entityId === source)
      ? [...this._sensorOptions, { entityId: source, label: source }] : this._sensorOptions;
    return html`<span class="select-wrap"><select id=${attributes.id ?? nothing} aria-describedby=${attributes.describedBy ?? nothing} .value=${source ?? ""} data-field="schedule-source" title=${source ?? host._t("roomSensorScheduleNativeDetail")} ?disabled=${this.disabled || this._saving}
      @change=${(event: Event) => change((event.currentTarget as HTMLSelectElement).value || null)}>
      <option value="" ?selected=${source === null}>${host._t("roomSensorScheduleNative")}</option>
      ${options.map(sensor => html`<option value=${sensor.entityId} title=${sensor.entityId} ?selected=${sensor.entityId === source}>${options.some(other => other.entityId !== sensor.entityId && other.label === sensor.label) ? `${sensor.label} · ${sensor.entityId}` : sensor.label}</option>`)}
    </select></span>`;
  }

  private async _save() {
    if (!this._draft || !this._savedSchedule || !this.host
      || (this._draft.enabled && roomSensorScheduleError(this._draft))) return;
    const draft = !this._draft.enabled && roomSensorScheduleError(this._draft)
      ? { ...structuredClone(this._savedSchedule), enabled: false }
      : structuredClone(this._draft);
    const fixedSource = this._fixedDraft;
    const fixedChanged = fixedSource !== this._savedFixed;
    const patch: PreconditioningSettingsUpdate = { room_sensor_schedule: draft };
    if (fixedChanged) patch.room_temperature_entity_id = fixedSource;
    if (!draft.enabled && !fixedSource) patch.room_sensor_assist_enabled = false;
    const entity = this.entityId;
    const generation = ++this._requestGeneration;
    this._saving = true;
    this._requestError = undefined;
    try {
      await this.host._saveZonePreconditioning(entity, patch);
      if (!this._currentRequest(entity, generation)) return;
      // The host can catch a save error, so confirm through fresh committed detail.
      // Readback failures describe uncertainty, never claim the write was rejected.
      const saved = await this._read(entity);
      if (!this._currentRequest(entity, generation)) return;
      const owner = this.host._data?.member_to_unit?.[entity] ?? entity;
      const fixedVerified = !fixedChanged || (this.host._data?.zones[owner]?.preconditioning?.room_temperature_entity_id ?? null) === fixedSource;
      if (saved && roomSensorSchedulesEqual(saved, draft) && fixedVerified) {
        this.settings = { ...this.settings!, ...patch };
        this._cancel();
        if (saved.enabled) {
          this._open = true;
          this._draft = structuredClone(saved);
          this._savedSchedule = structuredClone(saved);
          this._fixedDraft = fixedSource;
          this._savedFixed = fixedSource;
        }
      }
      else this._requestError = "roomSensorScheduleVerificationError";
    } catch {
      if (this._currentRequest(entity, generation)) this._requestError = "roomSensorScheduleVerificationError";
    } finally {
      if (this._currentRequest(entity, generation)) this._saving = false;
    }
  }

  protected render() {
    const host = this.host;
    if (!host || !this.settings) return nothing;
    const schedule = this.settings.room_sensor_schedule;
    const effective = this.runtime?.room_sensor_schedule;
    const busy = this.disabled || this._saving || this._loading;
    const error = this._draft?.enabled ? roomSensorScheduleError(this._draft) : undefined;
    this._sensorOptions = this._draft ? temperatureSensorOptions(host.hass, "") : [];
    const scheduled = this._draft?.enabled ?? Boolean(schedule?.enabled);
    return html`<section aria-label=${host._t(this.showEditor ? "roomSensorReferenceTitle" : "roomSensorSchedule")}>
      ${this.showEditor ? html`
        <div class="reference-choice">
        <div class="reference-mode-heading"><ha-icon icon="mdi:tune-variant"></ha-icon><h3>${host._t("roomSensorAssist")}</h3>
          ${renderInlineHelp("room-sensor-reference-help", host._t("roomSensorAssist"), [host._t("roomSensorAssistHelp"), host._t("roomSensorReferenceChoiceHelp")])}</div>
        <div class="reference-modes" role="group" aria-label=${host._t("roomSensorReferenceTitle")}>
          <button type="button" class="reference-mode" data-field="reference-mode" data-action="mode-fixed" aria-pressed=${String(!scheduled)} ?disabled=${busy} @click=${() => this._selectMode(false)}>${host._t("roomSensorReferenceFixed")}</button>
          <button type="button" class="reference-mode" data-field="reference-mode" data-action="mode-schedule" aria-pressed=${String(scheduled)} ?disabled=${busy} @click=${() => this._selectMode(true)}>${host._t("roomSensorReferenceScheduled")}</button>
        </div>
        </div>` : html`<div class="reference-heading">${host._t("roomSensorSchedule")}</div>`}
      ${!this.showEditor && this.showLiveStatus && schedule?.enabled && this.settings.room_sensor_assist_enabled && effective?.enabled ? html`
        <div class="status reference-editor" role="status">
          <small>${host._t("roomSensorScheduleCurrent", { source: this._sourceLabel(effective.effective_source) })}</small>
          <small>${effective.next_change
            ? host._t("roomSensorScheduleNext", { time: host._formatDateTime(effective.next_change), source: this._sourceLabel(effective.next_source) })
            : host._t("roomSensorScheduleNoNext")}</small>
          ${this.runtime?.reason === "room_sensor_unavailable" ? html`<small>${host._t("roomSensorScheduleUnavailable")}</small>` : nothing}
        </div>` : nothing}
      ${!this.showEditor ? nothing : html`<div class="reference-editor" id="reference-editor">
      ${!scheduled && !this._loading ? this._fixedPicker(this._draft ? this._fixedDraft : this.settings.room_temperature_entity_id ?? null) : nothing}
      ${this._requestError ? html`<p class="error" role="alert">${host._t(this._requestError)}</p>` : nothing}
      ${this._loading ? html`
        <p role="status">${host._t("loading")}</p>
        <div class="actions footer"><button class="action neutral" type="button" data-action="cancel-schedule" @click=${this._close}>${host._t("cancel")}</button></div>
      ` : !this._draft ? (this._requestError ? html`<div class="actions footer"><button class="action neutral" type="button" data-action="retry-schedule" @click=${this._edit}>${host._t("roomSensorScheduleConfigure")}</button></div>` : nothing) : html`
        ${!this._draft.enabled ? nothing : html`<div class="schedule-fields">
          <div class="default-field">
            <div class="default-field-heading"><label for="schedule-default-source">${host._t("roomSensorScheduleDefault")}</label>
              <small id="schedule-default-description">${host._t("roomSensorScheduleOutsideHelp")}</small></div>
            ${this._sourcePicker(this._draft.default_source, source => this._change({ default_source: source }), { id: "schedule-default-source", describedBy: "schedule-default-description" })}
          </div>
          ${this._draft.periods.map((period, index) => html`
            <div class="period" data-period=${index}>
              <fieldset class="days" ?disabled=${busy}><legend>${host._t("roomSensorScheduleDays")}</legend>
                ${WEEKDAYS.map(day => html`<label title=${host._weekdayName(day)}><input type="checkbox" aria-label=${host._weekdayName(day)}
                  .checked=${period.weekdays.includes(day)} value=${day}
                  @change=${(event: Event) => this._period(index, { weekdays: (event.currentTarget as HTMLInputElement).checked
                    ? WEEKDAYS.filter(candidate => candidate === day || period.weekdays.includes(candidate))
                    : period.weekdays.filter(candidate => candidate !== day) })}><span>${host._shortWeekdayName?.(day) ?? host._weekdayName(day)}</span></label>`)}
              </fieldset>
              <div class="period-controls">
                <label>${host._t("roomSensorScheduleStart")}<input type="time" .value=${period.start} ?disabled=${busy}
                  @input=${(event: Event) => this._period(index, { start: (event.currentTarget as HTMLInputElement).value })}></label>
                <label>${host._t("roomSensorScheduleEnd")}<input type="time" .value=${period.end} ?disabled=${busy}
                  @input=${(event: Event) => this._period(index, { end: (event.currentTarget as HTMLInputElement).value })}></label>
                <label class="period-source">${host._t("roomSensorScheduleReference")}${this._sourcePicker(period.source, source => this._period(index, { source }))}</label>
                <button class="icon-button danger resource-item-delete" type="button" data-action="remove-period" aria-label=${host._t("remove")} title=${host._t("remove")} ?disabled=${busy}
                  @click=${() => this._change({ periods: this._draft!.periods.filter((_, candidate) => candidate !== index) })}><ha-icon icon="mdi:trash-can"></ha-icon></button>
              </div>
            </div>`)}
          ${renderAddListButton(host._t("roomSensorScheduleAdd"), () => this._change({ periods: [...this._draft!.periods, { weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"], start: "08:00", end: "17:00", source: this.settings!.room_temperature_entity_id ?? null }] }), busy, "add-period")}
        </div>`}
        ${error ? html`<p class="error" role="alert">${host._t(error)}</p>` : nothing}
        <div class="actions footer">
          <button class="action neutral" type="button" data-action="cancel-schedule" ?disabled=${busy} @click=${this._close}>${host._t("cancel")}</button>
          <button class="action primary" type="button" data-action="save-schedule" ?disabled=${busy || Boolean(error)} @click=${this._save}>${host._t("save")}</button>
        </div>`}</div>`}
    </section>`;
  }
}

function periodCount(value: PreconditioningSettings["room_sensor_schedule"]): number | undefined {
  return value ? "period_count" in value ? value.period_count : value.periods.length : undefined;
}

if (!customElements.get("velair-room-sensor-schedule")) customElements.define("velair-room-sensor-schedule", VelairRoomSensorSchedule);
