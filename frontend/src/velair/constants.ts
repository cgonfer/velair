import type { PortableSection, VelairCardView, VelairPanelView } from "./types";

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const HVAC_MODES = ["heat", "cool", "heat_cool", "auto", "dry", "fan_only", "off"];
export const ACTION_SET_TEMPERATURE = "set_temperature";
export const ACTION_TURN_OFF = "turn_off";
export const DOMAIN = "velair";
export const NOTICE_AUTO_DISMISS_MS = 5_000;
export const OPERATION_SUCCESS_VISIBLE_MS = 5_000;
export const INITIAL_LOADING_DELAY_MS = 300;
export const VELAIR_LOADING_ICON_URL = "/velair_frontend/velair-icon.png";
export const PROFILE_DESCRIPTION_MAX_LENGTH = 500;
export const MODE_NAME_MAX_LENGTH = 255;
export const DEFAULT_EXTERNAL_CHANGE_DURATION_MINUTES = 120;
export const PANEL_VIEWS: VelairPanelView[] = [
  "overview",
  "schedules",
  "modes",
  "templates",
  "sensors",
  "comfort",
  "preconditioning",
  "diagnostics",
  "settings",
];
export const LOVELACE_CARD_VIEWS: VelairCardView[] = [
  "overview-status",
  "overview-boosts",
  "overview-events",
  "overview-timeline",
  "overview-zones",
  "active-setup",
  "schedules",
  "sensors",
  "comfort",
  "preconditioning",
];
export const PORTABLE_FORMAT = "velair_portable_data";
export const PORTABLE_MODEL_VERSION = 8;
export const PORTABLE_SECTIONS: PortableSection[] = [
  "zones",
  "templates",
  "settings",
  "preconditioning_learning",
  "profiles",
  "modes",
];
