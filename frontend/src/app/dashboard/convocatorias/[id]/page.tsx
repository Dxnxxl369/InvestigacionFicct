"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
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
  GrupoDTO,
  MiembroGrupoDTO,
  GruposAreaResponse,
  CrearGrupoRequest,
  GenerarLoteGruposRequest,
  ActividadGrupoDTO,
  CrearActividadGrupoRequest,
  ElegirGrupoRequest,
  SeguimientoTareaDTO,
  ItemSeguimientoDTO,
  ResumenSeguimientoDTO,
  VersionDTO,
  CriterioDTO,
  CriterioRequest,
  PuntajeCriterioDTO,
  PuntajeCriterioRequest,
  ResponderLoteRequest,
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
  Eye,
  EyeOff,
  UserCheck,
  UserMinus,
  Sparkles,
  ListPlus,
  HelpCircle,
  Info,
  CheckCircle,
  History,
  CheckSquare,
  Square,
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

// Función infalible para parsear fechas ISO (con o sin Z / offset) respetando el reloj de pared sin desfase horario
function parseIsoDateWithoutShift(dateStr: string): Date {
  if (!dateStr) return new Date();
  const m = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const [_, year, month, day, hours, minutes, seconds] = m;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      seconds ? Number(seconds) : 0
    );
  }
  return new Date(dateStr);
}

// Formatear fechas con estilo natural y completo Moodle (e.g. "lunes, 29 de septiembre de 2026, 00:00")
function formatMoodleDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = parseIsoDateWithoutShift(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return d.toLocaleDateString("es-ES", opciones);
  } catch {
    return dateStr;
  }
}

