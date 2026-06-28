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
    expect(customElements.get("velair-panel-card")).toBeDefined();
    expect(customElements.get("velair-sidebar-panel")).toBeDefined();
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
    const panel = document.createElement("velair-sidebar-panel") as HTMLElement & { updateComplete?: Promise<boolean> };

    document.body.append(panel);
    await panel.updateComplete;

    expect(panel.shadowRoot?.querySelector(".main-title")?.textContent).toContain("Velair");
    expect(panel.shadowRoot?.querySelector(".version")).toBeNull();
    expect(panel.shadowRoot?.querySelectorAll("ha-tab-group-tab")).toHaveLength(5);
    expect(panel.shadowRoot?.textContent).toContain("Preconditioning");
    expect(panel.shadowRoot?.querySelector("velair-panel-card")?.getAttribute("view")).toBe("overview");

    panel.remove();
  });

  it("offers preconditioning as an individual Lovelace card view", async () => {
    await import("../../src/velair-card");
    const editor = document.createElement("velair-card-editor") as HTMLElement & {
      setConfig(config: { view: string }): void;
      updateComplete?: Promise<boolean>;
    };

    editor.setConfig({ view: "preconditioning" });
    document.body.append(editor);
    await editor.updateComplete;

    const viewSelect = editor.shadowRoot?.querySelector("select");
    const views = [...(viewSelect?.querySelectorAll("option") ?? [])].map(
      (option) => option.getAttribute("value"),
    );
    expect(views).toContain("preconditioning");
    expect((viewSelect as HTMLSelectElement | null)?.value).toBe("preconditioning");

    editor.remove();
  });

  it("lets a Lovelace card choose which thermostats it shows", async () => {
    await import("../../src/velair-card");
    const editor = document.createElement("velair-card-editor") as HTMLElement & {
      hass?: unknown;
      setConfig(config: { view: string; zone_order?: string[]; entities?: string[] }): void;
      updateComplete?: Promise<boolean>;
    };

    editor.setConfig({
      view: "preconditioning",
      zone_order: ["climate.bedroom", "climate.office"],
    });
    editor.hass = {
      connection: {
        sendMessagePromise: async () => ({
          configured_entities: ["climate.office", "climate.bedroom"],
        }),
      },
      states: {
        "climate.bedroom": { attributes: { friendly_name: "Bedroom" } },
        "climate.office": { attributes: { friendly_name: "Office" } },
      },
    };

    document.body.append(editor);
    await editor.updateComplete;
    await Promise.resolve();
    await editor.updateComplete;

    const labels = [...(editor.shadowRoot?.querySelectorAll(".zone-row > span") ?? [])]
      .map((element) => element.textContent?.trim());
    expect(labels).toEqual(["Bedroom", "Office"]);

    const checkboxes = [...(editor.shadowRoot?.querySelectorAll<HTMLInputElement>(".zone-visibility input") ?? [])];
    expect(checkboxes).toHaveLength(2);
    const changed = new Promise<Record<string, unknown>>((resolve) => {
      editor.addEventListener("config-changed", ((event: CustomEvent) => {
        resolve(event.detail.config);
      }) as EventListener, { once: true });
    });

    checkboxes[0]!.checked = false;
    checkboxes[0]!.dispatchEvent(new Event("change", { bubbles: true }));

    expect(await changed).toMatchObject({
      entities: ["climate.office"],
      zone_order: ["climate.bedroom", "climate.office"],
    });

    editor.remove();
  });
});
