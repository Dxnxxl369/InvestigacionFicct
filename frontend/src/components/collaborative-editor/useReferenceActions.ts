import { useMemo, type Dispatch, type SetStateAction } from "react";
import type { Editor } from "@tiptap/core";
import {
  bibliographyEntries,
  formatInlineCitation,
  normalizeCitationDraft,
} from "./bibliography";
import { escapeHtml, sanitizeBookmarkId } from "./documentModel";
import type {
  BibliographyStyle,
  BookmarkTarget,
  CaptionKind,
  CitationItem,
  CrossReferenceKind,
  EditorSaveStatus,
  FootnoteItem,
} from "./editorTypes";

type UseReferenceActionsOptions = {
  editor: Editor | null;
  citations: CitationItem[];
  bibliographyStyle: BibliographyStyle;
  citationDraft: Omit<CitationItem, "id">;
  selectedCitationId: string;
  captionDraft: string;
  captionKind: CaptionKind;
  bookmarkName: string;
  bookmarkTargets: BookmarkTarget[];
  crossReferenceTarget: string;
  crossReferenceKind: CrossReferenceKind;
  linkUrl: string;
  footnotes: FootnoteItem[];
  footnoteDraft: string;
  endnotes: FootnoteItem[];
  endnoteDraft: string;
  setCitations: Dispatch<SetStateAction<CitationItem[]>>;
  setSelectedCitationId: Dispatch<SetStateAction<string>>;
  setCitationDraft: Dispatch<SetStateAction<Omit<CitationItem, "id">>>;
  setCaptionDraft: Dispatch<SetStateAction<string>>;
  setBookmarkName: Dispatch<SetStateAction<string>>;
  setCrossReferenceTarget: Dispatch<SetStateAction<string>>;
  setLinkUrl: Dispatch<SetStateAction<string>>;
  setFootnotes: Dispatch<SetStateAction<FootnoteItem[]>>;
  setFootnoteDraft: Dispatch<SetStateAction<string>>;
  setEndnotes: Dispatch<SetStateAction<FootnoteItem[]>>;
  setEndnoteDraft: Dispatch<SetStateAction<string>>;
  setStatus: (status: EditorSaveStatus) => void;
};

const EMPTY_CITATION_DRAFT: Omit<CitationItem, "id"> = {
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
};

