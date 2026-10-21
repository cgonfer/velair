"""Execute the shipped YAML using real HA automation, templates and timers.

Run independently from unittest discovery: that suite deliberately stubs HA.
No Velair integration, physical devices, network services or HA installation
are accessed. Notifications and example action services are captured locally.
"""
from __future__ import annotations

import asyncio
from pathlib import Path

import pytest
import pytest_asyncio
import voluptuous as vol

from homeassistant.components.blueprint.models import Blueprint, BlueprintInputs
from homeassistant.core import HomeAssistant, CoreState, callback
from homeassistant import loader
from homeassistant.config_entries import ConfigEntries
from homeassistant.helpers import entity_registry, device_registry
from homeassistant.helpers import config_validation as cv
from homeassistant.setup import async_setup_component
from homeassistant.util.yaml import load_yaml


BLUEPRINT = Path(__file__).resolve().parents[2] / "blueprints/automation/velair/seasonal_climate_selection.yaml"
SENSOR = "sensor.reference_temperature"
DELAY = 0.15
LANGUAGES = ("de", "en", "es", "fr", "it", "nl", "pl", "pt-br", "pt-pt", "ru")
LOCALIZED_TITLES = {
    "en": ("Velair: temperature unavailable", "Velair: invalid seasonal configuration"),
    "es": ("Velair: temperatura no disponible", "Velair: configuración estacional incorrecta"),
    "de": ("Velair: Temperatur nicht verfügbar", "Velair: ungültige saisonale Konfiguration"),
    "fr": ("Velair : température indisponible", "Velair : configuration saisonnière incorrecte"),
    "it": ("Velair: temperatura non disponibile", "Velair: configurazione stagionale non valida"),
    "nl": ("Velair: temperatuur niet beschikbaar", "Velair: ongeldige seizoensconfiguratie"),
    "pl": ("Velair: temperatura niedostępna", "Velair: nieprawidłowa konfiguracja sezonowa"),
    "pt-br": ("Velair: temperatura indisponível", "Velair: configuração sazonal inválida"),
    "pt-pt": ("Velair: temperatura indisponível", "Velair: configuração sazonal inválida"),
    "ru": ("Velair: температура недоступна", "Velair: неверная сезонная конфигурация"),
}


class Runtime:
    def __init__(self, hass):
        self.hass = hass
        self.actions = []
        self.notices = {}
        self.gate = asyncio.Event()

    async def settle(self):
        # Do not await long-running user sequences; flush state listeners only.
        for _ in range(8):
            await asyncio.sleep(0)

    async def set(self, value, unit="°C", **attributes):
        self.hass.states.async_set(SENSOR, value, {"unit_of_measurement": unit, "device_class": "temperature", **attributes})
        await self.settle()

    async def due(self):
        await asyncio.sleep(DELAY + 0.04)
        await self.settle()

    async def load(self, startup=False, **inputs):
        if startup:
            self.hass.state = CoreState.not_running
        bp = Blueprint(load_yaml(str(BLUEPRINT)), expected_domain="automation")
        instance = BlueprintInputs(bp, {
            "id": "seasonal_test", "alias": "Seasonal test",
            "use_blueprint": {"path": "velair/seasonal_climate_selection.yaml", "input": {
                "temperature_sensor": SENSOR,
                "stability_delay": {"seconds": DELAY},
                **{f"{season}_actions": [{"service": "test.record", "data": {"season": season}}] for season in ("winter", "mild", "summer")},
                **inputs,
            }},
        })
        instance.validate()
        config = instance.async_substitute()
        assert await async_setup_component(self.hass, "automation", {"automation": [config]})
        if startup:
            await self.hass.async_start()
        await self.hass.async_block_till_done()
        assert self.hass.states.get("automation.seasonal_test") is not None
        return bp, config


@pytest_asyncio.fixture
async def runtime(tmp_path):
    hass = HomeAssistant(str(tmp_path))
    loader.async_setup(hass)
    hass.config_entries = ConfigEntries(hass, {})
    await entity_registry.async_load(hass)
    await device_registry.async_load(hass)
    hass.state = CoreState.running
    rt = Runtime(hass)
    @callback
    def record(call):
        rt.actions.append(call.data["season"])
    @callback
    def notify(call):
        rt.notices[call.data["notification_id"]] = dict(call.data)
    @callback
    def dismiss(call):
        rt.notices.pop(call.data["notification_id"], None)
    async def waiting(call):
        rt.actions.append("started")
        await rt.gate.wait()
        rt.actions.append("finished")
    async def failing(call):
        raise RuntimeError("Example configured action failure")
    hass.services.async_register("test", "record", record)
    hass.services.async_register("test", "waiting", waiting)
    hass.services.async_register("test", "failing", failing)
    hass.services.async_register("persistent_notification", "create", notify)
    hass.services.async_register("persistent_notification", "dismiss", dismiss)
    await rt.set("10")
    yield rt
    rt.gate.set()
    await hass.async_stop(force=True)


