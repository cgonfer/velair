import type { HassState } from "../types";
import type { TranslationKey } from "../translations";

export type EntityDiagnosticState = {
  messageKeys: TranslationKey[];
  status: "ok" | "warning" | "error";
};

export function entityDiagnosticState(
  entityId: string,
  state: HassState | undefined,
  supportedModes: string[],
): EntityDiagnosticState {
  const messageKeys: TranslationKey[] = [];
  let status: EntityDiagnosticState["status"] = "ok";

  if (!state) {
    return {
      messageKeys: ["entityDiagnosticMissing"],
      status: "error",
    };
  }

  if (!entityId.startsWith("climate.")) {
    messageKeys.push("entityDiagnosticNotClimate");
    status = "error";
  }

  if (!supportedModes.length) {
    messageKeys.push("entityDiagnosticNoModes");
    status = status === "error" ? "error" : "warning";
  }

  const attributes = state.attributes ?? {};
  if (typeof attributes.min_temp !== "number" || typeof attributes.max_temp !== "number") {
    messageKeys.push("entityDiagnosticNoRange");
    status = status === "error" ? "error" : "warning";
  }

  return {
    messageKeys,
    status,
  };
}
