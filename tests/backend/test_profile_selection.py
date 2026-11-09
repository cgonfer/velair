"""Base selection and zone-scoped Profile substitutions."""
from copy import deepcopy
from types import SimpleNamespace
from datetime import timedelta
import asyncio
import unittest
from unittest.mock import AsyncMock, Mock, patch

from .helpers import FakeClimateManager, VelairScheduler, normalize_schedule_data, NOW
from .test_profiles import _available_hass, _profile
from custom_components.velair.scheduler import _PreconditioningSession
from custom_components.velair.room_groups import build_group_candidate
from custom_components.velair import api, services
from custom_components.velair.const import DOMAIN


class ProfileSelectionTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.entities = ["climate.salon", "climate.office", "climate.bedroom"]
        self.data = normalize_schedule_data(None, self.entities)
        self.save = AsyncMock()
        self.manager = FakeClimateManager()
        self.scheduler = VelairScheduler(_available_hass(*self.entities), self.data, self.manager, self.save)
        base = _profile(key="winter", temperature=19)
        base["zones"]["climate.office"] = deepcopy(base["zones"]["climate.salon"])
        base["zones"]["climate.bedroom"] = deepcopy(base["zones"]["climate.salon"])
        work = _profile(key="work", temperature=21)
        work["zones"]["climate.office"] = deepcopy(work["zones"]["climate.salon"])
        visit = _profile(key="visit", temperature=23)
        for profile in [base, work, visit]:
            await self.scheduler.async_set_profile(profile)
        await self.scheduler.async_set_velair_mode({"key": "winter-mode", "name": "Winter", "profile_ids": ["winter"]})
        await self.scheduler.async_select_velair_mode("winter-mode")
        self.save.reset_mock()
        self.manager.calls.clear()

    async def test_multizone_successive_exceptions_and_restore_base(self):
        await self.scheduler.async_apply_profiles(["work"])
        await self.scheduler.async_apply_profiles(["visit"])
        self.assertEqual(self.scheduler.effective_zone_profiles, {"climate.salon": "visit", "climate.office": "work", "climate.bedroom": "winter"})
        self.assertEqual(self.scheduler.active_profile_ids, ["winter"])
        self.assertIsNone(self.scheduler.active_mode_id)
        self.assertEqual(self.scheduler.profile_selection["base_mode_id"], "winter-mode")
        await self.scheduler.async_clear_profile_overrides("climate.salon")
        self.assertEqual(self.scheduler.effective_zone_profiles["climate.salon"], "winter")
        await self.scheduler.async_clear_profile_overrides(["climate.office"])
        self.assertEqual(self.scheduler.active_mode_id, "winter-mode")

    async def _group_salon_and_office(self):
        group = {
            "id": "group.living_room", "name": "Living room",
            "members": ["climate.salon", "climate.office"],
            "temperature_entity_id": "climate.salon", "delivery_mode": "all",
        }
        self.data, _ = build_group_candidate(self.data, self.entities, group, "climate.salon")
        await self.scheduler.async_stop()
        self.scheduler = VelairScheduler(
            _available_hass(*self.entities), self.data, self.manager, self.save,
        )
        await self.scheduler.async_set_zone_profile("climate.office", "work")
        await self.scheduler.async_set_zone_profile("climate.bedroom", None)
        self.save.reset_mock()
        self.manager.calls.clear()

    async def test_grouped_member_clears_only_its_group_exception(self):
        await self._group_salon_and_office()
        await self.scheduler.async_clear_profile_overrides("climate.office")
        self.assertEqual(self.scheduler.profile_selection["zone_profile_overrides"], {
            "climate.bedroom": None,
        })
        self.assertEqual(self.scheduler.effective_zone_profiles["group.living_room"], "winter")
        self.save.assert_awaited_once()

    async def test_group_aliases_and_independent_room_clear_in_one_transition(self):
        await self._group_salon_and_office()
        with patch.object(self.scheduler, "_async_activate_profiles_locked",
                          wraps=self.scheduler._async_activate_profiles_locked) as activate:
            await self.scheduler.async_clear_profile_overrides([
                "climate.salon", "climate.office", "group.living_room", "climate.bedroom",
            ])
        self.assertEqual(self.scheduler.profile_selection["zone_profile_overrides"], {})
        self.assertEqual(self.scheduler.active_mode_id, "winter-mode")
        self.save.assert_awaited_once()
        activate.assert_awaited_once()
        self.assertEqual(activate.await_args.kwargs["publication_scope"], {
            "group.living_room", "climate.bedroom",
        })

    async def test_invalid_group_clear_batch_has_no_partial_effects(self):
        await self._group_salon_and_office()
        previous = deepcopy(self.data)
        self.scheduler._planned_return.cancel = AsyncMock()
        invalid_targets = (
            ["climate.office", "climate.unmanaged"],
            ["climate.office", "group.missing"],
            ["climate.office", None],
            ["climate.office", []],
            ["climate.office", "climate.office"],
            ("climate.office",), None,
        )
        for targets in invalid_targets:
            with self.subTest(targets=targets), self.assertRaises(ValueError):
                await self.scheduler.async_clear_profile_overrides(targets)
            self.assertEqual(self.data, previous)
            self.assertEqual(self.manager.calls, [])
            self.save.assert_not_awaited()
            self.scheduler._planned_return.cancel.assert_not_awaited()

    async def test_group_clear_failed_save_preserves_all_exceptions(self):
        await self._group_salon_and_office()
        previous = deepcopy(self.data)
        self.save.side_effect = OSError("disk")
        with self.assertRaises(OSError):
            await self.scheduler.async_clear_profile_overrides("climate.office")
        self.assertEqual(self.data, previous)
        self.assertEqual(self.manager.calls, [])

    async def test_service_clears_group_exception_from_selected_climate(self):
        await self._group_salon_and_office()
        registry = Mock()
        registry.has_service.return_value = False
        hass = SimpleNamespace(services=registry, data={DOMAIN: {"entry": {
            "scheduler": self.scheduler,
            "storage": SimpleNamespace(temperature_migration_required=False),
        }}})
        await services.async_setup_services(hass)
        registration = next(call for call in registry.async_register.call_args_list
                            if call.args[1] == "clear_profile_overrides")
        handler, schema = registration.args[2], registration.kwargs["schema"]
        await handler(SimpleNamespace(data=schema({"entity_id": "climate.office"})))
        self.assertEqual(self.scheduler.profile_selection["zone_profile_overrides"], {
            "climate.bedroom": None,
        })
        self.save.assert_awaited_once()

    async def test_websocket_clears_group_exception_from_member(self):
        await self._group_salon_and_office()
        runtime = {"scheduler": self.scheduler}
        connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
        with patch.object(api, "_get_runtime", return_value=runtime), \
             patch.object(api, "_reject_temperature_migration_mutation", return_value=False), \
             patch.object(api, "_build_schedule_response", return_value={"updated": True}):
            await api.ws_clear_profile_overrides(Mock(), connection, {
                "id": 9, "entity_id": ["climate.office"],
            })
        connection.send_error.assert_not_called()
        connection.send_result.assert_called_once_with(9, {"updated": True})
        self.assertEqual(self.scheduler.profile_selection["zone_profile_overrides"], {
            "climate.bedroom": None,
        })
        self.save.assert_awaited_once()

    async def test_zone_scopes_multizone_profile_and_explicit_default(self):
        await self.scheduler.async_set_zone_profile("climate.office", "work")
        self.assertEqual(self.scheduler.effective_zone_profiles["climate.salon"], "winter")
        await self.scheduler.async_set_zone_profile("climate.salon", None)
        self.assertIsNone(self.scheduler.effective_zone_profiles["climate.salon"])
        self.assertIn("climate.salon", self.scheduler.profile_selection["zone_profile_overrides"])
        await self.scheduler.async_clear_profile_overrides("climate.salon")
        self.assertEqual(self.scheduler.effective_zone_profiles["climate.salon"], "winter")

    async def test_batch_conflict_rejected_before_return_cancellation(self):
        previous = deepcopy(self.data)
        self.scheduler._planned_return.cancel = AsyncMock()
        with self.assertRaises(ValueError):
            await self.scheduler.async_apply_profiles(["work", "visit"])
        self.assertEqual(self.data, previous)
        self.scheduler._planned_return.cancel.assert_not_awaited()
        self.save.assert_not_awaited()

    async def test_concurrent_zone_changes_survive(self):
        await asyncio.gather(self.scheduler.async_set_zone_profile("climate.office", "work"), self.scheduler.async_set_zone_profile("climate.salon", "visit"))
        self.assertEqual(self.scheduler.profile_selection["zone_profile_overrides"], {"climate.office": "work", "climate.salon": "visit"})

    async def test_queued_zone_profile_uses_membership_after_group_edit(self):
        self.entities.append("climate.kitchen")
        self.data["zones"]["climate.kitchen"] = normalize_schedule_data(
            None, ["climate.kitchen"],
        )["zones"]["climate.kitchen"]
        await self._group_salon_and_office()
        self.manager.temperature_unit = lambda _entity: "°C"
        await self.scheduler.async_clear_profile_overrides([
            "group.living_room", "climate.bedroom",
        ])
        await self.scheduler.async_set_zone_profile("climate.kitchen", None)
        group = {
            **self.data["room_groups"]["group.living_room"],
            "members": ["climate.salon", "climate.bedroom"],
        }
        editing = asyncio.Event()
        original_commit = self.scheduler._async_commit_group_candidate

        async def commit(candidate):
            editing.set()
            return await original_commit(candidate)

        # The real group mutation owns the Profile lock while waiting for an
        # in-flight timer operation. Queue the member selection behind it.
        with patch.object(self.scheduler, "_async_commit_group_candidate", side_effect=commit):
            async with self.scheduler._timer_lock:
                edit = asyncio.create_task(self.scheduler.async_set_room_group(
                    group, self.data.get("configuration_revision", 0),
                ))
                await asyncio.wait_for(editing.wait(), timeout=1)
                select = asyncio.create_task(self.scheduler.async_set_zone_profile(
                    "climate.office", "work",
                ))
                await asyncio.sleep(0)
                self.assertFalse(select.done())
            await asyncio.gather(edit, select)

        self.assertEqual(self.scheduler.owner_for_entity("climate.office"), "climate.office")
        self.assertEqual(self.scheduler.profile_selection, {
            "base_profile_ids": ["winter"], "base_mode_id": "winter-mode",
            "zone_profile_overrides": {"climate.kitchen": None, "climate.office": "work"},
        })
        self.assertEqual(self.scheduler.effective_zone_profiles["group.living_room"], "winter")
        self.assertEqual(self.scheduler.effective_zone_profiles["climate.office"], "work")
        self.assertIsNone(self.scheduler.effective_zone_profiles["climate.kitchen"])

    async def test_empty_batches_are_true_noops(self):
        self.scheduler._planned_return.cancel = AsyncMock()
        await self.scheduler.async_apply_profiles([])
        await self.scheduler.async_clear_profile_overrides([])
        self.save.assert_not_awaited()
        self.scheduler._planned_return.cancel.assert_not_awaited()

    async def test_global_mode_selection_clears_overrides(self):
        await self.scheduler.async_set_zone_profile("climate.office", "work")
        await self.scheduler.async_select_velair_mode("winter-mode")
        self.assertEqual(self.scheduler.profile_selection["zone_profile_overrides"], {})
        self.assertEqual(self.scheduler.active_mode_id, "winter-mode")
        await self.scheduler.async_apply_profiles(["work"])
        await self.scheduler.async_activate_profiles([])
        self.assertEqual(self.scheduler.profile_selection, {"base_profile_ids": [], "base_mode_id": None, "zone_profile_overrides": {}})

    async def test_manual_detaches_mode_and_keeps_every_zone(self):
        await self.scheduler.async_apply_profiles(["work"])
        effective = self.scheduler.effective_zone_profiles
        await self.scheduler.async_clear_velair_mode()
        self.assertIsNone(self.scheduler.profile_selection["base_mode_id"])
        self.assertEqual(self.scheduler.effective_zone_profiles, effective)

    async def test_failed_save_rolls_back_complete_selection(self):
        previous = deepcopy(self.data)
        self.save.side_effect = OSError("disk")
        with self.assertRaises(OSError):
            await self.scheduler.async_apply_profiles(["work"])
        self.assertEqual(self.data, previous)
        self.assertEqual(self.manager.calls, [])

    async def test_edit_override_profile_updates_only_scoped_zone(self):
        await self.scheduler.async_set_zone_profile("climate.office", "work")
        profile = self.scheduler._profile_by_id("work")
        changed = deepcopy(profile)
        changed["zones"]["climate.office"]["schedule"]["tuesday"][0]["temperature"] = 22
        self.manager.calls.clear()
        await self.scheduler.async_set_profile(changed)
        self.assertTrue(any(call[1] == "climate.office" for call in self.manager.calls))
        self.assertFalse(any(call[1] == "climate.salon" for call in self.manager.calls))
        del changed["zones"]["climate.office"]
        with self.assertRaisesRegex(ValueError, "Clear Profile overrides"):
            await self.scheduler.async_set_profile(changed)

    async def test_delete_override_restores_base(self):
        await self.scheduler.async_apply_profiles(["work"])
        await self.scheduler.async_delete_profile("work")
        self.assertEqual(self.scheduler.profile_selection["zone_profile_overrides"], {})
        self.assertEqual(self.scheduler.effective_zone_profiles["climate.office"], "winter")
        self.assertEqual(self.scheduler.active_mode_id, "winter-mode")

    async def test_mode_edit_preserves_exceptions(self):
        await self.scheduler.async_apply_profiles(["work"])
        await self.scheduler.async_set_velair_mode({"key": "winter-mode", "name": "Winter", "profile_ids": ["visit"]})
        self.assertEqual(self.scheduler.active_profile_ids, ["visit"])
        self.assertEqual(self.scheduler.effective_zone_profiles["climate.office"], "work")
        self.assertIsNone(self.scheduler.effective_zone_profiles["climate.bedroom"])

    async def test_restart_preserves_explicit_default_and_base_marker(self):
        await self.scheduler.async_set_zone_profile("climate.office", None)
        normalized = normalize_schedule_data(deepcopy(self.data), self.entities)
        restarted = VelairScheduler(_available_hass(*self.entities), normalized, FakeClimateManager(), AsyncMock())
        self.assertEqual(restarted.profile_selection, self.scheduler.profile_selection)
        self.assertEqual(restarted.effective_zone_profiles, self.scheduler.effective_zone_profiles)

    async def test_provenance_only_change_keeps_boost_and_sends_no_commands(self):
        same = _profile(key="same", temperature=19)
        await self.scheduler.async_set_profile(same)
        boost = {"type": "boost", "temperature": 24, "previous_state": {}}
        self.data["zones"]["climate.salon"]["override"] = boost
        self.manager.calls.clear()
        await self.scheduler.async_set_zone_profile("climate.salon", "same")
        self.assertEqual(self.manager.calls, [])
        self.assertEqual(self.data["zones"]["climate.salon"]["override"], boost)

    async def test_strict_invalid_input_has_no_side_effects(self):
        for ids in [None, "work", [""], [None], ["work", "work"], ["missing"]]:
            with self.subTest(ids=ids), self.assertRaises(ValueError):
                await self.scheduler.async_apply_profiles(ids)
        for entity, key in [("climate.missing", "work"), ("climate.office", "visit"), ("climate.office", "")]:
            with self.subTest(entity=entity, key=key), self.assertRaises(ValueError):
                await self.scheduler.async_set_zone_profile(entity, key)
        self.save.assert_not_awaited()

    async def test_import_prunes_removed_override_references(self):
        await self.scheduler.async_apply_profiles(["work"])
        await self.scheduler.async_replace_portable_data(profiles=[self.scheduler._profile_by_id("winter")])
        self.assertEqual(self.scheduler.profile_selection["zone_profile_overrides"], {})
        self.assertEqual(self.scheduler.effective_zone_profiles["climate.office"], "winter")

    async def test_selection_event_is_additive_and_legacy_event_base_only(self):
        self.scheduler._hass.bus.events.clear()
        await self.scheduler.async_apply_profiles(["work"])
        events = [data for _, data in self.scheduler._hass.bus.events]
        selection_events = [data for data in events if data.get("event") == "selection_changed"]
        self.assertEqual(len(selection_events), 1)
        self.assertEqual(selection_events[0]["selection"], self.scheduler.profile_selection)
        self.assertFalse(any(data.get("event") == "profile_changed" for data in events))
        self.scheduler._hass.bus.events.clear()
        await self.scheduler.async_delete_profile("work")
        events = [data for _, data in self.scheduler._hass.bus.events]
        self.assertTrue(any(data.get("event") == "selection_changed" for data in events))
        self.assertFalse(any(data.get("event") == "profile_changed" for data in events))

    async def test_added_profile_zones_do_not_expand_existing_overrides(self):
        await self.scheduler.async_set_zone_profile("climate.salon", "visit")
        visit = deepcopy(self.scheduler._profile_by_id("visit"))
        visit["zones"]["climate.bedroom"] = deepcopy(visit["zones"]["climate.salon"])
        await self.scheduler.async_set_profile(visit)
        self.assertEqual(self.scheduler.effective_zone_profiles["climate.bedroom"], "winter")
        self.assertEqual(self.scheduler.profile_selection["zone_profile_overrides"], {"climate.salon": "visit"})

    async def test_default_explicit_profile_zone_participates_in_batch_conflict(self):
        normal = _profile(key="normal", behavior="normal")
        await self.scheduler.async_set_profile(normal)
        with self.assertRaises(ValueError):
            await self.scheduler.async_apply_profiles(["normal", "visit"])
        await self.scheduler.async_apply_profiles(["normal"])
        self.assertEqual(self.scheduler.effective_zone_profiles["climate.salon"], "normal")
        self.assertEqual(self.scheduler._profile_zone_behavior("climate.salon"), {"behavior": "normal"})

    async def test_external_validation_precedes_return_cancel_and_mutation(self):
        previous = deepcopy(self.data)
        self.scheduler._planned_return.cancel = AsyncMock()
        self.scheduler._external_execution = Mock()
        self.scheduler._external_execution.ensure_schedule_supported.side_effect = ValueError("provider rejects schedule")
        for operation in [lambda: self.scheduler.async_apply_profiles(["work"]),
                          lambda: self.scheduler.async_set_zone_profile("climate.salon", "work")]:
            with patch.object(self.scheduler, "_is_external_execution", return_value=True):
                with self.assertRaisesRegex(ValueError, "provider rejects"):
                    await operation()
            self.assertEqual(self.data, previous)
            self.scheduler._planned_return.cancel.assert_not_awaited()
            self.save.assert_not_awaited()

    async def test_canonical_base_fields_override_divergent_legacy_mirrors(self):
        self.data["global_"]["active_profile_ids"] = ["visit"]
        self.data["global_"]["active_mode_id"] = "other"
        self.assertEqual(self.scheduler.profile_selection["base_profile_ids"], ["winter"])
        self.assertEqual(self.scheduler.effective_zone_profiles["climate.office"], "winter")
        self.assertEqual(self.scheduler.active_mode_id, "winter-mode")

    async def test_repeated_zone_selection_retries_own_pending_external_publication_only(self):
        from .test_scheduler_application import _FakeExternalExecution
        for entity in ["climate.salon", "climate.office"]:
            self.data["zones"][entity]["execution"] = {"type": "external", "provider": "provider"}
        external = _FakeExternalExecution(self.data, self.save)
        self.scheduler._external_execution = external
        self.scheduler._execution_authority = external.authority
        await self.scheduler.async_set_zone_profile("climate.salon", "work")
        self.assertEqual(len(external.published_schedules), 1)
        self.assertNotIn("climate.office", external.publication_states)
        external.publication_states["climate.salon"] = "failed"
        await self.scheduler.async_set_zone_profile("climate.salon", "work")
        self.assertEqual(len(external.published_schedules), 2)
        self.assertNotIn("climate.office", external.publication_states)

    async def test_hidden_and_unapplied_profile_slices_are_not_capability_validated(self):
        from .test_scheduler_application import _FakeExternalExecution
        mixed = _profile(key="mixed", temperature=20)
        mixed["zones"]["climate.office"] = {"behavior": "pause", "action": "turn_off"}
        await self.scheduler.async_set_profile(mixed)
        # Ownership changed since this definition was saved. Only Salon is requested.
        self.data["zones"]["climate.office"]["execution"] = {"type": "external", "provider": "provider"}
        external = _FakeExternalExecution(self.data, self.save)
        self.scheduler._external_execution = external
        self.scheduler._execution_authority = external.authority
        await self.scheduler.async_set_zone_profile("climate.salon", "mixed")
        self.assertEqual(self.scheduler.effective_zone_profiles["climate.salon"], "mixed")
        # A hidden base Pause is also harmless with an explicit Default exception.
        await self.scheduler.async_set_zone_profile("climate.office", None)
        await self.scheduler._async_activate_profiles_locked(["mixed"], source="service",
            zone_profile_overrides={"climate.office": None})
        self.assertIsNone(self.scheduler.effective_zone_profiles["climate.office"])

    async def test_changed_future_week_clears_preconditioning_without_current_command_or_boost_cancel(self):
        current = deepcopy(self.scheduler._profile_by_id("winter"))
        future = deepcopy(current)
        future.update(key="future", name="Future")
        future["zones"]["climate.salon"]["schedule"]["tuesday"].append({"start": "20:00", "temperature": 23, "hvac_mode": "heat"})
        await self.scheduler.async_set_profile(future)
        event = SimpleNamespace(entity_id="climate.salon", weekday="tuesday", start="20:00", when=NOW, target_when=NOW+timedelta(hours=2))
        self.scheduler._mark_preconditioning_applied(event)
        self.scheduler._preconditioning_sessions["climate.salon"] = _PreconditioningSession(
            entity_id="climate.salon", direction="heat", started_at=NOW,
            target_when=NOW + timedelta(hours=2), weekday="tuesday", start="20:00",
            target_temperature=23, target_kind="scalar", target_boundary="temperature",
            start_temperature=18, hvac_mode="heat", startup_minutes=120,
            outdoor_temp_start=None,
        )
        boost = {"type": "boost", "temperature": 24, "previous_state": {}}
        self.data["zones"]["climate.salon"]["override"] = boost
        self.manager.calls.clear()
        await self.scheduler.async_set_zone_profile("climate.salon", "future")
        self.assertEqual(self.scheduler._applied_preconditioning_targets, {})
        self.assertNotIn("climate.salon", self.scheduler._preconditioning_sessions)
        self.assertEqual(self.data["zones"]["climate.salon"]["override"], boost)
        self.assertEqual(self.manager.calls, [])

    async def test_delete_override_rejected_fallback_leaves_configuration_and_revision_untouched(self):
        from .test_scheduler_application import _FakeExternalExecution
        await self.scheduler.async_set_zone_profile("climate.salon", "work")
        self.data["zones"]["climate.salon"]["execution"] = {"type": "external", "provider": "provider"}
        external = _FakeExternalExecution(self.data, self.save)
        def reject_base(entity, week, provider=None):
            if entity == "climate.salon" and week["tuesday"][0].get("temperature") == 19:
                raise ValueError("unsupported fallback")
        external.ensure_schedule_supported = reject_base
        self.scheduler._external_execution = external
        self.scheduler._execution_authority = external.authority
        self.scheduler._planned_return.cancel = AsyncMock()
        previous = deepcopy(self.data)
        self.save.reset_mock()
        with self.assertRaisesRegex(ValueError, "unsupported fallback"):
            await self.scheduler.async_delete_profile("work")
        self.assertEqual(self.data, previous)
        self.save.assert_not_awaited()
        self.scheduler._planned_return.cancel.assert_not_awaited()

    async def test_rejected_mode_edit_does_not_expose_draft_composition(self):
        from .test_scheduler_application import _FakeExternalExecution
        pause = _profile(key="pause", behavior="pause")
        await self.scheduler.async_set_profile(pause)
        self.data["zones"]["climate.salon"]["execution"] = {"type": "external", "provider": "provider"}
        external = _FakeExternalExecution(self.data, self.save)
        self.scheduler._external_execution = external
        self.scheduler._execution_authority = external.authority
        previous = deepcopy(self.data)
        self.save.reset_mock()
        with self.assertRaisesRegex(ValueError, "Pause profile behavior"):
            await self.scheduler.async_set_velair_mode({"key": "winter-mode", "name": "Winter", "profile_ids": ["pause"]})
        self.assertEqual(self.data, previous)
        self.save.assert_not_awaited()

    async def test_future_only_change_preserves_deferred_boost_delivery(self):
        future = deepcopy(self.scheduler._profile_by_id("winter"))
        future.update(key="future", name="Future")
        future["zones"]["climate.salon"]["schedule"]["tuesday"].append({"start": "20:00", "temperature": 23, "hvac_mode": "heat"})
        await self.scheduler.async_set_profile(future)
        self.data["zones"]["climate.salon"]["override"] = {"type": "boost", "temperature": 24, "previous_state": {}}
        delivery = self.scheduler._climate_delivery
        delivery.register_current("climate.salon", lambda: None)
        self.assertTrue(delivery.is_deferred("climate.salon"))
        await self.scheduler.async_set_zone_profile("climate.salon", "future")
        self.assertTrue(delivery.is_deferred("climate.salon"))
        self.assertEqual(self.data["zones"]["climate.salon"]["override"]["temperature"], 24)

    async def test_mode_edit_late_validation_failure_restores_entire_draft(self):
        previous = deepcopy(self.data)
        original = self.scheduler._validate_profile
        def validate(profile, **kwargs):
            if self.data["modes"][0]["profile_ids"] == ["visit"]:
                raise ValueError("capabilities changed while waiting")
            return original(profile, **kwargs)
        self.save.reset_mock()
        with patch.object(self.scheduler, "_validate_profile", side_effect=validate):
            with self.assertRaisesRegex(ValueError, "capabilities changed"):
                await self.scheduler.async_set_velair_mode({"key": "winter-mode", "name": "Winter", "profile_ids": ["visit"]})
        self.assertEqual(self.data, previous)
        self.save.assert_not_awaited()
