import { html, nothing } from "lit";
import { VELAIR_FRONTEND_BUILD, VELAIR_RELEASE_VERSION } from "../build-info";
import {
  DEFAULT_EXTERNAL_CHANGE_DURATION_MINUTES,
  PORTABLE_MODEL_VERSION,
  PORTABLE_SECTIONS,
  WEEKDAYS,
} from "../constants";
import { unmatchedPreconditioningLearningEntities } from "../domain/portable";
import type { VelairViewHost } from "../host-types";
import { renderInlineHelp } from "./inline-help";
import type { PortableSection } from "../types";

type SettingsViewHost = VelairViewHost;

export function renderSettingsView(host: SettingsViewHost, zoneIds: string[]) {
  const firstWeekday = host._firstWeekday();
  const applyOnStartup = Boolean(host._data?.settings?.apply_active_schedule_on_startup);

  return html`
    <section class="settings-view">
      ${renderTemperatureUnitSettings(host)}

      <label class="settings-field">
        <span class="label">${host._t("firstWeekday")}</span>
        <span class="select-wrap">
          <select
            .value=${firstWeekday}
            value=${firstWeekday}
            @change=${(event: Event) => host._updateSettingsFirstWeekday(host._inputValue(event))}
          >
            ${WEEKDAYS.map(
              (weekday: string) => html`
                <option value=${weekday} ?selected=${weekday === firstWeekday}>
                  ${host._weekdayName(weekday)}
                </option>
              `,
            )}
          </select>
        </span>
      </label>

      <section class="settings-startup">
        <ha-icon class="settings-startup-icon" icon="mdi:home-clock"></ha-icon>
        <div class="settings-startup-copy">
          <span class="section-label">${host._t("applyScheduleOnStartup")}</span>
          <p>${host._t("applyScheduleOnStartupDescription")}</p>
        </div>
        <ha-switch
          .checked=${applyOnStartup}
          ?disabled=${host._settingsSaving}
          @change=${(event: Event) =>
            host._saveSettings({
              apply_active_schedule_on_startup: Boolean((event.target as HTMLInputElement).checked),
            })}
        ></ha-switch>
      </section>

      ${renderPortabilitySettings(host)}

      <section class="settings-zone-order">
        <div class="section-heading">
          <ha-icon icon="mdi:sort"></ha-icon>
          <div>
            <span class="section-label">${host._t("zoneOrder")}</span>
            <p>${host._t("reorderZones")}</p>
          </div>
        </div>
        <div class="settings-zone-list">
          ${zoneIds.length
            ? zoneIds.map((entityId, index) => renderSettingsZoneOrderRow(host, entityId, index, zoneIds.length))
            : html`<span class="empty">${host._t("noManagedEntities")}</span>`}
        </div>
      </section>

      ${renderMaintenanceSettings(host)}
    </section>
  `;
}

export function renderTemperatureUnitSettings(host: SettingsViewHost) {
  const migrationRequired = Boolean(host._data?.temperature_migration?.required);
  const unit = host._data?.home_assistant_temperature_unit ?? host._temperatureUnit();
  const migration = host._data?.temperature_migration;
  const legacyResetRequired = migration?.reason === "legacy_celsius_upgrade_reset_required";
  const sourceUnit = migration?.source_unit;
  const targetUnit = migration?.target_unit ?? unit;
  return html`
    <section class=${migrationRequired ? "settings-temperature migration-required" : "settings-temperature"}>
      <ha-icon class="settings-startup-icon" icon="mdi:thermometer-lines"></ha-icon>
      <div class="settings-temperature-copy">
        <span class="section-label">${host._t("temperatureUnit")}</span>
        <p>${host._t("temperatureUnitManagedByHomeAssistant")}</p>
        ${migrationRequired
          ? html`
              <div class="temperature-migration-action" role="alert">
                <strong>${legacyResetRequired
                  ? host._t("temperatureLegacyResetQuestion", { target: targetUnit })
                  : host._t("temperatureMigrationQuestion", { source: sourceUnit ?? "?", target: targetUnit })}</strong>
                <p>${legacyResetRequired
                  ? host._t("temperatureLegacyResetExplanation", { target: targetUnit })
                  : host._t("temperatureMigrationExplanation", { source: sourceUnit ?? "?", target: targetUnit })}</p>
                <div class="temperature-migration-buttons">
                  ${legacyResetRequired
                    ? html`
                      <button
                        class="command-button danger"
                        type="button"
                        ?disabled=${host._maintenanceAction === "reset"}
                        @click=${() => host._resetVelairData()}
                      >
                        ${host._maintenanceAction === "reset"
                          ? host._t("resetting")
                          : host._t("resetVelair")}
                      </button>
                    `
                    : sourceUnit
                    ? html`
                      <button
                        class="command-button primary"
                        type="button"
                        ?disabled=${Boolean(host._temperatureMigrationAction)}
                        @click=${() => host._resolveTemperatureMigration(sourceUnit)}
                      >
                        ${host._temperatureMigrationAction === sourceUnit
                          ? host._t("applying")
                          : host._t("temperatureMigrationUse", { source: sourceUnit, target: targetUnit })}
                      </button>
                    `
                    : nothing}
                </div>
              </div>
            `
          : nothing}
      </div>
      <strong class="settings-temperature-value">${unit}</strong>
    </section>
  `;
}

