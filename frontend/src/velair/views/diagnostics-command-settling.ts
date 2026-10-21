import { html, nothing } from "lit";
import type { VelairViewHost } from "../host-types";
import type { UnitDiagnostics } from "../types";
import type { TranslationKey } from "../translations";

const FIELD_LABELS: Record<string, TranslationKey> = {
  hvac_mode: "diagnosticsMismatchHvacMode",
  temperature: "targetTemperature",
  target_temp_low: "diagnosticsMismatchLowerTarget",
  target_temp_high: "diagnosticsMismatchUpperTarget",
  fan_mode: "fanMode",
  preset_mode: "presetMode",
  swing_mode: "swingMode",
  swing_horizontal_mode: "horizontalSwingMode",
  humidity: "targetHumidity",
};
const TEMPERATURE_FIELDS = new Set(["temperature", "target_temp_low", "target_temp_high"]);

function mismatchValue(host: VelairViewHost, entityId: string, field: string, value: unknown, expected: boolean): string {
  if (value === undefined) return host._t("diagnosticsMismatchNotReported");
  if (value === null) return host._t("diagnosticsMismatchNoValue");
  if (field === "hvac_mode") {
    if (expected && value === true) return host._t("diagnosticsMismatchNonOffMode");
    if (typeof value === "string") return host._modeLabel(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (TEMPERATURE_FIELDS.has(field)) return host._formatTemperature(value, entityId);
    const formatted = new Intl.NumberFormat(host._language()).format(value);
    return field === "humidity" ? `${formatted} %` : formatted;
  }
  if (typeof value === "boolean") return host._t(value ? "diagnosticsOn" : "diagnosticsOff");
  return typeof value === "string" && value ? value : host._t("unknown");
}

/** Uses recorded command evidence, never the current schedule or climate state. */
export function renderCommandSettlingMismatch(host: VelairViewHost, entityId: string, evidence: UnitDiagnostics["command_settling"]) {
  const fields = Object.entries(evidence?.mismatches ?? {}).filter(([, value]) => value && typeof value === "object" && !Array.isArray(value));
  if (!fields.length) return nothing;
  return html`<details class="diagnostics-command-mismatch">
    <summary><ha-icon icon="mdi:alert"></ha-icon><span>${host._t("diagnosticsMismatchTitle")}</span></summary>
    <div class="diagnostics-command-mismatch-content">
      <p>${host._t("diagnosticsMismatchExplanation")}</p>
      ${fields.map(([field, values]) => html`<section class="diagnostics-command-mismatch-field">
        <strong>${FIELD_LABELS[field] ? host._t(FIELD_LABELS[field]) : field.replaceAll("_", " ")}</strong>
        <dl class="diagnostics-rows">
          <div><dt>${host._t("diagnosticsMismatchExpected")}</dt><dd>${mismatchValue(host, entityId, field, values.expected, true)}</dd></div>
          <div><dt>${host._t("diagnosticsMismatchObserved")}</dt><dd>${mismatchValue(host, entityId, field, values.observed, false)}</dd></div>
        </dl>
      </section>`)}
    </div>
  </details>`;
}
