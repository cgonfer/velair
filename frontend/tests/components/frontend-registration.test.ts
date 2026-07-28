// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { VelairPanel } from "../../src/velair/views/panel";

describe("frontend entrypoint", () => {
  beforeEach(() => {
    window.customCards = [];
  });

  it("registers the panel, editor, and Lovelace card metadata", async () => {
    await import("../../src/velair-card");

    expect(customElements.get("velair-card")).toBeDefined();
    expect(customElements.get("velair-card-editor")).toBeDefined();
    expect(customElements.get("velair-panel-card")).toBeDefined();
    expect(customElements.get("velair-sidebar-panel")).toBeDefined();
    expect(customElements.get("velair-scheduler-view")).toBeUndefined();
    expect(customElements.get("velair-panel")).toBeUndefined();
    expect(window.customCards).toContainEqual({
      description: "Climate automation that adapts to your life.",
      name: "Velair",
      type: "velair-card",
    });
  });

  it("renders the sidebar panel shell and active scheduler view", async () => {
    await import("../../src/velair-card");
    const panel = document.createElement("velair-sidebar-panel") as HTMLElement & { updateComplete?: Promise<boolean> };

    document.body.append(panel);
    await panel.updateComplete;

    expect(panel.shadowRoot?.querySelector(".main-title")?.textContent).toContain("Velair");
    expect(panel.shadowRoot?.querySelector(".version")).toBeNull();
    expect(panel.shadowRoot?.querySelectorAll("ha-tab-group-tab")).toHaveLength(8);
    expect(panel.shadowRoot?.textContent).toContain("Profiles");
    expect(panel.shadowRoot?.textContent).toContain("Comfort");
    expect(panel.shadowRoot?.textContent).toContain("Room Assist");
    expect(panel.shadowRoot?.textContent).toContain("Preconditioning");
    expect(panel.shadowRoot?.querySelector("velair-panel-card")?.getAttribute("view")).toBe("overview");

    panel.remove();
  });

  it("sizes the sticky tab header from the real panel width", () => {
    const cssText = VelairPanel.styles.cssText;

    expect(cssText).toMatch(/\.header\s*\{[^}]*position:\s*sticky/);
    expect(cssText).toMatch(/\.header\s*\{[^}]*max-width:\s*100%/);
    expect(cssText).toMatch(/\.panel-tabs\s*\{[^}]*max-width:\s*100%/);
    expect(cssText).not.toMatch(/\.header\s*\{[^}]*position:\s*fixed/);
    expect(cssText).toMatch(/\.panel-content\s*\{[^}]*padding:\s*16px 24px 24px/);
  });

  it("keeps a dirty profile draft when tab navigation is cancelled", async () => {
    await import("../../src/velair-card");
    const panel = document.createElement("velair-sidebar-panel") as HTMLElement & { updateComplete?: Promise<boolean> };
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    document.body.append(panel);
    await panel.updateComplete;

    const tabs = panel.shadowRoot?.querySelectorAll("ha-tab-group-tab");
    (tabs?.[1] as HTMLElement | undefined)?.click();
    await panel.updateComplete;
    const card = panel.shadowRoot?.querySelector("velair-panel-card");
    card?.dispatchEvent(new CustomEvent("profile-dirty-changed", { bubbles: true, composed: true, detail: true }));
    (tabs?.[2] as HTMLElement | undefined)?.click();
    await panel.updateComplete;

    expect(panel.shadowRoot?.querySelector("velair-panel-card")?.getAttribute("view")).toBe("profiles");
    expect(confirm).toHaveBeenCalledOnce();
    confirm.mockRestore();
    panel.remove();
  });

  it("keeps Lovelace view IDs stable and orders consistently named options by panel", async () => {
    await import("../../src/velair-card");
    const editor = document.createElement("velair-card-editor") as HTMLElement & {
      setConfig(config: { view: string }): void;
      updateComplete?: Promise<boolean>;
    };

    editor.setConfig({ view: "preconditioning" });
    document.body.append(editor);
    await editor.updateComplete;

    const viewSelect = editor.shadowRoot?.querySelector("select");
    const options = [...(viewSelect?.querySelectorAll("option") ?? [])].map(
      (option) => ({
        label: option.textContent?.trim(),
        value: option.getAttribute("value"),
      }),
    );
    expect(options).toEqual([
      { label: "Overview: scheduler status", value: "overview-status" },
      { label: "Overview: active boosts", value: "overview-boosts" },
      { label: "Overview: next events", value: "overview-events" },
      { label: "Overview: today's timeline", value: "overview-timeline" },
      { label: "Overview: zone overview", value: "overview-zones" },
      { label: "Profiles: active setup", value: "active-setup" },
      { label: "Schedules: editor", value: "schedules" },
      { label: "Room Assist: configuration and status", value: "sensors" },
      { label: "Comfort: configuration and status", value: "comfort" },
      { label: "Preconditioning: configuration and status", value: "preconditioning" },
    ]);
    expect((viewSelect as HTMLSelectElement | null)?.value).toBe("preconditioning");

    editor.remove();
  });

  it("hides thermostat and weekday options for global Lovelace card views", async () => {
    await import("../../src/velair-card");
    const sendMessagePromise = vi.fn();
    const editor = document.createElement("velair-card-editor") as HTMLElement & {
      hass?: unknown;
      setConfig(config: { view: string }): void;
      updateComplete?: Promise<boolean>;
    };

    editor.setConfig({ view: "overview-status" });
    editor.hass = { connection: { sendMessagePromise } };
    document.body.append(editor);
    await editor.updateComplete;
    await Promise.resolve();
    await editor.updateComplete;

    expect(editor.shadowRoot?.querySelector(".zone-order")).toBeNull();
    expect(editor.shadowRoot?.querySelector(".first-weekday-option")).toBeNull();
    expect(sendMessagePromise).not.toHaveBeenCalled();

    editor.setConfig({ view: "active-setup" });
    await editor.updateComplete;
    expect(editor.shadowRoot?.querySelector(".zone-order")).toBeNull();
    expect(editor.shadowRoot?.querySelector(".first-weekday-option")).toBeNull();
    expect(sendMessagePromise).not.toHaveBeenCalled();

    editor.remove();
  });

  it("configures whether the Active setup card can change Modes, Profiles, or both", async () => {
    await import("../../src/velair-card");
    const editor = document.createElement("velair-card-editor") as HTMLElement & {
      setConfig(config: { active_setup_controls?: string; view: string }): void;
      updateComplete?: Promise<boolean>;
    };

    editor.setConfig({ view: "active-setup" });
    document.body.append(editor);
    await editor.updateComplete;

    const control = editor.shadowRoot?.querySelector(
      ".active-setup-controls-option select",
    ) as HTMLSelectElement;
    expect(control).not.toBeNull();
    expect(control.value).toBe("both");
    expect([...control.options].map((option) => option.value))
      .toEqual(["both", "modes", "profiles"]);
    expect(editor.shadowRoot?.textContent).toContain("Active setup controls");

    const changed = new Promise<Record<string, unknown>>((resolve) => {
      editor.addEventListener("config-changed", ((event: CustomEvent) => {
        resolve(event.detail.config);
      }) as EventListener, { once: true });
    });
    control.value = "profiles";
    control.dispatchEvent(new Event("change", { bubbles: true }));
    expect(await changed).toMatchObject({
      active_setup_controls: "profiles",
      view: "active-setup",
    });

    await editor.updateComplete;
    const updatedControl = editor.shadowRoot?.querySelector(
      ".active-setup-controls-option select",
    ) as HTMLSelectElement;
    const reset = new Promise<Record<string, unknown>>((resolve) => {
      editor.addEventListener("config-changed", ((event: CustomEvent) => {
        resolve(event.detail.config);
      }) as EventListener, { once: true });
    });
    updatedControl.value = "both";
    updatedControl.dispatchEvent(new Event("change", { bubbles: true }));
    expect(await reset).toEqual({ view: "active-setup" });

    editor.setConfig({ active_setup_controls: "invalid", view: "active-setup" });
    await editor.updateComplete;
    expect((editor.shadowRoot?.querySelector(
      ".active-setup-controls-option select",
    ) as HTMLSelectElement).value).toBe("both");

    editor.setConfig({ active_setup_controls: "modes", view: "overview-status" });
    await editor.updateComplete;
    expect(editor.shadowRoot?.querySelector(".active-setup-controls-option")).toBeNull();

    editor.remove();
  });

  it("shows Room Assist visibility options only for the Room Assist Lovelace card view", async () => {
    await import("../../src/velair-card");
    const editor = document.createElement("velair-card-editor") as HTMLElement & {
      hass?: unknown;
      setConfig(config: { view: string }): void;
      updateComplete?: Promise<boolean>;
    };

    editor.setConfig({ view: "sensors" });
    editor.hass = {
      connection: {
        sendMessagePromise: async () => ({
          configured_entities: ["climate.office"],
        }),
      },
      states: {
        "climate.office": { attributes: { friendly_name: "Office" } },
      },
    };
    document.body.append(editor);
    await editor.updateComplete;
    await Promise.resolve();
    await editor.updateComplete;

    const visibilityOptions = [
      ...(editor.shadowRoot?.querySelectorAll<HTMLInputElement>(".visibility-option input") ?? []),
    ];
    expect(editor.shadowRoot?.textContent).toContain("Room Assist visibility");
    expect(editor.shadowRoot?.textContent).toContain("Show refresh delay");
    expect(visibilityOptions).toHaveLength(5);
    expect(visibilityOptions.every((input) => input.checked)).toBe(true);

    const changed = new Promise<Record<string, unknown>>((resolve) => {
      editor.addEventListener("config-changed", ((event: CustomEvent) => {
        resolve(event.detail.config);
      }) as EventListener, { once: true });
    });

    visibilityOptions[0]!.checked = false;
    visibilityOptions[0]!.dispatchEvent(new Event("change", { bubbles: true }));

    expect(await changed).toMatchObject({
      show_room_assist_switch: false,
      view: "sensors",
    });

    editor.setConfig({ view: "overview-status" });
    await editor.updateComplete;
    expect(editor.shadowRoot?.querySelector(".card-visibility-options")).toBeNull();

    editor.remove();
  });

  it("shows thermostat and visibility options for the Comfort Lovelace card view", async () => {
    await import("../../src/velair-card");
    const editor = document.createElement("velair-card-editor") as HTMLElement & {
      hass?: unknown;
      setConfig(config: { view: string }): void;
      updateComplete?: Promise<boolean>;
    };

    editor.setConfig({ view: "comfort" });
    editor.hass = {
      connection: {
        sendMessagePromise: async () => ({
          configured_entities: ["climate.office"],
        }),
      },
      states: {
        "climate.office": { attributes: { friendly_name: "Office" } },
      },
    };
    document.body.append(editor);
    await editor.updateComplete;
    await Promise.resolve();
    await editor.updateComplete;

    expect(editor.shadowRoot?.querySelector(".zone-order")?.textContent).toContain("Office");
    expect(editor.shadowRoot?.textContent).toContain("Comfort card visibility");
    expect(editor.shadowRoot?.textContent).toContain("Show configuration");
    expect(editor.shadowRoot?.textContent).toContain("Show temperature graph");
    const visibilityOptions = [
      ...(editor.shadowRoot?.querySelectorAll<HTMLInputElement>(".visibility-option input") ?? []),
    ];
    expect(visibilityOptions).toHaveLength(4);
    expect(visibilityOptions.every((input) => input.checked)).toBe(true);

    const changed = new Promise<Record<string, unknown>>((resolve) => {
      editor.addEventListener("config-changed", ((event: CustomEvent) => {
        resolve(event.detail.config);
      }) as EventListener, { once: true });
    });

    visibilityOptions[1]!.checked = false;
    visibilityOptions[1]!.dispatchEvent(new Event("change", { bubbles: true }));

    expect(await changed).toMatchObject({
      show_comfort_temperature: false,
      view: "comfort",
    });

    editor.remove();
  });

  it("shows thermostat and weekday options for the schedules Lovelace card view", async () => {
    await import("../../src/velair-card");
    const editor = document.createElement("velair-card-editor") as HTMLElement & {
      hass?: unknown;
      setConfig(config: { view: string }): void;
      updateComplete?: Promise<boolean>;
    };

    editor.setConfig({ view: "schedules" });
    editor.hass = {
      connection: {
        sendMessagePromise: async () => ({
          configured_entities: ["climate.office"],
        }),
      },
      states: {
        "climate.office": { attributes: { friendly_name: "Office" } },
      },
    };
    document.body.append(editor);
    await editor.updateComplete;
    await Promise.resolve();
    await editor.updateComplete;

    expect(editor.shadowRoot?.querySelector(".first-weekday-option")).not.toBeNull();
    expect(editor.shadowRoot?.querySelector(".zone-order")?.textContent).toContain("Office");

    editor.remove();
  });

  it("lets a Lovelace card choose which thermostats it shows", async () => {
    await import("../../src/velair-card");
    const editor = document.createElement("velair-card-editor") as HTMLElement & {
      hass?: unknown;
      setConfig(config: { view: string; zone_order?: string[]; entities?: string[] }): void;
      updateComplete?: Promise<boolean>;
    };

    editor.setConfig({
      view: "preconditioning",
      zone_order: ["climate.bedroom", "climate.office"],
    });
    editor.hass = {
      connection: {
        sendMessagePromise: async () => ({
          configured_entities: ["climate.office", "climate.bedroom"],
        }),
      },
      states: {
        "climate.bedroom": { attributes: { friendly_name: "Bedroom" } },
        "climate.office": { attributes: { friendly_name: "Office" } },
      },
    };

    document.body.append(editor);
    await editor.updateComplete;
    await Promise.resolve();
    await editor.updateComplete;

    const labels = [...(editor.shadowRoot?.querySelectorAll(".zone-row > span") ?? [])]
      .map((element) => element.textContent?.trim());
    expect(labels).toEqual(["Bedroom", "Office"]);

    const checkboxes = [...(editor.shadowRoot?.querySelectorAll<HTMLInputElement>(".zone-visibility input") ?? [])];
    expect(checkboxes).toHaveLength(2);
    const changed = new Promise<Record<string, unknown>>((resolve) => {
      editor.addEventListener("config-changed", ((event: CustomEvent) => {
        resolve(event.detail.config);
      }) as EventListener, { once: true });
    });

    checkboxes[0]!.checked = false;
    checkboxes[0]!.dispatchEvent(new Event("change", { bubbles: true }));

    expect(await changed).toMatchObject({
      entities: ["climate.office"],
      zone_order: ["climate.bedroom", "climate.office"],
    });

    editor.remove();
  });
});
