import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import type { TemplateResult } from "lit";
import { VelairApiClient } from "../api/client";
import type { VelairViewHost } from "../host-types";
import type { DraftScheduleBlock, ScheduleBlock, ScheduleResponse, TargetRangePolicyCorrections, TargetRangePolicyDestination, TargetRangePolicyPreview } from "../types";
import { cardStyles } from "../styles/card-styles";
import { draftBlockTemperatureError, draftBlocksFromScheduleBlocks, normalizeDraftBlocks } from "../domain/draft-blocks";
import { changeDraftTargetFormat, carryTargetDraft, targetFormatsForPolicy } from "../domain/target-format-policy";
import { normalizedPresetTemperatureDraft } from "../domain/preset-editor";
import { dismissDisconnectedInlineHelp, dismissInlineHelpWithin, renderInlineHelp } from "../views/inline-help";

import { targetReviewAffectedIndices, targetReviewDayKey, targetReviewGroupKey, targetReviewGroups, targetReviewUsesPreset, targetReviewZone } from "../domain/target-range-review";
import type { TargetRangeReviewDay as ReviewDay } from "../domain/target-range-review";

const REVIEW_GROUPS_PER_PAGE = 5;

/** Settings are drafts until the backend validates and atomically commits the review. */
export class VelairTargetRangeSettings extends LitElement {
  @property({ attribute: false }) host?: VelairViewHost;
  @property({ attribute: false }) data?: ScheduleResponse;
  @property({ attribute: false }) zoneIds?: string[];
  @property({ attribute: false }) renderRow?: (entityId: string, index: number, total: number, control: unknown, review: unknown, busy: boolean) => TemplateResult;
  @state() private _openEntity = "";
  @state() private _summaryFits: Record<string, boolean> = {};
  private _summaryObserver?: ResizeObserver;
  @state() private _entityId = "";
  @state() private _modes?: string[];
  @state() private _preview?: TargetRangePolicyPreview;
  @state() private _days: ReviewDay[] = [];
  @state() private _activeReviewGroup = "";
  @state() private _activeReviewDay = "";
  @state() private _reviewPage = 0;
  @state() private _busy = false;
  @state() private _error = "";
  private _revision = 0;
  private _checkedCorrections = "";
  private _previewDrafts = new Map<string, string>();
  private _draftDays = new Map<string, ReviewDay>();
  static styles = [cardStyles, css`
    :host { display: block; min-width: 0; }
    .checkbox-label { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; margin-inline-end: 16px; }
    .checkbox-label input { width: auto; }
    .target-range-review p { overflow-wrap: anywhere; }
  `];

  private _selectMode(entityId: string, mode: string, checked: boolean): void {
    if (this._busy || this.host?._settingsSaving) return;
    if (this._modes && this._entityId !== entityId && !window.confirm(this.host!._t("discardChanges"))) return;
    const startingReview = !this._modes || this._entityId !== entityId;
    const policy = this.data?.zones[entityId]?.target_format_policy;
    const selected = new Set(this._entityId === entityId && this._modes ? this._modes : policy?.configured_modes ?? policy?.range_modes ?? []);
    if (checked) selected.add(mode); else selected.delete(mode);
    if (this._entityId !== entityId || startingReview && this._revision !== (this.data?.configuration_revision ?? 0)) this._draftDays.clear();
    else this._rememberDrafts();
    this._days = []; this._activeReviewGroup = ""; this._activeReviewDay = ""; this._reviewPage = 0;
    this._entityId = entityId;
    if (startingReview) this._revision = this.data?.configuration_revision ?? 0;
    const saved = new Set(policy?.configured_modes ?? policy?.range_modes ?? []);
    const unchanged = saved.size === selected.size && [...selected].every((value) => saved.has(value));
    this._modes = unchanged ? undefined : [...selected];
    if (unchanged && this.data?.configuration_revision !== this._revision) this._draftDays.clear();
    this._preview = undefined;
    this._checkedCorrections = "";
    this._previewDrafts.clear();
    this._error = "";
  }

  private _targetError(block: DraftScheduleBlock, entityId: string): string | undefined {
    const host = this.host!;
    const [minTemperature, maxTemperature] = host._entityTemperatureLimits(entityId);
    const temperatureStep = host._entityTemperatureStep(entityId);
    const format = (value: number) => host._formatTemperatureLimit(value);
    if (!block.preset_key && (block.action || "set_temperature") === "set_temperature") {
      const range = block.target_temp_low !== undefined || block.target_temp_high !== undefined;
      const values = range ? [block.target_temp_low, block.target_temp_high] : [block.temperature];
      if (values.some((value) => value == null || String(value).trim() === "")) {
        const required = host._t(range ? "targetRangeMissingPair" : "targetRangeMissingSingle", {
          min: format(minTemperature), max: format(maxTemperature),
        });
        return typeof temperatureStep === "number" && Number.isFinite(temperatureStep) && temperatureStep > 0
          ? `${required} · ${host._t("invalidTemperatureStep", { step: format(temperatureStep) })}`
          : required;
      }
    }
    return draftBlockTemperatureError(normalizedPresetTemperatureDraft(block), {
      minTemperature, maxTemperature, temperatureStep,
      rangeError: host._t("invalidTemperatureRange", { min: format(minTemperature), max: format(maxTemperature) }),
      rangeOrderError: host._t("invalidTargetRangeOrder"),
      stepError: host._t("invalidTemperatureStep", { step: temperatureStep === undefined ? "" : format(temperatureStep) }),
    });
  }

