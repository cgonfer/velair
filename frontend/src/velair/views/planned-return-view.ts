import { html, nothing } from "lit";
import { renderDocumentationHelp } from "./documentation-links";
import type { VelairViewHost } from "../host-types";
import type { ScheduleResponse } from "../types";
import type { TranslationKey } from "../translations";

export function renderPlannedReturn(host: VelairViewHost, settings = true, compact = false, embedded = false, entityId?: string) {
  return html`<section class="preconditioning-view planned-return-view">
    ${settings ? html`<header class="preconditioning-intro">
      <ha-icon icon="mdi:home-clock-outline"></ha-icon>
      <span><strong>${host._t("plannedReturn")}</strong><small>${host._t("comfortPreparationReturnDescription")}</small></span>
      ${renderDocumentationHelp(host, "plannedReturn", { summary: "plannedReturnSetupsDescription" })}
    </header>` : nothing}
    <velair-planned-return .hass=${host.hass} .data=${host._data} .settings=${settings} .compact=${compact} .embedded=${embedded} .entityId=${entityId}
    .t=${(key: TranslationKey, values?: Record<string, string | number>) => host._t(key, values)}
    .weekdayName=${(day: string) => host._weekdayName(day)}
    @planned-return-busy=${(e: CustomEvent<boolean>) => { e.stopPropagation(); host._setPlannedReturnBusy?.(e.detail); }}
    @velair-dirty-changed=${(e: CustomEvent<{ dirty: boolean }>) => { e.stopPropagation(); host._setPlannedReturnDirty?.(e.detail.dirty); }}
    @planned-return-updated=${(e: CustomEvent<ScheduleResponse>) => host._applyScheduleData(e.detail)}></velair-planned-return>
  </section>`;
}
