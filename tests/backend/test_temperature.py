"""Temperature conversion and raw-runtime storage contract tests."""

from __future__ import annotations

import asyncio
from copy import deepcopy
from types import SimpleNamespace
import unittest

from . import helpers  # noqa: F401 - installs Home Assistant test stubs
from custom_components.velair.models import normalize_schedule_data
from custom_components.velair.storage import (
    LAST_TEMPERATURE_MIGRATION_KEY,
    LEGACY_CELSIUS_RESET_REASON,
    RUNTIME_TEMPERATURE_FORMAT,
    TEMPERATURE_FORMAT_KEY,
    TEMPERATURE_MIGRATION_REASON_KEY,
    TEMPERATURE_REVISION_KEY,
    TEMPERATURE_UNIT_KEY,
    VelairStorage,
    _entity_target_grid,
    _nearest_step,
    convert_portable_temperature_data,
)
from custom_components.velair.temperature import (
    CELSIUS,
    FAHRENHEIT,
    absolute_temperature,
    rate_per_degree,
    temperature_delta,
)


class MemoryStore:
    """Small Home Assistant Store stand-in."""

    def __init__(self, data=None, *, fail_save: bool = False) -> None:
        self.data = deepcopy(data)
        self.fail_save = fail_save
        self.saved: list[dict] = []

    async def async_load(self):
        return deepcopy(self.data)

    async def async_save(self, data) -> None:
        if self.fail_save:
            raise OSError("storage unavailable")
        self.data = deepcopy(data)
        self.saved.append(deepcopy(data))


class GatedStore(MemoryStore):
    """Store that holds its first write until the test releases it."""

    def __init__(self) -> None:
        super().__init__()
        self.first_started = asyncio.Event()
        self.release_first = asyncio.Event()

    async def async_save(self, data) -> None:
        self.saved.append(deepcopy(data))
        if len(self.saved) == 1:
            self.first_started.set()
            await self.release_first.wait()
        self.data = deepcopy(data)


def make_storage(unit: str, raw=None) -> VelairStorage:
    """Build storage without depending on Home Assistant's Store constructor."""
    storage = VelairStorage.__new__(VelairStorage)
    storage._store = MemoryStore(raw)
    storage._hass = SimpleNamespace(
        config=SimpleNamespace(units=SimpleNamespace(temperature_unit=unit))
    )
    storage._climate_entities = []
    storage._temperature_unit = unit
    storage._temperature_revision = 0
    storage._last_temperature_migration = None
    storage._temperature_migration_reason = None
    storage._migration_lock = asyncio.Lock()
    storage.data = None
    return storage


def legacy_celsius_data() -> dict:
    """Return representative persisted thermal data from Velair 1.1."""
    return {
        "zones": {
            "climate.room": {
                "enabled": True,
                "schedule": {
                    "monday": [{"start": "06:00", "temperature": 21.0}]
                },
                "override": {
                    "type": "boost",
                    "until": "2026-07-14T12:00:00+00:00",
                    "temperature": 22.0,
                    "previous_state": {"temperature": 18.0},
                },
                "preconditioning": {
                    "minimum_delta_temperature": 0.3,
                    "fallback_minutes_per_degree": 25.0,
                    "room_sensor_assist_max_delta": 2.0,
                },
                "comfort": {
                    "temperature_min": 20.0,
                    "temperature_max": 24.0,
                },
            }
        },
        "templates_seeded": True,
        "templates_seeded_version": 2,
        "templates": [
            {
                "key": "custom",
                "name": "Custom",
                "blocks": [{"start": "07:00", "temperature": 21.0}],
            }
        ],
        "settings": {"min_temperature": 5.0, "max_temperature": 35.0},
        "preconditioning_learning": {
            "climate.room": {
                "heat": {
                    "observations": [
                        {
                            "entity_id": "climate.room",
                            "mode": "heat",
                            "created_at": "2026-07-13T08:00:00+00:00",
                            "scheduled_time": "2026-07-13T09:00:00+00:00",
                            "start_time": "2026-07-13T08:30:00+00:00",
                            "target_temp": 21.0,
                            "initial_temp": 18.0,
                            "observed_temp": 20.0,
                            "outdoor_temp_start": 5.0,
                            "outdoor_temp_target": 6.0,
                            "delta_t": 3.0,
                            "startup_minutes": 30,
                            "reached": True,
                            "minutes_to_reach": 30,
                            "quality": "complete",
                        }
                    ]
                }
            }
        },
    }


