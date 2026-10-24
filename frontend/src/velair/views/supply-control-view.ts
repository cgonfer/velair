import { html } from "lit";
import "../components/shared-demand-settings-element";
import type { SharedSupplyLibraryDraft } from "../components/shared-demand-settings-element";
import type { VelairViewHost } from "../host-types";

/** Shared climate supply control; execution remains backend-owned. */
export function renderSupplyControlView(host: VelairViewHost) {
  return html`<section class="supply-control-view">
    <velair-shared-demand-settings .host=${host} .data=${host._data}
      .settingsSaving=${host._settingsSaving} .draft=${host._sharedSupplyLibraryDraft}
      @velair-dirty-changed=${(event: CustomEvent<{ dirty: boolean; draft?: SharedSupplyLibraryDraft; busy?: boolean }>) => {
        event.stopPropagation();
        host._setSharedSupplyLibraryState?.(event.detail.dirty, event.detail.draft, Boolean(event.detail.busy));
      }}></velair-shared-demand-settings>
  </section>`;
}
