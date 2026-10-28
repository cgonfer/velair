// @vitest-environment jsdom
import { html, render } from "lit";
import { describe, expect, it, vi } from "vitest";
import { renderCardContent } from "../../src/velair/views/card-content";
import { renderOverviewTimelines, renderOverviewZones } from "../../src/velair/views/overview-view";
import type { VelairViewHost } from "../../src/velair/host-types";

vi.mock("../../src/velair/views/overview-view", () => ({
  renderOverviewSummary: vi.fn(() => html``),
  renderOverviewActiveBoosts: vi.fn(() => html``),
  renderNextEvents: vi.fn(() => html``),
  renderOverviewTimelines: vi.fn(() => html``),
  renderOverviewZones: vi.fn(() => html``),
}));

describe("physical overview card filters", () => {
  it.each(["overview", "overview-zones", "overview-timeline"])("preserves member and group selections in %s", view => {
    for (const [selection, expected] of [
      [["climate.a"], ["climate.a"]],
      [["group.room"], ["climate.b", "climate.a"]],
      [undefined, ["climate.b", "climate.a", "climate.single"]],
    ] as const) {
      vi.clearAllMocks();
      const host = {
        _config: { entities: selection }, _hasExternalConfig: true,
        _data: {
          configured_entities: ["climate.a", "climate.single", "climate.b"],
          control_units: ["group.room", "climate.single"],
          room_groups: { "group.room": { members: ["climate.b", "climate.a"] } },
          member_to_unit: { "climate.a": "group.room", "climate.b": "group.room" },
          zones: {}, temperature_migration: { required: false },
        },
        _effectiveView: () => view, _noticeStackEntries: () => [],
        _orderedZoneIds: (ids: string[]) => ids,
        _visibleZoneIds: () => ["group.room", "climate.single"],
      } as unknown as VelairViewHost;
      render(renderCardContent(host), document.createElement("div"));
      if (view !== "overview-zones") expect(renderOverviewTimelines).toHaveBeenCalledWith(host, expected);
      if (view !== "overview-timeline") expect(renderOverviewZones).toHaveBeenCalledWith(host, expected);
    }
  });
});