export function renderMaintenanceSettings(host: SettingsViewHost) {
  const versions = host._data?.versions ?? {};
  const portableVersion = versions.portable_model ?? PORTABLE_MODEL_VERSION;
  const storageVersion = versions.storage ?? 1;
  const modelVersion = versions.model ?? 1;
  const integrationVersion = VELAIR_RELEASE_VERSION || versions.integration || "-";
  const resetting = host._maintenanceAction === "reset";
  const migrationRequired = Boolean(host._data?.temperature_migration?.required);
  const legacyResetRequired = host._data?.temperature_migration?.reason === "legacy_celsius_upgrade_reset_required";

  return html`
    <section class="settings-maintenance">
      <div class="settings-portability-heading">
        <ha-icon class="settings-startup-icon" icon="mdi:wrench-clock"></ha-icon>
        <div>
          <span class="section-label">${host._t("maintenance")}</span>
          <p>${host._t("maintenanceDescription")}</p>
        </div>
      </div>

      <div class="maintenance-grid">
        ${renderMaintenanceItem(host._t("frontendBuild"), VELAIR_FRONTEND_BUILD)}
        ${renderMaintenanceItem(host._t("portableFormatVersion"), `v${portableVersion}`)}
        ${renderMaintenanceItem(host._t("internalStorageVersion"), `v${storageVersion} / v${modelVersion}`)}
        ${renderMaintenanceItem(host._t("integrationVersion"), integrationVersion)}
      </div>
    </section>

    <section class="settings-reset">
      <ha-icon class="settings-reset-icon" icon="mdi:delete-alert-outline"></ha-icon>
      <div class="settings-reset-copy">
        <span class="section-label">${host._t("resetVelair")}</span>
        <p>${host._t("resetVelairDescription")}</p>
      </div>
      <button
        class="command-button danger"
        type="button"
        ?disabled=${resetting || (migrationRequired && !legacyResetRequired)}
        @click=${() => host._resetVelairData()}
      >
        <ha-icon icon="mdi:restore"></ha-icon>
        <span>${resetting ? host._t("resetting") : host._t("resetVelair")}</span>
      </button>
    </section>
  `;
}

