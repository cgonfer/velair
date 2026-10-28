// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../src/velair/components/room-groups-settings-element";
import { VelairRoomGroupsSettings } from "../../src/velair/components/room-groups-settings-element";
import type { VelairViewHost } from "../../src/velair/host-types";
import type { HomeAssistant, RoomGroup, ScheduleResponse } from "../../src/velair/types";
import { en } from "../../src/velair/translations/en";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { if (!this.open) return; this.open = false; this.dispatchEvent(new Event("close")); };
});
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });
const group: RoomGroup = { id: "group.room", name: "Room", members: ["climate.a", "climate.b"], temperature_entity_id: "climate.a", delivery_mode: "all" };
async function setup(existing = false) {
  const data = { configured_entities: ["climate.a", "climate.b", "climate.other"], configuration_revision: 7,
    room_groups: existing ? { "group.room": group } : {}, member_to_unit: existing ? { "climate.a": "group.room", "climate.b": "group.room" } : {},
    settings: { zone_order: [] }, zones: existing ? { "group.room": { schedule: {} } } : {},
    control_unit_states: { "group.room": { state: "heat", attributes: { current_temperature: 20 } } },
    group_delivery_status: { "group.room": { "climate.a": { status: "success" }, "climate.b": { status: "failed", message: "Timed out" } } },
  } as unknown as ScheduleResponse;
  const send = vi.fn(async (request: Record<string, unknown>) => request.type === "velair/preview_room_group" ? { group: request.group, source_entity_id: request.source_entity_id, conflicts: [{ entity_id: "climate.b", fields: ["schedule"] }], removed_members: [], learning_reset: true, configuration_revision: 7 } : data);
  const hass = { connection: { sendMessagePromise: send }, states: {
    "climate.a": { state: "heat", attributes: { friendly_name: "Valve A", current_temperature: 19 } },
    "climate.b": { state: "unavailable", attributes: { friendly_name: "Valve B" } },
    "sensor.room": { state: "20", attributes: { device_class: "temperature", friendly_name: "Room sensor" } },
  } } as unknown as HomeAssistant;
  const apply = vi.fn();
  const host = { hass, _data: data, _applyScheduleData: apply,
    _friendlyEntityName: (id: string) => id === "group.room" ? "Room" : hass.states?.[id]?.attributes?.friendly_name ?? id,
    _formatTemperature: (n: number) => `${n} °C`, _modeLabel: (s: string) => s,
    _t: (key: keyof typeof en, values?: Record<string, string | number>) => Object.entries(values ?? {}).reduce((s, [key, value]) => s.replace(`{${key}}`, String(value)), en[key]),
  } as unknown as VelairViewHost;
  const element = document.createElement("velair-room-groups-settings") as VelairRoomGroupsSettings;
  element.host = host; element.data = data; document.body.append(element); await element.updateComplete;
  const click = async (text: string) => { const button = [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent?.trim() === text || b.getAttribute("aria-label") === text || b.title === text)!; button.click(); await element.updateComplete; await element.updateComplete; };
  return { element, data, send, apply, click };
}

describe("room group settings", () => {
  it("previews explicit source adoption before saving one backend-owned group with revision", async () => {
    const { element, send, apply, click } = await setup();
    const dirty = vi.fn(); element.addEventListener("room-groups-state-changed", dirty);
    await click("Create group");
    const root = element.shadowRoot!;
    const input = root.querySelector<HTMLInputElement>('input:not([type="checkbox"])')!;
    input.value = "Living room"; input.dispatchEvent(new Event("input")); await element.updateComplete;
    await click("Add climates");
    for (const id of ["climate.a", "climate.b"]) {
      const checkbox = root.querySelector<HTMLInputElement>(`[data-candidate="${id}"] input`)!;
      checkbox.checked = true; checkbox.dispatchEvent(new Event("change")); await element.updateComplete;
    }
    root.querySelector<HTMLButtonElement>('[data-action="confirm-members"]')!.click(); await element.updateComplete;
    const reference = root.querySelector<HTMLSelectElement>("select")!; reference.value = "climate.a"; reference.dispatchEvent(new Event("change")); await element.updateComplete;
    await act(element, '[data-action="review"]');
    expect(apply).not.toHaveBeenCalled();
    expect(root.textContent).toContain("Valve B: Schedules");
    expect(root.textContent).toContain("Learning will restart");
    expect(send.mock.calls[0][0]).toMatchObject({ type: "velair/preview_room_group", expected_revision: 7, source_entity_id: "climate.a", group: { name: "Living room", members: ["climate.a", "climate.b"], temperature_entity_id: "climate.a" } });
    expect(String((send.mock.calls[0][0].group as RoomGroup).id)).toMatch(/^group\.[a-z0-9_]+$/);
    await click("Confirm and save");
    expect(send.mock.calls[1][0]).toMatchObject({ type: "velair/set_room_group", expected_revision: 7 });
    expect(apply).toHaveBeenCalledTimes(1);
    expect(dirty).toHaveBeenCalled();
  });
  it("shows individual availability and failed command evidence and explains dissolution before removal", async () => {
    const { element, send, click } = await setup(true);
    expect(element.shadowRoot!.textContent).toContain("Valve A");
    expect(element.shadowRoot!.textContent).toContain("Unavailable");
    expect(element.shadowRoot!.textContent).toContain("Command failed");
    await click("Dissolve group");
    expect(send).not.toHaveBeenCalled();
    expect(element.shadowRoot!.textContent).toContain("copy of the shared configuration");
    const buttons = [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>("button")].filter(b => b.textContent?.trim() === "Dissolve group");
    buttons.at(-1)!.click(); await element.updateComplete;
    expect(send).toHaveBeenCalledWith({ type: "velair/remove_room_group", group_id: "group.room", expected_revision: 7 });
  });
});

