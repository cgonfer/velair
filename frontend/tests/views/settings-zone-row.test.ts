// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_EXTERNAL_CHANGE_DURATION_MINUTES } from "../../src/velair/constants";
import type { VelairViewHost } from "../../src/velair/host-types";
import { cardStyles } from "../../src/velair/styles/card-styles";
import { settingsStyles } from "../../src/velair/styles/settings-styles";
import { en } from "../../src/velair/translations/en";
import { es } from "../../src/velair/translations/es";
import { renderSettingsZoneOrderRow } from "../../src/velair/views/settings-view";

function host(
  preconditioningEnabled: boolean,
  options: { roomSensorAssistEnabled?: boolean; roomSensorConfigured?: boolean } = {},
) {
  return {
    _data: {
      zones: {
        "climate.office": {
          preconditioning: {
            enabled: preconditioningEnabled,
            room_sensor_assist_enabled: options.roomSensorAssistEnabled ?? false,
            room_temperature_entity_id: options.roomSensorConfigured === false
              ? null
              : "sensor.office_temperature",
          },
          external_change_policy: {
            action: "for_duration",
            duration_minutes: 90,
          },
        },
      },
    },
    _climateProvidedData: () => [],
    _climateSupportedModes: () => ["heat"],
    _entityDiagnostic: () => ({ status: "ok", tooltip: "Available", messages: [] }),
    _entityExists: () => true,
    _entityTemperatureLimits: () => [7, 35],
    _entityTemperatureStep: () => 0.5,
    _formatTemperatureLimit: (value: number) => String(value),
    _friendlyEntityName: () => "Office",
    _handleSettingsZoneDragEnd: vi.fn(),
    _handleSettingsZoneDragOver: vi.fn(),
    _handleSettingsZoneDragStart: vi.fn(),
    _handleSettingsZoneDrop: vi.fn(),
    _modeLabel: () => "Heat",
    _moveSettingsZone: vi.fn(),
    _saveExternalChangePolicy: vi.fn(),
    _settingsSaving: false,
    _t: (key: string) => key,
    _temperatureUnit: () => "\u00b0C",
  } as unknown as VelairViewHost;
}

