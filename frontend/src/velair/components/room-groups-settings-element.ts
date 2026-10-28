import { LitElement, html, nothing } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { renderSettingsDisclosure, renderSettingsSection } from "../views/settings-disclosure";
import { repeat } from "lit/directives/repeat.js";
import { property, state } from "lit/decorators.js";
import { backendErrorMessage } from "../domain/backend-errors";
import { dismissDisconnectedInlineHelp, dismissInlineHelpWithin, renderInlineHelp } from "../views/inline-help";
import { VelairApiClient } from "../api/client";
import { profileStyles } from "../styles/profile-styles";
import { cardStyles } from "../styles/card-styles";
import { roomGroupsStyles } from "../styles/room-groups-styles";
import { controlUnitId, controlUnitName } from "../domain/control-units";
import { handleDialogClick, renderDocumentationHelp } from "../views/documentation-links";
import { observePanelDialogAlignment } from "../views/panel-dialog-alignment";
import { renderRoomGroupSummary } from "../views/room-group-summary";
import { renderAddListButton } from "../views/add-list-button";
import { renderEmptyLibrary } from "../views/empty-library";
import type { VelairViewHost } from "../host-types";
import type { RoomGroup, RoomGroupPreview, ScheduleResponse } from "../types";

/** Transient library state; persisted configuration remains backend-owned. */
export type RoomGroupsDraft = {
  group?: RoomGroup;
  source: string;
  revision: number;
  selectedId: string;
  dirty: boolean;
  preview?: RoomGroupPreview;
  error?: string;
  nameValidationAttempted?: boolean;
  validationAttempted?: boolean;
};

export class VelairRoomGroupsSettings extends LitElement {
  @property({ attribute: false }) host?: VelairViewHost;
  @property({ attribute: false }) data?: ScheduleResponse;
  @property({ attribute: false }) draft?: RoomGroupsDraft;
  @state() private _group?: RoomGroup;
  @state() private _source = "";
  @state() private _selectedId = "";
  @state() private _dirty = false;
  @state() private _preview?: RoomGroupPreview;
  @state() private _removing = "";
  @state() private _busy = false;
  @state() private _error = "";
  @state() private _nameValidationAttempted = false;
  @state() private _validationAttempted = false;
  @state() private _membersExpanded = false;
  private _membersInitiallyOpen = true;
  @state() private _memberQuery = "";
  @state() private _stagedMembers = new Set<string>();
  @state() private _memberPickerError = "";
  private _pickerGroupId = "";
  private _stopMemberAlignment?: () => void;
  private _stopReviewAlignment?: () => void;
  private _memberFocusId?: string;
  private _fieldFocus?: string;
  private _removalFocusId?: string;
  private _revision = 0;
  private _emitted?: RoomGroupsDraft;
  private _published = "";
  private _focusTarget?: "name" | "selection" | "remove";
  static styles = [cardStyles, profileStyles, roomGroupsStyles];

  disconnectedCallback() {
    dismissInlineHelpWithin(this);
    this._stopReviewAlignment?.();
    this._stopReviewAlignment = undefined;
    this._stopMemberAlignment?.();
    this._stopMemberAlignment = undefined;
    super.disconnectedCallback();
  }

  protected willUpdate(changes: Map<PropertyKey, unknown>) {
    if (changes.has("draft") && this.draft && this.draft !== this._emitted) {
      if (this.draft.dirty) {
        this._membersInitiallyOpen = (this.draft.group?.members.length ?? 0) < 2;
        this._group = this.draft.group ? structuredClone(this.draft.group) : undefined;
        this._source = this.draft.source;
        this._revision = this.draft.revision;
        this._selectedId = this.draft.selectedId;
        this._dirty = true;
        this._preview = this.draft.preview;
        this._error = this.draft.error ?? "";
        this._nameValidationAttempted = Boolean(this.draft.nameValidationAttempted);
        this._validationAttempted = Boolean(this.draft.validationAttempted);
      } else if (this.data) {
        this._load(this.data.room_groups?.[this.draft.selectedId] ?? Object.values(this.data.room_groups ?? {})[0]);
      } else {
        this._selectedId = this.draft.selectedId;
      }
    } else if (changes.has("data") && !this._dirty) {
      const selected = this.data?.room_groups?.[this._selectedId] ?? Object.values(this.data?.room_groups ?? {})[0];
      const pendingRemoval = this._removing && selected?.id === this._removing && JSON.stringify(selected) === JSON.stringify(this._group) ? this._removing : "";
      this._load(selected);
      this._removing = pendingRemoval;
    }
  }

