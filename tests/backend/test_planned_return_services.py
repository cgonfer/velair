"""HA action boundaries for one-off returns, including local DST wall times."""
from datetime import datetime, UTC
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch
from zoneinfo import ZoneInfo

from . import helpers as _helpers  # noqa: F401
from .test_services import _ServiceRegistry
from . import test_planned_return_runtime as runtime_tests
from custom_components.velair.const import DOMAIN, SERVICE_START_PLANNED_RETURN, SERVICE_CANCEL_PLANNED_RETURN
from custom_components.velair import services as service_module


class PlannedReturnServiceTest(unittest.IsolatedAsyncioTestCase):
    async def test_optional_immediate_away_boolean_reaches_scheduler(self):
        handler, schema = self.registry.handlers[(DOMAIN, SERVICE_START_PLANNED_RETURN)]
        now = datetime(2026, 10, 7, 12, tzinfo=UTC)
        for flag in (False, True):
            with self.subTest(flag=flag), patch.object(service_module.dt_util, 'now', return_value=now):
                self.scheduler.async_start_planned_return.reset_mock()
                await handler(SimpleNamespace(data=schema({'return_date': '2026-10-07',
                    'return_time': '19:25', 'apply_away_now': flag})))
                self.scheduler.async_start_planned_return.assert_awaited_once_with('2026-10-07T19:25:00+00:00', apply_away_now=flag)
        for invalid in ('true', 1, None):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                schema({'return_date': '2026-10-07', 'return_time': '19:25', 'apply_away_now': invalid})

    async def asyncSetUp(self):
        self.scheduler = SimpleNamespace(
            async_start_planned_return=AsyncMock(), async_cancel_planned_return=AsyncMock(),
            set_temperature_migration_blocked=Mock(), temperature_migration_blocked=False,
        )
        self.registry = _ServiceRegistry()
        self.hass = SimpleNamespace(services=self.registry, data={DOMAIN: {'entry': {
            'scheduler': self.scheduler, 'storage': SimpleNamespace(temperature_migration_required=False),
        }}})
        await service_module.async_setup_services(self.hass)

    async def call_start(self, now, value, return_date=None):
        handler, schema = self.registry.handlers[(DOMAIN, SERVICE_START_PLANNED_RETURN)]
        with patch.object(service_module.dt_util, 'now', return_value=now):
            await handler(SimpleNamespace(data=schema({'return_date': return_date or now.date().isoformat(), 'return_time': value})))

    def test_schema_accepts_time_selector_and_rejects_invalid_inputs(self):
        schema = service_module.START_PLANNED_RETURN_SCHEMA
        self.assertEqual(schema({'return_date': '2026-05-19', 'return_time': '19:25:00'}), {'return_date': '2026-05-19', 'return_time': '19:25'})
        self.assertEqual(schema({'return_date': '2026-05-19', 'return_time': '00:00'}), {'return_date': '2026-05-19', 'return_time': '00:00'})
        for value in ('9:25', '24:00', '12:60', '19:25:01', '19:25:00.000', '19:25:00.001', '19:25Z', '', None, 1925):
            with self.subTest(value=value), self.assertRaises(ValueError):
                schema({'return_date': '2026-05-19', 'return_time': value})
        for data in ({}, {'return_date': '2026-05-19', 'return_time': '19:25', 'entity_id': 'climate.other'}):
            with self.subTest(data=data), self.assertRaises(ValueError):
                schema(data)
        with self.assertRaises(ValueError):
            service_module.CANCEL_PLANNED_RETURN_SCHEMA({'return_date': '2026-05-19', 'return_time': '19:25'})

    async def test_local_today_is_forwarded_as_utc(self):
        now = datetime(2026, 10, 7, 18, tzinfo=ZoneInfo('Europe/Madrid'))
        await self.call_start(now, '19:25:00')
        self.scheduler.async_start_planned_return.assert_awaited_once_with('2026-10-07T17:25:00+00:00')

    async def test_past_or_current_time_rejected_without_start(self):
        now = datetime(2026, 10, 7, 18, 25, tzinfo=ZoneInfo('Europe/Madrid'))
        for value in ('18:24', '18:25', '00:00'):
            with self.subTest(value=value), self.assertRaisesRegex(service_module.HomeAssistantError, 'valid and in the future'):
                await self.call_start(now, value)
        self.scheduler.async_start_planned_return.assert_not_awaited()

    async def test_dst_repeated_hour_uses_next_future_occurrence(self):
        now = datetime(2026, 10, 25, 2, 45, tzinfo=ZoneInfo('Europe/Madrid'), fold=0)
        await self.call_start(now, '02:30')
        self.scheduler.async_start_planned_return.assert_awaited_once_with('2026-10-25T01:30:00+00:00')

    async def test_dst_nonexistent_hour_rejected(self):
        now = datetime(2026, 3, 29, 1, tzinfo=ZoneInfo('Europe/Madrid'))
        with self.assertRaisesRegex(service_module.HomeAssistantError, 'valid and in the future'):
            await self.call_start(now, '02:30')
        self.scheduler.async_start_planned_return.assert_not_awaited()

    async def test_runtime_validation_error_is_reported_and_cancel_delegates(self):
        self.scheduler.async_start_planned_return.side_effect = ValueError('Occupancy entity is unavailable')
        with self.assertRaisesRegex(service_module.HomeAssistantError, 'Occupancy entity is unavailable'):
            await self.call_start(datetime(2026, 10, 7, 12, tzinfo=UTC), '19:25')
        handler, schema = self.registry.handlers[(DOMAIN, SERVICE_CANCEL_PLANNED_RETURN)]
        await handler(SimpleNamespace(data=schema({})))
        self.scheduler.async_cancel_planned_return.assert_awaited_once_with()
        self.scheduler.async_cancel_planned_return.side_effect = ValueError('There is no planned return to cancel')
        with self.assertRaisesRegex(service_module.HomeAssistantError, 'no planned return'):
            await handler(SimpleNamespace(data={}))

    async def test_future_date_allows_earlier_wall_time_and_rejects_past_date(self):
        now = datetime(2026, 10, 7, 18, tzinfo=ZoneInfo('Europe/Madrid'))
        await self.call_start(now, '09:00', '2026-10-09')
        self.scheduler.async_start_planned_return.assert_awaited_once_with('2026-10-09T07:00:00+00:00')
        with self.assertRaisesRegex(service_module.HomeAssistantError, 'in the future'):
            await self.call_start(now, '19:00', '2026-10-06')

    async def test_cancel_is_available_during_temperature_migration_only(self):
        runtime = self.hass.data[DOMAIN]['entry']
        runtime['storage'].temperature_migration_required = True
        self.scheduler.temperature_migration_blocked = True
        handler, _ = self.registry.handlers[(DOMAIN, SERVICE_CANCEL_PLANNED_RETURN)]
        await handler(SimpleNamespace(data={}))
        self.scheduler.async_cancel_planned_return.assert_awaited_once_with()
        runtime['operation_active'] = 'portable_import'
        with self.assertRaises(service_module.HomeAssistantError):
            await handler(SimpleNamespace(data={}))

    def test_return_date_is_required_valid_and_strict(self):
        for value in ('2026-02-30', '2026-13-01', '26-10-09', '2026-1-9', '', None):
            with self.subTest(value=value), self.assertRaises(ValueError):
                service_module.START_PLANNED_RETURN_SCHEMA({'return_date': value, 'return_time': '19:25'})
        with self.assertRaises(ValueError):
            service_module.START_PLANNED_RETURN_SCHEMA({'return_time': '19:25'})

    async def test_future_dst_overlap_uses_earliest_occurrence(self):
        now = datetime(2026, 10, 24, 18, tzinfo=ZoneInfo('Europe/Madrid'))
        await self.call_start(now, '02:30', '2026-10-25')
        self.scheduler.async_start_planned_return.assert_awaited_once_with('2026-10-25T00:30:00+00:00')

    async def test_registration_idempotent_and_unload_removes_both(self):
        original = self.registry.handlers[(DOMAIN, SERVICE_START_PLANNED_RETURN)]
        await service_module.async_setup_services(self.hass)
        self.assertIs(self.registry.handlers[(DOMAIN, SERVICE_START_PLANNED_RETURN)], original)
        await service_module.async_unload_services(self.hass)
        for name in (SERVICE_START_PLANNED_RETURN, SERVICE_CANCEL_PLANNED_RETURN):
            self.assertIn((DOMAIN, name), self.registry.removed)


class PlannedReturnServiceRuntimeTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.fixture = runtime_tests.PlannedReturnRuntimeTest(methodName='test_departure_and_restart_fulfilled_latch')
        await self.fixture.asyncSetUp()
        self.scheduler = self.fixture.scheduler
        self.data = self.fixture.data
        self.hass = self.fixture.hass
        self.hass.services = _ServiceRegistry()
        self.hass.data = {DOMAIN: {'entry': {
            'scheduler': self.scheduler, 'storage': SimpleNamespace(temperature_migration_required=False),
        }}}
        config = dict(self.data['planned_return'], enabled=False)
        await self.scheduler.async_update_planned_return(config)
        self.hass.states['binary_sensor.occupied'].state = 'unknown'
        await service_module.async_setup_services(self.hass)

    async def asyncTearDown(self):
        await self.fixture.asyncTearDown()

    async def test_disabled_weekly_unknown_presence_arms_and_cancels_without_mode_change(self):
        handler, schema = self.hass.services.handlers[(DOMAIN, SERVICE_START_PLANNED_RETURN)]
        await handler(SimpleNamespace(data=schema({'return_date': '2026-05-19', 'return_time': '19:25'})))
        self.assertEqual(self.data['planned_return_episode']['state'], 'armed')
        self.assertEqual(self.data['planned_return_episode']['origin'], 'manual')
        self.assertIsNone(self.scheduler.active_mode_id)
        handler, schema = self.hass.services.handlers[(DOMAIN, SERVICE_CANCEL_PLANNED_RETURN)]
        await handler(SimpleNamespace(data=schema({})))
        self.assertEqual(self.data['planned_return_episode']['state'], 'cancelled')
        self.assertTrue(self.data['planned_return_episode']['dismissed'])
        self.assertIsNone(self.scheduler.active_mode_id)

    async def test_stopped_scheduler_rejects_and_missing_source_rejects(self):
        handler, schema = self.hass.services.handlers[(DOMAIN, SERVICE_START_PLANNED_RETURN)]
        self.scheduler._stopped = True
        with self.assertRaises(service_module.HomeAssistantError):
            await handler(SimpleNamespace(data=schema({'return_date': '2026-05-19', 'return_time': '19:25'})))
        self.scheduler._stopped = False
        del self.hass.states['binary_sensor.occupied']
        with self.assertRaisesRegex(service_module.HomeAssistantError, 'Occupancy entity is unavailable'):
            await handler(SimpleNamespace(data=schema({'return_date': '2026-05-19', 'return_time': '19:25'})))
        self.assertIsNone(self.data['planned_return_episode'])
