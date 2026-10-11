import { describe, expect, it } from "vitest";
import { plannedReturnDelay, plannedReturnTimeline, plannedReturnTimelineLabels, plannedReturnPreparationMarker, plannedReturnPreparationEstimates, plannedReturnPreparationSummary } from "../../src/velair/domain/planned-return-timeline";
import type { PlannedReturnStatus } from "../../src/velair/types";
const status = { state: "away", departure_at: "2026-10-24T22:00:00Z", return_at: "2026-10-25T04:00:00Z" } as PlannedReturnStatus;
describe("confirmed return timeline", () => {
  it("uses elapsed UTC time across DST and clamps before departure and after arrival", () => {
    expect(plannedReturnTimeline(status, Date.parse("2026-10-25T01:00:00Z"))?.progress).toBe(.5);
    expect(plannedReturnTimeline(status, Date.parse("2026-10-24T21:00:00Z"))?.progress).toBe(0);
    expect(plannedReturnTimeline(status, Date.parse("2026-10-25T05:00:00Z"))?.progress).toBe(1);
  });
  it.each(["armed", "confirming_absence", "fulfilled", "cancelled", "skipped", "error", "idle", "disabled"] as const)("has no moving timeline in %s", (state) => {
    expect(plannedReturnTimeline({ ...status, state })).toBeUndefined();
  });
  it("requires a valid confirmed departure and later saved arrival", () => {
    for (const departure_at of [undefined, null, "invalid", "2026-10-10T08:00:00", status.return_at]) expect(plannedReturnTimeline({ ...status, departure_at })).toBeUndefined();
    expect(plannedReturnTimeline({ ...status, return_at: null })).toBeUndefined();
    expect(plannedReturnTimeline({ ...status, state: "preparing" })).toBeDefined();
  });
  it("compares local calendar dates rather than UTC dates", () => {
    const start = Date.parse("2026-10-09T23:00:00Z"); const end = Date.parse("2026-10-10T04:00:00Z");
    const same = plannedReturnTimelineLabels(start, end, "Europe/Madrid", "en", false);
    expect(same.differentDates).toBe(false); expect(same.departure).toBe("01:00"); expect(same.arrival).toBe("06:00");
    const different = plannedReturnTimelineLabels(start, end, "UTC", "en", false);
    expect(different.differentDates).toBe(true); expect(different.departure).toContain("2026");
  });
  it("keeps compact delay units readable", () => {
    expect(plannedReturnDelay(0)).toBe("0 min"); expect(plannedReturnDelay(10)).toBe("10 min");
    expect(plannedReturnDelay(120)).toBe("2 h"); expect(plannedReturnDelay(90)).toBe("90 min");
  });
});

