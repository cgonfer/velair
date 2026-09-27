"""External schedule execution provider and ownership tests."""

from __future__ import annotations

import asyncio
from dataclasses import replace
from types import ModuleType, SimpleNamespace
import sys
import unittest
from unittest.mock import patch

from . import helpers  # noqa: F401 - install Home Assistant stubs
from custom_components.velair.execution import ExecutionAuthority, ExternalExecutionError
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.external_execution.manager import ExternalExecutionManager
from custom_components.velair.external_execution.models import ExternalScheduleRequiredError
from custom_components.velair.external_execution.ramses_cc import (
    RamsesCcScheduleProvider,
    translate_weekly_schedule,
)
from custom_components.velair.models import WEEKDAYS, empty_week_schedule, normalize_schedule_data
from custom_components.velair.api import _normalize_import_zones
from custom_components.velair import scheduler as scheduler_module
from custom_components.velair.scheduler import VelairScheduler


def _schedule(temperature: float = 20.0) -> dict:
    schedule = empty_week_schedule()
    for day in WEEKDAYS:
        schedule[day] = [{"start": "00:00", "action": "set_temperature", "temperature": temperature}]
    return schedule


class ExternalTranslatorTest(unittest.TestCase):
    def test_execution_defaults_local_without_serialized_field(self) -> None:
        default = normalize_schedule_data(None, ["climate.zone"])
        self.assertNotIn("execution", default["zones"]["climate.zone"])
        external = normalize_schedule_data(
            {"zones": {"climate.zone": {"execution": {"type": "external", "provider": "ramses_cc"}}}},
            ["climate.zone"],
        )
        self.assertEqual("ramses_cc", external["zones"]["climate.zone"]["execution"]["provider"])

    def test_translates_seven_days_and_fahrenheit_to_celsius(self) -> None:
        payload = translate_weekly_schedule(_schedule(68), "°F")
        self.assertEqual(7, len(payload))
        self.assertEqual(20.0, payload[0]["switchpoints"][0]["heat_setpoint"])

    def test_rejects_non_grid_ranges_options_and_overflow(self) -> None:
        invalid_cases = [
            {"start": "06:03", "temperature": 20},
            {"start": "06:00", "target_temp_low": 19, "target_temp_high": 21},
            {"start": "06:00", "temperature": 20, "fan_mode": "auto"},
        ]
        for block in invalid_cases:
            schedule = _schedule()
            schedule["monday"] = [block]
            with self.subTest(block=block), self.assertRaises(ValueError):
                translate_weekly_schedule(schedule, "°C")
        five_minute_schedule = _schedule()
        five_minute_schedule["monday"] = [{"start": "06:05", "temperature": 20}]
        translate_weekly_schedule(five_minute_schedule, "°C")
        schedule = _schedule()
        schedule["monday"] = [
            {"start": f"{hour:02d}:00", "temperature": 20 + hour / 10}
            for hour in range(7)
        ]
        with self.assertRaisesRegex(ValueError, "6-switchpoint"):
            translate_weekly_schedule(schedule, "°C")

        six_after_midnight = _schedule()
        six_after_midnight["monday"] = [
            {"start": f"{hour:02d}:00", "temperature": 20 + hour / 10}
            for hour in range(1, 7)
        ]
        with self.assertRaisesRegex(ValueError, "6-switchpoint"):
            translate_weekly_schedule(six_after_midnight, "°C")

    def test_portable_schedule_import_preserves_local_execution_ownership(self) -> None:
        current = normalize_schedule_data(None, ["climate.zone"])["zones"]
        current["climate.zone"]["execution"] = {
            "type": "external",
            "provider": "ramses_cc",
        }
        imported = _normalize_import_zones(
            {"climate.zone": {"schedule": _schedule(21)}},
            current,
        )
        self.assertEqual(
            {"type": "external", "provider": "ramses_cc"},
            imported["climate.zone"]["execution"],
        )


class _Services:
    def __init__(self, *, fail: bool = False, pause: bool = False) -> None:
        self.calls = []
        self.fail = fail
        self.started = asyncio.Event()
        self.release = asyncio.Event()
        if not pause:
            self.release.set()

    def has_service(self, domain, service):
        return domain == "ramses_cc" and service == "set_zone_schedule"

    async def async_call(self, domain, service, data, *, blocking=False):
        self.calls.append((domain, service, data, blocking))
        self.started.set()
        await self.release.wait()
        if self.fail:
            raise RuntimeError("radio failed\ninternal detail")


