// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../src/velair/components/shared-demand-settings-element";
import type { SharedSupplyLibraryDraft, VelairSharedDemandSettings } from "../../src/velair/components/shared-demand-settings-element";
import type { VelairViewHost } from "../../src/velair/host-types";
import type { ScheduleResponse, SharedSupply } from "../../src/velair/types";
import { cardStyles } from "../../src/velair/styles/card-styles";
import { profileStyles } from "../../src/velair/styles/profile-styles";
import { en } from "../../src/velair/translations/en";

/** HA switches are custom elements: a disabled fieldset alone cannot disable them. */
class TestHaSwitch extends HTMLElement {
  checked = false;
  get disabled() { return this.hasAttribute("disabled"); }
  set disabled(value: boolean) { this.toggleAttribute("disabled", value); }
  click() {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  }
}
if (!customElements.get("ha-switch")) customElements.define("ha-switch", TestHaSwitch);

const supply = (): SharedSupply => ({
  id: "boiler", name: "Boiler", enabled: false, switch_entity_id: "switch.boiler", direction: "heat",
  hysteresis: 0.3, minimum_off_seconds: 0, off_delay_seconds: 0,
  zones: { "climate.room": {}, "climate.office": { hysteresis: 0.5 } }, suspended: false,
});

async function setup(supplies: SharedSupply[] = [supply()], unit = "°C") {
  const data = {
    configured_entities: ["climate.room", "climate.office"], settings: { shared_demand_groups: supplies },
    configuration_revision: 3, temperature_unit: unit, shared_demand_status: {},
  } as unknown as ScheduleResponse;
  const send = vi.fn().mockResolvedValue(data);
  const apply = vi.fn();
  const element = document.createElement("velair-shared-demand-settings") as VelairSharedDemandSettings;
  element.host = {
    _t: (key: string, values?: Record<string, unknown>) => values?.state ? `${key}: ${values.state}` : key, _friendlyEntityName: (id: string) => id,
    _applyScheduleData: apply, hass: {
      connection: { sendMessagePromise: send },
      states: { "switch.boiler": { state: "off" }, "switch.cooler": { state: "on" }, "switch.velair_automatic_scheduling": { state: "on" }, "switch.renamed_scheduler": { state: "on" } },
      entities: { "switch.renamed_scheduler": { platform: "velair" } },
    },
  } as unknown as VelairViewHost;
  element.data = data;
  document.body.append(element);
  await element.updateComplete;
  return { element, data, send, apply };
}

/** Closing the editor without carrying its draft matches confirmed panel navigation. */
async function reopen(element: VelairSharedDemandSettings) {
  const reopened = document.createElement("velair-shared-demand-settings") as VelairSharedDemandSettings;
  reopened.host = element.host;
  reopened.data = element.data;
  element.remove();
  document.body.append(reopened);
  await reopened.updateComplete;
  return reopened;
}

async function input(element: VelairSharedDemandSettings, selector: string, value: string, event = "input") {
  await reveal(element, selector);
  const control = element.shadowRoot!.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
  control.value = value;
  control.dispatchEvent(new Event(event, { bubbles: true }));
  await element.updateComplete;
}

async function reveal(element: VelairSharedDemandSettings, selector: string) {
  let details = element.shadowRoot!.querySelector(selector)?.closest("details");
  while (details) {
    if (!details.open) details.querySelector("summary")!.click();
    details = details.parentElement?.closest("details") ?? null;
  }
  await element.updateComplete;
}

async function click(element: VelairSharedDemandSettings, action: string) {
  const buttons = [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(`[data-action="${action}"]`)];
  const selectedId = element.shadowRoot!.querySelector<HTMLElement>("[data-supply-id]")?.dataset.supplyId;
  const button = action === "remove" ? buttons.find(candidate => candidate.dataset.removeSupply === selectedId) : buttons[0];
  button!.click();
  await element.updateComplete;
  await Promise.resolve();
  await element.updateComplete;
}

async function select(element: VelairSharedDemandSettings, id: string) {
  [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>("[data-select-supply]")].find(button => button.dataset.selectSupply === id)!.click();
  await element.updateComplete;
}

afterEach(() => document.body.replaceChildren());

