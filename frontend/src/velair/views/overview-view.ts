import { html, nothing } from "lit";
import { ACTION_TURN_OFF } from "../constants";
import {
  activePauseOverrideForEntity,
  activeOverrideEntityIds,
  activeOverrideForEntity,
  asOverviewDataHost,
  boostDetailText,
  climateMode,
  currentTemperature,
  overviewNextEvents,
  pauseDetailText,
  todayWeekday,
} from "../controllers/overview-data";
import {
  timelineBlocksFromScheduleBlocks,
  timelineBoostBlockFromOverride,
  timelineModeClass,
  timelineNowMarker,
  timelinePauseBlockFromOverride,
  type ReadonlyTimelineBlock,
  type TimelineBoostBlock,
  type TimelinePauseBlock,
} from "../domain/timeline";
import { scheduledEventAt } from "../domain/schedule-events";
import type { VelairViewHost } from "../host-types";
import type { ScheduleBlock, ScheduleEvent, ScheduleZone } from "../types";

type OverviewViewHost = VelairViewHost;
type OverviewSchedulerState = "running" | "paused" | "stopped";

function overviewSchedulerState(host: OverviewViewHost): { detail: string; icon: string; label: string; state: OverviewSchedulerState } {
  const pauseExpiresAt = host._pauseExpirationMs();
  if (pauseExpiresAt && pauseExpiresAt > Date.now()) {
    return {
      detail: host._t("overviewStatusPausedDetail"),
      icon: "mdi:pause-circle",
      label: host._t("overviewStatusPaused"),
      state: "paused",
    };
  }

  if (host._data?.global.mode === "paused" || host._data?.operational_status === "paused") {
    return {
      detail: host._t("overviewStatusStoppedDetail"),
      icon: "mdi:stop-circle",
      label: host._t("overviewStatusStopped"),
      state: "stopped",
    };
  }

  return {
    detail: host._t("overviewStatusRunningDetail"),
    icon: "mdi:play-circle",
    label: host._t("overviewStatusRunning"),
    state: "running",
  };
}

export function renderSchedulerSummary(host: OverviewViewHost) {
  if (!host._data) {
    return nothing;
  }

  return html`
    <section class="summary">
      <div>
        <span class="label">${host._t("mode")}</span>
        <strong>${host._schedulerModeLabel(host._data.global.mode)}</strong>
      </div>
      <div class=${host._pauseExpirationMs() ? "summary-status paused" : "summary-status"}>
        <div class="summary-status-header">
          <div>
            <span class="label">${host._t("status")}</span>
            <strong>${host._schedulerStatusLabel(host._data.operational_status)}</strong>
          </div>
          ${renderSchedulerControls(host)}
        </div>
        ${renderPauseProgress(host)}
      </div>
      <div class="summary-events">
        <div class="summary-status-header">
          <div>
            <span class="label">${host._t("nextEvents")}</span>
            <strong>${host._data.next_events.length}</strong>
          </div>
          <button
            class="summary-icon-button"
            type="button"
            title=${host._t("nextEvents")}
            aria-label=${host._t("nextEvents")}
            @click=${host._toggleNextEvents}
          >
            <ha-icon icon=${host._nextEventsOpen ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>
          </button>
        </div>
      </div>
    </section>
  `;
}

export function renderOverviewSummary(host: OverviewViewHost, _zoneIds: string[]) {
  if (!host._data) {
    return nothing;
  }

  const schedulerState = overviewSchedulerState(host);
  return html`
    <section class="overview-summary">
      <div class=${`overview-status-card status-${schedulerState.state}`}>
        <div class="overview-status-heading">
          <div class="overview-scheduler-state">
            <span class="label">${host._t("status")}</span>
            <span class=${`overview-state-value ${schedulerState.state}`}>
              <ha-icon icon=${schedulerState.icon}></ha-icon>
              <strong>${schedulerState.label}</strong>
            </span>
          </div>
          ${renderOverviewSchedulerControls(host)}
          <span class="overview-scheduler-detail">${schedulerState.detail}</span>
        </div>
        ${renderPauseProgress(host)}
      </div>
    </section>
  `;
}

