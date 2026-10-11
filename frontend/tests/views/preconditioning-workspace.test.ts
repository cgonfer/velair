// @vitest-environment jsdom
import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderPreconditioningWorkspace } from "../../src/velair/views/preconditioning-workspace";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import type { VelairViewHost } from "../../src/velair/host-types";
import { en } from "../../src/velair/translations/en";
class WorkspaceTestCard extends VelairCard {}
customElements.define("workspace-test-card", WorkspaceTestCard);
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });
const host = (source = "preconditioning") => ({ _preconditioningSource: source, _t: (key: keyof typeof en) => en[key], _weekdayName: (day: string) => day, _selectPreconditioningSource: vi.fn(), _setPlannedReturnDirty: vi.fn(), _applyScheduleData: vi.fn() }) as unknown as VelairViewHost;
describe("comfort preparation workspace", () => {
  it("defaults to adaptive and gives both categories titles, icons and descriptions", () => {
    const container = document.createElement("div"); const h = host(); render(renderPreconditioningWorkspace(h, []), container);
    expect(container.querySelector(".preconditioning-workspace")?.firstElementChild?.classList.contains("schedule-source-selector")).toBe(true);
    expect(container.querySelector('.schedule-source-selector ha-icon')?.getAttribute("icon")).toBe("mdi:clock-fast");
    expect(container.querySelectorAll(".preconditioning-intro")).toHaveLength(0);
    expect(container.querySelector(".schedule-source-selector button.active")?.textContent).toContain(en.preconditioningIntroTitle);
    expect(container.querySelector(".preconditioning-view")).not.toBeNull();
    expect(container.querySelector("velair-planned-return")).toBeNull();
    (container.querySelectorAll(".schedule-source-option > button")[1] as HTMLButtonElement).click();
    expect(h._selectPreconditioningSource).toHaveBeenCalledWith("planned-return");
  });
  it("uses one combined planned-return component for all settings and runtime actions", () => {
    const container = document.createElement("div"); render(renderPreconditioningWorkspace(host("planned-return"), []), container);
    const component = container.querySelector("velair-planned-return") as HTMLElement & { settings: boolean };
    expect(component.settings).toBe(true); expect(container.querySelectorAll("velair-planned-return")).toHaveLength(1);
    expect(container.querySelector(".preconditioning-view:not(.planned-return-view)")).toBeNull();
    expect(container.querySelector(".schedule-source-selector button.active")?.textContent).toContain(en.comfortPreparationReturnDescription);
    expect(container.querySelector(".schedule-source-selector button.active ha-icon")?.getAttribute("icon")).toBe("mdi:home-clock-outline");
    expect(container.querySelectorAll(".preconditioning-intro")).toHaveLength(0);
    expect(container.querySelector("button.active")?.textContent).toContain(en.plannedReturn);
  });
  it.each([true, false])("guards dirty submenu transitions once with decision %s", (accept) => {
    const card = new WorkspaceTestCard(); card.view = "preconditioning";
    const state = card as unknown as { _preconditioningSource: string; _plannedReturnDirty: boolean };
    state._preconditioningSource = "planned-return"; state._plannedReturnDirty = true;
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(accept);
    expect(card.selectPanelSubsection("preconditioning")).toBe(accept);
    expect(state._preconditioningSource).toBe(accept ? "preconditioning" : "planned-return");
    expect(state._plannedReturnDirty).toBe(!accept);
    if (accept) expect(card.selectPanelSubsection("preconditioning")).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(1);
  });
  it("does not discard current submenu edits and blocks navigation during a backend operation", () => {
    const card = new WorkspaceTestCard(); card.view = "preconditioning";
    const state = card as unknown as { _preconditioningSource: string; _plannedReturnDirty: boolean; _plannedReturnBusy: boolean };
    state._preconditioningSource = "planned-return"; state._plannedReturnDirty = true;
    const confirm = vi.spyOn(window, "confirm");
    expect(card.selectPanelSubsection("planned-return")).toBe(true); expect(confirm).not.toHaveBeenCalled(); expect(state._plannedReturnDirty).toBe(true);
    state._plannedReturnBusy = true;
    expect(card.canNavigatePanel()).toBe(false); expect(card.selectPanelSubsection("preconditioning")).toBe(false); expect(confirm).not.toHaveBeenCalled();
  });
});