  private _normalize(blocks: DraftScheduleBlock[], entityId = this._entityId) {
    return normalizeDraftBlocks(blocks, {
      duplicateStartError: () => this.host!._t("presetInvalidTemperature"), invalidStartError: () => this.host!._t("presetInvalidTemperature"),
      invalidTemperatureError: (_start, reason) => reason, invalidClimateOptionsError: () => this.host!._t("presetInvalidTemperature"),
      temperatureError: (block) => this._targetError(block, entityId),
    });
  }

  private _corrections(): TargetRangePolicyCorrections {
    const destinations = new Map<string, NonNullable<TargetRangePolicyCorrections["destinations"]>[number]>();
    for (const day of this._days) {
      const indices = targetReviewAffectedIndices(day);
      if (!indices.length) continue;
      const normalized = this._normalize(day.blocks, day.destination.entity_id);
      if (!normalized.ok) throw new Error(normalized.error);
      const destination = day.destination;
      const original = targetReviewZone(this.data, day);
      const link = original?.template_links?.[day.weekday];
      const destinationKey = targetReviewGroupKey(day);
      const local = destinations.get(destinationKey) ?? {
        source: destination.source, profile_key: destination.profile_key, entity_id: destination.entity_id,
        schedule: structuredClone(original?.schedule ?? {}),
        template_links: structuredClone(original?.template_links ?? {}),
      };
      const raw = original?.schedule[day.weekday] ?? [];
      const template = link ? this.data?.templates?.find((item) => item.key === link.template_key) : undefined;
      local.schedule![day.weekday] = normalized.blocks.map((block, index) => {
        const slot = template?.blocks.find((item) => item.start === block.start);
        const saved = link?.mode === "full" ? slot : slot?.slot_id ? link?.bindings?.[slot.slot_id] : undefined;
        const source = indices.includes(index) ? block : saved ? { ...saved, start: block.start } : raw[index] ?? block;
        const { slot_id: _slot, ...inline } = source as ScheduleBlock;
        return inline;
      });
      delete local.template_links?.[day.weekday];
      destinations.set(destinationKey, local);
    }
    return { destinations: [...destinations.values()] };
  }

  private _rememberDrafts(): void {
    for (const day of this._days) {
      const key = targetReviewDayKey(day);
      const cached = this._draftDays.get(key);
      const owned = targetReviewAffectedIndices(day);
      this._draftDays.set(key, { ...day, blocks: day.blocks.map((block, index) => owned.includes(index) ? block : cached?.blocks.find((previous) => previous.start === block.start) ?? block) });
    }
  }

  private _ingestPreview(preview: TargetRangePolicyPreview, discovery: boolean): void {
    this._rememberDrafts();
    if (discovery) this._days = [];
    this._preview = preview;
    for (const destination of preview.affected_destinations) {
      if (destination.entity_id !== this._entityId) continue;
      const weekdays = destination.weekday ? [destination.weekday] : [...new Set(destination.errors?.map((error) => error.weekday) ?? [])];
      for (const weekday of weekdays) {
        const key = targetReviewDayKey({ destination, weekday });
        const existing = this._days.find((day) => targetReviewDayKey(day) === key);
        const cached = existing ?? this._draftDays.get(key);
        const errors = [...(existing?.destination.errors ?? [])];
        for (const error of destination.errors ?? []) if (!errors.some((before) => before.weekday === error.weekday && before.block_index === error.block_index)) errors.push(error);
        const observed = draftBlocksFromScheduleBlocks(destination.schedule?.[weekday] ?? [], this.data?.temperature_unit);
        let blocks = existing?.blocks ?? observed.map((block, index) => errors.some((error) => error.weekday === weekday && error.block_index === index)
          ? cached?.blocks.find((previous) => previous.start === block.start) ?? block : block);
        blocks = blocks.map((block, index) => {
          const affected = errors.some((error) => error.weekday === weekday && error.block_index === index);
          if (!affected || !discovery && existing?.destination.errors?.some((error) => error.weekday === weekday && error.block_index === index)) return block;
          const choice = targetFormatsForPolicy(preview.policy, block.hvac_mode || undefined);
          return block.action === "set_temperature" && choice.formats.length === 1 ? changeDraftTargetFormat(block, choice.formats[0]) : block;
        });
        const day = { destination: { ...destination, errors }, weekday, blocks };
        this._days = existing ? this._days.map((item) => item === existing ? day : item) : [...this._days, day];
      }
    }
    this._previewDrafts = new Map(this._days.flatMap((day) => targetReviewAffectedIndices(day).map((index) => [`${targetReviewDayKey(day)}:${index}`, JSON.stringify(day.blocks[index])])));
    if (discovery) { this._activeReviewDay = ""; this._activeReviewGroup = ""; this._reviewPage = 0; }
  }

