"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { bibliotecaAPI, BibliotecaCategoria, BibliotecaDocumento, BibliotecaDocumentoRequest,
  BibliotecaFiltros, BibliotecaRecomendacion } from "@/lib/bibliotecaApi";
import { BookOpen, Download, Eye, FilePlus2, Pencil, Plus, Search, Trash2, X } from "lucide-react";

const campo = "w-full rounded-xl border border-line bg-paper-sunken px-3 py-2 text-sm text-ink outline-none focus:border-accent";
const boton = "inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50";
const vacio = (): BibliotecaDocumentoRequest => ({ categoriaId: null, titulo: "", descripcion: "", area: "", nivel: "", publicado: false });

function Portada({ documento }: { documento: BibliotecaDocumento }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!documento.tienePortada) return;
    let activo = true;
    let imagen: string | null = null;
    void bibliotecaAPI.portada(documento.id).then(blob => {
      if (activo) { imagen = URL.createObjectURL(blob); setUrl(imagen); }
    }).catch(() => {});
    return () => { activo = false; if (imagen) URL.revokeObjectURL(imagen); };
  }, [documento.id, documento.tienePortada, documento.actualizadoEn]);
  return <div className="flex aspect-[3/4] items-center justify-center overflow-hidden border-b border-line-soft bg-paper-sunken">
    {url ? <img src={url} alt={`Portada de ${documento.titulo}`} className="h-full w-full object-cover" />
      : <BookOpen className="h-12 w-12 text-accent/60" aria-hidden="true" />}
  </div>;
}

