import { expect } from "@playwright/test";

export const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function localMinute(instant, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone, weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(instant)).map(({ type, value }) => [type, value]));
  return { weekday: parts.weekday.toLowerCase(), start: `${parts.hour}:${parts.minute}` };
}

export async function scheduleResponse(api) {
  return api.call({ type: "velair/get_schedule" });
}

export async function liveStates(api, entities) {
  const states = await api.call({ type: "get_states" });
  return entities.map((entity) => {
    const state = states.find((item) => item.entity_id === entity);
    expect(state, `fixture climate ${entity} exists`).toBeTruthy();
    return state;
  });
}

export async function setDay(api, entity, weekday, blocks, templateLink) {
  const current = await scheduleResponse(api);
  return api.call({
    type: "velair/set_daily_schedule", entity_id: entity, weekday,
    expected_revision: current.configuration_revision,
    ...(templateLink ? { template_link: templateLink } : { blocks, unlink_template: true }),
  });
}

export async function setWeek(api, entity, blocks) {
  const current = await scheduleResponse(api);
  return api.call({ type: "velair/set_schedule_days", entity_id: entity, weekdays,
    blocks, unlink_template: true, expected_revision: current.configuration_revision });
}

export async function observeDeliveries(api, entities) {
  const entries = [];
  const stop = await api.subscribe("velair_event", (event) => {
    const data = event.data;
    if (data?.event === "climate_target_applied" && entities.includes(data.entity_id)) {
      entries.push({ ...data, firedAt: Date.parse(event.time_fired), receivedAt: Date.now() });
    }
  });
  return { entries, stop };
}

/** Restore only the selected synthetic zones and selection fragments this test changes. */
export async function isolatedZones(api, entities, body) {
  const original = await scheduleResponse(api);
  const devices = await liveStates(api, entities);
  for (const entity of entities) {
    expect(original.zones[entity].enabled, `${entity} is enabled`).toBe(true);
    expect(original.zone_runtime[entity].control_mode).toBe("automatic");
    expect(original.zones[entity].pauses ?? []).toEqual([]);
    expect(original.active_overrides?.[entity]).toBeUndefined();
    expect(["scheduled", "idle"]).toContain(original.operational_status);
  }
  try {
    for (const entity of entities) {
      await api.call({ type: "velair/set_zone_profile", entity_id: entity, profile_id: null });
      await api.service("velair_test", "control", { entity_id: entity, available: true });
    }
    await body(original);
  } finally {
    const errors = [];
    const restore = async (operation) => { try { await operation(); } catch (error) { errors.push(error); } };
    for (const entity of entities) {
      for (const day of weekdays) {
        await restore(() => setDay(api, entity, day, original.zones[entity].schedule[day] ?? [], original.zones[entity].template_links?.[day]));
      }
      const overrides = original.profile_selection?.zone_profile_overrides ?? {};
      await restore(() => api.call(Object.hasOwn(overrides, entity)
        ? { type: "velair/set_zone_profile", entity_id: entity, profile_id: overrides[entity] }
        : { type: "velair/clear_profile_overrides", entity_id: entity }));
    }
    for (const device of devices) {
      const attributes = device.attributes;
      const control = { entity_id: device.entity_id, available: device.state !== "unavailable" };
      if (["off", "heat", "cool", "heat_cool"].includes(device.state)) control.hvac_mode = device.state;
      for (const key of ["current_temperature", "temperature", "target_temp_low", "target_temp_high"]) {
        if (Number.isFinite(attributes[key])) control[key] = attributes[key];
      }
      await restore(() => api.service("velair_test", "control", control));
    }
    if (errors.length) throw new AggregateError(errors, "Core control test could not restore its synthetic zones");
  }
}