export function renderMaintenanceItem(label: string, value: string | number) {
  return html`
    <div class="maintenance-item">
      <span class="label">${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

export function renderPortabilitySettings(host: SettingsViewHost) {
  const importSections = host._importAvailableSections();
  const canExport = host._exportSections.size > 0
    && !host._portabilityAction;
  const canImport = Boolean(host._importPayload) && host._importSections.size > 0 && !host._portabilityAction;
  const exportItems = new Map(host._portableExportSummaryItems().map((item) => [item.section, item]));
  const importItems = new Map(host._portableImportSummaryItems().map((item) => [item.section, item]));
  const unmatchedLearningEntities = host._importSections.has("preconditioning_learning")
    ? unmatchedPreconditioningLearningEntities(
        host._importPayload,
        host._data?.configured_entities ?? [],
      )
    : [];
  const legacyTemperatureUnit = Boolean(
    host._importPayload && host._importPayload.temperature_unit === undefined,
  );

  return html`
    <section class="settings-portability">
      <div class="settings-portability-heading">
        <ha-icon class="settings-startup-icon" icon="mdi:file-sync-outline"></ha-icon>
        <div>
          <span class="section-label">${host._t("portability")}</span>
          <p>${host._t("portabilityDescription")}</p>
        </div>
      </div>

      <div class="portability-grid">
        <div class="portability-card portability-export-card">
          <div class="portability-options">
            ${PORTABLE_SECTIONS.map((section) =>
              renderPortableSectionOption(
                host,
                "export",
                section,
                host._exportSections.has(section),
                false,
                exportItems.get(section),
              ),
            )}
          </div>
          <button
            class="command-button primary"
            type="button"
            ?disabled=${!canExport}
            @click=${() => host._exportPortableData()}
          >
            <ha-icon icon="mdi:download"></ha-icon>
            <span>${host._portabilityAction === "export" ? host._t("saving") : host._t("exportData")}</span>
          </button>
        </div>

        <div class="portability-card">
          <label class="portable-file-field">
            <span class="label">${host._t("importFile")}</span>
            <span class="portable-file-control">
              <input
                type="file"
                accept="application/json,.json"
                ?disabled=${Boolean(host._portabilityAction)}
                @change=${(event: Event) => host._handlePortableImportFile(event)}
              />
              <span class="portable-file-button">${host._t("chooseFile")}</span>
              <span class="portable-file-name">${host._importFileName || host._t("noFileSelected")}</span>
            </span>
          </label>
          ${host._importFileName
            ? html`<span class="empty">${host._t("portabilityFileReady", { file: host._importFileName })}</span>`
            : nothing}
          ${host._importPayload
            ? html`
                <div class="portable-warning" role="alert">
                  <ha-icon icon="mdi:alert-outline"></ha-icon>
                  <span>${host._t("importOverwriteWarning")}</span>
                </div>
              `
            : nothing}
          ${legacyTemperatureUnit
            ? html`
                <div class="portable-warning" role="status">
                  <ha-icon icon="mdi:thermometer-alert"></ha-icon>
                  <span>${host._t("legacyImportTemperatureUnit", {
                    target: host._data?.home_assistant_temperature_unit
                      ?? host._temperatureUnit(),
                  })}</span>
                </div>
              `
            : nothing}
          ${unmatchedLearningEntities.length
            ? html`
                <div class="portable-warning" role="alert">
                  <ha-icon icon="mdi:thermometer-alert"></ha-icon>
                  <span>
                    ${host._t("preconditioningImportSkipped", {
                      count: unmatchedLearningEntities.length,
                      entities: unmatchedLearningEntities.join(", "),
                    })}
                  </span>
                </div>
              `
            : nothing}
          <div class="portability-options">
            ${importSections.length
              ? importSections.map((section: PortableSection) =>
                  renderPortableSectionOption(
                    host,
                    "import",
                    section,
                    host._importSections.has(section),
                    false,
                    importItems.get(section),
                  ),
                )
              : html`<span class="empty">${host._t("noImportSections")}</span>`}
          </div>
          <button
            class="command-button success"
            type="button"
            ?disabled=${!canImport}
            @click=${() => host._importPortableData()}
          >
            <ha-icon icon="mdi:upload"></ha-icon>
            <span>${host._portabilityAction === "import" ? host._t("applying") : host._t("importData")}</span>
          </button>
        </div>
      </div>
    </section>
  `;
}

export function renderPortableSectionOption(
  host: SettingsViewHost,
  target: "export" | "import",
  section: PortableSection,
  checked: boolean,
  disabled: boolean,
  item?: { label: string; title: string; value: string | number },
) {
  return html`
    <label class="portable-option" title=${item?.title ?? host._portableSectionLabel(section)}>
      <input
        type="checkbox"
        .checked=${checked}
        ?disabled=${disabled || Boolean(host._portabilityAction)}
        @change=${(event: Event) =>
          host._togglePortableSection(target, section, Boolean((event.currentTarget as HTMLInputElement).checked))}
      />
      ${item && typeof item.value === "number"
        ? html`<strong>${item.value}</strong>`
        : nothing}
      <span>${item?.label ?? host._portableSectionLabel(section)}</span>
    </label>
  `;
}

export function renderSettingsZoneOrderRow(
  host: SettingsViewHost,
  entityId: string,
  index: number,
  total: number,
) {
  return html`
    <div
      class="settings-zone-row"
      @dragover=${(event: DragEvent) => host._handleSettingsZoneDragOver(event)}
      @drop=${(event: DragEvent) => host._handleSettingsZoneDrop(entityId, event)}
      @dragend=${host._handleSettingsZoneDragEnd}
    >
      <button
        class="settings-drag-handle"
        type="button"
        title=${host._t("reorderZones")}
        aria-label=${host._t("reorderZones")}
        draggable="true"
        @dragstart=${(event: DragEvent) => host._handleSettingsZoneDragStart(entityId, event)}
        @dragend=${host._handleSettingsZoneDragEnd}
      >
        <ha-icon icon="mdi:drag"></ha-icon>
      </button>
      <div class="settings-zone-main">
        <div class="settings-zone-identity">
          <div class="settings-zone-title">
            <strong title=${host._friendlyEntityName(entityId)}>${host._friendlyEntityName(entityId)}</strong>
          </div>
          <span>${entityId}</span>
        </div>
        ${renderSettingsExternalChangePolicy(host, entityId)}
      </div>
      <div class="settings-row-actions">
        <button
          class="icon-button"
          type="button"
          title=${host._t("moveUp")}
          ?disabled=${index === 0}
          @click=${() => host._moveSettingsZone(entityId, -1)}
        >
          <ha-icon icon="mdi:chevron-up"></ha-icon>
        </button>
        <button
          class="icon-button"
          type="button"
          title=${host._t("moveDown")}
          ?disabled=${index === total - 1}
          @click=${() => host._moveSettingsZone(entityId, 1)}
        >
          <ha-icon icon="mdi:chevron-down"></ha-icon>
        </button>
      </div>
    </div>
  `;
}

export function renderSettingsExternalChangePolicy(host: SettingsViewHost, entityId: string) {
  const policy = host._data?.zones[entityId]?.external_change_policy ?? {
    action: "keep_automatic" as const,
    duration_minutes: DEFAULT_EXTERNAL_CHANGE_DURATION_MINUTES,
  };
  const key = entityId.replace(/[^a-z0-9_-]/gi, "-");
  const labelId = `external-adjustment-label-${key}`;
  const helpId = `external-adjustment-info-${key}`;
  return html`
    <div class="settings-external-policy">
      <div class="settings-policy-heading">
        <span class="label" id=${labelId}>${host._t("externalChangePolicy")}</span>
        ${renderInlineHelp(
          helpId,
          host._t("externalAdjustmentInfoAction"),
          host._t("externalChangePolicyDescription"),
        )}
      </div>
      <div class="settings-policy-controls">
        <span class="select-wrap">
          <select
            aria-labelledby=${labelId}
            .value=${policy.action}
            ?disabled=${host._settingsSaving}
            @change=${(event: Event) => host._saveExternalChangePolicy(entityId, {
              ...policy,
              action: (event.target as HTMLSelectElement).value as typeof policy.action,
            })}
          >
            <option value="keep_automatic">${host._t("externalChangeKeepAutomatic")}</option>
            <option value="until_next_block">${host._t("externalChangeUntilNextBlock")}</option>
            <option value="for_duration">${host._t("externalChangeForDuration")}</option>
            <option value="until_resumed">${host._t("externalChangeUntilResumed")}</option>
          </select>
        </span>
        ${policy.action === "for_duration" ? html`
          <label class="settings-policy-duration">
            <input
              type="number"
              min="1"
              max="10080"
              aria-label=${host._t("durationMinutes")}
              .value=${String(policy.duration_minutes ?? DEFAULT_EXTERNAL_CHANGE_DURATION_MINUTES)}
              ?disabled=${host._settingsSaving}
              @change=${(event: Event) => host._saveExternalChangePolicy(entityId, {
                ...policy,
                duration_minutes: Math.max(
                  1,
                  Math.min(
                    10080,
                    Number((event.target as HTMLInputElement).value)
                      || DEFAULT_EXTERNAL_CHANGE_DURATION_MINUTES,
                  ),
                ),
              })}
            />
            <span>${host._t("minutesShort")}</span>
          </label>
        ` : nothing}
      </div>
    </div>
  `;
}