describe("room group library workspace", () => {
  it("matches the Templates compact empty state before creation and after draft removal", async () => {
    const { element, click } = await setup();
    const root = element.shadowRoot!;
    expect(root.querySelector(".template-placeholder.compact")?.textContent).toContain("No room groups configured.");
    expect(root.querySelector(".profile-intro small")?.textContent).toBe(en.roomGroupsDescription);
    expect(root.querySelector(".template-placeholder")?.textContent).not.toContain(en.roomGroupsDescription);
    expect(root.querySelector(".template-library-layout")).toBeNull();
    expect(root.querySelector(".template-list-wrap")).toBeNull();
    expect(root.querySelector(".template-detail")).toBeNull();
    expect(root.querySelector(".template-library > .template-placeholder.compact > .icon-button.primary[data-action='add']")).not.toBeNull();
    await click("Create group");
    expect(root.querySelector(".template-placeholder")).toBeNull();
    expect(root.querySelector(".template-detail")).not.toBeNull();
    expect(root.querySelector(".template-list-wrap .section-label")?.textContent).toContain("Room groups (1)");
    await click("Dissolve group");
    expect(root.querySelector(".template-library-layout")).toBeNull();
    expect(root.querySelector(".template-library > .template-placeholder.compact")).not.toBeNull();
    expect(root.activeElement).toBe(root.querySelector('[data-action="add"]'));
  });
  it("uses one selected detail, shared library actions and a single compact membership/order list", async () => {
    const { element } = await setup(true);
    const root = element.shadowRoot!;
    expect(root.querySelectorAll(".template-library-layout")).toHaveLength(1);
    expect(root.querySelectorAll(".template-detail")).toHaveLength(1);
    expect(root.querySelector('[data-action="add"]')?.classList.contains("icon-button")).toBe(true);
    expect(root.querySelector('[data-action="review"]')?.classList.contains("primary")).toBe(true);
    expect(root.querySelectorAll('.room-group-editor input[type="checkbox"]')).toHaveLength(0);
    expect(root.querySelectorAll(".room-group-editor [data-member]")).toHaveLength(2);
    expect(root.querySelectorAll('[data-member="climate.a"]')).toHaveLength(1);
    expect(root.querySelector('[data-member="climate.a"] [data-remove-member]')).not.toBeNull();
    expect(element.hasUnsavedChanges).toBe(false);
  });
  it("focuses the required name and uses the list removal action without a discard button", async () => {
    const { element, click } = await setup();
    await click("Create group");
    expect(element.shadowRoot!.activeElement).toBe(element.shadowRoot!.querySelector('[data-field="name"]'));
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!.required).toBe(true);
    const addMembers = element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="add-members"]')!;
    expect(addMembers.matches(".icon-button.success.draft-add-button")).toBe(true);
    expect(addMembers.parentElement).toBe(element.shadowRoot!.querySelector(".room-group-member-options > .draft-add-row:last-child"));
    expect(element.shadowRoot!.querySelector('[data-action="discard"]')).toBeNull();
    await click("Dissolve group");
    expect(element.shadowRoot!.activeElement).toBe(element.shadowRoot!.querySelector('[data-action="add"]'));
  });
  it.each(["", "   "])("rejects an empty or whitespace-only name locally and restores the normal save flow", async (value) => {
    const { element, send, click } = await setup(true);
    const root = element.shadowRoot!;
    const name = root.querySelector<HTMLInputElement>('[data-field="name"]')!;
    name.value = value; name.dispatchEvent(new Event("input")); await element.updateComplete;
    await act(element, '[data-action="review"]');
    expect(send).not.toHaveBeenCalled();
    expect(root.activeElement).toBe(name);
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(root.getElementById(name.getAttribute("aria-describedby")!)?.textContent).toBe("Enter a group name.");
    expect(root.querySelector('[data-action="discard"]')).toBeNull();
    name.value = "Updated room"; name.dispatchEvent(new Event("input")); await element.updateComplete;
    expect(name.getAttribute("aria-invalid")).toBe("false");
    expect(root.querySelector("#room-group-name-error")).toBeNull();
    await act(element, '[data-action="review"]');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({ group: { name: "Updated room" } });
  });
  it("clears dirty state when an existing configuration is restored", async () => {
    const { element } = await setup(true);
    const name = element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!;
    name.value = "Changed"; name.dispatchEvent(new Event("input")); await element.updateComplete;
    expect(element.hasUnsavedChanges).toBe(true);
    name.value = "Room"; name.dispatchEvent(new Event("input")); await element.updateComplete;
    expect(element.hasUnsavedChanges).toBe(false);
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="review"]')!.disabled).toBe(true);
  });
  it("restores unsaved drafts across remounts but reads clean selections from current backend data", async () => {
    const { element, data } = await setup(true);
    let retained: import("../../src/velair/components/room-groups-settings-element").RoomGroupsDraft | undefined;
    element.addEventListener("room-groups-state-changed", (event) => { retained = (event as CustomEvent).detail.draft; });
    const name = element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!;
    name.value = "Unsaved room"; name.dispatchEvent(new Event("input")); await element.updateComplete;
    const replacement = document.createElement("velair-room-groups-settings") as VelairRoomGroupsSettings;
    replacement.host = element.host; replacement.data = data; replacement.draft = retained;
    document.body.replaceChildren(replacement); await replacement.updateComplete;
    expect(replacement.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe("Unsaved room");
    expect(replacement.hasUnsavedChanges).toBe(true);
    replacement.draft = { ...retained!, dirty: false };
    replacement.data = { ...data, room_groups: { "group.room": { ...group, name: "Backend room" } } };
    await replacement.updateComplete;
    expect(replacement.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe("Backend room");
    expect(replacement.hasUnsavedChanges).toBe(false);
  });
  it("keeps dissolution confirmation open across runtime-only data updates", async () => {
    const { element, data, click } = await setup(true);
    await click("Dissolve group");
    element.data = { ...data, zone_runtime: { "group.room": { state: "scheduled" } } };
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector('[data-action="confirm-remove"]')).not.toBeNull();
    expect(element.shadowRoot!.textContent).toContain("copy of the shared configuration");
  });
});