export function renderOverviewActiveBoosts(host: OverviewViewHost) {
  if (!host._data) {
    return nothing;
  }

  const overviewHost = asOverviewDataHost(host);
  const activeBoosts = activeOverrideEntityIds(overviewHost);
  return html`
    <section class="overview-boost-panel">
      ${renderOverviewSectionHeading(host._t("activeBoosts"), "mdi:lightning-bolt")}
      ${activeBoosts.length
        ? html`
            <div class="event-list overview-boost-list">
              ${activeBoosts.map((entityId: string) => {
                const override = activeOverrideForEntity(overviewHost, entityId, host._data?.zones[entityId]);
                return html`
                  <div class="event">
                    <div>
                      <strong>${host._friendlyEntityName(entityId)}</strong>
                    </div>
                    ${override ? renderBoostEventDetails(host, entityId, override) : html`<span>${host._t("boostActive")}</span>`}
                  </div>
                `;
              })}
            </div>
          `
        : html`<span class="overview-muted">${host._t("noActiveBoosts")}</span>`}
    </section>
  `;
}

export function renderBoostEventDetails(
  host: OverviewViewHost,
  entityId: string,
  override: Record<string, unknown>,
) {
  const temperature = Number(override.temperature);
  const untilMs = typeof override.until === "string" ? new Date(override.until).getTime() : undefined;
  const hvacMode = typeof override.hvac_mode === "string" ? override.hvac_mode : "";
  const timing = untilMs && !Number.isNaN(untilMs)
    ? `${host._formatDateTime(new Date(untilMs).toISOString())} (${host._formatRemaining(Math.max(0, untilMs - Date.now()))})`
    : host._t("boostActive");

  return html`
    <div class="event-details">
      <span class="event-time">${timing}</span>
      <strong class="event-target">${Number.isFinite(temperature) ? host._formatTemperature(temperature, entityId) : "-"}</strong>
      <span class="event-mode">${hvacMode ? host._modeLabel(hvacMode) : host._t("keepMode")}</span>
    </div>
  `;
}

export function renderOverviewZones(host: OverviewViewHost, zoneIds: string[]) {
  if (!host._data || !zoneIds.length) {
    return nothing;
  }

  return html`
    <section class="overview-zones">
      ${renderOverviewSectionHeading(host._t("overviewZones"), "mdi:thermostat")}
      <div class="overview-zone-table-scroll">
        <div class="overview-zone-table" role="table" aria-label=${host._t("overviewZones")}>
          <div class="overview-zone-table-row header" role="row">
            <div class="overview-zone-cell sticky" role="columnheader">${host._t("thermostat")}</div>
            <div class="overview-zone-cell" role="columnheader">${host._t("currentTemperature")}</div>
            <div class="overview-zone-cell" role="columnheader">${host._t("targetTemperature")} / ${host._t("mode")}</div>
            <div class="overview-zone-cell" role="columnheader">${host._t("status")}</div>
          </div>
          ${zoneIds.map((entityId) => renderOverviewZoneRow(host, entityId, host._data?.zones[entityId]))}
        </div>
      </div>
    </section>
  `;
}

function renderOverviewZoneRow(host: OverviewViewHost, entityId: string, zone?: ScheduleZone) {
  const overviewHost = asOverviewDataHost(host);
  const boostOverride = activeOverrideForEntity(overviewHost, entityId, zone);
  const pauseOverride = activePauseOverrideForEntity(overviewHost, entityId, zone);
  const activeOverride = boostOverride ?? pauseOverride;
  const activeScheduleEvent = zone ? scheduledEventAt(entityId, zone, new Date()) : undefined;
  const currentTemperatureValue = currentTemperature(overviewHost, entityId) ?? "-";
  const targetState = overviewZoneTargetState(host, entityId, activeScheduleEvent, activeOverride);
  const modeState = overviewZoneModeState(host, entityId, activeScheduleEvent, activeOverride);

  return html`
    <div class="overview-zone-table-row" role="row">
      <div class="overview-zone-cell sticky name" role="cell">
        <strong>${host._friendlyEntityName(entityId)}</strong>
        <span>${entityId}</span>
      </div>
      <div class="overview-zone-cell" role="cell">
        <strong>${currentTemperatureValue}</strong>
      </div>
      <div class="overview-zone-cell" role="cell">
        ${renderOverviewZoneSetpoint(host, entityId, targetState, modeState, activeOverride)}
      </div>
      <div class="overview-zone-cell" role="cell">
        ${renderOverviewZoneStatus(host, entityId, boostOverride, pauseOverride)}
      </div>
    </div>
  `;
}

