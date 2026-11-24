"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Bot,
  X,
  Send,
  Mic,
  MicOff,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Clock,
  Loader2,
  Compass,
  Download,
  FileText,
  ShieldCheck,
} from "lucide-react";
import {
  copilotoAPI,
  CopilotoChatMessage,
  CopilotoConfirmacionPendiente,
  CopilotoOpcionNavegacion,
  CopilotoReporteGenerado,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AgenteConvocatoriaModal from "@/components/moodle/modals/AgenteConvocatoriaModal";

interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  opciones?: CopilotoOpcionNavegacion[];
  confirmacion?: CopilotoConfirmacionPendiente | null;
  confirmacionResuelta?: boolean;
  reporte?: CopilotoReporteGenerado | null;
}

const SUGERENCIAS_POR_ROL: Record<string, string[]> = {
  ESTUDIANTE: [
    "Mis tareas pendientes",
    "Ir a mis aulas",
    "Ver convocatorias",
    "Ir a mi perfil",
  ],
  DOCENTE: [
    "Entregas por calificar",
    "Mis aulas asignadas",
    "Crear nueva convocatoria",
    "Ir a reportes",
  ],
  ADMIN: [
    "Pendientes por revisar",
    "Publicar todas las ferias en borrador",
    "Crear una convocatoria",
    "Ir a reportes",
  ],
  JURADO: [
    "Proyectos por evaluar",
    "Ir a evaluaciones",
    "Ir a mi perfil",
  ],
};

const BUBBLE_SIZE = 56;
const EDGE_GAP = 16;

