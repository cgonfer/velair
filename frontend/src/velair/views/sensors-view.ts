import { html, nothing } from "lit";
import {
  appliedAssistOffset,
  appliedAssistRange,
  hasRoomAssistScheduledTarget,
  roomAssistDeadbandZone,
  roomAssistRangeShift,
  scheduledAssistRange,
} from "../domain/room-assist";
import { modeClassName } from "../domain/climate";
import { preconditioningSettings, temperatureSensorOptions } from "../domain/preconditioning";
import { temperatureDeltaMaximum, temperatureDeltaMinimum } from "../domain/temperature-units";
import type { VelairViewHost } from "../host-types";
import type { TranslationKey } from "../translations";
import type { PreconditioningSettings, RoomSensorAssistStatus } from "../types";

type SensorsViewHost = VelairViewHost;

export type RoomSensorViewOptions = {
  showAssistSwitch: boolean;
  showDeadband: boolean;
  showDebounce: boolean;
  showLiveStatus: boolean;
  showMaxDelta: boolean;
  showRoomSensor: boolean;
};

type TemperatureMarker = {
  key: "target" | "scheduledLow" | "scheduledHigh" | "room" | "climateTarget" | "appliedLow" | "appliedHigh" | "climate";
  label: string;
  value: number;
  calloutPosition: number;
  formatted: string;
  lane: number;
  position: number;
  shifted: boolean;
};

type TemperatureMarkerGroup = {
  markers: TemperatureMarker[];
  position: number;
};

type TemperatureRangeBand = {
  kind: "scheduled" | "applied";
  label: string;
  formatted: string;
  left: number;
  width: number;
};

type TemperatureScaleModel = {
  lowerBound: number;
  markers: TemperatureMarker[];
  upperBound: number;
};

const TEMPERATURE_MARKER_COLOR: Record<TemperatureMarker["key"], string> = {
  appliedHigh: "var(--sensor-scale-applied-color)",
  appliedLow: "var(--sensor-scale-applied-color)",
  climate: "var(--secondary-text-color)",
  climateTarget: "var(--sensor-scale-applied-color)",
  room: "var(--sensor-scale-room-color)",
  scheduledHigh: "var(--sensor-scale-scheduled-color)",
  scheduledLow: "var(--sensor-scale-scheduled-color)",
  target: "var(--sensor-scale-scheduled-color)",
};

const TEMPERATURE_MARKER_ORDER: Record<TemperatureMarker["key"], number> = {
  target: 0,
  scheduledLow: 0,
  scheduledHigh: 1,
  room: 2,
  climateTarget: 3,
  appliedLow: 3,
  appliedHigh: 4,
  climate: 5,
};

const TEMPERATURE_MARKER_DOT_GROUP_DISTANCE_PERCENT = 1.25;
const TEMPERATURE_MARKER_COLLISION_DISTANCE_PERCENT = 22;
const TEMPERATURE_MARKER_CALLOUT_EDGE_PERCENT = 10;
const TEMPERATURE_MARKER_CALLOUT_GAP_PERCENT = 24;

const SENSOR_HELP_KEYS: Partial<Record<TranslationKey, TranslationKey>> = {
  roomSensorAssist: "roomSensorAssistHelp",
  roomSensorAssistDeadband: "roomSensorAssistDeadbandHelp",
  roomSensorAssistMaxDelta: "roomSensorAssistMaxDeltaHelp",
  roomSensorAssistDebounce: "roomSensorAssistDebounceHelp",
  roomSensorTemperatureEntity: "roomSensorTemperatureEntityHelp",
};
const DEFAULT_ROOM_SENSOR_VIEW_OPTIONS: RoomSensorViewOptions = {
  showAssistSwitch: true,
  showDeadband: true,
  showDebounce: true,
  showLiveStatus: true,
  showMaxDelta: true,
  showRoomSensor: true,
};

export function renderSensorsView(
  host: SensorsViewHost,
  zoneIds: string[],
  options: Partial<RoomSensorViewOptions> = {},
) {
  const viewOptions = roomSensorViewOptions(options);
  return html`
    <section class="sensors-view">
      <header class="sensors-intro">
        <ha-icon icon="mdi:home-thermometer-outline"></ha-icon>
        <span>
          <strong>${host._t("roomSensorIntroTitle")}</strong>
          <small>${host._t("roomSensorIntroDetail")}</small>
        </span>
      </header>
      ${zoneIds.length
        ? zoneIds.map((entityId) => renderSensorZone(host, entityId, viewOptions))
        : html`<span class="empty">${host._t("noManagedEntities")}</span>`}
    </section>
  `;
}

function roomSensorViewOptions(options: Partial<RoomSensorViewOptions>): RoomSensorViewOptions {
  return {
    ...DEFAULT_ROOM_SENSOR_VIEW_OPTIONS,
    ...options,
  };
}

