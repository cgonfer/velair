import { controlUnitId, expandedControlUnitIds, filteredPhysicalClimateIds, orderedControlUnitIds } from "../domain/control-units";
import { climateCardConfiguredActions } from "../domain/climate-card-actions";
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
  climateCardAvailabilitySignature,
  climateCardEntityIds,
  climateCardScriptEntityIds,
  climateCardStateSignature,
} from "../domain/climate-card";
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
  _hasExternalConfig?: boolean;
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
  if (host._config.view === "planned-return" || host._config.view === "climate" && climateCardConfiguredActions(host._config).some((action) => action.type === "planned-return" && action.enabled !== false)) {
    if (value.connection !== oldValue.connection
      || languageFromHass(value) !== languageFromHass(oldValue)
      || value.config?.time_zone !== oldValue.config?.time_zone
      || value.locale?.time_format !== oldValue.locale?.time_format) return true;
    const sourceIds = new Set(host._data?.planned_return?.occupancy_entity_ids ?? []);
    const ids = new Set([...sourceIds, ...(host._data?.configured_entities ?? [])]);
    const changed = [...ids].some((id) => {
      const current = value.states?.[id];
      const previous = oldValue.states?.[id];
      return (sourceIds.has(id) && current?.state !== previous?.state)
        || current?.attributes?.friendly_name !== previous?.attributes?.friendly_name
        || current?.attributes?.icon !== previous?.attributes?.icon;
    });
    if (changed || host._config.view === "planned-return") return changed;
  }
  const entityIds = filteredPhysicalClimateIds(host._data, host._config.entities);
  if (!entityIds.length) {
    return false;
  }
  if (host._config.view === "climate") {
    const scriptEntityIds = new Set(climateCardScriptEntityIds(host._config));
    return preconditioningInputsChanged(host, value, oldValue) || climateCardEntityIds(host._config, host._data?.configured_entities ?? []).some(
      (entityId) => scriptEntityIds.has(entityId)
        ? climateCardAvailabilitySignature(value.states?.[entityId])
          !== climateCardAvailabilitySignature(oldValue.states?.[entityId])
        : climateCardStateSignature(value.states?.[entityId])
          !== climateCardStateSignature(oldValue.states?.[entityId]),
    );
  }
  return preconditioningInputsChanged(host, value, oldValue) || entityIds.some(
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

  const selectedEntities = host._config.view === "climate" && host._config.selected_entity
    ? [host._config.selected_entity]
    : host._config.entities;
  const visibleEntities = new Set(filteredPhysicalClimateIds(host._data, selectedEntities).map(id => controlUnitId(host._data, id)));
  return Object.entries(host._data.zones).some(([entityId, zone]) => {
    if (!visibleEntities.has(entityId)) {
      return false;
    }

    const preconditioning = zone.preconditioning;
    if (!preconditioning?.enabled && !preconditioning?.room_sensor_assist_enabled) {
      return false;
    }

    const group = host._data?.room_groups?.[entityId];
    const reference = group?.temperature_entity_id ?? entityId;
    const climateTemperatureChanged =
      currentTemperatureValue(value, reference) !== currentTemperatureValue(oldValue, reference)
      || Boolean(group && value.states?.[reference]?.state !== oldValue.states?.[reference]?.state);
    if (climateTemperatureChanged) {
      return true;
    }
    const climateTargetChanged =
      (group?.members ?? [entityId]).some(id => targetTemperatureValue(value, id) !== targetTemperatureValue(oldValue, id));
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
  const grouped = Boolean(Object.keys(host._data?.room_groups ?? {}).length);
  if (grouped && entityIds === host._data?.configured_entities) {
    return orderedZoneIds(expandedControlUnitIds(host._data), host._hasExternalConfig ? host._config.zone_order : undefined);
  }
  const order = grouped && !host._hasExternalConfig ? host._data?.settings?.unit_order ?? host._config.zone_order : host._config.zone_order;
  return orderedZoneIds(entityIds, order);
}

export function visibleZoneIdsForHost(host: CardContextHost, entityIds: string[]): string[] {
  if (host._config.view === "climate") return visibleZoneIds(entityIds, host._config);
  if (!host._data?.room_groups || !Object.keys(host._data.room_groups).length) return visibleZoneIds(entityIds, host._config);
  const allowed = host._config.entities?.map(id => controlUnitId(host._data, id));
  return orderedControlUnitIds(host._data).filter(id => !allowed?.length || allowed.includes(id));
}
