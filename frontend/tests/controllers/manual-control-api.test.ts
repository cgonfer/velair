import { describe, expect, it, vi } from "vitest";

import { VelairApiClient } from "../../src/velair/api/client";
import type { HomeAssistant, ScheduleResponse } from "../../src/velair/types";

describe("Manual control API", () => {
  it("enters Manual adjustment with entity_id only", async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue({} as ScheduleResponse);
    const api = new VelairApiClient({
      connection: { sendMessagePromise },
    } as unknown as HomeAssistant);

    await api.enterManualAdjustment("climate.office");

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "velair/enter_manual_adjustment",
      entity_id: "climate.office",
    });
  });
});
