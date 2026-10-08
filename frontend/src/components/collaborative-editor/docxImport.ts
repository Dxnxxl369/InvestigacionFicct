import mammoth from "mammoth";
import type { FootnoteItem, ReviewComment } from "./editorTypes";

export type ImportedDocxContent = {
  html: string;
  title: string;
  footnotes: FootnoteItem[];
  endnotes: FootnoteItem[];
  comments: ReviewComment[];
};

export async function importDocxFile(file: File): Promise<ImportedDocxContent> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "br[type='page'] => div.ficct-page-break:fresh",
        "br[type='column'] => div.ficct-column-break:fresh",
      ],
      convertImage: mammoth.images.imgElement((image) =>
        image.read("base64").then((imageBuffer) => ({
          src: `data:${image.contentType};base64,${imageBuffer}`,
        }))
      ),
    }
  );
  const normalized = normalizeImportedDocxHtml(result.value || "<p></p>");
  return {
    ...normalized,
    title: file.name.replace(/\.docx$/i, ""),
  };
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

function normalizeImportedDocxHtml(html: string): Omit<ImportedDocxContent, "title"> {
  if (typeof DOMParser === "undefined") {
    return { html, footnotes: [], endnotes: [], comments: [] };
  }

  const parsed = new DOMParser().parseFromString(`<main>${html}</main>`, "text/html");
  const root = parsed.querySelector("main");
  if (!root) return { html, footnotes: [], endnotes: [], comments: [] };

  const footnotes = extractImportedNotes(root, "footnote");
  const endnotes = extractImportedNotes(root, "endnote");
  const comments = extractImportedComments(root);
  normalizeImportedCheckboxes(root);

  return {
    html: root.innerHTML || "<p></p>",
    footnotes,
    endnotes,
    comments,
  };
}

function normalizeImportedCheckboxes(root: Element) {
  Array.from(root.querySelectorAll("input[type='checkbox']")).forEach((input) => {
    const checked = input.hasAttribute("checked") || input.getAttribute("checked") === "checked";
    const replacement = input.ownerDocument.createElement("span");
    replacement.setAttribute("data-type", "checkbox");
    replacement.setAttribute("data-checkbox-checked", checked ? "true" : "false");
    replacement.setAttribute("data-checkbox-label", "Casilla importada");
    replacement.textContent = checked ? "☑" : "☐";
    input.replaceWith(replacement);
  });
}

function extractImportedNotes(root: Element, kind: "footnote" | "endnote"): FootnoteItem[] {
  const notes: FootnoteItem[] = [];
  const lists = Array.from(root.querySelectorAll("ol"));

  lists.forEach((list) => {
    const items = Array.from(list.children).filter((item): item is HTMLElement =>
      item instanceof HTMLElement && item.id.startsWith(`${kind}-`)
    );
    if (!items.length) return;

    items.forEach((item) => {
      const noteKey = item.id.slice(`${kind}-`.length);
      const label = notes.length + 1;
      const id = `${kind === "footnote" ? "fn" : "en"}-import-${safeDomId(noteKey) || label}`;
      const text = noteTextFromItem(item, `${kind}-ref-${noteKey}`) || "Nota importada";

      notes.push({ id, label, text });
      replaceNoteReference(root, kind, noteKey, id, label);
    });

    list.remove();
  });

  return notes;
}

function replaceNoteReference(root: Element, kind: "footnote" | "endnote", noteKey: string, id: string, label: number) {
  const refId = `${kind}-ref-${noteKey}`;
  const anchor = findAnchorByHref(root, `#${kind}-${noteKey}`) || findElementById(root, refId);
  if (!anchor) return;

  const doc = anchor.ownerDocument;
  const replacement = doc.createElement("sup");
  replacement.setAttribute(`data-${kind}-id`, id);
  replacement.setAttribute(`data-${kind}-label`, String(label));
  replacement.textContent = kind === "endnote" ? `[e${label}]` : `[${label}]`;

  const wrapper = anchor.closest("sup") || anchor;
  wrapper.replaceWith(replacement);
}

function extractImportedComments(root: Element): ReviewComment[] {
  const comments: ReviewComment[] = [];
  const definitionLists = Array.from(root.querySelectorAll("dl"));

  definitionLists.forEach((list) => {
    const children = Array.from(list.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
    let usedList = false;

    children.forEach((child, index) => {
      if (child.tagName.toLowerCase() !== "dt" || !child.id.startsWith("comment-")) return;
      const body = children[index + 1];
      if (!body || body.tagName.toLowerCase() !== "dd") return;

      const commentKey = child.id.slice("comment-".length);
      const label = cleanText(child.textContent || "").replace(/^Comment\s*/i, "") || `[${comments.length + 1}]`;
      const id = `c-import-${safeDomId(commentKey) || comments.length + 1}`;
      const text = noteTextFromItem(body, `comment-ref-${commentKey}`) || "Comentario importado";
      const author = importedCommentAuthor(label);

      comments.push({
        id,
        text,
        author,
        createdAt: new Date().toISOString(),
      });
      replaceCommentReference(root, commentKey, id, label);
      usedList = true;
    });

    if (usedList) list.remove();
  });

  return comments;
}

function replaceCommentReference(root: Element, commentKey: string, id: string, label: string) {
  const anchor = findAnchorByHref(root, `#comment-${commentKey}`) || findElementById(root, `comment-ref-${commentKey}`);
  if (!anchor) return;

  const replacement = anchor.ownerDocument.createElement("span");
  replacement.setAttribute("data-comment-id", id);
  replacement.textContent = label;
  anchor.replaceWith(replacement);
}

function noteTextFromItem(item: Element, backReferenceId: string) {
  const clone = item.cloneNode(true) as HTMLElement;
  Array.from(clone.querySelectorAll("a")).forEach((anchor) => {
    if (anchor.getAttribute("href") === `#${backReferenceId}` || anchor.id === backReferenceId) anchor.remove();
  });
  return cleanText(clone.textContent || "").replace(/\s*up\s*$/i, "").trim();
}

function findElementById(root: Element, id: string) {
  return Array.from(root.querySelectorAll("[id]")).find((element) => element.id === id) || null;
}

function findAnchorByHref(root: Element, href: string) {
  return Array.from(root.querySelectorAll("a[href]")).find((element) => element.getAttribute("href") === href) || null;
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function importedCommentAuthor(label: string) {
  const match = label.match(/\[([A-Za-z]+)\d*\]/);
  return match?.[1] || "Importado";
}

function safeDomId(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
