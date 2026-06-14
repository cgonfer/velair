import { html, nothing } from "lit";
import type { VelairViewHost } from "../host-types";
import type { ScheduleZone, VelairCardView } from "../types";
import { renderNotice } from "./notice-view";
import {
  renderOverviewActiveBoosts,
  renderNextEvents,
  renderOverviewSummary,
  renderOverviewTimelines,
  renderOverviewZones,
} from "./overview-view";
import { renderSchedulesView } from "./schedule-view";
import { renderSettingsView } from "./settings-view";
import { renderTemplatesView } from "./templates-view";

type CardContentHost = VelairViewHost;

export function renderCardContent(host: CardContentHost) {
  const view = host._effectiveView();
  const zoneIds = host._orderedZoneIds(host._data?.configured_entities ?? []);
  const selectedEntity = host._selectedEntity ?? zoneIds[0];
  const selectedZone = selectedEntity ? host._data?.zones[selectedEntity] : undefined;

  return html`
    <ha-card>
      <div
        class=${host._schedulerMenuOpen ? "card scheduler-dialog-open" : "card"}
        data-view=${view}
      >
        ${host._schedulerMenuOpen
          ? html`<button class="card-scrim" type="button" @click=${host._closeSchedulerMenu}></button>`
          : nothing}

        ${host._error ? renderNotice(host, "error", host._error) : nothing}
        ${host._saveMessage ? renderNotice(host, "success", host._saveMessage) : nothing}
        ${host._loading && !host._data ? html`<div class="notice">${host._t("loading")}</div>` : nothing}

        ${host._data ? renderViewContent(host, view, zoneIds, selectedEntity, selectedZone) : nothing}
      </div>
    </ha-card>
  `;
}

function renderViewContent(
  host: CardContentHost,
  view: VelairCardView,
  zoneIds: string[],
  selectedEntity?: string,
  selectedZone?: ScheduleZone,
) {
  if (view === "overview") {
    return html`
      ${renderOverviewSummary(host, zoneIds)}
      ${renderOverviewActiveBoosts(host)}
      ${renderNextEvents(host)}
      ${renderOverviewTimelines(host, zoneIds)}
      ${renderOverviewZones(host, zoneIds)}
    `;
  }

  if (view === "overview-status") {
    return renderOverviewSummary(host, zoneIds);
  }

  if (view === "overview-boosts") {
    return renderOverviewActiveBoosts(host);
  }

  if (view === "overview-events") {
    return renderNextEvents(host);
  }

  if (view === "overview-timeline") {
    return renderOverviewTimelines(host, zoneIds);
  }

  if (view === "overview-zones") {
    return renderOverviewZones(host, zoneIds);
  }

  if (view === "schedules") {
    return renderSchedulesView(host, zoneIds, selectedEntity, selectedZone);
  }

  if (view === "templates") {
    return renderTemplatesView(host, selectedEntity);
  }

  if (view === "settings") {
    return renderSettingsView(host, zoneIds);
  }

  return renderOverviewSummary(host, zoneIds);
}
