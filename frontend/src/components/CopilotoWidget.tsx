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
} from "lucide-react";
import {
  copilotoAPI,
  CopilotoChatMessage,
  CopilotoOpcionNavegacion,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AgenteConvocatoriaModal from "@/components/moodle/modals/AgenteConvocatoriaModal";

interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  opciones?: CopilotoOpcionNavegacion[];
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
    "Crear una convocatoria",
    "Ir a reportes",
    "Gestionar usuarios",
  ],
  JURADO: [
    "Proyectos por evaluar",
    "Ir a evaluaciones",
    "Ir a mi perfil",
  ],
};

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

  const [mensajes, setMensajes] = useState<ChatItem[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hola ${nombreCorto}, soy tu Copiloto FICCT. Pídeme ver tus pendientes, navegar a cualquier sección o crear una convocatoria.`,
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setMensajes((prev) => {
      if (prev.length === 1 && prev[0].id === "welcome") {
        return [
          {
            id: "welcome",
            role: "assistant",
            content: `Hola ${nombreCorto}, soy tu Copiloto FICCT. Pídeme ver tus pendientes, navegar a cualquier sección o crear una convocatoria.`,
          },
        ];
      }
      return prev;
    });
  }, [nombreCorto]);

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
          opciones: resp.opciones && resp.opciones.length > 0 ? resp.opciones : undefined,
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
    setMensajes([
      {
        id: "welcome",
        role: "assistant",
        content: `Hola ${nombreCorto}, soy tu Copiloto FICCT. Pídeme ver tus pendientes, navegar a cualquier sección o crear una convocatoria.`,
      },
    ]);
    setErrorVoz(null);
  };

  const sugerencias =
    SUGERENCIAS_POR_ROL[rol] || SUGERENCIAS_POR_ROL.ESTUDIANTE;

  return (
    <>
      {/* Boton Flotante Liquid Glass */}
      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir Copiloto FICCT"
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 group flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-br from-accent via-accent to-blue-600 text-white shadow-xl shadow-accent/30 hover:shadow-2xl hover:shadow-accent/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 border border-white/25"
        >
          <span className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-white/20 backdrop-blur-sm">
            <Bot className="w-4 h-4 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-accent animate-pulse" />
          </span>
          <span className="text-xs font-bold tracking-wide pr-0.5 hidden sm:inline">
            Copiloto IA
          </span>
        </button>
      )}

      {/* Ventana de Chat Copiloto */}
      {abierto && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-[calc(100vw-2rem)] sm:w-[400px] h-[530px] max-h-[calc(100vh-7rem)] flex flex-col rounded-3xl bg-surface/95 backdrop-blur-2xl border border-line/80 shadow-2xl shadow-black/25 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-accent/15 via-blue-500/10 to-transparent border-b border-line/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center text-white shadow-md shadow-accent/25">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink leading-tight">
                  Copiloto FICCT
                </h3>
                <p className="text-[11px] text-ink-faint flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Navegación inteligente · {rol}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={reiniciarChat}
                title="Reiniciar conversación"
                className="p-2 rounded-xl text-ink-faint hover:text-ink hover:bg-surface-hover transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                title="Cerrar"
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
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-accent text-white rounded-br-md"
                      : "bg-surface-alt/90 text-ink border border-line/70 rounded-bl-md"
                  }`}
                >
                  {msg.content}
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

          {/* Error de voz */}
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
