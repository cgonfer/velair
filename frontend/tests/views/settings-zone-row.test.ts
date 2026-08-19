// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import { settingsStyles } from "../../src/velair/styles/settings-styles";
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
    _t: (key: string) => key,
    _temperatureUnit: () => "\u00b0C",
  } as unknown as VelairViewHost;
}

describe("settings climate row", () => {
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
});
