// @vitest-environment jsdom
import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import { renderEntityNameSettings } from "../../src/velair/views/settings-view";
import type { VelairViewHost } from "../../src/velair/host-types";

function host(mode?: string): VelairViewHost {
  return { _data: { settings: mode ? { entity_name_display: mode } : {} },
    _settingsSaving: false, _t: (key: string) => key,
    _inputValue: (event: Event) => (event.currentTarget as HTMLSelectElement).value,
    _saveSettings: vi.fn(),
  } as unknown as VelairViewHost;
}
describe("climate name display setting", () => {
  it("defaults existing installations to current names and offers exactly three formats", () => {
    const container = document.createElement("div"); render(renderEntityNameSettings(host()), container);
    const select = container.querySelector("select")!;
    expect(select.value).toBe("legacy");
    expect([...select.options].map(option => option.value)).toEqual(["legacy", "legacy_area", "entity_context"]);
  });
  it.each(["legacy", "legacy_area", "entity_context"])("shows persisted preference %s and saves through the backend", mode => {
    const value = host(mode); const container = document.createElement("div");
    render(renderEntityNameSettings(value), container); const select = container.querySelector("select")!;
    expect(select.value).toBe(mode); select.value = "entity_context"; select.dispatchEvent(new Event("change"));
    expect(value._saveSettings).toHaveBeenCalledWith({ entity_name_display: "entity_context" });
    expect(value._data?.settings.entity_name_display).toBe(mode);
  });
  it("prevents concurrent saves while the backend is updating", () => {
    const value = host(); value._settingsSaving = true;
    const container = document.createElement("div"); render(renderEntityNameSettings(value), container);
    expect(container.querySelector("select")?.disabled).toBe(true);
  });
  it("uses the shared info button beside the label without a permanent description", () => {
    const value = host();
    const container = document.createElement("div");
    document.body.append(container);
    render(renderEntityNameSettings(value), container);
    try {
      const button = container.querySelector<HTMLButtonElement>("button.inline-help")!;
      const tooltip = container.querySelector<HTMLElement>("[role=tooltip]")!;
      expect(container.querySelector("p.help")).toBeNull();
      expect(container.querySelector("label")?.htmlFor).toBe(container.querySelector("select")?.id);
      expect(button.getAttribute("aria-label")).toBe("entityNameDisplay");
      expect(button.getAttribute("aria-controls")).toBe(tooltip.id);
      expect(button.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:information-outline");
      expect(tooltip.textContent).toBe("entityNameDisplayHelp");
      expect(tooltip.classList.contains("visible")).toBe(false);
      button.click();
      expect(button.getAttribute("aria-expanded")).toBe("true");
      expect(tooltip.classList.contains("visible")).toBe(true);
      button.click();
      expect(tooltip.classList.contains("visible")).toBe(false);
      expect(value._saveSettings).not.toHaveBeenCalled();
    } finally {
      container.remove();
    }
  });
});
