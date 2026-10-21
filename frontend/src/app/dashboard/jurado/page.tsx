"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { DetalleGrupoJurado, GrupoAsignadoJurado, juradoAPI, getMediaUrl } from "@/lib/api";
import { ArrowLeft, Award, Eye, FileText, Users, X } from "lucide-react";

type Nota = "R" | "B" | "E" | "NA";
const opciones: { valor: Nota; titulo: string }[] = [
  { valor: "R", titulo: "Regular" }, { valor: "B", titulo: "Bien" },
  { valor: "E", titulo: "Excelente" }, { valor: "NA", titulo: "No aplica" },
];
const calcularNota = (detalle: DetalleGrupoJurado, valores: Record<string, Nota>) => {
  const secciones = detalle.formulario.secciones;
  if (secciones.some(s => s.criterios.some(c => !valores[c.id]))) return null;
  const total = secciones.reduce((suma, seccion) => {
    const aplicables = seccion.criterios.map(c => valores[c.id]).filter(v => v !== "NA");
    if (!aplicables.length) return suma;
    const puntos = aplicables.reduce((acumulado, valor) => acumulado + (valor === "R" ? 1 : valor === "B" ? 2 : 3), 0);
    return suma + seccion.peso * puntos / (3 * aplicables.length);
  }, 0);
  return Math.round(total * 100) / 100;
};

