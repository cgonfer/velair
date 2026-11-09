// @vitest-environment jsdom
import { translate } from "../../src/velair/i18n";

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import { inlineHelpStyles } from "../../src/velair/styles/inline-help-styles";
import { sensorsStyles } from "../../src/velair/styles/sensors-styles";
import { renderSensorsView } from "../../src/velair/views/sensors-view";

function host(options: {
  activeFrom?: string | null;
  appliedOffset?: number | null;
  appliedRange?: [number, number];
  appliedTemperature?: number;
  calculatedTemperature?: number;
  preStepTemperature?: number;
  targetTempStep?: number;
  climateRange?: [number, number];
  climateTargetTemperature?: number;
  entityExists?: boolean;
  expandedZoneIds?: string[];
  hvacMode?: string | null;
  hysteresisPhase?: "towards_lower" | "towards_upper";
  hysteresisTarget?: number;
  maxDelta?: number;
  limitedBy?: "minimum" | "maximum";
  limitTemperature?: number;
  requestedRange?: [number, number];
  requestedTemperature?: number;
  scheduledTargetGuard?: "heating_ceiling" | "cooling_floor";
  debounceSeconds?: number;
  deadband?: number;
  roomTemperatureEntityId?: string | null;
  assistEnabled?: boolean;
  assistDelta?: number;
  direction?: "heat" | "cool";
  roomAssistStatus?: "assisting" | "holding" | "idle" | "ready" | "blocked";
  roomTemperature?: number;
  scheduledRange?: [number, number];
  scheduledTargetTemperature?: number;
  rangeShift?: number;
  targetWhen?: string | null;
  thermostatTemperature?: number;
} = {}) {
  const saveZonePreconditioning = vi.fn(async () => {});
  const togglePreconditioningZone = vi.fn();
  const viewHost = {
    _data: {
      configured_entities: ["climate.first", "climate.second"],
      zones: {
        "climate.first": {
          enabled: true,
          preconditioning: {
            room_temperature_entity_id: options.roomTemperatureEntityId ?? null,
            room_sensor_assist_enabled: options.assistEnabled ?? false,
            room_sensor_assist_deadband: options.deadband ?? 0.3,
            room_sensor_assist_max_delta: options.maxDelta ?? 5,
            room_sensor_assist_debounce_seconds: options.debounceSeconds ?? 20,
          },
          schedule: {},
        },
        "climate.second": {
          enabled: true,
          preconditioning: {
            room_temperature_entity_id: "sensor.bedroom_temperature",
            room_sensor_assist_enabled: true,
            room_sensor_assist_deadband: options.deadband ?? 0.3,
            room_sensor_assist_max_delta: 2,
            room_sensor_assist_debounce_seconds: options.debounceSeconds ?? 20,
          },
          schedule: {},
        },
      },
      room_sensor_assist: {
        "climate.second": {
          status: options.roomAssistStatus ?? "assisting",
          enabled: true,
          configured: true,
          room_temperature_entity_id: "sensor.bedroom_temperature",
          target_temperature: options.scheduledRange
            ? null
            :
            options.roomAssistStatus === "idle"
              ? null
              : (options.scheduledTargetTemperature ?? 25),
          target_temp_low: options.scheduledRange?.[0],
          target_temp_high: options.scheduledRange?.[1],
          applied_temperature: options.appliedRange
            ? null
            :
            options.roomAssistStatus === "idle"
              ? null
              : (options.appliedTemperature ?? 22),
          applied_target_temp_low: options.appliedRange?.[0],
          applied_target_temp_high: options.appliedRange?.[1],
          climate_target_temperature: options.climateTargetTemperature ?? 21,
          climate_target_temp_low: options.climateRange?.[0],
          climate_target_temp_high: options.climateRange?.[1],
          room_temperature: options.roomTemperature ?? 20,
          climate_temperature: options.thermostatTemperature ?? 17.1,
          applied_offset: options.appliedOffset,
          range_shift: options.rangeShift,
          limited_by: options.limitedBy,
          limit_temperature: options.limitTemperature,
          requested_temperature: options.requestedTemperature,
          calculated_temperature: options.calculatedTemperature,
          pre_step_temperature: options.preStepTemperature,
          target_temp_step: options.targetTempStep,
          scheduled_target_guard: options.scheduledTargetGuard,
          requested_target_temp_low: options.requestedRange?.[0],
          requested_target_temp_high: options.requestedRange?.[1],
          assist_delta: options.assistDelta ?? 5,
          direction: options.direction ?? "heat",
          hysteresis_phase: options.hysteresisPhase,
          hysteresis_target: options.hysteresisTarget,
          hvac_mode: options.hvacMode === undefined ? "heat" : options.hvacMode,
          weekday: "tuesday",
          start: options.roomAssistStatus === "idle" ? null : "17:00",
          active_from:
            options.roomAssistStatus === "idle"
              ? null
              : (options.activeFrom ?? "2026-05-19T17:00:00+00:00"),
          target_when: options.targetWhen ?? null,
        },
      },
    },
    hass: {
      config: {
        unit_system: {
          temperature: "°C",
        },
      },
      states: {
        "sensor.bedroom_temperature": {
          state: "20.4",
          attributes: {
            device_class: "temperature",
            friendly_name: "Bedroom temperature",
            unit_of_measurement: "°C",
          },
        },
      },
    },
    _expandedPreconditioningZones: new Set(options.expandedZoneIds ?? []),
    _entityExists: () => options.entityExists ?? true,
    _formatTemperature: (value: number) => `${value} °C`,
    _formatDateTime: (value: string) => value,
    _formatScheduleTime: (value: string) => value,
    _friendlyEntityName: (entityId: string) =>
      entityId === "climate.first" ? "First" : "Second",
    _modeLabel: (mode: string) => `mode:${mode}`,
    _saveZonePreconditioning: saveZonePreconditioning,
    _settingsSaving: false,
    _t: (key: string, replacements?: Record<string, string | number>) =>
      replacements
        ? `${key}:${Object.entries(replacements)
            .map(([replacementKey, value]) => `${replacementKey}=${value}`)
            .join(",")}`
        : key,
    _weekdayName: (day: string) => day,
    _shortWeekdayName: (day: string) => day.slice(0, 3),
    _temperatureUnit: () => "°C",
    _togglePreconditioningZone: togglePreconditioningZone,
  } as unknown as VelairViewHost;

  return {
    saveZonePreconditioning,
    togglePreconditioningZone,
    viewHost,
  };
}

