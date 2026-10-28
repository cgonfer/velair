import { html, nothing, type TemplateResult } from "lit";
import type { VelairViewHost } from "../host-types";
import { renderInlineHelp } from "./inline-help";
import type { RoomGroup } from "../types";
import { activeClimateProfileZoneEffect, effectiveClimateSchedule } from "../domain/climate-profiles";
import { scheduledEventAt } from "../domain/schedule-events";
import { renderPreconditioningDependency } from "./preconditioning-dependency";

/** Scheduling needs only shared ownership context; live details stay in Groups. */
export function renderRoomGroupScheduleNotice(
  host: Pick<VelairViewHost, "_t" | "_friendlyEntityName">,
  group?: RoomGroup,
  context = "default",
) {
  if (!group) return nothing;
  const helpId = `room-group-schedule-${context}-${group.id}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  return html`<div class="notice external-execution-notice room-group-schedule-note">
    <ha-icon icon="mdi:home-group" aria-hidden="true"></ha-icon>
    <span class="room-group-schedule-copy">${host._t("roomGroupScheduleNotice", { group: group.name })}</span>
    ${renderInlineHelp(helpId, `${host._t("roomGroupMembers")}: ${group.name}`, group.members.map(id => `${host._friendlyEntityName(id)} (${id})`))}
  </div>`;
}

/** Clarify shared actions without replacing the member's individual readings. */
export function renderRoomGroupControlContext(host: Pick<VelairViewHost, "_t" | "_friendlyEntityName">, group?: RoomGroup) {
  if (!group) return nothing;
  const helpId = `climate-card-group-${group.id}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  return html`<span class="climate-card-group">
    <ha-icon icon="mdi:home-group" aria-hidden="true"></ha-icon>
    <span class="climate-card-group-name" title=${host._t("roomGroupControlledBy", { group: group.name })}>${group.name}</span>
    ${renderInlineHelp(helpId, `${host._t("roomGroupMembers")}: ${group.name}`, [host._t("climateCardSharedControlHelp"), ...group.members.map(id => `${host._friendlyEntityName(id)} (${id})`)])}
  </span>`;
}

/** Shared group configuration and policy state, with real per-member evidence. */
export function renderRoomGroupSummary(host: VelairViewHost, group?: RoomGroup) {
  if (!group) return nothing;
  const data = host._data;
  const zone = data?.zones[group.id];
  const state = data?.control_unit_states?.[group.id];
  const runtime = data?.zone_runtime?.[group.id];
  const learning = data?.preconditioning_learning?.[group.id];
  const assist = zone?.preconditioning;
  const assistStatus = data?.room_sensor_assist?.[group.id];
  const effect = activeClimateProfileZoneEffect(data, group.id);
  const schedule = effectiveClimateSchedule(data, group.id);
  const current = zone && schedule ? scheduledEventAt(group.id, { ...zone, schedule }, host._currentTimelineNow?.() ?? new Date()) : undefined;
  const next = data?.next_effective_events?.find(event => event.entity_id === group.id);
  const labels = { stopped: "overviewStatusStopped", paused: "pauseActive", boost: "boostActive", preconditioning: "preconditioning", scheduled: "overviewZoneScheduled", idle: "overviewZoneManual", externally_managed: "overviewZoneExternal" } as const;
  const fact = (label: string, value: string | TemplateResult) => html`<div class="resource-usage-item"><strong>${label}</strong><span>${value}</span></div>`;
  return html`<div class="room-group-details resource-usages">
    <p>${host._t("roomGroupSharedControl")}</p>
    ${fact(host._t("roomGroupTemperatureSource"), html`${host._friendlyEntityName(group.temperature_entity_id)} · ${typeof state?.attributes?.current_temperature === "number" ? host._formatTemperature(state.attributes.current_temperature, group.id) : host._t("roomGroupUnavailable")}`)}
    ${fact(host._t("roomSensorAssistBadge"), html`${host._t(assist?.room_sensor_assist_enabled ? "enabled" : "off")}${assist?.room_temperature_entity_id ? html` · ${host._friendlyEntityName(assist.room_temperature_entity_id)}${assist.room_sensor_assist_enabled ? html` · ${typeof assistStatus?.room_temperature === "number" ? host._formatTemperature(assistStatus.room_temperature, group.id) : host._t("roomGroupUnavailable")}` : nothing}` : nothing}`)}
    ${fact(host._t("roomGroupDelivery"), group.delivery_mode === "all" ? host._t("roomGroupDeliveryAll") : host._friendlyEntityName(group.delivery_entity_id ?? ""))}
    ${fact(host._t("roomGroupControlState"), html`${runtime ? host._t(labels[runtime.state]) : host._t("roomGroupAwaitingState")}${runtime?.control_mode === "manual" ? ` · ${host._t("manualAdjustment")}` : ""}`)}
    ${fact(host._t("profileOverviewLabel"), effect?.profile.name ?? host._t("defaultSchedules"))}
    ${current ? fact(host._t("roomGroupCurrentBlock"), html`${host._formatEventAction(current)} · ${host._formatEventMode(current)}`) : nothing}
    ${next?.when && next.event ? html`${fact(host._t("roomGroupNextAction"), html`${host._formatDateTime(next.when)} · ${host._formatEventAction(next.event)}`)}${renderPreconditioningDependency(next.event.preconditioning_dependency, host._t.bind(host), host._formatDateTime.bind(host), next.event.preconditioning_dependency ? host._friendlyEntityName(next.event.preconditioning_dependency.master_entity_id) : undefined)}` : nothing}
    ${fact(host._t("preconditioning"), html`${host._t(zone?.preconditioning?.enabled ? "enabled" : "off")}${learning ? ` · ${host._t("roomGroupLearningSamples", { count: learning.total_samples })}` : ""}`)}
    <div class="room-group-members resource-usages">${group.members.map(id => {
      const member = host.hass?.states?.[id];
      const unavailable = !member || ["unavailable", "unknown"].includes(member.state ?? "");
      const delivery = data?.group_delivery_status?.[group.id]?.[id];
      const destination = group.delivery_mode === "all" || group.delivery_entity_id === id;
      return html`<div class="room-group-member resource-usage-group"><header><ha-icon icon="mdi:thermostat" aria-hidden="true"></ha-icon><strong>${host._friendlyEntityName(id)}</strong></header>
        <small class="subtle">${id}</small>
        ${fact(host._t("roomGroupControlState"), html`<span class=${unavailable ? "room-group-warning" : "subtle"}>${unavailable ? host._t("roomGroupUnavailable") : host._modeLabel(member.state ?? "")}</span>`)}
        ${!unavailable && typeof member?.attributes?.current_temperature === "number" ? fact(host._t("currentTemperature"), host._formatTemperature(member.attributes.current_temperature, id)) : nothing}
        ${destination ? fact(host._t("roomGroupDelivery"), html`<span class=${delivery?.status === "failed" ? "room-group-warning" : "subtle"} title=${delivery?.message ?? ""}>${host._t(delivery?.status === "failed" ? "roomGroupDeliveryFailed" : delivery?.status === "success" ? "roomGroupDeliverySent" : "roomGroupDeliveryPending")}</span>`) : nothing}
      </div>`;
    })}</div>
  </div>`;
}
