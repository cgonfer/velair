import { html, nothing } from "lit";
import { VELAIR_LOADING_ICON_URL } from "../constants";
import type { VelairViewHost } from "../host-types";
import type {
  ComfortAssessment,
  DerivedComfortMetric,
  RoomSensorAssistStatus,
  ScheduleEvent,
  ZoneRuntimeStatus,
} from "../types";
import type { TranslationKey } from "../translations";
import {
  climateCardAction,
  climateCardActionIcon,
  climateCardModeIcon,
  climateCardOwner,
  climateCardWindows,
  comfortAccent,
  numericEntityState,
} from "../domain/climate-card";
import {
  activeClimateProfileZoneEffect,
  climateProfileAccentColor,
  effectiveClimateSchedule,
} from "../domain/climate-profiles";
import { todayWeekday } from "../controllers/overview-data";
import { timelineNowMarker } from "../domain/timeline";
import { convertAbsoluteTemperature } from "../domain/temperature-units";
import {
  DERIVED_COMFORT_METRIC_ORDER,
  formatComfortAbsoluteHumidity,
  humidexPerceivedHeatDelta,
} from "../domain/comfort";
import { renderOverviewTimelineTrack } from "./overview-view";
import { preconditioningSettings } from "../domain/preconditioning";
import { hasRoomAssistScheduledTarget } from "../domain/room-assist";
import { climateSupportsRangeTarget, climateSupportsSingleTarget } from "../domain/climate";
import { renderRoomAssistTemperatureScale } from "./sensors-view";
import { validClimateCardActionColor, validClimateCardActionIcon } from "../domain/climate-card-menu";
import {
  climateCardEligibleActions,
  splitClimateCardActions,
  type ClimateCardEligibleAction,
} from "../domain/climate-card-actions";
import {
  climateCardPublishedHvacModes,
  climateCardPublishedTemperatureGrid,
  climateCardRuntimeBlocksThermostat,
  climateCardTarget,
  climateCardTargetPayload,
  type ClimateCardTargetField,
} from "../domain/climate-card-controls";
import {
  cancelHorizontalDrag,
  endHorizontalDrag,
  horizontalDragClickGuard,
  moveHorizontalDrag,
  startHorizontalDrag,
} from "../controllers/horizontal-drag-scroll";

export function renderClimateCard(host: VelairViewHost, entityId?: string) {
  if (!host._data || !entityId) {
    return html`<div class="climate-card-empty">${host._t("noManagedEntities")}</div>`;
  }
  const state = host.hass?.states?.[entityId];
  const attributes = state?.attributes;
  const action = climateCardAction(state);
  const mode = state?.state || "off";
  const owner = climateCardOwner(host._data, entityId);
  const runtime = host._data.zone_runtime?.[entityId];
  const external = host._data.external_execution?.zones[entityId];
  const externalSystem = host._data.external_execution?.systems.find(
    (system) => system.provider === external?.provider,
  );
  const profileEffect = activeClimateProfileZoneEffect(host._data, entityId);
  const configuredMode = host._data.modes?.find(
    (candidate) => candidate.key === (host._data?.active_mode_id ?? host._data?.mode_id),
  );
  const activeMode = profileEffect ? configuredMode : undefined;
  const available = Boolean(state && state.state !== "unavailable" && state.state !== "unknown");
  const operationUsesAction = !available || action === "off" || action !== mode;
  const operationIcon = operationUsesAction ? climateCardActionIcon(action) : climateCardModeIcon(mode);
  const operationLabel = operationUsesAction ? actionLabel(host, action) : host._modeLabel(mode);
  const showName = host._config.climate_show_name !== false;
  const showOperation = host._config.climate_show_operation !== false;

  return html`
    <section class=${`climate-card-view climate-action-${action} climate-mode-${mode}`}>
      ${host._config.climate_show_state_bar !== false ? html`<div class="climate-card-state-line" aria-hidden="true"></div>` : nothing}
      <header class="climate-card-header">
        ${showOperation ? html`<ha-icon
          class="climate-card-operation-icon"
          icon=${operationIcon}
          title=${operationLabel}
          aria-hidden="true"
        ></ha-icon>` : nothing}
        ${showName || showOperation ? html`<div class="climate-card-header-content">
          ${showName ? html`<div class="climate-card-title">
            <h2>${host._config.climate_name === undefined ? host._friendlyEntityName(entityId) : host._config.climate_name}</h2>
            <ha-icon
              class=${available ? "available" : "unavailable"}
              icon=${available ? "mdi:check-circle" : "mdi:alert-circle"}
              title=${host._t(available ? "climateCardAvailable" : "climateCardUnavailable")}
              role="img"
              aria-label=${host._t(available ? "climateCardAvailable" : "climateCardUnavailable")}
            ></ha-icon>
          </div>` : nothing}
          ${showOperation ? html`<div class="climate-card-operation">
            <strong>${operationLabel}</strong>
            ${available ? html`<small>${ownerLabel(host, owner)}${operationUsesAction && mode !== "off" ? html` · ${host._modeLabel(mode)}` : nothing}</small>` : nothing}
          </div>` : nothing}
        </div>` : nothing}
        <button
          class="climate-card-brand"
          type="button"
          title=${host._t("climateCardOpenVelair")}
          aria-label=${host._t("climateCardOpenVelair")}
          @click=${host._navigateToVelair}
        >
          <img src=${VELAIR_LOADING_ICON_URL} alt="" width="20" height="20">
          <span class="climate-card-brand-copy"><strong>Velair</strong><small>by cgonfer</small></span>
        </button>
      </header>

      ${renderThermostatControls(host, entityId, owner, available, runtime)}

      ${owner === "external"
        ? renderExternalOwner(host, entityId, externalSystem?.name ?? external?.provider, external)
        : html`
            ${renderCurrentState(host, entityId)}
            ${runtime?.state === "paused" || runtime?.state === "boost"
              ? renderRuntimeState(host, runtime)
              : nothing}
            ${host._config.climate_show_timeline !== false
              ? renderTimeline(host, entityId, profileEffect, activeMode)
              : nothing}
            ${renderFeatures(host, entityId)}
          `}
    </section>
  `;
}

function renderThermostatControls(
  host: VelairViewHost,
  entityId: string,
  owner: "automatic" | "manual" | "external",
  available: boolean,
  runtime?: Pick<ZoneRuntimeStatus, "state" | "pause_count" | "pause_ids" | "manual_pause" | "manual_adjustment_allowed" | "manual_adjustment_unavailable_reason">,
) {
  const showTarget = host._config.climate_show_target_control !== false && owner !== "external";
  const showMode = host._config.climate_show_hvac_mode_control !== false && owner !== "external";
  const showNative = host._config.climate_show_native_climate_link !== false;
  const showControlMode = host._config.climate_show_control_mode !== false;
  const state = host.hass?.states?.[entityId];
  const target = showTarget && state?.state !== "off" ? climateCardTarget(state) : undefined;
  const modes = showMode ? climateCardPublishedHvacModes(state) : [];
  const showAuthority = owner !== "external" && showControlMode;
  const showControlSurface = Boolean(target || modes.length || showNative);
  const actionPresentation = climateCardActionPresentation(host, owner, available, runtime);
  const showActions = host._config.climate_show_actions !== false && actionPresentation.visibleControls > 0;
  const boostPaneOpen = showActions
    && actionPresentation.actions.some((action) => action.type === "boost")
    && host._climateCardBoost?.entityId === entityId;
  const pausePaneOpen = showActions
    && actionPresentation.actions.some((action) => action.type === "pause")
    && host._climateCardPause?.entityId === entityId;
  const showControlPane = boostPaneOpen || pausePaneOpen || showControlSurface;
  const showToolbar = showAuthority || showActions;
  if (!showToolbar && !showControlPane) return nothing;

  const runtimeBlocked = climateCardRuntimeBlocksThermostat(owner, runtime);
  const thermostatPending = Boolean(host._climateCardThermostatAction);
  const authorityPending = Boolean(host._manualControlActions[entityId]);
  const busy = thermostatPending || authorityPending;
  const editable = owner === "manual" && available && !runtimeBlocked && !authorityPending;
  const temperatureUnit = host._temperatureUnit(entityId);
  const targetTempStep = host._entityTemperatureStep(entityId);
  const grid = climateCardPublishedTemperatureGrid(state, temperatureUnit, targetTempStep);
  const reason = thermostatControlReason(
    host,
    owner,
    available,
    runtime,
    runtimeBlocked,
    Boolean(target) && !grid,
  );
  const canEnterManual = owner === "automatic" && available && !runtimeBlocked
    && runtime?.manual_adjustment_allowed === true && !busy;
  const automaticDisabled = owner === "manual"
    && runtime?.manual_adjustment_unavailable_reason === "temperature_migration";
  const manualDisabled = owner === "automatic" && !canEnterManual;
  const reasonId = `climate-card-control-reason-${entityId.replace(/[^a-z0-9_-]/gi, "-")}`;

  return html`<section class=${`climate-card-thermostat-controls${showToolbar ? " has-toolbar" : ""}${showControlPane ? " has-pane" : ""}${showAuthority ? " has-authority" : ""}${showActions ? " has-actions" : ""}`} aria-label=${host._t("climateCardThermostatControls")}>
    ${showToolbar ? html`<div class="climate-card-control-toolbar">
      ${showAuthority ? html`<div class="climate-card-manual-control">
        <div class="climate-card-manual-segmented" role="group" aria-label=${host._t("velairControl")} aria-busy=${String(busy)}>
          <button type="button" aria-pressed=${String(owner === "automatic")} aria-disabled=${String(busy || automaticDisabled)}
            aria-describedby=${automaticDisabled && reason ? reasonId : nothing}
            @click=${() => { if (owner === "manual" && !busy && !automaticDisabled) void host._resumeAutomaticControl(entityId); }}>
            <ha-icon icon="mdi:calendar-clock" aria-hidden="true"></ha-icon><span>${host._t("overviewControlAutomatic")}</span>
          </button>
          <button type="button" aria-pressed=${String(owner === "manual")} aria-disabled=${String(busy || manualDisabled)}
            aria-describedby=${manualDisabled && reason ? reasonId : nothing}
            @click=${() => { if (owner === "automatic" && canEnterManual) void host._enterManualAdjustment(entityId); }}>
            <ha-icon icon="mdi:hand-back-right-outline" aria-hidden="true"></ha-icon><span>${host._t("overviewControlManual")}</span>
          </button>
        </div>
        ${reason ? html`<small class="climate-card-control-reason" id=${reasonId}>${reason}</small>` : nothing}
      </div>` : nothing}
      ${showActions ? renderActions(host, entityId, actionPresentation) : nothing}
    </div>` : nothing}
    ${boostPaneOpen
      ? renderBoostForm(host, entityId)
      : pausePaneOpen
        ? renderPauseForm(host, entityId)
        : showControlSurface ? html`<div class="climate-card-control-surface" aria-busy=${String(thermostatPending)}>
      ${modes.length ? renderModeControl(host, entityId, state?.state ?? "off", modes, editable, thermostatPending) : nothing}
      ${target?.kind === "single"
        ? renderTargetControl(host, entityId, "temperature", host._t("climateCardTargetTemperature"), target.temperature, editable, thermostatPending, temperatureUnit, targetTempStep)
        : target?.kind === "range"
          ? html`<div class="climate-card-range-controls">
            ${renderTargetControl(host, entityId, "target_temp_low", host._t("climateCardLowerTarget"), target.low, editable, thermostatPending, temperatureUnit, targetTempStep)}
            ${renderTargetControl(host, entityId, "target_temp_high", host._t("climateCardUpperTarget"), target.high, editable, thermostatPending, temperatureUnit, targetTempStep)}
          </div>`
          : nothing}
      ${showNative ? html`<button class="climate-card-native-link" type="button"
        title=${host._t("climateCardOpenInHomeAssistant")} aria-label=${host._t("climateCardOpenInHomeAssistant")}
        @click=${() => host._openClimateEntity(entityId)}><ha-icon icon="mdi:home-assistant"></ha-icon></button>` : nothing}
    </div>` : nothing}
  </section>`;
}

