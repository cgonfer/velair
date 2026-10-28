// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { VelairCardEditor } from "../../src/velair/views/card-editor";
import { LOVELACE_CARD_VIEWS } from "../../src/velair/constants";

customElements.define("test-supply-live-card-editor", VelairCardEditor);
afterEach(() => document.body.replaceChildren());

async function editor(config: Record<string, unknown> = {}, supplies: { id: string; name: string }[] = [
  { id: "supply.heat", name: "Downstairs heating" },
  { id: "supply.cool", name: "Upstairs cooling" },
]) {
  const element = document.createElement("test-supply-live-card-editor") as any;
  const sendMessagePromise = vi.fn().mockResolvedValue({ configured_entities: [], settings: { shared_demand_groups: supplies } });
  element.setConfig({ view: "supply-live", ...config });
  element.hass = { connection: { sendMessagePromise } };
  document.body.append(element);
  await element.updateComplete;
  await Promise.resolve();
  await element.updateComplete;
  return { element, root: element.shadowRoot as ShadowRoot, sendMessagePromise };
}

describe("Supply live card editor", () => {
  it("registers the view and loads named supplies without automatically selecting one", async () => {
    expect(LOVELACE_CARD_VIEWS).toContain("supply-live");
    const { element, root, sendMessagePromise } = await editor();
    expect(sendMessagePromise).toHaveBeenCalledWith({ type: "velair/get_schedule" });
    const select = root.querySelector<HTMLSelectElement>(".supply-live-selector")!;
    expect([...select.options].map(option => [option.value, option.textContent?.trim()])).toEqual([
      ["", expect.any(String)], ["supply.heat", "Downstairs heating"], ["supply.cool", "Upstairs cooling"],
    ]);
    expect(select.value).toBe("");
    expect(element._config.supply_id).toBeUndefined();
    expect(root.querySelector(".zone-order")).toBeNull();
  });

  it("stores stable supply IDs and preserves a selected supply across renaming", async () => {
    const { element, root } = await editor({ title: "My supply" });
    const configs: any[] = [];
    element.addEventListener("config-changed", (event: CustomEvent) => configs.push(event.detail.config));
    const select = root.querySelector<HTMLSelectElement>(".supply-live-selector")!;
    select.value = "supply.cool";
    select.dispatchEvent(new Event("change"));
    expect(configs.at(-1)).toMatchObject({ supply_id: "supply.cool", title: "My supply" });
    element._scheduleData.settings.shared_demand_groups[1].name = "Renamed cooling";
    element.requestUpdate();
    await element.updateComplete;
    expect(select.value).toBe("supply.cool");
    expect(select.selectedOptions[0].textContent).toBe("Renamed cooling");
    select.value = "";
    select.dispatchEvent(new Event("change"));
    expect(configs.at(-1).supply_id).toBeUndefined();
  });

  it("retains an unavailable selected ID until the user explicitly chooses a replacement", async () => {
    const { element, root } = await editor({ supply_id: "supply.deleted" });
    const select = root.querySelector<HTMLSelectElement>(".supply-live-selector")!;
    expect(select.value).toBe("supply.deleted");
    expect(root.querySelector(".supply-live-unavailable")).not.toBeNull();
    expect(element._config.supply_id).toBe("supply.deleted");
  });

  it("shows setup guidance when no supplies exist", async () => {
    const { root } = await editor({}, []);
    expect(root.querySelector(".supply-live-empty")?.textContent?.trim()).toBeTruthy();
    expect(root.querySelector<HTMLSelectElement>(".supply-live-selector")!.value).toBe("");
  });

  it.each([
    "supply_show_header", "supply_show_connection", "supply_show_switch_state",
    "supply_show_room_count", "supply_show_legend", "supply_show_demand_description",
  ])("defaults %s on and persists only an explicit override independently", async field => {
    const { element, root } = await editor({ supply_id: "supply.heat" });
    const checkbox = root.querySelector<HTMLInputElement>(`input[data-option="${field}"]`)!;
    expect(checkbox.checked).toBe(true);
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change"));
    expect(element._config[field]).toBe(false);
    expect(element._config.supply_id).toBe("supply.heat");
    expect(Object.keys(element._config).filter(key => key.startsWith("supply_show_"))).toEqual([field]);
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    expect(element._config[field]).toBeUndefined();
  });
});
