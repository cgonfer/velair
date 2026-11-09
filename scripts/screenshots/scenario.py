"""Public screenshot household, configured through real HA and Velair APIs.

All people, rooms, readings and learning observations are synthetic. No runtime
response is replaced: the installed Velair backend computes everything shown.
"""

from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime, timedelta
from pathlib import Path
import json
import shutil
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/quality"))
import ha  # noqa: E402

EXTERNAL_ENTITY = "climate.showcase_guest_room"
GROUP_ID = "group.downstairs"
ROOMS = (
    ("climate.quality_heat_01", "Living Room", "heat", 17.5),
    ("climate.quality_cool_02", "Home Office", "cool", 25.5),
    ("climate.quality_range_03", "Main Bedroom", "heat_cool", 22.0),
    ("climate.quality_heat_04", "Dining Room", "heat", 18.0),
    ("climate.quality_cool_05", "Studio", "cool", 24.5),
    ("climate.quality_range_06", "Guest Suite", "heat_cool", 21.0),
    ("climate.quality_heat_07", "Nursery", "heat", 18.5),
    ("climate.quality_cool_08", "Kitchen", "cool", 24.0),
)
STARTS = ("00:00", "06:00", "08:30", "12:00", "17:00", "22:00")
SECTIONS = ["zones", "templates", "profiles", "modes", "block_presets", "preconditioning_learning"]
PROFILE_DETAILS = {
    "workday": {"name": "Workday", "icon": "mdi:briefcase-outline", "color": "#5388C9"},
    "weekend": {"name": "Weekend", "icon": "mdi:home-heart", "color": "#BA75A5"},
    "away": {"name": "Away", "icon": "mdi:bag-suitcase", "color": "#CC9850"},
    "home": {"name": "Home", "icon": "mdi:home-thermometer-outline", "color": "#5F9E79"},
}
PAUSE_MINUTES = 240


def prepare_fixture(config_dir: Path) -> None:
    """Install only in the owned disposable HA configuration before it starts."""
    config_dir = Path(config_dir).resolve()
    marker = config_dir / ha.MARKER
    if not marker.is_file():
        raise ha.HarnessError("Screenshot fixture requires an owned disposable HA directory")
    try:
        ownership = json.loads(marker.read_text(encoding="utf8"))
        ha.validate_owned_directory({"config_dir": str(config_dir), "run_id": ownership["run_id"]})
    except (ValueError, KeyError, TypeError) as error:
        raise ha.HarnessError("Screenshot fixture ownership marker is invalid") from error
    destination = config_dir / "custom_components/ramses_cc"
    if destination.exists():
        raise ha.HarnessError("Refusing to replace an existing controller integration")
    shutil.copytree(ROOT / "scripts/screenshots/fixtures/ha_components/ramses_cc", destination,
                    ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))


def schedule_blocks(mode: str, *, away: bool = False, offset: float = 0) -> list[dict]:
    """A readable household day with distinct overnight, work and evening periods."""
    heat = (18, 21, 18.5, 20, 21.5, 18.5)
    cool = (26, 24, 27, 25, 23.5, 26)
    result = []
    for index, start in enumerate(STARTS):
        block = {"start": start, "action": "set_temperature", "hvac_mode": mode}
        if mode == "heat_cool":
            block.update(target_temp_low=16 if away else heat[index] + offset,
                         target_temp_high=28 if away else cool[index] - offset)
        else:
            block["temperature"] = (16 if mode == "heat" else 28) if away else (
                heat[index] + offset if mode == "heat" else cool[index] - offset)
        result.append(block)
    return result


def bedroom_blocks() -> list[dict]:
    """Show genuine ranges, an Off period and a temperature-only native range."""
    return [
        {"start": "00:00", "action": "set_temperature", "hvac_mode": "heat_cool", "target_temp_low": 18, "target_temp_high": 25},
        {"start": "06:00", "action": "set_temperature", "hvac_mode": "heat_cool", "target_temp_low": 20, "target_temp_high": 24},
        {"start": "08:30", "action": "turn_off"},
        {"start": "12:00", "action": "set_temperature", "temperature_only": True, "target_temp_low": 19.5, "target_temp_high": 24.5},
        {"start": "17:00", "preset_key": "bedroom_comfort"},
        {"start": "22:00", "action": "set_temperature", "hvac_mode": "heat_cool", "target_temp_low": 18.5, "target_temp_high": 25},
    ]


