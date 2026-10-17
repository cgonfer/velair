// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { profileStyles } from "../../src/velair/styles/profile-styles";
import type { ClimateProfileDraft } from "../../src/velair/domain/climate-profiles";
import type { ScheduleResponse } from "../../src/velair/types";
import { VelairApiClient } from "../../src/velair/api/client";
import { WEEKDAYS } from "../../src/velair/constants";
import { VelairProfilesView } from "../../src/velair/components/profiles-view-element";

const data = {
  configured_entities: ["climate.office"],
  global: { mode: "running", active_profile_ids: ["away"] },
  profiles: [{ key: "away", name: "Away", color: "#123456", description: "Energy saving", zones: {} }],
  templates: [],
} as unknown as ScheduleResponse;

async function selectFirstProfile(element: VelairProfilesView): Promise<void> {
  (element.shadowRoot?.querySelector(".profile-item-main") as HTMLButtonElement).click();
  await element.updateComplete;
}

describe("profiles view", () => {
  it("filters copied Profile options and rejects a block with no supported controls", () => {
    const profiles = new VelairProfilesView();
    profiles.hass = {
      language: "en",
      states: {
        "climate.office": {
          state: "cool",
          attributes: { friendly_name: "Office", hvac_modes: ["off", "cool"],
            fan_modes: ["quiet"], preset_modes: [] },
        },
      },
    } as never;
    const internal = profiles as unknown as {
      _filterCopiedBlocks: (entityId: string, blocks: unknown) => Array<Record<string, unknown>>;
      _cloneCompatibilityError: (blocks: unknown, entityId: string) => string | undefined;
    };
    const mixed = [{ action: "set_climate_options", start: "08:00", hvac_mode: "",
      preset_mode: "eco", fan_mode: "quiet" }];
    expect(internal._filterCopiedBlocks("climate.office", mixed)).toEqual([{
      action: "set_climate_options", start: "08:00", hvac_mode: "", fan_mode: "quiet",
    }]);
    const unsupported = [{ action: "set_climate_options", start: "08:00",
      hvac_mode: "", preset_mode: "eco" }];
    expect(internal._cloneCompatibilityError(unsupported, "climate.office"))
      .toContain("Office");
  });

  it("accepts mode-only profile blocks on climates without temperature targets", () => {
    const profiles = new VelairProfilesView();
    profiles.hass = {
      language: "en",
      states: {
        "climate.office": {
          state: "auto",
          attributes: { friendly_name: "Office", hvac_modes: ["off", "auto"], supported_features: 0 },
        },
      },
    } as never;
    const blocks = [{
      action: "set_hvac_mode",
      hvac_mode: "auto",
      start: "08:00",
      temperature: 21,
      fan_mode: "quiet",
    }] as never;
    const cloneCompatibilityError = (profiles as unknown as {
      _cloneCompatibilityError: (value: unknown, entityId: string) => string | undefined;
    })._cloneCompatibilityError.bind(profiles);

    expect(cloneCompatibilityError(blocks, "climate.office")).toBeUndefined();
  });

  it("uses native Fahrenheit target-step priority for profile validation", () => {
    const profiles = new VelairProfilesView();
    profiles.data = {
      ...data,
      temperature_unit: "°F",
      zones: {
        "climate.office": {
          last_reported_target_temp_step: 0.9,
          target_temp_step_override: 1.8,
        },
      },
    } as unknown as ScheduleResponse;
    profiles.hass = {
      states: {
        "climate.office": { state: "heat", attributes: {} },
      },
    } as never;
    const temperatureStep = (profiles as unknown as {
      _entityTemperatureStep: (entityId: string) => number;
    })._entityTemperatureStep.bind(profiles);

    expect(temperatureStep("climate.office")).toBe(0.9);
    delete profiles.data.zones["climate.office"].last_reported_target_temp_step;
    expect(temperatureStep("climate.office")).toBe(1.8);
    profiles.hass.states!["climate.office"].attributes!.target_temp_step = 0.5;
    expect(temperatureStep("climate.office")).toBe(0.5);
  });

  it("separates the Profile schedules and Modes workspaces", async () => {
    const profiles = new VelairProfilesView();
    profiles.workspace = "profiles";
    profiles.scheduleWorkspace = true;
    profiles.data = data;
    document.body.append(profiles);
    await profiles.updateComplete;

    expect(profiles.shadowRoot?.querySelector(".profile-intro")).toBeNull();
    expect(profiles.shadowRoot?.querySelector(".profile-library > .library-concept-note")).toBeNull();
    expect(profiles.shadowRoot?.querySelector(".profile-library")).not.toBeNull();
    expect(profiles.shadowRoot?.querySelector(".mode-library")).toBeNull();
    expect(profiles.shadowRoot?.querySelector(".profile-library-selector")).toBeNull();
    expect(profiles.shadowRoot?.querySelector(".profile-item-activate")).not.toBeNull();

    const modes = new VelairProfilesView();
    modes.workspace = "modes";
    modes.data = data;
    document.body.append(modes);
    await modes.updateComplete;

    expect(modes.shadowRoot?.querySelector(".mode-library")).not.toBeNull();
    expect(modes.shadowRoot?.querySelector(".profile-library")).toBeNull();
    expect(modes.shadowRoot?.querySelector(".active-setup-card")).not.toBeNull();
    expect(modes.shadowRoot?.querySelector(".modes-view > .profile-intro")?.textContent)
      .toContain("Automations can select a Mode through the Velair Mode entity");
    expect(modes.shadowRoot?.querySelector(".mode-library > .library-concept-note")).toBeNull();
    expect(modes.shadowRoot?.querySelector(".mode-entity-note")).toBeNull();
    profiles.remove();
    modes.remove();
  });

  it("edits one selected thermostat at a time in the Profile schedules workspace", async () => {
    const element = new VelairProfilesView();
    element.workspace = "profiles";
    element.scheduleWorkspace = true;
    element.hass = {
      connection: {} as never,
      states: {
        "climate.office": { state: "heat", attributes: { friendly_name: "Office" } },
        "climate.bedroom": { state: "cool", attributes: { friendly_name: "Bedroom" } },
      },
    };
    element.data = {
      ...data,
      configured_entities: ["climate.office", "climate.bedroom"],
      profiles: [{
        ...(data.profiles ?? [])[0],
        zones: {
          "climate.office": { behavior: "normal" },
          "climate.bedroom": { behavior: "pause", action: "turn_off" },
        },
      }],
    } as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);

    expect(element.shadowRoot?.querySelectorAll(".profile-workspace-zone")).toHaveLength(1);
    expect(element.shadowRoot?.querySelectorAll(".profile-workspace-zone-picker .zone")).toHaveLength(2);
    expect(element.shadowRoot?.querySelectorAll(".profile-workspace-zone-copy small")[0]?.textContent)
      .toBe("Default schedule");
    expect(element.shadowRoot?.querySelectorAll(".profile-workspace-zone-copy small")[1]?.textContent)
      .toBe("Pause: Turn climate off");
    expect(element.shadowRoot?.querySelector(".profile-zone-actions select")?.textContent)
      .toContain("Profile schedule");

    (element.shadowRoot?.querySelectorAll<HTMLButtonElement>(".profile-workspace-zone-picker .zone")[1])?.click();
    await element.updateComplete;
    expect((element.shadowRoot?.querySelector(".profile-zone-actions select") as HTMLSelectElement).value).toBe("pause");
    expect(element.shadowRoot?.querySelector(".profile-pause-action")).not.toBeNull();
    expect(element.shadowRoot?.querySelector(".profile-workspace-zone-picker .zone.dirty")).toBeNull();
    element.remove();
  });

  it("offers external zones only representable Profile schedule behavior", async () => {
    const element = new VelairProfilesView();
    element.workspace = "profiles";
    element.scheduleWorkspace = true;
    element.initialWeekday = "monday";
    element.hass = {
      language: "en",
      states: {
        "climate.office": {
          state: "heat",
          attributes: { friendly_name: "Office", hvac_modes: ["off", "heat", "cool"] },
        },
      },
    } as never;
    element.data = {
      ...data,
      zones: {
        "climate.office": {
          enabled: true,
          schedule: {},
          execution: { type: "external", provider: "ramses_cc" },
        },
      },
      external_execution: {
        systems: [{
          provider: "ramses_cc",
          name: "RAMSES",
          entities: ["climate.office"],
          capabilities: {
            can_publish: true,
            can_import: false,
            supports_profile_schedules: true,
            supported_actions: ["set_temperature"],
            supported_hvac_modes: ["heat"],
            supported_target_types: ["scalar"],
            supported_option_fields: [],
            max_switchpoints_per_day: 6,
            time_step_minutes: 5,
            implicit_midnight_change_counts_toward_limit: true,
          },
        }],
        zones: {},
      },
      settings: { first_weekday: "sunday", zone_order: ["climate.office"] },
      profiles: [{
        ...(data.profiles ?? [])[0],
        zones: {
          "climate.office": {
            behavior: "schedule",
            schedule: {
              monday: [
                { start: "10:00", action: "set_temperature", temperature: 19, hvac_mode: "heat" },
                { start: "18:05", action: "set_temperature", temperature: 20, hvac_mode: "heat" },
              ],
            },
          },
        },
      }],
    } as unknown as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);

    const behaviorOptions = [...element.shadowRoot?.querySelectorAll(".profile-zone-actions option") ?? []]
      .map((option) => (option as HTMLOptionElement).value);
    expect(behaviorOptions).toEqual(["unconfigured", "normal", "schedule"]);
    expect(element.shadowRoot?.textContent).toContain(
      "External zones support Default, Profile or Mode schedules only",
    );
    expect((element.shadowRoot?.querySelector(".profile-zone-actions select") as HTMLSelectElement).value)
      .toBe("schedule");
    expect(element.shadowRoot?.textContent).toContain("3 of 6 controller switchpoints");
    expect(element.shadowRoot?.querySelector(".external-switchpoint-usage")?.textContent)
      .toContain("3 of 6 controller switchpoints");
    expect(element.shadowRoot?.querySelector(".external-switchpoint-usage")?.textContent)
      .toContain("2 scheduled blocks + 1 midnight continuity point");
    element.remove();
  });

  it("marks the thermostat and weekday whose atomic Profile draft changed", async () => {
    const profile = {
      key: "workday",
      name: "Workday",
      zones: {
        "climate.office": {
          behavior: "schedule",
          schedule: { monday: [{ start: "08:00", action: "set_temperature", temperature: 20, hvac_mode: "heat" }] },
        },
      },
    };
    const element = new VelairProfilesView();
    element.workspace = "profiles";
    element.scheduleWorkspace = true;
    element.initialWeekday = "wednesday";
    element.timelineNow = new Date(2026, 7, 12, 12, 20, 0);
    element.hass = {
      language: "en",
      states: { "climate.office": { state: "heat", attributes: { friendly_name: "Office" } } },
    } as never;
    element.data = {
      ...data,
      configured_entities: ["climate.office"],
      profiles: [profile],
      settings: { first_weekday: "monday", zone_order: ["climate.office"] },
    } as unknown as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);

    expect(element.shadowRoot?.querySelector(".day-tab.active")?.textContent).toContain("Wed");
    expect(element.shadowRoot?.querySelector(".timeline-now-marker span")?.textContent).toBe("12:20");
    expect(element.shadowRoot?.querySelector(".profile-workspace-zone-option.dirty")).toBeNull();
    expect(element.shadowRoot?.querySelector(".day-tab.dirty")).toBeNull();

    const state = element as unknown as { _draft: ClimateProfileDraft };
    const zone = state._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule zone");
    zone.schedule.monday[0].temperature = "21";
    element.requestUpdate();
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector(".profile-workspace-zone-option.dirty")).not.toBeNull();
    expect(element.shadowRoot?.querySelector(".day-tab.dirty")?.getAttribute("aria-label"))
      .toContain("unsaved");

    zone.schedule.monday[0].temperature = "20";
    (element as unknown as { _setDirty: (dirty: boolean) => void })._setDirty(true);
    element.requestUpdate();
    await element.updateComplete;
    expect((element as unknown as { _dirty: boolean })._dirty).toBe(false);
    expect(element.shadowRoot?.querySelector(".profile-workspace-zone-option.dirty")).toBeNull();
    expect(element.shadowRoot?.querySelector(".day-tab.dirty")).toBeNull();
    element.remove();
  });

  it("uses the persisted Profile payload when detecting reverted scalar, range, humidity, and Off edits", async () => {
    const profile = {
      key: "canonical",
      name: "Canonical",
      zones: {
        "climate.office": {
          behavior: "schedule",
          schedule: { monday: [
            { start: "06:00", action: "set_temperature", temperature: 20, hvac_mode: "heat", humidity: 45 },
            { start: "12:00", action: "set_temperature", target_temp_low: 19, target_temp_high: 24, hvac_mode: "heat_cool" },
            { start: "22:00", action: "turn_off" },
          ] },
        },
      },
    };
    const element = new VelairProfilesView();
    element.workspace = "profiles";
    element.scheduleWorkspace = true;
    element.hass = {
      language: "en",
      states: { "climate.office": { state: "heat", attributes: { friendly_name: "Office" } } },
    } as never;
    element.data = {
      ...data,
      configured_entities: ["climate.office"],
      profiles: [profile],
      settings: { first_weekday: "monday", zone_order: ["climate.office"] },
    } as unknown as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);

    const state = element as unknown as {
      _draft: ClimateProfileDraft;
      _dirty: boolean;
      _setDirty: (dirty: boolean) => void;
    };
    const zone = state._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule zone");
    const [scalar, range, off] = zone.schedule.monday;

    scalar.temperature = "20";
    scalar.humidity = "45";
    range.target_temp_low = "19";
    range.target_temp_high = "24";
    off.temperature = "99";
    off.hvac_mode = "heat";
    state._setDirty(true);
    expect(state._dirty).toBe(false);

    range.target_temp_high = "25";
    state._setDirty(true);
    await element.updateComplete;
    expect(state._dirty).toBe(true);
    expect(element.shadowRoot?.querySelector(".profile-workspace-zone-option.dirty")).not.toBeNull();

    range.target_temp_high = "24";
    state._setDirty(true);
    await element.updateComplete;
    expect(state._dirty).toBe(false);
    element.remove();
  });

  it("uses the shared weekly section order and saves scalar, range, Off, and options atomically", async () => {
    const profile = {
      key: "mixed",
      name: "Mixed",
      zones: {
        "climate.office": {
          behavior: "schedule",
          schedule: {
            monday: [
              { start: "00:00", action: "set_temperature", temperature: 20, hvac_mode: "heat", fan_mode: "auto", preset_mode: "eco", swing_mode: "on", swing_horizontal_mode: "middle", humidity: 45 },
              { start: "08:00", action: "set_temperature", target_temp_low: 19, target_temp_high: 24, hvac_mode: "heat_cool" },
              { start: "22:00", action: "turn_off", hvac_mode: "off" },
            ],
          },
        },
      },
    };
    const response = { ...data, profiles: [profile], settings: { first_weekday: "monday", zone_order: [] } } as unknown as ScheduleResponse;
    const sendMessagePromise = vi.fn().mockResolvedValue(response);
    const element = new VelairProfilesView();
    element.workspace = "profiles";
    element.scheduleWorkspace = true;
    element.hass = {
      language: "en",
      connection: { sendMessagePromise },
      states: {
        "climate.office": {
          state: "heat",
          attributes: {
            friendly_name: "Office",
            supported_features: 3,
            hvac_modes: ["off", "heat", "cool", "heat_cool"],
            fan_modes: ["auto"], preset_modes: ["eco"], swing_modes: ["on"],
            swing_horizontal_modes: ["middle"], min_humidity: 30, max_humidity: 70,
            min_temp: 7, max_temp: 35, target_temp_step: 0.5,
          },
        },
      },
    } as never;
    element.data = response;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);

    const week = element.shadowRoot!.querySelector(".profile-week")!;
    expect(week.querySelectorAll(".schedule-step-heading .inline-help")).toHaveLength(0);
    const ordered = [".day-tabs", ".timeline-panel", ".schedule-config-row", ".profile-block-list", ".schedule-save-actions", ".profile-day-copy"]
      .map((selector) => week.querySelector(selector)!);
    ordered.slice(0, -1).forEach((node, index) => {
      expect(node.compareDocumentPosition(ordered[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    expect(element.shadowRoot?.querySelector(".temperature-range-fields")).not.toBeNull();
    expect(element.shadowRoot?.querySelectorAll(".editable-block")).toHaveLength(3);
    expect(element.shadowRoot?.querySelector(".advanced-climate-options")).not.toBeNull();

    const name = element.shadowRoot!.querySelector<HTMLInputElement>(".profile-name-field input")!;
    name.value = "Mixed updated";
    name.dispatchEvent(new Event("input"));
    await element.updateComplete;
    element.shadowRoot!.querySelector<HTMLButtonElement>(".profile-workspace-save button")!.click();

    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledTimes(1));
    const message = sendMessagePromise.mock.calls[0][0];
    expect(message.type).toBe("velair/set_profile");
    expect(message.profile.name).toBe("Mixed updated");
    expect(message.profile.zones["climate.office"].schedule.monday).toEqual([
      profile.zones["climate.office"].schedule.monday[0],
      profile.zones["climate.office"].schedule.monday[1],
      { start: "22:00", action: "turn_off" },
    ]);
    element.remove();
  });

  it("marks a non-selected thermostat whose Profile schedule is invalid", async () => {
    const element = new VelairProfilesView();
    element.workspace = "profiles";
    element.scheduleWorkspace = true;
    element.hass = {
      language: "en",
      states: {
        "climate.office": { state: "heat", attributes: { friendly_name: "Office", supported_features: 1, hvac_modes: ["off", "heat"], min_temp: 5, max_temp: 35, target_temp_step: 0.5 } },
        "climate.bedroom": { state: "cool", attributes: { friendly_name: "Bedroom", supported_features: 1, hvac_modes: ["off", "cool"], min_temp: 10, max_temp: 30, target_temp_step: 1 } },
      },
    } as never;
    element.data = {
      ...data,
      configured_entities: ["climate.office", "climate.bedroom"],
      settings: { first_weekday: "monday", zone_order: [] },
      profiles: [{
        key: "invalid", name: "Invalid", zones: {
          "climate.office": { behavior: "schedule", schedule: { monday: [{ start: "08:00", action: "set_temperature", temperature: 20, hvac_mode: "heat" }] } },
          "climate.bedroom": { behavior: "schedule", schedule: { monday: [{ start: "09:00", action: "set_temperature", temperature: 35, hvac_mode: "cool" }] } },
        },
      }],
    } as unknown as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);

    const buttons = element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".profile-workspace-zone-picker .zone");
    expect(buttons[0].classList).not.toContain("error");
    expect(buttons[1].classList).toContain("error");
    expect(buttons[1].getAttribute("aria-invalid")).toBe("true");
    expect(buttons[1].title).toContain("Bedroom, Monday at 09:00");
    expect(element.shadowRoot?.querySelector(".profile-schedule-error")?.textContent).toContain("Bedroom");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>(".profile-workspace-save button")!.disabled).toBe(true);
    element.remove();
  });

  it("shows only the selected climate detail when deleting its Heat target temperature", async () => {
    vi.useFakeTimers();
    try {
      const element = new VelairProfilesView();
      element.workspace = "profiles";
      element.scheduleWorkspace = true;
      element.hass = {
        language: "en",
        states: {
          "climate.office": { state: "heat", attributes: { friendly_name: "Office", supported_features: 1, hvac_modes: ["off", "heat"], min_temp: 5, max_temp: 25, target_temp_step: 0.5 } },
        },
      } as never;
      element.data = {
        ...data,
        configured_entities: ["climate.office"],
        settings: { first_weekday: "monday", zone_order: [] },
        profiles: [{
          key: "winter", name: "Winter", zones: {
            "climate.office": { behavior: "schedule", schedule: { monday: [{ start: "00:00", action: "set_temperature", temperature: 21, hvac_mode: "heat" }] } },
          },
        }],
      } as unknown as ScheduleResponse;
      document.body.append(element);
      await element.updateComplete;
      await selectFirstProfile(element);

      const input = element.shadowRoot!.querySelector<HTMLInputElement>(".editable-block input[type=number]")!;
      input.value = "";
      input.dispatchEvent(new Event("input"));
      await element.updateComplete;

      const stack = element.shadowRoot!.querySelector(".profile-schedule-error .notice-stack.contextual");
      const notices = stack?.querySelectorAll(".notice");
      expect(notices).toHaveLength(1);
      expect(notices?.[0]?.textContent).toContain("Office, Monday at 00:00: Use 5 to 25");
      expect(stack?.textContent).not.toContain("Review the invalid schedule");
      expect(stack?.getAttribute("aria-live")).toBe("polite");
      expect(stack?.querySelector('[role="alert"]')).toBeNull();
      expect(element.shadowRoot!.querySelector(".profile-zone-error")).toBeNull();

      input.value = "22";
      input.dispatchEvent(new Event("input"));
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector(".notice-row.leaving")).not.toBeNull();
      await vi.advanceTimersByTimeAsync(140);
      await element.updateComplete;
      const emptyLiveRegion = element.shadowRoot!.querySelector(".profile-schedule-error .notice-stack.contextual");
      expect(emptyLiveRegion).not.toBeNull();
      expect(emptyLiveRegion?.querySelectorAll(".notice-row")).toHaveLength(0);
      expect(emptyLiveRegion?.getAttribute("aria-live")).toBe("polite");
      element.remove();
    } finally {
      vi.useRealTimers();
    }
  });

  it("stacks a summary and the selected detail when several climate schedules are invalid", async () => {
    const element = new VelairProfilesView();
    element.workspace = "profiles";
    element.scheduleWorkspace = true;
    element.hass = {
      language: "en",
      states: {
        "climate.office": { state: "heat", attributes: { friendly_name: "Office", supported_features: 1, hvac_modes: ["off", "heat"], min_temp: 5, max_temp: 25, target_temp_step: 0.5 } },
        "climate.bedroom": { state: "cool", attributes: { friendly_name: "Bedroom", supported_features: 1, hvac_modes: ["off", "cool"], min_temp: 10, max_temp: 30, target_temp_step: 1 } },
      },
    } as never;
    element.data = {
      ...data,
      configured_entities: ["climate.office", "climate.bedroom"],
      settings: { first_weekday: "monday", zone_order: [] },
      profiles: [{ key: "invalid", name: "Invalid", zones: {
        "climate.office": { behavior: "schedule", schedule: { monday: [{ start: "08:00", action: "set_temperature", temperature: 30, hvac_mode: "heat" }] } },
        "climate.bedroom": { behavior: "schedule", schedule: { monday: [{ start: "09:00", action: "set_temperature", temperature: 35, hvac_mode: "cool" }] } },
      } }],
    } as unknown as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);

    const rows = element.shadowRoot!.querySelectorAll(".profile-schedule-error .notice-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain("Review the invalid schedule in: Office, Bedroom");
    expect(rows[1]?.textContent).toContain("Office, Monday at 08:00: Use 5 to 25");
    element.remove();
  });

  it("identifies a non-selected thermostat with duplicate Profile block times", async () => {
    const element = new VelairProfilesView();
    element.workspace = "profiles";
    element.scheduleWorkspace = true;
    element.hass = {
      language: "en",
      states: {
        "climate.office": { state: "heat", attributes: { friendly_name: "Office", supported_features: 1, hvac_modes: ["off", "heat"], min_temp: 5, max_temp: 35, target_temp_step: 0.5 } },
        "climate.bedroom": { state: "cool", attributes: { friendly_name: "Bedroom", supported_features: 1, hvac_modes: ["off", "cool"], min_temp: 10, max_temp: 30, target_temp_step: 1 } },
      },
    } as never;
    element.data = {
      ...data,
      configured_entities: ["climate.office", "climate.bedroom"],
      settings: { first_weekday: "monday", zone_order: [] },
      profiles: [{
        key: "duplicate", name: "Duplicate", zones: {
          "climate.office": { behavior: "schedule", schedule: { monday: [{ start: "08:00", action: "set_temperature", temperature: 20, hvac_mode: "heat" }] } },
          "climate.bedroom": { behavior: "schedule", schedule: { monday: [
            { start: "09:00", action: "set_temperature", temperature: 24, hvac_mode: "cool" },
            { start: "09:00", action: "set_temperature", temperature: 23, hvac_mode: "cool" },
          ] } },
        },
      }],
    } as unknown as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);

    const bedroom = element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".profile-workspace-zone-picker .zone")[1];
    expect(bedroom.classList).toContain("error");
    expect(bedroom.title).toContain("Duplicate start time: 09:00");
    expect(element.shadowRoot?.querySelector(".profile-schedule-error")?.textContent).toContain("Bedroom");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>(".profile-workspace-save button")!.disabled).toBe(true);
    element.remove();
  });

  it("starts in the Profiles library and exposes an accessible Profiles and Modes switcher", async () => {
    const element = new VelairProfilesView();
    element.data = {
      ...data,
      modes: [{ key: "away-mode", name: "Away mode", profile_ids: ["away"] }],
    } as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;

    const tablist = element.shadowRoot?.querySelector('[role="tablist"]');
    const tabs = [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const profilesPanel = element.shadowRoot?.querySelector<HTMLElement>("#profiles-library-panel");
    const modesPanel = element.shadowRoot?.querySelector<HTMLElement>("#modes-library-panel");

    expect(tablist?.getAttribute("aria-label")).toBe("Profile and Mode libraries");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]?.textContent).toContain("Profiles");
    expect(tabs[0]?.textContent).toContain("Define how selected zones should behave.");
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(tabs[0]?.getAttribute("aria-controls")).toBe("profiles-library-panel");
    expect(tabs[0]?.getAttribute("tabindex")).toBe("0");
    expect(tabs[1]?.textContent).toContain("Modes");
    expect(tabs[1]?.textContent).toContain("Activate one or more Profiles together.");
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("false");
    expect(tabs[1]?.getAttribute("aria-controls")).toBe("modes-library-panel");
    expect(profilesPanel?.getAttribute("role")).toBe("tabpanel");
    expect(profilesPanel?.hidden).toBe(false);
    expect(modesPanel?.hidden).toBe(true);
    expect(profilesPanel?.querySelector(".library-concept-note")?.textContent)
      .toContain("A Profile defines how one or more zones behave when it is active.");

    tabs[1]?.click();
    await element.updateComplete;

    expect(tabs[0]?.getAttribute("aria-selected")).toBe("false");
    expect(tabs[0]?.getAttribute("tabindex")).toBe("-1");
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(tabs[1]?.getAttribute("tabindex")).toBe("0");
    expect(profilesPanel?.hidden).toBe(true);
    expect(modesPanel?.hidden).toBe(false);
    expect(modesPanel?.querySelector(".library-concept-note")?.textContent)
      .toContain("A Mode activates one or more Profiles together from Velair or Home Assistant.");

    tabs[1]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await element.updateComplete;
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(profilesPanel?.hidden).toBe(false);
    element.remove();
  });

  it("shows the unified active setup card in compact overview mode", async () => {
    const element = new VelairProfilesView();
    element.compact = true;
    element.data = data;
    document.body.append(element);
    await element.updateComplete;

    const setup = element.shadowRoot?.querySelector(".active-setup-card");
    expect(setup?.getAttribute("aria-label")).toBe("Active setup");
    expect(setup?.querySelector(".active-setup-mode")?.textContent).toContain("Profile");
    expect(setup?.querySelector(".active-setup-summary")?.textContent).not.toContain("Manual");
    expect(setup?.textContent).toContain("Away");
    expect(setup?.querySelector(".active-setup-mode strong")?.textContent).toBe("Away");
    expect(setup?.querySelector(".active-setup-summary-icon ha-icon")?.getAttribute("icon")).toBe("mdi:account-outline");
    expect(setup?.querySelector("details")).not.toBeNull();
    expect(setup?.querySelector("summary")?.textContent).toContain("Change");
    expect(setup?.querySelector('[data-mode-selection="manual"]')).toBeNull();
    expect(setup?.querySelector('[data-profile-id="away"]')?.getAttribute("aria-current")).toBe("true");
    expect(element.shadowRoot?.querySelector(".profile-editor")).toBeNull();
    element.remove();
  });

  it("disables conflicting activation controls while a global operation is running", async () => {
    const element = new VelairProfilesView();
    element.compact = true;
    element.data = {
      ...data,
      operation_status: {
        id: "operation-1",
        kind: "mode_change",
        state: "running",
        target_id: "away-mode",
        completed: 1,
        total: 2,
        current_entity_id: "climate.office",
        failed_entity_ids: [],
        started_at: "2026-07-29T12:00:00+00:00",
        finished_at: null,
      },
    } as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector(".active-setup-change")?.getAttribute("aria-disabled"))
      .toBe("true");
    expect((element.shadowRoot?.querySelector('[data-mode-selection="default"]') as HTMLButtonElement).disabled)
      .toBe(true);
    expect((element.shadowRoot?.querySelector('[data-profile-id="away"]') as HTMLButtonElement).disabled)
      .toBe(true);
    element.remove();
  });

  it("limits Lovelace active setup actions while keeping complete state visible", async () => {
    const element = new VelairProfilesView();
    element.compact = true;
    element.activeSetupControls = "modes";
    element.data = {
      ...data,
      modes: [{ key: "away-mode", name: "Away mode", profile_ids: ["away"] }],
      active_mode_id: "away-mode",
    } as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector("#active-setup-modes-heading")).not.toBeNull();
    expect(element.shadowRoot?.querySelector("#active-setup-profiles-heading")).toBeNull();
    expect(element.shadowRoot?.querySelector('[data-mode-selection="custom:away-mode"]')).not.toBeNull();
    expect(element.shadowRoot?.querySelector('[data-profile-id="away"]')).toBeNull();
    expect(element.shadowRoot?.querySelector(".active-setup-mode")?.textContent).toContain("Away");

    element.activeSetupControls = "profiles";
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector("#active-setup-modes-heading")).toBeNull();
    expect(element.shadowRoot?.querySelector("#active-setup-profiles-heading")).not.toBeNull();
    expect(element.shadowRoot?.querySelector('[data-mode-selection="custom:away-mode"]')).toBeNull();
    expect(element.shadowRoot?.querySelector('[data-mode-selection="default"]')).not.toBeNull();
    expect(element.shadowRoot?.querySelector('[data-profile-id="away"]')).not.toBeNull();
    expect(element.shadowRoot?.querySelector(".active-setup-mode")?.textContent).toContain("Away");
    expect(element.shadowRoot?.querySelector("#active-setup-profiles-heading")?.parentElement?.textContent)
      .toContain("Select a Profile to replace the base");

    (element as unknown as { activeSetupControls: string }).activeSetupControls = "invalid";
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector("#active-setup-modes-heading")).not.toBeNull();
    expect(element.shadowRoot?.querySelector("#active-setup-profiles-heading")).not.toBeNull();

    element.remove();
  });

  it("renders a multi-Profile Mode and active set without a singular fallback", async () => {
    const element = new VelairProfilesView();
    element.data = {
      ...data,
      configured_entities: ["climate.office", "climate.bedroom"],
      global: { mode: "running", active_profile_ids: ["away", "sleep"] },
      profiles: [
        ...data.profiles!,
        {
          key: "sleep",
          name: "Sleep",
          icon: "mdi:bed-outline",
          color: "#654321",
          description: "Bedroom routine",
          zones: {
            "climate.bedroom": { behavior: "pause", action: "none" },
          },
        },
      ],
      modes: [
        {
          key: "night",
          name: "Night",
          profile_ids: ["away", "sleep"],
        },
      ],
      active_mode_id: "night",
    } as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;

    const setup = element.shadowRoot?.querySelector(".active-setup-card");
    expect(setup?.querySelector(".active-setup-mode")?.textContent).toContain("Night");
    expect(setup?.querySelector(".active-setup-mode strong")?.textContent).toBe("Night");
    expect(setup?.querySelector(".active-setup-profile-list")).toBeNull();
    expect(setup?.querySelector('[data-mode-selection="custom:night"]')?.getAttribute("aria-current")).toBe("true");
    expect(setup?.querySelectorAll('[data-profile-id][aria-current="true"]')).toHaveLength(0);
    expect(setup?.querySelector('[data-mode-selection="custom:night"] .active-setup-linked-profiles')?.textContent)
      .toContain("Sleep");
    expect(element.shadowRoot?.querySelectorAll(".mode-item:not(.built-in) .mode-profile-avatar")).toHaveLength(2);
    element.remove();
  });

  it("renders a Manual multi-Profile setup without treating one Profile as the manual selection", async () => {
    const element = new VelairProfilesView();
    element.compact = true;
    element.data = {
      ...data,
      global: { mode: "running", active_profile_ids: ["away", "home"] },
      profiles: [
        ...(data.profiles ?? []),
        { key: "home", name: "Home", icon: "mdi:home-outline", color: "#abcdef", zones: {} },
      ],
      active_mode_id: null,
    } as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;

    const setup = element.shadowRoot?.querySelector(".active-setup-card");
    expect(setup?.querySelector(".active-setup-mode")?.textContent).toContain("Away, Home");
    expect(setup?.querySelector(".active-setup-mode")?.textContent).toContain("Profiles");
    expect(setup?.querySelector('[data-mode-selection="manual"]')).toBeNull();
    expect(setup?.querySelectorAll('[data-profile-id][aria-current="true"]')).toHaveLength(0);
    element.remove();
  });

  it("resynchronizes the active setup summary when profile data arrives after rendering", async () => {
    const element = new VelairProfilesView();
    element.compact = true;
    element.data = {
      ...data,
      global: { mode: "running", active_profile_ids: [] },
    } as unknown as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".active-setup-no-profiles")?.textContent).toContain("No exceptions");
    expect(element.shadowRoot?.querySelector('[data-mode-selection="manual"]')).toBeNull();

    element.data = data;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".active-setup-mode")?.textContent).toContain("Away");
    element.remove();
  });

  it("shows Default, a custom Mode, and Manual in the shared active context", async () => {
    const element = new VelairProfilesView();
    element.compact = true;
    element.data = {
      ...data,
      modes: [{ key: "vacation", name: "Vacation", profile_ids: ["away"] }],
      active_mode_id: "vacation",
    } as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector(".active-setup-mode")?.textContent).toContain("Vacation");
    expect(element.shadowRoot?.querySelector(".active-setup-base-components")).toBeNull();
    expect(element.shadowRoot?.querySelector(".active-setup-linked-profiles")?.textContent).toContain("Away");
    expect(element.shadowRoot?.querySelector(".mode-library")).toBeNull();

    element.data = {
      ...element.data,
      active_mode_id: null,
    } as ScheduleResponse;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".active-setup-mode")?.textContent).toContain("Profile");

    element.data = { ...element.data, global: { mode: "running", active_profile_ids: [] } } as ScheduleResponse;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".active-setup-mode")?.textContent).toContain("Default");
    element.remove();
  });

  it("renders built-in values and the Velair-owned Home Assistant entity", async () => {
    const element = new VelairProfilesView();
    element.data = { ...data, modes: [] } as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector(".mode-entity-note")?.textContent).toContain("Velair Mode entity");
    expect(element.shadowRoot?.querySelector(".mode-entity-note")?.textContent).not.toContain("select.velair_mode");
    expect(element.shadowRoot?.querySelector(".mode-entity-note")?.textContent).toContain("velair.activate_profile");
    expect(element.shadowRoot?.querySelector(".mode-entity-note code")).toBeNull();
    expect([...element.shadowRoot!.querySelectorAll(".mode-item.built-in")].map((item) => item.textContent))
      .toEqual(expect.arrayContaining([expect.stringContaining("Default"), expect.stringContaining("Manual")]));
    expect(element.shadowRoot?.querySelectorAll(".mode-item.built-in .mode-delete")).toHaveLength(0);
    const helpButtons = element.shadowRoot?.querySelectorAll<HTMLButtonElement>(".mode-item.built-in .inline-help");
    expect(helpButtons).toHaveLength(2);
    expect(helpButtons?.[0]?.parentElement?.querySelector('[role="tooltip"]')?.textContent).toContain("Deactivates profiles");
    expect(helpButtons?.[1]?.parentElement?.querySelector('[role="tooltip"]')?.textContent)
      .toContain("Active Profiles are not controlled by a Mode.");
    expect(helpButtons?.[0]?.getAttribute("aria-label")).toBe("About Default");
    expect(helpButtons?.[0]?.getAttribute("aria-label")).not.toBe(
      helpButtons?.[0]?.parentElement?.querySelector('[role="tooltip"]')?.textContent,
    );
    expect(helpButtons?.[0]?.getAttribute("aria-describedby")).toBe("mode-default-help");
    const modeCreate = element.shadowRoot?.querySelector(".mode-create");
    expect(modeCreate?.closest(".template-list-heading")?.textContent).toContain("Modes (2)");
    element.remove();
  });

  it("changes Default and custom Modes without offering Manual as an action", async () => {
    const custom = {
      ...data,
      modes: [{ key: "vacation-key", name: "Vacation", profile_ids: ["away"] }],
      active_mode_id: null,
    } as ScheduleResponse;
    const sendMessagePromise = vi.fn()
      .mockResolvedValueOnce({ ...custom, active_mode_id: "vacation-key" })
      .mockResolvedValueOnce({
        ...custom,
        global: { ...custom.global, active_profile_ids: [] },
        active_mode_id: null,
      });
    const element = new VelairProfilesView();
    element.compact = true;
    element.hass = { connection: { sendMessagePromise }, states: {} } as never;
    element.data = custom;
    document.body.append(element);
    await element.updateComplete;

    let menu = element.shadowRoot?.querySelector(".active-setup-menu") as HTMLDetailsElement;
    menu.open = true;
    (menu.querySelector('[data-mode-selection="custom:vacation-key"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "velair/select_mode",
      selection: { kind: "custom", key: "vacation-key" },
    }));
    await vi.waitFor(() => expect((element.shadowRoot?.querySelector(".active-setup-menu") as HTMLDetailsElement).open).toBe(false));
    expect(element.shadowRoot?.activeElement?.classList.contains("active-setup-change")).toBe(true);
    expect(element.shadowRoot?.querySelector(".active-setup-mode")?.textContent).toContain("Vacation");

    menu = element.shadowRoot?.querySelector(".active-setup-menu") as HTMLDetailsElement;
    expect(menu.querySelector('[data-mode-selection="manual"]')).toBeNull();
    menu.open = true;
    (menu.querySelector('[data-mode-selection="default"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "velair/select_mode",
      selection: { kind: "default" },
    }));
    await vi.waitFor(() => expect((element.shadowRoot?.querySelector(".active-setup-menu") as HTMLDetailsElement).open).toBe(false));
    element.remove();
  });

  it.each([false, true])("updates the Modes list after applying Default (failure: %s)", async (fails) => {
    const custom = {
      ...data,
      modes: [{ key: "vacation", name: "Vacation", profile_ids: ["away"] }],
      active_mode_id: "vacation",
    } as ScheduleResponse;
    const sendMessagePromise = fails
      ? vi.fn().mockRejectedValue(new Error("Unable to apply Default"))
      : vi.fn().mockResolvedValue({
        ...custom,
        global: { ...custom.global, active_profile_ids: [] },
        active_mode_id: null,
      });
    const element = new VelairProfilesView();
    element.workspace = "modes";
    element.hass = { connection: { sendMessagePromise }, states: {} } as never;
    element.data = custom;
    document.body.append(element);
    await element.updateComplete;
    (element.shadowRoot!.querySelector(".mode-item.custom .mode-item-main") as HTMLButtonElement).click();
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".mode-item.custom.active")).not.toBeNull();

    (element.shadowRoot!.querySelector('[data-mode-selection="default"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "velair/select_mode", selection: { kind: "default" },
    }));
    await vi.waitFor(() => {
      expect(element.shadowRoot!.querySelector(".mode-item.custom.active") !== null).toBe(fails);
      const defaultRow = element.shadowRoot!.querySelector(".mode-item.built-in")!;
      expect(defaultRow.classList.contains("active")).toBe(!fails);
      expect(defaultRow.getAttribute("aria-current")).toBe(String(!fails));
      expect(element.shadowRoot!.querySelector(".mode-editor") !== null).toBe(fails);
    });
    element.remove();
  });

  it("closes the active setup chooser with Escape or an outside click but not on explanatory text", async () => {
    const element = new VelairProfilesView();
    element.compact = true;
    element.data = data;
    document.body.append(element);
    await element.updateComplete;

    const menu = element.shadowRoot?.querySelector(".active-setup-menu") as HTMLDetailsElement;
    const summary = menu.querySelector("summary") as HTMLElement;
    menu.open = true;
    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(menu.open).toBe(false);
    expect(element.shadowRoot?.activeElement).toBe(summary);

    menu.open = true;
    const explanatoryText = menu.querySelector(".active-setup-group-heading small") as HTMLElement;
    explanatoryText.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    expect(menu.open).toBe(true);

    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    expect(menu.open).toBe(false);

    menu.open = true;
    element.remove();
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    expect(menu.open).toBe(true);
  });

  it("groups manual Profile activation separately and reuses the direct activation payload", async () => {
    const home = {
      key: "home",
      name: "Home",
      icon: "mdi:home-outline",
      color: "#abcdef",
      description: "Comfort routine",
      zones: {},
    };
    const configured = {
      ...data,
      profiles: [...(data.profiles ?? []), home],
      modes: [{ key: "vacation", name: "Vacation", profile_ids: ["away"] }],
      active_mode_id: "vacation",
    } as ScheduleResponse;
    const response = {
      ...configured,
      global: { ...configured.global, active_profile_ids: ["home"] },
      active_mode_id: null,
    } as ScheduleResponse;
    const sendMessagePromise = vi.fn().mockResolvedValue(response);
    const element = new VelairProfilesView();
    element.compact = true;
    element.hass = { connection: { sendMessagePromise }, states: {} } as never;
    element.data = configured;
    document.body.append(element);
    await element.updateComplete;

    const menu = element.shadowRoot?.querySelector(".active-setup-menu") as HTMLDetailsElement;
    expect(menu.querySelectorAll(".active-setup-option-group")).toHaveLength(2);
    expect(menu.querySelector("#active-setup-modes-heading")?.textContent).toBe("Modes");
    expect(menu.querySelector("#active-setup-profiles-heading")?.textContent).toBe("Profiles");
    expect(menu.textContent).toContain("Select a Profile to replace the base");
    expect(menu.querySelector('[data-profile-id="home"]')?.getAttribute("style")).toContain("#abcdef");

    menu.open = true;
    (menu.querySelector('[data-profile-id="home"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "velair/activate_profile",
      profile_id: "home",
    }));
    await vi.waitFor(() => expect((element.shadowRoot?.querySelector(".active-setup-menu") as HTMLDetailsElement).open).toBe(false));
    expect(element.shadowRoot?.querySelector(".active-setup-mode")?.textContent).toContain("Profile");
    expect(element.shadowRoot?.querySelector(".active-setup-mode")?.textContent).toContain("Home");
    element.remove();
  });

  it("disables every active setup action while the Profile draft is dirty", async () => {
    const element = new VelairProfilesView();
    element.data = {
      ...data,
      modes: [{ key: "vacation", name: "Vacation", profile_ids: ["away"] }],
    } as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);

    const name = element.shadowRoot?.querySelector(".profile-name-input-wrap input") as HTMLInputElement;
    name.value = "Changed";
    name.dispatchEvent(new Event("input"));
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector(".active-setup-change")?.getAttribute("aria-disabled")).toBe("true");
    expect([...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".active-setup-option")].every((button) => button.disabled)).toBe(true);
    element.remove();
  });

  it("distinguishes a mode from an identically named mapped profile", async () => {
    const element = new VelairProfilesView();
    element.data = {
      ...data,
      profiles: [{ ...(data.profiles ?? [])[0], name: "Away", icon: "mdi:briefcase-outline", color: "#123456" }],
      modes: [{ key: "away-mode", name: "Away", profile_ids: ["away"] }],
    } as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;

    const row = element.shadowRoot?.querySelector(".mode-item:not(.built-in)");
    expect(row?.querySelector(".mode-item-main")?.getAttribute("aria-pressed")).toBe("false");
    expect(row?.querySelector(".mode-item-identity > ha-icon")?.getAttribute("icon")).toBe("mdi:format-list-bulleted");
    expect(row?.querySelector(".mode-map-arrow")).toBeNull();
    expect(row?.querySelector(".mode-profile-avatar ha-icon")?.getAttribute("icon")).toBe("mdi:briefcase-outline");
    expect(row?.querySelector(".mode-profile-avatar")?.getAttribute("style")).toContain("#123456");
    expect(row?.querySelector(".mode-profile-avatar")?.getAttribute("aria-label")).toContain("Away");
    (row?.querySelector(".mode-item-main") as HTMLButtonElement).click();
    await element.updateComplete;
    expect(row?.querySelector(".mode-item-main")?.getAttribute("aria-pressed")).toBe("true");

    element.data = {
      ...element.data,
      modes: [{ key: "orphan", name: "Orphan", profile_ids: ["missing-profile"] }],
    } as ScheduleResponse;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".mode-profile-avatar ha-icon")?.getAttribute("icon")).toBe("mdi:alert-outline");
    expect(element.shadowRoot?.querySelector(".mode-profile-avatar")?.getAttribute("aria-label")).toContain("unavailable");
    element.remove();
  });

  it("shows every mapped Profile icon and lets them wrap without crowding the delete action", async () => {
    const profiles = Array.from({ length: 6 }, (_, index) => ({
      key: `profile-${index}`,
      name: `Profile ${index}`,
      icon: `mdi:numeric-${index}-circle-outline`,
      color: `#${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}`,
      zones: {},
    }));
    const element = new VelairProfilesView();
    element.data = {
      ...data,
      profiles,
      modes: [{
        key: "combined",
        name: "Combined",
        profile_ids: profiles.map((profile) => profile.key),
      }],
    } as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;

    const row = element.shadowRoot?.querySelector(".mode-item.custom");
    const icons = [...row!.querySelectorAll<HTMLElement>(".mode-profile-avatar")];
    expect(icons).toHaveLength(6);
    expect(icons.map((icon) => icon.querySelector("ha-icon")?.getAttribute("icon")))
      .toEqual(profiles.map((profile) => profile.icon));
    expect(icons.map((icon) => icon.getAttribute("style")))
      .toEqual(profiles.map((profile) => expect.stringContaining(profile.color)));
    expect(row?.querySelector(".mode-profile-more")).toBeNull();
    expect(row?.querySelector(".mode-delete")).not.toBeNull();
    expect(profileStyles.cssText).toMatch(/\.mode-item-main > \.mode-profile-avatars\s*\{[^}]*display:\s*flex[^}]*flex-wrap:\s*wrap/);
    expect(profileStyles.cssText).toMatch(/\.mode-profile-avatar\s*\{[^}]*background:\s*transparent/);
    expect(profileStyles.cssText).toMatch(/\.mode-item-main \.mode-profile-avatar\s*\{[^}]*color:\s*var\(--mode-profile-color\)/);
    expect(profileStyles.cssText).toMatch(/\.mode-item\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 34px/);
    element.remove();
  });

  it("creates an empty draft and saves a custom mode through the backend", async () => {
    const saved = {
      ...data,
      modes: [{ key: "vacation", name: "Vacation", profile_ids: ["away"] }],
      mode_id: "vacation",
    } as ScheduleResponse;
    const sendMessagePromise = vi.fn().mockResolvedValue(saved);
    const element = new VelairProfilesView();
    element.hass = { connection: { sendMessagePromise }, states: {} } as never;
    element.data = { ...data, modes: [] } as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;

    (element.shadowRoot?.querySelector(".mode-create") as HTMLButtonElement).click();
    await element.updateComplete;
    const name = element.shadowRoot?.querySelector(".mode-field input") as HTMLInputElement;
    const profile = element.shadowRoot?.querySelector(".mode-profile-choice input") as HTMLInputElement;
    const nameRow = element.shadowRoot?.querySelector(".mode-name-row");
    expect(element.shadowRoot?.querySelector(".mode-editor-heading")).toBeNull();
    expect(nameRow?.querySelector("input")).toBe(name);
    expect(nameRow?.querySelector(".mode-save")).not.toBeNull();
    expect(profileStyles.cssText).toMatch(
      /\.mode-name-row\s*\{[^}]*gap:\s*12px[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto/,
    );
    expect(name.value).toBe("");
    expect(profile.checked).toBe(false);
    expect((element.shadowRoot?.querySelector(".mode-save") as HTMLButtonElement).disabled).toBe(true);
    name.value = "  Vacation  ";
    name.dispatchEvent(new Event("input"));
    profile.checked = true;
    profile.dispatchEvent(new Event("change"));
    await element.updateComplete;
    (element.shadowRoot?.querySelector(".mode-save") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "velair/set_mode",
      mode: { name: "Vacation", profile_ids: ["away"] },
    }));
    await vi.waitFor(() => expect(element.shadowRoot?.querySelector(".mode-item:not(.built-in)")?.textContent).toContain("Vacation"));
    element.remove();
  });

  it("renames, remaps, and deletes a custom mode", async () => {
    const configured = {
      ...data,
      profiles: [...(data.profiles ?? []), { ...(data.profiles ?? [])[0], key: "home", name: "Home" }],
      modes: [{ key: "vacation", name: "Vacation", profile_ids: ["away"] }],
    } as ScheduleResponse;
    const deleted = { ...configured, modes: [] } as ScheduleResponse;
    const sendMessagePromise = vi.fn().mockResolvedValueOnce({
      ...configured,
      modes: [{ key: "vacation", name: "At home", profile_ids: ["home"] }],
      mode_id: "vacation",
    }).mockResolvedValueOnce(deleted);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const element = new VelairProfilesView();
    element.hass = { connection: { sendMessagePromise }, states: {} } as never;
    element.data = configured;
    document.body.append(element);
    await element.updateComplete;

    (element.shadowRoot?.querySelector(".mode-item:not(.built-in) .mode-item-main") as HTMLButtonElement).click();
    await element.updateComplete;
    const name = element.shadowRoot?.querySelector(".mode-field input") as HTMLInputElement;
    const profiles = element.shadowRoot?.querySelectorAll(".mode-profile-choice input") as NodeListOf<HTMLInputElement>;
    name.value = "At home";
    name.dispatchEvent(new Event("input"));
    profiles[0].checked = false;
    profiles[0].dispatchEvent(new Event("change"));
    profiles[1].checked = true;
    profiles[1].dispatchEvent(new Event("change"));
    await element.updateComplete;
    (element.shadowRoot?.querySelector(".mode-save") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "velair/set_mode",
      mode: { key: "vacation", name: "At home", profile_ids: ["home"] },
    }));
    await vi.waitFor(() => expect(element.shadowRoot?.querySelector(".mode-item:not(.built-in)")?.textContent).toContain("At home"));
    (element.shadowRoot?.querySelector(".mode-delete") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith({ type: "velair/delete_mode", key: "vacation" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("At home"));
    confirm.mockRestore();
    element.remove();
  });

  it("requires unique mode names and a mapped profile", async () => {
    const element = new VelairProfilesView();
    element.data = { ...data, modes: [{ key: "vacation", name: "Vacation", profile_ids: ["away"] }] } as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;
    (element.shadowRoot?.querySelector(".mode-create") as HTMLButtonElement).click();
    await element.updateComplete;
    const name = element.shadowRoot?.querySelector(".mode-field input") as HTMLInputElement;
    name.value = "vacation";
    name.dispatchEvent(new Event("input"));
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".mode-field small")?.textContent).toContain("unique");
    expect((element.shadowRoot?.querySelector(".mode-save") as HTMLButtonElement).disabled).toBe(true);
    element.remove();
  });

  it("reports unsaved mode drafts to the profiles host", async () => {
    const element = new VelairProfilesView();
    const dirty = vi.fn();
    element.addEventListener("profile-dirty-changed", dirty);
    element.data = { ...data, modes: [] } as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;
    (element.shadowRoot?.querySelector(".mode-create") as HTMLButtonElement).click();
    await element.updateComplete;
    const name = element.shadowRoot?.querySelector(".mode-field input") as HTMLInputElement;
    name.value = "Vacation";
    name.dispatchEvent(new Event("input"));
    expect(dirty).toHaveBeenLastCalledWith(expect.objectContaining({ detail: true }));
    element.remove();
  });

  it("restores the backend selection and shows feedback when compact activation fails", async () => {
    const sendMessagePromise = vi.fn().mockRejectedValue(new Error("Activation rejected"));
    const element = new VelairProfilesView();
    element.compact = true;
    element.hass = { connection: { sendMessagePromise }, states: {} } as never;
    element.data = data;
    const profileError = vi.fn();
    element.addEventListener("profile-error", profileError);
    document.body.append(element);
    await element.updateComplete;

    const menu = element.shadowRoot?.querySelector(".active-setup-menu") as HTMLDetailsElement;
    menu.open = true;
    (menu.querySelector('[data-profile-id="away"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(profileError).toHaveBeenCalled());
    expect((profileError.mock.calls[0]?.[0] as CustomEvent<string>).detail).toContain("Activation rejected");
    expect(element.shadowRoot?.querySelector(".active-setup-mode")?.textContent).toContain("Away");
    expect(menu.open).toBe(false);
    element.remove();
  });

  it("uses the templates list/detail pattern and waits for a profile selection", async () => {
    const element = new VelairProfilesView();
    element.data = data;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector(".profile-library .template-list-heading")?.textContent).toContain("Profiles (1)");
    expect(element.shadowRoot?.querySelector(".profile-active-context")).not.toBeNull();
    expect(element.shadowRoot?.querySelector(".profile-intro strong")?.textContent).toBe("Profiles & Modes");
    expect(element.shadowRoot?.querySelector(".profile-intro")?.textContent).toContain("Profiles define alternative climate routines");
    expect(element.shadowRoot?.querySelector(".profile-detail .template-placeholder")?.textContent).toContain("Select a profile");
    expect(element.shadowRoot?.querySelector(".profile-editor")).toBeNull();
    await selectFirstProfile(element);
    expect(element.shadowRoot?.querySelector(".profile-editor")).not.toBeNull();
    expect(element.shadowRoot?.querySelectorAll(".profile-metadata-row").length).toBe(3);
    expect([...element.shadowRoot!.querySelector(".metadata")!.children]
      .map((child) => child.classList[0])).toEqual([
      "profile-color-field",
      "profile-icon-field",
      "description",
    ]);
    expect(element.shadowRoot?.querySelector(".profile-name-input-wrap input")).not.toBeNull();
    expect(element.shadowRoot?.querySelector(".profile-heading-id")?.textContent).toContain("away");
    expect(element.shadowRoot?.querySelector(".profile-item-id")?.textContent).toBe("away");
    expect(element.shadowRoot?.querySelector(".profile-icon-help a")?.getAttribute("href")).toBe("https://pictogrammers.com/library/mdi/");
    expect((element.shadowRoot?.querySelector(".description textarea") as HTMLTextAreaElement).maxLength).toBe(500);
    expect((element.shadowRoot?.querySelector(".profile-color-field input") as HTMLInputElement).value).toBe("#123456");
    expect((element.shadowRoot?.querySelector(".profile-color-code-input") as HTMLInputElement).value).toBe("#123456");
    expect(element.shadowRoot?.querySelector(".profile-color-field")?.tagName).toBe("DIV");
    expect(element.shadowRoot?.querySelector('.profile-color-field label')?.getAttribute("for")).toBe("profile-color-picker");
    expect(element.shadowRoot?.querySelector(".profile-icon-field")?.tagName).toBe("DIV");
    expect(element.shadowRoot?.querySelector(".description")?.tagName).toBe("DIV");
    expect(element.shadowRoot?.querySelector(".profile-icon-preview")?.getAttribute("style")).toContain("#123456");
    expect(element.shadowRoot?.querySelector(".profile-character-count")?.textContent).toContain("487");
    expect(element.shadowRoot?.querySelector(".profile-zone select")?.textContent).toContain("Default");
    expect(element.shadowRoot?.querySelector(".profile-zone")?.classList).toContain("collapsed");
    expect(element.shadowRoot?.querySelector(".profile-zone-identity")?.textContent).toContain("climate.office");
    expect(element.shadowRoot?.querySelector(".template-item-delete.icon-button.danger")).not.toBeNull();
    expect(element.shadowRoot?.querySelector(".profile-item-activate")).not.toBeNull();
    expect(element.shadowRoot?.querySelector(".template-detail-actions .command-button.success")).toBeNull();
    const iconInput = element.shadowRoot?.querySelector(".profile-icon-field input") as HTMLInputElement;
    iconInput.value = "briefcase";
    iconInput.dispatchEvent(new Event("input"));
    await element.updateComplete;
    expect(iconInput.getAttribute("aria-invalid")).toBe("true");
    expect(element.shadowRoot?.querySelector(".profile-icon-field .field-error")?.textContent).toContain("mdi:icon-name");
    expect((element.shadowRoot?.querySelector(".template-detail-actions .icon-button.primary") as HTMLButtonElement).disabled).toBe(true);
    element.remove();
  });

  it("accepts typed hexadecimal colors and clearly marks invalid values", async () => {
    const element = new VelairProfilesView();
    element.data = data;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);

    const colorCode = element.shadowRoot?.querySelector(".profile-color-code-input") as HTMLInputElement;
    colorCode.value = "#abcdef";
    colorCode.dispatchEvent(new Event("input"));
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".profile-icon-preview")?.getAttribute("style")).toContain("#abcdef");
    expect(colorCode.getAttribute("aria-invalid")).toBe("false");

    colorCode.value = "blue";
    colorCode.dispatchEvent(new Event("input"));
    await element.updateComplete;
    expect(colorCode.getAttribute("aria-invalid")).toBe("true");
    expect(element.shadowRoot?.querySelector(".profile-color-field .field-error")?.textContent).toContain("#RRGGBB");
    expect(element.shadowRoot?.querySelector(".profile-icon-preview")?.classList).toContain("color-invalid");
    expect((element.shadowRoot?.querySelector(".template-detail-actions .icon-button.primary") as HTMLButtonElement).disabled).toBe(true);
    element.remove();
  });

  it("creates and selects a backend-backed empty profile", async () => {
    const created = {
      ...data,
      global: { mode: "running", active_profile_ids: [] },
      profiles: [{ key: "new_profile", name: "New profile", icon: "mdi:account-outline", zones: {} }],
      profile_id: "new_profile",
    } as unknown as ScheduleResponse;
    const sendMessagePromise = vi.fn().mockResolvedValue(created);
    const element = new VelairProfilesView();
    element.hass = { connection: { sendMessagePromise }, states: {} } as never;
    element.data = { ...data, profiles: [] } as unknown as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector(".profile-list-empty")?.textContent).toContain("No profiles");
    (element.shadowRoot?.querySelector(".profile-library .template-list-heading .icon-button.primary") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalled());
    await vi.waitFor(() => expect(element.shadowRoot?.querySelector(".profile-editor")).not.toBeNull());

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "velair/set_profile",
      profile: { name: "New profile", icon: "mdi:account-outline", zones: {} },
    });
    element.remove();
  });

  it("deletes an active profile from the list and returns to the empty state", async () => {
    const deleted = {
      ...data,
      global: { mode: "running", active_profile_ids: [] },
      profiles: [],
    } as unknown as ScheduleResponse;
    const sendMessagePromise = vi.fn().mockResolvedValue(deleted);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const element = new VelairProfilesView();
    element.hass = { connection: { sendMessagePromise }, states: {} } as never;
    element.data = data;
    document.body.append(element);
    await element.updateComplete;

    (element.shadowRoot?.querySelector(".template-item-delete") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "velair/delete_profile",
      key: "away",
    }));
    await vi.waitFor(() => expect(element.shadowRoot?.querySelector(".profile-list-empty")).not.toBeNull());
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Away"));
    confirm.mockRestore();
    element.remove();
  });

  it("closes a dirty Mode editor when profile deletion removes that Mode", async () => {
    const withMode = {
      ...data,
      modes: [{ key: "away-mode", name: "Away mode", profile_ids: ["away"] }],
    } as ScheduleResponse;
    const deleted = {
      ...withMode,
      global: { mode: "running", active_profile_ids: [] },
      profiles: [],
      modes: [],
      active_mode_id: null,
    } as ScheduleResponse;
    const sendMessagePromise = vi.fn().mockResolvedValue(deleted);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const element = new VelairProfilesView();
    element.hass = { connection: { sendMessagePromise }, states: {} } as never;
    element.data = withMode;
    document.body.append(element);
    await element.updateComplete;

    (element.shadowRoot?.querySelector(".mode-item:not(.built-in) .mode-item-main") as HTMLButtonElement).click();
    await element.updateComplete;
    const modeName = element.shadowRoot?.querySelector(".mode-editor input") as HTMLInputElement;
    modeName.value = "Dirty mode";
    modeName.dispatchEvent(new Event("input"));
    await element.updateComplete;
    (element.shadowRoot?.querySelector(".profile-list .template-item-delete") as HTMLButtonElement).click();

    await vi.waitFor(() => expect(element.shadowRoot?.querySelector(".mode-editor")).toBeNull());
    expect(element.shadowRoot?.querySelector(".mode-detail .template-placeholder")).not.toBeNull();
    confirm.mockRestore();
    element.remove();
  });

  it("activates a saved profile without duplicating the global operation notice", async () => {
    const inactive = {
      ...data,
      global: { mode: "running", active_profile_ids: [] },
    } as unknown as ScheduleResponse;
    const sendMessagePromise = vi.fn().mockResolvedValue(data);
    const element = new VelairProfilesView();
    element.workspace = "profiles";
    element.scheduleWorkspace = true;
    element.hass = { connection: { sendMessagePromise }, states: {} } as never;
    element.data = inactive;
    document.body.append(element);
    await element.updateComplete;

    const success = vi.fn();
    element.addEventListener("profile-success", success);
    (element.shadowRoot?.querySelector(".profile-item-activate") as HTMLButtonElement).click();

    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "velair/activate_profile",
      profile_id: "away",
    }));
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".profile-item-activate")?.getAttribute("aria-pressed")).toBe("true");
    expect(profileStyles.cssText).not.toMatch(/\.profile-item-activate\.active\s*\{[^}]*background:\s*#2e7d32/);
    expect(success).not.toHaveBeenCalled();
    expect(element.shadowRoot?.querySelector(".notice.success")).toBeNull();
    element.remove();
  });

  it("emits operational failures for the host notice stack", async () => {
    const element = new VelairProfilesView();
    const error = vi.fn();
    element.addEventListener("profile-error", error);
    document.body.append(element);
    await element.updateComplete;

    (element as unknown as { _error?: string })._error = "Profile could not be saved";
    await element.updateComplete;

    expect(error).toHaveBeenCalledOnce();
    expect((error.mock.calls[0]?.[0] as CustomEvent<string>).detail).toBe("Profile could not be saved");
    expect(element.shadowRoot?.querySelector(".notice-stack")).toBeNull();
    element.remove();
  });

  it("allows direct reactivation of a mode-selected profile to switch it to Manual", async () => {
    const response = { ...data, active_mode_id: null } as ScheduleResponse;
    const sendMessagePromise = vi.fn().mockResolvedValue(response);
    const element = new VelairProfilesView();
    element.hass = { connection: { sendMessagePromise }, states: {} } as never;
    element.data = {
      ...data,
      modes: [{ key: "away-mode", name: "Away mode", profile_ids: ["away"] }],
      active_mode_id: "away-mode",
    } as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;

    const activate = element.shadowRoot?.querySelector(".profile-item-activate") as HTMLButtonElement;
    expect(activate.disabled).toBe(false);
    activate.click();

    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "velair/activate_profile",
      profile_id: "away",
    }));
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".active-setup-mode")?.textContent).toContain("Profile");
    element.remove();
  });

  it("reuses editable schedule blocks, advanced options, select wrappers, and icon guidance", async () => {
    const scheduled = {
      ...data,
      global: { mode: "running", active_profile_ids: [] },
      settings: { first_weekday: "sunday", zone_order: ["climate.office"] },
      templates: [{
        key: "full",
        name: "Full controls",
        blocks: [{
          start: "09:00",
          action: "set_temperature",
          temperature: 21,
          hvac_mode: "heat",
          fan_mode: "auto",
          preset_mode: "eco",
          swing_mode: "on",
          swing_horizontal_mode: "middle",
          humidity: 45,
        }],
      }],
      profiles: [{
        key: "away",
        name: "Away",
        icon: "mdi:briefcase-outline",
        zones: {
          "climate.office": {
            behavior: "schedule",
            schedule: { sunday: [{ start: "08:00", action: "set_temperature", temperature: 20, hvac_mode: "heat" }] },
          },
        },
      }],
    } as unknown as ScheduleResponse;
    const element = new VelairProfilesView();
    const previewProfile = vi.fn().mockImplementation((message) => {
      expect(message.type).toBe("velair/preview_profile");
      expect(message.profile.zones["climate.office"].template_links.sunday).toEqual({ mode: "full", template_key: "full" });
      expect(message.profile.zones["climate.office"].schedule.sunday).toEqual([]);
      return Promise.resolve({ configuration_revision: 1,
        materialized_schedules: { "climate.office": { sunday: scheduled.templates[0].blocks } },
        resolved_schedules: { "climate.office": { sunday: scheduled.templates[0].blocks } },
      });
    });
    element.hass = {
      connection: { sendMessagePromise: previewProfile },
      language: "en",
      states: {
        "climate.office": {
          state: "heat",
          attributes: {
            friendly_name: "Office",
            hvac_modes: ["off", "heat", "cool"],
            fan_modes: ["auto"],
            preset_modes: ["eco"],
            swing_modes: ["on", "off"],
            swing_horizontal_modes: ["middle"],
            humidity: 45,
            min_humidity: 30,
            max_humidity: 70,
            min_temp: 7,
            max_temp: 35,
            target_temp_step: 0.5,
          },
        },
      },
    } as never;
    element.data = scheduled;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);

    const zoneToggle = element.shadowRoot?.querySelector(".profile-zone-toggle") as HTMLButtonElement;
    expect(zoneToggle.getAttribute("aria-expanded")).toBe("false");
    zoneToggle.click();
    await element.updateComplete;
    expect(zoneToggle.getAttribute("aria-expanded")).toBe("true");

    expect(element.shadowRoot?.querySelector(".editable-block")).not.toBeNull();
    expect(element.shadowRoot?.querySelector(".profile-week .timeline-panel")).not.toBeNull();
    expect(element.shadowRoot?.querySelector(".profile-week .timeline-carry-over")?.getAttribute("draggable")).toBe("false");
    expect(element.shadowRoot?.querySelector(".profile-week .timeline-carry-over")?.getAttribute("aria-label"))
      .toContain("From Sun,");
    expect(element.shadowRoot?.querySelector(".profile-week .timeline-block:not(.timeline-carry-over)")?.getAttribute("draggable")).toBe("true");
    expect(element.shadowRoot?.querySelector(".day-tabs .day-tab.active")?.textContent).toContain("Sun");
    expect(element.shadowRoot?.querySelector(".day-tabs .day-tab.active strong")?.textContent).toBe("1");
    expect(element.shadowRoot?.querySelector(".advanced-climate-options")).not.toBeNull();
    expect(element.shadowRoot?.querySelectorAll(".select-wrap").length).toBeGreaterThan(2);
    expect(element.shadowRoot?.querySelector(".profile-icon-preview ha-icon")?.getAttribute("icon")).toBe("mdi:briefcase-outline");
    expect(element.shadowRoot?.querySelector(".profile-icon-field .help")?.textContent).toContain("mdi:briefcase-outline");
    expect(element.shadowRoot?.querySelector(".schedule-config-helper")?.textContent).toContain("Configure blocks manually, copy a template, or link its times or full configuration. You can also use Velair presets.");
    expect(element.shadowRoot?.querySelector(".profile-template-select option")?.textContent).toBe("Select a template");

    const timelineTrack = element.shadowRoot?.querySelector(".profile-week .timeline-track") as HTMLElement;
    vi.spyOn(timelineTrack, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 100,
      right: 100,
      top: 0,
      bottom: 76,
      height: 76,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    element.shadowRoot?.querySelector(".profile-week .timeline-block:not(.timeline-carry-over)")
      ?.dispatchEvent(new Event("dragstart", { bubbles: true }));
    timelineTrack.dispatchEvent(new MouseEvent("drop", {
      bubbles: true,
      cancelable: true,
      clientX: 50,
    }));
    await element.updateComplete;
    expect((element.shadowRoot?.querySelector(".editable-block input[type=time]") as HTMLInputElement).value).toBe("12:00");

    const temperatureInput = element.shadowRoot?.querySelector(".editable-block input[type=number]") as HTMLInputElement;
    temperatureInput.value = "99";
    temperatureInput.dispatchEvent(new Event("input"));
    await element.updateComplete;
    expect((element.shadowRoot?.querySelector(".template-detail-actions .icon-button.primary") as HTMLButtonElement).disabled).toBe(true);
    expect((element.shadowRoot?.querySelector(".profile-item-activate") as HTMLButtonElement).disabled).toBe(true);

    const templateSelect = element.shadowRoot?.querySelector(".profile-template-select select") as HTMLSelectElement;
    templateSelect.value = "full";
    templateSelect.dispatchEvent(new Event("change"));
    await element.updateComplete;
    await vi.waitFor(() => expect(templateSelect.value).toBe(""));
    await vi.waitFor(() => expect([...element.shadowRoot!.querySelectorAll<HTMLSelectElement>(".advanced-climate-options-fields select")]
      .map((select) => select.value)).toEqual(expect.arrayContaining(["auto", "eco", "on", "middle"])));
    expect(previewProfile).toHaveBeenCalledTimes(1);
    element.remove();
  });

  it("shows a rejected retry when the global failure belongs to an earlier operation", async () => {
    const sendMessagePromise = vi.fn().mockRejectedValue(new Error("Activation rejected"));
    const element = new VelairProfilesView();
    element.compact = true;
    element.hass = { connection: { sendMessagePromise }, states: {} } as never;
    element.data = {
      ...data,
      operation_status: {
        id: "operation-1",
        kind: "profile_activation",
        state: "failed",
        target_id: "away",
        completed: 0,
        total: 1,
        current_entity_id: null,
        failed_entity_ids: [],
        started_at: "2026-07-29T12:00:00+00:00",
        finished_at: "2026-07-29T12:00:01+00:00",
      },
    } as ScheduleResponse;
    const profileError = vi.fn();
    element.addEventListener("profile-error", profileError);
    document.body.append(element);
    await element.updateComplete;

    (element.shadowRoot?.querySelector('[data-profile-id="away"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalled());
    await element.updateComplete;

    expect((profileError.mock.calls[0]?.[0] as CustomEvent<string>).detail).toContain("Activation rejected");
    element.remove();
  });

  it("does not duplicate an activation failure reported by a new global operation", async () => {
    let rejectRequest: ((error: Error) => void) | undefined;
    const sendMessagePromise = vi.fn().mockImplementation(() => new Promise((_resolve, reject) => {
      rejectRequest = reject;
    }));
    const element = new VelairProfilesView();
    element.compact = true;
    element.hass = { connection: { sendMessagePromise }, states: {} } as never;
    element.data = data;
    const profileError = vi.fn();
    element.addEventListener("profile-error", profileError);
    document.body.append(element);
    await element.updateComplete;

    (element.shadowRoot?.querySelector('[data-profile-id="away"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalled());
    element.data = {
      ...data,
      operation_status: {
        id: "operation-2",
        kind: "profile_activation",
        state: "failed",
        target_id: "away",
        completed: 0,
        total: 1,
        current_entity_id: null,
        failed_entity_ids: [],
        started_at: "2026-07-29T12:01:00+00:00",
        finished_at: "2026-07-29T12:01:01+00:00",
      },
    } as ScheduleResponse;
    rejectRequest?.(new Error("Activation rejected"));
    await vi.waitFor(() => expect(element.shadowRoot?.querySelector('[role="alert"]')).toBeNull());
    expect(profileError).not.toHaveBeenCalled();
    element.remove();
  });

  it("restores the in-session schedule after changing pause actions", async () => {
    const scheduled = {
      ...data,
      global: { mode: "running", active_profile_ids: [] },
      settings: { first_weekday: "monday", zone_order: ["climate.office"] },
      profiles: [{
        key: "seasonal",
        name: "Seasonal",
        zones: {
          "climate.office": {
            behavior: "schedule",
            schedule: {
              monday: [
                {
                  start: "07:00",
                  action: "set_temperature",
                  temperature: 20.5,
                  hvac_mode: "heat",
                  fan_mode: "auto",
                },
                {
                  start: "15:00",
                  action: "set_temperature",
                  temperature: 24,
                  hvac_mode: "cool",
                  preset_mode: "comfort",
                },
              ],
            },
          },
        },
      }],
    } as unknown as ScheduleResponse;
    const element = new VelairProfilesView();
    element.data = scheduled;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);

    const behaviorSelect = element.shadowRoot?.querySelector(
      ".profile-zone-actions select",
    ) as HTMLSelectElement;
    behaviorSelect.value = "pause";
    behaviorSelect.dispatchEvent(new Event("change"));
    await element.updateComplete;

    (element.shadowRoot?.querySelector(".profile-zone-toggle") as HTMLButtonElement).click();
    await element.updateComplete;
    const pauseAction = element.shadowRoot?.querySelector(
      ".profile-pause-action select",
    ) as HTMLSelectElement;
    pauseAction.value = "turn_off";
    pauseAction.dispatchEvent(new Event("change"));
    await element.updateComplete;

    const pausedBehaviorSelect = element.shadowRoot?.querySelector(
      ".profile-zone-actions select",
    ) as HTMLSelectElement;
    pausedBehaviorSelect.value = "schedule";
    pausedBehaviorSelect.dispatchEvent(new Event("change"));
    await element.updateComplete;

    const draft = (element as unknown as { _draft: ClimateProfileDraft })._draft;
    expect(draft.zones["climate.office"]).toMatchObject({
      behavior: "schedule",
      schedule: {
        monday: [
          {
            start: "07:00",
            temperature: 20.5,
            hvac_mode: "heat",
            fan_mode: "auto",
          },
          {
            start: "15:00",
            temperature: 24,
            hvac_mode: "cool",
            preset_mode: "comfort",
          },
        ],
      },
    });
    element.remove();
  });

  it("deep-clones the selected profile day to multiple draft-only targets", async () => {
    const mondayBlocks = [
      {
        start: "07:00",
        action: "set_temperature",
        temperature: 20.5,
        hvac_mode: "heat",
        fan_mode: "auto",
        preset_mode: "eco",
        swing_mode: "on",
        swing_horizontal_mode: "middle",
        humidity: 45,
      },
      {
        start: "15:00",
        action: "set_temperature",
        temperature: 24,
        hvac_mode: "cool",
        fan_mode: "quiet",
        preset_mode: "comfort",
        swing_mode: "off",
        swing_horizontal_mode: "left",
        humidity: 55,
      },
    ];
    const scheduled = {
      ...data,
      global: { mode: "running", active_profile_ids: [] },
      settings: { first_weekday: "monday", zone_order: ["climate.office"] },
      profiles: [{
        key: "seasonal",
        name: "Seasonal",
        zones: {
          "climate.office": {
            behavior: "schedule",
            schedule: { monday: mondayBlocks },
          },
        },
      }],
    } as unknown as ScheduleResponse;
    const element = new VelairProfilesView();
    element.hass = {
      language: "en",
      connection: { sendMessagePromise: vi.fn().mockResolvedValue({}) },
      states: {
        "climate.office": {
          state: "heat",
          attributes: {
            hvac_modes: ["off", "heat", "cool"],
            fan_modes: ["auto", "quiet"],
            preset_modes: ["eco", "comfort"],
            swing_modes: ["on", "off"],
            swing_horizontal_modes: ["middle", "left"],
            min_humidity: 30,
            max_humidity: 70,
            min_temp: 7,
            max_temp: 35,
            target_temp_step: 0.5,
          },
        },
      },
    } as never;
    element.data = scheduled;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);
    (element.shadowRoot?.querySelector(".profile-zone-toggle") as HTMLButtonElement).click();
    await element.updateComplete;

    const blockList = element.shadowRoot!.querySelector(".profile-block-list")!;
    const dayCopy = element.shadowRoot!.querySelector(".profile-day-copy")!;
    expect(blockList.compareDocumentPosition(dayCopy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const targets = [...element.shadowRoot!.querySelectorAll<HTMLInputElement>(
      ".profile-day-copy input[type=checkbox]",
    )];
    expect(targets).toHaveLength(6);
    const draftBeforePreset = structuredClone((element as unknown as { _draft: ClimateProfileDraft })._draft);
    const presetButtons = [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(
      ".profile-day-copy .copy-preset-button",
    )];
    expect(presetButtons.map((button) => button.textContent?.trim())).toEqual([
      "Mon–Fri", "Weekend", "All days", "Clear selection",
    ]);
    const presetGroup = element.shadowRoot!.querySelector(".profile-day-copy .copy-presets")!;
    const targetGroup = element.shadowRoot!.querySelector(".profile-day-copy .copy-targets")!;
    expect(presetGroup.compareDocumentPosition(targetGroup) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
    presetButtons[1].click();
    await element.updateComplete;
    expect([...element.shadowRoot!.querySelectorAll<HTMLInputElement>(
      ".profile-day-copy input[type=checkbox]:checked",
    )]).toHaveLength(2);
    expect((element as unknown as { _draft: ClimateProfileDraft })._draft).toEqual(draftBeforePreset);
    element.shadowRoot!.querySelectorAll<HTMLButtonElement>(
      ".profile-day-copy .copy-preset-button",
    )[3].click();
    await element.updateComplete;
    expect([...element.shadowRoot!.querySelectorAll<HTMLInputElement>(
      ".profile-day-copy input[type=checkbox]:checked",
    )]).toHaveLength(0);
    const clearedTargets = [...element.shadowRoot!.querySelectorAll<HTMLInputElement>(
      ".profile-day-copy input[type=checkbox]",
    )];
    clearedTargets[0].checked = true;
    clearedTargets[0].dispatchEvent(new Event("change"));
    clearedTargets[1].checked = true;
    clearedTargets[1].dispatchEvent(new Event("change"));
    await element.updateComplete;

    const cloneButton = element.shadowRoot?.querySelector(
      ".profile-day-copy .command-button",
    ) as HTMLButtonElement;
    expect(cloneButton.disabled).toBe(false);
    cloneButton.click();
    await vi.waitFor(() => expect((element as unknown as { _busy?: string })._busy).toBeUndefined());
    await element.updateComplete;

    const viewState = element as unknown as {
      _draft: ClimateProfileDraft;
      _dirty: boolean;
    };
    const zone = viewState._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected a schedule draft");
    expect(zone.schedule.tuesday).toEqual(zone.schedule.monday);
    expect(zone.schedule.wednesday).toEqual(zone.schedule.monday);
    expect(zone.schedule.tuesday).not.toBe(zone.schedule.monday);
    expect(zone.schedule.tuesday[0]).not.toBe(zone.schedule.monday[0]);
    expect(zone.schedule.tuesday[0]).toMatchObject({
      hvac_mode: "heat",
      fan_mode: "auto",
      preset_mode: "eco",
      swing_mode: "on",
      swing_horizontal_mode: "middle",
      humidity: 45,
    });
    expect(zone.schedule.wednesday[1]).toMatchObject({
      hvac_mode: "cool",
      fan_mode: "quiet",
      preset_mode: "comfort",
      swing_mode: "off",
      swing_horizontal_mode: "left",
      humidity: 55,
    });
    expect(viewState._dirty).toBe(true);
    expect((scheduled.profiles?.[0].zones["climate.office"] as {
      schedule: Record<string, unknown[]>;
    }).schedule.tuesday).toBeUndefined();
    expect(cloneButton.disabled).toBe(true);
    element.remove();
  });

  it("blocks saving a Profile schedule with an unsupported HVAC mode", async () => {
    const scheduled = {
      ...data,
      global: { mode: "running", active_profile_ids: [] },
      settings: { first_weekday: "monday", zone_order: ["climate.office"] },
      profiles: [{
        key: "summer",
        name: "Summer",
        icon: "mdi:snowflake",
        zones: {
          "climate.office": {
            behavior: "schedule",
            schedule: {
              monday: [{
                start: "08:00",
                action: "set_temperature",
                temperature: 24,
                hvac_mode: "cool",
              }],
            },
          },
        },
      }],
    } as unknown as ScheduleResponse;
    const element = new VelairProfilesView();
    element.hass = {
      language: "en",
      states: {
        "climate.office": {
          state: "heat",
          attributes: {
            friendly_name: "Office",
            hvac_modes: ["off", "heat"],
            min_temp: 7,
            max_temp: 35,
            target_temp_step: 0.5,
          },
        },
      },
    } as never;
    element.data = scheduled;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);

    const save = element.shadowRoot?.querySelector(
      ".profile-editor .template-detail-actions button",
    ) as HTMLButtonElement;
    const error = element.shadowRoot?.querySelector(".profile-schedule-error");
    expect(save.disabled).toBe(true);
    expect(error?.textContent).toContain("Office does not support Cool on Monday at 08:00");

    element.remove();
  });

  it("allows a midnight Heat Profile block while an off climate hides target support", async () => {
    const scheduled = {
      ...data,
      zones: {
        "climate.office": { schedule: {} },
      },
      global: { mode: "running", active_profile_ids: [] },
      settings: { first_weekday: "monday", zone_order: ["climate.office"] },
      profiles: [{
        key: "winter",
        name: "Winter",
        icon: "mdi:radiator",
        zones: {
          "climate.office": {
            behavior: "schedule",
            schedule: {
              monday: [{
                start: "00:00",
                action: "set_temperature",
                temperature: 20,
                hvac_mode: "heat",
              }],
            },
          },
        },
      }],
    } as unknown as ScheduleResponse;
    const element = new VelairProfilesView();
    element.hass = {
      language: "en",
      states: {
        "climate.office": {
          state: "off",
          attributes: {
            friendly_name: "Office",
            hvac_modes: ["off", "heat", "cool", "dry", "fan_only"],
            supported_features: 392,
            min_temp: 10,
            max_temp: 31,
            target_temp_step: 0.5,
          },
        },
      },
    } as never;
    element.data = scheduled;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);

    const save = element.shadowRoot?.querySelector(
      ".profile-editor .template-detail-actions button",
    ) as HTMLButtonElement;
    const error = element.shadowRoot?.querySelector(".profile-schedule-error");
    expect(save.disabled).toBe(false);
    expect(error?.querySelector(".notice-stack.contextual")?.getAttribute("aria-live")).toBe("polite");
    expect(error?.querySelectorAll(".notice-row")).toHaveLength(0);

    element.remove();
  });

  it("uses an accessible name dialog to save only the edited Profile day as a template", async () => {
    const scheduled = {
      ...data,
      configured_entities: ["climate.office"],
      settings: { first_weekday: "monday", zone_order: ["climate.office"] },
      profiles: [{ key: "away", name: "Away", zones: { "climate.office": { behavior: "schedule", schedule: { monday: [{ start: "08:00", action: "set_temperature", temperature: 21, hvac_mode: "heat", fan_mode: "auto" }] } } } }],
    } as unknown as ScheduleResponse;
    const sendMessagePromise = vi.fn().mockResolvedValue({ ...scheduled, templates: [] });
    const element = new VelairProfilesView();
    element.hass = { language: "en", connection: { sendMessagePromise }, states: { "climate.office": { state: "heat", attributes: { friendly_name: "Office", supported_features: 1, hvac_modes: ["off", "heat"], fan_modes: ["auto"], min_temp: 5, max_temp: 35, target_temp_step: 0.5 } } } } as never;
    element.data = scheduled;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);
    (element.shadowRoot?.querySelector(".profile-zone-toggle") as HTMLButtonElement).click();
    await element.updateComplete;
    const trigger = [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".profile-day-actions button")][0];
    expect(trigger.classList.contains("primary")).toBe(true);
    expect(trigger.title).toBe("Save as template");
    expect(trigger.textContent).toContain("Save as template");
    expect(trigger.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:content-save-plus");
    trigger.click();
    await element.updateComplete;
    const dialog = element.shadowRoot!.querySelector<HTMLElement>('[role="dialog"]')!;
    const input = dialog.querySelector<HTMLInputElement>("#profile-template-name")!;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("profile-template-dialog-title");
    await vi.waitFor(() => expect(element.shadowRoot?.activeElement).toBe(input));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
    expect(element.shadowRoot?.activeElement).toBe(dialog.querySelector(".profile-dialog-actions button"));
    (element.shadowRoot?.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(element.shadowRoot?.activeElement).toBe(input);
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await element.updateComplete;
    await vi.waitFor(() => expect(element.shadowRoot?.querySelector('[role="dialog"]')).toBeNull());
    await vi.waitFor(() => expect(element.shadowRoot?.activeElement).toBe(trigger));

    trigger.click();
    await element.updateComplete;
    const draftBefore = structuredClone((element as unknown as { _draft: ClimateProfileDraft })._draft);
    const name = element.shadowRoot!.querySelector<HTMLInputElement>("#profile-template-name")!;
    name.value = "Workday";
    name.dispatchEvent(new Event("input"));
    await element.updateComplete;
    [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".profile-dialog-actions button")][1].click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({
      type: "velair/set_schedule_template",
      name: "Workday",
      blocks: [{ start: "08:00", action: "set_temperature", temperature: 21, hvac_mode: "heat", fan_mode: "auto" }],
    })));
    expect((element as unknown as { _draft: ClimateProfileDraft })._draft).toEqual(draftBefore);
    await vi.waitFor(() => expect(element.shadowRoot?.querySelector('[role="dialog"]')).toBeNull());
    element.remove();
  });

  it("does not restore stale Profile state when a template request settles after its dialog closes", async () => {
    const scheduled = {
      ...data,
      configured_entities: ["climate.office"],
      settings: { first_weekday: "monday", zone_order: ["climate.office"] },
      profiles: [{ key: "away", name: "Away", zones: { "climate.office": { behavior: "schedule", schedule: { monday: [{ start: "08:00", action: "set_temperature", temperature: 21, hvac_mode: "heat" }] } } } }],
    } as unknown as ScheduleResponse;
    let settle!: (value: ScheduleResponse) => void;
    const sendMessagePromise = vi.fn().mockImplementation(() => new Promise<ScheduleResponse>((resolve) => { settle = resolve; }));
    const changed = vi.fn();
    const element = new VelairProfilesView();
    element.hass = { language: "en", connection: { sendMessagePromise }, states: { "climate.office": { state: "heat", attributes: { supported_features: 1, hvac_modes: ["off", "heat"], min_temp: 5, max_temp: 35, target_temp_step: 0.5 } } } } as never;
    element.data = scheduled;
    element.addEventListener("profile-data-changed", changed);
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);
    (element.shadowRoot?.querySelector(".profile-zone-toggle") as HTMLButtonElement).click();
    await element.updateComplete;
    const open = [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".profile-day-actions button")][0];
    open.click(); await element.updateComplete;
    const name = element.shadowRoot!.querySelector<HTMLInputElement>("#profile-template-name")!;
    name.value = "Deferred"; name.dispatchEvent(new Event("input")); await element.updateComplete;
    [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".profile-dialog-actions button")][1].click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledTimes(1));
    element.shadowRoot!.querySelector<HTMLElement>(".profile-dialog")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await element.updateComplete;
    const profileName = element.shadowRoot!.querySelector<HTMLInputElement>(".profile-name-input-wrap input")!;
    profileName.value = "Edited while saving"; profileName.dispatchEvent(new Event("input")); await element.updateComplete;
    settle({ ...scheduled, templates: [] });
    await vi.waitFor(() => expect(changed).toHaveBeenCalled());
    expect((element as unknown as { _draft: ClimateProfileDraft })._draft.name).toBe("Edited while saving");
    expect(element.shadowRoot?.querySelector(".profile-dialog")).toBeNull();

    let reject!: (reason: Error) => void;
    sendMessagePromise.mockImplementationOnce(() => new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }));
    open.click(); await element.updateComplete;
    const secondName = element.shadowRoot!.querySelector<HTMLInputElement>("#profile-template-name")!;
    secondName.value = "Rejected"; secondName.dispatchEvent(new Event("input")); await element.updateComplete;
    [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".profile-dialog-actions button")][1].click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledTimes(2));
    (element.shadowRoot!.querySelector(".profile-dialog-backdrop") as HTMLElement).click();
    await element.updateComplete;
    profileName.value = "Edited before rejection"; profileName.dispatchEvent(new Event("input")); await element.updateComplete;
    reject(new Error("late failure"));
    await vi.waitFor(() => expect((element as unknown as { _busy?: string })._busy).toBeUndefined());
    expect((element as unknown as { _draft: ClimateProfileDraft })._draft.name).toBe("Edited before rejection");
    expect(element.shadowRoot?.querySelector(".profile-dialog-error")).toBeNull();
    element.remove();
  });

  it("confirms cross-climate cloning, changes behaviors in draft, and rejects incompatible targets atomically", async () => {
    const scheduled = {
      ...data,
      configured_entities: ["climate.office", "climate.default", "climate.paused"],
      settings: { first_weekday: "monday", zone_order: ["climate.office", "climate.default", "climate.paused"] },
      profiles: [{ key: "away", name: "Away", zones: {
        "climate.office": { behavior: "schedule", schedule: { monday: [{ start: "08:00", action: "set_temperature", temperature: 21, hvac_mode: "heat" }] } },
        "climate.paused": { behavior: "pause", action: "none" },
      } }],
    } as unknown as ScheduleResponse;
    const climate = (name: string, modes = ["off", "heat"]) => ({ state: "heat", attributes: { friendly_name: name, supported_features: 1, hvac_modes: modes, min_temp: 5, max_temp: 35, target_temp_step: 0.5 } });
    const element = new VelairProfilesView();
    element.hass = { language: "en", connection: { sendMessagePromise: vi.fn().mockResolvedValue({}) }, states: { "climate.office": climate("Office"), "climate.default": climate("Default room"), "climate.paused": climate("Paused room") } } as never;
    element.data = scheduled;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);
    (element.shadowRoot?.querySelector(".profile-zone-toggle") as HTMLButtonElement).click();
    await element.updateComplete;
    const targetChecks = [...element.shadowRoot!.querySelectorAll<HTMLInputElement>(
      ".profile-climate-copy input[type=checkbox]",
    )];
    expect(targetChecks).toHaveLength(2);
    for (const check of targetChecks) {
      check.checked = true;
      check.dispatchEvent(new Event("change"));
    }
    await element.updateComplete;
    (element.shadowRoot!.querySelector(".profile-climate-copy .command-button") as HTMLButtonElement).click();
    await element.updateComplete;
    const dialog = element.shadowRoot!.querySelector<HTMLElement>(".profile-climate-clone-dialog")!;
    expect(dialog.textContent).toContain("replaces only that weekday");
    expect(dialog.querySelector('input[type="checkbox"]')).toBeNull();
    expect(dialog.textContent).toContain("Default room, Paused room");
    expect(element.shadowRoot!.querySelector(".profile-climate-clone-dialog")!.textContent).toContain("Default room, Paused room");
    [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".profile-dialog-actions button")][1].click();
    await vi.waitFor(() => expect((element as unknown as { _draft: ClimateProfileDraft })._draft.zones["climate.default"]?.behavior).toBe("schedule"));
    await element.updateComplete;
    const state = element as unknown as { _draft: ClimateProfileDraft; _dirty: boolean };
    expect(state._draft.zones["climate.default"].behavior).toBe("schedule");
    expect(state._draft.zones["climate.paused"].behavior).toBe("schedule");
    expect(state._dirty).toBe(true);
    expect([...element.shadowRoot!.querySelectorAll<HTMLInputElement>(
      ".profile-climate-copy input[type=checkbox]",
    )].every((check) => !check.checked)).toBe(true);

    const incompatible = new VelairProfilesView();
    incompatible.hass = { language: "en", connection: { sendMessagePromise: vi.fn().mockRejectedValue(new Error("does not support mode heat")) }, states: { "climate.office": climate("Office"), "climate.default": climate("Cooling only", ["off", "cool"]), "climate.paused": climate("Paused room") } } as never;
    incompatible.data = scheduled;
    document.body.append(incompatible);
    await incompatible.updateComplete;
    await selectFirstProfile(incompatible);
    (incompatible.shadowRoot?.querySelector(".profile-zone-toggle") as HTMLButtonElement).click();
    await incompatible.updateComplete;
    const first = incompatible.shadowRoot!.querySelector<HTMLInputElement>('.profile-climate-copy input')!;
    first.checked = true;
    first.dispatchEvent(new Event("change"));
    await incompatible.updateComplete;
    (incompatible.shadowRoot!.querySelector(".profile-climate-copy .command-button") as HTMLButtonElement).click();
    await incompatible.updateComplete;
    const before = structuredClone((incompatible as unknown as { _draft: ClimateProfileDraft })._draft);
    [...incompatible.shadowRoot!.querySelectorAll<HTMLButtonElement>(".profile-dialog-actions button")][1].click();
    await vi.waitFor(() => expect(incompatible.shadowRoot?.querySelector(".profile-dialog-error")?.textContent).toContain("does not support mode heat"));
    await incompatible.updateComplete;
    expect(incompatible.shadowRoot?.querySelector(".profile-dialog-error")?.textContent).toContain("does not support mode heat");
    expect((incompatible as unknown as { _draft: ClimateProfileDraft })._draft).toEqual(before);
    expect(incompatible.shadowRoot?.querySelector(".profile-climate-clone-dialog")).not.toBeNull();
    incompatible.remove();
    element.remove();
  });

  it("includes tablet and narrow-phone responsive contracts", () => {
    expect(profileStyles.cssText).toContain("@media (max-width: 760px)");
    expect(profileStyles.cssText).toContain("@media (max-width: 480px)");
    expect(profileStyles.cssText).toContain("--profile-draft-color");
    expect(profileStyles.cssText).toContain("background: transparent !important");
    expect(profileStyles.cssText).toContain("min-width: 210px");
    expect(profileStyles.cssText).toContain("min-height: 42px");
    expect(profileStyles.cssText).toContain(".mode-layout");
    expect(profileStyles.cssText).toMatch(/@media \(max-width: 760px\)[\s\S]*\.mode-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
    expect(profileStyles.cssText).not.toContain(".mode-help-tooltip");
    expect(profileStyles.cssText).toContain(".mode-item.built-in > .inline-help-wrapper");
    expect(profileStyles.cssText).toMatch(
      /\.mode-item\.built-in\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 32px 34px;/,
    );
    expect(profileStyles.cssText).not.toMatch(/\.mode-item\.built-in\s*\{[^}]*opacity/);
    expect(profileStyles.cssText).toMatch(/\.profile-item-copy code\s*\{[^}]*font-size:\s*11px/);
    expect(profileStyles.cssText).toMatch(/\.profile-heading-id\s*\{[^}]*font-size:\s*12px/);
    expect(profileStyles.cssText).toMatch(/@media \(max-width: 600px\)[\s\S]*\.profile-detail-heading\s*\{[^}]*display:\s*grid/);
    expect(profileStyles.cssText).toMatch(/@media \(max-width: 600px\)[\s\S]*\.profile-workspace-zone\s*\{[^}]*border:\s*0[^}]*padding:\s*0/);
    expect(profileStyles.cssText).toMatch(/@container \(max-width: 600px\)[\s\S]*\.profile-week\s*\{[^}]*background:\s*transparent[^}]*padding:\s*0/);
    expect(profileStyles.cssText).toMatch(/\.profile-detail-heading\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto/);
    expect(profileStyles.cssText).toMatch(/\.active-setup-popover\s*\{[^}]*position:\s*absolute/);
    expect(profileStyles.cssText).toMatch(/\.active-setup-popover\s*\{[^}]*right:\s*0/);
    expect(profileStyles.cssText).toMatch(/@media \(max-width: 600px\)[\s\S]*\.active-setup-popover\s*\{[^}]*position:\s*absolute/);
    expect(profileStyles.cssText).toMatch(/@container \(max-width: 600px\)[\s\S]*\.active-setup-popover\s*\{[^}]*position:\s*absolute/);
    expect(profileStyles.cssText).not.toContain(".active-setup-menu[open]");
    expect(profileStyles.cssText).toMatch(/@container \(max-width: 600px\)[\s\S]*\.active-setup-popover\s*\{[^}]*max-height:\s*min\(560px, 60vh\)[^}]*width:\s*auto/);
    expect(profileStyles.cssText).toMatch(/@container \(max-width: 760px\)[\s\S]*\.active-setup-summary\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
    expect(profileStyles.cssText).toMatch(/\.active-setup-summary-copy > span\s*\{[^}]*overflow-wrap:\s*break-word[^}]*white-space:\s*normal/);
    expect(profileStyles.cssText).toMatch(/\.active-setup-option-copy small\s*\{[^}]*overflow-wrap:\s*break-word[^}]*white-space:\s*normal/);
    expect(profileStyles.cssText).not.toContain(".profile-context-picker");
    expect(profileStyles.cssText).not.toContain("mode-origin");
    expect(profileStyles.cssText).toMatch(/\.profile-dialog\s*\{[^}]*max-width:\s*min\(520px, calc\(100vw - 32px\)\)/);
    expect(profileStyles.cssText).toMatch(/\.profile-dialog\s*\{[^}]*max-height:\s*calc\(100dvh - 32px\)[^}]*overflow:\s*auto/);
  });
});