describe("settings climate row", () => {
  it("explains automatic retention, Manual control, and next-adjustment semantics", () => {
    expect(en.externalChangePolicy).toBe("External adjustments");
    expect(en.externalChangeKeepAutomatic).toBe("Keep automatic");
    expect(en.externalChangeUntilNextBlock).toBe("Until next block");
    expect(en.externalChangePolicyDescription).toContain("Keep automatic reapplies");
    expect(en.externalChangePolicyDescription).toContain("next external adjustment");
    expect(en.externalChangePolicyDescription).toContain("stays Manual until resumed");
    expect(es.externalChangePolicyDescription).toContain("siguiente ajuste externo");
  });

  it("gives the climate name the full identity column", () => {
    expect(settingsStyles.cssText).toMatch(
      /\.settings-zone-title\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/,
    );
    expect(settingsStyles.cssText).not.toMatch(
      /\.settings-zone-title\s*\{[^}]*grid-template-columns:\s*10px/,
    );
  });

  it("keeps feature badges out of Settings when preconditioning is enabled", () => {
    const container = document.createElement("div");

    render(renderSettingsZoneOrderRow(host(true), "climate.office", 0, 1), container);

    const badge = container.querySelector(".settings-feature-badge.preconditioning");
    expect(badge).toBeNull();
  });

  it("does not show the indicator when preconditioning is disabled", () => {
    const container = document.createElement("div");

    render(renderSettingsZoneOrderRow(host(false), "climate.office", 0, 1), container);

    expect(container.querySelector(".settings-feature-badge.preconditioning")).toBeNull();
  });

  it("keeps feature badges out of Settings when room assist is enabled", () => {
    const container = document.createElement("div");

    render(
      renderSettingsZoneOrderRow(
        host(false, { roomSensorAssistEnabled: true }),
        "climate.office",
        0,
        1,
      ),
      container,
    );

    const badge = container.querySelector(".settings-feature-badge.room-assist");
    expect(badge).toBeNull();
  });

  it("does not show room assist when no room sensor is configured", () => {
    const container = document.createElement("div");

    render(
      renderSettingsZoneOrderRow(
        host(false, { roomSensorAssistEnabled: true, roomSensorConfigured: false }),
        "climate.office",
        0,
        1,
      ),
      container,
    );

    expect(container.querySelector(".settings-feature-badge.room-assist")).toBeNull();
  });

  it("keeps climate capability diagnostics out of Settings", () => {
    const container = document.createElement("div");
    const viewHost = host(false);
    viewHost._entityTemperatureStep = () => undefined;

    render(renderSettingsZoneOrderRow(viewHost, "climate.office", 0, 1), container);

    expect(container.querySelector(".capability-not-reported")).toBeNull();
    expect(container.querySelector(".settings-capability-section")).toBeNull();
  });

  it("owns the future external-change policy inside each managed climate row", () => {
    const container = document.createElement("div");
    render(renderSettingsZoneOrderRow(host(false), "climate.office", 0, 1), container);

    expect(container.querySelector(".settings-external-policy")).not.toBeNull();
    expect((container.querySelector(".settings-external-policy select") as HTMLSelectElement).value)
      .toBe("for_duration");
    expect(container.querySelector(".settings-external-policy select")?.parentElement?.classList)
      .toContain("select-wrap");
    const sharedCss = cardStyles.map((style) => style.cssText).join("\n");
    expect(sharedCss).toMatch(/\.select-wrap::after\s*\{[^}]*border-width:\s*0 2px 2px 0/);
    expect(sharedCss).toMatch(/\.select-wrap:has\(select:open\)::after\s*\{[^}]*rotate\(225deg\)/);
    expect((container.querySelector(".settings-external-policy input") as HTMLInputElement).value)
      .toBe("90");
    expect([...container.querySelectorAll(".settings-external-policy option")].map(
      (option) => option.getAttribute("value"),
    )).toEqual(["keep_automatic", "until_next_block", "for_duration", "until_resumed"]);
    expect(container.querySelector('option[value="keep_automatic"]')).not.toBeNull();
    expect(container.querySelector(".settings-policy-help")).toBeNull();
    expect(container.querySelector(".settings-policy-duration span")?.textContent)
      .toBe("minutesShort");
  });

  it("uses 120 minutes when a duration has not been configured yet", () => {
    const container = document.createElement("div");
    const viewHost = host(false);
    viewHost._data!.zones["climate.office"].external_change_policy = {
      action: "for_duration",
    };

    render(renderSettingsZoneOrderRow(viewHost, "climate.office", 0, 1), container);

    expect(DEFAULT_EXTERNAL_CHANGE_DURATION_MINUTES).toBe(120);
    expect((container.querySelector(".settings-external-policy input") as HTMLInputElement).value)
      .toBe("120");
  });

  it("defaults missing backend policy data to Keep automatic", () => {
    const container = document.createElement("div");
    const viewHost = host(false);
    delete viewHost._data!.zones["climate.office"].external_change_policy;

    render(renderSettingsZoneOrderRow(viewHost, "climate.office", 0, 1), container);

    expect((container.querySelector(".settings-external-policy select") as HTMLSelectElement).value)
      .toBe("keep_automatic");
    expect(container.querySelector(".settings-external-policy input")).toBeNull();
  });

  it("renders shared focusable inline help without dialog state", () => {
    const container = document.createElement("div");
    render(renderSettingsZoneOrderRow(host(false), "climate.office", 0, 1), container);

    const trigger = container.querySelector(".inline-help")!;
    const tooltip = container.querySelector('[role="tooltip"]')!;
    expect(trigger.getAttribute("aria-describedby")).toBe(tooltip.id);
    expect(trigger.getAttribute("aria-label")).toBe("externalAdjustmentInfoAction");
    expect(tooltip.textContent).toBe("externalChangePolicyDescription");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector(".popover-close")).toBeNull();
  });

  it("keeps compact desktop controls and groups policy with duration below the mobile heading", () => {
    const cssText = settingsStyles.cssText;
    expect(cssText).toMatch(/\.settings-external-policy\s*\{[^}]*display:\s*flex[^}]*flex-wrap:\s*wrap/);
    expect(cssText).toMatch(/\.settings-policy-controls\s*\{[^}]*display:\s*flex[^}]*flex:\s*0 1 auto[^}]*gap:\s*8px/);
    expect(cssText).toMatch(/\.settings-policy-controls > \.select-wrap\s*\{[^}]*flex:\s*0 1 170px[^}]*height:\s*34px[^}]*margin:\s*0[^}]*width:\s*170px/);
    expect(cssText).toMatch(/\.settings-external-policy \.select-wrap select\s*\{[^}]*height:\s*100%[^}]*margin:\s*0[^}]*width:\s*100%/);
    expect(cssText).toMatch(/\.settings-policy-duration\s*\{[^}]*flex:\s*0 1 105px[^}]*height:\s*34px/);
    expect(cssText).toMatch(/\.settings-policy-duration input\s*\{[^}]*border-radius:\s*0[^}]*box-shadow:\s*none[^}]*margin:\s*0[^}]*outline:\s*0/);
    expect(cssText).toMatch(/\.settings-policy-duration:focus-within\s*\{[^}]*border-color:\s*var\(--primary-color\)[^}]*box-shadow:\s*0 0 0 1px var\(--primary-color\)/);
    expect(cssText).toMatch(/@media \(max-width: 480px\)[\s\S]*\.settings-external-policy\s*\{[^}]*flex-direction:\s*column/);
    expect(cssText).toMatch(/@media \(max-width: 480px\)[\s\S]*\.settings-policy-controls\s*\{[^}]*width:\s*100%/);
    expect(cssText).toMatch(/@media \(max-width: 480px\)[\s\S]*\.settings-policy-controls > \.select-wrap\s*\{[^}]*flex:\s*1 1 160px[^}]*max-width:\s*170px/);
    expect(cssText).not.toContain("external-adjustment-popover");
  });
});
