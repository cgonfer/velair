"""Read-only effective-event ordering and return authority regressions."""
from copy import deepcopy
from datetime import timedelta
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch
from zoneinfo import ZoneInfo

from .helpers import FakeHass, FakeClimateManager, VelairScheduler, NOW, normalize_schedule_data, empty_week_schedule
from custom_components.velair.effective_events import project_next_effective_events
from custom_components.velair.models import ClimateEvent
from custom_components.velair.api import _serialize_effective_event, _build_schedule_response


class EffectiveEventsTest(unittest.TestCase):
    def setUp(self):
        self.entity = 'climate.salon'
        self.arrival = NOW + timedelta(hours=3)
        week = empty_week_schedule()
        week['tuesday'] = [{'start': '00:00', 'temperature': 18, 'hvac_mode': 'heat'},
                           {'start': '19:00', 'temperature': 21, 'hvac_mode': 'heat'}]
        self.data = normalize_schedule_data({'zones': {self.entity: {'enabled': True, 'schedule': week}}}, [self.entity])
        self.owner = VelairScheduler(FakeHass(), self.data, FakeClimateManager(), AsyncMock())
        self.owner._climate_manager.climate_options[self.entity] = {'fan_mode': ['low']}
        self.owner._climate_manager.hvac_modes[self.entity] = ['off', 'heat', 'cool', 'heat_cool']
        self.owner._climate_manager.temperature_range_support[self.entity] = True
        self.runtime = self.owner._planned_return
        self.data['planned_return_episode'] = {
            'state': 'away', 'origin': 'manual', 'started_at': NOW.isoformat(),
            'departure_at': NOW.isoformat(), 'return_at': self.arrival.isoformat(),
            'away_mode_id': 'default', 'destination_mode_id': 'destination', 'preparing_entities': []}
        self.data['profiles'] = [{'key': 'return_profile', 'name': 'Return', 'color': '#112233',
                                 'zones': {self.entity: {'behavior': 'schedule', 'schedule': week}}}]
        self.data['modes'] = [{'key': 'destination', 'name': 'Return', 'profile_ids': ['return_profile']}]

    def project(self, now=NOW):
        return project_next_effective_events(self.owner, now)

    def event(self, when, **changes):
        return ClimateEvent(self.entity, when, 23, 'tuesday', '21:00', hvac_mode='heat', **changes)

    def test_weekly_before_arrival_remains_primary(self):
        row = self.project()[0]
        self.assertEqual(row['source'], 'weekly_schedule')
        self.assertEqual(row['when'], NOW + timedelta(hours=1))

    def test_weekly_before_preparation_wins_and_return_wins_tie(self):
        for minutes, source in ((90, 'weekly_schedule'), (60, 'planned_return'), (30, 'planned_return')):
            with self.subTest(minutes=minutes), patch.object(self.runtime, 'plans', return_value=[self.event(NOW + timedelta(minutes=minutes), target_when=self.arrival)]):
                row = self.project()[0]
                self.assertEqual(row['source'], source)
                if source == 'planned_return':
                    self.assertEqual(row['phase'], 'preparation')
                    self.assertEqual(row['weekly_event'].when, NOW + timedelta(hours=1))

    def test_due_or_latched_preparation_suppresses_away_week(self):
        for started in (NOW - timedelta(minutes=20), NOW + timedelta(hours=2)):
            with self.subTest(started=started):
                self.runtime.episode['preparing_entities'] = [self.entity] if started > NOW else []
                with patch.object(self.runtime, 'plans', return_value=[self.event(started, target_when=self.arrival)]):
                    row = self.project()[0]
                    self.assertEqual(row['phase'], 'arrival')
                    self.assertEqual(row['when'], self.arrival)

    def test_unlatched_reached_target_does_not_invent_authority(self):
        # Reached previews can have no plan. The real next weekly action survives.
        with patch.object(self.runtime, 'plans', return_value=[]):
            self.assertEqual(self.project()[0]['source'], 'weekly_schedule')

    def test_cancelled_armed_past_and_missing_destination_use_weekly(self):
        for state in ('cancelled', 'fulfilled', 'skipped', 'armed'):
            with self.subTest(state=state):
                self.runtime.episode['state'] = state
                self.assertEqual(self.project()[0]['source'], 'weekly_schedule')
        self.runtime.episode['state'] = 'away'
        for instant in (NOW, NOW - timedelta(seconds=1)):
            self.runtime.episode['return_at'] = instant.isoformat()
            self.assertEqual(self.project()[0]['source'], 'weekly_schedule')
        self.runtime.episode['return_at'] = self.arrival.isoformat()
        self.runtime.episode['destination_mode_id'] = 'removed'
        self.assertEqual(self.project()[0]['source'], 'weekly_schedule')

    def test_home_presence_suppresses_return_projection(self):
        self.data['planned_return']['occupancy_entity_ids'] = ['binary_sensor.home']
        self.owner._hass.states['binary_sensor.home'] = SimpleNamespace(state='on')
        self.assertEqual(self.project()[0]['source'], 'weekly_schedule')

    def test_arrival_effects_off_pause_options_cooling_and_range(self):
        self.data['zones'][self.entity]['schedule'] = empty_week_schedule()
        for block in ({'action': 'turn_off'}, {'action': 'set_climate_options', 'fan_mode': 'low'},
                      {'temperature': 19, 'hvac_mode': 'cool'},
                      {'target_temp_low': 18, 'target_temp_high': 24, 'hvac_mode': 'heat_cool'}):
            with self.subTest(block=block):
                week = empty_week_schedule()
                week['tuesday'] = [{'start': '00:00', **block}]
                self.data['profiles'][0]['zones'][self.entity] = {'behavior': 'schedule', 'schedule': week}
                row = self.project()[0]
                self.assertEqual(row['phase'], 'arrival')
                self.assertEqual(row['event'].when, self.arrival)
                self.assertEqual(row['event'].action, block.get('action', 'set_temperature'))
        for action in ('turn_off', 'leave_as_is'):
            self.data['profiles'][0]['zones'][self.entity] = {'behavior': 'pause', 'action': action}
            row = self.project()[0]
            self.assertEqual(row['event'].action if row['event'] else None, 'turn_off' if action == 'turn_off' else None)

    def test_unchanged_destination_does_not_invent_arrival(self):
        self.runtime.episode['destination_mode_id'] = 'default'
        self.assertEqual(self.project()[0]['source'], 'weekly_schedule')

    def test_overrides_suspend_with_expiry_context_not_execution_deadline(self):
        expiry = NOW + timedelta(minutes=30)
        self.data['zones'][self.entity]['override'] = {'type': 'boost', 'until': expiry.isoformat(), 'temperature': 25}
        row = self.project()[0]
        self.assertEqual((row['phase'], row['when'], row['event'], row['reason']), ('suspended', None, None, 'boost'))
        self.assertEqual(row['blocked_until'], expiry)
        self.assertEqual(self.project(expiry)[0]['source'], 'weekly_schedule')

    def test_multiple_pauses_require_all_expiries(self):
        zone = self.data['zones'][self.entity]
        zone['override'] = {'type': 'pause', 'action': 'leave_as_is'}
        zone['pauses'] = [{'started_at': NOW.isoformat(), 'action': 'leave_as_is', 'until': (NOW + timedelta(minutes=10)).isoformat()},
                          {'started_at': NOW.isoformat(), 'action': 'leave_as_is', 'until': (NOW + timedelta(minutes=20)).isoformat()}]
        self.assertEqual(self.project()[0]['blocked_until'], NOW + timedelta(minutes=20))
        zone['pauses'][1].pop('until')
        self.assertIsNone(self.project()[0]['blocked_until'])

    def test_global_pause_aggregates_indefinite_and_longer_zone_blocks(self):
        self.data['global_']['mode'] = 'paused'
        self.data['global_']['paused_until'] = (NOW + timedelta(minutes=10)).isoformat()
        zone = self.data['zones'][self.entity]
        zone['override'] = {'type': 'pause', 'action': 'leave_as_is'}
        for until, expected in ((None, None), ((NOW + timedelta(minutes=40)).isoformat(), NOW + timedelta(minutes=40))):
            with self.subTest(until=until):
                zone['pauses'] = [{'started_at': NOW.isoformat(), 'action': 'leave_as_is',
                                  **({'until': until} if until else {})}]
                row = self.project()[0]
                self.assertEqual(row['phase'], 'suspended')
                self.assertEqual(row['blocked_until'], expected)
        zone['pauses'] = []
        zone['override'] = {'type': 'boost', 'temperature': 24,
                            'until': (NOW + timedelta(minutes=50)).isoformat()}
        self.assertEqual(self.project()[0]['blocked_until'], NOW + timedelta(minutes=50))

    def test_stopped_paused_and_manual_read_only_suspensions(self):
        for stopped, mode, expected in ((True, 'auto', 'scheduler_stopped'),
                                         (False, 'paused', 'scheduler_not_auto'),
                                         (False, 'manual', 'scheduler_not_auto')):
            with self.subTest(stopped=stopped, mode=mode):
                self.owner._stopped = stopped
                self.data['global_']['mode'] = mode
                self.data['global_']['paused_until'] = (NOW + timedelta(minutes=20)).isoformat()
                before = deepcopy(self.data)
                row = self.project()[0]
                self.assertEqual((row['phase'], row['reason'], row['when']), ('suspended', expected, None))
                self.assertEqual(row['blocked_until'], NOW + timedelta(minutes=20) if mode == 'paused' else None)
                self.assertEqual(self.data, before)

    def test_real_reached_after_latch_retains_arrival_authority(self):
        zone = self.data['zones'][self.entity]
        zone['preconditioning']['enabled'] = True
        self.owner._hass.states[self.entity] = SimpleNamespace(state='heat', attributes={
            'current_temperature': 21, 'hvac_modes': ['off', 'heat', 'cool', 'heat_cool']})
        self.runtime.episode['preparing_entities'] = [self.entity]
        before = deepcopy(self.data)
        self.assertIsNone(self.owner._resolve_preconditioning_target(self.entity, zone['preconditioning'],
            {'start': '19:00', 'temperature': 21, 'hvac_mode': 'heat'}))
        plans = self.runtime.plans(NOW)
        self.assertEqual(len(plans), 1)
        row = self.project()[0]
        self.assertEqual((row['source'], row['phase'], row['when']), ('planned_return', 'arrival', self.arrival))
        self.assertEqual(row['event'].temperature, 21)
        self.assertEqual(self.data, before)

    def test_disabled_and_external_zones_are_excluded(self):
        self.data['zones'][self.entity]['enabled'] = False
        self.assertEqual(self.project(), [])
        self.data['zones'][self.entity]['enabled'] = True
        with patch.object(self.owner, '_is_external_execution', return_value=True):
            self.assertEqual(self.project(), [])

    def test_reads_do_not_mutate_episode_data_runtime_caches_or_timers(self):
        data = deepcopy(self.data)
        caches = deepcopy((self.owner._applied_preconditioning_targets, self.owner._attempted_preconditioning_events,
                           self.runtime._applied, self.owner.next_events))
        timer = self.runtime._timer
        with patch.object(self.owner, '_clear_applied_preconditioning_targets', side_effect=AssertionError('write')):
            first = self.project()
            self.assertEqual(first, self.project())
        self.assertEqual(self.data, data)
        self.assertEqual(caches, (self.owner._applied_preconditioning_targets, self.owner._attempted_preconditioning_events,
                                 self.runtime._applied, self.owner.next_events))
        self.assertIs(timer, self.runtime._timer)

    def test_utc_ordering_across_dst_fold_and_serialization(self):
        zone = ZoneInfo('Europe/Madrid')
        now = NOW.replace(month=10, day=25, hour=0, minute=0).astimezone(zone)
        arrival = now + timedelta(hours=4)
        self.runtime.episode['return_at'] = arrival.isoformat()
        first = now.replace(hour=2, minute=30, fold=0)
        second = now.replace(hour=2, minute=15, fold=1)
        weekly = self.event(first)
        plan = self.event(second, target_when=arrival)
        with patch.object(self.owner, '_iter_future_events', return_value=[weekly]), patch.object(self.runtime, 'plans', return_value=[plan]):
            row = self.project(now)[0]
            self.assertEqual(row['source'], 'weekly_schedule')
            encoded = _serialize_effective_event(row)
            self.assertEqual(encoded['when'], first.isoformat())
            self.assertEqual(encoded['event']['when'], encoded['weekly_event']['when'])

    def test_arrival_and_nullable_suspension_serialization(self):
        with patch.object(self.runtime, 'plans', return_value=[self.event(NOW, target_when=self.arrival)]):
            row = _serialize_effective_event(self.project()[0])
            self.assertEqual(row['return_at'], self.arrival.isoformat())
            self.assertEqual(row['event']['when'], row['when'])
        self.data['zones'][self.entity]['override'] = {'type': 'boost', 'temperature': 24, 'until': (NOW + timedelta(minutes=20)).isoformat()}
        row = _serialize_effective_event(self.project()[0])
        self.assertIsNone(row['when'])
        self.assertIsNone(row['event'])
        self.assertEqual(row['blocked_until'], (NOW + timedelta(minutes=20)).isoformat())

    def test_additive_response_keeps_weekly_and_authoritative_empty_projection(self):
        from .test_api import FakeClimateCapabilities

        weekly = self.event(NOW + timedelta(minutes=10))
        scheduler = SimpleNamespace(next_event=weekly, next_events=[weekly],
            get_next_effective_events=lambda: [], get_active_overrides=lambda: {},
            get_operational_status=lambda: 'scheduled', get_comfort_assessments=lambda: {},
            get_room_sensor_assist_statuses=lambda: {})
        runtime = {'entry': SimpleNamespace(data={}, options={}),
                   'climate_manager': FakeClimateCapabilities(['off', 'heat']),
                   'scheduler': scheduler, 'storage': SimpleNamespace(data=self.data)}
        response = _build_schedule_response(runtime)
        self.assertEqual(response['next_effective_events'], [])
        self.assertEqual(response['next_event']['when'], weekly.when.isoformat())
        self.assertEqual(response['next_events'][0]['when'], weekly.when.isoformat())

    def test_reads_reuse_weekly_snapshot_and_one_projection_per_state_update(self):
        self.owner._effective_weekly_snapshot = self.owner._iter_future_events(NOW)
        with patch('custom_components.velair.scheduler.dt_util.now', return_value=NOW), \
             patch.object(self.owner, '_iter_future_events', side_effect=AssertionError('read must not scan eight days')), \
             patch('custom_components.velair.effective_events.project_next_effective_events', wraps=project_next_effective_events) as project:
            first = self.owner.get_next_effective_events()
            for _ in range(20):
                self.assertEqual(self.owner.get_next_effective_events(), first)
            self.assertEqual(project.call_count, 1)
            first[0]['source'] = 'modified_snapshot'
            self.assertNotEqual(self.owner.get_next_effective_events()[0]['source'], 'modified_snapshot')
            self.owner._async_write_state()
            self.owner.get_next_effective_events()
            self.assertEqual(project.call_count, 2)

    def test_cached_projection_expires_at_preparation_and_arrival_and_handles_clock_rewind(self):
        self.owner._effective_weekly_snapshot = []
        start = NOW + timedelta(minutes=30)
        with patch.object(self.runtime, 'plans', return_value=[self.event(start, target_when=self.arrival)]), \
             patch('custom_components.velair.effective_events.project_next_effective_events', wraps=project_next_effective_events) as project:
            for instant, phase, count in ((NOW, 'preparation', 1), (start - timedelta(seconds=1), 'preparation', 1),
                                           (start, 'arrival', 2), (NOW, 'preparation', 3)):
                with patch('custom_components.velair.scheduler.dt_util.now', return_value=instant):
                    self.assertEqual(self.owner.get_next_effective_events()[0]['phase'], phase)
                    self.assertEqual(project.call_count, count)
            with patch('custom_components.velair.scheduler.dt_util.now', return_value=self.arrival):
                self.assertEqual(self.owner.get_next_effective_events(), [])

    def test_empty_projection_is_cached_and_configuration_changes_invalidate_it(self):
        self.data['planned_return_episode']['state'] = 'cancelled'
        self.owner._effective_weekly_snapshot = []
        with patch('custom_components.velair.scheduler.dt_util.now', return_value=NOW), \
             patch('custom_components.velair.effective_events.project_next_effective_events', wraps=project_next_effective_events) as project:
            self.assertEqual(self.owner.get_next_effective_events(), [])
            self.assertEqual(self.owner.get_next_effective_events(), [])
            self.assertEqual(project.call_count, 1)
            self.data['planned_return_episode']['state'] = 'away'
            self.owner._async_write_state()
            self.assertEqual(self.owner.get_next_effective_events()[0]['phase'], 'arrival')
            self.assertEqual(project.call_count, 2)

    def test_cached_weekly_snapshot_retains_successor_after_applied_preparation(self):
        self.data['planned_return_episode']['state'] = 'cancelled'
        first = self.event(NOW - timedelta(minutes=5), target_when=NOW + timedelta(minutes=30))
        later = self.event(NOW + timedelta(hours=1))
        self.owner.next_events_by_zone = [first]
        self.owner._effective_weekly_snapshot = [first, later]
        with patch('custom_components.velair.scheduler.dt_util.now', return_value=NOW), \
             patch.object(self.owner, '_is_applied_preconditioning_event', side_effect=lambda event: event is first), \
             patch.object(self.owner, '_iter_future_events', side_effect=AssertionError('no new scan')):
            self.assertEqual(self.owner.get_next_effective_events()[0]['when'], later.when)
