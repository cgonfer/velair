// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { profileStyles } from "../../src/velair/styles/profile-styles";
import type { ScheduleResponse } from "../../src/velair/types";
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
    expect(setup?.textContent).toContain("Manual");
    expect(setup?.textContent).toContain("Away");
    expect(setup?.querySelector(".active-setup-profile")?.getAttribute("style")).toContain("--profile-accent: #123456");
    expect(setup?.querySelector(".active-setup-profile ha-icon")?.getAttribute("icon")).toBe("mdi:account-outline");
    expect(setup?.querySelector("details")).not.toBeNull();
    expect(setup?.querySelector("summary")?.textContent).toContain("Change");
    expect(setup?.querySelector('[data-mode-selection="manual"]')?.getAttribute("aria-current")).toBe("true");
    expect(setup?.querySelector('[data-profile-id="away"]')?.getAttribute("aria-current")).toBe("true");
    expect(element.shadowRoot?.querySelector(".profile-editor")).toBeNull();
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
    expect(element.shadowRoot?.querySelector(".active-setup-profile-list")?.textContent).toContain("Away");

    element.activeSetupControls = "profiles";
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector("#active-setup-modes-heading")).toBeNull();
    expect(element.shadowRoot?.querySelector("#active-setup-profiles-heading")).not.toBeNull();
    expect(element.shadowRoot?.querySelector('[data-mode-selection="custom:away-mode"]')).toBeNull();
    expect(element.shadowRoot?.querySelector('[data-mode-selection="default"]')).not.toBeNull();
    expect(element.shadowRoot?.querySelector('[data-profile-id="away"]')).not.toBeNull();
    expect(element.shadowRoot?.querySelector(".active-setup-profile-list")?.textContent).toContain("Away");
    expect(element.shadowRoot?.querySelector("#active-setup-profiles-heading")?.parentElement?.textContent)
      .toContain("To activate additional Profiles together, use a Mode.");

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
    expect(setup?.querySelectorAll(".active-setup-profile")).toHaveLength(2);
    expect(setup?.querySelector(".active-setup-profile-list")?.textContent).toContain("Away");
    expect(setup?.querySelector(".active-setup-profile-list")?.textContent).toContain("Sleep");
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
    expect(setup?.querySelector(".active-setup-mode")?.textContent).toContain("Manual");
    expect(setup?.querySelectorAll(".active-setup-profile")).toHaveLength(2);
    expect(setup?.querySelector('[data-mode-selection="manual"]')?.getAttribute("aria-current")).toBe("true");
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
    expect(element.shadowRoot?.querySelector(".active-setup-no-profiles")?.textContent).toContain("No Profiles applied");
    const manual = element.shadowRoot?.querySelector('[data-mode-selection="manual"]') as HTMLButtonElement;
    expect(manual.disabled).toBe(true);
    expect(manual.textContent).toContain("Manual keeps the current Profiles, but none are active.");

    element.data = data;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".active-setup-profile")?.textContent).toContain("Away");
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
    expect(element.shadowRoot?.querySelector(".active-setup-profile-list")?.textContent).toContain("Away");
    expect(element.shadowRoot?.querySelector(".mode-library")).toBeNull();

    element.data = {
      ...element.data,
      active_mode_id: null,
    } as ScheduleResponse;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".active-setup-mode")?.textContent).toContain("Manual");

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

    expect(element.shadowRoot?.querySelector(".mode-entity-note")?.textContent).toContain("native Home Assistant select entity");
    expect(element.shadowRoot?.querySelector(".mode-entity-note code")).toBeNull();
    expect([...element.shadowRoot!.querySelectorAll(".mode-item.built-in")].map((item) => item.textContent))
      .toEqual(expect.arrayContaining([expect.stringContaining("Default"), expect.stringContaining("Manual")]));
    expect(element.shadowRoot?.querySelectorAll(".mode-item.built-in .mode-delete")).toHaveLength(0);
    const helpButtons = element.shadowRoot?.querySelectorAll<HTMLButtonElement>(".mode-item.built-in .mode-help");
    expect(helpButtons).toHaveLength(2);
    expect(helpButtons?.[0]?.querySelector('[role="tooltip"]')?.textContent).toContain("Deactivates profiles");
    expect(helpButtons?.[1]?.querySelector('[role="tooltip"]')?.textContent).toContain("chosen directly");
    expect(helpButtons?.[0]?.getAttribute("aria-label")).toBe("About Default");
    expect(helpButtons?.[0]?.getAttribute("aria-label")).not.toBe(
      helpButtons?.[0]?.querySelector('[role="tooltip"]')?.textContent,
    );
    expect(helpButtons?.[0]?.getAttribute("aria-describedby")).toBe("mode-default-help");
    const modeCreate = element.shadowRoot?.querySelector(".mode-create");
    expect(modeCreate?.closest(".template-list-heading")?.textContent).toContain("Modes (2)");
    element.remove();
  });

  it("changes built-in and custom Modes through the grouped selector and closes after each selection", async () => {
    const custom = {
      ...data,
      modes: [{ key: "vacation-key", name: "Vacation", profile_ids: ["away"] }],
      active_mode_id: null,
    } as ScheduleResponse;
    const sendMessagePromise = vi.fn()
      .mockResolvedValueOnce({ ...custom, active_mode_id: "vacation-key" })
      .mockResolvedValueOnce(custom)
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
    menu.open = true;
    (menu.querySelector('[data-mode-selection="manual"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "velair/select_mode",
      selection: { kind: "manual" },
    }));
    await vi.waitFor(() => expect((element.shadowRoot?.querySelector(".active-setup-menu") as HTMLDetailsElement).open).toBe(false));
    expect(element.shadowRoot?.querySelector(".active-setup-mode")?.textContent).toContain("Manual");

    menu = element.shadowRoot?.querySelector(".active-setup-menu") as HTMLDetailsElement;
    menu.open = true;
    (menu.querySelector('[data-mode-selection="default"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "velair/select_mode",
      selection: { kind: "default" },
    }));
    await vi.waitFor(() => expect((element.shadowRoot?.querySelector(".active-setup-menu") as HTMLDetailsElement).open).toBe(false));
    element.remove();
  });

  it("closes the active setup chooser with Escape or when focus leaves it", async () => {
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
    summary.dispatchEvent(new FocusEvent("focusout", {
      bubbles: true,
      relatedTarget: document.body,
    }));
    expect(menu.open).toBe(false);
    element.remove();
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
    expect(menu.querySelector("#active-setup-profiles-heading")?.textContent).toBe("Activate a Profile manually");
    expect(menu.textContent).toContain("replaces all active Profiles and changes the Mode to Manual");
    expect(menu.querySelector('[data-profile-id="home"]')?.getAttribute("style")).toContain("#abcdef");

    menu.open = true;
    (menu.querySelector('[data-profile-id="home"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "velair/activate_profile",
      profile_id: "home",
    }));
    await vi.waitFor(() => expect((element.shadowRoot?.querySelector(".active-setup-menu") as HTMLDetailsElement).open).toBe(false));
    expect(element.shadowRoot?.querySelector(".active-setup-mode")?.textContent).toContain("Manual");
    expect(element.shadowRoot?.querySelector(".active-setup-profile-list")?.textContent).toContain("Home");
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
    document.body.append(element);
    await element.updateComplete;

    const menu = element.shadowRoot?.querySelector(".active-setup-menu") as HTMLDetailsElement;
    menu.open = true;
    (menu.querySelector('[data-profile-id="away"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(element.shadowRoot?.querySelector('[role="alert"]')?.textContent).toContain("Activation rejected"));
    expect(element.shadowRoot?.querySelector(".active-setup-profile-list")?.textContent).toContain("Away");
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

  it("activates a saved profile from the list action", async () => {
    const inactive = {
      ...data,
      global: { mode: "running", active_profile_ids: [] },
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
    expect(profileStyles.cssText).toMatch(/\.profile-item-activate\.active\s*\{[^}]*background:\s*#2e7d32 !important[^}]*color:\s*#ffffff/);
    expect(success).toHaveBeenCalledOnce();
    expect((success.mock.calls[0][0] as CustomEvent<string>).detail).toBe("Profile activated");
    expect(element.shadowRoot?.querySelector(".notice.success")).toBeNull();
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
    expect(element.shadowRoot?.querySelector(".active-setup-mode")?.textContent).toContain("Manual");
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
    expect(error?.textContent).toContain("Office does not support Cool at 08:00");

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
    expect(profileStyles.cssText).toMatch(/\.mode-help-tooltip\s*\{[^}]*max-width:\s*min\(240px, calc\(100vw - 40px\)\)/);
    expect(profileStyles.cssText).toMatch(/\.mode-help:hover \.mode-help-tooltip,[\s\S]*\.mode-help:focus-visible \.mode-help-tooltip\s*\{[^}]*visibility:\s*visible/);
    expect(profileStyles.cssText).not.toMatch(/\.mode-item\.built-in\s*\{[^}]*opacity/);
    expect(profileStyles.cssText).toMatch(/\.profile-item-copy code\s*\{[^}]*font-size:\s*11px/);
    expect(profileStyles.cssText).toMatch(/\.profile-heading-id\s*\{[^}]*font-size:\s*12px/);
    expect(profileStyles.cssText).toMatch(/@media \(max-width: 600px\)[\s\S]*\.profile-detail-heading\s*\{[^}]*display:\s*grid/);
    expect(profileStyles.cssText).toMatch(/\.profile-detail-heading\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto/);
    expect(profileStyles.cssText).toMatch(/\.active-setup-popover\s*\{[^}]*position:\s*absolute/);
    expect(profileStyles.cssText).toMatch(/\.active-setup-popover\s*\{[^}]*right:\s*0/);
    expect(profileStyles.cssText).toMatch(/@media \(max-width: 600px\)[\s\S]*\.active-setup-popover\s*\{[^}]*position:\s*static/);
    expect(profileStyles.cssText).toMatch(/@media \(max-width: 600px\)[\s\S]*\.active-setup-change\s*\{[^}]*width:\s*100%/);
    expect(profileStyles.cssText).toMatch(/@container \(max-width: 600px\)[\s\S]*\.active-setup-popover\s*\{[^}]*position:\s*static/);
    expect(profileStyles.cssText).toMatch(/@container \(max-width: 760px\)[\s\S]*\.active-setup-summary\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
    expect(profileStyles.cssText).toMatch(/\.active-setup-summary-copy > span\s*\{[^}]*overflow-wrap:\s*break-word[^}]*white-space:\s*normal/);
    expect(profileStyles.cssText).toMatch(/\.active-setup-option-copy small\s*\{[^}]*overflow-wrap:\s*break-word[^}]*white-space:\s*normal/);
    expect(profileStyles.cssText).toMatch(/\.active-setup-profile-list\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(profileStyles.cssText).not.toContain(".profile-context-picker");
    expect(profileStyles.cssText).not.toContain("mode-origin");
  });
});
