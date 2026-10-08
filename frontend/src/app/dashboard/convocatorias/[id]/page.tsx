"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import CollaborativeDocumentEditor from "@/components/CollaborativeDocumentEditor";
import { useAuth } from "@/context/AuthContext";
import {
  api,
  ConvocatoriaDTO,
  ConvocatoriaParticipanteDTO,
  TareaDTO,
  DocumentoDTO,
  User,
  getMediaUrl,
  ModuloDTO,
  GrupoDTO,
  GruposAreaResponse,
  ActividadGrupoDTO,
  VersionDTO,
  EntregaTareaDTO,
} from "@/lib/api";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  FolderKanban,
  BookOpen,
  Award,
  Info,
} from "lucide-react";

// Modales Moodle Modularizados
import EntregaTareaModal from "@/components/moodle/modals/EntregaTareaModal";
import CrearEditarTareaModal from "@/components/moodle/modals/CrearEditarTareaModal";
import CrearEditarModuloModal from "@/components/moodle/modals/CrearEditarModuloModal";
import HistorialVersionesModal from "@/components/moodle/modals/HistorialVersionesModal";
import DesignarMiembroModal from "@/components/moodle/modals/DesignarMiembroModal";
import InscripcionModal from "@/components/moodle/modals/InscripcionModal";
import RechazoIndividualModal from "@/components/moodle/modals/RechazoIndividualModal";
import RechazoLoteModal from "@/components/moodle/modals/RechazoLoteModal";
import PerfilUsuarioModal from "@/components/moodle/modals/PerfilUsuarioModal";
import CrearGrupoModal from "@/components/moodle/modals/CrearGrupoModal";
import GenerarLoteGruposModal from "@/components/moodle/modals/GenerarLoteGruposModal";
import CrearEditarActividadSeleccionModal from "@/components/moodle/modals/CrearEditarActividadSeleccionModal";

// Vistas y Pestañas Moodle Modularizadas
import SpeedGraderPanel from "@/components/moodle/tabs/SpeedGraderPanel";
import TareaDetalleView from "@/components/moodle/tabs/TareaDetalleView";
import TabTareas from "@/components/moodle/tabs/TabTareas";
import TabGrupos from "@/components/moodle/tabs/TabGrupos";
import TabParticipantes from "@/components/moodle/tabs/TabParticipantes";
import TabCalificaciones from "@/components/moodle/tabs/TabCalificaciones";
import TabInfo from "@/components/moodle/tabs/TabInfo";

