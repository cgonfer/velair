// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlannedReturnElement } from "../../src/velair/components/planned-return-element";
import { en } from "../../src/velair/translations/en";
import { es } from "../../src/velair/translations/es";
import { plannedReturnDraft, returnWallTime, returnWallTimeToIso } from "../../src/velair/domain/planned-return";
import { portableSectionsWithDependencies, validatePortablePayload } from "../../src/velair/domain/portable";
import type { HomeAssistant, PlannedReturnPreparation, PlannedReturnStatus, ScheduleResponse } from "../../src/velair/types";

const initial = () => ({
  planned_return: { ...plannedReturnDraft(), occupancy_entity_ids: ["binary_sensor.household"] },
  planned_return_status: { state: "away", occupancy: "away", return_at: "2026-10-06T16:15:00Z", absence_confirm_at: null, zones: [], error: null, sources: [{ entity_id: "binary_sensor.household", state: "away" }], origin: null, can_start: true } as PlannedReturnStatus,
  modes: [{ key: "mode-123", name: "Away", profile_ids: ["profile-a"] }],
  temperature_unit: "°C",
}) as ScheduleResponse;
async function setup(settings = true) {
  const element = new PlannedReturnElement();
  const send = vi.fn().mockResolvedValue(initial());
  element.hass = { config: { time_zone: "Europe/Madrid" }, states: { "binary_sensor.household": { state: "off" }, "person.alice": { state: "not_home" } }, connection: { sendMessagePromise: send } } as unknown as HomeAssistant;
  element.data = initial(); element.settings = settings; element.t = (key) => String(en[key]);
  document.body.append(element); await element.updateComplete;
  element.shadowRoot!.querySelector<HTMLButtonElement>(".arrival-edit-trigger")?.click(); await element.updateComplete;
  return { element, send, root: element.shadowRoot! };
}
async function input(element: PlannedReturnElement, target: HTMLInputElement | HTMLSelectElement, value: string, event = "input") {
  if (target.type === "time" && value.includes("T")) {
    const date = element.shadowRoot!.querySelector<HTMLInputElement>("#episode-return-date")!;
    date.value = value.slice(0, 10); date.dispatchEvent(new Event("input", { bubbles: true })); await element.updateComplete;
    value = value.slice(11);
  }
  target.value = value; target.dispatchEvent(new Event(event, { bubbles: true })); await element.updateComplete;
}
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-06T08:00:00Z")); });
async function closeEditor(element: PlannedReturnElement) {
  element.shadowRoot!.querySelector<HTMLButtonElement>(".arrival-editor-close")?.click(); await element.updateComplete;
}
afterEach(() => { document.body.replaceChildren(); vi.useRealTimers(); });
describe("planned return UI", () => {
  it.each(["panel", "compact", "embedded"])("offers immediate Away as an unchecked one-off option in %s", async (layout) => {
    const { element, root, send } = await setup();
    element.compact = layout !== "panel";
    element.embedded = layout === "embedded";
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "idle", return_at: null, occupancy: "home" } };
    send.mockResolvedValue(element.data);
    await element.updateComplete;
    const checkbox = root.querySelector<HTMLInputElement>("#apply-away-now")!;
    expect(checkbox.checked).toBe(false);
    expect(root.querySelector("label[for=apply-away-now]")?.textContent).toBe(en.plannedReturnApplyAwayNow);
    const startButton = root.querySelector<HTMLButtonElement>(".start-return")!;
    expect(checkbox.compareDocumentPosition(startButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(root.querySelector("#apply-away-now-help")!.compareDocumentPosition(startButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    root.querySelector<HTMLButtonElement>(".start-return")!.click();
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send.mock.calls[0][0]).toEqual({ type: "velair/start_planned_return", return_at: expect.any(String) });
    await element.updateComplete;
    checkbox.checked = true; checkbox.dispatchEvent(new Event("change")); await element.updateComplete;
    expect(root.querySelector(".manual-departure-help")?.textContent).toBe(en.plannedReturnManualAwayScheduleHelp);
    root.querySelector<HTMLButtonElement>(".start-return")!.click();
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send.mock.calls[1][0]).toMatchObject({ type: "velair/start_planned_return", apply_away_now: true });
    await vi.waitFor(() => expect(root.querySelector<HTMLInputElement>("#apply-away-now")!.checked).toBe(false));
  });
  it("preserves immediate Away on failure, locks it during requests and excludes it without saved sources", async () => {
    const { element, root, send } = await setup();
    const idle = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "idle" as const, return_at: null } };
    element.data = idle; await element.updateComplete;
    const checkbox = root.querySelector<HTMLInputElement>("#apply-away-now")!;
    checkbox.checked = true; checkbox.dispatchEvent(new Event("change")); await element.updateComplete;
    let fail!: (error: unknown) => void;
    send.mockImplementationOnce(() => new Promise((_, reject) => { fail = reject; }));
    root.querySelector<HTMLButtonElement>(".start-return")!.click(); await element.updateComplete;
    expect(checkbox.disabled).toBe(true);
    fail({ message: "Start failed" });
    await vi.waitFor(() => expect(root.querySelector("[role=alert]")?.textContent).toBe("Start failed"));
    expect(checkbox.checked).toBe(true); expect(checkbox.disabled).toBe(false);
    await input(element, root.querySelector("#absence-delay")!, "20");
    expect(checkbox.disabled).toBe(true);
    root.querySelector<HTMLButtonElement>(".footer-actions button")!.click(); await element.updateComplete;
    element.data = { ...idle, planned_return: { ...idle.planned_return!, occupancy_entity_ids: [] }, planned_return_status: { ...idle.planned_return_status!, sources: [] } };
    send.mockResolvedValue(element.data); await element.updateComplete;
    expect(root.querySelector("#apply-away-now")).toBeNull();
    root.querySelector<HTMLButtonElement>(".start-return")!.click();
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send.mock.calls[1][0]).not.toHaveProperty("apply_away_now");
  });
  it.each(["away", "preparing"] as const)("explains pending manual departure while keeping %s controls active", async (state) => {
    const { element, root } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state, awaiting_departure_confirmation: true } };
    await element.updateComplete;
    expect(root.querySelector(".return-departure-copy")?.textContent).toBe(en.plannedReturnDepartureWaiting);
    expect(root.querySelector(".return-departure-confirmation .inline-help-tooltip")?.textContent).toContain(en.plannedReturnManualAwayWaitingHelp);
    expect(root.querySelector(".return-departure-confirmation time")).toBeNull();
    expect(root.querySelector(".return-context-status")?.textContent).toContain(en[`plannedReturnState_${state}`]);
    expect(root.querySelector(".return-departure-description")).toBeNull();
    expect(root.querySelector(".return-context-status > ha-icon")).toBeNull();
    expect(root.querySelector(".return-departure-icon")).toBeNull();
    expect(root.querySelector(".change-arrival")).not.toBeNull();
    element.data = { ...element.data!, planned_return_status: { ...element.data!.planned_return_status!, absence_confirm_at: "2026-10-06T08:10:00Z" } };
    await element.updateComplete;
    expect(root.querySelector(".return-departure-copy")?.textContent).toContain(en.plannedReturnDepartureConfirming);
    expect(root.querySelector(".return-departure-confirmation time")?.getAttribute("datetime")).toBe("2026-10-06T08:10:00Z");
    element.data = { ...element.data!, planned_return_status: { ...element.data!.planned_return_status!, awaiting_departure_confirmation: false, absence_confirm_at: null } };
    await element.updateComplete;
    expect(root.querySelector(".return-departure-confirmation")).toBeNull();
  });
  it.each([
    ["panel", true, false, false], ["Lovelace", false, true, false], ["embedded", false, true, true],
  ] as const)("keeps confirmation separate from preparation and real occupancy in %s", async (_name, settings, compact, embedded) => {
    const { element, root } = await setup();
    element.settings = settings; element.compact = compact; element.embedded = embedded;
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!,
      state: "preparing", occupancy: "home", sources: [{ entity_id: "binary_sensor.household", state: "home" }],
      departure_at: "2026-10-06T07:00:00Z", awaiting_departure_confirmation: true,
    } };
    await element.updateComplete;
    expect(root.querySelector(".return-context-status")?.textContent).toContain(en.plannedReturnState_preparing);
    expect(root.querySelector(".return-departure-copy")?.textContent).toBe(en.plannedReturnDepartureWaiting);
    expect(root.querySelector(".return-departure-description")).toBeNull();
    expect(root.querySelector('[data-runtime-count="home"]')?.textContent).toContain("1");
    const help = root.querySelector<HTMLButtonElement>("#return-departure-confirmation-trigger")!;
    help.click(); expect(help.getAttribute("aria-expanded")).toBe("true");
    help.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(help.getAttribute("aria-expanded")).toBe("false");
    element.data = { ...element.data!, planned_return_status: { ...element.data!.planned_return_status!,
      awaiting_departure_confirmation: false, occupancy: "away", sources: [{ entity_id: "binary_sensor.household", state: "away" }],
    } };
    await element.updateComplete;
    expect(root.querySelector(".return-departure-confirmation")).toBeNull();
    expect(root.querySelector("#return-current-phase")?.textContent).toContain(en.plannedReturnPresenceReturnEnabledHelp);
    if (!embedded) expect(root.querySelector("#panel-return-departure")?.textContent).not.toContain(en.plannedReturnPresenceReturnEnabledHelp);
  });
  it("groups occupancy, delay and both modes separately from weekly arrivals", async () => {
    const { element, root } = await setup();
    const presence = root.querySelector(".presence-settings")!;
    const weekly = root.querySelector(".weekly-settings")!;
    expect(presence.querySelector(".section-label")?.textContent).toBe(en.plannedReturnAwayAndReturn);
    expect(weekly.querySelector(".section-label")?.textContent).toBe(en.plannedReturnArrivalTimes);
    expect(presence.querySelector(".section-heading p")?.textContent).toBe(en.plannedReturnAwayAndReturnHelp);
    expect(presence.querySelector(".occupancy-description")?.textContent).toBe(en.plannedReturnPresenceDescription);
    const rule = presence.querySelector(".absence-rule")!;
    expect(Array.from(rule.querySelectorAll("input,select"), (control) => control.id || control.getAttribute("data-field")))
      .toEqual(["absence-delay", "delay_unit", "away_mode_id", "destination_mode_id"]);
    for (const field of ["away_mode_id", "destination_mode_id"]) {
      expect(root.querySelectorAll(`select[data-field="${field}"]`)).toHaveLength(1);
    }
    expect(rule.querySelector(".away-mode .help")?.textContent).toBe(en.plannedReturnAwayModeHelp);
    expect(rule.querySelector(".return-mode .help")?.textContent).toBe(en.plannedReturnReturnModeHelp);
    expect(rule.querySelector(".absence-delay-help")?.textContent).toBe(en.plannedReturnAbsenceDelayHelp);
    expect(weekly.querySelectorAll("input[type=time]")).toHaveLength(7);
    expect(weekly.querySelector("select,.return-mode,.weekly-label,#absence-delay")).toBeNull();
    expect(weekly.querySelector(".section-heading p")?.textContent).toBe(en.plannedReturnWeeklyDescription);
    expect(weekly.querySelector(".timezone-help")).not.toBeNull();
    root.querySelector<HTMLButtonElement>(".remove-source")!.click();
    await element.updateComplete;
    expect(rule.querySelector(".absence-delay-help")?.textContent).toBe(en.plannedReturnSensorlessSettingsHelp);
  });
  it("saves and cancels both relocated modes with the delay, and locks controls during save", async () => {
    const { element, root, send } = await setup();
    const away = root.querySelector<HTMLSelectElement>('[data-field="away_mode_id"]')!;
    const destination = root.querySelector<HTMLSelectElement>('[data-field="destination_mode_id"]')!;
    await input(element, away, "mode-123", "change");
    await input(element, destination, "mode-123", "change");
    await input(element, root.querySelector("#absence-delay")!, "25");
    root.querySelector<HTMLButtonElement>(".footer-actions button")!.click(); await element.updateComplete;
    expect(away.value).toBe(initial().planned_return!.away_mode_id);
    expect(destination.value).toBe(initial().planned_return!.destination_mode_id);
    expect(root.querySelector<HTMLInputElement>("#absence-delay")!.value).toBe("10");
    await input(element, away, "mode-123", "change");
    await input(element, destination, "mode-123", "change");
    await input(element, root.querySelector("#absence-delay")!, "25");
    let complete!: (value: ScheduleResponse) => void;
    send.mockImplementationOnce(() => new Promise<ScheduleResponse>((resolve) => { complete = resolve; }));
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await element.updateComplete;
    expect(send.mock.calls[0][0]).toMatchObject({ type: "velair/update_planned_return", planned_return: {
      away_mode_id: "mode-123", destination_mode_id: "mode-123", absence_delay_minutes: 25,
    } });
    for (const control of root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".absence-rule input,.absence-rule select")) {
      expect(control.disabled).toBe(true);
    }
    complete(initial());
    await vi.waitFor(() => expect(away.disabled).toBe(false));
  });
  it("shows a pending arrival only once with visible labeled icon actions and no repeated origin", async () => {
    const { element, root } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "armed", origin: "manual" } }; await element.updateComplete;
    const panel = root.querySelector(".quick-return-panel")!;
    expect(panel.querySelector(".episode-status small")).toBeNull();
    expect(panel.querySelectorAll("input[type=date]")).toHaveLength(1);
    expect(panel.querySelectorAll("input[type=time]")).toHaveLength(1);
    expect(panel.querySelector("label[for=episode-return-date]")?.textContent).toContain(en.plannedReturnDate);
    expect(panel.querySelector("label[for=episode-return-time]")?.textContent).toContain(en.plannedReturnTime);
    expect(Array.from(panel.querySelectorAll("p")).some((p) => p.textContent?.includes(en.plannedReturnArrival))).toBe(false);
    for (const [selector, icon, key] of [[".change-arrival", "mdi:check", "plannedReturnChange"]] as const) {
      const action = panel.querySelector(selector)!;
      expect(action.classList.contains("episode-action")).toBe(true);
      expect(action.querySelector("span")?.textContent).toBeTruthy();
      expect(action.querySelector("ha-icon")?.getAttribute("icon")).toBe(icon);
      expect(action.getAttribute("aria-label")).toBe(en[key]);
      expect(action.getAttribute("title")).toBe(en[key]);
    }
    expect(panel.querySelector(".episode-actions")?.closest(".episode-layout")).not.toBeNull();
  });
  it.each(["armed", "confirming_absence", "away", "preparing"] as const)("places cancellation in the header and confirmation in the editor footer in %s", async (state) => {
    const { element, root } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state, origin: "manual" } }; await element.updateComplete;
    const actions = root.querySelector(".episode-buttons")!;
    expect(root.querySelector(".cancel-return")).toBeNull();
    const positive = actions.lastElementChild!;
    expect(positive.classList.contains("episode-confirm-actions")).toBe(true);
    expect(positive.firstElementChild?.classList.contains("change-arrival")).toBe(true);
    expect(positive.querySelector(".cancel-pending,.skip-return")).toBeNull();
    expect(positive.querySelectorAll("button")).toHaveLength(1);
  });
  it("guards unsaved arrival edits and restores a clean scope when the original time is restored", async () => {
    const { element, root, send } = await setup();
    const dirty = vi.fn(); element.addEventListener("velair-dirty-changed", dirty);
    const arrival = root.querySelector<HTMLInputElement>("#episode-return-time")!;
    const original = arrival.value;
    expect((root.querySelector(".change-arrival") as HTMLButtonElement).disabled).toBe(true);
    await input(element, arrival, "2026-10-06T18:30");
    expect(dirty.mock.calls.at(-1)?.[0].detail.dirty).toBe(true);
    expect(root.querySelector(".arrival-unsaved")?.textContent).toBe(en.plannedReturnArrivalUnsaved);
    expect((root.querySelector(".change-arrival") as HTMLButtonElement).disabled).toBe(false);
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "preparing" } }; await element.updateComplete;
    element.hass = { ...element.hass! }; await element.updateComplete;
    expect(arrival.value).toBe("18:30");
    await input(element, arrival, original);
    expect(dirty.mock.calls.at(-1)?.[0].detail.dirty).toBe(false);
    expect(root.querySelector(".arrival-unsaved")).toBeNull(); expect(send).not.toHaveBeenCalled();
  });
  it("preserves an arrival draft through independent configuration Save and Cancel", async () => {
    const { element, root, send } = await setup();
    const dirty = vi.fn(); element.addEventListener("velair-dirty-changed", dirty);
    const arrival = root.querySelector<HTMLInputElement>("#episode-return-time")!;
    await input(element, arrival, "2026-10-06T18:30");
    await input(element, root.querySelector("#absence-delay")!, "12");
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect((root.querySelector("button[type=submit]") as HTMLButtonElement).disabled).toBe(true));
    expect(send.mock.calls[0][0].type).toBe("velair/update_planned_return");
    expect(arrival.value).toBe("18:30"); expect(root.querySelector(".arrival-unsaved")).not.toBeNull();
    expect(dirty.mock.calls.at(-1)?.[0].detail.dirty).toBe(true);
    await input(element, root.querySelector("#absence-delay")!, "13");
    (root.querySelector(".footer-actions button") as HTMLButtonElement).click(); await element.updateComplete;
    expect(arrival.value).toBe("18:30"); expect(dirty.mock.calls.at(-1)?.[0].detail.dirty).toBe(true);
  });
  it("retains both edits on an arrival error and clears only arrival after successful application", async () => {
    const { element, root, send } = await setup();
    const dirty = vi.fn(); element.addEventListener("velair-dirty-changed", dirty);
    await input(element, root.querySelector("#absence-delay")!, "13");
    const arrival = root.querySelector<HTMLInputElement>("#episode-return-time")!;
    await input(element, arrival, "2026-10-06T18:30");
    send.mockRejectedValueOnce({ message: "Could not adjust" });
    (root.querySelector(".change-arrival") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(root.querySelector('[role=alert]')?.textContent).toBe("Could not adjust"));
    expect(arrival.value).toBe("18:30"); expect(root.querySelector(".arrival-unsaved")).not.toBeNull();
    send.mockResolvedValue({ ...initial(), planned_return_status: { ...initial().planned_return_status!, return_at: "2026-10-06T16:30:00Z" } });
    (root.querySelector(".change-arrival") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(root.querySelector(".arrival-unsaved")).toBeNull());
    expect((root.querySelector("#absence-delay") as HTMLInputElement).value).toBe("13");
    expect(dirty.mock.calls.at(-1)?.[0].detail.dirty).toBe(true);
    expect(root.querySelector(".quick-return-panel")?.textContent).not.toContain(en.plannedReturnSaved);
  });
  it("preserves a typed arrival during an untimed absence until it is applied", async () => {
    const { element, root } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, return_at: null } }; await element.updateComplete;
    const arrival = root.querySelector<HTMLInputElement>("#episode-return-time")!;
    await input(element, arrival, "2026-10-06T18:30");
    element.data = { ...element.data!, planned_return_status: { ...element.data!.planned_return_status!, occupancy: "unknown" } }; await element.updateComplete;
    expect(arrival.value).toBe("18:30"); expect(root.querySelector(".arrival-unsaved")).not.toBeNull();
    await input(element, root.querySelector("#absence-delay")!, "12");
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect((root.querySelector("button[type=submit]") as HTMLButtonElement).disabled).toBe(true));
    expect(arrival.value).toBe("18:30"); expect(root.querySelector(".arrival-unsaved")).not.toBeNull();
  });
  it.each(["fulfilled", "cancelled", "skipped", "idle", "disabled", "error"] as const)("clears only a stale arrival guard when the episode becomes %s", async (state) => {
    const { element, root } = await setup();
    const dirty = vi.fn(); element.addEventListener("velair-dirty-changed", dirty);
    await input(element, root.querySelector("#episode-return-time")!, "2026-10-06T18:30");
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state } }; await element.updateComplete;
    expect(root.querySelector(".arrival-unsaved")).toBeNull();
    expect(dirty.mock.calls.at(-1)?.[0].detail.dirty).toBe(false);
  });
  it("recognizes a backend arrival matching the draft and refuses input mutation while an operation is busy", async () => {
    const { element, root, send } = await setup();
    const arrival = root.querySelector<HTMLInputElement>("#episode-return-time")!;
    await input(element, arrival, "2026-10-06T18:30");
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, return_at: "2026-10-06T16:30:00Z" } }; await element.updateComplete;
    expect(root.querySelector(".arrival-unsaved")).toBeNull();
    await input(element, arrival, "2026-10-06T18:45");
    let finish!: (data: ScheduleResponse) => void; send.mockImplementation(() => new Promise<ScheduleResponse>((resolve) => { finish = resolve; }));
    (root.querySelector(".change-arrival") as HTMLButtonElement).click(); await element.updateComplete;
    await input(element, arrival, "2026-10-06T19:00");
    expect(arrival.value).toBe("18:45"); expect(arrival.disabled).toBe(true);
    finish(initial()); await vi.waitFor(() => expect(root.querySelector("#episode-return-time")).toBeNull());
    expect(root.querySelector(".arrival-unsaved")).toBeNull();
  });
  it("compares restored edits with the latest saved arrival while preserving the typed draft", async () => {
    const { element, root } = await setup();
    const arrival = root.querySelector<HTMLInputElement>("#episode-return-time")!;
    await input(element, arrival, "2026-10-06T18:30");
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, return_at: "2026-10-06T16:45:00Z" } }; await element.updateComplete;
    expect(arrival.value).toBe("18:30");
    await input(element, arrival, "2026-10-06T18:15");
    expect(root.querySelector(".arrival-unsaved")).not.toBeNull();
    await input(element, arrival, "2026-10-06T18:45");
    expect(root.querySelector(".arrival-unsaved")).toBeNull();
  });
  it("preserves the configuration guard when a terminal update clears a stale arrival", async () => {
    const { element, root } = await setup();
    const dirty = vi.fn(); element.addEventListener("velair-dirty-changed", dirty);
    await input(element, root.querySelector("#absence-delay")!, "13");
    await input(element, root.querySelector("#episode-return-time")!, "2026-10-06T18:30");
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "fulfilled" } }; await element.updateComplete;
    expect(root.querySelector(".arrival-unsaved")).toBeNull();
    expect((root.querySelector("#absence-delay") as HTMLInputElement).value).toBe("13");
    expect(dirty.mock.calls.at(-1)?.[0].detail.dirty).toBe(true);
  });
  it("warns before reloading only for an unapplied arrival and unregisters when disconnected", async () => {
    const { element, root } = await setup();
    const unload = () => { const event = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; };
    expect(unload()).toBe(false);
    await input(element, root.querySelector("#absence-delay")!, "12");
    expect(unload()).toBe(false);
    const arrival = root.querySelector<HTMLInputElement>("#episode-return-time")!;
    const original = arrival.value;
    await input(element, arrival, "2026-10-06T18:30");
    expect(unload()).toBe(true);
    await input(element, arrival, original);
    expect(unload()).toBe(false);
    await input(element, arrival, "2026-10-06T18:30");
    expect(unload()).toBe(true);
    element.remove(); expect(unload()).toBe(false);
  });
  it("clears the reload guard after an arrival is successfully applied", async () => {
    const { element, root, send } = await setup();
    await input(element, root.querySelector("#episode-return-time")!, "2026-10-06T18:30");
    send.mockResolvedValue({ ...initial(), planned_return_status: { ...initial().planned_return_status!, return_at: "2026-10-06T16:30:00Z" } });
    (root.querySelector(".change-arrival") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(root.querySelector(".arrival-unsaved")).toBeNull());
    const unload = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(false);
  });
  it("groups routine, live occupancy and return controls in three ordered blocks", async () => {
    const { root } = await setup();
    expect(Array.from(root.querySelector(".status-bar")!.children).map((node) => node.classList.contains("routine-status") ? "routine" : node.classList.contains("occupancy-panel") ? "occupancy" : "return")).toEqual(["routine", "occupancy", "return"]);
    expect(root.querySelector(".routine-header")?.textContent).not.toContain(en.plannedReturnRoutineDisabled);
    expect(root.querySelector(".episode-actions")?.closest(".quick-return-panel")).not.toBeNull();
    expect(root.querySelector(".runtime-sources")?.closest(".occupancy-panel")).not.toBeNull();
  });
  it("previews configured mode names and confirmation delay without claiming preparation is active", async () => {
    const { element, root, send } = await setup();
    element.t = (key, values) => String(en[key]).replace("{minutes}", String(values?.minutes));
    await input(element, root.querySelector("select[data-field=away_mode_id]")!, "mode-123", "change");
    await input(element, root.querySelector("#absence-delay")!, "25");
    expect(root.querySelector(".away-step strong")?.textContent).toBe("Away");
    expect(root.querySelector(".destination-step strong")?.textContent).toBe(en.modeDefault);
    expect(root.querySelector(".flow-delay")?.getAttribute("title")).toBe("Confirm absence after 25 minutes.");
    expect(root.querySelector(".preparation-step")?.textContent).toContain(en.plannedReturnAdaptiveSummary);
    expect(root.querySelector(".preparation-step")?.textContent).not.toContain(en.plannedReturnState_preparing);
    expect(send).not.toHaveBeenCalled();
  });
  it("keeps the runtime disclosure independent from configuration disclosure and preserves it during updates", async () => {
    const { element, root, send } = await setup();
    const toggle = root.querySelector<HTMLButtonElement>(".runtime-sources-toggle")!;
    const list = root.querySelector<HTMLElement>(".runtime-sources")!;
    expect(list.hidden).toBe(true); expect(toggle.getAttribute("aria-controls")).toBe(list.id);
    expect(toggle.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:chevron-down");
    toggle.click(); await element.updateComplete;
    expect(list.hidden).toBe(false); expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:chevron-up");
    expect((root.querySelector(".configured-sources") as HTMLElement).hidden).toBe(true);
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "preparing" } }; await element.updateComplete;
    expect(list.hidden).toBe(false); expect((root.querySelector("button[type=submit]") as HTMLButtonElement).disabled).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });
  it("groups the one-off arrival label, time and compact action before its explanation", async () => {
    const { element, root } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "disabled", can_start: true } }; await element.updateComplete;
    const row = root.querySelector(".manual-departure")!;
    expect(Array.from(row.children).map((child) => child.tagName)).toEqual(["DIV", "DIV", "BUTTON"]);
    expect(row.children[1].classList.contains("manual-departure-options")).toBe(true);
    expect(row.querySelector("label")?.getAttribute("for")).toBe(row.querySelector("input")?.id);
    expect(row.querySelector("button")?.classList.contains("compact")).toBe(true);
    expect(row.querySelector("button")?.textContent).toBe(en.plannedReturnLeaving);
    expect(row.nextElementSibling?.classList.contains("manual-departure-help")).toBe(true);
    expect(root.querySelector(".manual-departure-help")?.textContent).toBe(en.plannedReturnLeavingHelp);
    expect(root.querySelector(".quick-return-heading")?.textContent).toBe(en.plannedReturnControls);
  });
  it("plans a one-off return while already empty without an active absence episode", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-07T08:00:00Z"));
    const { element, root, send } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "disabled", occupancy: "away", can_start: true, return_at: null } }; await element.updateComplete;
    await input(element, root.querySelector("#manual-return-time")!, "18:30");
    (root.querySelector(".start-return") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ type: "velair/start_planned_return", return_at: "2026-10-07T16:30:00.000Z" }));
    expect(root.querySelectorAll("#manual-return-time")).toHaveLength(1);
  });
  it("uses backend runtime counters and distinguishes unknown signals from occupied signals", async () => {
    const { element, root } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, occupancy: "unknown", sources: [{ entity_id: "binary_sensor.household", state: "away" }, { entity_id: "zone.home", state: "home" }, { entity_id: "input_boolean.guests", state: "unknown" }] } }; await element.updateComplete;
    for (const state of ["away", "home", "unknown"]) {
      const badge = root.querySelector(`[data-runtime-count=${state}]`)!;
      expect(badge.textContent).toBe("1"); expect(badge.getAttribute("role")).toBe("img"); expect(badge.getAttribute("aria-label")).toBeTruthy();
    }
    await input(element, root.querySelector("#absence-delay")!, "15");
    expect(root.querySelector('[data-runtime-count="away"]')?.textContent).toBe("1");
  });
  it("retains a helpful return controls block when an episode cannot be started", async () => {
    const { element, root } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "disabled", can_start: false } }; await element.updateComplete;
    expect(root.querySelector(".quick-return-panel .quick-return-heading")?.textContent).toBe(en.plannedReturnControls);
    expect(root.querySelector(".quick-return-unavailable")?.textContent).toBe(en.plannedReturnQuickUnavailable);
    expect(root.querySelector<HTMLButtonElement>(".start-return")?.disabled).toBe(true);
  });
  it("renders operation errors once within return controls", async () => {
    const { element, root, send } = await setup();
    send.mockRejectedValue({ message: "Unable to save" });
    await input(element, root.querySelector("#absence-delay")!, "15");
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(root.querySelectorAll('[role="alert"]')).toHaveLength(1));
    expect(root.querySelector('[role="alert"]')?.closest(".quick-return-panel")).not.toBeNull();
  });
  it("edits the automatic routine from the status bar as a draft and cancels without saving", async () => {
    const { element, root, send } = await setup();
    const toggle = root.querySelector<HTMLElement & { checked: boolean }>("ha-switch.routine-toggle")!;
    expect(toggle.getAttribute("aria-label")).toBe(en.plannedReturnEnabled);
    expect(toggle.getAttribute("aria-describedby")).toBe("weekly-routine-help");
    expect(root.querySelector(".routine-status #weekly-routine-help")?.textContent).toBe(en.plannedReturnRoutineScopeHelp);
    expect(toggle.checked).toBe(false);
    toggle.checked = true; toggle.dispatchEvent(new Event("change")); await element.updateComplete;
    expect(root.querySelector(".routine-status")?.classList.contains("is-enabled")).toBe(true);
    expect(root.querySelector(".routine-header")?.textContent).not.toContain(en.plannedReturnRoutineEnabled);
    expect(element.data?.planned_return?.enabled).toBe(false);
    expect(send).not.toHaveBeenCalled();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "preparing" } }; await element.updateComplete;
    expect(toggle.checked).toBe(true);
    (root.querySelector(".footer-actions button") as HTMLButtonElement).click(); await element.updateComplete;
    expect(toggle.checked).toBe(false); expect(send).not.toHaveBeenCalled();
  });
  it("persists the status bar toggle through Save and blocks it while saving", async () => {
    const { element, root, send } = await setup(); let finish!: (data: ScheduleResponse) => void;
    send.mockImplementation(() => new Promise<ScheduleResponse>((resolve) => { finish = resolve; }));
    const toggle = root.querySelector<HTMLElement & { checked: boolean }>(".routine-toggle")!;
    toggle.checked = true; toggle.dispatchEvent(new Event("change")); await element.updateComplete;
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true })); await element.updateComplete;
    expect(send.mock.calls[0][0]).toMatchObject({ type: "velair/update_planned_return", planned_return: { enabled: true } });
    expect(toggle.hasAttribute("disabled")).toBe(true);
    toggle.checked = false; toggle.dispatchEvent(new Event("change")); await element.updateComplete;
    expect((element as unknown as { draft: { enabled: boolean } }).draft.enabled).toBe(true);
    finish({ ...initial(), planned_return: { ...initial().planned_return!, enabled: true } });
    await vi.waitFor(() => expect(toggle.hasAttribute("disabled")).toBe(false));
    expect(toggle.checked).toBe(true);
  });
  it("keeps routine configuration accessible when runtime status is unavailable", async () => {
    const { element, root } = await setup(); element.data = { ...initial(), planned_return_status: undefined }; await element.updateComplete;
    expect(root.querySelector(".routine-toggle")).not.toBeNull();
    expect(root.querySelector(".aggregate-occupancy strong")?.textContent).toBe(en.plannedReturnOccupancy_unknown);
    expect(root.querySelector(".episode-status")).toBeNull();
  });
  it("uses labelled semantic icon actions for source editing", async () => {
    const { root } = await setup();
    const add = root.querySelector(".add-source")!;
    expect(add.classList.contains("icon-button")).toBe(true); expect(add.classList.contains("success")).toBe(true);
    expect(add.getAttribute("title")).toBe(en.plannedReturnAddSource); expect(add.getAttribute("aria-label")).toBe(en.plannedReturnAddSource);
    expect(add.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:plus");
    const remove = root.querySelector(".remove-source")!;
    expect(remove.classList.contains("danger")).toBe(true); expect(remove.getAttribute("aria-label")).toBeTruthy();
    expect(remove.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:trash-can");
  });
  it("collapses configured sources by default and expands without changing the draft", async () => {
    const { element, root, send } = await setup();
    const dirty = vi.fn(); element.addEventListener("velair-dirty-changed", dirty);
    const toggle = root.querySelector<HTMLButtonElement>(".sources-toggle")!;
    const list = root.querySelector<HTMLElement>(".configured-sources")!;
    expect(list.hidden).toBe(true); expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBe(list.id);
    toggle.click(); await element.updateComplete;
    expect(list.hidden).toBe(false); expect(toggle.getAttribute("aria-expanded")).toBe("true");
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "preparing" } }; await element.updateComplete;
    expect(list.hidden).toBe(false);
    expect(dirty).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled();
    expect((root.querySelector("button[type=submit]") as HTMLButtonElement).disabled).toBe(true);
    toggle.click(); await element.updateComplete; expect(list.hidden).toBe(true);
  });
  it("counts saved backend states and newly added home-zone signals without classifying unknown as empty", async () => {
    const { element, root } = await setup();
    element.t = (key, values) => String(en[key]).replace("{count}", String(values?.count));
    element.hass = { ...element.hass!, states: { ...element.hass!.states, "binary_sensor.household": { state: "on" }, "zone.home": { state: "2" }, "input_boolean.guests": { state: "unavailable" } } };
    await element.updateComplete;
    // The backend's saved result is authoritative even if the HA snapshot differs.
    expect(root.querySelector('[data-count="away"]')?.textContent).toContain("1 empty");
    for (const id of ["zone.home", "input_boolean.guests"]) {
      await input(element, root.querySelector('select[data-field="occupancy_entity_ids"]')!, id, "change");
      (root.querySelector(".add-source") as HTMLButtonElement).click(); await element.updateComplete;
    }
    expect(root.querySelector(".sources-toggle")?.textContent).toContain("3 sources");
    expect(root.querySelector('[data-count="home"]')?.textContent).toContain("1 occupied");
    expect(root.querySelector('[data-count="away"]')?.textContent).toContain("1 empty");
    expect(root.querySelector('[data-count="unknown"]')?.textContent).toContain("1 unknown");
    for (const state of ["home", "away", "unknown"]) {
      const badge = root.querySelector(`[data-count="${state}"]`)!;
      expect(badge.getAttribute("title")).toBe(badge.querySelector(".source-count-label")?.textContent);
      expect(badge.querySelector(".source-count-value")?.textContent).toBe("1");
      expect(badge.querySelector(".source-count-value")?.getAttribute("aria-hidden")).toBe("true");
    }
    expect((root.querySelector(".configured-sources") as HTMLElement).hidden).toBe(true);
    element.hass = { ...element.hass!, states: { ...element.hass!.states, "zone.home": { state: "0" } } }; await element.updateComplete;
    expect(root.querySelector('[data-count="away"]')?.textContent).toContain("2 empty");
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, sources: [{ entity_id: "binary_sensor.household", state: "home" }] } }; await element.updateComplete;
    expect(root.querySelector('[data-count="home"]')?.textContent).toContain("1 occupied");
  });
  it.each(["-1", "1.5", "unavailable", "", "Infinity", "0x10", "0b10", "0o10"])("shows invalid home-zone count %s as unknown", async (value) => {
    const { element, root } = await setup();
    element.t = (key, values) => String(en[key]).replace("{count}", String(values?.count));
    element.hass = { ...element.hass!, states: { "zone.home": { state: value } } };
    element.data = { ...initial(), planned_return: { ...initial().planned_return!, occupancy_entity_ids: ["zone.home"] }, planned_return_status: { ...initial().planned_return_status!, sources: [] } }; await element.updateComplete;
    expect(root.querySelector('[data-count="unknown"]')?.textContent).toContain("1 unknown");
    expect(root.querySelector('[data-count="away"]')?.textContent).toContain("0 empty");
  });
  it.each(["2.0", "2e1", "+2", " 2 "])("accepts decimal home-zone count %s", async (value) => {
    const { element, root } = await setup();
    element.t = (key, values) => String(en[key]).replace("{count}", String(values?.count));
    element.hass = { ...element.hass!, states: { "zone.home": { state: value } } };
    element.data = { ...initial(), planned_return: { ...initial().planned_return!, occupancy_entity_ids: ["zone.home"] }, planned_return_status: { ...initial().planned_return_status!, sources: [] } }; await element.updateComplete;
    expect(root.querySelector('[data-count="home"]')?.textContent).toContain("1 occupied");
    expect(root.querySelector('[data-count="unknown"]')).toBeNull();
  });
  it("blocks source removal while saving and preserves the disclosure state", async () => {
    const { element, root, send } = await setup(); let finish!: (data: ScheduleResponse) => void;
    send.mockImplementation(() => new Promise<ScheduleResponse>((resolve) => { finish = resolve; }));
    (root.querySelector(".sources-toggle") as HTMLButtonElement).click(); await element.updateComplete;
    await input(element, root.querySelector("input[type=number]")!, "12");
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true })); await element.updateComplete;
    const remove = root.querySelector<HTMLButtonElement>(".remove-source")!;
    expect(remove.disabled).toBe(true); remove.click(); await element.updateComplete;
    expect(root.querySelectorAll(".configured-sources li")).toHaveLength(1);
    expect((root.querySelector(".configured-sources") as HTMLElement).hidden).toBe(false);
    finish(initial()); await vi.waitFor(() => expect(remove.disabled).toBe(false));
    remove.click(); await element.updateComplete;
    expect(root.querySelectorAll(".configured-sources li")).toHaveLength(0);
    expect(root.querySelector(".sources-toggle")?.getAttribute("aria-expanded")).toBe("true");
  });
  it("keeps an empty configured list summary visible", async () => {
    const { element, root } = await setup(); element.t = (key, values) => String(en[key]).replace("{count}", String(values?.count));
    element.data = { ...initial(), planned_return: plannedReturnDraft() }; await element.updateComplete;
    expect(root.querySelector(".sources-toggle")?.textContent).toContain("0 sources");
    expect(root.querySelectorAll(".configured-sources li")).toHaveLength(0);
  });
  it("keeps an unsaved draft separate from backend state and uses stable mode keys", async () => {
    const { element, root, send } = await setup();
    await input(element, root.querySelector("select[data-field=away_mode_id]")!, "mode-123", "change");
    expect(element.data?.planned_return?.away_mode_id).toBe("default");
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "preparing" } };
    await element.updateComplete;
    expect((root.querySelector("select[data-field=away_mode_id]") as HTMLSelectElement).value).toBe("mode-123");
    root.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(send).toHaveBeenCalled());
    expect(send.mock.calls[0][0]).toMatchObject({ type: "velair/update_planned_return", planned_return: { away_mode_id: "mode-123", enabled: false } });
  });
  it("edits and clears individual days, then persists blank as no scheduled return", async () => {
    const { element, root, send } = await setup();
    const monday = root.querySelector<HTMLInputElement>("[data-weekday=monday] input[type=time]")!;
    const wednesday = root.querySelector<HTMLInputElement>("[data-weekday=wednesday] input[type=time]")!;
    await input(element, monday, "18:00"); await input(element, wednesday, "19:15"); await input(element, monday, "");
    expect(send).not.toHaveBeenCalled(); expect(root.querySelectorAll(".day input[type=checkbox]")).toHaveLength(0);
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(send).toHaveBeenCalled());
    expect(send.mock.calls[0][0].planned_return.weekly).toMatchObject({ monday: null, wednesday: "19:15" });
  });
  it("filters unsupported entities, adds zone.home, and removes saved sources", async () => {
    const { element, root, send } = await setup();
    element.hass = { ...element.hass!, states: { ...element.hass!.states, "zone.home": { state: "2", attributes: { friendly_name: "Home" } }, "zone.work": { state: "0" } } }; await element.updateComplete;
    const occupancy = root.querySelector<HTMLSelectElement>("select[data-field=occupancy_entity_ids]")!;
    expect(Array.from(occupancy.options).map((option) => option.value)).toEqual(["", "zone.home"]);
    await input(element, occupancy, "zone.home", "change");
    (root.querySelector(".add-source") as HTMLButtonElement).click(); await element.updateComplete;
    expect(root.querySelectorAll(".configured-sources li")).toHaveLength(2);
    (root.querySelector('.configured-sources [data-source="binary_sensor.household"] button') as HTMLButtonElement).click(); await element.updateComplete;
    expect(root.querySelectorAll(".configured-sources li")).toHaveLength(1);
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(send).toHaveBeenCalled());
    expect(send.mock.calls[0][0].planned_return.occupancy_entity_ids).toEqual(["zone.home"]);
  });
  it.each(["sunday", "wednesday"])("orders weekdays from %s and retains individual times across reordering", async (first) => {
    const { element, root, send } = await setup();
    element.data = { ...initial(), settings: { ...initial().settings, first_weekday: first } }; await element.updateComplete;
    const dayRows = () => Array.from(root.querySelectorAll<HTMLElement>(".day"));
    expect(dayRows()[0].dataset.weekday).toBe(first);
    await input(element, dayRows()[0].querySelector<HTMLInputElement>("input[type=time]")!, "18:00");
    element.data = { ...element.data, settings: { ...element.data.settings, first_weekday: "monday" } }; await element.updateComplete;
    expect((root.querySelector(`[data-weekday=${first}] input[type=time]`) as HTMLInputElement).value).toBe("18:00");
    expect((root.querySelector("[data-weekday=monday] input[type=time]") as HTMLInputElement).value).toBe("");
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(send).toHaveBeenCalled());
    expect(send.mock.calls[0][0].planned_return.weekly[first]).toBe("18:00");
  });
  it("keeps missing entity and mode values visible until explicitly cleared", async () => {
    const { element, root } = await setup();
    element.data = { ...initial(), planned_return: { ...initial().planned_return!, enabled: true, occupancy_entity_ids: ["binary_sensor.removed"], away_mode_id: "removed-mode" } }; await element.updateComplete;
    expect(root.querySelector(".configured-sources")?.textContent).toContain("binary_sensor.removed");
    expect((root.querySelector("select[data-field=away_mode_id]") as HTMLSelectElement).value).toBe("removed-mode");
    expect((root.querySelector("button[type=submit]") as HTMLButtonElement).disabled).toBe(true);
  });
  it("disables form controls during persistence and keeps Cancel before Save", async () => {
    const { element, root, send } = await setup(); let finish!: (data: ScheduleResponse) => void;
    send.mockImplementation(() => new Promise<ScheduleResponse>((resolve) => { finish = resolve; }));
    await input(element, root.querySelector("input[type=number]")!, "12");
    expect(Array.from(root.querySelectorAll(".footer-actions button")).map((button) => button.textContent)).toEqual([en.cancel, en.save]);
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true })); await element.updateComplete;
    expect(Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("form input, form select, form button")).every((control) => control.disabled)).toBe(true);
    await input(element, root.querySelector("select[data-field=away_mode_id]")!, "mode-123", "change");
    expect((element as unknown as { draft: { away_mode_id: string } }).draft.away_mode_id).toBe("default");
    finish(initial()); await element.updateComplete;
    await vi.waitFor(() => expect((root.querySelector("select[data-field=away_mode_id]") as HTMLSelectElement).disabled).toBe(false));
    expect(root.querySelector(".footer-actions")?.closest("fieldset")).toBe(root.querySelector("form > fieldset"));
  });
  it.each([false, true])("keeps contextual help within cards and timezone only within weekly settings (enabled=%s)", async (enabled) => {
    const { element, root } = await setup();
    element.data = { ...initial(), planned_return: { ...initial().planned_return!, enabled } }; await element.updateComplete;
    expect(root.querySelectorAll(".settings-zone-order")).toHaveLength(2);
    expect(root.querySelectorAll("legend")).toHaveLength(0);
    for (const selector of [".presence-settings", ".weekly-settings"]) {
      expect(root.querySelector(selector + " .section-heading .section-label")?.textContent).toBeTruthy();
      expect(root.querySelector(selector + " .section-heading p")?.textContent).toBeTruthy();
      expect(root.querySelectorAll(selector + " .section-heading > ha-icon")).toHaveLength(1);
    }
    expect(root.querySelectorAll(".field-label ha-icon")).toHaveLength(0);
    expect(root.querySelectorAll(".select-wrap > ha-icon")).toHaveLength(3);
    expect(root.querySelectorAll(".timezone-help")).toHaveLength(1);
    expect(root.querySelector(".timezone-help")?.closest(".weekly-settings")).not.toBeNull();
    expect((root.textContent ?? "").split(en.plannedReturnTimezone).length - 1).toBe(1);
    expect(root.querySelectorAll(".day input")).toHaveLength(7);
    expect(root.querySelectorAll("input[type=checkbox]")).toHaveLength(0);
    expect(root.querySelectorAll(".status-bar .routine-toggle")).toHaveLength(1);
    expect(root.querySelector("select[data-field=away_mode_id]")?.closest(".presence-settings")).not.toBeNull();
    expect(root.querySelector("select[data-field=destination_mode_id]")?.closest(".presence-settings")).not.toBeNull();
    expect(root.querySelector(".setup-settings")).toBeNull();
  });
  it("changes delay units without marking configuration dirty or rounding saved minutes", async () => {
    const { element, root, send } = await setup();
    const unit = root.querySelector<HTMLSelectElement>(".delay-unit")!;
    const delay = root.querySelector<HTMLInputElement>("#absence-delay")!;
    expect(delay.value).toBe("10");
    await input(element, unit, "hours", "change");
    expect(delay.value).toBe("0.17");
    expect((root.querySelector("button[type=submit]") as HTMLButtonElement).disabled).toBe(true);
    await input(element, root.querySelector("select[data-field=away_mode_id]")!, "mode-123", "change");
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(send).toHaveBeenCalled());
    expect(send.mock.calls[0][0].planned_return.absence_delay_minutes).toBe(10);
    expect(send.mock.calls[0][0].planned_return).not.toHaveProperty("delay_unit");
  });
  it("converts edited hours to whole minutes and retains draft typing until cancel or backend refresh", async () => {
    const { element, root, send } = await setup();
    const unit = root.querySelector<HTMLSelectElement>(".delay-unit")!;
    await input(element, unit, "hours", "change");
    const delay = root.querySelector<HTMLInputElement>("#absence-delay")!;
    await input(element, delay, "1.25");
    expect(delay.value).toBe("1.25");
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "preparing" } }; await element.updateComplete;
    expect(delay.value).toBe("1.25");
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(send).toHaveBeenCalled());
    expect(send.mock.calls[0][0].planned_return.absence_delay_minutes).toBe(75);
    await vi.waitFor(() => expect(delay.value).toBe("0.17"));
    await input(element, delay, "2.5");
    (root.querySelector(".footer-actions button") as HTMLButtonElement).click(); await element.updateComplete;
    expect(delay.value).toBe("0.17");
    await input(element, unit, "minutes", "change"); expect(delay.value).toBe("10");
    element.data = { ...initial(), planned_return: { ...initial().planned_return!, absence_delay_minutes: 90 } }; await element.updateComplete;
    expect(delay.value).toBe("90");
    await input(element, unit, "hours", "change"); expect(delay.value).toBe("1.5");
  });
  it.each([["minutes", ""], ["minutes", "-1"], ["minutes", "1441"], ["minutes", "1.5"], ["hours", ""], ["hours", "-1"], ["hours", "24.01"]])("rejects invalid %s delay %s without saving", async (unit, value) => {
    const { element, root, send } = await setup();
    await input(element, root.querySelector(".delay-unit")!, unit, "change");
    await input(element, root.querySelector("#absence-delay")!, value);
    expect((root.querySelector("button[type=submit]") as HTMLButtonElement).disabled).toBe(true);
    expect(root.querySelector("#absence-delay")?.getAttribute("aria-invalid")).toBe("true");
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await element.updateComplete; expect(send).not.toHaveBeenCalled();
  });
  it("accepts zero delay and rounds an edited decimal hour to the nearest whole minute", async () => {
    const { element, root, send } = await setup();
    await input(element, root.querySelector("#absence-delay")!, "0");
    expect((root.querySelector("button[type=submit]") as HTMLButtonElement).disabled).toBe(false);
    await input(element, root.querySelector(".delay-unit")!, "hours", "change");
    await input(element, root.querySelector("#absence-delay")!, "0.18");
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(send).toHaveBeenCalled());
    expect(send.mock.calls[0][0].planned_return.absence_delay_minutes).toBe(11);
  });
  it("shows effective whole minutes in hours and normalizes decimal edits on blur", async () => {
    const { element, root } = await setup();
    element.t = (key, values) => String(en[key]).replace("{minutes}", String(values?.minutes)); await element.updateComplete;
    expect(root.querySelector(".effective-delay")).toBeNull();
    await input(element, root.querySelector(".delay-unit")!, "hours", "change");
    expect(root.querySelector(".effective-delay")?.textContent).toBe("Equivalent delay: 10 min.");
    const delay = root.querySelector<HTMLInputElement>("#absence-delay")!;
    await input(element, delay, "0.001");
    expect(root.querySelector(".effective-delay")?.textContent).toBe("Equivalent delay: 0 min.");
    delay.dispatchEvent(new Event("blur")); await element.updateComplete;
    expect(delay.value).toBe("0");
    await input(element, delay, ""); delay.dispatchEvent(new Event("blur")); await element.updateComplete;
    expect(delay.value).toBe(""); expect(root.querySelector(".effective-delay")).toBeNull();
  });
  it("accepts the maximum delay as 24 hours and persists 1440 minutes", async () => {
    const { element, root, send } = await setup();
    await input(element, root.querySelector(".delay-unit")!, "hours", "change");
    await input(element, root.querySelector("#absence-delay")!, "24");
    expect((root.querySelector("button[type=submit]") as HTMLButtonElement).disabled).toBe(false);
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(send).toHaveBeenCalled());
    expect(send.mock.calls[0][0].planned_return.absence_delay_minutes).toBe(1440);
  });
  it("preserves the browser's intermediate decimal buffer without rewriting its empty value", async () => {
    const { element, root, send } = await setup();
    await input(element, root.querySelector(".delay-unit")!, "hours", "change");
    const delay = root.querySelector<HTMLInputElement>("#absence-delay")!;
    await input(element, delay, "1");
    // Native number inputs expose an empty value while a partial decimal is being typed.
    delay.value = "";
    const writes = vi.spyOn(delay, "value", "set");
    delay.dispatchEvent(new Event("input", { bubbles: true })); await element.updateComplete;
    expect(writes).not.toHaveBeenCalled();
    expect((root.querySelector("button[type=submit]") as HTMLButtonElement).disabled).toBe(true);
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await element.updateComplete; expect(send).not.toHaveBeenCalled();
    writes.mockRestore();
    await input(element, delay, "1.5");
    expect(delay.value).toBe("1.5");
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(send).toHaveBeenCalled());
    expect(send.mock.calls[0][0].planned_return.absence_delay_minutes).toBe(90);
  });
  it("shows saved occupancy sources and allows a manual return with the weekly routine disabled", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-07T08:00:00Z"));
    const { element, root, send } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "disabled", occupancy: "home", can_start: true, sources: [{ entity_id: "binary_sensor.household", state: "home" }, { entity_id: "zone.home", state: "unknown" }] } }; await element.updateComplete;
    expect(root.querySelectorAll(".runtime-sources li")).toHaveLength(2);
    expect(root.querySelector(".aggregate-occupancy")?.textContent).toContain(en.plannedReturnOccupancy_home);
    expect(root.querySelector(".runtime-sources")?.textContent).toContain(en.plannedReturnOccupancy_unknown);
    expect(root.querySelector(".start-return")).not.toBeNull();
    await input(element, root.querySelector("#manual-return-time")!, "18:30");
    (root.querySelector(".start-return") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ type: "velair/start_planned_return", return_at: "2026-10-07T16:30:00.000Z" }));
    expect(send.mock.calls[0][0]).not.toHaveProperty("planned_return");
  });
  it.each(["armed", "confirming_absence"] as const)("lets a manual pending departure be changed or cancelled (%s)", async (state) => {
    const { element, root, send } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state, origin: "manual", return_at: "2026-10-07T16:00:00Z", can_start: true } }; await element.updateComplete;
    expect(root.textContent).toContain(en.plannedReturnManualOrigin);
    expect(root.querySelector(".cancel-return")).toBeNull();
    expect(root.textContent).not.toContain(en.plannedReturnSkip);
    await input(element, root.querySelector("#episode-return-time")!, "2026-10-07T18:30");
    (root.querySelector(".change-arrival") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ type: "velair/adjust_planned_return", return_at: "2026-10-07T16:30:00.000Z" }));
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state, origin: "manual", can_start: false } }; await element.updateComplete;
    await closeEditor(element); (root.querySelector(".cancel-return") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ type: "velair/cancel_planned_return" }));
  });
  it("blocks manual start for unsaved edits, busy operations, and backend terminal latches", async () => {
    const { element, root, send } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "idle", can_start: true } }; await element.updateComplete;
    await input(element, root.querySelector("input[type=number]")!, "12");
    expect((root.querySelector(".start-return") as HTMLButtonElement).disabled).toBe(true);
    expect(root.textContent).toContain(en.plannedReturnSaveFirst);
    (root.querySelector(".start-return") as HTMLButtonElement).click(); expect(send).not.toHaveBeenCalled();
    (root.querySelector(".footer-actions button") as HTMLButtonElement).click(); await element.updateComplete;
    expect((root.querySelector(".start-return") as HTMLButtonElement).disabled).toBe(false);
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "fulfilled", can_start: false } }; await element.updateComplete;
    expect(root.querySelector<HTMLButtonElement>(".start-return")?.disabled).toBe(true);
  });
  it("lets a cancelled return be explicitly replaced without displaying its obsolete arrival", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-07T08:00:00Z"));
    const { element, root, send } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "cancelled", origin: "manual", can_start: true, return_at: "2026-10-07T16:00:00Z", notice: "configuration_changed" } }; await element.updateComplete;
    const panel = root.querySelector(".quick-return-panel")!;
    expect(panel.querySelector(".episode-status")).toBeNull();
    expect(panel.textContent).toContain(en.plannedReturnLeavingHelp);
    expect(panel.textContent).not.toContain(en.plannedReturnArrival);
    expect(panel.querySelector("#episode-return-time")).toBeNull();
    expect(panel.querySelector(".cancel-return")).toBeNull();
    await input(element, panel.querySelector("#manual-return-time")!, "18:30");
    (panel.querySelector(".start-return") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ type: "velair/start_planned_return", return_at: "2026-10-07T16:30:00.000Z" }));
  });
  it.each(["cancelled", "error"] as const)("keeps a disabled fresh planning form for unavailable inactive %s", async (state) => {
    const { element, root, send } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state, episode_active: false, can_start: false, can_dismiss: true, notice: "configuration_changed" } }; await element.updateComplete;
    expect(root.querySelector(".dismiss-return,.episode-status,.episode-buttons")).toBeNull();
    expect(root.querySelector(".manual-departure")).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>(".start-return")!.disabled).toBe(true);
    expect(root.querySelector(".quick-return-unavailable")).not.toBeNull();
    expect(send).not.toHaveBeenCalled();
  });
  it("hides a persisted dismissed episode and explains unavailable planning", async () => {
    const { element, root } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "cancelled", can_start: false, can_dismiss: false, dismissed: true, notice: "configuration_changed" } }; await element.updateComplete;
    expect(root.querySelector(".episode-status")).toBeNull();
    expect(root.querySelector(".dismiss-return")).toBeNull();
    expect(root.querySelector(".configuration-notice")).toBeNull();
    expect(root.querySelector(".quick-return-unavailable")?.textContent).toBe(en.plannedReturnQuickUnavailable);
    element.data = { ...element.data!, planned_return_status: { ...element.data!.planned_return_status!, can_start: true } }; await element.updateComplete;
    expect(root.querySelector(".start-return")).not.toBeNull();
  });
  it("keeps manual start and its time input disabled while the backend operation is pending", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-07T08:00:00Z"));
    const { element, root, send } = await setup(); let finish!: (data: ScheduleResponse) => void;
    send.mockImplementation(() => new Promise<ScheduleResponse>((resolve) => { finish = resolve; }));
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "disabled", can_start: true } }; await element.updateComplete;
    const busy = vi.fn(); element.addEventListener("planned-return-busy", busy);
    await input(element, root.querySelector("#manual-return-time")!, "18:30");
    (root.querySelector(".start-return") as HTMLButtonElement).click(); await element.updateComplete;
    expect((root.querySelector(".start-return") as HTMLButtonElement).disabled).toBe(true);
    expect((root.querySelector("#manual-return-time") as HTMLInputElement).disabled).toBe(true);
    expect(busy.mock.calls.at(-1)?.[0].detail).toBe(true);
    finish(initial());
    await vi.waitFor(() => expect(busy.mock.calls.at(-1)?.[0].detail).toBe(false));
  });
  it("rejects a manual arrival in the past without starting an episode", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-07T08:00:00Z"));
    const { element, root, send } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "disabled", can_start: true } }; await element.updateComplete;
    await input(element, root.querySelector("#manual-return-time")!, "09:00");
    (root.querySelector(".start-return") as HTMLButtonElement).click(); await element.updateComplete;
    expect(send).not.toHaveBeenCalled(); expect(root.querySelector<HTMLButtonElement>(".start-return")!.disabled).toBe(true);
  });
  it.each(["armed", "away", "preparing"] as const)("keeps only one arrival editor for an active return (%s)", async (state) => {
    const { element, root } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state, origin: state === "armed" ? "manual" : "automatic", can_start: true } }; await element.updateComplete;
    expect(root.querySelector(".manual-departure")).toBeNull();
    expect(root.querySelectorAll("#episode-return-time")).toHaveLength(1);
  });
  it("replaces a configuration cancellation notice with a fresh planning form", async () => {
    const { element, root } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "idle", notice: "configuration_changed" } }; await element.updateComplete;
    expect(root.querySelectorAll(".configuration-notice")).toHaveLength(0);
    expect(root.querySelector(".manual-departure")).not.toBeNull();
    expect(root.textContent).not.toContain("configuration_changed");
  });
  it("reports structured backend errors and retains the edit", async () => {
    const { element, root, send } = await setup(); send.mockRejectedValue({ message: "External zones are unsupported" });
    await input(element, root.querySelector("input[type=number]")!, "12");
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(root.querySelector('[role=alert]')?.textContent).toBe("External zones are unsupported"));
    expect((root.querySelector("input[type=number]") as HTMLInputElement).value).toBe("12");
  });
  it("adjusts arrival across days in HA timezone and dispatches returned data", async () => {
    const { element, root, send } = await setup(false);
    element.data = { ...initial(), planned_return: { ...initial().planned_return!, enabled: true } }; await element.updateComplete;
    expect(root.querySelector(".routine-toggle")).toBeNull();
    expect((root.querySelector("#episode-return-date") as HTMLInputElement).value).toBe("2026-10-06");
    expect((root.querySelector("#episode-return-time") as HTMLInputElement).value).toBe("18:15");
    const listener = vi.fn(); element.addEventListener("planned-return-updated", listener);
    await input(element, root.querySelector("#episode-return-time")!, "2026-10-07T18:30");
    (root.querySelector(".change-arrival") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ type: "velair/adjust_planned_return", return_at: "2026-10-07T16:30:00.000Z" }));
    await vi.waitFor(() => expect(listener).toHaveBeenCalled());
  });
  it("preserves unsaved configuration while applying a runtime action on the combined page", async () => {
    const { element, root, send } = await setup();
    element.data = { ...initial(), planned_return: { ...initial().planned_return!, enabled: true } }; await element.updateComplete;
    await input(element, root.querySelector("input[type=number]")!, "13");
    const formBefore = root.querySelector("form");
    await closeEditor(element); (root.querySelector(".cancel-return") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ type: "velair/cancel_planned_return" })); await element.updateComplete;
    expect(root.querySelector("form")).toBe(formBefore);
    expect((root.querySelector("input[type=number]") as HTMLInputElement).value).toBe("13");
    expect((root.querySelector("button[type=submit]") as HTMLButtonElement).disabled).toBe(false);
  });
  it("changes the saved episode while retaining an independent unsaved configuration draft", async () => {
    const { element, root, send } = await setup();
    await input(element, root.querySelector("#absence-delay")!, "13");
    await input(element, root.querySelector("#episode-return-time")!, "2026-10-07T18:30");
    expect(root.querySelector<HTMLButtonElement>(".change-arrival")!.disabled).toBe(false);
    expect(root.querySelector(".cancel-return")).toBeNull();
    const dirty = vi.fn(); element.addEventListener("velair-dirty-changed", dirty);
    root.querySelector<HTMLButtonElement>(".change-arrival")!.click();
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ type: "velair/adjust_planned_return", return_at: "2026-10-07T16:30:00.000Z" }));
    await vi.waitFor(() => expect((root.querySelector<HTMLInputElement>("#absence-delay")!).value).toBe("13"));
    expect(root.querySelector<HTMLButtonElement>("button[type=submit]")!.disabled).toBe(false);
    expect(root.querySelector(".arrival-unsaved")).toBeNull();
    expect(dirty.mock.calls.at(-1)?.[0].detail.dirty).toBe(true);
  });
  it("does not offer cancellation for automatic confirmation without an underlying episode", async () => {
    const { element, root } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "confirming_absence", origin: "automatic", episode_active: false, can_cancel: false, can_start: true, absence_confirm_at: "2026-10-06T09:00:00Z" } }; await element.updateComplete;
    expect(root.querySelector(".cancel-return,.change-arrival,.episode-status")).toBeNull();
    expect(root.querySelector(".manual-departure")).not.toBeNull();
  });
  it("reports unsaved edits through the panel navigation guard event", async () => {
    const { element, root } = await setup(); const listener = vi.fn();
    element.addEventListener("velair-dirty-changed", listener);
    await input(element, root.querySelector("input[type=number]")!, "13");
    expect(listener.mock.calls.at(-1)?.[0].detail).toMatchObject({ dirty: true, scope: "planned-return" });
    (Array.from(root.querySelectorAll("button[type=button]")).at(-1) as HTMLButtonElement).click(); await element.updateComplete;
    expect(listener.mock.calls.at(-1)?.[0].detail).toMatchObject({ dirty: false });
  });
  it("offers fresh planning instead of actions on a skipped return", async () => {
    const { element, root, send } = await setup(false);
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "skipped", episode_active: false, can_start: true, return_at: null } }; await element.updateComplete;
    expect(root.querySelector(".change-arrival,.arrive-return,.skip-return,.dismiss-return")).toBeNull();
    expect(root.querySelector<HTMLButtonElement>(".start-return")!.disabled).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
  it("shows cooling range preparation and runtime unknown occupancy", async () => {
    const { element, root } = await setup(false);
    element.data = { ...initial(), planned_return: { ...initial().planned_return!, enabled: true }, planned_return_status: { ...initial().planned_return_status!, occupancy: "unknown", preparation: { context: "arrival", mode_id: "default", return_at: "2026-10-06T16:15:00Z", zones: [{ entity_id: "climate.room", profile_id: null, schedule_source: "default", preparation: "adaptive", state: "preparing", reason: null, start_at: "2026-10-06T15:00:00Z", target: { target_temp_low: 20, target_temp_high: 24 } }] }, zones: [] } }; element.t = (key, values) => String(en[key]).replace(/\{(\w+)\}/g, (_, name) => String(values?.[name] ?? `{${name}}`)); await element.updateComplete;
    expect(root.textContent).toContain("20–24 °C"); expect(root.textContent).toContain(en.plannedReturnUnknownHelp);
  });
  it("uses backend cancellation without changing weekly configuration", async () => {
    const { element, root, send } = await setup(false);
    element.data = { ...initial(), planned_return: { ...initial().planned_return!, enabled: true } }; await element.updateComplete;
    await closeEditor(element); (root.querySelector(".cancel-return") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ type: "velair/cancel_planned_return" }));
  });
});
describe("planned return room preparation", () => {
  const diagnostics = (): PlannedReturnPreparation => ({
    context: "configuration", mode_id: "mode-123", return_at: null,
    zones: [
      { entity_id: "climate.living", profile_id: "profile-a", schedule_source: "profile", preparation: "adaptive", state: "configured", reason: null, start_at: null },
      { entity_id: "climate.office", profile_id: "profile-a", schedule_source: "default", preparation: "arrival_only", state: "configured", reason: "preconditioning_disabled", start_at: null },
      { entity_id: "climate.guest", profile_id: "profile-a", schedule_source: "paused", preparation: "none", state: "unavailable", reason: "profile_paused", start_at: null },
    ],
  });
  async function preparationSetup(preparation = diagnostics(), spanish = false) {
    const context = await setup();
    const dictionary = spanish ? es : en;
    context.element.t = (key, values) => String(dictionary[key]).replace(/\{(\w+)\}/g, (_, name) => String(values?.[name] ?? `{${name}}`));
    context.element.hass = { ...context.element.hass!, language: spanish ? "es" : "en", states: { ...context.element.hass!.states, "climate.living": { state: "heat", attributes: { friendly_name: "A very long living room name for clear identification", icon: "mdi:sofa" } } } } as HomeAssistant;
    context.element.data = { ...initial(), profiles: [{ key: "profile-a", name: "Casa", zones: {} }], planned_return: { ...initial().planned_return!, destination_mode_id: "mode-123" }, planned_return_status: { ...initial().planned_return_status!, preparation } };
    await context.element.updateComplete;
    return context;
  }
  it("groups all managed rooms under the routine and stays collapsed without dirtying settings", async () => {
    const { element, root, send } = await preparationSetup();
    const dirty = vi.fn(); element.addEventListener("velair-dirty-changed", dirty);
    const toggle = root.querySelector<HTMLButtonElement>(".preparation-toggle")!;
    const list = root.querySelector<HTMLUListElement>(".preparation-rooms")!;
    expect(toggle.tagName).toBe("BUTTON"); expect(toggle.type).toBe("button");
    expect(toggle.getAttribute("aria-expanded")).toBe("false"); expect(toggle.getAttribute("aria-controls")).toBe(list.id); expect(list.hidden).toBe(true);
    expect(toggle.lastElementChild?.getAttribute("icon")).toBe("mdi:chevron-down");
    expect(toggle.closest(".routine-status")).not.toBeNull(); expect(list.querySelectorAll(".preparation-room")).toHaveLength(3);
    expect(root.querySelector('[data-preparation-count="adaptive"]')?.textContent).toContain("1 with advance preparation");
    expect(root.querySelector('[data-preparation-count="arrival_only"]')?.textContent).toContain("1 at arrival only");
    expect(root.querySelector('[data-preparation-count="none"]')?.textContent).toContain("1 without preparation");
    toggle.click(); await element.updateComplete;
    expect(list.hidden).toBe(false); expect(toggle.getAttribute("aria-expanded")).toBe("true"); expect(toggle.lastElementChild?.getAttribute("icon")).toBe("mdi:chevron-up");
    toggle.click(); await element.updateComplete; expect(list.hidden).toBe(true);
    expect(dirty).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled();
  });
  it("uses backend schedule sources, named profiles, HA room names/icons and readable reasons", async () => {
    const { root } = await preparationSetup();
    const living = root.querySelector('[data-entity="climate.living"]')!;
    expect(living.textContent).toContain("A very long living room name"); expect(living.textContent).toContain("Return schedule: Casa");
    expect(living.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:sofa");
    expect(root.querySelector('[data-entity="climate.office"]')?.textContent).toContain("Return schedule: Default");
    expect(root.querySelector('[data-entity="climate.office"]')?.textContent).toContain(en.plannedReturnPreparationReasonDisabled);
    expect(root.querySelector('[data-entity="climate.guest"]')?.textContent).toContain(en.plannedReturnPreparationSchedulePaused);
    expect(root.querySelector(".return-zones")).toBeNull();
  });
  it("does not promise estimates, target temperatures or times before a concrete arrival", async () => {
    const preparation = diagnostics(); preparation.zones[0] = { ...preparation.zones[0], start_at: "2026-10-06T15:00:00Z", target: { temperature: 21 } };
    const { root } = await preparationSetup(preparation);
    expect(root.querySelector(".preparation-detail")).toBeNull();
    expect(root.querySelector(".preparation-rooms")?.textContent).toContain(en.plannedReturnPreparationConfigurationHelp);
  });
  it.each([false, true])("renders live arrival states and heating/cooling targets with translated explanations (Spanish=%s)", async (spanish) => {
    const preparation = diagnostics(); preparation.context = "arrival"; preparation.return_at = "2026-10-06T16:15:00Z";
    preparation.zones[0] = { ...preparation.zones[0], state: "preparing", start_at: "2026-10-06T15:00:00Z", target: { temperature: 21, hvac_mode: "heat" } };
    preparation.zones[1] = { ...preparation.zones[1], preparation: "adaptive", state: "suspended", reason: "boost", target: { target_temp_low: 20, target_temp_high: 24, hvac_mode: "heat_cool" } };
    preparation.zones[2] = { ...preparation.zones[2], state: "reached", reason: null };
    const { root } = await preparationSetup(preparation, spanish);
    const dictionary = spanish ? es : en;
    expect(root.querySelector(".preparation-toggle strong")?.textContent).toBe(dictionary.plannedReturnRoomPreparation);
    expect(root.querySelector('[data-entity="climate.living"]')?.textContent).toContain(dictionary.plannedReturnPreparationState_preparing);
    expect(root.querySelector('[data-entity="climate.living"]')?.textContent).toContain("21 °C");
    expect(root.querySelector('[data-entity="climate.living"]')?.textContent).toContain(dictionary.plannedReturnPreparationPlannedStart.split(":")[0]);
    expect(root.querySelector('[data-entity="climate.office"]')?.textContent).toContain(dictionary.plannedReturnPreparationState_suspended);
    expect(root.querySelector('[data-entity="climate.office"]')?.textContent).toContain(dictionary.plannedReturnPreparationReasonBoost);
    expect(root.querySelector('[data-entity="climate.office"]')?.textContent).toContain("20–24 °C");
    expect(root.querySelector('[data-entity="climate.guest"]')?.textContent).toContain(dictionary.plannedReturnPreparationState_reached);
  });
  it("keeps saved diagnostics without an extra reminder when the return mode has an unsaved change", async () => {
    const { element, root } = await preparationSetup();
    const selector = root.querySelector<HTMLSelectElement>(".return-mode select")!;
    await input(element, selector, "default", "change");
    expect(root.querySelector(".preparation-saved-settings")).toBeNull();
    expect(root.querySelector('[data-entity="climate.living"]')?.textContent).toContain("Return schedule: Casa");
    expect(root.querySelector(".destination-step strong")?.textContent).toBe(en.modeDefault);
  });
  it("describes an arrival-only pending room without promising an early start", async () => {
    const preparation = diagnostics(); preparation.context = "arrival"; preparation.return_at = "2026-10-06T16:15:00Z";
    preparation.zones[1] = { ...preparation.zones[1], state: "pending", reason: "no_estimate", target: { temperature: 24, hvac_mode: "cool" } };
    const { root } = await preparationSetup(preparation);
    const office = root.querySelector('[data-entity="climate.office"]')!;
    expect(office.textContent).toContain(en.plannedReturnPreparationCategory_arrival_only);
    expect(office.textContent).not.toContain(en.plannedReturnPreparationState_pending);
    expect(office.textContent).toContain(en.plannedReturnPreparationReasonEstimate);
    expect(office.textContent).toContain("24 °C");
    expect(office.textContent).not.toContain("Planned start:");
  });
  it("shows a compatibility helper without guessing preparation from the legacy zone list", async () => {
    const { element, root } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, zones: [{ entity_id: "climate.legacy", preparing: true, temperature: 21, start_at: "2026-10-06T15:00:00Z", target_when: "2026-10-06T16:15:00Z" }] } }; await element.updateComplete;
    expect(root.querySelector(".room-preparation")?.textContent).toContain(en.plannedReturnPreparationUnavailable);
    expect(root.querySelector(".preparation-room")).toBeNull(); expect(root.querySelector(".return-zones")).toBeNull();
  });
});
describe("planned return wall clock and portability", () => {
  it("migrates legacy one-source drafts and clones the canonical source list", () => {
    const { occupancy_entity_ids, ...configuration } = plannedReturnDraft();
    expect(plannedReturnDraft({ ...configuration, occupancy_entity_id: "binary_sensor.legacy" }).occupancy_entity_ids).toEqual(["binary_sensor.legacy"]);
    expect(plannedReturnDraft({ ...configuration, occupancy_entity_id: null }).occupancy_entity_ids).toEqual([]);
    const canonical = { ...plannedReturnDraft(), occupancy_entity_ids: ["zone.home", "binary_sensor.household"] };
    const draft = plannedReturnDraft(canonical); draft.occupancy_entity_ids.pop();
    expect(canonical.occupancy_entity_ids).toHaveLength(2);
  });

  it("uses HA timezone irrespective of the browser and rejects DST gaps", () => {
    expect(returnWallTime("2026-10-06T16:15:00Z", "Europe/Madrid")).toBe("2026-10-06T18:15");
    expect(returnWallTimeToIso("2026-03-29T02:30", "Europe/Madrid")).toBeUndefined();
    expect(returnWallTimeToIso("2026-10-25T02:30", "Europe/Madrid")).toBe("2026-10-25T00:30:00.000Z");
    expect(returnWallTimeToIso("2026-10-06T18:15", "Asia/Kathmandu")).toBe("2026-10-06T12:30:00.000Z");
  });
  it("uses the earliest future occurrence of an ambiguous local time", () => {
    expect(returnWallTimeToIso("2026-10-25T02:30", "Europe/Madrid", Date.parse("2026-10-25T00:00Z"))).toBe("2026-10-25T00:30:00.000Z");
    expect(returnWallTimeToIso("2026-10-25T02:30", "Europe/Madrid", Date.parse("2026-10-25T00:45Z"))).toBe("2026-10-25T01:30:00.000Z");
    expect(returnWallTimeToIso("2026-10-25T02:30", "Europe/Madrid", Date.parse("2026-10-25T01:30Z"))).toBeUndefined();
  });
  it("rejects nonexistent dates and strictly elapsed instants", () => {
    expect(returnWallTimeToIso("2026-02-30T18:30", "Europe/Madrid")).toBeUndefined();
    expect(returnWallTimeToIso("2026-10-06T10:00", "Europe/Madrid", Date.parse("2026-10-06T08:00Z"))).toBeUndefined();
  });
  it("starts a future-day return with separately labeled fields and HA date minimum", async () => {
    vi.setSystemTime(new Date("2026-10-06T22:15Z"));
    const { element, root, send } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "disabled", can_start: true } }; await element.updateComplete;
    const date = root.querySelector<HTMLInputElement>("#manual-return-date")!;
    expect(date.value).toBe("2026-10-07"); expect(date.min).toBe("2026-10-07");
    expect(root.querySelector("label[for=manual-return-date]")?.textContent).toContain(en.plannedReturnDate);
    expect(root.querySelector("label[for=manual-return-time]")?.textContent).toContain(en.plannedReturnTime);
    await input(element, date, "2026-12-25");
    await input(element, root.querySelector("#manual-return-time")!, "15:00");
    (root.querySelector(".start-return") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ type: "velair/start_planned_return", return_at: "2026-12-25T14:00:00.000Z" }));
  });
  it("revalidates the date and time when a start form has remained open", async () => {
    const { element, root, send } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "disabled", can_start: true } }; await element.updateComplete;
    await input(element, root.querySelector("#manual-return-time")!, "15:00");
    vi.setSystemTime(new Date("2026-10-06T14:00Z"));
    (root.querySelector(".start-return") as HTMLButtonElement).click(); await element.updateComplete;
    expect(send).not.toHaveBeenCalled(); expect(root.querySelector("[role=alert]")?.textContent).toBe(en.plannedReturnInvalidTime);
    await input(element, root.querySelector("#manual-return-date")!, "2026-10-07");
    (root.querySelector(".start-return") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ type: "velair/start_planned_return", return_at: "2026-10-07T13:00:00.000Z" }));
  });
  it("guards date-only arrival drafts, retains them on failure and restores the clean baseline", async () => {
    const { element, root, send } = await setup();
    const dirty = vi.fn(); element.addEventListener("velair-dirty-changed", dirty);
    const date = root.querySelector<HTMLInputElement>("#episode-return-date")!;
    await input(element, date, "2026-10-08");
    expect(dirty.mock.calls.at(-1)?.[0].detail.dirty).toBe(true);
    const unload = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(unload); expect(unload.defaultPrevented).toBe(true);
    send.mockRejectedValueOnce({ message: "Adjustment failed" });
    (root.querySelector(".change-arrival") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(root.querySelector("[role=alert]")?.textContent).toBe("Adjustment failed"));
    expect(date.value).toBe("2026-10-08"); expect((root.querySelector("#episode-return-time") as HTMLInputElement).value).toBe("18:15");
    element.hass = { ...element.hass! }; await element.updateComplete;
    expect(date.value).toBe("2026-10-08");
    await input(element, date, "2026-10-06");
    expect(dirty.mock.calls.at(-1)?.[0].detail.dirty).toBe(false);
    expect(root.querySelector(".arrival-unsaved")).toBeNull();
  });
  it("rejects a past adjustment without sending it to the backend", async () => {
    const { element, root, send } = await setup();
    await input(element, root.querySelector("#episode-return-time")!, "09:00");
    (root.querySelector(".change-arrival") as HTMLButtonElement).click(); await element.updateComplete;
    expect(send).not.toHaveBeenCalled(); expect(root.querySelector("[role=alert]")?.textContent).toBe(en.plannedReturnInvalidTime);
  });
  it("rejects a DST gap in the start form", async () => {
    vi.setSystemTime(new Date("2026-03-28T12:00Z"));
    const { element, root, send } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "disabled", can_start: true } }; await element.updateComplete;
    await input(element, root.querySelector("#manual-return-date")!, "2026-03-29"); await input(element, root.querySelector("#manual-return-time")!, "02:30");
    (root.querySelector(".start-return") as HTMLButtonElement).click(); await element.updateComplete;
    expect(send).not.toHaveBeenCalled(); expect(root.querySelector<HTMLButtonElement>(".start-return")!.disabled).toBe(true);
  });
  it("replaces a completed arrival with a fresh date rather than its obsolete timestamp", async () => {
    const { element, root } = await setup();
    element.data = { ...initial(), planned_return_status: { ...initial().planned_return_status!, state: "fulfilled", return_at: "2026-12-25T18:15Z" } }; await element.updateComplete;
    const text = root.querySelector(".quick-return-panel")?.textContent ?? "";
    expect(text).not.toContain("Dec"); expect(root.querySelector<HTMLInputElement>("#manual-return-date")!.value).toBe("2026-10-06");
  });
  it("exports referenced mode/profile libraries and accepts portable v15", () => {
    expect(portableSectionsWithDependencies(["planned_return"], { planned_return: { away_mode_id: "custom", destination_mode_id: "default" } })).toEqual(new Set(["planned_return", "modes", "profiles"]));
    expect(validatePortablePayload({ format: "velair_portable_data", model_version: 15, sections: { planned_return: plannedReturnDraft() } })).toEqual({ ok: true, sections: ["planned_return"] });
  });
});