  private _showFailure(error: unknown): void {
    this._error = error instanceof Error ? error.message : String(error);
    const validated = this._reviewValidated();
    if (this._days.some((day) => this._reviewState(day, validated).invalid.length)) {
      this._error = this.host!._t("targetRangeReviewIncomplete");
      void this._nextPending(true);
    }
  }

  private async _check(): Promise<void> {
    if (!this.host?.hass || !this._modes || this._busy || this.host._settingsSaving) return;
    this._busy = true; this._error = "";
    try {
      if (this.data?.configuration_revision !== this._revision) throw new Error(this.host._t("targetRangeStale"));
      const preview = await new VelairApiClient(this.host.hass).previewTargetRangePolicy({
        entity_id: this._entityId, target_range_modes: [...this._modes], expected_revision: this._revision,
      });
      if (this.data?.configuration_revision !== this._revision || preview.configuration_revision !== this._revision) throw new Error(this.host._t("targetRangeStale"));
      this._checkedCorrections = "";
      this._ingestPreview(preview, true);
    } catch (error) { this._showFailure(error); }
    finally { this._busy = false; }
  }

  private async _apply(): Promise<void> {
    if (!this.host?.hass || !this._preview || this._busy || this.host._settingsSaving || !this._modes) return;
    this._busy = true; this._error = "";
    try {
      if (this.data?.configuration_revision !== this._revision) throw new Error(this.host._t("targetRangeStale"));
      const request = { entity_id: this._entityId, target_range_modes: [...this._modes], expected_revision: this._revision, corrections: this._corrections() };
      const client = new VelairApiClient(this.host.hass);
      const preview = await client.previewTargetRangePolicy(request);
      if (this.data?.configuration_revision !== request.expected_revision || preview.configuration_revision !== request.expected_revision) throw new Error(this.host._t("targetRangeStale"));
      this._checkedCorrections = "";
      this._ingestPreview(preview, false);
      if (!preview.can_apply || preview.temporary_blockers.length || preview.affected_destinations.length) return;
      if (JSON.stringify(this._corrections()) !== JSON.stringify(request.corrections)) throw new Error(this.host._t("targetRangeStale"));
      this._checkedCorrections = JSON.stringify(request.corrections);
      const data = await client.applyTargetRangePolicy(request);
      this.host._applyScheduleData(data);
      this._modes = undefined; this._preview = undefined; this._days = []; this._draftDays.clear();
    } catch (error) { this._showFailure(error); }
    finally { this._busy = false; }
  }

  private _update(dayIndex: number, blockIndex: number, field: keyof DraftScheduleBlock, value: string): void {
    if (this._busy || this.host?._settingsSaving) return;
    this._days = this._days.map((day, index) => index !== dayIndex ? day : { ...day, blocks: day.blocks.map((block, index) => {
      if (index !== blockIndex) return block;
      const effective = day.blocks[blockIndex];
      let next = carryTargetDraft(block, field === "hvac_mode"
        ? { ...effective, hvac_mode: value === "temperature_only" ? "" : value, temperature_only: value === "temperature_only" ? true : undefined }
        : { ...effective, [field]: value });
      if (field === "hvac_mode") {
        const policy = day.destination.entity_id === this._entityId ? this._preview?.policy : this.data?.zones[day.destination.entity_id]?.target_format_policy;
        const choice = policy ? targetFormatsForPolicy(policy, next.hvac_mode || undefined) : undefined;
        if (choice?.formats.length === 1) next = changeDraftTargetFormat(next, choice.formats[0]);
      }
      return next;
    }) });
    this._checkedCorrections = "";
  }

  private _formatAction(day: ReviewDay, dayIndex: number, block: DraftScheduleBlock, blockIndex: number) {
    if (block.action !== "set_temperature") return nothing;
    const policy = day.destination.entity_id === this._entityId ? this._preview?.policy : this.data?.zones[day.destination.entity_id]?.target_format_policy;
    const choice = policy ? targetFormatsForPolicy(policy, block.hvac_mode || undefined) : undefined;
    const range = block.target_temp_low !== undefined || block.target_temp_high !== undefined;
    if (choice && choice.formats.length === 1 && choice.formats[0] === (range ? "range" : "single")) return nothing;
    return html`<button type="button" class="command-button compact target-format-action" ?disabled=${this._busy || this.host?._settingsSaving} @click=${() => {
      if (this._busy || this.host?._settingsSaving) return;
      this._days = this._days.map((item, index) => index !== dayIndex ? item : { ...item, blocks: item.blocks.map((value, index) => index !== blockIndex ? value : changeDraftTargetFormat(item.blocks[blockIndex], range ? "single" : "range")) });
      this._checkedCorrections = "";
    }}><ha-icon icon=${range ? "mdi:thermometer" : "mdi:thermometer-lines"}></ha-icon><span>${this.host!._t(range ? "useSingleTarget" : "useRangeTarget")}</span></button>`;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("pointerdown", this._closeOutside, true);
    document.addEventListener("focusin", this._closeOutside, true);
    if (typeof ResizeObserver !== "undefined") this._summaryObserver = new ResizeObserver(() => this._fitSummaries());
  }

