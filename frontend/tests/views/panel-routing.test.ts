// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VelairPanel } from "../../src/velair/views/panel";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import type { PanelSubsection } from "../../src/velair/domain/panel-routes";
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
  it.each(["/velair/schedules/profiles", "/velair/templates/presets", "/velair/preconditioning/preconditioning", "/velair/preconditioning/planned-return"])("restores direct entry and refresh at %s", async (path) => {
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
  it.each([true, false])("guards planned-return history subsection changes through the card exactly once (%s)", async (accept) => {
    const panel = await panelAt("/velair/preconditioning/preconditioning");
    const card = panel.shadowRoot!.querySelector("velair-panel-card") as unknown as VelairCard;
    let selected = "preconditioning";
    card.selectPanelSubsection = vi.fn((subsection) => { if (selected === subsection) return true; if (!window.confirm("discard")) return false; selected = subsection!; return true; });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    state(panel)._selectView("preconditioning", undefined, "planned-return"); await panel.updateComplete;
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(accept); confirm.mockClear();
    const go = vi.spyOn(window.history, "go").mockImplementation(() => undefined);
    browserTo("/velair/preconditioning/preconditioning", 0); await panel.updateComplete;
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(state(panel)._activeSubsection).toBe(accept ? "preconditioning" : "planned-return");
    if (!accept) { expect(go).toHaveBeenCalledWith(1); browserTo("/velair/preconditioning/planned-return", 1); await panel.updateComplete; }
    else { browserTo("/velair/preconditioning/planned-return", 1); await panel.updateComplete; expect(state(panel)._activeSubsection).toBe("planned-return"); }
  });
  it("keeps the current planned-return submenu without a confirmation or history entry", async () => {
    const panel = await panelAt("/velair/preconditioning/planned-return"); state(panel)._activeViewDirty = true;
    const confirm = vi.spyOn(window, "confirm"); const push = vi.spyOn(window.history, "pushState");
    state(panel)._selectView("preconditioning", undefined, "planned-return"); await panel.updateComplete;
    expect(confirm).not.toHaveBeenCalled(); expect(push).not.toHaveBeenCalled(); expect(state(panel)._activeViewDirty).toBe(true);
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
