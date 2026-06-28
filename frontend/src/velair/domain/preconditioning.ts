import type { HomeAssistant } from "../types";

export type OutdoorTemperatureSensorOption = {
  entityId: string;
  label: string;
};

export function outdoorTemperatureSensorOptions(
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
