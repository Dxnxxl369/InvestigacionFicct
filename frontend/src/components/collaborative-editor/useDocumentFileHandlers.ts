import { useCallback, useState, type RefObject } from "react";
import type { Editor } from "@tiptap/core";
import { importDocxFile, readImageFileAsDataUrl } from "./docxImport";
import type { DocumentSettings, EditorSaveStatus, FootnoteItem, ReviewComment } from "./editorTypes";
import type { SaveDocumentOptions } from "./useDocumentAutosave";

type UseDocumentFileHandlersOptions = {
  editor: Editor | null;
  canEdit: boolean;
  currentSettings: DocumentSettings;
  fileInputRef: RefObject<HTMLInputElement>;
  imageInputRef: RefObject<HTMLInputElement>;
  saveDocument: (contentOverride?: string, options?: SaveDocumentOptions) => void;
  setTitle: (title: string) => void;
  setStatus: (status: EditorSaveStatus) => void;
  setFootnotes: (footnotes: FootnoteItem[]) => void;
  setEndnotes: (endnotes: FootnoteItem[]) => void;
  setComments: (comments: ReviewComment[]) => void;
};

export function useDocumentFileHandlers({
  editor,
  canEdit,
  currentSettings,
  fileInputRef,
  imageInputRef,
  saveDocument,
  setTitle,
  setStatus,
  setFootnotes,
  setEndnotes,
  setComments,
}: UseDocumentFileHandlersOptions) {
  const [importing, setImporting] = useState(false);

  const importDocx = useCallback(async (file: File | undefined) => {
    if (!file || !editor || !canEdit) return;
    try {
      setImporting(true);
      const imported = await importDocxFile(file);
      editor.commands.setContent(imported.html);
      if (imported.title) setTitle(imported.title);
      setFootnotes(imported.footnotes);
      setEndnotes(imported.endnotes);
      setComments(imported.comments);
      setStatus("dirty");
      setTimeout(() => saveDocument(imported.html, {
        titleOverride: imported.title,
        settingsOverride: {
          ...currentSettings,
          footnotes: imported.footnotes,
          endnotes: imported.endnotes,
          comments: imported.comments,
        },
      }), 150);
    } catch {
      setStatus("offline");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [canEdit, currentSettings, editor, fileInputRef, saveDocument, setComments, setEndnotes, setFootnotes, setStatus, setTitle]);

  const insertImage = useCallback(async (file: File | undefined) => {
    if (!file || !editor || !canEdit) return;
    try {
      const src = await readImageFileAsDataUrl(file);
      const dimensions = await readImageDimensions(src);
      (editor.chain().focus() as any).setImage({
        src,
        alt: file.name,
        title: file.name,
        aspectRatio: dimensions ? String(roundAspectRatio(dimensions.width / dimensions.height)) : undefined,
      }).run();
      setStatus("dirty");
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }, [canEdit, editor, imageInputRef, setStatus]);

  return {
    importing,
    importDocx,
    insertImage,
  };
}

function readImageDimensions(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
        return;
      }
      resolve(null);
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function roundAspectRatio(value: number) {
  return Math.max(0.05, Math.min(20, Math.round(value * 10000) / 10000));
}
