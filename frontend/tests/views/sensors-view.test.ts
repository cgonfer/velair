// @vitest-environment jsdom
import { translate } from "../../src/velair/i18n";

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import { inlineHelpStyles } from "../../src/velair/styles/inline-help-styles";
import { sensorsStyles } from "../../src/velair/styles/sensors-styles";
import { renderRoomAssistTemperatureScale, renderSensorsView } from "../../src/velair/views/sensors-view";
import type { RoomAssistBrakingLevel, RoomSensorAssistStatus } from "../../src/velair/types";

function host(options: {
  brakingLevel?: RoomAssistBrakingLevel;
  braking?: RoomSensorAssistStatus["braking"];
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
  minimumMargin?: number;
  temperatureUnit?: string;
  temperatureStep?: number;
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
            room_sensor_assist_braking_level: options.brakingLevel,
            room_sensor_assist_max_delta: options.maxDelta ?? 5,
            room_sensor_assist_minimum_margin: options.minimumMargin ?? 0,
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
            room_sensor_assist_braking_level: options.brakingLevel,
            room_sensor_assist_max_delta: options.maxDelta ?? 2,
            room_sensor_assist_minimum_margin: options.minimumMargin ?? 0,
            room_sensor_assist_debounce_seconds: options.debounceSeconds ?? 20,
          },
          schedule: {},
        },
      },
      room_sensor_assist: {
        "climate.second": {
          braking: options.braking,
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
    _temperatureUnit: () => options.temperatureUnit ?? "°C",
    _temperatureStep: () => options.temperatureStep ?? 1,
    _togglePreconditioningZone: togglePreconditioningZone,
  } as unknown as VelairViewHost;

  return {
    saveZonePreconditioning,
    togglePreconditioningZone,
    viewHost,
  };
}