@pytest.mark.parametrize("value,season", [("19.9", "winter"), ("20", "mild"), ("27", "mild"), ("27.1", "summer")])
async def test_boundaries_and_no_early_execution(runtime, value, season):
    await runtime.set("23" if season == "winter" else "10")
    await runtime.load()
    await runtime.set(value)
    assert runtime.actions == []
    await runtime.due()
    assert runtime.actions == [season]


async def test_metadata_default_delay_and_startup_diagnostics_only(runtime):
    bp, _ = await runtime.load(startup=True)
    assert bp.inputs["stability_delay"]["default"] == {"minutes": 30}
    await runtime.due()
    assert runtime.actions == []
    assert runtime.notices == {}


async def test_same_range_updates_preserve_deadline_and_do_not_repeat(runtime):
    await runtime.load(stability_delay={"seconds": 0.4})
    await runtime.set("21")
    await asyncio.sleep(0.25)
    await runtime.set("22")
    await asyncio.sleep(0.2)
    await runtime.settle()
    assert runtime.actions == ["mild"]
    for value in ("23", "24", "27"):
        await runtime.set(value)
        await runtime.due()
    assert runtime.actions == ["mild"]


async def test_leaving_and_returning_to_executed_range_runs_again(runtime):
    await runtime.load()
    for value in ("21", "30", "23"):
        await runtime.set(value)
        await runtime.due()
    assert runtime.actions == ["mild", "summer", "mild"]


async def test_same_range_as_initial_reading_does_not_execute(runtime):
    await runtime.load()
    await runtime.set("19")
    await runtime.due()
    assert runtime.actions == []


async def test_equivalent_unit_update_preserves_pending_range(runtime):
    await runtime.load(stability_delay={"seconds": 0.4})
    await runtime.set("21")
    await asyncio.sleep(0.25)
    await runtime.set("69.8", "°F")
    await asyncio.sleep(0.2)
    await runtime.settle()
    assert runtime.actions == ["mild"]
    await runtime.set("71.6", "°F")
    await runtime.due()
    assert runtime.actions == ["mild"]


async def test_attribute_update_does_not_execute(runtime):
    await runtime.load()
    await runtime.set("10", friendly_name="Changed label")
    await runtime.due()
    assert runtime.actions == []


async def test_format_change_alone_does_not_execute(runtime):
    await runtime.load()
    await runtime.set("10.0")
    await runtime.due()
    assert runtime.actions == []


async def test_format_change_does_not_lose_pending_thermal_change(runtime):
    await runtime.load()
    await runtime.set("21")
    await asyncio.sleep(DELAY / 2)
    await runtime.set("21.0")
    await runtime.due()
    assert runtime.actions == ["mild"]


async def test_invalid_unit_cancels_pending_timer_and_recovery_starts_new_wait(runtime):
    await runtime.load()
    await runtime.set("21")
    await asyncio.sleep(DELAY / 4)
    await runtime.set("21", "K")
    assert len(runtime.notices) == 1
    await runtime.set("21", "°C")
    assert runtime.notices == {}
    await runtime.due()
    assert runtime.actions == ["mild"]
    await runtime.set("22")
    await runtime.due()
    assert runtime.actions == ["mild"]


async def test_rapid_return_to_same_value_restarts_pending_wait(runtime):
    await runtime.load(stability_delay={"seconds": 0.4})
    await runtime.set("21")
    await asyncio.sleep(0.25)
    attributes = {"unit_of_measurement": "°C", "device_class": "temperature"}
    # Queue both real changes without allowing template listeners to settle.
    runtime.hass.states.async_set(SENSOR, "30", attributes)
    runtime.hass.states.async_set(SENSOR, "21", attributes)
    await runtime.settle()
    await asyncio.sleep(0.2)
    assert runtime.actions == []  # The original deadline has elapsed.
    await asyncio.sleep(0.25)
    await runtime.settle()
    assert runtime.actions == ["mild"]


