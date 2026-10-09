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
  const [numeroGrupo, setNumeroGrupo] = useState<number | "">("");
  const [integrantesEmails, setIntegrantesEmails] = useState<string[]>([""]);
  const [inscribiendo, setInscribiendo] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setInscribiendo(true);
      const esGrupal = Boolean(convocatoria.inscripcionGrupal);
      await api.inscribirseConvocatoria(convocatoria.id, {
        nombreEquipo: nombreEquipo.trim() || undefined,
        numeroGrupo: numeroGrupo ? Number(numeroGrupo) : undefined,
        integrantesEmails: esGrupal
          ? integrantesEmails.map((email) => email.trim()).filter(Boolean)
          : undefined,
      });
      toast(
        "¡Solicitud enviada exitosamente! Tu postulación se encuentra en revisión por el docente encargado.",
        "success"
      );
      setNombreEquipo("");
      setNumeroGrupo("");
      setIntegrantesEmails([""]);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.message || "No se pudo completar la inscripción", "error");
    } finally {
      setInscribiendo(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-paper border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
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

          {convocatoria.inscripcionGrupal && (
            <div className="p-3 bg-paper-sunken/70 border border-line rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1">Número de grupo</label>
                  <input
                    type="number"
                    min={1}
                    value={numeroGrupo}
                    onChange={(e) => setNumeroGrupo(e.target.value ? Number(e.target.value) : "")}
                    placeholder="Ej. 1"
                    className="w-28 px-3 py-2 bg-paper border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                  />
                </div>
                <span className="text-[10px] text-ink-faint text-right">
                  Integrantes permitidos: {convocatoria.minIntegrantesGrupo || 1} a {convocatoria.maxIntegrantesGrupo || 5}. Tu usuario ya cuenta como integrante.
                </span>
              </div>
              <div className="space-y-2">
                <label className="font-semibold text-ink block">Correos de compañeros</label>
                {integrantesEmails.map((email, index) => (
                  <input
                    key={index}
                    type="email"
                    value={email}
                    onChange={(e) => setIntegrantesEmails((prev) => prev.map((item, i) => i === index ? e.target.value : item))}
                    placeholder="correo@ficct.edu.bo"
                    className="w-full px-3 py-2 bg-paper border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setIntegrantesEmails((prev) => [...prev, ""])}
                  disabled={integrantesEmails.length + 1 >= (convocatoria.maxIntegrantesGrupo || 5)}
                  className="text-[11px] font-semibold text-accent disabled:text-ink-faint"
                >
                  + Agregar compañero
                </button>
              </div>
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
