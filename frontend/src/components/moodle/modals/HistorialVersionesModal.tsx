"use client";

import React, { useState } from "react";
import { History, XCircle, Eye } from "lucide-react";
import { VersionDTO } from "@/lib/api";
import { renderArchivoIcon, formatMoodleDate } from "../moodleUtils";
import VisorArchivoModal from "./VisorArchivoModal";

interface HistorialVersionesModalProps {
  versiones: VersionDTO[];
  onClose: () => void;
}

export default function HistorialVersionesModal({
  versiones,
  onClose,
}: HistorialVersionesModalProps) {
  const [archivoAVisualizar, setArchivoAVisualizar] = useState<{ url: string; nombre?: string } | null>(null);

  return (
    <>
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
                No hay historial de intentos previos registrado para esta entrega.
              </p>
            ) : (
              versiones.map((ver) => (
                <div
                  key={ver.id}
                  className="p-3.5 rounded-xl border border-line bg-paper-sunken/40 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink flex items-center gap-1.5">
                      Intento #{ver.intento}
                      {ver.conRetraso && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-danger/10 text-danger border border-danger/20">
                          Entrega con Retraso
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-ink-faint">
                      {formatMoodleDate(ver.fechaEntrega)}
                    </span>
                  </div>

                  {ver.nombreArchivo && (
                    <div className="space-y-1 pt-1">
                      {ver.nombreArchivo.includes(",") || ver.archivoUrl?.includes(",") ? (
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
                                <button
                                  type="button"
                                  onClick={() => setArchivoAVisualizar({ url, nombre })}
                                  className="text-accent hover:underline text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Ver
                                </button>
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
                            <button
                              type="button"
                              onClick={() => setArchivoAVisualizar({ url: ver.archivoUrl!, nombre: ver.nombreArchivo })}
                              className="text-accent hover:underline text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver
                            </button>
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

      <VisorArchivoModal
        isOpen={Boolean(archivoAVisualizar)}
        onClose={() => setArchivoAVisualizar(null)}
        archivoUrl={archivoAVisualizar?.url}
        nombreArchivo={archivoAVisualizar?.nombre}
      />
    </>
  );
}
