import { controlUnitId, controlUnitName, orderedControlUnitIds } from "../domain/control-units";
import { html, nothing } from "lit";
import { repeat } from "lit/directives/repeat.js";
import type { VelairViewHost } from "../host-types";
import type { PlannedReturnControl, PlannedReturnStatus } from "../types";
import type { TranslationKey } from "../translations";
import { plannedReturnEpisodeActive } from "../domain/planned-return";
import { currentArrivalPreparation, preparationRoom } from "../domain/planned-return-preparation";
import { renderPreparationRoom } from "./planned-return-preparation-status";
import { plannedReturnTimeline, plannedReturnTimelineLabels } from "../domain/planned-return-timeline";
import { overviewPreparationPoints } from "../domain/overview-preparation-timeline";
import "../components/overview-preparation-timeline-element";
import { languageFromHass } from "../i18n";
import { renderInlineHelp } from "./inline-help";
import type { ArrivalPreparationSummary, PreparationState } from "../domain/planned-return-preparation";
import { plannedReturnPreparationReasons } from "./planned-return-preparation-view";
import { plannedReturnDepartureHelp, renderPlannedReturnDepartureStatus } from "./planned-return-departure-status";

export function plannedReturnVisible(status?: PlannedReturnStatus | null): boolean {
  return Boolean(status && (plannedReturnEpisodeActive(status) || status.error || status.notice || status.state === "error"));
}

export function plannedReturnOrigin(host: VelairViewHost, origin: unknown): string {
  return origin === "automatic" ? host._t("plannedReturnOriginAutomatic")
    : origin === "manual" ? host._t("plannedReturnOriginManual") : "";
}

export function plannedReturnModeName(host: VelairViewHost, id?: string | null): string {
  return id === "default" ? host._t("profileBehaviorDefault") : host._data?.modes?.find(mode => mode.key === id)?.name ?? id ?? "";
}

export function plannedReturnIntent(host: VelairViewHost, intent?: PlannedReturnControl | null): string {
  if (!intent) return host._t("plannedReturnNoIntervention");
  const effect = { schedule: "plannedReturnEffectSchedule", pause: "plannedReturnEffectPause", turn_off: "plannedReturnEffectTurnOff" } as const;
  const profile = host._data?.profiles?.find(item => item.key === intent.profile_id)?.name ?? intent.profile_id;
  return [host._t(`plannedReturnState_${intent.phase}`), plannedReturnOrigin(host, intent.origin),
    plannedReturnModeName(host, intent.mode_id), profile, host._t(effect[intent.effect])].filter(Boolean).join(" · ");
}

export function renderPlannedReturnOverview(host: VelairViewHost) {
  const status = host._data?.planned_return_status;
  if (!plannedReturnVisible(status)) return nothing;
  const now = host._currentTimelineNow?.().getTime() ?? Date.now();
  const preparation = currentArrivalPreparation(status, now);
  const timeline = plannedReturnTimeline(status, now);
  return html`<section class="overview-planned-return-summary" @click=${(event: Event) => {
    if (event.composedPath().some(target => target instanceof HTMLElement &&
      (target.classList.contains("overview-return-count") || target.classList.contains("inline-help-wrapper") || target.classList.contains("inline-help-tooltip")))) return;
    (event.currentTarget as HTMLElement).dispatchEvent(new CustomEvent("velair-open-planned-return", { bubbles: true, composed: true }));
  }}>
    <div class="overview-return-body">
    <div class="overview-return-identity"><button type="button" class="overview-return-open"
    >
    <ha-icon icon="mdi:home-clock-outline"></ha-icon>
    <span><strong>${host._t("plannedReturn")} · ${host._t(`plannedReturnState_${status!.state}`)}</strong>
      <small>${plannedReturnOrigin(host, status!.origin)}
        ${!timeline && status!.return_at ? html` · ${host._t("plannedReturnArrival")}: ${host._formatDateTime(status!.return_at)}` : nothing}
        ${status!.absence_confirm_at && status!.state === "confirming_absence" ? html` · ${host._t("plannedReturnCheckingUntil", { time: host._formatDateTime(status!.absence_confirm_at) })}` : nothing}</small>
      ${status!.error || status!.notice ? html`<small>${status!.error || host._t("plannedReturnState_cancelled")}</small>` : nothing}
    </span>
    </button>${renderPlannedReturnDepartureStatus(status!, (key, values) => host._t(key, values),
      (deadline) => plannedReturnTimelineLabels(now, Date.parse(deadline), host.hass?.config?.time_zone ?? "UTC", languageFromHass(host.hass),
        host.hass?.locale?.time_format === "12" ? true : host.hass?.locale?.time_format === "24" ? false : undefined).arrival)}
      ${preparation ? renderOverviewPreparationCounts(host, preparation) : nothing}</div>
    ${timeline ? renderOverviewReturnTimeline(host, status!, timeline, preparation) : nothing}
    </div><button type="button" class="overview-return-end" aria-label=${host._t("plannedReturn")}
      ><ha-icon icon="mdi:chevron-right" aria-hidden="true"></ha-icon></button>
  </section>`;
}