  public disconnectedCallback(): void {
    dismissInlineHelpWithin(this);
    document.removeEventListener("pointerdown", this._closeOutside, true);
    document.removeEventListener("focusin", this._closeOutside, true);
    this._summaryObserver?.disconnect();
    super.disconnectedCallback();
  }

  protected updated(): void {
    dismissDisconnectedInlineHelp();
    this._summaryObserver?.disconnect();
    this.renderRoot.querySelectorAll(".target-range-trigger").forEach((trigger) => this._summaryObserver?.observe(trigger));
    this._fitSummaries();
  }

  private _fitSummaries(): void {
    const next = { ...this._summaryFits };
    let changed = false;
    for (const dropdown of this.renderRoot.querySelectorAll<HTMLDetailsElement>("details[data-target-range-entity]")) {
      const trigger = dropdown.querySelector<HTMLElement>(".target-range-trigger");
      const measure = dropdown.querySelector<HTMLElement>(".target-range-measure > span");
      const entityId = dropdown.dataset.targetRangeEntity!;
      if (!trigger || !measure || !trigger.clientWidth) continue;
      const style = getComputedStyle(trigger);
      const available = trigger.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
      const fits = measure.getBoundingClientRect().width <= available;
      if (next[entityId] !== fits) { next[entityId] = fits; changed = true; }
    }
    if (changed) this._summaryFits = next;
  }

  private _closeOutside = (event: Event): void => {
    if (!this._openEntity) return;
    if (!event.composedPath().some((node) => node instanceof HTMLElement && node.dataset.targetRangeEntity === this._openEntity)) this._openEntity = "";
  };

  private _dropdown(entityId: string): HTMLDetailsElement | undefined {
    return [...this.renderRoot.querySelectorAll<HTMLDetailsElement>("details[data-target-range-entity]")].find((element) => element.dataset.targetRangeEntity === entityId);
  }

  private async _dropdownKey(event: KeyboardEvent, entityId: string): Promise<void> {
    if (event.key === "Escape") {
      event.preventDefault(); event.stopPropagation(); this._openEntity = "";
      this._dropdown(entityId)?.querySelector<HTMLElement>("summary")?.focus();
    } else if (!this._busy && !this.host?._settingsSaving && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      this._openEntity = entityId;
      await this.updateComplete;
      const inputs = [...(this._dropdown(entityId)?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]') ?? [])];
      const current = inputs.indexOf(event.target as HTMLInputElement);
      const next = current < 0 ? event.key === "ArrowDown" ? 0 : inputs.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + inputs.length) % inputs.length;
      inputs[next]?.focus();
    }
  }

