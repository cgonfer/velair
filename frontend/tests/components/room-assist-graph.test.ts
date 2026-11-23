// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { translate } from "../../src/velair/i18n";
import "../../src/velair/components/room-assist-graph-element";
import { VelairRoomAssistGraph } from "../../src/velair/components/room-assist-graph-element";
import { layoutRoomAssistChips, roomAssistRailLabelPlacement } from "../../src/velair/domain/room-assist-graph";
import type { VelairViewHost } from "../../src/velair/host-types";
import type { RoomSensorAssistStatus } from "../../src/velair/types";
function runtime(overrides: Partial<RoomSensorAssistStatus> = {}): RoomSensorAssistStatus {
  return {
    enabled: true, configured: true, status: "assisting", start: "17:00", hvac_mode: "heat",
    room_temperature: 20.2, target_temperature: 21, climate_temperature: 20.5, applied_temperature: 21.5,
    target_temp_step: .5, deadband_low: 20.5, deadband_high: 21.5,
    control_intent: { active: true, valid: true, demand: true, direction: "heat", source: "normal", thresholds: { heat: { target: 21, start_temperature: 20.5, stop_temperature: 21 } } },
    braking: { configured_level: "high", effective_level: "high", active: false, stop_temperature: 21, resume_temperature: 20.5, setpoint_bound: 20, reason: null },
    ...overrides,
  } as RoomSensorAssistStatus;
}
async function graph(status = runtime(), unit = "°C") {
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const element = document.createElement("velair-room-assist-graph") as VelairRoomAssistGraph;
  element.entityId = "climate.test";
  element.host = {
    _t: (key: Parameters<typeof translate>[1], params?: Record<string, string>) => translate("en", key, params),
    _formatTemperature: (value: number) => `${value} ${unit}`,
    _temperatureUnit: () => unit,
    _formatScheduleTime: (value: string) => value,
    _formatDateTime: (value: string) => value,
    _modeLabel: (value: string) => value,
  } as unknown as VelairViewHost;
  element.settings = { room_sensor_assist_deadband: .5 } as never;
  element.status = status;
  document.body.append(element);
  await element.updateComplete;
  return element;
}
afterEach(() => { document.body.replaceChildren(); vi.unstubAllGlobals(); });
describe("Room Assist display geometry", () => {
  it("keeps perpendicular stems through actual points while clamping edge chips", () => {
    const { chips } = layoutRoomAssistChips([
      { id: "left", x: 16, width: 130, height: 28 },
      { id: "right", x: 300, width: 120, height: 28 },
    ], 320);
    expect(chips[0].left).toBe(4);
    expect(chips[0].x).toBe(16);
    expect(chips[1].left).toBe(196);
    for (const chip of chips) expect(chip.x).toBeGreaterThan(chip.left);
  });
  it("separates coincident labels into lanes without moving their temperature", () => {
    const { chips } = layoutRoomAssistChips(["room", "target", "equipment"].map((id) => ({ id, x: 120, width: 100, height: 28 })), 320);
    expect(chips.map((chip) => chip.lane)).toEqual([0, 1, 2]);
    expect(chips.map((chip) => chip.x)).toEqual([120, 120, 120]);
  });
  it("uses actual segment length for every line label", () => {
    expect(roomAssistRailLabelPlacement(10, 300, 120)).toEqual({ center: 155, inline: true });
    expect(roomAssistRailLabelPlacement(300, 260, 120)).toEqual({ center: 280, inline: false });
  });
});
describe("Room Assist graph", () => {
  const dataRows = (element: VelairRoomAssistGraph, group: string) => [...element.shadowRoot!.querySelectorAll(`[data-group="${group}"] dt`)].map(label => ({ label: label.textContent!.trim(), value: label.nextElementSibling!.textContent!.trim() }));
  it("explains a limited minimum margin from confirmed backend evidence", async () => {
    const element = await graph(runtime({ minimum_margin: { configured: 10, active: true, limited_by: "step" } }));
    expect(dataRows(element, "control")).toContainEqual({ label: "Minimum control margin", value: "10 °C" });
    expect(dataRows(element, "control")).toContainEqual({ label: "Control margin state", value: "Limited by equipment step" });
    expect(element.shadowRoot!.querySelector(".human-explanation")!.textContent).toContain("does not confirm physical equipment activity");
    expect(element.shadowRoot!.querySelector(".human-explanation")!.textContent).toContain("Equipment steps or limits constrain the requested control margin.");
  });
  it("does not present a configured margin as applied during neutral holding or unconfirmed delivery", async () => {
    const element = await graph(runtime({ status: "holding", minimum_margin: { configured: 10, active: false, limited_by: null } }));
    expect(dataRows(element, "control")).toContainEqual({ label: "Control margin state", value: "Not applied during neutral holding or while Room Assist is inactive." });
    element.status = runtime({ minimum_margin: { configured: 10, active: true, limited_by: null }, control_intent: { valid: false, active: true, demand: null, direction: null } });
    await element.updateComplete;
    expect(dataRows(element, "control")).toContainEqual({ label: "Control margin state", value: "Unavailable" });
    expect(element.shadowRoot!.querySelector(".human-explanation")!.textContent).not.toContain("minimum control margin strengthens");
  });
  it("groups equivalent setpoint stages once without repeating graph readings", async () => {
    const element = await graph(runtime({ calculated_temperature: 24, requested_temperature: 24, applied_temperature: 24 }));
    expect(dataRows(element, "command")).toEqual([{ label: "Calculated · Requested · Applied", value: "24 °C" }, { label: "Equipment step", value: "0.5 °C" }]);
    expect(element.shadowRoot!.querySelector('.data [data-group="readings"]')).toBeNull();
    expect(element.shadowRoot!.querySelector('.data')!.textContent).not.toContain("Room20.2 °C");
  });
  it("keeps changed setpoint stages and step evidence separate", async () => {
    const element = await graph(runtime({ calculated_temperature: 22, requested_temperature: 21.5, pre_step_temperature: 21.5, applied_temperature: 21 }));
    expect(dataRows(element, "command")).toEqual([
      { label: "Calculated", value: "22 °C" }, { label: "Requested · Before step alignment", value: "21.5 °C" },
      { label: "Applied", value: "21 °C" }, { label: "Equipment step", value: "0.5 °C" },
    ]);
  });
  it("does not merge genuinely different stages just because formatting rounds them equally", async () => {
    const element = await graph(runtime({ calculated_temperature: 24.01, requested_temperature: 24.02, applied_temperature: 24.5 }));
    element.host = { ...element.host!, _formatTemperature: (value: number) => `${value.toFixed(1)} °C` };
    await element.updateComplete;
    expect(dataRows(element, "command").slice(0, 2)).toEqual([{ label: "Calculated", value: "24.0 °C" }, { label: "Requested", value: "24.0 °C" }]);
  });
  it("coalesces equal requested and applied ranges while preserving scalar reference evidence", async () => {
    const state = runtime({ target_temperature: null, target_temp_low: 20, target_temp_high: 24, requested_target_temp_low: 21, requested_target_temp_high: 25, applied_target_temp_low: 21, applied_target_temp_high: 25, target_boundary: "high" });
    state.reference_setpoint = { boundary: "high", calculated_temperature: 25.5, requested_temperature: 25, applied_temperature: 25, pre_step_temperature: null, scheduled_target_guard: "heating_ceiling", target_temp_step: .5 };
    const element = await graph(state);
    const rows = dataRows(element, "command");
    expect(rows.filter(row => row.value === "21–25 °C")).toEqual([{ label: "Requested range · Applied range", value: "21–25 °C" }]);
    expect(rows).toContainEqual({ label: "Calculated", value: "25.5 °C" });
    expect(rows).toContainEqual({ label: "Requested · Applied", value: "25 °C" });
    expect(element.shadowRoot!.querySelector('.data-reference')!.textContent).toBe("Upper reference setpoint");
  });
  it.each(["ready", "assisting"] as const)("only shows the reported setpoint when the current command is unconfirmed (%s)", async (status) => {
    const element = await graph(runtime({ status, calculated_temperature: 26, requested_temperature: 27, applied_temperature: 27, climate_target_temperature: 19, control_intent: { valid: false, active: true, demand: null, direction: null } }));
    expect(dataRows(element, "command")).toEqual([{ label: "Reported setpoint", value: "19 °C" }, { label: "Equipment step", value: "0.5 °C" }]);
    expect(dataRows(element, "control").some(row => row.label === "Stops" || row.label === "Resumes")).toBe(false);
  });
  it("keeps one copy of equivalent control boundaries and a concise braking state", async () => {
    const state = runtime({ hysteresis_phase: "towards_upper", hysteresis_target: 21.5 });
    state.braking = { ...state.braking!, configured_level: "default", effective_level: "default" };
    state.control_intent!.thresholds!.heat!.stop_temperature = 21.5;
    const element = await graph(state);
    const rows = dataRows(element, "control");
    expect(rows.filter(row => row.value === "21.5 °C")).toEqual([{ label: "Stops", value: "21.5 °C" }]);
    expect(rows.filter(row => row.value === "20.5 °C")).toEqual([{ label: "Resumes", value: "20.5 °C" }]);
    expect(rows).toContainEqual({ label: "Braking", value: "Default" });
    expect(rows.some(row => row.label === "Next threshold" || row.label === "Effective braking")).toBe(false);
  });
  it("preserves distinct nominal boundaries and a pending configured margin", async () => {
    const element = await graph(runtime({ deadband_low: 20, deadband_high: 22, hysteresis_phase: "towards_upper", hysteresis_target: 22 }));
    const rows = dataRows(element, "control");
    expect(rows).toContainEqual({ label: "Cycle boundary", value: "22 °C" });
    expect(rows).toContainEqual({ label: "Lower control boundary", value: "20 °C" });
    expect(rows.filter(row => row.value === "22 °C")).toHaveLength(1);
    expect(rows).toContainEqual({ label: "Configured margin", value: "0.5 °C" });
  });
  it("groups preparation evidence without adding a duplicate badge or hiding a zero extra", async () => {
    const state = runtime({ applied_temperature: 23.5 });
    state.preconditioning_offset = { direction: "heat", requested: 2, applied: 2, base_target: { temperature: 21.5 }, limited_by: null };
    const element = await graph(state);
    expect(dataRows(element, "preparation")).toEqual([{ label: "Before preparation extra", value: "21.5 °C" }, { label: "Requested · applied", value: "+2 °C" }]);
    element.status = { ...state, applied_temperature: 21.5, preconditioning_offset: { ...state.preconditioning_offset, requested: .3, applied: 0, limited_by: "step" } };
    await element.updateComplete;
    expect(dataRows(element, "preparation")).toEqual([{ label: "Requested", value: "+0.3 °C" }, { label: "Applied", value: "0 °C" }]);
    expect(element.shadowRoot!.querySelector('.data .preconditioning-offset-badge')).toBeNull();
    element.status = { ...state, limited_by: "maximum", limit_temperature: null, preconditioning_offset: { ...state.preconditioning_offset, limited_by: "maximum" } };
    await element.updateComplete;
    expect(dataRows(element, "limits")).toContainEqual({ label: "Preparation limit", value: "Limited by the device maximum." });
  });
  it("uses the dated block timestamp instead of repeating its clock time", async () => {
    const element = await graph(runtime({ room_temperature_entity_id: "sensor.room_reference", start: "17:00", active_from: "2026-11-22T17:00:00+01:00" }));
    expect(dataRows(element, "origin")).toEqual([{ label: "Room temperature sensor", value: "sensor.room_reference" }, { label: "Active since", value: "2026-11-22T17:00:00+01:00" }]);
    element.status = runtime({ start: "17:00" });
    await element.updateComplete;
    expect(dataRows(element, "origin")).toEqual([{ label: "Scheduled block", value: "17:00" }]);
  });
  it("opens one inline detail at a time and closes it with Escape or the same button", async () => {
    const element = await graph();
    const root = element.shadowRoot!;
    const button = root.querySelector<HTMLButtonElement>('[data-detail-toggle="explanation"]')!;
    const data = root.querySelector<HTMLButtonElement>('[data-detail-toggle="data"]')!;
    const panel = root.querySelector<HTMLElement>(".detail-panel")!;
    const explanation = root.querySelector<HTMLElement>(`#${button.getAttribute("aria-controls")}`)!;
    expect(root.querySelector(".why")).toBeNull();
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hidden).toBe(true);
    button.click();
    await element.updateComplete;
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(explanation.hidden).toBe(false);
    expect(explanation.textContent).toContain("equipment reads warmer than the room sensor");
    expect(explanation.textContent).not.toMatch(/\d|What is happening|What affects this request/);
    data.click();
    await element.updateComplete;
    expect(explanation.hidden).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(data.getAttribute("aria-expanded")).toBe("true");
    data.click();
    await element.updateComplete;
    expect(panel.hidden).toBe(true);
    button.click();
    await element.updateComplete;
    explanation.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
    await element.updateComplete;
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hidden).toBe(true);
    expect(root.activeElement).toBe(button);
  });
  it("refreshes open explanations on runtime updates and closes them on entity changes", async () => {
    const element = await graph();
    element.shadowRoot!.querySelector<HTMLButtonElement>('[data-detail-toggle="explanation"]')!.click();
    const state = runtime({ hvac_mode: "cool" });
    state.control_intent = { active: true, valid: true, demand: false, direction: "cool", source: "normal", thresholds: { cool: { target: 24, start_temperature: 24.5, stop_temperature: 23.5 } } };
    state.braking = undefined;
    element.status = state;
    await element.updateComplete;
    const root = element.shadowRoot!;
    expect(root.querySelector('[data-detail-toggle="explanation"]')?.getAttribute("aria-expanded")).toBe("true");
    expect(root.querySelector(".human-explanation")?.textContent).toContain("reach the restart boundary");
    expect(root.querySelector(".human-explanation")?.textContent).not.toContain("asking for heating");
    element.entityId = "climate.other";
    await element.updateComplete;
    await element.updateComplete;
    expect(root.querySelector<HTMLElement>(".detail-panel")!.hidden).toBe(true);
  });
  it("does not invent demand or sensor readings in the longer explanation", async () => {
    const element = await graph(runtime({ room_temperature: null, control_intent: { active: true, valid: false, direction: null, demand: null } }));
    const help = element.shadowRoot!.querySelector(".human-explanation")!;
    expect(help.textContent).toContain("have not produced a confirmed Room Assist request");
    expect(help.textContent).not.toContain("Your room sensor reads");
    expect(help.textContent).not.toContain("asking for heating");
  });
  it("explains preparation and step rounding without claiming a physical limit or an ordinary cycle", async () => {
    const state = runtime();
    state.control_intent!.source = "preconditioning";
    state.preconditioning_offset = { direction: "heat", requested: .3, applied: 0, base_target: { temperature: 21.5 }, limited_by: "step" };
    const element = await graph(state);
    const help = element.shadowRoot!.querySelector(".human-explanation")!.textContent;
    expect(help).toContain("upcoming schedule block");
    expect(help).toContain("setpoint step is affecting");
    expect(help).not.toContain("allowed temperature range is restricting");
    expect(help).not.toContain("High braking withdraws");
  });
  it("only describes an applied braking guard when committed evidence confirms it", async () => {
    const state = runtime({ calculated_temperature: 21, applied_temperature: 20, scheduled_target_guard: "heating_ceiling" });
    state.braking!.active = true;
    state.control_intent!.demand = false;
    const element = await graph(state);
    expect(element.shadowRoot!.querySelector(".human-explanation")?.textContent).toContain("Braking has adjusted");
    element.status = { ...state, limited_by: "minimum", limit_temperature: 20.5 };
    await element.updateComplete;
    const help = element.shadowRoot!.querySelector(".human-explanation")!.textContent;
    expect(help).not.toContain("Braking has adjusted");
    expect(help).toContain("allowed temperature range is restricting");
  });
  it.each(["heat", "cool"].flatMap(mode => [0.1, 0.2, 0.3].map(gap => ({ mode, gap }))))(
    "keeps a short $mode braking arrow inside its positive $gap degree segment",
    async ({ mode, gap }) => {
      const heating = mode === "heat";
      const target = heating ? 21 : 24;
      const direction = heating ? 1 : -1;
      const state = runtime({
        hvac_mode: mode,
        room_temperature: target - direction * gap,
        target_temperature: target,
        climate_temperature: heating ? 35 : 10,
        applied_temperature: heating ? 35.5 : 9.5,
        deadband_low: target - 0.5,
        deadband_high: target + 0.5,
        control_intent: {
          active: true, valid: true, demand: true, direction: heating ? "heat" : "cool", source: "normal",
          thresholds: { [mode]: { target, start_temperature: target - direction * 0.5, stop_temperature: target } },
        },
        braking: {
          configured_level: "high", effective_level: "high", active: false,
          stop_temperature: target, resume_temperature: target - direction * 0.5,
          setpoint_bound: target - direction, reason: null,
        },
      });
      const element = await graph(state);
      Object.assign(element, { width: 200 });
      await element.updateComplete;
      const root = element.shadowRoot!;
      const shaft = root.querySelector('[data-demand="true"]')!;
      const start = Number(shaft.getAttribute("x1"));
      const end = Number(shaft.getAttribute("x2"));
      const stops = [...root.querySelectorAll("[data-brake-stop]")];
      expect(stops).toHaveLength(2);
      const stop = stops.reduce((sum, mark) => sum + Number(mark.getAttribute("x1")), 0) / stops.length;
      expect(Math.abs(stop - start)).toBeLessThan(5);
      expect((end - start) * direction).toBeGreaterThan(0);
      expect((stop - end) * direction).toBeGreaterThan(0);
    },
  );

  it("uses solid demand and retains the entire nominal margin beyond the braking stop", async () => {
    const element = await graph();
    const root = element.shadowRoot!;
    expect(root.querySelector('[data-demand="true"]')?.getAttribute("stroke-dasharray")).toBeNull();
    expect(root.querySelectorAll("[data-brake-stop]")).toHaveLength(2);
    const strip = root.querySelector("[data-room-assist-margin] rect")!;
    expect(strip.getAttribute("height")).toBe("8");
    expect(root.textContent).toContain("Control band");
    expect(root.querySelectorAll(".rail-label")).toHaveLength(1);
    expect(root.querySelector<HTMLElement>(".detail-panel")!.hidden).toBe(true);
  });
  it("points dashed waiting toward the committed resume threshold without inventing sensor movement", async () => {
    const state = runtime();
    state.control_intent!.demand = false;
    const element = await graph(state);
    const root = element.shadowRoot!;
    expect(root.querySelector('[data-demand="false"]')?.getAttribute("stroke-dasharray")).toBe("3 4");
    expect(root.querySelector(".rail-label.control")?.textContent).toContain("Resumes · 20.5 °C");
    expect(root.querySelector(".rail-label.control")?.textContent).not.toContain("No demand");
    expect(root.querySelector(".chip")?.textContent).not.toMatch(/[↑↓]/);
  });
  it.each([false, true])("does not infer demand from assisting status or a cold room when demand is unknown (valid=%s)", async (valid) => {
    const element = await graph(runtime({ control_intent: { active: true, valid, direction: null, demand: null } }));
    expect(element.shadowRoot!.querySelector("[data-demand]")).toBeNull();
    expect(element.shadowRoot!.querySelector(".status")?.textContent).toContain("Waiting for confirmed");
  });
  it("adds continuous measurements only in Detailed mode", async () => {
    const element = await graph();
    (element.shadowRoot!.querySelectorAll(".modes button")[1] as HTMLButtonElement).click();
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[data-label-rail="gap"] line')?.getAttribute("stroke-dasharray")).toBeNull();
    expect(element.shadowRoot!.querySelector('[data-label-rail="total"] line')?.getAttribute("stroke-dasharray")).toBeNull();
  });
  it("explains the real configured preparation arrival margin, including effective zero extra", async () => {
    const state = runtime();
    state.control_intent = { active: true, valid: true, demand: true, direction: "heat", source: "preconditioning", thresholds: { heat: { target: 21, start_temperature: 20.7, stop_temperature: 20.7 } } };
    state.preconditioning_offset = { direction: "heat", requested: 2, applied: 0, base_target: { temperature: 21.5 }, limited_by: "maximum" };
    const element = await graph(state);
    expect(element.shadowRoot!.querySelector(".status")?.textContent).toContain("Extra 0 °C");
    expect(element.shadowRoot!.querySelector(".rail-label .inline-help-tooltip")?.textContent).toContain("20.7 °C");
    expect(element.shadowRoot!.querySelector("[data-brake-stop]")).toBeNull();
    expect(element.shadowRoot!.querySelector(".human-explanation")?.textContent).toContain("upcoming schedule block");
  });
  it("does not claim a braking guard effect merely because braking is active", async () => {
    const state = runtime({ calculated_temperature: 20.5, applied_temperature: 20.5 });
    state.braking!.active = true;
    state.braking!.setpoint_bound = 20.5;
    const element = await graph(state);
    expect(element.shadowRoot!.querySelector('[data-measure="setpoint"] small')).toBeNull();
    expect(element.shadowRoot!.textContent).toContain("already respects");
  });
  it("annotates an actual braking guard intervention but not a physical clamp", async () => {
    const state = runtime({ calculated_temperature: 21, applied_temperature: 20, scheduled_target_guard: "heating_ceiling" });
    state.braking!.active = true;
    const element = await graph(state);
    expect(element.shadowRoot!.querySelector('[data-measure="setpoint"] small')?.textContent).toContain("braking");
    element.status = { ...state, limited_by: "minimum" };
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[data-measure="setpoint"] small')).toBeNull();
  });
  it("draws native range brackets and only the outer margin sections", async () => {
    const element = await graph(runtime({ target_temperature: null, target_temp_low: 20, target_temp_high: 24, applied_temperature: null, applied_target_temp_low: 20, applied_target_temp_high: 24, deadband_low: 19.5, deadband_high: 24.5, room_temperature: 22, control_intent: { active: true, valid: true, demand: false, direction: null, source: "normal", thresholds: {} } }));
    const root = element.shadowRoot!;
    expect(root.querySelectorAll("[data-room-assist-margin]")).toHaveLength(2);
    expect(root.textContent).toContain("Outer margin");
    expect(root.querySelector("[data-chip-stem=setpoint]")?.getAttribute("x1")).toBe(root.querySelector("[data-chip-stem=setpoint]")?.getAttribute("x2"));
  });
  it("keeps the host unit and releases observer/frame on disconnect", async () => {
    const element = await graph(runtime({ room_temperature: 70 }), "°F");
    expect(element.shadowRoot!.querySelector('[data-measure="room"]')?.textContent).toContain("70 °F");
    element.remove();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
  it.each([
    ["heat", 21.1, 21],
    ["cool", 23.9, 24],
    ["heat", 21, 21],
  ] as const)("does not reverse a %s demand arrow when live readings cross its committed stop", async (direction, room, target) => {
    const state = runtime({ room_temperature: room, hvac_mode: direction });
    state.control_intent = { active: true, valid: true, demand: true, direction, source: "normal", thresholds: { [direction]: { target, start_temperature: target - .5, stop_temperature: target } } };
    const element = await graph(state);
    expect(element.shadowRoot!.querySelector("[data-demand]")).toBeNull();
    expect(element.shadowRoot!.querySelector("[data-control-threshold]")).not.toBeNull();
    expect(element.shadowRoot!.querySelector(".status")?.textContent).toContain(direction === "heat" ? "Heating requested" : "Cooling requested");
  });
  it("does not call a physically masked braking intervention an already compliant correction", async () => {
    const state = runtime({ calculated_temperature: 21, applied_temperature: 20.5, scheduled_target_guard: "heating_ceiling", limited_by: "minimum", limit_temperature: 20.5 });
    state.braking!.active = true;
    const element = await graph(state);
    expect(element.shadowRoot!.querySelector(".data")?.textContent).not.toContain("already respects");
    expect(element.shadowRoot!.querySelector(".data")?.textContent).not.toContain("bound changed");
  });
  it("shows reported equipment setpoint instead of stale correction while control is not accepted", async () => {
    const element = await graph(runtime({ status: "ready", applied_temperature: 27, climate_target_temperature: 19, control_intent: { active: true, valid: false, demand: null, direction: null } }));
    expect(element.shadowRoot!.querySelector('[data-measure="setpoint"]')?.textContent).toContain("19 °C");
    expect(element.shadowRoot!.querySelector(".data")?.textContent).not.toContain("Braking ready");
  });
  it("expands chips with the shared help interaction and closes on Escape", async () => {
    const element = await graph();
    const chip = element.shadowRoot!.querySelector<HTMLButtonElement>(".chip")!;
    chip.click();
    expect(chip.getAttribute("aria-expanded")).toBe("true");
    chip.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
    expect(chip.getAttribute("aria-expanded")).toBe("false");
  });
  it("uses the selected range boundary for the detailed gap inside the full range", async () => {
    const element = await graph(runtime({ target_temperature: null, target_temp_low: 20, target_temp_high: 24, target_boundary: "low", room_temperature: 22 }));
    (element.shadowRoot!.querySelectorAll(".modes button")[1] as HTMLButtonElement).click();
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[data-label-rail="gap"]')).not.toBeNull();
    expect(element.shadowRoot!.textContent).toContain("2 °C above target");
  });
  it.each([
    ["heat", "low", 21, 20, 20],
    ["heat", "high", 25, 24, 24],
    ["cool", "low", 19, 20, 20],
    ["cool", "high", 23, 24, 24],
  ] as const)("uses committed scalar guard evidence for %s with %s range reference", async (mode, boundary, calculated, requested, applied) => {
    const state = runtime({ hvac_mode: mode, target_temperature: null, target_temp_low: 20, target_temp_high: 24, target_boundary: boundary, applied_temperature: null, applied_target_temp_low: 19, applied_target_temp_high: 23 });
    state.braking!.active = true;
    state.braking!.setpoint_bound = requested;
    state.reference_setpoint = { boundary, calculated_temperature: calculated, requested_temperature: requested, applied_temperature: applied, scheduled_target_guard: mode === "heat" ? "heating_ceiling" : "cooling_floor", pre_step_temperature: null, target_temp_step: .5 };
    const element = await graph(state);
    expect(element.shadowRoot!.querySelector('[data-measure="setpoint"] small')?.textContent).toContain("braking");
    expect(element.shadowRoot!.querySelector(".data")?.textContent).toContain(`${calculated} °C`);
    element.status = { ...state, reference_setpoint: { ...state.reference_setpoint, applied_temperature: requested + .5 } };
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[data-measure="setpoint"] small')).toBeNull();
    expect(element.shadowRoot!.querySelector(".data")?.textContent).not.toContain("already respects");
  });
  it("keeps intrinsic label measurement stable across inline and below layouts", async () => {
    const element = await graph();
    const callbacks: FrameRequestCallback[] = [];
    vi.mocked(requestAnimationFrame).mockImplementation((callback) => { callbacks.push(callback); return callbacks.length; });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function(this: HTMLElement) {
      return { x: 0, y: 0, top: 0, left: 0, right: 100, bottom: 28, width: this.classList.contains("rail-text") ? 80 : this.classList.contains("inline") ? 120 : 100, height: 28, toJSON: () => ({}) };
    });
    element.remove();
    document.body.append(element);
    await element.updateComplete;
    element.requestUpdate();
    await element.updateComplete;
    for (let i = 0; i < 4; i++) { callbacks.shift()?.(0); await element.updateComplete; }
    expect(callbacks).toHaveLength(0);
    vi.restoreAllMocks();
  });
  it("identifies a group physical cap when preparation extra is reduced to zero", async () => {
    const state = runtime();
    state.preconditioning_offset = { direction: "heat", requested: 3, applied: 0, base_target: { temperature: 25 }, limited_by: "maximum" };
    const element = await graph(state);
    element.host = { ...element.host, _data: { room_groups: { "climate.test": {} }, control_unit_states: { "climate.test": { attributes: { max_temp: 25 } } } } } as unknown as VelairViewHost;
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".physical")?.textContent).toBe("Maximum 25 °C");
    expect(element.shadowRoot!.querySelector("[data-physical-limit]")).not.toBeNull();
  });
  it("keeps requested range distinct from the final accepted range in limit details", async () => {
    const element = await graph(runtime({ target_temperature: null, target_temp_low: 20, target_temp_high: 24, requested_target_temp_low: 22, requested_target_temp_high: 26, applied_target_temp_low: 21, applied_target_temp_high: 25, limited_by: "maximum", limit_temperature: 25 }));
    const data = element.shadowRoot!.querySelector(".data")!;
    expect(data.textContent).toContain("Requested range");
    expect(data.textContent).toContain("22–26 °C");
    expect(data.textContent).toContain("21–25 °C");
  });
  it("keeps temperatures in the graph and gives concise sensor context without a tutorial", async () => {
    const element = await graph();
    const state = runtime({ hysteresis_phase: "towards_upper" });
    state.braking!.configured_level = "default";
    state.braking!.effective_level = "default";
    element.status = state;
    await element.updateComplete;
    const text = element.shadowRoot!.querySelector(".human-explanation")!.textContent;
    expect(text).toContain("equipment reads warmer than the room sensor");
    expect(text).not.toMatch(/\d|Your room sensor reads|asking for heating|equipment setpoint to/);
    expect(text).not.toMatch(/hysteresis|small margin|repeatedly changing|control band/i);
  });
  it.each(["heat", "cool"] as const)("only explains continuing past the %s target when committed evidence confirms it", async (direction) => {
    const heating = direction === "heat";
    const state = runtime({ room_temperature: heating ? 21.2 : 23.8, climate_temperature: null, hvac_mode: direction, braking: undefined,
      hysteresis_phase: heating ? "towards_upper" : "towards_lower",
      control_intent: { active: true, valid: true, demand: true, direction, source: "normal", thresholds: { [direction]: { target: heating ? 21 : 24, start_temperature: heating ? 20.5 : 24.5, stop_temperature: heating ? 21.5 : 23.5 } } } });
    const element = await graph(state);
    expect(element.shadowRoot!.querySelector(".human-explanation")!.textContent).toContain("comfort target has been reached");
    expect(element.shadowRoot!.querySelector(".human-explanation")!.textContent).not.toContain("equipment reads");
    element.status = { ...state, room_temperature: heating ? 20 : 25 };
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".human-explanation")!.textContent).not.toContain("comfort target has been reached");
    element.status = { ...state, room_temperature: heating ? 22 : 23 };
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".human-explanation")!.textContent).not.toContain("comfort target has been reached");
  });
  it("preserves a threshold fallback when the room reading cannot support its graph relation", async () => {
    const element = await graph(runtime({ room_temperature: null }));
    expect(element.shadowRoot!.querySelector(".status")!.textContent).toContain("Brakes · 21 °C");
    expect(element.shadowRoot!.querySelector(".rail-label.control")).toBeNull();
    element.status = runtime();
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".status")!.textContent).toBe("Heating requested");
    expect(element.shadowRoot!.querySelector(".rail-label.control")!.textContent).toBe("Brakes · 21 °C");
  });
  it("describes cooler and matching equipment readings without inventing sensor corrections", async () => {
    const state = runtime({ room_temperature: 24.2, climate_temperature: null, hvac_mode: "cool", braking: undefined,
      control_intent: { active: true, valid: true, demand: true, direction: "cool", source: "normal", thresholds: { cool: { target: 24, start_temperature: 24.5, stop_temperature: 23.5 } } } });
    const element = await graph(state);
    expect(element.shadowRoot!.querySelector(".human-explanation")!.textContent).toContain("being guided by the room sensor");
    expect(element.shadowRoot!.querySelector(".human-explanation")!.textContent).not.toContain("equipment reads");
    element.status = { ...state, climate_temperature: 23 };
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".human-explanation")!.textContent).toContain("equipment reads cooler");
    element.status = { ...state, climate_temperature: 24.2 };
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".human-explanation")!.textContent).toContain("two sensors agree");
    expect(element.shadowRoot!.querySelector(".human-explanation")!.textContent).not.toContain("compensates for that difference");
  });
  it("explains a retained braking phase without inventing a completed preparation", async () => {
    const state = runtime({ calculated_temperature: 21, applied_temperature: 20, scheduled_target_guard: "heating_ceiling" });
    state.braking!.active = true;
    state.control_intent!.demand = false;
    const element = await graph(state);
    const why = element.shadowRoot!.querySelector(".human-explanation")?.textContent;
    expect(why).toContain("Braking has adjusted");
    expect(why).not.toMatch(/preparation.*(ended|reached|finished)/i);
  });
  it("distinguishes preparation step alignment from physical saturation", async () => {
    const state = runtime();
    state.preconditioning_offset = { direction: "heat", requested: .3, applied: 0, base_target: { temperature: 21.5 }, limited_by: "step" };
    state.control_intent!.source = "preconditioning";
    const element = await graph(state);
    expect(element.shadowRoot!.querySelector(".human-explanation")?.textContent).toContain("setpoint step is affecting");
    expect(element.shadowRoot!.querySelector(".human-explanation")?.textContent).not.toContain("allowed temperature range is restricting");
  });
  it("reserves the physical cap caption below the chip and relation lanes", async () => {
    const element = await graph(runtime({ limited_by: "maximum", limit_temperature: 25 }));
    const root = element.shadowRoot!;
    const physical = root.querySelector<HTMLElement>(".physical")!;
    const chipBottom = Math.max(...[...root.querySelectorAll<HTMLElement>(".tag")].map((tag) => parseFloat(tag.style.top) + 28));
    expect(parseFloat(physical.style.top)).toBeGreaterThan(chipBottom);
    const marker = root.querySelector("[data-physical-limit]")!;
    expect(Number(marker.getAttribute("y2"))).toBeLessThan(parseFloat(physical.style.top));
  });
  it("labels the actual runtime margin while a different configured margin is pending", async () => {
    const element = await graph(runtime({ deadband_low: 20, deadband_high: 22 }));
    expect(element.shadowRoot!.querySelector(".legend")?.textContent).toContain("±1 °C");
    expect(element.shadowRoot!.querySelector(".data")?.textContent).toContain("0.5 °C");
  });
  it("uses the group aggregate cap when a physical member card renders group assist", async () => {
    const state = runtime();
    state.preconditioning_offset = { direction: "heat", requested: 3, applied: 0, base_target: { temperature: 25 }, limited_by: "maximum" };
    const element = await graph(state);
    element.host = { ...element.host, hass: { states: { "climate.test": { attributes: { max_temp: 30 } } } }, _data: { member_to_unit: { "climate.test": "group.room" }, room_groups: { "group.room": {} }, control_unit_states: { "group.room": { attributes: { max_temp: 25 } } } } } as unknown as VelairViewHost;
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".physical")?.textContent).toBe("Maximum 25 °C");
  });
  it("expands live numeric sensor, target and extra details using accepted runtime values", async () => {
    const state = runtime({ applied_temperature: 23.5 });
    state.preconditioning_offset = { direction: "heat", requested: 2, applied: 2, base_target: { temperature: 21.5 }, limited_by: null };
    state.control_intent = { active: true, valid: true, demand: true, direction: "heat", source: "preconditioning", thresholds: { heat: { target: 21, start_temperature: 20.9, stop_temperature: 20.9 } } };
    const element = await graph(state);
    const root = element.shadowRoot!;
    const help = (role: string) => root.querySelector(`[data-measure="${role}"]`)!.parentElement!.querySelector(".inline-help-tooltip")!.textContent;
    expect(help("room")).toContain("Room 20.2 °C");
    expect(help("room")).toContain("+0.3 °C");
    expect(help("equipment")).toContain("Equipment 20.5 °C");
    expect(help("target")).toContain("Preparation ends · 20.9 °C");
    expect(help("setpoint")).toContain("Setpoint 23.5 °C");
    expect(help("setpoint")).toContain("21.5 °C");
    expect(help("setpoint")).toContain("+2 °C");
  });
  it("does not invent a completed preparation in expanded ordinary-control chips", async () => {
    const element = await graph();
    const help = [...element.shadowRoot!.querySelectorAll(".tag .inline-help-tooltip")].map((item) => item.textContent).join(" ");
    expect(help).not.toMatch(/preparation.*(completed|finished|already reached)/i);
    expect(help).not.toContain("Preparation ends ·");
  });
  it("reuses the existing effective step when exact alignment has no step evidence", async () => {
    const element = await graph(runtime({ target_temp_step: undefined }));
    const step = vi.fn(() => 0.5);
    element.host = { ...element.host, _entityTemperatureStep: step } as VelairViewHost;
    await element.updateComplete;
    const labels = [...element.shadowRoot!.querySelectorAll(".data dt")];
    expect(labels.find(label => label.textContent === "Equipment step")?.nextElementSibling?.textContent).toBe("0.5 °C");
    expect(step).toHaveBeenCalledWith("climate.test");
    expect(step).toHaveBeenCalledTimes(1);
  });
});
