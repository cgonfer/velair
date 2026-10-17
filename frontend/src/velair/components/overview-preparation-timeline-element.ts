import { css, html, LitElement, type PropertyValues } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { overviewLegendLayout } from "../domain/overview-legend-layout";
import type { OverviewPreparationPoint } from "../domain/overview-preparation-timeline";
import { overviewPreparationGroups } from "../domain/overview-preparation-timeline";
import { inlineHelpStyles } from "../styles/inline-help-styles";
import { renderInlineHelp, dismissInlineHelpWithin, dismissDisconnectedInlineHelp } from "../views/inline-help";

/** Shared Overview/Planned Return timeline rendering; no scheduling or persistence. */
export class OverviewPreparationTimeline extends LitElement {
  static properties = {
    points: { attribute: false }, names: { attribute: false }, progress: { type: Number },
    estimateLabel: { attribute: false }, startTimeLabel: { attribute: false }, nowLabel: { type: String }, timelineLabel: { type: String },
    trackWidth: { state: true }, visibleCount: { state: true }, firstMaxWidth: { state: true }, moreLabel: { attribute: false },
    expanded: { state: true }, collapseLabel: { type: String },
    episodeKey: { type: String },
    showLegend: { type: Boolean },
  };
  points: OverviewPreparationPoint[] = [];
  names: Record<string, string> = {};
  progress = 0;
  estimateLabel: (start: number) => string = start => new Date(start).toISOString();
  startTimeLabel: (start: number) => string = start => new Date(start).toISOString().slice(11, 16);
  nowLabel = "";
  timelineLabel = "";
  trackWidth = 0;
  visibleCount = 0;
  firstMaxWidth = 160;
  moreLabel: (count: number) => string = count => `+${count}`;
  expanded = false;
  collapseLabel = "";
  episodeKey = "";
  showLegend = true;
  private observer?: ResizeObserver;
  static styles = [inlineHelpStyles, css`
    :host { display: block; min-width: 0; }
    .rail { position: relative; padding-block: 14.5px; }
    .track { position: relative; height: 3px; background: var(--divider-color); }
    .elapsed { display: block; height: 100%; background: var(--primary-color); }
    .now { position: absolute; top: 50%; margin-top: -16px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
    .now-mark { position: absolute; top: 8px; width: 2px; height: 16px; background: var(--primary-text-color); box-shadow: 0 0 0 1px var(--card-background-color); }
    .point { position: absolute; top: 50%; margin-top: -16px; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; }
    .dot { display: inline-block; flex: 0 0 auto; width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 0 1px var(--primary-text-color); }
    .legend { display: flex; flex-wrap: nowrap; gap: 12px; min-width: 0; }
    .legend.expanded { flex-wrap: wrap; row-gap: 4px; }
    .entry { position: relative; display: inline-flex; flex: 0 0 auto; align-items: center; gap: 6px; min-height: 32px; min-width: 32px; max-width: 160px; font-size: 12px; color: var(--secondary-text-color); }
    .entry .dot { width: 8px; height: 8px; }
    .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
    .entry-copy { display: flex; align-items: center; gap: 6px; min-width: 0; }
    .start-time { flex: 0 0 auto; font-size: 11px; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .legend.expanded .entry { max-width: 100%; }
    .more { position: relative; display: inline-flex; align-items: center; min-height: 32px; min-width: 32px; font-family: inherit; font-size: 12px; color: var(--primary-text-color); white-space: nowrap; max-width: 100%; }
    button.more { border: 0; padding: 0; background: transparent; cursor: pointer; }
    button.more:hover { text-decoration: underline; }
    button.more:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 4px; }
    .measure { position: absolute; inset-inline: 0; height: 0; overflow: hidden; visibility: hidden; pointer-events: none; }
    .inline-help-overlay-wrapper { position: absolute; inset: 0; }
    .inline-help-overlay { border-radius: 4px; }
    .inline-help-tooltip:not(.visible) { display: none; }
  `];
  connectedCallback() { super.connectedCallback(); if (this.hasUpdated) this.observeTrack(); }
  firstUpdated() { this.observeTrack(); }
  updated(changed: PropertyValues) {
    dismissDisconnectedInlineHelp();
    if (changed.has("episodeKey") && changed.get("episodeKey") !== undefined) this.expanded = false;
    if (!this.points.length && this.expanded) this.expanded = false;
    if (!["points", "names", "trackWidth", "moreLabel", "startTimeLabel"].some(key => changed.has(key))) return;
    const widths = [...this.renderRoot.querySelectorAll<HTMLElement>(".measure .sample")].map(el => el.getBoundingClientRect().width);
    const overflowWidth = this.renderRoot.querySelector<HTMLElement>(".measure .more")?.getBoundingClientRect().width ?? 0;
    const firstTimeWidth = this.renderRoot.querySelector<HTMLElement>(".measure .start-time")?.getBoundingClientRect().width ?? 0;
    // Keep the dot, both inline gaps and a readable name fragment beside the time.
    const layout = overviewLegendLayout(widths, this.trackWidth, overflowWidth, Math.max(32, firstTimeWidth + 28));
    this.visibleCount = layout.count;
    this.firstMaxWidth = layout.firstMaxWidth;
  }
  disconnectedCallback() { dismissInlineHelpWithin(this); this.observer?.disconnect(); this.observer = undefined; super.disconnectedCallback(); }
  private observeTrack() {
    const track = this.renderRoot.querySelector<HTMLElement>(".track");
    if (!track) return;
    this.trackWidth = track.getBoundingClientRect().width;
    this.observer?.disconnect();
    if (typeof ResizeObserver === "undefined") return;
    this.observer = new ResizeObserver(entries => {
      if (!this.isConnected) return;
      const width = entries[0]?.contentRect.width ?? 0;
      if (width !== this.trackWidth) this.trackWidth = width;
    });
    this.observer.observe(track);
  }
  private description(point: OverviewPreparationPoint) {
    return `${this.names[point.entityId] || point.entityId}: ${this.estimateLabel(point.start)}`;
  }
  private groupDescriptions(points: OverviewPreparationPoint[], position: number, nowPosition: number) {
    const descriptions = points.map(point => this.description(point));
    return Math.abs(position - nowPosition) < 32 ? [this.nowLabel, ...descriptions] : descriptions;
  }
  render() {
    const groups = overviewPreparationGroups(this.points, this.trackWidth);
    const visible = this.expanded ? this.points : this.points.slice(0, this.visibleCount);
    const hidden = this.points.slice(this.visibleCount);
    const nowPosition = Math.max(Math.min(16, this.trackWidth / 2), Math.min(this.trackWidth - Math.min(16, this.trackWidth / 2), this.progress * this.trackWidth));
    const progress = Math.max(0, Math.min(1, this.progress));
    return html`<div class="rail"><div class="track" aria-label=${this.timelineLabel}>
      <span class="elapsed" role="progressbar" aria-label=${this.timelineLabel} aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(progress * 100)} aria-valuetext=${this.nowLabel} style=${`width: ${Math.max(0, Math.min(1, this.progress)) * 100}%`}></span>
      <span class="now" style=${`left: ${nowPosition - 16}px`}><span class="now-mark" style=${`left: ${progress * this.trackWidth - nowPosition + 15}px`} aria-hidden="true"></span>
        ${renderInlineHelp("overview-preparation-now", this.nowLabel, this.nowLabel, { appearance: "overlay" })}</span>
      ${repeat(groups, group => group.points.map(point => point.entityId).sort().join("|"), (group, index) => html`<span class="point" style=${`left: ${group.position - 16}px`}>
        <span class="dot" aria-hidden="true" style=${`background: ${group.background}`}></span>
        ${renderInlineHelp(`overview-preparation-group-${index}`, this.groupDescriptions(group.points, group.position, nowPosition).join("; "), this.groupDescriptions(group.points, group.position, nowPosition), { appearance: "overlay" })}
      </span>`)}
    </div></div><slot></slot>${this.showLegend && this.points.length ? html`<div id="overview-preparation-legend" class=${`legend${this.expanded ? " expanded" : ""}`}>${repeat(visible, point => point.entityId, (point, index) => html`<span class="entry" style=${index === 0 && !this.expanded ? `max-width: ${this.firstMaxWidth}px` : ""} data-entity-id=${point.entityId}>
      <span class="dot" aria-hidden="true" style=${`background: ${point.color}`}></span><span class="entry-copy" aria-hidden="true"><span class="name">${this.names[point.entityId] || point.entityId}</span><time class="start-time" datetime=${new Date(point.start).toISOString()}>${this.startTimeLabel(point.start)}</time></span>
      ${renderInlineHelp(`overview-preparation-legend-${index}`, this.description(point), this.description(point), { appearance: "overlay" })}
    </span>`)}${hidden.length || this.expanded ? html`<button type="button" class="more" aria-expanded=${this.expanded} aria-controls="overview-preparation-legend"
      @click=${(event: Event) => { event.stopPropagation(); this.expanded = !this.expanded; }}>${this.expanded ? this.collapseLabel : this.moreLabel(hidden.length)}</button>` : ""}</div><div class="measure" aria-hidden="true">${this.points.map(point => html`<span class="sample entry"><span class="dot"></span><span class="entry-copy"><span class="name">${this.names[point.entityId] || point.entityId}</span><span class="start-time">${this.startTimeLabel(point.start)}</span></span></span>`)}<span class="more">${this.moreLabel(this.points.length)}</span></div>` : ""}`;
  }
}
if (!customElements.get("velair-overview-preparation-timeline")) customElements.define("velair-overview-preparation-timeline", OverviewPreparationTimeline);
