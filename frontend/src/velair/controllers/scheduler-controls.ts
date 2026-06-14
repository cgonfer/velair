import {
  countdownTickDelay,
  nextCountdownExpirationMs as calculateNextCountdownExpirationMs,
  pauseExpirationMs as calculatePauseExpirationMs,
  pauseProgressPercent as calculatePauseProgressPercent,
  pauseStartedAtMs,
} from "../domain/scheduler-state";
import type { VelairApiClient } from "../api/client";
import type { ScheduleResponse } from "../types";

type SchedulerControlsHost = {
  readonly renderRoot: Element | ShadowRoot;
  _controlAction?: "pause" | "resume";
  _data?: ScheduleResponse;
  _error?: string;
  _nextEventsOpen: boolean;
  _pauseDurationMinutes: number;
  _pauseTick?: number;
  _pauseTickDelay?: number;
  _saveMessage?: string;
  _schedulerMenuOpen: boolean;
  requestUpdate(): void;
  _api(): VelairApiClient | undefined;
  _closeSchedulerMenu(): void;
  _loadSchedule(): Promise<void>;
  _nextCountdownExpirationMs(): number | undefined;
  _showSuccess(message: string): void;
  _stopPauseTick(): void;
  _syncPauseTick(): void;
  _t(key: string): string;
};

type SchedulerControlFeedbackOptions = {
  showSuccess?: boolean;
};

export function asSchedulerControlsHost(host: unknown): SchedulerControlsHost {
  return host as SchedulerControlsHost;
}

export function canResumeScheduler(host: SchedulerControlsHost): boolean {
  return host._data?.global.mode === "paused" || host._data?.operational_status === "paused";
}

export async function pauseScheduler(
  host: SchedulerControlsHost,
  indefinite: boolean,
  options: SchedulerControlFeedbackOptions = {},
): Promise<void> {
  const api = host._api();
  if (!api || host._controlAction) {
    return;
  }

  host._controlAction = "pause";
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    const durationMinutes = Math.max(1, Math.round(host._pauseDurationMinutes || 1));
    await api.pauseScheduler(indefinite ? undefined : durationMinutes);
    if (options.showSuccess !== false) {
      host._showSuccess(host._t("pauseApplied"));
    }
    await host._loadSchedule();
    host._closeSchedulerMenu();
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("unablePause");
  } finally {
    host._controlAction = undefined;
  }
}

export async function resumeScheduler(
  host: SchedulerControlsHost,
  options: SchedulerControlFeedbackOptions = {},
): Promise<void> {
  const api = host._api();
  if (!api || host._controlAction) {
    return;
  }

  host._controlAction = "resume";
  host._error = undefined;
  host._saveMessage = undefined;
  try {
    await api.resumeScheduler();
    if (options.showSuccess !== false) {
      host._showSuccess(host._t("resumed"));
    }
    await host._loadSchedule();
    host._closeSchedulerMenu();
  } catch (error) {
    host._error = error instanceof Error ? error.message : host._t("unableResume");
  } finally {
    host._controlAction = undefined;
  }
}

export function closeSchedulerMenu(host: SchedulerControlsHost): void {
  const menu = host.renderRoot.querySelector(".scheduler-menu");
  if (menu instanceof HTMLDetailsElement) {
    menu.open = false;
  }
  host._schedulerMenuOpen = false;
}

export function handleSchedulerMenuToggle(host: SchedulerControlsHost, event: MouseEvent): void {
  const menu = (event.currentTarget as HTMLElement).closest(".scheduler-menu");
  host._schedulerMenuOpen = menu instanceof HTMLDetailsElement ? !menu.open : !host._schedulerMenuOpen;
}

export function toggleNextEvents(host: SchedulerControlsHost): void {
  host._nextEventsOpen = !host._nextEventsOpen;
}

export function pauseExpirationMs(host: SchedulerControlsHost): number | undefined {
  return calculatePauseExpirationMs(host._data?.global);
}

export function pauseProgressPercent(host: SchedulerControlsHost, expiresAt: number): number {
  return calculatePauseProgressPercent(pauseStartedAtMs(host._data?.global), expiresAt);
}

export function syncPauseTick(host: SchedulerControlsHost): void {
  const nextCountdown = nextCountdownExpirationMs(host);
  if (!nextCountdown || nextCountdown <= Date.now()) {
    host._stopPauseTick();
    return;
  }

  const delay = countdownTickDelay(nextCountdown);
  if (!host._pauseTick || host._pauseTickDelay !== delay) {
    host._stopPauseTick();
    host._pauseTickDelay = delay;
    host._pauseTick = window.setInterval(() => {
      const nextExpiration = host._nextCountdownExpirationMs();
      if (!nextExpiration || nextExpiration <= Date.now()) {
        host._stopPauseTick();
      } else if (host._pauseTickDelay !== countdownTickDelay(nextExpiration)) {
        host._syncPauseTick();
      }
      host.requestUpdate();
    }, delay);
  }
}

export function nextCountdownExpirationMs(host: SchedulerControlsHost): number | undefined {
  return calculateNextCountdownExpirationMs(host._data?.global, host._data?.active_overrides);
}

export function stopPauseTick(host: SchedulerControlsHost): void {
  if (!host._pauseTick) {
    return;
  }

  window.clearInterval(host._pauseTick);
  host._pauseTick = undefined;
  host._pauseTickDelay = undefined;
}
