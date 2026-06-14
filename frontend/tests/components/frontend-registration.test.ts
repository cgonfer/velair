// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

describe("frontend entrypoint", () => {
  beforeEach(() => {
    window.customCards = [];
  });

  it("registers the panel, editor, and Lovelace card metadata", async () => {
    await import("../../src/velair-card");

    expect(customElements.get("velair-card")).toBeDefined();
    expect(customElements.get("velair-card-editor")).toBeDefined();
    expect(customElements.get("velair-main-panel")).toBeDefined();
    expect(customElements.get("velair-scheduler-view")).toBeUndefined();
    expect(customElements.get("velair-panel")).toBeUndefined();
    expect(window.customCards).toContainEqual({
      description: "Climate automation that adapts to your life.",
      name: "Velair",
      type: "velair-card",
    });
  });

  it("renders the sidebar panel shell and active scheduler view", async () => {
    await import("../../src/velair-card");
    const panel = document.createElement("velair-main-panel") as HTMLElement & { updateComplete?: Promise<boolean> };

    document.body.append(panel);
    await panel.updateComplete;

    expect(panel.shadowRoot?.querySelector(".main-title")?.textContent).toContain("Velair");
    expect(panel.shadowRoot?.querySelector(".version")).toBeNull();
    expect(panel.shadowRoot?.querySelectorAll("ha-tab-group-tab")).toHaveLength(4);
    expect(panel.shadowRoot?.querySelector("velair-card")?.getAttribute("view")).toBe("overview");

    panel.remove();
  });
});
