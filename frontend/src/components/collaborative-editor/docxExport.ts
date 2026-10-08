import {
  AlignmentType,
  Bookmark,
  BorderStyle,
  CheckBox,
  ColumnBreak,
  CommentRangeEnd,
  CommentRangeStart,
  CommentReference,
  DeletedTextRun,
  Document,
  EndnoteReferenceRun,
  ExternalHyperlink,
  Footer,
  FootnoteReferenceRun,
  Header,
  HeadingLevel,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  InsertedTextRun,
  LineNumberRestartFormat,
  PageBreak,
  PageBorderDisplay,
  PageBorderOffsetFrom,
  PageBorderZOrder,
  PageOrientation,
  PageReference,
  Packer,
  Paragraph,
  SectionType,
  SimpleField,
  Tab,
  TabStopType,
  TableOfContents,
  Table as DocxTable,
  TableCell as DocxTableCell,
  TableRow as DocxTableRow,
  TextRun,
  TextWrappingSide,
  TextWrappingType,
  Textbox,
  LeaderType,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  WidthType,
} from "docx";
import {
  DOCX_LINE_SPACING,
  type CaptionKind,
  type CitationItem,
  type DocumentSettings,
  type DocxExportOptions,
  type DocxInlineChild,
  type FootnoteItem,
  type ImageAlignment,
  type LineHeight,
  type PageNumberPosition,
  type ParagraphTabStop,
  type ReviewComment,
  type SectionBreakKind,
  type SuggestionItem,
  type TabLeaderKind,
  type TabStopKind,
  type TableStyle,
  type WordFieldType,
  type WordShapeKind,
} from "./editorTypes";
import {
  getPageDimensions,
  pageNumberFormatToDocx,
  pageVerticalAlignToDocx,
} from "./editorViewUtils";
import {
  inchesToTwips,
  initialsFromName,
  normalizeWordField,
  sanitizeBookmarkId,
  stableNumericId,
} from "./documentModel";
import { bibliographyEntries } from "./bibliography";

export type BuildDocxDocumentInput = {
  html: string;
  title: string;
  fallbackTitle: string;
  category?: string | null;
  description?: string | null;
  currentUserName?: string;
  revision: number;
  settings: Required<DocumentSettings>;
};

