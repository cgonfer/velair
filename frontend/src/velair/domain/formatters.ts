import { ACTION_TURN_OFF } from "../constants";
import type { ScheduleEvent } from "../types";
import type { SupportedLanguage } from "../translations";

export function dateLocale(language: SupportedLanguage): string {
  return language === "es" ? "es-ES" : "en";
}

export function formatDateTime(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(locale, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRemaining(valueMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(valueMs / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds} s`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

export function formatTemperature(value: number, unit: string): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)} ${unit}`;
}

export function temperatureUnit(entityUnit?: string, systemUnit?: string): string {
  return entityUnit ?? systemUnit ?? "\u00b0C";
}

export function formatEventAction(
  event: ScheduleEvent,
  labels: { off: string; setTemperature: string },
  formatEventTemperature: (value: number, entityId?: string) => string,
): string {
  if (event.action === ACTION_TURN_OFF) {
    return labels.off;
  }
  if (event.temperature == null) {
    return labels.setTemperature;
  }

  return formatEventTemperature(Number(event.temperature), event.entity_id);
}

export function formatEventMode(
  event: ScheduleEvent,
  labels: { keepMode: string },
  modeLabel: (mode: string) => string,
): string {
  if (event.hvac_mode) {
    return modeLabel(event.hvac_mode);
  }
  if (event.action === ACTION_TURN_OFF) {
    return modeLabel("off");
  }
  return labels.keepMode;
}
