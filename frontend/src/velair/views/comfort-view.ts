import { html, nothing } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { renderInlineHelp } from "./inline-help";
import {
  comfortCo2Position,
  DERIVED_COMFORT_METRIC_ORDER,
  derivedComfortVisualModel,
  derivedMetricSourceSelection,
  derivedMetricSourceValue,
  formatComfortAbsoluteHumidity,
  humidexPerceivedHeatDelta,
  humidexScaleModel,
  derivedMetricSensorOptions,
  comfortMetricIsCurrent,
  comfortRangePosition,
  comfortSensorOptions,
  comfortSettings,
  comfortZonePlotModel,
  VELAIR_DERIVED_METRIC_SOURCE,
} from "../domain/comfort";
import type { VelairViewHost } from "../host-types";
import type { TranslationKey } from "../translations";
import type {
  ComfortAssessment,
  ComfortInsight,
  ComfortMetricAssessment,
  ComfortOutdoorComparisonDimension,
  ComfortSettings,
  DerivedComfortMetric,
} from "../types";
import { absoluteTemperatureBounds } from "../domain/temperature-units";

type ComfortViewHost = VelairViewHost;
const COMFORT_HUMIDITY_DISABLED = "__humidity_not_monitored__";
const OUTDOOR_INSIGHT_CODES = new Set([
  "ventilation_may_help_cool",
  "ventilation_may_help_warm",
  "ventilation_may_help_reduce_humidity",
  "ventilation_may_help_increase_humidity",
  "ventilation_has_tradeoff",
]);

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
  comfortVentilationTemperatureThreshold: "comfortVentilationTemperatureThresholdHelp",
  comfortVentilationHumidityThreshold: "comfortVentilationHumidityThresholdHelp",
  comfortVentilationMoistureThreshold: "comfortVentilationMoistureThresholdHelp",
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
          ${settings.enabled ? renderComfortAssessmentSummary(host, entityId, assessment) : nothing}
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
              ${settings.enabled
                ? renderComfortRuntime(host, entityId, settings, assessment, options)
                : renderComfortDisabled(host)}
              ${options.showConfiguration
                ? renderComfortConfigurationDetails(host, entityId, settings)
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
  settings: ComfortSettings,
  assessment?: ComfortAssessment,
  options: ComfortViewOptions = DEFAULT_COMFORT_VIEW_OPTIONS,
) {
  if (!assessment?.enabled) {
    return renderComfortDisabled(host);
  }
  return html`
    <section class="comfort-assessment-card">
      <div class="comfort-assessment-heading">
        <span class="comfort-assessment-heading-pills">
          ${renderComfortConditionPill(host, assessment)}
          ${renderComfortHumidexPill(host, assessment)}
          ${renderComfortAirQualityPill(host, assessment.air_quality)}
        </span>
      </div>
      ${renderComfortInsights(host, entityId, assessment)}
      ${renderComfortVisual(host, entityId, assessment, options)}
      ${renderDerivedMetricsVisualSection(host, entityId, settings, assessment)}
      ${renderOutdoorComparison(host, entityId, assessment)}
    </section>
  `;
}

function renderComfortInsights(
  host: ComfortViewHost,
  entityId: string,
  assessment: ComfortAssessment,
) {
  const context = (assessment.insights ?? []).flatMap((insight) => {
    if (
      insight.kind !== "context"
    ) return [];
    const label = OUTDOOR_INSIGHT_CODES.has(insight.code)
      ? outdoorInsightLabel(host, insight, assessment)
      : comfortInsightLabel(host, entityId, assessment, insight);
    return label ? [{ insight, label }] : [];
  });
  if (!context.length) return nothing;
  return html`
    <div class="comfort-insights">
      <div class="comfort-insight-context-list">
        ${context.map(({ insight, label }) => html`
          <div
            class=${`comfort-insight-context tone-${insight.tone}`}
            data-insight-code=${insight.code}
          >
            <ha-icon icon=${comfortInsightIcon(insight)}></ha-icon>
            <span>${label}</span>
          </div>
        `)}
      </div>
    </div>
  `;
}

function comfortInsightLabel(
  host: ComfortViewHost,
  entityId: string,
  assessment: ComfortAssessment,
  insight: ComfortInsight,
): string | undefined {
  const key = comfortInsightKey(insight.code);
  if (!key) return undefined;
  if (insight.code !== "humidex_feels_warmer") return host._t(key);
  const delta = humidexPerceivedHeatDelta(assessment, host._temperatureUnit(entityId));
  return delta === undefined
    ? undefined
    : host._t(key, { delta: formatComfortDelta(host, entityId, delta) });
}

function comfortInsightKey(code: string): TranslationKey | undefined {
  const keys: Partial<Record<string, TranslationKey>> = {
    co2_elevated: "comfortInsightCo2Elevated",
    co2_poor: "comfortInsightCo2Poor",
    humidex_feels_warmer: "comfortInsightHumidexWarmer",
  };
  return keys[code];
}

function comfortInsightIcon(insight: ComfortInsight): string {
  if (insight.code === "ventilation_has_tradeoff") return "mdi:swap-horizontal-bold";
  if (OUTDOOR_INSIGHT_CODES.has(insight.code)) return "mdi:window-open-variant";
  if (insight.code.startsWith("co2_")) return "mdi:molecule-co2";
  if (insight.code.startsWith("humidex_")) return "mdi:sun-thermometer-outline";
  if (insight.code.startsWith("dew_point_")) return "mdi:thermometer-water";
  return "mdi:water-outline";
}

