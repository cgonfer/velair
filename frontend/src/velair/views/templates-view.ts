import { html, nothing } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { editableBlockRowKey, renderAddBlockButton, renderDraftListHeader, renderEditableBlock, renderTimeline } from "./schedule-view";
import type { VelairViewHost } from "../host-types";
import type { DraftScheduleBlock, ScheduleTemplate } from "../types";

type TemplatesViewHost = VelairViewHost;

export function renderTemplatesView(host: TemplatesViewHost, selectedEntity?: string) {
  const templates = host._scheduleTemplates();
  const selectedTemplate = templates.find((template: ScheduleTemplate) => template.key === host._selectedTemplateKey);
  const hasValidationError = host._hasDraftValidationError("template");
  const templateName = selectedTemplate ? host._templateNameInputValue(selectedTemplate) : "";
  const templateDraftBlocks = selectedTemplate ? host._templateDraftBlocks : [];
  if (!templates.length) {
    return html`
      <section class="template-library">
        <div class="panel-empty embedded">
          <ha-icon icon="mdi:content-copy"></ha-icon>
          <div>
            <h2>${host._t("templates")}</h2>
            <p>${host._t("noTemplates")}</p>
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
      </section>
    `;
  }

  return html`
    <section class="template-library">
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
                    @click=${() => host._selectTemplate(template.key)}
                  >
                    <strong>${host._templateLabel(template)}</strong>
                    <span>${host._t("blocks")}: ${template.blocks.length}</span>
                  </button>
                  <button
                    class="icon-button danger template-item-delete"
                    type="button"
                    ?disabled=${host._templateAction === "delete"}
                    @click=${(event: Event) => {
                      event.stopPropagation();
                      host._selectTemplate(template.key);
                      void host._deleteSelectedTemplate();
                    }}
                    title=${host._t("deleteTemplate")}
                  >
                    <ha-icon icon="mdi:trash-can"></ha-icon>
                  </button>
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
                ${renderTemplateApplyPanel(host, selectedTemplate)}
                <div class="editor template-editor">
                  ${renderTimeline(host, selectedEntity, "template")}
                  <div class="draft-list template-block-list">
                    ${templateDraftBlocks.length
                      ? html`
                          ${renderDraftListHeader(host)}
                          ${templateDraftBlocks.map((block: DraftScheduleBlock, index: number) =>
                            keyed(
                              editableBlockRowKey("template", selectedTemplate.key, undefined, index),
                              renderEditableBlock(host, block, index, "template"),
                            ),
                          )}
                          ${renderAddBlockButton(host, "template")}
                        `
                      : renderAddBlockButton(host, "template")}
                  </div>
                </div>
              `
            : html`
                <div class="panel-empty embedded template-placeholder">
                  <ha-icon icon="mdi:content-copy"></ha-icon>
                  <div>
                    <h2>${host._t("templates")}</h2>
                    <p>${host._t("selectTemplateToBegin")}</p>
                  </div>
                </div>
              `}
        </div>
      </div>
    </section>
  `;
}

export function renderTemplateApplyPanel(host: TemplatesViewHost, template: ScheduleTemplate) {
  if (!host._templateApplyOpen) {
    return nothing;
  }

  const entities = host._orderedZoneIds(host._data?.configured_entities ?? []);
  const weekdays = host._orderedWeekdays();
  const hasValidationError = host._hasDraftValidationError("template");
  const hasTargets = host._templateApplyTargets.size > 0;

  return html`
    <div class="template-apply-panel">
      <div class="copy-header">
        <div>
          <span class="label">${host._t("applyTemplateTo", { template: host._templateLabel(template) })}</span>
        </div>
        <button
          class="command-button success"
          type="button"
          ?disabled=${host._applyingTemplateTargets || !hasTargets || hasValidationError}
          @click=${() => host._applyTemplateToTargets(template)}
        >
          <ha-icon icon="mdi:check-circle-outline"></ha-icon>
          <span>${host._t(host._applyingTemplateTargets ? "applying" : "apply")}</span>
        </button>
      </div>
      ${entities.length
        ? html`
            <div class="template-apply-scroll-wrap">
              <div class="template-apply-grid">
                <div class="template-apply-cell template-apply-zone header">${host._t("thermostat")}</div>
                ${weekdays.map((weekday: string) => html`
                  <div class="template-apply-cell header day">${host._shortWeekdayName(weekday)}</div>
                `)}
                ${entities.map((entityId: string) => html`
                  <div class="template-apply-cell template-apply-zone" title=${host._friendlyEntityName(entityId)}>
                    ${host._friendlyEntityName(entityId)}
                  </div>
                  ${weekdays.map((weekday: string) => {
                    const targetKey = host._templateApplyTargetKey(entityId, weekday);
                    return html`
                      <label class="template-apply-cell template-apply-day" title=${host._weekdayName(weekday)}>
                        <input
                          type="checkbox"
                          .checked=${host._templateApplyTargets.has(targetKey)}
                          @change=${(event: Event) =>
                            host._toggleTemplateApplyTarget(
                              entityId,
                              weekday,
                              (event.currentTarget as HTMLInputElement).checked,
                            )}
                        />
                      </label>
                    `;
                  })}
                `)}
              </div>
            </div>
          `
        : html`<span class="empty">${host._t("noManagedEntities")}</span>`}
    </div>
  `;
}
