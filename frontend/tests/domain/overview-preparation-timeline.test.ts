import { describe, expect, it } from "vitest";
import { currentArrivalPreparation } from "../../src/velair/domain/planned-return-preparation";
import { overviewPreparationGroups, overviewPreparationPoints } from "../../src/velair/domain/overview-preparation-timeline";
import type { PlannedReturnPreparationZone, PlannedReturnStatus } from "../../src/velair/types";

const departure = Date.parse("2026-10-12T08:00:00Z");
const arrival = "2026-10-12T12:00:00Z";
const zone = (entity_id: string, overrides: Partial<PlannedReturnPreparationZone> = {}): PlannedReturnPreparationZone => ({
  entity_id, profile_id: null, schedule_source: "default", preparation: "adaptive", state: "pending", reason: null,
  start_at: "2026-10-12T10:00:00Z", ...overrides,
});
function status(zones: PlannedReturnPreparationZone[]): PlannedReturnStatus {
  return { state: "away", episode_active: true, occupancy: "away", sources: [], can_start: false,
    return_at: arrival, departure_at: new Date(departure).toISOString(), destination_mode_id: "default",
    preparation: { context: "arrival", return_at: arrival, mode_id: "default", zones } } as PlannedReturnStatus;
}
function points(value: PlannedReturnStatus, roster = value.preparation!.zones.map(item => item.entity_id)) {
  return overviewPreparationPoints(currentArrivalPreparation(value, departure + 1000), departure, roster);
}
describe("Overview per-climate preparation timeline", () => {
  it("includes only adaptive pending/preparing rooms, for heating, cooling and ranges", () => {
    const value = status([
      zone("climate.heat", { target: { temperature: 21, hvac_mode: "heat" } }),
      zone("climate.cool", { state: "preparing", target: { temperature: 24, hvac_mode: "cool" } }),
      zone("climate.range", { target: { target_temp_low: 19, target_temp_high: 24 } }),
      ...(["reached", "suspended", "unavailable", "configured"] as const).map(state => zone(`climate.${state}`, { state })),
      zone("climate.arrival", { preparation: "arrival_only" }), zone("climate.none", { preparation: "none" }),
      zone("climate.invalid", { start_at: "invalid" }), zone("climate.missing", { start_at: null }),
      zone("climate.local", { start_at: "2026-10-12T10:00:00" }), zone("climate.late", { start_at: arrival }),
    ]);
    expect(points(value).map(point => point.entityId)).toEqual(["climate.cool", "climate.heat", "climate.range"]);
  });
  it("rejects stale, mismatched, dismissed and expired projections", () => {
    const original = status([zone("climate.a")]);
    for (const patch of [{ state: "cancelled" }, { state: "fulfilled" }, { dismissed: true }, { destination_mode_id: "different" }, { return_at: "2026-10-11T12:00:00Z" }]) {
      expect(points({ ...original, ...patch } as PlannedReturnStatus)).toEqual([]);
    }
    expect(points({ ...original, preparation: { ...original.preparation!, return_at: "2026-10-12T13:00:00Z" } })).toEqual([]);
  });
  it("keeps colors stable across ordering and visible states and preserves past estimates", () => {
    const roster = ["climate.a", "climate.b", "climate.c"];
    const first = points(status([zone("climate.b"), zone("climate.a", { start_at: "2026-10-12T07:00:00Z" })]), roster);
    const later = points(status([zone("climate.a", { state: "preparing", start_at: "2026-10-12T07:00:00Z" }), zone("climate.b", { state: "reached" })]), roster);
    expect(first[0].entityId).toBe("climate.a");
    expect(first[0].start).toBe(Date.parse("2026-10-12T07:00:00Z"));
    expect(first[0].progress).toBe(0);
    expect(later[0].color).toBe(first[0].color);
    expect(new Set(first.map(point => point.color)).size).toBe(2);
  });
  it("groups equal times into ten equal sectors without losing identities or times", () => {
    const entries = points(status(Array.from({ length: 10 }, (_, i) => zone(`climate.${i}`))));
    const groups = overviewPreparationGroups(entries, 400);
    expect(groups).toHaveLength(1);
    expect(groups[0].points).toHaveLength(10);
    expect(groups[0].position).toBe(200);
    expect(groups[0].background).toContain("0% 10%");
    expect(groups[0].background).toContain("90% 100%");
    expect(new Set(entries.map(point => point.color)).size).toBe(10);
  });
  it("groups only overlapping help areas and recomputes from the actual width", () => {
    const entries = points(status([zone("climate.a"), zone("climate.b", { start_at: "2026-10-12T10:20:00Z" })]));
    expect(overviewPreparationGroups(entries, 200)).toHaveLength(1);
    const wide = overviewPreparationGroups(entries, 800);
    expect(wide).toHaveLength(2);
    expect(wide[0].background).toBe(entries[0].color);
    expect(overviewPreparationGroups(entries, 0)).toEqual([]);
    expect(overviewPreparationGroups(entries, NaN)).toEqual([]);
  });
  it("clamps start positions while preserving the original estimate and deduplicates climates", () => {
    const entries = points(status([zone("climate.a", { start_at: "2026-10-12T07:00:00Z" }), zone("climate.a")]));
    expect(entries).toHaveLength(1);
    expect(overviewPreparationGroups(entries, 300)[0].position).toBe(16);
    expect(overviewPreparationGroups(entries, 20)[0].position).toBe(10);
  });
});
