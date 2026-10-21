"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { api, ConfiguracionTipoPlantilla, PlantillaActividadDTO, PlantillaDTO,
  TipoConvocatoriaPlantilla, plantillasAPI } from "@/lib/api";
import { ArrowDown, ArrowUp, ChevronDown, Layers3, Plus, Save, Search, Settings2, Trash2, X } from "lucide-react";

const TIPOS: { id: TipoConvocatoriaPlantilla; label: string }[] = [
  { id: "FERIA", label: "Feria" },
  { id: "HACKATHON", label: "Hackathon" },
  { id: "CONCURSO", label: "Concurso" },
  { id: "INVESTIGACION", label: "Investigación" },
];

const nuevaActividad = (): PlantillaActividadDTO => ({
  titulo: "", descripcion: "", tiposArchivosPermitidos: ".pdf, .docx",
  tamanoMaximoMb: 15, puntajeMaximo: 100, visibleJurados: false, entregaGrupal: false, adjuntos: [], rubrica: [],
});
const nuevaPlantilla = (): PlantillaDTO => ({ titulo: "", descripcion: "", actividades: [nuevaActividad()] });
const campo = "w-full rounded-xl border border-line bg-paper-sunken px-3 py-2 text-sm text-ink outline-none focus:border-accent";
const normalizarBusqueda = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");