export async function buildDocxDocumentBlob({
  html,
  title,
  fallbackTitle,
  category,
  description,
  currentUserName,
  revision,
  settings,
}: BuildDocxDocumentInput) {
  const page = getPageDimensions(settings.pageSize, settings.orientation);
  const defaultHeader = settings.headerText.trim() || settings.watermarkText.trim() || (settings.pageNumbers && settings.pageNumberPosition.startsWith("top"))
    ? new Header({ children: headerParagraphs(settings.headerText.trim(), settings.watermarkText.trim(), settings.pageNumbers && settings.pageNumberPosition.startsWith("top"), settings.pageNumberPosition, settings.pageNumbersIncludeTotal) })
    : undefined;
  const firstHeader = settings.differentFirstPage && (settings.firstPageHeaderText.trim() || settings.watermarkText.trim() || (settings.pageNumbers && settings.pageNumberPosition.startsWith("top")))
    ? new Header({ children: headerParagraphs(settings.firstPageHeaderText.trim(), settings.watermarkText.trim(), settings.pageNumbers && settings.pageNumberPosition.startsWith("top"), settings.pageNumberPosition, settings.pageNumbersIncludeTotal) })
    : undefined;
  const evenHeader = settings.differentEvenOddPages && (settings.evenPageHeaderText.trim() || settings.watermarkText.trim() || (settings.pageNumbers && settings.pageNumberPosition.startsWith("top")))
    ? new Header({ children: headerParagraphs(settings.evenPageHeaderText.trim(), settings.watermarkText.trim(), settings.pageNumbers && settings.pageNumberPosition.startsWith("top"), settings.pageNumberPosition, settings.pageNumbersIncludeTotal) })
    : undefined;
  const defaultFooter = settings.footerText.trim() || (settings.pageNumbers && settings.pageNumberPosition.startsWith("bottom"))
    ? new Footer({ children: [headerFooterParagraph(settings.footerText.trim(), settings.pageNumbers && settings.pageNumberPosition.startsWith("bottom"), settings.pageNumberPosition, settings.pageNumbersIncludeTotal)] })
    : undefined;
  const firstFooter = settings.differentFirstPage && (settings.firstPageFooterText.trim() || (settings.pageNumbers && settings.pageNumberPosition.startsWith("bottom")))
    ? new Footer({ children: [headerFooterParagraph(settings.firstPageFooterText.trim(), settings.pageNumbers && settings.pageNumberPosition.startsWith("bottom"), settings.pageNumberPosition, settings.pageNumbersIncludeTotal)] })
    : undefined;
  const evenFooter = settings.differentEvenOddPages && (settings.evenPageFooterText.trim() || (settings.pageNumbers && settings.pageNumberPosition.startsWith("bottom")))
    ? new Footer({ children: [headerFooterParagraph(settings.evenPageFooterText.trim(), settings.pageNumbers && settings.pageNumberPosition.startsWith("bottom"), settings.pageNumberPosition, settings.pageNumbersIncludeTotal)] })
    : undefined;
  const sectionGroups = htmlToDocxSectionGroups(html, {
    numberHeadings: settings.numberHeadings,
    defaultLineHeight: settings.lineHeight,
    tableStyle: settings.tableStyle,
  });
  const sectionHeaders = defaultHeader || firstHeader || evenHeader
    ? { default: defaultHeader, first: firstHeader, even: evenHeader }
    : undefined;
  const sectionFooters = defaultFooter || firstFooter || evenFooter
    ? { default: defaultFooter, first: firstFooter, even: evenFooter }
    : undefined;
  const sectionProperties = (sectionType?: SectionBreakKind) => ({
    titlePage: settings.differentFirstPage || undefined,
    type: sectionType ? sectionBreakKindToDocx(sectionType) : undefined,
    page: {
      margin: {
        top: settings.margins.top * 20,
        right: settings.margins.right * 20,
        bottom: settings.margins.bottom * 20,
        left: settings.margins.left * 20,
      },
      size: {
        width: inchesToTwips(page.width),
        height: inchesToTwips(page.height),
        orientation: settings.orientation === "landscape" ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
      },
      pageNumbers: settings.pageNumbers ? {
        start: Math.max(1, Math.floor(settings.pageNumberStart || 1)),
        formatType: pageNumberFormatToDocx(settings.pageNumberFormat),
      } : undefined,
      borders: settings.pageBorder ? {
        pageBorders: {
          display: PageBorderDisplay.ALL_PAGES,
          offsetFrom: PageBorderOffsetFrom.TEXT,
          zOrder: PageBorderZOrder.FRONT,
        },
        pageBorderTop: { style: BorderStyle.SINGLE, size: 12, color: "9CA3AF" },
        pageBorderRight: { style: BorderStyle.SINGLE, size: 12, color: "9CA3AF" },
        pageBorderBottom: { style: BorderStyle.SINGLE, size: 12, color: "9CA3AF" },
        pageBorderLeft: { style: BorderStyle.SINGLE, size: 12, color: "9CA3AF" },
      } : undefined,
    },
    column: settings.pageColumns > 1 ? { count: settings.pageColumns, space: 720, equalWidth: true } : undefined,
    verticalAlign: pageVerticalAlignToDocx(settings.pageVerticalAlign),
    lineNumbers: settings.lineNumbers ? { start: 1, countBy: 1, restart: LineNumberRestartFormat.NEW_PAGE, distance: 360 } : undefined,
  });
  const doc = new Document({
    title: title || fallbackTitle || "Documento colaborativo",
    subject: category || "Documento colaborativo FICCT",
    creator: currentUserName || "FICCT",
    lastModifiedBy: currentUserName || "FICCT",
    description: description || "Documento colaborativo generado desde InvestigacionFicct",
    keywords: "FICCT, investigacion, documento colaborativo, docx",
    revision,
    features: { updateFields: true, trackRevisions: settings.suggestions.some((suggestion) => suggestion.status === "pending") },
    background: settings.pageColor && settings.pageColor !== "#ffffff" ? { color: settings.pageColor.replace("#", "").toUpperCase() } : undefined,
    hyphenation: settings.autoHyphenation ? { autoHyphenation: true, consecutiveHyphenLimit: 2 } : undefined,
    evenAndOddHeaderAndFooters: settings.differentEvenOddPages || undefined,
    comments: commentsToDocxNative(settings.comments),
    footnotes: footnotesToDocxMap(settings.footnotes),
    endnotes: endnotesToDocxMap(settings.endnotes),
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: Array.from({ length: 9 }, (_, level) => ({
            level,
            format: "decimal",
            text: `%${level + 1}.`,
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
          })),
        },
        {
          reference: "heading-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 0, hanging: 360 } } },
            },
            {
              level: 1,
              format: "decimal",
              text: "%1.%2.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 360 } } },
            },
            {
              level: 2,
              format: "decimal",
              text: "%1.%2.%3.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: sectionGroups.map((group, index) => ({
      headers: sectionHeaders,
      footers: sectionFooters,
      properties: sectionProperties(index === 0 ? undefined : group.type),
      children: [
        ...group.children,
        ...(index === sectionGroups.length - 1 ? bibliographyToDocx(settings.citations, settings.bibliographyStyle) : []),
        ...(index === sectionGroups.length - 1 ? suggestionsToDocx(settings.suggestions) : []),
      ],
    })),
  });
  return Packer.toBlob(doc);
}

function pageNumberAlignment(position: PageNumberPosition) {
  if (position.endsWith("left")) return AlignmentType.LEFT;
  if (position.endsWith("right")) return AlignmentType.RIGHT;
  return AlignmentType.CENTER;
}

function headerFooterParagraph(text: string, includePageNumber: boolean, position: PageNumberPosition, includeTotalPages?: boolean) {
  return new Paragraph({
    alignment: includePageNumber ? pageNumberAlignment(position) : AlignmentType.CENTER,
    children: [
      ...(text ? [new TextRun(text), new TextRun("  ")] : []),
      ...(includePageNumber ? [
        new TextRun("Pagina "),
        new SimpleField("PAGE"),
        ...(includeTotalPages ? [new TextRun(" de "), new SimpleField("NUMPAGES")] : []),
      ] : []),
    ],
  });
}

