import React from "react";
import { Clock, CheckSquare, Square } from "lucide-react";
import { ConvocatoriaParticipanteDTO } from "@/lib/api";

interface TabSolicitudesInscripcionProps {
  solicitudesPendientes: ConvocatoriaParticipanteDTO[];
  puedeAdmitirEstudiantes: boolean;
  selectedSolicitudesLote: number[];
  setSelectedSolicitudesLote: React.Dispatch<React.SetStateAction<number[]>>;
  procesandoAdmision: boolean;
  onAdmitir: (id: number, nombre: string) => void;
  onAdmitirLote: () => void;
  onOpenRechazoIndividual: (solicitud: ConvocatoriaParticipanteDTO) => void;
  onOpenRechazoLote: () => void;
}

export default function TabSolicitudesInscripcion({
  solicitudesPendientes,
  puedeAdmitirEstudiantes,
  selectedSolicitudesLote,
  setSelectedSolicitudesLote,
  procesandoAdmision,
  onAdmitir,
  onAdmitirLote,
  onOpenRechazoIndividual,
  onOpenRechazoLote,
}: TabSolicitudesInscripcionProps) {
  return (
    <div className="space-y-4">
      {puedeAdmitirEstudiantes && solicitudesPendientes.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h4 className="text-sm font-semibold text-ink">
                Bandeja de Solicitudes de Admisión ({solicitudesPendientes.length})
              </h4>
              <span className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full font-semibold border border-amber-500/30">
                Por revisar
              </span>
            </div>

            {/* Botones de acción en lote */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (selectedSolicitudesLote.length === solicitudesPendientes.length) {
                    setSelectedSolicitudesLote([]);
                  } else {
                    setSelectedSolicitudesLote(solicitudesPendientes.map((s) => s.id));
                  }
                }}
                className="px-2.5 py-1 rounded-lg border border-line bg-paper text-ink text-xs font-medium hover:bg-paper-sunken flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {selectedSolicitudesLote.length === solicitudesPendientes.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-accent" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-ink-faint" />
                )}
                <span>
                  {selectedSolicitudesLote.length === solicitudesPendientes.length
                    ? "Deseleccionar todos"
                    : "Seleccionar todos"}
                </span>
              </button>

              {selectedSolicitudesLote.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={onAdmitirLote}
                    disabled={procesandoAdmision}
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-all cursor-pointer shadow-xs flex items-center gap-1 disabled:opacity-50"
                  >
                    ✓ Admitir ({selectedSolicitudesLote.length})
                  </button>
                  <button
                    type="button"
                    onClick={onOpenRechazoLote}
                    disabled={procesandoAdmision}
                    className="px-3 py-1 rounded-lg border border-danger/40 bg-danger/10 text-danger text-xs font-semibold hover:bg-danger/20 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    ✕ Rechazar ({selectedSolicitudesLote.length})
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {solicitudesPendientes.map((sol) => {
              const isChecked = selectedSolicitudesLote.includes(sol.id);
              return (
                <div
                  key={sol.id}
                  className={`bg-paper border rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs transition-all ${
                    isChecked ? "border-accent ring-1 ring-accent/30 bg-accent/5" : "border-line"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSolicitudesLote((prev) => [...prev, sol.id]);
                        } else {
                          setSelectedSolicitudesLote((prev) => prev.filter((id) => id !== sol.id));
                        }
                      }}
                      className="mt-0.5 rounded border-line text-accent focus:ring-accent cursor-pointer"
                    />
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <b className="text-xs text-ink truncate">{sol.nombre} {sol.apellidos}</b>
                        <span className="text-[10px] text-ink-faint shrink-0">
                          {sol.fechaSolicitud ? new Date(sol.fechaSolicitud).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-soft truncate">{sol.email}</p>
                      <div className="text-[11px] text-ink-faint pt-0.5">
                        Equipo: <b>{sol.nombreEquipo || "Individual"}</b>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-line-soft">
                    <button
                      onClick={() => onOpenRechazoIndividual(sol)}
                      disabled={procesandoAdmision}
                      className="px-2.5 py-1 rounded-lg border border-danger/30 text-danger text-[11px] font-semibold hover:bg-danger-soft/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      ✕ Rechazar
                    </button>
                    <button
                      onClick={() => onAdmitir(sol.id, `${sol.nombre} ${sol.apellidos}`)}
                      disabled={procesandoAdmision}
                      className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition-all cursor-pointer shadow-xs flex items-center gap-1 disabled:opacity-50"
                    >
                      ✓ Admitir al Aula
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!puedeAdmitirEstudiantes && solicitudesPendientes.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-6 text-center text-sm text-ink-soft">
          Tu solicitud de inscripción está pendiente de revisión.
        </div>
      )}

      {solicitudesPendientes.length === 0 && (
        <div className="bg-paper border border-line rounded-2xl p-10 text-center text-sm text-ink-soft">
          No hay solicitudes de inscripción pendientes.
        </div>
      )}
    </div>
  );
}
