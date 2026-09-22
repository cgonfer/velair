// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_EXTERNAL_CHANGE_DURATION_MINUTES } from "../../src/velair/constants";
import type { VelairViewHost } from "../../src/velair/host-types";
import { cardStyles } from "../../src/velair/styles/card-styles";
import { settingsStyles } from "../../src/velair/styles/settings-styles";
import { en } from "../../src/velair/translations/en";
import { es } from "../../src/velair/translations/es";
import {
  renderExternalSystemsSettings,
  renderSettingsZoneOrderRow,
  renderSettingsTargetTempStep,
} from "../../src/velair/views/settings-view";

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
    hass: {
      states: {
        "climate.office": { attributes: { target_temp_step: 0.5 } },
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
    _saveZoneTargetTempStep: vi.fn(),
    _settingsSaving: false,
    _t: (key: string) => key,
    _temperatureUnit: () => "\u00b0C",
  } as unknown as VelairViewHost;
}

describe("settings climate row", () => {
  it("selects the configured external execution provider", () => {
    const container = document.createElement("div");
    const viewHost = {
      _data: {
        external_execution: {
          systems: [{
            provider: "ramses_cc",
            name: "RAMSES RF",
            entities: ["climate.office"],
            capabilities: {
              can_publish: true,
              can_import: false,
              supports_profile_schedules: true,
              supported_actions: ["set_temperature"],
              supported_hvac_modes: ["heat"],
              supported_target_types: ["scalar"],
              supported_option_fields: [],
              max_switchpoints_per_day: 6,
              time_step_minutes: 5,
              implicit_midnight_change_counts_toward_limit: true,
            },
          }],
          zones: {
            "climate.office": {
              type: "external",
              provider: "ramses_cc",
              available: true,
              publication: null,
            },
          },
        },
      },
      _friendlyEntityName: () => "Office",
      _setZoneExecution: vi.fn(),
      _settingsSaving: false,
      _t: (key: string) => key,
    } as unknown as VelairViewHost;

    render(renderExternalSystemsSettings(viewHost), container);

    expect((container.querySelector(".external-system-zone select") as HTMLSelectElement).value)
      .toBe("ramses_cc");
    expect(container.querySelector(".external-system-zone-identity strong")?.textContent).toBe("Office");
    expect(container.querySelector(".external-system-zone-identity small")).toBeNull();
    expect(container.querySelectorAll(".external-controller-conditions")).toHaveLength(1);
    expect((container.querySelector(".external-controller-conditions") as HTMLDetailsElement).open)
      .toBe(false);
    expect(container.querySelector(".external-controller-conditions summary")?.textContent)
      .toContain("RAMSES RF");
    const conditions = container.querySelector(".external-controller-conditions")?.textContent ?? "";
    for (const key of [
      "externalConditionProfilesSupported",
      "externalConditionHvacModes",
      "externalConditionTargetTypes",
      "externalConditionActions",
      "externalConditionTurnOffUnsupported",
      "externalConditionOptionsUnsupported",
      "externalConditionMaxChanges",
      "externalConditionTimeGrid",
      "externalConditionMidnightContinuityCounts",
    ]) {
      expect(conditions).toContain(key);
    }
  });

  it("keeps external system rows compact on wide layouts and stacks them responsively", () => {
    const cssText = settingsStyles.cssText;

    expect(cssText).toMatch(/\.external-systems-settings\s*\{[^}]*align-items:\s*start/);
    expect(cssText).toMatch(/\.external-systems-settings > \.settings-startup-icon\s*\{[^}]*align-self:\s*start/);
    expect(cssText).toMatch(/\.external-system-zone\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(160px, 1fr\) minmax\(220px, 0\.8fr\)/);
    expect(cssText).toMatch(/@container \(max-width:\s*720px\)[\s\S]*\.external-system-zone\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
    expect(cssText).toMatch(/\.external-system-zone-identity strong\s*\{[^}]*font-size:\s*14px/);
    expect(cssText).toMatch(/\.external-controller-conditions summary\s*\{[^}]*cursor:\s*pointer/);
  });

  it("selects local execution for an eligible zone without external configuration", () => {
    const container = document.createElement("div");
    const viewHost = {
      _data: {
        external_execution: {
          systems: [{
            provider: "ramses_cc",
            name: "RAMSES RF",
            entities: ["climate.office"],
            capabilities: {
              can_publish: true,
              can_import: false,
              supports_profile_schedules: true,
              supported_actions: ["set_temperature"],
              supported_hvac_modes: ["heat"],
              supported_target_types: ["scalar"],
              supported_option_fields: [],
              max_switchpoints_per_day: 6,
              time_step_minutes: 5,
              implicit_midnight_change_counts_toward_limit: true,
            },
          }],
          zones: {},
        },
      },
      _friendlyEntityName: () => "Office",
      _setZoneExecution: vi.fn(),
      _settingsSaving: false,
      _t: (key: string) => key,
    } as unknown as VelairViewHost;

    render(renderExternalSystemsSettings(viewHost), container);

    expect((container.querySelector(".external-system-zone select") as HTMLSelectElement).value)
      .toBe("");
    expect(container.querySelector(".external-controllers-in-use")).toBeNull();
  });

  it("restores the backend selection when external execution is rejected", async () => {
    const container = document.createElement("div");
    const setZoneExecution = vi.fn().mockResolvedValue(false);
    const viewHost = {
      _data: {
        external_execution: {
          systems: [{
            provider: "ramses_cc",
            name: "RAMSES RF",
            entities: ["climate.office"],
            capabilities: {
              can_publish: true,
              can_import: false,
              supports_profile_schedules: true,
              supported_actions: ["set_temperature"],
              supported_hvac_modes: ["heat"],
              supported_target_types: ["scalar"],
              supported_option_fields: [],
              max_switchpoints_per_day: 6,
              time_step_minutes: 5,
              implicit_midnight_change_counts_toward_limit: true,
            },
          }],
          zones: {},
        },
      },
      _friendlyEntityName: () => "Office",
      _setZoneExecution: setZoneExecution,
      _settingsSaving: false,
      _t: (key: string) => key,
    } as unknown as VelairViewHost;

    render(renderExternalSystemsSettings(viewHost), container);
    const select = container.querySelector(".external-system-zone select") as HTMLSelectElement;
    select.value = "ramses_cc";
    select.dispatchEvent(new Event("change"));

    await vi.waitFor(() => expect(select.value).toBe(""));
    expect(setZoneExecution).toHaveBeenCalledWith("climate.office", "ramses_cc");
  });

  it("shows one conditions block for a controller used by multiple zones", () => {
    const container = document.createElement("div");
    const capabilities = {
      can_publish: true,
      can_import: false,
      supports_profile_schedules: true,
      supported_actions: ["set_temperature"],
      supported_hvac_modes: ["heat"],
      supported_target_types: ["scalar"],
      supported_option_fields: [],
      max_switchpoints_per_day: 6,
      time_step_minutes: 5,
      implicit_midnight_change_counts_toward_limit: true,
    };
    const viewHost = {
      _data: {
        external_execution: {
          systems: [{
            provider: "ramses_cc",
            name: "RAMSES RF",
            entities: ["climate.office", "climate.bedroom"],
            capabilities,
          }],
          zones: {
            "climate.office": { type: "external", provider: "ramses_cc", available: true, publication: null },
            "climate.bedroom": { type: "external", provider: "ramses_cc", available: true, publication: null },
          },
        },
      },
      _friendlyEntityName: (entityId: string) => entityId,
      _setZoneExecution: vi.fn(),
      _settingsSaving: false,
      _t: (key: string, replacements?: Record<string, string | number>) =>
        `${key}${replacements ? JSON.stringify(replacements) : ""}`,
    } as unknown as VelairViewHost;

    render(renderExternalSystemsSettings(viewHost), container);

    expect(container.querySelectorAll(".external-controller-conditions")).toHaveLength(1);
    expect(container.querySelector(".external-controller-conditions")?.textContent).toContain("RAMSES RF");
    expect(container.querySelector(".external-controller-conditions")?.textContent).toContain('"count":6');
    expect(container.querySelector(".external-controller-conditions")?.textContent).toContain('"minutes":5');
  });

  it("retains registered controller metadata when selected but unavailable", () => {
    const container = document.createElement("div");
    const viewHost = {
      _data: {
        external_execution: {
          systems: [{
            provider: "ramses_cc",
            name: "Evohome via ramses_cc",
            entities: ["climate.office"],
            capabilities: {
              can_publish: true,
              can_import: false,
              supports_profile_schedules: true,
              supported_actions: ["set_temperature"],
              supported_hvac_modes: ["heat"],
              supported_target_types: ["scalar"],
              supported_option_fields: [],
              max_switchpoints_per_day: 6,
              time_step_minutes: 5,
              implicit_midnight_change_counts_toward_limit: true,
            },
          }],
          zones: {
            "climate.office": {
              type: "external",
              provider: "ramses_cc",
              available: false,
              publication: null,
            },
          },
        },
      },
      _friendlyEntityName: () => "Office",
      _setZoneExecution: vi.fn(),
      _settingsSaving: false,
      _t: (key: string) => key,
    } as unknown as VelairViewHost;

    render(renderExternalSystemsSettings(viewHost), container);

    expect(container.querySelector('option[value="ramses_cc"]')?.textContent)
      .toContain("Evohome via ramses_cc");
    expect(container.querySelector('option[value="ramses_cc"]')?.textContent)
      .toContain("externalProviderUnavailable");
    expect(container.querySelector(".external-controller-conditions")?.textContent)
      .toContain("Evohome via ramses_cc");
  });

  it("uses a safe fallback for an unknown selected controller", () => {
    const container = document.createElement("div");
    const viewHost = {
      _data: {
        external_execution: {
          systems: [],
          zones: {
            "climate.office": {
              type: "external",
              provider: "future_provider",
              available: false,
              publication: null,
            },
          },
        },
      },
      _friendlyEntityName: () => "Office",
      _setZoneExecution: vi.fn(),
      _settingsSaving: false,
      _t: (key: string) => key,
    } as unknown as VelairViewHost;

    render(renderExternalSystemsSettings(viewHost), container);

    expect(container.querySelector(".external-controller-conditions")?.textContent)
      .toContain("future_provider");
    expect(container.querySelector(".external-controller-conditions")?.textContent)
      .toContain("externalConditionsUnavailable");
  });

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

  it("shows and saves a fallback only when Home Assistant omits the target step", () => {
    const container = document.createElement("div");
    const viewHost = host(false);
    delete viewHost.hass!.states!["climate.office"].attributes!.target_temp_step;
    viewHost._data!.zones["climate.office"].target_temp_step_override = 0.5;

    render(renderSettingsTargetTempStep(viewHost, "climate.office"), container);

    const input = container.querySelector(".settings-target-temp-step-control input") as HTMLInputElement;
    expect(input.value).toBe("0.5");
    input.value = "0.25";
    input.dispatchEvent(new Event("change"));
    expect(viewHost._saveZoneTargetTempStep).toHaveBeenCalledWith("climate.office", 0.25);
  });

  it("uses one as the fallback default and hides a retained override when a step is published", () => {
    const container = document.createElement("div");
    const viewHost = host(false);
    delete viewHost.hass!.states!["climate.office"].attributes!.target_temp_step;

    render(renderSettingsTargetTempStep(viewHost, "climate.office"), container);
    expect((container.querySelector("input") as HTMLInputElement).value).toBe("1");

    viewHost._data!.zones["climate.office"].target_temp_step_override = 0.25;
    viewHost.hass!.states!["climate.office"].attributes!.target_temp_step = 0.5;
    render(renderSettingsTargetTempStep(viewHost, "climate.office"), container);
    expect(container.querySelector(".settings-target-temp-step")).toBeNull();
    expect(viewHost._data!.zones["climate.office"].target_temp_step_override).toBe(0.25);
  });

  it("shows the retained last-reported step when the entity stops publishing it", () => {
    const container = document.createElement("div");
    const viewHost = host(false);
    delete viewHost.hass!.states!["climate.office"].attributes!.target_temp_step;
    viewHost._data!.zones["climate.office"].last_reported_target_temp_step = 0.5;
    viewHost._data!.zones["climate.office"].target_temp_step_override = 1;

    render(renderSettingsTargetTempStep(viewHost, "climate.office"), container);

    expect((container.querySelector("input") as HTMLInputElement).value).toBe("0.5");
  });

  it("shows and saves the fallback in the climate's Fahrenheit unit", () => {
    const container = document.createElement("div");
    const viewHost = host(false);
    delete viewHost.hass!.states!["climate.office"].attributes!.target_temp_step;
    viewHost._data!.zones["climate.office"].last_reported_target_temp_step = 0.9;
    viewHost._temperatureUnit = () => "°F";
    viewHost._entityTemperatureLimits = () => [41, 95];

    render(renderSettingsTargetTempStep(viewHost, "climate.office"), container);

    const control = container.querySelector(".settings-target-temp-step-control") as HTMLElement;
    const input = control.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("0.9");
    expect(control.textContent).toContain("°F");
    input.value = "1.8";
    input.dispatchEvent(new Event("change"));
    expect(viewHost._saveZoneTargetTempStep).toHaveBeenCalledWith("climate.office", 1.8);
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

  it("aligns the temperature-step control without changing the external policy layout", () => {
    const cssText = settingsStyles.cssText;
    expect(cssText).toMatch(/\.settings-external-policy\s*\{[^}]*display:\s*flex[^}]*flex-wrap:\s*wrap/);
    expect(cssText).toMatch(/\.settings-policy-controls\s*\{[^}]*display:\s*flex[^}]*flex:\s*0 1 auto[^}]*gap:\s*8px/);
    expect(cssText).toMatch(/\.settings-policy-controls > \.select-wrap\s*\{[^}]*flex:\s*0 1 170px[^}]*height:\s*34px[^}]*margin:\s*0[^}]*width:\s*170px/);
    expect(cssText).toMatch(/\.settings-target-temp-step > \.settings-policy-heading\s*\{[^}]*flex:\s*0 0 142px/);
    expect(cssText).toMatch(/\.settings-target-temp-step-control\s*\{[^}]*max-width:\s*100%[^}]*width:\s*170px/);
    expect(cssText).toMatch(/\.settings-external-policy \.select-wrap select\s*\{[^}]*height:\s*100%[^}]*margin:\s*0[^}]*width:\s*100%/);
    expect(cssText).toMatch(/\.settings-policy-duration\s*\{[^}]*flex:\s*0 1 105px[^}]*height:\s*34px/);
    expect(cssText).toMatch(/\.settings-policy-duration input\s*\{[^}]*border-radius:\s*0[^}]*box-shadow:\s*none[^}]*margin:\s*0[^}]*outline:\s*0/);
    expect(cssText).toMatch(/\.settings-policy-duration:focus-within\s*\{[^}]*border-color:\s*var\(--primary-color\)[^}]*box-shadow:\s*0 0 0 1px var\(--primary-color\)/);
    expect(cssText).toMatch(/@media \(max-width: 480px\)[\s\S]*\.settings-external-policy\s*\{[^}]*flex-direction:\s*column/);
    expect(cssText).toMatch(/@media \(max-width: 480px\)[\s\S]*\.settings-policy-controls\s*\{[^}]*width:\s*100%/);
    expect(cssText).toMatch(/@media \(max-width: 480px\)[\s\S]*\.settings-policy-controls > \.select-wrap\s*\{[^}]*flex:\s*1 1 160px[^}]*max-width:\s*170px/);
    expect(cssText).toMatch(/@media \(max-width: 480px\)[\s\S]*\.settings-target-temp-step\s*\{[^}]*flex-direction:\s*column/);
    expect(cssText).not.toContain("external-adjustment-popover");
  });
});
