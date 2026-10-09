import React, { useState, useEffect, useRef } from "react";
import { FolderKanban, XCircle, AlertCircle, UploadCloud } from "lucide-react";
import { api, ModuloDTO, ModuloRequest } from "@/lib/api";

interface CrearEditarModuloModalProps {
  isOpen: boolean;
  onClose: () => void;
  convocatoriaId: number;
  moduloEditing: ModuloDTO | null;
  ordenSugerido: number;
  onSuccess: (updatedModulos: ModuloDTO[]) => void;
  toast: (text: string, type?: "success" | "error" | "info") => void;
}

export default function CrearEditarModuloModal({
  isOpen,
  onClose,
  convocatoriaId,
  moduloEditing,
  ordenSugerido,
  onSuccess,
  toast,
}: CrearEditarModuloModalProps) {
  const [moduloTitulo, setModuloTitulo] = useState("");
  const [moduloDescripcion, setModuloDescripcion] = useState("");
  const [moduloImagenUrl, setModuloImagenUrl] = useState("");
  const [moduloImagenFile, setModuloImagenFile] = useState<File | null>(null);
  const [moduloImagenPreview, setModuloImagenPreview] = useState<string | null>(null);
  const [moduloOrden, setModuloOrden] = useState<number>(ordenSugerido);
  const [guardandoModulo, setGuardandoModulo] = useState(false);
  const [isDraggingModuloImg, setIsDraggingModuloImg] = useState(false);
  const [errorModuloImg, setErrorModuloImg] = useState<string | null>(null);
  const fileInputModuloImgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (moduloEditing) {
      setModuloTitulo(moduloEditing.titulo || "");
      setModuloDescripcion(moduloEditing.descripcion || "");
      setModuloImagenUrl(moduloEditing.imagenUrl || "");
      setModuloImagenPreview(moduloEditing.imagenUrl || null);
      setModuloOrden(moduloEditing.orden || ordenSugerido);
    } else {
      setModuloTitulo("");
      setModuloDescripcion("");
      setModuloImagenUrl("");
      setModuloImagenPreview(null);
      setModuloOrden(ordenSugerido);
    }
    setModuloImagenFile(null);
    setErrorModuloImg(null);
    setIsDraggingModuloImg(false);
  }, [moduloEditing, ordenSugerido, isOpen]);

  if (!isOpen) return null;

  const handleModuloImageFileSelect = (file: File) => {
    setErrorModuloImg(null);
    if (!file.type.startsWith("image/")) {
      setErrorModuloImg("Solo se admiten archivos de imagen (PNG, JPG, WEBP, GIF, SVG).");
      toast("El archivo no es una imagen válida", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorModuloImg(`La imagen (${(file.size / (1024 * 1024)).toFixed(2)} MB) supera el límite máximo de 5 MB.`);
      toast("La imagen no debe superar los 5 MB", "error");
      return;
    }

    setModuloImagenFile(file);
    const previewUrl = URL.createObjectURL(file);
    setModuloImagenPreview(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduloTitulo.trim()) {
      toast("El título del módulo es obligatorio", "error");
      return;
    }

    try {
      setGuardandoModulo(true);
      let imgFinal = moduloImagenUrl.trim() || undefined;

      if (moduloImagenFile) {
        try {
          const up = await api.uploadImagen(moduloImagenFile);
          imgFinal = up.url || up.relativePath;
        } catch (err: any) {
          toast("No se pudo subir la imagen del módulo: " + err.message, "error");
          setGuardandoModulo(false);
          return;
        }
      }

      const req: ModuloRequest = {
        titulo: moduloTitulo.trim(),
        descripcion: moduloDescripcion.trim() || undefined,
        imagenUrl: imgFinal,
        orden: Number(moduloOrden) || 1,
        activo: true,
      };

      if (moduloEditing) {
        await api.updateModulo(moduloEditing.id, req);
        toast("Módulo actualizado exitosamente", "success");
      } else {
        await api.createModulo(convocatoriaId, req);
        toast("Módulo creado exitosamente", "success");
      }

      const updatedModulos = await api.getModulosConvocatoria(convocatoriaId);
      onSuccess(updatedModulos);
      onClose();
    } catch (err: any) {
      toast(err.message || "Error al guardar el módulo", "error");
    } finally {
      setGuardandoModulo(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-200">
      <div className="bg-paper/95 dark:bg-slate-900/95 backdrop-blur-xl border border-line/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-accent" />
            {moduloEditing ? "Editar Módulo de Aprendizaje" : "Nuevo Módulo de Aprendizaje"}
          </h3>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-ink block mb-1">Título del Módulo *</label>
            <input
              type="text"
              required
              value={moduloTitulo}
              onChange={(e) => setModuloTitulo(e.target.value)}
              placeholder="Ej. Módulo 1: Fundamentación Teórica y Estado del Arte"
              className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="font-semibold text-ink block mb-1">Descripción del Módulo</label>
            <textarea
              rows={3}
              value={moduloDescripcion}
              onChange={(e) => setModuloDescripcion(e.target.value)}
              placeholder="Breve resumen del objetivo pedagógico o temática a cubrir..."
              className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div>
            <label className="font-semibold text-ink block mb-1">Orden de Presentación</label>
            <input
              type="number"
              min={1}
              value={moduloOrden}
              onChange={(e) => setModuloOrden(Number(e.target.value))}
              className="w-24 px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink"
            />
          </div>

          {/* Subida o URL de Imagen con Drag & Drop y Previsualización */}
          <div className="p-3 bg-paper-sunken/60 rounded-xl border border-line space-y-3">
            <span className="font-bold text-ink block text-[11px] uppercase tracking-wider text-accent">
              Imagen de Portada del Módulo
            </span>

            {errorModuloImg && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorModuloImg}</span>
              </div>
            )}

            <input
              ref={fileInputModuloImgRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleModuloImageFileSelect(file);
              }}
              className="hidden"
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingModuloImg(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingModuloImg(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingModuloImg(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleModuloImageFileSelect(file);
              }}
              onClick={() => fileInputModuloImgRef.current?.click()}
              className={`p-4 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                isDraggingModuloImg
                  ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                  : "border-line hover:border-accent/60 bg-paper hover:bg-paper-sunken/60"
              }`}
            >
              <UploadCloud className="w-8 h-8 text-accent mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-ink">
                Arrastra y suelta la imagen aquí, o haz clic para examinar
              </p>
              <p className="text-[10px] text-ink-faint mt-0.5">
                Formatos soportados: PNG, JPG, WEBP, SVG (Máx. 5 MB)
              </p>
            </div>

            <div>
              <label className="text-ink-soft block mb-1">O Ingresar URL Web de la Imagen</label>
              <input
                type="text"
                value={moduloImagenUrl}
                onChange={(e) => {
                  setModuloImagenUrl(e.target.value);
                  if (!moduloImagenFile) {
                    setModuloImagenPreview(e.target.value.trim() || null);
                  }
                }}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 bg-paper border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
              />
            </div>

            {moduloImagenPreview && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-semibold text-ink-faint uppercase block">
                  Previsualización:
                </span>
                <div className="relative w-full h-36 rounded-xl overflow-hidden border border-line bg-paper-sunken">
                  <img
                    src={moduloImagenPreview}
                    alt="Preview módulo"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setModuloImagenFile(null);
                      setModuloImagenPreview(null);
                      setModuloImagenUrl("");
                      setErrorModuloImg(null);
                    }}
                    className="absolute top-2 right-2 px-2 py-1 bg-black/70 hover:bg-black text-white text-[10px] rounded-md font-medium cursor-pointer"
                  >
                    ✕ Quitar
                  </button>
                </div>
              </div>
            )}
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
              disabled={guardandoModulo}
              className="px-4 py-2 bg-accent text-white rounded-xl font-semibold hover:bg-accent-dark disabled:opacity-50 cursor-pointer"
            >
              {guardandoModulo ? "Guardando..." : moduloEditing ? "Actualizar Módulo" : "Crear Módulo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