async function act(element: VelairRoomGroupsSettings, selector: string) {
  element.shadowRoot!.querySelector<HTMLButtonElement>(selector)!.click();
  await element.updateComplete; await element.updateComplete;
}
async function stage(element: VelairRoomGroupsSettings, id: string) {
  const checkbox = element.shadowRoot!.querySelector<HTMLInputElement>(`[data-candidate="${id}"] input`)!;
  checkbox.checked = true; checkbox.dispatchEvent(new Event("change")); await element.updateComplete;
}
function selectedMembers(element: VelairRoomGroupsSettings) {
  return [...element.shadowRoot!.querySelectorAll<HTMLElement>(".room-group-editor [data-member]")].map(row => row.dataset.member);
}

describe("searchable room group membership", () => {
  it("searches friendly names and entity IDs and appends staged additions without changing existing order", async () => {
    const { element, click } = await setup(true);
    await click("Add climates");
    const root = element.shadowRoot!;
    const search = root.querySelector<HTMLInputElement>('[data-field="member-search"]')!;
    search.value = "OTHER"; search.dispatchEvent(new Event("input")); await element.updateComplete;
    expect(root.querySelector('[data-candidate="climate.other"]')).not.toBeNull();
    await stage(element, "climate.other");
    expect(selectedMembers(element)).toEqual(["climate.a", "climate.b"]);
    await act(element, '[data-action="confirm-members"]');
    expect(selectedMembers(element)).toEqual(["climate.a", "climate.b", "climate.other"]);
    expect(root.querySelector<HTMLDialogElement>("dialog")!.open).toBe(false);
    expect(root.activeElement).toBe(root.querySelector('[data-action="add-members"]'));
    await act(element, '[data-remove-member="climate.a"]');
    await click("Add climates");
    search.value = "VALVE A"; search.dispatchEvent(new Event("input")); await element.updateComplete;
    expect(root.querySelector('[data-candidate="climate.a"]')).not.toBeNull();
    expect(root.querySelector('[data-candidate="climate.other"]')).toBeNull();
  });
  it.each(["close", "escape", "backdrop"])("%s abandons staged choices and preserves a clean group", async (action) => {
    const { element, click } = await setup(true);
    await click("Add climates"); await stage(element, "climate.other");
    const dialog = element.shadowRoot!.querySelector<HTMLDialogElement>(".room-group-member-dialog")!;
    expect(dialog.querySelector('[data-action="cancel-members"]')).toBeNull();
    expect(dialog.querySelector('[data-action="confirm-members"]')?.classList.contains("compact")).toBe(true);
    if (action === "close") await act(element, ".room-group-member-dialog .documentation-close");
    else if (action === "backdrop") {
      vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 100, 400, 400));
      dialog.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 110, clientY: 110 }));
      expect(dialog.open).toBe(true);
      dialog.querySelector("h2")!.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 50, clientY: 50 }));
      expect(dialog.open).toBe(true);
      dialog.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 50, clientY: 50 }));
      await element.updateComplete;
    } else { dialog.dispatchEvent(new Event("cancel", { cancelable: true })); await element.updateComplete; }
    expect(selectedMembers(element)).toEqual(["climate.a", "climate.b"]);
    expect(element.hasUnsavedChanges).toBe(false);
    expect(element.shadowRoot!.querySelector<HTMLDialogElement>("dialog")!.open).toBe(false);
    await click("Add climates");
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('[data-candidate="climate.other"] input')!.checked).toBe(false);
  });
  it("aligns the picker to the panel and stops tracking when closed or disconnected", async () => {
    const { element, click } = await setup(true);
    const bounds = vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(200, 0, 800, 800));
    const dialog = element.shadowRoot!.querySelector<HTMLDialogElement>(".room-group-member-dialog")!;
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 400, 500));
    await click("Add climates");
    expect(dialog.style.getPropertyValue("--member-dialog-center")).toBe("600px");
    bounds.mockReturnValue(new DOMRect(100, 0, 800, 800));
    window.dispatchEvent(new Event("resize"));
    expect(dialog.style.getPropertyValue("--member-dialog-center")).toBe("500px");
    dialog.close(); await element.updateComplete;
    bounds.mockReturnValue(new DOMRect(0, 0, 800, 800));
    window.dispatchEvent(new Event("resize"));
    expect(dialog.style.getPropertyValue("--member-dialog-center")).toBe("500px");
    await click("Add climates");
    expect(dialog.style.getPropertyValue("--member-dialog-center")).toBe("400px");
    element.remove();
    bounds.mockReturnValue(new DOMRect(100, 0, 800, 800));
    window.dispatchEvent(new Event("resize"));
    expect(dialog.style.getPropertyValue("--member-dialog-center")).toBe("400px");
  });
  it("shows climates assigned elsewhere disabled and revalidates ownership before confirming additions", async () => {
    const { element, data, click } = await setup(true);
    await click("Add climates"); await stage(element, "climate.other");
    element.data = { ...data, room_groups: { ...data.room_groups, "group.locked": { ...group, id: "group.locked", name: "Upstairs", members: ["climate.other"] } }, member_to_unit: { ...data.member_to_unit, "climate.other": "group.locked" } };
    await element.updateComplete;
    const row = element.shadowRoot!.querySelector('[data-candidate="climate.other"]')!;
    expect(row.querySelector<HTMLInputElement>("input")!.disabled).toBe(true);
    expect(row.textContent).toContain("Already in Upstairs");
    await act(element, '[data-action="confirm-members"]');
    expect(selectedMembers(element)).toEqual(["climate.a", "climate.b"]);
    expect(element.shadowRoot!.textContent).toContain("Climate membership changed");
    expect(element.hasUnsavedChanges).toBe(false);
  });
  it("bounds selected rows to four and expands before moving a member across the hidden boundary", async () => {
    const { element, data } = await setup(true);
    const members = ["climate.a", "climate.b", "climate.c", "climate.d", "climate.e", "climate.f"];
    element.data = { ...data, configured_entities: members, room_groups: { "group.room": { ...group, members } }, member_to_unit: Object.fromEntries(members.map(id => [id, "group.room"])) };
    await element.updateComplete;
    expect(selectedMembers(element)).toEqual(members.slice(0, 4));
    await act(element, '[data-member="climate.d"] button[title="Move down"]');
    expect(selectedMembers(element)).toEqual(["climate.a", "climate.b", "climate.c", "climate.e", "climate.d", "climate.f"]);
    await act(element, '[data-action="toggle-members"]');
    expect(selectedMembers(element)).toHaveLength(4);
    await act(element, '[data-action="toggle-members"]');
    expect(selectedMembers(element)).toHaveLength(6);
  });
  it("clears removed climate references and destinations, chooses a remaining adoption source, and retains keyboard focus", async () => {
    const { element, click } = await setup();
    await click("Create group"); await click("Add climates");
    await stage(element, "climate.a"); await stage(element, "climate.b");
    await act(element, '[data-action="confirm-members"]');
    const root = element.shadowRoot!;
    const ref = root.querySelector<HTMLSelectElement>('[data-field="reference"]')!;
    ref.value = "climate.a"; ref.dispatchEvent(new Event("change"));
    const delivery = root.querySelector<HTMLSelectElement>('[data-field="delivery"]')!;
    delivery.value = "selected"; delivery.dispatchEvent(new Event("change")); await element.updateComplete;
    const destination = root.querySelector<HTMLSelectElement>("#room-group-destination")!;
    destination.value = "climate.a"; destination.dispatchEvent(new Event("change")); await element.updateComplete;
    await act(element, '[data-remove-member="climate.a"]');
    expect(root.querySelector<HTMLSelectElement>('[data-field="reference"]')!.value).toBe("");
    expect(root.querySelector<HTMLSelectElement>("#room-group-destination")!.value).toBe("");
    expect((element as unknown as { _source: string })._source).toBe("climate.b");
    expect(root.querySelector<HTMLSelectElement>("#room-group-source")!.value).toBe("climate.b");
    expect(root.activeElement).toBe(root.querySelector('[data-remove-member="climate.b"]'));
    await act(element, '[data-remove-member="climate.b"]');
    expect(root.activeElement).toBe(root.querySelector('[data-action="add-members"]'));
  });
});

