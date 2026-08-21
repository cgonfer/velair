import { html, nothing } from "lit";
import { preconditioningSettings, temperatureSensorOptions } from "../domain/preconditioning";
import { minutesPerDegreeBounds, temperatureDeltaMaximum, temperatureDeltaMinimum } from "../domain/temperature-units";
import type { VelairViewHost } from "../host-types";
import type { TranslationKey } from "../translations";
import { renderInlineHelp } from "./inline-help";
import type {
  PreconditioningDiagnostics,
  PreconditioningDirectionLearning,
  PreconditioningLearningSummary,
  PreconditioningSettings,
  ScheduleEvent,
} from "../types";

type PreconditioningViewHost = VelairViewHost;

const PRECONDITIONING_HELP_KEYS: Partial<Record<TranslationKey, TranslationKey>> = {
  preconditioningAdaptivePercentile: "preconditioningAdaptivePercentileHelp",
  preconditioningComfortPercentile: "preconditioningComfortPercentileHelp",
  preconditioningFallbackMinutesPerDegree: "preconditioningFallbackMinutesPerDegreeHelp",
  preconditioningHistorySize: "preconditioningHistorySizeHelp",
  preconditioningMaxLead: "preconditioningMaxLeadHelp",
  preconditioningMinimumDelta: "preconditioningMinimumDeltaHelp",
  preconditioningMinStart: "preconditioningMinStartHelp",
  preconditioningOutdoorTemperatureEntity: "preconditioningOutdoorTemperatureEntityHelp",
  preconditioningPartialExpiry: "preconditioningPartialExpiryHelp",
  preconditioningRecencyDecay: "preconditioningRecencyDecayHelp",
  preconditioningSimilarSamples: "preconditioningSimilarSamplesHelp",
  preconditioningUseOutdoorTemperature: "preconditioningUseOutdoorTemperatureHelp",
};

export function renderPreconditioningView(
  host: PreconditioningViewHost,
  zoneIds: string[],
) {
  return html`
    <section class="preconditioning-view">
      <header class="preconditioning-intro">
        <ha-icon icon="mdi:clock-fast"></ha-icon>
        <span>
          <strong>${host._t("preconditioningIntroTitle")}</strong>
          <small>${host._t("preconditioningIntroDetail")}</small>
        </span>
      </header>
      ${zoneIds.length
        ? zoneIds.map((entityId) => renderPreconditioningZone(host, entityId))
        : html`<span class="empty">${host._t("noManagedEntities")}</span>`}
    </section>
  `;
}

