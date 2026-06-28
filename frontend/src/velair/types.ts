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
    fan_modes?: string[];
    friendly_name?: string;
    hvac_action?: string;
    hvac_modes?: string[];
    humidity?: number;
    max_temp?: number;
    min_temp?: number;
    preset_modes?: string[];
    swing_modes?: string[];
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
    unit_system?: {
      temperature?: string;
    };
  };
  language?: string;
  locale?: {
    language?: string;
  };
  selectedLanguage?: string;
  states?: Record<string, HassState>;
};

export type VelairCardConfig = {
  entities?: string[];
  first_weekday?: string;
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

export type VelairPanelView = "overview" | "schedules" | "templates" | "preconditioning" | "settings";
export type VelairOverviewCardView =
  | "overview-status"
  | "overview-boosts"
  | "overview-events"
  | "overview-timeline"
  | "overview-zones";
export type VelairCardView = VelairPanelView | VelairOverviewCardView;

export type ScheduleBlock = {
  action?: string;
  start: string;
  temperature?: number;
  hvac_mode?: string;
};

export type DraftScheduleBlock = {
  action: string;
  start: string;
  temperature: number | string;
  hvac_mode: string;
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

export type ScheduleZone = {
  enabled: boolean;
  schedule: Record<string, ScheduleBlock[]>;
  override?: Record<string, unknown> | null;
  preconditioning?: PreconditioningSettings;
};

export type ScheduleEvent = {
  entity_id: string;
  when: string;
  action?: string;
  temperature?: number | null;
  hvac_mode?: string | null;
  weekday: string;
  start: string;
  target_when?: string | null;
};

export type PanelSettings = {
  first_weekday: string;
  zone_order: string[];
  min_temperature?: number;
  max_temperature?: number;
  apply_active_schedule_on_startup?: boolean;
};

export type ScheduleResponse = {
  configured_entities: string[];
  global: {
    mode: string;
    paused_started_at?: string | null;
    paused_until?: string | null;
  };
  settings: PanelSettings;
  zones: Record<string, ScheduleZone>;
  operational_status: string;
  next_event: ScheduleEvent | null;
  next_events: ScheduleEvent[];
  active_overrides: Record<string, Record<string, unknown>>;
  preconditioning_learning?: Record<string, PreconditioningLearningSummary>;
  templates?: StoredScheduleTemplate[];
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
  | "preconditioning_learning";

export type VelairPortablePayload = {
  format?: string;
  model_version?: number;
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
