import { Extension, Mark as TiptapMark, Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { BackgroundColor, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table as TiptapTable } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import type { RemoteCursor } from "./editorTypes";

export const remoteCursorPluginKey = new PluginKey<RemoteCursor[]>("ficctRemoteCursors");

export const PageBreakNode = TiptapNode.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  parseHTML() {
    return [{ tag: "div[data-type='page-break']" }, { tag: "div.ficct-page-break" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "page-break", class: "ficct-page-break" })];
  },
});

export const ColumnBreakNode = TiptapNode.create({
  name: "columnBreak",
  group: "block",
  atom: true,
  parseHTML() {
    return [{ tag: "div[data-type='column-break']" }, { tag: "div.ficct-column-break" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "column-break", class: "ficct-column-break" })];
  },
});

export const SectionBreakNode = TiptapNode.create({
  name: "sectionBreak",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      kind: {
        default: "nextPage",
        parseHTML: (element) => element.getAttribute("data-section-break") || "nextPage",
        renderHTML: (attributes) => ({ "data-section-break": attributes.kind || "nextPage" }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-type='section-break']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "section-break", class: "ficct-section-break" })];
  },
});

export const CustomTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      repeatHeader: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-repeat-header"),
        renderHTML: (attributes) => attributes.repeatHeader ? { "data-repeat-header": "true" } : {},
      },
      keepTogether: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-keep-row"),
        renderHTML: (attributes) => attributes.keepTogether ? { "data-keep-row": "true" } : {},
      },
    };
  },
});

export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colwidth: {
        default: null,
        parseHTML: (element) => normalizeTableColumnWidthAttribute(element.getAttribute("data-colwidth") || element.getAttribute("colwidth")),
        renderHTML: (attributes) => attributes.colwidth ? { "data-colwidth": String(attributes.colwidth) } : {},
      },
      cellColor: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-cell-color") || element.style.backgroundColor || null,
        renderHTML: (attributes) => attributes.cellColor
          ? { "data-cell-color": attributes.cellColor, style: `background-color: ${attributes.cellColor}` }
          : {},
      },
    };
  },
});

export const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colwidth: {
        default: null,
        parseHTML: (element) => normalizeTableColumnWidthAttribute(element.getAttribute("data-colwidth") || element.getAttribute("colwidth")),
        renderHTML: (attributes) => attributes.colwidth ? { "data-colwidth": String(attributes.colwidth) } : {},
      },
      cellColor: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-cell-color") || element.style.backgroundColor || null,
        renderHTML: (attributes) => attributes.cellColor
          ? { "data-cell-color": attributes.cellColor, style: `background-color: ${attributes.cellColor}` }
          : {},
      },
    };
  },
});

function normalizeTableColumnWidthAttribute(value?: string | null) {
  if (!value) return null;
  const widths = value
    .replace(/^\[|\]$/g, "")
    .split(/[,\s]+/)
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part) && part > 0)
    .slice(0, 63);
  return widths.length ? widths.join(",") : null;
}

export const CoverPageNode = TiptapNode.create({
  name: "coverPage",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      template: {
        default: "academica",
        parseHTML: (element) => element.getAttribute("data-cover-page") || "academica",
        renderHTML: (attributes) => ({ "data-cover-page": attributes.template }),
      },
      class: {
        default: "ficct-cover-page ficct-cover-academic",
        parseHTML: (element) => element.getAttribute("class") || "ficct-cover-page ficct-cover-academic",
        renderHTML: (attributes) => ({ class: attributes.class }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-cover-page]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },
});

export const TextBoxNode = TiptapNode.create({
  name: "textBox",
  group: "block",
  content: "inline*",
  defining: true,
  parseHTML() {
    return [{ tag: "div[data-type='text-box']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "text-box", class: "ficct-text-box" }), 0];
  },
});

export const WordShapeNode = TiptapNode.create({
  name: "wordShape",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      kind: {
        default: "rectangle",
        parseHTML: (element) => element.getAttribute("data-shape-kind") || "rectangle",
        renderHTML: (attributes) => ({ "data-shape-kind": attributes.kind || "rectangle" }),
      },
      text: {
        default: "Forma",
        parseHTML: (element) => element.getAttribute("data-shape-text") || element.textContent || "Forma",
        renderHTML: (attributes) => ({ "data-shape-text": attributes.text || "Forma" }),
      },
      fill: {
        default: "#dbeafe",
        parseHTML: (element) => element.getAttribute("data-shape-fill") || "#dbeafe",
        renderHTML: (attributes) => ({ "data-shape-fill": attributes.fill || "#dbeafe" }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-type='word-shape']" }];
  },
  renderHTML({ HTMLAttributes }) {
    const kind = HTMLAttributes["data-shape-kind"] || "rectangle";
    const text = HTMLAttributes["data-shape-text"] || "Forma";
    const fill = HTMLAttributes["data-shape-fill"] || "#dbeafe";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "word-shape",
        class: `ficct-word-shape ficct-word-shape-${kind}`,
        style: `background-color: ${fill}`,
        contenteditable: "false",
      }),
      text,
    ];
  },
});

