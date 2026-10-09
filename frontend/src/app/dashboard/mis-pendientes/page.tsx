"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { tareasAPI, TareaDTO } from "@/lib/api";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  BookOpen,
  Filter,
  RefreshCw,
  FileText,
  Calendar,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { formatMoodleDate, calcularTiempoRestanteMoodle } from "@/components/moodle/moodleUtils";

type FiltroEstado = "TODOS" | "PENDIENTE" | "ENTREGADO" | "ENTREGADO_CON_RETRASO" | "CALIFICADO" | "VENCIDA";

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  PENDIENTE: {
    label: "Pendiente",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    icon: <Clock className="w-4 h-4" />,
  },
  ENTREGADO: {
    label: "Entregado",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  ENTREGADO_CON_RETRASO: {
    label: "Con retraso",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  CALIFICADO: {
    label: "Calificado",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  VENCIDA: {
    label: "Vencida",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    icon: <XCircle className="w-4 h-4" />,
  },
  NO_DISPONIBLE: {
    label: "No disponible",
    color: "text-gray-400 dark:text-gray-600",
    bg: "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700",
    icon: <Clock className="w-4 h-4" />,
  },
};

function formatFecha(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function diasRestantes(iso?: string): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function MisPendientesPage() {
  const { user } = useAuth();
  const [tareas, setTareas] = useState<TareaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroEstado>("TODOS");
  const [busqueda, setBusqueda] = useState("");

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tareasAPI.getMisTareas();
      setTareas(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar tareas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const tareasFiltradas = useMemo(() => {
    return tareas.filter((t) => {
      const matchFiltro = filtro === "TODOS" || t.miEstado === filtro;
      const matchBusqueda =
        busqueda.trim() === "" ||
        t.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.convocatoriaTitulo?.toLowerCase().includes(busqueda.toLowerCase());
      return matchFiltro && matchBusqueda;
    });
  }, [tareas, filtro, busqueda]);

  // Resumen
  const resumen = useMemo(() => {
    const total = tareas.filter((t) => t.miEstado !== "NO_DISPONIBLE").length;
    const entregadas = tareas.filter((t) =>
      ["ENTREGADO", "ENTREGADO_CON_RETRASO", "CALIFICADO"].includes(t.miEstado ?? "")
    ).length;
    const pendientes = tareas.filter((t) => t.miEstado === "PENDIENTE").length;
    const vencidas = tareas.filter((t) => t.miEstado === "VENCIDA").length;
    return { total, entregadas, pendientes, vencidas };
  }, [tareas]);

  if (!user || user.rol !== "ESTUDIANTE") {
    return (
      <div className="p-8 text-center text-ink-soft">
        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-lg font-medium">Solo disponible para estudiantes</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-accent" />
            Mis Pendientes
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Todas tus tareas activas ordenadas por fecha de entrega
          </p>
        </div>
        <button
          onClick={cargar}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-paper-2 border border-border text-ink-soft hover:text-ink hover:border-accent transition-colors text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: resumen.total, color: "text-ink" },
          { label: "Entregadas", value: resumen.entregadas, color: "text-green-600 dark:text-green-400" },
          { label: "Pendientes", value: resumen.pendientes, color: "text-blue-600 dark:text-blue-400" },
          { label: "Vencidas", value: resumen.vencidas, color: "text-red-600 dark:text-red-400" },
        ].map((s) => (
          <div key={s.label} className="bg-paper-2 border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-ink-soft mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Barra de progreso */}
      {resumen.total > 0 && (
        <div className="bg-paper-2 border border-border rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-ink-soft">Progreso de entregas</span>
            <span className="font-semibold text-ink">
              {resumen.entregadas}/{resumen.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-accent h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${(resumen.entregadas / resumen.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Filtros y búsqueda con Liquid Glass Sticky */}
      <div className="sticky top-14 lg:top-0 z-10 bg-paper/85 dark:bg-slate-950/85 backdrop-blur-md p-3 -mx-3 rounded-2xl border border-line/60 shadow-xs flex flex-col sm:flex-row gap-3 transition-colors">
        <input
          type="text"
          placeholder="Buscar tarea o área..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-border bg-paper-2 text-ink placeholder-ink-muted focus:outline-none focus:border-accent text-sm"
        />
        <div className="flex gap-2 flex-wrap">
          {(["TODOS", "PENDIENTE", "ENTREGADO", "CALIFICADO", "VENCIDA"] as FiltroEstado[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filtro === f
                  ? "bg-accent text-white border-accent"
                  : "bg-paper-2 text-ink-soft border-border hover:border-accent"
              }`}
            >
              {f === "TODOS" ? "Todos" : ESTADO_CONFIG[f]?.label ?? f}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>{error}</p>
        </div>
      ) : tareasFiltradas.length === 0 ? (
        <div className="text-center py-16 text-ink-soft">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay tareas con este filtro</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tareasFiltradas.map((tarea) => {
            const estado = tarea.miEstado ?? "NO_DISPONIBLE";
            const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.NO_DISPONIBLE;
            const dias = diasRestantes(tarea.fechaEntrega ?? tarea.fechaCorte);
            const urgente = dias !== null && dias <= 2 && dias >= 0 && estado === "PENDIENTE";

            const targetUrl = `/dashboard/convocatorias/${tarea.convocatoriaId}?tab=tareas&tarea=${tarea.id}`;
            const tiempoInfo = calcularTiempoRestanteMoodle(
              tarea.fechaEntrega || tarea.fechaLimite,
              tarea.miEntrega?.fechaEntrega,
              tarea.fechaHabilitacion
            );

            return (
              <div
                key={tarea.id}
                className={`border rounded-xl p-4 transition-all hover:shadow-md hover:border-accent group ${cfg.bg} ${urgente ? "ring-2 ring-orange-400" : ""}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      {(tarea.miEntrega?.conRetraso || tarea.miEstado === "ENTREGADO_CON_RETRASO") && (
                        <span className="text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800 font-semibold">
                          Con retraso
                        </span>
                      )}
                      {urgente && (
                        <span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-600 font-bold px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800 animate-pulse">
                          ¡Vence pronto!
                        </span>
                      )}
                    </div>

                    <Link
                      href={targetUrl}
                      className="font-semibold text-ink text-base truncate block hover:text-accent transition-colors"
                    >
                      {tarea.titulo}
                    </Link>
                    <p className="text-xs text-ink-soft mt-0.5 truncate">
                      📚 {tarea.convocatoriaTitulo ?? "—"}
                      {tarea.moduloTitulo && ` · ${tarea.moduloTitulo}`}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {tarea.miEntrega?.calificacion !== undefined ? (
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {tarea.miEntrega.calificacion}/{tarea.puntajeMaximo} pts
                      </span>
                    ) : (
                      <span className="text-sm text-ink-soft font-medium">
                        /{tarea.puntajeMaximo} pts
                      </span>
                    )}

                    <Link
                      href={targetUrl}
                      className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all"
                    >
                      {estado === "PENDIENTE" ? "Entregar Tarea" : "Ver Tarea"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Fechas y tiempo restante estilo Moodle */}
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-soft border-t border-line/40 pt-2.5">
                  {tarea.fechaEntrega && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Entrega: {formatMoodleDate(tarea.fechaEntrega)}
                    </span>
                  )}
                  {tiempoInfo.texto && (
                    <span className={`font-semibold flex items-center gap-1 ${tiempoInfo.retraso ? "text-red-500" : tiempoInfo.temprano ? "text-emerald-600" : "text-amber-600"}`}>
                      <Clock className="w-3.5 h-3.5" />
                      {tiempoInfo.texto}
                    </span>
                  )}
                  {tarea.fechaCorte && (
                    <span className="flex items-center gap-1 text-red-500">
                      <XCircle className="w-3.5 h-3.5" />
                      Corte: {formatMoodleDate(tarea.fechaCorte)}
                    </span>
                  )}
                  {tarea.miEntrega && (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <FileText className="w-3.5 h-3.5" />
                      Entregado: {formatMoodleDate(tarea.miEntrega.fechaEntrega)}
                    </span>
                  )}
                </div>

                {/* Retroalimentación si fue calificado */}
                {tarea.miEntrega?.retroalimentacion && (
                  <p className="mt-2 text-xs text-ink-soft bg-white/40 dark:bg-black/20 rounded-lg p-2 italic border border-line/30">
                    💬 Retroalimentación: "{tarea.miEntrega.retroalimentacion}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
