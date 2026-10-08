"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import CollaborativeDocumentEditor from "@/components/CollaborativeDocumentEditor";
import { useAuth } from "@/context/AuthContext";
import {
  api,
  ConvocatoriaDTO,
  ConvocatoriaParticipanteDTO,
  TareaDTO,
  TareaRequest,
  EntregaTareaDTO,
  EntregaRequest,
  CalificarEntregaRequest,
  DesignarParticipanteRequest,
  DocumentoDTO,
  User,
  getMediaUrl,
  ModuloDTO,
  ModuloRequest,
} from "@/lib/api";
import {
  Calendar,
  Clock,
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PlusCircle,
  Upload,
  ChevronRight,
  ShieldCheck,
  Award,
  ArrowLeft,
  UserPlus,
  Trash2,
  Lock,
  Unlock,
  Tag,
  Search,
  Filter,
  Pencil,
  FolderKanban,
  BookOpen,
  Layers,
  ChevronLeft,
  ExternalLink,
  Image as ImageIcon,
  Check,
  UploadCloud,
  FileUp,
  FileArchive,
  RotateCcw,
  Edit2,
  Save,
  File as FileIcon,
  Download,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// Convertir base64 dataURL a File para restaurar borradores
function dataURLtoFile(dataurl: string, filename: string): File {
  try {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch {
    return new File([], filename, { type: "application/octet-stream" });
  }
}

// Formatear bytes a KB / MB legible
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Analizar extensiones permitidas tipo ".pdf, .docx, .zip"
function parseAllowedExtensions(allowedStr?: string): string[] {
  if (!allowedStr || allowedStr.trim() === "" || allowedStr.trim() === "*") {
    return [];
  }
  return allowedStr
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => (s.startsWith(".") ? s : `.${s}`));
}

// Validar archivo contra requisitos de tarea académica (Moodle)
function validateFileForTarea(file: File, tarea: TareaDTO): { valid: boolean; error?: string } {
  const allowed = parseAllowedExtensions(tarea.tiposArchivosPermitidos);
  const fileName = file.name.toLowerCase();

  // 1. Validar formato / extensión
  if (allowed.length > 0) {
    const hasValidExt = allowed.some((ext) => fileName.endsWith(ext));
    if (!hasValidExt) {
      return {
        valid: false,
        error: `Formato no permitido: "${file.name}". Solo se admiten archivos con formato: ${tarea.tiposArchivosPermitidos}`,
      };
    }
  }

  // 2. Validar tamaño máximo
  const maxMb = tarea.tamanoMaximoMb || 15;
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    const tamanoMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `El archivo "${file.name}" (${tamanoMb} MB) supera el límite máximo permitido de ${maxMb} MB.`,
    };
  }

  return { valid: true };
}

// Icono contextual según extensión
function renderArchivoIcon(filename: string, className = "w-6 h-6") {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") {
    return <FileText className={`${className} text-rose-500`} />;
  }
  if (["doc", "docx", "odt", "txt", "rtf"].includes(ext || "")) {
    return <FileText className={`${className} text-blue-500`} />;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext || "")) {
    return <FileArchive className={`${className} text-amber-500`} />;
  }
  if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext || "")) {
    return <ImageIcon className={`${className} text-emerald-500`} />;
  }
  return <FileUp className={`${className} text-accent`} />;
}

