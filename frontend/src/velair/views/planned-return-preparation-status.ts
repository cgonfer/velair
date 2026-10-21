import { css, html, nothing } from "lit";
import { repeat } from "lit/directives/repeat.js";
import type { ArrivalPreparationSummary, ArrivalPreparationZone, PreparationState } from "../domain/planned-return-preparation";
import type { TranslationKey } from "../translations";
import { plannedReturnPreparationReasons } from "./planned-return-preparation-view";
import { renderInlineHelp } from "./inline-help";
import { renderPreconditioningDependency } from "./preconditioning-dependency";



type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;
type FormatTime = (iso: string) => string;
const stateKeys: Record<PreparationState | "mixed", TranslationKey> = {
  waiting: "plannedReturnVisibilityWaiting", preparing: "plannedReturnVisibilityPreparing",
  reached: "plannedReturnPreparationState_reached", suspended: "plannedReturnPreparationState_suspended",
  arrivalOnly: "plannedReturnPreparationCategory_arrival_only", unavailable: "plannedReturnPreparationState_unavailable",
  mixed: "plannedReturnVisibilityMixed",
};
const countKeys: Record<PreparationState, TranslationKey> = {
  waiting: "plannedReturnVisibilityCountWaiting", preparing: "plannedReturnVisibilityCountPreparing",
  reached: "plannedReturnVisibilityCountReached", suspended: "plannedReturnVisibilityCountSuspended",
  arrivalOnly: "plannedReturnVisibilityCountArrivalOnly", unavailable: "plannedReturnVisibilityCountUnavailable",
};
export const plannedReturnPreparationStatusStyles = css`
  .return-preparation-badges { display: flex; flex-wrap: wrap; gap: 4px 8px; margin: 8px 0; }
  .return-preparation-badge { position: relative; display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 8px; border-radius: 6px; background: color-mix(in srgb, var(--card-background-color) 80%, #000); font-size: 12px; line-height: 18px; }
  .return-preparation-badge > ha-icon { --mdc-icon-size: 18px; width: 18px; height: 18px; }
  .return-preparation-badge .inline-help-tooltip:not(.visible) { display: none; }
  .return-preparation-status, .return-preparation-room { display: flex; flex-direction: column; gap: 4px; min-width: 0; max-width: 100%; overflow-wrap: anywhere; font-size: 14px; line-height: 1.5; }
  .return-preparation-counts { display: flex; flex-wrap: wrap; gap: 4px 12px; }
  .return-preparation-detail, .return-preparation-counts { color: var(--secondary-text-color); }
  .return-preparation-status[data-state="preparing"] > strong, .return-preparation-room[data-state="preparing"] > strong { color: var(--primary-color); }
`;

export function renderPreparationBadges(summary: ArrivalPreparationSummary, t: Translate, formatTime: FormatTime, now = Date.now()) {
  if (!summary.zones.length) return html`<span class="return-preparation-badges">${renderInlineHelp("return-preparation-no-estimate", t("plannedReturnRoomPreparation"), [
    t("plannedReturnPreparationNoEstimateHelp"), t("plannedReturnVisibilityArrivalAt", { time: formatTime(new Date(summary.arrival).toISOString()) }),
    t("plannedReturnVisibilityArrivalIn", { minutes: Math.max(0, Math.ceil((summary.arrival - now) / 60_000)) }),
  ])}</span>`;
  const entries: Array<[PreparationState, string, TranslationKey]> = [
    ["waiting", "mdi:clock-outline", "plannedReturnPreparationState_pending"],
    ["preparing", "mdi:home-clock-outline", "plannedReturnVisibilityPreparingHelp"],
    ["reached", "mdi:check-circle-outline", "plannedReturnVisibilityReachedHelp"],
    ["suspended", "mdi:pause-circle-outline", "plannedReturnVisibilitySuspendedHelp"],
    ["arrivalOnly", "mdi:home-import-outline", "plannedReturnVisibilityArrivalOnlyHelp"],
    ["unavailable", "mdi:alert-circle-outline", "plannedReturnPreparationState_unavailable"],
  ];
  return html`<div class="return-preparation-badges">${repeat(entries.filter(([state]) => summary.counts[state] > 0), ([state]) => state, ([state, icon, help]) => {
    const label = t(countKeys[state], { count: summary.counts[state] });
    const detail = [label, t(help), t("plannedReturnVisibilityArrivalAt", { time: formatTime(new Date(summary.arrival).toISOString()) }),
      t("plannedReturnVisibilityArrivalIn", { minutes: Math.max(0, Math.ceil((summary.arrival - now) / 60_000)) }),
      state === "waiting" && summary.nextStart !== undefined ? t("plannedReturnVisibilityEstimatedStart", { time: formatTime(new Date(summary.nextStart).toISOString()) }) : "",
      state === "waiting" && summary.nextStart !== undefined && summary.nextStart > now ? t("plannedReturnVisibilityStartsIn", { minutes: Math.ceil((summary.nextStart - now) / 60_000) }) : "",
    ].filter(Boolean);
    return html`<span class="return-preparation-badge" data-room-count=${state}>
      <ha-icon icon=${icon} aria-hidden="true"></ha-icon><span aria-hidden="true">${summary.counts[state]} ${t(`plannedReturnVisibilityKeyword_${state}`)}</span>
      ${renderInlineHelp(`return-preparation-count-${state}`, label, detail, { appearance: "overlay" })}
    </span>`;
  })}</div>`;
}

