// @vitest-environment jsdom
import { render } from "lit";
import { afterEach, describe, expect, it } from "vitest";
import { renderPreconditioningView } from "../../src/velair/views/preconditioning-view";
import { renderPlannedReturn } from "../../src/velair/views/planned-return-view";
import { renderCardContent } from "../../src/velair/views/card-content";
import type { VelairViewHost } from "../../src/velair/host-types";
import { en } from "../../src/velair/translations/en";

afterEach(() => document.body.replaceChildren());
const host = (view = "preconditioning", external = false) => ({
  _t: (key: keyof typeof en) => en[key], _weekdayName: (day: string) => day,
  _effectiveView: () => view, _hasExternalConfig: external,
  _data: { configured_entities: [], zones: {}, temperature_migration: { required: false } },
  _orderedZoneIds: () => [], _visibleZoneIds: () => [],
}) as unknown as VelairViewHost;

describe("separate preparation tabs", () => {
  it.each(["preconditioning", "planned-return"])("gives %s its own introduction and help", (view) => {
    const container = document.createElement("div");
    const h = host(view);
    render(view === "preconditioning" ? renderPreconditioningView(h, []) : renderPlannedReturn(h), container);
    const intro = container.querySelector(".preconditioning-intro")!;
    expect(intro.querySelector("strong")?.textContent).toBe(view === "preconditioning" ? en.preconditioningIntroTitle : en.plannedReturn);
    expect(intro.querySelector("small")?.textContent).toBe(view === "preconditioning" ? en.preconditioningIntroDetail : en.comfortPreparationReturnDescription);
    expect(intro.querySelectorAll(".documentation-help-button")).toHaveLength(1);
    expect(container.querySelector(".schedule-source-selector")).toBeNull();
    expect(Boolean(container.querySelector("velair-planned-return"))).toBe(view === "planned-return");
  });
  it.each([false, true])("keeps panel settings distinct from compact Lovelace card (external=%s)", (external) => {
    const container = document.createElement("div");
    render(renderCardContent(host("planned-return", external)), container);
    const component = container.querySelector("velair-planned-return") as HTMLElement & { settings: boolean; compact: boolean };
    expect(component.settings).toBe(!external);
    expect(component.compact).toBe(external);
    expect(container.querySelectorAll(".preconditioning-intro")).toHaveLength(external ? 0 : 1);
  });
});
