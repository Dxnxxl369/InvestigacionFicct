import React, { useState } from "react";
import { XCircle } from "lucide-react";
import { api, ConvocatoriaParticipanteDTO } from "@/lib/api";

interface RechazoIndividualModalProps {
  solicitud: ConvocatoriaParticipanteDTO | null;
  convocatoriaId: number;
  onClose: () => void;
  onSuccess: () => void;
  toast: (text: string, type?: "success" | "error" | "info") => void;
}

export default function RechazoIndividualModal({
  solicitud,
  convocatoriaId,
  onClose,
  onSuccess,
  toast,
}: RechazoIndividualModalProps) {
  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);

  if (!solicitud) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcesando(true);
      await api.rechazarParticipante(convocatoriaId, solicitud.id, motivo.trim() || undefined);
      toast(`Solicitud de ${solicitud.nombre} rechazada`, "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.message || "No se pudo rechazar la solicitud", "error");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-200">
      <div className="bg-paper/95 dark:bg-slate-900/95 backdrop-blur-xl border border-line/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-600" /> Rechazar Solicitud de Admisión
          </h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink text-sm cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <p className="text-ink-soft leading-relaxed">
            Estás por denegar la solicitud de postulación de{" "}
            <b className="text-ink">
              {solicitud.nombre} {solicitud.apellidos}
            </b>{" "}
            ({solicitud.email}).
          </p>

          <div>
            <label className="font-semibold text-ink block mb-1">Motivo del rechazo (Opcional):</label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. No cumple con los requisitos del reglamento, cupos llenos..."
              className="w-full p-2.5 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-line text-ink-soft hover:bg-paper cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesando}
              className="px-4 py-1.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {procesando ? "Procesando..." : "Confirmar Rechazo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
