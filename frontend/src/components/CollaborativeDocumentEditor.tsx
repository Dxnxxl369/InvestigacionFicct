"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { DocumentoDTO } from "@/lib/api";
import {
  type TextCaseMode,
} from "./collaborative-editor/editorTemplates";
import { buildCollaborativeEditorExtensions, remoteCursorPluginKey } from "./collaborative-editor/editorExtensions";
import {
  applyDocumentSettings,
  buildStoredDocumentContent,
  currentDocumentSettings,
  escapeHtml,
  getBookmarkTargets,
  resolveStoredDocumentSettings,
} from "./collaborative-editor/documentModel";
import { buildDocxDocumentBlob } from "./collaborative-editor/docxExport";
import { RibbonGroup, Tool } from "./collaborative-editor/editorChrome";
import {
  formatPageNumberPreview,
  getDocumentOutline,
  getPageDimensions,
} from "./collaborative-editor/editorViewUtils";
import {
  HorizontalPageRuler,
  VerticalPageRuler,
  usePageRulerMetrics,
} from "./collaborative-editor/pageRulers";
import {
  DEFAULT_MARGINS,
  PAGE_SIZES,
  type BibliographyStyle,
  type CaptionKind,
  type CitationItem,
  type CitationSourceType,
  type CrossReferenceKind,
  type CustomTextStyle,
  type DocumentSettings,
  type EditorSaveStatus,
  type FootnoteItem,
  type LineHeight,
  type Orientation,
  type PageColumns,
  type PageNumberFormatKey,
  type PageNumberPosition,
  type PageSizeKey,
  type PageVerticalAlign,
  type ReviewComment,
  type RibbonTab,
  type SuggestionItem,
  type TabLeaderKind,
  type TabStopKind,
  type TableStyle,
  type ViewMode,
} from "./collaborative-editor/editorTypes";
import { useDocumentPresence } from "./collaborative-editor/useDocumentPresence";
import { useDocumentRealtime, type RemoteSnapshot, type RemoteSteps } from "./collaborative-editor/useDocumentRealtime";
import { useDocumentVersions } from "./collaborative-editor/useDocumentVersions";
import { useDocumentAutosave } from "./collaborative-editor/useDocumentAutosave";
import { documentStorageKeys, readInitialDocumentContent } from "./collaborative-editor/documentStorage";
import { useDocumentFileHandlers } from "./collaborative-editor/useDocumentFileHandlers";
import { useInsertActions } from "./collaborative-editor/useInsertActions";
import { useReviewActions } from "./collaborative-editor/useReviewActions";
import { useReferenceActions } from "./collaborative-editor/useReferenceActions";
import { useFormattingActions } from "./collaborative-editor/useFormattingActions";
import { useRemoteDocumentActions } from "./collaborative-editor/useRemoteDocumentActions";
import { useFindReplaceActions } from "./collaborative-editor/useFindReplaceActions";
import { applyRemoteSnapshotToEditor, applyRemoteStepsToEditor } from "./collaborative-editor/remoteApply";
import {
  remoteConflictActionLabel,
  remoteConflictStatusLabel,
  remoteConflictTitle,
  type RemoteConflictInfo,
} from "./collaborative-editor/collaborationConflict";
import { ReferenceSourceManager } from "./collaborative-editor/ReferenceSourceManager";
import { formatInlineCitation } from "./collaborative-editor/bibliography";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  BookOpen,
  Clipboard,
  Copy,
  Download,
  Eraser,
  FileText,
  FileUp,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Paintbrush,
  Quote,
  Redo2,
  Save,
  Search,
  Scissors,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

interface Props {
  documento: DocumentoDTO;
  currentUserName?: string;
  onClose: () => void;
  onSaved?: (documento: DocumentoDTO) => void;
}

