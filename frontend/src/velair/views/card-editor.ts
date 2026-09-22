import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { LOVELACE_CARD_VIEWS, WEEKDAYS } from "../constants";
import { validClimateCardActionColor, validClimateCardActionIcon } from "../domain/climate-card-menu";
import { climateCardConfiguredActions } from "../domain/climate-card-actions";
import { languageFromHass, translate, weekdayName } from "../i18n";
import type { SupportedLanguage, TranslationKey } from "../translations";
import type {
  ActiveSetupControls,
  ClimateCardAction,
  ClimateCardCustomAction,
  HomeAssistant,
  ScheduleResponse,
  VelairCardConfig,
  VelairCardView,
} from "../types";

const FIRST_WEEKDAY_CARD_VIEWS = new Set<VelairCardView>(["schedules"]);
const ACTIVE_SETUP_CONTROL_CARD_VIEWS = new Set<VelairCardView>(["active-setup"]);
const THERMOSTAT_FILTER_CARD_VIEWS = new Set<VelairCardView>([
  "comfort",
  "overview",
  "overview-boosts",
  "overview-events",
  "overview-timeline",
  "overview-zones",
  "schedules",
  "templates",
  "sensors",
  "preconditioning",
  "settings",
]);
const COMFORT_VISIBILITY_CARD_VIEWS = new Set<VelairCardView>(["comfort"]);
const COMFORT_VISIBILITY_FIELDS = [
  ["show_comfort_configuration", "comfortCardShowConfiguration"],
  ["show_comfort_temperature", "comfortCardShowTemperature"],
  ["show_comfort_humidity", "comfortCardShowHumidity"],
  ["show_comfort_co2", "comfortCardShowCo2"],
] as const;
const ROOM_ASSIST_VISIBILITY_CARD_VIEWS = new Set<VelairCardView>(["sensors"]);
const CLIMATE_CARD_VIEWS = new Set<VelairCardView>(["climate"]);
const WINDOW_PAUSE_BLUEPRINT_URL = "https://github.com/cgonfer/velair/blob/main/docs/user/blueprints/pause-zone-for-open-windows.md";
const ROOM_ASSIST_VISIBILITY_FIELDS = [
  ["show_room_assist_switch", "roomAssistShowSwitch"],
  ["show_room_assist_sensor", "roomAssistShowSensor"],
  ["show_room_assist_deadband", "roomAssistShowDeadband"],
  ["show_room_assist_max_delta", "roomAssistShowMaxDelta"],
  ["show_room_assist_debounce", "roomAssistShowDebounce"],
  ["show_room_assist_live_status", "roomAssistShowLiveStatus"],
] as const;
type ComfortVisibilityField = typeof COMFORT_VISIBILITY_FIELDS[number][0];
type RoomAssistVisibilityField = typeof ROOM_ASSIST_VISIBILITY_FIELDS[number][0];
type CardVisibilityField = ComfortVisibilityField | RoomAssistVisibilityField;

