import { html, nothing } from "lit";
import { outdoorTemperatureSensorOptions } from "../domain/preconditioning";
import type { VelairViewHost } from "../host-types";
import type { TranslationKey } from "../translations";
import type {
  PreconditioningDirectionLearning,
  PreconditioningLearningSummary,
  PreconditioningSettings,
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
  const preconditioning = preconditioningSettings(
    host._data?.zones[entityId]?.preconditioning,
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

  return html`
    <section class=${`preconditioning-zone ${preconditioning.enabled ? "enabled" : "disabled"} ${expanded ? "expanded" : "collapsed"}`}>
      <header class="preconditioning-zone-heading">
        <button
          type="button"
          class="preconditioning-zone-toggle"
          title=${toggleLabel}
          aria-label=${toggleLabel}
          aria-expanded=${String(expanded)}
          aria-controls=${expanded ? contentId : nothing}
          ?disabled=${!exists}
          @click=${() => host._togglePreconditioningZone(entityId)}
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
        <div class="preconditioning-zone-actions">
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
  return html`
    <div class="preconditioning-config-sections">
      ${renderConfigurationSection(
        host,
        "preconditioningTiming",
        "mdi:timer-outline",
        html`
          ${renderPreconditioningNumber(host, entityId, "preconditioningMinStart", preconditioning.min_start_minutes, "min_start_minutes", 0, 1440, 5)}
          ${renderPreconditioningNumber(host, entityId, "preconditioningMaxLead", preconditioning.max_lead_minutes, "max_lead_minutes", 0, 1440, 15)}
          ${renderPreconditioningNumber(host, entityId, "preconditioningMinimumDelta", preconditioning.minimum_delta_temperature, "minimum_delta_temperature", 0, 5, 0.1)}
          ${renderPreconditioningNumber(host, entityId, "preconditioningFallbackMinutesPerDegree", preconditioning.fallback_minutes_per_degree, "fallback_minutes_per_degree", 1, 120, 1)}
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
    <div class=${`preconditioning-direction ${learning.status}`}>
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
          <ha-icon icon="mdi:trash-can"></ha-icon>
        </button>
      </div>
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
  `;
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
      <span>${label}</span>
      <strong>${value}</strong>
    </span>
  `;
}

function renderConfigurationLabel(
  host: PreconditioningViewHost,
  labelKey: TranslationKey,
) {
  const helpKey = PRECONDITIONING_HELP_KEYS[labelKey];
  const help = helpKey ? host._t(helpKey) : "";
  return html`
    <span class="label preconditioning-config-label">
      <span>${host._t(labelKey)}</span>
      ${helpKey
        ? html`
            <span
              class="preconditioning-help"
              tabindex="0"
              aria-label=${help}
              @click=${(event: Event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <ha-icon icon="mdi:information-outline"></ha-icon>
              <span class="preconditioning-help-tooltip" role="tooltip">${help}</span>
            </span>
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
) {
  const disabled = host._settingsSaving;
  return html`
    <label class="preconditioning-config-row">
      ${renderConfigurationLabel(host, labelKey)}
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
          const rawValue = Number((event.currentTarget as HTMLInputElement).value);
          const boundedValue = Math.min(
            max,
            Math.max(min, Number.isFinite(rawValue) ? rawValue : value),
          );
          host._saveZonePreconditioning(entityId, { [field]: boundedValue });
        }}
      />
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
) {
  return html`
    <label class="preconditioning-config-row preconditioning-toggle-row">
      ${renderConfigurationLabel(host, labelKey)}
      <ha-switch
        .checked=${checked}
        ?disabled=${host._settingsSaving}
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
  const sensors = outdoorTemperatureSensorOptions(host.hass, value);
  return html`
    <label class=${`preconditioning-config-row preconditioning-sensor-row ${options.inactive ? "inactive" : ""}`}>
      ${renderConfigurationLabel(host, labelKey)}
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
          <option value="">
            ${host._t(
              options.inactive
                ? "preconditioningOutdoorDisabled"
                : "preconditioningSelectOutdoorSensor",
            )}
          </option>
          ${sensors.map(
            (sensor) => html`
              <option value=${sensor.entityId}>${sensor.label}</option>
            `,
          )}
        </select>
      </span>
    </label>
  `;
}

function preconditioningSettings(
  value?: Partial<PreconditioningSettings>,
): PreconditioningSettings {
  return {
    enabled: Boolean(value?.enabled),
    max_lead_minutes: Number(value?.max_lead_minutes ?? 1440),
    minimum_delta_temperature: Number(value?.minimum_delta_temperature ?? 0.3),
    learning_history_size: Number(value?.learning_history_size ?? 120),
    similar_sample_count: Number(value?.similar_sample_count ?? 25),
    comfort_percentile: Number(value?.comfort_percentile ?? 80),
    adaptive_percentile_enabled: value?.adaptive_percentile_enabled ?? true,
    partial_expiry_days: Number(value?.partial_expiry_days ?? 30),
    recency_decay_days: Number(value?.recency_decay_days ?? 30),
    min_start_minutes: Number(value?.min_start_minutes ?? 10),
    fallback_minutes_per_degree: Number(value?.fallback_minutes_per_degree ?? 25),
    use_outdoor_temperature: value?.use_outdoor_temperature ?? true,
    outdoor_temperature_entity_id: value?.outdoor_temperature_entity_id ?? null,
  };
}
