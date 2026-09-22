import type {
  ClimateCardAction,
  ClimateCardCustomAction,
  HomeAssistant,
  VelairCardConfig,
} from "../types";

export const CLIMATE_CARD_DIRECT_ACTION_LIMIT = 3;

export type ClimateCardEligibleAction =
  | { type: "boost"; hideName: boolean; placement: "auto" | "more" }
  | { type: "pause"; hideName: boolean; placement: "auto" | "more" }
  | {
      type: "script";
      action: ClimateCardCustomAction;
      sourceIndex: number;
      available: boolean;
      placement: "auto" | "more";
    };

export function climateCardConfiguredActions(config: VelairCardConfig | unknown): ClimateCardAction[] {
  const value = asRecord(config);
  if (Array.isArray(value.climate_actions)) {
    const builtIns = new Set<string>();
    return value.climate_actions.flatMap((candidate): ClimateCardAction[] => {
      const action = asRecord(candidate);
      if (action.type === "boost" || action.type === "pause") {
        if (builtIns.has(action.type)) return [];
        builtIns.add(action.type);
        return [{
          type: action.type,
          enabled: typeof action.enabled === "boolean" ? action.enabled : true,
          ...(action.hide_name === true ? { hide_name: true } : {}),
          ...sanitizedPlacement(action.placement),
        }];
      }
      const script = sanitizedScriptAction(action);
      return action.type === "script" && script ? [{ type: "script", ...script }] : [];
    });
  }
  const legacyActions = Array.isArray(value.climate_custom_actions)
    ? value.climate_custom_actions.flatMap((candidate): ClimateCardCustomAction[] => {
        const action = sanitizedScriptAction(asRecord(candidate));
        return action ? [action] : [];
      })
    : [];
  return [
    { type: "boost", enabled: value.climate_show_boost_action !== false },
    { type: "pause", enabled: value.climate_show_pause_action !== false },
    ...legacyActions.map((action) => ({ type: "script" as const, ...action })),
  ];
}

export function climateCardEligibleActions(
  config: VelairCardConfig,
  hass: HomeAssistant | undefined,
  options: {
    velairActionsAvailable: boolean;
    manual: boolean;
  },
): ClimateCardEligibleAction[] {
  const eligible: ClimateCardEligibleAction[] = [];
  climateCardConfiguredActions(config).forEach((action, sourceIndex) => {
    if (action.type === "boost") {
      if (action.enabled !== false && options.velairActionsAvailable && !options.manual) {
        eligible.push({ type: "boost", hideName: action.hide_name === true, placement: action.placement ?? "auto" });
      }
      return;
    }
    if (action.type === "pause") {
      if (action.enabled !== false && options.velairActionsAvailable) {
        eligible.push({ type: "pause", hideName: action.hide_name === true, placement: action.placement ?? "auto" });
      }
      return;
    }
    const state = hass?.states?.[action.script];
    eligible.push({
      type: "script" as const,
      action,
      sourceIndex,
      available: Boolean(state && state.state !== "unavailable" && state.state !== "unknown"),
      placement: action.placement ?? "auto",
    });
  });
  return eligible;
}

export function splitClimateCardActions(actions: ClimateCardEligibleAction[]): {
  direct: ClimateCardEligibleAction[];
  overflow: ClimateCardEligibleAction[];
} {
  const direct: ClimateCardEligibleAction[] = [];
  const overflow: ClimateCardEligibleAction[] = [];
  actions.forEach((action) => {
    if (action.placement === "auto" && direct.length < CLIMATE_CARD_DIRECT_ACTION_LIMIT) direct.push(action);
    else overflow.push(action);
  });
  return { direct, overflow };
}

export function validScriptEntityId(entityId: unknown): entityId is string {
  return typeof entityId === "string" && /^script\.[a-z0-9_]+$/.test(entityId);
}

function sanitizedScriptAction(value: Record<string, unknown>): ClimateCardCustomAction | undefined {
  if (!validScriptEntityId(value.script)) return undefined;
  const fallbackName = value.script.slice("script.".length).replaceAll("_", " ") || value.script;
  const configuredName = typeof value.name === "string" ? value.name.trim() : "";
  return {
    name: (configuredName || fallbackName).slice(0, 60),
    script: value.script,
    ...(typeof value.icon === "string" ? { icon: value.icon } : {}),
    ...(typeof value.color === "string" ? { color: value.color } : {}),
    ...(typeof value.confirmation === "boolean" ? { confirmation: value.confirmation } : {}),
    ...(value.hide_name === true ? { hide_name: true } : {}),
    ...sanitizedPlacement(value.placement),
  };
}

function sanitizedPlacement(value: unknown): { placement?: "auto" | "more" } {
  return value === "auto" || value === "more" ? { placement: value } : {};
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
