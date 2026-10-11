"""Native planned-return authority, persistence, and presence regressions."""
import asyncio
from copy import deepcopy
from datetime import datetime, UTC, timedelta
from zoneinfo import ZoneInfo
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from .helpers import FakeHass, FakeClimateManager, VelairScheduler, NOW, normalize_schedule_data, empty_week_schedule, scheduler_module
from custom_components.velair.models import default_planned_return, normalize_planned_return_episode


class PlannedReturnRuntimeTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.hass = FakeHass()
        self.climate = FakeClimateManager()
        self.save = AsyncMock()
        self.climate.snapshots['climate.salon'] = {'state': 'heat', 'temperature': 18, 'hvac_mode': 'heat'}
        schedule = empty_week_schedule()
        schedule['tuesday'] = [{'start': '00:00', 'temperature': 18, 'hvac_mode': 'heat'}, {'start': '19:00', 'temperature': 21, 'hvac_mode': 'heat'}]
        self.data = normalize_schedule_data({'zones': {'climate.salon': {'enabled': True, 'schedule': schedule}}}, ['climate.salon'])
        self.scheduler = VelairScheduler(self.hass, self.data, self.climate, self.save)
        self.runtime = self.scheduler._planned_return
        self.hass.states['binary_sensor.occupied'] = SimpleNamespace(state='off', attributes={})
        self.hass.states['climate.salon'] = SimpleNamespace(state='heat', attributes={'current_temperature': 16, 'hvac_modes': ['off', 'heat', 'cool']})
        await self.scheduler.async_set_profile({'key': 'away_profile', 'name': 'Away', 'color': '#336699', 'zones': {'climate.salon': {'behavior': 'pause', 'action': 'turn_off'}}})
        await self.scheduler.async_set_velair_mode({'key': 'away', 'name': 'Away', 'profile_ids': ['away_profile']})
        config = default_planned_return()
        config.update(enabled=True, occupancy_entity_ids=['binary_sensor.occupied'], away_mode_id='away', absence_delay_minutes=0)
        config['weekly']['tuesday'] = '19:30'
        await self.scheduler.async_update_planned_return(config)

    async def asyncTearDown(self):
        await self.scheduler.async_stop()

    async def depart(self):
        await self.runtime._tick(NOW, self.runtime._generation)

    def return_history(self):
        return [data for _kind, data in self.hass.bus.events if data.get('event') == 'planned_return_changed']

    async def test_runtime_attribution_away_effects_and_default_ownership(self):
        await self.depart()
        status = self.scheduler._zone_runtime_status('climate.salon')
        self.assertEqual(status['planned_return'], {'phase': 'away', 'origin': 'automatic', 'mode_id': 'away', 'profile_id': 'away_profile', 'effect': 'turn_off'})
        self.scheduler._profile_by_id('away_profile')['zones']['climate.salon']['action'] = 'leave_as_is'
        self.assertEqual(self.scheduler._zone_runtime_status('climate.salon')['planned_return']['effect'], 'pause')
        self.scheduler._profile_by_id('away_profile')['zones'] = {}
        self.assertNotIn('planned_return', self.scheduler._zone_runtime_status('climate.salon'))
        self.runtime.episode['away_mode_id'] = 'default'
        self.data['global_']['active_mode_id'] = None
        self.data['global_']['active_profile_ids'] = []
        self.assertEqual(self.scheduler._zone_runtime_status('climate.salon')['planned_return']['profile_id'], None)
        self.assertEqual(self.scheduler._zone_runtime_status('climate.salon')['planned_return']['effect'], 'schedule')
        self.data['zones']['climate.salon']['schedule']['tuesday'][0] = {'start': '00:00', 'action': 'turn_off'}
        self.assertEqual(self.scheduler._zone_runtime_status('climate.salon')['planned_return']['effect'], 'turn_off')

    async def test_runtime_attribution_requires_actual_away_profile_winner(self):
        await self.depart()
        other = deepcopy(self.scheduler._profile_by_id('away_profile'))
        other.update(key='independent_profile', name='Independent')
        self.data['profiles'].append(other)
        # A retained mode marker alone cannot attribute a different effective profile.
        for active_ids in ([], ['independent_profile'], ['independent_profile', 'away_profile']):
            with self.subTest(active_ids=active_ids):
                self.data['global_']['active_profile_ids'] = active_ids
                self.assertNotIn('planned_return', self.scheduler._zone_runtime_status('climate.salon'))
        self.data['global_']['active_profile_ids'] = ['away_profile', 'independent_profile']
        self.assertEqual(self.scheduler._zone_runtime_status('climate.salon')['planned_return']['profile_id'], 'away_profile')
        self.runtime.episode['away_mode_id'] = 'default'
        self.data['global_']['active_mode_id'] = None
        self.assertNotIn('planned_return', self.scheduler._zone_runtime_status('climate.salon'))
        # An unrelated active profile does not replace this climate's Default fallback.
        other['zones'] = {}
        self.data['global_']['active_profile_ids'] = ['independent_profile']
        self.assertIsNone(self.scheduler._zone_runtime_status('climate.salon')['planned_return']['profile_id'])

    async def test_runtime_attribution_uses_due_target_without_extra_prediction(self):
        await self.depart()
        self.data['zones']['climate.salon']['preconditioning']['enabled'] = True
        with patch.object(self.scheduler, '_room_sensor_assist_status', return_value={}), patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW, None)) as predict:
            status = self.scheduler._zone_runtime_status('climate.salon')
            self.assertEqual(status['planned_return']['phase'], 'preparing')
            self.assertEqual(status['planned_return']['mode_id'], 'default')
            self.assertEqual(predict.call_count, 1)
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW + timedelta(minutes=20), None)):
            self.assertEqual(self.scheduler._zone_runtime_status('climate.salon')['planned_return']['phase'], 'away')
        await self.scheduler.async_cancel_planned_return()
        self.assertNotIn('planned_return', self.scheduler._zone_runtime_status('climate.salon'))

    async def test_runtime_attribution_independent_overrides_and_global_blocks(self):
        await self.depart()
        for method, args in [('_manual_control_status', {'source': 'user'}), ('_get_active_zone_override', {'type': 'boost', 'temperature': 24}), ('_get_active_zone_override', {'type': 'pause', 'action': 'leave_as_is'})]:
            with self.subTest(method=method, args=args), patch.object(self.scheduler, method, return_value=args):
                self.assertNotIn('planned_return', self.scheduler._zone_runtime_status('climate.salon'))
        for field, value in [('_stopped', True), ('_temperature_migration_blocked', True)]:
            with patch.object(self.scheduler, field, value):
                self.assertNotIn('planned_return', self.scheduler._zone_runtime_status('climate.salon'))
        with patch.object(self.scheduler, '_is_external_execution', return_value=True):
            self.assertNotIn('planned_return', self.scheduler._zone_runtime_status('climate.salon'))
        self.data['global_']['mode'] = 'paused'
        self.assertNotIn('planned_return', self.scheduler._zone_runtime_status('climate.salon'))
        self.data['global_']['mode'] = 'auto'
        self.data['zones']['climate.salon']['enabled'] = False
        self.assertNotIn('planned_return', self.scheduler._zone_runtime_status('climate.salon'))

    async def test_history_commits_confirmation_reset_and_deduplicates_retime(self):
        self.hass.bus.events.clear()
        self.runtime._reported_confirmation = None
        self.runtime._confirmation = None
        self.runtime.refresh()
        self.runtime.refresh()
        self.assertEqual([item['transition'] for item in self.return_history()], ['confirmation_started'])
        self.hass.states['binary_sensor.occupied'].state = 'unknown'
        self.runtime._state_changed(SimpleNamespace(data={'entity_id': 'binary_sensor.occupied'}))
        self.runtime.refresh()
        self.assertEqual([item['transition'] for item in self.return_history()], ['confirmation_started', 'confirmation_reset'])
        self.hass.states['binary_sensor.occupied'].state = 'off'
        self.runtime.refresh()
        await self.depart()
        arrival = self.runtime.episode['return_at']
        await self.runtime.adjust(arrival)
        self.assertNotIn('arrival_changed', [item['transition'] for item in self.return_history()])
        await self.runtime.adjust((NOW + timedelta(hours=3)).isoformat())
        self.assertEqual([item['transition'] for item in self.return_history()].count('arrival_changed'), 1)
        self.assertEqual(self.return_history()[-1]['previous_return_at'], arrival)
        await self.runtime.cancel_pending()
        await self.runtime.cancel_pending()
        self.assertEqual([item['transition'] for item in self.return_history()].count('cancelled'), 1)

    async def test_history_sensorless_committed_start_and_failed_start_silence(self):
        self.data['planned_return']['occupancy_entity_ids'] = []
        self.hass.bus.events.clear()
        self.save.side_effect = OSError('save failed')
        with self.assertRaises(OSError):
            await self.runtime.start((NOW + timedelta(hours=3)).isoformat())
        self.assertEqual(self.return_history(), [])
        self.save.side_effect = None
        await self.runtime.start((NOW + timedelta(hours=3)).isoformat())
        self.assertEqual([item['transition'] for item in self.return_history()], ['registered', 'departed'])
        self.assertEqual(self.scheduler._zone_runtime_status('climate.salon')['planned_return']['origin'], 'manual')

    async def test_history_failed_save_listener_does_not_report_draft_confirmation(self):
        self.data['planned_return']['enabled'] = False
        self.runtime.stop()
        self.runtime._reported_confirmation = None
        self.hass.bus.events.clear()
        async def fail_during_listener():
            self.runtime.refresh()
            raise OSError('save failed')
        self.save.side_effect = fail_during_listener
        with self.assertRaises(OSError):
            await self.runtime.start((NOW + timedelta(hours=3)).isoformat())
        self.runtime.refresh()
        self.assertEqual(self.return_history(), [])
        self.assertEqual(self.runtime._persistence_depth, 0)

    async def test_history_preparation_and_fulfillment_once_and_snapshot_readonly(self):
        await self.depart()
        self.hass.bus.events.clear()
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW, None)):
            await self.runtime._tick(NOW, self.runtime._generation)
            await self.runtime._tick(NOW, self.runtime._generation)
            self.runtime.status()
            self.scheduler._zone_runtime_status('climate.salon')
        self.assertEqual([item['transition'] for item in self.return_history()], ['preparation_started'])
        self.assertEqual(self.return_history()[0]['entity_id'], 'climate.salon')
        later = NOW + timedelta(minutes=90)
        with patch.object(scheduler_module.dt_util, 'now', return_value=later):
            await self.runtime._tick(later, self.runtime._generation)
            await self.runtime._tick(later, self.runtime._generation)
        self.assertEqual([item['transition'] for item in self.return_history()].count('fulfilled'), 1)

    async def test_history_failed_config_save_and_retry_errors_are_not_accepted_twice(self):
        self.data['planned_return']['enabled'] = False
        self.runtime.stop()
        self.hass.bus.events.clear()
        config = deepcopy(self.data['planned_return'])
        config['enabled'] = True
        async def fail_with_refresh():
            self.runtime.refresh()
            raise OSError('save failed')
        self.save.side_effect = fail_with_refresh
        with self.assertRaises(OSError):
            await self.scheduler.async_update_planned_return(config)
        self.assertEqual(self.return_history(), [])
        self.assertFalse(self.data['planned_return']['enabled'])
        self.assertEqual(self.runtime._persistence_depth, 0)
        self.save.side_effect = None
        await self.scheduler.async_update_planned_return(config)
        self.hass.bus.events.clear()
        self.save.side_effect = OSError('save failed')
        await self.depart()
        self.runtime.error = None
        self.runtime.refresh()
        await self.depart()
        self.assertEqual([item['transition'] for item in self.return_history()].count('error'), 1)
        self.assertNotIn('departed', [item['transition'] for item in self.return_history()])

    async def test_history_restored_preparing_latch_does_not_duplicate_start(self):
        await self.depart()
        self.runtime.episode['preparing_entities'] = ['climate.salon']
        restored = VelairScheduler(self.hass, deepcopy(self.data), self.climate, self.save)
        self.hass.bus.events.clear()
        try:
            with patch.object(restored, '_preconditioned_event_details', return_value=(NOW, None)):
                await restored._planned_return._tick(NOW, restored._planned_return._generation)
                self.assertEqual(restored._zone_runtime_status('climate.salon')['planned_return']['phase'], 'preparing')
            self.assertNotIn('preparation_started', [item['transition'] for item in self.return_history()])
        finally:
            await restored.async_stop()

    async def test_history_identical_error_new_accepted_episode_is_recorded(self):
        self.hass.bus.events.clear()
        self.save.side_effect = OSError('save failed')
        await self.depart()
        self.assertEqual([item['transition'] for item in self.return_history()].count('error'), 1)
        self.save.side_effect = None
        await self.runtime.start((NOW + timedelta(hours=3)).isoformat())
        self.assertIsNone(self.runtime._last_error)
        self.save.side_effect = OSError('save failed')
        await self.depart()
        self.assertEqual([item['transition'] for item in self.return_history()].count('error'), 2)

    async def test_public_departure_timestamp_and_episode_modes(self):
        initial = self.runtime.status()
        for field in ('departure_at', 'away_mode_id', 'destination_mode_id'):
            self.assertIsNone(initial[field])
        await self.depart()
        self.assertEqual(self.runtime.status()['departure_at'], NOW.isoformat())
        self.assertEqual(self.runtime.status()['away_mode_id'], 'away')
        self.assertEqual(self.runtime.status()['destination_mode_id'], 'default')
        # Display identities belong to the episode, even while configuration is
        # changing or its cancellation notice is retained.
        self.data['planned_return']['away_mode_id'] = 'default'
        self.assertEqual(self.runtime.status()['away_mode_id'], 'away')

    async def test_manual_departure_is_confirmed_later_than_intent(self):
        self.hass.states['binary_sensor.occupied'].state = 'on'
        self.data['planned_return']['absence_delay_minutes'] = 10
        await self.scheduler.async_start_planned_return((NOW + timedelta(hours=3)).isoformat())
        self.assertIsNone(self.runtime.status()['departure_at'])
        self.assertEqual(self.runtime.episode['started_at'], NOW.isoformat())
        leave = NOW + timedelta(minutes=30)
        self.hass.states['binary_sensor.occupied'].state = 'off'
        with patch.object(scheduler_module.dt_util, 'now', return_value=leave):
            self.runtime.refresh()
            await self.runtime._tick(leave, self.runtime._generation)
            self.assertIsNone(self.runtime.status()['departure_at'])
        confirmed = leave + timedelta(minutes=10)
        with patch.object(scheduler_module.dt_util, 'now', return_value=confirmed):
            await self.runtime._tick(confirmed, self.runtime._generation)
        self.assertEqual(self.runtime.episode['departure_at'], confirmed.isoformat())
        self.assertEqual(self.runtime.episode['started_at'], NOW.isoformat())

    async def test_departure_metadata_survives_retime_restart_and_terminal(self):
        await self.depart()
        departure = self.runtime.episode['departure_at']
        await self.scheduler.async_start_planned_return((NOW + timedelta(days=1)).isoformat())
        self.assertEqual(self.runtime.episode['departure_at'], departure)
        await self.scheduler.async_skip_planned_return()
        restored_data = normalize_schedule_data(deepcopy(self.data), ['climate.salon'])
        restored = VelairScheduler(self.hass, restored_data, self.climate, self.save)
        try:
            self.assertEqual(restored._planned_return.status()['departure_at'], departure)
            self.assertEqual(restored._planned_return.episode['state'], 'skipped')
        finally:
            await restored.async_stop()

    async def test_same_active_mode_records_departure_only_after_saved_confirmation(self):
        self.data['planned_return']['away_mode_id'] = 'default'
        await self.depart()
        self.assertEqual(self.runtime.status()['departure_at'], NOW.isoformat())
        self.assertIsNone(self.scheduler.active_mode_id)

    async def test_failed_manual_confirmation_keeps_armed_without_departure(self):
        await self.scheduler.async_start_planned_return((NOW + timedelta(hours=3)).isoformat())
        self.save.side_effect = OSError('storage failed')
        await self.depart()
        self.assertEqual(self.runtime.episode['state'], 'armed')
        self.assertIsNone(self.runtime.status()['departure_at'])
        self.assertIsNone(self.scheduler.active_mode_id)
        self.save.side_effect = None

    async def test_legacy_and_invalid_departure_metadata_preserve_presence_latch(self):
        await self.depart()
        await self.scheduler.async_select_velair_mode('away')
        original = deepcopy(self.runtime.episode)
        for raw in (None, '', 'not-a-date', '2026-10-10T12:00:00', 123):
            with self.subTest(departure_at=raw):
                candidate = original | {'departure_at': raw}
                normalized = normalize_planned_return_episode(candidate, self.runtime.config)
                self.assertEqual(normalized['state'], 'cancelled')
                self.assertIsNone(normalized.get('departure_at'))
        original.pop('departure_at')
        self.assertIsNone(normalize_planned_return_episode(original, self.runtime.config).get('departure_at'))
        armed = original | {'state': 'armed', 'origin': 'manual', 'departure_at': NOW.isoformat()}
        self.assertIsNone(normalize_planned_return_episode(armed, self.runtime.config).get('departure_at'))

    async def test_departure_and_restart_fulfilled_latch(self):
        await self.depart()
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        self.assertEqual(self.data['planned_return_episode']['return_at'], (NOW + timedelta(minutes=90)).isoformat())
        self.assertEqual(self.climate.calls[-1], ('turn_off', 'climate.salon'))
        later = NOW + timedelta(minutes=90)
        with patch.object(scheduler_module.dt_util, 'now', return_value=later):
            await self.runtime._tick(later, self.runtime._generation)
            self.assertEqual(self.data['planned_return_episode']['state'], 'fulfilled')
            self.assertEqual(self.scheduler.active_profile_ids, [])
            restarted = VelairScheduler(self.hass, self.data, self.climate, self.save)
            restarted._planned_return.refresh()
            self.assertIsNone(restarted._planned_return._confirmation)
            await restarted.async_stop()

    async def test_arrival_target_overrides_absence_pause_and_current_schedule(self):
        await self.depart()
        self.data['zones']['climate.salon']['preconditioning']['enabled'] = True
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW, None)):
            target = self.runtime.target('climate.salon')
            self.assertEqual(target.temperature, 21)
            self.assertEqual(self.scheduler._resolve_authoritative_delivery_event('climate.salon').temperature, 21)
            self.assertEqual(self.scheduler._room_sensor_assist_target_event('climate.salon').temperature, 21)
            await self.runtime._tick(NOW, self.runtime._generation)
            self.assertTrue(any(call[0] == 'set_temperature' and call[2] == 21 for call in self.climate.calls))
            self.assertEqual(self.data['planned_return_episode']['preparing_entities'], ['climate.salon'])
        # Predictor no longer asks for lead when room warmed; preparation remains latched.
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW + timedelta(minutes=90), None)):
            self.assertEqual(self.runtime.target('climate.salon').temperature, 21)

    async def test_boost_is_preserved_and_owns_delivery(self):
        await self.scheduler.async_set_zone_boost('climate.salon', temperature=24, until=(NOW + timedelta(minutes=120)).isoformat())
        await self.depart()
        self.assertEqual(self.data['zones']['climate.salon']['override']['temperature'], 24)
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW, None)):
            self.assertIsNone(self.runtime.target('climate.salon'))
            self.assertEqual(self.scheduler._resolve_authoritative_delivery_event('climate.salon').temperature, 24)
        await self.scheduler.async_arrive_planned_return()
        self.assertEqual(self.data['zones']['climate.salon']['override']['temperature'], 24)

    async def test_skipped_return_restores_only_on_actual_arrival(self):
        await self.depart()
        await self.scheduler.async_skip_planned_return()
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        self.hass.states['binary_sensor.occupied'].state = 'on'
        await self.runtime._tick(NOW, self.runtime._generation)
        self.assertEqual(self.scheduler.active_profile_ids, [])
        self.assertIsNone(self.data['planned_return_episode'])

    async def test_explicit_same_mode_cancels_and_home_preserves_selection(self):
        await self.depart()
        await self.scheduler.async_select_velair_mode('away')
        self.assertEqual(self.data['planned_return_episode']['state'], 'cancelled')
        self.hass.states['binary_sensor.occupied'].state = 'on'
        await self.runtime._tick(NOW, self.runtime._generation)
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        self.assertIsNone(self.data['planned_return_episode'])

    async def test_unknown_blocks_departure_but_keeps_authorized_return(self):
        self.hass.states['binary_sensor.occupied'].state = 'unknown'
        await self.depart()
        self.assertIsNone(self.data['planned_return_episode'])
        self.hass.states['binary_sensor.occupied'].state = 'off'
        self.runtime.refresh()
        await self.depart()
        self.hass.states['binary_sensor.occupied'].state = 'unavailable'
        later = NOW + timedelta(minutes=90)
        with patch.object(scheduler_module.dt_util, 'now', return_value=later):
            await self.runtime._tick(later, self.runtime._generation)
        self.assertEqual(self.data['planned_return_episode']['state'], 'fulfilled')

    async def test_no_same_day_return_does_not_roll_forward(self):
        self.data['planned_return']['weekly']['tuesday'] = '17:00'
        self.data['planned_return']['weekly']['wednesday'] = '19:30'
        await self.depart()
        self.assertIsNone(self.data['planned_return_episode']['return_at'])

    async def test_failed_departure_save_rolls_back_episode_and_mode(self):
        self.save.side_effect = OSError('storage failed')
        await self.depart()
        self.assertIsNone(self.data['planned_return_episode'])
        self.assertIsNone(self.scheduler.active_mode_id)
        self.assertEqual(self.runtime.status()['state'], 'error')
        self.assertIsNone(self.runtime._timer)
        self.save.side_effect = None

    async def test_adjust_invalidates_delivery_and_sessions(self):
        await self.depart()
        self.runtime.episode['preparing_entities'] = ['climate.salon']
        with patch.object(self.scheduler, '_invalidate_climate_delivery') as invalidate, patch.object(self.scheduler, '_discard_preconditioning_session') as discard:
            await self.scheduler.async_adjust_planned_return((NOW + timedelta(minutes=100)).isoformat())
        invalidate.assert_called_with('climate.salon')
        discard.assert_called_with('climate.salon')
        with self.assertRaises(ValueError):
            await self.scheduler.async_adjust_planned_return((NOW - timedelta(minutes=1)).isoformat())

    async def test_referenced_resources_cannot_be_deleted(self):
        with self.assertRaisesRegex(ValueError, 'Return home'):
            await self.scheduler.async_delete_velair_mode('away')
        with self.assertRaisesRegex(ValueError, 'Return home'):
            await self.scheduler.async_delete_profile('away_profile')

    async def test_external_transition_rejected_before_departure(self):
        from custom_components.velair.execution import ExecutionAuthority
        self.scheduler._execution_authority = ExecutionAuthority(self.data)
        self.data['zones']['climate.salon']['execution'] = {'type': 'external', 'provider': 'test'}
        await self.depart()
        self.assertIsNone(self.data['planned_return_episode'])
        self.assertIsNone(self.scheduler.active_mode_id)
        self.assertEqual(self.runtime.status()['state'], 'error')

    async def test_captured_timer_and_source_callback_are_stale_after_rebind(self):
        import custom_components.velair.planned_return as module
        with patch.object(module, 'async_track_state_change_event', return_value=lambda: None) as listen, patch.object(module, 'async_track_point_in_time', return_value=lambda: None) as timer:
            self.runtime.stop()
            self.runtime.refresh()
            old_state = listen.call_args.args[2]
            old_timer = timer.call_args.args[1]
            self.runtime.stop()
            self.runtime.refresh()
            with patch.object(self.runtime, '_state_changed') as changed, patch.object(self.runtime, '_timer_fired') as fired:
                old_state(SimpleNamespace(data={'entity_id': 'binary_sensor.occupied'}))
                old_timer(NOW)
                changed.assert_not_called()
                fired.assert_not_called()

    async def test_real_prediction_heat_cool_range_and_learning(self):
        for mode, current, goal, expected_direction in [
            ('heat', 16, {'temperature': 21}, 'heat'),
            ('cool', 29, {'temperature': 23}, 'cool'),
            ('heat_cool', 29, {'target_temp_low': 20, 'target_temp_high': 24}, 'cool'),
        ]:
            with self.subTest(mode=mode):
                self.data['planned_return_episode'] = None
                self.data['global_']['active_profile_ids'] = []
                self.data['global_']['active_mode_id'] = None
                self.runtime.stop()
                self.data['zones']['climate.salon']['schedule']['tuesday'] = [{'start': '00:00', 'hvac_mode': mode, **goal}]
                self.data['zones']['climate.salon']['preconditioning']['enabled'] = True
                self.hass.states['climate.salon'].state = mode
                self.hass.states['climate.salon'].attributes['current_temperature'] = current
                self.climate.hvac_modes['climate.salon'] = ['off', 'heat', 'cool', 'heat_cool']
                self.climate.temperature_range_support['climate.salon'] = True
                self.runtime.refresh()
                await self.depart()
                plan = self.runtime.plans(NOW)[0]
                self.assertLess(plan.when, plan.target_when)
                preparation_at = max(NOW, plan.when)
                with patch.object(scheduler_module.dt_util, 'now', return_value=preparation_at):
                    await self.runtime._tick(preparation_at, self.runtime._generation)
                    session = self.scheduler._preconditioning_sessions['climate.salon']
                    self.assertEqual(session.direction, expected_direction)
                    self.assertTrue(self.scheduler._room_sensor_assist_scheduled_target_exists('climate.salon', session.weekday, session.start, session.target_temperature if session.target_kind == 'scalar' else None, session.hvac_mode, target_temp_low=session.target_temp_low, target_temp_high=session.target_temp_high))
                observed_at = session.started_at + timedelta(minutes=15)
                with patch.object(scheduler_module.dt_util, 'now', return_value=observed_at):
                    await self.scheduler._async_observe_preconditioning_temperature('climate.salon', observed_at, session.target_temperature)
                observations = self.data['preconditioning_learning']['climate.salon'][expected_direction]['observations']
                self.assertTrue(observations)
                self.assertEqual(observations[-1]['quality'], 'complete')

    async def test_arrival_during_departure_save_suppresses_away_delivery(self):
        async def arrival_during_save():
            self.hass.states['binary_sensor.occupied'].state = 'on'
            self.runtime._state_changed(SimpleNamespace(data={'entity_id': 'binary_sensor.occupied'}))
        self.save.side_effect = arrival_during_save
        self.climate.calls.clear()
        await self.depart()
        self.assertFalse(any(call[0] == 'turn_off' for call in self.climate.calls))
        self.save.side_effect = None
        await self.runtime._tick(NOW, self.runtime._generation)
        self.assertEqual(self.scheduler.active_profile_ids, [])
        self.assertIsNone(self.data['planned_return_episode'])


    async def test_two_zones_have_distinct_real_leads_and_pause_blocks_overlay(self):
        second = deepcopy(self.data['zones']['climate.salon'])
        self.data['zones']['climate.office'] = second
        self.hass.states['climate.office'] = SimpleNamespace(state='heat', attributes={'current_temperature': 20})
        for entity in self.data['zones']:
            self.data['zones'][entity]['preconditioning']['enabled'] = True
        await self.depart()
        plans = {event.entity_id: event for event in self.runtime.plans(NOW)}
        self.assertLess(plans['climate.salon'].when, plans['climate.office'].when)
        await self.scheduler.async_pause_zone('climate.salon')
        self.assertIsNone(self.runtime.target('climate.salon'))
        self.assertIsNone(self.scheduler._resolve_authoritative_delivery_event('climate.salon'))

    async def test_disable_waits_for_inflight_preparation_then_removes_authority(self):
        await self.depart()
        self.data['zones']['climate.salon']['preconditioning']['enabled'] = True
        started, release = asyncio.Event(), asyncio.Event()
        async def blocked_save():
            started.set()
            await release.wait()
        self.save.side_effect = blocked_save
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW, None)):
            prepare = asyncio.create_task(self.runtime._tick(NOW, self.runtime._generation))
            await asyncio.wait_for(started.wait(), 1)
            config = deepcopy(self.data['planned_return'])
            config['enabled'] = False
            disable = asyncio.create_task(self.scheduler.async_update_planned_return(config))
            await asyncio.sleep(0)
            self.assertFalse(disable.done())
            release.set()
            await asyncio.wait_for(asyncio.gather(prepare, disable), 2)
        self.assertFalse(self.data['planned_return']['enabled'])
        self.assertEqual(self.data['planned_return_episode']['state'], 'cancelled')
        self.assertIsNone(self.runtime.target('climate.salon'))
        self.save.side_effect = None

    async def test_fulfill_waits_for_explicit_manual_selection_and_preserves_it(self):
        await self.depart()
        async with self.scheduler._profile_mutation_lock:
            fulfilled = asyncio.create_task(self.scheduler.async_arrive_planned_return())
            await asyncio.sleep(0)
            await self.scheduler.async_select_velair_mode('away')
        await asyncio.wait_for(fulfilled, 2)
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        self.assertEqual(self.data['planned_return_episode']['state'], 'cancelled')

    async def test_early_arrival_same_mode_restores_current_destination_target(self):
        self.data['planned_return']['away_mode_id'] = 'default'
        self.data['zones']['climate.salon']['preconditioning']['enabled'] = True
        self.runtime.refresh()
        await self.depart()
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW, None)):
            await self.runtime._tick(NOW, self.runtime._generation)
        self.climate.calls.clear()
        self.hass.states['binary_sensor.occupied'].state = 'on'
        await self.scheduler.async_arrive_planned_return()
        self.assertTrue(any(call[0] == 'set_temperature' and call[2] == 18 for call in self.climate.calls))

    async def test_valid_configuration_resets_error_latch(self):
        self.save.side_effect = OSError('storage failed')
        await self.depart()
        self.assertIsNotNone(self.runtime.error)
        self.save.side_effect = None
        await self.scheduler.async_update_planned_return(deepcopy(self.data['planned_return']))
        self.assertIsNone(self.runtime.error)
        self.assertIsNotNone(self.runtime._confirmation)

    async def test_fall_back_second_fold_does_not_schedule_elapsed_first_occurrence(self):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        now = datetime(2026, 10, 25, 2, 15, tzinfo=ZoneInfo('Europe/Madrid'), fold=1)
        self.data['planned_return']['weekly']['sunday'] = '02:30'
        with patch.object(scheduler_module.dt_util, 'now', return_value=now):
            self.runtime.stop()
            self.runtime.refresh()
            await self.runtime._tick(now, self.runtime._generation)
        self.assertIsNone(self.data['planned_return_episode']['return_at'])

    async def test_failed_preparation_and_cancellation_storage_does_not_spin(self):
        await self.depart()
        self.data['zones']['climate.salon']['preconditioning']['enabled'] = True
        self.save.side_effect = OSError('storage unavailable')
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW, None)):
            await self.runtime._tick(NOW, self.runtime._generation)
        self.assertEqual(self.runtime.status()['state'], 'error')
        self.assertIsNone(self.runtime._timer)
        self.save.side_effect = None

    async def sensorless(self):
        config = deepcopy(self.runtime.config)
        config.update(enabled=False, occupancy_entity_ids=[], absence_delay_minutes=30)
        await self.scheduler.async_update_planned_return(config)
        self.climate.calls.clear()
        return NOW + timedelta(minutes=90)

    async def test_sensorless_start_selects_away_and_adjust_preserves_departure(self):
        arrival = await self.sensorless()
        self.assertTrue(self.runtime.can_start())
        await self.scheduler.async_start_planned_return(arrival.isoformat())
        episode = deepcopy(self.runtime.episode)
        self.assertEqual(episode['state'], 'away')
        self.assertEqual(episode['origin'], 'manual')
        self.assertEqual(episode['started_at'], NOW.isoformat())
        self.assertEqual(episode['departure_at'], NOW.isoformat())
        self.assertEqual(episode['away_mode_id'], 'away')
        self.assertEqual(episode['destination_mode_id'], 'default')
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        self.assertEqual(self.climate.calls, [('turn_off', 'climate.salon')])
        self.assertIsNone(self.runtime._confirmation)
        self.assertEqual(self.runtime.status()['occupancy'], 'unknown')
        self.assertEqual(self.runtime.status()['sources'], [])
        self.assertEqual(self.runtime._entities, ('climate.salon',))
        self.climate.calls.clear()
        await self.scheduler.async_start_planned_return((arrival + timedelta(days=1)).isoformat())
        self.assertEqual(self.runtime.episode['departure_at'], episode['departure_at'])
        self.assertEqual(self.runtime.episode['started_at'], episode['started_at'])
        self.assertEqual(self.climate.calls, [])

    async def test_sensorless_restart_prepares_heating_and_cooling_and_fulfills(self):
        arrival = await self.sensorless()
        for mode in ('heat', 'cool'):
            with self.subTest(mode=mode):
                self.data['zones']['climate.salon']['schedule']['tuesday'] = [
                    {'start': '00:00', 'temperature': 21, 'hvac_mode': mode}]
                await self.scheduler.async_start_planned_return(arrival.isoformat())
                restored_data = normalize_schedule_data(deepcopy(self.data), ['climate.salon'])
                restored = VelairScheduler(self.hass, restored_data, self.climate, self.save)
                try:
                    runtime = restored._planned_return
                    await restored.async_start()
                    self.assertEqual(runtime.episode['state'], 'away')
                    self.assertIsNone(runtime._confirmation)
                    self.climate.calls.clear()
                    with patch.object(restored, '_preconditioned_event_details', return_value=(NOW, None)):
                        await runtime._tick(NOW, runtime._generation)
                        self.assertEqual(runtime.episode['preparing_entities'], ['climate.salon'])
                        self.assertEqual(runtime.target('climate.salon').hvac_mode, mode)
                        self.assertTrue(any(call[0] == 'set_temperature' and call[2] == 21 for call in self.climate.calls))
                    preparing = normalize_schedule_data(deepcopy(restored_data), ['climate.salon'])
                    self.assertEqual(preparing['planned_return_episode']['preparing_entities'], ['climate.salon'])
                    with patch.object(scheduler_module.dt_util, 'now', return_value=arrival):
                        await runtime._tick(arrival, runtime._generation)
                        self.assertEqual(runtime.episode['state'], 'fulfilled')
                        self.assertIsNone(restored.active_mode_id)
                        runtime.refresh()
                        self.assertIsNone(runtime._timer)
                    fulfilled = normalize_schedule_data(deepcopy(restored_data), ['climate.salon'])
                    self.assertEqual(fulfilled['planned_return_episode']['state'], 'fulfilled')
                finally:
                    await restored.async_stop()
                await self.scheduler.async_cancel_planned_return()

    async def test_sensorless_cancel_and_fresh_start_after_terminal(self):
        arrival = await self.sensorless()
        await self.scheduler.async_start_planned_return(arrival.isoformat())
        await self.scheduler.async_cancel_planned_return()
        self.assertEqual(self.runtime.episode['state'], 'cancelled')
        self.assertTrue(self.runtime.episode['dismissed'])
        self.assertIsNone(self.scheduler.active_mode_id)
        self.assertIsNone(self.runtime._timer)
        for state in ('cancelled', 'fulfilled', 'skipped'):
            with self.subTest(state=state):
                self.data['planned_return_episode']['state'] = state
                later = NOW + timedelta(minutes=10)
                self.climate.calls.clear()
                with patch.object(scheduler_module.dt_util, 'now', return_value=later):
                    await self.scheduler.async_start_planned_return(arrival.isoformat())
                self.assertEqual(self.runtime.episode['state'], 'away')
                self.assertEqual(self.runtime.episode['departure_at'], later.isoformat())
                self.assertEqual(self.runtime.episode['started_at'], later.isoformat())
                self.assertNotIn('dismissed', self.runtime.episode)
                self.assertEqual(self.scheduler.active_mode_id, 'away')

    async def test_sensorless_failed_start_rolls_back_episode_and_mode(self):
        arrival = await self.sensorless()
        for failure in ('save', 'activation'):
            with self.subTest(failure=failure):
                before = deepcopy(self.data)
                if failure == 'save':
                    self.save.side_effect = OSError('storage failed')
                    context = patch.object(self.scheduler, '_validate_profile', wraps=self.scheduler._validate_profile)
                else:
                    context = patch.object(self.scheduler, '_async_activate_profiles_locked', AsyncMock(side_effect=RuntimeError('activation failed')))
                with context, self.assertRaises((OSError, RuntimeError)):
                    await self.scheduler.async_start_planned_return(arrival.isoformat())
                self.save.side_effect = None
                self.assertEqual(self.runtime.episode, before['planned_return_episode'])
                self.assertIsNone(self.runtime._confirmation)
                self.assertIsNone(self.runtime._timer)
                # Profile activation owns rollback; storage failures must restore
                # the selected mode together with the tentative episode.
                self.assertEqual(self.data['global_'], before['global_'])

    async def test_sensorless_requires_auto_and_weekly_still_requires_sources(self):
        arrival = await self.sensorless()
        self.runtime.refresh()
        await self.depart()
        self.assertIsNone(self.runtime.episode)
        self.assertIsNone(self.runtime._timer)
        with self.assertRaises(ValueError):
            await self.scheduler.async_update_planned_return(self.runtime.config | {'enabled': True})
        for mode in ('paused', 'off'):
            with self.subTest(mode=mode):
                self.data['global_']['mode'] = mode
                self.assertFalse(self.runtime.can_start())
                with self.assertRaises(ValueError):
                    await self.scheduler.async_start_planned_return(arrival.isoformat())
        self.data['global_']['mode'] = 'auto'

    async def test_sensorless_postcommit_cancellation_preserves_saved_episode_and_timer(self):
        arrival = await self.sensorless()
        self.data['planned_return_episode'] = {
            'state': 'cancelled', 'origin': 'manual', 'started_at': NOW.isoformat(),
            'return_at': arrival.isoformat(), 'away_mode_id': 'away',
            'destination_mode_id': 'default', 'preparing_entities': [], 'dismissed': True}
        self.runtime.error = 'previous failure'
        self.runtime.notice = 'configuration_changed'
        self.runtime._applied['climate.salon'] = ('previous return intent',)
        saved = []

        async def record_save():
            saved.append(deepcopy(self.data))

        self.save.side_effect = record_save
        with patch.object(self.scheduler, '_async_complete_profile_transition', AsyncMock(side_effect=asyncio.CancelledError())), self.assertRaises(asyncio.CancelledError):
            await self.scheduler.async_start_planned_return(arrival.isoformat())
        self.assertEqual(self.runtime.episode, saved[-1]['planned_return_episode'])
        self.assertEqual(self.runtime.episode['state'], 'away')
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        self.assertEqual(self.runtime.episode['departure_at'], NOW.isoformat())
        self.assertIsNotNone(self.runtime._timer)
        self.assertIsNone(self.runtime._confirmation)
        self.assertIsNone(self.runtime.error)
        self.assertIsNone(self.runtime.notice)
        self.assertEqual(self.runtime._applied, {})
        restored = normalize_schedule_data(saved[-1], ['climate.salon'])
        self.assertEqual(restored['planned_return_episode'], self.runtime.episode)
        with patch.object(scheduler_module.dt_util, 'now', return_value=arrival):
            await self.runtime._tick(arrival, self.runtime._generation)
        self.assertEqual(self.runtime.episode['state'], 'fulfilled')

    async def test_sensorless_precommit_cancellation_restores_episode_mode_and_timers(self):
        arrival = await self.sensorless()
        self.data['planned_return_episode'] = {
            'state': 'cancelled', 'origin': 'manual', 'started_at': NOW.isoformat(),
            'return_at': arrival.isoformat(), 'away_mode_id': 'away',
            'destination_mode_id': 'default', 'preparing_entities': [], 'dismissed': True}
        self.runtime.error = 'previous failure'
        self.runtime.notice = 'configuration_changed'
        prior_intent = ('previous return intent',)
        self.runtime._applied['climate.salon'] = prior_intent
        before = deepcopy(self.data)
        self.save.side_effect = asyncio.CancelledError()
        with self.assertRaises(asyncio.CancelledError):
            await self.scheduler.async_start_planned_return(arrival.isoformat())
        self.save.side_effect = None
        self.assertEqual(self.runtime.episode, before['planned_return_episode'])
        self.assertEqual(self.data['global_'], before['global_'])
        self.assertIsNone(self.runtime._timer)
        self.assertIsNone(self.runtime._confirmation)
        self.assertEqual(self.runtime.error, 'previous failure')
        self.assertEqual(self.runtime.notice, 'configuration_changed')
        self.assertEqual(self.runtime._applied, {'climate.salon': prior_intent})

    async def test_sensorless_same_away_mode_failed_save_preserves_cancelled_latch(self):
        arrival = await self.sensorless()
        await self.scheduler.async_start_planned_return(arrival.isoformat())
        await self.scheduler.async_cancel_planned_return()
        before = deepcopy(self.data)
        for error in (OSError('storage failed'), asyncio.CancelledError()):
            with self.subTest(error=type(error).__name__):
                self.save.side_effect = error
                with self.assertRaises(type(error)):
                    await self.scheduler.async_start_planned_return(arrival.isoformat())
                self.save.side_effect = None
                self.assertEqual(self.runtime.episode, before['planned_return_episode'])
                self.assertEqual(self.data['global_'], before['global_'])
                self.assertIsNone(self.runtime._timer)
                self.assertIsNone(self.runtime._confirmation)

    async def test_configured_unknown_unavailable_stays_armed_missing_rejects(self):
        arrival = await self.manual_only()
        for state in ('unknown', 'unavailable'):
            with self.subTest(state=state):
                self.data['planned_return_episode'] = None
                self.hass.states['binary_sensor.occupied'].state = state
                self.assertTrue(self.runtime.can_start())
                await self.scheduler.async_start_planned_return(arrival)
                self.assertEqual(self.runtime.episode['state'], 'armed')
                self.assertIsNone(self.runtime._confirmation)
                self.assertEqual(self.climate.calls, [])
        self.hass.states.pop('binary_sensor.occupied')
        self.assertFalse(self.runtime.can_start())
        with self.assertRaises(ValueError):
            await self.scheduler.async_start_planned_return(arrival)

    async def test_sensorless_preserves_boost_and_mode_change_cancels_return(self):
        arrival = await self.sensorless()
        await self.scheduler.async_set_zone_boost('climate.salon', temperature=24, until=(arrival + timedelta(hours=1)).isoformat())
        await self.scheduler.async_start_planned_return(arrival.isoformat())
        self.assertEqual(self.data['zones']['climate.salon']['override']['temperature'], 24)
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW, None)):
            self.assertIsNone(self.runtime.target('climate.salon'))
            self.assertEqual(self.scheduler._resolve_authoritative_delivery_event('climate.salon').temperature, 24)
        await self.scheduler.async_select_velair_mode('away')
        self.assertEqual(self.runtime.episode['state'], 'cancelled')
        self.assertIsNone(self.runtime._timer)

    async def test_sensorless_config_identity_change_cancels_and_external_transition_rejects(self):
        arrival = await self.sensorless()
        await self.scheduler.async_start_planned_return(arrival.isoformat())
        await self.scheduler.async_update_planned_return(self.runtime.config | {'occupancy_entity_ids': ['binary_sensor.occupied']})
        self.assertEqual(self.runtime.episode['state'], 'cancelled')
        self.assertEqual(self.runtime.status()['notice'], 'configuration_changed')
        await self.scheduler.async_update_planned_return(self.runtime.config | {'occupancy_entity_ids': []})
        from custom_components.velair.execution import ExecutionAuthority
        self.scheduler._execution_authority = ExecutionAuthority(self.data)
        self.data['zones']['climate.salon']['execution'] = {'type': 'external', 'provider': 'test'}
        before = deepcopy(self.runtime.episode)
        self.assertFalse(self.runtime.can_start())
        with self.assertRaises(ValueError):
            await self.scheduler.async_start_planned_return(arrival.isoformat())
        self.assertEqual(self.runtime.episode, before)

    async def manual_only(self, *, home=True, delay=10):
        self.hass.states['binary_sensor.occupied'].state = 'on' if home else 'off'
        config = deepcopy(self.data['planned_return'])
        config.update(enabled=False, absence_delay_minutes=delay)
        await self.scheduler.async_update_planned_return(config)
        self.climate.calls.clear()
        return (NOW + timedelta(minutes=90)).isoformat()

    async def test_manual_start_arms_while_home_with_automatic_routine_disabled(self):
        arrival = await self.manual_only()
        await self.scheduler.async_start_planned_return(arrival)
        self.assertEqual(self.data['planned_return_episode']['state'], 'armed')
        self.assertEqual(self.data['planned_return_episode']['origin'], 'manual')
        self.assertEqual(self.runtime.status()['state'], 'armed')
        self.assertEqual(self.climate.calls, [])
        await self.runtime._tick(NOW, self.runtime._generation)
        self.assertEqual(self.data['planned_return_episode']['state'], 'armed')
        self.assertEqual(self.climate.calls, [])
        self.assertIsNotNone(self.runtime._timer)

    async def test_manual_armed_waits_for_all_sources_away_and_confirmation(self):
        arrival = await self.manual_only()
        self.hass.states['input_boolean.guest'] = SimpleNamespace(state='on', attributes={})
        self.data['planned_return']['occupancy_entity_ids'].append('input_boolean.guest')
        await self.scheduler.async_start_planned_return(arrival)
        self.hass.states['binary_sensor.occupied'].state = 'off'
        self.runtime._state_changed(SimpleNamespace(data={'entity_id': 'binary_sensor.occupied'}))
        self.assertEqual(self.runtime.occupancy(), 'home')
        self.assertIsNone(self.runtime._confirmation)
        self.hass.states['input_boolean.guest'].state = 'off'
        self.runtime._state_changed(SimpleNamespace(data={'entity_id': 'input_boolean.guest'}))
        self.assertEqual(self.runtime._confirmation, NOW + timedelta(minutes=10))
        await self.runtime._tick(NOW + timedelta(minutes=9), self.runtime._generation)
        self.assertEqual(self.data['planned_return_episode']['state'], 'armed')
        later = NOW + timedelta(minutes=10)
        with patch.object(scheduler_module.dt_util, 'now', return_value=later):
            await self.runtime._tick(later, self.runtime._generation)
        self.assertEqual(self.data['planned_return_episode']['state'], 'away')
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        self.assertEqual(self.data['planned_return_episode']['return_at'], arrival)

    async def test_manual_return_after_leaving_starts_confirmation_without_sensor_change(self):
        arrival = await self.manual_only(home=False)
        self.assertIsNone(self.data['planned_return_episode'])
        self.assertTrue(self.runtime.can_start())
        await self.scheduler.async_start_planned_return(arrival)
        self.assertEqual(self.runtime._confirmation, NOW + timedelta(minutes=10))
        self.assertEqual(self.data['planned_return_episode']['state'], 'armed')
        self.assertEqual(self.climate.calls, [])
        await self.runtime._tick(NOW + timedelta(minutes=9), self.runtime._generation)
        self.assertEqual(self.data['planned_return_episode']['state'], 'armed')
        later = NOW + timedelta(minutes=10)
        with patch.object(scheduler_module.dt_util, 'now', return_value=later):
            await self.runtime._tick(later, self.runtime._generation)
        self.assertEqual(self.data['planned_return_episode']['state'], 'away')
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        self.assertEqual(self.data['planned_return_episode']['return_at'], arrival)

    async def test_unknown_resets_confirmation_without_discarding_manual_intent(self):
        arrival = await self.manual_only(home=False)
        await self.scheduler.async_start_planned_return(arrival)
        self.hass.states['binary_sensor.occupied'].state = 'unknown'
        self.runtime._state_changed(SimpleNamespace(data={'entity_id': 'binary_sensor.occupied'}))
        self.assertIsNone(self.runtime._confirmation)
        self.assertEqual(self.data['planned_return_episode']['return_at'], arrival)
        later = NOW + timedelta(minutes=5)
        with patch.object(scheduler_module.dt_util, 'now', return_value=later):
            self.hass.states['binary_sensor.occupied'].state = 'off'
            self.runtime._state_changed(SimpleNamespace(data={'entity_id': 'binary_sensor.occupied'}))
        self.assertEqual(self.runtime._confirmation, NOW + timedelta(minutes=15))

    async def test_armed_expiry_before_or_exactly_at_confirmation_changes_no_mode(self):
        for delay in (10, 5):
            with self.subTest(delay=delay):
                self.data['planned_return_episode'] = None
                await self.manual_only(home=False, delay=delay)
                due = NOW + timedelta(minutes=5)
                await self.scheduler.async_start_planned_return(due.isoformat())
                with patch.object(scheduler_module.dt_util, 'now', return_value=due):
                    await self.runtime._tick(due, self.runtime._generation)
                self.assertIsNone(self.data['planned_return_episode'])
                self.assertIsNone(self.scheduler.active_mode_id)
                self.assertEqual(self.climate.calls, [])

    async def test_start_replaces_armed_hour_and_cancel_changes_no_mode(self):
        await self.manual_only()
        await self.scheduler.async_start_planned_return((NOW + timedelta(minutes=70)).isoformat())
        await self.scheduler.async_start_planned_return((NOW + timedelta(minutes=80)).isoformat())
        self.assertEqual(self.data['planned_return_episode']['return_at'], (NOW + timedelta(minutes=80)).isoformat())
        await self.scheduler.async_adjust_planned_return((NOW + timedelta(minutes=85)).isoformat())
        await self.scheduler.async_cancel_planned_return()
        self.assertEqual(self.runtime.episode['state'], 'cancelled')
        self.assertTrue(self.runtime.status()['dismissed'])
        self.assertEqual(self.climate.calls, [])
        await self.scheduler.async_cancel_planned_return()

    async def test_start_upgrades_active_automatic_absence_without_repeating_away(self):
        await self.depart()
        self.climate.calls.clear()
        await self.scheduler.async_start_planned_return((NOW + timedelta(minutes=75)).isoformat())
        self.assertEqual(self.data['planned_return_episode']['origin'], 'manual')
        self.assertEqual(self.data['planned_return_episode']['state'], 'away')
        self.assertEqual(self.climate.calls, [])
        await self.scheduler.async_cancel_planned_return()
        self.assertEqual(self.runtime.episode['state'], 'cancelled')
        self.assertTrue(self.runtime.status()['dismissed'])

    async def test_weekly_and_enabled_edits_preserve_manual_intent_and_restore_restart(self):
        arrival = await self.manual_only()
        await self.scheduler.async_start_planned_return(arrival)
        expected = deepcopy(self.data['planned_return_episode'])
        config = deepcopy(self.data['planned_return'])
        config['enabled'] = True
        config['weekly']['tuesday'] = '20:00'
        await self.scheduler.async_update_planned_return(config)
        config['enabled'] = False
        await self.scheduler.async_update_planned_return(config)
        self.assertEqual(self.data['planned_return_episode'], expected)
        restarted_data = normalize_schedule_data(deepcopy(self.data), ['climate.salon'])
        restarted = VelairScheduler(self.hass, restarted_data, self.climate, self.save)
        await restarted.async_start()
        self.assertEqual(restarted.get_planned_return_status()['state'], 'armed')
        self.assertEqual(restarted.get_planned_return_status()['origin'], 'manual')
        await restarted.async_stop()

    async def test_sources_or_modes_edit_invalidates_manual_intent_without_mode_change(self):
        arrival = await self.manual_only()
        await self.scheduler.async_start_planned_return(arrival)
        config = deepcopy(self.data['planned_return'])
        config['away_mode_id'] = 'default'
        await self.scheduler.async_update_planned_return(config)
        self.assertIsNone(self.data['planned_return_episode'])
        self.assertEqual(self.climate.calls, [])
        self.assertEqual(self.runtime.status()['notice'], 'configuration_changed')

    async def test_start_rejects_invalid_entities_modes_time_but_accepts_terminal_episode(self):
        arrival = await self.manual_only()
        self.data['planned_return']['occupancy_entity_ids'] = ['zone.other']
        with self.assertRaises(ValueError):
            await self.scheduler.async_start_planned_return(arrival)
        self.data['planned_return']['occupancy_entity_ids'] = ['binary_sensor.missing']
        with self.assertRaises(ValueError):
            await self.scheduler.async_start_planned_return(arrival)
        self.data['planned_return']['occupancy_entity_ids'] = ['binary_sensor.occupied']
        self.data['planned_return']['away_mode_id'] = 'missing'
        with self.assertRaises(ValueError):
            await self.scheduler.async_start_planned_return(arrival)
        self.data['planned_return']['away_mode_id'] = 'away'
        for value in (NOW.isoformat(), (NOW - timedelta(days=1)).isoformat(), '2026-05-19T19:00:00'):
            with self.assertRaises(ValueError):
                await self.scheduler.async_start_planned_return(value)
        await self.scheduler.async_start_planned_return(arrival)
        self.data['planned_return_episode']['state'] = 'fulfilled'
        self.hass.states['binary_sensor.occupied'].state = 'off'
        self.assertTrue(self.runtime.status()['can_start'])
        await self.scheduler.async_start_planned_return(arrival)
        self.assertEqual(self.runtime.episode['state'], 'armed')

    async def test_zone_home_integer_count_and_multi_source_or(self):
        self.data['planned_return']['occupancy_entity_ids'] = ['binary_sensor.occupied', 'zone.home']
        self.hass.states['binary_sensor.occupied'].state = 'off'
        for value, expected in [('0', 'away'), ('1', 'home'), ('2', 'home'), ('-1', 'unknown'), ('0.5', 'unknown'), ('nan', 'unknown'), ('inf', 'unknown'), ('unavailable', 'unknown')]:
            self.hass.states['zone.home'] = SimpleNamespace(state=value, attributes={})
            self.assertEqual(self.runtime.occupancy(), expected)
            self.assertEqual(self.runtime.status()['sources'][-1]['state'], expected)
        self.hass.states['binary_sensor.occupied'].state = 'on'
        self.assertEqual(self.runtime.occupancy(), 'home')

    async def test_explicit_same_profile_selection_cancels_armed_manual_intent(self):
        arrival = await self.manual_only()
        await self.scheduler.async_start_planned_return(arrival)
        await self.scheduler.async_deactivate_profile()
        self.assertEqual(self.data['planned_return_episode']['state'], 'cancelled')
        self.assertEqual(self.climate.calls, [])

    async def test_automatic_disable_and_restart_preserves_cancelled_latch_until_home(self):
        await self.depart()
        config = deepcopy(self.data['planned_return'])
        config['enabled'] = False
        await self.scheduler.async_update_planned_return(config)
        self.assertEqual(self.data['planned_return_episode']['state'], 'cancelled')
        restored_data = normalize_schedule_data(deepcopy(self.data), ['climate.salon'])
        restored = VelairScheduler(self.hass, restored_data, self.climate, self.save)
        await restored.async_start()
        self.assertEqual(restored_data['planned_return_episode']['state'], 'cancelled')
        self.assertTrue(restored.get_planned_return_status()['can_start'])
        self.hass.states['binary_sensor.occupied'].state = 'on'
        await restored._planned_return._tick(NOW, restored._planned_return._generation)
        self.assertIsNone(restored_data['planned_return_episode'])
        await restored.async_stop()

    async def test_sources_rebind_cancels_active_intent_while_away_and_invalidates_callbacks(self):
        arrival = await self.manual_only(home=False, delay=0)
        await self.scheduler.async_start_planned_return(arrival)
        await self.depart()
        self.hass.states['zone.home'] = SimpleNamespace(state='0', attributes={})
        config = deepcopy(self.data['planned_return'])
        config['occupancy_entity_ids'] = ['zone.home']
        old_generation = self.runtime._generation
        await self.scheduler.async_update_planned_return(config)
        self.assertEqual(self.data['planned_return_episode']['state'], 'cancelled')
        self.assertGreater(self.runtime._generation, old_generation)
        self.climate.calls.clear()
        await self.runtime._tick(NOW + timedelta(minutes=90), old_generation)
        self.assertEqual(self.climate.calls, [])
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        restored_data = normalize_schedule_data(deepcopy(self.data), ['climate.salon'])
        self.assertEqual(restored_data['planned_return_episode']['state'], 'cancelled')

    async def test_manual_away_completes_with_auto_disabled_and_holds_terminal(self):
        arrival = await self.manual_only(home=False, delay=0)
        await self.scheduler.async_start_planned_return(arrival)
        await self.depart()
        due = NOW + timedelta(minutes=90)
        with patch.object(scheduler_module.dt_util, 'now', return_value=due):
            await self.runtime._tick(due, self.runtime._generation)
        self.assertEqual(self.data['planned_return_episode']['state'], 'fulfilled')
        self.assertEqual(self.scheduler.active_profile_ids, [])
        self.assertTrue(self.runtime.can_start())
        self.hass.states['binary_sensor.occupied'].state = 'on'
        await self.runtime._tick(due, self.runtime._generation)
        self.assertIsNone(self.data['planned_return_episode'])
        self.assertTrue(self.runtime.can_start())

    async def test_manual_start_rejects_external_transition_before_persisting(self):
        arrival = await self.manual_only()
        from custom_components.velair.execution import ExecutionAuthority
        self.scheduler._execution_authority = ExecutionAuthority(self.data)
        self.data['zones']['climate.salon']['execution'] = {'type': 'external', 'provider': 'test'}
        with self.assertRaises(ValueError):
            await self.scheduler.async_start_planned_return(arrival)
        self.assertIsNone(self.data['planned_return_episode'])
        self.assertEqual(self.climate.calls, [])

    async def test_adjust_automatic_return_promotes_manual_override_and_survives_disable(self):
        await self.depart()
        arrival = (NOW + timedelta(minutes=75)).isoformat()
        await self.scheduler.async_adjust_planned_return(arrival)
        self.assertEqual(self.data['planned_return_episode']['origin'], 'manual')
        config = deepcopy(self.data['planned_return'])
        config.update(enabled=False)
        config['weekly']['tuesday'] = '22:00'
        await self.scheduler.async_update_planned_return(config)
        self.assertEqual(self.data['planned_return_episode']['state'], 'away')
        self.assertEqual(self.data['planned_return_episode']['return_at'], arrival)
        self.assertEqual(self.runtime.status()['origin'], 'manual')

    async def test_weekly_and_enabled_edits_preserve_elapsed_manual_absence_confirmation(self):
        arrival = await self.manual_only(home=False, delay=10)
        await self.scheduler.async_start_planned_return(arrival)
        deadline = NOW + timedelta(minutes=10)
        self.assertEqual(self.runtime._confirmation, deadline)
        nine_minutes = NOW + timedelta(minutes=9)
        with patch.object(scheduler_module.dt_util, 'now', return_value=nine_minutes):
            config = deepcopy(self.data['planned_return'])
            config['weekly']['tuesday'] = '22:00'
            await self.scheduler.async_update_planned_return(config)
            self.assertEqual(self.runtime._confirmation, deadline)
            for enabled in (True, False):
                config['enabled'] = enabled
                await self.scheduler.async_update_planned_return(config)
                self.assertEqual(self.runtime._confirmation, deadline)
                self.assertEqual(self.data['planned_return_episode']['return_at'], arrival)
        with patch.object(scheduler_module.dt_util, 'now', return_value=deadline):
            await self.runtime._tick(deadline, self.runtime._generation)
        self.assertEqual(self.data['planned_return_episode']['state'], 'away')
        self.assertEqual(self.scheduler.active_mode_id, 'away')

    async def test_changed_delay_restarts_manual_confirmation(self):
        arrival = await self.manual_only(home=False, delay=10)
        await self.scheduler.async_start_planned_return(arrival)
        nine_minutes = NOW + timedelta(minutes=9)
        with patch.object(scheduler_module.dt_util, 'now', return_value=nine_minutes):
            config = deepcopy(self.data['planned_return'])
            config['absence_delay_minutes'] = 5
            await self.scheduler.async_update_planned_return(config)
        self.assertEqual(self.runtime._confirmation, NOW + timedelta(minutes=14))

    async def test_new_request_after_source_change_uses_fresh_confirmation_and_modes(self):
        arrival = await self.manual_only(home=False, delay=0)
        await self.scheduler.async_start_planned_return(arrival)
        await self.depart()
        self.data['planned_return_episode']['preparing_entities'] = ['climate.salon']
        self.hass.states['zone.home'] = SimpleNamespace(state='0', attributes={})
        config = deepcopy(self.data['planned_return'])
        config.update(occupancy_entity_ids=['zone.home'], absence_delay_minutes=10,
                      away_mode_id='default', destination_mode_id='away')
        await self.scheduler.async_update_planned_return(config)
        self.assertEqual(self.data['planned_return_episode']['state'], 'cancelled')
        self.assertTrue(self.runtime.status()['can_start'])
        old_generation = self.runtime._generation
        self.climate.calls.clear()
        later = NOW + timedelta(minutes=5)
        new_arrival = NOW + timedelta(minutes=110)
        with patch.object(scheduler_module.dt_util, 'now', return_value=later):
            await self.scheduler.async_start_planned_return(new_arrival.isoformat())
        self.assertEqual(self.data['planned_return_episode'], {
            'state': 'armed', 'origin': 'manual', 'started_at': later.isoformat(),
            'return_at': new_arrival.isoformat(), 'away_mode_id': 'default',
            'destination_mode_id': 'away', 'preparing_entities': [],
            'previous_selection': {'mode_id': 'away', 'profile_ids': ['away_profile']},
        })
        self.assertEqual(self.runtime._confirmation, later + timedelta(minutes=10))
        self.assertGreater(self.runtime._generation, old_generation)
        self.assertIsNone(self.runtime.status()['notice'])
        self.assertEqual(self.climate.calls, [])
        await self.runtime._tick(new_arrival, old_generation)
        self.assertEqual(self.data['planned_return_episode']['state'], 'armed')
        self.assertEqual(self.climate.calls, [])
        await self.runtime._tick(later + timedelta(minutes=9), self.runtime._generation)
        self.assertEqual(self.data['planned_return_episode']['state'], 'armed')
        confirmed = later + timedelta(minutes=10)
        with patch.object(scheduler_module.dt_util, 'now', return_value=confirmed):
            await self.runtime._tick(confirmed, self.runtime._generation)
        self.assertEqual(self.data['planned_return_episode']['state'], 'away')
        self.assertIsNone(self.scheduler.active_mode_id)

    async def test_explicit_request_rearms_cancelled_home_or_unknown_without_mode_change(self):
        arrival = await self.manual_only()
        for state in ('on', 'unknown', 'unavailable'):
            with self.subTest(state=state):
                self.hass.states['binary_sensor.occupied'].state = state
                self.data['planned_return_episode'] = {
                    'state': 'cancelled', 'origin': 'manual', 'started_at': NOW.isoformat(),
                    'return_at': arrival, 'away_mode_id': 'away',
                    'destination_mode_id': 'default', 'preparing_entities': [],
                }
                self.runtime.stop()
                self.runtime.refresh()
                self.assertTrue(self.runtime.can_start())
                await self.scheduler.async_start_planned_return(arrival)
                await self.runtime._tick(NOW, self.runtime._generation)
                self.assertEqual(self.data['planned_return_episode']['state'], 'armed')
                self.assertIsNone(self.runtime._confirmation)
                self.assertEqual(self.climate.calls, [])

    async def test_cancelled_restart_accepts_explicit_request_without_automatic_rearm(self):
        await self.depart()
        await self.scheduler.async_select_velair_mode('away')
        restored_data = normalize_schedule_data(deepcopy(self.data), ['climate.salon'])
        restored = VelairScheduler(self.hass, restored_data, self.climate, self.save)
        try:
            await restored.async_start()
            runtime = restored._planned_return
            await runtime._tick(NOW, runtime._generation)
            self.assertEqual(restored_data['planned_return_episode']['state'], 'cancelled')
            self.assertIsNone(runtime._confirmation)
            self.assertTrue(runtime.can_start())
            self.climate.calls.clear()
            await restored.async_start_planned_return((NOW + timedelta(minutes=70)).isoformat())
            self.assertEqual(restored_data['planned_return_episode']['state'], 'armed')
            self.assertEqual(self.climate.calls, [])
        finally:
            await restored.async_stop()

    async def test_cancelled_request_validation_or_save_failure_preserves_latch_and_callbacks(self):
        arrival = await self.manual_only(home=False)
        await self.scheduler.async_start_planned_return(arrival)
        await self.scheduler.async_deactivate_profile()
        self.hass.states['binary_sensor.occupied'].state = 'on'
        self.runtime.refresh()
        previous = deepcopy(self.data['planned_return_episode'])
        timer, listener = self.runtime._timer, self.runtime._listener
        generation, timer_generation = self.runtime._generation, self.runtime._timer_generation
        failures = (
            ('time', ValueError), ('sources', ValueError),
            ('external', ValueError), ('save', OSError),
        )
        from custom_components.velair.execution import ExecutionAuthority
        self.scheduler._execution_authority = ExecutionAuthority(self.data)
        for failure, expected in failures:
            with self.subTest(failure=failure):
                value = NOW.isoformat() if failure == 'time' else arrival
                if failure == 'sources':
                    self.data['planned_return']['occupancy_entity_ids'] = ['binary_sensor.missing']
                if failure == 'external':
                    self.data['zones']['climate.salon']['execution'] = {'type': 'external', 'provider': 'test'}
                if failure == 'save':
                    self.save.side_effect = OSError('storage failed')
                try:
                    with self.assertRaises(expected):
                        await self.scheduler.async_start_planned_return(value)
                    self.assertEqual(self.data['planned_return_episode'], previous)
                    self.assertIs(self.runtime._listener, listener)
                    self.assertEqual(self.runtime._generation, generation)
                    if failure == 'save':
                        self.assertIsNone(self.runtime._confirmation)
                        self.assertGreater(self.runtime._timer_generation, timer_generation)
                    else:
                        self.assertIs(self.runtime._timer, timer)
                        self.assertEqual(self.runtime._timer_generation, timer_generation)
                    self.assertEqual(self.climate.calls, [])
                finally:
                    self.data['planned_return']['occupancy_entity_ids'] = ['binary_sensor.occupied']
                    self.data['zones']['climate.salon'].pop('execution', None)
                    self.save.side_effect = None

    async def test_cancelled_rearm_invalidates_captured_callbacks_after_save(self):
        import custom_components.velair.planned_return as module
        arrival = await self.manual_only()
        await self.scheduler.async_start_planned_return(arrival)
        await self.scheduler.async_deactivate_profile()
        with patch.object(module, 'async_track_state_change_event', return_value=lambda: None) as listen, patch.object(module, 'async_track_point_in_time', return_value=lambda: None) as timer:
            self.runtime.stop()
            self.runtime.refresh()
            old_state = listen.call_args.args[2]
            old_timer = timer.call_args.args[1]
            await self.scheduler.async_start_planned_return(arrival)
            with patch.object(self.runtime, '_state_changed') as changed, patch.object(self.runtime, '_timer_fired') as fired:
                old_state(SimpleNamespace(data={'entity_id': 'binary_sensor.occupied'}))
                old_timer(NOW)
                changed.assert_not_called()
                fired.assert_not_called()

    async def test_failed_cancelled_rearm_clears_confirmation_created_during_save(self):
        import custom_components.velair.planned_return as module
        arrival = await self.manual_only(home=False, delay=10)
        await self.scheduler.async_start_planned_return(arrival)
        await self.scheduler.async_deactivate_profile()
        previous = deepcopy(self.data['planned_return_episode'])
        generation = self.runtime._generation
        callbacks = []
        def track_timer(hass, callback, when):
            callbacks.append((callback, when))
            return lambda: None
        async def failed_save_with_source_event():
            self.runtime._state_changed(SimpleNamespace(data={'entity_id': 'binary_sensor.occupied'}))
            self.assertEqual(self.runtime._confirmation, NOW + timedelta(minutes=10))
            raise OSError('storage failed after source event')
        self.climate.calls.clear()
        self.save.side_effect = failed_save_with_source_event
        with patch.object(module, 'async_track_point_in_time', side_effect=track_timer):
            with self.assertRaises(OSError):
                await self.scheduler.async_start_planned_return(arrival)
            self.assertEqual(self.data['planned_return_episode'], previous)
            self.assertEqual(self.runtime._generation, generation)
            self.assertIsNone(self.runtime._confirmation)
            self.assertIsNone(self.runtime._timer)
            self.assertTrue(callbacks)
            with patch.object(self.runtime, '_timer_fired') as fired:
                for callback, when in callbacks:
                    callback(when)
                fired.assert_not_called()
        self.save.side_effect = None
        await self.runtime._tick(NOW + timedelta(minutes=10), self.runtime._generation)
        self.assertEqual(self.data['planned_return_episode'], previous)
        self.assertIsNone(self.runtime._confirmation)
        self.assertEqual(self.climate.calls, [])

    async def test_refresh_clears_confirmation_when_cancelled_latch_is_restored(self):
        arrival = await self.manual_only(home=False, delay=10)
        await self.scheduler.async_start_planned_return(arrival)
        self.assertIsNotNone(self.runtime._confirmation)
        self.data['planned_return_episode']['state'] = 'cancelled'
        self.runtime.refresh()
        self.assertIsNone(self.runtime._confirmation)
        self.assertEqual(self.runtime.status()['state'], 'cancelled')

    async def test_dismiss_cancelled_return_without_operational_scheduler_or_sources(self):
        await self.depart()
        await self.scheduler.async_select_velair_mode('away')
        previous = deepcopy(self.data['planned_return_episode'])
        for condition in ('stopped', 'no_sources', 'unknown', 'away'):
            with self.subTest(condition=condition):
                self.data['planned_return_episode'] = deepcopy(previous)
                self.scheduler._stopped = condition == 'stopped'
                self.data['planned_return']['occupancy_entity_ids'] = [] if condition == 'no_sources' else ['binary_sensor.occupied']
                self.hass.states['binary_sensor.occupied'].state = 'unknown' if condition == 'unknown' else 'off'
                self.runtime.error = 'previous failure'
                self.runtime.notice = 'configuration_changed'
                self.climate.calls.clear()
                self.assertTrue(self.runtime.status()['can_dismiss'])
                self.assertEqual(self.runtime.status()['state'], 'error')
                await self.scheduler.async_cancel_planned_return()
                self.assertEqual(self.data['planned_return_episode'], previous | {'dismissed': True})
                self.assertEqual(self.scheduler.active_mode_id, 'away')
                self.assertEqual(self.climate.calls, [])
                self.assertIsNone(self.runtime.error)
                self.assertIsNone(self.runtime.notice)
                self.assertIsNone(self.runtime._confirmation)
                self.assertTrue(self.runtime.status()['dismissed'])
                self.assertFalse(self.runtime.status()['can_dismiss'])
                self.save.reset_mock()
                await self.scheduler.async_cancel_planned_return()
                self.save.assert_not_awaited()
                await self.runtime._tick(NOW + timedelta(minutes=90), self.runtime._generation)
                self.assertEqual(self.data['planned_return_episode'], previous | {'dismissed': True})
                self.assertEqual(self.climate.calls, [])
        self.scheduler._stopped = False

    async def test_dismissed_cancelled_latch_survives_restart_and_allows_new_request(self):
        await self.depart()
        await self.scheduler.async_select_velair_mode('away')
        await self.scheduler.async_cancel_planned_return()
        restored_data = normalize_schedule_data(deepcopy(self.data), ['climate.salon'])
        restored = VelairScheduler(self.hass, restored_data, self.climate, self.save)
        try:
            await restored.async_start()
            runtime = restored._planned_return
            self.assertTrue(runtime.status()['dismissed'])
            self.assertFalse(runtime.status()['can_dismiss'])
            self.climate.calls.clear()
            await runtime._tick(NOW + timedelta(minutes=90), runtime._generation)
            self.assertEqual(restored_data['planned_return_episode']['state'], 'cancelled')
            self.assertEqual(self.climate.calls, [])
            await restored.async_start_planned_return((NOW + timedelta(minutes=110)).isoformat())
            self.assertEqual(restored_data['planned_return_episode']['state'], 'armed')
            self.assertNotIn('dismissed', restored_data['planned_return_episode'])
            self.assertFalse(runtime.status()['dismissed'])
            self.assertEqual(self.climate.calls, [])
        finally:
            await restored.async_stop()

    async def test_presence_clears_dismissed_cancelled_latch_without_selecting_mode(self):
        await self.depart()
        await self.scheduler.async_select_velair_mode('away')
        await self.scheduler.async_cancel_planned_return()
        self.climate.calls.clear()
        self.hass.states['binary_sensor.occupied'].state = 'on'
        await self.runtime._tick(NOW, self.runtime._generation)
        self.assertIsNone(self.data['planned_return_episode'])
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        self.assertEqual(self.climate.calls, [])

    async def test_failed_dismissal_preserves_visible_latch_and_error(self):
        await self.depart()
        await self.scheduler.async_select_velair_mode('away')
        previous = deepcopy(self.data['planned_return_episode'])
        self.runtime.error = 'old error'
        self.runtime.notice = 'configuration_changed'
        self.save.side_effect = OSError('storage failed')
        self.climate.calls.clear()
        with self.assertRaises(OSError):
            await self.scheduler.async_cancel_planned_return()
        self.assertEqual(self.data['planned_return_episode'], previous)
        self.assertTrue(self.runtime.status()['can_dismiss'])
        self.assertFalse(self.runtime.status()['dismissed'])
        self.assertEqual(self.runtime.error, 'old error')
        self.assertEqual(self.runtime.notice, 'configuration_changed')
        self.assertEqual(self.climate.calls, [])
        self.save.side_effect = None

    async def test_explicit_profile_cancellation_stays_latched_until_new_request(self):
        arrival = await self.manual_only(home=False, delay=0)
        await self.scheduler.async_start_planned_return(arrival)
        await self.depart()
        await self.scheduler.async_deactivate_profile()
        self.climate.calls.clear()
        self.runtime.refresh()
        await self.runtime._tick(NOW + timedelta(minutes=90), self.runtime._generation)
        self.assertEqual(self.data['planned_return_episode']['state'], 'cancelled')
        self.assertEqual(self.climate.calls, [])
        await self.scheduler.async_start_planned_return((NOW + timedelta(minutes=100)).isoformat())
        self.assertEqual(self.data['planned_return_episode']['state'], 'armed')
        self.assertEqual(self.climate.calls, [])

    async def test_all_terminal_episodes_allow_fresh_explicit_departure(self):
        arrival = await self.manual_only(home=False, delay=10)
        await self.scheduler.async_start_planned_return(arrival)
        for state in ('fulfilled', 'skipped', 'cancelled'):
            with self.subTest(state=state):
                self.runtime.episode.update(state=state, departure_at=NOW.isoformat(), dismissed=True,
                                            preparing_entities=['climate.salon'])
                self.runtime.stop()
                later = NOW + timedelta(minutes=1)
                with patch.object(scheduler_module.dt_util, 'now', return_value=later):
                    self.assertTrue(self.runtime.can_start())
                    await self.scheduler.async_start_planned_return(arrival)
                self.assertEqual(self.runtime.episode['state'], 'armed')
                self.assertEqual(self.runtime.episode['started_at'], later.isoformat())
                self.assertNotIn('departure_at', self.runtime.episode)
                self.assertNotIn('dismissed', self.runtime.episode)
                self.assertEqual(self.runtime.episode['preparing_entities'], [])
                self.assertEqual(self.runtime._confirmation, later + timedelta(minutes=10))

    def preparation_row(self):
        return self.runtime.status()['preparation']['zones'][0]

    async def test_active_cancel_restores_profile_authority_and_never_rearms_weekly(self):
        await self.depart()
        self.runtime.episode['preparing_entities'] = ['climate.salon']
        with patch.object(self.scheduler, '_async_clear_room_sensor_assist', new_callable=AsyncMock) as assist, patch.object(self.scheduler, '_clear_applied_preconditioning_targets_for_entity') as clear, patch.object(self.scheduler, 'async_apply_current_schedule', new_callable=AsyncMock) as restore:
            await self.scheduler.async_cancel_planned_return()
        assist.assert_any_await('climate.salon', restore=False, reason='planned_return_cancelled')
        clear.assert_called_with('climate.salon')
        restore.assert_any_await('climate.salon', source='planned_return_cancelled')
        self.assertIsNone(self.scheduler.active_mode_id)
        self.assertEqual(self.scheduler.active_profile_ids, [])
        self.assertEqual(self.runtime.episode['state'], 'cancelled')
        self.assertTrue(self.runtime.status()['dismissed'])
        self.assertFalse(self.runtime.status()['can_cancel'])
        self.assertFalse(self.runtime.status()['episode_active'])
        self.climate.calls.clear()
        await self.runtime._tick(NOW + timedelta(hours=2), self.runtime._generation)
        self.assertEqual(self.climate.calls, [])
        restored_data = normalize_schedule_data(deepcopy(self.data), ['climate.salon'])
        self.assertTrue(restored_data['planned_return_episode']['dismissed'])

    async def test_error_masked_active_cancel_available_even_stopped_or_invalid(self):
        await self.depart()
        self.runtime.episode['preparing_entities'] = ['climate.salon']
        self.scheduler._stopped = True
        self.data['planned_return']['occupancy_entity_ids'] = []
        self.runtime.error = 'delivery failed'
        self.assertTrue(self.runtime.status()['episode_active'])
        self.assertTrue(self.runtime.status()['can_cancel'])
        with patch.object(self.scheduler, 'async_apply_current_schedule', new_callable=AsyncMock) as restore:
            await self.scheduler.async_cancel_planned_return()
        self.assertNotIn(unittest.mock.call('climate.salon', source='planned_return_cancelled'), restore.call_args_list)
        self.assertFalse(self.runtime.status()['episode_active'])
        self.assertIsNone(self.runtime.error)
        self.scheduler._stopped = False

    async def test_active_cancel_failed_save_preserves_return_authority(self):
        await self.depart()
        self.runtime.episode['preparing_entities'] = ['climate.salon']
        previous = deepcopy(self.runtime.episode)
        previous_selection = self.runtime._selection_snapshot()
        self.save.side_effect = OSError('storage failed')
        with patch.object(self.scheduler, '_invalidate_climate_delivery') as invalidate, patch.object(self.scheduler, '_async_clear_room_sensor_assist', new_callable=AsyncMock) as assist:
            with self.assertRaises(OSError):
                await self.scheduler.async_cancel_planned_return()
        self.assertEqual(self.runtime.episode, previous)
        self.assertTrue(self.runtime.status()['episode_active'])
        self.assertIsNotNone(self.runtime._timer)
        self.assertEqual(self.runtime._selection_snapshot(), previous_selection)
        assist.assert_not_awaited()
        self.save.side_effect = None

    async def test_cancel_postcommit_delivery_failure_keeps_cancelled_latch(self):
        await self.depart()
        self.runtime.episode['preparing_entities'] = ['climate.salon']
        with patch.object(self.scheduler, 'async_apply_current_schedule', new_callable=AsyncMock, side_effect=OSError('climate offline')):
            await self.scheduler.async_cancel_planned_return()
        self.assertTrue(self.runtime.status()['dismissed'])
        self.assertEqual(self.runtime.episode['state'], 'cancelled')

    async def test_cancel_preparation_preserves_boost_and_manual_holds(self):
        for override in ('boost', 'pause'):
            with self.subTest(override=override):
                self.data['planned_return_episode'] = None
                self.runtime.stop()
                self.runtime.refresh()
                await self.depart()
                self.runtime.episode['preparing_entities'] = ['climate.salon']
                if override == 'boost':
                    await self.scheduler.async_set_zone_boost('climate.salon', temperature=24, until=(NOW + timedelta(hours=3)).isoformat())
                else:
                    await self.scheduler.async_pause_zone('climate.salon')
                saved_override = deepcopy(self.data['zones']['climate.salon']['override'])
                marker = SimpleNamespace(target_when=NOW + timedelta(hours=2))
                self.scheduler._applied_preconditioning_targets['climate.salon|old-return'] = marker
                with patch.object(self.scheduler, '_invalidate_climate_delivery') as invalidate, patch.object(self.scheduler, '_discard_preconditioning_session') as discard, patch.object(self.scheduler, '_async_clear_room_sensor_assist', new_callable=AsyncMock) as assist, patch.object(self.scheduler, 'async_apply_current_schedule', new_callable=AsyncMock) as restore:
                    await self.scheduler.async_cancel_planned_return()
                self.assertEqual(self.data['zones']['climate.salon']['override'], saved_override)
                assist.assert_not_awaited()
                restore.assert_not_awaited()
                invalidate.assert_not_called()
                discard.assert_not_called()
                self.assertEqual(self.scheduler._applied_preconditioning_targets, {})

    async def test_every_terminal_notice_can_be_closed_and_survives_restart(self):
        await self.depart()
        for state in ('fulfilled', 'skipped', 'cancelled'):
            with self.subTest(state=state):
                self.runtime.episode.update(state=state)
                self.runtime.episode.pop('dismissed', None)
                self.assertTrue(self.runtime.status()['can_cancel'])
                await self.scheduler.async_cancel_planned_return()
                self.assertEqual(self.runtime.episode['state'], state)
                self.assertFalse(self.runtime.status()['can_cancel'])
                restored = normalize_schedule_data(deepcopy(self.data), ['climate.salon'])
                self.assertTrue(restored['planned_return_episode']['dismissed'])

    async def test_explicit_terminal_restart_releases_stale_preparation_markers(self):
        await self.depart()
        self.runtime.episode['state'] = 'skipped'
        self.runtime.episode['preparing_entities'] = []
        self.scheduler._applied_preconditioning_targets['climate.salon|old-target'] = SimpleNamespace(target_when=NOW + timedelta(hours=2))
        self.runtime._applied['climate.salon'] = 'old-return-intent'
        with patch.object(self.scheduler, '_async_clear_room_sensor_assist', new_callable=AsyncMock) as assist, patch.object(self.scheduler, 'async_apply_current_schedule', new_callable=AsyncMock) as restore:
            await self.scheduler.async_start_planned_return((NOW + timedelta(hours=4)).isoformat())
        self.assertEqual(self.scheduler._applied_preconditioning_targets, {})
        assist.assert_awaited_once_with('climate.salon', restore=False, reason='planned_return_restarted')
        restore.assert_awaited_once_with('climate.salon', source='planned_return_restarted')
        self.assertEqual(self.runtime.episode['state'], 'armed')
        self.assertNotIn('departure_at', self.runtime.episode)

    async def test_terminal_restart_failed_save_preserves_old_preparation_markers(self):
        await self.depart()
        self.runtime.episode['state'] = 'skipped'
        previous = deepcopy(self.runtime.episode)
        marker = SimpleNamespace(target_when=NOW + timedelta(hours=2))
        self.scheduler._applied_preconditioning_targets['climate.salon|old-target'] = marker
        self.save.side_effect = OSError('storage failed')
        with self.assertRaises(OSError):
            await self.scheduler.async_start_planned_return((NOW + timedelta(hours=4)).isoformat())
        self.assertEqual(self.runtime.episode, previous)
        self.assertIs(self.scheduler._applied_preconditioning_targets['climate.salon|old-target'], marker)
        self.assertIsNone(self.runtime._confirmation)
        self.save.side_effect = None

    async def test_closed_skipped_notice_clears_on_presence_without_selecting_destination(self):
        await self.depart()
        await self.scheduler.async_skip_planned_return()
        await self.scheduler.async_cancel_planned_return()
        self.climate.calls.clear()
        self.hass.states['binary_sensor.occupied'].state = 'on'
        await self.runtime._tick(NOW, self.runtime._generation)
        self.assertIsNone(self.runtime.episode)
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        self.assertEqual(self.climate.calls, [])

    async def test_cancel_return_preserves_unrelated_adaptive_preparation_and_delivery(self):
        await self.depart()
        self.runtime.episode['preparing_entities'] = ['climate.salon']
        self.data['zones']['climate.office'] = deepcopy(self.data['zones']['climate.salon'])
        marker = SimpleNamespace(target_when=NOW + timedelta(hours=2))
        session = SimpleNamespace(target_when=NOW + timedelta(hours=2))
        self.scheduler._applied_preconditioning_targets['climate.office|ordinary-schedule'] = marker
        self.scheduler._preconditioning_sessions['climate.office'] = session
        with patch.object(self.scheduler, '_invalidate_climate_delivery') as invalidate, patch.object(self.scheduler, '_async_clear_room_sensor_assist', new_callable=AsyncMock), patch.object(self.scheduler, 'async_apply_current_schedule', new_callable=AsyncMock):
            await self.scheduler.async_cancel_planned_return()
        self.assertTrue(invalidate.call_args_list)
        self.assertTrue(all(call == unittest.mock.call('climate.salon') for call in invalidate.call_args_list))
        self.assertIs(self.scheduler._applied_preconditioning_targets['climate.office|ordinary-schedule'], marker)
        self.assertIs(self.scheduler._preconditioning_sessions['climate.office'], session)
        self.scheduler._preconditioning_sessions.pop('climate.office')

    async def test_terminal_restart_does_not_treat_ordinary_marker_as_return_preparation(self):
        await self.depart()
        self.runtime.episode.update(state='fulfilled', preparing_entities=['climate.salon'])
        self.runtime._applied.clear()
        marker = SimpleNamespace(target_when=NOW + timedelta(hours=2))
        self.scheduler._applied_preconditioning_targets['climate.salon|ordinary-schedule'] = marker
        with patch.object(self.scheduler, '_invalidate_climate_delivery') as invalidate, patch.object(self.scheduler, '_discard_preconditioning_session') as discard, patch.object(self.scheduler, '_async_clear_room_sensor_assist', new_callable=AsyncMock) as assist, patch.object(self.scheduler, 'async_apply_current_schedule', new_callable=AsyncMock) as restore:
            await self.scheduler.async_start_planned_return((NOW + timedelta(hours=4)).isoformat())
        self.assertIs(self.scheduler._applied_preconditioning_targets['climate.salon|ordinary-schedule'], marker)
        assist.assert_not_awaited()
        restore.assert_not_awaited()
        invalidate.assert_not_called()
        discard.assert_not_called()

    async def test_initial_pending_start_preserves_existing_adaptive_delivery(self):
        self.hass.states['binary_sensor.occupied'].state = 'on'
        marker = SimpleNamespace(target_when=NOW + timedelta(hours=2))
        self.scheduler._applied_preconditioning_targets['climate.salon|ordinary-schedule'] = marker
        with patch.object(self.scheduler, '_invalidate_climate_delivery') as invalidate, patch.object(self.scheduler, '_discard_preconditioning_session') as discard:
            await self.scheduler.async_start_planned_return((NOW + timedelta(hours=4)).isoformat())
        self.assertEqual(self.runtime.episode['state'], 'armed')
        self.assertIs(self.scheduler._applied_preconditioning_targets['climate.salon|ordinary-schedule'], marker)
        invalidate.assert_not_called()
        discard.assert_not_called()

    async def test_cancel_preserves_deferred_boost_delivery_on_previously_prepared_zone(self):
        await self.depart()
        self.runtime.episode['preparing_entities'] = ['climate.salon']
        await self.scheduler.async_set_zone_boost('climate.salon', temperature=24, until=(NOW + timedelta(hours=3)).isoformat())
        delivery = self.scheduler._climate_delivery
        resolver = lambda: self.scheduler._resolve_authoritative_delivery_event('climate.salon')
        generation = delivery._generations.get('climate.salon', 0)
        delivery._set_eligible('climate.salon', generation, resolver)
        await self.scheduler.async_adjust_planned_return((NOW + timedelta(hours=4)).isoformat())
        self.assertEqual(delivery._generations.get('climate.salon', 0), generation)
        self.assertIs(delivery._eligible['climate.salon'], resolver)
        self.runtime.episode['preparing_entities'] = ['climate.salon']
        await self.scheduler.async_cancel_planned_return()
        self.assertEqual(delivery._generations.get('climate.salon', 0), generation)
        self.assertIs(delivery._eligible['climate.salon'], resolver)
        self.assertEqual(resolver().temperature, 24)

    async def test_retime_preserves_unrelated_adaptive_delivery_and_same_time_intent(self):
        await self.depart()
        marker = SimpleNamespace(target_when=NOW + timedelta(hours=2))
        self.scheduler._applied_preconditioning_targets['climate.salon|ordinary-schedule'] = marker
        with patch.object(self.scheduler, '_invalidate_climate_delivery') as invalidate, patch.object(self.scheduler, '_discard_preconditioning_session') as discard:
            await self.scheduler.async_adjust_planned_return((NOW + timedelta(hours=4)).isoformat())
        invalidate.assert_not_called()
        discard.assert_not_called()
        self.assertIs(self.scheduler._applied_preconditioning_targets['climate.salon|ordinary-schedule'], marker)
        self.runtime._applied['climate.salon'] = 'return-intent'
        with patch.object(self.scheduler, '_invalidate_climate_delivery') as invalidate:
            await self.scheduler.async_adjust_planned_return(self.runtime.episode['return_at'])
        invalidate.assert_not_called()
        self.assertEqual(self.runtime._applied['climate.salon'], 'return-intent')

    async def test_removed_prepared_zone_does_not_block_cancel_or_fresh_start(self):
        await self.depart()
        self.runtime.episode['preparing_entities'] = ['climate.removed']
        self.runtime._applied['climate.removed'] = 'old-return-intent'
        await self.scheduler.async_cancel_planned_return()
        self.assertEqual(self.runtime.episode['state'], 'cancelled')
        self.assertTrue(self.runtime.status()['dismissed'])
        self.runtime._applied['climate.removed'] = 'old-return-intent'
        await self.scheduler.async_start_planned_return((NOW + timedelta(hours=4)).isoformat())
        self.assertEqual(self.runtime.episode['state'], 'armed')
        self.assertEqual(self.runtime.episode['preparing_entities'], [])
        self.runtime.episode['preparing_entities'] = ['climate.removed']
        self.runtime._applied['climate.removed'] = 'old-return-intent'
        await self.scheduler.async_adjust_planned_return((NOW + timedelta(hours=5)).isoformat())
        self.assertEqual(self.runtime.episode['preparing_entities'], [])

    async def test_preparation_configuration_has_no_inferred_target_or_time(self):
        before = deepcopy(self.data)
        calls = list(self.climate.calls)
        saves = self.save.await_count
        sessions = deepcopy(self.scheduler._preconditioning_sessions)
        timer = self.runtime._timer
        row = self.preparation_row()
        self.assertEqual(row['preparation'], 'arrival_only')
        self.assertEqual(row['reason'], 'preconditioning_disabled')
        self.assertEqual(row['schedule_source'], 'default')
        self.assertNotIn('target', row)
        self.assertIsNone(row['start_at'])
        self.data['zones']['climate.salon']['preconditioning']['enabled'] = True
        self.assertEqual(self.preparation_row()['preparation'], 'adaptive')
        self.data['zones']['climate.salon']['preconditioning']['enabled'] = False
        self.assertEqual(self.data, before)
        self.assertEqual(self.climate.calls, calls)
        self.assertEqual(self.save.await_count, saves)
        self.assertEqual(self.scheduler._preconditioning_sessions, sessions)
        self.assertIs(self.runtime._timer, timer)

    async def test_preparation_uses_normal_profile_default_and_distinguishes_pause(self):
        for behavior, source, preparation in [('normal', 'default', 'arrival_only'), ('pause', 'paused', 'none')]:
            with self.subTest(behavior=behavior):
                await self.scheduler.async_set_profile({'key': 'destination', 'name': 'Destination', 'color': '#336699',
                    'zones': {'climate.salon': {'behavior': behavior}}})
                await self.scheduler.async_set_velair_mode({'key': 'destination', 'name': 'Destination', 'profile_ids': ['destination']})
                self.data['planned_return']['destination_mode_id'] = 'destination'
                row = self.preparation_row()
                self.assertEqual(row['profile_id'], 'destination')
                self.assertEqual(row['schedule_source'], source)
                self.assertEqual(row['preparation'], preparation)
                if behavior == 'pause':
                    self.assertEqual(row['state'], 'unavailable')
                    self.assertEqual(row['reason'], 'profile_paused')

    async def test_preparation_all_zones_includes_disabled_and_external(self):
        self.data['zones']['climate.salon']['enabled'] = False
        self.assertEqual(self.preparation_row()['reason'], 'zone_disabled')
        self.data['zones']['climate.salon']['enabled'] = True
        before = deepcopy(self.data)
        calls = list(self.climate.calls)
        saves = self.save.await_count
        with patch.object(self.scheduler, '_is_external_execution', return_value=True):
            row = self.preparation_row()
            self.assertEqual(row['reason'], 'external_execution')
            self.assertEqual(row['preparation'], 'none')
        self.assertEqual(self.data, before)
        self.assertEqual(self.climate.calls, calls)
        self.assertEqual(self.save.await_count, saves)

    async def test_preparation_arrival_resolves_future_block_and_same_prediction(self):
        await self.depart()
        self.data['zones']['climate.salon']['preconditioning']['enabled'] = True
        start = NOW + timedelta(minutes=30)
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(start, {'source': 'test'})):
            row = self.preparation_row()
            self.assertEqual(row['target'], {'temperature': 21})
            self.assertEqual(row['start_at'], start.isoformat())
            self.assertEqual(row['state'], 'pending')
            self.assertEqual(row['preparation'], 'adaptive')
            self.assertEqual(self.runtime.status()['zones'][0]['start_at'], row['start_at'])

    async def test_preparation_armed_does_not_report_preparing_when_start_is_due(self):
        await self.scheduler.async_start_planned_return((NOW + timedelta(minutes=90)).isoformat())
        self.data['zones']['climate.salon']['preconditioning']['enabled'] = True
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW, None)):
            self.assertEqual(self.preparation_row()['state'], 'pending')

    async def test_preparation_armed_reached_is_only_a_measured_observation(self):
        self.hass.states['binary_sensor.occupied'].state = 'on'
        await self.scheduler.async_start_planned_return((NOW + timedelta(minutes=90)).isoformat())
        self.data['zones']['climate.salon']['preconditioning']['enabled'] = True
        self.hass.states['climate.salon'].attributes['current_temperature'] = 21
        before = deepcopy(self.data)
        calls = list(self.climate.calls)
        saves = self.save.await_count
        row = self.preparation_row()
        self.assertEqual(row['state'], 'reached')
        self.assertEqual(row['preparation'], 'adaptive')
        self.assertEqual(self.data['planned_return_episode']['state'], 'armed')
        self.assertEqual(self.data, before)
        self.assertEqual(self.climate.calls, calls)
        self.assertEqual(self.save.await_count, saves)

    async def test_preparation_due_unlatched_is_authorized_intent_without_dispatch(self):
        await self.depart()
        self.data['zones']['climate.salon']['preconditioning']['enabled'] = True
        before = deepcopy(self.data)
        calls = list(self.climate.calls)
        saves = self.save.await_count
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW, {'source': 'test'})):
            status = self.runtime.status()
        self.assertEqual(status['preparation']['zones'][0]['state'], 'preparing')
        self.assertTrue(status['zones'][0]['preparing'])
        self.assertNotIn('climate.salon', self.data['planned_return_episode'].get('preparing_entities', []))
        self.assertEqual(self.data, before)
        self.assertEqual(self.climate.calls, calls)
        self.assertEqual(self.save.await_count, saves)

    async def test_preparation_invalid_thermal_data_falls_back_to_arrival(self):
        await self.depart()
        self.data['zones']['climate.salon']['preconditioning']['enabled'] = True
        for temperature, mode, reason in [(None, 'heat', 'missing_temperature'), (16, 'fan_only', 'unsupported_mode'), (16, 'heat', 'no_estimate')]:
            with self.subTest(reason=reason), patch.object(self.scheduler, '_current_temperature', return_value=temperature), \
                 patch.object(self.climate, 'effective_hvac_mode', return_value=mode), \
                 patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW + timedelta(minutes=90), None)):
                row = self.preparation_row()
                self.assertEqual(row['preparation'], 'arrival_only')
                self.assertEqual(row['reason'], reason)
                self.assertEqual(row['state'], 'pending')

    async def test_preparation_latched_target_remains_adaptive_without_departure_start(self):
        await self.depart()
        self.data['zones']['climate.salon']['preconditioning']['enabled'] = True
        self.data['planned_return_episode']['preparing_entities'] = ['climate.salon']
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW + timedelta(minutes=90), None)):
            row = self.preparation_row()
            self.assertEqual(row['state'], 'preparing')
            self.assertEqual(row['preparation'], 'adaptive')
            self.assertIsNone(row['start_at'])

    async def test_preparation_measured_reached_supports_heat_cool_auto_and_range(self):
        await self.depart()
        self.data['zones']['climate.salon']['preconditioning']['enabled'] = True
        for mode, target, temperature, reached in [
            ('heat', {'temperature': 21}, 22, True), ('heat', {'temperature': 21}, 16, False),
            ('cool', {'temperature': 21}, 20, True), ('cool', {'temperature': 21}, 25, False),
            ('auto', {'temperature': 21}, 21, True), ('auto', {'temperature': 21}, 25, False),
            ('heat_cool', {'target_temp_low': 19, 'target_temp_high': 23}, 21, True),
            ('heat_cool', {'target_temp_low': 19, 'target_temp_high': 23}, 16, False),
            ('fan_only', {'temperature': 21}, 21, False),
        ]:
            with self.subTest(mode=mode, temperature=temperature):
                self.data['zones']['climate.salon']['schedule']['tuesday'] = [{'start': '00:00', 'hvac_mode': mode, **target}]
                with patch.object(self.scheduler, '_current_temperature', return_value=temperature), \
                     patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW + timedelta(minutes=90), None)):
                    self.assertEqual(self.preparation_row()['state'] == 'reached', reached)

    async def test_preparation_runtime_suspension_has_independent_capability(self):
        await self.depart()
        self.data['zones']['climate.salon']['preconditioning']['enabled'] = True
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW, {'source': 'test'})):
            for reason in ('boost', 'paused', 'manual_adjustment', 'scheduler_stopped', 'scheduler_not_auto'):
                with self.subTest(reason=reason):
                    self.data['zones']['climate.salon']['override'] = {'type': 'boost' if reason == 'boost' else 'pause'}
                    with patch.object(self.scheduler, '_is_zone_override_active', return_value=reason in ('boost', 'paused', 'manual_adjustment')), \
                         patch.object(self.scheduler, '_manual_control_status', return_value={} if reason != 'manual_adjustment' else {'active': True}), \
                         patch.object(self.scheduler, '_stopped', reason == 'scheduler_stopped'), \
                         patch.object(type(self.scheduler), 'mode', new_callable=unittest.mock.PropertyMock, return_value='off' if reason == 'scheduler_not_auto' else 'auto'):
                        row = self.preparation_row()
                        self.assertEqual(row['state'], 'suspended')
                        self.assertEqual(row['reason'], reason)
                        self.assertEqual(row['preparation'], 'adaptive')

    async def test_preparation_terminal_episodes_have_configuration_context(self):
        await self.depart()
        for state in ('cancelled', 'skipped', 'fulfilled'):
            with self.subTest(state=state):
                self.data['planned_return_episode']['state'] = state
                preparation = self.runtime.status()['preparation']
                self.assertEqual(preparation['context'], 'configuration')
                self.assertIsNone(preparation['return_at'])
                self.assertNotIn('target', preparation['zones'][0])

    async def test_preparation_profile_schedule_target_and_missing_temperature_action(self):
        schedule = empty_week_schedule()
        schedule['tuesday'] = [{'start': '00:00', 'temperature': 23, 'hvac_mode': 'heat'}]
        await self.scheduler.async_set_profile({'key': 'destination', 'name': 'Destination', 'color': '#336699',
            'zones': {'climate.salon': {'behavior': 'schedule', 'schedule': schedule}}})
        await self.scheduler.async_set_velair_mode({'key': 'destination', 'name': 'Destination', 'profile_ids': ['destination']})
        self.data['planned_return']['destination_mode_id'] = 'destination'
        await self.depart()
        row = self.preparation_row()
        self.assertEqual(row['schedule_source'], 'profile')
        self.assertEqual(row['profile_id'], 'destination')
        self.assertEqual(row['target'], {'temperature': 23})
        profile = self.scheduler._profile_by_id('destination')
        profile['zones']['climate.salon']['schedule']['tuesday'] = [{'start': '00:00', 'action': 'turn_off'}]
        row = self.preparation_row()
        self.assertEqual(row['preparation'], 'none')
        self.assertEqual(row['reason'], 'missing_target')
        self.assertNotIn('target', row)

    async def test_preparation_per_zone_start_times_and_default_fallback(self):
        self.data['zones']['climate.office'] = deepcopy(self.data['zones']['climate.salon'])
        self.data['zones']['climate.office']['schedule']['tuesday'][1]['temperature'] = 20
        self.hass.states['climate.office'] = SimpleNamespace(state='heat', attributes={'current_temperature': 16})
        for zone in self.data['zones'].values():
            zone['preconditioning']['enabled'] = True
        await self.depart()
        def predict(entity, zone, block, arrival):
            return NOW + timedelta(minutes=10 if entity == 'climate.salon' else 40), {'source': 'test'}
        before = deepcopy(self.data)
        with patch.object(self.scheduler, '_preconditioned_event_details', side_effect=predict):
            rows = self.runtime.status()['preparation']['zones']
        self.assertEqual(len(rows), 2)
        self.assertEqual([row['schedule_source'] for row in rows], ['default', 'default'])
        self.assertEqual([row['target']['temperature'] for row in rows], [21, 20])
        self.assertEqual([row['start_at'] for row in rows], [(NOW + timedelta(minutes=10)).isoformat(), (NOW + timedelta(minutes=40)).isoformat()])
        self.assertEqual(self.data, before)

    async def test_multiday_manual_return_survives_midnight_restart_and_fulfills(self):
        arrival = NOW + timedelta(days=3, hours=1)
        await self.scheduler.async_start_planned_return(arrival.isoformat())
        await self.depart()
        self.assertEqual(self.data['planned_return_episode']['origin'], 'manual')
        later = NOW + timedelta(days=1)
        with patch.object(scheduler_module.dt_util, 'now', return_value=later):
            restored = VelairScheduler(self.hass, deepcopy(self.data), self.climate, self.save)
            restored._planned_return.refresh()
            await restored._planned_return._tick(later, restored._planned_return._generation)
            self.assertEqual(restored._data['planned_return_episode']['state'], 'away')
            self.assertEqual(restored._data['planned_return_episode']['return_at'], arrival.isoformat())
            await restored.async_stop()
        with patch.object(scheduler_module.dt_util, 'now', return_value=arrival):
            await self.runtime._tick(arrival, self.runtime._generation)
        self.assertEqual(self.data['planned_return_episode']['state'], 'fulfilled')

    async def test_arrival_target_uses_local_day_and_time_and_utc_elapsed_lead(self):
        timezone = ZoneInfo('Europe/Madrid')
        self.data['zones']['climate.salon']['schedule']['wednesday'] = [
            {'start': '00:00', 'temperature': 23, 'hvac_mode': 'cool'}]
        # Tuesday in UTC, but Wednesday in the household's schedule.
        arrival = datetime(2026, 5, 19, 23, tzinfo=UTC)
        with patch.object(scheduler_module.dt_util, 'as_local', side_effect=lambda value: value.astimezone(timezone)):
            await self.scheduler.async_start_planned_return(arrival.isoformat())
            await self.depart()
            with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(arrival - timedelta(hours=3), None)) as predictor:
                event = self.runtime.plans(NOW)[0]
                self.assertEqual(event.weekday, 'wednesday')
                self.assertEqual(event.temperature, 23)
                self.assertEqual(event.hvac_mode, 'cool')
                self.assertEqual(event.target_when, arrival)
                self.assertEqual(predictor.call_args.args[-1].tzinfo, UTC)
                row = self.runtime.status()['preparation']['zones'][0]
                self.assertEqual(row['target']['temperature'], 23)

    async def test_postponement_clears_preparation_and_restores_away_then_new_target(self):
        await self.depart()
        self.data['planned_return_episode']['preparing_entities'] = ['climate.salon']
        self.data['zones']['climate.salon']['schedule']['wednesday'] = [
            {'start': '00:00', 'target_temp_low': 19, 'target_temp_high': 24, 'hvac_mode': 'heat_cool'}]
        arrival = NOW + timedelta(days=1)
        self.climate.calls.clear()
        with patch.object(self.scheduler, '_preconditioned_event_details', side_effect=lambda entity, zone, block, due: (due - timedelta(hours=3), None)):
            await self.scheduler.async_adjust_planned_return(arrival.isoformat())
            self.assertEqual(self.data['planned_return_episode']['preparing_entities'], [])
            self.assertIsNone(self.runtime.target('climate.salon'))
            self.assertEqual(self.climate.calls, [('turn_off', 'climate.salon')])
            event = self.runtime.plans(NOW)[0]
            self.assertEqual(event.target_temp_low, 19)
            self.assertEqual(event.target_temp_high, 24)
            self.assertEqual(event.when, arrival - timedelta(hours=3))

    async def test_same_arrival_keeps_preparation_and_postponement_respects_boost(self):
        await self.depart()
        self.data['planned_return_episode']['preparing_entities'] = ['climate.salon']
        current = self.data['planned_return_episode']['return_at']
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW + timedelta(minutes=90), None)):
            await self.scheduler.async_start_planned_return(current)
            self.assertEqual(self.data['planned_return_episode']['preparing_entities'], ['climate.salon'])
        await self.scheduler.async_set_zone_boost('climate.salon', temperature=24, until=(NOW + timedelta(days=2)).isoformat())
        self.climate.calls.clear()
        await self.scheduler.async_start_planned_return((NOW + timedelta(days=1)).isoformat())
        self.assertEqual(self.data['planned_return_episode']['preparing_entities'], [])
        self.assertEqual(self.data['zones']['climate.salon']['override']['temperature'], 24)
        self.assertEqual(self.climate.calls, [])

    async def test_future_timestamp_canonical_utc_and_second_fold_is_future(self):
        timezone = ZoneInfo('Europe/Madrid')
        now = datetime(2026, 10, 25, 2, 45, tzinfo=timezone, fold=0)
        arrival = datetime(2026, 10, 25, 2, 30, tzinfo=timezone, fold=1)
        with patch.object(scheduler_module.dt_util, 'now', return_value=now):
            self.assertEqual(self.runtime.validate_return_at(arrival.isoformat()), datetime(2026, 10, 25, 1, 30, tzinfo=UTC))
            for invalid in (now.isoformat(), datetime(2026, 10, 25, 2, 30, tzinfo=timezone, fold=0).isoformat()):
                with self.assertRaisesRegex(ValueError, 'in the future'):
                    self.runtime.validate_return_at(invalid)

    async def test_absence_confirmation_uses_elapsed_duration_through_dst(self):
        timezone = ZoneInfo('Europe/Madrid')
        now = datetime(2026, 10, 25, 2, 55, tzinfo=timezone, fold=0)
        self.runtime.stop()
        self.data['planned_return']['absence_delay_minutes'] = 10
        with patch.object(scheduler_module.dt_util, 'now', return_value=now):
            self.runtime.refresh()
        self.assertEqual(self.runtime._confirmation, datetime(2026, 10, 25, 1, 5, tzinfo=UTC))

    async def test_multiday_preparation_elapsed_lead_across_spring_gap(self):
        timezone = ZoneInfo('Europe/Madrid')
        now = datetime(2026, 3, 28, 18, tzinfo=timezone)
        local_arrival = datetime(2026, 3, 29, 3, 30, tzinfo=timezone)
        self.runtime.stop()
        self.data['zones']['climate.salon']['preconditioning']['enabled'] = True
        self.data['zones']['climate.salon']['schedule']['sunday'] = [
            {'start': '00:00', 'temperature': 22, 'hvac_mode': 'heat'}]
        with patch.object(scheduler_module.dt_util, 'now', return_value=now), patch.object(scheduler_module.dt_util, 'as_local', side_effect=lambda value: value.astimezone(timezone)):
            await self.scheduler.async_start_planned_return(local_arrival.isoformat())
            await self.runtime._tick(now, self.runtime._generation)
            with patch.object(self.scheduler, '_adaptive_preconditioning_prediction', return_value={'recommended_lead_minutes': 120, 'diagnostics': None}):
                event = self.runtime.plans(now)[0]
                self.assertEqual(event.target_when, datetime(2026, 3, 29, 1, 30, tzinfo=UTC))
                self.assertEqual(event.when, datetime(2026, 3, 28, 23, 30, tzinfo=UTC))
                self.assertEqual(event.temperature, 22)

    async def test_failed_postponement_preserves_old_preparation_and_timer(self):
        await self.depart()
        self.data['planned_return_episode']['preparing_entities'] = ['climate.salon']
        previous = deepcopy(self.data['planned_return_episode'])
        async def fail_after_listener_refresh():
            self.runtime._state_changed(SimpleNamespace(data={'entity_id': 'climate.salon'}))
            raise OSError('storage failed')
        self.save.side_effect = fail_after_listener_refresh
        from custom_components.velair import planned_return as return_module
        with patch.object(return_module, 'async_track_point_in_time', wraps=return_module.async_track_point_in_time) as track:
            with self.assertRaises(OSError):
                await self.scheduler.async_adjust_planned_return((NOW + timedelta(days=2)).isoformat())
            self.assertEqual(track.call_args_list[0].args[-1], NOW + timedelta(days=2))
            self.assertEqual(track.call_args.args[-1], NOW)
        self.assertEqual(self.data['planned_return_episode'], previous)
        self.assertIsNotNone(self.runtime._timer)
        self.assertEqual(self.runtime.target('climate.salon').temperature, 21)
        self.save.side_effect = None

    async def test_postponement_clears_room_assist_marker_and_restores_away_schedule(self):
        schedule = empty_week_schedule()
        schedule['tuesday'] = [
            {'start': '00:00', 'temperature': 16, 'hvac_mode': 'heat'},
            {'start': '19:00', 'temperature': 21, 'hvac_mode': 'heat'}]
        await self.scheduler.async_set_profile({'key': 'away_profile', 'name': 'Away',
            'color': '#336699', 'zones': {'climate.salon': {'behavior': 'schedule', 'schedule': schedule}}})
        await self.depart()
        self.data['planned_return_episode']['preparing_entities'] = ['climate.salon']
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW, None)):
            old_target = self.runtime.target('climate.salon')
        self.scheduler._mark_preconditioning_applied(old_target)
        self.scheduler._room_sensor_assist_states['climate.salon'] = scheduler_module._RoomSensorAssistState(
            entity_id='climate.salon', target_temperature=21, applied_temperature=23,
            applied_offset=2, direction='heat', hvac_mode='heat',
            room_temperature_entity_id='sensor.room', weekday='tuesday', start='19:00')
        self.assertEqual(self.scheduler._room_sensor_assist_applied_preconditioning_event(
            'climate.salon', 'tuesday', '19:00', 21, 'heat').temperature, 21)
        self.climate.calls.clear()
        await self.scheduler.async_adjust_planned_return((NOW + timedelta(days=2)).isoformat())
        self.assertEqual(self.scheduler._applied_preconditioning_targets, {})
        self.assertEqual(self.scheduler._room_sensor_assist_target_event('climate.salon').temperature, 16)
        self.assertEqual(self.scheduler._resolve_authoritative_delivery_event('climate.salon').temperature, 16)
        self.assertTrue(any(call[0] == 'set_temperature' and call[2] == 16 for call in self.climate.calls))

    async def test_nearer_arrival_delivers_new_preparation_once_and_invalidates_old_timer(self):
        await self.depart()
        self.data['planned_return_episode']['preparing_entities'] = ['climate.salon']
        generation = self.runtime._timer_generation
        self.climate.calls.clear()
        with patch.object(self.scheduler, '_preconditioned_event_details', return_value=(NOW, None)):
            await self.scheduler.async_adjust_planned_return((NOW + timedelta(minutes=30)).isoformat())
            self.assertGreater(self.runtime._timer_generation, generation)
            self.assertEqual(self.climate.calls, [])
            await self.runtime._tick(NOW, self.runtime._generation)
            await self.runtime._tick(NOW, self.runtime._generation)
        calls = [call for call in self.climate.calls if call[0] == 'set_temperature']
        self.assertEqual(len(calls), 1)
        self.assertEqual(self.data['planned_return_episode']['preparing_entities'], ['climate.salon'])


    async def select_previous(self, *, mode=True, combo=False):
        home = deepcopy(self.scheduler._profile_by_id('away_profile'))
        home.update(key='home_profile', name='Home')
        home['zones']['climate.salon'] = {'behavior': 'schedule', 'schedule': deepcopy(self.data['zones']['climate.salon']['schedule'])}
        await self.scheduler.async_set_profile(home)
        ids = ['home_profile']
        if combo:
            self.data['zones']['climate.office'] = deepcopy(self.data['zones']['climate.salon'])
            extra = deepcopy(home)
            extra.update(key='office_profile', name='Office', zones={'climate.office': deepcopy(home['zones']['climate.salon'])})
            await self.scheduler.async_set_profile(extra)
            ids.append('office_profile')
        if mode:
            await self.scheduler.async_set_velair_mode({'key': 'home_mode', 'name': 'Home', 'profile_ids': ids})
        await self.scheduler._async_activate_profiles_locked(ids, source='planned_return', mode_id='home_mode' if mode else None)
        return {'mode_id': 'home_mode' if mode else None, 'profile_ids': ids}

    async def test_cancel_restores_exact_custom_mode_and_manual_combination(self):
        for mode in (True, False):
            with self.subTest(mode=mode):
                self.data['planned_return_episode'] = None
                self.runtime.stop()
                previous = await self.select_previous(mode=mode, combo=True)
                self.runtime.refresh()
                await self.depart()
                self.assertEqual(self.runtime.episode['previous_selection'], previous)
                await self.scheduler.async_cancel_planned_return()
                self.assertEqual(self.runtime._selection_snapshot(), previous)
                self.assertTrue(self.runtime.episode['dismissed'])

    async def test_cancel_snapshot_survives_restart_adjustment_and_preparation(self):
        previous = await self.select_previous()
        await self.depart()
        await self.scheduler.async_adjust_planned_return((NOW + timedelta(hours=4)).isoformat())
        self.runtime.episode['preparing_entities'] = ['climate.salon']
        self.runtime._applied['climate.salon'] = 'previous-intent'
        restored_data = normalize_schedule_data(deepcopy(self.data), ['climate.salon'])
        restarted = VelairScheduler(self.hass, restored_data, self.climate, self.save)
        try:
            self.assertEqual(restarted._planned_return.episode['previous_selection'], previous)
            await restarted.async_cancel_planned_return()
            self.assertEqual(restarted._planned_return._selection_snapshot(), previous)
            self.assertEqual(restarted._planned_return._applied, {})
        finally:
            await restarted.async_stop()

    async def test_cancel_armed_keeps_selection_without_climate_transition(self):
        previous = await self.select_previous()
        self.hass.states['binary_sensor.occupied'].state = 'on'
        await self.scheduler.async_start_planned_return((NOW + timedelta(hours=3)).isoformat())
        self.assertEqual(self.runtime.episode['previous_selection'], previous)
        self.climate.calls.clear()
        await self.scheduler.async_cancel_planned_return()
        self.assertEqual(self.runtime._selection_snapshot(), previous)
        self.assertEqual(self.climate.calls, [])

    async def test_cancel_sensorless_snapshots_each_fresh_start_and_same_selection_commits(self):
        previous = await self.select_previous()
        arrival = await self.sensorless()
        await self.scheduler.async_start_planned_return(arrival.isoformat())
        self.assertEqual(self.runtime.episode['previous_selection'], previous)
        await self.scheduler.async_cancel_planned_return()
        self.assertEqual(self.runtime._selection_snapshot(), previous)
        await self.scheduler._async_activate_profiles_locked(['away_profile'], source='planned_return', mode_id='away')
        await self.scheduler.async_start_planned_return(arrival.isoformat())
        self.assertEqual(self.runtime.episode['previous_selection'], self.runtime._selection_snapshot())
        count = len(self.return_history())
        await self.scheduler.async_cancel_planned_return()
        await self.scheduler.async_cancel_planned_return()
        self.assertTrue(self.runtime.episode['dismissed'])
        self.assertEqual(len(self.return_history()), count + 1)
        self.assertEqual(self.runtime._persistence_depth, 0)

    async def test_cancel_edited_or_deleted_mode_keeps_saved_profiles_with_manual_marker(self):
        for deleted in (True, False):
            with self.subTest(deleted=deleted):
                self.data['planned_return_episode'] = None
                self.runtime.stop()
                previous = await self.select_previous()
                self.runtime.refresh()
                await self.depart()
                if deleted:
                    self.data['modes'] = [item for item in self.data['modes'] if item['key'] != 'home_mode']
                else:
                    next(item for item in self.data['modes'] if item['key'] == 'home_mode')['profile_ids'] = ['away_profile']
                await self.scheduler.async_cancel_planned_return()
                self.assertEqual(self.scheduler.active_profile_ids, previous['profile_ids'])
                self.assertIsNone(self.scheduler.active_mode_id)

    async def test_cancel_missing_previous_profile_and_legacy_remain_cancellable(self):
        await self.select_previous()
        await self.depart()
        self.data['profiles'] = [item for item in self.data['profiles'] if item['key'] != 'home_profile']
        count = len(self.return_history())
        await self.scheduler.async_cancel_planned_return()
        self.assertTrue(self.runtime.episode['dismissed'])
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        self.assertIn('restored', self.runtime.error)
        self.assertEqual([item['transition'] for item in self.return_history()[count:]], ['cancelled', 'error'])
        self.assertEqual(self.return_history()[-1]['reason'], 'restoration_unavailable')
        await self.scheduler.async_cancel_planned_return()
        self.assertEqual(len(self.return_history()), count + 2)
        self.data['planned_return_episode'] = None
        self.runtime.error = None
        self.runtime.stop()
        self.runtime.refresh()
        await self.depart()
        self.runtime.episode.pop('previous_selection')
        await self.scheduler.async_cancel_planned_return()
        self.assertEqual(self.scheduler.active_mode_id, 'away')

    async def test_cancel_failed_persistence_preserves_confirmation_during_climate_refresh(self):
        self.runtime.config['absence_delay_minutes'] = 10
        await self.scheduler.async_start_planned_return((NOW + timedelta(hours=2)).isoformat())
        deadline = self.runtime._confirmation
        previous = deepcopy(self.data)
        async def fail_save():
            with patch.object(scheduler_module.dt_util, 'now', return_value=NOW + timedelta(minutes=4)):
                self.runtime._state_changed(SimpleNamespace(data={'entity_id': 'climate.salon'}))
            raise OSError('save failed')
        self.save.side_effect = fail_save
        with self.assertRaises(OSError):
            await self.scheduler.async_cancel_planned_return()
        self.save.side_effect = None
        self.assertEqual(self.data, previous)
        self.assertEqual(self.runtime._confirmation, deadline)
        self.assertIsNone(self.runtime._cancel_previous_episode)
        self.assertEqual(self.runtime._persistence_depth, 0)

    def test_episode_selection_snapshot_normalization_is_optional_and_all_or_none(self):
        raw = {'state': 'away', 'origin': 'automatic', 'started_at': NOW.isoformat(), 'return_at': None,
               'away_mode_id': 'away', 'destination_mode_id': 'default', 'preparing_entities': []}
        for selection in ({'mode_id': None, 'profile_ids': []}, {'mode_id': 'home', 'profile_ids': ['a', 'b']}):
            with self.subTest(selection=selection):
                normalized = normalize_planned_return_episode(raw | {'previous_selection': selection}, self.runtime.config)
                self.assertEqual(normalized['previous_selection'], selection)
        for selection in ({'profile_ids': []}, {'mode_id': '', 'profile_ids': []}, {'mode_id': ' home ', 'profile_ids': []}, {'mode_id': None, 'profile_ids': ['a', 'a']}, {'mode_id': None, 'profile_ids': [None]}):
            with self.subTest(selection=selection):
                normalized = normalize_planned_return_episode(raw | {'previous_selection': selection}, self.runtime.config)
                self.assertIsNotNone(normalized)
                self.assertNotIn('previous_selection', normalized)


    async def test_cancel_failed_save_preserves_unrelated_accepted_settings(self):
        await self.depart()
        episode = deepcopy(self.runtime.episode)
        async def fail_save():
            self.data['global_']['mode'] = 'manual'
            self.data['zones']['climate.salon']['name'] = 'Concurrent accepted name'
            raise OSError('save failed')
        self.save.side_effect = fail_save
        with self.assertRaises(OSError):
            await self.scheduler.async_cancel_planned_return()
        self.save.side_effect = None
        self.assertEqual(self.runtime.episode, episode)
        self.assertEqual(self.scheduler.active_mode_id, 'away')
        self.assertEqual(self.data['global_']['mode'], 'manual')
        self.assertEqual(self.data['zones']['climate.salon']['name'], 'Concurrent accepted name')
        self.assertEqual(self.runtime._persistence_depth, 0)

    async def test_cancel_precommit_task_cancellation_retains_authority_and_applied_intent(self):
        await self.depart()
        self.runtime._applied['climate.salon'] = 'saved-intent'
        episode = deepcopy(self.runtime.episode)
        async def fail_save():
            self.runtime._state_changed(SimpleNamespace(data={'entity_id': 'climate.salon'}))
            raise asyncio.CancelledError()
        self.save.side_effect = fail_save
        with self.assertRaises(asyncio.CancelledError):
            await self.scheduler.async_cancel_planned_return()
        self.save.side_effect = None
        self.assertEqual(self.runtime.episode, episode)
        self.assertEqual(self.runtime._applied, {'climate.salon': 'saved-intent'})
        self.assertEqual(self.runtime._persistence_depth, 0)
        self.assertIsNone(self.runtime._cancel_previous_episode)

    async def test_cancel_postcommit_interruption_or_presence_keeps_withdrawal(self):
        previous = await self.select_previous()
        await self.depart()
        original_save = self.save.side_effect
        async def save_with_presence():
            self.hass.states['binary_sensor.occupied'].state = 'on'
            self.runtime._state_changed(SimpleNamespace(data={'entity_id': 'binary_sensor.occupied'}))
        self.save.side_effect = save_with_presence
        with patch.object(self.scheduler, '_async_complete_profile_transition', new_callable=AsyncMock, side_effect=asyncio.CancelledError):
            await self.scheduler.async_cancel_planned_return()
        self.save.side_effect = original_save
        self.assertEqual(self.runtime._selection_snapshot(), previous)
        self.assertEqual(self.runtime.episode['state'], 'cancelled')
        self.assertTrue(self.runtime.episode['dismissed'])
        self.assertEqual(self.runtime._persistence_depth, 0)
        self.assertIsNone(self.runtime._cancel_previous_episode)

    async def test_cancel_restores_cooling_range_profile_intention(self):
        self.climate.temperature_range_support['climate.salon'] = True
        self.climate.hvac_modes['climate.salon'] = ['off', 'heat', 'cool', 'heat_cool']
        previous = await self.select_previous()
        profile = self.scheduler._profile_by_id('home_profile')
        profile['zones']['climate.salon']['schedule']['tuesday'] = [
            {'start': '00:00', 'target_temp_low': 18, 'target_temp_high': 24, 'hvac_mode': 'heat_cool'}]
        self.hass.states['climate.salon'].attributes['hvac_modes'].append('heat_cool')
        await self.depart()
        await self.scheduler.async_cancel_planned_return()
        self.assertEqual(self.runtime._selection_snapshot(), previous)
        target = self.scheduler.get_active_target_event('climate.salon')
        self.assertEqual(target.hvac_mode, 'heat_cool')
        self.assertEqual((target.target_temp_low, target.target_temp_high), (18, 24))
