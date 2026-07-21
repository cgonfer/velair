import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { live } from "lit/directives/live.js";
import { VelairApiClient } from "../api/client";
import { activateClimateProfile, deleteClimateProfile, saveClimateProfile } from "../controllers/climate-profile-actions";
import {
  activeClimateProfile,
  climateProfileAccentColor,
  climateProfileValidationError,
  createClimateProfileDraft,
  nextProfileBlockStart,
  profileZoneBehavior,
  uniqueClimateProfileName,
  withProfileZoneBehavior,
  type ClimateProfileDraft,
  type ClimateProfileDraftZone,
} from "../domain/climate-profiles";
import {
  climateFanModeOptions,
  climateHumidityLimits,
  climatePresetModeOptions,
  climateSupportedModes,
  climateSwingHorizontalModeOptions,
  climateSwingModeOptions,
  entityTemperatureLimits,
  entityTemperatureStep,
} from "../domain/climate";
import {
  addDraftBlock,
  draftBlockTemperatureError,
  draftBlocksFromScheduleBlocks,
  removeDraftBlock,
  updateDraftBlock,
} from "../domain/draft-blocks";
import { dateLocale, formatScheduleTime, formatTemperature } from "../domain/formatters";
import {
  handleTimelineDragEnd,
  handleTimelineDragOver,
  handleTimelineDragStart,
  handleTimelineDrop,
  handleTimelineResizeEnd,
  handleTimelineResizeMove,
  handleTimelineResizeStart,
  resizeTimelineBlock,
  sortDraftBlocks,
  timelineBlocks,
} from "../controllers/timeline-interactions";
import { dictionaryLabel, languageFromHass, translate, weekdayName } from "../i18n";
import { PROFILE_DESCRIPTION_MAX_LENGTH, WEEKDAYS } from "../constants";
import { orderedWeekdays, orderedZoneIds } from "../domain/settings";
import { cardStyles } from "../styles/card-styles";
import { profileStyles } from "../styles/profile-styles";
import type { VelairViewHost } from "../host-types";
import type {
  ClimateProfile,
  DraftScheduleBlock,
  HomeAssistant,
  ScheduleResponse,
} from "../types";
import type { TranslationKey } from "../translations";
import {
  editableBlockRowKey,
  renderAddBlockButton,
  renderDraftListHeader,
  renderEditableBlock,
  renderTimeline,
} from "../views/schedule-view";

