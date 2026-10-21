// @vitest-environment jsdom
import { render } from "lit";
import { describe, expect, it } from "vitest";
import { renderPreconditioningDependency } from "../../src/velair/views/preconditioning-dependency";
import { en } from "../../src/velair/translations/en";

const t = (key: string) => key;
describe("preconditioning dependency evidence", () => {
  it.each([
    ["master_not_managed", "preconditioningMasterNotManaged"],
    ["master_ineligible", "preconditioningMasterIneligible"],
    ["master_entity_missing", "preconditioningMasterEntityMissing"],
    ["master_unavailable", "preconditioningMasterUnavailable"],
    ["master_state_unknown", "preconditioningMasterStateUnknown"],
    ["master_scheduling_disabled", "preconditioningMasterSchedulingDisabled"],
    ["master_preconditioning_disabled", "preconditioningMasterPreconditioningDisabled"],
    ["master_profile_paused", "preconditioningMasterProfilePaused"],
    ["master_override_active", "preconditioningMasterOverrideActive"],
    ["master_no_transition", "preconditioningMasterNoTransition"],
  ])("shows only the precise %s reason", (detail, expected) => {
    const container = document.createElement("div");
    render(renderPreconditioningDependency({ master_entity_id: "climate.master", reason: "master_missing", reason_detail: detail }, t, value => value), container);
    expect(container.textContent).toContain(expected);
    expect(container.textContent).not.toContain("preconditioningDependencyMissing");
    expect(container.querySelectorAll("span")).toHaveLength(2);
  });
  it.each([undefined, "future_detail"])("preserves the coarse reason for unsupported detail %s", detail => {
    const container = document.createElement("div");
    render(renderPreconditioningDependency({ master_entity_id: "climate.master", reason: "master_no_preconditioning", reason_detail: detail }, t, value => value), container);
    expect(container.textContent).toContain("preconditioningDependencyNoStart");
    expect(container.textContent).not.toContain("future_detail");
  });
  it.each(["master_unavailable", "master_profile_paused", "master_override_active"])("does not turn a current %s condition into a nominal-start promise", detail => {
    const container = document.createElement("div");
    render(renderPreconditioningDependency({ master_entity_id: "climate.master", reason: "planned", reason_detail: detail, result: "constrained" }, key => en[key], value => value), container);
    expect(container.textContent).not.toContain("scheduled time");
    expect(container.textContent).not.toContain(en.preconditioningDependencyPlanned);
  });
  it("omits absent old payloads and does not invent reasons", () => {
    const container = document.createElement("div");
    render(renderPreconditioningDependency(undefined, t, value => value), container);
    expect(container.textContent).toBe("");
    render(renderPreconditioningDependency({ master_entity_id: "climate.master", reason: "future_reason" }, t, value => value), container);
    expect(container.querySelectorAll("span")).toHaveLength(1);
    expect(container.textContent).not.toContain("future_reason");
  });
  it("labels accepted command evidence and keeps invalid timestamps out of details", () => {
    const container = document.createElement("div");
    render(renderPreconditioningDependency({ master_entity_id: "climate.master", master_start: "2026-10-19T08:00:00Z",
      master_start_accepted: true, independent_start: "invalid", reason: "waiting_for_master" }, t, value => `date:${value}`, "Master", true), container);
    expect(container.textContent).toContain("preconditioningDependencyAcceptedStart");
    expect(container.textContent).toContain("date:2026-10-19T08:00:00Z");
    expect(container.textContent).not.toContain("date:invalid");
    expect(container.textContent).toContain("preconditioningDependencyEvidenceHelp");
  });
});
