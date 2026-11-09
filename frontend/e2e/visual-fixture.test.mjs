import test from "node:test";
import assert from "node:assert/strict";
import { installVisualFixture, visualFixture, visualStateMessage, VISUAL_TIME } from "./visual-fixture.mjs";

const entities = ["climate.quality_heat_01", "climate.quality_cool_02", "climate.quality_range_03"];
const source = () => ({ configured_entities: entities, settings: { first_weekday: "sunday", zone_order: [...entities].reverse() },
  zones: Object.fromEntries(entities.map(entity => [entity, { enabled: false, schedule: {}, override: { type: "pause" } }])),
  global: { mode: "paused" }, operation_status: { state: "running", started_at: new Date().toISOString() },
  next_events: [], active_overrides: { [entities[0]]: { until: new Date().toISOString() } },
});

test("rendering inputs give heating, cooling and range the same fixed Monday and complete weekly plans", () => {
  const live = source();
  const original = structuredClone(live);
  const fixture = visualFixture(live, entities);
  assert.deepEqual(live, original, "building rendering data must not mutate the real API response");
  assert.equal(fixture.version, 1);
  assert.equal(new Date(fixture.time).toISOString(), "2026-01-05T09:30:00.000Z");
  assert.equal(fixture.data.global.mode, "auto");
  assert.equal(fixture.data.operation_status, null);
  assert.deepEqual(fixture.data.active_overrides, {});
  assert.equal(fixture.data.next_effective_events.length, 3);
  for (const [index, entity] of entities.entries()) {
    assert.equal(Object.keys(fixture.data.zones[entity].schedule).length, 7);
    assert.equal(fixture.data.zones[entity].schedule.monday.length, 6);
    assert.equal(fixture.data.next_effective_events[index].event.start, "12:00");
    assert.equal(fixture.data.zone_runtime[entity].state, "scheduled");
    assert.equal(fixture.data.zones[entity].override, null);
  }
  assert.equal(fixture.data.zone_runtime[entities[0]].target_temperature, 19);
  assert.equal(fixture.data.zone_runtime[entities[1]].target_temperature, 24);
  assert.equal(fixture.data.zone_runtime[entities[2]].target_temp_low, 19);
  assert.equal(fixture.data.zone_runtime[entities[2]].target_temp_high, 24);
  assert.equal(fixture.data.next_events[2].target_temp_low, 20);
  assert.equal(fixture.data.next_events[2].target_temp_high, 24);
});

test("a changed fixture installation or missing API envelope fails before recording screenshots", () => {
  for (const data of [undefined, {}, { ...source(), zones: {} }, { ...source(), configured_entities: [] }]) {
    assert.throws(() => visualFixture(data, entities), /current disposable HA/);
  }
  assert.throws(() => visualFixture(source(), [...entities].reverse()), /current disposable HA/);
});

test("full and compact HA states stay fixed while unrelated shell messages pass through", () => {
  const fixture = visualFixture(source(), entities);
  const commands = new Map([[1, "get_states"], [2, "subscribe_entities"]]);
  const unrelated = { entity_id: "light.quality_light_01", state: "on", attributes: {} };
  const full = { id: 1, type: "result", success: true, result: [{ entity_id: entities[0], state: "off", attributes: {} }, unrelated] };
  const normalized = visualStateMessage(full, commands, fixture);
  assert.equal(normalized.result[0].state, "heat");
  assert.equal(normalized.result[0].last_updated, VISUAL_TIME);
  assert.deepEqual(normalized.result[1], unrelated);
  assert.equal(full.result[0].state, "off");
  const initial = visualStateMessage({ id: 2, type: "event", event: { a: { [entities[2]]: { s: "off", a: {} } } } }, commands, fixture);
  assert.equal(initial.event.a[entities[2]].s, "heat_cool");
  assert.equal(initial.event.a[entities[2]].a.target_temp_high, 24);
  const update = { id: 2, type: "event", event: { c: { [entities[0]]: { "+": { s: "off" } }, "light.quality_light_01": { "+": { s: "off" } } }, r: [entities[1], "light.removed"] } };
  const fixed = visualStateMessage(update, commands, fixture);
  assert.equal(fixed.event.c[entities[0]], undefined);
  assert.deepEqual(fixed.event.r, ["light.removed"]);
  assert.deepEqual(fixed.event.c["light.quality_light_01"], update.event.c["light.quality_light_01"]);
  const auth = { type: "auth_required", ha_version: "2026.11.0" };
  assert.equal(visualStateMessage(auth, commands, fixture), auth);
  assert.deepEqual(visualStateMessage([auth, full], commands, fixture), [auth, normalized]);
});

test("only the installed visual page receives schedule fixtures; authentication and normal HA commands still reach the server", async () => {
  const fixture = visualFixture(source(), entities);
  const replies = [];
  const forwarded = [];
  let browserHandler, serverHandler, clockTime;
  const server = { onMessage(handler) { serverHandler = handler; }, send(raw) { forwarded.push(JSON.parse(raw)); } };
  const socket = { connectToServer() { return server; }, onMessage(handler) { browserHandler = handler; }, send(raw) { replies.push(JSON.parse(raw)); } };
  await installVisualFixture({ clock: { async setFixedTime(time) { clockTime = time.toISOString(); } },
    async routeWebSocket(pattern, handler) { assert.ok(pattern.test("ws://127.0.0.1:8123/api/websocket")); handler(socket); } }, fixture);
  assert.equal(clockTime, "2026-01-05T09:30:00.000Z");
  browserHandler(JSON.stringify({ type: "auth", access_token: "synthetic-test-token" }));
  browserHandler(JSON.stringify({ id: 1, type: "get_config" }));
  browserHandler(JSON.stringify({ id: 2, type: "velair/get_schedule" }));
  browserHandler(JSON.stringify({ id: 3, type: "velair/subscribe_updates", partial_updates: true }));
  browserHandler(JSON.stringify({ id: 4, type: "unsubscribe_events", subscription: 3 }));
  assert.deepEqual(forwarded.map(message => message.type), ["auth", "get_config"]);
  assert.deepEqual(replies[0].result, fixture.data);
  assert.equal(replies[2].event.loaded, true);
  assert.deepEqual(replies[2].event.schedule, fixture.data);
  assert.equal(replies[3].success, true);
  const response = { id: 1, type: "result", success: true, result: { time_zone: "Europe/Madrid" } };
  serverHandler(JSON.stringify(response));
  assert.deepEqual(replies.at(-1), response);
});
