// Versioned rendering inputs, used only by visual.spec.mjs. These do not
// replace the real HA APIs or real timers in functional/performance journeys.
export const VISUAL_FIXTURE_VERSION = 1;
export const VISUAL_TIME = "2026-01-05T10:30:00+01:00";
const nextTime = "2026-01-05T12:00:00+01:00";
const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const expectedEntities = ["climate.quality_heat_01", "climate.quality_cool_02", "climate.quality_range_03"];
const starts = ["00:00", "06:00", "09:00", "12:00", "18:00", "22:00"];
// Same public HA ClimateEntityFeature flags as the disposable climate fixture.
const climateFeatures = { temperature: 1, temperatureRange: 2, turnOff: 128, turnOn: 256 };

function blocks(kind, offset = 0) {
  return starts.map((start, index) => ({
    start, action: "set_temperature", hvac_mode: kind === "range" ? "heat_cool" : kind,
    ...(kind === "range"
      ? { target_temp_low: 19 + offset + index % 2, target_temp_high: 24 + offset }
      : { temperature: (kind === "cool" ? 24 : 19) + offset + index % 2 }),
  }));
}

function week(kind, offset = 0) {
  return Object.fromEntries(weekdays.map(day => [day, blocks(kind, offset)]));
}

/** Keep the current API envelope/capabilities, with one explicit layout scenario. */
export function visualFixture(source, entities) {
  if (!Array.isArray(entities) || expectedEntities.some((entity, index) => entities[index] !== entity)
    || !source || !Array.isArray(source.configured_entities) || !source.settings || !source.zones
    || expectedEntities.some(entity => !source.configured_entities.includes(entity) || !source.zones[entity]?.schedule)) {
    throw new Error("Visual fixture requires the current disposable HA schedule response and heating/cooling/range entities");
  }
  const data = structuredClone(source);
  const schedules = {};
  const states = {};
  const events = [];
  const runtime = {};
  data.zones = {};
  for (const [index, entity] of expectedEntities.entries()) {
    const kind = ["heat", "cool", "range"][index];
    const mode = kind === "range" ? "heat_cool" : kind;
    schedules[entity] = week(kind);
    const target = kind === "range" ? { target_temp_low: 19, target_temp_high: 24 }
      : { temperature: kind === "cool" ? 24 : 19 };
    states[entity] = { state: mode, attributes: {
      friendly_name: `Quality ${kind[0].toUpperCase()}${kind.slice(1)} ${String(index + 1).padStart(2, "0")}`,
      current_temperature: 20, ...target, hvac_modes: ["off", mode],
      min_temp: 5, max_temp: 35, target_temp_step: 0.5, temperature_unit: "°C",
      supported_features: (kind === "range" ? climateFeatures.temperatureRange : climateFeatures.temperature)
        | climateFeatures.turnOff | climateFeatures.turnOn,
    } };
    const zone = structuredClone(source.zones[entity]);
    data.zones[entity] = { ...zone, enabled: true, schedule: schedules[entity],
      day_layout_key: "individual", template_links: {}, override: null, pauses: [] };
    delete data.zones[entity].execution;
    events.push({ entity_id: entity, ...blocks(kind)[3], weekday: "monday", when: nextTime, target_when: null });
    runtime[entity] = { state: "scheduled", room_temperature: 20,
      ...(kind === "range" ? target : { target_temperature: target.temperature }),
      hvac_mode: mode, active_from: "2026-01-05T09:00:00+01:00", target_when: null,
      until: nextTime, pause_count: 0, pause_ids: [], manual_pause: false,
      control_mode: "automatic", manual_control: { active: false }, manual_adjustment_allowed: true };
  }
  Object.assign(data, {
    configured_entities: [...expectedEntities], control_units: [...expectedEntities],
    room_groups: {}, member_to_unit: {}, control_unit_states: {}, group_delivery_status: {},
    temperature_unit: "°C", home_assistant_temperature_unit: "°C", temperature_migration: { required: false },
    operation_recovery: null, operation_status: null,
    global: { mode: "auto", active_profile_ids: [], paused_started_at: null, paused_until: null },
    active_profile_ids: [], active_mode_id: null, effective_profile_ids: [],
    effective_zone_profiles: Object.fromEntries(expectedEntities.map(entity => [entity, null])),
    profile_selection: { base_profile_ids: [], base_mode_id: null, zone_profile_overrides: {} },
    operational_status: "scheduled", next_event: events[0], next_events: events,
    next_effective_events: events.map(event => ({ entity_id: event.entity_id,
      source: "weekly_schedule", phase: "scheduled", when: event.when, event, weekly_event: event })),
    active_overrides: {}, room_sensor_assist: {}, comfort: {}, zone_runtime: runtime,
    shared_demand_status: {}, external_execution: { systems: [], zones: {} },
    resolved_default_schedules: schedules, effective_schedules: schedules,
    resolved_profile_schedules: {}, resolved_block_metadata: { default: {}, profiles: {} },
    resolved_template_blocks: {}, resource_diagnostics: [], resource_usages: { presets: {}, templates: {} },
    templates: [], block_presets: [], modes: [],
    profiles: [["quality_winter", "Quality Winter", 0], ["quality_summer", "Quality Summer", 1]].map(([key, name, offset]) => ({
      key, name, zones: Object.fromEntries(expectedEntities.map((entity, index) => [entity,
        { behavior: "schedule", schedule: week(["heat", "cool", "range"][index], offset) }])) })),
    settings: { ...data.settings, first_weekday: "monday", zone_order: [...expectedEntities],
      unit_order: [...expectedEntities], shared_demand_groups: [] },
  });
  return { version: VISUAL_FIXTURE_VERSION, time: VISUAL_TIME, data, states };
}