function renderOverviewZoneSetpoint(
  host: OverviewViewHost,
  entityId: string,
  targetState: { base: string; effective: string },
  modeState: { base: string; effective: string },
  override?: Record<string, unknown>,
) {
  const effectiveTemplate = html`
    ${renderOverviewZoneState(host, entityId, targetState.effective, modeState.effective, "effective")}
  `;

  if (!override || (targetState.base === targetState.effective && modeState.base === modeState.effective)) {
    return html`<span class="overview-zone-setpoint">${effectiveTemplate}</span>`;
  }

  const isBoost = override.type === "boost";
  const label = isBoost ? host._t("boostActive") : host._t("pauseActive");
  return html`
    <span class=${`overview-zone-setpoint overridden ${isBoost ? "boost" : "pause"}`}>
      ${renderOverviewZoneState(host, entityId, targetState.base, modeState.base, "previous")}
      <span class="overview-zone-transition" title=${label} aria-label=${label}>
        <span class="overview-zone-transition-symbol">
          <ha-icon class="overview-zone-cause" icon=${isBoost ? "mdi:fire" : "mdi:pause-circle"}></ha-icon>
          <ha-icon class="overview-zone-arrow" icon="mdi:arrow-right"></ha-icon>
        </span>
      </span>
      ${effectiveTemplate}
    </span>
  `;
}

function renderOverviewZoneState(
  host: OverviewViewHost,
  entityId: string,
  target: string,
  mode: string,
  variant: "effective" | "previous",
) {
  if (target === host._t("off") && mode === host._t("off")) {
    return html`
      <span class=${`overview-zone-state ${variant}`}>
        <strong>${host._t("off")}</strong>
      </span>
    `;
  }

  return html`
    <span class=${`overview-zone-state ${variant}`}>
      <strong>${target}</strong>
      ${variant === "effective" ? renderOverviewZoneModeValue(host, entityId, mode) : html`<span>${mode}</span>`}
    </span>
  `;
}

function renderOverviewZoneModeValue(_host: OverviewViewHost, _entityId: string, value: string) {
  return html`
    <span class="overview-mode-value">
      <span>${value}</span>
    </span>
  `;
}

function renderOverviewZoneStatus(
  host: OverviewViewHost,
  entityId: string,
  boostOverride?: Record<string, unknown>,
  pauseOverride?: Record<string, unknown>,
) {
  if (boostOverride) {
    return html`
      <span class="overview-zone-status boost">
        <ha-icon icon="mdi:fire"></ha-icon>
        <span>${boostDetailText(asOverviewDataHost(host), entityId, boostOverride)}</span>
      </span>
    `;
  }

  if (pauseOverride) {
    return html`
      <span class="overview-zone-status pause">
        <ha-icon icon="mdi:pause-circle"></ha-icon>
        <span>${pauseDetailText(asOverviewDataHost(host), pauseOverride)}</span>
      </span>
    `;
  }

  return html`<span class="overview-muted">-</span>`;
}

function overviewZoneTargetState(
  host: OverviewViewHost,
  entityId: string,
  event?: ScheduleEvent,
  override?: Record<string, unknown>,
): { base: string; effective: string } {
  const currentTarget = currentTargetTemperature(host, entityId);
  const base = event ? eventTargetLabel(host, event) : currentTarget;
  if (!override) {
    return { base, effective: currentTarget };
  }

  if (override.type === "boost") {
    const boostTemperature = Number(override.temperature);
    return {
      base,
      effective: Number.isFinite(boostTemperature) ? host._formatTemperature(boostTemperature, entityId) : currentTarget,
    };
  }

  if (override.type === "pause" && override.action === ACTION_TURN_OFF) {
    return { base, effective: host._t("off") };
  }

  return { base, effective: currentTarget };
}

function overviewZoneModeState(
  host: OverviewViewHost,
  entityId: string,
  event?: ScheduleEvent,
  override?: Record<string, unknown>,
): { base: string; effective: string } {
  const overviewHost = asOverviewDataHost(host);
  const currentMode = climateMode(overviewHost, entityId) ?? "-";
  const base = event ? eventModeLabel(host, event) : currentMode;
  if (!override) {
    return { base, effective: currentMode };
  }

  if (override.type === "boost" && typeof override.hvac_mode === "string" && override.hvac_mode) {
    return { base, effective: host._modeLabel(override.hvac_mode) };
  }

  if (override.type === "pause" && override.action === ACTION_TURN_OFF) {
    return { base, effective: host._t("off") };
  }

  return { base, effective: currentMode };
}

