import { html, nothing } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { firstTemperatureStepAtOrAbove } from "../domain/climate";
import { draftBlockUsesRange } from "../domain/draft-blocks";
import { ACTION_SET_TEMPERATURE, ACTION_TURN_OFF } from "../constants";
import { isActiveBoostOverride } from "../domain/overrides";
import { dateMs } from "../domain/schedule-events";
import {
  timelineCarryOverFromWeeklySchedule,
  timelineModeClass,
  timelineNowMarker,
  type TimelineBlock,
  type TimelineCarryOverBlock,
} from "../domain/timeline";
import type { VelairViewHost } from "../host-types";
import type { BlockDraftSource, DraftScheduleBlock, ScheduleBlock, ScheduleTemplate, ScheduleZone } from "../types";
import "../components/profiles-view-element";
import { renderWeeklyScheduleEditor } from "./weekly-schedule-editor";

type ScheduleViewHost = VelairViewHost;

export function renderSchedulesView(
  host: ScheduleViewHost,
  zoneIds: string[],
  selectedEntity?: string,
  selectedZone?: ScheduleZone,
) {
  if (!host._hasExternalConfig && host._scheduleSource === "profile") {
    return html`
      ${renderScheduleSourceSelector(host)}
      <velair-profiles-view
        workspace="profiles"
        schedule-workspace
        .initialWeekday=${host._selectedWeekday}
        .timelineNow=${host._currentTimelineNow()}
        .hass=${host.hass}
        .data=${host._data}
        @velair-dirty-changed=${(event: CustomEvent<{ dirty: boolean }>) => {
          event.stopPropagation();
          host._setProfileScheduleDirty(Boolean(event.detail?.dirty));
        }}
        @profile-data-changed=${(event: CustomEvent) => host._applyScheduleData(event.detail, { forceDraft: false })}
        @profile-success=${(event: CustomEvent<string>) => host._showSuccess(event.detail)}
      ></velair-profiles-view>
    `;
  }
  return html`
    ${host._hasExternalConfig ? nothing : renderScheduleSourceSelector(host)}
    ${renderScheduleZonePicker(host, zoneIds, selectedEntity)}
    ${selectedEntity && selectedZone
      ? renderScheduleEditor(host, selectedEntity, selectedZone)
      : html`<div class="notice">${host._t("noManagedEntities")}</div>`}
  `;
}

export function renderScheduleSourceSelector(host: ScheduleViewHost) {
  return html`
    <div class="schedule-source-selector" role="group" aria-label=${host._t("scheduleSourceLabel")}>
      <button
        type="button"
        aria-pressed=${String(host._scheduleSource === "default")}
        class=${host._scheduleSource === "default" ? "active" : ""}
        @click=${() => host._selectScheduleSource("default")}
      >
        <ha-icon icon="mdi:calendar-clock"></ha-icon>
        <span><strong>${host._t("defaultSchedules")}</strong><small>${host._t("defaultSchedulesDescription")}</small></span>
      </button>
      <button
        type="button"
        aria-pressed=${String(host._scheduleSource === "profile")}
        class=${host._scheduleSource === "profile" ? "active" : ""}
        @click=${() => host._selectScheduleSource("profile")}
      >
        <ha-icon icon="mdi:account-switch-outline"></ha-icon>
        <span><strong>${host._t("profileSchedules")}</strong><small>${host._t("profileSchedulesDescription")}</small></span>
      </button>
    </div>
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
      ${renderWeeklyScheduleEditor({
        dayTabs: html`<div class="day-tabs">
          ${host._orderedWeekdays().map((weekday: string) => renderDayTab(host, weekday, zone.schedule[weekday] ?? []))}
        </div>`,
        timeline: renderTimeline(host, entityId, "schedule", {
          schedule: zone.schedule,
          weekday: host._selectedWeekday,
        }),
        configureHeading: host._t("scheduleStepConfigure"),
        helper: host._t("templateOptionalHint"),
        templatePanel: renderTemplatePanel(host),
        blockList: html`<div class="draft-list">
          ${host._draftBlocks.length
            ? html`
                ${renderDraftListHeader(host, "schedule")}
                ${host._draftBlocks.map((block: DraftScheduleBlock, index: number) =>
                  keyed(
                    editableBlockRowKey("schedule", entityId, host._selectedWeekday, index),
                    renderEditableBlock(host, block, index, "schedule"),
                  ),
                )}
                ${renderAddBlockButton(host, "schedule")}
              `
            : renderAddBlockButton(host, "schedule")}
        </div>`,
        primaryActions: html`<div class="schedule-save-actions">
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
        </div>`,
        copyPanels: html`
          <div class="schedule-copy-helper">${host._t("scheduleCopyHint")}</div>
          ${renderCopyTargets(host)}
          ${renderZoneTargets(host)}
        `,
      })}
    </section>
  `;
}