export class VelairCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config: VelairCardConfig = {};
  @state() private _entities: string[] = [];
  @state() private _loading = false;
  @state() private _loaded = false;
  @state() private _error?: string;
  @state() private _expandedClimateAction?: number;
  private _draggedEntity?: string;

  public setConfig(config: VelairCardConfig): void {
    this._config = config ?? {};
  }

  protected updated(changedProperties: Map<string, unknown>): void {
    if (
      (changedProperties.has("hass") || changedProperties.has("_config"))
      && this.hass
      && (this._showsThermostatOptions() || this._showsClimateCardOptions())
      && !this._loaded
      && !this._loading
    ) {
      void this._loadManagedEntities();
    }
  }

  protected render() {
    const firstWeekday = this._firstWeekday();
    const showActiveSetupControls = this._showsActiveSetupControls();
    const orderedEntities = this._orderedEntities();
    const showFirstWeekday = this._showsFirstWeekdayOption();
    const showComfortVisibilityOptions = this._showsComfortVisibilityOptions();
    const showThermostatOptions = this._showsThermostatOptions();
    const showRoomAssistVisibilityOptions = this._showsRoomAssistVisibilityOptions();
    const showClimateCardOptions = this._showsClimateCardOptions();

    return html`
      <div class="editor">
        ${this._error ? html`<div class="notice error">${this._error}</div>` : nothing}
        ${this._loading ? html`<div class="notice">${this._t("loadingEntities")}</div>` : nothing}

        ${showClimateCardOptions ? nothing : html`<label>
          <span>${this._t("title")}</span>
          <input
            type="text"
            .value=${this._config.title ?? ""}
            placeholder="Velair"
            @input=${(event: Event) => this._updateConfig("title", this._inputValue(event))}
          />
        </label>`}

        <label>
          <span>${this._t("cardView")}</span>
          <select
            .value=${this._config.view ?? "overview-status"}
            @change=${(event: Event) => this._updateView(this._inputValue(event))}
          >
            ${LOVELACE_CARD_VIEWS.map((view) => html`
              <option
                value=${view}
                ?selected=${view === (this._config.view ?? "overview-status")}
              >
                ${this._viewLabel(view)}
              </option>
            `)}
          </select>
        </label>

        ${showActiveSetupControls
          ? html`
              <label class="active-setup-controls-option">
                <span>${this._t("activeSetupCardControls")}</span>
                <select
                  .value=${this._activeSetupControls()}
                  @change=${(event: Event) => this._updateActiveSetupControls(this._inputValue(event))}
                >
                  <option value="both">${this._t("activeSetupCardControlsBoth")}</option>
                  <option value="modes">${this._t("activeSetupCardControlsModes")}</option>
                  <option value="profiles">${this._t("activeSetupCardControlsProfiles")}</option>
                </select>
                <small>${this._t("activeSetupCardControlsDescription")}</small>
              </label>
            `
          : nothing}

        ${showFirstWeekday
          ? html`
              <label class="first-weekday-option">
                <span>${this._t("firstWeekday")}</span>
                <select
                  .value=${firstWeekday}
                  @change=${(event: Event) => this._updateFirstWeekday(this._inputValue(event))}
                >
                  ${WEEKDAYS.map((weekday) => html`<option value=${weekday}>${this._weekdayName(weekday)}</option>`)}
                </select>
              </label>
            `
          : nothing}

        ${showThermostatOptions
          ? html`
              <section class="zone-order">
                <div>
                  <span class="section-label">${this._t("cardThermostats")}</span>
                  <p>${this._t("cardThermostatsDescription")}</p>
                </div>
                <div class="zone-list">
                  ${orderedEntities.length
                    ? orderedEntities.map((entityId, index) => this._renderZoneOrderRow(entityId, index, orderedEntities.length))
                    : html`<span class="empty">${this._t("noManagedEntities")}</span>`}
                </div>
              </section>
            `
          : nothing}

        ${showClimateCardOptions ? this._renderClimateCardOptions() : nothing}

        ${showComfortVisibilityOptions
          ? html`
              <section class="card-visibility-options">
                <div>
                  <span class="section-label">${this._t("comfortCardVisibility")}</span>
                  <p>${this._t("comfortCardVisibilityDescription")}</p>
                </div>
                <div class="visibility-list">
                  ${COMFORT_VISIBILITY_FIELDS.map(([field, label]) =>
                    this._renderVisibilityOption(field, label),
                  )}
                </div>
              </section>
            `
          : nothing}

        ${showRoomAssistVisibilityOptions
          ? html`
              <section class="card-visibility-options">
                <div>
                  <span class="section-label">${this._t("roomAssistCardVisibility")}</span>
                  <p>${this._t("roomAssistCardVisibilityDescription")}</p>
                </div>
                <div class="visibility-list">
                  ${ROOM_ASSIST_VISIBILITY_FIELDS.map(([field, label]) =>
                    this._renderVisibilityOption(field, label),
                  )}
                </div>
              </section>
            `
          : nothing}
      </div>
    `;
  }

  private _renderClimateCardOptions() {
    const legacySelected = this._config.entities?.length === 1 ? this._config.entities[0] : undefined;
    const selected = this._config.selected_entity ?? legacySelected ?? this._orderedEntities()[0] ?? "";
    const windows = this._config.climate_window_entities ?? [];
    const binarySensors = Object.keys(this.hass?.states ?? {})
      .filter((entityId) => entityId.startsWith("binary_sensor."))
      .sort((left, right) => this._friendlyEntityName(left).localeCompare(this._friendlyEntityName(right)));
    const temperatureSensors = Object.entries(this.hass?.states ?? {})
      .filter(([entityId, state]) => entityId.startsWith("sensor.") && (
        state.attributes?.device_class === "temperature"
        || String(state.attributes?.unit_of_measurement ?? "").includes("°")
      ))
      .map(([entityId]) => entityId)
      .sort((left, right) => this._friendlyEntityName(left).localeCompare(this._friendlyEntityName(right)));
    const humiditySensors = Object.entries(this.hass?.states ?? {})
      .filter(([entityId, state]) => entityId.startsWith("sensor.") && (
        state.attributes?.device_class === "humidity"
        || String(state.attributes?.unit_of_measurement ?? "").trim() === "%"
      ))
      .map(([entityId]) => entityId)
      .sort((left, right) => this._friendlyEntityName(left).localeCompare(this._friendlyEntityName(right)));
    const selectedHumidityEntity = this._config.climate_humidity_entity;
    const availableHumiditySensors = selectedHumidityEntity && !humiditySensors.includes(selectedHumidityEntity)
      ? [selectedHumidityEntity, ...humiditySensors]
      : humiditySensors;
    const showOutdoor = this._config.climate_show_outdoor_temperature !== false
      && Boolean(this._config.climate_outdoor_temperature_entity);
    const showWindows = this._config.climate_show_windows !== false && windows.length > 0;
    const showTimeline = this._config.climate_show_timeline !== false;
    const showRoomAssist = this._config.climate_show_room_assist !== false;
    const showPreconditioning = this._config.climate_show_preconditioning !== false;
    const preconditioningDisplay = this._config.climate_preconditioning_display ?? "both";
    return html`<section class="climate-card-options">
      <div><span class="section-label">${this._t("climateCardConfiguration")}</span><p>${this._t("climateCardConfigurationDescription")}</p></div>
      <label><span>${this._t("climateCardManagedClimate")}</span><select .value=${selected} @change=${(event: Event) => this._setClimateEntity(this._inputValue(event))}>
        ${this._orderedEntities().map((entityId) => html`<option value=${entityId} ?selected=${entityId === selected}>${this._friendlyEntityName(entityId)}</option>`)}
      </select></label>
      <details class="climate-card-option-group climate-card-header-editor" open>
        <summary><span class="section-label">${this._t("climateCardHeaderOptions")}</span><ha-icon icon="mdi:chevron-down"></ha-icon></summary>
        <div class="climate-card-option-content">
        ${this._renderClimateToggle("climateCardShowStateBar", "climate_show_state_bar")}
        ${this._renderClimateToggle("climateCardShowName", "climate_show_name")}
        ${this._config.climate_show_name !== false ? html`<div class="nested-option"><label><span>${this._t("climateCardCustomName")}</span><div class="climate-card-name-row"><input type="text" maxlength="80" .value=${this._config.climate_name ?? this._friendlyEntityName(selected)} @input=${(event: Event) => this._setClimateName(this._inputValue(event))}><button class="icon-button" type="button" title=${this._t("climateCardResetName")} ?disabled=${this._config.climate_name === undefined} @click=${this._resetClimateName}><ha-icon icon="mdi:restore"></ha-icon></button></div></label></div>` : nothing}
        ${this._renderClimateToggle("climateCardShowOperation", "climate_show_operation")}
        </div>
      </details>
      <details class="climate-card-option-group climate-card-thermostat-editor" open>
        <summary><span class="section-label">${this._t("climateCardThermostatControls")}</span><ha-icon icon="mdi:chevron-down"></ha-icon></summary>
        <div class="climate-card-option-content">
          <div class="climate-card-feature-editor-body">
            ${this._renderClimateToggle("climateCardShowControlMode", "climate_show_control_mode")}
            ${this._renderClimateActionsGroup()}
            ${this._renderClimateToggle("climateCardShowTargetControl", "climate_show_target_control")}
            ${this._renderClimateToggle("climateCardShowHvacModeControl", "climate_show_hvac_mode_control")}
            ${this._renderClimateToggle("climateCardShowNativeClimateLink", "climate_show_native_climate_link")}
            <small class="option-description">${this._t("climateCardThermostatControlsDescription")}</small>
          </div>
        </div>
      </details>
      <details class="climate-card-option-group climate-card-current-editor" open>
        <summary><span class="section-label">${this._t("climateCardCurrentState")}</span><ha-icon icon="mdi:chevron-down"></ha-icon></summary>
        <div class="climate-card-option-content">
        ${this._renderClimateToggle("climateCardCollapsedByDefault", "climate_current_state_default_collapsed")}
        ${this._renderClimateToggle("climateCardShowCurrentTemperature", "climate_show_current_temperature")}
        ${this._renderClimateToggle("climateCardShowCurrentHumidity", "climate_show_current_humidity")}
        ${this._config.climate_show_current_humidity !== false ? html`<div class="nested-option climate-card-humidity-source"><label><span>${this._t("climateCardHumiditySource")}</span><select .value=${selectedHumidityEntity ?? ""} @change=${(event: Event) => this._setStringConfig("climate_humidity_entity", this._inputValue(event))}>
          <option value="" ?selected=${!selectedHumidityEntity}>${this._t("climateCardHumidityClimateSource")}</option>
          ${availableHumiditySensors.map((entityId) => html`<option value=${entityId} ?selected=${entityId === selectedHumidityEntity}>${this._friendlyEntityName(entityId)}</option>`)}
        </select><small>${this._t("climateCardHumiditySourceDescription")}</small></label></div>` : nothing}
        <label class="visibility-option"><input type="checkbox" .checked=${showOutdoor} ?disabled=${!temperatureSensors.length} @change=${(event: Event) => this._toggleClimateOutdoor(Boolean((event.currentTarget as HTMLInputElement).checked), temperatureSensors[0])}><span>${this._t("climateCardShowOutdoorTemperature")}</span></label>
        ${showOutdoor ? html`<div class="nested-option climate-card-outdoor-source"><label><span>${this._t("climateCardOutdoorSensor")}</span><select .value=${this._config.climate_outdoor_temperature_entity ?? ""} @change=${(event: Event) => this._setStringConfig("climate_outdoor_temperature_entity", this._inputValue(event))}>
          ${temperatureSensors.map((entityId) => html`<option value=${entityId} ?selected=${entityId === this._config.climate_outdoor_temperature_entity}>${this._friendlyEntityName(entityId)}</option>`)}
        </select><small>${this._t("climateCardOutdoorSensorDescription")}</small></label></div>` : nothing}
        <label class="visibility-option"><input type="checkbox" .checked=${showWindows} ?disabled=${!binarySensors.length} @change=${(event: Event) => this._toggleClimateWindows(Boolean((event.currentTarget as HTMLInputElement).checked), binarySensors[0])}><span>${this._t("climateCardShowWindows")}</span></label>
        ${showWindows ? html`<div class="nested-option climate-card-window-editor">
        <label><span>${this._t("climateCardWindowDisplay")}</span><select .value=${this._config.climate_window_display ?? "grouped"} @change=${(event: Event) => this._setStringConfig("climate_window_display", this._inputValue(event))}>
          <option value="grouped" ?selected=${!this._config.climate_window_display || this._config.climate_window_display === "grouped"}>${this._t("climateCardWindowGrouped")}</option><option value="individual" ?selected=${this._config.climate_window_display === "individual"}>${this._t("climateCardWindowIndividual")}</option>
        </select></label>
          ${windows.map((entityId, index) => html`<div class="climate-card-window-row"><select .value=${entityId} @change=${(event: Event) => this._updateWindowEntity(index, this._inputValue(event))}>
            ${binarySensors.map((candidate) => html`<option value=${candidate} ?selected=${candidate === entityId}>${this._friendlyEntityName(candidate)}</option>`)}
          </select><button type="button" class="icon-button" title=${this._t("remove")} @click=${() => this._removeWindowEntity(index)}><ha-icon icon="mdi:delete-outline"></ha-icon></button></div>`)}
          <button type="button" class="add-window" @click=${this._addWindowEntity}><ha-icon icon="mdi:plus"></ha-icon>${this._t("climateCardAddWindow")}</button>
          <small class="option-description">${this._t("climateCardWindowsDescription")} <a href=${WINDOW_PAUSE_BLUEPRINT_URL} target="_blank" rel="noopener noreferrer">${this._t("climateCardWindowBlueprintLink")}</a></small>
        </div>` : nothing}
        ${this._renderClimateToggle("climateCardShowComfort", "climate_show_comfort")}
        ${this._config.climate_show_comfort !== false ? html`<div class="nested-option visibility-list">
          ${this._renderClimateToggle("comfortHumidex", "climate_show_comfort_humidex")}
          ${this._renderClimateToggle("comfortDewPoint", "climate_show_comfort_dew_point")}
          ${this._renderClimateToggle("comfortAbsoluteHumidity", "climate_show_comfort_absolute_humidity")}
          <label class="visibility-option climate-card-collapsed-comfort-readings"><input type="checkbox" .checked=${this._config.climate_show_comfort_collapsed_readings === true} @change=${(event: Event) => this._setBooleanConfig("climate_show_comfort_collapsed_readings", Boolean((event.currentTarget as HTMLInputElement).checked), false)}><span>${this._t("climateCardShowCollapsedComfortReadings")}</span></label>
        </div>` : nothing}
        </div>
      </details>
      <details class="climate-card-option-group climate-card-timeline-editor" open>
        <summary><span class="section-label">${this._t("todayTimeline")}</span><ha-icon icon="mdi:chevron-down"></ha-icon></summary>
        <div class="climate-card-option-content">
        <label class="visibility-option"><input type="checkbox" .checked=${showTimeline} @change=${(event: Event) => this._setBooleanConfig("climate_show_timeline", Boolean((event.currentTarget as HTMLInputElement).checked))}><span>${this._t("climateCardShowTimeline")}</span></label>
        ${showTimeline ? html`<div class="nested-option visibility-list">
          ${this._renderClimateToggle("climateCardTimelineShowTitle", "climate_show_timeline_title")}
          ${this._renderClimateToggle("climateCardTimelineShowProfile", "climate_show_timeline_profile")}
          ${this._renderClimateToggle("climateCardTimelineShowMode", "climate_show_timeline_mode")}
        </div>` : nothing}
        </div>
      </details>
      ${this._renderClimateRoomAssistGroup()}
      <details class="climate-card-option-group climate-card-preconditioning-editor" open>
        <summary><span class="section-label">${this._t("preconditioning")}</span><ha-icon icon="mdi:chevron-down"></ha-icon></summary>
        <div class="climate-card-option-content climate-card-feature-editor-body">
          <label class="visibility-option"><input type="checkbox" .checked=${showPreconditioning} @change=${(event: Event) => this._setBooleanConfig("climate_show_preconditioning", Boolean((event.currentTarget as HTMLInputElement).checked))}><span>${this._t("climateCardShowPreconditioning")}</span></label>
          ${showPreconditioning ? html`<label class="nested-option"><span>${this._t("climateCardPreconditioningDisplay")}</span><select .value=${preconditioningDisplay} @change=${(event: Event) => this._setStringConfig("climate_preconditioning_display", this._inputValue(event))}>
            <option value="both" ?selected=${preconditioningDisplay === "both"}>${this._t("climateCardDisplayBoth")}</option>
            <option value="chart" ?selected=${preconditioningDisplay === "chart"}>${this._t("climateCardDisplayChart")}</option>
            <option value="text" ?selected=${preconditioningDisplay === "text"}>${this._t("climateCardDisplayText")}</option>
          </select></label>
          ${preconditioningDisplay !== "text" ? html`<div class="nested-option visibility-list">
            ${this._renderClimateToggle("climateCardCollapsedByDefault", "climate_preconditioning_default_collapsed")}
          </div>` : nothing}` : nothing}
        </div>
      </details>
    </section>`;
  }

  private _setClimateEntity(entityId: string): void {
    if (!entityId) return;
    const next = { ...this._config, selected_entity: entityId };
    delete next.entities;
    delete next.climate_name;
    this._emitConfig(next);
  }

  private _setClimateName(value: string): void {
    this._emitConfig({ ...this._config, climate_name: value });
  }

  private _resetClimateName = (): void => {
    const next = { ...this._config };
    delete next.climate_name;
    this._emitConfig(next);
  };

  private _renderClimateToggle(label: TranslationKey, field: keyof VelairCardConfig) {
    return html`<label class="visibility-option"><input type="checkbox" .checked=${this._config[field] !== false} @change=${(event: Event) => this._setBooleanConfig(field, Boolean((event.currentTarget as HTMLInputElement).checked))}><span>${this._t(label)}</span></label>`;
  }

  private _renderClimateRoomAssistGroup() {
    const shown = this._config.climate_show_room_assist !== false;
    const display = this._config.climate_room_assist_display ?? "both";
    return html`<details class="climate-card-option-group climate-card-room-assist-editor" open>
      <summary><span class="section-label">${this._t("roomSensorAssistBadge")}</span><ha-icon icon="mdi:chevron-down"></ha-icon></summary>
      <div class="climate-card-option-content climate-card-feature-editor-body">
        <label class="visibility-option"><input type="checkbox" .checked=${shown} @change=${(event: Event) => this._setBooleanConfig("climate_show_room_assist", Boolean((event.currentTarget as HTMLInputElement).checked))}><span>${this._t("climateCardShowRoomAssist")}</span></label>
        ${shown ? html`<label class="nested-option"><span>${this._t("climateCardRoomAssistDisplay")}</span><select .value=${display} @change=${(event: Event) => this._setStringConfig("climate_room_assist_display", this._inputValue(event))}>
          <option value="both" ?selected=${display === "both"}>${this._t("climateCardDisplayBoth")}</option>
          <option value="chart" ?selected=${display === "chart"}>${this._t("climateCardDisplayChart")}</option>
          <option value="text" ?selected=${display === "text"}>${this._t("climateCardDisplayText")}</option>
        </select></label>
        ${display !== "text" ? html`<div class="nested-option visibility-list">
          ${this._renderClimateToggle("climateCardCollapsedByDefault", "climate_room_assist_default_collapsed")}
        </div>` : nothing}` : nothing}
      </div>
    </details>`;
  }

  private _renderClimateActionsGroup() {
    const shown = this._config.climate_show_actions !== false;
    const actions = climateCardConfiguredActions(this._config);
    const scripts = Object.keys(this.hass?.states ?? {})
      .filter((entityId) => entityId.startsWith("script."))
      .sort((left, right) => this._friendlyEntityName(left).localeCompare(this._friendlyEntityName(right)));
    return html`<details class="climate-card-actions-editor" open>
      <summary><span class="section-label">${this._t("climateCardActions")}</span><ha-icon icon="mdi:chevron-down"></ha-icon></summary>
      <div class="climate-card-option-content">
      ${this._renderClimateToggle("climateCardShowActions", "climate_show_actions")}
      ${shown ? html`<div class="climate-card-feature-editor-body">
        <div class="climate-card-custom-actions">
          <div><small>${this._t("climateCardActionsOrderDescription")}</small><small>${this._t("climateCardCustomActionsDescription")}</small></div>
          ${actions.map((action, index) => this._renderClimateAction(action, index, actions.length, scripts))}
          <button class="add-window" type="button" ?disabled=${!scripts.length} @click=${() => this._addClimateCustomAction(scripts[0])}><ha-icon icon="mdi:plus"></ha-icon>${this._t("climateCardAddCustomAction")}</button>
          ${scripts.length ? nothing : html`<small class="option-description">${this._t("climateCardNoScripts")}</small>`}
        </div>
      </div>` : nothing}
      </div>
    </details>`;
  }

  private _renderClimateAction(action: ClimateCardAction, index: number, count: number, scripts: string[]) {
    const builtIn = action.type === "boost" || action.type === "pause";
    const boost = action.type === "boost";
    const name = builtIn
      ? this._t(boost ? "boost" : "pause")
      : action.name || this._friendlyEntityName(action.script);
    const subtitle = builtIn ? this._t("climateCardProvidedByVelair") : action.script;
    const icon = builtIn
      ? (boost ? "mdi:lightning-bolt" : "mdi:pause-circle")
      : validClimateCardActionIcon(action.icon) ?? "mdi:script-text-outline";
    const color = builtIn
      ? undefined
      : validClimateCardActionColor(action.color) ?? "var(--primary-color)";
    const expanded = this._expandedClimateAction === index;
    return html`<div class=${`climate-card-action-editor ${builtIn ? `climate-card-fixed-action ${action.type}` : "climate-card-custom-action"}`}>
      <div class="climate-card-action-heading">
        ${this._renderClimateActionMoveControls(index, count)}
        <ha-icon icon=${icon} style=${color ? `color:${color}` : ""}></ha-icon>
        <span><strong>${name}</strong><small>${subtitle}</small></span>
        ${builtIn ? nothing : html`<button class="icon-button climate-card-action-remove" type="button" title=${this._t("climateCardRemoveCustomAction")} aria-label=${this._t("climateCardRemoveCustomAction")} @click=${() => this._removeClimateCustomAction(index)}><ha-icon icon="mdi:delete-outline"></ha-icon></button>`}
        <button class="icon-button climate-card-action-disclosure" type="button" aria-expanded=${String(expanded)} aria-label=${this._t(expanded ? "climateCardCollapseAction" : "climateCardExpandAction", { name })} @click=${() => this._toggleClimateActionExpanded(index)}><ha-icon icon="mdi:chevron-down"></ha-icon></button>
      </div>
      ${expanded ? html`<div class="climate-card-custom-action-body">
        ${builtIn ? html`
          <label class="visibility-option"><input type="checkbox" aria-label=${this._t(boost ? "climateCardShowBoostAction" : "climateCardShowPauseAction")} .checked=${action.enabled !== false} @change=${(event: Event) => this._toggleClimateAction(index, Boolean((event.currentTarget as HTMLInputElement).checked))}><span>${this._t(boost ? "climateCardShowBoostAction" : "climateCardShowPauseAction")}</span></label>
          ${this._renderClimateActionPlacement(action, index)}
          ${this._renderClimateActionNameVisibility(action, index)}
        ` : html`
          ${this._renderClimateActionPlacement(action, index)}
          ${this._renderClimateActionNameVisibility(action, index)}
          ${this._renderClimateCustomActionFields(action, index, scripts)}
        `}
      </div>` : nothing}
    </div>`;
  }

  private _renderClimateActionMoveControls(index: number, count: number) {
    return html`<div class="climate-card-custom-action-controls">
      <button class="icon-button" type="button" title=${this._t("moveUp")} ?disabled=${index === 0} @click=${() => this._moveClimateAction(index, -1)}><ha-icon icon="mdi:arrow-up"></ha-icon></button>
      <button class="icon-button" type="button" title=${this._t("moveDown")} ?disabled=${index === count - 1} @click=${() => this._moveClimateAction(index, 1)}><ha-icon icon="mdi:arrow-down"></ha-icon></button>
    </div>`;
  }

  private _renderClimateActionPlacement(action: ClimateCardAction, index: number) {
    const placement = action.placement ?? "auto";
    return html`<label><span>${this._t("climateCardActionPlacement")}</span><select .value=${placement} @change=${(event: Event) => this._updateClimateActionPlacement(index, this._inputValue(event))}>
      <option value="auto" ?selected=${placement === "auto"}>${this._t("climateCardActionPlacementAuto")}</option>
      <option value="more" ?selected=${placement === "more"}>${this._t("climateCardActionPlacementMore")}</option>
    </select><small class="option-description">${this._t(placement === "more" ? "climateCardActionPlacementMoreDescription" : "climateCardActionPlacementAutoDescription")}</small></label>`;
  }

  private _renderClimateActionNameVisibility(action: ClimateCardAction, index: number) {
    return html`<label class="visibility-option"><input type="checkbox" .checked=${action.hide_name === true} @change=${(event: Event) => this._toggleClimateActionName(index, Boolean((event.currentTarget as HTMLInputElement).checked))}><span>${this._t("climateCardHideActionName")}</span></label>`;
  }

  private _renderClimateCustomActionFields(action: ClimateCardCustomAction & { type: "script" }, index: number, scripts: string[]) {
    const availableScripts = action.script && !scripts.includes(action.script)
      ? [action.script, ...scripts]
      : scripts;
    return html`
      <label><span>${this._t("climateCardCustomActionName")}</span><input type="text" maxlength="60" .value=${action.name} @input=${(event: Event) => this._updateClimateCustomAction(index, "name", this._inputValue(event))}></label>
      <label><span>${this._t("climateCardCustomActionScript")}</span><select .value=${action.script} @change=${(event: Event) => this._selectClimateCustomActionScript(index, this._inputValue(event))}>
        ${availableScripts.map((entityId) => html`<option value=${entityId} ?selected=${entityId === action.script}>${scripts.includes(entityId) ? this._friendlyEntityName(entityId) : `${entityId} · ${this._t("climateCardScriptUnavailable")}`}</option>`)}
      </select></label>
      <div class="climate-card-custom-action-appearance">
        <label><span class="climate-card-custom-action-icon-heading">${this._t("climateCardCustomActionIcon")}<a href="https://pictogrammers.com/library/mdi/" target="_blank" rel="noopener noreferrer">${this._t("profileBrowseIcons")}</a></span><input type="text" spellcheck="false" placeholder="mdi:script-text-outline" .value=${action.icon ?? ""} @input=${(event: Event) => this._updateClimateCustomAction(index, "icon", this._inputValue(event))}></label>
        <label><span>${this._t("climateCardCustomActionColor")}</span><input type="color" .value=${validClimateCardActionColor(action.color) ?? "#03a9f4"} @input=${(event: Event) => this._updateClimateCustomAction(index, "color", this._inputValue(event))}></label>
      </div>
      <label class="visibility-option"><input type="checkbox" .checked=${action.confirmation === true} @change=${(event: Event) => this._updateClimateCustomAction(index, "confirmation", Boolean((event.currentTarget as HTMLInputElement).checked))}><span>${this._t("climateCardCustomActionConfirmation")}</span></label>
    `;
  }

  private _toggleClimateOutdoor(checked: boolean, firstEntity?: string): void {
    const next = { ...this._config };
    if (checked) {
      delete next.climate_show_outdoor_temperature;
      if (!next.climate_outdoor_temperature_entity && firstEntity) next.climate_outdoor_temperature_entity = firstEntity;
    } else {
      next.climate_show_outdoor_temperature = false;
    }
    this._emitConfig(next);
  }

  private _toggleClimateWindows(checked: boolean, firstEntity?: string): void {
    const next = { ...this._config };
    if (checked) {
      delete next.climate_show_windows;
      if (!(next.climate_window_entities?.length) && firstEntity) next.climate_window_entities = [firstEntity];
    } else {
      next.climate_show_windows = false;
    }
    this._emitConfig(next);
  }

  private _addClimateCustomAction(script?: string): void {
    if (!script) return;
    const action: ClimateCardAction = {
      type: "script",
      name: this._friendlyEntityName(script),
      script,
      icon: this.hass?.states?.[script]?.attributes?.icon ?? "mdi:script-text-outline",
      color: "#03a9f4",
      confirmation: false,
    };
    this._writeClimateActions([...climateCardConfiguredActions(this._config), action]);
  }

  private _updateClimateCustomAction(
    index: number,
    field: keyof ClimateCardCustomAction,
    value: string | boolean,
  ): void {
    const actions = [...climateCardConfiguredActions(this._config)];
    if (!actions[index] || actions[index].type !== "script") return;
    actions[index] = { ...actions[index], [field]: value };
    this._writeClimateActions(actions);
  }

  private _selectClimateCustomActionScript(index: number, script: string): void {
    const actions = [...climateCardConfiguredActions(this._config)];
    if (!actions[index] || actions[index].type !== "script" || !script) return;
    actions[index] = {
      ...actions[index],
      script,
      name: this._friendlyEntityName(script),
    };
    this._writeClimateActions(actions);
  }

  private _moveClimateAction(index: number, direction: -1 | 1): void {
    const actions = [...climateCardConfiguredActions(this._config)];
    const target = index + direction;
    if (!actions[index] || target < 0 || target >= actions.length) return;
    [actions[index], actions[target]] = [actions[target], actions[index]];
    this._expandedClimateAction = undefined;
    this._writeClimateActions(actions);
  }

  private _removeClimateCustomAction(index: number): void {
    this._expandedClimateAction = undefined;
    this._writeClimateActions(climateCardConfiguredActions(this._config).filter((_, candidate) => candidate !== index));
  }

  private _toggleClimateActionExpanded(index: number): void {
    this._expandedClimateAction = this._expandedClimateAction === index ? undefined : index;
  }

  private _updateClimateActionPlacement(index: number, placement: string): void {
    const actions = [...climateCardConfiguredActions(this._config)];
    const action = actions[index];
    if (!action || (placement !== "auto" && placement !== "more")) return;
    actions[index] = { ...action, placement };
    this._writeClimateActions(actions);
  }

  private _toggleClimateAction(index: number, enabled: boolean): void {
    const actions = [...climateCardConfiguredActions(this._config)];
    const action = actions[index];
    if (!action || action.type === "script") return;
    actions[index] = { ...action, enabled };
    this._writeClimateActions(actions);
  }

  private _toggleClimateActionName(index: number, hidden: boolean): void {
    const actions = [...climateCardConfiguredActions(this._config)];
    const action = actions[index];
    if (!action) return;
    const updated: ClimateCardAction = { ...action };
    if (hidden) updated.hide_name = true;
    else delete updated.hide_name;
    actions[index] = updated;
    this._writeClimateActions(actions);
  }

  private _writeClimateActions(actions: ClimateCardAction[]): void {
    const next = { ...this._config, climate_actions: actions };
    delete next.climate_custom_actions;
    delete next.climate_show_boost_action;
    delete next.climate_show_pause_action;
    this._emitConfig(next);
  }

  private _setStringConfig(field: keyof VelairCardConfig, value: string): void {
    const next = { ...this._config };
    if (value) (next as Record<string, unknown>)[field] = value;
    else delete next[field];
    this._emitConfig(next);
  }

  private _setBooleanConfig(field: keyof VelairCardConfig, checked: boolean, checkedIsDefault = true): void {
    const next = { ...this._config };
    if (checked === checkedIsDefault) delete next[field];
    else (next as Record<string, unknown>)[field] = checked;
    this._emitConfig(next);
  }

  private _addWindowEntity = (): void => {
    const first = Object.keys(this.hass?.states ?? {}).find((entityId) => entityId.startsWith("binary_sensor."));
    if (!first) return;
    this._emitConfig({ ...this._config, climate_window_entities: [...(this._config.climate_window_entities ?? []), first] });
  };

  private _updateWindowEntity(index: number, entityId: string): void {
    const windows = [...(this._config.climate_window_entities ?? [])];
    if (entityId) windows[index] = entityId;
    else windows.splice(index, 1);
    this._emitConfig({ ...this._config, climate_window_entities: windows });
  }

  private _removeWindowEntity(index: number): void {
    const windows = (this._config.climate_window_entities ?? []).filter((_, candidate) => candidate !== index);
    const next = { ...this._config };
    if (windows.length) next.climate_window_entities = windows;
    else delete next.climate_window_entities;
    this._emitConfig(next);
  }

  private _renderVisibilityOption(
    field: CardVisibilityField,
    label: TranslationKey,
  ) {
    return html`
      <label class="visibility-option">
        <input
          type="checkbox"
          .checked=${this._config[field] !== false}
          @change=${(event: Event) =>
            this._toggleBooleanConfig(
              field,
              Boolean((event.currentTarget as HTMLInputElement).checked),
            )}
        />
        <span>${this._t(label)}</span>
      </label>
    `;
  }

  private _renderZoneOrderRow(entityId: string, index: number, total: number) {
    const checked = this._selectedEntities().includes(entityId);
    return html`
      <div
        class="zone-row"
        draggable="true"
        @dragstart=${(event: DragEvent) => this._handleZoneDragStart(entityId, event)}
        @dragover=${(event: DragEvent) => this._handleZoneDragOver(event)}
        @drop=${(event: DragEvent) => this._handleZoneDrop(entityId, event)}
        @dragend=${this._handleZoneDragEnd}
      >
        <ha-icon icon="mdi:drag"></ha-icon>
        <label
          class="zone-visibility"
          title=${this._t(checked ? "cardThermostatVisible" : "cardThermostatHidden")}
          @click=${(event: Event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            .checked=${checked}
            ?disabled=${checked && this._selectedEntities().length <= 1}
            @change=${(event: Event) =>
              this._toggleEntityVisibility(entityId, Boolean((event.currentTarget as HTMLInputElement).checked))}
          />
        </label>
        <span>${this._friendlyEntityName(entityId)}</span>
        <div class="row-actions">
          <button
            class="icon-button"
            type="button"
            title=${this._t("moveUp")}
            ?disabled=${index === 0}
            @click=${() => this._moveZone(entityId, -1)}
          >
            <ha-icon icon="mdi:chevron-up"></ha-icon>
          </button>
          <button
            class="icon-button"
            type="button"
            title=${this._t("moveDown")}
            ?disabled=${index === total - 1}
            @click=${() => this._moveZone(entityId, 1)}
          >
            <ha-icon icon="mdi:chevron-down"></ha-icon>
          </button>
        </div>
      </div>
    `;
  }

  private async _loadManagedEntities(): Promise<void> {
    if (!this.hass || this._loading) {
      return;
    }

    this._loading = true;
    this._error = undefined;
    try {
      const data = await this.hass.connection.sendMessagePromise<ScheduleResponse>({
        type: "velair/get_schedule",
      });
      this._entities = data.configured_entities;
      this._loaded = true;
    } catch (error) {
      this._error = error instanceof Error ? error.message : this._t("unableLoad");
      this._entities = this._config.selected_entity ? [this._config.selected_entity] : [];
    } finally {
      this._loading = false;
    }
  }

  private _orderedEntities(): string[] {
    const entities = [...this._entities];
    if (this._config.selected_entity && !entities.includes(this._config.selected_entity)) {
      entities.unshift(this._config.selected_entity);
    }

    const knownEntities = new Set(entities);
    const orderedEntities = (this._config.zone_order ?? []).filter((entityId) => knownEntities.has(entityId));
    const unorderedEntities = entities.filter((entityId) => !orderedEntities.includes(entityId));
    return [...orderedEntities, ...unorderedEntities];
  }

  private _selectedEntities(): string[] {
    const entities = this._orderedEntities();
    const selectedEntities = this._config.entities?.filter((entityId) => entities.includes(entityId)) ?? [];
    return selectedEntities.length ? selectedEntities : entities;
  }

  private _updateConfig(field: "title", value: string): void {
    const nextConfig: VelairCardConfig = { ...this._config };
    const trimmed = value.trim();

    if (trimmed) {
      nextConfig[field] = trimmed;
    } else {
      delete nextConfig[field];
    }

    this._emitConfig(nextConfig);
  }

  private _updateFirstWeekday(value: string): void {
    const nextConfig: VelairCardConfig = { ...this._config };
    nextConfig.first_weekday = WEEKDAYS.includes(value) ? value : "monday";
    delete nextConfig.selected_weekday;
    this._emitConfig(nextConfig);
  }

  private _updateActiveSetupControls(value: string): void {
    const nextConfig: VelairCardConfig = { ...this._config };
    if (value === "modes" || value === "profiles") {
      nextConfig.active_setup_controls = value as ActiveSetupControls;
    } else {
      delete nextConfig.active_setup_controls;
    }
    this._emitConfig(nextConfig);
  }

  private _activeSetupControls(): ActiveSetupControls {
    const value = this._config.active_setup_controls;
    return value === "modes" || value === "profiles" ? value : "both";
  }

  private _toggleBooleanConfig(field: CardVisibilityField, checked: boolean): void {
    const nextConfig: VelairCardConfig = { ...this._config };
    if (checked) {
      delete nextConfig[field];
    } else {
      nextConfig[field] = false;
    }
    this._emitConfig(nextConfig);
  }

  private _moveZone(entityId: string, direction: -1 | 1): void {
    const entities = this._orderedEntities();
    const currentIndex = entities.indexOf(entityId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= entities.length) {
      return;
    }

    const nextEntities = [...entities];
    [nextEntities[currentIndex], nextEntities[nextIndex]] = [nextEntities[nextIndex], nextEntities[currentIndex]];
    this._updateZoneOrder(nextEntities);
  }

  private _handleZoneDragStart(entityId: string, event: DragEvent): void {
    this._draggedEntity = entityId;
    event.dataTransfer?.setData("text/plain", entityId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  }

  private _handleZoneDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  private _handleZoneDrop(targetEntityId: string, event: DragEvent): void {
    event.preventDefault();
    const draggedEntityId = event.dataTransfer?.getData("text/plain") || this._draggedEntity;
    this._draggedEntity = undefined;
    if (!draggedEntityId || draggedEntityId === targetEntityId) {
      return;
    }

    const entities = this._orderedEntities().filter((entityId) => entityId !== draggedEntityId);
    const targetIndex = entities.indexOf(targetEntityId);
    if (targetIndex < 0) {
      return;
    }

    entities.splice(targetIndex, 0, draggedEntityId);
    this._updateZoneOrder(entities);
  }

  private _handleZoneDragEnd = (): void => {
    this._draggedEntity = undefined;
  };

  private _updateZoneOrder(entityIds: string[]): void {
    const nextConfig: VelairCardConfig = {
      ...this._config,
      zone_order: entityIds,
    };
    delete nextConfig.selected_entity;
    this._emitConfig(nextConfig);
  }

  private _toggleEntityVisibility(entityId: string, checked: boolean): void {
    const entities = this._orderedEntities();
    const selectedEntities = new Set(this._selectedEntities());
    if (checked) {
      selectedEntities.add(entityId);
    } else if (selectedEntities.size > 1) {
      selectedEntities.delete(entityId);
    }

    const orderedSelection = entities.filter((candidate) => selectedEntities.has(candidate));
    const nextConfig: VelairCardConfig = { ...this._config };
    if (orderedSelection.length === entities.length) {
      delete nextConfig.entities;
    } else {
      nextConfig.entities = orderedSelection;
    }
    if (nextConfig.selected_entity && !orderedSelection.includes(nextConfig.selected_entity)) {
      delete nextConfig.selected_entity;
    }
    this._emitConfig(nextConfig);
  }

  private _emitConfig(nextConfig: VelairCardConfig): void {
    this._config = nextConfig;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: { config: nextConfig },
      }),
    );
  }

  private _inputValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement | HTMLSelectElement).value;
  }

  private _t(
    key: TranslationKey,
    replacements: Record<string, string | number> = {},
  ): string {
    return translate(this._language(), key, replacements);
  }

  private _updateView(value: string): void {
    const nextConfig: VelairCardConfig = { ...this._config };
    nextConfig.view = LOVELACE_CARD_VIEWS.includes(value as VelairCardView)
      ? value as VelairCardView
      : "overview-status";
    this._emitConfig(nextConfig);
  }

  private _language(): SupportedLanguage {
    return languageFromHass(this.hass);
  }

  private _firstWeekday(): string {
    const configuredWeekday = this._config.first_weekday ?? this._config.selected_weekday ?? "monday";
    return WEEKDAYS.includes(configuredWeekday) ? configuredWeekday : "monday";
  }

  private _weekdayName(weekday: string): string {
    return weekdayName(this._language(), weekday);
  }

  private _viewLabel(view: VelairCardView): string {
    const labels: Record<VelairCardView, TranslationKey> = {
      "overview": "overview",
      "climate": "cardViewClimate",
      "profiles": "profiles",
      "modes": "modesTitle",
      "overview-status": "cardViewOverviewStatus",
      "overview-boosts": "cardViewOverviewBoosts",
      "overview-events": "cardViewOverviewEvents",
      "overview-timeline": "cardViewOverviewTimeline",
      "overview-zones": "cardViewOverviewZones",
      "active-setup": "cardViewActiveSetup",
      "schedules": "cardViewSchedules",
      "templates": "templates",
      "sensors": "cardViewSensors",
      "comfort": "cardViewComfort",
      "preconditioning": "cardViewPreconditioning",
      "diagnostics": "diagnostics",
      "settings": "settings",
    };
    return this._t(labels[view]);
  }

  private _selectedView(): VelairCardView {
    const configuredView = this._config.view;
    return configuredView && LOVELACE_CARD_VIEWS.includes(configuredView)
      ? configuredView
      : "overview-status";
  }

  private _showsFirstWeekdayOption(): boolean {
    return FIRST_WEEKDAY_CARD_VIEWS.has(this._selectedView());
  }

  private _showsActiveSetupControls(): boolean {
    return ACTIVE_SETUP_CONTROL_CARD_VIEWS.has(this._selectedView());
  }

  private _showsComfortVisibilityOptions(): boolean {
    return COMFORT_VISIBILITY_CARD_VIEWS.has(this._selectedView());
  }

  private _showsThermostatOptions(): boolean {
    return THERMOSTAT_FILTER_CARD_VIEWS.has(this._selectedView());
  }

  private _showsRoomAssistVisibilityOptions(): boolean {
    return ROOM_ASSIST_VISIBILITY_CARD_VIEWS.has(this._selectedView());
  }

  private _showsClimateCardOptions(): boolean {
    return CLIMATE_CARD_VIEWS.has(this._selectedView());
  }

  private _friendlyEntityName(entityId: string): string {
    return this.hass?.states?.[entityId]?.attributes?.friendly_name ?? entityId;
  }

  static styles = css`
    .editor {
      display: grid;
      gap: 16px;
      padding: 4px 0;
    }

    label span {
      color: var(--secondary-text-color);
      display: block;
      font-size: 12px;
      margin-bottom: 4px;
    }

    p {
      color: var(--secondary-text-color);
      font-size: 12px;
      margin: 4px 0 0;
    }

    .section-label {
      color: var(--primary-text-color);
      display: block;
      font-weight: 600;
    }

    input,
    select {
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      box-sizing: border-box;
      color: var(--primary-text-color);
      font: inherit;
      min-height: 40px;
      padding: 8px;
      width: 100%;
    }

    .climate-card-options, .climate-card-window-editor { display: grid; gap: 12px; }
    .climate-card-option-group { background: color-mix(in srgb, var(--secondary-background-color) 72%, var(--card-background-color)); border: 1px solid var(--divider-color); border-radius: 10px; padding: 11px; }
    .climate-card-actions-editor { background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 9px; padding: 9px 10px; }
    .climate-card-option-group > summary, .climate-card-actions-editor > summary { align-items: center; cursor: pointer; display: flex; gap: 8px; justify-content: space-between; list-style: none; min-height: 24px; }
    .climate-card-option-group > summary::-webkit-details-marker, .climate-card-actions-editor > summary::-webkit-details-marker { display: none; }
    .climate-card-option-group > summary > ha-icon, .climate-card-actions-editor > summary > ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color); flex: 0 0 auto; transition: transform .16s ease; }
    .climate-card-option-group[open] > summary > ha-icon, .climate-card-actions-editor[open] > summary > ha-icon { transform: rotate(180deg); }
    .climate-card-option-content { display: grid; gap: 10px; padding-top: 10px; }
    .climate-card-option-group label > small { color: var(--secondary-text-color); display: block; font-size: 11px; line-height: 1.4; margin-top: 5px; }
    .climate-card-name-row { align-items: center; display: grid; gap: 7px; grid-template-columns: minmax(0, 1fr) auto; }
    .climate-card-name-row .icon-button { min-height: 40px; width: 40px; }
    .climate-card-feature-editor-body { border-left: 2px solid color-mix(in srgb, var(--primary-color) 32%, var(--divider-color)); display: grid; gap: 9px; padding-left: 10px; }
    .nested-option { border-left: 2px solid color-mix(in srgb, var(--primary-color) 45%, var(--divider-color)); display: grid; gap: 8px; margin-left: 9px; padding-left: 10px; }
    .option-description { color: var(--secondary-text-color); font-size: 11px; line-height: 1.4; }
    .option-description a { color: var(--primary-color); }
    .climate-card-window-row { display: grid; gap: 8px; grid-template-columns: minmax(0, 1fr) auto; }
    .add-window { align-items: center; background: transparent; border: 1px dashed var(--divider-color); border-radius: 8px; color: var(--primary-color); cursor: pointer; display: inline-flex; gap: 6px; justify-content: center; padding: 8px; }
    .add-window:disabled { color: var(--disabled-text-color, var(--secondary-text-color)); cursor: default; opacity: .65; }
    .climate-card-custom-actions { border-top: 1px solid var(--divider-color); display: grid; gap: 10px; padding-top: 10px; }
    .climate-card-custom-actions > div:first-child { display: grid; gap: 3px; }
    .climate-card-custom-actions > div:first-child small { color: var(--secondary-text-color); line-height: 1.4; }
    .climate-card-action-editor { background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 9px; padding: 9px 10px; }
    .climate-card-action-heading { align-items: center; display: grid; gap: 7px; grid-template-columns: auto auto minmax(0, 1fr) auto auto; }
    .climate-card-action-heading > ha-icon { --mdc-icon-size: 20px; }
    .climate-card-fixed-action.boost .climate-card-action-heading > ha-icon { color: var(--warning-color, #e69b35); }
    .climate-card-fixed-action.pause .climate-card-action-heading > ha-icon { color: var(--info-color, #3aa7c9); }
    .climate-card-action-heading > span { display: grid; min-width: 0; }
    .climate-card-action-heading strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .climate-card-action-heading small { color: var(--secondary-text-color); font-size: 10px; line-height: 1.3; margin-top: 2px; overflow-wrap: anywhere; white-space: normal; }
    .climate-card-custom-action-body { border-top: 1px solid var(--divider-color); display: grid; gap: 9px; margin-top: 9px; padding-top: 10px; }
    .climate-card-custom-action-controls { display: flex; gap: 2px; }
    .climate-card-custom-action-controls .icon-button, .climate-card-action-heading > .icon-button { min-height: 36px; width: 36px; }
    .climate-card-action-disclosure ha-icon { transition: transform .16s ease; }
    .climate-card-action-disclosure { grid-column: -2 / -1; }
    .climate-card-action-disclosure[aria-expanded="true"] ha-icon { transform: rotate(180deg); }
    .climate-card-action-remove { color: color-mix(in srgb, var(--error-color, #db5a5a) 78%, var(--primary-text-color)); }
    .climate-card-action-remove:hover, .climate-card-action-remove:focus-visible { background: color-mix(in srgb, var(--error-color, #db5a5a) 10%, var(--card-background-color)); border-color: color-mix(in srgb, var(--error-color, #db5a5a) 45%, var(--divider-color)); }
    .climate-card-custom-action-appearance { display: grid; gap: 8px; grid-template-columns: minmax(0, 1fr) 72px; }
    label .climate-card-custom-action-icon-heading { align-items: baseline; display: flex; flex-wrap: wrap; gap: 4px 8px; }
    .climate-card-custom-action-icon-heading > a { color: var(--link-text-color, var(--primary-color)); font-size: 12px; line-height: 1.3; text-decoration: none; white-space: nowrap; }
    .climate-card-custom-action-icon-heading > a:hover { text-decoration: underline; }
    .climate-card-custom-action-icon-heading > a:focus-visible { border-radius: 3px; outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .climate-card-custom-action input[type="color"] { cursor: pointer; padding: 4px; }

    @media (prefers-reduced-motion: reduce) {
      .climate-card-option-group > summary > ha-icon, .climate-card-actions-editor > summary > ha-icon, .climate-card-action-disclosure ha-icon { transition: none; }
    }

    @media (max-width: 420px) {
      .climate-card-action-editor { padding-inline: 7px; }
      .climate-card-action-heading { gap: 4px; }
      .climate-card-custom-action-controls .icon-button, .climate-card-action-heading > .icon-button { min-height: 36px; width: 36px; }
    }

    .notice {
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 12px;
    }

    .notice.error {
      background: color-mix(in srgb, var(--error-color) 12%, transparent);
      border-color: var(--error-color);
    }

    .zone-order,
    .zone-list,
    .card-visibility-options,
    .visibility-list {
      display: grid;
      gap: 8px;
    }

    .zone-row {
      align-items: center;
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      cursor: grab;
      display: grid;
      gap: 8px;
      grid-template-columns: 24px 24px minmax(0, 1fr) auto;
      min-height: 42px;
      padding: 8px;
    }

    .zone-row:active {
      cursor: grabbing;
    }

    .zone-row span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .zone-visibility {
      align-items: center;
      display: inline-flex;
      justify-content: center;
      margin: 0;
      min-height: 24px;
    }

    .zone-visibility input {
      cursor: pointer;
      height: 16px;
      margin: 0;
      min-height: 0;
      padding: 0;
      width: 16px;
    }

    .zone-visibility input:disabled {
      cursor: default;
    }

    .visibility-option {
      align-items: center;
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      display: grid;
      gap: 8px;
      grid-template-columns: 20px minmax(0, 1fr);
      margin: 0;
      min-height: 42px;
      padding: 8px;
    }

    .visibility-option input {
      cursor: pointer;
      height: 16px;
      margin: 0;
      min-height: 0;
      padding: 0;
      width: 16px;
    }

    .visibility-option span {
      color: var(--primary-text-color);
      font-size: 13px;
      margin: 0;
    }

    .row-actions {
      display: inline-flex;
      gap: 4px;
    }

    .icon-button {
      align-items: center;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      color: var(--primary-text-color);
      cursor: pointer;
      display: inline-flex;
      height: 32px;
      justify-content: center;
      width: 32px;
    }

    .icon-button:disabled {
      cursor: default;
      opacity: 0.45;
    }

    .empty {
      color: var(--secondary-text-color);
      font-size: 12px;
    }
  `;
}