function currentTargetTemperature(host: OverviewViewHost, entityId: string): string {
  const state = host.hass?.states?.[entityId];
  if (!state || state.state === "unknown" || state.state === "unavailable") {
    return "-";
  }
  if (state.state === "off") {
    return host._t("off");
  }

  const temperature = state.attributes?.temperature;
  if (typeof temperature === "number") {
    return host._formatTemperature(temperature, entityId);
  }

  return "-";
}

function eventTargetLabel(host: OverviewViewHost, event: ScheduleEvent): string {
  if (event.action === ACTION_TURN_OFF || event.hvac_mode === "off") {
    return host._t("off");
  }
  if (typeof event.temperature === "number") {
    return host._formatTemperature(event.temperature, event.entity_id);
  }

  return "-";
}

function eventModeLabel(host: OverviewViewHost, event: ScheduleEvent): string {
  if (event.action === ACTION_TURN_OFF || event.hvac_mode === "off") {
    return host._t("off");
  }
  return event.hvac_mode ? host._modeLabel(event.hvac_mode) : host._t("keepMode");
}

export function renderOverviewTimelines(host: OverviewViewHost, zoneIds: string[]) {
  if (!host._data || !zoneIds.length) {
    return nothing;
  }

  const marker = timelineNowMarker(host._currentTimelineNow());
  const weekday = todayWeekday();

  return html`
    <section class="overview-timeline-panel">
      ${renderOverviewSectionHeading(host._t("todayTimeline"), "mdi:timeline-clock-outline")}
      <div class="overview-timeline-scroll">
        <div class="overview-timeline-layout">
          <div class="overview-timeline-names">
            <div class="overview-timeline-axis-spacer"></div>
            ${zoneIds.map((entityId: string) => renderOverviewTimelineName(host, entityId))}
          </div>
          <div class="overview-timeline-rows" style=${`--overview-now-left: ${marker.left}%;`}>
            <div class="overview-timeline-axis">
              <span>00</span>
              <span>06</span>
              <span>12</span>
              <span>18</span>
              <span>24</span>
              <div class="overview-timeline-now-label" title=${host._t("currentTime", { time: marker.label })}>
                ${marker.label}
              </div>
            </div>
            <div class="overview-timeline-now-line" aria-label=${host._t("currentTime", { time: marker.label })}></div>
            ${zoneIds.map((entityId: string) =>
              renderOverviewTimelineTrack(host, entityId, host._data?.zones[entityId]?.schedule?.[weekday] ?? []))}
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderOverviewTimelineTrack(
  host: OverviewViewHost,
  entityId: string,
  blocks: ScheduleBlock[],
) {
  const timelineBlocks = timelineBlocksFromScheduleBlocks(blocks);
  const overviewHost = asOverviewDataHost(host);
  const zone = host._data?.zones[entityId];
  const override = activeOverrideForEntity(overviewHost, entityId, host._data?.zones[entityId]);
  const pauseOverride = activePauseOverrideForEntity(overviewHost, entityId, zone);
  const boostBlock = override ? timelineBoostBlockFromOverride(override, host._currentTimelineNow()) : undefined;
  const pauseBlock = pauseOverride ? timelinePauseBlockFromOverride(pauseOverride, host._currentTimelineNow()) : undefined;
  const trackClass = pauseBlock?.indefinite ? "overview-timeline-track paused-indefinite" : "overview-timeline-track";

  return html`
    <div class=${trackClass}>
      ${timelineBlocks.length || boostBlock || pauseBlock
        ? timelineBlocks.map((block: ReadonlyTimelineBlock) => renderOverviewTimelineBlock(host, entityId, block))
        : html`<span class="overview-timeline-empty">${host._t("noBlocks")}</span>`}
      ${boostBlock && override ? renderOverviewTimelineBoost(host, entityId, boostBlock, override) : nothing}
      ${pauseBlock && pauseOverride ? renderOverviewTimelinePause(host, entityId, pauseBlock, pauseOverride) : nothing}
      ${host._overviewTimelineDetail && host._overviewTimelineDetailEntityId === entityId
        ? html`
            <div
              class=${`overview-timeline-tap-detail ${overviewTimelineDetailPlacementClass(
                host._overviewTimelineDetailAnchor ?? 50,
              )}`}
              role="status"
              style=${`--overview-detail-left: ${host._overviewTimelineDetailAnchor ?? 50}%;`}
            >
              <span>${host._overviewTimelineDetail}</span>
              <button
                type="button"
                title=${host._t("dismiss")}
                aria-label=${host._t("dismiss")}
                @click=${host._clearOverviewTimelineDetail}
              >
                <ha-icon icon="mdi:close"></ha-icon>
              </button>
            </div>
          `
        : nothing}
    </div>
  `;
}

export function renderOverviewTimelineName(host: OverviewViewHost, entityId: string) {
  const overviewHost = asOverviewDataHost(host);
  const pauseOverride = activePauseOverrideForEntity(overviewHost, entityId, host._data?.zones[entityId]);
  const label = host._friendlyEntityName(entityId);
  const detail = pauseOverride ? pauseDetailText(overviewHost, pauseOverride) : "";

  return html`
    <div
      class=${pauseOverride ? "overview-timeline-name paused" : "overview-timeline-name"}
      title=${pauseOverride ? `${label} - ${host._t("pauseActive")} - ${detail}` : label}
    >
      ${pauseOverride ? html`<ha-icon icon="mdi:pause-circle" aria-hidden="true"></ha-icon>` : nothing}
      <span>${label}</span>
    </div>
  `;
}

export function renderOverviewTimelineBlock(
  host: OverviewViewHost,
  entityId: string,
  timelineBlock: ReadonlyTimelineBlock,
) {
  const detail = overviewTimelineBlockDetail(host, entityId, timelineBlock.block);
  const label = overviewTimelineBlockLabel(host, entityId, timelineBlock.block);
  const modeLabel = overviewTimelineBlockModeLabel(host, entityId, timelineBlock.block);
  const blockClass = [
    "overview-timeline-block",
    `mode-${timelineModeClass(timelineBlock.block)}`,
    timelineBlock.width < 12 ? "compact" : "",
    timelineBlock.width < 6 ? "tiny" : "",
  ].filter(Boolean).join(" ");

  return html`
    <button
      class=${blockClass}
      type="button"
      style=${`left: ${timelineBlock.left}%; width: ${timelineBlock.width}%;`}
      title=${detail}
      aria-label=${detail}
      @click=${(event: Event) =>
        host._showOverviewTimelineDetail(entityId, detail, timelineBlock.left + timelineBlock.width / 2, event)}
    >
      <span class="overview-timeline-block-main">
        <span>${label}</span>
        ${modeLabel ? html`<small>${modeLabel}</small>` : nothing}
      </span>
    </button>
  `;
}

export function renderOverviewTimelineBoost(
  host: OverviewViewHost,
  entityId: string,
  boostBlock: TimelineBoostBlock,
  override: Record<string, unknown>,
) {
  const modeClass = timelineModeClass({
    hvac_mode: boostBlock.block.hvac_mode ?? host.hass?.states?.[entityId]?.state,
  });
  const detail = `${host._t("boostActive")} - ${boostBlock.block.start} - ${timeFromBoostEnd(boostBlock.endMinute)} - ${
    boostDetailText(asOverviewDataHost(host), entityId, override)
  }`;

  return html`
    <button
      class=${`overview-timeline-boost mode-${modeClass}`}
      type="button"
      style=${`left: ${boostBlock.left}%; width: ${boostBlock.width}%;`}
      title=${detail}
      aria-label=${detail}
      @click=${(event: Event) =>
        host._showOverviewTimelineDetail(entityId, detail, boostBlock.left + boostBlock.width / 2, event)}
    >
      <span class="overview-timeline-block-main">
        <ha-icon icon="mdi:lightning-bolt"></ha-icon>
        ${Number.isFinite(boostBlock.block.temperature)
          ? html`<span>${host._formatTemperature(Number(boostBlock.block.temperature), entityId)}</span>`
          : nothing}
      </span>
    </button>
  `;
}

export function renderOverviewTimelinePause(
  host: OverviewViewHost,
  entityId: string,
  pauseBlock: TimelinePauseBlock,
  override: Record<string, unknown>,
) {
  const detail = `${host._t("pauseActive")} - ${pauseDetailText(asOverviewDataHost(host), override)}`;

  return html`
    <button
      class=${pauseBlock.indefinite ? "overview-timeline-pause indefinite" : "overview-timeline-pause"}
      type="button"
      style=${`left: ${pauseBlock.left}%; width: ${pauseBlock.width}%;`}
      title=${detail}
      aria-label=${detail}
      @click=${(event: Event) =>
        host._showOverviewTimelineDetail(entityId, detail, pauseBlock.left + pauseBlock.width / 2, event)}
    >
      <span class="overview-timeline-block-main">
        <ha-icon icon="mdi:pause"></ha-icon>
        <span>${host._t("pauseActive")}</span>
      </span>
    </button>
  `;
}

export function overviewTimelineBlockLabel(host: OverviewViewHost, entityId: string, block: ScheduleBlock): string {
  return host._formatEventAction(overviewTimelineEvent(entityId, block));
}

export function overviewTimelineBlockModeLabel(host: OverviewViewHost, entityId: string, block: ScheduleBlock): string {
  if (block.action === ACTION_TURN_OFF || block.hvac_mode === "off") {
    return "";
  }

  return host._formatEventMode(overviewTimelineEvent(entityId, block));
}

export function overviewTimelineBlockDetail(host: OverviewViewHost, entityId: string, block: ScheduleBlock): string {
  const label = overviewTimelineBlockLabel(host, entityId, block);
  const modeLabel = overviewTimelineBlockModeLabel(host, entityId, block);
  return [block.start, label, modeLabel].filter(Boolean).join(" - ");
}

function overviewTimelineEvent(entityId: string, block: ScheduleBlock): ScheduleEvent {
  return {
    action: block.action,
    entity_id: entityId,
    hvac_mode: block.hvac_mode ?? null,
    start: block.start,
    temperature: block.temperature ?? null,
    weekday: todayWeekday(),
    when: new Date().toISOString(),
  };
}

function timeFromBoostEnd(endMinute: number): string {
  const boundedMinute = Math.max(0, Math.min(1440, endMinute));
  const hours = Math.floor(boundedMinute / 60);
  const minutes = boundedMinute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function overviewTimelineDetailPlacementClass(anchorPercent: number): string {
  if (anchorPercent >= 72) {
    return "align-end";
  }
  if (anchorPercent <= 28) {
    return "align-start";
  }
  return "align-center";
}

export function renderNextEvents(host: OverviewViewHost) {
  const nextEvents = overviewNextEvents(asOverviewDataHost(host));
  if (!nextEvents.length) {
    return html`
      <section class="next">
        ${renderOverviewSectionHeading(host._t("nextEvent"), "mdi:calendar-clock")}
        <p>${host._t("noUpcomingEvent")}</p>
      </section>
    `;
  }

  return html`
    <section class="next">
      ${renderOverviewSectionHeading(
        host._t(nextEvents.length === 1 ? "nextEvent" : "nextEvents"),
        "mdi:calendar-clock",
      )}
      <div class="event-list">
        ${nextEvents.map((event: ScheduleEvent) => renderEvent(host, event))}
      </div>
    </section>
  `;
}

function renderOverviewSectionHeading(label: string, icon: string) {
  return html`
    <div class="overview-section-title section-heading">
      <ha-icon icon=${icon}></ha-icon>
      <span class="section-label">${label}</span>
    </div>
  `;
}

export function renderEvent(host: OverviewViewHost, event: ScheduleEvent) {
  return html`
    <div class="event">
      <div>
        <strong>${host._friendlyEntityName(event.entity_id)}</strong>
      </div>
      ${renderEventDetails(host, event)}
    </div>
  `;
}

export function renderEventDetails(host: OverviewViewHost, event: ScheduleEvent) {
  return html`
    <div class="event-details">
      <span class="event-time">${host._formatDateTime(event.when)}</span>
      <strong class="event-target">${host._formatEventAction(event)}</strong>
      <span class="event-mode">${host._formatEventMode(event)}</span>
    </div>
  `;
}

export function renderOverviewBoostStatus(
  host: OverviewViewHost,
  entityId: string,
  override?: Record<string, unknown>,
) {
  if (!override) {
    return nothing;
  }

  return html`
    <div class="overview-boost-status">
      <ha-icon icon="mdi:lightning-bolt"></ha-icon>
      <div>
        <strong>${host._t("boostActive")}</strong>
        <span>${boostDetailText(asOverviewDataHost(host), entityId, override)}</span>
      </div>
    </div>
  `;
}

export function renderSchedulerControls(host: OverviewViewHost) {
  return html`
    <details class="scheduler-menu">
      <summary
        title=${host._t("schedulerControls")}
        aria-label=${host._t("schedulerControls")}
        @click=${host._handleSchedulerMenuToggle}
      >
        <ha-icon icon="mdi:tune"></ha-icon>
      </summary>
      <div class="scheduler-actions">
        <button class="dialog-close" type="button" title=${host._t("dismiss")} @click=${host._closeSchedulerMenu}>
          <ha-icon icon="mdi:close"></ha-icon>
        </button>
        <div class="pause-action-group">
          <label class="pause-duration-field">
            <span class="label">${host._t("pauseDuration")}</span>
            <input
              type="number"
              min="1"
              step="5"
              .value=${String(host._pauseDurationMinutes)}
              @input=${(event: Event) => {
                host._pauseDurationMinutes = Math.max(1, Math.round(Number(host._inputValue(event)) || 1));
              }}
            />
          </label>
          <button
            class="command-button warning"
            type="button"
            ?disabled=${host._controlAction === "pause"}
            @click=${() => host._pauseScheduler(false)}
          >
            <ha-icon icon="mdi:pause"></ha-icon>
            <span>${host._t("pause")}</span>
          </button>
        </div>
        <div class="scheduler-secondary-actions">
          <button
            class="command-button danger"
            type="button"
            ?disabled=${host._controlAction === "pause"}
            @click=${() => host._pauseScheduler(true)}
          >
            <ha-icon icon="mdi:stop"></ha-icon>
            <span>${host._t("stop")}</span>
          </button>
          <button
            class="command-button"
            type="button"
            ?disabled=${host._controlAction === "resume"}
            @click=${host._resumeScheduler}
          >
            <ha-icon icon="mdi:play"></ha-icon>
            <span>${host._t("resume")}</span>
          </button>
        </div>
      </div>
    </details>
  `;
}

export function renderOverviewSchedulerControls(host: OverviewViewHost) {
  const canResume = host._canResumeScheduler();
  return html`
    <div class="overview-controls">
      <label class="overview-pause-control">
        <span class="overview-pause-input">
          <input
            type="number"
            min="1"
            step="5"
            aria-label=${host._t("pauseDuration")}
            .value=${String(host._pauseDurationMinutes)}
            @input=${(event: Event) => {
              host._pauseDurationMinutes = Math.max(1, Math.round(Number(host._inputValue(event)) || 1));
            }}
          />
          <span class="overview-pause-unit">min</span>
          <button
            class="overview-inline-button warning"
            type="button"
            title=${host._t("pause")}
            aria-label=${host._t("pause")}
            ?disabled=${host._controlAction === "pause"}
            @click=${() => host._pauseScheduler(false, { showSuccess: false })}
          >
            <ha-icon icon="mdi:pause"></ha-icon>
          </button>
        </span>
      </label>
      <button
        class="overview-inline-button danger"
        type="button"
        title=${host._t("stop")}
        aria-label=${host._t("stop")}
        ?disabled=${host._controlAction === "pause"}
        @click=${() => host._pauseScheduler(true, { showSuccess: false })}
      >
        <ha-icon icon="mdi:stop"></ha-icon>
      </button>
      <button
        class="overview-inline-button resume"
        type="button"
        title=${host._t("resume")}
        aria-label=${host._t("resume")}
        ?disabled=${!canResume || host._controlAction === "resume"}
        @click=${() => host._resumeScheduler({ showSuccess: false })}
      >
        <ha-icon icon="mdi:play"></ha-icon>
      </button>
    </div>
  `;
}

export function renderPauseProgress(host: OverviewViewHost) {
  const expiresAt = host._pauseExpirationMs();
  if (!expiresAt || expiresAt <= Date.now()) {
    return nothing;
  }

  const remainingMs = Math.max(0, expiresAt - Date.now());
  const progress = host._pauseProgressPercent(expiresAt);
  return html`
    <div class="pause-progress">
      <div>
        <span>${host._t("pauseRemaining")}: ${host._formatRemaining(remainingMs)}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style=${`width: ${progress}%;`}></div>
      </div>
    </div>
  `;
}
