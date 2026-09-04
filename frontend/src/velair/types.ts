export type HassConnection = {
  sendMessagePromise<T>(message: Record<string, unknown>): Promise<T>;
  subscribeMessage<T>(
    callback: (message: T) => void,
    message: Record<string, unknown>,
  ): Promise<() => Promise<void> | void>;
};

export type HassState = {
  state?: string;
  attributes?: {
    current_temperature?: number;
    current_humidity?: number;
    device_class?: string;
    fan_mode?: string;
    fan_modes?: string[];
    friendly_name?: string;
    hvac_action?: string;
    hvac_modes?: string[];
    humidity?: number;
    max_humidity?: number;
    max_temp?: number;
    min_humidity?: number;
    min_temp?: number;
    preset_mode?: string;
    preset_modes?: string[];
    swing_horizontal_mode?: string;
    swing_horizontal_modes?: string[];
    swing_mode?: string;
    swing_modes?: string[];
    supported_features?: number;
    target_temp_high?: number;
    target_temp_low?: number;
    target_temp_step?: number;
    temperature?: number;
    unit_of_measurement?: string;
  };
};

export type HomeAssistant = {
  callService(domain: string, service: string, serviceData?: Record<string, unknown>): Promise<void>;
  connection: HassConnection;
  config?: {
    time_zone?: string;
    unit_system?: {
      temperature?: string;
    };
  };
  language?: string;
  locale?: {
    language?: string;
    time_format?: string;
  };
  selectedLanguage?: string;
  states?: Record<string, HassState>;
};

export type ActiveSetupControls = "both" | "modes" | "profiles";

export type VelairCardConfig = {
  active_setup_controls?: ActiveSetupControls;
  entities?: string[];
  first_weekday?: string;
  show_comfort_co2?: boolean;
  show_comfort_configuration?: boolean;
  show_comfort_humidity?: boolean;
  show_comfort_temperature?: boolean;
  show_room_assist_debounce?: boolean;
  show_room_assist_deadband?: boolean;
  show_room_assist_live_status?: boolean;
  show_room_assist_max_delta?: boolean;
  show_room_assist_sensor?: boolean;
  show_room_assist_switch?: boolean;
  title?: string;
  selected_entity?: string;
  selected_weekday?: string;
  view?: VelairCardView;
  zone_order?: string[];
};

export type VelairPanelConfig = {
  module_url?: string;
};

export type VelairPanelInfo = {
  config?: VelairPanelConfig;
};

export type VelairPanelRoute = {
  path?: string;
  prefix?: string;
};

export type VelairPanelView = "overview" | "modes" | "schedules" | "templates" | "sensors" | "comfort" | "preconditioning" | "diagnostics" | "settings";
export type VelairOverviewCardView =
  | "overview-status"
  | "active-setup"
  | "overview-boosts"
  | "overview-events"
  | "overview-timeline"
  | "overview-zones";
// `profiles` remains accepted as a legacy panel/card route. New navigation
// exposes Profiles through the Schedules workspace and uses `modes` here.
export type VelairCardView = VelairPanelView | VelairOverviewCardView | "profiles";

export type ScheduleBlock = {
  action?: string;
  fan_mode?: string;
  start: string;
  temperature?: number;
  target_temp_low?: number;
  target_temp_high?: number;
  hvac_mode?: string;
  humidity?: number;
  preset_mode?: string;
  swing_horizontal_mode?: string;
  swing_mode?: string;
};

export type ClimateProfileZone =
  | { behavior: "normal" }
  | { behavior: "schedule"; schedule: Record<string, ScheduleBlock[]> }
  | { behavior: "pause"; action: "none" | "turn_off" };

export type ClimateProfile = {
  key: string;
  name: string;
  icon?: string;
  color?: string;
  description?: string;
  zones: Record<string, ClimateProfileZone>;
};

export type ClimateProfileInput = {
  key?: string;
  name: string;
  icon?: string;
  color?: string;
  description?: string;
  zones: Record<string, ClimateProfileZone>;
};

export type VelairMode = {
  key: string;
  name: string;
  profile_ids: string[];
};

export type VelairModeInput = {
  key?: string;
  name: string;
  profile_ids: string[];
};

export type DraftScheduleBlock = {
  action: string;
  fan_mode?: string;
  start: string;
  temperature?: number | string;
  target_temp_low?: number | string;
  target_temp_high?: number | string;
  hvac_mode: string;
  humidity?: number | string;
  preset_mode?: string;
  swing_horizontal_mode?: string;
  swing_mode?: string;
};

export type ScheduleTemplate = {
  key: string;
  name?: string;
  blocks: DraftScheduleBlock[];
};