describe("room group consistency and local feedback", () => {
  it("matches shared dirty headers, save icons, name error styling and resource disclosures", async () => {
    const { element } = await setup(true);
    const root = element.shadowRoot!;
    const name = root.querySelector<HTMLInputElement>('[data-field="name"]')!;
    name.value = ""; name.dispatchEvent(new Event("input")); name.dispatchEvent(new Event("blur")); await element.updateComplete;
    expect(root.querySelector(".template-name-field > .pill.warning")?.textContent).toContain(en.unsaved);
    expect(root.querySelector(".room-group-summary-badges > .pill.warning")).toBeNull();
    expect(name.classList.contains("invalid")).toBe(true);
    expect(root.querySelector('[data-action="review"] ha-icon')?.getAttribute("icon")).toBe("mdi:content-save");
    const control = root.querySelector<HTMLDetailsElement>('.room-group-status > details[data-section="control"]')!;
    expect(control.matches(".external-controller-conditions.settings-disclosure")).toBe(true);
    expect(control.open).toBe(false);
    expect(control.querySelector("summary .external-controller-expand-icon")).not.toBeNull();
    expect(control.querySelector(".external-controller-conditions-body .room-group-copy")).not.toBeNull();
    expect(root.querySelector(".room-group-status .room-group-copy")?.textContent).toContain("This status reflects the saved group");
  });
  it.each([
    [{ code: "invalid_format", message: "The room changed.", details: { usages: [{ source: "default", entity_id: "climate.a", weekday: "monday" }] } }, "The room changed.\ndefault · climate.a · monday"],
    [{ code: "unknown_error" }, `${en.roomGroupActionFailed} (unknown_error)`],
    [{ code: "unknown_error", message: "Unknown error" }, `${en.roomGroupActionFailed} (unknown_error)`],
    [{ code: "unknown_error", message: "  " }, `${en.roomGroupActionFailed} (unknown_error)`],
    [{ code: "room_group_preview_failed", message: "Could not preview the room group. Reason: Cannot modify ReadOnlyDict." }, "Could not preview the room group. Reason: Cannot modify ReadOnlyDict."],
  ])("shows readable Home Assistant errors with a canonical fallback", async (error, expected) => {
    const { element, send } = await setup(true);
    send.mockRejectedValueOnce(error);
    const name = element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!;
    name.value = "Updated room"; name.dispatchEvent(new Event("input")); await element.updateComplete;
    await act(element, '[data-action="review"]');
    expect(element.shadowRoot!.querySelector(".room-group-error")?.textContent).toBe(expected);
    expect(element.shadowRoot!.textContent).not.toContain("[object Object]");
  });
  it("humanizes every backend conflict field and falls back to Settings for unknown fields", async () => {
    const { element, send } = await setup(true);
    const fields = ["enabled", "schedule", "template_links", "day_layout_key", "preconditioning", "comfort", "external_change_policy", "execution", "target_range_modes", "target_range_reference", "target_temp_step_override", "override", "pauses", "profiles", "zone_profile_overrides", "unknown_backend_field"];
    send.mockResolvedValueOnce({ group, conflicts: [{ entity_id: "climate.a", fields }], removed_members: [], learning_reset: false, configuration_revision: 7 } as never);
    const name = element.shadowRoot!.querySelector<HTMLInputElement>('[data-field="name"]')!;
    name.value = "Updated room"; name.dispatchEvent(new Event("input")); await element.updateComplete;
    await act(element, '[data-action="review"]');
    const text = element.shadowRoot!.querySelector(".room-group-review li")!.textContent!;
    expect(text).toContain("Modes with two setpoints");
    expect(text).toContain("Day layout"); expect(text).toContain("External adjustments"); expect(text).toContain("Temperature step");
    expect(text).toContain("Reference setpoint"); expect(text).toContain("Settings");
    for (const field of fields.filter(field => field.includes("_"))) expect(text).not.toContain(field);
  });
  it("reveals incomplete member and reference fields locally before calling the backend", async () => {
    const { element, send, click } = await setup();
    await click("Create group");
    const root = element.shadowRoot!;
    const name = root.querySelector<HTMLInputElement>('[data-field="name"]')!;
    name.value = "Room"; name.dispatchEvent(new Event("input")); await element.updateComplete;
    const membersDisclosure = root.querySelector<HTMLDetailsElement>(".room-group-fields details")!;
    membersDisclosure.open = false;
    await act(element, '[data-action="review"]');
    expect(membersDisclosure.open).toBe(true);
    expect(send).not.toHaveBeenCalled();
    expect(root.activeElement).toBe(root.querySelector('[data-action="add-members"]'));
    expect(root.querySelector("#room-group-members-error")?.textContent).toBe("Add at least two climates.");
    expect(root.querySelector("#room-group-reference")?.getAttribute("aria-invalid")).toBe("true");
    await click("Add climates"); await stage(element, "climate.a"); await stage(element, "climate.b"); await act(element, '[data-action="confirm-members"]');
    await act(element, '[data-action="review"]');
    expect(root.activeElement).toBe(root.querySelector("#room-group-reference"));
    expect(root.querySelector("#room-group-members-error")).toBeNull();
  });
  it("disables shared editing controls while a request is pending", async () => {
    const { element, send } = await setup(true);
    let resolve!: (value: unknown) => void;
    send.mockImplementationOnce(() => new Promise(done => { resolve = done; }) as never);
    const root = element.shadowRoot!;
    const name = root.querySelector<HTMLInputElement>('[data-field="name"]')!;
    name.value = "Updated"; name.dispatchEvent(new Event("input")); await element.updateComplete;
    await act(element, '[data-action="review"]');
    expect(name.disabled).toBe(true);
    expect(root.querySelector<HTMLSelectElement>("#room-group-reference")!.disabled).toBe(true);
    expect(root.querySelector<HTMLButtonElement>('[data-action="add-members"]')!.disabled).toBe(true);
    expect(root.querySelector('[data-action="review"] ha-icon')?.getAttribute("icon")).toBe("mdi:loading");
    resolve({ group, conflicts: [], removed_members: [], learning_reset: false, configuration_revision: 7 });
    await element.updateComplete; await element.updateComplete;
    expect(root.querySelector<HTMLInputElement>('[data-field="name"]')!.disabled).toBe(false);
  });
  it("clears irrelevant selected destinations on All and explains dissolve effects with focus return", async () => {
    const { element, click } = await setup(true);
    const root = element.shadowRoot!;
    const delivery = root.querySelector<HTMLSelectElement>('[data-field="delivery"]')!;
    delivery.value = "selected"; delivery.dispatchEvent(new Event("change")); await element.updateComplete;
    const destination = root.querySelector<HTMLSelectElement>("#room-group-destination")!;
    destination.value = "climate.a"; destination.dispatchEvent(new Event("change")); await element.updateComplete;
    expect(destination.textContent).toContain("Valve A (climate.a)");
    delivery.value = "all"; delivery.dispatchEvent(new Event("change")); await element.updateComplete;
    expect(element.hasUnsavedChanges).toBe(false);
    await click("Dissolve group");
    expect(root.querySelector(".room-group-review")?.textContent).toContain("Existing boosts, pauses and manual sessions will end");
    await click("Cancel");
    expect(root.activeElement).toBe(root.querySelector('[data-remove-group="group.room"]'));
  });
});

