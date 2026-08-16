import { html, nothing } from "lit";
import {
  comfortCo2Position,
  comfortMetricIsCurrent,
  comfortRangePosition,
  comfortSensorOptions,
  comfortSettings,
} from "../domain/comfort";
import type { VelairViewHost } from "../host-types";
import type { TranslationKey } from "../translations";
import type {
  ComfortAssessment,
  ComfortMetricAssessment,
  ComfortSettings,
} from "../types";
import { absoluteTemperatureBounds } from "../domain/temperature-units";

type ComfortViewHost = VelairViewHost;
const COMFORT_HUMIDITY_DISABLED = "__humidity_not_monitored__";

export type ComfortViewOptions = {
  showConfiguration: boolean;
  showTemperature: boolean;
  showHumidity: boolean;
  showCo2: boolean;
};

const DEFAULT_COMFORT_VIEW_OPTIONS: ComfortViewOptions = {
  showConfiguration: true,
  showTemperature: true,
  showHumidity: true,
  showCo2: true,
};

const COMFORT_HELP_KEYS: Partial<Record<TranslationKey, TranslationKey>> = {
  comfortTemperatureRange: "comfortTemperatureRangeHelp",
  comfortHumidityRange: "comfortHumidityRangeHelp",
  comfortCo2Limits: "comfortCo2LimitsHelp",
  comfortStaleAfter: "comfortStaleAfterHelp",
};

export function renderComfortView(
  host: ComfortViewHost,
  zoneIds: string[],
  options: Partial<ComfortViewOptions> = {},
) {
  const viewOptions = comfortViewOptions(options);
  return html`
    <section class="comfort-view">
      <header class="comfort-intro">
        <ha-icon icon="mdi:home-heart"></ha-icon>
        <span>
          <strong>${host._t("comfortIntroTitle")}</strong>
          <small>${host._t("comfortIntroDetail")}</small>
        </span>
      </header>
      ${zoneIds.length
        ? zoneIds.map((entityId) => renderComfortZone(host, entityId, viewOptions))
        : html`<span class="empty">${host._t("noManagedEntities")}</span>`}
    </section>
  `;
}

function comfortViewOptions(options: Partial<ComfortViewOptions>): ComfortViewOptions {
  return {
    ...DEFAULT_COMFORT_VIEW_OPTIONS,
    ...options,
  };
}

