// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { VelairPresetLibrary } from "../../src/velair/components/preset-library-element";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import { presetHvacModes, presetOptionSuggestions, presetTemperatureError, setPresetTargetType } from "../../src/velair/domain/preset-editor";
import type { VelairViewHost } from "../../src/velair/host-types";
import type { ScheduleResponse } from "../../src/velair/types";

if (!customElements.get("velair-preset-refinement-test-card")) customElements.define("velair-preset-refinement-test-card", VelairCard);

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function libraryFixture() {
  const sendMessagePromise = vi.fn().mockResolvedValue({});
  const data = { configured_entities: ["climate.heat", "climate.cool"], temperature_unit: "°C", configuration_revision: 8, block_presets: [{ key: "summer", name: "Summer", config: { action: "set_temperature", temperature: 25, hvac_mode: "cool", fan_mode: "turbo" } }] } as unknown as ScheduleResponse;
  const card = new VelairCard();
  Object.assign(card, { _data: data, _selectedEntity: "climate.heat" });
  card.hass = { connection: { sendMessagePromise }, states: {
    "climate.heat": { state: "heat", attributes: { hvac_modes: ["off", "heat"], fan_modes: ["auto"], min_temp: 15, max_temp: 24 } },
    "climate.cool": { state: "cool", attributes: { hvac_modes: ["off", "cool", "heat_cool"], fan_modes: ["turbo"] } },
  } } as never;
  const library = new VelairPresetLibrary();
  library.host = card as unknown as VelairViewHost; library.data = data; library.hass = card.hass;
  document.body.append(library); library.editPreset("summer"); await library.updateComplete;
  return { library, card, sendMessagePromise };
}