describe("grouped profile schedule editing", () => {
  async function grouped(mixed = true) {
    const element = new VelairProfilesView();
    element.workspace = "profiles";
    element.scheduleWorkspace = true;
    element.initialWeekday = "monday";
    element.hass = { language: "en", connection: {} as never, states: {
      "climate.office": { state: "cool", attributes: { friendly_name: "Office", hvac_modes: ["off", "cool"], min_temp: 10, max_temp: 30 } },
    } };
    const blocks = [{ start: "08:00", action: "set_temperature", temperature: 22, hvac_mode: "cool" }];
    element.data = { ...data, configuration_revision: 1,
      zones: { "climate.office": { schedule: Object.fromEntries(WEEKDAYS.map(day => [day, []])) } },
      profiles: [{ key: "away", name: "Away", zones: { "climate.office": { behavior: "schedule", day_layout_key: "weekdays_weekend", schedule: Object.fromEntries(WEEKDAYS.map(day => [day, day === "monday" || !mixed ? blocks : []])) } } }],
    } as unknown as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;
    await selectFirstProfile(element);
    return element;
  }

  it("requires an explicit base and preserves comparison and draft after a rejected grouped Save", async () => {
    const element = await grouped();
    expect(element.shadowRoot?.textContent).toContain("Different schedules");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('.template-detail-actions button[title="Save"]')!.disabled).toBe(true);
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>(".profile-workspace-save button")!.disabled).toBe(true);
    expect(element.shadowRoot?.querySelector(".profile-block-list")).toBeNull();
    expect(element.shadowRoot?.querySelector(".timeline-panel")).toBeNull();
    expect(element.shadowRoot?.querySelector(".schedule-config-helper")).toBeNull();
    expect(element.shadowRoot?.querySelector(".schedule-config-row")).toBeNull();
    expect([...element.shadowRoot!.querySelectorAll("button")].some(button => button.textContent?.includes("Save Profile"))).toBe(true);
    const choose = element.shadowRoot!.querySelector<HTMLButtonElement>('[role="radio"]');
    expect(choose).toBeDefined();
    choose!.click();
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".timeline-panel")).toBeNull();
    expect(element.shadowRoot?.querySelector(".schedule-config-helper")).toBeNull();
    expect(element.shadowRoot?.querySelector(".schedule-config-row")).toBeNull();
    const internals = element as unknown as { _draft: ClimateProfileDraft; _save(): Promise<void>; _dirty: boolean };
    expect(internals._dirty).toBe(true);
    const draft = structuredClone(internals._draft);
    const save = vi.spyOn(VelairApiClient.prototype, "setClimateProfile").mockRejectedValue(new Error("Revision conflict"));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await internals._save();
    expect(confirm).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledOnce();
    expect(internals._draft).toEqual(draft);
    confirm.mockRestore(); save.mockRestore(); element.remove();
  });

  it("shows builtin selectors and seven weekday cells without manager or timeline day selection", async () => {
    const element = await grouped(false);
    const options = [...element.shadowRoot!.querySelectorAll<HTMLOptionElement>(".day-layout-controls option")];
    expect(options.map(option => option.value)).toEqual(["individual", "weekdays_weekend", "all"]);
    expect(element.shadowRoot!.querySelector(".day-layout-manager")).toBeNull();
    expect(element.shadowRoot!.textContent).not.toContain("Timeline shown for");
    expect(element.shadowRoot!.querySelectorAll(".day-tab")).toHaveLength(7);
    expect(element.shadowRoot!.querySelectorAll(".day-tab.active")).toHaveLength(5);
    expect(element.shadowRoot!.querySelectorAll(".day-tab strong")).toHaveLength(7);
    element.remove();
  });
  it("uses compact conflict rows with linked schedule details in the all-days profile layout", async () => {
    const element = await grouped();
    const name = "ProfileTemplate".repeat(30);
    const blocks = Array.from({ length: 5 }, (_, index) => ({ start: `${String(8 + index).padStart(2, "0")}:00`, action: "set_temperature", temperature: 22 + index, hvac_mode: "cool" }));
    element.data = { ...element.data!, templates: [{ key: "long-key", name, blocks }], resolved_profile_schedules: { away: { "climate.office": { monday: blocks } } } };
    await element.updateComplete;
    const internal = element as unknown as { _draft: ClimateProfileDraft; _setDayLayout(id: string, key: string): void };
    const zone = internal._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule");
    zone.template_links = { monday: { mode: "full", template_key: "long-key" } };
    const savedZone = element.data!.profiles![0].zones["climate.office"];
    if (savedZone.behavior === "schedule") savedZone.template_links = structuredClone(zone.template_links);
    internal._setDayLayout("climate.office", "all");
    await element.updateComplete;
    expect(element.shadowRoot!.querySelectorAll(".day-conflict-row")).toHaveLength(2);
    expect(element.shadowRoot!.querySelector(".day-conflict-link")?.textContent).toContain(name);
    expect(element.shadowRoot!.querySelectorAll(".day-conflict-row:first-of-type .inline-help-tooltip-block")).toHaveLength(6);
    expect(element.shadowRoot!.querySelectorAll(".day-conflict-details [role=radio], .day-conflict-row p button")).toHaveLength(0);
    expect(element.shadowRoot!.querySelectorAll('[role="radio"]')).toHaveLength(2);
    expect(element.shadowRoot!.querySelector('[role="radio"]')?.getAttribute("aria-label")).toContain("Monday");
    const inspector = element.shadowRoot!.querySelector<HTMLButtonElement>(".day-conflict-inspector button")!;
    expect(inspector.getAttribute("aria-label")).toContain("Monday");
    inspector.click(); element.requestUpdate(); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".inline-help-tooltip.visible")).not.toBeNull();
    expect(element.shadowRoot!.querySelector('[role="radio"]')?.getAttribute("aria-checked")).toBe("false");
    expect(element.shadowRoot!.querySelector(".profile-block-list")).toBeNull();
    element.remove();
  });
  it("shows the edited daily draft in conflicts and applies that same base", async () => {
    const element = await grouped(false);
    element.data = { ...element.data!, resolved_profile_schedules: { away: { "climate.office": { monday: [{ start: "08:00", action: "set_temperature", temperature: 22, hvac_mode: "cool" }] } } } };
    await element.updateComplete;
    const internal = element as unknown as { _setDayLayout(id: string, key: string): void; _setBlocks(id: string, day: string, blocks: unknown[]): void; _draft: ClimateProfileDraft };
    internal._setDayLayout("climate.office", "individual");
    internal._setBlocks("climate.office", "monday", [{ start: "08:00", action: "set_temperature", temperature: "24", hvac_mode: "cool" }]);
    internal._setDayLayout("climate.office", "all");
    await element.updateComplete;
    const monday = element.shadowRoot!.querySelector<HTMLElement>(".day-conflict-row:first-of-type")!;
    expect(monday.querySelector(".day-conflict-summary")?.textContent).toContain("24 °C");
    expect(monday.querySelector(".day-conflict-summary")?.textContent).not.toContain("22 °C");
    monday.querySelector<HTMLButtonElement>('[role="radio"]')!.click(); await element.updateComplete;
    const zone = internal._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule");
    expect(zone.schedule.friday[0].temperature).toBe("24");
    expect(element.shadowRoot!.querySelectorAll(".day-conflict-list [role=radio]")).toHaveLength(2);
    expect(element.shadowRoot!.querySelectorAll('[role="radio"][aria-checked="true"]')).toHaveLength(1);
    element.remove();
  });
  it("keeps original Profile alternatives selectable and protects actual common draft edits", async () => {
    const element = await grouped();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const internal = element as unknown as { _draft: ClimateProfileDraft; _setBlocks(id: string, day: string, blocks: unknown[]): void; _configurationRevision?: number };
    let radios = element.shadowRoot!.querySelectorAll<HTMLElement>('[role="radio"]');
    radios[0].click(); await element.updateComplete;
    expect(element.shadowRoot!.querySelectorAll('[role="radio"]')).toHaveLength(2);
    radios = element.shadowRoot!.querySelectorAll<HTMLElement>('[role="radio"]');
    radios[1].click(); await element.updateComplete;
    expect(confirm).not.toHaveBeenCalled();
    let zone = internal._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule");
    expect(zone.schedule.monday).toEqual([]);
    element.shadowRoot!.querySelectorAll<HTMLElement>('[role="radio"]')[0].click(); await element.updateComplete;
    zone = internal._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule");
    expect(zone.schedule.tuesday[0].temperature).toBe(22);
    internal._setBlocks("climate.office", "monday", [{ start: "08:00", action: "set_temperature", temperature: "24", hvac_mode: "cool" }]);
    await element.updateComplete;
    element.shadowRoot!.querySelectorAll<HTMLElement>('[role="radio"]')[1].click(); await element.updateComplete;
    expect(confirm).toHaveBeenCalledOnce();
    zone = internal._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule");
    expect(zone.schedule.friday[0].temperature).toBe("24");
    expect(internal._configurationRevision).toBe(1);
    expect(element.shadowRoot!.querySelectorAll('[role="radio"][aria-checked="true"]')).toHaveLength(1);
    confirm.mockRestore(); element.remove();
  });
  it.each(["normal", "pause"])("clears hidden mixed candidates when behavior changes to %s", async (behavior) => {
    const element = await grouped();
    const internal = element as unknown as { _setZoneBehavior(id: string, behavior: "normal" | "pause"): void; _hasUnchosenGroup(): boolean; _save(): Promise<void> };
    internal._setZoneBehavior("climate.office", behavior as "normal" | "pause");
    await element.updateComplete;
    expect(internal._hasUnchosenGroup()).toBe(false);
    expect(element.shadowRoot!.querySelector(".day-conflict-list")).toBeNull();
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>(".profile-workspace-save button")!.disabled).toBe(false);
    const save = vi.spyOn(VelairApiClient.prototype, "setClimateProfile").mockResolvedValue(element.data);
    await internal._save(); expect(save).toHaveBeenCalled();
    save.mockRestore(); element.remove();
  });
  it("drops unchosen snapshots on layout changes and gates only the current mixed layout", async () => {
    const element = await grouped();
    const internal = element as unknown as { _setDayLayout(id: string, key: string): void; _hasUnchosenGroup(): boolean };
    internal._setDayLayout("climate.office", "individual"); await element.updateComplete;
    expect(internal._hasUnchosenGroup()).toBe(false);
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>(".profile-workspace-save button")!.disabled).toBe(false);
    internal._setDayLayout("climate.office", "all"); await element.updateComplete;
    expect(internal._hasUnchosenGroup()).toBe(true);
    expect(element.shadowRoot!.querySelectorAll('[role="radio"][aria-checked="true"]')).toHaveLength(0);
    element.remove();
  });
  it("invalidates a mixed destination snapshot after an explicit cross-zone replacement", async () => {
    const element = await grouped();
    const internal = element as unknown as { _draft: ClimateProfileDraft; _selectedEntity: string; _climateCloneDialog: unknown; _confirmCloneDayToClimates(): Promise<void>; _hasUnchosenGroup(): boolean };
    const blocks = [{ start: "08:00", action: "set_temperature", temperature: 21, hvac_mode: "cool" }];
    internal._draft.zones["climate.kitchen"] = { behavior: "schedule", day_layout_key: "all", schedule: Object.fromEntries(WEEKDAYS.map(day => [day, blocks])) };
    internal._selectedEntity = "climate.kitchen";
    expect(internal._hasUnchosenGroup()).toBe(false);
    internal._climateCloneDialog = { entityId: "climate.kitchen", weekday: "monday", targets: new Set(["climate.office"]) };
    const preview = vi.spyOn(VelairApiClient.prototype, "previewProfile").mockResolvedValue({ configuration_revision: 1 } as never);
    await internal._confirmCloneDayToClimates();
    internal._selectedEntity = "climate.office"; await element.updateComplete;
    expect(element.shadowRoot!.querySelectorAll('[role="radio"]')).toHaveLength(1);
    const copied = element.shadowRoot!.querySelector<HTMLElement>('[role="radio"]')!;
    expect(copied.textContent).toContain("21"); copied.click(); await element.updateComplete;
    const zone = internal._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule");
    expect(zone.schedule.sunday[0].temperature).toBe(21);
    expect(internal._hasUnchosenGroup()).toBe(false);
    preview.mockRestore(); element.remove();
  });
  it("rebuilds unchosen alternatives from incoming saved configuration before a first choice", async () => {
    const element = await grouped();
    const profile = structuredClone(element.data!.profiles![0]);
    const savedZone = profile.zones["climate.office"];
    if (savedZone.behavior !== "schedule") throw new Error("Expected schedule");
    savedZone.schedule.monday = [{ start: "08:00", action: "set_temperature", temperature: 24, hvac_mode: "cool" }];
    element.data = { ...element.data!, configuration_revision: 2, profiles: [profile] };
    await element.updateComplete;
    const first = element.shadowRoot!.querySelector<HTMLElement>('[role="radio"]')!;
    expect(first.textContent).toContain("24 °C"); expect(first.textContent).not.toContain("22 °C");
    first.click(); await element.updateComplete;
    const save = vi.spyOn(VelairApiClient.prototype, "setClimateProfile").mockResolvedValue(element.data);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await (element as unknown as { _save(): Promise<void> })._save();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ zones: { "climate.office": expect.objectContaining({ schedule: expect.objectContaining({ friday: [expect.objectContaining({ temperature: 24 })] }) }) } }), 2);
    confirm.mockRestore(); save.mockRestore(); element.remove();
  });
  it("blocks a replacement candidate while Save Profile is in flight", async () => {
    const element = await grouped();
    element.shadowRoot!.querySelector<HTMLElement>('[role="radio"]')!.click(); await element.updateComplete;
    let finish!: (data: ScheduleResponse) => void;
    const request = new Promise<ScheduleResponse>(resolve => { finish = resolve; });
    const save = vi.spyOn(VelairApiClient.prototype, "setClimateProfile").mockReturnValue(request);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const internal = element as unknown as { _save(): Promise<void>; _chooseGroupBase(id: string, day: string): boolean; _draft: ClimateProfileDraft };
    const pending = internal._save(); await element.updateComplete;
    expect(internal._chooseGroupBase("climate.office", "tuesday")).toBe(false);
    expect(element.shadowRoot!.querySelector<HTMLElement>('[role="radio"]')!.getAttribute("aria-disabled")).toBe("true");
    const zone = internal._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule");
    expect(zone.schedule.tuesday[0].temperature).toBe(22);
    finish(element.data!); await pending;
    confirm.mockRestore(); save.mockRestore(); element.remove();
  });
  it("blocks profile group, zone, layout and profile navigation until Save resolves", async () => {
    const element = await grouped();
    const internal = element as unknown as { _save(): Promise<void>; _selectDay(id: string, day: string): void; _selectEntity(id: string): void; _setDayLayout(id: string, key: string): boolean | void; _selectProfile(profile: ClimateProfile): void; _selectedEntity: string; _selectedKey: string; _selectedDays: Record<string, string>; _draft: ClimateProfileDraft };
    element.shadowRoot!.querySelector<HTMLElement>('[role="radio"]')!.click(); await element.updateComplete;
    const draft = structuredClone(internal._draft);
    let finish!: (data: ScheduleResponse) => void;
    const save = vi.spyOn(VelairApiClient.prototype, "setClimateProfile").mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const pending = internal._save(); await element.updateComplete;
    expect(element.scheduleSavePending).toBe(true);
    expect(element.shadowRoot!.querySelector<HTMLSelectElement>('.day-layout-controls select')!.disabled).toBe(true);
    expect([...element.shadowRoot!.querySelectorAll<HTMLButtonElement>('.day-tab')].every(button => button.disabled)).toBe(true);
    const selector = element.shadowRoot!.querySelector<HTMLSelectElement>('.day-layout-controls select')!;
    selector.value = "individual"; selector.dispatchEvent(new Event("change"));
    expect(selector.value).toBe("weekdays_weekend");
    internal._selectDay("climate.office", "saturday"); internal._selectEntity("climate.kitchen");
    expect(internal._setDayLayout("climate.office", "individual")).toBe(false);
    internal._selectProfile({ key: "other", name: "Other", zones: {} });
    expect(internal._selectedDays["climate.office"]).toBe("monday"); expect(internal._selectedEntity).toBe("climate.office"); expect(internal._selectedKey).toBe("away");
    expect(internal._draft).toEqual(draft);
    finish({ ...element.data!, configuration_revision: 2, profiles: [{ ...save.mock.calls[0][0], key: "away" }] });
    await pending; await element.updateComplete;
    expect(element.scheduleSavePending).toBe(false); expect(element.shadowRoot!.querySelector(".profile-block-list")).not.toBeNull();
    internal._selectDay("climate.office", "saturday"); expect(internal._selectedDays["climate.office"]).toBe("saturday");
    internal._setDayLayout("climate.office", "individual");
    const zone = internal._draft.zones["climate.office"];
    expect(zone.behavior === "schedule" && zone.day_layout_key).toBe("individual");
    internal._selectEntity("climate.kitchen"); expect(internal._selectedEntity).toBe("climate.kitchen");
    save.mockRestore(); element.remove();
  });
  it("resolves a repaired live full-link graph separately from a failed original candidate graph", async () => {
    const element = await grouped(false);
    const blocks = [{ slot_id: "slot", start: "08:00", action: "set_temperature", temperature: 24, hvac_mode: "cool" }];
    element.data = { ...element.data!, templates: [{ key: "valid", name: "Valid", blocks }] };
    await element.updateComplete;
    const internal = element as unknown as { _draft: ClimateProfileDraft; _setDayLayout(id: string, key: string): void };
    const zone = internal._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule");
    zone.template_links = { monday: { mode: "full", template_key: "missing" }, tuesday: { mode: "full", template_key: "valid" } };
    zone.schedule.monday = []; zone.schedule.tuesday = [];
    const preview = vi.spyOn(VelairApiClient.prototype, "previewProfile").mockImplementation(async input => {
      const current = input.zones["climate.office"];
      if (current.behavior === "schedule" && current.template_links?.monday?.template_key === "missing") throw new Error("Broken original graph");
      return { configuration_revision: 1, resolved_schedules: { "climate.office": Object.fromEntries(WEEKDAYS.map(day => [day, blocks])) } } as never;
    });
    internal._setDayLayout("climate.office", "weekdays_weekend");
    await vi.waitFor(() => expect(element.shadowRoot!.querySelectorAll('[role="radio"]')[1]?.textContent).toContain("could not be loaded"));
    element.shadowRoot!.querySelectorAll<HTMLElement>('[role="radio"]')[1].click();
    expect(element.shadowRoot!.querySelector(".editor .timeline-panel")).toBeNull();
    await vi.waitFor(() => expect(element.shadowRoot!.querySelector<HTMLButtonElement>(".profile-workspace-save button")!.disabled).toBe(false));
    const save = vi.spyOn(VelairApiClient.prototype, "setClimateProfile").mockImplementation(async input => ({ ...element.data!, profiles: [{ ...input, key: "away" }], configuration_revision: 2 }));
    await (element as unknown as { _save(): Promise<void> })._save();
    await vi.waitFor(() => expect(element.shadowRoot!.querySelector(".editor .timeline-panel")?.textContent).toContain("24"));
    save.mockRestore();
    preview.mockRestore(); element.remove();
  });
  it.each(["monday", "saturday"])("saves only the selected %s group before opening its common editor", async day => {
    const element = await grouped();
    const internal = element as unknown as { _draft: ClimateProfileDraft; _selectDay(id: string, day: string): void; _save(): Promise<void>; _setDayLayout(id: string, key: string): void };
    const zone = internal._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule");
    zone.schedule.saturday = [{ start: "08:00", action: "set_temperature", temperature: "25", hvac_mode: "cool" }];
    const before = structuredClone(zone.schedule);
    internal._selectDay("climate.office", day); element.requestUpdate(); await element.updateComplete;
    const selected = day === "monday" ? WEEKDAYS.slice(0, 5) : WEEKDAYS.slice(5);
    const outside = WEEKDAYS.filter(item => !selected.includes(item));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const save = vi.spyOn(VelairApiClient.prototype, "setClimateProfile").mockRejectedValueOnce(new Error("Revision conflict"))
      .mockImplementation(async input => ({ ...element.data!, configuration_revision: 2, profiles: [{ ...input, key: "away" }] }));
    await internal._save(); expect(save).not.toHaveBeenCalled();
    element.shadowRoot!.querySelector<HTMLElement>('[role="radio"]')!.click(); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".profile-block-list, .hours-source-control, .copy-panel")).toBeNull();
    await internal._save(); await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[role="radio"][aria-checked="true"]')).not.toBeNull();
    expect(element.shadowRoot!.querySelector(".profile-block-list")).toBeNull();
    await internal._save(); await element.updateComplete;
    expect(confirm).not.toHaveBeenCalled(); expect(save).toHaveBeenCalledTimes(2);
    const saved = save.mock.calls[1][0].zones["climate.office"];
    if (saved.behavior !== "schedule") throw new Error("Expected schedule");
    for (const item of outside) expect(saved.schedule[item]).toEqual(before[item].map(block => ({ ...block, temperature: block.temperature === undefined ? undefined : Number(block.temperature) })));
    for (const item of selected) expect(saved.schedule[item]).toEqual(saved.schedule[day]);
    expect(element.shadowRoot!.querySelector(".day-conflict-list")).toBeNull();
    expect(element.shadowRoot!.querySelector(".profile-block-list")).not.toBeNull();
    expect([...element.shadowRoot!.querySelectorAll<HTMLElement>('.day-tab.active')].map(cell => cell.dataset.weekday)).toEqual(selected);
    confirm.mockRestore(); save.mockRestore(); element.remove();
  });
  it("keeps uniform weekdays editable while an untouched weekend remains mixed", async () => {
    const element = await grouped(false);
    const profile = structuredClone(element.data!.profiles![0]);
    const persisted = profile.zones["climate.office"];
    if (persisted.behavior !== "schedule") throw new Error("Expected schedule");
    persisted.schedule.sunday = [];
    element.data = { ...element.data!, profiles: [profile] }; await element.updateComplete;
    const internal = element as unknown as { _setBlocks(id: string, day: string, blocks: unknown[]): void; _save(): Promise<void> };
    internal._setBlocks("climate.office", "monday", [{ start: "08:00", action: "set_temperature", temperature: "24", hvac_mode: "cool" }]); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".day-conflict-list")).toBeNull();
    expect(element.shadowRoot!.querySelector(".profile-block-list")).not.toBeNull();
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>(".profile-workspace-save button")!.disabled).toBe(false);
    const save = vi.spyOn(VelairApiClient.prototype, "setClimateProfile").mockImplementation(async input => ({ ...element.data!, configuration_revision: 2, profiles: [{ ...input, key: "away" }] }));
    await internal._save();
    const saved = save.mock.calls[0][0].zones["climate.office"];
    if (saved.behavior !== "schedule") throw new Error("Expected schedule");
    expect(saved.schedule.friday[0].temperature).toBe(24);
    expect(saved.schedule.saturday).toEqual(persisted.schedule.saturday); expect(saved.schedule.sunday).toEqual([]);
    save.mockRestore(); element.remove();
  });
  it("rechecks pending weekdays after Individual navigation without replacing the weekend", async () => {
    const element = await grouped();
    const internal = element as unknown as { _draft: ClimateProfileDraft; _setDayLayout(id: string, key: string): void; _setBlocks(id: string, day: string, blocks: unknown[]): void };
    element.shadowRoot!.querySelector<HTMLElement>('[role="radio"]')!.click(); await element.updateComplete;
    internal._setDayLayout("climate.office", "individual"); await element.updateComplete;
    internal._setBlocks("climate.office", "tuesday", [{ start: "08:00", action: "set_temperature", temperature: "24", hvac_mode: "cool" }]);
    internal._setDayLayout("climate.office", "weekdays_weekend"); await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[role="radio"][aria-checked="true"]')).toBeNull();
    expect(element.shadowRoot!.querySelector(".profile-block-list")).toBeNull();
    const zone = internal._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule");
    expect(zone.schedule.tuesday[0].temperature).toBe("24");
    expect(zone.schedule.saturday).toEqual([]); expect(zone.schedule.sunday).toEqual([]);
    element.remove();
  });
  it("waits for a successful All days Profile save before exposing common editing controls", async () => {
    const element = await grouped();
    const internal = element as unknown as { _setDayLayout(id: string, key: string): void; _save(): Promise<void> };
    internal._setDayLayout("climate.office", "all"); await element.updateComplete;
    element.shadowRoot!.querySelector<HTMLElement>('[role="radio"]')!.click(); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".profile-block-list")).toBeNull();
    expect(element.shadowRoot!.querySelector(".hours-source-control")).toBeNull();
    expect(element.shadowRoot!.querySelector(".copy-panel")).toBeNull();
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>(".profile-workspace-save button")!.disabled).toBe(false);
    const save = vi.spyOn(VelairApiClient.prototype, "setClimateProfile").mockImplementation(async input => ({ ...element.data!, configuration_revision: 2, profiles: [{ ...input, key: "away" }] }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await internal._save(); await element.updateComplete;
    expect(confirm).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ zones: { "climate.office": expect.objectContaining({ day_layout_key: "all" }) } }), 1);
    expect(element.shadowRoot!.querySelector(".day-conflict-list")).toBeNull();
    expect(element.shadowRoot!.querySelector(".profile-block-list")).not.toBeNull();
    (element as unknown as { _setBlocks(id: string, day: string, blocks: unknown[]): void })._setBlocks("climate.office", "monday", [{ start: "08:00", action: "set_temperature", temperature: "24", hvac_mode: "cool" }]);
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".profile-block-list")).not.toBeNull();
    await internal._save(); await element.updateComplete;
    expect(save).toHaveBeenCalledTimes(2);
    const last = save.mock.calls[1][0].zones["climate.office"];
    if (last.behavior !== "schedule") throw new Error("Expected schedule");
    expect(last.schedule.sunday[0].temperature).toBe(24);
    confirm.mockRestore(); save.mockRestore(); element.remove();
  });
  it("requires an All days Profile choice and retains selection after rejection without extra confirmation", async () => {
    const element = await grouped();
    const internal = element as unknown as { _setDayLayout(id: string, key: string): void; _save(): Promise<void>; _dirty: boolean };
    internal._setDayLayout("climate.office", "all"); await element.updateComplete;
    const save = vi.spyOn(VelairApiClient.prototype, "setClimateProfile").mockRejectedValue(new Error("Revision conflict"));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await internal._save(); expect(save).not.toHaveBeenCalled();
    element.shadowRoot!.querySelector<HTMLElement>('[role="radio"]')!.click(); await element.updateComplete;
    await internal._save(); await element.updateComplete;
    expect(save).toHaveBeenCalledOnce(); expect(confirm).not.toHaveBeenCalled();
    expect(element.shadowRoot!.querySelectorAll('[role="radio"][aria-checked="true"]')).toHaveLength(1);
    expect(element.shadowRoot!.querySelector(".profile-block-list")).toBeNull(); expect(internal._dirty).toBe(true);
    element.shadowRoot!.querySelectorAll<HTMLElement>('[role="radio"]')[1].click(); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".profile-block-list")).toBeNull();
    confirm.mockRestore(); save.mockRestore(); element.remove();
  });
  it("keeps many pending applications in a keyboard-accessible list separate from Save and its hint", async () => {
    const element = await grouped();
    const internal = element as unknown as { _groupCandidates: Map<string, unknown>; _draft: ClimateProfileDraft };
    for (let index = 0; index < 10; index++) internal._groupCandidates.set(`climate.room_${index}:monday,tuesday,wednesday,thursday,friday`, { selectedDay: "thursday", draft: structuredClone(internal._draft) });
    element.requestUpdate(); await element.updateComplete;
    const footer = element.shadowRoot!.querySelector(".profile-workspace-save")!;
    const list = footer.querySelector<HTMLElement>('.group-save-summary-list[role="region"]')!;
    expect(list.querySelectorAll(".group-save-summary")).toHaveLength(10);
    expect(list.getAttribute("tabindex")).toBe("0"); expect(list.getAttribute("aria-label")).toBe("Pending schedule applications");
    expect(list.querySelector("button, small")).toBeNull();
    expect(footer.querySelector(".group-save-summaries > small")?.textContent).toContain("other pending profile changes");
    expect(footer.querySelector("button")).not.toBeNull();
    expect(element.shadowRoot!.querySelector(".profile-group-save-actions .group-save-summary-list")?.hasAttribute("tabindex")).toBe(false);
    element.remove();
  });
  it("saves independently chosen All days and weekdays together without replacement confirmation", async () => {
    const element = await grouped();
    const internal = element as unknown as { _setDayLayout(id: string, key: string): void; _selectedEntity: string; _draft: ClimateProfileDraft; _save(): Promise<void> };
    internal._setDayLayout("climate.office", "all"); await element.updateComplete;
    element.shadowRoot!.querySelector<HTMLElement>('[role="radio"]')!.click(); await element.updateComplete;
    const schedule = Object.fromEntries(WEEKDAYS.map(day => [day, day === "monday" ? [{ start: "08:00", action: "set_temperature", temperature: 24, hvac_mode: "cool" }] : []]));
    element.data = { ...element.data!, configured_entities: ["climate.office", "climate.kitchen"] };
    element.hass = { ...element.hass!, states: { ...element.hass!.states, "climate.kitchen": { ...element.hass!.states!["climate.office"], attributes: { ...element.hass!.states!["climate.office"].attributes, friendly_name: "Kitchen" } } } };
    internal._draft.zones["climate.kitchen"] = { behavior: "schedule", day_layout_key: "weekdays_weekend", schedule };
    internal._selectedEntity = "climate.kitchen"; await element.updateComplete;
    element.shadowRoot!.querySelector<HTMLElement>('[role="radio"]')!.click(); await element.updateComplete;
    const summaries = [...element.shadowRoot!.querySelectorAll(".profile-workspace-save .group-save-summary")];
    expect(summaries).toHaveLength(2);
    expect(summaries[0].textContent).toContain("Apply Monday’s schedule to All days.");
    expect(summaries[1].textContent).toContain("Kitchen");
    expect(summaries[1].textContent).toContain("Apply Monday’s schedule to Monday–Friday.");
    expect(element.shadowRoot!.querySelector(".profile-workspace-save .group-save-summaries")?.textContent).toContain("other pending profile changes");
    const save = vi.spyOn(VelairApiClient.prototype, "setClimateProfile").mockResolvedValue(element.data);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await internal._save();
    expect(confirm).not.toHaveBeenCalled(); expect(save).toHaveBeenCalledOnce();
    const kitchen = save.mock.calls[0][0].zones["climate.kitchen"];
    if (kitchen.behavior !== "schedule") throw new Error("Expected schedule");
    expect(kitchen.schedule.friday[0].temperature).toBe(24);
    expect(kitchen.schedule.saturday).toEqual([]); expect(kitchen.schedule.sunday).toEqual([]);
    confirm.mockRestore(); save.mockRestore(); element.remove();
  });
  it("keeps pending All days equalization gated across layout navigation and preserves individual edits", async () => {
    const element = await grouped();
    const internal = element as unknown as { _setDayLayout(id: string, key: string): void; _setBlocks(id: string, day: string, blocks: unknown[]): void; _draft: ClimateProfileDraft };
    internal._setDayLayout("climate.office", "all"); await element.updateComplete;
    element.shadowRoot!.querySelector<HTMLElement>('[role="radio"]')!.click(); await element.updateComplete;
    internal._setDayLayout("climate.office", "individual"); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".profile-block-list")).not.toBeNull();
    internal._setBlocks("climate.office", "tuesday", [{ start: "08:00", action: "set_temperature", temperature: "24", hvac_mode: "cool" }]);
    internal._setDayLayout("climate.office", "all"); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".profile-block-list")).toBeNull();
    expect(element.shadowRoot!.querySelectorAll('[role="radio"][aria-checked="true"]')).toHaveLength(0);
    const zone = internal._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule");
    expect(zone.schedule.tuesday[0].temperature).toBe("24");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>(".profile-workspace-save button")!.disabled).toBe(true);
    const radios = [...element.shadowRoot!.querySelectorAll<HTMLElement>('[role="radio"]')];
    const edited = radios.find(radio => radio.textContent?.includes("24 °C"))!;
    expect(edited).toBeDefined(); edited.click(); await element.updateComplete;
    const current = internal._draft.zones["climate.office"];
    if (current.behavior !== "schedule") throw new Error("Expected schedule");
    expect(current.schedule.monday[0].temperature).toBe("24");
    expect(element.shadowRoot!.querySelector(".profile-block-list")).toBeNull();
    element.remove();
  });
  it("preserves raw full-template references in an All days save before opening its editor", async () => {
    const element = await grouped();
    const link = { mode: "full" as const, template_key: "full" };
    const blocks = [{ slot_id: "slot", start: "08:00", action: "set_temperature", temperature: 24, hvac_mode: "cool" }];
    element.data = { ...element.data!, templates: [{ key: "full", name: "Full", blocks }] }; await element.updateComplete;
    const internal = element as unknown as { _draft: ClimateProfileDraft; _setDayLayout(id: string, key: string): void; _save(): Promise<void> };
    const zone = internal._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule");
    zone.template_links = { monday: link };
    zone.schedule.monday = [];
    const preview = vi.spyOn(VelairApiClient.prototype, "previewProfile").mockResolvedValue({ configuration_revision: 1, resolved_schedules: { "climate.office": Object.fromEntries(WEEKDAYS.map(day => [day, blocks])) } } as never);
    internal._setDayLayout("climate.office", "all"); await element.updateComplete;
    element.shadowRoot!.querySelector<HTMLElement>('[role="radio"]')!.click(); await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".hours-source-control")).toBeNull();
    const save = vi.spyOn(VelairApiClient.prototype, "setClimateProfile").mockImplementation(async input => ({ ...element.data!, configuration_revision: 2, profiles: [{ ...input, key: "away" }] }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await internal._save(); await element.updateComplete;
    const savedZone = save.mock.calls[0][0].zones["climate.office"];
    if (savedZone.behavior !== "schedule") throw new Error("Expected schedule");
    expect(savedZone.template_links).toEqual(Object.fromEntries(WEEKDAYS.map(day => [day, link])));
    expect(savedZone.schedule.friday).toEqual([]);
    expect(element.shadowRoot!.querySelector(".hours-source-control")).not.toBeNull();
    confirm.mockRestore(); save.mockRestore(); preview.mockRestore(); element.remove();
  });
  it("loads a referenced draft in mixed details even when another weekday is selected", async () => {
    const element = await grouped(false);
    const preview = vi.spyOn(VelairApiClient.prototype, "previewDailySchedule").mockResolvedValue({ blocks: [{ start: "08:00", action: "set_temperature", temperature: 25, hvac_mode: "cool" }] } as never);
    const internal = element as unknown as { _setDayLayout(id: string, key: string): void; _setBlocks(id: string, day: string, blocks: unknown[]): void; _selectDay(id: string, day: string): void; _draft: ClimateProfileDraft };
    internal._setDayLayout("climate.office", "individual");
    internal._setBlocks("climate.office", "monday", [{ start: "08:00", preset_key: "new-preset", action: "", hvac_mode: "" }]);
    internal._selectDay("climate.office", "tuesday");
    internal._setDayLayout("climate.office", "all");
    await element.updateComplete;
    await vi.waitFor(() => expect(preview).toHaveBeenCalledWith("climate.office", "monday", { blocks: [{ start: "08:00", preset_key: "new-preset" }] }));
    await vi.waitFor(() => expect(element.shadowRoot!.querySelector(".day-conflict-row:first-of-type .day-conflict-summary")?.textContent).toContain("25 °C"));
    expect(element.shadowRoot!.querySelector(".profile-block-list")).toBeNull();
    preview.mockRestore(); element.remove();
  });
  it("shares one graph preview across full-reference conflict blocks and caches rerenders", async () => {
    const element = await grouped(false);
    const blocks = Array.from({ length: 3 }, (_, index) => ({ slot_id: `slot-${index}`, start: `${String(8 + index).padStart(2, "0")}:00`, action: "set_temperature", temperature: 24 + index, hvac_mode: "cool" }));
    element.data = { ...element.data!, templates: [{ key: "full", name: "Full template", blocks }] };
    await element.updateComplete;
    const preview = vi.spyOn(VelairApiClient.prototype, "previewProfile").mockResolvedValue({ configuration_revision: 1, resolved_schedules: { "climate.office": { monday: blocks, tuesday: blocks } } } as never);
    const internal = element as unknown as { _draft: ClimateProfileDraft; _setDayLayout(id: string, key: string): void };
    const zone = internal._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule");
    zone.template_links = { monday: { mode: "full", template_key: "full" }, tuesday: { mode: "full", template_key: "full" } };
    internal._setDayLayout("climate.office", "all");
    await vi.waitFor(() => expect(element.shadowRoot!.querySelector(".day-conflict-row:first-of-type .day-conflict-summary")?.textContent).toContain("24 °C"));
    expect(preview).toHaveBeenCalledOnce();
    element.requestUpdate(); await element.updateComplete;
    expect(preview).toHaveBeenCalledOnce();
    preview.mockRestore(); element.remove();
  });
  it("shows a failed reference preview as unavailable instead of permanent loading", async () => {
    const element = await grouped(false);
    const preview = vi.spyOn(VelairApiClient.prototype, "previewDailySchedule").mockRejectedValue(new Error("Preview rejected"));
    const internal = element as unknown as { _setDayLayout(id: string, key: string): void; _setBlocks(id: string, day: string, blocks: unknown[]): void; _selectDay(id: string, day: string): void };
    internal._setDayLayout("climate.office", "individual");
    internal._setBlocks("climate.office", "monday", [{ start: "08:00", preset_key: "missing-preset", action: "", hvac_mode: "" }]);
    internal._selectDay("climate.office", "tuesday");
    internal._setDayLayout("climate.office", "all");
    await vi.waitFor(() => expect(element.shadowRoot!.querySelector(".day-conflict-row:first-of-type .day-conflict-summary")?.textContent).toContain("The template settings could not be loaded."));
    preview.mockRestore(); element.remove();
  });
  it("retains grouped edits across tabs and preserves the original revision across layout selection", async () => {
    const element = await grouped(false);
    const internal = element as unknown as { _setBlocks(id: string, day: string, blocks: unknown[]): void; _setDayLayout(id: string, key: string): void; _configurationRevision?: number; _draft: ClimateProfileDraft; _dirty: boolean };
    internal._setBlocks("climate.office", "monday", [{ start: "09:00", action: "set_temperature", temperature: "24", hvac_mode: "cool" }]);
    await element.updateComplete;
    element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".day-tab")[1].click();
    await element.updateComplete;
    expect(internal._dirty).toBe(true);
    expect((internal._draft.zones["climate.office"] as any).schedule.monday[0].temperature).toBe("24");
    element.data = { ...element.data!, configuration_revision: 2 };
    internal._setDayLayout("climate.office", "all");
    expect(internal._configurationRevision).toBe(1);
    element.remove();
  });
  it("propagates grouped linked bindings through the profile editor adapter", async () => {
    const element = await grouped(false);
    element.data = { ...element.data!, templates: [{ key: "hours", name: "Hours", blocks: [{ slot_id: "morning", start: "08:00", action: "set_temperature", temperature: 22 }] }] } as ScheduleResponse;
    const internal = element as unknown as { _draft: ClimateProfileDraft; _setBlocks(id: string, day: string, blocks: unknown[]): void };
    const zone = internal._draft.zones["climate.office"];
    if (zone.behavior !== "schedule") throw new Error("Expected schedule");
    zone.template_links = Object.fromEntries(WEEKDAYS.slice(0, 5).map(day => [day, { mode: "hours", template_key: "hours", bindings: { morning: { preset_key: "cool" } } }]));
    for (const day of WEEKDAYS.slice(0, 5)) zone.schedule[day] = [];
    internal._setBlocks("climate.office", "monday", [{ slot_id: "morning", start: "08:00", preset_key: "comfort", action: "set_temperature", hvac_mode: "" }]);
    const changed = internal._draft.zones["climate.office"];
    if (changed.behavior !== "schedule") throw new Error("Expected schedule");
    expect(changed.template_links?.friday).toEqual({ mode: "hours", template_key: "hours", bindings: { morning: { preset_key: "comfort" } } });
    expect(changed.schedule.saturday).toEqual(zone.schedule.saturday);
    element.remove();
  });

});


