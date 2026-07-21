import { describe, expect, it, vi } from "vitest";

import { VelairApiClient } from "../../src/velair/api/client";
import { saveClimateProfile } from "../../src/velair/controllers/climate-profile-actions";
import type { HomeAssistant, ScheduleResponse } from "../../src/velair/types";

describe("climate profile API contract", () => {
  it("uses the backend profile commands and payload field names", async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue({} as ScheduleResponse);
    const api = new VelairApiClient({ connection: { sendMessagePromise } } as unknown as HomeAssistant);
    const profile = { name: "Away", zones: {} };

    await api.setClimateProfile(profile);
    await api.deleteClimateProfile("away");
    await api.activateProfile("away");
    await api.activateProfile(null);

    expect(sendMessagePromise).toHaveBeenNthCalledWith(1, { type: "velair/set_profile", profile });
    expect(sendMessagePromise).toHaveBeenNthCalledWith(2, { type: "velair/delete_profile", key: "away" });
    expect(sendMessagePromise).toHaveBeenNthCalledWith(3, { type: "velair/activate_profile", profile_id: "away" });
    expect(sendMessagePromise).toHaveBeenNthCalledWith(4, { type: "velair/activate_profile", profile_id: null });
  });

  it("normalizes a draft before saving through the controller", async () => {
    const setClimateProfile = vi.fn().mockResolvedValue({} as ScheduleResponse);
    await saveClimateProfile(
      { setClimateProfile } as unknown as VelairApiClient,
      {
        name: "  Away  ",
        description: "  Lower energy  ",
        zones: { "climate.office": { behavior: "pause", action: "none" } },
      },
    );

    expect(setClimateProfile).toHaveBeenCalledWith({
      name: "Away",
      description: "Lower energy",
      zones: { "climate.office": { behavior: "pause", action: "none" } },
    });
  });
});
