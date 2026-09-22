import type {
  ComfortMetricAssessment,
  ComfortAssessment,
  HomeAssistant,
  ComfortSettings,
  ComfortZoneAssessment,
  DerivedComfortMetric,
} from "../types";
import { convertAbsoluteTemperature, isFahrenheit } from "./temperature-units";

export const DERIVED_COMFORT_METRIC_ORDER: readonly DerivedComfortMetric[] = [
  "humidex",
  "dew_point",
  "absolute_humidity",
];

export type EntityOption = {
  entityId: string;
  label: string;
};

export type DerivedComfortVisualModel = {
  availability: ComfortMetricAssessment["availability"];
  kind: DerivedComfortMetric;
  value?: number;
  relation?: {
    delta: number;
    direction: "warmer" | "cooler" | "neutral";
    roomTemperature: number;
  };
  tone: "warm" | "cool" | "neutral";
};

export type HumidexScaleModel = {
  airCondition: "cold" | "comfortable" | "hot" | null;
  airPosition: number;
  airValue: number;
  bandEnd: number;
  bandStart: number;
  connectorStart: number;
  connectorVisible: boolean;
  connectorWidth: number;
  domainMaximum: number;
  domainMinimum: number;
  humidexPosition: number;
  rangePosition: "below" | "within" | "above" | null;
};

export type TemperatureAwareComfortZonePlotModel = {
  effective?: {
    basisTemperature: number;
    maximum: number;
    minimum: number;
  };
  markerX: number;
  markerY: number;
  polygon: string;
};

export function comfortZonePlotModel(
  zone: ComfortZoneAssessment | undefined,
  temperature: number,
  humidity: number,
): TemperatureAwareComfortZonePlotModel | undefined {
  const points = zone?.points;
  if (
    (zone?.model !== "temperature_aware" && zone?.model !== "guided")
    || !points
    || points.length < 2
    || ![
      zone.temperature_min, zone.temperature_max,
      temperature, humidity,
    ].every(Number.isFinite)
    || !points.every((point) => [
      point.temperature,
      point.humidity_min,
      point.humidity_max,
    ].every(Number.isFinite) && point.humidity_min <= point.humidity_max)
    || zone.temperature_min >= zone.temperature_max
  ) {
    return undefined;
  }

  const humidityMinimum = Math.min(...points.map((point) => point.humidity_min));
  const humidityMaximum = Math.max(...points.map((point) => point.humidity_max));
  const humidityPosition = (value: number) =>
    100 - comfortRangePosition(value, humidityMinimum, humidityMaximum);
  const effective = zone.effective_humidity_range;
  const upper = points.map((point) =>
    `${comfortRangePosition(point.temperature, zone.temperature_min, zone.temperature_max)}% ${humidityPosition(point.humidity_max)}%`
  );
  const lower = [...points].reverse().map((point) =>
    `${comfortRangePosition(point.temperature, zone.temperature_min, zone.temperature_max)}% ${humidityPosition(point.humidity_min)}%`
  );
  return {
    effective: effective
      && [effective.temperature, effective.minimum, effective.maximum].every(Number.isFinite)
      ? {
          basisTemperature: effective.temperature,
          maximum: effective.maximum,
          minimum: effective.minimum,
        }
      : undefined,
    markerX: comfortRangePosition(temperature, zone.temperature_min, zone.temperature_max),
    markerY: humidityPosition(humidity),
    polygon: [...upper, ...lower].join(", "),
  };
}

export const temperatureAwareComfortZonePlotModel = comfortZonePlotModel;