export const CheckBoxNode = TiptapNode.create({
  name: "checkBox",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      checked: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-checkbox-checked") === "true",
        renderHTML: (attributes) => ({ "data-checkbox-checked": attributes.checked ? "true" : "false" }),
      },
      label: {
        default: "Casilla",
        parseHTML: (element) => element.getAttribute("data-checkbox-label") || "Casilla",
        renderHTML: (attributes) => ({ "data-checkbox-label": attributes.label || "Casilla" }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-type='checkbox']" }];
  },
  renderHTML({ HTMLAttributes }) {
    const checked = HTMLAttributes["data-checkbox-checked"] === "true";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "checkbox",
        class: "ficct-checkbox-node",
        contenteditable: "false",
      }),
      checked ? "☑" : "☐",
    ];
  },
});

export const WordFieldNode = TiptapNode.create({
  name: "wordField",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      field: {
        default: "DATE",
        parseHTML: (element) => element.getAttribute("data-field-code") || "DATE",
        renderHTML: (attributes) => ({ "data-field-code": attributes.field || "DATE" }),
      },
      label: {
        default: "Campo",
        parseHTML: (element) => element.getAttribute("data-field-label") || "Campo",
        renderHTML: (attributes) => ({ "data-field-label": attributes.label || "Campo" }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-type='word-field']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "word-field",
        class: "ficct-word-field-node",
        contenteditable: "false",
      }),
      HTMLAttributes["data-field-label"] || "Campo",
    ];
  },
});

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "50%",
        parseHTML: (element) => element.getAttribute("width") || element.style.width || "50%",
        renderHTML: (attributes) => ({
          width: attributes.width,
          style: [
            attributes.width ? `width: ${attributes.width}` : "",
            attributes.height ? `height: ${attributes.height}` : "",
          ].filter(Boolean).join("; ") || undefined,
        }),
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height") || element.style.height || null,
        renderHTML: (attributes) => attributes.height ? { height: attributes.height } : {},
      },
      aspectRatio: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-image-aspect-ratio") || null,
        renderHTML: (attributes) => attributes.aspectRatio ? { "data-image-aspect-ratio": attributes.aspectRatio } : {},
      },
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-image-align") || "center",
        renderHTML: (attributes) => ({ "data-image-align": attributes.align || "center" }),
      },
      wrap: {
        default: "inline",
        parseHTML: (element) => element.getAttribute("data-image-wrap") || "inline",
        renderHTML: (attributes) => ({ "data-image-wrap": attributes.wrap || "inline" }),
      },
    };
  },
});

export const CommentMark = TiptapMark.create({
  name: "commentMark",
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: (attributes) => attributes.id ? { "data-comment-id": attributes.id } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "ficct-comment-mark" }), 0];
  },
});

export const SuggestionMark = TiptapMark.create({
  name: "suggestionMark",
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-suggestion-id"),
        renderHTML: (attributes) => attributes.id ? { "data-suggestion-id": attributes.id } : {},
      },
      kind: {
        default: "insert",
        parseHTML: (element) => element.getAttribute("data-suggestion-kind") || "insert",
        renderHTML: (attributes) => ({ "data-suggestion-kind": attributes.kind || "insert" }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-suggestion-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: `ficct-suggestion-mark ficct-suggestion-${HTMLAttributes["data-suggestion-kind"] || "insert"}` }), 0];
  },
});

export const BookmarkMark = TiptapMark.create({
  name: "bookmarkMark",
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-bookmark-id"),
        renderHTML: (attributes) => attributes.id ? { "data-bookmark-id": attributes.id } : {},
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-bookmark-label"),
        renderHTML: (attributes) => attributes.label ? { "data-bookmark-label": attributes.label } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-bookmark-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "ficct-bookmark-mark" }), 0];
  },
});

export const CrossReferenceMark = TiptapMark.create({
  name: "crossReferenceMark",
  addAttributes() {
    return {
      target: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-cross-ref-target"),
        renderHTML: (attributes) => attributes.target ? { "data-cross-ref-target": attributes.target } : {},
      },
      kind: {
        default: "texto",
        parseHTML: (element) => element.getAttribute("data-cross-ref-kind") || "texto",
        renderHTML: (attributes) => ({ "data-cross-ref-kind": attributes.kind || "texto" }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-cross-ref-target]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "ficct-cross-reference" }), 0];
  },
});

