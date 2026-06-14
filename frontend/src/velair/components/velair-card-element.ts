import { LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import { PORTABLE_SECTIONS } from "../constants";
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
  shortWeekdayNameForHost,
  shouldUpdateForHass,
  translateForHost,
  weekdayNameForHost,
} from "../controllers/card-context";
import type {
  BlockDraftSource,
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
  VelairCardConfig,
  VelairCardView,
  VelairPortablePayload,
} from "../types";
import type { SupportedLanguage, TranslationKey } from "../translations";
import { cardStyles } from "../styles/card-styles";
import { VelairApiClient } from "../api/client";
import type { PortableSummaryItem } from "../domain/portable";
import { scheduleTemplatesFromStored, templateLabel } from "../domain/templates";
import type { TimelineBlock } from "../domain/timeline";
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
  entityTemperatureLimitsForHost,
  entityTemperatureStepForHost,
  formatDateTimeForHost,
  formatEventActionForHost,
  formatEventModeForHost,
  formatRemaining,
  formatTemperatureForHost,
  formatTemperatureLimit,
  friendlyEntityName,
  hvacModeOptions,
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

export class VelairCard extends LitElement {
  private _hass?: HomeAssistant;

  public get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  public set hass(value: HomeAssistant | undefined) {
    const oldValue = this._hass;
    this._hass = value;
    if (this._shouldUpdateForHass(value, oldValue)) {
      this.requestUpdate("hass", oldValue);
    }
  }

  private _api(): VelairApiClient | undefined {
    return this.hass ? new VelairApiClient(this.hass) : undefined;
  }

  @property({ type: String }) public view: VelairCardView = "overview-status";

  @state() private _config: VelairCardConfig = {};
  @state() private _data?: ScheduleResponse;
  @state() private _error?: string;
  @state() private _loading = false;
  @state() private _saving = false;
  @state() private _saveMessage?: string;
  @state() private _selectedEntity?: string;
  @state() private _selectedWeekday = "monday";
  @state() private _draftBlocks: DraftScheduleBlock[] = [];
  @state() private _dirty = false;
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
  @state() private _maintenanceAction?: "reset";
  @state() private _portabilityAction?: "export" | "import";
  @state() private _exportSections = new Set<PortableSection>(PORTABLE_SECTIONS);
  @state() private _importSections = new Set<PortableSection>();
  @state() private _importPayload?: VelairPortablePayload;
  @state() private _importFileName = "";
  @state() private _pauseDurationMinutes = 60;
  @state() private _controlAction?: "pause" | "resume";
  @state() private _schedulerMenuOpen = false;
  @state() private _nextEventsOpen = false;
  @state() private _overviewTimelineDetail?: string;
  @state() private _overviewTimelineDetailAnchor?: number;
  @state() private _overviewTimelineDetailEntityId?: string;
  @state() private _successNoticeStartedAt?: number;
  @state() private _timelineNow = new Date();
  private _unsubscribeUpdates?: () => Promise<void> | void;
  private _subscribing = false;
  private _successNoticeTick?: number;
  private _successNoticeTimeout?: number;
  private _pauseTick?: number;
  private _pauseTickDelay?: number;
  private _timelineNowTick?: number;
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

  public setConfig(config: VelairCardConfig): void {
    this._hasExternalConfig = true;
    this._config = config ?? {};
    this._selectedEntity = config?.selected_entity;
    this._selectedWeekday = this._firstWeekday();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    void this._loadSchedule();
    void this._subscribeUpdates();
    this._syncTimelineNowTick();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._unsubscribeUpdates) {
      void this._unsubscribeUpdates();
      this._unsubscribeUpdates = undefined;
    }
    this._clearSuccessNoticeTimer();
    this._clearOverviewTimelineDetail();
    this._stopPauseTick();
    this._stopTimelineNowTick();
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
  }

  protected render() {
    return renderCardContent(asVelairViewHost(this));
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
    return scheduleTemplatesFromStored(this._data?.templates);
  }

  private _templateLabel(template: ScheduleTemplate): string {
    return templateLabel(template);
  }

  private async _loadSchedule(): Promise<void> {
    await loadSchedule(asScheduleStateHost(this));
  }

  private async _subscribeUpdates(): Promise<void> {
    await subscribeUpdates(asScheduleStateHost(this));
  }

  private _applyScheduleData(data: ScheduleResponse, options: { forceDraft?: boolean } = {}): void {
    applyScheduleData(asScheduleStateHost(this), data, options);
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

  private async _updateSettingsFirstWeekday(value: string): Promise<void> {
    await updateSettingsFirstWeekday(asSettingsActionsHost(this), value);
  }

  private async _saveSettings(settings: Partial<PanelSettings>): Promise<void> {
    await saveSettings(asSettingsActionsHost(this), settings);
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

  private _temperatureStep(source: BlockDraftSource = "schedule", entityId = this._selectedEntity): number {
    return temperatureStep(asClimateDisplayHost(this), source, entityId);
  }

  private _entityTemperatureStep(entityId?: string): number {
    return entityTemperatureStepForHost(asClimateDisplayHost(this), entityId);
  }

  private _formatTemperatureLimit(value: number): string {
    return formatTemperatureLimit(value);
  }

  private _entityExists(entityId: string): boolean {
    return entityExists(asClimateDisplayHost(this), entityId);
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
