import {
  climateCapabilities,
  climateSupportedModes,
  entityTemperatureLimits,
  entityTemperatureStep,
  uniqueKnownHvacModes,
} from "../domain/climate";
import { entityDiagnosticState } from "../domain/entity-diagnostics";
import {
  dateLocale,
  formatDateTime,
  formatEventAction,
  formatEventMode,
  formatRemaining,
  formatTemperature,
  temperatureUnit,
} from "../domain/formatters";
import {
  combinedTemperatureLimits,
  formatTemperatureLimit,
  lowestTemperatureStep,
} from "../domain/settings";
import type { SupportedLanguage } from "../translations";
import type { BlockDraftSource, EntityDiagnostic, HomeAssistant, ScheduleEvent, ScheduleResponse } from "../types";

type ClimateDisplayHost = {
  readonly hass?: HomeAssistant;
  _data?: ScheduleResponse;
  _selectedEntity?: string;
  _climateSupportedModes(entityId: string): string[];
  _dateLocale(): string;
  _entityTemperatureLimits(entityId?: string): [number, number];
  _entityTemperatureStep(entityId?: string): number;
  _formatTemperature(value: number, entityId?: string): string;
  _language(): SupportedLanguage;
  _modeLabel(mode: string): string;
  _t(key: string): string;
  _temperatureUnit(entityId?: string): string;
  _templateTemperatureLimits(): [number, number];
  _uniqueModes(modes: string[]): string[];
};

export function asClimateDisplayHost(host: unknown): ClimateDisplayHost {
  return host as ClimateDisplayHost;
}

export function temperatureLimits(
  host: ClimateDisplayHost,
  source: BlockDraftSource = "schedule",
  entityId = host._selectedEntity,
): [number, number] {
  return source === "template" ? host._templateTemperatureLimits() : host._entityTemperatureLimits(entityId);
}

export function entityTemperatureLimitsForHost(
  host: ClimateDisplayHost,
  entityId?: string,
): [number, number] {
  return entityTemperatureLimits(entityId ? host.hass?.states?.[entityId] : undefined);
}

export function templateTemperatureLimits(host: ClimateDisplayHost): [number, number] {
  return combinedTemperatureLimits(
    (host._data?.configured_entities ?? []).map((entityId: string) => host._entityTemperatureLimits(entityId)),
  );
}

export function temperatureStep(
  host: ClimateDisplayHost,
  source: BlockDraftSource = "schedule",
  entityId = host._selectedEntity,
): number {
  if (source === "template") {
    return lowestTemperatureStep(
      (host._data?.configured_entities ?? []).map((climateEntityId: string) =>
        host._entityTemperatureStep(climateEntityId)),
    );
  }

  return host._entityTemperatureStep(entityId);
}

export function entityTemperatureStepForHost(host: ClimateDisplayHost, entityId?: string): number {
  return entityTemperatureStep(entityId ? host.hass?.states?.[entityId] : undefined);
}

export function entityExists(host: ClimateDisplayHost, entityId: string): boolean {
  return Boolean(host.hass?.states?.[entityId]);
}

export function friendlyEntityName(host: ClimateDisplayHost, entityId: string): string {
  return host.hass?.states?.[entityId]?.attributes?.friendly_name ?? entityId;
}

export function climateSupportedModesForHost(host: ClimateDisplayHost, entityId: string): string[] {
  return climateSupportedModes(host.hass?.states?.[entityId]);
}

export function hvacModeOptions(host: ClimateDisplayHost, source: BlockDraftSource = "schedule"): string[] {
  if (source === "template") {
    return host._uniqueModes((host._data?.configured_entities ?? [])
      .flatMap((entityId: string) => host._climateSupportedModes(entityId)));
  }

  return host._uniqueModes(host._selectedEntity ? host._climateSupportedModes(host._selectedEntity) : []);
}

export function uniqueModes(modes: string[]): string[] {
  return uniqueKnownHvacModes(modes);
}

export function entityDiagnostic(host: ClimateDisplayHost, entityId: string): EntityDiagnostic {
  const diagnostic = entityDiagnosticState(
    entityId,
    host.hass?.states?.[entityId],
    host._climateSupportedModes(entityId),
  );
  const messages = diagnostic.messageKeys.map((key: string) => host._t(key));

  return {
    messages,
    status: diagnostic.status,
    tooltip: messages.length ? messages.join(" · ") : host._t("entityDiagnosticOk"),
  };
}

export function climateProvidedData(host: ClimateDisplayHost, entityId: string): { icon: string; label: string }[] {
  return climateCapabilities(host.hass?.states?.[entityId]).map((item) => ({
    icon: item.icon,
    label: host._t(item.labelKey),
  }));
}

export function formatDateTimeForHost(host: ClimateDisplayHost, value: string): string {
  return formatDateTime(value, host._dateLocale());
}

export function dateLocaleForHost(host: ClimateDisplayHost): string {
  return dateLocale(host._language());
}

export function formatTemperatureForHost(
  host: ClimateDisplayHost,
  value: number,
  entityId?: string,
): string {
  return formatTemperature(value, host._temperatureUnit(entityId));
}

export function formatEventActionForHost(host: ClimateDisplayHost, event: ScheduleEvent): string {
  return formatEventAction(
    event,
    {
      off: host._t("off"),
      setTemperature: host._t("setTemperature"),
    },
    (value, entityId) => host._formatTemperature(value, entityId),
  );
}

export function formatEventModeForHost(host: ClimateDisplayHost, event: ScheduleEvent): string {
  return formatEventMode(
    event,
    { keepMode: host._t("keepMode") },
    (mode) => host._modeLabel(mode),
  );
}

export function temperatureUnitForHost(host: ClimateDisplayHost, entityId?: string): string {
  return temperatureUnit(
    entityId ? host.hass?.states?.[entityId]?.attributes?.unit_of_measurement : undefined,
    host.hass?.config?.unit_system?.temperature,
  );
}

export { formatRemaining, formatTemperatureLimit };
