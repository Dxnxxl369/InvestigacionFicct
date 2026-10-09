import React, { useState } from "react";
import { PlusCircle } from "lucide-react";
import { api, ActividadGrupoDTO } from "@/lib/api";

interface CrearGrupoModalProps {
  isOpen: boolean;
  onClose: () => void;
  convocatoriaId: number;
  actividadActiva?: ActividadGrupoDTO | null;
  onSuccess: () => Promise<void> | void;
  toast: (text: string, type?: "success" | "error" | "info") => void;
}

export default function CrearGrupoModal({
  isOpen,
  onClose,
  convocatoriaId,
  actividadActiva,
  onSuccess,
  toast,
}: CrearGrupoModalProps) {
  const [nuevoGrupoNombre, setNuevoGrupoNombre] = useState("");
  const [nuevoGrupoDesc, setNuevoGrupoDesc] = useState("");
  const [nuevoGrupoCapacidad, setNuevoGrupoCapacidad] = useState(5);
  const [creandoGrupo, setCreandoGrupo] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoGrupoNombre.trim()) {
      toast("El nombre del grupo es obligatorio", "error");
      return;
    }
    try {
      setCreandoGrupo(true);
      await api.crearGrupo(convocatoriaId, {
        nombre: nuevoGrupoNombre.trim(),
        descripcion: nuevoGrupoDesc.trim() || undefined,
        capacidadMaxima: nuevoGrupoCapacidad > 0 ? nuevoGrupoCapacidad : undefined,
        actividadGrupoId: actividadActiva?.id,
      });
      toast(`Grupo "${nuevoGrupoNombre.trim()}" creado exitosamente`, "success");
      setNuevoGrupoNombre("");
      setNuevoGrupoDesc("");
      setNuevoGrupoCapacidad(5);
      onClose();
      await onSuccess();
    } catch (err: any) {
      toast(err.message || "Error al crear el grupo", "error");
    } finally {
      setCreandoGrupo(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-200">
      <div className="bg-paper/95 dark:bg-slate-900/95 backdrop-blur-xl border border-line/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-accent" /> Crear Nuevo Grupo
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-faint hover:text-ink text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-ink block mb-1">Nombre del Grupo *</label>
            <input
              type="text"
              required
              value={nuevoGrupoNombre}
              onChange={(e) => setNuevoGrupoNombre(e.target.value)}
              placeholder="Ej. Gr1erPar 1 o Grupo Alfa"
              className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="font-semibold text-ink block mb-1">Descripción (Opcional)</label>
            <textarea
              rows={2}
              value={nuevoGrupoDesc}
              onChange={(e) => setNuevoGrupoDesc(e.target.value)}
              placeholder="Ej. Grupo de laboratorio y defensa de proyectos..."
              className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div>
            <label className="font-semibold text-ink block mb-1">
              Capacidad Máxima de Integrantes
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={nuevoGrupoCapacidad}
              onChange={(e) => setNuevoGrupoCapacidad(Number(e.target.value))}
              className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
            />
            <span className="text-[11px] text-ink-faint mt-1 block">
              Por defecto: 5 integrantes como en Moodle.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-line rounded-xl text-ink hover:bg-paper-sunken cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creandoGrupo}
              className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {creandoGrupo ? "Creando..." : "Crear Grupo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