function renderOutdoorComparison(
  host: ComfortViewHost,
  entityId: string,
  assessment: ComfortAssessment,
) {
  const outdoor = assessment.outdoor;
  if (!outdoor?.enabled) return nothing;
  const temperature = outdoor.temperature;
  const temperatureComparison = outdoor.comparison?.temperature;
  const humidityComparison = outdoor.comparison?.humidity;
  const outdoorAbsoluteHumidity = outdoor.absolute_humidity;
  const indoorAbsoluteHumidity = outdoor.indoor_absolute_humidity;
  return html`
    <section class=${`comfort-outdoor-comparison quality-${outdoor.data_quality}`}>
      <h3><ha-icon icon="mdi:home-switch-outline"></ha-icon>${host._t("comfortOutdoorComparison")}</h3>
      <div class="comfort-outdoor-grid">
        <article class="comfort-outdoor-cell temperature">
          <header><ha-icon icon="mdi:thermometer-lines"></ha-icon><strong>${host._t("comfortOutdoorTemperatureComparison")}</strong></header>
          <div class="comfort-outdoor-data">
            <dl>
              <div><dt>${host._t("comfortIndoor")}</dt><dd>${formatOutdoorTemperature(host, entityId, assessment.temperature)}</dd></div>
              <div><dt>${host._t("comfortOutdoor")}</dt><dd>${formatOutdoorTemperature(host, entityId, temperature)}</dd></div>
            </dl>
            ${renderTemperatureComparisonDetail(host, entityId, temperatureComparison)}
          </div>
        </article>
        <article class="comfort-outdoor-cell humidity">
          <header><ha-icon icon="mdi:water-sync"></ha-icon><strong>${host._t("comfortOutdoorMoistureComparison")}</strong></header>
          <div class="comfort-outdoor-data">
            <dl>
              <div><dt>${host._t("comfortIndoorAbsoluteHumidity")}</dt><dd>${formatOutdoorMetric(host, indoorAbsoluteHumidity, "absolute_humidity")}</dd></div>
              <div><dt>${host._t("comfortOutdoorAbsoluteHumidity")}</dt><dd>${formatOutdoorMetric(host, outdoorAbsoluteHumidity, "absolute_humidity")}</dd></div>
              <div>
                <dt class="comfort-outdoor-adjusted-label">
                  <span>${host._t("comfortOutdoorEquivalentHumidity")}</span>
                  ${renderInlineHelp(
                  `comfort-${entityId.replace(/[^a-zA-Z0-9_-]/g, "-")}-adjusted-outdoor-humidity-help`,
                  host._t("comfortOutdoorEquivalentHumidity"),
                  [
                    host._t("comfortOutdoorAdjustedHumidityHelp"),
                    host._t("comfortOutdoorAdjustedHumidityComparisonHelp"),
                  ],
                  { layout: "constrained" },
                )}
                </dt>
                <dd>${formatRelativeHumidity(host, humidityComparison?.equivalent_indoor_relative_humidity, humidityComparison?.availability)}</dd>
              </div>
            </dl>
            ${renderHumidityComparisonDetail(host, humidityComparison)}
          </div>
        </article>
      </div>
    </section>
  `;
}

function currentMetricValue(metric: ComfortMetricAssessment | undefined): number | undefined {
  return metric?.availability === "current" && typeof metric.value === "number"
    ? metric.value
    : undefined;
}

function formatOutdoorTemperature(
  host: ComfortViewHost,
  entityId: string,
  metric: ComfortMetricAssessment | undefined,
): string {
  const value = currentMetricValue(metric);
  return value === undefined
    ? outdoorAvailabilityLabel(host, metric?.availability)
    : host._formatTemperature(value, entityId);
}

function formatOutdoorMetric(
  host: ComfortViewHost,
  metric: ComfortMetricAssessment | undefined,
  kind: "absolute_humidity",
): string {
  const value = currentMetricValue(metric);
  return value === undefined
    ? outdoorAvailabilityLabel(host, metric?.availability)
    : kind === "absolute_humidity"
      ? formatComfortAbsoluteHumidity(value, host.hass)
      : String(value);
}

function formatRelativeHumidity(
  host: ComfortViewHost,
  value: number | null | undefined,
  availability: ComfortMetricAssessment["availability"] | undefined,
): string {
  return typeof value === "number"
    ? `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} %`
    : outdoorAvailabilityLabel(host, availability);
}

function outdoorAvailabilityLabel(
  host: ComfortViewHost,
  availability: ComfortMetricAssessment["availability"] | undefined,
): string {
  if (availability === "stale") return host._t("comfortMetricStale");
  if (availability === "invalid") return host._t("comfortMetricInvalid");
  if (availability === "not_monitored") return host._t("comfortNotMonitored");
  return host._t("unavailable");
}

function renderTemperatureComparisonDetail(
  host: ComfortViewHost,
  entityId: string,
  comparison: ComfortOutdoorComparisonDimension | undefined,
) {
  if (!comparison || comparison.availability !== "current" || typeof comparison.delta !== "number") {
    return nothing;
  }
  const direction = comparison.effect === "cooler"
    ? host._t("comfortOutdoorCooler")
    : comparison.effect === "warmer"
      ? host._t("comfortOutdoorWarmer")
      : host._t("comfortOutdoorSimilar");
  return html`<p>${host._t("comfortOutdoorTemperatureDelta", {
    difference: formatComfortDelta(host, entityId, comparison.delta),
    direction,
  })}</p>`;
}

function renderHumidityComparisonDetail(
  host: ComfortViewHost,
  comparison: ComfortOutdoorComparisonDimension | undefined,
) {
  if (
    !comparison
    || comparison.availability !== "current"
    || typeof comparison.equivalent_indoor_relative_humidity_delta !== "number"
  ) return nothing;
  const magnitude = Math.round(
    Math.abs(comparison.equivalent_indoor_relative_humidity_delta) * 10,
  ) / 10;
  const unit = host._t(
    magnitude === 1 ? "comfortPercentagePoint" : "comfortPercentagePoints",
  );
  const key = comparison.effect === "drier"
    ? "comfortOutdoorHumidityLower"
    : comparison.effect === "more_humid"
      ? "comfortOutdoorHumidityHigher"
      : "comfortOutdoorHumiditySimilarDetail";
  return html`<p>${host._t(key, {
    difference: magnitude.toLocaleString(undefined, { maximumFractionDigits: 1 }),
    unit,
  })}</p>`;
}

