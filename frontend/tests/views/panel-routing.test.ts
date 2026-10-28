// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VelairPanel } from "../../src/velair/views/panel";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import type { PanelSubsection } from "../../src/velair/domain/panel-routes";
import type { ResourceUsage, ScheduleResponse } from "../../src/velair/types";
if (!customElements.get("routing-test-panel")) customElements.define("routing-test-panel", VelairPanel);
if (!customElements.get("routing-test-card")) customElements.define("routing-test-card", VelairCard);
type Internal = {
  _activeView: string; _activeSubsection?: string; _activeViewDirty: boolean;
  _selectView(view: string, source?: Event, subsection?: PanelSubsection): void;
};
const state = (panel: VelairPanel) => panel as unknown as Internal;
async function panelAt(path: string) {
  window.history.replaceState({ root: true, dialog: "ha-state" }, "", path);
  const panel = document.createElement("routing-test-panel") as VelairPanel;
  document.body.append(panel); await panel.updateComplete;
  return panel;
}
function browserTo(path: string, position: number) {
  window.history.replaceState({ ...window.history.state, velairPosition: position }, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
beforeEach(() => window.history.replaceState(null, "", "/"));
afterEach(() => { document.body.replaceChildren(); window.history.replaceState(null, "", "/"); vi.restoreAllMocks(); });

describe("panel URL navigation", () => {
  it("consumes a dashboard schedule jump while preserving unrelated HA URL state", async () => {
    const panel = await panelAt("/velair/schedules/default?entity_id=room_group.living&weekday=friday&edit=1#section");
    const card = panel.shadowRoot!.querySelector("velair-panel-card") as unknown as VelairCard;
    expect(card.resourceUsage).toEqual({ source: "default", entity_id: "room_group.living", weekday: "friday" });
    expect(window.location.search).toBe("?edit=1");
    expect(window.location.hash).toBe("#section");
    window.dispatchEvent(new CustomEvent("location-changed")); await panel.updateComplete;
    expect(card.resourceUsage?.weekday).toBe("friday");
  });
  it("does not pass invalid weekday jumps to the schedule", async () => {
    const panel = await panelAt("/velair/schedules/default?entity_id=room_group.living&weekday=invalid");
    expect((panel.shadowRoot!.querySelector("velair-panel-card") as unknown as VelairCard).resourceUsage).toBeUndefined();
    expect(window.location.search).toBe("");
  });
  it("passes the named profile and shared owner from a dashboard profile jump", async () => {
    const panel = await panelAt("/velair/schedules/profiles?entity_id=room_group.living&weekday=saturday&profile_key=home");
    expect((panel.shadowRoot!.querySelector("velair-panel-card") as unknown as VelairCard).resourceUsage)
      .toEqual({ source: "profile", entity_id: "room_group.living", weekday: "saturday", profile_key: "home" });
    expect(window.location.search).toBe("");
  });
  it("keeps the current draft and does not apply a dashboard jump when navigation is rejected", async () => {
    const panel = await panelAt("/velair/settings");
    state(panel)._activeViewDirty = true;
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const go = vi.spyOn(window.history, "go").mockImplementation(() => undefined);
    browserTo("/velair/schedules/default?entity_id=room_group.living&weekday=friday", 1);
    await panel.updateComplete;
    expect(state(panel)._activeView).toBe("settings");
    expect((panel.shadowRoot!.querySelector("velair-panel-card") as unknown as VelairCard).resourceUsage).toBeUndefined();
    expect(go).toHaveBeenCalledWith(-1);
  });
  it("replaces the legacy Groups bookmark with Supply control without losing HA state", async () => {
    const panel = await panelAt("/velair/groups");
    expect(state(panel)._activeView).toBe("supply-control");
    expect(window.location.pathname).toBe("/velair/supply-control");
    expect(window.history.state).toMatchObject({ root: true, dialog: "ha-state" });
  });
  it("guards learning diagnostics navigation and passes the room only after approval", async () => {
    const panel = await panelAt("/velair/preconditioning");
    state(panel)._activeViewDirty = true;
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const open = () => panel.shadowRoot!.querySelector("velair-panel-card")!.dispatchEvent(
      new CustomEvent("velair-open-learning-diagnostics", { detail: "climate.bedroom", bubbles: true, composed: true }));
    open(); await panel.updateComplete;
    expect(state(panel)._activeView).toBe("preconditioning");
    expect(window.location.pathname).toBe("/velair/preconditioning");
    confirm.mockReturnValue(true);
    open(); await panel.updateComplete;
    expect(state(panel)._activeView).toBe("diagnostics");
    expect((panel.shadowRoot!.querySelector("velair-panel-card") as unknown as VelairCard).learningDiagnosticEntity).toBe("climate.bedroom");
    expect(window.location.pathname).toBe("/velair/diagnostics");
  });

  it.each(["/velair/schedules/profiles", "/velair/templates/presets", "/velair/room-groups", "/velair/supply-control", "/velair/preconditioning", "/velair/planned-return"])("restores direct entry and refresh at %s", async (path) => {
    let panel = await panelAt(path);
    const destination = { view: state(panel)._activeView, subsection: state(panel)._activeSubsection };
    expect((panel.shadowRoot!.querySelector("velair-panel-card") as unknown as VelairCard).subsection).toBe(destination.subsection);
    panel.remove(); panel = await panelAt(path);
    expect({ view: state(panel)._activeView, subsection: state(panel)._activeSubsection }).toEqual(destination);
    expect(window.location.pathname).toBe(path);
  });
  it("normalizes aliases by replacing while preserving HA state", async () => {
    const replace = vi.spyOn(window.history, "replaceState"); const push = vi.spyOn(window.history, "pushState");
    const panel = await panelAt("/velair/templates/invalid");
    expect(state(panel)._activeSubsection).toBe("templates");
    expect(window.location.pathname).toBe("/velair/templates/templates");
    expect(push).not.toHaveBeenCalled(); expect(replace).toHaveBeenCalled();
    expect(window.history.state).toMatchObject({ root: true, dialog: "ha-state" });
  });
  it("pushes once per changed destination and ignores stale HA route replay", async () => {
    const panel = await panelAt("/velair"); const push = vi.spyOn(window.history, "pushState");
    state(panel)._selectView("templates", undefined, "presets"); await panel.updateComplete;
    state(panel)._selectView("templates"); await panel.updateComplete;
    panel.route = { prefix: "/velair", path: "" }; await panel.updateComplete;
    expect(state(panel)._activeView).toBe("templates"); expect(state(panel)._activeSubsection).toBe("presets");
    expect(window.location.pathname).toBe("/velair/templates/presets"); expect(push).toHaveBeenCalledTimes(1);
  });
  it("does not intercept outgoing HA navigation while still connected", async () => {
    const panel = await panelAt("/velair/settings");
    panel.route = { prefix: "/velair", path: "/settings" }; await panel.updateComplete;
    window.history.pushState({ from: "/velair/settings" }, "", "/lovelace/home");
    window.dispatchEvent(new CustomEvent("location-changed")); await panel.updateComplete;
    expect(window.location.pathname).toBe("/lovelace/home"); expect(state(panel)._activeView).toBe("settings");
  });
  it("uses HA from state on pushes without carrying root or dialogs", async () => {
    const panel = await panelAt("/velair"); state(panel)._selectView("settings"); await panel.updateComplete;
    expect(window.history.state).toEqual({ from: "/velair", velairPosition: 1 });
  });
  it.each(["schedules/profiles", "/schedules/profiles"])("handles initial HA relative route %s", async (path) => {
    window.history.replaceState(null, "", "/velair/schedules/profiles");
    const panel = document.createElement("routing-test-panel") as VelairPanel;
    panel.route = { prefix: "/velair", path }; document.body.append(panel); await panel.updateComplete;
    expect(state(panel)._activeSubsection).toBe("profiles"); expect(window.location.pathname).toBe("/velair/schedules/profiles");
  });
  it("preserves card and draft on subsection changes", async () => {
    const panel = await panelAt("/velair/templates/templates"); const card = panel.shadowRoot!.querySelector("velair-panel-card")!;
    state(panel)._activeViewDirty = true;
    state(panel)._selectView("templates", undefined, "presets"); await panel.updateComplete;
    expect(panel.shadowRoot!.querySelector("velair-panel-card")).toBe(card);
    expect(state(panel)._activeViewDirty).toBe(true);
    expect(window.location.pathname).toBe("/velair/templates/presets");
  });
  it.each([true, false])("handles backward/forward navigation with dirty decision %s", async (accept) => {
    const panel = await panelAt("/velair"); state(panel)._selectView("settings"); await panel.updateComplete;
    state(panel)._activeViewDirty = true; vi.spyOn(window, "confirm").mockReturnValue(accept);
    const go = vi.spyOn(window.history, "go").mockImplementation(() => undefined);
    const push = vi.spyOn(window.history, "pushState");
    browserTo("/velair", 0); await panel.updateComplete;
    if (accept) {
      expect(state(panel)._activeView).toBe("overview");
      browserTo("/velair/settings", 1); await panel.updateComplete;
      expect(state(panel)._activeView).toBe("settings");
    } else {
      expect(state(panel)._activeView).toBe("settings"); expect(go).toHaveBeenCalledWith(1);
      browserTo("/velair/settings", 1); await panel.updateComplete;
      expect(window.location.pathname).toBe("/velair/settings"); expect(state(panel)._activeViewDirty).toBe(true);
    }
    expect(push).not.toHaveBeenCalled();
  });
  it("cancels subsection navigation through the card guard without adding history", async () => {
    const panel = await panelAt("/velair/schedules/default");
    const card = panel.shadowRoot!.querySelector("velair-panel-card") as unknown as VelairCard;
    card.selectPanelSubsection = vi.fn(() => false);
    const push = vi.spyOn(window.history, "pushState");
    state(panel)._selectView("schedules", undefined, "profiles"); await panel.updateComplete;
    expect(window.location.pathname).toBe("/velair/schedules/default"); expect(push).not.toHaveBeenCalled();
  });
  it.each([true, false])("guards planned-return history tab changes exactly once (%s)", async (accept) => {
    const panel = await panelAt("/velair/preconditioning");
    state(panel)._selectView("planned-return"); await panel.updateComplete;
    state(panel)._activeViewDirty = true;
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(accept);
    const go = vi.spyOn(window.history, "go").mockImplementation(() => undefined);
    browserTo("/velair/preconditioning", 0); await panel.updateComplete;
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(state(panel)._activeView).toBe(accept ? "preconditioning" : "planned-return");
    if (!accept) { expect(go).toHaveBeenCalledWith(1); browserTo("/velair/planned-return", 1); await panel.updateComplete; }
    else { browserTo("/velair/planned-return", 1); await panel.updateComplete; expect(state(panel)._activeView).toBe("planned-return"); }
  });
  it("keeps the current planned-return tab without a confirmation or history entry", async () => {
    const panel = await panelAt("/velair/planned-return"); state(panel)._activeViewDirty = true;
    const confirm = vi.spyOn(window, "confirm"); const push = vi.spyOn(window.history, "pushState");
    state(panel)._selectView("planned-return"); await panel.updateComplete;
    expect(confirm).not.toHaveBeenCalled(); expect(push).not.toHaveBeenCalled(); expect(state(panel)._activeViewDirty).toBe(true);
  });
  it.each([
    ["/velair/preconditioning/preconditioning", "preconditioning"],
    ["/velair/preconditioning/planned-return", "planned-return"],
  ])("keeps legacy link %s and selects its top-level tab", async (path, view) => {
    const panel = await panelAt(path);
    expect(state(panel)._activeView).toBe(view);
    expect(state(panel)._activeSubsection).toBeUndefined();
    expect(window.location.pathname).toBe(`/velair/${view}`);
    expect(panel.shadowRoot!.querySelector(`ha-tab-group-tab[panel="${view}"]`)?.hasAttribute("active")).toBe(true);
  });
  it("opens the return tab from the overview shortcut", async () => {
    const panel = await panelAt("/velair");
    panel.shadowRoot!.querySelector("velair-panel-card")!.dispatchEvent(new CustomEvent("velair-open-planned-return"));
    await panel.updateComplete;
    expect(state(panel)._activeView).toBe("planned-return");
    expect(window.location.pathname).toBe("/velair/planned-return");
  });
  it("blocks leaving the return tab during an operation", async () => {
    const panel = await panelAt("/velair/planned-return");
    const card = panel.shadowRoot!.querySelector("velair-panel-card") as unknown as VelairCard;
    card.canNavigatePanel = vi.fn(() => false);
    state(panel)._selectView("preconditioning"); await panel.updateComplete;
    expect(state(panel)._activeView).toBe("planned-return");
    expect(window.location.pathname).toBe("/velair/planned-return");
  });
  it("does not apply resource jumps after a rejected same-tab subsection change", async () => {
    const panel = await panelAt("/velair/schedules/default");
    const card = panel.shadowRoot!.querySelector("velair-panel-card") as unknown as VelairCard;
    card.selectPanelSubsection = vi.fn(() => false);
    card.dispatchEvent(new CustomEvent("velair-open-resource-usage", { detail: { source: "profile", entity_id: "climate.office", weekday: "monday" } }));
    await panel.updateComplete;
    expect(card.resourceUsage).toBeUndefined(); expect(window.location.pathname).toBe("/velair/schedules/default");
  });
  it("indexes external HA pushes so canceled Back preserves both history entries", async () => {
    const panel = await panelAt("/velair"); state(panel)._selectView("schedules"); await panel.updateComplete;
    window.history.pushState({ from: "/velair/schedules/default" }, "", "/velair/settings");
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } })); await panel.updateComplete;
    expect(window.history.state.velairPosition).toBe(2);
    state(panel)._activeViewDirty = true; const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    window.history.back();
    await vi.waitFor(() => { expect(confirm).toHaveBeenCalledTimes(1); expect(window.location.pathname).toBe("/velair/settings"); });
    confirm.mockReturnValue(true); window.history.back();
    await vi.waitFor(() => expect(window.location.pathname).toBe("/velair/schedules/default"));
    expect(state(panel)._activeView).toBe("schedules");
  });
  it("restores real canceled history traversal once, then allows back and forward", async () => {
    const panel = await panelAt("/velair");
    state(panel)._selectView("settings"); await panel.updateComplete;
    state(panel)._activeViewDirty = true;
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const push = vi.spyOn(window.history, "pushState");
    const popReplay = () => { panel.route = { prefix: "/velair", path: "/settings" }; };
    window.addEventListener("popstate", popReplay);
    try {
      window.history.back();
      await vi.waitFor(() => { expect(confirm).toHaveBeenCalledTimes(1); expect(window.location.pathname).toBe("/velair/settings"); });
      expect(state(panel)._activeView).toBe("settings"); expect(state(panel)._activeViewDirty).toBe(true);
      window.history.back();
      await vi.waitFor(() => { expect(confirm).toHaveBeenCalledTimes(2); expect(window.location.pathname).toBe("/velair/settings"); });
      confirm.mockReturnValue(true); window.history.back();
      await vi.waitFor(() => expect(state(panel)._activeView).toBe("overview"));
      window.history.forward(); await vi.waitFor(() => expect(state(panel)._activeView).toBe("settings"));
      expect(push).not.toHaveBeenCalled();
    } finally { window.removeEventListener("popstate", popReplay); }
  });
  it("syncs accepted internal subsection selections", async () => {
    const panel = await panelAt("/velair/templates/templates");
    panel.shadowRoot!.querySelector("velair-panel-card")!.dispatchEvent(new CustomEvent("velair-subsection-changed", { detail: "presets" }));
    await panel.updateComplete; expect(window.location.pathname).toBe("/velair/templates/presets");
  });
});

