import { test, expect } from "@playwright/test";
import { assertFitsViewport, connect, openPanel, readState } from "./helpers.mjs";
import { isolatedZones, setWeek } from "./control-helpers.mjs";

const state = readState();

test("Room Assist thermostat opt-in exposes a room target without changing the schedule", async ({ page }, testInfo) => {
  const api = await connect(state);
  const zone = state.climate_entities[0];
  const sensor = state.fixture_entities.sensor[0];
  const read = () => api.call({ type: "velair/get_schedule" });
  const readEntities = () => api.call({ type: "get_states" });
  const proxy = async () => (await readEntities()).find(({ attributes }) => attributes.velair_room_assist_zone === zone);
  const patch = (preconditioning) => api.call({ type: "velair/update_zone_preconditioning", entity_id: zone, preconditioning });

  try {
    await isolatedZones(api, [zone], async (original) => {
      const prior = original.zones[zone].preconditioning;
      try {
        await setWeek(api, zone, [{ start: "00:00", action: "set_temperature", hvac_mode: "heat", temperature: 19 }]);
        const schedule = (await read()).zones[zone].schedule;
        await patch({ enabled: false, room_temperature_entity_id: sensor,
          room_sensor_assist_enabled: true, room_assist_climate_enabled: false });
        await api.service("velair", "apply_schedule", { entity_id: zone });
        expect(await proxy()).toBeUndefined();

        const card = await openPanel(page, "/sensors");
        const room = card.locator(".sensor-zone").filter({ hasText: zone });
        await room.locator(".sensor-zone-toggle").click();
        const toggle = room.locator('ha-switch[aria-label="Room Assist thermostat"]');
        await assertFitsViewport(toggle, page);
        if (testInfo.project.use.hasTouch) await toggle.tap();
        else await toggle.click();
        await expect.poll(async () => (await proxy())?.state).toBe("heat");
        const { entity_id: entityId, attributes } = await proxy();
        const currentRoomReading = Number((await readEntities()).find(({ entity_id }) => entity_id === sensor).state);
        expect(attributes.hvac_modes).toEqual(["heat"]);
        expect(attributes.current_temperature).toBe(currentRoomReading);
        expect(attributes.temperature).toBe(19);

        await api.service("climate", "set_temperature", { entity_id: entityId, temperature: 23 });
        await expect.poll(async () => (await proxy())?.attributes.temperature).toBe(23);
        const result = await read();
        expect(result.zones[zone].schedule).toEqual(schedule);
        expect(result.room_sensor_assist[zone]).toMatchObject({ enabled: true, target_temperature: 23 });
        expect(result.active_overrides?.[zone]).toBeUndefined();
        await expect(api.service("climate", "set_hvac_mode", { entity_id: entityId, hvac_mode: "off" })).rejects.toThrow();
        await expect(patch({ room_temperature_entity_id: entityId })).rejects.toThrow();

        await api.service("homeassistant", "reload_config_entry", { entity_id: entityId });
        await expect.poll(async () => (await proxy())?.attributes.temperature).toBe(23);
        expect((await proxy()).entity_id).toBe(entityId);

        await openPanel(page, "/sensors");
        await room.locator(".sensor-zone-toggle").click();
        await expect(toggle).toBeEnabled();
        if (testInfo.project.use.hasTouch) await toggle.tap();
        else await toggle.click();
        await expect.poll(proxy).toBeUndefined();
        await expect.poll(async () => (await read()).room_sensor_assist[zone].target_temperature).toBe(19);
      } finally {
        await patch({ enabled: prior.enabled, room_temperature_entity_id: prior.room_temperature_entity_id,
          room_sensor_assist_enabled: prior.room_sensor_assist_enabled,
          room_assist_climate_enabled: prior.room_assist_climate_enabled ?? false });
      }
    });
  } finally {
    api.close();
  }
});
