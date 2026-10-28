import { controlUnitName } from "../domain/control-units";
import { css, html, nothing } from "lit";
import type { HomeAssistant, PlannedReturnPreparation, ScheduleResponse } from "../types";
import type { TranslationKey } from "../translations";
import { renderPreconditioningDependency } from "./preconditioning-dependency";

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;
export const plannedReturnPreparationReasons: Record<string, TranslationKey> = {
  zone_disabled: "plannedReturnPreparationReasonZoneDisabled",
  external_execution: "plannedReturnPreparationReasonExternal",
  profile_paused: "plannedReturnPreparationReasonProfilePaused",
  preconditioning_disabled: "plannedReturnPreparationReasonDisabled",
  missing_target: "plannedReturnPreparationReasonTarget",
  missing_temperature: "plannedReturnPreparationReasonTemperature",
  unsupported_mode: "plannedReturnPreparationReasonMode",
  unsupported_range_mode: "unsupportedRangeThermalMode",
  range_reference_not_configured: "rangeReferenceNotConfigured",
  no_estimate: "plannedReturnPreparationReasonEstimate",
  scheduler_stopped: "plannedReturnPreparationReasonSchedulerStopped",
  scheduler_not_auto: "plannedReturnPreparationReasonSchedulerNotAuto",
  boost: "plannedReturnPreparationReasonBoost",
  manual_adjustment: "plannedReturnPreparationReasonManual",
  paused: "plannedReturnPreparationReasonPaused",
};
const categoryKeys = {
  adaptive: "plannedReturnPreparationAdaptive",
  arrival_only: "plannedReturnPreparationArrivalOnly",
  none: "plannedReturnPreparationNone",
} as const;
const categoryIcons = { adaptive: "mdi:clock-fast", arrival_only: "mdi:home-clock-outline", none: "mdi:minus-circle-outline" };

export const plannedReturnPreparationStyles = css`
  .room-preparation { margin-top: 20px; border-top: 1px solid var(--divider-color); padding-top: 8px; }
  .preparation-toggle { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 16px; width: 100%; min-height: 44px; padding: 8px 0; text-align: start; border-color: transparent; background: transparent; }
  .preparation-toggle:hover { background: color-mix(in srgb, var(--secondary-text-color) 6%, transparent); }
  .preparation-toggle > strong { font-weight: 600; }
  .preparation-toggle > ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color); margin-inline-start: auto; }
  .preparation-counts { display: flex; flex-wrap: wrap; gap: 8px 16px; color: var(--secondary-text-color); font-size: 14px; }
  .preparation-count { display: inline-flex; align-items: center; gap: 6px; }
  .preparation-count ha-icon { --mdc-icon-size: 18px; }
  .preparation-rooms { padding: 0; margin: 8px 0 0; list-style: none; }
  .preparation-rooms[hidden] { display: none; }
  .preparation-room { display: grid; grid-template-columns: 36px minmax(0, 1fr) minmax(0, 1fr); gap: 8px 12px; align-items: center; padding: 12px 0; min-height: 44px; }
  .preparation-room + .preparation-room { border-top: 1px solid var(--divider-color); }
  .preparation-room > ha-icon { --mdc-icon-size: 24px; color: var(--secondary-text-color); display: flex; align-items: center; justify-content: center; width: 36px; height: 1.5em; align-self: start; }
  .preparation-room-name, .preparation-room-status { display: flex; flex-direction: column; justify-content: center; gap: 4px; align-self: center; min-width: 0; overflow-wrap: anywhere; line-height: 1.5; }
  .preparation-room-name { align-self: start; }
  .preparation-room-name > strong { font-weight: 600; }
  .preparation-room-name small, .preparation-reason, .preparation-detail { display: block; margin: 0; color: var(--secondary-text-color); font-size: 14px; line-height: 1.5; }
  .preparation-room-status > span:first-child { display: inline-flex; align-items: center; gap: 6px; }
  .preparation-room-status ha-icon { --mdc-icon-size: 18px; flex-shrink: 0; color: var(--secondary-text-color); }
  .preparation-room[data-state="preparing"] .preparation-room-status ha-icon { color: var(--primary-color); }
  .preparation-room[data-state="reached"] .preparation-room-status ha-icon { color: var(--success-color, #2e7d32); }
  .room-preparation .preparation-help { margin: 8px 0 0; font-size: 14px; }
  @container (max-width: 540px) {
    .preparation-toggle > strong { flex: 1; }
    .preparation-counts { flex-basis: 100%; order: 1; }
    .preparation-room { grid-template-columns: 36px minmax(0, 1fr); }
    .preparation-room-status { grid-column: 2; }
  }
`;

