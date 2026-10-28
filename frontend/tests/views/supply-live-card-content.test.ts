// @vitest-environment jsdom
import { render } from "lit";
import { afterEach, describe, expect, it } from "vitest";
import { renderCardContent } from "../../src/velair/views/card-content";
import type { VelairSharedDemandLive } from "../../src/velair/components/shared-demand-live-element";
import type { VelairViewHost } from "../../src/velair/host-types";

afterEach(() => document.body.replaceChildren());
function setup(supplyId?: string, supplies: unknown[] = [{ id: "one", name: "Heating", zones: {} }, { id: "two", name: "Cooling", zones: {} }]) {
  const host = {
    _config: { view: "supply-live", supply_id: supplyId, title: "My supply", supply_show_header: false, supply_show_connection: false, supply_show_switch_state: true, supply_show_room_count: false, supply_show_legend: false, supply_show_demand_description: true },
    _data: { configured_entities: [], zones: {}, settings: { shared_demand_groups: supplies }, temperature_migration: { required: false }, temperature_unit: "°F" },
    _effectiveView: () => "supply-live", _orderedZoneIds: (ids: string[]) => ids, _visibleZoneIds: (ids: string[]) => ids,
    _noticeStackEntries: () => [], _t: (key: string) => key, _hasExternalConfig: true,
  } as unknown as VelairViewHost;
  const container = document.createElement("div");
  render(renderCardContent(host), container);
  return { host, container };
}
describe("supply live card content", () => {
  it("resolves only the selected supply and passes independent options with the stored unit", () => {
    const { container } = setup("two");
    const monitor = container.querySelector("velair-shared-demand-live") as VelairSharedDemandLive;
    expect(monitor.supply?.id).toBe("two"); expect(monitor.embedded).toBe(true);
    expect(monitor.supplyTemperatureUnit).toBe("°F"); expect(monitor.heading).toBe("My supply");
    expect(monitor.visibility).toEqual({ header: false, connection: false, switchState: true, roomCount: false, legend: false, demandDescription: true });
  });
  it.each([[undefined, "supplyLiveCardChooseSupply"], ["deleted", "supplyLiveCardSupplyUnavailable"]])("requires explicit selection for %s rather than selecting the first supply", (id, key) => {
    const { container } = setup(id);
    expect(container.querySelector("velair-shared-demand-live")).toBeNull();
    expect(container.querySelector('[role="status"]')?.textContent).toBe(key);
  });
  it("explains setup when there are no supplies", () => {
    const { container } = setup(undefined, []);
    expect(container.textContent).toContain("supplyLiveCardNoSupplies");
  });
});