function headerParagraphs(text: string, watermark: string, includePageNumber: boolean, position: PageNumberPosition, includeTotalPages?: boolean) {
  const paragraphs = [headerFooterParagraph(text, includePageNumber, position, includeTotalPages)];
  if (watermark) {
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new Textbox({
          style: {
            position: "absolute",
            width: "7in",
            height: "1.2in",
            left: "0.35in",
            top: "3.6in",
            rotation: -32,
            wrapStyle: "none",
            zIndex: -1,
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: watermark.toUpperCase(), color: "D1D5DB", size: 72, bold: true })],
            }),
          ],
        }),
      ],
    }));
  }
  return paragraphs;
}

export function htmlToDocxChildren(html: string, options: DocxExportOptions): (Paragraph | DocxTable | TableOfContents)[] {
  return htmlToDocxSectionGroups(html, options).flatMap((group) => group.children);
}

export function htmlToDocxSectionGroups(html: string, options: DocxExportOptions): { type?: SectionBreakKind; children: (Paragraph | DocxTable | TableOfContents)[] }[] {
  const parsed = new DOMParser().parseFromString(`<main>${html}</main>`, "text/html");
  const root = parsed.querySelector("main");
  if (!root) return [{ children: [new Paragraph("")] }];

  const groups: { type?: SectionBreakKind; children: (Paragraph | DocxTable | TableOfContents)[] }[] = [{ children: [] }];
  root.childNodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const current = groups[groups.length - 1];
    const tag = node.tagName.toLowerCase();
    if (node.getAttribute("data-type") === "section-break") {
      const type = readSectionBreakKind(node);
      groups.push({ type, children: [] });
    } else if (node.getAttribute("data-type") === "page-break") {
      current.children.push(new Paragraph({ children: [new PageBreak()] }));
    } else if (node.getAttribute("data-type") === "column-break") {
      current.children.push(new Paragraph({ children: [new ColumnBreak()] }));
    } else if (tag === "table") {
      current.children.push(tableToDocx(node, options));
    } else if (tag === "img") {
      const image = imageRunFromElement(node);
      if (image) current.children.push(new Paragraph({ alignment: readImageAlignment(node), children: [image] }));
    } else if (elementIsWordShape(node)) {
      current.children.push(wordShapeToDocx(node));
    } else if (elementIsCaption(node)) {
      current.children.push(captionToDocx(node, options));
    } else if (elementIsTableOfFigures(node)) {
      current.children.push(tableOfFiguresToDocx(node));
    } else if (elementIsCoverPage(node)) {
      current.children.push(...coverPageToDocx(node, options));
    } else if (elementIsTableOfContents(node)) {
      current.children.push(new TableOfContents("Tabla de contenido", {
        hyperlink: true,
        headingStyleRange: "1-3",
        beginDirty: true,
      }));
    } else if (tag === "ul" || tag === "ol") {
      current.children.push(...listToDocx(node, tag === "ol" ? "ordered" : "bullet", 0, options));
    } else {
      current.children.push(blockToParagraph(node, options));
    }
  });

  const normalized = groups.map((group) => ({
    ...group,
    children: group.children.length ? group.children : [new Paragraph("")],
  }));
  return normalized.length ? normalized : [{ children: [new Paragraph("")] }];
}

export function commentsToDocxNative(comments: ReviewComment[]) {
  const activeComments = comments.filter((comment) => !comment.resolved);
  if (!activeComments.length) return undefined;
  return {
    children: activeComments.map((comment) => ({
      id: stableNumericId(comment.id),
      author: comment.author,
      initials: initialsFromName(comment.author),
      date: new Date(comment.createdAt),
      children: [new Paragraph({ children: [new TextRun(comment.text)] })],
    })),
  };
}

export function suggestionsToDocx(suggestions: SuggestionItem[]): Paragraph[] {
  const reviewItems = suggestions.filter((suggestion) => suggestion.status === "pending");
  if (!reviewItems.length) return [];
  return [
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Control de cambios pendiente")] }),
    ...reviewItems.map((suggestion) => new Paragraph({
      children: [
        new TextRun({ text: `${suggestion.type === "insert" ? "Insercion" : "Eliminacion"} - ${suggestion.author}: `, bold: true }),
        new TextRun(suggestion.text),
      ],
    })),
  ];
}

export function bibliographyToDocx(citations: CitationItem[], style: NonNullable<DocumentSettings["bibliographyStyle"]> = "apa"): Paragraph[] {
  if (!citations.length) return [];
  return [
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(`Bibliografia (${style.toUpperCase()})`)] }),
    ...bibliographyEntries(citations, style).map(({ text }) => new Paragraph({
      children: [new TextRun(text)],
      indent: { hanging: 360 },
      spacing: { after: 120 },
    })),
  ];
}

export function footnotesToDocxMap(footnotes: FootnoteItem[]) {
  if (!footnotes.length) return undefined;
  return footnotes.reduce<Record<string, { children: Paragraph[] }>>((acc, footnote) => {
    acc[String(footnote.label)] = {
      children: [new Paragraph({ children: [new TextRun(footnote.text)] })],
    };
    return acc;
  }, {});
}

