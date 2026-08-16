import { LOVELACE_CARD_VIEWS, PANEL_VIEWS } from "../constants";
import {
  dictionaryLabel,
  languageFromHass,
  shortWeekdayName,
  translate,
  weekdayName,
} from "../i18n";
import { climateStateSignature } from "../domain/climate";
import {
  firstWeekdayFromConfig,
  orderedWeekdays,
  orderedZoneIds,
  visibleZoneIds,
} from "../domain/settings";
import type {
  HomeAssistant,
  ScheduleResponse,
  VelairCardConfig,
  VelairCardView,
  VelairPanelView,
} from "../types";
import type { SupportedLanguage, TranslationKey } from "../translations";

type CardContextHost = {
  readonly hass?: HomeAssistant;
  _config: VelairCardConfig;
  _data?: ScheduleResponse;
};

export function asCardContextHost(host: unknown): CardContextHost {
  return host as CardContextHost;
}

export function inputValue(event: Event): string {
  return (event.currentTarget as HTMLInputElement | HTMLSelectElement).value;
}

export function isCardView(value?: string | null): value is VelairCardView {
  return value === "profiles"
    || PANEL_VIEWS.includes(value as VelairPanelView)
    || LOVELACE_CARD_VIEWS.includes(value as VelairCardView);
}

export function effectiveView(
  attributeView: string | null,
  propertyView: VelairCardView,
  configView?: string | null,
): VelairCardView {
  if (isCardView(attributeView)) {
    return attributeView === "profiles" ? "modes" : attributeView;
  }
  if (isCardView(configView)) {
    return configView === "profiles" ? "modes" : configView;
  }
  if (isCardView(propertyView)) {
    return propertyView === "profiles" ? "modes" : propertyView;
  }
  return "overview-status";
}

export function shouldUpdateForHass(
  host: CardContextHost,
  value?: HomeAssistant,
  oldValue?: HomeAssistant,
): boolean {
  if (!value) {
    return false;
  }
  if (!oldValue) {
    return true;
  }
  const entityIds = visibleZoneIds(host._data?.configured_entities ?? [], host._config);
  if (!entityIds.length) {
    return false;
  }
  return entityIds.some(
    (entityId) =>
      climateStateSignature(value.states?.[entityId]) !== climateStateSignature(oldValue.states?.[entityId]),
  );
}

export function preconditioningInputsChanged(
  host: CardContextHost,
  value?: HomeAssistant,
  oldValue?: HomeAssistant,
): boolean {
  if (!value || !oldValue || !host._data) {
    return false;
  }

  const visibleEntities = new Set(visibleZoneIds(host._data.configured_entities, host._config));
  return Object.entries(host._data.zones).some(([entityId, zone]) => {
    if (!visibleEntities.has(entityId)) {
      return false;
    }

    const preconditioning = zone.preconditioning;
    if (!preconditioning?.enabled && !preconditioning?.room_sensor_assist_enabled) {
      return false;
    }

    const climateTemperatureChanged =
      currentTemperatureValue(value, entityId) !==
      currentTemperatureValue(oldValue, entityId);
    if (climateTemperatureChanged) {
      return true;
    }
    const climateTargetChanged =
      targetTemperatureValue(value, entityId) !==
      targetTemperatureValue(oldValue, entityId);
    if (preconditioning?.room_sensor_assist_enabled && climateTargetChanged) {
      return true;
    }

    const roomEntityId = preconditioning?.room_temperature_entity_id;
    if (
      preconditioning?.room_sensor_assist_enabled
      && roomEntityId
      && value.states?.[roomEntityId]?.state !== oldValue.states?.[roomEntityId]?.state
    ) {
      return true;
    }

    const outdoorEntityId = preconditioning.use_outdoor_temperature
      ? preconditioning.outdoor_temperature_entity_id
      : null;
    return Boolean(
      outdoorEntityId &&
      value.states?.[outdoorEntityId]?.state !== oldValue.states?.[outdoorEntityId]?.state,
    );
  });
}

function currentTemperatureValue(hass: HomeAssistant, entityId: string): number | null {
  return hass.states?.[entityId]?.attributes?.current_temperature ?? null;
}

function targetTemperatureValue(hass: HomeAssistant, entityId: string): number | null {
  return hass.states?.[entityId]?.attributes?.temperature ?? null;
}

export function languageForHost(host: CardContextHost): SupportedLanguage {
  return languageFromHass(host.hass);
}

export function translateForHost(
  host: CardContextHost,
  key: TranslationKey,
  replacements: Record<string, string | number> = {},
): string {
  return translate(languageForHost(host), key, replacements);
}

export function weekdayNameForHost(host: CardContextHost, weekday: string): string {
  return weekdayName(languageForHost(host), weekday);
}

export function shortWeekdayNameForHost(host: CardContextHost, weekday: string): string {
  return shortWeekdayName(languageForHost(host), weekday);
}

export function dictionaryLabelForHost(
  host: CardContextHost,
  group: "hvacActions" | "hvacModes" | "schedulerModes" | "schedulerStatuses",
  key: string,
): string {
  return dictionaryLabel(languageForHost(host), group, key);
}

export function firstWeekdayForHost(host: CardContextHost): string {
  return firstWeekdayFromConfig(host._config);
}

export function orderedWeekdaysForHost(host: CardContextHost): string[] {
  return orderedWeekdays(firstWeekdayForHost(host));
}

export function orderedZoneIdsForHost(host: CardContextHost, entityIds: string[]): string[] {
  return orderedZoneIds(entityIds, host._config.zone_order);
}

export function visibleZoneIdsForHost(host: CardContextHost, entityIds: string[]): string[] {
  return visibleZoneIds(entityIds, host._config);
}