function stateFor(entity, fixture, compact = false) {
  const state = fixture.states[entity];
  if (!state) return undefined;
  return compact ? { s: state.state, a: structuredClone(state.attributes),
    lc: Date.parse(VISUAL_TIME) / 1000, lu: Date.parse(VISUAL_TIME) / 1000,
    c: { id: "visual-fixture", parent_id: null, user_id: null } }
    : { entity_id: entity, ...structuredClone(state), last_changed: VISUAL_TIME,
      last_updated: VISUAL_TIME, context: { id: "visual-fixture", parent_id: null, user_id: null } };
}

/** Normalize HA's public full/compact state protocols; unrelated messages pass through. */
export function visualStateMessage(message, commands, fixture) {
  if (Array.isArray(message)) return message.map(item => visualStateMessage(item, commands, fixture));
  const type = commands.get(message.id);
  if (message.type === "result" && message.success && type === "get_states" && Array.isArray(message.result)) {
    return { ...message, result: message.result.map(state => stateFor(state.entity_id, fixture) ?? state) };
  }
  if (message.type === "event" && type === "subscribe_entities" && message.event) {
    const event = structuredClone(message.event);
    if (event.a) for (const entity of Object.keys(event.a)) {
      const fixed = stateFor(entity, fixture, true);
      if (fixed) event.a[entity] = fixed;
    }
    // Retain fixed initial values instead of allowing the real scheduler's
    // later state pushes to change this rendering-only scenario.
    for (const entity of Object.keys(fixture.states)) {
      if (event.c) delete event.c[entity];
      if (event.r) event.r = event.r.filter(value => value !== entity);
    }
    return { ...message, event };
  }
  return message;
}

/** Proxy authentication/HA shell traffic; only this page receives rendering inputs. */
export async function installVisualFixture(page, fixture) {
  await page.clock.setFixedTime(new Date(fixture.time));
  await page.routeWebSocket(/\/api\/websocket(?:\?.*)?$/, socket => {
    const server = socket.connectToServer();
    const commands = new Map();
    const visualSubscriptions = new Set();
    socket.onMessage(raw => {
      const message = JSON.parse(String(raw));
      if (message.type === "velair/get_schedule") {
        socket.send(JSON.stringify({ id: message.id, type: "result", success: true, result: fixture.data }));
      } else if (message.type === "velair/subscribe_updates") {
        visualSubscriptions.add(message.id);
        socket.send(JSON.stringify({ id: message.id, type: "result", success: true, result: null }));
        socket.send(JSON.stringify({ id: message.id, type: "event", event: { loaded: true, schedule: fixture.data } }));
      } else if (message.type === "unsubscribe_events" && visualSubscriptions.delete(message.subscription)) {
        socket.send(JSON.stringify({ id: message.id, type: "result", success: true, result: null }));
      } else {
        if (message.id !== undefined) commands.set(message.id, message.type);
        server.send(raw);
      }
    });
    server.onMessage(raw => socket.send(JSON.stringify(visualStateMessage(JSON.parse(String(raw)), commands, fixture))));
  });
}
