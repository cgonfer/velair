import { html, nothing } from "lit";
import { VelairApiClient } from "../api/client";
import { orderedZoneIdsForHost } from "../controllers/card-context";
import {
  EMPTY_DIAGNOSTIC_HISTORY_FILTERS,
  filterDiagnosticHistory,
  hasDiagnosticHistoryFilters,
  normalizeDiagnosticHistoryFilters,
  validDiagnosticHistoryRange,
  VELAIR_SYSTEM_SOURCE,
  type DiagnosticHistorySource,
  type DiagnosticHistoryFilters,
} from "../domain/diagnostics-history";
import {
  DEFAULT_DIAGNOSTICS_LOG_COLUMNS,
  MIN_DIAGNOSTICS_LOG_COLUMNS,
  diagnosticsLogContentWidth,
  diagnosticsLogColumnMaximum,
  fitDiagnosticsLogColumns,
  resizeDiagnosticsLogColumn,
  type DiagnosticsLogColumn,
} from "../domain/diagnostics-log-layout";
import { modeClassName } from "../domain/climate";
import { dateLocale, formatDiagnosticDateTime } from "../domain/formatters";
import type { VelairViewHost } from "../host-types";
import type {
  DiagnosticHistoryCategory,
  DiagnosticHistoryItem,
  DiagnosticIssue,
  DiagnosticsSnapshot,
  UnitDiagnostics,
} from "../types";
import type { TranslationKey } from "../translations";

const HISTORY_CATEGORIES: DiagnosticHistoryCategory[] = [
  "control", "room_assist", "preconditioning", "comfort", "delivery", "availability",
];

type DetailRow = {
  label: TranslationKey;
  value: unknown;
  presentation?: "mode" | "modes" | "delivery-status";
};

export function renderDiagnosticsView(host: VelairViewHost) {
  const diagnostics = host._data?.diagnostics;
  if (!diagnostics) return html`<p class="empty">${host._t("diagnosticsUnavailable")}</p>`;
  const counts = diagnostics.overall.unit_counts;
  const units = orderedUnits(host, diagnostics);
  const selectedId = selectedUnitId(host, units);
  const selected = selectedId ? diagnostics.units[selectedId] : undefined;
  return html`<section class="diagnostics-view">
    <header class="diagnostics-intro">
      <ha-icon icon="mdi:stethoscope"></ha-icon>
      <span><strong>${host._t("diagnostics")}</strong><small>${host._t("diagnosticsDescription")}</small></span>
    </header>
    <section class=${`diagnostics-export-section${host._diagnosticsExportOpen ? " open" : ""}`}>
      <button class="diagnostics-download" type="button"
        title=${host._t("diagnosticsDownloadActionDescription")}
        aria-expanded=${host._diagnosticsExportOpen ? "true" : "false"}
        aria-controls="diagnostics-export-options"
        @click=${() => toggleExportPanel(host)}>
        <ha-icon icon="mdi:download"></ha-icon>
        <span><strong>${host._t("diagnosticsDownloadAction")}</strong>
          <small>${host._t("diagnosticsDownloadActionDescription")}</small></span>
        <ha-icon class="diagnostics-export-chevron" icon=${host._diagnosticsExportOpen ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>
      </button>
      ${host._diagnosticsExportOpen ? html`<div id="diagnostics-export-options"
        class="diagnostics-export-panel" aria-labelledby="diagnostics-export-heading">
      <h3 id="diagnostics-export-heading">${host._t("diagnosticsExportOptions")}</h3>
      <p>${host._t("diagnosticsExportExplanation")}</p>
      <label class="diagnostics-export-checkbox"><input type="checkbox" .checked=${host._diagnosticsRedactEntityIds}
        @change=${(event: Event) => { host._diagnosticsRedactEntityIds = (event.currentTarget as HTMLInputElement).checked; host.requestUpdate(); }} />
        <span>${host._t("diagnosticsRedactEntityIds")}</span></label>
      <p>${host._t("diagnosticsOperationalIdsAlwaysRedacted")}</p>
      ${!host._diagnosticsRedactEntityIds ? html`<p class="diagnostics-export-warning" role="alert">
        ${host._t("diagnosticsRawEntityIdsWarning")}</p>` : nothing}
      <div><button class="command-button" type="button" @click=${() => closeExportPanel(host)}>${host._t("cancel")}</button>
      <button class="command-button success" type="button" @click=${() => downloadReport(host)}>${host._t(
        host._diagnosticsRedactEntityIds ? "diagnosticsDownloadNow" : "diagnosticsDownloadWithEntityIds",
      )}</button></div>
      </div>` : nothing}
    </section>
    <section class=${`diagnostics-summary status-${diagnostics.overall.status}`}>
      <ha-icon icon=${diagnostics.overall.status === "ok" ? "mdi:check-circle-outline" : "mdi:alert-circle-outline"}></ha-icon>
      <div><strong>${host._t(diagnostics.overall.status === "ok" ? "diagnosticsHealthy" : "diagnosticsAttention")}</strong>
        <span>${host._t("diagnosticsSchedulerSummary", {
          mode: host._schedulerModeLabel(diagnostics.overall.scheduler_mode),
          status: host._schedulerStatusLabel(diagnostics.overall.scheduler_status),
        })}</span>
        <small>${host._t("diagnosticsUnitSummary", {
          ok: formatNumber(host, counts.ok), warning: formatNumber(host, counts.warning), error: formatNumber(host, counts.error),
        })}</small>
      </div>
    </section>
    ${diagnostics.overall.issues.length ? html`<div class="diagnostics-issues">${diagnostics.overall.issues.map((issue) => renderIssue(host, issue))}</div>` : nothing}
    <div class="diagnostics-master-detail">
      <nav class="diagnostics-unit-list" aria-label=${host._t("diagnosticsUnits")}>
        ${units.map(([entityId, unit]) => html`<button
          class=${`diagnostics-unit-option status-${unit.status}${entityId === selectedId ? " selected" : ""}`}
          type="button" aria-pressed=${entityId === selectedId ? "true" : "false"}
          aria-current=${entityId === selectedId ? "true" : "false"}
          @click=${() => selectUnit(host, entityId)}>
          ${renderClimateIcon(host, entityId)}
          <span class="diagnostics-unit-name"><strong>${host._friendlyEntityName(entityId)}</strong><small>${entityId}</small></span>
          <span class="diagnostics-unit-state">${runtimeStateLabel(host, unit.state)}</span>
          <span class=${`diagnostics-status-dot ${unit.status}`} role="img"
            title=${diagnosticStatusDescription(host, unit)}
            aria-label=${diagnosticStatusDescription(host, unit)}></span>
        </button>`)}
      </nav>
      ${selected && selectedId ? renderUnitDetail(host, selectedId, selected)
        : html`<div class="empty diagnostics-detail-panel diagnostics-unit-placeholder">
            <ha-icon icon="mdi:cursor-default-click-outline"></ha-icon>
            <span>${host._t(units.length ? "diagnosticsSelectUnit" : "diagnosticsNoUnits")}</span>
          </div>`}
    </div>
    ${renderHistoryPolicy(host, diagnostics)}
    ${renderHistoryLog(host, diagnostics, units)}
    <p class="diagnostics-privacy">${host._t("diagnosticsPrivacy")}</p>
  </section>`;
}

function orderedUnits(host: VelairViewHost, diagnostics: DiagnosticsSnapshot): Array<[string, UnitDiagnostics]> {
  return orderedZoneIdsForHost(host, Object.keys(diagnostics.units))
    .map((entityId) => [entityId, diagnostics.units[entityId]]);
}

