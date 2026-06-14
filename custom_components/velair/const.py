"""Constants for Velair."""

from homeassistant.const import Platform

DOMAIN = "velair"
NAME = "Velair"

CONF_CLIMATE_ENTITIES = "climate_entities"
CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP = "apply_active_schedule_on_startup"

SIGNAL_SCHEDULER_UPDATED = f"{DOMAIN}_scheduler_updated"

EVENT_VELAIR = f"{DOMAIN}_event"
EVENT_TYPE_BOOST_ENDED = "boost_ended"
EVENT_TYPE_BOOST_STARTED = "boost_started"
EVENT_TYPE_CLIMATE_TARGET_APPLIED = "climate_target_applied"
EVENT_TYPE_SCHEDULER_MODE_CHANGED = "scheduler_mode_changed"
EVENT_TYPE_ZONE_PAUSED = "zone_paused"
EVENT_TYPE_ZONE_RESUMED = "zone_resumed"

SERVICE_APPLY_SCHEDULE = "apply_schedule"
SERVICE_BOOST = "boost"
SERVICE_CLEAR_SCHEDULE = "clear_schedule"
SERVICE_COPY_DAY_SCHEDULE = "copy_day_schedule"
SERVICE_PAUSE = "pause"
SERVICE_PAUSE_ZONE = "pause_zone"
SERVICE_RESUME = "resume"
SERVICE_RESUME_ZONE = "resume_zone"
SERVICE_SET_DAILY_SCHEDULE = "set_daily_schedule"
SERVICE_SET_TEMPERATURE = "set_temperature"

ATTR_ACTION = "action"
ATTR_APPLY_CURRENT_SCHEDULE = "apply_current_schedule"
ATTR_BLOCKS = "blocks"
ATTR_DURATION_MINUTES = "duration_minutes"
ATTR_HVAC_MODE = "hvac_mode"
ATTR_KEY = "key"
ATTR_NAME = "name"
ATTR_SOURCE_WEEKDAY = "source_weekday"
ATTR_TARGET_WEEKDAYS = "target_weekdays"
ATTR_TEMPERATURE = "temperature"
ATTR_WEEKDAY = "weekday"

ACTION_SET_TEMPERATURE = "set_temperature"
ACTION_TURN_OFF = "turn_off"
ACTION_OPTIONS = [
    ACTION_SET_TEMPERATURE,
    ACTION_TURN_OFF,
]

ZONE_PAUSE_ACTION_NONE = "none"
ZONE_PAUSE_ACTION_TURN_OFF = ACTION_TURN_OFF
ZONE_PAUSE_ACTION_OPTIONS = [
    ZONE_PAUSE_ACTION_NONE,
    ZONE_PAUSE_ACTION_TURN_OFF,
]

HVAC_MODE_OFF = "off"
HVAC_MODE_OPTIONS = [
    "heat",
    "cool",
    "heat_cool",
    "auto",
    "dry",
    "fan_only",
]

MODE_AUTO = "auto"
MODE_MANUAL = "manual"
MODE_PAUSED = "paused"
MODE_VACATION = "vacation"

MODE_OPTIONS = [
    MODE_AUTO,
    MODE_MANUAL,
    MODE_PAUSED,
    MODE_VACATION,
]

PLATFORMS: tuple[Platform, ...] = (
    Platform.SENSOR,
    Platform.SELECT,
    Platform.SWITCH,
)