describe("shared demand settings", () => {
  it("creates a focused draft from the clean library empty state without saving anything", async () => {
    const { element, send } = await setup([]);
    expect(element.shadowRoot!.querySelector(".template-library > .template-placeholder.compact.shared-demand-empty-state")).not.toBeNull();
    expect(element.shadowRoot!.querySelector(".template-library-layout")).toBeNull();
    expect(element.shadowRoot!.querySelector(".template-list-wrap")).toBeNull();
    expect(element.shadowRoot!.querySelector(".template-detail")).toBeNull();
    expect(element.shadowRoot!.querySelector('[data-field="name"]')).toBeNull();
    expect(element.shadowRoot!.querySelector('[data-action="save"]')).toBeNull();
    const add = element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="add"]')!;
    expect(add.getAttribute("aria-label")).toBe("sharedDemandAdd");
    expect(add.title).toBe("sharedDemandAdd");
    await click(element, "add");
    const name = element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!;
    expect(element.shadowRoot!.activeElement).toBe(name);
    expect(name.value).toBe("");
    expect(element.shadowRoot!.querySelector<HTMLDetailsElement>('[data-section="rooms"]')!.open).toBe(true);
    expect(element.hasUnsavedChanges).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it("shows precise name errors beside Save, focuses the input and clears the resolved issue", async () => {
    const { element, send } = await setup();
    await input(element, '[data-field="name"]', "");
    await click(element, "save");
    const name = element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!;
    const banner = element.shadowRoot!.querySelector('[data-save-error]')!;
    expect(banner.closest(".template-detail-heading")).not.toBeNull();
    expect(banner.getAttribute("role")).toBe("alert");
    expect(banner.textContent).toContain("sharedDemandNameRequired");
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(element.shadowRoot!.getElementById(name.getAttribute("aria-describedby")!)!.textContent).toBe("sharedDemandNameRequired");
    expect(element.shadowRoot!.activeElement).toBe(name);
    expect(send).not.toHaveBeenCalled();
    await input(element, '[data-field="name"]', "Corrected");
    expect(name.getAttribute("aria-invalid")).toBe("false");
    expect(element.shadowRoot!.querySelector('[data-save-error]')).toBeNull();
  });

  it("selects an unselected invalid supply, opens rooms and focuses the thermostat selector", async () => {
    const { element, send } = await setup([supply(), { ...supply(), id: "second", name: "Second", switch_entity_id: "switch.cooler", zones: {} }]);
    await input(element, '[data-field="name"]', "Changed");
    await click(element, "save");
    expect(element.shadowRoot!.querySelector('[data-supply-id="second"]')).not.toBeNull();
    expect(element.shadowRoot!.querySelector<HTMLDetailsElement>('[data-section="rooms"]')!.open).toBe(true);
    expect(element.shadowRoot!.activeElement?.getAttribute("data-field")).toBe("zone");
    expect(element.shadowRoot!.querySelector('[data-save-error]')!.textContent).toContain("Second");
    expect(element.shadowRoot!.querySelector('[data-save-error]')!.textContent).toContain("sharedDemandZonesRequired");
    expect(send).not.toHaveBeenCalled();
    await input(element, '[data-field="name"]', "Still no rooms");
    expect(element.shadowRoot!.querySelector('[data-save-error]')).not.toBeNull();
  });

  it("names the supply that already uses a duplicate switch", async () => {
    const { element, send } = await setup([supply(), { ...supply(), id: "second", name: "Second" }]);
    element.host!._t = ((key: keyof typeof en, values?: Record<string, unknown>) => (en[key] as string).replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? ""))) as VelairViewHost["_t"];
    await input(element, '[data-field="name"]', "First supply");
    await click(element, "save");
    expect(element.shadowRoot!.querySelector('[data-save-error]')!.textContent).toContain("already used by First supply");
    expect(element.shadowRoot!.activeElement?.getAttribute("data-field")).toBe("switch");
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", { switch_entity_id: "" }, "switch", "sharedDemandSwitchRequired"],
    ["invalid", { switch_entity_id: "switch.velair_automatic_scheduling", enabled: true }, "switch", "sharedDemandSwitchInvalid"],
    ["direction", { direction: "invalid" }, "direction", "sharedDemandDirectionInvalid"],
    ["mode", { hysteresis_mode: "invalid" }, "hysteresis-mode", "sharedDemandModeInvalid"],
    ["unmanaged", { zones: { "climate.unmanaged": {} } }, "zone", "sharedDemandZoneUnmanaged"],
    ["long name", { name: "x".repeat(101) }, "name", "sharedDemandNameTooLong"],
  ])("identifies the %s local configuration error without calling the backend", async (_, patch, field, cause) => {
    const { element, send } = await setup([{ ...supply(), ...patch } as SharedSupply]);
    await input(element, '[data-field="minimum-off"]', "1");
    await click(element, "save");
    expect(element.shadowRoot!.querySelector('[data-save-error]')!.textContent).toContain(cause);
    expect(element.shadowRoot!.activeElement?.getAttribute("data-field")).toBe(field);
    expect(element.shadowRoot!.activeElement?.getAttribute("aria-invalid")).toBe("true");
    expect(send).not.toHaveBeenCalled();
  });

  it("keeps a backend message verbatim by Save without attributing it to a field", async () => {
    const { element, send } = await setup();
    send.mockRejectedValueOnce({ message: "Specific backend failure: storage unavailable" });
    await input(element, '[data-field="name"]', "Edited");
    await click(element, "save");
    const banners = element.shadowRoot!.querySelectorAll('[data-save-error]');
    expect(banners).toHaveLength(1);
    expect(banners[0].closest(".template-detail-heading")).not.toBeNull();
    expect(banners[0].textContent?.trim()).toBe("Specific backend failure: storage unavailable");
    expect(element.shadowRoot!.querySelector('[aria-invalid="true"]')).toBeNull();
    expect(element.shadowRoot!.querySelector('[data-action="correct-error"]')).toBeNull();
  });

  it("restores local validation beside Save after the editor remounts and disables review while busy", async () => {
    const { element } = await setup();
    let draft: SharedSupplyLibraryDraft | undefined;
    element.addEventListener("velair-dirty-changed", event => { draft = (event as CustomEvent).detail.draft; });
    await input(element, '[data-field="name"]', "");
    await click(element, "save");
    expect(draft?.validationAttempted).toBe(true);
    const restored = document.createElement("velair-shared-demand-settings") as VelairSharedDemandSettings;
    restored.host = element.host; restored.data = element.data; restored.draft = draft;
    element.remove(); document.body.append(restored); await restored.updateComplete;
    expect(restored.shadowRoot!.querySelector('[data-save-error]')!.textContent).toContain("sharedDemandNameRequired");
    expect(restored.shadowRoot!.querySelector('[data-field="name"]')!.getAttribute("aria-invalid")).toBe("true");
    restored.settingsSaving = true; await restored.updateComplete;
    expect(restored.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="correct-error"]')!.disabled).toBe(true);
  });

  it("focuses the rooms section when no thermostat checkbox is available", async () => {
    const { element, send } = await setup([{ ...supply(), zones: {} }]);
    element.data = { ...element.data!, configured_entities: [] }; await element.updateComplete;
    await input(element, '[data-field="name"]', "No thermostats");
    await click(element, "save");
    const rooms = element.shadowRoot!.querySelector<HTMLDetailsElement>('[data-section="rooms"]')!;
    expect(rooms.open).toBe(true);
    expect(element.shadowRoot!.activeElement).toBe(rooms.querySelector("summary"));
    expect(send).not.toHaveBeenCalled();
  });

  it("names the symmetric distance and thermostat when an override is invalid", async () => {
    const { element } = await setup([{ ...supply(), hysteresis_mode: "symmetric" }]);
    element.host!._friendlyEntityName = (id: string) => id === "climate.office" ? "Office" : id;
    await input(element, '[data-zone-id="climate.office"] [data-field="override"]', "-0.2");
    const banner = element.shadowRoot!.querySelector('[data-save-error]')!;
    expect(banner.textContent).toContain("Boiler — Office (climate.office) — sharedDemandSymmetricDistance");
    expect(banner.textContent).not.toContain("sharedDemandStartDistance");
  });

  it.each([false, true])("directs correction of a hidden stop value to Custom behaviour (thermostat override: %s)", async thermostat => {
    const configured = { ...supply(), hysteresis_mode: "at_target" as const,
      ...(thermostat ? { zones: { "climate.room": {}, "climate.office": { hysteresis_stop: -0.2 } } } : { hysteresis_stop: -0.2 }) };
    const { element } = await setup([configured]);
    const banner = element.shadowRoot!.querySelector('[data-save-error]')!;
    expect(banner.textContent).toContain("sharedDemandHiddenStopInvalid");
    expect(banner.textContent).not.toContain("sharedDemandHysteresisInvalid");
    if (thermostat) expect(banner.textContent).toContain("climate.office");
    await click(element, "correct-error");
    expect(element.shadowRoot!.activeElement?.getAttribute("data-field")).toBe("hysteresis-mode");
    expect(element.shadowRoot!.querySelector<HTMLDetailsElement>('[data-section="demand"]')!.open).toBe(true);
  });

  it("shows pending library edits only in the detail header, including when selecting an unchanged supply", async () => {
    const { element } = await setup([supply(), { ...supply(), id: "cooler", name: "Cooler", switch_entity_id: "switch.cooler" }]);
    expect(element.shadowRoot!.querySelector('.shared-demand-identity .pill.warning')).toBeNull();
    await input(element, '[data-field="name"]', "Edited boiler");
    await select(element, "cooler");
    expect(element.shadowRoot!.querySelector('.shared-demand-identity .pill.warning')!.textContent).toBe("unsaved");
    expect(element.shadowRoot!.querySelectorAll('.shared-demand-list .pill.warning')).toHaveLength(0);
    await select(element, "boiler");
    await input(element, '[data-field="name"]', "Boiler");
    expect(element.shadowRoot!.querySelector('.shared-demand-identity .pill.warning')).toBeNull();
  });

  it("keeps configuration as a draft and saves supply defaults plus thermostat exceptions explicitly", async () => {
    const { element, send, apply } = await setup();
    expect(element.shadowRoot!.querySelectorAll<HTMLSelectElement>('[data-field="inherit"]')[0].value).toBe("inherit");
    expect(element.shadowRoot!.querySelectorAll<HTMLSelectElement>('[data-field="inherit"]')[1].value).toBe("custom");
    await input(element, '[data-field="hysteresis"]', "0.4");
    const enabled = element.shadowRoot!.querySelector<TestHaSwitch>('[data-field="enabled"]')!;
    enabled.checked = true; enabled.dispatchEvent(new Event("change", { bubbles: true }));
    await element.updateComplete;
    expect(send).not.toHaveBeenCalled();
    expect(element.data!.settings.shared_demand_groups![0].enabled).toBe(false);
    await click(element, "save");
    expect(send).toHaveBeenCalledWith({ type: "velair/update_shared_demand", expected_revision: 3, groups: [
      expect.objectContaining({ enabled: true, hysteresis: 0.4, zones: { "climate.room": {}, "climate.office": { hysteresis: 0.5 } } }),
    ] });
    expect(apply).toHaveBeenCalledOnce();
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled).toBe(true);
  });

  it("removes an override without copying the current default into inherited zones", async () => {
    const { element, send } = await setup();
    await input(element, '[data-zone-id="climate.office"] [data-field="inherit"]', "inherit", "change");
    await input(element, '[data-field="hysteresis"]', "0");
    await click(element, "save");
    expect(send.mock.calls[0][0].groups[0]).toMatchObject({ hysteresis: 0, zones: { "climate.room": {}, "climate.office": {} } });
  });

  it("preserves edited drafts on backend failure and reloads saved settings when reopened", async () => {
    const { element, send } = await setup();
    send.mockRejectedValueOnce(new Error("Backend refused output"));
    await input(element, '[data-field="name"]', "Changed boiler");
    await click(element, "save");
    expect(element.shadowRoot!.textContent).toContain("Backend refused output");
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe("Changed boiler");
    expect(element.shadowRoot!.querySelector('[data-action="save"]')).not.toBeNull();
    const reopened = await reopen(element);
    expect(reopened.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe("Boiler");
    expect(reopened.hasUnsavedChanges).toBe(false);
  });

  it("rejects stale drafts instead of overwriting a configuration changed elsewhere", async () => {
    const { element, send, data } = await setup();
    await input(element, '[data-field="name"]', "My boiler");
    element.data = { ...data, configuration_revision: 4 };
    await element.updateComplete;
    await click(element, "save");
    expect(send).not.toHaveBeenCalled();
    expect(element.shadowRoot!.textContent).toContain("sharedDemandStale");
    expect(element.shadowRoot!.querySelector('[data-save-error]')!.closest(".template-detail-heading")).not.toBeNull();
  });

  it.each([
    [{ code: "invalid_shared_demand", message: "Select an existing supply switch" }, "Select an existing supply switch"],
    ["Connection closed", "Connection closed"],
    [{ code: "unknown_error" }, "sharedDemandSaveFailed"],
  ])("shows the backend save error %j and preserves the draft", async (error, message) => {
    const { element, send, apply } = await setup();
    send.mockRejectedValueOnce(error);
    await input(element, '[data-field="name"]', "Changed boiler");
    await click(element, "save");
    expect(element.shadowRoot!.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe("Changed boiler");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });

  it.each([
    [{ code: "invalid_shared_demand", message: "Unknown shared demand group" }, "Unknown shared demand group"],
    ["Connection closed", "Connection closed"],
    [{ code: "unknown_error" }, "sharedDemandResumeFailed"],
  ])("shows the backend resume error %j and permits retry", async (error, message) => {
    const { element, send, apply } = await setup([{ ...supply(), enabled: true, suspended: true }]);
    send.mockRejectedValueOnce(error);
    await click(element, "resume");
    expect(element.shadowRoot!.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(element.shadowRoot!.querySelector('[data-save-error]')!.closest(".template-detail-heading")).not.toBeNull();
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="resume"]')!.disabled).toBe(false);
    expect(element.data!.settings.shared_demand_groups![0].suspended).toBe(true);
    expect(apply).not.toHaveBeenCalled();
  });

  it("rejects duplicate outputs and invalid numeric settings locally", async () => {
    const duplicate = { ...supply(), id: "second" };
    const { element, send } = await setup([supply(), duplicate]);
    await input(element, '[data-field="name"]', "First");
    await click(element, "save");
    expect(send).not.toHaveBeenCalled();
    expect(element.shadowRoot!.textContent).toContain("sharedDemandSwitchDuplicate");
    await select(element, "second");
    await input(element, '[data-supply-id="second"] [data-field="switch"]', "switch.cooler", "change");
    await input(element, '[data-field="minimum-off"]', "1.5");
    await click(element, "save");
    expect(send).not.toHaveBeenCalled();
    await input(element, '[data-field="minimum-off"]', "5");
    await input(element, '[data-field="hysteresis"]', "");
    await click(element, "save");
    expect(send).not.toHaveBeenCalled();
  });

  it.each(["minimum-off", "on-delay", "off-delay"])("validates %s immediately and accepts timing boundaries", async field => {
    const { element, send } = await setup();
    const selector = `[data-field="${field}"]`;
    const save = () => element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!;
    for (const value of ["-4", "1.5", "86401", ""]) {
      await input(element, selector, value);
      const control = element.shadowRoot!.querySelector<HTMLInputElement>(selector)!;
      expect(control.getAttribute("aria-invalid")).toBe("true");
      expect(control.classList.contains("invalid")).toBe(true);
      expect(element.shadowRoot!.getElementById(control.getAttribute("aria-describedby")!)!.textContent).toBe("sharedDemandSecondsInvalid");
      expect(save().disabled).toBe(true);
      expect(element.shadowRoot!.querySelector('[data-select-supply="boiler"] [data-numeric-invalid]')).not.toBeNull();
      await click(element, "save");
      expect(send).not.toHaveBeenCalled();
    }
    for (const value of ["86400", "0"]) {
      await input(element, selector, value);
      expect(element.shadowRoot!.querySelector(selector)!.getAttribute("aria-invalid")).toBe("false");
      expect(element.shadowRoot!.querySelector(selector)!.hasAttribute("aria-describedby")).toBe(false);
      expect(element.shadowRoot!.querySelector('[data-numeric-invalid]')).toBeNull();
    }
    await input(element, selector, "86400");
    expect(save().disabled).toBe(false);
    await click(element, "save");
    expect(send).toHaveBeenCalledOnce();
  });

  it.each([
    ["heat", "at_target", "≤ 21.5 °C", "≥ 22 °C"],
    ["heat", "symmetric", "≤ 21.5 °C", "≥ 22.5 °C"],
    ["heat", "custom", "≤ 21.5 °C", "≥ 22.2 °C"],
    ["cool", "at_target", "≥ 22.5 °C", "≤ 22 °C"],
    ["cool", "symmetric", "≥ 22.5 °C", "≤ 21.5 °C"],
    ["cool", "custom", "≥ 22.5 °C", "≤ 21.8 °C"],
  ] as const)("previews %s %s with ascending temperature and correct request thresholds", async (direction, mode, start, stop) => {
    const { element } = await setup([{ ...supply(), direction, hysteresis_mode: mode, hysteresis: 0.5, hysteresis_stop: 0.2 }]);
    const preview = element.shadowRoot!.querySelector('[data-hysteresis-preview]')!;
    expect(preview.querySelector('[data-preview-start] strong')!.textContent).toBe(start);
    expect(preview.querySelector('[data-preview-stop] strong')!.textContent).toBe(stop);
    expect(preview.querySelector('figcaption')!.textContent).toBe("sharedDemandPreviewRetain");
    expect(preview.querySelector('.shared-demand-preview-axis-label')!.textContent).toBe("sharedDemandPreviewAxis");
    expect(preview.querySelector('svg')!.getAttribute('aria-hidden')).toBe("true");
    expect(preview.querySelector('.preview-hold')!.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(preview.querySelector('svg rect:first-child')!.getAttribute('class')).toBe(direction === "heat" ? "preview-demand" : "preview-off");
    expect(preview.querySelectorAll('[data-dimension]')).toHaveLength(mode === "at_target" ? 1 : 2);
    expect(preview.querySelector('[data-distance="start"]')!.textContent).toBe("0.5 °C");
    expect(preview.querySelector('[data-distance="start"]')!.getAttribute("aria-label")).toBe("sharedDemandStartDistance: 0.5 °C");
    expect(preview.querySelector('[data-distance="stop"]')?.textContent).toBe(mode === "at_target" ? undefined : `${mode === "symmetric" ? "0.5" : "0.2"} °C`);
  });

  it.each(["heat", "cool"] as const)("shows off precedence at coincident %s thresholds without a retention band", async direction => {
    const { element } = await setup([{ ...supply(), direction, hysteresis: 0 }]);
    const preview = element.shadowRoot!.querySelector('[data-hysteresis-preview]')!;
    expect(preview.querySelector('[data-preview-start] strong')!.textContent).toBe(`${direction === "heat" ? "<" : ">"} 22 °C`);
    expect(preview.querySelector('figcaption')!.textContent).toBe("sharedDemandPreviewCoincident");
    expect(preview.querySelector('.preview-hold')).toBeNull();
    expect(preview.querySelector('[data-dimension]')).toBeNull();
    expect(preview.querySelector('[data-distance]')).toBeNull();
  });

  it.each([
    ["heat", "at_target", 0.3, 0], ["heat", "at_target", 0.83, 0],
    ["cool", "at_target", 8, 0], ["heat", "symmetric", 5, 5],
    ["cool", "symmetric", 0.001, 0.001],
    ["heat", "custom", 5, 0.001], ["cool", "custom", 0.001, 5],
    ["heat", "custom", 0, 5], ["cool", "custom", 5, 0],
    ["heat", "at_target", 0, 0],
  ] as const)("keeps %s %s example labels aligned with straight leaders (%s, %s)", async (direction, mode, start, stop) => {
    const { element } = await setup([{ ...supply(), direction, hysteresis_mode: mode, hysteresis: start, hysteresis_stop: stop }]);
    const preview = element.shadowRoot!.querySelector('[data-hysteresis-preview]')!;
    const plot = preview.querySelector('.shared-demand-preview-plot')!;
    for (const selector of ['[data-preview-start]', '[data-preview-stop]', '[data-preview-target]']) {
      const label = plot.querySelector<HTMLElement>(selector)!;
      expect(label).not.toBeNull();
      const position = Number.parseFloat(label.style.left);
      expect(position).toBeGreaterThanOrEqual(25);
      expect(position).toBeLessThanOrEqual(75);
    }
    expect(plot.querySelectorAll('.preview-connector')).toHaveLength(2);
    expect(plot.querySelector('.preview-dimension-leader')).toBeNull();
    for (const connector of plot.querySelectorAll('.preview-connector')) {
      expect(connector.getAttribute('d')).not.toMatch(/[Ll]/);
    }
    const markerX = Number(plot.querySelector('.preview-target')!.getAttribute('x1'));
    const targetLabel = plot.querySelector<HTMLElement>('[data-preview-target]')!;
    expect(Number.parseFloat(targetLabel.style.left) * 3).toBeCloseTo(markerX);
    const [startX, stopX] = [...plot.querySelectorAll('.preview-connector')][1].getAttribute('d')!.match(/M ([\d.]+)/g)!.map(value => Number(value.slice(2)));
    if (start + stop > 0) {
      expect(Math.abs(markerX - startX) / Math.abs(stopX - startX)).toBeCloseTo(start / (start + stop));
    }
    for (const [selector, x] of [['[data-preview-start]', startX], ['[data-preview-stop]', stopX]] as const) {
      expect(Number.parseFloat(plot.querySelector<HTMLElement>(selector)!.style.left) * 3).toBeCloseTo(x);
    }
    expect(preview.querySelector('.shared-demand-preview-legend')).toBeNull();
    expect(preview.querySelector('.shared-demand-preview-readings')).toBeNull();
    expect(preview.querySelector('.shared-demand-preview-directions')).toBeNull();
    expect(preview.querySelector('.shared-demand-preview-title')!.textContent).toBe(direction === "heat" ? "sharedDemandPreviewHeating" : "sharedDemandPreviewCooling");
  });

  it("updates the preview live for offsets, mode, direction and Fahrenheit", async () => {
    const { element, send } = await setup();
    await input(element, '[data-field="hysteresis"]', "0.8");
    expect(element.shadowRoot!.querySelector('[data-preview-start] strong')!.textContent).toBe("≤ 21.2 °C");
    await input(element, '[data-field="hysteresis-mode"]', "symmetric", "change");
    await input(element, '[data-field="direction"]', "cool", "change");
    expect(element.shadowRoot!.querySelector('[data-preview-stop] strong')!.textContent).toBe("≤ 21.2 °C");
    element.data = { ...element.data!, temperature_unit: "°F" }; await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[data-preview-start] strong')!.textContent).toBe("≥ 72.8 °F");
    expect(element.shadowRoot!.querySelector('[data-preview-stop] strong')!.textContent).toBe("≤ 71.2 °F");
    expect(send).not.toHaveBeenCalled();
  });

  it("keeps small valid offsets distinct from the illustrative target", async () => {
    const { element } = await setup([{ ...supply(), hysteresis_mode: "symmetric", hysteresis: 0.001 }]);
    expect(element.shadowRoot!.querySelector('[data-preview-start] strong')!.textContent).toBe("≤ 21.999 °C");
    expect(element.shadowRoot!.querySelector('[data-preview-stop] strong')!.textContent).toBe("≥ 22.001 °C");
  });

  it("keeps a neutral preview without readings for invalid or unrepresentable bands and restores it after editing", async () => {
    const { element } = await setup();
    const placeholder = () => {
      const preview = element.shadowRoot!.querySelector('[data-hysteresis-preview]')!;
      expect(preview.hasAttribute('data-preview-placeholder')).toBe(true);
      expect(preview.getAttribute('aria-hidden')).toBe('true');
      expect(preview.querySelector('[data-preview-start] strong')!.textContent).toBe('—');
      expect(preview.querySelector('[data-preview-stop] strong')!.textContent).toBe('—');
      expect(preview.querySelector('[data-distance]')).toBeNull();
      expect(preview.querySelector('figcaption')!.textContent).toBe('');
      expect(preview.textContent).not.toMatch(/\d|NaN|Infinity/);
      expect(preview.querySelector('svg')!.outerHTML).not.toMatch(/NaN|Infinity/);
    };
    await input(element, '[data-field="hysteresis"]', "-1");
    placeholder();
    await input(element, '[data-field="hysteresis"]', "");
    placeholder();
    await input(element, '[data-field="hysteresis"]', "1e308");
    await input(element, '[data-field="hysteresis-mode"]', "symmetric", "change");
    placeholder();
    expect(element.shadowRoot!.textContent).not.toContain("NaN");
    expect(element.shadowRoot!.textContent).not.toContain("Infinity");
    await input(element, '[data-field="hysteresis"]', "0.3");
    expect(element.shadowRoot!.querySelector('[data-preview-placeholder]')).toBeNull();
    expect(element.shadowRoot!.querySelector('[data-preview-start] strong')!.textContent).toBe('≤ 21.7 °C');
    expect(element.shadowRoot!.querySelector('[data-hysteresis-preview]')!.hasAttribute('aria-hidden')).toBe(false);
  });

  it("keeps an opened disclosure and its input visible when the last error is corrected", async () => {
    const { element } = await setup();
    await input(element, '[data-field="off-delay"]', "-4");
    const details = element.shadowRoot!.querySelector<HTMLDetailsElement>('[data-section="timing"]')!;
    const control = details.querySelector<HTMLInputElement>('[data-field="off-delay"]')!;
    expect(details.open).toBe(true);
    control.focus();
    await input(element, '[data-field="off-delay"]', "5");
    expect(details.open).toBe(true);
    expect(element.shadowRoot!.activeElement).toBe(control);
    details.querySelector("summary")!.click();
    await input(element, '[data-field="name"]', "Updated name");
    expect(details.open).toBe(false);
  });

  it("blocks saves for an invalid unselected supply and reveals its field when selected", async () => {
    const { element, send } = await setup([supply(), { ...supply(), id: "second", switch_entity_id: "switch.cooler" }]);
    await input(element, '[data-field="off-delay"]', "-4");
    await select(element, "second");
    await input(element, '[data-field="name"]', "Valid second");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled).toBe(true);
    expect(element.shadowRoot!.querySelector('[data-select-supply="boiler"] [data-numeric-invalid]')).not.toBeNull();
    expect(element.shadowRoot!.querySelector('[data-select-supply="second"] [data-numeric-invalid]')).toBeNull();
    await click(element, "save"); expect(send).not.toHaveBeenCalled();
    await select(element, "boiler");
    expect(element.shadowRoot!.querySelector<HTMLDetailsElement>('[data-section="timing"]')!.open).toBe(true);
    await input(element, '[data-field="off-delay"]', "5");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled).toBe(false);
  });

  it("validates thermostat overrides immediately while empty values inherit", async () => {
    const { element } = await setup();
    const selector = '[data-zone-id="climate.office"] [data-field="override"]';
    await input(element, selector, "-0.5");
    expect(element.shadowRoot!.querySelector(selector)!.getAttribute("aria-invalid")).toBe("true");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled).toBe(true);
    expect(element.shadowRoot!.textContent).not.toContain("NaN");
    await input(element, selector, "");
    expect(element.shadowRoot!.querySelector<HTMLSelectElement>('[data-zone-id="climate.office"] [data-field="inherit"]')!.value).toBe("inherit");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled).toBe(false);
    await input(element, '[data-field="hysteresis"]', "");
    expect(element.shadowRoot!.querySelector('[data-field="hysteresis"]')!.getAttribute("aria-invalid")).toBe("true");
    expect(element.shadowRoot!.textContent).not.toContain("NaN");
  });

  it("does not interpret a native bad numeric input as an inherited thermostat value", async () => {
    const { element } = await setup();
    const selector = '[data-zone-id="climate.office"] [data-field="override"]';
    await reveal(element, selector);
    const control = element.shadowRoot!.querySelector<HTMLInputElement>(selector)!;
    // Native number controls expose empty value + badInput for partial text such as 1e.
    control.value = "";
    Object.defineProperty(control, "validity", { configurable: true, value: { badInput: true } });
    control.dispatchEvent(new Event("input", { bubbles: true }));
    await element.updateComplete;
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(element.shadowRoot!.querySelector<HTMLSelectElement>('[data-zone-id="climate.office"] [data-field="inherit"]')!.value).toBe("custom");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled).toBe(true);
    Object.defineProperty(control, "validity", { configurable: true, value: { badInput: false } });
    await input(element, selector, "0.4");
    expect(control.getAttribute("aria-invalid")).toBe("false");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled).toBe(false);
  });

  it("retains invalid hidden stop values until the user selects Custom and corrects them", async () => {
    const { element, send } = await setup([{ ...supply(), hysteresis_mode: "custom", hysteresis_stop: 0.2 }]);
    await input(element, '[data-field="hysteresis-stop"]', "-0.2");
    await input(element, '[data-field="hysteresis-mode"]', "symmetric", "change");
    expect(element.shadowRoot!.textContent).toContain("sharedDemandHiddenStopInvalid");
    expect(element.shadowRoot!.querySelector('[data-field="hysteresis-stop"]')).toBeNull();
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled).toBe(true);
    await input(element, '[data-field="hysteresis-mode"]', "custom", "change");
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="hysteresis-stop"]')!.value).toBe("-0.2");
    await input(element, '[data-field="hysteresis-stop"]', "0");
    await click(element, "save"); expect(send).toHaveBeenCalledOnce();
  });

  it("keeps thermostat stop errors recoverable when Custom fields are hidden", async () => {
    const { element } = await setup([{ ...supply(), hysteresis_mode: "custom" }]);
    const selector = '[data-zone-id="climate.office"] [data-field="override-stop"]';
    await input(element, '[data-field="name"]', "Updated boiler");
    await input(element, selector, "-1");
    await input(element, '[data-field="hysteresis-mode"]', "at_target", "change");
    expect(element.shadowRoot!.querySelector('[data-zone-id="climate.office"]')!.textContent).toContain("sharedDemandHiddenStopInvalid");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled).toBe(true);
    await input(element, '[data-field="hysteresis-mode"]', "custom", "change");
    await input(element, selector, "");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled).toBe(false);
  });

  it("rejects nonfinite offsets without adding an arbitrary cap to finite hysteresis", async () => {
    const { element } = await setup([{ ...supply(), hysteresis: Infinity }]);
    expect(element.shadowRoot!.querySelector('[data-field="hysteresis"]')!.getAttribute("aria-invalid")).toBe("true");
    expect(element.shadowRoot!.textContent).not.toContain("Infinity");
    await input(element, '[data-field="hysteresis"]', "100");
    expect(element.shadowRoot!.querySelector('[data-field="hysteresis"]')!.getAttribute("aria-invalid")).toBe("false");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled).toBe(false);
  });

  it("preserves nonfinite invalid drafts after remount without presenting NaN bands", async () => {
    const { element } = await setup();
    let draft: SharedSupplyLibraryDraft | undefined;
    element.addEventListener("velair-dirty-changed", event => { draft = (event as CustomEvent).detail.draft; });
    await input(element, '[data-field="hysteresis"]', "");
    const restored = document.createElement("velair-shared-demand-settings") as VelairSharedDemandSettings;
    restored.host = element.host; restored.data = element.data; restored.draft = draft;
    element.remove(); document.body.append(restored); await restored.updateComplete;
    expect(restored.shadowRoot!.querySelector('[data-field="hysteresis"]')!.getAttribute("aria-invalid")).toBe("true");
    expect(restored.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled).toBe(true);
    expect(restored.shadowRoot!.textContent).not.toContain("NaN");
  });

  it("shows Room Assist demand and suspended state, resuming only by explicit action", async () => {
    const { element, data, send } = await setup([{ ...supply(), enabled: true, suspended: true }]);
    element.data = { ...data, shared_demand_status: { boiler: {
      status: "suspended", suspended: true, suspension_reason: "external_off", demand: true, output_state: "off",
      zones: { "climate.room": { demand: true, source: "room_assist" } },
    } } } as ScheduleResponse;
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[data-select-supply="boiler"]')!.textContent).toContain("sharedDemandControlSuspended");
    expect(element.shadowRoot!.querySelector('[data-action="resume"]')!.parentElement!.textContent).toContain("sharedDemandExternalOffPaused");
    expect(element.shadowRoot!.querySelector('[data-section="rooms"]')!.textContent).not.toContain("sharedDemandRoomAssist");
    const demandBody = element.shadowRoot!.querySelector('[data-section="demand"] .external-controller-conditions-body')!;
    expect(demandBody.firstElementChild!.textContent).toBe("sharedDemandRoomAssist");
    expect(demandBody.firstElementChild!.querySelector('ha-icon')!.getAttribute('icon')).toBe('mdi:information-outline');
    expect(element.shadowRoot!.querySelector('[data-section="rooms"] .settings-policy-heading')).toBeNull();
    expect(element.shadowRoot!.textContent).not.toContain("sharedDemandValueInheritance");
    expect(element.shadowRoot!.textContent).toContain("targetRangeBlockerRoomAssist");
    expect(send).not.toHaveBeenCalled();
    await click(element, "resume");
    expect(send).toHaveBeenCalledWith({ type: "velair/resume_shared_demand", group_id: "boiler", expected_revision: 3 });
  });

  it("creates disabled opt-in supplies with a converted Fahrenheit difference", async () => {
    const { element, send } = await setup([], "°F");
    await click(element, "add");
    expect(element.shadowRoot!.querySelector<TestHaSwitch>('[data-field="enabled"]')!.checked).toBe(false);
    expect(Number(element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="hysteresis"]')!.value)).toBeCloseTo(0.54);
    expect(send).not.toHaveBeenCalled();
    await input(element, '[data-field="name"]', "Cooling supply");
    await input(element, '[data-field="switch"]', "switch.cooler", "change");
    await input(element, '[data-field="direction"]', "cool", "change");
    const zone = element.shadowRoot!.querySelector<HTMLInputElement>('[data-zone-id="climate.room"] [data-field="zone"]')!;
    zone.checked = true; zone.dispatchEvent(new Event("change", { bubbles: true })); await element.updateComplete;
    await click(element, "save");
    expect(send.mock.calls[0][0].groups[0]).toMatchObject({ enabled: false, direction: "cool", hysteresis: 0.54, zones: { "climate.room": {} } });
  });

  it("excludes Velair control switches and displays supply delivery failures", async () => {
    const { element, data } = await setup();
    const options = [...element.shadowRoot!.querySelectorAll('[data-field="switch"] option')].map(option => (option as HTMLOptionElement).value);
    expect(options).toEqual(["", "switch.boiler", "switch.cooler"]);
    element.data = { ...data, shared_demand_status: { boiler: { status: "delivery_failed", output_state: "off" } } } as ScheduleResponse;
    await element.updateComplete;
    expect(element.shadowRoot!.textContent).toContain("sharedDemandDeliveryFailed");
  });

  it("keeps failed cleanup visible after a supply is removed and shows invalid configuration", async () => {
    const { element, data } = await setup([]);
    element.data = { ...data, shared_demand_status: {
      "cleanup:switch.old_boiler": { status: "delivery_failed", switch_entity_id: "switch.old_boiler" },
      _configuration: { status: "invalid_output" },
    } } as ScheduleResponse;
    await element.updateComplete;
    expect(element.shadowRoot!.textContent).toContain("switch.old_boiler");
    expect(element.shadowRoot!.textContent).toContain("sharedDemandDeliveryFailed");
    expect(element.shadowRoot!.textContent).toContain("sharedDemandInvalidOutput");
  });

  it("allows disabling a stored supply whose switch has disappeared", async () => {
    const { element, send } = await setup([{ ...supply(), enabled: true }]);
    delete element.host!.hass!.states!["switch.boiler"];
    const enabled = element.shadowRoot!.querySelector<TestHaSwitch>('[data-field="enabled"]')!;
    enabled.checked = false; enabled.dispatchEvent(new Event("change", { bubbles: true }));
    await element.updateComplete;
    await click(element, "save");
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      groups: [expect.objectContaining({ enabled: false, switch_entity_id: "switch.boiler" })],
    }));
  });

  it.each([undefined, "imported" as const])("keeps %s suspension provenance generic beside Resume", async suspension_reason => {
    const { element, data } = await setup([{ ...supply(), enabled: true, suspended: true, suspension_reason }]);
    element.data = { ...data, shared_demand_status: { boiler: { status: "suspended", suspended: true, suspension_reason } } };
    await element.updateComplete;
    const message = element.shadowRoot!.querySelector('[data-action="resume"]')!.parentElement!.textContent!;
    expect(message).toContain("sharedDemandPaused");
    expect(message).not.toContain("sharedDemandExternalOffPaused");
  });
  it("shows a failed suspension save as suspended and retains explicit resume", async () => {
    const { element, data, send } = await setup([{ ...supply(), enabled: true, suspended: false }]);
    element.data = { ...data, shared_demand_status: { boiler: {
      status: "suspension_persistence_failed", suspended: true, output_state: "off",
    } } } as ScheduleResponse;
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[role="status"]')!.textContent).toContain("sharedDemandSuspensionSaveFailed");
    expect(element.shadowRoot!.querySelector('[data-select-supply="boiler"]')!.textContent).toContain("sharedDemandControlSuspended");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="resume"]')!.disabled).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("shows orphan cleanup persistence failures without exposing an internal identifier", async () => {
    const { element, data } = await setup([]);
    element.data = { ...data, shared_demand_status: {
      "cleanup:persistence": { status: "cleanup_persistence_failed" },
    } } as ScheduleResponse;
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[role="status"]')!.textContent?.trim()).toBe("sharedDemandCleanupSaveFailed");
    expect(element.shadowRoot!.textContent).not.toContain("cleanup:persistence");
  });

  it("uses shared settings surfaces, form controls and action styles", async () => {
    const { element } = await setup();
    const shared = (element.constructor as typeof VelairSharedDemandSettings).styles;
    expect(shared[0]).toBe(cardStyles);
    expect(shared[1]).toBe(profileStyles);
    expect(element.shadowRoot!.querySelector(".shared-demand-section > .profile-intro > ha-icon")!.getAttribute("icon")).toBe("mdi:heat-pump-outline");
    expect(element.shadowRoot!.querySelectorAll("select").length).toBeGreaterThan(0);
    for (const select of element.shadowRoot!.querySelectorAll("select")) expect(select.parentElement!.classList.contains("select-wrap")).toBe(true);
    for (const button of element.shadowRoot!.querySelectorAll("button[data-action]")) {
      expect(button.classList.contains(["add", "remove", "save"].includes(button.dataset.action!) ? "icon-button" : "command-button")).toBe(true);
      expect(button.querySelector("ha-icon")).not.toBeNull();
    }
    const disclosure = element.shadowRoot!.querySelector<HTMLDetailsElement>('details[data-section="timing"]')!;
    expect(disclosure.open).toBe(false);
    expect(disclosure.querySelector('[data-field="minimum-off"]')).not.toBeNull();
    expect(disclosure.querySelector(".external-controller-expand-icon")).not.toBeNull();
  });

  it("labels and disables the HA enable switch when another settings save starts", async () => {
    const { element, send } = await setup([{ ...supply(), id: "imported supply" }]);
    const enabled = element.shadowRoot!.querySelector<TestHaSwitch>('ha-switch[data-field="enabled"]')!;
    expect(enabled.getAttribute("aria-label")).toBe("sharedDemandEnabled: Boiler");
    element.host!._settingsSaving = true;
    element.settingsSaving = true;
    await element.updateComplete;
    expect(enabled.disabled).toBe(true);
    enabled.click();
    expect(enabled.checked).toBe(false);
    // Even a change dispatched by an external custom component cannot edit a busy draft.
    enabled.checked = true; enabled.dispatchEvent(new Event("change", { bubbles: true }));
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled).toBe(true);
    expect(send).not.toHaveBeenCalled();
    element.host!._settingsSaving = false;
    element.settingsSaving = false;
    await element.updateComplete;
    expect(enabled.disabled).toBe(false);
    enabled.checked = false; enabled.click(); await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[data-action="save"]')).not.toBeNull();
  });

  it("disables the custom switch and native room controls throughout its own save", async () => {
    const { element, send, data } = await setup();
    let finish!: (value: ScheduleResponse) => void;
    send.mockImplementationOnce(() => new Promise<ScheduleResponse>(resolve => { finish = resolve; }));
    await input(element, '[data-field="name"]', "Saving boiler");
    await click(element, "save");
    expect(element.shadowRoot!.querySelector<TestHaSwitch>('[data-field="enabled"]')!.disabled).toBe(true);
    expect(element.shadowRoot!.querySelector('[data-field="zone"]')!.matches(":disabled")).toBe(true);
    expect(element.shadowRoot!.querySelector('[data-action="remove"]')!.matches(":disabled")).toBe(true);
    finish(data); await Promise.resolve(); await element.updateComplete;
    expect(element.shadowRoot!.querySelector<TestHaSwitch>('[data-field="enabled"]')!.disabled).toBe(false);
  });

  it("dismisses owned inline help when supplies are removed or the editor is closed", async () => {
    const { element } = await setup();
    await input(element, '[data-field="name"]', "Draft boiler");
    const help = element.shadowRoot!.querySelector<HTMLButtonElement>(".inline-help")!;
    help.click();
    expect(help.getAttribute("aria-expanded")).toBe("true");
    await click(element, "remove");
    expect(help.getAttribute("aria-expanded")).toBe("false");
    const reopened = await reopen(element);
    const reopenedHelp = reopened.shadowRoot!.querySelector<HTMLButtonElement>(".inline-help")!;
    reopenedHelp.click(); reopened.remove();
    expect(reopenedHelp.getAttribute("aria-expanded")).toBe("false");
  });

  it("selects persisted outputs and cooling on first render and when choices change", async () => {
    const { element, data } = await setup([{ ...supply(), direction: "cool", switch_entity_id: "switch.cooler" }]);
    const value = (field: string) => element.shadowRoot!.querySelector<HTMLSelectElement>(`[data-field="${field}"]`)!.value;
    expect(value("switch")).toBe("switch.cooler");
    expect(value("direction")).toBe("cool");
    element.data = { ...data, settings: { ...data.settings, shared_demand_groups: [{ ...supply(), switch_entity_id: "switch.new_supply" }] } };
    await element.updateComplete;
    expect(value("switch")).toBe("switch.new_supply");
    element.host!.hass!.states!["switch.new_supply"] = { state: "off" };
    element.requestUpdate(); await element.updateComplete;
    expect(value("switch")).toBe("switch.new_supply");
    expect(value("direction")).toBe("heat");
  });

  it("keeps existing supplies compact with deletion in the library and a Modes-style guide entry point", async () => {
    const { element } = await setup();
    const sections = [...element.shadowRoot!.querySelectorAll<HTMLDetailsElement>("[data-section]")];
    expect(sections.map(section => section.dataset.section)).toEqual(["timing", "demand", "rooms"]);
    expect(sections.every(section => !section.open)).toBe(true);
    expect(element.shadowRoot!.querySelector(".template-detail [data-action=remove]")).toBeNull();
    expect(element.shadowRoot!.querySelector(".template-item .resource-delete-control [data-action=remove]")).not.toBeNull();
    expect(element.shadowRoot!.querySelector(".profile-intro > .documentation-help .documentation-help-button")).not.toBeNull();
    expect(element.shadowRoot!.querySelector<HTMLSelectElement>('[data-field="hysteresis-mode"]')!.value).toBe("at_target");
    expect(element.shadowRoot!.querySelector('[data-field="hysteresis-stop"]')).toBeNull();
    for (const field of ["name", "switch", "direction"]) {
      expect(element.shadowRoot!.querySelectorAll(`[data-field="${field}"]`)).toHaveLength(1);
      expect(element.shadowRoot!.querySelector(`[data-field="${field}"]`)!.closest("details")).toBeNull();
    }
  });

  it("keeps primary fields accessible and focuses the new supply name without enabling it", async () => {
    const { element, send } = await setup([]);
    await click(element, "add");
    expect(element.shadowRoot!.querySelector('[data-section="supply"]')).toBeNull();
    expect(element.shadowRoot!.querySelector<HTMLDetailsElement>('[data-section="rooms"]')!.open).toBe(true);
    expect(element.shadowRoot!.querySelector<HTMLDetailsElement>('[data-section="demand"]')!.open).toBe(false);
    expect(element.shadowRoot!.activeElement).toBe(element.shadowRoot!.querySelector('[data-field="name"]'));
    expect(element.shadowRoot!.querySelector<TestHaSwitch>('[data-field="enabled"]')!.checked).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("keeps supply and room stop values when hysteresis modes hide their fields", async () => {
    const configured = { ...supply(), hysteresis_mode: "custom" as const, hysteresis: 0.4, hysteresis_stop: 0.2,
      zones: { "climate.room": {}, "climate.office": { hysteresis: 0.5, hysteresis_stop: 0.6 } } };
    const { element, send } = await setup([configured]);
    await input(element, '[data-field="hysteresis-mode"]', "at_target", "change");
    expect(element.shadowRoot!.querySelector('[data-field="hysteresis-stop"]')).toBeNull();
    await input(element, '[data-field="hysteresis-mode"]', "symmetric", "change");
    expect(element.shadowRoot!.querySelector('[data-field="override-stop"]')).toBeNull();
    expect(element.shadowRoot!.querySelectorAll('[data-field="hysteresis-mode"]')).toHaveLength(1);
    await input(element, '[data-field="hysteresis-mode"]', "custom", "change");
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="hysteresis-stop"]')!.value).toBe("0.2");
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="override-stop"]')!.value).toBe("0.6");
    await input(element, '[data-field="name"]', "Renamed boiler");
    await click(element, "save");
    expect(send.mock.calls[0][0].groups[0]).toMatchObject({ hysteresis_mode: "custom", hysteresis_stop: 0.2, zones: configured.zones });
  });

  it("inherits start and stop independently without copying the supply mode into rooms", async () => {
    const { element, send } = await setup([{ ...supply(), hysteresis_mode: "custom", hysteresis: 0.4, hysteresis_stop: 0.2,
      zones: { "climate.room": {}, "climate.office": { hysteresis_stop: 0.7 } } }]);
    const officeStart = '[data-zone-id="climate.office"] [data-field="override"]';
    expect(element.shadowRoot!.querySelector<HTMLInputElement>(officeStart)!.value).toBe("");
    expect(element.shadowRoot!.querySelector<HTMLInputElement>(officeStart)!.placeholder).toBe("0.4");
    await input(element, '[data-field="hysteresis"]', "0.5");
    expect(element.shadowRoot!.querySelector<HTMLInputElement>(officeStart)!.placeholder).toBe("0.5");
    await input(element, officeStart, "0.1");
    await input(element, '[data-zone-id="climate.office"] [data-field="override-stop"]', "");
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('[data-zone-id="climate.office"] [data-field="override-stop"]')!.placeholder).toBe("0.2");
    await click(element, "save");
    expect(send.mock.calls[0][0].groups[0].zones).toEqual({ "climate.room": {}, "climate.office": { hysteresis: 0.1 } });
  });

  it("allows a stop-only room exception and uses zero as the missing custom stop", async () => {
    const { element, send } = await setup([{ ...supply(), hysteresis_mode: "custom", zones: { "climate.room": {} } }]);
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="hysteresis-stop"]')!.value).toBe("0");
    await input(element, '[data-zone-id="climate.room"] [data-field="inherit"]', "custom", "change");
    await input(element, '[data-zone-id="climate.room"] [data-field="override-stop"]', "0.8");
    await input(element, '[data-zone-id="climate.room"] [data-field="override"]', "");
    expect(element.shadowRoot!.querySelector<HTMLSelectElement>('[data-zone-id="climate.room"] [data-field="inherit"]')!.value).toBe("custom");
    await click(element, "save");
    expect(send.mock.calls[0][0].groups[0].zones["climate.room"]).toEqual({ hysteresis_stop: 0.8 });
  });

  it("rejects invalid custom stop values while allowing zero offsets", async () => {
    const { element, send } = await setup([{ ...supply(), hysteresis_mode: "custom", hysteresis_stop: 0.2 }]);
    await input(element, '[data-field="hysteresis-stop"]', "-0.2");
    await click(element, "save"); expect(send).not.toHaveBeenCalled();
    await input(element, '[data-field="hysteresis-stop"]', "");
    await click(element, "save"); expect(send).not.toHaveBeenCalled();
    await input(element, '[data-field="hysteresis-stop"]', "0");
    await input(element, '[data-field="hysteresis"]', "0");
    await input(element, '[data-zone-id="climate.office"] [data-field="override-stop"]', "-0.1");
    await click(element, "save"); expect(send).not.toHaveBeenCalled();
    await input(element, '[data-zone-id="climate.office"] [data-field="override-stop"]', "0");
    await click(element, "save"); expect(send).toHaveBeenCalledOnce();
  });

  it("distinguishes the enabled draft from observed supply state until saving", async () => {
    const { element, data } = await setup();
    element.data = { ...data, shared_demand_status: { boiler: { enabled: false, status: "disabled", output_state: "off" } } };
    await element.updateComplete;
    element.shadowRoot!.querySelector<TestHaSwitch>('[data-field="enabled"]')!.click(); await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[data-select-supply="boiler"]')!.textContent).toContain("sharedDemandDisabled");
    expect(element.shadowRoot!.querySelector(".shared-demand-identity .pill.warning")!.textContent).toBe("unsaved");
    await input(element, '[data-field="switch"]', "switch.cooler", "change");
    expect(element.shadowRoot!.querySelector(".shared-demand-status")!.textContent).not.toContain("sharedDemandOff");
    expect(element.shadowRoot!.querySelector(".shared-demand-supply")!.textContent).toContain("switch.cooler");
  });

  it("shows effective heating and cooling limits and advanced stop warnings", async () => {
    const { element } = await setup([{ ...supply(), hysteresis_mode: "custom", hysteresis: 0.4, hysteresis_stop: 0.2 }]);
    element.host!._t = (key, values) => Object.entries(values ?? {}).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), en[key]);
    element.requestUpdate(); await element.updateComplete;
    expect(element.shadowRoot!.textContent).toContain("Start 0.4 °C below target; stop 0.2 °C above target.");
    expect(element.shadowRoot!.textContent).toContain("thermostat stops heating or cooling at its target");
    await input(element, '[data-field="direction"]', "cool", "change");
    expect(element.shadowRoot!.textContent).toContain("Start 0.4 °C above target; stop 0.2 °C below target.");
    expect(element.shadowRoot!.textContent).toContain("thermostat stops heating or cooling at its target");
    await input(element, '[data-field="hysteresis-mode"]', "at_target", "change");
    expect(element.shadowRoot!.textContent).toContain("Start 0.4 °C above target; stop at target.");
    expect(element.shadowRoot!.querySelector(".shared-demand-warning")).toBeNull();
  });

  it("renders a template-style library with only the selected supply editor", async () => {
    const second = { ...supply(), id: "cooling", name: "Cooling", direction: "cool" as const, switch_entity_id: "switch.cooler" };
    const { element, data } = await setup([supply(), second]);
    expect(element.shadowRoot!.querySelector(".template-library-layout .template-list-wrap .template-list")).not.toBeNull();
    expect(element.shadowRoot!.querySelectorAll("[data-select-supply]")).toHaveLength(2);
    expect(element.shadowRoot!.querySelectorAll("[data-supply-id]")).toHaveLength(1);
    expect(element.shadowRoot!.querySelector("[data-supply-id]")!.getAttribute("data-supply-id")).toBe("boiler");
    await select(element, "cooling");
    expect(element.shadowRoot!.querySelector(".template-detail [data-supply-id]")!.getAttribute("data-supply-id")).toBe("cooling");
    expect(element.shadowRoot!.querySelector('[data-select-supply="cooling"]')!.getAttribute("aria-pressed")).toBe("true");
    element.data = { ...data, settings: { ...data.settings, shared_demand_groups: [second, supply()] } };
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector("[data-supply-id]")!.getAttribute("data-supply-id")).toBe("cooling");
    expect(element.hasUnsavedChanges).toBe(false);
  });

  it("keeps drafts for every supply while selecting different editors and saves them together", async () => {
    const { element, send } = await setup([supply(), { ...supply(), id: "second", name: "Second", switch_entity_id: "switch.cooler" }]);
    await input(element, '[data-field="name"]', "Edited boiler");
    await select(element, "second");
    await input(element, '[data-field="hysteresis"]', "0.8");
    await select(element, "boiler");
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe("Edited boiler");
    await select(element, "second");
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="hysteresis"]')!.value).toBe("0.8");
    await click(element, "save");
    expect(send.mock.calls[0][0].groups).toEqual([
      expect.objectContaining({ id: "boiler", name: "Edited boiler" }),
      expect.objectContaining({ id: "second", hysteresis: 0.8 }),
    ]);
  });

  it("selects a newly created supply and selects the adjacent supply after deletion", async () => {
    const { element } = await setup([supply(), { ...supply(), id: "second", name: "Second" }, { ...supply(), id: "third", name: "Third" }]);
    await select(element, "second"); await click(element, "remove");
    expect(element.shadowRoot!.querySelector("[data-supply-id]")!.getAttribute("data-supply-id")).toBe("third");
    await click(element, "remove");
    expect(element.shadowRoot!.querySelector("[data-supply-id]")!.getAttribute("data-supply-id")).toBe("boiler");
    await click(element, "add");
    const id = element.shadowRoot!.querySelector("[data-supply-id]")!.getAttribute("data-supply-id");
    expect(id).not.toBe("boiler");
    expect(element.shadowRoot!.activeElement).toBe(element.shadowRoot!.querySelector('[data-field="name"]'));
    await click(element, "remove"); await click(element, "remove");
    expect(element.shadowRoot!.querySelector(".shared-demand-empty-state")).not.toBeNull();
    expect(element.shadowRoot!.querySelector('[data-action="add"]')).not.toBeNull();
  });

  it("emits an isolated restorable draft, preserves selection and rejects stale saves after remount", async () => {
    const { element, data, send } = await setup([supply(), { ...supply(), id: "second", switch_entity_id: "switch.cooler" }]);
    const changes: Array<{ dirty: boolean; busy: boolean; draft?: SharedSupplyLibraryDraft }> = [];
    element.addEventListener("velair-dirty-changed", event => changes.push((event as CustomEvent).detail));
    await input(element, '[data-field="name"]', "Draft boiler"); await select(element, "second");
    const latest = changes.at(-1)!;
    expect(latest.dirty).toBe(true); expect(latest.busy).toBe(false);
    expect(latest.draft!.selectedSupplyId).toBe("second");
    expect(latest.draft!.supplies).toHaveLength(2);
    expect(latest.draft!.newSupplyIds).toEqual([]);
    expect(latest.draft).not.toHaveProperty("groups");
    const restored = document.createElement("velair-shared-demand-settings") as VelairSharedDemandSettings;
    restored.host = element.host; restored.data = { ...data, configuration_revision: 99 }; restored.draft = latest.draft;
    element.remove(); document.body.append(restored); await restored.updateComplete;
    expect(restored.hasUnsavedChanges).toBe(true);
    expect(restored.shadowRoot!.querySelector("[data-supply-id]")!.getAttribute("data-supply-id")).toBe("second");
    await select(restored, "boiler");
    expect(restored.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe("Draft boiler");
    await input(restored, '[data-field="name"]', "Edited again");
    expect(latest.draft!.supplies[0].name).toBe("Draft boiler");
    await click(restored, "save");
    expect(send).not.toHaveBeenCalled();
    expect(restored.shadowRoot!.textContent).toContain("sharedDemandStale");
    expect(restored.shadowRoot!.querySelector('[data-save-error]')!.closest(".template-detail-heading")).not.toBeNull();
  });

  it("publishes busy transitions and a clean state after save", async () => {
    const { element, data, send } = await setup();
    const changes: Array<{ dirty: boolean; busy: boolean; draft?: SharedSupplyLibraryDraft }> = [];
    element.addEventListener("velair-dirty-changed", event => changes.push((event as CustomEvent).detail));
    let finish!: (data: ScheduleResponse) => void;
    send.mockImplementationOnce(() => new Promise<ScheduleResponse>(resolve => { finish = resolve; }));
    await input(element, '[data-field="name"]', "Saving draft"); await click(element, "save");
    expect(element.busy).toBe(true); expect(changes.at(-1)!.busy).toBe(true);
    finish(data); await Promise.resolve(); await element.updateComplete;
    expect(element.busy).toBe(false); expect(changes.at(-1)).toMatchObject({ dirty: false, busy: false, draft: undefined });

  });

  it("keeps another supply's suspension and delivery fault visible in the library", async () => {
    const { element, data } = await setup([supply(), { ...supply(), id: "second" }]);
    element.data = { ...data, shared_demand_status: { second: { status: "suspension_persistence_failed", suspended: true } } };
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[data-select-supply="second"]')!.textContent).toContain("sharedDemandSuspensionSaveFailed");
    expect(element.shadowRoot!.querySelector("[data-supply-id]")!.getAttribute("data-supply-id")).toBe("boiler");
  });

  it("uses the Modes intro and exact Templates list actions without a nested detail surface", async () => {
    const { element } = await setup();
    const intro = element.shadowRoot!.querySelector("header.profile-intro")!;
    expect(intro.children[1].tagName).toBe("SPAN");
    expect(intro.children[1].querySelector("strong")!.textContent).toBe("supplyControl");
    expect(intro.children[1].querySelector("small")!.textContent).toBe("sharedDemandDescription");
    expect(intro.children[2].classList.contains("documentation-help")).toBe(true);
    const remove = element.shadowRoot!.querySelector<HTMLButtonElement>(".template-item > .resource-delete-control > button")!;
    expect(remove.className).toBe("icon-button danger template-item-delete");
    expect(remove.querySelector("ha-icon")!.getAttribute("icon")).toBe("mdi:trash-can");
    expect(element.shadowRoot!.querySelector(".template-detail [data-action=remove]")).toBeNull();
    expect(element.shadowRoot!.querySelector(".template-detail .settings-zone-row")).toBeNull();
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="add"]')!.className).toBe("icon-button primary");
    await input(element, '[data-field="name"]', "New name");
    expect(element.shadowRoot!.querySelector('[data-action="save"]')!.closest(".template-detail-actions")).not.toBeNull();
    expect(element.shadowRoot!.querySelector('[data-action="save"]')!.getAttribute("aria-label")).toBe("sharedDemandSave");
    expect(element.shadowRoot!.querySelector('[data-action="discard"]')).toBeNull();
  });

  it("deletes the intended unselected supply without changing the selected editor or its draft", async () => {
    const { element, send } = await setup([supply(), { ...supply(), id: "second", name: "Second", switch_entity_id: "switch.cooler" }, { ...supply(), id: "third", name: "Third" }]);
    await input(element, '[data-field="name"]', "Keep this draft");
    const remove = element.shadowRoot!.querySelector<HTMLButtonElement>('[data-remove-supply="second"]')!;
    remove.focus(); remove.click(); await element.updateComplete;
    expect(element.shadowRoot!.querySelector("[data-supply-id]")!.getAttribute("data-supply-id")).toBe("boiler");
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe("Keep this draft");
    expect(element.shadowRoot!.querySelector('[data-select-supply="second"]')).toBeNull();
    expect(element.shadowRoot!.activeElement).toBe(element.shadowRoot!.querySelector('[data-select-supply="third"]'));
    expect(send).not.toHaveBeenCalled();
  });

  it("keeps list deletion disabled outside the editor fieldset while saving", async () => {
    const { element, send, data } = await setup([supply(), { ...supply(), id: "second", switch_entity_id: "switch.cooler" }]);
    let finish!: (data: ScheduleResponse) => void;
    send.mockImplementationOnce(() => new Promise<ScheduleResponse>(resolve => { finish = resolve; }));
    await input(element, '[data-field="name"]', "Saving"); await click(element, "save");
    const buttons = [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>("[data-remove-supply]")];
    expect(buttons.every(button => button.disabled)).toBe(true);
    buttons[1].click(); await element.updateComplete;
    expect(element.shadowRoot!.querySelectorAll("[data-select-supply]")).toHaveLength(2);
    finish(data); await Promise.resolve(); await element.updateComplete;
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-remove-supply="second"]')!.disabled).toBe(false);
  });
  it("labels header facts and library metadata using readable English", async () => {
    const { element, data } = await setup();
    element.host!._friendlyEntityName = id => id === "switch.boiler" ? "Aseo" : id;
    element.host!._t = (key, values) => Object.entries(values ?? {}).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), en[key]);
    element.data = { ...data, shared_demand_status: { boiler: { enabled: false, status: "disabled", output_state: "off", demand: false } } };
    await element.updateComplete;
    const list = element.shadowRoot!.querySelector('[data-select-supply="boiler"]')!;
    expect(list.textContent).toContain("Heating supply");
    expect(list.textContent).toContain("Thermostats: 2");
    expect(list.textContent).toContain("Switch: Aseo");
    expect(list.textContent).toContain("Control: Disabled");
    const hysteresis = element.shadowRoot!.querySelector<HTMLSelectElement>('[data-zone-id="climate.room"] [data-field="inherit"]')!;
    expect(hysteresis.labels![0].textContent).toBe("Thermostat hysteresis");
    expect([...hysteresis.options].map(option => option.textContent)).toEqual(["Use supply hysteresis", "Custom hysteresis values"]);
    expect(element.shadowRoot!.querySelector('[data-fact="switch-state"]')!.getAttribute("aria-label")).toBe("Switch state");
    expect(element.shadowRoot!.querySelector('.shared-demand-output-control [data-field="switch"]')).not.toBeNull();
    expect(element.shadowRoot!.querySelector('.shared-demand-output-control [data-fact="switch-state"]')).not.toBeNull();
    expect(element.shadowRoot!.querySelector('[data-fact="control"]')).toBeNull();
    expect(element.shadowRoot!.querySelector('[data-fact="demand"]')).toBeNull();
    expect(element.shadowRoot!.querySelector('.shared-demand-enabled')!.textContent).toContain("Enable automatic supply control");
    expect(element.shadowRoot!.querySelector('summary .inline-help')).toBeNull();
    expect(element.shadowRoot!.querySelector('[data-select-supply] button')).toBeNull();
  });

  it("keeps saved control status when the enabled toggle is an unsaved draft", async () => {
    const { element, data } = await setup([{ ...supply(), enabled: true }]);
    element.data = { ...data, shared_demand_status: { boiler: { enabled: true, status: "demand", output_state: "on", demand: true } } };
    await element.updateComplete;
    element.shadowRoot!.querySelector<TestHaSwitch>('[data-field="enabled"]')!.click(); await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[data-select-supply="boiler"]')!.textContent).toContain("sharedDemandActive");
    expect(element.shadowRoot!.querySelector('[data-fact="demand"]')!.textContent).toContain("sharedDemandDemandPresent");
    expect(element.shadowRoot!.querySelector('[data-select-supply="boiler"] .pill.warning')).toBeNull();
    expect(element.shadowRoot!.querySelector('.shared-demand-identity .pill.warning')!.textContent).toBe("unsaved");
    await input(element, '[data-field="switch"]', "switch.cooler", "change");
    expect(element.shadowRoot!.querySelector('[data-select-supply="boiler"]')!.textContent).toContain("sharedDemandUnknown");
    expect(element.shadowRoot!.querySelector('[data-fact="demand"]')).toBeNull();
  });

  it.each(["disabled", "suspended", "invalid_output", "temperature_migration_blocked"])("does not present unevaluated %s demand as absent", async status => {
    const { element, data } = await setup([{ ...supply(), enabled: true }]);
    element.data = { ...data, shared_demand_status: { boiler: { enabled: status !== "disabled", suspended: status === "suspended", status, output_state: "off", demand: false } } };
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[data-fact="demand"]')).toBeNull();
    if (status === "invalid_output") expect(element.shadowRoot!.querySelector('.shared-demand-error')!.textContent).toContain("sharedDemandInvalidOutput");
  });

  it.each([
    [{ "climate.room": { demand: false } }, "sharedDemandDemandAbsent"],
    [{ "climate.room": { demand: null }, "climate.office": { demand: false } }, "sharedDemandUnknown"],
    [{}, "sharedDemandUnknown"],
  ])("does not mistake unknown room inputs for absence of demand", async (zones, expected) => {
    const { element, data } = await setup([{ ...supply(), enabled: true }]);
    element.data = { ...data, shared_demand_status: { boiler: { enabled: true, status: "unavailable", output_state: "unavailable", demand: false, zones } } } as ScheduleResponse;
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[data-fact="demand"]')!.textContent).toContain(expected);
    expect(element.shadowRoot!.querySelector('[data-select-supply="boiler"]')!.textContent).toContain("sharedDemandOutputUnavailable");
    expect(element.shadowRoot!.querySelector('.shared-demand-detail [role="status"]')!.textContent).toContain("sharedDemandOutputUnavailable");
  });

  it("explains switch observations, purpose and timings with the shared info control", async () => {
    const { element } = await setup([{ ...supply(), id: "boiler / one" }]);
    for (const kind of ["control", "state", "purpose", "minimum-off", "on-delay", "off-delay"]) {
      const id = `shared-demand-${kind}-help-${encodeURIComponent("boiler / one")}`;
      const tooltip = [...element.shadowRoot!.querySelectorAll<HTMLElement>(".inline-help-tooltip")].find(node => node.id === id)!;
      expect(tooltip).toBeDefined();
      const button = [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".inline-help")].find(node => node.getAttribute("aria-controls") === id)!;
      await reveal(element, `[aria-controls="${id}"]`);
      button.click();
      expect(button.getAttribute("aria-expanded")).toBe("true");
      button.click();
    }
    expect(element.shadowRoot!.querySelectorAll(".shared-demand-supply-header .inline-help")).toHaveLength(1);
  });

  it("keeps the top save icon disabled until edits exist and disables it again for reverted edits", async () => {
    const { element, send } = await setup();
    const save = () => element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="save"]')!;
    expect(save().disabled).toBe(true);
    expect(save().closest(".template-detail-heading .template-detail-actions")).not.toBeNull();
    expect(save().className).toBe("icon-button primary");
    expect(save().querySelector("ha-icon")!.getAttribute("icon")).toBe("mdi:content-save");
    expect(save().parentElement!.lastElementChild).toBe(save());
    await input(element, '[data-field="name"]', "Changed");
    expect(save().disabled).toBe(false);
    await input(element, '[data-field="name"]', "Boiler");
    expect(save().disabled).toBe(true);
    save().click();
    expect(send).not.toHaveBeenCalled();
  });

  it("retires a reverted draft, restores Resume and follows subsequent backend settings", async () => {
    const { element, send, data } = await setup([{ ...supply(), enabled: true, suspended: true }]);
    const events: Array<{ dirty: boolean; draft?: SharedSupplyLibraryDraft }> = [];
    element.addEventListener("velair-dirty-changed", event => events.push((event as CustomEvent).detail));
    await input(element, '[data-field="name"]', "Temporary name");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="resume"]')!.disabled).toBe(true);
    await input(element, '[data-field="name"]', "Boiler");
    expect(element.hasUnsavedChanges).toBe(false);
    expect(events.at(-1)).toMatchObject({ dirty: false, draft: undefined });
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="resume"]')!.disabled).toBe(false);
    element.data = { ...data, configuration_revision: 4, settings: { ...data.settings, shared_demand_groups: [{ ...supply(), name: "Backend name", enabled: true, suspended: true }] } };
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe("Backend name");
    await click(element, "resume");
    expect(send).toHaveBeenCalledWith({ type: "velair/resume_shared_demand", group_id: "boiler", expected_revision: 4 });
  });

  it("keeps truly dirty drafts and backend failures protected from later configuration updates", async () => {
    const { element, send, data } = await setup();
    send.mockRejectedValueOnce({ message: "Storage failed" });
    await input(element, '[data-field="name"]', "Unsaved name");
    await click(element, "save");
    expect(element.shadowRoot!.querySelector('[data-save-error]')!.textContent).toContain("Storage failed");
    element.data = { ...data, configuration_revision: 4, settings: { ...data.settings, shared_demand_groups: [{ ...supply(), name: "Backend name" }] } };
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe("Unsaved name");
    expect(element.shadowRoot!.querySelector('[data-save-error]')!.textContent).toContain("Storage failed");
    expect(element.hasUnsavedChanges).toBe(true);
    await click(element, "save");
    expect(send).toHaveBeenCalledOnce();
    expect(element.shadowRoot!.querySelector('[data-save-error]')!.textContent).toContain("sharedDemandStale");
  });

  it("retires restored clean drafts without hiding their saved error", async () => {
    const { element, data } = await setup([{ ...supply(), enabled: true, suspended: true }]);
    const restored = document.createElement("velair-shared-demand-settings") as VelairSharedDemandSettings;
    restored.host = element.host; restored.data = data;
    restored.draft = { supplies: structuredClone(data.settings.shared_demand_groups!), snapshot: JSON.stringify(data.settings.shared_demand_groups), revision: 3, selectedSupplyId: "boiler", newSupplyIds: [], error: "Retained server failure", validationAttempted: true };
    element.remove(); document.body.append(restored); await restored.updateComplete;
    expect(restored.hasUnsavedChanges).toBe(false);
    expect(restored.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="resume"]')!.disabled).toBe(false);
    expect(restored.shadowRoot!.querySelector('[data-save-error]')!.textContent).toContain("Retained server failure");
  });

  it("saves deletion of the final supply from the top detail action and preserves retry after failure", async () => {
    const { element, send, data } = await setup();
    send.mockRejectedValueOnce(new Error("Deletion refused"));
    send.mockResolvedValueOnce({ ...data, settings: { ...data.settings, shared_demand_groups: [] } });
    await click(element, "remove");
    expect(element.shadowRoot!.querySelectorAll("[data-select-supply]")).toHaveLength(0);
    expect(element.shadowRoot!.querySelector('[data-action="save"]')!.closest(".template-detail-heading .template-detail-actions")).not.toBeNull();
    await click(element, "save");
    expect(element.shadowRoot!.querySelector('[role="alert"]')!.textContent).toContain("Deletion refused");
    expect(element.hasUnsavedChanges).toBe(true);
    expect(element.shadowRoot!.querySelectorAll('[data-save-error]')).toHaveLength(1);
    expect(element.shadowRoot!.querySelector('[data-save-error]')!.closest(".shared-demand-empty-state")).not.toBeNull();
    await click(element, "save");
    expect(send.mock.calls[1][0]).toEqual({ type: "velair/update_shared_demand", expected_revision: 3, groups: [] });
    expect(element.hasUnsavedChanges).toBe(false);
    expect(element.shadowRoot!.querySelector('[data-action="save"]')).toBeNull();
  });

  it.each([["minimum_off", "sharedDemandWaitingMinimumOff"], ["on_delay", "sharedDemandWaitingOnDelay"], ["off_delay", "sharedDemandWaitingOffDelay"]])("keeps %s timing status beside the observed switch", async (status, label) => {
    const { element, data } = await setup([{ ...supply(), enabled: true }]);
    element.data = { ...data, shared_demand_status: { boiler: { enabled: true, status, output_state: "off" } } };
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector('.shared-demand-supply')!.textContent).toContain(label);
    expect(element.shadowRoot!.querySelector('[data-fact="control"]')).toBeNull();
  });

});