export default function CollaborativeDocumentEditor({ documento, currentUserName, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(documento.titulo);
  const [status, setStatus] = useState<EditorSaveStatus>("synced");
  const [activeRibbonTab, setActiveRibbonTab] = useState<RibbonTab>("Inicio");
  const [viewMode, setViewMode] = useState<ViewMode>("print");
  const [margins, setMargins] = useState(DEFAULT_MARGINS);
  const [pageSize, setPageSize] = useState<PageSizeKey>("carta");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [zoom, setZoom] = useState(100);
  const [numberHeadings, setNumberHeadings] = useState(true);
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [firstPageHeaderText, setFirstPageHeaderText] = useState("");
  const [firstPageFooterText, setFirstPageFooterText] = useState("");
  const [evenPageHeaderText, setEvenPageHeaderText] = useState("");
  const [evenPageFooterText, setEvenPageFooterText] = useState("");
  const [differentFirstPage, setDifferentFirstPage] = useState(false);
  const [differentEvenOddPages, setDifferentEvenOddPages] = useState(false);
  const [watermarkText, setWatermarkText] = useState("");
  const [pageNumbers, setPageNumbers] = useState(true);
  const [pageNumbersIncludeTotal, setPageNumbersIncludeTotal] = useState(false);
  const [pageNumberPosition, setPageNumberPosition] = useState<PageNumberPosition>("bottom-center");
  const [pageNumberStart, setPageNumberStart] = useState(1);
  const [pageNumberFormat, setPageNumberFormat] = useState<PageNumberFormatKey>("decimal");
  const [tableStyle, setTableStyle] = useState<TableStyle>("grid");
  const [tableCellColor, setTableCellColor] = useState("#f3f4f6");
  const [lineHeight, setLineHeight] = useState<LineHeight>("1.15");
  const [paragraphSpacingBefore, setParagraphSpacingBefore] = useState(0);
  const [paragraphSpacingAfter, setParagraphSpacingAfter] = useState(8);
  const [paragraphShadingColor, setParagraphShadingColor] = useState("#f8fafc");
  const [tabStopPosition, setTabStopPosition] = useState(1.25);
  const [tabStopKind, setTabStopKind] = useState<TabStopKind>("left");
  const [tabStopLeader, setTabStopLeader] = useState<TabLeaderKind>("none");
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [suggestionDraft, setSuggestionDraft] = useState("");
  const [footnotes, setFootnotes] = useState<FootnoteItem[]>([]);
  const [footnoteDraft, setFootnoteDraft] = useState("");
  const [endnotes, setEndnotes] = useState<FootnoteItem[]>([]);
  const [endnoteDraft, setEndnoteDraft] = useState("");
  const [citations, setCitations] = useState<CitationItem[]>([]);
  const [bibliographyStyle, setBibliographyStyle] = useState<BibliographyStyle>("apa");
  const [selectedCitationId, setSelectedCitationId] = useState("");
  const [citationDraft, setCitationDraft] = useState<Omit<CitationItem, "id">>({
    author: "",
    year: "",
    title: "",
    source: "",
    sourceType: "book",
    publisher: "",
    city: "",
    journal: "",
    volume: "",
    issue: "",
    pages: "",
    doi: "",
    url: "",
    accessedAt: "",
  });
  const [captionDraft, setCaptionDraft] = useState("");
  const [captionKind, setCaptionKind] = useState<CaptionKind>("Figura");
  const [shapeText, setShapeText] = useState("Forma");
  const [shapeFill, setShapeFill] = useState("#dbeafe");
  const [bookmarkName, setBookmarkName] = useState("");
  const [crossReferenceTarget, setCrossReferenceTarget] = useState("");
  const [crossReferenceKind, setCrossReferenceKind] = useState<CrossReferenceKind>("texto");
  const [equationDraft, setEquationDraft] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [pageBorder, setPageBorder] = useState(false);
  const [pageColor, setPageColor] = useState("#ffffff");
  const [pageColumns, setPageColumns] = useState<PageColumns>(1);
  const [pageVerticalAlign, setPageVerticalAlign] = useState<PageVerticalAlign>("top");
  const [lineNumbers, setLineNumbers] = useState(false);
  const [autoHyphenation, setAutoHyphenation] = useState(false);
  const [styleName, setStyleName] = useState("");
  const [customStyles, setCustomStyles] = useState<CustomTextStyle[]>([]);
  const [selectedCustomStyleId, setSelectedCustomStyleId] = useState("");
  const [showNavigation, setShowNavigation] = useState(false);
  const [showRulers, setShowRulers] = useState(true);
  const [showGridlines, setShowGridlines] = useState(false);
  const [showTocMenu, setShowTocMenu] = useState(false);
  const [showBibliographyMenu, setShowBibliographyMenu] = useState(false);
  const [showSourceManager, setShowSourceManager] = useState(false);
  const [outlineVersion, setOutlineVersion] = useState(0);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [pageCount, setPageCount] = useState(1);
  const [remoteConflict, setRemoteConflict] = useState<RemoteConflictInfo | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsLoadedRef = useRef(false);
  const remoteApplyingRef = useRef(false);
  const suppressNextSettingsEffectRef = useRef(false);
  const livePublishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncServerVersionRef = useRef<(serverVersion?: number) => void>(() => {});
  const statusRef = useRef<"synced" | "dirty" | "offline" | "remote">("synced");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const linkInputRef = useRef<HTMLInputElement | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const footnoteInputRef = useRef<HTMLInputElement | null>(null);
  const endnoteInputRef = useRef<HTMLInputElement | null>(null);
  const citationAuthorInputRef = useRef<HTMLInputElement | null>(null);
  const exportDocxRef = useRef<(() => void | Promise<void>) | null>(null);
  const workareaRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLElement | null>(null);
  const horizontalRulerRef = useRef<HTMLDivElement | null>(null);
  const pageContentRef = useRef<HTMLDivElement | null>(null);

  const { storageKey, pendingKey, settingsKey } = useMemo(
    () => documentStorageKeys(documento.id),
    [documento.id]
  );

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => () => {
    if (livePublishTimerRef.current) clearTimeout(livePublishTimerRef.current);
  }, []);

  const activeCollaborators = useDocumentPresence(
    documento.id,
    currentUserName,
    setStatus,
    (serverVersion) => syncServerVersionRef.current(serverVersion),
    (conflict) => {
      setRemoteConflict({
        ...conflict,
        hasLocalPendingChanges: statusRef.current === "dirty" || statusRef.current === "offline",
      });
    }
  );
  const settingsSetters = useMemo(() => ({
    setMargins,
    setNumberHeadings,
    setPageSize,
    setOrientation,
    setZoom,
    setHeaderText,
    setFooterText,
    setFirstPageHeaderText,
    setFirstPageFooterText,
    setEvenPageHeaderText,
    setEvenPageFooterText,
    setDifferentFirstPage,
    setDifferentEvenOddPages,
    setWatermarkText,
    setPageNumbers,
    setPageNumbersIncludeTotal,
    setPageNumberPosition,
    setPageNumberStart,
    setPageNumberFormat,
    setTableStyle,
    setLineHeight,
    setComments,
    setSuggestions,
    setFootnotes,
    setEndnotes,
    setCitations,
    setBibliographyStyle,
    setCustomStyles,
    setPageBorder,
    setPageColor,
    setPageColumns,
    setPageVerticalAlign,
    setLineNumbers,
    setAutoHyphenation,
  }), []);

  const parsedInitialDocument = useMemo(() => {
    return readInitialDocumentContent(documento.contenido, pendingKey);
  }, [documento.contenido, pendingKey]);

  const initialContent = parsedInitialDocument.html;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: buildCollaborativeEditorExtensions(),
    content: initialContent,
    editable: documento.miPermiso !== "LECTURA",
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (event.key !== "Tab" || !editor) return false;
        event.preventDefault();
        editor.chain().focus().insertContent("\t").run();
        return true;
      },
      handleClickOn: (view, _pos, node, nodePos, event) => {
        if (node.type.name !== "checkBox") return false;
        if ((view as { editable?: boolean }).editable === false) return true;
        event.preventDefault();
        view.dispatch(view.state.tr.setNodeMarkup(nodePos, undefined, {
          ...node.attrs,
          checked: !node.attrs.checked,
        }));
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      if (remoteApplyingRef.current) {
        localStorage.setItem(storageKey, editor.getHTML());
        setOutlineVersion((value) => value + 1);
        return;
      }
      const contenido = editor.getHTML();
      setOutlineVersion((value) => value + 1);
      localStorage.setItem(storageKey, contenido);
      setStatus(navigator.onLine ? "dirty" : "offline");
      if (livePublishTimerRef.current) clearTimeout(livePublishTimerRef.current);
      livePublishTimerRef.current = setTimeout(() => publishLiveSnapshot(contenido, getLiveDocumentSettings()), 450);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveDocument(contenido), 2200);
    },
  });

  const applyRemoteSnapshot = useCallback((snapshot: RemoteSnapshot) => {
    const applied = applyRemoteSnapshotToEditor({
      editor,
      snapshot,
      settingsSetters,
      settingsKey,
      storageKey,
      remoteApplyingRef,
      suppressNextSettingsEffectRef,
    });
    if (!applied) return;
    setOutlineVersion((value) => value + 1);
    setStatus("synced");
    setRemoteConflict(null);
    setLastSaved(snapshot.usuario ? `edicion de ${snapshot.usuario}` : "edicion remota");
  }, [editor, settingsKey, settingsSetters, storageKey]);

  const canApplyRemoteSnapshot = useCallback(() => (
    statusRef.current !== "dirty" &&
    statusRef.current !== "offline"
  ), []);
  const remoteConflictHasLocalPendingChanges = useCallback(() => (
    statusRef.current === "dirty" || statusRef.current === "offline"
  ), []);

  const applyRemoteSteps = useCallback((payload: RemoteSteps) => {
    const applied = applyRemoteStepsToEditor({
      editor,
      payload,
      storageKey,
      remoteApplyingRef,
    });
    if (!applied) return false;
    setOutlineVersion((value) => value + 1);
    setStatus("synced");
    setRemoteConflict(null);
    setLastSaved(payload.usuario ? `edicion en vivo de ${payload.usuario}` : "edicion en vivo");
    return true;
  }, [editor, storageKey]);

  const {
    publishSnapshot: publishLiveSnapshot,
    publishCursor,
    applyPendingSnapshot,
    syncServerVersion,
    remoteCursors,
    isConnected: isRealtimeConnected,
    queuedMessageCount,
  } = useDocumentRealtime({
    documentId: documento.id,
    currentUserName,
    canApplyRemoteSnapshot,
    canApplyRemoteSteps: () => false,
    onRemoteSnapshot: applyRemoteSnapshot,
    onRemoteSteps: applyRemoteSteps,
    onRemoteConflict: (conflict) => {
      setRemoteConflict({
        ...conflict,
        hasLocalPendingChanges: remoteConflictHasLocalPendingChanges(),
      });
      setStatus("remote");
    },
  });

  useEffect(() => {
    syncServerVersionRef.current = syncServerVersion;
  }, [syncServerVersion]);

  useEffect(() => {
    if (!editor) return;
    editor.view.dispatch(editor.state.tr.setMeta(remoteCursorPluginKey, remoteCursors));
  }, [editor, remoteCursors]);

  useEffect(() => {
    if (!editor) return;
    let cursorTimer: ReturnType<typeof setTimeout> | null = null;
    const publishSelection = () => {
      if (documento.miPermiso === "LECTURA" && viewMode === "read") return;
      if (cursorTimer) clearTimeout(cursorTimer);
      cursorTimer = setTimeout(() => {
        const { from, to } = editor.state.selection;
        publishCursor(from, to);
      }, 120);
    };
    editor.on("selectionUpdate", publishSelection);
    publishSelection();
    return () => {
      if (cursorTimer) clearTimeout(cursorTimer);
      editor.off("selectionUpdate", publishSelection);
    };
  }, [documento.miPermiso, editor, publishCursor, viewMode]);

  const liveDocumentSettings = useMemo(() => currentDocumentSettings({
    margins,
    numberHeadings,
    pageSize,
    orientation,
    zoom,
    headerText,
    footerText,
    firstPageHeaderText,
    firstPageFooterText,
    evenPageHeaderText,
    evenPageFooterText,
    differentFirstPage,
    differentEvenOddPages,
    watermarkText,
    pageNumbers,
    pageNumbersIncludeTotal,
    pageNumberPosition,
    pageNumberStart,
    pageNumberFormat,
    tableStyle,
    lineHeight,
    comments,
    suggestions,
    footnotes,
    endnotes,
    citations,
    bibliographyStyle,
    customStyles,
    pageBorder,
    pageColor,
    pageColumns,
    pageVerticalAlign,
    lineNumbers,
    autoHyphenation,
  }), [autoHyphenation, bibliographyStyle, citations, comments, customStyles, differentEvenOddPages, differentFirstPage, endnotes, evenPageFooterText, evenPageHeaderText, firstPageFooterText, firstPageHeaderText, footerText, footnotes, headerText, lineHeight, lineNumbers, margins, numberHeadings, orientation, pageBorder, pageColor, pageColumns, pageNumberFormat, pageNumberPosition, pageNumberStart, pageNumbers, pageNumbersIncludeTotal, pageSize, pageVerticalAlign, suggestions, tableStyle, watermarkText, zoom]);
  const getLiveDocumentSettings = useCallback(() => liveDocumentSettings, [liveDocumentSettings]);

  const bookmarkTargets = useMemo(
    () => editor ? getBookmarkTargets(editor.getHTML()) : [],
    [editor, outlineVersion]
  );
  const page = getPageDimensions(pageSize, orientation);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(documento.miPermiso !== "LECTURA" && viewMode !== "read");
  }, [documento.miPermiso, editor, viewMode]);

  useEffect(() => {
    const host = pageContentRef.current;
    if (!host || typeof ResizeObserver === "undefined") return;
    const updatePageCount = () => {
      const editable = host.querySelector(".ProseMirror") as HTMLElement | null;
      const contentHeight = Math.max(editable?.scrollHeight || 0, host.scrollHeight || 0);
      const pageHeightPx = page.height * 96;
      const printableHeight = Math.max(96, pageHeightPx - margins.top - margins.bottom);
      setPageCount(Math.max(1, Math.ceil(contentHeight / printableHeight)));
    };
    updatePageCount();
    const observer = new ResizeObserver(updatePageCount);
    observer.observe(host);
    const editable = host.querySelector(".ProseMirror");
    if (editable) observer.observe(editable);
    return () => observer.disconnect();
  }, [editor, footnotes.length, endnotes.length, margins.bottom, margins.top, orientation, outlineVersion, page.height, pageSize]);

  const buildDocumentPayload = useCallback((html: string, options?: { settingsOverride?: DocumentSettings; titleOverride?: string }) => {
      const contenido = buildStoredDocumentContent(html, options?.settingsOverride || liveDocumentSettings);
      return {
        titulo: options?.titleOverride?.trim() || title.trim() || documento.titulo,
        descripcion: documento.descripcion,
        categoria: documento.categoria,
        contenido,
        convocatoriaId: documento.convocatoriaId,
      };
    }, [documento.categoria, documento.convocatoriaId, documento.descripcion, documento.titulo, liveDocumentSettings, title]);

  const {
    saving,
    lastSaved,
    setLastSaved,
    saveDocument,
  } = useDocumentAutosave({
    editor,
    documento,
    storageKey,
    pendingKey,
    statusRef,
    buildDocumentPayload,
    setStatus,
    onSaved,
  });

  useEffect(() => {
    applyDocumentSettings(resolveStoredDocumentSettings(settingsKey, parsedInitialDocument.settings), settingsSetters);
    settingsLoadedRef.current = true;
  }, [parsedInitialDocument.settings, settingsKey, settingsSetters]);

  useEffect(() => {
    localStorage.setItem(settingsKey, JSON.stringify(liveDocumentSettings));
  }, [liveDocumentSettings, settingsKey]);

  useEffect(() => {
    if (!settingsLoadedRef.current || !editor || documento.miPermiso === "LECTURA") return;
    if (suppressNextSettingsEffectRef.current) {
      suppressNextSettingsEffectRef.current = false;
      return;
    }
    setStatus(navigator.onLine ? "dirty" : "offline");
    if (livePublishTimerRef.current) clearTimeout(livePublishTimerRef.current);
    livePublishTimerRef.current = setTimeout(() => publishLiveSnapshot(editor.getHTML(), getLiveDocumentSettings()), 450);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveDocument(editor.getHTML()), 1800);
  }, [documento.miPermiso, editor, getLiveDocumentSettings, publishLiveSnapshot, saveDocument]);

  useEffect(() => {
    const handleEditorShortcut = (event: KeyboardEvent) => {
      if (event.key === "F12") {
        event.preventDefault();
        void exportDocxRef.current?.();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.altKey && ["1", "2", "3"].includes(event.key)) {
        event.preventDefault();
        const level = Number(event.key) as 1 | 2 | 3;
        editor?.chain().focus().toggleHeading({ level }).run();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        setActiveRibbonTab("Revisar");
        window.setTimeout(() => commentInputRef.current?.focus(), 0);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setActiveRibbonTab("Referencias");
        window.setTimeout(() => footnoteInputRef.current?.focus(), 0);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setActiveRibbonTab("Referencias");
        window.setTimeout(() => endnoteInputRef.current?.focus(), 0);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        setActiveRibbonTab("Referencias");
        window.setTimeout(() => citationAuthorInputRef.current?.focus(), 0);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "Enter") {
        event.preventDefault();
        (editor?.chain().focus() as any)?.insertContent({ type: "columnBreak" }).insertContent({ type: "paragraph" }).run();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        (editor?.chain().focus() as any)?.insertContent({ type: "pageBreak" }).insertContent({ type: "paragraph" }).run();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        editor?.chain().focus().toggleBulletList().run();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "7") {
        event.preventDefault();
        editor?.chain().focus().toggleOrderedList().run();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && !event.altKey && ["1", "2", "5"].includes(event.key)) {
        event.preventDefault();
        const nextLineHeight = event.key === "1" ? "1" : event.key === "2" ? "2" : "1.5";
        setLineHeight(nextLineHeight as LineHeight);
        (editor?.chain().focus() as any)
          ?.updateAttributes("paragraph", { lineHeight: nextLineHeight })
          .updateAttributes("heading", { lineHeight: nextLineHeight })
          .run();
        return;
      }
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        if (event.shiftKey) {
          void exportDocxRef.current?.();
        } else {
          saveDocument();
        }
      }
      if (key === "l" && !event.shiftKey) {
        event.preventDefault();
        editor?.chain().focus().setTextAlign("left").run();
      }
      if (key === "e") {
        event.preventDefault();
        editor?.chain().focus().setTextAlign("center").run();
      }
      if (key === "r") {
        event.preventDefault();
        editor?.chain().focus().setTextAlign("right").run();
      }
      if (key === "j") {
        event.preventDefault();
        editor?.chain().focus().setTextAlign("justify").run();
      }
      if (key === "k") {
        event.preventDefault();
        setActiveRibbonTab("Insertar");
        window.setTimeout(() => linkInputRef.current?.focus(), 0);
      }
      if (key === "m") {
        event.preventDefault();
        changeIndent(event.shiftKey ? -1 : 1);
      }
      if (key === "f") {
        event.preventDefault();
        setActiveRibbonTab("Inicio");
        window.setTimeout(() => findInputRef.current?.focus(), 0);
      }
      if (key === "h") {
        event.preventDefault();
        setActiveRibbonTab("Inicio");
        window.setTimeout(() => replaceInputRef.current?.focus(), 0);
      }
      if (key === "o") {
        event.preventDefault();
        setActiveRibbonTab("Archivo");
        window.setTimeout(() => fileInputRef.current?.click(), 0);
      }
      if (key === "p") {
        event.preventDefault();
        window.print();
      }
      if (key === "+" || key === "=") {
        event.preventDefault();
        setZoom((value) => Math.min(150, value + 10));
      }
      if (key === "-") {
        event.preventDefault();
        setZoom((value) => Math.max(50, value - 10));
      }
      if (key === "0") {
        event.preventDefault();
        setZoom(100);
      }
    };
    window.addEventListener("keydown", handleEditorShortcut);
    return () => window.removeEventListener("keydown", handleEditorShortcut);
  }, [editor, saveDocument]);

  const run = (callback: () => void) => {
    callback();
    editor?.commands.focus();
  };

  const runOnEnter = (event: React.KeyboardEvent<HTMLInputElement>, callback: () => void) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    callback();
  };

  const applyStoredSettings = (settings: DocumentSettings) => {
    applyDocumentSettings(settings, settingsSetters);
  };
  const {
    versions,
    showVersions,
    loadingVersions,
    setShowVersions,
    loadVersions,
    restoreVersion,
  } = useDocumentVersions({
    documentId: documento.id,
    editor,
    applyStoredSettings,
    setTitle,
    setStatus,
    onSaved,
  });

  const exportDocx = async () => {
    if (!editor) return;
    const blob = await buildDocxDocumentBlob({
      html: editor.getHTML(),
      title,
      fallbackTitle: documento.titulo,
      category: documento.categoria,
      description: documento.descripcion,
      currentUserName,
      revision: versions.length + 1,
      settings: liveDocumentSettings,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "documento-colaborativo"}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };
  exportDocxRef.current = exportDocx;

  const { importing, importDocx, insertImage } = useDocumentFileHandlers({
    editor,
    canEdit: documento.miPermiso !== "LECTURA",
    currentSettings: liveDocumentSettings,
    fileInputRef,
    imageInputRef,
    saveDocument,
    setTitle,
    setStatus,
    setFootnotes,
    setEndnotes,
    setComments,
  });

  const {
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
  } = useInsertActions({
    editor,
    documentTitle: documento.titulo,
    currentUserName,
    shapeText,
    shapeFill,
    equationDraft,
    setEquationDraft,
    setStatus,
  });

  const {
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
  } = useFormattingActions({
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
  });

  const {
    insertCitation,
    insertExistingCitation,
    removeSelectedCitation,
    insertBibliography,
    insertTableOfContents,
    insertCaption,
    insertTableOfFigures,
    insertBookmark,
    insertCrossReference,
    applyLink,
    insertFootnote,
    insertEndnote,
  } = useReferenceActions({
    editor,
    citations,
    bibliographyStyle,
    citationDraft,
    selectedCitationId,
    captionDraft,
    captionKind,
    bookmarkName,
    bookmarkTargets,
    crossReferenceTarget,
    crossReferenceKind,
    linkUrl,
    footnotes,
    footnoteDraft,
    endnotes,
    endnoteDraft,
    setCitations,
    setSelectedCitationId,
    setCitationDraft,
    setCaptionDraft,
    setBookmarkName,
    setCrossReferenceTarget,
    setLinkUrl,
    setFootnotes,
    setFootnoteDraft,
    setEndnotes,
    setEndnoteDraft,
    setStatus,
  });

  const {
    addComment,
    toggleCommentResolved,
    removeComment,
    addInsertionSuggestion,
    addDeletionSuggestion,
    updateSuggestionStatus,
    updateAllPendingSuggestions,
  } = useReviewActions({
    editor,
    currentUserName,
    commentDraft,
    suggestionDraft,
    suggestions,
    setCommentDraft,
    setSuggestionDraft,
    setComments,
    setSuggestions,
    setStatus,
  });

  const { loadRemoteChanges } = useRemoteDocumentActions({
    editor,
    documentId: documento.id,
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
  });

  const statusLabel = {
    synced: lastSaved ? `Guardado ${lastSaved}` : "Sincronizado",
    dirty: "Guardando...",
    offline: "Sin conexion: cambios en cola local",
    remote: remoteConflictStatusLabel(remoteConflict),
  }[status];

  const plainText = editor?.getText() || "";
  const { findMatches, findNext, replaceAll } = useFindReplaceActions({
    editor,
    plainText,
    findText,
    replaceText,
    setStatus,
  });
  const rulerMetrics = usePageRulerMetrics(
    {
      pageRef,
      canvasRef,
      workareaRef,
      horizontalRulerRef,
    },
    [Boolean(editor), page.width, page.height, zoom, showRulers, showNavigation, viewMode]
  );

  if (!editor) return null;
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = plainText.replace(/\s/g, "").length;
  const ribbonTabs: RibbonTab[] = ["Archivo", "Inicio", "Insertar", "Diseno", "Disposicion", "Referencias", "Correspondencia", "Revisar", "Vista"];
  const ribbonTabLabels: Record<RibbonTab, string> = {
    Archivo: "Archivo",
    Inicio: "Inicio",
    Insertar: "Insertar",
    Diseno: "Diseño",
    Disposicion: "Disposición",
    Referencias: "Referencias",
    Correspondencia: "Correspondencia",
    Revisar: "Revisar",
    Vista: "Vista",
  };
  const outlineItems = getDocumentOutline(editor, outlineVersion);
  const pageNumberTop = pageNumbers && pageNumberPosition.startsWith("top");
  const pageNumberBottom = pageNumbers && pageNumberPosition.startsWith("bottom");
  const pageNumberClass = `align-${pageNumberPosition.split("-")[1]}`;
  const visibleHeaderText = differentFirstPage ? firstPageHeaderText : headerText;
  const visibleFooterText = differentFirstPage ? firstPageFooterText : footerText;
  const visiblePageNumber = formatPageNumberPreview(pageNumberStart, pageNumberFormat);
  const visiblePageNumberText = pageNumbersIncludeTotal
    ? `Pagina ${visiblePageNumber} de ${pageCount}`
    : `Pagina ${visiblePageNumber}`;

  const goToOutlineItem = (position: number) => {
    editor.chain().focus().setTextSelection(position + 1).run();
    setTimeout(() => {
      const dom = editor.view.domAtPos(position + 1).node;
      const element = dom instanceof HTMLElement ? dom : dom.parentElement;
      element?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);
  };

  const insertManualTableOfContents = () => {
    editor.chain().focus().insertContent(
      `<p class="ficct-toc-title">TABLA DE CONTENIDO</p><table data-type="toc-table"><tbody><tr data-toc-level="1"><td>1.</td><td>ANTECEDENTES</td><td>1</td></tr><tr data-toc-level="2"><td>1.1.</td><td>Transporte urbano en microbuses</td><td>1</td></tr><tr data-toc-level="2"><td>1.2.</td><td>Uso de sistemas de informacion geografica</td><td>1</td></tr></tbody></table>`
    ).run();
    setShowTocMenu(false);
  };

  const insertBibliographyWithHeading = (heading: "Bibliografia" | "Referencias" | "Trabajos citados") => {
    if (!citations.length) {
      editor.chain().focus().insertContent(`<h2>${heading}</h2><p>Agrega fuentes desde Administrar fuentes para generar la bibliografia.</p>`).run();
    } else {
      insertBibliography();
    }
    setShowBibliographyMenu(false);
  };

  const insertCitationFromManager = (citationId: string) => {
    const citationIndex = citations.findIndex((item) => item.id === citationId);
    const citation = citations[citationIndex];
    if (!citation) return;
    setSelectedCitationId(citationId);
    editor.chain().focus().insertContent(
      `<span data-citation-id="${citation.id}">${escapeHtml(formatInlineCitation(citation, bibliographyStyle, citationIndex))}</span>`
    ).run();
  };

  return (
    <div className="fixed inset-0 z-50 ficct-word-shell">
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(event) => importDocx(event.target.files?.[0])}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => insertImage(event.target.files?.[0])}
      />
      <header className="ficct-word-titlebar">
        <div className="ficct-word-quickbar">
          <button onClick={() => saveDocument()} title="Guardar"><Save className="w-4 h-4" /></button>
          <button onClick={exportDocx} title="Exportar .docx"><Download className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().undo().run()} title="Deshacer"><Undo2 className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().redo().run()} title="Rehacer"><Redo2 className="w-4 h-4" /></button>
        </div>
        <div className="ficct-word-window-title">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setStatus("dirty");
            }}
            className="ficct-word-title-input"
          />
          <span>- Word colaborativo</span>
        </div>
        <div className="ficct-word-account">
          {activeCollaborators.length > 0 && (
            <span className="ficct-word-presence" title={activeCollaborators.map((user) => user.name).join(", ")}>
              {activeCollaborators.length} conectado{activeCollaborators.length === 1 ? "" : "s"}
            </span>
          )}
          <span>{currentUserName || "Usuario"}</span>
          <button onClick={onClose} title="Cerrar"><X className="w-4 h-4" /></button>
        </div>
      </header>

      <nav className="ficct-word-tabs">
        {ribbonTabs.map((tab) => (
          <button
            key={tab}
            className={tab === activeRibbonTab ? "active" : ""}
            onClick={() => setActiveRibbonTab(tab)}
            type="button"
          >
            {ribbonTabLabels[tab]}
          </button>
        ))}
        <div className="ficct-word-search">
          <Search className="w-3.5 h-3.5" />
          <span>¿Qué desea hacer?</span>
        </div>
      </nav>

      <section className="ficct-word-ribbon">
        <RibbonGroup label="Portapapeles" show={activeRibbonTab === "Archivo"}>
          <button className="ficct-word-paste" type="button" onClick={() => fileInputRef.current?.click()}>
            {importing ? "Abriendo" : "Abrir .docx"}
          </button>
        </RibbonGroup>

        <RibbonGroup label="Portapapeles" show={activeRibbonTab === "Inicio"}>
          <div className="ficct-word-clipboard">
            <button
              className="ficct-word-paste ficct-word-paste-home"
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) editor.chain().focus().insertContent(text).run();
                } catch {}
              }}
              title="Pegar"
            >
              <Clipboard className="w-5 h-5" />
              <span>Pegar</span>
            </button>
            <div className="ficct-word-clipboard-actions">
              <button type="button" onClick={() => document.execCommand("cut")} title="Cortar"><Scissors className="w-4 h-4" /> Cortar</button>
              <button type="button" onClick={() => document.execCommand("copy")} title="Copiar"><Copy className="w-4 h-4" /> Copiar</button>
              <button type="button" onClick={() => applyPresetStyle("emphasis")} title="Copiar formato"><Paintbrush className="w-4 h-4" /> Copiar formato</button>
            </div>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Fuente" show={activeRibbonTab === "Inicio"}>
          <div className="ficct-word-select-row">
            <select onChange={(e) => run(() => editor.chain().focus().setFontFamily(e.target.value).run())}>
              {["Aptos (Cuerpo)", "Calibri", "Arial", "Times New Roman", "Georgia", "Verdana"].map((f) => <option key={f}>{f}</option>)}
            </select>
            <select onChange={(e) => run(() => (editor.chain().focus() as any).setFontSize(e.target.value).run())}>
              {["11pt", "10pt", "12pt", "14pt", "16pt", "18pt", "20pt", "24pt"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <select onChange={(e) => changeTextCase(e.target.value as TextCaseMode)} defaultValue="" title="Cambiar mayusculas/minusculas">
              <option value="" disabled>Aa</option>
              <option value="upper">MAYUSCULAS</option>
              <option value="lower">minusculas</option>
              <option value="title">Tipo Titulo</option>
              <option value="sentence">Oracion</option>
            </select>
          </div>
          <div className="ficct-word-tool-row">
            <Tool active={editor.isActive("bold")} onClick={() => run(() => editor.chain().focus().toggleBold().run())}><Bold className="w-4 h-4" /></Tool>
            <Tool active={editor.isActive("italic")} onClick={() => run(() => editor.chain().focus().toggleItalic().run())}><Italic className="w-4 h-4" /></Tool>
            <Tool active={editor.isActive("underline")} onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}><UnderlineIcon className="w-4 h-4" /></Tool>
            <Tool active={editor.isActive("strike")} onClick={() => run(() => editor.chain().focus().toggleStrike().run())}><Strikethrough className="w-4 h-4" /></Tool>
            <Tool active={editor.isActive("superscript")} onClick={() => run(() => editor.chain().focus().toggleSuperscript().run())}><SuperscriptIcon className="w-4 h-4" /></Tool>
            <Tool active={editor.isActive("subscript")} onClick={() => run(() => editor.chain().focus().toggleSubscript().run())}><SubscriptIcon className="w-4 h-4" /></Tool>
            <Tool onClick={() => run(() => (editor.chain().focus() as any).setBackgroundColor("#fef08a").run())}><Highlighter className="w-4 h-4" /></Tool>
            <Tool onClick={() => run(() => editor.chain().focus().unsetAllMarks().clearNodes().run())}><Eraser className="w-4 h-4" /></Tool>
            <input type="color" title="Color de texto" onChange={(e) => run(() => editor.chain().focus().setColor(e.target.value).run())} />
          </div>
        </RibbonGroup>

        <RibbonGroup label="Párrafo" show={activeRibbonTab === "Inicio"}>
          <div className="ficct-word-tool-row">
            <Tool active={editor.isActive("bulletList")} onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}><List className="w-4 h-4" /></Tool>
            <Tool active={editor.isActive("orderedList")} onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}><ListOrdered className="w-4 h-4" /></Tool>
            <button onClick={() => changeIndent(-1)} className="ficct-word-tool" type="button" title="Disminuir sangría">‹</button>
            <button onClick={() => changeIndent(1)} className="ficct-word-tool" type="button" title="Aumentar sangría">›</button>
            <button onClick={() => setNumberHeadings((v) => !v)} className={numberHeadings ? "ficct-word-tool active" : "ficct-word-tool"} type="button" title="Numerar títulos">1.1</button>
          </div>
          <div className="ficct-word-tool-row">
            <Tool onClick={() => run(() => editor.chain().focus().setTextAlign("left").run())}><AlignLeft className="w-4 h-4" /></Tool>
            <Tool onClick={() => run(() => editor.chain().focus().setTextAlign("center").run())}><AlignCenter className="w-4 h-4" /></Tool>
            <Tool onClick={() => run(() => editor.chain().focus().setTextAlign("right").run())}><AlignRight className="w-4 h-4" /></Tool>
            <Tool onClick={() => run(() => editor.chain().focus().setTextAlign("justify").run())}><AlignJustify className="w-4 h-4" /></Tool>
            <Tool active={editor.isActive("blockquote")} onClick={() => run(() => editor.chain().focus().toggleBlockquote().run())}><Quote className="w-4 h-4" /></Tool>
            <select value={lineHeight} onChange={(e) => applyLineHeight(e.target.value as LineHeight)} className="ficct-word-line-select">
              <option value="1">1.0</option>
              <option value="1.15">1.15</option>
              <option value="1.5">1.5</option>
              <option value="2">2.0</option>
            </select>
            <input className="ficct-word-swatch" type="color" value={paragraphShadingColor} onChange={(e) => {
              setParagraphShadingColor(e.target.value);
              setTimeout(applyParagraphShading, 0);
            }} title="Sombreado" />
            <button onClick={toggleParagraphBorder} className="ficct-word-tool" type="button" title="Bordes">□</button>
            <Tool onClick={() => run(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}><TableIcon className="w-4 h-4" /></Tool>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Estilos" show={activeRibbonTab === "Inicio"}>
          <div className="ficct-word-style-gallery">
            <button onClick={() => applyPresetStyle("quote")} type="button">
              <span className="sample apa">AaBbCc</span>
              <small>APA7</small>
            </button>
            <button className={editor.isActive("paragraph") ? "active" : ""} onClick={() => run(() => editor.chain().focus().setParagraph().run())} type="button">
              <span className="sample normal">AaBbCc</span>
              <small>Normal</small>
            </button>
            <button onClick={() => applyPresetStyle("emphasis")} type="button">
              <span className="sample plain">AaBbCc</span>
              <small>Sin espa...</small>
            </button>
            <button className={editor.isActive("heading", { level: 1 }) ? "active" : ""} onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 1 }).run())} type="button">
              <span className="sample title-one">AaBbCc</span>
              <small>Título 1</small>
            </button>
            <button className={editor.isActive("heading", { level: 2 }) ? "active" : ""} onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())} type="button">
              <span className="sample title-two">AaBbCc</span>
              <small>Título 2</small>
            </button>
            <button onClick={() => applyPresetStyle("title")} type="button">
              <span className="sample title-main">AaB</span>
              <small>Título</small>
            </button>
            <button onClick={() => applyPresetStyle("subtitle")} type="button">
              <span className="sample subtitle">AaBbCc</span>
              <small>Subtítulo</small>
            </button>
            <button onClick={() => applyPresetStyle("quote")} type="button">
              <span className="sample quote">AaBbCcDd</span>
              <small>Énfasis sutil</small>
            </button>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Insertar" show={activeRibbonTab === "Insertar"}>
          <div className="ficct-word-doc-actions">
            <button onClick={() => insertCoverPage("academica")} type="button"><BookOpen className="w-4 h-4" /> Portada</button>
            <button onClick={() => insertCoverPage("informe")} type="button">Informe</button>
            <button onClick={() => insertCoverPage("sobria")} type="button">Sobria</button>
            <button onClick={() => imageInputRef.current?.click()} type="button"><ImageIcon className="w-4 h-4" /> Imagen</button>
            <button onClick={insertPageBreak} type="button"><FileText className="w-4 h-4" /> Salto</button>
            <button onClick={insertTextBox} type="button"><BookOpen className="w-4 h-4" /> Cuadro</button>
            <input value={shapeText} onChange={(e) => setShapeText(e.target.value)} placeholder="Texto forma" />
            <input type="color" value={shapeFill} onChange={(e) => setShapeFill(e.target.value)} title="Color de forma" />
            <button onClick={() => insertShape("rectangle")} type="button">Rect.</button>
            <button onClick={() => insertShape("oval")} type="button">Ovalo</button>
            <button onClick={() => insertShape("arrow")} type="button">Flecha</button>
            <button onClick={() => insertShape("callout")} type="button">Llamada</button>
            <button onClick={() => insertCheckBox(false)} type="button">☐ Casilla</button>
            <button onClick={() => insertCheckBox(true)} type="button">☑ Casilla</button>
            <button onClick={() => insertWordField("DATE")} type="button">Fecha</button>
            <button onClick={() => insertWordField("TIME")} type="button">Hora</button>
            <button onClick={() => insertWordField("NUMPAGES")} type="button">Paginas</button>
            <button onClick={() => insertWordField("AUTHOR")} type="button">Autor</button>
            <button onClick={() => insertWordField("TITLE")} type="button">Titulo doc.</button>
            <button onClick={() => insertWordField("SUBJECT")} type="button">Asunto</button>
            <button onClick={() => insertWordField("FILENAME")} type="button">Archivo</button>
            <button onClick={() => insertQuickBlock("acta")} type="button">Acta</button>
            <button onClick={() => insertQuickBlock("resumen")} type="button">Resumen</button>
            <button onClick={() => insertQuickBlock("informe")} type="button">Informe base</button>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Simbolos" show={activeRibbonTab === "Insertar"}>
          <div className="ficct-word-symbol-tools">
            <div>
              {["α", "β", "π", "∑", "√", "∞", "≤", "≥"].map((symbol) => (
                <button key={symbol} onClick={() => insertSymbol(symbol)} type="button">{symbol}</button>
              ))}
            </div>
            <input value={equationDraft} onChange={(e) => setEquationDraft(e.target.value)} placeholder="x^2 + y^2 = z^2" />
            <button onClick={insertEquation} type="button">Ecuacion</button>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Imagen" show={activeRibbonTab === "Insertar"}>
          <div className="ficct-word-image-tools">
            <button onClick={() => setImageWidth("25%")} type="button">25%</button>
            <button onClick={() => setImageWidth("50%")} type="button">50%</button>
            <button onClick={() => setImageWidth("100%")} type="button">100%</button>
            <button onClick={() => setImageAlignment("left")} type="button">Izq.</button>
            <button onClick={() => setImageAlignment("center")} type="button">Centro</button>
            <button onClick={() => setImageAlignment("right")} type="button">Der.</button>
            <button onClick={() => setImageWrap("inline")} type="button">Linea</button>
            <button onClick={() => setImageWrap("square")} type="button">Cuadrado</button>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Tabla de contenido" show={activeRibbonTab === "Referencias"}>
          <div className="ficct-word-reference-group">
            <div className="ficct-word-menu-anchor">
              <button className="ficct-word-reference-big" onClick={() => setShowTocMenu((value) => !value)} type="button">
                <FileText className="w-7 h-7" />
                <span>Tabla de contenido</span>
              </button>
              {showTocMenu && (
                <div className="ficct-word-dropdown ficct-toc-dropdown">
                  <strong>Integrado</strong>
                  <button type="button" onClick={() => { insertTableOfContents(); setShowTocMenu(false); }}>
                    <span>Tabla automatica 1</span>
                    <small>Contenido<br />Titulo 1........................................1<br />Titulo 2........................................1</small>
                  </button>
                  <button type="button" onClick={() => { insertTableOfContents(); setShowTocMenu(false); }}>
                    <span>Tabla automatica 2</span>
                    <small>Tabla de contenido<br />Titulo 1........................................1<br />Titulo 2........................................1</small>
                  </button>
                  <button type="button" onClick={insertManualTableOfContents}>
                    <span>Tabla manual</span>
                    <small>Escribir el titulo del capitulo..............1</small>
                  </button>
                </div>
              )}
            </div>
            <div className="ficct-word-reference-stack">
              <button type="button" onClick={insertTableOfContents}>Agregar texto</button>
              <button type="button" onClick={insertTableOfContents}>Actualizar tabla</button>
            </div>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Citas y bibliografía" show={activeRibbonTab === "Referencias"}>
          <div className="ficct-word-citations-ribbon">
            <button className="ficct-word-reference-big" onClick={insertCitation} type="button">
              <Quote className="w-7 h-7" />
              <span>Insertar cita</span>
            </button>
            <div className="ficct-word-reference-stack">
              <button type="button" onClick={() => setShowSourceManager(true)}>Administrar fuentes</button>
              <label>
                <span>Estilo:</span>
                <select value={bibliographyStyle} onChange={(e) => setBibliographyStyle(e.target.value as BibliographyStyle)} title="Estilo bibliografico">
                  <option value="apa">APA</option>
                  <option value="ieee">IEEE</option>
                  <option value="mla">MLA</option>
                </select>
              </label>
              <div className="ficct-word-menu-anchor">
                <button type="button" onClick={() => setShowBibliographyMenu((value) => !value)}>Bibliografía</button>
                {showBibliographyMenu && (
                  <div className="ficct-word-dropdown ficct-bibliography-dropdown">
                    <strong>Integrado</strong>
                    <button type="button" onClick={() => insertBibliographyWithHeading("Bibliografia")}>
                      <span>Bibliografía</span>
                      <small>Benito, A. (2003). Citas y referencias...</small>
                    </button>
                    <button type="button" onClick={() => insertBibliographyWithHeading("Referencias")}>
                      <span>Referencias</span>
                      <small>Garcia, M. (2006). Como escribir una bibliografia...</small>
                    </button>
                    <button type="button" onClick={() => insertBibliographyWithHeading("Trabajos citados")}>
                      <span>Trabajos citados</span>
                      <small>Lopez, A. (2005). Crear una publicacion formal...</small>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Combinar correspondencia" show={activeRibbonTab === "Correspondencia"}>
          <div className="ficct-word-doc-actions">
            <button onClick={() => insertMailMergeBlock("saludo")} type="button">Línea de saludo</button>
            <button onClick={() => insertMailMergeBlock("destinatario")} type="button">Bloque destinatario</button>
            <button onClick={() => insertMailMergeBlock("tarea")} type="button">Bloque tarea</button>
            <button onClick={() => insertWordField("MERGE_NOMBRE")} type="button">Nombre</button>
            <button onClick={() => insertWordField("MERGE_APELLIDO")} type="button">Apellido</button>
            <button onClick={() => insertWordField("MERGE_CORREO")} type="button">Correo</button>
            <button onClick={() => insertWordField("MERGE_GRUPO")} type="button">Grupo</button>
            <button onClick={() => insertWordField("MERGE_TEMA")} type="button">Tema</button>
            <button onClick={() => insertWordField("MERGE_DOCENTE")} type="button">Docente</button>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Vinculos" show={activeRibbonTab === "Insertar"}>
          <div className="ficct-word-link-tools">
            <input ref={linkInputRef} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => runOnEnter(e, applyLink)} placeholder="https://..." />
            <button onClick={applyLink} type="button"><LinkIcon className="w-3.5 h-3.5" /> Link</button>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Notas" show={false}>
          <div className="ficct-word-link-tools">
            <input ref={footnoteInputRef} value={footnoteDraft} onChange={(e) => setFootnoteDraft(e.target.value)} onKeyDown={(e) => runOnEnter(e, insertFootnote)} placeholder="Nota al pie" />
            <button onClick={insertFootnote} type="button">Pie</button>
            <input ref={endnoteInputRef} value={endnoteDraft} onChange={(e) => setEndnoteDraft(e.target.value)} onKeyDown={(e) => runOnEnter(e, insertEndnote)} placeholder="Nota al final" />
            <button onClick={insertEndnote} type="button">Final</button>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Revisar" show={activeRibbonTab === "Revisar"}>
          <div className="ficct-word-review-tools">
            <input ref={commentInputRef} value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} onKeyDown={(e) => runOnEnter(e, addComment)} placeholder="Comentario" />
            <button onClick={addComment} type="button">Comentar</button>
            <input value={suggestionDraft} onChange={(e) => setSuggestionDraft(e.target.value)} placeholder="Sugerir texto" />
            <button onClick={addInsertionSuggestion} type="button">Sugerir +</button>
            <button onClick={addDeletionSuggestion} type="button">Sugerir -</button>
            <button onClick={() => updateAllPendingSuggestions("accepted")} type="button">Aceptar todo</button>
            <button onClick={() => updateAllPendingSuggestions("rejected")} type="button">Rechazar todo</button>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Tabla" show={activeRibbonTab === "Insertar"}>
          <div className="ficct-word-table-tools">
            <select value={tableStyle} onChange={(e) => setTableStyle(e.target.value as TableStyle)}>
              <option value="grid">Cuadricula</option>
              <option value="plain">Simple</option>
              <option value="banded">Franjas</option>
              <option value="blue">Azul</option>
            </select>
            <div>
              <button onClick={() => tableCommand("addRowAfter")} type="button">Fila +</button>
              <button onClick={() => tableCommand("deleteRow")} type="button">Fila -</button>
              <button onClick={() => tableCommand("addColumnAfter")} type="button">Col +</button>
              <button onClick={() => tableCommand("deleteColumn")} type="button">Col -</button>
              <button onClick={() => tableCommand("mergeCells")} type="button">Unir</button>
              <button onClick={() => tableCommand("splitCell")} type="button">Dividir</button>
              <button onClick={() => tableCommand("deleteTable")} type="button">Borrar</button>
              <button onClick={() => updateTableRowOption({ repeatHeader: true })} type="button">Rep.enc</button>
              <button onClick={() => updateTableRowOption({ keepTogether: true })} type="button">No div.</button>
              <input type="color" value={tableCellColor} onChange={(e) => setTableCellColor(e.target.value)} title="Color de celda" />
              <button onClick={applyTableCellColor} type="button">Fondo</button>
            </div>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Edición" show={activeRibbonTab === "Inicio"}>
          <div className="ficct-word-find-grid">
            <label>
              <span>Buscar</span>
              <input ref={findInputRef} value={findText} onChange={(e) => setFindText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && findNext()} />
            </label>
            <span className="ficct-word-find-count">{findText.trim() ? `${findMatches} coincidencia${findMatches === 1 ? "" : "s"}` : "Sin busqueda"}</span>
            <label>
              <span>Reemplazar</span>
              <input ref={replaceInputRef} value={replaceText} onChange={(e) => setReplaceText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && findNext(true)} />
            </label>
            <div>
              <button onClick={() => findNext()} type="button">Buscar</button>
              <button onClick={() => findNext(true)} type="button">Cambiar</button>
              <button onClick={replaceAll} type="button">Todo</button>
            </div>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Disposición" show={activeRibbonTab === "Disposicion"}>
          <div className="ficct-word-layout-grid">
            <label>
              <span>Papel</span>
              <select value={pageSize} onChange={(e) => setPageSize(e.target.value as PageSizeKey)}>
                {Object.entries(PAGE_SIZES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
              </select>
            </label>
            <label>
              <span>Orient.</span>
              <select value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)}>
                <option value="portrait">Vertical</option>
                <option value="landscape">Horizontal</option>
              </select>
            </label>
            <label>
              <span>Cols.</span>
              <select value={pageColumns} onChange={(e) => setPageColumns(Number(e.target.value) as PageColumns)}>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </label>
            <button onClick={insertColumnBreak} className="ficct-word-layout-button" type="button">Salto columna</button>
            <button onClick={() => insertSectionBreak("nextPage")} className="ficct-word-layout-button" type="button">Seccion pag.</button>
            <button onClick={() => insertSectionBreak("continuous")} className="ficct-word-layout-button" type="button">Seccion cont.</button>
            <label className="ficct-word-check">
              <input type="checkbox" checked={lineNumbers} onChange={(e) => setLineNumbers(e.target.checked)} /> Lineas
            </label>
            <label>
              <span>Vert.</span>
              <select value={pageVerticalAlign} onChange={(e) => setPageVerticalAlign(e.target.value as PageVerticalAlign)}>
                <option value="top">Sup.</option>
                <option value="center">Centro</option>
                <option value="bottom">Inf.</option>
                <option value="both">Just.</option>
              </select>
            </label>
            <label className="ficct-word-check">
              <input type="checkbox" checked={autoHyphenation} onChange={(e) => setAutoHyphenation(e.target.checked)} /> Guiones
            </label>
            {(["top", "right", "bottom", "left"] as const).map((side) => (
              <label key={side}>
                <span>{side === "top" ? "Sup." : side === "right" ? "Der." : side === "bottom" ? "Inf." : "Izq."}</span>
                <input
                  type="number"
                  min={24}
                  max={144}
                  value={margins[side]}
                  onChange={(e) => setMargins((m) => ({ ...m, [side]: Number(e.target.value) || 72 }))}
                />
              </label>
            ))}
          </div>
        </RibbonGroup>

        <RibbonGroup label="Pagina" show={activeRibbonTab === "Disposicion" || activeRibbonTab === "Diseno"}>
          <div className="ficct-word-page-grid">
            <label><span>Enc.</span><input value={headerText} onChange={(e) => setHeaderText(e.target.value)} /></label>
            <label><span>Pie</span><input value={footerText} onChange={(e) => setFooterText(e.target.value)} /></label>
            <label className="ficct-word-check"><input type="checkbox" checked={differentFirstPage} onChange={(e) => setDifferentFirstPage(e.target.checked)} /> 1ra dif.</label>
            <label className="ficct-word-check"><input type="checkbox" checked={differentEvenOddPages} onChange={(e) => setDifferentEvenOddPages(e.target.checked)} /> Pares</label>
            {differentFirstPage && (
              <>
                <label><span>Enc.1</span><input value={firstPageHeaderText} onChange={(e) => setFirstPageHeaderText(e.target.value)} /></label>
                <label><span>Pie 1</span><input value={firstPageFooterText} onChange={(e) => setFirstPageFooterText(e.target.value)} /></label>
              </>
            )}
            {differentEvenOddPages && (
              <>
                <label><span>Enc.P</span><input value={evenPageHeaderText} onChange={(e) => setEvenPageHeaderText(e.target.value)} /></label>
                <label><span>Pie P</span><input value={evenPageFooterText} onChange={(e) => setEvenPageFooterText(e.target.value)} /></label>
              </>
            )}
            <label><span>Marca</span><input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} /></label>
            <label className="ficct-word-check"><input type="checkbox" checked={pageNumbers} onChange={(e) => setPageNumbers(e.target.checked)} /> Num.</label>
            <label className="ficct-word-check"><input type="checkbox" checked={pageNumbersIncludeTotal} onChange={(e) => setPageNumbersIncludeTotal(e.target.checked)} /> de Y</label>
            <label>
              <span>Pos.</span>
              <select value={pageNumberPosition} onChange={(e) => setPageNumberPosition(e.target.value as PageNumberPosition)}>
                <option value="bottom-center">Inf. centro</option>
                <option value="bottom-left">Inf. izq.</option>
                <option value="bottom-right">Inf. der.</option>
                <option value="top-center">Sup. centro</option>
                <option value="top-left">Sup. izq.</option>
                <option value="top-right">Sup. der.</option>
              </select>
            </label>
            <label><span>Ini.</span><input type="number" min={1} max={999} value={pageNumberStart} onChange={(e) => setPageNumberStart(Math.max(1, Number(e.target.value) || 1))} /></label>
            <label>
              <span>Fmt.</span>
              <select value={pageNumberFormat} onChange={(e) => setPageNumberFormat(e.target.value as PageNumberFormatKey)}>
                <option value="decimal">1,2,3</option>
                <option value="lowerRoman">i,ii,iii</option>
                <option value="upperRoman">I,II,III</option>
                <option value="lowerLetter">a,b,c</option>
                <option value="upperLetter">A,B,C</option>
              </select>
            </label>
            <label className="ficct-word-check"><input type="checkbox" checked={pageBorder} onChange={(e) => setPageBorder(e.target.checked)} /> Borde</label>
            <label className="ficct-word-color-field"><span>Color</span><input type="color" value={pageColor} onChange={(e) => setPageColor(e.target.value)} /></label>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Documento" show={activeRibbonTab === "Archivo"}>
          <div className="ficct-word-doc-actions">
            <button onClick={() => fileInputRef.current?.click()} type="button"><FileUp className="w-4 h-4" /> Importar</button>
            <button onClick={() => saveDocument()} type="button"><Save className="w-4 h-4" /> {saving ? "Guardando" : "Guardar"}</button>
            <button onClick={exportDocx} type="button"><FileText className="w-4 h-4" /> .docx</button>
            <button onClick={() => window.print()} type="button"><FileText className="w-4 h-4" /> Imprimir</button>
            <button onClick={loadVersions} type="button"><BookOpen className="w-4 h-4" /> Historial</button>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Vista" show={activeRibbonTab === "Vista"}>
          <div className="ficct-word-zoom-controls">
            <button type="button" className={showRulers ? "active" : ""} onClick={() => setShowRulers((value) => !value)}>Regla</button>
            <button type="button" className={showGridlines ? "active" : ""} onClick={() => setShowGridlines((value) => !value)}>Cuadricula</button>
            <button type="button" className={showNavigation ? "active" : ""} onClick={() => setShowNavigation((value) => !value)}>Navegacion</button>
            <button type="button" className={viewMode === "print" ? "active" : ""} onClick={() => setViewMode("print")}>Impresion</button>
            <button type="button" className={viewMode === "web" ? "active" : ""} onClick={() => setViewMode("web")}>Web</button>
            <button type="button" className={viewMode === "read" ? "active" : ""} onClick={() => setViewMode("read")}>Lectura</button>
            <button type="button" onClick={() => setZoom((value) => Math.max(50, value - 10))}>-</button>
            <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
              {[50, 75, 90, 100, 110, 125, 150].map((value) => <option key={value} value={value}>{value}%</option>)}
            </select>
            <button type="button" onClick={() => setZoom((value) => Math.min(150, value + 10))}>+</button>
          </div>
        </RibbonGroup>
      </section>

      {showRulers && (
        <HorizontalPageRuler
          pageWidthIn={page.width}
          margins={margins}
          metrics={rulerMetrics}
          rulerRef={horizontalRulerRef}
          onMarginsChange={setMargins}
        />
      )}

      <div
        ref={workareaRef}
        className={[
          "ficct-word-workarea",
          showRulers ? "" : "no-rulers",
          showNavigation ? "with-navigation" : "without-navigation",
        ].filter(Boolean).join(" ")}
      >
        {showRulers && (
          <VerticalPageRuler
            pageHeightIn={page.height}
            margins={margins}
            metrics={rulerMetrics}
            onMarginsChange={setMargins}
          />
        )}
        {showNavigation && (
          <aside className="ficct-navigation-panel">
            <div>
              <h3>Navegacion</h3>
              <button onClick={() => setShowNavigation(false)} type="button">Cerrar</button>
            </div>
            {outlineItems.length === 0 && <p>No hay titulos en el documento.</p>}
            {outlineItems.map((item) => (
              <button
                key={`${item.position}-${item.text}`}
                className={`level-${item.level}`}
                onClick={() => goToOutlineItem(item.position)}
                type="button"
              >
                {item.text}
              </button>
            ))}
          </aside>
        )}
        <div ref={canvasRef} className={`ficct-word-canvas ficct-view-${viewMode}`}>
          <main
            ref={pageRef}
            className={`ficct-word-page ficct-table-${tableStyle} ficct-columns-${pageColumns} ficct-view-page-${viewMode} ${showGridlines ? "ficct-gridlines" : ""} ${lineNumbers ? "ficct-line-numbers" : ""} ${pageBorder ? "ficct-page-bordered" : ""} ${numberHeadings ? "numbered-headings" : ""}`}
            style={{
              width: `${page.width}in`,
              minHeight: `${page.height}in`,
              paddingTop: margins.top,
              paddingRight: margins.right,
              paddingBottom: margins.bottom,
              paddingLeft: margins.left,
              backgroundColor: pageColor,
              transform: `scale(${zoom / 100})`,
            }}
          >
            {(visibleHeaderText || pageNumberTop) && (
              <div className={`ficct-word-page-header ${pageNumberTop ? pageNumberClass : ""}`}>
                {visibleHeaderText}{visibleHeaderText && pageNumberTop ? " - " : ""}{pageNumberTop ? visiblePageNumberText : ""}
              </div>
            )}
            {watermarkText && <div className="ficct-word-watermark">{watermarkText}</div>}
            <div ref={pageContentRef}>
              <EditorContent editor={editor} />
              {footnotes.length > 0 && (
                <div className="ficct-footnotes">
                  {footnotes.map((footnote) => (
                    <p key={footnote.id}><sup>[{footnote.label}]</sup> {footnote.text}</p>
                  ))}
                </div>
              )}
              {endnotes.length > 0 && (
                <div className="ficct-footnotes">
                  <strong>Notas al final</strong>
                  {endnotes.map((endnote) => (
                    <p key={endnote.id}><sup>[e{endnote.label}]</sup> {endnote.text}</p>
                  ))}
                </div>
              )}
            </div>
            {(visibleFooterText || pageNumberBottom) && (
              <div className={`ficct-word-page-footer ${pageNumberBottom ? pageNumberClass : ""}`}>
                {visibleFooterText}{visibleFooterText && pageNumberBottom ? " - " : ""}{pageNumberBottom ? visiblePageNumberText : ""}
              </div>
            )}
          </main>
          {(comments.length > 0 || suggestions.length > 0) && (
            <aside className="ficct-comments-panel">
              {comments.length > 0 && (
                <>
                  <h3>Comentarios</h3>
                  {comments.map((comment) => (
                    <div key={comment.id} className={comment.resolved ? "resolved" : ""}>
                      <strong>{comment.author}</strong>
                      <p>{comment.text}</p>
                      <span>{new Date(comment.createdAt).toLocaleString()}</span>
                      <div>
                        <button onClick={() => toggleCommentResolved(comment.id)} type="button">
                          {comment.resolved ? "Reabrir" : "Resolver"}
                        </button>
                        <button onClick={() => removeComment(comment.id)} type="button">Quitar</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {suggestions.length > 0 && (
                <section className="ficct-suggestions-list">
                  <h3>Control de cambios</h3>
                  <div className="ficct-suggestions-actions">
                    <button onClick={() => updateAllPendingSuggestions("accepted")} type="button">Aceptar todo</button>
                    <button onClick={() => updateAllPendingSuggestions("rejected")} type="button">Rechazar todo</button>
                  </div>
                  {suggestions.map((suggestion) => (
                    <article key={suggestion.id} className={suggestion.status}>
                      <strong>{suggestion.type === "insert" ? "Insercion" : "Eliminacion"} - {suggestion.author}</strong>
                      <p>{suggestion.text}</p>
                      <span>{new Date(suggestion.createdAt).toLocaleString()}</span>
                      <div>
                        {suggestion.status === "pending" ? (
                          <>
                            <button onClick={() => updateSuggestionStatus(suggestion.id, "accepted")} type="button">Aceptar</button>
                            <button onClick={() => updateSuggestionStatus(suggestion.id, "rejected")} type="button">Rechazar</button>
                          </>
                        ) : (
                          <span>{suggestion.status === "accepted" ? "Aceptado" : "Rechazado"}</span>
                        )}
                      </div>
                    </article>
                  ))}
                </section>
              )}
            </aside>
          )}
          {showVersions && (
            <aside className="ficct-versions-panel">
              <div>
                <h3>Historial</h3>
                <button onClick={() => setShowVersions(false)} type="button">Cerrar</button>
              </div>
              {loadingVersions && <p>Cargando versiones...</p>}
              {!loadingVersions && versions.length === 0 && <p>No hay versiones guardadas todavia.</p>}
              {versions.map((version) => (
                <section key={version.id}>
                  <strong>{version.titulo}</strong>
                  <span>{version.usuarioNombre} - {version.createdAt ? new Date(version.createdAt).toLocaleString() : ""}</span>
                  <button onClick={() => restoreVersion(version)} type="button">Restaurar</button>
                </section>
              ))}
            </aside>
          )}
        </div>
      </div>

      <ReferenceSourceManager
        open={showSourceManager}
        citations={citations}
        bibliographyStyle={bibliographyStyle}
        onClose={() => setShowSourceManager(false)}
        onCitationsChange={setCitations}
        onInsertCitation={insertCitationFromManager}
      />

      <footer className="ficct-word-statusbar">
        <span>Página 1 de {pageCount}</span>
        <span>{wordCount} palabras</span>
        <span>{charCount} caracteres</span>
        <span>{activeCollaborators.length ? `${activeCollaborators.length} coautor(es) en linea` : "Sin coautores en linea"}</span>
        <span className={isRealtimeConnected ? "" : "offline"}>
          {isRealtimeConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {isRealtimeConnected
            ? "Live conectado"
            : queuedMessageCount > 0
              ? `Live reconectando: ${queuedMessageCount} en cola`
              : "Live reconectando"}
        </span>
        <span>Español (Bolivia)</span>
        <span className={status === "offline" ? "offline" : ""}>
          {status === "offline" ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          {statusLabel}
        </span>
        {status === "remote" && (
          <button
            className="ficct-word-status-action"
            type="button"
            onClick={loadRemoteChanges}
            title={remoteConflictTitle(remoteConflict)}
          >
            {remoteConflictActionLabel(remoteConflict)}
          </button>
        )}
        <div className="ficct-word-status-views" aria-label="Vistas del documento">
          <button
            type="button"
            className={viewMode === "read" ? "active" : ""}
            onClick={() => setViewMode("read")}
            title="Lectura"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className={viewMode === "print" ? "active" : ""}
            onClick={() => setViewMode("print")}
            title="Diseño de impresión"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className={viewMode === "web" ? "active" : ""}
            onClick={() => setViewMode("web")}
            title="Diseño web"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="ficct-word-status-zoom" aria-label="Zoom del documento">
          <span className="ficct-word-zoom">{zoom}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.max(50, value - 10))} title="Alejar">-</button>
          <input
            type="range"
            min={50}
            max={150}
            step={10}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            aria-label="Zoom"
          />
          <button type="button" onClick={() => setZoom((value) => Math.min(150, value + 10))} title="Acercar">+</button>
        </div>
      </footer>
    </div>
  );
}



