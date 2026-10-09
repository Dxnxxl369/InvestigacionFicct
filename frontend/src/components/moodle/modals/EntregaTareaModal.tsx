import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  XCircle,
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Download,
  RefreshCw,
  Edit2,
  Users,
} from "lucide-react";
import {
  api,
  TareaDTO,
  EntregaRequest,
  DocumentoDTO,
  GrupoDTO,
  ActividadGrupoDTO,
  User,
  getMediaUrl,
} from "@/lib/api";
import {
  formatBytes,
  renderArchivoIcon,
  validateFilesBatchForTarea,
  validateFileForTarea,
} from "../moodleUtils";

interface EntregaTareaModalProps {
  tarea: TareaDTO;
  convocatoriaId: number;
  user: User | null;
  documentosUsuario: DocumentoDTO[];
  gruposArea: GrupoDTO[];
  actividadesGrupo: ActividadGrupoDTO[];
  onClose: () => void;
  onSuccess: (updatedTareas: TareaDTO[]) => void;
  onNavigateToGrupos?: () => void;
  toast: (text: string, type?: "success" | "error" | "info") => void;
}

export default function EntregaTareaModal({
  tarea,
  convocatoriaId,
  user,
  documentosUsuario,
  gruposArea,
  actividadesGrupo,
  onClose,
  onSuccess,
  onNavigateToGrupos,
  toast,
}: EntregaTareaModalProps) {
  const [archivosEntregaFiles, setArchivosEntregaFiles] = useState<File[]>([]);
  const [archivoEntregaFile, setArchivoEntregaFile] = useState<File | null>(null);
  const [nombreArchivoEntrega, setNombreArchivoEntrega] = useState("");
  const [archivoEntregaOriginalName, setArchivoEntregaOriginalName] = useState("");
  const [archivoEntregaTamano, setArchivoEntregaTamano] = useState(0);
  const [archivoEntregaPrevioUrl, setArchivoEntregaPrevioUrl] = useState("");
  const [comentarioEstudiante, setComentarioEstudiante] = useState("");
  const [docVinculadoId, setDocVinculadoId] = useState<number | "">("");
  const [selectedGrupoId, setSelectedGrupoId] = useState<number | "">("");

  const [isDraggingEntrega, setIsDraggingEntrega] = useState(false);
  const [errorValidacionArchivo, setErrorValidacionArchivo] = useState<string | null>(null);
  const [editandoNombreArchivo, setEditandoNombreArchivo] = useState(false);
  const [enviandoEntrega, setEnviandoEntrega] = useState(false);

  const fileInputEntregaRef = useRef<HTMLInputElement>(null);

  // Inicializar con la entrega previa si existe
  useEffect(() => {
    if (tarea.miEntrega) {
      setNombreArchivoEntrega(tarea.miEntrega.nombreArchivo || "");
      setArchivoEntregaOriginalName(tarea.miEntrega.nombreArchivo || "");
      setArchivoEntregaPrevioUrl(tarea.miEntrega.archivoUrl || "");
      setComentarioEstudiante(tarea.miEntrega.comentarioEstudiante || "");
      setDocVinculadoId(tarea.miEntrega.documentoId || "");
    } else {
      setNombreArchivoEntrega("");
      setArchivoEntregaOriginalName("");
      setArchivoEntregaPrevioUrl("");
      setComentarioEstudiante("");
      setDocVinculadoId("");
    }
    setArchivosEntregaFiles([]);
    setArchivoEntregaFile(null);
    setArchivoEntregaTamano(0);
    setErrorValidacionArchivo(null);
    setEditandoNombreArchivo(false);
  }, [tarea]);

  // Resolver a qué grupo pertenece el estudiante para esta tarea específica (Moodle Grouping)
  const perteneceAlUsuario = (grupo: GrupoDTO) =>
    grupo.miembros?.some(
      (m) =>
        m.usuarioId === user?.id ||
        (user?.email && m.email?.toLowerCase() === user.email.toLowerCase())
    ) || false;

  const actividadAsociada = tarea.esGrupal && tarea.actividadGrupoId
    ? actividadesGrupo.find((a) => a.id === tarea.actividadGrupoId) || null
    : null;

  const gruposDisponiblesParaEntrega = useMemo(() => {
    if (!tarea.esGrupal) return [];
    const candidatos: GrupoDTO[] = [];

    if (actividadAsociada) {
      candidatos.push(...(actividadAsociada.grupos || []).filter((g) => perteneceAlUsuario(g)));
    } else {
      candidatos.push(...gruposArea.filter((g) => perteneceAlUsuario(g)));
      actividadesGrupo.forEach((actividad) => {
        candidatos.push(...(actividad.grupos || []).filter((g) => perteneceAlUsuario(g)));
      });
    }

    const vistos = new Set<number>();
    return candidatos.filter((grupo) => {
      if (!grupo.id || vistos.has(grupo.id)) return false;
      vistos.add(grupo.id);
      return true;
    });
  }, [actividadAsociada, actividadesGrupo, gruposArea, tarea.esGrupal, user?.email, user?.id]);

  const gruposDisponiblesIds = gruposDisponiblesParaEntrega.map((g) => g.id).join(",");

  useEffect(() => {
    if (!tarea.esGrupal) {
      setSelectedGrupoId("");
      return;
    }

    const ids = gruposDisponiblesParaEntrega.map((g) => g.id);
    if (selectedGrupoId && ids.includes(Number(selectedGrupoId))) return;

    const entregaGrupoId = tarea.miEntrega?.grupoId;
    if (entregaGrupoId && ids.includes(entregaGrupoId)) {
      setSelectedGrupoId(entregaGrupoId);
      return;
    }

    setSelectedGrupoId(ids[0] || "");
  }, [gruposDisponiblesIds, selectedGrupoId, tarea.esGrupal, tarea.miEntrega?.grupoId]);

  const miGrupoParaEstaTarea = tarea.esGrupal
    ? gruposDisponiblesParaEntrega.find((g) => g.id === Number(selectedGrupoId)) || gruposDisponiblesParaEntrega[0] || null
    : null;

  // Agregar lote de archivos con validación acumulada
  const agregarArchivosEntrega = (nuevosArchivos: File[]) => {
    setErrorValidacionArchivo(null);
    const combinados = [...archivosEntregaFiles];
    for (const f of nuevosArchivos) {
      const yaExiste = combinados.some((cf) => cf.name === f.name && cf.size === f.size);
      if (!yaExiste) {
        combinados.push(f);
      }
    }

    const validation = validateFilesBatchForTarea(combinados, tarea);
    if (!validation.valid) {
      setErrorValidacionArchivo(validation.error || "Archivos no admitidos");
      toast(validation.error || "Archivos no admitidos", "error");
      return false;
    }

    setArchivosEntregaFiles(combinados);
    setArchivoEntregaFile(combinados[0] || null);
    const totalSize = combinados.reduce((acc, f) => acc + f.size, 0);
    setArchivoEntregaTamano(totalSize);
    const names = combinados.map((f) => f.name).join(", ");
    setArchivoEntregaOriginalName(names);
    if (!nombreArchivoEntrega.trim()) {
      setNombreArchivoEntrega(names);
    }
    return true;
  };

  // Remover un archivo específico del lote
  const removerArchivoEntrega = (indexToRemove: number) => {
    const updated = archivosEntregaFiles.filter((_, idx) => idx !== indexToRemove);
    setArchivosEntregaFiles(updated);
    setArchivoEntregaFile(updated[0] || null);
    const totalSize = updated.reduce((acc, f) => acc + f.size, 0);
    setArchivoEntregaTamano(totalSize);
    if (updated.length === 0) {
      setNombreArchivoEntrega("");
      setArchivoEntregaOriginalName("");
    } else {
      const names = updated.map((f) => f.name).join(", ");
      setNombreArchivoEntrega(names);
      setArchivoEntregaOriginalName(names);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEntrega(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEntrega(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEntrega(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      agregarArchivosEntrega(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      agregarArchivosEntrega(files);
    }
    e.target.value = "";
  };

  // Enviar Entrega
  const handleEnviarEntrega = async (e: React.FormEvent) => {
    e.preventDefault();

    const tieneArchivosNuevos = archivosEntregaFiles.length > 0 || Boolean(archivoEntregaFile);
    const tieneArchivoPrevio = Boolean(archivoEntregaPrevioUrl);
    const tieneDocVinculado = Boolean(docVinculadoId);

    if (!tieneArchivosNuevos && !tieneArchivoPrevio && !tieneDocVinculado) {
      toast("Debes adjuntar al menos un archivo o vincular un documento de investigación para realizar la entrega.", "error");
      setErrorValidacionArchivo("Por favor arrastra o selecciona al menos un archivo para tu entrega.");
      return;
    }

    if (archivosEntregaFiles.length > 0) {
      const val = validateFilesBatchForTarea(archivosEntregaFiles, tarea);
      if (!val.valid) {
        setErrorValidacionArchivo(val.error || "Archivos no válidos");
        toast(val.error || "Archivos no válidos", "error");
        return;
      }
    } else if (archivoEntregaFile) {
      const val = validateFileForTarea(archivoEntregaFile, tarea);
      if (!val.valid) {
        setErrorValidacionArchivo(val.error || "Archivo no válido");
        toast(val.error || "Archivo no válido", "error");
        return;
      }
    }

    try {
      setEnviandoEntrega(true);
      let finalArchivoUrl = archivoEntregaPrevioUrl || undefined;
      let finalNombreArchivo = nombreArchivoEntrega.trim();

      // Subida física real de N archivos
      if (archivosEntregaFiles.length > 0) {
        try {
          const urlsSubidas: string[] = [];
          const nombresSubidos: string[] = [];
          for (const f of archivosEntregaFiles) {
            const uploadRes = await api.uploadArchivo(f);
            urlsSubidas.push(uploadRes.url || uploadRes.relativePath);
            nombresSubidos.push(f.name);
          }
          finalArchivoUrl = urlsSubidas.join(", ");
          if (!finalNombreArchivo || finalNombreArchivo === archivoEntregaOriginalName) {
            finalNombreArchivo = nombresSubidos.join(", ");
          }
        } catch (uploadErr: any) {
          toast("Error al subir los archivos: " + (uploadErr.message || uploadErr), "error");
          setEnviandoEntrega(false);
          return;
        }
      } else if (archivoEntregaFile) {
        try {
          const uploadRes = await api.uploadArchivo(archivoEntregaFile);
          finalArchivoUrl = uploadRes.url || uploadRes.relativePath;
          if (!finalNombreArchivo) {
            finalNombreArchivo = archivoEntregaFile.name;
          }
        } catch (uploadErr: any) {
          toast("Error al subir el archivo físico: " + (uploadErr.message || uploadErr), "error");
          setEnviandoEntrega(false);
          return;
        }
      }

      // Grupo ID para entrega grupal
      let finalGrupoId: number | undefined = undefined;
      if (tarea.esGrupal) {
        finalGrupoId = selectedGrupoId ? Number(selectedGrupoId) : miGrupoParaEstaTarea?.id;
      }

      const req: EntregaRequest = {
        documentoId: docVinculadoId ? Number(docVinculadoId) : undefined,
        nombreArchivo: finalNombreArchivo || undefined,
        archivoUrl: finalArchivoUrl,
        comentarioEstudiante: comentarioEstudiante.trim() || undefined,
        grupoId: finalGrupoId,
      };

      await api.entregarTarea(tarea.id, req);
      toast("¡Trabajo entregado con éxito a revisión académica!", "success");

      // Limpiar borrador de LocalStorage
      try {
        localStorage.removeItem(`moodle_entrega_draft_${convocatoriaId}_${tarea.id}_${user?.id || "anon"}`);
      } catch (err) {
        console.warn("No se pudo limpiar el borrador local:", err);
      }

      const updatedTareas = await api.getTareasConvocatoria(convocatoriaId);
      onSuccess(updatedTareas);
      onClose();
    } catch (err: any) {
      toast(err.message || "Error al enviar la entrega", "error");
    } finally {
      setEnviandoEntrega(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-paper border border-line rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-accent" /> Envío de Tarea Académica (Moodle)
          </h3>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Tarjeta de Requisitos de la Tarea */}
        <div className="text-xs space-y-2 bg-paper-sunken/70 p-3.5 rounded-xl border border-line">
          <span className="font-bold text-ink text-sm block">{tarea.titulo}</span>
          {tarea.descripcion && (
            <p className="text-ink-soft text-[11px] leading-relaxed line-clamp-2">
              {tarea.descripcion}
            </p>
          )}
          <div className="flex flex-wrap gap-2 text-[11px] pt-1">
            {tarea.esGrupal && (
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-bold flex items-center gap-1">
                <Users className="w-3 h-3" /> Entrega Grupal
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-paper border border-line text-ink font-semibold">
              Puntaje: {tarea.puntajeMaximo} pts
            </span>
            <span className="px-2 py-0.5 rounded-md bg-paper border border-line text-ink font-semibold">
              Formatos: {tarea.tiposArchivosPermitidos}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-paper border border-line text-ink font-semibold">
              Máx: {tarea.tamanoMaximoMb} MB
            </span>
            <span className="px-2 py-0.5 rounded-md bg-paper border border-line text-ink font-semibold">
              Corte: {tarea.fechaCorte ? new Date(tarea.fechaCorte).toLocaleString() : "Abierto"}
            </span>
          </div>
        </div>

        {/* Alerta de Agrupamiento y Equipo (Moodle Grouping) */}
        {tarea.esGrupal && (
          miGrupoParaEstaTarea ? (
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-200">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Entrega grupal en representación de: <u>{miGrupoParaEstaTarea.nombre}</u></span>
              </div>
              {actividadAsociada && (
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  Actividad de agrupamiento: <strong>{actividadAsociada.titulo}</strong>
                </p>
              )}
              {gruposDisponiblesParaEntrega.length > 1 && (
                <label className="block pt-2 text-[11px] font-semibold text-blue-900 dark:text-blue-200">
                  Presentar desde el grupo
                  <select
                    value={selectedGrupoId}
                    onChange={(e) => setSelectedGrupoId(e.target.value ? Number(e.target.value) : "")}
                    className="mt-1 w-full px-3 py-2 bg-paper text-ink border border-blue-200 dark:border-blue-900/60 rounded-xl focus:outline-none focus:border-accent"
                  >
                    {gruposDisponiblesParaEntrega.map((grupo) => (
                      <option key={grupo.id} value={grupo.id}>{grupo.nombre}</option>
                    ))}
                  </select>
                </label>
              )}
              {miGrupoParaEstaTarea.miembros && miGrupoParaEstaTarea.miembros.length > 0 && (
                <p className="text-[10px] text-blue-600 dark:text-blue-400">
                  Integrantes beneficiados: {miGrupoParaEstaTarea.miembros.map((m) => m.nombreCompleto || m.email).join(", ")}
                </p>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2">
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Esta tarea es grupal{actividadAsociada ? ` y corresponde a la actividad "${actividadAsociada.titulo}"` : ""}. Aún no estás registrado en ningún grupo de este agrupamiento.
                </span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                Para que tu trabajo sea registrado y beneficie a tu equipo, primero debes seleccionar un grupo en la pestaña de Grupos.
              </p>
              {onNavigateToGrupos && (
                <button
                  type="button"
                  onClick={onNavigateToGrupos}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" /> Ir a Seleccionar Grupo Ahora
                </button>
              )}
            </div>
          )
        )}

        {/* Entrega Previa Registrada si existe */}
        {tarea.miEntrega && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5 font-semibold text-emerald-800">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {tarea.esGrupal || tarea.miEntrega.esGrupal ? (
                  <span>
                    {tarea.miEntrega.esMiEntregaPropia ? (
                      <>Entregado previamente por ti (Equipo <strong>{tarea.miEntrega.grupoNombre || "del grupo"}</strong>)</>
                    ) : (
                      <>Entregado por tu compañero <strong>{tarea.miEntrega.entregadoPorNombre}</strong> (Equipo <strong>{tarea.miEntrega.grupoNombre || "del grupo"}</strong>)</>
                    )}
                  </span>
                ) : (
                  <span>Entrega registrada el {new Date(tarea.miEntrega.fechaEntrega).toLocaleString()}</span>
                )}
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold uppercase text-[10px]">
                {tarea.miEntrega.estado}
              </span>
            </div>

            {(tarea.esGrupal || tarea.miEntrega.esGrupal) && tarea.miEntrega.companerosEquipo && tarea.miEntrega.companerosEquipo.length > 0 && (
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>Compañeros de equipo: {tarea.miEntrega.companerosEquipo.join(", ")}</span>
              </div>
            )}

            {archivoEntregaPrevioUrl && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-200 text-ink">
                <div className="flex items-center gap-2 min-w-0">
                  {renderArchivoIcon(nombreArchivoEntrega || "archivo_anterior.pdf", "w-4 h-4")}
                  <span className="truncate font-medium">{nombreArchivoEntrega || "Archivo registrado"}</span>
                </div>
                <a
                  href={getMediaUrl(archivoEntregaPrevioUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar
                </a>
              </div>
            )}
            <p className="text-[10px] text-emerald-700">
              {tarea.esGrupal || tarea.miEntrega.esGrupal
                ? "Puedes adjuntar un nuevo archivo para actualizar la entrega de todo el equipo."
                : "Puedes adjuntar un nuevo archivo a continuación para reemplazar tu entrega o actualizar comentarios."}
            </p>
          </div>
        )}

        {/* Mensaje de Error de Validación Inmediata */}
        {errorValidacionArchivo && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 text-xs flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorValidacionArchivo}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorValidacionArchivo(null)}
              className="text-red-500 hover:text-red-700 font-bold shrink-0 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleEnviarEntrega} className="space-y-4 text-xs">
          {/* Input oculto para selección de archivos (múltiple) */}
          <input
            ref={fileInputEntregaRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Zona Drag & Drop y Listado de Archivos */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-ink block">
                Archivos de Entrega (Arrastra o Selecciona) *
              </label>
              {archivosEntregaFiles.length > 0 && (
                <span className="text-[11px] text-ink-faint">
                  {archivosEntregaFiles.length} {archivosEntregaFiles.length === 1 ? "archivo adjunto" : "archivos adjuntos"}
                </span>
              )}
            </div>

            {archivosEntregaFiles.length === 0 && !archivoEntregaPrevioUrl ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputEntregaRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                  isDraggingEntrega
                    ? "border-accent bg-accent/10 ring-2 ring-accent/30 scale-[1.01]"
                    : "border-line hover:border-accent/60 bg-paper-sunken/40 hover:bg-paper-sunken/70"
                }`}
              >
                <UploadCloud className="w-10 h-10 text-accent mx-auto mb-2 animate-pulse" />
                <p className="text-xs font-bold text-ink">
                  Arrastra y suelta tus archivos aquí para subirlos
                </p>
                <p className="text-[11px] text-ink-soft mt-0.5">
                  o haz clic en esta área para examinar tus documentos (puedes elegir varios)
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-[10px] text-ink-faint">
                  <span className="px-2 py-0.5 rounded-full bg-paper border border-line">
                    Formatos: {tarea.tiposArchivosPermitidos}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-paper border border-line">
                    Límite acumulado: {tarea.tamanoMaximoMb} MB
                  </span>
                </div>
              </div>
            ) : archivosEntregaFiles.length > 0 ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-3.5 bg-paper rounded-2xl border ${
                  isDraggingEntrega ? "border-accent ring-2 ring-accent/30" : "border-line"
                } shadow-xs space-y-3`}
              >
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {archivosEntregaFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2.5 bg-paper-sunken/60 hover:bg-paper-sunken rounded-xl border border-line transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                          {renderArchivoIcon(file.name, "w-4 h-4")}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-ink text-xs block truncate" title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-[10px] text-ink-faint">
                            {formatBytes(file.size)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removerArchivoEntrega(idx)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-500/10 cursor-pointer transition-colors shrink-0"
                        title="Eliminar este archivo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-line-soft flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-ink">
                    Peso total: {(archivoEntregaTamano / (1024 * 1024)).toFixed(2)} MB / {tarea.tamanoMaximoMb} MB
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputEntregaRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg border border-line bg-paper-sunken hover:bg-paper text-accent font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <UploadCloud className="w-3 h-3" /> + Agregar más
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setArchivosEntregaFiles([]);
                        setArchivoEntregaFile(null);
                        setArchivoEntregaOriginalName("");
                        setArchivoEntregaTamano(0);
                        setNombreArchivoEntrega("");
                        setErrorValidacionArchivo(null);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-line bg-red-50 hover:bg-red-100 text-red-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" /> Quitar todos
                    </button>
                  </div>
                </div>

                {archivosEntregaFiles.length === 1 && (
                  <div className="pt-2 border-t border-line-soft space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-ink flex items-center gap-1.5">
                        <Edit2 className="w-3.5 h-3.5 text-accent" /> Guardar como (Nombre formal en plataforma):
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditandoNombreArchivo(!editandoNombreArchivo)}
                        className="text-[10px] text-accent font-semibold hover:underline cursor-pointer"
                      >
                        {editandoNombreArchivo ? "Ocultar" : "Renombrar"}
                      </button>
                    </div>

                    <input
                      type="text"
                      value={nombreArchivoEntrega}
                      onChange={(e) => setNombreArchivoEntrega(e.target.value)}
                      placeholder="Ej. Tarea1_GrupoA_Investigacion.pdf"
                      className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink text-xs focus:outline-none focus:border-accent"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-paper rounded-2xl border border-line shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      {renderArchivoIcon(archivoEntregaOriginalName || "documento.pdf", "w-5 h-5")}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-ink text-xs block truncate">
                        {archivoEntregaOriginalName}
                      </span>
                      <span className="text-[10px] text-ink-faint">
                        Archivos registrados previamente
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputEntregaRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg border border-line bg-paper-sunken hover:bg-paper text-accent text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Reemplazar archivos
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Vincular Documento de Investigación si aplica */}
          {documentosUsuario.length > 0 && (
            <div>
              <label className="font-semibold text-ink block mb-1">
                Vincular Documento de Investigación de la Plataforma (Opcional)
              </label>
              <select
                value={docVinculadoId}
                onChange={(e) => setDocVinculadoId(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink"
              >
                <option value="">-- No vincular documento del repositorio --</option>
                {documentosUsuario.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.titulo} ({doc.categoria})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Comentario para el Docente */}
          <div>
            <label className="font-semibold text-ink block mb-1">
              Comentario para el Docente / Jurado (Opcional)
            </label>
            <textarea
              rows={3}
              value={comentarioEstudiante}
              onChange={(e) => setComentarioEstudiante(e.target.value)}
              placeholder="Estimado docente, adjuntamos el avance con las correcciones de la sesión anterior..."
              className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink resize-none focus:outline-none focus:border-accent"
            />
          </div>

          {/* Footer y Acciones de Envío */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-3 border-t border-line">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-line rounded-xl text-ink hover:bg-paper-sunken cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviandoEntrega || Boolean(tarea.esGrupal && !miGrupoParaEstaTarea)}
                title={tarea.esGrupal && !miGrupoParaEstaTarea ? "Debes unirte a un grupo para poder realizar la entrega" : ""}
                className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                {enviandoEntrega ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Subiendo archivo...
                  </>
                ) : tarea.miEntrega ? (
                  "Modificar y Guardar Entrega"
                ) : (
                  "Subir Trabajo"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