def runtime_celsius_data() -> dict:
    """Return marked runtime data after a supported Celsius installation."""
    data = legacy_celsius_data()
    data[TEMPERATURE_FORMAT_KEY] = RUNTIME_TEMPERATURE_FORMAT
    data[TEMPERATURE_UNIT_KEY] = CELSIUS
    return data


class TemperatureCodecTests(unittest.TestCase):
    """Keep absolute, delta and rate conversions physically distinct."""

    def test_celsius_fahrenheit_round_trip(self) -> None:
        self.assertAlmostEqual(absolute_temperature(21, CELSIUS, FAHRENHEIT), 69.8)
        self.assertAlmostEqual(absolute_temperature(69.8, FAHRENHEIT, CELSIUS), 21)

    def test_delta_and_rate_use_scale_without_absolute_offset(self) -> None:
        self.assertAlmostEqual(temperature_delta(2, CELSIUS, FAHRENHEIT), 3.6)
        self.assertAlmostEqual(rate_per_degree(25, CELSIUS, FAHRENHEIT), 25 * 5 / 9)

    def test_editable_step_rounding_is_correct_for_negative_values(self) -> None:
        self.assertEqual(_nearest_step(-1.3, 0.5), -1.5)

    def test_tenth_fallback_keeps_integer_and_removes_conversion_noise(self) -> None:
        self.assertEqual(_nearest_step(4, 0.1), 4)
        self.assertEqual(_nearest_step(4.566666, 0.1), 4.6)

    def test_invalid_entity_grid_numbers_use_unit_fallback(self) -> None:
        state = SimpleNamespace(
            attributes={"min_temp": float("nan"), "max_temp": float("inf"), "target_temp_step": float("nan")}
        )
        hass = SimpleNamespace(states=SimpleNamespace(get=lambda _entity_id: state))

        self.assertEqual(
            _entity_target_grid(hass, "climate.room", FAHRENHEIT),
            (41.0, 95.0, None),
        )

    def test_new_range_and_learning_fields_round_trip_between_units(self) -> None:
        data = {
            "zones": {
                "climate.room": {
                    "schedule": {
                        "monday": [
                            {
                                "start": "06:00",
                                "target_temp_low": 20,
                                "target_temp_high": 24,
                            }
                        ]
                    },
                    "override": {
                        "target_temp_low": 19,
                        "target_temp_high": 23,
                        "previous_state": {
                            "target_temp_low": 18,
                            "target_temp_high": 22,
                        },
                    },
                    "preconditioning": {
                        "minimum_delta_temperature": 0.5,
                        "room_sensor_assist_max_delta": 3,
                        "fallback_minutes_per_degree": 25,
                    },
                }
            },
            "templates": [
                {
                    "key": "range",
                    "blocks": [
                        {
                            "start": "07:00",
                            "target_temp_low": 20,
                            "target_temp_high": 24,
                        }
                    ],
                }
            ],
            "profiles": [
                {
                    "key": "home",
                    "zones": {
                        "climate.room": {
                            "behavior": "schedule",
                            "schedule": {
                                "monday": [
                                    {
                                        "start": "08:00",
                                        "target_temp_low": 19,
                                        "target_temp_high": 23,
                                    }
                                ]
                            },
                        }
                    },
                }
            ],
            "preconditioning_learning": {
                "climate.room": {
                    "heat": {
                        "observations": [
                            {
                                "target_temp": 20,
                                "target_temp_low": 20,
                                "target_temp_high": 24,
                                "target_boundary": "low",
                                "initial_temp": 18,
                                "observed_temp": 20,
                                "delta_t": 2,
                            }
                        ]
                    }
                }
            },
        }

        fahrenheit = convert_portable_temperature_data(
            data, CELSIUS, FAHRENHEIT, None
        )
        round_trip = convert_portable_temperature_data(
            fahrenheit, FAHRENHEIT, CELSIUS, None
        )

        zone = fahrenheit["zones"]["climate.room"]
        self.assertEqual(
            (
                zone["schedule"]["monday"][0]["target_temp_low"],
                zone["schedule"]["monday"][0]["target_temp_high"],
            ),
            (68, 75.2),
        )
        self.assertEqual(
            (
                zone["override"]["target_temp_low"],
                zone["override"]["target_temp_high"],
                zone["override"]["previous_state"]["target_temp_low"],
                zone["override"]["previous_state"]["target_temp_high"],
            ),
            (66.2, 73.4, 64.4, 71.6),
        )
        self.assertAlmostEqual(
            zone["preconditioning"]["minimum_delta_temperature"], 0.9
        )
        self.assertAlmostEqual(
            zone["preconditioning"]["room_sensor_assist_max_delta"], 5.4
        )
        self.assertAlmostEqual(
            zone["preconditioning"]["fallback_minutes_per_degree"],
            25 * 5 / 9,
        )
        self.assertEqual(
            (
                fahrenheit["templates"][0]["blocks"][0]["target_temp_low"],
                fahrenheit["templates"][0]["blocks"][0]["target_temp_high"],
            ),
            (68, 75.2),
        )
        profile_block = fahrenheit["profiles"][0]["zones"]["climate.room"][
            "schedule"
        ]["monday"][0]
        self.assertEqual(
            (profile_block["target_temp_low"], profile_block["target_temp_high"]),
            (66.2, 73.4),
        )
        observation = fahrenheit["preconditioning_learning"]["climate.room"][
            "heat"
        ]["observations"][0]
        self.assertEqual(
            (
                observation["target_temp"],
                observation["target_temp_low"],
                observation["target_temp_high"],
                observation["delta_t"],
                observation["target_boundary"],
            ),
            (68, 68, 75.2, 3.6, "low"),
        )
        self.assertEqual(round_trip, data)


