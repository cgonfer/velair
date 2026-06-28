"""Storage model normalization tests."""

from __future__ import annotations

import unittest
from datetime import datetime

from .helpers import (
    ACTION_SET_TEMPERATURE,
    ACTION_TURN_OFF,
    DEFAULT_SCHEDULE_TEMPLATES_VERSION,
    MODE_AUTO,
    empty_week_schedule,
    normalize_schedule_blocks,
    normalize_schedule_data,
)
from custom_components.velair.models import (
    DEFAULT_PRECONDITIONING_MAX_LEAD_MINUTES,
    MIN_PRECONDITIONING_COMPLETE_SAMPLES,
    normalize_preconditioning_data,
    predict_preconditioning_lead,
)


def _preconditioning_observation(
    index: int,
    *,
    quality: str = "partial",
    mode: str = "heat",
    delta_t: float = 2,
    startup_minutes: int | None = None,
    minutes_to_reach: int | None = None,
    target_temp: float = 21,
    initial_temp: float | None = None,
    created_day: int = 19,
    created_at: str | None = None,
) -> dict[str, object]:
    """Return a valid stored preconditioning observation for tests."""
    if startup_minutes is None:
        startup_minutes = index
    if minutes_to_reach is None and quality == "complete":
        minutes_to_reach = startup_minutes
    if initial_temp is None:
        initial_temp = target_temp - delta_t if mode == "heat" else target_temp + delta_t
    observation: dict[str, object] = {
        "entity_id": "climate.salon",
        "mode": mode,
        "created_at": created_at
        or f"2026-05-{created_day:02d}T19:{index % 60:02d}:00+00:00",
        "scheduled_time": f"2026-05-{created_day:02d}T20:{index % 60:02d}:00+00:00",
        "start_time": f"2026-05-{created_day:02d}T18:{index % 60:02d}:00+00:00",
        "target_temp": target_temp,
        "initial_temp": initial_temp,
        "outdoor_temp_start": None,
        "outdoor_temp_target": None,
        "delta_t": delta_t,
        "startup_minutes": startup_minutes,
        "reached": quality == "complete",
        "minutes_to_reach": minutes_to_reach,
        "quality": quality,
    }
    return observation


def _documented_preconditioning_observations() -> list[dict[str, object]]:
    """Return the worked adaptive preconditioning example observations."""
    return [
        _preconditioning_observation(
            55,
            quality="complete",
            delta_t=2.0,
            created_day=19,
        ),
        _preconditioning_observation(
            65,
            quality="complete",
            delta_t=2.3,
            created_day=18,
        ),
        _preconditioning_observation(
            70,
            quality="partial",
            delta_t=2.1,
            created_day=17,
        ),
        _preconditioning_observation(
            50,
            quality="complete",
            delta_t=2.2,
            target_temp=20,
            created_day=15,
        ),
        _preconditioning_observation(
            95,
            quality="complete",
            delta_t=3.5,
            created_day=12,
        ),
        _preconditioning_observation(
            75,
            quality="complete",
            delta_t=2.0,
            target_temp=22,
            created_day=8,
        ),
        _preconditioning_observation(
            80,
            quality="partial",
            delta_t=2.2,
            created_at="2026-04-01T19:00:00+00:00",
        ),
        _preconditioning_observation(
            2,
            quality="invalid",
            delta_t=2.2,
            minutes_to_reach=2,
            created_day=19,
        ),
        _preconditioning_observation(
            45,
            quality="complete",
            delta_t=1.8,
            created_at="2026-04-30T19:00:00+00:00",
        ),
        _preconditioning_observation(
            100,
            quality="partial",
            delta_t=2.8,
            created_day=14,
        ),
    ]


def _preconditioning_learning(
    observations: list[dict[str, object]],
) -> dict[str, dict[str, list[dict[str, object]]]]:
    """Return stored learning data split by preconditioning direction."""
    return {
        "heat": {
            "observations": [
                observation
                for observation in observations
                if observation.get("mode") == "heat"
            ]
        },
        "cool": {
            "observations": [
                observation
                for observation in observations
                if observation.get("mode") == "cool"
            ]
        },
    }


