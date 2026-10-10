"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { api, ConvocatoriaDTO, getMediaUrl } from "@/lib/api";
import {
  PlusCircle,
  Search,
  CheckCircle2,
  ArrowUpRight,
  Filter,
  Users,
  Calendar,
  AlertCircle,
  Pencil,
  Clock,
  XCircle,
  ShieldCheck,
  Award,
  GraduationCap,
  Trash2,
  Archive,
} from "lucide-react";
import ConfirmarEliminacionModal from "@/components/moodle/modals/ConfirmarEliminacionModal";

export default function ConvocatoriasListPage() {
  const { user, canEditModule } = useAuth();
  const [convocatorias, setConvocatorias] = useState<ConvocatoriaDTO[]>([]);
  const [filtered, setFiltered] = useState<ConvocatoriaDTO[]>([]);
  const [misAreasMap, setMisAreasMap] = useState<Record<number, ConvocatoriaDTO>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODAS");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal para solicitar inscripción (Estudiante)
  const [selectedConvForInscripcion, setSelectedConvForInscripcion] = useState<ConvocatoriaDTO | null>(null);
  const [nombreEquipo, setNombreEquipo] = useState("");
  const [inscribiendo, setInscribiendo] = useState(false);

  // Modal para eliminar o archivar área (Admin)
  const [convocatoriaAEliminar, setConvocatoriaAEliminar] = useState<ConvocatoriaDTO | null>(null);
  const [eliminandoConv, setEliminandoConv] = useState(false);

  const fetchConvocatorias = useCallback(async () => {
    try {
      setLoading(true);
      const [data, misAreas] = await Promise.all([
        api.getConvocatorias(),
        user ? api.getMisAreas().catch(() => []) : Promise.resolve([]),
      ]);

      setConvocatorias(data);
      setFiltered(data);

      const map: Record<number, ConvocatoriaDTO> = {};
      misAreas.forEach((a) => {
        map[a.id] = a;
      });
      setMisAreasMap(map);
    } catch (err: any) {
      setError(err.message || "Error al cargar las convocatorias");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConvocatorias();
  }, [fetchConvocatorias]);

  // Filter effect
  useEffect(() => {
    let list = [...convocatorias];

    if (statusFilter !== "TODAS") {
      list = list.filter((c) => c.estado === statusFilter);
    }

    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.titulo.toLowerCase().includes(q) ||
          c.descripcion?.toLowerCase().includes(q) ||
          c.tipo.toLowerCase().includes(q)
      );
    }

    setFiltered(list);
  }, [searchTerm, statusFilter, convocatorias]);

  const handlePublicar = async (id: number) => {
    try {
      setActionLoading(id);
      await api.publicarConvocatoria(id);
      setActionSuccess(`¡Convocatoria #${id} publicada exitosamente! Ya es visible en el portal público.`);
      await fetchConvocatorias();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "No se pudo publicar la convocatoria");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmarEliminarConvocatoria = async () => {
    if (!convocatoriaAEliminar) return;
    try {
      setEliminandoConv(true);
      await api.deleteConvocatoria(convocatoriaAEliminar.id, true);
      setActionSuccess("Área o convocatoria eliminada exitosamente.");
      setConvocatoriaAEliminar(null);
      await fetchConvocatorias();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Error al eliminar el área.");
    } finally {
      setEliminandoConv(false);
    }
  };

  const handleArchivarDesdeListado = async (convId?: number) => {
    const id = convId || convocatoriaAEliminar?.id;
    if (!id) return;
    try {
      setEliminandoConv(true);
      await api.archivarConvocatoria(id);
      setActionSuccess("Área o convocatoria archivada exitosamente.");
      setConvocatoriaAEliminar(null);
      await fetchConvocatorias();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Error al archivar el área.");
    } finally {
      setEliminandoConv(false);
    }
  };

  const handleSolicitarInscripcion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvForInscripcion) return;
    try {
      setInscribiendo(true);
      await api.inscribirseConvocatoria(selectedConvForInscripcion.id, {
        nombreEquipo: nombreEquipo.trim() || undefined,
      });
      setActionSuccess("¡Solicitud de inscripción enviada con éxito! Está en espera de admisión por el docente o admin.");
      setSelectedConvForInscripcion(null);
      setNombreEquipo("");
      await fetchConvocatorias();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "No se pudo enviar la solicitud");
      setTimeout(() => setError(null), 4000);
    } finally {
      setInscribiendo(false);
    }
  };

  const handleDeclinar = async (convId: number) => {
    if (!confirm("¿Deseas declinar y cancelar tu solicitud de postulación a esta convocatoria?")) return;
    try {
      setActionLoading(convId);
      await api.declinarSolicitudConvocatoria(convId);
      setActionSuccess("Solicitud de inscripción cancelada.");
      await fetchConvocatorias();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "No se pudo declinar la solicitud");
      setTimeout(() => setError(null), 4000);
    } finally {
      setActionLoading(null);
    }
  };

  const esAdmin = user?.rol === "ADMIN";
  const esDocente = user?.rol === "DOCENTE";
  const esEstudiante = user?.rol === "ESTUDIANTE";

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-ink-faint tracking-wider uppercase">
              Catálogo General de Convocatorias y Ferias
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-ink mt-0.5">
              Convocatorias y Ferias
            </h1>
            <p className="text-xs text-ink-soft mt-1">
              Explora las convocatorias abiertas de la facultad, consulta bases y solicita tu inscripción.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/mis-areas"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/40 bg-accent-soft text-accent-dark text-xs font-semibold hover:bg-accent hover:text-white transition-all shadow-xs"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Mis Áreas</span>
            </Link>

            {canEditModule("CONVOCATORIAS") && (
              <Link
                href="/dashboard/convocatorias/nueva"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-ink text-white hover:bg-black text-xs font-semibold transition-all shadow-sm"
              >
                <PlusCircle className="w-4 h-4 text-accent" />
                <span>Nueva Convocatoria</span>
              </Link>
            )}
          </div>
        </div>

        {/* Notificaciones */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-danger-soft/20 border border-danger/30 text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Barra de Filtros */}
        <div className="bg-paper-raised border border-line-soft rounded-2xl p-3 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Buscar por título, área o disciplina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-paper border border-line-soft focus:border-accent focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Filter className="w-3.5 h-3.5 text-ink-faint hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-paper border border-line-soft rounded-xl px-2.5 py-1.5 focus:border-accent focus:outline-none"
            >
              <option value="TODAS">Todos los estados</option>
              <option value="PUBLICADA">Publicadas</option>
              <option value="BORRADOR">Borradores</option>
              <option value="FINALIZADA">Finalizadas</option>
            </select>
          </div>
        </div>

        {/* Lista de Convocatorias */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-ink-soft">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Cargando convocatorias...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-paper-raised border border-line-soft rounded-2xl p-10 text-center text-ink-soft">
            <p className="text-sm">No se encontraron convocatorias con los criterios de búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((conv) => {
              const miAreaInfo = misAreasMap[conv.id];
              const miEstado = miAreaInfo?.miEstadoInscripcion || conv.miEstadoInscripcion;
              const estaPendiente = miEstado === "PENDIENTE";
              const estaAceptado = miEstado === "ACEPTADO";
              const estaRechazado = miEstado === "RECHAZADO";

              return (
                <div
                  key={conv.id}
                  className="bg-paper-raised border border-line hover:border-accent/40 rounded-2xl p-5 transition-all shadow-xs flex flex-col md:flex-row gap-5 justify-between"
                >
                  {conv.imagenPortada && (
                    <div className="w-full md:w-44 h-32 md:h-auto flex-shrink-0 rounded-xl overflow-hidden border border-line-soft bg-paper-sunken">
                      <img
                        src={getMediaUrl(conv.imagenPortada)}
                        alt={conv.titulo}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <div className="space-y-2.5 flex-1">
                    {/* Header de la tarjeta */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-paper-sunken border border-line-soft text-ink-soft">
                        {conv.tipo}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                          conv.estado === "PUBLICADA"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : conv.estado === "BORRADOR"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {conv.estado}
                      </span>

                      {/* Estado personal del estudiante */}
                      {esEstudiante && estaPendiente && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-xs">
                          <Clock className="w-3 h-3" />
                          Solicitud en Revisión
                        </span>
                      )}
                      {esEstudiante && estaRechazado && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 shadow-xs">
                          <XCircle className="w-3 h-3" />
                          Postulación Rechazada
                        </span>
                      )}
                      {esEstudiante && estaAceptado && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          Admitido en el Aula
                        </span>
                      )}
                    </div>

                    {/* Título y Descripción */}
                    <h2 className="font-serif text-lg text-ink font-semibold hover:text-accent transition-colors">
                      <Link href={`/dashboard/convocatorias/${conv.id}`}>
                        {conv.titulo}
                      </Link>
                    </h2>
                    <p className="text-xs text-ink-soft leading-relaxed max-w-3xl">
                      {conv.descripcion}
                    </p>

                    {/* Resumen de Asignaciones (Visible para Admin y Docente) */}
                    {(esAdmin || esDocente) && (
                      <div className="pt-2 p-3 bg-paper-sunken border border-line-soft rounded-xl space-y-1.5 text-xs text-ink-soft">
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                            <span>
                              <b>Docentes a cargo:</b>{" "}
                              {conv.docentesEncargados && conv.docentesEncargados.length > 0
                                ? conv.docentesEncargados.join(", ")
                                : "Sin docente designado aún"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-seal" />
                            <span>
                              <b>Jurados:</b>{" "}
                              {conv.juradosAsignados && conv.juradosAsignados.length > 0
                                ? conv.juradosAsignados.join(", ")
                                : "Sin jurados asignados"}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-ink-faint">
                          <span>👥 Admitidos: <b>{conv.totalAdmitidos || 0}</b></span>
                          {conv.totalSolicitudesPendientes ? (
                            <span className="text-amber-600 font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {conv.totalSolicitudesPendientes} solicitudes por admitir
                            </span>
                          ) : (
                            <span>0 pendientes de admisión</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Metadatos */}
                    <div className="pt-1 flex flex-wrap items-center gap-5 text-xs text-ink-faint">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-accent" />
                        <span>{conv.tamanoEquipo || "Individual o equipo"}</span>
                      </div>

                      {conv.fechaCierre && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-seal" />
                          <span>
                            Cierre:{" "}
                            <b>
                              {new Date(conv.fechaCierre).toLocaleDateString("es-BO", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </b>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Requisitos */}
                    {conv.requisitos && conv.requisitos.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        {conv.requisitos.map((req, idx) => (
                          <span
                            key={req.id || idx}
                            className="text-[11px] bg-paper border border-line-soft px-2.5 py-0.5 rounded-md text-ink-soft"
                          >
                            • {req.descripcion}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex md:flex-col items-end justify-between md:justify-center gap-2 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-line-soft">
                    {/* Botones para Estudiante */}
                    {esEstudiante && (
                      <>
                        {estaAceptado ? (
                          <Link
                            href={`/dashboard/convocatorias/${conv.id}`}
                            className="px-3.5 py-1.5 rounded-lg bg-ink text-white text-xs font-semibold hover:bg-black transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <GraduationCap className="w-3.5 h-3.5 text-accent" />
                            <span>Ingresar al Aula</span>
                          </Link>
                        ) : estaPendiente ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> En revisión
                            </span>
                            <button
                              onClick={() => handleDeclinar(conv.id)}
                              disabled={actionLoading === conv.id}
                              className="px-3 py-1.5 rounded-lg border border-danger/40 bg-danger-soft/10 text-danger text-xs font-semibold hover:bg-danger-soft/30 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {actionLoading === conv.id ? "Cancelando..." : "Declinar Solicitud"}
                            </button>
                            <Link
                              href={`/dashboard/convocatorias/${conv.id}`}
                              className="text-[11px] text-ink-soft hover:text-ink underline"
                            >
                              Ver bases públicas
                            </Link>
                          </div>
                        ) : estaRechazado ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <button
                              onClick={() => setSelectedConvForInscripcion(conv)}
                              className="px-3.5 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-opacity-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Volver a Postular</span>
                            </button>
                            <Link
                              href={`/dashboard/convocatorias/${conv.id}`}
                              className="text-[11px] text-ink-soft hover:text-ink underline"
                            >
                              Ver bases públicas
                            </Link>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedConvForInscripcion(conv)}
                            className="px-3.5 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-opacity-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Solicitar Inscripción</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Botones para Admin / Docente */}
                    {(esAdmin || esDocente) && (
                      <>
                        <Link
                          href={`/dashboard/convocatorias/${conv.id}`}
                          className="px-3 py-1.5 rounded-lg bg-ink text-white text-xs font-semibold hover:bg-black transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-accent" />
                          <span>Ingresar al Aula</span>
                        </Link>

                        {canEditModule("CONVOCATORIAS") && (
                          <Link
                            href={`/dashboard/convocatorias/${conv.id}/editar`}
                            className="px-3 py-1.5 rounded-lg border border-accent/40 bg-accent-soft text-accent-dark text-xs font-semibold hover:bg-accent hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </Link>
                        )}

                        {conv.estado === "BORRADOR" && canEditModule("CONVOCATORIAS") && (
                          <button
                            onClick={() => handlePublicar(conv.id)}
                            disabled={actionLoading === conv.id}
                            className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-opacity-95 disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {actionLoading === conv.id ? "Publicando..." : "Publicar"}
                          </button>
                        )}

                        {esAdmin && (
                          <div className="flex items-center gap-1.5">
                            {conv.estado !== "FINALIZADA" && (
                              <button
                                onClick={() => handleArchivarDesdeListado(conv.id)}
                                title="Archivar área"
                                className="p-1.5 text-ink-soft hover:text-ink rounded-lg border border-line hover:bg-paper-sunken transition-colors cursor-pointer"
                              >
                                <Archive className="w-3.5 h-3.5 text-accent" />
                              </button>
                            )}
                            <button
                              onClick={() => setConvocatoriaAEliminar(conv)}
                              title="Eliminar área"
                              className="p-1.5 text-ink-soft hover:text-rose-600 rounded-lg border border-line hover:border-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    <Link
                      href="/"
                      target="_blank"
                      className="px-3 py-1.5 rounded-lg border border-line text-ink-soft text-xs font-medium hover:bg-paper transition-all flex items-center gap-1"
                    >
                      <span>Portal público</span>
                      <ArrowUpRight className="w-3 h-3 text-ink-faint" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal para solicitar inscripción de Estudiante */}
        {selectedConvForInscripcion && (
          <div className="fixed inset-0 z-50 bg-ink/50 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
            <div className="bg-paper-raised/95 dark:bg-slate-900/95 backdrop-blur-xl border border-line/60 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-accent-soft text-accent-dark flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-ink">Solicitar Inscripción</h3>
                    <p className="text-[11px] text-ink-faint truncate max-w-xs">
                      {selectedConvForInscripcion.titulo}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedConvForInscripcion(null)}
                  className="p-1 rounded-lg text-ink-faint hover:text-ink text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSolicitarInscripcion} className="space-y-4 pt-2">
                <div className="p-3 rounded-xl bg-paper-sunken border border-line-soft text-xs text-ink-soft space-y-1">
                  <span className="font-semibold text-ink block">Requisitos y Modalidad:</span>
                  <p className="text-[11px] leading-relaxed">
                    Modalidad: <b>{selectedConvForInscripcion.tamanoEquipo || "Individual o equipo"}</b>.
                    Al enviar la solicitud, el docente a cargo o administrador revisará tu postulación para admitirte en el aula virtual.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Nombre del Equipo / Grupo (Opcional):
                  </label>
                    <input
                      type="text"
                      value={nombreEquipo}
                      onChange={(e) => setNombreEquipo(e.target.value)}
                      placeholder="Dejar en blanco si te postulas de forma individual"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-paper border border-line-soft focus:border-accent focus:outline-none"
                    />
                  <span className="text-[10px] text-ink-faint block mt-1">
                    Si te postulas de manera individual, puedes dejarlo en blanco.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedConvForInscripcion(null)}
                    className="px-3.5 py-1.5 rounded-xl border border-line text-ink-soft text-xs font-medium hover:bg-paper"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={inscribiendo}
                    className="px-4 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-opacity-95 disabled:opacity-50 shadow-sm flex items-center gap-1.5"
                  >
                    {inscribiendo ? "Enviando solicitud..." : "Confirmar y Solicitar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Confirmación para Eliminar / Archivar Convocatoria */}
        {convocatoriaAEliminar && (
          <ConfirmarEliminacionModal
            isOpen={!!convocatoriaAEliminar}
            onClose={() => setConvocatoriaAEliminar(null)}
            onConfirmEliminar={handleConfirmarEliminarConvocatoria}
            onArchivar={() => handleArchivarDesdeListado(convocatoriaAEliminar.id)}
            loading={eliminandoConv}
            tipo="CONVOCATORIA"
            tituloElemento={convocatoriaAEliminar.titulo}
            totalParticipantes={convocatoriaAEliminar.totalAdmitidos || 0}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
