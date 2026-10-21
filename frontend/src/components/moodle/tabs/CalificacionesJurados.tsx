"use client";

import { useCallback, useEffect, useState } from "react";
import { Award, Eye, RefreshCw, X } from "lucide-react";
import { CalificacionGrupoJurado, EvaluacionJuradoDTO, juradoAPI } from "@/lib/api";

export default function CalificacionesJurados({ convocatoriaId }: { convocatoriaId: number }) {
  const [grupos, setGrupos] = useState<CalificacionGrupoJurado[]>([]);
  const [seleccionado, setSeleccionado] = useState<CalificacionGrupoJurado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const cargar = useCallback(async () => {
    try { setCargando(true); setGrupos(await juradoAPI.calificaciones(convocatoriaId)); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudieron cargar las evaluaciones de jurados."); }
    finally { setCargando(false); }
  }, [convocatoriaId]);
  useEffect(() => { void cargar(); }, [cargar]);

  return <section className="rounded-2xl border border-line bg-paper p-5 text-ink">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 text-lg font-bold"><Award size={19} className="text-accent" /> Evaluaciones de jurados por grupo</h3><p className="mt-1 text-xs text-ink-soft">La calificación del grupo es el promedio de las evaluaciones enviadas por sus jurados.</p></div><button type="button" onClick={() => void cargar()} className="flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs"><RefreshCw size={14} /> Actualizar</button></div>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    {cargando ? <p className="mt-4 text-sm text-ink-soft">Cargando evaluaciones...</p> : grupos.length === 0
      ? <p className="mt-4 text-sm text-ink-soft">Todavía no hay grupos registrados para evaluación.</p>
      : <div className="mt-4 overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[550px] text-left text-sm"><thead className="bg-paper-sunken text-xs uppercase text-ink-soft"><tr><th className="p-3">Grupo</th><th className="p-3">Proyecto</th><th className="p-3 text-center">Jurados que evaluaron</th><th className="p-3 text-center">Promedio /100</th><th className="p-3 text-right">Formularios</th></tr></thead><tbody className="divide-y divide-line">{grupos.map(g => <tr key={`${g.tipo}-${g.proyectoId}`}><td className="p-3 font-bold">{g.codigo || `#${g.proyectoId}`}</td><td className="p-3">{g.nombre}</td><td className="p-3 text-center">{g.cantidadEvaluaciones}</td><td className="p-3 text-center font-bold">{g.promedio === null ? "Pendiente" : g.promedio.toFixed(2)}</td><td className="p-3 text-right"><button type="button" disabled={!g.cantidadEvaluaciones} onClick={() => setSeleccionado(g)} className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-accent disabled:cursor-not-allowed disabled:opacity-40"><Eye size={14} /> Ver</button></td></tr>)}</tbody></table></div>}

    {seleccionado && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3 md:p-6" role="dialog" aria-modal="true" aria-label={`Formularios del grupo ${seleccionado.codigo}`}>
      <div className="mx-auto max-w-5xl rounded-xl bg-white p-5 text-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{seleccionado.codigo || seleccionado.nombre} · {seleccionado.nombre}</h2><p className="text-sm">{seleccionado.cantidadEvaluaciones} evaluación(es) · Promedio: <strong>{seleccionado.promedio?.toFixed(2)}/100</strong></p></div><button type="button" aria-label="Cerrar" onClick={() => setSeleccionado(null)}><X size={20} /></button></div>
        <div className="mt-5 space-y-6">{seleccionado.evaluaciones.map(e => <FormularioLeido key={e.id} evaluacion={e} />)}</div>
      </div>
    </div>}
  </section>;
}

function FormularioLeido({ evaluacion }: { evaluacion: EvaluacionJuradoDTO }) {
  return <article className="rounded-xl border border-slate-300 p-4">
    <div className="text-center text-sm font-bold uppercase">{evaluacion.formulario.titulo}</div>
    <div className="text-center text-xs">{evaluacion.formulario.subtitulo}</div>
    <div className="mt-3 bg-amber-100 p-2 text-sm"><strong>Profesor revisor:</strong> {evaluacion.juradoNombre} <span className="ml-3 text-xs">{new Date(evaluacion.fechaEnvio).toLocaleString("es-BO")}</span></div>
    <div className="mt-4 space-y-4">{evaluacion.formulario.secciones.map((s, i) => <section key={s.id}>
      <div className="flex justify-between bg-slate-200 px-2 py-1 text-sm font-bold"><span>{i + 1}. {s.titulo}</span><span>{s.peso}%</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[550px] border-collapse text-xs"><thead><tr className="bg-slate-200"><th className="border border-slate-400 p-1 text-left">TÓPICOS A EVALUAR</th>{["R", "B", "E", "NA"].map(v => <th key={v} className="w-11 border border-slate-400 p-1">{v}</th>)}</tr></thead><tbody>{s.criterios.map(c => <tr key={c.id} className="bg-lime-50"><td className="border border-slate-400 p-1.5">{c.texto}</td>{["R", "B", "E", "NA"].map(v => <td key={v} className="border border-slate-400 text-center font-bold">{evaluacion.valores[c.id] === v ? "✓" : ""}</td>)}</tr>)}{s.indicacion && <tr className="bg-lime-100"><td colSpan={5} className="border border-slate-400 p-1.5 italic">{s.indicacion}</td></tr>}</tbody></table></div>
    </section>)}</div>
    <div className="mt-4 border border-slate-400 p-2 text-sm"><strong>Comentarios finales:</strong> {evaluacion.comentarios || "Sin comentarios"}</div>
    <p className="mt-2 text-right font-bold">NOTA FINAL = {evaluacion.notaFinal.toFixed(2)}/100</p>
  </article>;
}
