import { html, nothing } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { ACTION_SET_TEMPERATURE, ACTION_TURN_OFF } from "../constants";
import { isActiveBoostOverride } from "../domain/overrides";
import { dateMs } from "../domain/schedule-events";
import { timelineModeClass, timelineNowMarker, type TimelineBlock } from "../domain/timeline";
import type { VelairViewHost } from "../host-types";
import type { BlockDraftSource, DraftScheduleBlock, ScheduleBlock, ScheduleTemplate, ScheduleZone } from "../types";

type ScheduleViewHost = VelairViewHost;

export function renderSchedulesView(
  host: ScheduleViewHost,
  zoneIds: string[],
  selectedEntity?: string,
  selectedZone?: ScheduleZone,
) {
  return html`
    ${renderScheduleZonePicker(host, zoneIds, selectedEntity)}
    ${selectedEntity && selectedZone
      ? renderScheduleEditor(host, selectedEntity, selectedZone)
      : html`<div class="notice">${host._t("noManagedEntities")}</div>`}
  `;
}

export function renderZones(host: ScheduleViewHost, zoneIds: string[], selectedEntity?: string) {
  return html`
    <section class="zones">
      ${zoneIds.map(
        (entityId) => html`
          <button
            type="button"
            class=${[
              "zone",
              entityId === selectedEntity ? "active" : "",
              entityId === host._dirtyEntityId ? "dirty" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            @click=${() => host._selectEntity(entityId)}
          >
            ${host._friendlyEntityName(entityId)}
          </button>
        `,
      )}
    </section>
  `;
}

export function renderScheduleZonePicker(host: ScheduleViewHost, zoneIds: string[], selectedEntity?: string) {
  if (!zoneIds.length) {
    return nothing;
  }

  return html`
    <section class="schedule-zone-picker">
      <div class="schedule-step-heading">
        <strong>${host._t("scheduleStepClimate")}</strong>
      </div>
      ${renderZones(host, zoneIds, selectedEntity)}
    </section>
  `;
}

export function renderScheduleEditor(host: ScheduleViewHost, entityId: string, zone: ScheduleZone) {
  const hasValidationError = host._hasDraftValidationError("schedule");

  return html`
    <section class="schedule">
      <div class="schedule-editor-heading">
        <div>
          <strong>${host._t("scheduleStepDay")}</strong>
        </div>
        <div class="schedule-editor-badges">
          ${host._dirty && host._dirtyEntityId === entityId
            ? html`<span class="pill warning">${host._t("unsaved")}</span>`
            : nothing}
        </div>
      </div>
      ${renderBoostStatus(host, entityId, zone)}
      <div class="day-tabs">
        ${host._orderedWeekdays().map((weekday: string) => renderDayTab(host, weekday, zone.schedule[weekday] ?? []))}
      </div>
      <div class="schedule-step-heading">
        <strong>${host._t("scheduleStepConfigure")}</strong>
      </div>
      <div class="editor">
        ${renderTimeline(host, entityId, "schedule")}
        <div class="schedule-config-helper">${host._t("templateOptionalHint")}</div>
        <div class="schedule-config-row">
          ${renderTemplatePanel(host)}
        </div>
        <div class="draft-list">
          ${host._draftBlocks.length
            ? html`
                ${renderDraftListHeader(host)}
                ${host._draftBlocks.map((block: DraftScheduleBlock, index: number) =>
                  keyed(
                    editableBlockRowKey("schedule", entityId, host._selectedWeekday, index),
                    renderEditableBlock(host, block, index, "schedule"),
                  ),
                )}
                ${renderAddBlockButton(host, "schedule")}
              `
            : renderAddBlockButton(host, "schedule")}
        </div>
        <div class="schedule-save-actions">
          <button
            class="command-button primary"
            type="button"
            ?disabled=${host._templateAction === "save" || hasValidationError}
            @click=${() => host._saveTemplate(true)}
            title=${host._t("saveTemplate")}
          >
            <ha-icon icon="mdi:content-save-plus"></ha-icon>
            <span>${host._t("saveTemplate")}</span>
          </button>
          <button
            class="command-button primary"
            type="button"
            ?disabled=${host._saving || !host._dirty || hasValidationError}
            @click=${host._saveSelectedDay}
          >
            <ha-icon icon="mdi:content-save"></ha-icon>
            <span>${host._t(host._saving ? "saving" : "save")}</span>
          </button>
        </div>
        <div class="schedule-copy-helper">${host._t("scheduleCopyHint")}</div>
        ${renderCopyTargets(host)}
        ${renderZoneTargets(host)}
      </div>
    </section>
  `;
}

export function renderBoostStatus(host: ScheduleViewHost, entityId: string, zone: ScheduleZone) {
  const override = zone.override ?? host._data?.active_overrides?.[entityId];
  if (!isActiveBoostOverride(override)) {
    return nothing;
  }

  const temperature = Number(override.temperature);
  const untilMs = dateMs(override.until);
  const hvacMode = typeof override.hvac_mode === "string" ? override.hvac_mode : "";
  return html`
    <div class="boost-status">
      <ha-icon icon="mdi:lightning-bolt"></ha-icon>
      <div>
        <strong>${host._t("boostActive")}</strong>
        <span>
          ${Number.isFinite(temperature)
            ? html`${host._t("boostTarget")}: ${host._formatTemperature(temperature, entityId)}`
            : nothing}
          ${hvacMode ? html` - ${host._modeLabel(hvacMode)}` : nothing}
          ${untilMs
            ? html` - ${host._t("boostUntil")}: ${host._formatRemaining(Math.max(0, untilMs - Date.now()))}`
            : nothing}
        </span>
      </div>
    </div>
  `;
}

export function renderDayTab(host: ScheduleViewHost, weekday: string, blocks: ScheduleBlock[]) {
  return html`
    <button
      type="button"
      class=${weekday === host._selectedWeekday ? "day-tab active" : "day-tab"}
      @click=${() => host._selectWeekday(weekday)}
    >
      <span>${host._weekdayName(weekday).slice(0, 3)}</span>
      <strong>${blocks.length}</strong>
    </button>
  `;
}

export function renderTimeline(
  host: ScheduleViewHost,
  entityId: string | undefined,
  source: BlockDraftSource = "schedule",
) {
  const timelineBlocks = host._timelineBlocks(source);

  return html`
    <div class="timeline-panel">
      <div class="timeline-header">
        <span class="label">${host._t("timeline")}</span>
        <div class="timeline-hours">
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
          ${renderTimelineNowMarker(host)}
        </div>
      </div>
      <div
        class="timeline-track"
        @dragover=${host._handleTimelineDragOver}
        @drop=${(event: DragEvent) => host._handleTimelineDrop(event, source)}
      >
        ${timelineBlocks.length
          ? timelineBlocks.map((block: TimelineBlock) => renderTimelineBlock(host, block, entityId, source))
          : html`<span class="empty timeline-empty">${host._t("noBlocks")}</span>`}
      </div>
    </div>
  `;
}

export function renderTimelineNowMarker(host: ScheduleViewHost) {
  const marker = timelineNowMarker(host._currentTimelineNow());

  return html`
    <div
      class="timeline-now-marker"
      style=${`--timeline-now-left: ${marker.left}%;`}
      title=${host._t("currentTime", { time: marker.label })}
      aria-label=${host._t("currentTime", { time: marker.label })}
    >
      <span>${marker.label}</span>
    </div>
  `;
}

export function renderTimelineBlock(
  host: ScheduleViewHost,
  block: TimelineBlock,
  entityId: string | undefined,
  source: BlockDraftSource = "schedule",
) {
  const isTurnOff = block.draft.action === ACTION_TURN_OFF;
  const temperature = Number(block.draft.temperature);
  const label = isTurnOff
    ? host._t("off")
    : Number.isFinite(temperature)
      ? host._formatTemperature(temperature, entityId)
      : host._t("invalidTemperatureRange");
  const mode = isTurnOff ? "" : block.draft.hvac_mode || host._t("keep");
  const blockClass = [
    "timeline-block",
    isTurnOff ? "off" : "",
    `mode-${timelineModeClass(block.draft)}`,
    block.width < 5 ? "compact" : "",
    block.width < 2.5 ? "tiny" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return html`
    <div
      class=${blockClass}
      draggable="true"
      role="button"
      style=${`left: ${block.left}%; width: ${block.width}%;`}
      tabindex="0"
      title=${`${block.draft.start} - ${label}`}
      @dragstart=${(event: DragEvent) => host._handleTimelineDragStart(block.index, source, event)}
      @dragend=${host._handleTimelineDragEnd}
    >
      <div
        class="timeline-resize-handle left"
        title=${host._t("resizeStart")}
        draggable="false"
        @pointerdown=${(event: PointerEvent) => host._handleTimelineResizeStart(block.index, "start", source, event)}
        @dragstart=${(event: DragEvent) => event.preventDefault()}
      ></div>
      <strong>${block.draft.start}</strong>
      <span>${label}</span>
      ${mode ? html`<small>${mode}</small>` : nothing}
      ${block.nextIndex !== undefined
        ? html`
            <div
              class="timeline-resize-handle right"
              title=${host._t("resizeEnd")}
              draggable="false"
              @pointerdown=${(event: PointerEvent) =>
                host._handleTimelineResizeStart(block.index, "end", source, event)}
              @dragstart=${(event: DragEvent) => event.preventDefault()}
            ></div>
          `
        : nothing}
    </div>
  `;
}

export function renderTemplatePanel(host: ScheduleViewHost) {
  const templates = host._scheduleTemplates();

  return html`
    <div class="template-panel">
      <div>
        <span class="label">${host._t("templates")}</span>
        <span class="select-wrap">
          <select
            .value=${host._selectedTemplateKey}
            ?disabled=${!templates.length}
            @change=${(event: Event) => {
              host._selectScheduleTemplate(host._inputValue(event));
            }}
          >
            ${templates.length
              ? html`
                  <option value="">${host._t("selectTemplatePlaceholder")}</option>
                  ${templates.map((template: ScheduleTemplate) => html`<option value=${template.key}>${host._templateLabel(template)}</option>`)}
                `
              : html`<option value="">${host._t("noTemplates")}</option>`}
          </select>
        </span>
      </div>
    </div>
  `;
}

export function renderDraftListHeader(host: ScheduleViewHost) {
  return html`
    <div class="draft-list-header" aria-hidden="true">
      <span>${host._t("time")}</span>
      <span>${host._t("mode")}</span>
      <span>${host._t("temp")}</span>
      <span></span>
    </div>
  `;
}

export function renderAddBlockButton(host: ScheduleViewHost, source: BlockDraftSource = "schedule") {
  return html`
    <div class="draft-add-row">
      <button
        class="icon-button success draft-add-button"
        type="button"
        @click=${() => host._addBlock(source)}
        title=${host._t("addBlock")}
        aria-label=${host._t("addBlock")}
      >
        <ha-icon icon="mdi:plus"></ha-icon>
      </button>
    </div>
  `;
}

export function renderEditableBlock(
  host: ScheduleViewHost,
  block: DraftScheduleBlock,
  index: number,
  source: BlockDraftSource = "schedule",
) {
  const action = block.action || ACTION_SET_TEMPERATURE;
  const isTurnOff = action === ACTION_TURN_OFF;
  const selectedMode = isTurnOff ? "off" : block.hvac_mode ?? "";
  const temperatureError = host._temperatureError(block, source);
  const [minTemperature, maxTemperature] = host._temperatureLimits(source);
  const temperatureStep = host._temperatureStep(source);
  const modeOptions = host._hvacModeOptions(source);
  const displayedModeOptions = selectedMode && !modeOptions.includes(selectedMode)
    ? [...modeOptions, selectedMode]
    : modeOptions;

  return html`
    <div class=${temperatureError ? "editable-block invalid" : "editable-block"}>
      <label>
        <span class="label">${host._t("start")}</span>
        <input
          type="time"
          .value=${block.start}
          @input=${(event: Event) => host._updateDraftBlock(index, "start", host._inputValue(event), source)}
        />
      </label>
      <label>
        <span class="label">${host._t("mode")}</span>
        <span class="select-wrap">
          ${keyed(
            editableBlockModeSelectKey(source, index, selectedMode, displayedModeOptions),
            html`
              <select
                value=${selectedMode}
                .value=${selectedMode}
                @change=${(event: Event) => host._updateDraftBlock(index, "hvac_mode", host._inputValue(event), source)}
                @input=${(event: Event) => host._updateDraftBlock(index, "hvac_mode", host._inputValue(event), source)}
              >
                <option value="" .selected=${selectedMode === ""}>${host._t("keep")}</option>
                ${displayedModeOptions.map((mode: string) => html`
                  <option value=${mode} .selected=${mode === selectedMode}>${host._modeLabel(mode)}</option>
                `)}
              </select>
            `,
          )}
        </span>
      </label>
      <label>
        <span class="label">${host._t("temp")}</span>
        <input
          class=${temperatureError ? "invalid" : ""}
          type="number"
          min=${String(minTemperature)}
          max=${String(maxTemperature)}
          step=${String(temperatureStep)}
          ?disabled=${isTurnOff}
          placeholder=${isTurnOff ? host._t("off") : ""}
          .value=${isTurnOff ? "" : String(block.temperature)}
          @input=${(event: Event) => host._updateDraftBlock(index, "temperature", host._inputValue(event), source)}
          @change=${(event: Event) => host._updateDraftBlock(index, "temperature", host._inputValue(event), source)}
        />
        ${temperatureError ? html`<small class="field-error">${temperatureError}</small>` : nothing}
      </label>
      <button
        class="icon-button danger"
        type="button"
        @click=${() => host._removeBlock(index, source)}
        title=${host._t("deleteBlock")}
      >
        <ha-icon icon="mdi:trash-can"></ha-icon>
      </button>
    </div>
  `;
}

export function editableBlockRowKey(
  source: BlockDraftSource,
  entityId: string | undefined,
  weekday: string | undefined,
  index: number,
): string {
  return [source, entityId ?? "", weekday ?? "", index].join(":");
}

export function editableBlockModeSelectKey(
  source: BlockDraftSource,
  index: number,
  selectedMode: string,
  modeOptions: string[],
): string {
  return [source, index, selectedMode, modeOptions.join(",")].join(":");
}

export function renderCopyTargets(host: ScheduleViewHost) {
  const targets = host._orderedWeekdays();

  return html`
    <div class="copy-panel">
      <div class="copy-header">
        <div>
          <span class="label">${host._t("cloneDayToDays")}</span>
          <strong>${host._t("otherDays")}</strong>
        </div>
      </div>
      <div class="copy-targets">
        ${targets.map((weekday: string) => renderCopyDayTarget(host, weekday))}
      </div>
      <div class="copy-actions">
        <button
          class="command-button success"
          type="button"
          ?disabled=${host._copying || host._copyTargets.size === 0 || host._hasDraftValidationError()}
          @click=${host._copySelectedDay}
        >
          <ha-icon icon="mdi:content-copy"></ha-icon>
          <span>${host._t(host._copying ? "applying" : "cloneAction")}</span>
        </button>
      </div>
    </div>
  `;
}

export function renderCopyDayTarget(host: ScheduleViewHost, weekday: string) {
  if (weekday === host._selectedWeekday) {
    return html`
      <span class="check-target disabled" title=${host._weekdayName(weekday)}>
        <span>${host._shortWeekdayName(weekday)}</span>
      </span>
    `;
  }

  return html`
    <label class="check-target" title=${host._weekdayName(weekday)}>
      <input
        type="checkbox"
        .checked=${host._copyTargets.has(weekday)}
        @change=${(event: Event) => host._toggleCopyTarget(weekday, (event.currentTarget as HTMLInputElement).checked)}
      />
      <span>${host._shortWeekdayName(weekday)}</span>
    </label>
  `;
}

export function renderZoneTargets(host: ScheduleViewHost) {
  const targets = host._orderedZoneIds(host._data?.configured_entities ?? []).filter(
    (entityId: string) => entityId !== host._selectedEntity,
  );

  if (!targets.length) {
    return nothing;
  }

  return html`
    <div class="copy-panel">
      <div class="copy-header">
        <div>
          <span class="label">${host._t("cloneDayToThermostats")}</span>
          <strong>${host._t("otherThermostats")}</strong>
        </div>
      </div>
      <div class="copy-targets wide">
        ${targets.map(
          (entityId: string) => html`
            <label class="check-target">
              <input
                type="checkbox"
                .checked=${host._zoneTargets.has(entityId)}
                @change=${(event: Event) =>
                  host._toggleZoneTarget(entityId, (event.currentTarget as HTMLInputElement).checked)}
              />
              <span>${host._friendlyEntityName(entityId)}</span>
            </label>
          `,
        )}
      </div>
      <div class="copy-actions">
        <button
          class="command-button success"
          type="button"
          ?disabled=${host._applyingZones || host._zoneTargets.size === 0 || host._hasDraftValidationError()}
          @click=${host._applySelectedDayToZones}
        >
          <ha-icon icon="mdi:content-copy"></ha-icon>
          <span>${host._t(host._applyingZones ? "applying" : "cloneAction")}</span>
        </button>
      </div>
    </div>
  `;
}
