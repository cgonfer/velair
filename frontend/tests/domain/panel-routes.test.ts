import { describe, expect, it } from "vitest";
import { panelDestination, panelPath, parsePanelPath } from "../../src/velair/domain/panel-routes";
import { PANEL_VIEWS } from "../../src/velair/constants";

describe("panel destinations", () => {
  it.each(PANEL_VIEWS)("round trips %s", (view) => {
    const destination = panelDestination(view);
    expect(parsePanelPath(panelPath(destination))).toEqual(destination);
  });
  it.each([
    ["/velair/overview", "/velair"], ["/velair/profiles", "/velair/modes"],
    ["/velair/schedules", "/velair/schedules/default"], ["/velair/schedules/unknown", "/velair/schedules/default"],
    ["/velair/templates", "/velair/templates/templates"], ["/velair/templates/unknown", "/velair/templates/templates"],
    ["/velair/preconditioning", "/velair/preconditioning/preconditioning"],
    ["/velair/preconditioning/unknown", "/velair/preconditioning/preconditioning"],
    ["/velair/preconditioning/planned-return", "/velair/preconditioning/planned-return"],
    ["/velair/unknown", "/velair"], ["/velair/settings/unknown", "/velair/settings"],
    ["/velair/schedules/profiles", "/velair/schedules/profiles"], ["/velair/templates/presets", "/velair/templates/presets"],
  ])("normalizes %s", (input, output) => expect(panelPath(parsePanelPath(input))).toBe(output));
  it("accepts HA relative paths and custom prefixes", () => {
    expect(parsePanelPath("/templates/presets")).toEqual({ view: "templates", subsection: "presets" });
    expect(panelPath(parsePanelPath("/custom/schedules/profiles", "/custom"), "/custom")).toBe("/custom/schedules/profiles");
  });
});
