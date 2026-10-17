import { activeSetupSummary } from "../domain/active-setup";
import { timelinePresentation } from "../views/schedule-view";
import { timelineCarryOverFromWeeklySchedule } from "../domain/timeline";
import { backendErrorMessage } from "../domain/backend-errors";
import { PresetPreviewCache, presetPreviewKey } from "../domain/preset-preview";
import { resolvedResourceBlock } from "../domain/resource-display";
import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { renderInlineHelp } from "../views/inline-help";
import { renderDocumentationHelp } from "../views/documentation-links";
import { VelairApiClient } from "../api/client";
import { activateClimateProfile, deleteClimateProfile, saveClimateProfile } from "../controllers/climate-profile-actions";
import {
  climateProfileAccentColor,
  climateProfileInput,
  climateProfileValidationError,
  cloneProfileDayToDays,
  cloneProfileDayToClimates,
  createClimateProfileDraft,
  nextProfileBlockStart,
  profileZoneBehavior,
  profileDraftBlockInput,
  uniqueClimateProfileName,
  withProfileZoneBehavior,
  type ClimateProfileDraft,
  type ClimateProfileDraftZone,
} from "../domain/climate-profiles";
import { availableScheduleTemplates, newTemplateKey } from "../domain/templates";
import { bindingsFromBlocks, linkedDayBlocks, linkDraftDay, linkedDraftBlocks, preserveSlotIds } from "../domain/linked-schedules";
import {
  climateFanModeOptions,
  climateHumidityLimits,
  climatePresetModeOptions,
  climateTargetCompatibleForConfiguration,
  climateSupportedModes,
  climateSupportsRangeTarget,
  climateSupportsSingleTarget,
  climateSwingHorizontalModeOptions,
  climateSwingModeOptions,
  entityTemperatureLimits,
  entityTemperatureStep,
} from "../domain/climate";
import {
  addDraftBlock,
  draftBlockTemperatureError,
  draftBlockUsesRange,
  draftBlocksFromScheduleBlocks,
  firstUnsupportedModeBlock,
  filterBlocksForClimateOptions,
  removeDraftBlock,
  updateDraftBlock,
} from "../domain/draft-blocks";
import { dateLocale, formatScheduleTime, formatTemperature } from "../domain/formatters";
import {
  activeProfileOrigin,
  createVelairModeDraft,
  modeValidationError,
  type VelairModeDraft,
} from "../domain/modes";
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
import { dictionaryLabel, languageFromHass, shortWeekdayName, translate, weekdayName } from "../i18n";
import { ACTION_SET_CLIMATE_OPTIONS, ACTION_SET_TEMPERATURE, DEFAULT_TARGET_TEMP_STEP, PROFILE_DESCRIPTION_MAX_LENGTH, MODE_NAME_MAX_LENGTH, WEEKDAYS } from "../constants";
import { orderedWeekdays, orderedZoneIds } from "../domain/settings";
import {
  cloneDayPresetTargets,
  externalSwitchpointUsage,
  type CloneDayPreset,
} from "../domain/schedule-editor";
import { cardStyles } from "../styles/card-styles";
import { profileStyles } from "../styles/profile-styles";
import { NoticeTransitions, type DesiredNotice } from "../controllers/notice-transitions";
import type { VelairViewHost } from "../host-types";
import type {
  ActiveSetupControls,
  ClimateProfile,
  ClimateProfileInput,
  DraftScheduleBlock,
  HomeAssistant,
  VelairMode,
  ScheduleResponse,
  ScheduleBlock,
} from "../types";
import type { TranslationKey } from "../translations";
import {
  editableBlockRowKey,
  renderAddBlockButton,
  renderDraftListHeader,
  renderEditableBlock,
  presetConfigurationSummary,
  renderTimeline,
  renderLinkedHoursControl,
} from "../views/schedule-view";
import { dayGroups, dayGroupLabel, schedulesEqual, resolveDayLayout, dayConfigurationFingerprint, configurationFingerprint } from "../domain/day-layouts";
import { cloneThermostatsLabel, renderDayLayoutControls, renderScheduleDayTabs, renderDayScheduleConflict, renderGroupSaveSummary } from "../views/day-layout-controls";
import { renderWeeklyScheduleEditor } from "../views/weekly-schedule-editor";
import { renderContextualNoticeStack } from "../views/notice-view";
import { renderCloneDayPresets, renderExternalSwitchpointUsage } from "../views/schedule-editor-controls";

