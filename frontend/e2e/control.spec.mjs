import { test, expect } from "@playwright/test";
import { connect, delay, readState } from "./helpers.mjs";
import { isolatedZones, liveStates, localMinute, observeDeliveries, scheduleResponse, setDay, setWeek } from "./control-helpers.mjs";

const annotation = (id) => ({ annotation: [
  { type: "velair-action", description: id }, { type: "velair-variant", description: "default" },
] });

test("automatic schedules reach heating cooling and range climates at their real deadlines", annotation("schedule.execute-boundary"), async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The HA scheduler is independent of screen size");
  test.setTimeout(180_000);
  const state = readState();
  const api = await connect(state);
  const entities = state.climate_entities.slice(0, 3);
  let proof;
  try {
    await isolatedZones(api, entities, async () => {
      const config = await api.call({ type: "get_config" });
      const baseline = [
        { action: "set_temperature", hvac_mode: "heat", temperature: 18 },
        { action: "set_temperature", hvac_mode: "cool", temperature: 26 },
        { action: "set_temperature", hvac_mode: "heat_cool", target_temp_low: 18, target_temp_high: 26 },
      ];
      const targets = [
        { action: "set_temperature", hvac_mode: "heat", temperature: 22 },
        { action: "set_temperature", hvac_mode: "cool", temperature: 23 },
        { action: "set_temperature", hvac_mode: "heat_cool", target_temp_low: 19, target_temp_high: 24 },
      ];
      let deadline, offDeadline, targetClock, offClock;
      const matchesTarget = (entry) => entry.start === targetClock.start && entry.weekday === targetClock.weekday
        && entities.some((entity, index) => entry.entity_id === entity
          && Object.entries(targets[index]).every(([key, value]) => entry[key] === value));
      const matchesOff = (entry) => entities.includes(entry.entity_id) && entry.start === offClock.start
        && entry.weekday === offClock.weekday && entry.action === "turn_off";
      const assertNotEarly = (entries, expectedDeadline) => {
        for (const entry of entries) {
          expect(Number.isFinite(entry.firedAt), "Delivery has an authoritative HA event timestamp").toBe(true);
          expect(entry.firedAt, "HA did not fire the successful delivery before its real deadline").toBeGreaterThanOrEqual(expectedDeadline);
          expect(entry.receivedAt, "Delivery was not received before its real deadline").toBeGreaterThanOrEqual(expectedDeadline);
        }
      };
      await test.step("execution.prepare", async () => {
        for (let index = 0; index < entities.length; index++) {
          await setWeek(api, entities[index], [{ start: "00:00", ...baseline[index] }]);
          await api.service("velair", "apply_schedule", { entity_id: entities[index] });
        }
        await expect.poll(async () => (await liveStates(api, entities)).map((item) => item.state)).toEqual(["heat", "cool", "heat_cool"]);
        // Docker and this Node process share the host's real wall clock. The
        // schedule uses HA's configured timezone; no browser clock is altered.
        deadline = Math.ceil((Date.now() + 15_000) / 60_000) * 60_000;
        offDeadline = deadline + 60_000;
        targetClock = localMinute(deadline, config.time_zone);
        offClock = localMinute(offDeadline, config.time_zone);
        proof = await observeDeliveries(api, entities);
        for (let index = 0; index < entities.length; index++) {
          const changes = new Map();
          for (const [clock, block] of [[targetClock, targets[index]], [offClock, { action: "turn_off" }]]) {
            const entries = changes.get(clock.weekday) ?? new Map([["00:00", { start: "00:00", ...baseline[index] }]]);
            entries.set(clock.start, { start: clock.start, ...block });
            changes.set(clock.weekday, entries);
          }
          for (const [day, blocks] of changes) await setDay(api, entities[index], day, [...blocks.values()].sort((a, b) => a.start.localeCompare(b.start)));
        }
        expect(deadline - Date.now(), "Schedule setup leaves a real pre-deadline observation window").toBeGreaterThan(5_000);
      });
      await test.step("execution.before-deadline", async () => {
        await delay(Math.max(0, deadline - Date.now() - 5000));
        expect(Date.now()).toBeLessThan(deadline);
        const live = await liveStates(api, entities);
        expect(live.map((item) => item.state)).toEqual(["heat", "cool", "heat_cool"]);
        expect(live[0].attributes.temperature).toBe(18);
        expect(live[1].attributes.temperature).toBe(26);
        expect(live[2].attributes.target_temp_low).toBe(18);
        expect(live[2].attributes.target_temp_high).toBe(26);
        expect(proof.entries.filter(matchesTarget)).toEqual([]);
      });
      await test.step("execution.targets", async () => {
        await delay(Math.max(0, deadline - Date.now()));
        await expect.poll(async () => {
          const live = await liveStates(api, entities);
          return live.map((item, index) => ({ state: item.state,
            ...(index === 2 ? { low: item.attributes.target_temp_low, high: item.attributes.target_temp_high } : { temperature: item.attributes.temperature }) }));
        }, { timeout: 15_000 }).toEqual([
          { state: "heat", temperature: 22 }, { state: "cool", temperature: 23 }, { state: "heat_cool", low: 19, high: 24 },
        ]);
        await expect.poll(() => proof.entries.filter(matchesTarget).length).toBe(3);
        assertNotEarly(proof.entries.filter(matchesTarget), deadline);
      });
      await test.step("execution.off", async () => {
        await delay(Math.max(0, offDeadline - Date.now()));
        await expect.poll(async () => (await liveStates(api, entities)).map((item) => item.state), { timeout: 15_000 }).toEqual(["off", "off", "off"]);
        await expect.poll(() => proof.entries.filter(matchesOff).length).toBe(3);
        // An extra settling interval detects repeated successful delivery, not
        // just a final entity state that could conceal duplicate commands.
        await delay(1000);
        for (const entity of entities) {
          expect(proof.entries.filter((entry) => entry.entity_id === entity && matchesTarget(entry))).toHaveLength(1);
          expect(proof.entries.filter((entry) => entry.entity_id === entity && matchesOff(entry))).toHaveLength(1);
        }
        assertNotEarly(proof.entries.filter(matchesTarget), deadline);
        assertNotEarly(proof.entries.filter(matchesOff), offDeadline);
      });
    });
  } finally {
    try { if (proof) await proof.stop(); } finally { api.close(); }
  }
});