function selectedUnitId(host: VelairViewHost, units: Array<[string, UnitDiagnostics]>): string | undefined {
  if (host._selectedDiagnosticEntity && units.some(([id]) => id === host._selectedDiagnosticEntity)) return host._selectedDiagnosticEntity;
  return undefined;
}

function selectUnit(host: VelairViewHost, entityId: string): void {
  host._selectedDiagnosticEntity = entityId;
  host.requestUpdate();
}

function renderUnitDetail(host: VelairViewHost, entityId: string, unit: UnitDiagnostics) {
  const configuration = record(unit.configuration);
  const preconditioning = record(configuration.preconditioning);
  const comfortConfiguration = record(configuration.comfort);
  const statusRows: DetailRow[] = [
    { label: "diagnosticsCurrentState", value: unit.state, presentation: "mode" },
    { label: "diagnosticsCalculatedIntent", value: intentSummary(host, unit.intent, entityId) },
    { label: "diagnosticsLastApplication", value: applicationSummary(host, unit.last_application, entityId) },
    { label: "diagnosticsDeliveryStatus", value: unit.delivery.status, presentation: "delivery-status" },
    { label: "diagnosticsRetryCount", value: unit.delivery.retry_count },
    { label: "diagnosticsLastError", value: deliveryErrorLabel(host, unit.delivery.last_error) },
  ];
  const setupRows: DetailRow[] = [
    { label: "diagnosticsScheduleSource", value: scheduleSourceLabel(host, unit.effective_setup.schedule_source) },
    { label: "diagnosticsMode", value: unit.effective_setup.mode_name ?? unit.effective_setup.mode_id },
    { label: "diagnosticsProfile", value: unit.effective_setup.profile_owner_name ?? unit.effective_setup.profile_owner_id },
    { label: "diagnosticsOverride", value: overrideSummary(host, unit.override) },
    { label: "diagnosticsPauses", value: unit.pauses?.length ? unit.pauses.length : undefined },
  ];
  const deviceRows: DetailRow[] = [
    {
      label: "diagnosticsHvacModes",
      value: Array.isArray(unit.capabilities.hvac_modes) && unit.capabilities.hvac_modes.length
        ? unit.capabilities.hvac_modes
        : undefined,
      presentation: "modes",
    },
    { label: "diagnosticsTemperatureRange", value: rangeValue(host, entityId, unit.capabilities.min_temperature, unit.capabilities.max_temperature) },
    { label: "diagnosticsTemperatureStep", value: temperatureValue(host, entityId, unit.capabilities.target_temperature_step) },
  ];
  return html`<article class=${`diagnostics-detail-panel status-${unit.status}`}>
    <header class="diagnostics-unit-heading">${renderClimateIcon(host, entityId)}
      <div class="diagnostics-unit-identity"><h3>${host._friendlyEntityName(entityId)}</h3><small>${entityId}</small>
        <span class="diagnostics-feature-chips">
          ${preconditioning.room_sensor_assist_enabled ? featureChip(host, "diagnosticsRoomAssist", "mdi:thermometer-auto") : nothing}
          ${preconditioning.enabled ? featureChip(host, "diagnosticsPreconditioning", "mdi:clock-fast") : nothing}
          ${comfortConfiguration.enabled ? featureChip(host, "diagnosticsComfort", "mdi:home-heart") : nothing}
        </span>
      </div>
      <span class=${`diagnostics-status-dot ${unit.status}`} role="img"
        title=${diagnosticStatusDescription(host, unit)}
        aria-label=${diagnosticStatusDescription(host, unit)}></span>
    </header>
    ${unit.issues.length ? html`<div class="diagnostics-issues">${unit.issues.map((issue) => renderIssue(host, issue))}</div>` : nothing}
    <div class="diagnostics-groups">
      ${renderGroup(host, "diagnosticsStatusDelivery", "mdi:send-check-outline", statusRows)}
      ${renderGroup(host, "diagnosticsActiveConfiguration", "mdi:tune-variant", setupRows)}
      ${renderFunctions(host, entityId, unit, preconditioning, comfortConfiguration)}
      ${renderDeviceAndSensors(host, unit, deviceRows)}
    </div>
  </article>`;
}

function featureChip(host: VelairViewHost, label: TranslationKey, icon: string) {
  const text = host._t(label);
  return html`<span title=${text} aria-label=${text}><ha-icon icon=${icon}></ha-icon>${text}</span>`;
}

function renderFunctions(host: VelairViewHost, entityId: string, unit: UnitDiagnostics, preconditioning: Record<string, unknown>, comfortConfig: Record<string, unknown>) {
  const functions = [
    { title: "diagnosticsRoomAssist" as TranslationKey, icon: "mdi:thermometer-auto",
      visible: Boolean(preconditioning.room_sensor_assist_enabled || unit.room_assist),
      rows: [
        { label: "diagnosticsConfigured" as TranslationKey,
          value: preconditioning.room_sensor_assist_enabled === false && unit.room_assist ? false : undefined },
        { label: "diagnosticsFunctionState" as TranslationKey, value: roomAssistStateLabel(host, record(unit.room_assist).status) },
        { label: "diagnosticsAppliedTarget" as TranslationKey, value: appliedTargetSummary(host, record(unit.room_assist), entityId) },
      ] },
    { title: "diagnosticsPreconditioning" as TranslationKey, icon: "mdi:clock-fast",
      visible: Boolean(preconditioning.enabled || unit.preconditioning_learning),
      rows: [
        { label: "diagnosticsConfigured" as TranslationKey,
          value: preconditioning.enabled === false && unit.preconditioning_learning ? false : undefined },
        { label: "diagnosticsHeatSamples" as TranslationKey, value: record(record(unit.preconditioning_learning).heat).observation_count },
        { label: "diagnosticsCoolSamples" as TranslationKey, value: record(record(unit.preconditioning_learning).cool).observation_count },
      ] },
    { title: "diagnosticsComfort" as TranslationKey, icon: "mdi:home-heart",
      visible: Boolean(comfortConfig.enabled || unit.comfort),
      rows: [
        { label: "diagnosticsConfigured" as TranslationKey,
          value: comfortConfig.enabled === false && unit.comfort ? false : undefined },
        { label: "diagnosticsFunctionState" as TranslationKey, value: comfortStateLabel(host, record(unit.comfort).condition ?? record(unit.comfort).status) },
      ] },
  ].filter((item) => item.visible);
  if (!functions.length) return nothing;
  return html`<section class="diagnostics-group"><h4><ha-icon icon="mdi:puzzle-outline"></ha-icon><span>${host._t("diagnosticsFunctions")}</span></h4>
    <div class="diagnostics-function-grid">${functions.map((item) => html`<section class="diagnostics-function">
      <strong><ha-icon icon=${item.icon}></ha-icon><span>${host._t(item.title)}</span></strong>${renderRows(host, item.rows)}</section>`)}</div>
  </section>`;
}

