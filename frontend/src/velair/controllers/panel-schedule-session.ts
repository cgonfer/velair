import { VelairApiClient } from "../api/client";
import type { HassConnection, HomeAssistant, ScheduleResponse } from "../types";

export type PanelScheduleState = {
  data?: ScheduleResponse;
  loading: boolean;
  error?: string;
};

// A late editor reply must stay stale even if that editor joins another session.
const staleResponses = new WeakSet<ScheduleResponse>();
const responseSessions = new WeakMap<ScheduleResponse, { session: PanelScheduleSession; generation: number }>();
const facadeConnections = new WeakMap<HassConnection, HassConnection>();

/** Accept our public HA facade without treating it as a different connection. */
export function rawScheduleHass(hass: HomeAssistant): HomeAssistant {
  const connection = facadeConnections.get(hass.connection);
  return connection ? { ...hass, connection } : hass;
}

export function isScheduleResponseCurrent(session: PanelScheduleSession | undefined, data: ScheduleResponse): boolean {
  const origin = responseSessions.get(data);
  return origin === undefined || origin.session === session && origin.generation === session?.generation;
}

/** Shared backend data lifecycle. Panels own one; Lovelace uses a connection registry. */
export class PanelScheduleSession {
  private _hass?: HomeAssistant;
  private _connection?: HassConnection;
  private _facade?: HassConnection;
  private _generation = 0;
  private _streamGeneration = 0;
  private _sequence = 0;
  private _active = false;
  private _unsubscribe?: () => Promise<void> | void;
  private _subscribing = false;
  private _refresh?: Promise<void>;
  private _refreshAgain = false;
  private _listeners = new Set<(state: PanelScheduleState) => void>();
  private _lastInvalidation?: object;
  private _inputRevision = 0;
  private _preconditioningRefreshTimer?: ReturnType<typeof setTimeout>;
  private _state: PanelScheduleState = { loading: false };
  private _removeConnectionListeners?: () => void;

  public get state(): PanelScheduleState { return this._state; }
  public get generation(): number { return this._generation; }

  public attach(listener: (state: PanelScheduleState) => void): () => void {
    this._listeners.add(listener);
    listener(this._state);
    return () => this._listeners.delete(listener);
  }

  public connect(hass?: HomeAssistant): void {
    this._active = true;
    this.setHass(hass);
  }

  public setHass(hass?: HomeAssistant): void {
    hass = hass && rawScheduleHass(hass);
    this._hass = hass;
    if (!this._active || this._connection === hass?.connection) return;
    this._stop();
    this._connection = hass?.connection;
    this._facade = undefined;
    this._state = { loading: false };
    this._notify();
    if (!hass) return;
    // HA restores subscribeMessage subscriptions on ready; refresh the snapshot
    // as well, without opening a second subscription on the same connection.
    const connection = hass.connection as HassConnection & {
      addEventListener?: (type: string, listener: () => void) => void;
      removeEventListener?: (type: string, listener: () => void) => void;
    };
    if (connection.addEventListener && connection.removeEventListener) {
      const disconnected = () => {
        this._generation++;
        this._refresh = undefined;
        this._refreshAgain = false;
        this._set({ loading: false });
      };
      const ready = () => {
        void this.refresh();
        if (!this._unsubscribe && !this._subscribing) void this._subscribe(connection);
      };
      connection.addEventListener("disconnected", disconnected);
      connection.addEventListener("ready", ready);
      this._removeConnectionListeners = () => {
        connection.removeEventListener!("disconnected", disconnected);
        connection.removeEventListener!("ready", ready);
      };
    }
    void this.refresh();
    void this._subscribe(hass.connection);
  }

