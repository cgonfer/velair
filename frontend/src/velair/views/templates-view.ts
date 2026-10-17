import { renderTemplateApplication as renderTemplateApplyPanel } from "./template-application-view";
import { html, nothing } from "lit";
import { renderDocumentationHelp } from "./documentation-links";
import { keyed } from "lit/directives/keyed.js";
import { editableBlockRowKey, renderAddBlockButton, renderDraftListHeader, renderEditableBlock, renderTimeline } from "./schedule-view";
import type { VelairViewHost } from "../host-types";
import type { DraftScheduleBlock, ScheduleTemplate } from "../types";
import { asDraftActionsHost, updateDraftBlock } from "../controllers/draft-actions";
import { assignmentKey, destinationKey, normalizeTemplateBlocks, updateImpactBlock } from "../controllers/template-impact";

import { groupResourceUsages } from "../domain/resource-usages";
import { renderResourceSectionSummary, renderResourceUsageGroups } from "./resource-usages";

type TemplatesViewHost = VelairViewHost;

export function renderTemplatesView(host: TemplatesViewHost, selectedEntity?: string) {
  return html`<div class="templates-view">
    <div class="schedule-source-selector" role="group" aria-label=${host._t("templates")}>
      <div class=${host._templateLibrarySource !== "presets" ? "schedule-source-option active" : "schedule-source-option"}>
      <button class=${host._templateLibrarySource !== "presets" ? "active" : ""} type="button" ?disabled=${host._templateAction === "save"} @click=${() => host._selectTemplateLibrarySource("templates")}><ha-icon icon="mdi:content-copy"></ha-icon><span><strong>${host._t("templates")}</strong><small>${host._t("templatesPanelIntro")}</small></span></button>
      ${renderDocumentationHelp(host, "linkedSchedules", { title: "templates", summary: "linkedHoursHelp" })}
      </div>
      <div class=${host._templateLibrarySource === "presets" ? "schedule-source-option active" : "schedule-source-option"}>
      <button class=${host._templateLibrarySource === "presets" ? "active" : ""} type="button" ?disabled=${host._templateAction === "save"} @click=${() => host._selectTemplateLibrarySource("presets")}><ha-icon icon="mdi:thermometer-lines"></ha-icon><span><strong>${host._t("blockPresets")}</strong><small>${host._t("presetLibraryHelp")}</small></span></button>
      ${renderDocumentationHelp(host, "blockPresets", { title: "blockPresets", summary: "presetSharedEditHelp" })}
      </div>
    </div>
    ${host._templateLibrarySource === "presets" ? renderPresetLibrary(host) : renderDailyTemplatesView(host, selectedEntity)}
  </div>`;
}

export function renderPresetLibrary(host: TemplatesViewHost) {
  return html`<velair-preset-library .host=${host} .data=${host._data} .hass=${host.hass} .draft=${host._presetLibraryDraft}
    @velair-dirty-changed=${(event: CustomEvent) => host._setPresetLibraryDirty?.(event.detail.dirty, event.detail.draft)}></velair-preset-library>`;
}

