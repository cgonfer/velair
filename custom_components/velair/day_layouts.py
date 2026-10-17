"""Built-in presentation-only weekly partitions."""
from .models import WEEKDAYS
from .schedule_resources import ConfigurationResourceError, destinations

BUILTIN_DAY_LAYOUTS = {
    "individual": [[day] for day in WEEKDAYS],
    "weekdays_weekend": [list(WEEKDAYS[:5]), list(WEEKDAYS[5:])],
    "all": [list(WEEKDAYS)],
}


def normalize_day_layout_key(key):
    """Safely retire legacy custom references without touching daily schedules."""
    return key if isinstance(key, str) and key in BUILTIN_DAY_LAYOUTS else "individual"


def validate_day_layout_key(key):
    if not isinstance(key, str) or key not in BUILTIN_DAY_LAYOUTS:
        raise ConfigurationResourceError("reference_not_found", "Choose a built-in day layout")
    return key


def validate_day_layout_references(data):
    for _destination, zone in destinations(data):
        validate_day_layout_key(zone.get("day_layout_key", "individual"))