export default function CopilotoWidget() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [abierto, setAbierto] = useState(false);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [errorVoz, setErrorVoz] = useState<string | null>(null);
  const [transicionandoAgente, setTransicionandoAgente] = useState(false);
  const [agenteConvocatoriaAbierto, setAgenteConvocatoriaAbierto] =
    useState(false);

  const rol = user?.rol || "ESTUDIANTE";
  const nombreCorto = user?.nombre ? user.nombre.split(" ")[0] : "Hola";
  const cacheKey = `copiloto_chat_cache_${user?.id || "guest"}`;
  const posKey = `copiloto_bubble_pos_${user?.id || "guest"}`;

  const crearBienvenida = useCallback(
    (): ChatItem => ({
      id: "welcome",
      role: "assistant",
      content: `Hola ${nombreCorto}, soy tu Copiloto FICCT. Pídeme ver tus pendientes, activar tareas, publicar convocatorias o generar reportes PDF.`,
    }),
    [nombreCorto]
  );

  const [mensajes, setMensajes] = useState<ChatItem[]>(() => [crearBienvenida()]);
  const [hidratado, setHidratado] = useState(false);

  // Posicion de burbuja arrastrable con snap a izquierda o derecha
  const [lado, setLado] = useState<"left" | "right">("right");
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [arrastrando, setArrastrando] = useState(false);

  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Hidratar posicion de la burbuja
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const defaultY = Math.max(EDGE_GAP, h - (w < 768 ? 140 : 84));
    let savedSide: "left" | "right" = "right";
    let savedY = defaultY;

    try {
      const raw = localStorage.getItem(posKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.side === "left" || parsed.side === "right") {
          savedSide = parsed.side;
        }
        if (typeof parsed.y === "number") {
          savedY = Math.min(Math.max(EDGE_GAP, parsed.y), h - BUBBLE_SIZE - EDGE_GAP);
        }
      }
    } catch {}

    setLado(savedSide);
    setPos({
      x: savedSide === "left" ? EDGE_GAP : w - BUBBLE_SIZE - EDGE_GAP,
      y: savedY,
    });
  }, [posKey]);

  // Ajustar al redimensionar ventana
  useEffect(() => {
    const onResize = () => {
      setPos((prev) => {
        if (!prev) return prev;
        const w = window.innerWidth;
        const h = window.innerHeight;
        return {
          x: lado === "left" ? EDGE_GAP : w - BUBBLE_SIZE - EDGE_GAP,
          y: Math.min(Math.max(EDGE_GAP, prev.y), h - BUBBLE_SIZE - EDGE_GAP),
        };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [lado]);

  // Hidratar conversacion + borradores desde sessionStorage al recargar (F5)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMensajes(parsed);
          setHidratado(true);
          return;
        }
      }
    } catch {}
    setMensajes([crearBienvenida()]);
    setHidratado(true);
  }, [cacheKey, crearBienvenida]);

  // Guardar conversacion + borradores pendientes en sessionStorage
  useEffect(() => {
    if (!hidratado || typeof window === "undefined") return;
    try {
      // Evitar saturar sessionStorage solo si el PDF base64 es muy grande (> 400 KB)
      const paraGuardar = mensajes.slice(-30).map((m) =>
        m.reporte && m.reporte.pdfBase64 && m.reporte.pdfBase64.length > 400000
          ? { ...m, reporte: { ...m.reporte, pdfBase64: "" } }
          : m
      );
      sessionStorage.setItem(cacheKey, JSON.stringify(paraGuardar));
    } catch {}
  }, [mensajes, cacheKey, hidratado]);

  useEffect(() => {
    if (abierto) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensajes, abierto, cargando]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Logica de arrastre de la burbuja con snap izquierdo/derecho
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        dragRef.current.moved = true;
        setArrastrando(true);
      }
      if (!dragRef.current.moved) return;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const nextX = Math.min(Math.max(EDGE_GAP, dragRef.current.origX + dx), w - BUBBLE_SIZE - EDGE_GAP);
      const nextY = Math.min(Math.max(EDGE_GAP, dragRef.current.origY + dy), h - BUBBLE_SIZE - EDGE_GAP);
      setPos({ x: nextX, y: nextY });
    };

    const onUp = () => {
      if (!dragRef.current.active) return;
      const wasMoved = dragRef.current.moved;
      dragRef.current.active = false;
      setArrastrando(false);

      if (!wasMoved) {
        setAbierto((prev) => !prev);
        return;
      }

      setPos((curr) => {
        if (!curr) return curr;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const centerX = curr.x + BUBBLE_SIZE / 2;
        const nuevoLado: "left" | "right" = centerX < w / 2 ? "left" : "right";
        const snappedX = nuevoLado === "left" ? EDGE_GAP : w - BUBBLE_SIZE - EDGE_GAP;
        const clampedY = Math.min(Math.max(EDGE_GAP, curr.y), h - BUBBLE_SIZE - EDGE_GAP);
        setLado(nuevoLado);
        try {
          localStorage.setItem(posKey, JSON.stringify({ side: nuevoLado, y: clampedY }));
        } catch {}
        return { x: snappedX, y: clampedY };
      });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [posKey]);

  const enviarMensaje = useCallback(
    async (textoAEnviar?: string) => {
      const texto = (textoAEnviar ?? input).trim();
      if (!texto || cargando) return;

      const userMsg: ChatItem = {
        id: `u-${Date.now()}`,
        role: "user",
        content: texto,
      };

      const historialParaApi: CopilotoChatMessage[] = mensajes
        .filter((m) => m.id !== "welcome")
        .slice(-8)
        .map((m) => ({
          remitente: m.role === "user" ? "USER" : "COPILOTO",
          texto: m.content,
        }));

      setMensajes((prev) => [...prev, userMsg]);
      if (!textoAEnviar) setInput("");
      setCargando(true);
      setErrorVoz(null);

      try {
        const resp = await copilotoAPI.chat({
          mensaje: texto,
          historial: historialParaApi,
          rutaActual: pathname,
        });

        const botMsg: ChatItem = {
          id: `b-${Date.now()}`,
          role: "assistant",
          content: resp.mensaje,
          opciones:
            resp.opciones && resp.opciones.length > 0 ? resp.opciones : undefined,
          confirmacion: resp.confirmacionPendiente || null,
          confirmacionResuelta: false,
          reporte: resp.reporteGenerado || null,
        };
        setMensajes((prev) => [...prev, botMsg]);

        if (resp.accion === "NAVEGAR" && resp.rutaDestino) {
          const destino = resp.rutaDestino;
          setTimeout(() => {
            router.push(destino);
            setAbierto(false);
          }, 550);
        } else if (resp.accion === "ABRIR_AGENTE_CONVOCATORIA") {
          setTimeout(() => {
            setAbierto(false);
            setTransicionandoAgente(true);
            setTimeout(() => {
              setTransicionandoAgente(false);
              setAgenteConvocatoriaAbierto(true);
            }, 950);
          }, 450);
        }
      } catch (err: any) {
        setMensajes((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content:
              err?.message ||
              "No pude procesar tu solicitud en este momento. Intenta nuevamente.",
          },
        ]);
      } finally {
        setCargando(false);
      }
    },
    [input, cargando, mensajes, pathname, router]
  );

  const descargarPdfBase64 = (rep: CopilotoReporteGenerado) => {
    if (!rep.pdfBase64) {
      router.push(rep.rutaReportes);
      setAbierto(false);
      return;
    }
    try {
      const byteChars = atob(rep.pdfBase64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const isCsv = (rep.nombreArchivo || "").toLowerCase().endsWith(".csv");
      const blob = new Blob([new Uint8Array(byteNumbers)], {
        type: isCsv ? "text/csv;charset=utf-8" : "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = rep.nombreArchivo || "reporte_ficct.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErrorVoz("No se pudo descargar el PDF generado.");
    }
  };

  const confirmarAccion = async (
    msgId: string,
    conf: CopilotoConfirmacionPendiente
  ) => {
    if (cargando) return;
    const idsSeleccionados = conf.items
      ? conf.items.filter((i) => i.seleccionado).map((i) => i.id)
      : undefined;

    if (conf.items && conf.items.length > 0 && (!idsSeleccionados || idsSeleccionados.length === 0)) {
      setErrorVoz("Selecciona al menos una actividad para aplicar el cambio.");
      return;
    }

    setCargando(true);
    setErrorVoz(null);
    setMensajes((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, confirmacionResuelta: true } : m
      )
    );
    try {
      const resp = await copilotoAPI.confirmar({
        tipoAccion: conf.tipoAccion,
        targetId: conf.targetId,
        targetIds: idsSeleccionados,
        valorTexto: conf.valorTexto,
        habilitada: conf.habilitada,
        fechaHabilitacion: conf.fechaHabilitacion || null,
        fechaEntrega: conf.fechaEntrega || null,
        fechaCorte: conf.fechaCorte || null,
      });
      setMensajes((prev) => [
        ...prev,
        {
          id: `conf-${Date.now()}`,
          role: "assistant",
          content: resp.mensaje,
        },
      ]);
    } catch (err: any) {
      setMensajes((prev) => [
        ...prev,
        {
          id: `cerr-${Date.now()}`,
          role: "assistant",
          content: err?.message || "No se pudo ejecutar la confirmación.",
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const actualizarConfirmacion = (
    msgId: string,
    patch: Partial<CopilotoConfirmacionPendiente>
  ) => {
    setMensajes((prev) =>
      prev.map((m) =>
        m.id === msgId && m.confirmacion
          ? { ...m, confirmacion: { ...m.confirmacion, ...patch } }
          : m
      )
    );
  };

  const toggleItemConfirmacion = (msgId: string, itemId: number) => {
    setMensajes((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.confirmacion?.items) return m;
        return {
          ...m,
          confirmacion: {
            ...m.confirmacion,
            items: m.confirmacion.items.map((it) =>
              it.id === itemId ? { ...it, seleccionado: !it.seleccionado } : it
            ),
          },
        };
      })
    );
  };

  const cancelarAccion = (msgId: string) => {
    setMensajes((prev) => [
      ...prev.map((m) =>
        m.id === msgId ? { ...m, confirmacionResuelta: true } : m
      ),
      {
        id: `canc-${Date.now()}`,
        role: "assistant",
        content: "Acción cancelada. No se realizó ningún cambio.",
      },
    ]);
  };

  const toggleMicrofono = () => {
    setErrorVoz(null);

    if (escuchando && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setEscuchando(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorVoz("Tu navegador no soporta dictado por voz.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "es-ES";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setEscuchando(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        setEscuchando(false);
        if (transcript) {
          setInput(transcript);
          enviarMensaje(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setEscuchando(false);
        if (event?.error === "not-allowed") {
          setErrorVoz("Permiso de micrófono denegado.");
        } else if (event?.error !== "aborted") {
          setErrorVoz("No se pudo escuchar con claridad. Intenta de nuevo.");
        }
      };

      recognition.onend = () => setEscuchando(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setEscuchando(false);
      setErrorVoz("Error al iniciar el micrófono.");
    }
  };

  const reiniciarChat = () => {
    const welcome = [crearBienvenida()];
    setMensajes(welcome);
    setErrorVoz(null);
    try {
      sessionStorage.removeItem(cacheKey);
    } catch {}
  };

  const renderizarTextoFormateado = (texto: string) => {
    if (!texto) return null;
    const partes = texto.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return partes.map((parte, idx) => {
      if (parte.startsWith("**") && parte.endsWith("**") && parte.length > 4) {
        return (
          <strong key={idx} className="font-bold">
            {parte.slice(2, -2)}
          </strong>
        );
      }
      if (parte.startsWith("*") && parte.endsWith("*") && parte.length > 2) {
        return (
          <strong key={idx} className="font-semibold">
            {parte.slice(1, -1)}
          </strong>
        );
      }
      return <React.Fragment key={idx}>{parte}</React.Fragment>;
    });
  };

  const sugerencias =
    SUGERENCIAS_POR_ROL[rol] || SUGERENCIAS_POR_ROL.ESTUDIANTE;

  return (
    <>
      {/* Burbuja Flotante Arrastrable (Solo icono de robot, snap izquierda/derecha, toggle abrir/cerrar) */}
      {pos && (
        <button
          type="button"
          onPointerDown={handlePointerDown}
          aria-label={abierto ? "Ocultar Copiloto" : "Abrir Copiloto"}
          style={{
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            touchAction: "none",
          }}
          className={`fixed z-40 w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-accent via-accent to-blue-600 text-white shadow-xl shadow-accent/35 hover:shadow-2xl hover:scale-105 active:scale-95 border border-white/25 select-none cursor-grab active:cursor-grabbing ${
            arrastrando ? "" : "transition-all duration-300 ease-out"
          }`}
        >
          <Bot className="w-6 h-6 text-white pointer-events-none" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-accent animate-pulse pointer-events-none" />
        </button>
      )}

      {/* Ventana de Chat alineada al lado donde se anclo la burbuja */}
      {abierto && (
        <div
          className={`fixed bottom-20 md:bottom-24 z-40 w-[calc(100vw-2rem)] sm:w-[400px] h-[520px] max-h-[calc(100vh-8rem)] flex flex-col rounded-3xl bg-surface/95 backdrop-blur-2xl border border-line/80 shadow-2xl shadow-black/25 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 ${
            lado === "left" ? "left-4 md:left-6" : "right-4 md:right-6"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-accent/15 via-blue-500/10 to-transparent border-b border-line/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center text-white shadow-md shadow-accent/25">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink leading-tight">
                  Copiloto FICCT
                </h3>
                <p className="text-[11px] text-ink-faint flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {rol} · Borrador guardado en sesión
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={reiniciarChat}
                title="Limpiar conversación"
                className="p-2 rounded-xl text-ink-faint hover:text-ink hover:bg-surface-hover transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                title="Ocultar chat"
                className="p-2 rounded-xl text-ink-faint hover:text-ink hover:bg-surface-hover transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth">
            {mensajes.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-accent text-white rounded-br-md"
                      : "bg-surface-alt/90 text-ink border border-line/70 rounded-bl-md"
                  }`}
                >
                  {renderizarTextoFormateado(msg.content)}
                </div>

                {/* Tarjetas interactivas de Aulas / Navegacion */}
                {msg.opciones && msg.opciones.length > 0 && (
                  <div className="w-full mt-2 space-y-1.5">
                    {msg.opciones.map((op, idx) => (
                      <button
                        key={`${op.ruta}-${idx}`}
                        type="button"
                        onClick={() => {
                          router.push(op.ruta);
                          setAbierto(false);
                        }}
                        className="w-full text-left group flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-surface hover:bg-accent/5 border border-line hover:border-accent/40 transition-all shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-accent shrink-0" />
                            <p className="text-xs font-bold text-ink truncate group-hover:text-accent transition-colors">
                              {op.titulo}
                            </p>
                          </div>
                          {op.subtitulo && (
                            <p className="text-[11px] text-ink-faint truncate pl-5">
                              {op.subtitulo}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {op.badge && !op.badge.startsWith("0 ") ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                              <Clock className="w-2.5 h-2.5" />
                              {op.badge}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Al día
                            </span>
                          )}
                          <ArrowRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Tarjeta de Confirmacion Human-in-the-Loop */}
                {msg.confirmacion && !msg.confirmacionResuelta && (
                  <div className="w-full mt-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>{msg.confirmacion.titulo}</span>
                    </div>
                    {msg.confirmacion.detalle && (
                      <p className="text-[11px] text-ink-faint">
                        {msg.confirmacion.detalle}
                      </p>
                    )}

                    {/* Mini-formulario editable de 3 fechas (Tareas o Plantillas) */}
                    {(msg.confirmacion.tipoAccion === "GESTIONAR_TAREA" ||
                      msg.confirmacion.tipoAccion ===
                        "GESTIONAR_PLANTILLA_TAREA") && (
                      <div className="space-y-2 pt-1 border-t border-amber-500/20">
                        <label className="flex items-center justify-between text-[11px] font-semibold text-ink">
                          <span>Estado de la tarea</span>
                          <button
                            type="button"
                            onClick={() =>
                              actualizarConfirmacion(msg.id, {
                                habilitada: !msg.confirmacion?.habilitada,
                              })
                            }
                            className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold transition-colors ${
                              msg.confirmacion.habilitada
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {msg.confirmacion.habilitada
                              ? "Habilitada"
                              : "Deshabilitada"}
                          </button>
                        </label>
                        <div className="grid grid-cols-1 gap-1.5">
                          <label className="flex flex-col gap-0.5 text-[10.5px] text-ink-faint">
                            <span>Fecha de apertura / habilitación</span>
                            <input
                              type="datetime-local"
                              value={msg.confirmacion.fechaHabilitacion || ""}
                              onChange={(e) =>
                                actualizarConfirmacion(msg.id, {
                                  fechaHabilitacion: e.target.value,
                                })
                              }
                              className="bg-surface border border-line rounded-lg px-2 py-1 text-[11px] text-ink"
                            />
                          </label>
                          <label className="flex flex-col gap-0.5 text-[10.5px] text-ink-faint">
                            <span>Fecha límite de entrega</span>
                            <input
                              type="datetime-local"
                              value={msg.confirmacion.fechaEntrega || ""}
                              onChange={(e) =>
                                actualizarConfirmacion(msg.id, {
                                  fechaEntrega: e.target.value,
                                })
                              }
                              className="bg-surface border border-line rounded-lg px-2 py-1 text-[11px] text-ink"
                            />
                          </label>
                          <label className="flex flex-col gap-0.5 text-[10.5px] text-ink-faint">
                            <span>Fecha de cierre / corte</span>
                            <input
                              type="datetime-local"
                              value={msg.confirmacion.fechaCorte || ""}
                              onChange={(e) =>
                                actualizarConfirmacion(msg.id, {
                                  fechaCorte: e.target.value,
                                })
                              }
                              className="bg-surface border border-line rounded-lg px-2 py-1 text-[11px] text-ink"
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Lista con checkboxes para acciones en lote */}
                    {msg.confirmacion.items &&
                      msg.confirmacion.items.length > 0 && (
                        <div className="space-y-1.5 pt-1 border-t border-amber-500/20 max-h-40 overflow-y-auto">
                          {msg.confirmacion.items.map((item) => (
                            <label
                              key={item.id}
                              className="flex items-start gap-2 p-2 rounded-xl bg-surface/90 border border-line cursor-pointer hover:border-amber-500/40"
                            >
                              <input
                                type="checkbox"
                                checked={item.seleccionado}
                                onChange={() =>
                                  toggleItemConfirmacion(msg.id, item.id)
                                }
                                className="mt-0.5 accent-amber-500"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11.5px] font-bold text-ink truncate">
                                  {item.titulo}
                                </p>
                                <p className="text-[10.5px] text-ink-faint truncate">
                                  {item.subtitulo}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={cargando}
                        onClick={() =>
                          confirmarAccion(msg.id, msg.confirmacion!)
                        }
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                      >
                        Aceptar y Guardar
                      </button>
                      <button
                        type="button"
                        disabled={cargando}
                        onClick={() => cancelarAccion(msg.id)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-surface border border-line text-ink-soft hover:bg-surface-hover transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Tarjeta de Reporte PDF generado directo en el chat */}
                {msg.reporte && (
                  <div className="w-full mt-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-ink truncate">
                          {msg.reporte.titulo}
                        </p>
                        <p className="text-[11px] text-ink-faint">
                          {msg.reporte.resumen}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => descargarPdfBase64(msg.reporte!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {msg.reporte.pdfBase64 ? "Descargar PDF" : "Abrir en Reportes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          router.push(msg.reporte!.rutaReportes);
                          setAbierto(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-surface border border-line text-ink hover:border-accent/40 transition-colors"
                      >
                        Ver tabla en Reportes
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {cargando && (
              <div className="flex items-start">
                <div className="bg-surface-alt/90 border border-line/70 rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-2 text-xs text-ink-faint">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                  <span>Consultando...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Sugerencias rápidas */}
          {mensajes.length <= 2 && !cargando && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {sugerencias.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => enviarMensaje(sug)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-surface-alt hover:bg-accent/10 text-ink-soft hover:text-accent border border-line/80 hover:border-accent/30 transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Error de voz o validacion */}
          {errorVoz && (
            <div className="mx-4 mb-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-500 font-medium">
              {errorVoz}
            </div>
          )}

          {/* Input + Microfono + Enviar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviarMensaje();
            }}
            className="p-3 border-t border-line/70 bg-surface/80 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleMicrofono}
              disabled={cargando}
              title={escuchando ? "Detener dictado" : "Hablar por micrófono"}
              className={`p-2.5 rounded-xl transition-all shrink-0 ${
                escuchando
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse"
                  : "bg-surface-alt text-ink-faint hover:text-accent hover:bg-accent/10 border border-line/70"
              }`}
            >
              {escuchando ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                escuchando ? "Escuchando..." : "Escribe o usa el micrófono..."
              }
              disabled={cargando}
              className="flex-1 bg-surface-alt/80 border border-line/80 focus:border-accent/60 rounded-xl px-3 py-2 text-xs text-ink placeholder:text-ink-faint focus:outline-none transition-colors"
            />

            <button
              type="submit"
              disabled={!input.trim() || cargando}
              className="p-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Modal Elegante de Transicion al Agente de Convocatorias */}
      {transicionandoAgente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-surface/95 border border-line/80 shadow-2xl p-6 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center text-white shadow-lg shadow-accent/30 animate-pulse">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-ink">
                Transfiriendo al Agente IA
              </h3>
              <p className="text-xs text-ink-faint">
                Abriendo el asistente especializado para crear tu convocatoria...
              </p>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-alt overflow-hidden">
              <div className="h-full bg-gradient-to-r from-accent to-blue-500 animate-pulse w-full rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* Modal Agente de Convocatorias invocado por Handoff */}
      {agenteConvocatoriaAbierto && (
        <AgenteConvocatoriaModal
          isOpen={agenteConvocatoriaAbierto}
          onClose={() => setAgenteConvocatoriaAbierto(false)}
          estadoFormulario={{
            tipo: "FERIA",
            modalidadInscripcion: "GRUPAL",
            titulo: "",
            descripcion: "",
            fechaFinInscripcion: "",
            cuposMinEquipo: 1,
            cuposMaxEquipo: 5,
            requisitos: [],
            selectedDocenteIds: [],
          }}
          onAplicarBorrador={() => {
            setAgenteConvocatoriaAbierto(false);
            router.push("/dashboard/convocatorias");
          }}
        />
      )}
    </>
  );
}
