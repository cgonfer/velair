import { describe, expect, it } from "vitest";
import { currentArrivalPreparation, preparationRoom } from "../../src/velair/domain/planned-return-preparation";
import type { PlannedReturnPreparationZone, PlannedReturnStatus } from "../../src/velair/types";

export const now = Date.parse("2026-10-12T10:00:00Z");
export const room = (overrides: Partial<PlannedReturnPreparationZone> = {}): PlannedReturnPreparationZone => ({
  entity_id: "climate.living", profile_id: null, schedule_source: "default", preparation: "adaptive",
  state: "pending", reason: null, start_at: "2026-10-12T11:00:00Z", target: { temperature: 20 }, ...overrides,
});
export const status = (zones = [room()]): PlannedReturnStatus => ({
  state: "away", occupancy: "away", sources: [], origin: "manual", can_start: false, episode_active: true,
  return_at: "2026-10-12T12:00:00Z", absence_confirm_at: null, destination_mode_id: "default", zones: [], error: null,
  preparation: { context: "arrival", return_at: "2026-10-12T12:00:00Z", mode_id: "default", zones },
});
describe("current saved-arrival preparation", () => {
  it("counts disjoint states and selects only a future waiting estimate", () => {
    const summary = currentArrivalPreparation(status([
      room(), room({ entity_id: "climate.preparing", state: "preparing", start_at: "2026-10-12T09:00:00Z" }),
      room({ state: "suspended", start_at: "2026-10-12T10:10:00Z", reason: "boost" }),
      room({ state: "reached" }), room({ preparation: "arrival_only" }), room({ preparation: "none", state: "unavailable" }),
    ]), now)!;
    expect(summary.counts).toEqual({ waiting: 1, preparing: 1, reached: 1, suspended: 1, arrivalOnly: 1, unavailable: 1 });
    expect(summary.state).toBe("preparing"); expect(summary.nextStart).toBe(Date.parse("2026-10-12T11:00:00Z"));
    expect(preparationRoom(summary, "climate.preparing")?.state).toBe("preparing");
    expect(preparationRoom(summary, "climate.unknown")).toBeUndefined();
    expect(summary.zones[2].start).toBeUndefined();
  });
  it.each(["cancelled", "fulfilled", "skipped", "disabled", "idle", "error"] as const)("rejects terminal %s even with stale active flag", state => {
    expect(currentArrivalPreparation({ ...status(), state }, now)).toBeUndefined();
  });
  it("rejects inactive/dismissed, invalid and past arrivals and nonfinite clocks", () => {
    for (const patch of [{ episode_active: false }, { dismissed: true }, { return_at: "invalid" },
      { return_at: "2026-10-12T12:00:00" }, { return_at: "2026-10-12T09:00:00Z" }]) {
      expect(currentArrivalPreparation({ ...status(), ...patch }, now)).toBeUndefined();
    }
    expect(currentArrivalPreparation(status(), NaN)).toBeUndefined();
    expect(currentArrivalPreparation(undefined, now)).toBeUndefined();
  });
  it("rejects stale arrival, destination and configuration previews", () => {
    const current = status();
    for (const patch of [{ return_at: "2026-10-12T13:00:00Z" }, { mode_id: "winter" }, { context: "configuration" as const }]) {
      expect(currentArrivalPreparation({ ...current, preparation: { ...current.preparation!, ...patch } }, now)).toBeUndefined();
    }
    expect(currentArrivalPreparation({ ...current, preparation: undefined, zones: [{ entity_id: "climate.old", start_at: "2026-10-12T11:00:00Z", target_when: current.return_at!, preparing: true }] }, now)).toBeUndefined();
  });
  it("matches timestamps by instant across offsets and does not synthesize preparation from elapsed time", () => {
    const current = status([room({ start_at: "2026-10-12T09:00:00Z" })]);
    current.preparation!.return_at = "2026-10-12T14:00:00+02:00";
    const summary = currentArrivalPreparation(current, now)!;
    expect(summary.state).toBe("waiting"); expect(summary.nextStart).toBe(Date.parse("2026-10-12T09:00:00Z"));
  });
  it("preserves cooling range targets and unknown reasons without inventing start times", () => {
    const target = { target_temp_low: 22, target_temp_high: 25, hvac_mode: "heat_cool" };
    const summary = currentArrivalPreparation(status([room({ target, start_at: "bad" }), room({ preparation: "arrival_only", reason: "new_reason" })]), now)!;
    expect(summary.zones[0].source.target).toEqual(target); expect(summary.zones[0].start).toBeUndefined();
    expect(summary.zones[1].source.reason).toBe("new_reason");
  });
  it("has an explicit unavailable state for empty or configuration-only room rows", () => {
    expect(currentArrivalPreparation(status([]), now)?.state).toBe("unavailable");
    expect(currentArrivalPreparation(status([room({ state: "configured" })]), now)?.counts.unavailable).toBe(1);
  });
});
