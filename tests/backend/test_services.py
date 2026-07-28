"""Home Assistant service boundary tests."""

from __future__ import annotations

from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock

from custom_components.velair.const import (
    DOMAIN,
    SERVICE_ACTIVATE_PROFILE,
    SERVICE_DEACTIVATE_PROFILE,
)
from custom_components.velair.services import (
    HomeAssistantError,
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
