import { html } from "lit";
import { renderDocumentationHelp } from "./documentation-links";
import type { VelairViewHost } from "../host-types";
import { renderPreconditioningView } from "./preconditioning-view";
import { renderPlannedReturn } from "./planned-return-view";

export function renderPreconditioningWorkspace(host: VelairViewHost, zoneIds: string[]) {
  const planned = host._preconditioningSource === "planned-return";
  return html`<section class="preconditioning-workspace">
    <div class="schedule-source-selector" role="group" aria-label=${host._t("comfortPreparation")}>
      <div class=${!planned ? "schedule-source-option active" : "schedule-source-option"}>
      <button class=${!planned ? "active" : ""} type="button" aria-pressed=${!planned} @click=${() => host._selectPreconditioningSource?.("preconditioning")}><ha-icon icon="mdi:clock-fast"></ha-icon><span><strong>${host._t("preconditioningIntroTitle")}</strong><small>${host._t("comfortPreparationAdaptiveDescription")}</small></span></button>
      ${renderDocumentationHelp(host, "preconditioning", { title: "preconditioningIntroTitle", summary: "preconditioningIntroDetail" })}
      </div>
      <div class=${planned ? "schedule-source-option active" : "schedule-source-option"}>
      <button class=${planned ? "active" : ""} type="button" aria-pressed=${planned} @click=${() => host._selectPreconditioningSource?.("planned-return")}><ha-icon icon="mdi:home-clock-outline"></ha-icon><span><strong>${host._t("plannedReturn")}</strong><small>${host._t("comfortPreparationReturnDescription")}</small></span></button>
      ${renderDocumentationHelp(host, "plannedReturn", { title: "plannedReturn", summary: "plannedReturnSetupsDescription" })}
      </div>
    </div>
    ${planned ? renderPlannedReturn(host) : renderPreconditioningView(host, zoneIds, false)}
  </section>`;
}
