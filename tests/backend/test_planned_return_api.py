"""Planned return persistence, validation and API boundaries."""
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from . import helpers
from custom_components.velair import api
from custom_components.velair.models import (
    default_planned_return, validate_planned_return, normalize_schedule_data,
    serialize_schedule_data,
)


class PlannedReturnModelTest(unittest.TestCase):
    def test_immediate_away_gate_roundtrips_and_rejects_invalid_authority(self):
        config = self.config() | {'enabled': False}
        episode = {'state': 'away', 'origin': 'manual', 'started_at': helpers.NOW.isoformat(),
                   'departure_at': helpers.NOW.isoformat(), 'return_at': '2026-05-22T18:00:00+00:00',
                   'away_mode_id': 'default', 'destination_mode_id': 'default',
                   'preparing_entities': [], 'awaiting_departure_confirmation': True}
        for state in ('away', 'skipped'):
            expected = episode | {'state': state}
            data = normalize_schedule_data({'planned_return': config, 'planned_return_episode': expected}, [])
            self.assertEqual(normalize_schedule_data(serialize_schedule_data(data), [])['planned_return_episode'], expected)
        for changes in ({'awaiting_departure_confirmation': 'true'}, {'awaiting_departure_confirmation': 1},
                        {'origin': 'automatic'}, {'state': 'armed'}, {'state': 'fulfilled'}):
            with self.subTest(changes=changes):
                self.assertIsNone(normalize_schedule_data({'planned_return': config,
                    'planned_return_episode': episode | changes}, [])['planned_return_episode'])

    def config(self):
        return default_planned_return() | {"enabled": True, "occupancy_entity_ids": ["binary_sensor.home"]}

    def test_legacy_defaults_and_serialization(self):
        data = normalize_schedule_data({}, ["climate.home"])
        self.assertEqual(data["planned_return"], default_planned_return())
        self.assertIsNone(serialize_schedule_data(data)["planned_return_episode"])

    def test_validation_rejects_damaged_inputs_and_unknown_modes(self):
        for change in (
            {"enabled": "true"}, {"occupancy_entity_ids": ["sensor.temperature"]},
            {"occupancy_entity_ids": ["person.owner"]},
            {"away_mode_id": "missing"}, {"absence_delay_minutes": True},
            {"absence_delay_minutes": -1}, {"weekly": {"monday": "24:00"}},
            {"weekly": {"mon": "18:00"}}, {"unexpected": True},
        ):
            with self.subTest(change=change), self.assertRaises(ValueError):
                validate_planned_return(self.config() | change, [])

    def test_multiple_occupancy_sources_and_legacy_migration(self):
        sources = ["zone.home", "input_boolean.guest", "group.family", "binary_sensor.home"]
        result = validate_planned_return(self.config() | {"occupancy_entity_ids": sources}, [])
        self.assertEqual(result["occupancy_entity_ids"], sources)
        legacy = {key: value for key, value in self.config().items() if key != "occupancy_entity_ids"}
        legacy["occupancy_entity_id"] = "binary_sensor.home"
        migrated = validate_planned_return(legacy, [])
        self.assertEqual(migrated["occupancy_entity_ids"], ["binary_sensor.home"])
        self.assertNotIn("occupancy_entity_id", migrated)
        for invalid in (["zone.office"], ["zone.home", "zone.home"], [42], "zone.home", []):
            with self.subTest(sources=invalid), self.assertRaises(ValueError):
                validate_planned_return(self.config() | {"occupancy_entity_ids": invalid}, [])

    def test_manual_armed_episode_survives_disabled_automation(self):
        config = self.config() | {"enabled": False}
        episode = {"state": "armed", "origin": "manual", "started_at": "2026-10-06T08:00:00+02:00",
                   "return_at": "2026-10-06T18:00:00+02:00", "away_mode_id": "default",
                   "destination_mode_id": "default", "preparing_entities": []}
        data = normalize_schedule_data({"planned_return": config, "planned_return_episode": episode}, [])
        self.assertEqual(data["planned_return_episode"], episode)
        for change in ({"origin": "automatic"}, {"origin": "invalid"}, {"return_at": None}):
            with self.subTest(change=change):
                self.assertIsNone(normalize_schedule_data({"planned_return": config, "planned_return_episode": episode | change}, [])["planned_return_episode"])
        config["occupancy_entity_ids"] = []
        self.assertIsNone(normalize_schedule_data({"planned_return": config, "planned_return_episode": episode}, [])["planned_return_episode"])

    def test_terminal_episode_survives_disabled_restart_and_source_removal(self):
        for state in ("fulfilled", "cancelled", "skipped"):
            for origin in ("automatic", "manual"):
                with self.subTest(state=state, origin=origin):
                    config = self.config() | {"enabled": False, "occupancy_entity_ids": []}
                    episode = {"state": state, "origin": origin,
                               "started_at": "2026-10-06T08:00:00+02:00",
                               "return_at": "2026-10-06T18:00:00+02:00",
                               "away_mode_id": "default", "destination_mode_id": "default",
                               "preparing_entities": []}
                    data = normalize_schedule_data({"planned_return": config, "planned_return_episode": episode}, [])
                    recovered = normalize_schedule_data(serialize_schedule_data(data), [])
                    self.assertEqual(recovered["planned_return_episode"], episode)
                    restored = serialize_schedule_data(recovered)
                    restored["planned_return"] = self.config()
                    self.assertEqual(normalize_schedule_data(restored, [])["planned_return_episode"], episode)

    def test_sensorless_manual_away_episode_survives_storage_roundtrip(self):
        config = default_planned_return()
        episode = {'state': 'away', 'origin': 'manual', 'started_at': helpers.NOW.isoformat(),
                   'departure_at': helpers.NOW.isoformat(), 'return_at': '2026-05-22T18:00:00+00:00',
                   'away_mode_id': 'default', 'destination_mode_id': 'default',
                   'preparing_entities': ['climate.home']}
        data = normalize_schedule_data({'planned_return': config, 'planned_return_episode': episode}, ['climate.home'])
        restored = normalize_schedule_data(serialize_schedule_data(data), ['climate.home'])
        self.assertEqual(restored['planned_return_episode'], episode)
        self.assertFalse(restored['planned_return']['enabled'])

    def test_dismissal_flag_only_retained_for_terminal_and_strict_true(self):
        episode = {"state": "cancelled", "origin": "manual",
                   "started_at": "2026-10-06T08:00:00+02:00", "return_at": "2026-10-06T18:00:00+02:00",
                   "away_mode_id": "default", "destination_mode_id": "default", "preparing_entities": []}
        for state in ('cancelled', 'armed', 'away', 'fulfilled', 'skipped'):
            for flag in (True, False, None, 'true', 1, {}, []):
                with self.subTest(state=state, flag=flag):
                    raw = episode | {'state': state, 'dismissed': flag}
                    data = normalize_schedule_data({'planned_return': self.config(), 'planned_return_episode': raw}, [])
                    recovered = normalize_schedule_data(serialize_schedule_data(data), [])['planned_return_episode']
                    expected = episode | {'state': state}
                    if state in ('cancelled', 'fulfilled', 'skipped') and flag is True:
                        expected['dismissed'] = True
                    self.assertEqual(recovered, expected)

    def test_active_automatic_episode_does_not_survive_disabled_restart(self):
        episode = {"state": "away", "origin": "automatic", "started_at": "2026-10-06T08:00:00+02:00",
                   "return_at": "2026-10-06T18:00:00+02:00", "away_mode_id": "default",
                   "destination_mode_id": "default", "preparing_entities": []}
        config = self.config() | {"enabled": False}
        self.assertIsNone(normalize_schedule_data({"planned_return": config, "planned_return_episode": episode}, [])["planned_return_episode"])

    def test_old_portable_single_source_import_migrates_without_activation(self):
        data = normalize_schedule_data({}, [])
        runtime = {"storage": SimpleNamespace(data=data, effective_temperature_unit="°C")}
        legacy = {key: value for key, value in self.config().items() if key != "occupancy_entity_ids"}
        legacy["occupancy_entity_id"] = "group.family"
        payload = {"format": api.EXPORT_FORMAT, "model_version": 15, "sections": {"planned_return": legacy}}
        imported = api._build_import_data(runtime, payload, ["planned_return"])
        self.assertEqual(imported["planned_return"]["occupancy_entity_ids"], ["group.family"])
        self.assertFalse(imported["planned_return"]["enabled"])


    def test_fulfilled_episode_survives_round_trip(self):
        episode = {"state": "fulfilled", "started_at": "2026-10-06T08:00:00+02:00",
                   "return_at": "2026-10-06T18:00:00+02:00", "away_mode_id": "default",
                   "destination_mode_id": "default", "preparing_entities": []}
        data = normalize_schedule_data({"planned_return": self.config(), "planned_return_episode": episode}, [])
        self.assertEqual(serialize_schedule_data(data)["planned_return_episode"], episode | {"origin": "automatic"})
        del episode["return_at"]
        recovered = normalize_schedule_data({"planned_return": self.config(), "planned_return_episode": episode}, [])
        self.assertIsNone(recovered["planned_return_episode"]["return_at"])
        episode["started_at"] = "2026-10-06T08:00:00"
        self.assertIsNone(normalize_schedule_data({"planned_return": self.config(), "planned_return_episode": episode}, [])["planned_return_episode"])

    def test_export_excludes_episode_import_does_not_activate(self):
        data = normalize_schedule_data({"planned_return": self.config()}, [])
        data["planned_return_episode"] = {"state": "fulfilled"}
        runtime = {"storage": SimpleNamespace(data=data, effective_temperature_unit="°C"),
                   "entry": SimpleNamespace(options={}, data={})}
        payload = api._build_export_payload(runtime, ["planned_return"])
        self.assertEqual(set(payload["sections"]), {"planned_return"})
        imported = api._build_import_data(runtime, payload, ["planned_return"])
        self.assertFalse(imported["planned_return"]["enabled"])
        self.assertNotIn("planned_return_episode", imported)

    def test_import_validates_resulting_mode_references(self):
        data = normalize_schedule_data({}, [])
        runtime = {"storage": SimpleNamespace(data=data, effective_temperature_unit="°C")}
        payload = {"format": api.EXPORT_FORMAT, "model_version": api.EXPORT_MODEL_VERSION,
                   "sections": {"planned_return": self.config() | {"destination_mode_id": "missing"}}}
        with self.assertRaisesRegex(ValueError, "unknown mode"):
            api._build_import_data(runtime, payload, ["planned_return"])


    def test_import_modes_cannot_leave_retained_routine_dangling(self):
        profile = {"key": "home_profile", "name": "Home", "zones": {}}
        mode = {"key": "home_mode", "name": "Home", "profile_ids": ["home_profile"]}
        data = normalize_schedule_data({"profiles": [profile], "modes": [mode],
                                       "planned_return": self.config() | {"destination_mode_id": "home_mode"}}, [])
        runtime = {"storage": SimpleNamespace(data=data, effective_temperature_unit="°C")}
        payload = {"format": api.EXPORT_FORMAT, "model_version": api.EXPORT_MODEL_VERSION,
                   "sections": {"modes": []}}
        with self.assertRaisesRegex(ValueError, "unknown mode"):
            api._build_import_data(runtime, payload, ["modes"])

    def test_import_resolves_routine_against_imported_modes(self):
        profile = {"key": "home_profile", "name": "Home", "zones": {}}
        mode = {"key": "home_mode", "name": "Home", "profile_ids": ["home_profile"]}
        data = normalize_schedule_data({}, [])
        runtime = {"storage": SimpleNamespace(data=data, effective_temperature_unit="°C")}
        payload = {"format": api.EXPORT_FORMAT, "model_version": api.EXPORT_MODEL_VERSION,
                   "sections": {"profiles": [profile], "modes": [mode],
                                "planned_return": self.config() | {"destination_mode_id": "home_mode"}}}
        imported = api._build_import_data(runtime, payload, ["profiles", "modes", "planned_return"])
        self.assertEqual(imported["planned_return"]["destination_mode_id"], "home_mode")
        self.assertFalse(imported["planned_return"]["enabled"])


