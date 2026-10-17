import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { VelairApiClient } from "../api/client";
import { draftBlocksFromScheduleBlocks, normalizeDraftBlocks, updateDraftBlock } from "../domain/draft-blocks";
import { normalizedPresetTemperatureDraft, presetHvacModes, presetOptionSuggestions, presetTemperatureError, setPresetTargetType } from "../domain/preset-editor";
import { presetLibraryStyles } from "../styles/preset-library-styles";
import { cardStyles } from "../styles/card-styles";
import { backendErrorMessage } from "../domain/backend-errors";
import { availableBlockPresets } from "../domain/resource-display";
import { renderResourceSectionSummary, renderResourceUsageGroups } from "../views/resource-usages";
import { directPresetUseCount, groupPresetUsages, splitPresetUsages } from "../domain/preset-usages";
import type { VelairViewHost } from "../host-types";
import type { BlockPreset, DraftScheduleBlock, HomeAssistant, ScheduleResponse } from "../types";
import { presetConfigurationSummary } from "../views/schedule-view";

export class VelairPresetLibrary extends LitElement {
  @property({ attribute: false }) host?: VelairViewHost;
  @property({ attribute: false }) data?: ScheduleResponse;
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) draft?: import("../types").PresetLibraryDraft;
  @state() private _key = "";
  @state() private _name = "";
  @state() private _reference = "";
  @state() private _block?: DraftScheduleBlock;
  @state() private _error = "";
  @state() private _busy = false;
  @state() private _previewConfiguration?: import("../types").ScheduleBlock;
  @state() private _previewError = "";
  @state() private _previewBusy = false;
  @state() private _copyStatus: "" | "success" | "error" = "";
  private _revision?: number;
  private _baseline?: string;
  private _previewRequest = 0;
  static styles = [cardStyles, presetLibraryStyles];

  protected willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("_key")) this._copyStatus = "";
    if (changed.has("draft") && this.draft && !this._block) {
      this._key = this.draft.key; this._name = this.draft.name; this._reference = this.draft.reference; this._block = structuredClone(this.draft.block); this._revision = this.draft.revision;
      const saved = availableBlockPresets(this.data).find((preset) => preset.key === this._key);
      this._baseline = this.draft.baseline === null ? undefined : this.draft.baseline ?? (saved ? this._fingerprint(saved.name, draftBlocksFromScheduleBlocks([{ start: "00:00", ...saved.config }], this.data?.temperature_unit)[0]) : undefined);
    }
    if (changed.has("_block") || changed.has("_reference") || changed.has("_key")) {
      this._previewConfiguration = undefined;
      this._previewError = "";
      this._previewBusy = false;
      ++this._previewRequest;
    }
  }
  protected updated(changed: Map<string, unknown>): void {
    if (["_key", "_name", "_reference", "_block"].some((key) => changed.has(key))) {
      const draft = this._block ? { key: this._key, name: this._name, reference: this._reference, block: this._block, revision: this._revision, baseline: this._baseline ?? null } : undefined;
      this.dispatchEvent(new CustomEvent("velair-dirty-changed", { bubbles: true, composed: true, detail: { dirty: this._isDirty, draft } }));
    }
  }

  public editPreset(key: string): void {
    const preset = availableBlockPresets(this.data).find((item) => item.key === key);
    if (!preset) return;
    this._edit(preset);
  }
  private _cancel(): void {
    if (this._busy) return;
    if (this._isDirty && !window.confirm(this.host!._t("discardChanges"))) return;
    this._block = undefined;
    this._error = "";
    this.dispatchEvent(new CustomEvent("velair-dirty-changed", { bubbles: true, composed: true, detail: { dirty: false } }));
  }

  private _edit(preset?: BlockPreset) {
    if (this._busy) return;
    if (this._block && preset?.key === this._key) return;
    if (this._isDirty && !window.confirm(this.host!._t("discardChanges"))) return;
    this._key = preset?.key ?? `preset_${crypto.randomUUID()}`;
    this._name = preset?.name ?? "";
    this._block = draftBlocksFromScheduleBlocks([{ start: "00:00", ...(preset?.config ?? { action: "set_temperature", temperature: this.data?.temperature_unit === "°F" ? 68 : 20 }) }], this.data?.temperature_unit)[0];
    this._baseline = preset ? this._fingerprint(this._name, this._block) : undefined;
    this._revision = this.data?.configuration_revision;
    this._error = "";
  }

  private _fingerprint(name: string, block: DraftScheduleBlock): string {
    const normalized = normalizeDraftBlocks([normalizedPresetTemperatureDraft(block)], {
      duplicateStartError: () => "invalid", invalidStartError: () => "invalid", invalidTemperatureError: () => "invalid",
      invalidClimateOptionsError: () => "invalid", temperatureError: (item) => presetTemperatureError(item, "invalid"),
    });
    const config = normalized.ok ? normalized.blocks[0] : block;
    const fields = Object.entries(config).filter(([field, value]) => !["start", "slot_id"].includes(field) && value !== undefined).sort(([left], [right]) => left.localeCompare(right));
    return JSON.stringify({ name: name.trim(), valid: normalized.ok, config: Object.fromEntries(fields) });
  }

  private get _isDirty(): boolean {
    return Boolean(this._block && (this._baseline === undefined || this._fingerprint(this._name, this._block) !== this._baseline));
  }

  private async _save() {
    if (!this.hass || !this.host || !this._block || this._busy) return;
    const normalized = normalizeDraftBlocks([normalizedPresetTemperatureDraft(this._block)], {
      duplicateStartError: () => "", invalidStartError: () => "",
      invalidTemperatureError: (_start, reason) => reason,
      invalidClimateOptionsError: () => this.host!._t("climateOptionsRequiredAt", { start: "" }),
      temperatureError: (block) => presetTemperatureError(block, this.host!._t("presetInvalidTemperature")),
    });
    if (!normalized.ok) { this._error = normalized.error; return; }
    this._busy = true;
    try {
      const { start: _start, slot_id: _slot, ...config } = normalized.blocks[0];
      const response = await new VelairApiClient(this.hass).setBlockPreset({ key: this._key, name: this._name.trim(), config }, this._revision);
      this.host._applyScheduleData(response);
      this._block = undefined;
      this.dispatchEvent(new CustomEvent("velair-dirty-changed", { bubbles: true, composed: true, detail: { dirty: false } }));
    } catch (error) { this._error = backendErrorMessage(error, this.host._t("unableSave")); }
    finally { this._busy = false; }
  }

  private async _previewReference(): Promise<void> {
    await this.updateComplete;
    if (!this.hass || !this.host || !this._block || !this._reference || this._busy || this._previewBusy) return;
    const request = ++this._previewRequest;
    const reference = this._reference;
    const draft = JSON.stringify(this._block);
    const current = () => request === this._previewRequest && reference === this._reference && draft === JSON.stringify(this._block);
    const normalized = normalizeDraftBlocks([normalizedPresetTemperatureDraft(this._block)], {
      duplicateStartError: () => "", invalidStartError: () => "",
      invalidTemperatureError: (_start, reason) => reason,
      invalidClimateOptionsError: () => this.host!._t("climateOptionsRequiredAt", { start: "" }),
      temperatureError: (block) => presetTemperatureError(block, this.host!._t("presetInvalidTemperature")),
    });
    this._previewConfiguration = undefined;
    this._previewError = "";
    if (!normalized.ok) { this._previewError = normalized.error; return; }
    this._previewBusy = true;
    try {
      const preview = await new VelairApiClient(this.hass).previewDailySchedule(reference, "monday", { blocks: normalized.blocks });
      if (!current()) return;
      if (!preview.blocks?.[0]) throw new Error(this.host._t("presetCompatibilityError"));
      this._previewConfiguration = preview.blocks[0];
    } catch (error) { if (current()) this._previewError = backendErrorMessage(error, this.host._t("presetCompatibilityError")); }
    finally { if (current()) this._previewBusy = false; }
  }

  private async _delete(preset: BlockPreset) {
    if (!this.hass || !this.host || this._busy || this.data?.resource_usages?.presets?.[preset.key]?.length || !window.confirm(this.host._t("deletePresetConfirmation", { name: preset.name }))) return;
    this._busy = true;
    try {
      this.host._applyScheduleData(await new VelairApiClient(this.hass).deleteBlockPreset(preset.key, this.data?.configuration_revision));
      if (this._key === preset.key) {
        this._key = "";
        this._block = undefined;
        this._baseline = undefined;
      }
    }
    catch (error) { this._error = backendErrorMessage(error, this.host._t("unableSave")); }
    finally { this._busy = false; }
  }

  private _update(field: keyof DraftScheduleBlock, value: string): void {
    if (this._busy) return;
    this._block = updateDraftBlock([this._block!], 0, field, value)[0];
  }

  private async _copyAutomationId(): Promise<void> {
    const key = this._key;
    if (!availableBlockPresets(this.data).some((preset) => preset.key === key)) return;
    this._copyStatus = "";
    try {
      await navigator.clipboard.writeText(key);
      if (this._key === key) this._copyStatus = "success";
    } catch {
      if (this._key === key) this._copyStatus = "error";
    }
  }

  private _automationIdentifier() {
    const host = this.host!;
    if (!availableBlockPresets(this.data).some((preset) => preset.key === this._key)) return nothing;
    return html`<div class="preset-automation-id">
      <div class="preset-automation-id-value"><span>${host._t("profileId")}</span><code title=${host._t("profileIdReadonlyHelp")}>${this._key}</code></div>
      <button class="icon-button" type="button" title=${host._t("presetCopyAutomationId")} aria-label=${host._t("presetCopyAutomationId")} @click=${() => this._copyAutomationId()}><ha-icon icon="mdi:content-copy"></ha-icon></button>
      <span class=${`preset-copy-status ${this._copyStatus}`} role="status" aria-live="polite">${this._copyStatus ? host._t(this._copyStatus === "success" ? "presetAutomationIdCopied" : "presetAutomationIdCopyFailed") : nothing}</span>
    </div>`;
  }

  private _temperatureField(field: "temperature" | "target_temp_low" | "target_temp_high", label: string) {
    return html`<label>${label} (${this.data?.temperature_unit ?? "°C"})<input type="text" inputmode="decimal" .value=${String(this._block?.[field] ?? "")} @input=${(event: Event) => this._update(field, this.host!._inputValue(event))} /></label>`;
  }

  private _sectionSummary(icon: string, label: string) {
    return renderResourceSectionSummary(icon, label);
  }

  private _renderUsages() {
    const host = this.host!;
    const uses = splitPresetUsages(this.data?.resource_usages?.presets?.[this._key] ?? []);
    const templateName = (key: string) => this.data?.templates?.find((template) => template.key === key)?.name ?? key;
    const groups = groupPresetUsages(this.data, this._key, uses.direct, host._orderedWeekdays());
    return html`
      ${renderResourceUsageGroups(host, this.data, groups, "preset", host._t("presetSharedEditHelp"))}
      ${uses.templates.size ? html`<div class="resource-usages preset-template-references"><p>${host._t("presetTemplateReferences")}</p>
        ${[...uses.templates].map(([key, entries]) => html`<section class="resource-usage-group preset-usage-group">
          <header><ha-icon icon="mdi:content-copy" aria-hidden="true"></ha-icon><strong>${templateName(key)}</strong><span class="pill">${host._t("resourceUses", { count: entries.length })}</span></header>
          <div class="resource-usage-sources"><div class="resource-usage-item preset-usage-item"><span>${entries.map((entry) => entry.start ?? this.data?.templates?.find((template) => template.key === key)?.blocks.find((block) => block.slot_id === entry.slot_id)?.start ?? entry.slot_id).sort().join(" · ")}</span></div></div>
        </section>`)}
      </div>` : nothing}
      ${uses.inherited.size ? html`<div class="resource-usages preset-inherited-destinations"><p>${host._t("presetInheritedDestinations")}</p>
        ${[...uses.inherited].map(([key, entries]) => renderResourceUsageGroups(host, this.data,
          groupPresetUsages(this.data, this._key, entries, host._orderedWeekdays()), "preset", host._t("presetViaTemplate", { name: templateName(key) })))}
      </div>` : nothing}
    `;
  }

  private _configurationFields() {
    const host = this.host!, block = this._block!;
    const temperature = block.action === "set_temperature";
    const range = block.target_temp_low !== undefined || block.target_temp_high !== undefined;
    const options = !block.temperature_only && (temperature || block.action === "set_climate_options");
    const selectedMode = block.temperature_only ? "temperature_only" : block.hvac_mode;
    return html`<fieldset class="preset-config-fields" ?disabled=${this._busy}><div class="editable-block preset-fields">
      <label class="full-width">${host._t("action")}<span class="select-wrap"><select .value=${block.action} @change=${(event: Event) => this._update("action", host._inputValue(event))}>
        <option .selected=${block.action === "set_temperature"} value="set_temperature">${host._t("presetActionConfigureClimate")}</option><option .selected=${block.action === "set_hvac_mode"} value="set_hvac_mode">${host._t("presetActionModeOnly")}</option><option .selected=${block.action === "set_climate_options"} value="set_climate_options">${host._t("presetActionAdditionalSettings")}</option><option .selected=${block.action === "turn_off"} value="turn_off">${host._t("presetActionTurnOff")}</option>
      </select></span></label>
      ${temperature || block.action === "set_hvac_mode" ? html`<label class="full-width">${host._t("mode")}<span class="select-wrap"><select .value=${selectedMode} @change=${(event: Event) => this._update("hvac_mode", host._inputValue(event))}>
        <option .selected=${!selectedMode} value="">${temperature ? host._t("keepMode") : "-"}</option>${temperature ? html`<option .selected=${block.temperature_only === true} value="temperature_only">${host._t("temperatureOnly")}</option>` : nothing}${presetHvacModes.map((mode) => html`<option .selected=${block.hvac_mode === mode} value=${mode}>${host._modeLabel(mode)}</option>`)}
      </select></span></label>${block.temperature_only ? html`<p class="full-width">${host._t("temperatureOnlyHelp")}</p>` : nothing}` : nothing}
      ${temperature ? html`<label class="full-width">${host._t("presetTargetType")}<span class="select-wrap"><select .value=${range ? "range" : "scalar"} @change=${(event: Event) => { this._block = setPresetTargetType(block, host._inputValue(event) === "range"); }}><option .selected=${!range} value="scalar">${host._t("presetScalarTarget")}</option><option .selected=${range} value="range">${host._t("presetRangeTarget")}</option></select></span></label>${range ? html`${this._temperatureField("target_temp_low", host._t("minimumShort"))}${this._temperatureField("target_temp_high", host._t("maximumShort"))}` : this._temperatureField("temperature", host._t("target"))}` : nothing}
    </div>${options ? html`<details class="resource-section preset-section" ?open=${block.action === "set_climate_options"}>${this._sectionSummary("mdi:tune-variant", host._t("presetOptionalOptions"))}<div class="preset-fields">
      ${([ ["fan_mode", "fan_modes", "fanMode"], ["preset_mode", "preset_modes", "devicePreset"], ["swing_mode", "swing_modes", "swingMode"], ["swing_horizontal_mode", "swing_horizontal_modes", "horizontalSwingMode"] ] as const).map(([field, attribute, label]) => html`<label>${host._t(label)}<input list=${`preset-${field}`} .value=${String(block[field] ?? "")} @input=${(event: Event) => this._update(field, host._inputValue(event))} /><datalist id=${`preset-${field}`}>${presetOptionSuggestions(this.hass, this.data?.configured_entities ?? [], attribute).map((value) => html`<option value=${value}></option>`)}</datalist></label>`)}
      <label>${host._t("targetHumidity")} (%)<input type="number" min="0" max="100" step="any" .value=${String(block.humidity ?? "")} @input=${(event: Event) => this._update("humidity", host._inputValue(event))} /></label>
    </div></details>` : nothing}</fieldset>`;
  }

  private _presetListItem(preset: BlockPreset) {
    const host = this.host!;
    const count = directPresetUseCount(this.data?.resource_usages?.presets?.[preset.key] ?? []);
    const deleteHelp = count ? host._t("presetDeleteInUse") : host._t("deletePresetConfirmation", { name: preset.name });
    return html`<div class=${this._block && preset.key === this._key ? "template-item active" : "template-item"}>
      <button class="template-item-main" type="button" @click=${() => this._edit(preset)}>
        <span class="preset-item-heading"><strong title=${preset.name}>${preset.name}</strong></span>
        <span>${presetConfigurationSummary(preset.config, host)}</span>
        <span class="resource-item-footer"><small class="pill preset-use-count"><ha-icon icon="mdi:link-variant" aria-hidden="true"></ha-icon>${host._t("resourceUses", { count })}</small></span>
      </button>
      <span class="preset-delete-control" title=${deleteHelp}>
        <button class="icon-button danger template-item-delete" type="button" title=${deleteHelp} aria-label=${deleteHelp} ?disabled=${this._busy || count > 0} @click=${() => this._delete(preset)}><ha-icon icon="mdi:trash-can"></ha-icon></button>
      </span>
    </div>`;
  }

  protected render() {
    const host = this.host;
    if (!host) return nothing;
    const presets = availableBlockPresets(this.data);
    const uses = this.data?.resource_usages?.presets?.[this._key] ?? [];
    return html`<section class="preset-library">
      <div class="preset-library-layout">
        <div class="template-list-wrap preset-list"><div class="template-list-heading"><div class="section-heading"><ha-icon icon="mdi:thermometer-lines"></ha-icon><span class="section-label">${host._t("blockPresets")} (${presets.length})</span></div><button class="icon-button primary" type="button" ?disabled=${this._busy} title=${host._t("createPreset")} @click=${() => this._edit()}><ha-icon icon="mdi:plus"></ha-icon></button></div>
          <div class="template-list">${presets.length ? presets.map((preset) => this._presetListItem(preset)) : html`<p class="preset-list-empty">${host._t("noPresets")}</p>`}</div>
        </div>
        <div class="template-detail">${this._block ? html`<div class="preset-editor"><div class="template-detail-heading"><label class="template-name-field">${this._isDirty ? html`<span class="pill warning">${host._t("unsaved")}</span>` : nothing}<div class="template-name-input-wrap"><ha-icon icon="mdi:pencil"></ha-icon><input ?disabled=${this._busy} aria-label=${host._t("name")} .value=${this._name} @input=${(event: Event) => { this._name = host._inputValue(event); }} /></div></label><div class="template-detail-actions"><button class="icon-button primary" type="button" title=${host._t("save")} aria-label=${host._t("save")} ?disabled=${this._busy || !this._isDirty || !this._name.trim()} @click=${() => this._save()}><ha-icon icon="mdi:content-save"></ha-icon></button></div></div>
          <details class="resource-section preset-section">${this._sectionSummary("mdi:link-variant", host._t("resourceUses", { count: directPresetUseCount(uses) }))}${this._renderUsages()}</details>
          ${this._automationIdentifier()}
          ${this._configurationFields()}
          <details class="resource-section preset-section">${this._sectionSummary("mdi:check-decagram-outline", host._t("checkPresetCompatibility"))}<div class="preset-compatibility"><p>${host._t("presetCompatibilityHelp")}</p><label>${host._t("referenceThermostat")}<div class="preset-check-controls"><span class="select-wrap"><select ?disabled=${this._busy} .value=${this._reference} @change=${(event: Event) => { this._reference = host._inputValue(event); }}><option .selected=${!this._reference} value="">-</option>${(this.data?.configured_entities ?? []).map((id) => html`<option .selected=${this._reference === id} value=${id}>${host._friendlyEntityName(id)}</option>`)}</select></span><button class="icon-button preset-check-button" type="button" title=${host._t("checkPresetCompatibility")} aria-label=${host._t("checkPresetCompatibility")} ?disabled=${!this._reference || this._busy || this._previewBusy} @click=${() => this._previewReference()}><ha-icon icon=${this._previewBusy ? "mdi:loading" : "mdi:check-decagram-outline"}></ha-icon></button></div></label>
            <div aria-live="polite" aria-busy=${String(this._previewBusy)}>${this._previewBusy ? html`<div class="preset-compatibility-result pending" role="status"><ha-icon icon="mdi:loading"></ha-icon><strong>${host._t("presetCompatibilityChecking")}</strong></div>` : this._previewError ? html`<div class="preset-compatibility-result error" role="alert"><ha-icon icon="mdi:alert-circle-outline"></ha-icon><div><strong>${host._t("presetCompatibilityError")}</strong><p>${this._previewError}</p></div></div>` : this._previewConfiguration ? html`<div class="preset-compatibility-result success" role="status"><ha-icon icon="mdi:check-circle-outline"></ha-icon><div><strong>${host._t("presetCompatibilitySuccess")}</strong><p>${presetConfigurationSummary(this._previewConfiguration, host)}</p></div></div>` : nothing}</div>
          </div></details>
          ${this._error ? html`<div class="notice error" role="alert">${this._error}</div>` : nothing}
        </div>` : html`<div class="template-placeholder compact"><span>${host._t("selectPresetToBegin")}</span></div>`}</div>
      </div>${this._error && !this._block ? html`<div class="notice error" role="alert">${this._error}</div>` : nothing}
    </section>`;
  }
}
customElements.define("velair-preset-library", VelairPresetLibrary);
