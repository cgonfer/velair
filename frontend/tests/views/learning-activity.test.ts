// @vitest-environment jsdom
import { render } from "lit";
import { describe, expect, it } from "vitest";
import { learningActivityLabel, learningCardActivityLabel, learningReasonLabel, renderLearningDiagnostics } from "../../src/velair/views/preconditioning-learning-activity";
import { translate } from "../../src/velair/i18n";
import type { VelairViewHost } from "../../src/velair/host-types";
const host = {
  _t: (key: Parameters<typeof translate>[1], replacements: Record<string, string | number> = {}) => translate("en", key, replacements),
  _formatDateTime: (value: string) => `date:${value}`,
  _formatTemperature: (value: number) => `${value} °F`, _temperatureUnit: () => "°F", _language: () => "en",
} as unknown as VelairViewHost;
describe("learning diagnostic explanations", () => {
  it("uses a retained skipped result only when waiting, with its time, and stops when history is cleared", () => {
    const viewHost = { ...host, _data: { preconditioning_learning: { "climate.bedroom": {
      heat: { last_transition: { at: "2026-10-19T08:00:00Z", status: "skipped", reason: "delta_too_small" } },
    } } } } as unknown as VelairViewHost;
    expect(learningCardActivityLabel(viewHost, "climate.bedroom", "heat", {state: "waiting"})).toContain("Last transition");
    expect(learningCardActivityLabel(viewHost, "climate.bedroom", "heat", {state: "waiting"})).toContain("date:2026-10-19T08:00:00Z");
    expect(learningCardActivityLabel(viewHost, "climate.bedroom", "heat", {state: "observing"})).toBe("Observing a temperature transition.");
    delete viewHost._data!.preconditioning_learning!["climate.bedroom"].heat.last_transition;
    expect(learningCardActivityLabel(viewHost, "climate.bedroom", "heat", {state: "waiting"})).toBe("Waiting for a transition that can be observed.");
  });

  it.each(["started", "skipped", "interrupted", "complete", "partial", "invalid"])("labels %s as a past timestamped transition and keeps evidence in native details", (status) => {
    const container = document.createElement("div");
    render(renderLearningDiagnostics(host, "climate.bedroom", { heat: {
      activity: { state: "waiting" },
      last_transition: { at: "2026-10-19T08:00:00Z", status, reason: "delta_too_small", initial_temp: 68, target_temp: 68.2, delta_t: 0.2, minimum_delta_temperature: 0.5, minutes_observed: 0, startup_minutes: 10 },
    } }), container);
    expect(container.querySelector(".diagnostics-learning-current")?.textContent).toBe("Waiting for a transition that can be observed.");
    expect(container.querySelector(".diagnostics-learning-last")?.textContent).toContain("Last transition · date:2026-10-19T08:00:00Z");
    expect(container.querySelector(".diagnostics-learning-last")?.textContent).toContain("did not exceed the configured minimum");
    const details = container.querySelector("details")!;
    expect(details.open).toBe(false);
    expect(details.textContent).toContain("68 °F");
    expect(details.textContent).toContain("0.2 °F");
    expect(details.textContent).toContain("0 min");
    expect(details.textContent).toContain("Time available before target");
    expect(details.textContent).toContain("10 min");
  });
  it("renders both directions and no invented past evidence", () => {
    const container = document.createElement("div");
    render(renderLearningDiagnostics(host, "climate.bedroom", { heat: {activity: {state: "observing"}}, cool: {activity: {state: "unavailable", reason: "temperature_unavailable"}} }), container);
    expect(container.querySelectorAll(".diagnostics-learning-direction")).toHaveLength(2);
    expect(container.querySelectorAll(".diagnostics-learning-last")).toHaveLength(0);
    expect(container.textContent).toContain("Temperature is unavailable.");
    expect(container.querySelector("details")).toBeNull();
  });
  it("does not infer an unknown cause and preserves the generic legacy reason", () => {
    expect(learningReasonLabel(host, "boiler_off")).toBeUndefined();
    expect(learningActivityLabel(host, { state: "unavailable", reason: "boiler_off" })).toBe("Learning activity is unavailable.");
    expect(learningReasonLabel(host, "out_of_bounds")).toContain("accepted limits");
    expect(translate("es", "learningActivityObserving")).toBe("Observando una transición de temperatura.");
    expect(translate("unknown", "learningActivityObserving")).toBe("Observing a temperature transition.");
  });
  it("omits the addition for old backend payloads", () => {
    const container = document.createElement("div");
    render(renderLearningDiagnostics(host, "climate.bedroom", { heat: { observation_count: 5 } }), container);
    expect(container.textContent).toBe("");
  });
});