export function formatComfortAbsoluteHumidity(
  value: number,
  hass?: Pick<HomeAssistant, "language" | "locale" | "selectedLanguage">,
): string {
  const configuredLocale = hass?.locale?.language ?? hass?.language ?? hass?.selectedLanguage;
  const locale = configuredLocale?.replaceAll("_", "-");
  let formatted: string;
  try {
    formatted = value.toLocaleString(locale, { maximumFractionDigits: 2 });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    formatted = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return `${formatted} g/m³`;
}

export function humidexScaleModel(
  reading: ComfortMetricAssessment | undefined,
  temperature: ComfortMetricAssessment | undefined,
  minimum: number,
  maximum: number,
  temperatureUnit: string,
): HumidexScaleModel | undefined {
  if (
    reading?.availability !== "current"
    || temperature?.availability !== "current"
    || typeof reading.value !== "number"
    || !Number.isFinite(reading.value)
    || typeof temperature.value !== "number"
    || !Number.isFinite(temperature.value)
    || !Number.isFinite(minimum)
    || !Number.isFinite(maximum)
  ) {
    return undefined;
  }
  const fahrenheit = isFahrenheit(temperatureUnit);
  const minimumCelsius = fahrenheit
    ? convertAbsoluteTemperature(minimum, "°F", "°C")
    : minimum;
  const maximumCelsius = fahrenheit
    ? convertAbsoluteTemperature(maximum, "°F", "°C")
    : maximum;
  if (minimumCelsius > maximumCelsius) return undefined;

  const airCelsius = fahrenheit
    ? convertAbsoluteTemperature(temperature.value, "°F", "°C")
    : temperature.value;
  const domainMinimumCelsius = minimumCelsius - 5;
  const domainMaximumCelsius = maximumCelsius + 5;
  const span = domainMaximumCelsius - domainMinimumCelsius;
  const position = (value: number) => Math.min(
    96,
    Math.max(4, ((value - domainMinimumCelsius) / span) * 100),
  );
  const airPosition = position(airCelsius);
  const humidexPosition = position(reading.value);
  const rangePosition = reading.temperature_range_position;
  return {
    airCondition: temperature.condition === "cold"
      || temperature.condition === "comfortable"
      || temperature.condition === "hot"
      ? temperature.condition
      : null,
    airPosition,
    airValue: temperature.value,
    bandEnd: position(maximumCelsius),
    bandStart: position(minimumCelsius),
    connectorStart: Math.min(airPosition, humidexPosition),
    connectorVisible: Math.abs(reading.value - airCelsius) >= 0.1,
    connectorWidth: Math.abs(humidexPosition - airPosition),
    domainMaximum: fahrenheit
      ? convertAbsoluteTemperature(domainMaximumCelsius, "°C", "°F")
      : domainMaximumCelsius,
    domainMinimum: fahrenheit
      ? convertAbsoluteTemperature(domainMinimumCelsius, "°C", "°F")
      : domainMinimumCelsius,
    humidexPosition,
    rangePosition: rangePosition === "below"
      || rangePosition === "within"
      || rangePosition === "above"
      ? rangePosition
      : null,
  };
}

export function derivedComfortVisualModel(
  metric: DerivedComfortMetric,
  reading: ComfortMetricAssessment | undefined,
  temperature: ComfortMetricAssessment | undefined,
  temperatureUnit: string,
): DerivedComfortVisualModel {
  const availability = reading?.availability ?? "not_monitored";
  if (availability !== "current" || typeof reading?.value !== "number") {
    return { availability, kind: metric, tone: "neutral" };
  }
  const result: DerivedComfortVisualModel = {
    availability,
    kind: metric,
    tone: "neutral",
    value: reading.value,
  };
  if (
    metric === "absolute_humidity"
    || temperature?.availability !== "current"
    || typeof temperature.value !== "number"
  ) {
    return result;
  }

  const fahrenheit = temperatureUnit.toUpperCase().includes("F");
  const roomCelsius = fahrenheit
    ? (temperature.value - 32) * 5 / 9
    : temperature.value;
  const metricCelsius = metric === "humidex"
    ? reading.value
    : fahrenheit ? (reading.value - 32) * 5 / 9 : reading.value;
  const deltaCelsius = metric === "humidex"
    ? metricCelsius - roomCelsius
    : roomCelsius - metricCelsius;
  const delta = fahrenheit ? deltaCelsius * 9 / 5 : deltaCelsius;
  const displayedDelta = Number(delta.toFixed(1));
  const relationDelta = displayedDelta === 0 ? 0 : delta;
  if (metric === "dew_point") {
    if (displayedDelta === 0) {
      return result;
    }
    result.relation = {
      delta: relationDelta,
      direction: "neutral",
      roomTemperature: temperature.value,
    };
    return result;
  }

  const direction = displayedDelta > 0
    ? "warmer"
    : displayedDelta < 0 ? "cooler" : "neutral";
  result.relation = { delta: relationDelta, direction, roomTemperature: temperature.value };
  result.tone = direction === "warmer" ? "warm" : direction === "cooler" ? "cool" : "neutral";
  return result;
}

export function humidexPerceivedHeatDelta(
  assessment: ComfortAssessment,
  temperatureUnit: string,
): number | undefined {
  const model = derivedComfortVisualModel(
    "humidex",
    assessment.derived_metrics?.humidex,
    assessment.temperature,
    temperatureUnit,
  );
  return model.relation?.direction === "warmer" ? model.relation.delta : undefined;
}

export function comfortSettings(
  settings: Partial<ComfortSettings> | undefined,
  unit: string,
): ComfortSettings {
  const defaults = defaultComfortSettings(unit);
  return {
    ...defaults,
    ...settings,
    comfort_model: settings?.comfort_model === "temperature_aware"
      || settings?.comfort_model === "guided"
      ? settings.comfort_model
      : "simple",
    temperature_aware: {
      at_temperature_min: {
        ...defaults.temperature_aware.at_temperature_min,
        ...(settings?.temperature_aware?.at_temperature_min ?? {}),
      },
      at_temperature_max: {
        ...defaults.temperature_aware.at_temperature_max,
        ...(settings?.temperature_aware?.at_temperature_max ?? {}),
      },
    },
    derived_metrics: {
      dew_point: {
        ...defaults.derived_metrics.dew_point,
        ...(settings?.derived_metrics?.dew_point ?? {}),
      },
      absolute_humidity: {
        ...defaults.derived_metrics.absolute_humidity,
        ...(settings?.derived_metrics?.absolute_humidity ?? {}),
      },
      humidex: {
        ...defaults.derived_metrics.humidex,
        ...(settings?.derived_metrics?.humidex ?? {}),
      },
    },
  };
}

export function defaultComfortSettings(unit: string): ComfortSettings {
  const isFahrenheit = unit.toUpperCase().includes("F");
  return {
    enabled: false,
    comfort_model: "simple",
    temperature_entity_id: null,
    humidity_enabled: true,
    humidity_entity_id: null,
    co2_entity_id: null,
    temperature_min: isFahrenheit ? 68 : 20,
    temperature_max: isFahrenheit ? 75 : 24,
    humidity_min: 40,
    humidity_max: 60,
    temperature_aware: {
      at_temperature_min: { minimum: 40, maximum: 60 },
      at_temperature_max: { minimum: 40, maximum: 60 },
    },
    co2_attention: 1000,
    co2_poor: 1500,
    stale_after_minutes: 120,
    outdoor_comparison_enabled: false,
    outdoor_temperature_entity_id: null,
    outdoor_humidity_entity_id: null,
    ventilation_temperature_threshold: isFahrenheit ? 1.8 : 1,
    ventilation_humidity_threshold: 5,
    ventilation_absolute_humidity_threshold: 1,
    derived_metrics: {
      dew_point: { enabled: false, source: "velair", entity_id: null },
      absolute_humidity: { enabled: false, source: "velair", entity_id: null },
      humidex: { enabled: false, source: "velair", entity_id: null },
    },
  };
}

export function derivedMetricSensorOptions(
  hass: HomeAssistant | undefined,
  value: string,
  metric: DerivedComfortMetric,
): EntityOption[] {
  const options = Object.entries(hass?.states ?? {})
    .filter(([entityId, state]) => {
      if (entityId === value) {
        return true;
      }
      if (!entityId.startsWith("sensor.")) {
        return false;
      }
      const unit = String(state.attributes?.unit_of_measurement ?? "")
        .trim()
        .toLowerCase()
        .replaceAll("³", "3")
        .replaceAll(" ", "");
      if (metric === "absolute_humidity") {
        return ["g/m3", "g/m^3", "mg/m3", "mg/m^3"].includes(unit);
      }
      if (metric === "humidex") {
        return unit === "" || unit === "°c" || unit === "°f";
      }
      return unit === "°c" || unit === "°f";
    })
    .map(([entityId, state]) => ({
      entityId,
      label: state.attributes?.friendly_name || entityId,
    }))
    .sort((first, second) => first.label.localeCompare(second.label));

  if (value && !options.some((option) => option.entityId === value)) {
    options.unshift({ entityId: value, label: value });
  }
  return options;
}

export const VELAIR_DERIVED_METRIC_SOURCE = "__velair__";

export function derivedMetricSourceValue(
  source: "velair" | "entity",
  entityId: string | null,
): string {
  return source === "entity" ? entityId ?? "" : VELAIR_DERIVED_METRIC_SOURCE;
}

export function derivedMetricSourceSelection(
  value: string,
  retainedEntityId: string | null,
): { source: "velair" | "entity"; entity_id: string | null } | undefined {
  if (value === VELAIR_DERIVED_METRIC_SOURCE) {
    return { source: "velair", entity_id: retainedEntityId };
  }
  const entityId = value.trim();
  return entityId ? { source: "entity", entity_id: entityId } : undefined;
}

export function comfortSensorOptions(
  hass: HomeAssistant | undefined,
  value: string,
  kind: "temperature" | "humidity" | "co2",
): EntityOption[] {
  const states = hass?.states ?? {};
  const options = Object.entries(states)
    .filter(([entityId, state]) => {
      if (entityId === value) {
        return true;
      }
      if (!entityId.startsWith("sensor.")) {
        return false;
      }
      const deviceClass = String(state.attributes?.device_class ?? "").toLowerCase();
      const unit = String(state.attributes?.unit_of_measurement ?? "").toLowerCase();
      if (kind === "temperature") {
        return deviceClass === "temperature" || unit.includes("°");
      }
      if (kind === "humidity") {
        return deviceClass === "humidity" || unit === "%";
      }
      return deviceClass === "carbon_dioxide" || unit === "ppm";
    })
    .map(([entityId, state]) => ({
      entityId,
      label: state.attributes?.friendly_name || entityId,
    }))
    .sort((first, second) => first.label.localeCompare(second.label));

  if (value && !options.some((option) => option.entityId === value)) {
    options.unshift({ entityId: value, label: value });
  }
  return options;
}

export function comfortMetricIsCurrent(
  metric: ComfortMetricAssessment | undefined,
): metric is ComfortMetricAssessment & { value: number; min: number; max: number } {
  return (
    metric?.availability === "current"
    && typeof metric.value === "number"
    && typeof metric.min === "number"
    && typeof metric.max === "number"
  );
}

export function comfortRangePosition(
  value: number,
  minimum: number,
  maximum: number,
): number {
  const span = Math.max(maximum - minimum, 0.1);
  const domainMinimum = minimum - span;
  const domainMaximum = maximum + span;
  const position = ((value - domainMinimum) / (domainMaximum - domainMinimum)) * 100;
  return Math.max(4, Math.min(96, position));
}

export function comfortCo2Position(
  value: number,
  attention: number,
  poor: number,
): number {
  const domainMinimum = Math.min(400, attention * 0.5);
  const domainMaximum = Math.max(poor * 1.25, domainMinimum + 1);
  const position = ((value - domainMinimum) / (domainMaximum - domainMinimum)) * 100;
  return Math.max(4, Math.min(96, position));
}
