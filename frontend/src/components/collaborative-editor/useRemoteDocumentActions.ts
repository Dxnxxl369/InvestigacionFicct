import type { Editor } from "@tiptap/core";
import type { DocumentoDTO } from "@/lib/api";
import { api } from "@/lib/api";
import { parseStoredDocumentContent } from "./documentModel";
import type { DocumentSettings, EditorSaveStatus } from "./editorTypes";
import type { RemoteConflictInfo } from "./collaborationConflict";

type UseRemoteDocumentActionsOptions = {
  editor: Editor | null;
  documentId: number;
  title: string;
  status: EditorSaveStatus;
  remoteConflict: RemoteConflictInfo | null;
  pendingKey: string;
  storageKey: string;
  applyPendingSnapshot: () => boolean;
  applyStoredSettings: (settings: DocumentSettings) => void;
  setTitle: (title: string) => void;
  setStatus: (status: EditorSaveStatus) => void;
  setRemoteConflict: (conflict: RemoteConflictInfo | null) => void;
  onSaved?: (documento: DocumentoDTO) => void;
};

export function useRemoteDocumentActions({
  editor,
  documentId,
  title,
  status,
  remoteConflict,
  pendingKey,
  storageKey,
  applyPendingSnapshot,
  applyStoredSettings,
  setTitle,
  setStatus,
  setRemoteConflict,
  onSaved,
}: UseRemoteDocumentActionsOptions) {
  const loadRemoteChanges = async () => {
    if (!editor) return;
    if (
      (status === "dirty" || remoteConflict?.hasLocalPendingChanges) &&
      !window.confirm("Tienes cambios locales sin guardar. ¿Deseas reemplazarlos por la version remota?")
    ) return;

    if (applyPendingSnapshot()) {
      setStatus("synced");
      setRemoteConflict(null);
      return;
    }

    const remote = await api.getDocumentoById(documentId);
    const parsed = parseStoredDocumentContent(remote.contenido || "<p></p>");
    editor.commands.setContent(parsed.html || "<p></p>");
    applyStoredSettings(parsed.settings);
    setTitle(remote.titulo || title);
    localStorage.removeItem(pendingKey);
    localStorage.setItem(storageKey, parsed.html || "<p></p>");
    setStatus("synced");
    setRemoteConflict(null);
    onSaved?.(remote);
  };

  return {
    loadRemoteChanges,
  };
}
