import type { MutableRefObject } from "react";

export function effectiveLiveVersion(
  liveVersionRef: MutableRefObject<number>,
  optimisticLiveVersionRef: MutableRefObject<number>
) {
  return Math.max(liveVersionRef.current, optimisticLiveVersionRef.current);
}

export function setOptimisticLiveVersion(
  nextVersion: number,
  liveVersionRef: MutableRefObject<number>,
  optimisticLiveVersionRef: MutableRefObject<number>,
  optimisticTimerRef: MutableRefObject<number | null>
) {
  optimisticLiveVersionRef.current = Math.max(optimisticLiveVersionRef.current, nextVersion);
  if (optimisticTimerRef.current) window.clearTimeout(optimisticTimerRef.current);
  optimisticTimerRef.current = window.setTimeout(() => {
    optimisticLiveVersionRef.current = liveVersionRef.current;
    optimisticTimerRef.current = null;
  }, 1800);
}

export function confirmServerVersion(
  serverVersion: number | undefined,
  liveVersionRef: MutableRefObject<number>,
  optimisticLiveVersionRef: MutableRefObject<number>,
  optimisticTimerRef: MutableRefObject<number | null>
) {
  if (serverVersion === undefined || !Number.isFinite(serverVersion)) return;
  liveVersionRef.current = Math.max(liveVersionRef.current, serverVersion);
  if (liveVersionRef.current >= optimisticLiveVersionRef.current) {
    optimisticLiveVersionRef.current = liveVersionRef.current;
    if (optimisticTimerRef.current) {
      window.clearTimeout(optimisticTimerRef.current);
      optimisticTimerRef.current = null;
    }
  }
}
