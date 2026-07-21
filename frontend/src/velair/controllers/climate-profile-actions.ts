import type { VelairApiClient } from "../api/client";
import {
  climateProfileInput,
  climateProfileValidationError,
  type ClimateProfileDraft,
} from "../domain/climate-profiles";
import type { ScheduleResponse } from "../types";

export async function saveClimateProfile(
  api: VelairApiClient,
  draft: ClimateProfileDraft,
): Promise<ScheduleResponse> {
  const error = climateProfileValidationError(draft);
  if (error) {
    throw new Error(error);
  }
  return api.setClimateProfile(climateProfileInput(draft));
}

export function deleteClimateProfile(api: VelairApiClient, key: string): Promise<ScheduleResponse> {
  return api.deleteClimateProfile(key);
}

export function activateClimateProfile(
  api: VelairApiClient,
  key?: string | null,
): Promise<ScheduleResponse> {
  return api.activateProfile(key);
}