it("offers separate profile base and exception actions", async () => {
  const element = new VelairProfilesView();
  element.data = data;
  element.hass = { language: "en", states: {}, connection: {} } as never;
  const apply = vi.spyOn(VelairApiClient.prototype, "applyProfiles").mockResolvedValue(data);
  const activate = vi.spyOn(VelairApiClient.prototype, "activateProfile").mockResolvedValue(data);
  document.body.append(element);
  await element.updateComplete;
  const button = element.shadowRoot!.querySelector<HTMLButtonElement>(".profile-item-apply")!;
  expect(button.title).toBe("Apply as exception: Away");
  button.click();
  await element.updateComplete;
  expect(apply).toHaveBeenCalledWith(["away"]);
  await vi.waitFor(() => expect((element as unknown as { _busy?: string })._busy).toBeUndefined());
  await element.updateComplete;
  apply.mockClear();
  const choice = element.shadowRoot!.querySelector(".active-setup-profile-choice")!;
  const compactAction = choice.querySelector<HTMLButtonElement>(".active-setup-apply-exception")!;
  expect(compactAction.getAttribute("aria-label")).toBe("Apply as exception: Away");
  expect(compactAction.title).toBe("Apply as exception: Away");
  expect(compactAction.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:layers-plus");
  expect(compactAction.textContent?.trim()).toBe("");
  expect(choice.querySelector('[data-profile-id="away"]')).not.toBeNull();
  compactAction.click();
  await vi.waitFor(() => expect(apply).toHaveBeenCalledWith(["away"]));
  expect(activate).not.toHaveBeenCalled();
  apply.mockRestore(); activate.mockRestore(); element.remove();
});


it("does not mark a base Profile as current while selecting it would clear exceptions", async () => {
  const element = new VelairProfilesView();
  element.data = { ...data, profile_selection: { base_profile_ids: ["away"], base_mode_id: null,
    zone_profile_overrides: { "climate.office": null } } } as ScheduleResponse;
  document.body.append(element);
  await element.updateComplete;
  expect(element.shadowRoot?.querySelector('[data-profile-id="away"]')?.hasAttribute("aria-current")).toBe(false);
  element.data = { ...element.data, profile_selection: { base_profile_ids: ["away"], base_mode_id: null,
    zone_profile_overrides: {} } } as ScheduleResponse;
  await element.updateComplete;
  expect(element.shadowRoot?.querySelector('[data-profile-id="away"]')?.getAttribute("aria-current")).toBe("true");
  element.remove();
});


it("separates an unchanged base from explicit Profile and Default exception groups", async () => {
  const element = new VelairProfilesView();
  const winter = { key: "winter", name: "Winter", color: "#123456", zones: { "climate.office": { behavior: "normal" }, "climate.bedroom": { behavior: "normal" } } };
  element.data = { ...data, configured_entities: ["climate.office", "climate.bedroom"], profiles: [winter],
    global: { mode: "running", active_profile_ids: ["winter"] }, effective_profile_ids: [],
    profile_selection: { base_profile_ids: ["winter"], base_mode_id: null,
      zone_profile_overrides: { "climate.office": "winter", "climate.bedroom": null } },
  } as unknown as ScheduleResponse;
  document.body.append(element);
  await element.updateComplete;
  expect(element.shadowRoot?.querySelector(".active-setup-mode strong")?.textContent).toBe("Winter");
  expect(element.shadowRoot?.querySelector(".active-setup-summary")?.textContent).not.toContain("Manual");
  const groups = element.shadowRoot!.querySelectorAll(".active-setup-exception-group");
  expect(groups).toHaveLength(2);
  expect(groups[0].textContent).toContain("Winter");
  expect(groups[0].getAttribute("style")).toContain("--profile-accent: #123456");
  expect(groups[1].hasAttribute("style")).toBe(false);
  expect(element.shadowRoot?.querySelector(".active-setup-summary-icon")?.getAttribute("style"))
    .toContain("--profile-accent: #123456");
  expect(groups[0].textContent).toContain("1 zone");
  expect(groups[1].textContent).toContain("Default");
  expect(groups[1].querySelector(".exception-group-zones")?.getAttribute("aria-hidden")).toBe("true");
  element.data = { ...element.data, profile_selection: { base_profile_ids: ["winter"], base_mode_id: null,
    zone_profile_overrides: {} } } as ScheduleResponse;
  await element.updateComplete;
  expect(element.shadowRoot!.querySelectorAll(".active-setup-exception-group")).toHaveLength(0);
  expect(element.shadowRoot?.querySelector(".active-setup-exceptions")?.textContent).toContain("No exceptions");
  expect(element.shadowRoot?.querySelector(".active-setup-exceptions")?.textContent).not.toContain("Winter");
  element.remove();
});




async function exceptionDetailFixture(controls: "modes" | "profiles" | "both" = "both") {
  const element = new VelairProfilesView();
  element.activeSetupControls = controls;
  const sendMessagePromise = vi.fn();
  element.hass = { language: "en", connection: { sendMessagePromise }, states: {
    "climate.office": { attributes: { friendly_name: "Office" } },
    "climate.study": { attributes: { friendly_name: "Study" } },
    "climate.bedroom": { attributes: { friendly_name: "Bedroom" } },
  } } as never;
  element.data = { ...data, configured_entities: ["climate.office", "climate.study", "climate.bedroom"], profiles: [{ key: "work", name: "Default", zones: {} }],
    modes: [{ key: "season", name: "A very long seasonal Mode name that should wrap safely", profile_ids: ["work"] }],
    profile_selection: { base_profile_ids: ["work"], base_mode_id: "season",
      zone_profile_overrides: { "climate.office": "work", "climate.study": "work", "climate.bedroom": null } },
  } as unknown as ScheduleResponse;
  document.body.append(element);
  await element.updateComplete;
  return { element, sendMessagePromise };
}

it("toggles exceptions from the name, icon, and row whitespace without toggling on zone details", async () => {
  const { element, sendMessagePromise } = await exceptionDetailFixture("both");
  const button = element.shadowRoot!.querySelector<HTMLButtonElement>(".exception-zone-count")!;
  for (const target of [button.querySelector("strong")!, button.querySelector("ha-icon")!, button]) {
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await element.updateComplete;
    expect(button.getAttribute("aria-expanded")).toBe("true");
    element.shadowRoot!.querySelector(".exception-detail-zones li")!.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await element.updateComplete;
    expect(button.getAttribute("aria-expanded")).toBe("true");
    button.click();
    await element.updateComplete;
    expect(button.getAttribute("aria-expanded")).toBe("false");
  }
  expect(sendMessagePromise).not.toHaveBeenCalled();
  element.remove();
});

it.each(["modes", "profiles", "both"] as const)("keeps all exception rows visible while expanding one group with %s controls", async (controls) => {
  const { element, sendMessagePromise } = await exceptionDetailFixture(controls);
  const counts = () => [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".exception-zone-count")];
  const panels = () => [...element.shadowRoot!.querySelectorAll<HTMLElement>(".exception-group-zones")];
  expect(element.shadowRoot!.querySelector(".profile-selection-zones")).toBeNull();
  expect(element.shadowRoot!.querySelector(".active-setup-mode .active-setup-profile-list")).toBeNull();
  expect(element.shadowRoot!.querySelector(".active-setup-base-meta")?.textContent).toContain("Base");
  expect(element.shadowRoot!.querySelector(".active-setup-base-meta")?.textContent).toContain("Mode");
  expect(element.shadowRoot!.querySelector(".active-setup-summary-copy > strong")?.textContent)
    .toBe("A very long seasonal Mode name that should wrap safely");
  expect(counts().map((button) => button.querySelector("span")?.textContent)).toEqual(["2 zones", "1 zone"]);
  for (const button of counts()) {
    expect(button.getAttribute("aria-label")).toContain(button.querySelector("span")!.textContent!);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(element.shadowRoot!.getElementById(button.getAttribute("aria-controls")!)).not.toBeNull();
  }
  expect(counts()[0].getAttribute("aria-label")).not.toBe(counts()[1].getAttribute("aria-label"));
  for (const panel of panels()) {
    expect(panel.hasAttribute("inert")).toBe(true);
    expect(panel.getAttribute("aria-hidden")).toBe("true");
    expect(panel.querySelector("ul")?.tabIndex).toBe(-1);
  }
  counts()[0].focus(); counts()[0].click();
  await element.updateComplete;
  expect(counts()).toHaveLength(2);
  expect(counts()[0].getAttribute("aria-expanded")).toBe("true");
  expect(panels()[0].getAttribute("aria-hidden")).toBe("false");
  expect(panels()[0].hasAttribute("inert")).toBe(false);
  expect(panels()[0].textContent).toContain("Office");
  expect(panels()[0].textContent).toContain("Study");
  expect(element.shadowRoot!.activeElement).toBe(counts()[0]);
  expect(element.shadowRoot!.querySelector(".exception-detail-back")).toBeNull();
  counts()[1].click();
  await element.updateComplete;
  expect(counts()[0].getAttribute("aria-expanded")).toBe("false");
  expect(counts()[1].getAttribute("aria-expanded")).toBe("true");
  expect(panels()[0].hasAttribute("inert")).toBe(true);
  expect(panels()[1].textContent).toContain("Bedroom");
  counts()[1].dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await element.updateComplete;
  expect(counts()[1].getAttribute("aria-expanded")).toBe("false");
  expect(element.shadowRoot!.activeElement).toBe(counts()[1]);
  counts()[0].click(); await element.updateComplete;
  counts()[0].click(); await element.updateComplete;
  expect(counts()[0].getAttribute("aria-expanded")).toBe("false");
  expect(sendMessagePromise).not.toHaveBeenCalled();
  element.remove();
});