class ExternalProviderTest(unittest.IsolatedAsyncioTestCase):
    def _hass(self, *, fail: bool = False, pause: bool = False):
        registry_entry = SimpleNamespace(platform="ramses_cc", config_entry_id="entry")
        registry = SimpleNamespace(async_get=lambda entity_id: registry_entry)
        module = ModuleType("homeassistant.helpers.entity_registry")
        module.async_get = lambda hass: registry
        sys.modules["homeassistant.helpers.entity_registry"] = module
        sys.modules["homeassistant.helpers"].entity_registry = module
        return SimpleNamespace(
            services=_Services(fail=fail, pause=pause),
            states={"climate.zone": SimpleNamespace(attributes={"hvac_modes": ["off", "heat"], "supported_features": 1})},
            config_entries=SimpleNamespace(async_get_entry=lambda entry_id: SimpleNamespace(state="loaded")),
        )

    async def test_detects_loaded_entity_and_publishes_blocking(self) -> None:
        hass = self._hass()
        provider = RamsesCcScheduleProvider(hass)
        self.assertEqual(["climate.zone"], provider.compatible_entities(["climate.zone"]))
        await provider.async_publish("climate.zone", _schedule(), "°C")
        self.assertEqual(1, len(hass.services.calls))
        self.assertEqual(("ramses_cc", "set_zone_schedule"), hass.services.calls[0][:2])
        self.assertTrue(hass.services.calls[0][3])

    def test_accepts_full_five_minute_day_boundary(self) -> None:
        schedule = _schedule()
        schedule["monday"] = [{"start": "23:55", "temperature": 20}]
        translate_weekly_schedule(schedule, "°C")

        schedule["monday"] = [{"start": "24:00", "temperature": 20}]
        with self.assertRaises(ValueError):
            translate_weekly_schedule(schedule, "°C")

    def test_capability_reports_five_minute_grid(self) -> None:
        capabilities = RamsesCcScheduleProvider.capabilities
        self.assertEqual(("set_temperature",), capabilities.supported_actions)
        self.assertEqual(("heat",), capabilities.supported_hvac_modes)
        self.assertEqual(("scalar",), capabilities.supported_target_types)
        self.assertEqual((), capabilities.supported_option_fields)
        self.assertTrue(capabilities.supports_profile_schedules)
        self.assertEqual(6, capabilities.max_switchpoints_per_day)
        self.assertEqual(5, capabilities.time_step_minutes)
        self.assertTrue(capabilities.implicit_midnight_change_counts_toward_limit)

    def test_options_only_requires_explicit_provider_action_support(self) -> None:
        schedule = empty_week_schedule()
        for day in WEEKDAYS:
            schedule[day] = [{
                "start": "00:00",
                "action": "set_climate_options",
                "preset_mode": "sleep",
            }]
        data = {"zones": {"climate.zone": {"schedule": schedule}}}
        base = RamsesCcScheduleProvider.capabilities
        provider = SimpleNamespace(capabilities=base)
        manager = ExternalExecutionManager(
            data, {"provider": provider}, lambda: None, lambda _entity: "°C"
        )
        with self.assertRaisesRegex(ValueError, "do not support set_climate_options"):
            manager.ensure_schedule_supported("climate.zone", schedule, "provider")

        provider.capabilities = replace(
            base,
            supported_actions=("set_temperature", "set_climate_options"),
            supported_option_fields=("preset_mode",),
        )
        manager.ensure_schedule_supported("climate.zone", schedule, "provider")

    def test_provider_must_support_velair_publish_contract(self) -> None:
        data = {"zones": {"climate.zone": {"schedule": _schedule()}}}
        for field in ("can_publish", "supports_profile_schedules"):
            capabilities = replace(
                RamsesCcScheduleProvider.capabilities,
                **{field: False},
            )
            provider = SimpleNamespace(
                capabilities=capabilities,
                compatible_entities=lambda entities: list(entities),
            )
            manager = ExternalExecutionManager(
                data,
                {"invalid": provider},
                lambda: None,
                lambda entity_id: "°C",
            )
            with self.subTest(field=field):
                self.assertEqual([], manager.describe()["systems"])
                with self.assertRaisesRegex(ValueError, "not available"):
                    manager.ensure_provider_available("climate.zone", "invalid")

    def test_detection_requires_scalar_target_temperature_support(self) -> None:
        hass = self._hass()
        hass.states["climate.zone"].attributes["supported_features"] = 0
        provider = RamsesCcScheduleProvider(hass)
        self.assertEqual([], provider.compatible_entities(["climate.zone"]))

    async def test_activation_persists_before_failure_and_keeps_error(self) -> None:
        hass = self._hass(fail=True)
        data = {"zones": {"climate.zone": {"schedule": _schedule()}}}
        saved = []

        async def save():
            saved.append(dict(data["zones"]["climate.zone"]["execution"]))

        manager = ExternalExecutionManager(
            data,
            {"ramses_cc": RamsesCcScheduleProvider(hass)},
            save,
            lambda entity_id: "°C",
        )
        observed_states = []
        manager.set_update_callback(
            lambda: observed_states.append(
                manager.describe()["zones"]["climate.zone"]["publication"]["state"]
            )
        )
        await manager.async_set_execution("climate.zone", "ramses_cc", schedule=_schedule())
        self.assertEqual([{"type": "external", "provider": "ramses_cc"}], saved)
        self.assertTrue(manager.authority.is_external("climate.zone"))
        zone = manager.describe()["zones"]["climate.zone"]
        self.assertTrue(zone["available"])
        self.assertEqual("failed", zone["publication"]["state"])
        self.assertEqual("failed", manager.publication_state("climate.zone"))
        self.assertTrue(manager.needs_publication("climate.zone"))
        self.assertEqual(["publishing", "failed"], observed_states)

    async def test_success_is_published_and_can_return_local(self) -> None:
        hass = self._hass()
        data = {"zones": {"climate.zone": {"schedule": _schedule()}}}
        saved = []

        async def save():
            saved.append(dict(data["zones"]["climate.zone"]))

        manager = ExternalExecutionManager(
            data,
            {"ramses_cc": RamsesCcScheduleProvider(hass)},
            save,
            lambda entity_id: "°C",
        )
        await manager.async_set_execution("climate.zone", "ramses_cc", schedule=_schedule())
        publication = manager.describe()["zones"]["climate.zone"]["publication"]
        self.assertEqual("published", publication["state"])
        self.assertIsNotNone(publication["published_at"])

        await manager.async_set_execution("climate.zone", None)
        self.assertNotIn("execution", data["zones"]["climate.zone"])
        self.assertFalse(manager.authority.is_external("climate.zone"))

    async def test_publication_is_publishing_only_while_provider_call_is_pending(self) -> None:
        hass = self._hass(pause=True)
        data = {"zones": {"climate.zone": {"schedule": _schedule()}}}

        async def save():
            return None

        manager = ExternalExecutionManager(
            data,
            {"ramses_cc": RamsesCcScheduleProvider(hass)},
            save,
            lambda entity_id: "°C",
        )
        observed_states = []
        manager.set_update_callback(
            lambda: observed_states.append(
                manager.describe()["zones"]["climate.zone"]["publication"]["state"]
            )
        )
        task = asyncio.create_task(manager.async_set_execution("climate.zone", "ramses_cc", schedule=_schedule()))
        await hass.services.started.wait()
        self.assertEqual(
            "publishing",
            manager.describe()["zones"]["climate.zone"]["publication"]["state"],
        )
        self.assertEqual("publishing", manager.publication_state("climate.zone"))
        self.assertFalse(manager.needs_publication("climate.zone"))
        hass.services.release.set()
        await task
        self.assertEqual(["publishing", "published"], observed_states)
        self.assertEqual("published", manager.publication_state("climate.zone"))
        self.assertFalse(manager.needs_publication("climate.zone"))

    async def test_scheduler_dispatches_publication_lifecycle_updates(self) -> None:
        hass = self._hass()
        data = {"zones": {"climate.zone": {"schedule": _schedule()}}}

        async def save():
            return None

        manager = ExternalExecutionManager(
            data,
            {"ramses_cc": RamsesCcScheduleProvider(hass)},
            save,
            lambda entity_id: "°C",
        )
        with patch.object(scheduler_module, "async_dispatcher_send") as dispatch:
            VelairScheduler(
                hass,
                data,
                SimpleNamespace(),
                save,
                climate_delivery=SimpleNamespace(),
                external_execution=manager,
            )
            await manager.async_set_execution("climate.zone", "ramses_cc", schedule=_schedule())

        self.assertEqual(2, dispatch.call_count)

    async def test_new_schedule_clears_published_when_provider_is_unavailable(self) -> None:
        hass = self._hass()
        data = {"zones": {"climate.zone": {"schedule": _schedule()}}}

        async def save():
            return None

        manager = ExternalExecutionManager(
            data,
            {"ramses_cc": RamsesCcScheduleProvider(hass)},
            save,
            lambda entity_id: "°C",
        )
        observed_publications = []

        def observe_publication():
            publication = manager.describe()["zones"]["climate.zone"]["publication"]
            observed_publications.append(publication["state"] if publication else None)

        manager.set_update_callback(observe_publication)
        await manager.async_set_execution("climate.zone", "ramses_cc", schedule=_schedule())
        self.assertEqual(
            "published",
            manager.describe()["zones"]["climate.zone"]["publication"]["state"],
        )

        hass.services.has_service = lambda domain, service: False
        await manager.async_schedule_saved("climate.zone", _schedule())

        self.assertIsNone(manager.describe()["zones"]["climate.zone"]["publication"])
        self.assertEqual(1, len(hass.services.calls))
        self.assertEqual(["publishing", "published", None], observed_publications)

    async def test_saved_external_owner_stops_publishing_if_provider_contract_drifts(self) -> None:
        hass = self._hass()
        data = {"zones": {"climate.zone": {"schedule": _schedule()}}}

        async def save():
            return None

        provider = RamsesCcScheduleProvider(hass)
        manager = ExternalExecutionManager(
            data,
            {"ramses_cc": provider},
            save,
            lambda entity_id: "°C",
        )
        observed_publications = []

        def observe_publication():
            publication = manager.describe()["zones"]["climate.zone"]["publication"]
            observed_publications.append(publication["state"] if publication else None)

        manager.set_update_callback(observe_publication)
        await manager.async_set_execution("climate.zone", "ramses_cc", schedule=_schedule())
        provider.capabilities = replace(provider.capabilities, can_publish=False)

        await manager.async_schedule_saved("climate.zone", _schedule())

        self.assertTrue(manager.authority.is_external("climate.zone"))
        self.assertIsNone(manager.describe()["zones"]["climate.zone"]["publication"])
        self.assertEqual(1, len(hass.services.calls))
        self.assertEqual(["publishing", "published", None], observed_publications)

    async def test_cancelled_publication_keeps_external_ownership_and_clears_status(self) -> None:
        hass = self._hass(pause=True)
        data = {"zones": {"climate.zone": {"schedule": _schedule()}}}
        saved = asyncio.Event()

        async def save():
            saved.set()

        manager = ExternalExecutionManager(
            data,
            {"ramses_cc": RamsesCcScheduleProvider(hass)},
            save,
            lambda entity_id: "°C",
        )
        task = asyncio.create_task(
            manager.async_set_execution("climate.zone", "ramses_cc", schedule=_schedule())
        )
        await saved.wait()
        await hass.services.started.wait()
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task

        self.assertTrue(manager.authority.is_external("climate.zone"))
        self.assertEqual(
            "ramses_cc", data["zones"]["climate.zone"]["execution"]["provider"]
        )
        self.assertIsNone(manager.describe()["zones"]["climate.zone"]["publication"])

    def test_restart_has_no_publication_claim_and_retains_selected_provider_metadata(self) -> None:
        hass = self._hass()
        hass.services.has_service = lambda domain, service: False
        data = {
            "zones": {
                "climate.zone": {
                    "schedule": _schedule(),
                    "execution": {"type": "external", "provider": "ramses_cc"},
                }
            }
        }
        manager = ExternalExecutionManager(
            data,
            {"ramses_cc": RamsesCcScheduleProvider(hass)},
            lambda: None,
            lambda entity_id: "°C",
        )

        described = manager.describe()
        self.assertEqual("Evohome via ramses_cc", described["systems"][0]["name"])
        self.assertEqual([], described["systems"][0]["entities"])
        self.assertFalse(described["zones"]["climate.zone"]["available"])
        self.assertIsNone(described["zones"]["climate.zone"]["publication"])
        self.assertIsNone(manager.publication_state("climate.zone"))
        self.assertTrue(manager.needs_publication("climate.zone"))

    def test_unknown_selected_provider_has_safe_metadata_fallback(self) -> None:
        data = {
            "zones": {
                "climate.zone": {
                    "schedule": _schedule(),
                    "execution": {"type": "external", "provider": "future_provider"},
                }
            }
        }
        manager = ExternalExecutionManager(data, {}, lambda: None, lambda entity_id: "°C")

        described = manager.describe()
        self.assertEqual([], described["systems"])
        self.assertFalse(described["zones"]["climate.zone"]["available"])
        self.assertIsNone(described["zones"]["climate.zone"]["publication"])

    async def test_storage_failure_restores_previous_execution_authority(self) -> None:
        hass = self._hass()
        data = {"zones": {"climate.zone": {"schedule": _schedule()}}}

        async def fail_save():
            raise RuntimeError("storage unavailable")

        manager = ExternalExecutionManager(
            data,
            {"ramses_cc": RamsesCcScheduleProvider(hass)},
            fail_save,
            lambda entity_id: "°C",
        )
        with self.assertRaisesRegex(RuntimeError, "storage unavailable"):
            await manager.async_set_execution("climate.zone", "ramses_cc", schedule=_schedule())
        self.assertNotIn("execution", data["zones"]["climate.zone"])
        self.assertFalse(manager.authority.is_external("climate.zone"))

    async def test_empty_schedule_is_rejected_before_execution_is_persisted(self) -> None:
        hass = self._hass()
        data = {"zones": {"climate.zone": {"schedule": empty_week_schedule()}}}
        saved = []

        async def save():
            saved.append(True)

        manager = ExternalExecutionManager(
            data,
            {"ramses_cc": RamsesCcScheduleProvider(hass)},
            save,
            lambda entity_id: "°C",
        )

        with self.assertRaises(ExternalScheduleRequiredError) as raised:
            await manager.async_set_execution(
                "climate.zone",
                "ramses_cc",
                schedule=empty_week_schedule(),
            )

        self.assertEqual("external_schedule_required", raised.exception.code)
        self.assertEqual([], saved)
        self.assertNotIn("execution", data["zones"]["climate.zone"])
        self.assertFalse(manager.authority.is_external("climate.zone"))

    def test_authority_rejects_physical_action(self) -> None:
        authority = ExecutionAuthority({"climate.zone": {"execution": {"type": "external", "provider": "test"}}})
        with self.assertRaises(ExternalExecutionError):
            authority.ensure_local("climate.zone")

    def test_authority_follows_replaced_zones_mapping(self) -> None:
        data = {"zones": {"climate.zone": {"execution": {"type": "external", "provider": "test"}}}}
        authority = ExecutionAuthority(data)
        self.assertTrue(authority.is_external("climate.zone"))
        data["zones"] = {"climate.zone": {}}
        self.assertFalse(authority.is_external("climate.zone"))

    async def test_failed_return_to_local_keeps_external_barrier(self) -> None:
        hass = self._hass()
        data = {
            "zones": {
                "climate.zone": {
                    "schedule": _schedule(),
                    "execution": {"type": "external", "provider": "ramses_cc"},
                }
            }
        }

        async def fail_save():
            raise RuntimeError("storage unavailable")

        manager = ExternalExecutionManager(
            data,
            {"ramses_cc": RamsesCcScheduleProvider(hass)},
            fail_save,
            lambda entity_id: "°C",
        )
        with self.assertRaisesRegex(RuntimeError, "storage unavailable"):
            await manager.async_set_execution("climate.zone", None)
        self.assertTrue(manager.authority.is_external("climate.zone"))
        self.assertEqual("ramses_cc", data["zones"]["climate.zone"]["execution"]["provider"])

    async def test_climate_manager_backstop_makes_zero_service_calls(self) -> None:
        hass = self._hass()
        authority = ExecutionAuthority(
            {"climate.zone": {"execution": {"type": "external", "provider": "ramses_cc"}}}
        )
        manager = ClimateManager(hass, authority)
        with self.assertRaises(ExternalExecutionError):
            await manager.async_turn_off("climate.zone")
        self.assertEqual([], hass.services.calls)