  private _policyControl(entityId: string) {
    const host = this.host!;
    const policy = this.data?.zones[entityId]?.target_format_policy;
    const busy = this._busy || this.host?._settingsSaving;
    const selected = this._entityId === entityId && this._modes ? this._modes : policy?.configured_modes ?? policy?.range_modes ?? [];
    const diagnostic = policy?.invalid_modes.length || (policy?.kind === "unknown" && policy.configured_modes !== null)
      ? html`<details class="target-range-diagnostic"><summary>${host._t(policy.kind === "unknown" ? "targetRangeUnknown" : "targetRangeInvalidModes")}</summary>
          ${policy.invalid_modes.map((mode) => html`<span>${host._modeLabel(mode)} ${policy.kind === "mixed" ? html`<button class="icon-button" type="button" title=${host._t("remove")} aria-label=${host._t("targetRangeRemoveMode", { mode: host._modeLabel(mode) })} ?disabled=${busy} @click=${() => this._selectMode(entityId, mode, false)}><ha-icon icon="mdi:close-circle-outline"></ha-icon></button>` : nothing}</span>`)}
          ${policy.kind !== "mixed" ? html`<p>${host._t("targetRangePolicyUnavailable")}</p>` : nothing}
        </details>` : nothing;
    if (policy?.kind !== "mixed") return diagnostic;
    const modes = Object.keys(policy.formats_by_mode).filter((mode) => mode !== "off");
    const labelId = `target-range-label-${entityId.replace(/[^a-z0-9_-]/gi, "-")}`;
    const first = selected[0] ? host._modeLabel(selected[0]) : host._t("targetRangeModesNone");
    const fullSelection = selected.map((mode) => host._modeLabel(mode)).join(", ");
    const summary = selected.length > 1 ? this._summaryFits[entityId] ? fullSelection
      : host._t("targetRangeModesSeveral", { mode: first, count: selected.length - 1 }) : first;
    return html`<div class="settings-target-range-modes">
      <div class="settings-policy-heading"><span class="label" id=${labelId}>${host._t("targetRangeModes")}</span>${renderInlineHelp(`${labelId}-help`, host._t("targetRangeModes"), host._t("targetRangePolicyHelp"))}</div>
      <details class="target-range-dropdown select-wrap" data-target-range-entity=${entityId} .open=${this._openEntity === entityId}
        @keydown=${(event: KeyboardEvent) => this._dropdownKey(event, entityId)}>
        <summary class="target-range-trigger" role="button" aria-label=${`${host._t("targetRangeModes")}: ${selected.map((mode) => host._modeLabel(mode)).join(", ") || first}`} aria-expanded=${String(this._openEntity === entityId)} aria-controls=${`${labelId}-options`} aria-disabled=${String(Boolean(busy))} title=${selected.map((mode) => host._modeLabel(mode)).join(", ") || first}
          @click=${(event: Event) => { event.preventDefault(); if (!busy) this._openEntity = this._openEntity === entityId ? "" : entityId; }}>
          <span>${summary}</span><span class="target-range-measure" aria-hidden="true"><span>${fullSelection || first}</span></span>
        </summary>
        <div class="target-range-options" id=${`${labelId}-options`} role="group" aria-labelledby=${labelId}>
          ${modes.map((mode) => html`<label class="checkbox-label"><input type="checkbox" .checked=${selected.includes(mode)} ?disabled=${busy} @change=${(event: Event) => {
            const input = event.currentTarget as HTMLInputElement;
            this._selectMode(entityId, mode, input.checked);
            input.checked = (this._entityId === entityId && this._modes ? this._modes : policy.configured_modes ?? policy.range_modes).includes(mode);
          }}><span>${host._modeLabel(mode)}</span></label>`)}
        </div>
      </details>${diagnostic}
    </div>`;
  }

  private _groupLabel(destination: TargetRangePolicyDestination): string {
    return destination.source === "default" ? this.host!._t("modeDefault")
      : this.data?.profiles?.find((profile) => profile.key === destination.profile_key)?.name ?? destination.profile_key ?? this.host!._t("profiles");
  }

  private _expectedFormats(day: ReviewDay, index: number, block = day.blocks[index]): string[] {
    if (!this._preview?.policy || this._preview.policy.uncertain) return [];
    return targetFormatsForPolicy(this._preview.policy, block.hvac_mode || undefined).formats;
  }

  private _reviewValidated(): boolean {
    if (!(this._preview?.can_apply && this._checkedCorrections && this.data?.configuration_revision === this._revision)) return false;
    return this._days.every((day) => this._normalize(day.blocks, day.destination.entity_id).ok);
  }

  private _reviewState(day: ReviewDay, validated = this._reviewValidated()) {
    const indices = targetReviewAffectedIndices(day);
    const invalid = indices.filter((index) => {
      const block = day.blocks[index];
      const expected = this._expectedFormats(day, index, block);
      const shape = block.target_temp_low !== undefined || block.target_temp_high !== undefined ? "range" : "single";
      return !this._normalize([block], day.destination.entity_id).ok || expected.length > 0 && !expected.includes(shape);
    });
    const live = (this._preview?.affected_destinations ?? []).filter((destination) => targetReviewGroupKey({ ...day, destination }) === targetReviewGroupKey(day))
      .flatMap((destination) => destination.errors ?? []).filter((error) => error.weekday === day.weekday
        && this._previewDrafts.get(`${targetReviewDayKey(day)}:${error.block_index}`) === JSON.stringify(day.blocks[error.block_index]));
    const pending = [...new Set([...invalid, ...live.map((error) => error.block_index)])];
    return { indices, invalid, live, pending: validated ? [] : pending, status: validated ? "targetRangeReviewValidated" : invalid.length ? "targetRangeReviewNeedsValues" : live.length ? "targetRangeReviewNeedsReview" : "targetRangeReviewReadySave" } as const;
  }

  private async _nextPending(first = false): Promise<void> {
    const validated = this._reviewValidated();
    const days = this._days.filter((day) => this._reviewState(day, validated).pending.length);
    if (!days.length) return;
    const current = days.findIndex((day) => targetReviewDayKey(day) === this._activeReviewDay);
    const day = days[first ? 0 : (current + 1) % days.length];
    await this._openReviewDay(day);
  }

