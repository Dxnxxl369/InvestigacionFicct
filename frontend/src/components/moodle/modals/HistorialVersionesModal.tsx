import React from "react";
import { History, XCircle, ExternalLink } from "lucide-react";
import { VersionDTO, getMediaUrl } from "@/lib/api";
import { renderArchivoIcon, formatMoodleDate } from "../moodleUtils";

interface HistorialVersionesModalProps {
  versiones: VersionDTO[];
  onClose: () => void;
}

export default function HistorialVersionesModal({
  versiones,
  onClose,
}: HistorialVersionesModalProps) {
  return (
    <div className="fixed inset-0 bg-ink/50 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-200">
      <div className="bg-paper/95 dark:bg-slate-900/95 backdrop-blur-xl border border-line/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-accent" />
            <h3 className="font-serif text-lg font-bold text-ink">Historial de Intentos de Entrega</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-faint hover:text-ink cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {versiones.length === 0 ? (
            <p className="text-xs text-ink-faint text-center py-6">
              No hay versiones registradas para esta entrega.
            </p>
          ) : (
            versiones.map((ver) => (
              <div key={ver.id} className="p-3.5 bg-paper-sunken border border-line rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-accent/15 text-accent font-bold text-[11px]">
                      Intento #{ver.intento}
                    </span>
                    {ver.conRetraso && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        Con retraso
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-ink-faint">
                    {formatMoodleDate(ver.fechaEntrega)}
                  </span>
                </div>

                {ver.nombreArchivo && (
                  <div className="space-y-1.5">
                    {ver.archivoUrl?.includes(",") || ver.nombreArchivo?.includes(",") ? (
                      ver.archivoUrl?.split(",").map((rawUrl, idx) => {
                        const url = rawUrl.trim();
                        const nombres = ver.nombreArchivo ? ver.nombreArchivo.split(",") : [];
                        const nombre = (nombres[idx] || nombres[0] || `Archivo ${idx + 1}`).trim();
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 p-2 bg-paper rounded-lg border border-line"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {renderArchivoIcon(nombre, "w-4 h-4 shrink-0")}
                              <span className="font-medium text-ink truncate text-xs">{nombre}</span>
                            </div>
                            {url && (
                              <a
                                href={getMediaUrl(url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:underline text-[11px] font-semibold flex items-center gap-1 shrink-0"
                              >
                                <ExternalLink className="w-3 h-3" /> Ver
                              </a>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center justify-between gap-2 p-2 bg-paper rounded-lg border border-line">
                        <div className="flex items-center gap-2 min-w-0">
                          {renderArchivoIcon(ver.nombreArchivo, "w-4 h-4 shrink-0")}
                          <span className="font-medium text-ink truncate text-xs">{ver.nombreArchivo}</span>
                        </div>
                        {ver.archivoUrl && (
                          <a
                            href={getMediaUrl(ver.archivoUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline text-[11px] font-semibold flex items-center gap-1 shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" /> Ver
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {ver.comentario && (
                  <p className="text-[11px] text-ink-soft italic bg-paper p-2 rounded-lg border border-line">
                    &ldquo;{ver.comentario}&rdquo;
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-semibold hover:bg-accent-dark transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
