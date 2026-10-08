import { useMemo, type Dispatch, type SetStateAction } from "react";
import type { Editor } from "@tiptap/core";
import { transformTextCase, type TextCaseMode } from "./editorTemplates";
import { parseParagraphTabStops } from "./docxExport";
import type {
  CustomTextStyle,
  EditorSaveStatus,
  LineHeight,
  ParagraphTabStop,
  TabLeaderKind,
  TabStopKind,
} from "./editorTypes";

type TableCommand = "addRowAfter" | "deleteRow" | "addColumnAfter" | "deleteColumn" | "mergeCells" | "splitCell" | "deleteTable";

type UseFormattingActionsOptions = {
  editor: Editor | null;
  paragraphSpacingBefore: number;
  paragraphSpacingAfter: number;
  paragraphShadingColor: string;
  tabStopPosition: number;
  tabStopKind: TabStopKind;
  tabStopLeader: TabLeaderKind;
  styleName: string;
  selectedCustomStyleId: string;
  tableCellColor: string;
  setLineHeight: Dispatch<SetStateAction<LineHeight>>;
  setStyleName: Dispatch<SetStateAction<string>>;
  setCustomStyles: Dispatch<SetStateAction<CustomTextStyle[]>>;
  setSelectedCustomStyleId: Dispatch<SetStateAction<string>>;
  setStatus: (status: EditorSaveStatus) => void;
};

