// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { profileStyles } from "../../src/velair/styles/profile-styles";
import type { ScheduleResponse } from "../../src/velair/types";
import { VelairProfilesView } from "../../src/velair/components/profiles-view-element";

const data = {
  configured_entities: ["climate.office"],
  global: { mode: "running", active_profile_id: "away" },
  profiles: [{ key: "away", name: "Away", color: "#123456", description: "Energy saving", zones: {} }],
  templates: [],
} as unknown as ScheduleResponse;

async function selectFirstProfile(element: VelairProfilesView): Promise<void> {
  (element.shadowRoot?.querySelector(".profile-item-main") as HTMLButtonElement).click();
  await element.updateComplete;
}

describe("profiles view", () => {
  it("shows the active profile selector in compact overview mode", async () => {
    const element = new VelairProfilesView();
    element.compact = true;
    element.data = data;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector(".profile-active")?.textContent).toContain("Away");
    expect(element.shadowRoot?.querySelector(".profile-active-compact")).not.toBeNull();
    expect(element.shadowRoot?.querySelector(".profile-compact-icon ha-icon")?.getAttribute("icon")).toBe("mdi:account-outline");
    expect(element.shadowRoot?.querySelector(".profile-active-compact")?.getAttribute("style")).toContain("--profile-accent: #123456");
    expect((element.shadowRoot?.querySelector(".profile-active select") as HTMLSelectElement).value).toBe("away");
    expect(element.shadowRoot?.querySelector(".profile-editor")).toBeNull();
    element.remove();
  });

  it("resynchronizes the active selector when profile data arrives after rendering", async () => {
    const element = new VelairProfilesView();
    element.compact = true;
    element.data = {
      ...data,
      global: { mode: "running", active_profile_id: null },
    } as unknown as ScheduleResponse;
    document.body.append(element);
    await element.updateComplete;
    expect((element.shadowRoot?.querySelector("select") as HTMLSelectElement).value).toBe("");

    element.data = data;
    await element.updateComplete;
    expect((element.shadowRoot?.querySelector("select") as HTMLSelectElement).value).toBe("away");
    element.remove();
  });

  it("restores the backend selection and shows feedback when compact activation fails", async () => {
    const sendMessagePromise = vi.fn().mockRejectedValue(new Error("Activation rejected"));
    const element = new VelairProfilesView();
    element.compact = true;
    element.hass = { connection: { sendMessagePromise }, states: {} } as never;
    element.data = data;
    document.body.append(element);
    await element.updateComplete;

    const select = element.shadowRoot?.querySelector("select") as HTMLSelectElement;
    select.value = "";
    select.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(element.shadowRoot?.querySelector('[role="alert"]')?.textContent).toContain("Activation rejected"));
    expect(select.value).toBe("away");
    element.remove();
  });

  it("uses the templates list/detail pattern and waits for a profile selection", async () => {
    const element = new VelairProfilesView();
    element.data = data;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector(".template-list-heading")?.textContent).toContain("Profiles (1)");
    expect(element.shadowRoot?.querySelector(".profile-active-compact")).not.toBeNull();
    expect(element.shadowRoot?.querySelector(".profile-intro")?.textContent).toContain("Create alternate climate routines");
    expect(element.shadowRoot?.querySelector(".template-placeholder")?.textContent).toContain("Select a profile");
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
    expect(element.shadowRoot?.querySelector(".profile-zone select")?.textContent).toContain("Normal");
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
      global: { mode: "running", active_profile_id: null },
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
    (element.shadowRoot?.querySelector(".template-list-heading .icon-button.primary") as HTMLButtonElement).click();
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
      global: { mode: "running", active_profile_id: null },
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

  it("activates a saved profile from the list action", async () => {
    const inactive = {
      ...data,
      global: { mode: "running", active_profile_id: null },
    } as unknown as ScheduleResponse;
    const sendMessagePromise = vi.fn().mockResolvedValue(data);
    const element = new VelairProfilesView();
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
    expect(success).toHaveBeenCalledOnce();
    expect((success.mock.calls[0][0] as CustomEvent<string>).detail).toBe("Profile activated");
    expect(element.shadowRoot?.querySelector(".notice.success")).toBeNull();
    element.remove();
  });

  it("reuses editable schedule blocks, advanced options, select wrappers, and icon guidance", async () => {
    const scheduled = {
      ...data,
      global: { mode: "running", active_profile_id: null },
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
    element.hass = {
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
    expect(element.shadowRoot?.querySelector(".profile-week .timeline-block")?.getAttribute("draggable")).toBe("true");
    expect(element.shadowRoot?.querySelector(".day-tabs .day-tab.active")?.textContent).toContain("Sun");
    expect(element.shadowRoot?.querySelector(".day-tabs .day-tab.active strong")?.textContent).toBe("1");
    expect(element.shadowRoot?.querySelector(".advanced-climate-options")).not.toBeNull();
    expect(element.shadowRoot?.querySelectorAll(".select-wrap").length).toBeGreaterThan(2);
    expect(element.shadowRoot?.querySelector(".profile-icon-preview ha-icon")?.getAttribute("icon")).toBe("mdi:briefcase-outline");
    expect(element.shadowRoot?.querySelector(".profile-icon-field .help")?.textContent).toContain("mdi:briefcase-outline");
    expect(element.shadowRoot?.querySelector(".schedule-config-helper")?.textContent).toContain("Choose a template or manually configure the schedule.");
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
    element.shadowRoot?.querySelector(".profile-week .timeline-block")
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
    expect(templateSelect.value).toBe("");
    expect([...element.shadowRoot!.querySelectorAll<HTMLSelectElement>(".advanced-climate-options-fields select")]
      .map((select) => select.value)).toEqual(expect.arrayContaining(["auto", "eco", "on", "middle"]));
    element.remove();
  });

  it("includes tablet and narrow-phone responsive contracts", () => {
    expect(profileStyles.cssText).toContain("@media (max-width: 760px)");
    expect(profileStyles.cssText).toContain("@media (max-width: 480px)");
    expect(profileStyles.cssText).toContain("--profile-draft-color");
    expect(profileStyles.cssText).toContain("background: transparent !important");
    expect(profileStyles.cssText).toContain("min-width: 210px");
    expect(profileStyles.cssText).toContain("min-height: 42px");
    expect(profileStyles.cssText).toMatch(/\.profile-item-copy code\s*\{[^}]*font-size:\s*11px/);
    expect(profileStyles.cssText).toMatch(/\.profile-heading-id\s*\{[^}]*font-size:\s*12px/);
    expect(profileStyles.cssText).toMatch(/@media \(max-width: 600px\)[\s\S]*\.profile-detail-heading\s*\{[^}]*display:\s*grid/);
    expect(profileStyles.cssText).toMatch(/\.profile-detail-heading\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto/);
    expect(profileStyles.cssText).not.toContain(".profile-compact-copy small {\n      display: none");
  });
});