function renderDailyTemplatesView(host: TemplatesViewHost, selectedEntity?: string) {
  const templates = host._scheduleTemplates();
  const selectedTemplate = templates.find((template: ScheduleTemplate) => template.key === host._selectedTemplateKey);
  const hasValidationError = !normalizeTemplateBlocks(host, host._templateDraftBlocks).ok;
  const templateName = selectedTemplate ? host._templateNameInputValue(selectedTemplate) : "";
  const templateDraftBlocks = selectedTemplate ? host._templateDraftBlocks : [];
  const templateEditorHost = Object.create(host) as VelairViewHost;
  templateEditorHost._unboundedTemperatureTargets = true;
  templateEditorHost._allowBlockPresets = true;
  templateEditorHost._supportsTemperatureOnly = true;
  templateEditorHost._effectivePresetBlock = (block, index, source) => host._effectivePresetBlock?.(block, index, source);
  templateEditorHost._presetSettingsStatus = (block, index, source) => host._presetSettingsStatus?.(block, index, source);
  // Validation is adapted locally; configuration edits must retain the component owner.
  templateEditorHost._updateDraftBlock = (index, field, value, source) => host._updateDraftBlock(index, field, value, source);
  templateEditorHost._removeBlock = (index, source) => host._removeBlock(index, source);
  templateEditorHost._addBlock = (source) => host._addBlock(source);
  templateEditorHost._setPresetForBlock = (index, key, source) => host._setPresetForBlock?.(index, key, source);
  templateEditorHost._unlinkPresetBlock = (index, source) => host._unlinkPresetBlock?.(index, source) ?? Promise.resolve();
  templateEditorHost._retryPresetSettings = (block, index, source) => host._retryPresetSettings?.(block, index, source);
  templateEditorHost._editPreset = (key) => host._editPreset?.(key);

  templateEditorHost._temperatureStep = () => undefined;
  templateEditorHost._temperatureError = (block) => {
    const result = normalizeTemplateBlocks(host, [block]);
    return result.ok ? undefined : result.error;
  };
  if (!templates.length) {
    return html`
      <section class="templates-view">
        <div class="template-library">
          <div class="template-placeholder compact">
            <span>${host._t("noTemplates")}</span>
            <button
              class="icon-button primary"
              type="button"
              ?disabled=${host._templateAction === "save"}
              @click=${() => host._createTemplate()}
              title=${host._t("createTemplate")}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          </div>
        </div>
      </section>
    `;
  }

  return html`
    <section class="templates-view">
      <div class="template-library">
        <div class="template-library-layout">
        <div class=${host._templateListClass(templates.length)}>
          <div class="template-list-heading">
            <div class="section-heading">
              <ha-icon icon="mdi:content-copy"></ha-icon>
              <span class="section-label">${host._t("templates")} (${templates.length})</span>
            </div>
            <button
              class="icon-button primary"
              type="button"
              ?disabled=${host._templateAction === "save"}
              @click=${() => host._createTemplate()}
              title=${host._t("createTemplate")}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          </div>
          <div class="template-list" @scroll=${host._handleTemplateListScroll}>
            ${templates.map(
              (template: ScheduleTemplate) => html`
                <div class=${template.key === selectedTemplate?.key ? "template-item active" : "template-item"}>
                  <button
                    class="template-item-main"
                    type="button"
                    ?disabled=${host._templateAction === "save"}
                    @click=${() => host._selectTemplate(template.key)}
                  >
                    <span class="resource-item-heading">
                      <strong title=${host._templateLabel(template)}>${host._templateLabel(template)}</strong>
                    </span>
                    <span>${host._t("blocks")}: ${template.blocks.length}</span>
                    <span class="resource-item-footer">
                      <small class="pill resource-use-count">
                        <ha-icon icon="mdi:link-variant" aria-hidden="true"></ha-icon>
                        ${host._t("templateLinkedDays", { count: host._data?.resource_usages?.templates?.[template.key]?.length ?? 0 })}
                      </small>
                    </span>
                  </button>
                  <span class="resource-delete-control" title=${host._data?.resource_usages?.templates?.[template.key]?.length ? host._t("templateDeleteInUse") : host._t("deleteTemplate")}>
                  <button
                    class="icon-button danger template-item-delete"
                    type="button"
                    ?disabled=${host._templateAction === "delete" || !!host._data?.resource_usages?.templates?.[template.key]?.length}
                    @click=${(event: Event) => {
                      event.stopPropagation();
                      if (host._data?.resource_usages?.templates?.[template.key]?.length) return;
                      host._selectTemplate(template.key);
                      if (host._selectedTemplateKey === template.key) void host._deleteSelectedTemplate();
                    }}
                    title=${host._data?.resource_usages?.templates?.[template.key]?.length ? host._t("templateDeleteInUse") : host._t("deleteTemplate")}
                    aria-label=${host._t("deleteTemplate")}
                  >
                    <ha-icon icon="mdi:trash-can"></ha-icon>
                  </button>
                  </span>
                </div>
              `,
            )}
          </div>
        </div>
        <div class="template-detail">
          ${selectedTemplate
            ? html`
                <div class="template-detail-heading">
                  <label class="template-name-field">
                    ${host._templateDirty ? html`<span class="pill warning">${host._t("unsaved")}</span>` : nothing}
                    <div class="template-name-input-wrap">
                      <ha-icon icon="mdi:pencil"></ha-icon>
                      <input
                        ?disabled=${host._templateAction === "save"}
                        aria-label=${host._t("customTemplateName")}
                        .value=${templateName}
                        @input=${(event: Event) =>
                          host._updateTemplateNameDraft(selectedTemplate.key, host._inputValue(event))}
                      />
                    </div>
                  </label>
                  <div class="template-detail-actions">
                    <button
                      class="command-button success template-apply-button"
                      type="button"
                      ?disabled=${!selectedTemplate || hasValidationError}
                      @click=${() => {
                        host._selectTemplate(selectedTemplate.key);
                        host._toggleTemplateApplyPanel();
                      }}
                      title=${host._t("applyToAction")}
                    >
                      <ha-icon icon="mdi:calendar-check"></ha-icon>
                      <span>${host._t("applyToAction")}</span>
                    </button>
                    <button
                      class="icon-button primary"
                      type="button"
                      ?disabled=${host._templateAction === "save" || !templateName.trim() || hasValidationError}
                      @click=${() => {
                        void host._saveSelectedTemplateFromLibrary(selectedTemplate);
                      }}
                      title=${host._t("save")}
                    >
                      <ha-icon icon="mdi:content-save"></ha-icon>
                    </button>
                  </div>
                </div>
                ${renderTemplateUsages(host, selectedTemplate.key)}
                ${renderTemplateApplyPanel(host, selectedTemplate)}
                <fieldset class="editor template-editor" ?disabled=${host._templateAction === "save"}>
                  ${renderTimeline(host, selectedEntity, "template")}
                  <div class="draft-list template-block-list">
                    ${templateDraftBlocks.length
                      ? html`
                          ${renderDraftListHeader(host, "template")}
                          ${templateDraftBlocks.map((block: DraftScheduleBlock, index: number) =>
                            keyed(
                              editableBlockRowKey("template", selectedTemplate.key, undefined, index),
                              renderEditableBlock(templateEditorHost, block, index, "template"),
                            ),
                          )}
                          ${renderAddBlockButton(host, "template")}
                        `
                      : renderAddBlockButton(host, "template")}
                  </div>
                </fieldset>
              `
            : html`
                <div class="template-placeholder compact">
                  <span>${host._t("selectTemplateToBegin")}</span>
                </div>
              `}
        </div>
        </div>
      </div>
    </section>
  `;
}