export class VelairProfilesView extends LitElement {
  public get scheduleSavePending(): boolean { return this._busy === "save"; }
  public focusUsage(usage: import("../types").ResourceUsage): void {
    if (this.scheduleSavePending) return;
    const profile = this.data?.profiles?.find((item) => item.key === usage.profile_key);
    if (!profile) return;
    this._selectProfile(profile);
    if (this._selectedKey !== profile.key) return;
    this._selectedEntity = usage.entity_id;
    this._selectedDays = { ...this._selectedDays, [usage.entity_id]: usage.weekday };
    this._expandedZones = new Set([usage.entity_id]);
  }
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ attribute: false }) public data?: ScheduleResponse;
  @property({ attribute: "initial-weekday" }) public initialWeekday = "";
  @property({ attribute: false }) public timelineNow?: Date;
  @property({ type: Boolean }) public compact = false;
  @property({ attribute: "active-setup-controls" })
  public activeSetupControls: ActiveSetupControls = "both";
  /**
   * Presentation boundary only. Profile and Mode persistence remains owned by
   * the existing backend APIs, while the panel can place each library in the
   * workspace where users expect to edit it.
   */
  @property({ type: String }) public workspace: "both" | "profiles" | "modes" = "both";
  @property({ type: Boolean, attribute: "schedule-workspace" }) public scheduleWorkspace = false;

  @state() private _distributionExpanded = false;
  @state() private _exceptionDetail: string | null | undefined;
  @state() private _selectedKey = "";
  @state() private _draft: ClimateProfileDraft = createClimateProfileDraft();
  @state() private _selectedDays: Record<string, string> = {};
  @state() private _cloneWeekdayTargets: Record<string, Set<string>> = {};
  @state() private _cloneClimateTargets: Record<string, Set<string>> = {};
  @state() private _busy?: "activate" | "save" | "delete" | "mode-save" | "mode-delete" | "mode-activate" | "template-save" | "materialize" | "clone";
  @state() private _dirty = false;
  private _configurationRevision?: number;
  private _groupCandidates = new Map<string, { draft: ClimateProfileDraft; selectedDay?: string; baseline?: string }>();
  private readonly _presetPreviews = new PresetPreviewCache();

  private _effectiveWeekday(entityId: string): string {
    const weekdays = orderedWeekdays(this.data?.settings?.first_weekday ?? WEEKDAYS[0]);
    return this._selectedDays[entityId] ?? (weekdays.includes(this.initialWeekday) ? this.initialWeekday : weekdays[0]);
  }

  private _presetPreviewKey(entityId: string, weekday: string, block: DraftScheduleBlock, index: number, draft = this._draft): string {
    const zone = draft.zones[entityId];
    return presetPreviewKey([this._selectedKey, this._selectedEntity, entityId, weekday, index, this.data?.configuration_revision, this.data?.temperature_unit, zone?.behavior === "schedule" ? zone.template_links?.[weekday] : undefined, zone?.behavior === "schedule" && zone.template_links?.[weekday]?.mode === "full" ? configurationFingerprint(climateProfileInput(draft).zones) : undefined], block);
  }

  private _effectivePresetBlock(entityId: string, weekday: string, block: DraftScheduleBlock, index: number, draft = this._draft): ScheduleBlock | undefined {
    const cached = this._presetPreviews.get(this._presetPreviewKey(entityId, weekday, block, index, draft))?.block;
    if (cached) return { ...cached, start: block.start };
    const resolved = block.preset_key ? resolvedResourceBlock(this.data, { source: "profile", profile_key: this._selectedKey, entity_id: entityId, weekday, start: block.start, slot_id: block.slot_id }, block.preset_key)?.block : undefined;
    if (resolved) this._presetPreviews.remember(this._presetPreviewKey(entityId, weekday, block, index, draft), resolved);
    return resolved ? { ...resolved, start: block.start } : undefined;
  }

  private _refreshPresetPreviews(): void {
    const visible = Object.entries(this._draft.zones).filter(([entityId, zone]) => zone.behavior === "schedule" && (entityId === this._selectedEntity || (!this.scheduleWorkspace && this._expandedZones.has(entityId))));
    const contexts = visible.flatMap(([entityId]) => {
      const selectedDay = this._effectiveWeekday(entityId);
      const candidate = this._groupCandidates.get(this._candidateKey(entityId, selectedDay));
      const previewDraft = candidate?.draft ?? this._draft;
      const week = Object.fromEntries(WEEKDAYS.map((day) => [day, this._blocks(entityId, day, previewDraft)]));
      const comparisonZone = climateProfileInput(previewDraft).zones[entityId];
      const selectedGroup = this._groupDays(entityId, selectedDay);
      const mixed = Boolean(candidate) || (comparisonZone?.behavior === "schedule" && !schedulesEqual(comparisonZone, selectedGroup));
      const previewDays = mixed ? selectedGroup : [selectedDay];
      const blocks = previewDays.flatMap((day) => week[day].map((block, index) => ({ entityId, weekday: day, selectedDay, block, index, previewDraft })));
      if (candidate?.selectedDay) blocks.push(...this._blocks(entityId, selectedDay).map((block, index) => ({ entityId, weekday: selectedDay, selectedDay, block, index, previewDraft: this._draft })));
      const carry = !mixed ? timelineCarryOverFromWeeklySchedule(week, selectedDay) : undefined;
      const carryZone = previewDraft.zones[entityId];
      if (carry && (carry.block.preset_key || (carryZone?.behavior === "schedule" && carryZone.template_links?.[carry.sourceWeekday]?.mode === "full"))) {
        const index = week[carry.sourceWeekday].findIndex((block) => block.start === carry.block.start);
        blocks.push({ entityId, weekday: carry.sourceWeekday, selectedDay, block: carry.block, index, previewDraft });
      }
      return blocks;
    });
    this._presetPreviews.retain(new Set(contexts.map(({ entityId, weekday, block, index, previewDraft }) => this._presetPreviewKey(entityId, weekday, block, index, previewDraft))));
    const profilePreviews = new Map<ClimateProfileDraft, ReturnType<VelairApiClient["previewProfile"]>>();
    for (const { entityId, weekday, selectedDay, block, index, previewDraft } of contexts) {
      const zone = previewDraft.zones[entityId];
      const full = zone?.behavior === "schedule" && zone.template_links?.[weekday]?.mode === "full";
      if ((!block.preset_key && !full) || this._effectivePresetBlock(entityId, weekday, block, index, previewDraft)) continue;
      const key = this._presetPreviewKey(entityId, weekday, block, index, previewDraft);
      const start = block.start;
      this._presetPreviews.request(key, async () => {
        if (!this.hass) throw new Error(this._t("unableLoad"));
        if (full) {
          let preview = profilePreviews.get(previewDraft);
          if (!preview) { preview = new VelairApiClient(this.hass).previewProfile(climateProfileInput(previewDraft)); profilePreviews.set(previewDraft, preview); }
          const response = await preview;
          if (response.configuration_revision !== this.data?.configuration_revision) throw new Error(this._t("linkedConfigurationUnavailable"));
          return response.resolved_schedules[entityId]?.[weekday]?.find((item) => item.start === start);
        }
        const response = await new VelairApiClient(this.hass).previewDailySchedule(entityId, weekday, { blocks: [{ start, preset_key: block.preset_key }] });
        return response.blocks.find((item) => item.start === start);
      }, () => (this._effectiveWeekday(entityId) === selectedDay || this._groupDays(entityId).includes(weekday)) && key === this._presetPreviewKey(entityId, weekday, this._blocks(entityId, weekday, previewDraft)[index] ?? {} as DraftScheduleBlock, index, previewDraft),
      () => this.requestUpdate(), () => undefined);
    }
  }

  @state() private _error?: string;
  @state() private _expandedZones = new Set<string>();
  @state() private _selectedModeKey = "";
  @state() private _modeEditorOpen = false;
  @state() private _modeDraft: VelairModeDraft = createVelairModeDraft();
  @state() private _modeDirty = false;
  @state() private _activeLibrary: "profiles" | "modes" = "profiles";
  @state() private _selectedEntity = "";
  @state() private _templateDialog?: { entityId: string; weekday: string; name: string; error?: string };
  @state() private _climateCloneDialog?: { entityId: string; weekday: string; targets: Set<string>; error?: string };
  private _dialogTrigger?: HTMLElement;
  private _templateSaveToken?: symbol;
  private readonly _validationNotices = new NoticeTransitions(() => this.requestUpdate());

  private readonly _handleDocumentClick = (event: MouseEvent): void => {
    const menu = this.shadowRoot?.querySelector<HTMLDetailsElement>(".active-setup-menu");
    if (!menu?.open || event.composedPath().includes(menu)) return;
    menu.open = false;
  };

  public connectedCallback(): void {
    super.connectedCallback();
    this.ownerDocument.addEventListener("click", this._handleDocumentClick);
  }

  public disconnectedCallback(): void {
    this.ownerDocument.removeEventListener("click", this._handleDocumentClick);
    this._validationNotices.dispose();
    super.disconnectedCallback();
  }

  private _localEntityIds(): string[] {
    return orderedZoneIds(
      this.data?.configured_entities ?? [],
      this.data?.settings?.zone_order ?? [],
    );
  }

  private _externalCapabilities(entityId: string) {
    const execution = this.data?.zones?.[entityId]?.execution;
    if (execution?.type !== "external") return undefined;
    return this.data?.external_execution?.systems?.find(
      (system) => system.provider === execution.provider,
    )?.capabilities;
  }

  private _isExternalEntity(entityId: string): boolean {
    return this.data?.zones?.[entityId]?.execution?.type === "external";
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("data")) {
      if (!activeSetupSummary(this.data).coverageSegments.length) this._distributionExpanded = false;
      if (this._exceptionDetail !== undefined && !activeSetupSummary(this.data).exceptionGroups.some((group) => group.profileId === this._exceptionDetail)) {
        this._exceptionDetail = undefined;
      }
      if (this._modeEditorOpen && this._selectedModeKey) {
        const selectedMode = this.data?.modes?.find((mode) => mode.key === this._selectedModeKey);
        if (!selectedMode) {
          this._clearModeSelection();
        } else if (!this._modeDirty) {
          this._modeDraft = createVelairModeDraft(selectedMode);
        }
      }
      const profiles = this.data?.profiles ?? [];
      const entityIds = this._localEntityIds();
      if (!this._selectedEntity || !entityIds.includes(this._selectedEntity)) {
        this._selectedEntity = entityIds[0] ?? "";
      }
      const selected = profiles.find((profile) => profile.key === this._selectedKey);
      if (this._dirty && this._selectedKey && !selected) {
        this._clearSelection();
        this._error = this._t("profileRemovedElsewhere");
      } else if (!this._dirty) {
        if (selected) {
          this._groupCandidates.clear();
          this._draft = createClimateProfileDraft(selected);
        } else if (this._selectedKey) {
          this._clearSelection();
        }
      }
    }
    this._validationNotices.sync(this._desiredValidationNotices());
  }

  protected updated(changed: Map<string, unknown>): void {
    this._refreshPresetPreviews();
    if (changed.has("_error") && this._error) {
      this.dispatchEvent(new CustomEvent("profile-error", {
        bubbles: true,
        composed: true,
        detail: this._error,
      }));
    }
  }

  protected render() {
    const selector = this._renderActiveSelector();
    if (this.compact) return html`${selector}`;
    if (this.workspace === "profiles") return html`
      ${this._renderLibrary()}
      ${this._renderTemplateDialog()}
      ${this._renderClimateCloneDialog()}
    `;
    if (this.workspace === "modes") return html`
      <section class="modes-view">
        <header class="profile-intro">
          <ha-icon icon="mdi:format-list-bulleted"></ha-icon>
          <span>
            <strong>${this._t("modesTitle")}</strong>
            <small>${this._t("modesDescription")} ${this._t("modesEntityNote")}</small>
          </span>
          ${renderDocumentationHelp({ hass: this.hass, _t: (key, values) => this._t(key, values) }, "profiles")}
        </header>
        ${selector}
        ${this._renderModes()}
      </section>
    `;
    return html`
      <header class="profile-intro">
        <ha-icon icon="mdi:account-switch-outline"></ha-icon>
        <span>
          <strong>${this._t("profilesAndModes")}</strong>
          <small>${this._t("profilesPanelIntro")}</small>
        </span>
        ${renderDocumentationHelp({ hass: this.hass, _t: (key, values) => this._t(key, values) }, "profiles")}
      </header>
      ${selector}
      ${this._renderLibrarySelector()}
      <div
        id="profiles-library-panel"
        role="tabpanel"
        aria-labelledby="profiles-library-tab"
        ?hidden=${this._activeLibrary !== "profiles"}
      >
        ${this._renderLibrary()}
      </div>
      <div
        id="modes-library-panel"
        role="tabpanel"
        aria-labelledby="modes-library-tab"
        ?hidden=${this._activeLibrary !== "modes"}
      >
        ${this._renderModes()}
      </div>
      ${this._renderTemplateDialog()}
      ${this._renderClimateCloneDialog()}
    `;
  }

  private _renderTemplateDialog() {
    const dialog = this._templateDialog;
    if (!dialog) return nothing;
    return html`
      <div class="profile-dialog-backdrop" @click=${(event: Event) => { if (event.target === event.currentTarget) this._closeTemplateDialog(); }}>
        <section class="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-template-dialog-title" @keydown=${(event: KeyboardEvent) => this._handleDialogKeydown(event, this._closeTemplateDialog)}>
          <h3 id="profile-template-dialog-title">${this._t("profileSaveDayTemplateTitle")}</h3>
          <p>${this._t("profileSaveDayTemplateDescription", { day: weekdayName(languageFromHass(this.hass), dialog.weekday) })}</p>
          <label for="profile-template-name">${this._t("customTemplateName")}</label>
          <input id="profile-template-name" .value=${dialog.name} @input=${(event: Event) => {
            this._templateDialog = { ...dialog, name: (event.currentTarget as HTMLInputElement).value, error: undefined };
          }} />
          ${dialog.error ? html`<div class="notice error profile-dialog-error" role="alert">${dialog.error}</div>` : nothing}
          <div class="profile-dialog-actions">
            <button type="button" @click=${this._closeTemplateDialog}>${this._t("cancel")}</button>
            <button class="command-button success" type="button" ?disabled=${!dialog.name.trim() || this._busy === "template-save"} @click=${this._saveDayAsTemplate}>${this._t("save")}</button>
          </div>
        </section>
      </div>`;
  }

  private _renderClimateCloneDialog() {
    const dialog = this._climateCloneDialog;
    if (!dialog) return nothing;
    const sourceName = this.hass?.states?.[dialog.entityId]?.attributes?.friendly_name ?? dialog.entityId;
    const days = this._groupDays(dialog.entityId, dialog.weekday);
    const grouped = days.length > 1;
    const targetNames = [...dialog.targets].map(
      (entityId) => this.hass?.states?.[entityId]?.attributes?.friendly_name ?? entityId,
    );
    const changed = [...dialog.targets].filter(
      (entityId) => profileZoneBehavior(this._draft.zones[entityId]) !== "schedule",
    );
    return html`
      <div class="profile-dialog-backdrop" @click=${(event: Event) => { if (event.target === event.currentTarget) this._closeClimateCloneDialog(); }}>
        <section class="profile-dialog profile-climate-clone-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-climate-clone-title" @keydown=${(event: KeyboardEvent) => this._handleDialogKeydown(event, this._closeClimateCloneDialog)}>
          <h3 id="profile-climate-clone-title">${this._t(grouped ? "profileCloneDaysClimatesTitle" : "profileCloneDayClimatesTitle")}</h3>
          <p>${grouped ? this._t("profileCloneDaysClimatesDescription", { days: dayGroupLabel(days, day => weekdayName(languageFromHass(this.hass), day), this._t("allDays")), source: sourceName })
            : this._t("profileCloneDayClimatesDescription", { day: weekdayName(languageFromHass(this.hass), dialog.weekday), source: sourceName })}</p>
          <p class="profile-dialog-target-summary">
            <strong>${this._t("profileCloneDayClimatesTargets")}:</strong>
            <span>${targetNames.join(", ")}</span>
          </p>
          <p class="profile-dialog-warning">${this._t(grouped ? "profileCloneDaysClimatesOverwrite" : "profileCloneDayClimatesOverwrite")}</p>
          ${changed.length ? html`<p class="profile-dialog-warning">${this._t("profileCloneDayClimatesBehaviorChange", { targets: changed.map((id) => this.hass?.states?.[id]?.attributes?.friendly_name ?? id).join(", ") })}</p>` : nothing}
          ${dialog.error ? html`<div class="notice error profile-dialog-error" role="alert">${dialog.error}</div>` : nothing}
          <div class="profile-dialog-actions">
            <button type="button" @click=${this._closeClimateCloneDialog}>${this._t("cancel")}</button>
            <button class="command-button success" type="button" ?disabled=${dialog.targets.size === 0 || Boolean(this._busy)} @click=${this._confirmCloneDayToClimates}>${this._t("cloneAction")}</button>
          </div>
        </section>
      </div>`;
  }

  private _renderLibrarySelector() {
    const profiles = this.data?.profiles ?? [];
    const modes = this.data?.modes ?? [];
    return html`
      <nav class="profile-library-selector" role="tablist" aria-label=${this._t("profileLibrarySelectorLabel")}>
        ${this._renderLibraryTab(
          "profiles",
          "mdi:account-switch-outline",
          this._t("profiles"),
          profiles.length,
          this._t("profilesLibraryDescription"),
        )}
        ${this._renderLibraryTab(
          "modes",
          "mdi:format-list-bulleted",
          this._t("modesTitle"),
          modes.length + 2,
          this._t("modesLibraryDescription"),
        )}
      </nav>
    `;
  }

  private _renderLibraryTab(
    library: "profiles" | "modes",
    icon: string,
    title: string,
    count: number,
    description: string,
  ) {
    const selected = this._activeLibrary === library;
    return html`
      <button
        id=${`${library}-library-tab`}
        class=${selected ? "profile-library-tab active" : "profile-library-tab"}
        type="button"
        role="tab"
        aria-selected=${String(selected)}
        aria-controls=${`${library}-library-panel`}
        tabindex=${selected ? "0" : "-1"}
        @click=${() => {
          this._activeLibrary = library;
        }}
        @keydown=${(event: KeyboardEvent) => this._handleLibraryTabKeydown(event, library)}
      >
        <ha-icon icon=${icon}></ha-icon>
        <span class="profile-library-tab-copy">
          <strong>${title}</strong>
          <small>${description}</small>
        </span>
        <span class="profile-library-tab-count" aria-label=${String(count)}>${count}</span>
      </button>
    `;
  }

  private _handleLibraryTabKeydown(event: KeyboardEvent, library: "profiles" | "modes"): void {
    let next: "profiles" | "modes" | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      next = library === "profiles" ? "modes" : "profiles";
    } else if (event.key === "Home") {
      next = "profiles";
    } else if (event.key === "End") {
      next = "modes";
    }
    if (!next) {
      return;
    }
    event.preventDefault();
    this._activeLibrary = next;
    void this.updateComplete.then(() => {
      this.shadowRoot?.querySelector<HTMLButtonElement>(`#${next}-library-tab`)?.focus();
    });
  }

  private _renderLibrary() {
    const profiles = this.data?.profiles ?? [];
    const selected = profiles.find((profile) => profile.key === this._selectedKey);
    return html`
      <section class="template-library profile-library">
        ${this.workspace === "profiles" ? nothing : html`<div class="library-concept-note">
          <ha-icon icon="mdi:account-switch-outline"></ha-icon>
          <span>
            <strong>${this._t("profiles")}</strong>
            <small>${this._t("profilesDescription")}</small>
          </span>
        </div>`}
        <div class="template-library-layout">
          <div class="template-list-wrap">
            <div class="template-list-heading">
              <div class="section-heading">
                <ha-icon icon="mdi:account-switch-outline"></ha-icon>
                <span class="section-label">${this._t("profiles")} (${profiles.length})</span>
                ${this.workspace === "profiles" && !this.scheduleWorkspace
                  ? renderDocumentationHelp({ hass: this.hass, _t: (key, values) => this._t(key, values) }, "profiles") : nothing}
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
    const summary = activeSetupSummary(this.data);
    const baseSelected = summary.baseProfileIds.includes(profile.key);
    const exceptionSelected = summary.exceptionGroups.some((group) => group.profileId === profile.key);
    const activationDisabled = Boolean(this._busy) || this._operationRunning() || this._dirty || this._modeDirty
      || this.activeSetupControls === "modes";
    return html`
      <div class=${["template-item", profile.key === this._selectedKey ? "active" : "",
        this.workspace === "profiles" ? "profile-definition-item" : ""].filter(Boolean).join(" ")}
        style=${`--profile-item-accent: ${climateProfileAccentColor(profile.key, profile.color)}`}
        @click=${(event: Event) => {
          if (!event.composedPath().some((target) => target instanceof HTMLButtonElement)) this._selectProfile(profile);
        }}>
        <button class="template-item-main profile-item-main" type="button"
          aria-pressed=${String(profile.key === this._selectedKey)} @click=${() => this._selectProfile(profile)}>
          <ha-icon icon=${profile.icon || "mdi:account-outline"}></ha-icon>
          <span class="profile-item-copy"><strong>${profile.name}</strong><code class="profile-item-id">${profile.key}</code>
            <span class="profile-item-description">${profile.description || this._t("profileNoDescription")}</span>
            ${baseSelected || exceptionSelected ? html`<span class="profile-item-usage">
              ${baseSelected ? html`<span class="profile-item-chip profile-item-chip-base">${this._t("profileSelectedAsBase")}</span>` : nothing}
              ${exceptionSelected ? html`<span class="profile-item-chip profile-item-chip-exception">${this._t("profileSelectedAsException")}</span>` : nothing}
            </span>` : nothing}
          </span>
        </button>
        <div class="profile-item-actions">
          <button class=${`icon-button profile-item-activate${baseSelected ? " active" : ""}`} type="button"
            aria-pressed=${String(baseSelected)} ?disabled=${activationDisabled}
            title=${`${this._t("profileActivate")}: ${profile.name}`} aria-label=${`${this._t("profileActivate")}: ${profile.name}`}
            @click=${(event: Event) => { event.stopPropagation(); void this._activate(profile.key); }}>
            <ha-icon icon=${baseSelected ? "mdi:check-circle" : "mdi:play-circle-outline"}></ha-icon>
          </button>
          <button class=${`icon-button profile-item-apply${exceptionSelected ? " active" : ""}`} type="button"
            aria-pressed=${String(exceptionSelected)} ?disabled=${activationDisabled}
            title=${`${this._t("profileApplyException")}: ${profile.name}`} aria-label=${`${this._t("profileApplyException")}: ${profile.name}`}
            @click=${(event: Event) => { event.stopPropagation(); void this._changeOverrides((api) => api.applyProfiles([profile.key])); }}>
            <ha-icon icon="mdi:layers-plus"></ha-icon>
          </button>
          <button class="icon-button danger template-item-delete profile-item-delete" type="button"
            ?disabled=${Boolean(this._busy) || this._operationRunning()}
            title=${`${this._t("profileDelete")}: ${profile.name}`} aria-label=${`${this._t("profileDelete")}: ${profile.name}`}
            @click=${(event: Event) => { event.stopPropagation(); void this._deleteProfile(profile); }}>
            <ha-icon icon="mdi:trash-can"></ha-icon>
          </button>
        </div>
      </div>
    `;
  }

  private _renderActiveSelector() {
    const summary = activeSetupSummary(this.data);
    const activeProfileIds = summary.baseProfileIds;
    const profiles = this.data?.profiles ?? [];
    const modes = this.data?.modes ?? [];
    const overrideIds = summary.overrideIds;
    const origin = activeProfileOrigin(this.data);
    const modeValue = origin === "default" ? "default" : origin === "manual" ? "manual" : `custom:${origin.key}`;
    const baseName = summary.mode?.name ?? (summary.baseKind === "default"
      ? this._t("modeDefault") : summary.baseProfiles.map((profile) => profile.name).join(", "));
    const coverageSegments = summary.coverageSegments.map((segment) => ({ ...segment,
      color: segment.profileId === null ? "var(--secondary-text-color)" : climateProfileAccentColor(segment.profileId, segment.profile?.color),
      label: this._t(segment.origin === "base" ? "activeSetupBaseSegment" : segment.origin === "exception" ? "activeSetupExceptionSegment" : "activeSetupFallbackSegment", {
        profile: segment.profile?.name ?? segment.profileId ?? this._t("modeDefault"), count: segment.count,
      }),
    })).map((segment) => ({ ...segment, fullLabel: `${segment.label}: ${this._t(segment.count === 1 ? "activeSetupExceptionZone" : "activeSetupExceptionZones", { count: segment.count })}` }));
    const distributionLabel = this._t(summary.distributionTotal === 1 ? "activeSetupDistributionOne" : "activeSetupDistribution", { count: summary.distributionTotal });
    const baseType = this._t(summary.baseKind === "mode" ? "modeLabel"
      : summary.baseKind === "profile" ? "activeSetupProfileType"
        : summary.baseKind === "profiles" ? "profiles" : "profileBehaviorDefault");
    const disabled = Boolean(this._busy)
      || this._operationRunning()
      || this._dirty
      || this._modeDirty;
    const controls = this.activeSetupControls === "modes" || this.activeSetupControls === "profiles"
      ? this.activeSetupControls
      : "both";
    const showModes = controls !== "profiles";
    const showProfiles = controls !== "modes";
    return html`
      <section class="profile-active-context active-setup-card" aria-label=${this._t("activeSetup")}>
        <div class="active-setup-heading">
          <span>
            <strong>${this._t("activeSetup")}</strong>
            <small>${this._t("activeSetupDescription")}</small>
          </span>
          <details
            class="active-setup-menu"
            @keydown=${this._handleActiveSetupMenuKeydown}
          >
            <summary
              class="command-button secondary active-setup-change"
              aria-disabled=${String(disabled)}
              @click=${(event: Event) => {
                if (disabled) event.preventDefault();
              }}
              @keydown=${(event: KeyboardEvent) => {
                if (disabled && (event.key === "Enter" || event.key === " ")) event.preventDefault();
              }}
            >
              <ha-icon icon="mdi:swap-horizontal"></ha-icon>
              <span>${this._t("activeSetupChange")}</span>
            </summary>
            <div class="active-setup-popover">
              ${showModes ? html`<section class="active-setup-option-group" aria-labelledby="active-setup-modes-heading">
                <div class="active-setup-group-heading">
                  <strong id="active-setup-modes-heading">${this._t("modesTitle")}</strong>
                  <small>${this._t("activeSetupBaseModesHelp")}</small>
                </div>
                ${this._renderActiveModeOption(
                  "default",
                  this._t("modeDefault"),
                  this._t("modeDefaultDescription"),
                  "mdi:calendar-clock-outline",
                  modeValue === "default",
                  [],
                  disabled,
                )}
                ${modes.map((mode) => {
                  const linkedProfiles = mode.profile_ids
                    .map((profileId) => profiles.find((profile) => profile.key === profileId))
                    .filter((profile): profile is ClimateProfile => Boolean(profile));
                  return this._renderActiveModeOption(
                    `custom:${mode.key}`,
                    mode.name,
                    this._t("modeCustomDescription", {
                      profile: linkedProfiles.map((profile) => profile.name).join(", "),
                    }),
                    "mdi:format-list-bulleted",
                    modeValue === `custom:${mode.key}`,
                    linkedProfiles,
                    disabled,
                    );
                  })}
              </section>` : nothing}
              ${showProfiles ? html`<section class="active-setup-option-group" aria-labelledby="active-setup-profiles-heading">
                <div class="active-setup-group-heading">
                  <strong id="active-setup-profiles-heading">${this._t("profiles")}</strong>
                  <small>${this._t("activeSetupProfileChoicesHelp")}</small>
                </div>
                ${showModes ? nothing : this._renderActiveModeOption(
                  "default",
                  this._t("modeDefault"),
                  this._t("modeDefaultDescription"),
                  "mdi:calendar-clock-outline",
                  modeValue === "default",
                  [],
                  disabled,
                )}
                ${profiles.length
                  ? profiles.map((profile) => this._renderActiveProfileOption(
                    profile,
                    modeValue === "manual" && !overrideIds.length && activeProfileIds.length === 1 && activeProfileIds[0] === profile.key,
                    disabled,
                  ))
                  : html`<span class="empty active-setup-empty">${this._t("profileNoneCreated")}</span>`}
              </section>` : nothing}
            </div>
          </details>
        </div>
        <div class="active-setup-summary">
          <div class="active-setup-mode">
            <span class="active-setup-summary-icon neutral"
              style=${summary.baseKind === "profile" ? `--profile-accent: ${climateProfileAccentColor(summary.baseProfiles[0]?.key, summary.baseProfiles[0]?.color)}` : nothing}><ha-icon icon=${summary.baseKind === "default" ? "mdi:calendar-clock-outline" : summary.baseKind === "profile" ? summary.baseProfiles[0]?.icon || "mdi:account-outline" : "mdi:format-list-bulleted"}></ha-icon></span>
            <div class="active-setup-summary-copy">
              <span class="active-setup-base-meta"><small>${this._t("profileBase")}</small><span>${baseType}</span></span>
              <strong>${baseName}</strong>

              <span class="active-setup-base-coverage">${summary.baseCoverage.total === 0
                ? this._t("activeSetupBaseNoZones")
                : this._t(summary.baseCoverage.total === 1 ? "activeSetupBaseCoverageOne" : "activeSetupBaseCoverage", summary.baseCoverage)}</span>
              ${coverageSegments.length ? html`<div class="base-coverage-visual" @keydown=${(event: KeyboardEvent) => {
                if (event.key === "Escape" && this._distributionExpanded) {
                  event.preventDefault(); event.stopPropagation(); this._closeDistribution();
                }
              }}>
                <button class="distribution-toggle" type="button" aria-expanded=${String(this._distributionExpanded)}
                  aria-controls="household-distribution-content" @click=${() => { this._distributionExpanded = !this._distributionExpanded; }}>
                  <span>${distributionLabel}</span><ha-icon icon="mdi:chevron-down" aria-hidden="true"></ha-icon>
                </button>
                <div id="household-distribution-content" class=${this._distributionExpanded ? "distribution-panel expanded" : "distribution-panel"}
                  aria-hidden=${String(!this._distributionExpanded)} ?inert=${!this._distributionExpanded}>
                  <div><div class="distribution-panel-inner">
                    <div class="base-coverage-bar" role="img" aria-label=${`${distributionLabel}: ${coverageSegments.map((segment) => segment.fullLabel).join("; ")}`}>
                      ${coverageSegments.map((segment) => html`<span class="base-coverage-segment" aria-hidden="true"
                        title=${segment.fullLabel} style=${`flex: ${segment.count} 0 0; background: ${segment.color}`}></span>`)}
                    </div>
                    <div class="base-coverage-legend">
                      ${coverageSegments.map((segment) => html`<span class="base-coverage-legend-item" title=${segment.fullLabel}>
                        <ha-icon icon=${segment.profile?.icon || (segment.profileId === null ? "mdi:calendar-clock-outline" : "mdi:account-outline")}
                          aria-hidden="true" style=${`color: ${segment.color}`}></ha-icon>
                        <span class="distribution-legend-name">${segment.label}</span><span class="distribution-legend-count">${segment.count}</span>
                      </span>`)}
                    </div>
                  </div></div>
                </div>
              </div>` : nothing}

            </div>
          </div>
          <div class="active-setup-profiles active-setup-exceptions">
            <span class="active-setup-summary-label"><ha-icon icon="mdi:layers-outline" aria-hidden="true"></ha-icon><span>${this._t("activeSetupExceptions")}</span></span>
            <div class="active-setup-exception-content" @keydown=${(event: KeyboardEvent) => {
              if (event.key === "Escape" && this._exceptionDetail !== undefined) {
                event.preventDefault(); event.stopPropagation(); this._closeExceptionDetail();
              }
            }}>
            ${summary.exceptionGroups.length ? html`<div class="active-setup-exception-list">
              ${summary.exceptionGroups.map((group, index) => {
                const expanded = this._exceptionDetail === group.profileId;
                const contentId = `exception-zones-${index}`;
                return html`<div class="active-setup-exception-group"
                  style=${group.profileId !== null ? `--profile-accent: ${climateProfileAccentColor(group.profileId, group.profile?.color)}` : nothing}>
                  <button type="button" class="exception-zone-count" data-exception-group=${group.profileId ?? ""}
                    aria-expanded=${String(expanded)} aria-controls=${contentId}
                    aria-label=${this._t("activeSetupViewExceptionZones", { count: this._t(group.entityIds.length === 1 ? "activeSetupExceptionZone" : "activeSetupExceptionZones", { count: group.entityIds.length }), profile: group.profile?.name ?? group.profileId ?? this._t("modeDefault"), identity: group.profileId === null ? this._t("modeDefault") : `${this._t("activeSetupProfileType")} ${group.profileId}` })}
                    @click=${() => this._openExceptionDetail(group.profileId)}>
                    <ha-icon icon=${group.profile?.icon || (group.profileId === null ? "mdi:calendar-clock-outline" : "mdi:account-outline")} aria-hidden="true"></ha-icon>
                    <strong>${group.profile?.name ?? group.profileId ?? this._t("modeDefault")}</strong>
                    <span class="exception-zone-summary"><span>${this._t(group.entityIds.length === 1 ? "activeSetupExceptionZone" : "activeSetupExceptionZones", { count: group.entityIds.length })}</span><ha-icon class="exception-count-chevron" icon="mdi:chevron-down" aria-hidden="true"></ha-icon></span>
                  </button>
                  <div id=${contentId} class=${expanded ? "exception-group-zones expanded" : "exception-group-zones"}
                    aria-hidden=${String(!expanded)} ?inert=${!expanded}>
                    <div><ul class="exception-detail-zones" tabindex=${expanded ? "0" : "-1"}
                      aria-label=${this._t("activeSetupExceptionZones", { count: group.entityIds.length })}>
                      ${group.entityIds.map((id) => html`<li>${this.hass?.states?.[id]?.attributes?.friendly_name ?? id}</li>`)}
                    </ul></div>
                  </div>
                </div>`;
              })}
            </div>` : html`<div class="active-setup-no-profiles"><strong>${this._t("activeSetupNoExceptions")}</strong><span>${this._t("activeSetupInheritBase")}</span></div>`}
            </div>
          </div>
        </div>

      </section>
    `;
  }

  private _closeDistribution(): void {
    this._distributionExpanded = false;
    void this.updateComplete.then(() => this.shadowRoot?.querySelector<HTMLButtonElement>(".distribution-toggle")?.focus());
  }

  private _openExceptionDetail(profileId: string | null): void {
    this._exceptionDetail = this._exceptionDetail === profileId ? undefined : profileId;
  }

  private _closeExceptionDetail(): void {
    const profileId = this._exceptionDetail;
    this._exceptionDetail = undefined;
    void this.updateComplete.then(() => [...(this.shadowRoot?.querySelectorAll<HTMLButtonElement>(".exception-zone-count") ?? [])]
      .find((button) => button.dataset.exceptionGroup === (profileId ?? ""))?.focus());
  }

  private async _changeOverrides(operation: (api: VelairApiClient) => Promise<ScheduleResponse>): Promise<void> {
    if (!this.hass || this._busy || this._operationRunning() || this._dirty || this._modeDirty || this.activeSetupControls === "modes") return;
    this._busy = "activate";
    this._clearNotices();
    try { this._emitData(await operation(new VelairApiClient(this.hass))); }
    catch (error) { this._error = this._errorMessage(error, "profileUnableActivate"); }
    finally { this._busy = undefined; }
  }

  private _renderActiveModeOption(
    value: string,
    label: string,
    description: string,
    icon: string,
    current: boolean,
    profiles: ClimateProfile[],
    disabled: boolean,
  ) {
    return html`
      <button
        class=${current ? "active-setup-option current" : "active-setup-option"}
        type="button"
        data-mode-selection=${value}
        aria-current=${current ? "true" : nothing}
        ?disabled=${disabled}
        @click=${() => void this._chooseActiveMode(value)}
      >
        <ha-icon class="active-setup-option-icon neutral" icon=${icon}></ha-icon>
        <span class="active-setup-option-copy">
          <strong>${label}</strong>
          <small>${description}</small>
          ${profiles.length
            ? html`
              <span class="active-setup-linked-profiles">
                ${profiles.map((profile) => html`
                  <span style=${`--profile-accent: ${climateProfileAccentColor(profile.key, profile.color)}`}>
                    <ha-icon icon=${profile.icon || "mdi:account-outline"}></ha-icon>
                    <span>${profile.name}</span>
                  </span>
                `)}
              </span>
            `
            : nothing}
        </span>
        ${current ? html`<ha-icon class="active-setup-current" icon="mdi:check"></ha-icon>` : nothing}
      </button>
    `;
  }

  private _renderActiveProfileOption(profile: ClimateProfile, current: boolean, disabled: boolean) {
    return html`
      <div class="active-setup-profile-choice">
        <button
          class=${current ? "active-setup-option profile current" : "active-setup-option profile"}
          style=${`--profile-accent: ${climateProfileAccentColor(profile.key, profile.color)}`}
          type="button"
          data-profile-id=${profile.key}
          title=${`${this._t("profileActivate")}: ${profile.name}`}
          aria-label=${`${this._t("profileActivate")}: ${profile.name}`}
          aria-current=${current ? "true" : nothing}
          ?disabled=${disabled}
          @click=${() => void this._chooseActiveProfile(profile.key)}
        >
          <ha-icon class="active-setup-option-icon" icon=${profile.icon || "mdi:account-outline"}></ha-icon>
          <span class="active-setup-option-copy">
            <strong>${profile.name}</strong>
            <small>${profile.description || this._t("profileNoDescription")}</small>
          </span>
          ${current ? html`<ha-icon class="active-setup-current" icon="mdi:check"></ha-icon>` : nothing}
        </button>
        <button class="active-setup-apply-exception" type="button" ?disabled=${disabled}
          title=${`${this._t("profileApplyException")}: ${profile.name}`}
          aria-label=${`${this._t("profileApplyException")}: ${profile.name}`}
          @click=${() => void this._changeOverrides((api) => api.applyProfiles([profile.key]))}>
          <ha-icon icon="mdi:layers-plus" aria-hidden="true"></ha-icon>
        </button>
      </div>
    `;
  }

  private async _chooseActiveMode(value: string): Promise<void> {
    await this._selectActiveMode(value);
    this._closeActiveSetupMenu();
  }

  private async _chooseActiveProfile(profileId: string): Promise<void> {
    await this._activate(profileId);
    this._closeActiveSetupMenu();
  }

  private _closeActiveSetupMenu(): void {
    const menu = this.shadowRoot?.querySelector<HTMLDetailsElement>(".active-setup-menu");
    if (!menu) return;
    menu.open = false;
    menu.querySelector<HTMLElement>("summary")?.focus();
  }

  private _handleActiveSetupMenuKeydown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    const menu = event.currentTarget as HTMLDetailsElement;
    if (!menu.open) return;
    event.preventDefault();
    menu.open = false;
    menu.querySelector<HTMLElement>("summary")?.focus();
  }

  private _renderModes() {
    const modes = this.data?.modes ?? [];
    return html`
      <section class="template-library mode-library" aria-label=${this._t("modesTitle")}>
        ${this.workspace === "modes" ? nothing : html`
          <div class="library-concept-note">
            <ha-icon icon="mdi:format-list-bulleted"></ha-icon>
            <span>
              <strong>${this._t("modesTitle")}</strong>
              <small>${this._t("modesDescription")}</small>
            </span>
          </div>
          <div class="mode-entity-note">
            <ha-icon icon="mdi:home-assistant"></ha-icon>
            <span>${this._t("modesEntityNote")}</span>
          </div>
        `}
        <div class="template-library-layout mode-layout">
          <div class="template-list-wrap">
            <div class="template-list-heading">
              <div class="section-heading">
                <ha-icon icon="mdi:format-list-bulleted"></ha-icon>
                <span class="section-label">${this._t("modesTitle")} (${modes.length + 2})</span>
              </div>
              <button class="icon-button primary mode-create" type="button" ?disabled=${Boolean(this._busy)} @click=${this._createMode} title=${this._t("modeCreate")}>
                <ha-icon icon="mdi:plus"></ha-icon>
              </button>
            </div>
            <div class="template-list mode-list" aria-label=${this._t("modesTitle")}>
              ${this._renderBuiltInMode("default")}
              ${this._renderBuiltInMode("manual")}
              ${modes.map((mode) => this._renderModeListItem(mode))}
            </div>
          </div>
          <div class="template-detail mode-detail">
            ${this._modeEditorOpen
              ? this._renderModeEditor()
              : html`<div class="template-placeholder compact"><span>${this._t("modeSelectToBegin")}</span></div>`}
          </div>
        </div>
      </section>
    `;
  }

  private _renderBuiltInMode(mode: "default" | "manual") {
    const label = mode === "default" ? this._t("modeDefault") : this._t("modeManual");
    const description = mode === "default"
      ? this._t("modeDefaultDescription")
      : this._t("modeManualDescription");
    const tooltipId = `mode-${mode}-help`;
    const selected = !this._modeEditorOpen && activeProfileOrigin(this.data) === mode;
    return html`
      <div class=${`template-item mode-item built-in${selected ? " active" : ""}`} aria-current=${String(selected)}>
        <div class="template-item-main mode-item-main">
          <ha-icon icon=${mode === "default" ? "mdi:calendar-clock-outline" : "mdi:gesture-tap"}></ha-icon>
          <span><strong>${label}</strong></span>
        </div>
        ${renderInlineHelp(
          tooltipId,
          this._t("modeInformation", { mode: label }),
          description,
        )}
        <ha-icon class="mode-lock" icon="mdi:lock-outline" title=${this._t("modeBuiltInHelp")}></ha-icon>
      </div>
    `;
  }

  private _renderModeListItem(mode: VelairMode) {
    const profiles = mode.profile_ids.map((profileId) => ({
      profileId,
      profile: this.data?.profiles?.find((item) => item.key === profileId),
    }));
    const mappedProfileLabel = profiles
      .map(({ profileId, profile }) => profile?.name ?? profileId)
      .join(", ");
    return html`
      <div
        class=${mode.key === this._selectedModeKey ? "template-item mode-item custom active" : "template-item mode-item custom"}
        role="group"
        aria-label=${`${mode.name}. ${this._t("modeMappedProfiles", { profiles: mappedProfileLabel })}`}
      >
        <button
          class="template-item-main mode-item-main"
          type="button"
          aria-pressed=${String(mode.key === this._selectedModeKey)}
          @click=${() => this._selectMode(mode)}
        >
          <span class="mode-item-identity">
            <ha-icon icon="mdi:format-list-bulleted"></ha-icon>
            <strong>${mode.name}</strong>
          </span>
          <span class="mode-profile-avatars" title=${mappedProfileLabel}>
            ${profiles.map(({ profileId, profile }) => html`
              <span
                class="mode-profile-avatar"
                style=${`--mode-profile-color: ${profile ? climateProfileAccentColor(profileId, profile.color) : "var(--error-color)"}`}
                role="img"
                aria-label=${profile
                  ? this._t("modeMappedProfile", { profile: profile.name })
                  : this._t("modeMappedProfileMissing", { profile: profileId })}
              ><ha-icon icon=${profile?.icon || (profile ? "mdi:account-outline" : "mdi:alert-outline")}></ha-icon></span>
            `)}
          </span>
        </button>
        <button class="icon-button danger template-item-delete mode-delete" type="button" ?disabled=${Boolean(this._busy)} @click=${() => void this._deleteMode(mode)} title=${this._t("modeDelete")}>
          <ha-icon icon="mdi:trash-can"></ha-icon>
        </button>
      </div>
    `;
  }

  private _renderModeEditor() {
    const profiles = this.data?.profiles ?? [];
    const error = modeValidationError(this._modeDraft, this.data?.modes ?? [], profiles);
    return html`
      <section class="mode-editor">
        <div class="mode-field mode-name-field">
          <label for="mode-name-input">${this._t("modeName")}</label>
          <div class="mode-name-row">
            <input id="mode-name-input" maxlength=${MODE_NAME_MAX_LENGTH} .value=${this._modeDraft.name} aria-invalid=${String(Boolean(error && error !== "profile"))} @input=${(event: Event) => this._updateModeDraft("name", (event.currentTarget as HTMLInputElement).value)} />
            <button
              class="icon-button primary mode-save"
              type="button"
              ?disabled=${Boolean(this._busy) || !this._modeDirty || Boolean(error)}
              @click=${() => void this._saveMode()}
              title=${this._t("save")}
              aria-label=${this._t("save")}
            >
              <ha-icon icon="mdi:content-save"></ha-icon>
            </button>
          </div>
          <small>${error === "name" ? this._t("modeNameRequired") : error === "length" ? this._t("modeNameTooLong", { count: MODE_NAME_MAX_LENGTH }) : error === "duplicate" ? this._t("modeNameDuplicate") : this._t("modeNameHelp")}</small>
        </div>
        <fieldset class="mode-field mode-profile-choices" aria-invalid=${String(error === "profile")}>
          <legend>${this._t("modeProfiles")}</legend>
          ${profiles.map((profile) => html`
            <label class=${this._modeDraft.profileIds.includes(profile.key) ? "mode-profile-choice selected" : "mode-profile-choice"}>
              <input
                type="checkbox"
                .checked=${this._modeDraft.profileIds.includes(profile.key)}
                @change=${() => this._toggleModeProfile(profile.key)}
              />
              <span
                class="mode-profile-avatar"
                style=${`--mode-profile-color: ${climateProfileAccentColor(profile.key, profile.color)}`}
              ><ha-icon icon=${profile.icon || "mdi:account-outline"}></ha-icon></span>
              <span><strong>${profile.name}</strong><code>${profile.key}</code></span>
            </label>
          `)}
          <small>${error === "profile" ? this._t("modeProfileRequired") : this._t("modeProfileHelp")}</small>
        </fieldset>
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
    const validationNotices = this._validationNotices.entries.map((entry) => ({
      ...entry,
      type: "error" as const,
    }));
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
          <div class="template-detail-actions profile-group-save-actions">
            ${this._renderGroupSaveSummaries()}
            <button
              class="icon-button primary"
              type="button"
              ?disabled=${Boolean(this._busy) || !this._draft.name.trim() || !iconValid || !colorValid || !descriptionValid || hasScheduleValidationError || this._hasUnchosenGroup()}
              @click=${() => void this._save()}
              title=${this._t("save")}
            >
              <ha-icon icon="mdi:content-save"></ha-icon>
            </button>
          </div>
        </div>
        <div class="profile-schedule-error">${renderContextualNoticeStack(validationNotices)}</div>
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
          ${this.scheduleWorkspace
            ? this._renderWorkspaceZone()
            : this._localEntityIds().length
            ? this._localEntityIds().map((entityId) => this._renderZone(entityId))
            : html`<span class="empty">${this._t("noManagedEntities")}</span>`}
        </div>
        ${this.scheduleWorkspace ? html`
          <div class="profile-workspace-save">
            ${this._renderGroupSaveSummaries(true)}
            <button
              class="command-button primary"
              type="button"
              ?disabled=${Boolean(this._busy) || !this._dirty || !this._draft.name.trim() || !iconValid || !colorValid || !descriptionValid || hasScheduleValidationError || this._hasUnchosenGroup()}
              @click=${() => void this._save()}
            >
              <ha-icon icon="mdi:content-save"></ha-icon>
              <span>${this._t("profileSave")}</span>
            </button>
          </div>
        ` : nothing}
      </section>
    `;
  }

  private _renderWorkspaceZone() {
    const entityIds = this._localEntityIds();
    if (!entityIds.length) return html`<span class="empty">${this._t("noManagedEntities")}</span>`;
    const entityId = entityIds.includes(this._selectedEntity) ? this._selectedEntity : entityIds[0];
    const zone = this._draft.zones[entityId];
    const behavior = profileZoneBehavior(zone);
    const scheduleError = this._zoneScheduleError(entityId);
    const currentInput = climateProfileInput(this._draft);
    const persistedInput = this._persistedProfileInput();
    return html`
      <section class="schedule-zone-picker profile-workspace-zone-picker">
        <div class="schedule-step-heading"><strong>${this._t("scheduleStepClimate")}</strong></div>
        <div class="zones">
          ${entityIds.map((id) => {
            const zoneError = this._zoneScheduleError(id);
            const dirty = this._profileZoneDirty(id, currentInput, persistedInput);
            const label = this._profileZoneSummary(id);
            const climateName = this.hass?.states?.[id]?.attributes?.friendly_name ?? id;
            return html`
            <button
              type="button"
              class=${["zone", "profile-workspace-zone-option", id === entityId ? "active" : "", zoneError ? "error" : "", dirty ? "dirty" : ""].filter(Boolean).join(" ")}
              aria-invalid=${String(Boolean(zoneError))}
              title=${zoneError ?? `${climateName}: ${label}${dirty ? ` (${this._t("unsaved")})` : ""}`}
              ?disabled=${this.scheduleSavePending}
              @click=${() => this._selectEntity(id)}
            >
              <span class="profile-workspace-zone-copy">
                <strong>${climateName}</strong>
                <small>${label}</small>
              </span>
            </button>
          `;})}
        </div>
      </section>
      <article class=${`profile-zone profile-workspace-zone expanded ${scheduleError ? "error" : ""}`}>
        <div class="zone-heading">
          <span class="profile-zone-toggle profile-zone-static">
            <ha-icon icon="mdi:thermostat"></ha-icon>
            <span class="profile-zone-identity">
              <strong>${this.hass?.states?.[entityId]?.attributes?.friendly_name ?? entityId}</strong>
              <span>${entityId}</span>
            </span>
          </span>
          <label class="profile-zone-actions">
            <span>${this._t("profileZoneBehavior")}</span>
            <span class="select-wrap">
              <select .value=${behavior} @change=${(event: Event) => this._setZoneBehavior(entityId, (event.currentTarget as HTMLSelectElement).value as ClimateProfileDraftZone["behavior"] | "unconfigured")}>
                <option value="unconfigured">${this._t("profileBehaviorUnconfigured")}</option>
                <option value="normal">${this._t("profileBehaviorDefault")}</option>
                <option value="schedule">${this._t("profileBehaviorSchedule")}</option>
                ${this._isExternalEntity(entityId) ? nothing : html`
                  <option value="pause">${this._t("profileBehaviorPause")}</option>
                `}
              </select>
            </span>
          </label>
        </div>
        <div class="profile-zone-content">
          ${this._isExternalEntity(entityId) ? html`
            <div class="library-concept-note compact"><ha-icon icon="mdi:cloud-upload-outline"></ha-icon><span><small>${this._t("profileExternalScheduleOnly")}</small></span></div>
          ` : nothing}
          ${!this._isExternalEntity(entityId) && zone?.behavior === "pause" ? html`
            <label class="profile-pause-action"><span>${this._t("profilePauseAction")}</span>
              <span class="select-wrap">
                <select .value=${zone.action} @change=${(event: Event) => this._setPauseAction(entityId, (event.currentTarget as HTMLSelectElement).value as "none" | "turn_off")}>
                  <option value="none">${this._t("profilePauseKeep")}</option>
                  <option value="turn_off">${this._t("profilePauseTurnOff")}</option>
                </select>
              </span>
            </label>
          ` : zone?.behavior === "schedule"
            ? this._renderSchedule(entityId, zone)
            : this._isExternalEntity(entityId) ? nothing
              : html`<div class="library-concept-note compact"><ha-icon icon="mdi:calendar-arrow-right"></ha-icon><span><small>${this._t(behavior === "unconfigured" ? "profileUnconfiguredHelp" : "profileDefaultScheduleHelp")}</small></span></div>`}
        </div>
      </article>
    `;
  }

  private _renderZone(entityId: string) {
    const zone = this._draft.zones[entityId];
    const behavior = profileZoneBehavior(zone);
    const scheduleError = this._zoneScheduleError(entityId);
    const expanded = this._expandedZones.has(entityId);
    const contentId = `profile-zone-content-${entityId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
    const climateName = this.hass?.states?.[entityId]?.attributes?.friendly_name ?? entityId;
    const toggleLabel = this._t(expanded ? "profileCollapseClimate" : "profileExpandClimate", {
      climate: climateName,
    });
    const toggle = () => this._toggleZone(entityId);
    return html`
      <article class=${`profile-zone ${expanded ? "expanded" : "collapsed"} ${scheduleError ? "error" : ""}`}>
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
              <select .value=${behavior} @change=${(event: Event) => this._setZoneBehavior(entityId, (event.currentTarget as HTMLSelectElement).value as ClimateProfileDraftZone["behavior"] | "unconfigured")}>
                <option value="unconfigured">${this._t("profileBehaviorUnconfigured")}</option>
                <option value="normal">${this._t("profileBehaviorDefault")}</option>
                <option value="schedule">${this._t("profileBehaviorSchedule")}</option>
                ${this._isExternalEntity(entityId) ? nothing : html`
                  <option value="pause">${this._t("profileBehaviorPause")}</option>
                `}
              </select>
            </span>
          </label>
        </div>
        ${expanded ? html`
          <div class="profile-zone-content" id=${contentId}>
            ${this._isExternalEntity(entityId) ? html`
              <div class="library-concept-note compact"><ha-icon icon="mdi:cloud-upload-outline"></ha-icon><span><small>${this._t("profileExternalScheduleOnly")}</small></span></div>
            ` : zone?.behavior === "pause" ? html`
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

  private _renderGroupSaveSummaries(scrollable = false) {
    const selected = [...this._groupCandidates.entries()].filter(([, candidate]) => candidate.selectedDay);
    return selected.length ? html`<div class="group-save-summaries"><div class="group-save-summary-list" tabindex=${scrollable ? "0" : nothing} role=${scrollable ? "region" : nothing} aria-label=${scrollable ? this._t("dayGroupPendingApplications") : nothing}>${selected.map(([key, candidate]) => {
      const boundary = key.lastIndexOf(":");
      const entityId = key.slice(0, boundary);
      return renderGroupSaveSummary({ _t: this._t.bind(this), _weekdayName: day => weekdayName(languageFromHass(this.hass), day) }, {
        sourceDay: candidate.selectedDay!, days: key.slice(boundary + 1).split(","), zoneName: this.hass?.states?.[entityId]?.attributes?.friendly_name ?? entityId,
      });
    })}</div><small>${this._t("profileGroupSaveHint")}</small></div>` : nothing;
  }

  private _groupDays(entityId: string, weekday = this._effectiveWeekday(entityId)): string[] {
    const zone = this._draft.zones[entityId];
    return dayGroups(zone?.behavior === "schedule" ? zone.day_layout_key : undefined)
      .find((days) => days.includes(weekday)) ?? [weekday];
  }

  private _propagateGroup(entityId: string, weekday: string): void {
    this._draft = cloneProfileDayToDays(this._draft, entityId, weekday, this._groupDays(entityId, weekday));
  }

  private _candidateKey(entityId: string, weekday = this._effectiveWeekday(entityId)): string { return `${entityId}:${this._groupDays(entityId, weekday).join(",")}`; }
  private _chooseGroupBase(entityId: string, weekday: string): boolean {
    if (this._busy || this._materializingTemplate) return false;
    const days = this._groupDays(entityId, weekday);
    const key = this._candidateKey(entityId, weekday);
    const candidate = this._groupCandidates.get(key);
    const current = climateProfileInput(this._draft).zones[entityId];
    if (candidate?.selectedDay && current.behavior === "schedule" && days.some((day) => dayConfigurationFingerprint(current, day) !== candidate.baseline) && !window.confirm(this._t("discardChanges"))) return false;
    const source = candidate?.draft.zones[entityId];
    const zone = this._draft.zones[entityId];
    if (source?.behavior === "schedule" && zone?.behavior === "schedule") {
      const links = { ...zone.template_links }; const link = source.template_links?.[weekday];
      if (link) links[weekday] = structuredClone(link); else delete links[weekday];
      this._draft = { ...this._draft, zones: { ...this._draft.zones, [entityId]: { ...zone, schedule: { ...zone.schedule, [weekday]: structuredClone(source.schedule[weekday] ?? []) }, template_links: links } } };
    }
    this._selectDay(entityId, weekday);
    this._propagateGroup(entityId, weekday);
    if (candidate) { candidate.selectedDay = weekday; const applied = climateProfileInput(this._draft).zones[entityId]; candidate.baseline = applied.behavior === "schedule" ? dayConfigurationFingerprint(applied, weekday) : undefined; }
    this._setDirty(true);
    return true;
  }
  private _pendingGroupEqualization(entityId: string): boolean {
    const zone = this._draft.zones[entityId];
    const persisted = this._persistedProfileInput()?.zones[entityId];
    const days = this._groupDays(entityId);
    return this._dirty && zone?.behavior === "schedule" && days.length > 1
      && persisted?.behavior === "schedule" && !schedulesEqual(persisted, days);
  }
  private _hasUnchosenGroup(): boolean {
    const input = climateProfileInput(this._draft);
    return Object.entries(this._draft.zones).some(([entityId, zone]) => {
      const visible = entityId === this._selectedEntity || (!this.scheduleWorkspace && this._expandedZones.has(entityId));
      if (!visible || zone.behavior !== "schedule") return false;
      const candidate = this._groupCandidates.get(this._candidateKey(entityId));
      if (candidate) return !candidate.selectedDay;
      const current = input.zones[entityId];
      return this._pendingGroupEqualization(entityId) || (current.behavior === "schedule" && !schedulesEqual(current, this._groupDays(entityId)));
    });
  }
  private _clearCandidateState(entityId: string): void {
    for (const key of this._groupCandidates.keys()) if (key.startsWith(`${entityId}:`)) this._groupCandidates.delete(key);
  }
  private _setDayLayout(entityId: string, key: string): boolean | void {
    if (this.scheduleSavePending) return false;
    const zone = this._draft.zones[entityId];
    if (zone?.behavior !== "schedule" || this._materializingTemplate) return;
    for (const candidateKey of this._groupCandidates.keys()) if (candidateKey.startsWith(`${entityId}:`)) this._groupCandidates.delete(candidateKey);
    this._draft = { ...this._draft, zones: { ...this._draft.zones, [entityId]: { ...zone, day_layout_key: resolveDayLayout(key).layout.key } } };
    this._setDirty(true);
  }

  private _renderSchedule(entityId: string, zone: Extract<ClimateProfileDraftZone, { behavior: "schedule" }>) {
    const weekdays = orderedWeekdays(this.data?.settings?.first_weekday ?? WEEKDAYS[0]);
    const weekday = this._effectiveWeekday(entityId);
    const blocks = this._blocks(entityId, weekday);
    const selectedGroup = this._groupDays(entityId, weekday);
    const currentZone = climateProfileInput(this._draft).zones[entityId];
    const key = this._candidateKey(entityId, weekday);
    let candidate = this._groupCandidates.get(key);
    if (!candidate && currentZone.behavior === "schedule" && (!schedulesEqual(currentZone, selectedGroup) || this._pendingGroupEqualization(entityId))) {
      candidate = { draft: structuredClone(this._draft) }; this._groupCandidates.set(key, candidate);
    }
    const candidateDraft = candidate?.draft ?? this._draft;
    const candidateZone = candidateDraft.zones[entityId];
    const comparisonZone = climateProfileInput(candidateDraft).zones[entityId];
    const mixed = Boolean(candidate);
    const ready = !mixed;
    const grouped = resolveDayLayout(zone.day_layout_key).layout.key !== "individual";
    const externalCapabilities = this._externalCapabilities(entityId);
    const cloneWeekdayTargets = new Set(
      [...(this._cloneWeekdayTargets[entityId] ?? [])].filter((day) => day !== weekday),
    );
    const otherClimates = this._localEntityIds().filter(
      (targetEntityId) => targetEntityId !== entityId,
    );
    const cloneClimateTargets = new Set(
      [...(this._cloneClimateTargets[entityId] ?? [])].filter((targetEntityId) =>
        otherClimates.includes(targetEntityId)),
    );
    const blockHost = this._blockEditorHost(entityId, weekday);
    const currentInput = climateProfileInput(this._draft);
    const candidateInput = climateProfileInput(candidateDraft);
    const persistedInput = this._persistedProfileInput();
    const dayTabs = html`
      ${renderDayLayoutControls({ _t: this._t.bind(this) }, { key: resolveDayLayout(zone.day_layout_key).layout.key, disabled: this.scheduleSavePending, onChange: (key) => this._setDayLayout(entityId, key) })}
      ${resolveDayLayout(zone.day_layout_key).invalid ? html`<div class="notice error">${this._t("dayLayoutInvalid")}</div>` : nothing}
      ${renderScheduleDayTabs({ _t: this._t.bind(this), _weekdayName: (day) => weekdayName(languageFromHass(this.hass), day), _shortWeekdayName: (day) => shortWeekdayName(languageFromHass(this.hass), day) }, {
        layoutKey: zone.day_layout_key, disabled: this.scheduleSavePending, selectedDay: weekday, orderedWeekdays: weekdays,
        onSelect: (day) => this._selectDay(entityId, day), blockCount: (day) => this._blocks(entityId, day).length,
        isDirty: (day) => this._profileDayDirty(entityId, day, currentInput, persistedInput),
      })}
      ${mixed ? renderDayScheduleConflict({ _t: this._t.bind(this), _weekdayName: (day) => weekdayName(languageFromHass(this.hass), day), _shortWeekdayName: (day) => shortWeekdayName(languageFromHass(this.hass), day) }, {
        days: weekdays.filter((day) => selectedGroup.includes(day)),
        selectedDay: candidate?.selectedDay,
        disabled: Boolean(this._busy) || this._materializingTemplate,
        fingerprint: (day) => comparisonZone.behavior === "schedule" ? dayConfigurationFingerprint(comparisonZone, day) : day,
        blockCount: (day) => this._blocks(entityId, day, candidateDraft).length,
        emptyMessage: (day) => { const link = candidateZone.behavior === "schedule" ? candidateZone.template_links?.[day] : undefined; return link && !this.data?.templates?.some((template) => template.key === link.template_key) ? this._t("linkedConfigurationUnavailable") : undefined; },
        linkLabel: (day) => { const link = (candidateZone.behavior === "schedule" ? candidateZone.template_links?.[day] : undefined); return link ? `${this._t("templates")}: ${this.data?.templates?.find((item) => item.key === link.template_key)?.name ?? link.template_key} · ${this._t(link.mode === "full" ? "templateLinkFull" : "templateLinkHours")}` : undefined; },
        blocks: (day) => {
          const savedResolved = !this._profileDayDirty(entityId, day, candidateInput, persistedInput)
            ? this.data?.resolved_profile_schedules?.[this._selectedKey]?.[entityId]?.[day] : undefined;
          const full = (candidateZone.behavior === "schedule" ? candidateZone.template_links?.[day] : undefined)?.mode === "full";
          return this._blocks(entityId, day, candidateDraft).map((block, index) => {
            const effective = block.preset_key || full
              ? this._effectivePresetBlock(entityId, day, block, index, candidateDraft) ?? savedResolved?.find((item) => item.start === block.start)
              : profileDraftBlockInput(block);
            const graphic = effective ? { ...timelinePresentation(blockHost, effective, entityId, "template", day, index, false, true, { link: candidateZone.behavior === "schedule" ? candidateZone.template_links?.[day] : undefined }), presetKey: block.preset_key, templateKey: candidateZone.behavior === "schedule" ? candidateZone.template_links?.[day]?.template_key : undefined } : undefined;
            const presetLabel = block.preset_key ? this.data?.block_presets?.find(item => item.key === block.preset_key)?.name ?? block.preset_key : undefined;
            return { start: block.start, block: effective, graphic, details: graphic?.details, presetLabel, time: blockHost._formatScheduleTime(block.start), description: effective
              ? presetConfigurationSummary(effective, blockHost) : this._t(this._presetPreviews.get(this._presetPreviewKey(entityId, day, block, index, candidateDraft))?.status === "unavailable" ? "linkedConfigurationUnavailable" : "linkedConfigurationLoading") };
          });
        },
        onChoose: (day) => this._chooseGroupBase(entityId, day),
      }) : nothing}
    `;
    const timeline = renderTimeline(blockHost, entityId, "template", grouped ? undefined : {
          // Include linked days when displaying continuity across midnight.
          // This assembles editable hours/references; execution remains backend-owned.
          schedule: Object.fromEntries(WEEKDAYS.map((day) => [day, this._blocks(entityId, day)])),
          weekday,
        });
    const templatePanel = html`<div class="template-panel">${(this.data?.resource_diagnostics ?? []).filter((item) => item.source === "profile" && item.profile_key === this._selectedKey && item.entity_id === entityId).map((item) => html`<div class="notice error">${item.message}</div>`)}${renderLinkedHoursControl(blockHost)}${blockHost._draftTemplateLink ? nothing : html`
            <div class="copy-template-control">
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
                        ${availableScheduleTemplates(this.data.templates).map((template) => html`<option value=${template.key}>${template.name}</option>`)}
                      `
                    : html`<option value="">${this._t("noTemplates")}</option>`}
                </select>
              </span>
            </div>`}
          </div>`;
    const primaryActions = html`<div class="schedule-save-actions profile-day-actions">
            <button
              type="button"
              class="command-button primary"
              title=${this._t("saveTemplate")}
              @click=${(event: Event) => this._openTemplateDialog(entityId, weekday, event.currentTarget as HTMLElement)}
            >
              <ha-icon icon="mdi:content-save-plus"></ha-icon><span>${this._t("saveTemplate")}</span>
            </button>
          </div>`;
    const blockList = html`<div class="draft-list profile-block-list">
          ${blocks.length
            ? html`
                ${renderDraftListHeader(blockHost, "template")}
                ${blocks.map((block, index) => keyed(
                  editableBlockRowKey("template", `${this._selectedKey}:${entityId}`, weekday, index),
                  renderEditableBlock(blockHost, block, index, "template", external ? undefined : {
                    entityId,
                    dayBlocks: blocks,
                  }),
                ))}
                ${renderAddBlockButton(blockHost, "template")}
              `
            : renderAddBlockButton(blockHost, "template")}
        </div>`;
    const copyPanels = html`${grouped ? nothing : html`<div class="copy-panel profile-day-copy">
          <div class="copy-header">
            <div>
              <span class="label">${this._t("cloneDayToDays")}</span>
              <strong>${this._t("otherDays")}</strong>
            </div>
          </div>
          ${renderCloneDayPresets(
            this._t.bind(this),
            (preset) => this._setCloneDayPreset(entityId, weekday, preset),
            cloneWeekdayTargets.size > 0,
          )}
          <div class="copy-targets">
            ${weekdays
              .filter((day) => day !== weekday)
              .map((day) => html`
                <label class="check-target" title=${weekdayName(languageFromHass(this.hass), day)}>
                  <input
                    type="checkbox"
                    .checked=${cloneWeekdayTargets.has(day)}
                    @change=${(event: Event) => this._toggleCloneDayTarget(
                      entityId,
                      day,
                      (event.currentTarget as HTMLInputElement).checked,
                    )}
                  />
                  <span>${weekdayName(languageFromHass(this.hass), day).slice(0, 3)}</span>
                </label>
              `)}
          </div>
          <div class="copy-actions">
            <button
              class="command-button success"
              type="button"
              ?disabled=${Boolean(this._busy) || cloneWeekdayTargets.size === 0 || this._hasScheduleValidationError()}
              @click=${() => this._cloneSelectedDay(entityId, weekday, cloneWeekdayTargets)}
            >
              <ha-icon icon="mdi:content-copy"></ha-icon>
              <span>${this._t("cloneAction")}</span>
            </button>
          </div>
        </div>`}
        ${otherClimates.length ? html`
          <div class="copy-panel profile-climate-copy">
            <div class="copy-header">
              <div>
                <span class="label">${cloneThermostatsLabel({ _t: this._t.bind(this), _weekdayName: day => weekdayName(languageFromHass(this.hass), day) }, zone.day_layout_key, weekday)}</span>
                <strong>${this._t("otherThermostats")}</strong>
              </div>
            </div>
            <div class="copy-targets wide">
              ${otherClimates.map((targetEntityId) => html`
                <label class="check-target">
                  <input
                    type="checkbox"
                    .checked=${cloneClimateTargets.has(targetEntityId)}
                    @change=${(event: Event) => this._toggleCloneClimateTarget(
                      entityId,
                      targetEntityId,
                      (event.currentTarget as HTMLInputElement).checked,
                    )}
                  />
                  <span>${this.hass?.states?.[targetEntityId]?.attributes?.friendly_name ?? targetEntityId}</span>
                </label>
              `)}
            </div>
            <div class="copy-actions">
              <button
                class="command-button success"
                type="button"
                ?disabled=${Boolean(this._busy) || cloneClimateTargets.size === 0 || this._hasScheduleValidationError()}
                @click=${(event: Event) => this._openClimateCloneDialog(
                  entityId,
                  weekday,
                  cloneClimateTargets,
                  event.currentTarget as HTMLElement,
                )}
              >
                <ha-icon icon="mdi:content-copy"></ha-icon>
                <span>${this._t("cloneAction")}</span>
              </button>
            </div>
          </div>
        ` : nothing}`;
    return html`
      <div class="profile-week">
        ${!ready ? dayTabs : renderWeeklyScheduleEditor({
          dayTabs,
          timeline,
          configureHeading: this._t("scheduleStepConfigure"),
          helper: this._t("templateOptionalHint"),
          templatePanel,
          externalUsage: renderExternalSwitchpointUsage(
            this._t.bind(this),
            externalCapabilities
              ? externalSwitchpointUsage(blocks, externalCapabilities)
              : undefined,
          ),
          blockList,
          primaryActions,
          copyPanels,
        })}
      </div>
    `;
  }

  private _clearSelection = (): void => {
    this._validationNotices.dispose();
    this._selectedKey = "";
    this._draft = createClimateProfileDraft();
    this._selectedDays = {};
    this._cloneWeekdayTargets = {};
    this._cloneClimateTargets = {};
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
        this._selectedDays = {};
        this._cloneWeekdayTargets = {};
        this._cloneClimateTargets = {};
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
    if (this.scheduleSavePending) return;
    if (this._materializingTemplate) return;
    if (this._dirty && !window.confirm(this._t("profileDiscardChanges"))) {
      return;
    }
    this._selectedKey = profile.key;
    this._draft = createClimateProfileDraft(profile);
    this._selectedDays = {};
    this._cloneWeekdayTargets = {};
    this._cloneClimateTargets = {};
    this._expandedZones = new Set();
    this._setDirty(false);
    this._clearNotices();
  }

  private _updateMetadata(field: "name" | "icon" | "color" | "description", event: Event): void {
    this._draft = { ...this._draft, [field]: (event.currentTarget as HTMLInputElement | HTMLTextAreaElement).value };
    this._setDirty(true);
  }

  private _setZoneBehavior(entityId: string, behavior: ClimateProfileDraftZone["behavior"] | "unconfigured"): void {
    if (this._isExternalEntity(entityId) && behavior === "pause") return;
    this._clearCandidateState(entityId);
    this._draft = withProfileZoneBehavior(this._draft, entityId, behavior);
    this._cloneWeekdayTargets = { ...this._cloneWeekdayTargets, [entityId]: new Set() };
    this._cloneClimateTargets = { ...this._cloneClimateTargets, [entityId]: new Set() };
    this._setDirty(true);
  }

  private _setPauseAction(entityId: string, action: "none" | "turn_off"): void {
    this._draft = { ...this._draft, zones: { ...this._draft.zones, [entityId]: { behavior: "pause", action } } };
    this._setDirty(true);
  }

  private _selectEntity(entityId: string): void {
    if (!this.scheduleSavePending) this._selectedEntity = entityId;
  }

  private _selectDay(entityId: string, weekday: string): void {
    if (this.scheduleSavePending) return;
    if (this._materializingTemplate) return;
    this._selectedDays = { ...this._selectedDays, [entityId]: weekday };
    const targets = new Set(this._cloneWeekdayTargets[entityId] ?? []);
    targets.delete(weekday);
    this._cloneWeekdayTargets = { ...this._cloneWeekdayTargets, [entityId]: targets };
    this._cloneClimateTargets = { ...this._cloneClimateTargets, [entityId]: new Set() };
  }

  private _toggleCloneDayTarget(entityId: string, weekday: string, checked: boolean): void {
    const targets = new Set(this._cloneWeekdayTargets[entityId] ?? []);
    if (checked) targets.add(weekday);
    else targets.delete(weekday);
    this._cloneWeekdayTargets = { ...this._cloneWeekdayTargets, [entityId]: targets };
  }

  private _setCloneDayPreset(entityId: string, weekday: string, preset: CloneDayPreset): void {
    this._cloneWeekdayTargets = {
      ...this._cloneWeekdayTargets,
      [entityId]: cloneDayPresetTargets(preset, weekday),
    };
  }

  private _toggleCloneClimateTarget(entityId: string, targetEntityId: string, checked: boolean): void {
    const targets = new Set(this._cloneClimateTargets[entityId] ?? []);
    if (checked) targets.add(targetEntityId);
    else targets.delete(targetEntityId);
    this._cloneClimateTargets = { ...this._cloneClimateTargets, [entityId]: targets };
  }

  private async _cloneSelectedDay(
    entityId: string,
    weekday: string,
    targetWeekdays: Set<string>,
  ): Promise<void> {
    const zone = this._draft.zones[entityId];
    if (zone?.behavior !== "schedule" || targetWeekdays.size === 0) return;
    if (this._busy || !this.hass?.connection) return;
    const context = () => JSON.stringify([this._selectedKey, this._selectedEntity, this._selectedDays, this._draft, this.data?.configuration_revision, this._cloneWeekdayTargets[entityId] ? [...this._cloneWeekdayTargets[entityId]] : [...targetWeekdays]]);
    const originalContext = context();
    const candidate = cloneProfileDayToDays(this._draft, entityId, weekday, targetWeekdays);
    this._busy = "clone";
    try {
      const preview = await new VelairApiClient(this.hass).previewProfile(climateProfileInput(candidate));
      if (context() !== originalContext) return;
      if (preview.configuration_revision !== this.data?.configuration_revision) throw new Error(this._t("linkedConfigurationUnavailable"));
      this._clearCandidateState(entityId);
      this._draft = candidate;
      this._cloneWeekdayTargets = { ...this._cloneWeekdayTargets, [entityId]: new Set() };
      this._setDirty(true);
    } catch (error) {
      if (context() === originalContext) this._error = backendErrorMessage(error, this._t("unableCopy"));
    } finally {
      this._busy = undefined;
    }
  }

  private _toggleZone(entityId: string): void {
    if (this.scheduleSavePending) return;
    const expanded = new Set(this._expandedZones);
    if (expanded.has(entityId)) expanded.delete(entityId);
    else expanded.add(entityId);
    this._expandedZones = expanded;
  }

  private _blocks(entityId: string, weekday: string, draft = this._draft): DraftScheduleBlock[] {
    const zone = draft.zones[entityId];
    if (zone?.behavior === "schedule" && zone.template_links?.[weekday]) return linkedDraftBlocks(zone.template_links[weekday], this.data?.templates ?? [], this.data?.temperature_unit);
    return zone?.behavior === "schedule" ? [...(zone.schedule[weekday] ?? [])] : [];
  }

  private _linkHours(entityId: string, weekday: string, key: string): boolean {
    if (this._materializingTemplate) return false;
    const zone = this._draft.zones[entityId];
    if (zone?.behavior === "schedule" && zone.template_links?.[weekday]?.template_key === key) return true;
    const template = availableScheduleTemplates(this.data?.templates).find((item) => item.key === key);
    if (zone?.behavior !== "schedule" || !template || (this._blocks(entityId, weekday).length > 0
      && !window.confirm(this._t("hoursReplaceConfirmation", { name: template.name ?? template.key })))) return false;
    const link = zone.template_links?.[weekday]?.mode === "full" ? { mode: "full" as const, template_key: key } : linkDraftDay(template, this._blocks(entityId, weekday));
    this._draft = { ...this._draft, zones: { ...this._draft.zones, [entityId]: { ...zone, schedule: { ...zone.schedule, [weekday]: [] }, template_links: { ...zone.template_links, [weekday]: link } } } };
    this._propagateGroup(entityId, weekday);
    this._setDirty(true);
    return true;
  }

  @state() private _materializingTemplate = false;
  private _materializationError?: string;
  private async _materializeFullDay(entityId: string, weekday: string, link: import("../types").TemplateLink, savedProfile = false, candidate?: ClimateProfileInput): Promise<DraftScheduleBlock[] | undefined> {
    if (!this.hass || this._materializingTemplate || this._busy) return undefined;
    const fingerprint = () => JSON.stringify([this._selectedKey, this._selectedEntity, this._selectedDays, this.data?.configuration_revision, this._draft]);
    const snapshot = fingerprint();
    const revision = this.data?.configuration_revision;
    if (this._error === this._materializationError) this._error = undefined;
    this._materializationError = undefined;
    this._materializingTemplate = true;
    this._busy = "materialize";
    try {
      const input = candidate ?? (savedProfile ? this._persistedProfileInput() : climateProfileInput(this._draft));
      if (!input) return undefined;
      const preview = await new VelairApiClient(this.hass).previewProfile(input);
      if (snapshot !== fingerprint()) return undefined;
      const blocks = preview.materialized_schedules?.[entityId]?.[weekday];
      if ((revision !== undefined && preview.configuration_revision !== revision) || !Array.isArray(blocks)) throw new Error(this._t("linkedConfigurationUnavailable"));
      return draftBlocksFromScheduleBlocks(blocks, this.data?.temperature_unit);
    } catch (error) {
      if (snapshot === fingerprint()) {
        this._materializationError = backendErrorMessage(error, this._t("unableLoad"));
        this._error = this._materializationError;
      }
      return undefined;
    } finally { this._materializingTemplate = false; this._busy = undefined; }
  }

  private async _setHoursScope(entityId: string, weekday: string, mode: "hours" | "full"): Promise<boolean> {
    if (this._materializingTemplate) return false;
    const zone = this._draft.zones[entityId];
    const link = zone?.behavior === "schedule" ? zone.template_links?.[weekday] : undefined;
    if (!link || zone?.behavior !== "schedule" || (link.mode ?? "hours") === mode) return true;
    const template = availableScheduleTemplates(this.data?.templates).find((item) => item.key === link.template_key);
    if (!template || (mode === "full" && !window.confirm(this._t("templateFullReplaceConfirmation")))) return false;
    const blocks = mode === "hours" ? await this._materializeFullDay(entityId, weekday, link) : this._blocks(entityId, weekday);
    if (!blocks) return false;
    const next = mode === "full" ? { mode, template_key: link.template_key } : linkDraftDay(template, blocks);
    this._draft = { ...this._draft, zones: { ...this._draft.zones, [entityId]: { ...zone, template_links: { ...zone.template_links, [weekday]: next } } } };
    this._propagateGroup(entityId, weekday);
    this._setDirty(true);
    return true;
  }

  private async _restoreOwnHours(entityId: string, weekday: string): Promise<boolean> {
    if (this._materializingTemplate) return false;
    const zone = this._draft.zones[entityId];
    if (zone?.behavior !== "schedule" || (this._blocks(entityId, weekday).length > 0
      && !window.confirm(this._t("hoursRestoreConfirmation")))) return false;
    const saved = this._persistedProfileInput()?.zones[entityId];
    const savedLink = saved?.behavior === "schedule" ? saved.template_links?.[weekday] : undefined;
    const blocks = savedLink?.mode === "full" ? await this._materializeFullDay(entityId, weekday, savedLink, true) : savedLink
      ? linkedDraftBlocks(savedLink, this.data?.templates ?? [], this.data?.temperature_unit)
      : draftBlocksFromScheduleBlocks(saved?.behavior === "schedule" ? saved.schedule[weekday] ?? [] : [], this.data?.temperature_unit);
    if (!blocks) return false;
    const links = { ...zone.template_links };
    delete links[weekday];
    this._draft = { ...this._draft, zones: { ...this._draft.zones, [entityId]: { ...zone, schedule: { ...zone.schedule, [weekday]: blocks.map(({ slot_id: _slot, ...block }) => block) }, template_links: links } } };
    this._propagateGroup(entityId, weekday);
    this._setDirty(true);
    return true;
  }

  private async _unlinkHours(entityId: string, weekday: string): Promise<void> {
    if (this._materializingTemplate) return;
    const zone = this._draft.zones[entityId];
    if (zone?.behavior !== "schedule" || !zone.template_links?.[weekday]) return;
    const materialized = zone.template_links[weekday].mode === "full" ? await this._materializeFullDay(entityId, weekday, zone.template_links[weekday]) : this._blocks(entityId, weekday);
    if (!materialized) return;
    const blocks = materialized.map(({ slot_id: _id, ...block }) => block);
    const links = { ...zone.template_links };
    delete links[weekday];
    this._draft = { ...this._draft, zones: { ...this._draft.zones, [entityId]: { ...zone, schedule: { ...zone.schedule, [weekday]: blocks }, template_links: links } } };
    this._propagateGroup(entityId, weekday);
    this._setDirty(true);
  }

  private async _unlinkPreset(entityId: string, weekday: string, index: number): Promise<void> {
    const blocks = this._blocks(entityId, weekday);
    if (!blocks[index]?.preset_key) return;
    const key = this._presetPreviewKey(entityId, weekday, blocks[index], index);
    const start = blocks[index].start;
    const current = () => weekday === this._effectiveWeekday(entityId) && start === this._blocks(entityId, weekday)[index]?.start && key === this._presetPreviewKey(entityId, weekday, this._blocks(entityId, weekday)[index] ?? {} as DraftScheduleBlock, index);
    try {
      let effective = this._effectivePresetBlock(entityId, weekday, blocks[index], index);
      if (!effective) {
        if (!this.hass) throw new Error(this._t("unableLoad"));
        const preview = await new VelairApiClient(this.hass).previewDailySchedule(entityId, weekday, { blocks: [{ start: blocks[index].start, preset_key: blocks[index].preset_key }] });
        effective = preview.blocks.find((block) => block.start === blocks[index].start);
      }
      if (!effective || !current()) return;
      const replacement = draftBlocksFromScheduleBlocks([{ ...effective, slot_id: blocks[index].slot_id }], this.data?.temperature_unit)[0];
      this._setBlocks(entityId, weekday, this._blocks(entityId, weekday).map((block, i) => i === index ? replacement : block));
    } catch (error) { if (current()) this._error = backendErrorMessage(error, this._t("unableSave")); }
  }

  private _setBlocks(entityId: string, weekday: string, blocks: DraftScheduleBlock[]): void {
    if (this._materializingTemplate) return;
    const zone = this._draft.zones[entityId];
    if (zone?.behavior !== "schedule") return;
    const inputZone = climateProfileInput(this._draft).zones[entityId];
    if (inputZone.behavior === "schedule" && !schedulesEqual(inputZone, this._groupDays(entityId, weekday))) return;
    const link = zone.template_links?.[weekday];
    if (link?.mode === "full") return;
    if (link) {
      const template = availableScheduleTemplates(this.data?.templates).find((item) => item.key === link.template_key);
      if (!template) return;
      this._draft = { ...this._draft, zones: { ...this._draft.zones, [entityId]: { ...zone, template_links: { ...zone.template_links, [weekday]: linkDraftDay(template, blocks) } } } };
      this._propagateGroup(entityId, weekday);
      this._setDirty(true);
      return;
    }
    this._draft = { ...this._draft, zones: { ...this._draft.zones, [entityId]: { ...zone, schedule: { ...zone.schedule, [weekday]: blocks } } } };
    this._propagateGroup(entityId, weekday);
    this._setDirty(true);
  }

  private _addBlock(entityId: string, weekday: string): void {
    const blocks = this._blocks(entityId, weekday);
    let updated = addDraftBlock(blocks, nextProfileBlockStart(blocks), this.data?.temperature_unit);
    const state = this.hass?.states?.[entityId];
    if (!blocks.length && climateSupportsRangeTarget(state) && !climateSupportsSingleTarget(state)) {
      updated = updated.map((block, index) => index === updated.length - 1 ? {
        ...block,
        temperature: undefined,
        target_temp_low: state?.attributes?.target_temp_low ?? "",
        target_temp_high: state?.attributes?.target_temp_high ?? "",
      } : block);
    }
    this._setBlocks(
      entityId,
      weekday,
      updated,
    );
  }

  private _removeBlock(entityId: string, weekday: string, index: number): void {
    this._setBlocks(entityId, weekday, removeDraftBlock(this._blocks(entityId, weekday), index));
  }

  private _updateBlock(entityId: string, weekday: string, index: number, field: keyof DraftScheduleBlock, value: string): void {
    const blocks = this._blocks(entityId, weekday);
    const previous = blocks[index];
    let updated = updateDraftBlock(blocks, index, field, value);
    if (previous && field === "hvac_mode") {
      const state = this.hass?.states?.[entityId];
      if (value === "heat_cool" && previous.hvac_mode !== "heat_cool"
        && climateSupportsRangeTarget(state) && !draftBlockUsesRange(previous)) {
        updated = updated.map((block, blockIndex) => blockIndex === index ? {
          ...block,
          temperature: undefined,
          target_temp_low: state?.attributes?.target_temp_low ?? "",
          target_temp_high: state?.attributes?.target_temp_high ?? "",
        } : block);
      } else if (
        value !== ""
        && value !== "heat_cool"
        && draftBlockUsesRange(previous)
      ) {
        updated = updated.map((block, blockIndex) => blockIndex === index ? {
          ...block,
          target_temp_low: undefined,
          target_temp_high: undefined,
          temperature: state?.attributes?.temperature ?? "",
        } : block);
      }
    }
    this._setBlocks(entityId, weekday, updated);
  }

  private async _copyTemplate(entityId: string, weekday: string, select: HTMLSelectElement): Promise<void> {
    const key = select.value;
    const template = availableScheduleTemplates(this.data?.templates).find((item) => item.key === key);
    const zone = this._draft.zones[entityId];
    if (!template || zone?.behavior !== "schedule" || this._materializingTemplate) return;
    const link = { mode: "full" as const, template_key: key };
    const input = climateProfileInput(this._draft);
    const current = input.zones[entityId];
    if (current?.behavior !== "schedule") return;
    input.zones[entityId] = { ...current, schedule: { ...current.schedule, [weekday]: [] }, template_links: { ...current.template_links, [weekday]: link } };
    const blocks = await this._materializeFullDay(entityId, weekday, link, false, input);
    if (!blocks) { select.value = ""; return; }
    const links = { ...zone.template_links };
    delete links[weekday];
    this._draft = { ...this._draft, zones: { ...this._draft.zones, [entityId]: { ...zone, schedule: { ...zone.schedule, [weekday]: blocks }, template_links: links } } };
    this._propagateGroup(entityId, weekday);
    this._setDirty(true);
    select.value = "";
  }

  private _saveDayAsTemplate = async (): Promise<void> => {
    const dialog = this._templateDialog;
    const api = this.hass ? new VelairApiClient(this.hass) : undefined;
    if (!dialog || !api || !dialog.name.trim() || this._busy) return;
    const zone = this._draft.zones[dialog.entityId];
    if (zone?.behavior !== "schedule") return;
    const draftBlocks = zone.template_links?.[dialog.weekday]?.mode === "full" ? await this._materializeFullDay(dialog.entityId, dialog.weekday, zone.template_links[dialog.weekday]) : this._blocks(dialog.entityId, dialog.weekday);
    if (!draftBlocks || this._templateDialog !== dialog) return;
    const starts = new Set<string>();
    const invalid = draftBlocks.some((block) => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(block.start) || starts.has(block.start)) return true;
      starts.add(block.start);
      if (block.action !== ACTION_SET_TEMPERATURE) return false;
      return Boolean(this._temperatureError(dialog.entityId, block))
        || (draftBlockUsesRange(block)
          ? !Number.isFinite(Number(block.target_temp_low)) || !Number.isFinite(Number(block.target_temp_high))
          : !Number.isFinite(Number(block.temperature)));
    });
    if (invalid) {
      this._templateDialog = { ...dialog, error: this._t("profileInvalidSchedule") };
      return;
    }
    const inputZone = climateProfileInput(this._draft).zones[dialog.entityId];
    if (inputZone.behavior !== "schedule") return;
    this._busy = "template-save";
    const token = Symbol("profile-template-save");
    this._templateSaveToken = token;
    this._clearNotices();
    try {
      const raw = draftBlocks.map(profileDraftBlockInput);
      const effective = raw;
      const response = await api.setScheduleTemplate(newTemplateKey(), dialog.name.trim(), effective.map(({ slot_id: _slot, ...block }) => block));
      this.data = response;
      this.dispatchEvent(new CustomEvent("profile-data-changed", { bubbles: true, composed: true, detail: response }));
      if (this._templateSaveToken === token && this._templateDialog === dialog) {
        this._closeTemplateDialog();
        this._showSuccess(this._t("templateSaved"));
      }
    } catch (error) {
      if (this._templateSaveToken === token && this._templateDialog === dialog) {
        this._templateDialog = { ...dialog, error: this._errorMessage(error, "unableSaveTemplate") };
      }
    } finally {
      if (this._templateSaveToken === token) {
        this._templateSaveToken = undefined;
        this._busy = undefined;
      }
    }
  };

  private _confirmCloneDayToClimates = async (): Promise<void> => {
    const dialog = this._climateCloneDialog;
    if (!dialog?.targets.size) return;
    const source = this._draft.zones[dialog.entityId];
    if (source?.behavior !== "schedule") return;
    if (!this.hass?.connection || this._busy) return;
    const context = () => JSON.stringify([this._selectedKey, this._selectedEntity, this._selectedDays, this._draft, this.data?.configuration_revision]);
    const originalContext = context();
    const candidate = this._groupDays(dialog.entityId, dialog.weekday).reduce((draft, day) => cloneProfileDayToClimates(draft, dialog.entityId, day, dialog.targets), this._draft);
    const current = () => this._climateCloneDialog === dialog && context() === originalContext;
    this._busy = "clone";
    try {
      const preview = await new VelairApiClient(this.hass).previewProfile(climateProfileInput(candidate));
      if (!current()) return;
      if (preview.configuration_revision !== this.data?.configuration_revision) throw new Error(this._t("linkedConfigurationUnavailable"));
      for (const target of dialog.targets) this._clearCandidateState(target);
      this._draft = candidate;
      this._cloneClimateTargets = { ...this._cloneClimateTargets, [dialog.entityId]: new Set() };
      this._closeClimateCloneDialog();
      this._setDirty(true);
    } catch (error) {
      if (current()) this._climateCloneDialog = { ...dialog, error: backendErrorMessage(error, this._t("unableApplyThermostats")) };
    } finally {
      this._busy = undefined;
    }
  };

  private _openTemplateDialog(entityId: string, weekday: string, trigger: HTMLElement): void {
    this._dialogTrigger = trigger;
    this._templateDialog = { entityId, weekday, name: "" };
    void this.updateComplete.then(() => this.shadowRoot?.querySelector<HTMLInputElement>("#profile-template-name")?.focus());
  }

  private _openClimateCloneDialog(
    entityId: string,
    weekday: string,
    targets: Set<string>,
    trigger: HTMLElement,
  ): void {
    if (!targets.size) return;
    this._dialogTrigger = trigger;
    this._climateCloneDialog = { entityId, weekday, targets: new Set(targets) };
    void this.updateComplete.then(() => this.shadowRoot
      ?.querySelector<HTMLButtonElement>(".profile-climate-clone-dialog .profile-dialog-actions button")
      ?.focus());
  }

  private _closeTemplateDialog = (): void => {
    this._templateDialog = undefined;
    const trigger = this._dialogTrigger;
    this._dialogTrigger = undefined;
    void this.updateComplete.then(() => trigger?.focus());
  };

  private _closeClimateCloneDialog = (): void => {
    this._climateCloneDialog = undefined;
    const trigger = this._dialogTrigger;
    this._dialogTrigger = undefined;
    void this.updateComplete.then(() => trigger?.focus());
  };

  private _handleDialogKeydown(event: KeyboardEvent, close: () => void): void {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const dialog = event.currentTarget as HTMLElement;
    const focusable = [...dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter((element) => !element.hidden);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.shadowRoot?.activeElement ?? null;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  private _filterCopiedBlocks(entityId: string, blocks: DraftScheduleBlock[]): DraftScheduleBlock[] {
    const state = this.hass?.states?.[entityId];
    const filtered = filterBlocksForClimateOptions(blocks as ScheduleBlock[], {
      fanModes: climateFanModeOptions(state),
      humidityLimits: climateHumidityLimits(state),
      presetModes: climatePresetModeOptions(state),
      swingHorizontalModes: climateSwingHorizontalModeOptions(state),
      swingModes: climateSwingModeOptions(state),
    });
    return draftBlocksFromScheduleBlocks(filtered, this.data?.temperature_unit);
  }

  private _cloneCompatibilityError(blocks: DraftScheduleBlock[], entityId: string): string | undefined {
    const state = this.hass?.states?.[entityId];
    const name = state?.attributes?.friendly_name ?? entityId;
    for (const block of blocks) {
      if (block.hvac_mode && !climateSupportedModes(state).includes(block.hvac_mode)) return this._t("profileCloneDayIncompatibleMode", { entity: name, value: block.hvac_mode, start: block.start });
      if (block.action === ACTION_SET_CLIMATE_OPTIONS) continue;
      if (block.action !== ACTION_SET_TEMPERATURE) continue;
      if (!climateTargetCompatibleForConfiguration(
        state,
        draftBlockUsesRange(block) ? "range" : "scalar",
        block.hvac_mode,
      )) {
        return this._t("profileCloneDayIncompatibleTarget", { entity: name, start: block.start });
      }
      if (this._temperatureError(entityId, block)) return this._t("profileCloneDayIncompatibleTemperature", { entity: name, start: block.start });
    }
    try {
      this._filterCopiedBlocks(entityId, blocks);
    } catch {
      return this._t("profileCloneDayIncompatibleOptions", { entity: name, start: blocks.find((block) => block.action === ACTION_SET_CLIMATE_OPTIONS)?.start ?? "" });
    }
    return undefined;
  }

  private _blockEditorHost(entityId: string, weekday: string): VelairViewHost {
    const state = this.hass?.states?.[entityId];
    const external = this._externalCapabilities(entityId);
    const temperatureLimits = entityTemperatureLimits(state, this.data?.temperature_unit);
    const temperatureStep = this._entityTemperatureStep(entityId, state);
    const host: Record<string, unknown> = {
      _materializingTemplate: this._materializingTemplate,
      _allowBlockPresets: true,
      _supportsTemperatureOnly: !external || external.supports_temperature_only === true,
      _timelineTemplateLinkForDay: (day: string) => { const zone = this._draft.zones[entityId]; return zone?.behavior === "schedule" ? zone.template_links?.[day] : undefined; },
      _effectivePresetBlockForDay: (block: DraftScheduleBlock, _index: number, day: string) => {
        const index = this._blocks(entityId, day).findIndex((item) => block.slot_id ? item.slot_id === block.slot_id : item.start === block.start);
        return index < 0 ? undefined : this._effectivePresetBlock(entityId, day, block, index);
      },
      _presetSettingsStatusForDay: (block: DraftScheduleBlock, _index: number, day: string) => {
        const index = this._blocks(entityId, day).findIndex((item) => block.slot_id ? item.slot_id === block.slot_id : item.start === block.start);
        return index < 0 ? "unavailable" : this._effectivePresetBlock(entityId, day, block, index) ? undefined
          : this._presetPreviews.get(this._presetPreviewKey(entityId, day, block, index))?.status ?? "loading";
      },
      _effectivePresetBlock: (block: DraftScheduleBlock, index: number) => this._effectivePresetBlock(entityId, weekday, block, index),
      _presetSettingsStatus: (block: DraftScheduleBlock, index: number) => this._effectivePresetBlock(entityId, weekday, block, index) ? undefined : this._presetPreviews.get(this._presetPreviewKey(entityId, weekday, block, index))?.status ?? "loading",
      _retryPresetSettings: (block: DraftScheduleBlock, index: number) => {
        this._presetPreviews.invalidate(this._presetPreviewKey(entityId, weekday, block, index));
        this._refreshPresetPreviews();
      },
      _resourceProfileKey: this._selectedKey,
      _selectedWeekday: weekday,
      _editPreset: (key: string) => this.dispatchEvent(new CustomEvent("velair-edit-preset", { bubbles: true, composed: true, detail: key })),
      _linkedHours: Boolean(this._draft.zones[entityId]?.behavior === "schedule" && (this._draft.zones[entityId] as Extract<ClimateProfileDraftZone, { behavior: "schedule" }>).template_links?.[weekday]),
      _draftTemplateLink: this._draft.zones[entityId]?.behavior === "schedule" ? (this._draft.zones[entityId] as Extract<ClimateProfileDraftZone, { behavior: "schedule" }>).template_links?.[weekday] : undefined,
      _setDayTemplateScope: (mode: "hours" | "full") => this._setHoursScope(entityId, weekday, mode),
      _setDayTemplateLink: (key: string) => this._linkHours(entityId, weekday, key),
      _restoreOwnDaySchedule: () => this._restoreOwnHours(entityId, weekday),
      _unlinkDayTemplate: () => this._unlinkHours(entityId, weekday),
      _setPresetForBlock: (index: number, key: string) => {
        if (!key) { void this._unlinkPreset(entityId, weekday, index); return; }
        const previous = this._blocks(entityId, weekday)[index];
        if (previous) this._presetPreviews.invalidate(this._presetPreviewKey(entityId, weekday, previous, index));
        this._setBlocks(entityId, weekday, this._blocks(entityId, weekday).map((block, i) => i === index ? { start: block.start, slot_id: block.slot_id, preset_key: key, action: "", hvac_mode: "" } : block));
      },
      _unlinkPresetBlock: (index: number) => this._unlinkPreset(entityId, weekday, index),
      hass: this.hass,
      classList: this.classList,
      renderRoot: this.renderRoot,
      _selectedEntity: entityId,
      _data: this.data,
      _t: (key: TranslationKey, replacements: Record<string, string | number> = {}) => this._t(key, replacements),
      _temperatureError: (block: DraftScheduleBlock) => this._temperatureError(entityId, block),
      _temperatureLimits: () => temperatureLimits,
      _temperatureStep: () => temperatureStep,
      _temperatureUnit: () => this.data?.temperature_unit ?? "°C",
      _hvacModeOptions: () => external?.supported_hvac_modes ?? climateSupportedModes(state),
      _fanModeOptions: () => external && !external.supported_option_fields.includes("fan_mode") ? [] : climateFanModeOptions(state),
      _presetModeOptions: () => external && !external.supported_option_fields.includes("preset_mode") ? [] : climatePresetModeOptions(state),
      _swingModeOptions: () => external && !external.supported_option_fields.includes("swing_mode") ? [] : climateSwingModeOptions(state),
      _swingHorizontalModeOptions: () => external && !external.supported_option_fields.includes("swing_horizontal_mode") ? [] : climateSwingHorizontalModeOptions(state),
      _humidityLimits: () => external && !external.supported_option_fields.includes("humidity") ? undefined : climateHumidityLimits(state),
      _modeLabel: (mode: string) => dictionaryLabel(languageFromHass(this.hass), "hvacModes", mode),
      _shortWeekdayName: (day: string) => shortWeekdayName(languageFromHass(this.hass), day),
      _weekdayName: (day: string) => weekdayName(languageFromHass(this.hass), day),
      _updateDraftBlock: (index: number, field: keyof DraftScheduleBlock, value: string) =>
        this._updateBlock(entityId, weekday, index, field, value),
      _removeBlock: (index: number) => this._removeBlock(entityId, weekday, index),
      _addBlock: () => this._addBlock(entityId, weekday),
      _inputValue: (event: Event) => (event.currentTarget as HTMLInputElement | HTMLSelectElement).value,
      _formatTemperatureLimit: (value: number) => this._formatTemperatureLimit(value),
      _currentTimelineNow: () => this.timelineNow ?? new Date(),
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

  private _entityTemperatureStep(
    entityId: string,
    state = this.hass?.states?.[entityId],
  ): number {
    const published = entityTemperatureStep(state, this.data?.temperature_unit);
    if (published !== undefined) return published;
    const zone = this.data?.zones?.[entityId];
    for (const fallback of [
      zone?.last_reported_target_temp_step,
      zone?.target_temp_step_override,
    ]) {
      if (typeof fallback === "number" && Number.isFinite(fallback) && fallback >= 0.001) {
        return fallback;
      }
    }
    return DEFAULT_TARGET_TEMP_STEP;
  }

  private _temperatureError(entityId: string, block: DraftScheduleBlock): string | undefined {
    const state = this.hass?.states?.[entityId];
    const [minTemperature, maxTemperature] = entityTemperatureLimits(state, this.data?.temperature_unit);
    const temperatureStep = this._entityTemperatureStep(entityId, state);
    return draftBlockTemperatureError(block, {
      minTemperature,
      maxTemperature,
      temperatureStep,
      rangeError: this._t("invalidTemperatureRange", {
        min: this._formatTemperatureLimit(minTemperature),
        max: this._formatTemperatureLimit(maxTemperature),
      }),
      rangeOrderError: this._t("invalidTargetRangeOrder"),
      stepError: this._t("invalidTemperatureStep", {
        step: this._formatTemperatureLimit(temperatureStep ?? 1),
      }),
    });
  }

  private _hasScheduleValidationError(): boolean {
    if (climateProfileValidationError(this._draft) === "schedule") return true;
    if (this._unsupportedScheduleModeError()) return true;
    return Object.entries(this._draft.zones).some(([entityId, zone]) =>
      zone.behavior === "schedule"
      && WEEKDAYS.some((weekday) => zone.template_links?.[weekday]?.mode !== "full" && this._blocks(entityId, weekday).some((block) =>
        Boolean(this._temperatureError(entityId, block)))),
    );
  }

  private _desiredValidationNotices(): DesiredNotice[] {
    if (!this._selectedKey) return [];
    const unsupportedModeError = this._unsupportedScheduleModeError();
    if (unsupportedModeError) {
      return [{ id: "unsupported-mode", message: unsupportedModeError }];
    }
    const climateScheduleErrors = this._localEntityIds().filter(
      (entityId) => Boolean(this._zoneScheduleError(entityId)),
    );
    if (!climateScheduleErrors.length) return [];

    const desired: DesiredNotice[] = [];
    const selectedError = climateScheduleErrors.includes(this._selectedEntity)
      ? this._zoneScheduleError(this._selectedEntity)
      : undefined;
    if (climateScheduleErrors.length > 1 || !selectedError) {
      desired.push({
        id: "schedule-summary",
        message: this._t("profileScheduleErrorsSummary", {
          climates: climateScheduleErrors.map((entityId) =>
            this.hass?.states?.[entityId]?.attributes?.friendly_name ?? entityId).join(", "),
        }),
      });
    }
    if (selectedError) {
      desired.push({ id: `schedule-detail:${this._selectedEntity}`, message: selectedError });
    }
    return desired;
  }

  private _unsupportedScheduleModeError(onlyEntityId?: string): string | undefined {
    for (const [entityId, zone] of Object.entries(this._draft.zones)) {
      if (onlyEntityId && entityId !== onlyEntityId) continue;
      if (zone.behavior !== "schedule") continue;
      const state = this.hass?.states?.[entityId];
      for (const weekday of WEEKDAYS) {
        if (zone.template_links?.[weekday]?.mode === "full") continue;
        const blocks = this._blocks(entityId, weekday);
        const unsupportedRangeMode = blocks.find((block) =>
          block.action === ACTION_SET_TEMPERATURE
          && draftBlockUsesRange(block)
          && block.hvac_mode !== undefined
          && block.hvac_mode !== "heat_cool");
        if (unsupportedRangeMode?.hvac_mode) {
          return this._t("unsupportedModeForClimateOnWeekday", {
            entity: state?.attributes?.friendly_name ?? entityId,
            mode: dictionaryLabel(
              languageFromHass(this.hass),
              "hvacModes",
              unsupportedRangeMode.hvac_mode,
            ),
            start: unsupportedRangeMode.start,
            weekday: weekdayName(languageFromHass(this.hass), weekday),
          });
        }
        const unsupportedRange = blocks.find((block) =>
          block.action === ACTION_SET_TEMPERATURE
          && draftBlockUsesRange(block)
          && !climateTargetCompatibleForConfiguration(
            state,
            "range",
            block.hvac_mode,
          ));
        if (unsupportedRange) {
          return this._t("unsupportedRangeTargetForClimateOnWeekday", {
            entity: state?.attributes?.friendly_name ?? entityId,
            start: unsupportedRange.start,
            weekday: weekdayName(languageFromHass(this.hass), weekday),
          });
        }
        const unsupported = firstUnsupportedModeBlock(blocks, climateSupportedModes(state));
        if (unsupported?.hvac_mode) {
          return this._t("unsupportedModeForClimateOnWeekday", {
            entity: state?.attributes?.friendly_name ?? entityId,
            mode: dictionaryLabel(
              languageFromHass(this.hass),
              "hvacModes",
              unsupported.hvac_mode,
            ),
            start: unsupported.start,
            weekday: weekdayName(languageFromHass(this.hass), weekday),
          });
        }
        const unsupportedScalar = blocks.find((block) =>
          block.action === ACTION_SET_TEMPERATURE && !draftBlockUsesRange(block)
          && !climateTargetCompatibleForConfiguration(
            state,
            "scalar",
            block.hvac_mode,
          ));
        if (unsupportedScalar) {
          return this._t("unsupportedSingleTargetForClimateOnWeekday", {
            entity: state?.attributes?.friendly_name ?? entityId,
            start: unsupportedScalar.start,
            weekday: weekdayName(languageFromHass(this.hass), weekday),
          });
        }
      }
    }
    return undefined;
  }

  private _zoneScheduleError(entityId: string): string | undefined {
    const unsupported = this._unsupportedScheduleModeError(entityId);
    if (unsupported) return unsupported;
    const zone = this._draft.zones[entityId];
    if (zone?.behavior !== "schedule") return undefined;
    const climate = this.hass?.states?.[entityId]?.attributes?.friendly_name ?? entityId;
    const external = this._externalCapabilities(entityId);
    for (const weekday of WEEKDAYS) {
      if (zone.template_links?.[weekday]?.mode === "full") continue;
      const starts = new Set<string>();
      const blocks = this._blocks(entityId, weekday);
      const externalChanges = blocks.length + (external?.implicit_midnight_change_counts_toward_limit && blocks[0]?.start !== "00:00" ? 1 : 0);
      if (external && externalChanges > external.max_switchpoints_per_day) {
        return this._t("profileExternalMaxChanges", {
          climate,
          day: weekdayName(languageFromHass(this.hass), weekday),
          count: external.max_switchpoints_per_day,
        });
      }
      for (const block of blocks) {
        const validStart = /^([01]\d|2[0-3]):[0-5]\d$/.test(block.start);
        const duplicateStart = starts.has(block.start);
        if (!validStart || duplicateStart) {
          return this._t("profileScheduleClimateBlockError", {
            climate,
            day: weekdayName(languageFromHass(this.hass), weekday),
            start: block.start,
            error: this._t(duplicateStart ? "duplicateStart" : "invalidStart", { start: block.start }),
          });
        }
        starts.add(block.start);
        if (external) {
          const [hour, minute] = block.start.split(":").map(Number);
          if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute % external.time_step_minutes !== 0) {
            return this._t("profileExternalTimeGrid", {
              climate,
              day: weekdayName(languageFromHass(this.hass), weekday),
              minutes: external.time_step_minutes,
            });
          }
          if (block.temperature_only && !external.supports_temperature_only) return this._t("profileExternalUnsupportedBlock", { climate });
          if (!external.supported_actions.includes(block.action ?? "set_temperature")) {
            return this._t("profileExternalUnsupportedBlock", { climate });
          }
          if (block.hvac_mode && !external.supported_hvac_modes.includes(block.hvac_mode)) {
            return this._t("profileExternalUnsupportedBlock", { climate });
          }
          if (("target_temp_low" in block || "target_temp_high" in block)
            && !external.supported_target_types.includes("range")) {
            return this._t("profileExternalUnsupportedBlock", { climate });
          }
          const optionFields = ["fan_mode", "preset_mode", "swing_mode", "swing_horizontal_mode", "humidity"] as const;
          if (optionFields.some((field) => block[field] !== undefined && !external.supported_option_fields.includes(field))) {
            return this._t("profileExternalUnsupportedBlock", { climate });
          }
        }
        const error = this._temperatureError(entityId, block);
        if (error) {
          return this._t("profileScheduleClimateBlockError", {
            climate,
            day: weekdayName(languageFromHass(this.hass), weekday),
            start: block.start,
            error,
          });
        }
      }
    }
    return undefined;
  }

  private _createMode = (): void => {
    if (!this._discardModeChanges()) return;
    this._selectedModeKey = "";
    this._modeDraft = createVelairModeDraft();
    this._modeEditorOpen = true;
    this._setModeDirty(false);
  };

  private _selectMode(mode: VelairMode): void {
    if (!this._discardModeChanges()) return;
    this._selectedModeKey = mode.key;
    this._modeDraft = createVelairModeDraft(mode);
    this._modeEditorOpen = true;
    this._setModeDirty(false);
  }

  private _discardModeChanges(): boolean {
    return !this._modeDirty || window.confirm(this._t("modeDiscardChanges"));
  }

  private _clearModeSelection(): void {
    this._selectedModeKey = "";
    this._modeDraft = createVelairModeDraft();
    this._modeEditorOpen = false;
    this._setModeDirty(false);
  }

  private _updateModeDraft(field: "name", value: string): void {
    this._modeDraft = { ...this._modeDraft, [field]: value };
    this._setModeDirty(true);
  }

  private _toggleModeProfile(profileId: string): void {
    const selected = this._modeDraft.profileIds.includes(profileId);
    this._modeDraft = {
      ...this._modeDraft,
      profileIds: selected
        ? this._modeDraft.profileIds.filter((id) => id !== profileId)
        : [...this._modeDraft.profileIds, profileId],
    };
    this._setModeDirty(true);
  }

  private async _saveMode(): Promise<void> {
    const api = this.hass ? new VelairApiClient(this.hass) : undefined;
    if (!api || this._busy || modeValidationError(
      this._modeDraft,
      this.data?.modes ?? [],
      this.data?.profiles ?? [],
    )) return;
    this._busy = "mode-save";
    this._clearNotices();
    try {
      const response = await api.setVelairMode({
        ...(this._modeDraft.key ? { key: this._modeDraft.key } : {}),
        name: this._modeDraft.name.trim(),
        profile_ids: [...this._modeDraft.profileIds],
      });
      this._emitData(response);
      const key = this._modeDraft.key ?? response.mode_id;
      const saved = response.modes?.find((mode) => mode.key === key);
      if (saved) {
        this._selectedModeKey = saved.key;
        this._modeDraft = createVelairModeDraft(saved);
      }
      this._setModeDirty(false);
      this._showSuccess(this._t("modeSaved"));
    } catch (error) {
      this._error = this._errorMessage(error, "modeUnableSave");
    } finally {
      this._busy = undefined;
    }
  }

  private async _deleteMode(mode: VelairMode): Promise<void> {
    const api = this.hass ? new VelairApiClient(this.hass) : undefined;
    if (!api || this._busy || !window.confirm(this._t("modeConfirmDelete", { mode: mode.name }))) return;
    this._busy = "mode-delete";
    this._clearNotices();
    try {
      this._emitData(await api.deleteVelairMode(mode.key));
      if (mode.key === this._selectedModeKey) this._clearModeSelection();
      this._showSuccess(this._t("modeDeleted"));
    } catch (error) {
      this._error = this._errorMessage(error, "modeUnableDelete");
    } finally {
      this._busy = undefined;
    }
  }

  private async _activate(key?: string | null): Promise<void> {
    const api = this.hass ? new VelairApiClient(this.hass) : undefined;
    if (!api || this._busy || this._operationRunning()) return;
    const operationIdBeforeRequest = this.data?.operation_status?.id;
    this._busy = "activate";
    this._clearNotices();
    try {
      this._emitData(await activateClimateProfile(api, key));
    } catch (error) {
      const operationStatus = this.data?.operation_status;
      const globallyReportedFailure = operationStatus?.state === "failed"
        && operationStatus.id !== operationIdBeforeRequest;
      if (!globallyReportedFailure) {
        this._error = this._errorMessage(error, "profileUnableActivate");
      }
    } finally { this._busy = undefined; }
  }

  private async _selectActiveMode(value: string): Promise<void> {
    const api = this.hass ? new VelairApiClient(this.hass) : undefined;
    if (!api || this._busy || this._operationRunning()) return;
    const selection = value === "default"
      ? { kind: "default" as const }
      : value === "manual"
        ? { kind: "manual" as const }
        : value.startsWith("custom:") && value.slice(7)
          ? { kind: "custom" as const, key: value.slice(7) }
          : undefined;
    if (!selection) return;
    const operationIdBeforeRequest = this.data?.operation_status?.id;
    this._busy = "mode-activate";
    this._clearNotices();
    try {
      this._emitData(await api.selectVelairMode(selection));
      if (selection.kind === "default" && !this._modeDirty) this._clearModeSelection();
    } catch (error) {
      const operationStatus = this.data?.operation_status;
      const globallyReportedFailure = operationStatus?.state === "failed"
        && operationStatus.id !== operationIdBeforeRequest;
      if (!globallyReportedFailure) {
        this._error = this._errorMessage(error, "modeUnableActivate");
      }
    } finally {
      this._busy = undefined;
    }
  }

  private async _save(): Promise<void> {
    if (this._hasUnchosenGroup()) return;
    const api = this.hass ? new VelairApiClient(this.hass) : undefined;
    if (!api || this._busy) return;
    this._busy = "save";
    this._clearNotices();
    try {
      const input = climateProfileInput(this._draft);
      // The mutation validates the complete Profile atomically, including references.
      const data = await api.setClimateProfile(input, this._configurationRevision ?? this.data?.configuration_revision);
      this._emitData(data);
      const saved = data.profiles?.find((profile) => profile.key === (this._draft.key ?? data.profile_id))
        ?? data.profiles?.find((profile) => profile.name === this._draft.name.trim());
      if (saved) {
        this._selectedKey = saved.key;
        this._draft = createClimateProfileDraft(saved);
        this._cloneWeekdayTargets = {};
        this._cloneClimateTargets = {};
      }
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
    const selection = this.data?.profile_selection;
    const active = (selection?.base_profile_ids ?? this.data?.global.active_profile_ids ?? []).includes(profile.key)
      || Object.values(selection?.zone_profile_overrides ?? {}).includes(profile.key);
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

  private _operationRunning(): boolean {
    return this.data?.operation_status?.state === "running";
  }

  private _persistedProfileInput(): ClimateProfileInput | undefined {
    const profile = this.data?.profiles?.find((item) => item.key === this._selectedKey);
    return profile ? climateProfileInput(createClimateProfileDraft(profile)) : undefined;
  }

  private _profileZoneSummary(entityId: string): string {
    const zone = this._draft.zones[entityId];
    const behavior = profileZoneBehavior(zone);
    if (behavior === "schedule") return this._t("profileBehaviorSchedule");
    if (behavior === "pause") {
      const action = zone?.behavior === "pause" && zone.action === "turn_off"
        ? this._t("profilePauseTurnOff")
        : this._t("profilePauseKeep");
      return `${this._t("profileBehaviorPause")}: ${action}`;
    }
    return this._t(behavior === "unconfigured" ? "profileBehaviorUnconfigured" : "profileBehaviorDefault");
  }

  private _profileZoneDirty(
    entityId: string,
    currentInput = climateProfileInput(this._draft),
    persistedInput = this._persistedProfileInput(),
  ): boolean {
    const current = currentInput.zones[entityId];
    const baseline = persistedInput?.zones[entityId];
    return this._canonicalJson(current) !== this._canonicalJson(baseline);
  }

  private _profileDayDirty(
    entityId: string,
    weekday: string,
    currentInput = climateProfileInput(this._draft),
    persistedInput = this._persistedProfileInput(),
  ): boolean {
    const current = currentInput.zones[entityId];
    if (current?.behavior !== "schedule") return false;
    const persisted = persistedInput?.zones[entityId];
    const baseline = persisted?.behavior === "schedule" ? persisted.schedule[weekday] ?? [] : [];
    return this._canonicalJson(current.schedule[weekday] ?? []) !== this._canonicalJson(baseline)
      || this._canonicalJson(current.template_links?.[weekday]) !== this._canonicalJson(persisted?.behavior === "schedule" ? persisted.template_links?.[weekday] : undefined);
  }

  private _profileDraftChanged(): boolean {
    const persisted = this._persistedProfileInput();
    if (!persisted) return false;
    return this._canonicalJson(climateProfileInput(this._draft)) !== this._canonicalJson(persisted);
  }

  private _canonicalJson(value: unknown): string {
    return JSON.stringify(value, (_key, item: unknown) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      return Object.fromEntries(
        Object.entries(item as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)),
      );
    });
  }

  private _showSuccess(message: string): void {
    this.dispatchEvent(new CustomEvent("profile-success", {
      bubbles: true,
      composed: true,
      detail: message,
    }));
  }

  private _clearNotices(): void {
    if (this._error === undefined) return;
    this._error = undefined;
    this.dispatchEvent(new CustomEvent("profile-error", {
      bubbles: true,
      composed: true,
      detail: null,
    }));
  }
  private _setDirty(dirty: boolean): void {
    if (!dirty) this._groupCandidates.clear();
    this._refreshPresetPreviews();
    if (dirty && !this._dirty) this._configurationRevision = this.data?.configuration_revision;
    const nextDirty = dirty && this._profileDraftChanged();
    if (this._dirty === nextDirty) return;
    this._dirty = nextDirty;
    this._emitDirtyState();
  }
  private _setModeDirty(dirty: boolean): void {
    if (this._modeDirty === dirty) return;
    this._modeDirty = dirty;
    this._emitDirtyState();
  }
  private _emitDirtyState(): void {
    const dirty = this._dirty || this._modeDirty;
    this.dispatchEvent(new CustomEvent("profile-dirty-changed", {
      bubbles: true,
      composed: true,
      detail: dirty,
    }));
    this.dispatchEvent(new CustomEvent("velair-dirty-changed", {
      bubbles: true,
      composed: true,
      detail: { dirty, scope: this.workspace === "modes" ? "mode" : "profile" },
    }));
  }
  private _errorMessage(error: unknown, fallback: TranslationKey): string { const message = backendErrorMessage(error, this._t(fallback)); return message === "schedule" ? this._t(fallback) : message; }
  private _t(key: TranslationKey, replacements: Record<string, string | number> = {}): string { return translate(languageFromHass(this.hass), key, replacements); }

  static styles = [cardStyles, profileStyles];
}

if (!customElements.get("velair-profiles-view")) {
  customElements.define("velair-profiles-view", VelairProfilesView);
}
