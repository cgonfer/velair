import { html, nothing } from "lit";
import type { VelairViewHost } from "../host-types";

type NoticeViewHost = VelairViewHost;

export function renderNotice(host: NoticeViewHost, type: "error" | "success", message: string) {
  return html`
    <div class=${`notice ${type}`}>
      <span>${message}</span>
      <button class="notice-close" type="button" title=${host._t("dismiss")} @click=${() => host._dismissNotice(type)}>
        <ha-icon icon="mdi:close"></ha-icon>
      </button>
      ${type === "success"
        ? html`
            <div class="notice-progress-track">
              <div class="notice-progress-fill" style=${`width: ${host._successNoticeProgress()}%;`}></div>
            </div>
          `
        : nothing}
    </div>
  `;
}
