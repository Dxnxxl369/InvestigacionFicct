import type {
  BookmarkTarget,
  DocumentSettings,
  WordFieldType,
} from "./editorTypes";

export type DocumentSettingsSetters = {
  setMargins: (value: NonNullable<DocumentSettings["margins"]>) => void;
  setNumberHeadings: (value: boolean) => void;
  setPageSize: (value: NonNullable<DocumentSettings["pageSize"]>) => void;
  setOrientation: (value: NonNullable<DocumentSettings["orientation"]>) => void;
  setZoom: (value: number) => void;
  setHeaderText: (value: string) => void;
  setFooterText: (value: string) => void;
  setFirstPageHeaderText: (value: string) => void;
  setFirstPageFooterText: (value: string) => void;
  setEvenPageHeaderText: (value: string) => void;
  setEvenPageFooterText: (value: string) => void;
  setDifferentFirstPage: (value: boolean) => void;
  setDifferentEvenOddPages: (value: boolean) => void;
  setWatermarkText: (value: string) => void;
  setPageNumbers: (value: boolean) => void;
  setPageNumbersIncludeTotal: (value: boolean) => void;
  setPageNumberPosition: (value: NonNullable<DocumentSettings["pageNumberPosition"]>) => void;
  setPageNumberStart: (value: number) => void;
  setPageNumberFormat: (value: NonNullable<DocumentSettings["pageNumberFormat"]>) => void;
  setTableStyle: (value: NonNullable<DocumentSettings["tableStyle"]>) => void;
  setLineHeight: (value: NonNullable<DocumentSettings["lineHeight"]>) => void;
  setComments: (value: NonNullable<DocumentSettings["comments"]>) => void;
  setSuggestions: (value: NonNullable<DocumentSettings["suggestions"]>) => void;
  setFootnotes: (value: NonNullable<DocumentSettings["footnotes"]>) => void;
  setEndnotes: (value: NonNullable<DocumentSettings["endnotes"]>) => void;
  setCitations: (value: NonNullable<DocumentSettings["citations"]>) => void;
  setBibliographyStyle: (value: NonNullable<DocumentSettings["bibliographyStyle"]>) => void;
  setCustomStyles: (value: NonNullable<DocumentSettings["customStyles"]>) => void;
  setPageBorder: (value: boolean) => void;
  setPageColor: (value: string) => void;
  setPageColumns: (value: NonNullable<DocumentSettings["pageColumns"]>) => void;
  setPageVerticalAlign: (value: NonNullable<DocumentSettings["pageVerticalAlign"]>) => void;
  setLineNumbers: (value: boolean) => void;
  setAutoHyphenation: (value: boolean) => void;
};

export function inchesToTwips(value: number) {
  return Math.round(value * 1440);
}

export function currentDocumentSettings(settings: Required<DocumentSettings>): Required<DocumentSettings> {
  return {
    margins: settings.margins,
    numberHeadings: settings.numberHeadings,
    pageSize: settings.pageSize,
    orientation: settings.orientation,
    zoom: settings.zoom,
    headerText: settings.headerText,
    footerText: settings.footerText,
    firstPageHeaderText: settings.firstPageHeaderText,
    firstPageFooterText: settings.firstPageFooterText,
    evenPageHeaderText: settings.evenPageHeaderText,
    evenPageFooterText: settings.evenPageFooterText,
    differentFirstPage: settings.differentFirstPage,
    differentEvenOddPages: settings.differentEvenOddPages,
    watermarkText: settings.watermarkText,
    pageNumbers: settings.pageNumbers,
    pageNumbersIncludeTotal: settings.pageNumbersIncludeTotal,
    pageNumberPosition: settings.pageNumberPosition,
    pageNumberStart: settings.pageNumberStart,
    pageNumberFormat: settings.pageNumberFormat,
    tableStyle: settings.tableStyle,
    lineHeight: settings.lineHeight,
    comments: settings.comments,
    suggestions: settings.suggestions,
    footnotes: settings.footnotes,
    endnotes: settings.endnotes,
    citations: settings.citations,
    bibliographyStyle: settings.bibliographyStyle,
    customStyles: settings.customStyles,
    pageBorder: settings.pageBorder,
    pageColor: settings.pageColor,
    pageColumns: settings.pageColumns,
    pageVerticalAlign: settings.pageVerticalAlign,
    lineNumbers: settings.lineNumbers,
    autoHyphenation: settings.autoHyphenation,
  };
}

