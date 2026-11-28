import { renderRoomAssistGraph } from "../components/room-assist-graph-element";
import { html, nothing } from "lit";
import "../components/room-sensor-schedule-element";
import { brakingStepEquivalent, hasRoomAssistScheduledTarget } from "../domain/room-assist";
import { temperatureMatchesStep } from "../domain/climate";
import { preconditioningSettings } from "../domain/preconditioning";
import { temperatureDeltaMaximum, temperatureDeltaMinimum } from "../domain/temperature-units";
import type { VelairViewHost } from "../host-types";
import type { TranslationKey } from "../translations";
import type { PreconditioningSettings, RoomAssistBrakingLevel, RoomSensorAssistStatus } from "../types";
import { renderInlineHelp } from "./inline-help";
import { renderDocumentationHelp } from "./documentation-links";

type SensorsViewHost = VelairViewHost;

export type RoomSensorViewOptions = {
  showAssistSwitch: boolean;
  showDeadband: boolean;
  showDebounce: boolean;
  showLiveStatus: boolean;
  showMaxDelta: boolean;
  showRoomSensor: boolean;
};

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
        ${renderDocumentationHelp(host, "roomAssist")}
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
  if (host._data?.zones[entityId]?.execution?.type === "external") {
    return html`
      <section class="sensor-zone disabled">
        <header class="sensor-zone-heading">
          <span class="sensor-zone-identity">
            <strong title=${host._friendlyEntityName(entityId)}>${host._friendlyEntityName(entityId)}</strong>
            <span>${entityId}</span>
          </span>
        </header>
        <div class="sensor-zone-content">
          <div class="notice">${host._t("externalActionsInactive")}</div>
        </div>
      </section>
    `;
  }
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
  const hasReference = Boolean(settings.room_temperature_entity_id || settings.room_sensor_schedule?.enabled);
  const canEnable = exists && (hasReference || settings.room_sensor_assist_enabled);
  const nativeReference = expanded && status?.room_sensor_schedule?.enabled && status.room_sensor_schedule.effective_source === null;
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
              ${!options.showRoomSensor && options.showLiveStatus && settings.room_sensor_schedule?.enabled && settings.room_sensor_assist_enabled
                ? html`<velair-room-sensor-schedule .host=${host} .settings=${settings} .runtime=${status}
                    .entityId=${entityId} .disabled=${host._settingsSaving}
                    .language=${host._language?.() ?? ""}
                    .showEditor=${false} .showLiveStatus=${true}></velair-room-sensor-schedule>`
                : nothing}
              ${options.showLiveStatus && hasReference && !settings.room_sensor_assist_enabled
                ? renderSensorInactiveNotice(host, Boolean(settings.room_sensor_schedule?.enabled))
                : nothing}
              ${options.showLiveStatus && nativeReference && settings.room_sensor_assist_enabled && status?.status === "blocked"
                ? renderSensorStatusPill(host, status)
                : nothing}
              ${options.showLiveStatus && hasReference && settings.room_sensor_assist_enabled && !nativeReference
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
      ${!options.showRoomSensor ? html`<h3><ha-icon icon="mdi:tune-variant"></ha-icon>${renderSensorLabel(host, "roomSensorAssist")}</h3>` : nothing}
      <div class="sensor-config-rows">
        ${options.showRoomSensor
          ? html`<velair-room-sensor-schedule class="sensor-reference-control"
              .host=${host} .settings=${settings} .runtime=${host._data?.room_sensor_assist?.[entityId]}
              .entityId=${entityId} .disabled=${host._settingsSaving}
              .language=${host._language?.() ?? ""} .showLiveStatus=${options.showLiveStatus}
            ></velair-room-sensor-schedule>`
          : nothing}
        ${options.showDeadband || options.showMaxDelta || options.showDebounce ? html`
        <section class="sensor-assist-settings" aria-label=${host._t("roomSensorAssistSettings")}>
          <h4>${host._t("roomSensorAssistSettings")}</h4>
        ${options.showDeadband ? renderBrakingConfiguration(host, entityId, settings) : nothing}
          <div class="sensor-number-fields">
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
                  !(settings.room_temperature_entity_id || settings.room_sensor_schedule?.enabled)
                  || !settings.room_sensor_assist_enabled,
              },
            )
          : nothing}
        ${options.showMaxDelta
          ? renderSensorNumber(
              host, entityId, "roomSensorAssistMinimumMargin", "room_sensor_assist_minimum_margin",
              settings.room_sensor_assist_minimum_margin ?? 0, 0,
              maxAssistDeltaForUnit(host._temperatureUnit(entityId)),
              host._temperatureStep?.(undefined, entityId) ?? 1,
              host._temperatureUnit(entityId),
              { inactive: !(settings.room_temperature_entity_id || settings.room_sensor_schedule?.enabled)
                  || !settings.room_sensor_assist_enabled },
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
                  !(settings.room_temperature_entity_id || settings.room_sensor_schedule?.enabled)
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
                  !(settings.room_temperature_entity_id || settings.room_sensor_schedule?.enabled)
                  || !settings.room_sensor_assist_enabled,
              },
            )
          : nothing}
          </div>
        </section>` : nothing}
      </div>
    </section>
  `;
}

function renderBrakingConfiguration(host: SensorsViewHost, entityId: string, settings: PreconditioningSettings) {
  const level = settings.room_sensor_assist_braking_level ?? "default";
  const inactive = !(settings.room_temperature_entity_id || settings.room_sensor_schedule?.enabled)
    || !settings.room_sensor_assist_enabled;
  const disabled = host._settingsSaving || inactive;
  const inputId = `room-sensor-${entityId.replace(/[^a-zA-Z0-9_-]/g, "-")}-braking`;
  const braking = host._data?.room_sensor_assist?.[entityId]?.braking;
  const highSteps = settings.room_sensor_assist_high_braking_steps ?? 2;
  const step = host._entityTemperatureStep(entityId);
  const equivalent = brakingStepEquivalent(highSteps, step, host._temperatureUnit(entityId));
  return html`
    <div class=${`sensor-config-row sensor-braking-row ${inactive ? "inactive" : ""}`}>
      ${renderSensorLabel(host, "roomSensorAssistBraking", { inputId, showHelp: false })}
      <span class="select-wrap sensor-braking-control">
      <select id=${inputId} class="sensor-braking-select" .value=${level}
        aria-describedby=${`${inputId}-description`} ?disabled=${disabled}
        @change=${(event: Event) => {
          const input = event.currentTarget as HTMLSelectElement;
          const next = input.value;
          // Keep the committed value visible until the existing save flow returns new data.
          input.value = level;
          if (disabled || !["default", "moderate", "high"].includes(next)
            || (next !== "default" && settings.room_sensor_assist_deadband <= 0)) return;
          void host._saveZonePreconditioning(entityId, {
            room_sensor_assist_braking_level: next as RoomAssistBrakingLevel,
          });
        }}>
        <option value="default">${host._t("roomSensorAssistBrakingDefault")}</option>
        <option value="moderate" ?disabled=${settings.room_sensor_assist_deadband <= 0}>${host._t("roomSensorAssistBrakingModerate")}</option>
        <option value="high" ?disabled=${settings.room_sensor_assist_deadband <= 0}>${host._t("roomSensorAssistBrakingHigh")}</option>
      </select>
      </span>
      <small class="sensor-field-description" id=${`${inputId}-description`}>
        ${host._t("roomSensorAssistBrakingDescription")}
        <span class="sensor-braking-explanation">${host._t("roomSensorAssistBrakingConfigurableHelp")}</span>
        ${level === "high" ? html`<span class="sensor-braking-depth">${equivalent !== undefined
          ? host._t("roomSensorAssistHighBrakingDepth", { steps: highSteps, value: equivalent })
          : host._t("roomSensorAssistHighBrakingSteps", { steps: highSteps })}</span>` : nothing}
        ${settings.room_sensor_assist_deadband <= 0 || level !== "default"
          ? html`<span class="sensor-braking-requirement">${host._t("roomSensorAssistBrakingRequiresBand")}</span>` : nothing}
        ${braking?.reason && braking.configured_level !== "default"
          ? html`<span class="sensor-braking-inactive">${brakingInactiveText(host, braking.reason)}</span>` : nothing}
      </small>
    </div>`;
}

function brakingInactiveText(host: SensorsViewHost, reason: string): string {
  if (reason === "zero_deadband") return host._t("roomSensorAssistBrakingRequiresBand");
  if (reason === "unsupported_mode") return host._t("roomSensorAssistBrakingUnsupported");
  if (reason === "native_reference") return host._t("roomSensorAssistBrakingNative");
  return host._t("roomSensorAssistBrakingInactive");
}

function renderSensorInactiveNotice(host: SensorsViewHost, scheduled = false) {
  return html`
    <section class="sensor-runtime-section sensor-inactive-section">
      <h3>
        <ha-icon icon="mdi:power-standby"></ha-icon>
        ${host._t("roomSensorStatusDisabled")}
      </h3>
      <p>${host._t(scheduled ? "roomSensorScheduleAssistDisabled" : "roomSensorAssistDisabledDetail")}</p>
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
        ${status.reason === "unsupported_range_mode" || status.reason === "range_reference_not_configured"
          ? html`<p role="status">${host._t(status.reason === "range_reference_not_configured" ? "rangeReferenceNotConfigured" : "unsupportedRangeThermalMode")}</p>`
          : hasActiveBlock
            ? renderRoomAssistGraph(host, entityId, status, settings, showDeadband)
            : renderSensorIdleState(host)}
      </div>
    </section>
  `;
}

/** Reuse the exact Room Assist temperature graphic outside the Sensors view. */
export function renderRoomAssistTemperatureScale(
  host: SensorsViewHost,
  entityId: string,
  status?: RoomSensorAssistStatus,
  settings?: PreconditioningSettings,
) {
  if (!status || status.reason === "native_reference" || (status.reason === "unsupported_range_mode" || status.reason === "range_reference_not_configured") || !hasRoomAssistScheduledTarget(status) || !status.start) {
    return nothing;
  }
  return renderRoomAssistGraph(host, entityId, status, settings);
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

function renderSensorLabel(
  host: SensorsViewHost,
  labelKey: TranslationKey,
  options: { helpId?: string; inputId?: string; showHelp?: boolean } = {},
) {
  const helpKey = SENSOR_HELP_KEYS[labelKey];
  const help = helpKey ? host._t(helpKey) : "";

  return html`
    <span class="label sensor-config-label">
      ${options.inputId
        ? html`<label for=${options.inputId}>${host._t(labelKey)}</label>`
        : html`<span>${host._t(labelKey)}</span>`}
      ${labelKey === "roomSensorAssistMinimumMargin"
        ? renderDocumentationHelp(host, "roomAssistMinimumMargin")
        : helpKey && options.showHelp !== false
        ? renderInlineHelp(options.helpId ?? `sensor-${labelKey}-help`, help, help)
        : nothing}
    </span>
  `;
}

function renderSensorNumber(
  host: SensorsViewHost,
  entityId: string,
  labelKey: TranslationKey,
  field: "room_sensor_assist_debounce_seconds" | "room_sensor_assist_deadband" | "room_sensor_assist_max_delta" | "room_sensor_assist_minimum_margin",
  value: number,
  min: number,
  max: number,
  step: number,
  unit: string,
  options: { inactive?: boolean } = {},
) {
  const disabled = host._settingsSaving || Boolean(options.inactive);
  const brakingRequiresBand = field === "room_sensor_assist_deadband"
    && (preconditioningSettings(host._data?.zones[entityId]?.preconditioning).room_sensor_assist_braking_level ?? "default") !== "default";
  const safeEntityId = entityId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const inputId = `room-sensor-${safeEntityId}-${field}`;
  const errorId = `${inputId}-error`;
  const marginField = field === "room_sensor_assist_minimum_margin" || field === "room_sensor_assist_max_delta";
  const descriptionKey = field === "room_sensor_assist_deadband" ? "roomSensorAssistDeadbandDescription"
    : field === "room_sensor_assist_max_delta" ? "roomSensorAssistMaxDeltaDescription"
    : field === "room_sensor_assist_minimum_margin" ? "roomSensorAssistMinimumMarginDescription"
    : "roomSensorAssistDebounceDescription";
  return html`
    <div class=${`sensor-config-row ${options.inactive ? "inactive" : ""}`}>
      ${renderSensorLabel(host, labelKey, {
        helpId: `${inputId}-help`,
        inputId,
        showHelp: field !== "room_sensor_assist_debounce_seconds",
      })}
      <span class="sensor-number-input">
        <input
          id=${inputId}
          aria-describedby=${`${inputId}-description${marginField ? ` ${errorId}` : ""}`}
          type="number"
          min=${String(brakingRequiresBand ? Math.max(min, step) : min)}
          max=${String(max)}
          step=${String(step)}
          .value=${String(value)}
          ?disabled=${disabled}
          @input=${(event: Event) => {
            if (!marginField) return;
            const input = event.currentTarget as HTMLInputElement;
            input.setCustomValidity("");
            input.removeAttribute("aria-invalid");
            const error = input.closest(".sensor-config-row")?.querySelector<HTMLElement>(".sensor-field-error");
            if (error) { error.textContent = ""; error.hidden = true; }
          }}
          @change=${(event: Event) => {
            if (disabled) {
              return;
            }
            const inputValue = (event.currentTarget as HTMLInputElement).value.trim();
            const rawValue = Number(inputValue);
            if (marginField) {
              const input = event.currentTarget as HTMLInputElement;
              const settings = preconditioningSettings(host._data?.zones[entityId]?.preconditioning, unit);
              const margin = field === "room_sensor_assist_minimum_margin" ? rawValue : settings.room_sensor_assist_minimum_margin ?? 0;
              const maximum = field === "room_sensor_assist_max_delta" ? rawValue : settings.room_sensor_assist_max_delta;
              const invalid = inputValue === "" || !Number.isFinite(rawValue) || rawValue < min || rawValue > max;
              const message = invalid
                ? host._t("roomSensorAssistMarginValueValidation", { minimum: min, maximum: max })
                : margin > maximum ? host._t("roomSensorAssistMinimumMarginValidation") : "";
              const error = input.closest(".sensor-config-row")?.querySelector<HTMLElement>(".sensor-field-error");
              input.setCustomValidity(message);
              if (message) input.setAttribute("aria-invalid", "true");
              else input.removeAttribute("aria-invalid");
              if (error) { error.textContent = message; error.hidden = !message; }
              if (message) return;
              host._saveZonePreconditioning(entityId, { [field]: rawValue });
              return;
            }
            if (field === "room_sensor_assist_deadband") {
              if (
                inputValue === ""
                || !Number.isFinite(rawValue)
                || rawValue < min
                || (brakingRequiresBand && rawValue <= 0)
                || rawValue > max
                || !temperatureMatchesStep(rawValue, min, step, 0.000001)
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
      <div class="sensor-field-description">
        <span id=${`${inputId}-description`}>${host._t(descriptionKey)}</span>
        ${marginField ? html`<span class="sensor-field-error" id=${errorId} role="alert" hidden></span>` : nothing}
      </div>
    </div>
  `;
}

function maxAssistDeltaForUnit(unit: string): number {
  return temperatureDeltaMaximum(unit, 10);
}

function minAssistDeltaForUnit(unit: string): number {
  void unit;
  return 0.1;
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