export function useReferenceActions({
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
}: UseReferenceActionsOptions) {
  return useMemo(() => {
    const markDirty = () => setStatus("dirty");

    const insertCitation = () => {
      if (!editor) return;
      const citation = normalizeCitationDraft(citationDraft);
      if (!citation) return;
      const id = `cite-${Date.now()}`;
      const nextCitation = { id, ...citation };
      const citationIndex = citations.length;
      setCitations((value) => [...value, nextCitation]);
      setSelectedCitationId(id);
      editor.chain().focus().insertContent(`<span data-citation-id="${id}">${escapeHtml(formatInlineCitation(nextCitation, bibliographyStyle, citationIndex))}</span>`).run();
      setCitationDraft(EMPTY_CITATION_DRAFT);
      markDirty();
    };

    const insertExistingCitation = () => {
      if (!editor || !selectedCitationId) return;
      const citationIndex = citations.findIndex((item) => item.id === selectedCitationId);
      const citation = citations[citationIndex];
      if (!citation) return;
      editor.chain().focus().insertContent(`<span data-citation-id="${citation.id}">${escapeHtml(formatInlineCitation(citation, bibliographyStyle, citationIndex))}</span>`).run();
      markDirty();
    };

    const removeSelectedCitation = () => {
      if (!selectedCitationId) return;
      setCitations((value) => value.filter((citation) => citation.id !== selectedCitationId));
      setSelectedCitationId("");
      markDirty();
    };

    const insertBibliography = () => {
      if (!editor) return;
      const entries = citations.length
        ? bibliographyEntries(citations, bibliographyStyle).map(({ citation, text }) => `<p data-bibliography-id="${citation.id}">${escapeHtml(text)}</p>`).join("")
        : "<p>Agrega citas para generar la bibliografia.</p>";
      editor.chain().focus().insertContent(`<h2>Bibliografia (${bibliographyStyle.toUpperCase()})</h2>${entries}`).run();
      markDirty();
    };

    const insertTableOfContents = () => {
      if (!editor) return;
      const parsed = new DOMParser().parseFromString(editor.getHTML(), "text/html");
      const headings = numberedTocEntries(parsed);
      const items = headings.length
        ? headings.map((heading) => (
          `<div data-type="toc-row" data-toc-level="${heading.level}" data-toc-label="${escapeHtml(heading.label)}" data-toc-text="${escapeHtml(heading.displayText)}" data-toc-page="${heading.page}"></div>`
        )).join("")
        : `<div data-type="toc-row" data-toc-level="1" data-toc-label="" data-toc-text="Sin titulos todavia" data-toc-page="1"></div>`;
      editor.chain().focus().insertContent(
        `<div data-type="toc-title" data-toc-title="TABLA DE CONTENIDO"></div>${items}`
      ).run();
      markDirty();
    };

    const insertCaption = () => {
      if (!editor) return;
      const text = captionDraft.trim() || "Descripcion";
      editor.chain().focus().insertContent(
        `<p class="ficct-caption" data-caption-kind="${captionKind}">${captionKind} <span data-caption-seq="${captionKind}"></span>: ${escapeHtml(text)}</p>`
      ).run();
      setCaptionDraft("");
      markDirty();
    };

    const insertTableOfFigures = () => {
      if (!editor) return;
      editor.chain().focus().insertContent(
        `<h2>Tabla de ilustraciones</h2><p class="ficct-table-of-figures" data-caption-kind="${captionKind}">Listado automatico de ${captionKind.toLowerCase()}s. Actualiza campos en Word para recalcular paginas.</p>`
      ).run();
      markDirty();
    };

    const insertBookmark = () => {
      if (!editor || !bookmarkName.trim()) return;
      const label = bookmarkName.trim();
      const id = sanitizeBookmarkId(label);
      if (editor.state.selection.empty) {
        editor.chain().focus().insertContent(`<span data-bookmark-id="${id}" data-bookmark-label="${escapeHtml(label)}">${escapeHtml(label)}</span>`).run();
      } else {
        editor.chain().focus().setMark("bookmarkMark", { id, label }).run();
      }
      setBookmarkName("");
      setCrossReferenceTarget(id);
      markDirty();
    };

    const insertCrossReference = () => {
      if (!editor || !crossReferenceTarget) return;
      const target = bookmarkTargets.find((item) => item.id === crossReferenceTarget);
      const label = crossReferenceKind === "pagina"
        ? `pagina de ${target?.label || crossReferenceTarget}`
        : target?.label || crossReferenceTarget;
      editor.chain().focus().insertContent(
        `<span data-cross-ref-target="${crossReferenceTarget}" data-cross-ref-kind="${crossReferenceKind}">${escapeHtml(label)}</span>`
      ).run();
      markDirty();
    };

    const applyLink = () => {
      if (!editor || !linkUrl.trim()) return;
      const href = linkUrl.trim().match(/^https?:\/\//) ? linkUrl.trim() : `https://${linkUrl.trim()}`;
      if (editor.state.selection.empty) {
        editor.chain().focus().insertContent(`<a href="${escapeHtml(href)}">${escapeHtml(href)}</a>`).run();
      } else {
        editor.chain().focus().setLink({ href }).run();
      }
      setLinkUrl("");
      markDirty();
    };

    const insertFootnote = () => {
      if (!editor || !footnoteDraft.trim()) return;
      const label = footnotes.length + 1;
      const id = `fn-${Date.now()}`;
      editor.chain().focus().insertContent(`<sup data-footnote-id="${id}" data-footnote-label="${label}">[${label}]</sup>`).run();
      setFootnotes((value) => [...value, { id, label, text: footnoteDraft.trim() }]);
      setFootnoteDraft("");
      markDirty();
    };

    const insertEndnote = () => {
      if (!editor || !endnoteDraft.trim()) return;
      const label = endnotes.length + 1;
      const id = `en-${Date.now()}`;
      editor.chain().focus().insertContent(`<sup data-endnote-id="${id}" data-endnote-label="${label}">[e${label}]</sup>`).run();
      setEndnotes((value) => [...value, { id, label, text: endnoteDraft.trim() }]);
      setEndnoteDraft("");
      markDirty();
    };

    return {
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
    };
  }, [
    bibliographyStyle,
    bookmarkName,
    bookmarkTargets,
    captionDraft,
    captionKind,
    citationDraft,
    citations,
    crossReferenceKind,
    crossReferenceTarget,
    editor,
    endnoteDraft,
    endnotes,
    footnoteDraft,
    footnotes,
    linkUrl,
    selectedCitationId,
    setBookmarkName,
    setCaptionDraft,
    setCitationDraft,
    setCitations,
    setCrossReferenceTarget,
    setEndnoteDraft,
    setEndnotes,
    setFootnoteDraft,
    setFootnotes,
    setLinkUrl,
    setSelectedCitationId,
    setStatus,
  ]);
}

function numberedTocEntries(parsed: Document) {
  const counters = [0, 0, 0];
  return Array.from(parsed.querySelectorAll("h1,h2,h3"))
    .map((heading) => {
      const level = Number(heading.tagName.slice(1));
      const rawText = heading.textContent?.replace(/\s+/g, " ").trim() || "";
      const text = rawText.replace(/^\d+(?:\.\d+)*\.?\s+/, "");
      if (!text || /^tabla de contenido$/i.test(text)) return null;
      if (heading.closest(".ficct-toc")) return null;
      counters[level - 1] += 1;
      for (let index = level; index < counters.length; index += 1) counters[index] = 0;
      const number = counters.slice(0, level).filter((value) => value > 0).join(".");
      return {
        level,
        number,
        label: `${number}.`,
        text,
        displayText: level === 1 ? text.toLocaleUpperCase() : text,
        page: "1",
      };
    })
    .filter((entry): entry is { level: number; number: string; label: string; text: string; displayText: string; page: string } => Boolean(entry));
}
