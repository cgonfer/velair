import type { HassState, HomeAssistant, ScheduleResponse } from "../types";
import { orderedZoneIds } from "./settings";

/** Physical inventory stays distinct from the backend-owned policy identities. */
export function controlUnitId(data: ScheduleResponse | undefined, entityId: string): string {
  return data?.member_to_unit?.[entityId] ?? entityId;
}

export function controlUnitIds(data?: ScheduleResponse): string[] {
  return data?.control_units ?? data?.configured_entities ?? [];
}

export function orderedControlUnitIds(data?: ScheduleResponse): string[] {
  return orderedZoneIds(controlUnitIds(data), data?.settings?.unit_order ?? data?.settings?.zone_order);
}

export function expandedControlUnitIds(data?: ScheduleResponse): string[] {
  return orderedControlUnitIds(data).flatMap(id => data?.room_groups?.[id]?.members ?? [id]);
}

/** Physical views accept both explicit members and legacy/group card filters. */
export function filteredPhysicalClimateIds(data?: ScheduleResponse, selected?: string[]): string[] {
  const physical = expandedControlUnitIds(data);
  return selected?.length
    ? physical.filter(id => selected.includes(id) || selected.includes(controlUnitId(data, id)))
    : physical;
}

export function controlUnitState(data: ScheduleResponse | undefined, hass: HomeAssistant | undefined, entityId: string): HassState | undefined {
  return data?.room_groups?.[entityId] ? data.control_unit_states?.[entityId] : hass?.states?.[entityId];
}

export function controlUnitZone(data: ScheduleResponse | undefined, entityId: string) {
  return data?.zones?.[controlUnitId(data, entityId)];
}

export function controlUnitName(data: ScheduleResponse | undefined, hass: HomeAssistant | undefined, id: string): string {
  return data?.room_groups?.[id]?.name ?? hass?.states?.[id]?.attributes?.friendly_name ?? id;
}

/** Read-only view inputs; these are not registered Home Assistant entities. */
export function controlUnitStates(data: ScheduleResponse | undefined, hass: HomeAssistant | undefined): Record<string, HassState> {
  return { ...hass?.states, ...data?.control_unit_states };
}
