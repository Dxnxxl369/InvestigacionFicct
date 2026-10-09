import React, { useEffect, useMemo, useState } from "react";
import { formatBibliographyEntry, formatInlineCitation } from "./bibliography";
import type { BibliographyStyle, CitationItem, CitationSourceType } from "./editorTypes";

const BLANK_SOURCE: Omit<CitationItem, "id"> = {
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

export function ReferenceSourceManager({
  open,
  citations,
  bibliographyStyle,
  onClose,
  onCitationsChange,
  onInsertCitation,
}: {
  open: boolean;
  citations: CitationItem[];
  bibliographyStyle: BibliographyStyle;
  onClose: () => void;
  onCitationsChange: (citations: CitationItem[]) => void;
  onInsertCitation: (citationId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<CitationItem, "id">>(BLANK_SOURCE);

  useEffect(() => {
    if (!open) return;
    setSelectedId((value) => value || citations[0]?.id || "");
    setShowForm(false);
    setEditingId(null);
  }, [citations, open]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return citations;
    return citations.filter((citation) => [
      citation.author,
      citation.year,
      citation.title,
      citation.source,
      citation.publisher,
      citation.journal,
      citation.url,
    ].join(" ").toLocaleLowerCase().includes(needle));
  }, [citations, search]);

  const selected = citations.find((citation) => citation.id === selectedId) || filtered[0] || citations[0] || null;

  const startNew = () => {
    setDraft(BLANK_SOURCE);
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = () => {
    if (!selected) return;
    const { id: _id, ...source } = selected;
    setDraft({ ...BLANK_SOURCE, ...source });
    setEditingId(selected.id);
    setShowForm(true);
  };

  const saveSource = () => {
    const normalized = normalizeSourceDraft(draft);
    if (!normalized) return;
    if (editingId) {
      onCitationsChange(citations.map((citation) => citation.id === editingId ? { id: editingId, ...normalized } : citation));
      setSelectedId(editingId);
    } else {
      const id = `cite-${Date.now()}`;
      onCitationsChange([...citations, { id, ...normalized }]);
      setSelectedId(id);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const deleteSelected = () => {
    if (!selected) return;
    const next = citations.filter((citation) => citation.id !== selected.id);
    onCitationsChange(next);
    setSelectedId(next[0]?.id || "");
  };

  if (!open) return null;

  return (
    <div className="ficct-source-manager-overlay">
      <section className="ficct-source-manager" role="dialog" aria-modal="true" aria-label="Administrador de fuentes">
        <header>
          <strong>Administrador de fuentes</strong>
          <button type="button" onClick={onClose}>×</button>
        </header>
        <div className="ficct-source-manager-search">
          <label>Buscar:</label>
          <input value={search} onChange={(event) => setSearch(event.target.value)} />
          <select defaultValue="author">
            <option value="author">Ordenar por autor</option>
            <option value="title">Ordenar por titulo</option>
            <option value="year">Ordenar por año</option>
          </select>
        </div>
        <div className="ficct-source-manager-body">
          <div className="ficct-source-list">
            <span>Fuentes disponibles en:</span>
            <strong>Lista general</strong>
            <div>
              {filtered.length === 0 && <p>No hay fuentes guardadas.</p>}
              {filtered.map((citation) => (
                <button
                  key={citation.id}
                  type="button"
                  className={citation.id === selected?.id ? "active" : ""}
                  onClick={() => setSelectedId(citation.id)}
                >
                  {sourceListLabel(citation)}
                </button>
              ))}
            </div>
          </div>
          <div className="ficct-source-manager-actions">
            <button type="button" disabled={!selected} onClick={() => selected && onInsertCitation(selected.id)}>Copiar -&gt;</button>
            <button type="button" disabled={!selected} onClick={deleteSelected}>Eliminar</button>
            <button type="button" disabled={!selected} onClick={startEdit}>Editar...</button>
            <button type="button" onClick={startNew}>Nuevo...</button>
          </div>
          <div className="ficct-source-list current">
            <span>Lista actual</span>
            <div>
              {selected ? (
                <button type="button" className="active">{sourceListLabel(selected)}</button>
              ) : (
                <p>Selecciona o crea una fuente.</p>
              )}
            </div>
          </div>
        </div>
        <div className="ficct-source-preview">
          <span>Vista previa ({bibliographyStyle.toUpperCase()}):</span>
          <div>
            {selected ? (
              <>
                <p>Cita: {formatInlineCitation(selected, bibliographyStyle, citations.findIndex((item) => item.id === selected.id))}</p>
                <p>Entrada bibliografica:</p>
                <p>{formatBibliographyEntry(selected, bibliographyStyle, citations.findIndex((item) => item.id === selected.id))}</p>
              </>
            ) : (
              <p>No hay fuente seleccionada.</p>
            )}
          </div>
        </div>
        {showForm && (
          <div className="ficct-source-form">
            <header>
              <strong>{editingId ? "Editar fuente" : "Crear fuente"}</strong>
              <button type="button" onClick={() => setShowForm(false)}>×</button>
            </header>
            <div className="ficct-source-form-grid">
              <label>Tipo de fuente bibliografica</label>
              <select value={draft.sourceType} onChange={(event) => setDraft((value) => ({ ...value, sourceType: event.target.value as CitationSourceType }))}>
                <option value="book">Libro</option>
                <option value="journal">Articulo de revista</option>
                <option value="web">Sitio web</option>
                <option value="conference">Congreso</option>
                <option value="thesis">Tesis</option>
                <option value="report">Informe</option>
              </select>
              <label>Idioma</label>
              <select defaultValue="default">
                <option value="default">Predeterminado</option>
                <option value="es">Español</option>
                <option value="en">Ingles</option>
              </select>
              <label>Autor</label>
              <input value={draft.author} onChange={(event) => setDraft((value) => ({ ...value, author: event.target.value }))} />
              <label>Titulo</label>
              <input value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} />
              {draft.sourceType === "web" ? (
                <>
                  <label>Nombre del sitio web</label>
                  <input value={draft.source} onChange={(event) => setDraft((value) => ({ ...value, source: event.target.value }))} />
                  <label>Año</label>
                  <input value={draft.year} onChange={(event) => setDraft((value) => ({ ...value, year: event.target.value }))} />
                  <label>URL</label>
                  <input value={draft.url} onChange={(event) => setDraft((value) => ({ ...value, url: event.target.value }))} />
                  <label>Consultado</label>
                  <input value={draft.accessedAt} onChange={(event) => setDraft((value) => ({ ...value, accessedAt: event.target.value }))} />
                </>
              ) : draft.sourceType === "journal" ? (
                <>
                  <label>Revista</label>
                  <input value={draft.journal} onChange={(event) => setDraft((value) => ({ ...value, journal: event.target.value, source: event.target.value }))} />
                  <label>Año</label>
                  <input value={draft.year} onChange={(event) => setDraft((value) => ({ ...value, year: event.target.value }))} />
                  <label>Volumen</label>
                  <input value={draft.volume} onChange={(event) => setDraft((value) => ({ ...value, volume: event.target.value }))} />
                  <label>Paginas</label>
                  <input value={draft.pages} onChange={(event) => setDraft((value) => ({ ...value, pages: event.target.value }))} />
                </>
              ) : (
                <>
                  <label>Año</label>
                  <input value={draft.year} onChange={(event) => setDraft((value) => ({ ...value, year: event.target.value }))} />
                  <label>Ciudad</label>
                  <input value={draft.city} onChange={(event) => setDraft((value) => ({ ...value, city: event.target.value }))} />
                  <label>Editorial/Fuente</label>
                  <input value={draft.publisher || draft.source} onChange={(event) => setDraft((value) => ({ ...value, publisher: event.target.value, source: event.target.value }))} />
                </>
              )}
            </div>
            <footer>
              <button type="button" onClick={saveSource}>Aceptar</button>
              <button type="button" onClick={() => setShowForm(false)}>Cancelar</button>
            </footer>
          </div>
        )}
        <footer>
          <button type="button" onClick={onClose}>Cerrar</button>
        </footer>
      </section>
    </div>
  );
}

function normalizeSourceDraft(value: Omit<CitationItem, "id">): Omit<CitationItem, "id"> | null {
  const author = value.author.trim();
  const year = value.year.trim();
  const title = value.title.trim();
  const source = (value.source || value.publisher || value.journal || "Fuente sin especificar").trim();
  if (!author || !year || !title) return null;
  return {
    ...value,
    author,
    year,
    title,
    source,
    sourceType: value.sourceType || "book",
  };
}

function sourceListLabel(citation: CitationItem) {
  return `${citation.author}; ${citation.title}; ${citation.source || citation.publisher || citation.journal || "Fuente"} (${citation.year})`;
}
