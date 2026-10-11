import { PanelScheduleSession, rawScheduleHass } from "./panel-schedule-session";
import type { HassConnection, HomeAssistant } from "../types";

type Lease = { session: PanelScheduleSession; release(): void };
type Entry = { session: PanelScheduleSession; owners: Set<object>; leases: Map<object, Lease> };
const sessions = new WeakMap<HassConnection, Entry>();

/** Registered mounted cards share backend data, never their editing state. */
export function acquireLovelaceScheduleSession(hass: HomeAssistant, owner: object): Lease {
  hass = rawScheduleHass(hass);
  const connection = hass.connection;
  let entry = sessions.get(connection);
  if (!entry) {
    entry = { session: new PanelScheduleSession(), owners: new Set(), leases: new Map() };
    sessions.set(connection, entry);
    entry.session.connect(hass);
  } else entry.session.setHass(hass);
  const existing = entry.leases.get(owner);
  if (existing) return existing;
  entry.owners.add(owner);
  const acquired = entry;
  let released = false;
  const lease: Lease = {
    session: acquired.session,
    release() {
      if (released) return;
      released = true;
      acquired.owners.delete(owner);
      acquired.leases.delete(owner);
      if (!acquired.owners.size) {
        acquired.session.disconnect();
        if (sessions.get(connection) === acquired) sessions.delete(connection);
      }
    },
  };
  acquired.leases.set(owner, lease);
  return lease;
}
