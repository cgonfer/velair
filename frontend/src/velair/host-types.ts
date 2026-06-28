import type { VelairApiClient } from "./api/client";
import type { PortableSummaryItem } from "./domain/portable";
import type { TimelineBlock } from "./domain/timeline";
import type { SupportedLanguage, TranslationKey } from "./translations";
import type {
  BlockDraftSource,
  DraftScheduleBlock,
  EntityDiagnostic,
  HomeAssistant,
  NormalizedBlocks,
  PanelSettings,
  PortableSection,
  PreconditioningSettings,
  ScheduleBlock,
  ScheduleEvent,
  ScheduleResponse,
  ScheduleTemplate,
  VelairCardConfig,
  VelairCardView,
  VelairPortablePayload,
} from "./types";

export type PortableSummaryViewItem = {
  label: string;
  section: PortableSection;
  title: string;
  value: string | number;
};

export type VelairViewHost = {
  readonly hass?: HomeAssistant;
  readonly renderRoot: Element | ShadowRoot;
  readonly classList: DOMTokenList;

  _applyingTemplateTargets: boolean;
  _applyingZones: boolean;
  _changedNextEventIds: Set<string>;
  _config: VelairCardConfig;
  _controlAction?: "pause" | "resume";
  _copying: boolean;
  _copyTargets: Set<string>;
  _data?: ScheduleResponse;
  _dirty: boolean;
  _dirtyEntityId?: string;
  _draftBlocks: DraftScheduleBlock[];
  _error?: string;
  _expandedPreconditioningZones: Set<string>;
  _exportSections: Set<PortableSection>;
  _importFileName: string;
  _importPayload?: VelairPortablePayload;
  _importSections: Set<PortableSection>;
  _loading: boolean;
  _maintenanceAction?: "reset";
  _nextEventsOpen: boolean;
  _nextEventChangeRevision: number;
  _overviewTimelineDetail?: string;
  _overviewTimelineDetailAnchor?: number;
  _overviewTimelineDetailEntityId?: string;
  _pauseDurationMinutes: number;
  _portabilityAction?: "export" | "import";
  _saveMessage?: string;
  _saving: boolean;
  _schedulerMenuOpen: boolean;
  _selectedEntity?: string;
  _selectedTemplateKey: string;
  _selectedWeekday: string;
  _settingsSaving: boolean;
  _templateAction?: "save" | "delete";
  _templateApplyOpen: boolean;
  _templateApplyTargets: Set<string>;
  _templateDirty: boolean;
  _templateDraftBlocks: DraftScheduleBlock[];
  _templateDraftKey: string;
  _templateListCanScrollDown: boolean;
  _templateListCanScrollUp: boolean;
  _zoneTargets: Set<string>;

  requestUpdate(): void;

  _addBlock(source?: BlockDraftSource): void;
  _api(): VelairApiClient | undefined;
  _applySelectedDayToZones(): Promise<void>;
  _applyTemplateToTargets(template: ScheduleTemplate): Promise<void>;
  _canResumeScheduler(): boolean;
  _clearOverviewTimelineDetail(): void;
  _climateProvidedData(entityId: string): { icon: string; label: string }[];
  _climateSupportedModes(entityId: string): string[];
  _closeSchedulerMenu(): void;
  _copySelectedDay(): Promise<void>;
  _createTemplate(): Promise<void>;
  _currentTimelineNow(): Date;
  _deleteSelectedTemplate(): Promise<void>;
  _dismissNotice(type: "error" | "success"): void;
  _effectiveView(): VelairCardView;
  _entityDiagnostic(entityId: string): EntityDiagnostic;
  _entityExists(entityId: string): boolean;
  _entityTemperatureLimits(entityId?: string): [number, number];
  _entityTemperatureStep(entityId?: string): number;
  _exportPortableData(): Promise<void>;
  _firstWeekday(): string;
  _formatDateTime(value: string): string;
  _formatEventAction(event: ScheduleEvent): string;
  _formatEventMode(event: ScheduleEvent): string;
  _formatRemaining(valueMs: number): string;
  _formatTemperature(value: number, entityId?: string): string;
  _formatTemperatureLimit(value: number): string;
  _friendlyEntityName(entityId: string): string;
  _handlePortableImportFile(event: Event): Promise<void>;
  _handleSchedulerMenuToggle(event: MouseEvent): void;
  _handleSettingsZoneDragEnd(): void;
  _handleSettingsZoneDragOver(event: DragEvent): void;
  _handleSettingsZoneDragStart(entityId: string, event: DragEvent): void;
  _handleSettingsZoneDrop(targetEntityId: string, event: DragEvent): void;
  _handleTemplateListScroll(): void;
  _handleTimelineDragEnd(): void;
  _handleTimelineDragOver(event: DragEvent): void;
  _handleTimelineDragStart(index: number, source: BlockDraftSource, event: DragEvent): void;
  _handleTimelineDrop(event: DragEvent, fallbackSource?: BlockDraftSource): void;
  _handleTimelineResizeStart(index: number, edge: "start" | "end", source: BlockDraftSource, event: PointerEvent): void;
  _hasDraftValidationError(source?: BlockDraftSource): boolean;
  _hvacModeOptions(source?: BlockDraftSource): string[];
  _importAvailableSections(): PortableSection[];
  _importPortableData(): Promise<void>;
  _inputValue(event: Event): string;
  _language(): SupportedLanguage;
  _modeLabel(mode: string): string;
  _moveSettingsZone(entityId: string, direction: -1 | 1): void;
  _orderedWeekdays(): string[];
  _orderedZoneIds(entityIds: string[]): string[];
  _visibleZoneIds(entityIds: string[]): string[];
  _pauseExpirationMs(): number | undefined;
  _pauseProgressPercent(expiresAt: number): number;
  _pauseScheduler(indefinite: boolean, options?: { showSuccess?: boolean }): Promise<void>;
  _portableExportSummaryItems(): PortableSummaryViewItem[];
  _portableImportSummaryItems(): PortableSummaryViewItem[];
  _portableSectionLabel(section: PortableSection): string;
  _portableSummaryItem(item: PortableSummaryItem): PortableSummaryViewItem;
  _removeBlock(index: number, source?: BlockDraftSource): void;
  _resetVelairData(): Promise<void>;
  _resetZonePreconditioningLearning(entityId: string, direction: "heat" | "cool", directionLabel: string): Promise<void>;
  _resetZonePreconditioningSettings(entityId: string): Promise<void>;
  _resumeScheduler(options?: { showSuccess?: boolean }): Promise<void>;
  _saveSelectedDay(): Promise<void>;
  _saveSelectedTemplateFromLibrary(template: ScheduleTemplate): Promise<void>;
  _saveSettings(settings: Partial<PanelSettings>): Promise<void>;
  _saveZonePreconditioning(entityId: string, preconditioning: Partial<PreconditioningSettings>): Promise<void>;
  _saveTemplate(saveAsNew: boolean): Promise<void>;
  _scheduleTemplates(): ScheduleTemplate[];
  _schedulerModeLabel(mode: string): string;
  _schedulerStatusLabel(status: string): string;
  _selectEntity(entityId: string): void;
  _selectScheduleTemplate(key: string): void;
  _selectTemplate(key: string): void;
  _selectWeekday(weekday: string): void;
  _shortWeekdayName(weekday: string): string;
  _showOverviewTimelineDetail(entityId: string, detail: string, anchorPercent: number, event: Event): void;
  _successNoticeProgress(): number;
  _t(key: TranslationKey, replacements?: Record<string, string | number>): string;
  _temperatureError(block: DraftScheduleBlock, source?: BlockDraftSource): string | undefined;
  _temperatureLimits(source?: BlockDraftSource, entityId?: string): [number, number];
  _temperatureStep(source?: BlockDraftSource, entityId?: string): number;
  _temperatureUnit(entityId?: string): string;
  _templateApplyTargetKey(entityId: string, weekday: string): string;
  _templateLabel(template: ScheduleTemplate): string;
  _templateListClass(templateCount: number): string;
  _templateNameInputValue(template: ScheduleTemplate): string;
  _timelineBlocks(source?: BlockDraftSource): TimelineBlock[];
  _toggleCopyTarget(weekday: string, checked: boolean): void;
  _togglePreconditioningZone(entityId: string): void;
  _togglePortableSection(target: "export" | "import", section: PortableSection, checked: boolean): void;
  _toggleTemplateApplyPanel(): void;
  _toggleTemplateApplyTarget(entityId: string, weekday: string, checked: boolean): void;
  _toggleNextEvents(): void;
  _toggleZoneTarget(entityId: string, checked: boolean): void;
  _updateDraftBlock(index: number, field: keyof DraftScheduleBlock, value: string, source?: BlockDraftSource): void;
  _updateSettingsFirstWeekday(value: string): Promise<void>;
  _updateTemplateNameDraft(key: string, value: string): void;
  _weekdayName(weekday: string): string;
  _unsupportedModeError(blocks: Array<Pick<ScheduleBlock, "action" | "hvac_mode" | "start">>, entityId: string): string | undefined;
  _normalizeDraftBlocks(source?: BlockDraftSource): NormalizedBlocks;
};

export function asVelairViewHost(host: unknown): VelairViewHost {
  return host as VelairViewHost;
}