def comfort_configuration(entity_id: str) -> dict:
    """Real temperature/humidity monitoring for the physical overview cards."""
    return {
        "enabled": True, "comfort_model": "simple",
        "temperature_entity_id": "sensor.quality_temperature_02" if entity_id == ROOMS[1][0] else None,
        "humidity_enabled": True, "humidity_entity_id": "sensor.quality_humidity_01",
        "temperature_min": 19.0, "temperature_max": 25.0,
        "humidity_min": 35.0, "humidity_max": 60.0,
    }


def planned_return_configuration() -> dict:
    """A coherent presence-driven weekly routine, activated only in its phase."""
    return {
        "enabled": True, "occupancy_entity_ids": ["binary_sensor.quality_occupancy"],
        "away_mode_id": "away", "destination_mode_id": "home", "absence_delay_minutes": 0,
        "weekly": {day: "18:30" if day not in ("saturday", "sunday") else "17:00" for day in ha.WEEKDAYS},
    }


def learning_observations(entity_id: str, now: datetime | None = None) -> dict:
    """Clearly synthetic, complete historical observations for a meaningful graph.

    Imported through Velair's documented portable-data API; never written to HA
    storage and never presented as observations from a physical installation.
    """
    now = now or datetime.now(UTC)
    samples = []
    for index, minutes in enumerate((41, 44, 39, 46, 42, 40, 45, 43)):
        scheduled = (now - timedelta(days=8 - index)).replace(hour=7, minute=0, second=0, microsecond=0)
        samples.append({
            "entity_id": entity_id, "mode": "heat", "created_at": scheduled.isoformat(),
            "scheduled_time": scheduled.isoformat(), "start_time": (scheduled - timedelta(minutes=minutes)).isoformat(),
            "target_temp": 21.0, "initial_temp": 18.0, "observed_temp": 21.0,
            "delta_t": 3.0, "startup_minutes": minutes, "reached": True,
            "minutes_to_reach": minutes, "quality": "complete",
            "temperature_source": "climate", "temperature_source_entity_id": entity_id,
        })
    return {"heat": {"observations": samples}, "cool": {"observations": []}}


def nursery_blocks(now: datetime) -> list[dict]:
    """Keep the room at setback now, with a real upcoming comfort transition."""
    minute = now.hour * 60 + now.minute
    next_index = next((index for index, start in enumerate(STARTS)
                       if int(start[:2]) * 60 + int(start[3:]) > minute), 0)
    return [{"start": start, "action": "set_temperature", "hvac_mode": "heat",
             "temperature": 21.5 if index == next_index else 18.5}
            for index, start in enumerate(STARTS)]


def office_readings(now: datetime) -> dict[str, float]:
    """Keep the real cooling Room Assist scenario meaningful in every period."""
    minute = now.hour * 60 + now.minute
    active = next(block for block in reversed(schedule_blocks("cool"))
                  if int(block["start"][:2]) * 60 + int(block["start"][3:]) <= minute)
    target = active["temperature"]
    return {"scheduled_target": target, "climate_temperature": target + 2.0,
            "room_temperature": target + 3.5}