function renderTemplateUsages(host: TemplatesViewHost, key: string) {
  const impact = host._templateImpact?.preview.template.key === key ? host._templateImpact : undefined;
  const usages = impact?.preview.usages ?? host._data?.resource_usages?.templates?.[key] ?? [];
  const groups = groupResourceUsages(host._data, usages, host._orderedWeekdays());
  const savedDiagnostics = host._data?.resource_diagnostics?.filter((diagnostic) => usages.some((usage) =>
    usage.entity_id === diagnostic.entity_id && usage.source === diagnostic.source
    && (usage.source === "default" || usage.profile_key === diagnostic.profile_key))) ?? [];
  return html`
    <details class="resource-section template-usage-section" .open=${Boolean(host._templateLinkedDaysOpen)}
      @toggle=${(event: Event) => host._setTemplateLinkedDaysOpen?.((event.currentTarget as HTMLDetailsElement).open)}>
      ${renderResourceSectionSummary("mdi:link-variant", host._t("templateLinkedDays", { count: usages.length }))}
      ${host._templatePreviewPending ? renderAssignmentStatus("mdi:progress-clock", host._t("templateAssignmentsChecking")) : nothing}
      ${host._templatePreviewError ? renderAssignmentStatus("mdi:alert-circle-outline", host._templatePreviewError) : nothing}
      ${savedDiagnostics.length ? html`<div class="template-saved-diagnostics">
        <strong>${host._t("templateSavedDiagnostics")}</strong>
        ${savedDiagnostics.map((diagnostic) => html`<div>
          <strong>${host._friendlyEntityName(diagnostic.entity_id)} · ${diagnostic.source === "default" ? host._t("modeDefault")
            : host._data?.profiles?.find((profile) => profile.key === diagnostic.profile_key)?.name ?? diagnostic.profile_key}</strong>
          ${renderAssignmentStatus("mdi:alert-circle-outline", diagnostic.message)}
        </div>`)}
      </div>` : nothing}
      ${impact ? html`
        <div class="resource-usages template-usages">
          <p>${host._t("templateUsageDayLinks")}</p>
          ${groups.map((group) => html`
            <section class="resource-usage-group template-usage-group">
              <header><ha-icon icon="mdi:thermostat" aria-hidden="true"></ha-icon>
                <strong>${host._friendlyEntityName(group.entity_id)}</strong>
                <span class="pill">${host._t("templateLinkedDays", { count: group.count })}</span></header>
              <div class="resource-usage-sources">
                ${group.sources.map((source) => html`
                  <section class="template-assignment-source">
                    <strong>${source.source === "default" ? host._t("modeDefault")
                      : host._data?.profiles?.find((profile) => profile.key === source.profile_key)?.name ?? source.profile_key}</strong>
                    ${source.entries.map((entry) => {
                      const index = impact.assignments.findIndex((item) => item.destination.entity_id === group.entity_id
                        && item.destination.source === source.source && item.destination.profile_key === source.profile_key
                        && item.destination.weekday === entry.weekday);
                      const usage = usages.find((item) => item.entity_id === group.entity_id && item.source === source.source && item.profile_key === source.profile_key && item.weekday === entry.weekday);
                      return usage?.mode === "full" ? renderFullDestination(host, impact, usage)
                        : index >= 0 ? renderDestinationAssignments(host, impact, index) : html`<span>${host._weekdayName(entry.weekday)} · ${host._t("templateLinkHours")}</span>`;
                    })}
                  </section>`)}
              </div>
            </section>`)}
        </div>` : renderResourceUsageGroups(host, host._data, groups, "template", host._t("templateUsageDayLinks"))}
    </details>`;
}

