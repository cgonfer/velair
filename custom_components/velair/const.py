"""Constants for Velair."""

from homeassistant.const import Platform

DOMAIN = "velair"
NAME = "Velair"
MAX_PROFILE_DESCRIPTION_LENGTH = 500
MODE_DEFAULT_OPTION = "Default"
MODE_MANUAL_OPTION = "Manual"

CONF_CLIMATE_ENTITIES = "climate_entities"
CONF_APPLY_ACTIVE_SCHEDULE_ON_STARTUP = "apply_active_schedule_on_startup"

SIGNAL_SCHEDULER_UPDATED = f"{DOMAIN}_scheduler_updated"
SIGNAL_DIAGNOSTICS_UPDATED = f"{DOMAIN}_diagnostics_updated"

DIAGNOSTIC_HISTORY_CATEGORIES = (
    "control",
    "room_assist",
    "preconditioning",
    "comfort",
    "delivery",
    "availability",
)

EVENT_VELAIR = f"{DOMAIN}_event"
EVENT_TYPE_BOOST_ENDED = "boost_ended"
EVENT_TYPE_BOOST_STARTED = "boost_started"
EVENT_TYPE_CLIMATE_TARGET_APPLIED = "climate_target_applied"
EVENT_TYPE_EXTERNAL_CLIMATE_CHANGE_DETECTED = "external_climate_change_detected"
EVENT_TYPE_COMFORT_ASSESSMENT_CHANGED = "comfort_assessment_changed"
EVENT_TYPE_DIAGNOSTIC_ISSUE_CHANGED = "diagnostic_issue_changed"
EVENT_TYPE_PRECONDITIONING_OBSERVATION_RECORDED = (
    "preconditioning_observation_recorded"
)
EVENT_TYPE_PRECONDITIONING_PLAN_CANCELLED = "preconditioning_plan_cancelled"
EVENT_TYPE_PRECONDITIONING_PLAN_UPDATED = "preconditioning_plan_updated"
EVENT_TYPE_PROFILE_CHANGED = "profile_changed"
EVENT_TYPE_ROOM_SENSOR_ASSIST_RESTORED = "room_sensor_assist_restored"
EVENT_TYPE_ROOM_SENSOR_ASSIST_STATE_CHANGED = "room_sensor_assist_state_changed"
EVENT_TYPE_ROOM_SENSOR_ASSIST_UPDATED = "room_sensor_assist_updated"
EVENT_TYPE_SCHEDULER_MODE_CHANGED = "scheduler_mode_changed"
EVENT_TYPE_ZONE_PAUSED = "zone_paused"
EVENT_TYPE_ZONE_PAUSE_ADDED = "zone_pause_added"
EVENT_TYPE_ZONE_PAUSE_UPDATED = "zone_pause_updated"
EVENT_TYPE_ZONE_PAUSE_REMOVED = "zone_pause_removed"
EVENT_TYPE_ZONE_RESUMED = "zone_resumed"
EVENT_TYPE_ZONE_CONTROL_CHANGED = "zone_control_changed"

SERVICE_APPLY_SCHEDULE = "apply_schedule"
SERVICE_ACTIVATE_PROFILE = "activate_profile"
SERVICE_DEACTIVATE_PROFILE = "deactivate_profile"
SERVICE_BOOST = "boost"
SERVICE_CANCEL_BOOST = "cancel_boost"
SERVICE_CLEAR_SCHEDULE = "clear_schedule"
SERVICE_COPY_DAY_SCHEDULE = "copy_day_schedule"
SERVICE_PAUSE = "pause"
SERVICE_PAUSE_ZONE = "pause_zone"
SERVICE_RESUME = "resume"
SERVICE_RESUME_ZONE = "resume_zone"
SERVICE_ENABLE_ROOM_SENSOR_ASSIST = "enable_room_sensor_assist"
SERVICE_DISABLE_ROOM_SENSOR_ASSIST = "disable_room_sensor_assist"
SERVICE_SET_DAILY_SCHEDULE = "set_daily_schedule"
SERVICE_SET_TEMPERATURE = "set_temperature"
SERVICE_SET_EXTERNAL_CHANGE_POLICY = "set_external_change_policy"
SERVICE_ENTER_MANUAL_ADJUSTMENT = "enter_manual_adjustment"
SERVICE_RESUME_AUTOMATIC_CONTROL = "resume_automatic_control"

ATTR_ACTION = "action"
ATTR_APPLY_CURRENT_SCHEDULE = "apply_current_schedule"
ATTR_BLOCKS = "blocks"
ATTR_DURATION_MINUTES = "duration_minutes"
ATTR_FAN_MODE = "fan_mode"
ATTR_HVAC_MODE = "hvac_mode"
ATTR_HUMIDITY = "humidity"
ATTR_KEY = "key"
ATTR_PROFILE_ID = "profile_id"
ATTR_NAME = "name"
ATTR_PAUSE_ID = "pause_id"
ATTR_RESUME_ALL = "resume_all"
ATTR_PRESET_MODE = "preset_mode"
ATTR_SOURCE_WEEKDAY = "source_weekday"
ATTR_SWING_HORIZONTAL_MODE = "swing_horizontal_mode"
ATTR_SWING_MODE = "swing_mode"
ATTR_TARGET_WEEKDAYS = "target_weekdays"
ATTR_TEMPERATURE = "temperature"
ATTR_TARGET_TEMP_LOW = "target_temp_low"
ATTR_TARGET_TEMP_HIGH = "target_temp_high"
ATTR_WEEKDAY = "weekday"
ATTR_POLICY = "policy"

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

MAX_PAUSE_ID_LENGTH = 128
PAUSE_ID_PATTERN = r"[A-Za-z0-9][A-Za-z0-9_.:-]*"

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
MODE_PAUSED = "paused"

EXTERNAL_CHANGE_KEEP_AUTOMATIC = "keep_automatic"
EXTERNAL_CHANGE_UNTIL_NEXT_BLOCK = "until_next_block"
EXTERNAL_CHANGE_FOR_DURATION = "for_duration"
EXTERNAL_CHANGE_UNTIL_RESUMED = "until_resumed"
EXTERNAL_CHANGE_POLICY_OPTIONS = (
    EXTERNAL_CHANGE_KEEP_AUTOMATIC,
    EXTERNAL_CHANGE_UNTIL_NEXT_BLOCK,
    EXTERNAL_CHANGE_FOR_DURATION,
    EXTERNAL_CHANGE_UNTIL_RESUMED,
)
MANUAL_ADJUSTMENT_POLICY_OPTIONS = (
    EXTERNAL_CHANGE_UNTIL_NEXT_BLOCK,
    EXTERNAL_CHANGE_FOR_DURATION,
    EXTERNAL_CHANGE_UNTIL_RESUMED,
)
DEFAULT_EXTERNAL_CHANGE_DURATION_MINUTES = 120
MANUAL_CONTROL_PAUSE_ID = "velair.manual_adjustment"

PLATFORMS: tuple[Platform, ...] = (
    Platform.SENSOR,
    Platform.SELECT,
    Platform.SWITCH,
)

ZONE_SENSOR_UNIQUE_ID_SUFFIXES = (
    "active_target_temperature",
    "environmental_condition",
    "air_quality",
    "override_state",
    "preconditioning_start",
    "room_assist_state",
)
