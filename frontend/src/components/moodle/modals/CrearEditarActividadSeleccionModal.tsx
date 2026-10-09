import React, { useState, useEffect } from "react";
import { ListPlus } from "lucide-react";
import {
  api,
  ActividadGrupoDTO,
  CrearActividadGrupoRequest,
} from "@/lib/api";
import { formatForDateTimeLocal, formatDateTimeForBackend } from "../moodleUtils";

interface CrearEditarActividadSeleccionModalProps {
  isOpen: boolean;
  onClose: () => void;
  convocatoriaId: number;
  editingActividad: ActividadGrupoDTO | null;
  onSuccess: (actividad: ActividadGrupoDTO) => Promise<void> | void;
  toast: (text: string, type?: "success" | "error" | "info") => void;
}

export default function CrearEditarActividadSeleccionModal({
  isOpen,
  onClose,
  convocatoriaId,
  editingActividad,
  onSuccess,
  toast,
}: CrearEditarActividadSeleccionModalProps) {
  const [titulo, setTitulo] = useState("Seleccionar grupo para 1er examen parcial");
  const [descripcion, setDescripcion] = useState(
    "Seleccionar número de grupo según se les asignó en la hoja que presentaron en clases."
  );
  const [fechaApertura, setFechaApertura] = useState("");
  const [fechaCierre, setFechaCierre] = useState("");
  const [capacidadPorGrupo, setCapacidadPorGrupo] = useState(5);
  const [permitirCambio, setPermitirCambio] = useState(true);
  const [mostrarMiembros, setMostrarMiembros] = useState(true);
  const [generarGrupos, setGenerarGrupos] = useState(true);
  const [cantidadGrupos, setCantidadGrupos] = useState(10);
  const [prefijoGrupos, setPrefijoGrupos] = useState("Gr1erPar ");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (editingActividad) {
      setTitulo(editingActividad.titulo || "");
      setDescripcion(editingActividad.descripcion || "");
      setFechaApertura(formatForDateTimeLocal(editingActividad.fechaApertura));
      setFechaCierre(formatForDateTimeLocal(editingActividad.fechaCierre));
      setCapacidadPorGrupo(editingActividad.capacidadPorGrupo || 5);
      setPermitirCambio(editingActividad.permitirCambio ?? true);
      setMostrarMiembros(editingActividad.mostrarMiembros ?? true);
      setGenerarGrupos(false);
    } else {
      setTitulo("Seleccionar grupo para 1er examen parcial");
      setDescripcion("Seleccionar número de grupo según se les asignó en la hoja que presentaron en clases.");
      const now = new Date();
      const nowStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextWeekStr = new Date(nextWeek.getTime() - nextWeek.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setFechaApertura(nowStr);
      setFechaCierre(nextWeekStr);
      setCapacidadPorGrupo(5);
      setPermitirCambio(true);
      setMostrarMiembros(true);
      setGenerarGrupos(true);
      setCantidadGrupos(10);
      setPrefijoGrupos("Gr1erPar ");
    }
  }, [editingActividad, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast("El título de la actividad es obligatorio", "error");
      return;
    }
    try {
      setGuardando(true);
      const req: CrearActividadGrupoRequest = {
        convocatoriaId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        fechaApertura: formatDateTimeForBackend(fechaApertura),
        fechaCierre: formatDateTimeForBackend(fechaCierre),
        capacidadPorGrupo: capacidadPorGrupo > 0 ? capacidadPorGrupo : 5,
        permitirCambio,
        mostrarMiembros,
        generarGrupos: editingActividad ? false : generarGrupos,
        cantidadGrupos,
        prefijoGrupos: prefijoGrupos.trim() || "Gr1erPar ",
      };

      let result: ActividadGrupoDTO;
      if (editingActividad) {
        result = await api.actualizarActividadGrupo(convocatoriaId, editingActividad.id, req);
        toast(`Actividad "${result.titulo}" actualizada exitosamente`, "success");
      } else {
        result = await api.crearActividadGrupo(convocatoriaId, req);
        toast(`Actividad "${result.titulo}" creada exitosamente`, "success");
      }
      onClose();
      await onSuccess(result);
    } catch (err: any) {
      toast(err.message || "Error al guardar actividad de selección", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-200">
      <div className="bg-paper/95 dark:bg-slate-900/95 backdrop-blur-xl border border-line/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-accent" />
            {editingActividad
              ? "Editar Plazos y Reglas de Actividad"
              : "Nueva Actividad: Selección de Grupo (Moodle Choice)"}
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
            <label className="font-semibold text-ink block mb-1">Título de la Actividad *</label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Seleccionar grupo para 1er examen parcial"
              className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="font-semibold text-ink block mb-1">Instrucciones para los Estudiantes</label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Seleccionar número de grupo según se les asignó en la hoja que presentaron en clases..."
              className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-ink block mb-1">Fecha y Hora de Apertura</label>
              <input
                type="datetime-local"
                value={fechaApertura}
                onChange={(e) => setFechaApertura(e.target.value)}
                className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="font-semibold text-ink block mb-1">Fecha y Hora de Cierre (Límite)</label>
              <input
                type="datetime-local"
                value={fechaCierre}
                onChange={(e) => setFechaCierre(e.target.value)}
                className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-ink block mb-1">Límite de Cupos por Grupo</label>
            <input
              type="number"
              min={1}
              max={100}
              value={capacidadPorGrupo}
              onChange={(e) => setCapacidadPorGrupo(Number(e.target.value))}
              className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
            />
          </div>

          {/* Reglas de Elección de Grupo (Paridad Moodle) */}
          <div className="space-y-2.5 pt-2 border-t border-line-soft">
            <span className="font-semibold text-ink block text-[11px] uppercase tracking-wider text-ink-faint">
              Reglas y Visibilidad
            </span>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={permitirCambio}
                onChange={(e) => setPermitirCambio(e.target.checked)}
                className="w-4 h-4 text-accent rounded focus:ring-accent cursor-pointer"
              />
              <span className="text-ink">
                Permitir a los estudiantes cambiar de grupo mientras la actividad esté abierta
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarMiembros}
                onChange={(e) => setMostrarMiembros(e.target.checked)}
                className="w-4 h-4 text-accent rounded focus:ring-accent cursor-pointer"
              />
              <span className="text-ink">
                Mostrar los estudiantes registrados en cada grupo a sus compañeros
              </span>
            </label>
          </div>

          {/* Generación automática de grupos iniciales (sólo al crear) */}
          {!editingActividad && (
            <div className="bg-paper-sunken/60 p-4 rounded-xl border border-line space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generarGrupos}
                  onChange={(e) => setGenerarGrupos(e.target.checked)}
                  className="w-4 h-4 text-accent rounded focus:ring-accent cursor-pointer"
                />
                <b className="text-ink">Generar grupos automáticamente para esta actividad</b>
              </label>

              {generarGrupos && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line-soft">
                  <div>
                    <label className="text-[10px] font-semibold text-ink-faint block mb-1">
                      Cantidad de Grupos
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={cantidadGrupos}
                      onChange={(e) => setCantidadGrupos(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-paper border border-line rounded-lg text-ink focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-ink-faint block mb-1">
                      Prefijo
                    </label>
                    <input
                      type="text"
                      value={prefijoGrupos}
                      onChange={(e) => setPrefijoGrupos(e.target.value)}
                      placeholder="Gr1erPar "
                      className="w-full px-2.5 py-1.5 bg-paper border border-line rounded-lg text-ink focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

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
              disabled={guardando}
              className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {guardando
                ? "Guardando..."
                : editingActividad
                ? "Guardar Cambios"
                : "Publicar Actividad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