describe("global preset library editor", () => {
  it.each(["21.5", "21,5"])("saves decimal target %s as a number while retaining the input", async (value) => {
    const { library, sendMessagePromise } = await libraryFixture();
    const target = library.shadowRoot!.querySelector<HTMLInputElement>('.editable-block input[inputmode="decimal"]')!;
    target.value = value; target.dispatchEvent(new Event("input")); await library.updateComplete;
    expect(target.value).toBe(value);
    library.shadowRoot!.querySelector<HTMLButtonElement>('.template-detail-actions button')!.click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({
      type: "velair/set_block_preset", config: { action: "set_temperature", temperature: 21.5, hvac_mode: "cool", fan_mode: "turbo" },
    })));
  });
  it("previews and saves a native range with mixed decimal separators", async () => {
    const { library, sendMessagePromise } = await libraryFixture();
    const kind = library.shadowRoot!.querySelectorAll<HTMLSelectElement>('.preset-fields select')[2];
    kind.value = "range"; kind.dispatchEvent(new Event("change")); await library.updateComplete;
    const targets = library.shadowRoot!.querySelectorAll<HTMLInputElement>('.editable-block input[inputmode="decimal"]');
    targets[0].value = "19,5"; targets[0].dispatchEvent(new Event("input")); await library.updateComplete;
    targets[1].value = "24.5"; targets[1].dispatchEvent(new Event("input")); await library.updateComplete;
    const reference = library.shadowRoot!.querySelector<HTMLSelectElement>('.preset-compatibility select')!;
    reference.value = "climate.cool"; reference.dispatchEvent(new Event("change")); await library.updateComplete;
    sendMessagePromise.mockResolvedValueOnce({ blocks: [{ start: "00:00", action: "set_temperature", target_temp_low: 19.5, target_temp_high: 24.5, hvac_mode: "cool" }] });
    library.shadowRoot!.querySelector<HTMLButtonElement>('.preset-check-button')!.click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({
      type: "velair/preview_daily_schedule", blocks: [expect.objectContaining({ target_temp_low: 19.5, target_temp_high: 24.5 })],
    })));
    expect(targets[0].value).toBe("19,5");
    await vi.waitFor(() => expect(library.shadowRoot!.querySelector('.preset-compatibility-result.success')).not.toBeNull());
    library.shadowRoot!.querySelector<HTMLButtonElement>('.template-detail-actions button')!.click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({
      type: "velair/set_block_preset", config: expect.objectContaining({ target_temp_low: 19.5, target_temp_high: 24.5 }),
    })));
  });
  it("rejects malformed decimal input without saving or discarding the draft", async () => {
    const { library, sendMessagePromise } = await libraryFixture();
    for (const value of ["21,5.2", "21,,5", "0x10", "NaN", "", "Infinity"]) {
      const target = library.shadowRoot!.querySelector<HTMLInputElement>('.editable-block input[inputmode="decimal"]')!;
      target.value = value; target.dispatchEvent(new Event("input")); await library.updateComplete;
      library.shadowRoot!.querySelector<HTMLButtonElement>('.template-detail-actions button')!.click(); await library.updateComplete;
      expect(sendMessagePromise).not.toHaveBeenCalled();
      expect(target.value).toBe(value);
      expect(library.shadowRoot!.querySelector('.notice.error')?.textContent).toContain("Enter a valid temperature or range.");
      expect(library.shadowRoot!.querySelector('.notice.error')?.textContent).not.toMatch(/\{min\}|\{max\}/);
    }
  });
  it("shows a stable saved automation ID and copies it without dirtying or saving the preset", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { library, sendMessagePromise } = await libraryFixture();
    const identifier = library.shadowRoot!.querySelector(".preset-automation-id")!;
    expect(identifier.textContent).toContain("Automation ID");
    expect(identifier.querySelector("code")?.textContent).toBe("summer");
    const name = library.shadowRoot!.querySelector<HTMLInputElement>(".template-name-field input")!;
    name.value = "Renamed summer"; name.dispatchEvent(new Event("input")); await library.updateComplete;
    expect(library.shadowRoot!.querySelector(".preset-automation-id code")?.textContent).toBe("summer");
    name.value = "Summer"; name.dispatchEvent(new Event("input")); await library.updateComplete;
    library.shadowRoot!.querySelector<HTMLButtonElement>(".preset-automation-id button")!.click();
    await vi.waitFor(() => expect(library.shadowRoot!.querySelector(".preset-copy-status")?.textContent).toContain("Automation ID copied."));
    expect(writeText).toHaveBeenCalledWith("summer");
    expect(library.shadowRoot!.querySelector(".template-name-field .warning")).toBeNull();
    expect(sendMessagePromise).not.toHaveBeenCalled();
  });
  it("omits the automation ID for a new unsaved preset", async () => {
    const { library } = await libraryFixture();
    library.shadowRoot!.querySelector<HTMLButtonElement>(".template-list-heading button")!.click();
    await library.updateComplete;
    expect(library.shadowRoot!.querySelector(".preset-editor")).not.toBeNull();
    expect(library.shadowRoot!.querySelector(".preset-automation-id")).toBeNull();
  });
  it("localizes the automation ID and copy feedback in Spanish", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    const { library, card } = await libraryFixture();
    card.hass!.language = "es";
    library.requestUpdate(); await library.updateComplete;
    expect(library.shadowRoot!.querySelector(".preset-automation-id-value span")?.textContent).toBe("ID de automatización");
    const copy = library.shadowRoot!.querySelector<HTMLButtonElement>(".preset-automation-id button")!;
    expect(copy.getAttribute("aria-label")).toBe("Copiar ID de automatización"); copy.click();
    await vi.waitFor(() => expect(library.shadowRoot!.querySelector(".preset-copy-status")?.textContent).toContain("ID de automatización copiado."));
  });
  it("keeps a readable automation ID when clipboard access fails", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) } });
    const { library, sendMessagePromise } = await libraryFixture();
    library.shadowRoot!.querySelector<HTMLButtonElement>(".preset-automation-id button")!.click();
    await vi.waitFor(() => expect(library.shadowRoot!.querySelector(".preset-copy-status.error")?.textContent).toContain("Select and copy the automation ID manually."));
    expect(library.shadowRoot!.querySelector(".preset-automation-id code")?.textContent).toBe("summer");
    expect(sendMessagePromise).not.toHaveBeenCalled();
  });
  it("returns to the stable empty layout after deleting the selected last preset", async () => {
    const { library, card, sendMessagePromise } = await libraryFixture();
    const empty = { ...library.data!, block_presets: [], configuration_revision: 9 };
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(card, "_applyScheduleData").mockImplementation((data) => { library.data = data; });
    sendMessagePromise.mockResolvedValueOnce(empty);
    library.shadowRoot!.querySelector<HTMLButtonElement>(".preset-delete-control button")!.click();
    await vi.waitFor(() => expect(library.shadowRoot!.querySelector(".preset-editor")).toBeNull());
    expect(sendMessagePromise).toHaveBeenCalledWith({ type: "velair/delete_block_preset", key: "summer", expected_revision: 8 });
    expect(library.shadowRoot!.querySelector(".preset-library-layout > .preset-list")).not.toBeNull();
    expect(library.shadowRoot!.querySelector(".template-detail .template-placeholder")?.textContent).toContain("Select a preset to begin.");
    expect(library.shadowRoot!.querySelector(".preset-list-empty")?.textContent).toContain("No climate presets yet");
  });
  it("shows template references and inherited scope separately without inflating the usage chip", async () => {
    const { library } = await libraryFixture();
    library.data = { ...library.data!, templates: [
      { key: "work", name: "Workday", blocks: [{ start: "07:00", slot_id: "morning", preset_key: "summer" }] },
      { key: "unused", name: "Unused template", blocks: [{ start: "23:00", slot_id: "night", preset_key: "summer" }] },
    ], resource_usages: { templates: {}, presets: { summer: [
      { source: "template", template_key: "work", slot_id: "morning", start: "07:00" },
      { source: "template", template_key: "unused", slot_id: "night", start: "23:00" },
      { source: "default", entity_id: "climate.cool", weekday: "monday", start: "07:00", template_key: "work", indirect: true },
    ] } } };
    await library.updateComplete;
    expect(library.shadowRoot!.querySelector(".preset-use-count")?.textContent).toContain("2 uses");
    const templates = library.shadowRoot!.querySelector(".preset-template-references")!;
    expect(templates.textContent).toContain("Workday");
    expect(templates.textContent).toContain("Unused template");
    expect(templates.textContent).toContain("23:00");
    const inherited = library.shadowRoot!.querySelector(".preset-inherited-destinations")!;
    expect(inherited.textContent).toContain("Workday");
    expect(inherited.textContent).toContain("07:00");
    expect(library.shadowRoot!.querySelector<HTMLButtonElement>(".preset-delete-control button")!.disabled).toBe(true);
    expect(library.shadowRoot!.querySelector(".preset-template-references button, .preset-template-references a, .preset-inherited-destinations button, .preset-inherited-destinations a")).toBeNull();
  });
  it("groups read-only usage rows by climate and profile identity with resolved slot hours", async () => {
    const { library, card } = await libraryFixture();
    const navigate = vi.fn(); (card as unknown as VelairViewHost)._openResourceUsage = navigate;
    library.data = { ...library.data!, profiles: [{ key: "a", name: "Office", zones: {} }, { key: "b", name: "Office", zones: {} }],
      resource_usages: { templates: {}, presets: { summer: [
        { source: "profile", profile_key: "a", entity_id: "climate.heat", weekday: "monday", slot_id: "morning", start: "07:00" },
        { source: "default", entity_id: "climate.heat", weekday: "wednesday", start: "23:00" },
        { source: "default", entity_id: "climate.heat", weekday: "monday", start: "07:00" },
        { source: "profile", profile_key: "b", entity_id: "climate.heat", weekday: "friday", start: "18:00" },
        { source: "profile", profile_key: "missing", entity_id: "climate.cool", weekday: "tuesday" },
      ] } },
      resolved_block_metadata: { profiles: { a: { "climate.heat": { monday: [{ slot_id: "morning", preset_key: "summer", start: "07:30", origin: "template" }] } } } },
      resolved_profile_schedules: { a: { "climate.heat": { monday: [{ start: "07:30", action: "set_temperature", temperature: 25 }] } } },
    } as unknown as ScheduleResponse;
    await library.updateComplete;
    const groups = [...library.shadowRoot!.querySelectorAll<HTMLElement>(".preset-usage-group")];
    expect(groups).toHaveLength(2); expect(groups[0].querySelector("header .pill")?.textContent).toContain("4");
    const rows = [...groups[0].querySelectorAll<HTMLElement>(".preset-usage-item")];
    expect(rows).toHaveLength(3); expect(rows[0].querySelector("strong")?.textContent).toBe("Default");
    expect(rows[0].textContent).toContain("07:00"); expect(rows[0].textContent).toContain("23:00");
    expect(rows.map((row) => row.querySelector("strong")?.textContent)).toEqual(["Default", "Office", "Office"]);
    expect(rows[1].textContent).toContain("07:30"); expect(groups[1].textContent).toContain("missing"); expect(groups[1].textContent).not.toContain("undefined");
    expect(library.shadowRoot!.querySelector(".preset-usages button, .preset-usages a")).toBeNull(); rows[0].click(); expect(navigate).not.toHaveBeenCalled();
  });

  it("uses native full-row sections with matching icons and preserves their state during checks", async () => {
    const { library, sendMessagePromise } = await libraryFixture();
    const sections = [...library.shadowRoot!.querySelectorAll<HTMLDetailsElement>(".preset-section")];
    expect(sections).toHaveLength(3);
    expect(sections.map((section) => section.querySelector("summary > ha-icon")?.getAttribute("icon"))).toEqual(["mdi:tune-variant", "mdi:link-variant", "mdi:check-decagram-outline"]);
    expect(sections.every((section) => section.querySelector("summary > .preset-section-chevron")?.getAttribute("icon") === "mdi:chevron-down")).toBe(true);
    sections[1].querySelector<HTMLElement>("summary")!.click(); expect(sections[1].open).toBe(true);
    const internal = library as unknown as { _reference: string; _previewReference(): Promise<void> };
    internal._reference = "climate.cool"; await library.updateComplete;
    sendMessagePromise.mockResolvedValueOnce({ blocks: [{ start: "00:00", action: "set_temperature", temperature: 25 }] });
    await internal._previewReference(); await library.updateComplete;
    expect(sections[0].open).toBe(false); expect(sections[1].open).toBe(true); expect(sections[2].open).toBe(false);
    expect(sections.some((section) => section.querySelector("summary button"))).toBe(false);
  });
  it("uses standard comboboxes, dedicated action labels and a save icon next to the name", async () => {
    const { library } = await libraryFixture();
    const save = library.shadowRoot!.querySelector<HTMLButtonElement>('.template-detail-heading .template-detail-actions button')!;
    expect(save.getAttribute("aria-label")).toBe("Save"); expect(save.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:content-save"); expect(save.disabled).toBe(true);
    expect(library.shadowRoot!.querySelector(".preset-actions")).toBeNull();
    expect([...library.shadowRoot!.querySelectorAll("select")].every((select) => select.parentElement?.classList.contains("select-wrap"))).toBe(true);
    const action = library.shadowRoot!.querySelector<HTMLSelectElement>(".preset-fields select")!;
    expect([...action.options].map((option) => option.textContent)).toEqual(["Configure climate", "Mode only", "Additional settings only", "Turn off"]);
    action.value = "set_hvac_mode"; action.dispatchEvent(new Event("change")); await library.updateComplete;
    const mode = library.shadowRoot!.querySelectorAll<HTMLSelectElement>(".preset-fields select")[1];
    expect(mode.querySelector('option[value="off"]')).toBeNull();
    expect(library.shadowRoot!.querySelector('.preset-check-controls .select-wrap')).not.toBeNull();
    expect(library.shadowRoot!.querySelector('.preset-check-controls .preset-check-button')?.getAttribute("aria-label")).toBe("Check compatibility");
  });

  it("shows localized effective compatibility feedback, prevents duplicate checks and preserves save errors", async () => {
    const { library, sendMessagePromise } = await libraryFixture();
    const internal = library as unknown as { _reference: string; _error: string; _previewBusy: boolean; _isDirty: boolean; _previewReference(): Promise<void> };
    internal._reference = "climate.cool"; internal._error = "Save failed"; await library.updateComplete;
    let finish!: (value: unknown) => void;
    sendMessagePromise.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const pending = internal._previewReference(); await Promise.resolve(); await library.updateComplete;
    expect(internal._previewBusy).toBe(true); expect(library.shadowRoot!.querySelector<HTMLButtonElement>('.preset-check-button')!.disabled).toBe(true);
    expect(library.shadowRoot!.querySelector('.preset-compatibility-result.pending')?.textContent).toContain("Checking compatibility");
    await internal._previewReference(); expect(sendMessagePromise).toHaveBeenCalledTimes(1);
    finish({ blocks: [{ start: "00:00", action: "set_temperature", temperature: 25.5, hvac_mode: "cool" }] }); await pending; await library.updateComplete;
    const result = library.shadowRoot!.querySelector('.preset-compatibility-result.success')!;
    expect(result.textContent).toContain("Compatible settings"); expect(result.textContent).toContain("25.5"); expect(result.textContent).not.toContain("turbo");
    expect(result.querySelector('ha-icon')?.getAttribute("icon")).toBe("mdi:check-circle-outline");
    expect(internal._error).toBe("Save failed"); expect(internal._isDirty).toBe(false); expect(internal._previewBusy).toBe(false);
    expect(sendMessagePromise.mock.calls.every(([message]) => message.type === "velair/preview_daily_schedule")).toBe(true);
  });

  it("isolates check errors and clears obsolete errors and results when context changes", async () => {
    const { library, sendMessagePromise } = await libraryFixture();
    const internal = library as unknown as { _reference: string; _error: string; _previewError: string; _previewBusy: boolean; _previewReference(): Promise<void>; _update(field: string, value: string): void };
    internal._reference = "climate.cool"; await library.updateComplete;
    sendMessagePromise.mockRejectedValueOnce(new Error("Unsupported mode")); await internal._previewReference(); await library.updateComplete;
    expect(library.shadowRoot!.querySelector('.preset-compatibility-result.error')?.textContent).toContain("Compatibility check failed");
    expect(internal._error).toBe(""); expect(internal._previewError).toBe("Unsupported mode");
    internal._reference = "climate.heat"; await library.updateComplete;
    expect(internal._previewError).toBe(""); expect(library.shadowRoot!.querySelector('.preset-compatibility-result.error')).toBeNull();
    let reject!: (reason: unknown) => void;
    sendMessagePromise.mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; }));
    const pending = internal._previewReference(); await Promise.resolve();
    internal._update("temperature", "26"); await library.updateComplete;
    reject(new Error("Old failure")); await pending; await library.updateComplete;
    expect(internal._previewError).toBe(""); expect(internal._previewBusy).toBe(false); expect(library.shadowRoot!.querySelector('.preset-compatibility-result.error')).toBeNull();
  });

  it("reports an empty compatibility response as a check failure", async () => {
    const { library, sendMessagePromise } = await libraryFixture();
    const internal = library as unknown as { _reference: string; _previewReference(): Promise<void> };
    internal._reference = "climate.cool"; await library.updateComplete;
    sendMessagePromise.mockResolvedValueOnce({ blocks: [] }); await internal._previewReference(); await library.updateComplete;
    expect(library.shadowRoot!.querySelector('.preset-compatibility-result.success')).toBeNull();
    expect(library.shadowRoot!.querySelector('.preset-compatibility-result.error')).not.toBeNull();
  });
  it("explains blocked deletion and shows the shared link icon beside usage counts", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { library, card, sendMessagePromise } = await libraryFixture();
    library.data = { ...library.data!, resource_usages: { presets: { summer: [{ source: "default", entity_id: "climate.cool", weekday: "monday", start: "07:00" }] }, templates: {} } };
    await library.updateComplete;
    const count = library.shadowRoot!.querySelector(".preset-use-count")!;
    expect(count.textContent).toContain("1 uses");
    expect(count.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:link-variant");
    const wrapper = library.shadowRoot!.querySelector<HTMLElement>(".preset-delete-control")!;
    const button = wrapper.querySelector<HTMLButtonElement>("button")!;
    const blockedHelp = wrapper.title;
    expect(button.disabled).toBe(true);
    expect(wrapper.title).toBe((card as unknown as VelairViewHost)._t("presetDeleteInUse"));
    expect(button.getAttribute("aria-label")).toBe(wrapper.title);
    button.click();
    expect(confirm).not.toHaveBeenCalled(); expect(sendMessagePromise).not.toHaveBeenCalled();
    library.data = { ...library.data!, resource_usages: { presets: {}, templates: {} } };
    await library.updateComplete;
    expect(library.shadowRoot!.querySelector<HTMLButtonElement>(".preset-delete-control button")!.disabled).toBe(false);
    expect(library.shadowRoot!.querySelector<HTMLElement>(".preset-delete-control")!.title).not.toBe(blockedHelp);
  });

  it("opens saved presets clean and tracks only effective name or climate changes", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { library } = await libraryFixture();
    const internal = library as unknown as { _isDirty: boolean };
    expect(internal._isDirty).toBe(false); expect(library.shadowRoot!.querySelector(".pill.warning")).toBeNull();
    library.editPreset("summer"); await library.updateComplete; expect(confirm).not.toHaveBeenCalled();
    const name = library.shadowRoot!.querySelector<HTMLInputElement>('.template-name-field input')!;
    name.value = " Summer "; name.dispatchEvent(new Event("input")); await library.updateComplete;
    const target = library.shadowRoot!.querySelector<HTMLInputElement>('.editable-block input[inputmode="decimal"]')!;
    target.value = "25.0"; target.dispatchEvent(new Event("input")); await library.updateComplete;
    const reference = library.shadowRoot!.querySelector<HTMLSelectElement>(".preset-compatibility select")!;
    reference.value = "climate.heat"; reference.dispatchEvent(new Event("change")); await library.updateComplete;
    expect(internal._isDirty).toBe(false);
    target.value = "26"; target.dispatchEvent(new Event("input")); await library.updateComplete;
    expect(internal._isDirty).toBe(true); expect(library.shadowRoot!.querySelector(".pill.warning")).not.toBeNull();
    target.value = "25"; target.dispatchEvent(new Event("input")); await library.updateComplete;
    expect(internal._isDirty).toBe(false); expect(library.shadowRoot!.querySelector(".pill.warning")).toBeNull();
  });

  it("prompts only for actual dirty switches and cancellation", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { library } = await libraryFixture();
    const internal = library as unknown as { _name: string; _key: string; _isDirty: boolean; _block?: unknown; _cancel(): void; _edit(): void };
    library.data = { ...library.data!, block_presets: [...library.data!.block_presets!, { key: "other", name: "Other", config: { action: "turn_off" } }] };
    internal._name = "Changed"; await library.updateComplete;
    library.editPreset("summer"); expect(confirm).not.toHaveBeenCalled(); expect(internal._name).toBe("Changed");
    library.editPreset("other"); expect(confirm).toHaveBeenCalledTimes(1); expect(internal._key).toBe("summer");
    confirm.mockReturnValue(true); library.editPreset("other"); await library.updateComplete;
    expect(internal._isDirty).toBe(false);
    confirm.mockClear(); internal._cancel(); expect(confirm).not.toHaveBeenCalled();
    internal._edit(); await library.updateComplete; expect(internal._isDirty).toBe(true);
    confirm.mockReturnValue(false); internal._cancel(); expect(internal._block).toBeDefined();
    confirm.mockReturnValue(true); internal._cancel(); expect(internal._block).toBeUndefined();
  });

  it("restores the original dirty baseline across navigation and later library updates", async () => {
    const { library, card } = await libraryFixture();
    let draft: import("../../src/velair/types").PresetLibraryDraft | undefined;
    library.addEventListener("velair-dirty-changed", (event) => { draft = (event as CustomEvent).detail.draft; });
    const target = library.shadowRoot!.querySelector<HTMLInputElement>('.editable-block input[inputmode="decimal"]')!;
    target.value = "26"; target.dispatchEvent(new Event("input")); await library.updateComplete;
    const restored = new VelairPresetLibrary(); restored.host = card as unknown as VelairViewHost; restored.hass = card.hass;
    restored.data = { ...library.data!, configuration_revision: 9, block_presets: [{ key: "summer", name: "Summer", config: { action: "set_temperature", temperature: 26, hvac_mode: "cool", fan_mode: "turbo" } }] };
    restored.draft = draft; document.body.append(restored); await restored.updateComplete;
    const internal = restored as unknown as { _isDirty: boolean; _revision: number; _update(field: string, value: string): void };
    expect(internal._isDirty).toBe(true); expect(internal._revision).toBe(8);
    internal._update("temperature", "25"); await restored.updateComplete; expect(internal._isDirty).toBe(false);
    restored.remove();
  });

  it("keeps a restored new preset dirty and retains drafts after failed saves", async () => {
    const { library, card, sendMessagePromise } = await libraryFixture();
    let draft: import("../../src/velair/types").PresetLibraryDraft | undefined;
    library.addEventListener("velair-dirty-changed", (event) => { draft = (event as CustomEvent).detail.draft; });
    const internal = library as unknown as { _cancel(): void; _edit(): void; _name: string; _isDirty: boolean; _save(): Promise<void> };
    internal._cancel(); internal._edit(); internal._name = "New"; await library.updateComplete;
    expect(draft!.baseline).toBeNull();
    const restored = new VelairPresetLibrary(); restored.host = card as unknown as VelairViewHost; restored.hass = card.hass;
    restored.data = { ...library.data!, block_presets: [{ key: draft!.key, name: "New", config: { action: "set_temperature", temperature: 20 } }] };
    restored.draft = draft; document.body.append(restored); await restored.updateComplete;
    expect((restored as unknown as { _isDirty: boolean })._isDirty).toBe(true);
    sendMessagePromise.mockRejectedValueOnce(new Error("Save failed")); await internal._save(); await library.updateComplete;
    expect(internal._isDirty).toBe(true); expect(internal._name).toBe("New"); expect(library.shadowRoot!.textContent).toContain("Save failed");
    restored.remove();
  });

  it("uses compact empty states and read-only usage rows", async () => {
    const { library, card } = await libraryFixture();
    const openUsage = vi.fn(); (card as unknown as VelairViewHost)._openResourceUsage = openUsage;
    library.data = { ...library.data!, resource_usages: { presets: { summer: [{ source: "default", entity_id: "climate.heat", weekday: "monday", start: "07:00" }] }, templates: {} } };
    await library.updateComplete;
    expect(library.shadowRoot!.querySelector(".preset-usages button")).toBeNull();
    library.shadowRoot!.querySelector<HTMLElement>(".preset-usage-item")!.click(); expect(openUsage).not.toHaveBeenCalled();
    (library as unknown as { _cancel(): void })._cancel(); await library.updateComplete;
    expect(library.shadowRoot!.querySelector(".template-detail .template-placeholder")?.textContent).toContain("Select a preset to begin.");
    library.data = { ...library.data!, block_presets: [] }; await library.updateComplete;
    expect(library.shadowRoot!.querySelector(".template-intro")).toBeNull();
    expect(library.shadowRoot!.querySelectorAll(".template-placeholder.compact")).toHaveLength(1);
    expect(library.shadowRoot!.querySelector(".preset-library-layout > .preset-list")).not.toBeNull();
    expect(library.shadowRoot!.querySelector(".preset-library-layout > .template-detail")).not.toBeNull();
    expect(library.shadowRoot!.querySelector(".preset-list-empty")?.textContent).toContain("No climate presets yet");
    expect(library.shadowRoot!.querySelector(".template-list-heading button ha-icon")?.getAttribute("icon")).toBe("mdi:plus");
    library.shadowRoot!.querySelector<HTMLButtonElement>(".template-list-heading button")!.click();
    await library.updateComplete;
    expect(library.shadowRoot!.querySelector(".preset-list")).not.toBeNull();
    expect(library.shadowRoot!.querySelector(".template-detail .preset-editor")).not.toBeNull();
    expect(library.shadowRoot!.querySelectorAll(".template-list-heading button")).toHaveLength(1);
  });
  it("offers cooling and ranges independently of the selected heating-only climate", async () => {
    const { library, sendMessagePromise } = await libraryFixture();
    const selects = [...library.shadowRoot!.querySelectorAll<HTMLSelectElement>(".preset-fields select")];
    expect(selects.map((select) => select.value)).toEqual(["set_temperature", "cool", "scalar"]);
    expect(selects[1].querySelector('option[value="cool"]')).not.toBeNull();
    expect(library.shadowRoot!.querySelector('input[type="time"]')).toBeNull();
    selects[2].value = "range"; selects[2].dispatchEvent(new Event("change")); await library.updateComplete;
    expect(library.shadowRoot!.querySelectorAll<HTMLSelectElement>(".preset-fields select")[2].value).toBe("range");
    const targets = [...library.shadowRoot!.querySelectorAll<HTMLInputElement>('.editable-block input[inputmode="decimal"]')];
    expect(targets).toHaveLength(2);
    targets[0].value = "25"; targets[0].dispatchEvent(new Event("input"));
    await library.updateComplete;
    const high = library.shadowRoot!.querySelectorAll<HTMLInputElement>('.editable-block input[inputmode="decimal"]')[1];
    high.value = "28"; high.dispatchEvent(new Event("input")); await library.updateComplete;
    await (library as unknown as { _save(): Promise<void> })._save();
    expect(sendMessagePromise).toHaveBeenCalledWith({ type: "velair/set_block_preset", key: "summer", name: "Summer", config: { action: "set_temperature", target_temp_low: 25, target_temp_high: 28, hvac_mode: "cool", fan_mode: "turbo" }, expected_revision: 8 });
  });

  it("checks a reference device only on request and never changes the reusable preset", async () => {
    const { library, sendMessagePromise } = await libraryFixture();
    const select = library.shadowRoot!.querySelector<HTMLSelectElement>(".preset-compatibility select")!;
    select.value = "climate.heat"; select.dispatchEvent(new Event("change")); await library.updateComplete;
    expect(sendMessagePromise).not.toHaveBeenCalled();
    await (library as unknown as { _save(): Promise<void> })._save();
    expect(sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({ config: { action: "set_temperature", temperature: 25, hvac_mode: "cool", fan_mode: "turbo" } }));
  });

  it("renders the saved action and range when restoring independent presets", async () => {
    const { library } = await libraryFixture();
    const internal = library as unknown as { _cancel(): void };
    internal._cancel();
    library.data = { ...library.data!, block_presets: [
      { key: "options", name: "Ventilation", config: { action: "set_climate_options", fan_mode: "turbo" } },
      { key: "range", name: "Range", config: { action: "set_temperature", hvac_mode: "heat_cool", target_temp_low: 20, target_temp_high: 25 } },
    ] };
    library.editPreset("options"); await library.updateComplete;
    expect(library.shadowRoot!.querySelector<HTMLSelectElement>(".preset-fields select")!.value).toBe("set_climate_options");
    internal._cancel(); library.editPreset("range"); await library.updateComplete;
    expect([...library.shadowRoot!.querySelectorAll<HTMLSelectElement>(".preset-fields select")].map((select) => select.value)).toEqual(["set_temperature", "heat_cool", "range"]);
  });

  it("retains custom option values and combines suggestions from all climates", async () => {
    const { library, card } = await libraryFixture();
    expect(presetOptionSuggestions(card.hass, ["climate.heat", "climate.cool"], "fan_modes")).toEqual(["auto", "turbo"]);
    expect(library.shadowRoot!.querySelector<HTMLInputElement>('input[list="preset-fan_mode"]')!.value).toBe("turbo");
    expect(presetHvacModes).toContain("cool"); expect(presetHvacModes).not.toContain("off");
  });

  it("ignores compatibility results for a draft changed during the request", async () => {
    const { library, sendMessagePromise } = await libraryFixture();
    let complete!: (value: unknown) => void;
    sendMessagePromise.mockReturnValueOnce(new Promise((resolve) => { complete = resolve; }));
    const internal = library as unknown as { _reference: string; _previewConfiguration?: unknown; _previewReference(): Promise<void>; _update(field: string, value: string): void };
    internal._reference = "climate.cool";
    await library.updateComplete;
    const pending = internal._previewReference();
    await Promise.resolve();
    internal._update("temperature", "26");
    complete({ blocks: [{ start: "00:00", action: "set_temperature", temperature: 25 }] });
    await pending;
    expect(internal._previewConfiguration).toBeUndefined();
  });

  it("disables the editor and protects its draft while saving", async () => {
    const { library, sendMessagePromise } = await libraryFixture();
    let complete!: (value: unknown) => void;
    sendMessagePromise.mockReturnValueOnce(new Promise((resolve) => { complete = resolve; }));
    const pending = (library as unknown as { _save(): Promise<void> })._save();
    await library.updateComplete;
    expect(library.shadowRoot!.querySelector<HTMLFieldSetElement>(".preset-config-fields")!.disabled).toBe(true);
    expect(library.shadowRoot!.querySelector<HTMLInputElement>('.template-name-field input')!.disabled).toBe(true);
    complete({}); await pending;
  });

  it("switches scalar and range targets exclusively and rejects incomplete ranges", () => {
    const range = setPresetTargetType({ start: "00:00", action: "set_temperature", hvac_mode: "cool", temperature: 25 }, true);
    expect(range.temperature).toBeUndefined();
    expect(presetTemperatureError(range, "Invalid")).toBeUndefined();
    expect(presetTemperatureError({ ...range, target_temp_high: "" }, "Invalid")).toBe("Invalid");
    const scalar = setPresetTargetType(range, false);
    expect(scalar.temperature).toBe(25); expect(scalar.target_temp_low).toBeUndefined(); expect(scalar.target_temp_high).toBeUndefined();
  });
});
