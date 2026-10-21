import { html, nothing } from "lit";
import type { PreconditioningDependency } from "../types";
import type { TranslationKey } from "../translations";

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;
export const dependencyReasonKeys: Record<string, TranslationKey> = {
  planned: "preconditioningDependencyPlanned",
  waiting_for_master: "preconditioningDependencyWaiting",
  master_no_preconditioning: "preconditioningDependencyNoStart",
  master_missing: "preconditioningDependencyMissing",
  master_direction_mismatch: "preconditioningDependencyDirection",
  master_start_after_target: "preconditioningDependencyTooLate",
};

export const dependencyReasonDetailKeys: Record<string, TranslationKey> = {
  master_not_managed: "preconditioningMasterNotManaged",
  master_ineligible: "preconditioningMasterIneligible",
  master_entity_missing: "preconditioningMasterEntityMissing",
  master_unavailable: "preconditioningMasterUnavailable",
  master_state_unknown: "preconditioningMasterStateUnknown",
  master_scheduling_disabled: "preconditioningMasterSchedulingDisabled",
  master_preconditioning_disabled: "preconditioningMasterPreconditioningDisabled",
  master_profile_paused: "preconditioningMasterProfilePaused",
  master_override_active: "preconditioningMasterOverrideActive",
  master_no_transition: "preconditioningMasterNoTransition",
};

export function renderPreconditioningDependency(dependency: PreconditioningDependency | null | undefined,
  t: Translate, formatTime: (iso: string) => string, masterName?: string, detailed = false) {
  if (!dependency) return nothing;
  const reason = dependencyReasonDetailKeys[dependency.reason_detail ?? ""] ?? dependencyReasonKeys[dependency.reason ?? ""];
  const rows: Array<[TranslationKey, string | null | undefined]> = [
    ["preconditioningDependencyIndependentStart", dependency.independent_start],
    [dependency.master_start_accepted ? "preconditioningDependencyAcceptedStart" : "preconditioningDependencyMasterStart", dependency.master_start],
    ["preconditioningDependencyMasterTarget", dependency.master_target_when],
    ["preconditioningDependencyEffectiveStart", dependency.effective_start],
  ];
  return html`<div class="preconditioning-dependency">
    <span>${t("preconditioningDependencyAssociation", { master: masterName ?? dependency.master_entity_id })}</span>
    ${reason ? html`<span>${t(reason)}</span>` : nothing}
    ${detailed ? html`<dl>${rows.filter(([, value]) => value && Number.isFinite(Date.parse(value))).map(([label, value]) => html`<div><dt>${t(label)}</dt><dd>${formatTime(value!)}</dd></div>`)}</dl>
      <small>${t("preconditioningDependencyEvidenceHelp")}</small>` : nothing}
  </div>`;
}
