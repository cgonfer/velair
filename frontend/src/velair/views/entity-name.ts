import { html, nothing } from "lit";
import { controlUnitNameContext } from "../domain/control-units";
import type { HomeAssistant, ScheduleResponse } from "../types";

export function renderEntityNameContext(data: ScheduleResponse | undefined, hass: HomeAssistant | undefined, entityId: string) {
  const context = controlUnitNameContext(data, hass, entityId);
  return context ? html`<span class="entity-name-context" title=${context}>${context}</span>` : nothing;
}
