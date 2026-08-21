import { html, nothing } from "lit";
import { repeat } from "lit/directives/repeat.js";
import type { VelairViewHost } from "../host-types";

type NoticeViewHost = VelairViewHost;

export interface NoticeStackEntry {
  id: string;
  type: "error" | "success";
  message: string;
  phase?: "entering" | "active" | "leaving";
}

export function renderContextualNoticeStack(entries: NoticeStackEntry[]) {
  return html`
    <div class="notice-stack contextual" aria-live="polite" aria-relevant="additions text">
      ${repeat(entries, (entry) => entry.id, (entry) => renderNoticeRow(undefined, entry, true))}
    </div>
  `;
}

export function renderNoticeStack(
  host: NoticeViewHost,
  entries: readonly NoticeStackEntry[],
) {
  if (!entries.length) return nothing;
  return html`
    <div class="notice-stack floating">
      ${repeat(entries, (entry) => entry.id, (entry) => renderNoticeRow(host, entry, false))}
    </div>
  `;
}

function renderNoticeRow(host: NoticeViewHost | undefined, entry: NoticeStackEntry, contextual: boolean) {
  return html`
    <div class=${`notice-row ${entry.phase ?? "active"}`} data-notice-id=${entry.id}>
      <div
        class=${`notice ${entry.type}`}
        role=${contextual ? nothing : entry.type === "error" ? "alert" : "status"}
      >
        <span>${entry.message}</span>
        ${contextual || !host ? nothing : html`
          <button class="notice-close" type="button" title=${host._t("dismiss")} @click=${() => host._dismissNotice(entry.type)}>
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        `}
        ${!contextual && host && entry.type === "success"
          ? html`
              <div class="notice-progress-track">
                <div class="notice-progress-fill" style=${`width: ${entry.phase === "leaving" ? 0 : host._successNoticeProgress()}%;`}></div>
              </div>
            `
          : nothing}
      </div>
    </div>
  `;
}