describe("backend preparation estimate marker", () => {
  const departure = Date.parse("2026-10-10T08:00:00Z"); const arrival = Date.parse("2026-10-10T12:00:00Z");
  const projected = () => ({ ...status, return_at: new Date(arrival).toISOString(), preparation: {
    context: "arrival", return_at: new Date(arrival).toISOString(), zones: [
      { entity_id: "climate.a", preparation: "adaptive", state: "pending", start_at: "2026-10-10T10:00:00Z" },
      { entity_id: "climate.b", preparation: "adaptive", state: "preparing", start_at: "2026-10-10T09:00:00Z" },
      { entity_id: "climate.paused", preparation: "adaptive", state: "suspended", start_at: "2026-10-10T07:00:00Z" },
      { entity_id: "climate.arrival", preparation: "arrival_only", state: "pending", start_at: "2026-10-10T06:00:00Z" },
    ],
  } }) as PlannedReturnStatus;
  it("returns eligible room estimates chronologically with deterministic ties", () => {
    const original = projected();
    const rows = plannedReturnPreparationEstimates({ ...original, preparation: { ...original.preparation!, zones: [...original.preparation!.zones, { ...original.preparation!.zones[1], entity_id: "climate.c" }] } });
    expect(rows.map((row) => row.entity_id)).toEqual(["climate.b", "climate.c", "climate.a"]);
    expect(rows[0].start).toBe(plannedReturnPreparationMarker(original, departure, arrival)?.start);
    expect(plannedReturnPreparationEstimates({ ...original, return_at: "2026-10-10T12:00:00" })).toEqual([]);
  });
  it("selects the earliest actionable adaptive zone without runtime-zone fallback", () => {
    expect(plannedReturnPreparationMarker(projected(), departure, arrival)).toEqual({ start: Date.parse("2026-10-10T09:00:00Z"), progress: .25 });
    expect(plannedReturnPreparationMarker({ ...projected(), preparation: undefined, zones: [{ entity_id: "climate.a", start_at: "2026-10-10T09:00:00Z", preparing: true, target_when: status.return_at! }] }, departure, arrival)).toBeUndefined();
  });
  it("rejects stale, configuration and naive preview arrivals", () => {
    const original = projected();
    for (const preparation of [{ ...original.preparation!, context: "configuration" as const }, { ...original.preparation!, return_at: "2026-10-10T13:00:00Z" }, { ...original.preparation!, return_at: "2026-10-10T12:00:00" }])
      expect(plannedReturnPreparationMarker({ ...original, preparation }, departure, arrival)).toBeUndefined();
    expect(plannedReturnPreparationMarker({ ...original, preparation: { ...original.preparation!, return_at: "2026-10-10T14:00:00+02:00" } }, departure, arrival)?.progress).toBe(.25);
  });
  it("clamps earlier estimates without rewriting the actual timestamp", () => {
    const original = projected(); const start_at = "2026-10-09T22:00:00Z";
    expect(plannedReturnPreparationMarker({ ...original, preparation: { ...original.preparation!, zones: [{ ...original.preparation!.zones[0], start_at }] } }, departure, arrival)).toEqual({ start: Date.parse(start_at), progress: 0 });
  });
  it("excludes invalid, naive, reached, unavailable and arrival-or-later estimates", () => {
    const original = projected();
    for (const [state, start_at] of [["reached", "2026-10-10T09:00:00Z"], ["unavailable", "2026-10-10T09:00:00Z"], ["pending", "bad"], ["pending", "2026-10-10T09:00:00"], ["pending", "2026-10-10T12:00:00Z"], ["pending", "2026-10-10T13:00:00Z"]] as const)
      expect(plannedReturnPreparationMarker({ ...original, preparation: { ...original.preparation!, zones: [{ ...original.preparation!.zones[0], state, start_at }] } }, departure, arrival)).toBeUndefined();
  });
});

describe("preparation summary without an actionable estimate", () => {
  const preview = (preparation: "adaptive" | "arrival_only" | "none", state: "pending" | "reached" | "suspended" = "pending") => ({ ...status, preparation: { context: "arrival", return_at: status.return_at, zones: [{ entity_id: "climate.a", preparation, state, start_at: null }] } }) as PlannedReturnStatus;
  it("distinguishes uniform arrival-only, excluded, reached and suspended rooms", () => {
    expect(plannedReturnPreparationSummary(preview("arrival_only"))).toBe("arrival_only");
    expect(plannedReturnPreparationSummary(preview("none"))).toBe("none");
    expect(plannedReturnPreparationSummary(preview("adaptive", "reached"))).toBe("reached");
    expect(plannedReturnPreparationSummary(preview("adaptive", "suspended"))).toBe("suspended");
    expect(plannedReturnPreparationSummary(preview("arrival_only", "suspended"))).toBe("suspended");
  });
  it("does not turn missing, stale or mixed estimates into no preparation", () => {
    expect(plannedReturnPreparationSummary(status)).toBe("unknown");
    const original = preview("adaptive");
    expect(plannedReturnPreparationSummary(original)).toBe("unknown");
    for (const return_at of ["2026-10-25T05:00:00Z", "2026-10-25T04:00:00", "invalid"])
      expect(plannedReturnPreparationSummary({ ...original, preparation: { ...original.preparation!, return_at } })).toBe("unknown");
    expect(plannedReturnPreparationSummary({ ...original, preparation: { ...original.preparation!, zones: [...original.preparation!.zones, ...preview("arrival_only").preparation!.zones] } })).toBe("unknown");
    expect(plannedReturnPreparationSummary({ ...preview("none"), preparation: { ...preview("none").preparation!, return_at: "2026-10-25T06:00:00+02:00" } })).toBe("none");
  });
});