function outdoorInsightLabel(
  host: ComfortViewHost,
  insight: ComfortInsight,
  assessment: ComfortAssessment,
): string | undefined {
  const keys: Partial<Record<string, TranslationKey>> = {
    ventilation_may_help_cool: "comfortInsightVentilationCool",
    ventilation_may_help_warm: "comfortInsightVentilationWarm",
    ventilation_may_help_reduce_humidity: "comfortInsightVentilationDry",
    ventilation_may_help_increase_humidity: "comfortInsightVentilationHumidify",
  };
  if (insight.code !== "ventilation_has_tradeoff") {
    const key = keys[insight.code];
    if (!key) return undefined;
    const base = host._t(key);
    const temperatureOnly = (insight.code === "ventilation_may_help_cool" || insight.code === "ventilation_may_help_warm")
      && assessment.outdoor?.humidity?.availability !== "current";
    return temperatureOnly
      ? `${base} ${host._t("comfortInsightVentilationTemperatureOnly")}`
      : base;
  }
  const temperature = assessment.outdoor?.comparison?.temperature;
  const humidity = assessment.outdoor?.comparison?.humidity;
  const potential = temperature?.potential ?? humidity?.potential;
  const effect = potential === "cooling"
    ? host._t("comfortVentilationEffectCool")
    : potential === "warming"
      ? host._t("comfortVentilationEffectWarm")
      : potential === "drying"
        ? host._t("comfortVentilationEffectDry")
        : host._t("comfortVentilationEffectHumidify");
  const blockedBy = [...(temperature?.blocked_by ?? []), ...(humidity?.blocked_by ?? [])][0];
  const dimension = blockedBy === "temperature"
    ? host._t("comfortVentilationDimensionTemperature")
    : host._t("comfortVentilationDimensionHumidity");
  return host._t("comfortInsightVentilationTradeoff", { effect, dimension });
}

const DERIVED_METRIC_DEFINITIONS: Record<DerivedComfortMetric, {
  label: TranslationKey;
  description: TranslationKey;
  icon: string;
}> = {
  humidex: {
    label: "comfortHumidex",
    description: "comfortHumidexDescription",
    icon: "mdi:sun-thermometer-outline",
  },
  dew_point: {
    label: "comfortDewPoint",
    description: "comfortDewPointDescription",
    icon: "mdi:thermometer-water",
  },
  absolute_humidity: {
    label: "comfortAbsoluteHumidity",
    description: "comfortAbsoluteHumidityDescription",
    icon: "mdi:water",
  },
};
const DERIVED_METRICS = DERIVED_COMFORT_METRIC_ORDER.map((metric) => ({
  metric,
  ...DERIVED_METRIC_DEFINITIONS[metric],
}));

