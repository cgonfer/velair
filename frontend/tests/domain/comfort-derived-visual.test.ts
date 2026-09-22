import { describe, expect, it } from "vitest";

import {
  comfortZonePlotModel,
  derivedComfortVisualModel,
  derivedMetricSourceSelection,
  derivedMetricSourceValue,
  formatComfortAbsoluteHumidity,
  humidexPerceivedHeatDelta,
  humidexScaleModel,
  temperatureAwareComfortZonePlotModel,
} from "../../src/velair/domain/comfort";
import type { ComfortAssessment, ComfortMetricAssessment } from "../../src/velair/types";

function metric(
  metricName: ComfortMetricAssessment["metric"],
  value: number | null,
  availability: ComfortMetricAssessment["availability"] = "current",
): ComfortMetricAssessment {
  return {
    availability,
    condition: null,
    metric: metricName,
    source: "velair",
    value,
  };
}

describe("derived Comfort visual model", () => {
  it("maps the single derived source selector without losing a retained entity", () => {
    expect(derivedMetricSourceValue("velair", "sensor.previous")).toBe("__velair__");
    expect(derivedMetricSourceValue("entity", "sensor.external")).toBe("sensor.external");
    expect(derivedMetricSourceValue("entity", null)).toBe("");
    expect(derivedMetricSourceSelection("__velair__", "sensor.previous")).toEqual({
      source: "velair",
      entity_id: "sensor.previous",
    });
    expect(derivedMetricSourceSelection("sensor.external", "sensor.previous")).toEqual({
      source: "entity",
      entity_id: "sensor.external",
    });
    expect(derivedMetricSourceSelection("", "sensor.previous")).toBeUndefined();
  });

  it("formats absolute humidity with shared locale-aware precision and no trailing zero", () => {
    expect(formatComfortAbsoluteHumidity(12.16, { locale: { language: "es-ES" } }))
      .toBe("12,16 g/m³");
    expect(formatComfortAbsoluteHumidity(14.6, { locale: { language: "en-US" } }))
      .toBe("14.6 g/m³");
  });

  it.each([
    [24, "warmer", "warm", 4],
    [18, "cooler", "cool", -2],
    [20, "neutral", "neutral", 0],
  ] as const)("compares Celsius Humidex %s", (humidex, direction, tone, delta) => {
    const result = derivedComfortVisualModel(
      "humidex",
      metric("humidex", humidex),
      metric("temperature", 20),
      "°C",
    );

    expect(result.relation).toEqual({ delta, direction, roomTemperature: 20 });
    expect(result.tone).toBe(tone);
  });

  it.each([
    [20.04, "°C"],
    [19.98, "°F"],
  ] as const)("keeps Humidex neutral when its visible %s delta rounds to zero", (humidex, unit) => {
    const temperature = unit === "°F" ? 68 : 20;
    const result = derivedComfortVisualModel(
      "humidex",
      metric("humidex", humidex),
      metric("temperature", temperature),
      unit,
    );

    expect(result.relation?.direction).toBe("neutral");
    expect(result.tone).toBe("neutral");
    expect(Object.is(result.relation?.delta, -0)).toBe(false);
  });

  it.each([
    [22, 3.6, "warmer"],
    [18, -3.6, "cooler"],
    [20, 0, "neutral"],
  ] as const)("converts only the Fahrenheit Humidex delta for %s", (humidex, delta, direction) => {
    const result = derivedComfortVisualModel(
      "humidex",
      metric("humidex", humidex),
      metric("temperature", 68),
      "°F",
    );

    expect(result.relation).toEqual({
      delta,
      direction,
      roomTemperature: 68,
    });
  });

  it("describes dew-point distance only when room temperature is current", () => {
    const reading = metric("dew_point", 12);
    expect(
      derivedComfortVisualModel("dew_point", reading, metric("temperature", 20), "°C").relation,
    ).toEqual({ delta: 8, direction: "neutral", roomTemperature: 20 });
    expect(
      derivedComfortVisualModel("dew_point", reading, undefined, "°C").relation,
    ).toBeUndefined();
  });

  it("converts a Fahrenheit dew-point distance without applying an offset", () => {
    const result = derivedComfortVisualModel(
      "dew_point",
      metric("dew_point", 50),
      metric("temperature", 68),
      "°F",
    );

    expect(result.relation).toEqual({ delta: 18, direction: "neutral", roomTemperature: 68 });
  });

  it.each([
    [20, 20, "°C"],
    [19.96, 20, "°C"],
    [67.96, 68, "°F"],
  ] as const)(
    "omits a dew-point relation when %s and room temperature %s display no difference",
    (dewPoint, roomTemperature, unit) => {
      const result = derivedComfortVisualModel(
        "dew_point",
        metric("dew_point", dewPoint),
        metric("temperature", roomTemperature),
        unit,
      );

      expect(result.relation).toBeUndefined();
    },
  );

  it("keeps absolute humidity neutral without a relation", () => {
    const result = derivedComfortVisualModel(
      "absolute_humidity",
      metric("absolute_humidity", 9.8),
      metric("temperature", 20),
      "°C",
    );

    expect(result).toMatchObject({ tone: "neutral", value: 9.8 });
    expect(result.relation).toBeUndefined();
  });

  it.each(["missing", "stale", "invalid", "not_monitored"] as const)(
    "does not relate %s readings",
    (availability) => {
      const result = derivedComfortVisualModel(
        "humidex",
        metric("humidex", null, availability),
        metric("temperature", 20),
        "°C",
      );
      expect(result).toEqual({ availability, kind: "humidex", tone: "neutral" });
    },
  );

  it.each([
    ["°C", 20, 25.7, 5.7],
    ["°F", 68, 25.7, 10.26],
  ] as const)("returns the exact %s perceived-heat delta for insights", (unit, room, humidex, expected) => {
    const assessment = {
      temperature: metric("temperature", room),
      derived_metrics: { humidex: metric("humidex", humidex) },
    } as ComfortAssessment;

    expect(humidexPerceivedHeatDelta(assessment, unit)).toBeCloseTo(expected);
  });
});

