import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { VelairApiClient } from "../api/client";
import { activateClimateProfile, deleteClimateProfile, saveClimateProfile } from "../controllers/climate-profile-actions";
import {
  activeClimateProfiles,
  climateProfileAccentColor,
  climateProfileValidationError,
  cloneProfileScheduleDay,
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
  firstUnsupportedModeBlock,
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
import { dictionaryLabel, languageFromHass, translate, weekdayName } from "../i18n";
import { PROFILE_DESCRIPTION_MAX_LENGTH, MODE_NAME_MAX_LENGTH, WEEKDAYS } from "../constants";
import { orderedWeekdays, orderedZoneIds } from "../domain/settings";
import { cardStyles } from "../styles/card-styles";
import { profileStyles } from "../styles/profile-styles";
import type { VelairViewHost } from "../host-types";
import type {
  ActiveSetupControls,
  ClimateProfile,
  DraftScheduleBlock,
  HomeAssistant,
  VelairMode,
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
  @property({ attribute: "active-setup-controls" })
  public activeSetupControls: ActiveSetupControls = "both";

  @state() private _selectedKey = "";
  @state() private _draft: ClimateProfileDraft = createClimateProfileDraft();
  @state() private _selectedDays: Record<string, string> = {};
  @state() private _cloneDayTargets: Record<string, Set<string>> = {};
  @state() private _busy?: "activate" | "save" | "delete" | "mode-save" | "mode-delete" | "mode-activate";
  @state() private _dirty = false;
  @state() private _error?: string;
  @state() private _expandedZones = new Set<string>();
  @state() private _selectedModeKey = "";
  @state() private _modeEditorOpen = false;
  @state() private _modeDraft: VelairModeDraft = createVelairModeDraft();
  @state() private _modeDirty = false;
  @state() private _activeLibrary: "profiles" | "modes" = "profiles";

  protected willUpdate(changed: Map<string, unknown>): void {
    if (!changed.has("data")) {
      return;
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
          <strong>${this._t("profilesAndModes")}</strong>
          <small>${this._t("profilesPanelIntro")}</small>
        </span>
      </header>
      ${selector}
      ${notices}
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
    `;
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
        <div class="library-concept-note">
          <ha-icon icon="mdi:account-switch-outline"></ha-icon>
          <span>
            <strong>${this._t("profiles")}</strong>
            <small>${this._t("profilesDescription")}</small>
          </span>
        </div>
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
    const active = this.data?.global.active_profile_ids?.includes(profile.key) ?? false;
    const selectedByMode = active && Boolean(this.data?.active_mode_id);
    const activationDisabled = (active && !selectedByMode)
      || Boolean(this._busy)
      || this._operationRunning()
      || this._dirty;
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
          title=${active && !selectedByMode ? this._t("profileActive") : this._t("profileActivate")}
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
    const activeProfiles = activeClimateProfiles(this.data);
    const activeProfileIds = this.data?.global.active_profile_ids ?? [];
    const profiles = this.data?.profiles ?? [];
    const modes = this.data?.modes ?? [];
    const origin = activeProfileOrigin(this.data);
    const modeLabel = origin === "default"
      ? this._t("modeDefault")
      : origin === "manual"
        ? this._t("modeManual")
        : origin.name;
    const modeValue = origin === "default" ? "default" : origin === "manual" ? "manual" : `custom:${origin.key}`;
    const mappedProfiles = typeof origin === "string"
      ? []
      : origin.profile_ids
        .map((profileId) => profiles.find((profile) => profile.key === profileId))
        .filter((profile): profile is ClimateProfile => Boolean(profile));
    const modeDetail = origin === "default"
      ? this._t("modeDefaultDescription")
      : origin === "manual"
        ? this._t("modeManualDescription")
        : this._t("modeCustomDescription", {
          profile: mappedProfiles.map((profile) => profile.name).join(", "),
        });
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
            @focusout=${this._handleActiveSetupMenuFocusout}
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
                  <small>${this._t("activeSetupModesHelp")}</small>
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
                ${this._renderActiveModeOption(
                  "manual",
                  this._t("modeManual"),
                  activeProfileIds.length
                    ? this._t("modeManualDescription")
                    : this._t("activeSetupManualUnavailable"),
                  "mdi:gesture-tap",
                  modeValue === "manual",
                  [],
                  disabled || activeProfileIds.length === 0,
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
                  <strong id="active-setup-profiles-heading">${this._t("activeSetupManualProfile")}</strong>
                  <small>${this._t("activeSetupManualProfileHelp")}</small>
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
                    modeValue === "manual" && activeProfileIds.length === 1 && activeProfileIds[0] === profile.key,
                    disabled,
                  ))
                  : html`<span class="empty active-setup-empty">${this._t("profileNoneCreated")}</span>`}
              </section>` : nothing}
            </div>
          </details>
        </div>
        <div class="active-setup-summary">
          <div class="active-setup-mode">
            <span class="active-setup-summary-icon neutral"><ha-icon icon="mdi:format-list-bulleted"></ha-icon></span>
            <span class="active-setup-summary-copy">
              <small>${this._t("modeLabel")}</small>
              <strong>${modeLabel}</strong>
              <span title=${modeDetail}>${modeDetail}</span>
            </span>
          </div>
          <div class="active-setup-profiles">
            <span class="active-setup-summary-label">${this._t("activeSetupAppliedProfiles")}</span>
            ${activeProfiles.length
              ? html`
                <span class="active-setup-profile-list">
                  ${activeProfiles.map((profile) => html`
                    <span
                      class="active-setup-profile"
                      style=${`--profile-accent: ${climateProfileAccentColor(profile.key, profile.color)}`}
                      title=${profile.description || profile.name}
                    >
                      <ha-icon icon=${profile.icon || "mdi:account-outline"}></ha-icon>
                      <span>${profile.name}</span>
                    </span>
                  `)}
                </span>
              `
              : html`<span class="active-setup-no-profiles">${this._t("activeSetupNoProfiles")}</span>`}
          </div>
        </div>
      </section>
    `;
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
      <button
        class=${current ? "active-setup-option profile current" : "active-setup-option profile"}
        style=${`--profile-accent: ${climateProfileAccentColor(profile.key, profile.color)}`}
        type="button"
        data-profile-id=${profile.key}
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

  private _handleActiveSetupMenuFocusout(event: FocusEvent): void {
    const menu = event.currentTarget as HTMLDetailsElement;
    const next = event.relatedTarget;
    if (next instanceof Node && menu.contains(next)) return;
    menu.open = false;
  }

  private _renderModes() {
    const modes = this.data?.modes ?? [];
    return html`
      <section class="template-library mode-library" aria-label=${this._t("modesTitle")}>
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
    return html`
      <div class="template-item mode-item built-in">
        <div class="template-item-main mode-item-main">
          <ha-icon icon=${mode === "default" ? "mdi:calendar-clock-outline" : "mdi:gesture-tap"}></ha-icon>
          <span><strong>${label}</strong></span>
        </div>
        <button
          class="mode-help"
          type="button"
          aria-label=${this._t("modeInformation", { mode: label })}
          aria-describedby=${tooltipId}
          @click=${(event: Event) => event.stopPropagation()}
        >
          <ha-icon icon="mdi:information-outline"></ha-icon>
          <span id=${tooltipId} class="mode-help-tooltip" role="tooltip">${description}</span>
        </button>
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
    const unsupportedModeError = this._unsupportedScheduleModeError();
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
        ${unsupportedModeError
          ? html`<div class="notice error profile-schedule-error" role="alert">${unsupportedModeError}</div>`
          : nothing}
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
                <option value="normal">${this._t("profileBehaviorDefault")}</option>
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
    const cloneTargets = new Set(
      [...(this._cloneDayTargets[entityId] ?? [])].filter((day) => day !== weekday),
    );
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
        <div class="copy-panel profile-day-copy">
          <div class="copy-header">
            <div>
              <span class="label">${this._t("cloneDayToDays")}</span>
              <strong>${this._t("otherDays")}</strong>
            </div>
          </div>
          <div class="copy-targets">
            ${weekdays
              .filter((day) => day !== weekday)
              .map((day) => html`
                <label class="check-target" title=${weekdayName(languageFromHass(this.hass), day)}>
                  <input
                    type="checkbox"
                    .checked=${cloneTargets.has(day)}
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
              ?disabled=${cloneTargets.size === 0 || this._hasScheduleValidationError()}
              @click=${() => this._cloneSelectedDay(entityId, weekday, cloneTargets)}
            >
              <ha-icon icon="mdi:content-copy"></ha-icon>
              <span>${this._t("cloneAction")}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _clearSelection = (): void => {
    this._selectedKey = "";
    this._draft = createClimateProfileDraft();
    this._selectedDays = {};
    this._cloneDayTargets = {};
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
        this._cloneDayTargets = {};
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
    this._selectedDays = {};
    this._cloneDayTargets = {};
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
    const targets = new Set(this._cloneDayTargets[entityId] ?? []);
    targets.delete(weekday);
    this._cloneDayTargets = { ...this._cloneDayTargets, [entityId]: targets };
  }

  private _toggleCloneDayTarget(entityId: string, weekday: string, checked: boolean): void {
    const targets = new Set(this._cloneDayTargets[entityId] ?? []);
    if (checked) targets.add(weekday);
    else targets.delete(weekday);
    this._cloneDayTargets = { ...this._cloneDayTargets, [entityId]: targets };
  }

  private _cloneSelectedDay(
    entityId: string,
    weekday: string,
    targetWeekdays: Set<string>,
  ): void {
    const zone = this._draft.zones[entityId];
    if (zone?.behavior !== "schedule" || targetWeekdays.size === 0) return;
    this._draft = {
      ...this._draft,
      zones: {
        ...this._draft.zones,
        [entityId]: {
          ...zone,
          schedule: cloneProfileScheduleDay(zone.schedule, weekday, targetWeekdays),
        },
      },
    };
    this._cloneDayTargets = { ...this._cloneDayTargets, [entityId]: new Set() };
    this._setDirty(true);
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
    if (this._unsupportedScheduleModeError()) return true;
    return Object.entries(this._draft.zones).some(([entityId, zone]) =>
      zone.behavior === "schedule"
      && WEEKDAYS.some((weekday) => (zone.schedule[weekday] ?? []).some((block) =>
        Boolean(this._temperatureError(entityId, block)))),
    );
  }

  private _unsupportedScheduleModeError(): string | undefined {
    for (const [entityId, zone] of Object.entries(this._draft.zones)) {
      if (zone.behavior !== "schedule") continue;
      const state = this.hass?.states?.[entityId];
      for (const weekday of WEEKDAYS) {
        const unsupported = firstUnsupportedModeBlock(
          zone.schedule[weekday] ?? [],
          climateSupportedModes(state),
        );
        if (!unsupported?.hvac_mode) continue;
        return this._t("unsupportedModeForClimate", {
          entity: state?.attributes?.friendly_name ?? entityId,
          mode: dictionaryLabel(
            languageFromHass(this.hass),
            "hvacModes",
            unsupported.hvac_mode,
          ),
          start: unsupported.start,
        });
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
    const api = this.hass ? new VelairApiClient(this.hass) : undefined;
    if (!api || this._busy) return;
    this._busy = "save";
    this._clearNotices();
    try {
      const data = await saveClimateProfile(api, this._draft);
      this._emitData(data);
      const saved = data.profiles?.find((profile) => profile.key === (this._draft.key ?? data.profile_id))
        ?? data.profiles?.find((profile) => profile.name === this._draft.name.trim());
      if (saved) {
        this._selectedKey = saved.key;
        this._draft = createClimateProfileDraft(saved);
        this._selectedDays = {};
        this._cloneDayTargets = {};
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
    const active = this.data?.global.active_profile_ids?.includes(profile.key) ?? false;
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
    this._emitDirtyState();
  }
  private _setModeDirty(dirty: boolean): void {
    if (this._modeDirty === dirty) return;
    this._modeDirty = dirty;
    this._emitDirtyState();
  }
  private _emitDirtyState(): void {
    this.dispatchEvent(new CustomEvent("profile-dirty-changed", {
      bubbles: true,
      composed: true,
      detail: this._dirty || this._modeDirty,
    }));
  }
  private _errorMessage(error: unknown, fallback: TranslationKey): string { return error instanceof Error && error.message && error.message !== "schedule" ? error.message : this._t(fallback); }
  private _t(key: TranslationKey, replacements: Record<string, string | number> = {}): string { return translate(languageFromHass(this.hass), key, replacements); }

  static styles = [cardStyles, profileStyles];
}

if (!customElements.get("velair-profiles-view")) {
  customElements.define("velair-profiles-view", VelairProfilesView);
}