it("updates expanded exception details and closes them when the group disappears", async () => {
  const { element, sendMessagePromise } = await exceptionDetailFixture();
  element.shadowRoot!.querySelector<HTMLButtonElement>('[data-exception-group="work"]')!.click();
  await element.updateComplete;
  element.hass = { ...element.hass!, states: { ...element.hass!.states,
    "climate.office": { attributes: { friendly_name: "Updated office" } } } } as never;
  element.data = { ...element.data!, profile_selection: { ...element.data!.profile_selection!,
    zone_profile_overrides: { "climate.office": "work", "climate.bedroom": null } } };
  await element.updateComplete;
  expect(element.shadowRoot!.querySelector(".exception-group-zones.expanded")?.textContent).toContain("Updated office");
  expect(element.shadowRoot!.querySelector(".exception-group-zones.expanded")?.textContent).not.toContain("Study");
  element.data = { ...element.data!, profile_selection: { ...element.data!.profile_selection!,
    zone_profile_overrides: { "climate.bedroom": null } } };
  await element.updateComplete;
  expect(element.shadowRoot!.querySelector(".exception-group-zones.expanded")).toBeNull();
  expect(element.shadowRoot!.querySelectorAll(".exception-zone-count")).toHaveLength(1);
  expect(element.shadowRoot!.querySelector(".exception-zone-count")?.getAttribute("aria-expanded")).toBe("false");
  expect(sendMessagePromise).not.toHaveBeenCalled();
  element.remove();
});


