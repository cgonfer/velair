"""Immediate manual Away keeps presence arrival behind confirmed absence."""
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from . import test_planned_return_runtime as runtime_tests
from .helpers import NOW, VelairScheduler, normalize_schedule_data, scheduler_module


class ImmediateAwayTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.fixture = runtime_tests.PlannedReturnRuntimeTest(
            methodName='test_departure_and_restart_fulfilled_latch')
        await self.fixture.asyncSetUp()
        self.scheduler = self.fixture.scheduler
        self.runtime = self.fixture.runtime
        self.data = self.fixture.data
        self.hass = self.fixture.hass
        self.climate = self.fixture.climate
        self.save = self.fixture.save

    async def asyncTearDown(self):
        await self.fixture.asyncTearDown()

    async def begin(self, *, delay=10, presence='on', immediate=True):
        self.hass.states['binary_sensor.occupied'].state = presence
        await self.scheduler.async_update_planned_return(
            self.runtime.config | {'enabled': False, 'absence_delay_minutes': delay})
        arrival = NOW + timedelta(hours=4)
        self.climate.calls.clear()
        await self.scheduler.async_start_planned_return(arrival.isoformat(), apply_away_now=immediate)
        return arrival

    async def observe(self, minute, presence):
        instant = NOW + timedelta(minutes=minute)
        with patch.object(scheduler_module.dt_util, 'now', return_value=instant):
            self.hass.states['binary_sensor.occupied'].state = presence
            self.runtime._state_changed(SimpleNamespace(data={'entity_id': 'binary_sensor.occupied'}))
            await self.runtime._tick(instant, self.runtime._generation)

    async def test_default_keeps_waiting_without_applying_away(self):
        await self.begin(immediate=False)
        self.assertEqual(self.runtime.episode['state'], 'armed')
        self.assertIsNone(self.scheduler.active_mode_id)
        self.assertEqual(self.climate.calls, [])
        self.assertFalse(self.runtime.status()['awaiting_departure_confirmation'])

    async def test_short_exit_resets_delay_and_long_exit_enables_early_return(self):
        await self.begin()
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        self.assertEqual(self.climate.calls, [('turn_off', 'climate.salon')])
        initial = deepcopy(self.runtime.episode)
        await self.observe(1, 'on')
        self.assertEqual(self.runtime.episode['state'], 'away')
        self.assertFalse(self.runtime.suppress_departure_delivery())
        await self.observe(10, 'off')
        self.assertEqual(self.runtime._confirmation, NOW + timedelta(minutes=20))
        self.assertEqual(self.runtime.status()['state'], 'away')
        await self.observe(15, 'on')
        self.assertIsNone(self.runtime._confirmation)
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        await self.observe(30, 'off')
        await self.observe(39, 'off')
        self.assertTrue(self.runtime.awaiting_departure_confirmation())
        calls = len(self.climate.calls)
        await self.observe(40, 'off')
        self.assertFalse(self.runtime.awaiting_departure_confirmation())
        self.assertEqual(self.runtime.episode['departure_at'], initial['departure_at'])
        self.assertEqual(self.runtime.episode['previous_selection'], initial['previous_selection'])
        self.assertEqual(len(self.climate.calls), calls)
        await self.observe(50, 'on')
        self.assertIsNone(self.scheduler.active_mode_id)
        self.assertIsNone(self.runtime.episode)

    async def test_unknown_and_another_present_source_reset_confirmation(self):
        await self.begin(presence='unknown')
        self.hass.states['input_boolean.guest'] = SimpleNamespace(state='on', attributes={})
        config = self.runtime.config | {'occupancy_entity_ids': ['binary_sensor.occupied', 'input_boolean.guest']}
        # Configure both sources before the fresh explicit request.
        await self.scheduler.async_cancel_planned_return()
        await self.scheduler.async_update_planned_return(config)
        await self.scheduler.async_start_planned_return((NOW + timedelta(hours=4)).isoformat(), apply_away_now=True)
        await self.observe(1, 'off')
        self.assertIsNone(self.runtime._confirmation)
        self.hass.states['input_boolean.guest'].state = 'off'
        await self.observe(2, 'off')
        self.assertIsNotNone(self.runtime._confirmation)
        await self.observe(5, 'unavailable')
        self.assertIsNone(self.runtime._confirmation)
        await self.observe(6, 'off')
        self.assertEqual(self.runtime._confirmation, NOW + timedelta(minutes=16))
        await self.observe(15, 'off')
        self.assertTrue(self.runtime.awaiting_departure_confirmation())
        await self.observe(16, 'off')
        self.assertFalse(self.runtime.awaiting_departure_confirmation())

    async def test_zero_delay_still_needs_observed_absence(self):
        await self.begin(delay=0)
        await self.observe(1, 'on')
        self.assertTrue(self.runtime.awaiting_departure_confirmation())
        await self.observe(2, 'off')
        self.assertFalse(self.runtime.awaiting_departure_confirmation())
        await self.observe(3, 'on')
        self.assertIsNone(self.scheduler.active_mode_id)

    async def test_preparation_and_deadline_work_while_still_home_in_heat_and_cool(self):
        for mode in ('heat', 'cool'):
            with self.subTest(mode=mode):
                self.data['zones']['climate.salon']['schedule']['tuesday'] = [
                    {'start': '00:00', 'temperature': 21, 'hvac_mode': mode}]
                arrival = await self.begin()
                self.climate.calls.clear()
                with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW, None)):
                    await self.runtime._tick(NOW, self.runtime._generation)
                    self.assertTrue(self.runtime.awaiting_departure_confirmation())
                    self.assertEqual(self.runtime.episode['preparing_entities'], ['climate.salon'])
                    self.assertTrue(any(call[0] == 'set_temperature' and call[2] == 21 for call in self.climate.calls))
                    self.assertEqual(self.runtime.target('climate.salon').hvac_mode, mode)
                with patch.object(scheduler_module.dt_util, 'now', return_value=arrival):
                    await self.runtime._tick(arrival, self.runtime._generation)
                self.assertEqual(self.runtime.episode['state'], 'fulfilled')
                self.assertNotIn('awaiting_departure_confirmation', self.runtime.episode)
                self.assertIsNone(self.scheduler.active_mode_id)

    async def test_restart_restarts_pending_delay_but_preserves_confirmed_departure(self):
        await self.begin()
        await self.observe(5, 'off')
        for confirmed in (False, True):
            with self.subTest(confirmed=confirmed):
                saved = normalize_schedule_data(deepcopy(self.data), ['climate.salon'])
                if confirmed:
                    saved['planned_return_episode'].pop('awaiting_departure_confirmation', None)
                    self.hass.states['binary_sensor.occupied'].state = 'on'
                later = NOW + timedelta(minutes=8)
                restored = VelairScheduler(self.hass, saved, self.climate, self.save)
                try:
                    with patch.object(scheduler_module.dt_util, 'now', return_value=later):
                        await restored.async_start()
                        runtime = restored._planned_return
                        if not confirmed:
                            self.assertEqual(runtime._confirmation, later + timedelta(minutes=10))
                            self.hass.states['binary_sensor.occupied'].state = 'on'
                            runtime.refresh()
                            await runtime._tick(later, runtime._generation)
                            self.assertEqual(runtime.episode['state'], 'away')
                            self.assertTrue(runtime.awaiting_departure_confirmation())
                        else:
                            await runtime._tick(later, runtime._generation)
                            self.assertIsNone(restored.active_mode_id)
                finally:
                    await restored.async_stop()

    async def test_repeated_start_preserves_gate_and_promotes_armed_atomically(self):
        arrival = await self.begin(immediate=False)
        original = deepcopy(self.runtime.episode)
        self.save.side_effect = OSError('storage failed')
        with self.assertRaises(OSError):
            await self.scheduler.async_start_planned_return((arrival + timedelta(hours=1)).isoformat(), apply_away_now=True)
        self.save.side_effect = None
        self.assertEqual(self.runtime.episode, original)
        self.assertIsNone(self.scheduler.active_mode_id)
        await self.scheduler.async_start_planned_return(arrival.isoformat(), apply_away_now=True)
        self.assertEqual(self.runtime.episode['previous_selection'], original['previous_selection'])
        self.assertTrue(self.runtime.awaiting_departure_confirmation())
        self.climate.calls.clear()
        for flag in (False, True):
            await self.scheduler.async_start_planned_return((arrival + timedelta(hours=1)).isoformat(), apply_away_now=flag)
            self.assertTrue(self.runtime.awaiting_departure_confirmation())
        self.assertEqual(self.climate.calls, [])

    async def test_manual_arrive_and_cancel_work_before_departure_confirmation(self):
        for action in ('arrive', 'cancel'):
            with self.subTest(action=action):
                await self.begin()
                await getattr(self.scheduler, f'async_{action}_planned_return')()
                self.assertIsNone(self.scheduler.active_mode_id)
                self.assertFalse(self.runtime.awaiting_departure_confirmation())

    async def test_skip_does_not_treat_initial_presence_as_return(self):
        await self.begin()
        await self.scheduler.async_skip_planned_return()
        await self.observe(1, 'on')
        self.assertEqual(self.runtime.episode['state'], 'skipped')
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        await self.observe(2, 'off')
        await self.observe(12, 'off')
        self.assertFalse(self.runtime.awaiting_departure_confirmation())
        await self.observe(13, 'on')
        self.assertIsNone(self.scheduler.active_mode_id)

    async def test_start_failure_restores_selection_and_sensorless_stays_unchanged(self):
        self.hass.states['binary_sensor.occupied'].state = 'on'
        await self.scheduler.async_update_planned_return(self.runtime.config | {'enabled': False})
        before = deepcopy(self.data)
        self.save.side_effect = OSError('storage failed')
        with self.assertRaises(OSError):
            await self.scheduler.async_start_planned_return((NOW + timedelta(hours=2)).isoformat(), apply_away_now=True)
        self.save.side_effect = None
        self.assertEqual(self.data['planned_return_episode'], before['planned_return_episode'])
        self.assertEqual(self.data['global_'], before['global_'])
        await self.scheduler.async_update_planned_return(self.runtime.config | {'occupancy_entity_ids': []})
        await self.scheduler.async_start_planned_return((NOW + timedelta(hours=2)).isoformat(), apply_away_now=True)
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        self.assertFalse(self.runtime.awaiting_departure_confirmation())