  protected updated() {
    dismissDisconnectedInlineHelp();
    const reviewDialog = this.renderRoot.querySelector<HTMLDialogElement>(".room-group-review-dialog");
    if (reviewDialog && this._preview && !reviewDialog.open) {
      reviewDialog.showModal();
      this._stopReviewAlignment = observePanelDialogAlignment(reviewDialog, this, "member-dialog");
      reviewDialog.querySelector<HTMLElement>("#room-group-review-title")?.focus();
    } else if (!this._preview) {
      const wasOpen = reviewDialog?.open;
      if (wasOpen) reviewDialog.close();
      if (wasOpen) this.renderRoot.querySelector<HTMLElement>('[data-action="review"]:not([disabled]), [data-field="name"]')?.focus();
      this._stopReviewAlignment?.();
      this._stopReviewAlignment = undefined;
    }
    if (this._fieldFocus) {
      const field = this.renderRoot.querySelector<HTMLElement>(this._fieldFocus);
      const disclosure = field?.closest("details");
      if (disclosure) disclosure.open = true;
      field?.focus();
      this._fieldFocus = undefined;
    }
    if (this._removalFocusId) {
      this.renderRoot.querySelector<HTMLElement>(`[data-remove-group="${this._removalFocusId}"]`)?.focus();
      this._removalFocusId = undefined;
    }
    if (this._memberFocusId !== undefined) {
      const selector = this._memberFocusId ? `[data-remove-member="${this._memberFocusId}"]` : '[data-action="add-members"]';
      this.renderRoot.querySelector<HTMLElement>(selector)?.focus();
      this._memberFocusId = undefined;
    }
    if (this._focusTarget) {
      const selector = this._focusTarget === "name" ? '[data-field="name"]'
        : this._focusTarget === "remove" ? '[data-action="confirm-remove"]'
        : this._selectedId ? `[data-select-group="${this._selectedId}"]` : '[data-action="add"]';
      this.renderRoot.querySelector<HTMLElement>(selector)?.focus();
      this._focusTarget = undefined;
    }
    const draft: RoomGroupsDraft = { group: this._group, source: this._source, revision: this._revision, selectedId: this._selectedId, dirty: this._dirty, preview: this._preview, error: this._error || undefined, nameValidationAttempted: this._nameValidationAttempted, validationAttempted: this._validationAttempted };
    const signature = JSON.stringify([draft, this._busy]);
    if (signature === this._published) return;
    this._published = signature;
    this._emitted = draft;
    this.dispatchEvent(new CustomEvent("room-groups-state-changed", { bubbles: true, composed: true, detail: { draft, dirty: this._dirty, busy: this._busy } }));
  }