  private async _openReviewDay(day: ReviewDay): Promise<void> {
    const groups = targetReviewGroups(this._days);
    const groupIndex = groups.findIndex((group) => group.key === targetReviewGroupKey(day));
    this._reviewPage = Math.floor(groupIndex / REVIEW_GROUPS_PER_PAGE);
    this._activeReviewGroup = targetReviewGroupKey(day); this._activeReviewDay = targetReviewDayKey(day);
    await this.updateComplete;
    const editor = [...this.renderRoot.querySelectorAll<HTMLElement>("[data-review-day]")].find((element) => element.dataset.reviewDay === this._activeReviewDay);
    (editor?.querySelector<HTMLElement>('[aria-invalid="true"]:not([disabled])') ?? editor?.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled]), summary"))?.focus();
  }

  private _renderDayEditor(day: ReviewDay, dayIndex: number) {
    const host = this.host!;
    const disabled = this._busy || host._settingsSaving;
    const indices = targetReviewAffectedIndices(day);
    const link = targetReviewZone(this.data, day)?.template_links?.[day.weekday];
    const state = this._reviewState(day);
    const requirements = new Set<string>();
    for (const index of state.invalid) {
      const block = day.blocks[index];
      const expected = this._expectedFormats(day, index, block);
      const empty = [block.temperature, block.target_temp_low, block.target_temp_high].some((value) => value === "");
      const shape = block.target_temp_low !== undefined || block.target_temp_high !== undefined ? "range" : "single";
      if (expected.length === 1 && (empty || !expected.includes(shape))) requirements.add(host._t(expected[0] === "range" ? "targetRangeReviewRequirePair" : "targetRangeReviewRequireSingle", { mode: block.temperature_only ? host._t("temperatureOnly") : block.hvac_mode ? host._modeLabel(block.hvac_mode) : host._t("keep") }));
    }
    return html`<div class="target-review-day-editor" role="region" aria-labelledby=${`target-review-day-${dayIndex}`}>
      ${[...requirements].map((message) => html`<p class="target-review-guidance"><ha-icon icon="mdi:information-outline"></ha-icon><span>${message}</span></p>`)}
      ${link ? html`<p class="target-review-guidance warning"><ha-icon icon="mdi:link-off"></ha-icon><span>${host._t("targetRangeUnlinkDay")}</span></p>` : indices.some((index) => targetReviewUsesPreset(this.data, day, index)) ? html`<p class="target-review-guidance warning"><ha-icon icon="mdi:link-off"></ha-icon><span>${host._t("targetRangeUnlinkPresets")}</span></p>` : nothing}
      <div class="target-review-blocks">${repeat(indices, (index) => index, (index) => {
        const block = day.blocks[index];
        const range = block.target_temp_low !== undefined || block.target_temp_high !== undefined;
        const invalid = state.invalid.includes(index);
        const [minimum, maximum] = host._entityTemperatureLimits(day.destination.entity_id);
        const step = host._entityTemperatureStep(day.destination.entity_id);
        const targetError = this._targetError(block, day.destination.entity_id);
        const reviewError = !targetError && state.live.some((error) => error.block_index === index)
          ? host._t("targetRangeBlockNeedsReview") : undefined;
        const modes = Object.keys(this._preview?.policy.formats_by_mode ?? this.data?.zones[day.destination.entity_id]?.target_format_policy?.formats_by_mode ?? {});
        return html`<section class=${`target-review-block ${invalid ? "invalid" : ""}`} data-review-block=${index}>
          <header><strong>${block.start}</strong></header>
          <div class="target-review-block-fields"><label><span class="label">${host._t("mode")}</span><span class="select-wrap"><select aria-label=${host._t("mode")} .value=${block.temperature_only ? "temperature_only" : block.hvac_mode} ?disabled=${disabled}
            @change=${(event: Event) => this._update(dayIndex, index, "hvac_mode", (event.currentTarget as HTMLSelectElement).value)}>
            <option value="" .selected=${!block.hvac_mode && !block.temperature_only}>${host._t("keep")}</option><option value="temperature_only" .selected=${block.temperature_only === true}>${host._t("temperatureOnly")}</option>
            ${modes.map((mode) => html`<option value=${mode} .selected=${!block.temperature_only && block.hvac_mode === mode}>${host._modeLabel(mode)}</option>`)}
          </select></span></label>
          ${block.action === "set_temperature" ? (range ? ["target_temp_low", "target_temp_high"] as const : ["temperature"] as const).map((field) => html`<label><span class="label">${host._t(field === "temperature" ? "temp" : field === "target_temp_low" ? "minimumShort" : "maximumShort")}</span><input
            type="number" min=${minimum} max=${maximum} step=${step ?? "any"} required .value=${String(block[field] ?? "")} ?disabled=${disabled} aria-invalid=${String(Boolean(this._targetError({ action: "set_temperature", start: block.start, hvac_mode: block.hvac_mode, temperature: block[field] }, day.destination.entity_id)) || range && block.target_temp_low !== "" && block.target_temp_high !== "" && Number(block.target_temp_low) > Number(block.target_temp_high))}
            @input=${(event: Event) => this._update(dayIndex, index, field, (event.currentTarget as HTMLInputElement).value)}></label>`) : nothing}</div>
          ${targetError || reviewError ? html`<p class="target-review-guidance error target-review-value-error"><ha-icon icon="mdi:alert-circle-outline"></ha-icon><span>${targetError || reviewError}</span></p>` : nothing}
          ${this._formatAction(day, dayIndex, block, index)}
        </section>`;
      })}</div>
    </div>`;
  }

  private _renderReviewWarnings() {
    const host = this.host!;
    const otherClimates = [...new Set((this._preview?.affected_destinations ?? []).filter((destination) => destination.entity_id !== this._entityId).map((destination) => destination.entity_id))];
    const blockers = new Map((this._preview?.temporary_blockers ?? []).map((blocker) => [`${blocker.entity_id}:${blocker.type}`, blocker]));
    const automaticActions = [...new Set((this._preview?.automatic_actions ?? []).filter((action) => action.type === "stop_room_assist").map((action) => action.entity_id))];
    const blockerLabels = { boost: "boost", pause: "pause", previous_state: "targetRangeBlockerRestoration", preserved_state: "targetRangeBlockerRestoration", room_assist: "targetRangeBlockerRoomAssist", preconditioning: "targetRangeBlockerPreparation", preconditioning_target: "targetRangeBlockerPreparation" } as const;
    return html`${otherClimates.length ? html`<details class="resource-section target-review-other-climates"><summary><ha-icon icon="mdi:alert-outline"></ha-icon><span>${host._t("targetRangeOtherClimates", { count: otherClimates.length })}</span><ha-icon class="resource-section-chevron" icon="mdi:chevron-down"></ha-icon></summary><p>${host._t("targetRangeOtherClimatesHelp")}</p><ul>${otherClimates.map((entityId) => html`<li>${host._friendlyEntityName(entityId)}</li>`)}</ul></details>` : nothing}
      ${automaticActions.map((entityId) => html`<p class="target-review-guidance target-review-automatic-action"><ha-icon icon="mdi:information-outline"></ha-icon><span><strong>${host._friendlyEntityName(entityId)} · ${host._t("targetRangeBlockerRoomAssist")}</strong><br>${host._t("targetRangeStopRoomAssist")}</span></p>`)}
      ${[...blockers.values()].map((blocker) => html`<p class="target-review-guidance warning"><ha-icon icon="mdi:pause-circle-outline"></ha-icon><span><strong>${host._friendlyEntityName(blocker.entity_id)} · ${host._t(blockerLabels[blocker.type as keyof typeof blockerLabels] ?? "targetRangeBlockerActive")}</strong><br>${host._t("targetRangeTemporary")}</span></p>`)}`;
  }

  private _renderReview() {
    if (!this._modes) return nothing;
    const host = this.host!;
    const disabled = this._busy || host._settingsSaving;
    const groups = targetReviewGroups(this._days);
    const validated = this._reviewValidated();
    const states = new Map(this._days.map((day) => [targetReviewDayKey(day), this._reviewState(day, validated)]));
    const total = [...states.values()].reduce((sum, state) => sum + state.indices.length, 0);
    const pending = [...states.values()].reduce((sum, state) => sum + state.pending.length, 0);
    const pageCount = Math.max(1, Math.ceil(groups.length / REVIEW_GROUPS_PER_PAGE));
    const page = Math.min(this._reviewPage, pageCount - 1);
    return html`<section class="target-range-review">
      <header class="target-review-heading"><ha-icon icon="mdi:thermometer-lines"></ha-icon><h3>${host._t("targetRangeReview")}</h3><span class=${`pill ${validated ? "" : "warning"}`}>${host._t(validated ? "targetRangeReviewValidated" : "unsaved")}</span><p>${host._t(validated ? "targetRangeReviewValidatedHelp" : this._preview ? "targetRangeReviewHelp" : "targetRangeReviewDraftHelp")}</p></header>
      ${this._days.length ? html`<div class="target-review-counts" role="status"><span class="pill muted">${host._t("targetRangeReviewSources", { count: groups.length })}</span><span class="pill muted">${host._t("targetRangeReviewDays", { count: this._days.length })}</span><span class="pill muted">${host._t("targetRangeReviewBlocks", { count: total })}</span><strong>${host._t("targetRangeReviewPending", { count: pending })}</strong></div>
        <div class="target-review-navigation">${pageCount > 1 ? html`<span>${host._t("targetRangeReviewPage", { page: page + 1, count: pageCount })}</span>` : nothing}<button class="command-button compact target-review-next-pending" type="button" ?disabled=${disabled || !pending} @click=${() => this._nextPending()}><ha-icon icon="mdi:arrow-right-circle-outline"></ha-icon><span>${host._t("targetRangeReviewNextPending")}</span></button></div>
        <div class="target-review-groups">${repeat(groups.slice(page * REVIEW_GROUPS_PER_PAGE, (page + 1) * REVIEW_GROUPS_PER_PAGE), (group) => group.key, (group) => {
          const groupPending = group.days.reduce((sum, item) => sum + (states.get(item.key)?.pending.length ?? 0), 0);
          const open = this._activeReviewGroup === group.key;
          return html`<details class="resource-section target-review-group" data-review-group=${group.key} .open=${open}><summary aria-expanded=${String(open)} @click=${(event: Event) => { event.preventDefault(); this._activeReviewGroup = open ? "" : group.key; }}><ha-icon icon=${group.destination.source === "default" ? "mdi:calendar-clock" : "mdi:layers-outline"}></ha-icon><span>${this._groupLabel(group.destination)}</span><small class=${`pill ${groupPending ? "warning" : "muted"}`}>${host._t("targetRangeReviewPending", { count: groupPending })}</small><ha-icon class="resource-section-chevron" icon="mdi:chevron-down"></ha-icon></summary>
            ${open ? html`<div class="target-review-days">${repeat(group.days, (item) => item.key, ({ day, index, key }) => {
              const active = this._activeReviewDay === key;
              const state = states.get(key)!;
              return html`<details class="resource-section target-review-day" data-review-day=${key} .open=${active}><summary id=${`target-review-day-${index}`} aria-expanded=${String(active)} @click=${(event: Event) => { event.preventDefault(); this._activeReviewDay = active ? "" : key; }}><ha-icon icon="mdi:calendar-outline"></ha-icon><span>${host._weekdayName(day.weekday)} · ${host._t("targetRangeReviewBlocks", { count: state.indices.length })}</span><small class=${`pill ${state.pending.length ? "warning" : state.status === "targetRangeReviewReadySave" ? "target-review-ready" : "muted"}`}>${host._t(state.status)}</small><ha-icon class="resource-section-chevron" icon="mdi:chevron-down"></ha-icon></summary>${active ? this._renderDayEditor(day, index) : nothing}</details>`;
            })}</div>` : nothing}</details>`;
        })}</div>
        ${pageCount > 1 ? html`<nav class="target-review-pagination" aria-label=${host._t("targetRangeReviewPages")}><button class="command-button compact" type="button" ?disabled=${page === 0 || disabled} @click=${() => { this._reviewPage = page - 1; }}><ha-icon icon="mdi:chevron-left"></ha-icon><span>${host._t("targetRangeReviewPreviousPage")}</span></button><span>${host._t("targetRangeReviewPage", { page: page + 1, count: pageCount })}</span><button class="command-button compact" type="button" ?disabled=${page >= pageCount - 1 || disabled} @click=${() => { this._reviewPage = page + 1; }}><span>${host._t("targetRangeReviewNextPage")}</span><ha-icon icon="mdi:chevron-right"></ha-icon></button></nav>` : nothing}` : nothing}
      ${this.data?.configuration_revision !== this._revision ? html`<p class="target-review-guidance warning"><ha-icon icon="mdi:alert-outline"></ha-icon><span>${host._t("targetRangeStale")}</span></p>` : nothing}
      ${this._renderReviewWarnings()}
      <div class="target-review-actions"><button class="command-button secondary target-review-cancel" type="button" ?disabled=${disabled} @click=${() => { this._modes = undefined; this._preview = undefined; this._days = []; this._draftDays.clear(); this._activeReviewDay = ""; this._activeReviewGroup = ""; this._reviewPage = 0; }}><ha-icon icon="mdi:close"></ha-icon><span>${host._t("cancel")}</span></button>${this._preview ? html`<button class="command-button primary target-review-apply" type="button" ?disabled=${disabled || this.data?.configuration_revision !== this._revision || !this._days.every((day) => this._normalize(day.blocks, day.destination.entity_id).ok)} @click=${this._apply}><ha-icon icon="mdi:content-save-outline"></ha-icon><span>${host._t("save")}</span></button>` : html`<button class="command-button success target-review-check" type="button" ?disabled=${disabled} @click=${this._check}><ha-icon icon=${this._busy ? "mdi:loading" : "mdi:check-decagram-outline"}></ha-icon><span>${host._t("targetRangePreview")}</span></button>`}</div>
      ${this._error ? html`<p class="target-review-guidance error" role="alert"><ha-icon icon="mdi:alert-circle-outline"></ha-icon><span>${this._error}</span></p>` : nothing}
    </section>`;
  }

  protected render() {
    if (!this.host || !this.data) return nothing;
    const entityIds = this.zoneIds ?? Object.keys(this.data.zones);
    return html`<div class="settings-zone-list">${repeat(entityIds, (entityId) => entityId, (entityId, index) => {
      const control = this._policyControl(entityId);
      const review = this._entityId === entityId ? this._renderReview() : nothing;
      return this.renderRow ? this.renderRow(entityId, index, entityIds.length, control, review, this._busy)
        : html`<div class="settings-zone-row"><strong>${this.host!._friendlyEntityName(entityId)}</strong>${control}${review}</div>`;
    })}</div>
    ${this._modes && !entityIds.includes(this._entityId) ? html`<section class="target-range-orphan-review"><p class="warning">${this.host._t("targetRangeStale")}</p>${this._renderReview()}</section>` : nothing}`;
  }
}

if (!customElements.get("velair-target-range-settings")) customElements.define("velair-target-range-settings", VelairTargetRangeSettings);
