import { useMemo, type Dispatch, type SetStateAction } from "react";
import type { Editor } from "@tiptap/core";
import {
  buildCoverPageHtml,
  buildQuickBlockHtml,
  type CoverPageTemplate,
  type QuickBlockTemplate,
} from "./editorTemplates";
import { escapeHtml, wordFieldLabel } from "./documentModel";
import type {
  EditorSaveStatus,
  ImageAlignment,
  ImageWrapMode,
  SectionBreakKind,
  WordFieldType,
  WordShapeKind,
} from "./editorTypes";

type UseInsertActionsOptions = {
  editor: Editor | null;
  documentTitle: string;
  currentUserName?: string;
  shapeText: string;
  shapeFill: string;
  equationDraft: string;
  setEquationDraft: Dispatch<SetStateAction<string>>;
  setStatus: (status: EditorSaveStatus) => void;
};

export function useInsertActions({
  editor,
  documentTitle,
  currentUserName,
  shapeText,
  shapeFill,
  equationDraft,
  setEquationDraft,
  setStatus,
}: UseInsertActionsOptions) {
  return useMemo(() => {
    const markDirty = () => setStatus("dirty");

    const insertPageBreak = () => {
      if (!editor) return;
      (editor.chain().focus() as any).insertContent({ type: "pageBreak" }).insertContent({ type: "paragraph" }).run();
      markDirty();
    };

    const insertColumnBreak = () => {
      if (!editor) return;
      (editor.chain().focus() as any).insertContent({ type: "columnBreak" }).insertContent({ type: "paragraph" }).run();
      markDirty();
    };

    const insertSectionBreak = (kind: SectionBreakKind) => {
      if (!editor) return;
      (editor.chain().focus() as any).insertContent({ type: "sectionBreak", attrs: { kind } }).insertContent({ type: "paragraph" }).run();
      markDirty();
    };

    const insertTextBox = () => {
      if (!editor) return;
      (editor.chain().focus() as any).insertContent({ type: "textBox", content: [{ type: "text", text: "Cuadro de texto" }] }).run();
      markDirty();
    };

    const insertCoverPage = (template: CoverPageTemplate) => {
      if (!editor) return;
      editor.chain().focus().insertContent(buildCoverPageHtml(template, documentTitle, currentUserName)).insertContent({ type: "pageBreak" }).run();
      markDirty();
    };

    const insertShape = (kind: WordShapeKind) => {
      if (!editor) return;
      (editor.chain().focus() as any)
        .insertContent({ type: "wordShape", attrs: { kind, text: shapeText.trim() || "Forma", fill: shapeFill } })
        .insertContent({ type: "paragraph" })
        .run();
      markDirty();
    };

    const insertQuickBlock = (template: QuickBlockTemplate) => {
      if (!editor) return;
      editor.chain().focus().insertContent(buildQuickBlockHtml(template)).run();
      markDirty();
    };

    const insertCheckBox = (checked = false) => {
      if (!editor) return;
      (editor.chain().focus() as any)
        .insertContent({ type: "checkBox", attrs: { checked, label: checked ? "Casilla marcada" : "Casilla" } })
        .insertContent(" ")
        .run();
      markDirty();
    };

    const insertWordField = (field: WordFieldType) => {
      if (!editor) return;
      const label = wordFieldLabel(field);
      (editor.chain().focus() as any)
        .insertContent({ type: "wordField", attrs: { field, label } })
        .insertContent(" ")
        .run();
      markDirty();
    };

    const wordFieldHtml = (field: WordFieldType) => {
      const label = wordFieldLabel(field);
      return `<span data-type="word-field" data-field-code="${field}" data-field-label="${escapeHtml(label)}">${escapeHtml(label)}</span>`;
    };

    const insertMailMergeBlock = (kind: "saludo" | "destinatario" | "tarea") => {
      if (!editor) return;
      const blocks = {
        saludo: `<p>Estimado/a ${wordFieldHtml("MERGE_NOMBRE")} ${wordFieldHtml("MERGE_APELLIDO")}:</p><p></p>`,
        destinatario: `<p>${wordFieldHtml("MERGE_NOMBRE")} ${wordFieldHtml("MERGE_APELLIDO")}<br>${wordFieldHtml("MERGE_CORREO")}<br>${wordFieldHtml("MERGE_GRUPO")}</p><p></p>`,
        tarea: `<p>Grupo: ${wordFieldHtml("MERGE_GRUPO")}<br>Tema: ${wordFieldHtml("MERGE_TEMA")}<br>Docente: ${wordFieldHtml("MERGE_DOCENTE")}</p><p></p>`,
      };
      editor.chain().focus().insertContent(blocks[kind]).run();
      markDirty();
    };

    const insertEquation = () => {
      if (!editor || !equationDraft.trim()) return;
      const equation = equationDraft.trim();
      editor.chain().focus().insertContent(`<span data-equation="${escapeHtml(equation)}">${escapeHtml(equation)}</span>`).run();
      setEquationDraft("");
      markDirty();
    };

    const insertSymbol = (symbol: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(symbol).run();
      markDirty();
    };

    const setImageWidth = (width: string) => {
      if (!editor) return;
      (editor.chain().focus() as any).updateAttributes("image", { width }).run();
      markDirty();
    };

    const setImageAlignment = (align: ImageAlignment) => {
      if (!editor) return;
      (editor.chain().focus() as any).updateAttributes("image", { align }).run();
      markDirty();
    };

    const setImageWrap = (wrap: ImageWrapMode) => {
      if (!editor) return;
      (editor.chain().focus() as any).updateAttributes("image", { wrap }).run();
      markDirty();
    };

    return {
      insertPageBreak,
      insertColumnBreak,
      insertSectionBreak,
      insertTextBox,
      insertCoverPage,
      insertShape,
      insertQuickBlock,
      insertCheckBox,
      insertWordField,
      insertMailMergeBlock,
      insertEquation,
      insertSymbol,
      setImageWidth,
      setImageAlignment,
      setImageWrap,
    };
  }, [currentUserName, documentTitle, editor, equationDraft, setEquationDraft, setStatus, shapeFill, shapeText]);
}
