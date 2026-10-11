// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { VelairPanel } from "../../src/velair/views/panel";
if (!customElements.get("velair-preset-navigation-test")) customElements.define("velair-preset-navigation-test", VelairPanel);
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });
describe("preset library navigation", () => {
  it.each([false, true])("respects the existing unsaved-draft decision (%s)", async (accept) => {
    const panel = new VelairPanel();
    const state = panel as unknown as { _activeView: string; _activeViewDirty: boolean; _pendingPresetKey?: string };
    state._activeView = "schedules";
    document.body.append(panel); await panel.updateComplete;
    const card = panel.shadowRoot!.querySelector("velair-panel-card")!;
    state._activeViewDirty = true;
    vi.spyOn(window, "confirm").mockReturnValue(accept);
    card.dispatchEvent(new CustomEvent("velair-open-preset", { detail: "summer" }));
    await panel.updateComplete;
    expect(state._activeView).toBe(accept ? "templates" : "schedules");
    expect(state._pendingPresetKey).toBe(accept ? "summer" : undefined);
    if (!accept) expect(panel.shadowRoot!.querySelector("velair-panel-card")).toBe(card);
    else expect((panel.shadowRoot!.querySelector("velair-panel-card") as unknown as { presetKey: string }).presetKey).toBe("summer");
  });
});