class RuntimeTemperatureStorageTests(unittest.IsolatedAsyncioTestCase):
    """Verify storage remains raw and migration is explicit and atomic."""

    async def test_unmarked_published_data_is_celsius_and_blocks_in_fahrenheit(self) -> None:
        storage = make_storage(FAHRENHEIT, legacy_celsius_data())

        await storage.async_load(["climate.room"])

        self.assertEqual(storage.effective_temperature_unit, CELSIUS)
        self.assertEqual(
            storage.data["zones"]["climate.room"]["schedule"]["monday"][0]["temperature"],
            21.0,
        )
        self.assertTrue(storage.temperature_migration_required)
        self.assertTrue(storage.legacy_temperature_reset_required)
        self.assertEqual(
            storage.temperature_migration_status()["reason"],
            LEGACY_CELSIUS_RESET_REASON,
        )
        self.assertEqual(storage._store.data[TEMPERATURE_FORMAT_KEY], RUNTIME_TEMPERATURE_FORMAT)
        self.assertEqual(storage._store.data[TEMPERATURE_UNIT_KEY], CELSIUS)
        self.assertEqual(
            storage._store.data[TEMPERATURE_MIGRATION_REASON_KEY],
            LEGACY_CELSIUS_RESET_REASON,
        )

    async def test_legacy_reset_requirement_survives_restart_and_cannot_migrate(self) -> None:
        first = make_storage(FAHRENHEIT, legacy_celsius_data())
        await first.async_load(["climate.room"])
        restarted = make_storage(FAHRENHEIT, first._store.data)

        await restarted.async_load(["climate.room"])

        self.assertTrue(restarted.legacy_temperature_reset_required)
        with self.assertRaisesRegex(ValueError, "must be reset"):
            await restarted.async_resolve_temperature_migration(
                CELSIUS, migration_id="legacy", expected_revision=0
            )

    async def test_legacy_reset_atomically_creates_fahrenheit_defaults(self) -> None:
        storage = make_storage(FAHRENHEIT, legacy_celsius_data())
        await storage.async_load(["climate.room"])

        data = await storage.async_reset_to_defaults()

        self.assertFalse(storage.temperature_migration_required)
        self.assertEqual(storage.effective_temperature_unit, FAHRENHEIT)
        self.assertEqual(storage._store.data[TEMPERATURE_UNIT_KEY], FAHRENHEIT)
        self.assertNotIn(TEMPERATURE_MIGRATION_REASON_KEY, storage._store.data)
        self.assertEqual(data["settings"]["min_temperature"], 41.0)
        self.assertEqual(
            {block["temperature"] for template in data["templates"] for block in template["blocks"] if "temperature" in block},
            {63.0, 64.0, 70.0},
        )

    async def test_save_does_not_convert_raw_runtime_values(self) -> None:
        raw = legacy_celsius_data()
        raw[TEMPERATURE_UNIT_KEY] = CELSIUS
        storage = make_storage(CELSIUS, raw)
        await storage.async_load(["climate.room"])
        storage.data["zones"]["climate.room"]["schedule"]["monday"][0]["temperature"] = 22.5

        await storage.async_save()

        self.assertEqual(
            storage._store.data["zones"]["climate.room"]["schedule"]["monday"][0]["temperature"],
            22.5,
        )

    async def test_fresh_fahrenheit_defaults_are_runtime_values(self) -> None:
        storage = make_storage(FAHRENHEIT)

        await storage.async_load(["climate.room"])

        self.assertEqual(storage.effective_temperature_unit, FAHRENHEIT)
        self.assertEqual(storage.data["settings"]["min_temperature"], 41.0)
        comfort = storage.data["zones"]["climate.room"]["comfort"]
        self.assertEqual(comfort["temperature_min"], 68.0)
        self.assertEqual(comfort["temperature_max"], 75.0)
        preconditioning = storage.data["zones"]["climate.room"]["preconditioning"]
        self.assertEqual(preconditioning["minimum_delta_temperature"], 1.0)
        self.assertEqual(preconditioning["room_sensor_assist_deadband"], 1.0)
        self.assertEqual(preconditioning["room_sensor_assist_max_delta"], 4.0)
        self.assertEqual(preconditioning["fallback_minutes_per_degree"], 14.0)
        default_targets = {
            block["temperature"]
            for template in storage.data["templates"]
            for block in template["blocks"]
            if "temperature" in block
        }
        self.assertEqual(default_targets, {63.0, 64.0, 70.0})

    async def test_partial_fahrenheit_storage_hydrates_fahrenheit_defaults(self) -> None:
        storage = make_storage(
            FAHRENHEIT,
            {
                TEMPERATURE_UNIT_KEY: FAHRENHEIT,
                "zones": {"climate.room": {"enabled": True, "schedule": {}}},
            },
        )

        await storage.async_load(["climate.room"])

        zone = storage.data["zones"]["climate.room"]
        self.assertEqual(zone["comfort"]["temperature_min"], 68.0)
        self.assertEqual(zone["comfort"]["temperature_max"], 75.0)
        self.assertEqual(zone["preconditioning"]["minimum_delta_temperature"], 1.0)
        self.assertEqual(zone["preconditioning"]["room_sensor_assist_deadband"], 1.0)
        self.assertEqual(zone["preconditioning"]["fallback_minutes_per_degree"], 14.0)

    async def test_storage_migrates_absent_room_assist_deadband_from_legacy_delta(
        self,
    ) -> None:
        for unit, legacy_delta in (
            (CELSIUS, 0.35),
            (CELSIUS, 0.7),
            (FAHRENHEIT, 2.0),
        ):
            with self.subTest(unit=unit):
                raw = {
                    TEMPERATURE_UNIT_KEY: unit,
                    "zones": {
                        "climate.room": {
                            "enabled": True,
                            "schedule": {},
                            "preconditioning": {
                                "minimum_delta_temperature": legacy_delta
                            },
                        }
                    },
                }
                storage = make_storage(unit, raw)
                await storage.async_load(["climate.room"])
                self.assertEqual(
                    storage.data["zones"]["climate.room"]["preconditioning"][
                        "room_sensor_assist_deadband"
                    ],
                    legacy_delta,
                )

    async def test_storage_repairs_explicit_corrupt_deadband_to_native_default(
        self,
    ) -> None:
        for unit, raw_value, expected in (
            (CELSIUS, None, 0.3),
            (CELSIUS, -1, 0.3),
            (FAHRENHEIT, "invalid", 1.0),
            (FAHRENHEIT, float("inf"), 1.0),
            (FAHRENHEIT, 0, 0.0),
        ):
            with self.subTest(unit=unit, raw_value=raw_value):
                storage = make_storage(
                    unit,
                    {
                        TEMPERATURE_UNIT_KEY: unit,
                        "zones": {
                            "climate.room": {
                                "enabled": True,
                                "schedule": {},
                                "preconditioning": {
                                    "minimum_delta_temperature": 2,
                                    "room_sensor_assist_deadband": raw_value,
                                },
                            }
                        },
                    },
                )
                await storage.async_load(["climate.room"])
                self.assertEqual(
                    storage.data["zones"]["climate.room"]["preconditioning"][
                        "room_sensor_assist_deadband"
                    ],
                    expected,
                )

    async def test_migration_converts_all_thermal_kinds_and_is_idempotent(self) -> None:
        storage = make_storage(FAHRENHEIT, runtime_celsius_data())
        await storage.async_load(["climate.room"])

        applied = await storage.async_resolve_temperature_migration(
            CELSIUS, migration_id="migration-1", expected_revision=0
        )

        self.assertTrue(applied)
        zone = storage.data["zones"]["climate.room"]
        self.assertEqual(zone["schedule"]["monday"][0]["temperature"], 69.8)
        self.assertEqual(zone["override"]["temperature"], 71.6)
        self.assertEqual(zone["comfort"]["temperature_min"], 68.0)
        self.assertEqual(zone["comfort"]["temperature_max"], 75.0)
        self.assertAlmostEqual(zone["preconditioning"]["minimum_delta_temperature"], 0.5)
        self.assertAlmostEqual(zone["preconditioning"]["room_sensor_assist_deadband"], 0.54)
        self.assertAlmostEqual(zone["preconditioning"]["room_sensor_assist_max_delta"], 3.6)
        self.assertAlmostEqual(
            zone["preconditioning"]["fallback_minutes_per_degree"], 13.9
        )
        self.assertEqual(storage.data["templates"][0]["blocks"][0]["temperature"], 69.8)
        self.assertEqual(storage.data["settings"]["min_temperature"], 41.0)
        observation = storage.data["preconditioning_learning"]["climate.room"]["heat"]["observations"][0]
        self.assertEqual(observation["target_temp"], 69.8)
        self.assertAlmostEqual(observation["delta_t"], 5.4)
        self.assertEqual(storage._store.data[TEMPERATURE_UNIT_KEY], FAHRENHEIT)
        self.assertEqual(storage._store.data[TEMPERATURE_REVISION_KEY], 1)
        self.assertEqual(
            storage._store.data[LAST_TEMPERATURE_MIGRATION_KEY]["migration_id"],
            "migration-1",
        )

        snapshot = deepcopy(storage.data)
        self.assertFalse(
            await storage.async_resolve_temperature_migration(
                CELSIUS, migration_id="migration-1", expected_revision=0
            )
        )
        self.assertEqual(storage.data, snapshot)

    async def test_migrated_template_uses_managed_climate_step(self) -> None:
        raw = runtime_celsius_data()
        raw["templates"][0]["blocks"][0]["temperature"] = 20.3
        state = SimpleNamespace(
            attributes={"min_temp": 45, "max_temp": 90, "target_temp_step": 1}
        )
        storage = make_storage(FAHRENHEIT, raw)
        storage._hass.states = SimpleNamespace(get=lambda _entity_id: state)
        await storage.async_load(["climate.room"])

        await storage.async_resolve_temperature_migration(
            CELSIUS, migration_id="template-grid", expected_revision=0
        )

        self.assertEqual(
            storage.data["templates"][0]["blocks"][0]["temperature"],
            69.0,
        )

    async def test_migration_converts_schedules_with_stale_celsius_climate_grid(self) -> None:
        raw = runtime_celsius_data()
        raw["templates"][0]["blocks"][0]["temperature"] = 20.3
        stale_state = SimpleNamespace(
            attributes={"min_temp": 5, "max_temp": 35, "target_temp_step": 0.5}
        )
        storage = make_storage(FAHRENHEIT, raw)
        storage._hass.states = SimpleNamespace(get=lambda _entity_id: stale_state)
        await storage.async_load(["climate.room"])

        await storage.async_resolve_temperature_migration(
            CELSIUS, migration_id="stale-climate-grid", expected_revision=0
        )

        zone = storage.data["zones"]["climate.room"]
        self.assertEqual(zone["schedule"]["monday"][0]["temperature"], 70.0)
        self.assertEqual(storage.data["templates"][0]["blocks"][0]["temperature"], 68.5)

    async def test_migrated_template_step_uses_zero_anchored_grid(self) -> None:
        raw = runtime_celsius_data()
        raw["templates"][0]["blocks"][0]["temperature"] = 20.3
        state = SimpleNamespace(
            attributes={"min_temp": 45.5, "max_temp": 90, "target_temp_step": 1}
        )
        storage = make_storage(FAHRENHEIT, raw)
        storage._hass.states = SimpleNamespace(get=lambda _entity_id: state)
        await storage.async_load(["climate.room"])

        await storage.async_resolve_temperature_migration(
            CELSIUS, migration_id="template-grid-anchor", expected_revision=0
        )

        self.assertEqual(
            storage.data["templates"][0]["blocks"][0]["temperature"],
            69.0,
        )

    async def test_migrated_template_is_not_snapped_for_mixed_entity_steps(self) -> None:
        raw = runtime_celsius_data()
        raw["zones"]["climate.second"] = deepcopy(raw["zones"]["climate.room"])
        raw["templates"][0]["blocks"][0]["temperature"] = 20.3
        states = {
            "climate.room": SimpleNamespace(
                attributes={"min_temp": 41, "max_temp": 95, "target_temp_step": 0.2}
            ),
            "climate.second": SimpleNamespace(
                attributes={"min_temp": 41, "max_temp": 95, "target_temp_step": 0.5}
            ),
        }
        storage = make_storage(FAHRENHEIT, raw)
        storage._hass.states = SimpleNamespace(get=states.get)
        await storage.async_load(["climate.room", "climate.second"])

        await storage.async_resolve_temperature_migration(
            CELSIUS, migration_id="mixed-template-steps", expected_revision=0
        )

        self.assertEqual(
            storage.data["templates"][0]["blocks"][0]["temperature"],
            68.5,
        )

    async def test_migration_rounds_editable_targets_to_tenth_without_step(self) -> None:
        raw = runtime_celsius_data()
        raw["zones"]["climate.room"]["schedule"]["monday"][0]["temperature"] = 20.3
        raw["zones"]["climate.room"]["override"]["temperature"] = 20.3
        raw["templates"][0]["blocks"][0]["temperature"] = 20.3
        observation = raw["preconditioning_learning"]["climate.room"]["heat"][
            "observations"
        ][0]
        observation["target_temp"] = 20.123456
        observation["target_temp_low"] = 20
        observation["target_temp_high"] = 24
        observation["target_boundary"] = "low"
        state = SimpleNamespace(attributes={"min_temp": 41.04, "max_temp": 95})
        storage = make_storage(FAHRENHEIT, raw)
        storage._hass.states = SimpleNamespace(get=lambda _entity_id: state)
        await storage.async_load(["climate.room"])

        await storage.async_resolve_temperature_migration(
            CELSIUS, migration_id="no-step-rounding", expected_revision=0
        )

        zone = storage.data["zones"]["climate.room"]
        self.assertEqual(zone["schedule"]["monday"][0]["temperature"], 68.5)
        self.assertEqual(zone["override"]["temperature"], 68.5)
        self.assertEqual(storage.data["templates"][0]["blocks"][0]["temperature"], 68.5)
        self.assertEqual(
            storage.data["preconditioning_learning"]["climate.room"]["heat"][
                "observations"
            ][0]["target_temp"],
            68.222221,
        )
        converted_observation = storage.data["preconditioning_learning"][
            "climate.room"
        ]["heat"]["observations"][0]
        self.assertEqual(converted_observation["target_temp_low"], 68)
        self.assertEqual(converted_observation["target_temp_high"], 75.2)
        self.assertEqual(converted_observation["target_boundary"], "low")

        raw_boundary = runtime_celsius_data()
        raw_boundary["zones"]["climate.room"]["schedule"]["monday"][0][
            "temperature"
        ] = 5
        boundary_storage = make_storage(FAHRENHEIT, raw_boundary)
        boundary_storage._hass.states = SimpleNamespace(get=lambda _entity_id: state)
        await boundary_storage.async_load(["climate.room"])
        await boundary_storage.async_resolve_temperature_migration(
            CELSIUS, migration_id="no-step-boundary", expected_revision=0
        )
        self.assertEqual(
            boundary_storage.data["zones"]["climate.room"]["schedule"][
                "monday"
            ][0]["temperature"],
            41.1,
        )

    async def test_normal_save_before_migration_cannot_overwrite_migrated_data(self) -> None:
        storage = make_storage(CELSIUS, legacy_celsius_data())
        await storage.async_load(["climate.room"])
        storage._hass.config.units.temperature_unit = FAHRENHEIT
        gated = GatedStore()
        storage._store = gated

        normal_save = asyncio.create_task(storage.async_save())
        await gated.first_started.wait()
        migration = asyncio.create_task(storage.async_resolve_temperature_migration(
            CELSIUS, migration_id="normal-first", expected_revision=0
        ))
        await asyncio.sleep(0)
        gated.release_first.set()
        await asyncio.gather(normal_save, migration)

        self.assertEqual(gated.saved[-1][TEMPERATURE_UNIT_KEY], FAHRENHEIT)
        self.assertEqual(gated.saved[-1][TEMPERATURE_REVISION_KEY], 1)
        self.assertEqual(
            gated.saved[-1]["zones"]["climate.room"]["schedule"]["monday"][0]["temperature"],
            69.8,
        )

    async def test_migration_before_normal_save_keeps_converted_revision(self) -> None:
        storage = make_storage(CELSIUS, legacy_celsius_data())
        await storage.async_load(["climate.room"])
        storage._hass.config.units.temperature_unit = FAHRENHEIT
        gated = GatedStore()
        storage._store = gated

        migration = asyncio.create_task(storage.async_resolve_temperature_migration(
            CELSIUS, migration_id="migration-first", expected_revision=0
        ))
        await gated.first_started.wait()
        normal_save = asyncio.create_task(storage.async_save())
        await asyncio.sleep(0)
        gated.release_first.set()
        await asyncio.gather(migration, normal_save)

        self.assertEqual(len(gated.saved), 2)
        self.assertEqual(gated.saved[-1][TEMPERATURE_UNIT_KEY], FAHRENHEIT)
        self.assertEqual(gated.saved[-1][TEMPERATURE_REVISION_KEY], 1)
        self.assertEqual(
            gated.saved[-1]["zones"]["climate.room"]["schedule"]["monday"][0]["temperature"],
            69.8,
        )

    async def test_stale_revision_is_rejected(self) -> None:
        storage = make_storage(FAHRENHEIT, runtime_celsius_data())
        await storage.async_load(["climate.room"])

        with self.assertRaisesRegex(ValueError, "reload Velair"):
            await storage.async_resolve_temperature_migration(
                CELSIUS, migration_id="migration-2", expected_revision=1
            )

    async def test_failed_persist_never_publishes_migrated_runtime(self) -> None:
        storage = make_storage(FAHRENHEIT, runtime_celsius_data())
        await storage.async_load(["climate.room"])
        snapshot = deepcopy(storage.data)
        storage._store.fail_save = True

        with self.assertRaises(OSError):
            await storage.async_resolve_temperature_migration(
                CELSIUS, migration_id="migration-3", expected_revision=0
            )

        self.assertEqual(storage.data, snapshot)
        self.assertEqual(storage.effective_temperature_unit, CELSIUS)
        self.assertEqual(storage.temperature_migration_status()["temperature_revision"], 0)

    async def test_failed_legacy_reset_keeps_source_metadata_and_runtime(self) -> None:
        storage = make_storage(FAHRENHEIT, legacy_celsius_data())
        await storage.async_load(["climate.room"])
        snapshot = deepcopy(storage.data)
        storage._store.fail_save = True

        with self.assertRaises(OSError):
            await storage.async_reset_to_defaults()

        self.assertEqual(storage.data, snapshot)
        self.assertEqual(storage.effective_temperature_unit, CELSIUS)
        self.assertTrue(storage.legacy_temperature_reset_required)


if __name__ == "__main__":
    unittest.main()
