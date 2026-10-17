import { renderInlineHelp } from "./inline-help";
import { renderOverviewTimelineGraphic, overviewTimelineGraphicClasses, type TimelineGraphic } from "./timeline-block-graphic";
import { timelineBlocksFromScheduleBlocks } from "../domain/timeline";
import type { ScheduleBlock } from "../types";
import { html, nothing } from "lit";
import type { TranslationKey } from "../translations";
import { BUILTIN_DAY_LAYOUTS, resolveDayLayout, selectedDayGroup, groupScheduleCandidates, schedulePresentationFingerprint, dayGroupLabel } from "../domain/day-layouts";

type LayoutHost = { _t(key: TranslationKey, values?: Record<string, string | number>): string };
const conflictIds = new WeakMap<object, number>();
let nextConflictId = 0;
type DayTabsHost = LayoutHost & { _weekdayName(day: string): string; _shortWeekdayName(day: string): string };

export function cloneThermostatsLabel(host: Pick<DayTabsHost, "_t" | "_weekdayName">, layoutKey: string | undefined, weekday: string): string {
  const days = selectedDayGroup(layoutKey, weekday);
  return days.length === 1 ? host._t("cloneDayToThermostats")
    : host._t("cloneDayGroupToThermostats", { days: dayGroupLabel(days, day => host._weekdayName(day), host._t("allDays")) });
}

export function renderDayLayoutControls(host: LayoutHost, options: { key: string; disabled?: boolean; onChange(key: string): boolean | void }) {
  const key = resolveDayLayout(options.key).layout.key;
  return html`<div class="day-layout-controls"><label><span class="label">${host._t("dayLayout")}</span><span class="select-wrap">
    <select aria-label=${host._t("dayLayout")} .value=${key} ?disabled=${Boolean(options.disabled)}
      @change=${(event: Event) => { const select = event.currentTarget as HTMLSelectElement; if (options.onChange(select.value) === false) select.value = key; }}>
      ${BUILTIN_DAY_LAYOUTS.map((layout) => html`<option value=${layout.key} .selected=${key === layout.key}>${host._t(layout.name as TranslationKey)}</option>`)}
    </select></span></label></div>`;
}

/** Keep the configured seven-day order; grouping changes selection membership only. */
export function renderScheduleDayTabs(host: DayTabsHost, options: {
  layoutKey?: string; disabled?: boolean; selectedDay: string; orderedWeekdays: string[];
  onSelect(day: string): void; blockCount(day: string): number; isDirty?(day: string): boolean;
}) {
  const key = resolveDayLayout(options.layoutKey).layout.key;
  const grouped = key !== "individual";
  const selected = new Set(selectedDayGroup(key, options.selectedDay));
  return html`<div class=${grouped ? "day-tabs grouped-day-tabs" : "day-tabs"}>
    ${options.orderedWeekdays.map((day, index, ordered) => {
      const active = selected.has(day);
      const dirty = options.isDirty?.(day);
      const previous = grouped && active && index > 0 && selected.has(ordered[index - 1]);
      const next = grouped && active && index < ordered.length - 1 && selected.has(ordered[index + 1]);
      const days = selectedDayGroup(key, day);
      const accessibleName = grouped ? `${host._weekdayName(day)}: ${days.map((item) => host._weekdayName(item)).join(", ")}` : host._weekdayName(day);
      return html`<button type="button" data-weekday=${day} ?disabled=${Boolean(options.disabled)}
        class=${["day-tab", active ? "active" : "", dirty ? "dirty" : "", previous ? "joined-previous" : "", next ? "joined-next" : ""].filter(Boolean).join(" ")}
        title=${host._weekdayName(day)} aria-label=${`${accessibleName}${dirty ? `, ${host._t("unsaved")}` : ""}`} aria-pressed=${String(active)}
        @click=${() => { if (!active) options.onSelect(day); }}>
        <span>${host._shortWeekdayName(day)}</span><strong>${options.blockCount(day)}</strong>
      </button>`;
    })}
  </div>`;
}

export function renderGroupSaveSummary(host: LayoutHost & { _weekdayName(day: string): string }, options: { sourceDay: string; days: string[]; zoneName?: string }) {
  return html`<p class="group-save-summary">${options.zoneName ? html`<strong>${options.zoneName}</strong><span aria-hidden="true"> · </span>` : nothing}${host._t("dayGroupApplySummary", { source: host._weekdayName(options.sourceDay), days: dayGroupLabel(options.days, day => host._weekdayName(day), host._t("allDays")) })}</p>`;
}

export type ConflictPreviewBlock = { start: string; time: string; description: string; details?: string[]; presetLabel?: string; graphic?: TimelineGraphic; block?: ScheduleBlock };

