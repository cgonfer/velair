import { describe, expect, it } from "vitest";

import {
  portableExportSummaryItems,
  portableImportSummaryItems,
  portableSectionsFromPayload,
  unmatchedPreconditioningLearningEntities,
  validatePortablePayload,
} from "../../src/velair/domain/portable";
import type { VelairPortablePayload } from "../../src/velair/types";

const payload: VelairPortablePayload = {
  format: "velair_portable_data",
  model_version: 1,
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
    })).toEqual([{ section: "preconditioning_learning", value: 2 }]);
    expect(portableImportSummaryItems(payload)).toEqual([
      { section: "preconditioning_learning", value: 2 },
    ]);
  });

  it("identifies learning entries that cannot match a managed climate", () => {
    expect(unmatchedPreconditioningLearningEntities(payload, ["climate.office"])).toEqual([
      "climate.removed",
    ]);
  });
});
