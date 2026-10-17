import { DOMAIN } from "../constants";
import type {
  HomeAssistant,
  PlannedReturnConfig, PlannedReturnStatus,
  ComfortSettings,
  ComfortSettingsUpdate,
  DiagnosticsSnapshot,
  DiagnosticHistoryCategory,
  ClimateProfileInput,
  PanelSettings,
  VelairModeInput,
  PortableSection,
  PreconditioningSettings,
  ScheduleBlock,
  ScheduleResponse,
  ScheduleUpdateMessage,
  ExternalChangePolicy,
  VelairPortablePayload,
  BlockPreset, TemplateLink, TemplateAssignment, TemplateUpdatePreview,
} from "../types";

export class VelairApiClient {
  public constructor(private readonly hass: HomeAssistant) {}

  public updatePlannedReturn(planned_return: PlannedReturnConfig): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise({ type: "velair/update_planned_return", planned_return });
  }
  public getPlannedReturnStatus(): Promise<PlannedReturnStatus> {
    return this.hass.connection.sendMessagePromise({ type: "velair/get_planned_return_status" });
  }
  public adjustPlannedReturn(return_at: string): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise({ type: "velair/adjust_planned_return", return_at });
  }
  public startPlannedReturn(return_at: string): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise({ type: "velair/start_planned_return", return_at });
  }
  public cancelPlannedReturn(): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise({ type: "velair/cancel_planned_return" });
  }
  public skipPlannedReturn(): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise({ type: "velair/skip_planned_return" });
  }
  public arrivePlannedReturn(): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise({ type: "velair/arrive_planned_return" });
  }

  public previewTemplateApplication(request: import("../types").TemplateApplicationRequest): Promise<import("../types").TemplateApplicationPreview> {
    return this.hass.connection.sendMessagePromise({ type: "velair/preview_template_application", ...request });
  }

  public applyTemplateApplication(request: import("../types").TemplateApplicationRequest): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise({ type: "velair/apply_template_application", ...request });
  }

  public getSchedule(): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/get_schedule",
    });
  }

  public getDiagnostics(): Promise<DiagnosticsSnapshot> {
    return this.hass.connection.sendMessagePromise<DiagnosticsSnapshot>({ type: "velair/get_diagnostics" });
  }

  public exportDiagnostics(redactEntityIds = true): Promise<Record<string, unknown>> {
    return this.hass.connection.sendMessagePromise<Record<string, unknown>>({
      type: "velair/export_diagnostics",
      redact_entity_ids: redactEntityIds,
    });
  }

  public updateDiagnosticsHistory(
    enabledCategories: DiagnosticHistoryCategory[],
  ): Promise<DiagnosticsSnapshot> {
    return this.hass.connection.sendMessagePromise<DiagnosticsSnapshot>({
      type: "velair/update_diagnostics_history",
      enabled_categories: enabledCategories,
    });
  }

  public clearDiagnosticsHistory(): Promise<DiagnosticsSnapshot> {
    return this.hass.connection.sendMessagePromise<DiagnosticsSnapshot>({
      type: "velair/clear_diagnostics_history",
    });
  }

  public subscribeDiagnostics(
    callback: (message: { loaded: boolean; diagnostics?: DiagnosticsSnapshot }) => void,
  ): Promise<() => Promise<void> | void> {
    return this.hass.connection.subscribeMessage(callback, { type: "velair/subscribe_diagnostics" });
  }

  public subscribeUpdates(
    callback: (message: ScheduleUpdateMessage) => void,
  ): Promise<() => Promise<void> | void> {
    return this.hass.connection.subscribeMessage<ScheduleUpdateMessage>(callback, {
      type: "velair/subscribe_updates",
    });
  }

  public setScheduleDays(entityId: string, options: { weekdays?: string[]; blocks?: ScheduleBlock[]; template_link?: TemplateLink; unlink_template?: boolean; day_layout_key?: string; expected_revision: number }): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise({ type: "velair/set_schedule_days", entity_id: entityId, ...options });
  }

  public setDailySchedule(entityId: string, weekday: string, blocks: ScheduleBlock[], options: { expected_revision?: number; unlink_template?: boolean; template_link?: TemplateLink } = {}): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/set_daily_schedule",
      entity_id: entityId,
      weekday,
      ...(options.template_link ? { template_link: options.template_link } : { blocks }),
      ...options,
    });
  }

  public clearSchedule(entityId: string, weekday: string): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/clear_schedule",
      entity_id: entityId,
      weekday,
    });
  }

  public copyDaySchedule(
    entityId: string,
    sourceWeekday: string,
    targetWeekdays: string[],
    options?: { target_entity_ids?: string[]; expected_revision?: number },
  ): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/copy_day_schedule",
      entity_id: entityId,
      source_weekday: sourceWeekday,
      target_weekdays: targetWeekdays,
      ...options,
    });
  }

  public setScheduleTemplate(
    key: string,
    name: string,
    blocks: ScheduleBlock[],
    options: { expected_revision?: number; assignments?: TemplateAssignment[] } = {},
  ): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/set_schedule_template",
      key,
      name,
      blocks,
      ...options,
    });
  }

  public deleteScheduleTemplate(key: string): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/delete_schedule_template",
      key,
    });
  }

  public setClimateProfile(profile: ClimateProfileInput, expectedRevision?: number): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/set_profile",
      profile,
      ...(expectedRevision === undefined ? {} : { expected_revision: expectedRevision }),
    });
  }

  public setBlockPreset(preset: BlockPreset, expectedRevision?: number): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise({ type: "velair/set_block_preset", ...preset, expected_revision: expectedRevision });
  }
  public deleteBlockPreset(key: string, expectedRevision?: number): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise({ type: "velair/delete_block_preset", key, expected_revision: expectedRevision });
  }
  public previewScheduleTemplateUpdate(key: string, name: string, blocks: ScheduleBlock[], expectedRevision?: number, assignments?: TemplateAssignment[]): Promise<TemplateUpdatePreview> {
    return this.hass.connection.sendMessagePromise({ type: "velair/preview_schedule_template_update", key, name, blocks, ...(expectedRevision === undefined ? {} : { expected_revision: expectedRevision }), ...(assignments === undefined ? {} : { assignments }) });
  }
  public previewDailySchedule(entityId: string, weekday: string, input: { blocks?: ScheduleBlock[]; template_link?: TemplateLink }): Promise<{ blocks: ScheduleBlock[]; materialized_blocks?: ScheduleBlock[]; configuration_revision?: number }> {
    return this.hass.connection.sendMessagePromise({ type: "velair/preview_daily_schedule", entity_id: entityId, weekday, ...input });
  }
  public previewProfile(profile: ClimateProfileInput): Promise<{ profile: ClimateProfileInput; resolved_schedules: Record<string, Record<string, ScheduleBlock[]>>; materialized_schedules?: Record<string, Record<string, ScheduleBlock[]>>; configuration_revision: number }> {
    return this.hass.connection.sendMessagePromise({ type: "velair/preview_profile", profile });
  }

  public deleteClimateProfile(key: string): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/delete_profile",
      key,
    });
  }

  public activateProfile(key?: string | null): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/activate_profile",
      profile_id: key ?? null,
    });
  }

  public activateProfiles(profileIds: string[]): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise({ type: "velair/activate_profiles", profile_ids: profileIds });
  }

  public applyProfiles(profileIds: string[]): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise({ type: "velair/apply_profiles", profile_ids: profileIds });
  }

  public setZoneProfile(entityId: string, profileId: string | null): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise({ type: "velair/set_zone_profile", entity_id: entityId, profile_id: profileId });
  }

  public clearProfileOverrides(entityIds: string[]): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise({ type: "velair/clear_profile_overrides", entity_id: entityIds });
  }

  public setVelairMode(mode: VelairModeInput): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/set_mode",
      mode,
    });
  }

  public deleteVelairMode(key: string): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/delete_mode",
      key,
    });
  }

  public selectVelairMode(
    selection: { kind: "default" | "manual" } | { kind: "custom"; key: string },
  ): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/select_mode",
      selection,
    });
  }

  public pauseScheduler(durationMinutes?: number): Promise<void> {
    const serviceData = durationMinutes === undefined ? undefined : { duration_minutes: durationMinutes };
    return this.hass.callService(DOMAIN, "pause", serviceData);
  }

  public resumeScheduler(): Promise<void> {
    return this.hass.callService(DOMAIN, "resume");
  }

  public updateSettings(settings: Partial<PanelSettings>): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/update_settings",
      ...settings,
    });
  }

  public updateExternalChangePolicy(
    entityId: string,
    policy: ExternalChangePolicy,
  ): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/update_external_change_policy",
      entity_id: entityId,
      policy: policy.action,
      duration_minutes: policy.duration_minutes,
    });
  }

  public updateZoneTargetTempStep(
    entityId: string,
    targetTempStep: number,
  ): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/update_zone_target_temp_step",
      entity_id: entityId,
      target_temp_step: targetTempStep,
    });
  }

  public setZoneExecution(entityId: string, provider?: string): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/set_zone_execution",
      entity_id: entityId,
      provider: provider ?? null,
    });
  }

  public resumeAutomaticControl(entityId: string): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/resume_automatic_control",
      entity_id: entityId,
    });
  }

  public enterManualAdjustment(
    entityId: string,
  ): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/enter_manual_adjustment",
      entity_id: entityId,
    });
  }

  public updateZonePreconditioning(
    entityId: string,
    preconditioning: Partial<PreconditioningSettings>,
  ): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/update_zone_preconditioning",
      entity_id: entityId,
      preconditioning,
    });
  }

  public updateZoneComfort(
    entityId: string,
    comfort: ComfortSettingsUpdate,
  ): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/update_zone_comfort",
      entity_id: entityId,
      comfort,
    });
  }

  public resetZonePreconditioningLearning(entityId: string, direction: "heat" | "cool"): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/reset_zone_preconditioning_learning",
      entity_id: entityId,
      direction,
    });
  }

  public resetZonePreconditioningSettings(entityId: string): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/reset_zone_preconditioning_settings",
      entity_id: entityId,
    });
  }

  public exportData(sections: PortableSection[]): Promise<VelairPortablePayload> {
    return this.hass.connection.sendMessagePromise<VelairPortablePayload>({
      type: "velair/export_data",
      sections,
    });
  }

  public importData(payload: VelairPortablePayload, sections: PortableSection[]): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/import_data",
      payload,
      sections,
    });
  }

  public resetData(): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/reset_data",
      confirmation: "reset",
    });
  }

  public resolveTemperatureMigration(
    sourceUnit: "°C" | "°F",
    migrationId: string,
    expectedRevision: number,
  ): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/resolve_temperature_migration",
      source_unit: sourceUnit,
      migration_id: migrationId,
      expected_revision: expectedRevision,
    });
  }
}