function renderAssignmentStatus(icon: string, text: string) {
  return html`<p class="template-assignment-status" role="status"><ha-icon icon=${icon} aria-hidden="true"></ha-icon><span>${text}</span></p>`;
}

function renderFullDestination(host: TemplatesViewHost, impact: NonNullable<TemplatesViewHost["_templateImpact"]>, destination: import("../types").ResourceUsage) {
  const result = impact.preview.resolved_destinations?.find((item) => destinationKey(item.destination) === destinationKey(destination));
  const editor = Object.create(host) as VelairViewHost;
  editor._selectedEntity = destination.entity_id;
  editor._selectedWeekday = destination.weekday;
  editor._resourceProfileKey = destination.source === "profile" ? destination.profile_key : undefined;
  editor._draftTemplateLink = { mode: "full", template_key: impact.preview.template.key };
  editor._linkedHours = true;
  editor._fullTemplateLinked = true;
  editor._unlinkDayTemplate = undefined;
  editor._temperatureError = () => undefined;
  editor._effectivePresetBlock = (block) => host._templatePreviewPending ? undefined : result?.blocks?.find((item) => item.slot_id === block.slot_id || item.start === block.start);
  editor._presetSettingsStatus = (block, index, source) => host._templatePreviewPending ? "loading" : editor._effectivePresetBlock?.(block, index, source) ? undefined : "unavailable";
  editor._updateDraftBlock = () => undefined;
  editor._setPresetForBlock = undefined;
  editor._retryPresetSettings = () => host._setTemplateImpact?.(impact);
  const errors = impact.preview.destination_errors?.filter((item) => destinationKey(item.destination) === destinationKey(destination)) ?? [];
  return html`<section class="template-assignment-day full-template-destination" data-destination=${destinationKey(destination)}>
    <strong>${host._weekdayName(destination.weekday)} <span class="pill">${host._t("templateLinkFull")}</span></strong>
    ${errors.map((error) => renderAssignmentStatus("mdi:alert-circle-outline", error.message))}
    ${(impact.preview.changes ?? []).filter((change) => destinationKey(change.destination) === destinationKey(destination) && change.kind !== "added").map((change) => renderAssignmentStatus(
      change.kind === "removed" ? "mdi:minus-circle-outline" : change.kind === "configuration" ? "mdi:tune-variant" : "mdi:clock-outline",
      host._t(change.kind === "removed" ? "templateAssignmentRemoved" : change.kind === "configuration" ? "templateAssignmentConfigurationChanged" : "templateAssignmentMoved", { time: change.previous_start ?? "", next: change.start ?? "" })))}
    <div class="draft-list">${renderDraftListHeader(editor, "template")}
      ${impact.preview.template.blocks.map((block, index) => renderEditableBlock(editor, { ...block, action: block.action ?? "", hvac_mode: block.hvac_mode ?? "" }, index, "template"))}
    </div>
  </section>`;
}

