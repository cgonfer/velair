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


it("sends explicit base, partial exception, Default and restore commands", async () => {
  const sendMessagePromise = vi.fn().mockResolvedValue({});
  const api = new VelairApiClient({ connection: { sendMessagePromise } } as unknown as HomeAssistant);
  await api.activateProfiles(["winter", "bedrooms"]);
  await api.applyProfiles(["work", "visitors"]);
  await api.setZoneProfile("climate.office", "work");
  await api.setZoneProfile("climate.office", null);
  await api.clearProfileOverrides(["climate.office", "climate.living"]);
  expect(sendMessagePromise.mock.calls.map(([message]) => message)).toEqual([
    { type: "velair/activate_profiles", profile_ids: ["winter", "bedrooms"] },
    { type: "velair/apply_profiles", profile_ids: ["work", "visitors"] },
    { type: "velair/set_zone_profile", entity_id: "climate.office", profile_id: "work" },
    { type: "velair/set_zone_profile", entity_id: "climate.office", profile_id: null },
    { type: "velair/clear_profile_overrides", entity_id: ["climate.office", "climate.living"] },
  ]);
});
