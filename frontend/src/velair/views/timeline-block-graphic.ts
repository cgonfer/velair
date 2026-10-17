import { html, nothing } from "lit";
import { timelineModeClass } from "../domain/timeline";
import type { ScheduleBlock } from "../types";

export type TimelineGraphic = { label: string; mode?: string; options?: { short: string }[]; presetKey?: string; templateKey?: string };

/** Shared editor typography; interaction belongs to the caller. */
export function renderTimelineGraphic(time: string, presentation: TimelineGraphic) {
  return html`<strong class="timeline-primary-line">${presentation.templateKey ? html`<ha-icon icon="mdi:content-copy" aria-hidden="true"></ha-icon>` : nothing}<span>${time}</span></strong>
    <span class="timeline-primary-line timeline-target">${presentation.presetKey ? html`<ha-icon icon="mdi:link-variant" aria-hidden="true"></ha-icon>` : nothing}<span>${presentation.label}</span></span>
    ${presentation.mode || presentation.options?.length ? html`<small>${[presentation.mode, ...(presentation.options ?? []).map(item => item.short)].filter(Boolean).join(" • ")}</small>` : nothing}`;
}

export function timelineGraphicClasses(block: ScheduleBlock | undefined, width: number) {
  return ["timeline-block", block?.action === "turn_off" ? "off" : "", block ? `mode-${timelineModeClass(block)}` : "unresolved", width < 12 ? "compact" : "", width < 2.5 ? "tiny" : ""].filter(Boolean).join(" ");
}

/** Overview and schedule comparison share the same compact target/mode surface. */
export function renderOverviewTimelineGraphic(label: string, mode?: string) {
  return html`<span class="overview-timeline-block-main"><span>${label}</span>${mode ? html`<small>${mode}</small>` : nothing}</span>`;
}

export function overviewTimelineGraphicClasses(block: ScheduleBlock | undefined, left: number, width: number) {
  return ["overview-timeline-block", block ? `mode-${timelineModeClass(block)}` : "unresolved", left <= 0 ? "overview-timeline-start-edge" : "", width < 12 ? "compact" : "", width < 6 ? "tiny" : ""].filter(Boolean).join(" ");
}