function renderDestinationAssignments(host: TemplatesViewHost, impact: NonNullable<TemplatesViewHost["_templateImpact"]>, destinationIndex: number) {
  const item = impact.assignments[destinationIndex];
  const sameDestination = (destination: import("../types").ResourceDestination) => destinationKey(destination) === destinationKey(item.destination);
  const errors = impact.preview.destination_errors?.filter((error) => sameDestination(error.destination)) ?? [];
  const changes = impact.preview.changes?.filter((change) => sameDestination(change.destination)) ?? [];
  const editorHost = Object.create(host) as VelairViewHost & ReturnType<typeof asDraftActionsHost>;
  editorHost._allowBlockPresets = true;
  editorHost._linkedHours = true;
  editorHost._draftTemplateLink = undefined;
  editorHost._selectedEntity = item.destination.entity_id;
  editorHost._selectedWeekday = item.destination.weekday;
  editorHost._resourceProfileKey = item.destination.source === "profile" ? item.destination.profile_key : undefined;
  editorHost._unlinkDayTemplate = undefined;
  editorHost._temperatureError = (block) => host._temperatureError.call(editorHost, block, "schedule");
  editorHost._temperatureLimits = () => host._temperatureLimits.call(editorHost, "schedule", item.destination.entity_id);
  editorHost._temperatureStep = () => host._temperatureStep.call(editorHost, "schedule");
  editorHost._hvacModeOptions = () => host._hvacModeOptions.call(editorHost, "schedule");
  editorHost._fanModeOptions = () => host._fanModeOptions.call(editorHost, "schedule");
  editorHost._presetModeOptions = () => host._presetModeOptions.call(editorHost, "schedule");
  editorHost._swingModeOptions = () => host._swingModeOptions.call(editorHost, "schedule");
  editorHost._swingHorizontalModeOptions = () => host._swingHorizontalModeOptions.call(editorHost, "schedule");
  editorHost._humidityLimits = () => host._humidityLimits.call(editorHost, "schedule");
  editorHost._effectivePresetBlock = (block) => {
    if (host._templatePreviewPending) return undefined;
    const proposal = impact.preview.proposals?.find((proposal) => sameDestination(proposal.destination)
      && proposal.slot_id === block.slot_id && proposal.binding.preset_key === block.preset_key);
    return proposal?.effective_config ? { ...proposal.effective_config, start: block.start } : undefined;
  };
  editorHost._presetSettingsStatus = (block, index, source) => host._templatePreviewPending ? "loading"
    : editorHost._effectivePresetBlock?.(block, index, source) ? undefined : "unavailable";
  editorHost._retryPresetSettings = () => host._setTemplateImpact?.(impact);
  editorHost._unlinkPresetBlock = async (index) => {
    const block = item.drafts[index];
    const effective = editorHost._effectivePresetBlock?.(block, index, "template");
    if (effective) host._setTemplateImpact?.(updateImpactBlock(impact, destinationIndex, index,
      { ...effective, slot_id: block.slot_id, action: effective.action ?? "set_temperature", hvac_mode: effective.hvac_mode ?? "" }));
  };
  editorHost._blocksForSource = () => item.drafts;
  editorHost._setBlocksForSource = (_source, blocks) => {
    let updated = impact;
    blocks.forEach((block, index) => {
      if (JSON.stringify(block) !== JSON.stringify(item.drafts[index])) updated = updateImpactBlock(updated, destinationIndex, index, block);
    });
    host._setTemplateImpact?.(updated);
  };
  editorHost._markBlocksDirty = () => undefined;
  editorHost._updateDraftBlock = (index, field, value) => updateDraftBlock(asDraftActionsHost(editorHost), index, field, value, "schedule");
  editorHost._setPresetForBlock = (index, key) => host._setTemplateImpact?.(updateImpactBlock(impact, destinationIndex, index,
    key ? { start: item.drafts[index].start, slot_id: item.drafts[index].slot_id, preset_key: key, action: "", hvac_mode: "" }
      : { start: item.drafts[index].start, slot_id: item.drafts[index].slot_id, action: "set_temperature", hvac_mode: "", temperature: "" }));
  return html`
    <section class="template-assignment-day" data-destination=${destinationKey(item.destination)}>
      <strong>${host._weekdayName(item.destination.weekday)} <span class="pill">${host._t("templateLinkHours")}</span></strong>
      ${errors.length ? html`<div class="template-draft-diagnostics"><strong>${host._t("templateAssignmentErrors")}</strong>
        ${errors.map((error) => renderAssignmentStatus("mdi:alert-circle-outline", error.message))}</div>` : nothing}
      ${changes.filter((change) => change.kind !== "added").map((change) => renderAssignmentStatus(
        change.kind === "removed" ? "mdi:minus-circle-outline" : "mdi:clock-outline",
        host._t(change.kind === "removed" ? "templateAssignmentRemoved" : "templateAssignmentMoved", {
          time: change.previous_start ?? "", next: change.start ?? "",
        })))}
      ${item.drafts.map((block, index) => {
        const proposal = impact.preview.proposals?.find((proposal) => sameDestination(proposal.destination) && proposal.slot_id === block.slot_id);
        const pending = impact.preview.pending?.find((pending) => sameDestination(pending.destination) && pending.slot_id === block.slot_id);
        const manual = impact.manual?.has(assignmentKey(item.destination, block.slot_id!));
        const invalid = !normalizeTemplateBlocks(host, [block]).ok;
        const label = manual ? host._t("templateAssignmentManual") : proposal
          ? host._t(`templateAssignmentOrigin_${proposal.origin}`, { time: proposal.donor_start ?? "" })
          : host._t("templateAssignmentPending");
        return html`<fieldset class="template-assignment-slot" ?disabled=${host._templateAction === "save"}>
          ${renderAssignmentStatus(pending || invalid ? "mdi:alert-circle-outline" : "mdi:check-circle-outline", label)}
          ${pending || invalid ? renderAssignmentStatus("mdi:alert-circle-outline", pending?.message ?? host._t("templateAssignmentPending")) : nothing}
          <div class="draft-list template-assignment-block-list">
            ${renderDraftListHeader(editorHost, "template")}
            ${renderEditableBlock(editorHost, block, index, "template")}
          </div>
        </fieldset>`;
      })}
    </section>`;
}

export { renderTemplateApplyPanel };