export function endnotesToDocxMap(endnotes: FootnoteItem[]) {
  if (!endnotes.length) return undefined;
  return endnotes.reduce<Record<string, { children: Paragraph[] }>>((acc, endnote) => {
    acc[String(endnote.label)] = {
      children: [new Paragraph({ children: [new TextRun(endnote.text)] })],
    };
    return acc;
  }, {});
}

function listToDocx(element: HTMLElement, type: "ordered" | "bullet", level: number, options: DocxExportOptions): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  Array.from(element.children).forEach((child) => {
    if (!(child instanceof HTMLElement) || child.tagName.toLowerCase() !== "li") return;
    const nestedLists = Array.from(child.children).filter((nested): nested is HTMLElement =>
      nested instanceof HTMLElement && ["ul", "ol"].includes(nested.tagName.toLowerCase())
    );
    paragraphs.push(new Paragraph({
      children: inlineRunsExcludingNestedLists(child),
      bullet: type === "bullet" ? { level: Math.min(level, 8) } : undefined,
      numbering: type === "ordered" ? { reference: "default-numbering", level: Math.min(level, 8) } : undefined,
      spacing: { line: DOCX_LINE_SPACING[options.defaultLineHeight] },
    }));
    nestedLists.forEach((nested) => {
      paragraphs.push(...listToDocx(nested, nested.tagName.toLowerCase() === "ol" ? "ordered" : "bullet", level + 1, options));
    });
  });
  return paragraphs;
}

function blockToParagraph(element: HTMLElement, options: DocxExportOptions): Paragraph {
  const tag = element.tagName.toLowerCase();
  const heading =
    tag === "h1" ? HeadingLevel.HEADING_1 :
    tag === "h2" ? HeadingLevel.HEADING_2 :
    tag === "h3" ? HeadingLevel.HEADING_3 :
    undefined;
  const headingLevel = tag === "h1" ? 0 : tag === "h2" ? 1 : tag === "h3" ? 2 : undefined;
  const indentLevel = readIndentLevel(element);
  const lineHeight = readLineHeight(element) || options.defaultLineHeight;
  const paragraphSpacing = readParagraphSpacing(element);

  return new Paragraph({
    heading,
    numbering: options.numberHeadings && headingLevel !== undefined
      ? { reference: "heading-numbering", level: headingLevel, custom: true }
      : undefined,
    alignment: readAlignment(element),
    indent: indentLevel > 0 ? { left: indentLevel * 403 } : undefined,
    shading: paragraphShadingToDocx(element),
    border: paragraphBorderToDocx(element),
    tabStops: paragraphTabStopsToDocx(element),
    spacing: {
      line: DOCX_LINE_SPACING[lineHeight],
      before: paragraphSpacing.before,
      after: paragraphSpacing.after,
    },
    children: inlineRuns(element),
  });
}

function inlineRunsExcludingNestedLists(element: Element): DocxInlineChild[] {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("ul,ol").forEach((nested) => nested.remove());
  return inlineRuns(clone);
}

function elementIsTableOfContents(element: HTMLElement) {
  return element.classList.contains("ficct-toc");
}

function elementIsCoverPage(element: HTMLElement) {
  return element.getAttribute("data-cover-page") !== null || element.classList.contains("ficct-cover-page");
}

function coverPageToDocx(element: HTMLElement, options: DocxExportOptions): Paragraph[] {
  return Array.from(element.children)
    .filter((child): child is HTMLElement => child instanceof HTMLElement)
    .map((child) => blockToParagraph(child, options));
}

function elementIsWordShape(element: HTMLElement) {
  return element.getAttribute("data-type") === "word-shape";
}

function wordShapeToDocx(element: HTMLElement): Paragraph {
  const kind = readWordShapeKind(element);
  const text = element.getAttribute("data-shape-text") || element.textContent || "Forma";
  return new Paragraph({
    children: [
      new Textbox({
        style: {
          width: kind === "arrow" ? "3in" : "2.4in",
          height: kind === "callout" ? "1.1in" : "0.75in",
          wrapStyle: "square",
          position: "relative",
          marginTop: "0.08in",
          marginBottom: "0.08in",
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: wordShapeLabel(kind, text), bold: true })],
          }),
        ],
      }),
    ],
  });
}

function readWordShapeKind(element: HTMLElement): WordShapeKind {
  const kind = element.getAttribute("data-shape-kind");
  if (kind === "oval" || kind === "arrow" || kind === "callout") return kind;
  return "rectangle";
}

function wordShapeLabel(kind: WordShapeKind, text: string) {
  if (kind === "arrow") return `→ ${text}`;
  if (kind === "callout") return `Nota: ${text}`;
  return text;
}

function readSectionBreakKind(element: HTMLElement): SectionBreakKind {
  return element.getAttribute("data-section-break") === "continuous" ? "continuous" : "nextPage";
}

export function sectionBreakKindToDocx(kind: SectionBreakKind) {
  return kind === "continuous" ? SectionType.CONTINUOUS : SectionType.NEXT_PAGE;
}

function elementIsCaption(element: HTMLElement) {
  return element.classList.contains("ficct-caption") || Boolean(element.querySelector("[data-caption-seq]"));
}

function elementIsTableOfFigures(element: HTMLElement) {
  return element.classList.contains("ficct-table-of-figures");
}