test("Manual survives schedule changes and Automatic respects an independent pause", annotation("control.manual-resume"), async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Control ownership does not depend on screen size");
  const state = readState();
  const entity = state.climate_entities[0];
  const api = await connect(state);
  const pauseId = "quality_independent_control_guard";
  let manualCreated = false, pauseCreated = false, proof;
  try {
    await isolatedZones(api, [entity], async (original) => {
      try {
        await test.step("manual.prepare", async () => {
          await setWeek(api, entity, [{ start: "00:00", action: "set_temperature", hvac_mode: "heat", temperature: 18 }]);
          await api.service("velair", "apply_schedule", { entity_id: entity });
          await expect.poll(async () => (await liveStates(api, [entity]))[0].attributes.temperature).toBe(18);
          proof = await observeDeliveries(api, [entity]);
        });
        await test.step("manual.enter", async () => {
          await api.call({ type: "velair/enter_manual_adjustment", entity_id: entity });
          manualCreated = true;
          await api.service("climate", "set_temperature", { entity_id: entity, temperature: 25 });
          await expect.poll(async () => (await liveStates(api, [entity]))[0].attributes.temperature).toBe(25);
          await expect.poll(async () => (await scheduleResponse(api)).zone_runtime[entity].control_mode).toBe("manual");
          expect((await scheduleResponse(api)).zones[entity].external_change_policy).toEqual(original.zones[entity].external_change_policy);
          proof.entries.length = 0;
        });
        await test.step("manual.hold", async () => {
          await setWeek(api, entity, [{ start: "00:00", action: "set_temperature", hvac_mode: "heat", temperature: 22 }]);
          expect((await scheduleResponse(api)).zones[entity].schedule.monday[0].temperature).toBe(22);
          await delay(2000);
          expect((await liveStates(api, [entity]))[0].attributes.temperature).toBe(25);
          expect((await scheduleResponse(api)).zone_runtime[entity].control_mode).toBe("manual");
          expect(proof.entries).toEqual([]);
        });
        await test.step("manual.resume-paused", async () => {
          await api.service("velair", "pause_zone", { entity_id: entity, pause_id: pauseId, action: "none" });
          pauseCreated = true;
          await api.call({ type: "velair/resume_automatic_control", entity_id: entity });
          manualCreated = false;
          const current = await scheduleResponse(api);
          expect(current.zone_runtime[entity].control_mode).toBe("automatic");
          expect(current.zone_runtime[entity].pause_ids).toEqual([pauseId]);
          expect(current.zone_runtime[entity].state).toBe("paused");
          await delay(1000);
          expect((await liveStates(api, [entity]))[0].attributes.temperature).toBe(25);
          expect(proof.entries).toEqual([]);
        });
        await test.step("manual.resume-current", async () => {
          await api.service("velair", "resume_zone", { entity_id: entity, pause_id: pauseId });
          pauseCreated = false;
          await expect.poll(async () => (await liveStates(api, [entity]))[0].attributes.temperature).toBe(22);
          const current = await scheduleResponse(api);
          expect(current.zone_runtime[entity].control_mode).toBe("automatic");
          expect(current.zones[entity].pauses ?? []).toEqual([]);
          expect(current.zones[entity].external_change_policy).toEqual(original.zones[entity].external_change_policy);
          await expect.poll(() => proof.entries.filter((entry) => entry.temperature === 22).length).toBe(1);
        });
      } finally {
        const errors = [];
        for (const cleanup of [
          async () => { if (manualCreated) await api.call({ type: "velair/resume_automatic_control", entity_id: entity }); },
          async () => { if (pauseCreated) await api.service("velair", "resume_zone", { entity_id: entity, pause_id: pauseId }); },
          async () => { if (proof) await proof.stop(); },
        ]) { try { await cleanup(); } catch (error) { errors.push(error); } }
        if (errors.length) throw new AggregateError(errors, "Manual-control test could not clear its own sessions");
      }
    });
  } finally { api.close(); }
});
