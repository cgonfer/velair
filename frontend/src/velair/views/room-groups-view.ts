import { html } from "lit";
import "../components/room-groups-settings-element";
import type { RoomGroupsDraft } from "../components/room-groups-settings-element";
import type { VelairViewHost } from "../host-types";

/** Room membership workspace; all shared control policy stays backend-owned. */
export function renderRoomGroupsView(host: VelairViewHost) {
  return html`<section class="room-groups-view">
    <velair-room-groups-settings .host=${host} .data=${host._data} .draft=${host._roomGroupsDraft}
      @room-groups-state-changed=${(event: CustomEvent<{ dirty: boolean; busy: boolean; draft?: RoomGroupsDraft }>) => {
        event.stopPropagation();
        host._setRoomGroupsState?.(event.detail.dirty, event.detail.busy, event.detail.draft);
      }}></velair-room-groups-settings>
  </section>`;
}