function renderOverviewPreparationCounts(host: VelairViewHost, preparation: ArrivalPreparationSummary) {
  const entries: Array<[PreparationState, string, TranslationKey, TranslationKey]> = [
    ["waiting", "mdi:clock-outline", "plannedReturnVisibilityCountWaiting", "plannedReturnPreparationState_pending"],
    ["preparing", "mdi:home-clock-outline", "plannedReturnVisibilityCountPreparing", "plannedReturnVisibilityPreparingHelp"],
    ["reached", "mdi:check-circle-outline", "plannedReturnVisibilityCountReached", "plannedReturnVisibilityReachedHelp"],
    ["suspended", "mdi:pause-circle-outline", "plannedReturnVisibilityCountSuspended", "plannedReturnVisibilitySuspendedHelp"],
    ["arrivalOnly", "mdi:home-import-outline", "plannedReturnVisibilityCountArrivalOnly", "plannedReturnVisibilityArrivalOnlyHelp"],
    ["unavailable", "mdi:alert-circle-outline", "plannedReturnVisibilityCountUnavailable", "plannedReturnPreparationState_unavailable"],
  ];
  return html`<span class="overview-return-counts">${repeat(entries.filter(([state]) => preparation.counts[state] > 0), ([state]) => state, ([state, icon, label, help]) => {
    const text = host._t(label, { count: preparation.counts[state] });
    return html`<span class="overview-return-count" data-room-count=${state}>
      <ha-icon icon=${icon} aria-hidden="true"></ha-icon>
      <span class="overview-return-count-value" aria-hidden="true">${preparation.counts[state]}</span>
      <span class="overview-return-count-keyword" aria-hidden="true">${host._t(`plannedReturnVisibilityKeyword_${state}`)}</span>
      ${renderInlineHelp(`overview-return-${state}`, text, [text, host._t(help)], { appearance: "overlay" })}
    </span>`;
  })}</span>`;
}

function renderOverviewReturnTimeline(host: VelairViewHost, status: PlannedReturnStatus, timeline: NonNullable<ReturnType<typeof plannedReturnTimeline>>, preparation?: ArrivalPreparationSummary) {
  const hour12 = host.hass?.locale?.time_format === "12" ? true : host.hass?.locale?.time_format === "24" ? false : undefined;
  const labels = plannedReturnTimelineLabels(timeline.departure, timeline.arrival, host.hass?.config?.time_zone ?? "UTC", languageFromHass(host.hass), hour12);
  const points = overviewPreparationPoints(preparation, timeline.departure, orderedControlUnitIds(host._data));
  const names = Object.fromEntries(points.map(point => [point.entityId, controlUnitName(host._data, host.hass, point.entityId)]));
  const estimateLabel = (start: number) => host._t("plannedReturnOverviewPreparationStartEstimate", { time: plannedReturnTimelineLabels(timeline.departure, start,
    host.hass?.config?.time_zone ?? "UTC", languageFromHass(host.hass), hour12).arrival });
  const departureText = host._formatDateTime(status.departure_at!);
  const arrivalText = host._formatDateTime(status.return_at!);
  const awayMode = plannedReturnModeName(host, status.away_mode_id);
  const destinationMode = plannedReturnModeName(host, status.destination_mode_id);
  return html`<div class="overview-return-timeline" role="group" aria-label=${host._t("plannedReturnTimeline")}>
    <div class="overview-return-endpoints"><span class="overview-return-timeline-help"><ha-icon icon="mdi:home-export-outline" aria-hidden="true"></ha-icon><time datetime=${status.departure_at!} aria-label=${`${host._t("plannedReturnDeparted")}: ${departureText}`}>${labels.departure}</time>
      ${renderInlineHelp("overview-return-departure", host._t("plannedReturnDeparted"), plannedReturnDepartureHelp(status, (key, values) => host._t(key, values), true), { appearance: "overlay" })}</span>
      <span class="overview-return-timeline-help"><time datetime=${status.return_at!} aria-label=${`${host._t("plannedReturnArrival")}: ${arrivalText}`}>${labels.arrival}</time><ha-icon icon="mdi:home-import-outline" aria-hidden="true"></ha-icon>
      ${renderInlineHelp("overview-return-arrival", host._t("plannedReturnArrival"), host._t("plannedReturnArrivalMeaningHelp"), { appearance: "overlay" })}</span></div>
    <velair-overview-preparation-timeline .points=${points} .names=${names} .progress=${timeline.progress} .estimateLabel=${estimateLabel}
      .startTimeLabel=${(start: number) => plannedReturnTimelineLabels(timeline.departure, start, host.hass?.config?.time_zone ?? "UTC", languageFromHass(host.hass), hour12).arrival}
      .episodeKey=${`${status.departure_at}|${status.return_at}|${status.destination_mode_id}`}
      .nowLabel=${`${host._t("plannedReturnTimelineNow")}: ${plannedReturnTimelineLabels(timeline.departure, host._currentTimelineNow?.().getTime() ?? Date.now(), host.hass?.config?.time_zone ?? "UTC", languageFromHass(host.hass), hour12).arrival}`}
      .moreLabel=${(count: number) => host._t("plannedReturnOverviewMoreClimates", { count })} .collapseLabel=${host._t("plannedReturnOverviewCollapseClimates")} .timelineLabel=${host._t("plannedReturnTimeline")}>
    <div class="overview-return-modes"><span class="overview-return-timeline-help" role="group" aria-label=${host._t("plannedReturnAway")}><ha-icon icon="mdi:format-list-bulleted" aria-hidden="true"></ha-icon>${awayMode}
      ${renderInlineHelp("overview-return-away-mode", host._t("plannedReturnAway"), host._t("plannedReturnOverviewAwayModeHelp", { mode: awayMode }), { appearance: "overlay" })}</span><span class="overview-return-timeline-help" role="group" aria-label=${host._t("plannedReturnDestination")}>${destinationMode}<ha-icon icon="mdi:format-list-bulleted" aria-hidden="true"></ha-icon>
      ${renderInlineHelp("overview-return-destination-mode", host._t("plannedReturnDestination"), host._t("plannedReturnOverviewDestinationModeHelp", { mode: destinationMode }), { appearance: "overlay" })}</span></div>
    </velair-overview-preparation-timeline>
  </div>`;
}