  public get hasUnsavedChanges() { return this._dirty; }
  private _t(key: Parameters<VelairViewHost["_t"]>[0], values?: Record<string, string | number>) { return this.host!._t(key, values); }
  private _name(id: string) { return controlUnitName(this.data, this.host?.hass, id); }
  private _load(group?: RoomGroup) {
    if (group?.id !== this._selectedId) {
      this.renderRoot.querySelector<HTMLDialogElement>(".room-group-member-dialog")?.close();
      this._membersExpanded = false;
      this._membersInitiallyOpen = (group?.members.length ?? 0) < 2;
    }
    this._group = group ? structuredClone(group) : undefined;
    this._source = group?.id ?? "";
    this._selectedId = group?.id ?? "";
    this._revision = this.data?.configuration_revision ?? 0;
    this._dirty = false;
    this._preview = undefined;
    this._error = "";
    this._removing = "";
    this._nameValidationAttempted = false;
    this._validationAttempted = false;
  }
  private _canChangeSelection() {
    return !this._busy && (!this._dirty || window.confirm(this._t("discardUnsavedChanges")));
  }
  private _select(id: string) { if (id !== this._selectedId && this._canChangeSelection()) this._load(this.data?.room_groups?.[id]); }
  private _add() {
    if (!this._canChangeSelection()) return;
    this._load();
    this._group = { id: `group.${crypto.randomUUID().replaceAll("-", "")}`, name: "", members: [], temperature_entity_id: "", delivery_mode: "all" };
    this._selectedId = this._group.id;
    this._dirty = true;
    this._focusTarget = "name";
  }
  private _change(update: Partial<RoomGroup>) {
    this._group = { ...this._group!, ...update };
    const stored = this.data?.room_groups?.[this._group.id];
    this._dirty = !stored || JSON.stringify(stored) !== JSON.stringify(this._group);
    this._preview = undefined;
    this._error = "";
  }
  private _removeMember(id: string) {
    const group = this._group!;
    const index = group.members.indexOf(id);
    const members = group.members.filter(member => member !== id);
    this._memberFocusId = members[Math.min(index, members.length - 1)] ?? "";
    this._change({
      members,
      ...(group.temperature_entity_id === id ? { temperature_entity_id: "" } : {}),
      ...(group.delivery_entity_id === id ? { delivery_entity_id: undefined } : {}),
    });
    if (this._source === id) this._source = members[0] ?? "";
  }
  private _memberOwner(id: string): string | undefined {
    const owner = controlUnitId(this.data, id);
    return owner === id || owner === this._group?.id ? undefined : owner;
  }
  private async _openMemberPicker() {
    if (!this._group || this._busy) return;
    this._pickerGroupId = this._group.id;
    this._memberQuery = "";
    this._stagedMembers = new Set();
    this._memberPickerError = "";
    await this.updateComplete;
    const dialog = this.renderRoot.querySelector<HTMLDialogElement>(".room-group-member-dialog");
    dialog?.showModal();
    this._stopMemberAlignment?.();
    if (dialog) this._stopMemberAlignment = observePanelDialogAlignment(dialog, this, "member-dialog");
    dialog?.querySelector<HTMLInputElement>('[data-field="member-search"]')?.focus();
  }
  private _closeMemberPicker() {
    this.renderRoot.querySelector<HTMLDialogElement>(".room-group-member-dialog")?.close();
  }
  private _memberPickerClosed() {
    this._stopMemberAlignment?.();
    this._stopMemberAlignment = undefined;
    this._stagedMembers = new Set();
    this._memberQuery = "";
    this._memberPickerError = "";
    this.renderRoot.querySelector<HTMLElement>('[data-action="add-members"]')?.focus();
  }
  private _stageMember(id: string, checked: boolean) {
    if (this._memberOwner(id)) return;
    const staged = new Set(this._stagedMembers);
    if (checked) staged.add(id); else staged.delete(id);
    this._stagedMembers = staged;
    this._memberPickerError = "";
  }
  private _confirmMembers() {
    if (!this._group || this._group.id !== this._pickerGroupId || this._busy) return;
    const managed = new Set(this.data?.configured_entities ?? []);
    const eligible = [...this._stagedMembers].filter(id => managed.has(id) && !this._memberOwner(id));
    if (eligible.length !== this._stagedMembers.size) {
      this._stagedMembers = new Set(eligible);
      this._memberPickerError = this._t("roomGroupMembersChanged");
      return;
    }
    const members = [...this._group.members, ...eligible.filter(id => !this._group!.members.includes(id))];
    if (members.length !== this._group.members.length) {
      this._change({ members });
      if (!this._source) this._source = members[0] ?? "";
    }
    this._closeMemberPicker();
  }
  private _moveMember(index: number, delta: number) {
    if (index < 0 || index + delta < 0 || index + delta >= (this._group?.members.length ?? 0)) return;
    this._membersExpanded = true;
    const members = [...this._group!.members];
    [members[index], members[index + delta]] = [members[index + delta], members[index]];
    this._change({ members });
  }
  private _requestRemove(id: string) {
    if (this._busy) return;
    if (id !== this._selectedId && !this._canChangeSelection()) return;
    if (!this.data?.room_groups?.[id]) { this._load(Object.values(this.data?.room_groups ?? {})[0]); this._focusTarget = "selection"; return; }
    if (id !== this._selectedId) this._load(this.data.room_groups[id]);
    this._removing = id;
    this._focusTarget = "remove";
  }
  private async _run(action: "preview" | "save" | "remove", id?: string) {
    if (!this.host?.hass || this._busy || (action === "save" && !this._preview)) return;
    if (action !== "remove" && !this._group?.name.trim()) {
      this._nameValidationAttempted = true;
      this._focusTarget = "name";
      this.requestUpdate();
      return;
    }
    if (action !== "remove") {
      this._validationAttempted = true;
      const invalid = this._requiredFieldErrors();
      if (invalid.length) {
        this._fieldFocus = invalid[0].selector;
        this.requestUpdate();
        return;
      }
    }
    this._busy = true;
    this._error = "";
    try {
      const api = new VelairApiClient(this.host.hass);
      if (action === "remove") {
        const data = await api.removeRoomGroup(id!, this.data?.configuration_revision ?? 0);
        this.data = data;
        this.host._applyScheduleData(data, { forceDraft: true });
        this._load(Object.values(data.room_groups ?? {}).find(group => group.id !== id));
        this._focusTarget = "selection";
      } else {
        const request = { group: this._group!, expected_revision: this._revision, ...(this._source ? { source_entity_id: this._source } : {}) };
        if (action === "preview") this._preview = await api.previewRoomGroup(request);
        else {
          const data = await api.setRoomGroup(request);
          this.data = data;
          this.host._applyScheduleData(data, { forceDraft: true });
          this._load(data.room_groups?.[this._selectedId] ?? this._group);
        }
      }
    } catch (error) { this._error = backendErrorMessage(error, this._t("roomGroupActionFailed")); }
    finally { this._busy = false; }
  }
  private _stateLabel(id: string) {
    const state = this.data?.zone_runtime?.[id]?.state;
    const keys = { stopped: "overviewStatusStopped", paused: "pauseActive", boost: "boostActive", preconditioning: "preconditioning", scheduled: "overviewZoneScheduled", idle: "overviewZoneManual", externally_managed: "overviewZoneExternal" } as const;
    return state ? this._t(keys[state]) : this._t("roomGroupAwaitingState");
  }
  private _groups() {
    const groups = Object.values(this.data?.room_groups ?? {});
    return this._group && !groups.some(group => group.id === this._group!.id) ? [...groups, this._group] : groups;
  }
  protected render() {
    if (!this.host) return nothing;
    const groups = this._groups();
    return html`<section class="templates-view room-groups-workspace" aria-label=${this._t("roomGroups")}>
      <header class="profile-intro"><ha-icon icon="mdi:home-group" aria-hidden="true"></ha-icon><span><strong>${this._t("roomGroups")}</strong><small>${this._t("roomGroupsDescription")}</small></span>${renderDocumentationHelp(this.host, "roomGroups")}</header>
      <div class="template-library">
        ${groups.length ? html`<div class="template-library-layout">
          <div class="template-list-wrap"><div class="template-list-heading"><div class="section-heading"><ha-icon icon="mdi:home-group" aria-hidden="true"></ha-icon><span class="section-label">${this._t("roomGroups")} (${groups.length})</span></div>${this._addButton()}</div>
            <div class="template-list" role="group" aria-label=${this._t("roomGroups")}>
              ${groups.map(group => html`<div class=${group.id === this._selectedId ? "template-item active" : "template-item"}>
                <button class="template-item-main" type="button" data-select-group=${group.id} aria-pressed=${String(group.id === this._selectedId)} ?disabled=${this._busy} @click=${() => this._select(group.id)}><span class="resource-item-heading"><strong>${group.id === this._selectedId ? this._group?.name || this._t("roomGroupCreate") : group.name}</strong></span><span class="room-group-list-copy">${this._t("roomGroupMemberCount", { count: group.id === this._selectedId ? this._group?.members.length ?? 0 : group.members.length })}</span>${this.data?.room_groups?.[group.id] ? html`<span class="room-group-list-copy">${this._name(group.temperature_entity_id)}</span><span class="room-group-list-copy">${this._stateLabel(group.id)}</span>` : nothing}</button>
                <span class="resource-delete-control" title=${this._t("roomGroupDissolve")}><button class="icon-button danger template-item-delete" type="button" data-remove-group=${group.id} title=${this._t("roomGroupDissolve")} aria-label=${`${this._t("roomGroupDissolve")}: ${group.name || this._t("roomGroupCreate")}`} ?disabled=${this._busy} @click=${() => this._requestRemove(group.id)}><ha-icon icon="mdi:trash-can" aria-hidden="true"></ha-icon></button></span>
              </div>`)}
            </div>
          </div>
          <div class="template-detail">${this._group ? this._editor() : html`<div class="template-placeholder compact"><span>${this._t("roomGroupsEmpty")}</span></div>`}</div>
        </div>` : renderEmptyLibrary({ message: this._t("roomGroupsEmpty"), addLabel: this._t("roomGroupCreate"), disabled: this._busy, onAdd: () => this._add() })}
      </div>
      ${this._memberPicker()}
      ${this._reviewDialog()}
    </section>`;
  }
  private _addButton() {
    return html`<button class="icon-button primary" data-action="add" type="button" title=${this._t("roomGroupCreate")} aria-label=${this._t("roomGroupCreate")} ?disabled=${this._busy} @click=${this._add}><ha-icon icon="mdi:plus" aria-hidden="true"></ha-icon></button>`;
  }
  private _requiredFieldErrors() {
    const group = this._group;
    if (!group) return [];
    const errors: Array<{ field: string; key: Parameters<VelairViewHost["_t"]>[0]; selector: string }> = [];
    if (group.members.length < 2) errors.push({ field: "members", key: "roomGroupMinimumMembers", selector: '[data-action="add-members"]' });
    if (!group.members.includes(group.temperature_entity_id)) errors.push({ field: "reference", key: "roomGroupReferenceRequired", selector: '#room-group-reference' });
    if (group.delivery_mode === "selected" && !group.members.includes(group.delivery_entity_id ?? "")) errors.push({ field: "destination", key: "roomGroupDestinationRequired", selector: '#room-group-destination' });
    if (!this.data?.room_groups?.[group.id] && !group.members.includes(this._source)) errors.push({ field: "source", key: "roomGroupSourceRequired", selector: '#room-group-source' });
    return errors;
  }
  private _fieldError(field: string) {
    const error = this._fieldInvalid(field) ? this._requiredFieldErrors().find(error => error.field === field) : undefined;
    return error ? html`<span class="field-error" id=${`room-group-${field}-error`} role="alert">${this._t(error.key)}</span>` : nothing;
  }
  private _fieldInvalid(field: string) {
    const legacyReference = field === "reference" && Boolean(this._group?.temperature_entity_id) && !this._group!.members.includes(this._group!.temperature_entity_id);
    return (this._validationAttempted || legacyReference) && this._requiredFieldErrors().some(error => error.field === field);
  }
  private _saveButton() {
    const label = this._t("save");
    return html`<button class="icon-button primary" data-action="review" type="button" title=${label} aria-label=${label} ?disabled=${this._busy || !this._dirty} @click=${() => this._run("preview")}><ha-icon icon=${this._busy ? "mdi:loading" : "mdi:content-save"} aria-hidden="true"></ha-icon></button>`;
  }
  private _editor() {
    const group = this._group!;
    const sources = group.members;
    const legacyReference = Boolean(group.temperature_entity_id && !sources.includes(group.temperature_entity_id));
    const existing = Boolean(this.data?.room_groups?.[group.id]);
    const nameInvalid = this._nameValidationAttempted && !group.name.trim();
    return html`<article class="room-group-editor" aria-busy=${String(this._busy)}>
      <header class="template-detail-heading room-group-detail-header">
        <label class="template-name-field">${this._dirty ? html`<span class="pill warning">${this._t("unsaved")}</span>` : nothing}<div class="template-name-input-wrap"><ha-icon icon="mdi:pencil" aria-hidden="true"></ha-icon><input data-field="name" class=${nameInvalid ? "invalid" : ""} aria-label=${this._t("name")} aria-invalid=${String(nameInvalid)} aria-describedby=${nameInvalid ? "room-group-name-error" : nothing} .value=${group.name} maxlength="100" required ?disabled=${this._busy} @input=${(event: Event) => this._change({ name: (event.target as HTMLInputElement).value })} @blur=${() => { this._nameValidationAttempted = true; }}></div></label>
        <div class="template-detail-actions">${this._saveButton()}</div>
      </header>
      ${nameInvalid ? html`<span class="field-error" id="room-group-name-error" role="alert">${this._t("roomGroupNameRequired")}</span>` : nothing}
      <div class="room-group-summary-badges"><span class="pill">${this._t("roomGroupMemberCount", { count: group.members.length })}</span>${existing ? html`<span class="pill">${this._stateLabel(group.id)}</span>` : nothing}</div>
      ${this._error && !this._preview ? html`<p class="room-group-error" role="alert">${this._error}</p>` : nothing}
      ${this._removing === group.id ? html`<div class="room-group-review" role="alert"><strong>${this._t("roomGroupDissolve")}</strong><p class="room-group-copy">${this._t("roomGroupDissolveHelp")}</p><p class="room-group-copy">${this._t("roomGroupTemporaryReset")}</p><div class="room-group-review-actions"><button class="command-button danger" data-action="confirm-remove" type="button" ?disabled=${this._busy} @click=${() => this._run("remove", group.id)}><ha-icon icon="mdi:trash-can" aria-hidden="true"></ha-icon><span>${this._t("roomGroupDissolve")}</span></button><button class="command-button" type="button" ?disabled=${this._busy} @click=${() => { this._removing = ""; this._removalFocusId = group.id; }}><span>${this._t("cancel")}</span></button></div></div>` : nothing}
      <div class="room-group-fields">
        ${keyed(group.id, renderSettingsDisclosure("members", "mdi:thermostat", this._t("roomGroupMembers"), html`
          <p class="room-group-copy room-group-members-description">${this._t("roomGroupMembersHelp")}</p>
          ${this._fieldError("members")}
          <div class="room-group-member-options" role="group" aria-label=${this._t("roomGroupMembers")} aria-invalid=${String(this._fieldInvalid("members"))} aria-describedby=${this._fieldInvalid("members") ? "room-group-members-error" : nothing}>${repeat(this._membersExpanded ? group.members : group.members.slice(0, 4), id => id, (id, index) => html`<div class="room-group-member-option" data-member=${id}>
            <span class="room-group-member-identity">${this._name(id)}<small>${id}</small></span>
            <span class="settings-row-actions room-group-order-actions"><button class="icon-button" type="button" title=${this._t("moveUp")} aria-label=${`${this._t("moveUp")}: ${this._name(id)}`} ?disabled=${this._busy || index === 0} @click=${() => this._moveMember(index, -1)}><ha-icon icon="mdi:chevron-up" aria-hidden="true"></ha-icon></button><button class="icon-button" type="button" title=${this._t("moveDown")} aria-label=${`${this._t("moveDown")}: ${this._name(id)}`} ?disabled=${this._busy || index === group.members.length - 1} @click=${() => this._moveMember(index, 1)}><ha-icon icon="mdi:chevron-down" aria-hidden="true"></ha-icon></button><button class="icon-button danger resource-item-delete" data-remove-member=${id} type="button" title=${this._t("roomGroupRemoveMember")} aria-label=${`${this._t("roomGroupRemoveMember")}: ${this._name(id)}`} ?disabled=${this._busy} @click=${() => this._removeMember(id)}><ha-icon icon="mdi:trash-can" aria-hidden="true"></ha-icon></button></span>
          </div>`)}
            ${group.members.length > 4 ? html`<div class="room-group-member-actions"><button class="command-button" type="button" data-action="toggle-members" ?disabled=${this._busy} @click=${() => { this._membersExpanded = !this._membersExpanded; }}><span>${this._t(this._membersExpanded ? "roomGroupShowFewerMembers" : "roomGroupShowAllMembers", { count: group.members.length })}</span></button></div>` : nothing}
            ${renderAddListButton(this._t("roomGroupAddMembers"), () => this._openMemberPicker(), this._busy, "add-members")}
          </div>
        `, this._membersInitiallyOpen))}
        ${renderSettingsSection("operation", "mdi:cog-outline", this._t("roomGroupOperation"), html`
        <div class="room-group-field"><div class="settings-policy-heading"><label class="label" for="room-group-reference">${this._t("roomGroupTemperatureSource")}</label>${renderInlineHelp("room-group-reference-help", this._t("roomGroupTemperatureSource"), this._t("roomGroupTemperatureSourceHelp"))}</div><span class="select-wrap"><select id="room-group-reference" data-field="reference" class=${this._fieldInvalid("reference") ? "invalid" : ""} aria-invalid=${String(this._fieldInvalid("reference"))} aria-describedby=${this._fieldInvalid("reference") ? "room-group-reference-error" : nothing} .value=${group.temperature_entity_id} ?disabled=${this._busy} @change=${(event: Event) => this._change({ temperature_entity_id: (event.target as HTMLSelectElement).value })}><option value="" .selected=${!group.temperature_entity_id}>${this._t("roomGroupChooseSource")}</option>${legacyReference ? html`<option value=${group.temperature_entity_id} disabled .selected=${true}>${this._t("roomGroupSavedReference", { entity: group.temperature_entity_id })}</option>` : nothing}${repeat(sources, id => id, id => html`<option value=${id} .selected=${id === group.temperature_entity_id}>${this._name(id)} (${id})</option>`) }</select></span>${this._fieldError("reference")}</div>
        <div class="room-group-field room-group-delivery-field"><div class="settings-policy-heading"><label class="label" for="room-group-delivery">${this._t("roomGroupDelivery")}</label></div><span class="select-wrap"><select id="room-group-delivery" data-field="delivery" .value=${group.delivery_mode} ?disabled=${this._busy} @change=${(event: Event) => this._change({ delivery_mode: (event.target as HTMLSelectElement).value as RoomGroup["delivery_mode"], ...((event.target as HTMLSelectElement).value === "all" ? { delivery_entity_id: undefined } : {}) })}><option value="all" ?selected=${group.delivery_mode === "all"}>${this._t("roomGroupDeliveryAll")}</option><option value="selected" ?selected=${group.delivery_mode === "selected"}>${this._t("roomGroupDeliverySelected")}</option></select></span><p class="room-group-copy room-group-delivery-description">${this._t(group.delivery_mode === "all" ? "roomGroupDeliveryAllHelp" : "roomGroupDeliverySelectedHelp")}</p>
          ${group.delivery_mode === "selected" ? html`<div class="room-group-field room-group-command-recipient"><label class="label" for="room-group-destination">${this._t("roomGroupCommandRecipient")}</label><span class="select-wrap"><select id="room-group-destination" class=${this._fieldInvalid("destination") ? "invalid" : ""} aria-invalid=${String(this._fieldInvalid("destination"))} aria-describedby=${this._fieldInvalid("destination") ? "room-group-destination-error" : nothing} .value=${group.delivery_entity_id ?? ""} ?disabled=${this._busy} @change=${(event: Event) => this._change({ delivery_entity_id: (event.target as HTMLSelectElement).value })}><option value="">—</option>${repeat(group.members, id => id, id => html`<option value=${id} .selected=${id === group.delivery_entity_id}>${this._name(id)} (${id})</option>`)}</select></span>${this._fieldError("destination")}</div>` : nothing}
        </div>
        `)}
        ${!existing ? renderSettingsSection("initial-configuration", "mdi:content-copy", this._t("roomGroupInitialConfiguration"), html`<div class="room-group-field"><div class="settings-policy-heading"><label class="label" for="room-group-source">${this._t("roomGroupAdoptConfiguration")}</label></div><span class="select-wrap"><select id="room-group-source" class=${this._fieldInvalid("source") ? "invalid" : ""} aria-invalid=${String(this._fieldInvalid("source"))} aria-describedby=${this._fieldInvalid("source") ? "room-group-source-error" : nothing} .value=${this._source} ?disabled=${this._busy} @change=${(event: Event) => { this._source = (event.target as HTMLSelectElement).value; this._dirty = true; this._preview = undefined; }}><option value="" .selected=${!this._source}>—</option>${repeat(group.members, id => id, id => html`<option value=${id} .selected=${id === this._source}>${this._name(id)} (${id})</option>`)}</select></span><p class="room-group-copy room-group-adoption-description">${this._t("roomGroupAdoptConfigurationHelp")}</p>${this._fieldError("source")}</div><p class="notice external-execution-notice room-group-adoption-notice"><ha-icon icon="mdi:information-outline" aria-hidden="true"></ha-icon><span>${this._t("roomGroupAdoptConfigurationNotice")}</span></p>`) : nothing}
      </div>
      ${existing ? html`<div class="room-group-status">${renderSettingsDisclosure("control", "mdi:information-outline", this._t("roomGroupControlState"), html`${this._dirty ? html`<p class="room-group-copy">${this._t("roomGroupSavedStateNote")}</p>` : nothing}${renderRoomGroupSummary(this.host!, this.data?.room_groups?.[group.id])}`)}</div>` : nothing}
    </article>`;
  }
  private _memberPicker() {
    const query = this._memberQuery.trim().toLocaleLowerCase();
    const candidates = (this.data?.configured_entities ?? []).filter(id => !this._group?.members.includes(id))
      .filter(id => !query || `${this._name(id)} ${id}`.toLocaleLowerCase().includes(query))
      .sort((left, right) => this._name(left).localeCompare(this._name(right)));
    return html`<dialog class="documentation-dialog room-group-member-dialog" aria-labelledby="room-group-member-dialog-title" @click=${handleDialogClick} @close=${this._memberPickerClosed} @cancel=${(event: Event) => { event.preventDefault(); this._closeMemberPicker(); }}>
      <header class="documentation-dialog-header"><h2 id="room-group-member-dialog-title">${this._t("roomGroupAddMembers")}</h2><button class="documentation-close" type="button" aria-label=${this._t("close")} @click=${this._closeMemberPicker}><ha-icon icon="mdi:close" aria-hidden="true"></ha-icon></button></header>
      <label class="room-group-field room-group-member-search"><span class="label">${this._t("roomGroupSearchMembers")}</span><input type="search" data-field="member-search" placeholder=${this._t("roomGroupSearchMembersPlaceholder")} .value=${this._memberQuery} @input=${(event: Event) => { this._memberQuery = (event.target as HTMLInputElement).value; }}></label>
      <div class="room-group-picker-options" role="group" aria-label=${this._t("roomGroupMembers")}>
        ${candidates.map(id => {
          const owner = this._memberOwner(id);
          return html`<div class="room-group-member-option" data-candidate=${id}><label class="room-group-member-choice"><input type="checkbox" .checked=${this._stagedMembers.has(id)} ?disabled=${Boolean(owner) || this._busy} @change=${(event: Event) => this._stageMember(id, (event.target as HTMLInputElement).checked)}><span>${this._name(id)}<small>${id}</small>${owner ? html`<small class="room-group-assigned">${this._t("roomGroupAssignedTo", { group: this._name(owner) })}</small>` : nothing}</span></label></div>`;
        })}
        ${!candidates.length ? html`<p class="room-group-copy">${this._t("roomGroupNoMemberMatches")}</p>` : nothing}
      </div>
      ${this._memberPickerError ? html`<p class="room-group-error" role="alert">${this._memberPickerError}</p>` : nothing}
      <footer class="documentation-dialog-footer room-group-picker-footer"><span>${this._t("roomGroupMembersSelected", { count: this._stagedMembers.size })}</span><button class="command-button primary compact" type="button" data-action="confirm-members" ?disabled=${this._busy || this._stagedMembers.size === 0} @click=${this._confirmMembers}><ha-icon icon="mdi:plus" aria-hidden="true"></ha-icon><span>${this._t("roomGroupAddMembers")}</span></button></footer>
    </dialog>`;
  }
  private _configurationLabels(fields: string[]) {
    const keys: Record<string, Parameters<VelairViewHost["_t"]>[0]> = {
      enabled: "enabled", schedule: "schedules", template_links: "templates", day_layout_key: "dayLayout",
      preconditioning: "preconditioning", comfort: "comfort", external_change_policy: "externalChangePolicy", execution: "externalSystems",
      target_range_modes: "targetRangeModes", target_range_reference: "targetRangeReference", target_temp_step_override: "targetTempStepFallback",
      override: "boost", pauses: "pause", profiles: "profiles", zone_profile_overrides: "profiles",
    };
    return [...new Set(fields.map(field => this._t(keys[field] ?? "settings")))].join(", ");
  }
  private _backToEdit() {
    if (this._busy) return;
    this._preview = undefined;
    this._error = "";
    this.renderRoot.querySelector<HTMLDialogElement>(".room-group-review-dialog")?.close();
    this.renderRoot.querySelector<HTMLElement>('[data-action="review"]')?.focus();
  }
  private _reviewDialog() {
    return html`<dialog class="documentation-dialog room-group-review-dialog" aria-labelledby="room-group-review-title" aria-describedby="room-group-review-guidance" aria-busy=${String(this._busy)}
      @click=${(event: MouseEvent) => { if (!this._busy) handleDialogClick(event); }}
      @cancel=${(event: Event) => { event.preventDefault(); this._backToEdit(); }}
      @close=${() => { if (this._preview) this._backToEdit(); }}>
      <header class="documentation-dialog-header"><h2 id="room-group-review-title" tabindex="-1">${this._t("roomGroupReview")}</h2><button class="documentation-close" type="button" aria-label=${this._t("close")} ?disabled=${this._busy} @click=${this._backToEdit}><ha-icon icon="mdi:close" aria-hidden="true"></ha-icon></button></header>
      <p id="room-group-review-guidance">${this._t("roomGroupReviewGuidance")}</p>
      ${this._preview ? this._review() : nothing}
      ${this._preview && this._error ? html`<p class="room-group-error" role="alert">${this._error}</p>` : nothing}
      <footer class="documentation-dialog-footer room-group-review-footer"><button class="command-button compact" type="button" data-action="back-to-edit" ?disabled=${this._busy} @click=${this._backToEdit}><span>${this._t("roomGroupBackToEdit")}</span></button><button class="command-button primary compact" type="button" data-action="save" ?disabled=${this._busy || !this._preview} @click=${() => this._run("save")}><ha-icon icon=${this._busy ? "mdi:loading" : "mdi:content-save"} aria-hidden="true"></ha-icon><span>${this._t("roomGroupConfirmSave")}</span></button></footer>
    </dialog>`;
  }
  private _review() {
    const preview = this._preview!;
    return html`<section class="room-group-review"><p class="room-group-copy">${this._t("roomGroupSharedControl")}</p><p class="room-group-copy">${this._t("roomGroupSourceConfiguration", { source: this._name(this._source) })}</p>
      ${preview.conflicts.length ? html`<p class="room-group-warning room-group-copy">${this._t("roomGroupConfigurationDifferences")}</p><ul>${preview.conflicts.map(item => html`<li>${this._name(item.entity_id)}: ${this._configurationLabels(item.fields)}</li>`)}</ul>` : nothing}
      ${preview.removed_members.length ? html`<p class="room-group-copy">${this._t("roomGroupRemovedMembers", { members: preview.removed_members.map(id => this._name(id)).join(", ") })}</p>` : nothing}
      ${preview.temporary_control_reset ? html`<p class="room-group-copy">${this._t("roomGroupTemporaryReset")}</p>` : nothing}
      ${preview.learning_reset ? html`<p class="room-group-copy">${this._t("roomGroupLearningReset")}</p>` : nothing}
    </section>`;
  }
}
if (!customElements.get("velair-room-groups-settings")) customElements.define("velair-room-groups-settings", VelairRoomGroupsSettings);
