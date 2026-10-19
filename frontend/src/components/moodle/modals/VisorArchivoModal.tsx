"use client";

import React, { useEffect } from "react";
import { X, Download, FileText, Image as ImageIcon, ExternalLink, FileArchive, File } from "lucide-react";
import { getMediaUrl } from "@/lib/api";

interface VisorArchivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  archivoUrl?: string;
  nombreArchivo?: string;
}

export default function VisorArchivoModal({
  isOpen,
  onClose,
  archivoUrl,
  nombreArchivo,
}: VisorArchivoModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !archivoUrl) return null;

  const url = getMediaUrl(archivoUrl);
  const nombre = nombreArchivo || archivoUrl.split("/").pop()?.split("?")[0] || "archivo";
  const extension = nombre.split(".").pop()?.toLowerCase() || "";

  const isPdf = extension === "pdf" || url.toLowerCase().includes(".pdf");
  const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(extension);

  const handleDescargar = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[90vh] bg-paper rounded-2xl shadow-2xl border border-line flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del visor */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-paper border-b border-line shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
              {isPdf ? (
                <FileText className="w-5 h-5 text-red-500" />
              ) : isImage ? (
                <ImageIcon className="w-5 h-5 text-blue-500" />
              ) : extension === "zip" || extension === "rar" ? (
                <FileArchive className="w-5 h-5 text-amber-500" />
              ) : (
                <File className="w-5 h-5 text-accent" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-ink truncate max-w-md sm:max-w-lg" title={nombre}>
                {nombre}
              </h3>
              <p className="text-[11px] text-ink-faint">
                {isPdf ? "Documento PDF" : isImage ? "Imagen" : `Archivo .${extension.toUpperCase()}`} • Previsualizador Integrado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDescargar}
              className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Descargar</span>
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-ink-soft hover:text-ink hover:bg-paper-sunken rounded-lg transition-colors"
              title="Abrir en pestaña nueva"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-ink-soft hover:text-ink hover:bg-paper-sunken rounded-lg transition-colors cursor-pointer"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido / Canvas de visualización */}
        <div className="flex-1 w-full bg-slate-900/90 overflow-hidden relative flex items-center justify-center">
          {isPdf ? (
            <iframe
              src={`${url}#toolbar=1&navpanes=0`}
              className="w-full h-full border-none bg-white"
              title={nombre}
            />
          ) : isImage ? (
            <div className="p-4 w-full h-full flex items-center justify-center overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={nombre}
                className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
              />
            </div>
          ) : (
            <div className="p-8 text-center max-w-md bg-paper rounded-2xl border border-line shadow-xl mx-4">
              <div className="w-16 h-16 rounded-2xl bg-paper-sunken border border-line flex items-center justify-center mx-auto mb-4 text-ink-soft">
                <File className="w-8 h-8 text-accent" />
              </div>
              <h4 className="text-base font-bold text-ink mb-1 truncate" title={nombre}>
                {nombre}
              </h4>
              <p className="text-xs text-ink-faint mb-5">
                Este formato no cuenta con visor directo en pantalla. Descarga el archivo para abrirlo con el programa correspondiente de tu equipo.
              </p>
              <button
                type="button"
                onClick={handleDescargar}
                className="w-full py-2.5 px-4 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Descargar {nombre}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
