// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { VelairProfilesView } from "../../src/velair/components/profiles-view-element";
import { WEEKDAYS } from "../../src/velair/constants";
import type { ScheduleResponse } from "../../src/velair/types";

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

const cases = [false, true].flatMap(globalPresent =>
  ["heat", "cool", "external", "external-missing-capabilities"].flatMap(kind =>
    [false, true].map(populated => ({ globalPresent, kind, populated }))));

describe("Profile reopening (#50)", () => {
  it.each(cases)("opens, edits, saves and reopens $kind; populated=$populated, window.external=$globalPresent", async ({ globalPresent, kind, populated }) => {
    // Chromium's legacy global masks an undeclared identifier that fails in Safari.
    vi.stubGlobal("external", {});
    if (!globalPresent) Reflect.deleteProperty(globalThis, "external");
    const mode = kind === "cool" ? "cool" : "heat";
    const blocks = populated ? [{ start: "08:00", action: "set_temperature", temperature: 21, hvac_mode: mode }] : [];
    const schedule = Object.fromEntries(WEEKDAYS.map(day => [day, structuredClone(blocks)]));
    const capabilities = {
      can_publish: true, can_import: false, supports_profile_schedules: true,
      supported_actions: ["set_temperature"], supported_hvac_modes: ["heat"],
      supported_target_types: ["scalar"], supported_option_fields: [],
      max_switchpoints_per_day: 6, time_step_minutes: 5,
      implicit_midnight_change_counts_toward_limit: true,
    };
    let response = {
      configured_entities: ["climate.office"], global: { mode: "running", active_profile_ids: [] },
      temperature_unit: "°C", settings: { first_weekday: "monday", zone_order: [] }, templates: [],
      zones: { "climate.office": { enabled: true, schedule: {},
        ...(kind.startsWith("external") ? { execution: { type: "external", provider: "demo" } } : {}) } },
      ...(kind === "external" ? { external_execution: {
        systems: [{ provider: "demo", name: "Demo", entities: ["climate.office"], capabilities }], zones: {},
      } } : {}),
      profiles: [
        { key: "test", name: "Test", icon: "mdi:account", zones: { "climate.office": {
          behavior: "schedule", day_layout_key: "individual", template_links: {}, schedule,
        } } },
        { key: "other", name: "Other", zones: {} },
      ],
    } as unknown as ScheduleResponse;
    const sendMessagePromise = vi.fn().mockImplementation(async message => {
      expect(message.type).toBe("velair/set_profile");
      response = { ...response, profiles: response.profiles!.map(profile => profile.key === message.profile.key ? message.profile : profile) };
      return response;
    });
    const element = new VelairProfilesView();
    element.workspace = "profiles";
    element.scheduleWorkspace = true;
    element.initialWeekday = "monday";
    element.hass = {
      language: "en", connection: { sendMessagePromise },
      states: { "climate.office": { state: mode, attributes: {
        friendly_name: "Office", hvac_modes: ["off", mode], supported_features: 1,
        min_temp: 5, max_temp: 30, target_temp_step: 0.5,
      } } },
    } as never;
    element.data = response;
    document.body.append(element);
    await element.updateComplete;
    const select = async (index: number) => {
      element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".profile-item-main")[index].click();
      await element.updateComplete;
    };
    await select(0);
    expect(element.shadowRoot!.querySelector(".profile-editor")).not.toBeNull();
    expect(element.shadowRoot!.querySelectorAll(".editable-block")).toHaveLength(populated ? 1 : 0);

    const name = element.shadowRoot!.querySelector<HTMLInputElement>(".profile-name-field input")!;
    name.value = "Updated";
    name.dispatchEvent(new Event("input"));
    await element.updateComplete;
    const save = element.shadowRoot!.querySelector<HTMLButtonElement>(".profile-workspace-save button")!;
    expect(save.disabled).toBe(false);
    save.click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(element.shadowRoot!.querySelector<HTMLInputElement>(".profile-name-field input")!.value).toBe("Updated"));
    const saved = sendMessagePromise.mock.calls[0][0].profile;
    expect(saved.name).toBe("Updated");
    expect(saved.zones).toEqual({ "climate.office": {
      behavior: "schedule", day_layout_key: "individual", template_links: {}, schedule,
    } });
    await select(1);
    await select(0);
    expect(element.shadowRoot!.querySelector<HTMLInputElement>(".profile-name-field input")!.value).toBe("Updated");
    expect(element.shadowRoot!.querySelectorAll(".editable-block")).toHaveLength(populated ? 1 : 0);
    expect(response.profiles![0].zones["climate.office"]).toEqual(saved.zones["climate.office"]);

    // Exercise a real block edit (and adding the first block to an empty Profile).
    if (!populated) {
      element.shadowRoot!.querySelector<HTMLButtonElement>(".profile-block-list .draft-add-button")!.click();
      await element.updateComplete;
    }
    const temperature = element.shadowRoot!.querySelector<HTMLInputElement>(".editable-block .single-temperature-field input")!;
    temperature.value = "22";
    temperature.dispatchEvent(new Event("input"));
    await element.updateComplete;
    element.shadowRoot!.querySelector<HTMLButtonElement>(".profile-workspace-save button")!.click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledTimes(2));
    const editedSchedule = sendMessagePromise.mock.calls[1][0].profile.zones["climate.office"].schedule;
    expect(editedSchedule).toEqual({ ...schedule, monday: [{
      start: "08:00", action: "set_temperature", temperature: 22,
      ...(populated ? { hvac_mode: mode } : {}),
    }] });
    await select(1);
    await select(0);
    expect(element.shadowRoot!.querySelector<HTMLInputElement>(".single-temperature-field input")!.value).toBe("22");
  });

  it.each(["local", "external", "external-missing-capabilities"])("restores Keep guidance only for local execution: %s", async kind => {
    vi.stubGlobal("external", {});
    const element = new VelairProfilesView();
    element.workspace = "profiles";
    element.scheduleWorkspace = true;
    element.initialWeekday = "monday";
    element.hass = { language: "en", states: { "climate.office": {
      state: "heat_cool", attributes: { hvac_modes: ["off", "heat", "heat_cool"],
        supported_features: 3, min_temp: 5, max_temp: 30, target_temp_step: 0.5 },
    } } } as never;
    element.data = {
      configured_entities: ["climate.office"], global: { mode: "running", active_profile_ids: [] },
      settings: { first_weekday: "monday", zone_order: [] }, templates: [],
      zones: { "climate.office": { enabled: true, schedule: {},
        ...(kind !== "local" ? { execution: { type: "external", provider: "demo" } } : {}) } },
      ...(kind === "external" ? { external_execution: { systems: [{ provider: "demo", capabilities: {
        supported_actions: ["set_temperature"], supported_hvac_modes: ["heat", "heat_cool"],
        supported_target_types: ["scalar", "range"], supported_option_fields: [],
        max_switchpoints_per_day: 6, time_step_minutes: 5,
      } }], zones: {} } } : {}),
      profiles: [{ key: "test", name: "Test", zones: { "climate.office": {
        behavior: "schedule", schedule: { monday: [{ start: "08:00", action: "set_temperature", temperature: 21 }] },
      } } }],
    } as unknown as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;
    element.shadowRoot!.querySelector<HTMLButtonElement>(".profile-item-main")!.click();
    await element.updateComplete;
    expect(Boolean(element.shadowRoot!.querySelector(".block-mode-warning"))).toBe(kind === "local");
  });
});