class PlannedReturnApiTest(unittest.IsolatedAsyncioTestCase):
    async def test_explicit_immediate_away_option_reaches_scheduler(self):
        for flag in (False, True):
            with self.subTest(flag=flag):
                scheduler = SimpleNamespace(async_start_planned_return=AsyncMock())
                runtime = {'scheduler': scheduler, 'storage': SimpleNamespace(
                    temperature_migration_required=False,
                    data={'planned_return': default_planned_return(), 'modes': []})}
                connection = SimpleNamespace(user=SimpleNamespace(is_admin=True), send_error=Mock(), send_result=Mock())
                arrival = '2026-10-06T18:00:00+02:00'
                with patch.object(api, '_get_runtime', return_value=runtime), patch.object(api, '_build_schedule_response', return_value={}):
                    await api.ws_start_planned_return(SimpleNamespace(states={}), connection,
                        {'id': 1, 'return_at': arrival, 'apply_away_now': flag})
                scheduler.async_start_planned_return.assert_awaited_once_with(arrival, apply_away_now=flag)

    async def test_existing_cancel_command_dismisses_cancelled_with_no_sources_and_stopped_scheduler(self):
        episode = {"state": "cancelled", "origin": "manual", "started_at": helpers.NOW.isoformat(),
                   "return_at": None, "away_mode_id": "default", "destination_mode_id": "default", "preparing_entities": []}
        data = normalize_schedule_data({'planned_return_episode': episode}, [])
        scheduler = helpers.VelairScheduler(helpers.FakeHass(), data, helpers.FakeClimateManager(), AsyncMock())
        scheduler._stopped = True
        runtime = {'scheduler': scheduler, 'storage': SimpleNamespace(temperature_migration_required=False, data=data)}
        connection = SimpleNamespace(user=SimpleNamespace(is_admin=True), send_error=Mock(), send_result=Mock())
        try:
            with patch.object(api, '_get_runtime', return_value=runtime), patch.object(api, '_build_schedule_response', side_effect=lambda _: scheduler.get_planned_return_status()):
                await api.ws_cancel_planned_return(None, connection, {'id': 1})
            connection.send_error.assert_not_called()
            status = connection.send_result.call_args.args[1]
            self.assertTrue(status['dismissed'])
            self.assertFalse(status['can_dismiss'])
            self.assertEqual(data['planned_return_episode'], episode | {'dismissed': True})
        finally:
            await scheduler.async_stop()

    async def test_commands_route_authorized_calls(self):
        for handler, method, extra, args in (
            (api.ws_update_planned_return, "async_update_planned_return", {"planned_return": {}}, ({},)),
            (api.ws_adjust_planned_return, "async_adjust_planned_return", {"return_at": "2026-10-06T18:00:00+02:00"}, ("2026-10-06T18:00:00+02:00",)),
            (api.ws_skip_planned_return, "async_skip_planned_return", {}, ()),
            (api.ws_arrive_planned_return, "async_arrive_planned_return", {}, ()),
            (api.ws_start_planned_return, "async_start_planned_return", {"return_at": "2026-10-06T18:00:00+02:00"}, ("2026-10-06T18:00:00+02:00",)),
            (api.ws_cancel_planned_return, "async_cancel_planned_return", {}, ()),
        ):
            scheduler = SimpleNamespace(**{method: AsyncMock()})
            runtime = {"scheduler": scheduler, "storage": SimpleNamespace(temperature_migration_required=False, data={"planned_return": default_planned_return() | {"occupancy_entity_ids": ["zone.home"]}, "modes": []})}
            connection = SimpleNamespace(user=SimpleNamespace(is_admin=True), send_error=Mock(), send_result=Mock())
            with patch.object(api, "_get_runtime", return_value=runtime), patch.object(api, "_build_schedule_response", return_value={"saved": True}):
                await handler(SimpleNamespace(states=SimpleNamespace(get=lambda _: SimpleNamespace(state="0"))), connection, {"id": 1, **extra})
            getattr(scheduler, method).assert_awaited_once_with(*args)
            connection.send_result.assert_called_once_with(1, {"saved": True})

    async def test_denies_non_admin_without_mutating(self):
        for handler, extra in (
            (api.ws_skip_planned_return, {}),
            (api.ws_start_planned_return, {"return_at": "2026-10-06T18:00:00+02:00"}),
            (api.ws_cancel_planned_return, {}),
        ):
            connection = SimpleNamespace(user=SimpleNamespace(is_admin=False), send_error=Mock())
            with patch.object(api, "_get_runtime") as runtime:
                await handler(None, connection, {"id": 1, **extra})
            runtime.assert_not_called()
            self.assertEqual(connection.send_error.call_args.args[1], "unauthorized")

    async def test_validation_failure_is_reported(self):
        runtime = {"scheduler": SimpleNamespace(async_adjust_planned_return=AsyncMock(side_effect=ValueError("same-day timestamp required"))),
                   "storage": SimpleNamespace(temperature_migration_required=False)}
        connection = SimpleNamespace(user=SimpleNamespace(is_admin=True), send_error=Mock(), send_result=Mock())
        with patch.object(api, "_get_runtime", return_value=runtime):
            await api.ws_adjust_planned_return(None, connection, {"id": 1, "return_at": "invalid"})
        connection.send_error.assert_called_once_with(1, "invalid_planned_return", "same-day timestamp required")
        connection.send_result.assert_not_called()

    async def test_cancel_bypasses_temperature_migration_but_not_exclusive_operation(self):
        scheduler = SimpleNamespace(async_cancel_planned_return=AsyncMock())
        runtime = {'scheduler': scheduler, 'storage': SimpleNamespace(temperature_migration_required=True)}
        connection = SimpleNamespace(user=SimpleNamespace(is_admin=True), send_error=Mock(), send_result=Mock())
        with patch.object(api, '_get_runtime', return_value=runtime), patch.object(api, '_build_schedule_response', return_value={'saved': True}):
            await api.ws_cancel_planned_return(None, connection, {'id': 1})
            scheduler.async_cancel_planned_return.assert_awaited_once_with()
            for gate in ('operation_active', 'operation_recovery'):
                runtime[gate] = 'portable_import'
                scheduler.async_cancel_planned_return.reset_mock()
                await api.ws_cancel_planned_return(None, connection, {'id': 1})
                scheduler.async_cancel_planned_return.assert_not_awaited()
                runtime.pop(gate)


    async def test_start_rejects_missing_live_saved_sources(self):
        for sources in (["zone.home"], ["binary_sensor.missing"]):
            scheduler = SimpleNamespace(async_start_planned_return=AsyncMock())
            runtime = {"scheduler": scheduler, "storage": SimpleNamespace(temperature_migration_required=False,
                       data={"planned_return": default_planned_return() | {"occupancy_entity_ids": sources}, "modes": []})}
            connection = SimpleNamespace(user=SimpleNamespace(is_admin=True), send_error=Mock(), send_result=Mock())
            hass = SimpleNamespace(states=SimpleNamespace(get=lambda _: None))
            with patch.object(api, "_get_runtime", return_value=runtime):
                await api.ws_start_planned_return(hass, connection, {"id": 1, "return_at": "2026-10-06T18:00:00+02:00"})
            scheduler.async_start_planned_return.assert_not_awaited()
            self.assertEqual(connection.send_error.call_args.args[1], "invalid_planned_return")

    async def test_start_accepts_empty_saved_sources(self):
        scheduler = SimpleNamespace(async_start_planned_return=AsyncMock())
        runtime = {'scheduler': scheduler, 'storage': SimpleNamespace(
            temperature_migration_required=False,
            data={'planned_return': default_planned_return(), 'modes': []})}
        connection = SimpleNamespace(user=SimpleNamespace(is_admin=True), send_error=Mock(), send_result=Mock())
        hass = SimpleNamespace(states=SimpleNamespace(get=Mock(return_value=None)))
        arrival = '2026-10-06T18:00:00+02:00'
        with patch.object(api, '_get_runtime', return_value=runtime), patch.object(api, '_build_schedule_response', return_value={'saved': True}):
            await api.ws_start_planned_return(hass, connection, {'id': 1, 'return_at': arrival})
        scheduler.async_start_planned_return.assert_awaited_once_with(arrival)
        hass.states.get.assert_not_called()
        connection.send_error.assert_not_called()
        connection.send_result.assert_called_once_with(1, {'saved': True})

    async def test_weekly_config_rejects_empty_sources(self):
        scheduler = SimpleNamespace(async_update_planned_return=AsyncMock())
        runtime = {'scheduler': scheduler, 'storage': SimpleNamespace(temperature_migration_required=False, data={'modes': []})}
        connection = SimpleNamespace(user=SimpleNamespace(is_admin=True), send_error=Mock(), send_result=Mock())
        with patch.object(api, '_get_runtime', return_value=runtime):
            await api.ws_update_planned_return(None, connection, {'id': 1, 'planned_return': default_planned_return() | {'enabled': True}})
        scheduler.async_update_planned_return.assert_not_awaited()
        self.assertEqual(connection.send_error.call_args.args[1], 'invalid_planned_return')

    async def test_enabled_config_rejects_missing_live_source(self):
        scheduler = SimpleNamespace(async_update_planned_return=AsyncMock())
        runtime = {"scheduler": scheduler, "storage": SimpleNamespace(temperature_migration_required=False, data={"modes": []})}
        connection = SimpleNamespace(user=SimpleNamespace(is_admin=True), send_error=Mock(), send_result=Mock())
        config = default_planned_return() | {"enabled": True, "occupancy_entity_ids": ["zone.home", "input_boolean.guest"]}
        hass = SimpleNamespace(states=SimpleNamespace(get=lambda entity: SimpleNamespace(state="0") if entity == "zone.home" else None))
        with patch.object(api, "_get_runtime", return_value=runtime):
            await api.ws_update_planned_return(hass, connection, {"id": 1, "planned_return": config})
        scheduler.async_update_planned_return.assert_not_awaited()
        self.assertEqual(connection.send_error.call_args.args[1], "invalid_planned_return")
