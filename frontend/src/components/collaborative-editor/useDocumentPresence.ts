import { useEffect, useMemo, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { PresenceUser } from "./editorTypes";
import { normalizeRealtimeUserLabel } from "./realtimeMetadata";
import type { RemoteConflictInfo } from "./collaborationConflict";

type EditorStatusSetter = (status: "remote") => void;
type ServerVersionSync = (serverVersion?: number) => void;
type RemoteNotificationHandler = (conflict: RemoteConflictInfo) => void;

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useDocumentPresence(
  documentId: number,
  currentUserName: string | undefined,
  setEditorStatus: EditorStatusSetter,
  syncServerVersion?: ServerVersionSync,
  onRemoteNotification?: RemoteNotificationHandler
) {
  const [activeCollaborators, setActiveCollaborators] = useState<PresenceUser[]>([]);
  const sessionIdRef = useRef(`session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const userLabel = useMemo(() => normalizeRealtimeUserLabel(currentUserName), [currentUserName]);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
    const wsBase = apiUrl.replace(/\/api$/, "");
    const client = new Client({
      webSocketFactory: () => new SockJS(`${wsBase}/ws`),
      connectHeaders: getAuthHeader(),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/documentos/${documentId}`, (message) => {
          try {
            const data = JSON.parse(message.body);
            const remoteUser = normalizeRealtimeUserLabel(data.usuario);
            const serverVersion = typeof data.serverVersion === "number" ? data.serverVersion : undefined;
            syncServerVersion?.(serverVersion);
            if (data.usuario && remoteUser !== userLabel) {
              onRemoteNotification?.({
                source: "rest",
                usuario: remoteUser,
                at: data.updatedAt,
                serverVersion,
                hasPendingSnapshot: false,
              });
              setEditorStatus("remote");
            }
          } catch {}
        });
        client.subscribe(`/topic/documentos/${documentId}/presence`, (message) => {
          try {
            const data = JSON.parse(message.body);
            if (!data.sessionId || data.sessionId === sessionIdRef.current) return;
            if (data.event === "leave") {
              setActiveCollaborators((users) => users.filter((user) => user.sessionId !== data.sessionId));
              return;
            }
            setActiveCollaborators((users) => {
              const nextUser = {
                sessionId: data.sessionId,
                name: normalizeRealtimeUserLabel(data.usuario),
                lastSeen: Date.now(),
              };
              return [...users.filter((user) => user.sessionId !== data.sessionId), nextUser];
            });
          } catch {}
        });
        const publishPresence = (event: "join" | "heartbeat" | "leave") => {
          client.publish({
            destination: `/app/documentos/${documentId}/presence`,
            headers: getAuthHeader(),
            body: JSON.stringify({
              event,
              sessionId: sessionIdRef.current,
              usuario: userLabel,
              at: new Date().toISOString(),
            }),
          });
        };
        publishPresence("join");
        const heartbeatId = window.setInterval(() => {
          publishPresence("heartbeat");
          setActiveCollaborators((users) => users.filter((user) => Date.now() - user.lastSeen < 20000));
        }, 8000);
        (client as Client & { ficctHeartbeatId?: number; ficctLeave?: () => void }).ficctHeartbeatId = heartbeatId;
        (client as Client & { ficctHeartbeatId?: number; ficctLeave?: () => void }).ficctLeave = () => publishPresence("leave");
      },
    });
    client.activate();
    return () => {
      const extendedClient = client as Client & { ficctHeartbeatId?: number; ficctLeave?: () => void };
      if (extendedClient.ficctHeartbeatId) window.clearInterval(extendedClient.ficctHeartbeatId);
      extendedClient.ficctLeave?.();
      client.deactivate();
    };
  }, [documentId, onRemoteNotification, setEditorStatus, syncServerVersion, userLabel]);

  return activeCollaborators;
}
