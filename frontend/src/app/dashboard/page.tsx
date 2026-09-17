"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, ConvocatoriaDTO } from "@/lib/api";
import {
  FileText,
  PlusCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Check,
  Calendar,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  tag: string;
  done: boolean;
}

export default function DashboardHomePage() {
  const { user, canEditModule } = useAuth();
  const { toast } = useToast();
  const [convocatorias, setConvocatorias] = useState<ConvocatoriaDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Lista interactiva de tareas del sprint/investigación (Nielsen #3: Control y libertad)
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: "1", title: "Completar sección de metodología en borrador de informe", tag: "Tesis de Grado", done: false },
    { id: "2", title: "Revisar observaciones de supervisión del Ing. Rolando Martínez", tag: "Supervisión", done: true },
    { id: "3", title: "Configurar rangos de integrantes para la nueva Feria Científica", tag: "Convocatorias", done: false },
    { id: "4", title: "Ejecutar análisis de originalidad con clasificador IA RoBERTa", tag: "Control IA", done: false },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getConvocatorias();
        setConvocatorias(data);
      } catch (err) {
        console.error("Error al cargar convocatorias:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextState = !t.done;
          if (nextState) toast("Tarea marcada como completada", "success");
          return { ...t, done: nextState };
        }
        return t;
      })
    );
  };

  const total = convocatorias.length;
  const publicadas = convocatorias.filter((c) => c.estado === "PUBLICADA").length;
  const borradores = convocatorias.filter((c) => c.estado === "BORRADOR").length;

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
              . Gestiona convocatorias de investigación, ferias científicas y redacción colaborativa.
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
                  Haz clic en cualquier tarea para marcarla como realizada
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-accent bg-accent-soft px-2.5 py-0.5 rounded-full">
                {tasks.filter((t) => t.done).length}/{tasks.length} completadas
              </span>
            </div>

            <div className="divide-y divide-line-soft">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => toggleTask(t.id)}
                  className="py-3 px-2 flex items-start gap-3.5 cursor-pointer rounded-xl hover:bg-paper-sunken transition-all group"
                >
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      t.done
                        ? "bg-accent border-accent text-white"
                        : "border-line group-hover:border-ink-soft bg-paper"
                    }`}
                  >
                    {t.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-xs sm:text-sm font-medium transition-all ${
                        t.done
                          ? "line-through text-ink-faint"
                          : "text-ink group-hover:text-accent-dark"
                      }`}
                    >
                      {t.title}
                    </p>
                    <span className="text-[10px] text-ink-faint block mt-0.5">
                      {t.tag}
                    </span>
                  </div>
                </div>
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
                <div className="p-2.5 rounded-xl bg-paper-sunken flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-ink">Feria Científica 2026</div>
                    <span className="text-[10px] text-ink-faint">Cierre de postulaciones</span>
                  </div>
                  <span className="font-mono text-accent-dark font-semibold text-[11px]">30 Oct</span>
                </div>
                <div className="p-2.5 rounded-xl bg-paper-sunken flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-ink">Hackathon FICCT</div>
                    <span className="text-[10px] text-ink-faint">Entrega de prototipos</span>
                  </div>
                  <span className="font-mono text-seal font-semibold text-[11px]">15 Nov</span>
                </div>
              </div>
            </div>

            {/* Acceso directo a Documentos & IA */}
            <div className="liquid-glass rounded-2xl p-5 shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="font-serif text-sm font-semibold text-ink">
                  Espacio Colaborativo &amp; IA
                </span>
              </div>
              <p className="text-xs text-ink-soft mb-3 leading-relaxed">
                Continúa redactando tu informe técnico con cursores en tiempo real y detector de originalidad.
              </p>
              <Link
                href="/dashboard/documentos"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-dark hover:text-accent group"
              >
                <span>Abrir documento en vivo</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
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
                      Equipo
                    </span>
                    <span className="font-semibold text-ink-soft">
                      {c.tamanoEquipo || "1 a 5 integrantes"}
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
