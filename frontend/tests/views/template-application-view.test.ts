// @vitest-environment jsdom
import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import { renderTemplateApplication } from "../../src/velair/views/template-application-view";
import { newTemplateApplication, reviewApplication } from "../../src/velair/controllers/template-application";
import type { VelairViewHost } from "../../src/velair/host-types";
const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const template = { key: "daily", name: "Daily", blocks: [{ start: "08:00", slot_id: "a", action: "turn_off" as const }] };
function fixture() {
 const preview = { configuration_revision: 1, can_apply: true, groups: [], warnings: [], errors: [] };
 const state = { _templateApplyOpen: true, _templateApplication: newTemplateApplication(), _templateApplyTargets: new Set<string>(),
  _data: { configured_entities: ["climate.room"], configuration_revision: 1, profiles: [{ key: "default", name: "Default profile" }] },
  _selectedTemplateKey: "daily", _templateDraftBlocks: template.blocks, _templateDirty: false,
  _orderedWeekdays: () => weekdays, _shortWeekdayName: (day: string) => day, _weekdayName: (day: string) => day,
  _visibleZoneIds: (entities: string[]) => entities, _friendlyEntityName: (entity: string) => entity,
  _templateLabel: () => "Daily", _t: (key: string) => key, _scheduleTemplates: () => [template],
  _templateApplyTargetKey: (entity: string, day: string) => `${entity}::${day}`, _toggleTemplateApplyTarget: vi.fn(),
  _formatScheduleTime: (time: string) => time, _temperatureError: () => undefined, _temperatureLimits: () => [7, 35], _temperatureStep: () => 0.5,
  _temperatureUnit: () => "C", _hvacModeOptions: () => ["cool", "off"], _fanModeOptions: () => [], _presetModeOptions: () => [], _swingModeOptions: () => [], _swingHorizontalModeOptions: () => [], _humidityLimits: () => undefined,
  _modeLabel: (mode: string) => mode, _formatTemperature: (temperature: number) => String(temperature),
  _api: () => ({ previewTemplateApplication: vi.fn().mockResolvedValue(preview) }), _applyTemplateToTargets: vi.fn(),
 } as unknown as VelairViewHost;
 return { state, preview, container: document.createElement("div") };
}
describe("template application panel", () => {
 it("offers Default and Profiles without a reserved-key collision", () => {
  const { state, container } = fixture(); render(renderTemplateApplication(state, template), container);
  const select = container.querySelector("select")!; expect([...select.options].map(option => option.value)).toEqual(["default", "profile:default"]);
 });
 it("uses shared dropdown controls and one aligned day heading per column", () => {
  const { state, container } = fixture(); state._data!.configured_entities.push('climate.office'); render(renderTemplateApplication(state, template), container);
  expect(container.querySelectorAll('.template-application-controls .select-wrap select')).toHaveLength(3);
  expect([...container.querySelectorAll('.template-application-group-head th:not(:first-child)')].map(el => el.textContent)).toEqual(weekdays);
  expect(container.querySelectorAll('.template-application-choices input[aria-label]')).toHaveLength(14);
  expect(container.querySelector('.template-application-targets[role="region"][tabindex="0"]')).not.toBeNull();
  expect(container.querySelectorAll('thead th[scope="col"]')).toHaveLength(8);
  expect(container.querySelectorAll('tbody th[scope="row"]')).toHaveLength(2);
  for (const row of container.querySelectorAll('tbody tr')) {
   expect(row.querySelectorAll('td')).toHaveLength(7);
   expect(row.querySelectorAll('td span')).toHaveLength(0);
  }
  const checkbox = container.querySelector<HTMLInputElement>('.template-application-choices input')!;
  checkbox.checked = true; checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  expect(state._toggleTemplateApplyTarget).toHaveBeenCalledWith('climate.room', 'monday', true);
 });
 it("separates review context, warnings and destination cards and keeps Back functional", async () => {
  const { state, container } = fixture(); state._templateApplyTargets.add('climate.room::monday');
  await reviewApplication(state);
  state._templateApplication!.preview!.warnings = [{ entity_id: 'climate.room', message: 'Check other days' }];
  state._templateApplication!.preview!.groups = [{ entity_id: 'climate.room', weekdays: ['monday'], layout_before: 'individual', requires_base: false, alternatives: [], proposals: [], pending: [], errors: [], replacements: [] }];
  render(renderTemplateApplication(state, template), container);
  expect(container.querySelectorAll('.application-summary dt')).toHaveLength(3);
  expect(container.querySelector('.application-notice[role="status"]')?.textContent).toContain('Check other days');
  expect(container.querySelector('.application-group-heading strong')?.textContent).toContain('climate.room');
  expect(container.querySelector('.application-days')?.textContent).toContain('monday');
  expect(container.querySelector('.application-layout-change')).toBeNull();
  const back = container.querySelector<HTMLButtonElement>('.template-application-footer .command-button.secondary')!;
  back.click();
  expect(state._templateApplication!.preview).toBeUndefined();
  expect(state._templateApplyTargets.has('climate.room::monday')).toBe(true);
 });
 it.each([["individual", 7], ["weekdays_weekend", 2], ["all", 1]])("renders %s grouped selections", (layout, count) => {
  const { state, container } = fixture(); state._templateApplication!.layout = layout; render(renderTemplateApplication(state, template), container);
  expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(count);
 });
 it.each(['individual', 'weekdays_weekend', 'all'])("toggles a complete %s column from a partial selection without touching other targets", (layout) => {
  const { state, container } = fixture();
  state._templateApplication!.layout = layout;
  state._data!.configured_entities.push('climate.office', 'climate.hidden');
  state._visibleZoneIds = entities => entities.filter(entity => entity !== 'climate.hidden');
  state._orderedWeekdays = () => ['sunday', ...weekdays.slice(0, 6)];
  const representative = layout === 'individual' ? 'sunday' : layout === 'weekdays_weekend' ? 'saturday' : 'monday';
  state._templateApplyTargets.add(`climate.room::${representative}`);
  state._templateApplyTargets.add('climate.hidden::tuesday');
  state._toggleTemplateApplyTarget = vi.fn((entity, day, checked) => {
   const key = `${entity}::${day}`;
   if (checked) state._templateApplyTargets.add(key); else state._templateApplyTargets.delete(key);
  });
  render(renderTemplateApplication(state, template), container);
  let header = container.querySelector<HTMLButtonElement>('.application-column-toggle')!;
  expect(header.getAttribute('aria-pressed')).toBe('mixed');
  header.click();
  expect(state._templateApplyTargets).toEqual(new Set([`climate.room::${representative}`, `climate.office::${representative}`, 'climate.hidden::tuesday']));
  render(renderTemplateApplication(state, template), container);
  header = container.querySelector<HTMLButtonElement>('.application-column-toggle')!;
  expect(header.getAttribute('aria-pressed')).toBe('true');
  header.click();
  expect(state._templateApplyTargets).toEqual(new Set(['climate.hidden::tuesday']));
  render(renderTemplateApplication(state, template), container);
  expect(container.querySelector('.application-column-toggle')?.getAttribute('aria-pressed')).toBe('false');
 });
 it.each([true, false])('disables column selection while applying or without visible rows (applying: %s)', (applying) => {
  const { state, container } = fixture();
  state._applyingTemplateTargets = applying;
  if (!applying) state._visibleZoneIds = () => [];
  render(renderTemplateApplication(state, template), container);
  const header = container.querySelector<HTMLButtonElement>('.application-column-toggle')!;
  expect(header.disabled).toBe(true);
  header.click();
  expect(state._toggleTemplateApplyTarget).not.toHaveBeenCalled();
 });
 it("respects Sunday-first display order for individual days", () => {
  const { state, container } = fixture(); state._orderedWeekdays = () => ["sunday", ...weekdays.slice(0, 6)];
  render(renderTemplateApplication(state, template), container); expect(container.querySelector('input[type="checkbox"]')?.getAttribute("aria-label")).toContain("sunday");
 });
 it("clears targets when selecting a different layout", () => {
  const { state, container } = fixture(); state._templateApplyTargets.add("climate.room::monday"); render(renderTemplateApplication(state, template), container);
  const select = container.querySelectorAll("select")[2]; select.value = "all"; select.dispatchEvent(new Event("change", { bubbles: true }));
  expect(state._templateApplyTargets.size).toBe(0); expect(state._templateApplication!.layout).toBe("all");
 });
 it("preserves selected cells when switching between Default and Profiles", () => {
  const { state, container } = fixture();
  state._templateApplyTargets = new Set(['climate.room::monday', 'climate.room::friday']);
  const selected = new Set(state._templateApplyTargets);
  for (const destination of ['profile:default', 'default']) {
   render(renderTemplateApplication(state, template), container);
   const select = container.querySelectorAll('select')[0];
   select.value = destination; select.dispatchEvent(new Event('change', { bubbles: true }));
   expect(state._templateApplyTargets).toEqual(selected);
   expect(state._templateApplication!.source).toBe(destination === 'default' ? 'default' : 'profile');
   expect(state._templateApplication!.profileKey).toBe(destination === 'default' ? undefined : 'default');
   expect(state._templateApplication!.preview).toBeUndefined();
   render(renderTemplateApplication(state, template), container);
   expect(container.querySelectorAll('tbody input:checked')).toHaveLength(2);
  }
 });
 it("preserves selected cells through every application method", () => {
  const { state, container } = fixture();
  state._templateApplyTargets = new Set(['climate.room::monday', 'climate.room::friday']);
  const selected = new Set(state._templateApplyTargets);
  for (const mode of ['hours', 'full', 'copy']) {
   render(renderTemplateApplication(state, template), container);
   const select = container.querySelectorAll('select')[1];
   select.value = mode; select.dispatchEvent(new Event('change', { bubbles: true }));
   expect(state._templateApplyTargets).toEqual(selected);
   expect(state._templateApplication!.mode).toBe(mode);
   render(renderTemplateApplication(state, template), container);
   expect(container.querySelectorAll('tbody input:checked')).toHaveLength(2);
  }
 });
 it("blocks review with unsaved template changes", () => {
  const { state, container } = fixture(); state._templateDirty = true; state._templateApplyTargets.add("climate.room::monday");
  render(renderTemplateApplication(state, template), container); expect(container.textContent).toContain("templateApplicationSaveFirst"); expect(container.querySelector<HTMLButtonElement>(".template-application-footer button")!.disabled).toBe(true);
 });
 it("shows review effects and disables Apply after configuration changes", async () => {
  const { state, container, preview } = fixture(); state._templateApplyTargets.add("climate.room::monday");
  preview.warnings.push({ message: "Unselected weekend stays different" } as never); await reviewApplication(state);
  state._data!.configuration_revision = 2; render(renderTemplateApplication(state, template), container);
  expect(container.textContent).toContain("Unselected weekend stays different"); expect(container.textContent).toContain("templateApplicationReviewAgain");
  expect(container.querySelector<HTMLButtonElement>(".template-application-footer .success")!.disabled).toBe(true);
 });
 it("renders editable missing bindings with fixed template times", () => {
  const { state, container } = fixture(); state._templateApplication!.mode = "hours";
  state._templateApplication!.preview = { configuration_revision: 1, can_apply: false, warnings: [], errors: [], groups: [{ entity_id: "climate.room", weekdays: ["monday"], requires_base: false, alternatives: [], proposals: [{ slot_id: "a", start: "08:00" }], pending: [{ slot_id: "a", message: "Choose settings" }], errors: [], replacements: [] }] };
  render(renderTemplateApplication(state, template), container);
  expect(container.querySelectorAll(".template-assignment-slot")).toHaveLength(1);
  expect(container.querySelector<HTMLInputElement>('input[type="time"]')!.disabled).toBe(true);
  expect(container.textContent).toContain("Choose settings"); expect(container.querySelector('input[type="number"]')).not.toBeNull();
 });
 it("uses the existing different schedules comparison and keeps selected bases visible", () => {
  const { state, container } = fixture(); state._templateApplication!.mode = "hours";
  state._templateApplication!.preview = { configuration_revision: 1, can_apply: true, warnings: [], errors: [], groups: [{ entity_id: "climate.room", weekdays: ["monday", "tuesday"], base_weekday: "tuesday", requires_base: false, alternatives: [{ weekday: "monday", weekdays: ["monday"], blocks: [{ start: "08:00", action: "set_temperature", temperature: 20, hvac_mode: "cool" }] }, { weekday: "tuesday", weekdays: ["tuesday"], blocks: [{ start: "08:00", action: "set_temperature", temperature: 20, hvac_mode: "heat" }] }], proposals: [], pending: [], errors: [], replacements: [] }] };
  render(renderTemplateApplication(state, template), container);
  expect(container.querySelectorAll('[role="radio"]')).toHaveLength(2);
  expect(container.querySelector('[role="radio"][aria-checked="true"]')?.getAttribute("aria-label")).toContain("tuesday");
  expect(container.textContent).toContain("cool"); expect(container.textContent).toContain("heat");
 });

 it("scopes binding input IDs across groups and source editor", () => {
  const { state, container } = fixture(); state._templateApplication!.mode = "hours";
  const group = { entity_id: "climate.room", weekdays: ["monday"], requires_base: false, alternatives: [], proposals: [{ slot_id: "a", start: "08:00", binding: { action: "set_temperature" as const, temperature: 20 } }], pending: [], errors: [], replacements: [] };
  state._templateApplication!.preview = { configuration_revision: 1, can_apply: true, warnings: [], errors: [], groups: [group, { ...group, weekdays: ["tuesday"] }] };
  render(renderTemplateApplication(state, template), container);
  const ids = [...container.querySelectorAll("[id]")].map(element => element.id);
  expect(new Set(ids).size).toBe(ids.length); expect(ids.every(id => id.includes("application"))).toBe(true);
 });

});
