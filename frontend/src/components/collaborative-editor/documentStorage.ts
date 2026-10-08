import { parseStoredDocumentContent } from "./documentModel";

export function documentStorageKeys(documentId: number) {
  const storageKey = `ficct_doc_collab_${documentId}`;
  return {
    storageKey,
    pendingKey: `${storageKey}_pending`,
    settingsKey: `${storageKey}_settings`,
  };
}

export function readInitialDocumentContent(content: string | undefined, pendingKey: string) {
  const fallback = content || "<h1>Documento colaborativo</h1><p></p>";
  if (typeof window === "undefined") return parseStoredDocumentContent(fallback);
  const pending = localStorage.getItem(pendingKey);
  if (pending) {
    try {
      const parsed = JSON.parse(pending);
      return parseStoredDocumentContent(parsed.contenido || fallback);
    } catch {}
  }
  return parseStoredDocumentContent(fallback);
}
