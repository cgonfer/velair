import { draftBlocksFromScheduleBlocks } from "../domain/draft-blocks";
import { renderDayScheduleConflict } from "./day-layout-controls";

import { html, nothing } from "lit";

import type { VelairViewHost } from "../host-types";

import type { DraftScheduleBlock, ScheduleTemplate, TemplateApplicationPreview } from "../types";

import { BUILTIN_DAY_LAYOUTS, dayGroups, dayGroupLabel } from "../domain/day-layouts";

import { applicationState, applicationDraftsValid, applicationRequest, applicationGroupKey, applicationPreviewCurrent, updateApplication, reviewApplication, chooseApplicationBase, updateApplicationBlock } from "../controllers/template-application";

import { asDraftActionsHost, updateDraftBlock } from "../controllers/draft-actions";

import { presetConfigurationSummary, renderDraftListHeader, renderEditableBlock } from "./schedule-view";



export function renderTemplateApplication(host: VelairViewHost, template: ScheduleTemplate) {

  if (!host._templateApplyOpen) return nothing;

  const state = applicationState(host), preview = state.preview;

  const groups = dayGroups(state.layout).map(days => host._orderedWeekdays().filter(day => days.includes(day))).sort((a, b) => host._orderedWeekdays().indexOf(a[0]) - host._orderedWeekdays().indexOf(b[0]));

  const entities = host._visibleZoneIds(host._data?.configured_entities ?? []);

  const request = applicationRequest(host);

  const label = (days: string[]) => dayGroupLabel(days, day => host._shortWeekdayName(day), host._t("allDays"));

  const current = applicationPreviewCurrent(host);

  const reviewing = Boolean(preview);

  return html`<section class="template-apply-panel template-application">

    <div class="copy-header application-heading"><strong><ha-icon icon="mdi:calendar-import" aria-hidden="true"></ha-icon>${host._t("applyTemplateTo", { template: host._templateLabel(template) })}</strong>

      <span class="application-count">${host._t("templateApplicationSelectionCount", { zones: new Set(request.groups.map(g => g.entity_id)).size, days: request.groups.reduce((sum, g) => sum + g.weekdays.length, 0) })}</span></div>

    ${!reviewing ? html`<fieldset class="template-application-controls" ?disabled=${host._applyingTemplateTargets}>

      <label><span class="label">${host._t("templateApplicationDestination")}</span><span class="select-wrap"><select .value=${state.source === "profile" ? `profile:${state.profileKey ?? ""}` : "default"} @change=${(event: Event) => {

        const value = (event.target as HTMLSelectElement).value;

        updateApplication(host, { source: value === "default" ? "default" : "profile", profileKey: value === "default" ? undefined : value.slice("profile:".length) });

      }}><option value="default" .selected=${state.source === "default"}>${host._t("modeDefault")}</option>${(host._data?.profiles ?? []).map(profile => html`<option value=${`profile:${profile.key}`} .selected=${state.source === "profile" && state.profileKey === profile.key}>${profile.name}</option>`)}</select></span></label>

      <label><span class="label">${host._t("templateApplicationMethod")}</span><span class="select-wrap"><select .value=${state.mode} @change=${(event: Event) => updateApplication(host, { mode: (event.target as HTMLSelectElement).value as typeof state.mode })}>

        <option value="copy" .selected=${state.mode === "copy"}>${host._t("templateApplicationCopy")}</option><option value="hours" .selected=${state.mode === "hours"}>${host._t("templateLinkHours")}</option><option value="full" .selected=${state.mode === "full"}>${host._t("templateLinkFull")}</option></select></span></label>

      <label><span class="label">${host._t("dayLayout")}</span><span class="select-wrap"><select .value=${state.layout} @change=${(event: Event) => updateApplication(host, { layout: (event.target as HTMLSelectElement).value }, true)}>

        ${BUILTIN_DAY_LAYOUTS.map(layout => html`<option value=${layout.key} .selected=${state.layout === layout.key}>${host._t(layout.name as "individualDays")}</option>`)}</select></span></label>

    </fieldset><p class="hint application-method-help"><ha-icon icon="mdi:information-outline" aria-hidden="true"></ha-icon><span>${host._t(`templateApplicationHelp_${state.mode}`)}</span></p>

    <div class="template-application-targets" tabindex="0" role="region" aria-label=${host._t("thermostat")}>
      <table class="template-application-table" style=${`--application-columns:${groups.length}`}>
      <colgroup><col class="application-zone-column" />${groups.map(() => html`<col />`)}</colgroup>

      <thead><tr class="template-application-group-head"><th scope="col">${host._t("thermostat")}</th>${groups.map(days => {
        const representative = dayGroups(state.layout).find(group => group.includes(days[0]))![0];
        const selectedCount = entities.filter(entity => host._templateApplyTargets.has(host._templateApplyTargetKey(entity, representative))).length;
        const allSelected = entities.length > 0 && selectedCount === entities.length;
        return html`<th scope="col"><button class="application-column-toggle" type="button"
          aria-pressed=${allSelected ? "true" : selectedCount ? "mixed" : "false"}
          ?disabled=${host._applyingTemplateTargets || !entities.length}
          @click=${() => {
            if (host._applyingTemplateTargets) return;
            for (const entity of entities) host._toggleTemplateApplyTarget(entity, representative, !allSelected);
          }}>${label(days)}</button></th>`;
      })}</tr></thead>

      <tbody>${entities.map(entity => html`<tr class="template-application-target"><th scope="row"><strong>${host._friendlyEntityName(entity)}</strong></th>

        ${groups.map(days => {

          const representative = dayGroups(state.layout).find(g => g.includes(days[0]))![0];

          return html`<td class="template-application-choices"><label><input type="checkbox" .checked=${host._templateApplyTargets.has(host._templateApplyTargetKey(entity, representative))} ?disabled=${host._applyingTemplateTargets}

            @change=${(event: Event) => host._toggleTemplateApplyTarget(entity, representative, (event.target as HTMLInputElement).checked)} aria-label=${`${host._friendlyEntityName(entity)}: ${label(days)}`} /></label></td>`;

        })}</tr>`)}</tbody>
      </table>

    </div>` : html`<div class="template-application-review">

      <dl class="application-summary">
        <div><dt><ha-icon icon=${state.source === "default" ? "mdi:calendar-clock-outline" : "mdi:account-outline"} aria-hidden="true"></ha-icon>${host._t("templateApplicationDestination")}</dt><dd>${state.source === "default" ? host._t("modeDefault") : host._data?.profiles?.find(profile => profile.key === state.profileKey)?.name}</dd></div>
        <div><dt><ha-icon icon=${state.mode === "copy" ? "mdi:content-copy" : "mdi:link-variant"} aria-hidden="true"></ha-icon>${host._t("templateApplicationMethod")}</dt><dd>${host._t(state.mode === "copy" ? "templateApplicationCopy" : state.mode === "hours" ? "templateLinkHours" : "templateLinkFull")}</dd></div>
        <div><dt><ha-icon icon="mdi:calendar-week" aria-hidden="true"></ha-icon>${host._t("dayLayout")}</dt><dd>${host._t(BUILTIN_DAY_LAYOUTS.find(layout => layout.key === state.layout)!.name as "individualDays")}</dd></div>
      </dl>

      <p class="hint application-method-help"><ha-icon icon="mdi:information-outline" aria-hidden="true"></ha-icon><span>${host._t("templateApplicationEffectiveWarning")}</span></p>

      ${!current ? html`<p class="warning application-notice" role="status"><ha-icon icon="mdi:refresh" aria-hidden="true"></ha-icon><span>${host._t("templateApplicationReviewAgain")}</span></p>` : nothing}

      ${[...(preview?.warnings ?? []), ...(preview?.errors ?? [])].map(issue => html`<p class="warning application-notice" role="status"><ha-icon icon="mdi:alert-circle-outline" aria-hidden="true"></ha-icon><span>${issue.entity_id ? html`<strong>${host._friendlyEntityName(issue.entity_id)}</strong> ` : nothing}${issue.message}</span></p>`)}

      ${preview?.groups.map(group => html`<section class="template-application-review-group"><div class="application-group-heading"><strong><ha-icon icon="mdi:thermostat" aria-hidden="true"></ha-icon><span>${host._friendlyEntityName(group.entity_id)}</span></strong><span class="application-days"><ha-icon icon="mdi:calendar-range" aria-hidden="true"></ha-icon>${label(group.weekdays)}</span></div>

        ${group.layout_before !== state.layout ? html`<p class="hint application-layout-change"><ha-icon icon="mdi:calendar-sync-outline" aria-hidden="true"></ha-icon><span>${host._t("templateApplicationLayoutChange", { before: host._t(BUILTIN_DAY_LAYOUTS.find(layout => layout.key === group.layout_before)?.name as "individualDays" ?? "individualDays"), after: host._t(BUILTIN_DAY_LAYOUTS.find(layout => layout.key === state.layout)!.name as "individualDays") })}</span></p>` : nothing}

        ${group.behavior_before && group.behavior_before !== "schedule" ? html`<p class="hint">${host._t("templateApplicationBehaviorChange", { before: group.behavior_before })}</p>` : nothing}

        ${group.replacements?.some(day => day.template_key) ? html`<p class="hint">${host._t("templateApplicationReplacesLinks")}</p>` : nothing}

        ${group.errors?.map(error => html`<p class="warning">${error.message}</p>`)}

        ${state.mode === "hours" && group.alternatives.length > 1 ? html`<div class="template-application-base">

          ${renderDayScheduleConflict(Object.assign(Object.create(host), { _applicationGroup: keyFor(group) }), {

            days: host._orderedWeekdays().filter(day => group.weekdays.includes(day)),

            selectedDay: state.bases[keyFor(group)] ?? group.base_weekday,

            disabled: host._applyingTemplateTargets,
            help: host._t("templateApplicationChooseBase"),
            linkLabel: day => {
              const previous = group.replacements.find(item => item.weekday === day);
              return previous?.template_key ? `${host._t("templates")}: ${host._data?.templates?.find(item => item.key === previous.template_key)?.name ?? previous.template_key} / ${host._t(previous.mode === "full" ? "templateLinkFull" : "templateLinkHours")}` : undefined;
            },

            fingerprint: day => group.alternatives.find(alternative => alternative.weekdays.includes(day))?.weekday ?? day,

            blockCount: day => group.alternatives.find(alternative => alternative.weekdays.includes(day))?.blocks.length ?? 0,

            blocks: day => (group.alternatives.find(alternative => alternative.weekdays.includes(day))?.blocks ?? []).map(block => ({ start: block.start, time: host._formatScheduleTime(block.start), block,

              description: presetConfigurationSummary(block, host), presetLabel: block.preset_key ? host._data?.block_presets?.find(preset => preset.key === block.preset_key)?.name ?? block.preset_key : undefined })),

            onChoose: day => { void chooseApplicationBase(host, keyFor(group), day); },

          })}</div>` : nothing}

        ${state.mode === "hours" && !group.requires_base ? renderApplicationBindings(host, group) : nothing}

      </section>`)}

    </div>`}

    ${host._templateDirty ? html`<p class="warning" role="status">${host._t("templateApplicationSaveFirst")}</p>` : nothing}

    <div class="template-application-footer">

      ${reviewing ? html`<button type="button" class="command-button secondary" ?disabled=${host._applyingTemplateTargets} @click=${() => updateApplication(host, {})}><ha-icon icon="mdi:arrow-left" aria-hidden="true"></ha-icon>${host._t("templateApplicationBack")}</button>` : nothing}

      ${!reviewing || !current || !preview?.can_apply ? html`<button class="command-button" type="button" ?disabled=${host._applyingTemplateTargets || host._templateDirty || !request.groups.length} @click=${() => reviewApplication(host)}>${host._t(host._applyingTemplateTargets ? "loading" : "templateApplicationReview")}</button>` : nothing}

      ${reviewing ? html`<button class="command-button success" type="button" ?disabled=${host._applyingTemplateTargets || host._templateDirty || !current || !preview?.can_apply || !applicationDraftsValid(host)} @click=${() => host._applyTemplateToTargets(template)}>${host._t(host._applyingTemplateTargets ? "applying" : "apply")}</button>` : nothing}

    </div>

  </section>`;

}