function captionToDocx(element: HTMLElement, options: DocxExportOptions): Paragraph {
  const kind = readCaptionKind(element);
  const text = element.textContent?.replace(/^(\s*)(Figura|Tabla|Ecuacion)\s*:?\s*/i, "").trim() || "";
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: DOCX_LINE_SPACING[options.defaultLineHeight], before: 80, after: 160 },
    children: [
      new TextRun({ text: `${kind} `, italics: true }),
      new SimpleField(`SEQ ${captionSequenceName(kind)} \\* ARABIC`),
      new TextRun({ text: text ? `: ${text}` : "", italics: true }),
    ],
  });
}

function tableOfFiguresToDocx(element: HTMLElement): Paragraph {
  const kind = readCaptionKind(element);
  return new Paragraph({
    children: [new SimpleField(`TOC \\h \\z \\c "${captionSequenceName(kind)}"`)],
  });
}

function wordFieldInstruction(field: WordFieldType) {
  if (field === "TIME") return "TIME \\@ \"HH:mm\"";
  if (field === "NUMPAGES") return "NUMPAGES";
  if (field === "AUTHOR") return "AUTHOR";
  if (field === "TITLE") return "TITLE";
  if (field === "SUBJECT") return "SUBJECT";
  if (field === "FILENAME") return "FILENAME";
  if (field === "MERGE_NOMBRE") return "MERGEFIELD Nombre \\* MERGEFORMAT";
  if (field === "MERGE_APELLIDO") return "MERGEFIELD Apellido \\* MERGEFORMAT";
  if (field === "MERGE_CORREO") return "MERGEFIELD Correo \\* MERGEFORMAT";
  if (field === "MERGE_GRUPO") return "MERGEFIELD Grupo \\* MERGEFORMAT";
  if (field === "MERGE_TEMA") return "MERGEFIELD Tema \\* MERGEFORMAT";
  if (field === "MERGE_DOCENTE") return "MERGEFIELD Docente \\* MERGEFORMAT";
  return "DATE \\@ \"dd/MM/yyyy\"";
}

function readCaptionKind(element: HTMLElement): CaptionKind {
  const raw = element.getAttribute("data-caption-kind") || element.querySelector("[data-caption-seq]")?.getAttribute("data-caption-seq") || "Figura";
  if (raw === "Tabla" || raw === "Ecuacion") return raw;
  return "Figura";
}

function captionSequenceName(kind: CaptionKind) {
  return kind === "Ecuacion" ? "Equation" : kind;
}

function inlineRuns(element: Element): DocxInlineChild[] {
  const runs: DocxInlineChild[] = [];
  const walk = (node: Node, inherited: {
    bold?: boolean;
    italics?: boolean;
    underline?: { type: "single" };
    strike?: boolean;
    subScript?: boolean;
    superScript?: boolean;
    color?: string;
    highlight?: "yellow";
    font?: string;
    size?: number;
  } = {}) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text) {
        text.split("\t").forEach((part, index) => {
          if (index > 0) runs.push(new Tab());
          if (part) runs.push(new TextRun({ text: part, ...inherited }));
        });
      }
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "br") {
      runs.push(new TextRun({ break: 1 }));
      return;
    }
    if (node.getAttribute("data-type") === "word-field") {
      const field = normalizeWordField(node.getAttribute("data-field-code"));
      runs.push(new SimpleField(wordFieldInstruction(field), node.textContent || node.getAttribute("data-field-label") || field));
      return;
    }
    if (node.getAttribute("data-type") === "checkbox") {
      runs.push(new CheckBox({
        checked: node.getAttribute("data-checkbox-checked") === "true",
        alias: node.getAttribute("data-checkbox-label") || "Casilla",
      }));
      return;
    }
    const equation = node.getAttribute("data-equation");
    if (equation) {
      runs.push(new SimpleField(`EQ ${equation}`, node.textContent || equation));
      return;
    }
    const bookmarkId = node.getAttribute("data-bookmark-id");
    if (bookmarkId) {
      const text = node.textContent || node.getAttribute("data-bookmark-label") || bookmarkId;
      runs.push(new Bookmark({
        id: sanitizeBookmarkId(bookmarkId),
        children: [new TextRun({ text, ...inherited })],
      }));
      return;
    }
    const crossRefTarget = node.getAttribute("data-cross-ref-target");
    if (crossRefTarget) {
      const target = sanitizeBookmarkId(crossRefTarget);
      const cachedValue = node.textContent || target;
      runs.push(node.getAttribute("data-cross-ref-kind") === "pagina"
        ? new PageReference(target, { hyperlink: true })
        : new SimpleField(`REF ${target} \\h`, cachedValue));
      return;
    }
    const suggestionId = node.getAttribute("data-suggestion-id");
    if (suggestionId) {
      const text = node.textContent || "";
      if (text) {
        const kind = node.getAttribute("data-suggestion-kind") || "insert";
        const metadata = {
          id: stableNumericId(suggestionId),
          author: "Revision",
          date: new Date().toISOString(),
        };
        runs.push(kind === "delete"
          ? new DeletedTextRun({ ...metadata, text, ...inherited })
          : new InsertedTextRun({ ...metadata, text, ...inherited }));
      }
      return;
    }
    const commentId = node.getAttribute("data-comment-id");
    if (commentId) {
      const id = stableNumericId(commentId);
      runs.push(new CommentRangeStart(id));
      node.childNodes.forEach((child) => walk(child, inherited));
      runs.push(new CommentRangeEnd(id));
      runs.push(new CommentReference(id));
      return;
    }
    if (tag === "sup" && node.dataset.footnoteLabel) {
      const footnoteId = Number(node.dataset.footnoteLabel);
      if (Number.isFinite(footnoteId)) runs.push(new FootnoteReferenceRun(footnoteId));
      return;
    }
    if (tag === "sup" && node.dataset.endnoteLabel) {
      const endnoteId = Number(node.dataset.endnoteLabel);
      if (Number.isFinite(endnoteId)) runs.push(new EndnoteReferenceRun(endnoteId) as unknown as DocxInlineChild);
      return;
    }
    if (tag === "img") {
      const image = imageRunFromElement(node);
      if (image) runs.push(image);
      return;
    }
    if (tag === "a") {
      const href = node.getAttribute("href");
      if (href) {
        runs.push(new ExternalHyperlink({
          link: href,
          children: hyperlinkChildrenFromElement(node),
        }));
        return;
      }
    }
    const style = node.style;
    const next = {
      bold: inherited.bold || tag === "strong" || tag === "b" || node.style.fontWeight === "700",
      italics: inherited.italics || tag === "em" || tag === "i",
      underline: inherited.underline || (tag === "u" ? { type: "single" as const } : undefined),
      strike: inherited.strike || tag === "s" || tag === "strike" || style.textDecorationLine.includes("line-through"),
      subScript: inherited.subScript || tag === "sub",
      superScript: inherited.superScript || tag === "sup",
      color: cssColorToHex(style.color) || inherited.color,
      highlight: style.backgroundColor && style.backgroundColor !== "transparent" ? "yellow" as const : inherited.highlight,
      font: style.fontFamily?.replaceAll("\"", "").split(",")[0] || inherited.font,
      size: pointSizeToHalfPoints(style.fontSize) || inherited.size,
    };
    node.childNodes.forEach((child) => walk(child, next));
  };
  element.childNodes.forEach((child) => walk(child));
  return runs.length ? runs : [new TextRun("")];
}