export default function ConvocatoriaDetallePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const convocatoriaId = Number(params?.id);

  // Estados principales de datos
  const [convocatoria, setConvocatoria] = useState<ConvocatoriaDTO | null>(null);
  const [participantes, setParticipantes] = useState<ConvocatoriaParticipanteDTO[]>([]);
  const [tareas, setTareas] = useState<TareaDTO[]>([]);
  const [modulos, setModulos] = useState<ModuloDTO[]>([]);
  const [gruposArea, setGruposArea] = useState<GrupoDTO[]>([]);
  const [estudiantesSinEquipo, setEstudiantesSinEquipo] = useState<ConvocatoriaParticipanteDTO[]>([]);
  const [totalEstudiantesArea, setTotalEstudiantesArea] = useState<number>(0);
  const [totalConEquipoArea, setTotalConEquipoArea] = useState<number>(0);
  const [totalSinEquipoArea, setTotalSinEquipoArea] = useState<number>(0);
  const [actividadesGrupo, setActividadesGrupo] = useState<ActividadGrupoDTO[]>([]);
  const [actividadActiva, setActividadActiva] = useState<ActividadGrupoDTO | null>(null);
  const [documentosUsuario, setDocumentosUsuario] = useState<DocumentoDTO[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [todasLasEntregas, setTodasLasEntregas] = useState<Record<number, EntregaTareaDTO[]>>({});
  const [cargandoGradebook, setCargandoGradebook] = useState<boolean>(false);

  // Estados de carga y feedback
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const toast = useCallback((text: string, type: "success" | "error" | "info" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  }, []);

  // Navegación de pestañas y sincronización con URL
  const [activeTab, setActiveTab] = useState<"tareas" | "grupos" | "participantes" | "calificaciones" | "info">("tareas");
  const [selectedModuloId, setSelectedModuloId] = useState<number | null>(null);
  const [activeTareaDetalle, setActiveTareaDetalle] = useState<TareaDTO | null>(null);
  const [activeTareaParaEntregas, setActiveTareaParaEntregas] = useState<TareaDTO | null>(null);

  const updateUrlParams = useCallback(
    (newParams: { tab?: string; modulo?: number | null; tarea?: number | null; entregas?: number | null }) => {
      const p = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([k, v]) => {
        if (v === null || v === undefined) {
          p.delete(k);
        } else {
          p.set(k, String(v));
        }
      });
      router.replace(`/dashboard/convocatorias/${convocatoriaId}?${p.toString()}`, { scroll: false });
    },
    [searchParams, router, convocatoriaId]
  );

  const handleCambiarTab = useCallback(
    (tab: "tareas" | "grupos" | "participantes" | "calificaciones" | "info") => {
      setActiveTab(tab);
      setActiveTareaDetalle(null);
      setActiveTareaParaEntregas(null);
      updateUrlParams({ tab, tarea: null, entregas: null });
    },
    [updateUrlParams]
  );

  // Modales
  const [showSubirEntregaModal, setShowSubirEntregaModal] = useState(false);
  const [tareaParaEntrega, setTareaParaEntrega] = useState<TareaDTO | null>(null);

  const [showCreateTareaModal, setShowCreateTareaModal] = useState(false);
  const [tareaEditing, setTareaEditing] = useState<TareaDTO | null>(null);
  const [tareaModuloIdDefault, setTareaModuloIdDefault] = useState<number | null>(null);
  const [documentoColaborativoActivo, setDocumentoColaborativoActivo] = useState<DocumentoDTO | null>(null);
  const [abriendoDocumentoColaborativo, setAbriendoDocumentoColaborativo] = useState<number | null>(null);

  const [showModuloModal, setShowModuloModal] = useState(false);
  const [moduloEditing, setModuloEditing] = useState<ModuloDTO | null>(null);

  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [historialVersiones, setHistorialVersiones] = useState<VersionDTO[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const [showDesignarModal, setShowDesignarModal] = useState(false);
  const [showInscripcionModal, setShowInscripcionModal] = useState(false);

  const [showCrearGrupoModal, setShowCrearGrupoModal] = useState(false);
  const [showGenerarLoteModal, setShowGenerarLoteModal] = useState(false);

  const [showCrearActividadModal, setShowCrearActividadModal] = useState(false);
  const [actividadEditing, setActividadEditing] = useState<ActividadGrupoDTO | null>(null);

  const [showRechazoIndividualModal, setShowRechazoIndividualModal] = useState(false);
  const [solicitudRechazoIndividual, setSolicitudRechazoIndividual] = useState<ConvocatoriaParticipanteDTO | null>(null);

  const [showRechazoLoteModal, setShowRechazoLoteModal] = useState(false);
  const [selectedSolicitudesLote, setSelectedSolicitudesLote] = useState<number[]>([]);

  const [perfilUsuarioModalId, setPerfilUsuarioModalId] = useState<number | null>(null);
  const [perfilUsuarioModalData, setPerfilUsuarioModalData] = useState<any | null>(null);
  const [cargandoPerfilUsuario, setCargandoPerfilUsuario] = useState(false);

  // Estados de interacción en pestaña Grupos
  const [selectedGrupoRadioId, setSelectedGrupoRadioId] = useState<number | null>(null);
  const [ocultarMiembros, setOcultarMiembros] = useState<boolean>(false);
  const [procesandoEleccion, setProcesandoEleccion] = useState<boolean>(false);
  const [asignandoParticipanteId, setAsignandoParticipanteId] = useState<number | null>(null);

  // Estados de interacción en pestaña Participantes
  const [searchParticipante, setSearchParticipante] = useState("");
  const [filtroParticipanteRol, setFiltroParticipanteRol] = useState<string>("TODOS");
  const [procesandoAdmision, setProcesandoAdmision] = useState(false);

  // Estados de interacción en pestaña Calificaciones
  const [searchGradebookEstudiante, setSearchGradebookEstudiante] = useState("");

  // Permisos y roles
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

  // Carga de datos centralizada
  const cargarDatos = useCallback(async () => {
    if (!convocatoriaId) return;
    try {
      setLoading(true);

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

      const [partsData, tareasData, modulosData, gruposData, actsGrupoData] = await Promise.all([
        api.getParticipantesConvocatoria(convocatoriaId).catch(() => [] as ConvocatoriaParticipanteDTO[]),
        api.getTareasConvocatoria(convocatoriaId).catch(() => [] as TareaDTO[]),
        api.getModulosConvocatoria(convocatoriaId).catch(() => [] as ModuloDTO[]),
        api.getGruposArea(convocatoriaId).catch(() => null as GruposAreaResponse | null),
        api.getActividadesGrupo(convocatoriaId).catch(() => [] as ActividadGrupoDTO[]),
      ]);

      setParticipantes(partsData || []);
      setTareas(tareasData || []);
      setModulos(modulosData || []);

      // Restauración de estado según query params
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
            if (tEncontrada.moduloId) setSelectedModuloId(tEncontrada.moduloId);
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
                if (updated.grupoSeleccionadoId) setSelectedGrupoRadioId(updated.grupoSeleccionadoId);
                return updated;
              }
            }
            const act = actsGrupoData[0];
            if (act.grupoSeleccionadoId) setSelectedGrupoRadioId(act.grupoSeleccionadoId);
            return act;
          });
        }
      }

      if (user?.rol === "ESTUDIANTE") {
        api.getDocumentos().then(setDocumentosUsuario).catch(() => {});
      }

      if (esAdmin) {
        api.getUsers().then(setAllUsers).catch(() => {});
      } else if (user?.rol === "DOCENTE") {
        api.getEncargadosDisponibles().then((enc) => {
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
        }).catch(() => {});
      }
    } catch (err: any) {
      toast(err.message || "Error al cargar los datos del área", "error");
    } finally {
      setLoading(false);
    }
  }, [convocatoriaId, user?.rol, user?.id, esAdmin, toast, searchParams]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Cargar calificaciones para el Gradebook
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

  useEffect(() => {
    if (activeTab === "calificaciones" && puedeGestionarTareas && tareas.length > 0) {
      cargarTodasLasEntregas();
    }
  }, [activeTab, puedeGestionarTareas, tareas, cargarTodasLasEntregas]);

  // Handlers para Tareas
  const handleToggleHabilitarTarea = async (tareaId: number) => {
    try {
      const updated = await api.toggleHabilitarTarea(tareaId);
      setTareas((prev) => prev.map((t) => (t.id === tareaId ? { ...t, habilitada: updated.habilitada, estadoMoodle: updated.estadoMoodle } : t)));
      setActiveTareaDetalle((prev) => (prev?.id === tareaId ? { ...prev, habilitada: updated.habilitada, estadoMoodle: updated.estadoMoodle } : prev));
      toast(`Recepción de entregas ${updated.habilitada ? "habilitada" : "deshabilitada"} en vivo`, "success");
    } catch (err: any) {
      toast(err.message || "Error al conmutar estado de habilitación", "error");
    }
  };

  const handleVerHistorialVersiones = async (entregaId: number) => {
    try {
      setCargandoHistorial(true);
      const historial = await api.getHistorial(entregaId);
      setHistorialVersiones(historial);
      setShowHistorialModal(true);
    } catch (err: any) {
      toast(err.message || "Error al cargar historial de versiones", "error");
    } finally {
      setCargandoHistorial(false);
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

  // Handlers para Módulos
  const handleEliminarModulo = async (modId: number) => {
    if (!confirm("¿Estás seguro de eliminar este módulo? Las tareas dentro del módulo no se eliminarán, pasarán a ser tareas generales fuera de módulos.")) {
      return;
    }
    try {
      await api.deleteModulo(modId);
      toast("Módulo eliminado con éxito", "success");
      if (selectedModuloId === modId) setSelectedModuloId(null);
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

  // Handlers para Grupos
  const handleGuardarEleccionGrupo = async (actividadId: number) => {
    if (!selectedGrupoRadioId) {
      toast("Por favor selecciona un grupo antes de guardar", "error");
      return;
    }
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

  // Handlers para Participantes
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

  const handleAbrirPerfilParticipante = async (usuarioId: number) => {
    setPerfilUsuarioModalId(usuarioId);
    try {
      setCargandoPerfilUsuario(true);
      const perfil = await api.getPerfilPublico(usuarioId);
      setPerfilUsuarioModalData(perfil);
    } catch (err: any) {
      toast(err.message || "Error al cargar la ficha del participante", "error");
      setPerfilUsuarioModalId(null);
    } finally {
      setCargandoPerfilUsuario(false);
    }
  };

  // Handler para exportar Calificaciones CSV
  const handleExportarCalificacionesCSV = () => {
    const estudiantesAdmitidos = participantes.filter(
      (p) => p.rol === "ESTUDIANTE" && p.estadoInscripcion === "ACEPTADO"
    );
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

  // Filtrado de participantes para TabParticipantes
  const participantesAceptados = participantes.filter((p) => p.estadoInscripcion === "ACEPTADO");
  const solicitudesPendientes = participantes.filter((p) => p.rol === "ESTUDIANTE" && p.estadoInscripcion === "PENDIENTE");
  const estudiantesAdmitidos = participantes.filter((p) => p.rol === "ESTUDIANTE" && p.estadoInscripcion === "ACEPTADO");

  const participantesFiltrados = participantesAceptados.filter((p) => {
    const matchRol = filtroParticipanteRol === "TODOS" || p.rol === filtroParticipanteRol;
    const matchSearch =
      searchParticipante.trim() === "" ||
      `${p.nombre} ${p.apellidos}`.toLowerCase().includes(searchParticipante.toLowerCase()) ||
      p.email.toLowerCase().includes(searchParticipante.toLowerCase()) ||
      Boolean(p.nombreEquipo && p.nombreEquipo.toLowerCase().includes(searchParticipante.toLowerCase()));
    return matchRol && matchSearch;
  });

  const conteoDocentes = participantesAceptados.filter((p) => p.rol === "DOCENTE").length;
  const conteoJurados = participantesAceptados.filter((p) => p.rol === "JURADO").length;
  const conteoEstudiantes = participantesAceptados.filter((p) => p.rol === "ESTUDIANTE").length;

  const estudiantesFiltradosGradebook = estudiantesAdmitidos.filter((est) => {
    if (!searchGradebookEstudiante.trim()) return true;
    const q = searchGradebookEstudiante.toLowerCase();
    return (
      `${est.nombre} ${est.apellidos || ""}`.toLowerCase().includes(q) ||
      est.email.toLowerCase().includes(q) ||
      Boolean(est.nombreEquipo && est.nombreEquipo.toLowerCase().includes(q))
    );
  });

  const currentUserName = `${user?.nombre || ""} ${user?.apellido || ""}`.trim() || user?.email;
  const documentoColaborativoOverlay = documentoColaborativoActivo ? (
    <CollaborativeDocumentEditor
      documento={documentoColaborativoActivo}
      currentUserName={currentUserName}
      onClose={() => setDocumentoColaborativoActivo(null)}
      onSaved={(documento) => setDocumentoColaborativoActivo(documento)}
    />
  ) : null;

  // Pantallas de Carga y Error
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

  // Vista SpeedGrader Dedicado (Pantalla Completa de Calificación)
  if (activeTareaParaEntregas) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-6 pb-16">
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

          <SpeedGraderPanel
            tarea={activeTareaParaEntregas}
            convocatoriaId={convocatoriaId}
            estudiantesAdmitidos={estudiantesAdmitidos}
            onVolver={() => {
              setActiveTareaParaEntregas(null);
              updateUrlParams({ entregas: null });
            }}
            onVerHistorialVersiones={handleVerHistorialVersiones}
            cargandoHistorial={cargandoHistorial}
            onUpdateTareas={(updatedTareas) => setTareas(updatedTareas)}
            toast={toast}
          />
        </div>
      </DashboardLayout>
    );
  }

  // Vista Detallada de Tarea Académica (image.png)
  if (activeTareaDetalle) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-6 pb-16">
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

          <TareaDetalleView
            tarea={activeTareaDetalle}
            convocatoria={convocatoria}
            estudiantesAdmitidos={estudiantesAdmitidos}
            puedeGestionarTareas={puedeGestionarTareas}
            esJuradoEnEstaArea={esJuradoEnEstaArea}
            onVolver={() => {
              setActiveTareaDetalle(null);
              updateUrlParams({ tarea: null });
            }}
            onAbrirEntregaModal={(t) => {
              setTareaParaEntrega(t);
              setShowSubirEntregaModal(true);
            }}
            onAbrirEditarTarea={(t) => {
              setTareaEditing(t);
              setShowCreateTareaModal(true);
            }}
            onAbrirDocumentoColaborativo={handleAbrirDocumentoColaborativo}
            abriendoDocumentoColaborativo={abriendoDocumentoColaborativo}
            onToggleHabilitar={handleToggleHabilitarTarea}
            onVerEntregas={(t) => {
              setActiveTareaParaEntregas(t);
              updateUrlParams({ entregas: t.id });
            }}
            onVerHistorialVersiones={handleVerHistorialVersiones}
          />
        </div>

        {/* Modal de Entrega flotante en vista Tarea */}
        {showSubirEntregaModal && tareaParaEntrega && (
          <EntregaTareaModal
            tarea={tareaParaEntrega}
            convocatoriaId={convocatoriaId}
            user={user}
            documentosUsuario={documentosUsuario}
            gruposArea={gruposArea}
            actividadesGrupo={actividadesGrupo}
            onClose={() => {
              setShowSubirEntregaModal(false);
              setTareaParaEntrega(null);
            }}
            onSuccess={(updatedTareas) => {
              setTareas(updatedTareas);
              if (activeTareaDetalle) {
                const refreshed = updatedTareas.find((t) => t.id === activeTareaDetalle.id);
                if (refreshed) setActiveTareaDetalle(refreshed);
              }
            }}
            onNavigateToGrupos={() => handleCambiarTab("grupos")}
            toast={toast}
          />
        )}

        {/* Modal de Historial flotante en vista Tarea */}
        {showHistorialModal && (
          <HistorialVersionesModal
            versiones={historialVersiones}
            onClose={() => setShowHistorialModal(false)}
          />
        )}
        {documentoColaborativoOverlay}
      </DashboardLayout>
    );
  }

  // Vista Principal de la Convocatoria / Aula Virtual
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
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 text-xs text-ink-soft">
                    <div className="flex items-center gap-1.5 font-medium">
                      <FolderKanban className="w-4 h-4 text-accent" />
                      <span>{modulos.length} módulos</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <BookOpen className="w-4 h-4 text-accent" />
                      <span>{tareas.length} tareas</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>{participantes.filter((p) => p.estadoInscripcion === "ACEPTADO").length} participantes</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>{gruposArea.length} grupos</span>
                    </div>
                  </div>
                </div>

                {/* Acciones principales de inscripción o gestión */}
                <div className="flex items-center gap-3 shrink-0">
                  {user?.rol === "ESTUDIANTE" && !esEstudianteInscrito && convocatoria.estado !== "FINALIZADA" && (
                    <button
                      onClick={() => setShowInscripcionModal(true)}
                      className="px-5 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      {esEstudianteRechazado ? "Volver a Postular" : "Inscribirme al Área"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Pestañas estilo Moodle LMS */}
        <div className="border-b border-line flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => handleCambiarTab("tareas")}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "tareas"
                ? "border-accent text-accent bg-accent/5"
                : "border-transparent text-ink-soft hover:text-ink hover:border-line"
            }`}
          >
            <FolderKanban className="w-4 h-4" /> Módulos y Tareas
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-paper-sunken border border-line text-ink-faint">
              {tareas.length}
            </span>
          </button>

          <button
            onClick={() => handleCambiarTab("grupos")}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "grupos"
                ? "border-accent text-accent bg-accent/5"
                : "border-transparent text-ink-soft hover:text-ink hover:border-line"
            }`}
          >
            <Users className="w-4 h-4" /> Grupos y Elección
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold">
              {gruposArea.length}
            </span>
          </button>

          <button
            onClick={() => handleCambiarTab("participantes")}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "participantes"
                ? "border-accent text-accent bg-accent/5"
                : "border-transparent text-ink-soft hover:text-ink hover:border-line"
            }`}
          >
            <Users className="w-4 h-4" /> Participantes
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-paper-sunken border border-line text-ink-faint">
              {participantesAceptados.length}
            </span>
            {puedeAdmitirEstudiantes && solicitudesPendientes.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse">
                {solicitudesPendientes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleCambiarTab("calificaciones")}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "calificaciones"
                ? "border-accent text-accent bg-accent/5"
                : "border-transparent text-ink-soft hover:text-ink hover:border-line"
            }`}
          >
            <Award className="w-4 h-4" /> Calificaciones
          </button>

          <button
            onClick={() => handleCambiarTab("info")}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "info"
                ? "border-accent text-accent bg-accent/5"
                : "border-transparent text-ink-soft hover:text-ink hover:border-line"
            }`}
          >
            <Info className="w-4 h-4" /> Información y Bases
          </button>
        </div>

        {/* Contenido Dinámico de la Pestaña Activa */}
        {activeTab === "tareas" && (
          <TabTareas
            user={user}
            convocatoria={convocatoria}
            miParticipacion={miParticipacion || null}
            esEstudianteInscrito={esEstudianteInscrito}
            esEstudiantePendiente={esEstudiantePendiente}
            esEstudianteRechazado={esEstudianteRechazado}
            puedeGestionarTareas={puedeGestionarTareas}
            tareas={tareas}
            modulos={modulos}
            actividadesGrupo={actividadesGrupo}
            selectedModuloId={selectedModuloId}
            setSelectedModuloId={setSelectedModuloId}
            onSelectTarea={(t) => setActiveTareaDetalle(t)}
            onAbrirCrearTarea={(modId) => {
              setTareaEditing(null);
              setTareaModuloIdDefault(modId !== undefined ? modId : null);
              setShowCreateTareaModal(true);
            }}
            onAbrirEditarTarea={(t) => {
              setTareaEditing(t);
              setShowCreateTareaModal(true);
            }}
            onAbrirDocumentoColaborativo={handleAbrirDocumentoColaborativo}
            abriendoDocumentoColaborativo={abriendoDocumentoColaborativo}
            onAbrirCrearModulo={() => {
              setModuloEditing(null);
              setShowModuloModal(true);
            }}
            onAbrirEditarModulo={(m) => {
              setModuloEditing(m);
              setShowModuloModal(true);
            }}
            onEliminarModulo={handleEliminarModulo}
            onDeclinarSolicitudPropia={handleDeclinarSolicitudPropia}
            onAbrirInscripcionModal={() => setShowInscripcionModal(true)}
            onSeleccionarActividadGrupo={(act) => {
              setActividadActiva(act);
              setSelectedGrupoRadioId(act.grupoSeleccionadoId || null);
              handleCambiarTab("grupos");
            }}
            updateUrlParams={updateUrlParams}
          />
        )}
        {documentoColaborativoOverlay}

        {activeTab === "grupos" && (
          <TabGrupos
            user={user}
            convocatoria={convocatoria}
            esEstudianteInscrito={esEstudianteInscrito}
            esEstudiantePendiente={esEstudiantePendiente}
            puedeGestionarTareas={puedeGestionarTareas}
            gruposArea={gruposArea}
            actividadesGrupo={actividadesGrupo}
            actividadActiva={actividadActiva}
            setActividadActiva={setActividadActiva}
            totalEstudiantesArea={totalEstudiantesArea}
            totalConEquipoArea={totalConEquipoArea}
            totalSinEquipoArea={totalSinEquipoArea}
            estudiantesSinEquipo={estudiantesSinEquipo}
            selectedGrupoRadioId={selectedGrupoRadioId}
            setSelectedGrupoRadioId={setSelectedGrupoRadioId}
            ocultarMiembros={ocultarMiembros}
            setOcultarMiembros={setOcultarMiembros}
            procesandoEleccion={procesandoEleccion}
            asignandoParticipanteId={asignandoParticipanteId}
            onGuardarEleccionGrupo={handleGuardarEleccionGrupo}
            onAnularEleccionGrupo={handleAnularEleccionGrupo}
            onAbrirCrearActividad={() => {
              setActividadEditing(null);
              setShowCrearActividadModal(true);
            }}
            onAbrirEditarActividad={(act) => {
              setActividadEditing(act);
              setShowCrearActividadModal(true);
            }}
            onAbrirCrearGrupoModal={() => setShowCrearGrupoModal(true)}
            onAbrirGenerarLoteModal={() => setShowGenerarLoteModal(true)}
            onEliminarGrupo={handleEliminarGrupo}
            onAsignarEstudianteAGrupo={handleAsignarEstudianteAGrupo}
            onRemoverEstudianteDeGrupo={handleRemoverEstudianteDeGrupo}
          />
        )}

        {activeTab === "participantes" && (
          <TabParticipantes
            user={user}
            convocatoria={convocatoria}
            esEstudianteInscrito={esEstudianteInscrito}
            esEstudiantePendiente={esEstudiantePendiente}
            esAdmin={esAdmin}
            puedeAdmitirEstudiantes={puedeAdmitirEstudiantes}
            puedeDesignarJurado={puedeDesignarJurado}
            participantes={participantes}
            participantesFiltrados={participantesFiltrados}
            solicitudesPendientes={solicitudesPendientes}
            selectedSolicitudesLote={selectedSolicitudesLote}
            setSelectedSolicitudesLote={setSelectedSolicitudesLote}
            searchParticipante={searchParticipante}
            setSearchParticipante={setSearchParticipante}
            filtroParticipanteRol={filtroParticipanteRol}
            setFiltroParticipanteRol={setFiltroParticipanteRol}
            conteoDocentes={conteoDocentes}
            conteoJurados={conteoJurados}
            conteoEstudiantes={conteoEstudiantes}
            procesandoAdmision={procesandoAdmision}
            onAdmitir={handleAdmitir}
            onAdmitirLote={handleAdmitirLote}
            onOpenRechazoIndividual={(sol) => {
              setSolicitudRechazoIndividual(sol);
              setShowRechazoIndividualModal(true);
            }}
            onOpenRechazoLote={() => setShowRechazoLoteModal(true)}
            onOpenDesignarModal={() => setShowDesignarModal(true)}
            onRemoverParticipante={handleRemoverParticipante}
            onAbrirPerfilParticipante={handleAbrirPerfilParticipante}
          />
        )}

        {activeTab === "calificaciones" && (
          <TabCalificaciones
            user={user}
            convocatoria={convocatoria}
            esEstudianteInscrito={esEstudianteInscrito}
            esEstudiantePendiente={esEstudiantePendiente}
            esEstudianteRechazado={esEstudianteRechazado}
            tareas={tareas}
            estudiantesAdmitidos={estudiantesAdmitidos}
            estudiantesFiltradosGradebook={estudiantesFiltradosGradebook}
            todasLasEntregas={todasLasEntregas}
            cargandoGradebook={cargandoGradebook}
            searchGradebookEstudiante={searchGradebookEstudiante}
            setSearchGradebookEstudiante={setSearchGradebookEstudiante}
            onExportarCalificacionesCSV={handleExportarCalificacionesCSV}
            onCargarTodasLasEntregas={cargarTodasLasEntregas}
            onSelectTarea={(t) => setActiveTareaDetalle(t)}
            updateUrlParams={updateUrlParams}
          />
        )}

        {activeTab === "info" && <TabInfo convocatoria={convocatoria} />}

        {/* Modales Compartidos */}
        {showSubirEntregaModal && tareaParaEntrega && (
          <EntregaTareaModal
            tarea={tareaParaEntrega}
            convocatoriaId={convocatoriaId}
            user={user}
            documentosUsuario={documentosUsuario}
            gruposArea={gruposArea}
            actividadesGrupo={actividadesGrupo}
            onClose={() => {
              setShowSubirEntregaModal(false);
              setTareaParaEntrega(null);
            }}
            onSuccess={(updatedTareas) => {
              setTareas(updatedTareas);
            }}
            onNavigateToGrupos={() => handleCambiarTab("grupos")}
            toast={toast}
          />
        )}

        <CrearEditarTareaModal
          isOpen={showCreateTareaModal}
          onClose={() => {
            setShowCreateTareaModal(false);
            setTareaEditing(null);
            setTareaModuloIdDefault(null);
          }}
          convocatoriaId={convocatoriaId}
          tareaEditing={tareaEditing}
          moduloIdDefault={tareaModuloIdDefault}
          modulos={modulos}
          actividadesGrupo={actividadesGrupo}
          onSuccess={(updatedTareas, updatedTareaDetalle) => {
            setTareas(updatedTareas);
            if (updatedTareaDetalle) setActiveTareaDetalle(updatedTareaDetalle);
          }}
          toast={toast}
        />

        <CrearEditarModuloModal
          isOpen={showModuloModal}
          onClose={() => {
            setShowModuloModal(false);
            setModuloEditing(null);
          }}
          convocatoriaId={convocatoriaId}
          moduloEditing={moduloEditing}
          ordenSugerido={modulos.length + 1}
          onSuccess={(updatedModulos) => setModulos(updatedModulos)}
          toast={toast}
        />

        {showHistorialModal && (
          <HistorialVersionesModal
            versiones={historialVersiones}
            onClose={() => setShowHistorialModal(false)}
          />
        )}

        <DesignarMiembroModal
          isOpen={showDesignarModal}
          onClose={() => setShowDesignarModal(false)}
          convocatoriaId={convocatoriaId}
          esAdmin={esAdmin}
          allUsers={allUsers}
          onSuccess={cargarDatos}
          toast={toast}
        />

        <InscripcionModal
          isOpen={showInscripcionModal}
          onClose={() => setShowInscripcionModal(false)}
          convocatoria={convocatoria}
          onSuccess={cargarDatos}
          toast={toast}
        />

        <RechazoIndividualModal
          solicitud={solicitudRechazoIndividual}
          convocatoriaId={convocatoriaId}
          onClose={() => {
            setShowRechazoIndividualModal(false);
            setSolicitudRechazoIndividual(null);
          }}
          onSuccess={cargarDatos}
          toast={toast}
        />

        <RechazoLoteModal
          isOpen={showRechazoLoteModal}
          onClose={() => {
            setShowRechazoLoteModal(false);
            setSelectedSolicitudesLote([]);
          }}
          convocatoriaId={convocatoriaId}
          selectedSolicitudesLote={selectedSolicitudesLote}
          onSuccess={cargarDatos}
          toast={toast}
        />

        <CrearGrupoModal
          isOpen={showCrearGrupoModal}
          onClose={() => setShowCrearGrupoModal(false)}
          convocatoriaId={convocatoriaId}
          actividadActiva={actividadActiva}
          onSuccess={cargarDatos}
          toast={toast}
        />

        <GenerarLoteGruposModal
          isOpen={showGenerarLoteModal}
          onClose={() => setShowGenerarLoteModal(false)}
          convocatoriaId={convocatoriaId}
          actividadActiva={actividadActiva}
          onSuccess={cargarDatos}
          toast={toast}
        />

        <CrearEditarActividadSeleccionModal
          isOpen={showCrearActividadModal}
          onClose={() => {
            setShowCrearActividadModal(false);
            setActividadEditing(null);
          }}
          convocatoriaId={convocatoriaId}
          editingActividad={actividadEditing}
          onSuccess={async (act) => {
            setActividadActiva(act);
            await cargarDatos();
          }}
          toast={toast}
        />

        <PerfilUsuarioModal
          usuarioId={perfilUsuarioModalId}
          perfilData={perfilUsuarioModalData}
          cargando={cargandoPerfilUsuario}
          onClose={() => {
            setPerfilUsuarioModalId(null);
            setPerfilUsuarioModalData(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