function renderModeControl(
  host: VelairViewHost,
  entityId: string,
  selectedMode: string,
  modes: string[],
  editable: boolean,
  pending: boolean,
) {
  return html`<details class="climate-card-mode-control" data-mode=${selectedMode} ?data-disabled=${!editable} ?data-pending=${pending}
    @focusout=${(event: FocusEvent) => {
      const details = event.currentTarget as HTMLDetailsElement;
      if (!event.relatedTarget || !details.contains(event.relatedTarget as Node)) details.removeAttribute("open");
    }}
    @keydown=${(event: KeyboardEvent) => {
      const details = event.currentTarget as HTMLDetailsElement;
      if (event.key !== "Escape" || !details.open) return;
      event.preventDefault();
      details.removeAttribute("open");
      details.querySelector<HTMLElement>("summary")?.focus();
    }}>
    <summary aria-label=${host._t("mode")} aria-disabled=${String(!editable || pending)} aria-busy=${String(pending)}
      @click=${(event: MouseEvent) => prepareModeMenu(event, modes.length, editable && !pending)}>
      <ha-icon icon=${climateCardModeIcon(selectedMode)} aria-hidden="true"></ha-icon>
      <strong>${host._modeLabel(selectedMode)}</strong>
      <ha-icon class="select-indicator" icon="mdi:chevron-down" aria-hidden="true"></ha-icon>
    </summary>
    <div class="climate-card-mode-options" aria-label=${host._t("mode")}>
      ${modes.map((mode) => html`<button type="button" data-mode=${mode} aria-current=${mode === selectedMode ? "true" : nothing}
        @click=${(event: Event) => {
          (event.currentTarget as HTMLElement).closest("details")?.removeAttribute("open");
          if (mode !== selectedMode) void host._setClimateCardHvacMode(entityId, mode);
        }}>
        <ha-icon icon=${climateCardModeIcon(mode)} aria-hidden="true"></ha-icon>
        <span>${host._modeLabel(mode)}</span>
        ${mode === selectedMode ? html`<ha-icon class="selected" icon="mdi:check" aria-hidden="true"></ha-icon>` : nothing}
      </button>`)}
    </div>
  </details>`;
}

function prepareModeMenu(event: MouseEvent, modeCount: number, editable: boolean): void {
  if (!editable) {
    event.preventDefault();
    return;
  }
  const details = (event.currentTarget as HTMLElement).closest("details") as HTMLDetailsElement | null;
  if (!details || details.open) return;
  const rect = details.getBoundingClientRect();
  const expectedHeight = Math.min(240, modeCount * 40 + 10);
  const spaceAbove = Math.max(0, rect.top);
  const spaceBelow = Math.max(0, window.innerHeight - rect.bottom);
  const opensUp = spaceBelow < expectedHeight && spaceAbove > spaceBelow;
  const availableSpace = opensUp ? spaceAbove : spaceBelow;
  details.dataset.placement = opensUp ? "up" : "down";
  details.style.setProperty(
    "--climate-card-mode-menu-max-height",
    `${Math.max(80, Math.min(240, availableSpace - 12))}px`,
  );
}

function renderTargetControl(
  host: VelairViewHost,
  entityId: string,
  field: ClimateCardTargetField,
  label: string,
  value: number,
  editable: boolean,
  pending: boolean,
  temperatureUnit?: string,
  targetTempStep?: number,
) {
  const state = host.hass?.states?.[entityId];
  const decrease = editable && Boolean(climateCardTargetPayload(state, field, -1, temperatureUnit, targetTempStep));
  const increase = editable && Boolean(climateCardTargetPayload(state, field, 1, temperatureUnit, targetTempStep));
  return html`<div class="climate-card-target-control" ?data-pending=${pending} aria-busy=${String(pending)}>
    <div class="climate-card-target-stepper">
      <button type="button" aria-label=${host._t("climateCardDecreaseTarget")} aria-disabled=${String(!decrease || pending)} ?disabled=${!decrease}
        @click=${() => { if (!pending) void host._adjustClimateCardTarget(entityId, field, -1); }}><ha-icon icon="mdi:minus"></ha-icon></button>
      <span class="climate-card-target-value"><small>${label}</small><strong>${host._formatTemperature(value, entityId)}</strong></span>
      <button type="button" aria-label=${host._t("climateCardIncreaseTarget")} aria-disabled=${String(!increase || pending)} ?disabled=${!increase}
        @click=${() => { if (!pending) void host._adjustClimateCardTarget(entityId, field, 1); }}><ha-icon icon="mdi:plus"></ha-icon></button>
    </div>
  </div>`;
}

function thermostatControlReason(
  host: VelairViewHost,
  owner: string,
  available: boolean,
  runtime: Pick<ZoneRuntimeStatus, "state" | "pause_count" | "pause_ids" | "manual_adjustment_allowed" | "manual_adjustment_unavailable_reason"> | undefined,
  runtimeBlocked: boolean,
  targetMissingGrid: boolean,
): string | undefined {
  if (!available) return host._t("climateCardControlsUnavailable");
  if (runtime?.state === "boost") return host._t("climateCardControlsBlockedBoost");
  if (runtime?.state === "paused" && runtimeBlocked) return host._t("climateCardControlsBlockedPause");
  if (runtime?.state === "stopped") return host._t("climateCardControlsBlockedStopped");
  if (targetMissingGrid) return host._t("climateCardControlsMissingStep");
  if (owner !== "automatic") return undefined;
  if (runtime?.manual_adjustment_allowed === true) return undefined;
  const keys: Partial<Record<NonNullable<ZoneRuntimeStatus["manual_adjustment_unavailable_reason"]>, TranslationKey>> = {
    unavailable: "manualUnavailableClimate",
    disabled: "manualUnavailableDisabled",
    temperature_migration: "manualUnavailableTemperatureMigration",
    scheduler_not_auto: "manualUnavailableScheduler",
    profile_paused: "manualUnavailableProfilePause",
    zone_paused: "manualUnavailableZonePause",
    already_manual: "manualAdjustmentActive",
    external_execution: "externalActionsInactive",
  };
  const key = runtime?.manual_adjustment_unavailable_reason
    ? keys[runtime.manual_adjustment_unavailable_reason]
    : undefined;
  return key ? host._t(key) : host._t("climateCardManualAdjustmentUnavailable");
}

