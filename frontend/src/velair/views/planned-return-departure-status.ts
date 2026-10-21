import { css, html, nothing } from "lit";
import type { PlannedReturnStatus } from "../types";
import type { TranslationKey } from "../translations";
import { renderInlineHelp } from "./inline-help";

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;

function presenceReturnEnabled(status: PlannedReturnStatus) {
  return status.awaiting_departure_confirmation !== true && status.episode_active !== false
    && Boolean(status.sources?.length) && ["away", "preparing"].includes(status.state);
}

export function plannedReturnPhaseHelp(status: PlannedReturnStatus, t: Translate) {
  const blocks = [t(["away", "preparing"].includes(status.state)
    ? "plannedReturnActiveControlHelp" : `plannedReturnStateHelp_${status.state}` as TranslationKey)];
  if (presenceReturnEnabled(status)) blocks.push(t("plannedReturnPresenceReturnEnabledHelp"));
  return blocks;
}

/** Departure monitoring is independent of Away delivery and room preparation. */
export function renderPlannedReturnDepartureStatus(
  status: PlannedReturnStatus,
  t: Translate,
  formatTime: (instant: string) => string,
) {
  if (status.awaiting_departure_confirmation !== true || status.episode_active === false
    || !["away", "preparing"].includes(status.state)) return nothing;
  const deadline = status.absence_confirm_at;
  const validDeadline = deadline && /(?:Z|[+-]\d{2}:\d{2})$/.test(deadline) && Number.isFinite(Date.parse(deadline));
  const text = t(validDeadline ? "plannedReturnDepartureConfirming" : "plannedReturnDepartureWaiting");
  return html`<div class="return-departure-confirmation" role="status">
    <span class="return-departure-copy">${text}${validDeadline ? html` · <time datetime=${deadline}>${t("plannedReturnCheckingUntil", { time: formatTime(deadline) })}</time>` : nothing}</span>
    ${renderInlineHelp("return-departure-confirmation", t("plannedReturnDepartureConfirmation"),
      t("plannedReturnManualAwayWaitingHelp"))}
  </div>`;
}

/** Keep existing endpoint labels, explaining application time separately from presence. */
export function plannedReturnDepartureHelp(status: PlannedReturnStatus, t: Translate, includePresenceReturn = false) {
  const blocks = [t("plannedReturnTimelineStartMeaningHelp")];
  if (includePresenceReturn && presenceReturnEnabled(status)) blocks.push(t("plannedReturnPresenceReturnEnabledHelp"));
  return blocks;
}

export const plannedReturnDepartureStatusStyles = css`
  .return-departure-confirmation {
    align-items: center; color: var(--secondary-text-color); display: grid;
    gap: 2px 6px; grid-template-columns: minmax(0, 1fr) 32px;
    min-width: 0; font-size: 12px; line-height: 1.4;
  }
  .return-departure-copy { min-width: 0; overflow-wrap: anywhere; }
`;