function renderDeviceAndSensors(host: VelairViewHost, unit: UnitDiagnostics, rows: DetailRow[]) {
  if (!meaningfulRows(rows).length && !unit.sensors.length) return nothing;
  return html`<section class="diagnostics-group"><h4><ha-icon icon="mdi:devices"></ha-icon><span>${host._t("diagnosticsDeviceSensors")}</span></h4>
    ${renderRows(host, rows)}
    ${unit.sensors.length ? html`<ul class="diagnostics-sensors">${unit.sensors.map((sensor) => html`<li>
      <strong>${host._t(sensorPurposeLabel(sensor.purpose))}</strong>
      <span class="diagnostics-sensor-detail">
        <ha-icon icon=${sensorPurposeIcon(sensor.purpose)}></ha-icon>
        <span class="diagnostics-sensor-entity" title=${sensor.entity_id}>${sensor.entity_id}</span>
        <small class="diagnostics-sensor-value">${sensorValue(host, sensor)}</small>
      </span></li>`)}</ul>` : nothing}
  </section>`;
}

function renderGroup(host: VelairViewHost, title: TranslationKey, icon: string, rows: DetailRow[]) {
  const visible = meaningfulRows(rows);
  if (!visible.length) return nothing;
  return html`<section class="diagnostics-group"><h4><ha-icon icon=${icon}></ha-icon><span>${host._t(title)}</span></h4>${renderRows(host, visible)}</section>`;
}

function renderRows(host: VelairViewHost, rows: DetailRow[]) {
  return html`<dl class="diagnostics-rows">${meaningfulRows(rows).map((row) => html`<div>
    <dt>${host._t(row.label)}</dt><dd>${renderDetailValue(host, row)}</dd></div>`)}</dl>`;
}

function renderDetailValue(host: VelairViewHost, row: DetailRow) {
  if (row.presentation === "mode") {
    if (["missing", "unknown", "unavailable"].includes(String(row.value))) {
      const severity = row.value === "missing" ? "error" : "warning";
      return html`<span class=${`diagnostics-state-chip ${severity}`}>${runtimeStateLabel(host, row.value)}</span>`;
    }
    return renderModeChip(host, row.value);
  }
  if (row.presentation === "modes" && Array.isArray(row.value)) {
    return html`<span class="diagnostics-mode-list">${row.value.map((mode) => renderModeChip(host, mode))}</span>`;
  }
  if (row.presentation === "delivery-status") {
    const status = String(row.value ?? "");
    return html`<span class=${`diagnostics-state-chip ${deliveryStatusClass(status)}`}>
      ${deliveryStatusLabel(host, status)}
    </span>`;
  }
  return displayValue(host, row.value);
}

function renderModeChip(host: VelairViewHost, value: unknown) {
  const mode = String(value ?? "");
  if (!mode) return nothing;
  return html`<span class=${`mode-chip mode-${modeClassName(mode)}`}>${host._modeLabel(mode)}</span>`;
}

function deliveryStatusClass(status: string): string {
  if (status === "success") return "success";
  if (["failed", "exhausted", "invalid_intent"].includes(status)) return "error";
  if (["retrying", "unavailable"].includes(status)) return "warning";
  return "neutral";
}

function renderHistoryPolicy(host: VelairViewHost, diagnostics: DiagnosticsSnapshot) {
  return html`<section class="diagnostics-history-policy"><header><div class="diagnostics-section-heading">
      <ha-icon icon="mdi:history"></ha-icon><div><h3>${host._t("diagnosticsHistorySettings")}</h3>
      <p>${host._t("diagnosticsHistoryExplanation", { limit: formatNumber(host, diagnostics.history_limit) })}</p>
      </div></div><button class="command-button diagnostics-clear-history" type="button"
      title=${host._t("diagnosticsClearHistory")} aria-label=${host._t("diagnosticsClearHistory")}
      ?disabled=${host._diagnosticsHistorySaving || diagnostics.history.length === 0}
      @click=${() => clearHistory(host)}><ha-icon icon="mdi:delete-outline"></ha-icon>
      <span>${host._t("diagnosticsClearHistory")}</span></button></header>
    <div class="diagnostics-category-grid">${HISTORY_CATEGORIES.map((category) => html`<label><input type="checkbox"
      .checked=${diagnostics.history_policy.categories[category]} ?disabled=${host._diagnosticsHistorySaving}
      @change=${(event: Event) => updateHistoryCategory(host, diagnostics, category, (event.currentTarget as HTMLInputElement).checked)} />
      <span><strong>${host._t(categoryLabel(category))}</strong><small>${host._t(categoryDescription(category))}</small></span>
    </label>`)}</div>
  </section>`;
}

function renderIssue(host: VelairViewHost, issue: DiagnosticIssue) {
  return html`<p class=${`diagnostics-issue ${issue.severity}`}><ha-icon icon=${issue.severity === "error" ? "mdi:alert-circle" : "mdi:alert"}></ha-icon><span>${issueText(host, issue.code)}</span></p>`;
}

function issueText(host: VelairViewHost, code: string): string {
  const keys: Record<string, TranslationKey> = {
    entity_missing: "entityDiagnosticMissing", entity_unavailable: "diagnosticsEntityUnavailable",
    entity_unknown: "diagnosticsEntityUnknown", hvac_modes_not_reported: "entityDiagnosticNoModes",
    temperature_range_not_reported: "entityDiagnosticNoRange", temperature_migration_required: "temperatureMigrationRequired",
    operation_recovery_required: "operationRecoveryRequired", delivery_failed: "diagnosticsDeliveryFailed",
    delivery_retrying: "diagnosticsDeliveryRetrying", delivery_exhausted: "diagnosticsDeliveryExhausted",
    delivery_invalid_intent: "diagnosticsDeliveryInvalidIntent", runtime_status_unavailable: "diagnosticsRuntimeUnavailable",
    associated_sensor_unavailable: "diagnosticsSensorUnavailable",
  };
  return keys[code] ? host._t(keys[code]) : humanizeIdentifier(code) ?? code;
}

function renderHistoryLog(
  host: VelairViewHost,
  diagnostics: DiagnosticsSnapshot,
  units: Array<[string, UnitDiagnostics]>,
) {
  const entityIds = units.map(([entityId]) => entityId);
  const filters = normalizeDiagnosticHistoryFilters(
    host._diagnosticsHistoryFilters ?? EMPTY_DIAGNOSTIC_HISTORY_FILTERS,
    entityIds,
  );
  const validRange = validDiagnosticHistoryRange(filters);
  const history = filterDiagnosticHistory(diagnostics.history, filters);
  return html`<section class="diagnostics-history" aria-labelledby="diagnostics-history-title">
    <header><div><h3 id="diagnostics-history-title">${host._t("diagnosticsHistoryLog")}</h3>
      <p>${host._t("diagnosticsRecentHistory", {
        count: formatNumber(host, diagnostics.history.length),
        limit: formatNumber(host, diagnostics.history_limit),
      })}</p></div>
      <button class=${`command-button diagnostics-clear-filters${hasDiagnosticHistoryFilters(filters) ? " success" : ""}`} type="button"
        ?disabled=${!hasDiagnosticHistoryFilters(filters)}
        @click=${() => setHistoryFilters(host, EMPTY_DIAGNOSTIC_HISTORY_FILTERS)}>
        <ha-icon icon="mdi:filter-off-outline"></ha-icon>
        <span>${host._t("diagnosticsHistoryClearFilters")}</span>
      </button></header>
    <div class="diagnostics-history-filters">
      ${renderHistorySourceFilter(host, filters, entityIds)}
      <label><span>${host._t("diagnosticsHistoryCategoryFilter")}</span><select
        .value=${filters.category}
        @change=${(event: Event) => setHistoryFilters(host, {
          ...filters,
          category: (event.currentTarget as HTMLSelectElement).value as DiagnosticHistoryFilters["category"],
        })}>
        <option value="all">${host._t("diagnosticsHistoryAllCategories")}</option>
        ${HISTORY_CATEGORIES.map((category) => html`<option value=${category}>${host._t(categoryLabel(category))}</option>`)}
      </select></label>
      ${renderHistoryDateFilter(host, filters, "from", "diagnosticsHistoryFrom")}
      ${renderHistoryDateFilter(host, filters, "to", "diagnosticsHistoryTo")}
    </div>
    ${!validRange ? html`<p class="diagnostics-filter-error" role="alert">${host._t("diagnosticsHistoryInvalidRange")}</p>` : nothing}
    <p class="diagnostics-history-results" aria-live="polite">${host._t("diagnosticsHistoryResults", {
      visible: formatNumber(host, history.length),
      total: formatNumber(host, diagnostics.history.length),
    })}</p>
    ${renderHistory(host, diagnostics.history, history)}
  </section>`;
}