export class VelairProfilesView extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ attribute: false }) public data?: ScheduleResponse;
  @property({ type: Boolean }) public compact = false;

  @state() private _selectedKey = "";
  @state() private _draft: ClimateProfileDraft = createClimateProfileDraft();
  @state() private _selectedDays: Record<string, string> = {};
  @state() private _busy?: "activate" | "save" | "delete";
  @state() private _dirty = false;
  @state() private _error?: string;
  @state() private _expandedZones = new Set<string>();

  protected willUpdate(changed: Map<string, unknown>): void {
    if (!changed.has("data")) {
      return;
    }
    const profiles = this.data?.profiles ?? [];
    const selected = profiles.find((profile) => profile.key === this._selectedKey);
    if (this._dirty) {
      if (this._selectedKey && !selected) {
        this._clearSelection();
        this._error = this._t("profileRemovedElsewhere");
      }
      return;
    }
    if (selected) {
      this._draft = createClimateProfileDraft(selected);
    } else if (this._selectedKey) {
      this._clearSelection();
    }
  }

  protected render() {
    const selector = this._renderActiveSelector();
    const notices = this._error
      ? html`<div class="notice error" role="alert">${this._error}</div>`
      : nothing;
    return this.compact ? html`${selector}${notices}` : html`
      <header class="profile-intro">
        <ha-icon icon="mdi:account-switch-outline"></ha-icon>
        <span>
          <strong>${this._t("profiles")}</strong>
          <small>${this._t("profilesPanelIntro")}</small>
        </span>
      </header>
      ${selector}
      ${notices}
      ${this._renderLibrary()}
    `;
  }

  private _renderLibrary() {
    const profiles = this.data?.profiles ?? [];
    const selected = profiles.find((profile) => profile.key === this._selectedKey);
    return html`
      <section class="template-library profile-library">
        <div class="template-library-layout">
          <div class="template-list-wrap">
            <div class="template-list-heading">
              <div class="section-heading">
                <ha-icon icon="mdi:account-switch-outline"></ha-icon>
                <span class="section-label">${this._t("profiles")} (${profiles.length})</span>
              </div>
              <button
                class="icon-button primary"
                type="button"
              ?disabled=${Boolean(this._busy)}
                @click=${() => void this._createProfile()}
                title=${this._t("profileCreate")}
              >
                <ha-icon icon="mdi:plus"></ha-icon>
              </button>
            </div>
            <div class="template-list profile-list" aria-label=${this._t("profiles")}>
              ${profiles.length
                ? profiles.map((profile) => this._renderListItem(profile))
                : html`<span class="empty profile-list-empty">${this._t("profileNoneCreated")}</span>`}
            </div>
          </div>
          <div class="template-detail profile-detail">
            ${selected
              ? this._renderEditor()
              : html`<div class="template-placeholder compact"><span>${this._t("profileSelectToBegin")}</span></div>`}
          </div>
        </div>
      </section>
    `;
  }

  private _renderListItem(profile: ClimateProfile) {
    const active = this.data?.global.active_profile_id === profile.key;
    const activationDisabled = active || Boolean(this._busy) || this._dirty;
    return html`
      <div
        class=${profile.key === this._selectedKey ? "template-item active" : "template-item"}
        style=${`--profile-item-accent: ${climateProfileAccentColor(profile.key, profile.color)}`}
      >
        <button
          class="template-item-main profile-item-main"
          type="button"
          aria-pressed=${String(profile.key === this._selectedKey)}
          @click=${() => this._selectProfile(profile)}
        >
          <ha-icon icon=${profile.icon || "mdi:account-outline"}></ha-icon>
          <span class="profile-item-copy">
            <strong>${profile.name}</strong>
            <code class="profile-item-id">${profile.key}</code>
            <span>${active ? this._t("profileActive") : profile.description || this._t("profileNoDescription")}</span>
          </span>
        </button>
        <button
          class=${active ? "icon-button success profile-item-activate active" : "icon-button success profile-item-activate"}
          type="button"
          aria-pressed=${String(active)}
          ?disabled=${activationDisabled}
          @click=${(event: Event) => {
            event.stopPropagation();
            void this._activate(profile.key);
          }}
          title=${active ? this._t("profileActive") : this._t("profileActivate")}
        >
          <ha-icon icon=${active ? "mdi:check-circle" : "mdi:play-circle-outline"}></ha-icon>
        </button>
        <button
          class="icon-button danger template-item-delete"
          type="button"
          ?disabled=${this._busy === "delete"}
          @click=${(event: Event) => {
            event.stopPropagation();
            void this._deleteProfile(profile);
          }}
          title=${this._t("profileDelete")}
        >
          <ha-icon icon="mdi:trash-can"></ha-icon>
        </button>
      </div>
    `;
  }

  private _renderActiveSelector() {
    const active = activeClimateProfile(this.data);
    const activeProfileId = this.data?.global.active_profile_id ?? "";
    const profiles = this.data?.profiles ?? [];
    return this._renderCompactActiveSelector(active, activeProfileId, profiles);
  }

  private _renderCompactActiveSelector(
    active: ClimateProfile | undefined,
    activeProfileId: string,
    profiles: ClimateProfile[],
  ) {
    const icon = active
      ? active.icon || "mdi:account-outline"
      : "mdi:calendar-clock-outline";
    const label = active?.name ?? this._t("profileNormal");
    const detail = active?.description || this._t("profileNormalDescription");
    return html`
      <section
        class="profile-active profile-active-compact"
        aria-label=${this._t("profileActive")}
        style=${`--profile-accent: ${climateProfileAccentColor(activeProfileId, active?.color)}`}
      >
        <span class="profile-compact-eyebrow">${this._t("profileOverviewLabel")}</span>
        <label class="profile-compact-picker">
          <span class="profile-compact-icon"><ha-icon icon=${icon}></ha-icon></span>
          <span class="profile-compact-copy">
            <strong>${label}</strong>
            <small>${detail}</small>
          </span>
          <span class="profile-compact-chevron" aria-hidden="true"></span>
          ${keyed(
            `compact-active-profile:${activeProfileId}:${profiles.map((profile) => profile.key).join(",")}`,
            html`
              <select
                aria-label=${this._t("profileActivate")}
                .value=${live(activeProfileId)}
                ?disabled=${Boolean(this._busy) || this._dirty}
                @change=${(event: Event) => void this._activate((event.currentTarget as HTMLSelectElement).value || null)}
              >
                <option value="" .selected=${activeProfileId === ""}>${this._t("profileNormal")}</option>
                ${profiles.map((profile) => html`
                  <option value=${profile.key} .selected=${activeProfileId === profile.key}>${profile.name}</option>
                `)}
              </select>
            `,
          )}
        </label>
      </section>
    `;
  }

  private _renderEditor() {
    const icon = this._draft.icon?.trim() || "mdi:account-outline";
    const iconValid = !this._draft.icon?.trim() || /^mdi:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(icon);
    const color = this._draft.color || climateProfileAccentColor(this._draft.key);
    const colorValid = /^#[0-9a-f]{6}$/i.test(color);
    const pickerColor = colorValid ? color : climateProfileAccentColor(this._draft.key);
    const descriptionLength = this._draft.description?.length ?? 0;
    const descriptionRemaining = PROFILE_DESCRIPTION_MAX_LENGTH - descriptionLength;
    const descriptionValid = descriptionRemaining >= 0;
    const hasScheduleValidationError = this._hasScheduleValidationError();
    return html`
      <section class="profile-editor">
        <div class="template-detail-heading profile-detail-heading">
          <div class="profile-heading-main">
            <label class="profile-name-field">
              <span class="profile-field-label">${this._t("profileName")}</span>
              <div class="profile-name-input-wrap">
                <ha-icon icon="mdi:pencil"></ha-icon>
                <input
                  aria-label=${this._t("profileName")}
                  .value=${this._draft.name}
                  @input=${(event: Event) => this._updateMetadata("name", event)}
                />
              </div>
            </label>
            <div class="profile-heading-id">
              <span>${this._t("profileId")}</span>
              <code>${this._draft.key}</code>
              ${this._dirty ? html`<span class="pill warning">${this._t("unsaved")}</span>` : nothing}
            </div>
          </div>
          <div class="template-detail-actions">
            <button
              class="icon-button primary"
              type="button"
              ?disabled=${Boolean(this._busy) || !this._draft.name.trim() || !iconValid || !colorValid || !descriptionValid || hasScheduleValidationError}
              @click=${() => void this._save()}
              title=${this._t("save")}
            >
              <ha-icon icon="mdi:content-save"></ha-icon>
            </button>
          </div>
        </div>
        <div class="metadata">
          <div class="profile-color-field profile-metadata-row">
            <label for="profile-color-picker">${this._t("profileColor")}</label>
            <span class="profile-color-input-wrap">
              <input
                id="profile-color-picker"
                type="color"
                .value=${pickerColor}
                @input=${(event: Event) => this._updateMetadata("color", event)}
                aria-label=${this._t("profileColor")}
              />
              <input
                id="profile-color-code"
                class=${colorValid ? "profile-color-code-input" : "profile-color-code-input invalid"}
                type="text"
                spellcheck="false"
                .value=${color}
                aria-label=${this._t("profileColor")}
                aria-invalid=${String(!colorValid)}
                @input=${(event: Event) => this._updateMetadata("color", event)}
              />
              ${colorValid ? nothing : html`<ha-icon class="profile-color-invalid-icon" icon="mdi:alert-circle"></ha-icon>`}
            </span>
            <small class=${colorValid ? "help" : "field-error"}>
              ${this._t(colorValid ? "profileColorHelp" : "profileInvalidColor")}
            </small>
          </div>
          <div class="profile-icon-field profile-metadata-row">
            <label for="profile-icon-input">${this._t("profileIcon")}</label>
            <span class="profile-icon-input-wrap">
              <span
                class=${!iconValid ? "profile-icon-preview invalid" : !colorValid ? "profile-icon-preview color-invalid" : "profile-icon-preview"}
                style=${iconValid && colorValid ? `--profile-draft-color: ${color}` : ""}
              >
                <ha-icon icon=${iconValid ? icon : "mdi:help-circle-outline"}></ha-icon>
              </span>
              <input
                id="profile-icon-input"
                class=${iconValid ? "" : "invalid"}
                .value=${this._draft.icon ?? ""}
                placeholder="mdi:account-outline"
                aria-invalid=${String(!iconValid)}
                @input=${(event: Event) => this._updateMetadata("icon", event)}
              />
            </span>
            <small class=${iconValid ? "help profile-icon-help" : "field-error profile-icon-help"}>
              <span>${this._t(iconValid ? "profileIconHelp" : "profileInvalidIcon")}</span>
              <a href="https://pictogrammers.com/library/mdi/" target="_blank" rel="noopener noreferrer">
                ${this._t("profileBrowseIcons")}
                <ha-icon icon="mdi:open-in-new"></ha-icon>
              </a>
            </small>
          </div>
          <div class="description profile-metadata-row">
            <label for="profile-description-input">${this._t("profileDescription")}</label>
            <textarea
              id="profile-description-input"
              maxlength=${PROFILE_DESCRIPTION_MAX_LENGTH}
              .value=${this._draft.description ?? ""}
              @input=${(event: Event) => this._updateMetadata("description", event)}
            ></textarea>
            <small class=${descriptionValid ? "profile-character-count" : "field-error"}>
              ${this._t("profileDescriptionCharactersRemaining", { count: Math.max(0, descriptionRemaining) })}
            </small>
          </div>
        </div>
        <div class="profile-zones">
          ${(this.data?.configured_entities ?? []).length
            ? orderedZoneIds(
                this.data?.configured_entities ?? [],
                this.data?.settings?.zone_order ?? [],
              ).map((entityId) => this._renderZone(entityId))
            : html`<span class="empty">${this._t("noManagedEntities")}</span>`}
        </div>
      </section>
    `;
  }

  private _renderZone(entityId: string) {
    const zone = this._draft.zones[entityId];
    const behavior = profileZoneBehavior(zone);
    const expanded = this._expandedZones.has(entityId);
    const contentId = `profile-zone-content-${entityId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
    const climateName = this.hass?.states?.[entityId]?.attributes?.friendly_name ?? entityId;
    const toggleLabel = this._t(expanded ? "profileCollapseClimate" : "profileExpandClimate", {
      climate: climateName,
    });
    const toggle = () => this._toggleZone(entityId);
    return html`
      <article class=${`profile-zone ${expanded ? "expanded" : "collapsed"}`}>
        <div
          class="zone-heading"
          @click=${(event: Event) => {
            const target = event.target;
            if (!(target instanceof Element) || !target.closest(".profile-zone-actions")) toggle();
          }}
        >
          <button
            class="profile-zone-toggle"
            type="button"
            title=${toggleLabel}
            aria-label=${toggleLabel}
            aria-expanded=${String(expanded)}
            aria-controls=${expanded ? contentId : nothing}
            @click=${(event: Event) => {
              event.preventDefault();
              event.stopPropagation();
              toggle();
            }}
          >
            <ha-icon icon=${expanded ? "mdi:chevron-down" : "mdi:chevron-right"}></ha-icon>
            <span class="profile-zone-identity">
              <strong title=${climateName}>${climateName}</strong>
              <span>${entityId}</span>
            </span>
          </button>
          <label class="profile-zone-actions" @click=${(event: Event) => event.stopPropagation()}>
            <span>${this._t("profileZoneBehavior")}</span>
            <span class="select-wrap">
              <select .value=${behavior} @change=${(event: Event) => this._setZoneBehavior(entityId, (event.currentTarget as HTMLSelectElement).value as ClimateProfileDraftZone["behavior"])}>
                <option value="normal">${this._t("profileBehaviorNormal")}</option>
                <option value="schedule">${this._t("profileBehaviorSchedule")}</option>
                <option value="pause">${this._t("profileBehaviorPause")}</option>
              </select>
            </span>
          </label>
        </div>
        ${expanded ? html`
          <div class="profile-zone-content" id=${contentId}>
            ${zone?.behavior === "pause" ? html`
              <label class="profile-pause-action"><span>${this._t("profilePauseAction")}</span>
                <span class="select-wrap">
                  <select .value=${zone.action} @change=${(event: Event) => this._setPauseAction(entityId, (event.currentTarget as HTMLSelectElement).value as "none" | "turn_off")}>
                    <option value="none">${this._t("profilePauseKeep")}</option>
                    <option value="turn_off">${this._t("profilePauseTurnOff")}</option>
                  </select>
                </span>
              </label>
            ` : nothing}
            ${zone?.behavior === "schedule" ? this._renderSchedule(entityId, zone) : nothing}
          </div>
        ` : nothing}
      </article>
    `;
  }

  private _renderSchedule(entityId: string, zone: Extract<ClimateProfileDraftZone, { behavior: "schedule" }>) {
    const weekdays = orderedWeekdays(this.data?.settings?.first_weekday ?? WEEKDAYS[0]);
    const weekday = this._selectedDays[entityId] ?? weekdays[0];
    const blocks = zone.schedule[weekday] ?? [];
    const blockHost = this._blockEditorHost(entityId, weekday);
    return html`
      <div class="profile-week">
        <div class="day-tabs">
          ${weekdays.map((day) => html`
            <button
              type="button"
              class=${day === weekday ? "day-tab active" : "day-tab"}
              aria-pressed=${String(day === weekday)}
              @click=${() => this._selectDay(entityId, day)}
            >
              <span>${weekdayName(languageFromHass(this.hass), day).slice(0, 3)}</span>
              <strong>${zone.schedule[day]?.length ?? 0}</strong>
            </button>
          `)}
        </div>
        ${renderTimeline(blockHost, entityId, "template")}
        <div class="schedule-config-helper">${this._t("templateOptionalHint")}</div>
        <div class="schedule-config-row profile-schedule-config-row">
          <div class="template-panel">
            <div>
              <span class="label">${this._t("templates")}</span>
              <span class="select-wrap profile-template-select">
                <select
                  aria-label=${this._t("selectTemplatePlaceholder")}
                  ?disabled=${!this.data?.templates?.length}
                  @change=${(event: Event) => this._copyTemplate(entityId, weekday, event.currentTarget as HTMLSelectElement)}
                >
                  ${this.data?.templates?.length
                    ? html`
                        <option value="">${this._t("selectTemplatePlaceholder")}</option>
                        ${this.data.templates.map((template) => html`<option value=${template.key}>${template.name}</option>`)}
                      `
                    : html`<option value="">${this._t("noTemplates")}</option>`}
                </select>
              </span>
            </div>
          </div>
        </div>
        <div class="draft-list profile-block-list">
          ${blocks.length
            ? html`
                ${renderDraftListHeader(blockHost, "template")}
                ${blocks.map((block, index) => keyed(
                  editableBlockRowKey("template", `${this._selectedKey}:${entityId}`, weekday, index),
                  renderEditableBlock(blockHost, block, index, "template"),
                ))}
                ${renderAddBlockButton(blockHost, "template")}
              `
            : renderAddBlockButton(blockHost, "template")}
        </div>
      </div>
    `;
  }

  private _clearSelection = (): void => {
    this._selectedKey = "";
    this._draft = createClimateProfileDraft();
    this._expandedZones = new Set();
    this._setDirty(false);
    this._clearNotices();
  };

  private async _createProfile(): Promise<void> {
    if (this._dirty && !window.confirm(this._t("profileDiscardChanges"))) {
      return;
    }
    const api = this.hass ? new VelairApiClient(this.hass) : undefined;
    if (!api || this._busy) return;
    const name = uniqueClimateProfileName(this._t("profileNewName"), this.data?.profiles ?? []);
    this._busy = "save";
    this._clearNotices();
    try {
      const data = await saveClimateProfile(api, { ...createClimateProfileDraft(), name });
      this._emitData(data);
      const created = data.profiles?.find((profile) => profile.key === data.profile_id)
        ?? data.profiles?.find((profile) => profile.name === name);
      if (created) {
        this._selectedKey = created.key;
        this._draft = createClimateProfileDraft(created);
        this._expandedZones = new Set();
      }
      this._setDirty(false);
      this._showSuccess(this._t("profileSaved"));
    } catch (error) {
      this._error = this._errorMessage(error, "profileInvalidSchedule");
    } finally {
      this._busy = undefined;
    }
  }

  private _selectProfile(profile: ClimateProfile): void {
    if (this._dirty && !window.confirm(this._t("profileDiscardChanges"))) {
      return;
    }
    this._selectedKey = profile.key;
    this._draft = createClimateProfileDraft(profile);
    this._expandedZones = new Set();
    this._setDirty(false);
    this._clearNotices();
  }

  private _updateMetadata(field: "name" | "icon" | "color" | "description", event: Event): void {
    this._draft = { ...this._draft, [field]: (event.currentTarget as HTMLInputElement | HTMLTextAreaElement).value };
    this._setDirty(true);
  }

  private _setZoneBehavior(entityId: string, behavior: ClimateProfileDraftZone["behavior"]): void {
    this._draft = withProfileZoneBehavior(this._draft, entityId, behavior);
    this._setDirty(true);
  }

  private _setPauseAction(entityId: string, action: "none" | "turn_off"): void {
    this._draft = { ...this._draft, zones: { ...this._draft.zones, [entityId]: { behavior: "pause", action } } };
    this._setDirty(true);
  }

  private _selectDay(entityId: string, weekday: string): void {
    this._selectedDays = { ...this._selectedDays, [entityId]: weekday };
  }

  private _toggleZone(entityId: string): void {
    const expanded = new Set(this._expandedZones);
    if (expanded.has(entityId)) expanded.delete(entityId);
    else expanded.add(entityId);
    this._expandedZones = expanded;
  }

  private _blocks(entityId: string, weekday: string): DraftScheduleBlock[] {
    const zone = this._draft.zones[entityId];
    return zone?.behavior === "schedule" ? [...(zone.schedule[weekday] ?? [])] : [];
  }

  private _setBlocks(entityId: string, weekday: string, blocks: DraftScheduleBlock[]): void {
    const zone = this._draft.zones[entityId];
    if (zone?.behavior !== "schedule") return;
    this._draft = { ...this._draft, zones: { ...this._draft.zones, [entityId]: { ...zone, schedule: { ...zone.schedule, [weekday]: blocks } } } };
    this._setDirty(true);
  }

  private _addBlock(entityId: string, weekday: string): void {
    const blocks = this._blocks(entityId, weekday);
    this._setBlocks(
      entityId,
      weekday,
      addDraftBlock(blocks, nextProfileBlockStart(blocks), this.data?.temperature_unit),
    );
  }

  private _removeBlock(entityId: string, weekday: string, index: number): void {
    this._setBlocks(entityId, weekday, removeDraftBlock(this._blocks(entityId, weekday), index));
  }

  private _updateBlock(entityId: string, weekday: string, index: number, field: keyof DraftScheduleBlock, value: string): void {
    this._setBlocks(entityId, weekday, updateDraftBlock(this._blocks(entityId, weekday), index, field, value));
  }

  private _copyTemplate(entityId: string, weekday: string, select: HTMLSelectElement): void {
    const key = select.value;
    if (!key) return;
    const template = this.data?.templates?.find((candidate) => candidate.key === key);
    if (template) {
      this._setBlocks(
        entityId,
        weekday,
        draftBlocksFromScheduleBlocks(template.blocks, this.data?.temperature_unit),
      );
    }
    select.value = "";
  }

  private _blockEditorHost(entityId: string, weekday: string): VelairViewHost {
    const state = this.hass?.states?.[entityId];
    const temperatureLimits = entityTemperatureLimits(state, this.data?.temperature_unit);
    const temperatureStep = entityTemperatureStep(state);
    const host: Record<string, unknown> = {
      classList: this.classList,
      renderRoot: this.renderRoot,
      _selectedEntity: entityId,
      _data: this.data,
      _t: (key: TranslationKey, replacements: Record<string, string | number> = {}) => this._t(key, replacements),
      _temperatureError: (block: DraftScheduleBlock) => this._temperatureError(entityId, block),
      _temperatureLimits: () => temperatureLimits,
      _temperatureStep: () => temperatureStep,
      _temperatureUnit: () => this.data?.temperature_unit ?? "°C",
      _hvacModeOptions: () => climateSupportedModes(state),
      _fanModeOptions: () => climateFanModeOptions(state),
      _presetModeOptions: () => climatePresetModeOptions(state),
      _swingModeOptions: () => climateSwingModeOptions(state),
      _swingHorizontalModeOptions: () => climateSwingHorizontalModeOptions(state),
      _humidityLimits: () => climateHumidityLimits(state),
      _modeLabel: (mode: string) => dictionaryLabel(languageFromHass(this.hass), "hvacModes", mode),
      _updateDraftBlock: (index: number, field: keyof DraftScheduleBlock, value: string) =>
        this._updateBlock(entityId, weekday, index, field, value),
      _removeBlock: (index: number) => this._removeBlock(entityId, weekday, index),
      _addBlock: () => this._addBlock(entityId, weekday),
      _inputValue: (event: Event) => (event.currentTarget as HTMLInputElement | HTMLSelectElement).value,
      _formatTemperatureLimit: (value: number) => this._formatTemperatureLimit(value),
      _currentTimelineNow: () => new Date(),
      _formatScheduleTime: (value: string) => formatScheduleTime(
        value,
        dateLocale(languageFromHass(this.hass)),
        this.hass?.locale?.time_format,
      ),
      _formatTemperature: (value: number) => formatTemperature(
        value,
        this.data?.temperature_unit ?? "°C",
      ),
      _blocksForSource: () => this._blocks(entityId, weekday),
      _setBlocksForSource: (_source: string, blocks: DraftScheduleBlock[]) =>
        this._setBlocks(entityId, weekday, blocks),
    };
    host._setDraftBlockStart = (
      index: number,
      start: string,
      options: { sort?: boolean } = {},
    ) => {
      const blocks = this._blocks(entityId, weekday);
      if (!blocks[index]) return;
      blocks[index] = { ...blocks[index], start };
      this._setBlocks(entityId, weekday, blocks);
      if (options.sort) sortDraftBlocks(host as never, "template");
    };
    host._sortDraftBlocksByStart = () => sortDraftBlocks(host as never, "template");
    host._resizeTimelineBlock = (index: number, edge: "start" | "end", minute: number) =>
      resizeTimelineBlock(host as never, index, edge, minute, "template");
    host._timelineBlocks = () => timelineBlocks(host as never, "template");
    host._handleTimelineDragStart = (index: number, source: "schedule" | "template", event: DragEvent) =>
      handleTimelineDragStart(host as never, index, source, event);
    host._handleTimelineDragOver = (event: DragEvent) => handleTimelineDragOver(event);
    host._handleTimelineDrop = (event: DragEvent, source: "schedule" | "template" = "template") =>
      handleTimelineDrop(host as never, event, source);
    host._handleTimelineDragEnd = () => handleTimelineDragEnd(host as never);
    host._handleTimelineResizeStart = (
      index: number,
      edge: "start" | "end",
      source: "schedule" | "template",
      event: PointerEvent,
    ) => handleTimelineResizeStart(host as never, index, edge, source, event);
    host._handleTimelineResizeMove = (event: PointerEvent) =>
      handleTimelineResizeMove(host as never, event);
    host._handleTimelineResizeEnd = (_event: PointerEvent) =>
      handleTimelineResizeEnd(host as never);
    return host as unknown as VelairViewHost;
  }

  private _formatTemperatureLimit(value: number): string {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  }

  private _temperatureError(entityId: string, block: DraftScheduleBlock): string | undefined {
    const state = this.hass?.states?.[entityId];
    const [minTemperature, maxTemperature] = entityTemperatureLimits(state, this.data?.temperature_unit);
    const temperatureStep = entityTemperatureStep(state);
    return draftBlockTemperatureError(block, {
      minTemperature,
      maxTemperature,
      temperatureStep,
      rangeError: this._t("invalidTemperatureRange", {
        min: this._formatTemperatureLimit(minTemperature),
        max: this._formatTemperatureLimit(maxTemperature),
      }),
      stepError: this._t("invalidTemperatureStep", {
        step: this._formatTemperatureLimit(temperatureStep ?? 1),
      }),
    });
  }

  private _hasScheduleValidationError(): boolean {
    if (climateProfileValidationError(this._draft) === "schedule") return true;
    return Object.entries(this._draft.zones).some(([entityId, zone]) =>
      zone.behavior === "schedule"
      && WEEKDAYS.some((weekday) => (zone.schedule[weekday] ?? []).some((block) =>
        Boolean(this._temperatureError(entityId, block)))),
    );
  }

  private async _activate(key?: string | null): Promise<void> {
    const api = this.hass ? new VelairApiClient(this.hass) : undefined;
    if (!api || this._busy) return;
    this._busy = "activate";
    this._clearNotices();
    try {
      this._emitData(await activateClimateProfile(api, key));
      this._showSuccess(this._t("profileActivated"));
    } catch (error) {
      this._error = this._errorMessage(error, "profileUnableActivate");
    } finally { this._busy = undefined; }
  }

  private async _save(): Promise<void> {
    const api = this.hass ? new VelairApiClient(this.hass) : undefined;
    if (!api || this._busy) return;
    this._busy = "save";
    this._clearNotices();
    try {
      const data = await saveClimateProfile(api, this._draft);
      this._emitData(data);
      const saved = data.profiles?.find((profile) => profile.key === (this._draft.key ?? data.profile_id))
        ?? data.profiles?.find((profile) => profile.name === this._draft.name.trim());
      if (saved) { this._selectedKey = saved.key; this._draft = createClimateProfileDraft(saved); }
      this._setDirty(false);
      this._showSuccess(this._t("profileSaved"));
    } catch (error) {
      this._error = error instanceof Error && error.message === "name"
        ? this._t("profileNameRequired")
        : error instanceof Error && error.message === "icon"
          ? this._t("profileInvalidIcon")
          : error instanceof Error && error.message === "color"
            ? this._t("profileInvalidColor")
          : error instanceof Error && error.message === "description"
            ? this._t("profileDescriptionTooLong", { count: PROFILE_DESCRIPTION_MAX_LENGTH })
          : this._errorMessage(error, "profileInvalidSchedule");
    } finally { this._busy = undefined; }
  }

  private async _deleteProfile(profile: ClimateProfile): Promise<void> {
    const api = this.hass ? new VelairApiClient(this.hass) : undefined;
    if (!api || this._busy) return;
    const active = this.data?.global.active_profile_id === profile.key;
    if (!window.confirm(this._t(active ? "profileConfirmDeleteActive" : "profileConfirmDelete", { profile: profile.name }))) return;
    this._busy = "delete";
    this._clearNotices();
    try {
      this._emitData(await deleteClimateProfile(api, profile.key));
      if (profile.key === this._selectedKey) this._clearSelection();
      this._showSuccess(this._t("profileDeleted"));
    } catch (error) {
      this._error = this._errorMessage(error, "profileUnableDelete");
    } finally { this._busy = undefined; }
  }

  private _emitData(data: ScheduleResponse): void {
    this.data = data;
    this.dispatchEvent(new CustomEvent("profile-data-changed", { bubbles: true, composed: true, detail: data }));
  }

  private _showSuccess(message: string): void {
    this.dispatchEvent(new CustomEvent("profile-success", {
      bubbles: true,
      composed: true,
      detail: message,
    }));
  }

  private _clearNotices(): void { this._error = undefined; }
  private _setDirty(dirty: boolean): void {
    if (this._dirty === dirty) return;
    this._dirty = dirty;
    this.dispatchEvent(new CustomEvent("profile-dirty-changed", {
      bubbles: true,
      composed: true,
      detail: dirty,
    }));
  }
  private _errorMessage(error: unknown, fallback: TranslationKey): string { return error instanceof Error && error.message && error.message !== "schedule" ? error.message : this._t(fallback); }
  private _t(key: TranslationKey, replacements: Record<string, string | number> = {}): string { return translate(languageFromHass(this.hass), key, replacements); }

  static styles = [cardStyles, profileStyles];
}

if (!customElements.get("velair-profiles-view")) {
  customElements.define("velair-profiles-view", VelairProfilesView);
}
