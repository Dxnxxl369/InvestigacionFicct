import type {
  Bookmark,
  CheckBox,
  CommentRangeEnd,
  CommentRangeStart,
  CommentReference,
  DeletedTextRun,
  EndnoteReferenceRun,
  ExternalHyperlink,
  FootnoteReferenceRun,
  ImageRun,
  InsertedTextRun,
  PageReference,
  SimpleField,
  Tab,
  TextRun,
} from "docx";

export const DEFAULT_MARGINS = { top: 72, right: 72, bottom: 72, left: 72 };

export const PAGE_SIZES = {
  carta: { label: "Carta", width: 8.5, height: 11 },
  a4: { label: "A4", width: 8.27, height: 11.69 },
  oficio: { label: "Oficio", width: 8.5, height: 13 },
};

export type PageSizeKey = keyof typeof PAGE_SIZES;
export type Orientation = "portrait" | "landscape";
export type TableStyle = "grid" | "plain" | "banded" | "blue";
export type LineHeight = "1" | "1.15" | "1.5" | "2";
export type PageColumns = 1 | 2 | 3;
export type PageNumberPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
export type PageNumberFormatKey = "decimal" | "lowerRoman" | "upperRoman" | "lowerLetter" | "upperLetter";
export type PageVerticalAlign = "top" | "center" | "bottom" | "both";
export type TabStopKind = "left" | "center" | "right" | "decimal";
export type TabLeaderKind = "none" | "dot" | "hyphen" | "underscore";
export type ParagraphTabStop = { position: number; type: TabStopKind; leader: TabLeaderKind };
export type RibbonTab = "Archivo" | "Inicio" | "Insertar" | "Diseno" | "Disposicion" | "Referencias" | "Correspondencia" | "Revisar" | "Vista";
export type ViewMode = "print" | "web" | "read";
export type EditorSaveStatus = "synced" | "dirty" | "offline" | "remote";

export type ReviewComment = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  resolved?: boolean;
};

export type SuggestionItem = {
  id: string;
  type: "insert" | "delete";
  text: string;
  author: string;
  createdAt: string;
  status: "pending" | "accepted" | "rejected";
};

export type PresenceUser = {
  sessionId: string;
  name: string;
  lastSeen: number;
};

export type RemoteCursor = {
  sessionId: string;
  name: string;
  from: number;
  to: number;
  color: string;
  lastSeen: number;
};

export type FootnoteItem = {
  id: string;
  label: number;
  text: string;
};

export type BibliographyStyle = "apa" | "ieee" | "mla";
export type CitationSourceType = "book" | "journal" | "web" | "conference" | "thesis" | "report";

export type CitationItem = {
  id: string;
  author: string;
  year: string;
  title: string;
  source: string;
  sourceType?: CitationSourceType;
  publisher?: string;
  city?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  accessedAt?: string;
};

export type CaptionKind = "Figura" | "Tabla" | "Ecuacion";
export type CrossReferenceKind = "texto" | "pagina";
export type ImageAlignment = "left" | "center" | "right";
export type ImageWrapMode = "inline" | "square";
export type SectionBreakKind = "nextPage" | "continuous";
export type WordFieldType =
  | "DATE"
  | "TIME"
  | "NUMPAGES"
  | "AUTHOR"
  | "TITLE"
  | "SUBJECT"
  | "FILENAME"
  | "MERGE_NOMBRE"
  | "MERGE_APELLIDO"
  | "MERGE_CORREO"
  | "MERGE_GRUPO"
  | "MERGE_TEMA"
  | "MERGE_DOCENTE";
export type WordShapeKind = "rectangle" | "oval" | "arrow" | "callout";

export type BookmarkTarget = {
  id: string;
  label: string;
};

export type CustomTextStyle = {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline?: boolean;
};

export type DocumentSettings = {
  margins?: typeof DEFAULT_MARGINS;
  numberHeadings?: boolean;
  pageSize?: PageSizeKey;
  orientation?: Orientation;
  zoom?: number;
  headerText?: string;
  footerText?: string;
  firstPageHeaderText?: string;
  firstPageFooterText?: string;
  evenPageHeaderText?: string;
  evenPageFooterText?: string;
  differentFirstPage?: boolean;
  differentEvenOddPages?: boolean;
  watermarkText?: string;
  pageNumbers?: boolean;
  pageNumbersIncludeTotal?: boolean;
  pageNumberPosition?: PageNumberPosition;
  pageNumberStart?: number;
  pageNumberFormat?: PageNumberFormatKey;
  tableStyle?: TableStyle;
  lineHeight?: LineHeight;
  comments?: ReviewComment[];
  suggestions?: SuggestionItem[];
  footnotes?: FootnoteItem[];
  endnotes?: FootnoteItem[];
  citations?: CitationItem[];
  bibliographyStyle?: BibliographyStyle;
  customStyles?: CustomTextStyle[];
  pageBorder?: boolean;
  pageColor?: string;
  pageColumns?: PageColumns;
  pageVerticalAlign?: PageVerticalAlign;
  lineNumbers?: boolean;
  autoHyphenation?: boolean;
};

export type DocxExportOptions = {
  numberHeadings: boolean;
  defaultLineHeight: LineHeight;
  tableStyle: TableStyle;
};

export type DocxInlineChild =
  | TextRun
  | ImageRun
  | FootnoteReferenceRun
  | EndnoteReferenceRun
  | ExternalHyperlink
  | CommentRangeStart
  | CommentRangeEnd
  | CommentReference
  | InsertedTextRun
  | DeletedTextRun
  | SimpleField
  | Bookmark
  | PageReference
  | CheckBox
  | Tab;

export const DOCX_LINE_SPACING: Record<LineHeight, number> = {
  "1": 240,
  "1.15": 276,
  "1.5": 360,
  "2": 480,
};