const keyFor = (group: TemplateApplicationPreview["groups"][number]) => applicationGroupKey(group.entity_id, group.weekdays);



function renderApplicationBindings(host: VelairViewHost, group: TemplateApplicationPreview["groups"][number]) {

  const state = applicationState(host), key = applicationGroupKey(group.entity_id, group.weekdays);

  const drafts: DraftScheduleBlock[] = group.proposals.map(proposal => {
    const retained = state.drafts[`${key}|${proposal.slot_id}`];
    if (retained) return { ...retained, start: proposal.start, slot_id: proposal.slot_id };
    const binding = state.bindings[key]?.[proposal.slot_id] ?? proposal.binding;
    return binding ? draftBlocksFromScheduleBlocks([{ ...binding, start: proposal.start, slot_id: proposal.slot_id }])[0]
      : { start: proposal.start, slot_id: proposal.slot_id, action: "set_temperature", hvac_mode: "", temperature: "" };
  });

  const editor = Object.create(host) as VelairViewHost & ReturnType<typeof asDraftActionsHost>;

  editor._blockEditorIdPrefix = `velair-application-${encodeURIComponent(key)}`;
  editor._selectedEntity = group.entity_id; editor._selectedWeekday = group.weekdays[0];

  editor._resourceProfileKey = state.source === "profile" ? state.profileKey : undefined;

  editor._temperatureUnit = () => host._temperatureUnit(group.entity_id);

  editor._temperatureError = block => host._temperatureError.call(editor, block, "schedule");

  editor._temperatureLimits = () => host._temperatureLimits.call(editor, "schedule", group.entity_id);

  editor._temperatureStep = () => host._temperatureStep.call(editor, "schedule");

  editor._hvacModeOptions = () => host._hvacModeOptions.call(editor, "schedule");

  editor._fanModeOptions = () => host._fanModeOptions.call(editor, "schedule");

  editor._presetModeOptions = () => host._presetModeOptions.call(editor, "schedule");

  editor._swingModeOptions = () => host._swingModeOptions.call(editor, "schedule");

  editor._swingHorizontalModeOptions = () => host._swingHorizontalModeOptions.call(editor, "schedule");

  editor._humidityLimits = () => host._humidityLimits.call(editor, "schedule");

  editor._allowBlockPresets = true; editor._linkedHours = true; editor._fullTemplateLinked = false;

  editor._draftTemplateLink = undefined; editor._unlinkDayTemplate = undefined;

  editor._blocksForSource = () => drafts;

  editor._setBlocksForSource = (_source, blocks) => blocks.forEach((block, index) => {

    if (JSON.stringify(block) !== JSON.stringify(drafts[index])) updateApplicationBlock(host, group, block.slot_id!, block);

  });

  editor._markBlocksDirty = () => undefined;

  editor._updateDraftBlock = (index, field, value) => updateDraftBlock(asDraftActionsHost(editor), index, field, value, "schedule");

  editor._setPresetForBlock = (index, preset) => updateApplicationBlock(host, group, drafts[index].slot_id!, preset

    ? { start: drafts[index].start, slot_id: drafts[index].slot_id, preset_key: preset, action: "", hvac_mode: "" }

    : { start: drafts[index].start, slot_id: drafts[index].slot_id, action: "set_temperature", hvac_mode: "", temperature: "" });

  editor._effectivePresetBlock = block => { const proposal = group.proposals.find(p => p.slot_id === block.slot_id && p.binding?.preset_key === block.preset_key); return proposal?.effective_config ? { ...proposal.effective_config, start: block.start } : undefined; };

  editor._presetSettingsStatus = block => editor._effectivePresetBlock?.(block, 0, "template") ? undefined : "unavailable";

  editor._retryPresetSettings = () => reviewApplication(host);

  editor._unlinkPresetBlock = async index => { const effective = editor._effectivePresetBlock?.(drafts[index], index, "template"); if (effective) updateApplicationBlock(host, group, drafts[index].slot_id!, { ...effective, slot_id: drafts[index].slot_id, action: effective.action ?? "set_temperature", hvac_mode: effective.hvac_mode ?? "" }); };

  return html`${drafts.map((block, index) => {

    const proposal = group.proposals[index];

    const pending = group.pending?.find(item => item.slot_id === block.slot_id);

    const manual = state.bindings[key]?.[block.slot_id!];

    return html`<fieldset class="template-assignment-slot" ?disabled=${host._applyingTemplateTargets}>

      <p class="hint">${manual ? host._t("templateAssignmentManual") : proposal.binding ? host._t(`templateApplicationOrigin_${proposal.origin}` as "templateApplicationOrigin_exact", { time: proposal.donor_start ?? "" }) : host._t("templateAssignmentPending")}</p>

      ${pending ? html`<p class="warning">${pending.message}</p>` : nothing}

      <div class="draft-list template-assignment-block-list">${renderDraftListHeader(editor, "template")}${renderEditableBlock(editor, block, index, "template")}</div>

    </fieldset>`;

  })}`;

}