export type StoredScheduleTemplate = {
  key: string;
  name: string;
  blocks: ScheduleBlock[];
};

export type PreconditioningSettings = {
  enabled: boolean;
  max_lead_minutes: number;
  minimum_delta_temperature: number;
  learning_history_size: number;
  similar_sample_count: number;
  comfort_percentile: number;
  adaptive_percentile_enabled: boolean;
  partial_expiry_days: number;
  recency_decay_days: number;
  min_start_minutes: number;
  fallback_minutes_per_degree: number;
  use_outdoor_temperature: boolean;
  outdoor_temperature_entity_id: string | null;
  room_temperature_entity_id: string | null;
  room_sensor_assist_enabled: boolean;
  room_sensor_assist_deadband: number;
  room_sensor_assist_max_delta: number;
  room_sensor_assist_debounce_seconds: number;
};

export type ComfortSettings = {
  enabled: boolean;
  temperature_entity_id: string | null;
  humidity_enabled: boolean;
  humidity_entity_id: string | null;
  co2_entity_id: string | null;
  temperature_min: number;
  temperature_max: number;
  humidity_min: number;
  humidity_max: number;
  co2_attention: number;
  co2_poor: number;
  stale_after_minutes: number;
};

export type ComfortMetricAssessment = {
  attention?: number;
  availability: "current" | "missing" | "stale" | "not_monitored";
  condition:
    | "cold"
    | "comfortable"
    | "hot"
    | "dry"
    | "humid"
    | "good"
    | "elevated"
    | "poor"
    | null;
  entity_id?: string | null;
  max?: number;
  metric: "temperature" | "humidity" | "co2";
  min?: number;
  source: string;
  value?: number | null;
};

export type ComfortAssessment = {
  enabled: boolean;
  condition:
    | "monitoring_off"
    | "no_readings"
    | "comfortable"
    | "temperature_comfortable"
    | "humidity_comfortable"
    | "cold"
    | "hot"
    | "dry"
    | "humid"
    | "cold_and_dry"
    | "cold_and_humid"
    | "hot_and_dry"
    | "hot_and_humid";
  air_quality: "not_monitored" | "unavailable" | "good" | "elevated" | "poor";
  data_quality: "complete" | "partial" | "stale" | "unavailable";
  data_issues: string[];
  temperature?: ComfortMetricAssessment;
  humidity?: ComfortMetricAssessment;
  co2?: ComfortMetricAssessment;
};

export type PreconditioningDirectionLearning = {
  status: "learning" | "ready" | "unsupported";
  sample_count: number;
  total_samples: number;
  required_samples: number;
  effective_lead_minutes?: number | null;
  effective_lead_source?: "history" | "initial_model" | "unsupported" | null;
  partial_sample_count?: number;
  complete_sample_count?: number;
  invalid_sample_count?: number;
  lead_limited_by_max?: boolean;
  last_quality?: "complete" | "partial" | "invalid" | null;
  model_source?: "history" | "initial_model" | null;
  comfort_percentile?: number;
  similar_sample_count?: number;
};

export type PreconditioningLearningSummary = {
  status: "disabled" | "learning" | "ready";
  required_samples: number;
  total_samples: number;
  heat: PreconditioningDirectionLearning;
  cool: PreconditioningDirectionLearning;
};

export type RoomSensorAssistStatus = {
  status: "not_configured" | "disabled" | "idle" | "ready" | "assisting" | "holding" | "blocked" | "unavailable";
  enabled: boolean;
  configured: boolean;
  reason?: "missing_target_step" | "unsupported_temperature_range" | null;
  room_temperature_entity_id?: string | null;
  target_temperature?: number | null;
  target_temp_low?: number | null;
  target_temp_high?: number | null;
  applied_temperature?: number | null;
  applied_target_temp_low?: number | null;
  applied_target_temp_high?: number | null;
  climate_target_temperature?: number | null;
  climate_target_temp_low?: number | null;
  climate_target_temp_high?: number | null;
  room_temperature?: number | null;
  climate_temperature?: number | null;
  applied_offset?: number | null;
  range_shift?: number | null;
  limited_by?: "minimum" | "maximum" | null;
  limit_temperature?: number | null;
  requested_temperature?: number | null;
  calculated_temperature?: number | null;
  scheduled_target_guard?: "heating_ceiling" | "cooling_floor" | null;
  pre_step_temperature?: number | null;
  target_temp_step?: number | null;
  requested_target_temp_low?: number | null;
  requested_target_temp_high?: number | null;
  assist_delta?: number | null;
  direction?: "heat" | "cool" | null;
  hysteresis_phase?: "towards_lower" | "towards_upper" | null;
  hysteresis_target?: number | null;
  deadband_low?: number | null;
  deadband_high?: number | null;
  hvac_mode?: string | null;
  weekday?: string | null;
  start?: string | null;
  active_from?: string | null;
  target_when?: string | null;
};

