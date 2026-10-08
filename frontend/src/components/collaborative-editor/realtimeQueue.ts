import type { MutableRefObject } from "react";
import type { DocumentSettings } from "./editorTypes";

export const MAX_QUEUED_STEP_BATCHES = 20;

export type QueuedLiveSnapshot = {
  html: string;
  settings?: DocumentSettings;
};

export function queueLatestSnapshot(
  ref: MutableRefObject<QueuedLiveSnapshot | null>,
  snapshot: QueuedLiveSnapshot
) {
  ref.current = snapshot;
}

export function takeLatestSnapshot(ref: MutableRefObject<QueuedLiveSnapshot | null>) {
  const snapshot = ref.current;
  ref.current = null;
  return snapshot;
}

export function queueStepBatch(
  ref: MutableRefObject<Record<string, unknown>[][]>,
  steps: Record<string, unknown>[]
) {
  ref.current = [...ref.current, steps].slice(-MAX_QUEUED_STEP_BATCHES);
}

export function takeQueuedStepBatches(ref: MutableRefObject<Record<string, unknown>[][]>) {
  const batches = ref.current;
  ref.current = [];
  return batches;
}
