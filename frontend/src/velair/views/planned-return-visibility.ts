import { html, nothing } from "lit";
import type { VelairViewHost } from "../host-types";
import type { PlannedReturnControl, PlannedReturnStatus } from "../types";
import type { TranslationKey } from "../translations";
import { plannedReturnEpisodeActive } from "../domain/planned-return";
import { plannedReturnPreparationEstimates } from "../domain/planned-return-timeline";
import { plannedReturnPreparationReasons } from "./planned-return-preparation-view";

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
  return html`<button type="button" class="overview-planned-return-summary"
    @click=${(event: Event) => (event.currentTarget as HTMLElement).dispatchEvent(new CustomEvent("velair-open-planned-return", { bubbles: true, composed: true }))}>
    <ha-icon icon="mdi:home-clock-outline"></ha-icon>
    <span><strong>${host._t("plannedReturn")} · ${host._t(`plannedReturnState_${status!.state}`)}</strong>
      <small>${plannedReturnOrigin(host, status!.origin)}
        ${status!.return_at ? html` · ${host._t("plannedReturnArrival")}: ${host._formatDateTime(status!.return_at)}` : nothing}
        ${status!.absence_confirm_at && status!.state === "confirming_absence" ? html` · ${host._t("plannedReturnCheckingUntil", { time: host._formatDateTime(status!.absence_confirm_at) })}` : nothing}</small>
      ${status!.error || status!.notice ? html`<small>${status!.error || host._t("plannedReturnState_cancelled")}</small>` : nothing}
    </span><ha-icon icon="mdi:chevron-right"></ha-icon>
  </button>`;
}

export function renderPlannedReturnZoneSignal(host: VelairViewHost, entityId: string) {
  const intent = host._data?.zone_runtime?.[entityId]?.planned_return;
  if (intent) return html`<span class="overview-planned-return-signal" title=${plannedReturnIntent(host, intent)}>
    <ha-icon icon="mdi:home-clock-outline"></ha-icon><span>${host._t("plannedReturn")}</span>
  </span>`;
  const status = host._data?.planned_return_status;
  if (!status || !plannedReturnEpisodeActive(status)) return nothing;
  const estimate = plannedReturnPreparationEstimates(status).find(zone => zone.entity_id === entityId);
  if (!estimate) return nothing;
  return html`<span class="overview-planned-return-forecast"><ha-icon icon="mdi:clock-outline"></ha-icon>
    ${host._t("plannedReturnPreparationPlannedStart", { time: host._formatDateTime(new Date(estimate.start).toISOString()) })}</span>`;
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