export function renderBoostStatus(host: ScheduleViewHost, entityId: string, zone: ScheduleZone) {
  const override = zone.override ?? host._data?.active_overrides?.[entityId];
  if (!isActiveBoostOverride(override)) {
    return nothing;
  }

  const temperature = Number(override.temperature);
  const low = Number(override.target_temp_low);
  const high = Number(override.target_temp_high);
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
            : Number.isFinite(low) && Number.isFinite(high)
              ? html`${host._t("boostTarget")}: ${formatRange(host, low, high, entityId)}`
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
  weekly?: {
    schedule: Partial<Record<string, readonly (ScheduleBlock | DraftScheduleBlock)[]>>;
    weekday: string;
  },
) {
  const timelineBlocks = host._timelineBlocks(source);
  const carryOver = weekly
    ? timelineCarryOverFromWeeklySchedule({
        ...weekly.schedule,
        [weekly.weekday]: timelineBlocks.map((block) => block.draft),
      }, weekly.weekday)
    : undefined;

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
        ${timelineBlocks.length || carryOver
          ? html`
              ${carryOver ? renderTimelineCarryOverBlock(host, carryOver, entityId) : nothing}
              ${timelineBlocks.map((block: TimelineBlock) => renderTimelineBlock(host, block, entityId, source))}
            `
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
  const low = Number(block.draft.target_temp_low);
  const high = Number(block.draft.target_temp_high);
  const label = isTurnOff
    ? host._t("off")
    : draftBlockUsesRange(block.draft) && Number.isFinite(low) && Number.isFinite(high)
      ? formatRange(host, low, high, entityId)
      : Number.isFinite(temperature)
      ? host._formatTemperature(temperature, entityId)
      : host._t("invalidTemperatureRange");
  const displayStart = host._formatScheduleTime(block.draft.start);
  const mode = isTurnOff ? "" : block.draft.hvac_mode || host._t("keep");
  const optionItems = climateOptionSummaryItems(host, block.draft);
  const optionSummary = optionItems.map((item) => item.short).join(" • ");
  const title = [
    `${displayStart} - ${label}`,
    mode ? `${host._t("mode")}: ${mode}` : "",
    ...optionItems.map((item) => `${item.label}: ${item.value}`),
  ].filter(Boolean).join("\n");
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
      title=${title}
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
      <strong>${displayStart}</strong>
      <span>${label}</span>
      ${mode || optionSummary
        ? html`<small>${[mode, optionSummary].filter(Boolean).join(" • ")}</small>`
        : nothing}
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
              const select = event.currentTarget as HTMLSelectElement;
              host._selectScheduleTemplate(host._inputValue(event));
              select.value = host._selectedTemplateKey;
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

export function renderDraftListHeader(host: ScheduleViewHost, source: BlockDraftSource = "schedule") {
  const unit = host._temperatureUnit?.(source === "schedule" ? host._selectedEntity : undefined) ?? "°C";
  return html`
    <div class="draft-list-header" aria-hidden="true">
      <span>${host._t("time")}</span>
      <span>${host._t("mode")}</span>
      <span>${host._t("target")} (${unit})</span>
      <span></span>
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
  const usesRange = draftBlockUsesRange(block);
  const [minTemperature, maxTemperature] = host._temperatureLimits(source);
  const temperatureStep = host._temperatureStep(source);
  const inputMinTemperature = firstTemperatureStepAtOrAbove(minTemperature, temperatureStep);
  const temperatureUnit = host._temperatureUnit?.(source === "schedule" ? host._selectedEntity : undefined) ?? "°C";
  const modeOptions = host._hvacModeOptions(source);
  const displayedModeOptions = selectedMode && !modeOptions.includes(selectedMode)
    ? [...modeOptions, selectedMode]
    : modeOptions;
  const fanModeOptions = host._fanModeOptions(source);
  const presetModeOptions = host._presetModeOptions(source);
  const swingModeOptions = host._swingModeOptions(source);
  const swingHorizontalModeOptions = host._swingHorizontalModeOptions(source);
  const humidityLimits = host._humidityLimits(source);
  const hasSupportedClimateOptions = !isTurnOff && (
    fanModeOptions.length > 0 ||
    presetModeOptions.length > 0 ||
    swingModeOptions.length > 0 ||
    swingHorizontalModeOptions.length > 0 ||
    Boolean(humidityLimits)
  );
  const optionItems = climateOptionSummaryItems(host, block);
  const hasSelectedClimateOptions = optionItems.length > 0;
  const hasClimateOptions = hasSupportedClimateOptions || hasSelectedClimateOptions;
  const optionSummary = hasSelectedClimateOptions
    ? optionItems.map((item) => item.short).join(" • ")
    : host._t("climateOptionsAdd");

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
      ${usesRange
        ? renderRangeTargetInputs(
            host,
            block,
            index,
            source,
            inputMinTemperature,
            maxTemperature,
            temperatureStep,
            isTurnOff,
            temperatureError,
            temperatureUnit,
          )
        : renderTargetInput(host, block, index, source, "temperature", "temp", temperatureUnit,
            inputMinTemperature, maxTemperature, temperatureStep, isTurnOff, temperatureError)}
      ${hasClimateOptions
        ? html`
            <details class="advanced-climate-options" @toggle=${handleClimateOptionsToggle}>
              <summary
                class="icon-button climate-options-toggle"
                title=${optionItems.map((item) => `${item.label}: ${item.value}`).join("\n") || host._t("climateOptions")}
                aria-label=${host._t("climateOptions")}
                @click=${handleClimateOptionsSummaryClick}
              >
                <ha-icon icon="mdi:tune-variant"></ha-icon>
                ${hasSelectedClimateOptions
                  ? html`<span class="climate-options-badge">${optionItems.length}</span>`
                  : nothing}
              </summary>
              <button
                class="climate-options-scrim"
                type="button"
                aria-label=${host._t("dismiss")}
                @click=${closeClimateOptionsDialog}
              ></button>
              <fieldset class="advanced-climate-options-fields">
                <legend>${host._t("climateOptions")}</legend>
                ${renderAdvancedOptionSelect(
                  host,
                  block,
                  index,
                  source,
                  "fan_mode",
                  "fanMode",
                  fanModeOptions,
                )}
                ${renderAdvancedOptionSelect(
                  host,
                  block,
                  index,
                  source,
                  "preset_mode",
                  "presetMode",
                  presetModeOptions,
                )}
                ${renderAdvancedOptionSelect(
                  host,
                  block,
                  index,
                  source,
                  "swing_mode",
                  "swingMode",
                  swingModeOptions,
                )}
                ${renderAdvancedOptionSelect(
                  host,
                  block,
                  index,
                  source,
                  "swing_horizontal_mode",
                  "horizontalSwingMode",
                  swingHorizontalModeOptions,
                )}
                ${humidityLimits || String(block.humidity ?? "").trim()
                  ? html`
                      <label>
                        <span class="label">${host._t("targetHumidity")}</span>
                        <input
                          type="number"
                          min=${String(humidityLimits?.[0] ?? 0)}
                          max=${String(humidityLimits?.[1] ?? 100)}
                          step="1"
                          placeholder=${host._t("notSet")}
                          .value=${String(block.humidity ?? "")}
                          @input=${(event: Event) =>
                            host._updateDraftBlock(index, "humidity", host._inputValue(event), source)}
                          @change=${(event: Event) =>
                            host._updateDraftBlock(index, "humidity", host._inputValue(event), source)}
                        />
                      </label>
                    `
                  : nothing}
              </fieldset>
            </details>
          `
        : html`<span class="advanced-climate-options-placeholder" aria-hidden="true"></span>`}
      <button
        class="icon-button danger"
        type="button"
        @click=${() => host._removeBlock(index, source)}
        title=${host._t("deleteBlock")}
      >
        <ha-icon icon="mdi:trash-can"></ha-icon>
      </button>
      ${hasSelectedClimateOptions
        ? html`
            <small
              class="climate-options-inline-summary"
              title=${optionItems.map((item) => `${item.label}: ${item.value}`).join("\n")}
            >
              ${optionSummary}
            </small>
          `
        : nothing}
    </div>
  `;
}

export function renderTimelineCarryOverBlock(
  host: ScheduleViewHost,
  carryOver: TimelineCarryOverBlock<ScheduleBlock | DraftScheduleBlock>,
  entityId?: string,
) {
  const block = carryOver.block;
  const isTurnOff = block.action === ACTION_TURN_OFF;
  const temperature = Number(block.temperature);
  const low = Number(block.target_temp_low);
  const high = Number(block.target_temp_high);
  const label = isTurnOff
    ? host._t("off")
    : draftBlockUsesRange(block) && Number.isFinite(low) && Number.isFinite(high)
      ? formatRange(host, low, high, entityId)
      : Number.isFinite(temperature)
        ? host._formatTemperature(temperature, entityId)
        : host._t("invalidTemperatureRange");
  const mode = isTurnOff ? "" : block.hvac_mode || host._t("keep");
  const continuation = host._t("timelineContinuesFrom", {
    day: host._shortWeekdayName(carryOver.sourceWeekday),
    time: host._formatScheduleTime(block.start),
  });
  const detail = [continuation, label, mode ? `${host._t("mode")}: ${mode}` : ""]
    .filter(Boolean)
    .join(" - ");
  const blockClass = [
    "timeline-block",
    "timeline-carry-over",
    isTurnOff ? "off" : "",
    `mode-${timelineModeClass(block)}`,
    carryOver.width < 5 ? "compact" : "",
    carryOver.width < 2.5 ? "tiny" : "",
  ].filter(Boolean).join(" ");

  return html`
    <div
      class=${blockClass}
      draggable="false"
      role="img"
      style=${`left: 0%; width: ${carryOver.width}%;`}
      title=${detail}
      aria-label=${detail}
    >
      <strong>${continuation}</strong>
      <span>${label}</span>
      ${mode ? html`<small>${mode}</small>` : nothing}
    </div>
  `;
}

function renderTargetInput(
  host: ScheduleViewHost,
  block: DraftScheduleBlock,
  index: number,
  source: BlockDraftSource,
  field: "temperature" | "target_temp_low" | "target_temp_high",
  labelKey: "temp" | "heatBelow" | "coolAbove",
  unit: string,
  minimum: number,
  maximum: number,
  step: number | undefined,
  disabled: boolean,
  error?: string,
) {
  return html`
    <label class=${field === "temperature" ? "single-temperature-field" : "range-temperature-field"}>
      <span class="label">${host._t(labelKey)} (${unit})</span>
      <input
        class=${error ? "invalid" : ""}
        type="number"
        min=${String(minimum)}
        max=${String(maximum)}
        step=${step === undefined ? "any" : String(step)}
        ?disabled=${disabled}
        placeholder=${disabled ? host._t("off") : ""}
        .value=${disabled ? "" : String(block[field] ?? "")}
        @input=${(event: Event) => host._updateDraftBlock(index, field, host._inputValue(event), source)}
        @change=${(event: Event) => host._updateDraftBlock(index, field, host._inputValue(event), source)}
      />
      ${field === "temperature" && error ? html`<small class="field-error">${error}</small>` : nothing}
    </label>
  `;
}

function renderRangeTargetInputs(
  host: ScheduleViewHost,
  block: DraftScheduleBlock,
  index: number,
  source: BlockDraftSource,
  minimum: number,
  maximum: number,
  step: number | undefined,
  disabled: boolean,
  error?: string,
  unit = "°C",
) {
  return html`
    <div class="temperature-range-fields" role="group" aria-label=${host._t("temperatureRange")}>
      <div class=${error ? "temperature-range-control invalid" : "temperature-range-control"}>
        ${renderRangeTargetInput(
          host,
          block,
          index,
          source,
          "target_temp_low",
          "minimumShort",
          "heatBelow",
          minimum,
          maximum,
          step,
          disabled,
          unit,
        )}
        ${renderRangeTargetInput(
          host,
          block,
          index,
          source,
          "target_temp_high",
          "maximumShort",
          "coolAbove",
          minimum,
          maximum,
          step,
          disabled,
          unit,
        )}
      </div>
      ${error ? html`<small class="field-error range-error">${error}</small>` : nothing}
    </div>
  `;
}

function renderRangeTargetInput(
  host: ScheduleViewHost,
  block: DraftScheduleBlock,
  index: number,
  source: BlockDraftSource,
  field: "target_temp_low" | "target_temp_high",
  shortLabelKey: "minimumShort" | "maximumShort",
  accessibleLabelKey: "heatBelow" | "coolAbove",
  minimum: number,
  maximum: number,
  step: number | undefined,
  disabled: boolean,
  unit: string,
) {
  return html`
    <label class="range-temperature-field">
      <span class="range-input-label" aria-hidden="true">${host._t(shortLabelKey)}</span>
      <input
        type="number"
        inputmode="decimal"
        min=${String(minimum)}
        max=${String(maximum)}
        step=${step === undefined ? "any" : String(step)}
        ?disabled=${disabled}
        placeholder=${disabled ? host._t("off") : ""}
        aria-label=${`${host._t(accessibleLabelKey)} (${unit})`}
        .value=${disabled ? "" : String(block[field] ?? "")}
        @input=${(event: Event) => host._updateDraftBlock(index, field, host._inputValue(event), source)}
        @change=${(event: Event) => host._updateDraftBlock(index, field, host._inputValue(event), source)}
      />
    </label>
  `;
}

function formatRange(host: ScheduleViewHost, low: number, high: number, entityId?: string): string {
  const formattedLow = host._formatTemperature(low, entityId).replace(/\s+[^\s]+$/, "");
  return `${formattedLow}–${host._formatTemperature(high, entityId)}`;
}

function handleClimateOptionsSummaryClick(event: Event): void {
  const summary = event.currentTarget;
  if (!(summary instanceof HTMLElement)) {
    return;
  }
  const currentDetails = summary.closest("details");
  const root = summary.getRootNode();
  if (!(root instanceof Document || root instanceof ShadowRoot)) {
    return;
  }
  root.querySelectorAll<HTMLDetailsElement>(".advanced-climate-options[open]").forEach((details) => {
    if (details !== currentDetails) {
      details.open = false;
    }
  });
}

function closeClimateOptionsDialog(event: Event): void {
  event.preventDefault();
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const details = target.closest("details");
  if (details instanceof HTMLDetailsElement) {
    details.open = false;
  }
}

function handleClimateOptionsToggle(event: Event): void {
  const details = event.currentTarget;
  if (!(details instanceof HTMLDetailsElement) || !details.open) {
    return;
  }
  const summary = details.querySelector("summary");
  if (summary instanceof HTMLElement) {
    positionClimateOptionsDialog(summary, details);
  }
}

function positionClimateOptionsDialog(summary: HTMLElement, details: HTMLElement): void {
  const rect = summary.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const margin = 16;
  const gap = 8;
  const width = Math.max(280, Math.min(420, viewportWidth - margin * 2));
  const preferredLeft = rect.left + rect.width / 2 - width / 2;
  const left = Math.max(margin, Math.min(preferredLeft, viewportWidth - width - margin));
  const availableBelow = Math.max(0, viewportHeight - rect.bottom - gap - margin);
  const availableAbove = Math.max(0, rect.top - gap - margin);
  const shouldOpenAbove = availableAbove > availableBelow && availableBelow < 260;
  const maxHeight = Math.max(180, shouldOpenAbove ? availableAbove : availableBelow);
  const top = shouldOpenAbove ? rect.top - gap : rect.bottom + gap;

  details.style.setProperty("--climate-options-left", `${Math.round(left)}px`);
  details.style.setProperty("--climate-options-top", `${Math.round(top)}px`);
  details.style.setProperty("--climate-options-width", `${Math.round(width)}px`);
  details.style.setProperty("--climate-options-max-height", `${Math.round(maxHeight)}px`);
  details.style.setProperty("--climate-options-translate-y", shouldOpenAbove ? "-100%" : "0");
}

function renderAdvancedOptionSelect(
  host: ScheduleViewHost,
  block: DraftScheduleBlock,
  index: number,
  source: BlockDraftSource,
  field: keyof DraftScheduleBlock,
  labelKey: Parameters<ScheduleViewHost["_t"]>[0],
  options: string[],
) {
  const selectedValue = String(block[field] ?? "");
  const displayedOptions = selectedValue && !options.includes(selectedValue)
    ? [...options, selectedValue]
    : options;
  if (!displayedOptions.length && !selectedValue) {
    return nothing;
  }

  return html`
    <label>
      <span class="label">${host._t(labelKey)}</span>
      <span class="select-wrap">
        <select
          .value=${selectedValue}
          @change=${(event: Event) => host._updateDraftBlock(index, field, host._inputValue(event), source)}
          @input=${(event: Event) => host._updateDraftBlock(index, field, host._inputValue(event), source)}
        >
          <option value="" .selected=${selectedValue === ""}>${host._t("notSet")}</option>
          ${displayedOptions.map((option: string) => html`
            <option value=${option} .selected=${option === selectedValue}>${option}</option>
          `)}
        </select>
      </span>
    </label>
  `;
}

function climateOptionSummaryItems(host: ScheduleViewHost, block: DraftScheduleBlock) {
  const items: Array<{ label: string; short: string; value: string }> = [];
  const add = (labelKey: Parameters<ScheduleViewHost["_t"]>[0], value: unknown) => {
    if (typeof value !== "string" || !value.trim()) {
      return;
    }
    const label = host._t(labelKey);
    items.push({
      label,
      short: `${label}: ${value}`,
      value,
    });
  };

  add("fanMode", block.fan_mode);
  add("presetMode", block.preset_mode);
  add("swingMode", block.swing_mode);
  add("horizontalSwingMode", block.swing_horizontal_mode);
  if (String(block.humidity ?? "").trim()) {
    const label = host._t("targetHumidity");
    const value = `${block.humidity}%`;
    items.push({
      label,
      short: `${label}: ${value}`,
      value,
    });
  }
  return items;
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
  const targets = host._visibleZoneIds(host._data?.configured_entities ?? []).filter(
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
