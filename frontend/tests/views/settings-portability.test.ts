// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import { renderPortabilitySettings } from "../../src/velair/views/settings-view";

function host() {
  return {
    _data: {
      configured_entities: ["climate.office"],
    },
    _exportSections: new Set(),
    _importFileName: "backup.json",
    _importPayload: {
      temperature_unit: "째C",
      sections: {
        preconditioning_learning: {
          "climate.office": {},
          "climate.removed": {},
        },
      },
    },
    _importSections: new Set(["preconditioning_learning"]),
    _portabilityAction: undefined,
    _exportPortableData: vi.fn(),
    _handlePortableImportFile: vi.fn(),
    _importPortableData: vi.fn(),
    _importAvailableSections: () => ["preconditioning_learning"],
    _portableExportSummaryItems: () => [],
    _portableImportSummaryItems: () => [{
      label: "learning",
      section: "preconditioning_learning",
      title: "learning",
      value: 2,
    }],
    _portableSectionLabel: () => "learning",
    _temperatureUnit: () => "째F",
    _t: (key: string, replacements?: Record<string, string | number>) =>
      replacements
        ? `${key}:${replacements.count}:${replacements.entities}`
        : key,
    _togglePortableSection: vi.fn(),
  } as unknown as VelairViewHost;
}

describe("settings portability", () => {
  it("warns about imported learning for climates that are not managed", () => {
    const container = document.createElement("div");

    render(renderPortabilitySettings(host()), container);

    const warnings = [...container.querySelectorAll(".portable-warning")];
    expect(warnings).toHaveLength(2);
    expect(warnings[1]?.textContent).toContain(
      "preconditioningImportSkipped:1:climate.removed",
    );
  });

  it("allows export while temperature migration keeps scheduling locked", () => {
    const container = document.createElement("div");
    const migrationHost = host();
    migrationHost._exportSections = new Set(["zones"]);
    migrationHost._data.temperature_migration = {
      required: true,
      source_unit: "째F",
      target_unit: "째C",
    };

    render(renderPortabilitySettings(migrationHost), container);

    const exportButton = container.querySelector<HTMLButtonElement>(
      ".portability-export-card .command-button",
    );
    expect(exportButton?.disabled).toBe(false);
    exportButton?.click();
    expect(migrationHost._exportPortableData).toHaveBeenCalledOnce();
  });

  it("explains that a legacy unitless backup is treated as Celsius", () => {
    const container = document.createElement("div");
    const legacyHost = host();
    delete legacyHost._importPayload.temperature_unit;

    render(renderPortabilitySettings(legacyHost), container);

    const warnings = [...container.querySelectorAll(".portable-warning")];
    expect(warnings.some((warning) =>
      warning.textContent?.includes("legacyImportTemperatureUnit")
    )).toBe(true);
  });
});


it("previews removed zone exceptions before importing replacement Profiles", () => {
  const viewHost = host();
  viewHost._data.profile_selection = { base_profile_ids: [], base_mode_id: null,
    zone_profile_overrides: { "climate.office": "work" } };
  viewHost._importPayload = { temperature_unit: "캜", sections: { profiles: [] } };
  viewHost._importSections = new Set(["profiles"]);
  const container = document.createElement("div");
  render(renderPortabilitySettings(viewHost), container);
  const warning = [...container.querySelectorAll(".portable-warning")]
    .find((element) => element.textContent?.includes("profileImportOverridesWarning"));
  expect(warning?.textContent).toContain("climate.office");
});