it("shows base provenance coverage, keeps Mode components, and distinguishes empty from masked bases", async () => {
  const element = new VelairProfilesView();
  const profile = { key: "winter", name: "Winter", icon: "mdi:snowflake", color: "#123456",
    zones: { "climate.office": { behavior: "normal" }, "climate.bedroom": { behavior: "normal" } } };
  const selected = { ...data, configured_entities: ["climate.office", "climate.bedroom", "climate.other"], profiles: [profile],
    modes: [{ key: "season", name: "Season", profile_ids: ["winter"] }],
    profile_selection: { base_profile_ids: ["winter"], base_mode_id: "season", zone_profile_overrides: { "climate.office": "winter" } },
  } as unknown as ScheduleResponse;
  element.data = selected; document.body.append(element); await element.updateComplete;
  expect(element.shadowRoot!.querySelector(".active-setup-base-coverage")?.textContent).toBe("Applies in 1 of 2 zones");
  expect(element.shadowRoot!.querySelector(".base-coverage-visual")?.parentElement?.classList.contains("active-setup-summary-copy")).toBe(true);
  expect(element.shadowRoot!.querySelector(".active-setup-mode .base-coverage-bar")).not.toBeNull();
  expect(element.shadowRoot!.querySelector(".distribution-toggle")?.textContent).toContain("Household distribution · 3 zones");
  expect(element.shadowRoot!.querySelector(".active-setup-summary-label ha-icon")?.getAttribute("icon")).toBe("mdi:layers-outline");
  expect(element.shadowRoot!.querySelector(".base-coverage-legend-item ha-icon")?.getAttribute("icon")).toBe("mdi:snowflake");
  expect(element.shadowRoot!.querySelector(".active-setup-base-components")).toBeNull();
  element.data = { ...selected, profile_selection: { ...selected.profile_selection!, base_mode_id: null,
    zone_profile_overrides: { "climate.office": "winter", "climate.bedroom": null } } };
  await element.updateComplete;
  expect(element.shadowRoot!.querySelector(".active-setup-base-components")).toBeNull();
  expect(element.shadowRoot!.querySelector(".active-setup-base-coverage")?.textContent).toBe("Applies in 0 of 2 zones");
  expect(element.shadowRoot!.querySelector(".active-setup-base-note")).toBeNull();
  const bar = element.shadowRoot!.querySelector(".base-coverage-bar")!;
  expect(bar.getAttribute("aria-label")).toContain("Household distribution · 3 zones");
  expect(bar.getAttribute("aria-label")).toContain("Exception: Winter: 1 zone");
  const segments = [...bar.querySelectorAll(".base-coverage-segment")];
  expect(segments).toHaveLength(3);
  expect(segments[0].getAttribute("style")).toContain("#123456");
  expect(segments[1].getAttribute("style")).toContain("var(--secondary-text-color)");
  const defaultLegend = [...element.shadowRoot!.querySelectorAll(".base-coverage-legend-item")]
    .find((item) => item.querySelector(".distribution-legend-name")?.textContent === "Exception: Default")!;
  expect(defaultLegend.querySelector(".distribution-legend-count")?.textContent).toBe("1");
  element.data = { ...element.data!, profiles: [{ ...profile, zones: {} }] } as ScheduleResponse;
  await element.updateComplete;
  expect(element.shadowRoot!.querySelector(".active-setup-base-coverage")?.textContent).toBe("No zones included in this base.");
  expect(element.shadowRoot!.querySelector(".base-coverage-bar")).not.toBeNull();
  expect(element.shadowRoot!.querySelector(".base-coverage-legend")?.textContent).toContain("Default outside Base");
  expect(element.shadowRoot!.querySelector(".active-setup-base-note")).toBeNull();
  element.data = { ...element.data!, configured_entities: [] };
  await element.updateComplete;
  expect(element.shadowRoot!.querySelector(".base-coverage-bar")).toBeNull();
  element.remove();
});


