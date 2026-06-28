import { modeClassName } from "../domain/climate";
import { isActiveBoostOverride, isActivePauseOverride } from "../domain/overrides";
import { dateMs, nextEventForZone, weekdayForDate } from "../domain/schedule-events";
import type { HomeAssistant, ScheduleEvent, ScheduleResponse, ScheduleZone } from "../types";

type OverviewDataHost = {
  readonly hass?: HomeAssistant;
  _data?: ScheduleResponse;
  _formatDateTime(value: string): string;
  _formatRemaining(valueMs: number): string;
  _formatTemperature(value: number, entityId?: string): string;
  _hvacActionLabel(action: string): string;
  _modeLabel(mode: string): string;
  _orderedZoneIds(entityIds: string[]): string[];
  _t(key: string): string;
};

export function asOverviewDataHost(host: unknown): OverviewDataHost {
  return host as OverviewDataHost;
}

export function activeOverrideForEntity(
  host: OverviewDataHost,
  entityId: string,
  zone?: ScheduleZone,
): Record<string, unknown> | undefined {
  const override = zone?.override ?? host._data?.active_overrides?.[entityId];
  return isActiveBoostOverride(override) ? override : undefined;
}

export function activeOverrideEntityIds(host: OverviewDataHost): string[] {
  if (!host._data) {
    return [];
  }

  return host._orderedZoneIds(host._data.configured_entities).filter((entityId: string) => {
    const zone = host._data?.zones[entityId];
    return Boolean(activeOverrideForEntity(host, entityId, zone));
  });
}

export function activePauseOverrideForEntity(
  _host: OverviewDataHost,
  _entityId: string,
  zone?: ScheduleZone,
): Record<string, unknown> | undefined {
  return isActivePauseOverride(zone?.override) ? zone?.override ?? undefined : undefined;
}

export function boostDetailText(
  host: OverviewDataHost,
  entityId: string,
  override: Record<string, unknown>,
): string {
  const temperature = Number(override.temperature);
  const untilMs = dateMs(override.until);
  const hvacMode = typeof override.hvac_mode === "string" ? override.hvac_mode : "";
  const parts: string[] = [];

  if (Number.isFinite(temperature)) {
    parts.push(host._formatTemperature(temperature, entityId));
  }
  if (hvacMode) {
    parts.push(host._modeLabel(hvacMode));
  }
  if (untilMs) {
    parts.push(`${host._t("boostUntil")}: ${host._formatRemaining(Math.max(0, untilMs - Date.now()))}`);
  }

  return parts.join(" - ") || host._t("boostActive");
}

export function pauseDetailText(host: OverviewDataHost, override: Record<string, unknown>): string {
  const startedMs = dateMs(override.started_at);
  const untilMs = dateMs(override.until);
  const parts: string[] = [];

  if (startedMs) {
    parts.push(`${host._t("pauseFrom")}: ${host._formatDateTime(new Date(startedMs).toISOString())}`);
  }

  if (untilMs) {
    parts.push(`${host._t("pauseTo")}: ${host._formatDateTime(new Date(untilMs).toISOString())}`);
    parts.push(`${host._t("pauseRemaining")}: ${host._formatRemaining(Math.max(0, untilMs - Date.now()))}`);
    return parts.join(" - ");
  }

  parts.push(host._t("pauseIndefinite"));
  return parts.join(" - ");
}

export function overviewNextEvents(host: OverviewDataHost): ScheduleEvent[] {
  if (!host._data) {
    return [];
  }

  if (host._data.next_events.length) {
    return host._data.next_events;
  }

  const calculatedEvents = host._orderedZoneIds(host._data.configured_entities)
    .map((entityId: string) => nextEventForEntity(host, entityId, host._data?.zones[entityId]))
    .filter((event: ScheduleEvent | undefined): event is ScheduleEvent => Boolean(event))
    .sort((first: ScheduleEvent, second: ScheduleEvent) =>
      new Date(first.when).getTime() - new Date(second.when).getTime());

  return calculatedEvents.length ? calculatedEvents : host._data.next_events;
}

export function nextEventForEntity(
  host: OverviewDataHost,
  entityId: string,
  zone?: ScheduleZone,
): ScheduleEvent | undefined {
  return nextEventForZone(entityId, zone, activeOverrideForEntity(host, entityId, zone));
}

export function todayWeekday(): string {
  return weekdayForDate(new Date());
}

export function currentTemperature(host: OverviewDataHost, entityId: string): string | undefined {
  const attributes = host.hass?.states?.[entityId]?.attributes;
  const currentTemperatureValue = attributes?.current_temperature ?? attributes?.temperature;
  if (typeof currentTemperatureValue !== "number") {
    return undefined;
  }

  return host._formatTemperature(currentTemperatureValue, entityId);
}

export function climateMode(host: OverviewDataHost, entityId: string): string | undefined {
  const state = host.hass?.states?.[entityId];
  const mode = state?.state;
  if (!mode || mode === "unknown" || mode === "unavailable") {
    return undefined;
  }

  const action = state.attributes?.hvac_action;
  if (action && action !== mode && action !== "idle") {
    return `${host._modeLabel(mode)} - ${host._hvacActionLabel(action)}`;
  }

  return host._modeLabel(mode);
}

export function climateModeClass(host: OverviewDataHost, entityId: string): string {
  const mode = host.hass?.states?.[entityId]?.state;
  return mode ? `mode-${modeClassName(mode)}` : "";
}
