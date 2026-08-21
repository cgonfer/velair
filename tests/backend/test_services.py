"""Home Assistant service boundary tests."""

from __future__ import annotations

from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock

import voluptuous as vol

from custom_components.velair.const import (
    DOMAIN,
    SERVICE_ACTIVATE_PROFILE,
    SERVICE_DEACTIVATE_PROFILE,
    SERVICE_PAUSE_ZONE,
    SERVICE_RESUME_ZONE,
    SERVICE_SET_EXTERNAL_CHANGE_POLICY,
    SERVICE_ENTER_MANUAL_ADJUSTMENT,
    SERVICE_RESUME_AUTOMATIC_CONTROL,
)
from custom_components.velair.services import (
    HomeAssistantError,
    _validate_pause_id,
    RESUME_ZONE_SCHEMA,
    async_setup_services,
    async_unload_services,
)


class _ServiceRegistry:
    def __init__(self) -> None:
        self.handlers: dict[tuple[str, str], tuple[object, object]] = {}
        self.removed: list[tuple[str, str]] = []

    def has_service(self, domain: str, service: str) -> bool:
        return (domain, service) in self.handlers

    def async_register(self, domain, service, handler, *, schema=None) -> None:
        self.handlers[(domain, service)] = (handler, schema)

    def async_remove(self, domain: str, service: str) -> None:
        self.removed.append((domain, service))


