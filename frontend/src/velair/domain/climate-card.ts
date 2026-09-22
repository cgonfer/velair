import type {
  ComfortAssessment,
  HassState,
  HomeAssistant,
  ScheduleResponse,
  VelairCardConfig,
} from "../types";
import { climateCardConfiguredActions } from "./climate-card-actions";

export type ClimateCardOwner = "automatic" | "manual" | "external";
export type ClimateCardWindow = {
  entityId: string;
  name: string;
  state: "open" | "closed" | "unavailable";
};

const REPORTED_CLIMATE_ACTIONS = new Set([
  "heating", "cooling", "drying", "fan", "idle", "off", "preheating", "defrosting",
]);

export function climateCardOwner(data: ScheduleResponse, entityId: string): ClimateCardOwner {
  if (data.zones[entityId]?.execution?.type === "external") return "external";
  return data.zone_runtime?.[entityId]?.control_mode === "manual" ? "manual" : "automatic";
}

export function climateCardEntityIds(config: VelairCardConfig, managedEntityIds: string[]): string[] {
  const selected = config.selected_entity && managedEntityIds.includes(config.selected_entity)
    ? config.selected_entity
    : managedEntityIds[0];
  return [
    selected,
    config.climate_show_current_humidity === false ? undefined : config.climate_humidity_entity,
    config.climate_show_outdoor_temperature === false ? undefined : config.climate_outdoor_temperature_entity,
    ...(config.climate_show_windows === false ? [] : (config.climate_window_entities ?? [])),
    ...climateCardScriptEntityIds(config),
  ].filter((value): value is string => Boolean(value));
}

export function climateCardScriptEntityIds(config: VelairCardConfig): string[] {
  return climateCardConfiguredActions(config)
    .filter((action) => action.type === "script")
    .map((action) => action.script);
}

export function climateCardAvailabilitySignature(state?: HassState): "available" | "unavailable" {
  return state && state.state !== "unknown" && state.state !== "unavailable"
    ? "available"
    : "unavailable";
}

export function climateCardStateSignature(state?: HassState): string {
  return JSON.stringify({ state: state?.state, attributes: state?.attributes });
}

export function climateCardWindows(hass: HomeAssistant | undefined, entityIds: string[]): ClimateCardWindow[] {
  return entityIds.map((entityId) => {
    const entity = hass?.states?.[entityId];
    const state = entity?.state;
    return {
      entityId,
      name: entity?.attributes?.friendly_name ?? entityId,
      state: state === "on" || state === "open"
        ? "open"
        : state === "off" || state === "closed"
          ? "closed"
          : "unavailable",
    };
  });
}

export function numericEntityState(hass: HomeAssistant | undefined, entityId?: string): number | undefined {
  if (!entityId) return undefined;
  const value = Number(hass?.states?.[entityId]?.state);
  return Number.isFinite(value) ? value : undefined;
}

export function comfortAccent(comfort?: ComfortAssessment): "good" | "info" | "warning" | "bad" | "muted" {
  if (!comfort?.enabled || comfort.data_quality === "unavailable" || comfort.condition === "no_readings") {
    return "muted";
  }
  if (comfort.range_summary) {
    if (comfort.range_summary.status === "within_range") return "good";
    if (comfort.range_summary.status === "mixed") return "info";
    if (comfort.range_summary.status === "outside_range") return "warning";
    return "muted";
  }
  if (comfort.condition === "comfortable" || comfort.condition.endsWith("_comfortable")) return "good";
  if (comfort.condition.includes("hot") || comfort.condition.includes("cold")) return "bad";
  return "warning";
}

export function climateCardAction(state?: HassState): string {
  if (!state || state.state === "unavailable" || state.state === "unknown") return "unavailable";
  const mode = state.state || "off";
  if (mode === "off") return "off";
  const reported = state.attributes?.hvac_action;
  if (reported && REPORTED_CLIMATE_ACTIONS.has(reported)) return reported;
  return mode;
}

export function climateCardModeIcon(mode: string): string {
  const icons: Record<string, string> = {
    heat: "mdi:fire",
    cool: "mdi:snowflake",
    heat_cool: "mdi:sun-snowflake-variant",
    auto: "mdi:thermostat-auto",
    dry: "mdi:water-percent",
    fan_only: "mdi:fan",
    off: "mdi:power",
  };
  return icons[mode] ?? "mdi:thermostat";
}

export function climateCardActionIcon(action: string): string {
  return ({
    heating: "mdi:fire",
    cooling: "mdi:snowflake",
    drying: "mdi:water-percent",
    fan: "mdi:fan",
    idle: "mdi:thermostat",
    off: "mdi:power",
    preheating: "mdi:radiator",
    defrosting: "mdi:snowflake-melt",
    unavailable: "mdi:alert-circle-outline",
  } as Record<string, string>)[action] ?? "mdi:thermostat";
}
