import { html, nothing } from "lit";
import type { VelairViewHost } from "../host-types";
import type { ScheduleResponse, ScheduleZone, VelairCardView } from "../types";
import type { ActiveSetupControls } from "../types";
import { incompatibleScheduleTargetCount } from "../domain/schedule-compatibility";
import { renderNotice } from "./notice-view";
import { operationStatusIsVisible, renderOperationStatus } from "./operation-status-view";
import { renderComfortView, type ComfortViewOptions } from "./comfort-view";
import {
  renderOverviewActiveBoosts,
  renderNextEvents,
  renderOverviewSummary,
  renderOverviewTimelines,
  renderOverviewZones,
} from "./overview-view";
import { renderPreconditioningView } from "./preconditioning-view";
import { renderSchedulesView } from "./schedule-view";
import { renderSensorsView, type RoomSensorViewOptions } from "./sensors-view";
import { renderSettingsView } from "./settings-view";
import { renderTemplatesView } from "./templates-view";
import "../components/profiles-view-element";

type CardContentHost = VelairViewHost;

export function renderCardContent(host: CardContentHost) {
  const view = host._effectiveView();
  const showOperationStatus = !host._hasExternalConfig || view === "active-setup";
  const zoneIds = host._orderedZoneIds(host._data?.configured_entities ?? []);
  const visibleZoneIds = host._visibleZoneIds(host._data?.configured_entities ?? []);
  const selectedEntity = host._selectedEntity && visibleZoneIds.includes(host._selectedEntity)
    ? host._selectedEntity
    : visibleZoneIds[0];
  const selectedZone = selectedEntity ? host._data?.zones[selectedEntity] : undefined;
  const incompatibleTargets = host._data && !host._data.temperature_migration.required
    ? incompatibleScheduleTargetCount(
      host._data.zones,
      (entityId) => host._entityTemperatureLimits(entityId),
      (entityId) => host._entityTemperatureStep(entityId),
    )
    : 0;

  return html`
    <ha-card>
      <div
        class=${host._schedulerMenuOpen ? "card scheduler-dialog-open" : "card"}
        data-view=${view}
      >
        ${host._schedulerMenuOpen
          ? html`<button class="card-scrim" type="button" @click=${host._closeSchedulerMenu}></button>`
          : nothing}

        ${showOperationStatus
          && host._data?.operation_status
          && operationStatusIsVisible(
            host._data.operation_status,
            host._dismissedOperationId,
          )
          ? renderOperationStatus(host, host._data.operation_status)
          : nothing}
        ${host._error ? renderNotice(host, "error", host._error) : nothing}
        ${host._saveMessage ? renderNotice(host, "success", host._saveMessage) : nothing}
        ${host._loading && !host._data ? html`<div class="notice">${host._t("loading")}</div>` : nothing}
        ${host._data?.temperature_migration?.required
          ? html`
              <div class="temperature-migration-banner" role="alert">
                <ha-icon icon="mdi:thermometer-alert"></ha-icon>
                <div>
                  <strong>${host._t("temperatureMigrationRequired")}</strong>
                  <span>${host._t(
                    host._data?.temperature_migration?.reason === "legacy_celsius_upgrade_reset_required"
                      ? "temperatureLegacyResetStopped"
                      : "temperatureMigrationStopped",
                  )}</span>
                </div>
              </div>
            `
          : nothing}
        ${host._data?.operation_recovery
          ? html`
              <div class="temperature-migration-banner" role="alert">
                <ha-icon icon="mdi:database-alert"></ha-icon>
                <div>
                  <strong>${host._t("operationRecoveryRequired")}</strong>
                  <span>${host._t("operationRecoveryDescription")}</span>
                </div>
              </div>
            `
          : nothing}
        ${incompatibleTargets
          ? html`
              <div class="temperature-migration-banner" role="alert">
                <ha-icon icon="mdi:calendar-alert"></ha-icon>
                <div>
                  <strong>${host._t("incompatibleScheduleTargets")}</strong>
                  <span>${host._t("incompatibleScheduleTargetsDescription", { count: incompatibleTargets })}</span>
                </div>
              </div>
            `
          : nothing}

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
  if (host._data?.temperature_migration?.required && view !== "settings") {
    return html`<div class="notice">${host._t(
      host._data.temperature_migration.reason === "legacy_celsius_upgrade_reset_required"
        ? "temperatureLegacyResetStopped"
        : "temperatureMigrationStopped",
    )}</div>`;
  }
  if (view === "overview") {
    return html`
      ${renderOverviewSummary(host, zoneIds)}
      ${renderCompactActiveSetup(host)}
      ${renderOverviewActiveBoosts(host, visibleZoneIds)}
      ${renderNextEvents(host, visibleZoneIds)}
      ${renderOverviewTimelines(host, visibleZoneIds)}
      ${renderOverviewZones(host, visibleZoneIds)}
    `;
  }

  if (view === "profiles") {
    return html`<velair-profiles-view
      .hass=${host.hass}
      .data=${host._data}
      @profile-data-changed=${(event: CustomEvent<ScheduleResponse>) => host._applyScheduleData(event.detail, { forceDraft: false })}
      @profile-success=${(event: CustomEvent<string>) => host._showSuccess(event.detail)}
    ></velair-profiles-view>`;
  }

  if (view === "overview-status") {
    return renderOverviewSummary(host, zoneIds);
  }

  if (view === "active-setup") {
    return renderCompactActiveSetup(host);
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

  if (view === "sensors") {
    return renderSensorsView(host, visibleZoneIds, roomSensorViewOptions(host));
  }

  if (view === "comfort") {
    return renderComfortView(host, visibleZoneIds, comfortViewOptions(host));
  }

  if (view === "preconditioning") {
    return renderPreconditioningView(host, visibleZoneIds);
  }

  if (view === "settings") {
    return renderSettingsView(host, visibleZoneIds);
  }

  return renderOverviewSummary(host, zoneIds);
}

function renderCompactActiveSetup(host: CardContentHost) {
  return html`<velair-profiles-view
    compact
    .activeSetupControls=${activeSetupControls(host._config?.active_setup_controls)}
    .hass=${host.hass}
    .data=${host._data}
    @profile-data-changed=${(event: CustomEvent<ScheduleResponse>) => host._applyScheduleData(event.detail, { forceDraft: false })}
    @profile-success=${(event: CustomEvent<string>) => host._showSuccess(event.detail)}
  ></velair-profiles-view>`;
}

function activeSetupControls(value?: string): ActiveSetupControls {
  return value === "modes" || value === "profiles" ? value : "both";
}

function comfortViewOptions(host: CardContentHost): ComfortViewOptions {
  return {
    showCo2: host._config.show_comfort_co2 !== false,
    showConfiguration: host._config.show_comfort_configuration !== false,
    showHumidity: host._config.show_comfort_humidity !== false,
    showTemperature: host._config.show_comfort_temperature !== false,
  };
}

function roomSensorViewOptions(host: CardContentHost): RoomSensorViewOptions {
  return {
    showAssistSwitch: host._config.show_room_assist_switch !== false,
    showDebounce: host._config.show_room_assist_debounce !== false,
    showLiveStatus: host._config.show_room_assist_live_status !== false,
    showMaxDelta: host._config.show_room_assist_max_delta !== false,
    showRoomSensor: host._config.show_room_assist_sensor !== false,
  };
}
