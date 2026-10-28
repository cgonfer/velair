import { html, nothing } from "lit";
import type { VelairViewHost } from "../host-types";
import type { ScheduleResponse } from "../types";
import type { ResourceUsageGroup } from "../domain/resource-usages";

export function renderResourceSectionSummary(icon: string, label: string, description?: string) {
  return html`
    <summary class=${description ? "resource-section-summary-description" : nothing}>
      <ha-icon icon=${icon} aria-hidden="true"></ha-icon>
      <span>${label}${description ? html`<small class="resource-section-description">${description}</small>` : nothing}</span>
      <ha-icon class="resource-section-chevron preset-section-chevron" icon="mdi:chevron-down" aria-hidden="true"></ha-icon>
    </summary>
  `;
}

/** Read-only dependency information; each backend usage remains counted. */
export function renderResourceUsageGroups(
  host: VelairViewHost,
  data: ScheduleResponse | undefined,
  groups: ResourceUsageGroup[],
  kind: "preset" | "template",
  help: string,
) {
  return html`
    <div class=${`resource-usages ${kind}-usages`}>
      <p>${help}</p>
      ${groups.map((group) => html`
        <section class=${`resource-usage-group ${kind}-usage-group`}>
          <header>
            <ha-icon icon="mdi:thermostat" aria-hidden="true"></ha-icon>
            <strong>${host._friendlyEntityName(group.entity_id)}</strong>
            <span class="pill">${host._t(kind === "template" ? "templateLinkedDays" : "resourceUses", { count: group.count })}</span>
          </header>
          <div class="resource-usage-sources">
            ${group.sources.map((source) => html`
              <div class=${`resource-usage-item ${kind}-usage-item`}>
                <strong>${source.source === "default"
                  ? host._t("modeDefault")
                  : data?.profiles?.find((profile) => profile.key === source.profile_key)?.name
                    ?? source.profile_key ?? host._t("profiles")}</strong>
                <span>${source.entries.map((entry) =>
                  [host._weekdayName(entry.weekday), entry.start, kind === "template" ? host._t(entry.mode === "full" ? "templateLinkFull" : "templateLinkHours") : ""].filter(Boolean).join(" · "),
                ).join(", ")}</span>
              </div>
            `)}
          </div>
        </section>
      `)}
    </div>
  `;
}
