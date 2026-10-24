import { html, nothing } from "lit";
import type { VelairViewHost } from "../host-types";
import type { PreconditioningLearningActivity, PreconditioningLearningTransition } from "../types";
import type { TranslationKey } from "../translations";

const REASONS: Record<string, TranslationKey> = {
  learning_suspended: "learningReasonSuspended",
  unsupported_range_mode: "unsupportedRangeThermalMode",
  temperature_unavailable: "learningReasonTemperatureUnavailable",
  target_not_resolved: "learningReasonTargetNotResolved",
  no_lead_time: "learningReasonNoLeadTime",
  climate_off: "learningReasonClimateOff",
  delta_too_small: "learningReasonDeltaTooSmall",
  observation_interrupted: "learningReasonInterrupted",
  target_reached: "learningReasonTargetReached",
  target_not_reached: "learningReasonTargetNotReached",
  duration_too_short: "learningReasonDurationTooShort",
  duration_too_long: "learningReasonDurationTooLong",
  out_of_bounds: "learningReasonOutOfBounds",
};

export function learningReasonLabel(host: VelairViewHost, reason: unknown): string | undefined {
  return typeof reason === "string" && REASONS[reason] ? host._t(REASONS[reason]) : undefined;
}

export function learningActivityLabel(host: VelairViewHost, activity: PreconditioningLearningActivity): string {
  if (activity.state === "observing") return host._t("learningActivityObserving");
  if (activity.state === "disabled") return host._t("roomSensorStatusDisabled");
  if (activity.state === "unavailable") return learningReasonLabel(host, activity.reason) ?? host._t("learningActivityUnavailable");
  return host._t("learningActivityWaiting");
}

export function learningCardActivityLabel(host: VelairViewHost, entityId: string, direction: "heat" | "cool", activity: PreconditioningLearningActivity): string {
  const last = host._data?.preconditioning_learning?.[entityId]?.[direction].last_transition;
  const reason = learningReasonLabel(host, last?.reason);
  if (activity.state === "waiting" && last?.status === "skipped" && reason && Number.isFinite(Date.parse(last.at))) {
    return host._t("learningLastSkippedTransition", { time: host._formatDateTime(last.at), reason });
  }
  return learningActivityLabel(host, activity);
}

export function learningTransitionLabel(host: VelairViewHost, status: unknown): string | undefined {
  const keys: Record<string, TranslationKey> = {
    started: "learningTransitionStarted", skipped: "learningTransitionSkipped",
    interrupted: "learningTransitionInterrupted", complete: "learningTransitionComplete",
    partial: "learningTransitionPartial", invalid: "learningTransitionInvalid",
  };
  return typeof status === "string" && keys[status] ? host._t(keys[status]) : undefined;
}

export function renderLearningDiagnostics(host: VelairViewHost, entityId: string, learning: unknown) {
  if (!learning || typeof learning !== "object") return nothing;
  const directions = learning as Partial<Record<"heat" | "cool", {
    activity?: PreconditioningLearningActivity; last_transition?: PreconditioningLearningTransition;
  }>>;
  return (["heat", "cool"] as const).map((direction) => {
    const data = directions[direction];
    if ((!data?.activity || data.activity.state === "disabled") && !data?.last_transition) return nothing;
    const last = data.last_transition;
    const reason = learningReasonLabel(host, last?.reason);
    return html`<section class="diagnostics-learning-direction">
      <h5>${host._t(direction === "heat" ? "preconditioningHeat" : "preconditioningCool")}</h5>
      ${data.activity ? html`<p class="diagnostics-learning-current">${learningActivityLabel(host, data.activity)}</p>` : nothing}
      ${last ? html`<p class="diagnostics-learning-last"><strong>${host._t("learningLastTransition", { time: host._formatDateTime(last.at) })}</strong>
        <span>${[learningTransitionLabel(host, last.status), reason].filter(Boolean).join(" · ")}</span></p>
        ${renderEvidence(host, entityId, last)}` : html`<p>${host._t("learningNoTransitionEvidence")}</p>`}
    </section>`;
  });
}

function renderEvidence(host: VelairViewHost, entityId: string, last: PreconditioningLearningTransition) {
  const values: Array<[keyof PreconditioningLearningTransition, TranslationKey, "temperature" | "delta" | "minutes" | "time"]> = [
    ["initial_temp", "learningInitialTemperature", "temperature"],
    ["target_temp", "diagnosticsAppliedTarget", "temperature"],
    ["observed_temp", "learningObservedTemperature", "temperature"],
    ["delta_t", "learningTemperatureDifference", "delta"],
    ["minimum_delta_temperature", "preconditioningMinimumDelta", "delta"],
    ["minutes_observed", "learningObservedDuration", "minutes"],
    ["max_lead_minutes", "preconditioningMaxLead", "minutes"],
    ["startup_minutes", "learningStartupDuration", "minutes"],
    ["start_time", "preconditioningStarts", "time"],
    ["scheduled_time", "preconditioningTargetBy", "time"],
  ];
  const rows = values.flatMap(([field, label, format]) => {
    const value = last[field];
    if (value === undefined || value === null) return [];
    const formatted = format === "time" && typeof value === "string" ? host._formatDateTime(value)
      : typeof value !== "number" || !Number.isFinite(value) ? undefined
      : format === "temperature" ? host._formatTemperature(value, entityId)
      : format === "delta" ? `${new Intl.NumberFormat(host._language()).format(value)} ${host._temperatureUnit(entityId)}`
      : `${new Intl.NumberFormat(host._language()).format(value)} ${host._t("minutesShort")}`;
    return formatted ? [html`<div><dt>${host._t(label)}</dt><dd>${formatted}</dd></div>`] : [];
  });
  return rows.length ? html`<details class="diagnostics-learning-evidence"><summary>${host._t("learningDecisionDetails")}</summary>
    <dl class="diagnostics-rows">${rows}</dl></details>` : nothing;
}
