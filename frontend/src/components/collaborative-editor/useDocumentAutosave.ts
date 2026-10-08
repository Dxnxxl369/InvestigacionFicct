import { useCallback, useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { api, type DocumentoDTO, type DocumentoRequest } from "@/lib/api";
import type { DocumentSettings } from "./editorTypes";

type EditorStatus = "synced" | "dirty" | "offline" | "remote";

type UseDocumentAutosaveParams = {
  editor: TiptapEditor | null;
  documento: DocumentoDTO;
  storageKey: string;
  pendingKey: string;
  statusRef: MutableRefObject<EditorStatus>;
  buildDocumentPayload: (html: string, options?: SaveDocumentOptions) => DocumentoRequest;
  setStatus: (status: EditorStatus) => void;
  onSaved?: (documento: DocumentoDTO) => void;
};

export type SaveDocumentOptions = {
  settingsOverride?: DocumentSettings;
  titleOverride?: string;
};

export function useDocumentAutosave({
  editor,
  documento,
  storageKey,
  pendingKey,
  statusRef,
  buildDocumentPayload,
  setStatus,
  onSaved,
}: UseDocumentAutosaveParams) {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const saveDocument = useCallback(
    async (contentOverride?: string, options?: SaveDocumentOptions) => {
      if (!editor || documento.miPermiso === "LECTURA") return;
      const html = contentOverride ?? editor.getHTML();
      const payload = buildDocumentPayload(html, options);
      try {
        setSaving(true);
        const updated = await api.updateDocumento(documento.id, payload);
        localStorage.removeItem(pendingKey);
        localStorage.setItem(storageKey, html);
        setStatus("synced");
        setLastSaved(new Date().toLocaleTimeString());
        onSaved?.(updated);
      } catch {
        localStorage.setItem(pendingKey, JSON.stringify({ ...payload, savedAt: new Date().toISOString() }));
        setStatus("offline");
      } finally {
        setSaving(false);
      }
    },
    [buildDocumentPayload, documento.id, documento.miPermiso, editor, onSaved, pendingKey, setStatus, storageKey]
  );

  useEffect(() => {
    if (!editor || documento.miPermiso === "LECTURA") return;
    const preservePendingChanges = () => {
      if (statusRef.current !== "dirty" && statusRef.current !== "offline") return;
      const html = editor.getHTML();
      localStorage.setItem(pendingKey, JSON.stringify({
        ...buildDocumentPayload(html),
        savedAt: new Date().toISOString(),
        reason: "page-lifecycle",
      }));
      localStorage.setItem(storageKey, html);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") preservePendingChanges();
    };
    window.addEventListener("beforeunload", preservePendingChanges);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", preservePendingChanges);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [buildDocumentPayload, documento.miPermiso, editor, pendingKey, statusRef, storageKey]);

  useEffect(() => {
    const syncPending = () => {
      if (localStorage.getItem(pendingKey)) saveDocument();
    };
    window.addEventListener("online", syncPending);
    if (navigator.onLine) syncPending();
    return () => window.removeEventListener("online", syncPending);
  }, [pendingKey, saveDocument]);

  return {
    saving,
    lastSaved,
    setLastSaved,
    saveDocument,
  };
}