async def test_notification_create_recovery_race_dismisses_stale_warning(runtime):
    await runtime.load()
    create_started = asyncio.Event()
    release_create = asyncio.Event()

    async def delayed_create(call):
        if "sensor" in call.data["notification_id"]:
            create_started.set()
            await release_create.wait()
        runtime.notices[call.data["notification_id"]] = dict(call.data)

    runtime.hass.services.async_register("persistent_notification", "create", delayed_create)
    await runtime.set("unavailable")
    await asyncio.wait_for(create_started.wait(), 1)
    await runtime.set("30")
    assert runtime.notices == {}
    release_create.set()
    await runtime.settle()
    assert runtime.notices == {}
    assert runtime.actions == []
    await runtime.due()
    assert runtime.actions == ["summer"]


async def test_entity_removal_interrupts_pending_selection(runtime):
    await runtime.load(stability_delay={"seconds": 0.4})
    await runtime.set("21")
    await asyncio.sleep(0.25)
    runtime.hass.states.async_remove(SENSOR)
    await runtime.settle()
    assert len(runtime.notices) == 1
    await runtime.set("21")
    assert runtime.notices == {}
    await asyncio.sleep(0.2)
    # Entity reappearance establishes a baseline rather than selecting a range.
    assert runtime.actions == []
    await asyncio.sleep(0.25)
    await runtime.settle()
    assert runtime.actions == []
    await runtime.set("30")
    await asyncio.sleep(0.45)
    await runtime.settle()
    assert runtime.actions == ["summer"]


@pytest.mark.parametrize("value", ["21", "30"])
async def test_entity_reappearance_requires_subsequent_range_transition(runtime, value):
    await runtime.load()
    await runtime.set("21")
    await runtime.due()
    assert runtime.actions == ["mild"]
    runtime.hass.states.async_remove(SENSOR)
    await runtime.settle()
    await runtime.set(value)
    await runtime.due()
    assert runtime.actions == ["mild"]
    await runtime.set(str(float(value) + 0.5))
    await runtime.due()
    assert runtime.actions == ["mild"]
    await runtime.set("19")
    await runtime.due()
    assert runtime.actions == ["mild", "winter"]


async def test_initial_missing_sensor_requires_subsequent_range_transition(runtime):
    runtime.hass.states.async_remove(SENSOR)
    await runtime.settle()
    await runtime.load(startup=True)
    assert len(runtime.notices) == 1
    await runtime.set("21")
    assert runtime.actions == []
    assert runtime.notices == {}
    await runtime.due()
    assert runtime.actions == []
    await runtime.set("30")
    await runtime.due()
    assert runtime.actions == ["summer"]


async def test_reappearance_with_invalid_reading_still_reports_diagnostics(runtime):
    await runtime.load()
    runtime.hass.states.async_remove(SENSOR)
    await runtime.settle()
    await runtime.set("unavailable")
    assert len(runtime.notices) == 1
    await runtime.due()
    assert runtime.actions == []
    await runtime.set("21")
    await runtime.due()
    assert runtime.actions == ["mild"]


async def test_burst_reappearance_and_within_range_updates_do_not_execute(runtime):
    await runtime.load()
    runtime.hass.states.async_remove(SENSOR)
    await runtime.settle()
    attributes = {"unit_of_measurement": "°C", "device_class": "temperature"}
    runtime.hass.states.async_set(SENSOR, "21", attributes)
    runtime.hass.states.async_remove(SENSOR)
    runtime.hass.states.async_set(SENSOR, "21", attributes)
    runtime.hass.states.async_set(SENSOR, "23", attributes)
    await runtime.settle()
    await runtime.due()
    assert runtime.actions == []
    await runtime.set("30")
    await runtime.due()
    assert runtime.actions == ["summer"]


async def test_reappearance_wait_is_cancelled_by_rapid_range_exit_and_return(runtime):
    await runtime.load(stability_delay={"seconds": 0.4})
    runtime.hass.states.async_remove(SENSOR)
    await runtime.settle()
    await runtime.set("21")
    await asyncio.sleep(0.25)
    attributes = {"unit_of_measurement": "°C", "device_class": "temperature"}
    runtime.hass.states.async_set(SENSOR, "30", attributes)
    runtime.hass.states.async_set(SENSOR, "21", attributes)
    await runtime.settle()
    await asyncio.sleep(0.2)
    assert runtime.actions == []
    await asyncio.sleep(0.25)
    await runtime.settle()
    assert runtime.actions == ["mild"]