/** Read-only candidates: comparison never edits a draft or adds inherited blocks. */
export function renderDayScheduleConflict(host: DayTabsHost, options: {
  days: string[]; selectedDay?: string; disabled?: boolean; help?: string; fingerprint(day: string): string; blockCount(day: string): number; linkLabel?(day: string): string | undefined;
  blocks(day: string): ConflictPreviewBlock[]; emptyMessage?(day: string): string | undefined;
  onChoose(day: string): boolean | void;
}) {
  if (!conflictIds.has(host)) conflictIds.set(host, ++nextConflictId);
  const groupId = `velair-day-conflict-${conflictIds.get(host)}`;
  const candidates = groupScheduleCandidates(options.days, options.fingerprint);
  const previews = new Map(candidates.map(({ sourceDay }) => [sourceDay, options.blocks(sourceDay)]));
  const visualSignatures = new Map(candidates.map(({ sourceDay }) => {
    const blocks = previews.get(sourceDay)!;
    return [sourceDay, schedulePresentationFingerprint(blocks.every(item => item.block) && !options.emptyMessage?.(sourceDay) ? blocks.map(item => item.block!) : undefined)];
  }));
  return html`<section class="day-conflict-list" role="radiogroup" aria-label=${host._t("differentSchedules")}>
    <div class="day-conflict-heading"><strong>${host._t("differentSchedules")}</strong><p>${options.help ?? host._t("dayGroupConflictHelp")}</p></div>
    ${candidates.map(({ sourceDay, days }, candidateIndex) => {
      const selected = options.selectedDay !== undefined && days.includes(options.selectedDay);
      const selectedIndex = candidates.findIndex((candidate) => candidate.days.includes(options.selectedDay ?? ""));
      const blocks = previews.get(sourceDay)!;
      const dayNames = days.map((day) => host._weekdayName(day)).join(", ");
      const unavailable = blocks.length === 0 ? options.emptyMessage?.(sourceDay) : undefined;
      const signature = visualSignatures.get(sourceDay);
      const similar = signature !== undefined && candidates.some(candidate => candidate.sourceDay !== sourceDay && visualSignatures.get(candidate.sourceDay) === signature);
      const presetLabels = [...new Set(blocks.map(item => item.presetLabel ?? item.graphic?.presetKey).filter(Boolean))];
      const dependencies = [options.linkLabel?.(sourceDay), presetLabels.length ? `${host._t("velairPreset")}: ${presetLabels.join(", ")}` : undefined].filter(Boolean).join(" · ");
      const timeline = timelineBlocksFromScheduleBlocks(blocks.map((item) => ({ ...item.block, start: item.start })));
      const inspection = [options.linkLabel?.(sourceDay), ...blocks.map(item => `${item.details?.join(" · ") ?? `${item.time} — ${item.description}`}${item.presetLabel || item.graphic?.presetKey ? ` · ${host._t("velairPreset")}: ${item.presetLabel ?? item.graphic?.presetKey}` : ""}`), blocks.length ? undefined : unavailable ?? host._t("dayGroupEmptyHelp")].filter(Boolean) as string[];
      const choose = (element: HTMLElement) => { if (options.disabled) return false; if (selected) return true; const accepted = options.onChoose(sourceDay); if (accepted === false) element.closest(".day-conflict-list")?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus(); return accepted; };
      return html`<article class=${selected ? "day-conflict-row selected" : "day-conflict-row"} aria-label=${dayNames}>
        <div class="day-conflict-choice" role="radio" aria-disabled=${String(Boolean(options.disabled))} aria-checked=${String(selected)} aria-describedby=${`${groupId}-${candidateIndex}-summary ${groupId}-${candidateIndex}-inspection`} aria-label=${`${host._t("chooseDayBase")}: ${dayNames}`} tabindex=${selected || (selectedIndex < 0 && candidateIndex === 0) ? "0" : "-1"}
          @click=${(event: Event) => choose(event.currentTarget as HTMLElement)} @keydown=${(event: KeyboardEvent) => {
            if (options.disabled) { event.preventDefault(); return; }
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(event.currentTarget as HTMLElement); return; }
            const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
            if (!direction) return;
            event.preventDefault(); const next = (candidateIndex + direction + candidates.length) % candidates.length;
            const accepted = options.onChoose(candidates[next].sourceDay);
            const radios = (event.currentTarget as HTMLElement).closest(".day-conflict-list")?.querySelectorAll<HTMLElement>('[role="radio"]'); radios?.[accepted === false ? selectedIndex >= 0 ? selectedIndex : candidateIndex : next]?.focus();
          }}>
        <div class="day-conflict-candidate-header">
          <div class="day-conflict-title"><span class="day-conflict-days">${days.map((day) => html`<span title=${host._weekdayName(day)}>${host._shortWeekdayName(day)}</span>`)}</span>
            ${unavailable || blocks.length === 0 ? nothing : html`<span class="day-conflict-count">${host._t(options.blockCount(sourceDay) === 1 ? "dayGroupBlockSingle" : "dayGroupBlockCount", { count: options.blockCount(sourceDay) })}</span>`}</div>
        </div>
        <div class="day-conflict-summary" id=${`${groupId}-${candidateIndex}-summary`}>
          ${dependencies && (similar || options.linkLabel?.(sourceDay)) ? html`<small class="day-conflict-link">${dependencies}</small>` : similar ? html`<small class="day-conflict-link">${host._t("dayGroupIndependent")}</small>` : nothing}
          ${blocks.length ? html`<div class="day-conflict-preview" role="img" aria-label=${`${host._t("timeline")}: ${dayNames}`}><div class="timeline-hours"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div><div class="overview-timeline-track day-conflict-timeline">
            ${timeline.map((segment) => { const item = blocks[segment.index]; const width = Math.min(segment.width, 100 - segment.left); return html`<div aria-hidden="true" class=${`${overviewTimelineGraphicClasses(item.block, segment.left, width)} overview-timeline-readonly`} style=${`left:${segment.left}%;width:${width}%`} title=${`${item.time} · ${item.description}`}>${renderOverviewTimelineGraphic(item.graphic?.label ?? item.description, item.graphic?.mode)}</div>`; })}
          </div></div>` : html`<span class="day-conflict-empty">${options.emptyMessage?.(sourceDay) ?? host._t("dayGroupNoOwnBlocks")}</span>`}
        </div></div>
          <span class="day-conflict-inspector">${renderInlineHelp(`${groupId}-${candidateIndex}-inspection`, `${host._t("dayGroupDetails")}: ${dayNames}`, inspection)}</span>
      </article>`;
    })}
  </section>`;
}
