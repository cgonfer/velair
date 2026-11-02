"""Small immutable input values shared by maintained runtime projections."""
from __future__ import annotations
from dataclasses import fields, is_dataclass
from math import isnan

_THERMAL_CAPABILITIES = (
    "supported_features", "hvac_modes", "min_temp", "max_temp",
    "target_temp_step", "temperature_unit", "unit_of_measurement",
)
_TARGET_KEYS = ("temperature", "target_temp_low", "target_temp_high")


def input_value(value):
    """Detach consumed values, retaining semantic equality across reports."""
    if isinstance(value, dict):
        return tuple(sorted(((input_value(key), input_value(item))
                             for key, item in value.items()), key=lambda item: repr(item[0])))
    if isinstance(value, (list, tuple)):
        return tuple(input_value(item) for item in value)
    if isinstance(value, (set, frozenset)):
        return frozenset(input_value(item) for item in value)
    if is_dataclass(value) and not isinstance(value, type):
        return (type(value), tuple((field.name, input_value(getattr(value, field.name)))
                                  for field in fields(value)))
    if isinstance(value, float) and isnan(value):
        return (float, "nan")
    return value


def target_feature_presence(attributes):
    """Reported targets infer capability only without an explicit feature mask."""
    try:
        features = int(attributes.get("supported_features", 0) or 0)
    except (TypeError, ValueError):
        features = 0
    return () if features else tuple(key in attributes for key in _TARGET_KEYS)


def _state_capabilities(state):
    attributes = state.attributes if state is not None else {}
    return (getattr(state, "state", None),
            tuple((key, input_value(attributes.get(key))) for key in _THERMAL_CAPABILITIES),
            target_feature_presence(attributes))


def thermal_input(owner, entity, config):
    """Read consumed HA inputs for this zone without copying state attributes."""
    state = owner.climate_state(entity)
    source_entity = owner._temperature_source_entity_id(entity)
    source = owner.climate_state(source_entity)
    source_attributes = source.attributes if source is not None else {}
    outdoor = None
    if config.get("use_outdoor_temperature"):
        outdoor_entity = config.get("outdoor_temperature_entity_id")
        outdoor_state = owner.climate_state(outdoor_entity) if outdoor_entity else None
        outdoor_attributes = outdoor_state.attributes if outdoor_state is not None else {}
        outdoor = (outdoor_entity, getattr(outdoor_state, "state", None),
                   outdoor_attributes.get("unit_of_measurement"),
                   outdoor_attributes.get("temperature_unit"),
                   owner._outdoor_temperature(entity, config))
    group = owner._data.get("room_groups", {}).get(entity, {})
    members = tuple((member, _state_capabilities(owner.climate_state(member)))
                    for member in group.get("members", ()))
    units = getattr(getattr(getattr(owner._hass, "config", None), "units", None),
                    "temperature_unit", None)
    return input_value((
        _state_capabilities(state), owner._current_hvac_mode(entity),
        owner._current_temperature(entity), source_entity,
        getattr(source, "state", None), source_attributes.get("unit_of_measurement"),
        source_attributes.get("temperature_unit"), outdoor, units,
        group.get("temperature_entity_id"), members,
    ))
