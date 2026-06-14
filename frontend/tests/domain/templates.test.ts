import { describe, expect, it } from "vitest";

import { ACTION_SET_TEMPERATURE } from "../../src/velair/constants";
import {
  newTemplateKey,
  scheduleTemplatesFromStored,
  templateApplyTargetsFromKeys,
  templateLabel,
  toggleTemplateApplyTarget,
  uniqueTemplateName,
} from "../../src/velair/domain/templates";

describe("template domain", () => {
  it("normalizes stored templates into editable drafts", () => {
    expect(scheduleTemplatesFromStored([
      {
        key: "comfort",
        name: "Comfort",
        blocks: [
          { start: "08:00", temperature: 21, hvac_mode: "heat" },
          { action: "turn_off", start: "22:00" },
        ],
      },
    ])).toEqual([
      {
        key: "comfort",
        name: "Comfort",
        blocks: [
          { action: ACTION_SET_TEMPERATURE, start: "08:00", temperature: 21, hvac_mode: "heat" },
          { action: "turn_off", start: "22:00", temperature: 21, hvac_mode: "" },
        ],
      },
    ]);
  });

  it("creates readable unique names and stable custom keys", () => {
    const templates = [
      { blocks: [], key: "one", name: "Template" },
      { blocks: [], key: "two", name: "Template 2" },
    ];

    expect(templateLabel({ key: "fallback" })).toBe("fallback");
    expect(uniqueTemplateName("Template", templates)).toBe("Template 3");
    expect(newTemplateKey(1_800_000_000_000, 0.123456)).toBe("custom_mywpiww0_4fzyo8");
  });

  it("keeps apply targets valid for configured entities and weekdays", () => {
    const selected = toggleTemplateApplyTarget(new Set<string>(), "climate.office", "monday", true);
    const unselected = toggleTemplateApplyTarget(selected, "climate.office", "monday", false);

    expect([...selected]).toEqual(["climate.office::monday"]);
    expect([...unselected]).toEqual([]);
    expect(templateApplyTargetsFromKeys([
      "climate.office::monday",
      "climate.unknown::monday",
      "climate.office::funday",
    ], ["climate.office"])).toEqual([
      { entityId: "climate.office", weekday: "monday" },
    ]);
  });
});
