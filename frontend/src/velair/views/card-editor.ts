import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { LOVELACE_CARD_VIEWS, WEEKDAYS } from "../constants";
import { languageFromHass, translate, weekdayName } from "../i18n";
import type { SupportedLanguage, TranslationKey } from "../translations";
import type { HomeAssistant, ScheduleResponse, VelairCardConfig, VelairCardView } from "../types";

export class VelairCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config: VelairCardConfig = {};
  @state() private _entities: string[] = [];
  @state() private _loading = false;
  @state() private _loaded = false;
  @state() private _error?: string;
  private _draggedEntity?: string;

  public setConfig(config: VelairCardConfig): void {
    this._config = config ?? {};
  }

  protected updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("hass") && this.hass && !this._loaded && !this._loading) {
      void this._loadManagedEntities();
    }
  }

  protected render() {
    const firstWeekday = this._firstWeekday();
    const orderedEntities = this._orderedEntities();

    return html`
      <div class="editor">
        ${this._error ? html`<div class="notice error">${this._error}</div>` : nothing}
        ${this._loading ? html`<div class="notice">${this._t("loadingEntities")}</div>` : nothing}

        <label>
          <span>${this._t("title")}</span>
          <input
            type="text"
            .value=${this._config.title ?? ""}
            placeholder="Velair"
            @input=${(event: Event) => this._updateConfig("title", this._inputValue(event))}
          />
        </label>

        <label>
          <span>${this._t("cardView")}</span>
          <select
            .value=${this._config.view ?? "overview-status"}
            @change=${(event: Event) => this._updateView(this._inputValue(event))}
          >
            ${LOVELACE_CARD_VIEWS.map((view) => html`<option value=${view}>${this._viewLabel(view)}</option>`)}
          </select>
        </label>

        <label>
          <span>${this._t("firstWeekday")}</span>
          <select
            .value=${firstWeekday}
            @change=${(event: Event) => this._updateFirstWeekday(this._inputValue(event))}
          >
            ${WEEKDAYS.map((weekday) => html`<option value=${weekday}>${this._weekdayName(weekday)}</option>`)}
          </select>
        </label>

        <section class="zone-order">
          <div>
            <span class="section-label">${this._t("zoneOrder")}</span>
            <p>${this._t("reorderZones")}</p>
          </div>
          <div class="zone-list">
            ${orderedEntities.length
              ? orderedEntities.map((entityId, index) => this._renderZoneOrderRow(entityId, index, orderedEntities.length))
              : html`<span class="empty">${this._t("noManagedEntities")}</span>`}
          </div>
        </section>
      </div>
    `;
  }

  private _renderZoneOrderRow(entityId: string, index: number, total: number) {
    return html`
      <div
        class="zone-row"
        draggable="true"
        @dragstart=${(event: DragEvent) => this._handleZoneDragStart(entityId, event)}
        @dragover=${(event: DragEvent) => this._handleZoneDragOver(event)}
        @drop=${(event: DragEvent) => this._handleZoneDrop(entityId, event)}
        @dragend=${this._handleZoneDragEnd}
      >
        <ha-icon icon="mdi:drag"></ha-icon>
        <span>${this._friendlyEntityName(entityId)}</span>
        <div class="row-actions">
          <button
            class="icon-button"
            type="button"
            title=${this._t("moveUp")}
            ?disabled=${index === 0}
            @click=${() => this._moveZone(entityId, -1)}
          >
            <ha-icon icon="mdi:chevron-up"></ha-icon>
          </button>
          <button
            class="icon-button"
            type="button"
            title=${this._t("moveDown")}
            ?disabled=${index === total - 1}
            @click=${() => this._moveZone(entityId, 1)}
          >
            <ha-icon icon="mdi:chevron-down"></ha-icon>
          </button>
        </div>
      </div>
    `;
  }

  private async _loadManagedEntities(): Promise<void> {
    if (!this.hass || this._loading) {
      return;
    }

    this._loading = true;
    this._error = undefined;
    try {
      const data = await this.hass.connection.sendMessagePromise<ScheduleResponse>({
        type: "velair/get_schedule",
      });
      this._entities = data.configured_entities;
      this._loaded = true;
    } catch (error) {
      this._error = error instanceof Error ? error.message : this._t("unableLoad");
      this._entities = this._config.selected_entity ? [this._config.selected_entity] : [];
    } finally {
      this._loading = false;
    }
  }

  private _orderedEntities(): string[] {
    const entities = [...this._entities];
    if (this._config.selected_entity && !entities.includes(this._config.selected_entity)) {
      entities.unshift(this._config.selected_entity);
    }

    const knownEntities = new Set(entities);
    const orderedEntities = (this._config.zone_order ?? []).filter((entityId) => knownEntities.has(entityId));
    const unorderedEntities = entities.filter((entityId) => !orderedEntities.includes(entityId));
    return [...orderedEntities, ...unorderedEntities];
  }

  private _updateConfig(field: "title", value: string): void {
    const nextConfig: VelairCardConfig = { ...this._config };
    const trimmed = value.trim();

    if (trimmed) {
      nextConfig[field] = trimmed;
    } else {
      delete nextConfig[field];
    }

    this._emitConfig(nextConfig);
  }

  private _updateFirstWeekday(value: string): void {
    const nextConfig: VelairCardConfig = { ...this._config };
    nextConfig.first_weekday = WEEKDAYS.includes(value) ? value : "monday";
    delete nextConfig.selected_weekday;
    this._emitConfig(nextConfig);
  }

  private _moveZone(entityId: string, direction: -1 | 1): void {
    const entities = this._orderedEntities();
    const currentIndex = entities.indexOf(entityId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= entities.length) {
      return;
    }

    const nextEntities = [...entities];
    [nextEntities[currentIndex], nextEntities[nextIndex]] = [nextEntities[nextIndex], nextEntities[currentIndex]];
    this._updateZoneOrder(nextEntities);
  }

  private _handleZoneDragStart(entityId: string, event: DragEvent): void {
    this._draggedEntity = entityId;
    event.dataTransfer?.setData("text/plain", entityId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  }

  private _handleZoneDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  private _handleZoneDrop(targetEntityId: string, event: DragEvent): void {
    event.preventDefault();
    const draggedEntityId = event.dataTransfer?.getData("text/plain") || this._draggedEntity;
    this._draggedEntity = undefined;
    if (!draggedEntityId || draggedEntityId === targetEntityId) {
      return;
    }

    const entities = this._orderedEntities().filter((entityId) => entityId !== draggedEntityId);
    const targetIndex = entities.indexOf(targetEntityId);
    if (targetIndex < 0) {
      return;
    }

    entities.splice(targetIndex, 0, draggedEntityId);
    this._updateZoneOrder(entities);
  }

  private _handleZoneDragEnd = (): void => {
    this._draggedEntity = undefined;
  };

  private _updateZoneOrder(entityIds: string[]): void {
    const nextConfig: VelairCardConfig = {
      ...this._config,
      zone_order: entityIds,
    };
    delete nextConfig.selected_entity;
    this._emitConfig(nextConfig);
  }

  private _emitConfig(nextConfig: VelairCardConfig): void {
    this._config = nextConfig;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: { config: nextConfig },
      }),
    );
  }

  private _inputValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement | HTMLSelectElement).value;
  }

  private _t(
    key: TranslationKey,
    replacements: Record<string, string | number> = {},
  ): string {
    return translate(this._language(), key, replacements);
  }

  private _updateView(value: string): void {
    const nextConfig: VelairCardConfig = { ...this._config };
    nextConfig.view = LOVELACE_CARD_VIEWS.includes(value as VelairCardView)
      ? value as VelairCardView
      : "overview-status";
    this._emitConfig(nextConfig);
  }

  private _language(): SupportedLanguage {
    return languageFromHass(this.hass);
  }

  private _firstWeekday(): string {
    const configuredWeekday = this._config.first_weekday ?? this._config.selected_weekday ?? "monday";
    return WEEKDAYS.includes(configuredWeekday) ? configuredWeekday : "monday";
  }

  private _weekdayName(weekday: string): string {
    return weekdayName(this._language(), weekday);
  }

  private _viewLabel(view: VelairCardView): string {
    const labels: Record<VelairCardView, TranslationKey> = {
      "overview": "overview",
      "overview-status": "cardViewOverviewStatus",
      "overview-boosts": "cardViewOverviewBoosts",
      "overview-events": "cardViewOverviewEvents",
      "overview-timeline": "cardViewOverviewTimeline",
      "overview-zones": "cardViewOverviewZones",
      "schedules": "cardViewSchedules",
      "templates": "templates",
      "settings": "settings",
    };
    return this._t(labels[view]);
  }

  private _friendlyEntityName(entityId: string): string {
    return this.hass?.states?.[entityId]?.attributes?.friendly_name ?? entityId;
  }

  static styles = css`
    .editor {
      display: grid;
      gap: 16px;
      padding: 4px 0;
    }

    label span {
      color: var(--secondary-text-color);
      display: block;
      font-size: 12px;
      margin-bottom: 4px;
    }

    p {
      color: var(--secondary-text-color);
      font-size: 12px;
      margin: 4px 0 0;
    }

    .section-label {
      color: var(--primary-text-color);
      display: block;
      font-weight: 600;
    }

    input,
    select {
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      box-sizing: border-box;
      color: var(--primary-text-color);
      font: inherit;
      min-height: 40px;
      padding: 8px;
      width: 100%;
    }

    .notice {
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 12px;
    }

    .notice.error {
      background: color-mix(in srgb, var(--error-color) 12%, transparent);
      border-color: var(--error-color);
    }

    .zone-order,
    .zone-list {
      display: grid;
      gap: 8px;
    }

    .zone-row {
      align-items: center;
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      cursor: grab;
      display: grid;
      gap: 8px;
      grid-template-columns: 24px minmax(0, 1fr) auto;
      min-height: 42px;
      padding: 8px;
    }

    .zone-row:active {
      cursor: grabbing;
    }

    .zone-row span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .row-actions {
      display: inline-flex;
      gap: 4px;
    }

    .icon-button {
      align-items: center;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      color: var(--primary-text-color);
      cursor: pointer;
      display: inline-flex;
      height: 32px;
      justify-content: center;
      width: 32px;
    }

    .icon-button:disabled {
      cursor: default;
      opacity: 0.45;
    }

    .empty {
      color: var(--secondary-text-color);
      font-size: 12px;
    }
  `;
}