function formatMoodleDateShort(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = parseIsoDateWithoutShift(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// Formateo de fecha ISO a YYYY-MM-DDTHH:mm para inputs datetime-local sin alterar zona horaria
function formatForDateTimeLocal(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const str = dateStr.trim();
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (m) {
      return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

// Envío de fecha local a backend sin conversión UTC para evitar desfase de 4 horas
function formatDateTimeForBackend(dateTimeLocalStr?: string | null): string | undefined {
  if (!dateTimeLocalStr || !dateTimeLocalStr.trim()) return undefined;
  const str = dateTimeLocalStr.trim();
  if (str.length === 16) {
    return `${str}:00`;
  }
  return str;
}

// Cálculo de tiempo restante / entrega previa estilo Moodle (image.png)
function calcularTiempoRestanteMoodle(
  fechaLimiteStr?: string | null,
  fechaEntregaStr?: string | null
): { texto: string; temprano: boolean; retraso: boolean } {
  if (!fechaLimiteStr) {
    return { texto: "Sin fecha límite asignada", temprano: false, retraso: false };
  }
  const fechaLimite = parseIsoDateWithoutShift(fechaLimiteStr).getTime();

  if (fechaEntregaStr) {
    const fechaEntrega = parseIsoDateWithoutShift(fechaEntregaStr).getTime();
    const diffMs = fechaLimite - fechaEntrega;
    const diffMin = Math.round(Math.abs(diffMs) / (1000 * 60));
    const dias = Math.floor(diffMin / (60 * 24));
    const horas = Math.floor((diffMin % (60 * 24)) / 60);
    const minutos = diffMin % 60;

    let duracion = "";
    if (dias > 0) duracion += `${dias} ${dias === 1 ? "día" : "días"} `;
    if (horas > 0 || dias > 0) duracion += `${horas} ${horas === 1 ? "hora" : "horas"} `;
    duracion += `${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;

    if (diffMs >= 0) {
      return {
        texto: `La tarea fue enviada ${duracion.trim()} antes de la fecha límite`,
        temprano: true,
        retraso: false,
      };
    } else {
      return {
        texto: `La tarea fue enviada ${duracion.trim()} después de la fecha límite (con retraso)`,
        temprano: false,
        retraso: true,
      };
    }
  }

  // Tarea no enviada aún
  const ahora = Date.now();
  const diffMs = fechaLimite - ahora;
  if (diffMs <= 0) {
    return { texto: "La tarea está cerrada y ha pasado la fecha límite", temprano: false, retraso: true };
  }
  const diffMin = Math.round(diffMs / (1000 * 60));
  const dias = Math.floor(diffMin / (60 * 24));
  const horas = Math.floor((diffMin % (60 * 24)) / 60);
  const minutos = diffMin % 60;

  let restante = "";
  if (dias > 0) restante += `${dias} ${dias === 1 ? "día" : "días"}, `;
  if (horas > 0 || dias > 0) restante += `${horas} ${horas === 1 ? "hora" : "horas"} `;
  restante += `y ${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;
  return { texto: `Quedan ${restante}`, temprano: false, retraso: false };
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
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const convocatoriaId = Number(params?.id);

  // Sincronización fluida de parámetros de URL para persistir la vista ante recargas (F5)
  const updateUrlParams = useCallback(
    (newParams: {
      tab?: string | null;
      modulo?: number | null;
      tarea?: number | null;
      entregas?: number | null;
    }) => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);

      if ("tab" in newParams) {
        if (newParams.tab && newParams.tab !== "tareas") {
          url.searchParams.set("tab", newParams.tab);
        } else {
          url.searchParams.delete("tab");
        }
      }

      if ("modulo" in newParams) {
        if (newParams.modulo) {
          url.searchParams.set("modulo", String(newParams.modulo));
        } else {
          url.searchParams.delete("modulo");
        }
      }

      if ("tarea" in newParams) {
        if (newParams.tarea) {
          url.searchParams.set("tarea", String(newParams.tarea));
        } else {
          url.searchParams.delete("tarea");
        }
      }

      if ("entregas" in newParams) {
        if (newParams.entregas) {
          url.searchParams.set("entregas", String(newParams.entregas));
        } else {
          url.searchParams.delete("entregas");
        }
      }

      window.history.replaceState(null, "", url.toString());
    },
    []
  );

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
  const fileInputModuloImgRef = useRef<HTMLInputElement>(null);

  // Módulo seleccionado al crear tarea
  const [tareaModuloId, setTareaModuloId] = useState<number | "">("");
  // Actividad de grupo / Agrupamiento al crear o editar tarea (Moodle Grouping)
  const [tareaActividadGrupoId, setTareaActividadGrupoId] = useState<number | "">("");

  // Vista Dedicada / Pantalla Completa de Gestión de Entregas (SpeedGrader)
  const [activeTareaParaEntregas, setActiveTareaParaEntregas] = useState<TareaDTO | null>(null);
  // Vista Detallada de Tarea Académica estilo Moodle (image.png)
  const [activeTareaDetalle, setActiveTareaDetalle] = useState<TareaDTO | null>(null);
  const [entregasTareaActual, setEntregasTareaActual] = useState<EntregaTareaDTO[]>([]);
  const [selectedEstudianteId, setSelectedEstudianteId] = useState<number | null>(null);
  const [searchEstudianteEntrega, setSearchEstudianteEntrega] = useState("");
  const [filtroEntregasEstado, setFiltroEntregasEstado] = useState<"TODOS" | "PENDIENTES" | "CALIFICADOS" | "SIN_ENTREGA">("TODOS");
  const [cargandoEntregasTarea, setCargandoEntregasTarea] = useState(false);
  const [seguimientoTareaActual, setSeguimientoTareaActual] = useState<SeguimientoTareaDTO | null>(null);
  const [historialVersionesModal, setHistorialVersionesModal] = useState<VersionDTO[] | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [puntajesCriteriosInput, setPuntajesCriteriosInput] = useState<Record<number, number>>({});

  // Estados para Libro Central de Calificaciones (Gradebook)
  const [todasLasEntregas, setTodasLasEntregas] = useState<Record<number, EntregaTareaDTO[]>>({});
  const [cargandoGradebook, setCargandoGradebook] = useState(false);
  const [searchGradebookEstudiante, setSearchGradebookEstudiante] = useState("");

  // Tabs
  const [activeTab, setActiveTab] = useState<"tareas" | "grupos" | "participantes" | "calificaciones" | "info">("tareas");

  const handleCambiarTab = useCallback(
    (tab: "tareas" | "grupos" | "participantes" | "calificaciones" | "info") => {
      setActiveTab(tab);
      updateUrlParams({ tab });
    },
    [updateUrlParams]
  );

  // Grupos y Actividades de Selección Moodle
  const [gruposArea, setGruposArea] = useState<GrupoDTO[]>([]);
  const [estudiantesSinEquipo, setEstudiantesSinEquipo] = useState<ConvocatoriaParticipanteDTO[]>([]);
  const [totalEstudiantesArea, setTotalEstudiantesArea] = useState<number>(0);
  const [totalConEquipoArea, setTotalConEquipoArea] = useState<number>(0);
  const [totalSinEquipoArea, setTotalSinEquipoArea] = useState<number>(0);
  const [actividadesGrupo, setActividadesGrupo] = useState<ActividadGrupoDTO[]>([]);
  const [actividadActiva, setActividadActiva] = useState<ActividadGrupoDTO | null>(null);
  const [cargandoGrupos, setCargandoGrupos] = useState<boolean>(false);

  // Selección de Grupo estilo Moodle (image.png)
  const [selectedGrupoRadioId, setSelectedGrupoRadioId] = useState<number | null>(null);
  const [ocultarMiembros, setOcultarMiembros] = useState<boolean>(false);
  const [procesandoEleccion, setProcesandoEleccion] = useState<boolean>(false);

  // Modales y formularios de grupos para Admin / Docente
  const [showCrearGrupoModal, setShowCrearGrupoModal] = useState<boolean>(false);
  const [nuevoGrupoNombre, setNuevoGrupoNombre] = useState<string>("");
  const [nuevoGrupoDesc, setNuevoGrupoDesc] = useState<string>("");
  const [nuevoGrupoCapacidad, setNuevoGrupoCapacidad] = useState<number>(5);
  const [creandoGrupo, setCreandoGrupo] = useState<boolean>(false);

  const [showGenerarLoteModal, setShowGenerarLoteModal] = useState<boolean>(false);
  const [lotePrefijo, setLotePrefijo] = useState<string>("Gr1erPar ");
  const [loteCantidad, setLoteCantidad] = useState<number>(10);
  const [loteCapacidad, setLoteCapacidad] = useState<number>(5);
  const [generandoLote, setGenerandoLote] = useState<boolean>(false);

  const [showCrearActividadModal, setShowCrearActividadModal] = useState<boolean>(false);
  const [editingActividadId, setEditingActividadId] = useState<number | null>(null);
  const [nuevaActTitulo, setNuevaActTitulo] = useState<string>("Seleccionar grupo para 1er examen parcial");
  const [nuevaActDesc, setNuevaActDesc] = useState<string>("Seleccionar número de grupo según se les asignó en la hoja que presentaron en clases.");
  const [nuevaActApertura, setNuevaActApertura] = useState<string>("");
  const [nuevaActCierre, setNuevaActCierre] = useState<string>("");
  const [nuevaActCapacidad, setNuevaActCapacidad] = useState<number>(5);
  const [nuevaActPermitirCambio, setNuevaActPermitirCambio] = useState<boolean>(true);
  const [nuevaActMostrarMiembros, setNuevaActMostrarMiembros] = useState<boolean>(true);
  const [nuevaActGenerarGrupos, setNuevaActGenerarGrupos] = useState<boolean>(true);
  const [nuevaActCantidadGrupos, setNuevaActCantidadGrupos] = useState<number>(10);
  const [nuevaActPrefijo, setNuevaActPrefijo] = useState<string>("Gr1erPar ");
  const [creandoActividad, setCreandoActividad] = useState<boolean>(false);

  // Estados de Ficha y Perfil Académico de Participante (Moodle)
  const [selectedPerfilUsuarioId, setSelectedPerfilUsuarioId] = useState<number | null>(null);
  const [perfilUsuarioModalData, setPerfilUsuarioModalData] = useState<any | null>(null);
  const [cargandoPerfilUsuario, setCargandoPerfilUsuario] = useState<boolean>(false);

  const [asignandoParticipanteId, setAsignandoParticipanteId] = useState<number | null>(null);

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

  // Formulario de Nueva Tarea (con triple fecha)
  const [tituloTarea, setTituloTarea] = useState("");
  const [descTarea, setDescTarea] = useState("");
  const [fechaHabilitacion, setFechaHabilitacion] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [fechaCorte, setFechaCorte] = useState("");
  const [archivosPermitidos, setArchivosPermitidos] = useState(".pdf, .docx, .zip");
  const [tamanoMb, setTamanoMb] = useState(15);
  const [puntajeMax, setPuntajeMax] = useState(100);
  const [esGrupalTarea, setEsGrupalTarea] = useState(false);
  const [tieneRubricaTarea, setTieneRubricaTarea] = useState(false);
  const [criteriosRubricaTarea, setCriteriosRubricaTarea] = useState<CriterioRequest[]>([]);
  const [creandoTarea, setCreandoTarea] = useState(false);

  // Estados para Edición de Tarea y Preservación de Entregas
  const [tareaEditing, setTareaEditing] = useState<TareaDTO | null>(null);
  const [entregasTareaEditing, setEntregasTareaEditing] = useState<EntregaTareaDTO[]>([]);
  const [loadingEntregasEditing, setLoadingEntregasEditing] = useState(false);

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
      (p) => (p.usuarioId === user?.id || (user?.email && p.email?.toLowerCase() === user.email.toLowerCase())) && p.rol === "DOCENTE" && p.estadoInscripcion === "ACEPTADO"
    ) ||
    (user?.rol === "DOCENTE" && convocatoria?.docenteIds?.includes(user?.id || 0))
  );
  const esJuradoEnEstaArea = Boolean(
    participantes.some(
      (p) => (p.usuarioId === user?.id || (user?.email && p.email?.toLowerCase() === user.email.toLowerCase())) && p.rol === "JURADO" && p.estadoInscripcion === "ACEPTADO"
    ) ||
    (user?.rol === "JURADO" && convocatoria?.juradoIds?.includes(user?.id || 0))
  );
  const miParticipacion = participantes.find(
    (p) => p.usuarioId === user?.id || (user?.email && p.email?.toLowerCase() === user.email.toLowerCase())
  );
  const miEstadoInscripcion = miParticipacion?.estadoInscripcion || convocatoria?.miEstadoInscripcion;
  const esEstudianteInscrito = (miParticipacion?.rol === "ESTUDIANTE" || user?.rol === "ESTUDIANTE") && miEstadoInscripcion === "ACEPTADO";
  const esEstudiantePendiente = (miParticipacion?.rol === "ESTUDIANTE" || user?.rol === "ESTUDIANTE") && miEstadoInscripcion === "PENDIENTE";
  const esEstudianteRechazado = (miParticipacion?.rol === "ESTUDIANTE" || user?.rol === "ESTUDIANTE") && miEstadoInscripcion === "RECHAZADO";
  const puedeGestionarTareas = esAdmin || esDocenteEnEstaArea;
  const puedeDesignarJurado = esAdmin || esDocenteEnEstaArea;
  const puedeAdmitirEstudiantes = esAdmin || esDocenteEnEstaArea;

  const [selectedSolicitudForRechazo, setSelectedSolicitudForRechazo] = useState<ConvocatoriaParticipanteDTO | null>(null);
  const [motivoRechazoInput, setMotivoRechazoInput] = useState("");
  const [procesandoAdmision, setProcesandoAdmision] = useState(false);
  const [selectedSolicitudesLote, setSelectedSolicitudesLote] = useState<number[]>([]);
  const [showRechazoLoteModal, setShowRechazoLoteModal] = useState(false);
  const [motivoRechazoLoteInput, setMotivoRechazoLoteInput] = useState("");

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

      // 2. Cargar participantes, tareas, módulos, grupos y actividades de grupo en paralelo
      const [partsData, tareasData, modulosData, gruposData, actsGrupoData] = await Promise.all([
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
        api.getGruposArea(convocatoriaId).catch((err) => {
          console.warn("Aviso al cargar grupos:", err?.message || err);
          return null as GruposAreaResponse | null;
        }),
        api.getActividadesGrupo(convocatoriaId).catch((err) => {
          console.warn("Aviso al cargar actividades de grupo:", err?.message || err);
          return [] as ActividadGrupoDTO[];
        }),
      ]);

      setParticipantes(partsData || []);
      setTareas(tareasData || []);
      setModulos(modulosData || []);

      // Restauración de pantalla según parámetros de URL al recargar (F5)
      const urlTab = searchParams.get("tab");
      const urlModulo = searchParams.get("modulo");
      const urlTarea = searchParams.get("tarea");
      const urlEntregas = searchParams.get("entregas");

      if (urlTab && ["tareas", "grupos", "participantes", "calificaciones", "info"].includes(urlTab)) {
        setActiveTab(urlTab as any);
      }

      if (modulosData && urlModulo) {
        const modIdNum = Number(urlModulo);
        if (!isNaN(modIdNum) && modulosData.some((m) => m.id === modIdNum)) {
          setSelectedModuloId(modIdNum);
        }
      }

      if (tareasData) {
        if (urlTarea) {
          const tIdNum = Number(urlTarea);
          const tEncontrada = tareasData.find((t) => t.id === tIdNum);
          if (tEncontrada) {
            setActiveTareaDetalle(tEncontrada);
            if (tEncontrada.moduloId) {
              setSelectedModuloId(tEncontrada.moduloId);
            }
          } else {
            setActiveTareaDetalle((prev) => (prev ? tareasData.find((t) => t.id === prev.id) || null : null));
          }
        } else {
          setActiveTareaDetalle((prev) => (prev ? tareasData.find((t) => t.id === prev.id) || null : null));
        }

        if (urlEntregas) {
          const entIdNum = Number(urlEntregas);
          const tEncontrada = tareasData.find((t) => t.id === entIdNum);
          if (tEncontrada) {
            setActiveTareaParaEntregas(tEncontrada);
          } else {
            setActiveTareaParaEntregas((prev) => (prev ? tareasData.find((t) => t.id === prev.id) || null : null));
          }
        } else {
          setActiveTareaParaEntregas((prev) => (prev ? tareasData.find((t) => t.id === prev.id) || null : null));
        }
      }

      if (gruposData) {
        setGruposArea(gruposData.grupos || []);
        setEstudiantesSinEquipo(gruposData.estudiantesSinEquipo || []);
        setTotalEstudiantesArea(gruposData.totalEstudiantes || 0);
        setTotalConEquipoArea(gruposData.totalConEquipo || 0);
        setTotalSinEquipoArea(gruposData.totalSinEquipo || 0);
      }

      if (actsGrupoData) {
        setActividadesGrupo(actsGrupoData || []);
        if (actsGrupoData.length > 0) {
          setActividadActiva((prev) => {
            if (prev) {
              const updated = actsGrupoData.find((a) => a.id === prev.id);
              if (updated) {
                if (updated.grupoSeleccionadoId) {
                  setSelectedGrupoRadioId(updated.grupoSeleccionadoId);
                }
                return updated;
              }
            }
            const act = actsGrupoData[0];
            if (act.grupoSeleccionadoId) {
              setSelectedGrupoRadioId(act.grupoSeleccionadoId);
            }
            return act;
          });
        }
      }

      // Si es estudiante, cargar sus documentos de investigación
      if (user?.rol === "ESTUDIANTE") {
        try {
          const docs = await api.getDocumentos();
          setDocumentosUsuario(docs);
        } catch {
          // opcional
        }
      }

      // Si puede designar, cargar catálogo de usuarios según sus permisos
      if (esAdmin) {
        try {
          const usersList = await api.getUsers();
          setAllUsers(usersList);
        } catch {
          // opcional
        }
      } else if (user?.rol === "DOCENTE") {
        try {
          const enc = await api.getEncargadosDisponibles();
          const list: User[] = [
            ...(enc.jurados || []).map((j: any) => ({
              id: j.id,
              nombre: j.nombre,
              apellido: j.apellidos || j.apellido || "",
              email: j.email,
              rol: "JURADO" as const,
              estado: "ACTIVO" as const,
            })),
            ...(enc.docentes || []).map((d: any) => ({
              id: d.id,
              nombre: d.nombre,
              apellido: d.apellidos || d.apellido || "",
              email: d.email,
              rol: "DOCENTE" as const,
              estado: "ACTIVO" as const,
            })),
          ];
          setAllUsers(list);
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

  // Limpieza inicial de borradores residuales para eliminar ruido visual
  useEffect(() => {
    try {
      Object.keys(localStorage).forEach((k) => {
        if (
          k.startsWith("moodle_entrega_draft_") ||
          k.startsWith("ficct_create_tarea_draft_") ||
          k.startsWith("ficct_modulo_draft_")
        ) {
          localStorage.removeItem(k);
        }
      });
    } catch {}
  }, []);

  // Abrir Modal Crear Tarea (limpio, sin borradores)
  const handleAbrirCrearTarea = (moduloIdDefault?: number) => {
    setTareaEditing(null);
    setEntregasTareaEditing([]);
    setTareaModuloId(moduloIdDefault !== undefined ? moduloIdDefault : "");
    setTareaActividadGrupoId("");
    setTituloTarea("");
    setDescTarea("");
    setFechaHabilitacion("");
    setFechaEntrega("");
    setFechaCorte("");
    setArchivosPermitidos(".pdf, .docx, .zip");
    setTamanoMb(15);
    setPuntajeMax(100);
    setEsGrupalTarea(false);
    setTieneRubricaTarea(false);
    setCriteriosRubricaTarea([]);
    setShowCreateTareaModal(true);
  };

  // Abrir Modal Editar Tarea existente
  const handleAbrirEditarTarea = async (tarea: TareaDTO) => {
    setTareaEditing(tarea);
    setTareaModuloId(tarea.moduloId !== undefined && tarea.moduloId !== null ? tarea.moduloId : "");
    setTareaActividadGrupoId(tarea.actividadGrupoId !== undefined && tarea.actividadGrupoId !== null ? tarea.actividadGrupoId : "");
    setTituloTarea(tarea.titulo || "");
    setDescTarea(tarea.descripcion || "");
    setFechaHabilitacion(formatForDateTimeLocal(tarea.fechaHabilitacion));
    setFechaEntrega(formatForDateTimeLocal(tarea.fechaEntrega || tarea.fechaLimite));
    setFechaCorte(formatForDateTimeLocal(tarea.fechaCorte));
    setArchivosPermitidos(tarea.tiposArchivosPermitidos || ".pdf, .docx, .zip");
    setTamanoMb(tarea.tamanoMaximoMb || 15);
    setPuntajeMax(tarea.puntajeMaximo || 100);
    setEsGrupalTarea(!!tarea.esGrupal);
    if (tarea.rubrica && tarea.rubrica.length > 0) {
      setTieneRubricaTarea(true);
      setCriteriosRubricaTarea(
        tarea.rubrica.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          descripcion: c.descripcion || "",
          puntajeMaximo: c.puntajeMaximo,
        }))
      );
    } else {
      setTieneRubricaTarea(false);
      setCriteriosRubricaTarea([]);
    }
    setShowCreateTareaModal(true);

    try {
      setLoadingEntregasEditing(true);
      const entregas = await api.getEntregasTarea(tarea.id);
      setEntregasTareaEditing(entregas || []);
    } catch {
      setEntregasTareaEditing([]);
    } finally {
      setLoadingEntregasEditing(false);
    }
  };

  // Manejador Guardar Tarea (Crear o Editar con triple fecha sin desfase de zona horaria y rúbrica)
  const handleCrearTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloTarea.trim()) {
      toast("El título de la tarea es obligatorio", "error");
      return;
    }

    if (tieneRubricaTarea) {
      if (criteriosRubricaTarea.length === 0) {
        toast("Debes agregar al menos un criterio a la rúbrica o desactivarla.", "error");
        return;
      }
      for (const crit of criteriosRubricaTarea) {
        if (!crit.nombre.trim()) {
          toast("Todos los criterios de la rúbrica deben tener nombre.", "error");
          return;
        }
        if (Number(crit.puntajeMaximo) <= 0) {
          toast("El puntaje máximo de cada criterio debe ser mayor a 0.", "error");
          return;
        }
      }
      const sumRubrica = criteriosRubricaTarea.reduce((acc, c) => acc + Number(c.puntajeMaximo || 0), 0);
      if (sumRubrica > Number(puntajeMax)) {
        toast(`La suma de los criterios de la rúbrica (${sumRubrica} pts) supera el puntaje máximo de la tarea (${puntajeMax} pts).`, "error");
        return;
      }
    }

    try {
      setCreandoTarea(true);
      const payload: TareaRequest = {
        convocatoriaId,
        moduloId: tareaModuloId ? Number(tareaModuloId) : 0,
        titulo: tituloTarea.trim(),
        descripcion: descTarea.trim() || undefined,
        fechaHabilitacion: formatDateTimeForBackend(fechaHabilitacion),
        fechaEntrega: formatDateTimeForBackend(fechaEntrega),
        fechaCorte: formatDateTimeForBackend(fechaCorte),
        habilitada: tareaEditing && tareaEditing.habilitada !== undefined ? tareaEditing.habilitada : true,
        tiposArchivosPermitidos: archivosPermitidos.trim() || ".pdf, .docx, .zip",
        tamanoMaximoMb: Number(tamanoMb) || 15,
        puntajeMaximo: Number(puntajeMax) || 100,
        esGrupal: esGrupalTarea,
        actividadGrupoId: esGrupalTarea && tareaActividadGrupoId ? Number(tareaActividadGrupoId) : undefined,
        rubrica: tieneRubricaTarea
          ? criteriosRubricaTarea.map((c) => ({
              id: c.id,
              nombre: c.nombre.trim(),
              descripcion: c.descripcion?.trim() || undefined,
              puntajeMaximo: Number(c.puntajeMaximo),
            }))
          : tareaEditing
          ? []
          : null,
      };

      if (tareaEditing) {
        const updated = await api.updateTarea(tareaEditing.id, payload);
        toast("Tarea académica actualizada exitosamente. Las entregas registradas se mantienen intactas.", "success");
        if (activeTareaDetalle && activeTareaDetalle.id === tareaEditing.id) {
          setActiveTareaDetalle(updated);
        }
      } else {
        await api.createTareaConvocatoria(convocatoriaId, payload);
        toast("Tarea académica creada exitosamente con control de fechas Moodle", "success");
      }

      setShowCreateTareaModal(false);
      setTareaEditing(null);
      setEntregasTareaEditing([]);
      setTituloTarea("");
      setDescTarea("");
      setFechaHabilitacion("");
      setFechaEntrega("");
      setFechaCorte("");
      setEsGrupalTarea(false);
      setTareaActividadGrupoId("");
      setTieneRubricaTarea(false);
      setCriteriosRubricaTarea([]);

      const updatedTareas = await api.getTareasConvocatoria(convocatoriaId);
      setTareas(updatedTareas);
    } catch (err: any) {
      toast(err.message || (tareaEditing ? "No se pudo actualizar la tarea" : "No se pudo crear la tarea"), "error");
    } finally {
      setCreandoTarea(false);
    }
  };

  // Toggle de habilitación en vivo (Moodle)
  const handleToggleHabilitar = async (tareaId: number) => {
    try {
      const updated = await api.toggleHabilitarTarea(tareaId);
      setTareas((prev) => prev.map((t) => (t.id === tareaId ? { ...t, habilitada: updated.habilitada, estadoMoodle: updated.estadoMoodle } : t)));
      setActiveTareaDetalle((prev) => (prev?.id === tareaId ? { ...prev, habilitada: updated.habilitada, estadoMoodle: updated.estadoMoodle } : prev));
      toast(`Recepción de entregas ${updated.habilitada ? "habilitada" : "deshabilitada"} en vivo`, "success");
    } catch (err: any) {
      toast(err.message || "Error al conmutar estado de habilitación", "error");
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
      toast("¡Solicitud enviada exitosamente! Tu postulación se encuentra en revisión por el docente encargado.", "success");
      setShowInscripcionModal(false);
      setNombreEquipo("");

      await cargarDatos();
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
      await cargarDatos();
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
      await cargarDatos();
    } catch (err: any) {
      toast(err.message || "No se pudo rechazar la solicitud", "error");
    } finally {
      setProcesandoAdmision(false);
    }
  };

  // Manejador Admitir en Lote
  const handleAdmitirLote = async () => {
    if (selectedSolicitudesLote.length === 0) return;
    try {
      setProcesandoAdmision(true);
      const res = await api.responderLote(convocatoriaId, selectedSolicitudesLote, "ADMITIR");
      toast(`Admisión en lote: ${res.procesados} estudiantes admitidos.`, "success");
      if (res.errores && res.errores.length > 0) {
        toast(`Errores: ${res.errores.join(", ")}`, "error");
      }
      setSelectedSolicitudesLote([]);
      await cargarDatos();
    } catch (err: any) {
      toast(err.message || "Error al procesar admisiones en lote", "error");
    } finally {
      setProcesandoAdmision(false);
    }
  };

  // Manejador Rechazar en Lote
  const handleRechazarLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSolicitudesLote.length === 0) return;
    try {
      setProcesandoAdmision(true);
      const res = await api.responderLote(convocatoriaId, selectedSolicitudesLote, "RECHAZAR", motivoRechazoLoteInput.trim() || undefined);
      toast(`Rechazo en lote: ${res.procesados} solicitudes rechazadas.`, "success");
      if (res.errores && res.errores.length > 0) {
        toast(`Errores: ${res.errores.join(", ")}`, "error");
      }
      setShowRechazoLoteModal(false);
      setMotivoRechazoLoteInput("");
      setSelectedSolicitudesLote([]);
      await cargarDatos();
    } catch (err: any) {
      toast(err.message || "Error al rechazar solicitudes en lote", "error");
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
      await cargarDatos();
    } catch (err: any) {
      toast(err.message || "No se pudo declinar la solicitud", "error");
    }
  };

  // ==========================================
  // GESTIÓN DE GRUPOS & SELECCIÓN MOODLE
  // ==========================================

  // Elegir grupo en actividad Moodle
  const handleGuardarEleccionGrupo = async (actividadId: number) => {
    if (!selectedGrupoRadioId) {
      toast("Por favor selecciona un grupo antes de guardar", "error");
      return;
    }

    // Verificar si el estudiante ya tenía un grupo y si ya existen entregas registradas para esta actividad
    const act = actividadesGrupo.find((a) => a.id === actividadId);
    if (act && act.grupoSeleccionadoId && act.grupoSeleccionadoId !== selectedGrupoRadioId) {
      const tareasVinculadas = tareas.filter((t) => t.actividadGrupoId === actividadId);
      const tieneEntregas = tareasVinculadas.some((t) => !!t.miEntrega);
      if (tieneEntregas) {
        toast("No puedes cambiarte de grupo porque tu equipo ya ha registrado entregas en tareas vinculadas a esta actividad.", "error");
        return;
      }
    }

    try {
      setProcesandoEleccion(true);
      const updatedAct = await api.elegirGrupoActividad(convocatoriaId, actividadId, selectedGrupoRadioId);
      toast("¡Elección de grupo guardada exitosamente!", "success");
      setActividadActiva(updatedAct);
      await cargarDatos();
    } catch (err: any) {
      toast(err.message || "Error al guardar la elección de grupo", "error");
    } finally {
      setProcesandoEleccion(false);
    }
  };

  // Anular elección de grupo en actividad Moodle
  const handleAnularEleccionGrupo = async (actividadId: number) => {
    const act = actividadesGrupo.find((a) => a.id === actividadId);
    if (act && act.grupoSeleccionadoId) {
      const tareasVinculadas = tareas.filter((t) => t.actividadGrupoId === actividadId);
      const tieneEntregas = tareasVinculadas.some((t) => !!t.miEntrega);
      if (tieneEntregas) {
        toast("No puedes anular tu elección de grupo porque tu equipo ya ha registrado entregas en tareas vinculadas a esta actividad.", "error");
        return;
      }
    }

    if (!confirm("¿Deseas anular tu elección de grupo actual? Tu cupo quedará libre para otro estudiante.")) return;
    try {
      setProcesandoEleccion(true);
      const updatedAct = await api.anularEleccionGrupoActividad(convocatoriaId, actividadId);
      toast("Elección de grupo anulada exitosamente", "success");
      setSelectedGrupoRadioId(null);
      setActividadActiva(updatedAct);
      await cargarDatos();
    } catch (err: any) {
      toast(err.message || "Error al anular la elección", "error");
    } finally {
      setProcesandoEleccion(false);
    }
  };

  // Crear Grupo individual (Docente / Admin)
  const handleCrearGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoGrupoNombre.trim()) {
      toast("El nombre del grupo es obligatorio", "error");
      return;
    }
    try {
      setCreandoGrupo(true);
      await api.crearGrupo(convocatoriaId, {
        nombre: nuevoGrupoNombre.trim(),
        descripcion: nuevoGrupoDesc.trim() || undefined,
        capacidadMaxima: nuevoGrupoCapacidad > 0 ? nuevoGrupoCapacidad : undefined,
        actividadGrupoId: actividadActiva?.id,
      });
      toast(`Grupo "${nuevoGrupoNombre.trim()}" creado exitosamente`, "success");
      setShowCrearGrupoModal(false);
      setNuevoGrupoNombre("");
      setNuevoGrupoDesc("");
      setNuevoGrupoCapacidad(5);
      await cargarDatos();
    } catch (err: any) {
      toast(err.message || "Error al crear el grupo", "error");
    } finally {
      setCreandoGrupo(false);
    }
  };

  // Generar Lote de Grupos (Docente / Admin)
  const handleGenerarLoteGrupos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loteCantidad <= 0 || loteCantidad > 100) {
      toast("La cantidad de grupos debe estar entre 1 y 100", "error");
      return;
    }
    try {
      setGenerandoLote(true);
      await api.generarLoteGrupos(convocatoriaId, {
        prefijo: lotePrefijo.trim() ? lotePrefijo : "Gr1erPar ",
        cantidad: loteCantidad,
        capacidadMaxima: loteCapacidad > 0 ? loteCapacidad : 5,
        actividadGrupoId: actividadActiva?.id,
      });
      toast(`¡Se han generado ${loteCantidad} grupos exitosamente!`, "success");
      setShowGenerarLoteModal(false);
      await cargarDatos();
    } catch (err: any) {
      toast(err.message || "Error al generar lote de grupos", "error");
    } finally {
      setGenerandoLote(false);
    }
  };

  // Eliminar Grupo (Docente / Admin)
  const handleEliminarGrupo = async (grupoId: number, nombreGrupo: string) => {
    if (!confirm(`¿Eliminar el grupo "${nombreGrupo}"? Los estudiantes asignados quedarán sin equipo.`)) return;
    try {
      await api.eliminarGrupo(convocatoriaId, grupoId);
      toast(`Grupo "${nombreGrupo}" eliminado`, "success");
      await cargarDatos();
    } catch (err: any) {
      toast(err.message || "Error al eliminar el grupo", "error");
    }
  };

  // Asignar estudiante sin grupo a un grupo (Docente / Admin)
  const handleAsignarEstudianteAGrupo = async (participanteId: number, grupoId: number, nombreEstudiante: string) => {
    try {
      setAsignandoParticipanteId(participanteId);
      await api.asignarMiembroGrupo(convocatoriaId, grupoId, participanteId);
      toast(`${nombreEstudiante} asignado al grupo`, "success");
      await cargarDatos();
    } catch (err: any) {
      toast(err.message || "Error al asignar estudiante al grupo", "error");
    } finally {
      setAsignandoParticipanteId(null);
    }
  };

  // Remover estudiante de un grupo (Docente / Admin)
  const handleRemoverEstudianteDeGrupo = async (grupoId: number, participanteId: number, nombreEstudiante: string) => {
    if (!confirm(`¿Retirar a ${nombreEstudiante} de este grupo?`)) return;
    try {
      await api.removerMiembroGrupo(convocatoriaId, grupoId, participanteId);
      toast(`${nombreEstudiante} retirado del grupo`, "success");
      await cargarDatos();
    } catch (err: any) {
      toast(err.message || "Error al remover del grupo", "error");
    }
  };

  // Abrir modal de creación limpia de actividad de selección
  const handleAbrirCrearActividad = () => {
    setEditingActividadId(null);
    setNuevaActTitulo("Seleccionar grupo para 1er examen parcial");
    setNuevaActDesc("Seleccionar número de grupo según se les asignó en la hoja que presentaron en clases.");
    const now = new Date();
    const nowStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextWeekStr = new Date(nextWeek.getTime() - nextWeek.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setNuevaActApertura(nowStr);
    setNuevaActCierre(nextWeekStr);
    setNuevaActCapacidad(5);
    setNuevaActPermitirCambio(true);
    setNuevaActMostrarMiembros(true);
    setNuevaActGenerarGrupos(true);
    setNuevaActCantidadGrupos(10);
    setNuevaActPrefijo("Gr1erPar ");
    setShowCrearActividadModal(true);
  };

  // Abrir modal de edición con plazos y reglas actuales (Docente / Admin)
  const handleAbrirEditarActividad = (act: ActividadGrupoDTO) => {
    setEditingActividadId(act.id);
    setNuevaActTitulo(act.titulo);
    setNuevaActDesc(act.descripcion || "");
    setNuevaActApertura(formatForDateTimeLocal(act.fechaApertura));
    setNuevaActCierre(formatForDateTimeLocal(act.fechaCierre));
    setNuevaActCapacidad(act.capacidadPorGrupo || 5);
    setNuevaActPermitirCambio(act.permitirCambio ?? true);
    setNuevaActMostrarMiembros(act.mostrarMiembros ?? true);
    setNuevaActGenerarGrupos(false);
    setShowCrearActividadModal(true);
  };

  // Guardar (Crear o Editar) Actividad de Selección de Grupo (Docente / Admin)
  const handleCrearActividadGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaActTitulo.trim()) {
      toast("El título de la actividad es obligatorio", "error");
      return;
    }
    try {
      setCreandoActividad(true);
      const req: CrearActividadGrupoRequest = {
        convocatoriaId,
        titulo: nuevaActTitulo.trim(),
        descripcion: nuevaActDesc.trim() || undefined,
        fechaApertura: formatDateTimeForBackend(nuevaActApertura),
        fechaCierre: formatDateTimeForBackend(nuevaActCierre),
        capacidadPorGrupo: nuevaActCapacidad > 0 ? nuevaActCapacidad : 5,
        permitirCambio: nuevaActPermitirCambio,
        mostrarMiembros: nuevaActMostrarMiembros,
        generarGrupos: editingActividadId ? false : nuevaActGenerarGrupos,
        cantidadGrupos: nuevaActCantidadGrupos,
        prefijoGrupos: nuevaActPrefijo.trim() || "Gr1erPar ",
      };

      if (editingActividadId) {
        const actualizada = await api.actualizarActividadGrupo(convocatoriaId, editingActividadId, req);
        toast(`Actividad "${actualizada.titulo}" actualizada exitosamente`, "success");
        setActividadActiva(actualizada);
      } else {
        const creada = await api.crearActividadGrupo(convocatoriaId, req);
        toast(`Actividad "${creada.titulo}" creada exitosamente`, "success");
        setActividadActiva(creada);
      }
      setShowCrearActividadModal(false);
      setEditingActividadId(null);
      await cargarDatos();
    } catch (err: any) {
      toast(err.message || "Error al guardar actividad de selección", "error");
    } finally {
      setCreandoActividad(false);
    }
  };

  // Consultar ficha académica / perfil público de un participante
  const handleAbrirPerfilParticipante = async (usuarioId: number) => {
    try {
      setSelectedPerfilUsuarioId(usuarioId);
      setCargandoPerfilUsuario(true);
      const data = await api.getPerfilPublico(usuarioId);
      setPerfilUsuarioModalData(data);
    } catch (err: any) {
      toast(err.message || "Error al cargar la información del participante", "error");
    } finally {
      setCargandoPerfilUsuario(false);
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

  // Abrir Modal de Entrega (limpio, cargando datos previos si ya entregó)
  const handleAbrirEntregaModal = (t: TareaDTO) => {
    setSelectedTareaForEntrega(t);
    setErrorValidacionArchivo(null);
    setEditandoNombreArchivo(false);

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
  };

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

      // Resolver grupo al que pertenece el estudiante para esta tarea (Moodle Grouping)
      let finalGrupoId: number | undefined = undefined;
      if (selectedTareaForEntrega.esGrupal) {
        if (selectedTareaForEntrega.actividadGrupoId) {
          const act = actividadesGrupo.find((a) => a.id === selectedTareaForEntrega.actividadGrupoId);
          const grp = act?.grupos?.find(
            (g) =>
              g.id === act.grupoSeleccionadoId ||
              g.miembros?.some(
                (m) =>
                  m.usuarioId === user?.id ||
                  (user?.email && m.email?.toLowerCase() === user.email.toLowerCase())
              )
          );
          finalGrupoId = grp?.id;
        } else {
          const grp =
            gruposArea.find((g) =>
              g.miembros?.some(
                (m) =>
                  m.usuarioId === user?.id ||
                  (user?.email && m.email?.toLowerCase() === user.email.toLowerCase())
              )
            ) ||
            actividadesGrupo
              .flatMap((a) => a.grupos || [])
              .find((g) =>
                g.miembros?.some(
                  (m) =>
                    m.usuarioId === user?.id ||
                    (user?.email && m.email?.toLowerCase() === user.email.toLowerCase())
                )
              );
          finalGrupoId = grp?.id;
        }
      }

      const req: EntregaRequest = {
        documentoId: docVinculadoId ? Number(docVinculadoId) : undefined,
        nombreArchivo: finalNombreArchivo || undefined,
        archivoUrl: finalArchivoUrl,
        comentarioEstudiante: comentarioEstudiante.trim() || undefined,
        grupoId: finalGrupoId,
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

      const updatedTareas = await api.getTareasConvocatoria(convocatoriaId);
      setTareas(updatedTareas);
      setActiveTareaDetalle((prev) => (prev ? updatedTareas.find((t) => t.id === prev.id) || null : null));
    } catch (err: any) {
      toast(err.message || "Error al enviar la entrega", "error");
    } finally {
      setEnviandoEntrega(false);
    }
  };

  // ==========================================
  // GESTIÓN DE MÓDULOS (LMS / MOODLE)
  // ==========================================

  // Abrir Modal Crear Módulo limpio
  const handleAbrirCrearModulo = () => {
    setModuloEditing(null);
    setErrorModuloImg(null);
    setModuloTitulo("");
    setModuloDescripcion("");
    setModuloOrden(modulos.length + 1);
    setModuloImagenUrl("");
    setModuloImagenPreview(null);
    setModuloImagenFile(null);
    setShowModuloModal(true);
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
      updateUrlParams({ entregas: tarea.id });

      const [segData, entregas] = await Promise.all([
        api.getSeguimiento(tarea.id).catch((err: any) => {
          console.warn("Error al cargar seguimiento:", err);
          return null;
        }),
        api.getEntregasTarea(tarea.id).catch((err: any) => {
          console.warn("Error al cargar entregas:", err);
          return [] as EntregaTareaDTO[];
        }),
      ]);

      setSeguimientoTareaActual(segData);
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

        if (tarea.rubrica && tarea.rubrica.length > 0) {
          const initScores: Record<number, number> = {};
          tarea.rubrica.forEach((c) => {
            const match = primera.puntajesCriterios?.find((pc: any) => pc.criterioId === c.id);
            initScores[c.id] = match ? match.puntaje : c.puntajeMaximo;
          });
          setPuntajesCriteriosInput(initScores);
        }
      } else {
        const primerEst = participantes.find((p) => p.rol === "ESTUDIANTE" && p.estadoInscripcion === "ACEPTADO");
        if (primerEst) {
          setSelectedEstudianteId(primerEst.usuarioId);
          setNotaCalificacion(tarea.puntajeMaximo || 100);
          setFeedbackDocente("");
          if (tarea.rubrica && tarea.rubrica.length > 0) {
            const initScores: Record<number, number> = {};
            tarea.rubrica.forEach((c) => {
              initScores[c.id] = c.puntajeMaximo;
            });
            setPuntajesCriteriosInput(initScores);
          }
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

      if (activeTareaParaEntregas?.rubrica && activeTareaParaEntregas.rubrica.length > 0) {
        const scores: Record<number, number> = {};
        activeTareaParaEntregas.rubrica.forEach((c) => {
          const match = ent.puntajesCriterios?.find((pc) => pc.criterioId === c.id);
          scores[c.id] = match ? match.puntaje : (ent.calificacion !== undefined && ent.calificacion !== null ? 0 : c.puntajeMaximo);
        });
        setPuntajesCriteriosInput(scores);
      }
    } else {
      setNotaCalificacion(activeTareaParaEntregas?.puntajeMaximo || 100);
      setFeedbackDocente("");
      if (activeTareaParaEntregas?.rubrica && activeTareaParaEntregas.rubrica.length > 0) {
        const scores: Record<number, number> = {};
        activeTareaParaEntregas.rubrica.forEach((c) => {
          scores[c.id] = c.puntajeMaximo;
        });
        setPuntajesCriteriosInput(scores);
      }
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

    const tieneRubrica = Boolean(activeTareaParaEntregas.rubrica && activeTareaParaEntregas.rubrica.length > 0);

    let req: CalificarEntregaRequest;

    if (tieneRubrica) {
      const criterios = activeTareaParaEntregas.rubrica!;
      for (const crit of criterios) {
        const puntaje = puntajesCriteriosInput[crit.id] ?? 0;
        if (puntaje < 0 || puntaje > crit.puntajeMaximo) {
          toast(`El puntaje en '${crit.nombre}' debe estar entre 0 y ${crit.puntajeMaximo} pts.`, "error");
          return;
        }
      }

      req = {
        puntajesCriterios: criterios.map((crit) => ({
          criterioId: crit.id,
          puntaje: Number(puntajesCriteriosInput[crit.id] ?? 0),
        })),
        retroalimentacion: feedbackDocente.trim() || undefined,
      };
    } else {
      const nota = Number(notaCalificacion);
      if (isNaN(nota) || nota < 0 || nota > (activeTareaParaEntregas.puntajeMaximo || 100)) {
        toast(`La calificación debe estar entre 0 y ${activeTareaParaEntregas.puntajeMaximo || 100} pts.`, "error");
        return;
      }

      req = {
        calificacion: nota,
        retroalimentacion: feedbackDocente.trim() || undefined,
      };
    }

    try {
      setGuardandoNota(true);
      const calificada = await api.calificarEntrega(ent.id, req);
      toast("Calificación guardada y sincronizada correctamente", "success");

      // Refrescar lista completa de entregas y seguimiento para actualizar a todos los compañeros del equipo en SpeedGrader
      try {
        const [refreshedSeg, refreshedEntregas, updatedTareas] = await Promise.all([
          api.getSeguimiento(activeTareaParaEntregas.id).catch(() => null),
          api.getEntregasTarea(activeTareaParaEntregas.id).catch(() => []),
          api.getTareasConvocatoria(convocatoriaId).catch(() => []),
        ]);

        if (refreshedSeg) setSeguimientoTareaActual(refreshedSeg);
        if (refreshedEntregas.length > 0) setEntregasTareaActual(refreshedEntregas);
        if (updatedTareas.length > 0) {
          setTareas(updatedTareas);
          setActiveTareaDetalle((prev) => (prev ? updatedTareas.find((t: any) => t.id === prev.id) || null : null));
        }
      } catch {
        setEntregasTareaActual((prev) =>
          prev.map((item) => (item.id === calificada.id ? calificada : item))
        );
      }
    } catch (err: any) {
      toast(err.message || "Error al calificar entrega", "error");
    } finally {
      setGuardandoNota(false);
    }
  };

  // Manejador ver historial de intentos / versiones
  const handleVerHistorialVersiones = async (entregaId: number) => {
    try {
      setCargandoHistorial(true);
      const historial = await api.getHistorial(entregaId);
      setHistorialVersionesModal(historial);
    } catch (err: any) {
      toast(err.message || "Error al cargar historial de versiones", "error");
    } finally {
      setCargandoHistorial(false);
    }
  };

  // Manejador exportar CSV de una tarea
  const handleExportNotasTareaCSV = async (tareaId: number, titulo: string) => {
    try {
      const blob = await api.exportNotasTarea(tareaId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Notas_${titulo.replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Notas exportadas exitosamente a CSV", "success");
    } catch (err: any) {
      toast(err.message || "Error al exportar notas", "error");
    }
  };

  // Manejador descarga directa autenticada de archivo de entrega
  const handleDescargarArchivoEntrega = async (archivoUrl: string, nombreArchivo: string) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const fullUrl = getMediaUrl(archivoUrl);
      const res = await fetch(fullUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Error HTTP " + res.status);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = nombreArchivo;
      a.click();
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(getMediaUrl(archivoUrl), "_blank");
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

  // Cargar entregas de todas las tareas para el Libro Central de Calificaciones (Gradebook)
  const cargarTodasLasEntregas = useCallback(async () => {
    if (!tareas || tareas.length === 0) return;
    try {
      setCargandoGradebook(true);
      const results = await Promise.all(
        tareas.map(async (t) => {
          try {
            const ents = await api.getEntregasTarea(t.id);
            return { tareaId: t.id, entregas: ents };
          } catch {
            return { tareaId: t.id, entregas: [] };
          }
        })
      );
      const mapa: Record<number, EntregaTareaDTO[]> = {};
      results.forEach((r) => {
        mapa[r.tareaId] = r.entregas;
      });
      setTodasLasEntregas(mapa);
    } finally {
      setCargandoGradebook(false);
    }
  }, [tareas]);

  // Cargar calificaciones automáticamente cuando se entra a la pestaña de Calificaciones
  useEffect(() => {
    if (activeTab === "calificaciones" && puedeGestionarTareas && tareas.length > 0) {
      cargarTodasLasEntregas();
    }
  }, [activeTab, puedeGestionarTareas, tareas, cargarTodasLasEntregas]);

  // Exportar matriz de calificaciones a formato CSV
  const handleExportarCalificacionesCSV = () => {
    if (estudiantesAdmitidos.length === 0) {
      toast("No hay estudiantes admitidos para exportar", "info");
      return;
    }

    const headers = ["Estudiante", "Correo", "Equipo"];
    tareas.forEach((t) => {
      headers.push(`"${t.titulo.replace(/"/g, '""')} (Max: ${t.puntajeMaximo || 100})"`);
    });
    headers.push("Total Acumulado", "Puntaje Máximo Posible", "Porcentaje (%)", "Entregas Realizadas");

    const rows = estudiantesAdmitidos.map((est) => {
      let totalNota = 0;
      let totalMax = 0;
      let entregadas = 0;

      const row = [
        `"${`${est.nombre} ${est.apellidos || ""}`.trim().replace(/"/g, '""')}"`,
        `"${est.email}"`,
        `"${(est.nombreEquipo || "Sin equipo").replace(/"/g, '""')}"`,
      ];

      tareas.forEach((t) => {
        const maxP = t.puntajeMaximo || 100;
        totalMax += maxP;
        const ent = todasLasEntregas[t.id]?.find((e) => e.estudianteId === est.usuarioId);
        if (ent) {
          entregadas++;
          if (ent.calificacion !== undefined && ent.calificacion !== null) {
            totalNota += ent.calificacion;
            row.push(String(ent.calificacion));
          } else {
            row.push('"Pendiente"');
          }
        } else {
          row.push('"0"');
        }
      });

      const pct = totalMax > 0 ? Math.round((totalNota / totalMax) * 100) : 0;
      row.push(String(totalNota), String(totalMax), `"${pct}%"`, `"${entregadas}/${tareas.length}"`);
      return row.join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Calificaciones_${(convocatoria?.titulo || "Aula").replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("Libro de calificaciones exportado exitosamente a CSV", "success");
  };

  const estudiantesFiltradosGradebook = estudiantesAdmitidos.filter((est) => {
    if (!searchGradebookEstudiante.trim()) return true;
    const q = searchGradebookEstudiante.toLowerCase();
    return (
      `${est.nombre} ${est.apellidos || ""}`.toLowerCase().includes(q) ||
      est.email.toLowerCase().includes(q) ||
      Boolean(est.nombreEquipo && est.nombreEquipo.toLowerCase().includes(q))
    );
  });

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
  // MODAL REUTILIZABLE: SUBIR / MODIFICAR ENTREGA (MOODLE)
  // ========================================================
  const renderModalSubirEntrega = () => {
    if (!selectedTareaForEntrega) return null;

    // Resolver a qué grupo pertenece el estudiante para esta tarea específica (Moodle Grouping)
    let miGrupoParaEstaTarea: GrupoDTO | null = null;
    let actividadAsociada: ActividadGrupoDTO | null = null;

    if (selectedTareaForEntrega.esGrupal) {
      if (selectedTareaForEntrega.actividadGrupoId) {
        actividadAsociada = actividadesGrupo.find((a) => a.id === selectedTareaForEntrega.actividadGrupoId) || null;
        if (actividadAsociada) {
          miGrupoParaEstaTarea =
            actividadAsociada.grupos?.find(
              (g) =>
                g.id === actividadAsociada?.grupoSeleccionadoId ||
                g.miembros?.some(
                  (m) =>
                    m.usuarioId === user?.id ||
                    (user?.email && m.email?.toLowerCase() === user.email.toLowerCase())
                )
            ) || null;
        }
      } else {
        miGrupoParaEstaTarea =
          gruposArea.find((g) =>
            g.miembros?.some(
              (m) =>
                m.usuarioId === user?.id ||
                (user?.email && m.email?.toLowerCase() === user.email.toLowerCase())
            )
          ) || null;
        if (!miGrupoParaEstaTarea) {
          for (const act of actividadesGrupo) {
            const g = act.grupos?.find(
              (gr) =>
                gr.id === act.grupoSeleccionadoId ||
                gr.miembros?.some(
                  (m) =>
                    m.usuarioId === user?.id ||
                    (user?.email && m.email?.toLowerCase() === user.email.toLowerCase())
                )
            );
            if (g) {
              miGrupoParaEstaTarea = g;
              actividadAsociada = act;
              break;
            }
          }
        }
      }
    }

    return (
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

          {/* Tarjeta de Requisitos de la Tarea */}
          <div className="text-xs space-y-2 bg-paper-sunken/70 p-3.5 rounded-xl border border-line">
            <span className="font-bold text-ink text-sm block">{selectedTareaForEntrega.titulo}</span>
            {selectedTareaForEntrega.descripcion && (
              <p className="text-ink-soft text-[11px] leading-relaxed line-clamp-2">
                {selectedTareaForEntrega.descripcion}
              </p>
            )}
            <div className="flex flex-wrap gap-2 text-[11px] pt-1">
              {selectedTareaForEntrega.esGrupal && (
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-bold flex items-center gap-1">
                  <Users className="w-3 h-3" /> Entrega Grupal
                </span>
              )}
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

          {/* Alerta o Información de Agrupamiento y Equipo (Moodle Grouping) */}
          {selectedTareaForEntrega.esGrupal && (
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
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTareaForEntrega(null);
                    if (actividadAsociada) {
                      setActividadActiva(actividadAsociada);
                    }
                    handleCambiarTab("grupos");
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" /> Ir a Seleccionar Grupo Ahora
                </button>
              </div>
            )
          )}

          {/* Entrega Previa Registrada si existe */}
          {selectedTareaForEntrega.miEntrega && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5 font-semibold text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {selectedTareaForEntrega.esGrupal || selectedTareaForEntrega.miEntrega.esGrupal ? (
                    <span>
                      {selectedTareaForEntrega.miEntrega.esMiEntregaPropia ? (
                        <>Entregado previamente por ti (Equipo <strong>{selectedTareaForEntrega.miEntrega.grupoNombre || "del grupo"}</strong>)</>
                      ) : (
                        <>Entregado por tu compañero <strong>{selectedTareaForEntrega.miEntrega.entregadoPorNombre}</strong> (Equipo <strong>{selectedTareaForEntrega.miEntrega.grupoNombre || "del grupo"}</strong>)</>
                      )}
                    </span>
                  ) : (
                    <span>Entrega registrada el {new Date(selectedTareaForEntrega.miEntrega.fechaEntrega).toLocaleString()}</span>
                  )}
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold uppercase text-[10px]">
                  {selectedTareaForEntrega.miEntrega.estado}
                </span>
              </div>

              {(selectedTareaForEntrega.esGrupal || selectedTareaForEntrega.miEntrega.esGrupal) && selectedTareaForEntrega.miEntrega.companerosEquipo && selectedTareaForEntrega.miEntrega.companerosEquipo.length > 0 && (
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>Compañeros de equipo: {selectedTareaForEntrega.miEntrega.companerosEquipo.join(", ")}</span>
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
                {selectedTareaForEntrega.esGrupal || selectedTareaForEntrega.miEntrega.esGrupal
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
            {/* Input de archivo físico oculto */}
            <input
              ref={fileInputEntregaRef}
              type="file"
              onChange={handleSelectFileInputEntrega}
              className="hidden"
            />

            {/* ZONA DRAG & DROP / TARJETA DE ARCHIVO CARGADO */}
            <div>
              <label className="font-semibold text-ink block mb-1.5">
                Archivos de Entrega (Arrastra o Selecciona) *
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-3 border-t border-line">

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
                  disabled={enviandoEntrega || Boolean(selectedTareaForEntrega.esGrupal && !miGrupoParaEstaTarea)}
                  title={selectedTareaForEntrega.esGrupal && !miGrupoParaEstaTarea ? "Debes unirte a un grupo para poder realizar la entrega" : ""}
                  className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
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
    );
  };

  // ========================================================
  // MODAL: CREAR / EDITAR MÓDULO DE APRENDIZAJE
  // ========================================================
  const renderModalModulo = () => {
    if (!showModuloModal) return null;
    return (
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
    );
  };

  // ========================================================
  // MODAL: CREAR / EDITAR TAREA ACADÉMICA (MOODLE)
  // ========================================================
  const renderModalCreateTarea = () => {
    if (!showCreateTareaModal) return null;
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <div className="bg-paper border border-line rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />{" "}
                {tareaEditing ? "Editar Tarea Académica (Moodle)" : "Nueva Tarea Académica (Moodle)"}
              </h3>
              <p className="text-[11px] text-ink-soft mt-0.5">
                {tareaEditing
                  ? "Modifica fechas, instrucciones o restricciones. Las entregas registradas previamente se mantendrán intactas."
                  : "Configura las pautas y plazos de entrega para los estudiantes"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCreateTareaModal(false);
                setTareaEditing(null);
                setEntregasTareaEditing([]);
              }}
              className="text-ink-faint hover:text-ink cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Sección de Protección e Historial de Entregas al editar */}
          {tareaEditing && (
            <div className="p-3.5 bg-paper-sunken/80 border border-line rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-xs text-ink">
                    Historial de Entregas ({entregasTareaEditing.length} registradas)
                  </span>
                </div>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" /> Entregas Protegidas
                </span>
              </div>

              <p className="text-[11px] text-ink-soft leading-relaxed">
                Si amplías o ajustas la fecha límite o parámetros, <strong>los estudiantes que ya entregaron no perderán su entrega</strong> ni tendrán que reenviarla; sus archivos permanecen registrados formalmente.
              </p>

              {loadingEntregasEditing ? (
                <div className="p-3 text-center text-xs text-ink-faint bg-paper rounded-lg border border-line">
                  Cargando historial de entregas...
                </div>
              ) : entregasTareaEditing.length === 0 ? (
                <div className="p-2.5 text-center text-[11px] text-ink-faint bg-paper rounded-lg border border-line">
                  No hay entregas previas para esta tarea todavía. Puedes ajustar los plazos con total libertad.
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto divide-y divide-line rounded-lg border border-line bg-paper text-[11px]">
                  {entregasTareaEditing.map((entrega) => (
                    <div
                      key={entrega.id}
                      className="p-2.5 flex items-center justify-between gap-2 hover:bg-paper-sunken/40 transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-semibold text-ink truncate">
                          {entrega.estudianteNombre || entrega.estudianteEmail}
                        </p>
                        <p className="text-[10px] text-ink-soft flex items-center gap-1.5 flex-wrap">
                          {entrega.grupoNombre && (
                            <span className="font-medium text-accent">[{entrega.grupoNombre}]</span>
                          )}
                          <span>Entregado: {formatMoodleDate(entrega.fechaEntrega)}</span>
                          {entrega.estado === "CALIFICADO" ? (
                            <span className="text-emerald-600 font-semibold">({entrega.calificacion} pts)</span>
                          ) : null}
                        </p>
                      </div>

                      {entrega.nombreArchivo && (
                        <div className="shrink-0 flex items-center gap-1">
                          {entrega.archivoUrl ? (
                            <a
                              href={getMediaUrl(entrega.archivoUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-paper-sunken hover:bg-paper text-accent border border-line rounded-md text-[10px] font-medium flex items-center gap-1 transition-colors"
                              title={`Descargar ${entrega.nombreArchivo}`}
                            >
                              <FileText className="w-3 h-3" />
                              <span className="max-w-[110px] truncate">{entrega.nombreArchivo}</span>
                              <Download className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-ink-soft">{entrega.nombreArchivo}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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

            {/* Modalidad de Entrega: Individual o Grupal */}
            <div className="p-3 bg-paper-sunken/60 rounded-xl border border-line flex items-center justify-between">
              <div className="pr-3">
                <label className="font-bold text-ink block text-xs flex items-center gap-1.5 cursor-pointer">
                  <Users className="w-4 h-4 text-accent" />
                  Entrega Grupal (por equipos)
                </label>
                <p className="text-[10px] text-ink-faint mt-0.5">
                  Si se activa, el envío de cualquier integrante del equipo figurará como entregado para todos los compañeros, y al calificarlo se sincronizará la nota y comentarios a todo el grupo.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={esGrupalTarea}
                  onChange={(e) => setEsGrupalTarea(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-paper-sunken peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent border border-line"></div>
              </label>
            </div>

            {/* Agrupamiento / Actividad de grupos asociada (Moodle Grouping) */}
            {esGrupalTarea && (
              <div className="p-3 bg-paper-sunken/40 rounded-xl border border-line space-y-1.5">
                <label className="font-semibold text-ink block text-xs">
                  Agrupamiento / Actividad de Grupos (Moodle Grouping)
                </label>
                <p className="text-[11px] text-ink-soft">
                  Asocia la tarea al conjunto de grupos de una actividad específica (ej: grupos de laboratorio vs grupos de proyecto). La entrega de un estudiante solo replicará a sus compañeros dentro de este agrupamiento.
                </p>
                <select
                  value={tareaActividadGrupoId}
                  onChange={(e) => setTareaActividadGrupoId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 bg-paper border border-line rounded-xl text-ink focus:outline-none focus:border-accent text-xs"
                >
                  <option value="">-- Todos los grupos generales del aula --</option>
                  {actividadesGrupo.map((act) => (
                    <option key={act.id} value={act.id}>
                      {act.titulo} ({act.grupos?.length || 0} grupos)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sección de Rúbrica de Evaluación */}
            <div className="p-3 bg-paper-sunken/60 rounded-xl border border-line space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-bold text-ink block text-xs flex items-center gap-1.5 cursor-pointer">
                    <Award className="w-4 h-4 text-accent" />
                    Rúbrica de Evaluación Pedagógica
                  </label>
                  <p className="text-[10px] text-ink-faint mt-0.5">
                    Define criterios específicos con puntajes parciales. El SpeedGrader permitirá calificar criterio por criterio.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={tieneRubricaTarea}
                    onChange={(e) => {
                      const activar = e.target.checked;
                      setTieneRubricaTarea(activar);
                      if (activar && criteriosRubricaTarea.length === 0) {
                        setCriteriosRubricaTarea([
                          { nombre: "Criterio 1", descripcion: "", puntajeMaximo: Math.round(puntajeMax / 2) || 50 },
                          { nombre: "Criterio 2", descripcion: "", puntajeMaximo: puntajeMax - (Math.round(puntajeMax / 2) || 50) },
                        ]);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-paper-sunken peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent border border-line"></div>
                </label>
              </div>

              {tieneRubricaTarea && (
                <div className="space-y-3 pt-2 border-t border-line">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-ink">Criterios definidos ({criteriosRubricaTarea.length})</span>
                    {(() => {
                      const suma = criteriosRubricaTarea.reduce((acc, c) => acc + (Number(c.puntajeMaximo) || 0), 0);
                      const excede = suma > Number(puntajeMax);
                      return (
                        <span className={`font-bold ${excede ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                          Total rúbrica: {suma} / {puntajeMax} pts {excede ? "⚠️ (Excede el máximo)" : ""}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                    {criteriosRubricaTarea.map((crit, idx) => (
                      <div key={idx} className="p-2.5 bg-paper rounded-xl border border-line space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            placeholder={`Nombre del criterio #${idx + 1}`}
                            value={crit.nombre}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCriteriosRubricaTarea((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, nombre: val } : c))
                              );
                            }}
                            className="flex-1 px-2.5 py-1.5 bg-paper-sunken border border-line rounded-lg text-xs text-ink focus:outline-none focus:border-accent"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min={1}
                              max={puntajeMax}
                              required
                              placeholder="Pts"
                              value={crit.puntajeMaximo}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setCriteriosRubricaTarea((prev) =>
                                  prev.map((c, i) => (i === idx ? { ...c, puntajeMaximo: val } : c))
                                );
                              }}
                              className="w-16 px-2 py-1.5 bg-paper-sunken border border-line rounded-lg text-xs font-bold text-center text-ink focus:outline-none focus:border-accent"
                            />
                            <span className="text-[10px] text-ink-faint font-semibold">pts</span>
                          </div>
                          {criteriosRubricaTarea.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setCriteriosRubricaTarea((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="p-1.5 text-ink-faint hover:text-rose-600 transition-colors"
                              title="Eliminar criterio"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Descripción u orientación de evaluación (opcional)..."
                          value={crit.descripcion || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCriteriosRubricaTarea((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, descripcion: val } : c))
                            );
                          }}
                          className="w-full px-2.5 py-1 bg-paper-sunken/60 border border-line rounded-lg text-[11px] text-ink-soft focus:outline-none focus:border-accent"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCriteriosRubricaTarea((prev) => [
                        ...prev,
                        { nombre: `Criterio #${prev.length + 1}`, descripcion: "", puntajeMaximo: 10 },
                      ]);
                    }}
                    className="w-full py-1.5 border border-dashed border-line hover:border-accent rounded-xl text-xs font-semibold text-ink-soft hover:text-accent flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Agregar Criterio a la Rúbrica
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => {
                  setShowCreateTareaModal(false);
                  setTareaEditing(null);
                  setEntregasTareaEditing([]);
                }}
                className="px-4 py-2 border border-line rounded-xl text-ink hover:bg-paper-sunken cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creandoTarea}
                className="px-4 py-2 bg-accent text-white rounded-xl font-semibold hover:bg-accent-dark disabled:opacity-50 cursor-pointer"
              >
                {creandoTarea
                  ? "Guardando..."
                  : tareaEditing
                  ? "Guardar Cambios de Tarea"
                  : "Publicar Tarea"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderModalHistorialVersiones = () => {
    if (!historialVersionesModal) return null;
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <div className="bg-paper border border-line rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-accent" />
              <h3 className="font-serif text-lg font-bold text-ink">Historial de Intentos de Entrega</h3>
            </div>
            <button
              type="button"
              onClick={() => setHistorialVersionesModal(null)}
              className="text-ink-faint hover:text-ink cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {historialVersionesModal.length === 0 ? (
              <p className="text-xs text-ink-faint text-center py-6">No hay versiones registradas para esta entrega.</p>
            ) : (
              historialVersionesModal.map((ver) => (
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
                      {new Date(ver.fechaEntrega).toLocaleString()}
                    </span>
                  </div>

                  {ver.nombreArchivo && (
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
              onClick={() => setHistorialVersionesModal(null)}
              className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-semibold hover:bg-accent-dark transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderModalRechazoLote = () => {
    if (!showRechazoLoteModal) return null;
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <div className="bg-paper border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="font-serif text-base font-bold text-ink">Rechazar Solicitudes en Lote</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowRechazoLoteModal(false);
                setMotivoRechazoLoteInput("");
              }}
              className="text-ink-faint hover:text-ink cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-ink-soft">
            Estás a punto de rechazar <strong>{selectedSolicitudesLote.length}</strong> solicitudes seleccionadas. Puedes indicar un motivo general opcional que los postulantes podrán visualizar.
          </p>

          <form onSubmit={handleRechazarLote} className="space-y-4">
            <div>
              <label className="font-semibold text-ink block text-xs mb-1">
                Motivo del Rechazo (Opcional)
              </label>
              <textarea
                rows={3}
                value={motivoRechazoLoteInput}
                onChange={(e) => setMotivoRechazoLoteInput(e.target.value)}
                placeholder="Ej. Cupos completados para este periodo o no cumple con los requisitos mínimos..."
                className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => {
                  setShowRechazoLoteModal(false);
                  setMotivoRechazoLoteInput("");
                }}
                className="px-4 py-2 border border-line rounded-xl text-xs text-ink hover:bg-paper-sunken cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={procesandoAdmision}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {procesandoAdmision ? "Procesando..." : `Confirmar Rechazo (${selectedSolicitudesLote.length})`}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

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
                    updateUrlParams({
                      entregas: null,
                      tarea: activeTareaDetalle?.id || null,
                      modulo: activeTareaDetalle?.moduloId || selectedModuloId || null,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-accent font-medium mb-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> {activeTareaDetalle ? "Volver a Detalle de Tarea" : "Volver a Convocatoria y Tareas"}
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  
                  {activeTareaParaEntregas.esGrupal && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-paper-sunken text-ink border border-line uppercase tracking-wider flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-ink-soft" /> Tarea Grupal
                    </span>
                  )}
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

              {/* Métricas / KPIs del aula en esta tarea (discretas y neutrales) */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                <div className="px-3 py-2 bg-paper-sunken border border-line rounded-xl text-center min-w-[80px]">
                  <span className="text-[10px] text-ink-faint uppercase font-semibold block">Inscritos</span>
                  <span className="text-base font-bold text-ink">{estudiantesAdmitidos.length}</span>
                </div>
                <div className="px-3 py-2 bg-paper-sunken border border-line rounded-xl text-center min-w-[80px]">
                  <span className="text-[10px] text-ink-faint uppercase font-semibold block">Entregas</span>
                  <span className="text-base font-bold text-ink">{entregasTareaActual.length}</span>
                </div>
                <div className="px-3 py-2 bg-paper-sunken border border-line rounded-xl text-center min-w-[80px]">
                  <span className="text-[10px] text-ink-faint uppercase font-semibold block">Por Calificar</span>
                  <span className="text-base font-bold text-amber-700 dark:text-amber-400">{totalEntregadas}</span>
                </div>
                <div className="px-3 py-2 bg-paper-sunken border border-line rounded-xl text-center min-w-[80px]">
                  <span className="text-[10px] text-ink-faint uppercase font-semibold block">Calificadas</span>
                  <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">{totalCalificadas}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleExportNotasTareaCSV(activeTareaParaEntregas.id, activeTareaParaEntregas.titulo)}
                  className="px-3.5 py-2.5 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs self-stretch sm:self-auto justify-center"
                  title="Exportar archivo CSV con las calificaciones de esta tarea"
                >
                  <Download className="w-4 h-4 text-accent" />
                  <span>Exportar CSV</span>
                </button>
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
                    <span className="text-[10px] text-ink-faint">Cargando...</span>
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
                        ? "bg-accent text-white"
                        : "bg-paper border border-line text-ink-soft hover:bg-paper-sunken"
                    }`}
                  >
                    Por Calificar ({totalEntregadas})
                  </button>
                  <button
                    onClick={() => setFiltroEntregasEstado("CALIFICADOS")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      filtroEntregasEstado === "CALIFICADOS"
                        ? "bg-accent text-white"
                        : "bg-paper border border-line text-ink-soft hover:bg-paper-sunken"
                    }`}
                  >
                    Calificadas ({totalCalificadas})
                  </button>
                  <button
                    onClick={() => setFiltroEntregasEstado("SIN_ENTREGA")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      filtroEntregasEstado === "SIN_ENTREGA"
                        ? "bg-accent text-white"
                        : "bg-paper border border-line text-ink-soft hover:bg-paper-sunken"
                    }`}
                  >
                    Sin Entrega ({Math.max(0, totalSinEntrega)})
                  </button>
                </div>

                {/* Barra de progreso de calificación */}
                <div className="space-y-1 pt-1 border-t border-line">
                  <div className="flex items-center justify-between text-[11px] text-ink-soft">
                    <span>Progreso:</span>
                    <strong className="text-ink">
                      {seguimientoTareaActual?.resumen
                        ? `${seguimientoTareaActual.resumen.calificados}/${seguimientoTareaActual.resumen.totalEstudiantes}`
                        : `${totalCalificadas}/${estudiantesAdmitidos.length}`} ({
                        estudiantesAdmitidos.length > 0
                          ? Math.round(
                              ((seguimientoTareaActual?.resumen.calificados ?? totalCalificadas) /
                                ((seguimientoTareaActual?.resumen.totalEstudiantes ?? estudiantesAdmitidos.length) || 1)) *
                                100
                            )
                          : 0
                      }%)
                    </strong>
                  </div>
                  <div className="w-full h-1.5 bg-paper-sunken border border-line rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          estudiantesAdmitidos.length > 0
                            ? Math.round(
                                ((seguimientoTareaActual?.resumen.calificados ?? totalCalificadas) /
                                  ((seguimientoTareaActual?.resumen.totalEstudiantes ?? estudiantesAdmitidos.length) || 1)) *
                                  100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
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
                            {(ent?.grupoNombre || est.nombreEquipo) && (
                              <span className="text-[10px] text-accent flex items-center gap-1 mt-0.5 truncate">
                                <Tag className="w-2.5 h-2.5 shrink-0" /> {ent?.grupoNombre || est.nombreEquipo}
                              </span>
                            )}
                            {(ent?.esGrupal || activeTareaParaEntregas.esGrupal) && ent?.entregadoPorNombre && (
                              <span className="text-[9px] text-ink-faint block truncate">
                                Envío: {ent.entregadoPorNombre}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Estado Badge del estudiante */}
                        <div className="shrink-0 text-right space-y-1">
                          {ent?.conRetraso && (
                            <span className="block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                              Con retraso
                            </span>
                          )}
                          {esCalificada ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                              {ent.calificacion}/{activeTareaParaEntregas.puntajeMaximo} pts
                            </span>
                          ) : esPendiente ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
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
                      {/* Banner de Entrega Grupal y Auditoría de Envío */}
                      {(activeTareaParaEntregas.esGrupal || selectedEntregaObj.esGrupal) && (
                        <div className="p-3 bg-paper border border-line rounded-xl space-y-1.5 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-ink flex items-center gap-1.5 text-xs">
                              <Users className="w-3.5 h-3.5 text-ink-soft" /> Entrega Grupal • Equipo {selectedEntregaObj.grupoNombre || selectedEstudianteObj.nombreEquipo || "Asignado"}
                            </span>
                            <span className="text-[11px] text-ink-soft">
                              Subido por: <strong className="text-ink font-medium">{selectedEntregaObj.entregadoPorNombre || selectedEstudianteObj.nombre}</strong>
                              {selectedEntregaObj.entregadoPorEmail && (
                                <span className="text-ink-faint"> ({selectedEntregaObj.entregadoPorEmail})</span>
                              )}
                            </span>
                          </div>
                          {selectedEntregaObj.companerosEquipo && selectedEntregaObj.companerosEquipo.length > 0 && (
                            <div className="text-[11px] text-ink-soft pt-1 border-t border-line">
                              <span className="font-medium text-ink">Integrantes: </span>
                              {selectedEntregaObj.companerosEquipo.join(" • ")}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-ink-faint">Fecha y Hora de Entrega</span>
                          <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            {new Date(selectedEntregaObj.fechaEntrega).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {activeTareaParaEntregas.updatedAt && new Date(selectedEntregaObj.fechaEntrega) < new Date(activeTareaParaEntregas.updatedAt) && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1"
                              title={`Entregado antes de la última edición de plazos del docente (${formatMoodleDate(activeTareaParaEntregas.updatedAt)})`}
                            >
                              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Previo a edición
                            </span>
                          )}
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
                        <div className="p-3.5 bg-paper rounded-xl border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-paper-sunken border border-line flex items-center justify-center shrink-0">
                              {renderArchivoIcon(selectedEntregaObj.nombreArchivo, "w-5 h-5")}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-ink block truncate">
                                {selectedEntregaObj.nombreArchivo}
                              </span>
                              <span className="text-[10px] text-ink-faint">
                                Archivo de entrega del estudiante
                                {selectedEntregaObj.intentos && selectedEntregaObj.intentos > 1
                                  ? ` • Intento #${selectedEntregaObj.intentos}`
                                  : ""}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const url = selectedEntregaObj.archivoUrl || selectedEntregaObj.nombreArchivo;
                                if (url) window.open(getMediaUrl(url), "_blank");
                              }}
                              disabled={!selectedEntregaObj.archivoUrl && !selectedEntregaObj.nombreArchivo}
                              className="px-3 py-1.5 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                              title="Abrir archivo en nueva pestaña"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-accent" /> Ver Archivo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const url = selectedEntregaObj.archivoUrl || selectedEntregaObj.nombreArchivo || "";
                                const nom = selectedEntregaObj.nombreArchivo || "entrega";
                                handleDescargarArchivoEntrega(url, nom);
                              }}
                              className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="Descargar archivo"
                            >
                              <Download className="w-3.5 h-3.5" /> Descargar
                            </button>
                            {selectedEntregaObj.intentos && selectedEntregaObj.intentos > 1 && (
                              <button
                                type="button"
                                onClick={() => handleVerHistorialVersiones(selectedEntregaObj.id)}
                                disabled={cargandoHistorial}
                                className="px-3 py-1.5 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Ver todos los intentos y versiones de entrega"
                              >
                                <History className="w-3.5 h-3.5 text-accent" />
                                {cargandoHistorial ? "Cargando..." : "Historial"}
                              </button>
                            )}
                          </div>
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
                    <div className="bg-paper border border-line rounded-2xl p-6 shadow-xs space-y-4">
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
                        {(activeTareaParaEntregas.esGrupal || selectedEntregaObj.esGrupal) && (
                          <div className="p-2.5 bg-accent/10 border border-accent/20 rounded-xl text-[11px] text-accent font-medium flex items-center gap-2">
                            <Users className="w-4 h-4 shrink-0" />
                            <span>
                              Evaluación en Equipo: La calificación y comentarios guardados se sincronizarán automáticamente para todos los integrantes de <strong>{selectedEntregaObj.grupoNombre || selectedEstudianteObj.nombreEquipo || "este equipo"}</strong>.
                            </span>
                          </div>
                        )}

                        {activeTareaParaEntregas.rubrica && activeTareaParaEntregas.rubrica.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between pb-1 border-b border-line">
                              <span className="font-bold text-ink text-xs">
                                Calificación por Criterios de Rúbrica
                              </span>
                              <span className="text-xs font-bold text-accent">
                                Total: {activeTareaParaEntregas.rubrica.reduce((acc, c) => acc + (Number(puntajesCriteriosInput[c.id]) || 0), 0)} / {activeTareaParaEntregas.puntajeMaximo} pts
                              </span>
                            </div>

                            <div className="space-y-3">
                              {activeTareaParaEntregas.rubrica.map((crit) => {
                                const val = puntajesCriteriosInput[crit.id] ?? 0;
                                return (
                                  <div key={crit.id} className="p-3 bg-paper-sunken border border-line rounded-xl space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <span className="font-bold text-ink text-xs block">{crit.nombre}</span>
                                        {crit.descripcion && (
                                          <p className="text-[11px] text-ink-soft leading-relaxed mt-0.5">{crit.descripcion}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <input
                                          type="number"
                                          min={0}
                                          max={crit.puntajeMaximo}
                                          step={0.5}
                                          value={val}
                                          onChange={(e) => {
                                            const num = Number(e.target.value);
                                            setPuntajesCriteriosInput((prev) => ({
                                              ...prev,
                                              [crit.id]: num,
                                            }));
                                          }}
                                          className="w-20 px-2.5 py-1.5 bg-paper border border-line rounded-lg text-ink font-bold text-sm text-center focus:outline-none focus:border-accent"
                                        />
                                        <span className="text-[11px] text-ink-faint font-semibold">
                                          / {crit.puntajeMaximo} pts
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
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
                        )}

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
          {/* Modales disponibles en SpeedGrader */}
          {renderModalSubirEntrega()}
          {renderModalCreateTarea()}
          {renderModalHistorialVersiones()}
        </div>
      </DashboardLayout>
    );
  }

  // ========================================================
  // PANTALLA DEDICADA DE TAREA ACADÉMICA ESTILO MOODLE (image.png)
  // ========================================================
  if (activeTareaDetalle && !activeTareaParaEntregas) {
    const miEntrega = activeTareaDetalle.miEntrega;
    const fechaLimite = activeTareaDetalle.fechaEntrega || activeTareaDetalle.fechaLimite;
    const tiempoRestante = calcularTiempoRestanteMoodle(fechaLimite, miEntrega?.fechaEntrega);

    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6 pb-16">
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

          {/* Navegación y Breadcrumbs estilo Moodle */}
          <div>
            <button
              onClick={() => {
                const modId = activeTareaDetalle.moduloId || selectedModuloId || null;
                setActiveTareaDetalle(null);
                setSelectedModuloId(modId);
                updateUrlParams({ tarea: null, modulo: modId });
              }}
              className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-accent font-medium mb-3 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {activeTareaDetalle.moduloTitulo
                ? `Volver al Módulo: ${activeTareaDetalle.moduloTitulo}`
                : "Volver a Convocatoria y Módulos"}
            </button>
            <div className="flex items-center gap-2 text-xs text-ink-faint">
              <span
                className="hover:text-accent cursor-pointer"
                onClick={() => {
                  setActiveTareaDetalle(null);
                  setSelectedModuloId(null);
                  updateUrlParams({ tarea: null, modulo: null });
                }}
              >
                {convocatoria.titulo}
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
              {activeTareaDetalle.moduloTitulo && (
                <>
                  <span
                    className="text-ink-soft hover:text-accent cursor-pointer"
                    onClick={() => {
                      const modId = activeTareaDetalle.moduloId || selectedModuloId || null;
                      setActiveTareaDetalle(null);
                      setSelectedModuloId(modId);
                      updateUrlParams({ tarea: null, modulo: modId });
                    }}
                  >
                    {activeTareaDetalle.moduloTitulo}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
              <span className="text-ink font-semibold truncate max-w-xs">{activeTareaDetalle.titulo}</span>
            </div>
          </div>

          {/* Encabezado Moodle idéntico a image.png */}
          <div className="bg-paper border border-line rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center shrink-0">
                  <FileUp className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-serif font-bold text-ink">
                      {activeTareaDetalle.titulo}
                    </h1>
                    {activeTareaDetalle.esGrupal && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Grupal
                      </span>
                    )}
                  </div>

                  {/* Apertura y Cierre debajo del título idéntico a image.png */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-y-1 gap-x-5 text-xs text-ink-soft pt-1">
                    <div>
                      <span className="font-semibold text-ink">Apertura: </span>
                      <span>{formatMoodleDate(activeTareaDetalle.fechaHabilitacion)}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-ink">Cierre: </span>
                      <span>{formatMoodleDate(fechaLimite)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Puntaje máximo y badge discreto de recepción */}
              <div className="flex sm:flex-col items-end gap-2 shrink-0">
                <span className="px-3 py-1 bg-paper-sunken border border-line rounded-xl text-xs font-bold text-ink">
                  {activeTareaDetalle.puntajeMaximo} puntos
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                    activeTareaDetalle.habilitada
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                      : "bg-paper-sunken text-ink-faint border border-line"
                  }`}
                >
                  {activeTareaDetalle.habilitada ? "Abierta" : "Cerrada"}
                </span>
              </div>
            </div>

            {/* Descripción / Instrucciones de la tarea */}
            {activeTareaDetalle.descripcion && (
              <div className="pt-3 border-t border-line-soft">
                <p className="text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-line">
                  {activeTareaDetalle.descripcion}
                </p>
              </div>
            )}

            {/* Parámetros de entrega */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-ink-soft border-t border-line-soft">
              <span><strong>Formatos permitidos:</strong> {activeTareaDetalle.tiposArchivosPermitidos || "*"}</span>
              <span>•</span>
              <span><strong>Tamaño máximo:</strong> {activeTareaDetalle.tamanoMaximoMb || 10} MB</span>
              {activeTareaDetalle.fechaCorte && (
                <>
                  <span>•</span>
                  <span className="text-rose-700 dark:text-rose-300">
                    <strong>Límite estricto de corte:</strong> {formatMoodleDate(activeTareaDetalle.fechaCorte)}
                  </span>
                </>
              )}
            </div>

            {/* Rúbrica de evaluación pedagógica si aplica */}
            {activeTareaDetalle.rubrica && activeTareaDetalle.rubrica.length > 0 && (
              <div className="pt-3 border-t border-line-soft space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-accent" /> Rúbrica de Evaluación ({activeTareaDetalle.rubrica.length} criterios)
                  </h4>
                  <span className="text-[11px] font-semibold text-accent">
                    Total: {activeTareaDetalle.rubrica.reduce((acc, c) => acc + (c.puntajeMaximo || 0), 0)} pts
                  </span>
                </div>
                <div className="border border-line rounded-xl overflow-hidden bg-paper">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-paper-sunken border-b border-line text-[10px] text-ink-faint uppercase font-bold">
                      <tr>
                        <th className="py-2.5 px-3.5">Criterio</th>
                        <th className="py-2.5 px-3.5">Descripción u Orientaciones</th>
                        <th className="py-2.5 px-3.5 text-right">Puntaje Máximo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-ink">
                      {activeTareaDetalle.rubrica.map((crit) => (
                        <tr key={crit.id || crit.orden} className="hover:bg-paper-sunken/40">
                          <td className="py-2.5 px-3.5 font-bold text-ink">{crit.nombre}</td>
                          <td className="py-2.5 px-3.5 text-ink-soft text-[11px] leading-relaxed">
                            {crit.descripcion || <span className="text-ink-faint italic">-</span>}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-bold text-accent whitespace-nowrap">
                            {crit.puntajeMaximo} pts
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Sumario de Calificaciones para Docentes / Jurados */}
          {(puedeGestionarTareas || esJuradoEnEstaArea) && (
            <div className="bg-paper border border-line rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-serif font-bold text-ink">
                  Sumario de calificaciones
                </h2>
                {puedeGestionarTareas && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleAbrirEditarTarea(activeTareaDetalle)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-line bg-paper-sunken hover:bg-paper text-ink flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Editar información, plazos y restricciones de la tarea"
                    >
                      <Pencil className="w-3.5 h-3.5 text-accent" />
                      Editar Tarea
                    </button>
                    <button
                      onClick={() => handleToggleHabilitar(activeTareaDetalle.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                        activeTareaDetalle.habilitada
                          ? "bg-paper-sunken border-line text-ink hover:bg-paper"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      {activeTareaDetalle.habilitada ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      {activeTareaDetalle.habilitada ? "Cerrar Recepción" : "Habilitar Recepción"}
                    </button>
                  </div>
                )}
              </div>

              <div className="border border-line rounded-xl overflow-hidden bg-paper shadow-2xs divide-y divide-line text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3">
                  <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                    Participantes
                  </div>
                  <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
                    {estudiantesAdmitidos.length}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3">
                  <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                    Enviados
                  </div>
                  <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper font-medium">
                    {activeTareaDetalle.totalEntregas || 0}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3">
                  <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                    Fecha de entrega
                  </div>
                  <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
                    {formatMoodleDate(fechaLimite)}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3">
                  <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                    Tiempo restante
                  </div>
                  <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
                    {calcularTiempoRestanteMoodle(fechaLimite).texto}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleVerEntregas(activeTareaDetalle)}
                  className="px-5 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4" /> Ver / Calificar todas las entregas
                </button>
              </div>
            </div>
          )}

          {/* Tabla de "Estado de la entrega" idéntica a image.png */}
          <div className="bg-paper border border-line rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-serif font-bold text-ink">
              Estado de la entrega
            </h2>

            {/* Aviso de Entrega Protegida Previa a la Edición del Docente */}
            {miEntrega && activeTareaDetalle.updatedAt && new Date(miEntrega.fechaEntrega) < new Date(activeTareaDetalle.updatedAt) && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-200 shadow-2xs">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-emerald-900 dark:text-emerald-100">
                    Tu entrega se encuentra registrada y resguardada
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                    Tu trabajo fue enviado exitosamente el <strong>{formatMoodleDate(miEntrega.fechaEntrega)}</strong> con anterioridad a la última modificación de plazos o parámetros del docente ({formatMoodleDate(activeTareaDetalle.updatedAt)}). Tu entrega se mantiene formalmente archivada y válida sin requerir ninguna acción adicional.
                  </p>
                </div>
              </div>
            )}

            <div className="border border-line rounded-xl overflow-hidden bg-paper shadow-2xs divide-y divide-line text-xs sm:text-sm">
              {/* Estado de la entrega */}
              <div className="grid grid-cols-1 sm:grid-cols-3">
                <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                  Estado de la entrega
                </div>
                <div
                  className={`sm:col-span-2 p-3 sm:px-4 font-medium flex items-center justify-between flex-wrap gap-2 ${
                    miEntrega
                      ? "bg-accent-soft text-accent-dark"
                      : "text-ink-soft bg-paper"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>
                      {miEntrega
                        ? miEntrega.conRetraso
                          ? "Enviado para calificar (con retraso)"
                          : "Enviado para calificar"
                        : "No entregado"}
                    </span>
                    {miEntrega?.intentos && miEntrega.intentos > 1 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-paper border border-line font-bold text-ink">
                        Intento #{miEntrega.intentos}
                      </span>
                    )}
                  </div>
                  {miEntrega && miEntrega.intentos && miEntrega.intentos > 1 && (
                    <button
                      type="button"
                      onClick={() => handleVerHistorialVersiones(miEntrega.id)}
                      className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" /> Ver historial
                    </button>
                  )}
                </div>
              </div>

              {/* Estado de la calificación */}
              <div className="grid grid-cols-1 sm:grid-cols-3">
                <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                  Estado de la calificación
                </div>
                <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
                  {miEntrega?.estado === "CALIFICADO" ? (
                    <div className="space-y-1.5">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300 block">
                        Calificado ({miEntrega.calificacion} / {activeTareaDetalle.puntajeMaximo} pts)
                      </span>
                      {miEntrega.puntajesCriterios && miEntrega.puntajesCriterios.length > 0 && (
                        <div className="pt-1 border-t border-line space-y-1">
                          {miEntrega.puntajesCriterios.map((pc) => (
                            <div key={pc.criterioId} className="flex items-center justify-between text-[11px] text-ink-soft">
                              <span>• {pc.nombre}:</span>
                              <strong className="text-ink">{pc.puntaje} / {pc.puntajeMaximo} pts</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    "Sin calificar"
                  )}
                </div>
              </div>

              {/* Fecha de entrega */}
              <div className="grid grid-cols-1 sm:grid-cols-3">
                <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                  Fecha de entrega
                </div>
                <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
                  {formatMoodleDate(fechaLimite)}
                </div>
              </div>

              {/* Tiempo restante */}
              <div className="grid grid-cols-1 sm:grid-cols-3">
                <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                  Tiempo restante
                </div>
                <div
                  className={`sm:col-span-2 p-3 sm:px-4 font-medium ${
                    tiempoRestante.temprano
                      ? "bg-accent-soft text-accent-dark"
                      : tiempoRestante.retraso
                      ? "text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/20"
                      : "text-ink-soft bg-paper"
                  }`}
                >
                  {tiempoRestante.texto}
                </div>
              </div>

              {/* Última modificación */}
              <div className="grid grid-cols-1 sm:grid-cols-3">
                <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                  Última modificación
                </div>
                <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper flex items-center gap-2 flex-wrap">
                  <span>{miEntrega ? formatMoodleDate(miEntrega.fechaEntrega) : "-"}</span>
                  {miEntrega && activeTareaDetalle.updatedAt && new Date(miEntrega.fechaEntrega) < new Date(activeTareaDetalle.updatedAt) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      Entregado antes de la última edición
                    </span>
                  )}
                </div>
              </div>

              {/* Archivos enviados */}
              <div className="grid grid-cols-1 sm:grid-cols-3">
                <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                  Archivos enviados
                </div>
                <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
                  {miEntrega?.nombreArchivo ? (
                    <div className="flex items-center gap-2">
                      {renderArchivoIcon(miEntrega.nombreArchivo, "w-4 h-4 text-ink-faint shrink-0")}
                      {miEntrega.archivoUrl ? (
                        <a
                          href={getMediaUrl(miEntrega.archivoUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline font-medium inline-flex items-center gap-1.5"
                        >
                          {miEntrega.nombreArchivo}
                          <Download className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      ) : (
                        <span className="font-medium text-ink">{miEntrega.nombreArchivo}</span>
                      )}
                    </div>
                  ) : (
                    <span>-</span>
                  )}

                  {miEntrega?.documentoId && (
                    <div className="mt-1.5 flex items-center gap-2 text-xs">
                      <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                      <Link
                        href={`/dashboard/documentos/${miEntrega.documentoId}`}
                        target="_blank"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        {miEntrega.documentoTitulo || `Documento #${miEntrega.documentoId}`}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Fila Grupal si aplica */}
              {(activeTareaDetalle.esGrupal || miEntrega?.esGrupal) && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3">
                    <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                      Equipo / Grupo
                    </div>
                    <div className="sm:col-span-2 p-3 sm:px-4 text-ink bg-paper font-medium">
                      {miEntrega?.grupoNombre || miParticipacion?.nombreEquipo || "Sin equipo asignado"}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3">
                    <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                      Subido por
                    </div>
                    <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
                      {miEntrega ? (
                        miEntrega.esMiEntregaPropia ? (
                          <span className="font-semibold text-ink">Tú ({user?.nombre} {user?.apellido})</span>
                        ) : (
                          <span className="font-semibold text-ink">{miEntrega.entregadoPorNombre}</span>
                        )
                      ) : (
                        "-"
                      )}
                    </div>
                  </div>
                  {miEntrega?.companerosEquipo && miEntrega.companerosEquipo.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3">
                      <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                        Integrantes del equipo
                      </div>
                      <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
                        {miEntrega.companerosEquipo.join(", ")}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Comentarios de la entrega */}
              <div className="grid grid-cols-1 sm:grid-cols-3">
                <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                  Comentarios de la entrega
                </div>
                <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
                  {miEntrega?.comentarioEstudiante ? (
                    <span className="italic">&ldquo;{miEntrega.comentarioEstudiante}&rdquo;</span>
                  ) : (
                    "Comentarios (0)"
                  )}
                </div>
              </div>
            </div>

            {/* Botón de Agregar / Modificar Entrega */}
            <div className="pt-3 flex flex-col items-center justify-center text-center space-y-2">
              {activeTareaDetalle.habilitada && activeTareaDetalle.estadoMoodle !== "CERRADA_CORTE" ? (
                <button
                  onClick={() => handleAbrirEntregaModal(activeTareaDetalle)}
                  className="px-8 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
                >
                  {miEntrega ? "Modificar entrega" : "Agregar entrega"}
                </button>
              ) : (
                <div className="p-3 bg-paper-sunken border border-line rounded-xl text-xs text-ink-faint">
                  Esta tarea ya no acepta entregas debido a que se encuentra cerrada.
                </div>
              )}
            </div>
          </div>

          {/* Sección de Retroalimentación Docente (si ya fue calificada) */}
          {miEntrega?.estado === "CALIFICADO" && (
            <div className="bg-paper border border-line rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base sm:text-lg font-serif font-bold text-ink">
                Retroalimentación
              </h2>
              <div className="border border-line rounded-xl overflow-hidden bg-paper shadow-2xs divide-y divide-line text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3">
                  <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                    Calificación
                  </div>
                  <div className="sm:col-span-2 p-3 sm:px-4 font-bold text-accent bg-paper text-sm">
                    {miEntrega.calificacion?.toFixed(2)} / {activeTareaDetalle.puntajeMaximo?.toFixed(2)}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3">
                  <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                    Calificado el
                  </div>
                  <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
                    {formatMoodleDate(miEntrega.fechaCalificacion || miEntrega.fechaEntrega)}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3">
                  <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                    Calificado por
                  </div>
                  <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper font-medium">
                    {miEntrega.calificadoPorNombre || "Docente / Evaluador"}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3">
                  <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                    Comentarios de retroalimentación
                  </div>
                  <div className="sm:col-span-2 p-3 sm:px-4 text-ink bg-paper leading-relaxed whitespace-pre-line">
                    {miEntrega.retroalimentacion || "Sin comentarios adicionales."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modales disponibles en la vista detallada de la tarea */}
          {renderModalSubirEntrega()}
          {renderModalCreateTarea()}
          {renderModalModulo()}
          {renderModalHistorialVersiones()}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-16">
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
                        <span className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30 flex items-center gap-1.5 shadow-xs">
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
                    {esEstudianteRechazado && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold border border-rose-500/30 flex items-center gap-1.5 shadow-xs">
                          <XCircle className="w-3.5 h-3.5" /> Postulación Rechazada
                        </span>
                        <button
                          onClick={() => setShowInscripcionModal(true)}
                          className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Volver a Postular
                        </button>
                      </div>
                    )}
                    {!esEstudianteInscrito && !esEstudiantePendiente && !esEstudianteRechazado && (
                      <button
                        onClick={() => setShowInscripcionModal(true)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
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

            {/* Barra de Progreso Global del Aula (para Estudiante matriculado) */}
            {user?.rol === "ESTUDIANTE" && esEstudianteInscrito && tareas.length > 0 && (
              <div className="mt-4 p-3 bg-paper-sunken/60 border border-line rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-ink">Tu avance global en el aula</span>
                    <p className="text-[11px] text-ink-soft">
                      Has completado {tareas.filter((t) => !!t.miEntrega).length} de {tareas.length} tareas programadas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:w-52">
                  <div className="flex-1 h-2 bg-paper border border-line rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round((tareas.filter((t) => !!t.miEntrega).length / tareas.length) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300 shrink-0">
                    {Math.round((tareas.filter((t) => !!t.miEntrega).length / tareas.length) * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* Selector de Pestañas tipo Moodle */}
            <div className="flex border-b border-line mt-6 -mb-6 -mx-6 sm:-mx-8 px-6 sm:px-8 gap-6 text-xs font-semibold">
              <button
                onClick={() => handleCambiarTab("tareas")}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === "tareas"
                    ? "border-accent text-accent"
                    : "border-transparent text-ink-faint hover:text-ink"
                }`}
              >
                <FolderKanban className="w-4 h-4" /> Módulos &amp; Tareas ({modulos.length > 0 ? `${modulos.length} Módulos` : `${tareas.length} Tareas`})
              </button>

              <button
                onClick={() => handleCambiarTab("grupos")}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === "grupos"
                    ? "border-accent text-accent"
                    : "border-transparent text-ink-faint hover:text-ink"
                }`}
              >
                <Users className="w-4 h-4" /> Grupos &amp; Equipos ({gruposArea.length})
                {totalSinEquipoArea > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                    {totalSinEquipoArea} sin equipo
                  </span>
                )}
              </button>

              <button
                onClick={() => handleCambiarTab("participantes")}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === "participantes"
                    ? "border-accent text-accent"
                    : "border-transparent text-ink-faint hover:text-ink"
                }`}
              >
                <Users className="w-4 h-4" /> Participantes ({participantes.length})
              </button>

              <button
                onClick={() => handleCambiarTab("calificaciones")}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === "calificaciones"
                    ? "border-accent text-accent"
                    : "border-transparent text-ink-faint hover:text-ink"
                }`}
              >
                <Award className="w-4 h-4" /> Calificaciones
              </button>

              <button
                onClick={() => handleCambiarTab("info")}
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
                {esEstudianteRechazado ? (
                  <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                ) : (
                  <Lock className="w-10 h-10 text-ink-faint mx-auto" />
                )}
                <h3 className="text-base font-serif font-bold text-ink">
                  {esEstudiantePendiente
                    ? "Solicitud de admisión en revisión"
                    : esEstudianteRechazado
                    ? "Postulación no admitida"
                    : "Tareas reservadas para estudiantes admitidos"}
                </h3>
                <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
                  {esEstudiantePendiente
                    ? "Tu postulación a esta convocatoria se encuentra actualmente en revisión por el docente o administrador. Tan pronto como seas admitido, tendrás acceso a los módulos, tareas y evaluaciones."
                    : esEstudianteRechazado
                    ? miParticipacion?.motivoRechazo
                      ? `Motivo indicado por el docente: "${miParticipacion.motivoRechazo}". Puedes enviar una nueva solicitud si has subsanado las observaciones.`
                      : "Tu postulación a esta área no fue aprobada por el docente o administrador. Puedes enviar una nueva postulación si lo deseas."
                    : "Debes solicitar tu inscripción al área y esperar la admisión del docente encargado para acceder a los módulos y tareas del aula virtual."}
                </p>
                {esEstudiantePendiente && (
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <span className="text-xs px-3.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30 flex items-center gap-1.5 shadow-xs">
                      <Clock className="w-4 h-4" /> En espera de respuesta del docente encargado
                    </span>
                    <button
                      onClick={handleDeclinarSolicitudPropia}
                      className="px-3.5 py-1.5 bg-danger-soft/20 text-danger hover:bg-danger-soft/40 rounded-xl text-xs font-semibold border border-danger/30 transition-all cursor-pointer"
                    >
                      Declinar Solicitud
                    </button>
                  </div>
                )}
                {esEstudianteRechazado && (
                  <div className="pt-2 flex items-center justify-center">
                    <button
                      onClick={() => setShowInscripcionModal(true)}
                      className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" /> Volver a Postular
                    </button>
                  </div>
                )}
                {!esEstudiantePendiente && !esEstudianteRechazado && (
                  <div className="pt-2 flex items-center justify-center">
                    <button
                      onClick={() => setShowInscripcionModal(true)}
                      className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" /> Solicitar Inscripción al Área
                    </button>
                  </div>
                )}
              </div>
            ) : selectedModuloId === null ? (
              /* ==================================================== */
              /* SUBVISTA 1.A: GRID DE MÓDULOS + TAREAS GENERALES     */
              /* ==================================================== */
              <div className="space-y-6">
                {/* Banner de Actividades de Selección de Grupo (Moodle Choice) en el flujo del aula */}
                {actividadesGrupo.length > 0 && (
                  <div className="space-y-3">
                    {actividadesGrupo.map((act) => (
                      <div
                        key={act.id}
                        className="bg-paper border border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-500/5 via-paper to-paper hover:border-purple-500/50 transition-all"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                            <Users className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                                Actividad de Selección de Grupo
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                  act.abierta
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                                }`}
                              >
                                {act.abierta ? "Abierta" : "Cerrada"}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-ink font-serif">
                              {act.titulo}
                            </h4>
                            <p className="text-[11px] text-ink-soft">
                              {act.grupoSeleccionadoNombre ? (
                                <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                                  ✓ Estás registrado en: <u>{act.grupoSeleccionadoNombre}</u>
                                </span>
                              ) : (
                                <span>Cupos limitados por grupo. Cierra el {formatMoodleDate(act.fechaCierre)}.</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setActividadActiva(act);
                            setSelectedGrupoRadioId(act.grupoSeleccionadoId || null);
                            handleCambiarTab("grupos");
                          }}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-2xs justify-center"
                        >
                          {act.grupoSeleccionadoNombre ? "Ver / Modificar Elección" : "Seleccionar Grupo"} <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

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

                              {/* Indicadores y Barra de Progreso del Módulo */}
                              <div className="pt-2 space-y-1.5 text-xs text-ink-soft">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1 font-medium">
                                    <FileText className="w-3.5 h-3.5 text-accent" />
                                    {tareasDelMod.length} {tareasDelMod.length === 1 ? "tarea" : "tareas"}
                                  </span>
                                  {tareasDelMod.length > 0 && (
                                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                      {user?.rol === "ESTUDIANTE"
                                        ? `${entregadasDelMod}/${tareasDelMod.length} entregadas`
                                        : `${Math.round((tareasDelMod.filter((t) => (t.totalEntregas || 0) > 0).length / tareasDelMod.length) * 100)}% activas`}
                                    </span>
                                  )}
                                </div>
                                {tareasDelMod.length > 0 && (
                                  <div className="h-1.5 w-full bg-paper-sunken border border-line rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                      style={{
                                        width: `${
                                          user?.rol === "ESTUDIANTE"
                                            ? Math.round((entregadasDelMod / tareasDelMod.length) * 100)
                                            : Math.round(
                                                (tareasDelMod.filter((t) => (t.totalEntregas || 0) > 0).length /
                                                  tareasDelMod.length) *
                                                  100
                                              )
                                        }%`,
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Footer con acciones */}
                          <div className="p-4 pt-0 border-t border-line-soft mt-3 flex items-center justify-between gap-2">
                            <button
                              onClick={() => {
                                setSelectedModuloId(mod.id);
                                updateUrlParams({ modulo: mod.id });
                              }}
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
                            onClick={() => {
                              setActiveTareaDetalle(t);
                              updateUrlParams({ tarea: t.id, modulo: t.moduloId || null });
                            }}
                            className="bg-paper hover:bg-paper-sunken/60 border border-line rounded-xl p-3.5 sm:p-4 transition-all flex items-center justify-between gap-3.5 cursor-pointer group shadow-2xs"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <FileUp className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-ink font-serif group-hover:text-accent transition-colors truncate">
                                    {t.titulo}
                                  </h4>
                                  {t.esGrupal && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                      Grupal
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-ink-soft flex items-center gap-2 flex-wrap">
                                  <span>Vence: {formatMoodleDateShort(t.fechaEntrega || t.fechaLimite)}</span>
                                  <span>•</span>
                                  <span>{t.puntajeMaximo} pts</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {user?.rol === "ESTUDIANTE" ? (
                                t.miEntrega?.estado === "CALIFICADO" ? (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                    ✓ Calificado ({t.miEntrega.calificacion}/{t.puntajeMaximo})
                                  </span>
                                ) : t.miEntrega ? (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                    ✓ Enviado
                                  </span>
                                ) : !t.habilitada || t.estadoMoodle === "CERRADA_CORTE" ? (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-paper-sunken text-ink-faint border border-line">
                                    No entregado
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                    Pendiente
                                  </span>
                                )
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-ink-soft hidden sm:inline">
                                    {t.totalEntregas || 0} {t.totalEntregas === 1 ? "entrega" : "entregas"}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                      t.habilitada
                                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                        : "bg-paper-sunken text-ink-faint border border-line"
                                    }`}
                                  >
                                    {t.habilitada ? "Abierta" : "Cerrada"}
                                  </span>
                                  {puedeGestionarTareas && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAbrirEditarTarea(t);
                                      }}
                                      title="Editar tarea (plazos, restricciones y detalles)"
                                      className="p-1 text-ink-soft hover:text-accent hover:bg-paper-sunken rounded-lg border border-line transition-colors cursor-pointer"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                              <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-accent transition-colors" />
                            </div>
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
                        onClick={() => {
                          setSelectedModuloId(null);
                          updateUrlParams({ modulo: null });
                        }}
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
                          onClick={() => {
                            setSelectedModuloId(null);
                            updateUrlParams({ modulo: null });
                          }}
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

                    {/* Actividades de Selección de Grupo asociadas a este Módulo */}
                    {actividadesGrupo.filter((a) => a.moduloId === moduloActual.id).length > 0 && (
                      <div className="space-y-3">
                        {actividadesGrupo
                          .filter((a) => a.moduloId === moduloActual.id)
                          .map((act) => (
                            <div
                              key={act.id}
                              className="bg-paper border border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-500/5 via-paper to-paper hover:border-purple-500/50 transition-all"
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                                  <Users className="w-5 h-5" />
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                                      Actividad de Selección de Grupo
                                    </span>
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                        act.abierta
                                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                          : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                                      }`}
                                    >
                                      {act.abierta ? "Abierta" : "Cerrada"}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-bold text-ink font-serif">
                                    {act.titulo}
                                  </h4>
                                  <p className="text-[11px] text-ink-soft">
                                    {act.grupoSeleccionadoNombre ? (
                                      <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                                        ✓ Estás registrado en: <u>{act.grupoSeleccionadoNombre}</u>
                                      </span>
                                    ) : (
                                      <span>Cupos limitados por grupo. Cierra el {formatMoodleDate(act.fechaCierre)}.</span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setActividadActiva(act);
                                  setSelectedGrupoRadioId(act.grupoSeleccionadoId || null);
                                  handleCambiarTab("grupos");
                                }}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-2xs justify-center"
                              >
                                {act.grupoSeleccionadoNombre ? "Ver / Modificar Elección" : "Seleccionar Grupo"} <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Progreso del Estudiante en este Módulo */}
                    {user?.rol === "ESTUDIANTE" && tareasDelModulo.length > 0 && (
                      <div className="bg-paper border border-line rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-xs font-semibold text-ink">
                            Progreso en Módulo #{moduloActual.orden}:{" "}
                            <strong>
                              {tareasDelModulo.filter((t) => !!t.miEntrega).length} de {tareasDelModulo.length} entregadas
                            </strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-3 sm:w-48">
                          <div className="flex-1 h-2 bg-paper-sunken border border-line rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.round(
                                  (tareasDelModulo.filter((t) => !!t.miEntrega).length / tareasDelModulo.length) * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                            {Math.round(
                              (tareasDelModulo.filter((t) => !!t.miEntrega).length / tareasDelModulo.length) * 100
                            )}
                            %
                          </span>
                        </div>
                      </div>
                    )}

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
                              onClick={() => {
                                setActiveTareaDetalle(t);
                                updateUrlParams({ tarea: t.id, modulo: t.moduloId || selectedModuloId || null });
                              }}
                              className="bg-paper hover:bg-paper-sunken/60 border border-line rounded-xl p-3.5 sm:p-4 transition-all flex items-center justify-between gap-3.5 cursor-pointer group shadow-2xs"
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                  <FileUp className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-bold text-ink font-serif group-hover:text-accent transition-colors truncate">
                                      {t.titulo}
                                    </h4>
                                    {t.esGrupal && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                        Grupal
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-ink-soft flex items-center gap-2 flex-wrap">
                                    <span>Vence: {formatMoodleDateShort(t.fechaEntrega || t.fechaLimite)}</span>
                                    <span>•</span>
                                    <span>{t.puntajeMaximo} pts</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {user?.rol === "ESTUDIANTE" ? (
                                  t.miEntrega?.estado === "CALIFICADO" ? (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                      ✓ Calificado ({t.miEntrega.calificacion}/{t.puntajeMaximo})
                                    </span>
                                  ) : t.miEntrega ? (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                      ✓ Enviado
                                    </span>
                                  ) : !t.habilitada || t.estadoMoodle === "CERRADA_CORTE" ? (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-paper-sunken text-ink-faint border border-line">
                                      No entregado
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                      Pendiente
                                    </span>
                                  )
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-ink-soft hidden sm:inline">
                                      {t.totalEntregas || 0} {t.totalEntregas === 1 ? "entrega" : "entregas"}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                        t.habilitada
                                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                          : "bg-paper-sunken text-ink-faint border border-line"
                                      }`}
                                    >
                                      {t.habilitada ? "Abierta" : "Cerrada"}
                                    </span>
                                    {puedeGestionarTareas && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAbrirEditarTarea(t);
                                        }}
                                        title="Editar tarea (plazos, restricciones y detalles)"
                                        className="p-1 text-ink-soft hover:text-accent hover:bg-paper-sunken rounded-lg border border-line transition-colors cursor-pointer"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                                <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-accent transition-colors" />
                              </div>
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
        {/* PESTAÑA: GRUPOS Y SELECCIÓN MOODLE                   */}
        {/* ==================================================== */}
        {activeTab === "grupos" && (
          <div className="space-y-6">
            {user?.rol === "ESTUDIANTE" && !esEstudianteInscrito && convocatoria.estado !== "FINALIZADA" ? (
              <div className="bg-paper border border-line rounded-2xl p-12 text-center space-y-3 shadow-xs">
                <Lock className="w-10 h-10 text-ink-faint mx-auto" />
                <h3 className="text-base font-serif font-bold text-ink">
                  Acceso a Grupos y Equipos Reservado
                </h3>
                <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
                  Para participar en la selección o asignación de grupos debes estar formalmente admitido por el docente en esta área.
                </p>
                {esEstudiantePendiente && (
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      <Clock className="w-3.5 h-3.5" /> Tu postulación está siendo revisada por el docente
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Resumen de Métricas de Grupos */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-paper border border-line rounded-2xl p-4 space-y-1 shadow-2xs">
                    <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider block">
                      Total Grupos
                    </span>
                    <b className="text-xl font-bold text-ink">{gruposArea.length}</b>
                    <span className="text-[10px] text-ink-soft block">Grupos configurados</span>
                  </div>

                  <div className="bg-paper border border-line rounded-2xl p-4 space-y-1 shadow-2xs">
                    <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider block">
                      Estudiantes en Aula
                    </span>
                    <b className="text-xl font-bold text-blue-600">{totalEstudiantesArea}</b>
                    <span className="text-[10px] text-ink-soft block">Admitidos oficialmente</span>
                  </div>

                  <div className="bg-paper border border-line rounded-2xl p-4 space-y-1 shadow-2xs">
                    <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider block">
                      Con Equipo
                    </span>
                    <b className="text-xl font-bold text-emerald-600">{totalConEquipoArea}</b>
                    <span className="text-[10px] text-ink-soft block">
                      {totalEstudiantesArea > 0 ? `${Math.round((totalConEquipoArea / totalEstudiantesArea) * 100)}% asignados` : "0%"}
                    </span>
                  </div>

                  <div className="bg-paper border border-line rounded-2xl p-4 space-y-1 shadow-2xs">
                    <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider block">
                      Sin Equipo
                    </span>
                    <b className={`text-xl font-bold ${totalSinEquipoArea > 0 ? "text-amber-600" : "text-ink"}`}>
                      {totalSinEquipoArea}
                    </b>
                    <span className="text-[10px] text-ink-soft block">
                      {totalSinEquipoArea > 0 ? "Requieren asignación" : "Todos tienen grupo"}
                    </span>
                  </div>
                </div>

                {/* Selector destacado de Actividades de Elección de Grupo si hay múltiples */}
                {actividadesGrupo.length > 1 && (
                  <div className="bg-paper border border-line rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="text-xs font-bold text-ink uppercase tracking-wider">
                          Actividades de Elección de Grupo Disponibles ({actividadesGrupo.length})
                        </span>
                      </div>
                      <span className="text-[11px] text-ink-faint">
                        Haz clic en una actividad para gestionar tu equipo en ella
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {actividadesGrupo.map((act) => {
                        const isCurrent = actividadActiva?.id === act.id;
                        return (
                          <button
                            key={act.id}
                            onClick={() => {
                              setActividadActiva(act);
                              setSelectedGrupoRadioId(act.grupoSeleccionadoId || null);
                            }}
                            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isCurrent
                                ? "bg-purple-500/10 border-purple-500/50 shadow-xs ring-2 ring-purple-500/20"
                                : "bg-paper-sunken/40 hover:bg-paper-sunken border-line text-ink"
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                    act.abierta
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                      : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                  }`}
                                >
                                  {act.abierta ? "Abierta" : "Cerrada"}
                                </span>
                                <h4
                                  className={`text-xs font-bold ${
                                    isCurrent ? "text-purple-700 dark:text-purple-300 font-serif" : "text-ink"
                                  }`}
                                >
                                  {act.titulo}
                                </h4>
                              </div>
                              <p className="text-[11px] text-ink-soft">
                                {act.grupoSeleccionadoNombre ? (
                                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                                    ✓ Tu grupo: <u>{act.grupoSeleccionadoNombre}</u>
                                  </span>
                                ) : (
                                  <span className="text-amber-700 dark:text-amber-300">
                                    Aún no has seleccionado grupo
                                  </span>
                                )}
                              </p>
                            </div>

                            <span
                              className={`text-xs px-2.5 py-1 rounded-lg font-semibold shrink-0 ${
                                isCurrent
                                  ? "bg-purple-600 text-white shadow-2xs"
                                  : "bg-paper border border-line text-ink-soft"
                              }`}
                            >
                              {isCurrent ? "Activa" : "Abrir"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* SECCIÓN 1: ACTIVIDAD DE SELECCIÓN DE GRUPO (MOODLE CHOICE) */}
                {/* ========================================================= */}
                {actividadActiva ? (
                  <div className="bg-paper border border-line rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
                    {/* Encabezado Moodle con Icono Púrpura */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-line pb-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400">
                          <Users className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                              Actividad Moodle Choice
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                actividadActiva.abierta
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                              }`}
                            >
                              {actividadActiva.abierta ? "Abierta para Registro" : "Actividad Cerrada"}
                            </span>
                            {!actividadActiva.permitirCambio && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                Sin cambios de grupo
                              </span>
                            )}
                            {!actividadActiva.mostrarMiembros && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                Miembros ocultos
                              </span>
                            )}
                          </div>
                          <h2 className="text-xl sm:text-2xl font-bold font-serif text-ink">
                            {actividadActiva.titulo}
                          </h2>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-ink-soft pt-1">
                            <span className="flex items-center gap-1 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-ink-faint" />
                              <b>Abierto:</b> {formatMoodleDate(actividadActiva.fechaApertura)}
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3.5 h-3.5 text-ink-faint" />
                              <b>Cierra:</b> {formatMoodleDate(actividadActiva.fechaCierre)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {puedeGestionarTareas && (
                          <button
                            type="button"
                            onClick={() => handleAbrirEditarActividad(actividadActiva)}
                            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                            title="Editar plazos de apertura/cierre y configuración de la actividad"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar Plazos y Reglas
                          </button>
                        )}

                        {/* Selector si hay múltiples actividades de grupo */}
                        {actividadesGrupo.length > 1 && (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-ink-faint">Actividad:</span>
                            <select
                              value={actividadActiva.id}
                              onChange={(e) => {
                                const found = actividadesGrupo.find((a) => a.id === Number(e.target.value));
                                if (found) {
                                  setActividadActiva(found);
                                  setSelectedGrupoRadioId(found.grupoSeleccionadoId || null);
                                }
                              }}
                              className="bg-paper-sunken border border-line rounded-xl px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
                            >
                              {actividadesGrupo.map((act) => (
                                <option key={act.id} value={act.id}>
                                  {act.titulo}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Descripción / Instrucciones de la actividad */}
                    {actividadActiva.descripcion && (
                      <div className="bg-paper-sunken/60 border border-line rounded-xl p-4 text-xs text-ink-soft leading-relaxed">
                        <p>{actividadActiva.descripcion}</p>
                      </div>
                    )}

                    {/* Banner de Estado del Estudiante (Heurística de Nielsen: Visibilidad del Estado) */}
                    {actividadActiva.cerrada ? (
                      <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-4 flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs font-medium">
                        <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
                        <div>
                          <span>
                            Lamentablemente esta actividad cerró el <b>{formatMoodleDate(actividadActiva.fechaCierre)}</b> y ya no está disponible para cambios o nuevas elecciones.
                          </span>
                          {actividadActiva.grupoSeleccionadoNombre && (
                            <span className="block mt-1 font-semibold">
                              Quedaste formalmente registrado en: <u>{actividadActiva.grupoSeleccionadoNombre}</u>.
                            </span>
                          )}
                        </div>
                      </div>
                    ) : actividadActiva.grupoSeleccionadoNombre ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4 flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 text-xs">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
                          <div>
                            <span className="font-normal text-ink-soft">Su elección confirmada:</span>{" "}
                            <b className="text-sm font-bold text-ink">{actividadActiva.grupoSeleccionadoNombre}</b>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider shadow-2xs">
                          Registrado
                        </span>
                      </div>
                    ) : (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3 text-blue-700 dark:text-blue-300 text-xs">
                        <Info className="w-5 h-5 shrink-0 text-blue-600" />
                        <span>
                          Aún no ha seleccionado un grupo. Seleccione el grupo de su preferencia marcando la casilla correspondiente en la tabla y confirme con el botón <b>Guardar mi elección</b>.
                        </span>
                      </div>
                    )}

                    {/* Tabla de Selección estilo Moodle (Fiel reproducción de image.png) */}
                    <div className="border border-line rounded-2xl overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-paper-sunken/90 border-b border-line text-ink-faint font-semibold uppercase tracking-wider text-[11px]">
                              <th className="py-3 px-4 text-center w-20">Elección</th>
                              <th className="py-3 px-4">Grupo</th>
                              <th className="py-3 px-4 text-center w-36">Miembros / Capacidad</th>
                              <th className="py-3 px-4">
                                <div className="flex items-center justify-between">
                                  <span>Miembros del grupo</span>
                                  {(!actividadActiva || actividadActiva.mostrarMiembros || puedeGestionarTareas) && (
                                    <button
                                      type="button"
                                      onClick={() => setOcultarMiembros(!ocultarMiembros)}
                                      className="px-2.5 py-1 rounded-lg bg-paper border border-line text-[11px] font-semibold text-ink hover:bg-paper-sunken transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                    >
                                      {ocultarMiembros ? <Eye className="w-3.5 h-3.5 text-accent" /> : <EyeOff className="w-3.5 h-3.5 text-ink-faint" />}
                                      {ocultarMiembros ? "Mostrar miembros del grupo" : "Ocultar miembros del grupo"}
                                    </button>
                                  )}
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {(actividadActiva.grupos && actividadActiva.grupos.length > 0 ? actividadActiva.grupos : gruposArea).length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-8 text-center text-ink-soft">
                                  No hay grupos configurados para esta actividad aún.
                                </td>
                              </tr>
                            ) : (
                              (actividadActiva.grupos && actividadActiva.grupos.length > 0 ? actividadActiva.grupos : gruposArea).map((g) => {
                                const esMiEleccion = actividadActiva.grupoSeleccionadoId === g.id;
                                const isRadioSelected = selectedGrupoRadioId === g.id;
                                const maxCap = g.capacidadMaxima || actividadActiva.capacidadPorGrupo || 5;
                                const pct = Math.min(100, Math.round((g.cantidadMiembros / maxCap) * 100));
                                const isDisabled = (g.completo && !esMiEleccion) || actividadActiva.cerrada || (!esEstudianteInscrito && !puedeGestionarTareas);

                                return (
                                  <tr
                                    key={g.id}
                                    className={`transition-colors ${
                                      isRadioSelected
                                        ? "bg-accent/5 dark:bg-accent/10"
                                        : "hover:bg-paper-sunken/40"
                                    }`}
                                  >
                                    {/* Columna 1: Radio de Elección */}
                                    <td className="py-3 px-4 text-center align-middle">
                                      <input
                                        type="radio"
                                        id={`radio-grupo-${g.id}`}
                                        name="moodle_choice_radio"
                                        checked={isRadioSelected}
                                        disabled={isDisabled}
                                        onChange={() => setSelectedGrupoRadioId(g.id)}
                                        className="w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                                      />
                                    </td>

                                    {/* Columna 2: Nombre de Grupo y Badge de Completo */}
                                    <td className="py-3 px-4 align-middle">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <label
                                          htmlFor={`radio-grupo-${g.id}`}
                                          className={`font-semibold text-ink cursor-pointer ${
                                            isDisabled && !isRadioSelected ? "opacity-60 cursor-not-allowed" : ""
                                          }`}
                                        >
                                          {g.nombre}
                                        </label>

                                        {g.completo && (
                                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/25">
                                            (Completo)
                                          </span>
                                        )}

                                        {esMiEleccion && (
                                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                                            Tu elección
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Columna 3: Miembros / Capacidad */}
                                    <td className="py-3 px-4 text-center align-middle">
                                      <span className="font-semibold text-ink block text-xs">
                                        {g.cantidadMiembros} / {maxCap}
                                      </span>
                                      <div className="w-20 mx-auto bg-line-soft h-1.5 rounded-full overflow-hidden mt-1">
                                        <div
                                          className={`h-full rounded-full transition-all ${
                                            g.completo
                                              ? "bg-rose-500"
                                              : pct > 75
                                              ? "bg-amber-500"
                                              : "bg-purple-600"
                                          }`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    </td>

                                    {/* Columna 4: Miembros del Grupo */}
                                    <td className="py-3 px-4 align-middle">
                                      {actividadActiva && !actividadActiva.mostrarMiembros && !puedeGestionarTareas ? (
                                        <div className="flex items-center gap-1.5 text-ink-faint italic text-xs py-1">
                                          <EyeOff className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                                          <span>Lista de integrantes oculta por el docente</span>
                                        </div>
                                      ) : ocultarMiembros ? (
                                        <span className="text-ink-faint italic text-xs">
                                          Nombres ocultos por preferencia
                                        </span>
                                      ) : g.miembros && g.miembros.length > 0 ? (
                                        <div className="space-y-1">
                                          {g.miembros.map((m, idx) => (
                                            <div
                                              key={m.participanteId}
                                              className="flex items-center justify-between text-xs py-0.5 group/m"
                                            >
                                              <span className="text-ink">
                                                <b className="text-ink-faint mr-1">{idx + 1}.</b>
                                                <span className="uppercase font-medium tracking-wide">
                                                  {m.nombreCompleto}
                                                </span>
                                              </span>

                                              {puedeGestionarTareas && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleRemoverEstudianteDeGrupo(
                                                      g.id,
                                                      m.participanteId,
                                                      m.nombreCompleto
                                                    )
                                                  }
                                                  className="text-ink-faint hover:text-rose-600 opacity-0 group-hover/m:opacity-100 transition-opacity p-0.5 ml-2 cursor-pointer"
                                                  title="Retirar estudiante de este grupo"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-ink-faint italic text-xs">
                                          Sin miembros registrados
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Acciones de Elección (Exactamente como Moodle Choice) */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-line">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleGuardarEleccionGrupo(actividadActiva.id)}
                          disabled={
                            procesandoEleccion ||
                            !selectedGrupoRadioId ||
                            actividadActiva.cerrada ||
                            (!esEstudianteInscrito && !puedeGestionarTareas)
                          }
                          className="px-5 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {procesandoEleccion ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          Guardar mi elección
                        </button>

                        {actividadActiva.grupoSeleccionadoId && !actividadActiva.cerrada && (
                          <button
                            type="button"
                            onClick={() => handleAnularEleccionGrupo(actividadActiva.id)}
                            disabled={procesandoEleccion}
                            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            Eliminar mi elección
                          </button>
                        )}
                      </div>

                      <span className="text-[11px] text-ink-faint">
                        {actividadActiva.cerrada
                          ? "El plazo límite ha finalizado."
                          : "Puedes modificar tu selección mientras la actividad permanezca abierta."}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Si no hay actividad de selección Moodle configurada */
                  <div className="bg-paper border border-line rounded-2xl p-8 text-center space-y-3 shadow-2xs">
                    <Users className="w-10 h-10 text-ink-faint mx-auto" />
                    <h3 className="text-base font-serif font-bold text-ink">
                      Sin actividades de selección de grupo activas
                    </h3>
                    <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
                      {puedeGestionarTareas
                        ? "Puedes crear una actividad de selección de grupo (Moodle Choice) para que los estudiantes se registren autónomamente, o asignar los grupos de forma manual a continuación."
                        : "El docente aún no ha publicado una actividad de elección de grupo. Te informaremos cuando esté disponible para el registro."}
                    </p>
                    {puedeGestionarTareas && (
                      <button
                        onClick={handleAbrirCrearActividad}
                        className="mt-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <PlusCircle className="w-4 h-4" /> Crear Actividad de Selección de Grupo
                      </button>
                    )}
                  </div>
                )}

                {/* ========================================================= */}
                {/* SECCIÓN 2: GESTIÓN DOCENTE Y ADMIN DE GRUPOS & EQUIPOS     */}
                {/* ========================================================= */}
                {puedeGestionarTareas && (
                  <div className="bg-paper border border-line rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
                      <div>
                        <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                          <FolderKanban className="w-5 h-5 text-accent" /> Panel Docente: Orquestación de Equipos
                        </h3>
                        <p className="text-xs text-ink-soft">
                          Administra cupos, genera lotes de grupos y asigna a los estudiantes admitidos.
                        </p>
                      </div>

                      {/* Botones de acción Docente / Admin */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setShowCrearGrupoModal(true)}
                          className="px-3.5 py-2 bg-paper-sunken hover:bg-paper border border-line text-ink rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-accent" /> + Crear Grupo
                        </button>

                        <button
                          onClick={() => setShowGenerarLoteModal(true)}
                          className="px-3.5 py-2 bg-paper-sunken hover:bg-paper border border-line text-ink rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Generar Lote (N Grupos)
                        </button>

                        <button
                          onClick={handleAbrirCrearActividad}
                          className="px-3.5 py-2 bg-ink hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        >
                          <ListPlus className="w-3.5 h-3.5" /> + Actividad de Registro
                        </button>
                      </div>
                    </div>

                    {/* BANDEJA: ESTUDIANTES SIN EQUIPO (E.G. DANIEL Y BRANDON AL INSCRIBIRSE) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-amber-600" />
                          <h4 className="text-xs font-bold uppercase text-ink tracking-wider">
                            Estudiantes sin equipo ({estudiantesSinEquipo.length})
                          </h4>
                        </div>
                        {estudiantesSinEquipo.length > 0 && (
                          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                            Pendientes de asignación
                          </span>
                        )}
                      </div>

                      {estudiantesSinEquipo.length === 0 ? (
                        <div className="bg-paper-sunken/40 border border-line rounded-xl p-4 text-center text-xs text-ink-soft">
                          ✓ Todos los estudiantes admitidos en esta área ya se encuentran asignados a un grupo de trabajo.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {estudiantesSinEquipo.map((est) => (
                            <div
                              key={est.id}
                              className="bg-paper-sunken/50 border border-line rounded-xl p-3 flex flex-col justify-between gap-3 shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                                  {est.nombre.charAt(0)}
                                </div>
                                <div className="overflow-hidden">
                                  <b className="text-xs text-ink block truncate">
                                    {est.nombre} {est.apellidos}
                                  </b>
                                  <span className="text-[11px] text-ink-faint block truncate">
                                    {est.email}
                                  </span>
                                </div>
                              </div>

                              {/* Dropdown de asignación rápida a un grupo */}
                              <div className="pt-2 border-t border-line-soft">
                                <label className="text-[10px] font-semibold text-ink-faint block mb-1">
                                  Asignar rápidamente a:
                                </label>
                                <select
                                  disabled={asignandoParticipanteId === est.id}
                                  onChange={(e) => {
                                    const gid = Number(e.target.value);
                                    if (gid) {
                                      handleAsignarEstudianteAGrupo(
                                        est.id,
                                        gid,
                                        `${est.nombre} ${est.apellidos}`
                                      );
                                    }
                                  }}
                                  value=""
                                  className="w-full bg-paper border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent cursor-pointer"
                                >
                                  <option value="">-- Seleccionar grupo destino --</option>
                                  {gruposArea.map((g) => (
                                    <option key={g.id} value={g.id} disabled={g.completo}>
                                      {g.nombre} ({g.cantidadMiembros}/{g.capacidadMaxima || "∞"}{g.completo ? " - COMPLETO" : ""})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* DIRECTORIO DE TODOS LOS GRUPOS DEL ÁREA */}
                    <div className="space-y-3 pt-4 border-t border-line">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase text-ink tracking-wider">
                          Directorio de Grupos del Área ({gruposArea.length})
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {gruposArea.map((g) => {
                          const maxCap = g.capacidadMaxima || 5;
                          const pct = Math.min(100, Math.round((g.cantidadMiembros / maxCap) * 100));

                          return (
                            <div
                              key={g.id}
                              className="bg-paper-sunken/40 border border-line rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs transition-shadow"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <b className="text-sm font-semibold text-ink">{g.nombre}</b>
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                        g.completo
                                          ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25"
                                          : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25"
                                      }`}
                                    >
                                      {g.cantidadMiembros} / {g.capacidadMaxima || "∞"} cupos
                                    </span>
                                    <button
                                      onClick={() => handleEliminarGrupo(g.id, g.nombre)}
                                      title="Eliminar grupo"
                                      className="p-1 text-ink-faint hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {g.descripcion && (
                                  <p className="text-[11px] text-ink-soft line-clamp-1">{g.descripcion}</p>
                                )}

                                {/* Barra de capacidad */}
                                <div className="w-full bg-line-soft h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      g.completo
                                        ? "bg-rose-500"
                                        : pct > 75
                                        ? "bg-amber-500"
                                        : "bg-purple-600"
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>

                                {/* Lista de integrantes del grupo */}
                                <div className="pt-2 border-t border-line-soft space-y-1">
                                  <span className="text-[10px] font-semibold text-ink-faint uppercase block">
                                    Integrantes ({g.miembros.length}):
                                  </span>
                                  {g.miembros.length === 0 ? (
                                    <span className="text-[11px] text-ink-faint italic block">
                                      Sin integrantes registrados
                                    </span>
                                  ) : (
                                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                                      {g.miembros.map((m) => (
                                        <div
                                          key={m.participanteId}
                                          className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-paper border border-line-soft text-ink"
                                        >
                                          <div className="truncate pr-1">
                                            <span className="font-medium uppercase block truncate text-[11px]">
                                              {m.nombreCompleto}
                                            </span>
                                            <span className="text-[9px] text-ink-faint block truncate">
                                              {m.email}
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleRemoverEstudianteDeGrupo(
                                                g.id,
                                                m.participanteId,
                                                m.nombreCompleto
                                              )
                                            }
                                            className="text-ink-faint hover:text-rose-600 p-0.5 rounded cursor-pointer"
                                            title="Retirar del grupo"
                                          >
                                            <XCircle className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Acción rápida: Añadir un estudiante sin equipo a este grupo */}
                              {!g.completo && estudiantesSinEquipo.length > 0 && (
                                <div className="pt-2 border-t border-line-soft">
                                  <select
                                    onChange={(e) => {
                                      const pid = Number(e.target.value);
                                      if (pid) {
                                        const est = estudiantesSinEquipo.find((x) => x.id === pid);
                                        if (est) {
                                          handleAsignarEstudianteAGrupo(
                                            est.id,
                                            g.id,
                                            `${est.nombre} ${est.apellidos}`
                                          );
                                        }
                                      }
                                    }}
                                    value=""
                                    className="w-full bg-paper border border-line rounded-lg px-2 py-1 text-[11px] text-ink focus:outline-none focus:border-accent cursor-pointer"
                                  >
                                    <option value="">+ Añadir estudiante sin equipo...</option>
                                    {estudiantesSinEquipo.map((est) => (
                                      <option key={est.id} value={est.id}>
                                        {est.nombre} {est.apellidos}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
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
                {esEstudiantePendiente && (
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      <Clock className="w-3.5 h-3.5" /> Tu postulación está en revisión por el docente encargado
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* BANDEJA DE SOLICITUDES DE ADMISIÓN (Solo para Docentes y Admin) */}
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
                              onClick={handleAdmitirLote}
                              disabled={procesandoAdmision}
                              className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-all cursor-pointer shadow-xs flex items-center gap-1 disabled:opacity-50"
                            >
                              ✓ Admitir ({selectedSolicitudesLote.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMotivoRechazoLoteInput("");
                                setShowRechazoLoteModal(true);
                              }}
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
                        );
                      })}
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
                            <button
                              type="button"
                              onClick={() => handleAbrirPerfilParticipante(p.usuarioId)}
                              className="flex items-center gap-3 text-left group hover:opacity-85 transition-opacity cursor-pointer"
                              title="Ver ficha académica y cursos del participante"
                            >
                              <div className="w-8 h-8 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-xs group-hover:bg-accent group-hover:text-white transition-colors">
                                {p.nombre.charAt(0)}
                                {p.apellidos?.charAt(0)}
                              </div>
                              <div>
                                <span className="font-semibold text-ink block group-hover:text-accent transition-colors underline-offset-2 hover:underline">
                                  {p.nombre} {p.apellidos}
                                </span>
                                {p.asignadoPorNombre && (
                                  <span className="text-[10px] text-ink-faint block">
                                    Por: {p.asignadoPorNombre}
                                  </span>
                                )}
                              </div>
                            </button>
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
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {(p.gruposNombres && p.gruposNombres.length > 0
                                  ? p.gruposNombres
                                  : p.nombreEquipo.split(",").map((s) => s.trim())
                                ).map((grp, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 text-accent font-medium text-xs border border-accent/20"
                                  >
                                    <Tag className="w-3 h-3 text-accent shrink-0" /> {grp}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-ink-faint italic text-sm">Individual</span>
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
        {/* PESTAÑA: CALIFICACIONES (GRADEBOOK MOODLE)          */}
        {/* ==================================================== */}
        {activeTab === "calificaciones" && (
          <div className="space-y-6">
            {user?.rol === "ESTUDIANTE" && !esEstudianteInscrito && convocatoria.estado !== "FINALIZADA" ? (
              <div className="bg-paper border border-line rounded-2xl p-12 text-center space-y-3 shadow-xs">
                {esEstudianteRechazado ? (
                  <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                ) : (
                  <Lock className="w-10 h-10 text-ink-faint mx-auto" />
                )}
                <h3 className="text-base font-serif font-bold text-ink">
                  {esEstudiantePendiente
                    ? "Solicitud de admisión en revisión"
                    : esEstudianteRechazado
                    ? "Postulación no admitida"
                    : "Calificaciones reservadas para estudiantes admitidos"}
                </h3>
                <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
                  {esEstudiantePendiente
                    ? "Tu postulación se encuentra en revisión. Una vez admitido, podrás visualizar tus calificaciones y retroalimentaciones."
                    : esEstudianteRechazado
                    ? "Tu solicitud a esta área no fue admitida."
                    : "Debes solicitar tu inscripción al área y esperar la admisión del docente encargado para consultar tus calificaciones."}
                </p>
              </div>
            ) : user?.rol === "ESTUDIANTE" ? (
              /* ==================================================== */
              /* VISTA DE CALIFICACIONES: ESTUDIANTE (REPORTE MOODLE) */
              /* ==================================================== */
              (() => {
                const tareasCalificadas = tareas.filter((t) => t.miEntrega?.estado === "CALIFICADO");
                const tareasEntregadas = tareas.filter((t) => !!t.miEntrega);
                const tareasPendientes = tareas.filter((t) => t.miEntrega && t.miEntrega.estado !== "CALIFICADO");
                const puntosObtenidos = tareasCalificadas.reduce((acc, t) => acc + (t.miEntrega?.calificacion || 0), 0);
                const puntosEvaluadosMax = tareasCalificadas.reduce((acc, t) => acc + (t.puntajeMaximo || 100), 0);
                const puntosCursoMax = tareas.reduce((acc, t) => acc + (t.puntajeMaximo || 100), 0);
                const promedioPct = puntosEvaluadosMax > 0 ? Math.round((puntosObtenidos / puntosEvaluadosMax) * 100) : 0;
                const avancePct = tareas.length > 0 ? Math.round((tareasEntregadas.length / tareas.length) * 100) : 0;

                return (
                  <div className="space-y-6">
                    {/* Header y Tarjetas KPI del Estudiante */}
                    <div className="bg-paper border border-line rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                      <div>
                        <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                          <Award className="w-5 h-5 text-accent" /> Calificaciones del Estudiante
                        </h3>
                        <p className="text-xs text-ink-soft mt-0.5">
                          Resumen oficial de entregas académicas, evaluaciones ponderadas y retroalimentación docente.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                        <div className="p-3.5 bg-paper-sunken/60 border border-line rounded-xl">
                          <span className="text-[11px] font-semibold text-ink-faint block">Promedio Calificado</span>
                          <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 block">
                            {puntosObtenidos.toFixed(1)} / {puntosEvaluadosMax}
                          </span>
                          <span className="text-[10px] text-ink-soft">{promedioPct}% de rendimiento</span>
                        </div>

                        <div className="p-3.5 bg-paper-sunken/60 border border-line rounded-xl">
                          <span className="text-[11px] font-semibold text-ink-faint block">Avance de Entregas</span>
                          <span className="text-lg font-bold text-ink mt-0.5 block">
                            {tareasEntregadas.length} / {tareas.length}
                          </span>
                          <span className="text-[10px] text-ink-soft">{avancePct}% entregado</span>
                        </div>

                        <div className="p-3.5 bg-paper-sunken/60 border border-line rounded-xl">
                          <span className="text-[11px] font-semibold text-ink-faint block">Tareas Calificadas</span>
                          <span className="text-lg font-bold text-accent mt-0.5 block">
                            {tareasCalificadas.length}
                          </span>
                          <span className="text-[10px] text-ink-soft">Con nota y feedback</span>
                        </div>

                        <div className="p-3.5 bg-paper-sunken/60 border border-line rounded-xl">
                          <span className="text-[11px] font-semibold text-ink-faint block">En Revisión</span>
                          <span className="text-lg font-bold text-blue-600 mt-0.5 block">
                            {tareasPendientes.length}
                          </span>
                          <span className="text-[10px] text-ink-soft">Pendientes de calificar</span>
                        </div>
                      </div>
                    </div>

                    {/* Tabla Detallada de Calificaciones por Tarea */}
                    <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
                      <div className="p-4 border-b border-line flex items-center justify-between">
                        <h4 className="font-serif text-sm font-bold text-ink">
                          Detalle de Tareas y Calificaciones ({tareas.length})
                        </h4>
                        <span className="text-xs text-ink-soft">
                          Total acumulable: {puntosCursoMax} pts
                        </span>
                      </div>

                      {tareas.length === 0 ? (
                        <div className="p-8 text-center text-xs text-ink-faint">
                          No hay tareas configuradas en esta convocatoria.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-paper-sunken/60 text-ink-soft uppercase text-[10px] tracking-wider border-b border-line">
                              <tr>
                                <th className="py-3 px-4">Actividad / Tarea</th>
                                <th className="py-3 px-4">Modalidad</th>
                                <th className="py-3 px-4">Fecha Límite</th>
                                <th className="py-3 px-4">Estado</th>
                                <th className="py-3 px-4">Calificación</th>
                                <th className="py-3 px-4">Retroalimentación Docente</th>
                                <th className="py-3 px-4 text-right">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                              {tareas.map((t) => {
                                const entrega = t.miEntrega;
                                const fechaLim = t.fechaEntrega || t.fechaLimite;
                                const esTardia = Boolean(
                                  entrega?.fechaEntrega &&
                                    fechaLim &&
                                    new Date(entrega.fechaEntrega) > new Date(fechaLim)
                                );

                                return (
                                  <tr key={t.id} className="hover:bg-paper-sunken/30 transition-colors">
                                    <td className="py-3.5 px-4">
                                      <div className="space-y-0.5">
                                        <span className="font-bold text-ink block">{t.titulo}</span>
                                        {t.moduloTitulo && (
                                          <span className="text-[10px] text-ink-faint bg-paper-sunken px-1.5 py-0.5 rounded border border-line inline-block">
                                            {t.moduloTitulo}
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    <td className="py-3.5 px-4 text-ink-soft">
                                      {t.esGrupal ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium text-[11px] border border-blue-500/20">
                                          <Users className="w-3 h-3" />
                                          {entrega?.grupoNombre ? entrega.grupoNombre : "Grupal"}
                                        </span>
                                      ) : (
                                        <span className="text-ink-faint text-[11px]">Individual</span>
                                      )}
                                    </td>

                                    <td className="py-3.5 px-4 text-ink-soft text-[11px]">
                                      {fechaLim ? formatMoodleDate(fechaLim) : "Sin límite"}
                                    </td>

                                    <td className="py-3.5 px-4">
                                      {entrega ? (
                                        <div className="space-y-1">
                                          <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                              entrega.estado === "CALIFICADO"
                                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                                : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                                            }`}
                                          >
                                            <CheckCircle2 className="w-3 h-3" />
                                            {entrega.estado === "CALIFICADO" ? "Calificado" : "Entregado"}
                                          </span>
                                          {esTardia && (
                                            <span className="block text-[9px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                              ⚠️ Con retraso
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-paper-sunken text-ink-faint border border-line">
                                          Sin entrega
                                        </span>
                                      )}
                                    </td>

                                    <td className="py-3.5 px-4">
                                      {entrega?.estado === "CALIFICADO" &&
                                      entrega.calificacion !== undefined &&
                                      entrega.calificacion !== null ? (
                                        <div className="space-y-1">
                                          <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                                            {entrega.calificacion} / {t.puntajeMaximo}
                                          </span>
                                          <div className="h-1 w-20 bg-paper-sunken border border-line rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-emerald-500 rounded-full"
                                              style={{
                                                width: `${Math.min(
                                                  100,
                                                  Math.round((entrega.calificacion / (t.puntajeMaximo || 100)) * 100)
                                                )}%`,
                                              }}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-ink-faint">- / {t.puntajeMaximo}</span>
                                      )}
                                    </td>

                                    <td className="py-3.5 px-4 max-w-xs">
                                      {entrega?.retroalimentacion ? (
                                        <p className="text-[11px] text-ink-soft italic bg-paper-sunken/50 p-2 rounded-lg border border-line leading-relaxed">
                                          &ldquo;{entrega.retroalimentacion}&rdquo;
                                        </p>
                                      ) : (
                                        <span className="text-ink-faint text-[11px]">-</span>
                                      )}
                                    </td>

                                    <td className="py-3.5 px-4 text-right">
                                      <button
                                        onClick={() => {
                                          setActiveTareaDetalle(t);
                                          updateUrlParams({ tarea: t.id, modulo: t.moduloId || null });
                                        }}
                                        className="px-2.5 py-1 text-xs text-accent hover:text-accent-dark font-medium border border-accent/30 hover:border-accent rounded-lg transition-colors cursor-pointer"
                                      >
                                        Ver Tarea
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              /* ==================================================== */
              /* VISTA DE CALIFICACIONES: DOCENTE / ADMIN (MATRIZ)    */
              /* ==================================================== */
              <div className="space-y-5">
                {/* Header del Gradebook Docente */}
                <div className="bg-paper border border-line rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                      <Award className="w-5 h-5 text-accent" /> Libro Central de Calificaciones
                    </h3>
                    <p className="text-xs text-ink-soft mt-0.5">
                      Matriz global de calificaciones y avance de estudiantes admitidos ({estudiantesAdmitidos.length}) en {tareas.length} actividades académicas.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleExportarCalificacionesCSV}
                      disabled={estudiantesAdmitidos.length === 0}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" /> Exportar a CSV
                    </button>
                    <button
                      onClick={cargarTodasLasEntregas}
                      disabled={cargandoGradebook}
                      className="px-3 py-2 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      title="Refrescar entregas"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${cargandoGradebook ? "animate-spin" : ""}`} />
                      Actualizar
                    </button>
                  </div>
                </div>

                {/* Filtro de Búsqueda */}
                <div className="bg-paper border border-line rounded-2xl p-3 shadow-xs flex items-center gap-2">
                  <Search className="w-4 h-4 text-ink-faint shrink-0 ml-2" />
                  <input
                    type="text"
                    value={searchGradebookEstudiante}
                    onChange={(e) => setSearchGradebookEstudiante(e.target.value)}
                    placeholder="Buscar estudiante por nombre, correo o equipo..."
                    className="w-full bg-transparent text-xs text-ink placeholder:text-ink-faint focus:outline-none"
                  />
                  {searchGradebookEstudiante && (
                    <button
                      onClick={() => setSearchGradebookEstudiante("")}
                      className="text-xs text-ink-faint hover:text-ink p-1 mr-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Matriz Tabular estilo Moodle Gradebook */}
                <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
                  {cargandoGradebook ? (
                    <div className="p-12 text-center text-xs text-ink-faint space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-accent" />
                      <p>Sincronizando entregas y calificaciones del aula...</p>
                    </div>
                  ) : estudiantesFiltradosGradebook.length === 0 ? (
                    <div className="p-8 text-center text-xs text-ink-faint">
                      {estudiantesAdmitidos.length === 0
                        ? "No hay estudiantes admitidos en esta convocatoria todavía."
                        : "No se encontraron estudiantes con el criterio de búsqueda especificado."}
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[70vh]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-paper-sunken/80 text-ink text-[11px] sticky top-0 z-10 border-b border-line shadow-2xs backdrop-blur-xs">
                          <tr>
                            <th className="py-3 px-4 font-bold sticky left-0 bg-paper-sunken z-20 min-w-[200px] border-r border-line">
                              Estudiante
                            </th>
                            <th className="py-3 px-3 font-semibold text-ink-soft min-w-[120px]">
                              Equipo
                            </th>
                            {tareas.map((t) => (
                              <th
                                key={t.id}
                                className="py-3 px-3 font-semibold text-center min-w-[120px] max-w-[160px] truncate"
                                title={`${t.titulo} (Máx: ${t.puntajeMaximo || 100} pts)`}
                              >
                                <span className="block truncate">{t.titulo}</span>
                                <span className="text-[10px] text-ink-faint font-normal block">
                                  Máx {t.puntajeMaximo || 100} pts
                                </span>
                              </th>
                            ))}
                            <th className="py-3 px-3 font-bold text-center min-w-[100px] bg-accent/5 text-accent">
                              Total Acum.
                            </th>
                            <th className="py-3 px-3 font-bold text-center min-w-[90px]">
                              Progreso
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-line text-xs">
                          {estudiantesFiltradosGradebook.map((est) => {
                            let totalNota = 0;
                            let totalMax = 0;
                            let entregasRealizadas = 0;

                            return (
                              <tr key={est.id} className="hover:bg-paper-sunken/30 transition-colors">
                                {/* Estudiante (Sticky) */}
                                <td className="py-3 px-4 sticky left-0 bg-paper hover:bg-paper-sunken/30 z-10 border-r border-line">
                                  <div className="space-y-0.5">
                                    <span className="font-semibold text-ink block">
                                      {est.nombre} {est.apellidos}
                                    </span>
                                    <span className="text-[10px] text-ink-faint block truncate">
                                      {est.email}
                                    </span>
                                  </div>
                                </td>

                                {/* Equipo */}
                                <td className="py-3 px-3 text-ink-soft text-[11px]">
                                  {est.nombreEquipo ? (
                                    <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent font-medium text-[10px] border border-accent/20 truncate block max-w-[130px]">
                                      {est.nombreEquipo}
                                    </span>
                                  ) : (
                                    <span className="text-ink-faint italic text-[11px]">-</span>
                                  )}
                                </td>

                                {/* Celdas por cada Tarea */}
                                {tareas.map((t) => {
                                  const maxP = t.puntajeMaximo || 100;
                                  totalMax += maxP;
                                  const entrega = todasLasEntregas[t.id]?.find(
                                    (e) => e.estudianteId === est.usuarioId
                                  );

                                  if (entrega) {
                                    entregasRealizadas++;
                                    if (entrega.calificacion !== undefined && entrega.calificacion !== null) {
                                      totalNota += entrega.calificacion;
                                    }
                                  }

                                  const fechaLim = t.fechaEntrega || t.fechaLimite;
                                  const esTardia = Boolean(
                                    entrega?.fechaEntrega &&
                                      fechaLim &&
                                      new Date(entrega.fechaEntrega) > new Date(fechaLim)
                                  );

                                  return (
                                    <td key={t.id} className="py-3 px-3 text-center">
                                      {entrega ? (
                                        entrega.estado === "CALIFICADO" &&
                                        entrega.calificacion !== undefined &&
                                        entrega.calificacion !== null ? (
                                          <div className="inline-flex items-center gap-1">
                                            <span className="px-2 py-0.5 rounded-md font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-500/15 border border-emerald-500/30 text-xs">
                                              {entrega.calificacion}
                                            </span>
                                            {esTardia && (
                                              <span title="Entregado con retraso" className="text-amber-600 text-[10px]">
                                                ⚠️
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="inline-flex items-center gap-1">
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/20">
                                              Entregado
                                            </span>
                                            {esTardia && (
                                              <span title="Entregado con retraso" className="text-amber-600 text-[10px]">
                                                ⚠️
                                              </span>
                                            )}
                                          </div>
                                        )
                                      ) : (
                                        <span className="text-ink-faint text-xs">-</span>
                                      )}
                                    </td>
                                  );
                                })}

                                {/* Total Acumulado */}
                                <td className="py-3 px-3 text-center font-bold text-accent bg-accent/5">
                                  {totalNota} / {totalMax}
                                </td>

                                {/* Progreso */}
                                <td className="py-3 px-3 text-center">
                                  <span className="text-[11px] font-semibold text-ink">
                                    {totalMax > 0 ? Math.round((totalNota / totalMax) * 100) : 0}%
                                  </span>
                                  <span className="text-[9px] text-ink-faint block">
                                    {entregasRealizadas}/{tareas.length} entr.
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* Footer con Promedios Generales por Actividad */}
                        {tareas.length > 0 && estudiantesFiltradosGradebook.length > 0 && (
                          <tfoot className="bg-paper-sunken/90 font-semibold text-[11px] text-ink border-t-2 border-line">
                            <tr>
                              <td className="py-3 px-4 sticky left-0 bg-paper-sunken z-20 border-r border-line">
                                Promedio de la Clase
                              </td>
                              <td className="py-3 px-3 text-ink-faint">-</td>
                              {tareas.map((t) => {
                                const entregasCalif = (todasLasEntregas[t.id] || []).filter(
                                  (e) => e.calificacion !== undefined && e.calificacion !== null
                                );
                                const sumaNotas = entregasCalif.reduce(
                                  (acc, e) => acc + (e.calificacion || 0),
                                  0
                                );
                                const prom = entregasCalif.length > 0 ? (sumaNotas / entregasCalif.length).toFixed(1) : "-";

                                return (
                                  <td key={t.id} className="py-3 px-3 text-center text-ink-soft">
                                    {prom !== "-" ? `${prom} pts` : "-"}
                                  </td>
                                );
                              })}
                              <td className="py-3 px-3 text-center text-accent bg-accent/5">-</td>
                              <td className="py-3 px-3 text-center text-ink-soft">-</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>
              </div>
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
        {/* MODALES: MÓDULO Y TAREA ACADÉMICA (MOODLE)          */}
        {/* ==================================================== */}
        {renderModalModulo()}
        {renderModalCreateTarea()}

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
                    placeholder="Dejar en blanco si te postulas de forma individual"
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
        {renderModalSubirEntrega()}
        {renderModalHistorialVersiones()}
        {renderModalRechazoLote()}


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

        {/* ==================================================== */}
        {/* MODAL: CREAR GRUPO INDIVIDUAL (DOCENTE/ADMIN)        */}
        {/* ==================================================== */}
        {showCrearGrupoModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-paper border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-accent" /> Crear Nuevo Grupo
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCrearGrupoModal(false)}
                  className="text-ink-faint hover:text-ink text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCrearGrupo} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-ink block mb-1">Nombre del Grupo *</label>
                  <input
                    type="text"
                    required
                    value={nuevoGrupoNombre}
                    onChange={(e) => setNuevoGrupoNombre(e.target.value)}
                    placeholder="Ej. Gr1erPar 1 o Grupo Alfa"
                    className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1">Descripción (Opcional)</label>
                  <textarea
                    rows={2}
                    value={nuevoGrupoDesc}
                    onChange={(e) => setNuevoGrupoDesc(e.target.value)}
                    placeholder="Ej. Grupo de laboratorio y defensa de proyectos..."
                    className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent resize-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1">
                    Capacidad Máxima de Integrantes
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={nuevoGrupoCapacidad}
                    onChange={(e) => setNuevoGrupoCapacidad(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                  />
                  <span className="text-[11px] text-ink-faint mt-1 block">
                    Por defecto: 5 integrantes como en Moodle.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowCrearGrupoModal(false)}
                    className="px-4 py-2 border border-line rounded-xl text-ink hover:bg-paper-sunken cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creandoGrupo}
                    className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {creandoGrupo ? "Creando..." : "Crear Grupo"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL: GENERAR LOTE DE GRUPOS (DOCENTE/ADMIN)        */}
        {/* ==================================================== */}
        {showGenerarLoteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-paper border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" /> Generar Lote de Grupos
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGenerarLoteModal(false)}
                  className="text-ink-faint hover:text-ink text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGenerarLoteGrupos} className="space-y-4 text-xs">
                <p className="text-ink-soft leading-relaxed">
                  Crea automáticamente múltiples grupos secuenciales con un mismo prefijo y límite de integrantes (por ejemplo: <code>Gr1erPar 1</code> hasta <code>Gr1erPar 10</code>).
                </p>

                <div>
                  <label className="font-semibold text-ink block mb-1">Prefijo de Nombre *</label>
                  <input
                    type="text"
                    required
                    value={lotePrefijo}
                    onChange={(e) => setLotePrefijo(e.target.value)}
                    placeholder="Ej. Gr1erPar  o Grupo "
                    className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-ink block mb-1">Cantidad de Grupos *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={loteCantidad}
                      onChange={(e) => setLoteCantidad(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-ink block mb-1">Cupo por Grupo *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={loteCapacidad}
                      onChange={(e) => setLoteCapacidad(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowGenerarLoteModal(false)}
                    className="px-4 py-2 border border-line rounded-xl text-ink hover:bg-paper-sunken cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={generandoLote}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {generandoLote ? "Generando Lote..." : `Generar ${loteCantidad} Grupos`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL: CREAR/EDITAR ACTIVIDAD DE SELECCIÓN           */}
        {/* ==================================================== */}
        {showCrearActividadModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-paper border border-line rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                  <ListPlus className="w-5 h-5 text-accent" />
                  {editingActividadId
                    ? "Editar Plazos y Reglas de Actividad"
                    : "Nueva Actividad: Selección de Grupo (Moodle Choice)"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowCrearActividadModal(false);
                    setEditingActividadId(null);
                  }}
                  className="text-ink-faint hover:text-ink text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCrearActividadGrupo} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-ink block mb-1">Título de la Actividad *</label>
                  <input
                    type="text"
                    required
                    value={nuevaActTitulo}
                    onChange={(e) => setNuevaActTitulo(e.target.value)}
                    placeholder="Ej. Seleccionar grupo para 1er examen parcial"
                    className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1">Instrucciones para los Estudiantes</label>
                  <textarea
                    rows={3}
                    value={nuevaActDesc}
                    onChange={(e) => setNuevaActDesc(e.target.value)}
                    placeholder="Ej. Seleccionar número de grupo según se les asignó en la hoja de clases..."
                    className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-ink block mb-1">Fecha y Hora de Apertura</label>
                    <input
                      type="datetime-local"
                      value={nuevaActApertura}
                      onChange={(e) => setNuevaActApertura(e.target.value)}
                      className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-ink block mb-1">Fecha y Hora de Cierre (Límite)</label>
                    <input
                      type="datetime-local"
                      value={nuevaActCierre}
                      onChange={(e) => setNuevaActCierre(e.target.value)}
                      className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1">Límite de Cupos por Grupo</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={nuevaActCapacidad}
                    onChange={(e) => setNuevaActCapacidad(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Reglas de Elección de Grupo (Paridad Moodle) */}
                <div className="space-y-2.5 pt-2 border-t border-line-soft">
                  <span className="font-semibold text-ink block text-[11px] uppercase tracking-wider text-ink-faint">
                    Reglas y Visibilidad
                  </span>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nuevaActPermitirCambio}
                      onChange={(e) => setNuevaActPermitirCambio(e.target.checked)}
                      className="w-4 h-4 text-accent rounded focus:ring-accent cursor-pointer"
                    />
                    <span className="text-ink">
                      Permitir a los estudiantes cambiar de grupo mientras la actividad esté abierta
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nuevaActMostrarMiembros}
                      onChange={(e) => setNuevaActMostrarMiembros(e.target.checked)}
                      className="w-4 h-4 text-accent rounded focus:ring-accent cursor-pointer"
                    />
                    <span className="text-ink">
                      Mostrar los estudiantes registrados en cada grupo a sus compañeros
                    </span>
                  </label>
                </div>

                {/* Generación automática de grupos iniciales (sólo al crear) */}
                {!editingActividadId && (
                  <div className="bg-paper-sunken/60 p-4 rounded-xl border border-line space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={nuevaActGenerarGrupos}
                        onChange={(e) => setNuevaActGenerarGrupos(e.target.checked)}
                        className="w-4 h-4 text-accent rounded focus:ring-accent cursor-pointer"
                      />
                      <b className="text-ink">Generar grupos automáticamente para esta actividad</b>
                    </label>

                    {nuevaActGenerarGrupos && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line-soft">
                        <div>
                          <label className="text-[10px] font-semibold text-ink-faint block mb-1">
                            Cantidad de Grupos
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={nuevaActCantidadGrupos}
                            onChange={(e) => setNuevaActCantidadGrupos(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-paper border border-line rounded-lg text-ink focus:outline-none focus:border-accent"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-ink-faint block mb-1">
                            Prefijo
                          </label>
                          <input
                            type="text"
                            value={nuevaActPrefijo}
                            onChange={(e) => setNuevaActPrefijo(e.target.value)}
                            placeholder="Gr1erPar "
                            className="w-full px-2.5 py-1.5 bg-paper border border-line rounded-lg text-ink focus:outline-none focus:border-accent"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCrearActividadModal(false);
                      setEditingActividadId(null);
                    }}
                    className="px-4 py-2 border border-line rounded-xl text-ink hover:bg-paper-sunken cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creandoActividad}
                    className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {creandoActividad
                      ? "Guardando..."
                      : editingActividadId
                      ? "Guardar Cambios"
                      : "Publicar Actividad"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL: FICHA ACADÉMICA / PERFIL PARTICIPANTE         */}
        {/* ==================================================== */}
        {selectedPerfilUsuarioId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-paper border border-line rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-accent" /> Ficha Académica del Participante
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPerfilUsuarioId(null);
                    setPerfilUsuarioModalData(null);
                  }}
                  className="text-ink-faint hover:text-ink text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {cargandoPerfilUsuario ? (
                <div className="py-12 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-accent mx-auto" />
                  <p className="text-xs text-ink-soft">Consultando perfil académico...</p>
                </div>
              ) : perfilUsuarioModalData ? (
                <div className="space-y-4 text-xs">
                  {/* Encabezado del usuario */}
                  <div className="flex items-center gap-4 bg-paper-sunken/40 border border-line rounded-xl p-4">
                    <div className="w-14 h-14 rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center text-lg shrink-0">
                      {perfilUsuarioModalData.nombre?.charAt(0)}
                      {perfilUsuarioModalData.apellidos?.charAt(0)}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-serif font-bold text-ink">
                        {perfilUsuarioModalData.nombre} {perfilUsuarioModalData.apellidos}
                      </h4>
                      <p className="text-ink-soft">{perfilUsuarioModalData.email}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
                          {perfilUsuarioModalData.rol}
                        </span>
                        {perfilUsuarioModalData.departamento && (
                          <span className="text-[11px] text-ink-faint">
                            • {perfilUsuarioModalData.departamento}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Biografía */}
                  {perfilUsuarioModalData.biografia && (
                    <div className="space-y-1">
                      <b className="text-ink font-semibold">Biografía / Presentación:</b>
                      <p className="text-ink-soft bg-paper-sunken/30 border border-line rounded-lg p-3 leading-relaxed">
                        {perfilUsuarioModalData.biografia}
                      </p>
                    </div>
                  )}

                  {/* Cursos / Áreas inscritas */}
                  <div className="space-y-2 pt-2 border-t border-line">
                    <div className="flex items-center justify-between">
                      <b className="text-ink font-semibold flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-accent" /> Áreas y Convocatorias Académicas
                      </b>
                      {perfilUsuarioModalData.esPropioPerfil && perfilUsuarioModalData.ocultarCursos && (
                        <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          Visible solo para ti (Privado al público)
                        </span>
                      )}
                    </div>

                    {perfilUsuarioModalData.ocultarCursos && !perfilUsuarioModalData.esPropioPerfil ? (
                      <div className="bg-paper-sunken/50 border border-line rounded-xl p-4 text-center text-ink-soft space-y-1">
                        <Lock className="w-4 h-4 text-ink-faint mx-auto" />
                        <p className="font-medium text-ink">Cursos en modo privado</p>
                        <p className="text-[11px]">El usuario configuró su privacidad para no exhibir públicamente sus cursos.</p>
                      </div>
                    ) : perfilUsuarioModalData.cursos && perfilUsuarioModalData.cursos.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {perfilUsuarioModalData.cursos.map((c: any) => (
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
                  onClick={() => {
                    setSelectedPerfilUsuarioId(null);
                    setPerfilUsuarioModalData(null);
                  }}
                  className="px-4 py-2 bg-paper-sunken hover:bg-paper border border-line rounded-xl text-ink font-semibold cursor-pointer text-xs"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