def populate_payload(payload: dict, now: datetime | None = None) -> dict:
    """Adapt a fresh real export, preserving its schema/version/default fields."""
    payload = deepcopy(payload)
    sections = payload["sections"]
    zones = sections["zones"]
    modes = {entity: mode for entity, _, mode, _ in ROOMS}
    modes.update({GROUP_ID: "heat", EXTERNAL_ENTITY: "heat"})
    for entity, zone in zones.items():
        blocks = schedule_blocks(modes[entity])
        zone["schedule"] = {day: deepcopy(blocks) for day in ha.WEEKDAYS}
        zone["template_links"] = {}
        zone["enabled"] = True
        zone["preconditioning"] = {**zone.get("preconditioning", {}), "enabled": False}

    office = ROOMS[1][0]
    nursery = ROOMS[6][0]
    now = now or datetime.now(UTC)
    nursery_schedule = {day: nursery_blocks(now) for day in ha.WEEKDAYS}
    zones[nursery]["schedule"] = deepcopy(nursery_schedule)
    zones[ROOMS[2][0]]["schedule"] = {day: bedroom_blocks() for day in ha.WEEKDAYS}
    zones[office]["preconditioning"].update({
        "room_temperature_entity_id": "sensor.quality_temperature_02",
        "room_sensor_assist_enabled": True, "room_sensor_assist_deadband": 0.3,
        "room_sensor_assist_max_delta": 2.0, "room_sensor_assist_debounce_seconds": 0,
    })
    zones[nursery]["preconditioning"].update({
        "enabled": True, "max_lead_minutes": 90, "minimum_delta_temperature": 0.5,
        "learning_history_size": 30, "similar_sample_count": 10, "comfort_percentile": 80,
        "use_outdoor_temperature": False,
    })
    sections["preconditioning_learning"] = {nursery: learning_observations(nursery, now)}
    sections["block_presets"] = [
        {"key": "evening_comfort", "name": "Evening comfort", "config": {"action": "set_temperature", "temperature": 21.5, "hvac_mode": "heat"}},
        {"key": "sleep_heating", "name": "Sleep heating", "config": {"action": "set_temperature", "temperature": 18.5, "hvac_mode": "heat"}},
        {"key": "summer_cooling", "name": "Summer cooling", "config": {"action": "set_temperature", "temperature": 24, "hvac_mode": "cool"}},
        {"key": "bedroom_comfort", "name": "Bedroom comfort", "config": {"action": "set_temperature", "target_temp_low": 20, "target_temp_high": 24, "hvac_mode": "heat_cool"}},
        {"key": "temperature_only", "name": "Temperature only", "config": {"action": "set_temperature", "target_temp_low": 19.5, "target_temp_high": 24.5, "temperature_only": True}},
        {"key": "rest", "name": "Rest until needed", "config": {"action": "turn_off"}},
    ]
    # Real preset dependencies in the downstairs schedule and reusable template.
    for day in ha.WEEKDAYS:
        zones[GROUP_ID]["schedule"][day][4] = {"start": "17:00", "preset_key": "evening_comfort"}
        zones[GROUP_ID]["schedule"][day][5] = {"start": "22:00", "preset_key": "sleep_heating"}
    sections["templates"] = [{
        "key": "family_evening", "name": "Family evening",
        "blocks": [{"start": "17:00", "slot_id": "evening", "preset_key": "evening_comfort"},
                   {"start": "22:00", "slot_id": "night", "preset_key": "sleep_heating"}],
    }]
    sections["profiles"] = [
        {"key": key, **PROFILE_DETAILS[key], "zones": {
            entity: {"behavior": "schedule", "schedule": {day: schedule_blocks(mode, away=away, offset=offset)
                       for day in ha.WEEKDAYS}}
            for entity, mode in modes.items() if entity in zones}}
        for key, away, offset in (("workday", False, 0), ("weekend", False, 0.5), ("away", True, 0), ("home", False, 0.5))
    ]
    sections["modes"] = [{"key": key, "name": value["name"], "profile_ids": [key]}
                          for key, value in PROFILE_DETAILS.items()]
    sections["profiles"][0]["zones"][nursery]["schedule"] = deepcopy(nursery_schedule)
    sections["profiles"][0]["zones"][ROOMS[2][0]]["schedule"] = {day: bedroom_blocks() for day in ha.WEEKDAYS}
    # The destination always requests useful warmth for the learned Nursery,
    # regardless of which civil-clock period contains the one-off arrival.
    sections["profiles"][-1]["zones"][nursery]["schedule"] = {
        day: [{"start": "00:00", "action": "set_temperature", "hvac_mode": "heat", "temperature": 21.5}]
        for day in ha.WEEKDAYS
    }
    return payload


def _mutate(state: dict, message: dict) -> dict:
    """Get the live revision immediately before each isolated configuration edit."""
    return ha.websocket(state, [{"type": "velair/get_schedule"}, {**message, "_revision": True}])[-1]


def _configure_selected_entities(state: dict, entities: list[str]) -> None:
    entries = ha.request(state, "GET", "/api/config/config_entries/entry")
    entry = next(item for item in entries if item["domain"] == "velair")
    flow = ha.request(state, "POST", "/api/config/config_entries/options/flow", {"handler": entry["entry_id"]})
    result = ha.request(state, "POST", f"/api/config/config_entries/options/flow/{flow['flow_id']}", {
        "climate_entities": entities, "apply_active_schedule_on_startup": False,
    })
    if result.get("type") != "create_entry":
        raise ha.HarnessError("Screenshot household could not configure its managed climates")
    ha.wait_for(lambda: ha.websocket(state, [{"type": "velair/get_schedule"}])[0].get("configured_entities") == entities,
                "screenshot household selection", 90)


