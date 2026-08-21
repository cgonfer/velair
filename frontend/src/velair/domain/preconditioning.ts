import type { HomeAssistant, PreconditioningSettings } from "../types";
import {
  defaultMinimumDelta,
  defaultMinutesPerDegree,
  defaultRoomAssistDeadband,
  defaultRoomAssistDelta,
} from "./temperature-units";

export type OutdoorTemperatureSensorOption = {
  entityId: string;
  label: string;
};

export function temperatureSensorOptions(
  hass: HomeAssistant | undefined,
  selectedEntityId: string,
): OutdoorTemperatureSensorOption[] {
  const temperatureUnit = hass?.config?.unit_system?.temperature;
  const states = hass?.states ?? {};
  const options = Object.entries(states)
    .filter(([entityId, state]) => {
      if (!entityId.startsWith("sensor.")) {
        return false;
      }
      const attributes = state.attributes ?? {};
      return (
        attributes.device_class === "temperature"
        || (temperatureUnit !== undefined && attributes.unit_of_measurement === temperatureUnit)
        || entityId === selectedEntityId
      );
    })
    .map(([entityId, state]) => {
      const name = state.attributes?.friendly_name ?? entityId;
      const unit = state.attributes?.unit_of_measurement ?? "";
      const reading = numericStateLabel(state.state, unit);
      return {
        entityId,
        label: reading ? `${name} (${reading})` : `${name} (${entityId})`,
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));

  if (
    selectedEntityId
    && !options.some((option) => option.entityId === selectedEntityId)
  ) {
    options.push({
      entityId: selectedEntityId,
      label: selectedEntityId,
    });
  }

  return options;
}

export function preconditioningSettings(
  value?: Partial<PreconditioningSettings>,
  temperatureUnit?: string,
): PreconditioningSettings {
  return {
    enabled: Boolean(value?.enabled),
    max_lead_minutes: Number(value?.max_lead_minutes ?? 1440),
    minimum_delta_temperature: Number(value?.minimum_delta_temperature ?? defaultMinimumDelta(temperatureUnit)),
    learning_history_size: Number(value?.learning_history_size ?? 120),
    similar_sample_count: Number(value?.similar_sample_count ?? 25),
    comfort_percentile: Number(value?.comfort_percentile ?? 80),
    adaptive_percentile_enabled: value?.adaptive_percentile_enabled ?? true,
    partial_expiry_days: Number(value?.partial_expiry_days ?? 30),
    recency_decay_days: Number(value?.recency_decay_days ?? 30),
    min_start_minutes: Number(value?.min_start_minutes ?? 10),
    fallback_minutes_per_degree: Number(value?.fallback_minutes_per_degree ?? defaultMinutesPerDegree(temperatureUnit)),
    use_outdoor_temperature: value?.use_outdoor_temperature ?? true,
    outdoor_temperature_entity_id: value?.outdoor_temperature_entity_id ?? null,
    room_temperature_entity_id: value?.room_temperature_entity_id ?? null,
    room_sensor_assist_enabled: value?.room_sensor_assist_enabled ?? false,
    room_sensor_assist_deadband: Number(
      value?.room_sensor_assist_deadband
      ?? value?.minimum_delta_temperature
      ?? defaultRoomAssistDeadband(temperatureUnit),
    ),
    room_sensor_assist_max_delta: Number(value?.room_sensor_assist_max_delta ?? defaultRoomAssistDelta(temperatureUnit)),
    room_sensor_assist_debounce_seconds: Number(
      value?.room_sensor_assist_debounce_seconds ?? 20,
    ),
  };
}

function numericStateLabel(value: string | undefined, unit: string) {
  if (
    value === undefined
    || value === "unknown"
    || value === "unavailable"
    || Number.isNaN(Number(value))
  ) {
    return "";
  }
  return `${value}${unit ? ` ${unit}` : ""}`;
}