function hyperlinkChildrenFromElement(element: Element) {
  const children = inlineRuns(element).flatMap((run) => {
    if (
      run instanceof TextRun ||
      run instanceof ImageRun ||
      run instanceof SimpleField ||
      run instanceof CheckBox ||
      run instanceof InsertedTextRun ||
      run instanceof DeletedTextRun
    ) {
      return [run];
    }
    if (run instanceof Tab) return [new TextRun("\t")];
    return [];
  });
  return children.length ? children : [new TextRun(element.textContent || "")];
}

function imageRunFromElement(element: HTMLElement): ImageRun | null {
  const src = element.getAttribute("src");
  if (!src || !src.startsWith("data:image/")) return null;
  const match = src.match(/^data:image\/(png|jpeg|jpg|gif|bmp);base64,/i);
  if (!match) return null;
  const type = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  if (!["png", "jpg", "gif", "bmp"].includes(type)) return null;
  const width = readImageWidth(element);
  const height = readImageHeight(element, width);
  const align = readImageAlignValue(element);
  const wrap = element.getAttribute("data-image-wrap");
  return new ImageRun({
    type: type as "png" | "jpg" | "gif" | "bmp",
    data: src,
    transformation: {
      width,
      height,
    },
    floating: wrap === "square" ? {
      horizontalPosition: {
        relative: HorizontalPositionRelativeFrom.MARGIN,
        align: align === "right" ? HorizontalPositionAlign.RIGHT : align === "center" ? HorizontalPositionAlign.CENTER : HorizontalPositionAlign.LEFT,
      },
      verticalPosition: {
        relative: VerticalPositionRelativeFrom.PARAGRAPH,
        align: VerticalPositionAlign.TOP,
      },
      wrap: {
        type: TextWrappingType.SQUARE,
        side: align === "left" ? TextWrappingSide.RIGHT : align === "right" ? TextWrappingSide.LEFT : TextWrappingSide.BOTH_SIDES,
      },
      margins: { top: 0, bottom: 0, left: 91440, right: 91440 },
    } : undefined,
    altText: {
      title: element.getAttribute("title") || element.getAttribute("alt") || "Imagen",
      description: element.getAttribute("alt") || "Imagen insertada",
      name: element.getAttribute("alt") || "Imagen",
    },
  });
}

function readImageAlignValue(element: HTMLElement): ImageAlignment {
  const align = element.getAttribute("data-image-align");
  if (align === "left" || align === "right") return align;
  return "center";
}

function readImageAlignment(element: HTMLElement) {
  const align = readImageAlignValue(element);
  if (align === "left") return AlignmentType.LEFT;
  if (align === "right") return AlignmentType.RIGHT;
  return AlignmentType.CENTER;
}

function readImageWidth(element: HTMLElement) {
  const widthAttr = element.getAttribute("width") || element.style.width;
  if (!widthAttr) return 520;
  if (widthAttr.endsWith("%")) {
    const percent = Number(widthAttr.replace("%", ""));
    return Math.max(120, Math.min(620, Math.round(620 * (percent / 100))));
  }
  const numeric = Number(widthAttr.replace("px", ""));
  return Number.isFinite(numeric) ? Math.max(120, Math.min(620, numeric)) : 520;
}

