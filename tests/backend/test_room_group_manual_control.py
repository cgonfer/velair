"""Group Manual adjustment preserves peers and one pause authority."""

from types import SimpleNamespace
from datetime import timedelta
import unittest
from unittest.mock import AsyncMock, patch

from .helpers import FakeHass, NOW, normalize_schedule_data, VelairScheduler
from custom_components.velair.climate_manager import ClimateManager
from custom_components.velair.room_groups import build_group_candidate


class RoomGroupManualControlTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.hass = FakeHass()
        self.hass.config.units = SimpleNamespace(temperature_unit="°C")
        self.members = ["climate.a", "climate.b"]
        for member in self.members:
            self.hass.states[member] = SimpleNamespace(state="heat", attributes={
                "hvac_modes": ["off", "heat", "cool"], "supported_features": 1,
                "current_temperature": 19.0, "temperature": 20.0,
                "min_temp": 5.0, "max_temp": 35.0, "target_temp_step": 0.5,
            })
        base = normalize_schedule_data(None, self.members)
        group = {"id": "group.room", "name": "Room", "members": self.members,
                 "temperature_entity_id": "climate.a", "delivery_mode": "all"}
        self.data, _ = build_group_candidate(base, self.members, group, "climate.a")
        self.zone = self.data["zones"]["group.room"]
        self.zone["schedule"]["tuesday"] = [
            {"start": "17:00", "action": "set_temperature", "temperature": 21.0, "hvac_mode": "heat"},
            {"start": "19:00", "action": "set_temperature", "temperature": 23.0, "hvac_mode": "heat"},
        ]
        self.physical = ClimateManager(self.hass)
        self.scheduler = VelairScheduler(self.hass, self.data, self.physical, AsyncMock())

    async def asyncTearDown(self):
        await self.scheduler.async_stop()

    async def _change_one_member(self, member="climate.a"):
        await self.scheduler.async_update_external_change_policy(
            member, {"action": "until_next_block"}
        )
        self.hass.states[member].attributes["temperature"] = 22.0
        await self.scheduler.async_handle_external_climate_change(
            member, changed_fields=["temperature"],
            previous={"temperature": 20.0}, current={"temperature": 22.0},
            observed_snapshot=self.physical.climate_state_snapshot(member),
        )

    def _temperature_calls(self):
        return [(data["entity_id"], data["temperature"])
                for domain, service, data, _ in self.hass.services.calls
                if domain == "climate" and service == "set_temperature"]

    async def test_member_change_preserves_peer_and_other_member_resumes_shared_schedule(self):
        await self._change_one_member()
        self.assertEqual(set(self.data["zones"]), {"group.room"})
        manual = self.scheduler.get_zone_runtime_statuses()["group.room"]["manual_control"]
        self.assertEqual(manual["until"], (NOW + timedelta(hours=1)).isoformat())
        self.assertIn(("climate.a", 22.0), self._temperature_calls())
        self.assertIn(("climate.b", 20.0), self._temperature_calls())
        self.assertNotIn(("climate.b", 22.0), self._temperature_calls())
        self.hass.services.calls.clear()
        await self.scheduler.async_resume_automatic_control("climate.b")
        self.assertEqual(self.scheduler.get_zone_runtime_statuses()["group.room"]["control_mode"], "automatic")
        self.assertCountEqual(self._temperature_calls(), [(member, 21.0) for member in self.members])

    async def test_manual_resume_retains_another_members_independent_pause_reason(self):
        await self._change_one_member()
        await self.scheduler.async_pause_zone("climate.b", pause_id="window", action="none")
        self.hass.services.calls.clear()
        await self.scheduler.async_resume_automatic_control("climate.a")
        self.assertEqual([reason["pause_id"] for reason in self.zone["pauses"]], ["window"])
        self.assertEqual(self._temperature_calls(), [])
        await self.scheduler.async_resume_zone("climate.a", pause_id="window")
        self.assertFalse(self.zone["pauses"])
        self.assertCountEqual(self._temperature_calls(), [(member, 21.0) for member in self.members])

    async def test_next_block_expiry_restores_shared_intent_through_selected_recipient(self):
        self.data["room_groups"]["group.room"].update(
            delivery_mode="selected", delivery_entity_id="climate.a"
        )
        await self._change_one_member()
        self.hass.services.calls.clear()
        at_next_block = NOW + timedelta(hours=1)
        with patch("custom_components.velair.scheduler.dt_util.now", return_value=at_next_block):
            expired = await self.scheduler._async_clear_expired_zone_overrides(at_next_block)
            self.assertIn("group.room", expired)
            self.assertEqual(self.scheduler.get_zone_runtime_statuses()["group.room"]["control_mode"], "automatic")
            await self.scheduler.async_apply_current_schedule("group.room")
        self.assertEqual(self._temperature_calls(), [("climate.a", 23.0)])

    async def test_external_change_on_non_recipient_does_not_forward_its_target(self):
        self.data["room_groups"]["group.room"].update(
            delivery_mode="selected", delivery_entity_id="climate.a"
        )
        await self._change_one_member("climate.b")
        self.assertEqual(self.scheduler.get_zone_runtime_statuses()["group.room"]["control_mode"], "manual")
        self.assertEqual(self._temperature_calls(), [("climate.a", 20.0)])
        self.assertEqual(self.hass.states["climate.b"].attributes["temperature"], 22.0)
        self.hass.services.calls.clear()
        await self.scheduler.async_resume_automatic_control("climate.b")
        self.assertEqual(self._temperature_calls(), [("climate.a", 21.0)])
