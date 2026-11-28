// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it } from "vitest";
import type { VelairViewHost } from "../../src/velair/host-types";
import type { ZoneRuntimeStatus } from "../../src/velair/types";
import { renderPreconditioningOffset } from "../../src/velair/views/preconditioning-offset";
import { en } from "../../src/velair/translations/en";

const host = {
  _formatTemperature: (value: number) => `${value} °C`,
  _t: (key: keyof typeof en, replacements?: Record<string, string | number>) => {
    let text: string = en[key];
    for (const [name, value] of Object.entries(replacements ?? {})) text = text.replace(`{${name}}`, String(value));
    return text;
  },
} as unknown as VelairViewHost;

describe("accepted preparation offset", () => {
  it("does not infer an active offset without accepted runtime metadata", () => {
    const container = document.createElement("div");
    render(renderPreconditioningOffset(host, "climate.room", { target_temperature: 20 }), container);
    expect(container.querySelector(".preconditioning-offset-badge")).toBeNull();
  });

  it.each([
    { direction: "heat" as const, requested: 2, applied: 0, limit: "maximum" as const, expected: "Preparation 0 °C", final: 25 },
    { direction: "cool" as const, requested: -2, applied: -1, limit: "minimum" as const, expected: "Preparation −1 °C", final: 16 },
  ])("shows $direction signed effective offset and keeps requested and nominal values distinct", ({ direction, requested, applied, limit, expected, final }) => {
    const container = document.createElement("div");
    const status: ZoneRuntimeStatus = {
      state: "preconditioning", target_temperature: 20, applied_temperature: final,
      preconditioning_offset: { direction, requested, applied, base_target: { temperature: final - applied }, limited_by: limit },
    };
    render(renderPreconditioningOffset(host, "climate.room", status), container);
    expect(container.querySelector(".preconditioning-offset-badge > span")?.textContent).toBe(expected);
    expect(container.textContent).toContain("Scheduled target: 20 °C");
    expect(container.textContent).toContain(`Applied target: ${final} °C`);
    expect(container.textContent).toContain(`Limited by the device ${limit}.`);
    expect(container.querySelector("button")?.getAttribute("aria-describedby")).toBe(container.querySelector('[role="tooltip"]')?.id);
  });

  it("describes a shifted whole band using the accepted base without adding another graph line", () => {
    const container = document.createElement("div");
    render(renderPreconditioningOffset(host, "climate.room", {
      target_temp_low: 20, target_temp_high: 24, applied_target_temp_low: 22, applied_target_temp_high: 26,
      preconditioning_offset: { direction: "heat", requested: 2, applied: 1, base_target: { target_temp_low: 21, target_temp_high: 25 }, limited_by: "step" },
    }), container);
    expect(container.textContent).toContain("Scheduled target: 20 °C – 24 °C");
    expect(container.textContent).toContain("Base target: 21 °C – 25 °C");
    expect(container.textContent).toContain("Applied target: 22 °C – 26 °C");
  });
});
