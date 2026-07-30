import { html, nothing } from "lit";
import { OPERATION_SUCCESS_VISIBLE_MS } from "../constants";
import type { VelairViewHost } from "../host-types";
import type { OperationStatus } from "../types";
import type { TranslationKey } from "../translations";

type OperationStatusHost = Pick<
  VelairViewHost,
  "_data" | "_dismissOperationStatus" | "_friendlyEntityName" | "_t"
>;

export const OPERATION_STATUS_DISMISSED_EVENT = "velair-operation-status-dismissed";
let dismissedOperationId: string | undefined;

export function dismissOperationStatusAcrossViews(operationId: string): void {
  dismissedOperationId = operationId;
  window.dispatchEvent(new CustomEvent(OPERATION_STATUS_DISMISSED_EVENT, {
    detail: operationId,
  }));
}

export function operationStatusIsVisible(
  operation: OperationStatus,
  locallyDismissedOperationId?: string,
  now = Date.now(),
): boolean {
  if (
    operation.id === locallyDismissedOperationId
    || operation.id === dismissedOperationId
  ) {
    return false;
  }
  if (
    operation.state === "completed"
    && operation.finished_at
    && Number.isFinite(Date.parse(operation.finished_at))
  ) {
    return now - Date.parse(operation.finished_at) < OPERATION_SUCCESS_VISIBLE_MS;
  }
  return true;
}

export function renderOperationStatus(
  host: OperationStatusHost,
  operation: OperationStatus,
) {
  const total = Math.max(0, operation.total);
  const completed = Math.max(0, Math.min(operation.completed, total));
  const progress = total > 0 ? Math.round((completed / total) * 100) : 100;
  const isAlert = operation.state === "completed_with_errors" || operation.state === "failed";

  return html`
    <section
      class=${`operation-status ${operation.state}`}
      role=${isAlert ? "alert" : "status"}
      aria-live=${isAlert ? "assertive" : "polite"}
      aria-atomic="true"
      data-operation-id=${operation.id}
    >
      <div class="operation-status-icon" aria-hidden="true">
        ${operation.state === "running"
          ? html`<span class="operation-status-spinner"></span>`
          : html`<ha-icon icon=${operationIcon(operation.state)}></ha-icon>`}
      </div>
      <div class="operation-status-copy">
        <strong>${operationTitle(host, operation)}</strong>
        <span>${operationDetails(host, operation, completed, total)}</span>
      </div>
      <div class="operation-status-actions">
        ${total > 0
          ? html`<span class="operation-status-count" aria-hidden="true">${completed}/${total}</span>`
          : nothing}
        ${isAlert
          ? html`
              <button
                class="operation-status-dismiss"
                type="button"
                aria-label=${host._t("operationDismiss")}
                @click=${host._dismissOperationStatus}
              >
                <ha-icon icon="mdi:close"></ha-icon>
              </button>
            `
          : nothing}
      </div>
      ${total > 0
        ? html`
            <div
              class="operation-status-progress"
              role="progressbar"
              aria-label=${host._t("operationProgressLabel")}
              aria-valuemin="0"
              aria-valuemax=${String(total)}
              aria-valuenow=${String(completed)}
            >
              <span style=${`width: ${progress}%`}></span>
            </div>
          `
        : nothing}
    </section>
  `;
}

function operationTitle(
  host: OperationStatusHost,
  operation: OperationStatus,
): string {
  const target = operationTargetLabel(host, operation);
  const suffix = operation.state === "running"
    ? "Running"
    : operation.state === "completed"
      ? "Completed"
      : operation.state === "completed_with_errors"
        ? "Partial"
        : "Failed";

  if (!operation.target_id || operation.target_id === "default") {
    return host._t(`operationDefault${suffix}` as TranslationKey);
  }
  return host._t(
    operation.kind === "mode_change"
      ? `operationMode${suffix}` as TranslationKey
      : `operationProfile${suffix}` as TranslationKey,
    { target },
  );
}

function operationDetails(
  host: OperationStatusHost,
  operation: OperationStatus,
  completed: number,
  total: number,
): string {
  const details = [
    total > 0
      ? host._t("operationProgress", { completed, total })
      : host._t("operationNoZones"),
  ];
  if (operation.state === "running" && operation.current_entity_id) {
    details.push(host._t("operationCurrentZone", {
      zone: host._friendlyEntityName(operation.current_entity_id),
    }));
  }
  if (operation.failed_entity_ids.length > 0) {
    const zones = operation.failed_entity_ids
      .map((entityId) => host._friendlyEntityName(entityId))
      .join(", ");
    details.push(host._t(
      operation.failed_entity_ids.length === 1
        ? "operationFailureOne"
        : "operationFailureCount",
      {
        count: operation.failed_entity_ids.length,
        zones,
      },
    ));
  }
  if (operation.state === "failed") {
    details.push(
      operation.error_code === "cancelled"
        ? host._t("operationCancelled")
        : operation.error_message || host._t("operationFailedHelp"),
    );
  }
  return details.join(" · ");
}

function operationTargetLabel(
  host: OperationStatusHost,
  operation: OperationStatus,
): string {
  if (operation.kind === "mode_change") {
    if (operation.target_id === "default") {
      return host._t("modeDefault");
    }
    if (operation.target_id === "manual") {
      return host._t("modeManual");
    }
    return host._data?.modes?.find((mode) => mode.key === operation.target_id)?.name
      ?? operation.target_id
      ?? host._t("modeLabel");
  }
  return host._data?.profiles?.find((profile) => profile.key === operation.target_id)?.name
    ?? operation.target_id
    ?? host._t("profiles");
}

function operationIcon(state: OperationStatus["state"]): string {
  if (state === "completed") {
    return "mdi:check-circle";
  }
  if (state === "completed_with_errors") {
    return "mdi:alert-circle";
  }
  return "mdi:close-circle";
}