function renderComfortZone(
  host: ComfortViewHost,
  entityId: string,
  options: ComfortViewOptions,
) {
  const exists = host._entityExists(entityId);
  const settings = comfortSettings(
    host._data?.zones[entityId]?.comfort,
    host._temperatureUnit(entityId),
  );
  const assessment = host._data?.comfort?.[entityId];
  const expanded = exists && host._expandedComfortZones.has(entityId);
  const contentId = `comfort-zone-content-${entityId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const toggleLabel = exists
    ? host._t(expanded ? "comfortCollapseClimate" : "comfortExpandClimate", {
        climate: host._friendlyEntityName(entityId),
      })
    : host._t("comfortUnavailable");

  const handleHeadingClick = (event: Event) => {
    const target = event.target;
    if (target instanceof Element && target.closest(".comfort-zone-actions")) {
      return;
    }
    host._toggleComfortZone(entityId);
  };

  return html`
    <section class=${`comfort-zone ${settings.enabled ? "enabled" : "disabled"} ${expanded ? "expanded" : "collapsed"}`}>
      <header class="comfort-zone-heading" @click=${handleHeadingClick}>
        <button
          type="button"
          class="comfort-zone-toggle"
          title=${toggleLabel}
          aria-label=${toggleLabel}
          aria-expanded=${String(expanded)}
          aria-controls=${expanded ? contentId : nothing}
          ?disabled=${!exists}
          @click=${(event: Event) => {
            event.preventDefault();
            event.stopPropagation();
            host._toggleComfortZone(entityId);
          }}
        >
          <ha-icon
            class="comfort-expand-icon"
            icon=${expanded ? "mdi:chevron-down" : "mdi:chevron-right"}
          ></ha-icon>
          <span class="comfort-zone-identity">
            <strong title=${host._friendlyEntityName(entityId)}>
              ${host._friendlyEntityName(entityId)}
            </strong>
            <span>${entityId}</span>
          </span>
        </button>
        <div class="comfort-zone-actions" @click=${(event: Event) => event.stopPropagation()}>
          ${settings.enabled ? renderComfortAssessmentSummary(host, assessment) : nothing}
          <ha-switch
            .checked=${settings.enabled}
            ?disabled=${host._settingsSaving || !exists}
            @change=${(event: Event) => {
              const enabled = Boolean((event.target as HTMLInputElement).checked);
              host._saveZoneComfort(entityId, { enabled });
            }}
          ></ha-switch>
        </div>
      </header>
      ${exists && expanded
        ? html`
            <div id=${contentId} class="comfort-zone-content">
              ${settings.enabled ? renderComfortRuntime(host, entityId, assessment, options) : renderComfortDisabled(host)}
              ${options.showConfiguration
                ? renderComfortConfiguration(host, entityId, settings)
                : nothing}
            </div>
          `
        : nothing}
    </section>
  `;
}

function renderComfortDisabled(host: ComfortViewHost) {
  return html`
    <section class="comfort-assessment-card idle">
      <ha-icon icon="mdi:power-standby"></ha-icon>
      <span>${host._t("comfortDisabledDetail")}</span>
    </section>
  `;
}

function renderComfortRuntime(
  host: ComfortViewHost,
  entityId: string,
  assessment?: ComfortAssessment,
  options: ComfortViewOptions = DEFAULT_COMFORT_VIEW_OPTIONS,
) {
  if (!assessment?.enabled) {
    return renderComfortDisabled(host);
  }
  return html`
    <section class="comfort-assessment-card">
      <div class="comfort-assessment-heading">
        <span>
          <ha-icon icon=${comfortConditionIcon(assessment.condition)}></ha-icon>
          <strong>${comfortConditionLabel(host, assessment)}</strong>
        </span>
        ${renderComfortAirQualityPill(host, assessment.air_quality)}
      </div>
      ${renderComfortVisual(host, entityId, assessment, options)}
    </section>
  `;
}

function renderComfortVisual(
  host: ComfortViewHost,
  entityId: string,
  assessment: ComfortAssessment,
  options: ComfortViewOptions,
) {
  const temperature = options.showTemperature ? assessment.temperature : undefined;
  const humidity = options.showHumidity ? assessment.humidity : undefined;
  const hasTemperature = comfortMetricIsCurrent(temperature);
  const hasHumidity = comfortMetricIsCurrent(humidity);
  const monitorsEnvironment = options.showTemperature || options.showHumidity;
  const hasCo2 = options.showCo2 && comfortCo2IsCurrent(assessment.co2);

  let environmentVisual;
  let hasEnvironmentVisual = true;
  if (hasTemperature && hasHumidity) {
    const x = comfortRangePosition(temperature.value, temperature.min, temperature.max);
    const y = 100 - comfortRangePosition(humidity.value, humidity.min, humidity.max);
    const markerClasses = [
      "comfort-map-marker",
      y < 30 ? "label-below" : "",
      x < 18 ? "label-left" : "",
      x > 82 ? "label-right" : "",
    ].filter(Boolean).join(" ");
    environmentVisual = html`
      <div class="comfort-map">
        <div class="comfort-map-axis comfort-map-axis-y">
          <span>${host._t("comfortMoreHumid")}</span>
          <span>${host._t("comfortDrier")}</span>
        </div>
        <div
          class="comfort-map-plot"
          role="img"
          aria-label=${host._t("comfortMapCurrentPosition", {
            temperature: host._formatTemperature(temperature.value, entityId),
            humidity: `${Math.round(humidity.value)}%`,
          })}
        >
          <span class="comfort-map-regions" aria-hidden="true">
            <span></span><span></span><span></span>
            <span></span><span></span><span></span>
            <span></span><span></span><span></span>
          </span>
          <span
            class="comfort-map-zone"
            role="img"
            aria-label=${host._t("comfortTargetZone")}
          ></span>
          <span
            class=${markerClasses}
            style=${`--comfort-x:${x}%;--comfort-y:${y}%`}
          >
            <span class="comfort-map-marker-label">
              <strong>${host._formatTemperature(temperature.value, entityId)}</strong>
              <small>${Math.round(humidity.value)}%</small>
            </span>
            <span class="comfort-map-marker-dot"></span>
          </span>
        </div>
        <div class="comfort-map-axis comfort-map-axis-x">
          <span>${host._t("comfortCooler")}</span>
          <span>${host._t("comfortWarmer")}</span>
        </div>
        <div class="comfort-map-legend">
          <span>
            <i class="comfort-legend-zone" aria-hidden="true"></i>
            ${host._t("comfortTargetZone")}
          </span>
          <span>
            <i class="comfort-legend-current" aria-hidden="true"></i>
            ${host._t("comfortCurrentReadings")}
          </span>
        </div>
      </div>
    `;
  } else if (hasTemperature) {
    environmentVisual = renderComfortRangeScale(
      host,
      entityId,
      temperature,
      "comfortTemperature",
    );
  } else if (hasHumidity) {
    environmentVisual = renderComfortRangeScale(
      host,
      entityId,
      humidity,
      "comfortHumidity",
    );
  } else if (monitorsEnvironment) {
    environmentVisual = html`
      <div class="comfort-no-readings">
        <ha-icon icon=${assessment.data_quality === "stale" ? "mdi:clock-alert-outline" : "mdi:sensor-off"}></ha-icon>
        <span>${comfortConditionLabel(host, assessment)}</span>
      </div>
    `;
  } else {
    environmentVisual = nothing;
    hasEnvironmentVisual = false;
  }

  if (!hasEnvironmentVisual && !hasCo2) {
    return nothing;
  }

  return html`
    <div class="comfort-visuals">
      ${environmentVisual}
      ${hasCo2 ? renderComfortCo2Scale(host, assessment.co2) : nothing}
    </div>
  `;
}

function comfortCo2IsCurrent(
  metric: ComfortMetricAssessment | undefined,
): metric is ComfortMetricAssessment & { value: number; attention: number; max: number } {
  return (
    metric?.availability === "current"
    && typeof metric.value === "number"
    && typeof metric.attention === "number"
    && typeof metric.max === "number"
  );
}

function renderComfortRangeScale(
  host: ComfortViewHost,
  entityId: string,
  metric: ComfortMetricAssessment & { value: number; min: number; max: number },
  labelKey: TranslationKey,
) {
  const position = comfortRangePosition(metric.value, metric.min, metric.max);
  const value = metric.metric === "temperature"
    ? host._formatTemperature(metric.value, entityId)
    : `${Math.round(metric.value)}%`;
  const minimum = metric.metric === "temperature"
    ? host._formatTemperature(metric.min, entityId)
    : `${Math.round(metric.min)}%`;
  const maximum = metric.metric === "temperature"
    ? host._formatTemperature(metric.max, entityId)
    : `${Math.round(metric.max)}%`;
  return html`
    <div class=${`comfort-range-scale metric-${metric.metric}`}>
      <header>
        <span>${host._t(labelKey)}</span>
        <strong>${value}</strong>
      </header>
      <div class="comfort-scale-track">
        <span class="comfort-scale-marker" style=${`--comfort-position:${position}%`}></span>
      </div>
      <footer class="comfort-range-limits">
        <span>${minimum}</span>
        <span>${maximum}</span>
      </footer>
    </div>
  `;
}

function renderComfortCo2Scale(
  host: ComfortViewHost,
  metric: ComfortMetricAssessment | undefined,
) {
  if (
    metric?.availability !== "current"
    || typeof metric.value !== "number"
    || typeof metric.attention !== "number"
    || typeof metric.max !== "number"
  ) {
    return nothing;
  }
  const position = comfortCo2Position(metric.value, metric.attention, metric.max);
  const attention = comfortCo2Position(metric.attention, metric.attention, metric.max);
  const poor = comfortCo2Position(metric.max, metric.attention, metric.max);
  return html`
    <div class="comfort-co2-scale">
      <header>
        <span>${host._t("comfortAirQuality")}</span>
        <strong>${Math.round(metric.value)} ppm</strong>
      </header>
      <div
        class="comfort-co2-track"
        style=${`--comfort-position:${position}%;--comfort-attention:${attention}%;--comfort-poor:${poor}%`}
      >
        <span class="comfort-scale-marker"></span>
      </div>
      <footer>
        <span>${host._t("comfortAirQualityGood")}</span>
        <span>${host._t("comfortAirQualityElevated")}</span>
        <span>${host._t("comfortAirQualityPoor")}</span>
      </footer>
    </div>
  `;
}

function renderComfortDataWarning(
  host: ComfortViewHost,
  assessment?: ComfortAssessment,
) {
  if (!assessment?.enabled || assessment.data_quality === "complete") {
    return nothing;
  }
  const detail = assessment.data_issues.length
    ? assessment.data_issues
      .map((issue) => host._t(comfortDataIssueLabelKey(issue)))
      .join(" · ")
    : host._t(comfortDataQualityLabelKey(assessment.data_quality));
  return html`
    <span
      class="comfort-data-warning"
      tabindex="0"
      title=${detail}
      aria-label=${host._t(comfortDataQualityLabelKey(assessment.data_quality))}
    >
      <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
      <span class="comfort-help-tooltip" role="tooltip">${detail}</span>
    </span>
  `;
}

function renderComfortAssessmentSummary(
  host: ComfortViewHost,
  assessment?: ComfortAssessment,
) {
  return html`
    <span class="comfort-assessment-summary">
      <span class="comfort-assessment-line">
        ${renderComfortConditionPill(host, assessment)}
        ${assessment ? renderComfortAirQualityPill(host, assessment.air_quality) : nothing}
        ${renderComfortDataWarning(host, assessment)}
      </span>
    </span>
  `;
}

function renderComfortConfiguration(
  host: ComfortViewHost,
  entityId: string,
  settings: ComfortSettings,
) {
  const [temperatureMinimum, temperatureMaximum] = absoluteTemperatureBounds(
    host._temperatureUnit(entityId),
  );
  const temperatureHasSource = hasComfortMetricSource(
    host,
    entityId,
    settings,
    "temperature_entity_id",
    "temperature",
  );
  const humidityHasSource = hasComfortMetricSource(
    host,
    entityId,
    settings,
    "humidity_entity_id",
    "humidity",
  );
  const co2HasSource = hasComfortMetricSource(
    host,
    entityId,
    settings,
    "co2_entity_id",
    "co2",
  );
  return html`
    <section class="comfort-config-section">
      <h3><ha-icon icon="mdi:clock-check-outline"></ha-icon>${host._t("comfortDataFreshness")}</h3>
      <div class="comfort-config-rows">
        ${renderComfortNumber(
          host,
          entityId,
          "comfortStaleAfter",
          "stale_after_minutes",
          settings.stale_after_minutes,
          5,
          1440,
          5,
          host._t("minutesShort"),
        )}
      </div>
    </section>
    ${renderComfortMetricConfiguration(
      host,
      "comfortTemperature",
      "mdi:thermometer",
      renderComfortSensorPicker(host, entityId, settings, "temperature_entity_id", "temperature", "comfortTemperatureSensor"),
      temperatureHasSource
        ? renderComfortNumberPair(
          host,
          entityId,
          "comfortTemperatureRange",
          "temperature_min",
          settings.temperature_min,
          "temperature_max",
          settings.temperature_max,
          temperatureMinimum,
          temperatureMaximum,
          0.5,
          host._temperatureUnit(entityId),
          "comfortMinimum",
          "comfortMaximum",
        )
        : nothing,
    )}
    ${renderComfortMetricConfiguration(
      host,
      "comfortHumidity",
      "mdi:water-percent",
      renderComfortSensorPicker(host, entityId, settings, "humidity_entity_id", "humidity", "comfortHumiditySensor"),
      humidityHasSource
        ? renderComfortNumberPair(
          host,
          entityId,
          "comfortHumidityRange",
          "humidity_min",
          settings.humidity_min,
          "humidity_max",
          settings.humidity_max,
          0,
          100,
          1,
          "%",
          "comfortMinimum",
          "comfortMaximum",
        )
        : nothing,
    )}
    ${renderComfortMetricConfiguration(
      host,
      "comfortCo2",
      "mdi:molecule-co2",
      renderComfortSensorPicker(host, entityId, settings, "co2_entity_id", "co2", "comfortCo2Sensor"),
      co2HasSource
        ? renderComfortNumberPair(
          host,
          entityId,
          "comfortCo2Limits",
          "co2_attention",
          settings.co2_attention,
          "co2_poor",
          settings.co2_poor,
          400,
          10000,
          50,
          "ppm",
          "comfortCo2Attention",
          "comfortCo2Poor",
        )
        : nothing,
    )}
  `;
}

function renderComfortMetricConfiguration(
  host: ComfortViewHost,
  titleKey: TranslationKey,
  icon: string,
  sensorPicker: unknown,
  thresholds: unknown,
) {
  return html`
    <section class="comfort-config-section comfort-metric-config-section">
      <h3><ha-icon icon=${icon}></ha-icon>${host._t(titleKey)}</h3>
      <div class="comfort-config-rows">
        ${sensorPicker}
        ${thresholds}
      </div>
    </section>
  `;
}

function renderComfortSensorPicker(
  host: ComfortViewHost,
  entityId: string,
  settings: ComfortSettings,
  field: "temperature_entity_id" | "humidity_entity_id" | "co2_entity_id",
  kind: "temperature" | "humidity" | "co2",
  labelKey: TranslationKey,
) {
  const configuredValue = settings[field] ?? "";
  const value = kind === "humidity" && !settings.humidity_enabled
    ? COMFORT_HUMIDITY_DISABLED
    : configuredValue;
  const sensors = comfortSensorOptions(host.hass, configuredValue, kind);
  const sourceDetail = comfortSensorSourceDetail(host, entityId, settings, field, kind);
  const emptyOptionKey = kind === "co2" ? "comfortDoNotMonitor" : "comfortSelectSensor";
  return html`
    <label class="comfort-config-row comfort-picker-row">
      ${renderComfortLabel(host, labelKey)}
      <span class="select-wrap comfort-select-wrap">
        <span class="comfort-select-control">
          <select
          .value=${value}
          value=${value}
          ?disabled=${host._settingsSaving}
          @change=${(event: Event) => {
            const nextValue = (event.currentTarget as HTMLSelectElement).value.trim();
            if (kind === "humidity") {
              if (nextValue === COMFORT_HUMIDITY_DISABLED) {
                host._saveZoneComfort(entityId, { humidity_enabled: false });
                return;
              }
              host._saveZoneComfort(entityId, {
                humidity_enabled: true,
                [field]: nextValue || null,
              });
              return;
            }
            host._saveZoneComfort(entityId, { [field]: nextValue || null });
          }}
        >
          <option value="" ?selected=${value === ""}>
            ${host._t(emptyOptionKey)}
          </option>
          ${kind === "humidity"
            ? html`
                <option
                  value=${COMFORT_HUMIDITY_DISABLED}
                  ?selected=${value === COMFORT_HUMIDITY_DISABLED}
                >
                  ${host._t("comfortDoNotMonitorHumidity")}
                </option>
              `
            : nothing}
          ${sensors.map(
            (sensor) => html`
              <option value=${sensor.entityId} ?selected=${sensor.entityId === value}>
                ${sensor.label} · ${sensor.entityId}
              </option>
            `,
          )}
          </select>
        </span>
        <small class="comfort-selected-entity" title=${sourceDetail}>${sourceDetail}</small>
      </span>
    </label>
  `;
}

function hasComfortMetricSource(
  host: ComfortViewHost,
  entityId: string,
  settings: ComfortSettings,
  field: "temperature_entity_id" | "humidity_entity_id" | "co2_entity_id",
  kind: "temperature" | "humidity" | "co2",
) {
  if (kind === "humidity" && !settings.humidity_enabled) {
    return false;
  }
  if (settings[field]?.trim()) {
    return true;
  }
  if (kind === "temperature") {
    return true;
  }
  if (kind === "humidity") {
    const attributes = host.hass?.states?.[entityId]?.attributes;
    return Boolean(
      attributes
      && ("current_humidity" in attributes || "humidity" in attributes),
    );
  }
  return false;
}

function comfortSensorSourceDetail(
  host: ComfortViewHost,
  entityId: string,
  settings: ComfortSettings,
  field: "temperature_entity_id" | "humidity_entity_id" | "co2_entity_id",
  kind: "temperature" | "humidity" | "co2",
) {
  if (kind === "humidity" && !settings.humidity_enabled) {
    return host._t("comfortNotMonitored");
  }
  const value = settings[field]?.trim();
  if (value) {
    return value;
  }
  if (kind === "temperature") {
    const roomSensor = host._data?.zones[entityId]?.preconditioning?.room_temperature_entity_id;
    return host._t("comfortAutomaticSourceValue", { entity: roomSensor || entityId });
  }
  if (kind === "humidity") {
    const attributes = host.hass?.states?.[entityId]?.attributes;
    if (
      attributes
      && ("current_humidity" in attributes || "humidity" in attributes)
    ) {
      return host._t("comfortAutomaticSourceValue", { entity: entityId });
    }
  }
  return host._t("comfortNotMonitored");
}

function renderComfortNumberPair(
  host: ComfortViewHost,
  entityId: string,
  labelKey: TranslationKey,
  minField: keyof ComfortSettings,
  minValue: number,
  maxField: keyof ComfortSettings,
  maxValue: number,
  min: number,
  max: number,
  step: number,
  unit: string,
  minLabelKey: TranslationKey,
  maxLabelKey: TranslationKey,
) {
  return html`
    <label class="comfort-config-row comfort-threshold-row">
      ${renderComfortLabel(host, labelKey)}
      <span class="comfort-number-pair">
        <span class="comfort-number-field">
          <small>${host._t(minLabelKey)}</small>
          ${renderComfortNumberInput(host, entityId, minField, minValue, min, max, step)}
        </span>
        <span class="comfort-number-separator">–</span>
        <span class="comfort-number-field">
          <small>${host._t(maxLabelKey)}</small>
          ${renderComfortNumberInput(host, entityId, maxField, maxValue, min, max, step)}
        </span>
        <span class="comfort-number-unit">${unit}</span>
      </span>
    </label>
  `;
}

function renderComfortNumber(
  host: ComfortViewHost,
  entityId: string,
  labelKey: TranslationKey,
  field: keyof ComfortSettings,
  value: number,
  min: number,
  max: number,
  step: number,
  unit: string,
) {
  return html`
    <label class="comfort-config-row">
      ${renderComfortLabel(host, labelKey)}
      <span class="comfort-number-single">
        <span class="comfort-number-field comfort-number-field-single">
          <small aria-hidden="true">&nbsp;</small>
          ${renderComfortNumberInput(host, entityId, field, value, min, max, step)}
        </span>
        <span class="comfort-number-single-unit">${unit}</span>
      </span>
    </label>
  `;
}

function renderComfortNumberInput(
  host: ComfortViewHost,
  entityId: string,
  field: keyof ComfortSettings,
  value: number,
  min: number,
  max: number,
  step: number,
) {
  return html`
    <input
      type="number"
      min=${String(min)}
      max=${String(max)}
      step=${String(step)}
      .value=${String(value)}
      ?disabled=${host._settingsSaving}
      @change=${(event: Event) => {
        const rawValue = Number((event.currentTarget as HTMLInputElement).value);
        const boundedValue = Math.min(
          max,
          Math.max(min, Number.isFinite(rawValue) ? rawValue : value),
        );
        host._saveZoneComfort(entityId, { [field]: boundedValue });
      }}
    />
  `;
}

function renderComfortLabel(host: ComfortViewHost, labelKey: TranslationKey) {
  const helpKey = COMFORT_HELP_KEYS[labelKey];
  const help = helpKey ? host._t(helpKey) : "";
  return html`
    <span class="label comfort-config-label">
      <span>${host._t(labelKey)}</span>
      ${helpKey
        ? html`
            <span class="comfort-help" tabindex="0" aria-label=${help}>
              <ha-icon icon="mdi:information-outline"></ha-icon>
              <span class="comfort-help-tooltip" role="tooltip">${help}</span>
            </span>
          `
        : nothing}
    </span>
  `;
}

function renderComfortConditionPill(
  host: ComfortViewHost,
  assessment?: ComfortAssessment,
) {
  const condition = assessment?.condition ?? "monitoring_off";
  return html`
    <span class=${`comfort-condition-pill condition-${condition}`}>
      ${assessment
        ? comfortConditionLabel(host, assessment)
        : host._t("comfortConditionMonitoringOff")}
    </span>
  `;
}

function renderComfortAirQualityPill(
  host: ComfortViewHost,
  airQuality: ComfortAssessment["air_quality"],
) {
  if (airQuality === "not_monitored") {
    return nothing;
  }
  return html`
    <span class=${`comfort-air-pill air-${airQuality}`}>
      ${host._t(comfortAirQualityLabelKey(airQuality))}
    </span>
  `;
}

function comfortConditionLabel(
  host: ComfortViewHost,
  assessment: ComfortAssessment,
) {
  if (assessment.condition === "no_readings" && assessment.data_quality === "stale") {
    return host._t("comfortConditionReadingsOutdated");
  }
  return host._t(comfortConditionLabelKey(assessment.condition));
}

function comfortConditionIcon(condition: ComfortAssessment["condition"]) {
  const icons: Record<ComfortAssessment["condition"], string> = {
    cold: "mdi:snowflake-thermometer",
    cold_and_dry: "mdi:snowflake",
    cold_and_humid: "mdi:weather-snowy-rainy",
    comfortable: "mdi:check-circle-outline",
    dry: "mdi:water-off-outline",
    hot: "mdi:sun-thermometer-outline",
    hot_and_dry: "mdi:weather-sunny-alert",
    hot_and_humid: "mdi:weather-partly-rainy",
    humid: "mdi:water-percent",
    humidity_comfortable: "mdi:water-check-outline",
    monitoring_off: "mdi:power-standby",
    no_readings: "mdi:sensor-off",
    temperature_comfortable: "mdi:thermometer-check",
  };
  return icons[condition];
}

function comfortConditionLabelKey(
  condition: ComfortAssessment["condition"],
): TranslationKey {
  const keys: Record<ComfortAssessment["condition"], TranslationKey> = {
    cold: "comfortConditionCold",
    cold_and_dry: "comfortConditionColdAndDry",
    cold_and_humid: "comfortConditionColdAndHumid",
    comfortable: "comfortConditionComfortable",
    dry: "comfortConditionDry",
    hot: "comfortConditionHot",
    hot_and_dry: "comfortConditionHotAndDry",
    hot_and_humid: "comfortConditionHotAndHumid",
    humid: "comfortConditionHumid",
    humidity_comfortable: "comfortConditionHumidityComfortable",
    monitoring_off: "comfortConditionMonitoringOff",
    no_readings: "comfortConditionNoReadings",
    temperature_comfortable: "comfortConditionTemperatureComfortable",
  };
  return keys[condition];
}

function comfortAirQualityLabelKey(
  airQuality: Exclude<ComfortAssessment["air_quality"], "not_monitored">,
): TranslationKey {
  const keys: Record<
    Exclude<ComfortAssessment["air_quality"], "not_monitored">,
    TranslationKey
  > = {
    elevated: "comfortAirQualityElevated",
    good: "comfortAirQualityGood",
    poor: "comfortAirQualityPoor",
    unavailable: "comfortAirQualityUnavailable",
  };
  return keys[airQuality];
}

function comfortDataQualityLabelKey(
  quality: Exclude<ComfortAssessment["data_quality"], "complete">,
): TranslationKey {
  const keys: Record<
    Exclude<ComfortAssessment["data_quality"], "complete">,
    TranslationKey
  > = {
    partial: "comfortDataPartial",
    stale: "comfortDataStale",
    unavailable: "comfortDataUnavailable",
  };
  return keys[quality];
}

function comfortDataIssueLabelKey(issue: string): TranslationKey {
  const keys: Record<string, TranslationKey> = {
    co2_missing: "comfortDataIssueCo2Missing",
    co2_stale: "comfortDataIssueCo2Stale",
    humidity_missing: "comfortDataIssueHumidityMissing",
    humidity_stale: "comfortDataIssueHumidityStale",
    temperature_missing: "comfortDataIssueTemperatureMissing",
    temperature_stale: "comfortDataIssueTemperatureStale",
  };
  return keys[issue] ?? "comfortDataUnavailable";
}
