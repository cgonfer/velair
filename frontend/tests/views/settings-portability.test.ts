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
      sections: {
        preconditioning_learning: {
          "climate.office": {},
          "climate.removed": {},
        },
      },
    },
    _importSections: new Set(["preconditioning_learning"]),
    _portabilityAction: undefined,
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
});