export function renderPlannedReturnZoneSignal(host: VelairViewHost, entityId: string) {
  entityId = controlUnitId(host._data, entityId);
  const intent = host._data?.zone_runtime?.[entityId]?.planned_return;
  const now = host._currentTimelineNow?.().getTime() ?? Date.now();
  const preparation = currentArrivalPreparation(host._data?.planned_return_status, now);
  const room = preparationRoom(preparation, entityId);
  if (!intent && !room) return nothing;
  const icons: Record<PreparationState, string> = {
    waiting: "mdi:clock-outline", preparing: "mdi:home-clock-outline", reached: "mdi:check-circle-outline",
    suspended: "mdi:pause-circle-outline", arrivalOnly: "mdi:home-import-outline", unavailable: "mdi:alert-circle-outline",
  };
  const target = room?.source.target;
  const temperature = target?.temperature != null && Number.isFinite(target.temperature) ? String(target.temperature)
    : target?.target_temp_low != null && target?.target_temp_high != null && Number.isFinite(target.target_temp_low) && Number.isFinite(target.target_temp_high)
      ? `${target.target_temp_low}–${target.target_temp_high}` : undefined;
  const targetText = temperature === undefined ? "" : `${temperature} ${host._data?.temperature_unit ?? "°C"}`;
  const state = room ? host._t(`plannedReturnVisibilityKeyword_${room.state}`) : "";
  const stateHelp: Record<PreparationState, TranslationKey> = {
    waiting: "plannedReturnPreparationState_pending", preparing: "plannedReturnVisibilityPreparingHelp",
    reached: "plannedReturnVisibilityReachedHelp", suspended: "plannedReturnVisibilitySuspendedHelp",
    arrivalOnly: "plannedReturnVisibilityArrivalOnlyHelp", unavailable: "plannedReturnPreparationState_unavailable",
  };
  const label = [host._t("plannedReturn"), state, targetText].filter(Boolean).join(" · ");
  const details = [label,
    intent ? plannedReturnIntent(host, intent) : "",
    room ? host._t(stateHelp[room.state]) : "",
    room?.start !== undefined ? host._t("plannedReturnVisibilityEstimatedStart", { time: host._formatDateTime(new Date(room.start).toISOString()) }) : "",
    temperature !== undefined ? host._t("plannedReturnPreparationTarget", { temperature, unit: host._data?.temperature_unit ?? "°C" }) : "",
    room && preparation ? host._t("plannedReturnVisibilityArrivalAt", { time: host._formatDateTime(new Date(preparation.arrival).toISOString()) }) : "",
    room?.source.reason ? host._t(plannedReturnPreparationReasons[room.source.reason] ?? "plannedReturnPreparationReasonUnknown") : "",
  ].filter(Boolean);
  return html`<span class=${`overview-zone-return ${intent ? "overview-planned-return-signal" : ""} ${room ? "overview-planned-return-forecast" : ""}`}
    data-state=${room?.state ?? "active"}>
    <span class="overview-zone-return-label"><span class="overview-zone-return-accent">
      <ha-icon icon=${room ? icons[room.state] : "mdi:home-clock-outline"} aria-hidden="true"></ha-icon>
      <small>${host._t("plannedReturn")}</small>
    </span>${state || targetText ? html`<strong class="overview-zone-return-value">${[state, targetText].filter(Boolean).join(" · ")}</strong>` : nothing}</span>
    ${renderInlineHelp(`overview-zone-return-${entityId}`, label, details, { appearance: "overlay" })}
  </span>`;
}