export function buildStoredDocumentContent(html: string, settings: DocumentSettings) {
  return `<!--FICCT_DOC_SETTINGS:${encodeSettings(settings)}-->${html}`;
}

export function parseStoredDocumentContent(content: string): { html: string; settings: DocumentSettings } {
  const match = content.match(/^<!--FICCT_DOC_SETTINGS:([A-Za-z0-9+/=]+)-->/);
  if (!match) return { html: content, settings: {} };
  return {
    html: content.slice(match[0].length),
    settings: decodeSettings(match[1]),
  };
}

export function resolveStoredDocumentSettings(settingsKey: string, shared: DocumentSettings): DocumentSettings {
  if (Object.keys(shared).length) return shared;
  try {
    const raw = localStorage.getItem(settingsKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function applyDocumentSettings(settings: DocumentSettings, setters: DocumentSettingsSetters) {
  if (settings.margins) setters.setMargins(settings.margins);
  if (typeof settings.numberHeadings === "boolean") setters.setNumberHeadings(settings.numberHeadings);
  if (settings.pageSize) setters.setPageSize(settings.pageSize);
  if (settings.orientation === "portrait" || settings.orientation === "landscape") setters.setOrientation(settings.orientation);
  if (typeof settings.zoom === "number") setters.setZoom(settings.zoom);
  if (typeof settings.headerText === "string") setters.setHeaderText(settings.headerText);
  if (typeof settings.footerText === "string") setters.setFooterText(settings.footerText);
  if (typeof settings.firstPageHeaderText === "string") setters.setFirstPageHeaderText(settings.firstPageHeaderText);
  if (typeof settings.firstPageFooterText === "string") setters.setFirstPageFooterText(settings.firstPageFooterText);
  if (typeof settings.evenPageHeaderText === "string") setters.setEvenPageHeaderText(settings.evenPageHeaderText);
  if (typeof settings.evenPageFooterText === "string") setters.setEvenPageFooterText(settings.evenPageFooterText);
  if (typeof settings.differentFirstPage === "boolean") setters.setDifferentFirstPage(settings.differentFirstPage);
  if (typeof settings.differentEvenOddPages === "boolean") setters.setDifferentEvenOddPages(settings.differentEvenOddPages);
  if (typeof settings.watermarkText === "string") setters.setWatermarkText(settings.watermarkText);
  if (typeof settings.pageNumbers === "boolean") setters.setPageNumbers(settings.pageNumbers);
  if (typeof settings.pageNumbersIncludeTotal === "boolean") setters.setPageNumbersIncludeTotal(settings.pageNumbersIncludeTotal);
  if (settings.pageNumberPosition) setters.setPageNumberPosition(settings.pageNumberPosition);
  if (typeof settings.pageNumberStart === "number") setters.setPageNumberStart(Math.max(1, Math.floor(settings.pageNumberStart)));
  if (settings.pageNumberFormat) setters.setPageNumberFormat(settings.pageNumberFormat);
  if (settings.tableStyle) setters.setTableStyle(settings.tableStyle);
  if (settings.lineHeight) setters.setLineHeight(settings.lineHeight);
  if (Array.isArray(settings.comments)) setters.setComments(settings.comments);
  if (Array.isArray(settings.suggestions)) setters.setSuggestions(settings.suggestions);
  if (Array.isArray(settings.footnotes)) setters.setFootnotes(settings.footnotes);
  if (Array.isArray(settings.endnotes)) setters.setEndnotes(settings.endnotes);
  if (Array.isArray(settings.citations)) setters.setCitations(settings.citations);
  if (settings.bibliographyStyle) setters.setBibliographyStyle(settings.bibliographyStyle);
  if (Array.isArray(settings.customStyles)) setters.setCustomStyles(settings.customStyles);
  if (typeof settings.pageBorder === "boolean") setters.setPageBorder(settings.pageBorder);
  if (typeof settings.pageColor === "string") setters.setPageColor(settings.pageColor);
  if (settings.pageColumns) setters.setPageColumns(settings.pageColumns);
  if (settings.pageVerticalAlign) setters.setPageVerticalAlign(settings.pageVerticalAlign);
  if (typeof settings.lineNumbers === "boolean") setters.setLineNumbers(settings.lineNumbers);
  if (typeof settings.autoHyphenation === "boolean") setters.setAutoHyphenation(settings.autoHyphenation);
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function sanitizeBookmarkId(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const id = normalized || `marcador_${Date.now()}`;
  return /^[A-Za-z]/.test(id) ? id.slice(0, 40) : `m_${id}`.slice(0, 40);
}

export function getBookmarkTargets(html: string): BookmarkTarget[] {
  const parsed = new DOMParser().parseFromString(`<main>${html}</main>`, "text/html");
  const targets = Array.from(parsed.querySelectorAll("[data-bookmark-id]"))
    .map((element) => {
      const id = sanitizeBookmarkId(element.getAttribute("data-bookmark-id") || "");
      const label = element.getAttribute("data-bookmark-label") || element.textContent?.trim() || id;
      return id ? { id, label } : null;
    })
    .filter((target): target is BookmarkTarget => Boolean(target));
  const seen = new Set<string>();
  return targets.filter((target) => {
    if (seen.has(target.id)) return false;
    seen.add(target.id);
    return true;
  });
}

export function stableNumericId(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

export function initialsFromName(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "US";
}

export function normalizeWordField(value: string | null): WordFieldType {
  if (
    value === "TIME" ||
    value === "NUMPAGES" ||
    value === "AUTHOR" ||
    value === "TITLE" ||
    value === "SUBJECT" ||
    value === "FILENAME" ||
    value === "MERGE_NOMBRE" ||
    value === "MERGE_APELLIDO" ||
    value === "MERGE_CORREO" ||
    value === "MERGE_GRUPO" ||
    value === "MERGE_TEMA" ||
    value === "MERGE_DOCENTE"
  ) return value;
  return "DATE";
}

export function wordFieldLabel(field: WordFieldType) {
  if (field === "TIME") return "Hora";
  if (field === "NUMPAGES") return "Total paginas";
  if (field === "AUTHOR") return "Autor";
  if (field === "TITLE") return "Titulo";
  if (field === "SUBJECT") return "Asunto";
  if (field === "FILENAME") return "Nombre de archivo";
  if (field === "MERGE_NOMBRE") return "Nombre";
  if (field === "MERGE_APELLIDO") return "Apellido";
  if (field === "MERGE_CORREO") return "Correo";
  if (field === "MERGE_GRUPO") return "Grupo";
  if (field === "MERGE_TEMA") return "Tema";
  if (field === "MERGE_DOCENTE") return "Docente";
  return "Fecha";
}

function encodeSettings(settings: DocumentSettings) {
  const json = JSON.stringify(settings);
  if (typeof window === "undefined") {
    return Buffer.from(json, "utf-8").toString("base64");
  }
  return btoa(unescape(encodeURIComponent(json)));
}

function decodeSettings(encoded: string): DocumentSettings {
  try {
    const json = typeof window === "undefined"
      ? Buffer.from(encoded, "base64").toString("utf-8")
      : decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch {
    return {};
  }
}
