"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, X } from "lucide-react";
import { notificacionesAPI, NotificacionDTO } from "@/lib/api";

const TIPO_ICON: Record<string, string> = {
  INSCRIPCION_ADMITIDA: "✅",
  INSCRIPCION_RECHAZADA: "❌",
  NUEVA_POSTULACION: "📋",
  NUEVA_ENTREGA: "📤",
  ENTREGA_CALIFICADA: "🎯",
  NUEVA_TAREA: "📝",
  CORTE_PROXIMO: "⏰",
};

function formatRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

export default function NotificacionesCampana({ isCollapsed }: { isCollapsed?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const [notifs, setNotifs] = useState<NotificacionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Polling count ~45s
  const fetchCount = useCallback(async () => {
    try {
      const data = await notificacionesAPI.contarNoLeidas();
      setNoLeidas(data.count);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    fetchCount();
    intervalRef.current = setInterval(fetchCount, 45000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchCount]);

  // Cerrar al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    try {
      const data = await notificacionesAPI.listar(30);
      setNotifs(data);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  };

  const marcarLeida = async (id: number) => {
    try {
      await notificacionesAPI.marcarLeida(id);
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
      setNoLeidas((c) => Math.max(0, c - 1));
    } catch {
      // silencioso
    }
  };

  const marcarTodas = async () => {
    try {
      await notificacionesAPI.marcarTodasLeidas();
      setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
      setNoLeidas(0);
    } catch {
      // silencioso
    }
  };

  const irA = (notif: NotificacionDTO) => {
    marcarLeida(notif.id);
    if (notif.convocatoriaId) {
      if (notif.tareaId) {
        router.push(`/dashboard/convocatorias/${notif.convocatoriaId}?tab=tareas&tarea=${notif.tareaId}`);
      } else {
        router.push(`/dashboard/convocatorias/${notif.convocatoriaId}`);
      }
    }
    setOpen(false);
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={handleOpen}
        title="Notificaciones"
        className={`relative flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-paper-2 active:scale-95 ${
          isCollapsed ? "w-10 h-10" : "w-10 h-10"
        }`}
      >
        <Bell className="w-5 h-5 text-ink-soft" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 animate-pulse">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-paper/85 dark:bg-slate-900/85 backdrop-blur-xl border border-line/60 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line/60 bg-paper-raised/50 dark:bg-slate-800/50 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent" />
              <span className="font-semibold text-ink text-sm">Notificaciones</span>
              {noLeidas > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {noLeidas}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {noLeidas > 0 && (
                <button
                  onClick={marcarTodas}
                  className="p-1.5 rounded-lg hover:bg-paper-2 text-ink-soft hover:text-accent transition-colors"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-paper-2 text-ink-soft hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="py-10 text-center text-ink-soft text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Sin notificaciones
              </div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => irA(n)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-paper-2 ${
                    !n.leida ? "bg-accent/5" : ""
                  }`}
                >
                  <span className="text-xl shrink-0 mt-0.5">
                    {TIPO_ICON[n.tipo] ?? "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.leida ? "font-semibold text-ink" : "text-ink-soft"}`}>
                      {n.titulo}
                    </p>
                    {n.mensaje && (
                      <p className="text-xs text-ink-muted mt-0.5 truncate">{n.mensaje}</p>
                    )}
                    <p className="text-[11px] text-ink-muted mt-1">{formatRelativo(n.createdAt)}</p>
                  </div>
                  {!n.leida && (
                    <span className="w-2 h-2 bg-accent rounded-full shrink-0 mt-2" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-paper-2">
              <p className="text-center text-xs text-ink-muted">
                Mostrando las últimas {notifs.length} notificaciones
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