async def test_slow_diagnostics_do_not_block_or_delay_seasonal_confirmation(runtime):
    await runtime.load()
    release_dismiss = asyncio.Event()
    dismiss_started = asyncio.Event()

    async def delayed_dismiss(call):
        dismiss_started.set()
        await release_dismiss.wait()
        runtime.notices.pop(call.data["notification_id"], None)

    runtime.hass.services.async_register("persistent_notification", "dismiss", delayed_dismiss)
    try:
        await runtime.set("21")
        await asyncio.wait_for(dismiss_started.wait(), 1)
        await runtime.due()
        assert runtime.actions == ["mild"]
        await runtime.set("30")
        release_dismiss.set()
        await runtime.settle()
        assert runtime.actions == ["mild"]
        await runtime.due()
        assert runtime.actions == ["mild", "summer"]
    finally:
        release_dismiss.set()


async def test_initial_burst_return_to_same_value_runs_once(runtime):
    await runtime.load()
    attributes = {"unit_of_measurement": "°C", "device_class": "temperature"}
    for value in ("21", "10", "21"):
        runtime.hass.states.async_set(SENSOR, value, attributes)
    await runtime.settle()
    await runtime.due()
    assert runtime.actions == ["mild"]


async def test_manual_execution_only_checks_diagnostics(runtime):
    await runtime.load()
    await runtime.hass.services.async_call("automation", "trigger", {"entity_id": "automation.seasonal_test"}, blocking=True)
    await runtime.due()
    assert runtime.actions == []
    await runtime.set("unavailable")
    await runtime.hass.services.async_call("automation", "trigger", {"entity_id": "automation.seasonal_test"}, blocking=True)
    assert len(runtime.notices) == 1


def test_minimum_core_uses_service_key_in_examples():
    cv.SCRIPT_SCHEMA([{"service": "select.select_option", "data": {"option": "Winter"}, "target": {"entity_id": "select.velair_mode"}}])
    with pytest.raises(vol.Invalid):
        cv.SCRIPT_SCHEMA([{"action": "select.select_option", "data": {"option": "Winter"}, "target": {"entity_id": "select.velair_mode"}}])


def test_language_and_temperature_selector_contracts():
    bp = Blueprint(load_yaml(str(BLUEPRINT)), expected_domain="automation")
    canonical = {
        item.stem.replace("_", "-")
        for item in (BLUEPRINT.parents[3] / "frontend/src/velair/translations").glob("*.ts")
        if item.stem not in {"index", "template", "types"}
    }
    language_options = bp.inputs["notification_language"]["selector"]["select"]["options"]
    assert {item["value"] for item in language_options} == canonical == set(LANGUAGES)
    assert all(item["label"].strip() for item in language_options)
    assert bp.inputs["notification_language"]["default"] == "en"
    assert bp.inputs["threshold_unit"]["selector"]["select"]["options"] == ["°C", "°F"]
    assert bp.inputs["threshold_unit"]["default"] == "°C"
    assert bp.inputs["stability_delay"]["default"] == {"minutes": 30}


@pytest.mark.parametrize("language", LANGUAGES)
async def test_localized_sensor_and_configuration_notifications(runtime, language):
    await runtime.set("unavailable")
    await runtime.load(startup=True, notification_language=language, winter_threshold=27, summer_threshold=20)
    notices = runtime.notices
    assert len(notices) == 2
    sensor = next(value for key, value in notices.items() if "sensor" in key)
    configuration = next(value for key, value in notices.items() if "configuration" in key)
    assert (sensor["title"], configuration["title"]) == LOCALIZED_TITLES[language]
    assert SENSOR in sensor["message"]
    assert "automation.seasonal_test" in sensor["message"]
    assert "automation.seasonal_test" in configuration["message"]
    assert "°C" in sensor["message"] and "°F" in sensor["message"]
    assert "°C" in configuration["message"] and "°F" in configuration["message"]
    if language == "en":
        assert sensor["title"] == "Velair: temperature unavailable"
        assert configuration["title"] == "Velair: invalid seasonal configuration"
        assert "Seasonal actions are suspended" in sensor["message"]
        assert "Seasonal actions will not run" in configuration["message"]
    else:
        assert sensor["title"] != "Velair: temperature unavailable"
        assert configuration["title"] != "Velair: invalid seasonal configuration"
        assert "Seasonal actions are suspended" not in sensor["message"]
        assert "Seasonal actions will not run" not in configuration["message"]
    await runtime.set("30")
    assert len(runtime.notices) == 1
    assert next(iter(runtime.notices.values()))["title"] == configuration["title"]
    await runtime.due()
    assert runtime.actions == []


