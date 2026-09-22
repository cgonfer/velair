// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { VelairCard } from "../../src/velair/components/velair-card-element";

describe("climate card actions", () => {
  it("updates scalar and range targets plus published HVAC modes only during Manual adjustment", async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    if (!customElements.get("velair-climate-card-actions-test")) {
      customElements.define("velair-climate-card-actions-test", VelairCard);
    }
    const card = document.createElement("velair-climate-card-actions-test") as VelairCard & Record<string, any>;
    const entityId = "climate.office";
    card.hass = { callService, states: { [entityId]: { state: "heat", attributes: {
      temperature: 21, min_temp: 7, max_temp: 35,
      hvac_modes: ["off", "heat", "cool"],
    } } } } as never;
    card["_data"] = {
      configured_entities: [entityId], zones: { [entityId]: { enabled: true } },
      zone_runtime: { [entityId]: { state: "scheduled", control_mode: "manual" } },
    };

    await card["_adjustClimateCardTarget"](entityId, "temperature", 1);
    await card["_setClimateCardHvacMode"](entityId, "cool");
    expect(callService).toHaveBeenNthCalledWith(1, "climate", "set_temperature", {
      entity_id: entityId, temperature: 22,
    });
    expect(callService).toHaveBeenNthCalledWith(2, "climate", "set_hvac_mode", {
      entity_id: entityId, hvac_mode: "cool",
    });

    card.hass = { callService, states: { [entityId]: { state: "heat_cool", attributes: {
      target_temp_low: 18, target_temp_high: 24, min_temp: 7, max_temp: 35,
      target_temp_step: 1, supported_features: 2, hvac_modes: ["heat_cool"],
    } } } } as never;
    await card["_adjustClimateCardTarget"](entityId, "target_temp_low", 1);
    expect(callService).toHaveBeenNthCalledWith(3, "climate", "set_temperature", {
      entity_id: entityId, target_temp_low: 19, target_temp_high: 24,
    });
  });

  it("revalidates ownership, runtime and published modes before native climate services", async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const card = document.createElement("velair-climate-card-actions-test") as VelairCard & Record<string, any>;
    const entityId = "climate.office";
    card.hass = { callService, states: { [entityId]: { state: "heat", attributes: {
      temperature: 21, min_temp: 7, max_temp: 35, target_temp_step: 0.5, hvac_modes: ["heat"],
    } } } } as never;
    card["_data"] = {
      configured_entities: [entityId], zones: { [entityId]: { enabled: true } },
      zone_runtime: { [entityId]: { state: "scheduled", control_mode: "automatic" } },
    };
    await card["_adjustClimateCardTarget"](entityId, "temperature", 1);
    card["_data"].zone_runtime[entityId] = { state: "boost", control_mode: "manual" };
    await card["_adjustClimateCardTarget"](entityId, "temperature", 1);
    card["_data"].zone_runtime[entityId] = { state: "scheduled", control_mode: "manual" };
    await card["_setClimateCardHvacMode"](entityId, "cool");
    await card["_adjustClimateCardTarget"]("climate.unmanaged", "temperature", 1);
    expect(callService).not.toHaveBeenCalled();
  });

  it("accepts the exclusive Manual-adjustment pause but rejects any additional pause at service time", async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const card = document.createElement("velair-climate-card-actions-test") as VelairCard & Record<string, any>;
    const entityId = "climate.office";
    card.hass = { callService, states: { [entityId]: { state: "heat", attributes: {
      temperature: 21, min_temp: 7, max_temp: 35, target_temp_step: 0.5,
      hvac_modes: ["off", "heat", "cool"],
    } } } } as never;
    card["_data"] = {
      configured_entities: [entityId], zones: { [entityId]: { enabled: true } },
      zone_runtime: { [entityId]: {
        state: "paused", control_mode: "manual", pause_count: 1,
        pause_ids: ["velair.manual_adjustment"],
      } },
    };

    await card["_adjustClimateCardTarget"](entityId, "temperature", 1);
    await card["_setClimateCardHvacMode"](entityId, "cool");
    expect(callService).toHaveBeenNthCalledWith(1, "climate", "set_temperature", {
      entity_id: entityId, temperature: 21.5,
    });
    expect(callService).toHaveBeenNthCalledWith(2, "climate", "set_hvac_mode", {
      entity_id: entityId, hvac_mode: "cool",
    });

    card["_data"].zone_runtime[entityId] = {
      state: "paused", control_mode: "manual", pause_count: 2,
      pause_ids: ["velair.manual_adjustment", "window.open"],
    };
    await card["_adjustClimateCardTarget"](entityId, "temperature", -1);
    await card["_setClimateCardHvacMode"](entityId, "off");
    expect(callService).toHaveBeenCalledTimes(2);
  });

  it("opens the selected climate through Home Assistant more info", () => {
    const card = document.createElement("velair-climate-card-actions-test") as VelairCard & Record<string, any>;
    const entityId = "climate.office";
    card.hass = { states: { [entityId]: { state: "heat", attributes: {} } } } as never;
    const listener = vi.fn();
    card.addEventListener("hass-more-info", listener);
    card["_openClimateEntity"](entityId);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].detail).toEqual({ entityId });
  });

  it("opens the selected climate directly in Home Assistant history", () => {
    const card = document.createElement("velair-climate-card-actions-test") as VelairCard & Record<string, any>;
    const entityId = "climate.office";
    card.hass = { states: { [entityId]: { state: "heat", attributes: {} } } } as never;
    const listener = vi.fn();
    card.addEventListener("hass-more-info", listener);
    card["_openEntityHistory"](entityId);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].detail).toEqual({ entityId, view: "history" });
  });

  it("requires explicit boost values and calls only the zone-scoped services", async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    if (!customElements.get("velair-climate-card-actions-test")) {
      customElements.define("velair-climate-card-actions-test", VelairCard);
    }
    const card = document.createElement("velair-climate-card-actions-test") as VelairCard & Record<string, any>;
    card.hass = {
      callService,
      connection: { sendMessagePromise: vi.fn(), subscribeMessage: vi.fn() },
      states: { "climate.office": { state: "heat", attributes: {
        current_temperature: 20, temperature: 21, min_temp: 7, max_temp: 35,
        hvac_modes: ["off", "heat", "cool"], fan_modes: ["auto", "high"],
        preset_modes: ["eco"], swing_modes: ["off", "vertical"],
        swing_horizontal_modes: ["off", "auto"], min_humidity: 30, max_humidity: 70,
      } } },
    } as never;
    card["_data"] = { zone_runtime: { "climate.office": { state: "scheduled", target_temperature: 21 } } };
    card["_loadSchedule"] = vi.fn().mockResolvedValue(undefined);

    card["_openClimateCardBoost"]("climate.office");
    card["_updateClimateCardBoostOption"]("hvacMode", "heat");
    card["_updateClimateCardBoostOption"]("fanMode", "high");
    card["_updateClimateCardBoostOption"]("presetMode", "eco");
    card["_updateClimateCardBoostOption"]("swingMode", "vertical");
    card["_updateClimateCardBoostOption"]("swingHorizontalMode", "auto");
    card["_updateClimateCardBoost"]("humidity", "50");
    await card["_runClimateCardService"]("boost", "climate.office");
    card["_openClimateCardPause"]("climate.office");
    card["_updateClimateCardPause"]("durationMinutes", "90");
    card["_updateClimateCardPause"]("action", "turn_off");
    await card["_runClimateCardService"]("pause", "climate.office");

    expect(callService).toHaveBeenNthCalledWith(1, "velair", "boost", {
      entity_id: "climate.office",
      duration_minutes: 60,
      temperature: 21,
      hvac_mode: "heat",
      fan_mode: "high",
      preset_mode: "eco",
      swing_mode: "vertical",
      swing_horizontal_mode: "auto",
      humidity: 50,
    });
    expect(callService).toHaveBeenNthCalledWith(2, "velair", "pause_zone", {
      entity_id: "climate.office",
      action: "turn_off",
      duration_minutes: 90,
    });
    expect(callService).not.toHaveBeenCalledWith("velair", "pause", expect.anything());
  });

  it("omits duration for an explicit indefinite pause", async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const card = document.createElement("velair-climate-card-actions-test") as VelairCard & Record<string, any>;
    card.hass = { callService, connection: { sendMessagePromise: vi.fn(), subscribeMessage: vi.fn() }, states: {} } as never;
    card["_loadSchedule"] = vi.fn().mockResolvedValue(undefined);
    card["_openClimateCardPause"]("climate.office");
    card["_updateClimateCardPause"]("indefinite", true);
    await card["_runClimateCardService"]("pause", "climate.office");
    expect(callService).toHaveBeenCalledWith("velair", "pause_zone", { entity_id: "climate.office", action: "none" });
  });

  it("toggles Boost and Pause panes from the same action and keeps them mutually exclusive", () => {
    const card = document.createElement("velair-climate-card-actions-test") as VelairCard & Record<string, any>;
    card.hass = { states: { "climate.office": { state: "heat", attributes: { current_temperature: 20, temperature: 21 } } } } as never;
    card["_data"] = { zone_runtime: { "climate.office": { state: "scheduled", target_temperature: 21 } } };

    card["_openClimateCardBoost"]("climate.office");
    expect(card["_climateCardBoost"]?.entityId).toBe("climate.office");
    expect(card["_climateCardPause"]).toBeUndefined();
    card["_openClimateCardBoost"]("climate.office");
    expect(card["_climateCardBoost"]).toBeUndefined();

    card["_openClimateCardPause"]("climate.office");
    expect(card["_climateCardPause"]?.entityId).toBe("climate.office");
    card["_openClimateCardBoost"]("climate.office");
    expect(card["_climateCardPause"]).toBeUndefined();
    expect(card["_climateCardBoost"]?.entityId).toBe("climate.office");
  });

  it("runs a configured Home Assistant script without interpreting its logic", async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const card = document.createElement("velair-climate-card-actions-test") as VelairCard & Record<string, any>;
    card.hass = {
      callService,
      connection: { sendMessagePromise: vi.fn(), subscribeMessage: vi.fn() },
      states: { "script.ventilate": { state: "off", attributes: { friendly_name: "Ventilate" } } },
    } as never;
    card["_showSuccess"] = vi.fn();
    await card["_runClimateCardScriptAction"]({
      name: "Ventilate",
      script: "script.ventilate",
      icon: "mdi:window-open-variant",
      color: "#03a9f4",
    }, 0);
    expect(callService).toHaveBeenCalledWith("script", "turn_on", { entity_id: "script.ventilate" });
    expect(card["_showSuccess"]).toHaveBeenCalled();
    expect(card["_climateCardScriptAction"]).toBeUndefined();
    expect(card["_climateCardScriptFeedback"]).toMatchObject({
      key: "0:script.ventilate",
      status: "success",
    });
    card["_clearClimateCardScriptFeedback"]();
  });

  it("keeps a short visual error result when a script call fails", async () => {
    const card = document.createElement("velair-climate-card-actions-test") as VelairCard & Record<string, any>;
    card.hass = {
      callService: vi.fn().mockRejectedValue(new Error("Service rejected")),
      connection: { sendMessagePromise: vi.fn(), subscribeMessage: vi.fn() },
      states: { "script.ventilate": { state: "off", attributes: {} } },
    } as never;
    await card["_runClimateCardScriptAction"]({ name: "Ventilate", script: "script.ventilate" }, 2);
    expect(card["_climateCardScriptAction"]).toBeUndefined();
    expect(card["_climateCardScriptFeedback"]).toEqual({
      key: "2:script.ventilate",
      status: "error",
      message: "Service rejected",
    });
    card["_clearClimateCardScriptFeedback"]();
  });

  it("tracks the available horizontal action scroll directions", () => {
    const card = document.createElement("velair-climate-card-actions-test") as VelairCard & Record<string, any>;
    const row = document.createElement("div");
    Object.defineProperties(row, {
      clientWidth: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 260 },
      scrollLeft: { configurable: true, value: 40, writable: true },
    });
    card["_handleClimateCardActionsScroll"]({ currentTarget: row } as Event);
    expect(card["_climateCardActionsHasOverflow"]).toBe(true);
    expect(card["_climateCardActionsCanScrollLeft"]).toBe(true);
    expect(card["_climateCardActionsCanScrollRight"]).toBe(true);

    row.scrollLeft = 160;
    card["_handleClimateCardActionsScroll"]({ currentTarget: row } as Event);
    expect(card["_climateCardActionsCanScrollLeft"]).toBe(true);
    expect(card["_climateCardActionsCanScrollRight"]).toBe(false);
  });

  it("adds action arrow slots only while the content exceeds the full available width", () => {
    const card = document.createElement("velair-climate-card-actions-test") as VelairCard & Record<string, any>;
    const viewport = document.createElement("div");
    const row = document.createElement("div");
    viewport.append(row);
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 220 },
    });
    Object.defineProperties(row, {
      clientWidth: { configurable: true, value: 172, writable: true },
      scrollWidth: { configurable: true, value: 200, writable: true },
      scrollLeft: { configurable: true, value: 0, writable: true },
    });

    card["_handleClimateCardActionsScroll"]({ currentTarget: row } as Event);

    expect(card["_climateCardActionsHasOverflow"]).toBe(false);
    expect(card["_climateCardActionsCanScrollLeft"]).toBe(false);
    expect(card["_climateCardActionsCanScrollRight"]).toBe(false);

    Object.defineProperty(row, "scrollWidth", { configurable: true, value: 300, writable: true });
    card["_handleClimateCardActionsScroll"]({ currentTarget: row } as Event);
    expect(card["_climateCardActionsHasOverflow"]).toBe(true);
    expect(card["_climateCardActionsCanScrollRight"]).toBe(true);

    Object.defineProperty(row, "scrollWidth", { configurable: true, value: 200, writable: true });
    card["_handleClimateCardActionsScroll"]({ currentTarget: row } as Event);
    expect(card["_climateCardActionsHasOverflow"]).toBe(false);
    expect(card["_climateCardActionsCanScrollLeft"]).toBe(false);
    expect(card["_climateCardActionsCanScrollRight"]).toBe(false);
  });

  it("honors confirmation and rejects missing scripts", async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const card = document.createElement("velair-climate-card-actions-test") as VelairCard & Record<string, any>;
    card.hass = {
      callService,
      connection: { sendMessagePromise: vi.fn(), subscribeMessage: vi.fn() },
      states: { "script.confirmed": { state: "off", attributes: {} } },
    } as never;
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await card["_runClimateCardScriptAction"]({ name: "Confirmed", script: "script.confirmed", confirmation: true }, 0);
    await card["_runClimateCardScriptAction"]({ name: "Missing", script: "script.missing" }, 1);
    expect(confirm).toHaveBeenCalled();
    expect(callService).not.toHaveBeenCalled();
    expect(card["_error"]).toBe("Script unavailable");
    confirm.mockRestore();
  });

  it("revalidates the script entity ID immediately before execution", async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const card = document.createElement("velair-climate-card-actions-test") as VelairCard & Record<string, any>;
    card.hass = {
      callService,
      connection: { sendMessagePromise: vi.fn(), subscribeMessage: vi.fn() },
      states: { "script.valid.extra": { state: "off", attributes: {} } },
    } as never;
    await card["_runClimateCardScriptAction"]({ name: "Invalid", script: "script.valid.extra" }, 0);
    expect(callService).not.toHaveBeenCalled();
    expect(card["_error"]).toBe("Script unavailable");
  });

  it("closes and cleans up More when state changes remove overflow", async () => {
    const card = document.createElement("velair-climate-card-actions-test") as VelairCard & Record<string, any>;
    const entityId = "climate.office";
    const scripts = ["one", "two", "three"];
    card.setConfig({
      view: "climate",
      selected_entity: entityId,
      climate_actions: [
        { type: "boost" }, { type: "pause" },
        ...scripts.map((name) => ({ type: "script", name, script: `script.${name}` })),
      ],
    });
    card["_data"] = {
      configured_entities: [entityId], temperature_unit: "°C", home_assistant_temperature_unit: "°C",
      temperature_migration: { required: false }, global: { mode: "auto" },
      settings: { first_weekday: "monday", zone_order: [] },
      zones: { [entityId]: { enabled: true, schedule: {} } }, operational_status: "running",
      next_event: null, next_events: [], active_overrides: {},
      zone_runtime: { [entityId]: { state: "scheduled", control_mode: "automatic" } },
    };
    card.hass = {
      callService: vi.fn(), connection: { sendMessagePromise: vi.fn(), subscribeMessage: vi.fn().mockResolvedValue(vi.fn()) },
      states: {
        [entityId]: { state: "heat", attributes: {} },
        ...Object.fromEntries(scripts.map((name) => [`script.${name}`, { state: "off", attributes: {} }])),
      },
    } as never;
    document.body.append(card);
    await card.updateComplete;
    expect(card.renderRoot.querySelector(".climate-card-actions-menu-trigger")).not.toBeNull();
    const removeListener = vi.spyOn(document, "removeEventListener");
    card["_openClimateCardActionsMenu"]();
    await card.updateComplete;
    await Promise.resolve();
    expect(card["_climateCardActionsMenuOpen"]).toBe(true);

    card["_data"] = {
      ...card["_data"],
      zone_runtime: { [entityId]: { state: "stopped", control_mode: "automatic" } },
    };
    await card.updateComplete;
    expect(card["_climateCardActionsMenuOpen"]).toBe(false);
    expect(card.renderRoot.querySelector(".climate-card-actions-menu")).toBeNull();
    expect(removeListener).toHaveBeenCalledWith("pointerdown", expect.any(Function), true);

    card["_data"] = {
      ...card["_data"],
      zone_runtime: { [entityId]: { state: "scheduled", control_mode: "automatic" } },
    };
    await card.updateComplete;
    expect(card.renderRoot.querySelector(".climate-card-actions-menu-trigger")).not.toBeNull();
    expect(card.renderRoot.querySelector(".climate-card-actions-menu")).toBeNull();
    removeListener.mockRestore();
    card.remove();
  });
});