export default function BibliotecaPage() {
  const { user } = useAuth();
  const admin = user?.rol === "ADMIN";
  const estudiante = user?.rol === "ESTUDIANTE";
  const autorizado = admin || estudiante;
  const [categorias, setCategorias] = useState<BibliotecaCategoria[]>([]);
  const [filtros, setFiltros] = useState<BibliotecaFiltros>({ areas: [], niveles: [] });
  const [documentos, setDocumentos] = useState<BibliotecaDocumento[]>([]);
  const [recomendaciones, setRecomendaciones] = useState<BibliotecaRecomendacion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [areaFiltro, setAreaFiltro] = useState("");
  const [nivelFiltro, setNivelFiltro] = useState("");
  const [categoriaNombre, setCategoriaNombre] = useState("");
  const [categoriaDescripcion, setCategoriaDescripcion] = useState("");
  const [categoriaEditando, setCategoriaEditando] = useState<number | null>(null);
  const [datos, setDatos] = useState<BibliotecaDocumentoRequest>(vacio);
  const [archivo, setArchivo] = useState<File | undefined>();
  const [portada, setPortada] = useState<File | undefined>();
  const [modalLibro, setModalLibro] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [visor, setVisor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const informarError = (e: unknown) => setError(e instanceof Error ? e.message : "No se pudo completar la operación.");

  const cargar = useCallback(async () => {
    if (!autorizado) return;
    try {
      setCargando(true);
      const [cats, opciones, docs, sugerencias] = await Promise.all([
        bibliotecaAPI.categorias(), bibliotecaAPI.filtros(),
        admin ? bibliotecaAPI.documentosAdmin() : bibliotecaAPI.documentos(),
        estudiante ? bibliotecaAPI.recomendaciones() : Promise.resolve([]),
      ]);
      setCategorias(cats); setFiltros(opciones); setDocumentos(docs); setRecomendaciones(sugerencias);
      setError("");
    } catch (e) { informarError(e); }
    finally { setCargando(false); }
  }, [admin, estudiante, autorizado]);

  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => {
    if (!estudiante) return;
    let activo = true;
    const temporizador = window.setTimeout(() => {
      void bibliotecaAPI.documentos({ texto: busqueda, categoriaId: categoriaFiltro,
        area: areaFiltro, nivel: nivelFiltro }).then(docs => { if (activo) setDocumentos(docs); })
        .catch(e => { if (activo) informarError(e); });
    }, 250);
    return () => { activo = false; window.clearTimeout(temporizador); };
  }, [estudiante, busqueda, categoriaFiltro, areaFiltro, nivelFiltro]);
  useEffect(() => () => { if (visor) URL.revokeObjectURL(visor); }, [visor]);

  const guardarCategoria = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setMensaje("");
    try {
      setGuardando(true);
      if (categoriaEditando) await bibliotecaAPI.actualizarCategoria(categoriaEditando, categoriaNombre, categoriaDescripcion);
      else await bibliotecaAPI.crearCategoria(categoriaNombre, categoriaDescripcion);
      setCategoriaNombre(""); setCategoriaDescripcion(""); setCategoriaEditando(null);
      setMensaje("Categoría guardada."); await cargar();
    } catch (e) { informarError(e); } finally { setGuardando(false); }
  };

  const guardarDocumento = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setMensaje("");
    if (!editando && !archivo) { setError("Selecciona un PDF."); return; }
    if (!editando && !portada) { setError("Selecciona una imagen de portada."); return; }
    try {
      setGuardando(true);
      await bibliotecaAPI.guardarDocumento(datos, archivo, portada, editando ?? undefined);
      setDatos(vacio()); setArchivo(undefined); setPortada(undefined); setEditando(null); setModalLibro(false);
      setMensaje("Libro guardado."); await cargar();
    } catch (e) { informarError(e); } finally { setGuardando(false); }
  };

  const editarDocumento = (doc: BibliotecaDocumento) => {
    setError("");
    setEditando(doc.id); setArchivo(undefined); setPortada(undefined);
    setDatos({ categoriaId: doc.categoriaId, titulo: doc.titulo, descripcion: doc.descripcion ?? "",
      area: doc.area ?? "", nivel: doc.nivel ?? "", publicado: doc.publicado });
    setModalLibro(true);
  };

  const eliminarCategoria = async (cat: BibliotecaCategoria) => {
    if (!window.confirm(`¿Eliminar la categoría «${cat.nombre}»?`)) return;
    try { await bibliotecaAPI.eliminarCategoria(cat.id); setMensaje("Categoría eliminada."); await cargar(); }
    catch (e) { informarError(e); }
  };
  const eliminarDocumento = async (doc: BibliotecaDocumento) => {
    if (!window.confirm(`¿Eliminar «${doc.titulo}» y su PDF?`)) return;
    try { await bibliotecaAPI.eliminarDocumento(doc.id); setMensaje("Documento eliminado."); await cargar(); }
    catch (e) { informarError(e); }
  };

  const abrirPdf = async (doc: BibliotecaDocumento, descargar = false) => {
    try {
      setError("");
      const blob = await bibliotecaAPI.archivo(doc.id, descargar);
      const enlace = URL.createObjectURL(blob);
      if (descargar) {
        const a = document.createElement("a"); a.href = enlace; a.download = doc.nombreArchivo;
        document.body.appendChild(a); a.click(); a.remove();
        window.setTimeout(() => URL.revokeObjectURL(enlace), 60_000);
      } else setVisor(enlace);
    } catch (e) { informarError(e); }
  };

  const listaVisible = admin && busqueda.trim()
    ? documentos.filter(d => `${d.titulo} ${d.descripcion ?? ""} ${d.categoria ?? ""}`.toLocaleLowerCase("es")
      .includes(busqueda.trim().toLocaleLowerCase("es"))) : documentos;

  return <DashboardLayout>
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 pb-20 text-ink md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Recursos académicos</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-ink">Biblioteca virtual</h1>
          <p className="mt-2 text-sm text-ink-soft">{admin ? "Publica libros y documentos independientes de las convocatorias." : "Explora libros y documentos de distintos temas."}</p>
        </div>
        {admin && <button type="button" className={`${boton} whitespace-nowrap`} onClick={() => { setError(""); setEditando(null); setDatos(vacio()); setArchivo(undefined); setPortada(undefined); setModalLibro(true); }}><Plus className="h-4 w-4" />Añadir libro</button>}
      </header>
      {!autorizado && user && <p className="rounded-xl border border-line bg-paper-raised p-5 text-sm text-ink-soft">La biblioteca está disponible para Administradores y Estudiantes.</p>}
      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft/20 p-3 text-sm text-danger">{error}</p>}
      {mensaje && <p role="status" className="rounded-xl border border-accent/30 bg-accent-soft p-3 text-sm text-accent-dark">{mensaje}</p>}

      {admin && <>
        <section className="rounded-2xl border border-line-soft bg-paper-raised p-5 shadow-xs">
          <div className="mb-4"><h2 className="text-base font-bold text-ink">Categorías de documentos</h2><p className="mt-1 text-xs text-ink-soft">Organiza el catálogo cuando necesites clasificar materiales.</p></div>
          <form onSubmit={guardarCategoria} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
            <input className={campo} value={categoriaNombre} onChange={e => setCategoriaNombre(e.target.value)} placeholder="Nombre de categoría" maxLength={120} required />
            <input className={campo} value={categoriaDescripcion} onChange={e => setCategoriaDescripcion(e.target.value)} placeholder="Descripción opcional" maxLength={500} />
            <button className={boton} disabled={guardando} type="submit">{categoriaEditando ? "Guardar" : "Agregar categoría"}</button>
          </form>
          {categoriaEditando && <button type="button" onClick={() => { setCategoriaEditando(null); setCategoriaNombre(""); setCategoriaDescripcion(""); }} className="mt-2 text-xs text-ink-soft underline">Cancelar edición</button>}
          <div className="mt-4 flex flex-wrap gap-2">{categorias.map(cat => <div key={cat.id} className="flex items-center gap-2 rounded-xl border border-line-soft bg-paper-sunken/50 px-3 py-2 text-sm text-ink">
            <span>{cat.nombre}</span>
            <button type="button" className="rounded-md p-1 text-ink-soft transition-colors hover:bg-paper-raised hover:text-accent" aria-label={`Editar ${cat.nombre}`} onClick={() => { setCategoriaEditando(cat.id); setCategoriaNombre(cat.nombre); setCategoriaDescripcion(cat.descripcion ?? ""); }}><Pencil className="h-3.5 w-3.5" /></button>
            <button type="button" className="rounded-md p-1 text-danger transition-colors hover:bg-danger-soft" aria-label={`Eliminar ${cat.nombre}`} onClick={() => void eliminarCategoria(cat)}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>)}</div>
        </section>

      </>}

      {admin && modalLibro && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-libro" onMouseDown={e => { if (e.target === e.currentTarget && !guardando) setModalLibro(false); }}>
        <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-paper-raised p-6 text-ink shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-3 border-b border-line-soft pb-4"><div><p className="text-xs font-bold uppercase tracking-widest text-accent">Catálogo</p><h2 id="titulo-modal-libro" className="mt-1 text-xl font-bold text-ink">{editando ? "Editar libro" : "Añadir libro"}</h2><p className="mt-1 text-xs text-ink-soft">Los datos de clasificación son opcionales.</p></div><button type="button" className="rounded-lg p-2 text-ink-soft hover:bg-paper-sunken hover:text-ink" aria-label="Cerrar" onClick={() => setModalLibro(false)}><X className="h-5 w-5" /></button></div>
          <form onSubmit={guardarDocumento} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-ink">Título<input className={campo} value={datos.titulo} onChange={e => setDatos({ ...datos, titulo: e.target.value })} maxLength={200} required /></label>
            <label className="space-y-1 text-sm text-ink">Categoría (opcional)<select className={campo} value={datos.categoriaId ?? ""} onChange={e => setDatos({ ...datos, categoriaId: e.target.value ? Number(e.target.value) : null })}><option value="">Sin categoría</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm text-ink sm:col-span-2">Descripción<textarea className={campo} value={datos.descripcion} onChange={e => setDatos({ ...datos, descripcion: e.target.value })} maxLength={1000} rows={2} /></label>
            <label className="space-y-1 text-sm text-ink">Área (opcional)<select className={campo} value={datos.area} onChange={e => setDatos({ ...datos, area: e.target.value })}><option value="">Sin área específica</option>{filtros.areas.map(a => <option key={a}>{a}</option>)}</select></label>
            <label className="space-y-1 text-sm text-ink">Nivel (opcional)<select className={campo} value={datos.nivel} onChange={e => setDatos({ ...datos, nivel: e.target.value })}><option value="">Sin nivel específico</option>{filtros.niveles.map(n => <option key={n}>{n}</option>)}</select></label>
            <label className="space-y-1 text-sm text-ink">Archivo PDF<input id="archivo-biblioteca" className={campo} type="file" accept="application/pdf,.pdf" onChange={e => setArchivo(e.target.files?.[0])} required={!editando} /><span className="text-xs text-ink-soft">Máximo 20 MB. {editando ? "Déjalo vacío para conservar el PDF actual." : ""}</span></label>
            <label className="space-y-1 text-sm text-ink">Imagen de portada<input className={campo} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setPortada(e.target.files?.[0])} required={!editando} /><span className="text-xs text-ink-soft">PNG, JPG o WebP. Máximo 5 MB. {editando ? "Déjala vacía para conservar la portada actual." : ""}</span></label>
            <label className="flex items-center gap-2 self-center rounded-xl border border-line-soft bg-paper-sunken/50 px-3 py-2 text-sm font-medium text-ink"><input type="checkbox" className="accent-accent" checked={datos.publicado} onChange={e => setDatos({ ...datos, publicado: e.target.checked })} />Visible para estudiantes</label>
            {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2 border-t border-line-soft pt-4 sm:col-span-2"><button type="button" className="rounded-xl border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-accent" onClick={() => setModalLibro(false)}>Cancelar</button>
              <button className={boton} disabled={guardando} type="submit"><FilePlus2 className="h-4 w-4" />{guardando ? "Guardando..." : "Guardar libro"}</button></div>
          </form>
        </section>
      </div>}

      {estudiante && <section className="rounded-2xl border border-line-soft bg-paper-raised p-5 shadow-xs">
        <div className="mb-4"><p className="text-xs font-bold uppercase tracking-wider text-accent">Para ti</p><h2 className="mt-1 text-lg font-bold text-ink">Lecturas recomendadas</h2>
        <p className="mt-1 text-xs text-ink-soft">Combinan tus intereses, tus lecturas y los libros más descargados por estudiantes.</p></div>
        {!cargando && recomendaciones.length === 0 && <p className="text-sm text-ink-soft">Aún no hay datos suficientes para sugerir lecturas. Puedes explorar el catálogo con los filtros.</p>}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{recomendaciones.slice(0, 5).map(r => <article key={r.documento.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line-soft bg-paper-raised shadow-xs transition-all hover:border-accent/40 hover:shadow-md">
          <Portada documento={r.documento} /><div className="flex flex-1 flex-col p-3"><p className="line-clamp-2 text-sm font-bold text-ink">{r.documento.titulo}</p><p className="mt-1 text-xs text-ink-soft">{r.motivo}</p>
          <button type="button" onClick={() => void abrirPdf(r.documento)} className="mt-auto flex items-center gap-1.5 pt-3 text-xs font-bold text-accent-dark hover:underline"><Eye className="h-3.5 w-3.5" /> Abrir PDF</button></div>
        </article>)}</div>
      </section>}

      {autorizado && <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-accent">Catálogo</p><h2 className="mt-1 text-lg font-bold text-ink">{admin ? "Documentos cargados" : "Explorar documentos"}</h2></div><span className="rounded-full border border-line-soft bg-paper-raised px-3 py-1 text-xs font-semibold text-ink-soft">{listaVisible.length} resultado{listaVisible.length === 1 ? "" : "s"}</span></div>
        <div className="grid gap-3 rounded-2xl border border-line-soft bg-paper-raised p-3 shadow-xs sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input className={`${campo} pl-9`} value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar título o contenido" /></label>
          {estudiante && <><select className={campo} aria-label="Filtrar categoría" value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)}><option value="">Todas las categorías</option><option value="-1">Sin categoría</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
            <select className={campo} aria-label="Filtrar área" value={areaFiltro} onChange={e => setAreaFiltro(e.target.value)}><option value="">Todas las áreas</option>{filtros.areas.map(a => <option key={a}>{a}</option>)}</select>
            <select className={campo} aria-label="Filtrar nivel" value={nivelFiltro} onChange={e => setNivelFiltro(e.target.value)}><option value="">Todos los niveles</option>{filtros.niveles.map(n => <option key={n}>{n}</option>)}</select></>}
        </div>
        {cargando ? <p className="rounded-2xl border border-line-soft bg-paper-raised p-10 text-center text-sm text-ink-soft">Cargando biblioteca...</p> : listaVisible.length === 0 ? <div className="rounded-2xl border border-line-soft bg-paper-raised p-10 text-center text-ink-soft"><BookOpen className="mx-auto h-8 w-8 text-accent" /><p className="mt-3 text-sm font-semibold">No se encontraron documentos.</p><p className="mt-1 text-xs">Prueba con otra búsqueda o filtro.</p></div> :
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{listaVisible.map(doc => <article key={doc.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line-soft bg-paper-raised shadow-xs transition-all hover:border-accent/40 hover:shadow-md">
            <Portada documento={doc} /><div className="flex flex-1 flex-col p-3">
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="line-clamp-2 text-sm font-bold text-ink">{doc.titulo}</h3><p className="mt-1 text-xs text-ink-soft">{doc.categoria ?? "Sin categoría"}{doc.area ? ` · ${doc.area}` : ""}{doc.nivel ? ` · ${doc.nivel}` : ""}</p></div></div>
            {admin && <span className={`mt-2 w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold ${doc.publicado ? "border-accent/30 bg-accent-soft text-accent-dark" : "border-line bg-paper-sunken text-ink-soft"}`}>{doc.publicado ? "Visible" : "Oculto"}</span>}
            {doc.descripcion && <p className="mt-2 line-clamp-3 text-xs text-ink-soft">{doc.descripcion}</p>}
            <div className="mt-auto grid grid-cols-2 gap-1 border-t border-line-soft pt-3 text-xs font-semibold text-accent-dark">
              <button type="button" onClick={() => void abrirPdf(doc)} className="flex items-center gap-1 rounded-lg px-1 py-1.5 hover:bg-accent-soft"><Eye className="h-3.5 w-3.5" />Ver</button>
              <button type="button" onClick={() => void abrirPdf(doc, true)} className="flex items-center gap-1 rounded-lg px-1 py-1.5 hover:bg-accent-soft"><Download className="h-3.5 w-3.5" />Descargar</button>
              {admin && <><button type="button" onClick={() => editarDocumento(doc)} className="flex items-center gap-1 rounded-lg px-1 py-1.5 hover:bg-accent-soft"><Pencil className="h-3.5 w-3.5" />Editar</button>
                <button type="button" className="flex items-center gap-1 rounded-lg px-1 py-1.5 text-danger hover:bg-danger-soft" onClick={() => void eliminarDocumento(doc)}><Trash2 className="h-3.5 w-3.5" />Eliminar</button></>}
            </div></div>
          </article>)}</div>}
      </section>}

      {visor && <div className="fixed inset-0 z-50 flex flex-col bg-black/80 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Visor de PDF">
        <div className="mb-2 flex justify-end"><button type="button" onClick={() => setVisor(null)} className="rounded-xl bg-white p-2 text-black" aria-label="Cerrar visor"><X className="h-5 w-5" /></button></div>
        <iframe className="h-full w-full rounded-xl bg-white" src={visor} title="Documento de biblioteca" />
      </div>}
    </main>
  </DashboardLayout>;
}
