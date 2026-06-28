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
export const PANEL_VIEWS: VelairPanelView[] = [
  "overview",
  "schedules",
  "templates",
  "preconditioning",
  "settings",
];
export const LOVELACE_CARD_VIEWS: VelairCardView[] = [
  "overview-status",
  "overview-boosts",
  "overview-events",
  "overview-timeline",
  "overview-zones",
  "schedules",
  "preconditioning",
];
export const PORTABLE_FORMAT = "velair_portable_data";
export const PORTABLE_MODEL_VERSION = 1;
export const PORTABLE_SECTIONS: PortableSection[] = [
  "zones",
  "templates",
  "settings",
  "preconditioning_learning",
];
