"""WebSocket API serialization tests."""

from __future__ import annotations

from datetime import datetime, timezone
import importlib
from types import SimpleNamespace
import unittest

from . import helpers


api_module = importlib.import_module("custom_components.velair.api")


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
            ),
            "storage": SimpleNamespace(data=data),
        }

        response = api_module._build_schedule_response(runtime)

        self.assertEqual(
            response["preconditioning_learning"][entity_id]["cool"]["status"],
            "unsupported",
        )

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
                    ),
                    _event("climate.bedroom", datetime(2026, 5, 19, 19, 0, tzinfo=timezone.utc)),
                ],
                get_active_overrides=lambda: {},
                get_operational_status=lambda: "scheduled",
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


def _event(
    entity_id: str,
    when: datetime,
    *,
    target_when: datetime | None = None,
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
    )


if __name__ == "__main__":
    unittest.main()
