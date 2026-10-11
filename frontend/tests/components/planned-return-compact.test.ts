// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlannedReturnElement } from "../../src/velair/components/planned-return-element";
import { es } from "../../src/velair/translations/es";
import { en } from "../../src/velair/translations/en";
import { plannedReturnDraft } from "../../src/velair/domain/planned-return";
import type { HomeAssistant, ScheduleResponse } from "../../src/velair/types";
const data = () => ({ planned_return: { ...plannedReturnDraft(), occupancy_entity_ids: ["binary_sensor.home", "zone.home"], absence_delay_minutes: 120 }, modes: [{ key: "away", name: "Away snapshot" }, { key: "home", name: "Return snapshot" }], planned_return_status: {
  state: "away", occupancy: "away", sources: [{ entity_id: "binary_sensor.home", state: "away" }, { entity_id: "zone.home", state: "unknown" }], origin: "manual", can_start: true,
  departure_at: "2026-10-10T08:00:00Z", return_at: "2026-10-10T10:00:00Z", away_mode_id: "away", destination_mode_id: "home", absence_confirm_at: null, zones: [], error: null,
} }) as unknown as ScheduleResponse;
async function setup(compact = true, edit = true) {
  const element = new PlannedReturnElement(); element.compact = compact; element.settings = !compact;
  element.hass = { config: { time_zone: "UTC" }, language: "en", connection: { sendMessagePromise: vi.fn() } } as unknown as HomeAssistant;
  element.t = (key, values) => String(en[key]).replace(/\{(\w+)\}/g, (_, name) => String(values?.[name] ?? `{${name}}`));
  element.data = data(); document.body.append(element); await element.updateComplete; if (edit) { element.shadowRoot!.querySelector<HTMLButtonElement>(".arrival-edit-trigger")?.click(); await element.updateComplete; } return element;
}
async function closeEditor(element: PlannedReturnElement) {
  element.shadowRoot!.querySelector<HTMLButtonElement>(".arrival-editor-close")?.click(); await element.updateComplete;
}
afterEach(() => { document.body.replaceChildren(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("compact return card", () => {
  it("omits only the embedded action title icon, preserving standalone and panel headings", async () => {
    const element = await setup(true, false);
    const titleIcon = () => element.shadowRoot!.querySelector('.return-title-group > ha-icon');
    expect(titleIcon()?.getAttribute('icon')).toBe('mdi:home-clock-outline');
    element.embedded = true; await element.updateComplete;
    expect(titleIcon()).toBeNull();
    expect(element.shadowRoot!.querySelector('.return-context-status ha-icon')).not.toBeNull();
    element.embedded = false; element.compact = false; await element.updateComplete;
    expect(titleIcon()?.getAttribute('icon')).toBe('mdi:home-clock-outline');
  });
  it.each([false, true])("uses saved zero-source settings for immediate manual return guidance, compact=%s", async (compact) => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
    const element = await setup(compact, false); const original = data();
    element.data = { ...original, planned_return: { ...original.planned_return!, occupancy_entity_ids: [], enabled: false }, planned_return_status: { ...original.planned_return_status!, state: "idle", sources: [], occupancy: "unknown", episode_active: false, can_start: true, return_at: null, departure_at: null } }; await element.updateComplete;
    const root = element.shadowRoot!;
    expect(root.querySelector(".manual-departure-help")?.textContent).toBe(en.plannedReturnLeavingWithoutSourcesHelp);
    expect(root.querySelector(".quick-return-heading .source-count,.compact-return-delay,.status-unknown-help")).toBeNull();
    if (!compact) expect(root.querySelector(".unmonitored-occupancy")?.textContent).toContain(en.plannedReturnOccupancyUnmonitored);
    expect(root.querySelector<HTMLButtonElement>(".start-return")!.disabled).toBe(false);
    const accepted = { ...element.data, planned_return_status: { ...element.data!.planned_return_status!, state: "away" as const, episode_active: true, return_at: "2026-10-10T10:00:00Z", departure_at: "2026-10-10T09:00:00Z" } };
    vi.mocked(element.hass!.connection.sendMessagePromise).mockResolvedValueOnce(accepted);
    root.querySelector<HTMLButtonElement>(".start-return")!.click(); await Promise.resolve(); await element.updateComplete;
    expect(element.hass!.connection.sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({ type: "velair/start_planned_return" }));
    expect(root.querySelector(".return-timeline")).not.toBeNull();
  });
  it("keeps configured unknown sources distinct from manual sensorless operation and ignores unsaved removal", async () => {
    const element = await setup(false, false); const original = data();
    element.data = { ...original, planned_return_status: { ...original.planned_return_status!, state: "idle", episode_active: false, occupancy: "unknown", sources: [], can_start: false } }; await element.updateComplete;
    const root = element.shadowRoot!;
    expect(root.querySelector(".manual-departure-help")?.textContent).toBe(en.plannedReturnLeavingHelp);
    expect(root.querySelector(".status-unknown-help")).not.toBeNull(); expect(root.querySelector(".unmonitored-occupancy")).toBeNull();
    expect(root.querySelector<HTMLButtonElement>(".start-return")!.disabled).toBe(true);
    while (root.querySelector(".remove-source")) { root.querySelector<HTMLButtonElement>(".remove-source")!.click(); await element.updateComplete; }
    expect(root.querySelector(".manual-departure-help")?.textContent).toBe(en.plannedReturnLeavingHelp);
    expect(root.querySelector(".unmonitored-occupancy")).toBeNull();
  });
  it.each(["fulfilled", "skipped", "cancelled", "error"] as const)("offers a fresh return after inactive %s while still outside", async (state) => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
    const element = await setup(); element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state, occupancy: "away", episode_active: false, can_start: true, can_cancel: true, return_at: "2026-10-09T10:00:00Z" } }; await element.updateComplete;
    const root = element.shadowRoot!;
    expect(root.querySelector(".episode-status,.skip-return,.arrive-return,.dismiss-return,.return-timeline")).toBeNull();
    expect(root.querySelector<HTMLInputElement>("#manual-return-date")!.value).toBe("2026-10-10");
    expect(root.querySelector<HTMLButtonElement>(".start-return")!.disabled).toBe(false);
    const accepted = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "armed" as const, episode_active: true, can_start: true, can_cancel: true } };
    vi.mocked(element.hass!.connection.sendMessagePromise).mockResolvedValueOnce(accepted);
    root.querySelector<HTMLButtonElement>(".start-return")!.click(); await Promise.resolve(); await element.updateComplete;
    expect(element.hass!.connection.sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({ type: "velair/start_planned_return" }));
    expect(root.querySelector(".cancel-return")).not.toBeNull();
  });
  it("cancels an active return despite blocked configuration and restores the fresh form", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
    const element = await setup(); element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, episode_active: true, can_cancel: true, can_start: false } }; await element.updateComplete;
    const root = element.shadowRoot!;
    expect(root.querySelector(".cancel-return")).toBeNull();
    expect(root.querySelector<HTMLButtonElement>(".change-arrival")!.disabled).toBe(true);
    expect(root.querySelectorAll(".episode-buttons button")).toHaveLength(2);
    expect(root.querySelector(".skip-return,.arrive-return,.dismiss-return")).toBeNull();
    vi.mocked(element.hass!.connection.sendMessagePromise).mockResolvedValueOnce({ ...data(), planned_return_status: { ...data().planned_return_status!, state: "idle", episode_active: false, can_cancel: false, can_start: false } });
    await closeEditor(element); root.querySelector<HTMLButtonElement>(".cancel-return")!.click(); await Promise.resolve(); await element.updateComplete;
    expect(element.hass!.connection.sendMessagePromise).toHaveBeenCalledWith({ type: "velair/cancel_planned_return" });
    expect(root.querySelector(".manual-departure")).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>(".start-return")!.disabled).toBe(true);
    expect(root.querySelector(".quick-return-unavailable")).not.toBeNull();
  });
  it("uses backend active authority for an errored episode and clears its guard after cancellation", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
    const element = await setup(); element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "error", error: "Unable to prepare", episode_active: true, can_cancel: true, can_start: true } }; await element.updateComplete;
    const root = element.shadowRoot!; const input = root.querySelector<HTMLInputElement>("#episode-return-time")!;
    input.value = "12:00"; input.dispatchEvent(new Event("input")); await element.updateComplete;
    expect(root.querySelector<HTMLButtonElement>(".change-arrival")!.disabled).toBe(false);
    expect(root.querySelector(".arrival-unsaved")).not.toBeNull(); expect(root.querySelector("[role=alert]")!.textContent).toContain("Unable to prepare");
    expect(root.querySelector(".manual-departure,.skip-return,.arrive-return,.dismiss-return")).toBeNull();
    vi.mocked(element.hass!.connection.sendMessagePromise).mockResolvedValueOnce({ ...data(), planned_return_status: { ...data().planned_return_status!, state: "idle", episode_active: false, can_cancel: false, can_start: true } });
    await closeEditor(element); root.querySelector<HTMLButtonElement>(".cancel-return")!.click(); await Promise.resolve(); await element.updateComplete;
    expect(root.querySelector(".arrival-unsaved,.episode-buttons")).toBeNull(); expect(root.querySelector(".manual-departure")).not.toBeNull();
  });
  it.each([false, true])("uses identical active and terminal actions with compact=%s", async (compact) => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
    const element = await setup(compact); const root = element.shadowRoot!;
    for (const state of ["armed", "confirming_absence", "away", "preparing", "error"] as const) {
      element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state, episode_active: true, can_cancel: true, can_start: false } }; await element.updateComplete;
      const panel = root.querySelector(".quick-return-panel")!;
      expect(panel.querySelectorAll(".episode-buttons button")).toHaveLength(2);
      expect(panel.querySelector(".cancel-return")).toBeNull();
      expect(panel.querySelector<HTMLButtonElement>(".change-arrival")!.disabled).toBe(true);
      expect(panel.querySelector(".skip-return,.arrive-return,.dismiss-return,.manual-departure")).toBeNull();
      expect(Boolean(panel.querySelector(".compact-return-indicators"))).toBe(compact);
      expect(Boolean(panel.querySelector(".return-timeline"))).toBe(["away", "preparing"].includes(state));
    }
    for (const state of ["fulfilled", "skipped", "cancelled", "error"] as const) {
      element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state, episode_active: false, can_start: true, occupancy: "away" } }; await element.updateComplete;
      const panel = root.querySelector(".quick-return-panel")!;
      expect(panel.querySelector(".manual-departure")).not.toBeNull();
      expect(panel.querySelector<HTMLButtonElement>(".start-return")!.disabled).toBe(false);
      expect(panel.querySelector(".episode-status,.episode-buttons,.return-timeline,.dismiss-return")).toBeNull();
    }
    expect(Boolean(root.querySelector(".routine-status"))).toBe(!compact);
    expect(Boolean(root.querySelector(".occupancy-panel"))).toBe(!compact);
  });
  it.each([false, true])("starts with a clickable saved arrival and reveals a persistent inline draft, compact=%s", async (compact) => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
    const element = await setup(compact, false); const root = element.shadowRoot!;
    expect(root.querySelector(".arrival-editor,.change-arrival,.episode-status")).toBeNull();
    expect(root.querySelector(".return-context-status")).not.toBeNull();
    const trigger = root.querySelector<HTMLButtonElement>(".arrival-edit-trigger")!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.click(); await element.updateComplete;
    expect(root.activeElement?.id).toBe("episode-return-date");
    const input = root.querySelector<HTMLInputElement>("#episode-return-time")!;
    input.value = "12:00"; input.dispatchEvent(new Event("input")); await element.updateComplete;
    element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "preparing" } }; await element.updateComplete;
    expect(input.value).toBe("12:00"); expect(root.querySelector(".arrival-unsaved")).not.toBeNull();
    vi.mocked(element.hass!.connection.sendMessagePromise).mockRejectedValueOnce(new Error("Try again"));
    root.querySelector<HTMLButtonElement>(".change-arrival")!.click(); await Promise.resolve(); await element.updateComplete;
    expect(root.querySelector(".arrival-editor")).not.toBeNull(); expect(root.querySelector("[role=alert]")!.textContent).toBe("Try again");
    vi.mocked(element.hass!.connection.sendMessagePromise).mockResolvedValueOnce({ ...data(), planned_return_status: { ...data().planned_return_status!, return_at: "2026-10-10T12:00:00Z" } });
    root.querySelector<HTMLButtonElement>(".change-arrival")!.click(); await Promise.resolve(); await element.updateComplete;
    expect(root.querySelector(".arrival-editor,.change-arrival,.arrival-unsaved")).toBeNull();
    expect(root.querySelector(".arrival-edit-trigger")?.textContent).toContain("12:00");
    expect(root.activeElement?.classList.contains("arrival-edit-trigger")).toBe(true);
  });
  it("uses a standalone arrival edit control while waiting, including an episode without arrival", async () => {
    const element = await setup(true, false); element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "armed", return_at: null, episode_active: true } }; await element.updateComplete;
    const root = element.shadowRoot!;
    expect(root.querySelector(".return-timeline")).toBeNull(); expect(root.querySelector(".saved-return-arrival .arrival-edit-trigger")).not.toBeNull();
    root.querySelector<HTMLButtonElement>(".arrival-edit-trigger")!.click(); await element.updateComplete;
    expect(root.querySelector(".arrival-editor")).not.toBeNull();
  });
  it("renders backend advisory preparation separately from Now and saved arrival", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
    const element = await setup(true, false); const original = data();
    element.data = { ...original, planned_return_status: { ...original.planned_return_status!, preparation: { context: "arrival", mode_id: "home", return_at: original.planned_return_status!.return_at, zones: [{ entity_id: "climate.a", profile_id: null, schedule_source: "default", preparation: "adaptive", state: "pending", reason: null, start_at: "2026-10-10T08:30:00Z" }] } } }; await element.updateComplete;
    const root = element.shadowRoot!;
    expect(root.querySelector<HTMLElement>(".preparation-marker")!.style.left).toBe("25%");
    expect(root.querySelector(".preparation-estimate")?.textContent).toContain("08:30");
    expect(root.querySelector("#return-preparation-help-trigger,.return-timeline-now-row")).toBeNull();
    expect(root.querySelector(".return-timeline-now-label")).toBeNull();
    expect(root.querySelector(".return-timeline-marker")?.getAttribute("title")).toBe(en.plannedReturnTimelineNow);
    expect(root.querySelector(".return-timeline-marker")?.closest("[role=progressbar]")).toBeNull();
    expect(root.querySelectorAll(".arrival-edit-trigger")).toHaveLength(1);
    root.querySelector<HTMLButtonElement>(".arrival-edit-trigger")!.click(); await element.updateComplete;
    const input = root.querySelector<HTMLInputElement>("#episode-return-time")!; input.value = "12:00"; input.dispatchEvent(new Event("input")); await element.updateComplete;
    expect(root.querySelector<HTMLElement>(".preparation-marker")!.style.left).toBe("25%");
    element.data = { ...element.data!, planned_return_status: { ...element.data!.planned_return_status!, preparation: { ...element.data!.planned_return_status!.preparation!, return_at: "2026-10-10T12:00:00Z" } } }; await element.updateComplete;
    expect(root.querySelector(".preparation-marker,.preparation-estimate")).toBeNull();
  });
  it.each([false, true])("discloses eligible saved room estimates independently and resets on arrival changes, compact=%s", async (compact) => {
    const element = await setup(compact, false); const original = data();
    const zone = { entity_id: "climate.a", profile_id: null, schedule_source: "default" as const, preparation: "adaptive" as const, state: "pending" as const, reason: null, start_at: "2026-10-10T08:30:00Z" };
    const preview = { context: "arrival" as const, mode_id: "home", return_at: original.planned_return_status!.return_at, zones: [{ ...zone, entity_id: "climate.later", start_at: "2026-10-10T09:00:00Z" }, zone, { ...zone, entity_id: "climate.paused", state: "suspended" as const }] };
    element.hass = { ...element.hass!, locale: { ...element.hass!.locale, time_format: "24" }, states: { ...element.hass!.states, "climate.a": { state: "heat", attributes: { friendly_name: "Living room", icon: "mdi:sofa" } } as never } };
    element.data = { ...original, planned_return_status: { ...original.planned_return_status!, preparation: preview } }; await element.updateComplete;
    const root = element.shadowRoot!; const toggle = root.querySelector<HTMLButtonElement>(".preparation-estimate-toggle")!;
    const list = root.querySelector<HTMLElement>("#preparation-estimate-rooms")!;
    expect(toggle.getAttribute("aria-expanded")).toBe("false"); expect(toggle.getAttribute("aria-controls")).toBe(list.id); expect(list.hidden).toBe(true);
    expect(Array.from(list.querySelectorAll("li")).map((row) => row.getAttribute("data-entity-id"))).toEqual(["climate.a", "climate.later"]);
    expect(list.querySelector(".preparation-estimate-room")?.textContent).toContain("Living room");
    expect(list.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:sofa"); expect(list.querySelector("time")?.textContent).toBe("08:30");
    toggle.click(); await element.updateComplete; expect(list.hidden).toBe(false); expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(root.querySelector(".preparation-toggle")?.getAttribute("aria-expanded") ?? "false").toBe("false");
    element.data = { ...element.data! }; await element.updateComplete; expect(list.hidden).toBe(false);
    const return_at = "2026-10-10T11:00:00Z";
    element.data = { ...element.data!, planned_return_status: { ...element.data!.planned_return_status!, return_at, preparation: { ...preview, return_at } } }; await element.updateComplete;
    expect(list.hidden).toBe(true);
    root.querySelector<HTMLButtonElement>(".preparation-estimate-toggle")!.click(); await element.updateComplete;
    element.data = { ...element.data!, planned_return_status: { ...element.data!.planned_return_status!, preparation: { ...preview, return_at, zones: [{ ...zone, state: "reached" }] } } }; await element.updateComplete;
    expect(root.querySelector(".preparation-estimate")).toBeNull(); expect(root.querySelector("#return-preparation-help-trigger")).not.toBeNull();
    expect(element.hass!.connection.sendMessagePromise).not.toHaveBeenCalled();
  });
  it.each([false, true])("hides preparation information while editing and restores its same-episode disclosure on Back, compact=%s", async (compact) => {
    const element = await setup(compact, false); const original = data();
    const zone = { entity_id: "climate.a", profile_id: null, schedule_source: "default" as const, preparation: "adaptive" as const, state: "pending" as const, reason: null, start_at: "2026-10-10T08:30:00Z" };
    element.data = { ...original, planned_return_status: { ...original.planned_return_status!, preparation: { context: "arrival", mode_id: "home", return_at: original.planned_return_status!.return_at, zones: [zone] } } }; await element.updateComplete;
    const root = element.shadowRoot!; root.querySelector<HTMLButtonElement>(".preparation-estimate-toggle")!.click(); await element.updateComplete;
    root.querySelector<HTMLButtonElement>(".arrival-edit-trigger")!.click(); await element.updateComplete;
    expect(root.querySelector(".preparation-estimate,.return-timeline-now-row,#return-preparation-help-trigger,.cancel-return")).toBeNull();
    expect(root.querySelector(".preparation-marker")).not.toBeNull();
    root.querySelector<HTMLButtonElement>(".arrival-editor-close")!.click(); await element.updateComplete;
    expect(root.querySelector(".preparation-estimate-toggle")?.getAttribute("aria-expanded")).toBe("true");
    expect(root.querySelector(".cancel-return")).not.toBeNull();
    element.data = { ...original }; await element.updateComplete;
    const help = root.querySelector<HTMLButtonElement>("#return-preparation-help-trigger")!;
    help.dispatchEvent(new FocusEvent("focus")); expect(help.getAttribute("aria-expanded")).toBe("true");
    root.querySelector<HTMLButtonElement>(".arrival-edit-trigger")!.click(); await element.updateComplete;
    expect(help.getAttribute("aria-expanded")).toBe("false");
    expect(root.querySelector("#return-preparation-help-trigger,.return-timeline-now-row")).toBeNull();
    root.querySelector<HTMLButtonElement>(".arrival-editor-close")!.click(); await element.updateComplete;
    expect(root.querySelector("#return-preparation-help-trigger")).not.toBeNull();
    expect(element.hass!.connection.sendMessagePromise).not.toHaveBeenCalled();
  });
  it.each([false, true])("keeps arrival labels outside the value-only edit target and cancellation in the header, compact=%s", async (compact) => {
    const element = await setup(compact, false); const root = element.shadowRoot!;
    const endpoint = root.querySelector(".return-timeline-endpoints > div:last-child")!;
    const trigger = endpoint.querySelector<HTMLButtonElement>(".arrival-edit-trigger")!;
    expect(endpoint.querySelector(".endpoint-label")).toBeNull();
    expect(root.querySelector(".arrival-icon")?.getAttribute("aria-label")).toBe(en.plannedReturnArrival);
    expect(trigger.textContent).not.toContain(en.plannedReturnArrival);
    expect(trigger.firstElementChild?.getAttribute("icon")).toBe("mdi:pencil-outline");
    expect(trigger.lastElementChild?.classList.contains("arrival-trigger-value")).toBe(true);
    expect(trigger.getAttribute("aria-label")).toContain(en.plannedReturnEditArrival);
    expect(trigger.getAttribute("aria-label")).toContain("2026");
    expect(root.querySelector(".return-title-copy .return-context-status")).not.toBeNull();
    expect(root.querySelector(".return-header-details .return-context-status")).toBeNull();
    const cancel = root.querySelector<HTMLButtonElement>(".cancel-return")!;
    expect(cancel.getAttribute("aria-label")).toBe(en.plannedReturnCancelAction);
    expect(cancel.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:close");
    expect(root.querySelector(".return-cancel-footer")?.contains(cancel)).toBe(true);
    expect(root.querySelector(".episode-buttons .cancel-return")).toBeNull();
    element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "armed" } }; await element.updateComplete;
    expect(root.querySelector(".saved-return-arrival .arrival-icon")?.getAttribute("aria-label")).toBe(en.plannedReturnArrival);
    expect(root.querySelector(".saved-return-arrival .arrival-label")?.textContent).toBe(en.plannedReturnArrival);
    expect(root.querySelector(".saved-return-arrival .arrival-label")?.closest("button")).toBeNull();
    expect(root.querySelector(".saved-return-arrival .arrival-edit-trigger")?.textContent).not.toContain(en.plannedReturnArrival);
  });
  it.each(["en", "es"] as const)("explains every active phase with a localized native tooltip in %s", async (language) => {
    const element = await setup(true, false); const dictionary = language === "es" ? es : en;
    element.t = (key, values) => String(dictionary[key]).replace(/\{(\w+)\}/g, (_, name) => String(values?.[name] ?? `{${name}}`));
    for (const state of ["armed", "confirming_absence", "away", "preparing", "error"] as const) {
      element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state, episode_active: true } }; await element.updateComplete;
      const chip = element.shadowRoot!.querySelector(state === "confirming_absence" ? ".absence-confirmation" : ".return-title-copy .return-context-status")!;
      expect(chip.getAttribute("title")).toBe(dictionary[`plannedReturnStateHelp_${state}`]);
      expect(chip.getAttribute("title")!.length).toBeGreaterThan(15);
    }
  });
  it("shows snapshot modes and authoritative saved times while an arrival draft changes", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
    const element = await setup(); const root = element.shadowRoot!;
    expect(root.querySelector(".routine-status,.occupancy-panel,h3")).toBeNull();
    expect(root.querySelector(".compact-return-delay")).toBeNull();
    expect(root.querySelectorAll("[data-runtime-count]")).toHaveLength(3);
    expect(root.querySelector(".return-timeline")?.textContent).toContain("Away snapshot");
    expect(root.querySelector(".return-timeline")?.textContent).toContain("Return snapshot");
    expect(root.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow")).toBe("50");
    const input = root.querySelector<HTMLInputElement>("#episode-return-time")!;
    input.value = "12:00"; input.dispatchEvent(new Event("input")); await element.updateComplete;
    expect(root.querySelector(".return-timeline")?.textContent).toContain("10:00");
    expect(root.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow")).toBe("50");
    element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, return_at: "2026-10-10T12:00:00Z" } }; await element.updateComplete;
    expect(root.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow")).toBe("25");
  });
  it("keeps separate card drafts and clocks independent while sharing accepted episode data", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
    const first = await setup(); const second = await setup();
    const input = first.shadowRoot!.querySelector<HTMLInputElement>("#episode-return-time")!;
    input.value = "12:00"; input.dispatchEvent(new Event("input")); await first.updateComplete;
    expect(second.shadowRoot!.querySelector<HTMLInputElement>("#episode-return-time")!.value).toBe("10:00");
    const shared = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "preparing" as const } };
    first.data = shared; second.data = shared; await first.updateComplete; await second.updateComplete;
    expect(input.value).toBe("12:00");
    expect(first.shadowRoot!.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow")).toBe("50");
    expect(second.shadowRoot!.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow")).toBe("50");
    first.remove(); expect(vi.getTimerCount()).toBe(1);
    second.remove(); expect(vi.getTimerCount()).toBe(0);
  });
  it.each([false, true])("ticks only visible connected active surfaces, resumes immediately and cleans up, compact=%s", async (compact) => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const element = await setup(compact); expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(60_000); await element.updateComplete;
    expect(element.shadowRoot!.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow")).toBe("51");
    visibility.mockReturnValue("hidden"); document.dispatchEvent(new Event("visibilitychange")); expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(new Date("2026-10-10T09:30:00Z")); visibility.mockReturnValue("visible"); document.dispatchEvent(new Event("visibilitychange")); await element.updateComplete;
    expect(element.shadowRoot!.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow")).toBe("75");
    expect(element.hass!.connection.sendMessagePromise).not.toHaveBeenCalled();
    element.remove(); expect(vi.getTimerCount()).toBe(0);
    document.body.append(element); await element.updateComplete; expect(vi.getTimerCount()).toBe(1);
    element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "fulfilled" } }; await element.updateComplete;
    expect(vi.getTimerCount()).toBe(0); expect(element.shadowRoot!.querySelector(".return-timeline")).toBeNull();
  });
  it("does not postpone the clock when drafts are edited frequently", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
    const element = await setup(); const input = element.shadowRoot!.querySelector<HTMLInputElement>("#episode-return-time")!;
    for (const value of ["11:00", "12:00", "13:00"]) {
      vi.advanceTimersByTime(20_000); input.value = value; input.dispatchEvent(new Event("input")); await element.updateComplete;
    }
    expect(element.shadowRoot!.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow")).toBe("51");
    expect(vi.getTimerCount()).toBe(1);
  });
  it.each([false, true])("discards a local arrival edit and clears its navigation guard, compact=%s", async (compact) => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
    const element = await setup(compact, false); const root = element.shadowRoot!;
    const dirtyEvents: CustomEvent[] = []; element.addEventListener("velair-dirty-changed", (event) => dirtyEvents.push(event as CustomEvent));
    expect(root.querySelector(".arrival-editor-close")).toBeNull();
    root.querySelector<HTMLButtonElement>(".arrival-edit-trigger")!.click(); await element.updateComplete;
    const close = root.querySelector<HTMLButtonElement>(".arrival-editor-close")!;
    expect(close.getAttribute("aria-label")).toBe(en.plannedReturnCloseEditor);
    expect(close.closest(".episode-buttons")?.firstElementChild).toBe(close);
    expect(close.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:arrow-left");
    expect(close.textContent).toContain(en.plannedReturnEditorBack);
    expect(root.querySelector(".arrival-value-controls .arrival-editor-close")).toBeNull();
    const input = root.querySelector<HTMLInputElement>("#episode-return-time")!;
    input.value = "12:00"; input.dispatchEvent(new Event("input")); await element.updateComplete;
    close.click(); await element.updateComplete; await Promise.resolve();
    expect(root.querySelector(".arrival-editor,.arrival-editor-close,.change-arrival")).toBeNull();
    expect(root.querySelector(".arrival-unsaved")).toBeNull();
    expect(root.activeElement).toBe(root.querySelector(".arrival-edit-trigger"));
    expect(dirtyEvents.at(-1)?.detail.dirty).toBe(false);
    const unload = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(unload); expect(unload.defaultPrevented).toBe(false);
    element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "preparing" } }; await element.updateComplete;
    root.querySelector<HTMLButtonElement>(".arrival-edit-trigger")!.click(); await element.updateComplete;
    expect(root.querySelector<HTMLInputElement>("#episode-return-time")!.value).toBe("10:00");
    expect(root.querySelector<HTMLButtonElement>(".change-arrival")!.disabled).toBe(true);
    expect(element.hass!.connection.sendMessagePromise).not.toHaveBeenCalled();
    expect(root.querySelector<HTMLElement>(".return-timeline-elapsed")!.style.width).toBe("50%");
  });
  it("Back discards a failed adjustment and restores the latest saved arrival after a push", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
    const element = await setup(); const root = element.shadowRoot!;
    const input = root.querySelector<HTMLInputElement>("#episode-return-time")!;
    input.value = "12:00"; input.dispatchEvent(new Event("input")); await element.updateComplete;
    vi.mocked(element.hass!.connection.sendMessagePromise).mockRejectedValueOnce(new Error("Adjustment failed"));
    root.querySelector<HTMLButtonElement>(".change-arrival")!.click(); await Promise.resolve(); await element.updateComplete;
    expect(root.querySelector("[role=alert]")?.textContent).toBe("Adjustment failed");
    element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, return_at: "2026-10-10T11:00:00Z" } }; await element.updateComplete;
    root.querySelector<HTMLButtonElement>(".arrival-editor-close")!.click(); await element.updateComplete;
    expect(root.querySelector(".arrival-unsaved,[role=alert]")).toBeNull();
    expect(element.hass!.connection.sendMessagePromise).toHaveBeenCalledTimes(1);
    root.querySelector<HTMLButtonElement>(".arrival-edit-trigger")!.click(); await element.updateComplete;
    expect(root.querySelector<HTMLInputElement>("#episode-return-time")!.value).toBe("11:00");
    expect(root.querySelector<HTMLButtonElement>(".change-arrival")!.disabled).toBe(true);
  });
  it("waits for the editor and close control exit together, and respects reduced motion", async () => {
    const element = await setup(); const root = element.shadowRoot!;
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    let finish!: () => void; const finished = new Promise<void>((resolve) => { finish = resolve; });
    const editor = root.querySelector<HTMLElement>(".arrival-editor")!;
    const close = root.querySelector<HTMLButtonElement>(".arrival-editor-close")!;
    const animate = vi.fn(() => ({ finished }));
    Object.defineProperty(editor, "animate", { value: animate, configurable: true });
    Object.defineProperty(close, "animate", { value: animate, configurable: true });
    close.click(); expect(animate).toHaveBeenCalledTimes(2); expect(root.querySelector(".arrival-editor-close")).not.toBeNull();
    element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, return_at: "2026-10-10T11:00:00Z" } }; await element.updateComplete;
    finish(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await element.updateComplete;
    expect(root.querySelector(".arrival-editor-close,.arrival-editor")).toBeNull();
    root.querySelector<HTMLButtonElement>(".arrival-edit-trigger")!.click(); await element.updateComplete;
    expect(root.querySelector<HTMLInputElement>("#episode-return-time")!.value).toBe("11:00");
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const reducedAnimate = vi.fn(); Object.defineProperty(root.querySelector(".arrival-editor")!, "animate", { value: reducedAnimate });
    root.querySelector<HTMLButtonElement>(".arrival-editor-close")!.click(); await element.updateComplete;
    expect(reducedAnimate).not.toHaveBeenCalled(); expect(root.querySelector(".arrival-editor-close,.arrival-editor")).toBeNull();
    vi.unstubAllGlobals();
  });
  it("explains missing estimates without claiming advance preparation is disabled", async () => {
    const element = await setup(true, false); const root = element.shadowRoot!;
    expect(root.querySelector("#return-preparation-help")?.textContent).toContain(en.plannedReturnPreparationNoEstimate);
    expect(root.querySelector("#return-preparation-help")?.textContent).toContain(en.plannedReturnPreparationNoEstimateHelp);
    const original = data();
    element.data = { ...original, planned_return_status: { ...original.planned_return_status!, preparation: { context: "arrival", return_at: original.planned_return_status!.return_at, mode_id: "home", zones: [{ entity_id: "climate.a", profile_id: null, schedule_source: "default", preparation: "arrival_only", state: "pending", reason: "preconditioning_disabled", start_at: null }] } } }; await element.updateComplete;
    expect(root.querySelector("#return-preparation-help")?.textContent).toContain(en.plannedReturnPreparationCategory_arrival_only);
    expect(root.querySelector(".preparation-marker")).toBeNull();
  });
  it("uses panel-specific editor alignment while preserving shared episode actions and configuration drafts", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
    const panel = await setup(false, false); const card = await setup(true, false);
    const root = panel.shadowRoot!;
    const dirtyEvents: CustomEvent[] = []; panel.addEventListener("velair-dirty-changed", (event) => dirtyEvents.push(event as CustomEvent));
    expect(root.querySelector(".panel-episode .return-timeline")).not.toBeNull();
    expect(card.shadowRoot!.querySelector(".panel-episode")).toBeNull();
    expect(root.querySelector(".compact-return-indicators")).toBeNull();
    expect(root.querySelector(".routine-status,.occupancy-panel,form")).not.toBeNull();
    const config = root.querySelector<HTMLInputElement>("#absence-delay")!;
    config.value = "15"; config.dispatchEvent(new Event("input")); await panel.updateComplete;
    root.querySelector<HTMLButtonElement>(".arrival-edit-trigger")!.click(); await panel.updateComplete;
    const input = root.querySelector<HTMLInputElement>("#episode-return-time")!;
    input.value = "12:00"; input.dispatchEvent(new Event("input")); await panel.updateComplete;
    expect(root.querySelector(".panel-episode .arrival-editor")).not.toBeNull();
    const actions = root.querySelectorAll<HTMLButtonElement>(".episode-buttons button");
    expect(root.querySelector(".cancel-return")).toBeNull();
    expect(actions[0].classList.contains("arrival-editor-close")).toBe(true);
    expect(actions[1].classList.contains("change-arrival")).toBe(true);
    expect(actions[1].disabled).toBe(false);
    root.querySelector<HTMLButtonElement>(".arrival-editor-close")!.click(); await panel.updateComplete;
    expect(root.querySelector(".arrival-unsaved")).toBeNull();
    expect(dirtyEvents.at(-1)?.detail.dirty).toBe(true);
    expect(root.querySelector<HTMLInputElement>("#absence-delay")!.value).toBe("15");
    root.querySelector<HTMLButtonElement>(".arrival-edit-trigger")!.click(); await panel.updateComplete;
    expect(root.querySelector<HTMLInputElement>("#episode-return-time")!.value).toBe("10:00");
    const reopened = root.querySelector<HTMLInputElement>("#episode-return-time")!; reopened.value = "12:00"; reopened.dispatchEvent(new Event("input")); await panel.updateComplete;
    vi.mocked(panel.hass!.connection.sendMessagePromise).mockResolvedValueOnce({ ...data(), planned_return_status: { ...data().planned_return_status!, return_at: "2026-10-10T12:00:00Z" } });
    root.querySelector<HTMLButtonElement>(".change-arrival")!.click(); await Promise.resolve(); await panel.updateComplete;
    expect(panel.hass!.connection.sendMessagePromise).toHaveBeenCalledWith({ type: "velair/adjust_planned_return", return_at: "2026-10-10T12:00:00.000Z" });
    expect(root.querySelector<HTMLInputElement>("#absence-delay")!.value).toBe("15");
    expect(root.querySelector(".arrival-editor")).toBeNull();
  });
  it.each([false, true])("makes absence confirmation explicit before an episode exists, compact=%s", async (compact) => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T21:30:00Z"));
    const element = await setup(compact, false); const root = element.shadowRoot!;
    element.hass = { ...element.hass!, config: { ...element.hass!.config, time_zone: "Europe/Madrid" }, locale: { ...element.hass!.locale, time_format: "24" } };
    for (const episode_active of [false, true]) {
      element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "confirming_absence", episode_active, absence_confirm_at: "2026-10-10T22:15:00Z" } }; await element.updateComplete;
      const process = root.querySelector(".absence-confirmation")!;
      expect(process.textContent).toContain(en.plannedReturnCheckingEmpty);
      expect(process.textContent).toContain(en.plannedReturnCheckingHelp);
      expect(process.querySelector("time")?.textContent).toContain("00:15");
      expect(process.querySelector("time")?.textContent).toContain("2026");
      expect(process.querySelector("time")?.getAttribute("datetime")).toBe("2026-10-10T22:15:00Z");
      expect(root.querySelector(".return-timeline")).toBeNull();
      expect(root.textContent).not.toContain(en.plannedReturnConfirmingUntil);
      expect(process.compareDocumentPosition(root.querySelector(episode_active ? ".saved-return-arrival" : ".manual-departure")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    element.hass = { ...element.hass!, locale: { ...element.hass!.locale, time_format: "12" } }; await element.updateComplete;
    expect(root.querySelector(".absence-confirmation-deadline")?.textContent).toMatch(/12:15.*AM/);
    element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "away", episode_active: true } }; await element.updateComplete;
    expect(root.querySelector(".absence-confirmation")).toBeNull(); expect(root.querySelector(".return-timeline")).not.toBeNull();
  });
  it("never invents a confirmation deadline for armed, missing, invalid or errored states", async () => {
    const element = await setup(true, false); const root = element.shadowRoot!;
    for (const absence_confirm_at of [null, "invalid", "2026-10-10T12:00:00"]) {
      element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "confirming_absence", absence_confirm_at } }; await element.updateComplete;
      expect(root.querySelector(".absence-confirmation")).not.toBeNull();
      expect(root.querySelector(".absence-confirmation-deadline,.return-timeline")).toBeNull();
    }
    for (const state of ["armed", "error"] as const) {
      element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state, episode_active: true, absence_confirm_at: "2026-10-10T12:00:00Z", error: state === "error" ? "Backend error" : null } }; await element.updateComplete;
      expect(root.querySelector(".absence-confirmation,.return-timeline")).toBeNull();
      expect(root.querySelector(".cancel-return")).not.toBeNull();
    }
    expect(root.querySelector("[role=alert]")?.textContent).toContain("Backend error");
  });
  it.each([false, true])("groups header cancellation above status and keeps it busy-disabled only when available, compact=%s", async (compact) => {
    const element = await setup(compact, false); const root = element.shadowRoot!;
    const heading = root.querySelector(".quick-return-heading")!;
    expect(heading.firstElementChild?.classList.contains("return-title-group")).toBe(true);
    expect(root.querySelector(".return-cancel-footer .cancel-return")).not.toBeNull();
    expect(heading.querySelector(".cancel-return")).toBeNull();
    expect(heading.querySelector(".return-title-copy .return-context-status")).not.toBeNull();
    expect(Boolean(root.querySelector(".quick-return-heading .compact-return-indicators"))).toBe(compact);
    expect(root.querySelector(".episode-buttons")).toBeNull();
    element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, can_cancel: false } }; await element.updateComplete;
    expect(root.querySelector(".cancel-return")).toBeNull();
    element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "error", episode_active: true, can_cancel: true, can_start: false } }; await element.updateComplete;
    expect(root.querySelector<HTMLButtonElement>(".return-cancel-footer .cancel-return")!.disabled).toBe(false);
    let resolve!: (value: ScheduleResponse) => void;
    vi.mocked(element.hass!.connection.sendMessagePromise).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    await closeEditor(element); root.querySelector<HTMLButtonElement>(".cancel-return")!.click(); await element.updateComplete;
    expect(root.querySelector<HTMLButtonElement>(".cancel-return")!.disabled).toBe(true);
    expect(element.hass!.connection.sendMessagePromise).toHaveBeenCalledWith({ type: "velair/cancel_planned_return" });
    resolve({ ...data(), planned_return_status: { ...data().planned_return_status!, episode_active: false, state: "cancelled", can_cancel: true } }); await Promise.resolve(); await element.updateComplete;
    expect(root.querySelector(".cancel-return,.return-context-status,.episode-buttons")).toBeNull();
    expect(root.querySelector(".manual-departure")).not.toBeNull();
  });
  it.each([false, true])("integrates semantic endpoint icons into the rail with saved times below and mode chips beneath saved times, compact=%s", async (compact) => {
    const element = await setup(compact, false); const root = element.shadowRoot!;
    const graph = root.querySelector(".return-timeline")!;
    const rail = graph.querySelector(".return-timeline-rail")!;
    for (const [selector, label, icon] of [[".departure-icon", en.plannedReturnDeparted, "mdi:home-export-outline"], [".arrival-icon", en.plannedReturnArrival, "mdi:home-import-outline"]]) {
      const endpoint = rail.querySelector(selector)!;
      expect(endpoint.getAttribute("role")).toBe("img");
      expect(endpoint.getAttribute("title")).toBe(label); expect(endpoint.getAttribute("aria-label")).toBe(label);
      expect(endpoint.querySelector("ha-icon")?.getAttribute("icon")).toBe(icon);
      expect(endpoint.closest("[role=progressbar]")).toBeNull();
    }
    const times = graph.querySelector(".return-timeline-endpoints")!;
    expect(rail.compareDocumentPosition(times) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(times.querySelectorAll(".return-time-value,.arrival-edit-trigger")).toHaveLength(2);
    expect(times.querySelector(".endpoint-label")).toBeNull();
    expect(graph.querySelectorAll(".return-mode-chip")).toHaveLength(2);
    for (const column of times.children) expect(column.firstElementChild!.compareDocumentPosition(column.querySelector(".return-mode-chip")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(graph.querySelector(".departure-mode")?.getAttribute("aria-label")).toContain("Away snapshot");
    expect(graph.querySelector(".arrival-mode ha-icon")?.getAttribute("icon")).toBe("mdi:format-list-bulleted");
    expect(root.querySelector(".cancel-return-surface")?.textContent).toContain(en.cancel);
    element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "armed" } }; await element.updateComplete;
    expect(root.querySelector(".return-timeline,.return-mode-chips")).toBeNull();
    expect(root.querySelector(".saved-return-arrival .arrival-edit-trigger")).not.toBeNull();
  });
  it.each([false, true])("attaches phase to the title and uses confirmation process as the sole phase explanation, compact=%s", async (compact) => {
    const element = await setup(compact, false); const root = element.shadowRoot!;
    expect(root.querySelector(".return-title-copy .return-context-status")?.textContent).toContain(en.plannedReturnState_away);
    expect(root.querySelector(".return-status-row,.return-state-chip")).toBeNull();
    expect(Boolean(root.querySelector(".quick-return-heading .compact-return-indicators"))).toBe(compact);
    element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "confirming_absence", absence_confirm_at: "2026-10-10T09:05:00Z" } }; await element.updateComplete;
    expect(root.querySelector(".return-context-status")).toBeNull();
    expect(root.querySelector(".absence-confirmation")?.getAttribute("title")).toBe(en.plannedReturnStateHelp_confirming_absence);
    expect(root.querySelectorAll(".quick-return-panel [role=status]")).toHaveLength(1);
    expect(root.querySelector(".return-timeline")).toBeNull();
    element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "preparing" } }; await element.updateComplete;
    expect(root.querySelector(".return-title-copy .return-context-status")?.textContent).toContain(en.plannedReturnState_preparing);
    expect(root.querySelector(".absence-confirmation")).toBeNull();
  });
  it("shows confirmation delay only while it still applies, preserving card-only source counts", async () => {
    const card = await setup(true, false); const panel = await setup(false, false);
    for (const [state, episode_active, departure_at, visible] of [
      ["idle", false, null, true], ["armed", true, null, true], ["confirming_absence", true, null, true],
      ["away", true, null, false], ["preparing", true, data().planned_return_status!.departure_at, false],
      ["error", true, null, true], ["error", true, data().planned_return_status!.departure_at, false],
      ["fulfilled", false, data().planned_return_status!.departure_at, true],
    ] as const) {
      const response = { ...data(), planned_return_status: { ...data().planned_return_status!, state, episode_active, departure_at } };
      card.data = response; panel.data = response; await card.updateComplete; await panel.updateComplete;
      expect(Boolean(card.shadowRoot!.querySelector(".compact-return-delay"))).toBe(visible);
      expect(card.shadowRoot!.querySelectorAll(".compact-return-indicators [data-runtime-count]")).toHaveLength(3);
      expect(panel.shadowRoot!.querySelector(".compact-return-indicators,.return-indicator-row")).toBeNull();
      if (visible) expect(card.shadowRoot!.querySelector(".compact-return-delay")?.textContent).toContain("2 h");
    }
  });
  it.each([false, true])("separates cancelling the return from closing its draft editor, compact=%s", async (compact) => {
    const element = await setup(compact, false); const root = element.shadowRoot!;
    expect(root.querySelector(".quick-return-heading .cancel-return")).toBeNull();
    expect(Boolean(root.querySelector(".quick-return-heading .compact-return-indicators"))).toBe(compact);
    const footer = root.querySelector(".return-cancel-footer")!;
    expect(root.querySelector(".preparation-info")!.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    root.querySelector<HTMLButtonElement>(".arrival-edit-trigger")!.click(); await element.updateComplete;
    expect(root.querySelector(".cancel-return,.return-cancel-footer")).toBeNull();
    const input = root.querySelector<HTMLInputElement>("#episode-return-time")!; input.value = "12:00"; input.dispatchEvent(new Event("input")); await element.updateComplete;
    element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "error", episode_active: true, can_start: false, can_cancel: true } }; await element.updateComplete;
    expect(root.querySelector(".cancel-return")).toBeNull();
    const close = root.querySelector<HTMLButtonElement>(".arrival-editor-close")!;
    expect(close.disabled).toBe(false); expect(close.getAttribute("title")).toBe(en.plannedReturnCloseEditor);
    close.click(); await element.updateComplete;
    expect(root.querySelector(".arrival-unsaved")).toBeNull();
    expect(root.querySelector<HTMLButtonElement>(".return-cancel-footer .cancel-return")!.disabled).toBe(false);
    expect(root.activeElement).toBe(root.querySelector(".return-cancel-footer .cancel-return"));
    expect(root.querySelector(".change-arrival")).toBeNull();
    expect(element.hass!.connection.sendMessagePromise).not.toHaveBeenCalled();
  });
  it("offers preparation fallback through accessible hover, focus and mobile tap help without API calls", async () => {
    const element = await setup(true, false); const root = element.shadowRoot!;
    const trigger = root.querySelector<HTMLButtonElement>("#return-preparation-help-trigger")!;
    const tooltip = root.querySelector<HTMLElement>("#return-preparation-help")!;
    expect(root.querySelector(".preparation-summary")).toBeNull();
    expect(trigger.getAttribute("aria-label")).toBe(en.plannedReturnRoomPreparation);
    expect(trigger.getAttribute("aria-controls")).toBe(tooltip.id);
    expect(trigger.closest("[role=progressbar],[aria-hidden=true]")).toBeNull();
    expect(trigger.closest(".return-title-line")).not.toBeNull();
    expect(root.querySelector(".return-context-status")?.parentElement).toBe(trigger.closest(".return-title-line"));
    expect(root.querySelector(".return-context-status")?.parentElement).toBe(root.querySelector(".return-title-line .status-copy")?.parentElement);
    expect(trigger.closest(".return-timeline")).toBeNull();
    expect(root.querySelector(".return-timeline-now-label")).toBeNull();
    expect(root.querySelector(".return-timeline-marker")?.getAttribute("title")).toBe(en.plannedReturnTimelineNow);
    expect(root.querySelector(".return-timeline-marker")?.closest("[role=progressbar]")).toBeNull();
    expect(root.querySelector(".return-timeline-marker")?.children).toHaveLength(0);
    expect(root.querySelector(".return-timeline-now-row")).toBeNull();
    expect(root.querySelector(".return-title-line .status-copy")!.compareDocumentPosition(trigger) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    trigger.dispatchEvent(new FocusEvent("focus")); expect(trigger.getAttribute("aria-expanded")).toBe("true");
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.focus(); trigger.dispatchEvent(new Event("focus")); expect(tooltip.classList.contains("visible")).toBe(true);
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    trigger.click(); expect(trigger.getAttribute("aria-expanded")).toBe("true");
    trigger.click(); expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.click(); expect(tooltip.classList.contains("visible")).toBe(true);
    element.remove(); expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(element.hass!.connection.sendMessagePromise).not.toHaveBeenCalled();
  });
  it.each([false, true])("uses compact blue Back and green Change surfaces and an icon and text pending arrival label, compact=%s", async (compact) => {
    const element = await setup(compact); const root = element.shadowRoot!;
    const back = root.querySelector<HTMLButtonElement>(".arrival-editor-close")!;
    const change = root.querySelector<HTMLButtonElement>(".change-arrival")!;
    expect(back.classList.contains("primary")).toBe(true); expect(change.classList.contains("success")).toBe(true);
    for (const button of [back, change]) expect(button.querySelector(".editor-action-surface")?.textContent?.trim()).toBeTruthy();
    element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "armed" } }; await element.updateComplete;
    const icon = root.querySelector(".saved-return-arrival .arrival-icon")!;
    expect(icon.getAttribute("role")).toBe("img"); expect(icon.getAttribute("title")).toBe(en.plannedReturnArrival);
    expect(icon.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:home-import-outline");
    const label = root.querySelector(".saved-return-arrival .arrival-label")!;
    expect(label.textContent).toBe(en.plannedReturnArrival);
    expect(label.closest("button")).toBeNull();
    expect(label.compareDocumentPosition(root.querySelector(".saved-return-arrival .arrival-edit-trigger")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(root.querySelector(".saved-return-arrival .arrival-edit-trigger")?.textContent).not.toContain(en.plannedReturnArrival);
  });
  it.each(["armed", "confirming_absence", "error"] as const)("keeps the Expected arrival label outside the edit button in transient %s", async (state) => {
    for (const compact of [false, true]) {
      const element = await setup(compact, false);
      element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state, departure_at: null, episode_active: true } }; await element.updateComplete;
      const root = element.shadowRoot!;
      expect(root.querySelector(".return-timeline")).toBeNull();
      const label = root.querySelector(".saved-return-arrival .arrival-label")!;
      expect(label.textContent).toBe(en.plannedReturnArrival);
      expect(label.closest("button")).toBeNull();
      const trigger = root.querySelector<HTMLButtonElement>(".saved-return-arrival .arrival-edit-trigger")!;
      expect(trigger.textContent).not.toContain(en.plannedReturnArrival);
      expect(trigger.classList.contains("pending-arrival-chip")).toBe(true);
      expect(trigger.querySelector(".pending-arrival-surface")).not.toBeNull();
      expect(trigger.querySelector("ha-icon")).toBeNull();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(trigger.getAttribute("aria-controls")).toBe("episode-arrival-editor");
      expect(trigger.getAttribute("aria-label")).toContain("2026");
      element.data = { ...element.data!, planned_return_status: { ...element.data!.planned_return_status!, can_start: false } }; await element.updateComplete;
      expect(trigger.disabled).toBe(true);
      element.data = { ...element.data!, planned_return_status: { ...element.data!.planned_return_status!, can_start: true } }; await element.updateComplete;
      trigger.click(); await element.updateComplete;
      expect(root.querySelector(".arrival-editor")).not.toBeNull();
    }
  });
  it("keeps pending/missing timestamps static and the full sidebar intact", async () => {
    const element = await setup(); element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, state: "armed" } }; await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".return-timeline")).toBeNull();
    element.data = { ...data(), planned_return_status: { ...data().planned_return_status!, departure_at: null } }; await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".return-timeline")).toBeNull();
    const sidebar = await setup(false); expect(sidebar.shadowRoot!.querySelector(".routine-status")).not.toBeNull();
    expect(sidebar.shadowRoot!.querySelector(".occupancy-panel")).not.toBeNull(); expect(sidebar.shadowRoot!.querySelector("form")).not.toBeNull();
    expect(sidebar.shadowRoot!.querySelector(".compact-return-indicators")).toBeNull(); expect(sidebar.shadowRoot!.querySelector(".return-timeline")).not.toBeNull();
  });
});
