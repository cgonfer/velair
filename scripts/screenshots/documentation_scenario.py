"""Documentation-only public API setup in the owned real-HA installation."""

from copy import deepcopy
from datetime import datetime, timedelta
import json
from pathlib import Path
import shutil
from threading import Thread

from scenario import EXTERNAL_ENTITY, ROOMS, ROOT, _configure_selected_entities, _mutate, activate_household_runtime, prepare_fixture, prepare_planned_return
import ha

_PUBLICATIONS = {}
PHASES = ("household", "external-publishing", "external-error", "diagnostics-errors", "return")
SHOWCASE = ROOT / "scripts/screenshots/fixtures/ha_components/velair_showcase"
SHOWCASE_ENTITIES = json.loads((SHOWCASE / "entities.json").read_text(encoding="utf-8"))
GARDEN_ENTITY = SHOWCASE_ENTITIES["climate"]["entity_id"]
PROFILE_DESCRIPTIONS = {
    "workday": "Comfort where the household spends a normal working day.",
    "weekend": "A relaxed routine with more time at home.",
    "away": "Gentle setback while the household is away.",
    "home": "Prepare shared spaces and bedrooms for time at home.",
}


def prepare_documentation_fixture(config_dir):
    """Keep richer native devices out of website and quality installations."""
    config_dir = Path(config_dir).resolve()
    prepare_fixture(config_dir)
    destination = config_dir / "custom_components/velair_showcase"
    if destination.exists():
        raise ha.HarnessError("Refusing to replace existing documentation devices")
    shutil.copytree(SHOWCASE, destination, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    config = config_dir / "configuration.yaml"
    config.write_text(config.read_text(encoding="utf-8") + "\nvelair_showcase: {}\n", encoding="utf-8")


def rich_configuration(now):
    """Public configuration with a future cooling transition at any civil time."""
    arrival = (now + timedelta(minutes=120)).replace(second=0, microsecond=0)
    arrival -= timedelta(minutes=arrival.minute % 5)
    schedule = _cooling_schedule(now, arrival)
    observations = []
    for index, minutes in enumerate((41, 44, 39, 46, 42, 40, 45, 43)):
        scheduled = arrival - timedelta(days=8 - index)
        observations.append({
            "entity_id": GARDEN_ENTITY, "mode": "cool", "created_at": scheduled.isoformat(),
            "scheduled_time": scheduled.isoformat(), "start_time": (scheduled - timedelta(minutes=minutes)).isoformat(),
            "target_temp": 22.0, "initial_temp": 23.4, "observed_temp": 22.0,
            "delta_t": 1.4, "startup_minutes": minutes, "reached": True,
            "minutes_to_reach": minutes, "quality": "complete", "temperature_source": "room_sensor",
            "temperature_source_entity_id": "sensor.showcase_room_temperature",
        })
    comfort = {
        "enabled": True, "comfort_model": "guided",
        "temperature_entity_id": "sensor.showcase_room_temperature",
        "humidity_enabled": True, "humidity_entity_id": "sensor.showcase_indoor_humidity",
        "co2_entity_id": "sensor.showcase_co2", "co2_attention": 1000, "co2_poor": 1500,
        "temperature_min": 20.0, "temperature_max": 24.0, "humidity_min": 40.0, "humidity_max": 60.0,
        "outdoor_comparison_enabled": True, "outdoor_temperature_entity_id": "sensor.showcase_outdoor_temperature",
        "derived_metrics": {key: {"enabled": True, "source": "velair", "entity_id": None}
                            for key in ("humidex", "dew_point", "absolute_humidity")},
    }
    card = {
        "type": "custom:velair-card", "title": "Garden Room climate", "view": "climate",
        "selected_entity": GARDEN_ENTITY, "entities": [GARDEN_ENTITY],
        "climate_humidity_entity": "sensor.showcase_indoor_humidity",
        "climate_outdoor_temperature_entity": "sensor.showcase_outdoor_temperature",
        "climate_window_entities": [item["entity_id"] for item in SHOWCASE_ENTITIES["binary_sensor"]],
        "climate_window_display": "individual", "climate_current_state_default_collapsed": False,
        "climate_show_current_temperature": True, "climate_show_current_humidity": True,
        "climate_show_outdoor_temperature": True, "climate_show_windows": True,
        "climate_show_comfort": True, "climate_show_comfort_humidex": True,
        "climate_show_comfort_dew_point": True, "climate_show_comfort_absolute_humidity": True,
        "climate_show_room_assist": True, "climate_room_assist_display": "both",
        "climate_room_assist_default_collapsed": True, "climate_show_preconditioning": True,
        "climate_preconditioning_display": "both", "climate_preconditioning_default_collapsed": True,
        "climate_show_operation": True, "climate_show_state_bar": True,
        "climate_show_timeline": True, "climate_show_timeline_mode": True,
        "climate_show_timeline_profile": True,
    }
    return {"schedule": schedule, "comfort": comfort, "card": card,
            "learning": {"heat": {"observations": []}, "cool": {"observations": observations}}}


def _cooling_schedule(now, arrival):
    """An occupied/unoccupied routine with genuine current and future targets.

    Protect the demonstration interval across civil-day boundaries so a normal
    routine point cannot interrupt assistance or replace the upcoming 22 C target.
    These are ordinary persisted weekly blocks, evaluated by the real scheduler.
    """
    routine = (("00:00", 25), ("06:00", 23), ("09:00", None),
               ("12:00", 25), ("17:00", 23), ("22:00", 25))

    def cooling(start, temperature):
        return ({"start": start, "action": "turn_off"} if temperature is None else
                {"start": start, "action": "set_temperature", "hvac_mode": "cool", "temperature": temperature})

    days = {day: {start: cooling(start, temperature) for start, temperature in routine}
            for day in ha.WEEKDAYS}
    guard = (now - timedelta(minutes=60)).replace(second=0, microsecond=0)
    guard -= timedelta(minutes=guard.minute % 5)
    end = arrival + timedelta(minutes=90)
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    for offset in (-1, 0, 1):
        date = midnight + timedelta(days=offset)
        day = date.strftime("%A").lower()
        for start in tuple(days[day]):
            hour, minute = map(int, start.split(":"))
            if guard <= date.replace(hour=hour, minute=minute) <= end:
                del days[day][start]
    for date, temperature in ((guard, 23), (arrival, 22), (end, 23)):
        start = date.strftime("%H:%M")
        days[date.strftime("%A").lower()][start] = cooling(start, temperature)
    return {day: [blocks[start] for start in sorted(blocks)] for day, blocks in days.items()}


def _prepare_rich_household(state, metadata):
    ha.wait_for(lambda: ha.request(state, "GET", f"/api/states/{GARDEN_ENTITY}"),
                "native documentation devices", 45)
    selected = [*metadata["climate_entities"], GARDEN_ENTITY]
    _configure_selected_entities(state, selected)
    clock = ha.request(state, "POST", "/api/template", {"template": '{{ {"now": now().isoformat()} | to_json }}'})
    config = rich_configuration(datetime.fromisoformat(clock["now"]))
    profiles = deepcopy(_schedule(state)["profiles"])
    for profile in profiles:
        profile["description"] = PROFILE_DESCRIPTIONS.get(profile["key"], profile.get("description", ""))
        if profile["key"] == "home":
            profile["zones"][GARDEN_ENTITY] = {"behavior": "schedule", "schedule": config["schedule"]}
        _mutation(state, {"type": "velair/set_profile", "profile": profile})
    _commands(state, [
        {"type": "velair/set_zone_profile", "entity_id": GARDEN_ENTITY, "profile_id": "home"},
        {"type": "velair/update_zone_preconditioning", "entity_id": GARDEN_ENTITY, "preconditioning": {
            "enabled": True, "max_lead_minutes": 90, "minimum_delta_temperature": 0.5,
            "learning_history_size": 30, "similar_sample_count": 10, "comfort_percentile": 80,
            "use_outdoor_temperature": False, "room_temperature_entity_id": "sensor.showcase_room_temperature",
            "room_sensor_assist_enabled": True, "room_sensor_assist_deadband": 0.3,
            "room_sensor_assist_max_delta": 2.0, "room_sensor_assist_debounce_seconds": 0,
        }},
        {"type": "velair/update_zone_comfort", "entity_id": GARDEN_ENTITY, "comfort": config["comfort"]},
    ])
    exported = _commands(state, [{"type": "velair/export_data", "sections": ["preconditioning_learning"]}])[0]
    exported["sections"]["preconditioning_learning"][GARDEN_ENTITY] = config["learning"]
    _commands(state, [{"type": "velair/import_data", "sections": ["preconditioning_learning"], "payload": exported}])
    ha.request(state, "POST", "/api/services/velair/resume", {})
    ha.wait_for(lambda: _schedule(state).get("room_sensor_assist", {}).get(GARDEN_ENTITY, {}).get("status") == "assisting",
                "real Garden Room cooling assistance", 90)
    return {**metadata, "climate_entities": selected, "comfort_name": "Garden Room",
            "card_entity": GARDEN_ENTITY, "card_name": "Garden Room", "card_configuration": config["card"],
            "humidity_entity": "sensor.showcase_indoor_humidity", "outdoor_entity": "sensor.showcase_outdoor_temperature",
            "co2_entity": "sensor.showcase_co2", "window_entities": config["card"]["climate_window_entities"]}


def _commands(state, messages):
    results = []
    for message in messages:
        try:
            results.extend(ha.websocket(state, [message]))
        except ha.HarnessError as error:
            # Only the public command type is emitted; never payloads/tokens.
            raise ha.HarnessError(f"Documentation command {message['type']} failed") from error
    return results


def _mutation(state, message):
    try:
        return _mutate(state, message)
    except ha.HarnessError as error:
        raise ha.HarnessError(f"Documentation command {message['type']} failed") from error


def _schedule(state):
    return _commands(state, [{"type": "velair/get_schedule"}])[0]


def _publication(state):
    return (_schedule(state).get("external_execution", {}).get("zones", {})
            .get(EXTERNAL_ENTITY, {}).get("publication") or {}).get("state")


def _transport(state, **options):
    return ha.request(state, "POST", "/api/services/ramses_cc/control_publication",
                      {"entity_id": EXTERNAL_ENTITY, **options})


def _prepare_household(state, metadata):
    metadata = _prepare_rich_household(state, metadata)
    bedroom = ROOMS[2][0]
    sensor = "sensor.quality_temperature_03"
    ha.request(state, "POST", "/api/services/velair_test/control", {
        "entity_id": sensor, "current_temperature": 22.0,
    })
    _commands(state, [{"type": "config/entity_registry/update", "entity_id": sensor,
                          "name": "Main Bedroom room sensor"}])
    # A real Profile exception keeps this example inside a native range at any
    # civil-clock time; the varied Default and Workday schedules stay intact.
    home = deepcopy(next(profile for profile in _schedule(state)["profiles"] if profile["key"] == "home"))
    home["zones"][bedroom]["schedule"] = {
        day: [{"start": "00:00", "action": "set_temperature", "hvac_mode": "heat_cool",
               "target_temp_low": 20, "target_temp_high": 24}]
        for day in ha.WEEKDAYS
    }
    _mutation(state, {"type": "velair/set_profile", "profile": home})
    # This fixture advertises heat_cool, not fixed heat/cool. Native ranges
    # already have neutral-band semantics; fixed-mode boundary references are
    # intentionally neither needed nor valid for this device.
    _commands(state, [
        {"type": "velair/set_zone_profile", "entity_id": bedroom, "profile_id": "home"},
        {"type": "velair/update_zone_preconditioning", "entity_id": bedroom,
         "preconditioning": {"enabled": False, "room_temperature_entity_id": sensor,
                             "room_sensor_assist_enabled": True, "room_sensor_assist_deadband": 0.3,
                             "room_sensor_assist_max_delta": 2.0, "room_sensor_assist_debounce_seconds": 0}},
    ])
    ha.request(state, "POST", "/api/services/velair/resume", {})
    ha.wait_for(lambda: _schedule(state).get("room_sensor_assist", {}).get(bedroom, {}).get("status") == "holding",
                "real native-range Room Assist holding", 90)
    path = "velair-screenshots"
    _commands(state, [
        {"type": "lovelace/dashboards/create", "url_path": path, "title": "Velair climate",
         "mode": "storage", "show_in_sidebar": False, "require_admin": True},
        {"type": "lovelace/config/save", "url_path": path, "config": {"views": [{
            "title": "Climate", "path": "climate", "type": "panel", "cards": [metadata["card_configuration"]],
        }]}},
    ])
    activate_household_runtime(state)
    return {**metadata, "profile_key": "workday", "profile_name": "Workday",
            "holding_entity": bedroom, "holding_name": "Main Bedroom",
            "dashboard_path": f"/{path}/climate",
            "documentation_phase": "household"}


def prepare_documentation_phase(state, metadata, phase):
    """Create real device/runtime conditions, never a fabricated UI response."""
    if phase not in PHASES:
        raise ValueError("Unknown documentation screenshot phase")
    ha.validate_owned_directory(state)
    if phase == "household":
        return _prepare_household(state, metadata)
    if phase == "return":
        # Earlier documentation scenes intentionally exercised an unavailable
        # climate and rejected publication. Clear those fixture conditions before
        # the final, real arrival episode; prior captures stay untouched.
        kitchen = ROOMS[7][0]
        ha.request(state, "POST", "/api/services/velair_test/control", {"entity_id": kitchen, "available": True})
        ha.wait_for(lambda: ha.request(state, "GET", f"/api/states/{kitchen}").get("state") not in ("unavailable", "unknown"),
                    "restored climate before Planned Return", 30)
        _transport(state, hold=False, fail=False)
        _join_publication(state)
        return {**prepare_planned_return(state, metadata), "documentation_phase": phase}
    if phase == "external-publishing":
        if state["run_id"] in _PUBLICATIONS:
            raise ha.HarnessError("A documentation publication is already pending")
        _transport(state, hold=True, fail=False)
        outcome = {}

        def publish():
            try:
                ha.websocket(state, [{"type": "velair/set_zone_execution", "entity_id": EXTERNAL_ENTITY,
                                      "provider": "ramses_cc"}])
            except Exception as error:
                outcome["error"] = error

        thread = Thread(target=publish, daemon=True, name="velair-documentation-publication")
        _PUBLICATIONS[state["run_id"]] = (thread, outcome)
        thread.start()
        ha.wait_for(lambda: _publication(state) == "publishing", "real controller publication in progress", 45)
    elif phase == "external-error":
        _transport(state, hold=False, fail=True)
        _join_publication(state)
        ha.wait_for(lambda: _publication(state) == "failed", "real rejected controller publication", 45)
    else:
        kitchen = ROOMS[7][0]
        ha.request(state, "POST", "/api/services/velair_test/control", {"entity_id": kitchen, "available": False})
        ha.wait_for(lambda: ha.request(state, "GET", f"/api/states/{kitchen}").get("state") == "unavailable",
                    "real unavailable managed climate", 30)
        ha.wait_for(lambda: any(issue.get("code") == "entity_unavailable" for issue in
                    ha.websocket(state, [{"type": "velair/get_diagnostics"}])[0].get("units", {}).get(kitchen, {}).get("issues", [])),
                    "real unavailable-climate diagnostics", 45)
    return {**metadata, "documentation_phase": phase}


def _join_publication(state):
    pending = _PUBLICATIONS.pop(state["run_id"], None)
    if pending is None:
        return
    thread, outcome = pending
    thread.join(timeout=30)
    if thread.is_alive():
        _PUBLICATIONS[state["run_id"]] = pending
        raise ha.HarnessError("Documentation publication did not finish after release")
    if "error" in outcome:
        raise ha.HarnessError("Documentation publication request did not complete") from outcome["error"]


def cleanup_documentation(state):
    """Release a pending fixture transport before the owned HA is stopped."""
    if state.get("run_id") not in _PUBLICATIONS:
        return
    ha.validate_owned_directory(state)
    _transport(state, hold=False, fail=False)
    _join_publication(state)
