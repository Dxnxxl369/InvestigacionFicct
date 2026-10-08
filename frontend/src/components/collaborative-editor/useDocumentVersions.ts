import { useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { api, type DocumentoDTO, type DocumentoVersionDTO } from "@/lib/api";
import type { DocumentSettings } from "./editorTypes";
import { parseStoredDocumentContent } from "./documentModel";

type UseDocumentVersionsParams = {
  documentId: number;
  editor: TiptapEditor | null;
  applyStoredSettings: (settings: DocumentSettings) => void;
  setTitle: (title: string) => void;
  setStatus: (status: "synced") => void;
  onSaved?: (documento: DocumentoDTO) => void;
};

export function useDocumentVersions({
  documentId,
  editor,
  applyStoredSettings,
  setTitle,
  setStatus,
  onSaved,
}: UseDocumentVersionsParams) {
  const [versions, setVersions] = useState<DocumentoVersionDTO[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const loadVersions = async () => {
    try {
      setLoadingVersions(true);
      const data = await api.getVersionesDocumento(documentId);
      setVersions(data);
      setShowVersions(true);
    } finally {
      setLoadingVersions(false);
    }
  };

  const restoreVersion = async (version: DocumentoVersionDTO) => {
    if (!editor) return;
    const restored = await api.restaurarVersionDocumento(documentId, version.id);
    const parsed = parseStoredDocumentContent(restored.contenido || version.contenido);
    editor.commands.setContent(parsed.html || "<p></p>");
    applyStoredSettings(parsed.settings);
    setTitle(restored.titulo || version.titulo);
    setStatus("synced");
    setShowVersions(false);
    onSaved?.(restored);
  };

  return {
    versions,
    showVersions,
    loadingVersions,
    setShowVersions,
    loadVersions,
    restoreVersion,
  };
}
