// @vitest-environment jsdom
import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderPlannedReturnDepartureStatus, plannedReturnDepartureHelp } from "../../src/velair/views/planned-return-departure-status";
import { renderPlannedReturnOverview } from "../../src/velair/views/planned-return-visibility";
import { translate } from "../../src/velair/i18n";
import type { TranslationKey } from "../../src/velair/translations";
import { en } from "../../src/velair/translations/en";
import type { PlannedReturnStatus } from "../../src/velair/types";
import type { VelairViewHost } from "../../src/velair/host-types";

const t = (key: TranslationKey, values?: Record<string, string | number>) => translate("en", key, values);
const status = (extra: Partial<PlannedReturnStatus> = {}): PlannedReturnStatus => ({
  state: "preparing", occupancy: "home", origin: "manual", sources: [{ entity_id: "binary_sensor.home", state: "home" }],
  can_start: true, episode_active: true, awaiting_departure_confirmation: true,
  departure_at: "2026-10-18T08:00:00Z", return_at: "2026-10-18T18:00:00Z",
  absence_confirm_at: null, error: null, zones: [], ...extra,
});
function container() { const root = document.createElement("div"); document.body.append(root); return root; }
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

describe("departure confirmation independent of preparation", () => {
  it("distinguishes waiting, counting, interrupted and confirmed without a second progress bar", () => {
    const root = container();
    const show = (value: PlannedReturnStatus) => render(renderPlannedReturnDepartureStatus(value, t, () => "08:40"), root);
    show(status());
    expect(root.querySelector(".return-departure-copy")?.textContent).toBe(en.plannedReturnDepartureWaiting);
    expect(root.querySelector("time")).toBeNull();
    show(status({ absence_confirm_at: "2026-10-18T08:40:00Z" }));
    expect(root.querySelector(".return-departure-copy")?.textContent).toBe("Confirming departure · Until 08:40");
    expect(root.querySelector("time")?.dateTime).toBe("2026-10-18T08:40:00Z");
    show(status({ occupancy: "unknown", absence_confirm_at: null }));
    expect(root.querySelector(".return-departure-copy")?.textContent).toBe(en.plannedReturnDepartureWaiting);
    show(status({ awaiting_departure_confirmation: false }));
    expect(root.querySelector(".return-departure-confirmation")).toBeNull();
    expect(root.querySelector("progress, [role=progressbar]")).toBeNull();
  });
  it.each([null, "invalid", "2026-10-18T08:40:00"])("does not invent a confirmation time for %s", (deadline) => {
    const root = container();
    render(renderPlannedReturnDepartureStatus(status({ absence_confirm_at: deadline }), t, () => "invented"), root);
    expect(root.querySelector("time")).toBeNull();
    expect(root.querySelector(".return-departure-copy")?.textContent).toBe(en.plannedReturnDepartureWaiting);
  });
  it.each(["cancelled", "fulfilled", "skipped", "error", "armed", "confirming_absence"] as const)("omits stale immediate-Away notices in %s", (state) => {
    const root = container();
    render(renderPlannedReturnDepartureStatus(status({ state }), t, () => "08:40"), root);
    expect(root.querySelector(".return-departure-confirmation")).toBeNull();
  });
  it("keeps the detailed explanation in help instead of repeating it on screen", () => {
    const root = container();
    render(renderPlannedReturnDepartureStatus(status(), t, () => "08:40"), root);
    expect(root.querySelector(".return-departure-description")).toBeNull();
    expect(root.querySelector(".inline-help-tooltip")?.textContent).toContain(en.plannedReturnManualAwayWaitingHelp);
    expect(root.querySelector(".inline-help-tooltip")?.textContent).not.toContain(en.plannedReturnManualAwayWaiting);
  });
  it("explains timeline application time and presence-return eligibility without renaming endpoints", () => {
    const pending = plannedReturnDepartureHelp(status(), t);
    expect(pending).toEqual([en.plannedReturnTimelineStartMeaningHelp]);
    expect(plannedReturnDepartureHelp(status({ awaiting_departure_confirmation: false }), t)).toHaveLength(1);
    expect(plannedReturnDepartureHelp(status({ awaiting_departure_confirmation: false }), t, true)[1]).toBe(en.plannedReturnPresenceReturnEnabledHelp);
    expect(plannedReturnDepartureHelp(status({ awaiting_departure_confirmation: false, sources: [] }), t, true)).toHaveLength(1);
  });
  it("keeps the Overview phase, timeline and shortcut while help does not navigate", () => {
    const root = container();
    const host = {
      _data: { planned_return_status: status(), modes: [], profiles: [] },
      hass: { config: { time_zone: "Europe/Madrid" }, locale: { time_format: "24", language: "en" } },
      _t: t, _formatDateTime: (date: string) => date,
      _currentTimelineNow: () => new Date("2026-10-18T09:00:00Z"),
    } as unknown as VelairViewHost;
    const navigate = vi.fn(); root.addEventListener("velair-open-planned-return", navigate);
    render(renderPlannedReturnOverview(host), root);
    expect(root.querySelector(".overview-return-open strong")?.textContent).toContain(en.plannedReturnState_preparing);
    expect(root.querySelector(".overview-return-timeline")).not.toBeNull();
    expect(root.querySelector("button button")).toBeNull();
    const help = root.querySelector<HTMLButtonElement>("#return-departure-confirmation-trigger")!;
    help.click(); expect(help.getAttribute("aria-expanded")).toBe("true");
    expect(navigate).not.toHaveBeenCalled();
    help.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(help.getAttribute("aria-expanded")).toBe("false");
    root.querySelector<HTMLButtonElement>(".overview-return-open")!.click();
    expect(navigate).toHaveBeenCalledTimes(1);
    (host._data!.planned_return_status!) = status({ occupancy: "away", absence_confirm_at: "2026-10-18T09:10:00Z" });
    render(renderPlannedReturnOverview(host), root);
    expect(root.querySelector(".return-departure-confirmation time")?.textContent).toBe("Until 11:10");
  });
});
