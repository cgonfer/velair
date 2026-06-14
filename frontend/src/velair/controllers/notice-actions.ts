import { NOTICE_AUTO_DISMISS_MS } from "../constants";

type NoticeHost = {
  _error?: string;
  _saveMessage?: string;
  _successNoticeStartedAt?: number;
  _successNoticeTick?: number;
  _successNoticeTimeout?: number;
  requestUpdate(): void;
};

export function asNoticeHost(host: unknown): NoticeHost {
  return host as NoticeHost;
}

export function dismissNotice(host: NoticeHost, type: "error" | "success"): void {
  if (type === "error") {
    host._error = undefined;
  }
  if (type === "success") {
    host._saveMessage = undefined;
    clearSuccessNoticeTimer(host);
  }
}

export function showSuccess(host: NoticeHost, message: string): void {
  host._saveMessage = message;
  host._successNoticeStartedAt = Date.now();
  clearSuccessNoticeTimer(host, false);
  host._successNoticeTimeout = window.setTimeout(() => {
    host._saveMessage = undefined;
    clearSuccessNoticeTimer(host);
  }, NOTICE_AUTO_DISMISS_MS);
  host._successNoticeTick = window.setInterval(() => host.requestUpdate(), 1_000);
}

export function successNoticeProgress(host: NoticeHost): number {
  if (!host._successNoticeStartedAt) {
    return 100;
  }

  const elapsed = Date.now() - host._successNoticeStartedAt;
  return Math.max(0, Math.min(100, ((NOTICE_AUTO_DISMISS_MS - elapsed) / NOTICE_AUTO_DISMISS_MS) * 100));
}

export function clearSuccessNoticeTimer(host: NoticeHost, clearStartedAt = true): void {
  if (host._successNoticeTimeout) {
    window.clearTimeout(host._successNoticeTimeout);
    host._successNoticeTimeout = undefined;
  }
  if (host._successNoticeTick) {
    window.clearInterval(host._successNoticeTick);
    host._successNoticeTick = undefined;
  }
  if (clearStartedAt) {
    host._successNoticeStartedAt = undefined;
  }
}
