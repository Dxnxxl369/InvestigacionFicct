"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { api, ConvocatoriaDTO } from "@/lib/api";
import {
  GraduationCap,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Award,
} from "lucide-react";

export default function MisAreasPage() {
  const { user } = useAuth();
  const [areas, setAreas] = useState<ConvocatoriaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchMisAreas = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getMisAreas();
      setAreas(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar tus áreas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMisAreas();
  }, [fetchMisAreas]);

  const handleDeclinar = async (convocatoriaId: number) => {
    if (!confirm("¿Estás seguro de que deseas cancelar y declinar tu solicitud de inscripción a esta área?")) {
      return;
    }
    try {
      setActionLoading(convocatoriaId);
      await api.declinarSolicitudConvocatoria(convocatoriaId);
      setSuccessMsg("Tu postulación ha sido cancelada exitosamente.");
      await fetchMisAreas();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "No se pudo declinar la solicitud");
      setTimeout(() => setError(null), 4000);
    } finally {
      setActionLoading(null);
    }
  };

  const esEstudiante = user?.rol === "ESTUDIANTE";
  const esDocente = user?.rol === "DOCENTE";
  const esAdmin = user?.rol === "ADMIN";

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-ink-faint tracking-wider uppercase flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-accent" />
              Espacio Académico Personal
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-ink mt-0.5">
              Mis Áreas
            </h1>
            <p className="text-xs text-ink-soft mt-1">
              {esEstudiante && "Tus convocatorias, ferias y hackathones inscritas con acceso al aula virtual, tareas y resultados."}
              {esDocente && "Áreas académicas bajo tu supervisión para la gestión de tareas estilo Moodle, jurados y estudiantes."}
              {esAdmin && "Vista unificada de todas las áreas académicas, sus encargados y solicitudes de ingreso."}
            </p>
          </div>

          <Link
            href="/dashboard/convocatorias"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-paper text-ink-soft hover:text-ink text-xs font-medium hover:bg-paper-sunken transition-all shadow-xs self-start sm:self-auto"
          >
            <span>Explorar Convocatorias</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Notificaciones */}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-danger-soft/20 border border-danger/30 text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Contenido */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-ink-soft">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Cargando tus áreas académicas...</span>
          </div>
        ) : areas.length === 0 ? (
          <div className="bg-paper-raised border border-line-soft rounded-2xl p-10 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-paper-sunken flex items-center justify-center mx-auto mb-3 text-ink-faint">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg text-ink font-semibold">
              No tienes áreas activas por ahora
            </h3>
            <p className="text-xs text-ink-soft mt-1.5 leading-relaxed">
              {esEstudiante && "Aún no te has postulado a ninguna feria o hackatón. Explora el catálogo de convocatorias abiertas para inscribirte con tu equipo."}
              {esDocente && "Actualmente no tienes convocatorias o áreas asignadas como docente encargado por la Administración."}
              {esAdmin && "No hay áreas creadas en el sistema."}
            </p>
            <div className="mt-5">
              <Link
                href="/dashboard/convocatorias"
                className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-opacity-95 transition-all shadow-sm inline-flex items-center gap-2"
              >
                <span>Explorar Convocatorias Disponibles</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {areas.map((area) => {
              const miEstado = area.miEstadoInscripcion;
              const estaPendiente = miEstado === "PENDIENTE";
              const estaAceptado = miEstado === "ACEPTADO" || esDocente || esAdmin;
              const estaRechazado = miEstado === "RECHAZADO";

              return (
                <div
                  key={area.id}
                  className="bg-paper-raised border border-line hover:border-accent/40 rounded-2xl p-5 transition-all flex flex-col justify-between shadow-xs hover:shadow-md"
                >
                  <div className="space-y-3">
                    {/* Header de la tarjeta */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-paper-sunken border border-line-soft text-ink-soft">
                        {area.tipo}
                      </span>

                      {/* Estado de inscripción / Rol */}
                      {esEstudiante && (
                        <div>
                          {estaPendiente && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              Solicitud en Revisión
                            </span>
                          )}
                          {estaAceptado && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Admitido
                            </span>
                          )}
                          {estaRechazado && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-danger-soft/20 text-danger border border-danger/30">
                              <XCircle className="w-3 h-3" />
                              No Admitido
                            </span>
                          )}
                        </div>
                      )}

                      {(esDocente || esAdmin) && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-dark">
                          {esAdmin ? "Administrador" : "Docente Encargado"}
                        </span>
                      )}
                    </div>

                    {/* Título y Descripción */}
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-ink hover:text-accent transition-colors">
                        <Link href={`/dashboard/convocatorias/${area.id}`}>
                          {area.titulo}
                        </Link>
                      </h3>
                      <p className="text-xs text-ink-soft line-clamp-2 mt-1 leading-relaxed">
                        {area.descripcion}
                      </p>
                    </div>

                    {/* Alerta de Solicitud en Revisión */}
                    {esEstudiante && estaPendiente && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Postulación enviada</span>
                        </div>
                        <p className="text-[11px] opacity-90">
                          Tu solicitud está en espera de admisión por el docente a cargo o administrador. No podrás ver las tareas internas ni participantes hasta ser admitido.
                        </p>
                      </div>
                    )}

                    {/* Resumen Docente / Admin */}
                    {(esDocente || esAdmin) && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line-soft text-xs text-ink-soft">
                        <div className="p-2 rounded-xl bg-paper-sunken border border-line-soft">
                          <span className="text-[10px] text-ink-faint block uppercase">Estudiantes Admitidos</span>
                          <b className="text-sm text-ink">{area.totalAdmitidos || 0}</b>
                        </div>
                        <div className="p-2 rounded-xl bg-paper-sunken border border-line-soft">
                          <span className="text-[10px] text-ink-faint block uppercase">Solicitudes Pendientes</span>
                          <b className={`text-sm ${(area.totalSolicitudesPendientes || 0) > 0 ? "text-amber-600 font-bold" : "text-ink"}`}>
                            {area.totalSolicitudesPendientes || 0}
                          </b>
                        </div>
                      </div>
                    )}

                    {/* Metadatos */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-ink-faint pt-1">
                      {area.fechaCierre && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-accent" />
                          <span>
                            Cierre: {new Date(area.fechaCierre).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-seal" />
                        <span>{area.tamanoEquipo || "Individual o equipo"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones al pie */}
                  <div className="pt-4 mt-3 border-t border-line-soft flex items-center justify-between gap-2">
                    {esEstudiante && estaPendiente ? (
                      <div className="flex items-center justify-between w-full">
                        <button
                          onClick={() => handleDeclinar(area.id)}
                          disabled={actionLoading === area.id}
                          className="px-3 py-1.5 rounded-lg border border-danger/40 bg-danger-soft/10 text-danger text-xs font-semibold hover:bg-danger-soft/30 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading === area.id ? "Cancelando..." : "Declinar Solicitud"}
                        </button>
                        <Link
                          href={`/dashboard/convocatorias/${area.id}`}
                          className="text-xs text-ink-soft hover:text-ink font-medium"
                        >
                          Ver Bases
                        </Link>
                      </div>
                    ) : (
                      <>
                        <Link
                          href={`/dashboard/convocatorias/${area.id}`}
                          className="px-3.5 py-1.5 rounded-lg bg-ink text-white text-xs font-semibold hover:bg-black transition-all flex items-center gap-1.5 shadow-xs"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-accent" />
                          <span>Ingresar al Aula</span>
                        </Link>

                        {(esDocente || esAdmin) && (area.totalSolicitudesPendientes || 0) > 0 && (
                          <Link
                            href={`/dashboard/convocatorias/${area.id}?tab=participantes`}
                            className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-semibold hover:bg-amber-500/20 transition-all flex items-center gap-1"
                          >
                            <span>Revisar {area.totalSolicitudesPendientes} pendientes</span>
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
