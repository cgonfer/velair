import { renderRoomGroupScheduleNotice } from "./room-group-summary";
import { renderAddListButton } from "./add-list-button";
import { controlUnitState } from "../domain/control-units";
import { editorTargetFormats } from "../domain/target-format-policy";
import { renderTimelineGraphic, timelineGraphicClasses } from "./timeline-block-graphic";
import { linkedDraftBlocks, linkedDayBlocks } from "../domain/linked-schedules";
import { selectedDayGroup, schedulesEqual, resolveDayLayout, dayConfigurationFingerprint } from "../domain/day-layouts";
import { cloneThermostatsLabel, renderDayLayoutControls, renderScheduleDayTabs, renderDayScheduleConflict, renderGroupSaveSummary } from "./day-layout-controls";
import { availableScheduleTemplates } from "../domain/templates";
import { renderInlineHelp } from "./inline-help";
import { renderDocumentationHelp } from "./documentation-links";
import { html, nothing } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { firstTemperatureStepAtOrAbove } from "../domain/climate";
import { keepTargetMismatch } from "../domain/block-guidance";
import { draftBlockHasClimateOptions, draftBlockUsesRange } from "../domain/draft-blocks";
import { ACTION_SET_CLIMATE_OPTIONS, ACTION_SET_HVAC_MODE, ACTION_SET_TEMPERATURE, ACTION_TURN_OFF } from "../constants";
import { isActiveBoostOverride } from "../domain/overrides";
import { dateMs } from "../domain/schedule-events";
import { externalSwitchpointUsage } from "../domain/schedule-editor";
import {
  timelineCarryOverFromWeeklySchedule,
  timelineModeClass,
  timelineNowMarker,
  type TimelineBlock,
  type TimelineCarryOverBlock,
} from "../domain/timeline";
import type { VelairViewHost } from "../host-types";
import type { BlockDraftSource, DraftScheduleBlock, ScheduleBlock, ScheduleTemplate, ScheduleZone, TemplateLink } from "../types";
import "../components/profiles-view-element";
import { renderWeeklyScheduleEditor } from "./weekly-schedule-editor";
import { renderCloneDayPresets, renderExternalSwitchpointUsage } from "./schedule-editor-controls";
import { availableBlockPresets, resolvedResourceBlock } from "../domain/resource-display";

type ScheduleViewHost = VelairViewHost;
const editorHelpIds = new WeakMap<object, number>();
let nextEditorHelpId = 0;

export function presetConfigurationSummary(config: import("../types").BlockConfiguration, host?: ScheduleViewHost): string {
  if (!host) return Object.entries(config).filter(([key, value]) => value !== undefined && !["start", "slot_id", "preset_key"].includes(key)).map(([key, value]) => `${key}: ${value}`).join(" · ");
  const items: string[] = [];
  if (config.action === "turn_off") return host._t("off");
  if (config.temperature_only) items.push(host._t("temperatureOnly"));
  if (config.hvac_mode) items.push(host._modeLabel(config.hvac_mode));
  if (config.temperature !== undefined) items.push(host._formatTemperature(config.temperature));
  if (config.target_temp_low !== undefined && config.target_temp_high !== undefined) items.push(`${host._formatTemperature(config.target_temp_low)} – ${host._formatTemperature(config.target_temp_high)}`);
  const labels = { fan_mode: "fanMode", preset_mode: "presetMode", swing_mode: "swingMode", swing_horizontal_mode: "horizontalSwingMode", humidity: "targetHumidity" } as const;
  for (const [field, label] of Object.entries(labels)) { const value = config[field as keyof typeof labels]; if (value !== undefined) items.push(`${host._t(label)}: ${value}`); }
  return items.join(" · ");
}

export function renderLinkedHoursControl(host: ScheduleViewHost) {
  const link = host._draftTemplateLink;
  const helpId = scheduleHelpId(host, "source");
  return html`
    <div class=${link ? "hours-source-control linked" : "hours-source-control"}>
      <div class="hours-source-field">
        <span class="hours-source-label">
          <label class="label" for=${`${helpId}-select`}>${host._t("scheduleHoursSource")}</label>
          ${renderInlineHelp(helpId, host._t("scheduleHoursSource"), host._t(link?.mode === "full" ? "linkedFullHelp" : "linkedHoursHelp"))}
        </span>
        <span class="select-wrap">
          <select
            id=${`${helpId}-select`}
            aria-label=${host._t("scheduleHoursSource")}
            .value=${link?.template_key ?? ""}
            ?disabled=${host._materializingTemplate}
            @change=${async (event: Event) => {
              const select = event.currentTarget as HTMLSelectElement;
              const previous = link?.template_key ?? "";
              const key = host._inputValue(event);
              if (key === previous) return;
              const changed = await (key ? host._setDayTemplateLink?.(key) : host._restoreOwnDaySchedule?.());
              if (changed === false) select.value = previous;
            }}
          >
            <option value="" .selected=${!link}>${host._t("ownSchedule")}</option>
            ${availableScheduleTemplates(host._data?.templates).map((template) => html`<option value=${template.key} .selected=${template.key === link?.template_key}>${template.name}</option>`)}
          </select>
        </span>
      </div>
      ${link ? html`
        <label class="template-link-scope"><span class="label">${host._t("templateLinkScope")}</span>
          <span class="select-wrap"><select aria-label=${host._t("templateLinkScope")} .value=${link.mode ?? "hours"}
            ?disabled=${host._materializingTemplate}
            @change=${async (event: Event) => { const select = event.currentTarget as HTMLSelectElement; if (await host._setDayTemplateScope?.(select.value as "hours" | "full") === false) select.value = link.mode ?? "hours"; }}>
            <option value="hours">${host._t("templateLinkHours")}</option><option value="full">${host._t("templateLinkFull")}</option>
          </select></span>
        </label>
        <div class="hours-source-actions">
          <button type="button" class="command-button" ?disabled=${host._materializingTemplate} @click=${() => host._unlinkDayTemplate?.()}>
            <ha-icon icon="mdi:link-off"></ha-icon>
            <span>${host._t("unlinkHours")}</span>
          </button>
        </div>
      ` : nothing}
    </div>
  `;
}

