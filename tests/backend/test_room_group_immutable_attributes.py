"""Exercise group lifecycle with Home Assistant's read-only attribute contract."""

from copy import deepcopy
from types import MappingProxyType, SimpleNamespace
import unittest
from unittest.mock import AsyncMock

from .helpers import FakeHass, normalize_schedule_data, VelairScheduler
from custom_components.velair.climate_manager import ClimateManager


class ReadOnlyAttributes(dict):
    """Like HA ReadOnlyDict, deepcopy must retain read-only behavior."""

    def __setitem__(self, key, value):
        raise RuntimeError("Cannot modify ReadOnlyDict")

    def __deepcopy__(self, memo):
        return type(self)(deepcopy(dict(self), memo))


class RoomGroupImmutableAttributesTest(unittest.IsolatedAsyncioTestCase):
    async def test_three_member_lifecycle_preserves_read_only_physical_states(self):
        for mapping in (ReadOnlyAttributes, MappingProxyType):
            for mode in ("heat", "cool"):
                for delivery in ("all", "selected"):
                    with self.subTest(mapping=mapping.__name__, mode=mode, delivery=delivery):
                        await self._check_lifecycle(mapping, mode, delivery)

    async def _check_lifecycle(self, mapping, mode, delivery):
        hass = FakeHass()
        hass.config.units = SimpleNamespace(temperature_unit="°C")
        ids = ["climate.a", "climate.b", "climate.c"]
        for entity in ids:
            hass.states[entity] = SimpleNamespace(state=mode, attributes=mapping({
                "hvac_modes": ["off", "heat", "cool"], "supported_features": 1,
                "current_temperature": 19.0, "temperature": 20.0,
                "min_temp": 5.0, "max_temp": 35.0, "target_temp_step": 0.5,
            }))
        physical_before = {entity: deepcopy(dict(hass.states[entity].attributes)) for entity in ids}
        data = normalize_schedule_data(None, ids)
        before = deepcopy(data)
        save = AsyncMock()
        scheduler = VelairScheduler(hass, data, ClimateManager(hass), save)
        group = {"id": "group.room", "name": "Room", "members": ids,
                 "temperature_entity_id": ids[0], "delivery_mode": delivery}
        if delivery == "selected":
            group["delivery_entity_id"] = ids[1]
        try:
            preview = scheduler.preview_room_group(group, 0, ids[0])
            self.assertEqual(preview["group"], group)
            self.assertEqual(data, before)
            save.assert_not_awaited()
            await scheduler.async_set_room_group(group, 0, ids[0])
            self.assertEqual(data["room_groups"]["group.room"], group)
            self.assertEqual(set(data["zones"]), {"group.room"})
            self.assertEqual(data["configuration_revision"], 1)
            projection = scheduler._climate_manager.state("group.room")
            self.assertEqual(projection.attributes["current_temperature"], 19.0)
            projection.attributes["hvac_modes"].append("test-only")
            renamed = {**group, "name": "Updated room"}
            scheduler.preview_room_group(renamed, 1)
            await scheduler.async_set_room_group(renamed, 1)
            self.assertEqual(data["room_groups"]["group.room"]["name"], "Updated room")
            await scheduler.async_remove_room_group("group.room", 2)
            self.assertEqual(data["room_groups"], {})
            self.assertEqual(set(data["zones"]), set(ids))
            self.assertEqual(save.await_count, 3)
            for entity in ids:
                self.assertIsInstance(hass.states[entity].attributes, mapping)
                self.assertEqual(dict(hass.states[entity].attributes), physical_before[entity])
        finally:
            await scheduler.async_stop()