function formatDerivedMetric(
  host: ComfortViewHost,
  entityId: string,
  metric: DerivedComfortMetric,
  assessment?: ComfortMetricAssessment,
): string {
  if (assessment?.availability !== "current" || typeof assessment.value !== "number") {
    if (assessment?.availability === "stale") return host._t("comfortMetricStale");
    if (assessment?.availability === "invalid") return host._t("comfortMetricInvalid");
    return host._t("unavailable");
  }
  if (metric === "dew_point") {
    return host._formatTemperature(assessment.value, entityId);
  }
  if (metric === "absolute_humidity") {
    return formatComfortAbsoluteHumidity(assessment.value, host.hass);
  }
  return assessment.value.toLocaleString(undefined, { maximumFractionDigits: 1 });
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
    const shapedZone = comfortZonePlotModel(
      assessment.comfort_zone,
      temperature.value,
      humidity.value,
    );
    const x = shapedZone?.markerX
      ?? comfortRangePosition(temperature.value, temperature.min, temperature.max);
    const y = shapedZone?.markerY
      ?? 100 - comfortRangePosition(humidity.value, humidity.min, humidity.max);
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
            class=${`comfort-map-zone ${shapedZone
              ? `shaped ${assessment.comfort_zone?.model === "temperature_aware"
                ? "temperature-aware"
                : assessment.comfort_zone?.model ?? ""}`
              : "simple"}`}
            style=${shapedZone
              ? `--comfort-zone-polygon:polygon(${shapedZone.polygon})`
              : ""}
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
          ${shapedZone?.effective ? html`
            <span class="comfort-effective-range">
              ${host._t("comfortEffectiveHumidityRange", {
                temperature: host._formatTemperature(
                  shapedZone.effective.basisTemperature,
                  entityId,
                ),
                minimum: shapedZone.effective.minimum.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                }),
                maximum: shapedZone.effective.maximum.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                }),
              })}
            </span>
          ` : nothing}
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
  } else if (comfortMetricHasCurrentValue(humidity)) {
    environmentVisual = renderComfortUnclassifiedReading(
      host,
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

function comfortMetricHasCurrentValue(
  metric: ComfortMetricAssessment | undefined,
): metric is ComfortMetricAssessment & { value: number } {
  return metric?.availability === "current"
    && typeof metric.value === "number"
    && Number.isFinite(metric.value);
}

function renderComfortUnclassifiedReading(
  host: ComfortViewHost,
  metric: ComfortMetricAssessment & { value: number },
  labelKey: TranslationKey,
) {
  const value = metric.metric === "humidity"
    ? `${Math.round(metric.value)}%`
    : metric.value.toLocaleString();
  return html`
    <div class=${`comfort-range-scale metric-${metric.metric} unclassified`}>
      <header>
        <span>${host._t(labelKey)}</span>
        <strong>${value}</strong>
      </header>
    </div>
  `;
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
  entityId: string,
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
  const safeEntityId = entityId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return html`<span class="comfort-data-warning">
    ${renderInlineHelp(
      `comfort-${safeEntityId}-data-quality-help`,
      host._t(comfortDataQualityLabelKey(assessment.data_quality)),
      detail,
      { icon: "mdi:alert-circle-outline" },
    )}
  </span>`;
}

function renderComfortAssessmentSummary(
  host: ComfortViewHost,
  entityId: string,
  assessment?: ComfortAssessment,
) {
  return html`
    <span class="comfort-assessment-summary">
      <span class="comfort-assessment-line">
        ${renderComfortConditionPill(host, assessment)}
        ${renderComfortHumidexPill(host, assessment)}
        ${assessment ? renderComfortAirQualityPill(host, assessment.air_quality) : nothing}
        ${renderComfortDataWarning(host, entityId, assessment)}
      </span>
    </span>
  `;
}

function renderComfortConfigurationDetails(
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
    <details class="comfort-configuration">
      <summary>
        <span class="comfort-configuration-summary">
          <ha-icon icon="mdi:tune-variant"></ha-icon>
          <span>
            <strong>${host._t("comfortConfiguration")}</strong>
            <small>${host._t("comfortConfigurationDescription")}</small>
          </span>
        </span>
        <ha-icon class="comfort-configuration-chevron" icon="mdi:chevron-down"></ha-icon>
      </summary>
      <div class="comfort-configuration-content">
        <section class="comfort-config-section comfort-data-sources-config-section comfort-freshness-config-section">
          <h3><ha-icon icon="mdi:database-outline"></ha-icon>${host._t("comfortDataSources")}</h3>
          <h4 class="comfort-config-subheading">${host._t("comfortDataFreshness")}</h4>
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
            ${renderComfortSensorPicker(host, entityId, settings, "temperature_entity_id", "temperature", "comfortTemperatureSensor")}
            ${renderComfortSensorPicker(host, entityId, settings, "humidity_entity_id", "humidity", "comfortHumiditySensor")}
            ${renderComfortSensorPicker(host, entityId, settings, "co2_entity_id", "co2", "comfortCo2Sensor")}
          </div>
        </section>
        <section class="comfort-config-section comfort-model-config-section">
          <h3><ha-icon icon="mdi:shape-outline"></ha-icon>${host._t("comfortModel")}</h3>
          <div class="comfort-config-rows">
            ${renderComfortModelSelector(host, entityId, settings, humidityHasSource)}
          </div>
        </section>
        <section class="comfort-config-section comfort-preferences-config-section">
          <h3><ha-icon icon="mdi:tune-variant"></ha-icon>${host._t("comfortPreferences")}</h3>
          <div class="comfort-config-rows">
            ${temperatureHasSource ? renderComfortNumberPair(
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
            ) : nothing}
            ${humidityHasSource
              ? settings.comfort_model === "temperature_aware"
                ? renderTemperatureAwareHumidityConfiguration(host, entityId, settings)
                : renderComfortNumberPair(
                  host,
                  entityId,
                  settings.comfort_model === "guided"
                    ? "comfortGuidedHumidityReference"
                    : "comfortHumidityRange",
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
              : nothing}
            ${settings.comfort_model === "guided" && humidityHasSource
              ? html`<p class="comfort-guided-reference">
                  <ha-icon icon="mdi:chart-bell-curve-cumulative"></ha-icon>
                  <span>${host._t("comfortModelGuidedReference", {
                    temperature: host._formatTemperature(
                      (settings.temperature_min + settings.temperature_max) / 2,
                      entityId,
                    ),
                  })}</span>
                </p>`
              : nothing}
            ${co2HasSource ? renderComfortNumberPair(
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
            ) : nothing}
          </div>
        </section>
        ${renderOutdoorComparisonConfiguration(host, entityId, settings)}
        ${renderDerivedMetricsConfigurationSection(host, entityId, settings)}
      </div>
    </details>
  `;
}

function renderOutdoorComparisonConfiguration(
  host: ComfortViewHost,
  entityId: string,
  settings: ComfortSettings,
) {
  return html`
    <section class="comfort-config-section comfort-outdoor-config-section">
      <header>
        <span><ha-icon icon="mdi:home-switch-outline"></ha-icon><strong>${host._t("comfortOutdoorComparison")}</strong></span>
        <ha-switch
          .checked=${settings.outdoor_comparison_enabled}
          aria-label=${host._t("comfortOutdoorComparison")}
          ?disabled=${host._settingsSaving}
          @change=${(event: Event) => host._saveZoneComfort(entityId, {
            outdoor_comparison_enabled: Boolean((event.target as HTMLInputElement).checked),
          })}
        ></ha-switch>
      </header>
      <p class="comfort-config-description">
        ${ventilationGuidanceDescription(host, entityId, settings)}
      </p>
      ${settings.outdoor_comparison_enabled ? html`
        <div class="comfort-config-rows comfort-outdoor-config-rows">
          ${renderOutdoorSensorPicker(host, entityId, settings.outdoor_temperature_entity_id, "temperature", "comfortOutdoorTemperatureSensor", true)}
          ${renderOutdoorSensorPicker(host, entityId, settings.outdoor_humidity_entity_id, "humidity", "comfortOutdoorHumiditySensor", false)}
        </div>
        <div class="comfort-ventilation-guidance-config">
          <h4><ha-icon icon="mdi:window-open-variant"></ha-icon>${host._t("comfortVentilationGuidance")}</h4>
          <div class="comfort-config-rows comfort-ventilation-guidance-rows">
            ${renderComfortNumber(
              host,
              entityId,
              "comfortVentilationTemperatureThreshold",
              "ventilation_temperature_threshold",
              settings.ventilation_temperature_threshold,
              host._temperatureUnit(entityId).toUpperCase().includes("F") ? 0.2 : 0.1,
              host._temperatureUnit(entityId).toUpperCase().includes("F") ? 18 : 10,
              0.1,
              host._temperatureUnit(entityId),
            )}
            ${settings.outdoor_humidity_entity_id ? html`
              ${renderComfortNumber(
                host,
                entityId,
                "comfortVentilationHumidityThreshold",
                "ventilation_humidity_threshold",
                settings.ventilation_humidity_threshold,
                0.5,
                50,
                0.5,
                host._t("comfortPercentagePoints"),
              )}
              ${renderComfortNumber(
                host,
                entityId,
                "comfortVentilationMoistureThreshold",
                "ventilation_absolute_humidity_threshold",
                settings.ventilation_absolute_humidity_threshold,
                0.1,
                10,
                0.1,
                "g/m³",
              )}
            ` : nothing}
          </div>
        </div>
      ` : nothing}
    </section>
  `;
}

function ventilationGuidanceDescription(
  host: ComfortViewHost,
  entityId: string,
  settings: ComfortSettings,
): string {
  const temperature = formatComfortDelta(
    host,
    entityId,
    settings.ventilation_temperature_threshold,
  );
  if (!settings.outdoor_humidity_entity_id) {
    return host._t("comfortVentilationGuidanceDescription", { temperature });
  }
  const humidityValue = settings.ventilation_humidity_threshold;
  const humidity = `${humidityValue.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })} ${host._t(
    humidityValue === 1 ? "comfortPercentagePoint" : "comfortPercentagePoints",
  )}`;
  const moisture = formatComfortAbsoluteHumidity(
    settings.ventilation_absolute_humidity_threshold,
    host.hass,
  );
  return host._t("comfortVentilationGuidanceDescriptionWithHumidity", {
    temperature,
    humidity,
    moisture,
  });
}

function renderOutdoorSensorPicker(
  host: ComfortViewHost,
  entityId: string,
  configuredValue: string | null,
  kind: "temperature" | "humidity",
  labelKey: TranslationKey,
  required: boolean,
) {
  const options = comfortSensorOptions(host.hass, configuredValue ?? "", kind);
  const field = kind === "temperature"
    ? "outdoor_temperature_entity_id"
    : "outdoor_humidity_entity_id";
  return html`
    <label class="comfort-config-row comfort-picker-row">
      ${renderComfortLabel(host, entityId, labelKey)}
      <span class="select-wrap comfort-select-wrap">
        <span class="comfort-select-control">
          <select
            .value=${configuredValue ?? ""}
            value=${configuredValue ?? ""}
            aria-required=${String(required)}
            ?disabled=${host._settingsSaving}
            @change=${(event: Event) => host._saveZoneComfort(entityId, {
              [field]: (event.currentTarget as HTMLSelectElement).value || null,
            })}
          >
            <option value="" .selected=${!configuredValue}>${host._t(required ? "comfortOutdoorSelectTemperature" : "comfortOutdoorNoHumidity")}</option>
            ${repeat(
              options,
              (option) => option.entityId,
              (option) => html`<option
                value=${option.entityId}
                .selected=${option.entityId === configuredValue}
              >${option.label} · ${option.entityId}</option>`,
            )}
          </select>
        </span>
      </span>
    </label>
  `;
}

function renderDerivedMetricsVisualSection(
  host: ComfortViewHost,
  entityId: string,
  settings: ComfortSettings,
  assessment: ComfortAssessment | undefined,
) {
  const definitions = DERIVED_METRICS.filter(
    ({ metric }) => settings.derived_metrics[metric].enabled,
  );
  if (!definitions.length) return nothing;
  const safeEntityId = entityId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return html`
    <section class="comfort-derived-visual-section">
      <h3>
        <ha-icon icon="mdi:chart-box-plus-outline"></ha-icon>
        ${host._t("comfortAdditionalInformation")}
      </h3>
      <div class="comfort-derived-visual-list">
        ${definitions.map((definition) => {
          const metricAssessment = assessment?.derived_metrics?.[definition.metric];
          if (definition.metric !== "humidex") {
            return renderCompactDerivedMetricReading(
              host,
              entityId,
              definition,
              metricAssessment,
              assessment?.temperature,
              safeEntityId,
            );
          }
          return html`
            <article
              class="comfort-derived-reading"
              aria-label=${host._t(definition.label)}
            >
              <header>
                ${renderDerivedMetricHeading(host, definition, safeEntityId)}
              </header>
              ${renderDerivedMetricVisual(
                host,
                entityId,
                definition.metric,
                metricAssessment,
                assessment?.temperature,
                settings.temperature_min,
                settings.temperature_max,
              )}
            </article>
          `;
        })}
      </div>
    </section>
  `;
}

function renderDerivedMetricHeading(
  host: ComfortViewHost,
  definition: (typeof DERIVED_METRICS)[number],
  safeEntityId: string,
) {
  return html`
    <ha-icon icon=${definition.icon}></ha-icon>
    <span class="comfort-derived-title">
      <strong>${host._t(definition.label)}</strong>
      ${renderInlineHelp(
        `comfort-${safeEntityId}-${definition.metric}-help`,
        host._t(definition.label),
        host._t(definition.description),
      )}
    </span>
  `;
}

function renderCompactDerivedMetricReading(
  host: ComfortViewHost,
  entityId: string,
  definition: (typeof DERIVED_METRICS)[number],
  reading: ComfortMetricAssessment | undefined,
  temperature: ComfortMetricAssessment | undefined,
  safeEntityId: string,
) {
  const model = derivedComfortVisualModel(
    definition.metric,
    reading,
    temperature,
    host._temperatureUnit(entityId),
  );
  const value = formatDerivedMetric(host, entityId, definition.metric, reading);
  let detail: string | undefined;
  if (definition.metric === "dew_point" && model.availability === "current" && model.relation) {
    const difference = formatComfortDelta(host, entityId, model.relation.delta);
    detail = host._t(
      model.relation.delta >= 0
        ? "comfortDewPointBelowRoom"
        : "comfortDewPointAboveRoom",
      { difference },
    );
  }
  const aria = detail
    ? `${host._t(definition.label)}: ${value}. ${detail}`
    : `${host._t(definition.label)}: ${value}`;
  return html`
    <article class="comfort-derived-reading" aria-label=${host._t(definition.label)}>
      <div
        class=${`comfort-derived-visual ${definition.metric.replace("_", "-")} tone-neutral availability-${model.availability}`}
        aria-label=${aria}
      >
        <div class="comfort-derived-summary-row">
          <header>
            ${renderDerivedMetricHeading(host, definition, safeEntityId)}
          </header>
          <strong class="comfort-derived-summary-value">${value}</strong>
        </div>
        ${detail ? html`<span class="comfort-derived-detail">${detail}</span>` : nothing}
      </div>
    </article>
  `;
}

function renderDerivedMetricsConfigurationSection(
  host: ComfortViewHost,
  entityId: string,
  settings: ComfortSettings,
) {
  const safeEntityId = entityId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return html`
    <section class="comfort-config-section comfort-derived-config-section">
      <h3>
        <ha-icon icon="mdi:chart-box-plus-outline"></ha-icon>
        ${host._t("comfortAdditionalInformation")}
      </h3>
      <p class="comfort-config-description">
        ${host._t("comfortAdditionalInformationDescription")}
      </p>
      <div class="comfort-derived-config-list">
        ${DERIVED_METRICS.map((definition) => {
          const metricSettings = settings.derived_metrics[definition.metric];
          return html`
            <article class=${`comfort-derived-config ${metricSettings.enabled ? "enabled" : "disabled"}`}>
              <header>
                <ha-icon icon=${definition.icon}></ha-icon>
                <span class="comfort-derived-title">
                  <strong>${host._t(definition.label)}</strong>
                  ${renderInlineHelp(
                    `comfort-${safeEntityId}-${definition.metric}-config-help`,
                    host._t(definition.label),
                    host._t(definition.description),
                  )}
                </span>
                <ha-switch
                  .checked=${metricSettings.enabled}
                  ?disabled=${host._settingsSaving}
                  @change=${(event: Event) => host._saveZoneComfort(entityId, {
                    derived_metrics: {
                      [definition.metric]: {
                        enabled: Boolean((event.target as HTMLInputElement).checked),
                        source: metricSettings.source,
                        entity_id: metricSettings.entity_id,
                      },
                    },
                  })}
                ></ha-switch>
              </header>
              ${metricSettings.enabled
                ? renderDerivedMetricSource(
                    host,
                    entityId,
                    definition.metric,
                    metricSettings.source,
                    metricSettings.entity_id,
                  )
                : nothing}
            </article>
          `;
        })}
      </div>
    </section>
  `;
}

function renderDerivedMetricVisual(
  host: ComfortViewHost,
  entityId: string,
  metric: DerivedComfortMetric,
  reading: ComfortMetricAssessment | undefined,
  temperature: ComfortMetricAssessment | undefined,
  temperatureMinimum: number,
  temperatureMaximum: number,
) {
  const model = derivedComfortVisualModel(
    metric,
    reading,
    temperature,
    host._temperatureUnit(entityId),
  );
  const value = formatDerivedMetric(host, entityId, metric, reading);
  if (model.availability !== "current" || model.value === undefined) {
    return html`
      <div
        class=${`comfort-derived-visual humidex tone-neutral availability-${model.availability}`}
        aria-label=${`${host._t("comfortHumidex")}: ${value}`}
      >
        <strong>${value}</strong>
      </div>
    `;
  }
  if (!model.relation) {
    return html`
      <div class="comfort-derived-visual humidex tone-neutral" aria-label=${`${host._t("comfortHumidex")}: ${value}`}>
        <strong>${value}</strong>
      </div>
    `;
  }

  const delta = formatComfortDelta(host, entityId, model.relation.delta);
  const relationKey: TranslationKey = model.relation.direction === "warmer"
    ? "comfortHumidexWarmerRelation"
    : model.relation.direction === "cooler"
      ? "comfortHumidexCoolerRelation"
      : "comfortHumidexNeutralRelation";
  const detail = host._t(relationKey, { delta });
  const deltaIcon = model.relation.direction === "warmer"
    ? "mdi:arrow-up"
    : model.relation.direction === "cooler" ? "mdi:arrow-down" : "mdi:minus";
  const signedDelta = model.relation.direction === "warmer"
    ? `+${delta}`
    : model.relation.direction === "cooler" ? `−${delta}` : delta;
  const aria = `${host._t("comfortAir")}: ${host._formatTemperature(model.relation.roomTemperature, entityId)}. ${host._t("comfortHumidex")}: ${value}. ${detail}`;
  const scale = humidexScaleModel(
    reading,
    temperature,
    temperatureMinimum,
    temperatureMaximum,
    host._temperatureUnit(entityId),
  );
  return html`
    <div class=${`comfort-derived-visual humidex tone-${model.tone}`} aria-label=${aria}>
      <div class="comfort-humidex-comparison">
        <span class="comfort-derived-endpoint">
          <small>${host._t("comfortAir")}</small>
          <strong>${host._formatTemperature(model.relation.roomTemperature, entityId)}</strong>
        </span>
        <span class="comfort-humidex-delta" aria-hidden="true">
          <ha-icon icon=${deltaIcon}></ha-icon><strong>${signedDelta}</strong>
        </span>
        <span class="comfort-derived-endpoint humidex">
          <small>${host._t("comfortHumidex")}</small>
          <strong>${value}</strong>
        </span>
      </div>
      ${scale ? renderHumidexScale(host, entityId, value, scale) : nothing}
      <span class="comfort-derived-relation">${detail}</span>
    </div>
  `;
}

function renderHumidexScale(
  host: ComfortViewHost,
  entityId: string,
  humidexValue: string,
  scale: NonNullable<ReturnType<typeof humidexScaleModel>>,
) {
  const positionKey: TranslationKey = scale.rangePosition === "below"
    ? "comfortHumidexRangeBelow"
    : scale.rangePosition === "within"
      ? "comfortHumidexRangeWithin"
      : scale.rangePosition === "above"
        ? "comfortHumidexRangeAbove"
        : "comfortHumidexRangeUnknown";
  const positionLabel = host._t(positionKey);
  const airCondition = scale.airCondition ?? "neutral";
  const style = [
    `--comfort-air-position:${scale.airPosition}%`,
    `--comfort-humidex-position:${scale.humidexPosition}%`,
    `--comfort-band-start:${scale.bandStart}%`,
    `--comfort-band-end:${scale.bandEnd}%`,
    `--comfort-connector-start:${scale.connectorStart}%`,
    `--comfort-connector-width:${scale.connectorWidth}%`,
  ].join(";");
  const aria = host._t("comfortHumidexScaleAria", {
    air: host._formatTemperature(scale.airValue, entityId),
    humidex: humidexValue,
    position: positionLabel,
  });
  return html`
    <div class="comfort-humidex-scale" style=${style} role="img" aria-label=${aria}>
      <span class="comfort-humidex-scale-label air">${host._t("comfortAir")}</span>
      <div class="comfort-humidex-scale-plot">
        <span class="comfort-humidex-range-band" aria-hidden="true"></span>
        ${scale.connectorVisible
          ? html`<span class="comfort-humidex-connector" aria-hidden="true"></span>`
          : nothing}
        <span class=${`comfort-humidex-marker air condition-${airCondition}`} aria-hidden="true"></span>
        <span class=${`comfort-humidex-marker humidex position-${scale.rangePosition ?? "neutral"}`} aria-hidden="true"></span>
      </div>
      <span class="comfort-humidex-scale-label humidex">${host._t("comfortHumidex")}</span>
      <div class="comfort-humidex-scale-domain">
        <span>${host._formatTemperature(scale.domainMinimum, entityId)}</span>
        <span>${host._t("comfortTemperatureRange")}</span>
        <span>${host._formatTemperature(scale.domainMaximum, entityId)}</span>
      </div>
      <span class=${`comfort-humidex-scale-status position-${scale.rangePosition ?? "neutral"}`}>
        ${positionLabel}
      </span>
    </div>
  `;
}

function formatComfortDelta(
  host: ComfortViewHost,
  entityId: string,
  value: number,
): string {
  const rounded = Number(Math.abs(value).toFixed(1));
  return `${rounded.toLocaleString()} ${host._temperatureUnit(entityId)}`;
}

function renderDerivedMetricSource(
  host: ComfortViewHost,
  entityId: string,
  metric: DerivedComfortMetric,
  source: "velair" | "entity",
  configuredEntityId: string | null,
) {
  const sensors = derivedMetricSensorOptions(host.hass, configuredEntityId ?? "", metric);
  const selectedValue = derivedMetricSourceValue(source, configuredEntityId);
  return html`
    <div class="comfort-derived-source">
      <label class="comfort-config-row comfort-derived-source-row">
        ${renderComfortLabel(
          host,
          entityId,
          "comfortMetricSource",
          metric,
        )}
        <span class="select-wrap comfort-select-wrap">
          <span class="comfort-select-control">
            <select
              .value=${selectedValue}
              ?disabled=${host._settingsSaving}
              @change=${(event: Event) => {
                const selection = derivedMetricSourceSelection(
                  (event.currentTarget as HTMLSelectElement).value,
                  configuredEntityId,
                );
                if (!selection) return;
                host._saveZoneComfort(entityId, {
                  derived_metrics: {
                    [metric]: { enabled: true, ...selection },
                  },
                });
              }}
            >
              <option
                value=${VELAIR_DERIVED_METRIC_SOURCE}
                ?selected=${selectedValue === VELAIR_DERIVED_METRIC_SOURCE}
              >${host._t("comfortMetricSourceVelair")}</option>
              ${source === "entity" && !configuredEntityId
                ? html`<option value="" disabled selected>${host._t("comfortMetricSelectEntity")}</option>`
                : nothing}
              ${sensors.map((sensor) => html`
                <option
                  value=${sensor.entityId}
                  ?selected=${sensor.entityId === selectedValue}
                >${sensor.label} · ${sensor.entityId}</option>
              `)}
            </select>
          </span>
        </span>
      </label>
    </div>
  `;
}

function renderComfortModelSelector(
  host: ComfortViewHost,
  entityId: string,
  settings: ComfortSettings,
  humidityHasSource: boolean,
) {
  const descriptionKey = settings.comfort_model === "guided"
    ? "comfortModelGuidedDescription"
    : settings.comfort_model === "temperature_aware"
      ? "comfortModelTemperatureAwareDescription"
      : "comfortModelSimpleDescription";
  return html`
    <label class="comfort-config-row comfort-picker-row comfort-model-row">
      ${renderComfortLabel(host, entityId, "comfortModel")}
      <span class="select-wrap comfort-select-wrap">
        <span class="comfort-select-control">
          <select
            .value=${settings.comfort_model}
            ?disabled=${host._settingsSaving}
            @change=${(event: Event) => host._saveZoneComfort(entityId, {
              comfort_model: (event.currentTarget as HTMLSelectElement).value === "temperature_aware"
                ? "temperature_aware"
                : (event.currentTarget as HTMLSelectElement).value === "guided"
                  ? "guided"
                  : "simple",
            })}
          >
            <option value="simple">${host._t("comfortModelSimple")}</option>
            <option value="guided" ?disabled=${!humidityHasSource}>
              ${host._t("comfortModelGuided")}
            </option>
            <option value="temperature_aware">${host._t("comfortModelTemperatureAware")}</option>
          </select>
        </span>
        <small>${host._t(descriptionKey)}</small>
        ${!humidityHasSource
          ? html`<small class="comfort-model-requirement">
              ${host._t("comfortModelHumidityRequired")}
            </small>`
          : nothing}
      </span>
    </label>
  `;
}

function renderTemperatureAwareHumidityConfiguration(
  host: ComfortViewHost,
  entityId: string,
  settings: ComfortSettings,
) {
  const endpoints = [
    {
      key: "at_temperature_min" as const,
      label: host._formatTemperature(settings.temperature_min, entityId),
      range: settings.temperature_aware.at_temperature_min,
    },
    {
      key: "at_temperature_max" as const,
      label: host._formatTemperature(settings.temperature_max, entityId),
      range: settings.temperature_aware.at_temperature_max,
    },
  ];
  return html`
    <div class="comfort-temperature-aware-ranges" aria-label=${host._t("comfortTemperatureAwareHumidityRanges")}>
      ${endpoints.map((endpoint) => html`
        <div
          class="comfort-temperature-aware-range"
          role="group"
          aria-label=${`${host._t(endpoint.key === "at_temperature_min"
            ? "comfortAtMinimumTemperature"
            : "comfortAtMaximumTemperature")} ${endpoint.label}`}
        >
          <div class="comfort-temperature-aware-range-heading">
            <span>${host._t(endpoint.key === "at_temperature_min"
              ? "comfortAtMinimumTemperature"
              : "comfortAtMaximumTemperature")}</span>
            <strong>${endpoint.label}</strong>
          </div>
          <div class="comfort-temperature-aware-fields">
            ${renderTemperatureAwareHumidityInput(
              host, entityId, endpoint.key, "minimum", endpoint.range.minimum,
              0, Math.max(0, endpoint.range.maximum - 0.1), "comfortMinimum",
            )}
            ${renderTemperatureAwareHumidityInput(
              host, entityId, endpoint.key, "maximum", endpoint.range.maximum,
              Math.min(100, endpoint.range.minimum + 0.1), 100, "comfortMaximum",
            )}
          </div>
        </div>
      `)}
    </div>
  `;
}

function renderTemperatureAwareHumidityInput(
  host: ComfortViewHost,
  entityId: string,
  endpoint: "at_temperature_min" | "at_temperature_max",
  field: "minimum" | "maximum",
  value: number,
  minimum: number,
  maximum: number,
  labelKey: TranslationKey,
) {
  return html`
    <label class="comfort-temperature-aware-field">
      <small>${host._t(labelKey)}</small>
      <span class="comfort-number-with-unit">
        <input
          type="number"
          min=${String(minimum)}
          max=${String(maximum)}
          step="0.1"
          .value=${String(value)}
          ?disabled=${host._settingsSaving}
          @change=${(event: Event) => {
            const rawValue = Number((event.currentTarget as HTMLInputElement).value);
            const boundedValue = Math.min(
              maximum,
              Math.max(minimum, Number.isFinite(rawValue) ? rawValue : value),
            );
            host._saveZoneComfort(entityId, {
              temperature_aware: {
                [endpoint]: { [field]: boundedValue },
              },
            });
          }}
        />
        <span>%</span>
      </span>
    </label>
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
      ${renderComfortLabel(host, entityId, labelKey)}
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
                host._saveZoneComfort(entityId, {
                  humidity_enabled: false,
                  ...(settings.comfort_model === "guided"
                    ? { comfort_model: "simple" as const }
                    : {}),
                });
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
      ${renderComfortLabel(host, entityId, labelKey)}
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
      ${renderComfortLabel(host, entityId, labelKey)}
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

function renderComfortLabel(
  host: ComfortViewHost,
  entityId: string,
  labelKey: TranslationKey,
  instanceKey?: string,
  helpKeyOverride?: TranslationKey,
) {
  const helpKey = helpKeyOverride ?? COMFORT_HELP_KEYS[labelKey];
  const help = helpKey ? host._t(helpKey) : "";
  const safeEntityId = entityId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return html`
    <span class="label comfort-config-label">
      <span>${host._t(labelKey)}</span>
      ${helpKey
        ? renderInlineHelp(
          `comfort-${safeEntityId}-${labelKey}${instanceKey ? `-${instanceKey}` : ""}-help`,
          help,
          help,
        )
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

function renderComfortHumidexPill(
  host: ComfortViewHost,
  assessment?: ComfortAssessment,
) {
  const summary = assessment?.range_summary;
  const position = summary?.positions.humidex;
  if (summary?.thermal_relation !== "mixed" || !position) return nothing;
  const positionKeys = {
    below: "comfortHumidexRangeBelow",
    within: "comfortHumidexRangeWithin",
    above: "comfortHumidexRangeAbove",
  } as const;
  return html`
    <span class=${`comfort-humidex-pill position-${position}`}>
      ${host._t("comfortHumidex")}: ${host._t(positionKeys[position])}
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
