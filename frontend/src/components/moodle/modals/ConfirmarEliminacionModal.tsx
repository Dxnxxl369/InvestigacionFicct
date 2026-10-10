"use client";

import React, { useState } from "react";
import { Trash2, AlertTriangle, X, Archive, ShieldAlert } from "lucide-react";

interface ConfirmarEliminacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmEliminar: () => void;
  onArchivar?: () => void;
  loading?: boolean;
  tipo: "TAREA" | "MODULO" | "CONVOCATORIA";
  tituloElemento: string;
  totalEntregas?: number;
  totalParticipantes?: number;
  totalTareas?: number;
}

export default function ConfirmarEliminacionModal({
  isOpen,
  onClose,
  onConfirmEliminar,
  onArchivar,
  loading = false,
  tipo,
  tituloElemento,
  totalEntregas = 0,
  totalParticipantes = 0,
  totalTareas = 0,
}: ConfirmarEliminacionModalProps) {
  const [confirmacionTexto, setConfirmacionTexto] = useState("");

  if (!isOpen) return null;

  const requiereConfirmacionEstricta =
    (tipo === "TAREA" && totalEntregas > 0) ||
    (tipo === "CONVOCATORIA" && (totalParticipantes > 0 || totalTareas > 0));

  const puedeEjecutar = !requiereConfirmacionEstricta || confirmacionTexto.trim().toUpperCase() === "ELIMINAR";

  const getTipoLabel = () => {
    switch (tipo) {
      case "TAREA":
        return "la tarea";
      case "MODULO":
        return "el módulo";
      case "CONVOCATORIA":
        return "el aula o convocatoria";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
      <div className="bg-paper border border-line rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between bg-paper-sunken/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-ink">
                Confirmar eliminación
              </h3>
              <p className="text-xs text-ink-faint">
                Acción destructiva sobre {getTipoLabel()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-ink-faint hover:text-ink rounded-lg hover:bg-paper-sunken transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-ink-soft leading-relaxed">
            ¿Está seguro de que desea eliminar definitivamente{" "}
            <span className="font-bold text-ink">&ldquo;{tituloElemento}&rdquo;</span>?
          </p>

          {/* Advertencia para Tarea con entregas */}
          {tipo === "TAREA" && totalEntregas > 0 && (
            <div className="p-3.5 rounded-xl border border-rose-500/25 bg-rose-500/10 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-700 dark:text-rose-300 space-y-1">
                  <p className="font-bold">
                    Atención: Esta tarea cuenta con {totalEntregas} entrega(s) de estudiantes.
                  </p>
                  <p className="leading-relaxed">
                    Si continúa, se eliminarán de forma irreversible todos los archivos enviados, calificaciones, rúbricas y el historial de versiones.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Advertencia para Módulo */}
          {tipo === "MODULO" && (
            <div className="p-3.5 rounded-xl border border-blue-500/25 bg-blue-500/5 space-y-1">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                Preservación de contenido:
              </p>
              <p className="text-xs text-ink-soft leading-relaxed">
                Las tareas vinculadas a este módulo no se perderán. Pasarán automáticamente a la sección de tareas generales del área sin módulo asignado.
              </p>
            </div>
          )}

          {/* Advertencia para Convocatoria */}
          {tipo === "CONVOCATORIA" && (
            <div className="space-y-3">
              {(totalParticipantes > 0 || totalTareas > 0) && (
                <div className="p-3.5 rounded-xl border border-rose-500/25 bg-rose-500/10 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-rose-700 dark:text-rose-300 space-y-1">
                      <p className="font-bold">
                        Esta área cuenta con datos activos: {totalParticipantes} participante(s) y {totalTareas} tarea(s).
                      </p>
                      <p className="leading-relaxed">
                        La eliminación destruirá todos los módulos, tareas, entregas de estudiantes y registros de miembros del aula.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {onArchivar && (
                <div className="p-3 rounded-xl border border-line bg-paper-sunken/60 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-ink">¿Prefiere archivar el área?</p>
                    <p className="text-[11px] text-ink-faint">
                      Cierra la recepción y el acceso activo pero conserva todo el historial para consultas posteriores.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onArchivar}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg border border-line bg-paper hover:bg-paper-sunken text-xs font-semibold text-ink flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5 text-accent" />
                    Archivar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Confirmación con palabra clave si hay datos en riesgo */}
          {requiereConfirmacionEstricta && (
            <div className="pt-2 border-t border-line space-y-1.5">
              <label className="text-xs font-semibold text-ink block">
                Escriba <span className="font-mono text-rose-600 font-bold">ELIMINAR</span> para confirmar:
              </label>
              <input
                type="text"
                value={confirmacionTexto}
                onChange={(e) => setConfirmacionTexto(e.target.value)}
                placeholder="ELIMINAR"
                className="w-full px-3 py-2 rounded-xl border border-line bg-paper text-ink text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-line bg-paper-sunken/40 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-ink hover:bg-paper-sunken transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmEliminar}
            disabled={loading || !puedeEjecutar}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {loading ? "Eliminando..." : "Eliminar Definitivamente"}
          </button>
        </div>
      </div>
    </div>
  );
}
