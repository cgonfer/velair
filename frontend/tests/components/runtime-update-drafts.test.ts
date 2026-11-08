// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { VelairCard } from "../../src/velair/components/velair-card-element";
import { ScheduleRuntimeUpdates } from "../../src/velair/controllers/schedule-runtime-updates";
import type { ComfortAssessment, DiagnosticsSnapshot, OperationStatus, ScheduleResponse } from "../../src/velair/types";

class RuntimeTestCard extends VelairCard {}
if (!customElements.get("runtime-update-draft-card")) customElements.define("runtime-update-draft-card", RuntimeTestCard);

type Internals = {
  _data?: ScheduleResponse;
  _dirty: boolean;
  _draftBlocks: unknown[];
  _templateDirty: boolean;
  _templateDraftBlocks: unknown[];
  _resetDraftBlocks(): void;
  _resetTemplateDraft(): void;
  _applyLocalScheduleData(data: ScheduleResponse): void;
};

describe("runtime pushes preserve card editing state", () => {
  for (const dirty of [false, true]) {
    it(`updates readings and progress without resetting ${dirty ? "dirty" : "clean"} drafts`, () => {
      const card = document.createElement("runtime-update-draft-card") as RuntimeTestCard;
      const internal = card as unknown as Internals;
      internal._data = {
        configured_entities: ["climate.a"], zones: {}, configuration_revision: 1,
        comfort: { "climate.a": { condition: "comfortable" } as ComfortAssessment },
      } as unknown as ScheduleResponse;
      internal._dirty = dirty;
      internal._templateDirty = dirty;
      const blocks = [{ start: "08:00", temperature: "21" }];
      const template = [{ start: "09:00", temperature: "22" }];
      internal._draftBlocks = blocks;
      internal._templateDraftBlocks = template;
      const resetBlocks = vi.spyOn(internal, "_resetDraftBlocks");
      const resetTemplate = vi.spyOn(internal, "_resetTemplateDraft");
      const diagnostics = { generated_at: "authoritative" } as DiagnosticsSnapshot;
      card._applyDiagnosticsSnapshot(diagnostics);
      const updates = new ScheduleRuntimeUpdates();
      updates.accept({ loaded: true, comfort: { "climate.a": { condition: "humid" } as ComfortAssessment } });
      updates.accept({ loaded: true, operation_status: { id: "active", state: "running", completed: 1 } as OperationStatus });
      internal._applyLocalScheduleData(updates.merge(internal._data!, 0, true));
      expect(internal._data?.comfort?.["climate.a"].condition).toBe("humid");
      expect(internal._data?.operation_status?.completed).toBe(1);
      expect(internal._data?.diagnostics).toBe(diagnostics);
      expect(internal._draftBlocks).toBe(blocks);
      expect(internal._templateDraftBlocks).toBe(template);
      expect(internal._dirty).toBe(dirty);
      expect(internal._templateDirty).toBe(dirty);
      expect(resetBlocks).not.toHaveBeenCalled();
      expect(resetTemplate).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  }
});