function renderPreconditioningZone(
  host: PreconditioningViewHost,
  entityId: string,
) {
  const exists = host._entityExists(entityId);
  const temperatureUnit = host._temperatureUnit?.(entityId) ?? "°C";
  const preconditioning = preconditioningSettings(
    host._data?.zones[entityId]?.preconditioning,
    temperatureUnit,
  );
  const learning = host._data?.preconditioning_learning?.[entityId];
  const expanded = exists && host._expandedPreconditioningZones.has(entityId);
  const contentId = `preconditioning-zone-content-${entityId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const toggleLabel = exists
    ? host._t(
        expanded ? "preconditioningCollapseClimate" : "preconditioningExpandClimate",
        { climate: host._friendlyEntityName(entityId) },
      )
    : host._t("preconditioningUnavailable");
  const handleToggle = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    if (exists) {
      host._togglePreconditioningZone(entityId);
    }
  };
  const handleHeadingClick = (event: Event) => {
    if (!exists) {
      return;
    }
    const target = event.target;
    if (target instanceof Element && target.closest(".preconditioning-zone-actions")) {
      return;
    }
    host._togglePreconditioningZone(entityId);
  };

  return html`
    <section class=${`preconditioning-zone ${preconditioning.enabled ? "enabled" : "disabled"} ${expanded ? "expanded" : "collapsed"}`}>
      <header class="preconditioning-zone-heading" @click=${handleHeadingClick}>
        <button
          type="button"
          class="preconditioning-zone-toggle"
          title=${toggleLabel}
          aria-label=${toggleLabel}
          aria-expanded=${String(expanded)}
          aria-controls=${expanded ? contentId : nothing}
          ?disabled=${!exists}
          @click=${handleToggle}
        >
          <ha-icon
            class="preconditioning-expand-icon"
            icon=${expanded ? "mdi:chevron-down" : "mdi:chevron-right"}
          ></ha-icon>
          <span class="preconditioning-zone-identity">
            <strong title=${host._friendlyEntityName(entityId)}>
              ${host._friendlyEntityName(entityId)}
            </strong>
            <span>${entityId}</span>
          </span>
        </button>
        <div class="preconditioning-zone-actions" @click=${(event: Event) => event.stopPropagation()}>
          <button
            type="button"
            class="icon-button preconditioning-settings-reset"
            title=${host._t("preconditioningResetSettings")}
            aria-label=${host._t("preconditioningResetSettings")}
            ?disabled=${host._settingsSaving}
            @click=${() => host._resetZonePreconditioningSettings(entityId)}
          >
            <ha-icon icon="mdi:restore"></ha-icon>
          </button>
          <span
            class=${exists ? "preconditioning-enable-control" : "preconditioning-enable-control unavailable"}
            title=${exists ? "" : host._t("preconditioningUnavailable")}
          >
            <ha-switch
              .checked=${preconditioning.enabled}
              ?disabled=${host._settingsSaving || !exists}
              @change=${(event: Event) =>
                host._saveZonePreconditioning(entityId, {
                  enabled: Boolean((event.target as HTMLInputElement).checked),
                })}
            ></ha-switch>
          </span>
        </div>
        ${exists
          ? nothing
          : html`<span class="preconditioning-unavailable-message">
              ${host._t("preconditioningUnavailable")}
            </span>`}
      </header>
      ${exists && expanded
        ? html`
            <div id=${contentId} class="preconditioning-zone-content">
              ${renderAdaptivePreconditioningFields(host, entityId, preconditioning)}
              ${preconditioning.enabled
                ? renderPreconditioningLearning(host, entityId, learning)
                : nothing}
            </div>
          `
        : nothing}
    </section>
  `;
}

function renderAdaptivePreconditioningFields(
  host: PreconditioningViewHost,
  entityId: string,
  preconditioning: PreconditioningSettings,
) {
  const temperatureUnit = host._temperatureUnit?.(entityId) ?? "°C";
  const minutesPerDegreeRange = minutesPerDegreeBounds(temperatureUnit);
  const temperatureDeltaStep = 0.1;
  return html`
    <div class="preconditioning-config-sections">
      ${renderConfigurationSection(
        host,
        "preconditioningTiming",
        "mdi:timer-outline",
        html`
          ${renderPreconditioningNumber(host, entityId, "preconditioningMinStart", preconditioning.min_start_minutes, "min_start_minutes", 0, 1440, 5)}
          ${renderPreconditioningNumber(host, entityId, "preconditioningMaxLead", preconditioning.max_lead_minutes, "max_lead_minutes", 0, 1440, 15)}
          ${renderPreconditioningNumber(host, entityId, "preconditioningMinimumDelta", preconditioning.minimum_delta_temperature, "minimum_delta_temperature", 0, temperatureDeltaMaximum(temperatureUnit, 5), temperatureDeltaStep, "", { labelUnit: temperatureUnit })}
          ${renderPreconditioningNumber(host, entityId, "preconditioningFallbackMinutesPerDegree", preconditioning.fallback_minutes_per_degree, "fallback_minutes_per_degree", minutesPerDegreeRange[0], minutesPerDegreeRange[1], 0.1, "", { labelUnit: `${host._t("minutesShort")}/${temperatureUnit}` })}
        `,
      )}
      ${renderConfigurationSection(
        host,
        "preconditioningModel",
        "mdi:tune-variant",
        html`
          ${renderPreconditioningNumber(host, entityId, "preconditioningComfortPercentile", preconditioning.comfort_percentile, "comfort_percentile", 50, 95, 5)}
          ${renderPreconditioningToggle(host, entityId, "preconditioningAdaptivePercentile", preconditioning.adaptive_percentile_enabled, "adaptive_percentile_enabled")}
          ${renderPreconditioningNumber(host, entityId, "preconditioningSimilarSamples", preconditioning.similar_sample_count, "similar_sample_count", 5, 100, 5)}
        `,
      )}
      ${renderConfigurationSection(
        host,
        "preconditioningHistory",
        "mdi:history",
        html`
          ${renderPreconditioningNumber(host, entityId, "preconditioningHistorySize", preconditioning.learning_history_size, "learning_history_size", 10, 500, 10)}
          ${renderPreconditioningNumber(host, entityId, "preconditioningPartialExpiry", preconditioning.partial_expiry_days, "partial_expiry_days", 1, 365, 1)}
          ${renderPreconditioningNumber(host, entityId, "preconditioningRecencyDecay", preconditioning.recency_decay_days, "recency_decay_days", 1, 365, 1)}
        `,
      )}
      ${renderConfigurationSection(
        host,
        "preconditioningOutdoorContext",
        "mdi:weather-partly-cloudy",
        html`
          ${renderPreconditioningToggle(host, entityId, "preconditioningUseOutdoorTemperature", preconditioning.use_outdoor_temperature, "use_outdoor_temperature")}
          ${renderPreconditioningEntityPicker(
            host,
            entityId,
            "preconditioningOutdoorTemperatureEntity",
            preconditioning.outdoor_temperature_entity_id ?? "",
            "outdoor_temperature_entity_id",
            { inactive: !preconditioning.use_outdoor_temperature },
          )}
        `,
      )}
    </div>
  `;
}

function renderConfigurationSection(
  host: PreconditioningViewHost,
  labelKey: TranslationKey,
  icon: string,
  content: unknown,
) {
  return html`
    <section class="preconditioning-config-section">
      <h3><ha-icon icon=${icon}></ha-icon>${host._t(labelKey)}</h3>
      <div class="preconditioning-config-rows">${content}</div>
    </section>
  `;
}

function renderPreconditioningLearning(
  host: PreconditioningViewHost,
  entityId: string,
  learning?: PreconditioningLearningSummary,
) {
  if (!learning) {
    return nothing;
  }
  const supportedDirections = [
    learning.heat.status === "unsupported"
      ? undefined
      : renderPreconditioningDirectionLearning(host, entityId, "heat", learning.heat),
    learning.cool.status === "unsupported"
      ? undefined
      : renderPreconditioningDirectionLearning(host, entityId, "cool", learning.cool),
  ].filter(Boolean);

  return html`
    <div class=${`preconditioning-learning ${learning.status}`}>
      <h3 class="preconditioning-learning-heading">
        <ha-icon icon="mdi:chart-line"></ha-icon>
        ${host._t("preconditioningLearningStatus")}
      </h3>
      <div class="preconditioning-directions">
        ${supportedDirections}
      </div>
    </div>
  `;
}

function renderPreconditioningDirectionLearning(
  host: PreconditioningViewHost,
  entityId: string,
  direction: "heat" | "cool",
  learning: PreconditioningDirectionLearning,
) {
  const directionLabel = host._t(
    direction === "heat" ? "preconditioningHeat" : "preconditioningCool",
  );
  const statusLabel = host._t(preconditioningLearningStatusKey(learning.status));
  const directionSamples = learning.total_samples;
  const usesHistory = learning.model_source === "history";
  const modelSource = host._t(
    usesHistory ? "preconditioningModelHistory" : "preconditioningModelInitial",
  );
  const reachedValue =
    learning.sample_count >= learning.required_samples
      ? String(learning.sample_count)
      : host._t("preconditioningDirectionSamples", {
          count: learning.sample_count,
          required: learning.required_samples,
        });

  return html`
    <div class=${`preconditioning-direction ${direction} ${learning.status}`}>
      <div class="preconditioning-direction-heading">
        <span>
          <ha-icon icon=${direction === "heat" ? "mdi:fire" : "mdi:snowflake"}></ha-icon>
          ${directionLabel}
        </span>
        <button
          type="button"
          class="icon-button preconditioning-learning-reset"
          title=${host._t("preconditioningResetLearning")}
          aria-label=${host._t("preconditioningResetLearning")}
          ?disabled=${directionSamples === 0 || host._settingsSaving}
          @click=${() =>
            host._resetZonePreconditioningLearning(
              entityId,
              direction,
              directionLabel,
            )}
        >
          <ha-icon icon="mdi:restore"></ha-icon>
        </button>
      </div>
      <div class="preconditioning-learning-status-card">
        <div class="preconditioning-learning-summary">
          ${renderLearningIndicator(
            host._t("preconditioningDirectionStatus"),
            statusLabel,
            learning.status === "ready" ? "mdi:check-circle" : "mdi:progress-clock",
            learning.status,
          )}
          ${renderLearningIndicator(
            host._t("preconditioningModelSource"),
            modelSource,
            usesHistory ? "mdi:chart-timeline-variant" : "mdi:calculator-variant-outline",
            usesHistory ? "history" : "initial",
          )}
        </div>
        <div class="preconditioning-sample-card">
          <div class="preconditioning-sample-chips">
            ${renderLearningChip(
              "complete",
              host._t("preconditioningReachedEvents"),
              reachedValue,
            )}
            ${renderLearningChip(
              "partial",
              host._t("preconditioningPartialEvents"),
              String(learning.partial_sample_count ?? 0),
            )}
            ${renderLearningChip(
              "invalid",
              host._t("preconditioningInvalidEvents"),
              String(learning.invalid_sample_count ?? 0),
            )}
          </div>
        </div>
      </div>
      ${renderPreconditioningPrediction(host, entityId, direction)}
    </div>
  `;
}

function renderPreconditioningPrediction(
  host: PreconditioningViewHost,
  entityId: string,
  direction: "heat" | "cool",
) {
  const event = nextPreconditioningEvent(host, entityId, direction);

  if (!event) {
    const directionLabel = host._t(
      direction === "heat" ? "preconditioningHeat" : "preconditioningCool",
    );
    return html`
      <section class="preconditioning-prediction empty">
        <div class="preconditioning-prediction-heading">
          <span>${host._t("preconditioningNextBlock")}</span>
          ${renderPredictionLiveLabel(host, entityId, direction)}
        </div>
        <div class="preconditioning-prediction-empty">
          <ha-icon icon="mdi:calendar-search"></ha-icon>
          <span>${host._t("preconditioningNoUpcomingDirectionEvent", { direction: directionLabel })}</span>
        </div>
      </section>
    `;
  }

  const targetWhen = event.target_when && event.target_when !== event.when
    ? event.target_when
    : event.when;
  const leadMinutes = preconditioningLeadMinutes(event.when, targetWhen);
  const hasEarlyStart = leadMinutes > 0;
  const leadLabel = hasEarlyStart
    ? host._t("preconditioningLeadTime", { minutes: leadMinutes })
    : host._t("preconditioningNormalStart");
  return html`
    <section class=${`preconditioning-prediction ${direction} ${hasEarlyStart ? "early" : "normal"}`}>
      <div class="preconditioning-prediction-heading">
        <span>${host._t("preconditioningNextBlock")}</span>
        ${renderPredictionLiveLabel(host, entityId, direction)}
      </div>
      <div class=${`preconditioning-block-preview ${hasEarlyStart ? "with-prestart" : "normal-start"}`}>
        ${hasEarlyStart
          ? html`
              <div class="preconditioning-prestart">
                <small>${host._t("preconditioningStarts")}</small>
                <strong>${host._formatDateTime(event.when)}</strong>
                <span>${leadLabel}</span>
              </div>
            `
          : nothing}
        <div class=${`preconditioning-preview-block mode-${direction}`}>
          <small>${host._t("preconditioningTargetBy")}</small>
          <strong>${host._formatDateTime(targetWhen)}</strong>
          <span>${host._formatEventAction(event)}</span>
          ${renderPredictionRangeBoundary(host, event, direction)}
          <span>${host._formatEventMode(event)}</span>
        </div>
      </div>
      ${event.preconditioning_diagnostics
        ? renderPreconditioningCalculationDetails(host, event.preconditioning_diagnostics)
        : nothing}
    </section>
  `;
}

function renderPredictionRangeBoundary(
  host: PreconditioningViewHost,
  event: ScheduleEvent,
  direction: "heat" | "cool",
) {
  if (!hasTemperatureRange(event)) {
    return nothing;
  }
  const diagnosticBoundary = event.preconditioning_diagnostics?.boundary_temperature;
  const boundaryTemperature = typeof diagnosticBoundary === "number"
    ? diagnosticBoundary
    : direction === "heat"
      ? event.target_temp_low
      : event.target_temp_high;
  if (typeof boundaryTemperature !== "number") {
    return nothing;
  }
  return html`
    <small class="preconditioning-range-boundary">
      ${host._t(
        direction === "heat"
          ? "preconditioningPredictionLowerBoundary"
          : "preconditioningPredictionUpperBoundary",
        { temperature: host._formatTemperature(boundaryTemperature, event.entity_id) },
      )}
    </small>
  `;
}

function renderPredictionLiveLabel(
  host: PreconditioningViewHost,
  entityId: string,
  direction: "heat" | "cool",
) {
  const help = host._t("preconditioningLivePredictionHelp");
  const key = entityId.replace(/[^a-z0-9_-]/gi, "-");
  return html`
    <span class="preconditioning-live-label">
      <span>${host._t("preconditioningLivePrediction")}</span>
      ${renderInlineHelp(`preconditioning-${key}-${direction}-live-prediction-help`, help, help)}
    </span>
  `;
}

function renderPreconditioningCalculationDetails(
  host: PreconditioningViewHost,
  diagnostics: PreconditioningDiagnostics,
) {
  return html`
    <details class="preconditioning-calculation-details">
      <summary>
        <ha-icon icon="mdi:calculator-variant-outline"></ha-icon>
        <span>${host._t("preconditioningCalculationDetails")}</span>
      </summary>
      <div class="preconditioning-calculation-grid">
        <div class="preconditioning-calculation-row context">
          ${renderCalculationItem(
            host._t("preconditioningCalculationSamples"),
            host._t("preconditioningCalculationSampleCounts", {
              reached: diagnostics.complete_sample_count,
              partial: diagnostics.partial_sample_count,
              invalid: diagnostics.invalid_sample_count,
            }),
            "samples",
          )}
          ${renderCalculationItem(
            host._t("preconditioningSimilarSamples"),
            String(diagnostics.similar_sample_count),
            "compact",
          )}
          ${renderCalculationItem(
            host._t("preconditioningComfortPercentileLabel"),
            `${diagnostics.comfort_percentile}%`,
            "compact",
          )}
        </div>
        <div class="preconditioning-calculation-row estimates">
          ${renderCalculationItem(
            host._t("preconditioningCalculationReachedEstimate"),
            formatDiagnosticMinutes(host, diagnostics.complete_estimate_minutes),
          )}
          ${renderCalculationItem(
            host._t("preconditioningCalculationPartialFloor"),
            formatDiagnosticMinutes(host, diagnostics.partial_floor_minutes),
          )}
        </div>
        <div class=${`preconditioning-calculation-row result ${
          calculationRoundedMatchesCombined(diagnostics)
            ? "without-rounded"
            : "with-rounded"
        }`}>
          ${renderCalculationItem(
            host._t("preconditioningCalculationCombined"),
            formatDiagnosticMinutes(host, diagnostics.combined_estimate_minutes),
          )}
          ${calculationRoundedMatchesCombined(diagnostics)
            ? nothing
            : renderCalculationItem(
                host._t("preconditioningCalculationRounded"),
                formatDiagnosticMinutes(host, diagnostics.rounded_estimate_minutes),
              )}
          ${renderCalculationItem(
            host._t("preconditioningCalculationFinalLead"),
            formatDiagnosticMinutes(host, diagnostics.final_lead_minutes),
            "final",
          )}
        </div>
      </div>
    </details>
  `;
}

function calculationRoundedMatchesCombined(
  diagnostics: PreconditioningDiagnostics,
): boolean {
  return (
    Math.round(diagnostics.combined_estimate_minutes * 10) / 10
    === diagnostics.rounded_estimate_minutes
  );
}

function renderCalculationItem(label: string, value: string, tone = "") {
  return html`
    <span class=${`preconditioning-calculation-item ${tone}`}>
      <small
        class="preconditioning-calculation-label"
        tabindex="0"
        title=${label}
        aria-label=${label}
      >
        <span class="preconditioning-calculation-label-text">${label}</span>
        <span class="preconditioning-calculation-tooltip" role="tooltip">${label}</span>
      </small>
      <strong>${value}</strong>
    </span>
  `;
}

function formatDiagnosticMinutes(
  host: PreconditioningViewHost,
  value?: number | null,
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }
  const rounded = Math.round(value * 10) / 10;
  return host._t("preconditioningFallbackLead", { minutes: rounded });
}

function nextPreconditioningEvent(
  host: PreconditioningViewHost,
  entityId: string,
  direction: "heat" | "cool",
): ScheduleEvent | undefined {
  return (host._data?.next_events ?? []).find((event) =>
    event.entity_id === entityId
    && preconditioningEventDirection(event) === direction
    && hasPreconditioningTarget(event)
  );
}

function hasPreconditioningTarget(event: ScheduleEvent): boolean {
  return typeof event.temperature === "number" || hasTemperatureRange(event);
}

function hasTemperatureRange(event: ScheduleEvent): boolean {
  return typeof event.target_temp_low === "number"
    && typeof event.target_temp_high === "number";
}

function preconditioningEventDirection(event: ScheduleEvent): "heat" | "cool" | undefined {
  const diagnosticDirection = event.preconditioning_diagnostics?.direction;
  if (diagnosticDirection === "heat" || diagnosticDirection === "cool") {
    return diagnosticDirection;
  }
  if (event.hvac_mode === "heat" || event.hvac_mode === "cool") {
    return event.hvac_mode;
  }
  return undefined;
}

function preconditioningLeadMinutes(startWhen: string, targetWhen: string): number {
  const startMs = new Date(startWhen).getTime();
  const targetMs = new Date(targetWhen).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(targetMs) || targetMs <= startMs) {
    return 0;
  }
  return Math.round((targetMs - startMs) / 60000);
}

function renderLearningIndicator(
  label: string,
  value: string,
  icon: string,
  tone: string,
) {
  return html`
    <div class=${`preconditioning-learning-indicator ${tone}`}>
      <ha-icon icon=${icon}></ha-icon>
      <span>
        <small>${label}</small>
        <strong>${value}</strong>
      </span>
    </div>
  `;
}

function renderLearningChip(
  tone: "complete" | "partial" | "invalid",
  label: string,
  value: string,
) {
  return html`
    <span class=${`preconditioning-sample-chip ${tone}`}>
      <span>${label}:</span>
      <strong>${value}</strong>
    </span>
  `;
}

function renderConfigurationLabel(
  host: PreconditioningViewHost,
  entityId: string,
  labelKey: TranslationKey,
  unit = "",
) {
  const helpKey = PRECONDITIONING_HELP_KEYS[labelKey];
  const help = helpKey ? host._t(helpKey) : "";
  const entityKey = entityId.replace(/[^a-z0-9_-]/gi, "-");
  return html`
    <span class="label preconditioning-config-label">
      <span>${host._t(labelKey)}${unit ? ` (${unit})` : ""}</span>
      ${helpKey
        ? html`
            ${renderInlineHelp(
              `preconditioning-${entityKey}-${String(labelKey)}-help`, help, help,
            )}
          `
        : nothing}
    </span>
  `;
}

function preconditioningLearningStatusKey(
  status:
    | PreconditioningLearningSummary["status"]
    | PreconditioningDirectionLearning["status"],
): TranslationKey {
  if (status === "ready") {
    return "preconditioningLearningReady";
  }
  if (status === "disabled") {
    return "preconditioningLearningDisabled";
  }
  return "preconditioningLearning";
}

function renderPreconditioningNumber(
  host: PreconditioningViewHost,
  entityId: string,
  labelKey: TranslationKey,
  value: number,
  field: keyof Pick<
    PreconditioningSettings,
    | "max_lead_minutes"
    | "minimum_delta_temperature"
    | "learning_history_size"
    | "similar_sample_count"
    | "comfort_percentile"
    | "partial_expiry_days"
    | "recency_decay_days"
    | "min_start_minutes"
    | "fallback_minutes_per_degree"
  >,
  min: number,
  max: number,
  step: number,
  unit = "",
  options: { inactive?: boolean; labelUnit?: string } = {},
) {
  const disabled = host._settingsSaving || Boolean(options.inactive);
  return html`
    <label class=${`preconditioning-config-row ${options.inactive ? "inactive" : ""}`}>
      ${renderConfigurationLabel(host, entityId, labelKey, options.labelUnit)}
      <span class="preconditioning-number-input"><input
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
          const rawValue = Number((event.currentTarget as HTMLInputElement).value);
          const boundedValue = Math.min(
            max,
            Math.max(min, Number.isFinite(rawValue) ? rawValue : value),
          );
          host._saveZonePreconditioning(entityId, { [field]: boundedValue });
        }}
      />${unit ? html`<span>${unit}</span>` : nothing}</span>
    </label>
  `;
}

function renderPreconditioningToggle(
  host: PreconditioningViewHost,
  entityId: string,
  labelKey: TranslationKey,
  checked: boolean,
  field: keyof Pick<
    PreconditioningSettings,
    "adaptive_percentile_enabled" | "use_outdoor_temperature"
  >,
  options: { inactive?: boolean } = {},
) {
  const disabled = host._settingsSaving || Boolean(options.inactive);
  return html`
    <label class=${`preconditioning-config-row preconditioning-toggle-row ${options.inactive ? "inactive" : ""}`}>
      ${renderConfigurationLabel(host, entityId, labelKey)}
      <ha-switch
        .checked=${checked}
        ?disabled=${disabled}
        @change=${(event: Event) =>
          host._saveZonePreconditioning(entityId, {
            [field]: Boolean((event.target as HTMLInputElement).checked),
          })}
      ></ha-switch>
    </label>
  `;
}

function renderPreconditioningEntityPicker(
  host: PreconditioningViewHost,
  entityId: string,
  labelKey: TranslationKey,
  value: string,
  field: keyof Pick<PreconditioningSettings, "outdoor_temperature_entity_id">,
  options: { inactive?: boolean } = {},
) {
  const disabled = host._settingsSaving || Boolean(options.inactive);
  const displayValue = options.inactive ? "" : value;
  const sensors = temperatureSensorOptions(host.hass, value);
  return html`
    <label class=${`preconditioning-config-row preconditioning-sensor-row ${options.inactive ? "inactive" : ""}`}>
      ${renderConfigurationLabel(host, entityId, labelKey)}
      <span class="select-wrap">
        <select
          .value=${displayValue}
          value=${displayValue}
          ?disabled=${disabled}
          @change=${(event: Event) => {
            if (disabled) {
              return;
            }
            const nextValue = (event.currentTarget as HTMLSelectElement).value.trim();
            host._saveZonePreconditioning(entityId, { [field]: nextValue || null });
          }}
        >
          <option value="" ?selected=${displayValue === ""}>
            ${host._t(
              options.inactive
                ? "preconditioningOutdoorDisabled"
                : "preconditioningSelectOutdoorSensor",
            )}
          </option>
          ${sensors.map(
            (sensor) => html`
              <option value=${sensor.entityId} ?selected=${sensor.entityId === displayValue}>
                ${sensor.label}
              </option>
            `,
          )}
        </select>
      </span>
    </label>
  `;
}