it("keeps accordion headers in the same grid row while details expand below", () => {
  expect(profileStyles.cssText).toMatch(/\.exception-zone-count\s*\{[^}]*grid-column: 1 \/ -1; grid-row: 1;/);
  expect(profileStyles.cssText).not.toMatch(/\.exception-zone-count\[aria-expanded="true"\]\s*\{[^}]*grid-row/);
  expect(profileStyles.cssText).toMatch(/\.exception-group-zones\s*\{[^}]*grid-row: 2;/);
});


it.each(["modes", "profiles", "both"] as const)("starts household distribution collapsed and toggles read-only with %s controls", async (controls) => {
  const { element, sendMessagePromise } = await exceptionDetailFixture(controls);
  const toggle = () => element.shadowRoot!.querySelector<HTMLButtonElement>(".distribution-toggle")!;
  const panel = () => element.shadowRoot!.querySelector<HTMLElement>(".distribution-panel")!;
  expect(toggle().textContent).toContain("Household distribution");
  expect(toggle().getAttribute("aria-expanded")).toBe("false");
  expect(toggle().getAttribute("aria-controls")).toBe(panel().id);
  expect(panel().getAttribute("aria-hidden")).toBe("true");
  expect(panel().hasAttribute("inert")).toBe(true);
  expect(panel().querySelectorAll("button, input, select, [tabindex]")).toHaveLength(0);
  expect(element.shadowRoot!.querySelector(".active-setup-base-components")).toBeNull();
  toggle().focus(); toggle().click(); await element.updateComplete;
  expect(toggle().getAttribute("aria-expanded")).toBe("true");
  expect(panel().hasAttribute("inert")).toBe(false);
  expect(panel().getAttribute("aria-hidden")).toBe("false");
  expect(element.shadowRoot!.activeElement).toBe(toggle());
  const legend = [...panel().querySelectorAll(".base-coverage-legend-item")];
  expect(legend.map((row) => row.querySelector(".distribution-legend-count")?.textContent)).toEqual(["2", "1"]);
  expect(legend[0].querySelector(".distribution-legend-name")?.textContent).toBe("Exception: Default");
  expect(panel().querySelector(".base-coverage-bar")?.getAttribute("aria-label")).toContain("Exception: Default: 2 zones");
  toggle().click(); await element.updateComplete;
  expect(toggle().getAttribute("aria-expanded")).toBe("false");
  toggle().click(); await element.updateComplete;
  panel().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await element.updateComplete;
  expect(toggle().getAttribute("aria-expanded")).toBe("false");
  expect(element.shadowRoot!.activeElement).toBe(toggle());
  expect(sendMessagePromise).not.toHaveBeenCalled();
  element.remove();
});