describe("sensors view", () => {
  it("contains the wide temperature track inside the Room Assist card", () => {
    const styles = sensorsStyles.cssText;

    expect(styles).toMatch(/\.sensors-view\s*\{[^}]*max-width:\s*100%;[^}]*min-width:\s*0;/s);
    expect(styles).toMatch(
      /\.sensor-config-section,\s*\.sensor-runtime-section\s*\{[^}]*max-width:\s*100%;[^}]*min-width:\s*0;/s,
    );
    expect(styles).toMatch(
      /\.sensor-temperature-scale\s*\{[^}]*box-sizing:\s*border-box;[^}]*max-width:\s*100%;[^}]*overflow-x:\s*auto;[^}]*width:\s*100%;/s,
    );
    expect(styles).toMatch(/\.sensor-scale-track\s*\{[^}]*min-width:\s*640px;/s);
  });

  it("delegates Room Assist interactive help to the shared inline help", () => {
    const styles = sensorsStyles.cssText;
    expect(styles).not.toContain(".sensor-help");
    expect(styles).not.toContain(".sensor-help-tooltip");
  });

  it("renders climates in the provided user order", () => {
    const { viewHost } = host();
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second", "climate.first"]), container);

    expect(
      [...container.querySelectorAll(".sensor-zone-identity strong")]
        .map((element) => element.textContent?.trim()),
    ).toEqual(["Second", "First"]);
  });

  it("renders climates collapsed by default and requests expansion from the heading", () => {
    const { togglePreconditioningZone, viewHost } = host();
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.first"]), container);

    const zone = container.querySelector(".sensor-zone");
    const toggle = container.querySelector<HTMLButtonElement>(".sensor-zone-toggle");
    expect(zone?.classList).toContain("collapsed");
    expect(container.querySelector(".sensor-zone-content")).toBeNull();
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(toggle?.getAttribute("aria-label")).toBe("roomSensorExpandClimate:climate=First");

    toggle?.click();
    expect(togglePreconditioningZone).toHaveBeenCalledWith("climate.first");
  });

  it("lets the whole climate heading toggle the collapsed row", () => {
    const { togglePreconditioningZone, viewHost } = host();
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.first"]), container);

    container.querySelector<HTMLElement>(".sensor-zone-heading")?.click();

    expect(togglePreconditioningZone).toHaveBeenCalledWith("climate.first");
  });

  it("keeps a saved room sensor selected when the view is rendered again", async () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.first"], roomTemperatureEntityId: "sensor.bedroom_temperature" });
    const container = document.createElement("div");
    document.body.append(container);
    render(renderSensorsView(viewHost, ["climate.first"]), container);
    const reference = container.querySelector("velair-room-sensor-schedule") as ReferenceElement;
    await reference.updateComplete;
    const picker = reference.shadowRoot!.querySelector<HTMLSelectElement>('[data-field="fixed-source"]')!;
    expect(picker.value).toBe("sensor.bedroom_temperature");
    expect(picker.selectedOptions[0]?.textContent).toContain("Bedroom temperature");
    render(renderSensorsView(viewHost, ["climate.first"]), container);
    await reference.updateComplete;
    expect(picker.value).toBe("sensor.bedroom_temperature");
    container.remove();
  });

  it("disables assist until a room sensor is configured", () => {
    const { viewHost } = host();
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.first"]), container);

    const control = container.querySelector(".sensor-enable-control");
    const toggle = control?.querySelector("ha-switch");
    expect(control?.getAttribute("title")).toBe("roomSensorNotConfigured");
    expect(toggle?.hasAttribute("disabled")).toBe(true);
  });

  it("persists assist enable changes for the selected climate", () => {
    const { saveZonePreconditioning, viewHost } = host({
      roomTemperatureEntityId: "sensor.bedroom_temperature",
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.first"]), container);
    const toggle = container.querySelector("ha-switch") as HTMLElement & {
      checked: boolean;
    };
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));

    expect(saveZonePreconditioning).toHaveBeenCalledWith(
      "climate.first",
      { room_sensor_assist_enabled: true },
    );
  });

  it("shows and persists the Room Assist refresh delay", () => {
    const { saveZonePreconditioning, viewHost } = host({
      assistEnabled: true,
      debounceSeconds: 30,
      expandedZoneIds: ["climate.first"],
      roomTemperatureEntityId: "sensor.bedroom_temperature",
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.first"]), container);

    expect(container.textContent).toContain("roomSensorAssistDebounce");
    const debounceInput = [
      ...container.querySelectorAll<HTMLInputElement>(".sensor-number-input input"),
    ].find((input) => input.value === "30");
    expect(debounceInput).not.toBeUndefined();
    expect(debounceInput?.getAttribute("min")).toBe("0");
    expect(debounceInput?.getAttribute("max")).toBe("300");
    expect(debounceInput?.getAttribute("step")).toBe("1");

    debounceInput!.value = "10";
    debounceInput!.dispatchEvent(new Event("change", { bubbles: true }));

    expect(saveZonePreconditioning).toHaveBeenCalledWith(
      "climate.first",
      { room_sensor_assist_debounce_seconds: 10 },
    );

    debounceInput!.value = "500";
    debounceInput!.dispatchEvent(new Event("change", { bubbles: true }));

    expect(saveZonePreconditioning).toHaveBeenCalledWith(
      "climate.first",
      { room_sensor_assist_debounce_seconds: 300 },
    );
  });

  it("renders and strictly validates Room Assist deadband before maximum delta", () => {
    const { saveZonePreconditioning, viewHost } = host({
      assistEnabled: true,
      deadband: 0.3,
      expandedZoneIds: ["climate.first"],
      roomTemperatureEntityId: "sensor.bedroom_temperature",
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.first"]), container);

    const labels = [...container.querySelectorAll(".sensor-config-row")]
      .map((label) => label.textContent ?? "");
    expect(labels.findIndex((label) => label.includes("roomSensorAssistDeadband")))
      .toBeLessThan(labels.findIndex((label) => label.includes("roomSensorAssistMaxDelta")));
    const input = [...container.querySelectorAll<HTMLInputElement>("input[type='number']")]
      .find((candidate) => candidate.value === "0.3")!;
    expect(input.getAttribute("min")).toBe("0");
    expect(input.getAttribute("max")).toBe("5");
    expect(input.getAttribute("step")).toBe("0.1");
    expect(input.closest(".sensor-config-row")?.textContent).toContain("°C");
    expect(input.closest(".sensor-config-row")?.textContent).toContain("roomSensorAssistDeadbandHelp");

    for (const invalidValue of [
      "",
      "letters",
      "-0.1",
      "0.05",
      "5.1",
      "Infinity",
      "NaN",
    ]) {
      input.value = invalidValue;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      expect(input.value).toBe("0.3");
    }
    expect(saveZonePreconditioning).not.toHaveBeenCalled();

    input.value = "0";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZonePreconditioning).toHaveBeenCalledWith(
      "climate.first",
      { room_sensor_assist_deadband: 0 },
    );

    input.value = "5";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZonePreconditioning).toHaveBeenCalledWith(
      "climate.first",
      { room_sensor_assist_deadband: 5 },
    );
  });

  it("uses native Fahrenheit deadband defaults and bounds", () => {
    const { saveZonePreconditioning, viewHost } = host({
      assistEnabled: true,
      deadband: 1,
      expandedZoneIds: ["climate.first"],
      roomTemperatureEntityId: "sensor.bedroom_temperature",
    });
    (viewHost as unknown as { _temperatureUnit: () => string })._temperatureUnit =
      () => "°F";
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.first"]), container);

    const input = [...container.querySelectorAll<HTMLInputElement>("input[type='number']")]
      .find((candidate) => candidate.value === "1")!;
    expect(input.getAttribute("min")).toBe("0");
    expect(input.getAttribute("max")).toBe("9");
    expect(input.getAttribute("step")).toBe("0.1");
    expect(input.closest(".sensor-config-row")?.textContent).toContain("°F");

    input.value = "9";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZonePreconditioning).toHaveBeenCalledWith(
      "climate.first",
      { room_sensor_assist_deadband: 9 },
    );
  });

  it("shows live room sensor assist values when a sensor is configured", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.second"] });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    expect(container.textContent).toContain("roomSensorIntroTitle");
    expect(container.textContent).toContain("roomSensorIntroDetail");
    expect(container.querySelector(".sensor-runtime-section")).not.toBeNull();
    expect(container.querySelectorAll(".sensor-status-pill")).toHaveLength(1);
    expect(container.querySelector(".sensor-status-pill")?.textContent).toContain(
      "roomSensorStatusAssisting",
    );
    expect(container.textContent).toContain("roomSensorBlockScheduled:time=17:00");
    expect(container.textContent).toContain("roomSensorBlockActiveSince:time=17:00");
    expect(container.textContent).toContain("roomSensorBlockTarget:target=25 °C");
    expect(container.textContent).toContain("roomSensorBlockMode:mode=mode:heat");
    const scale = container.querySelector(".sensor-temperature-scale");
    expect(scale).not.toBeNull();
    expect(scale?.classList).toContain("mode-heat");
    expect(container.querySelector(".sensor-scale-track")?.getAttribute("aria-label")).toBe(
      "roomSensorTemperatureScale",
    );
    expect(container.querySelector(".sensor-scale-track")?.getAttribute("role")).toBe("group");
    expect(container.querySelectorAll(".sensor-scale-marker")).toHaveLength(4);
    expect(container.querySelectorAll(".sensor-scale-callout")).toHaveLength(4);
    expect(container.querySelectorAll(".sensor-scale-metric")).toHaveLength(0);
    expect(container.querySelector(".sensor-scale-room-gap")?.textContent)
      .toContain("roomSensorGapBelowTarget:value=5 °C");
    expect(container.querySelector(".sensor-scale-assist-offset.assist-offset-active")).not.toBeNull();
    expect(container.querySelector(".sensor-scale-assist-offset")?.getAttribute("aria-label"))
      .toBe("roomSensorAssistCorrectionValue:value=+5 °C. roomSensorAssistCorrectionActiveHelp");
    expect(container.querySelector(".sensor-scale-assist-offset")?.getAttribute("role"))
      .toBe("note");
    const relationBounds = (selector: string) => {
      const element = container.querySelector<HTMLElement>(selector)!;
      const left = Number.parseFloat(element.style.left);
      return [left, left + Number.parseFloat(element.style.width)];
    };
    const markerPosition = (selector: string) => Number.parseFloat(
      container.querySelector<HTMLElement>(selector)!.style.left,
    );
    const roomGapBounds = relationBounds(".sensor-scale-room-gap");
    expect(roomGapBounds[0]).toBeCloseTo(markerPosition(".sensor-scale-marker.marker-room"), 1);
    expect(roomGapBounds[1]).toBeCloseTo(markerPosition(".sensor-scale-marker.marker-target"), 1);
    const assistOffsetBounds = relationBounds(".sensor-scale-assist-offset");
    expect(assistOffsetBounds[0]).toBeCloseTo(markerPosition(".sensor-scale-marker.marker-climate"), 1);
    expect(assistOffsetBounds[1]).toBeCloseTo(markerPosition(".sensor-scale-marker.marker-climateTarget"), 1);
    expect(container.querySelector(".sensor-scale-offset")).not.toBeNull();
    expect(container.querySelector(".marker-climateTarget .inline-help")).not.toBeNull();
    expect(container.querySelector(".marker-climateTarget .inline-help")?.getAttribute("aria-label"))
      .toBe("roomSensorClimateTargetAppliedHelp");
    expect(
      container.querySelector(".marker-climateTarget .sensor-scale-value-row .sensor-scale-offset"),
    ).not.toBeNull();
    expect(
      [...container.querySelectorAll(".sensor-scale-marker, .sensor-scale-callout-marker")]
        .map((element) => element.getAttribute("title")),
    ).toEqual([null, null, null, null, null, null, null, null]);
    expect(container.querySelector(".sensor-scale-legend")).toBeNull();
    expect(container.textContent).toContain("roomSensorAssistCorrectionValue:value=+5 °C");
    expect(container.textContent).toContain("+5 °C");
    expect(container.textContent).toContain("roomSensorScheduledTarget");
    expect(container.textContent).toContain("roomSensorRoomTemperature");
    expect(container.textContent).toContain("roomSensorClimateTarget");
    expect(container.textContent).toContain("roomSensorClimateTemperature");
    expect(container.textContent).toContain("25 °C");
    expect(container.textContent).toContain("22 °C");
    expect(container.textContent).toContain("17.1 °C");
  });

  it("explains the climate target and adds exact step alignment details when present", () => {
    const { viewHost } = host({
      appliedOffset: -0.6,
      appliedTemperature: 24,
      expandedZoneIds: ["climate.second"],
      preStepTemperature: 23.9,
      targetTempStep: 0.5,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const help = container.querySelector(
      ".marker-climateTarget .inline-help",
    ) as HTMLButtonElement;
    const expected = "roomSensorClimateTargetAppliedHelp "
      + "roomSensorClimateTargetStepHelp:calculated=23.9 °C,step=0.5 °C,applied=24 °C";
    expect(help?.getAttribute("aria-label")).toBe(expected);
    expect(help?.type).toBe("button");
    const tooltipId = help?.getAttribute("aria-describedby");
    const tooltip = tooltipId ? container.querySelector<HTMLElement>(`#${tooltipId}`) : null;
    expect(tooltip?.getAttribute("role")).toBe("tooltip");
    expect(tooltip?.textContent?.trim()).toBe(expected);
    help.click();
    expect(tooltip?.classList).toContain("visible");
    help.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
    expect(tooltip?.classList).not.toContain("visible");
  });

  it("keeps the base climate-target explanation when no step alignment occurred", () => {
    const { viewHost } = host({
      appliedOffset: 0,
      appliedTemperature: 24,
      expandedZoneIds: ["climate.second"],
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const help = container.querySelector(
      ".marker-climateTarget .inline-help",
    );
    expect(help?.getAttribute("aria-label")).toBe("roomSensorClimateTargetAppliedHelp");
    expect(help?.parentElement?.textContent).not.toContain("roomSensorClimateTargetStepHelp");
  });

  it("uses the always-valid climate-target explanation while Room Assist is ready", () => {
    const { viewHost } = host({
      expandedZoneIds: ["climate.second"],
      roomAssistStatus: "ready",
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const help = container.querySelector(".marker-climateTarget .inline-help");
    expect(help?.getAttribute("aria-label")).toBe("roomSensorClimateTargetHelp");
    expect(help?.getAttribute("aria-label")).not.toContain("roomSensorClimateTargetStepHelp");
  });

  it("describes the visible applied target while holding and the reported target while blocked", () => {
    const holding = host({
      appliedTemperature: 24,
      climateTargetTemperature: 21,
      expandedZoneIds: ["climate.second"],
      roomAssistStatus: "holding",
    });
    const blocked = host({
      appliedTemperature: 24,
      climateTargetTemperature: 21,
      expandedZoneIds: ["climate.second"],
      roomAssistStatus: "blocked",
    });
    const holdingContainer = document.createElement("div");
    const blockedContainer = document.createElement("div");

    render(renderSensorsView(holding.viewHost, ["climate.second"]), holdingContainer);
    render(renderSensorsView(blocked.viewHost, ["climate.second"]), blockedContainer);

    expect(holdingContainer.querySelector(".marker-climateTarget strong")?.textContent)
      .toContain("24 °C");
    expect(holdingContainer.querySelector(".marker-climateTarget .inline-help")
      ?.getAttribute("aria-label")).toBe("roomSensorClimateTargetAppliedHelp");
    expect(blockedContainer.querySelector(".marker-climateTarget strong")?.textContent)
      .toContain("21 °C");
    expect(blockedContainer.querySelector(".marker-climateTarget .inline-help")
      ?.getAttribute("aria-label")).toBe("roomSensorClimateTargetHelp");
  });

  it.each([
    ["towards_lower", 24.7, "roomSensorHysteresisTowardsLower:target=24.7 °C", "mdi:arrow-down-bold-circle-outline"],
    ["towards_upper", 25.3, "roomSensorHysteresisTowardsUpper:target=25.3 °C", "mdi:arrow-up-bold-circle-outline"],
  ] as const)("shows the active fixed-direction hysteresis phase %s", (
    hysteresisPhase,
    hysteresisTarget,
    label,
    icon,
  ) => {
    const { viewHost } = host({
      expandedZoneIds: ["climate.second"],
      hysteresisPhase,
      hysteresisTarget,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    expect(container.textContent).toContain(label);
    expect(container.querySelector(`ha-icon[icon="${icon}"]`)).not.toBeNull();
    expect(container.querySelector(".sensor-scale-deadband-zone")?.classList)
      .toContain(hysteresisPhase === "towards_lower" ? "towards-lower" : "towards-upper");
  });

  it("draws and explains the scalar deadband without clipping its endpoints", () => {
    const { viewHost } = host({
      deadband: 0.3,
      expandedZoneIds: ["climate.second"],
      hysteresisPhase: "towards_lower",
      hysteresisTarget: 24.7,
      scheduledTargetTemperature: 25,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const zone = container.querySelector<HTMLElement>(".sensor-scale-deadband-zone")!;
    const left = Number.parseFloat(zone.style.left);
    const right = left + Number.parseFloat(zone.style.width);
    expect(left).toBeGreaterThan(0);
    expect(right).toBeLessThan(100);
    expect(zone.getAttribute("aria-hidden")).toBe("true");
    const legend = container.querySelector(".sensor-scale-deadband-legend");
    expect(legend?.getAttribute("aria-label")).toBe(
      "roomSensorDeadbandZoneSingle:value=0.3 °C. 24.7–25.3 °C. roomSensorDeadbandZoneHelp",
    );
    expect(legend?.querySelector(".sensor-scale-deadband-label-full")?.textContent?.trim())
      .toBe("roomSensorDeadbandZoneSingle:value=0.3 °C");
    const legendRange = container.querySelector<HTMLElement>(
      ".sensor-scale-deadband-legend-range",
    )!;
    expect(legendRange.style.marginLeft).toBe(zone.style.left);
    expect(legendRange.style.width).toBe(zone.style.width);
    expect(legendRange.querySelector(".sensor-scale-deadband-legend-anchor")).not.toBeNull();
    expect(sensorsStyles.cssText).toMatch(
      /\.sensor-scale-deadband-legend-range\s*\{[^}]*overflow:\s*visible;[^}]*position:\s*relative;/s,
    );
    expect(sensorsStyles.cssText).toMatch(
      /\.sensor-scale-deadband-legend-anchor\s*\{[^}]*left:\s*50%;[^}]*position:\s*absolute;[^}]*transform:\s*translateX\(-50%\);[^}]*width:\s*max-content;/s,
    );
    expect(sensorsStyles.cssText).toMatch(
      /\.sensor-scale-deadband-zone\s*\{[^}]*height:\s*20px;[^}]*top:\s*59px;/s,
    );
    expect(legend?.querySelector(".sensor-scale-deadband-label-short")).toBeNull();
    expect(legend?.querySelector(".sensor-scale-deadband-label-brief")).toBeNull();
    expect(legend?.querySelector(".sensor-scale-deadband-label-compact")).toBeNull();
  });

  it("describes a scalar automatic deadband as a neutral margin", () => {
    const { viewHost } = host({
      deadband: 0.3,
      expandedZoneIds: ["climate.second"],
      hvacMode: "auto",
      scheduledTargetTemperature: 25,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const legend = container.querySelector(".sensor-scale-deadband-legend");
    expect(legend?.getAttribute("aria-label")).toBe(
      "roomSensorDeadbandZoneAutomatic:value=0.3 °C. 24.7–25.3 °C. roomSensorDeadbandZoneHelpAutomatic",
    );
    expect(legend?.querySelector(".sensor-scale-deadband-label-full")?.textContent?.trim())
      .toBe("roomSensorDeadbandZoneAutomatic:value=0.3 °C");
  });

  it("keeps a fixed-mode control label while its runtime phase is unavailable", () => {
    const { viewHost } = host({
      deadband: 0.3,
      expandedZoneIds: ["climate.second"],
      hvacMode: "cool",
      roomAssistStatus: "ready",
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    expect(container.querySelector(".sensor-scale-deadband-legend")?.getAttribute("aria-label"))
      .toContain("roomSensorDeadbandZoneSingle:value=0.3 °C");
  });

  it("uses a generic deadband label when the effective mode is unknown", () => {
    const { viewHost } = host({
      deadband: 0.3,
      expandedZoneIds: ["climate.second"],
      hvacMode: null,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const ariaLabel = container.querySelector(".sensor-scale-deadband-legend")
      ?.getAttribute("aria-label");
    expect(ariaLabel).toContain("roomSensorDeadbandZoneGeneric:value=0.3 °C");
    expect(ariaLabel).toContain("roomSensorDeadbandZoneHelpGeneric");
  });

  it("shows one no-correction zone beyond both limits of a native range", () => {
    const { viewHost } = host({
      appliedRange: [21, 25],
      deadband: 0.5,
      expandedZoneIds: ["climate.second"],
      rangeShift: 1,
      scheduledRange: [20, 24],
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const zone = container.querySelector<HTMLElement>(".sensor-scale-deadband-zone")!;
    expect(zone).not.toBeNull();
    expect(zone.getAttribute("aria-hidden")).toBe("true");
    const legend = container.querySelector(".sensor-scale-deadband-legend");
    expect(legend?.getAttribute("aria-label")).toBe(
      "roomSensorDeadbandZoneRange:value=0.5 °C. 19.5–24.5 °C. roomSensorDeadbandZoneHelp",
    );
    expect(legend?.querySelector(".sensor-scale-deadband-label-full")?.textContent?.trim())
      .toBe("roomSensorDeadbandZoneRange:value=0.5 °C");
  });

  it("explains a zero deadband without drawing a misleading surface", () => {
    const { viewHost } = host({
      deadband: 0,
      expandedZoneIds: ["climate.second"],
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    expect(container.querySelector(".sensor-scale-deadband-zone")).toBeNull();
    const legend = container.querySelector(".sensor-scale-deadband-legend");
    expect(legend?.classList).toContain("is-zero");
    expect(legend?.textContent).toContain("roomSensorDeadbandZoneZero:value=0 °C");
    expect(container.querySelector(".sensor-scale-deadband-legend-track")).toBeNull();
  });

  it("updates the deadband graphic from the saved settings returned by the backend", () => {
    const { viewHost } = host({
      deadband: 0.3,
      expandedZoneIds: ["climate.second"],
      hysteresisPhase: "towards_lower",
      hysteresisTarget: 24.7,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);
    const initialWidth = Number.parseFloat(
      container.querySelector<HTMLElement>(".sensor-scale-deadband-zone")!.style.width,
    );
    (viewHost._data!.zones["climate.second"].preconditioning as { room_sensor_assist_deadband: number })
      .room_sensor_assist_deadband = 1;
    render(renderSensorsView(viewHost, ["climate.second"]), container);

    expect(container.querySelector(".sensor-scale-deadband-legend")?.textContent)
      .toContain("roomSensorDeadbandZoneSingle:value=1 °C");
    expect(Number.parseFloat(
      container.querySelector<HTMLElement>(".sensor-scale-deadband-zone")!.style.width,
    )).toBeGreaterThan(initialWidth);
  });

  it("hides the deadband setting, graphic and legend together", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.second"] });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"], { showDeadband: false }), container);

    expect(container.textContent).not.toContain("roomSensorAssistDeadband");
    expect(container.querySelector(".sensor-scale-deadband-zone")).toBeNull();
    expect(container.querySelector(".sensor-scale-deadband-legend")).toBeNull();
    expect(container.querySelector(".sensor-temperature-scale")).not.toBeNull();
  });

  it("can hide Room Assist controls and live status for Lovelace cards", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.second"] });
    const container = document.createElement("div");

    render(
      renderSensorsView(viewHost, ["climate.second"], {
        showAssistSwitch: false,
        showDeadband: false,
        showDebounce: false,
        showLiveStatus: false,
        showMaxDelta: false,
        showRoomSensor: false,
      }),
      container,
    );

    expect(container.querySelector("ha-switch")).toBeNull();
    expect(container.querySelector(".sensor-picker-row")).toBeNull();
    expect(container.textContent).not.toContain("roomSensorAssistMaxDelta");
    expect(container.textContent).not.toContain("roomSensorAssistDeadband");
    expect(container.textContent).not.toContain("roomSensorAssistDebounce");
    expect(container.querySelector(".sensor-runtime-section")).toBeNull();
    expect(container.querySelector(".sensor-zone-content")).not.toBeNull();
  });

  it("uses the active block mode on the temperature scale", () => {
    const { viewHost } = host({
      expandedZoneIds: ["climate.second"],
      hvacMode: "cool",
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    expect(container.querySelector(".sensor-temperature-scale")?.classList).toContain(
      "mode-cool",
    );
  });

  it("shows a neutral no-correction gap while Room Assist is holding", () => {
    const { viewHost } = host({
      assistDelta: 0,
      expandedZoneIds: ["climate.second"],
      roomAssistStatus: "holding",
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const offset = container.querySelector(".sensor-scale-assist-offset");
    expect(container.querySelector(".sensor-scale-room-gap")).not.toBeNull();
    expect(offset?.classList).toContain("assist-offset-holding");
    expect(offset?.textContent).toContain("roomSensorAssistNoCorrection");
    expect(offset?.getAttribute("aria-label"))
      .toBe("roomSensorAssistNoCorrection. roomSensorAssistNoCorrectionHelp");
    expect(
      container.querySelector(".sensor-scale-callout-marker.marker-climateTarget .sensor-scale-callout")
        ?.classList,
    ).toContain("has-offset");
  });

  it("shows the reported climate target while assistance is only ready", () => {
    const { viewHost } = host({
      appliedTemperature: 22,
      climateTargetTemperature: 21,
      expandedZoneIds: ["climate.second"],
      roomAssistStatus: "ready",
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    expect(
      container.querySelector(".marker-climateTarget .sensor-scale-value-row")
        ?.textContent,
    ).toContain("21 °C");
  });

  it("shows a signed cooling correction without claiming HVAC activity", () => {
    const { viewHost } = host({
      assistDelta: 2,
      direction: "cool",
      expandedZoneIds: ["climate.second"],
      hvacMode: "cool",
      climateTargetTemperature: 23,
      roomTemperature: 24,
      scheduledTargetTemperature: 22,
      thermostatTemperature: 25,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const offset = container.querySelector(".sensor-scale-assist-offset");
    expect(container.querySelector(".sensor-scale-room-gap")?.textContent)
      .toContain("roomSensorGapAboveTarget:value=2 °C");
    expect(offset?.classList).toContain("assist-offset-active");
    expect(offset?.textContent).toContain("roomSensorAssistCorrectionValue:value=-2 °C");
    expect(offset?.getAttribute("aria-label"))
      .toBe("roomSensorAssistCorrectionValue:value=-2 °C. roomSensorAssistCorrectionActiveHelp");
  });

  it("uses the signed applied offset while markers follow live applied and climate values", () => {
    const { viewHost } = host({
      appliedOffset: -2,
      appliedTemperature: 23,
      assistDelta: 2,
      climateTargetTemperature: 27,
      direction: "heat",
      expandedZoneIds: ["climate.second"],
      thermostatTemperature: 25,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    expect(container.querySelector(".sensor-scale-assist-offset")?.textContent)
      .toContain("roomSensorAssistCorrectionValue:value=-2 °C");
    expect(container.querySelector(".sensor-scale-callout-marker.marker-climateTarget")?.textContent)
      .toContain("23 °C");
    expect(container.querySelector(".sensor-scale-callout-marker.marker-climate")?.textContent)
      .toContain("25 °C");
  });

  it("relates a room below the scheduled range to the low boundaries", () => {
    const { viewHost } = host({
      appliedRange: [21, 25],
      direction: "heat",
      expandedZoneIds: ["climate.second"],
      rangeShift: 1,
      roomTemperature: 18,
      scheduledRange: [20, 24],
      thermostatTemperature: 19,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    expect(container.textContent).toContain("roomSensorBlockTarget:target=20–24 °C");
    expect(container.textContent).not.toContain("roomSensorRangeUnsupported");
    expect(container.querySelector(".sensor-scale-room-gap")?.textContent)
      .toContain("roomSensorGapBelowTarget:value=2 °C");
    expect(container.querySelector(".sensor-scale-assist-offset")?.textContent)
      .toContain("roomSensorRangeShiftValue:value=+1 °C");
    const scheduledBand = container.querySelector<HTMLElement>(".range-band-scheduled");
    const appliedBand = container.querySelector<HTMLElement>(".range-band-applied");
    expect(scheduledBand?.textContent).toContain("roomSensorScheduledRange");
    expect(scheduledBand?.textContent).toContain("20–24 °C");
    expect(appliedBand?.textContent).toContain("roomSensorAppliedRange");
    expect(appliedBand?.textContent).toContain("21–25 °C");
    expect(container.querySelector(".sensor-scale-callout-marker.marker-scheduledLow"))
      .toBeNull();
    expect(container.querySelector(".sensor-scale-callout-marker.marker-appliedLow"))
      .toBeNull();

    const center = (element: HTMLElement) =>
      Number.parseFloat(element.style.left) + Number.parseFloat(element.style.width) / 2;
    const offset = container.querySelector<HTMLElement>(".sensor-scale-assist-offset");
    const scheduledCenter = center(scheduledBand!);
    const appliedCenter = center(appliedBand!);
    expect(Number.parseFloat(offset!.style.left)).toBeCloseTo(
      Math.min(scheduledCenter, appliedCenter),
      2,
    );
    expect(Number.parseFloat(offset!.style.width)).toBeCloseTo(
      Math.abs(scheduledCenter - appliedCenter),
      1,
    );
  });

  it("shows a responsive warning before the graph when a range reaches a physical limit", () => {
    const { viewHost } = host({
      appliedRange: [21, 25],
      direction: "heat",
      expandedZoneIds: ["climate.second"],
      limitedBy: "maximum",
      limitTemperature: 25,
      rangeShift: 1,
      requestedRange: [29, 33],
      roomTemperature: 18,
      scheduledRange: [20, 24],
      thermostatTemperature: 24,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const warning = container.querySelector(".sensor-limit-warning");
    const graph = container.querySelector(".sensor-temperature-scale");
    expect(warning).not.toBeNull();
    expect(warning?.getAttribute("role")).toBe("status");
    expect(warning?.textContent).toContain("roomSensorLimitMaximumTitle");
    expect(warning?.textContent).toContain("requested=29–33 °C");
    expect(warning?.textContent).toContain("applied=21–25 °C");
    expect(warning?.textContent).toContain("limit=25 °C");
    expect(warning?.compareDocumentPosition(graph!) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });

  it("renders Fahrenheit range movement and limit details without converting native values", () => {
    const { viewHost } = host({
      appliedRange: [88, 95],
      direction: "heat",
      expandedZoneIds: ["climate.second"],
      limitedBy: "maximum",
      limitTemperature: 95,
      rangeShift: 20,
      requestedRange: [92, 99],
      roomTemperature: 64,
      scheduledRange: [68, 75],
      thermostatTemperature: 77,
    });
    (viewHost as unknown as { _temperatureUnit: () => string })._temperatureUnit =
      () => "°F";
    (viewHost as unknown as {
      _formatTemperature: (value: number) => string;
    })._formatTemperature = (value: number) => `${value} °F`;
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    expect(container.textContent).toContain("target=68–75 °F");
    expect(container.querySelector(".sensor-scale-assist-offset")?.textContent)
      .toContain("value=+20 °F");
    const warning = container.querySelector(".sensor-limit-warning");
    expect(warning?.textContent).toContain("requested=92–99 °F");
    expect(warning?.textContent).toContain("applied=88–95 °F");
    expect(warning?.textContent).toContain("limit=95 °F");
  });

  it("explains when the scheduled cooling target protects against further cooling", () => {
    const { viewHost } = host({
      appliedTemperature: 22,
      calculatedTemperature: 20,
      direction: "cool",
      expandedZoneIds: ["climate.second"],
      roomAssistStatus: "holding",
      roomTemperature: 21,
      scheduledTargetGuard: "cooling_floor",
      scheduledTargetTemperature: 22,
      thermostatTemperature: 19,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const info = container.querySelector(".sensor-safety-info");
    const graph = container.querySelector(".sensor-temperature-scale");
    expect(info).not.toBeNull();
    expect(info?.getAttribute("role")).toBe("status");
    expect(info?.textContent).toContain("roomSensorScheduledGuardTitle");
    expect(info?.textContent).toContain("calculated=20");
    expect(info?.textContent).toContain("applied=22");
    expect(info?.compareDocumentPosition(graph!) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });

  it("uses the symmetric heating explanation and stays hidden for old payloads", () => {
    const guarded = host({
      appliedTemperature: 20,
      calculatedTemperature: 23,
      direction: "heat",
      expandedZoneIds: ["climate.second"],
      roomAssistStatus: "holding",
      scheduledTargetGuard: "heating_ceiling",
      scheduledTargetTemperature: 20,
    });
    const legacy = host({
      appliedTemperature: 20,
      expandedZoneIds: ["climate.second"],
      roomAssistStatus: "holding",
      scheduledTargetTemperature: 20,
    });
    const guardedContainer = document.createElement("div");
    const legacyContainer = document.createElement("div");

    render(renderSensorsView(guarded.viewHost, ["climate.second"]), guardedContainer);
    render(renderSensorsView(legacy.viewHost, ["climate.second"]), legacyContainer);

    expect(guardedContainer.querySelector(".sensor-safety-info")?.textContent)
      .toContain("roomSensorScheduledGuardHeatingDetail");
    expect(legacyContainer.querySelector(".sensor-safety-info")).toBeNull();
  });

  it("holds inside the scheduled range without inventing a room gap", () => {
    const { viewHost } = host({
      appliedRange: [20, 24],
      expandedZoneIds: ["climate.second"],
      rangeShift: 0,
      roomAssistStatus: "holding",
      roomTemperature: 22,
      scheduledRange: [20, 24],
      thermostatTemperature: 22.5,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    expect(container.querySelector(".sensor-scale-room-gap")).toBeNull();
    expect(container.querySelector(".sensor-scale-assist-offset")?.classList)
      .toContain("assist-offset-holding");
    expect(container.querySelector(".sensor-scale-assist-offset")?.textContent)
      .toContain("roomSensorRangeShiftValue:value=0 °C");
  });

  it("relates a room above the scheduled range to the high boundaries", () => {
    const { viewHost } = host({
      appliedRange: [19, 23],
      direction: "cool",
      expandedZoneIds: ["climate.second"],
      rangeShift: -1,
      roomTemperature: 26,
      scheduledRange: [20, 24],
      thermostatTemperature: 25,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    expect(container.querySelector(".sensor-scale-room-gap")?.textContent)
      .toContain("roomSensorGapAboveTarget:value=2 °C");
    expect(container.querySelector(".sensor-scale-assist-offset")?.textContent)
      .toContain("roomSensorRangeShiftValue:value=-1 °C");
    expect(container.querySelector(".range-band-scheduled")?.textContent)
      .toContain("20–24 °C");
    expect(container.querySelector(".range-band-applied")?.textContent)
      .toContain("19–23 °C");
    expect(container.querySelector(".sensor-scale-callout-marker.marker-scheduledHigh"))
      .toBeNull();
    expect(container.querySelector(".sensor-scale-callout-marker.marker-appliedHigh"))
      .toBeNull();
  });

  it("falls back to the reported climate range when no applied range is present", () => {
    const { viewHost } = host({
      climateRange: [20.5, 24.5],
      expandedZoneIds: ["climate.second"],
      rangeShift: 0.5,
      scheduledRange: [20, 24],
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    expect(container.querySelector(".range-band-applied")?.textContent)
      .toContain("20.5–24.5 °C");
  });

  it("uses two range brackets and keeps only live-reading callouts when values coincide", () => {
    const { viewHost } = host({
      appliedRange: [21, 21],
      expandedZoneIds: ["climate.second"],
      rangeShift: 0,
      roomTemperature: 21,
      scheduledRange: [21, 21],
      thermostatTemperature: 21,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const calloutPositions = [
      ...container.querySelectorAll<HTMLElement>(".sensor-scale-callout-marker"),
    ].map((marker) => marker.style.getPropertyValue("--callout-left"));
    expect(calloutPositions).toHaveLength(2);
    expect(new Set(calloutPositions).size).toBe(2);
    expect(container.querySelectorAll(".sensor-scale-range-band")).toHaveLength(2);
    expect(container.querySelectorAll(".sensor-scale-range-bracket")).toHaveLength(2);
  });

  it("explains when a block is active early because of preconditioning", () => {
    const { viewHost } = host({
      activeFrom: "2026-05-19T16:30:00",
      expandedZoneIds: ["climate.second"],
      targetWhen: "2026-05-19T17:00:00+00:00",
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    expect(container.textContent).toContain("roomSensorBlockScheduled:time=17:00");
    expect(container.textContent).toContain(
      "roomSensorBlockStartedEarly:time=16:30",
    );
    expect(
      [...container.querySelectorAll(".sensor-block-detail")]
        .map((element) => element.textContent?.trim()),
    ).toEqual([
      "roomSensorBlockStartedEarly:time=16:30",
      "roomSensorBlockScheduled:time=17:00",
      "roomSensorBlockTarget:target=25 °C",
      "roomSensorBlockMode:mode=mode:heat",
    ]);
  });

  it("keeps coincident temperature markers visible on separate lanes", () => {
    const { viewHost } = host({
      appliedTemperature: 25,
      climateTargetTemperature: 25,
      expandedZoneIds: ["climate.second"],
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const scheduledMarker =
      container.querySelector<HTMLElement>(".sensor-scale-marker.marker-target");
    const climateTargetMarker = container.querySelector<HTMLElement>(
      ".sensor-scale-marker.marker-climateTarget",
    );
    const scheduledCallout = container.querySelector<HTMLElement>(
      ".sensor-scale-callout-marker.marker-target",
    );
    const climateTargetCallout = container.querySelector<HTMLElement>(
      ".sensor-scale-callout-marker.marker-climateTarget",
    );

    expect(scheduledCallout?.classList).toContain("lane-0");
    expect(climateTargetCallout?.classList).toContain("lane-1");
    expect(scheduledMarker?.style.left).toBe(climateTargetMarker?.style.left);
    expect(scheduledMarker).toBe(climateTargetMarker);
    expect(scheduledMarker?.classList).toContain("count-2");
    expect(scheduledMarker?.querySelector(".sensor-scale-dot")?.classList).toContain(
      "segmented",
    );
    expect(scheduledMarker?.style.getPropertyValue("--sensor-scale-dot-segments")).toContain(
      "conic-gradient",
    );
    expect(scheduledCallout?.style.getPropertyValue("--callout-left")).not.toBe(
      climateTargetCallout?.style.getPropertyValue("--callout-left"),
    );
    expect(
      [scheduledCallout, climateTargetCallout].some((marker) =>
        marker?.classList.contains("shifted"),
      ),
    ).toBe(true);
  });

  it("renders a single segmented dot when every temperature marker overlaps", () => {
    const { viewHost } = host({
      appliedTemperature: 25,
      climateTargetTemperature: 25,
      expandedZoneIds: ["climate.second"],
      roomTemperature: 25,
      scheduledTargetTemperature: 25,
      thermostatTemperature: 25,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const marker = container.querySelector<HTMLElement>(".sensor-scale-marker");
    const dot = marker?.querySelector(".sensor-scale-dot");
    const segmentStyle = marker?.style.getPropertyValue("--sensor-scale-dot-segments") ?? "";

    expect(container.querySelectorAll(".sensor-scale-marker")).toHaveLength(1);
    expect(container.querySelectorAll(".sensor-scale-callout")).toHaveLength(4);
    expect(marker?.classList).toContain("count-4");
    expect(marker?.classList).toContain("marker-target");
    expect(marker?.classList).toContain("marker-room");
    expect(marker?.classList).toContain("marker-climateTarget");
    expect(marker?.classList).toContain("marker-climate");
    expect(dot?.classList).toContain("segmented");
    expect(segmentStyle).toContain("var(--secondary-text-color) 0deg 90deg");
    expect(segmentStyle).toContain("var(--sensor-scale-applied-color) 90deg 180deg");
    expect(segmentStyle).toContain("var(--sensor-scale-room-color) 180deg 270deg");
    expect(segmentStyle).toContain("var(--sensor-scale-scheduled-color) 270deg 360deg");
    const calloutOrder = [...container.querySelectorAll<HTMLElement>(".sensor-scale-callout-marker")]
      .sort(
        (first, second) =>
          Number.parseFloat(first.style.getPropertyValue("--callout-left"))
          - Number.parseFloat(second.style.getPropertyValue("--callout-left")),
      )
      .map((marker) =>
        ["target", "room", "climateTarget", "climate"].find((key) =>
          marker.classList.contains(`marker-${key}`),
        ),
      );
    const segmentColorToMarker: Record<string, string> = {
      "--sensor-scale-scheduled-color": "target",
      "--sensor-scale-room-color": "room",
      "--sensor-scale-applied-color": "climateTarget",
      "--secondary-text-color": "climate",
    };
    const segmentOrder = [...segmentStyle.matchAll(/var\((--[^)]+)\)/g)].map(
      (match) => segmentColorToMarker[match[1]],
    );
    expect(segmentOrder).toEqual([...calloutOrder].reverse());
    expect(marker?.getAttribute("aria-label")).toContain("roomSensorScheduledTarget");
    expect(marker?.getAttribute("aria-label")).toContain("roomSensorClimateTemperature");
  });

  it("spreads close temperature marker callouts before they overlap", () => {
    const { viewHost } = host({
      climateTargetTemperature: 21.1,
      expandedZoneIds: ["climate.second"],
      roomTemperature: 20.9,
      scheduledTargetTemperature: 21,
      thermostatTemperature: 20.8,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const calloutPositions = [
      ...container.querySelectorAll<HTMLElement>(".sensor-scale-callout-marker"),
    ].map((marker) => marker.style.getPropertyValue("--callout-left"));

    expect(new Set(calloutPositions).size).toBe(4);
    const numericPositions = calloutPositions
      .map((position) => Number.parseFloat(position))
      .sort((first, second) => first - second);
    expect(
      numericPositions.slice(1).every(
        (position, index) => position - numericPositions[index] >= 24,
      ),
    ).toBe(true);
    expect(
      container.querySelectorAll(".sensor-scale-callout-marker.shifted").length,
    ).toBeGreaterThan(0);
    expect(calloutPositions.every((position) => position.endsWith("%"))).toBe(true);
    expect(
      calloutPositions
        .map((position) => Number.parseFloat(position))
        .every((position) => position >= 10 && position <= 90),
    ).toBe(true);
  });

  it("merges neighboring callout clusters when shifting coincident values would overlap", () => {
    const { viewHost } = host({
      appliedTemperature: 22,
      climateTargetTemperature: 22,
      expandedZoneIds: ["climate.second"],
      roomTemperature: 21.2,
      scheduledTargetTemperature: 22,
      thermostatTemperature: 19,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const positions = [
      ...container.querySelectorAll<HTMLElement>(".sensor-scale-callout-marker"),
    ]
      .map((marker) => Number.parseFloat(marker.style.getPropertyValue("--callout-left")))
      .sort((first, second) => first - second);

    expect(positions).toHaveLength(4);
    expect(
      positions.slice(1).every(
        (position, index) => position - positions[index] >= 24,
      ),
    ).toBe(true);
  });

  it("includes callout padding and borders in the collision-safe maximum width", () => {
    expect(sensorsStyles.cssText).toMatch(
      /\.sensor-scale-callout\s*\{[^}]*box-sizing:\s*border-box;[^}]*max-width:\s*144px;/s,
    );
  });

  it("centers callouts without making hidden fixed help overflow the scale", () => {
    expect(sensorsStyles.cssText).toMatch(
      /\.sensor-scale-callout-marker\s*\{[^}]*margin-left:\s*-72px;[^}]*width:\s*144px;/s,
    );
    const calloutRule = sensorsStyles.cssText.match(
      /\.sensor-scale-callout\s*\{[^}]*\}/s,
    )?.[0] ?? "";
    expect(calloutRule).toMatch(/left:\s*0;/);
    expect(calloutRule).toMatch(/margin-inline:\s*auto;/);
    expect(calloutRule).toMatch(/right:\s*0;/);
    expect(calloutRule).not.toContain("transform:");
  });

  it("keeps an applied decimal target visible when its assist offset is shown", () => {
    const { viewHost } = host({
      appliedTemperature: 24.5,
      climateTargetTemperature: 24.5,
      expandedZoneIds: ["climate.second"],
      roomTemperature: 23.4,
      scheduledTargetTemperature: 23,
      thermostatTemperature: 24.6,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const appliedCallout = container.querySelector(
      ".sensor-scale-callout-marker.marker-climateTarget .sensor-scale-callout",
    );
    expect(appliedCallout?.classList).toContain("has-offset");
    expect(appliedCallout?.querySelector("strong")?.textContent).toContain("24.5");
    expect(appliedCallout?.querySelector(".sensor-scale-offset")?.textContent).toContain("+5");
    expect(sensorsStyles.cssText).toMatch(
      /\.sensor-scale-callout\s*\{[^}]*width:\s*max-content;/s,
    );
    expect(sensorsStyles.cssText).not.toMatch(
      /\.sensor-scale-callout\.has-offset \.sensor-scale-value-row\s*\{[^}]*flex-direction:\s*column;/s,
    );
    expect(inlineHelpStyles.cssText).toMatch(
      /\.inline-help ha-icon\s*\{[^}]*height:\s*16px;[^}]*width:\s*16px;/s,
    );
    expect(sensorsStyles.cssText).toMatch(
      /\.sensor-scale-callout\.has-offset \.sensor-scale-value-row > strong\s*\{[^}]*overflow:\s*visible;[^}]*text-overflow:\s*clip;/s,
    );
  });

  it("uses the same content-sized climate target callout in Fahrenheit", () => {
    const { viewHost } = host({
      appliedTemperature: 75.5,
      climateTargetTemperature: 75.5,
      expandedZoneIds: ["climate.second"],
      preStepTemperature: 75.3,
      roomTemperature: 73.4,
      scheduledTargetTemperature: 74,
      targetTempStep: 0.9,
      thermostatTemperature: 76,
    });
    (viewHost as unknown as { _temperatureUnit: () => string })._temperatureUnit =
      () => "°F";
    (viewHost as unknown as {
      _formatTemperature: (value: number) => string;
    })._formatTemperature = (value: number) => `${value} °F`;
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const callout = container.querySelector(
      ".sensor-scale-callout-marker.marker-climateTarget .sensor-scale-callout",
    );
    expect(callout?.classList).toContain("has-offset");
    expect(callout?.textContent).toContain("75.5 °F");
    expect(callout?.querySelector(".inline-help")?.getAttribute("aria-label"))
      .toContain("step=0.9 °F");
  });

  it("keeps close edge marker callouts inside the available direction", () => {
    const { viewHost } = host({
      climateTargetTemperature: 20.2,
      expandedZoneIds: ["climate.second"],
      roomTemperature: 20,
      scheduledTargetTemperature: 20.1,
      thermostatTemperature: 10,
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    const calloutPositions = [
      ...container.querySelectorAll<HTMLElement>(".sensor-scale-callout-marker"),
    ].map((marker) => Number.parseFloat(marker.style.getPropertyValue("--callout-left")));

    expect(calloutPositions.every((position) => position >= 10 && position <= 90)).toBe(
      true,
    );
    expect(new Set(calloutPositions).size).toBe(4);
    expect(
      container.querySelector(".sensor-scale-callout-marker.marker-climateTarget")?.classList,
    ).toContain("edge-right");
    expect(
      container.querySelector(
        ".sensor-scale-callout-marker.edge-right .inline-help-tooltip",
      ),
    ).not.toBeNull();
  });

  it("shows a waiting state when assist is enabled without an active block", () => {
    const { viewHost } = host({
      expandedZoneIds: ["climate.second"],
      roomAssistStatus: "idle",
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.second"]), container);

    expect(container.textContent).toContain("roomSensorNoActiveBlock");
    expect(container.textContent).toContain("roomSensorNoActiveBlockDetail");
    expect(container.querySelector(".sensor-idle-state")).not.toBeNull();
    expect(container.querySelector(".sensor-temperature-scale")).toBeNull();
  });

  it("shows a clear inactive state when a sensor is configured but assist is off", () => {
    const { viewHost } = host({
      expandedZoneIds: ["climate.first"],
      roomTemperatureEntityId: "sensor.bedroom_temperature",
    });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.first"]), container);

    expect(container.textContent).toContain("roomSensorAssistDisabledDetail");
    expect(container.querySelector(".sensor-status-card")).toBeNull();
  });

  it("uses a Fahrenheit-friendly maximum assist delta range", () => {
    const { viewHost } = host({
      expandedZoneIds: ["climate.first"],
      roomTemperatureEntityId: "sensor.bedroom_temperature",
      assistEnabled: true,
    });
    (viewHost as unknown as { _temperatureUnit: () => string })._temperatureUnit =
      () => "°F";
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.first"]), container);

    const input = [...container.querySelectorAll<HTMLInputElement>("input[type='number']")]
      .find((candidate) => candidate.max === "18");
    expect(input?.max).toBe("18");
    expect(container.textContent).toContain("°F");
  });

  it.each(["roomSensorAssistDeadbandHelp", "roomSensorAssistMaxDeltaHelp"].flatMap(helpKey =>
    [true, false].map(assistEnabled => ({ helpKey, assistEnabled })),
  ))("opens field help only from its icon: $helpKey (enabled=$assistEnabled)", ({ helpKey, assistEnabled }) => {
    vi.useFakeTimers();
    const { viewHost } = host({
      expandedZoneIds: ["climate.first"],
      roomTemperatureEntityId: "sensor.bedroom_temperature",
      assistEnabled,
    });
    const container = document.createElement("div");
    try {
      render(renderSensorsView(viewHost, ["climate.first"]), container);
      const help = container.querySelector<HTMLButtonElement>(`.sensor-number-fields .inline-help[aria-label="${helpKey}"]`)!;
      const row = help.closest<HTMLElement>(".sensor-config-row")!;
      const input = row.querySelector<HTMLInputElement>("input[type=number]")!;
      const label = row.querySelector<HTMLLabelElement>("label")!;
      const tooltip = container.querySelector<HTMLElement>(`#${help.getAttribute("aria-controls")}`)!;
      expect(label.htmlFor).toBe(input.id);
      expect(input.labels).toHaveLength(1);
      expect(container.querySelectorAll(".sensor-number-fields .inline-help")).toHaveLength(2);
      expect(container.querySelector(".sensor-assist-settings h4 .inline-help")).toBeNull();

      for (const outside of [row, label, input]) {
        outside.click();
        outside.dispatchEvent(new Event("pointerenter"));
        vi.advanceTimersByTime(600);
        expect(tooltip.classList.contains("visible")).toBe(false);
      }

      help.click();
      expect(tooltip.classList.contains("visible")).toBe(true);
      expect(tooltip.textContent).toContain(helpKey);
      help.click();
      expect(tooltip.classList.contains("visible")).toBe(false);
      // Delayed hover remains attached to the existing icon button.
      document.body.append(container);
      help.dispatchEvent(new Event("pointerenter"));
      vi.advanceTimersByTime(499);
      expect(tooltip.classList.contains("visible")).toBe(false);
      vi.advanceTimersByTime(1);
      expect(tooltip.classList.contains("visible")).toBe(true);
      help.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      expect(tooltip.classList.contains("visible")).toBe(false);
    } finally {
      container.remove();
      vi.useRealTimers();
    }
  });

  it.each([true, false])("keeps every field description visible below its value (enabled=%s)", assistEnabled => {
    const { viewHost, saveZonePreconditioning } = host({
      expandedZoneIds: ["climate.first"],
      roomTemperatureEntityId: "sensor.bedroom_temperature", assistEnabled,
    });
    const container = document.createElement("div");
    render(renderSensorsView(viewHost, ["climate.first"]), container);
    const descriptions = ["roomSensorAssistDeadbandDescription", "roomSensorAssistMaxDeltaDescription", "roomSensorAssistDebounceDescription"];
    const inputs = [...container.querySelectorAll<HTMLInputElement>(".sensor-number-fields input")];
    expect(inputs).toHaveLength(3);
    inputs.forEach((input, index) => {
      const description = container.querySelector(`#${input.getAttribute("aria-describedby")}`)!;
      expect(description.textContent).toBe(descriptions[index]);
      expect(input.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
      expect(input.disabled).toBe(!assistEnabled);
      expect(input.labels).toHaveLength(1);
    });
    expect(container.querySelector('[id$="room_sensor_assist_debounce_seconds-help-trigger"]')).toBeNull();
    expect(saveZonePreconditioning).not.toHaveBeenCalled();
  });

  it("does not show runtime metrics before a room sensor is configured", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.first"] });
    const container = document.createElement("div");

    render(renderSensorsView(viewHost, ["climate.first"]), container);

    expect(container.querySelector(".sensor-config-section")).not.toBeNull();
    expect(container.querySelector(".sensor-runtime-section")).toBeNull();
  });
});

it("shows the localized range thermal limitation in French and hides its temperature scale", () => {
  const { viewHost } = host({ expandedZoneIds: ["climate.second"], scheduledRange: [19, 24] });
  const assist = viewHost._data!.room_sensor_assist!["climate.second"];
  assist.status = "unavailable";
  assist.reason = "unsupported_range_mode";
  assist.hvac_mode = "heat";
  viewHost._t = (key, replacements) => translate("fr", key, replacements);
  const container = document.createElement("div");
  render(renderSensorsView(viewHost, ["climate.second"]), container);
  expect(container.textContent).toContain(translate("fr", "unsupportedRangeThermalMode"));
  expect(container.querySelector(".sensor-temperature-scale")).toBeNull();
});

type ReferenceElement = HTMLElement & {
  updateComplete: Promise<boolean>;
  settings?: { room_temperature_entity_id?: string | null };
};

function referenceStore(viewHost: VelairViewHost, save: ReturnType<typeof host>["saveZonePreconditioning"]) {
  const read = vi.fn(async (request: { entity_id: string }) => {
    const entity = viewHost._data?.member_to_unit?.[request.entity_id] ?? request.entity_id;
    const value = viewHost._data!.zones[entity].preconditioning!.room_sensor_schedule;
    const detail = value ? "periods" in value ? structuredClone(value)
      : { enabled: value.enabled, default_source: value.default_source, periods: [] } : null;
    return { entity_id: entity, room_sensor_schedule: detail };
  });
  Object.assign(viewHost.hass!, { connection: { sendMessagePromise: read } });
  save.mockImplementation(async (...args: unknown[]) => {
    const entity = args[0] as string;
    Object.assign(viewHost._data!.zones[entity].preconditioning!, args[1]);
  });
  return read;
}

async function referenceClick(reference: ReferenceElement, action: string) {
  reference.shadowRoot!.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.click();
  await referenceFlush(reference);
}

async function referenceFlush(reference: ReferenceElement) {
  for (let index = 0; index < 8; index++) { await Promise.resolve(); await reference.updateComplete; }
}

async function referenceMode(reference: ReferenceElement, scheduled: boolean) {
  reference.shadowRoot!.querySelector<HTMLButtonElement>(`[data-action="mode-${scheduled ? "schedule" : "fixed"}"]`)!.click();
  await referenceFlush(reference);
}

async function mountReference(viewHost: VelairViewHost, entityId = "climate.second") {
  const container = document.createElement("div"); document.body.append(container);
  render(renderSensorsView(viewHost, [entityId]), container);
  const reference = container.querySelector("velair-room-sensor-schedule") as ReferenceElement;
  await referenceFlush(reference);
  const refresh = async () => {
    render(renderSensorsView(viewHost, [entityId]), container);
    await referenceFlush(reference);
  };
  return { container, reference, refresh };
}

describe("group Room Assist retains the ordinary fixed sensor configuration", () => {
  it.each(["climate.first", "group.room"])("uses the same immediate selection and clear path for %s", async entityId => {
    const { viewHost, saveZonePreconditioning } = host({ assistEnabled: true, roomTemperatureEntityId: "sensor.bedroom_temperature", expandedZoneIds: [entityId] });
    if (entityId.startsWith("group.")) {
      viewHost._data!.zones[entityId] = viewHost._data!.zones["climate.first"];
      viewHost._data!.room_groups = { [entityId]: { id: entityId, name: "Room", members: ["climate.first", "climate.second"], temperature_entity_id: "climate.first", delivery_mode: "all" } };
    }
    viewHost.hass!.states!["sensor.external"] = { state: "21", attributes: { device_class: "temperature", friendly_name: "External room temperature", unit_of_measurement: "°C" } };
    referenceStore(viewHost, saveZonePreconditioning);
    const { container, reference, refresh } = await mountReference(viewHost, entityId);
    let picker = reference.shadowRoot!.querySelector<HTMLSelectElement>('[data-field="fixed-source"]')!;
    expect(picker.value).toBe("sensor.bedroom_temperature");
    picker.value = "sensor.external"; picker.dispatchEvent(new Event("change"));
    await referenceFlush(reference);
    expect(saveZonePreconditioning).toHaveBeenCalledWith(entityId, { room_temperature_entity_id: "sensor.external" });
    await refresh();
    picker = reference.shadowRoot!.querySelector<HTMLSelectElement>('[data-field="fixed-source"]')!;
    picker.value = ""; picker.dispatchEvent(new Event("change"));
    await referenceFlush(reference);
    expect(saveZonePreconditioning).toHaveBeenCalledWith(entityId, { room_temperature_entity_id: null, room_sensor_assist_enabled: false });
    if (entityId.startsWith("group.")) expect(viewHost._data!.room_groups![entityId].temperature_entity_id).toBe("climate.first");
    viewHost._settingsSaving = true;
    await refresh();
    picker = reference.shadowRoot!.querySelector<HTMLSelectElement>('[data-field="fixed-source"]')!;
    expect(picker.disabled).toBe(true);
    saveZonePreconditioning.mockClear();
    picker.dispatchEvent(new Event("change"));
    await referenceFlush(reference);
    expect(saveZonePreconditioning).not.toHaveBeenCalled();
    container.remove();
  });
});

describe("scheduled Room Assist references", () => {
  it.each(["absent", "disabled"])("shows the fixed picker without loading an %s calendar", async variant => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.second"] });
    if (variant === "disabled") viewHost._data!.zones["climate.second"].preconditioning!.room_sensor_schedule = { enabled: false, default_source: null, period_count: 1 };
    const read = referenceStore(viewHost, saveZonePreconditioning);
    const { container, reference } = await mountReference(viewHost);
    expect(container.querySelectorAll("velair-room-sensor-schedule")).toHaveLength(1);
    expect(container.querySelectorAll("ha-switch")).toHaveLength(1);
    expect(reference.shadowRoot!.querySelector("ha-switch")).toBeNull();
    expect(reference.shadowRoot!.querySelector('[data-field="fixed-source"]')).not.toBeNull();
    expect(reference.shadowRoot!.querySelector(".schedule-fields")).toBeNull();
    expect(reference.shadowRoot!.querySelector('[data-action="edit-schedule"]')).toBeNull();
    expect(read).not.toHaveBeenCalled();
    expect(saveZonePreconditioning).not.toHaveBeenCalled();
    container.remove();
  });

  it.each([false, true])("shows the saved calendar with one master switch even when master=%s", async assistEnabled => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.second"], assistEnabled });
    const settings = viewHost._data!.zones["climate.second"].preconditioning!;
    settings.room_sensor_assist_enabled = assistEnabled;
    settings.room_sensor_schedule = { enabled: true, default_source: null, periods: [{ weekdays: ["monday"], start: "08:00", end: "17:00", source: "sensor.bedroom_temperature" }] };
    const read = referenceStore(viewHost, saveZonePreconditioning);
    const { container, reference } = await mountReference(viewHost);
    expect(container.querySelectorAll("ha-switch")).toHaveLength(1);
    expect(reference.shadowRoot!.querySelector("ha-switch")).toBeNull();
    expect(reference.shadowRoot!.querySelector('[data-field="fixed-source"]')).toBeNull();
    expect(reference.shadowRoot!.querySelectorAll("[data-period]")).toHaveLength(1);
    expect(read).toHaveBeenCalledOnce();
    expect(saveZonePreconditioning).not.toHaveBeenCalled();
    container.remove();
  });

  it.each([false, true])("stages either reference mode and Cancel restores the saved mode (scheduled=%s)", async enabled => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.second"] });
    const settings = viewHost._data!.zones["climate.second"].preconditioning!;
    settings.room_sensor_schedule = { enabled, default_source: null, periods: [{ weekdays: ["monday"], start: "08:00", end: "17:00", source: "sensor.bedroom_temperature" }] };
    const read = referenceStore(viewHost, saveZonePreconditioning);
    const { container, reference } = await mountReference(viewHost);
    await referenceMode(reference, !enabled);
    expect(settings.room_sensor_schedule.enabled).toBe(enabled);
    expect(reference.shadowRoot!.querySelector('[data-action="cancel-schedule"]')).not.toBeNull();
    expect(Boolean(reference.shadowRoot!.querySelector('[data-field="fixed-source"]'))).toBe(enabled);
    expect(saveZonePreconditioning).not.toHaveBeenCalled();
    await referenceClick(reference, "cancel-schedule");
    expect(Boolean(reference.shadowRoot!.querySelector('[data-field="fixed-source"]'))).toBe(!enabled);
    expect(settings.room_temperature_entity_id).toBe("sensor.bedroom_temperature");
    expect(saveZonePreconditioning).not.toHaveBeenCalled();
    expect(read).toHaveBeenCalledTimes(enabled ? 2 : 1);
    container.remove();
  });

  it.each([false, true])("saves a mode change while preserving the other configuration (scheduled=%s)", async enabled => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.second"] });
    const settings = viewHost._data!.zones["climate.second"].preconditioning!;
    const periods = [{ weekdays: ["monday"] as ["monday"], start: "08:00", end: "17:00", source: "sensor.bedroom_temperature" }];
    settings.room_sensor_schedule = { enabled, default_source: null, periods };
    referenceStore(viewHost, saveZonePreconditioning);
    const { container, reference, refresh } = await mountReference(viewHost);
    await referenceMode(reference, !enabled);
    await referenceClick(reference, "save-schedule");
    await refresh();
    expect(saveZonePreconditioning).toHaveBeenCalledOnce();
    expect(saveZonePreconditioning).toHaveBeenCalledWith("climate.second", { room_sensor_schedule: { enabled: !enabled, default_source: null, periods } });
    expect(settings.room_sensor_schedule.enabled).toBe(!enabled);
    expect(settings.room_temperature_entity_id).toBe("sensor.bedroom_temperature");
    expect(settings.room_sensor_assist_enabled).toBe(true);
    expect(Boolean(reference.shadowRoot!.querySelector('[data-field="fixed-source"]'))).toBe(enabled);
    container.remove();
  });

  it("retains calendar edits and the fixed sensor while alternating before saving", async () => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.second"] });
    const settings = viewHost._data!.zones["climate.second"].preconditioning!;
    settings.room_sensor_schedule = { enabled: false, default_source: null, periods: [{ weekdays: ["monday"], start: "08:00", end: "17:00", source: "sensor.bedroom_temperature" }] };
    referenceStore(viewHost, saveZonePreconditioning);
    const { container, reference } = await mountReference(viewHost);
    await referenceMode(reference, true);
    const start = reference.shadowRoot!.querySelector<HTMLInputElement>('input[type="time"]')!;
    start.value = "09:00"; start.dispatchEvent(new Event("input"));
    await referenceMode(reference, false);
    expect(reference.shadowRoot!.querySelector<HTMLSelectElement>('[data-field="fixed-source"]')!.value).toBe("sensor.bedroom_temperature");
    await referenceMode(reference, true);
    expect(reference.shadowRoot!.querySelector<HTMLInputElement>('input[type="time"]')!.value).toBe("09:00");
    expect(settings.room_sensor_schedule).toMatchObject({ enabled: false, periods: [{ start: "08:00" }] });
    expect(saveZonePreconditioning).not.toHaveBeenCalled();
    container.remove();
  });

  it("retains load errors and hides configuration when the card requests it", async () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.first"] });
    const read = vi.fn().mockRejectedValue(new Error("Offline"));
    Object.assign(viewHost.hass!, { connection: { sendMessagePromise: read } });
    const container = document.createElement("div"); document.body.append(container);
    render(renderSensorsView(viewHost, ["climate.first"], { showRoomSensor: false }), container);
    expect(container.querySelector("velair-room-sensor-schedule")).toBeNull();
    render(renderSensorsView(viewHost, ["climate.first"]), container);
    const reference = container.querySelector("velair-room-sensor-schedule") as ReferenceElement;
    await referenceFlush(reference);
    await referenceMode(reference, true);
    expect(reference.shadowRoot!.textContent).toContain("roomSensorScheduleLoadError");
    expect(reference.shadowRoot!.querySelector('[data-action="save-schedule"]')).toBeNull();
    container.remove();
  });

  it("preserves blocked status with a native reference without a correction graph", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.second"] });
    const settings = viewHost._data!.zones["climate.second"].preconditioning!;
    settings.room_temperature_entity_id = null;
    settings.room_sensor_schedule = { enabled: true, default_source: null, periods: [] };
    Object.assign(viewHost._data!.room_sensor_assist!["climate.second"], { status: "blocked", reason: "zone_paused", room_sensor_schedule: { enabled: true, effective_source: null, next_change: null, next_source: null } });
    const container = document.createElement("div");
    render(renderSensorsView(viewHost, ["climate.second"]), container);
    expect(container.textContent).toContain("roomSensorStatusBlocked");
    expect(container.querySelector(".sensor-temperature-scale")).toBeNull();
  });

  it("lets users turn assistance off after disabling a native-only schedule", () => {
    const { viewHost, saveZonePreconditioning } = host({ assistEnabled: true });
    viewHost._data!.zones["climate.first"].preconditioning!.room_sensor_schedule = { enabled: false, default_source: null, periods: [] };
    const container = document.createElement("div");
    render(renderSensorsView(viewHost, ["climate.first"]), container);
    const toggle = container.querySelector(".sensor-zone-actions ha-switch") as HTMLElement & { checked: boolean };
    expect(toggle.hasAttribute("disabled")).toBe(false);
    toggle.checked = false; toggle.dispatchEvent(new Event("change"));
    expect(saveZonePreconditioning).toHaveBeenCalledWith("climate.first", { room_sensor_assist_enabled: false });
  });

  it("allows the master switch with an enabled schedule and no fixed sensor", async () => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.first"] });
    viewHost._data!.zones["climate.first"].preconditioning!.room_sensor_schedule = { enabled: true, default_source: null, periods: [] };
    referenceStore(viewHost, saveZonePreconditioning);
    const { container, reference } = await mountReference(viewHost, "climate.first");
    expect(container.querySelector(".sensor-zone-actions ha-switch")!.hasAttribute("disabled")).toBe(false);
    expect(reference.shadowRoot!.querySelector('[data-field="fixed-source"]')).toBeNull();
    expect(reference.shadowRoot!.querySelector(".schedule-fields")).not.toBeNull();
    container.remove();
  });

  it("restores the stored fixed selection when an external saved mode changes", async () => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.first"], assistEnabled: true, roomTemperatureEntityId: "sensor.bedroom_temperature" });
    const settings = viewHost._data!.zones["climate.first"].preconditioning!;
    settings.room_sensor_schedule = { enabled: true, default_source: null, periods: [] };
    referenceStore(viewHost, saveZonePreconditioning);
    const { container, reference, refresh } = await mountReference(viewHost, "climate.first");
    expect(reference.shadowRoot!.querySelector('[data-field="fixed-source"]')).toBeNull();
    settings.room_sensor_schedule = { ...settings.room_sensor_schedule, enabled: false };
    await refresh();
    const picker = reference.shadowRoot!.querySelector<HTMLSelectElement>('[data-field="fixed-source"]')!;
    expect(picker.disabled).toBe(false);
    expect(picker.value).toBe("sensor.bedroom_temperature");
    expect(picker.selectedOptions[0]?.textContent).toContain("Bedroom temperature");
    expect(settings.room_temperature_entity_id).toBe("sensor.bedroom_temperature");
    expect(saveZonePreconditioning).not.toHaveBeenCalled();
    container.remove();
  });

  it("does not present native scheduled operation as a missing sensor or a correction graph", async () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.second"], assistEnabled: true });
    const settings = viewHost._data!.zones["climate.second"].preconditioning!;
    settings.room_temperature_entity_id = null;
    settings.room_sensor_schedule = { enabled: true, default_source: null, periods: [] };
    Object.assign(viewHost._data!.room_sensor_assist!["climate.second"], { status: "idle", configured: true, reason: "native_reference", room_sensor_schedule: { enabled: true, effective_source: null, next_change: null, next_source: null } });
    const container = document.createElement("div"); document.body.append(container);
    render(renderSensorsView(viewHost, ["climate.second"], { showRoomSensor: false }), container);
    const editor = container.querySelector("velair-room-sensor-schedule") as ReferenceElement;
    await referenceFlush(editor);
    expect(editor.shadowRoot!.textContent).toContain("roomSensorScheduleCurrent:source=roomSensorScheduleNative");
    expect(editor.shadowRoot!.textContent).not.toContain("roomSensorScheduleUnavailable");
    expect(editor.shadowRoot!.querySelector("button")).toBeNull();
    expect(container.querySelector(".sensor-runtime-section")).toBeNull();
    expect(container.querySelector(".sensor-temperature-scale")).toBeNull();
    container.remove();
  });
});
