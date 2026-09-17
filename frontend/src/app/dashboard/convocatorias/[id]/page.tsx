"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";

export default function AreaMoodlePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const convocatoriaId = Number(params?.id);

  // Estados de datos
  const [convocatoria, setConvocatoria] = useState<ConvocatoriaDTO | null>(null);
  const [participantes, setParticipantes] = useState<ConvocatoriaParticipanteDTO[]>([]);
  const [tareas, setTareas] = useState<TareaDTO[]>([]);
  const [documentosUsuario, setDocumentosUsuario] = useState<DocumentoDTO[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<"tareas" | "participantes" | "info">("tareas");

  // Notificaciones / Alertas
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const toast = useCallback((text: string, type: "success" | "error" = "success") => {
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
  const [creandoTarea, setCreandoTarea] = useState(false);

  // Formulario de Designar Miembro
  const [usuarioDesignarId, setUsuarioDesignarId] = useState<number | "">("");
  const [rolDesignar, setRolDesignar] = useState<"DOCENTE" | "JURADO">("DOCENTE");
  const [designando, setDesignando] = useState(false);

  // Formulario de Inscripción Estudiante
  const [nombreEquipo, setNombreEquipo] = useState("");
  const [inscribiendo, setInscribiendo] = useState(false);

  // Formulario de Entrega Estudiante
  const [docVinculadoId, setDocVinculadoId] = useState<number | "">("");
  const [nombreArchivoEntrega, setNombreArchivoEntrega] = useState("");
  const [comentarioEstudiante, setComentarioEstudiante] = useState("");
  const [enviandoEntrega, setEnviandoEntrega] = useState(false);

  // Formulario de Calificación Docente
  const [notaCalificacion, setNotaCalificacion] = useState<number>(100);
  const [feedbackDocente, setFeedbackDocente] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);

  // Filtro de participantes
  const [filtroParticipanteRol, setFiltroParticipanteRol] = useState<string>("TODOS");
  const [searchParticipante, setSearchParticipante] = useState("");

  // Permisos en esta área específica
  const esAdmin = user?.rol === "ADMIN";
  const esDocenteEnEstaArea = participantes.some(
    (p) => p.usuarioId === user?.id && p.rol === "DOCENTE"
  );
  const esJuradoEnEstaArea = participantes.some(
    (p) => p.usuarioId === user?.id && p.rol === "JURADO"
  );
  const miParticipacion = participantes.find((p) => p.usuarioId === user?.id);
  const esEstudianteInscrito = miParticipacion?.rol === "ESTUDIANTE";
  const puedeGestionarTareas = esAdmin || esDocenteEnEstaArea;
  const puedeDesignarJurado = esAdmin || esDocenteEnEstaArea;

  // Carga inicial
  const cargarDatos = useCallback(async () => {
    if (!convocatoriaId) return;
    try {
      setLoading(true);
      const [convData, partsData, tareasData] = await Promise.all([
        api.getConvocatoriaById(convocatoriaId),
        api.getParticipantesConvocatoria(convocatoriaId),
        api.getTareasConvocatoria(convocatoriaId),
      ]);
      setConvocatoria(convData);
      setParticipantes(partsData);
      setTareas(tareasData);

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
        titulo: tituloTarea.trim(),
        descripcion: descTarea.trim() || undefined,
        fechaHabilitacion: fechaHabilitacion ? new Date(fechaHabilitacion).toISOString() : undefined,
        fechaEntrega: fechaEntrega ? new Date(fechaEntrega).toISOString() : undefined,
        fechaCorte: fechaCorte ? new Date(fechaCorte).toISOString() : undefined,
        habilitada: true,
        tiposArchivosPermitidos: archivosPermitidos.trim() || ".pdf, .docx, .zip",
        tamanoMaximoMb: Number(tamanoMb) || 15,
        puntajeMaximo: Number(puntajeMax) || 100,
      };

      await api.createTareaConvocatoria(convocatoriaId, payload);
      toast("Tarea académica creada exitosamente con control de fechas Moodle", "success");
      setShowCreateTareaModal(false);
      setTituloTarea("");
      setDescTarea("");
      setFechaHabilitacion("");
      setFechaEntrega("");
      setFechaCorte("");

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

  // Enviar Entrega (Estudiante)
  const handleEnviarEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTareaForEntrega) return;

    try {
      setEnviandoEntrega(true);
      const req: EntregaRequest = {
        documentoId: docVinculadoId ? Number(docVinculadoId) : undefined,
        nombreArchivo: nombreArchivoEntrega.trim() || undefined,
        comentarioEstudiante: comentarioEstudiante.trim() || undefined,
      };

      await api.entregarTarea(selectedTareaForEntrega.id, req);
      toast("Trabajo entregado con éxito a revisión", "success");
      setSelectedTareaForEntrega(null);
      setDocVinculadoId("");
      setNombreArchivoEntrega("");
      setComentarioEstudiante("");

      const updatedTareas = await api.getTareasConvocatoria(convocatoriaId);
      setTareas(updatedTareas);
    } catch (err: any) {
      toast(err.message || "Error al enviar la entrega", "error");
    } finally {
      setEnviandoEntrega(false);
    }
  };

  // Ver Entregas (Docente/Jurado)
  const handleVerEntregas = async (tarea: TareaDTO) => {
    try {
      setSelectedTareaForRevision(tarea);
      const entregas = await api.getEntregasTarea(tarea.id);
      setEntregasCurrentTarea(entregas);
    } catch (err: any) {
      toast(err.message || "Error al cargar entregas", "error");
    }
  };

  // Calificar Entrega (Docente/Jurado)
  const handleCalificarEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntregaForCalificar) return;

    try {
      setGuardandoNota(true);
      const req: CalificarEntregaRequest = {
        calificacion: Number(notaCalificacion),
        retroalimentacion: feedbackDocente.trim() || undefined,
      };

      const calificada = await api.calificarEntrega(selectedEntregaForCalificar.id, req);
      toast("Calificación y retroalimentación guardadas con éxito", "success");
      setSelectedEntregaForCalificar(null);

      // Actualizar la lista en modal de revisión
      setEntregasCurrentTarea((prev) =>
        prev.map((ent) => (ent.id === calificada.id ? calificada : ent))
      );
    } catch (err: any) {
      toast(err.message || "Error al calificar la entrega", "error");
    } finally {
      setGuardandoNota(false);
    }
  };

  // Filtrado de participantes para la pestaña Directorio
  const participantesFiltrados = participantes.filter((p) => {
    const matchRol = filtroParticipanteRol === "TODOS" || p.rol === filtroParticipanteRol;
    const matchSearch =
      searchParticipante.trim() === "" ||
      `${p.nombre} ${p.apellidos}`.toLowerCase().includes(searchParticipante.toLowerCase()) ||
      p.email.toLowerCase().includes(searchParticipante.toLowerCase()) ||
      p.nombreEquipo?.toLowerCase().includes(searchParticipante.toLowerCase());
    return matchRol && matchSearch;
  });

  const conteoDocentes = participantes.filter((p) => p.rol === "DOCENTE").length;
  const conteoJurados = participantes.filter((p) => p.rol === "JURADO").length;
  const conteoEstudiantes = participantes.filter((p) => p.rol === "ESTUDIANTE").length;

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

          <div className="bg-paper border border-line rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
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
                {/* Botón de inscripción para estudiantes no registrados */}
                {user?.rol === "ESTUDIANTE" && !esEstudianteInscrito && (
                  <button
                    onClick={() => setShowInscripcionModal(true)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" /> Inscribirme al Área
                  </button>
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

                {/* Botón de crear tarea (solo docentes asignados o admin) */}
                {puedeGestionarTareas && (
                  <button
                    onClick={() => setShowCreateTareaModal(true)}
                    className="px-4 py-2.5 bg-ink hover:bg-black text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" /> Nueva Tarea (Moodle)
                  </button>
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
                <FileText className="w-4 h-4" /> Tareas &amp; Evaluaciones ({tareas.length})
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

        {/* ==================================================== */}
        {/* PESTAÑA 1: TAREAS & EVALUACIONES (MOODLE CON 3 FECHAS) */}
        {/* ==================================================== */}
        {activeTab === "tareas" && (
          <div className="space-y-4">
            {tareas.length === 0 ? (
              <div className="bg-paper border border-line rounded-2xl p-12 text-center space-y-3">
                <FileText className="w-10 h-10 text-ink-faint mx-auto" />
                <h3 className="text-base font-serif font-bold text-ink">No hay tareas publicadas aún</h3>
                <p className="text-xs text-ink-soft max-w-md mx-auto">
                  {puedeGestionarTareas
                    ? "Como docente o administrador de esta área, puedes crear entregas con fecha de habilitación, límite y corte estricto."
                    : "El docente aún no ha publicado tareas para esta convocatoria."}
                </p>
                {puedeGestionarTareas && (
                  <button
                    onClick={() => setShowCreateTareaModal(true)}
                    className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" /> Crear Primera Tarea
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {tareas.map((t) => (
                  <div
                    key={t.id}
                    className="bg-paper border border-line rounded-2xl p-5 sm:p-6 shadow-sm hover:border-line-dark transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-serif text-base sm:text-lg font-bold text-ink">{t.titulo}</h3>
                          {/* Badge de Estado Moodle */}
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

                      {/* Puntaje y Toggle docente */}
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

                    {/* TRIPLE CONTROL DE FECHAS VISIBLE (MOODLE) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-paper-sunken/60 p-3 rounded-xl border border-line text-xs">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase text-ink-faint block font-semibold">1. Habilitación</span>
                          <span className="font-medium text-ink">
                            {t.fechaHabilitacion
                              ? new Date(t.fechaHabilitacion).toLocaleString()
                              : "Inmediata"}
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
                          <span className="text-[10px] uppercase text-ink-faint block font-semibold">3. Fecha de Corte (Estricto)</span>
                          <span className="font-medium text-ink">
                            {t.fechaCorte ? new Date(t.fechaCorte).toLocaleString() : "Sin fecha corte"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Parámetros de entrega y botones de acción */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-ink-soft">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-medium text-ink">Archivos: {t.tiposArchivosPermitidos}</span>
                        <span>•</span>
                        <span>Máx: {t.tamanoMaximoMb} MB</span>
                        {t.creadorNombre && (
                          <>
                            <span>•</span>
                            <span>Docente: {t.creadorNombre}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Botón de Ver Entregas para Docente o Jurado */}
                        {(puedeGestionarTareas || esJuradoEnEstaArea) && (
                          <button
                            onClick={() => handleVerEntregas(t)}
                            className="px-3 py-1.5 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                            Ver Entregas ({t.totalEntregas})
                          </button>
                        )}

                        {/* Botón de Entrega para Estudiante */}
                        {user?.rol === "ESTUDIANTE" && (
                          <button
                            onClick={() => setSelectedTareaForEntrega(t)}
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

                    {/* Resumen de entrega previa del estudiante si existe */}
                    {t.miEntrega && (
                      <div className="mt-2 bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between font-semibold text-emerald-800">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Trabajo Entregado el{" "}
                            {new Date(t.miEntrega.fechaEntrega).toLocaleString()}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase font-bold text-[10px]">
                            {t.miEntrega.estado}
                          </span>
                        </div>

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
        )}

        {/* ==================================================== */}
        {/* PESTAÑA 2: PARTICIPANTES (TABLA COMPLETA MOODLE)     */}
        {/* ==================================================== */}
        {activeTab === "participantes" && (
          <div className="space-y-4">
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
        {/* MODAL: CREAR TAREA MOODLE CON TRIPLE CONTROL DE FECHA */}
        {/* ==================================================== */}
        {showCreateTareaModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-paper border border-line rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" /> Nueva Tarea Académica (Moodle)
                </h3>
                <button onClick={() => setShowCreateTareaModal(false)} className="text-ink-faint hover:text-ink">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCrearTarea} className="space-y-4 text-xs">
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
        {/* MODAL: SUBIR ENTREGA (ESTUDIANTE)                   */}
        {/* ==================================================== */}
        {selectedTareaForEntrega && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-paper border border-line rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                  <Upload className="w-5 h-5 text-accent" /> Envío de Trabajo
                </h3>
                <button onClick={() => setSelectedTareaForEntrega(null)} className="text-ink-faint hover:text-ink">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs space-y-2 bg-paper-sunken p-3 rounded-xl border border-line">
                <span className="font-bold text-ink block">{selectedTareaForEntrega.titulo}</span>
                <div className="flex flex-wrap gap-2 text-ink-soft text-[11px]">
                  <span>Puntaje: {selectedTareaForEntrega.puntajeMaximo} pts</span>
                  <span>•</span>
                  <span>Formatos: {selectedTareaForEntrega.tiposArchivosPermitidos}</span>
                  <span>•</span>
                  <span>Límite Corte: {selectedTareaForEntrega.fechaCorte ? new Date(selectedTareaForEntrega.fechaCorte).toLocaleString() : "Abierto"}</span>
                </div>
              </div>

              <form onSubmit={handleEnviarEntrega} className="space-y-4 text-xs">
                {documentosUsuario.length > 0 && (
                  <div>
                    <label className="font-semibold text-ink block mb-1">
                      Vincular Documento de Investigación (Opcional)
                    </label>
                    <select
                      value={docVinculadoId}
                      onChange={(e) => setDocVinculadoId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink"
                    >
                      <option value="">-- No vincular documento --</option>
                      {documentosUsuario.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.titulo} ({doc.categoria})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="font-semibold text-ink block mb-1">Nombre del Archivo Adjunto</label>
                  <input
                    type="text"
                    value={nombreArchivoEntrega}
                    onChange={(e) => setNombreArchivoEntrega(e.target.value)}
                    placeholder="Ej. Informe_Final_Feria_Grupo1.pdf"
                    className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink"
                  />
                  <span className="text-[10px] text-ink-faint mt-1 block">
                    Extensiones válidas: {selectedTareaForEntrega.tiposArchivosPermitidos}
                  </span>
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1">Comentario para el Docente</label>
                  <textarea
                    rows={3}
                    value={comentarioEstudiante}
                    onChange={(e) => setComentarioEstudiante(e.target.value)}
                    placeholder="Estimado docente, adjuntamos la propuesta revisada..."
                    className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setSelectedTareaForEntrega(null)}
                    className="px-4 py-2 border border-line rounded-xl text-ink hover:bg-paper-sunken"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviandoEntrega}
                    className="px-4 py-2 bg-accent text-white rounded-xl font-semibold hover:bg-accent-dark disabled:opacity-50"
                  >
                    {enviandoEntrega ? "Enviando..." : "Subir Trabajo"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL: REVISIÓN DE ENTREGAS (DOCENTE / JURADO)       */}
        {/* ==================================================== */}
        {selectedTareaForRevision && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-paper border border-line rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-ink">
                    Entregas: {selectedTareaForRevision.titulo}
                  </h3>
                  <span className="text-xs text-ink-soft">
                    Total: {entregasCurrentTarea.length} entregas registradas
                  </span>
                </div>
                <button onClick={() => setSelectedTareaForRevision(null)} className="text-ink-faint hover:text-ink">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {entregasCurrentTarea.length === 0 ? (
                <div className="py-12 text-center text-xs text-ink-soft">
                  Ningún estudiante ha realizado una entrega para esta tarea todavía.
                </div>
              ) : (
                <div className="space-y-3">
                  {entregasCurrentTarea.map((ent) => (
                    <div
                      key={ent.id}
                      className="bg-paper-sunken border border-line rounded-xl p-4 text-xs space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-ink block">{ent.estudianteNombre}</span>
                          <span className="text-[10px] text-ink-faint">{ent.estudianteEmail}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              ent.estado === "CALIFICADO"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {ent.estado}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedEntregaForCalificar(ent);
                              setNotaCalificacion(ent.calificacion ?? 100);
                              setFeedbackDocente(ent.retroalimentacion || "");
                            }}
                            className="px-3 py-1 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accent-dark transition-colors"
                          >
                            {ent.estado === "CALIFICADO" ? "Modificar Nota" : "Calificar"}
                          </button>
                        </div>
                      </div>

                      {ent.nombreArchivo && (
                        <div className="text-ink">
                          <span className="font-semibold">Archivo: </span>
                          <span className="underline text-blue-600">{ent.nombreArchivo}</span>
                        </div>
                      )}

                      {ent.comentarioEstudiante && (
                        <p className="text-ink-soft italic bg-paper p-2 rounded-lg border border-line">
                          &ldquo;{ent.comentarioEstudiante}&rdquo;
                        </p>
                      )}

                      {ent.calificacion !== undefined && ent.calificacion !== null && (
                        <div className="flex items-center gap-3 pt-1 border-t border-line text-ink font-semibold">
                          <span className="text-accent">Nota: {ent.calificacion} / {selectedTareaForRevision.puntajeMaximo}</span>
                          {ent.retroalimentacion && (
                            <span className="text-ink-soft font-normal">Feedback: {ent.retroalimentacion}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL: CALIFICAR ENTREGA (DOCENTE / JURADO)          */}
        {/* ==================================================== */}
        {selectedEntregaForCalificar && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-paper border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-serif text-base font-bold text-ink">
                  Calificar a {selectedEntregaForCalificar.estudianteNombre}
                </h3>
                <button onClick={() => setSelectedEntregaForCalificar(null)} className="text-ink-faint hover:text-ink">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCalificarEntrega} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-ink block mb-1">Calificación Numérica (0-100) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={notaCalificacion}
                    onChange={(e) => setNotaCalificacion(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink font-bold text-base"
                  />
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1">Retroalimentación Docente / Jurado</label>
                  <textarea
                    rows={4}
                    value={feedbackDocente}
                    onChange={(e) => setFeedbackDocente(e.target.value)}
                    placeholder="Excelente desarrollo metodológico, se sugiere profundizar en el marco teórico..."
                    className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setSelectedEntregaForCalificar(null)}
                    className="px-4 py-2 border border-line rounded-xl text-ink hover:bg-paper-sunken"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoNota}
                    className="px-4 py-2 bg-accent text-white rounded-xl font-semibold hover:bg-accent-dark disabled:opacity-50"
                  >
                    {guardandoNota ? "Guardando..." : "Guardar Nota"}
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