class ClimateProfileServiceTest(unittest.IsolatedAsyncioTestCase):
    """Verify registration, schema, forwarding, and error mapping."""

    def setUp(self) -> None:
        self.scheduler = SimpleNamespace(
            async_activate_profile=AsyncMock(),
            async_deactivate_profile=AsyncMock(),
            async_pause_zone=AsyncMock(),
            async_resume_zone=AsyncMock(),
            async_update_external_change_policy=AsyncMock(),
            async_enter_manual_adjustment=AsyncMock(),
            async_resume_automatic_control=AsyncMock(),
            ensure_managed_entity=Mock(),
            set_temperature_migration_blocked=Mock(),
            temperature_migration_blocked=False,
        )
        self.services = _ServiceRegistry()
        self.hass = SimpleNamespace(
            services=self.services,
            data={
                DOMAIN: {
                    "entry": {
                        "scheduler": self.scheduler,
                        "storage": SimpleNamespace(
                            temperature_migration_required=False
                        ),
                        "operation_active": None,
                        "operation_recovery": None,
                    }
                }
            },
        )

    async def test_activate_profile_service_accepts_id_or_normal_and_unloads(self) -> None:
        await async_setup_services(self.hass)
        handler, schema = self.services.handlers[(DOMAIN, SERVICE_ACTIVATE_PROFILE)]

        await handler(SimpleNamespace(data=schema({"profile_id": "away"})))
        await handler(SimpleNamespace(data=schema({})))

        deactivate_handler, _schema = self.services.handlers[
            (DOMAIN, SERVICE_DEACTIVATE_PROFILE)
        ]
        await deactivate_handler(SimpleNamespace(data={}))

        self.assertEqual(
            self.scheduler.async_activate_profile.await_args_list[0].args,
            ("away",),
        )
        self.assertEqual(
            self.scheduler.async_activate_profile.await_args_list[0].kwargs,
            {"source": "service"},
        )
        self.assertEqual(
            self.scheduler.async_activate_profile.await_args_list[1].args,
            (None,),
        )
        self.assertEqual(
            self.scheduler.async_activate_profile.await_args_list[1].kwargs,
            {"source": "service"},
        )
        self.scheduler.async_deactivate_profile.assert_awaited_once_with(
            source="service"
        )
        await async_unload_services(self.hass)
        self.assertIn((DOMAIN, SERVICE_ACTIVATE_PROFILE), self.services.removed)
        self.assertIn((DOMAIN, SERVICE_DEACTIVATE_PROFILE), self.services.removed)

    async def test_activate_profile_service_maps_scheduler_validation_errors(self) -> None:
        await async_setup_services(self.hass)
        handler, schema = self.services.handlers[(DOMAIN, SERVICE_ACTIVATE_PROFILE)]
        self.scheduler.async_activate_profile.side_effect = ValueError("unknown profile")

        with self.assertRaisesRegex(HomeAssistantError, "unknown profile"):
            await handler(SimpleNamespace(data=schema({"profile_id": "missing"})))

    async def test_pause_and_resume_zone_forward_optional_pause_id(self) -> None:
        await async_setup_services(self.hass)
        pause_handler, pause_schema = self.services.handlers[
            (DOMAIN, SERVICE_PAUSE_ZONE)
        ]
        resume_handler, resume_schema = self.services.handlers[
            (DOMAIN, SERVICE_RESUME_ZONE)
        ]

        await pause_handler(
            SimpleNamespace(
                data=pause_schema(
                    {
                        "entity_id": "climate.salon",
                        "action": "none",
                        "pause_id": "window_guard",
                    }
                )
            )
        )
        await resume_handler(
            SimpleNamespace(
                data=resume_schema(
                    {
                        "entity_id": "climate.salon",
                        "apply_current_schedule": True,
                        "pause_id": "window_guard",
                    }
                )
            )
        )

        self.scheduler.async_pause_zone.assert_awaited_once_with(
            "climate.salon",
            until=None,
            action="none",
            pause_id="window_guard",
        )
        self.scheduler.async_resume_zone.assert_awaited_once_with(
            "climate.salon",
            apply_current_schedule=True,
            pause_id="window_guard",
            reason="service",
        )

    def test_pause_id_service_validation(self) -> None:
        self.assertEqual(_validate_pause_id(" owner:zone-1 "), "owner:zone-1")
        for value in ("", "_owner", "owner with spaces", "x" * 129):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    _validate_pause_id(value)

    async def test_external_policy_service_does_not_inject_default_duration(self) -> None:
        await async_setup_services(self.hass)
        handler, schema = self.services.handlers[
            (DOMAIN, SERVICE_SET_EXTERNAL_CHANGE_POLICY)
        ]

        await handler(
            SimpleNamespace(
                data=schema(
                    {
                        "entity_id": "climate.salon",
                        "policy": "keep_automatic",
                    }
                )
            )
        )

        self.scheduler.async_update_external_change_policy.assert_awaited_once_with(
            "climate.salon",
            {"action": "keep_automatic"},
        )

    async def test_enter_manual_adjustment_accepts_only_entity_id(self) -> None:
        await async_setup_services(self.hass)
        handler, schema = self.services.handlers[(DOMAIN, SERVICE_ENTER_MANUAL_ADJUSTMENT)]

        await handler(SimpleNamespace(data=schema({"entity_id": "climate.salon"})))
        self.scheduler.async_enter_manual_adjustment.assert_awaited_once_with("climate.salon")
        for legacy_field, value in (("policy", "for_duration"), ("duration_minutes", 45)):
            with self.subTest(field=legacy_field):
                with self.assertRaises(vol.Invalid):
                    schema({"entity_id": "climate.salon", legacy_field: value})

    async def test_enter_manual_adjustment_service_is_blocked_during_temperature_migration(self) -> None:
        await async_setup_services(self.hass)
        handler, schema = self.services.handlers[(DOMAIN, SERVICE_ENTER_MANUAL_ADJUSTMENT)]
        self.hass.data[DOMAIN]["entry"]["storage"].temperature_migration_required = True
        self.scheduler.temperature_migration_blocked = True

        with self.assertRaisesRegex(HomeAssistantError, "temperature-data migration"):
            await handler(SimpleNamespace(data=schema({"entity_id": "climate.salon"})))

        self.scheduler.async_enter_manual_adjustment.assert_not_awaited()

    async def test_resume_automatic_service_is_blocked_during_temperature_migration(self) -> None:
        await async_setup_services(self.hass)
        handler, schema = self.services.handlers[(DOMAIN, SERVICE_RESUME_AUTOMATIC_CONTROL)]
        self.hass.data[DOMAIN]["entry"]["storage"].temperature_migration_required = True
        self.scheduler.temperature_migration_blocked = True

        with self.assertRaisesRegex(HomeAssistantError, "temperature-data migration"):
            await handler(SimpleNamespace(data=schema({"entity_id": "climate.salon"})))

        self.scheduler.async_resume_automatic_control.assert_not_awaited()

    def test_resume_zone_rejects_ambiguous_resume_all_values(self) -> None:
        with self.assertRaises(vol.Invalid):
            RESUME_ZONE_SCHEMA(
                {
                    "entity_id": "climate.salon",
                    "pause_id": "window",
                    "resume_all": True,
                }
            )
        with self.assertRaises(vol.Invalid):
            RESUME_ZONE_SCHEMA(
                {"entity_id": "climate.salon", "resume_all": False}
            )
