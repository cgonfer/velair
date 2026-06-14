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

export type VelairPanelView = "overview" | "schedules" | "templates" | "settings";
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

export type ScheduleZone = {
  enabled: boolean;
  schedule: Record<string, ScheduleBlock[]>;
  override?: Record<string, unknown> | null;
};

export type ScheduleEvent = {
  entity_id: string;
  when: string;
  action?: string;
  temperature?: number | null;
  hvac_mode?: string | null;
  weekday: string;
  start: string;
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

export type PortableSection = "zones" | "templates" | "settings";

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