  /** Track responses from all nested editors, including a save finishing after navigation. */
  public hassFor(hass?: HomeAssistant): HomeAssistant | undefined {
    hass = hass && rawScheduleHass(hass);
    if (!hass || !this._connection) return hass;
    if (!this._facade) {
      const connection = this._connection;
      const sendMessagePromise = async <T>(message: Record<string, unknown>): Promise<T> => {
          const generation = this._generation;
          const sequence = this._sequence;
          const response = await connection.sendMessagePromise<T>(message);
          if (response && typeof response === "object" && "configured_entities" in response && "zones" in response) {
            const data = response as unknown as ScheduleResponse;
            responseSessions.set(data, { session: this, generation });
            if (!this._current(connection, generation) || sequence !== this._sequence) {
              staleResponses.add(data);
              // A runtime push may precede a successful save. Fetch the latest
              // backend state rather than losing that save's confirmed changes.
              if (this._current(connection, generation) && message.type !== "velair/get_schedule") void this.refresh(data);
            } else this.publish(data);
          }
          return response;
        };
      // HA controls also consume connection methods beyond Velair's API type.
      // Forward the complete connection and preserve each method's receiver.
      this._facade = new Proxy(connection, {
        get(target, key) {
          if (key === "sendMessagePromise") return sendMessagePromise;
          const value = Reflect.get(target, key, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      facadeConnections.set(this._facade, connection);
    }
    return { ...hass, connection: this._facade };
  }

  public publish(data: ScheduleResponse): ScheduleResponse | undefined {
    const origin = responseSessions.get(data);
    if (!this._active || origin && (origin.session !== this || origin.generation !== this._generation)) return undefined;
    if (staleResponses.has(data)) return this._state.data;
    if (data !== this._state.data) {
      this._sequence++;
      this._set({ data, loading: false, error: undefined });
    }
    return this._state.data;
  }

  public refresh(invalidation?: object): Promise<void> {
    const changedInput = invalidation !== undefined && invalidation !== this._lastInvalidation;
    if (invalidation) this._lastInvalidation = invalidation;
    if (changedInput) this._inputRevision++;
    if (this._refresh) {
      if (changedInput) this._refreshAgain = true;
      return this._refresh;
    }
    const hass = this._hass;
    if (!this._active || !hass) return Promise.resolve();
    const generation = this._generation;
    const connection = hass.connection;
    const sequence = this._sequence;
    const inputRevision = this._inputRevision;
    this._set({ loading: true, error: undefined });
    // Preserve immediate dispatch, while catching synchronous transport errors.
    const fetchSchedule = async () => new VelairApiClient(hass).getSchedule();
    const request = fetchSchedule().then((data) => {
      if (!data || typeof data !== "object") throw new Error("Invalid schedule response");
      if (this._current(connection, generation) && sequence === this._sequence && inputRevision === this._inputRevision) this.publish(data);
    }).catch((error: unknown) => {
      if (this._current(connection, generation) && sequence === this._sequence && inputRevision === this._inputRevision) this._set({ error: error instanceof Error ? error.message : String(error) });
    }).finally(() => {
      if (!this._current(connection, generation)) return;
      this._refresh = undefined;
      this._set({ loading: false });
      if (this._refreshAgain) { this._refreshAgain = false; return this.refresh(); }
    });
    this._refresh = request;
    return request;
  }

  /** Debounce once for all cards, including updates during an active request. */
  public schedulePreconditioningRefresh(): void {
    if (!this._active || this._preconditioningRefreshTimer !== undefined) return;
    this._preconditioningRefreshTimer = setTimeout(() => {
      this._preconditioningRefreshTimer = undefined;
      void this.refresh({});
    }, 1200);
  }

  private async _subscribe(connection: HassConnection): Promise<void> {
    this._subscribing = true;
    const streamGeneration = this._streamGeneration;
    const current = () => this._active && this._connection === connection && streamGeneration === this._streamGeneration;
    // Connection identity handles stream continuity across HA's own reconnect.
    try {
      const unsubscribe = await connection.subscribeMessage<{ loaded: boolean; schedule?: ScheduleResponse }>((message) => {
        if (!current()) return;
        if (message.loaded && message.schedule) this.publish(message.schedule);
        else void this.refresh({});
      }, { type: "velair/subscribe_updates" });
      if (!current()) await unsubscribe();
      else this._unsubscribe = unsubscribe;
    } catch (error) {
      if (current()) this._set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      if (current()) this._subscribing = false;
    }
  }

  public disconnect(): void {
    this._active = false;
    this._stop();
    this._connection = undefined;
    this._facade = undefined;
    this._state = { loading: false };
    this._notify();
  }

  private _stop(): void {
    this._generation++;
    this._streamGeneration++;
    this._subscribing = false;
    this._refresh = undefined;
    this._refreshAgain = false;
    this._lastInvalidation = undefined;
    if (this._preconditioningRefreshTimer !== undefined) clearTimeout(this._preconditioningRefreshTimer);
    this._preconditioningRefreshTimer = undefined;
    this._removeConnectionListeners?.();
    this._removeConnectionListeners = undefined;
    const unsubscribe = this._unsubscribe;
    this._unsubscribe = undefined;
    if (unsubscribe) void Promise.resolve().then(unsubscribe).catch(() => undefined);
  }

  private _current(connection: HassConnection, generation: number): boolean {
    return this._active && this._connection === connection && this._generation === generation;
  }
  private _set(state: Partial<PanelScheduleState>): void { this._state = { ...this._state, ...state }; this._notify(); }
  private _notify(): void { for (const listener of this._listeners) listener(this._state); }
}
