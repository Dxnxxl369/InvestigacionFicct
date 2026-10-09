import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { api, ActividadGrupoDTO } from "@/lib/api";

interface GenerarLoteGruposModalProps {
  isOpen: boolean;
  onClose: () => void;
  convocatoriaId: number;
  actividadActiva?: ActividadGrupoDTO | null;
  onSuccess: () => Promise<void> | void;
  toast: (text: string, type?: "success" | "error" | "info") => void;
}

export default function GenerarLoteGruposModal({
  isOpen,
  onClose,
  convocatoriaId,
  actividadActiva,
  onSuccess,
  toast,
}: GenerarLoteGruposModalProps) {
  const [lotePrefijo, setLotePrefijo] = useState("Gr1erPar ");
  const [loteCantidad, setLoteCantidad] = useState(10);
  const [loteCapacidad, setLoteCapacidad] = useState(5);
  const [generandoLote, setGenerandoLote] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loteCantidad <= 0 || loteCantidad > 100) {
      toast("La cantidad de grupos debe estar entre 1 y 100", "error");
      return;
    }
    try {
      setGenerandoLote(true);
      await api.generarLoteGrupos(convocatoriaId, {
        prefijo: lotePrefijo.trim() ? lotePrefijo : "Gr1erPar ",
        cantidad: loteCantidad,
        capacidadMaxima: loteCapacidad > 0 ? loteCapacidad : 5,
        actividadGrupoId: actividadActiva?.id,
      });
      toast(`¡Se han generado ${loteCantidad} grupos exitosamente!`, "success");
      onClose();
      await onSuccess();
    } catch (err: any) {
      toast(err.message || "Error al generar lote de grupos", "error");
    } finally {
      setGenerandoLote(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-200">
      <div className="bg-paper/95 dark:bg-slate-900/95 backdrop-blur-xl border border-line/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" /> Generar Lote de Grupos
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
          <p className="text-ink-soft leading-relaxed">
            Crea automáticamente múltiples grupos secuenciales con un mismo prefijo y límite de integrantes (por ejemplo: <code>Gr1erPar 1</code> hasta <code>Gr1erPar 10</code>).
          </p>

          <div>
            <label className="font-semibold text-ink block mb-1">Prefijo de Nombre *</label>
            <input
              type="text"
              required
              value={lotePrefijo}
              onChange={(e) => setLotePrefijo(e.target.value)}
              placeholder="Ej. Gr1erPar  o Grupo "
              className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-ink block mb-1">Cantidad de Grupos *</label>
              <input
                type="number"
                required
                min={1}
                max={100}
                value={loteCantidad}
                onChange={(e) => setLoteCantidad(Number(e.target.value))}
                className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="font-semibold text-ink block mb-1">Cupo por Grupo *</label>
              <input
                type="number"
                required
                min={1}
                max={100}
                value={loteCapacidad}
                onChange={(e) => setLoteCapacidad(Number(e.target.value))}
                className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
              />
            </div>
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
              disabled={generandoLote}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {generandoLote ? "Generando Lote..." : `Generar ${loteCantidad} Grupos`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