describe("card subsection contract", () => {
  const navigationCard = () => {
    const card = document.createElement("routing-test-card") as VelairCard;
    const internal = card as unknown as {
      _data: ScheduleResponse; _hasExternalConfig: boolean; _selectedWeekday: string;
      _openNextEventSchedule(entityId: string, weekday?: string, modeId?: string): Promise<void>;
      _openResourceUsage(usage: ResourceUsage): Promise<void>;
      _selectEntity: (id: string) => void; _selectWeekday: (day: string) => void;
      _selectScheduleSource: (source: string) => void;
    };
    internal._data = { configured_entities: ["climate.one", "climate.two"], control_units: ["room_group.living"], member_to_unit: { "climate.one": "room_group.living", "climate.two": "room_group.living" } } as unknown as ScheduleResponse;
    return { card, internal };
  };
  const withProfiles = (data: ScheduleResponse): ScheduleResponse => ({
    ...data,
    profiles: ["away", "home"].map(key => ({ key, name: key, icon: "mdi:home", zones: { "room_group.living": { behavior: "schedule", schedule: { friday: [] } } } })),
    modes: [{ key: "return-home", name: "Home", profile_ids: ["home"] }],
    profile_selection: { base_profile_ids: ["away"], base_mode_id: null, zone_profile_overrides: {} },
    effective_zone_profiles: { "room_group.living": "away" }, effective_profile_ids: ["away"],
  });
  it("opens the active group Profile schedule instead of the different default plan", async () => {
    const { card, internal } = navigationCard(); internal._data = withProfiles(internal._data);
    const event = vi.fn(); card.addEventListener("velair-open-resource-usage", event);
    await internal._openNextEventSchedule("climate.two", "friday");
    expect(event.mock.calls[0][0].detail).toEqual({ source: "profile", profile_key: "away", entity_id: "room_group.living", weekday: "friday" });
  });
  it("opens a Planned Return destination Profile in dashboards without mutating current selection", async () => {
    const { internal } = navigationCard(); internal._data = withProfiles(internal._data); internal._hasExternalConfig = true;
    const before = JSON.stringify(internal._data);
    await internal._openNextEventSchedule("climate.two", "saturday", "return-home");
    expect(window.location.pathname).toBe("/velair/schedules/profiles");
    expect(new URLSearchParams(window.location.search).get("profile_key")).toBe("home");
    expect(new URLSearchParams(window.location.search).get("entity_id")).toBe("room_group.living");
    expect(new URLSearchParams(window.location.search).get("weekday")).toBe("saturday");
    expect(JSON.stringify(internal._data)).toBe(before);
  });
  it("opens the default schedule for default destination modes and normal Profile behavior", async () => {
    const { internal } = navigationCard(); internal._data = withProfiles(internal._data);
    const open = vi.spyOn(internal, "_openResourceUsage").mockResolvedValue();
    await internal._openNextEventSchedule("climate.one", "friday", "default");
    expect(open).toHaveBeenLastCalledWith({ source: "default", entity_id: "room_group.living", weekday: "friday" });
    internal._data.profiles![0].zones["room_group.living"] = { behavior: "normal" };
    await internal._openNextEventSchedule("climate.one", "friday");
    expect(open).toHaveBeenLastCalledWith({ source: "default", entity_id: "room_group.living", weekday: "friday" });
  });
  it("rejects stale or non-scheduled Profile query targets", async () => {
    const { card, internal } = navigationCard(); internal._data = withProfiles(internal._data); card.view = "schedules";
    internal._selectScheduleSource = vi.fn();
    await internal._openResourceUsage({ source: "profile", profile_key: "missing", entity_id: "room_group.living", weekday: "friday" });
    expect(internal._selectScheduleSource).not.toHaveBeenCalled();
  });
  it("focuses the named shared Profile and day through the existing Profile editor navigation", async () => {
    const { card, internal } = navigationCard(); internal._data = withProfiles(internal._data); card.view = "schedules";
    const focusUsage = vi.fn();
    Object.defineProperty(card, "renderRoot", { value: { querySelector: () => ({ focusUsage }) } });
    Object.defineProperty(card, "updateComplete", { value: Promise.resolve(true) });
    Object.assign(internal, { _scheduleSource: "profile" });
    const usage: ResourceUsage = { source: "profile", profile_key: "home", entity_id: "room_group.living", weekday: "saturday" };
    await internal._openResourceUsage(usage);
    expect(focusUsage).toHaveBeenCalledWith(usage);
  });
  it("opens the shared default schedule from a physical member inside the panel", async () => {
    const { card, internal } = navigationCard();
    const event = vi.fn(); card.addEventListener("velair-open-resource-usage", event);
    await internal._openNextEventSchedule("climate.two", "friday");
    expect(event.mock.calls[0][0].detail).toEqual({ source: "default", entity_id: "room_group.living", weekday: "friday" });
    expect(window.location.pathname).toBe("/");
  });
  it("navigates dashboard members to the real panel and keeps the event weekday", async () => {
    window.history.replaceState(null, "", "/lovelace/home");
    const { card, internal } = navigationCard(); internal._hasExternalConfig = true;
    const localEvent = vi.fn(); card.addEventListener("velair-open-resource-usage", localEvent);
    const haEvent = vi.fn(); window.addEventListener("location-changed", haEvent);
    try {
      await internal._openNextEventSchedule("climate.two", "sunday");
      expect(window.location.pathname).toBe("/velair/schedules/default");
      expect(new URLSearchParams(window.location.search).get("entity_id")).toBe("room_group.living");
      expect(new URLSearchParams(window.location.search).get("weekday")).toBe("sunday");
      expect(window.history.state.from).toBe("/lovelace/home");
      expect(haEvent).toHaveBeenCalledTimes(1); expect(localEvent).not.toHaveBeenCalled();
    } finally { window.removeEventListener("location-changed", haEvent); }
  });
  it("falls back to the selected weekday and ignores unmanaged climate navigation", async () => {
    const { internal } = navigationCard(); internal._selectedWeekday = "wednesday";
    const open = vi.spyOn(internal, "_openResourceUsage").mockResolvedValue();
    await internal._openNextEventSchedule("climate.one", "invalid");
    expect(open).toHaveBeenCalledWith({ source: "default", entity_id: "room_group.living", weekday: "wednesday" });
    open.mockClear(); await internal._openNextEventSchedule("climate.unmanaged", "friday");
    expect(open).not.toHaveBeenCalled();
  });
  it("rejects unmanaged direct schedule jumps after backend data loads", async () => {
    const { card, internal } = navigationCard(); card.view = "schedules";
    internal._selectEntity = vi.fn(); internal._selectWeekday = vi.fn(); internal._selectScheduleSource = vi.fn();
    await internal._openResourceUsage({ source: "default", entity_id: "climate.unmanaged", weekday: "friday" });
    expect(internal._selectEntity).not.toHaveBeenCalled(); expect(internal._selectScheduleSource).not.toHaveBeenCalled();
  });
  it("applies selection before data is loaded", async () => {
    const card = document.createElement("routing-test-card") as VelairCard;
    card.view = "schedules"; card.subsection = "profiles"; document.body.append(card); await card.updateComplete;
    expect((card as unknown as { _scheduleSource: string })._scheduleSource).toBe("profile");
  });
  it("preserves a dirty schedule and URL when the real card guard rejects", async () => {
    window.history.replaceState(null, "", "/velair/schedules/default");
    const card = document.createElement("routing-test-card") as VelairCard;
    card.view = "schedules"; card.subsection = "default";
    const internal = card as unknown as { _dirty: boolean; _draftBlocks: unknown[]; _scheduleSource: string };
    internal._dirty = true; internal._draftBlocks = [{ start: "09:00", temperature: 24, hvac_mode: "cool" }];
    document.body.append(card); await card.updateComplete;
    vi.spyOn(window, "confirm").mockReturnValue(false);
    expect(card.selectPanelSubsection("profiles")).toBe(false);
    expect(internal._scheduleSource).toBe("default"); expect(internal._dirty).toBe(true);
    expect(internal._draftBlocks).toEqual([{ start: "09:00", temperature: 24, hvac_mode: "cool" }]);
    expect(window.location.pathname).toBe("/velair/schedules/default");
  });
  it("leaves Lovelace dashboard URLs untouched", async () => {
    window.history.replaceState(null, "", "/lovelace/home");
    const card = document.createElement("routing-test-card") as VelairCard;
    card.view = "templates"; card.subsection = "presets"; document.body.append(card); await card.updateComplete;
    card.selectPanelSubsection("templates"); await card.updateComplete;
    expect(window.location.pathname).toBe("/lovelace/home");
  });
});