function renderHistorySourceFilter(
  host: VelairViewHost,
  filters: DiagnosticHistoryFilters,
  entityIds: string[],
) {
  const open = host._diagnosticsSourceFilterOpen;
  const selected = filters.sources;
  const isChecked = (source: DiagnosticHistorySource) =>
    selected === null || selected.has(source);
  return html`<div class="diagnostics-source-filter"
    @keydown=${(event: KeyboardEvent) => {
      if (event.key !== "Escape" || !host._diagnosticsSourceFilterOpen) return;
      event.preventDefault();
      event.stopPropagation();
      host._setDiagnosticsSourceFilterOpen(false, true);
    }}>
    <span class="diagnostics-filter-label">${host._t("diagnosticsHistoryClimateFilter")}</span>
    <button class="diagnostics-source-trigger" type="button"
      aria-expanded=${open ? "true" : "false"} aria-controls="diagnostics-source-options"
      @click=${() => host._setDiagnosticsSourceFilterOpen(!open)}>
      <span>${historySourceSummary(host, filters, entityIds)}</span>
      <ha-icon icon=${open ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>
    </button>
    ${open ? html`<div id="diagnostics-source-options"
      class=${`diagnostics-source-popover placement-${host._diagnosticsSourcePlacement}`}
      style=${host._diagnosticsSourceMaxHeight === undefined
        ? nothing
        : `max-height:${host._diagnosticsSourceMaxHeight}px`}>
      <fieldset><legend>${host._t("diagnosticsHistorySourcesLegend")}</legend>
        <label><input type="checkbox" .checked=${selected === null}
          @change=${(event: Event) => setHistoryFilters(host, {
            ...filters,
            sources: (event.currentTarget as HTMLInputElement).checked ? null : new Set(),
          })} /><span>${host._t("diagnosticsHistoryAllSources")}</span></label>
        <label><input type="checkbox" .checked=${isChecked(VELAIR_SYSTEM_SOURCE)}
          @change=${(event: Event) => toggleHistorySource(host, filters, entityIds,
            VELAIR_SYSTEM_SOURCE, (event.currentTarget as HTMLInputElement).checked)} />
          <span>${host._t("diagnosticsHistoryVelairOnly")}</span></label>
        ${entityIds.map((entityId) => html`<label><input type="checkbox"
          .checked=${isChecked(entityId)}
          @change=${(event: Event) => toggleHistorySource(host, filters, entityIds,
            entityId, (event.currentTarget as HTMLInputElement).checked)} />
          <span>${host._friendlyEntityName(entityId)}</span></label>`)}
      </fieldset>
      <button class="command-button diagnostics-source-done" type="button"
        @click=${() => host._setDiagnosticsSourceFilterOpen(false, true)}>${host._t("diagnosticsHistorySourcesDone")}</button>
    </div>` : nothing}
  </div>`;
}

function historySourceSummary(
  host: VelairViewHost,
  filters: DiagnosticHistoryFilters,
  entityIds: string[],
): string {
  if (filters.sources === null) return host._t("diagnosticsHistoryAllSources");
  const includesVelair = filters.sources.has(VELAIR_SYSTEM_SOURCE);
  const climates = entityIds.filter((entityId) => filters.sources?.has(entityId));
  if (!climates.length) return includesVelair
    ? host._t("diagnosticsHistoryVelairOnly")
    : host._t("diagnosticsHistoryNoSources");
  if (climates.length === 1) {
    const climate = host._friendlyEntityName(climates[0]);
    return includesVelair
      ? host._t("diagnosticsHistoryClimateWithVelair", { climate })
      : climate;
  }
  return host._t(
    includesVelair ? "diagnosticsHistorySourceCountWithVelair" : "diagnosticsHistorySourceCount",
    { count: formatNumber(host, climates.length) },
  );
}

function toggleHistorySource(
  host: VelairViewHost,
  filters: DiagnosticHistoryFilters,
  entityIds: string[],
  source: DiagnosticHistorySource,
  checked: boolean,
): void {
  const sources = new Set<DiagnosticHistorySource>(filters.sources ?? [
    VELAIR_SYSTEM_SOURCE,
    ...entityIds,
  ]);
  if (checked) sources.add(source); else sources.delete(source);
  setHistoryFilters(host, normalizeDiagnosticHistoryFilters({ ...filters, sources }, entityIds));
}

function renderHistoryDateFilter(
  host: VelairViewHost,
  filters: DiagnosticHistoryFilters,
  key: "from" | "to",
  label: TranslationKey,
) {
  return html`<label><span>${host._t(label)}</span><input type="datetime-local"
    .value=${filters[key]}
    aria-invalid=${validDiagnosticHistoryRange(filters) ? "false" : "true"}
    @input=${(event: Event) => setHistoryFilters(host, {
      ...filters,
      [key]: (event.currentTarget as HTMLInputElement).value,
    })} /></label>`;
}

function setHistoryFilters(
  host: VelairViewHost,
  filters: DiagnosticHistoryFilters,
): void {
  host._diagnosticsHistoryFilters = { ...filters };
  host.requestUpdate();
}

function renderHistory(
  host: VelairViewHost,
  completeHistory: DiagnosticHistoryItem[],
  history: DiagnosticHistoryItem[],
) {
  if (!completeHistory.length) return html`<p class="empty">${host._t("diagnosticsNoHistory")}</p>`;
  if (!history.length) return html`<p class="empty">${host._t("diagnosticsHistoryNoMatches")}</p>`;
  const columns = fitDiagnosticsLogColumns(
    host._diagnosticsLogColumns ?? DEFAULT_DIAGNOSTICS_LOG_COLUMNS,
    host._diagnosticsLogAvailableWidth,
  );
  const columnStyle = `--diagnostics-log-time:${columns.time}px;--diagnostics-log-climate:${columns.climate}px;--diagnostics-log-type:${columns.type}px`;
  return html`<div class="diagnostics-history-table" style=${columnStyle}>
    <div class="diagnostics-history-header" role="row">
      <span>${host._t("diagnosticsLogTime")}</span>${renderLogResizeHandle(host, "time", columns.time)}
      <span>${host._t("diagnosticsLogClimate")}</span>${renderLogResizeHandle(host, "climate", columns.climate)}
      <span>${host._t("diagnosticsLogType")}</span>${renderLogResizeHandle(host, "type", columns.type)}
      <span>${host._t("diagnosticsLogMessage")}</span>
    </div>
    <ol>${history.map((item) => html`<li>
    <time datetime=${item.at} title=${item.at}>${formatDiagnosticTimestamp(host, item.at)}</time>
      <span class="diagnostics-history-climate">${item.entity_id ? host._friendlyEntityName(item.entity_id) : "Velair"}</span>
      <span class="diagnostics-history-type">${historyEventLabel(host, item)}</span>
    <span class="diagnostics-history-message">${historyDescription(host, item)}</span></li>`)}</ol>
  </div>`;
}

