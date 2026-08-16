// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import { renderTemplatesView } from "../../src/velair/views/templates-view";

function host(options: { templates?: Array<{ key: string; name: string; blocks: unknown[] }> } = {}) {
  return {
    _createTemplate: vi.fn(),
    _deleteSelectedTemplate: vi.fn(),
    _handleTemplateListScroll: vi.fn(),
    _hasDraftValidationError: () => false,
    _scheduleTemplates: () => options.templates ?? [],
    _selectTemplate: vi.fn(),
    _selectedTemplateKey: "",
    _t: (key: string) => key,
    _templateAction: null,
    _templateApplyOpen: false,
    _templateDirty: false,
    _templateDraftBlocks: [],
    _templateLabel: (template: { name?: string; key: string }) => template.name ?? template.key,
    _templateListClass: () => "template-list-wrap",
    _templateNameInputValue: () => "",
  } as unknown as VelairViewHost;
}

describe("templates view", () => {
  it("shows a compact empty state when there are no templates", () => {
    const container = document.createElement("div");

    render(renderTemplatesView(host()), container);

    expect(container.querySelector(".templates-view > .template-intro")?.textContent)
      .toContain("templatesPanelIntro");
    const placeholder = container.querySelector(".template-placeholder.compact");
    expect(placeholder?.textContent).toContain("noTemplates");
    expect(
      [...(placeholder?.children ?? [])].some((child) => child.tagName === "HA-ICON"),
    ).toBe(false);
    expect(placeholder?.querySelector("h2")).toBeNull();
  });

  it("shows a compact detail placeholder until a template is selected", () => {
    const container = document.createElement("div");

    render(
      renderTemplatesView(
        host({ templates: [{ key: "comfort", name: "Comfort", blocks: [] }] }),
      ),
      container,
    );

    const placeholder = container.querySelector(".template-detail .template-placeholder.compact");
    expect(container.querySelectorAll(".template-intro")).toHaveLength(1);
    expect(placeholder?.textContent).toContain("selectTemplateToBegin");
    expect(placeholder?.querySelector("ha-icon")).toBeNull();
    expect(placeholder?.querySelector("h2")).toBeNull();
  });
});
