import { html, type TemplateResult } from "lit";

/**
 * Persistence-neutral weekly editor shell.
 *
 * Default schedules and Profile schedules intentionally provide different
 * adapters: Default saves one day immediately, while a Profile keeps every
 * edited day in one atomic Profile draft. The visible editing sequence stays
 * shared so capabilities and responsive layout cannot drift apart again.
 */
export type WeeklyScheduleEditorSections = {
  dayTabs: TemplateResult;
  timeline: TemplateResult;
  templatePanel: TemplateResult;
  blockList: TemplateResult;
  primaryActions?: TemplateResult;
  copyPanels: TemplateResult;
  configureHeading: string;
  helper: string;
};

export function renderWeeklyScheduleEditor(sections: WeeklyScheduleEditorSections) {
  return html`
    ${sections.dayTabs}
    <div class="schedule-step-heading"><strong>${sections.configureHeading}</strong></div>
    <div class="editor">
      ${sections.timeline}
      <div class="schedule-config-helper">${sections.helper}</div>
      <div class="schedule-config-row">${sections.templatePanel}</div>
      ${sections.blockList}
      ${sections.primaryActions}
      ${sections.copyPanels}
    </div>
  `;
}