const logResizeState = new WeakMap<object, {
  column: DiagnosticsLogColumn;
  pointerId: number;
  startX: number;
  startWidth: number;
}>();

function renderLogResizeHandle(host: VelairViewHost, column: DiagnosticsLogColumn, width: number) {
  const labelKey = `diagnosticsLog${column[0].toUpperCase()}${column.slice(1)}` as TranslationKey;
  return html`<span class="diagnostics-log-resizer" role="separator" tabindex="0"
    aria-orientation="vertical" aria-valuemin=${MIN_DIAGNOSTICS_LOG_COLUMNS[column]}
    aria-valuemax=${diagnosticsLogColumnMaximum(
      host._diagnosticsLogColumns ?? DEFAULT_DIAGNOSTICS_LOG_COLUMNS,
      column,
      host._diagnosticsLogAvailableWidth,
    )}
    aria-valuenow=${Math.round(width)} aria-label=${host._t("diagnosticsLogResizeColumn", {
      column: host._t(labelKey),
    })}
    @pointerdown=${(event: PointerEvent) => startLogResize(host, column, width, event)}
    @pointermove=${(event: PointerEvent) => moveLogResize(host, event)}
    @pointerup=${(event: PointerEvent) => endLogResize(host, event)}
    @pointercancel=${(event: PointerEvent) => endLogResize(host, event)}
    @lostpointercapture=${(event: PointerEvent) => endLogResize(host, event)}
    @keydown=${(event: KeyboardEvent) => keyboardLogResize(host, column, event)}
    @dblclick=${(event: MouseEvent) => setLogColumnWidth(host, column,
      DEFAULT_DIAGNOSTICS_LOG_COLUMNS[column], logAvailableWidth(event.currentTarget))}></span>`;
}

function logAvailableWidth(target: EventTarget | null): number {
  const width = (target as Element | null)?.closest(".diagnostics-history-table")
    ?.getBoundingClientRect().width;
  return diagnosticsLogContentWidth(width && width > 0 ? width : 900);
}

function setLogColumnWidth(
  host: VelairViewHost,
  column: DiagnosticsLogColumn,
  width: number,
  availableWidth: number,
): void {
  host._diagnosticsLogColumns = resizeDiagnosticsLogColumn(
    host._diagnosticsLogColumns ?? DEFAULT_DIAGNOSTICS_LOG_COLUMNS,
    column,
    width,
    availableWidth,
  );
  host._diagnosticsLogAvailableWidth = availableWidth;
  host.requestUpdate();
}