export type ScheduleZone = {
  enabled: boolean;
  schedule: Record<string, ScheduleBlock[]>;
  override?: Record<string, unknown> | null;
  pauses?: Array<{
    started_at: string;
    action: string;
    until?: string;
    pause_id?: string;
    temperature?: number;
    target_temp_low?: number;
    target_temp_high?: number;
    hvac_mode?: string;
    fan_mode?: string;
    constraint?: string;
    label?: string;
  }>;
  preconditioning?: PreconditioningSettings;
  comfort?: ComfortSettings;
  external_change_policy?: ExternalChangePolicy;
  execution?: { type: "external"; provider: string };
};

export type ExternalExecutionInfo = {
  systems: Array<{
    provider: string;
    name: string;
    entities: string[];
    capabilities: {
      can_publish: boolean;
      can_import: boolean;
      supports_profile_schedules: boolean;
      supported_actions: string[];
      supported_hvac_modes: string[];
      supported_target_types: string[];
      supported_option_fields: string[];
      max_switchpoints_per_day: number;
      time_step_minutes: number;
      implicit_midnight_change_counts_toward_limit: boolean;
    };
  }>;
  zones: Record<string, {
    type: "external";
    provider: string;
    available: boolean;
    publication: {
      state: "publishing" | "published" | "failed";
      error?: string | null;
      published_at?: string | null;
    } | null;
  }>;
};

export type ExternalChangePolicy = {
  action: "keep_automatic" | "until_next_block" | "for_duration" | "until_resumed";
  duration_minutes?: number;
};

export type ManualAdjustmentPolicy = Exclude<ExternalChangePolicy["action"], "keep_automatic">;

export type ManualControl = {
  active: boolean;
  started_at?: string;
  until?: string;
  policy?: ManualAdjustmentPolicy;
  source?: "external_change" | "explicit";
  duration_minutes?: number;
  changed_fields?: string[];
};

export type ZoneRuntimeStatus = {
  state: "stopped" | "paused" | "hold" | "boost" | "preconditioning" | "scheduled" | "idle" | "externally_managed";
  room_temperature?: number | null;
  target_temperature?: number | null;
  target_temp_low?: number | null;
  target_temp_high?: number | null;
  applied_temperature?: number | null;
  hvac_mode?: string | null;
  active_from?: string | null;
  target_when?: string | null;
  until?: string | null;
  pause_count?: number;
  pause_ids?: string[];
  manual_pause?: boolean;
  control_mode?: "automatic" | "manual";
  manual_control?: ManualControl;
  manual_adjustment_allowed?: boolean;
  manual_adjustment_unavailable_reason?:
    | "already_manual"
    | "unavailable"
    | "disabled"
    | "temperature_migration"
    | "external_execution"
    | "scheduler_not_auto"
    | "profile_paused"
    | "zone_paused";
};

export type PreconditioningDiagnostics = {
  direction?: "heat" | "cool" | string;
  target_kind?: "scalar" | "range" | string;
  boundary_temperature?: number | null;
  target_boundary?: "low" | "high" | string | null;
  current_temperature?: number | null;
  delta_temperature: number;
  complete_sample_count: number;
  partial_sample_count: number;
  invalid_sample_count: number;
  similar_sample_count: number;
  comfort_percentile: number;
  complete_rate_minutes_per_degree?: number | null;
  complete_estimate_minutes?: number | null;
  partial_floor_minutes: number;
  combined_estimate_minutes: number;
  rounded_estimate_minutes: number;
  final_lead_minutes?: number | null;
  limited_by_min_start: boolean;
  limited_by_max_lead: boolean;
  source?: string | null;
  used_outdoor_temperature: boolean;
  initial_model_lead_minutes?: number | null;
};

export type ScheduleEvent = {
  entity_id: string;
  when: string;
  action?: string;
  fan_mode?: string | null;
  temperature?: number | null;
  target_temp_low?: number | null;
  target_temp_high?: number | null;
  hvac_mode?: string | null;
  humidity?: number | null;
  preset_mode?: string | null;
  swing_horizontal_mode?: string | null;
  swing_mode?: string | null;
  weekday: string;
  start: string;
  target_when?: string | null;
  preconditioning_diagnostics?: PreconditioningDiagnostics | null;
};

export type PanelSettings = {
  first_weekday: string;
  zone_order: string[];
  min_temperature?: number;
  max_temperature?: number;
  apply_active_schedule_on_startup?: boolean;
};