it("keeps household distribution open during live updates and resets it when no managed zones remain", async () => {
  const { element, sendMessagePromise } = await exceptionDetailFixture();
  element.shadowRoot!.querySelector<HTMLButtonElement>(".distribution-toggle")!.click();
  await element.updateComplete;
  const initial = element.data!;
  element.data = { ...initial, profiles: initial.profiles!.map((profile) => ({ ...profile, name: "Updated profile" })),
    profile_selection: { ...initial.profile_selection!, zone_profile_overrides: { "climate.office": "work", "climate.bedroom": null } } };
  await element.updateComplete;
  expect(element.shadowRoot!.querySelector(".distribution-toggle")?.getAttribute("aria-expanded")).toBe("true");
  expect(element.shadowRoot!.querySelector(".base-coverage-legend")?.textContent).toContain("Exception: Updated profile");
  element.data = { ...initial, configured_entities: [] }; await element.updateComplete;
  expect(element.shadowRoot!.querySelector(".distribution-toggle")).toBeNull();
  element.data = initial; await element.updateComplete;
  expect(element.shadowRoot!.querySelector(".distribution-toggle")?.getAttribute("aria-expanded")).toBe("false");
  expect(sendMessagePromise).not.toHaveBeenCalled();
  expect(profileStyles.cssText).toMatch(/\.base-coverage-legend-item\s*\{[^}]*grid-template-columns:\s*14px minmax\(0, 1fr\) auto/);
  expect(profileStyles.cssText).toMatch(/\.base-coverage-legend-item ha-icon\s*\{[^}]*--mdc-icon-size:\s*14px/);
  element.remove();
});


