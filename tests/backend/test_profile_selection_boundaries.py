"""Public Profile composition contracts and strict request boundaries."""

from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from . import helpers as _helpers  # noqa: F401
from . import test_services as service_tests
from . import test_api as api_tests

import voluptuous as vol

from custom_components.velair import api, services
from custom_components.velair.const import DOMAIN
from custom_components.velair.selection_requests import (
    climate_entity_ids, profile_ids,
)


class ProfileSelectionRequestTests(unittest.TestCase):
    def test_profile_list_is_explicit_and_unique(self):
        self.assertEqual(profile_ids([]), [])
        self.assertEqual(profile_ids([" winter ", "remote"]), ["winter", "remote"])
        for value in (None, "winter", {}, [1], [False], [None], [""], ["  "], ["a", " a "]):
            with self.subTest(value=value), self.assertRaises(vol.Invalid):
                profile_ids(value)

    def test_zone_clear_accepts_only_explicit_unique_climates(self):
        self.assertEqual(climate_entity_ids("climate.office"), ["climate.office"])
        self.assertEqual(climate_entity_ids([]), [])
        for value in (None, {}, 3, [False], ["sensor.room"], ["climate.a", "climate.a"]):
            with self.subTest(value=value), self.assertRaises(vol.Invalid):
                climate_entity_ids(value)

    def test_default_exception_requires_explicit_null(self):
        self.assertEqual(services.SET_ZONE_PROFILE_SCHEMA({
            "entity_id": "climate.office", "profile_id": None,
        })["profile_id"], None)
        for data in ({"entity_id": "climate.office"},
                     {"entity_id": "climate.office", "profile_id": ""},
                     {"entity_id": "climate.office", "profile_id": False}):
            with self.subTest(data=data), self.assertRaises(vol.Invalid):
                services.SET_ZONE_PROFILE_SCHEMA(data)


class ProfileSelectionServicesTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        service_tests.ClimateProfileServiceTest.setUp(self)
        for name in ("activate_profiles", "apply_profiles", "set_zone_profile", "clear_profile_overrides"):
            setattr(self.scheduler, f"async_{name}", AsyncMock())

    async def test_actions_forward_and_unregister(self):
        await services.async_setup_services(self.hass)
        cases = (
            ("activate_profiles", {"profile_ids": []}, ([],)),
            ("apply_profiles", {"profile_ids": ["remote"]}, (["remote"],)),
            ("set_zone_profile", {"entity_id": "climate.office", "profile_id": None}, ("climate.office", None)),
            ("clear_profile_overrides", {"entity_id": "climate.office"}, (["climate.office"],)),
        )
        for name, data, args in cases:
            with self.subTest(action=name):
                handler, schema = self.services.handlers[(DOMAIN, name)]
                await handler(SimpleNamespace(data=schema(data)))
                getattr(self.scheduler, f"async_{name}").assert_awaited_once_with(*args, source="service")
        await services.async_unload_services(self.hass)
        for name, _, _ in cases:
            self.assertIn((DOMAIN, name), self.services.removed)

    async def test_validation_errors_reach_automation(self):
        await services.async_setup_services(self.hass)
        self.scheduler.async_apply_profiles.side_effect = ValueError("Conflicting zone climate.office")
        handler, _ = self.services.handlers[(DOMAIN, "apply_profiles")]
        with self.assertRaisesRegex(services.HomeAssistantError, "Conflicting zone"):
            await handler(SimpleNamespace(data={"profile_ids": ["a", "b"]}))


class ProfileSelectionWebsocketTests(unittest.IsolatedAsyncioTestCase):
    async def test_actions_forward_panel_source_and_return_projection(self):
        for name, data, args in (
            ("activate_profiles", {"profile_ids": []}, ([],)),
            ("apply_profiles", {"profile_ids": ["remote"]}, (["remote"],)),
            ("set_zone_profile", {"entity_id": "climate.office", "profile_id": None}, ("climate.office", None)),
            ("clear_profile_overrides", {"entity_id": ["climate.office"]}, (["climate.office"],)),
        ):
            with self.subTest(action=name):
                method = AsyncMock()
                runtime = {"scheduler": SimpleNamespace(**{f"async_{name}": method})}
                connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
                with patch.object(api, "_get_runtime", return_value=runtime), \
                     patch.object(api, "_reject_temperature_migration_mutation", return_value=False), \
                     patch.object(api, "_build_schedule_response", return_value={"profile_selection": "projection"}):
                    await getattr(api, f"ws_{name}")(Mock(), connection, {"id": 7, **data})
                method.assert_awaited_once_with(*args, source="panel")
                connection.send_result.assert_called_once_with(7, {"profile_selection": "projection"})
                connection.send_error.assert_not_called()

    async def test_conflict_is_reported_and_migration_gate_prevents_call(self):
        method = AsyncMock(side_effect=ValueError("overlap"))
        runtime = {"scheduler": SimpleNamespace(async_apply_profiles=method)}
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        with patch.object(api, "_get_runtime", return_value=runtime), \
             patch.object(api, "_reject_temperature_migration_mutation", return_value=False):
            await api.ws_apply_profiles(Mock(), connection, {"id": 1, "profile_ids": ["a", "b"]})
        connection.send_error.assert_called_once_with(1, "invalid_profile", "overlap")
        connection.send_result.assert_not_called()
        method.reset_mock()
        with patch.object(api, "_get_runtime", return_value=runtime), \
             patch.object(api, "_reject_temperature_migration_mutation", return_value=True):
            await api.ws_apply_profiles(Mock(), connection, {"id": 2, "profile_ids": ["a"]})
        method.assert_not_awaited()


class ProfileSelectionResponseTests(unittest.TestCase):
    def test_response_separates_base_from_partial_effective_ownership(self):
        data = _helpers.normalize_schedule_data(None, ["climate.office", "climate.bedroom"])
        data["global_"].update(active_profile_ids=["winter"], base_profile_ids=["winter"],
            base_mode_id="winter-mode", active_mode_id=None,
            zone_profile_overrides={"climate.office": "remote"})
        selection = {"base_profile_ids": ["winter"], "base_mode_id": "winter-mode",
                     "zone_profile_overrides": {"climate.office": "remote"}}
        ownership = {"climate.office": "remote", "climate.bedroom": "winter"}
        scheduler = SimpleNamespace(profile_selection=selection,
            effective_zone_profiles=ownership, effective_profile_ids=["remote", "winter"],
            next_event=None, next_events=[], get_active_overrides=lambda: {},
            get_operational_status=lambda: "scheduled", get_comfort_assessments=lambda: {},
            get_room_sensor_assist_statuses=lambda: {})
        response = api._build_schedule_response({
            "entry": SimpleNamespace(data={}, options={}),
            "climate_manager": api_tests.FakeClimateCapabilities(["off", "heat"]),
            "scheduler": scheduler, "storage": SimpleNamespace(data=data),
        })
        self.assertEqual(response["active_profile_ids"], ["winter"])
        self.assertIsNone(response["active_mode_id"])
        self.assertEqual(response["profile_selection"], selection)
        self.assertEqual(response["effective_zone_profiles"], ownership)
        self.assertEqual(response["effective_profile_ids"], ["remote", "winter"])
        response["profile_selection"]["zone_profile_overrides"].clear()
        response["effective_zone_profiles"].clear()
        self.assertEqual(selection["zone_profile_overrides"], {"climate.office": "remote"})
        self.assertEqual(len(ownership), 2)