function scheduleHelpId(host: ScheduleViewHost, suffix: string): string {
  const editor = host.renderRoot ?? host;
  if (!editorHelpIds.has(editor)) editorHelpIds.set(editor, ++nextEditorHelpId);
  return ["velair-hours", ...(host._blockEditorIdPrefix ? [host._blockEditorIdPrefix] : []), editorHelpIds.get(editor), host._resourceProfileKey === undefined ? "default" : "profile", host._resourceProfileKey ?? "", host._selectedEntity ?? "reference", host._selectedWeekday ?? "daily", suffix].map((part) => encodeURIComponent(String(part))).join("-");
}

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
        @profile-error=${(event: CustomEvent<string | null>) => host._showError(event.detail ?? undefined)}
        @profile-success=${(event: CustomEvent<string>) => host._showSuccess(event.detail)}
        @velair-edit-preset=${(event: CustomEvent<string>) => host._editPreset?.(event.detail)}
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
      <div class=${host._scheduleSource === "default" ? "schedule-source-option active" : "schedule-source-option"}>
      <button
        type="button"
        aria-pressed=${String(host._scheduleSource === "default")}
        class=${host._scheduleSource === "default" ? "active" : ""}
        @click=${() => host._selectScheduleSource("default")}
      >
        <ha-icon icon="mdi:calendar-clock"></ha-icon>
        <span><strong>${host._t("defaultSchedules")}</strong><small>${host._t("defaultSchedulesDescription")}</small></span>
      </button>
      ${renderDocumentationHelp(host, "schedules", { title: "defaultSchedules", summary: "defaultSchedulesDescription" })}
      </div>
      <div class=${host._scheduleSource === "profile" ? "schedule-source-option active" : "schedule-source-option"}>
      <button
        type="button"
        aria-pressed=${String(host._scheduleSource === "profile")}
        class=${host._scheduleSource === "profile" ? "active" : ""}
        @click=${() => host._selectScheduleSource("profile")}
      >
        <ha-icon icon="mdi:account-switch-outline"></ha-icon>
        <span><strong>${host._t("profileSchedules")}</strong><small>${host._t("profileSchedulesDescription")}</small></span>
      </button>
      ${renderDocumentationHelp(host, "profiles", { title: "profileSchedules", summary: "profileSchedulesDescription" })}
      </div>
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
            ?disabled=${host._saving}
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
        ${host._hasExternalConfig ? renderDocumentationHelp(host, "schedules") : nothing}
      </div>
      ${renderZones(host, zoneIds, selectedEntity)}
    </section>
  `;
}

export function renderScheduleEditor(host: ScheduleViewHost, entityId: string, zone: ScheduleZone) {
  const layoutKey = host._draftDayLayoutKey ?? zone.day_layout_key ?? "individual";
  const days = selectedDayGroup(layoutKey, host._selectedWeekday);
  const mixed = !schedulesEqual(zone, days);
  const grouped = resolveDayLayout(layoutKey).layout.key !== "individual";
  const dayTabs = renderScheduleDayTabs({ _t: host._t.bind(host), _weekdayName: (day) => host._weekdayName?.(day) ?? day, _shortWeekdayName: (day) => host._shortWeekdayName?.(day) ?? day.slice(0, 3) }, {
    layoutKey, disabled: host._saving, selectedDay: host._selectedWeekday, orderedWeekdays: host._orderedWeekdays(),
    onSelect: (day) => host._selectWeekday(day),
    blockCount: (day) => (host._data?.resolved_default_schedules?.[entityId]?.[day] ?? zone.schedule[day] ?? []).length,
  });
  const conflictBlocks = (day: string) => {
    const link = zone.template_links?.[day];
    const resolved = host._data?.resolved_default_schedules?.[entityId]?.[day];
    const rawBlocks = link ? linkedDayBlocks(link, host._data?.templates ?? []) : zone.schedule[day] ?? [];
    const blocks = resolved ?? (link ? linkedDraftBlocks(link, host._data?.templates ?? [], host._data?.temperature_unit) : zone.schedule[day] ?? []);
    return blocks.map((block, index) => {
      const presetKey = block.preset_key ?? rawBlocks.find(item => block.slot_id ? item.slot_id === block.slot_id : item.start === block.start)?.preset_key;
      const referenced = Boolean(presetKey || link?.mode === "full");
      const effective = resolved || !referenced ? Object.fromEntries(Object.entries(block).map(([key, value]) => [key, ["temperature", "target_temp_low", "target_temp_high", "humidity"].includes(key) && typeof value === "string" ? Number(value) : value])) as ScheduleBlock : undefined;
      const graphic = effective ? { ...timelinePresentation(host, effective, entityId, "schedule", day, index, false, true, { link }), presetKey, templateKey: link?.template_key } : undefined;
      const presetLabel = presetKey ? availableBlockPresets(host._data).find(item => item.key === presetKey)?.name ?? presetKey : undefined;
      return { start: block.start, block: effective, graphic, details: graphic?.details, presetLabel, time: host._formatScheduleTime(block.start), description: effective
        ? presetConfigurationSummary(effective, host) : host._t(presetKey ? "sharedPresetUnavailable" : "linkedConfigurationUnavailable") };
    });
  };
  const hasValidationError = host._hasDraftValidationError("schedule");
  const externallyManaged = zone.execution?.type === "external";
  const externalCapabilities = externallyManaged
    ? host._data?.external_execution?.systems.find(
      (system) => system.provider === zone.execution?.provider,
    )?.capabilities
    : undefined;

  return html`
    <section class="schedule">
      ${renderRoomGroupScheduleNotice(host, host._data?.room_groups?.[entityId])}
      ${(host._data?.resource_diagnostics ?? []).filter((item) => item.source === "default" && item.entity_id === entityId).map((item) => html`<div class="notice error">${item.message}</div>`)}
      <div class="schedule-editor-heading">
        <div>
          <strong>${host._t("scheduleStepDay")}</strong>
        </div>
        <div class="schedule-editor-badges">
          ${externallyManaged
            ? html`<span class="pill">${host._t("overviewZoneExternal")}</span>`
            : nothing}
          ${host._dirty && host._dirtyEntityId === entityId
            ? html`<span class="pill warning">${host._t("unsaved")}</span>`
            : nothing}
        </div>
      </div>
      ${externallyManaged
        ? html`<div class="notice external-execution-notice" role="status">
          <ha-icon icon="mdi:information-outline"></ha-icon>
          <span>${host._t("externalActionsInactive")}</span>
        </div>`
        : renderBoostStatus(host, entityId, zone)}
      ${renderDayLayoutControls(host, { key: layoutKey, disabled: host._saving, onChange: (key) => host._selectDayLayout?.(key) })}
      ${resolveDayLayout(layoutKey).invalid ? html`<p class="notice warning">${host._t("dayLayoutInvalid")}</p>` : nothing}
      ${host._dayLayoutConflict ? html`<p class="notice error">${host._t("dayLayoutConflict")}</p>` : nothing}
      ${mixed ? html`${dayTabs}
        ${renderDayScheduleConflict(host, {
          days: host._orderedWeekdays().filter((day) => days.includes(day)),
          selectedDay: host._groupBaseChosen ? host._selectedWeekday : undefined,
          disabled: host._saving || host._materializingTemplate,
          fingerprint: (day) => dayConfigurationFingerprint(zone, day),
          blockCount: (day) => conflictBlocks(day).length,
          emptyMessage: (day) => zone.template_links?.[day] && !host._data?.resolved_default_schedules?.[entityId]?.[day] ? host._t("linkedConfigurationUnavailable") : undefined,
          linkLabel: (day) => { const link = zone.template_links?.[day]; return link ? `${host._t("templates")}: ${host._data?.templates?.find((item) => item.key === link.template_key)?.name ?? link.template_key} · ${host._t(link.mode === "full" ? "templateLinkFull" : "templateLinkHours")}` : undefined; },
          blocks: conflictBlocks,
          onChoose: (day) => host._chooseGroupBase?.(day),
        })}
      ` : nothing}
      ${!mixed ? renderWeeklyScheduleEditor({
        dayTabs: mixed ? html`` : dayTabs,
        timeline: renderTimeline(host, entityId, "schedule", grouped ? undefined : {
          schedule: host._data?.resolved_default_schedules?.[entityId] ?? zone.schedule,
          weekday: host._selectedWeekday,
          resolved: Boolean(host._data?.resolved_default_schedules?.[entityId]),
        }),
        configureHeading: host._t("scheduleStepConfigure"),
        helper: host._t("templateOptionalHint"),
        templatePanel: html`<div class="template-panel">${renderLinkedHoursControl(host)}${host._draftTemplateLink ? nothing : renderTemplatePanel(host)}</div>`,
        externalUsage: renderExternalSwitchpointUsage(
          host._t.bind(host),
          externalCapabilities
            ? externalSwitchpointUsage(host._draftBlocks, externalCapabilities)
            : undefined,
        ),
        blockList: html`<div class="draft-list">
          ${host._draftBlocks.length
            ? html`
                ${renderDraftListHeader(host, "schedule")}
                ${host._draftBlocks.map((block: DraftScheduleBlock, index: number) =>
                  keyed(
                    editableBlockRowKey("schedule", entityId, host._selectedWeekday, index),
                    renderEditableBlock(host, block, index, "schedule", externallyManaged ? undefined : {
                      entityId,
                      dayBlocks: host._draftBlocks,
                    }),
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

        </div>`,
        copyPanels: html`
          ${layoutKey === "individual" ? html`<div class="schedule-copy-helper">${host._t("scheduleCopyHint")}</div>${renderCopyTargets(host)}` : nothing}
          ${renderZoneTargets(host)}
        `,
      }) : nothing}
      <div class="schedule-save-actions schedule-save-footer">${mixed && host._groupBaseChosen ? renderGroupSaveSummary(host, { sourceDay: host._selectedWeekday, days }) : nothing}<button class="command-button primary" type="button"
        ?disabled=${host._saving || host._materializingTemplate || !host._dirty || (mixed && !host._groupBaseChosen) || (hasValidationError && !host._layoutOnlyDirty)}
        @click=${host._saveSelectedDay}><ha-icon icon="mdi:content-save"></ha-icon><span>${host._t(host._saving ? "saving" : "save")}</span></button></div>
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

export function renderTimeline(
  host: ScheduleViewHost,
  entityId: string | undefined,
  source: BlockDraftSource = "schedule",
  weekly?: {
    schedule: Partial<Record<string, readonly (ScheduleBlock | DraftScheduleBlock)[]>>;
    weekday: string;
    resolved?: boolean;
  },
) {
  const timelineBlocks = host._timelineBlocks(source);
  const carryOver = weekly
    ? timelineCarryOverFromWeeklySchedule({
        ...weekly.schedule,
        [weekly.weekday]: timelineBlocks.map((block) => block.draft),
      }, weekly.weekday)
    : undefined;
  const carryOverIndex = carryOver && carryOver.sourceWeekday === weekly?.weekday
    ? timelineBlocks.find((item) => item.draft === carryOver.block)?.index
    : carryOver ? weekly?.schedule[carryOver.sourceWeekday]?.findIndex((item) => item.start === carryOver.block.start) : undefined;

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
              ${carryOver ? renderTimelineCarryOverBlock(host, carryOver, entityId, source, Boolean(weekly?.resolved && carryOver.sourceWeekday !== weekly.weekday), carryOverIndex ?? 0) : nothing}
              ${timelineBlocks.map((block: TimelineBlock) => renderTimelineBlock(host, block, entityId, source))}
            `
          : html`<span class="empty timeline-empty">${host._t("noBlocks")}</span>`}
      </div>
    </div>
  `;
}

export function timelinePresentation(
  host: ScheduleViewHost,
  reference: ScheduleBlock | DraftScheduleBlock,
  entityId: string | undefined,
  source: BlockDraftSource,
  weekday: string,
  index: number,
  carryOver = false,
  resolved = false,
  templateContext?: { link?: TemplateLink },
) {
  const scheduleContext = source === "schedule" || host._resourceProfileKey !== undefined;
  const profile = host._data?.profiles?.find((item) => item.key === host._resourceProfileKey);
  const profileZone = entityId ? profile?.zones[entityId] : undefined;
  const usesDefault = profile && !host._timelineTemplateLinkForDay && (!profileZone || profileZone.behavior === "normal");
  const profileKey = scheduleContext && !usesDefault ? host._resourceProfileKey : undefined;
  const origin = profileKey === undefined ? "default" : "profile";
  const metadata = scheduleContext && carryOver
    ? (origin === "profile" ? host._data?.resolved_block_metadata?.profiles?.[profileKey!]?.[entityId ?? ""]?.[weekday] : host._data?.resolved_block_metadata?.default?.[entityId ?? ""]?.[weekday])
      ?.find((item) => reference.slot_id ? item.slot_id === reference.slot_id : item.start === reference.start)
    : undefined;
  const presetKey = reference.preset_key ?? (resolved ? metadata?.preset_key : undefined);
  const rawZone = origin === "default" ? host._data?.zones?.[entityId ?? ""] : profileZone;
  const link = !scheduleContext ? undefined : !carryOver ? templateContext ? templateContext.link : host._draftTemplateLink : host._timelineTemplateLinkForDay
    ? host._timelineTemplateLinkForDay(weekday)
    : rawZone && "template_links" in rawZone ? rawZone.template_links?.[weekday] : undefined;
  const templateKey = link?.template_key ?? (scheduleContext && carryOver && resolved && !host._timelineTemplateLinkForDay && !rawZone ? metadata?.template_key : undefined);
  const effective = (presetKey || link?.mode === "full")
    ? resolved ? reference
      : carryOver ? host._effectivePresetBlockForDay?.(reference as DraftScheduleBlock, index, weekday)
        ?? (!host._effectivePresetBlockForDay ? resolvedResourceBlock(host._data, { source: origin, profile_key: profileKey, entity_id: entityId ?? "", weekday, start: reference.start, slot_id: reference.slot_id }, presetKey)?.block : undefined)
        : host._effectivePresetBlock?.(reference as DraftScheduleBlock, index, source)
    : reference;
  const status = effective ? undefined : carryOver
    ? host._presetSettingsStatusForDay?.(reference as DraftScheduleBlock, index, weekday) ?? "unavailable"
    : host._presetSettingsStatus?.(reference as DraftScheduleBlock, index, source) ?? "unavailable";
  const block = effective ?? reference;
  const off = Boolean(effective && block.action === ACTION_TURN_OFF);
  const modeOnly = Boolean(effective && block.action === ACTION_SET_HVAC_MODE);
  const optionsOnly = Boolean(effective && block.action === ACTION_SET_CLIMATE_OPTIONS);
  const hasScalar = String(block.temperature ?? "").trim() !== "" && Number.isFinite(Number(block.temperature));
  const hasRange = String(block.target_temp_low ?? "").trim() !== "" && String(block.target_temp_high ?? "").trim() !== "" && Number.isFinite(Number(block.target_temp_low)) && Number.isFinite(Number(block.target_temp_high));
  const label = !effective ? host._t(!presetKey && link?.mode === "full" ? status === "loading" ? "linkedConfigurationLoading" : "linkedConfigurationUnavailable" : status === "loading" ? "presetSettingsLoading" : "sharedPresetUnavailable")
    : off ? host._t("off") : modeOnly ? host._t("deviceControlled") : optionsOnly ? host._t("climateOptionsOnly")
      : draftBlockUsesRange(block) && hasRange ? formatRange(host, Number(block.target_temp_low), Number(block.target_temp_high), entityId)
        : hasScalar ? host._formatTemperature(Number(block.temperature), entityId) : host._t("invalidTemperatureRange");
  const mode = !effective || off || optionsOnly ? "" : block.temperature_only ? host._t("temperatureOnly") : block.hvac_mode ? (host._modeLabel?.(block.hvac_mode) ?? block.hvac_mode) : host._t("keep");
  const options = effective ? climateOptionSummaryItems(host, block) : [];
  const presetName = presetKey ? availableBlockPresets(host._data).find((item) => item.key === presetKey)?.name ?? host._t("missingPreset") : undefined;
  const templateName = templateKey ? availableScheduleTemplates(host._data?.templates).find((item) => item.key === templateKey)?.name ?? templateKey : undefined;
  const details = [
    `${host._formatScheduleTime(reference.start)} - ${label}`,
    effective ? `${host._t("action")}: ${host._t(off ? "off" : modeOnly ? "deviceControlled" : optionsOnly ? "climateOptionsOnly" : "setTemperature")}` : "",
    mode ? `${host._t("mode")}: ${mode}` : "",
    ...options.map((item) => `${item.label}: ${item.value}`),
    presetName ? `${host._t("velairPreset")}: ${presetName}` : "",
    templateName ? `${host._t("timelineLinkedTemplate")}: ${templateName}` : "",
  ].filter(Boolean);
  return { block, off, label, mode, options, presetKey, templateKey, details };
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
  const presentation = timelinePresentation(host, block.draft, entityId, source, host._selectedWeekday, block.index);
  return renderPresentedTimelineBlock(host, presentation, block.draft.start, block.left, block.width,
    scheduleHelpId(host, `${source}-timeline-${block.draft.slot_id ?? block.index}`), {
      block, source,
    });
}

function renderPresentedTimelineBlock(
  host: ScheduleViewHost,
  presentation: ReturnType<typeof timelinePresentation>,
  start: string,
  left: number,
  width: number,
  id: string,
  editable?: { block: TimelineBlock; source: BlockDraftSource },
  continuation?: string,
) {
  const details = [continuation, ...presentation.details].filter(Boolean).join("\n");
  const classes = `${timelineGraphicClasses(presentation.block as ScheduleBlock, width)}${editable ? "" : " timeline-carry-over"}`;
  const resize = (edge: "start" | "end") => html`
    <div class=${`timeline-resize-handle ${edge === "start" ? "left" : "right"}`}
      title=${host._t(edge === "start" ? "resizeStart" : "resizeEnd")} draggable="false"
      @pointerdown=${(event: PointerEvent) => host._handleTimelineResizeStart(editable!.block.index, edge, editable!.source, event)}
      @dragstart=${(event: DragEvent) => event.preventDefault()}></div>`;
  return html`
    <div id=${id} class=${classes} role=${editable ? "button" : "img"} tabindex=${editable ? "0" : nothing}
      draggable=${String(Boolean(editable) && !(host._linkedHours ?? (editable?.source === "schedule" && Boolean(host._draftTemplateLink))))}
      style=${`left: ${left}%; width: ${width}%;`}
      title=${details} aria-label=${details}
      @dragstart=${(event: DragEvent) => {
        if (editable) host._handleTimelineDragStart(editable.block.index, editable.source, event);
      }} @dragend=${host._handleTimelineDragEnd}>
      ${editable ? resize("start") : nothing}
      ${renderTimelineGraphic(host._formatScheduleTime(start), presentation)}
      ${editable?.block.nextIndex !== undefined ? resize("end") : nothing}
    </div>
  `;
}

export function renderTemplatePanel(host: ScheduleViewHost) {
  const templates = host._scheduleTemplates();

  return html`
    <div class="copy-template-control">
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
  if (host._linkedHours ?? (source === "schedule" && Boolean(host._draftTemplateLink))) return nothing;
  return renderAddListButton(host._t("addBlock"), () => host._addBlock(source));
}

export type BlockGuidanceContext = {
  entityId: string;
  dayBlocks: DraftScheduleBlock[];
};

function renderBlockDelete(host: ScheduleViewHost, index: number, source: BlockDraftSource) {
  return html`<button class="icon-button danger" type="button" title=${host._t("deleteBlock")}
    ?disabled=${host._linkedHours ?? (source === "schedule" && Boolean(host._draftTemplateLink))}
    @click=${() => host._removeBlock(index, source)}><ha-icon icon="mdi:trash-can"></ha-icon></button>`;
}

function renderVelairPresetSettings(host: ScheduleViewHost, block: DraftScheduleBlock, index: number, source: BlockDraftSource, unavailable: boolean) {
  const presets = availableBlockPresets(host._data);
  return html`<section class="velair-preset-settings">
    <label><span class="label">${host._t("velairPreset")}</span><span class="select-wrap"><select .value=${block.preset_key ?? ""}
      @change=${(event: Event) => {
        const key = host._inputValue(event);
        if (key) host._setPresetForBlock?.(index, key, source);
        else if (block.preset_key) {
          (event.currentTarget as HTMLSelectElement).value = block.preset_key;
          host._unlinkPresetBlock?.(index, source);
        }
      }}>
      <option value="" .selected=${!block.preset_key} ?disabled=${Boolean(block.preset_key) && unavailable}>${host._t("noVelairPreset")}</option>
      ${block.preset_key && !presets.some((preset) => preset.key === block.preset_key) ? html`<option .selected=${true} value=${block.preset_key}>${host._t("missingPreset")}</option>` : nothing}
      ${presets.map((preset) => html`<option .selected=${preset.key === block.preset_key} value=${preset.key}>${preset.name}</option>`)}
    </select></span></label>
  </section>`;
}

export function renderEditableBlock(
  host: ScheduleViewHost,
  block: DraftScheduleBlock,
  index: number,
  source: BlockDraftSource = "schedule",
  guidance?: BlockGuidanceContext,
) {
  const allowPresets = host._allowBlockPresets ?? (source === "schedule" && Boolean(host._setPresetForBlock));
  const presets = availableBlockPresets(host._data);
  const referenceBlock = block;
  const preset = presets.find((item) => item.key === referenceBlock.preset_key);
  const isPreset = Boolean(referenceBlock.preset_key);
  const fullLinked = host._fullTemplateLinked ?? ((source === "schedule" || Boolean(host._resourceProfileKey)) && host._draftTemplateLink?.mode === "full");
  const readonly = isPreset || fullLinked;
  const legacyResolved = !host._effectivePresetBlock && isPreset ? resolvedResourceBlock(host._data, { source: host._resourceProfileKey ? "profile" : "default", profile_key: host._resourceProfileKey, entity_id: host._selectedEntity ?? "", weekday: host._selectedWeekday, start: block.start, slot_id: block.slot_id }, referenceBlock.preset_key!) : undefined;
  const effective = readonly ? (host._effectivePresetBlock ? host._effectivePresetBlock(referenceBlock, index, source) : legacyResolved?.block) : undefined;
  const presetStatus = isPreset ? host._presetSettingsStatus?.(referenceBlock, index, source) ?? (!effective ? "unavailable" : undefined) : undefined;
  if (readonly) block = { ...effective, start: referenceBlock.start, action: effective?.action ?? ACTION_SET_TEMPERATURE, hvac_mode: effective?.hvac_mode ?? "" };
  const action = block.action || ACTION_SET_TEMPERATURE;
  const isTurnOff = action === ACTION_TURN_OFF;
  const isModeOnly = action === ACTION_SET_HVAC_MODE;
  const isOptionsOnly = action === ACTION_SET_CLIMATE_OPTIONS;
  const zoneExecution = host._selectedEntity ? host._data?.zones?.[host._selectedEntity]?.execution : undefined;
  const externalCapabilities = zoneExecution?.type === "external"
    ? host._data?.external_execution?.systems.find((system) => system.provider === zoneExecution.provider)?.capabilities
    : undefined;
  const supportsTemperatureOnly = host._supportsTemperatureOnly ?? (zoneExecution?.type !== "external" || externalCapabilities?.supports_temperature_only === true);
  const selectedMode = isTurnOff ? "off" : block.temperature_only ? "temperature_only" : block.hvac_mode ?? "";
  const temperatureError = readonly ? undefined : host._temperatureError(block, source);
  const usesRange = draftBlockUsesRange(block);
  const [minTemperature, maxTemperature] = host._temperatureLimits(source);
  const temperatureStep = host._temperatureStep(source);
  const inputMinTemperature = firstTemperatureStepAtOrAbove(minTemperature, temperatureStep);
  const temperatureUnit = host._temperatureUnit?.(source === "schedule" ? host._selectedEntity : undefined) ?? "°C";
  const modeOptions = host._hvacModeOptions(source);
  const displayedModeOptions = selectedMode && selectedMode !== "temperature_only" && !modeOptions.includes(selectedMode)
    ? [...modeOptions, selectedMode]
    : modeOptions;
  const fanModeOptions = host._fanModeOptions(source);
  const presetModeOptions = host._presetModeOptions(source);
  const swingModeOptions = host._swingModeOptions(source);
  const swingHorizontalModeOptions = host._swingHorizontalModeOptions(source);
  const humidityLimits = host._humidityLimits(source);
  const hasSupportedClimateOptions = !block.temperature_only && (action === ACTION_SET_TEMPERATURE || isOptionsOnly) && (
    fanModeOptions.length > 0 ||
    presetModeOptions.length > 0 ||
    swingModeOptions.length > 0 ||
    swingHorizontalModeOptions.length > 0 ||
    Boolean(humidityLimits)
  );
  const optionItems = climateOptionSummaryItems(host, block);
  const hasSelectedClimateOptions = optionItems.length > 0;
  const hasDeviceOptions = (!isPreset || Boolean(effective)) && (hasSupportedClimateOptions || hasSelectedClimateOptions);
  const targetEntityId = host._targetFormatEntityId ?? (source === "schedule" ? host._selectedEntity : undefined);
  const formatChoice = editorTargetFormats(host._data, host.hass?.states, targetEntityId, block.hvac_mode || undefined);
  const currentFormat = usesRange ? "range" : "single";
  const formatMismatch = !formatChoice.uncertain && !formatChoice.formats.includes(currentFormat);
  const canSelectTargetType = formatChoice.formats.length > 1 || formatChoice.uncertain || formatMismatch;
  const hasClimateOptions = hasDeviceOptions || allowPresets || isPreset || block.temperature_only === true || canSelectTargetType;
  const optionError = isOptionsOnly && !isPreset
    ? String(block.humidity ?? "").trim() && !Number.isFinite(Number(block.humidity))
      ? host._t("climateOptionsHumidityInvalidAt", { start: block.start })
      : !draftBlockHasClimateOptions(block)
        ? host._t("climateOptionsRequiredAt", { start: block.start })
        : undefined
    : undefined;
  const optionSummary = hasSelectedClimateOptions
    ? optionItems.map((item) => item.short).join(" • ")
    : host._t("climateOptionsAdd");
  const keepGuidance = !isPreset && !temperatureError && (
    isOptionsOnly || (action === ACTION_SET_TEMPERATURE && !selectedMode)
  );
  const guidanceState = guidance?.entityId ? host.hass?.states?.[guidance.entityId] : undefined;
  const mismatch = keepGuidance && !isOptionsOnly && guidance
    ? keepTargetMismatch(block, guidance.dayBlocks, guidanceState, guidance.entityId ? host._data?.zones?.[guidance.entityId]?.target_format_policy : undefined)
    : undefined;

  return html`
    <div class=${isPreset ? "editable-block preset-linked-block" : temperatureError || optionError ? "editable-block invalid" : "editable-block"}>
      <div class="block-time-field">
        <label class="label" for=${scheduleHelpId(host, `${source}-${referenceBlock.slot_id ?? index}-time`)}>${host._t("start")}</label>
        <span class="linked-time-input">
        <input
          id=${scheduleHelpId(host, `${source}-${referenceBlock.slot_id ?? index}-time`)}
          type="time"
          ?disabled=${host._linkedHours ?? (source === "schedule" && Boolean(host._draftTemplateLink))}
          .value=${block.start}
          @input=${(event: Event) => host._updateDraftBlock(index, "start", host._inputValue(event), source)}
        />
        ${(host._linkedHours ?? (source === "schedule" && Boolean(host._draftTemplateLink))) && host._unlinkDayTemplate
          ? renderInlineHelp(scheduleHelpId(host, `${source}-${referenceBlock.slot_id ?? index}-locked`), host._t("lockedHoursHelp"), host._t("lockedHoursHelp"), { appearance: "overlay" }) : nothing}
        </span>
      </div>
      <label>
        <span class="label">${host._t("mode")}${fullLinked ? renderInlineHelp(scheduleHelpId(host, `${source}-${referenceBlock.slot_id ?? index}-full`), host._t("templateLinkFull"), host._t("templateFullReadonlyHelp")) : nothing}</span>
        <span class="select-wrap">
          ${keyed(
            editableBlockModeSelectKey(source, index, selectedMode, displayedModeOptions),
            html`
              <select
                ?disabled=${readonly || isOptionsOnly}
                value=${selectedMode}
                .value=${selectedMode}
                @change=${(event: Event) => host._updateDraftBlock(index, "hvac_mode", host._inputValue(event), source)}
                @input=${(event: Event) => host._updateDraftBlock(index, "hvac_mode", host._inputValue(event), source)}
              >
                <option value="" .selected=${selectedMode === ""}>${host._t(presetStatus === "loading" ? "presetSettingsLoading" : presetStatus === "unavailable" ? "sharedPresetUnavailable" : "keep")}</option>
                ${!isModeOnly && (supportsTemperatureOnly || block.temperature_only) ? html`<option value="temperature_only" ?disabled=${!supportsTemperatureOnly} .selected=${selectedMode === "temperature_only"}>${host._t("temperatureOnly")}</option>` : nothing}
                ${displayedModeOptions.map((mode: string) => html`
                  <option value=${mode} .selected=${mode === selectedMode}>${host._modeLabel(mode)}</option>
                `)}
              </select>
            `,
          )}
        </span>
      </label>
      ${isTurnOff
        ? html`
            <div class="single-temperature-field target-action-field">
              <label class="label" for=${`${host._blockEditorIdPrefix ?? "velair"}-${source}-${index}-off-target`}>${host._t("temp")} (${temperatureUnit})</label>
              <input id=${`${host._blockEditorIdPrefix ?? "velair"}-${source}-${index}-off-target`} type="text" disabled .value=${host._t("blockOffNoTarget")} />
              <span class="target-action-indicator" aria-hidden="true"><ha-icon icon="mdi:power"></ha-icon></span>
            </div>
          `
        : usesRange
        ? renderRangeTargetInputs(
            host,
            block,
            index,
            source,
            inputMinTemperature,
            maxTemperature,
            temperatureStep,
            isTurnOff || isModeOnly || isOptionsOnly,
            temperatureError,
            temperatureUnit,
            (selectedMode !== "") !== hasSelectedClimateOptions,
            isModeOnly || isOptionsOnly,
            hasSelectedClimateOptions,
            readonly,
          )
        : renderTargetInput(host, block, index, source, "temperature", "temp", temperatureUnit,
            inputMinTemperature, maxTemperature, temperatureStep, isTurnOff || isModeOnly || isOptionsOnly,
            temperatureError, (selectedMode !== "") !== hasSelectedClimateOptions, isModeOnly || isOptionsOnly, hasSelectedClimateOptions, readonly)}
      ${hasClimateOptions
        ? html`
            <details class="advanced-climate-options" @toggle=${handleClimateOptionsToggle} @keydown=${(event: KeyboardEvent) => {
              if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); const details = event.currentTarget as HTMLDetailsElement; details.open = false; details.querySelector<HTMLElement>("summary")?.focus(); }
            }}>
              <summary
                class="icon-button climate-options-toggle"
                title=${optionItems.map((item) => `${item.label}: ${item.value}`).join("\n") || host._t("additionalSettings")}
                aria-label=${host._t("additionalSettings")}
                @click=${handleClimateOptionsSummaryClick}
              >
                <ha-icon icon="mdi:tune-variant"></ha-icon>
                ${hasSelectedClimateOptions || isPreset
                  ? html`<span class="climate-options-badge">${optionItems.length + (isPreset ? 1 : 0)}</span>`
                  : nothing}
              </summary>
              <button
                class="climate-options-scrim"
                type="button"
                aria-label=${host._t("dismiss")}
                @click=${closeClimateOptionsDialog}
              ></button>
              <fieldset class="advanced-climate-options-fields">
                <legend>${host._t("additionalSettings")}</legend>
      ${canSelectTargetType && !readonly && action === ACTION_SET_TEMPERATURE ? html`<button
        type="button" class="command-button compact target-format-action"
        @click=${(event: Event) => {
          host._updateDraftBlock(index, "action", usesRange ? "target_scalar" : "target_range", source);
          (event.currentTarget as HTMLElement).closest("details")?.removeAttribute("open");
        }}><ha-icon icon=${usesRange ? "mdi:thermometer" : "mdi:thermometer-lines"} aria-hidden="true"></ha-icon><span>${host._t(usesRange ? "useSingleTarget" : "useRangeTarget")}</span></button>
        ${formatMismatch ? html`<p class="warning">${host._t("targetFormatIncompatible")}</p>` : nothing}` : nothing}

                ${allowPresets || isPreset ? fullLinked ? html`<p class="full-template-settings">${host._t("linkedFullHelp")}</p>` : renderVelairPresetSettings(host, referenceBlock, index, source, !effective && isPreset) : nothing}
                ${hasDeviceOptions ? html`<fieldset class="device-settings-fields" ?disabled=${readonly}><legend>${host._t("deviceOptions")}</legend>
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
                  "devicePreset",
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
                </fieldset>` : nothing}
                ${isPreset && !effective ? html`<div class="block-command-preview" aria-live="polite"><strong>${host._t("blockSendHelp")}</strong><span>${host._t(presetStatus === "loading" ? "presetSettingsLoading" : "sharedPresetUnavailable")}</span>${presetStatus === "unavailable" && host._retryPresetSettings ? html`<button class="preset-preview-retry" type="button" @click=${() => host._retryPresetSettings?.(referenceBlock, index, source)}>${host._t("retryPresetSettings")}</button>` : nothing}</div>` : renderBlockCommandPreview(host, block, optionSummary, hasSelectedClimateOptions, guidance?.entityId, temperatureError)}
              </fieldset>
            </details>
          `
        : html`<span class="advanced-climate-options-placeholder" aria-hidden="true"></span>`}
      ${renderBlockDelete(host, index, source)}
      ${fullLinked && !isPreset && !effective ? html`<small class="climate-options-inline-summary" role="status">${host._t(host._presetSettingsStatus?.(referenceBlock, index, source) === "loading" ? "linkedConfigurationLoading" : "linkedConfigurationUnavailable")}</small>` : nothing}
      ${isPreset ? html`<small class="climate-options-inline-summary preset-link-summary"><ha-icon icon="mdi:link-variant"></ha-icon><strong>${host._t("velairPreset")}: ${preset?.name ?? host._t("missingPreset")}</strong>${presetStatus ? html`<span role="status">${host._t(presetStatus === "loading" ? "presetSettingsLoading" : "sharedPresetUnavailable")}</span>${presetStatus === "unavailable" && host._retryPresetSettings ? html`<button class="preset-preview-retry" type="button" @click=${() => host._retryPresetSettings?.(referenceBlock, index, source)}>${host._t("retryPresetSettings")}</button>` : nothing}` : hasSelectedClimateOptions ? html`<span>${optionSummary}</span>` : nothing}</small>` : optionError
        ? html`<small class="climate-options-inline-summary invalid" role="alert">${optionError}</small>`
        : hasSelectedClimateOptions
        ? html`
            <small
              class="climate-options-inline-summary"
              title=${optionItems.map((item) => `${item.label}: ${item.value}`).join("\n")}
            >
              ${optionSummary}
            </small>
          `
        : nothing}
      ${mismatch
        ? html`
            <small class="block-mode-warning" role="status">
              <ha-icon icon="mdi:alert-outline" aria-hidden="true"></ha-icon>
              <span>
                ${host._t(mismatch.source === "schedule" ? "keepModePrevious" : "keepModeCurrent", {
                  mode: host._modeLabel(mismatch.mode),
                })}
                ${host._t(mismatch.target === "scalar" ? "keepModeScalarWarning" : "keepModeRangeWarning")}
                ${hasSelectedClimateOptions ? host._t("keepModeOnlyOptionsHint") : nothing}
              </span>
            </small>
          `
        : nothing}
    </div>
  `;
}

function renderBlockCommandPreview(
  host: ScheduleViewHost,
  block: DraftScheduleBlock,
  optionSummary: string,
  hasOptions: boolean,
  entityId?: string,
  temperatureError?: string,
) {
  if (block.action === ACTION_TURN_OFF) {
    return html`<div class="block-command-preview" aria-live="polite"><strong>${host._t("blockSendHelp")}</strong><span>${host._t("diagnosticsOverrideTurnOff")}</span></div>`;
  }
  if (block.action === ACTION_SET_HVAC_MODE) {
    return html`<div class="block-command-preview" aria-live="polite"><strong>${host._t("blockSendHelp")}</strong><span>${host._t("blockNoTarget")}</span><span>${block.hvac_mode ? `${host._t("mode")}: ${(host._modeLabel?.(block.hvac_mode) ?? block.hvac_mode)}` : host._t("chooseModeForDeviceControlled")}</span></div>`;
  }
  if (block.action === ACTION_SET_CLIMATE_OPTIONS) {
    return html`
      <div class="block-command-preview" aria-live="polite">
        <strong>${host._t("blockSendHelp")}</strong>
        <span>${hasOptions
          ? host._t("blockOptionsOnlySummary", { options: optionSummary })
          : host._t("climateOptionsAdd")}</span>
      </div>
    `;
  }
  const isRange = draftBlockUsesRange(block);
  const low = Number(block.target_temp_low);
  const high = Number(block.target_temp_high);
  const temperature = Number(block.temperature);
  const validTarget = isRange
    ? Boolean(String(block.target_temp_low ?? "").trim() && String(block.target_temp_high ?? "").trim()) && Number.isFinite(low) && Number.isFinite(high) && low <= high
    : Boolean(String(block.temperature ?? "").trim()) && Number.isFinite(temperature);
  const target = temperatureError || !validTarget
    ? undefined
    : isRange
      ? formatRange(host, low, high, entityId)
      : host._formatTemperature(temperature, entityId);
  return html`
    <div class="block-command-preview" aria-live="polite">
      <strong>${host._t("blockSendHelp")}</strong>
      <span>${target ? host._t("blockSendsTarget", { target }) : temperatureError ?? host._t("invalidTemperatureRange")}</span>
      <span>${block.temperature_only ? host._t("temperatureOnlyHelp") : block.hvac_mode
        ? `${host._t("mode")}: ${(host._modeLabel?.(block.hvac_mode) ?? block.hvac_mode)}`
        : host._t("blockKeepModeSummary")}</span>
      ${!isRange && target ? html`<span>${host._t("blockSingleNoRange")}</span>` : nothing}
      ${hasOptions ? html`<span>${host._t("blockAlsoSendsOptions", { options: optionSummary })}</span>` : nothing}
    </div>
  `;
}

export function renderTimelineCarryOverBlock(
  host: ScheduleViewHost,
  carryOver: TimelineCarryOverBlock<ScheduleBlock | DraftScheduleBlock>,
  entityId?: string,
  source: BlockDraftSource = "schedule",
  resolved = false,
  index = 0,
) {
  const block = carryOver.block;
  const presentation = timelinePresentation(host, block, entityId, source, carryOver.sourceWeekday, index, true, resolved);
  const continuation = host._t("timelineContinuesFrom", {
    day: host._shortWeekdayName(carryOver.sourceWeekday),
    time: host._formatScheduleTime(block.start),
  });
  return renderPresentedTimelineBlock(host, presentation, block.start, 0, carryOver.width,
    scheduleHelpId(host, `${source}-carry-${carryOver.sourceWeekday}-${block.slot_id ?? block.start}`),
    undefined, continuation);
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
  canUseDeviceTarget = false,
  isTargetless = false,
  hasSelectedOptions = false,
  readonly = false,
) {
  const inputId = `${host._blockEditorIdPrefix ?? "velair"}-${source}-${index}-${field}`;
  return html`
    <div class=${field === "temperature" ? "single-temperature-field target-action-field" : "range-temperature-field"}>
      <label class="label" for=${inputId}>${host._t(labelKey)} (${unit})</label>
      <input
        id=${inputId}
        class=${error ? "invalid" : ""}
        type="number"
        min=${host._unboundedTemperatureTargets ? nothing : String(minimum)}
        max=${host._unboundedTemperatureTargets ? nothing : String(maximum)}
        step=${step === undefined ? "any" : String(step)}
        ?disabled=${disabled || readonly}
        placeholder=${isTargetless ? "—" : disabled ? host._t("off") : ""}
        .value=${disabled ? "" : String(block[field] ?? "")}
        @input=${(event: Event) => host._updateDraftBlock(index, field, host._inputValue(event), source)}
        @change=${(event: Event) => host._updateDraftBlock(index, field, host._inputValue(event), source)}
      />
      ${field === "temperature" && (!disabled || isTargetless)
        ? html`
            <button
              class=${isTargetless ? "target-action-toggle device-controlled" : "target-action-toggle"}
              type="button"
              ?disabled=${readonly || (!isTargetless && !canUseDeviceTarget)}
              title=${isTargetless
                ? host._t("restoreTemperatureTarget")
                : hasSelectedOptions
                  ? host._t(canUseDeviceTarget ? "useClimateOptionsWithoutTarget" : "chooseKeepModeForClimateOptions")
                  : canUseDeviceTarget
                    ? host._t("useDeviceControlledTarget")
                    : host._t("chooseModeForDeviceControlled")}
              aria-label=${host._t("includeTargetTemperature")}
              aria-pressed=${String(!isTargetless)}
              @click=${() => host._updateDraftBlock(
                index,
                "action",
                isTargetless ? ACTION_SET_TEMPERATURE : hasSelectedOptions ? ACTION_SET_CLIMATE_OPTIONS : ACTION_SET_HVAC_MODE,
                source,
              )}
            >
              <ha-icon icon=${isTargetless ? "mdi:thermometer-off" : "mdi:thermometer"}></ha-icon>
            </button>
          `
        : nothing}
      ${field === "temperature" && error ? html`<small class="field-error">${error}</small>` : nothing}
    </div>
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
  canUseDeviceTarget = false,
  isTargetless = false,
  hasSelectedOptions = false,
  readonly = false,
) {
  return html`
    <div class="temperature-range-fields target-action-range" role="group" aria-label=${host._t("temperatureRange")}>
      <div class=${error ? "temperature-range-control invalid" : "temperature-range-control"}>
        ${renderRangeTargetInput(
          host,
          block,
          index,
          source,
          "target_temp_low",
          "minimumShort",
          block.hvac_mode === "heat_cool" ? "heatBelow" : "climateCardLowerTarget",
          minimum,
          maximum,
          step,
          disabled,
          unit,
          isTargetless,
          readonly,
        )}
        ${renderRangeTargetInput(
          host,
          block,
          index,
          source,
          "target_temp_high",
          "maximumShort",
          block.hvac_mode === "heat_cool" ? "coolAbove" : "climateCardUpperTarget",
          minimum,
          maximum,
          step,
          disabled,
          unit,
          isTargetless,
          readonly,
        )}
      </div>
      ${!disabled || isTargetless
        ? html`
            <button
              class=${isTargetless ? "target-action-toggle device-controlled" : "target-action-toggle"}
              type="button"
              ?disabled=${readonly || (!isTargetless && !canUseDeviceTarget)}
              title=${isTargetless
                ? host._t("restoreTemperatureTarget")
                : hasSelectedOptions
                  ? host._t(canUseDeviceTarget ? "useClimateOptionsWithoutTarget" : "chooseKeepModeForClimateOptions")
                  : canUseDeviceTarget
                    ? host._t("useDeviceControlledTarget")
                    : host._t("chooseModeForDeviceControlled")}
              aria-label=${host._t("includeTargetTemperature")}
              aria-pressed=${String(!isTargetless)}
              @click=${() => host._updateDraftBlock(
                index,
                "action",
                isTargetless ? ACTION_SET_TEMPERATURE : hasSelectedOptions ? ACTION_SET_CLIMATE_OPTIONS : ACTION_SET_HVAC_MODE,
                source,
              )}
            >
              <ha-icon icon=${isTargetless ? "mdi:thermometer-off" : "mdi:thermometer"}></ha-icon>
            </button>
          `
        : nothing}
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
  accessibleLabelKey: "heatBelow" | "coolAbove" | "climateCardLowerTarget" | "climateCardUpperTarget",
  minimum: number,
  maximum: number,
  step: number | undefined,
  disabled: boolean,
  unit: string,
  isTargetless = false,
  readonly = false,
) {
  return html`
    <label class="range-temperature-field">
      <span class="range-input-label" aria-hidden="true">${host._t(shortLabelKey)}</span>
      <input
        type="number"
        inputmode="decimal"
        min=${host._unboundedTemperatureTargets ? nothing : String(minimum)}
        max=${host._unboundedTemperatureTargets ? nothing : String(maximum)}
        step=${step === undefined ? "any" : String(step)}
        ?disabled=${disabled || readonly}
        placeholder=${isTargetless ? "—" : disabled ? host._t("off") : ""}
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

function climateOptionSummaryItems(host: ScheduleViewHost, block: ScheduleBlock | DraftScheduleBlock) {
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
  add("devicePreset", block.preset_mode);
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
      ${renderCloneDayPresets(
        host._t.bind(host),
        (preset) => host._setCopyTargetPreset(preset),
        host._copyTargets.size > 0,
      )}
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
          <span class="label">${cloneThermostatsLabel(host, host._draftDayLayoutKey, host._selectedWeekday)}</span>
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
