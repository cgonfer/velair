import { html, nothing } from "lit";
import type { VelairViewHost } from "../host-types";
import type { RoomSensorAssistStatus, ZoneRuntimeStatus } from "../types";
import { renderInlineHelp } from "./inline-help";

type OffsetRuntime = Pick<ZoneRuntimeStatus, "preconditioning_offset" | "target_temperature" | "target_temp_low" | "target_temp_high" | "applied_temperature" | "applied_target_temp_low" | "applied_target_temp_high">;

/** Accepted runtime metadata only; configuration alone never implies an active offset. */
export function renderPreconditioningOffset(host: VelairViewHost, entityId: string, status?: OffsetRuntime | RoomSensorAssistStatus, surface = "runtime") {
  const offset = status?.preconditioning_offset;
  if (!offset) return nothing;
  const format = (value: number) => host._formatTemperature(value, entityId);
  const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${format(Math.abs(value))}`;
  const target = (scalar?: number | null, low?: number | null, high?: number | null): string => typeof scalar === "number" ? format(scalar)
    : typeof low === "number" && typeof high === "number" ? `${format(low)} – ${format(high)}` : "—";
  const base = offset.base_target;
  const detail = [
    host._t("preconditioningOffsetNominal", { value: target(status.target_temperature, status.target_temp_low, status.target_temp_high) }),
    host._t("preconditioningOffsetBase", { value: "temperature" in base ? format(base.temperature) : target(undefined, base.target_temp_low, base.target_temp_high) }),
    host._t("preconditioningOffsetRequested", { value: signed(offset.requested) }),
    host._t("preconditioningOffsetApplied", { value: signed(offset.applied) }),
    host._t("preconditioningOffsetFinal", { value: target(status.applied_temperature, status.applied_target_temp_low, status.applied_target_temp_high) }),
    host._t(offset.limited_by === "minimum" ? "preconditioningOffsetMinimum" : offset.limited_by === "maximum" ? "preconditioningOffsetMaximum" : offset.limited_by === "step" ? "preconditioningOffsetStep" : "preconditioningOffsetUnrestricted"),
  ];
  const label = host._t("preconditioningOffsetBadge", { offset: signed(offset.applied) });
  return html`<span class="preconditioning-offset-badge" data-direction=${offset.direction}>
    <ha-icon icon="mdi:clock-fast" aria-hidden="true"></ha-icon><span>${label}</span>
    ${renderInlineHelp(`preconditioning-offset-${surface}-${entityId.replace(/[^a-zA-Z0-9_-]/g, "-")}`, label, detail)}
  </span>`;
}
