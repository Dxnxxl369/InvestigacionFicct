import React, { useState } from "react";
import { AlertTriangle, XCircle } from "lucide-react";
import { api } from "@/lib/api";

interface RechazoLoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  convocatoriaId: number;
  selectedSolicitudesLote: number[];
  onSuccess: () => void;
  toast: (text: string, type?: "success" | "error" | "info") => void;
}

export default function RechazoLoteModal({
  isOpen,
  onClose,
  convocatoriaId,
  selectedSolicitudesLote,
  onSuccess,
  toast,
}: RechazoLoteModalProps) {
  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSolicitudesLote.length === 0) return;
    try {
      setProcesando(true);
      const res = await api.responderLote(
        convocatoriaId,
        selectedSolicitudesLote,
        "RECHAZAR",
        motivo.trim() || undefined
      );
      toast(`Rechazo en lote: ${res.procesados} solicitudes rechazadas.`, "success");
      if (res.errores && res.errores.length > 0) {
        toast(`Errores: ${res.errores.join(", ")}`, "error");
      }
      setMotivo("");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.message || "Error al rechazar solicitudes en lote", "error");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-paper border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3 className="font-serif text-base font-bold text-ink">Rechazar Solicitudes en Lote</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-faint hover:text-ink cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-ink-soft">
          Estás a punto de rechazar <strong>{selectedSolicitudesLote.length}</strong> solicitudes seleccionadas. Puedes indicar un motivo general opcional que los postulantes podrán visualizar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-semibold text-ink block text-xs mb-1">
              Motivo del Rechazo (Opcional)
            </label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Cupos completados para este periodo o no cumple con los requisitos mínimos..."
              className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-line rounded-xl text-xs text-ink hover:bg-paper-sunken cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesando}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {procesando ? "Procesando..." : `Confirmar Rechazo (${selectedSolicitudesLote.length})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
