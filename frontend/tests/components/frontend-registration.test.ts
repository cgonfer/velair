// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { VelairCard } from "../../src/velair/components/velair-card-element";
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
    const tabs = [...(panel.shadowRoot?.querySelectorAll("ha-tab-group-tab") ?? [])];
    expect(tabs).toHaveLength(9);
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual([
      "Overview",
      "Schedules",
      "Modes",
      "Templates",
      "Room Assist",
      "Comfort",
      "Preconditioning",
      "Diagnostics",
      "Settings",
    ]);
    expect(panel.shadowRoot?.textContent).toContain("Modes");
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

    const modesTab = panel.shadowRoot?.querySelector<HTMLElement>('ha-tab-group-tab[panel="modes"]');
    const schedulesTab = panel.shadowRoot?.querySelector<HTMLElement>('ha-tab-group-tab[panel="schedules"]');
    modesTab?.click();
    await panel.updateComplete;
    const card = panel.shadowRoot?.querySelector("velair-panel-card");
    card?.dispatchEvent(new CustomEvent("profile-dirty-changed", { bubbles: true, composed: true, detail: true }));
    schedulesTab?.click();
    await panel.updateComplete;

    expect(panel.shadowRoot?.querySelector("velair-panel-card")?.getAttribute("view")).toBe("modes");
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
      { label: "Climate: status and control", value: "climate" },
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

  it("uses compact section defaults without resetting manual expansion on unrelated config updates", () => {
    const card = new VelairCard() as unknown as {
      setConfig(config: Record<string, unknown>): void;
      _climateCardCurrentStateCollapsed: boolean;
      _climateCardRoomAssistCollapsed: boolean;
      _climateCardPreconditioningCollapsed: boolean;
      _toggleClimateCardCurrentState(): void;
    };

    card.setConfig({ view: "climate" });
    expect(card._climateCardCurrentStateCollapsed).toBe(true);
    expect(card._climateCardRoomAssistCollapsed).toBe(true);
    expect(card._climateCardPreconditioningCollapsed).toBe(true);

    card._toggleClimateCardCurrentState();
    card.setConfig({ view: "climate", climate_show_name: false });
    expect(card._climateCardCurrentStateCollapsed).toBe(false);

    card.setConfig({
      view: "climate",
      climate_current_state_default_collapsed: true,
      climate_room_assist_default_collapsed: false,
      climate_preconditioning_default_collapsed: false,
    });
    expect(card._climateCardCurrentStateCollapsed).toBe(true);
    expect(card._climateCardRoomAssistCollapsed).toBe(false);
    expect(card._climateCardPreconditioningCollapsed).toBe(false);
  });

  it("offers one managed climate and optional dashboard sensors for the climate card", async () => {
    await import("../../src/velair-card");
    const editor = document.createElement("velair-card-editor") as HTMLElement & {
      hass?: unknown;
      setConfig(config: Record<string, unknown>): void;
      updateComplete?: Promise<boolean>;
    };
    editor.setConfig({
      view: "climate",
      entities: ["climate.bedroom"],
      climate_humidity_entity: "sensor.indoor_humidity",
      climate_outdoor_temperature_entity: "sensor.outdoor",
      climate_window_entities: ["binary_sensor.window"],
      climate_room_assist_display: "text",
      climate_custom_actions: [{ name: "Ventilate", script: "script.ventilate", icon: "mdi:window-open-variant", color: "#03a9f4" }],
    });
    editor.hass = {
      connection: { sendMessagePromise: async () => ({ configured_entities: ["climate.office", "climate.bedroom"] }) },
      states: {
        "climate.office": { attributes: { friendly_name: "Office" } },
        "climate.bedroom": { attributes: { friendly_name: "Bedroom" } },
        "sensor.outdoor": { attributes: { friendly_name: "Outdoor", device_class: "temperature" } },
        "sensor.indoor_humidity": { state: "48", attributes: { friendly_name: "Indoor humidity", device_class: "humidity", unit_of_measurement: "%" } },
        "binary_sensor.window": { attributes: { friendly_name: "Window", device_class: "window" } },
        "script.ventilate": { state: "off", attributes: { friendly_name: "Ventilate", icon: "mdi:window-open-variant" } },
        "script.night_mode": { state: "off", attributes: { friendly_name: "Night mode", icon: "mdi:weather-night" } },
      },
    };
    document.body.append(editor);
    await editor.updateComplete;
    await Promise.resolve();
    await editor.updateComplete;

    expect(editor.shadowRoot?.querySelector(".climate-card-options")?.textContent).toContain("Office");
    const climateSelect = editor.shadowRoot?.querySelector(".climate-card-options > label select") as HTMLSelectElement;
    expect(climateSelect.value).toBe("climate.bedroom");
    expect(editor.shadowRoot?.querySelector(".climate-card-options")?.textContent).toContain("Outdoor");
    expect(editor.shadowRoot?.querySelector<HTMLSelectElement>(".climate-card-humidity-source select")?.value).toBe("sensor.indoor_humidity");
    expect(editor.shadowRoot?.querySelector('input[placeholder="Velair"]')).toBeNull();
    expect(editor.shadowRoot?.querySelectorAll(".climate-card-option-group")).toHaveLength(6);
    expect([...editor.shadowRoot!.querySelectorAll<HTMLDetailsElement>(".climate-card-option-group")].every((group) => group.open)).toBe(true);
    expect([...editor.shadowRoot!.querySelectorAll<HTMLElement>(".climate-card-option-group")].map((group) => group.classList[1]))
      .toEqual([
        "climate-card-header-editor",
        "climate-card-thermostat-editor",
        "climate-card-current-editor",
        "climate-card-timeline-editor",
        "climate-card-room-assist-editor",
        "climate-card-preconditioning-editor",
      ]);
    expect(editor.shadowRoot?.querySelector(".climate-card-thermostat-editor > .climate-card-option-content > .climate-card-feature-editor-body > .climate-card-actions-editor")).not.toBeNull();
    const customName = editor.shadowRoot?.querySelector<HTMLInputElement>(".climate-card-header-editor input[type='text']");
    expect(customName?.value).toBe("Bedroom");
    const outdoorSelect = editor.shadowRoot?.querySelector<HTMLSelectElement>(".climate-card-outdoor-source select");
    expect([...outdoorSelect.options].map((option) => option.value)).toEqual(["sensor.outdoor"]);
    const windowDisplay = editor.shadowRoot?.querySelector(".climate-card-window-editor select") as HTMLSelectElement;
    expect([...windowDisplay.options].map((option) => option.value)).toEqual(["grouped", "individual"]);
    expect(editor.shadowRoot?.querySelector<HTMLAnchorElement>(".climate-card-window-editor a")?.href)
      .toBe("https://github.com/cgonfer/velair/blob/main/docs/user/blueprints/pause-zone-for-open-windows.md");
    expect(editor.shadowRoot?.querySelector(".zone-order")).toBeNull();
    expect(editor.shadowRoot?.querySelectorAll(".climate-card-timeline-editor .visibility-option input")).toHaveLength(4);
    expect([...editor.shadowRoot!.querySelectorAll<HTMLInputElement>(".climate-card-timeline-editor .visibility-option input")].every((input) => input.checked)).toBe(true);
    expect(editor.shadowRoot?.querySelectorAll(".climate-card-thermostat-editor .visibility-option input")).toHaveLength(5);
    expect([...editor.shadowRoot!.querySelectorAll<HTMLInputElement>(".climate-card-thermostat-editor .visibility-option input")].every((input) => input.checked)).toBe(true);
    expect(editor.shadowRoot?.querySelector(".climate-card-thermostat-editor")?.textContent)
      .toContain("confirmed Manual adjustment");
    expect(editor.shadowRoot?.querySelector(".climate-card-thermostat-editor")?.textContent)
      .not.toContain("Show thermostat controls");
    expect(editor.shadowRoot?.querySelector(".climate-card-header-editor")?.textContent)
      .not.toContain("Show Velair shortcut");
    const roomAssistDisplay = editor.shadowRoot?.querySelector(".climate-card-room-assist-editor select") as HTMLSelectElement;
    expect(roomAssistDisplay.value).toBe("text");
    expect([...roomAssistDisplay.options].map((option) => option.value)).toEqual(["both", "chart", "text"]);
    expect(editor.shadowRoot?.querySelector(".climate-card-room-assist-editor .visibility-list input")).toBeNull();
    const preconditioningDisplay = editor.shadowRoot?.querySelector(".climate-card-preconditioning-editor select") as HTMLSelectElement;
    expect(preconditioningDisplay.value).toBe("both");
    expect([...preconditioningDisplay.options].map((option) => option.value)).toEqual(["both", "chart", "text"]);
    expect(editor.shadowRoot?.querySelector(".climate-card-room-assist-editor .climate-card-feature-editor-body")).not.toBeNull();
    expect(editor.shadowRoot?.querySelector(".climate-card-preconditioning-editor .climate-card-feature-editor-body")).not.toBeNull();
    expect(editor.shadowRoot?.querySelectorAll(".climate-card-current-editor .visibility-option input")).toHaveLength(10);
    expect(editor.shadowRoot?.querySelectorAll(".climate-card-room-assist-editor .visibility-option input")).toHaveLength(1);
    expect(editor.shadowRoot?.querySelectorAll(".climate-card-preconditioning-editor .visibility-option input")).toHaveLength(2);
    const collapsedComfortReadings = editor.shadowRoot?.querySelector<HTMLInputElement>(".climate-card-collapsed-comfort-readings input");
    expect(editor.shadowRoot?.querySelector(".climate-card-collapsed-comfort-readings")?.textContent)
      .toContain("Show extra readings when collapsed");
    expect(collapsedComfortReadings?.checked).toBe(false);
    const collapsedReadingsChanged = new Promise<Record<string, unknown>>((resolve) => editor.addEventListener(
      "config-changed",
      ((event: CustomEvent) => resolve(event.detail.config)) as EventListener,
      { once: true },
    ));
    collapsedComfortReadings!.checked = true;
    collapsedComfortReadings!.dispatchEvent(new Event("change"));
    const collapsedReadingsConfig = await collapsedReadingsChanged;
    expect(collapsedReadingsConfig.climate_show_comfort_collapsed_readings).toBe(true);
    editor.setConfig(collapsedReadingsConfig);
    await editor.updateComplete;
    expect(editor.shadowRoot?.querySelector<HTMLInputElement>(".climate-card-collapsed-comfort-readings input")?.checked).toBe(true);
    expect([
      editor.shadowRoot?.querySelector<HTMLInputElement>('input[type="checkbox"]'),
      editor.shadowRoot?.querySelector<HTMLInputElement>('.climate-card-preconditioning-editor .nested-option input[type="checkbox"]'),
    ].every((input) => input?.checked)).toBe(true);

    roomAssistDisplay.value = "chart";
    roomAssistDisplay.dispatchEvent(new Event("change"));
    await editor.updateComplete;
    expect(editor.shadowRoot?.querySelector<HTMLInputElement>(".climate-card-room-assist-editor .visibility-list input")?.checked).toBe(true);
    roomAssistDisplay.value = "text";
    roomAssistDisplay.dispatchEvent(new Event("change"));
    await editor.updateComplete;
    expect(editor.shadowRoot?.querySelector(".climate-card-room-assist-editor .visibility-list input")).toBeNull();

    preconditioningDisplay.value = "text";
    preconditioningDisplay.dispatchEvent(new Event("change"));
    await editor.updateComplete;
    expect(editor.shadowRoot?.querySelector(".climate-card-preconditioning-editor .visibility-list input")).toBeNull();
    preconditioningDisplay.value = "chart";
    preconditioningDisplay.dispatchEvent(new Event("change"));
    await editor.updateComplete;
    expect(editor.shadowRoot?.querySelector<HTMLInputElement>(".climate-card-preconditioning-editor .visibility-list input")?.checked).toBe(true);
    expect(editor.shadowRoot?.querySelectorAll(".climate-card-fixed-action")).toHaveLength(2);
    editor.shadowRoot?.querySelector<HTMLButtonElement>(".climate-card-fixed-action.boost .climate-card-action-disclosure")?.click();
    await editor.updateComplete;
    expect(editor.shadowRoot?.querySelector<HTMLInputElement>(".climate-card-fixed-action.boost input")?.getAttribute("aria-label"))
      .toBe("Show Boost action");
    expect(editor.shadowRoot?.querySelector<HTMLSelectElement>(".climate-card-fixed-action.boost select")?.value).toBe("auto");
    expect(editor.shadowRoot?.querySelector(".climate-card-fixed-action.boost")?.textContent).toContain("Hide action name");
    editor.shadowRoot?.querySelector<HTMLButtonElement>(".climate-card-fixed-action.pause .climate-card-action-disclosure")?.click();
    await editor.updateComplete;
    expect(editor.shadowRoot?.querySelector<HTMLInputElement>(".climate-card-fixed-action.pause input")?.getAttribute("aria-label"))
      .toBe("Show Pause and Resume action");
    expect(editor.shadowRoot?.querySelector(".climate-card-actions-editor")?.textContent)
      .toContain("up to three direct positions");
    const customAction = editor.shadowRoot?.querySelector<HTMLElement>(".climate-card-custom-action");
    expect(customAction?.querySelector(".climate-card-custom-action-body")).toBeNull();
    customAction?.querySelector<HTMLButtonElement>(".climate-card-action-disclosure")?.click();
    await editor.updateComplete;
    expect(customAction?.querySelector<HTMLInputElement>("input[type='text']")?.value).toBe("Ventilate");
    const customActionSelects = customAction?.querySelectorAll<HTMLSelectElement>("select");
    const placementSelect = customActionSelects?.[0];
    const customActionSelect = customActionSelects?.[1];
    const iconHeading = customAction?.querySelector<HTMLElement>(".climate-card-custom-action-icon-heading");
    const iconBrowser = iconHeading?.querySelector<HTMLAnchorElement>("a");
    expect(customAction?.querySelector<HTMLButtonElement>(".climate-card-action-disclosure")?.ariaExpanded).toBe("true");
    expect(customAction?.textContent).toContain("Hide action name");
    expect(placementSelect?.value).toBe("auto");
    expect(customActionSelect?.value).toBe("script.ventilate");
    expect(iconBrowser?.href).toBe("https://pictogrammers.com/library/mdi/");
    expect(iconBrowser?.target).toBe("_blank");
    expect(iconBrowser?.rel).toBe("noopener noreferrer");
    expect(iconBrowser?.textContent).toBe("Browse available icons");
    expect(iconBrowser?.querySelector("ha-icon")).toBeNull();
    expect(iconHeading?.nextElementSibling?.tagName).toBe("INPUT");

    let changedConfig: { selected_entity?: string; entities?: string[]; climate_name?: string; climate_actions?: Array<{ type: string; name?: string; script?: string; placement?: string }> } | undefined;
    editor.addEventListener("config-changed", ((event: CustomEvent) => {
      changedConfig = event.detail.config;
    }) as EventListener);
    customActionSelect!.value = "script.night_mode";
    customActionSelect!.dispatchEvent(new Event("change"));
    expect(changedConfig?.climate_actions?.[2]).toMatchObject({
      type: "script",
      name: "Night mode",
      script: "script.night_mode",
    });
    placementSelect!.value = "more";
    placementSelect!.dispatchEvent(new Event("change"));
    expect(changedConfig?.climate_actions?.[2]).toMatchObject({
      type: "script",
      placement: "more",
    });
    climateSelect.value = "climate.office";
    climateSelect.dispatchEvent(new Event("change"));
    expect(changedConfig?.selected_entity).toBe("climate.office");
    expect(changedConfig?.entities).toBeUndefined();
    expect(changedConfig?.climate_name).toBeUndefined();
    editor.remove();
  });

  it("keeps an explicitly empty climate name until it is reset", async () => {
    await import("../../src/velair-card");
    const editor = document.createElement("velair-card-editor") as HTMLElement & {
      hass?: unknown;
      setConfig(config: Record<string, unknown>): void;
      updateComplete?: Promise<boolean>;
    };
    editor.setConfig({ view: "climate", selected_entity: "climate.bedroom" });
    editor.hass = {
      connection: { sendMessagePromise: async () => ({ configured_entities: ["climate.bedroom"] }) },
      states: { "climate.bedroom": { attributes: { friendly_name: "Bedroom" } } },
    };
    document.body.append(editor);
    await editor.updateComplete;
    await Promise.resolve();
    await editor.updateComplete;

    const changed = new Promise<Record<string, unknown>>((resolve) => editor.addEventListener(
      "config-changed",
      ((event: CustomEvent) => resolve(event.detail.config)) as EventListener,
      { once: true },
    ));
    const input = editor.shadowRoot?.querySelector<HTMLInputElement>(".climate-card-name-row input")!;
    input.value = "";
    input.dispatchEvent(new Event("input"));
    const emptyConfig = await changed;
    expect(emptyConfig.climate_name).toBe("");

    editor.setConfig(emptyConfig);
    await editor.updateComplete;
    expect(editor.shadowRoot?.querySelector<HTMLInputElement>(".climate-card-name-row input")?.value).toBe("");

    const reset = new Promise<Record<string, unknown>>((resolve) => editor.addEventListener(
      "config-changed",
      ((event: CustomEvent) => resolve(event.detail.config)) as EventListener,
      { once: true },
    ));
    editor.shadowRoot?.querySelector<HTMLButtonElement>(".climate-card-name-row button")?.click();
    expect((await reset).climate_name).toBeUndefined();
    editor.remove();
  });

  it("restores built-in action placement when the climate editor is reopened", async () => {
    await import("../../src/velair-card");
    const editor = document.createElement("velair-card-editor") as HTMLElement & {
      hass?: unknown;
      setConfig(config: Record<string, unknown>): void;
      updateComplete?: Promise<boolean>;
    };
    editor.setConfig({
      view: "climate",
      selected_entity: "climate.bedroom",
      climate_actions: [
        { type: "boost", placement: "more" },
        { type: "pause", placement: "auto" },
      ],
    });
    editor.hass = {
      connection: { sendMessagePromise: async () => ({ configured_entities: ["climate.bedroom"] }) },
      states: { "climate.bedroom": { attributes: { friendly_name: "Bedroom" } } },
    };
    document.body.append(editor);
    await editor.updateComplete;
    await Promise.resolve();
    await editor.updateComplete;

    editor.shadowRoot?.querySelector<HTMLButtonElement>(".climate-card-fixed-action.boost .climate-card-action-disclosure")?.click();
    await editor.updateComplete;
    expect(editor.shadowRoot?.querySelector<HTMLSelectElement>(".climate-card-fixed-action.boost select")?.value).toBe("more");

    editor.shadowRoot?.querySelector<HTMLButtonElement>(".climate-card-fixed-action.pause .climate-card-action-disclosure")?.click();
    await editor.updateComplete;
    expect(editor.shadowRoot?.querySelector<HTMLSelectElement>(".climate-card-fixed-action.pause select")?.value).toBe("auto");
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
    expect(editor.shadowRoot?.textContent).toContain("Show Room Assist deadband");
    expect(visibilityOptions).toHaveLength(6);
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
