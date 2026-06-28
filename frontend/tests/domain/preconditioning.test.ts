import { describe, expect, it } from "vitest";

import { outdoorTemperatureSensorOptions } from "../../src/velair/domain/preconditioning";
import type { HomeAssistant } from "../../src/velair/types";

describe("preconditioning domain", () => {
  it("lists temperature sensors and sensors using the configured temperature unit", () => {
    const hass: HomeAssistant = {
      callService: async () => {},
      connection: {
        sendMessagePromise: async () => undefined,
        subscribeMessage: async () => async () => {},
      },
      config: {
        unit_system: {
          temperature: "°C",
        },
      },
      states: {
        "binary_sensor.window": {
          state: "off",
          attributes: { friendly_name: "Window" },
        },
        "sensor.aemet_temperature": {
          state: "24.1",
          attributes: {
            device_class: "temperature",
            friendly_name: "AEMET temperature",
            unit_of_measurement: "°C",
          },
        },
        "sensor.outdoor_helper": {
          state: "23.8",
          attributes: {
            friendly_name: "Outdoor helper",
            unit_of_measurement: "°C",
          },
        },
        "sensor.power": {
          state: "800",
          attributes: {
            friendly_name: "Power",
            unit_of_measurement: "W",
          },
        },
      },
    };

    expect(outdoorTemperatureSensorOptions(hass, "")).toEqual([
      {
        entityId: "sensor.aemet_temperature",
        label: "AEMET temperature (24.1 °C)",
      },
      {
        entityId: "sensor.outdoor_helper",
        label: "Outdoor helper (23.8 °C)",
      },
    ]);
  });

  it("keeps the currently selected sensor visible even when it does not match the filter", () => {
    const hass: HomeAssistant = {
      callService: async () => {},
      connection: {
        sendMessagePromise: async () => undefined,
        subscribeMessage: async () => async () => {},
      },
      config: {
        unit_system: {
          temperature: "°C",
        },
      },
      states: {
        "sensor.legacy_outdoor": {
          state: "unknown",
          attributes: {
            friendly_name: "Legacy outdoor",
            unit_of_measurement: "custom",
          },
        },
      },
    };

    expect(outdoorTemperatureSensorOptions(hass, "sensor.legacy_outdoor")).toEqual([
      {
        entityId: "sensor.legacy_outdoor",
        label: "Legacy outdoor (sensor.legacy_outdoor)",
      },
    ]);
  });
});
