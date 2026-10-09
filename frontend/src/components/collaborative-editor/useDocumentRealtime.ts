import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { DocumentSettings, RemoteCursor } from "./editorTypes";
import { normalizeRealtimeUserLabel } from "./realtimeMetadata";
import { confirmServerVersion, effectiveLiveVersion, setOptimisticLiveVersion } from "./realtimeVersion";
import type { RemoteConflictInfo } from "./collaborationConflict";
import {
  queueLatestSnapshot,
  queueStepBatch,
  takeLatestSnapshot,
  takeQueuedStepBatches,
  type QueuedLiveSnapshot,
} from "./realtimeQueue";

const MAX_LIVE_HTML_CHARS = 1_500_000;
const MAX_LIVE_STEPS = 100;
const MAX_CURSOR_POSITION = 2_000_000;

export type RemoteSnapshot = {
  html: string;
  settings?: DocumentSettings;
  usuario?: string;
  at?: string;
  serverVersion?: number;
  stale?: boolean;
};

export type RemoteSteps = {
  steps: Record<string, unknown>[];
  usuario?: string;
  at?: string;
  serverVersion?: number;
  stale?: boolean;
};

type RealtimeOptions = {
  documentId: number;
  currentUserName?: string;
  canApplyRemoteSnapshot: () => boolean;
  canApplyRemoteSteps: () => boolean;
  onRemoteSnapshot: (snapshot: RemoteSnapshot) => void;
  onRemoteSteps: (steps: RemoteSteps) => boolean;
  onRemoteConflict: (conflict: RemoteConflictInfo) => void;
};

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useDocumentRealtime({
  documentId,
  currentUserName,
  canApplyRemoteSnapshot,
  canApplyRemoteSteps,
  onRemoteSnapshot,
  onRemoteSteps,
  onRemoteConflict,
}: RealtimeOptions) {
  const clientRef = useRef<Client | null>(null);
  const sessionIdRef = useRef(`live-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const pendingSnapshotRef = useRef<RemoteSnapshot | null>(null);
  const queuedSnapshotRef = useRef<QueuedLiveSnapshot | null>(null);
  const queuedStepBatchesRef = useRef<Record<string, unknown>[][]>([]);
  const liveVersionRef = useRef(0);
  const optimisticLiveVersionRef = useRef(0);
  const optimisticTimerRef = useRef<number | null>(null);
  const flushTimersRef = useRef<number[]>([]);
  const callbacksRef = useRef({ canApplyRemoteSnapshot, canApplyRemoteSteps, onRemoteSnapshot, onRemoteSteps, onRemoteConflict });
  const userLabel = useMemo(() => normalizeRealtimeUserLabel(currentUserName), [currentUserName]);
  const cursorColor = useMemo(() => colorFromText(currentUserName || sessionIdRef.current), [currentUserName]);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [queuedMessageCount, setQueuedMessageCount] = useState(0);

  useEffect(() => {
    callbacksRef.current = { canApplyRemoteSnapshot, canApplyRemoteSteps, onRemoteSnapshot, onRemoteSteps, onRemoteConflict };
  }, [canApplyRemoteSnapshot, canApplyRemoteSteps, onRemoteConflict, onRemoteSnapshot, onRemoteSteps]);

  const sendSnapshot = useCallback((client: Client, snapshot: QueuedLiveSnapshot) => {
    client.publish({
      destination: `/app/documentos/${documentId}/live`,
      headers: getAuthHeader(),
      body: JSON.stringify({
        type: "snapshot",
        sessionId: sessionIdRef.current,
        usuario: userLabel,
        html: snapshot.html,
        settings: snapshot.settings,
        baseVersion: effectiveLiveVersion(liveVersionRef, optimisticLiveVersionRef),
        at: new Date().toISOString(),
      }),
    });
  }, [documentId, userLabel]);

  const sendSteps = useCallback((client: Client, steps: Record<string, unknown>[]) => {
    const baseVersion = effectiveLiveVersion(liveVersionRef, optimisticLiveVersionRef);
    setOptimisticLiveVersion(baseVersion + 1, liveVersionRef, optimisticLiveVersionRef, optimisticTimerRef);
    client.publish({
      destination: `/app/documentos/${documentId}/live`,
      headers: getAuthHeader(),
      body: JSON.stringify({
        type: "steps",
        sessionId: sessionIdRef.current,
        usuario: userLabel,
        steps,
        baseVersion,
        at: new Date().toISOString(),
      }),
    });
  }, [documentId, userLabel]);

  const clearFlushTimers = useCallback(() => {
    flushTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    flushTimersRef.current = [];
  }, []);

  const flushQueuedMessages = useCallback(() => {
    const client = clientRef.current;
    if (!client?.connected) return;

    clearFlushTimers();
    const snapshot = takeLatestSnapshot(queuedSnapshotRef);
    if (snapshot) {
      queuedStepBatchesRef.current = [];
      setQueuedMessageCount(0);
      sendSnapshot(client, snapshot);
      return;
    }

    const batches = takeQueuedStepBatches(queuedStepBatchesRef);
    setQueuedMessageCount(0);
    batches.forEach((steps, index) => {
      const timerId = window.setTimeout(() => {
        const connectedClient = clientRef.current;
        if (connectedClient?.connected) sendSteps(connectedClient, steps);
      }, index * 55);
      flushTimersRef.current.push(timerId);
    });
  }, [clearFlushTimers, sendSnapshot, sendSteps]);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
    const wsBase = apiUrl.replace(/\/api$/, "");
    const client = new Client({
      webSocketFactory: () => new SockJS(`${wsBase}/ws`),
      connectHeaders: getAuthHeader(),
      reconnectDelay: 5000,
      onConnect: () => {
        setIsConnected(true);
        client.subscribe(`/topic/documentos/${documentId}/live`, (message) => {
          try {
            const data = JSON.parse(message.body);
            if (!data.sessionId) return;
            if (data.type === "cursor") {
              if (data.sessionId === sessionIdRef.current) return;
              const from = Number(data.cursorFrom);
              const to = Number(data.cursorTo);
              if (!Number.isFinite(from) || !Number.isFinite(to)) return;
              setRemoteCursors((cursors) => {
                const nextCursor: RemoteCursor = {
                  sessionId: data.sessionId,
                  name: normalizeRealtimeUserLabel(data.usuario),
                  from: Math.max(0, Math.min(from, to)),
                  to: Math.max(0, Math.max(from, to)),
                  color: sanitizeCursorColor(data.color),
                  lastSeen: Date.now(),
                };
                return [...cursors.filter((cursor) => cursor.sessionId !== data.sessionId), nextCursor];
              });
              return;
            }
            if (data.type === "steps") {
              const serverVersion = typeof data.serverVersion === "number" ? data.serverVersion : undefined;
              if (serverVersion !== undefined && serverVersion <= liveVersionRef.current) return;
              confirmServerVersion(serverVersion, liveVersionRef, optimisticLiveVersionRef, optimisticTimerRef);
              if (data.sessionId === sessionIdRef.current) {
                return;
              }
              // Incremental ProseMirror steps are unsafe without CRDT/rebase support:
              // positions drift when another client inserts paragraphs or line breaks.
              // We keep version tracking, but rely on debounced snapshots for content sync.
              return;
            }
            if (data.type !== "snapshot") return;
            const serverVersion = typeof data.serverVersion === "number" ? data.serverVersion : undefined;
            if (serverVersion !== undefined && serverVersion <= liveVersionRef.current) return;
            if (data.sessionId === sessionIdRef.current) {
              confirmServerVersion(serverVersion, liveVersionRef, optimisticLiveVersionRef, optimisticTimerRef);
              return;
            }
            const snapshot: RemoteSnapshot = {
              html: data.html || "",
              settings: data.settings,
              usuario: normalizeRealtimeUserLabel(data.usuario),
              at: data.at,
              serverVersion,
              stale: Boolean(data.stale),
            };
            if (!snapshot.html) return;
            if (!snapshot.stale && callbacksRef.current.canApplyRemoteSnapshot()) {
              confirmServerVersion(snapshot.serverVersion, liveVersionRef, optimisticLiveVersionRef, optimisticTimerRef);
              callbacksRef.current.onRemoteSnapshot(snapshot);
              return;
            }
            pendingSnapshotRef.current = snapshot;
            callbacksRef.current.onRemoteConflict({
              source: "snapshot",
              usuario: snapshot.usuario,
              at: snapshot.at,
              serverVersion: snapshot.serverVersion,
              hasPendingSnapshot: true,
            });
          } catch {}
        });
        flushQueuedMessages();
      },
      onDisconnect: () => setIsConnected(false),
      onStompError: () => setIsConnected(false),
      onWebSocketClose: () => setIsConnected(false),
    });
    clientRef.current = client;
    client.activate();
    const cleanupId = window.setInterval(() => {
      setRemoteCursors((cursors) => cursors.filter((cursor) => Date.now() - cursor.lastSeen < 15000));
    }, 5000);
    return () => {
      window.clearInterval(cleanupId);
      clearFlushTimers();
      setIsConnected(false);
      if (optimisticTimerRef.current) window.clearTimeout(optimisticTimerRef.current);
      clientRef.current = null;
      client.deactivate();
    };
  }, [clearFlushTimers, documentId, flushQueuedMessages]);

  const publishSnapshot = useCallback((html: string, settings?: DocumentSettings) => {
    const client = clientRef.current;
    if (!html || html.length > MAX_LIVE_HTML_CHARS) return;
    if (!client?.connected) {
      queueLatestSnapshot(queuedSnapshotRef, { html, settings });
      queuedStepBatchesRef.current = [];
      setQueuedMessageCount(1);
      return;
    }
    sendSnapshot(client, { html, settings });
  }, [sendSnapshot]);

  const publishCursor = useCallback((from: number, to: number) => {
    const client = clientRef.current;
    if (!client?.connected) return;
    const safeFrom = clampCursorPosition(from);
    const safeTo = clampCursorPosition(to);
    client.publish({
      destination: `/app/documentos/${documentId}/live`,
      headers: getAuthHeader(),
      body: JSON.stringify({
        type: "cursor",
        sessionId: sessionIdRef.current,
        usuario: userLabel,
        cursorFrom: Math.min(safeFrom, safeTo),
        cursorTo: Math.max(safeFrom, safeTo),
        color: cursorColor,
        at: new Date().toISOString(),
      }),
    });
  }, [cursorColor, documentId, userLabel]);

  const publishSteps = useCallback((steps: Record<string, unknown>[]) => {
    const client = clientRef.current;
    if (!steps.length || steps.length > MAX_LIVE_STEPS) return;
    if (!client?.connected) {
      queueStepBatch(queuedStepBatchesRef, steps);
      setQueuedMessageCount(queuedStepBatchesRef.current.length);
      return;
    }
    sendSteps(client, steps);
  }, [sendSteps]);

  const applyPendingSnapshot = useCallback(() => {
    const snapshot = pendingSnapshotRef.current;
    if (!snapshot) return false;
    pendingSnapshotRef.current = null;
    confirmServerVersion(snapshot.serverVersion, liveVersionRef, optimisticLiveVersionRef, optimisticTimerRef);
    callbacksRef.current.onRemoteSnapshot(snapshot);
    return true;
  }, []);

  const syncServerVersion = useCallback((serverVersion?: number) => {
    confirmServerVersion(serverVersion, liveVersionRef, optimisticLiveVersionRef, optimisticTimerRef);
  }, []);

  return {
    publishSnapshot,
    publishSteps,
    publishCursor,
    applyPendingSnapshot,
    syncServerVersion,
    remoteCursors,
    isConnected,
    queuedMessageCount,
  };
}

function colorFromText(value: string) {
  const colors = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#be123c", "#4f46e5"];
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

function sanitizeCursorColor(value?: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#2563eb";
}

function clampCursorPosition(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_CURSOR_POSITION, Math.floor(value)));
}