export function useFormattingActions({
  editor,
  paragraphSpacingBefore,
  paragraphSpacingAfter,
  paragraphShadingColor,
  tabStopPosition,
  tabStopKind,
  tabStopLeader,
  styleName,
  selectedCustomStyleId,
  tableCellColor,
  setLineHeight,
  setStyleName,
  setCustomStyles,
  setSelectedCustomStyleId,
  setStatus,
}: UseFormattingActionsOptions) {
  return useMemo(() => {
    const markDirty = () => setStatus("dirty");

    const applyPresetStyle = (style: "title" | "subtitle" | "quote" | "emphasis") => {
      if (!editor) return;
      const chain = editor.chain().focus() as any;
      if (style === "title") {
        chain.setFontFamily("Georgia").setFontSize("22pt").setColor("#1f4e79").toggleBold().run();
        markDirty();
        return;
      }
      if (style === "subtitle") {
        chain.setFontFamily("Calibri").setFontSize("14pt").setColor("#5b6778").run();
        markDirty();
        return;
      }
      if (style === "quote") {
        chain.setFontFamily("Georgia").setFontSize("12pt").setColor("#374151").toggleItalic().run();
        markDirty();
        return;
      }
      chain.setFontFamily("Calibri").setFontSize("12pt").setColor("#0f766e").toggleBold().run();
      markDirty();
    };

    const changeTextCase = (mode: TextCaseMode) => {
      if (!editor) return;
      const { from, to, empty } = editor.state.selection;
      if (empty) return;
      const selected = editor.state.doc.textBetween(from, to, "\n");
      editor.chain().focus().insertContentAt({ from, to }, transformTextCase(selected, mode)).run();
      markDirty();
    };

    const applyLineHeight = (value: LineHeight) => {
      if (!editor) return;
      setLineHeight(value);
      (editor.chain().focus() as any).updateAttributes("paragraph", { lineHeight: value }).updateAttributes("heading", { lineHeight: value }).run();
      markDirty();
    };

    const applyParagraphSpacing = () => {
      if (!editor) return;
      const spacingBefore = String(Math.max(0, Math.min(72, paragraphSpacingBefore)));
      const spacingAfter = String(Math.max(0, Math.min(72, paragraphSpacingAfter)));
      (editor.chain().focus() as any)
        .updateAttributes("paragraph", { spacingBefore, spacingAfter })
        .updateAttributes("heading", { spacingBefore, spacingAfter })
        .run();
      markDirty();
    };

    const applyParagraphShading = () => {
      if (!editor) return;
      (editor.chain().focus() as any)
        .updateAttributes("paragraph", { paragraphShading: paragraphShadingColor })
        .updateAttributes("heading", { paragraphShading: paragraphShadingColor })
        .run();
      markDirty();
    };

    const toggleParagraphBorder = () => {
      if (!editor) return;
      const attrs = editor.getAttributes("paragraph").paragraphBorder ? editor.getAttributes("paragraph") : editor.getAttributes("heading");
      const next = attrs.paragraphBorder ? null : "true";
      (editor.chain().focus() as any)
        .updateAttributes("paragraph", { paragraphBorder: next })
        .updateAttributes("heading", { paragraphBorder: next })
        .run();
      markDirty();
    };

    const applyTabStop = () => {
      if (!editor) return;
      const attrs = editor.getAttributes("paragraph").tabStops ? editor.getAttributes("paragraph") : editor.getAttributes("heading");
      const existing = parseParagraphTabStops(attrs.tabStops);
      const nextStop: ParagraphTabStop = {
        position: Math.max(0.1, Math.min(7.5, tabStopPosition)),
        type: tabStopKind,
        leader: tabStopLeader,
      };
      const next = [
        ...existing.filter((stop) => Math.abs(stop.position - nextStop.position) > 0.02),
        nextStop,
      ].sort((a, b) => a.position - b.position);
      const serialized = JSON.stringify(next);
      (editor.chain().focus() as any)
        .updateAttributes("paragraph", { tabStops: serialized })
        .updateAttributes("heading", { tabStops: serialized })
        .run();
      markDirty();
    };

    const clearTabStops = () => {
      if (!editor) return;
      (editor.chain().focus() as any)
        .updateAttributes("paragraph", { tabStops: null })
        .updateAttributes("heading", { tabStops: null })
        .run();
      markDirty();
    };

    const changeIndent = (delta: number) => {
      if (!editor) return;
      const attrs = editor.getAttributes("paragraph").indentLevel ? editor.getAttributes("paragraph") : editor.getAttributes("heading");
      const current = Number(attrs.indentLevel || 0);
      const next = Math.max(0, Math.min(8, current + delta));
      (editor.chain().focus() as any).updateAttributes("paragraph", { indentLevel: next }).updateAttributes("heading", { indentLevel: next }).run();
      markDirty();
    };

    const saveCustomStyle = () => {
      if (!styleName.trim() || !editor) return;
      const textStyle = editor.getAttributes("textStyle");
      const style: CustomTextStyle = {
        id: `style-${Date.now()}`,
        name: styleName.trim(),
        fontFamily: textStyle.fontFamily || "Calibri",
        fontSize: textStyle.fontSize || "12pt",
        color: textStyle.color || "#111827",
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
      };
      setCustomStyles((value) => [...value, style]);
      setSelectedCustomStyleId(style.id);
      setStyleName("");
      markDirty();
    };

    const applyCustomStyle = (style: CustomTextStyle) => {
      if (!editor) return;
      let chain = (editor.chain().focus() as any)
        .setFontFamily(style.fontFamily)
        .setFontSize(style.fontSize)
        .setColor(style.color);
      if (style.bold && !editor.isActive("bold")) chain = chain.toggleBold();
      if (!style.bold && editor.isActive("bold")) chain = chain.toggleBold();
      if (style.italic && !editor.isActive("italic")) chain = chain.toggleItalic();
      if (!style.italic && editor.isActive("italic")) chain = chain.toggleItalic();
      if (style.underline === true && !editor.isActive("underline")) chain = chain.toggleUnderline();
      if (style.underline === false && editor.isActive("underline")) chain = chain.toggleUnderline();
      chain.run();
      markDirty();
    };

    const deleteSelectedCustomStyle = () => {
      if (!selectedCustomStyleId) return;
      setCustomStyles((value) => value.filter((style) => style.id !== selectedCustomStyleId));
      setSelectedCustomStyleId("");
      markDirty();
    };

    const tableCommand = (command: TableCommand) => {
      if (!editor) return;
      const chain = editor.chain().focus() as any;
      chain[command]().run();
      markDirty();
    };

    const updateTableRowOption = (attrs: { repeatHeader?: boolean; keepTogether?: boolean }) => {
      if (!editor) return;
      (editor.chain().focus() as any).updateAttributes("tableRow", attrs).run();
      markDirty();
    };

    const applyTableCellColor = () => {
      if (!editor) return;
      (editor.chain().focus() as any).updateAttributes("tableCell", { cellColor: tableCellColor }).updateAttributes("tableHeader", { cellColor: tableCellColor }).run();
      markDirty();
    };

    return {
      applyPresetStyle,
      changeTextCase,
      applyLineHeight,
      applyParagraphSpacing,
      applyParagraphShading,
      toggleParagraphBorder,
      applyTabStop,
      clearTabStops,
      changeIndent,
      saveCustomStyle,
      applyCustomStyle,
      deleteSelectedCustomStyle,
      tableCommand,
      updateTableRowOption,
      applyTableCellColor,
    };
  }, [
    editor,
    paragraphShadingColor,
    paragraphSpacingAfter,
    paragraphSpacingBefore,
    selectedCustomStyleId,
    setCustomStyles,
    setLineHeight,
    setSelectedCustomStyleId,
    setStatus,
    setStyleName,
    styleName,
    tabStopKind,
    tabStopLeader,
    tabStopPosition,
    tableCellColor,
  ]);
}
