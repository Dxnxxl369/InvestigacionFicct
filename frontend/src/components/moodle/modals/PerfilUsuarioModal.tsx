import React from "react";
import { BookOpen, Lock } from "lucide-react";

interface PerfilUsuarioModalProps {
  usuarioId: number | null;
  perfilData: any | null;
  cargando: boolean;
  onClose: () => void;
}

export default function PerfilUsuarioModal({
  usuarioId,
  perfilData,
  cargando,
  onClose,
}: PerfilUsuarioModalProps) {
  if (!usuarioId) return null;

  return (
    <div className="fixed inset-0 bg-ink/50 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-200">
      <div className="bg-paper/95 dark:bg-slate-900/95 backdrop-blur-xl border border-line/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="font-serif text-base font-bold text-ink">Ficha de Usuario</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-faint hover:text-ink text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {cargando ? (
          <div className="py-8 text-center text-ink-faint text-xs">
            Cargando perfil del participante...
          </div>
        ) : perfilData ? (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-4 bg-paper-sunken/40 border border-line rounded-xl p-4">
              <div className="w-14 h-14 rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center text-lg shrink-0">
                {perfilData.nombre?.charAt(0)}
                {perfilData.apellidos?.charAt(0)}
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-serif font-bold text-ink">
                  {perfilData.nombre} {perfilData.apellidos}
                </h4>
                <p className="text-ink-soft">{perfilData.email}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
                    {perfilData.rol}
                  </span>
                  {perfilData.departamento && (
                    <span className="text-[11px] text-ink-faint">
                      • {perfilData.departamento}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {perfilData.biografia && (
              <div className="space-y-1">
                <b className="text-ink font-semibold">Biografía / Presentación:</b>
                <p className="text-ink-soft bg-paper-sunken/30 border border-line rounded-lg p-3 leading-relaxed">
                  {perfilData.biografia}
                </p>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-line">
              <div className="flex items-center justify-between">
                <b className="text-ink font-semibold flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-accent" /> Áreas y Convocatorias Académicas
                </b>
                {perfilData.esPropioPerfil && perfilData.ocultarCursos && (
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    Visible solo para ti (Privado al público)
                  </span>
                )}
              </div>

              {perfilData.ocultarCursos && !perfilData.esPropioPerfil ? (
                <div className="bg-paper-sunken/50 border border-line rounded-xl p-4 text-center text-ink-soft space-y-1">
                  <Lock className="w-4 h-4 text-ink-faint mx-auto" />
                  <p className="font-medium text-ink">Cursos en modo privado</p>
                  <p className="text-[11px]">El usuario configuró su privacidad para no exhibir públicamente sus cursos.</p>
                </div>
              ) : perfilData.cursos && perfilData.cursos.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {perfilData.cursos.map((c: any) => (
                    <div
                      key={c.id}
                      className="bg-paper-sunken/40 border border-line rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-0.5">
                        <b className="text-ink block text-xs">{c.titulo}</b>
                        <span className="text-[10px] text-ink-faint block">
                          {c.gestion ? `${c.gestion} - ${c.periodo || ""}` : "Gestión activa"}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-paper border border-line text-ink-soft shrink-0">
                        {c.rolEnCurso || "PARTICIPANTE"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-paper-sunken/40 border border-line rounded-xl p-4 text-center text-ink-soft">
                  No se registran cursos o convocatorias asociados.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-ink-soft">
            No se pudo cargar la información del usuario.
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-paper-sunken hover:bg-paper border border-line rounded-xl text-ink font-semibold cursor-pointer text-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