it.each([
  ["base", ["away"], { "climate.office": null }, true, false, ["Base"]],
  ["exception", [], { "climate.office": "away" }, false, true, ["Exception"]],
  ["both", ["away"], { "climate.office": "away" }, true, true, ["Base", "Exception"]],
  ["inactive", [], {}, false, false, []],
] as const)("shows Profile row selection provenance for %s", async (_name, baseIds, overrides, basePressed, exceptionPressed, status) => {
  const element = new VelairProfilesView();
  element.data = { ...data, profiles: [{ ...data.profiles![0], zones: { "climate.office": { behavior: "normal" }, "climate.bedroom": { behavior: "normal" } } }],
    profile_selection: { base_profile_ids: [...baseIds], base_mode_id: null, zone_profile_overrides: overrides },
    effective_profile_ids: exceptionPressed ? ["away"] : [],
  } as unknown as ScheduleResponse;
  document.body.append(element); await element.updateComplete;
  const row = element.shadowRoot!.querySelector(".profile-list .template-item")!;
  const rail = row.querySelector(".profile-item-actions")!;
  expect(row.children).toHaveLength(2);
  expect([...rail.querySelectorAll("button")].map((button) => button.classList.contains("profile-item-activate") ? "base" : button.classList.contains("profile-item-apply") ? "exception" : "delete"))
    .toEqual(["base", "exception", "delete"]);
  expect(rail.querySelector(".profile-item-activate")?.getAttribute("aria-pressed")).toBe(String(basePressed));
  expect(rail.querySelector(".profile-item-apply")?.getAttribute("aria-pressed")).toBe(String(exceptionPressed));
  expect(row.querySelector(".profile-item-description")?.textContent).toBe("Energy saving");
  expect([...row.querySelectorAll(".profile-item-chip")].map((chip) => chip.textContent)).toEqual(status);
  expect(row.querySelector(".profile-item-chip ha-icon")).toBeNull();
  expect(row.querySelector(".profile-item-usage") !== null).toBe(basePressed || exceptionPressed);
  expect(rail.querySelector(".profile-item-activate")?.classList.contains("active")).toBe(basePressed);
  expect(row.querySelector(".profile-item-main")?.getAttribute("aria-pressed")).toBe("false");
  for (const button of rail.querySelectorAll("button")) expect(button.getAttribute("aria-label")).toContain("Away");
  element.remove();
});

it("selects from row whitespace while preserving independent action buttons", async () => {
  const element = new VelairProfilesView(); element.data = data;
  const internal = element as unknown as {
    _selectProfile(profile: unknown): void;
    _activate(key: string): Promise<void>;
    _changeOverrides(action: unknown): Promise<void>;
    _deleteProfile(profile: unknown): Promise<void>;
  };
  const select = vi.spyOn(internal, "_selectProfile").mockImplementation(() => {});
  const activate = vi.spyOn(internal, "_activate").mockResolvedValue();
  const apply = vi.spyOn(internal, "_changeOverrides").mockResolvedValue();
  const remove = vi.spyOn(internal, "_deleteProfile").mockResolvedValue();
  document.body.append(element); await element.updateComplete;
  const row = element.shadowRoot!.querySelector<HTMLElement>(".profile-list .template-item")!;
  row.click();
  row.querySelector<HTMLElement>(".profile-item-actions")!.click();
  expect(select).toHaveBeenCalledTimes(2);
  row.querySelector<HTMLButtonElement>(".profile-item-main")!.click();
  expect(select).toHaveBeenCalledTimes(3);
  for (const icon of row.querySelectorAll(".profile-item-actions ha-icon")) {
    icon.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
  }
  expect(select).toHaveBeenCalledTimes(3);
  expect(activate).toHaveBeenCalledOnce();
  expect(apply).toHaveBeenCalledOnce();
  expect(remove).toHaveBeenCalledOnce();
  select.mockRestore(); activate.mockRestore(); apply.mockRestore(); remove.mockRestore(); element.remove();
});

it("uses legacy base membership and keeps actions separate from editor selection", async () => {
  const element = new VelairProfilesView(); element.data = data;
  element.hass = { language: "en", states: {}, connection: {} } as never;
  const activate = vi.spyOn(VelairApiClient.prototype, "activateProfile").mockResolvedValue(data);
  const apply = vi.spyOn(VelairApiClient.prototype, "applyProfiles").mockResolvedValue(data);
  document.body.append(element); await element.updateComplete;
  const row = () => element.shadowRoot!.querySelector(".profile-list .template-item")!;
  expect(row().querySelector(".profile-item-activate")?.getAttribute("aria-pressed")).toBe("true");
  row().querySelector<HTMLButtonElement>(".profile-item-apply")!.click();
  await vi.waitFor(() => expect((element as unknown as { _busy?: string })._busy).toBeUndefined()); await element.updateComplete;
  expect(apply).toHaveBeenCalledWith(["away"]);
  expect(row().querySelector(".profile-item-main")?.getAttribute("aria-pressed")).toBe("false");
  row().querySelector<HTMLButtonElement>(".profile-item-activate")!.click();
  await vi.waitFor(() => expect((element as unknown as { _busy?: string })._busy).toBeUndefined()); await element.updateComplete;
  expect(activate).toHaveBeenCalledWith("away");
  expect(row().querySelector(".profile-item-main")?.getAttribute("aria-pressed")).toBe("false");
  element.activeSetupControls = "modes"; await element.updateComplete;
  expect(row().querySelector<HTMLButtonElement>(".profile-item-activate")!.disabled).toBe(true);
  expect(row().querySelector<HTMLButtonElement>(".profile-item-apply")!.disabled).toBe(true);
  activate.mockRestore(); apply.mockRestore(); element.remove();
});
