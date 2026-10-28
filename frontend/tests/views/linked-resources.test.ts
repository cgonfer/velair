// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { VelairPresetLibrary } from "../../src/velair/components/preset-library-element";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import { VelairProfilesView } from "../../src/velair/components/profiles-view-element";
import { createClimateProfileDraft, climateProfileInput } from "../../src/velair/domain/climate-profiles";
import { backendErrorMessage } from "../../src/velair/domain/backend-errors";
import type { ClimateProfile, ScheduleResponse } from "../../src/velair/types";
import type { VelairViewHost } from "../../src/velair/host-types";
if (!customElements.get("velair-resource-test-card")) customElements.define("velair-resource-test-card", VelairCard);

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });
const template = { key: "work", name: "Workday", blocks: [{ start: "07:00", slot_id: "a", action: "turn_off" }] };
const link = { template_key: "work", bindings: { a: { preset_key: "heat" } } };
const profile: ClimateProfile = { key: "winter", name: "Winter", zones: { "climate.room": { behavior: "schedule", schedule: {}, template_links: { monday: link, tuesday: link, wednesday: link } }, "climate.other": { behavior: "schedule", schedule: {}, template_links: { monday: link, wednesday: link } } } };

describe("resource editor integration", () => {
  it("renders a preset using prototype host methods and saves the exclusive configuration", async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue({});
    const data = { configured_entities: ["climate.room"], temperature_unit: "°C", configuration_revision: 4, block_presets: [{ key: "heat", name: "Heat", config: { action: "set_temperature", temperature: 21, hvac_mode: "heat" } }] } as unknown as ScheduleResponse;
    const card = new VelairCard();
    Object.assign(card, { _data: data, _selectedEntity: "climate.room" });
    card.hass = { connection: { sendMessagePromise }, states: { "climate.room": { state: "heat", attributes: { hvac_modes: ["off", "heat", "cool"], supported_features: 1 } } } } as never;
    const library = new VelairPresetLibrary();
    library.host = card as unknown as VelairViewHost; library.hass = card.hass; library.data = data;
    document.body.append(library);
    library.editPreset("heat");
    await library.updateComplete;
    expect(library.shadowRoot?.querySelector(".editable-block")).not.toBeNull();
    expect(library.shadowRoot?.textContent).toContain("Heat");
    await (library as unknown as { _save(): Promise<void> })._save();
    expect(sendMessagePromise).toHaveBeenCalledWith({ type: "velair/set_block_preset", key: "heat", name: "Heat", config: { action: "set_temperature", temperature: 21, hvac_mode: "heat" }, expected_revision: 4 });
    library.remove();
  });
  it("preserves links on clone targets and keeps source and unrelated links", async () => {
    const view = new VelairProfilesView();
    view.data = { templates: [template], temperature_unit: "°C" } as unknown as ScheduleResponse;
    const internal = view as unknown as { _draft: ReturnType<typeof createClimateProfileDraft>; _cloneSelectedDay(entity: string, day: string, targets: Set<string>): void };
    internal._draft = createClimateProfileDraft(profile);
    view.hass = { connection: { sendMessagePromise: vi.fn().mockResolvedValue({}) } } as never;
    await internal._cloneSelectedDay("climate.room", "monday", new Set(["tuesday"]));
    const zone = climateProfileInput(internal._draft).zones["climate.room"];
    expect(zone.behavior).toBe("schedule");
    if (zone.behavior !== "schedule") return;
    expect(zone.schedule.monday).toEqual([]);
    expect(zone.schedule.tuesday).toEqual([]);
    expect(zone.template_links).toEqual({ monday: link, tuesday: link, wednesday: link });
  });
  it("cross-climate copying keeps unrelated target links and never modifies the linked source", async () => {
    const view = new VelairProfilesView();
    view.data = { templates: [template], temperature_unit: "°C" } as unknown as ScheduleResponse;
    const internal = view as unknown as { _draft: ReturnType<typeof createClimateProfileDraft>; _climateCloneDialog: unknown; _cloneCompatibilityError(): undefined; _filterCopiedBlocks(entity: string, blocks: unknown): unknown; _confirmCloneDayToClimates(): void };
    internal._draft = createClimateProfileDraft(profile);
    internal._climateCloneDialog = { entityId: "climate.room", weekday: "monday", targets: new Set(["climate.other"]) };
    internal._cloneCompatibilityError = () => undefined;
    internal._filterCopiedBlocks = (_entity, blocks) => blocks;
    view.hass = { connection: { sendMessagePromise: vi.fn().mockResolvedValue({}) } } as never;
    await internal._confirmCloneDayToClimates();
    const input = climateProfileInput(internal._draft);
    const source = input.zones["climate.room"], target = input.zones["climate.other"];
    if (source.behavior !== "schedule" || target.behavior !== "schedule") throw Error("Missing schedules");
    expect(source.schedule.monday).toEqual([]);
    expect(source.template_links).toEqual(profile.zones["climate.room"].behavior === "schedule" ? profile.zones["climate.room"].template_links : undefined);
    expect(target.schedule.monday).toEqual([]);
    expect(target.template_links).toEqual({ monday: link, wednesday: link });
  });
  it("preserves structured Home Assistant error messages and usage details", () => {
    expect(backendErrorMessage({ code: "resource_in_use", message: "Preset is in use", details: { usages: [{ source: "profile", profile_key: "winter", entity_id: "climate.room", weekday: "monday" }] } }, "Failed")).toBe("Preset is in use\nwinter · climate.room · monday");
  });
});


describe("opaque backend errors", () => {
  it.each(["Unknown error", " unknown_error ", "UNKNOWN", " ", ""])("replaces %s with actionable fallback and retains its code", (message) => {
    expect(backendErrorMessage({ code: "unknown_error", message }, "Reload and retry.")).toBe("Reload and retry. (unknown_error)");
  });
  it("preserves useful backend reasons and destination details", () => {
    expect(backendErrorMessage({ code: "room_group_save_failed", message: "Disk unavailable", details: { usages: [{ entity_id: "climate.a" }] } }, "Failed")).toBe("Disk unavailable\nclimate.a");
  });
});
