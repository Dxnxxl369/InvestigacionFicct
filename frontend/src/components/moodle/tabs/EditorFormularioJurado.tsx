"use client";

import { useEffect, useState } from "react";
import { FormularioEvaluacionJurado, juradoAPI } from "@/lib/api";
import { Plus, Save, Trash2, X } from "lucide-react";

export default function EditorFormularioJurado({ convocatoriaId, onClose, toast }: {
  convocatoriaId: number; onClose: () => void;
  toast: (text: string, type?: "success" | "error" | "info") => void;
}) {
  const [formulario, setFormulario] = useState<FormularioEvaluacionJurado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    juradoAPI.formulario(convocatoriaId).then(setFormulario)
      .catch(e => setError(e instanceof Error ? e.message : "No se pudo cargar el formulario."))
      .finally(() => setCargando(false));
  }, [convocatoriaId]);

  const cambiarSeccion = (index: number, cambios: Partial<FormularioEvaluacionJurado["secciones"][number]>) =>
    setFormulario(prev => prev && ({ ...prev, secciones: prev.secciones.map((s, i) => i === index ? { ...s, ...cambios } : s) }));
  const guardar = async () => {
    if (!formulario) return;
    if (!formulario.titulo.trim()) { setError("Escribe el título del formulario."); return; }
    if (formulario.secciones.length === 0 || formulario.secciones.some(s => !s.titulo.trim() || !s.criterios.length || s.criterios.some(c => !c.texto.trim()))) {
      setError("Todas las secciones deben tener título y criterios con texto."); return;
    }
    if (formulario.secciones.reduce((suma, s) => suma + Number(s.peso), 0) !== 100) {
      setError("Los porcentajes de las secciones deben sumar 100%."); return;
    }
    try {
      setGuardando(true); setError("");
      await juradoAPI.guardarFormulario(convocatoriaId, formulario);
      toast("Formulario de evaluación guardado. Se usará en las próximas evaluaciones.");
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar el formulario."); }
    finally { setGuardando(false); }
  };

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3 md:p-6" role="dialog" aria-modal="true" aria-label="Editar formulario de evaluación">
    <div className="mx-auto max-w-4xl rounded-2xl border border-line bg-paper p-5 text-ink shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Editar formulario de evaluación</h2><p className="mt-1 text-xs text-ink-soft">Las evaluaciones ya enviadas conservan el formulario con el que se realizaron.</p></div><button type="button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>
      {cargando && <p className="mt-5 text-sm text-ink-soft">Cargando...</p>}
      {formulario && <div className="mt-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold">Título<input value={formulario.titulo} maxLength={250} onChange={e => setFormulario({ ...formulario, titulo: e.target.value })} className="mt-1 w-full rounded-xl border border-line bg-paper-sunken p-2 text-sm" /></label>
          <label className="text-sm font-semibold">Subtítulo<input value={formulario.subtitulo || ""} maxLength={250} onChange={e => setFormulario({ ...formulario, subtitulo: e.target.value })} className="mt-1 w-full rounded-xl border border-line bg-paper-sunken p-2 text-sm" /></label>
        </div>
        {formulario.secciones.map((s, i) => <section key={s.id} className="rounded-xl border border-line p-4">
          <div className="flex items-end gap-2"><label className="min-w-0 flex-1 text-sm font-semibold">Sección {i + 1}<input value={s.titulo} maxLength={180} onChange={e => cambiarSeccion(i, { titulo: e.target.value })} className="mt-1 w-full rounded-xl border border-line bg-paper-sunken p-2 text-sm" /></label>
            <label className="w-24 text-sm font-semibold">Peso %<input type="number" min={1} max={100} value={s.peso} onChange={e => cambiarSeccion(i, { peso: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-line bg-paper-sunken p-2 text-sm" /></label>
            <button type="button" onClick={() => setFormulario(prev => prev && ({ ...prev, secciones: prev.secciones.filter((_, j) => j !== i) }))} aria-label={`Eliminar sección ${i + 1}`} className="mb-2 text-red-600"><Trash2 size={17} /></button>
          </div>
          <label className="mt-3 block text-sm font-semibold">Indicación de la sección<input value={s.indicacion || ""} maxLength={500} onChange={e => cambiarSeccion(i, { indicacion: e.target.value })} className="mt-1 w-full rounded-xl border border-line bg-paper-sunken p-2 text-sm" /></label>
          <div className="mt-3 space-y-2">{s.criterios.map((c, j) => <div key={c.id} className="flex items-center gap-2"><span className="w-5 text-xs text-ink-soft">{j + 1}.</span><input aria-label={`Criterio ${j + 1} de ${s.titulo}`} value={c.texto} maxLength={500} onChange={e => cambiarSeccion(i, { criterios: s.criterios.map((item, k) => k === j ? { ...item, texto: e.target.value } : item) })} className="min-w-0 flex-1 rounded-xl border border-line bg-paper-sunken p-2 text-sm" /><button type="button" onClick={() => cambiarSeccion(i, { criterios: s.criterios.filter((_, k) => k !== j) })} aria-label={`Eliminar criterio ${j + 1}`} className="text-red-600"><Trash2 size={15} /></button></div>)}</div>
          <button type="button" onClick={() => cambiarSeccion(i, { criterios: [...s.criterios, { id: crypto.randomUUID(), texto: "" }] })} className="mt-3 flex items-center gap-1 text-sm font-semibold text-accent"><Plus size={15} /> Agregar criterio</button>
        </section>)}
        <button type="button" onClick={() => setFormulario(prev => prev && ({ ...prev, secciones: [...prev.secciones, { id: crypto.randomUUID(), titulo: "", peso: 0, indicacion: "", criterios: [{ id: crypto.randomUUID(), texto: "" }] }] }))} className="flex items-center gap-1 text-sm font-semibold text-accent"><Plus size={16} /> Agregar sección</button>
        <p className="text-sm font-semibold">Suma de pesos: {formulario.secciones.reduce((suma, s) => suma + Number(s.peso), 0)}%</p>
      </div>}
      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-line px-4 py-2 text-sm">Cancelar</button><button type="button" disabled={!formulario || guardando} onClick={() => void guardar()} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save size={16} /> {guardando ? "Guardando..." : "Guardar formulario"}</button></div>
    </div>
  </div>;
}