export function renderPlannedReturnPreparation(options: {
  preparation?: PlannedReturnPreparation;
  data?: ScheduleResponse;
  hass?: HomeAssistant;
  t: Translate;
  expanded: boolean;
  toggle: () => void;
  displayTime: (iso: string) => string;
}) {
  const { preparation, data, hass, t, expanded, toggle, displayTime } = options;
  if (!preparation) return html`<div class="room-preparation"><p class="preparation-help">${t("plannedReturnPreparationUnavailable")}</p></div>`;
  const arrival = preparation.context === "arrival" && Boolean(preparation.return_at);
  const counts = { adaptive: 0, arrival_only: 0, none: 0 };
  for (const zone of preparation.zones) counts[zone.preparation]++;
  return html`<div class="room-preparation">
    <button type="button" class="preparation-toggle" aria-expanded=${String(expanded)} aria-controls="planned-return-preparation-rooms" @click=${toggle}>
      <strong>${t("plannedReturnRoomPreparation")}</strong>
      <span class="preparation-counts">${Object.entries(counts).map(([category, count]) => html`<span class="preparation-count" data-preparation-count=${category}><ha-icon icon=${categoryIcons[category as keyof typeof counts]}></ha-icon>${t(categoryKeys[category as keyof typeof counts], { count })}</span>`)}</span>
      <ha-icon icon=${expanded ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>
    </button>
    <ul id="planned-return-preparation-rooms" class="preparation-rooms" ?hidden=${!expanded}>
      ${preparation.zones.map((zone) => {
        const profile = data?.profiles?.find((candidate) => candidate.key === zone.profile_id);
        const schedule = zone.schedule_source === "default" ? t("modeDefault") : zone.schedule_source === "paused" ? t("plannedReturnPreparationSchedulePaused") : profile?.name ?? t("plannedReturnPreparationProfile");
        const target = zone.target;
        const temperature = target?.temperature != null ? `${target.temperature}` : target?.target_temp_low != null && target?.target_temp_high != null ? `${target.target_temp_low}–${target.target_temp_high}` : null;
        const stateKey = `plannedReturnPreparationState_${zone.state}` as TranslationKey;
        const labelKey = !arrival || (zone.preparation === "arrival_only" && zone.state === "pending")
          ? `plannedReturnPreparationCategory_${zone.preparation}` as TranslationKey
          : stateKey;
        const stateIcon = zone.state === "reached" ? "mdi:check-circle-outline" : zone.state === "suspended" ? "mdi:pause-circle-outline" : categoryIcons[zone.preparation];
        return html`<li class="preparation-room" data-entity=${zone.entity_id} data-state=${zone.state}>
          <ha-icon icon=${hass?.states?.[zone.entity_id]?.attributes?.icon ?? "mdi:thermostat"}></ha-icon>
          <div class="preparation-room-name"><strong>${controlUnitName(data, hass, zone.entity_id)}</strong><small>${t("plannedReturnPreparationSchedule", { schedule })}</small></div>
          <div class="preparation-room-status"><span><ha-icon icon=${stateIcon}></ha-icon>${t(labelKey)}</span>
            ${zone.reason && zone.reason !== zone.preconditioning_dependency?.reason ? html`<span class="preparation-reason">${t(plannedReturnPreparationReasons[zone.reason] ?? "plannedReturnPreparationReasonUnknown")}</span>` : nothing}
            ${renderPreconditioningDependency(zone.preconditioning_dependency, t, displayTime, zone.preconditioning_dependency ? controlUnitName(data, hass, zone.preconditioning_dependency.master_entity_id) : undefined)}
            ${arrival && zone.start_at ? html`<span class="preparation-detail">${t("plannedReturnPreparationPlannedStart", { time: displayTime(zone.start_at) })}</span>` : nothing}
            ${arrival && temperature !== null ? html`<span class="preparation-detail">${t("plannedReturnPreparationTarget", { temperature, unit: data?.temperature_unit ?? "" })}</span>` : nothing}
          </div>
        </li>`;
      })}
      ${!preparation.zones.length ? html`<li class="preparation-help">${t("plannedReturnPreparationNoRooms")}</li>` : nothing}
      ${!arrival ? html`<li class="preparation-help">${t("plannedReturnPreparationConfigurationHelp")}</li>` : nothing}
    </ul>
  </div>`;
}