export function renderPlannedReturnDiagnostics(host: VelairViewHost) {
  const status = host._data?.diagnostics?.planned_return ?? host._data?.planned_return_status;
  if (!status) return nothing;
  const config = host._data?.planned_return;
  const rows = [
    [host._t("status"), host._t(`plannedReturnState_${status.state}`)],
    [host._t("plannedReturnWeeklyRoutine"), host._t((host._data?.diagnostics?.planned_return?.weekly_enabled ?? config?.enabled) ? "plannedReturnRoutineEnabled" : "plannedReturnRoutineDisabled")],
    [host._t("plannedReturnOneOffAvailable"), host._t(status.can_start ? "diagnosticsOn" : "diagnosticsOff")],
    [host._t("plannedReturn"), plannedReturnOrigin(host, status.origin)],
    [host._t("plannedReturnAway"), plannedReturnModeName(host, status.away_mode_id ?? config?.away_mode_id)],
    [host._t("plannedReturnDestination"), plannedReturnModeName(host, status.destination_mode_id ?? config?.destination_mode_id)],
    [host._t("plannedReturnDeparted"), status.departure_at && host._formatDateTime(status.departure_at)],
    [host._t("plannedReturnArrival"), status.return_at && host._formatDateTime(status.return_at)],
    [host._t("plannedReturnCheckingEmpty"), status.absence_confirm_at && host._formatDateTime(status.absence_confirm_at)],
    [host._t("plannedReturnOccupancy"), status.sources.length ? host._t(`plannedReturnOccupancy_${status.occupancy}` as TranslationKey) : host._t("plannedReturnOccupancyUnmonitored")],
    [host._t("diagnosticsLastError"), status.error],
  ];
  return html`<section class="diagnostics-group diagnostics-planned-return"><h4><ha-icon icon="mdi:home-clock-outline"></ha-icon><span>${host._t("plannedReturn")}</span></h4>
    <dl class="diagnostics-rows">${rows.filter(([, value]) => value).map(([label, value]) => html`<div><dt>${label}</dt><dd>${value}</dd></div>`)}</dl>
  </section>`;
}

export function renderPlannedReturnUnitDiagnostics(host: VelairViewHost, entityId: string) {
  const unit = host._data?.diagnostics?.units[entityId];
  const intent = unit ? unit.intent?.planned_return : host._data?.zone_runtime?.[entityId]?.planned_return;
  const status = host._data?.diagnostics?.planned_return ?? host._data?.planned_return_status;
  const preview = status?.preparation?.zones.find(zone => zone.entity_id === entityId);
  if (!intent && !preview) return nothing;
  return html`<section class="diagnostics-group diagnostics-planned-return-unit"><h4><ha-icon icon="mdi:home-clock-outline"></ha-icon><span>${host._t("plannedReturn")}</span></h4>
    <dl class="diagnostics-rows"><div><dt>${host._t("plannedReturnEffectiveIntent")}</dt><dd>${plannedReturnIntent(host, intent)}</dd></div>
      ${preview ? html`<div><dt>${host._t("plannedReturnRoomPreparation")}</dt><dd>${host._t(`plannedReturnPreparationState_${preview.state}`)}</dd></div>
        ${preview.start_at ? html`<div><dt>${host._t("plannedReturnPreparationPlannedStart", { time: "" })}</dt><dd>${host._formatDateTime(preview.start_at)}</dd></div>` : nothing}
        ${preview.reason ? html`<div><dt>${host._t("plannedReturnPreparationReasonLabel")}</dt><dd>${host._t(plannedReturnPreparationReasons[preview.reason] ?? "plannedReturnPreparationReasonUnknown")}</dd></div>` : nothing}` : nothing}
    </dl><p>${host._t("plannedReturnDiagnosticsIntentHelp")}</p>
  </section>`;
}