describe("sensors view", () => {
  it("saves the minimum margin through the existing flow using the native effective step", () => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.second"], maxDelta: 18, temperatureUnit: "°F", temperatureStep: .9 });
    const container = document.createElement("div");
    render(renderSensorsView(viewHost, ["climate.second"]), container);
    const input = container.querySelector<HTMLInputElement>('input[id$="room_sensor_assist_minimum_margin"]')!;
    expect(input.value).toBe("0");
    expect(input.step).toBe("0.9");
    expect(input.max).toBe("18");
    expect(input.parentElement!.textContent).toContain("°F");
    input.value = "18";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZonePreconditioning).toHaveBeenCalledWith("climate.second", { room_sensor_assist_minimum_margin: 18 });
  });

  it.each(["room_sensor_assist_minimum_margin", "room_sensor_assist_max_delta"])("validates the final margin/maximum pair without changing another field (%s)", (field) => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.second"], maxDelta: 5, minimumMargin: 3 });
    const container = document.createElement("div");
    render(renderSensorsView(viewHost, ["climate.second"]), container);
    const input = container.querySelector<HTMLInputElement>(`input[id$="${field}"]`)!;
    input.value = field === "room_sensor_assist_minimum_margin" ? "6" : "2";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZonePreconditioning).not.toHaveBeenCalled();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const error = input.closest(".sensor-config-row")!.querySelector<HTMLElement>('[role="alert"]')!;
    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe("roomSensorAssistMinimumMarginValidation");
    expect(input.getAttribute("aria-describedby")).toContain(error.id);
    input.value = "4";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(error.hidden).toBe(true);
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZonePreconditioning).toHaveBeenCalledWith("climate.second", { [field]: 4 });
  });

  it("keeps the margin help linked to its canonical section and shares maximum visibility", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.second"] });
    viewHost.hass!.language = "es";
    const container = document.createElement("div");
    render(renderSensorsView(viewHost, ["climate.second"]), container);
    const field = container.querySelector('input[id$="room_sensor_assist_minimum_margin"]')!.closest(".sensor-config-row")!;
    expect(field.querySelector(".documentation-guide")!.getAttribute("href")).toMatch(/\/docs\/user\/room-assist\.es\.md#minimum-control-margin$/);
    expect(field.textContent).not.toContain("documentationLanguageNote");
    render(renderSensorsView(viewHost, ["climate.second"], { showMaxDelta: false }), container);
    expect(container.querySelector('input[id$="room_sensor_assist_minimum_margin"]')).toBeNull();
  });

  it("preserves translated margin labels and blocks margin edits while saving", () => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.second"] });
    viewHost._t = (key, replacements) => translate("es", key, replacements);
    viewHost._settingsSaving = true;
    const container = document.createElement("div");
    render(renderSensorsView(viewHost, ["climate.second"]), container);
    const input = container.querySelector<HTMLInputElement>('input[id$="room_sensor_assist_minimum_margin"]')!;
    expect(input.disabled).toBe(true);
    expect(input.closest(".sensor-config-row")!.textContent).toContain("Margen mínimo de control");
    input.value = "1";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZonePreconditioning).not.toHaveBeenCalled();
  });

  it.each(["", "letters", "-1", "10.1", "Infinity"])("rejects an invalid margin without clamping it (%s)", value => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.second"], maxDelta: 10 });
    const container = document.createElement("div");
    render(renderSensorsView(viewHost, ["climate.second"]), container);
    const input = container.querySelector<HTMLInputElement>('input[id$="room_sensor_assist_minimum_margin"]')!;
    input.value = value;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZonePreconditioning).not.toHaveBeenCalled();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.validationMessage).toContain("roomSensorAssistMarginValueValidation");
  });
  it("delegates live presentation without duplicating the old runtime summary", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.second"] });
    const container = document.createElement("div");
    render(renderSensorsView(viewHost, ["climate.second"]), container);
    const graph = container.querySelector("velair-room-assist-graph") as HTMLElement & {
      host: VelairViewHost; entityId: string; status: RoomSensorAssistStatus;
    };
    expect(graph).not.toBeNull();
    expect(graph.host).toBe(viewHost);
    expect(graph.entityId).toBe("climate.second");
    expect(graph.status).toBe(viewHost._data!.room_sensor_assist!["climate.second"]);
    expect(container.querySelectorAll(".sensor-status-pill")).toHaveLength(1);
    expect(container.querySelector(".sensor-block-summary, .sensor-limit-warning, .sensor-safety-info, .preconditioning-offset")).toBeNull();
  });

  it("shares the same renderer and backend status with climate cards", () => {
    const { viewHost } = host();
    const container = document.createElement("div");
    const status = viewHost._data!.room_sensor_assist!["climate.second"];
    const settings = viewHost._data!.zones["climate.second"].preconditioning;
    render(renderRoomAssistTemperatureScale(viewHost, "climate.second", status, settings), container);
    const graph = container.querySelector("velair-room-assist-graph") as HTMLElement & {
      status: RoomSensorAssistStatus; settings: unknown;
    };
    expect(graph.status).toBe(status);
    expect(graph.settings).toBe(settings);
  });

  it("forwards deadband visibility without changing saved settings", () => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.second"] });
    const container = document.createElement("div");
    render(renderSensorsView(viewHost, ["climate.second"], { showDeadband: false }), container);
    const graph = container.querySelector("velair-room-assist-graph") as HTMLElement & { showDeadband: boolean };
    expect(graph.showDeadband).toBe(false);
    expect(saveZonePreconditioning).not.toHaveBeenCalled();
    expect(viewHost._data!.zones["climate.second"].preconditioning!.room_sensor_assist_deadband).toBe(0.3);
  });

  it("omits a graph when shared runtime has no active target", () => {
    const { viewHost } = host({ roomAssistStatus: "idle" });
    const container = document.createElement("div");
    render(renderRoomAssistTemperatureScale(viewHost, "climate.second",
      viewHost._data!.room_sensor_assist!["climate.second"], viewHost._data!.zones["climate.second"].preconditioning), container);
    expect(container.querySelector("velair-room-assist-graph")).toBeNull();
  });

  it("shows braking in its own row with the shared select and visible explanation", () => {
    const { viewHost } = host({ expandedZoneIds: ["climate.second"] });
    const container = document.createElement("div");
    document.body.append(container);
    try {
      render(renderSensorsView(viewHost, ["climate.second"]), container);
      const select = container.querySelector<HTMLSelectElement>(".sensor-braking-select")!;
      const row = select.closest(".sensor-config-row")!;
      expect(row.classList.contains("sensor-braking-row")).toBe(true);
      expect(row.parentElement?.classList.contains("sensor-assist-settings")).toBe(true);
      expect(row.nextElementSibling?.classList.contains("sensor-number-fields")).toBe(true);
      expect(row.querySelector(".select-wrap > select")).toBe(select);
      expect(row.querySelector(".inline-help")).toBeNull();
      const description = row.querySelector(".sensor-field-description")!;
      expect(select.getAttribute("aria-describedby")).toBe(description.id);
      expect(description.textContent).toContain("roomSensorAssistBrakingDescription");
      expect(description.textContent).toContain("roomSensorAssistBrakingHelp");
      expect(row.querySelector("label")?.htmlFor).toBe(select.id);
      expect(container.querySelector(".sensor-number-fields .sensor-braking-select")).toBeNull();
    } finally {
      container.remove();
    }
  });
  it("saves braking through the existing flow without presenting an unconfirmed selection", () => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.second"] });
    const container = document.createElement("div");
    render(renderSensorsView(viewHost, ["climate.second"]), container);
    const select = container.querySelector<HTMLSelectElement>(".sensor-braking-select")!;
    expect(select.value).toBe("default");
    select.value = "high";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZonePreconditioning).toHaveBeenCalledWith("climate.second", { room_sensor_assist_braking_level: "high" });
    expect(select.value).toBe("default");
    viewHost._data!.zones["climate.second"].preconditioning!.room_sensor_assist_braking_level = "high";
    render(renderSensorsView(viewHost, ["climate.second"]), container);
    expect(select.value).toBe("high");
  });

  it("requires a positive deadband before selecting additional braking", () => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.second"], deadband: 0 });
    const container = document.createElement("div");
    render(renderSensorsView(viewHost, ["climate.second"]), container);
    const select = container.querySelector<HTMLSelectElement>(".sensor-braking-select")!;
    expect(select.querySelector<HTMLOptionElement>("option[value='moderate']")!.disabled).toBe(true);
    expect(select.querySelector<HTMLOptionElement>("option[value='high']")!.disabled).toBe(true);
    select.value = "high";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZonePreconditioning).not.toHaveBeenCalled();
    expect(select.value).toBe("default");
    expect(container.textContent).toContain("roomSensorAssistBrakingRequiresBand");
  });

  it("requires returning to Default before saving zero deadband", () => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.second"], brakingLevel: "high" });
    const container = document.createElement("div");
    render(renderSensorsView(viewHost, ["climate.second"]), container);
    const deadband = container.querySelector<HTMLInputElement>("#room-sensor-climate-second-room_sensor_assist_deadband")!;
    expect(deadband.min).toBe("0.1");
    deadband.value = "0";
    deadband.dispatchEvent(new Event("change", { bubbles: true }));
    expect(deadband.value).toBe("0.3");
    expect(saveZonePreconditioning).not.toHaveBeenCalled();
    const select = container.querySelector<HTMLSelectElement>(".sensor-braking-select")!;
    select.value = "default";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZonePreconditioning).toHaveBeenCalledWith("climate.second", { room_sensor_assist_braking_level: "default" });
  });

  it.each(["unsupported_mode", "native_reference", "disabled", "zero_deadband"])("retains a saved level and explains %s", (reason) => {
    const { viewHost } = host({ expandedZoneIds: ["climate.second"], brakingLevel: "high",
      braking: { configured_level: "high", effective_level: "default", active: false,
        stop_temperature: null, resume_temperature: null, setpoint_bound: null, reason } });
    const container = document.createElement("div");
    render(renderSensorsView(viewHost, ["climate.second"]), container);
    expect(container.querySelector<HTMLSelectElement>(".sensor-braking-select")!.value).toBe("high");
    expect(container.querySelector(".sensor-braking-inactive")?.textContent?.trim()).not.toBe("");
    expect(container.querySelector(".sensor-scale-braking-threshold")).toBeNull();
  });

  it("disables braking changes while the backend save is pending", () => {
    const { viewHost, saveZonePreconditioning } = host({ expandedZoneIds: ["climate.second"] });
    viewHost._settingsSaving = true;
    const container = document.createElement("div");
    render(renderSensorsView(viewHost, ["climate.second"]), container);
    const select = container.querySelector<HTMLSelectElement>(".sensor-braking-select")!;
    expect(select.disabled).toBe(true);
    select.value = "high";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saveZonePreconditioning).not.toHaveBeenCalled();
    expect(select.value).toBe("default");
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
    expect(container.querySelector("velair-room-assist-graph")).toBeNull();
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
    const descriptions = ["roomSensorAssistDeadbandDescription", "roomSensorAssistMinimumMarginDescription", "roomSensorAssistMaxDeltaDescription", "roomSensorAssistDebounceDescription"];
    const inputs = [...container.querySelectorAll<HTMLInputElement>(".sensor-number-fields input")];
    expect(inputs).toHaveLength(4);
    inputs.forEach((input, index) => {
      const description = document.getElementById(input.getAttribute("aria-describedby")!.split(" ")[0])
        ?? container.querySelector(`#${input.getAttribute("aria-describedby")!.split(" ")[0]}`)!;
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
  expect(container.querySelector("velair-room-assist-graph")).toBeNull();
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
    expect(container.querySelector("velair-room-assist-graph")).toBeNull();
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
    expect(container.querySelector("velair-room-assist-graph")).toBeNull();
    container.remove();
  });
});
