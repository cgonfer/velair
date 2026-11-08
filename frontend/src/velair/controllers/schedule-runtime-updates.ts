import type { OperationStatus, ScheduleResponse, ScheduleUpdateMessage } from "../types";

const runtimeSnapshots = new WeakSet<ScheduleResponse>();

/** Runtime pushes do not change schedule resources or temporary editor drafts. */
export function isRuntimeScheduleSnapshot(data: ScheduleResponse): boolean {
  return runtimeSnapshots.has(data);
}

/** Retain only the latest pushed fields while a full response is in flight. */
export class ScheduleRuntimeUpdates {
  private _revision = 0;
  private _comfort = new Map<string, { revision: number; value: NonNullable<ScheduleResponse["comfort"]>[string] }>();
  private _operation?: { revision: number; value: OperationStatus | null };

  public get revision(): number { return this._revision; }

  public reset(): void {
    this._revision++;
    this._comfort.clear();
    this._operation = undefined;
  }

  public accept(message: ScheduleUpdateMessage): boolean {
    const hasComfort = message.comfort !== undefined;
    const hasOperation = Object.prototype.hasOwnProperty.call(message, "operation_status")
      && message.operation_status !== undefined;
    if (!hasComfort && !hasOperation) return false;
    const revision = ++this._revision;
    for (const [entity, value] of Object.entries(message.comfort ?? {})) {
      this._comfort.set(entity, { revision, value });
    }
    if (hasOperation) this._operation = { revision, value: message.operation_status! };
    return true;
  }

  public merge(data: ScheduleResponse, afterRevision = 0, runtimeOnly = false,
               requestOperationId?: string | null): ScheduleResponse {
    const comfort = Object.fromEntries([...this._comfort]
      .filter(([, update]) => update.revision > afterRevision)
      .map(([entity, update]) => [entity, update.value]));
    const hasComfort = Object.keys(comfort).length > 0;
    const operation = this._operation && this._operation.revision > afterRevision ? this._operation : undefined;
    // A reply still naming the request's original operation can be overtaken
    // by a push. A different operation in the reply is authoritative, including
    // when clocks rewind or two operations have identical start timestamps.
    const replyOperationId = data.operation_status?.id ?? null;
    const pushedOperationId = operation?.value?.id ?? null;
    const newerOperation = !runtimeOnly && operation !== undefined
      && replyOperationId !== pushedOperationId
      && (requestOperationId === undefined || replyOperationId !== requestOperationId);
    const sameOperation = operation?.value && data.operation_status?.id === operation.value.id;
    const terminalOperation = sameOperation && data.operation_status?.state !== "running"
      && operation?.value?.state === "running";
    const newerProgress = !runtimeOnly && sameOperation
      && data.operation_status!.completed > operation!.value!.completed;
    const hasOperation = operation !== undefined && !newerOperation && !terminalOperation && !newerProgress;
    if (!hasComfort && !hasOperation) return data;
    const merged = {
      ...data,
      ...(hasComfort ? { comfort: { ...data.comfort, ...comfort } } : {}),
      ...(hasOperation ? { operation_status: operation!.value } : {}),
    };
    if (runtimeOnly) runtimeSnapshots.add(merged);
    return merged;
  }
}
