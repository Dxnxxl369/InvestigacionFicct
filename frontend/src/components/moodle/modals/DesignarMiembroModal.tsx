import React, { useState } from "react";
import { UserPlus, XCircle, ShieldCheck, Award } from "lucide-react";
import { api, User } from "@/lib/api";

interface DesignarMiembroModalProps {
  isOpen: boolean;
  onClose: () => void;
  convocatoriaId: number;
  esAdmin: boolean;
  allUsers: User[];
  onSuccess: () => void;
  toast: (text: string, type?: "success" | "error" | "info") => void;
}

export default function DesignarMiembroModal({
  isOpen,
  onClose,
  convocatoriaId,
  esAdmin,
  allUsers,
  onSuccess,
  toast,
}: DesignarMiembroModalProps) {
  const [usuarioDesignarId, setUsuarioDesignarId] = useState<number | "">("");
  const [rolDesignar, setRolDesignar] = useState<"DOCENTE" | "JURADO">("DOCENTE");
  const [designando, setDesignando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioDesignarId) {
      toast("Debes seleccionar un usuario", "error");
      return;
    }

    try {
      setDesignando(true);
      await api.designarParticipante(convocatoriaId, {
        usuarioId: Number(usuarioDesignarId),
        rol: rolDesignar,
      });
      toast(`Usuario designado exitosamente como ${rolDesignar}`, "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err.message || "Error al designar participante", "error");
    } finally {
      setDesignando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-200">
      <div className="bg-paper/95 dark:bg-slate-900/95 backdrop-blur-xl border border-line/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-accent" /> Designar Responsable / Evaluador
          </h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink cursor-pointer">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-ink block mb-1">Rol a Asignar en esta Área *</label>
            <div className="grid grid-cols-2 gap-2">
              {esAdmin && (
                <button
                  type="button"
                  onClick={() => setRolDesignar("DOCENTE")}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    rolDesignar === "DOCENTE"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-paper-sunken text-ink border-line"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" /> DOCENTE
                </button>
              )}
              <button
                type="button"
                onClick={() => setRolDesignar("JURADO")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  rolDesignar === "JURADO"
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-paper-sunken text-ink border-line"
                } ${!esAdmin ? "col-span-2" : ""}`}
              >
                <Award className="w-4 h-4" /> JURADO
              </button>
            </div>
            <p className="text-[10px] text-ink-faint mt-1">
              Los jurados pueden ser designados y modificados libremente incluso hasta el último día del evento.
            </p>
          </div>

          <div>
            <label className="font-semibold text-ink block mb-1">Seleccionar Usuario del Directorio *</label>
            <select
              required
              value={usuarioDesignarId}
              onChange={(e) => setUsuarioDesignarId(e.target.value ? Number(e.target.value) : "")}
              className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
            >
              <option value="">-- Selecciona un usuario --</option>
              {allUsers
                .filter((u) => (rolDesignar === "DOCENTE" ? u.rol === "DOCENTE" || u.rol === "ADMIN" : true))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.apellido} ({u.email}) — Rol: {u.rol}
                  </option>
                ))}
            </select>
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
              disabled={designando}
              className="px-4 py-2 bg-accent text-white rounded-xl font-semibold hover:bg-accent-dark disabled:opacity-50 cursor-pointer"
            >
              {designando ? "Asignando..." : "Confirmar Designación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