function readImageHeight(element: HTMLElement, fallbackWidth: number) {
  const heightAttr = element.getAttribute("height") || element.style.height;
  if (!heightAttr) {
    const aspectRatio = Number(element.getAttribute("data-image-aspect-ratio"));
    if (Number.isFinite(aspectRatio) && aspectRatio > 0) {
      return Math.max(80, Math.min(840, Math.round(fallbackWidth / aspectRatio)));
    }
    return Math.round(fallbackWidth * 0.62);
  }
  const numeric = Number(heightAttr.replace("px", ""));
  return Number.isFinite(numeric) ? Math.max(80, Math.min(840, numeric)) : Math.round(fallbackWidth * 0.62);
}

function readIndentLevel(element: HTMLElement) {
  const explicit = Number(element.getAttribute("data-indent-level") || 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.min(8, explicit);
  const marginLeft = element.style.marginLeft;
  if (!marginLeft) return 0;
  if (marginLeft.endsWith("in")) return Math.min(8, Math.round(Number(marginLeft.replace("in", "")) / 0.28));
  if (marginLeft.endsWith("px")) return Math.min(8, Math.round(Number(marginLeft.replace("px", "")) / 27));
  return 0;
}

function readLineHeight(element: HTMLElement): LineHeight | undefined {
  const value = element.style.lineHeight;
  return value === "1" || value === "1.15" || value === "1.5" || value === "2" ? value : undefined;
}

function readParagraphSpacing(element: HTMLElement) {
  const before = readSpacingPoints(element.getAttribute("data-spacing-before") || element.style.marginTop);
  const after = readSpacingPoints(element.getAttribute("data-spacing-after") || element.style.marginBottom);
  return {
    before: before !== undefined ? before * 20 : undefined,
    after: after !== undefined ? after * 20 : undefined,
  };
}

function paragraphTabStopsToDocx(element: HTMLElement) {
  const stops = parseParagraphTabStops(element.getAttribute("data-tab-stops"));
  if (!stops.length) return undefined;
  return stops.map((stop) => ({
    type: tabStopTypeToDocx(stop.type),
    position: inchesToTwips(stop.position),
    leader: tabLeaderToDocx(stop.leader),
  }));
}

export function parseParagraphTabStops(value?: string | null): ParagraphTabStop[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        position: Number(item.position),
        type: isTabStopKind(item.type) ? item.type : "left",
        leader: isTabLeaderKind(item.leader) ? item.leader : "none",
      }))
      .filter((item) => Number.isFinite(item.position) && item.position > 0)
      .slice(0, 16);
  } catch {
    return [];
  }
}

function isTabStopKind(value: unknown): value is TabStopKind {
  return value === "left" || value === "center" || value === "right" || value === "decimal";
}

function isTabLeaderKind(value: unknown): value is TabLeaderKind {
  return value === "none" || value === "dot" || value === "hyphen" || value === "underscore";
}

function tabStopTypeToDocx(value: TabStopKind) {
  if (value === "center") return TabStopType.CENTER;
  if (value === "right") return TabStopType.RIGHT;
  if (value === "decimal") return TabStopType.DECIMAL;
  return TabStopType.LEFT;
}

function tabLeaderToDocx(value: TabLeaderKind) {
  if (value === "dot") return LeaderType.DOT;
  if (value === "hyphen") return LeaderType.HYPHEN;
  if (value === "underscore") return LeaderType.UNDERSCORE;
  return LeaderType.NONE;
}

function paragraphShadingToDocx(element: HTMLElement) {
  const color = cssColorToHex(element.getAttribute("data-paragraph-shading") || element.style.backgroundColor);
  return color ? { fill: color } : undefined;
}

function paragraphBorderToDocx(element: HTMLElement) {
  if (element.getAttribute("data-paragraph-border") !== "true") return undefined;
  return {
    top: { style: BorderStyle.SINGLE, size: 6, color: "9CA3AF" },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: "9CA3AF" },
    left: { style: BorderStyle.SINGLE, size: 6, color: "9CA3AF" },
    right: { style: BorderStyle.SINGLE, size: 6, color: "9CA3AF" },
  };
}

function readSpacingPoints(value?: string | null) {
  if (!value) return undefined;
  const numeric = Number(value.replace("pt", "").replace("px", ""));
  if (!Number.isFinite(numeric)) return undefined;
  return value.endsWith("px") ? Math.round(numeric * 0.75) : Math.round(numeric);
}

