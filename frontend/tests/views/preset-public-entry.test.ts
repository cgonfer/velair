// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import "../../src/velair-card";

afterEach(() => document.body.replaceChildren());

describe("preset library through the public frontend entry", () => {
  it("mounts the library after selecting Climate presets in Templates", async () => {
    const card = document.createElement("velair-panel-card");
    const host = card as unknown as {
      view: string; _data: unknown; updateComplete: Promise<unknown>;
      _selectTemplateLibrarySource(source: string): void;
    };
    host.view = "templates";
    host._data = {
      configured_entities: [], zones: {}, templates: [], profiles: [],
      block_presets: [], configuration_revision: 1, temperature_unit: "°C", settings: {},
      temperature_migration: { required: false },
    };
    document.body.append(card);
    await host.updateComplete;
    const button = card.shadowRoot!.querySelectorAll<HTMLButtonElement>(".schedule-source-option > button")[1];
    expect(button).toBeDefined();
    button.click();
    await host.updateComplete;
    const library = card.shadowRoot!.querySelector("velair-preset-library") as HTMLElement & { updateComplete: Promise<unknown> };
    expect(library).not.toBeNull();
    await library.updateComplete;
    expect(library.shadowRoot!.querySelector(".preset-library")).not.toBeNull();
    expect(library.shadowRoot!.querySelector(".preset-library-layout > .preset-list")).not.toBeNull();
    expect(library.shadowRoot!.querySelector(".preset-library-layout > .template-detail")).not.toBeNull();
    expect(library.shadowRoot!.querySelectorAll("button")).toHaveLength(1);
    library.shadowRoot!.querySelector<HTMLButtonElement>(".template-list-heading button")!.click();
    await library.updateComplete;
    expect(library.shadowRoot!.querySelector(".template-detail .preset-editor")).not.toBeNull();
  });
});
