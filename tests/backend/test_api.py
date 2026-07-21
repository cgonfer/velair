"""WebSocket API serialization tests."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import importlib
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock

from . import helpers


api_module = importlib.import_module("custom_components.velair.api")


class ClimateProfileApiTest(unittest.IsolatedAsyncioTestCase):
    """Verify the WebSocket boundary for profile lifecycle operations."""

    def setUp(self) -> None:
        self.scheduler = SimpleNamespace(
            async_set_profile=AsyncMock(return_value="away"),
            async_delete_profile=AsyncMock(),
            async_activate_profile=AsyncMock(),
        )
        self.runtime = {
            "scheduler": self.scheduler,
            "storage": SimpleNamespace(temperature_migration_required=False),
            "operation_active": None,
            "operation_recovery": None,
        }
        self.connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        original_get_runtime = api_module._get_runtime
        original_build_response = api_module._build_schedule_response
        api_module._get_runtime = lambda _hass: self.runtime
        api_module._build_schedule_response = lambda _runtime: {"profiles": []}
        self.addCleanup(setattr, api_module, "_get_runtime", original_get_runtime)
        self.addCleanup(
            setattr,
            api_module,
            "_build_schedule_response",
            original_build_response,
        )

    async def test_profile_handlers_forward_payloads_and_return_schedule_state(self) -> None:
        await api_module.ws_set_profile(
            SimpleNamespace(),
            self.connection,
            {"id": 1, "type": "velair/set_profile", "profile": {"name": "Away"}},
        )
        self.scheduler.async_set_profile.assert_awaited_once_with({"name": "Away"})
        self.connection.send_result.assert_called_with(
            1,
            {"profiles": [], "profile_id": "away"},
        )

        await api_module.ws_activate_profile(
            SimpleNamespace(),
            self.connection,
            {"id": 2, "type": "velair/activate_profile"},
        )
        self.scheduler.async_activate_profile.assert_awaited_once_with(None)
        self.connection.send_result.assert_called_with(2, {"profiles": []})

        await api_module.ws_delete_profile(
            SimpleNamespace(),
            self.connection,
            {"id": 3, "type": "velair/delete_profile", "key": "away"},
        )
        self.scheduler.async_delete_profile.assert_awaited_once_with("away")
        self.connection.send_result.assert_called_with(3, {"profiles": []})
        self.connection.send_error.assert_not_called()

    async def test_profile_handlers_map_validation_and_migration_errors(self) -> None:
        self.scheduler.async_activate_profile.side_effect = ValueError("unknown")
        await api_module.ws_activate_profile(
            SimpleNamespace(),
            self.connection,
            {
                "id": 4,
                "type": "velair/activate_profile",
                "profile_id": "missing",
            },
        )
        self.connection.send_error.assert_called_once_with(
            4,
            "invalid_profile",
            "unknown",
        )

        self.connection.send_error.reset_mock()
        self.runtime["storage"].temperature_migration_required = True
        await api_module.ws_set_profile(
            SimpleNamespace(),
            self.connection,
            {"id": 5, "type": "velair/set_profile", "profile": {"name": "Away"}},
        )
        self.connection.send_error.assert_called_once_with(
            5,
            "temperature_migration_required",
            "The Velair scheduler is stopped until the existing temperature unit is confirmed",
        )
        self.scheduler.async_set_profile.assert_not_awaited()

        self.connection.send_error.reset_mock()
        self.runtime["storage"].temperature_migration_required = False
        self.scheduler.async_set_profile.side_effect = ValueError("invalid profile data")
        await api_module.ws_set_profile(
            SimpleNamespace(),
            self.connection,
            {"id": 6, "type": "velair/set_profile", "profile": {"name": "Away"}},
        )
        self.connection.send_error.assert_called_once_with(
            6,
            "invalid_profile",
            "invalid profile data",
        )


class ClimateProfileImportValidationTest(unittest.TestCase):
    """Reject malformed profiles before portable temperature conversion."""

    def test_import_rejects_duplicate_keys_and_null_temperatures(self) -> None:
        data = helpers.normalize_schedule_data(None, ["climate.salon"])
        runtime = {
            "storage": SimpleNamespace(
                data=data,
                effective_temperature_unit=api_module.CELSIUS,
            )
        }
        schedule = {weekday: [] for weekday in api_module.WEEKDAYS}
        schedule["tuesday"] = [
            {
                "start": "17:00",
                "action": "set_temperature",
                "temperature": 18,
                "hvac_mode": "heat",
            }
        ]
        profile = {
            "key": "away",
            "name": "Away",
            "zones": {
                "climate.salon": {
                    "behavior": "schedule",
                    "schedule": schedule,
                }
            },
        }

        payload = {
            "format": api_module.EXPORT_FORMAT,
            "model_version": api_module.EXPORT_MODEL_VERSION,
            "temperature_unit": api_module.CELSIUS,
            "sections": {"profiles": [profile, deepcopy(profile)]},
        }
        with self.assertRaisesRegex(ValueError, "Duplicate climate profile key"):
            api_module._build_import_data(runtime, payload, ["profiles"])

        payload["sections"]["profiles"] = [profile]
        profile["zones"]["climate.salon"]["schedule"]["tuesday"][0][
            "temperature"
        ] = None
        with self.assertRaisesRegex(ValueError, "finite number"):
            api_module._build_import_data(runtime, payload, ["profiles"])


class ResetDataOrderingTest(unittest.IsolatedAsyncioTestCase):
    """Verify reset publishes no side effects before durable storage."""

    async def test_failed_store_does_not_change_options_or_clear_runtime(self) -> None:
        storage = SimpleNamespace(
            temperature_migration_required=False,
            async_reset_to_defaults=AsyncMock(side_effect=OSError("storage unavailable")),
        )
        scheduler = SimpleNamespace(async_prepare_data_reset=AsyncMock())
        entry = SimpleNamespace(options={"apply_active_schedule_on_startup": True})
        runtime = {"entry": entry, "scheduler": scheduler, "storage": storage}
        original_get_runtime = api_module._get_runtime
        api_module._get_runtime = lambda _hass: runtime
        self.addCleanup(setattr, api_module, "_get_runtime", original_get_runtime)
        update_entry = Mock()
        hass = SimpleNamespace(config_entries=SimpleNamespace(async_update_entry=update_entry))

        with self.assertRaisesRegex(OSError, "storage unavailable"):
            await api_module.ws_reset_data(
                hass,
                SimpleNamespace(),
                {"id": 1, "type": "velair/reset_data", "confirmation": "reset"},
            )

        storage.async_reset_to_defaults.assert_awaited_once_with()
        update_entry.assert_not_called()
        scheduler.async_prepare_data_reset.assert_not_awaited()

    async def test_post_persist_reset_failure_stays_blocked_and_visible(self) -> None:
        storage = SimpleNamespace(
            temperature_migration_required=False,
            effective_temperature_unit=api_module.CELSIUS,
            async_reset_to_defaults=AsyncMock(),
        )
        scheduler = SimpleNamespace(
            async_prepare_data_reset=AsyncMock(),
            set_temperature_migration_blocked=Mock(),
        )
        entry = SimpleNamespace(options={})
        runtime = {
            "entry": entry,
            "scheduler": scheduler,
            "storage": storage,
            "operation_active": None,
            "operation_recovery": None,
        }
        original_get_runtime = api_module._get_runtime
        api_module._get_runtime = lambda _hass: runtime
        self.addCleanup(setattr, api_module, "_get_runtime", original_get_runtime)
        update_entry = Mock(side_effect=RuntimeError("options unavailable"))
        hass = SimpleNamespace(config_entries=SimpleNamespace(async_update_entry=update_entry))
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())

        await api_module.ws_reset_data(
            hass,
            connection,
            {"id": 2, "type": "velair/reset_data", "confirmation": "reset"},
        )

        storage.async_reset_to_defaults.assert_awaited_once_with()
        scheduler.async_prepare_data_reset.assert_not_awaited()
        self.assertIsNone(runtime["operation_active"])
        self.assertEqual(runtime["operation_recovery"]["operation"], "data_reset")
        scheduler.set_temperature_migration_blocked.assert_called_with(True)
        connection.send_result.assert_not_called()
        self.assertEqual(
            connection.send_error.call_args.args[1], "operation_recovery_required"
        )


class TemperatureMigrationFailureTest(unittest.IsolatedAsyncioTestCase):
    """Verify failed persistence always releases the exclusive operation guard."""

    async def test_store_error_releases_operation_and_keeps_scheduler_blocked(self) -> None:
        storage = SimpleNamespace(
            temperature_migration_required=True,
            home_assistant_temperature_unit=api_module.FAHRENHEIT,
            async_resolve_temperature_migration=AsyncMock(
                side_effect=OSError("storage unavailable")
            ),
        )
        scheduler = SimpleNamespace(set_temperature_migration_blocked=Mock())
        runtime = {
            "entry": SimpleNamespace(entry_id="entry"),
            "scheduler": scheduler,
            "storage": storage,
            "operation_active": None,
            "operation_recovery": None,
        }
        original_get_runtime = api_module._get_runtime
        api_module._get_runtime = lambda _hass: runtime
        self.addCleanup(setattr, api_module, "_get_runtime", original_get_runtime)
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())

        await api_module.ws_resolve_temperature_migration(
            SimpleNamespace(),
            connection,
            {
                "id": 3,
                "type": "velair/resolve_temperature_migration",
                "source_unit": api_module.CELSIUS,
                "migration_id": "migration",
                "expected_revision": 1,
            },
        )

        self.assertIsNone(runtime["operation_active"])
        scheduler.set_temperature_migration_blocked.assert_called_with(True)
        connection.send_result.assert_not_called()
        connection.send_error.assert_called_once_with(
            3, "temperature_migration_failed", "storage unavailable"
        )


class PortableTemperatureContractTest(unittest.TestCase):
    """Verify portable files remain recoverable across unit systems."""

    def _runtime(self, unit: str, *, step: float | None = 1):
        data = helpers.normalize_schedule_data(None, ["climate.salon"])
        attributes = {
            "min_temp": 41,
            "max_temp": 86,
        }
        if step is not None:
            attributes["target_temp_step"] = step
        hass = SimpleNamespace(
            states={
                "climate.salon": SimpleNamespace(
                    attributes=attributes
                )
            }
        )
        return {
            "storage": SimpleNamespace(
                data=data,
                effective_temperature_unit=unit,
                _hass=hass,
            ),
        }

    def test_legacy_payload_without_unit_defaults_to_celsius_and_converts(self) -> None:
        payload = {
            "format": api_module.EXPORT_FORMAT,
            "model_version": 1,
            "sections": {
                "zones": {
                    "climate.salon": {
                        "schedule": {
                            "monday": [{"start": "08:00", "temperature": 20}]
                        }
                    }
                }
            },
        }

        imported = api_module._build_import_data(
            self._runtime(api_module.FAHRENHEIT), payload, ["zones"]
        )

        self.assertEqual(
            imported["zones"]["climate.salon"]["schedule"]["monday"][0][
                "temperature"
            ],
            68,
        )
        self.assertEqual(
            imported["zones"]["climate.salon"]["comfort"]["temperature_min"],
            68,
        )

    def test_cross_unit_import_does_not_convert_unselected_local_zones(self) -> None:
        runtime = self._runtime(api_module.FAHRENHEIT)
        runtime["storage"].data = helpers.normalize_schedule_data(
            None, ["climate.salon", "climate.bedroom"]
        )
        runtime["storage"].data["zones"]["climate.bedroom"]["schedule"]["monday"] = [
            {"start": "08:00", "temperature": 72, "action": "set_temperature"}
        ]
        payload = {
            "format": api_module.EXPORT_FORMAT,
            "model_version": 3,
            "temperature_unit": api_module.CELSIUS,
            "sections": {
                "zones": {
                    "climate.salon": {
                        "schedule": {
                            "monday": [{"start": "08:00", "temperature": 20}]
                        }
                    }
                }
            },
        }

        imported = api_module._build_import_data(runtime, payload, ["zones"])

        self.assertEqual(
            imported["zones"]["climate.bedroom"]["schedule"]["monday"][0][
                "temperature"
            ],
            72,
        )

    def test_legacy_unitless_import_rounds_to_tenth_without_climate_step(self) -> None:
        payload = {
            "format": api_module.EXPORT_FORMAT,
            "model_version": 1,
            "sections": {
                "zones": {
                    "climate.salon": {
                        "schedule": {
                            "monday": [{"start": "08:00", "temperature": 20.3}]
                        }
                    }
                }
            },
        }

        imported = api_module._build_import_data(
            self._runtime(api_module.FAHRENHEIT, step=None), payload, ["zones"]
        )

        self.assertEqual(
            imported["zones"]["climate.salon"]["schedule"]["monday"][0][
                "temperature"
            ],
            68.5,
        )

    def test_export_remains_available_while_temperature_migration_is_blocked(self) -> None:
        data = helpers.normalize_schedule_data(None, ["climate.salon"])
        runtime = {
            "entry": SimpleNamespace(data={}, options={}),
            "storage": SimpleNamespace(
                data=data,
                effective_temperature_unit=api_module.CELSIUS,
                temperature_migration_required=True,
                raw_data=lambda: helpers.models_module.serialize_schedule_data(data),
            ),
        }
        original_get_runtime = api_module._get_runtime
        api_module._get_runtime = lambda _hass: runtime
        self.addCleanup(setattr, api_module, "_get_runtime", original_get_runtime)
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())

        api_module.ws_export_data(
            SimpleNamespace(),
            connection,
            {"id": 9, "type": "velair/export_data", "sections": ["zones"]},
        )

        connection.send_error.assert_not_called()
        connection.send_result.assert_called_once()

    def test_export_is_rejected_only_while_an_operation_is_writing(self) -> None:
        runtime = {"operation_active": "data_reset"}
        original_get_runtime = api_module._get_runtime
        api_module._get_runtime = lambda _hass: runtime
        self.addCleanup(setattr, api_module, "_get_runtime", original_get_runtime)
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())

        api_module.ws_export_data(
            SimpleNamespace(),
            connection,
            {"id": 10, "type": "velair/export_data", "sections": ["zones"]},
        )

        connection.send_result.assert_not_called()
        connection.send_error.assert_called_once_with(
            10,
            "operation_in_progress",
            "Another Velair data operation is in progress",
        )


class FakeClimateCapabilities:
    """Return configurable HVAC modes for API tests."""

    def __init__(self, modes: list[str]) -> None:
        self._modes = modes

    def supported_hvac_modes(self, entity_id: str) -> list[str]:
        return list(self._modes)


def _sample(
    mode: str,
    quality: str,
    *,
    reached: bool | None = None,
    minutes: int | None = None,
) -> dict[str, object]:
    """Return one stored preconditioning sample."""
    reached_value = reached if reached is not None else quality == "complete"
    return {
        "entity_id": "climate.salon",
        "mode": mode,
        "created_at": "2026-05-19T19:00:00+00:00",
        "scheduled_time": "2026-05-19T20:00:00+00:00",
        "start_time": "2026-05-19T18:00:00+00:00",
        "target_temp": 21.0,
        "initial_temp": 19.0,
        "delta_t": 2.0,
        "startup_minutes": minutes or 60,
        "reached": reached_value,
        "minutes_to_reach": minutes if reached_value else None,
        "quality": quality,
    }


def _learning(
    samples: list[dict[str, object]],
) -> dict[str, dict[str, list[dict[str, object]]]]:
    """Return stored learning data split by preconditioning direction."""
    return {
        "heat": {
            "observations": [
                sample for sample in samples if sample.get("mode") == "heat"
            ]
        },
        "cool": {
            "observations": [
                sample for sample in samples if sample.get("mode") == "cool"
            ]
        },
    }


class PreconditioningLearningResponseTest(unittest.TestCase):
    """Verify local adaptive preconditioning learning summaries."""

    def test_preconditioning_schema_accepts_short_room_sensor_assist_debounce(
        self,
    ) -> None:
        data = api_module.PRECONDITIONING_SCHEMA(
            {
                "room_sensor_assist_debounce_seconds": 10,
            }
        )

        self.assertEqual(data["room_sensor_assist_debounce_seconds"], 10)

    def test_learning_response_reports_history_model_when_ready(self) -> None:
        response = api_module._build_preconditioning_learning_response(
            {
                "zones": {
                    "climate.salon": {
                        "preconditioning": {
                            "enabled": True,
                            "max_lead_minutes": 180,
                            "minimum_delta_temperature": 0.3,
                        },
                    }
                },
                "preconditioning_learning": {
                    "climate.salon": _learning(
                        [
                            *[_sample("heat", "complete", minutes=minute) for minute in (40, 50, 60, 70, 80)],
                            _sample("heat", "partial", reached=False, minutes=90),
                            _sample("cool", "partial", reached=False),
                        ]
                    )
                },
            },
            FakeClimateCapabilities(["off", "heat", "cool"]),
        )

        heat = response["climate.salon"]["heat"]

        self.assertEqual(response["climate.salon"]["status"], "ready")
        self.assertEqual(heat["status"], "ready")
        self.assertEqual(heat["sample_count"], 5)
        self.assertEqual(heat["complete_sample_count"], 5)
        self.assertEqual(heat["partial_sample_count"], 1)
        self.assertEqual(heat["invalid_sample_count"], 0)
        self.assertEqual(heat["required_samples"], 5)
        self.assertEqual(heat["model_source"], "history")
        self.assertEqual(heat["effective_lead_source"], "history")
        self.assertIsNone(heat["effective_lead_minutes"])
        self.assertEqual(heat["last_quality"], "partial")
        self.assertEqual(response["climate.salon"]["cool"]["status"], "learning")

    def test_schedule_response_uses_entry_runtime_climate_manager(self) -> None:
        entity_id = "climate.salon"
        data = helpers.normalize_schedule_data(None, [entity_id])
        runtime = {
            "entry": SimpleNamespace(
                data={},
                options={},
                runtime_data=SimpleNamespace(
                    climate_manager=FakeClimateCapabilities(["off", "heat"])
                ),
            ),
            "scheduler": SimpleNamespace(
                next_event=None,
                next_events=[],
                get_active_overrides=lambda: {},
                get_operational_status=lambda: "idle",
                get_comfort_assessments=lambda: {
                    entity_id: {
                        "enabled": False,
                        "condition": "monitoring_off",
                        "air_quality": "not_monitored",
                        "data_quality": "unavailable",
                        "data_issues": [],
                    }
                },
                get_room_sensor_assist_statuses=lambda: {
                    entity_id: {"status": "not_configured"}
                },
                get_zone_runtime_statuses=lambda: {
                    entity_id: {
                        "state": "scheduled",
                        "room_temperature": 20.5,
                        "target_temperature": 21.0,
                        "applied_temperature": 21.5,
                        "hvac_mode": "heat",
                    }
                },
            ),
            "storage": SimpleNamespace(data=data),
        }

        response = api_module._build_schedule_response(runtime)

        self.assertEqual(
            response["preconditioning_learning"][entity_id]["cool"]["status"],
            "unsupported",
        )
        self.assertEqual(
            response["room_sensor_assist"][entity_id]["status"],
            "not_configured",
        )
        self.assertEqual(
            response["comfort"][entity_id]["condition"],
            "monitoring_off",
        )
        self.assertEqual(response["zone_runtime"][entity_id]["state"], "scheduled")
        self.assertEqual(response["zone_runtime"][entity_id]["applied_temperature"], 21.5)

    def test_schedule_response_serializes_next_events_by_zone_for_ui(self) -> None:
        data = helpers.normalize_schedule_data(None, ["climate.salon", "climate.bedroom"])
        runtime = {
            "entry": SimpleNamespace(data={}, options={}),
            "climate_manager": FakeClimateCapabilities(["off", "heat"]),
            "scheduler": SimpleNamespace(
                next_event=None,
                next_events=[
                    _event("climate.salon", datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc))
                ],
                calculate_next_events_by_zone=lambda now: [
                    _event(
                        "climate.salon",
                        datetime(2026, 5, 19, 18, 30, tzinfo=timezone.utc),
                        target_when=datetime(2026, 5, 19, 19, 0, tzinfo=timezone.utc),
                        preconditioning_diagnostics={
                            "complete_sample_count": 5,
                            "partial_sample_count": 1,
                            "invalid_sample_count": 0,
                            "similar_sample_count": 6,
                            "comfort_percentile": 80,
                            "complete_estimate_minutes": 30,
                            "partial_floor_minutes": 35,
                            "combined_estimate_minutes": 35,
                            "rounded_estimate_minutes": 35,
                            "final_lead_minutes": 30,
                        },
                    ),
                    _event("climate.bedroom", datetime(2026, 5, 19, 19, 0, tzinfo=timezone.utc)),
                ],
                get_active_overrides=lambda: {},
                get_operational_status=lambda: "scheduled",
                get_comfort_assessments=lambda: {},
                get_room_sensor_assist_statuses=lambda: {},
            ),
            "storage": SimpleNamespace(data=data),
        }

        response = api_module._build_schedule_response(runtime)

        self.assertEqual(
            [event["entity_id"] for event in response["next_events"]],
            ["climate.salon", "climate.bedroom"],
        )
        self.assertEqual(
            response["next_events"][0]["target_when"],
            "2026-05-19T19:00:00+00:00",
        )
        self.assertEqual(
            response["next_events"][0]["preconditioning_diagnostics"][
                "partial_floor_minutes"
            ],
            35,
        )

    def test_learning_response_reports_disabled_without_enabled_preconditioning(
        self,
    ) -> None:
        response = api_module._build_preconditioning_learning_response(
            {
                "zones": {
                    "climate.salon": {
                        "preconditioning": {
                            "enabled": False,
                        },
                    }
                },
                "preconditioning_learning": {},
            },
            FakeClimateCapabilities(["off", "heat"]),
        )

        self.assertEqual(response["climate.salon"]["status"], "disabled")
        self.assertEqual(response["climate.salon"]["total_samples"], 0)

    def test_learning_response_marks_unsupported_directions(self) -> None:
        response = api_module._build_preconditioning_learning_response(
            {
                "zones": {
                    "climate.salon": {
                        "preconditioning": {
                            "enabled": True,
                        },
                    }
                },
                "preconditioning_learning": {
                    "climate.salon": _learning(
                        [_sample("cool", "complete", minutes=30)]
                    )
                },
            },
            FakeClimateCapabilities(["off", "heat"]),
        )

        self.assertEqual(response["climate.salon"]["status"], "learning")
        self.assertEqual(response["climate.salon"]["heat"]["status"], "learning")
        self.assertEqual(response["climate.salon"]["cool"]["status"], "unsupported")
        self.assertEqual(
            response["climate.salon"]["cool"]["effective_lead_source"],
            "unsupported",
        )

    def test_learning_response_counts_invalid_samples_without_readiness(self) -> None:
        response = api_module._build_preconditioning_learning_response(
            {
                "zones": {
                    "climate.salon": {
                        "preconditioning": {
                            "enabled": True,
                        },
                    }
                },
                "preconditioning_learning": {
                    "climate.salon": _learning(
                        [
                            _sample("heat", "invalid", reached=False),
                            _sample("heat", "partial", reached=False),
                        ]
                    )
                },
            },
            FakeClimateCapabilities(["off", "heat"]),
        )

        heat = response["climate.salon"]["heat"]

        self.assertEqual(heat["status"], "learning")
        self.assertEqual(heat["sample_count"], 0)
        self.assertEqual(heat["invalid_sample_count"], 1)
        self.assertEqual(heat["partial_sample_count"], 1)
        self.assertEqual(heat["model_source"], "initial_model")

    def test_learning_response_reports_active_dynamic_comfort_percentile(self) -> None:
        response = api_module._build_preconditioning_learning_response(
            {
                "zones": {
                    "climate.salon": {
                        "preconditioning": {
                            "enabled": True,
                            "comfort_percentile": 80,
                            "adaptive_percentile_enabled": True,
                        },
                    }
                },
                "preconditioning_learning": {
                    "climate.salon": _learning(
                        [
                            *[
                                _sample("heat", "complete", minutes=minute)
                                for minute in (40, 50, 60, 70, 80)
                            ],
                            _sample("heat", "partial", reached=False, minutes=90),
                            _sample("heat", "partial", reached=False, minutes=95),
                        ]
                    )
                },
            },
            FakeClimateCapabilities(["off", "heat"]),
        )

        self.assertEqual(
            response["climate.salon"]["heat"]["comfort_percentile"],
            90,
        )


class PreconditioningLearningPortabilityTest(unittest.TestCase):
    """Verify safe portable learning export and import behavior."""

    def test_export_includes_only_managed_climates_with_samples(self) -> None:
        stored_data = helpers.normalize_schedule_data(
            None,
            ["climate.salon", "climate.bedroom"],
        )
        stored_data["preconditioning_learning"] = {
            "climate.salon": _learning([_sample("heat", "complete", minutes=45)]),
            "climate.bedroom": _learning([]),
            "climate.removed": _learning([_sample("cool", "complete", minutes=35)]),
        }

        exported = api_module._export_preconditioning_learning(stored_data)

        self.assertEqual(list(exported), ["climate.salon"])
        self.assertEqual(
            len(exported["climate.salon"]["heat"]["observations"]),
            1,
        )

    def test_import_uses_matching_entity_id_and_ignores_missing_climates(self) -> None:
        current = helpers.normalize_schedule_data(
            None,
            ["climate.salon", "climate.bedroom"],
        )["zones"]
        salon_sample = _sample("heat", "complete", minutes=45)
        salon_sample["entity_id"] = "climate.wrong"
        imported = api_module._normalize_import_preconditioning_learning(
            {
                "climate.salon": _learning([salon_sample]),
                "climate.removed": _learning(
                    [_sample("cool", "complete", minutes=35)]
                ),
            },
            current,
        )

        self.assertEqual(list(imported), ["climate.salon"])
        observation = imported["climate.salon"]["heat"]["observations"][0]
        self.assertEqual(observation["entity_id"], "climate.salon")

    def test_import_rejects_invalid_learning_section(self) -> None:
        current = helpers.normalize_schedule_data(None, ["climate.salon"])["zones"]

        with self.assertRaisesRegex(
            ValueError,
            "Preconditioning learning section is not valid",
        ):
            api_module._normalize_import_preconditioning_learning([], current)

    def test_import_ignores_empty_learning_instead_of_clearing_local_data(self) -> None:
        current = helpers.normalize_schedule_data(None, ["climate.salon"])["zones"]

        imported = api_module._normalize_import_preconditioning_learning(
            {"climate.salon": _learning([])},
            current,
        )

        self.assertEqual(imported, {})

    def test_portable_payload_round_trip_exposes_learning_section(self) -> None:
        stored_data = helpers.normalize_schedule_data(None, ["climate.salon"])
        stored_data["preconditioning_learning"] = {
            "climate.salon": _learning(
                [_sample("heat", "complete", minutes=45)]
            ),
        }
        runtime = {
            "entry": SimpleNamespace(data={}, options={}),
            "storage": SimpleNamespace(data=stored_data),
        }

        payload = api_module._build_export_payload(
            runtime,
            ["preconditioning_learning"],
        )
        imported = api_module._build_import_data(
            runtime,
            payload,
            ["preconditioning_learning"],
        )

        self.assertEqual(
            list(payload["sections"]["preconditioning_learning"]),
            ["climate.salon"],
        )
        self.assertEqual(
            len(
                imported["preconditioning_learning"]["climate.salon"]["heat"][
                    "observations"
                ]
            ),
            1,
        )

    def test_export_zones_preserves_canonical_rate_above_runtime_limit(self) -> None:
        zones = {
            "climate.salon": {
                "enabled": True,
                "schedule": {},
                "preconditioning": {
                    "fallback_minutes_per_degree": 216.0,
                    "minimum_delta_temperature": 5.0,
                },
                "comfort": {
                    "temperature_min": 20.0,
                    "temperature_max": 24.0,
                },
            }
        }

        exported = api_module._export_zones(zones)

        self.assertEqual(
            exported["climate.salon"]["preconditioning"]["fallback_minutes_per_degree"],
            216.0,
        )
        self.assertEqual(
            exported["climate.salon"]["preconditioning"]["minimum_delta_temperature"],
            5.0,
        )


def _event(
    entity_id: str,
    when: datetime,
    *,
    target_when: datetime | None = None,
    preconditioning_diagnostics: dict | None = None,
):
    return SimpleNamespace(
        entity_id=entity_id,
        when=when,
        temperature=21.0,
        hvac_mode="heat",
        weekday="tuesday",
        start="19:00",
        action=helpers.ACTION_SET_TEMPERATURE,
        target_when=target_when,
        preconditioning_diagnostics=preconditioning_diagnostics,
    )


if __name__ == "__main__":
    unittest.main()