/** Noninteractive so summaries can also be rendered inside navigation buttons. */
export function renderPreparationStatus(summary: ArrivalPreparationSummary | undefined, t: Translate, formatTime: FormatTime, now = Date.now()) {
  if (!summary) return nothing;
  return html`<span class="return-preparation-status" data-state=${summary.state}>
    <strong title=${summary.state === "preparing" ? t("plannedReturnVisibilityPreparingHelp") : nothing}>${t("plannedReturnVisibilityTitle")} · ${t(stateKeys[summary.state])}</strong>
    ${summary.nextStart !== undefined ? html`<span class="return-preparation-detail">${t("plannedReturnVisibilityEstimatedStart", { time: formatTime(new Date(summary.nextStart).toISOString()) })}${summary.nextStart > now ? html` · ${t("plannedReturnVisibilityStartsIn", { minutes: Math.ceil((summary.nextStart - now) / 60_000) })}` : nothing}</span>` : nothing}
    <span class="return-preparation-detail">${t("plannedReturnVisibilityArrivalIn", { minutes: Math.max(0, Math.ceil((summary.arrival - now) / 60_000)) })}</span>
    <span class="return-preparation-counts">${(Object.entries(summary.counts) as Array<[PreparationState, number]>).filter(([, count]) => count > 0).map(([state, count]) => html`<span data-room-count=${state}>${t(countKeys[state], { count })}</span>`)}</span>
  </span>`;
}

export function renderPreparationRoom(zone: ArrivalPreparationZone | undefined, t: Translate, formatTime: FormatTime, options: { temperatureUnit?: string; arrival: number; now?: number }) {
  if (!zone) return nothing;
  const target = zone.source.target;
  const temperature = target?.temperature != null && Number.isFinite(target.temperature) ? String(target.temperature)
    : target?.target_temp_low != null && target?.target_temp_high != null && Number.isFinite(target.target_temp_low) && Number.isFinite(target.target_temp_high)
      ? `${target.target_temp_low}–${target.target_temp_high}` : undefined;
  return html`<span class="return-preparation-room" data-state=${zone.state}>
    <strong title=${zone.state === "preparing" ? t("plannedReturnVisibilityPreparingHelp") : nothing}>${t("plannedReturnVisibilityTitle")} · ${t(stateKeys[zone.state])}</strong>
    ${zone.start !== undefined ? html`<span class="return-preparation-detail">${t("plannedReturnVisibilityEstimatedStart", { time: formatTime(new Date(zone.start).toISOString()) })}</span>` : nothing}
    ${temperature !== undefined ? html`<span class="return-preparation-detail">${t("plannedReturnPreparationTarget", { temperature, unit: options.temperatureUnit ?? "°C" })}</span>` : nothing}
    <span class="return-preparation-detail">${t("plannedReturnVisibilityArrivalAt", { time: formatTime(new Date(options.arrival).toISOString()) })}</span>
    ${zone.source.reason && zone.source.reason !== zone.source.preconditioning_dependency?.reason ? html`<span class="return-preparation-detail">${t(plannedReturnPreparationReasons[zone.source.reason] ?? "plannedReturnPreparationReasonUnknown")}</span>` : nothing}
    ${renderPreconditioningDependency(zone.source.preconditioning_dependency, t, formatTime)}
  </span>`;
}
