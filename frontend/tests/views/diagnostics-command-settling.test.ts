// @vitest-environment jsdom
import { render } from "lit";
import { describe, expect, it } from "vitest";
import { renderCommandSettlingMismatch } from "../../src/velair/views/diagnostics-command-settling";
import { translate } from "../../src/velair/i18n";
import type { VelairViewHost } from "../../src/velair/host-types";

const host = {
  _t: (key: Parameters<typeof translate>[1]) => translate("en", key),
  _formatTemperature: (value: number, entityId: string) => `${value} ${entityId === "climate.fahrenheit" ? "°F" : "°C"}`,
  _modeLabel: (value: string) => `mode:${value}`,
  _language: () => "en",
} as unknown as VelairViewHost;

describe("command settling comparison", () => {
  it("shows only recorded discrepant fields once, with native expandable expected/reported pairs", () => {
    const container = document.createElement("div");
    render(renderCommandSettlingMismatch(host, "climate.room", { active: false, fields: ["fan_mode"], mismatches: {
      temperature: { expected: 21, observed: 19 },
      hvac_mode: { expected: "heat", observed: "off" },
    } }), container);
    expect(container.querySelectorAll("details")).toHaveLength(1);
    expect(container.querySelector("details")!.open).toBe(false);
    expect(container.querySelectorAll(".diagnostics-command-mismatch-field")).toHaveLength(2);
    const fields = container.querySelectorAll(".diagnostics-command-mismatch-field");
    expect(fields[0].textContent).toContain("Expected by Velair21 °C");
    expect(fields[0].textContent).toContain("Reported by the thermostat19 °C");
    expect(fields[1].textContent).toContain("mode:heat");
    expect(fields[1].textContent).toContain("mode:off");
    expect(container.textContent).not.toContain("Fan mode");
  });

  it("formats range temperatures in the climate's unit and explains the non-off sentinel", () => {
    const container = document.createElement("div");
    render(renderCommandSettlingMismatch(host, "climate.fahrenheit", { mismatches: {
      target_temp_low: { expected: 68, observed: 66 },
      target_temp_high: { expected: 75, observed: 77 },
      hvac_mode: { expected: true, observed: "off" },
    } }), container);
    expect(container.textContent).toContain("Lower target temperature");
    expect(container.textContent).toContain("68 °F");
    expect(container.textContent).toContain("77 °F");
    expect(container.textContent).toContain("Any mode except Off");
    expect(container.textContent).not.toContain("true");
  });

  it("preserves zero and custom option values and distinguishes absent/null evidence", () => {
    const container = document.createElement("div");
    render(renderCommandSettlingMismatch(host, "climate.room", { mismatches: {
      humidity: { expected: 0, observed: 40 },
      fan_mode: { expected: "quiet", observed: "turbo" },
      temperature: { expected: null },
    } }), container);
    expect(container.textContent).toContain("0 %");
    expect(container.textContent).toContain("40 %");
    expect(container.textContent).toContain("quiet");
    expect(container.textContent).toContain("turbo");
    expect(container.textContent).toContain("No value");
    expect(container.textContent).toContain("Not reported");
  });

  it("removes stale comparisons after a fresh snapshot clears mismatches and accepts older payloads", () => {
    const container = document.createElement("div");
    render(renderCommandSettlingMismatch(host, "climate.room", { mismatches: { temperature: { expected: 20, observed: 19 } } }), container);
    expect(container.querySelector("details")).not.toBeNull();
    render(renderCommandSettlingMismatch(host, "climate.room", { mismatches: {} }), container);
    expect(container.textContent).toBe("");
    render(renderCommandSettlingMismatch(host, "climate.room", undefined), container);
    expect(container.textContent).toBe("");
    expect(translate("es", "diagnosticsMismatchExpected")).toBe("Esperado por Velair");
    expect(translate("unknown", "diagnosticsMismatchExpected")).toBe("Expected by Velair");
  });

  it("escapes device text and does not dump structured unknown values", () => {
    const container = document.createElement("div");
    render(renderCommandSettlingMismatch(host, "climate.room", { mismatches: {
      preset_mode: { expected: "<script>bad()</script>", observed: { private: "payload" } },
    } }), container);
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>bad()</script>");
    expect(container.textContent).toContain("Unknown");
    expect(container.textContent).not.toContain("payload");
  });
});