export default function JuradoPage() {
  const { user } = useAuth();
  const [grupos, setGrupos] = useState<GrupoAsignadoJurado[]>([]);
  const [detalle, setDetalle] = useState<DetalleGrupoJurado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [valores, setValores] = useState<Record<string, Nota>>({});
  const [comentarios, setComentarios] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const cargarGrupos = useCallback(async () => {
    try { setCargando(true); setGrupos(await juradoAPI.grupos()); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudieron cargar los grupos."); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { if (user?.rol === "JURADO") void cargarGrupos(); }, [user?.rol, cargarGrupos]);

  const abrirGrupo = async (grupo: GrupoAsignadoJurado) => {
    try {
      setCargando(true); setError("");
      setDetalle(await juradoAPI.detalle(grupo.convocatoriaId, grupo.tipo, grupo.proyectoId));
      setFormularioAbierto(false); setValores({}); setComentarios("");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo abrir el grupo."); }
    finally { setCargando(false); }
  };

  const abrirFormulario = () => {
    if (!detalle) return;
    setValores(detalle.evaluacion?.valores || {});
    setComentarios(detalle.evaluacion?.comentarios || "");
    setFormularioAbierto(true);
  };

  const enviar = async () => {
    if (!detalle || detalle.evaluacion) return;
    const criterios = detalle.formulario.secciones.flatMap(s => s.criterios);
    if (criterios.some(c => !valores[c.id])) { setError("Marca una opción en cada criterio antes de enviar."); return; }
    if (!window.confirm(`¿Confirmas el envío definitivo de la evaluación de ${detalle.grupo.codigo || detalle.grupo.nombre}? Después podrás consultarla, pero no modificarla.`)) return;
    try {
      setEnviando(true); setError("");
      const evaluacion = await juradoAPI.evaluar(detalle.grupo.convocatoriaId, detalle.grupo.tipo,
        detalle.grupo.proyectoId, valores, comentarios, detalle.formularioRevision);
      setDetalle({ ...detalle, evaluacion });
      setGrupos(prev => prev.map(g => g.convocatoriaId === detalle.grupo.convocatoriaId
        && g.tipo === detalle.grupo.tipo && g.proyectoId === detalle.grupo.proyectoId ? { ...g, evaluado: true } : g));
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo enviar la evaluación."); }
    finally { setEnviando(false); }
  };

  return <DashboardLayout>
    <main className="mx-auto max-w-6xl space-y-5 p-5 text-ink md:p-8">
      {user?.rol !== "JURADO" ? <div className="rounded-xl border border-line bg-paper p-6">Esta sección es exclusiva para jurados.</div> : <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-accent">Evaluación de proyectos</p>
            <h1 className="text-3xl font-bold">Mis grupos para calificar</h1>
          </div>
          {detalle && <button type="button" onClick={() => setDetalle(null)} className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-sm"><ArrowLeft size={16} /> Volver al listado</button>}
        </div>
        {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950">{error}</p>}
        {cargando && <p className="text-sm text-ink-soft">Cargando...</p>}
        {!cargando && !detalle && (grupos.length === 0
          ? <div className="rounded-2xl border border-line bg-paper p-8 text-center text-ink-soft">Aún no tienes grupos asignados para evaluar.</div>
          : <div className="grid gap-3 md:grid-cols-2">{grupos.map(g => <button key={`${g.convocatoriaId}-${g.tipo}-${g.proyectoId}`}
              type="button" onClick={() => void abrirGrupo(g)} className="rounded-2xl border border-line bg-paper p-5 text-left hover:border-accent hover:shadow-sm">
              <span className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-ink-soft">{g.convocatoriaTitulo}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${g.evaluado ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>{g.evaluado ? "Evaluado" : "Pendiente"}</span></span>
              <span className="mt-3 flex items-center gap-2 text-lg font-bold"><Users size={18} className="text-accent" /> {g.codigo || g.nombre}</span>
              <span className="mt-1 block text-sm text-ink-soft">{g.nombre}</span>
            </button>)}</div>)}
        {!cargando && detalle && <>
          <div className="rounded-2xl border border-line bg-paper p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Convocatoria</p>
            <h2 className="mt-1 text-2xl font-bold">{detalle.grupo.convocatoriaTitulo}</h2>
            <p className="mt-2 text-sm"><strong>{detalle.grupo.codigo || detalle.grupo.nombre}</strong> · {detalle.grupo.nombre}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">{detalle.materia && <span>Materia: {detalle.materia}</span>}{detalle.docente && <span>Docente: {detalle.docente}</span>}</div>
          </div>
          <section className="rounded-2xl border border-line bg-paper p-5">
            <h3 className="flex items-center gap-2 text-lg font-bold"><FileText size={19} className="text-accent" /> Documentación para el jurado</h3>
            <p className="mt-1 text-xs text-ink-soft">Se muestran únicamente las tareas habilitadas para vista de jurados y los archivos enviados por este grupo.</p>
            {detalle.tareas.length === 0 && <p className="mt-4 text-sm text-ink-soft">No hay tareas marcadas para jurados.</p>}
            <div className="mt-4 space-y-3">{detalle.tareas.map(t => <div key={t.id} className="rounded-xl border border-line p-4">
              <h4 className="font-semibold">{t.titulo}</h4>{t.descripcion && <p className="mt-1 whitespace-pre-line text-xs text-ink-soft">{t.descripcion}</p>}
              {t.entregas.length === 0 ? <p className="mt-3 text-sm text-ink-soft">Sin archivos entregados por este grupo.</p> : <div className="mt-3 space-y-2">{t.entregas.map(e => <div key={e.id} className="rounded-lg bg-paper-sunken p-3 text-sm">
                <div className="font-medium">{e.estudiante}</div>
                {e.comentario && <p className="mt-1 text-xs text-ink-soft">{e.comentario}</p>}
                {e.archivoUrl ? e.archivoUrl.split(",").map((url, i) => <a key={`${e.id}-${i}`} href={getMediaUrl(url.trim())} target="_blank" rel="noopener noreferrer" className="mt-2 mr-3 inline-flex items-center gap-1 text-accent hover:underline"><Eye size={15} /> {e.nombreArchivo?.split(",")[i]?.trim() || `Archivo ${i + 1}`}</a>) : <span className="mt-2 block text-xs text-ink-soft">Entrega sin archivo adjunto.</span>}
              </div>)}</div>}
            </div>)}</div>
          </section>
          <div className="flex items-center justify-between rounded-2xl border border-line bg-paper p-5">
            <div><h3 className="font-bold">Evaluación del grupo</h3><p className="text-xs text-ink-soft">{detalle.evaluacion ? `Evaluado · Nota final: ${detalle.evaluacion.notaFinal}/100` : "Pendiente de evaluación"}</p></div>
            <button type="button" onClick={abrirFormulario} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white"><Award size={17} /> {detalle.evaluacion ? "Ver evaluación" : "Calificar"}</button>
          </div>
        </>}
      </>}
    </main>

    {formularioAbierto && detalle && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3 md:p-6" role="dialog" aria-modal="true" aria-label="Formulario de evaluación">
      <div className="mx-auto max-w-5xl rounded-xl bg-white p-4 text-slate-950 shadow-2xl md:p-6">
        <div className="flex justify-end"><button type="button" onClick={() => setFormularioAbierto(false)} aria-label="Cerrar formulario"><X size={22} /></button></div>
        <div className="text-center text-sm font-bold uppercase">{detalle.evaluacion?.formulario.titulo || detalle.formulario.titulo}</div>
        <div className="text-center text-xs">{detalle.evaluacion?.formulario.subtitulo || detalle.formulario.subtitulo}</div>
        <div className="mt-5 bg-amber-100 p-3 text-sm"><div><strong>Nombre Proy.:</strong> {detalle.grupo.nombre}</div><div><strong>Materia:</strong> {detalle.materia || "—"}</div><div><strong>Docente:</strong> {detalle.docente || "—"}</div></div>
        <p className="mt-4 bg-lime-100 p-2 text-sm font-semibold">Marca en cada fila: R = Regular, B = Bien, E = Excelente, NA = No aplica. NA se excluye del promedio de su sección.</p>
        <div className="mt-3 space-y-5">{(detalle.evaluacion?.formulario || detalle.formulario).secciones.map((s, i) => <section key={s.id}>
          <div className="flex justify-between bg-slate-200 px-2 py-1 text-sm font-bold"><span>{i + 1}. {s.titulo}</span><span>Nota {s.peso}%</span></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[600px] border-collapse text-xs"><thead><tr className="bg-slate-200"><th className="border border-slate-400 p-1 text-left">TÓPICOS A EVALUAR</th>{opciones.map(o => <th key={o.valor} className="w-11 border border-slate-400 p-1" title={o.titulo}>{o.valor}</th>)}</tr></thead>
            <tbody>{s.criterios.map(c => <tr key={c.id} className="bg-lime-50"><td className="border border-slate-400 p-1.5">{c.texto}</td>{opciones.map(o => <td key={o.valor} className="border border-slate-400 text-center"><input type="radio" name={`criterio-${c.id}`} value={o.valor} aria-label={`${c.texto}: ${o.titulo}`} checked={valores[c.id] === o.valor} disabled={Boolean(detalle.evaluacion)} onChange={() => setValores(prev => ({ ...prev, [c.id]: o.valor }))} /></td>)}</tr>)}{s.indicacion && <tr className="bg-lime-100"><td colSpan={5} className="border border-slate-400 p-1.5 italic">{s.indicacion}</td></tr>}</tbody></table></div>
        </section>)}</div>
        <div className="mt-5 grid gap-2 text-sm"><label className="font-bold">COMENTARIOS FINALES (Opcional)<textarea value={comentarios} disabled={Boolean(detalle.evaluacion)} onChange={e => setComentarios(e.target.value)} rows={3} maxLength={5000} className="mt-1 w-full rounded border border-slate-400 p-2 font-normal" /></label>
          <p><strong>NOMBRE PROFESOR REVISOR:</strong> {detalle.evaluacion?.juradoNombre || `${user?.nombre || ""} ${user?.apellido || ""}`}</p>
          <p className="text-right font-bold">NOTA FINAL = {detalle.evaluacion?.notaFinal ?? calcularNota(detalle, valores) ?? "—"}/100</p>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setFormularioAbierto(false)} className="rounded-lg border border-slate-400 px-4 py-2 text-sm">Cerrar</button>{!detalle.evaluacion && <button type="button" disabled={enviando} onClick={() => void enviar()} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{enviando ? "Enviando..." : "Enviar evaluación"}</button>}</div>
      </div>
    </div>}
  </DashboardLayout>;
}
