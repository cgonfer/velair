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
import { renderPreconditioningView } from "./preconditioning-view";
import { renderSchedulesView } from "./schedule-view";
import { renderSettingsView } from "./settings-view";
import { renderTemplatesView } from "./templates-view";

type CardContentHost = VelairViewHost;

export function renderCardContent(host: CardContentHost) {
  const view = host._effectiveView();
  const zoneIds = host._orderedZoneIds(host._data?.configured_entities ?? []);
  const visibleZoneIds = host._visibleZoneIds(host._data?.configured_entities ?? []);
  const selectedEntity = host._selectedEntity && visibleZoneIds.includes(host._selectedEntity)
    ? host._selectedEntity
    : visibleZoneIds[0];
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

        ${host._data ? renderViewContent(host, view, zoneIds, visibleZoneIds, selectedEntity, selectedZone) : nothing}
      </div>
    </ha-card>
  `;
}

function renderViewContent(
  host: CardContentHost,
  view: VelairCardView,
  zoneIds: string[],
  visibleZoneIds: string[],
  selectedEntity?: string,
  selectedZone?: ScheduleZone,
) {
  if (view === "overview") {
    return html`
      ${renderOverviewSummary(host, zoneIds)}
      ${renderOverviewActiveBoosts(host, visibleZoneIds)}
      ${renderNextEvents(host, visibleZoneIds)}
      ${renderOverviewTimelines(host, visibleZoneIds)}
      ${renderOverviewZones(host, visibleZoneIds)}
    `;
  }

  if (view === "overview-status") {
    return renderOverviewSummary(host, zoneIds);
  }

  if (view === "overview-boosts") {
    return renderOverviewActiveBoosts(host, visibleZoneIds);
  }

  if (view === "overview-events") {
    return renderNextEvents(host, visibleZoneIds);
  }

  if (view === "overview-timeline") {
    return renderOverviewTimelines(host, visibleZoneIds);
  }

  if (view === "overview-zones") {
    return renderOverviewZones(host, visibleZoneIds);
  }

  if (view === "schedules") {
    return renderSchedulesView(host, visibleZoneIds, selectedEntity, selectedZone);
  }

  if (view === "templates") {
    return renderTemplatesView(host, selectedEntity);
  }

  if (view === "preconditioning") {
    return renderPreconditioningView(host, visibleZoneIds);
  }

  if (view === "settings") {
    return renderSettingsView(host, visibleZoneIds);
  }

  return renderOverviewSummary(host, zoneIds);
}
