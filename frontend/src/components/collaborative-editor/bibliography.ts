import type { BibliographyStyle, CitationItem } from "./editorTypes";

export function normalizeCitationDraft(value: Omit<CitationItem, "id">): Omit<CitationItem, "id"> | null {
  const author = value.author.trim();
  const year = value.year.trim();
  const title = value.title.trim();
  const source = value.source.trim();
  if (!author || !year) return null;
  return {
    author,
    year,
    title: title || "Titulo sin especificar",
    source: source || "Fuente sin especificar",
    sourceType: value.sourceType || "book",
    publisher: value.publisher?.trim() || "",
    city: value.city?.trim() || "",
    journal: value.journal?.trim() || "",
    volume: value.volume?.trim() || "",
    issue: value.issue?.trim() || "",
    pages: value.pages?.trim() || "",
    doi: value.doi?.trim() || "",
    url: value.url?.trim() || "",
    accessedAt: value.accessedAt?.trim() || "",
  };
}

export function formatInlineCitation(citation: CitationItem, style: BibliographyStyle, index = 0) {
  if (style === "ieee") return `[${index + 1}]`;
  if (style === "mla") return `(${citation.author})`;
  return `(${citation.author}, ${citation.year})`;
}

export function formatBibliographyEntry(citation: CitationItem, style: BibliographyStyle = "apa", index = 0) {
  if (style === "ieee") return formatIeeeBibliographyEntry(citation, index);
  if (style === "mla") return formatMlaBibliographyEntry(citation);
  return formatApaBibliographyEntry(citation);
}

export function bibliographyEntries(citations: CitationItem[], style: BibliographyStyle) {
  const ordered = orderedCitationsForBibliography(citations, style);
  return ordered.map(({ citation, originalIndex }, bibliographyIndex) => ({
    citation,
    originalIndex,
    text: formatBibliographyEntry(citation, style, style === "ieee" ? originalIndex : bibliographyIndex),
  }));
}

function orderedCitationsForBibliography(citations: CitationItem[], style: BibliographyStyle) {
  const indexed = citations.map((citation, originalIndex) => ({ citation, originalIndex }));
  if (style === "ieee") return indexed;
  return indexed.sort((a, b) => {
    const left = bibliographySortKey(a.citation);
    const right = bibliographySortKey(b.citation);
    return left.localeCompare(right, "es", { sensitivity: "base", numeric: true });
  });
}

function bibliographySortKey(citation: CitationItem) {
  return [
    citation.author,
    citation.year,
    citation.title,
    citation.source,
  ].join(" ").toLocaleLowerCase();
}

function formatApaBibliographyEntry(citation: CitationItem) {
  const core = `${citation.author} (${citation.year}). ${citation.title}.`;
  if (citation.sourceType === "journal") {
    return compactParts([
      core,
      citation.journal || citation.source,
      citation.volume ? `${citation.volume}${citation.issue ? `(${citation.issue})` : ""}` : "",
      citation.pages,
      citation.doi ? `https://doi.org/${citation.doi.replace(/^https?:\/\/doi\.org\//i, "")}` : citation.url,
    ]).join(" ");
  }
  if (citation.sourceType === "web") {
    return compactParts([core, citation.source, citation.url, citation.accessedAt ? `Recuperado ${citation.accessedAt}` : ""]).join(" ");
  }
  if (citation.sourceType === "conference") {
    return compactParts([core, citation.source, citation.city, citation.pages, citation.doi ? `doi:${citation.doi}` : citation.url]).join(" ");
  }
  if (citation.sourceType === "thesis") {
    return compactParts([core, "Tesis", citation.publisher || citation.source, citation.city, citation.url]).join(" ");
  }
  if (citation.sourceType === "report") {
    return compactParts([core, "Informe tecnico", citation.publisher || citation.source, citation.url]).join(" ");
  }
  return compactParts([core, citation.publisher || citation.source, citation.city, citation.doi ? `doi:${citation.doi}` : citation.url]).join(" ");
}

function formatIeeeBibliographyEntry(citation: CitationItem, index: number) {
  const label = `[${index + 1}]`;
  const source = citation.journal || citation.publisher || citation.source;
  return compactParts([
    label,
    `${citation.author},`,
    `"${citation.title},"`,
    source,
    citation.volume ? `vol. ${citation.volume}` : "",
    citation.issue ? `no. ${citation.issue}` : "",
    citation.pages ? `pp. ${citation.pages}` : "",
    citation.year,
    citation.doi ? `doi: ${citation.doi}` : citation.url,
  ]).join(" ");
}

function formatMlaBibliographyEntry(citation: CitationItem) {
  return compactParts([
    `${citation.author}.`,
    `"${citation.title}."`,
    citation.journal || citation.source,
    citation.publisher,
    citation.year,
    citation.pages ? `pp. ${citation.pages}` : "",
    citation.url,
  ]).join(" ");
}

function compactParts(parts: (string | undefined)[]) {
  return parts.map((part) => part?.trim()).filter(Boolean) as string[];
}