class ScheduleBlockNormalizationTest(unittest.TestCase):
    """Verify storage-facing schedule block normalization."""

    def test_normalize_blocks_sorts_times_and_preserves_mode(self) -> None:
        blocks = normalize_schedule_blocks(
            [
                {
                    "start": "18:30",
                    "temperature": "19.5",
                    "hvac_mode": "heat",
                },
                {
                    "start": "6:05",
                    "temperature": 21,
                },
            ]
        )

        self.assertEqual(
            blocks,
            [
                {
                    "start": "06:05",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 21.0,
                },
                {
                    "start": "18:30",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 19.5,
                    "hvac_mode": "heat",
                },
            ],
        )

    def test_normalize_blocks_rejects_duplicate_start_times(self) -> None:
        with self.assertRaisesRegex(ValueError, "Duplicate schedule start time"):
            normalize_schedule_blocks(
                [
                    {
                        "start": "08:00",
                        "temperature": 20,
                    },
                    {
                        "start": "8:00",
                        "temperature": 21,
                    },
                ]
            )

    def test_normalize_turn_off_block_does_not_require_temperature(self) -> None:
        self.assertEqual(
            normalize_schedule_blocks(
                [
                    {
                        "start": "23:00",
                        "action": ACTION_TURN_OFF,
                    }
                ]
            ),
            [
                {
                    "start": "23:00",
                    "action": ACTION_TURN_OFF,
                }
            ],
        )

    def test_normalize_schedule_data_adds_missing_zones_and_drops_unmanaged(self) -> None:
        data = normalize_schedule_data(
            {
                "global": {
                    "mode": "boost",
                    "paused_until": "2026-05-19T19:00:00+00:00",
                    "paused_started_at": "2026-05-19T18:00:00+00:00",
                },
                "zones": {
                    "climate.unmanaged": {
                        "enabled": True,
                        "schedule": {},
                    },
                    "climate.salon": {
                        "enabled": False,
                        "schedule": {
                            "tuesday": [
                                {
                                    "start": "18:00",
                                    "temperature": 20,
                                }
                            ],
                        },
                    },
                },
            },
            ["climate.salon", "climate.bedroom"],
        )

        self.assertEqual(set(data["zones"]), {"climate.salon", "climate.bedroom"})
        self.assertEqual(
            data["settings"],
            {
                "first_weekday": "monday",
                "zone_order": [],
                "min_temperature": 5.0,
                "max_temperature": 35.0,
            },
        )
        self.assertEqual(data["global_"]["mode"], MODE_AUTO)
        self.assertEqual(
            data["global_"]["paused_started_at"],
            "2026-05-19T18:00:00+00:00",
        )
        self.assertFalse(data["zones"]["climate.salon"]["enabled"])
        self.assertTrue(data["zones"]["climate.bedroom"]["enabled"])
        self.assertEqual(
            data["zones"]["climate.bedroom"]["preconditioning"]["max_lead_minutes"],
            DEFAULT_PRECONDITIONING_MAX_LEAD_MINUTES,
        )
        self.assertEqual(
            data["zones"]["climate.salon"]["schedule"]["tuesday"],
            [
                {
                    "start": "18:00",
                    "action": ACTION_SET_TEMPERATURE,
                    "temperature": 20.0,
                }
            ],
        )

    def test_normalize_schedule_data_preserves_panel_settings(self) -> None:
        data = normalize_schedule_data(
            {
                "settings": {
                    "first_weekday": "sunday",
                    "zone_order": ["climate.bedroom", "climate.unmanaged", "climate.salon"],
                    "min_temperature": 12,
                    "max_temperature": 28.5,
                },
            },
            ["climate.salon", "climate.bedroom"],
        )

        self.assertEqual(
            data["settings"],
            {
                "first_weekday": "sunday",
                "zone_order": ["climate.bedroom", "climate.salon"],
                "min_temperature": 12.0,
                "max_temperature": 28.5,
            },
        )

    def test_normalize_schedule_data_preserves_preconditioning_settings(self) -> None:
        data = normalize_schedule_data(
            {
                "zones": {
                    "climate.salon": {
                        "enabled": True,
                        "schedule": empty_week_schedule(),
                        "preconditioning": {
                            "enabled": True,
                            "max_lead_minutes": 240,
                            "minimum_delta_temperature": 0.5,
                        },
                    }
                }
            },
            ["climate.salon", "climate.bedroom"],
        )

        self.assertEqual(
            data["zones"]["climate.salon"]["preconditioning"],
            {
                "enabled": True,
                "max_lead_minutes": 240,
                "minimum_delta_temperature": 0.5,
                "learning_history_size": 120,
                "similar_sample_count": 25,
                "comfort_percentile": 80,
                "adaptive_percentile_enabled": True,
                "partial_expiry_days": 30,
                "recency_decay_days": 30,
                "min_start_minutes": 10,
                "fallback_minutes_per_degree": 25,
                "use_outdoor_temperature": True,
                "outdoor_temperature_entity_id": None,
            },
        )
        self.assertFalse(data["zones"]["climate.bedroom"]["preconditioning"]["enabled"])
        self.assertEqual(
            data["zones"]["climate.bedroom"]["preconditioning"]["max_lead_minutes"],
            DEFAULT_PRECONDITIONING_MAX_LEAD_MINUTES,
        )

    def test_normalize_preconditioning_data_preserves_outdoor_temperature_entity(
        self,
    ) -> None:
        data = normalize_preconditioning_data(
            {
                "use_outdoor_temperature": False,
                "outdoor_temperature_entity_id": " sensor.outdoor_temperature ",
            }
        )

        self.assertFalse(data["use_outdoor_temperature"])
        self.assertEqual(data["outdoor_temperature_entity_id"], "sensor.outdoor_temperature")

    def test_normalize_preconditioning_data_ignores_invalid_outdoor_temperature_entity(
        self,
    ) -> None:
        data = normalize_preconditioning_data(
            {
                "outdoor_temperature_entity_id": "outdoor_temperature",
            }
        )

        self.assertIsNone(data["outdoor_temperature_entity_id"])

    def test_normalize_preconditioning_data_ignores_development_aliases(self) -> None:
        data = normalize_preconditioning_data(
            {
                "max_start_minutes": 480,
                "min_temp_delta": 1.5,
            }
        )

        self.assertEqual(data["max_lead_minutes"], 1440)
        self.assertEqual(data["minimum_delta_temperature"], 0.3)

    def test_normalize_schedule_data_preserves_local_preconditioning_learning(
        self,
    ) -> None:
        data = normalize_schedule_data(
            {
                "preconditioning_learning": {
                    "climate.salon": {
                        "heat": {
                            "observations": [
                                {
                                    "entity_id": "climate.salon",
                                    "mode": "heat",
                                    "created_at": "2026-05-19T19:20:00+00:00",
                                    "scheduled_time": "2026-05-19T20:00:00+00:00",
                                    "start_time": "2026-05-19T18:30:00+00:00",
                                    "target_temp": "21",
                                    "initial_temp": "18",
                                    "observed_temp": "20.8",
                                    "delta_t": "3",
                                    "startup_minutes": "90",
                                    "reached": True,
                                    "minutes_to_reach": "50",
                                    "quality": "complete",
                                },
                                {
                                    "quality": "noise",
                                    "mode": "heat",
                                },
                            ]
                        },
                        "cool": {
                            "observations": [
                                {
                                    "entity_id": "climate.salon",
                                    "mode": "cool",
                                    "created_at": "2026-05-19T19:20:00+00:00",
                                    "scheduled_time": "2026-05-19T20:00:00+00:00",
                                    "start_time": "2026-05-19T18:30:00+00:00",
                                    "target_temp": "23",
                                    "initial_temp": "25",
                                    "observed_temp": "23.2",
                                    "delta_t": "2",
                                    "startup_minutes": "45",
                                    "reached": True,
                                    "minutes_to_reach": "35",
                                    "quality": "complete",
                                },
                            ]
                        },
                    },
                    "climate.unmanaged": {
                        "heat": {
                            "observations": [
                                {
                                    "quality": "complete",
                                    "mode": "heat",
                                }
                            ]
                        }
                    },
                }
            },
            ["climate.salon", "climate.bedroom"],
        )

        self.assertEqual(
            data["preconditioning_learning"],
            {
                "climate.salon": {
                    "heat": {
                        "observations": [
                            {
                                "entity_id": "climate.salon",
                                "mode": "heat",
                                "created_at": "2026-05-19T19:20:00+00:00",
                                "scheduled_time": "2026-05-19T20:00:00+00:00",
                                "start_time": "2026-05-19T18:30:00+00:00",
                                "target_temp": 21.0,
                                "initial_temp": 18.0,
                                "outdoor_temp_start": None,
                                "outdoor_temp_target": None,
                                "delta_t": 3.0,
                                "startup_minutes": 90,
                                "reached": True,
                                "minutes_to_reach": 50,
                                "quality": "complete",
                                "observed_temp": 20.8,
                            },
                        ]
                    },
                    "cool": {
                        "observations": [
                            {
                                "entity_id": "climate.salon",
                                "mode": "cool",
                                "created_at": "2026-05-19T19:20:00+00:00",
                                "scheduled_time": "2026-05-19T20:00:00+00:00",
                                "start_time": "2026-05-19T18:30:00+00:00",
                                "target_temp": 23.0,
                                "initial_temp": 25.0,
                                "outdoor_temp_start": None,
                                "outdoor_temp_target": None,
                                "delta_t": 2.0,
                                "startup_minutes": 45,
                                "reached": True,
                                "minutes_to_reach": 35,
                                "quality": "complete",
                                "observed_temp": 23.2,
                            },
                        ]
                    },
                },
                "climate.bedroom": {
                    "heat": {"observations": []},
                    "cool": {"observations": []},
                },
            },
        )

    def test_normalize_schedule_data_ignores_old_flat_preconditioning_learning(
        self,
    ) -> None:
        data = normalize_schedule_data(
            {
                "preconditioning_learning": {
                    "climate.salon": {
                        "observations": [
                            _preconditioning_observation(
                                60,
                                quality="complete",
                                mode="heat",
                            )
                        ]
                    }
                }
            },
            ["climate.salon"],
        )

        self.assertEqual(
            data["preconditioning_learning"]["climate.salon"],
            {
                "heat": {"observations": []},
                "cool": {"observations": []},
            },
        )

    def test_preconditioning_learning_keeps_heat_and_cool_history_separate(
        self,
    ) -> None:
        observations = [
            *[
                _preconditioning_observation(index, mode="heat")
                for index in range(130)
            ],
            *[
                _preconditioning_observation(index + 100, mode="cool")
                for index in range(130)
            ],
        ]

        data = normalize_schedule_data(
            {
                "preconditioning_learning": {
                    "climate.salon": _preconditioning_learning(observations)
                }
            },
            ["climate.salon"],
        )

        heat = data["preconditioning_learning"]["climate.salon"]["heat"]["observations"]
        cool = data["preconditioning_learning"]["climate.salon"]["cool"]["observations"]

        self.assertEqual(len(heat), 120)
        self.assertEqual(len(cool), 120)
        self.assertEqual(heat[0]["startup_minutes"], 10)
        self.assertEqual(heat[-1]["startup_minutes"], 129)
        self.assertEqual(cool[0]["startup_minutes"], 110)
        self.assertEqual(cool[-1]["startup_minutes"], 229)

    def test_preconditioning_learning_trims_oldest_samples_by_history_size(
        self,
    ) -> None:
        observations = [
            *[
                _preconditioning_observation(index, quality="complete", mode="heat")
                for index in range(130)
            ],
        ]

        data = normalize_schedule_data(
            {
                "preconditioning_learning": {
                    "climate.salon": _preconditioning_learning(observations)
                }
            },
            ["climate.salon"],
        )

        kept = data["preconditioning_learning"]["climate.salon"]["heat"][
            "observations"
        ]
        self.assertEqual(len(kept), 120)
        self.assertEqual(kept[0]["startup_minutes"], 10)
        self.assertEqual(kept[-1]["startup_minutes"], 129)

    def test_preconditioning_learning_uses_configured_history_size_on_load(
        self,
    ) -> None:
        observations = [
            _preconditioning_observation(index, quality="complete", mode="heat")
            for index in range(30)
        ]

        data = normalize_schedule_data(
            {
                "zones": {
                    "climate.salon": {
                        "preconditioning": {
                            "learning_history_size": 20,
                        }
                    }
                },
                "preconditioning_learning": {
                    "climate.salon": _preconditioning_learning(observations)
                },
            },
            ["climate.salon"],
        )

        kept = data["preconditioning_learning"]["climate.salon"]["heat"][
            "observations"
        ]
        self.assertEqual(len(kept), 20)
        self.assertEqual(kept[0]["startup_minutes"], 10)
        self.assertEqual(kept[-1]["startup_minutes"], 29)

    def test_invalid_samples_do_not_evict_preconditioning_learning(
        self,
    ) -> None:
        observations = [
            *[
                _preconditioning_observation(
                    index,
                    quality="complete",
                    mode="heat",
                )
                for index in range(130)
            ],
            *[
                _preconditioning_observation(
                    index,
                    quality="invalid",
                    mode="heat",
                )
                for index in range(200, 225)
            ],
        ]

        data = normalize_schedule_data(
            {
                "preconditioning_learning": {
                    "climate.salon": _preconditioning_learning(observations)
                }
            },
            ["climate.salon"],
        )

        kept = data["preconditioning_learning"]["climate.salon"]["heat"][
            "observations"
        ]
        useful = [sample for sample in kept if sample["quality"] != "invalid"]
        invalid = [sample for sample in kept if sample["quality"] == "invalid"]

        self.assertEqual(len(kept), 130)
        self.assertEqual(len(useful), 120)
        self.assertEqual(useful[0]["startup_minutes"], 10)
        self.assertEqual(useful[-1]["startup_minutes"], 129)
        self.assertEqual(len(invalid), 10)
        self.assertEqual(invalid[0]["startup_minutes"], 215)
        self.assertEqual(invalid[-1]["startup_minutes"], 224)

    def test_adaptive_prediction_uses_initial_model_without_complete_samples(self) -> None:
        config = normalize_preconditioning_data({})

        prediction = predict_preconditioning_lead(
            [],
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["source"], "initial_model")
        self.assertEqual(prediction["recommended_lead_minutes"], 80)
        self.assertEqual(prediction["complete_sample_count"], 0)

    def test_adaptive_prediction_initial_model_honors_max_lead_limit(self) -> None:
        config = normalize_preconditioning_data({})

        prediction = predict_preconditioning_lead(
            [],
            "heat",
            target_temp=21,
            current_temp=10,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["source"], "initial_model")
        self.assertEqual(prediction["recommended_lead_minutes"], 305)
        self.assertEqual(prediction["initial_model_lead_minutes"], 305)

        capped = predict_preconditioning_lead(
            [],
            "heat",
            target_temp=21,
            current_temp=10,
            config=normalize_preconditioning_data({"max_lead_minutes": 120}),
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(capped["recommended_lead_minutes"], 120)

    def test_adaptive_prediction_initial_model_ignores_outdoor_temperature(self) -> None:
        config = normalize_preconditioning_data({})

        cold_prediction = predict_preconditioning_lead(
            [],
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
            outdoor_temp_target=-5,
        )
        warm_prediction = predict_preconditioning_lead(
            [],
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
            outdoor_temp_target=25,
        )

        self.assertEqual(cold_prediction["source"], "initial_model")
        self.assertEqual(cold_prediction["recommended_lead_minutes"], 80)
        self.assertEqual(cold_prediction["initial_model_lead_minutes"], 80)
        self.assertEqual(warm_prediction["recommended_lead_minutes"], 80)
        self.assertFalse(cold_prediction["used_outdoor_temperature"])

    def test_adaptive_prediction_uses_weighted_percentile_after_five_complete_samples(self) -> None:
        config = normalize_preconditioning_data({})
        observations = [
            _preconditioning_observation(minutes, quality="complete", delta_t=2)
            for minutes in (40, 50, 60, 70, 80)
        ]

        prediction = predict_preconditioning_lead(
            observations,
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["source"], "history")
        self.assertEqual(prediction["complete_sample_count"], MIN_PRECONDITIONING_COMPLETE_SAMPLES)
        self.assertEqual(prediction["recommended_lead_minutes"], 70)

    def test_adaptive_prediction_scales_history_from_small_to_large_delta(self) -> None:
        config = normalize_preconditioning_data({"max_lead_minutes": 300})
        observations = [
            _preconditioning_observation(
                minutes,
                quality="complete",
                delta_t=1,
                created_at="2026-05-19T19:00:00+00:00",
            )
            for minutes in (20, 25, 30, 35, 40)
        ]

        prediction = predict_preconditioning_lead(
            observations,
            "heat",
            target_temp=21,
            current_temp=16,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["source"], "history")
        self.assertEqual(prediction["recommended_lead_minutes"], 175)

    def test_adaptive_prediction_scales_history_from_large_to_small_delta(self) -> None:
        config = normalize_preconditioning_data({"max_lead_minutes": 300})
        observations = [
            _preconditioning_observation(
                minutes,
                quality="complete",
                delta_t=5,
                created_at="2026-05-19T19:00:00+00:00",
            )
            for minutes in (100, 125, 150, 175, 200)
        ]

        prediction = predict_preconditioning_lead(
            observations,
            "heat",
            target_temp=21,
            current_temp=20,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["source"], "history")
        self.assertEqual(prediction["recommended_lead_minutes"], 35)

    def test_adaptive_prediction_weights_closer_samples_more_than_far_recent_samples(
        self,
    ) -> None:
        config = normalize_preconditioning_data(
            {
                "adaptive_percentile_enabled": False,
                "max_lead_minutes": 300,
            }
        )
        observations = [
            *[
                _preconditioning_observation(
                    40,
                    quality="complete",
                    delta_t=2,
                    target_temp=21,
                    created_at="2026-04-30T19:00:00+00:00",
                )
                for _ in range(4)
            ],
            _preconditioning_observation(
                200,
                quality="complete",
                delta_t=2,
                target_temp=31,
                created_at="2026-05-19T19:00:00+00:00",
            ),
        ]

        prediction = predict_preconditioning_lead(
            observations,
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["source"], "history")
        self.assertEqual(prediction["recommended_lead_minutes"], 40)

    def test_adaptive_prediction_uses_partial_as_lower_bound(self) -> None:
        config = normalize_preconditioning_data({})
        observations = [
            *[
                _preconditioning_observation(minutes, quality="complete", delta_t=2)
                for minutes in (40, 50, 60, 70, 80)
            ],
            _preconditioning_observation(90, quality="partial", delta_t=2),
        ]

        prediction = predict_preconditioning_lead(
            observations,
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["source"], "history")
        self.assertEqual(prediction["partial_sample_count"], 1)
        self.assertEqual(prediction["recommended_lead_minutes"], 110)

    def test_adaptive_prediction_uses_largest_active_partial_lower_bound(self) -> None:
        config = normalize_preconditioning_data({})
        observations = [
            _preconditioning_observation(40, quality="partial", delta_t=2),
            _preconditioning_observation(120, quality="partial", delta_t=2),
            _preconditioning_observation(90, quality="partial", delta_t=2),
        ]

        prediction = predict_preconditioning_lead(
            observations,
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["source"], "initial_model")
        self.assertEqual(prediction["partial_sample_count"], 3)
        self.assertEqual(prediction["complete_sample_count"], 0)
        self.assertEqual(prediction["recommended_lead_minutes"], 145)

    def test_adaptive_prediction_rounds_partial_floor_up_to_next_five_minutes(
        self,
    ) -> None:
        config = normalize_preconditioning_data(
            {"adaptive_percentile_enabled": False}
        )
        observations = [
            *[
                _preconditioning_observation(minutes, quality="complete", delta_t=2)
                for minutes in (40, 50, 60, 70, 80)
            ],
            _preconditioning_observation(80, quality="partial", delta_t=2),
        ]

        prediction = predict_preconditioning_lead(
            observations,
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["source"], "history")
        self.assertEqual(prediction["partial_sample_count"], 1)
        self.assertEqual(prediction["recommended_lead_minutes"], 100)

    def test_adaptive_prediction_expires_old_partial_samples(self) -> None:
        config = normalize_preconditioning_data({})
        observations = [
            _preconditioning_observation(90, quality="partial", delta_t=2, created_day=1),
            *[
                _preconditioning_observation(minutes, quality="complete", delta_t=2)
                for minutes in (40, 50, 60, 70, 80)
            ],
        ]

        prediction = predict_preconditioning_lead(
            observations,
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 6, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["recommended_lead_minutes"], 70)

    def test_adaptive_prediction_ignores_partial_refuted_by_later_similar_complete_samples(self) -> None:
        config = normalize_preconditioning_data({})
        observations = [
            _preconditioning_observation(90, quality="partial", delta_t=2, created_day=18),
            *[
                _preconditioning_observation(
                    minutes,
                    quality="complete",
                    delta_t=2,
                    created_day=19,
                )
                for minutes in (40, 50, 60, 70, 80)
            ],
        ]

        prediction = predict_preconditioning_lead(
            observations,
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["recommended_lead_minutes"], 70)

    def test_adaptive_prediction_keeps_heat_and_cool_separate(self) -> None:
        config = normalize_preconditioning_data({})
        observations = [
            *[
                _preconditioning_observation(minutes, quality="complete", mode="heat", delta_t=2)
                for minutes in (70, 75, 80, 85, 90)
            ],
            *[
                _preconditioning_observation(minutes, quality="complete", mode="cool", delta_t=2)
                for minutes in (20, 25, 30, 35, 40)
            ],
        ]

        heat_prediction = predict_preconditioning_lead(
            observations,
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )
        cool_prediction = predict_preconditioning_lead(
            observations,
            "cool",
            target_temp=23,
            current_temp=25,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(heat_prediction["recommended_lead_minutes"], 90)
        self.assertEqual(cool_prediction["recommended_lead_minutes"], 40)

    def test_adaptive_prediction_skips_small_temperature_delta(self) -> None:
        config = normalize_preconditioning_data({})

        prediction = predict_preconditioning_lead(
            [_preconditioning_observation(40, quality="complete", delta_t=2)],
            "heat",
            target_temp=21,
            current_temp=20.8,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertIsNone(prediction["recommended_lead_minutes"])

    def test_adaptive_prediction_raises_percentile_after_recent_partials(self) -> None:
        config = normalize_preconditioning_data({})
        observations = [
            *[
                _preconditioning_observation(minutes, quality="complete", delta_t=2)
                for minutes in (40, 50, 60, 70, 80, 90)
            ],
            _preconditioning_observation(60, quality="partial", delta_t=2),
            _preconditioning_observation(65, quality="partial", delta_t=2),
        ]

        prediction = predict_preconditioning_lead(
            observations,
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["comfort_percentile"], 90)
        self.assertEqual(prediction["recommended_lead_minutes"], 90)

    def test_adaptive_prediction_keeps_percentile_at_exactly_twenty_percent_partials(
        self,
    ) -> None:
        config = normalize_preconditioning_data({})
        observations = [
            *[
                _preconditioning_observation(minutes, quality="complete", delta_t=2)
                for minutes in (40, 45, 50, 55, 60, 65, 70, 75)
            ],
            _preconditioning_observation(80, quality="partial", delta_t=2),
            _preconditioning_observation(85, quality="partial", delta_t=2),
        ]

        prediction = predict_preconditioning_lead(
            observations,
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["comfort_percentile"], 80)

    def test_adaptive_prediction_keeps_percentile_at_exactly_ten_percent_partials(
        self,
    ) -> None:
        config = normalize_preconditioning_data({"comfort_percentile": 85})
        observations = [
            *[
                _preconditioning_observation(minutes, quality="complete", delta_t=2)
                for minutes in (40, 45, 50, 55, 60, 65, 70, 75, 80)
            ],
            _preconditioning_observation(85, quality="partial", delta_t=2),
        ]

        prediction = predict_preconditioning_lead(
            observations,
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["comfort_percentile"], 85)

    def test_adaptive_prediction_lowers_high_percentile_without_recent_partials(
        self,
    ) -> None:
        config = normalize_preconditioning_data({"comfort_percentile": 90})
        observations = [
            _preconditioning_observation(minutes, quality="complete", delta_t=2)
            for minutes in range(40, 90, 5)
        ]

        prediction = predict_preconditioning_lead(
            observations,
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["comfort_percentile"], 80)

    def test_adaptive_prediction_dynamic_percentile_uses_last_ten_same_mode_samples(
        self,
    ) -> None:
        config = normalize_preconditioning_data({"comfort_percentile": 85})
        observations = [
            *[
                _preconditioning_observation(
                    90 + index,
                    quality="partial",
                    mode="heat",
                    delta_t=2,
                )
                for index in range(3)
            ],
            _preconditioning_observation(
                90,
                quality="partial",
                mode="cool",
                delta_t=2,
            ),
            _preconditioning_observation(
                90,
                quality="invalid",
                mode="heat",
                delta_t=2,
            ),
            *[
                _preconditioning_observation(
                    40 + index,
                    quality="complete",
                    mode="heat",
                    delta_t=2,
                )
                for index in range(10)
            ],
        ]

        prediction = predict_preconditioning_lead(
            observations,
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["comfort_percentile"], 80)

    def test_adaptive_prediction_matches_documented_initial_model_example(
        self,
    ) -> None:
        config = normalize_preconditioning_data(
            {
                "similar_sample_count": 5,
                "max_lead_minutes": 120,
                "adaptive_percentile_enabled": False,
            }
        )

        prediction = predict_preconditioning_lead(
            _documented_preconditioning_observations(),
            "heat",
            target_temp=21,
            current_temp=18.8,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["source"], "initial_model")
        self.assertEqual(prediction["similar_sample_count"], 5)
        self.assertEqual(prediction["complete_sample_count"], 3)
        self.assertEqual(prediction["partial_sample_count"], 2)
        self.assertEqual(prediction["invalid_sample_count"], 1)
        self.assertEqual(prediction["recommended_lead_minutes"], 85)

    def test_adaptive_prediction_matches_documented_history_example(
        self,
    ) -> None:
        config = normalize_preconditioning_data(
            {
                "similar_sample_count": 9,
                "max_lead_minutes": 120,
                "adaptive_percentile_enabled": False,
            }
        )

        prediction = predict_preconditioning_lead(
            _documented_preconditioning_observations(),
            "heat",
            target_temp=21,
            current_temp=18.8,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["source"], "history")
        self.assertEqual(prediction["comfort_percentile"], 80)
        self.assertEqual(prediction["similar_sample_count"], 9)
        self.assertEqual(prediction["complete_sample_count"], 6)
        self.assertEqual(prediction["partial_sample_count"], 3)
        self.assertEqual(prediction["invalid_sample_count"], 1)
        self.assertEqual(prediction["recommended_lead_minutes"], 85)

    def test_adaptive_prediction_weights_recent_complete_samples_more_heavily(
        self,
    ) -> None:
        config = normalize_preconditioning_data(
            {
                "adaptive_percentile_enabled": False,
                "recency_decay_days": 30,
            }
        )
        observations = [
            _preconditioning_observation(
                minutes,
                quality="complete",
                delta_t=2,
                created_at="2026-04-01T19:00:00+00:00",
            )
            for minutes in (20, 30, 40, 50)
        ]
        observations.append(
            _preconditioning_observation(
                90,
                quality="complete",
                delta_t=2,
                created_day=19,
            )
        )

        prediction = predict_preconditioning_lead(
            observations,
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
        )

        self.assertEqual(prediction["source"], "history")
        self.assertEqual(prediction["complete_sample_count"], 5)
        self.assertEqual(prediction["recommended_lead_minutes"], 90)

    def test_adaptive_prediction_uses_outdoor_temperature_for_similarity(
        self,
    ) -> None:
        config = normalize_preconditioning_data(
            {
                "adaptive_percentile_enabled": False,
                "similar_sample_count": 5,
                "max_lead_minutes": 300,
            }
        )
        cold_samples = [
            {
                **_preconditioning_observation(
                    minutes,
                    quality="complete",
                    delta_t=2,
                ),
                "outdoor_temp_target": 4.0,
            }
            for minutes in (40, 45, 50, 55, 60)
        ]
        warm_samples = [
            {
                **_preconditioning_observation(
                    minutes,
                    quality="complete",
                    delta_t=2,
                ),
                "outdoor_temp_target": 18.0,
            }
            for minutes in (100, 105, 110, 115, 120)
        ]

        prediction = predict_preconditioning_lead(
            [*warm_samples, *cold_samples],
            "heat",
            target_temp=21,
            current_temp=19,
            config=config,
            now=datetime(2026, 5, 20, 12, 0).astimezone(),
            outdoor_temp_target=5.0,
        )

        self.assertTrue(prediction["used_outdoor_temperature"])
        self.assertEqual(prediction["source"], "history")
        self.assertEqual(prediction["complete_sample_count"], 5)
        self.assertEqual(prediction["recommended_lead_minutes"], 55)

    def test_normalize_schedule_data_preserves_valid_custom_templates(self) -> None:
        data = normalize_schedule_data(
            {
                "templates": [
                    {
                        "key": "evening",
                        "name": "Evening",
                        "blocks": [
                            {
                                "start": "22:00",
                                "temperature": 18,
                            },
                            {
                                "start": "18:00",
                                "temperature": 21,
                                "hvac_mode": "heat",
                            },
                        ],
                    },
                    {
                        "key": "broken",
                        "name": "",
                        "blocks": [],
                    },
                ],
            },
            ["climate.salon"],
        )

        self.assertEqual(
            data["templates"],
            [
                {
                    "key": "home_day",
                    "name": "Home day",
                    "blocks": [
                        {
                            "start": "07:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 21.0,
                        },
                        {
                            "start": "23:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 17.0,
                        },
                    ],
                },
                {
                    "key": "away_workday",
                    "name": "Away workday",
                    "blocks": [
                        {
                            "start": "06:30",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 21.0,
                        },
                        {
                            "start": "08:30",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 18.0,
                        },
                        {
                            "start": "17:30",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 21.0,
                        },
                        {
                            "start": "23:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 17.0,
                        },
                    ],
                },
                {
                    "key": "all_day_comfort",
                    "name": "All-day comfort",
                    "blocks": [
                        {
                            "start": "00:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 21.0,
                        }
                    ],
                },
                {
                    "key": "night_setback",
                    "name": "Night setback",
                    "blocks": [
                        {
                            "start": "00:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 17.0,
                        },
                        {
                            "start": "06:30",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 21.0,
                        },
                        {
                            "start": "23:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 17.0,
                        },
                    ],
                },
                {
                    "key": "off_day",
                    "name": "Off all day",
                    "blocks": [
                        {
                            "start": "00:00",
                            "action": ACTION_TURN_OFF,
                        }
                    ],
                },
                {
                    "key": "clear_day",
                    "name": "Clear day",
                    "blocks": [],
                },
                {
                    "key": "evening",
                    "name": "Evening",
                    "blocks": [
                        {
                            "start": "18:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 21.0,
                            "hvac_mode": "heat",
                        },
                        {
                            "start": "22:00",
                            "action": ACTION_SET_TEMPERATURE,
                            "temperature": 18.0,
                        },
                    ],
                }
            ],
        )

    def test_normalize_schedule_data_does_not_reseed_deleted_templates(self) -> None:
        data = normalize_schedule_data(
            {
                "templates": [],
                "templates_seeded": True,
                "templates_seeded_version": DEFAULT_SCHEDULE_TEMPLATES_VERSION,
            },
            ["climate.salon"],
        )

        self.assertEqual(data["templates"], [])
        self.assertTrue(data["templates_seeded"])
        self.assertEqual(
            data["templates_seeded_version"],
            DEFAULT_SCHEDULE_TEMPLATES_VERSION,
        )

    def test_normalize_schedule_data_adds_new_default_templates_once(self) -> None:
        data = normalize_schedule_data(
            {
                "templates": [],
                "templates_seeded": True,
            },
            ["climate.salon"],
        )

        self.assertEqual(
            data["templates"],
            [
                {
                    "key": "clear_day",
                    "name": "Clear day",
                    "blocks": [],
                }
            ],
        )
        self.assertTrue(data["templates_seeded"])
        self.assertEqual(
            data["templates_seeded_version"],
            DEFAULT_SCHEDULE_TEMPLATES_VERSION,
        )

    def test_normalize_schedule_data_preserves_boost_previous_state(self) -> None:
        data = normalize_schedule_data(
            {
                "zones": {
                    "climate.salon": {
                        "enabled": True,
                        "schedule": empty_week_schedule(),
                        "override": {
                            "type": "boost",
                            "started_at": "2026-05-19T17:00:00+00:00",
                            "until": "2026-05-19T17:30:00+00:00",
                            "temperature": 23,
                            "hvac_mode": "heat",
                            "previous_state": {
                                "hvac_mode": "cool",
                                "temperature": "19",
                            },
                        },
                    }
                }
            },
            ["climate.salon"],
        )

        override = data["zones"]["climate.salon"]["override"]

        self.assertIsNotNone(override)
        self.assertEqual(
            override["previous_state"],
            {
                "hvac_mode": "cool",
                "temperature": 19.0,
            },
        )

    def test_normalize_schedule_data_preserves_zone_pause_override(self) -> None:
        data = normalize_schedule_data(
            {
                "zones": {
                    "climate.salon": {
                        "enabled": True,
                        "schedule": empty_week_schedule(),
                        "override": {
                            "type": "pause",
                            "started_at": "2026-05-19T17:00:00+00:00",
                            "until": "2026-05-19T18:00:00+00:00",
                            "action": ACTION_TURN_OFF,
                        },
                    }
                }
            },
            ["climate.salon"],
        )

        self.assertEqual(
            data["zones"]["climate.salon"]["override"],
            {
                "type": "pause",
                "started_at": "2026-05-19T17:00:00+00:00",
                "until": "2026-05-19T18:00:00+00:00",
                "action": ACTION_TURN_OFF,
            },
        )