function cssColorToHex(value?: string) {
  if (!value) return undefined;
  if (value.startsWith("#")) return value.replace("#", "").toUpperCase();
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return undefined;
  return [match[1], match[2], match[3]]
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function pointSizeToHalfPoints(value?: string) {
  if (!value) return undefined;
  const numeric = Number(value.replace("pt", "").replace("px", ""));
  if (!Number.isFinite(numeric)) return undefined;
  return value.endsWith("px") ? Math.round(numeric * 1.5) : Math.round(numeric * 2);
}

function tableToDocx(table: HTMLElement, options: DocxExportOptions): DocxTable {
  const style = options.tableStyle;
  const rows = Array.from(table.querySelectorAll("tr")).map((row, rowIndex) =>
    new DocxTableRow({
      tableHeader: row.getAttribute("data-repeat-header") === "true" || (rowIndex === 0 && Boolean(row.querySelector("th"))),
      cantSplit: row.getAttribute("data-keep-row") === "true",
      children: Array.from(row.children).map((cell) =>
        new DocxTableCell({
          columnSpan: readTableCellSpan(cell, "colspan"),
          rowSpan: readTableCellSpan(cell, "rowspan"),
          width: readTableCellWidth(cell),
          shading: tableCellCustomShading(cell) || tableCellShading(style, rowIndex, cell.tagName.toLowerCase() === "th"),
          borders: tableCellBorders(style),
          children: tableCellChildrenToDocx(cell, options),
        })
      ),
    })
  );

  return new DocxTable({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableCellBorders(style),
    rows: rows.length ? rows : [new DocxTableRow({ children: [new DocxTableCell({ children: [new Paragraph("")] })] })],
  });
}

function readTableCellSpan(cell: Element, attribute: "colspan" | "rowspan") {
  if (!(cell instanceof HTMLElement)) return undefined;
  const value = Number(cell.getAttribute(attribute));
  return Number.isFinite(value) && value > 1 ? Math.min(63, Math.floor(value)) : undefined;
}

function tableCellChildrenToDocx(cell: Element, options: DocxExportOptions): Paragraph[] {
  const blockChildren = Array.from(cell.children).filter((child): child is HTMLElement =>
    child instanceof HTMLElement && isTableCellBlockElement(child)
  );
  if (!blockChildren.length) {
    return [new Paragraph({ children: inlineRuns(cell) })];
  }
  const paragraphs = blockChildren.flatMap((child) => {
    const tag = child.tagName.toLowerCase();
    if (tag === "ul" || tag === "ol") {
      return listToDocx(child, tag === "ol" ? "ordered" : "bullet", 0, options);
    }
    return [blockToParagraph(child, options)];
  });
  return paragraphs.length ? paragraphs : [new Paragraph("")];
}

function isTableCellBlockElement(element: HTMLElement) {
  return ["p", "h1", "h2", "h3", "blockquote", "ul", "ol", "div"].includes(element.tagName.toLowerCase());
}

function readTableCellWidth(cell: Element) {
  if (!(cell instanceof HTMLElement)) return undefined;
  const colWidths = parseTableCellColumnWidths(cell.getAttribute("data-colwidth") || cell.getAttribute("colwidth"));
  if (colWidths.length) {
    const widthPx = colWidths.reduce((total, value) => total + value, 0);
    return { size: pixelsToTwips(widthPx), type: WidthType.DXA };
  }
  const width = cell.getAttribute("width") || cell.style.width;
  const widthTwips = cssLengthToTwips(width);
  return widthTwips ? { size: widthTwips, type: WidthType.DXA } : undefined;
}

function parseTableCellColumnWidths(value?: string | null) {
  if (!value) return [];
  return value
    .replace(/^\[|\]$/g, "")
    .split(/[,\s]+/)
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part) && part > 0)
    .slice(0, 63);
}

function cssLengthToTwips(value?: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim();
  const numeric = Number(trimmed.replace(/[a-z%]+$/i, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  if (trimmed.endsWith("in")) return inchesToTwips(numeric);
  if (trimmed.endsWith("cm")) return Math.round((numeric / 2.54) * 1440);
  if (trimmed.endsWith("mm")) return Math.round((numeric / 25.4) * 1440);
  if (trimmed.endsWith("pt")) return Math.round(numeric * 20);
  if (trimmed.endsWith("px")) return pixelsToTwips(numeric);
  if (/^\d+(\.\d+)?$/.test(trimmed)) return pixelsToTwips(numeric);
  return undefined;
}

function pixelsToTwips(value: number) {
  return Math.round(value * 15);
}

function tableCellCustomShading(cell: Element) {
  if (!(cell instanceof HTMLElement)) return undefined;
  const color = cssColorToHex(cell.getAttribute("data-cell-color") || cell.style.backgroundColor);
  return color ? { fill: color } : undefined;
}

function tableCellBorders(style: TableStyle) {
  if (style === "plain") {
    return {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "D1D5DB" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "E5E7EB" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    };
  }
  const color = style === "blue" ? "8EAADB" : "D1D5DB";
  return {
    top: { style: BorderStyle.SINGLE, size: 4, color },
    bottom: { style: BorderStyle.SINGLE, size: 4, color },
    left: { style: BorderStyle.SINGLE, size: 4, color },
    right: { style: BorderStyle.SINGLE, size: 4, color },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color },
  };
}

function tableCellShading(style: TableStyle, rowIndex: number, isHeader: boolean) {
  if (style === "blue" && isHeader) return { fill: "2F5597" };
  if (style === "blue" && rowIndex % 2 === 1) return { fill: "D9EAF7" };
  if (style === "banded" && rowIndex % 2 === 1) return { fill: "F3F4F6" };
  if (style === "grid" && isHeader) return { fill: "E5E7EB" };
  return undefined;
}

function readAlignment(element: HTMLElement) {
  const align = element.style.textAlign;
  if (align === "center") return AlignmentType.CENTER;
  if (align === "right") return AlignmentType.RIGHT;
  if (align === "justify") return AlignmentType.JUSTIFIED;
  return AlignmentType.LEFT;
}