export default function AreaMoodlePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const convocatoriaId = Number(params?.id);

  // Estados de datos
  const [convocatoria, setConvocatoria] = useState<ConvocatoriaDTO | null>(null);
  const [participantes, setParticipantes] = useState<ConvocatoriaParticipanteDTO[]>([]);
  const [tareas, setTareas] = useState<TareaDTO[]>([]);
  const [modulos, setModulos] = useState<ModuloDTO[]>([]);
  const [selectedModuloId, setSelectedModuloId] = useState<number | null>(null);
  const [documentosUsuario, setDocumentosUsuario] = useState<DocumentoDTO[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para Módulos (LMS)
  const [showModuloModal, setShowModuloModal] = useState(false);
  const [moduloEditing, setModuloEditing] = useState<ModuloDTO | null>(null);
  const [moduloTitulo, setModuloTitulo] = useState("");
  const [moduloDescripcion, setModuloDescripcion] = useState("");
  const [moduloImagenUrl, setModuloImagenUrl] = useState("");
  const [moduloImagenFile, setModuloImagenFile] = useState<File | null>(null);
  const [moduloImagenPreview, setModuloImagenPreview] = useState<string | null>(null);
  const [moduloOrden, setModuloOrden] = useState<number>(1);
  const [guardandoModulo, setGuardandoModulo] = useState(false);
  const [isDraggingModuloImg, setIsDraggingModuloImg] = useState(false);
  const [errorModuloImg, setErrorModuloImg] = useState<string | null>(null);
  const [restoredDraftModulo, setRestoredDraftModulo] = useState(false);
  const fileInputModuloImgRef = useRef<HTMLInputElement>(null);

  // Módulo seleccionado al crear tarea
  const [tareaModuloId, setTareaModuloId] = useState<number | "">("");

  // Vista Dedicada / Pantalla Completa de Gestión de Entregas (SpeedGrader)
  const [activeTareaParaEntregas, setActiveTareaParaEntregas] = useState<TareaDTO | null>(null);
  const [entregasTareaActual, setEntregasTareaActual] = useState<EntregaTareaDTO[]>([]);
  const [selectedEstudianteId, setSelectedEstudianteId] = useState<number | null>(null);
  const [searchEstudianteEntrega, setSearchEstudianteEntrega] = useState("");
  const [filtroEntregasEstado, setFiltroEntregasEstado] = useState<"TODOS" | "PENDIENTES" | "CALIFICADOS" | "SIN_ENTREGA">("TODOS");
  const [cargandoEntregasTarea, setCargandoEntregasTarea] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<"tareas" | "participantes" | "info">("tareas");

  // Notificaciones / Alertas
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const toast = useCallback((text: string, type: "success" | "error" | "info" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  }, []);

  // Modales
  const [showCreateTareaModal, setShowCreateTareaModal] = useState(false);
  const [showDesignarModal, setShowDesignarModal] = useState(false);
  const [showInscripcionModal, setShowInscripcionModal] = useState(false);
  const [selectedTareaForEntrega, setSelectedTareaForEntrega] = useState<TareaDTO | null>(null);
  const [selectedTareaForRevision, setSelectedTareaForRevision] = useState<TareaDTO | null>(null);
  const [entregasCurrentTarea, setEntregasCurrentTarea] = useState<EntregaTareaDTO[]>([]);
  const [selectedEntregaForCalificar, setSelectedEntregaForCalificar] = useState<EntregaTareaDTO | null>(null);
  const [documentoColaborativoActivo, setDocumentoColaborativoActivo] = useState<DocumentoDTO | null>(null);
  const [abriendoDocumentoColaborativo, setAbriendoDocumentoColaborativo] = useState<number | null>(null);

  // Formulario de Nueva Tarea (con triple fecha)
  const [tituloTarea, setTituloTarea] = useState("");
  const [descTarea, setDescTarea] = useState("");
  const [fechaHabilitacion, setFechaHabilitacion] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [fechaCorte, setFechaCorte] = useState("");
  const [archivosPermitidos, setArchivosPermitidos] = useState(".pdf, .docx, .zip");
  const [tamanoMb, setTamanoMb] = useState(15);
  const [puntajeMax, setPuntajeMax] = useState(100);
  const [documentoColaborativoHabilitado, setDocumentoColaborativoHabilitado] = useState(false);
  const [creandoTarea, setCreandoTarea] = useState(false);
  const [restoredDraftTarea, setRestoredDraftTarea] = useState(false);

  // Formulario de Designar Miembro
  const [usuarioDesignarId, setUsuarioDesignarId] = useState<number | "">("");
  const [rolDesignar, setRolDesignar] = useState<"DOCENTE" | "JURADO">("DOCENTE");
  const [designando, setDesignando] = useState(false);

  // Formulario de Inscripción Estudiante
  const [nombreEquipo, setNombreEquipo] = useState("");
  const [inscribiendo, setInscribiendo] = useState(false);

  // Formulario de Entrega Estudiante (Moodle LMS)
  const [docVinculadoId, setDocVinculadoId] = useState<number | "">("");
  const [nombreArchivoEntrega, setNombreArchivoEntrega] = useState("");
  const [comentarioEstudiante, setComentarioEstudiante] = useState("");
  const [enviandoEntrega, setEnviandoEntrega] = useState(false);
  const [archivoEntregaFile, setArchivoEntregaFile] = useState<File | null>(null);
  const [archivoEntregaOriginalName, setArchivoEntregaOriginalName] = useState<string>("");
  const [archivoEntregaTamano, setArchivoEntregaTamano] = useState<number>(0);
  const [archivoEntregaPrevioUrl, setArchivoEntregaPrevioUrl] = useState<string>("");
  const [isDraggingEntrega, setIsDraggingEntrega] = useState(false);
  const [errorValidacionArchivo, setErrorValidacionArchivo] = useState<string | null>(null);
  const [editandoNombreArchivo, setEditandoNombreArchivo] = useState(false);
  const [restoredDraftEntrega, setRestoredDraftEntrega] = useState(false);
  const [lastDraftSavedEntrega, setLastDraftSavedEntrega] = useState<string | null>(null);
  const fileInputEntregaRef = useRef<HTMLInputElement>(null);

  // Formulario de Calificación Docente
  const [notaCalificacion, setNotaCalificacion] = useState<number>(100);
  const [feedbackDocente, setFeedbackDocente] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);

  // Filtro de participantes
  const [filtroParticipanteRol, setFiltroParticipanteRol] = useState<string>("TODOS");
  const [searchParticipante, setSearchParticipante] = useState("");

  // Permisos en esta área específica
  const esAdmin = user?.rol === "ADMIN";
  const esCreador = Boolean(user?.id && convocatoria?.creadorId === user?.id);
  const esDocenteEnEstaArea = Boolean(
    (user?.rol === "DOCENTE" && esCreador) ||
    participantes.some(
      (p) => p.usuarioId === user?.id && p.rol === "DOCENTE" && p.estadoInscripcion === "ACEPTADO"
    ) ||
    (user?.rol === "DOCENTE" && convocatoria?.docenteIds?.includes(user?.id || 0))
  );
  const esJuradoEnEstaArea = Boolean(
    participantes.some(
      (p) => p.usuarioId === user?.id && p.rol === "JURADO" && p.estadoInscripcion === "ACEPTADO"
    ) ||
    (user?.rol === "JURADO" && convocatoria?.juradoIds?.includes(user?.id || 0))
  );
  const miParticipacion = participantes.find((p) => p.usuarioId === user?.id);
  const esEstudianteInscrito = miParticipacion?.rol === "ESTUDIANTE" && miParticipacion?.estadoInscripcion === "ACEPTADO";
  const esEstudiantePendiente = miParticipacion?.rol === "ESTUDIANTE" && miParticipacion?.estadoInscripcion === "PENDIENTE";
  const puedeGestionarTareas = esAdmin || esDocenteEnEstaArea;
  const puedeDesignarJurado = esAdmin || esDocenteEnEstaArea;
  const puedeAdmitirEstudiantes = esAdmin || esDocenteEnEstaArea;

  const [selectedSolicitudForRechazo, setSelectedSolicitudForRechazo] = useState<ConvocatoriaParticipanteDTO | null>(null);
  const [motivoRechazoInput, setMotivoRechazoInput] = useState("");
  const [procesandoAdmision, setProcesandoAdmision] = useState(false);

  // Carga inicial tolerante a fallos
  const cargarDatos = useCallback(async () => {
    if (!convocatoriaId) return;
    try {
      setLoading(true);

      // 1. Cargar datos principales de la convocatoria primero
      let convData: ConvocatoriaDTO | null = null;
      try {
        convData = await api.getConvocatoriaById(convocatoriaId);
      } catch (err: any) {
        console.warn("Fallo getConvocatoriaById, buscando en convocatorias generales:", err);
        const all = await api.getConvocatorias().catch(() => api.getPublicConvocatorias());
        convData = all.find((c) => c.id === convocatoriaId) || null;
      }

      if (!convData) {
        setConvocatoria(null);
        setLoading(false);
        return;
      }
      setConvocatoria(convData);

      // 2. Cargar participantes, tareas y módulos en paralelo de forma tolerante
      const [partsData, tareasData, modulosData] = await Promise.all([
        api.getParticipantesConvocatoria(convocatoriaId).catch((err) => {
          console.warn("Aviso al cargar participantes:", err?.message || err);
          return [] as ConvocatoriaParticipanteDTO[];
        }),
        api.getTareasConvocatoria(convocatoriaId).catch((err) => {
          console.warn("Aviso al cargar tareas:", err?.message || err);
          return [] as TareaDTO[];
        }),
        api.getModulosConvocatoria(convocatoriaId).catch((err) => {
          console.warn("Aviso al cargar módulos:", err?.message || err);
          return [] as ModuloDTO[];
        }),
      ]);

      setParticipantes(partsData || []);
      setTareas(tareasData || []);
      setModulos(modulosData || []);

      // Si es estudiante, cargar sus documentos de investigación
      if (user?.rol === "ESTUDIANTE") {
        try {
          const docs = await api.getDocumentos();
          setDocumentosUsuario(docs);
        } catch {
          // opcional
        }
      }

      // Si puede designar, cargar catálogo de usuarios
      if (esAdmin || user?.rol === "DOCENTE") {
        try {
          const usersList = await api.getUsers();
          setAllUsers(usersList);
        } catch {
          // opcional
        }
      }
    } catch (err: any) {
      toast(err.message || "Error al cargar los datos del área", "error");
    } finally {
      setLoading(false);
    }
  }, [convocatoriaId, user?.rol, user?.id, esAdmin, toast]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Abrir Modal Crear Tarea con restauración de borrador
  const handleAbrirCrearTarea = (moduloIdDefault?: number) => {
    setTareaModuloId(moduloIdDefault !== undefined ? moduloIdDefault : "");
    const draftKey = `ficct_create_tarea_draft_${convocatoriaId}`;
    try {
      const rawDraft = localStorage.getItem(draftKey);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft.tituloTarea) setTituloTarea(draft.tituloTarea);
        if (draft.descTarea) setDescTarea(draft.descTarea);
        if (draft.fechaHabilitacion) setFechaHabilitacion(draft.fechaHabilitacion);
        if (draft.fechaEntrega) setFechaEntrega(draft.fechaEntrega);
        if (draft.fechaCorte) setFechaCorte(draft.fechaCorte);
        if (draft.archivosPermitidos) setArchivosPermitidos(draft.archivosPermitidos);
        if (draft.tamanoMb) setTamanoMb(draft.tamanoMb);
        if (draft.puntajeMax) setPuntajeMax(draft.puntajeMax);
        if (typeof draft.documentoColaborativoHabilitado === "boolean") {
          setDocumentoColaborativoHabilitado(draft.documentoColaborativoHabilitado);
        }
        if (moduloIdDefault === undefined && draft.tareaModuloId !== undefined) {
          setTareaModuloId(draft.tareaModuloId);
        }
        setRestoredDraftTarea(true);
      } else {
        setRestoredDraftTarea(false);
      }
    } catch {
      setRestoredDraftTarea(false);
    }
    setShowCreateTareaModal(true);
  };

  // Descartar borrador Crear Tarea
  const handleDescartarBorradorTarea = () => {
    try {
      localStorage.removeItem(`ficct_create_tarea_draft_${convocatoriaId}`);
    } catch {}
    setRestoredDraftTarea(false);
    setTituloTarea("");
    setDescTarea("");
    setFechaHabilitacion("");
    setFechaEntrega("");
    setFechaCorte("");
    setArchivosPermitidos(".pdf, .docx, .zip");
    setTamanoMb(15);
    setPuntajeMax(100);
    setDocumentoColaborativoHabilitado(false);
    toast("Borrador de tarea descartado", "info");
  };

  // Auto-guardar borrador de Crear Tarea
  useEffect(() => {
    if (!showCreateTareaModal) return;
    const hasData = tituloTarea.trim() !== "" || descTarea.trim() !== "";
    if (!hasData) return;

    const timeout = setTimeout(() => {
      try {
        const draft = {
          tituloTarea,
          descTarea,
          fechaHabilitacion,
          fechaEntrega,
          fechaCorte,
          archivosPermitidos,
          tamanoMb,
          puntajeMax,
          documentoColaborativoHabilitado,
          tareaModuloId,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(`ficct_create_tarea_draft_${convocatoriaId}`, JSON.stringify(draft));
      } catch {}
    }, 500);

    return () => clearTimeout(timeout);
  }, [
    showCreateTareaModal,
    tituloTarea,
    descTarea,
    fechaHabilitacion,
    fechaEntrega,
    fechaCorte,
    archivosPermitidos,
    tamanoMb,
    puntajeMax,
    documentoColaborativoHabilitado,
    tareaModuloId,
    convocatoriaId,
  ]);

  // Manejador Crear Tarea (con 3 fechas)
  const handleCrearTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloTarea.trim()) {
      toast("El título de la tarea es obligatorio", "error");
      return;
    }

    try {
      setCreandoTarea(true);
      const payload: TareaRequest = {
        convocatoriaId,
        moduloId: tareaModuloId ? Number(tareaModuloId) : undefined,
        titulo: tituloTarea.trim(),
        descripcion: descTarea.trim() || undefined,
        fechaHabilitacion: fechaHabilitacion ? new Date(fechaHabilitacion).toISOString() : undefined,
        fechaEntrega: fechaEntrega ? new Date(fechaEntrega).toISOString() : undefined,
        fechaCorte: fechaCorte ? new Date(fechaCorte).toISOString() : undefined,
        habilitada: true,
        tiposArchivosPermitidos: archivosPermitidos.trim() || ".pdf, .docx, .zip",
        tamanoMaximoMb: Number(tamanoMb) || 15,
        puntajeMaximo: Number(puntajeMax) || 100,
        documentoColaborativoHabilitado,
      };

      await api.createTareaConvocatoria(convocatoriaId, payload);
      toast("Tarea académica creada exitosamente con control de fechas Moodle", "success");

      // Limpiar borrador de tarea
      try {
        localStorage.removeItem(`ficct_create_tarea_draft_${convocatoriaId}`);
      } catch {}
      setRestoredDraftTarea(false);

      setShowCreateTareaModal(false);
      setTituloTarea("");
      setDescTarea("");
      setFechaHabilitacion("");
      setFechaEntrega("");
      setFechaCorte("");
      setDocumentoColaborativoHabilitado(false);

      const updatedTareas = await api.getTareasConvocatoria(convocatoriaId);
      setTareas(updatedTareas);
    } catch (err: any) {
      toast(err.message || "No se pudo crear la tarea", "error");
    } finally {
      setCreandoTarea(false);
    }
  };

  // Toggle de habilitación en vivo (Moodle)
  const handleToggleHabilitar = async (tareaId: number) => {
    try {
      const updated = await api.toggleHabilitarTarea(tareaId);
      setTareas((prev) => prev.map((t) => (t.id === tareaId ? { ...t, habilitada: updated.habilitada, estadoMoodle: updated.estadoMoodle } : t)));
      toast(`Recepción de entregas ${updated.habilitada ? "habilitada" : "deshabilitada"} en vivo`, "success");
    } catch (err: any) {
      toast(err.message || "Error al conmutar estado de habilitación", "error");
    }
  };

  const handleAbrirDocumentoColaborativo = async (tarea: TareaDTO) => {
    try {
      setAbriendoDocumentoColaborativo(tarea.id);
      const documento = await api.getDocumentoColaborativoTarea(tarea.id);
      setDocumentoColaborativoActivo(documento);
    } catch (err: any) {
      toast(err.message || "No se pudo abrir el documento colaborativo", "error");
    } finally {
      setAbriendoDocumentoColaborativo(null);
    }
  };

  // Manejador Designar Participante (Docente o Jurado)
  const handleDesignarParticipante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioDesignarId) {
      toast("Selecciona un usuario a designar", "error");
      return;
    }

    try {
      setDesignando(true);
      const req: DesignarParticipanteRequest = {
        usuarioId: Number(usuarioDesignarId),
        rol: rolDesignar,
      };
      await api.designarParticipante(convocatoriaId, req);
      toast(`Usuario designado exitosamente con rol ${rolDesignar}`, "success");
      setShowDesignarModal(false);
      setUsuarioDesignarId("");

      const updated = await api.getParticipantesConvocatoria(convocatoriaId);
      setParticipantes(updated);
    } catch (err: any) {
      toast(err.message || "No se pudo designar al usuario", "error");
    } finally {
      setDesignando(false);
    }
  };

  // Manejador Inscribir Estudiante
  const handleInscripcionEstudiante = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setInscribiendo(true);
      await api.inscribirseConvocatoria(convocatoriaId, {
        nombreEquipo: nombreEquipo.trim() || undefined,
      });
      toast("¡Inscripción confirmada! Ya eres parte activa de esta área.", "success");
      setShowInscripcionModal(false);
      setNombreEquipo("");

      const updated = await api.getParticipantesConvocatoria(convocatoriaId);
      setParticipantes(updated);
    } catch (err: any) {
      toast(err.message || "No se pudo completar la inscripción", "error");
    } finally {
      setInscribiendo(false);
    }
  };

  // Manejador Remover Participante
  const handleRemoverParticipante = async (participanteId: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de remover a ${nombre} de esta área?`)) return;
    try {
      await api.removerParticipante(convocatoriaId, participanteId);
      toast(`Participante ${nombre} removido del área`, "success");
      setParticipantes((prev) => prev.filter((p) => p.id !== participanteId));
    } catch (err: any) {
      toast(err.message || "Error al remover participante", "error");
    }
  };

  // Manejador Admitir Estudiante (Docente o Admin)
  const handleAdmitir = async (participanteId: number, nombreEstudiante: string) => {
    try {
      setProcesandoAdmision(true);
      await api.admitirParticipante(convocatoriaId, participanteId);
      toast(`¡${nombreEstudiante} admitido exitosamente al aula!`, "success");
      const updated = await api.getParticipantesConvocatoria(convocatoriaId);
      setParticipantes(updated);
    } catch (err: any) {
      toast(err.message || "No se pudo admitir al estudiante", "error");
    } finally {
      setProcesandoAdmision(false);
    }
  };

  // Manejador Rechazar Estudiante (Docente o Admin)
  const handleConfirmarRechazo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSolicitudForRechazo) return;
    try {
      setProcesandoAdmision(true);
      await api.rechazarParticipante(convocatoriaId, selectedSolicitudForRechazo.id, motivoRechazoInput.trim() || undefined);
      toast(`Solicitud de ${selectedSolicitudForRechazo.nombre} rechazada`, "success");
      setSelectedSolicitudForRechazo(null);
      setMotivoRechazoInput("");
      const updated = await api.getParticipantesConvocatoria(convocatoriaId);
      setParticipantes(updated);
    } catch (err: any) {
      toast(err.message || "No se pudo rechazar la solicitud", "error");
    } finally {
      setProcesandoAdmision(false);
    }
  };

  // Manejador Declinar Solicitud Propia (Estudiante)
  const handleDeclinarSolicitudPropia = async () => {
    if (!confirm("¿Deseas cancelar y declinar tu postulación a esta convocatoria?")) return;
    try {
      await api.declinarSolicitudConvocatoria(convocatoriaId);
      toast("Tu postulación ha sido cancelada exitosamente", "success");
      const updated = await api.getParticipantesConvocatoria(convocatoriaId);
      setParticipantes(updated);
    } catch (err: any) {
      toast(err.message || "No se pudo declinar la solicitud", "error");
    }
  };

  // ==========================================
  // GESTIÓN DE ENTREGAS (MOODLE LMS UX)
  // ==========================================

  // Validar y asignar archivo de entrega
  const validarYAsignarArchivoEntrega = (file: File, tarea: TareaDTO) => {
    setErrorValidacionArchivo(null);
    const validation = validateFileForTarea(file, tarea);
    if (!validation.valid) {
      setErrorValidacionArchivo(validation.error || "Archivo no admitido");
      toast(validation.error || "Archivo no admitido", "error");
      return false;
    }

    setArchivoEntregaFile(file);
    setArchivoEntregaOriginalName(file.name);
    setArchivoEntregaTamano(file.size);

    // Si aún no ha personalizado el nombre, usar el del archivo original
    if (!nombreArchivoEntrega.trim()) {
      setNombreArchivoEntrega(file.name);
    }
    return true;
  };

  // Drag & drop handlers para entrega
  const handleDragOverEntrega = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEntrega(true);
  };

  const handleDragLeaveEntrega = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEntrega(false);
  };

  const handleDropEntrega = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEntrega(false);
    if (!selectedTareaForEntrega) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validarYAsignarArchivoEntrega(file, selectedTareaForEntrega);
    }
  };

  const handleSelectFileInputEntrega = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTareaForEntrega) return;
    const file = e.target.files?.[0];
    if (file) {
      validarYAsignarArchivoEntrega(file, selectedTareaForEntrega);
    }
  };

  // Abrir Modal de Entrega con recuperación de borrador o datos previos
  const handleAbrirEntregaModal = (t: TareaDTO) => {
    setSelectedTareaForEntrega(t);
    setErrorValidacionArchivo(null);
    setEditandoNombreArchivo(false);

    const draftKey = `moodle_entrega_draft_${convocatoriaId}_${t.id}_${user?.id || "anon"}`;
    let loadedFromDraft = false;

    try {
      const rawDraft = localStorage.getItem(draftKey);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft && draft.tareaId === t.id) {
          setNombreArchivoEntrega(draft.nombreArchivo || "");
          setComentarioEstudiante(draft.comentario || "");
          setDocVinculadoId(draft.docVinculadoId || "");
          setArchivoEntregaOriginalName(draft.originalFileName || "");
          setArchivoEntregaTamano(draft.fileSize || 0);

          if (draft.fileDataUrl && draft.originalFileName) {
            const reconstructed = dataURLtoFile(draft.fileDataUrl, draft.originalFileName);
            setArchivoEntregaFile(reconstructed);
          } else {
            setArchivoEntregaFile(null);
          }

          setRestoredDraftEntrega(true);
          setLastDraftSavedEntrega(draft.updatedAt ? new Date(draft.updatedAt).toLocaleTimeString() : null);
          loadedFromDraft = true;
        }
      }
    } catch (e) {
      console.warn("Error leyendo borrador de entrega:", e);
    }

    if (!loadedFromDraft) {
      setRestoredDraftEntrega(false);
      setLastDraftSavedEntrega(null);
      if (t.miEntrega) {
        setNombreArchivoEntrega(t.miEntrega.nombreArchivo || "");
        setArchivoEntregaOriginalName(t.miEntrega.nombreArchivo || "");
        setArchivoEntregaPrevioUrl(t.miEntrega.archivoUrl || "");
        setComentarioEstudiante(t.miEntrega.comentarioEstudiante || "");
        setDocVinculadoId(t.miEntrega.documentoId || "");
      } else {
        setNombreArchivoEntrega("");
        setArchivoEntregaOriginalName("");
        setArchivoEntregaPrevioUrl("");
        setComentarioEstudiante("");
        setDocVinculadoId("");
      }
      setArchivoEntregaFile(null);
      setArchivoEntregaTamano(0);
    }
  };

  // Descartar borrador de entrega
  const handleDescartarBorradorEntrega = () => {
    if (!selectedTareaForEntrega || !user) return;
    const draftKey = `moodle_entrega_draft_${convocatoriaId}_${selectedTareaForEntrega.id}_${user.id}`;
    try {
      localStorage.removeItem(draftKey);
    } catch {}

    setRestoredDraftEntrega(false);
    setLastDraftSavedEntrega(null);
    setErrorValidacionArchivo(null);

    if (selectedTareaForEntrega.miEntrega) {
      setNombreArchivoEntrega(selectedTareaForEntrega.miEntrega.nombreArchivo || "");
      setArchivoEntregaOriginalName(selectedTareaForEntrega.miEntrega.nombreArchivo || "");
      setArchivoEntregaPrevioUrl(selectedTareaForEntrega.miEntrega.archivoUrl || "");
      setComentarioEstudiante(selectedTareaForEntrega.miEntrega.comentarioEstudiante || "");
      setDocVinculadoId(selectedTareaForEntrega.miEntrega.documentoId || "");
      setArchivoEntregaFile(null);
      setArchivoEntregaTamano(0);
    } else {
      setNombreArchivoEntrega("");
      setArchivoEntregaOriginalName("");
      setArchivoEntregaPrevioUrl("");
      setComentarioEstudiante("");
      setDocVinculadoId("");
      setArchivoEntregaFile(null);
      setArchivoEntregaTamano(0);
    }
    toast("Borrador local de entrega descartado", "info");
  };

  // Auto-guardar borrador de entrega en localStorage
  useEffect(() => {
    if (!selectedTareaForEntrega || !user) return;
    const draftKey = `moodle_entrega_draft_${convocatoriaId}_${selectedTareaForEntrega.id}_${user.id}`;

    const hasData =
      archivoEntregaFile !== null ||
      nombreArchivoEntrega.trim() !== "" ||
      comentarioEstudiante.trim() !== "" ||
      docVinculadoId !== "";

    if (!hasData) return;

    const timeoutId = setTimeout(() => {
      try {
        const draftObj: any = {
          tareaId: selectedTareaForEntrega.id,
          nombreArchivo: nombreArchivoEntrega,
          comentario: comentarioEstudiante,
          docVinculadoId,
          originalFileName: archivoEntregaFile ? archivoEntregaFile.name : archivoEntregaOriginalName,
          fileSize: archivoEntregaFile ? archivoEntregaFile.size : archivoEntregaTamano,
          fileType: archivoEntregaFile ? archivoEntregaFile.type : "",
          updatedAt: new Date().toISOString(),
        };

        if (archivoEntregaFile && archivoEntregaFile.size <= 4 * 1024 * 1024) {
          const reader = new FileReader();
          reader.onloadend = () => {
            draftObj.fileDataUrl = reader.result as string;
            try {
              localStorage.setItem(draftKey, JSON.stringify(draftObj));
              setLastDraftSavedEntrega(new Date().toLocaleTimeString());
            } catch (err) {
              console.warn("localStorage quota exceeded for base64 file:", err);
            }
          };
          reader.readAsDataURL(archivoEntregaFile);
        } else {
          localStorage.setItem(draftKey, JSON.stringify(draftObj));
          setLastDraftSavedEntrega(new Date().toLocaleTimeString());
        }
      } catch (e) {
        console.warn("Error al guardar borrador en localStorage:", e);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    selectedTareaForEntrega,
    archivoEntregaFile,
    nombreArchivoEntrega,
    comentarioEstudiante,
    docVinculadoId,
    archivoEntregaOriginalName,
    archivoEntregaTamano,
    convocatoriaId,
    user,
  ]);

  // Enviar Entrega FÍSICA con subida real al backend
  const handleEnviarEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTareaForEntrega) return;

    const tieneArchivoNuevo = Boolean(archivoEntregaFile);
    const tieneArchivoPrevio = Boolean(archivoEntregaPrevioUrl);
    const tieneDocVinculado = Boolean(docVinculadoId);

    if (!tieneArchivoNuevo && !tieneArchivoPrevio && !tieneDocVinculado) {
      toast("Debes adjuntar un archivo o vincular un documento de investigación para realizar la entrega.", "error");
      setErrorValidacionArchivo("Por favor arrastra o selecciona un archivo para tu entrega.");
      return;
    }

    if (archivoEntregaFile) {
      const val = validateFileForTarea(archivoEntregaFile, selectedTareaForEntrega);
      if (!val.valid) {
        setErrorValidacionArchivo(val.error || "Archivo no válido");
        toast(val.error || "Archivo no válido", "error");
        return;
      }
    }

    try {
      setEnviandoEntrega(true);
      let finalArchivoUrl = archivoEntregaPrevioUrl || undefined;

      // 1. Subida física real del documento si se seleccionó un archivo nuevo
      if (archivoEntregaFile) {
        try {
          const uploadRes = await api.uploadArchivo(archivoEntregaFile);
          finalArchivoUrl = uploadRes.url || uploadRes.relativePath;
        } catch (uploadErr: any) {
          toast("Error al subir el archivo físico: " + (uploadErr.message || uploadErr), "error");
          setEnviandoEntrega(false);
          return;
        }
      }

      // Asegurar extensión en nombreArchivo si el usuario lo editó
      let finalNombreArchivo = nombreArchivoEntrega.trim();
      if (!finalNombreArchivo && archivoEntregaFile) {
        finalNombreArchivo = archivoEntregaFile.name;
      } else if (finalNombreArchivo && archivoEntregaFile) {
        const lastDot = archivoEntregaFile.name.lastIndexOf(".");
        if (lastDot > 0) {
          const originalExt = archivoEntregaFile.name.substring(lastDot);
          if (!finalNombreArchivo.toLowerCase().endsWith(originalExt.toLowerCase())) {
            finalNombreArchivo += originalExt;
          }
        }
      }

      const req: EntregaRequest = {
        documentoId: docVinculadoId ? Number(docVinculadoId) : undefined,
        nombreArchivo: finalNombreArchivo || undefined,
        archivoUrl: finalArchivoUrl,
        comentarioEstudiante: comentarioEstudiante.trim() || undefined,
      };

      await api.entregarTarea(selectedTareaForEntrega.id, req);
      toast("¡Trabajo entregado con éxito a revisión académica!", "success");

      // Limpiar borrador de LocalStorage
      try {
        localStorage.removeItem(`moodle_entrega_draft_${convocatoriaId}_${selectedTareaForEntrega.id}_${user?.id || "anon"}`);
      } catch (err) {
        console.warn("No se pudo limpiar el borrador local:", err);
      }

      setSelectedTareaForEntrega(null);
      setArchivoEntregaFile(null);
      setArchivoEntregaOriginalName("");
      setArchivoEntregaTamano(0);
      setArchivoEntregaPrevioUrl("");
      setNombreArchivoEntrega("");
      setComentarioEstudiante("");
      setDocVinculadoId("");
      setErrorValidacionArchivo(null);
      setRestoredDraftEntrega(false);
      setLastDraftSavedEntrega(null);

      const updatedTareas = await api.getTareasConvocatoria(convocatoriaId);
      setTareas(updatedTareas);
    } catch (err: any) {
      toast(err.message || "Error al enviar la entrega", "error");
    } finally {
      setEnviandoEntrega(false);
    }
  };

  // ==========================================
  // GESTIÓN DE MÓDULOS (LMS / MOODLE)
  // ==========================================

  // Abrir Modal Crear Módulo con restauración de borrador
  const handleAbrirCrearModulo = () => {
    setModuloEditing(null);
    setErrorModuloImg(null);
    const draftKey = `ficct_modulo_draft_${convocatoriaId}`;
    try {
      const rawDraft = localStorage.getItem(draftKey);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        setModuloTitulo(draft.titulo || "");
        setModuloDescripcion(draft.descripcion || "");
        setModuloOrden(draft.orden || modulos.length + 1);
        setModuloImagenUrl(draft.imagenUrl || "");
        setModuloImagenPreview(draft.imagenPreview || (draft.imagenUrl ? getMediaUrl(draft.imagenUrl) : null));
        setModuloImagenFile(null);
        setRestoredDraftModulo(true);
      } else {
        setModuloTitulo("");
        setModuloDescripcion("");
        setModuloOrden(modulos.length + 1);
        setModuloImagenUrl("");
        setModuloImagenPreview(null);
        setModuloImagenFile(null);
        setRestoredDraftModulo(false);
      }
    } catch {
      setRestoredDraftModulo(false);
    }
    setShowModuloModal(true);
  };

  // Descartar borrador de módulo
  const handleDescartarBorradorModulo = () => {
    try {
      localStorage.removeItem(`ficct_modulo_draft_${convocatoriaId}`);
    } catch {}
    setRestoredDraftModulo(false);
    setModuloTitulo("");
    setModuloDescripcion("");
    setModuloOrden(modulos.length + 1);
    setModuloImagenUrl("");
    setModuloImagenFile(null);
    setModuloImagenPreview(null);
    setErrorModuloImg(null);
    toast("Borrador de módulo descartado", "info");
  };

  // Drag & drop y validación de imagen para Módulo
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

  // Auto-guardar borrador de módulo si no está editando uno existente
  useEffect(() => {
    if (!showModuloModal || moduloEditing) return;
    const hasData = moduloTitulo.trim() !== "" || moduloDescripcion.trim() !== "" || moduloImagenUrl.trim() !== "";
    if (!hasData) return;

    const timeout = setTimeout(() => {
      try {
        const draft = {
          titulo: moduloTitulo,
          descripcion: moduloDescripcion,
          orden: moduloOrden,
          imagenUrl: moduloImagenUrl,
          imagenPreview: moduloImagenPreview && !moduloImagenPreview.startsWith("blob:") ? moduloImagenPreview : null,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(`ficct_modulo_draft_${convocatoriaId}`, JSON.stringify(draft));
      } catch {}
    }, 500);

    return () => clearTimeout(timeout);
  }, [showModuloModal, moduloEditing, moduloTitulo, moduloDescripcion, moduloOrden, moduloImagenUrl, moduloImagenPreview, convocatoriaId]);

  const handleGuardarModulo = async (e: React.FormEvent) => {
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
        // Limpiar borrador de módulo
        try {
          localStorage.removeItem(`ficct_modulo_draft_${convocatoriaId}`);
        } catch {}
        setRestoredDraftModulo(false);
      }

      setShowModuloModal(false);
      setModuloEditing(null);
      setModuloTitulo("");
      setModuloDescripcion("");
      setModuloImagenUrl("");
      setModuloImagenFile(null);
      setModuloImagenPreview(null);
      setModuloOrden(1);

      const updatedMods = await api.getModulosConvocatoria(convocatoriaId);
      setModulos(updatedMods);
    } catch (err: any) {
      toast(err.message || "Error al guardar módulo", "error");
    } finally {
      setGuardandoModulo(false);
    }
  };

  const handleAbrirEditarModulo = (mod: ModuloDTO) => {
    setModuloEditing(mod);
    setModuloTitulo(mod.titulo);
    setModuloDescripcion(mod.descripcion || "");
    setModuloImagenUrl(mod.imagenUrl || "");
    setModuloImagenPreview(mod.imagenUrl ? getMediaUrl(mod.imagenUrl) : null);
    setModuloImagenFile(null);
    setModuloOrden(mod.orden || 1);
    setErrorModuloImg(null);
    setShowModuloModal(true);
  };

  const handleEliminarModulo = async (modId: number) => {
    if (!confirm("¿Estás seguro de eliminar este módulo? Las tareas dentro del módulo no se eliminarán, pasarán a ser tareas generales fuera de módulos.")) {
      return;
    }
    try {
      await api.deleteModulo(modId);
      toast("Módulo eliminado con éxito", "success");
      if (selectedModuloId === modId) {
        setSelectedModuloId(null);
      }
      const [mods, updatedTareas] = await Promise.all([
        api.getModulosConvocatoria(convocatoriaId),
        api.getTareasConvocatoria(convocatoriaId),
      ]);
      setModulos(mods);
      setTareas(updatedTareas);
    } catch (err: any) {
      toast(err.message || "Error al eliminar módulo", "error");
    }
  };

  // ==========================================
  // GESTIÓN DE ENTREGAS (SPEEDGRADER DEDICADO)
  // ==========================================
  const handleVerEntregas = async (tarea: TareaDTO) => {
    try {
      setCargandoEntregasTarea(true);
      setActiveTareaParaEntregas(tarea);
      const entregas = await api.getEntregasTarea(tarea.id);
      setEntregasTareaActual(entregas);

      // Si hay entregas, seleccionar al primer estudiante que haya entregado
      if (entregas && entregas.length > 0) {
        const primera = entregas[0];
        setSelectedEstudianteId(primera.estudianteId);
        setNotaCalificacion(
          primera.calificacion !== undefined && primera.calificacion !== null
            ? primera.calificacion
            : (tarea.puntajeMaximo || 100)
        );
        setFeedbackDocente(primera.retroalimentacion || "");
      } else {
        const primerEst = participantes.find((p) => p.rol === "ESTUDIANTE" && p.estadoInscripcion === "ACEPTADO");
        if (primerEst) {
          setSelectedEstudianteId(primerEst.usuarioId);
          setNotaCalificacion(tarea.puntajeMaximo || 100);
          setFeedbackDocente("");
        } else {
          setSelectedEstudianteId(null);
        }
      }
    } catch (err: any) {
      toast(err.message || "Error al cargar entregas", "error");
    } finally {
      setCargandoEntregasTarea(false);
    }
  };

  const handleSelectEstudianteSpeedGrader = (estId: number) => {
    setSelectedEstudianteId(estId);
    const ent = entregasTareaActual.find((e) => e.estudianteId === estId);
    if (ent) {
      setNotaCalificacion(
        ent.calificacion !== undefined && ent.calificacion !== null
          ? ent.calificacion
          : (activeTareaParaEntregas?.puntajeMaximo || 100)
      );
      setFeedbackDocente(ent.retroalimentacion || "");
    } else {
      setNotaCalificacion(activeTareaParaEntregas?.puntajeMaximo || 100);
      setFeedbackDocente("");
    }
  };

  const handleGuardarCalificacionSpeedGrader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTareaParaEntregas || !selectedEstudianteId) return;

    const ent = entregasTareaActual.find((e) => e.estudianteId === selectedEstudianteId);
    if (!ent) {
      toast("No se puede guardar calificación porque este estudiante aún no ha enviado su entrega.", "error");
      return;
    }

    try {
      setGuardandoNota(true);
      const req: CalificarEntregaRequest = {
        calificacion: Number(notaCalificacion),
        retroalimentacion: feedbackDocente.trim() || undefined,
      };

      const calificada = await api.calificarEntrega(ent.id, req);
      toast("Calificación guardada y retroalimentación enviada al estudiante", "success");

      setEntregasTareaActual((prev) =>
        prev.map((item) => (item.id === calificada.id ? calificada : item))
      );
    } catch (err: any) {
      toast(err.message || "Error al calificar entrega", "error");
    } finally {
      setGuardandoNota(false);
    }
  };

  // Navegar entre estudiantes admitidos en la pantalla de calificación
  const estudiantesAdmitidos = participantes.filter(
    (p) => p.rol === "ESTUDIANTE" && p.estadoInscripcion === "ACEPTADO"
  );

  const handleNavegarEstudiante = (direccion: "anterior" | "siguiente") => {
    if (!selectedEstudianteId || estudiantesAdmitidos.length === 0) return;
    const currentIndex = estudiantesAdmitidos.findIndex((e) => e.usuarioId === selectedEstudianteId);
    if (currentIndex === -1) return;

    let nextIndex = direccion === "anterior" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0) nextIndex = estudiantesAdmitidos.length - 1;
    if (nextIndex >= estudiantesAdmitidos.length) nextIndex = 0;

    const nextEst = estudiantesAdmitidos[nextIndex];
    if (nextEst) {
      handleSelectEstudianteSpeedGrader(nextEst.usuarioId);
    }
  };

  // Solicitudes pendientes de admisión (solo para docentes y administradores)
  const solicitudesPendientes = participantes.filter(
    (p) => p.rol === "ESTUDIANTE" && p.estadoInscripcion === "PENDIENTE"
  );

  // Participantes formalmente admitidos / activos en el aula
  const participantesAceptados = participantes.filter(
    (p) => p.estadoInscripcion === "ACEPTADO"
  );

  // Filtrado de participantes admitidos para la pestaña Directorio
  const participantesFiltrados = participantesAceptados.filter((p) => {
    const matchRol = filtroParticipanteRol === "TODOS" || p.rol === filtroParticipanteRol;
    const matchSearch =
      searchParticipante.trim() === "" ||
      `${p.nombre} ${p.apellidos}`.toLowerCase().includes(searchParticipante.toLowerCase()) ||
      p.email.toLowerCase().includes(searchParticipante.toLowerCase()) ||
      p.nombreEquipo?.toLowerCase().includes(searchParticipante.toLowerCase());
    return matchRol && matchSearch;
  });

  const conteoDocentes = participantesAceptados.filter((p) => p.rol === "DOCENTE").length;
  const conteoJurados = participantesAceptados.filter((p) => p.rol === "JURADO").length;
  const conteoEstudiantes = participantesAceptados.filter((p) => p.rol === "ESTUDIANTE").length;

  const estudiantesFiltradosSpeedGrader = estudiantesAdmitidos.filter((est) => {
    const matchSearch =
      searchEstudianteEntrega.trim() === "" ||
      `${est.nombre} ${est.apellidos}`.toLowerCase().includes(searchEstudianteEntrega.toLowerCase()) ||
      est.email.toLowerCase().includes(searchEstudianteEntrega.toLowerCase()) ||
      Boolean(est.nombreEquipo && est.nombreEquipo.toLowerCase().includes(searchEstudianteEntrega.toLowerCase()));

    if (!matchSearch) return false;

    const entrega = entregasTareaActual.find((ent) => ent.estudianteId === est.usuarioId);
    if (filtroEntregasEstado === "TODOS") return true;
    if (filtroEntregasEstado === "PENDIENTES") return !!entrega && entrega.estado === "ENTREGADO";
    if (filtroEntregasEstado === "CALIFICADOS") return !!entrega && entrega.estado === "CALIFICADO";
    if (filtroEntregasEstado === "SIN_ENTREGA") return !entrega;
    return true;
  });

  const selectedEstudianteObj = estudiantesAdmitidos.find((e) => e.usuarioId === selectedEstudianteId);
  const selectedEntregaObj = entregasTareaActual.find((e) => e.estudianteId === selectedEstudianteId);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!convocatoria) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <AlertCircle className="w-12 h-12 text-accent mx-auto mb-3" />
          <h2 className="text-xl font-serif font-bold text-ink">Área o Convocatoria no encontrada</h2>
          <p className="text-sm text-ink-soft mt-1">El evento solicitado no existe o fue retirado.</p>
          <Link
            href="/dashboard/convocatorias"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-accent text-white rounded-lg text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a Convocatorias
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // ========================================================
  // MODO SPEEDGRADER DEDICADO (PANTALLA COMPLETA DE ENTREGAS)
  // ========================================================
  if (activeTareaParaEntregas) {
    const totalEntregadas = entregasTareaActual.filter(
      (e) => e.estado === "ENTREGADO"
    ).length;
    const totalCalificadas = entregasTareaActual.filter(
      (e) => e.estado === "CALIFICADO"
    ).length;
    const totalSinEntrega = estudiantesAdmitidos.length - entregasTareaActual.length;

    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-6 pb-16">
          {/* Toast Flotante */}
          {toastMsg && (
            <div
              className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2.5 transition-all ${
                toastMsg.type === "success"
                  ? "bg-emerald-600 text-white shadow-emerald-600/20"
                  : "bg-red-600 text-white shadow-red-600/20"
              }`}
            >
              {toastMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{toastMsg.text}</span>
            </div>
          )}

          {/* SpeedGrader Top Bar */}
          <div className="bg-paper border border-line rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTareaParaEntregas(null);
                    setEntregasTareaActual([]);
                    setSelectedEstudianteId(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-accent font-medium mb-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver a Convocatoria y Tareas
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent uppercase tracking-wider">
                    Consola de Evaluación SpeedGrader
                  </span>
                  {activeTareaParaEntregas.moduloTitulo && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-paper-sunken border border-line text-ink-soft">
                      {activeTareaParaEntregas.moduloTitulo}
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-ink flex items-center gap-2">
                  <FileText className="w-6 h-6 text-accent" /> {activeTareaParaEntregas.titulo}
                </h1>
                <p className="text-xs text-ink-soft">
                  Puntaje Máximo: <strong>{activeTareaParaEntregas.puntajeMaximo} pts</strong> • Formatos permitidos: {activeTareaParaEntregas.tiposArchivosPermitidos}
                </p>
              </div>

              {/* Métricas / KPIs del aula en esta tarea */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                <div className="px-3 py-2 bg-paper-sunken border border-line rounded-xl text-center min-w-[80px]">
                  <span className="text-[10px] text-ink-faint uppercase font-semibold block">Inscritos</span>
                  <span className="text-base font-bold text-ink">{estudiantesAdmitidos.length}</span>
                </div>
                <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center min-w-[80px]">
                  <span className="text-[10px] text-blue-700 dark:text-blue-300 uppercase font-semibold block">Entregas</span>
                  <span className="text-base font-bold text-blue-700 dark:text-blue-300">{entregasTareaActual.length}</span>
                </div>
                <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center min-w-[80px]">
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-semibold block">Por Calificar</span>
                  <span className="text-base font-bold text-amber-700 dark:text-amber-300">{totalEntregadas}</span>
                </div>
                <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center min-w-[80px]">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-semibold block">Calificadas</span>
                  <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">{totalCalificadas}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SpeedGrader Workspace: 2 Columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px]">
            {/* Columna Izquierda: Directorio de Estudiantes */}
            <div className="lg:col-span-4 bg-paper border border-line rounded-2xl flex flex-col overflow-hidden shadow-xs">
              <div className="p-4 border-b border-line space-y-3 bg-paper-sunken/40">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-accent" /> Estudiantes ({estudiantesAdmitidos.length})
                  </h3>
                  {cargandoEntregasTarea && (
                    <span className="text-[10px] text-ink-faint animate-pulse">Cargando...</span>
                  )}
                </div>

                {/* Búsqueda rápida */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                  <input
                    type="text"
                    placeholder="Buscar estudiante o equipo..."
                    value={searchEstudianteEntrega}
                    onChange={(e) => setSearchEstudianteEntrega(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-paper border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Filtros de estado de entrega */}
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <button
                    onClick={() => setFiltroEntregasEstado("TODOS")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      filtroEntregasEstado === "TODOS"
                        ? "bg-accent text-white"
                        : "bg-paper border border-line text-ink-soft hover:bg-paper-sunken"
                    }`}
                  >
                    Todos ({estudiantesAdmitidos.length})
                  </button>
                  <button
                    onClick={() => setFiltroEntregasEstado("PENDIENTES")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      filtroEntregasEstado === "PENDIENTES"
                        ? "bg-amber-600 text-white"
                        : "bg-paper border border-line text-amber-700 hover:bg-amber-50"
                    }`}
                  >
                    Por Calificar ({totalEntregadas})
                  </button>
                  <button
                    onClick={() => setFiltroEntregasEstado("CALIFICADOS")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      filtroEntregasEstado === "CALIFICADOS"
                        ? "bg-emerald-600 text-white"
                        : "bg-paper border border-line text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    Calificadas ({totalCalificadas})
                  </button>
                  <button
                    onClick={() => setFiltroEntregasEstado("SIN_ENTREGA")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      filtroEntregasEstado === "SIN_ENTREGA"
                        ? "bg-ink text-white"
                        : "bg-paper border border-line text-ink-faint hover:bg-paper-sunken"
                    }`}
                  >
                    Sin Entrega ({Math.max(0, totalSinEntrega)})
                  </button>
                </div>
              </div>

              {/* Lista Scrollable de Estudiantes */}
              <div className="flex-1 overflow-y-auto divide-y divide-line max-h-[620px]">
                {estudiantesFiltradosSpeedGrader.length === 0 ? (
                  <div className="p-8 text-center text-xs text-ink-faint">
                    No se encontraron estudiantes con los filtros seleccionados.
                  </div>
                ) : (
                  estudiantesFiltradosSpeedGrader.map((est) => {
                    const ent = entregasTareaActual.find((e) => e.estudianteId === est.usuarioId);
                    const isSelected = est.usuarioId === selectedEstudianteId;
                    const esCalificada = ent && ent.estado === "CALIFICADO";
                    const esPendiente = ent && ent.estado === "ENTREGADO";

                    return (
                      <div
                        key={est.id}
                        onClick={() => handleSelectEstudianteSpeedGrader(est.usuarioId)}
                        className={`p-3.5 cursor-pointer transition-all flex items-center justify-between gap-3 text-xs ${
                          isSelected
                            ? "bg-accent/10 border-l-4 border-accent text-ink font-medium"
                            : "hover:bg-paper-sunken/60 text-ink-soft"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSelected
                                ? "bg-accent text-white"
                                : "bg-paper-sunken border border-line text-ink"
                            }`}
                          >
                            {est.nombre.charAt(0)}
                            {est.apellidos?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <span className={`block truncate ${isSelected ? "text-ink font-bold" : "text-ink"}`}>
                              {est.nombre} {est.apellidos}
                            </span>
                            <span className="text-[10px] text-ink-faint block truncate">{est.email}</span>
                            {est.nombreEquipo && (
                              <span className="text-[10px] text-accent flex items-center gap-1 mt-0.5 truncate">
                                <Tag className="w-2.5 h-2.5 shrink-0" /> {est.nombreEquipo}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Estado Badge del estudiante */}
                        <div className="shrink-0 text-right">
                          {esCalificada ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                              {ent.calificacion}/{activeTareaParaEntregas.puntajeMaximo} pts
                            </span>
                          ) : esPendiente ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 animate-pulse">
                              Por calificar
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-paper-sunken text-ink-faint border border-line">
                              Sin entrega
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Columna Derecha: Mesa de Revisión y Consola de Calificación */}
            <div className="lg:col-span-8 bg-paper border border-line rounded-2xl flex flex-col overflow-hidden shadow-xs">
              <div className="p-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-paper-sunken/40">
                <div className="flex items-center gap-3">
                  {selectedEstudianteObj ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-ink">
                          {selectedEstudianteObj.nombre} {selectedEstudianteObj.apellidos}
                        </h2>
                        {selectedEstudianteObj.nombreEquipo && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-accent/10 text-accent">
                            Equipo: {selectedEstudianteObj.nombreEquipo}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-soft">{selectedEstudianteObj.email}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-ink-faint">Ningún estudiante seleccionado</span>
                  )}
                </div>

                {/* Flechas de Navegación Anterior / Siguiente */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleNavegarEstudiante("anterior")}
                    className="px-2.5 py-1.5 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Estudiante anterior"
                  >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                  <button
                    onClick={() => handleNavegarEstudiante("siguiente")}
                    className="px-2.5 py-1.5 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Siguiente estudiante"
                  >
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Área principal del visor y calificación */}
              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                {!selectedEstudianteObj ? (
                  <div className="py-24 text-center space-y-2">
                    <Users className="w-12 h-12 text-ink-faint mx-auto opacity-50" />
                    <h4 className="text-sm font-semibold text-ink">Selecciona un estudiante</h4>
                    <p className="text-xs text-ink-soft max-w-sm mx-auto">
                      Haz clic en cualquiera de los estudiantes del directorio de la izquierda para revisar su trabajo y registrar su nota.
                    </p>
                  </div>
                ) : !selectedEntregaObj ? (
                  <div className="py-16 text-center space-y-3 bg-paper-sunken/40 rounded-2xl border border-line p-8">
                    <Clock className="w-10 h-10 text-ink-faint mx-auto" />
                    <h4 className="text-base font-bold text-ink">Sin entrega registrada</h4>
                    <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
                      El estudiante <strong>{selectedEstudianteObj.nombre} {selectedEstudianteObj.apellidos}</strong> no ha subido ningún trabajo para esta tarea todavía.
                    </p>
                    <div className="pt-2 text-xs text-ink-faint">
                      {activeTareaParaEntregas.fechaCorte && (
                        <span>
                          Fecha de corte definitivo: {new Date(activeTareaParaEntregas.fechaCorte).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Tarjeta de Detalles del Envío */}
                    <div className="bg-paper-sunken/50 border border-line rounded-2xl p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-ink-faint">Fecha y Hora de Entrega</span>
                          <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            {new Date(selectedEntregaObj.fechaEntrega).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                              selectedEntregaObj.estado === "CALIFICADO"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                            }`}
                          >
                            {selectedEntregaObj.estado}
                          </span>
                        </div>
                      </div>

                      {/* Archivo adjunto */}
                      {selectedEntregaObj.nombreArchivo && (
                        <div className="p-3.5 bg-paper rounded-xl border border-line flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-ink block truncate">
                                {selectedEntregaObj.nombreArchivo}
                              </span>
                              <span className="text-[10px] text-ink-faint">Archivo de entrega del estudiante</span>
                            </div>
                          </div>

                          <a
                            href={getMediaUrl(selectedEntregaObj.archivoUrl || selectedEntregaObj.nombreArchivo)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Ver / Descargar
                          </a>
                        </div>
                      )}

                      {/* Documento de Investigación vinculado si aplica */}
                      {selectedEntregaObj.documentoId && (
                        <div className="p-3.5 bg-paper rounded-xl border border-line flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <BookOpen className="w-5 h-5 text-blue-600 shrink-0" />
                            <div>
                              <span className="font-bold text-ink block">Documento de Investigación Vinculado</span>
                              <span className="text-[10px] text-ink-faint">
                                {selectedEntregaObj.documentoTitulo || `ID: #${selectedEntregaObj.documentoId}`}
                              </span>
                            </div>
                          </div>
                          <Link
                            href={`/dashboard/documentos/${selectedEntregaObj.documentoId}`}
                            target="_blank"
                            className="text-xs text-accent font-semibold hover:underline flex items-center gap-1"
                          >
                            Abrir Documento <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}

                      {/* Comentario del estudiante */}
                      {selectedEntregaObj.comentarioEstudiante && (
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-ink-faint block">
                            Nota o Comentario del Estudiante
                          </span>
                          <div className="p-3 bg-paper rounded-xl border border-line text-xs text-ink italic leading-relaxed">
                            &ldquo;{selectedEntregaObj.comentarioEstudiante}&rdquo;
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Consola de Evaluación Docente / Jurado */}
                    <div className="bg-paper border-2 border-accent/20 rounded-2xl p-6 shadow-xs space-y-4">
                      <div className="border-b border-line pb-3 flex items-center justify-between">
                        <h3 className="text-sm font-serif font-bold text-ink flex items-center gap-2">
                          <Award className="w-4 h-4 text-accent" /> Calificación &amp; Rúbrica Pedagógica
                        </h3>
                        {selectedEntregaObj.calificacion !== undefined && selectedEntregaObj.calificacion !== null && (
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            Nota actual: {selectedEntregaObj.calificacion} / {activeTareaParaEntregas.puntajeMaximo}
                          </span>
                        )}
                      </div>

                      <form onSubmit={handleGuardarCalificacionSpeedGrader} className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="font-bold text-ink block mb-1">
                              Calificación Obtenida (0 a {activeTareaParaEntregas.puntajeMaximo}) *
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={activeTareaParaEntregas.puntajeMaximo}
                                required
                                value={notaCalificacion}
                                onChange={(e) => setNotaCalificacion(Number(e.target.value))}
                                className="w-28 px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink font-bold text-lg text-center focus:outline-none focus:border-accent"
                              />
                              <span className="text-xs text-ink-faint font-semibold">
                                / {activeTareaParaEntregas.puntajeMaximo} puntos
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col justify-end">
                            <span className="text-[11px] text-ink-soft">
                              Al guardar, la nota y retroalimentación serán visibles inmediatamente para el estudiante en su panel de calificaciones.
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="font-bold text-ink block mb-1">
                            Retroalimentación Pedagógica y Observaciones
                          </label>
                          <textarea
                            rows={4}
                            value={feedbackDocente}
                            onChange={(e) => setFeedbackDocente(e.target.value)}
                            placeholder="Ej. Muy buen análisis de datos. En la sección 3 se recomienda reforzar las citas bibliográficas bajo formato IEEE..."
                            className="w-full px-3 py-2.5 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent resize-none leading-relaxed"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-line">
                          <button
                            type="button"
                            onClick={() => handleNavegarEstudiante("siguiente")}
                            className="text-xs text-ink-faint hover:text-ink font-medium cursor-pointer"
                          >
                            Saltar a siguiente →
                          </button>
                          <button
                            type="submit"
                            disabled={guardandoNota}
                            className="px-5 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl font-bold shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            {guardandoNota ? "Guardando..." : "Guardar Calificación y Retroalimentación"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-16">
        {documentoColaborativoActivo && (
          <CollaborativeDocumentEditor
            documento={documentoColaborativoActivo}
            currentUserName={user ? `${user.nombre} ${user.apellido}` : undefined}
            onClose={() => setDocumentoColaborativoActivo(null)}
            onSaved={(doc) => setDocumentoColaborativoActivo(doc)}
          />
        )}

        {/* Toast Flotante */}
        {toastMsg && (
          <div
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2.5 transition-all ${
              toastMsg.type === "success"
                ? "bg-emerald-600 text-white shadow-emerald-600/20"
                : "bg-red-600 text-white shadow-red-600/20"
            }`}
          >
            {toastMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* Encabezado y Breadcrumb */}
        <div>
          <div className="flex items-center gap-2 text-xs text-ink-faint mb-2">
            <Link href="/dashboard/convocatorias" className="hover:text-accent flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Convocatorias
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-ink-soft font-medium truncate max-w-xs">{convocatoria.titulo}</span>
          </div>

          <div className="bg-paper border border-line rounded-2xl shadow-sm relative overflow-hidden">
            {convocatoria.imagenPortada && (
              <div className="w-full h-44 sm:h-56 relative overflow-hidden bg-paper-sunken border-b border-line-soft">
                <img
                  src={getMediaUrl(convocatoria.imagenPortada)}
                  alt={convocatoria.titulo}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent uppercase tracking-wider">
                    {convocatoria.tipo}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                      convocatoria.estado === "PUBLICADA"
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-amber-500/10 text-amber-700"
                    }`}
                  >
                    {convocatoria.estado}
                  </span>
                  {miParticipacion && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700">
                      Mi Rol: {miParticipacion.rol} {miParticipacion.nombreEquipo && `(${miParticipacion.nombreEquipo})`}
                    </span>
                  )}
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink leading-snug">
                  {convocatoria.titulo}
                </h1>
                <p className="text-xs sm:text-sm text-ink-soft line-clamp-2">{convocatoria.descripcion}</p>

                {/* Métricas rápidas del aula */}
                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-ink-soft">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>{participantes.length} Participantes</span>
                    <span className="text-ink-faint">
                      ({conteoDocentes} Docentes, {conteoJurados} Jurados, {conteoEstudiantes} Estudiantes)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <FileText className="w-4 h-4 text-accent" />
                    <span>{tareas.length} Tareas Publicadas</span>
                  </div>
                  {convocatoria.fechaCierre && (
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <span>Cierre oficial: {convocatoria.fechaCierre}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción rápida en encabezado */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Botón de inscripción o estado para estudiante */}
                {user?.rol === "ESTUDIANTE" && (
                  <>
                    {esEstudiantePendiente && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Solicitud en Revisión
                        </span>
                        <button
                          onClick={handleDeclinarSolicitudPropia}
                          className="px-3 py-1.5 bg-danger-soft/20 text-danger hover:bg-danger-soft/40 rounded-xl text-xs font-semibold border border-danger/30 transition-all cursor-pointer"
                        >
                          Declinar Solicitud
                        </button>
                      </div>
                    )}
                    {!esEstudianteInscrito && !esEstudiantePendiente && (
                      <button
                        onClick={() => setShowInscripcionModal(true)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <UserPlus className="w-4 h-4" /> Solicitar Inscripción al Área
                      </button>
                    )}
                  </>
                )}

                {/* Botón de designación (Admin puede ambos; Docente encargado puede designar Jurado) */}
                {puedeDesignarJurado && (
                  <button
                    onClick={() => {
                      setRolDesignar(esAdmin ? "DOCENTE" : "JURADO");
                      setShowDesignarModal(true);
                    }}
                    className="px-4 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    {esAdmin ? "Designar Docente / Jurado" : "Designar Jurado Evaluador"}
                  </button>
                )}

                {/* Botón de editar convocatoria para Admin */}
                {esAdmin && (
                  <Link
                    href={`/dashboard/convocatorias/${convocatoriaId}/editar`}
                    className="px-4 py-2.5 bg-paper-raised hover:bg-paper border border-line text-ink rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <Pencil className="w-4 h-4 text-accent" /> Editar
                  </Link>
                )}

                {/* Botón de crear tarea y módulo (solo docentes asignados o admin) */}
                {puedeGestionarTareas && (
                  <>
                    <button
                      onClick={handleAbrirCrearModulo}
                      className="px-3.5 py-2.5 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FolderKanban className="w-4 h-4 text-accent" /> + Módulo
                    </button>
                    <button
                      onClick={() => handleAbrirCrearTarea()}
                      className="px-4 py-2.5 bg-ink hover:bg-black text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" /> + Tarea (Moodle)
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Selector de Pestañas tipo Moodle */}
            <div className="flex border-b border-line mt-6 -mb-6 -mx-6 sm:-mx-8 px-6 sm:px-8 gap-6 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("tareas")}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === "tareas"
                    ? "border-accent text-accent"
                    : "border-transparent text-ink-faint hover:text-ink"
                }`}
              >
                <FolderKanban className="w-4 h-4" /> Módulos &amp; Tareas ({modulos.length > 0 ? `${modulos.length} Módulos` : `${tareas.length} Tareas`})
              </button>

              <button
                onClick={() => setActiveTab("participantes")}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === "participantes"
                    ? "border-accent text-accent"
                    : "border-transparent text-ink-faint hover:text-ink"
                }`}
              >
                <Users className="w-4 h-4" /> Participantes ({participantes.length})
              </button>

              <button
                onClick={() => setActiveTab("info")}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === "info"
                    ? "border-accent text-accent"
                    : "border-transparent text-ink-faint hover:text-ink"
                }`}
              >
                <AlertCircle className="w-4 h-4" /> Bases &amp; Requisitos
              </button>
            </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* PESTAÑA 1: MÓDULOS DE APRENDIZAJE & TAREAS           */}
        {/* ==================================================== */}
        {activeTab === "tareas" && (
          <div className="space-y-6">
            {user?.rol === "ESTUDIANTE" && !esEstudianteInscrito && convocatoria.estado !== "FINALIZADA" ? (
              <div className="bg-paper border border-line rounded-2xl p-12 text-center space-y-3 shadow-xs">
                <Lock className="w-10 h-10 text-ink-faint mx-auto" />
                <h3 className="text-base font-serif font-bold text-ink">
                  Tareas reservadas para estudiantes admitidos
                </h3>
                <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
                  {esEstudiantePendiente
                    ? "Tu postulación a esta convocatoria se encuentra actualmente en revisión por el docente o administrador. Tan pronto como seas admitido, tendrás acceso a los módulos, tareas y evaluaciones."
                    : "Debes solicitar tu inscripción al área y esperar la admisión del docente encargado para acceder a los módulos y tareas del aula virtual."}
                </p>
                {!esEstudiantePendiente && (
                  <button
                    onClick={() => setShowInscripcionModal(true)}
                    className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" /> Solicitar Inscripción al Área
                  </button>
                )}
              </div>
            ) : selectedModuloId === null ? (
              /* ==================================================== */
              /* SUBVISTA 1.A: GRID DE MÓDULOS + TAREAS GENERALES     */
              /* ==================================================== */
              <div className="space-y-6">
                {/* Cabecera de la sección Módulos */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-paper border border-line rounded-2xl p-4 sm:p-5 shadow-xs">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                      <FolderKanban className="w-5 h-5 text-accent" /> Módulos de Aprendizaje
                    </h3>
                    <p className="text-xs text-ink-soft mt-0.5">
                      Contenido temático y fases organizadas para esta convocatoria.
                    </p>
                  </div>

                  {puedeGestionarTareas && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAbrirCrearModulo}
                        className="px-3.5 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" /> Nuevo Módulo
                      </button>
                      <button
                        onClick={() => handleAbrirCrearTarea()}
                        className="px-3.5 py-2 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-accent" /> + Tarea General
                      </button>
                    </div>
                  )}
                </div>

                {/* Grid de Cards de Módulos */}
                {modulos.length === 0 ? (
                  <div className="bg-paper border border-line rounded-2xl p-8 text-center space-y-3">
                    <Layers className="w-10 h-10 text-ink-faint mx-auto" />
                    <h4 className="text-base font-serif font-bold text-ink">No hay módulos configurados aún</h4>
                    <p className="text-xs text-ink-soft max-w-md mx-auto">
                      {puedeGestionarTareas
                        ? "Crea módulos temáticos para estructurar las tareas y fases de investigación de manera ordenada estilo Moodle."
                        : "El docente aún no ha organizado los contenidos en módulos."}
                    </p>
                    {puedeGestionarTareas && (
                      <button
                        onClick={handleAbrirCrearModulo}
                        className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" /> Crear Primer Módulo
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {modulos.map((mod) => {
                      const tareasDelMod = tareas.filter((t) => t.moduloId === mod.id);
                      const entregadasDelMod = tareasDelMod.filter((t) => t.miEntrega).length;

                      return (
                        <div
                          key={mod.id}
                          className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                          <div>
                            {/* Portada o banner del Módulo */}
                            <div className="w-full h-36 bg-paper-sunken relative overflow-hidden border-b border-line flex items-center justify-center">
                              {mod.imagenUrl ? (
                                <img
                                  src={getMediaUrl(mod.imagenUrl)}
                                  alt={mod.titulo}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-ink-faint">
                                  <FolderKanban className="w-10 h-10 text-accent/50" />
                                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                                    Módulo Académico
                                  </span>
                                </div>
                              )}
                              <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                                Módulo #{mod.orden}
                              </span>
                            </div>

                            {/* Contenido del Módulo */}
                            <div className="p-5 space-y-2">
                              <h4 className="font-serif text-base font-bold text-ink group-hover:text-accent transition-colors line-clamp-1">
                                {mod.titulo}
                              </h4>
                              {mod.descripcion ? (
                                <p className="text-xs text-ink-soft line-clamp-2 leading-relaxed">
                                  {mod.descripcion}
                                </p>
                              ) : (
                                <p className="text-xs text-ink-faint italic">Sin descripción complementaria.</p>
                              )}

                              {/* Indicadores de Tareas */}
                              <div className="pt-2 flex items-center justify-between text-xs text-ink-soft">
                                <span className="flex items-center gap-1 font-medium">
                                  <FileText className="w-3.5 h-3.5 text-accent" />
                                  {tareasDelMod.length} {tareasDelMod.length === 1 ? "tarea" : "tareas"}
                                </span>
                                {user?.rol === "ESTUDIANTE" && tareasDelMod.length > 0 && (
                                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                    {entregadasDelMod}/{tareasDelMod.length} entregadas
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Footer con acciones */}
                          <div className="p-4 pt-0 border-t border-line-soft mt-3 flex items-center justify-between gap-2">
                            <button
                              onClick={() => setSelectedModuloId(mod.id)}
                              className="px-3.5 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all flex-1 justify-center shadow-xs cursor-pointer"
                            >
                              Entrar al Módulo <ChevronRight className="w-4 h-4" />
                            </button>

                            {puedeGestionarTareas && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleAbrirEditarModulo(mod)}
                                  title="Editar Módulo"
                                  className="p-2 text-ink-faint hover:text-ink rounded-lg border border-line hover:bg-paper-sunken transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleEliminarModulo(mod.id)}
                                  title="Eliminar Módulo"
                                  className="p-2 text-ink-faint hover:text-red-600 rounded-lg border border-line hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* SECCIÓN DE TAREAS GENERALES (FUERA DE MÓDULOS) */}
                <div className="pt-4 border-t border-line space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                        <FileText className="w-4 h-4 text-accent" /> Tareas Generales y Transversales
                      </h4>
                      <p className="text-xs text-ink-soft">
                        Actividades y entregas no adscritas a un módulo específico.
                      </p>
                    </div>

                    {puedeGestionarTareas && (
                      <button
                        onClick={() => handleAbrirCrearTarea()}
                        className="px-3 py-1.5 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-accent" /> Nueva Tarea General
                      </button>
                    )}
                  </div>

                  {(() => {
                    const tareasGenerales = tareas.filter((t) => !t.moduloId);
                    if (tareasGenerales.length === 0) {
                      return (
                        <div className="p-6 bg-paper-sunken/40 border border-line rounded-xl text-center text-xs text-ink-faint">
                          No hay tareas generales fuera de módulos.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {tareasGenerales.map((t) => (
                          <div
                            key={t.id}
                            className="bg-paper border border-line rounded-2xl p-5 shadow-xs hover:border-line-dark transition-all space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-serif text-base font-bold text-ink">{t.titulo}</h3>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                      t.estadoMoodle === "ABIERTA"
                                        ? "bg-emerald-500/10 text-emerald-700"
                                        : t.estadoMoodle === "PENDIENTE_APERTURA"
                                        ? "bg-blue-500/10 text-blue-700"
                                        : t.estadoMoodle === "ENTREGA_CON_RETRASO"
                                        ? "bg-amber-500/10 text-amber-700"
                                        : "bg-red-500/10 text-red-700"
                                    }`}
                                  >
                                    {t.estadoMoodle?.replace("_", " ") || (t.habilitada ? "ABIERTA" : "CERRADA")}
                                  </span>
                                </div>
                                {t.descripcion && <p className="text-xs text-ink-soft">{t.descripcion}</p>}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-2.5 py-1 bg-paper-sunken border border-line rounded-lg text-xs font-bold text-ink">
                                  {t.puntajeMaximo} pts
                                </span>
                                {puedeGestionarTareas && (
                                  <button
                                    onClick={() => handleToggleHabilitar(t.id)}
                                    title={t.habilitada ? "Deshabilitar recepción" : "Habilitar recepción"}
                                    className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                                      t.habilitada
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                        : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                    }`}
                                  >
                                    {t.habilitada ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                    <span className="hidden sm:inline">{t.habilitada ? "Abierta" : "Cerrada"}</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Triple Control de Fechas */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-paper-sunken/60 p-2.5 rounded-xl border border-line text-xs">
                              <div>
                                <span className="text-[10px] uppercase text-ink-faint block font-semibold">1. Habilitación</span>
                                <span className="font-medium text-ink">
                                  {t.fechaHabilitacion ? new Date(t.fechaHabilitacion).toLocaleString() : "Inmediata"}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase text-ink-faint block font-semibold">2. Entrega Límite</span>
                                <span className="font-medium text-ink">
                                  {t.fechaEntrega
                                    ? new Date(t.fechaEntrega).toLocaleString()
                                    : t.fechaLimite
                                    ? new Date(t.fechaLimite).toLocaleString()
                                    : "Sin límite"}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase text-ink-faint block font-semibold">3. Fecha Corte</span>
                                <span className="font-medium text-ink">
                                  {t.fechaCorte ? new Date(t.fechaCorte).toLocaleString() : "Sin fecha corte"}
                                </span>
                              </div>
                            </div>

                            {/* Footer tarea */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs text-ink-soft">
                              <span>Archivos: {t.tiposArchivosPermitidos} • Máx: {t.tamanoMaximoMb} MB</span>
                              <div className="flex items-center gap-2">
                                {t.documentoColaborativoHabilitado && (
                                  <button
                                    onClick={() => handleAbrirDocumentoColaborativo(t)}
                                    disabled={abriendoDocumentoColaborativo === t.id}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    {abriendoDocumentoColaborativo === t.id ? "Abriendo..." : "Abrir Documento"}
                                  </button>
                                )}
                                {(puedeGestionarTareas || esJuradoEnEstaArea) && (
                                  <button
                                    onClick={() => handleVerEntregas(t)}
                                    className="px-3 py-1.5 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    <Users className="w-3.5 h-3.5 text-blue-600" />
                                    Gestionar Entregas ({t.totalEntregas})
                                  </button>
                                )}
                                {user?.rol === "ESTUDIANTE" && (
                                  <button
                                    onClick={() => handleAbrirEntregaModal(t)}
                                    disabled={!t.habilitada || t.estadoMoodle === "CERRADA_CORTE"}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                      t.miEntrega
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : t.habilitada && t.estadoMoodle !== "CERRADA_CORTE"
                                        ? "bg-accent text-white hover:bg-accent-dark"
                                        : "bg-paper-sunken text-ink-faint cursor-not-allowed"
                                    }`}
                                  >
                                    <Upload className="w-3.5 h-3.5" />
                                    {t.miEntrega ? "Modificar Entrega" : "Subir Trabajo"}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Resumen entrega previa estudiante */}
                            {t.miEntrega && (
                              <div className="mt-2 bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1.5">
                                <div className="flex items-center justify-between font-semibold text-emerald-800">
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Trabajo Entregado el{" "}
                                    {new Date(t.miEntrega.fechaEntrega).toLocaleString()}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase font-bold text-[10px]">
                                    {t.miEntrega.estado}
                                  </span>
                                </div>

                                {t.miEntrega.nombreArchivo && (
                                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-200/60 text-[11px] text-ink">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {renderArchivoIcon(t.miEntrega.nombreArchivo, "w-4 h-4")}
                                      <span className="truncate font-medium">{t.miEntrega.nombreArchivo}</span>
                                    </div>
                                    {t.miEntrega.archivoUrl && (
                                      <a
                                        href={getMediaUrl(t.miEntrega.archivoUrl)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
                                      >
                                        <Download className="w-3 h-3" /> Ver Archivo
                                      </a>
                                    )}
                                  </div>
                                )}

                                {t.miEntrega.calificacion !== undefined && t.miEntrega.calificacion !== null && (
                                  <div className="text-ink pt-1">
                                    <span className="font-bold text-accent text-sm">
                                      Nota: {t.miEntrega.calificacion} / {t.puntajeMaximo}
                                    </span>
                                    {t.miEntrega.retroalimentacion && (
                                      <p className="text-ink-soft mt-0.5 italic">
                                        Retroalimentación: &ldquo;{t.miEntrega.retroalimentacion}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              /* ==================================================== */
              /* SUBVISTA 1.B: VISTA DETALLADA DEL MÓDULO ENFOCADO    */
              /* ==================================================== */
              (() => {
                const moduloActual = modulos.find((m) => m.id === selectedModuloId);
                if (!moduloActual) {
                  return (
                    <div className="p-8 text-center bg-paper border border-line rounded-2xl">
                      <p className="text-xs text-ink-soft">El módulo seleccionado no existe.</p>
                      <button
                        onClick={() => setSelectedModuloId(null)}
                        className="mt-3 px-4 py-2 bg-accent text-white rounded-xl text-xs font-semibold"
                      >
                        Volver a Módulos
                      </button>
                    </div>
                  );
                }

                const tareasDelModulo = tareas.filter((t) => t.moduloId === moduloActual.id);

                return (
                  <div className="space-y-6">
                    {/* Barra de navegación de retorno */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-paper border border-line rounded-2xl p-4 sm:p-5 shadow-xs">
                      <div>
                        <button
                          onClick={() => setSelectedModuloId(null)}
                          className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-accent font-medium mb-1 transition-colors cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" /> Volver a todos los Módulos
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent/10 text-accent">
                            Módulo #{moduloActual.orden}
                          </span>
                          <h3 className="font-serif text-lg font-bold text-ink">{moduloActual.titulo}</h3>
                        </div>
                      </div>

                      {puedeGestionarTareas && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAbrirCrearTarea(moduloActual.id)}
                            className="px-3.5 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <PlusCircle className="w-4 h-4" /> + Tarea en este Módulo
                          </button>
                          <button
                            onClick={() => handleAbrirEditarModulo(moduloActual)}
                            className="px-3 py-2 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Banner y descripción del módulo */}
                    <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
                      {moduloActual.imagenUrl && (
                        <div className="w-full h-44 sm:h-52 bg-paper-sunken border-b border-line overflow-hidden">
                          <img
                            src={getMediaUrl(moduloActual.imagenUrl)}
                            alt={moduloActual.titulo}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      {moduloActual.descripcion && (
                        <div className="p-5 text-xs text-ink-soft leading-relaxed whitespace-pre-line border-b border-line-soft">
                          {moduloActual.descripcion}
                        </div>
                      )}
                    </div>

                    {/* Lista de Tareas en este Módulo */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                          <FileText className="w-4 h-4 text-accent" /> Tareas de este Módulo ({tareasDelModulo.length})
                        </h4>
                      </div>

                      {tareasDelModulo.length === 0 ? (
                        <div className="bg-paper border border-line rounded-2xl p-10 text-center space-y-3">
                          <FileText className="w-10 h-10 text-ink-faint mx-auto" />
                          <h4 className="text-base font-serif font-bold text-ink">
                            No hay tareas registradas en este módulo
                          </h4>
                          <p className="text-xs text-ink-soft max-w-sm mx-auto">
                            {puedeGestionarTareas
                              ? "Agrega la primera tarea o entrega académica para este módulo temático."
                              : "El docente no ha asignado tareas en este módulo aún."}
                          </p>
                          {puedeGestionarTareas && (
                            <button
                              onClick={() => handleAbrirCrearTarea(moduloActual.id)}
                              className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <PlusCircle className="w-4 h-4" /> Crear Tarea en este Módulo
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {tareasDelModulo.map((t) => (
                            <div
                              key={t.id}
                              className="bg-paper border border-line rounded-2xl p-5 sm:p-6 shadow-xs hover:border-line-dark transition-all space-y-4"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-serif text-base sm:text-lg font-bold text-ink">{t.titulo}</h3>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                        t.estadoMoodle === "ABIERTA"
                                          ? "bg-emerald-500/10 text-emerald-700"
                                          : t.estadoMoodle === "PENDIENTE_APERTURA"
                                          ? "bg-blue-500/10 text-blue-700"
                                          : t.estadoMoodle === "ENTREGA_CON_RETRASO"
                                          ? "bg-amber-500/10 text-amber-700"
                                          : "bg-red-500/10 text-red-700"
                                      }`}
                                    >
                                      {t.estadoMoodle?.replace("_", " ") || (t.habilitada ? "ABIERTA" : "CERRADA")}
                                    </span>
                                  </div>
                                  {t.descripcion && <p className="text-xs text-ink-soft leading-relaxed">{t.descripcion}</p>}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="px-2.5 py-1 bg-paper-sunken border border-line rounded-lg text-xs font-bold text-ink">
                                    {t.puntajeMaximo} pts
                                  </span>

                                  {puedeGestionarTareas && (
                                    <button
                                      onClick={() => handleToggleHabilitar(t.id)}
                                      title={t.habilitada ? "Deshabilitar recepción" : "Habilitar recepción"}
                                      className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                                        t.habilitada
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                          : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                      }`}
                                    >
                                      {t.habilitada ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                      <span className="hidden sm:inline">{t.habilitada ? "Abierta" : "Cerrada"}</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Triple Control de Fechas */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-paper-sunken/60 p-3 rounded-xl border border-line text-xs">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                                  <div>
                                    <span className="text-[10px] uppercase text-ink-faint block font-semibold">1. Habilitación</span>
                                    <span className="font-medium text-ink">
                                      {t.fechaHabilitacion ? new Date(t.fechaHabilitacion).toLocaleString() : "Inmediata"}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <div>
                                    <span className="text-[10px] uppercase text-ink-faint block font-semibold">2. Fecha Entrega (Límite)</span>
                                    <span className="font-medium text-ink">
                                      {t.fechaEntrega
                                        ? new Date(t.fechaEntrega).toLocaleString()
                                        : t.fechaLimite
                                        ? new Date(t.fechaLimite).toLocaleString()
                                        : "Sin límite"}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                                  <div>
                                    <span className="text-[10px] uppercase text-ink-faint block font-semibold">3. Fecha de Corte</span>
                                    <span className="font-medium text-ink">
                                      {t.fechaCorte ? new Date(t.fechaCorte).toLocaleString() : "Sin fecha corte"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Parámetros y Acciones */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-ink-soft">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="font-medium text-ink">Archivos: {t.tiposArchivosPermitidos}</span>
                                  <span>•</span>
                                  <span>Máx: {t.tamanoMaximoMb} MB</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {t.documentoColaborativoHabilitado && (
                                    <button
                                      onClick={() => handleAbrirDocumentoColaborativo(t)}
                                      disabled={abriendoDocumentoColaborativo === t.id}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      {abriendoDocumentoColaborativo === t.id ? "Abriendo..." : "Abrir Documento"}
                                    </button>
                                  )}
                                  {(puedeGestionarTareas || esJuradoEnEstaArea) && (
                                    <button
                                      onClick={() => handleVerEntregas(t)}
                                      className="px-3 py-1.5 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                                    >
                                      <Users className="w-3.5 h-3.5 text-blue-600" />
                                      Gestionar Entregas ({t.totalEntregas})
                                    </button>
                                  )}

                                  {user?.rol === "ESTUDIANTE" && (
                                    <button
                                      onClick={() => handleAbrirEntregaModal(t)}
                                      disabled={!t.habilitada || t.estadoMoodle === "CERRADA_CORTE"}
                                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                        t.miEntrega
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : t.habilitada && t.estadoMoodle !== "CERRADA_CORTE"
                                          ? "bg-accent text-white hover:bg-accent-dark"
                                          : "bg-paper-sunken text-ink-faint cursor-not-allowed"
                                      }`}
                                    >
                                      <Upload className="w-3.5 h-3.5" />
                                      {t.miEntrega ? "Modificar Entrega" : "Subir Trabajo"}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Resumen entrega previa estudiante */}
                              {t.miEntrega && (
                                <div className="mt-2 bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1.5">
                                  <div className="flex items-center justify-between font-semibold text-emerald-800">
                                    <span className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Trabajo Entregado el{" "}
                                      {new Date(t.miEntrega.fechaEntrega).toLocaleString()}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase font-bold text-[10px]">
                                      {t.miEntrega.estado}
                                    </span>
                                  </div>

                                  {t.miEntrega.nombreArchivo && (
                                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-200/60 text-[11px] text-ink">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        {renderArchivoIcon(t.miEntrega.nombreArchivo, "w-4 h-4")}
                                        <span className="truncate font-medium">{t.miEntrega.nombreArchivo}</span>
                                      </div>
                                      {t.miEntrega.archivoUrl && (
                                        <a
                                          href={getMediaUrl(t.miEntrega.archivoUrl)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
                                        >
                                          <Download className="w-3 h-3" /> Ver Archivo
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  {t.miEntrega.calificacion !== undefined && t.miEntrega.calificacion !== null && (
                                    <div className="text-ink pt-1">
                                      <span className="font-bold text-accent text-sm">
                                        Nota: {t.miEntrega.calificacion} / {t.puntajeMaximo}
                                      </span>
                                      {t.miEntrega.retroalimentacion && (
                                        <p className="text-ink-soft mt-0.5 italic">
                                          Retroalimentación: &ldquo;{t.miEntrega.retroalimentacion}&rdquo;
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* PESTAÑA 2: PARTICIPANTES (TABLA COMPLETA MOODLE)     */}
        {/* ==================================================== */}
        {activeTab === "participantes" && (
          <div className="space-y-4">
            {user?.rol === "ESTUDIANTE" && !esEstudianteInscrito && convocatoria.estado !== "FINALIZADA" ? (
              <div className="bg-paper border border-line rounded-2xl p-12 text-center space-y-3 shadow-xs">
                <Lock className="w-10 h-10 text-ink-faint mx-auto" />
                <h3 className="text-base font-serif font-bold text-ink">
                  Directorio de participantes reservado
                </h3>
                <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
                  El directorio de estudiantes, equipos y participantes de esta área solo es visible para estudiantes formalmente admitidos, y se publicará de manera general una vez culminada la actividad.
                </p>
              </div>
            ) : (
              <>
                {/* BANDEJA DE SOLICITUDES DE ADMISIÓN (Solo para Docentes y Admin) */}
                {puedeAdmitirEstudiantes && solicitudesPendientes.length > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <h4 className="text-sm font-semibold text-ink">
                          Bandeja de Solicitudes de Admisión ({solicitudesPendientes.length})
                        </h4>
                      </div>
                      <span className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full font-semibold border border-amber-500/30">
                        Por revisar
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {solicitudesPendientes.map((sol) => (
                        <div key={sol.id} className="bg-paper border border-line rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <b className="text-xs text-ink">{sol.nombre} {sol.apellidos}</b>
                              <span className="text-[10px] text-ink-faint">
                                {sol.fechaSolicitud ? new Date(sol.fechaSolicitud).toLocaleDateString() : ""}
                              </span>
                            </div>
                            <p className="text-[11px] text-ink-soft">{sol.email}</p>
                            <div className="text-[11px] text-ink-faint pt-1">
                              Equipo: <b>{sol.nombreEquipo || "Individual"}</b>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line-soft">
                            <button
                              onClick={() => {
                                setSelectedSolicitudForRechazo(sol);
                                setMotivoRechazoInput("");
                              }}
                              disabled={procesandoAdmision}
                              className="px-2.5 py-1 rounded-lg border border-danger/30 text-danger text-[11px] font-semibold hover:bg-danger-soft/20 transition-all cursor-pointer disabled:opacity-50"
                            >
                              ✕ Rechazar
                            </button>
                            <button
                              onClick={() => handleAdmitir(sol.id, `${sol.nombre} ${sol.apellidos}`)}
                              disabled={procesandoAdmision}
                              className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition-all cursor-pointer shadow-xs flex items-center gap-1 disabled:opacity-50"
                            >
                              ✓ Admitir al Aula
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Barra de Filtros y Búsqueda */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-paper border border-line rounded-2xl p-4">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, correo o equipo..."
                  value={searchParticipante}
                  onChange={(e) => setSearchParticipante(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-paper-sunken border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-ink-faint" />
                <select
                  value={filtroParticipanteRol}
                  onChange={(e) => setFiltroParticipanteRol(e.target.value)}
                  className="bg-paper-sunken border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-accent"
                >
                  <option value="TODOS">Todos los roles ({participantes.length})</option>
                  <option value="DOCENTE">Docentes ({conteoDocentes})</option>
                  <option value="JURADO">Jurados ({conteoJurados})</option>
                  <option value="ESTUDIANTE">Estudiantes ({conteoEstudiantes})</option>
                </select>

                {puedeDesignarJurado && (
                  <button
                    onClick={() => {
                      setRolDesignar(esAdmin ? "DOCENTE" : "JURADO");
                      setShowDesignarModal(true);
                    }}
                    className="ml-auto sm:ml-2 px-3 py-2 bg-accent text-white rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Designar
                  </button>
                )}
              </div>
            </div>

            {/* Tabla de Participantes estilo Moodle */}
            <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-paper-sunken/80 border-b border-line text-ink-faint font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Participante</th>
                      <th className="py-3 px-4">Correo Institucional</th>
                      <th className="py-3 px-4 text-center">Rol en el Área</th>
                      <th className="py-3 px-4">Equipo / Grupo</th>
                      <th className="py-3 px-4">Fecha Asignación</th>
                      {esAdmin && <th className="py-3 px-4 text-right">Acción</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {participantesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-ink-soft">
                          No se encontraron participantes con los criterios de búsqueda.
                        </td>
                      </tr>
                    ) : (
                      participantesFiltrados.map((p) => (
                        <tr key={p.id} className="hover:bg-paper-sunken/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-xs">
                                {p.nombre.charAt(0)}
                                {p.apellidos?.charAt(0)}
                              </div>
                              <div>
                                <span className="font-semibold text-ink block">
                                  {p.nombre} {p.apellidos}
                                </span>
                                {p.asignadoPorNombre && (
                                  <span className="text-[10px] text-ink-faint block">
                                    Por: {p.asignadoPorNombre}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-ink-soft">{p.email}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                                p.rol === "DOCENTE"
                                  ? "bg-blue-500/10 text-blue-700"
                                  : p.rol === "JURADO"
                                  ? "bg-purple-500/10 text-purple-700"
                                  : "bg-emerald-500/10 text-emerald-700"
                              }`}
                            >
                              {p.rol}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {p.nombreEquipo ? (
                              <span className="inline-flex items-center gap-1 text-ink font-medium">
                                <Tag className="w-3 h-3 text-accent" /> {p.nombreEquipo}
                              </span>
                            ) : (
                              <span className="text-ink-faint italic">Individual</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-ink-soft">
                            {p.fechaAsignacion ? new Date(p.fechaAsignacion).toLocaleDateString() : "-"}
                          </td>
                          {esAdmin && (
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleRemoverParticipante(p.id, `${p.nombre} ${p.apellidos}`)}
                                title="Remover de esta área"
                                className="p-1.5 text-ink-faint hover:text-red-600 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    )}

        {/* ==================================================== */}
        {/* PESTAÑA 3: INFORMACIÓN, BASES Y REQUISITOS          */}
        {/* ==================================================== */}
        {activeTab === "info" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-paper border border-line rounded-2xl p-6 space-y-4">
              <h3 className="font-serif text-lg font-bold text-ink">Bases de la Convocatoria</h3>
              <p className="text-xs text-ink-soft leading-relaxed whitespace-pre-line">
                {convocatoria.descripcion}
              </p>

              <div className="pt-4 border-t border-line space-y-2">
                <h4 className="text-xs font-bold uppercase text-ink tracking-wider">
                  Requisitos Obligatorios de Postulación
                </h4>
                {convocatoria.requisitos && convocatoria.requisitos.length > 0 ? (
                  <ul className="space-y-2 text-xs text-ink-soft">
                    {convocatoria.requisitos.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{r.descripcion}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-ink-faint italic">Sin requisitos adicionales configurados.</p>
                )}
              </div>
            </div>

            <div className="bg-paper border border-line rounded-2xl p-6 space-y-4 text-xs">
              <h3 className="font-serif text-base font-bold text-ink">Detalles del Evento</h3>
              <div className="space-y-3 divide-y divide-line">
                <div className="pt-2">
                  <span className="text-ink-faint block uppercase text-[10px] font-semibold">Tipo</span>
                  <span className="font-semibold text-ink">{convocatoria.tipo}</span>
                </div>
                <div className="pt-2">
                  <span className="text-ink-faint block uppercase text-[10px] font-semibold">Tamaño de Equipo</span>
                  <span className="font-semibold text-ink">{convocatoria.tamanoEquipo || "Flexible"}</span>
                </div>
                <div className="pt-2">
                  <span className="text-ink-faint block uppercase text-[10px] font-semibold">Fecha de Cierre</span>
                  <span className="font-semibold text-ink">{convocatoria.fechaCierre || "Abierto"}</span>
                </div>
                <div className="pt-2">
                  <span className="text-ink-faint block uppercase text-[10px] font-semibold">Creado por</span>
                  <span className="font-semibold text-ink">{convocatoria.creadorNombre || "Administración FICCT"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL: CREAR / EDITAR MÓDULO DE APRENDIZAJE         */}
        {/* ==================================================== */}
        {showModuloModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-paper border border-line rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-accent" />
                  {moduloEditing ? "Editar Módulo de Aprendizaje" : "Nuevo Módulo de Aprendizaje"}
                </h3>
                <button
                  onClick={() => setShowModuloModal(false)}
                  className="text-ink-faint hover:text-ink cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Banner de Borrador Restaurado */}
              {restoredDraftModulo && !moduloEditing && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
                  <span className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Se ha recuperado un borrador de módulo no guardado.
                  </span>
                  <button
                    type="button"
                    onClick={handleDescartarBorradorModulo}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Descartar
                  </button>
                </div>
              )}

              <form onSubmit={handleGuardarModulo} className="space-y-4 text-xs">
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

                  {/* Input de archivo oculto */}
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

                  {/* Zona Drag & Drop para la Imagen */}
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

                  {/* Previsualización en recuadro */}
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
                    onClick={() => setShowModuloModal(false)}
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
        )}

        {/* ==================================================== */}
        {/* MODAL: CREAR TAREA MOODLE CON TRIPLE CONTROL DE FECHA */}
        {/* ==================================================== */}
        {showCreateTareaModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-paper border border-line rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" /> Nueva Tarea Académica (Moodle)
                </h3>
                <button onClick={() => setShowCreateTareaModal(false)} className="text-ink-faint hover:text-ink cursor-pointer">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Banner de Borrador Restaurado */}
              {restoredDraftTarea && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
                  <span className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Se ha recuperado un borrador de tarea no publicada.
                  </span>
                  <button
                    type="button"
                    onClick={handleDescartarBorradorTarea}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Descartar
                  </button>
                </div>
              )}

              <form onSubmit={handleCrearTarea} className="space-y-4 text-xs">
                {/* Asignar a Módulo opcional */}
                <div>
                  <label className="font-semibold text-ink block mb-1">Módulo de Aprendizaje (Opcional)</label>
                  <select
                    value={tareaModuloId}
                    onChange={(e) => setTareaModuloId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                  >
                    <option value="">-- Tarea General (Sin Módulo) --</option>
                    {modulos.map((m) => (
                      <option key={m.id} value={m.id}>
                        Módulo #{m.orden}: {m.titulo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1">Título de la Tarea *</label>
                  <input
                    type="text"
                    required
                    value={tituloTarea}
                    onChange={(e) => setTituloTarea(e.target.value)}
                    placeholder="Ej. Entrega 1: Perfil de Proyecto y Objetivos"
                    className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1">Instrucciones y Rúbrica</label>
                  <textarea
                    rows={3}
                    value={descTarea}
                    onChange={(e) => setDescTarea(e.target.value)}
                    placeholder="Detalla qué deben entregar los estudiantes, formato esperado y criterios de evaluación..."
                    className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent resize-none"
                  />
                </div>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={documentoColaborativoHabilitado}
                    onChange={(e) => setDocumentoColaborativoHabilitado(e.target.checked)}
                    className="mt-1 accent-blue-600"
                  />
                  <span>
                    <span className="block font-bold text-ink">Activar documento colaborativo tipo Word</span>
                    <span className="block text-[11px] text-ink-soft leading-relaxed">
                      Crea un unico documento editable para esta actividad. Los participantes aceptados podran abrirlo desde la tarea,
                      editarlo con formato rico y exportarlo como .docx.
                    </span>
                  </span>
                </label>

                {/* TRIPLE CONTROL DE FECHAS */}
                <div className="p-3 bg-paper-sunken/60 rounded-xl border border-line space-y-3">
                  <span className="font-bold text-ink block text-[11px] uppercase tracking-wider text-accent">
                    Control de Disponibilidad y Fechas (Moodle)
                  </span>

                  <div>
                    <label className="font-semibold text-ink block mb-1">1. Permitir entregas desde (Habilitación)</label>
                    <input
                      type="datetime-local"
                      value={fechaHabilitacion}
                      onChange={(e) => setFechaHabilitacion(e.target.value)}
                      className="w-full px-3 py-2 bg-paper border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-ink block mb-1">2. Fecha de Entrega (Límite regular)</label>
                    <input
                      type="datetime-local"
                      value={fechaEntrega}
                      onChange={(e) => setFechaEntrega(e.target.value)}
                      className="w-full px-3 py-2 bg-paper border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-ink block mb-1">3. Fecha de Corte (Cierre definitivo)</label>
                    <input
                      type="datetime-local"
                      value={fechaCorte}
                      onChange={(e) => setFechaCorte(e.target.value)}
                      className="w-full px-3 py-2 bg-paper border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                    />
                    <span className="text-[10px] text-ink-faint mt-1 block">
                      Tras la fecha de corte, no se permitirán más entregas ni reenvíos bajo ninguna circunstancia.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-ink block mb-1">Puntaje Máximo</label>
                    <input
                      type="number"
                      value={puntajeMax}
                      onChange={(e) => setPuntajeMax(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-ink block mb-1">Tamaño Máx (MB)</label>
                    <input
                      type="number"
                      value={tamanoMb}
                      onChange={(e) => setTamanoMb(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-ink block mb-1">Formatos Permitidos</label>
                    <input
                      type="text"
                      value={archivosPermitidos}
                      onChange={(e) => setArchivosPermitidos(e.target.value)}
                      placeholder=".pdf, .docx, .zip"
                      className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowCreateTareaModal(false)}
                    className="px-4 py-2 border border-line rounded-xl text-ink hover:bg-paper-sunken"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creandoTarea}
                    className="px-4 py-2 bg-accent text-white rounded-xl font-semibold hover:bg-accent-dark disabled:opacity-50"
                  >
                    {creandoTarea ? "Guardando..." : "Publicar Tarea"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL: DESIGNAR DOCENTE O JURADO                    */}
        {/* ==================================================== */}
        {showDesignarModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-paper border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-accent" /> Designar Responsable / Evaluador
                </h3>
                <button onClick={() => setShowDesignarModal(false)} className="text-ink-faint hover:text-ink">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleDesignarParticipante} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-ink block mb-1">Rol a Asignar en esta Área *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() => setRolDesignar("DOCENTE")}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
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
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
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
                    onClick={() => setShowDesignarModal(false)}
                    className="px-4 py-2 border border-line rounded-xl text-ink hover:bg-paper-sunken"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={designando}
                    className="px-4 py-2 bg-accent text-white rounded-xl font-semibold hover:bg-accent-dark disabled:opacity-50"
                  >
                    {designando ? "Asignando..." : "Confirmar Designación"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL: INSCRIBIRSE A ÁREA (ESTUDIANTE)               */}
        {/* ==================================================== */}
        {showInscripcionModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-paper border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-600" /> Inscripción al Área / Convocatoria
                </h3>
                <button onClick={() => setShowInscripcionModal(false)} className="text-ink-faint hover:text-ink">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleInscripcionEstudiante} className="space-y-4 text-xs">
                <p className="text-ink-soft">
                  Estás a punto de inscribirte formalmente a <strong>{convocatoria.titulo}</strong>. Podrás ver y entregar todas las tareas publicadas por los docentes.
                </p>

                <div>
                  <label className="font-semibold text-ink block mb-1">Nombre de Equipo o Grupo (Opcional)</label>
                  <input
                    type="text"
                    value={nombreEquipo}
                    onChange={(e) => setNombreEquipo(e.target.value)}
                    placeholder="Ej. ByteWarriors, InnovaTeam (dejar vacío si es individual)"
                    className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowInscripcionModal(false)}
                    className="px-4 py-2 border border-line rounded-xl text-ink hover:bg-paper-sunken"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={inscribiendo}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {inscribiendo ? "Inscribiendo..." : "Confirmar Inscripción"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL: SUBIR ENTREGA (ESTUDIANTE - MOODLE LMS UX)   */}
        {/* ==================================================== */}
        {selectedTareaForEntrega && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-paper border border-line rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-accent" /> Envío de Tarea Académica (Moodle)
                </h3>
                <button
                  onClick={() => setSelectedTareaForEntrega(null)}
                  className="text-ink-faint hover:text-ink cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Banner de Borrador Restaurado */}
              {restoredDraftEntrega && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
                  <span className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Se ha recuperado un borrador de entrega no enviado {lastDraftSavedEntrega ? `(${lastDraftSavedEntrega})` : ""}.
                  </span>
                  <button
                    type="button"
                    onClick={handleDescartarBorradorEntrega}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Descartar
                  </button>
                </div>
              )}

              {/* Tarjeta de Requisitos de la Tarea */}
              <div className="text-xs space-y-2 bg-paper-sunken/70 p-3.5 rounded-xl border border-line">
                <span className="font-bold text-ink text-sm block">{selectedTareaForEntrega.titulo}</span>
                {selectedTareaForEntrega.descripcion && (
                  <p className="text-ink-soft text-[11px] leading-relaxed line-clamp-2">
                    {selectedTareaForEntrega.descripcion}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-[11px] pt-1">
                  <span className="px-2 py-0.5 rounded-md bg-paper border border-line text-ink font-semibold">
                    Puntaje: {selectedTareaForEntrega.puntajeMaximo} pts
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-paper border border-line text-ink font-semibold">
                    Formatos: {selectedTareaForEntrega.tiposArchivosPermitidos}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-paper border border-line text-ink font-semibold">
                    Máx: {selectedTareaForEntrega.tamanoMaximoMb} MB
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-paper border border-line text-ink font-semibold">
                    Corte: {selectedTareaForEntrega.fechaCorte ? new Date(selectedTareaForEntrega.fechaCorte).toLocaleString() : "Abierto"}
                  </span>
                </div>
              </div>

              {/* Entrega Previa Registrada si existe */}
              {selectedTareaForEntrega.miEntrega && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between font-semibold text-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Tienes una entrega registrada el {new Date(selectedTareaForEntrega.miEntrega.fechaEntrega).toLocaleString()}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold uppercase text-[10px]">
                      {selectedTareaForEntrega.miEntrega.estado}
                    </span>
                  </div>

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
                    Puedes adjuntar un nuevo archivo a continuación para reemplazar tu entrega o actualizar comentarios.
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
                {/* Input de archivo físico oculto */}
                <input
                  ref={fileInputEntregaRef}
                  type="file"
                  onChange={handleSelectFileInputEntrega}
                  className="hidden"
                />

                {/* ZONA DRAG & DROP / TARJETA DE ARCHIVO CARGADO */}
                <div>
                  <label className="font-semibold text-ink block mb-1.5 flex items-center justify-between">
                    <span>Archivos de Entrega (Arrastra o Selecciona) *</span>
                    {lastDraftSavedEntrega && (
                      <span className="text-[10px] text-accent font-normal flex items-center gap-1">
                        <Save className="w-3 h-3" /> Borrador guardado ({lastDraftSavedEntrega})
                      </span>
                    )}
                  </label>

                  {!archivoEntregaFile && !archivoEntregaPrevioUrl ? (
                    /* Dropzone interactivo cuando no hay archivo seleccionado */
                    <div
                      onDragOver={handleDragOverEntrega}
                      onDragLeave={handleDragLeaveEntrega}
                      onDrop={handleDropEntrega}
                      onClick={() => fileInputEntregaRef.current?.click()}
                      className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                        isDraggingEntrega
                          ? "border-accent bg-accent/10 ring-2 ring-accent/30 scale-[1.01]"
                          : "border-line hover:border-accent/60 bg-paper-sunken/40 hover:bg-paper-sunken/70"
                      }`}
                    >
                      <UploadCloud className="w-10 h-10 text-accent mx-auto mb-2 animate-pulse" />
                      <p className="text-xs font-bold text-ink">
                        Arrastra y suelta tu archivo aquí para subirlo
                      </p>
                      <p className="text-[11px] text-ink-soft mt-0.5">
                        o haz clic en esta área para examinar tus documentos
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-[10px] text-ink-faint">
                        <span className="px-2 py-0.5 rounded-full bg-paper border border-line">
                          Formatos: {selectedTareaForEntrega.tiposArchivosPermitidos}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-paper border border-line">
                          Límite: {selectedTareaForEntrega.tamanoMaximoMb} MB
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Tarjeta de Archivo Adjunto Estilo Moodle */
                    <div className="p-4 bg-paper rounded-2xl border border-line shadow-xs space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                            {renderArchivoIcon(
                              archivoEntregaFile ? archivoEntregaFile.name : archivoEntregaOriginalName || "documento.pdf",
                              "w-5 h-5"
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-ink text-xs block truncate">
                              {archivoEntregaFile ? archivoEntregaFile.name : archivoEntregaOriginalName}
                            </span>
                            <span className="text-[10px] text-ink-faint">
                              {archivoEntregaTamano > 0
                                ? formatBytes(archivoEntregaTamano)
                                : archivoEntregaPrevioUrl
                                ? "Archivo de entrega registrado previamente"
                                : ""}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputEntregaRef.current?.click()}
                            className="px-2.5 py-1.5 rounded-lg border border-line bg-paper-sunken hover:bg-paper text-ink text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <RefreshCw className="w-3 h-3 text-accent" /> Cambiar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setArchivoEntregaFile(null);
                              setArchivoEntregaOriginalName("");
                              setArchivoEntregaTamano(0);
                              setErrorValidacionArchivo(null);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-line bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" /> Quitar
                          </button>
                        </div>
                      </div>

                      {/* EDITAR NOMBRE DEL ARCHIVO TAL COMO MOODLE ("Guardar como") */}
                      <div className="pt-2 border-t border-line-soft space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-ink flex items-center gap-1.5">
                            <Edit2 className="w-3.5 h-3.5 text-accent" /> Guardar como (Nombre del archivo en plataforma):
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
                        <span className="text-[10px] text-ink-faint block">
                          Puedes personalizar el nombre formal con el que el docente verá tu entrega (Moodle conservará la extensión correcta).
                        </span>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-line">
                  <span className="text-[11px] text-ink-faint">
                    {lastDraftSavedEntrega
                      ? `💾 Borrador guardado localmente (${lastDraftSavedEntrega})`
                      : "💾 Los cambios se respaldan en tu navegador"}
                  </span>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTareaForEntrega(null)}
                      className="px-4 py-2 border border-line rounded-xl text-ink hover:bg-paper-sunken cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={enviandoEntrega}
                      className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                    >
                      {enviandoEntrega ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Subiendo archivo...
                        </>
                      ) : selectedTareaForEntrega.miEntrega ? (
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
        )}


        {/* ==================================================== */}
        {/* MODAL: RECHAZAR SOLICITUD DE ADMISIÓN (DOCENTE/ADMIN) */}
        {/* ==================================================== */}
        {selectedSolicitudForRechazo && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-paper border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-danger" /> Rechazar Solicitud de Admisión
                </h3>
                <button
                  onClick={() => setSelectedSolicitudForRechazo(null)}
                  className="text-ink-faint hover:text-ink text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConfirmarRechazo} className="space-y-3 text-xs">
                <p className="text-ink-soft leading-relaxed">
                  Estás por denegar la solicitud de postulación de{" "}
                  <b className="text-ink">
                    {selectedSolicitudForRechazo.nombre} {selectedSolicitudForRechazo.apellidos}
                  </b>{" "}
                  ({selectedSolicitudForRechazo.email}).
                </p>

                <div>
                  <label className="font-semibold text-ink block mb-1">Motivo del rechazo (Opcional):</label>
                  <textarea
                    rows={3}
                    value={motivoRechazoInput}
                    onChange={(e) => setMotivoRechazoInput(e.target.value)}
                    placeholder="Ej. No cumple con los requisitos del reglamento, equipo incompleto..."
                    className="w-full p-2.5 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setSelectedSolicitudForRechazo(null)}
                    className="px-3.5 py-1.5 rounded-xl border border-line text-ink-soft hover:bg-paper"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={procesandoAdmision}
                    className="px-4 py-1.5 rounded-xl bg-danger text-white font-semibold hover:bg-opacity-95 shadow-sm disabled:opacity-50"
                  >
                    {procesandoAdmision ? "Procesando..." : "Confirmar Rechazo"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