async def test_legacy_unknown_language_falls_back_to_english(runtime):
    await runtime.set("unavailable")
    await runtime.load(startup=True, notification_language="legacy-unknown", winter_threshold=27, summer_threshold=20)
    assert len(runtime.notices) == 2
    assert {item["title"] for item in runtime.notices.values()} == {
        "Velair: temperature unavailable", "Velair: invalid seasonal configuration",
    }


@pytest.mark.parametrize("value,unit", [("unknown", "°C"), ("unavailable", "°C"), ("banana", "°C"), ("nan", "°C"), ("inf", "°C"), ("21", None), ("21", "K")])
async def test_invalid_sensor_immediate_deduplicated_notification(runtime, value, unit):
    await runtime.load(notification_language="es")
    await runtime.set("21")
    await runtime.set(value, unit)
    assert len(runtime.notices) == 1
    notice = next(iter(runtime.notices.values()))
    assert SENSOR in notice["message"]
    assert "estacionales" in notice["message"]
    await runtime.due()
    assert runtime.actions == []
    assert len(runtime.notices) == 1
    await runtime.set("30")
    assert runtime.notices == {}
    assert runtime.actions == []
    await runtime.due()
    assert runtime.actions == ["summer"]


async def test_startup_invalid_sensor_warns_without_actions(runtime):
    await runtime.set("unavailable")
    await runtime.load(startup=True)
    await runtime.settle()
    assert len(runtime.notices) == 1
    await runtime.due()
    assert runtime.actions == []


@pytest.mark.parametrize("inputs", [{"winter_threshold": 27, "summer_threshold": 20}, {"winter_threshold": 20, "summer_threshold": 20}, {"stability_delay": {"seconds": 0}}])
async def test_invalid_configuration_has_distinct_notification(runtime, inputs):
    await runtime.load(startup=True, **inputs)
    await runtime.settle()
    assert any("configuration" in key for key in runtime.notices)
    await runtime.set("unavailable")
    assert len(runtime.notices) == 2
    await runtime.set("30")
    await runtime.due()
    assert runtime.actions == []
    assert len(runtime.notices) == 1


@pytest.mark.parametrize("sensor_value,sensor_unit,inputs,expected", [("68", "°F", {}, "mild"), ("80.6", "°F", {}, "mild"), ("86", "°F", {}, "summer"), ("18", "°C", {"threshold_unit": "°F", "winter_threshold": 68, "summer_threshold": 80.6}, "winter")])
async def test_unit_conversion(runtime, sensor_value, sensor_unit, inputs, expected):
    if expected == "winter":
        await runtime.set("23")
    await runtime.load(**inputs)
    await runtime.set(sensor_value, sensor_unit)
    await runtime.due()
    assert runtime.actions == [expected]


async def test_diagnostics_while_user_actions_are_running(runtime):
    await runtime.load(summer_actions=[{"service": "test.waiting"}])
    await runtime.set("30")
    await runtime.due()
    assert runtime.actions == ["started"]
    await runtime.set("unavailable")
    assert len(runtime.notices) == 1
    runtime.gate.set()
    await runtime.settle()
    assert runtime.actions == ["started", "finished"]


async def test_empty_actions_preserve_existing_operation(runtime):
    await runtime.load(mild_actions=[])
    await runtime.set("21")
    await runtime.due()
    assert runtime.actions == []


async def test_failed_user_action_does_not_block_future_diagnostics(runtime, caplog):
    await runtime.load(summer_actions=[{"service": "test.failing"}])
    await runtime.set("30")
    await runtime.due()
    assert "Example configured action failure" in caplog.text
    await runtime.set("unavailable")
    assert len(runtime.notices) == 1


async def test_pending_timer_is_cancelled_on_automation_disable(runtime):
    await runtime.load()
    await runtime.set("30")
    await runtime.hass.services.async_call("automation", "turn_off", {"entity_id": "automation.seasonal_test"}, blocking=True)
    await runtime.due()
    assert runtime.actions == []
    await runtime.hass.services.async_call("automation", "turn_on", {"entity_id": "automation.seasonal_test"}, blocking=True)
    await runtime.due()
    assert runtime.actions == []
    await runtime.set("31")
    await runtime.due()
    assert runtime.actions == []
    await runtime.set("23")
    await runtime.due()
    await runtime.set("31")
    await runtime.due()
    assert runtime.actions == ["mild", "summer"]