export const EquationMark = TiptapMark.create({
  name: "equationMark",
  addAttributes() {
    return {
      value: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-equation"),
        renderHTML: (attributes) => attributes.value ? { "data-equation": attributes.value } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-equation]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "ficct-equation-mark" }), 0];
  },
});

export const ParagraphLayoutExtension = TiptapNode.create({
  name: "paragraphLayoutControls",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => attributes.lineHeight ? { style: `line-height: ${attributes.lineHeight}` } : {},
          },
          spacingBefore: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-spacing-before"),
            renderHTML: (attributes) => attributes.spacingBefore
              ? { "data-spacing-before": attributes.spacingBefore, style: `margin-top: ${attributes.spacingBefore}pt` }
              : {},
          },
          spacingAfter: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-spacing-after"),
            renderHTML: (attributes) => attributes.spacingAfter
              ? { "data-spacing-after": attributes.spacingAfter, style: `margin-bottom: ${attributes.spacingAfter}pt` }
              : {},
          },
          paragraphShading: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-paragraph-shading") || null,
            renderHTML: (attributes) => attributes.paragraphShading
              ? { "data-paragraph-shading": attributes.paragraphShading, style: `background-color: ${attributes.paragraphShading}` }
              : {},
          },
          paragraphBorder: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-paragraph-border"),
            renderHTML: (attributes) => attributes.paragraphBorder ? { "data-paragraph-border": "true" } : {},
          },
          indentLevel: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-indent-level"),
            renderHTML: (attributes) => {
              const level = Number(attributes.indentLevel || 0);
              return level > 0
                ? { "data-indent-level": String(level), style: `margin-left: ${level * 0.28}in` }
                : {};
            },
          },
          tabStops: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-tab-stops"),
            renderHTML: (attributes) => attributes.tabStops ? { "data-tab-stops": attributes.tabStops } : {},
          },
        },
      },
    ];
  },
});

export const RemoteCursorExtension = Extension.create({
  name: "remoteCursors",
  addProseMirrorPlugins() {
    return [
      new Plugin<RemoteCursor[]>({
        key: remoteCursorPluginKey,
        state: {
          init: () => [],
          apply: (transaction, previous) => transaction.getMeta(remoteCursorPluginKey) || previous,
        },
        props: {
          decorations(state) {
            const cursors = remoteCursorPluginKey.getState(state) || [];
            const decorations: Decoration[] = [];
            cursors.forEach((cursor) => {
              const from = Math.max(0, Math.min(cursor.from, state.doc.content.size));
              const to = Math.max(0, Math.min(cursor.to, state.doc.content.size));
              if (from < to) {
                decorations.push(Decoration.inline(from, to, {
                  class: "ficct-remote-selection",
                  style: `background-color: ${hexToRgba(cursor.color, 0.18)}`,
                }));
              }
              const cursorPosition = Math.max(0, Math.min(to || from, state.doc.content.size));
              decorations.push(Decoration.widget(cursorPosition, () => {
                const marker = document.createElement("span");
                marker.className = "ficct-remote-cursor";
                marker.style.borderColor = cursor.color;
                marker.style.setProperty("--cursor-color", cursor.color);
                const label = document.createElement("span");
                label.className = "ficct-remote-cursor-label";
                label.textContent = cursor.name;
                label.style.backgroundColor = cursor.color;
                marker.appendChild(label);
                return marker;
              }, { side: 1, key: `cursor-${cursor.sessionId}` }));
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

export function buildCollaborativeEditorExtensions() {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Underline,
    Superscript,
    Subscript,
    TextStyle,
    Color,
    BackgroundColor,
    FontFamily,
    FontSize,
    CustomImage.configure({ allowBase64: true, inline: false }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Link.configure({ openOnClick: false }),
    Placeholder.configure({ placeholder: "Redacta el documento colaborativo aqui..." }),
    TiptapTable.configure({ resizable: true }),
    CustomTableRow,
    CustomTableHeader,
    CustomTableCell,
    PageBreakNode,
    ColumnBreakNode,
    SectionBreakNode,
    CoverPageNode,
    TextBoxNode,
    WordShapeNode,
    CheckBoxNode,
    WordFieldNode,
    CommentMark,
    SuggestionMark,
    BookmarkMark,
    CrossReferenceMark,
    EquationMark,
    ParagraphLayoutExtension,
    RemoteCursorExtension,
  ];
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "2563eb";
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