describe("Humidex scale model", () => {
  it("uses a five Celsius degree context around inclusive configured bounds", () => {
    const reading = {
      ...metric("humidex", 25),
      temperature_range_position: "above" as const,
    };
    const result = humidexScaleModel(
      reading,
      { ...metric("temperature", 20), condition: "comfortable" },
      20,
      24,
      "°C",
    );

    expect(result).toMatchObject({
      domainMinimum: 15,
      domainMaximum: 29,
      rangePosition: "above",
      airCondition: "comfortable",
      airValue: 20,
      connectorVisible: true,
    });
    expect(result?.bandStart).toBeCloseTo(35.714);
    expect(result?.bandEnd).toBeCloseTo(64.286);
  });

  it("converts Fahrenheit absolute coordinates while keeping the canonical Humidex value", () => {
    const reading = {
      ...metric("humidex", 25),
      temperature_range_position: "above" as const,
    };
    const result = humidexScaleModel(
      reading,
      { ...metric("temperature", 68), condition: "comfortable" },
      68,
      75.2,
      "°F",
    );

    expect(result?.domainMinimum).toBeCloseTo(59);
    expect(result?.domainMaximum).toBeCloseTo(84.2);
    expect(result?.airPosition).toBeCloseTo(35.714);
    expect(result?.airValue).toBe(68);
    expect(result?.humidexPosition).toBeCloseTo(71.429);
  });

  it("hides a negligible connector and treats an absent semantic field as neutral", () => {
    const result = humidexScaleModel(
      metric("humidex", 20.09),
      metric("temperature", 20),
      20,
      24,
      "°C",
    );

    expect(result?.connectorVisible).toBe(false);
    expect(result?.rangePosition).toBeNull();
  });

  it("rejects unusable readings and invalid ranges", () => {
    expect(humidexScaleModel(metric("humidex", 22, "missing"), metric("temperature", 20), 20, 24, "°C"))
      .toBeUndefined();
    expect(humidexScaleModel(metric("humidex", 22), metric("temperature", 20), 24, 20, "°C"))
      .toBeUndefined();
  });
});

describe("temperature-aware Comfort zone plot model", () => {
  it("uses backend geometry and effective range without interpolating it", () => {
    const result = temperatureAwareComfortZonePlotModel({
      model: "temperature_aware",
      temperature_min: 20,
      temperature_max: 24,
      points: [
        { temperature: 20, humidity_min: 40, humidity_max: 60 },
        { temperature: 24, humidity_min: 35, humidity_max: 50 },
      ],
      effective_humidity_range: {
        temperature: 22,
        minimum: 37.5,
        maximum: 55,
      },
    }, 22, 56);

    expect(result?.markerX).toBe(50);
    expect(result?.effective).toEqual({
      basisTemperature: 22,
      minimum: 37.5,
      maximum: 55,
    });
    expect(result?.polygon).toContain("33.33333333333333%");
    expect(result?.polygon).toContain("66.66666666666666%");
  });

  it("falls back when an old or malformed backend has no usable geometry", () => {
    expect(temperatureAwareComfortZonePlotModel(undefined, 22, 50)).toBeUndefined();
    expect(temperatureAwareComfortZonePlotModel({
      model: "simple",
      temperature_min: 20,
      temperature_max: 24,
      points: [],
    }, 22, 50)).toBeUndefined();
  });

  it("renders every backend Guided sample and rejects an inverted band", () => {
    const points = Array.from({ length: 17 }, (_, index) => ({
      temperature: 20 + index / 4,
      humidity_min: 48 - index / 2,
      humidity_max: 68 - index * 0.75,
    }));
    const result = comfortZonePlotModel({
      model: "guided",
      temperature_min: 20,
      temperature_max: 24,
      points,
      effective_humidity_range: {
        temperature: 22,
        minimum: 44,
        maximum: 62,
      },
    }, 22, 50);

    expect(result?.polygon.split(",")).toHaveLength(34);
    expect(comfortZonePlotModel({
      model: "guided",
      temperature_min: 20,
      temperature_max: 24,
      points: [
        { temperature: 20, humidity_min: 60, humidity_max: 40 },
        { temperature: 24, humidity_min: 35, humidity_max: 50 },
      ],
      effective_humidity_range: null,
    }, 22, 50)).toBeUndefined();
  });
});