export type OperationStatus = {
  id: string;
  kind: "mode_change" | "profile_activation";
  state: "running" | "completed" | "completed_with_errors" | "failed";
  target_id?: string | null;
  completed: number;
  total: number;
  current_entity_id?: string | null;
  failed_entity_ids: string[];
  error_code?: "cancelled" | "operation_failed" | null;
  error_message?: string | null;
  started_at: string;
  finished_at?: string | null;
};

export type DiagnosticIssue = { severity: "warning" | "error"; code: string; purpose?: string };
export type DiagnosticHistoryCategory =
  | "control"
  | "room_assist"
  | "preconditioning"
  | "comfort"
  | "delivery"
  | "availability";
export type DiagnosticHistoryItem = {
  at: string;
  kind: string;
  category: DiagnosticHistoryCategory;
  severity: "info" | "warning" | "error";
  entity_id?: string | null;
  data: Record<string, unknown>;
};
export type UnitDiagnostics = {
  status: "ok" | "warning" | "error";
  issues: DiagnosticIssue[];
  state: string;
  capabilities: Record<string, unknown>;
  configuration: Record<string, unknown>;
  effective_setup: Record<string, unknown>;
  intent?: Record<string, unknown> | null;
  last_application?: Record<string, unknown> | null;
  delivery: Record<string, unknown>;
  override?: Record<string, unknown> | null;
  pauses: Record<string, unknown>[];
  room_assist?: Record<string, unknown> | null;
  comfort?: Record<string, unknown> | null;
  preconditioning_learning?: Record<string, unknown> | null;
  sensors: Array<{ purpose: string; entity_id: string; state: string }>;
};
export type DiagnosticsSnapshot = {
  generated_at: string;
  history_limit: number;
  history_policy: {
    categories: Record<DiagnosticHistoryCategory, boolean>;
    runtime_only: true;
    cleared_on_restart: true;
  };
  overall: {
    status: "ok" | "warning" | "error";
    scheduler_mode: string;
    scheduler_status: string;
    unit_counts: Record<"ok" | "warning" | "error", number>;
    issues: DiagnosticIssue[];
  };
  units: Record<string, UnitDiagnostics>;
  history: DiagnosticHistoryItem[];
};

export type ScheduleResponse = {
  profile_id?: string;
  mode_id?: string;
  configured_entities: string[];
  temperature_unit: "°C" | "°F";
  home_assistant_temperature_unit: "°C" | "°F";
  temperature_migration: {
    required: boolean;
    reason?: string;
    source_unit?: "°C" | "°F";
    target_unit?: "°C" | "°F";
    temperature_revision?: number;
    last_temperature_migration?: {
      migration_id?: string;
      source_unit?: "°C" | "°F";
      target_unit?: "°C" | "°F";
      temperature_revision?: number;
    } | null;
  };
  operation_recovery?: {
    operation: string;
    phase: string;
    persisted: boolean;
    message: string;
  } | null;
  operation_status?: OperationStatus | null;
  global: {
    mode: string;
    active_profile_ids?: string[];
    paused_started_at?: string | null;
    paused_until?: string | null;
  };
  settings: PanelSettings;
  zones: Record<string, ScheduleZone>;
  external_execution?: ExternalExecutionInfo;
  operational_status: string;
  next_event: ScheduleEvent | null;
  next_events: ScheduleEvent[];
  active_overrides: Record<string, Record<string, unknown>>;
  room_sensor_assist?: Record<string, RoomSensorAssistStatus>;
  comfort?: Record<string, ComfortAssessment>;
  zone_runtime?: Record<string, ZoneRuntimeStatus>;
  preconditioning_learning?: Record<string, PreconditioningLearningSummary>;
  diagnostics?: DiagnosticsSnapshot;
  templates?: StoredScheduleTemplate[];
  profiles?: ClimateProfile[];
  modes?: VelairMode[];
  active_mode_id?: string | null;
  versions?: {
    export_format?: string;
    integration?: string;
    model?: number;
    portable_model?: number;
    storage?: number;
  };
};

export type ScheduleUpdateMessage = {
  loaded: boolean;
  schedule?: ScheduleResponse;
};

export type PortableSection =
  | "zones"
  | "templates"
  | "settings"
  | "preconditioning_learning"
  | "profiles"
  | "modes";

export type VelairPortablePayload = {
  format?: string;
  model_version?: number;
  temperature_unit?: "°C" | "°F";
  exported_at?: string;
  sections?: Partial<Record<PortableSection, unknown>>;
};

export type EntityDiagnostic = {
  messages: string[];
  status: "ok" | "warning" | "error";
  tooltip: string;
};

export type NormalizedBlocks =
  | {
      ok: true;
      blocks: ScheduleBlock[];
    }
  | {
      ok: false;
      error: string;
    };

export type BlockDraftSource = "schedule" | "template";
