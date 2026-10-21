"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { api, ConvocatoriaDTO, TareaDTO } from "@/lib/api";
import {
  FileText,
  PlusCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Check,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function DashboardHomePage() {
  const { user, canEditModule } = useAuth();
  const router = useRouter();
  const [convocatorias, setConvocatorias] = useState<ConvocatoriaDTO[]>([]);
  const [tasks, setTasks] = useState<TareaDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.rol === "JURADO") { router.replace("/dashboard/jurado"); return; }
    const fetchStats = async () => {
      const [convocatoriasResult, tareasResult] = await Promise.allSettled([
        api.getConvocatorias(),
        api.getMisTareas(),
      ]);
      if (convocatoriasResult.status === "fulfilled") setConvocatorias(convocatoriasResult.value);
      else console.error("Error al cargar convocatorias:", convocatoriasResult.reason);
      if (tareasResult.status === "fulfilled") setTasks(tareasResult.value);
      else console.error("Error al cargar tareas:", tareasResult.reason);
      setLoading(false);
    };
    fetchStats();
  }, [user?.rol, router]);

  const total = convocatorias.length;
  const publicadas = convocatorias.filter((c) => c.estado === "PUBLICADA").length;
  const borradores = convocatorias.filter((c) => c.estado === "BORRADOR").length;
  const tareasEntregadas = tasks.filter((t) => Boolean(t.miEntrega)).length;
  const proximasFechas = convocatorias
    .filter((c) => c.estado === "PUBLICADA" && c.fechaCierre && new Date(`${c.fechaCierre}T23:59:59`) >= new Date())
    .sort((a, b) => (a.fechaCierre || "").localeCompare(b.fechaCierre || ""))
    .slice(0, 3);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Banner de Bienvenida con Liquid Glass subtle */}
        <div className="liquid-glass-subtle rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-dark bg-accent-soft px-3 py-1 rounded-full mb-3">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Panel de Control Institucional FICCT</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-ink">
              Bienvenido, {user?.nombre} {user?.apellido}
            </h1>
            <p className="text-xs sm:text-sm text-ink-soft mt-1.5 max-w-2xl leading-relaxed">
              Acceso institucional con rol de{" "}
              <span className="font-bold text-ink px-2 py-0.5 rounded-md bg-accent-soft text-accent-dark">
                {user?.rol}
              </span>
              . Gestiona convocatorias de investigación, ferias científicas y sus actividades.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {canEditModule("CONVOCATORIAS") && (
              <Link
                href="/dashboard/convocatorias/nueva"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink text-paper text-xs sm:text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-md"
              >
                <PlusCircle className="w-4 h-4 text-accent" />
                <span>Nueva Convocatoria</span>
              </Link>
            )}
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-line bg-paper-raised text-ink-soft text-xs sm:text-sm font-medium hover:border-ink transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Portal Público</span>
            </Link>
          </div>
        </div>

        {/* Tarjetas de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-paper-raised border border-line rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-faint uppercase tracking-wider">
                Total Convocatorias
              </span>
              <div className="w-8 h-8 rounded-lg bg-paper-sunken flex items-center justify-center text-ink">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-ink">
                {loading ? "..." : total}
              </span>
              <span className="text-xs text-ink-faint">en base de datos</span>
            </div>
          </div>

          <div className="bg-paper-raised border border-line rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-accent-dark uppercase tracking-wider">
                Publicadas en Portal
              </span>
              <div className="w-8 h-8 rounded-lg bg-accent-soft flex items-center justify-center text-accent">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-accent-dark">
                {loading ? "..." : publicadas}
              </span>
              <span className="text-xs text-accent">abiertas para estudiantes</span>
            </div>
          </div>

          <div className="bg-paper-raised border border-line rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-seal uppercase tracking-wider">
                En Borrador
              </span>
              <div className="w-8 h-8 rounded-lg bg-seal-soft flex items-center justify-center text-seal">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-seal">
                {loading ? "..." : borradores}
              </span>
              <span className="text-xs text-seal">en edición técnica</span>
            </div>
          </div>
        </div>

        {/* Layout de 2 Columnas (Tareas Pendientes + Actividades Clave) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Checklist de Actividades con feedback inmediato */}
          <div className="lg:col-span-2 bg-paper-raised border border-line rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-line-soft">
              <div>
                <h2 className="font-serif text-lg font-semibold text-ink">
                  Mis Tareas de Investigación
                </h2>
                <p className="text-xs text-ink-faint">
                  Actividades asignadas en tus convocatorias
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-accent bg-accent-soft px-2.5 py-0.5 rounded-full">
                {tareasEntregadas}/{tasks.length} entregadas
              </span>
            </div>

            <div className="divide-y divide-line-soft">
              {!loading && tasks.length === 0 && (
                <p className="py-5 text-xs text-ink-faint">No tienes tareas asignadas.</p>
              )}
              {tasks.map((t) => (
                <Link
                  key={`${t.id}-${t.feriaPostulacionId || 0}`}
                  href={`/dashboard/convocatorias/${t.convocatoriaId}?tarea=${t.id}${t.feriaPostulacionId ? `&equipo=${t.feriaPostulacionId}` : ""}`}
                  className="py-3 px-2 flex items-start gap-3.5 rounded-xl hover:bg-paper-sunken transition-all group"
                >
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      t.miEntrega
                        ? "bg-accent border-accent text-white"
                        : "border-line group-hover:border-ink-soft bg-paper"
                    }`}
                  >
                    {t.miEntrega && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-xs sm:text-sm font-medium transition-all ${
                        t.miEntrega ? "text-ink-faint" : "text-ink group-hover:text-accent-dark"
                      }`}
                    >
                      {t.titulo}
                    </p>
                    <span className="text-[10px] text-ink-faint block mt-0.5">
                      {t.convocatoriaTitulo || "Convocatoria"} · {t.miEntrega ? "Enviada" : "Pendiente"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Columna Derecha: Próximas Fechas & Feed de Actividad */}
          <div className="space-y-6">
            <div className="bg-paper-raised border border-line rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-3.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-accent" />
                <span>Fechas Límite Próximas</span>
              </h3>
              <div className="space-y-2.5 text-xs">
                {!loading && proximasFechas.length === 0 && (
                  <p className="text-ink-faint">No hay fechas límite próximas.</p>
                )}
                {proximasFechas.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-xl bg-paper-sunken flex justify-between items-center gap-3">
                    <div>
                      <div className="font-semibold text-ink">{c.titulo}</div>
                      <span className="text-[10px] text-ink-faint">Cierre de postulaciones</span>
                    </div>
                    <span className="font-mono text-accent-dark font-semibold text-[11px] whitespace-nowrap">
                      {new Date(`${c.fechaCierre}T12:00:00`).toLocaleDateString("es-BO", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Sección Convocatorias Recientes */}
        <div className="bg-paper-raised border border-line rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-line flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg text-ink font-semibold">
                Actividades y Convocatorias en el Sistema
              </h2>
              <p className="text-xs text-ink-faint mt-0.5">
                Resumen de los eventos parametrizados en la base de datos PostgreSQL
              </p>
            </div>
            <Link
              href="/dashboard/convocatorias"
              className="text-xs text-accent-dark font-semibold hover:underline flex items-center gap-1"
            >
              Ver todas ({convocatorias.length})
            </Link>
          </div>

          <div className="divide-y divide-line-soft">
            {!loading && convocatorias.length === 0 && (
              <p className="p-5 text-xs text-ink-faint">Aún no hay convocatorias registradas.</p>
            )}
            {convocatorias.slice(0, 4).map((c) => (
              <div
                key={c.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-paper-sunken/60 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent-dark">
                      {c.tipo}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        c.estado === "PUBLICADA"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}
                    >
                      {c.estado}
                    </span>
                  </div>
                  <h3 className="font-serif text-base font-medium text-ink">
                    {c.titulo}
                  </h3>
                  <p className="text-xs text-ink-soft line-clamp-1 max-w-2xl">
                    {c.descripcion}
                  </p>
                </div>

                <div className="flex items-center gap-6 text-xs text-ink-faint flex-shrink-0">
                  <div>
                    <span className="block text-[10px] text-ink-faint uppercase font-medium">
                      Cierre
                    </span>
                    <span className="font-semibold text-ink-soft">
                      {c.fechaCierre
                        ? new Date(c.fechaCierre).toLocaleDateString("es-BO")
                        : "Por definir"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-ink-faint uppercase font-medium">
                      Modalidad
                    </span>
                    <span className="font-semibold text-ink-soft">
                      {c.modalidadInscripcion === "GRUPAL" ? (c.tamanoEquipo || "Inscripción grupal") : "Inscripción individual"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
