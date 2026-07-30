import { LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import { OPERATION_SUCCESS_VISIBLE_MS, PORTABLE_SECTIONS } from "../constants";
import {
  asCardContextHost,
  dictionaryLabelForHost,
  effectiveView,
  firstWeekdayForHost,
  inputValue,
  isCardView,
  languageForHost,
  orderedWeekdaysForHost,
  orderedZoneIdsForHost,
  preconditioningInputsChanged,
  shortWeekdayNameForHost,
  shouldUpdateForHass,
  translateForHost,
  visibleZoneIdsForHost,
  weekdayNameForHost,
} from "../controllers/card-context";
import type {
  BlockDraftSource,
  ComfortSettings,
  DraftScheduleBlock,
  EntityDiagnostic,
  HomeAssistant,
  NormalizedBlocks,
  PortableSection,
  PanelSettings,
  ScheduleBlock,
  ScheduleEvent,
  ScheduleResponse,
  ScheduleTemplate,
  PreconditioningSettings,
  VelairCardConfig,
  VelairCardView,
  VelairPortablePayload,
} from "../types";
import type { SupportedLanguage, TranslationKey } from "../translations";
import { cardStyles } from "../styles/card-styles";
import { VelairApiClient } from "../api/client";
import type { PortableSummaryItem } from "../domain/portable";
import { changedPreconditioningEventEntityIds } from "../domain/schedule-events";
import { scheduleTemplatesFromStored, templateLabel } from "../domain/templates";
import {
  overviewTimelineInitialScrollLeft,
  timelineNowMarker,
  type TimelineBlock,
} from "../domain/timeline";
import {
  asSchedulerControlsHost,
  canResumeScheduler,
  closeSchedulerMenu,
  handleSchedulerMenuToggle,
  nextCountdownExpirationMs,
  pauseExpirationMs,
  pauseProgressPercent,
  pauseScheduler,
  resumeScheduler,
  stopPauseTick,
  syncPauseTick,
  toggleNextEvents,
} from "../controllers/scheduler-controls";
import {
  asNoticeHost,
  clearSuccessNoticeTimer,
  dismissNotice,
  showSuccess,
  successNoticeProgress,
} from "../controllers/notice-actions";
import {
  addBlock,
  asDraftActionsHost,
  markDirty,
  removeBlock,
  setDraftBlockStart,
  toggleCopyTarget,
  toggleZoneTarget,
  updateDraftBlock,
} from "../controllers/draft-actions";
import {
  asDraftValidationHost,
  hasDraftValidationError,
  temperatureError,
} from "../controllers/draft-validation";
import {
  asPortabilityHost,
  downloadPortablePayload,
  exportPortableData,
  handlePortableImportFile,
  importAvailableSections,
  importPortableData,
  portableExportItems,
  portableImportItems,
  portableSectionLabel,
  portableSummaryItem,
  resetVelairData,
  togglePortableSection,
} from "../controllers/portability-actions";
import {
  asSettingsActionsHost,
  handleSettingsZoneDragEnd,
  handleSettingsZoneDragOver,
  handleSettingsZoneDragStart,
  handleSettingsZoneDrop,
  moveSettingsZone,
  saveSettings,
  saveZoneComfort,
  saveZonePreconditioning,
  resetZonePreconditioningLearning,
  resetZonePreconditioningSettings,
  updateSettingsFirstWeekday,
  updateSettingsZoneOrder,
} from "../controllers/settings-actions";
import {
  asTimelineHost,
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
import {
  applySelectedDayToZones,
  asScheduleActionsHost,
  clampBlocksForEntity,
  copySelectedDay,
  normalizeDraftBlocks,
  saveSelectedDay,
  unsupportedModeError,
} from "../controllers/schedule-actions";
import {
  applyScheduleData,
  asScheduleStateHost,
  blocksForSource,
  loadSchedule,
  markBlocksDirty,
  resetDraftBlocks,
  selectEntity,
  selectWeekday,
  setBlocksForSource,
  subscribeUpdates,
} from "../controllers/schedule-state";
import {
  asClimateDisplayHost,
  climateProvidedData,
  climateSupportedModesForHost,
  dateLocaleForHost,
  entityDiagnostic,
  entityExists,
  entityFanModeOptionsForHost,
  entityHumidityLimitsForHost,
  entityPresetModeOptionsForHost,
  entitySwingHorizontalModeOptionsForHost,
  entitySwingModeOptionsForHost,
  entityTemperatureLimitsForHost,
  entityTemperatureStepForHost,
  fanModeOptions,
  formatDateTimeForHost,
  formatEventActionForHost,
  formatEventModeForHost,
  formatRemaining,
  formatScheduleTimeForHost,
  formatTemperatureForHost,
  formatTemperatureLimit,
  friendlyEntityName,
  humidityLimits,
  hvacModeOptions,
  presetModeOptions,
  swingHorizontalModeOptions,
  swingModeOptions,
  temperatureLimits,
  temperatureStep,
  temperatureUnitForHost,
  templateTemperatureLimits,
  uniqueModes,
} from "../controllers/climate-display";
import {
  applySelectedTemplate,
  applyTemplateToTargets,
  asTemplateActionsHost,
  createTemplate,
  createTemplateKey,
  deleteSelectedTemplate,
  resetTemplateDraft,
  saveSelectedTemplateFromLibrary,
  saveTemplate,
  selectScheduleTemplate,
  selectTemplate,
  setTemplateListScrollIndicators,
  syncTemplateListScrollIndicators,
  templateListClass,
  templateNameInputValue,
  templateTargetKey,
  toggleTemplateApplyPanel,
  toggleTemplateApplyTargetForHost,
  uniqueTemplateNameForHost,
  updateTemplateNameDraft,
} from "../controllers/template-actions";
import { asVelairViewHost } from "../host-types";
import { renderCardContent } from "../views/card-content";
import {
  dismissOperationStatusAcrossViews,
  OPERATION_STATUS_DISMISSED_EVENT,
} from "../views/operation-status-view";

export class VelairCard extends LitElement {
  private _hass?: HomeAssistant;

  public get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  public set hass(value: HomeAssistant | undefined) {
    const oldValue = this._hass;
    const oldGlobalUnit = oldValue?.config?.unit_system?.temperature;
    const nextGlobalUnit = value?.config?.unit_system?.temperature;
    const globalUnitChanged = oldGlobalUnit !== nextGlobalUnit;
    const refreshPreconditioning = preconditioningInputsChanged(
      asCardContextHost(this),
      value,
      oldValue,
    );
    this._hass = value;
    if (this._shouldUpdateForHass(value, oldValue)) {
      this.requestUpdate("hass", oldValue);
    }
    if (refreshPreconditioning) {
      this._schedulePreconditioningRefresh();
    }
    if (globalUnitChanged && oldValue && this._data) {
      // Stored values are migrated atomically by the backend. Never mutate
      // drafts from a Home Assistant state update: doing so can double-convert
      // values while the scheduler is deliberately blocked.
      this._temperatureUnitReloadPending = true;
      void this._loadSchedule();
    }
  }

  private _api(): VelairApiClient | undefined {
    return this.hass ? new VelairApiClient(this.hass) : undefined;
  }

  @property({ type: String }) public view: VelairCardView = "overview-status";

  @state() private _config: VelairCardConfig = {};
  @state() private _changedNextEventIds = new Set<string>();
  @state() private _data?: ScheduleResponse;
  @state() private _error?: string;
  @state() private _loading = false;
  @state() private _saving = false;
  @state() private _saveMessage?: string;
  @state() private _selectedEntity?: string;
  @state() private _selectedWeekday = "monday";
  @state() private _draftBlocks: DraftScheduleBlock[] = [];
  @state() private _dirty = false;
  @state() private _dismissedOperationId?: string;
  @state() private _dirtyEntityId?: string;
  @state() private _copyTargets = new Set<string>();
  @state() private _copying = false;
  @state() private _zoneTargets = new Set<string>();
  @state() private _applyingZones = false;
  @state() private _selectedTemplateKey = "";
  @state() private _templateNameDraft = "";
  @state() private _templateNameDraftKey = "";
  @state() private _templateDraftBlocks: DraftScheduleBlock[] = [];
  @state() private _templateDraftKey = "";
  @state() private _templateDirty = false;
  @state() private _templateApplyOpen = false;
  @state() private _templateApplyTargets = new Set<string>();
  @state() private _applyingTemplateTargets = false;
  @state() private _templateListCanScrollUp = false;
  @state() private _templateListCanScrollDown = false;
  @state() private _templateAction?: "save" | "delete";
  @state() private _settingsSaving = false;
  @state() private _temperatureMigrationAction?: "°C" | "°F";
  @state() private _maintenanceAction?: "reset";
  @state() private _portabilityAction?: "export" | "import";
  @state() private _exportSections = new Set<PortableSection>(PORTABLE_SECTIONS);
  @state() private _expandedComfortZones = new Set<string>();
  @state() private _expandedPreconditioningZones = new Set<string>();
  @state() private _importSections = new Set<PortableSection>();
  @state() private _importPayload?: VelairPortablePayload;
  @state() private _importFileName = "";
  @state() private _pauseDurationMinutes = 60;
  @state() private _controlAction?: "pause" | "resume";
  @state() private _schedulerMenuOpen = false;
  @state() private _nextEventsOpen = false;
  @state() private _nextEventChangeRevision = 0;
  @state() private _overviewTimelineDetail?: string;
  @state() private _overviewTimelineDetailAnchor?: number;
  @state() private _overviewTimelineDetailEntityId?: string;
  @state() private _successNoticeStartedAt?: number;
  @state() private _timelineNow = new Date();
  private _unsubscribeUpdates?: () => Promise<void> | void;
  private _subscribing = false;
  private _successNoticeTick?: number;
  private _successNoticeTimeout?: number;
  private _operationStatusTimeout?: number;
  private _pauseTick?: number;
  private _pauseTickDelay?: number;
  private _preconditioningRefreshTimer?: number;
  private _nextEventChangeTimeout?: number;
  private _timelineNowTick?: number;
  private _temperatureUnitReloadPending = false;
  private _overviewTimelineScrollInitialized = false;
  private _draggedTimelineIndex?: number;
  private _timelineResize?: {
    edge: "start" | "end";
    index: number;
    source: BlockDraftSource;
    track: HTMLElement;
  };
  private _draggedSettingsEntity?: string;
  private _hasExternalConfig = false;
  private _previousBodyCursor?: string;
  private _previousDocumentCursor?: string;
  private readonly _handleOperationStatusDismissed = (event: Event): void => {
    const operationId = (event as CustomEvent<string>).detail;
    if (operationId !== this._data?.operation_status?.id) {
      return;
    }
    this._dismissedOperationId = operationId;
    this._clearOperationStatusTimer();
  };

  public setConfig(config: VelairCardConfig): void {
    this._hasExternalConfig = true;
    const previousSelectedEntity = this._selectedEntity;
    this._config = config ?? {};
    this._selectedEntity = config?.selected_entity;
    if (this._data) {
      const visibleZoneIds = this._visibleZoneIds(this._data.configured_entities);
      if (!this._selectedEntity || !visibleZoneIds.includes(this._selectedEntity)) {
        this._selectedEntity = visibleZoneIds[0];
      }
    }
    this._selectedWeekday = this._firstWeekday();
    if (this._selectedEntity !== previousSelectedEntity) {
      this._resetDraftBlocks();
    }
  }

  public connectedCallback(): void {
    super.connectedCallback();
    void this._loadSchedule();
    void this._subscribeUpdates();
    this._syncTimelineNowTick();
    window.addEventListener(
      OPERATION_STATUS_DISMISSED_EVENT,
      this._handleOperationStatusDismissed,
    );
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._unsubscribeUpdates) {
      void this._unsubscribeUpdates();
      this._unsubscribeUpdates = undefined;
    }
    this._clearSuccessNoticeTimer();
    this._clearOperationStatusTimer();
    this._clearNextEventChangeTimer();
    this._clearPreconditioningRefreshTimer();
    this._clearOverviewTimelineDetail();
    this._stopPauseTick();
    this._stopTimelineNowTick();
    window.removeEventListener(
      OPERATION_STATUS_DISMISSED_EVENT,
      this._handleOperationStatusDismissed,
    );
  }

  public getCardSize(): number {
    return 8;
  }

  public getGridOptions() {
    return {
      columns: 12,
      min_columns: 6,
      rows: 8,
      min_rows: 5,
    };
  }

  public static getStubConfig(): VelairCardConfig {
    return {
      title: "Velair",
      view: "overview-status",
    };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("velair-card-editor");
  }

  protected updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("hass") && this.hass && !this._data && !this._loading) {
      void this._loadSchedule();
    }
    if (changedProperties.has("hass") && this.hass) {
      void this._subscribeUpdates();
    }
    if (changedProperties.has("_saveMessage") && !this._saveMessage) {
      this._clearSuccessNoticeTimer();
    }
    if (changedProperties.has("_data")) {
      this._syncOperationStatusTimer();
    }
    if (
      this._effectiveView() === "templates" &&
      (changedProperties.has("view") ||
        changedProperties.has("_data") ||
        changedProperties.has("_selectedTemplateKey") ||
        changedProperties.has("_templateListCanScrollUp") ||
        changedProperties.has("_templateListCanScrollDown"))
    ) {
      window.requestAnimationFrame(() => this._syncTemplateListScrollIndicators());
    }
    if (changedProperties.has("view") || changedProperties.has("_data")) {
      this._syncTimelineNowTick();
    }
    const effectiveView = this._effectiveView();
    const showsOverviewTimeline = effectiveView === "overview" || effectiveView === "overview-timeline";
    if (!showsOverviewTimeline) {
      this._overviewTimelineScrollInitialized = false;
    } else if (this._data && !this._overviewTimelineScrollInitialized) {
      this._overviewTimelineScrollInitialized = true;
      window.requestAnimationFrame(() => this._scrollOverviewTimelineToNow());
    }
  }

  protected render() {
    return renderCardContent(asVelairViewHost(this));
  }

  private _dismissOperationStatus(): void {
    const operationId = this._data?.operation_status?.id;
    if (!operationId) {
      return;
    }
    dismissOperationStatusAcrossViews(operationId);
  }

  private _syncOperationStatusTimer(): void {
    this._clearOperationStatusTimer();
    const operation = this._data?.operation_status;
    if (!operation || operation.state === "running") {
      if (operation?.id !== this._dismissedOperationId) {
        this._dismissedOperationId = undefined;
      }
      return;
    }
    if (operation.state !== "completed" || !operation.finished_at) {
      return;
    }
    const finishedAt = Date.parse(operation.finished_at);
    const remaining = Number.isFinite(finishedAt)
      ? OPERATION_SUCCESS_VISIBLE_MS - (Date.now() - finishedAt)
      : OPERATION_SUCCESS_VISIBLE_MS;
    if (remaining <= 0) {
      this._dismissedOperationId = operation.id;
      return;
    }
    this._operationStatusTimeout = window.setTimeout(() => {
      if (this._data?.operation_status?.id === operation.id) {
        this._dismissedOperationId = operation.id;
      }
      this._operationStatusTimeout = undefined;
    }, remaining);
  }

  private _clearOperationStatusTimer(): void {
    if (this._operationStatusTimeout !== undefined) {
      window.clearTimeout(this._operationStatusTimeout);
      this._operationStatusTimeout = undefined;
    }
  }

  private _effectiveView(): VelairCardView {
    return effectiveView(this.getAttribute("view"), this.view, this._config.view);
  }

  private _timelineShouldTick(): boolean {
    if (!this._data) {
      return false;
    }
    const view = this._effectiveView();
    return view === "overview" || view.startsWith("overview-") || view === "schedules" || view === "templates";
  }

  private _syncTimelineNowTick(): void {
    if (!this._timelineShouldTick()) {
      this._stopTimelineNowTick();
      return;
    }
    if (this._timelineNowTick !== undefined) {
      return;
    }
    this._timelineNow = new Date();
    this._scheduleTimelineNowTick();
  }

  private _scheduleTimelineNowTick(): void {
    this._stopTimelineNowTick();
    const now = new Date();
    const delayMs = Math.max(1000, (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 50);
    this._timelineNowTick = window.setTimeout(() => {
      this._timelineNowTick = undefined;
      this._timelineNow = new Date();
      this._syncTimelineNowTick();
    }, delayMs);
  }

  private _stopTimelineNowTick(): void {
    if (this._timelineNowTick !== undefined) {
      window.clearTimeout(this._timelineNowTick);
      this._timelineNowTick = undefined;
    }
  }

  private _currentTimelineNow(): Date {
    return this._timelineNow;
  }

  private _scrollOverviewTimelineToNow(): void {
    const scroller = this.renderRoot.querySelector<HTMLElement>(".overview-timeline-scroll");
    const stickyNames = scroller?.querySelector<HTMLElement>(".overview-timeline-names");
    if (!scroller || !stickyNames || scroller.scrollWidth <= scroller.clientWidth + 1) {
      return;
    }

    const marker = timelineNowMarker(this._currentTimelineNow());
    scroller.scrollLeft = overviewTimelineInitialScrollLeft(
      marker.left,
      scroller.scrollWidth,
      scroller.clientWidth,
      stickyNames.offsetWidth,
    );
  }

  private _showOverviewTimelineDetail(
    entityId: string,
    detail: string,
    anchorPercent: number,
    event: Event,
  ): void {
    const shouldUseTapDetail = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    if (!shouldUseTapDetail) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this._overviewTimelineDetail = detail;
    this._overviewTimelineDetailAnchor = Math.max(0, Math.min(100, anchorPercent));
    this._overviewTimelineDetailEntityId = entityId;
  }

  private _clearOverviewTimelineDetail(): void {
    this._overviewTimelineDetail = undefined;
    this._overviewTimelineDetailAnchor = undefined;
    this._overviewTimelineDetailEntityId = undefined;
  }

  private _isCardView(value?: string | null): value is VelairCardView {
    return isCardView(value);
  }

  private _shouldUpdateForHass(value?: HomeAssistant, oldValue?: HomeAssistant): boolean {
    return shouldUpdateForHass(asCardContextHost(this), value, oldValue);
  }

  private _canResumeScheduler(): boolean {
    return canResumeScheduler(asSchedulerControlsHost(this));
  }

  private _selectTemplate(key: string): void {
    selectTemplate(asTemplateActionsHost(this), key);
  }

  private _selectScheduleTemplate(key: string): void {
    selectScheduleTemplate(asTemplateActionsHost(this), key);
  }

  private _resetTemplateDraft(template?: ScheduleTemplate): void {
    resetTemplateDraft(asTemplateActionsHost(this), template);
  }

  private _templateListClass(templateCount: number): string {
    return templateListClass(asTemplateActionsHost(this), templateCount);
  }

  private _handleTemplateListScroll = (): void => {
    this._syncTemplateListScrollIndicators();
  };

  private _syncTemplateListScrollIndicators(): void {
    syncTemplateListScrollIndicators(asTemplateActionsHost(this));
  }

  private _setTemplateListScrollIndicators(canScrollUp: boolean, canScrollDown: boolean): void {
    setTemplateListScrollIndicators(asTemplateActionsHost(this), canScrollUp, canScrollDown);
  }

  private _templateNameInputValue(template: ScheduleTemplate): string {
    return templateNameInputValue(asTemplateActionsHost(this), template);
  }

  private _updateTemplateNameDraft(key: string, value: string): void {
    updateTemplateNameDraft(asTemplateActionsHost(this), key, value);
  }

  private async _createTemplate(): Promise<void> {
    await createTemplate(asTemplateActionsHost(this));
  }

  private async _saveSelectedTemplateFromLibrary(template: ScheduleTemplate): Promise<void> {
    await saveSelectedTemplateFromLibrary(asTemplateActionsHost(this), template);
  }

  private _uniqueTemplateName(baseName: string): string {
    return uniqueTemplateNameForHost(asTemplateActionsHost(this), baseName);
  }

  private _scheduleTemplates(): ScheduleTemplate[] {
    return scheduleTemplatesFromStored(this._data?.templates, this._temperatureUnit());
  }

  private _templateLabel(template: ScheduleTemplate): string {
    return templateLabel(template);
  }

  private async _loadSchedule(): Promise<void> {
    if (this._loading) {
      return;
    }
    do {
      this._temperatureUnitReloadPending = false;
      await loadSchedule(asScheduleStateHost(this));
    } while (this._temperatureUnitReloadPending);
  }

  private async _subscribeUpdates(): Promise<void> {
    await subscribeUpdates(asScheduleStateHost(this));
  }

  private _applyScheduleData(data: ScheduleResponse, options: { forceDraft?: boolean } = {}): void {
    const changedEntityIds = changedPreconditioningEventEntityIds(
      this._data?.next_events ?? [],
      data.next_events,
    );
    applyScheduleData(asScheduleStateHost(this), data, options);
    this._markChangedNextEvents(changedEntityIds);
  }

  private _schedulePreconditioningRefresh(): void {
    if (this._preconditioningRefreshTimer !== undefined || !this.isConnected) {
      return;
    }
    this._preconditioningRefreshTimer = window.setTimeout(() => {
      this._preconditioningRefreshTimer = undefined;
      void this._loadSchedule();
    }, 1200);
  }

  private _clearPreconditioningRefreshTimer(): void {
    if (this._preconditioningRefreshTimer === undefined) {
      return;
    }
    window.clearTimeout(this._preconditioningRefreshTimer);
    this._preconditioningRefreshTimer = undefined;
  }

  private _markChangedNextEvents(entityIds: string[]): void {
    if (!entityIds.length) {
      return;
    }
    this._clearNextEventChangeTimer(false);
    this._changedNextEventIds = new Set(entityIds);
    this._nextEventChangeRevision += 1;
    this._nextEventChangeTimeout = window.setTimeout(() => {
      this._nextEventChangeTimeout = undefined;
      this._changedNextEventIds = new Set();
    }, 2200);
  }

  private _clearNextEventChangeTimer(clearIds = true): void {
    if (this._nextEventChangeTimeout !== undefined) {
      window.clearTimeout(this._nextEventChangeTimeout);
      this._nextEventChangeTimeout = undefined;
    }
    if (clearIds && this._changedNextEventIds.size) {
      this._changedNextEventIds = new Set();
    }
  }

  private _resetDraftBlocks(): void {
    resetDraftBlocks(asScheduleStateHost(this));
  }

  private _selectEntity(entityId: string): void {
    selectEntity(asScheduleStateHost(this), entityId);
  }

  private _selectWeekday(weekday: string): void {
    selectWeekday(asScheduleStateHost(this), weekday);
  }

  private _blocksForSource(source: BlockDraftSource): DraftScheduleBlock[] {
    return blocksForSource(asScheduleStateHost(this), source);
  }

  private _setBlocksForSource(source: BlockDraftSource, blocks: DraftScheduleBlock[]): void {
    setBlocksForSource(asScheduleStateHost(this), source, blocks);
  }

  private _markBlocksDirty(source: BlockDraftSource): void {
    markBlocksDirty(asScheduleStateHost(this), source);
  }

  private _addBlock = (source: BlockDraftSource = "schedule"): void => {
    addBlock(asDraftActionsHost(this), source);
  };

  private _toggleTemplateApplyPanel(): void {
    toggleTemplateApplyPanel(asTemplateActionsHost(this));
  }

  private _templateApplyTargetKey(entityId: string, weekday: string): string {
    return templateTargetKey(entityId, weekday);
  }

  private _toggleTemplateApplyTarget(entityId: string, weekday: string, checked: boolean): void {
    toggleTemplateApplyTargetForHost(asTemplateActionsHost(this), entityId, weekday, checked);
  }

  private async _applyTemplateToTargets(template: ScheduleTemplate): Promise<void> {
    await applyTemplateToTargets(asTemplateActionsHost(this), template);
  }

  private _applySelectedTemplate = (): boolean => {
    return applySelectedTemplate(asTemplateActionsHost(this));
  };

  private async _saveTemplate(saveAsNew: boolean): Promise<void> {
    await saveTemplate(asTemplateActionsHost(this), saveAsNew);
  }

  private _newTemplateKey(): string {
    return createTemplateKey();
  }

  private async _deleteSelectedTemplate(): Promise<void> {
    await deleteSelectedTemplate(asTemplateActionsHost(this));
  }

  private _pauseScheduler = async (
    indefinite: boolean,
    options: { showSuccess?: boolean } = {},
  ): Promise<void> => {
    await pauseScheduler(asSchedulerControlsHost(this), indefinite, options);
  };

  private _resumeScheduler = async (options: { showSuccess?: boolean } = {}): Promise<void> => {
    await resumeScheduler(asSchedulerControlsHost(this), options);
  };

  private _closeSchedulerMenu(): void {
    closeSchedulerMenu(asSchedulerControlsHost(this));
  }

  private _handleSchedulerMenuToggle = (event: MouseEvent): void => {
    handleSchedulerMenuToggle(asSchedulerControlsHost(this), event);
  };

  private _toggleNextEvents = (): void => {
    toggleNextEvents(asSchedulerControlsHost(this));
  };

  private _removeBlock(index: number, source: BlockDraftSource = "schedule"): void {
    removeBlock(asDraftActionsHost(this), index, source);
  }

  private _updateDraftBlock(index: number, field: keyof DraftScheduleBlock, value: string, source: BlockDraftSource = "schedule"): void {
    updateDraftBlock(asDraftActionsHost(this), index, field, value, source);
  }

  private _markDirty(): void {
    markDirty(asDraftActionsHost(this));
  }

  private _handleTimelineDragStart(index: number, source: BlockDraftSource, event: DragEvent): void {
    handleTimelineDragStart(asTimelineHost(this), index, source, event);
  }

  private _handleTimelineDragOver = (event: DragEvent): void => {
    handleTimelineDragOver(event);
  };

  private _handleTimelineDrop(event: DragEvent, fallbackSource: BlockDraftSource = "schedule"): void {
    handleTimelineDrop(asTimelineHost(this), event, fallbackSource);
  }

  private _handleTimelineDragEnd = (): void => {
    handleTimelineDragEnd(asTimelineHost(this));
  };

  private _handleTimelineResizeStart(index: number, edge: "start" | "end", source: BlockDraftSource, event: PointerEvent): void {
    handleTimelineResizeStart(asTimelineHost(this), index, edge, source, event);
  }

  private _handleTimelineResizeMove = (event: PointerEvent): void => {
    handleTimelineResizeMove(asTimelineHost(this), event);
  };

  private _handleTimelineResizeEnd = (): void => {
    handleTimelineResizeEnd(asTimelineHost(this));
  };

  private _resizeTimelineBlock(index: number, edge: "start" | "end", minute: number, source: BlockDraftSource = "schedule"): void {
    resizeTimelineBlock(asTimelineHost(this), index, edge, minute, source);
  }

  private _setDraftBlockStart(index: number, start: string, options: { sort?: boolean } = {}, source: BlockDraftSource = "schedule"): void {
    setDraftBlockStart(asDraftActionsHost(this), index, start, options, source);
  }

  private _sortDraftBlocksByStart(source: BlockDraftSource = "schedule"): void {
    sortDraftBlocks(asTimelineHost(this), source);
  }

  private _toggleCopyTarget(weekday: string, checked: boolean): void {
    toggleCopyTarget(asDraftActionsHost(this), weekday, checked);
  }

  private _toggleZoneTarget(entityId: string, checked: boolean): void {
    toggleZoneTarget(asDraftActionsHost(this), entityId, checked);
  }

  private _dismissNotice(type: "error" | "success"): void {
    dismissNotice(asNoticeHost(this), type);
  }

  private _showSuccess(message: string): void {
    showSuccess(asNoticeHost(this), message);
  }

  private _successNoticeProgress(): number {
    return successNoticeProgress(asNoticeHost(this));
  }

  private _clearSuccessNoticeTimer(clearStartedAt = true): void {
    clearSuccessNoticeTimer(asNoticeHost(this), clearStartedAt);
  }

  private _hasDraftValidationError(source: BlockDraftSource = "schedule"): boolean {
    return hasDraftValidationError(asDraftValidationHost(this), source);
  }

  private _temperatureError(block: DraftScheduleBlock, source: BlockDraftSource = "schedule"): string | undefined {
    return temperatureError(asDraftValidationHost(this), block, source);
  }

  private async _saveSelectedDay(): Promise<void> {
    await saveSelectedDay(asScheduleActionsHost(this));
  }

  private async _copySelectedDay(): Promise<void> {
    await copySelectedDay(asScheduleActionsHost(this));
  }

  private async _applySelectedDayToZones(): Promise<void> {
    await applySelectedDayToZones(asScheduleActionsHost(this));
  }

  private _normalizeDraftBlocks(source: BlockDraftSource = "schedule"): NormalizedBlocks {
    return normalizeDraftBlocks(asScheduleActionsHost(this), source);
  }

  private _clampBlocksForEntity(blocks: ScheduleBlock[], entityId: string): ScheduleBlock[] {
    return clampBlocksForEntity(asScheduleActionsHost(this), blocks, entityId);
  }

  private _unsupportedModeError(blocks: Array<Pick<ScheduleBlock, "action" | "hvac_mode" | "start">>, entityId: string): string | undefined {
    return unsupportedModeError(asScheduleActionsHost(this), blocks, entityId);
  }

  private _pauseExpirationMs(): number | undefined {
    return pauseExpirationMs(asSchedulerControlsHost(this));
  }

  private _pauseProgressPercent(expiresAt: number): number {
    return pauseProgressPercent(asSchedulerControlsHost(this), expiresAt);
  }

  private _syncPauseTick(): void {
    syncPauseTick(asSchedulerControlsHost(this));
  }

  private _nextCountdownExpirationMs(): number | undefined {
    return nextCountdownExpirationMs(asSchedulerControlsHost(this));
  }

  private _stopPauseTick(): void {
    stopPauseTick(asSchedulerControlsHost(this));
  }

  private _timelineBlocks(source: BlockDraftSource = "schedule"): TimelineBlock[] {
    return timelineBlocks(asTimelineHost(this), source);
  }

  private _inputValue(event: Event): string {
    return inputValue(event);
  }

  private _t(
    key: TranslationKey,
    replacements: Record<string, string | number> = {},
  ): string {
    return translateForHost(asCardContextHost(this), key, replacements);
  }

  private _language(): SupportedLanguage {
    return languageForHost(asCardContextHost(this));
  }

  private _weekdayName(weekday: string): string {
    return weekdayNameForHost(asCardContextHost(this), weekday);
  }

  private _shortWeekdayName(weekday: string): string {
    return shortWeekdayNameForHost(asCardContextHost(this), weekday);
  }

  private _modeLabel(mode: string): string {
    return this._dictionaryLabel("hvacModes", mode);
  }

  private _schedulerModeLabel(mode: string): string {
    return this._dictionaryLabel("schedulerModes", mode);
  }

  private _schedulerStatusLabel(status: string): string {
    return this._dictionaryLabel("schedulerStatuses", status);
  }

  private _hvacActionLabel(action: string): string {
    return this._dictionaryLabel("hvacActions", action);
  }

  private _dictionaryLabel(
    group: "hvacActions" | "hvacModes" | "schedulerModes" | "schedulerStatuses",
    key: string,
  ): string {
    return dictionaryLabelForHost(asCardContextHost(this), group, key);
  }

  private _firstWeekday(): string {
    return firstWeekdayForHost(asCardContextHost(this));
  }

  private _orderedWeekdays(): string[] {
    return orderedWeekdaysForHost(asCardContextHost(this));
  }

  private _orderedZoneIds(entityIds: string[]): string[] {
    return orderedZoneIdsForHost(asCardContextHost(this), entityIds);
  }

  private _visibleZoneIds(entityIds: string[]): string[] {
    return visibleZoneIdsForHost(asCardContextHost(this), entityIds);
  }

  private async _updateSettingsFirstWeekday(value: string): Promise<void> {
    await updateSettingsFirstWeekday(asSettingsActionsHost(this), value);
  }

  private async _saveSettings(settings: Partial<PanelSettings>): Promise<void> {
    await saveSettings(asSettingsActionsHost(this), settings);
  }

  private async _saveZonePreconditioning(
    entityId: string,
    preconditioning: Partial<PreconditioningSettings>,
  ): Promise<void> {
    await saveZonePreconditioning(asSettingsActionsHost(this), entityId, preconditioning);
  }

  private async _resolveTemperatureMigration(sourceUnit: "°C" | "°F"): Promise<void> {
    const api = this._api();
    const migration = this._data?.temperature_migration;
    if (!api || this._temperatureMigrationAction || !migration?.required) {
      return;
    }
    const targetUnit = migration.target_unit ?? this._temperatureUnit();
    if (!window.confirm(this._t("temperatureMigrationConfirm", {
      source: sourceUnit,
      target: targetUnit,
    }))) {
      return;
    }
    this._temperatureMigrationAction = sourceUnit;
    this._error = undefined;
    try {
      const migrationId = globalThis.crypto?.randomUUID?.()
        ?? `velair-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      this._applyScheduleData(await api.resolveTemperatureMigration(
        sourceUnit,
        migrationId,
        migration.temperature_revision ?? 0,
      ), { forceDraft: true });
      showSuccess(asNoticeHost(this), this._t("temperatureMigrationComplete"));
    } catch (error) {
      this._error = error instanceof Error ? error.message : this._t("temperatureMigrationFailed");
    } finally {
      this._temperatureMigrationAction = undefined;
    }
  }

  private async _saveZoneComfort(
    entityId: string,
    comfort: Partial<ComfortSettings>,
  ): Promise<void> {
    await saveZoneComfort(asSettingsActionsHost(this), entityId, comfort);
  }

  private _togglePreconditioningZone(entityId: string): void {
    const expandedZones = new Set(this._expandedPreconditioningZones);
    if (expandedZones.has(entityId)) {
      expandedZones.delete(entityId);
    } else {
      expandedZones.add(entityId);
    }
    this._expandedPreconditioningZones = expandedZones;
  }

  private _toggleComfortZone(entityId: string): void {
    const expandedZones = new Set(this._expandedComfortZones);
    if (expandedZones.has(entityId)) {
      expandedZones.delete(entityId);
    } else {
      expandedZones.add(entityId);
    }
    this._expandedComfortZones = expandedZones;
  }

  private async _resetZonePreconditioningLearning(
    entityId: string,
    direction: "heat" | "cool",
    directionLabel: string,
  ): Promise<void> {
    await resetZonePreconditioningLearning(asSettingsActionsHost(this), entityId, direction, directionLabel);
  }

  private async _resetZonePreconditioningSettings(entityId: string): Promise<void> {
    await resetZonePreconditioningSettings(asSettingsActionsHost(this), entityId);
  }

  private _togglePortableSection(target: "export" | "import", section: PortableSection, checked: boolean): void {
    togglePortableSection(asPortabilityHost(this), target, section, checked);
  }

  private async _handlePortableImportFile(event: Event): Promise<void> {
    await handlePortableImportFile(asPortabilityHost(this), event);
  }

  private async _exportPortableData(): Promise<void> {
    await exportPortableData(asPortabilityHost(this));
  }

  private async _importPortableData(): Promise<void> {
    await importPortableData(asPortabilityHost(this));
  }

  private async _resetVelairData(): Promise<void> {
    await resetVelairData(asPortabilityHost(this));
  }

  private _importAvailableSections(): PortableSection[] {
    return importAvailableSections(asPortabilityHost(this));
  }

  private _portableExportSummaryItems(): Array<{ label: string; title: string; value: string | number }> {
    return portableExportItems(asPortabilityHost(this));
  }

  private _portableImportSummaryItems(): Array<{ label: string; title: string; value: string | number }> {
    return portableImportItems(asPortabilityHost(this));
  }

  private _portableSummaryItem(item: PortableSummaryItem): { label: string; title: string; value: string | number } {
    return portableSummaryItem(asPortabilityHost(this), item);
  }

  private _portableSectionLabel(section: PortableSection): string {
    return portableSectionLabel(asPortabilityHost(this), section);
  }

  private _downloadPortablePayload(payload: VelairPortablePayload): void {
    downloadPortablePayload(payload);
  }

  private _moveSettingsZone(entityId: string, direction: -1 | 1): void {
    moveSettingsZone(asSettingsActionsHost(this), entityId, direction);
  }

  private _handleSettingsZoneDragStart(entityId: string, event: DragEvent): void {
    handleSettingsZoneDragStart(asSettingsActionsHost(this), entityId, event);
  }

  private _handleSettingsZoneDragOver(event: DragEvent): void {
    handleSettingsZoneDragOver(event);
  }

  private _handleSettingsZoneDrop(targetEntityId: string, event: DragEvent): void {
    handleSettingsZoneDrop(asSettingsActionsHost(this), targetEntityId, event);
  }

  private _handleSettingsZoneDragEnd = (): void => {
    handleSettingsZoneDragEnd(asSettingsActionsHost(this));
  };

  private _updateSettingsZoneOrder(entityIds: string[]): void {
    updateSettingsZoneOrder(asSettingsActionsHost(this), entityIds);
  }

  private _temperatureLimits(source: BlockDraftSource = "schedule", entityId = this._selectedEntity): [number, number] {
    return temperatureLimits(asClimateDisplayHost(this), source, entityId);
  }

  private _entityTemperatureLimits(entityId?: string): [number, number] {
    return entityTemperatureLimitsForHost(asClimateDisplayHost(this), entityId);
  }

  private _templateTemperatureLimits(): [number, number] {
    return templateTemperatureLimits(asClimateDisplayHost(this));
  }

  private _temperatureStep(source: BlockDraftSource = "schedule", entityId = this._selectedEntity): number | undefined {
    return temperatureStep(asClimateDisplayHost(this), source, entityId);
  }

  private _entityTemperatureStep(entityId?: string): number | undefined {
    return entityTemperatureStepForHost(asClimateDisplayHost(this), entityId);
  }

  private _formatTemperatureLimit(value: number): string {
    return formatTemperatureLimit(value);
  }

  private _entityExists(entityId: string): boolean {
    return entityExists(asClimateDisplayHost(this), entityId);
  }

  private _entityFanModeOptions(entityId: string): string[] {
    return entityFanModeOptionsForHost(asClimateDisplayHost(this), entityId);
  }

  private _entityPresetModeOptions(entityId: string): string[] {
    return entityPresetModeOptionsForHost(asClimateDisplayHost(this), entityId);
  }

  private _entitySwingModeOptions(entityId: string): string[] {
    return entitySwingModeOptionsForHost(asClimateDisplayHost(this), entityId);
  }

  private _entitySwingHorizontalModeOptions(entityId: string): string[] {
    return entitySwingHorizontalModeOptionsForHost(asClimateDisplayHost(this), entityId);
  }

  private _entityHumidityLimits(entityId: string): [number, number] | undefined {
    return entityHumidityLimitsForHost(asClimateDisplayHost(this), entityId);
  }

  private _friendlyEntityName(entityId: string): string {
    return friendlyEntityName(asClimateDisplayHost(this), entityId);
  }

  private _climateSupportedModes(entityId: string): string[] {
    return climateSupportedModesForHost(asClimateDisplayHost(this), entityId);
  }

  private _hvacModeOptions(source: BlockDraftSource = "schedule"): string[] {
    return hvacModeOptions(asClimateDisplayHost(this), source);
  }

  private _fanModeOptions(source: BlockDraftSource = "schedule"): string[] {
    return fanModeOptions(asClimateDisplayHost(this), source);
  }

  private _presetModeOptions(source: BlockDraftSource = "schedule"): string[] {
    return presetModeOptions(asClimateDisplayHost(this), source);
  }

  private _swingModeOptions(source: BlockDraftSource = "schedule"): string[] {
    return swingModeOptions(asClimateDisplayHost(this), source);
  }

  private _swingHorizontalModeOptions(source: BlockDraftSource = "schedule"): string[] {
    return swingHorizontalModeOptions(asClimateDisplayHost(this), source);
  }

  private _humidityLimits(source: BlockDraftSource = "schedule"): [number, number] | undefined {
    return humidityLimits(asClimateDisplayHost(this), source);
  }

  private _uniqueModes(modes: string[]): string[] {
    return uniqueModes(modes);
  }

  private _entityDiagnostic(entityId: string): EntityDiagnostic {
    return entityDiagnostic(asClimateDisplayHost(this), entityId);
  }

  private _climateProvidedData(entityId: string): { icon: string; label: string }[] {
    return climateProvidedData(asClimateDisplayHost(this), entityId);
  }

  private _formatDateTime(value: string): string {
    return formatDateTimeForHost(asClimateDisplayHost(this), value);
  }

  private _formatScheduleTime(value: string): string {
    return formatScheduleTimeForHost(asClimateDisplayHost(this), value);
  }

  private _dateLocale(): string {
    return dateLocaleForHost(asClimateDisplayHost(this));
  }

  private _formatRemaining(valueMs: number): string {
    return formatRemaining(valueMs);
  }

  private _formatTemperature(value: number, entityId?: string): string {
    return formatTemperatureForHost(asClimateDisplayHost(this), value, entityId);
  }

  private _formatEventAction(event: ScheduleEvent): string {
    return formatEventActionForHost(asClimateDisplayHost(this), event);
  }

  private _formatEventMode(event: ScheduleEvent): string {
    return formatEventModeForHost(asClimateDisplayHost(this), event);
  }

  private _temperatureUnit(entityId?: string): string {
    return temperatureUnitForHost(asClimateDisplayHost(this), entityId);
  }

  static styles = cardStyles;
}
