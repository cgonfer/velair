import { randomUUID } from "node:crypto";
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

test("Room group rename refreshes the thermostat default without changing its HA identity or custom name", async () => {
  const api = await connect(state);
  const zone = state.climate_entities[0];
  const read = () => api.call({ type: "velair/get_schedule" });
  const mutateGroup = async (command) => api.call({
    ...command, expected_revision: (await read()).configuration_revision,
  });
  const setGroup = (group, source) => mutateGroup({
    type: "velair/set_room_group", group, ...(source ? { source_entity_id: source } : {}),
  });
  const optIn = (groupId, enabled) => api.call({
    type: "velair/update_zone_preconditioning", entity_id: groupId,
    preconditioning: { room_assist_climate_enabled: enabled },
  });
  const states = () => api.call({ type: "get_states" });
  const thermostatName = (name) => `${name} – Room Assist thermostat`;
  const findOriginal = async (name) => (await states()).find(({ entity_id, attributes }) =>
    entity_id.startsWith("climate.") && attributes.friendly_name?.endsWith(thermostatName(name)));
  const initialName = "Rename test room";
  const groupId = `group.quality_thermostat_rename_${randomUUID().replaceAll("-", "")}`;
  const group = { id: groupId, name: initialName, members: [zone], temperature_entity_id: zone, delivery_mode: "all" };

  try {
    try {
      await setGroup(group, zone);
      await optIn(groupId, true);
      await expect.poll(() => findOriginal(initialName)).toBeTruthy();
      const { entity_id: entityId } = await findOriginal(initialName);
      const registryEntry = () => api.call({ type: "config/entity_registry/get", entity_id: entityId });
      const customize = (name) => api.call({ type: "config/entity_registry/update", entity_id: entityId, name });
      const friendlyName = async () => (await states()).find(({ entity_id }) => entity_id === entityId)?.attributes.friendly_name;
      const { id: registryId } = await registryEntry();
      expect(registryId).toBeTruthy();

      const renamed = "Renamed test room";
      await setGroup({ ...group, name: renamed });
      await expect.poll(friendlyName).toMatch(/Renamed test room – Room Assist thermostat$/);
      expect(await registryEntry()).toMatchObject({ id: registryId, entity_id: entityId, original_name: thermostatName(renamed), name: null });

      const customName = "My HA thermostat";
      await customize(customName);
      await expect.poll(friendlyName).toContain(customName);
      const customFriendlyName = await friendlyName();
      const renamedAgain = "Renamed again test room";
      await setGroup({ ...group, name: renamedAgain });
      await expect.poll(registryEntry).toMatchObject({
        id: registryId, entity_id: entityId, original_name: thermostatName(renamedAgain), name: customName,
      });
      expect(await friendlyName()).toBe(customFriendlyName);
      await customize(null);
      await expect.poll(friendlyName).toMatch(/Renamed again test room – Room Assist thermostat$/);

      await optIn(groupId, false);
      await expect.poll(async () => (await api.call({ type: "config/entity_registry/list" }))
        .some(({ entity_id }) => entity_id === entityId)).toBe(false);
      expect((await states()).some(({ entity_id }) => entity_id === entityId)).toBe(false);
    } finally {
      if ((await read()).room_groups[groupId]) {
        await optIn(groupId, false);
        await mutateGroup({ type: "velair/remove_room_group", group_id: groupId });
      }
    }
  } finally {
    api.close();
  }
});