describe("room group inline help lifecycle", () => {
  it("dismisses active help and global listeners when its component disconnects", async () => {
    const { element } = await setup(true);
    const root = element.shadowRoot!;
    const trigger = root.querySelector<HTMLButtonElement>("#room-group-reference-help-trigger")!;
    const tooltip = root.querySelector<HTMLElement>("#room-group-reference-help")!;
    const remove = vi.spyOn(document, "removeEventListener");
    trigger.click();
    expect(tooltip.classList.contains("visible")).toBe(true);
    element.remove();
    expect(tooltip.classList.contains("visible")).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(remove).toHaveBeenCalledWith("pointerdown", expect.any(Function), true);
  });
  it("dismisses help when its unsaved group is removed", async () => {
    const { element, click } = await setup();
    await click("Create group");
    const root = element.shadowRoot!;
    const trigger = root.querySelector<HTMLButtonElement>("#room-group-reference-help-trigger")!;
    const tooltip = root.querySelector<HTMLElement>("#room-group-reference-help")!;
    trigger.click();
    expect(tooltip.classList.contains("visible")).toBe(true);
    await click("Dissolve group");
    expect(trigger.isConnected).toBe(false);
    expect(tooltip.classList.contains("visible")).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("group native temperature reference and visible delivery configuration", () => {
  it("offers only selected climates including unavailable or missing-state members", async () => {
    const { element, data } = await setup(true);
    const root = element.shadowRoot!;
    const choices = () => [...root.querySelectorAll<HTMLOptionElement>("#room-group-reference option")].map(option => option.value);
    expect(choices()).toEqual(["", "climate.a", "climate.b"]);
    expect(root.querySelector<HTMLOptionElement>('#room-group-reference option[value="climate.b"]')!.disabled).toBe(false);
    expect(choices()).not.toContain("sensor.room"); expect(choices()).not.toContain("climate.other");
    element.data = { ...data, room_groups: { "group.room": { ...group, members: [...group.members, "climate.other"] } } };
    await element.updateComplete;
    expect(choices()).toContain("climate.other");
    expect(root.querySelector<HTMLOptionElement>('#room-group-reference option[value="climate.other"]')!.disabled).toBe(false);
  });
  it("retains a saved legacy sensor reference visibly until a member is explicitly chosen", async () => {
    const { element, data, send } = await setup(true);
    element.data = { ...data, room_groups: { "group.room": { ...group, temperature_entity_id: "sensor.room" } } };
    await element.updateComplete;
    const root = element.shadowRoot!;
    const reference = root.querySelector<HTMLSelectElement>("#room-group-reference")!;
    expect(reference.value).toBe("sensor.room");
    expect(reference.selectedOptions[0].disabled).toBe(true);
    expect(reference.selectedOptions[0].textContent).toContain("Saved reference: sensor.room");
    expect(root.querySelector("#room-group-reference-error")?.textContent).toContain("Choose a member climate");
    expect(element.hasUnsavedChanges).toBe(false);
    const name = root.querySelector<HTMLInputElement>('[data-field="name"]')!;
    name.value = "Updated room"; name.dispatchEvent(new Event("input")); await element.updateComplete;
    await act(element, '[data-action="review"]');
    expect(send).not.toHaveBeenCalled();
    expect(element.data!.room_groups!["group.room"].temperature_entity_id).toBe("sensor.room");
    reference.value = "climate.b"; reference.dispatchEvent(new Event("change")); await element.updateComplete;
    expect(root.querySelector("#room-group-reference-error")).toBeNull();
    await act(element, '[data-action="review"]');
    expect(send.mock.calls[0][0]).toMatchObject({ group: { temperature_entity_id: "climate.b" } });
  });
  it("defaults new delivery to all and nests the conditional recipient inside its explanatory block", async () => {
    const { element, click } = await setup();
    await click("Create group");
    const root = element.shadowRoot!;
    const delivery = root.querySelector<HTMLSelectElement>("#room-group-delivery")!;
    expect(delivery.value).toBe("all");
    for (const [descriptionClass, fieldId] of [["delivery", "delivery"], ["adoption", "source"]]) {
      const description = root.querySelector(`.room-group-${descriptionClass}-description`)!;
      expect(description.previousElementSibling?.querySelector("select")?.id).toBe(`room-group-${fieldId}`);
      expect(description.previousElementSibling?.previousElementSibling?.querySelector("label")?.getAttribute("for")).toBe(`room-group-${fieldId}`);
      expect(description.parentElement?.querySelector(".inline-help-trigger")).toBeNull();
      expect(root.querySelector(`#room-group-${fieldId}-help-trigger`)).toBeNull();
    }
    expect(root.querySelector("#room-group-destination")).toBeNull();
    expect(root.querySelector(".room-group-delivery-description")?.textContent).toBe(en.roomGroupDeliveryAllHelp);
    delivery.value = "selected"; delivery.dispatchEvent(new Event("change")); await element.updateComplete;
    const child = root.querySelector(".room-group-delivery-field > .room-group-command-recipient")!;
    expect(child.querySelector("label")?.textContent).toBe("Command recipient");
    expect(root.querySelector(".room-group-delivery-description")?.textContent).toBe(en.roomGroupDeliverySelectedHelp);
    expect(child.querySelector("#room-group-destination")).not.toBeNull();
    expect(root.querySelector(".room-group-adoption-description")?.textContent).toBe(en.roomGroupAdoptConfigurationHelp);
    expect(root.querySelector(".room-group-adoption-notice")?.textContent).toContain("independent settings");
    expect(root.querySelector(".room-group-adoption-notice")?.textContent).toContain("learning starts fresh");
  });
});


describe("room group member container", () => {
  it("uses the supply settings container and opens incomplete groups only", async () => {
    const { element, data } = await setup(true);
    const disclosure = () => element.shadowRoot!.querySelector<HTMLDetailsElement>('[data-section="members"]')!;
    expect(disclosure().matches(".external-controller-conditions.settings-disclosure")).toBe(true);
    expect(disclosure().querySelector("summary > .external-controller-expand-icon")).not.toBeNull();
    expect(disclosure().querySelector(".external-controller-conditions-body > .room-group-members-description")?.textContent).toBe(en.roomGroupMembersHelp);
    expect(disclosure().open).toBe(false);
    element.data = { ...data, room_groups: { "group.short": { ...group, id: "group.short", members: ["climate.a"] } } };
    await element.updateComplete;
    expect(disclosure().open).toBe(true);
    element.data = data;
    await element.updateComplete;
    expect(disclosure().open).toBe(false);
  });
  it("keeps the editor open when adding the second climate", async () => {
    const { element, click } = await setup();
    await click("Create group");
    const root = element.shadowRoot!;
    const disclosure = root.querySelector<HTMLDetailsElement>('[data-section="members"]')!;
    expect(disclosure.open).toBe(true);
    for (const id of ["climate.a", "climate.b"]) {
      await click("Add climates");
      const checkbox = root.querySelector<HTMLInputElement>(`[data-candidate="${id}"] input`)!;
      checkbox.checked = true; checkbox.dispatchEvent(new Event("change")); await element.updateComplete;
      await act(element, '[data-action="confirm-members"]');
      expect(disclosure.open).toBe(true);
    }
    expect(root.querySelectorAll("[data-member]")).toHaveLength(2);
  });
  it("preserves a manually opened container across edits and data refreshes", async () => {
    const { element, data } = await setup(true);
    const root = element.shadowRoot!;
    const disclosure = root.querySelector<HTMLDetailsElement>('[data-section="members"]')!;
    disclosure.open = true;
    element.data = { ...data };
    await element.updateComplete;
    expect(disclosure.open).toBe(true);
    const name = root.querySelector<HTMLInputElement>('[data-field="name"]')!;
    name.value = "Updated room"; name.dispatchEvent(new Event("input")); await element.updateComplete;
    expect(disclosure.open).toBe(true);
  });
});


describe("group operation and initial configuration hierarchy", () => {
  it("keeps operation visible and separates creation-only adoption into its own settings container", async () => {
    const { element, click } = await setup();
    await click("Create group");
    const root = element.shadowRoot!;
    const operation = root.querySelector('section[data-section="operation"]')!;
    const initial = root.querySelector('section[data-section="initial-configuration"]')!;
    for (const section of [operation, initial]) {
      expect(section.matches(".external-controller-conditions.settings-disclosure")).toBe(true);
      expect(section.getAttribute("aria-labelledby")).toBe(section.querySelector("header")?.id);
      expect(section.querySelector("summary")).toBeNull();
      expect(section.querySelector(".external-controller-expand-icon")).toBeNull();
    }
    expect(operation.querySelector("header strong")?.textContent).toBe(en.roomGroupOperation);
    expect(operation.querySelector("#room-group-reference")).not.toBeNull();
    expect(operation.querySelector("#room-group-delivery")).not.toBeNull();
    expect(operation.querySelector("#room-group-source")).toBeNull();
    expect(initial.querySelector("header strong")?.textContent).toBe(en.roomGroupInitialConfiguration);
    expect(initial.querySelector("#room-group-source")).not.toBeNull();
    expect(initial.querySelector(".notice.external-execution-notice span")?.textContent).toBe(en.roomGroupAdoptConfigurationNotice);
    expect(initial.querySelector(".notice ha-icon")?.getAttribute("icon")).toBe("mdi:information-outline");
    expect(root.querySelector('details[data-section="members"]')?.hasAttribute("open")).toBe(true);
  });
  it("shows only the permanent operation block for saved groups", async () => {
    const { element } = await setup(true);
    const root = element.shadowRoot!;
    expect(root.querySelector('section[data-section="operation"]')).not.toBeNull();
    expect(root.querySelector('[data-section="initial-configuration"]')).toBeNull();
    expect(root.querySelector("#room-group-source")).toBeNull();
  });
});


describe("group save error recovery", () => {
  it.each(["save", "remove"])("preserves the group draft and displays backend failure details for %s", async (action) => {
    const { element, send, apply, click } = await setup(true);
    const root = element.shadowRoot!;
    const name = root.querySelector<HTMLInputElement>('[data-field="name"]')!;
    name.value = "Updated room"; name.dispatchEvent(new Event("input")); await element.updateComplete;
    if (action === "save") await act(element, '[data-action="review"]');
    else await click("Dissolve group");
    const message = action === "save" ? "Could not save the room group. Reload the panel before retrying. Reason: disk unavailable." : "Could not dissolve the room group. Reload the panel before retrying. Reason: storage unavailable.";
    send.mockRejectedValueOnce({ code: `room_group_${action}_failed`, message });
    await act(element, action === "save" ? '[data-action="save"]' : '[data-action="confirm-remove"]');
    expect(root.querySelector('.room-group-error[role="alert"]')?.textContent).toBe(message);
    expect(root.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe("Updated room");
    expect(root.querySelector<HTMLInputElement>('[data-field="name"]')!.disabled).toBe(false);
    expect(element.hasUnsavedChanges).toBe(true);
    expect(root.querySelector(".room-group-review")).not.toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });
});


describe("explicit group review dialog", () => {
  async function openReview() {
    const context = await setup(true);
    const root = context.element.shadowRoot!;
    const name = root.querySelector<HTMLInputElement>('[data-field="name"]')!;
    name.value = "Updated room"; name.dispatchEvent(new Event("input")); await context.element.updateComplete;
    await act(context.element, '[data-action="review"]');
    const dialog = root.querySelector<HTMLDialogElement>(".room-group-review-dialog")!;
    return { ...context, root, dialog };
  }
  it("opens a labelled native modal with full details and explicit actions without saving", async () => {
    const { root, dialog, send, apply } = await openReview();
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute("aria-labelledby")).toBe("room-group-review-title");
    expect(dialog.querySelector("#room-group-review-guidance")?.textContent).toBe(en.roomGroupReviewGuidance);
    expect(dialog.textContent).toContain(en.roomGroupBackToEdit);
    expect(dialog.textContent).toContain(en.roomGroupConfirmSave);
    expect(dialog.querySelector(".room-group-review li")?.textContent).toContain("Schedules");
    expect(dialog.textContent).toContain("Learning will restart");
    expect(root.querySelector(".room-group-editor .room-group-review")).toBeNull();
    expect(root.activeElement).toBe(dialog.querySelector("#room-group-review-title"));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].type).toBe("velair/preview_room_group");
    expect(apply).not.toHaveBeenCalled();
  });
  it.each(["back", "close", "escape", "outside"])("returns to the unchanged draft via %s and requires a fresh review", async action => {
    const { element, root, dialog, send } = await openReview();
    if (action === "back") await act(element, '[data-action="back-to-edit"]');
    if (action === "close") await act(element, '.room-group-review-dialog .documentation-close');
    if (action === "escape") dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    if (action === "outside") {
      vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({ left: 100, right: 500, top: 100, bottom: 500 } as DOMRect);
      dialog.dispatchEvent(new MouseEvent("click", { clientX: 0, clientY: 0, bubbles: true }));
    }
    await element.updateComplete;
    expect(dialog.open).toBe(false);
    expect(root.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe("Updated room");
    expect(element.hasUnsavedChanges).toBe(true);
    expect(root.activeElement).toBe(root.querySelector('[data-action="review"]'));
    expect(send).toHaveBeenCalledTimes(1);
    await act(element, '[data-action="review"]');
    expect(dialog.open).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0].type).toBe("velair/preview_room_group");
  });
  it("keeps save errors inside the modal and allows retrying without losing the review", async () => {
    const { element, root, dialog, send, apply } = await openReview();
    send.mockRejectedValueOnce({ code: "room_group_save_failed", message: "Storage unavailable; reload before retrying." });
    await act(element, '.room-group-review-dialog [data-action="save"]');
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('[role="alert"]')?.textContent).toBe("Storage unavailable; reload before retrying.");
    expect(root.querySelector(".room-group-editor > .room-group-error")).toBeNull();
    expect(dialog.querySelector(".room-group-review li")).not.toBeNull();
    expect(element.hasUnsavedChanges).toBe(true);
    expect(apply).not.toHaveBeenCalled();
    await act(element, '.room-group-review-dialog [data-action="save"]');
    expect(dialog.open).toBe(false);
    expect(dialog.querySelector('[role="alert"]')).toBeNull();
    expect(element.hasUnsavedChanges).toBe(false);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(root.activeElement).toBe(root.querySelector('[data-field="name"]'));
  });
  it("prevents closing or submitting twice while confirmation is being saved", async () => {
    const { element, dialog, send, data } = await openReview();
    let resolve!: (data: ScheduleResponse) => void;
    send.mockImplementationOnce(() => new Promise<ScheduleResponse>(done => { resolve = done; }));
    dialog.querySelector<HTMLButtonElement>('[data-action="save"]')!.click();
    await element.updateComplete;
    expect(dialog.getAttribute("aria-busy")).toBe("true");
    expect([...dialog.querySelectorAll<HTMLButtonElement>("button")].every(button => button.disabled)).toBe(true);
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    dialog.dispatchEvent(new MouseEvent("click", { clientX: -10, clientY: -10, bubbles: true }));
    dialog.querySelector<HTMLButtonElement>('[data-action="save"]')!.click();
    await element.updateComplete;
    expect(dialog.open).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
    resolve(data);
    await element.updateComplete; await element.updateComplete;
    expect(dialog.open).toBe(false);
  });
});