def activate_household_runtime(state: dict) -> None:
    """Restore public runtime examples after configuration reloads finish."""
    ha.validate_owned_directory(state)
    ha.request(state, "POST", "/api/services/velair/resume", {})
    ha.websocket(state, [{"type": "velair/set_zone_profile", "entity_id": ROOMS[5][0], "profile_id": "weekend"}])
    ha.request(state, "POST", "/api/services/velair/boost", {
        "entity_id": ROOMS[5][0], "duration_minutes": 90,
        "target_temp_low": 20.0, "target_temp_high": 24.0, "hvac_mode": "heat_cool",
    })
    ha.request(state, "POST", "/api/services/velair/pause_zone", {
        "entity_id": ROOMS[4][0], "duration_minutes": PAUSE_MINUTES, "pause_id": "open_window", "action": "turn_off",
    })
    # Publish a compatible seven-day Profile through the real adapter/service path.
    ha.websocket(state, [{"type": "velair/set_zone_execution", "entity_id": EXTERNAL_ENTITY, "provider": "ramses_cc"}])
    ha.wait_for(lambda: (ha.websocket(state, [{"type": "velair/get_schedule"}])[0].get("external_execution", {}).get("zones", {}).get(EXTERNAL_ENTITY, {}).get("publication") or {}).get("state") == "published",
                "real controller-service schedule acceptance", 90)


def seed(state: dict) -> dict:
    """Create a varied English household without replacing any frontend response."""
    ha.validate_owned_directory(state)
    if state.get("size") != "large" or not all(entity in state.get("climate_entities", []) for entity, *_ in ROOMS):
        raise ha.HarnessError("Website screenshots require a fresh large disposable fixture")
    created = ha.request(state, "POST", "/api/config/config_entries/flow", {"handler": "ramses_cc"})
    if created.get("type") not in ("create_entry", "abort"):
        raise ha.HarnessError("Virtual screenshot controller did not load")
    ha.wait_for(lambda: any(item["entity_id"] == EXTERNAL_ENTITY for item in ha.request(state, "GET", "/api/states")),
                "screenshot virtual controller", 90)
    selected = [entity for entity, *_ in ROOMS] + [EXTERNAL_ENTITY]
    _configure_selected_entities(state, selected)
    updates = [{"type": "config/entity_registry/update", "entity_id": entity, "name": name} for entity, name, *_ in ROOMS]
    updates.extend([
        {"type": "config/entity_registry/update", "entity_id": "sensor.quality_temperature_02", "name": "Home Office room sensor"},
        {"type": "config/entity_registry/update", "entity_id": "switch.quality_switch_01", "name": "Downstairs heating supply"},
        {"type": "config/entity_registry/update", "entity_id": "sensor.quality_humidity_01", "name": "Indoor humidity"},
        {"type": "config/entity_registry/update", "entity_id": "binary_sensor.quality_occupancy", "name": "Someone is home"},
    ])
    ha.websocket(state, updates)
    # Render valid JSON through HA's public template endpoint to obtain the
    # backend's own local clock/timezone without replacing any browser clocks.
    clock = ha.request(state, "POST", "/api/template", {"template": '{{ {"now": now().isoformat()} | to_json }}'})
    local_now = datetime.fromisoformat(clock["now"])
    office = office_readings(local_now)
    for entity, _, mode, reading in ROOMS:
        if entity == ROOMS[1][0]:
            reading = office["climate_temperature"]
        ha.request(state, "POST", "/api/services/velair_test/control", {"entity_id": entity, "hvac_mode": mode, "current_temperature": reading})
    ha.request(state, "POST", "/api/services/velair_test/control", {
        "entity_id": "sensor.quality_temperature_02", "current_temperature": office["room_temperature"],
    })
    _mutate(state, {"type": "velair/set_room_group", "source_entity_id": ROOMS[0][0], "group": {
        "id": GROUP_ID, "name": "Downstairs", "members": [ROOMS[0][0], ROOMS[3][0]],
        "temperature_entity_id": ROOMS[0][0], "delivery_mode": "all",
    }})
    exported = ha.websocket(state, [{"type": "velair/export_data", "sections": SECTIONS}])[0]
    ha.websocket(state, [{"type": "velair/import_data", "sections": SECTIONS, "payload": populate_payload(exported, local_now)}])
    ha.websocket(state, [{"type": "velair/update_zone_comfort", "entity_id": entity,
                          "comfort": comfort_configuration(entity)} for entity in selected])
    _mutate(state, {"type": "velair/update_shared_demand", "groups": [{
        "id": "downstairs_supply", "name": "Downstairs heating", "enabled": True,
        "switch_entity_id": "switch.quality_switch_01", "direction": "heat", "hysteresis": 0.3,
        "minimum_off_seconds": 60, "on_delay_seconds": 0, "off_delay_seconds": 30,
        "zones": {GROUP_ID: {}, ROOMS[2][0]: {}}, "suspended": False,
    }]})
    ha.websocket(state, [{"type": "velair/select_mode", "selection": {"kind": "custom", "key": "workday"}}])
    activate_household_runtime(state)
    return {
        "scenario": "English example household", "climate_entities": selected,
        "schedule_entity": ROOMS[2][0], "weekday": "monday", "assist_entity": ROOMS[1][0],
        "preconditioning_entity": ROOMS[6][0], "external_entity": EXTERNAL_ENTITY,
        "room_group": GROUP_ID, "mode": "workday", "mode_name": "Workday",
        "assist_name": "Home Office", "preconditioning_name": "Nursery", "external_name": "Guest Room",
        "assist_readings": office,
        "group_name": "Downstairs", "preset_name": "Bedroom comfort",
        "supply_name": "Downstairs heating", "supply_id": "downstairs_supply",
        "pause_duration_minutes": PAUSE_MINUTES,
        "routes": {"overview": "", "schedules": f"/schedules/default?entity_id={ROOMS[2][0]}&weekday=monday",
                   "modes": "/modes", "room-assist": "/sensors", "preconditioning": "/preconditioning",
                   "room-groups": "/room-groups", "presets": "/templates/presets",
                   "supply-control": "/supply-control", "planned-return": "/planned-return"},
        "provenance": {"devices": "Virtual HA entities in a disposable installation",
                       "learning": "Synthetic observations imported through the public portable-data API",
                       "external_controller": "Test-only service fixture; no physical controller delivery is claimed"},
    }