function startLogResize(
  host: VelairViewHost,
  column: DiagnosticsLogColumn,
  width: number,
  event: PointerEvent,
): void {
  if (!event.isPrimary || event.button !== 0 || logResizeState.has(host)) return;
  logResizeState.set(host, {
    column, pointerId: event.pointerId, startX: event.clientX, startWidth: width,
  });
  (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
}

function moveLogResize(host: VelairViewHost, event: PointerEvent): void {
  const state = logResizeState.get(host);
  if (!state || state.pointerId !== event.pointerId) return;
  setLogColumnWidth(host, state.column, state.startWidth + event.clientX - state.startX,
    logAvailableWidth(event.currentTarget));
}

function endLogResize(host: VelairViewHost, event: PointerEvent): void {
  const state = logResizeState.get(host);
  if (!state || state.pointerId !== event.pointerId) return;
  logResizeState.delete(host);
  const target = event.currentTarget as Element;
  if (target.hasPointerCapture?.(event.pointerId)) {
    target.releasePointerCapture?.(event.pointerId);
  }
}

function keyboardLogResize(host: VelairViewHost, column: DiagnosticsLogColumn, event: KeyboardEvent): void {
  const columns = host._diagnosticsLogColumns ?? DEFAULT_DIAGNOSTICS_LOG_COLUMNS;
  const available = logAvailableWidth(event.currentTarget);
  let requested: number | undefined;
  if (event.key === "ArrowLeft") requested = columns[column] - (event.shiftKey ? 25 : 10);
  if (event.key === "ArrowRight") requested = columns[column] + (event.shiftKey ? 25 : 10);
  if (event.key === "Home") requested = MIN_DIAGNOSTICS_LOG_COLUMNS[column];
  if (event.key === "End") requested = diagnosticsLogColumnMaximum(columns, column, available);
  if (requested === undefined) return;
  event.preventDefault();
  setLogColumnWidth(host, column, requested, available);
}

function historyDescription(host: VelairViewHost, item: DiagnosticHistoryItem): string {
  const data = item.data;
  if (item.category === "room_assist") {
    return [
      data.direction ? host._modeLabel(String(data.direction)) : undefined,
      labeledValue(
        host._t("roomSensorAppliedTarget"),
        appliedTargetSummary(host, data, item.entity_id ?? ""),
      ),
      labeledTemperature(host, "roomSensorRoomTemperature", data.room_temperature, item.entity_id),
      labeledTemperature(host, "roomSensorClimateTemperature", data.climate_temperature, item.entity_id),
      diagnosticReasonLabel(host, data.reason),
    ].filter(Boolean).join(" · ");
  }
  if (item.category === "preconditioning") {
    return [
      data.direction ? host._modeLabel(String(data.direction)) : undefined,
      typeof data.lead_minutes === "number"
        ? host._t("preconditioningLeadTime", { minutes: formatNumber(host, data.lead_minutes) })
        : undefined,
      preconditioningModelLabel(host, data.model_source),
      scheduledTargetSummary(host, data, item.entity_id ?? ""),
      diagnosticReasonLabel(host, data.reason),
    ].filter(Boolean).join(" · ");
  }
  if (item.category === "comfort") {
    return [
      comfortStateLabel(host, data.condition),
      comfortAirQualityLabel(host, data.air_quality),
      comfortDataQualityLabel(host, data.data_quality),
    ].filter(Boolean).join(" · ");
  }
  if (item.category === "availability") {
    return [runtimeStateLabel(host, data.state)].filter(Boolean).join(" · ");
  }
  if (item.category === "control") {
    if (data.event === "external_climate_change_detected") {
      return externalAdjustmentDescription(host, item);
    }
    if (data.event === "zone_control_changed") {
      return zoneControlDescription(host, item);
    }
    return [
      data.hvac_mode ? host._modeLabel(String(data.hvac_mode)) : undefined,
      diagnosticControlEventLabel(host, data.action ?? data.operation),
      scheduledTargetSummary(host, data, item.entity_id ?? ""),
      diagnosticReasonLabel(host, data.reason),
    ].filter(Boolean).join(" · ");
  }
  const evidence = data.reason
    ? diagnosticReasonLabel(host, data.reason)
    : data.error ? humanizeIdentifier(data.error)
      : data.state ? runtimeStateLabel(host, data.state) : undefined;
  return [evidence].filter(Boolean).join(" · ");
}

function labeledValue(label: string, value: string | undefined): string | undefined {
  return value ? `${label}: ${value}` : undefined;
}

function labeledTemperature(
  host: VelairViewHost,
  label: TranslationKey,
  value: unknown,
  entityId?: string | null,
): string | undefined {
  return typeof value === "number"
    ? `${host._t(label)}: ${host._formatTemperature(value, entityId ?? undefined)}`
    : undefined;
}

function meaningfulRows(rows: DetailRow[]): DetailRow[] {
  return rows.filter((row) => row.value !== undefined && row.value !== null && row.value !== "");
}

function record(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function displayValue(host: VelairViewHost, value: unknown): string { return typeof value === "boolean" ? host._t(value ? "diagnosticsOn" : "diagnosticsOff") : typeof value === "number" ? formatNumber(host, value) : String(value); }
function formatDiagnosticTimestamp(host: VelairViewHost, value: string): string {
  return formatDiagnosticDateTime(
    value,
    dateLocale(host._language()),
    host.hass?.locale?.time_format,
  );
}
function temperatureValue(host: VelairViewHost, entityId: string, value: unknown): string | undefined { return typeof value === "number" ? host._formatTemperature(value, entityId) : undefined; }
function rangeValue(host: VelairViewHost, entityId: string, minimum: unknown, maximum: unknown): string | undefined { return typeof minimum === "number" && typeof maximum === "number" ? `${host._formatTemperature(minimum, entityId)} – ${host._formatTemperature(maximum, entityId)}` : undefined; }
function intentSummary(host: VelairViewHost, value: unknown, entityId: string): string | undefined { const item = record(value); return [controlModeLabel(host, item.control_mode), runtimeStateLabel(host, item.state), item.hvac_mode ? host._modeLabel(String(item.hvac_mode)) : undefined, scheduledTargetSummary(host, item, entityId)].filter(Boolean).join(" · ") || undefined; }
function applicationSummary(host: VelairViewHost, value: unknown, entityId: string): string | undefined { const item = record(value); return [item.at ? host._formatDateTime(String(item.at)) : undefined, item.hvac_mode ? host._modeLabel(String(item.hvac_mode)) : undefined, scheduledTargetSummary(host, item, entityId)].filter(Boolean).join(" · ") || undefined; }
function scheduledTargetSummary(host: VelairViewHost, value: Record<string, any>, entityId: string): string | undefined {
  const scalar = value.temperature ?? value.target_temperature;
  if (typeof scalar === "number") return host._formatTemperature(scalar, entityId);
  return typeof value.target_temp_low === "number" && typeof value.target_temp_high === "number" ? `${host._formatTemperature(value.target_temp_low, entityId)} – ${host._formatTemperature(value.target_temp_high, entityId)}` : undefined;
}
function appliedTargetSummary(host: VelairViewHost, value: Record<string, any>, entityId: string): string | undefined {
  const scalar = value.applied_temperature ?? value.applied_target;
  if (typeof scalar === "number") return host._formatTemperature(scalar, entityId);
  return typeof value.applied_target_temp_low === "number" && typeof value.applied_target_temp_high === "number" ? `${host._formatTemperature(value.applied_target_temp_low, entityId)} – ${host._formatTemperature(value.applied_target_temp_high, entityId)}` : undefined;
}

function controlModeLabel(host: VelairViewHost, value: unknown): string | undefined {
  if (value === "manual") return host._t("diagnosticsControlManual");
  if (value === "automatic") return host._t("diagnosticsControlAutomatic");
  return undefined;
}

function manualPolicyLabel(
  host: VelairViewHost,
  value: unknown,
  durationMinutes?: unknown,
): string | undefined {
  if (value === "keep_automatic") return host._t("externalChangeKeepAutomatic");
  if (value === "until_next_block") return host._t("externalChangeUntilNextBlock");
  if (value === "for_duration") {
    return [
      host._t("externalChangeForDuration"),
      typeof durationMinutes === "number"
        ? host._t("manualSessionDuration", { minutes: durationMinutes })
        : undefined,
    ].filter(Boolean).join(" · ");
  }
  if (value === "until_resumed") return host._t("externalChangeUntilResumed");
  return undefined;
}

function externalAdjustmentDescription(host: VelairViewHost, item: DiagnosticHistoryItem): string {
  const data = item.data;
  const previous = record(data.previous);
  const current = record(data.current);
  const changed = new Set(Array.isArray(data.changed_fields) ? data.changed_fields.map(String) : []);
  const entityId = item.entity_id ?? "";
  const evidence: Array<string | undefined> = [];
  if (changed.has("hvac_mode") && previous.hvac_mode && current.hvac_mode) {
    evidence.push(host._t("diagnosticsHvacModeChanged", {
      previous: host._modeLabel(String(previous.hvac_mode)),
      current: host._modeLabel(String(current.hvac_mode)),
    }));
  }
  if (changed.has("temperature")
    && typeof previous.temperature === "number"
    && typeof current.temperature === "number") {
    evidence.push(host._t("diagnosticsTargetChanged", {
      previous: host._formatTemperature(previous.temperature, entityId),
      current: host._formatTemperature(current.temperature, entityId),
    }));
  }
  const lowerChanged = changed.has("target_temp_low");
  const upperChanged = changed.has("target_temp_high");
  if (lowerChanged || upperChanged) {
    const previousRange = rangeValue(
      host, entityId, previous.target_temp_low, previous.target_temp_high,
    );
    const currentRange = rangeValue(
      host, entityId, current.target_temp_low, current.target_temp_high,
    );
    if (previousRange && currentRange) {
      if (lowerChanged && upperChanged) evidence.push(host._t("diagnosticsRangeChanged", {
        previous: previousRange,
        current: currentRange,
      }));
    }
    if (!(lowerChanged && upperChanged && previousRange && currentRange)) {
      if (lowerChanged
        && typeof previous.target_temp_low === "number"
        && typeof current.target_temp_low === "number") {
        evidence.push(host._t("diagnosticsLowerTargetChanged", {
          previous: host._formatTemperature(previous.target_temp_low, entityId),
          current: host._formatTemperature(current.target_temp_low, entityId),
        }));
      }
      if (upperChanged
        && typeof previous.target_temp_high === "number"
        && typeof current.target_temp_high === "number") {
        evidence.push(host._t("diagnosticsUpperTargetChanged", {
          previous: host._formatTemperature(previous.target_temp_high, entityId),
          current: host._formatTemperature(current.target_temp_high, entityId),
        }));
      }
    }
  }
  evidence.push(manualPolicyLabel(host, data.policy, data.duration_minutes));
  return evidence.filter(Boolean).join(" · ");
}

function zoneControlDescription(host: VelairViewHost, item: DiagnosticHistoryItem): string {
  const data = item.data;
  const previous = controlModeLabel(host, data.previous_control_mode);
  const current = controlModeLabel(host, data.control_mode);
  return [
    previous && current ? host._t("diagnosticsControlChanged", { previous, current }) : current,
    manualPolicyLabel(host, data.policy, data.duration_minutes),
    data.until ? host._t("diagnosticsUntil", { time: host._formatDateTime(String(data.until)) }) : undefined,
    diagnosticReasonLabel(host, data.reason),
  ].filter(Boolean).join(" · ");
}
function overrideSummary(host: VelairViewHost, value: unknown): string | undefined {
  const item = record(value);
  const state = item.action ?? item.status;
  const stateLabel = state === "turn_off" ? host._t("diagnosticsOverrideTurnOff")
    : state === "none" ? host._t("diagnosticsNone")
      : state ? humanizeIdentifier(state) : undefined;
  return stateLabel ?? (item.expires_at ? host._formatDateTime(String(item.expires_at)) : undefined)
    ?? (Object.keys(item).length ? host._t("diagnosticsActive") : undefined);
}

function deliveryErrorLabel(host: VelairViewHost, value: unknown): string | undefined {
  const error = record(value);
  const code = String(error.code ?? "");
  const labels: Record<string, TranslationKey> = {
    exhausted: "diagnosticsDeliveryExhausted",
    failed: "diagnosticsDeliveryFailed",
    invalid_intent: "diagnosticsDeliveryInvalidIntent",
    retry_limit: "diagnosticsDeliveryExhausted",
    service_call_failed: "diagnosticsDeliveryFailed",
  };
  if (labels[code]) return host._t(labels[code]);
  if (code) return humanizeIdentifier(code);
  return Object.keys(error).length ? host._t("diagnosticsDeliveryFailed") : undefined;
}

function formatNumber(host: VelairViewHost, value: number): string {
  return new Intl.NumberFormat(host._language()).format(value);
}

function diagnosticStatusLabel(
  host: VelairViewHost,
  status: UnitDiagnostics["status"],
): string {
  const labels: Record<UnitDiagnostics["status"], TranslationKey> = {
    ok: "diagnosticsStatusHealthy",
    warning: "diagnosticsStatusWarning",
    error: "diagnosticsStatusError",
  };
  return host._t(labels[status]);
}

function diagnosticStatusDescription(
  host: VelairViewHost,
  unit: UnitDiagnostics,
): string {
  const status = diagnosticStatusLabel(host, unit.status);
  if (!unit.issues.length) return status;
  return host._t("diagnosticsStatusWithIssues", {
    status,
    issues: unit.issues.map((issue) => issueText(host, issue.code)).join("; "),
  });
}

function renderClimateIcon(host: VelairViewHost, entityId: string) {
  const stateObj = host.hass?.states?.[entityId];
  return stateObj
    ? html`<ha-state-icon class="diagnostics-climate-icon" .hass=${host.hass} .stateObj=${stateObj}></ha-state-icon>`
    : html`<ha-icon class="diagnostics-climate-icon" icon="mdi:thermostat"></ha-icon>`;
}

function sensorValue(
  host: VelairViewHost,
  sensor: UnitDiagnostics["sensors"][number],
): string | undefined {
  const stateLabel = runtimeStateLabel(host, sensor.state);
  if (["unknown", "unavailable"].includes(sensor.state)) return stateLabel;
  const numeric = Number(sensor.state);
  if (!Number.isFinite(numeric)) return stateLabel;
  const state = host.hass?.states?.[sensor.entity_id];
  const reportedUnit = state?.attributes?.unit_of_measurement;
  const fallbackUnit = sensor.purpose === "comfort_humidity" ? "%"
    : sensor.purpose === "comfort_co2" ? "ppm"
      : sensor.purpose.includes("temperature") ? host._temperatureUnit(sensor.entity_id) : undefined;
  const unit = reportedUnit ?? fallbackUnit;
  const localizedValue = formatNumber(host, numeric);
  return unit ? `${localizedValue} ${unit}` : localizedValue;
}

function runtimeStateLabel(host: VelairViewHost, value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === "unavailable") return host._t("roomSensorStatusUnavailable");
  if (value === "unknown") return host._t("diagnosticsEntityUnknown");
  if (value === "missing") return host._t("entityDiagnosticMissing");
  if (value === "stopped") return host._t("diagnosticsReasonStopped");
  if (value === "hold") return host._t("overviewZoneHold");
  if (["idle", "override_active", "paused", "scheduled"].includes(String(value))) {
    return host._schedulerStatusLabel(String(value));
  }
  return host._modeLabel(String(value));
}

function scheduleSourceLabel(host: VelairViewHost, value: unknown): string | undefined {
  if (value === "default") return host._t("defaultSchedules");
  if (value === "profile") return host._t("profileSchedules");
  if (value === "profile_pause") return host._t("diagnosticsScheduleSourceProfilePause");
  return value ? humanizeIdentifier(value) : undefined;
}

function humanizeIdentifier(value: unknown): string | undefined {
  if (!value) return undefined;
  const text = String(value).replace(/[_-]+/g, " ").trim();
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : undefined;
}

function diagnosticReasonLabel(host: VelairViewHost, value: unknown): string | undefined {
  const keys: Record<string, TranslationKey> = {
    assist_disabled: "diagnosticsReasonAssistDisabled",
    boost_started: "diagnosticsEventBoostStarted",
    cancelled: "operationCancelled",
    current_schedule: "diagnosticsReasonCurrentSchedule",
    data_reset: "diagnosticsReasonDataReset",
    expired: "diagnosticsReasonExpired",
    manual: "diagnosticsReasonManual",
    manual_target: "diagnosticsReasonManualTarget",
    missing_target: "diagnosticsReasonMissingTarget",
    missing_target_step: "diagnosticsReasonMissingTargetStep",
    missing_temperature: "diagnosticsReasonMissingTemperature",
    no_active_target: "diagnosticsReasonNoActiveTarget",
    no_longer_planned: "diagnosticsReasonNoLongerPlanned",
    not_auto: "diagnosticsReasonSchedulerNotAuto",
    portable_import: "diagnosticsReasonPortableImport",
    profile_changed: "diagnosticsEventProfileChanged",
    replaced: "diagnosticsReasonReplaced",
    resumed: "diagnosticsReasonResumed",
    schedule_changed: "diagnosticsReasonScheduleChanged",
    schedule_cleared: "diagnosticsReasonScheduleCleared",
    scheduler_mode_changed: "diagnosticsEventSchedulerModeChanged",
    scheduler_not_auto: "diagnosticsReasonSchedulerNotAuto",
    scheduler_stopped: "diagnosticsReasonSchedulerStopped",
    settings_updated: "diagnosticsReasonSettingsUpdated",
    stopped: "diagnosticsReasonStopped",
    temperature_migration: "diagnosticsReasonTemperatureMigration",
    turn_off: "diagnosticsOverrideTurnOff",
    unsupported_mode: "diagnosticsReasonUnsupportedMode",
    unsupported_temperature_range: "diagnosticsReasonUnsupportedTemperatureRange",
    zone_paused: "diagnosticsEventZonePaused",
    zone_unavailable: "diagnosticsReasonZoneUnavailable",
  };
  const reason = String(value ?? "");
  return keys[reason] ? host._t(keys[reason]) : humanizeIdentifier(reason);
}

function diagnosticControlEventLabel(host: VelairViewHost, value: unknown): string | undefined {
  const keys: Record<string, TranslationKey> = {
    added: "diagnosticsOperationAdded",
    boost_ended: "diagnosticsEventBoostEnded",
    boost_started: "diagnosticsEventBoostStarted",
    climate_target_applied: "diagnosticsEventClimateTargetApplied",
    external_climate_change_detected: "diagnosticsEventExternalAdjustment",
    comfort_assessment_changed: "diagnosticsEventComfortAssessmentChanged",
    none: "diagnosticsNone",
    preconditioning_observation_recorded: "diagnosticsEventPreconditioningObservationRecorded",
    preconditioning_plan_cancelled: "diagnosticsEventPreconditioningPlanCancelled",
    preconditioning_plan_updated: "diagnosticsEventPreconditioningPlanUpdated",
    profile_changed: "diagnosticsEventProfileChanged",
    removed: "diagnosticsOperationRemoved",
    room_sensor_assist_restored: "diagnosticsEventRoomAssistRestored",
    room_sensor_assist_state_changed: "diagnosticsEventRoomAssistStateChanged",
    room_sensor_assist_updated: "diagnosticsEventRoomAssistUpdated",
    scheduler_mode_changed: "diagnosticsEventSchedulerModeChanged",
    set_temperature: "diagnosticsOperationSetTemperature",
    turn_off: "diagnosticsOverrideTurnOff",
    updated: "diagnosticsOperationUpdated",
    zone_pause_added: "diagnosticsEventZonePauseAdded",
    zone_pause_removed: "diagnosticsEventZonePauseRemoved",
    zone_pause_updated: "diagnosticsEventZonePauseUpdated",
    zone_paused: "diagnosticsEventZonePaused",
    zone_resumed: "diagnosticsEventZoneResumed",
    zone_control_changed: "diagnosticsEventZoneControlChanged",
  };
  const event = String(value ?? "");
  return keys[event] ? host._t(keys[event]) : humanizeIdentifier(event);
}

function deliveryStatusLabel(host: VelairViewHost, value: unknown): string | undefined {
  const status = String(value ?? "");
  const labels: Record<string, TranslationKey> = {
    cancelled: "operationCancelled",
    exhausted: "diagnosticsDeliveryExhausted",
    failed: "diagnosticsDeliveryFailed",
    idle: "roomSensorStatusIdle",
    invalid_intent: "diagnosticsDeliveryInvalidIntent",
    retrying: "diagnosticsDeliveryRetrying",
    success: "diagnosticsDeliverySuccess",
    unavailable: "diagnosticsEntityUnavailable",
  };
  return labels[status] ? host._t(labels[status]) : humanizeIdentifier(status);
}

function sensorPurposeLabel(purpose: string): TranslationKey {
  const labels: Record<string, TranslationKey> = {
    comfort_co2: "comfortCo2Sensor",
    comfort_humidity: "comfortHumiditySensor",
    comfort_temperature: "comfortTemperatureSensor",
    outdoor_temperature: "preconditioningOutdoorTemperatureEntity",
    room_temperature: "roomSensorTemperatureEntity",
  };
  return labels[purpose] ?? "diagnosticsAssociatedSensors";
}

function sensorPurposeIcon(purpose: string): string {
  if (purpose === "comfort_humidity") return "mdi:water-percent";
  if (purpose === "comfort_co2") return "mdi:molecule-co2";
  if (purpose === "outdoor_temperature") return "mdi:thermometer-chevron-down";
  return "mdi:thermometer";
}

function historyEventLabel(host: VelairViewHost, item: DiagnosticHistoryItem): string {
  if (item.category === "delivery") {
    return deliveryStatusLabel(host, item.data.status) ?? host._t(categoryLabel(item.category));
  }
  if (item.data.event) {
    return diagnosticControlEventLabel(host, item.data.event)
      ?? host._t(categoryLabel(item.category));
  }
  return host._t(categoryLabel(item.category));
}

function roomAssistStateLabel(host: VelairViewHost, value: unknown): string | undefined {
  const keys: Record<string, TranslationKey> = {
    assisting: "roomSensorStatusAssisting",
    blocked: "roomSensorStatusBlocked",
    disabled: "roomSensorStatusDisabled",
    holding: "roomSensorStatusHolding",
    idle: "roomSensorStatusIdle",
    not_configured: "roomSensorStatusNotConfigured",
    ready: "roomSensorStatusReady",
    unavailable: "roomSensorStatusUnavailable",
  };
  const state = String(value ?? "");
  return keys[state] ? host._t(keys[state]) : humanizeIdentifier(state);
}

function comfortStateLabel(host: VelairViewHost, value: unknown): string | undefined {
  const keys: Record<string, TranslationKey> = {
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
  const state = String(value ?? "");
  return keys[state] ? host._t(keys[state]) : humanizeIdentifier(state);
}

function comfortAirQualityLabel(host: VelairViewHost, value: unknown): string | undefined {
  const keys: Record<string, TranslationKey> = {
    elevated: "comfortAirQualityElevated",
    good: "comfortAirQualityGood",
    poor: "comfortAirQualityPoor",
    unavailable: "comfortAirQualityUnavailable",
  };
  const state = String(value ?? "");
  return keys[state] ? host._t(keys[state]) : humanizeIdentifier(state);
}

function comfortDataQualityLabel(host: VelairViewHost, value: unknown): string | undefined {
  const keys: Record<string, TranslationKey> = {
    partial: "comfortDataPartial",
    stale: "comfortDataStale",
    unavailable: "comfortDataUnavailable",
  };
  const state = String(value ?? "");
  if (state === "complete") return host._t("comfortCurrentReadings");
  return keys[state] ? host._t(keys[state]) : humanizeIdentifier(state);
}

function preconditioningModelLabel(host: VelairViewHost, value: unknown): string | undefined {
  if (value === "history") return host._t("preconditioningModelHistory");
  if (value === "initial_model" || value === "initial") {
    return host._t("preconditioningModelInitial");
  }
  return humanizeIdentifier(value);
}

function categoryLabel(category: DiagnosticHistoryCategory): TranslationKey {
  return `diagnosticsHistoryCategory${category.replace(/(^|_)(\w)/g, (_, _prefix, letter) => letter.toUpperCase())}` as TranslationKey;
}
function categoryDescription(category: DiagnosticHistoryCategory): TranslationKey { return `${categoryLabel(category)}Description` as TranslationKey; }

async function updateHistoryCategory(host: VelairViewHost, diagnostics: DiagnosticsSnapshot, category: DiagnosticHistoryCategory, enabled: boolean): Promise<void> {
  if (!host.hass || host._diagnosticsHistorySaving) return;
  const enabledCategories = HISTORY_CATEGORIES.filter((item) => item === category ? enabled : diagnostics.history_policy.categories[item]);
  host._diagnosticsHistorySaving = true; host.requestUpdate();
  try { host._applyDiagnosticsSnapshot(await new VelairApiClient(host.hass).updateDiagnosticsHistory(enabledCategories)); }
  catch { host._error = host._t("diagnosticsHistoryUpdateError"); }
  finally { host._diagnosticsHistorySaving = false; host.requestUpdate(); }
}

async function clearHistory(host: VelairViewHost): Promise<void> {
  if (!host.hass || host._diagnosticsHistorySaving) return;
  host._diagnosticsHistorySaving = true; host.requestUpdate();
  try { host._applyDiagnosticsSnapshot(await new VelairApiClient(host.hass).clearDiagnosticsHistory()); }
  catch { host._error = host._t("diagnosticsHistoryClearError"); }
  finally { host._diagnosticsHistorySaving = false; host.requestUpdate(); }
}

async function downloadReport(host: VelairViewHost): Promise<void> {
  if (!host.hass) return;
  try {
    host._error = undefined;
    const report = await new VelairApiClient(host.hass).exportDiagnostics(host._diagnosticsRedactEntityIds);
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url;
    anchor.download = `velair-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.style.display = "none";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    closeExportPanel(host);
  } catch { host._error = host._t("diagnosticsExportError"); host.requestUpdate(); }
}

function toggleExportPanel(host: VelairViewHost): void {
  if (host._diagnosticsExportOpen) closeExportPanel(host);
  else { host._diagnosticsExportOpen = true; host.requestUpdate(); }
}

function closeExportPanel(host: VelairViewHost): void {
  host._diagnosticsExportOpen = false;
  host._diagnosticsRedactEntityIds = true;
  host.requestUpdate();
}
