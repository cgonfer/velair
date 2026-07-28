import { DOMAIN } from "../constants";
import type {
  HomeAssistant,
  ComfortSettings,
  ClimateProfileInput,
  PanelSettings,
  VelairModeInput,
  PortableSection,
  PreconditioningSettings,
  ScheduleBlock,
  ScheduleResponse,
  ScheduleUpdateMessage,
  VelairPortablePayload,
} from "../types";

export class VelairApiClient {
  public constructor(private readonly hass: HomeAssistant) {}

  public getSchedule(): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/get_schedule",
    });
  }

  public subscribeUpdates(
    callback: (message: ScheduleUpdateMessage) => void,
  ): Promise<() => Promise<void> | void> {
    return this.hass.connection.subscribeMessage<ScheduleUpdateMessage>(callback, {
      type: "velair/subscribe_updates",
    });
  }

  public setDailySchedule(entityId: string, weekday: string, blocks: ScheduleBlock[]): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/set_daily_schedule",
      entity_id: entityId,
      weekday,
      blocks,
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
  ): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/copy_day_schedule",
      entity_id: entityId,
      source_weekday: sourceWeekday,
      target_weekdays: targetWeekdays,
    });
  }

  public setScheduleTemplate(
    key: string,
    name: string,
    blocks: ScheduleBlock[],
  ): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/set_schedule_template",
      key,
      name,
      blocks,
    });
  }

  public deleteScheduleTemplate(key: string): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/delete_schedule_template",
      key,
    });
  }

  public setClimateProfile(profile: ClimateProfileInput): Promise<ScheduleResponse> {
    return this.hass.connection.sendMessagePromise<ScheduleResponse>({
      type: "velair/set_profile",
      profile,
    });
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
    comfort: Partial<ComfortSettings>,
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
