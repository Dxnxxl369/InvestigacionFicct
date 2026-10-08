import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Users,
  Search,
  Tag,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Download,
  History,
  BookOpen,
  Award,
  Check,
  ArrowLeft,
} from "lucide-react";
import {
  api,
  TareaDTO,
  EntregaTareaDTO,
  ConvocatoriaParticipanteDTO,
  SeguimientoTareaDTO,
  CalificarEntregaRequest,
  getMediaUrl,
} from "@/lib/api";
import { renderArchivoIcon, formatMoodleDate } from "../moodleUtils";

interface SpeedGraderPanelProps {
  tarea: TareaDTO;
  convocatoriaId: number;
  estudiantesAdmitidos: ConvocatoriaParticipanteDTO[];
  onVolver: () => void;
  onVerHistorialVersiones: (entregaId: number) => void;
  cargandoHistorial: boolean;
  onUpdateTareas: (tareas: TareaDTO[]) => void;
  toast: (text: string, type?: "success" | "error" | "info") => void;
}

export default function SpeedGraderPanel({
  tarea,
  convocatoriaId,
  estudiantesAdmitidos,
  onVolver,
  onVerHistorialVersiones,
  cargandoHistorial,
  onUpdateTareas,
  toast,
}: SpeedGraderPanelProps) {
  const [entregas, setEntregas] = useState<EntregaTareaDTO[]>([]);
  const [seguimiento, setSeguimiento] = useState<SeguimientoTareaDTO | null>(null);
  const [cargando, setCargando] = useState(true);

  const [selectedEstudianteId, setSelectedEstudianteId] = useState<number | null>(null);
  const [searchEstudiante, setSearchEstudiante] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "PENDIENTES" | "CALIFICADOS" | "SIN_ENTREGA">("TODOS");

  const [notaCalificacion, setNotaCalificacion] = useState<number>(tarea.puntajeMaximo || 100);
  const [feedbackDocente, setFeedbackDocente] = useState("");
  const [puntajesCriteriosInput, setPuntajesCriteriosInput] = useState<Record<number, number>>({});
  const [guardandoNota, setGuardandoNota] = useState(false);

  // Cargar entregas y seguimiento
  useEffect(() => {
    let cancel = false;
    setCargando(true);
    Promise.all([
      api.getSeguimiento(tarea.id).catch(() => null),
      api.getEntregasTarea(tarea.id).catch(() => [] as EntregaTareaDTO[]),
    ])
      .then(([segData, entregasData]) => {
        if (cancel) return;
        setSeguimiento(segData);
        setEntregas(entregasData);

        if (entregasData && entregasData.length > 0) {
          const primera = entregasData[0];
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
          const primerEst = estudiantesAdmitidos[0];
          if (primerEst) {
            setSelectedEstudianteId(primerEst.usuarioId);
            setNotaCalificacion(tarea.puntajeMaximo || 100);
            setFeedbackDocente("");
          }
        }
      })
      .finally(() => {
        if (!cancel) setCargando(false);
      });

    return () => {
      cancel = true;
    };
  }, [tarea.id]);

  // Manejar selección de estudiante
  const handleSelectEstudiante = (usuarioId: number) => {
    setSelectedEstudianteId(usuarioId);
    const ent = entregas.find((e) => e.estudianteId === usuarioId);
    if (ent) {
      setNotaCalificacion(
        ent.calificacion !== undefined && ent.calificacion !== null
          ? ent.calificacion
          : (tarea.puntajeMaximo || 100)
      );
      setFeedbackDocente(ent.retroalimentacion || "");

      if (tarea.rubrica && tarea.rubrica.length > 0) {
        const initScores: Record<number, number> = {};
        tarea.rubrica.forEach((c) => {
          const match = ent.puntajesCriterios?.find((pc: any) => pc.criterioId === c.id);
          initScores[c.id] = match ? match.puntaje : c.puntajeMaximo;
        });
        setPuntajesCriteriosInput(initScores);
      }
    } else {
      setNotaCalificacion(tarea.puntajeMaximo || 100);
      setFeedbackDocente("");
      if (tarea.rubrica && tarea.rubrica.length > 0) {
        const initScores: Record<number, number> = {};
        tarea.rubrica.forEach((c) => {
          initScores[c.id] = c.puntajeMaximo;
        });
        setPuntajesCriteriosInput(initScores);
      }
    }
  };

  // Navegar Anterior / Siguiente
  const handleNavegarEstudiante = (direccion: "anterior" | "siguiente") => {
    if (estudiantesFiltrados.length === 0) return;
    const currentIndex = estudiantesFiltrados.findIndex((e) => e.usuarioId === selectedEstudianteId);
    let nextIndex = 0;
    if (direccion === "anterior") {
      nextIndex = currentIndex <= 0 ? estudiantesFiltrados.length - 1 : currentIndex - 1;
    } else {
      nextIndex = currentIndex >= estudiantesFiltrados.length - 1 ? 0 : currentIndex + 1;
    }
    const nextEst = estudiantesFiltrados[nextIndex];
    if (nextEst) {
      handleSelectEstudiante(nextEst.usuarioId);
    }
  };

  // Descargar archivo autenticado
  const handleDescargarArchivo = async (archivoUrl: string, nombreArchivo: string) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const fullUrl = getMediaUrl(archivoUrl);
      const res = await fetch(fullUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(getMediaUrl(archivoUrl), "_blank");
    }
  };

  // Guardar calificación
  const handleGuardarCalificacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstudianteId) return;

    const ent = entregas.find((item) => item.estudianteId === selectedEstudianteId);
    if (!ent) {
      toast("No se puede calificar: el estudiante no registra ninguna entrega.", "error");
      return;
    }

    const tieneRubrica = Boolean(tarea.rubrica && tarea.rubrica.length > 0);
    let req: CalificarEntregaRequest;

    if (tieneRubrica) {
      const criterios = tarea.rubrica!;
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
      if (isNaN(nota) || nota < 0 || nota > (tarea.puntajeMaximo || 100)) {
        toast(`La calificación debe estar entre 0 y ${tarea.puntajeMaximo || 100} pts.`, "error");
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

      try {
        const [refreshedSeg, refreshedEntregas, updatedTareas] = await Promise.all([
          api.getSeguimiento(tarea.id).catch(() => null),
          api.getEntregasTarea(tarea.id).catch(() => []),
          api.getTareasConvocatoria(convocatoriaId).catch(() => []),
        ]);

        if (refreshedSeg) setSeguimiento(refreshedSeg);
        if (refreshedEntregas.length > 0) setEntregas(refreshedEntregas);
        if (updatedTareas.length > 0) onUpdateTareas(updatedTareas);
      } catch {
        setEntregas((prev) =>
          prev.map((item) => (item.id === calificada.id ? calificada : item))
        );
      }
    } catch (err: any) {
      toast(err.message || "Error al calificar entrega", "error");
    } finally {
      setGuardandoNota(false);
    }
  };

  // Filtrado de estudiantes
  const totalEntregadas = entregas.filter((e) => e.estado === "ENTREGADO").length;
  const totalCalificadas = entregas.filter((e) => e.estado === "CALIFICADO").length;
  const totalSinEntrega = estudiantesAdmitidos.length - entregas.length;

  const estudiantesFiltrados = estudiantesAdmitidos.filter((est) => {
    const q = searchEstudiante.toLowerCase().trim();
    const matchSearch =
      !q ||
      est.nombre.toLowerCase().includes(q) ||
      (est.apellidos && est.apellidos.toLowerCase().includes(q)) ||
      est.email.toLowerCase().includes(q) ||
      (est.nombreEquipo && est.nombreEquipo.toLowerCase().includes(q));

    if (!matchSearch) return false;

    const ent = entregas.find((e) => e.estudianteId === est.usuarioId);
    if (filtroEstado === "PENDIENTES") return ent && ent.estado === "ENTREGADO";
    if (filtroEstado === "CALIFICADOS") return ent && ent.estado === "CALIFICADO";
    if (filtroEstado === "SIN_ENTREGA") return !ent;
    return true;
  });

  const selectedEstudianteObj = estudiantesAdmitidos.find((e) => e.usuarioId === selectedEstudianteId) || null;
  const selectedEntregaObj = entregas.find((e) => e.estudianteId === selectedEstudianteId) || null;

  return (
    <div className="space-y-6">
      {/* Barra superior de métricas */}
      <div className="bg-paper border border-line rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={onVolver}
              className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-accent font-medium mb-1 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a Tareas
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {tarea.esGrupal && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-paper-sunken text-ink border border-line uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-ink-soft" /> Tarea Grupal
                </span>
              )}
              {tarea.moduloTitulo && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-paper-sunken border border-line text-ink-soft">
                  {tarea.moduloTitulo}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-ink flex items-center gap-2">
              <FileText className="w-6 h-6 text-accent" /> {tarea.titulo}
            </h1>
            <p className="text-xs text-ink-soft">
              Puntaje Máximo: <strong>{tarea.puntajeMaximo} pts</strong> • Formatos permitidos: {tarea.tiposArchivosPermitidos}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="px-3 py-2 bg-paper-sunken border border-line rounded-xl text-center min-w-[80px]">
              <span className="text-[10px] text-ink-faint uppercase font-semibold block">Inscritos</span>
              <span className="text-base font-bold text-ink">{estudiantesAdmitidos.length}</span>
            </div>
            <div className="px-3 py-2 bg-paper-sunken border border-line rounded-xl text-center min-w-[80px]">
              <span className="text-[10px] text-ink-faint uppercase font-semibold block">Entregas</span>
              <span className="text-base font-bold text-ink">{entregas.length}</span>
            </div>
            <div className="px-3 py-2 bg-paper-sunken border border-line rounded-xl text-center min-w-[80px]">
              <span className="text-[10px] text-ink-faint uppercase font-semibold block">Por Calificar</span>
              <span className="text-base font-bold text-amber-700 dark:text-amber-400">{totalEntregadas}</span>
            </div>
            <div className="px-3 py-2 bg-paper-sunken border border-line rounded-xl text-center min-w-[80px]">
              <span className="text-[10px] text-ink-faint uppercase font-semibold block">Calificadas</span>
              <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">{totalCalificadas}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Directorio Izquierda + Mesa de Calificación Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar Directorio Estudiantes */}
        <div className="lg:col-span-4 bg-paper border border-line rounded-2xl flex flex-col overflow-hidden shadow-xs">
          <div className="p-4 border-b border-line space-y-3 bg-paper-sunken/40">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                <Users className="w-4 h-4 text-accent" /> Estudiantes ({estudiantesAdmitidos.length})
              </h3>
              {cargando && <span className="text-[10px] text-ink-faint">Cargando...</span>}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                placeholder="Buscar estudiante o equipo..."
                value={searchEstudiante}
                onChange={(e) => setSearchEstudiante(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-paper border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <button
                onClick={() => setFiltroEstado("TODOS")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  filtroEstado === "TODOS"
                    ? "bg-accent text-white"
                    : "bg-paper border border-line text-ink-soft hover:bg-paper-sunken"
                }`}
              >
                Todos ({estudiantesAdmitidos.length})
              </button>
              <button
                onClick={() => setFiltroEstado("PENDIENTES")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  filtroEstado === "PENDIENTES"
                    ? "bg-accent text-white"
                    : "bg-paper border border-line text-ink-soft hover:bg-paper-sunken"
                }`}
              >
                Por Calificar ({totalEntregadas})
              </button>
              <button
                onClick={() => setFiltroEstado("CALIFICADOS")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  filtroEstado === "CALIFICADOS"
                    ? "bg-accent text-white"
                    : "bg-paper border border-line text-ink-soft hover:bg-paper-sunken"
                }`}
              >
                Calificadas ({totalCalificadas})
              </button>
              <button
                onClick={() => setFiltroEstado("SIN_ENTREGA")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  filtroEstado === "SIN_ENTREGA"
                    ? "bg-accent text-white"
                    : "bg-paper border border-line text-ink-soft hover:bg-paper-sunken"
                }`}
              >
                Sin Entrega ({Math.max(0, totalSinEntrega)})
              </button>
            </div>

            {/* Progreso */}
            <div className="space-y-1 pt-1 border-t border-line">
              <div className="flex items-center justify-between text-[11px] text-ink-soft">
                <span>Progreso:</span>
                <strong className="text-ink">
                  {seguimiento?.resumen
                    ? `${seguimiento.resumen.calificados}/${seguimiento.resumen.totalEstudiantes}`
                    : `${totalCalificadas}/${estudiantesAdmitidos.length}`}{" "}
                  ({
                    estudiantesAdmitidos.length > 0
                      ? Math.round(
                          ((seguimiento?.resumen.calificados ?? totalCalificadas) /
                            ((seguimiento?.resumen.totalEstudiantes ?? estudiantesAdmitidos.length) || 1)) *
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
                            ((seguimiento?.resumen.calificados ?? totalCalificadas) /
                              ((seguimiento?.resumen.totalEstudiantes ?? estudiantesAdmitidos.length) || 1)) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Lista scrollable de estudiantes */}
          <div className="flex-1 overflow-y-auto divide-y divide-line max-h-[620px]">
            {estudiantesFiltrados.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-faint">
                No se encontraron estudiantes con los filtros seleccionados.
              </div>
            ) : (
              estudiantesFiltrados.map((est) => {
                const ent = entregas.find((e) => e.estudianteId === est.usuarioId);
                const isSelected = est.usuarioId === selectedEstudianteId;
                const esCalificada = ent && ent.estado === "CALIFICADO";
                const esPendiente = ent && ent.estado === "ENTREGADO";

                return (
                  <div
                    key={est.id}
                    onClick={() => handleSelectEstudiante(est.usuarioId)}
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
                        {(ent?.esGrupal || tarea.esGrupal) && ent?.entregadoPorNombre && (
                          <span className="text-[9px] text-ink-faint block truncate">
                            Envío: {ent.entregadoPorNombre}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right space-y-1">
                      {ent?.conRetraso && (
                        <span className="block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                          Con retraso
                        </span>
                      )}
                      {esCalificada ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          {ent.calificacion}/{tarea.puntajeMaximo} pts
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

        {/* Panel Derecho de Revisión y Calificación */}
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
                {tarea.fechaCorte && (
                  <div className="pt-2 text-xs text-ink-faint">
                    Fecha de corte definitivo: {formatMoodleDate(tarea.fechaCorte)}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Detalles del Envío */}
                <div className="bg-paper-sunken/50 border border-line rounded-2xl p-5 space-y-4">
                  {(tarea.esGrupal || selectedEntregaObj.esGrupal) && (
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
                        {formatMoodleDate(selectedEntregaObj.fechaEntrega)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {tarea.updatedAt && new Date(selectedEntregaObj.fechaEntrega) < new Date(tarea.updatedAt) && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1"
                          title={`Entregado antes de la última edición de plazos del docente (${formatMoodleDate(tarea.updatedAt)})`}
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

                  {/* Archivos adjuntos (soporta N archivos separados por coma) */}
                  {selectedEntregaObj.nombreArchivo && (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-ink-faint block">
                        Archivos Adjuntos Entregados
                      </span>
                      {selectedEntregaObj.archivoUrl?.includes(",") || selectedEntregaObj.nombreArchivo?.includes(",") ? (
                        selectedEntregaObj.archivoUrl?.split(",").map((rawUrl, idx) => {
                          const url = rawUrl.trim();
                          const nombres = selectedEntregaObj.nombreArchivo ? selectedEntregaObj.nombreArchivo.split(",") : [];
                          const nombre = (nombres[idx] || nombres[0] || `Archivo ${idx + 1}`).trim();
                          return (
                            <div
                              key={idx}
                              className="p-3 bg-paper rounded-xl border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-paper-sunken border border-line flex items-center justify-center shrink-0">
                                  {renderArchivoIcon(nombre, "w-4 h-4")}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-ink block truncate">{nombre}</span>
                                  <span className="text-[10px] text-ink-faint">
                                    Archivo #{idx + 1}
                                    {selectedEntregaObj.intentos && selectedEntregaObj.intentos > 1
                                      ? ` • Intento #${selectedEntregaObj.intentos}`
                                      : ""}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {url && (
                                  <button
                                    type="button"
                                    onClick={() => window.open(getMediaUrl(url), "_blank")}
                                    className="px-2.5 py-1.5 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <ExternalLink className="w-3 h-3 text-accent" /> Ver
                                  </button>
                                )}
                                {url && (
                                  <button
                                    type="button"
                                    onClick={() => handleDescargarArchivo(url, nombre)}
                                    className="px-2.5 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <Download className="w-3 h-3" /> Descargar
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
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
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-accent" /> Ver Archivo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const url = selectedEntregaObj.archivoUrl || selectedEntregaObj.nombreArchivo || "";
                                const nom = selectedEntregaObj.nombreArchivo || "entrega";
                                handleDescargarArchivo(url, nom);
                              }}
                              className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            >
                              <Download className="w-3.5 h-3.5" /> Descargar
                            </button>
                            {selectedEntregaObj.intentos && selectedEntregaObj.intentos > 1 && (
                              <button
                                type="button"
                                onClick={() => onVerHistorialVersiones(selectedEntregaObj.id)}
                                disabled={cargandoHistorial}
                                className="px-3 py-1.5 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <History className="w-3.5 h-3.5 text-accent" />
                                {cargandoHistorial ? "Cargando..." : "Historial"}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Documento de investigación vinculado */}
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

                {/* Formulario de Calificación */}
                <div className="bg-paper border border-line rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="border-b border-line pb-3 flex items-center justify-between">
                    <h3 className="text-sm font-serif font-bold text-ink flex items-center gap-2">
                      <Award className="w-4 h-4 text-accent" /> Calificación &amp; Rúbrica Pedagógica
                    </h3>
                    {selectedEntregaObj.calificacion !== undefined && selectedEntregaObj.calificacion !== null && (
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        Nota actual: {selectedEntregaObj.calificacion} / {tarea.puntajeMaximo}
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleGuardarCalificacion} className="space-y-4 text-xs">
                    {(tarea.esGrupal || selectedEntregaObj.esGrupal) && (
                      <div className="p-2.5 bg-accent/10 border border-accent/20 rounded-xl text-[11px] text-accent font-medium flex items-center gap-2">
                        <Users className="w-4 h-4 shrink-0" />
                        <span>
                          Evaluación en Equipo: La calificación y comentarios se sincronizarán para todos los integrantes de <strong>{selectedEntregaObj.grupoNombre || selectedEstudianteObj.nombreEquipo || "este equipo"}</strong>.
                        </span>
                      </div>
                    )}

                    {tarea.rubrica && tarea.rubrica.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-line">
                          <span className="font-bold text-ink text-xs">
                            Calificación por Criterios de Rúbrica
                          </span>
                          <span className="text-xs font-bold text-accent">
                            Total: {tarea.rubrica.reduce((acc, c) => acc + (Number(puntajesCriteriosInput[c.id]) || 0), 0)} / {tarea.puntajeMaximo} pts
                          </span>
                        </div>

                        <div className="space-y-3">
                          {tarea.rubrica.map((crit) => {
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
                            Calificación Obtenida (0 a {tarea.puntajeMaximo}) *
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={tarea.puntajeMaximo}
                              required
                              value={notaCalificacion}
                              onChange={(e) => setNotaCalificacion(Number(e.target.value))}
                              className="w-28 px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink font-bold text-lg text-center focus:outline-none focus:border-accent"
                            />
                            <span className="text-xs text-ink-faint font-semibold">
                              / {tarea.puntajeMaximo} puntos
                            </span>
                          </div>
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
    </div>
  );
}