export default function PlantillasPage() {
  const { user, loading: authLoading } = useAuth();
  const autorizado = user?.rol === "ADMIN" || user?.rol === "DOCENTE";
  const [plantillas, setPlantillas] = useState<PlantillaDTO[]>([]);
  const [tipos, setTipos] = useState<ConfiguracionTipoPlantilla[]>([]);
  const [actual, setActual] = useState<PlantillaDTO | null>(null);
  const [moduloAbierto, setModuloAbierto] = useState(false);
  const [tareasAbiertas, setTareasAbiertas] = useState<Set<number>>(() => new Set());
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState<number | null>(null);
  const [modalTipos, setModalTipos] = useState(false);
  const [tipoActivo, setTipoActivo] = useState<TipoConvocatoriaPlantilla>("FERIA");
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [busquedaPlantilla, setBusquedaPlantilla] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const [lista, configuracion] = await Promise.all([plantillasAPI.listar(), plantillasAPI.tipos()]);
      setPlantillas(lista);
      setTipos(configuracion);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las plantillas.");
    } finally { setCargando(false); }
  }, []);

  useEffect(() => { if (autorizado) void cargar(); }, [autorizado, cargar]);

  const editar = (plantilla: PlantillaDTO) => {
    setActual(structuredClone(plantilla));
    setModuloAbierto(false);
    setTareasAbiertas(new Set());
    setMensaje(""); setError("");
  };
  const alternarTarea = (index: number) => setTareasAbiertas(prev => {
    const siguiente = new Set(prev);
    if (siguiente.has(index)) siguiente.delete(index);
    else siguiente.add(index);
    return siguiente;
  });
  const actualizarActividad = (index: number, cambios: Partial<PlantillaActividadDTO>) => {
    setActual(prev => prev && ({ ...prev, actividades: prev.actividades.map((a, i) => i === index ? { ...a, ...cambios } : a) }));
  };
  const moverActividad = (index: number, desplazamiento: number) => {
    if (!actual || index + desplazamiento < 0 || index + desplazamiento >= actual.actividades.length) return;
    setTareasAbiertas(abiertas => {
      const siguiente = new Set(abiertas);
      const primera = abiertas.has(index);
      const segunda = abiertas.has(index + desplazamiento);
      if (primera) siguiente.add(index + desplazamiento); else siguiente.delete(index + desplazamiento);
      if (segunda) siguiente.add(index); else siguiente.delete(index);
      return siguiente;
    });
    setActual(prev => {
      if (!prev) return prev;
      const actividades = [...prev.actividades];
      [actividades[index], actividades[index + desplazamiento]] = [actividades[index + desplazamiento], actividades[index]];
      return { ...prev, actividades };
    });
  };
  const quitarActividad = (index: number) => {
    setActual(prev => prev && ({ ...prev, actividades: prev.actividades.filter((_, i) => i !== index) }));
    setTareasAbiertas(prev => new Set(Array.from(prev).filter(i => i !== index).map(i => i > index ? i - 1 : i)));
  };
  const subirAdjunto = async (index: number, file?: File) => {
    if (!file) return;
    if ((actual?.actividades[index].adjuntos?.length || 0) >= 10) { setError("Máximo 10 adjuntos por tarea."); return; }
    try {
      setSubiendo(index); setError("");
      const subido = await api.uploadArchivo(file);
      setActual(prev => prev && ({ ...prev, actividades: prev.actividades.map((a, i) => i === index
        ? { ...a, adjuntos: [...(a.adjuntos || []), { nombre: subido.originalFilename || file.name,
            ruta: subido.url || subido.relativePath, tamanoBytes: subido.size }] } : a) }));
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo subir el archivo."); }
    finally { setSubiendo(null); }
  };

  const guardar = async () => {
    if (!actual?.titulo.trim()) { setError("Escribe el nombre del módulo."); return; }
    if (actual.actividades.length === 0) { setError("Agrega al menos una tarea a la plantilla."); return; }
    if (actual.actividades.some(a => !a.titulo.trim())) { setError("Todas las tareas deben tener nombre."); return; }
    if (actual.actividades.some(a => (a.rubrica || []).some(c => !c.nombre.trim()))) { setError("Todos los criterios de rúbrica deben tener nombre."); return; }
    if (actual.actividades.some(a => (a.rubrica || []).reduce((sum, c) => sum + c.puntajeMaximo, 0) > (a.puntajeMaximo ?? 100))) { setError("La suma de la rúbrica supera el puntaje de la tarea."); return; }
    try {
      setGuardando(true); setError("");
      const guardada = actual.id
        ? await plantillasAPI.actualizar(actual.id, actual)
        : await plantillasAPI.crear(actual);
      await cargar();
      setActual(guardada);
      setMensaje("Plantilla guardada. Las convocatorias nuevas usarán esta versión.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar."); }
    finally { setGuardando(false); }
  };

  const eliminar = async (plantilla: PlantillaDTO) => {
    if (!plantilla.id || !window.confirm(`¿Eliminar la plantilla “${plantilla.titulo}”? Se quitará de los tipos de convocatoria que la usan; las convocatorias existentes conservarán sus módulos.`)) return;
    try {
      await plantillasAPI.eliminar(plantilla.id);
      if (actual?.id === plantilla.id) setActual(null);
      await cargar();
      setMensaje("Plantilla eliminada y retirada de los tipos de convocatoria.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar."); }
  };

  const abrirTipos = () => {
    setTipoActivo("FERIA");
    setSeleccion(tipos.find(t => t.tipo === "FERIA")?.plantillaIds || []);
    setBusquedaPlantilla("");
    setModalTipos(true); setError(""); setMensaje("");
  };
  const elegirTipo = (tipo: TipoConvocatoriaPlantilla) => {
    setTipoActivo(tipo);
    setSeleccion(tipos.find(t => t.tipo === tipo)?.plantillaIds || []);
    setBusquedaPlantilla("");
  };
  const disponibles = plantillas.filter(p => p.id !== undefined && !seleccion.includes(p.id)
    && normalizarBusqueda(p.titulo).includes(normalizarBusqueda(busquedaPlantilla.trim())));
  const disponiblesMostradas = disponibles.slice(0, 10);
  const moverAsignacion = (index: number, desplazamiento: number) => {
    if (index + desplazamiento < 0 || index + desplazamiento >= seleccion.length) return;
    const siguiente = [...seleccion];
    [siguiente[index], siguiente[index + desplazamiento]] = [siguiente[index + desplazamiento], siguiente[index]];
    setSeleccion(siguiente);
  };
  const guardarTipo = async () => {
    try {
      setGuardando(true); setError("");
      await plantillasAPI.configurarTipo(tipoActivo, seleccion);
      setTipos(await plantillasAPI.tipos());
      setMensaje(`Plantillas de ${TIPOS.find(t => t.id === tipoActivo)?.label} actualizadas.`);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la configuración."); }
    finally { setGuardando(false); }
  };

  return <DashboardLayout>
    <main className="mx-auto w-full max-w-7xl p-5 md:p-8 text-ink">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Configuración académica</p>
          <h1 className="mt-1 text-3xl font-bold">Plantillas</h1>
          <p className="mt-2 text-sm text-ink-soft">Crea módulos reutilizables y define qué tareas se agregan al crear cada convocatoria.</p>
        </div>
        {autorizado && <div className="flex gap-2">
          <button type="button" onClick={abrirTipos} className="flex items-center gap-2 rounded-xl border border-line bg-paper-raised px-4 py-2 text-sm font-semibold hover:border-accent"><Settings2 size={17} /> Tipos de convocatoria</button>
          <button type="button" onClick={() => editar(nuevaPlantilla())} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"><Plus size={17} /> Nueva plantilla</button>
        </div>}
      </div>
      {!authLoading && !autorizado && <div className="rounded-xl border border-line bg-paper-raised p-6">Esta sección es exclusiva para administradores y docentes.</div>}
      {autorizado && <>
        {error && <div role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950">{error}</div>}
        {mensaje && <div role="status" className="mb-4 rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950">{mensaje}</div>}
        <div className="grid gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-line bg-paper-raised p-4">
            <h2 className="mb-3 font-bold">Plantillas existentes</h2>
            {cargando && <p className="text-sm text-ink-soft">Cargando...</p>}
            {!cargando && plantillas.length === 0 && <p className="text-sm text-ink-soft">Aún no hay plantillas.</p>}
            <div className="space-y-2">
              {plantillas.map(p => <div key={p.id} className={`rounded-xl border p-3 ${actual?.id === p.id ? "border-accent bg-accent/10" : "border-line"}`}>
                <button type="button" onClick={() => editar(p)} className="w-full text-left">
                  <span className="flex items-center gap-2 font-semibold"><Layers3 size={16} className="text-accent" /> {p.titulo}</span>
                  <span className="mt-1 block text-xs text-ink-soft">{p.actividades.length} tarea{p.actividades.length === 1 ? "" : "s"}</span>
                </button>
                <button type="button" onClick={() => void eliminar(p)} className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:underline"><Trash2 size={13} /> Eliminar</button>
              </div>)}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-paper-raised p-5">
            {!actual ? <div className="flex min-h-64 flex-col items-center justify-center text-center text-ink-soft"><Layers3 size={34} className="mb-3 text-accent" /><p>Selecciona una plantilla para editarla o crea una nueva.</p></div> : <>
              <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{actual.id ? "Editar plantilla" : "Nueva plantilla"}</h2><button type="button" onClick={() => setActual(null)} aria-label="Cerrar editor"><X size={18} /></button></div>
              <div className="rounded-xl border border-line">
                <button type="button" aria-expanded={moduloAbierto} aria-controls="datos-modulo-plantilla" onClick={() => setModuloAbierto(prev => !prev)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-paper-sunken/50">
                  <span className="min-w-0"><span className="block text-sm font-bold">Nombre y descripción del módulo</span><span className="mt-0.5 block truncate text-xs text-ink-soft">{actual.titulo || "Módulo sin nombre"}</span></span>
                  <ChevronDown size={18} className={`shrink-0 transition-transform ${moduloAbierto ? "rotate-180" : ""}`} />
                </button>
                {moduloAbierto && <div id="datos-modulo-plantilla" className="grid gap-4 border-t border-line p-4 md:grid-cols-2">
                  <label className="text-sm font-semibold">Nombre del módulo *<input className={`${campo} mt-1`} value={actual.titulo} maxLength={180} onChange={e => setActual({ ...actual, titulo: e.target.value })} /></label>
                  <label className="text-sm font-semibold">Descripción del módulo<textarea className={`${campo} mt-1`} rows={2} value={actual.descripcion || ""} onChange={e => setActual({ ...actual, descripcion: e.target.value })} /></label>
                </div>}
              </div>
              <div className="my-5 flex items-center justify-between border-b border-line pb-2"><h3 className="font-bold">Tareas del módulo</h3><button type="button" onClick={() => setActual({ ...actual, actividades: [...actual.actividades, nuevaActividad()] })} className="flex items-center gap-1 text-sm font-semibold text-accent"><Plus size={15} /> Agregar tarea</button></div>
              {actual.actividades.length === 0 && <p className="mb-4 text-sm text-red-600">Agrega al menos una tarea para guardar la plantilla.</p>}
              <div className="space-y-3">{actual.actividades.map((a, i) => <div key={`${a.id || "nueva"}-${i}`} className="rounded-xl border border-line bg-paper-sunken/40">
                <div className="flex items-center gap-2 p-3">
                  <button type="button" aria-expanded={tareasAbiertas.has(i)} aria-controls={`datos-tarea-plantilla-${i}`} onClick={() => alternarTarea(i)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left hover:bg-paper-sunken">
                    <ChevronDown size={17} className={`shrink-0 transition-transform ${tareasAbiertas.has(i) ? "rotate-180" : ""}`} />
                    <span className="min-w-0"><span className="block text-xs font-semibold text-ink-soft">Tarea {i + 1}</span><span className="block truncate text-sm font-bold">{a.titulo || "Tarea sin nombre"}</span></span>
                  </button>
                  <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => moverActividad(i, -1)} disabled={i === 0} aria-label="Subir tarea" className="disabled:opacity-30"><ArrowUp size={16} /></button>
                  <button type="button" onClick={() => moverActividad(i, 1)} disabled={i === actual.actividades.length - 1} aria-label="Bajar tarea" className="disabled:opacity-30"><ArrowDown size={16} /></button>
                  <button type="button" onClick={() => quitarActividad(i)} aria-label="Eliminar tarea" className="text-red-600"><Trash2 size={16} /></button>
                </div></div>
                {tareasAbiertas.has(i) && <div id={`datos-tarea-plantilla-${i}`} className="border-t border-line p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-semibold">Nombre de la tarea *<input className={`${campo} mt-1`} value={a.titulo} maxLength={180} onChange={e => actualizarActividad(i, { titulo: e.target.value })} /></label>
                  <label className="text-xs font-semibold">Formatos permitidos<input className={`${campo} mt-1`} value={a.tiposArchivosPermitidos || ""} placeholder=".pdf, .docx" onChange={e => actualizarActividad(i, { tiposArchivosPermitidos: e.target.value })} /></label>
                  <label className="text-xs font-semibold md:col-span-2">Descripción e indicaciones<textarea className={`${campo} mt-1`} rows={2} value={a.descripcion || ""} onChange={e => actualizarActividad(i, { descripcion: e.target.value })} /></label>
                  <label className="text-xs font-semibold">Tamaño máximo (MB)<input type="number" min={1} className={`${campo} mt-1`} value={a.tamanoMaximoMb ?? 15} onChange={e => actualizarActividad(i, { tamanoMaximoMb: Number(e.target.value) })} /></label>
                  <label className="text-xs font-semibold">Puntaje máximo<input type="number" min={0} step="0.1" className={`${campo} mt-1`} value={a.puntajeMaximo ?? 100} onChange={e => actualizarActividad(i, { puntajeMaximo: Number(e.target.value) })} /></label>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={a.visibleJurados} onChange={e => actualizarActividad(i, { visibleJurados: e.target.checked })} /> Visible para jurados</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={a.entregaGrupal} onChange={e => actualizarActividad(i, { entregaGrupal: e.target.checked })} /> Entrega grupal</label>
                </div>
                <div className="mt-4 border-t border-line pt-3">
                  <label className="text-xs font-bold">Archivos de indicaciones</label>
                  <input type="file" disabled={subiendo === i} onChange={e => { void subirAdjunto(i, e.target.files?.[0]); e.target.value = ""; }} className="mt-2 block w-full text-xs text-ink-soft" />
                  {subiendo === i && <p className="mt-1 text-xs text-ink-soft">Subiendo archivo...</p>}
                  {(a.adjuntos || []).map((adjunto, j) => <div key={`${adjunto.ruta}-${j}`} className="mt-2 flex items-center gap-2 rounded-lg bg-paper-sunken p-2 text-xs">
                    <span className="min-w-0 flex-1 truncate">{adjunto.nombre}</span>
                    <button type="button" aria-label={`Quitar ${adjunto.nombre}`} onClick={() => actualizarActividad(i, { adjuntos: a.adjuntos?.filter((_, k) => k !== j) })} className="text-red-600"><Trash2 size={14} /></button>
                  </div>)}
                </div>
                <div className="mt-4 border-t border-line pt-3">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold">Rúbrica de evaluación</span><button type="button" onClick={() => actualizarActividad(i, { rubrica: [...(a.rubrica || []), { nombre: "", descripcion: "", puntajeMaximo: 0 }] })} className="flex items-center gap-1 text-xs font-semibold text-accent"><Plus size={14} /> Agregar criterio</button></div>
                  {(a.rubrica || []).map((criterio, j) => <div key={j} className="mt-2 grid gap-2 rounded-lg bg-paper-sunken p-2 md:grid-cols-[1fr_1fr_110px_auto]">
                    <input className={campo} aria-label="Nombre del criterio" placeholder="Criterio" value={criterio.nombre} onChange={e => actualizarActividad(i, { rubrica: a.rubrica?.map((c, k) => k === j ? { ...c, nombre: e.target.value } : c) })} />
                    <input className={campo} aria-label="Descripción del criterio" placeholder="Descripción" value={criterio.descripcion || ""} onChange={e => actualizarActividad(i, { rubrica: a.rubrica?.map((c, k) => k === j ? { ...c, descripcion: e.target.value } : c) })} />
                    <input className={campo} aria-label="Puntaje del criterio" type="number" min={0} step="0.1" value={criterio.puntajeMaximo} onChange={e => actualizarActividad(i, { rubrica: a.rubrica?.map((c, k) => k === j ? { ...c, puntajeMaximo: Number(e.target.value) } : c) })} />
                    <button type="button" aria-label="Quitar criterio" onClick={() => actualizarActividad(i, { rubrica: a.rubrica?.filter((_, k) => k !== j) })} className="text-red-600"><Trash2 size={16} /></button>
                  </div>)}
                </div>
                </div>}
              </div>)}</div>
              <p className="mt-4 text-xs text-ink-soft">Las tareas creadas desde una plantilla quedan ocultas hasta definir sus fechas en la convocatoria.</p>
              <button type="button" disabled={guardando} onClick={() => void guardar()} className="mt-5 flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Save size={16} /> {guardando ? "Guardando..." : "Guardar plantilla"}</button>
            </>}
          </section>
        </div>
      </>}
    </main>

    {modalTipos && autorizado && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Tipos de convocatoria">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-paper-raised p-5 text-ink shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Tipos de convocatoria</h2><button type="button" aria-label="Cerrar" onClick={() => setModalTipos(false)}><X size={20} /></button></div>
        <p className="mt-2 text-sm text-ink-soft">Selecciona y ordena las plantillas que se crearán automáticamente. Los cambios solo afectan convocatorias futuras.</p>
        <div className="mt-4 flex flex-wrap gap-2">{TIPOS.map(tipo => <button key={tipo.id} type="button" onClick={() => elegirTipo(tipo.id)} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${tipoActivo === tipo.id ? "border-accent bg-accent text-white" : "border-line"}`}>{tipo.label}</button>)}</div>
        <section className="mt-5" aria-label="Plantillas asignadas">
          <h3 className="mb-2 text-sm font-bold">Plantillas asignadas ({seleccion.length})</h3>
          {seleccion.length === 0 ? <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">Este tipo de convocatoria aún no tiene plantillas asignadas.</p>
            : <div className="max-h-56 space-y-2 overflow-y-auto pr-1">{seleccion.map((id, i) => <div key={id} className="flex items-center gap-2 rounded-xl bg-paper-sunken p-2 text-sm"><span className="w-6 text-center font-bold">{i + 1}</span><span className="min-w-0 flex-1 truncate" title={plantillas.find(p => p.id === id)?.titulo}>{plantillas.find(p => p.id === id)?.titulo}</span><button type="button" disabled={i === 0} onClick={() => moverAsignacion(i, -1)} aria-label={`Subir ${plantillas.find(p => p.id === id)?.titulo}`} className="disabled:opacity-30"><ArrowUp size={16} /></button><button type="button" disabled={i === seleccion.length - 1} onClick={() => moverAsignacion(i, 1)} aria-label={`Bajar ${plantillas.find(p => p.id === id)?.titulo}`} className="disabled:opacity-30"><ArrowDown size={16} /></button><button type="button" onClick={() => setSeleccion(prev => prev.filter(x => x !== id))} aria-label={`Quitar ${plantillas.find(p => p.id === id)?.titulo}`} className="text-red-600"><X size={16} /></button></div>)}</div>}
        </section>
        <section className="mt-5" aria-label="Buscar plantillas disponibles">
          <h3 className="mb-2 text-sm font-bold">Añadir plantilla</h3>
          <div className="relative"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" /><input type="search" value={busquedaPlantilla} onChange={e => setBusquedaPlantilla(e.target.value)} placeholder="Buscar plantilla por nombre..." aria-label="Buscar plantilla por nombre" className={`${campo} pl-10`} /></div>
          <p className="mt-2 text-xs text-ink-soft">{disponibles.length} plantilla{disponibles.length === 1 ? "" : "s"} disponible{disponibles.length === 1 ? "" : "s"}</p>
          <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">{disponiblesMostradas.map(p => <button key={p.id} type="button" onClick={() => setSeleccion(prev => [...prev, p.id!])} className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left text-sm hover:border-accent hover:bg-accent/5"><Plus size={16} className="shrink-0 text-accent" /><span className="min-w-0 flex-1 truncate font-semibold" title={p.titulo}>{p.titulo}</span><span className="shrink-0 text-xs text-ink-soft">{p.actividades.length} tarea{p.actividades.length === 1 ? "" : "s"}</span></button>)}</div>
          {disponibles.length > 10 && <p className="mt-2 text-xs text-ink-soft">Mostrando 10 resultados. Escribe un nombre para encontrar otras plantillas.</p>}
          {disponibles.length === 0 && <p className="mt-2 rounded-xl border border-dashed border-line p-3 text-sm text-ink-soft">No hay plantillas disponibles con ese nombre.</p>}
        </section>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        {mensaje && <p role="status" className="mt-3 text-sm text-green-600">{mensaje}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setModalTipos(false)} className="rounded-xl border border-line px-4 py-2 text-sm">Cerrar</button><button type="button" disabled={guardando} onClick={() => void guardarTipo()} className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Guardar cambios</button></div>
      </div>
    </div>}
  </DashboardLayout>;
}