function renderSensorZone(
  host: SensorsViewHost,
  entityId: string,
  options: RoomSensorViewOptions,
) {
  const exists = host._entityExists(entityId);
  const settings = preconditioningSettings(
    host._data?.zones[entityId]?.preconditioning,
    host._temperatureUnit(entityId),
  );
  const status = host._data?.room_sensor_assist?.[entityId];
  const expanded = exists && host._expandedPreconditioningZones.has(entityId);
  const contentId = `sensor-zone-content-${entityId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const toggleLabel = exists
    ? host._t(
        expanded ? "roomSensorCollapseClimate" : "roomSensorExpandClimate",
        { climate: host._friendlyEntityName(entityId) },
      )
    : host._t("roomSensorUnavailable");
  const canEnable = exists && Boolean(settings.room_temperature_entity_id);
  const handleToggle = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    host._togglePreconditioningZone(entityId);
  };
  const handleHeadingClick = (event: Event) => {
    const target = event.target;
    if (target instanceof Element && target.closest(".sensor-zone-actions")) {
      return;
    }
    host._togglePreconditioningZone(entityId);
  };

  return html`
    <section class=${`sensor-zone ${settings.room_sensor_assist_enabled ? "enabled" : "disabled"} ${expanded ? "expanded" : "collapsed"}`}>
      <header class="sensor-zone-heading" @click=${handleHeadingClick}>
        <button
          type="button"
          class="sensor-zone-toggle"
          title=${toggleLabel}
          aria-label=${toggleLabel}
          aria-expanded=${String(expanded)}
          aria-controls=${expanded ? contentId : nothing}
          ?disabled=${!exists}
          @click=${handleToggle}
        >
          <ha-icon
            class="sensor-expand-icon"
            icon=${expanded ? "mdi:chevron-down" : "mdi:chevron-right"}
          ></ha-icon>
          <span class="sensor-zone-identity">
            <strong title=${host._friendlyEntityName(entityId)}>
              ${host._friendlyEntityName(entityId)}
            </strong>
            <span>${entityId}</span>
          </span>
        </button>
        ${options.showAssistSwitch
          ? html`
              <div class="sensor-zone-actions" @click=${(event: Event) => event.stopPropagation()}>
                <span
                  class=${canEnable ? "sensor-enable-control" : "sensor-enable-control unavailable"}
                  title=${canEnable ? "" : host._t("roomSensorNotConfigured")}
                >
                  <ha-switch
                    .checked=${settings.room_sensor_assist_enabled}
                    ?disabled=${host._settingsSaving || !canEnable}
                    @change=${(event: Event) =>
                      host._saveZonePreconditioning(entityId, {
                        room_sensor_assist_enabled: Boolean((event.target as HTMLInputElement).checked),
                      })}
                  ></ha-switch>
                </span>
              </div>
            `
          : nothing}
      </header>
      ${exists && expanded
        ? html`
            <div id=${contentId} class="sensor-zone-content">
              ${renderSensorConfiguration(host, entityId, settings, options)}
              ${options.showLiveStatus && settings.room_temperature_entity_id && !settings.room_sensor_assist_enabled
                ? renderSensorInactiveNotice(host)
                : nothing}
              ${options.showLiveStatus && settings.room_temperature_entity_id && settings.room_sensor_assist_enabled
                ? renderSensorRuntime(host, entityId, status, settings, options.showDeadband)
                : nothing}
            </div>
          `
        : nothing}
    </section>
  `;
}

function renderSensorConfiguration(
  host: SensorsViewHost,
  entityId: string,
  settings: PreconditioningSettings,
  options: RoomSensorViewOptions,
) {
  if (!options.showRoomSensor && !options.showDeadband && !options.showMaxDelta && !options.showDebounce) {
    return nothing;
  }

  return html`
    <section class="sensor-config-section">
      <h3><ha-icon icon="mdi:tune-variant"></ha-icon>${host._t("roomSensorAssist")}</h3>
      <div class="sensor-config-rows">
        ${options.showRoomSensor
          ? renderSensorEntityPicker(
              host,
              entityId,
              settings.room_temperature_entity_id ?? "",
            )
          : nothing}
        ${options.showDeadband
          ? renderSensorNumber(
              host,
              entityId,
              "roomSensorAssistDeadband",
              "room_sensor_assist_deadband",
              settings.room_sensor_assist_deadband,
              0,
              temperatureDeltaMaximum(host._temperatureUnit(entityId), 5),
              0.1,
              host._temperatureUnit(entityId),
              {
                inactive:
                  !settings.room_temperature_entity_id
                  || !settings.room_sensor_assist_enabled,
              },
            )
          : nothing}
        ${options.showMaxDelta
          ? renderSensorNumber(
              host,
              entityId,
              "roomSensorAssistMaxDelta",
              "room_sensor_assist_max_delta",
              settings.room_sensor_assist_max_delta,
              minAssistDeltaForUnit(host._temperatureUnit(entityId)),
              maxAssistDeltaForUnit(host._temperatureUnit(entityId)),
              minAssistDeltaForUnit(host._temperatureUnit(entityId)),
              host._temperatureUnit(entityId),
              {
                inactive:
                  !settings.room_temperature_entity_id
                  || !settings.room_sensor_assist_enabled,
              },
            )
          : nothing}
        ${options.showDebounce
          ? renderSensorNumber(
              host,
              entityId,
              "roomSensorAssistDebounce",
              "room_sensor_assist_debounce_seconds",
              settings.room_sensor_assist_debounce_seconds,
              0,
              300,
              1,
              host._t("secondsShort"),
              {
                inactive:
                  !settings.room_temperature_entity_id
                  || !settings.room_sensor_assist_enabled,
              },
            )
          : nothing}
      </div>
    </section>
  `;
}

function renderSensorInactiveNotice(host: SensorsViewHost) {
  return html`
    <section class="sensor-runtime-section sensor-inactive-section">
      <h3>
        <ha-icon icon="mdi:power-standby"></ha-icon>
        ${host._t("roomSensorStatusDisabled")}
      </h3>
      <p>${host._t("roomSensorAssistDisabledDetail")}</p>
    </section>
  `;
}

function renderSensorRuntime(
  host: SensorsViewHost,
  entityId: string,
  status?: RoomSensorAssistStatus,
  settings?: PreconditioningSettings,
  showDeadband = true,
) {
  if (!status) {
    return nothing;
  }

  const deadband = settings?.room_sensor_assist_deadband ?? 0;
  const deadbandZone = showDeadband ? roomAssistDeadbandZone(status, deadband) : undefined;
  const scale = buildTemperatureScale(host, entityId, status, deadbandZone);
  const hasActiveBlock = hasRoomAssistScheduledTarget(status) && Boolean(status.start);

  return html`
    <section class="sensor-runtime-section">
      <h3 class="sensor-runtime-heading">
        <span class="sensor-section-title">
          <ha-icon icon="mdi:pulse"></ha-icon>
          ${host._t("roomSensorLiveStatus")}
        </span>
        ${renderSensorStatusPill(host, status)}
      </h3>
      <div class="sensor-status-card">
        ${hasActiveBlock
          ? renderSensorActiveBlockSummary(host, entityId, status)
          : renderSensorIdleState(host)}
        ${hasActiveBlock ? renderRoomAssistLimitWarning(host, entityId, status) : nothing}
        ${hasActiveBlock ? renderRoomAssistScheduledGuard(host, entityId, status) : nothing}
        ${hasActiveBlock && scale.markers.length
          ? renderTemperatureScale(host, entityId, scale, status, deadbandZone, deadband)
          : nothing}
      </div>
    </section>
  `;
}

function renderSensorStatusPill(
  host: SensorsViewHost,
  status?: RoomSensorAssistStatus,
) {
  const state = status?.status ?? "not_configured";
  return html`
    <span class=${`sensor-status-pill ${state}`}>
      ${host._t(roomSensorStatusLabelKey(state))}
    </span>
  `;
}

function renderSensorIdleState(host: SensorsViewHost) {
  return html`
    <div class="sensor-idle-state">
      <ha-icon icon="mdi:clock-outline"></ha-icon>
      <span>${host._t("roomSensorNoActiveBlockDetail")}</span>
    </div>
  `;
}

function renderSensorActiveBlockSummary(
  host: SensorsViewHost,
  entityId: string,
  status: RoomSensorAssistStatus,
) {
  const scheduledTime = status.start ? host._formatScheduleTime(status.start) : "";
  const activeFrom = formatTimeForDisplay(host, status.active_from);
  const startedEarly = Boolean(status.target_when && status.active_from);
  const scheduledRange = scheduledAssistRange(status);
  const target = typeof status.target_temperature === "number"
    ? host._formatTemperature(status.target_temperature, entityId)
    : scheduledRange
      ? formatTemperatureRange(host, entityId, scheduledRange.low, scheduledRange.high)
      : host._t("roomSensorValueUnavailable");
  const mode = status.hvac_mode ? host._modeLabel(status.hvac_mode) : host._t("roomSensorValueUnavailable");

  return html`
    <div class="sensor-block-summary">
      ${startedEarly
        ? html`
            <span class="sensor-block-detail emphasis">
              <ha-icon icon="mdi:creation-outline"></ha-icon>
              ${host._t("roomSensorBlockStartedEarly", { time: activeFrom })}
            </span>
            <span class="sensor-block-detail">
              <ha-icon icon="mdi:calendar-clock"></ha-icon>
              ${host._t("roomSensorBlockScheduled", { time: scheduledTime })}
            </span>
          `
        : html`
            <span class="sensor-block-detail">
              <ha-icon icon="mdi:calendar-clock"></ha-icon>
              ${host._t("roomSensorBlockScheduled", { time: scheduledTime })}
            </span>
            <span class="sensor-block-detail">
              <ha-icon icon="mdi:play-circle-outline"></ha-icon>
              ${host._t("roomSensorBlockActiveSince", { time: scheduledTime })}
            </span>
          `}
      <span class="sensor-block-detail">
        <ha-icon icon="mdi:thermometer"></ha-icon>
        ${host._t("roomSensorBlockTarget", { target })}
      </span>
      <span class="sensor-block-detail">
        <ha-icon icon="mdi:hvac"></ha-icon>
        ${host._t("roomSensorBlockMode", { mode })}
      </span>
    </div>
  `;
}

function renderTemperatureScale(
  host: SensorsViewHost,
  entityId: string,
  scale: TemperatureScaleModel,
  status: RoomSensorAssistStatus,
  deadbandZone?: { low: number; high: number },
  deadband = 0,
) {
  const { markers } = scale;
  const modeClass = status.hvac_mode ? `mode-${modeClassName(status.hvac_mode)}` : "mode-keep";
  const roomGap = buildRoomTargetGap(host, entityId, markers, status);
  const assistOffset = buildAssistOffset(host, entityId, markers, status);
  const rangeBands = buildTemperatureRangeBands(host, entityId, markers, status);
  const hasRangeBands = rangeBands.length === 2;
  const markerGroups = buildTemperatureMarkerGroups(markers);
  const calloutMarkers = hasRangeBands
    ? applyTemperatureMarkerCalloutOffsets(
        markers.filter((marker) => !isTemperatureRangeBoundary(marker.key)),
      )
    : markers;
  const deadbandSurface = deadbandZone && deadband > 0
    ? {
        left: temperatureScalePosition(deadbandZone.low, scale),
        width:
          temperatureScalePosition(deadbandZone.high, scale)
          - temperatureScalePosition(deadbandZone.low, scale),
      }
    : undefined;
  const deadbandValue = formatTemperatureDelta(host, entityId, deadband);
  const deadbandLabel = deadbandZone
    ? deadband === 0
      ? host._t("roomSensorDeadbandZoneZero", { value: deadbandValue })
      : scheduledAssistRange(status)
        ? host._t("roomSensorDeadbandZoneRange", { value: deadbandValue })
        : host._t("roomSensorDeadbandZoneSingle", { value: deadbandValue })
    : "";
  const deadbandHelp = deadbandZone ? host._t("roomSensorDeadbandZoneHelp") : "";
  const deadbandCompactLabel = deadbandZone && deadband > 0
    ? host._t("roomSensorDeadbandZoneCompact", { value: deadbandValue })
    : "";
  const deadbandBriefLabel = deadbandZone && deadband > 0
    ? host._t("roomSensorDeadbandZoneBrief", { value: deadbandValue })
    : "";
  const deadbandBounds = deadbandZone && deadband > 0
    ? formatTemperatureRange(host, entityId, deadbandZone.low, deadbandZone.high)
    : "";
  const deadbandAriaLabel = deadbandBounds
    ? `${deadbandLabel}. ${deadbandBounds}. ${deadbandHelp}`
    : `${deadbandLabel}. ${deadbandHelp}`;
  return html`
    <div class=${`sensor-temperature-scale ${modeClass} ${hasRangeBands ? "has-range" : ""}`}>
      <div
        class="sensor-scale-track"
        role="group"
        aria-label=${host._t("roomSensorTemperatureScale")}
      >
        ${deadbandSurface
          ? html`
              <span
                class="sensor-scale-deadband-zone"
                style=${`left: ${deadbandSurface.left.toFixed(2)}%; width: ${deadbandSurface.width.toFixed(2)}%;`}
                aria-hidden="true"
              ></span>
            `
          : nothing}
        <span class="sensor-scale-line"></span>
        ${roomGap
          ? html`
              <span
                class=${`sensor-scale-relation sensor-scale-room-gap room-gap-${roomGap.position}`}
                style=${[
                  `left: ${roomGap.left.toFixed(2)}%;`,
                  `width: ${roomGap.width.toFixed(2)}%;`,
                ].join(" ")}
                title=${roomGap.label}
                role="note"
                aria-label=${roomGap.label}
              >
                <span>${roomGap.label}</span>
              </span>
            `
          : nothing}
        ${assistOffset
          ? html`
              <span
                class=${`sensor-scale-relation sensor-scale-assist-offset assist-offset-${assistOffset.state}`}
                style=${[
                  `left: ${assistOffset.left.toFixed(2)}%;`,
                  `width: ${assistOffset.width.toFixed(2)}%;`,
                ].join(" ")}
                title=${assistOffset.title}
                role="note"
                aria-label=${`${assistOffset.label}. ${assistOffset.title}`}
              >
                <span>${assistOffset.label}</span>
              </span>
            `
          : nothing}
        ${markerGroups.map(
          (group) => html`
            <span
              class=${temperatureMarkerGroupClass(group)}
              style=${temperatureMarkerGroupStyle(group)}
              role="img"
              aria-label=${temperatureMarkerGroupLabel(group)}
            >
              <span class=${`sensor-scale-dot ${group.markers.length > 1 ? "segmented" : ""}`}></span>
            </span>
          `,
        )}
        ${rangeBands.map(
          (band) => html`
            <span
              class=${`sensor-scale-range-band range-band-${band.kind}`}
              style=${`left: ${band.left.toFixed(2)}%; width: ${band.width.toFixed(2)}%;`}
              role="img"
              aria-label=${`${band.label}: ${band.formatted}`}
            >
              <span class="sensor-scale-range-bracket"></span>
              <span class="sensor-scale-range-label">
                <small>${band.label}</small>
                <strong>${band.formatted}</strong>
              </span>
            </span>
          `,
        )}
        ${calloutMarkers.map(
          (marker) => html`
            <span
              class=${`sensor-scale-callout-marker marker-${marker.key} marker-${temperatureMarkerFamily(marker.key)} lane-${marker.lane} ${temperatureMarkerCalloutEdgeClass(marker)} ${marker.shifted ? "shifted" : ""}`}
              style=${`--callout-left: ${marker.calloutPosition.toFixed(2)}%;`}
            >
              ${renderTemperatureMarkerCallout(host, entityId, marker, status)}
            </span>
          `,
        )}
      </div>
      <div class="sensor-scale-bounds">
        <span>${formatOptionalTemperature(host, entityId, scale.lowerBound)}</span>
        <span>${formatOptionalTemperature(host, entityId, scale.upperBound)}</span>
      </div>
      ${deadbandZone && deadbandSurface
        ? html`
            <div class="sensor-scale-deadband-legend-track">
              <div
                class="sensor-scale-deadband-legend-range"
                style=${`margin-left: ${deadbandSurface.left.toFixed(2)}%; width: ${deadbandSurface.width.toFixed(2)}%;`}
              >
                <div class="sensor-scale-deadband-legend-anchor">
                  <div
                    class="sensor-scale-deadband-legend"
                    role="note"
                    aria-label=${deadbandAriaLabel}
                    title=${deadbandHelp}
                  >
                    <span class="sensor-scale-deadband-swatch" aria-hidden="true"></span>
                    <span class="sensor-scale-deadband-label-short" aria-hidden="true">±</span>
                    <span class="sensor-scale-deadband-label-brief" aria-hidden="true">
                      ${deadbandBriefLabel}
                    </span>
                    <span class="sensor-scale-deadband-label-compact" aria-hidden="true">
                      ${deadbandCompactLabel}
                    </span>
                    <span class="sensor-scale-deadband-label-full" aria-hidden="true">
                      ${deadbandLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          `
        : deadbandZone
          ? html`
            <div
              class="sensor-scale-deadband-legend is-zero"
              role="note"
              aria-label=${deadbandAriaLabel}
              title=${deadbandHelp}
            >
              <span class="sensor-scale-deadband-swatch" aria-hidden="true"></span>
              <span>${deadbandLabel}</span>
            </div>
          `
        : nothing}
    </div>
  `;
}

function renderRoomAssistLimitWarning(
  host: SensorsViewHost,
  entityId: string,
  status: RoomSensorAssistStatus,
) {
  if (!status.limited_by || typeof status.limit_temperature !== "number") {
    return nothing;
  }

  const requestedRange = status.requested_target_temp_low != null
    && status.requested_target_temp_high != null
    ? formatTemperatureRange(
        host,
        entityId,
        status.requested_target_temp_low,
        status.requested_target_temp_high,
      )
    : undefined;
  const appliedRange = status.applied_target_temp_low != null
    && status.applied_target_temp_high != null
    ? formatTemperatureRange(
        host,
        entityId,
        status.applied_target_temp_low,
        status.applied_target_temp_high,
      )
    : undefined;
  const requested = requestedRange
    ?? formatOptionalTemperature(host, entityId, status.requested_temperature);
  const applied = appliedRange
    ?? formatOptionalTemperature(host, entityId, status.applied_temperature);
  const limit = host._formatTemperature(status.limit_temperature, entityId);
  const titleKey: TranslationKey = status.limited_by === "maximum"
    ? "roomSensorLimitMaximumTitle"
    : "roomSensorLimitMinimumTitle";
  const detailKey: TranslationKey = status.limited_by === "maximum"
    ? "roomSensorLimitMaximumDetail"
    : "roomSensorLimitMinimumDetail";

  return html`
    <div class="sensor-limit-warning" role="status">
      <ha-icon icon="mdi:alert-outline"></ha-icon>
      <span>
        <strong>${host._t(titleKey)}</strong>
        <small>${host._t(detailKey, { requested, applied, limit })}</small>
      </span>
    </div>
  `;
}

function renderRoomAssistScheduledGuard(
  host: SensorsViewHost,
  entityId: string,
  status: RoomSensorAssistStatus,
) {
  if (
    !status.scheduled_target_guard
    || typeof status.calculated_temperature !== "number"
    || typeof status.applied_temperature !== "number"
  ) {
    return nothing;
  }

  const calculated = host._formatTemperature(status.calculated_temperature, entityId);
  const applied = host._formatTemperature(status.applied_temperature, entityId);
  const detailKey: TranslationKey = status.scheduled_target_guard === "cooling_floor"
    ? "roomSensorScheduledGuardCoolingDetail"
    : "roomSensorScheduledGuardHeatingDetail";

  return html`
    <div class="sensor-safety-info" role="status">
      <ha-icon icon="mdi:shield-check-outline"></ha-icon>
      <span>
        <strong>${host._t("roomSensorScheduledGuardTitle")}</strong>
        <small>${host._t(detailKey, { calculated, applied })}</small>
      </span>
    </div>
  `;
}

function buildTemperatureRangeBands(
  host: SensorsViewHost,
  entityId: string,
  markers: TemperatureMarker[],
  status: RoomSensorAssistStatus,
): TemperatureRangeBand[] {
  const scheduled = scheduledAssistRange(status);
  const applied = appliedAssistRange(status);
  if (!scheduled || !applied) {
    return [];
  }

  const scheduledLow = markers.find((marker) => marker.key === "scheduledLow");
  const scheduledHigh = markers.find((marker) => marker.key === "scheduledHigh");
  const appliedLow = markers.find((marker) => marker.key === "appliedLow");
  const appliedHigh = markers.find((marker) => marker.key === "appliedHigh");
  if (!scheduledLow || !scheduledHigh || !appliedLow || !appliedHigh) {
    return [];
  }

  return [
    {
      kind: "scheduled",
      label: host._t("roomSensorScheduledRange"),
      formatted: formatTemperatureRange(host, entityId, scheduled.low, scheduled.high),
      left: Math.min(scheduledLow.position, scheduledHigh.position),
      width: Math.abs(scheduledHigh.position - scheduledLow.position),
    },
    {
      kind: "applied",
      label: host._t("roomSensorAppliedRange"),
      formatted: formatTemperatureRange(host, entityId, applied.low, applied.high),
      left: Math.min(appliedLow.position, appliedHigh.position),
      width: Math.abs(appliedHigh.position - appliedLow.position),
    },
  ];
}

function isTemperatureRangeBoundary(key: TemperatureMarker["key"]): boolean {
  return key === "scheduledLow"
    || key === "scheduledHigh"
    || key === "appliedLow"
    || key === "appliedHigh";
}

function buildTemperatureMarkerGroups(
  markers: TemperatureMarker[],
): TemperatureMarkerGroup[] {
  const sortedMarkers = [...markers].sort((first, second) =>
    first.position - second.position
    || TEMPERATURE_MARKER_ORDER[first.key] - TEMPERATURE_MARKER_ORDER[second.key],
  );
  const groups: TemperatureMarkerGroup[] = [];

  for (const marker of sortedMarkers) {
    const currentGroup = groups[groups.length - 1];
    if (
      currentGroup
      && Math.abs(marker.position - currentGroup.position)
        <= TEMPERATURE_MARKER_DOT_GROUP_DISTANCE_PERCENT
    ) {
      currentGroup.markers = [...currentGroup.markers, marker].sort(
        (first, second) =>
          TEMPERATURE_MARKER_ORDER[first.key] - TEMPERATURE_MARKER_ORDER[second.key],
      );
      currentGroup.position = averageMarkerPosition(currentGroup.markers);
      continue;
    }

    groups.push({
      markers: [marker],
      position: marker.position,
    });
  }

  return groups;
}

function averageMarkerPosition(markers: TemperatureMarker[]): number {
  return markers.reduce((total, marker) => total + marker.position, 0) / markers.length;
}

function temperatureMarkerGroupClass(group: TemperatureMarkerGroup): string {
  return [
    "sensor-scale-marker",
    `count-${group.markers.length}`,
    ...group.markers.map((marker) => `marker-${marker.key}`),
    ...new Set(group.markers.map((marker) => `marker-${temperatureMarkerFamily(marker.key)}`)),
  ].join(" ");
}

function temperatureMarkerFamily(key: TemperatureMarker["key"]): "target" | "room" | "climateTarget" | "climate" {
  if (key === "scheduledLow" || key === "scheduledHigh") return "target";
  if (key === "appliedLow" || key === "appliedHigh") return "climateTarget";
  return key;
}

function temperatureMarkerGroupStyle(group: TemperatureMarkerGroup): string {
  const styles = [`left: ${group.position.toFixed(2)}%;`];
  if (group.markers.length > 1) {
    styles.push(`--sensor-scale-dot-segments: ${temperatureMarkerSegments(group.markers)};`);
  }
  return styles.join(" ");
}

function temperatureMarkerSegments(markers: TemperatureMarker[]): string {
  const orderedMarkers = [...markers].sort((first, second) =>
    second.calloutPosition - first.calloutPosition
    || first.lane - second.lane
    || TEMPERATURE_MARKER_ORDER[first.key] - TEMPERATURE_MARKER_ORDER[second.key],
  );
  const step = 360 / orderedMarkers.length;
  const segments = orderedMarkers.map((marker, index) => {
    const start = roundDegrees(index * step);
    const end = roundDegrees((index + 1) * step);
    return `${TEMPERATURE_MARKER_COLOR[marker.key]} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${segments.join(", ")})`;
}

function roundDegrees(value: number): number {
  return Math.round(value * 100) / 100;
}

function temperatureMarkerGroupLabel(group: TemperatureMarkerGroup): string {
  return group.markers
    .map((marker) => `${marker.label}: ${marker.formatted}`)
    .join(", ");
}

function temperatureMarkerCalloutEdgeClass(marker: TemperatureMarker): string {
  if (marker.calloutPosition <= TEMPERATURE_MARKER_CALLOUT_EDGE_PERCENT) {
    return "edge-left";
  }
  if (marker.calloutPosition >= 100 - TEMPERATURE_MARKER_CALLOUT_EDGE_PERCENT) {
    return "edge-right";
  }
  return "";
}

function renderTemperatureMarkerCallout(
  host: SensorsViewHost,
  entityId: string,
  marker: TemperatureMarker,
  status: RoomSensorAssistStatus,
) {
  const appliedOffset = appliedAssistOffset(status);
  const rangeShift = roomAssistRangeShift(status);
  const rangeShiftMarker = rangeBoundaryMarkerKey(status, "applied");
  const assistOffset = marker.key === "climateTarget"
    ? appliedOffset
    : marker.key === rangeShiftMarker
      ? rangeShift
      : null;
  const assistOffsetLabel = typeof assistOffset === "number"
    ? formatSignedTemperatureDelta(host, entityId, assistOffset)
    : "";
  const assistOffsetHelp = host._t(
    rangeShiftMarker && marker.key === rangeShiftMarker
      ? "roomSensorRangeShiftHelp"
      : "roomSensorAssistOffsetHelp",
  );

  return html`
    <span class=${assistOffsetLabel ? "sensor-scale-callout has-offset" : "sensor-scale-callout"}>
      <small>${marker.label}</small>
      <span class="sensor-scale-value-row">
        <strong>${marker.formatted}</strong>
        ${assistOffsetLabel
          ? html`
              <span class="sensor-scale-offset">
                <span>${assistOffsetLabel}</span>
                <span
                  class="sensor-scale-offset-help"
                  tabindex="0"
                  aria-label=${assistOffsetHelp}
                  @click=${(event: Event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <ha-icon icon="mdi:information-outline"></ha-icon>
                  <span class="sensor-scale-offset-tooltip" role="tooltip">
                    ${assistOffsetHelp}
                  </span>
                </span>
              </span>
            `
          : nothing}
      </span>
    </span>
  `;
}

function renderSensorLabel(
  host: SensorsViewHost,
  labelKey: TranslationKey,
  options: { persistentHelp?: boolean } = {},
) {
  const helpKey = SENSOR_HELP_KEYS[labelKey];
  const help = helpKey ? host._t(helpKey) : "";
  if (helpKey && options.persistentHelp) {
    return html`
      <span class="sensor-config-label sensor-config-label-stacked">
        <span>${host._t(labelKey)}</span>
        <small class="sensor-config-help-text">${help}</small>
      </span>
    `;
  }
  return html`
    <span class="label sensor-config-label">
      <span>${host._t(labelKey)}</span>
      ${helpKey
        ? html`
            <span
              class="sensor-help"
              tabindex="0"
              aria-label=${help}
              @click=${(event: Event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <ha-icon icon="mdi:information-outline"></ha-icon>
              <span class="sensor-help-tooltip" role="tooltip">${help}</span>
            </span>
          `
        : nothing}
    </span>
  `;
}

function renderSensorEntityPicker(
  host: SensorsViewHost,
  entityId: string,
  value: string,
) {
  const disabled = host._settingsSaving;
  const sensors = temperatureSensorOptions(host.hass, value);
  return html`
    <label class="sensor-config-row sensor-picker-row">
      ${renderSensorLabel(host, "roomSensorTemperatureEntity")}
      <span class="select-wrap">
        <select
          .value=${value}
          value=${value}
          ?disabled=${disabled}
          @change=${(event: Event) => {
            const nextValue = (event.currentTarget as HTMLSelectElement).value.trim();
            host._saveZonePreconditioning(
              entityId,
              nextValue
                ? { room_temperature_entity_id: nextValue }
                : {
                    room_temperature_entity_id: null,
                    room_sensor_assist_enabled: false,
                  },
            );
          }}
        >
          <option value="" ?selected=${value === ""}>
            ${host._t("roomSensorSelectSensor")}
          </option>
          ${sensors.map(
            (sensor) => html`
              <option value=${sensor.entityId} ?selected=${sensor.entityId === value}>
                ${sensor.label} · ${sensor.entityId}
              </option>
            `,
          )}
        </select>
        ${value
          ? html`<small class="sensor-selected-entity">${value}</small>`
          : nothing}
      </span>
    </label>
  `;
}

function renderSensorNumber(
  host: SensorsViewHost,
  entityId: string,
  labelKey: TranslationKey,
  field: "room_sensor_assist_debounce_seconds" | "room_sensor_assist_deadband" | "room_sensor_assist_max_delta",
  value: number,
  min: number,
  max: number,
  step: number,
  unit: string,
  options: { inactive?: boolean } = {},
) {
  const disabled = host._settingsSaving || Boolean(options.inactive);
  const persistentHelp = field === "room_sensor_assist_deadband" || field === "room_sensor_assist_max_delta";
  return html`
    <label class=${`sensor-config-row ${options.inactive ? "inactive" : ""}`}>
      ${renderSensorLabel(host, labelKey, { persistentHelp })}
      <span class="sensor-number-input">
        <input
          type="number"
          min=${String(min)}
          max=${String(max)}
          step=${String(step)}
          .value=${String(value)}
          ?disabled=${disabled}
          @change=${(event: Event) => {
            if (disabled) {
              return;
            }
            const inputValue = (event.currentTarget as HTMLInputElement).value.trim();
            const rawValue = Number(inputValue);
            if (field === "room_sensor_assist_deadband") {
              if (
                inputValue === ""
                || !Number.isFinite(rawValue)
                || rawValue < min
                || rawValue > max
                || Math.abs((rawValue / step) - Math.round(rawValue / step)) > 0.000001
              ) {
                (event.currentTarget as HTMLInputElement).value = String(value);
                return;
              }
              host._saveZonePreconditioning(entityId, { [field]: rawValue });
              return;
            }
            const boundedValue = Math.min(
              max,
              Math.max(min, Number.isFinite(rawValue) ? rawValue : value),
            );
            host._saveZonePreconditioning(entityId, {
              [field]: boundedValue,
            });
          }}
        />
        <span>${unit}</span>
      </span>
    </label>
  `;
}

function maxAssistDeltaForUnit(unit: string): number {
  return temperatureDeltaMaximum(unit, 10);
}

function minAssistDeltaForUnit(unit: string): number {
  void unit;
  return 0.1;
}

function formatOptionalTemperature(
  host: SensorsViewHost,
  entityId: string,
  value?: number | null,
) {
  return typeof value === "number"
    ? host._formatTemperature(value, entityId)
    : host._t("roomSensorValueUnavailable");
}

function buildRoomTargetGap(
  host: SensorsViewHost,
  entityId: string,
  markers: TemperatureMarker[],
  status: RoomSensorAssistStatus,
) {
  const roomMarker = markers.find((marker) => marker.key === "room");
  const scheduledRange = scheduledAssistRange(status);
  const boundaryKey = scheduledRange && roomMarker
    ? roomMarker.value < scheduledRange.low
      ? "scheduledLow"
      : roomMarker.value > scheduledRange.high
        ? "scheduledHigh"
        : undefined
    : "target";
  const targetMarker = markers.find((marker) => marker.key === boundaryKey);
  if (!targetMarker || !roomMarker) {
    return null;
  }

  const pendingDelta = Math.abs(targetMarker.value - roomMarker.value);
  const unit = host._temperatureUnit(entityId);
  const minimumVisibleDelta = unit.toUpperCase().includes("F") ? 0.1 : 0.05;
  if (pendingDelta < minimumVisibleDelta) {
    return null;
  }

  const value = formatTemperatureDelta(host, entityId, pendingDelta);
  const position = roomMarker.value < targetMarker.value ? "below" : "above";
  return {
    label: host._t(
      position === "below" ? "roomSensorGapBelowTarget" : "roomSensorGapAboveTarget",
      { value },
    ),
    left: Math.min(targetMarker.position, roomMarker.position),
    position,
    width: Math.abs(targetMarker.position - roomMarker.position),
  };
}

function buildAssistOffset(
  host: SensorsViewHost,
  entityId: string,
  markers: TemperatureMarker[],
  status: RoomSensorAssistStatus,
) {
  const rangeShift = roomAssistRangeShift(status);
  const scheduledRangeCenter = rangeShift !== undefined
    ? temperatureRangeCenter(markers, "scheduledLow", "scheduledHigh")
    : undefined;
  const appliedRangeCenter = rangeShift !== undefined
    ? temperatureRangeCenter(markers, "appliedLow", "appliedHigh")
    : undefined;
  const climateMarker = markers.find((marker) => marker.key === "climate");
  const climateTargetMarker = markers.find((marker) => marker.key === "climateTarget");
  const signedDelta = rangeShift ?? appliedAssistOffset(status);
  const startPosition = rangeShift !== undefined
    ? scheduledRangeCenter
    : climateMarker?.position;
  const endPosition = rangeShift !== undefined
    ? appliedRangeCenter
    : climateTargetMarker?.position;
  if (startPosition === undefined || endPosition === undefined || signedDelta === undefined) {
    return null;
  }

  const unit = host._temperatureUnit(entityId);
  const minimumVisibleDelta = unit.toUpperCase().includes("F") ? 0.1 : 0.05;
  const offsetIsActive = Math.abs(signedDelta) >= minimumVisibleDelta;
  const offsetState = offsetIsActive ? "active" : "holding";
  const correction = formatSignedTemperatureDelta(host, entityId, signedDelta);
  return {
    label: rangeShift !== undefined
      ? host._t("roomSensorRangeShiftValue", { value: correction })
      : offsetState === "active"
        ? host._t("roomSensorAssistCorrectionValue", { value: correction })
      : host._t("roomSensorAssistNoCorrection"),
    left: Math.min(startPosition, endPosition),
    state: offsetState,
    title: rangeShift !== undefined
      ? host._t("roomSensorRangeShiftHelp")
      : offsetState === "active"
        ? host._t("roomSensorAssistCorrectionActiveHelp")
      : host._t("roomSensorAssistNoCorrectionHelp"),
    width: Math.abs(startPosition - endPosition),
  };
}

function temperatureRangeCenter(
  markers: TemperatureMarker[],
  lowKey: TemperatureMarker["key"],
  highKey: TemperatureMarker["key"],
): number | undefined {
  const low = markers.find((marker) => marker.key === lowKey);
  const high = markers.find((marker) => marker.key === highKey);
  return low && high ? (low.position + high.position) / 2 : undefined;
}

function formatTemperatureDelta(
  host: SensorsViewHost,
  entityId: string,
  value: number,
) {
  return host._formatTemperature(Math.abs(value), entityId);
}

function formatSignedTemperatureDelta(
  host: SensorsViewHost,
  entityId: string,
  value: number,
) {
  const formatted = formatTemperatureDelta(host, entityId, value);
  if (value > 0) {
    return `+${formatted}`;
  }
  if (value < 0) {
    return `-${formatted}`;
  }
  return formatted;
}

function buildTemperatureScale(
  host: SensorsViewHost,
  entityId: string,
  status: RoomSensorAssistStatus,
  deadbandZone?: { low: number; high: number },
): TemperatureScaleModel {
  const scheduledRange = scheduledAssistRange(status);
  const appliedRange = appliedAssistRange(status);
  const effectiveClimateTarget = scheduledRange
    ? undefined
    : status.status === "assisting" || status.status === "holding"
      ? (status.applied_temperature ?? status.climate_target_temperature)
      : (status.climate_target_temperature ?? status.applied_temperature);
  const markerInputs = [
    {
      key: "target" as const,
      label: host._t("roomSensorScheduledTarget"),
      value: status.target_temperature,
    },
    {
      key: "scheduledLow" as const,
      label: host._t("roomSensorScheduledLow"),
      value: scheduledRange?.low,
    },
    {
      key: "scheduledHigh" as const,
      label: host._t("roomSensorScheduledHigh"),
      value: scheduledRange?.high,
    },
    {
      key: "room" as const,
      label: host._t("roomSensorRoomTemperature"),
      value: status.room_temperature,
    },
    {
      key: "climateTarget" as const,
      label: host._t("roomSensorClimateTarget"),
      value: effectiveClimateTarget,
    },
    {
      key: "appliedLow" as const,
      label: host._t("roomSensorAppliedLow"),
      value: appliedRange?.low,
    },
    {
      key: "appliedHigh" as const,
      label: host._t("roomSensorAppliedHigh"),
      value: appliedRange?.high,
    },
    {
      key: "climate" as const,
      label: host._t("roomSensorClimateTemperature"),
      value: status.climate_temperature,
    },
  ].filter(
    (
      marker,
    ): marker is Omit<
      TemperatureMarker,
      "calloutPosition" | "formatted" | "lane" | "position" | "shifted"
    > => typeof marker.value === "number",
  );

  if (!markerInputs.length) {
    return { lowerBound: 0, markers: [], upperBound: 0 };
  }

  const values = [
    ...markerInputs.map((marker) => marker.value),
    ...(deadbandZone ? [deadbandZone.low, deadbandZone.high] : []),
  ];
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const unit = host._temperatureUnit(entityId);
  const fallbackPadding = unit.toUpperCase().includes("F") ? 2 : 1;
  const observedRange = maxValue - minValue;
  const range = Math.max(observedRange, fallbackPadding);
  const centerValue = (minValue + maxValue) / 2;
  const lowerBound = centerValue - range * 0.58;
  const upperBound = centerValue + range * 0.58;
  const boundedRange = upperBound - lowerBound;

  const positionedMarkers = markerInputs.map((marker) => {
    return {
      ...marker,
      calloutPosition: 0,
      formatted: host._formatTemperature(marker.value, entityId),
      lane: 0,
      position: Math.max(
        0,
        Math.min(100, ((marker.value - lowerBound) / boundedRange) * 100),
      ),
      shifted: false,
    };
  });

  return {
    lowerBound,
    markers: applyTemperatureMarkerCalloutOffsets(positionedMarkers),
    upperBound,
  };
}

function temperatureScalePosition(value: number, scale: TemperatureScaleModel): number {
  const range = scale.upperBound - scale.lowerBound;
  if (range <= 0) {
    return 50;
  }
  return clamp(((value - scale.lowerBound) / range) * 100, 0, 100);
}

function rangeBoundaryMarkerKey(
  status: RoomSensorAssistStatus,
  kind: "scheduled" | "applied",
): TemperatureMarker["key"] | undefined {
  const scheduled = scheduledAssistRange(status);
  if (!scheduled) {
    return undefined;
  }
  const room = typeof status.room_temperature === "number" ? status.room_temperature : undefined;
  const boundary = status.direction === "cool" || (room !== undefined && room > scheduled.high)
    ? "High"
    : "Low";
  return `${kind}${boundary}` as TemperatureMarker["key"];
}

function formatTemperatureRange(
  host: SensorsViewHost,
  entityId: string,
  low: number,
  high: number,
): string {
  const formattedLow = host._formatTemperature(low, entityId).replace(/\s+[^\s]+$/, "");
  return `${formattedLow}–${host._formatTemperature(high, entityId)}`;
}

function applyTemperatureMarkerCalloutOffsets(
  markers: TemperatureMarker[],
): TemperatureMarker[] {
  const sortedMarkers = [...markers].sort((first, second) => first.position - second.position);
  const offsetsByKey = new Map<
    TemperatureMarker["key"],
    Pick<TemperatureMarker, "calloutPosition" | "lane" | "shifted">
  >();

  const clusters: TemperatureMarker[][] = [];
  let cluster: TemperatureMarker[] = [];
  const flushCluster = () => {
    if (cluster.length) {
      clusters.push(cluster);
      cluster = [];
    }
  };

  for (const marker of sortedMarkers) {
    const previous = cluster[cluster.length - 1];
    if (
      previous
      && marker.position - previous.position > TEMPERATURE_MARKER_COLLISION_DISTANCE_PERCENT
    ) {
      flushCluster();
    }
    cluster.push(marker);
  }
  flushCluster();

  for (let index = 0; index < clusters.length - 1;) {
    const currentPositions = calloutPositionsForMarkers(clusters[index]);
    const nextPositions = calloutPositionsForMarkers(clusters[index + 1]);
    const currentRight = currentPositions[currentPositions.length - 1];
    const nextLeft = nextPositions[0];
    if (nextLeft - currentRight < TEMPERATURE_MARKER_CALLOUT_GAP_PERCENT) {
      clusters.splice(index, 2, [...clusters[index], ...clusters[index + 1]]);
      index = Math.max(0, index - 1);
      continue;
    }
    index += 1;
  }

  for (const markerCluster of clusters) {
    const calloutPositions = calloutPositionsForMarkers(markerCluster);
    markerCluster.forEach((marker, index) => {
      const calloutPosition = calloutPositions[index] ?? marker.position;
      offsetsByKey.set(marker.key, {
        calloutPosition,
        lane: index,
        shifted: Math.abs(calloutPosition - marker.position) > 0.5,
      });
    });
  }

  return markers.map((marker) => ({
    ...marker,
    ...(offsetsByKey.get(marker.key) ?? {
      calloutPosition: marker.position,
      lane: 0,
      shifted: false,
    }),
  }));
}

function calloutPositionsForMarkers(markers: TemperatureMarker[]): number[] {
  const centerPosition =
    markers.reduce((total, marker) => total + marker.position, 0) / markers.length;
  return calloutPositionsForCluster(markers.length, centerPosition);
}

function calloutPositionsForCluster(count: number, centerPosition: number): number[] {
  if (count <= 1) {
    return [clamp(centerPosition, TEMPERATURE_MARKER_CALLOUT_EDGE_PERCENT, 100 - TEMPERATURE_MARKER_CALLOUT_EDGE_PERCENT)];
  }

  const availableSpan = 100 - 2 * TEMPERATURE_MARKER_CALLOUT_EDGE_PERCENT;
  const gap = Math.min(TEMPERATURE_MARKER_CALLOUT_GAP_PERCENT, availableSpan / (count - 1));
  const span = (count - 1) * gap;
  let firstPosition = centerPosition - span / 2;
  const minPosition = TEMPERATURE_MARKER_CALLOUT_EDGE_PERCENT;
  const maxPosition = 100 - TEMPERATURE_MARKER_CALLOUT_EDGE_PERCENT;

  if (firstPosition < minPosition) {
    firstPosition = minPosition;
  } else if (firstPosition + span > maxPosition) {
    firstPosition = maxPosition - span;
  }

  return Array.from(
    { length: count },
    (_, index) => clamp(
      firstPosition + index * gap,
      minPosition,
      maxPosition,
    ),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatTimeForDisplay(host: SensorsViewHost, value?: string | null) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const localTime = `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
  return host._formatScheduleTime(localTime);
}

function roomSensorStatusLabelKey(
  status: RoomSensorAssistStatus["status"],
): TranslationKey {
  const keys: Record<RoomSensorAssistStatus["status"], TranslationKey> = {
    assisting: "roomSensorStatusAssisting",
    blocked: "roomSensorStatusBlocked",
    disabled: "roomSensorStatusDisabled",
    holding: "roomSensorStatusHolding",
    idle: "roomSensorStatusIdle",
    not_configured: "roomSensorStatusNotConfigured",
    ready: "roomSensorStatusReady",
    unavailable: "roomSensorStatusUnavailable",
  };
  return keys[status];
}
