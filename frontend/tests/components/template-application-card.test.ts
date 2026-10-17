// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../src/velair-card";
import type { VelairCard } from "../../src/velair/components/velair-card-element";
import type { HomeAssistant, ScheduleResponse } from "../../src/velair/types";
const template = { key: "work", name: "Work", blocks: [{ slot_id: "a", start: "08:00", action: "turn_off" }] };
const schedule = { configured_entities: ["climate.room"], zones: { "climate.room": { enabled: true, schedule: {} } }, settings: { first_weekday: "monday" }, temperature_migration: { required: false }, temperature_unit: "C", active_overrides: {}, templates: [template], next_events: [], global: { mode: "auto" }, configuration_revision: 4 } as unknown as ScheduleResponse;
async function settle(card: VelairCard) { await new Promise(resolve => setTimeout(resolve, 0)); await card.updateComplete; }
afterEach(() => document.body.replaceChildren());
describe("template application real card", () => {
 it("routes checkbox selection through real target keys and atomic review API", async () => {
  const sendMessagePromise = vi.fn(async (message: { type: string }) => message.type === "velair/preview_template_application"
   ? { configuration_revision: 4, can_apply: true, groups: [{ entity_id: "climate.room", weekdays: ["monday"], requires_base: false, alternatives: [], proposals: [{ slot_id: "a", start: "08:00", binding: { action: "set_temperature", temperature: 20 } }], errors: [], pending: [], replacements: [] }], warnings: [], errors: [] } : schedule);
  const card = document.createElement("velair-card") as VelairCard;
  card.setConfig({ type: "custom:velair-card", view: "templates" });
  card.hass = { connection: { sendMessagePromise, subscribeMessage: vi.fn().mockResolvedValue(() => undefined) }, states: { "climate.room": { state: "off", attributes: { hvac_modes: ["off", "cool"], min_temp: 7, max_temp: 35, friendly_name: "Room" } } }, config: { time_zone: "UTC" }, callService: vi.fn() } as unknown as HomeAssistant;
  document.body.append(card); await settle(card);
  card.shadowRoot!.querySelector<HTMLButtonElement>(".template-item button")!.click(); await settle(card);
  card.shadowRoot!.querySelector<HTMLButtonElement>(".template-apply-button")!.click(); await settle(card);
  const method = card.shadowRoot!.querySelectorAll<HTMLSelectElement>(".template-application-controls select")[1]; method.value = "hours"; method.dispatchEvent(new Event("change", { bubbles: true })); await settle(card);
  const checkbox = card.shadowRoot!.querySelector<HTMLInputElement>('.template-application-choices input')!;
  checkbox.checked = true; checkbox.dispatchEvent(new Event("change", { bubbles: true })); await settle(card);
  const review = card.shadowRoot!.querySelector<HTMLButtonElement>(".template-application-footer .command-button")!;
  expect(review.disabled).toBe(false); review.click(); await settle(card);
  expect(sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({ type: "velair/preview_template_application", groups: [{ entity_id: "climate.room", weekdays: ["monday"] }], expected_revision: 4 }));
  expect(card.shadowRoot!.querySelector<HTMLButtonElement>(".template-application-footer .success")!.disabled).toBe(false);
  const allIds = [...card.shadowRoot!.querySelectorAll("[id]")].map(element => element.id); expect(new Set(allIds).size).toBe(allIds.length);
 });
});
