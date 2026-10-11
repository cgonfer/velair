import { describe, expect, it, vi } from "vitest";
import { VelairApiClient } from "../../src/velair/api/client";
import type { HomeAssistant } from "../../src/velair/types";

describe("resource wire contracts", () => {
  it("sends a flat preset configuration with its captured revision", async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue({});
    const api = new VelairApiClient({ connection: { sendMessagePromise } } as unknown as HomeAssistant);
    await api.setBlockPreset({ key: "heat", name: "Heat", config: { action: "set_temperature", temperature: 21, hvac_mode: "heat" } }, 4);
    expect(sendMessagePromise).toHaveBeenCalledWith({ type: "velair/set_block_preset", key: "heat", name: "Heat", config: { action: "set_temperature", temperature: 21, hvac_mode: "heat" }, expected_revision: 4 });
  });
  it("sends linked Default days without duplicate blocks", async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue({});
    const api = new VelairApiClient({ connection: { sendMessagePromise } } as unknown as HomeAssistant);
    const link = { template_key: "workday", bindings: { a: { preset_key: "heat" } } };
    await api.setDailySchedule("climate.room", "monday", [], { template_link: link, expected_revision: 4 });
    expect(sendMessagePromise).toHaveBeenCalledWith({ type: "velair/set_daily_schedule", entity_id: "climate.room", weekday: "monday", template_link: link, expected_revision: 4 });
  });
  it("uses the read-only preview schema and includes atomic assignments on commit", async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue({});
    const api = new VelairApiClient({ connection: { sendMessagePromise } } as unknown as HomeAssistant);
    await api.previewScheduleTemplateUpdate("workday", "Workday", [], 2);
    expect(sendMessagePromise).toHaveBeenLastCalledWith({ type: "velair/preview_schedule_template_update", key: "workday", name: "Workday", blocks: [], expected_revision: 2 });
    await api.setScheduleTemplate("workday", "Workday", [], { expected_revision: 2, assignments: [] });
    expect(sendMessagePromise).toHaveBeenLastCalledWith({ type: "velair/set_schedule_template", key: "workday", name: "Workday", blocks: [], expected_revision: 2, assignments: [] });
  });
});