function activationKeyHandler(activate: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activate();
  };
}
function renderCurrentState(host: VelairViewHost, entityId: string, showComfort = true) {
  const attributes = host.hass?.states?.[entityId]?.attributes;
  const current = host._config.climate_show_current_temperature !== false ? attributes?.current_temperature : undefined;
  const humidityEntity = host._config.climate_humidity_entity;
  const humidity = host._config.climate_show_current_humidity !== false
    ? (humidityEntity ? numericEntityState(host.hass, humidityEntity) : attributes?.current_humidity)
    : undefined;
  const outdoorEntity = host._config.climate_show_outdoor_temperature !== false
    ? host._config.climate_outdoor_temperature_entity
    : undefined;
  const outdoorState = outdoorEntity ? host.hass?.states?.[outdoorEntity] : undefined;
  const rawOutdoor = numericEntityState(host.hass, outdoorEntity);
  const outdoor = typeof rawOutdoor === "number"
    ? convertAbsoluteTemperature(
        rawOutdoor,
        outdoorState?.attributes?.unit_of_measurement,
        host._temperatureUnit(entityId),
      )
    : undefined;
  const windows = host._config.climate_show_windows === false
    ? []
    : climateCardWindows(host.hass, host._config.climate_window_entities ?? []);
  const comfort = host._data?.comfort?.[entityId];
  const visibleComfort = showComfort && host._config.climate_show_comfort !== false && comfort?.enabled
    ? comfort
    : undefined;
  const compactComfort = visibleComfort?.data_quality !== "unavailable" ? visibleComfort : undefined;
  const hasReadings = typeof current === "number" || typeof humidity === "number";
  const hasContext = Boolean(outdoorEntity) || windows.length > 0;
  if (!hasReadings && !hasContext && !visibleComfort) return nothing;
  const collapsed = host._climateCardCurrentStateCollapsed;
  return html`
    <section class=${`climate-card-panel climate-card-current${collapsed ? " collapsed" : ""}`}>
      <div
        class="climate-card-current-heading"
        @click=${(event: MouseEvent) => {
          if (collapsed || (event.target as Element | null)?.closest(".climate-card-current-toggle")) return;
          host._toggleClimateCardCurrentState();
        }}
      >
        <h3><ha-icon icon="mdi:home-thermometer-outline"></ha-icon>${host._t("climateCardCurrentState")}</h3>
        <div class="climate-card-current-summary-wrap" aria-hidden=${String(!collapsed)} ?inert=${!collapsed}>
          ${renderCurrentStateSummary(host, entityId, current, humidityEntity, humidity, outdoorEntity, outdoor, windows)}
        </div>
        <button
          class="climate-card-current-toggle"
          type="button"
          aria-expanded=${String(!collapsed)}
          title=${host._t(collapsed ? "climateCardExpandCurrentState" : "climateCardCollapseCurrentState")}
          aria-label=${host._t(collapsed ? "climateCardExpandCurrentState" : "climateCardCollapseCurrentState")}
          @click=${host._toggleClimateCardCurrentState}
        ><ha-icon icon="mdi:chevron-up"></ha-icon></button>
      </div>
      ${compactComfort ? renderCollapsedComfort(host, entityId, compactComfort, collapsed) : nothing}
      <div class="climate-card-current-body" aria-hidden=${String(collapsed)} ?inert=${collapsed}>
        <div class="climate-card-current-body-inner">
          <div class=${`climate-card-current-grid${hasReadings ? " has-readings" : ""}${hasContext ? " has-context" : ""}`}>
            ${hasReadings ? html`<div class="climate-card-current-readings">
              ${typeof current === "number" ? metric(host, entityId, "mdi:thermometer", host._formatTemperature(current, entityId), "currentTemperature") : nothing}
              ${typeof humidity === "number" ? metric(host, humidityEntity ?? entityId, "mdi:water-percent", `${humidity}%`, "currentHumidity") : nothing}
            </div>` : nothing}
            ${hasContext ? html`<div class="climate-card-current-context">
              ${outdoorEntity ? renderOutdoor(host, entityId, outdoorEntity, outdoor, current) : nothing}
              ${windows.length ? renderWindows(host, windows) : nothing}
            </div>` : nothing}
            ${visibleComfort ? renderComfort(host, entityId, visibleComfort) : nothing}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderCurrentStateSummary(
  host: VelairViewHost,
  entityId: string,
  current: unknown,
  humidityEntity: string | undefined,
  humidity: unknown,
  outdoorEntity: string | undefined,
  outdoor: number | undefined,
  windows: ReturnType<typeof climateCardWindows>,
) {
  const open = windows.filter((window) => window.state === "open").length;
  const closed = windows.filter((window) => window.state === "closed").length;
  const unavailable = windows.length - open - closed;
  const outdoorName = outdoorEntity
    ? host.hass?.states?.[outdoorEntity]?.attributes?.friendly_name ?? host._t("climateCardOutdoor")
    : undefined;
  const delta = typeof outdoor === "number" && typeof current === "number" ? outdoor - current : undefined;
  const outdoorTitle = outdoorName && typeof delta === "number"
    ? `${outdoorName} · ${host._t(delta >= 0 ? "climateCardOutdoorWarmer" : "climateCardOutdoorColder", {
        delta: host._formatTemperature(Math.abs(delta), entityId),
      })}`
    : outdoorName;
  return html`<div class="climate-card-current-summary">
    ${typeof current === "number" ? compactCurrentStateItem(
      "temperature",
      "mdi:thermometer",
      host._formatTemperature(current, entityId),
      host._t("currentTemperature"),
      () => host._openEntityHistory(entityId),
    ) : nothing}
    ${typeof humidity === "number" ? compactCurrentStateItem(
      "humidity",
      "mdi:water-percent",
      `${humidity}%`,
      host._t("currentHumidity"),
      () => host._openEntityHistory(humidityEntity ?? entityId),
    ) : nothing}
    ${outdoorEntity ? compactCurrentStateItem(
      "outdoor",
      "mdi:home-export-outline",
      typeof outdoor === "number" ? host._formatTemperature(outdoor, entityId) : host._t("unavailable"),
      outdoorTitle ?? host._t("climateCardOutdoor"),
      () => host._openEntityHistory(outdoorEntity),
    ) : nothing}
    ${windows.length ? html`<span class="climate-card-current-summary-item windows" title=${host._t("climateCardWindows")}>
      <ha-icon icon=${open ? "mdi:window-open-variant" : "mdi:window-closed-variant"}></ha-icon>
      <strong>
        ${open ? html`<span class="open">${host._t("climateCardWindowsOpen", { count: open })}</span>` : nothing}
        ${open && (closed || unavailable) ? html`<span aria-hidden="true">·</span>` : nothing}
        ${closed ? html`<span>${host._t("climateCardWindowsClosed", { count: closed })}</span>` : nothing}
        ${closed && unavailable ? html`<span aria-hidden="true">·</span>` : nothing}
        ${unavailable ? html`<span>${host._t("climateCardWindowsUnavailable", { count: unavailable })}</span>` : nothing}
      </strong>
    </span>` : nothing}
  </div>`;
}
function renderCollapsedComfort(host: VelairViewHost, entityId: string, comfort: ComfortAssessment, collapsed: boolean) {
  const accent = comfortAccent(comfort);
  const chips = climateCardComfortChips(host, entityId, comfort, true);
  const title = chips.map((chip) => chip.text).join(" · ");
  return html`<div
    class="climate-card-current-collapsed-comfort"
    aria-hidden=${String(!collapsed)}
    ?inert=${!collapsed}
  ><div class="climate-card-current-collapsed-comfort-inner">
    <div class=${`climate-card-current-collapsed-comfort-row ${accent}`} title=${title} style=${comfortCardAccentStyle(comfort)}>
      <ha-icon icon="mdi:sofa-outline"></ha-icon>
      <div class="climate-card-comfort-chip-list">
        ${chips.map((chip) => renderClimateCardComfortChip(chip))}
      </div>
    </div>
  </div></div>`;
}

function compactCurrentStateItem(kind: string, icon: string, value: string, title: string, activate?: () => void) {
  const keyHandler = activate ? activationKeyHandler(activate) : undefined;
  return html`<span
    class=${`climate-card-current-summary-item ${kind}${activate ? " clickable" : ""}`}
    title=${title}
    role=${activate ? "button" : nothing}
    tabindex=${activate ? "0" : nothing}
    @click=${activate}
    @keydown=${keyHandler}
  >
    <ha-icon icon=${icon}></ha-icon><strong>${value}</strong>
  </span>`;
}
function metric(host: VelairViewHost, entityId: string, icon: string, value: string, title: TranslationKey) {
  const kind = title === "currentTemperature" ? "temperature" : title === "currentHumidity" ? "humidity" : "default";
  const historyLabel = host._t("climateCardOpenMetricHistory", { metric: host._t(title) });
  return html`<div class=${`climate-card-metric ${kind}`} title=${host._t(title)}>
    <ha-icon icon=${icon}></ha-icon><strong>${value}</strong>
    <button
      class="climate-card-metric-history"
      type="button"
      title=${historyLabel}
      aria-label=${historyLabel}
      @click=${() => host._openEntityHistory(entityId)}
    ><ha-icon icon="mdi:chart-line"></ha-icon></button>
  </div>`;
}
function renderOutdoor(
  host: VelairViewHost,
  entityId: string,
  outdoorEntity: string,
  outdoor: number | undefined,
  current: number | undefined,
) {
  const delta = typeof outdoor === "number" && typeof current === "number" ? outdoor - current : undefined;
  const name = host.hass?.states?.[outdoorEntity]?.attributes?.friendly_name ?? host._t("climateCardOutdoor");
  const historyLabel = host._t("climateCardOpenMetricHistory", { metric: name });
  return html`<div class="climate-card-context-item outdoor with-history">
    <ha-icon icon="mdi:home-export-outline"></ha-icon>
    <div><small title=${name}>${name}</small>
      <div class="climate-card-context-detail">
        <strong>${typeof outdoor === "number" ? host._formatTemperature(outdoor, entityId) : host._t("unavailable")}</strong>
        ${typeof delta === "number"
          ? html`<span>${host._t(delta >= 0 ? "climateCardOutdoorWarmer" : "climateCardOutdoorColder", {
              delta: host._formatTemperature(Math.abs(delta), entityId),
            })}</span>`
          : nothing}
      </div>
    </div>
    <button
      class="climate-card-metric-history"
      type="button"
      title=${historyLabel}
      aria-label=${historyLabel}
      @click=${() => host._openEntityHistory(outdoorEntity)}
    ><ha-icon icon="mdi:chart-line"></ha-icon></button>
  </div>`;
}
function renderWindows(host: VelairViewHost, windows: ReturnType<typeof climateCardWindows>) {
  if (host._config.climate_window_display === "individual") {
    return html`<div class="climate-card-context-item windows individual">
      <ha-icon icon="mdi:window-closed-variant"></ha-icon>
      <div><small>${host._t("climateCardWindows")}</small>
        <div class="climate-card-window-list">${windows.map((window) => html`
          <span class=${window.state} title=${window.entityId}>
            <ha-icon icon=${window.state === "open" ? "mdi:window-open-variant" : "mdi:window-closed-variant"}></ha-icon>
            ${window.name}
          </span>`)}
        </div>
      </div>
    </div>`;
  }
  const open = windows.filter((window) => window.state === "open").length;
  const closed = windows.filter((window) => window.state === "closed").length;
  const unavailable = windows.length - open - closed;
  return html`<div class="climate-card-context-item windows">
    <ha-icon icon=${open ? "mdi:window-open-variant" : "mdi:window-closed-variant"}></ha-icon>
    <div><small>${host._t("climateCardWindows")}</small>
      <div class="climate-card-context-detail">
        ${open || closed ? html`<strong class="climate-card-window-summary">
          ${open ? html`<span class="open">${host._t("climateCardWindowsOpen", { count: open })}</span>` : nothing}
          ${open && closed ? html`<span class="separator" aria-hidden="true">·</span>` : nothing}
          ${closed ? html`<span class="closed">${host._t("climateCardWindowsClosed", { count: closed })}</span>` : nothing}
        </strong>` : nothing}
        ${unavailable ? html`<span>${host._t("climateCardWindowsUnavailable", { count: unavailable })}</span>` : nothing}
      </div>
    </div>
  </div>`;
}

function renderComfort(host: VelairViewHost, entityId: string, comfort: ComfortAssessment) {
  const accent = comfortAccent(comfort);
  const chips = climateCardComfortChips(host, entityId, comfort, false);
  const notices = climateCardComfortNotices(host, entityId, comfort);
  const metrics = climateCardComfortMetricChips(host, entityId, comfort);
  return html`<div class=${`climate-card-comfort ${accent}`} style=${comfortCardAccentStyle(comfort)}>
    <ha-icon icon="mdi:sofa-outline"></ha-icon>
    <div class="climate-card-comfort-content">
      <div class="climate-card-comfort-heading-row">
        <strong>${host._t("comfort")}: ${comfortConditionLabel(host, comfort)}</strong>
      </div>
      ${chips.length ? html`<div class="climate-card-comfort-chip-list">
        ${chips.map((chip) => renderClimateCardComfortChip(chip))}
      </div>` : nothing}
      ${notices.length ? html`<div class="climate-card-comfort-notices">
        ${notices.map((notice) => html`<span class=${`climate-card-comfort-notice ${notice.tone}`}><ha-icon icon=${notice.icon}></ha-icon>${notice.text}</span>`)}
      </div>` : nothing}
      ${metrics.length ? html`<div class="climate-card-comfort-metrics">
        ${metrics.map((metric) => renderClimateCardComfortChip(metric))}
      </div>` : nothing}
    </div>
  </div>`;
}

type ClimateCardComfortChip = {
  icon?: string;
  label?: string;
  text: string;
  tone?: string;
};

function comfortCardAccentStyle(comfort: ComfortAssessment): string {
  const primary = comfortConditionAccentColor(comfort);
  const humidexPosition = comfort.range_summary?.thermal_relation === "mixed"
    ? comfort.range_summary.positions.humidex
    : undefined;
  const secondary = humidexPosition
    ? comfortRangePositionAccentColor(humidexPosition)
    : primary;
  return `--comfort-primary-accent:${primary};--comfort-secondary-accent:${secondary};`;
}

function comfortConditionAccentColor(comfort: ComfortAssessment): string {
  if (!comfort.enabled || comfort.data_quality === "unavailable" || comfort.condition === "no_readings" || comfort.condition === "monitoring_off") {
    return "var(--secondary-text-color)";
  }
  if (comfort.condition === "comfortable" || comfort.condition.endsWith("_comfortable")) {
    return "var(--success-color, #65a56f)";
  }
  if (comfort.condition.includes("hot")) {
    return "var(--deep-orange-color, var(--warning-color, #e67e45))";
  }
  if (comfort.condition.includes("cold")) {
    return "var(--cyan-color, var(--info-color, #3aa7c9))";
  }
  if (comfort.condition.includes("humid")) {
    return "var(--info-color, #3aa7c9)";
  }
  if (comfort.condition.includes("dry")) {
    return "var(--warning-color, #e69b35)";
  }
  return "var(--secondary-text-color)";
}

function comfortRangePositionAccentColor(position: "below" | "within" | "above" | null): string {
  if (position === "within") return "var(--success-color, #65a56f)";
  if (position === "below") return "var(--cyan-color, var(--info-color, #3aa7c9))";
  if (position === "above") return "var(--warning-color, #e69b35)";
  return "var(--secondary-text-color)";
}
function climateCardComfortChips(
  host: VelairViewHost,
  entityId: string,
  comfort: ComfortAssessment,
  compact: boolean,
): ClimateCardComfortChip[] {
  const chips: ClimateCardComfortChip[] = compact ? [{
    label: host._t("comfort"),
    text: comfortConditionLabel(host, comfort),
    tone: comfortAccent(comfort),
  }] : [];
  const humidex = climateCardHumidexStatus(host, comfort);
  if (humidex) chips.push(humidex);
  if (compact) {
    const insight = climateCardContextComfortInsight(host, entityId, comfort);
    if (insight) chips.push({ icon: "mdi:thermometer-lines", text: insight, tone: "info" });
    if (host._config.climate_show_comfort_collapsed_readings === true) {
      chips.push(...climateCardComfortMetricChips(host, entityId, comfort));
    }
  }
  return chips;
}

function renderClimateCardComfortChip(chip: ClimateCardComfortChip) {
  return html`<span class=${`climate-card-comfort-chip ${chip.tone ?? "neutral"}`} title=${chip.label ? `${chip.label}: ${chip.text}` : chip.text}>
    ${chip.icon ? html`<ha-icon icon=${chip.icon}></ha-icon>` : nothing}
    ${chip.label ? html`<small>${chip.label}</small>` : nothing}
    <strong>${chip.text}</strong>
  </span>`;
}
function climateCardComfortNotices(
  host: VelairViewHost,
  entityId: string,
  comfort: ComfortAssessment,
): ClimateCardComfortChip[] {
  const insight = climateCardContextComfortInsight(host, entityId, comfort);
  const notices: ClimateCardComfortChip[] = [];
  if (insight) {
    notices.push({ icon: "mdi:thermometer-lines", text: insight, tone: "info" });
  }
  if (comfort.data_quality !== "complete") {
    notices.push({ icon: "mdi:alert-circle-outline", text: host._t(comfortQualityKey(comfort.data_quality)), tone: "warning" });
  }
  return notices;
}

function climateCardHumidexStatus(
  host: VelairViewHost,
  comfort: ComfortAssessment,
): ClimateCardComfortChip | undefined {
  const position = comfort.range_summary?.positions.humidex;
  if (comfort.range_summary?.thermal_relation !== "mixed" || !position) return undefined;
  const key: TranslationKey = position === "below"
    ? "comfortHumidexRangeBelow"
    : position === "within"
      ? "comfortHumidexRangeWithin"
      : "comfortHumidexRangeAbove";
  return {
    icon: "mdi:thermometer-lines",
    label: host._t("comfortHumidex"),
    text: host._t(key),
    tone: position === "within" ? "good" : "warning",
  };
}

function climateCardComfortMetricChips(
  host: VelairViewHost,
  entityId: string,
  comfort: ComfortAssessment,
): ClimateCardComfortChip[] {
  const definitions = {
    humidex: { icon: "mdi:weather-sunny-alert", label: "comfortHumidex", config: "climate_show_comfort_humidex" },
    dew_point: { icon: "mdi:water-thermometer-outline", label: "comfortDewPoint", config: "climate_show_comfort_dew_point" },
    absolute_humidity: { icon: "mdi:water", label: "comfortAbsoluteHumidity", config: "climate_show_comfort_absolute_humidity" },
  } as const satisfies Record<DerivedComfortMetric, { icon: string; label: TranslationKey; config: keyof VelairViewHost["_config"] }>;
  return DERIVED_COMFORT_METRIC_ORDER.flatMap((metric) => {
    const definition = definitions[metric];
    if (host._config[definition.config] === false) return [];
    const reading = comfort.derived_metrics?.[metric];
    if (reading?.availability !== "current" || typeof reading.value !== "number") return [];
    return [{
      icon: definition.icon,
      label: host._t(definition.label),
      text: climateCardFormatDerivedComfortMetric(host, entityId, metric, reading.value),
      tone: metric === "humidex" ? "info" : "neutral",
    }];
  });
}

function climateCardFormatDerivedComfortMetric(
  host: VelairViewHost,
  entityId: string,
  metric: DerivedComfortMetric,
  value: number,
): string {
  if (metric === "dew_point") return host._formatTemperature(value, entityId);
  if (metric === "absolute_humidity") return formatComfortAbsoluteHumidity(value, host.hass);
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function climateCardContextComfortInsight(
  host: VelairViewHost,
  entityId: string,
  comfort: ComfortAssessment,
): string | undefined {
  const keys: Partial<Record<string, TranslationKey>> = {
    co2_elevated: "comfortInsightCo2Elevated",
    co2_poor: "comfortInsightCo2Poor",
    humidex_feels_warmer: "comfortInsightHumidexWarmer",
    ventilation_may_help_cool: "comfortInsightVentilationCool",
    ventilation_may_help_warm: "comfortInsightVentilationWarm",
    ventilation_may_help_reduce_humidity: "comfortInsightVentilationDry",
    ventilation_may_help_increase_humidity: "comfortInsightVentilationHumidify",
    ventilation_has_tradeoff: "comfortInsightVentilationTradeoff",
  };
  const insight = comfort.insights?.find(
    (candidate) => candidate.kind === "context" && keys[candidate.code] !== undefined,
  );
  const key = insight ? keys[insight.code] : undefined;
  if (!key) return undefined;
  if (insight?.code === "ventilation_has_tradeoff") {
    const temperature = comfort.outdoor?.comparison?.temperature;
    const humidity = comfort.outdoor?.comparison?.humidity;
    const potential = temperature?.potential ?? humidity?.potential;
    const effectKey: TranslationKey = potential === "cooling"
      ? "comfortVentilationEffectCool"
      : potential === "warming"
        ? "comfortVentilationEffectWarm"
        : potential === "drying"
          ? "comfortVentilationEffectDry"
          : "comfortVentilationEffectHumidify";
    const blockedBy = [...(temperature?.blocked_by ?? []), ...(humidity?.blocked_by ?? [])][0];
    const dimensionKey: TranslationKey = blockedBy === "temperature"
      ? "comfortVentilationDimensionTemperature"
      : "comfortVentilationDimensionHumidity";
    return host._t(key, { effect: host._t(effectKey), dimension: host._t(dimensionKey) });
  }
  if (
    insight
    && (insight.code === "ventilation_may_help_cool" || insight.code === "ventilation_may_help_warm")
    && comfort.outdoor?.humidity?.availability !== "current"
  ) {
    return `${host._t(key)} ${host._t("comfortInsightVentilationTemperatureOnly")}`;
  }
  if (insight?.code !== "humidex_feels_warmer") return host._t(key);
  const delta = humidexPerceivedHeatDelta(comfort, host._temperatureUnit(entityId));
  if (delta === undefined) return undefined;
  const rounded = Number(Math.abs(delta).toFixed(1));
  return host._t(key, { delta: `${rounded.toLocaleString()} ${host._temperatureUnit(entityId)}` });
}

function renderTimeline(
  host: VelairViewHost,
  entityId: string,
  effect: ReturnType<typeof activeClimateProfileZoneEffect>,
  activeMode: { name: string } | undefined,
) {
  const now = host._currentTimelineNow();
  const marker = timelineNowMarker(now, host.hass?.config?.time_zone);
  const weekday = todayWeekday(host.hass, now);
  const schedule = effectiveClimateSchedule(host._data, entityId);
  const showTitle = host._config.climate_show_timeline_title !== false;
  const showProfile = host._config.climate_show_timeline_profile !== false && Boolean(effect);
  const showMode = host._config.climate_show_timeline_mode !== false && Boolean(activeMode);
  const showHeading = showTitle || showProfile || showMode;
  return html`<section class=${`climate-card-timeline${showHeading ? "" : " no-heading"}`}>
    <div class="climate-card-timeline-grid">
      ${showHeading ? html`<div class="climate-card-timeline-meta">
        ${showTitle ? html`<h3><ha-icon icon="mdi:timeline-clock-outline"></ha-icon>${host._t("todayTimeline")}</h3>` : nothing}
        <div class="climate-card-context-chips">
        ${showProfile && effect ? html`<span class="climate-card-context-chip is-profile" style=${`--climate-chip-accent:${climateProfileAccentColor(effect.profile.key, effect.profile.color)}`}>
          <span class="climate-card-chip-accent"><ha-icon icon=${effect.profile.icon || "mdi:account-outline"}></ha-icon><small>${host._t("profileOverviewLabel")}</small></span><strong>${effect.profile.name}</strong>
        </span>` : nothing}
        ${showMode && activeMode ? html`<span class="climate-card-context-chip is-mode"><span class="climate-card-chip-accent"><ha-icon icon="mdi:format-list-bulleted"></ha-icon><small>${host._t("mode")}</small></span><strong>${activeMode.name}</strong></span>` : nothing}
        </div>
      </div>` : nothing}
      <div class="overview-timeline-scroll climate-card-timeline-scroll">
        <div class="overview-timeline-layout climate-card-timeline-layout">
          <div class="overview-timeline-rows" style=${`--overview-now-left:${marker.left}%;`}>
            <div class="overview-timeline-axis"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span><div class="overview-timeline-now-label" title=${host._t("currentTime", { time: marker.label })}>${marker.label}</div></div>
            <div class="overview-timeline-now-line"></div>
            ${renderOverviewTimelineTrack(host, entityId, schedule?.[weekday] ?? [], schedule, weekday)}
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function renderFeatures(host: VelairViewHost, entityId: string) {
  const roomAssist = host._data?.room_sensor_assist?.[entityId];
  const showAssist = host._config.climate_show_room_assist !== false;
  const showPreconditioning = host._config.climate_show_preconditioning !== false;
  const assistDisplay = host._config.climate_room_assist_display ?? "both";
  const preconditioningDisplay = host._config.climate_preconditioning_display ?? "both";
  const showAssistPanel = showAssist && Boolean(roomAssist?.configured);
  const showAssistSummary = showAssist && assistDisplay !== "chart" && Boolean(roomAssist?.configured);
  const showAssistGraph = showAssist && assistDisplay !== "text" && roomAssist?.configured && Boolean(roomAssist.start)
    && hasRoomAssistScheduledTarget(roomAssist);
  const preconditioningEvent = showPreconditioning ? nextActualPreconditioningEvent(host, entityId) : undefined;
  if (!showAssistPanel && !preconditioningEvent) {
    return nothing;
  }
  return html`<section class="climate-card-features">
    ${roomAssist && showAssistPanel
      ? renderRoomAssistPanel(host, entityId, roomAssist, showAssistSummary, Boolean(showAssistGraph))
      : nothing}
    ${preconditioningEvent ? renderPreconditioningPanel(host, preconditioningEvent, preconditioningDisplay) : nothing}
  </section>`;
}

function renderRoomAssistPanel(
  host: VelairViewHost,
  entityId: string,
  assist: RoomSensorAssistStatus,
  showSummary: boolean,
  showGraph: boolean,
) {
  const collapsed = showGraph && host._climateCardRoomAssistCollapsed;
  const summary = roomAssistSummary(host, entityId, assist);
  const title = host._t("roomSensorAssistBadge");
  const status = host._t(roomAssistStatusKey(assist.status));
  const idBase = `climate-card-room-assist-${entityId.replace(/[^a-z0-9_-]/gi, "-")}`;
  const titleId = `${idBase}-title`;
  const statusId = `${idBase}-status`;
  const descriptionId = `${idBase}-description`;
  const headingContent = html`<span class="climate-card-feature-heading-content">
    <span class="climate-card-feature-title-row">
      <span class="climate-card-feature-title"><ha-icon icon="mdi:thermometer-auto"></ha-icon><strong id=${titleId}>${title}</strong></span>
      <strong id=${statusId} class=${`climate-card-feature-status ${assist.status}`}>${status}</strong>
    </span>
    ${showSummary ? html`<span id=${descriptionId} class="climate-card-feature-description">${summary}</span>` : nothing}
  </span>`;
  return html`<section class=${`climate-card-feature-panel room-assist${collapsed ? " collapsed" : ""}`}>
    ${showGraph ? html`<button
        type="button"
        class="climate-card-feature-heading"
        aria-expanded=${String(!collapsed)}
        aria-labelledby=${`${titleId} ${statusId}`}
        aria-describedby=${showSummary ? descriptionId : nothing}
        title=${host._t(collapsed ? "climateCardExpandSection" : "climateCardCollapseSection", { name: title })}
        @click=${() => host._toggleClimateCardRoomAssist()}
      >${headingContent}<ha-icon class="climate-card-feature-chevron" icon="mdi:chevron-up"></ha-icon></button>`
      : html`<div class="climate-card-feature-heading static">${headingContent}</div>`}
    ${showGraph ? html`<div class="climate-card-feature-body" aria-hidden=${String(collapsed)} ?inert=${collapsed}>
      <div class="climate-card-feature-body-inner">
        ${renderRoomAssist(host, entityId, assist)}
      </div>
    </div>` : nothing}
  </section>`;
}

function renderPreconditioningPanel(
  host: VelairViewHost,
  event: ScheduleEvent,
  display: "both" | "chart" | "text",
) {
  const showDescription = display !== "chart";
  const showGraph = display !== "text";
  const collapsed = showGraph && host._climateCardPreconditioningCollapsed;
  const title = host._t("preconditioning");
  const targetWhen = event.target_when as string;
  const summaryTitle = `${host._t("preconditioningStarts")} ${host._formatDateTime(event.when)} · ${host._t("preconditioningTargetBy")} ${host._formatDateTime(targetWhen)} · ${host._formatEventAction(event)} · ${host._formatEventMode(event)}`;
  const active = new Date(event.when).getTime() <= host._currentTimelineNow().getTime();
  const status = host._t(active ? "climateCardPreconditioningActive" : "scheduled");
  const idBase = `climate-card-preconditioning-${event.entity_id.replace(/[^a-z0-9_-]/gi, "-")}`;
  const titleId = `${idBase}-title`;
  const statusId = `${idBase}-status`;
  const descriptionId = `${idBase}-description`;
  const headingContent = html`<span class="climate-card-feature-heading-content">
    <span class="climate-card-feature-title-row">
      <span class="climate-card-feature-title"><ha-icon icon="mdi:clock-fast"></ha-icon><strong id=${titleId}>${title}</strong></span>
      <strong id=${statusId} class=${`climate-card-feature-status ${active ? "active" : "scheduled"}`}>${status}</strong>
    </span>
    ${showDescription ? html`<span id=${descriptionId} class="climate-card-feature-description preconditioning" title=${summaryTitle}>
      <span><small>${host._t("preconditioningStarts")}</small><strong>${host._formatDateTime(event.when)}</strong></span>
      <span class="separator">·</span>
      <span><small>${host._t("preconditioningTargetBy")}</small><strong>${host._formatDateTime(targetWhen)}</strong></span>
      <span class="separator">·</span>
      <span><strong>${host._formatEventAction(event)}</strong><small>${host._formatEventMode(event)}</small></span>
    </span>` : nothing}
  </span>`;
  return html`<section class=${`climate-card-feature-panel preconditioning${collapsed ? " collapsed" : ""}`}>
    ${showGraph ? html`<button
        type="button"
        class="climate-card-feature-heading"
        aria-expanded=${String(!collapsed)}
        aria-labelledby=${`${titleId} ${statusId}`}
        aria-describedby=${showDescription ? descriptionId : nothing}
        title=${host._t(collapsed ? "climateCardExpandSection" : "climateCardCollapseSection", { name: title })}
        @click=${() => host._toggleClimateCardPreconditioning()}
      >${headingContent}<ha-icon class="climate-card-feature-chevron" icon="mdi:chevron-up"></ha-icon></button>`
      : html`<div class="climate-card-feature-heading static">${headingContent}</div>`}
    ${showGraph ? html`<div class="climate-card-feature-body" aria-hidden=${String(collapsed)} ?inert=${collapsed}>
      <div class="climate-card-feature-body-inner">${renderCompactPreconditioning(host, event)}</div>
    </div>` : nothing}
  </section>`;
}

function nextActualPreconditioningEvent(host: VelairViewHost, entityId: string): ScheduleEvent | undefined {
  const now = host._currentTimelineNow().getTime();
  return host._data?.next_events.find((event) => {
    if (event.entity_id !== entityId || !event.target_when || event.target_when === event.when) return false;
    const start = new Date(event.when).getTime();
    const target = new Date(event.target_when).getTime();
    const direction = event.preconditioning_diagnostics?.direction ?? event.hvac_mode;
    return Number.isFinite(start) && Number.isFinite(target) && target > start && target > now
      && (direction === "heat" || direction === "cool");
  });
}

function renderCompactPreconditioning(host: VelairViewHost, event: ScheduleEvent) {
  const targetWhen = event.target_when as string;
  const leadMinutes = Math.round((new Date(targetWhen).getTime() - new Date(event.when).getTime()) / 60000);
  const direction = event.preconditioning_diagnostics?.direction === "cool" || event.hvac_mode === "cool" ? "cool" : "heat";
  return html`<div class=${`climate-card-preconditioning-preview ${direction}`}>
    <div class="climate-card-preconditioning-start">
      <small>${host._t("preconditioningStarts")}</small>
      <strong>${host._formatDateTime(event.when)}</strong>
      <span>${host._t("preconditioningLeadTime", { minutes: leadMinutes })}</span>
    </div>
    <div class="climate-card-preconditioning-target">
      <small>${host._t("preconditioningTargetBy")}</small>
      <strong>${host._formatDateTime(targetWhen)}</strong>
      <span>${host._formatEventAction(event)} · ${host._formatEventMode(event)}</span>
    </div>
  </div>`;
}

function roomAssistSummary(host: VelairViewHost, entityId: string, assist: RoomSensorAssistStatus): string {
  const scheduled = roomAssistTemperature(host, entityId, assist.target_temperature, assist.target_temp_low, assist.target_temp_high);
  const applied = roomAssistTemperature(
    host,
    entityId,
    assist.applied_temperature ?? assist.climate_target_temperature,
    assist.applied_target_temp_low ?? assist.climate_target_temp_low,
    assist.applied_target_temp_high ?? assist.climate_target_temp_high,
  );
  const describesAdjustment = assist.status === "assisting"
    && roomAssistTargetsDiffer(assist)
    && scheduled
    && applied;
  return describesAdjustment
    ? host._t("climateCardRoomAssistSummaryAssistingAdjusted", { target: scheduled, applied })
    : host._t(roomAssistSummaryKey(assist.status));
}

function roomAssistTemperature(
  host: VelairViewHost,
  entityId: string,
  scalar?: number | null,
  low?: number | null,
  high?: number | null,
): string | undefined {
  if (typeof scalar === "number") return host._formatTemperature(scalar, entityId);
  if (typeof low === "number" && typeof high === "number") {
    return `${host._formatTemperature(low, entityId)} – ${host._formatTemperature(high, entityId)}`;
  }
  return undefined;
}

function roomAssistTargetsDiffer(assist: RoomSensorAssistStatus): boolean {
  const scheduledScalar = assist.target_temperature;
  const appliedScalar = assist.applied_temperature ?? assist.climate_target_temperature;
  if (typeof scheduledScalar === "number" && typeof appliedScalar === "number") {
    return Math.abs(scheduledScalar - appliedScalar) >= 0.05;
  }
  const scheduledLow = assist.target_temp_low;
  const scheduledHigh = assist.target_temp_high;
  const appliedLow = assist.applied_target_temp_low ?? assist.climate_target_temp_low;
  const appliedHigh = assist.applied_target_temp_high ?? assist.climate_target_temp_high;
  return typeof scheduledLow === "number" && typeof scheduledHigh === "number"
    && typeof appliedLow === "number" && typeof appliedHigh === "number"
    && (Math.abs(scheduledLow - appliedLow) >= 0.05 || Math.abs(scheduledHigh - appliedHigh) >= 0.05);
}

function roomAssistStatusKey(status: RoomSensorAssistStatus["status"]): TranslationKey {
  return ({
    not_configured: "climateCardRoomAssistNotConfigured",
    disabled: "climateCardRoomAssistDisabled",
    idle: "climateCardRoomAssistIdle",
    ready: "climateCardRoomAssistReady",
    assisting: "climateCardRoomAssistAssisting",
    holding: "climateCardRoomAssistHolding",
    blocked: "climateCardRoomAssistBlocked",
    unavailable: "climateCardRoomAssistUnavailable",
  } as const)[status];
}

function roomAssistSummaryKey(status: RoomSensorAssistStatus["status"]): TranslationKey {
  return ({
    not_configured: "climateCardRoomAssistSummaryNotConfigured",
    disabled: "climateCardRoomAssistSummaryDisabled",
    idle: "climateCardRoomAssistSummaryIdle",
    ready: "climateCardRoomAssistSummaryReady",
    assisting: "climateCardRoomAssistSummaryAssisting",
    holding: "climateCardRoomAssistSummaryHolding",
    blocked: "climateCardRoomAssistSummaryBlocked",
    unavailable: "climateCardRoomAssistSummaryUnavailable",
  } as const)[status];
}

function renderRoomAssist(host: VelairViewHost, entityId: string, assist: RoomSensorAssistStatus) {
  const settings = preconditioningSettings(
    host._data?.zones[entityId]?.preconditioning,
    host._temperatureUnit(entityId),
  );
  return html`<div class="climate-card-room-assist-graph">
    ${renderRoomAssistTemperatureScale(host, entityId, assist, settings)}
  </div>`;
}

type ClimateCardActionPresentation = {
  actions: ClimateCardEligibleAction[];
  direct: ClimateCardEligibleAction[];
  overflow: ClimateCardEligibleAction[];
  visibleControls: number;
  state: ClimateCardActionState;
};

function climateCardActionPresentation(
  host: VelairViewHost,
  owner: string,
  available: boolean,
  runtime?: { state: string; manual_pause?: boolean; pause_count?: number },
): ClimateCardActionPresentation {
  const paused = runtime?.state === "paused";
  const resumablePause = paused && runtime?.manual_pause === true && runtime.pause_count === 1;
  const boost = runtime?.state === "boost";
  const manual = owner === "manual";
  const velairActionsAvailable = available && owner !== "external" && runtime?.state !== "stopped";
  const actions = climateCardEligibleActions(host._config, host.hass, { velairActionsAvailable, manual });
  const { direct, overflow } = splitClimateCardActions(actions);
  const visibleControls = direct.length + (overflow.length ? 1 : 0);
  return {
    actions,
    direct,
    overflow,
    visibleControls,
    state: {
      boost,
      manual,
      paused,
      resumablePause,
      boostPanelOpen: false,
      pausePanelOpen: false,
    },
  };
}

function renderActions(
  host: VelairViewHost,
  entityId: string,
  presentation: ClimateCardActionPresentation,
) {
  const { direct, overflow, visibleControls, state } = presentation;
  if (!visibleControls) return nothing;
  const controls: ClimateCardDirectControl[] = [
    ...direct.map((action) => ({ type: "action" as const, action })),
    ...(overflow.length ? [{ type: "more" as const }] : []),
  ];
  const directState = {
    ...state,
    boostPanelOpen: host._climateCardBoost?.entityId === entityId,
    pausePanelOpen: host._climateCardPause?.entityId === entityId,
  };
  const overflowKeys = new Set(overflow
    .filter((action) => action.type === "script")
    .map((action) => `${action.sourceIndex}:${action.action.script}`));
  const moreRunning = Boolean(host._climateCardScriptAction && overflowKeys.has(host._climateCardScriptAction));
  const moreFeedback = host._climateCardScriptFeedback && overflowKeys.has(host._climateCardScriptFeedback.key)
    ? host._climateCardScriptFeedback
    : undefined;
  const moreStatus = moreRunning ? "running" : moreFeedback?.status;
  return html`<div class=${`climate-card-actions controls-${visibleControls}`} role="group" aria-label=${host._t("climateCardActions")}>
    <div class=${`climate-card-actions-scroll${host._climateCardActionsHasOverflow ? " has-overflow" : ""}${host._climateCardActionsCanScrollLeft ? " can-scroll-left" : ""}${host._climateCardActionsCanScrollRight ? " can-scroll-right" : ""}`}>
      <button class="climate-card-actions-scroll-button scroll-previous" type="button"
        aria-label=${`${host._t("climateCardActions")} ←`}
        aria-hidden=${String(!host._climateCardActionsCanScrollLeft)}
        ?disabled=${!host._climateCardActionsCanScrollLeft}
        @click=${() => host._scrollClimateCardActions(-1)}><ha-icon icon="mdi:chevron-left"></ha-icon></button>
      <div class="climate-card-actions-row"
        @scroll=${host._handleClimateCardActionsScroll}
        @pointerdown=${startHorizontalDrag}
        @pointermove=${moveHorizontalDrag}
        @pointerup=${endHorizontalDrag}
        @pointercancel=${cancelHorizontalDrag}
        @click=${horizontalDragClickGuard}>
      ${controls.map((control) => control.type === "action"
        ? renderClimateCardActionButton(host, entityId, control.action, directState)
        : html`<button class=${`more icon-only climate-card-actions-menu-trigger${moreStatus ? ` feedback-${moreStatus}` : ""}`} type="button"
            title=${moreFeedback?.message ?? host._t("more")}
            aria-label=${moreFeedback ? `${host._t("more")}. ${moreFeedback.message}` : host._t("more")}
            aria-busy=${String(moreRunning)}
            aria-haspopup="dialog"
            aria-expanded=${host._climateCardActionsMenuOpen ? "true" : "false"}
            aria-controls="climate-card-actions-menu"
            @click=${host._openClimateCardActionsMenu}>${renderClimateCardActionIconStack("mdi:dots-horizontal")}</button>`)}
      </div>
      <button class="climate-card-actions-scroll-button scroll-next" type="button"
        aria-label=${`${host._t("climateCardActions")} →`}
        aria-hidden=${String(!host._climateCardActionsCanScrollRight)}
        ?disabled=${!host._climateCardActionsCanScrollRight}
        @click=${() => host._scrollClimateCardActions(1)}><ha-icon icon="mdi:chevron-right"></ha-icon></button>
    </div>
    ${host._climateCardScriptFeedback ? html`<span class="climate-card-action-feedback-label" role="status">${host._climateCardScriptFeedback.message}</span>` : nothing}
    ${host._climateCardActionsMenuOpen && overflow.length
      ? renderActionsMenu(host, entityId, overflow, state)
      : nothing}
  </div>`;
}

type ClimateCardDirectControl =
  | { type: "action"; action: ClimateCardEligibleAction }
  | { type: "more" };

type ClimateCardActionState = {
  boost: boolean;
  manual: boolean;
  paused: boolean;
  resumablePause: boolean;
  boostPanelOpen: boolean;
  pausePanelOpen: boolean;
};

function renderClimateCardActionButton(
  host: VelairViewHost,
  entityId: string,
  action: ClimateCardEligibleAction,
  state: ClimateCardActionState,
  menu = false,
) {
  const busy = Boolean(host._climateCardServiceAction);
  const invoke = (callback: () => unknown) => () => {
    if (menu) host._closeClimateCardActionsMenu();
    callback();
  };
  if (action.type === "boost") {
    const label = host._t(state.boost ? "cancelBoost" : "boost");
    const hideName = !menu && action.hideName;
    return html`<button class=${`boost${hideName ? " icon-only name-hidden" : ""}${state.boost ? " runtime-active" : ""}${state.boostPanelOpen ? " panel-open" : ""}`} type="button" ?disabled=${busy} title=${label} aria-label=${label}
      aria-pressed=${menu ? nothing : String(state.boostPanelOpen)}
      @click=${invoke(state.boost ? () => host._runClimateCardService("cancel-boost", entityId) : () => host._openClimateCardBoost(entityId))}>
      <ha-icon icon="mdi:lightning-bolt"></ha-icon>${hideName ? nothing : html`<span>${label}</span>`}${!menu ? html`<ha-icon class="panel-close" icon="mdi:close" aria-hidden="true"></ha-icon>` : nothing}
    </button>`;
  }
  if (action.type === "pause") {
    if (state.manual) {
      const label = host._t("resumeAutomaticControl");
      const hideName = !menu && action.hideName;
      return html`<button class=${`resume${hideName ? " icon-only" : ""}`} type="button" ?disabled=${busy} title=${label} aria-label=${label}
        @click=${invoke(() => host._resumeAutomaticControl(entityId))}><ha-icon icon="mdi:autorenew"></ha-icon>${hideName ? nothing : html`<span>${label}</span>`}</button>`;
    }
    const label = host._t(state.resumablePause ? "resume" : state.paused ? "climateCardManagePause" : "pause");
    const hideName = !menu && action.hideName;
    return html`<button class=${`pause${hideName ? " icon-only name-hidden" : ""}${state.paused ? " runtime-active" : ""}${state.pausePanelOpen ? " panel-open" : ""}`} type="button" ?disabled=${busy} title=${label} aria-label=${label}
      aria-pressed=${menu ? nothing : String(state.pausePanelOpen)}
      @click=${invoke(state.resumablePause ? () => host._runClimateCardService("resume", entityId) : state.paused ? host._navigateToVelair : () => host._openClimateCardPause(entityId))}>
      <ha-icon icon=${state.paused ? "mdi:play-circle" : "mdi:pause-circle"}></ha-icon>${hideName ? nothing : html`<span>${label}</span>`}${!menu ? html`<ha-icon class="panel-close" icon="mdi:close" aria-hidden="true"></ha-icon>` : nothing}
    </button>`;
  }
  const scriptState = host.hass?.states?.[action.action.script];
  const key = `${action.sourceIndex}:${action.action.script}`;
  const running = host._climateCardScriptAction === key;
  const feedback = host._climateCardScriptFeedback?.key === key ? host._climateCardScriptFeedback : undefined;
  const icon = validClimateCardActionIcon(action.action.icon)
    ?? validClimateCardActionIcon(scriptState?.attributes?.icon)
    ?? "mdi:script-text-outline";
  const color = validClimateCardActionColor(action.action.color) ?? "var(--primary-color)";
  const label = action.action.name.trim() || host._friendlyEntityName(action.action.script);
  const hideName = !menu && action.action.hide_name === true;
  return html`<button class=${`custom${hideName ? " icon-only" : ""}${running ? " feedback-running" : feedback ? ` feedback-${feedback.status}` : ""}`} type="button"
    style=${`--custom-action-color:${color}`}
    ?disabled=${!action.available || Boolean(host._climateCardScriptAction)}
    title=${feedback?.message ?? (action.available ? label : host._t("climateCardScriptUnavailable"))}
    aria-label=${feedback ? `${label}. ${feedback.message}` : label}
    aria-busy=${String(running)}
    @click=${() => host._runClimateCardScriptAction(action.action, action.sourceIndex)}>
    ${renderClimateCardActionIconStack(icon)}
    ${hideName ? nothing : html`<span>${label}</span>`}
  </button>`;
}

function renderClimateCardActionIconStack(icon: string) {
  return html`<span class="climate-card-action-icon-stack" aria-hidden="true">
    <ha-icon class="action-result-default" icon=${icon}></ha-icon>
    <ha-icon class="action-result-running" icon="mdi:loading"></ha-icon>
    <ha-icon class="action-result-success" icon="mdi:check"></ha-icon>
    <ha-icon class="action-result-error" icon="mdi:alert-outline"></ha-icon>
  </span>`;
}

function renderActionsMenu(
  host: VelairViewHost,
  entityId: string,
  actions: ClimateCardEligibleAction[],
  state: ClimateCardActionState,
) {
  return html`<div id="climate-card-actions-menu" class="climate-card-actions-menu" popover="auto" role="dialog" aria-label=${host._t("climateCardActions")}
    @toggle=${(event: ToggleEvent) => {
      if (event.newState === "closed" && host._climateCardActionsMenuOpen) host._closeClimateCardActionsMenu(true);
    }}
    @keydown=${(event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      host._closeClimateCardActionsMenu(true);
    }}>
    ${actions.map((action) => renderClimateCardActionButton(host, entityId, action, state, true))}
    <div class="climate-card-actions-menu-separator" aria-hidden="true"></div>
    <button type="button" @click=${host._navigateToVelair}>
      <img class="climate-card-actions-menu-brand" src=${VELAIR_LOADING_ICON_URL} alt="" width="22" height="22"><span>${host._t("climateCardOpenVelairMenu")}</span>
    </button>
  </div>`;
}

function renderBoostForm(host: VelairViewHost, entityId: string) {
  const boost = host._climateCardBoost!;
  const [minimum, maximum] = host._entityTemperatureLimits(entityId);
  const step = host._entityTemperatureStep(entityId) ?? 0.5;
  const climateState = host.hass?.states?.[entityId];
  const supportsSingle = climateSupportsSingleTarget(climateState);
  const supportsRange = climateSupportsRangeTarget(climateState);
  return html`<form class="climate-card-boost-form climate-card-control-pane" @submit=${(event: SubmitEvent) => { event.preventDefault(); void host._runClimateCardService("boost", entityId); }}>
    <strong>${host._t("climateCardConfigureBoost")}</strong>
    <div>
      ${supportsSingle && supportsRange ? html`<label><span>${host._t("boostTarget")}</span><select .value=${boost.targetKind} @change=${(event: Event) => host._updateClimateCardBoostOption("targetKind", (event.currentTarget as HTMLSelectElement).value)}><option value="single">${host._t("externalCapability_target_scalar")}</option><option value="range">${host._t("externalCapability_target_range")}</option></select></label>` : nothing}
      ${boost.targetKind === "range"
        ? html`${boostInput(host, "low", boost.low, minimum, maximum, step)}${boostInput(host, "high", boost.high, minimum, maximum, step)}`
        : boostInput(host, "target", boost.target, minimum, maximum, step)}
      <label><span>${host._t("durationMinutes")}</span><input type="number" min="1" max="10080" step="1" required .value=${String(boost.durationMinutes)} @input=${(event: Event) => host._updateClimateCardBoost("durationMinutes", (event.currentTarget as HTMLInputElement).value)}></label>
      ${boostSelect(host, "hvacMode", "mode", host._climateSupportedModes(entityId).filter((mode) => mode !== "off"), boost.hvacMode)}
      ${boostSelect(host, "fanMode", "fanMode", host._entityFanModeOptions(entityId), boost.fanMode)}
      ${boostSelect(host, "presetMode", "presetMode", host._entityPresetModeOptions(entityId), boost.presetMode)}
      ${boostSelect(host, "swingMode", "swingMode", host._entitySwingModeOptions(entityId), boost.swingMode)}
      ${boostSelect(host, "swingHorizontalMode", "horizontalSwingMode", host._entitySwingHorizontalModeOptions(entityId), boost.swingHorizontalMode)}
      ${humidityInput(host, entityId, boost.humidity)}
    </div>
    <footer><button type="button" @click=${host._cancelClimateCardBoost}>${host._t("cancel")}</button><button class="primary" type="submit">${host._t("apply")}</button></footer>
  </form>`;
}

function boostSelect(host: VelairViewHost, field: "hvacMode" | "fanMode" | "presetMode" | "swingMode" | "swingHorizontalMode", label: TranslationKey, options: string[], value?: string) {
  if (!options.length) return nothing;
  return html`<label><span>${host._t(label)}</span><select .value=${value ?? ""} @change=${(event: Event) => host._updateClimateCardBoostOption(field, (event.currentTarget as HTMLSelectElement).value)}><option value="">${host._t("keep")}</option>${options.map((option) => html`<option value=${option}>${field === "hvacMode" ? host._modeLabel(option) : option}</option>`)}</select></label>`;
}

function humidityInput(host: VelairViewHost, entityId: string, value?: number) {
  const limits = host._entityHumidityLimits(entityId);
  if (!limits) return nothing;
  return html`<label><span>${host._t("targetHumidity")}</span><input type="number" min=${limits[0]} max=${limits[1]} step="1" .value=${value === undefined ? "" : String(value)} @input=${(event: Event) => host._updateClimateCardBoost("humidity", (event.currentTarget as HTMLInputElement).value)}></label>`;
}

function renderPauseForm(host: VelairViewHost, entityId: string) {
  const pause = host._climateCardPause!;
  return html`<form class="climate-card-boost-form climate-card-pause-form climate-card-control-pane" @submit=${(event: SubmitEvent) => { event.preventDefault(); void host._runClimateCardService("pause", entityId); }}>
    <strong>${host._t("pause")}</strong>
    <div>
      <label><span>${host._t("pauseDuration")}</span><input type="number" min="1" max="10080" step="1" ?disabled=${pause.indefinite} required .value=${String(pause.durationMinutes)} @input=${(event: Event) => host._updateClimateCardPause("durationMinutes", (event.currentTarget as HTMLInputElement).value)}></label>
      <label><span>${host._t("profilePauseAction")}</span><select .value=${pause.action} @change=${(event: Event) => host._updateClimateCardPause("action", (event.currentTarget as HTMLSelectElement).value)}><option value="none">${host._t("profilePauseKeep")}</option><option value="turn_off">${host._t("profilePauseTurnOff")}</option></select></label>
      <label class="climate-card-form-checkbox"><input type="checkbox" .checked=${pause.indefinite} @change=${(event: Event) => host._updateClimateCardPause("indefinite", (event.currentTarget as HTMLInputElement).checked)}><span>${host._t("pauseIndefinite")}</span></label>
    </div>
    <footer><button type="button" @click=${host._cancelClimateCardPause}>${host._t("cancel")}</button><button class="primary" type="submit">${host._t("apply")}</button></footer>
  </form>`;
}

function renderRuntimeState(host: VelairViewHost, runtime: { state: string; until?: string | null }) {
  const paused = runtime.state === "paused";
  const detail = paused
    ? runtime.until
      ? host._t("overviewZoneResumes", { time: host._formatDateTime(runtime.until) })
      : host._t("overviewZoneUntilResumed")
    : runtime.until
      ? host._t("overviewZoneUntil", { time: host._formatDateTime(runtime.until) })
      : host._t("boostActive");
  return html`<div class=${`climate-card-runtime ${paused ? "paused" : "boost"}`}>
    <ha-icon icon=${paused ? "mdi:pause-circle" : "mdi:lightning-bolt"}></ha-icon>
    <strong>${host._t(paused ? "overviewZonePaused" : "overviewZoneBoost")}</strong>
    <span>${detail}</span>
  </div>`;
}

function boostInput(host: VelairViewHost, field: "target" | "low" | "high", value: number | undefined, minimum: number, maximum: number, step: number) {
  const labels = { target: "targetTemperature", low: "minimumShort", high: "maximumShort" } as const;
  return html`<label><span>${host._t(labels[field])}</span><input type="number" min=${minimum} max=${maximum} step=${step} required .value=${value === undefined ? "" : String(value)} @input=${(event: Event) => host._updateClimateCardBoost(field, (event.currentTarget as HTMLInputElement).value)}></label>`;
}

function renderExternalOwner(host: VelairViewHost, entityId: string, provider?: string, external?: { available: boolean; publication: { state: "publishing" | "published" | "failed" } | null }) {
  const publication = external?.publication?.state;
  const attributes = host.hass?.states?.[entityId]?.attributes;
  const next = host._data?.next_events.find((event) => event.entity_id === entityId)
    ?? (host._data?.next_event?.entity_id === entityId ? host._data.next_event : undefined);
  const providerState = external?.available === false
    ? "externalProviderUnavailable"
    : publication
      ? `externalPublication_${publication}` as TranslationKey
      : "externalProviderAvailable";
  return html`<section class="climate-card-panel climate-card-external">
    <ha-icon icon="mdi:connection"></ha-icon><div><strong>${host._t("climateCardExternalManaged", { provider: provider || host._t("unknown") })}</strong>
      <small>${host._t(providerState)}</small></div>
    <button type="button" @click=${host._navigateToVelair}>${host._t("climateCardOpenVelair")}</button>
    <div class="climate-card-external-readings">
      ${next ? html`<div class="climate-card-context-item"><ha-icon icon="mdi:clock-outline"></ha-icon><div><small>${host._t("nextEvent")}</small><strong>${host._formatDateTime(next.when)}</strong><span>${host._formatEventAction(next)}</span></div></div>` : nothing}
    </div>
  </section>${renderCurrentState(host, entityId, false)}`;
}

function actionLabel(host: VelairViewHost, action: string): string {
  if (action === "unavailable") return host._t("climateCardUnavailable");
  return host._hvacActionLabel(action);
}

function ownerLabel(host: VelairViewHost, owner: string): string {
  if (owner === "manual") return host._t("manualControl");
  if (owner === "external") return host._t("climateCardExternalControl");
  return host._t("scheduled");
}

function comfortConditionLabel(host: VelairViewHost, comfort: ComfortAssessment): string {
  const key = `comfortCondition${comfort.condition.split("_").map(capitalize).join("")}` as TranslationKey;
  return host._t(key);
}

function comfortQualityKey(quality: ComfortAssessment["data_quality"]): TranslationKey {
  return ({ complete: "current", partial: "comfortDataPartial", stale: "comfortDataStale", unavailable: "comfortDataUnavailable" } as const)[quality];
}

function comfortAirQualityKey(quality: ComfortAssessment["air_quality"]): TranslationKey {
  return ({
    not_monitored: "comfortNotMonitored",
    unavailable: "comfortAirQualityUnavailable",
    good: "comfortAirQualityGood",
    elevated: "comfortAirQualityElevated",
    poor: "comfortAirQualityPoor",
  } as const)[quality];
}

function capitalize(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}
