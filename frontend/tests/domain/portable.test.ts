import { describe, expect, it } from "vitest";

import {
  portableExportSummaryItems,
  portableImportSummaryItems,
  portableSectionsFromPayload,
  unmatchedPreconditioningLearningEntities,
  validatePortablePayload,
} from "../../src/velair/domain/portable";
import { PORTABLE_MODEL_VERSION } from "../../src/velair/constants";
import type { VelairPortablePayload } from "../../src/velair/types";

const payload: VelairPortablePayload = {
  format: "velair_portable_data",
  model_version: 2,
  temperature_unit: "°C",
  sections: {
    preconditioning_learning: {
      "climate.office": { heat: { observations: [] }, cool: { observations: [] } },
      "climate.removed": { heat: { observations: [] }, cool: { observations: [] } },
    },
  },
};

describe("portable preconditioning learning", () => {
  it("recognizes learning as an importable portable section", () => {
    expect(validatePortablePayload(payload)).toEqual({
      ok: true,
      sections: ["preconditioning_learning"],
    });
    expect(portableSectionsFromPayload(payload)).toEqual(["preconditioning_learning"]);
  });

  it("reports exported and imported climate counts", () => {
    expect(portableExportSummaryItems(new Set(["preconditioning_learning"]), {
      zones: 3,
      templates: 2,
      preconditioningLearning: 2,
      profiles: 1,
      modes: 1,
    })).toEqual([{ section: "preconditioning_learning", value: 2 }]);
    expect(portableImportSummaryItems(payload)).toEqual([
      { section: "preconditioning_learning", value: 2 },
    ]);
  });

  it("accepts portable model v4 profiles", () => {
    const profilesPayload: VelairPortablePayload = {
      ...payload,
      model_version: 4,
      sections: { profiles: [{ key: "away", name: "Away", zones: {} }] },
    };
    expect(validatePortablePayload(profilesPayload)).toEqual({ ok: true, sections: ["profiles"] });
    expect(portableImportSummaryItems(profilesPayload)).toEqual([{ section: "profiles", value: 1 }]);
  });

  it("accepts and summarizes portable model v5 modes", () => {
    const modesPayload: VelairPortablePayload = {
      ...payload,
      model_version: 5,
      sections: { modes: [{ key: "vacation", name: "Vacation", profile_ids: ["away"] }] },
    };
    expect(validatePortablePayload(modesPayload)).toEqual({ ok: true, sections: ["modes"] });
    expect(portableImportSummaryItems(modesPayload)).toEqual([{ section: "modes", value: 1 }]);
    expect(portableExportSummaryItems(new Set(["modes"]), {
      zones: 0,
      templates: 0,
      preconditioningLearning: 0,
      profiles: 0,
      modes: 2,
    })).toEqual([{ section: "modes", value: 2 }]);
  });

  it("accepts portable model v6 temperature ranges", () => {
    const rangePayload: VelairPortablePayload = {
      ...payload,
      model_version: 6,
      sections: {
        zones: {
          "climate.office": {
            enabled: true,
            schedule: { monday: [{ start: "08:00", target_temp_low: 19, target_temp_high: 24 }] },
          },
        },
      },
    };
    expect(validatePortablePayload(rangePayload)).toEqual({ ok: true, sections: ["zones"] });
  });

  it("accepts current v11 zone data and rejects future v12 data", () => {
    const current: VelairPortablePayload = {
      ...payload,
      model_version: 11,
      sections: {
        zones: {
          "climate.office": {
            enabled: true,
            schedule: {},
            preconditioning: {
              room_sensor_assist_deadband: 0.3,
            },
            external_change_policy: {
              action: "for_duration",
              duration_minutes: 90,
            },
            comfort: {
              derived_metrics: {
                humidex: { enabled: true, source: "velair" },
              },
              outdoor_comparison: {
                enabled: true,
                temperature_entity_id: "sensor.outdoor_temperature",
                humidity_entity_id: "sensor.outdoor_humidity",
              },
            },
          },
        },
      },
    };
    const roundTrip = JSON.parse(JSON.stringify(current)) as VelairPortablePayload;

    expect(PORTABLE_MODEL_VERSION).toBe(11);
    expect(validatePortablePayload(roundTrip)).toEqual({ ok: true, sections: ["zones"] });
    expect(roundTrip.sections.zones).toEqual(current.sections.zones);
    expect(validatePortablePayload({ ...roundTrip, model_version: 12 })).toEqual({
      ok: false,
      errorKey: "invalidImportFile",
    });
  });

  it("identifies learning entries that cannot match a managed climate", () => {
    expect(unmatchedPreconditioningLearningEntities(payload, ["climate.office"])).toEqual([
      "climate.removed",
    ]);
  });

  it("accepts raw v3 exports in either supported unit", () => {
    expect(validatePortablePayload({
      ...payload,
      model_version: 3,
      temperature_unit: "°F",
    })).toEqual({
      ok: true,
      sections: ["preconditioning_learning"],
    });
  });

  it("accepts legacy v1 temperature data as Celsius when the unit is absent", () => {
    expect(validatePortablePayload({ ...payload, model_version: 1, temperature_unit: undefined })).toEqual({
      ok: true,
      sections: ["preconditioning_learning"],
    });
  });
});