def prepare_planned_return(state: dict, metadata: dict) -> dict:
    """Enter a real absence/arrival episode after all ordinary captures finish."""
    ha.validate_owned_directory(state)
    ha.request(state, "POST", "/api/services/velair_test/control", {
        "entity_id": "binary_sensor.quality_occupancy", "state": "off",
    })
    clock = ha.request(state, "POST", "/api/template", {"template": '{{ {"now": now().isoformat()} | to_json }}'})
    local_now = datetime.fromisoformat(clock["now"])
    arrival = (local_now + timedelta(minutes=30)).replace(second=0, microsecond=0)
    ha.websocket(state, [
        # The preceding controller screenshot intentionally shows external
        # ownership. Away/Home change this zone's schedule, which Planned Return
        # correctly rejects while a controller owns execution. Return to local
        # control through the public API only after those captures are complete.
        {"type": "velair/set_zone_execution", "entity_id": EXTERNAL_ENTITY, "provider": None},
        {"type": "velair/update_planned_return", "planned_return": planned_return_configuration()},
        {"type": "velair/start_planned_return", "return_at": arrival.isoformat(), "apply_away_now": True},
    ])
    ha.wait_for(lambda: any(row.get("preparing") for row in ha.websocket(state, [{"type": "velair/get_schedule"}])[0]
                           .get("planned_return_status", {}).get("zones", [])),
                "real planned-return preparation", 90)
    return {**metadata, "arrival_at": arrival.isoformat(), "planned_return_destination": "Home",
            "planned_return_away": "Away", "planned_return_local_execution_entities": [EXTERNAL_ENTITY]}


def prepare_documentation_phase(state: dict, metadata: dict, phase: str) -> dict:
    from documentation_scenario import prepare_documentation_phase as prepare
    return prepare(state, metadata, phase)


def cleanup_documentation(state: dict) -> None:
    from documentation_scenario import cleanup_documentation as cleanup
    cleanup(state)
