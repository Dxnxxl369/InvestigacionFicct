import React, { useState } from "react";
import { UserPlus, XCircle } from "lucide-react";
import { api, ConvocatoriaDTO } from "@/lib/api";

interface InscripcionModalProps {
  isOpen: boolean;
  onClose: () => void;
  convocatoria: ConvocatoriaDTO;
  onSuccess: () => void;
  toast: (text: string, type?: "success" | "error" | "info") => void;
}

export default function InscripcionModal({
  isOpen,
  onClose,
  convocatoria,
  onSuccess,
  toast,
}: InscripcionModalProps) {
  const [nombreEquipo, setNombreEquipo] = useState("");
  const [inscribiendo, setInscribiendo] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setInscribiendo(true);
      await api.inscribirseConvocatoria(convocatoria.id, {
        nombreEquipo: nombreEquipo.trim() || undefined,
      });
      toast(
        "¡Solicitud enviada exitosamente! Tu postulación se encuentra en revisión por el docente encargado.",
        "success"
      );
      setNombreEquipo("");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.message || "No se pudo completar la inscripción", "error");
    } finally {
      setInscribiendo(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-200">
      <div className="bg-paper/95 dark:bg-slate-900/95 backdrop-blur-xl border border-line/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" /> Inscripción al Área / Convocatoria
          </h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink cursor-pointer">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <p className="text-ink-soft">
            Estás a punto de inscribirte formalmente a <strong>{convocatoria.titulo}</strong>. Podrás ver y entregar todas las tareas publicadas por los docentes.
          </p>

          <div>
            <label className="font-semibold text-ink block mb-1">Nombre de Equipo o Grupo (Opcional)</label>
            <input
              type="text"
              value={nombreEquipo}
              onChange={(e) => setNombreEquipo(e.target.value)}
              placeholder="Dejar en blanco si te postulas de forma individual"
              className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
            />
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
              disabled={inscribiendo}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              {inscribiendo ? "Inscribiendo..." : "Confirmar Inscripción"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
