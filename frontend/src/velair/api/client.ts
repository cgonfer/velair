import { DOMAIN } from "../constants";
import type {
  HomeAssistant,
  PanelSettings,
  PortableSection,
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
}
