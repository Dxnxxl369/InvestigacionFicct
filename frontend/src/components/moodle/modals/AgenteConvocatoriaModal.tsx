"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Send,
  Bot,
  AlertCircle,
  RefreshCw,
  X,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  ListChecks,
  FileText,
  Calendar,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  estadoFormulario: {
    tipo: "FERIA" | "HACKATHON" | "CONCURSO" | "INVESTIGACION";
    modalidadInscripcion: "INDIVIDUAL" | "GRUPAL";
    titulo: string;
    descripcion: string;
    fechaFinInscripcion: string;
    cuposMinEquipo: number;
    cuposMaxEquipo: number;
    requisitos: string[];
    selectedDocenteIds: number[];
  };
  onAplicarBorrador: (borrador: any) => void;
}

interface MensajeChat {
  id: string;
  remitente: "USER" | "AGENTE";
  texto: string;
  tiempo: string;
}

export default function AgenteConvocatoriaModal({
  isOpen,
  onClose,
  estadoFormulario,
  onAplicarBorrador,
}: Props) {
  const router = useRouter();
  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    {
      id: "init",
      remitente: "AGENTE",
      texto:
        "¡Hola! Soy tu Asistente IA para la creación de convocatorias FICCT. Dime en tus palabras qué evento deseas organizar (tipo, fecha límite, si es individual o grupal, o requisitos especiales) y armaré el borrador por ti.",
      tiempo: "Ahora",
    },
  ]);
  const [inputTexto, setInputTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [ultimoBorrador, setUltimoBorrador] = useState<any>(null);
  const [docentesDisponibles, setDocentesDisponibles] = useState<
    Array<{ id: number; nombreCompleto: string; email: string }>
  >([]);
  const [camposFaltantes, setCamposFaltantes] = useState<string[]>([]);
  const [progreso, setProgreso] = useState<number>(30);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cargar docentes activos inmediatamente al abrir el modal (sin esperar al primer mensaje)
  useEffect(() => {
    if (!isOpen) return;
    const cargarDocentesIniciales = async () => {
      try {
        const res = await api.getEncargadosDisponibles();
        if (res && res.docentes) {
          setDocentesDisponibles(
            res.docentes.map((d: any) => ({
              id: d.id,
              nombreCompleto: `${d.nombre || ""} ${d.apellido || ""}`.trim() || d.nombre || "Docente",
              email: d.email,
            }))
          );
        }
      } catch (err) {
        console.warn("No se pudieron precargar los docentes en el modal:", err);
      }
    };
    cargarDocentesIniciales();
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes, cargando]);

  if (!isOpen) return null;

  const enviarMensaje = async (textoAEnviar?: string) => {
    const texto = (textoAEnviar || inputTexto).trim();
    if (!texto || cargando) return;

    const ahora = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const nuevoMsgUser: MensajeChat = {
      id: Date.now().toString(),
      remitente: "USER",
      texto,
      tiempo: ahora,
    };

    setMensajes((prev) => [...prev, nuevoMsgUser]);
    setInputTexto("");
    setCargando(true);

    try {
      const resp = await api.chatAgenteConvocatoria({
        mensaje: texto,
        estadoActual: ultimoBorrador || estadoFormulario,
        historial: mensajes.map((m) => ({ remitente: m.remitente, texto: m.texto })),
      });

      const nuevoMsgAgente: MensajeChat = {
        id: (Date.now() + 1).toString(),
        remitente: "AGENTE",
        texto: resp.mensajeAgente,
        tiempo: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMensajes((prev) => [...prev, nuevoMsgAgente]);
      if (resp.borradorActualizado) {
        setUltimoBorrador(resp.borradorActualizado);
        onAplicarBorrador(resp.borradorActualizado);
      }
      setCamposFaltantes(resp.camposFaltantes || []);
      setDocentesDisponibles(resp.docentesDisponibles || []);
      setProgreso(resp.porcentajeProgreso || 50);
    } catch (err: any) {
      setMensajes((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          remitente: "AGENTE",
          texto:
            "Hubo un inconveniente al conectar con el servicio de IA: " + (err.message || "Error desconocido"),
          tiempo: ahora,
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarDocente = (doc: { id: number; nombreCompleto: string }) => {
    const idsActuales = ultimoBorrador?.selectedDocenteIds || estadoFormulario.selectedDocenteIds || [];
    const yaAsignado = idsActuales.includes(doc.id);
    const nuevosIds = yaAsignado
      ? idsActuales.filter((id: number) => id !== doc.id)
      : [...idsActuales, doc.id];

    const borradorActualizado = {
      ...(ultimoBorrador || estadoFormulario),
      selectedDocenteIds: nuevosIds,
    };
    setUltimoBorrador(borradorActualizado);
    onAplicarBorrador(borradorActualizado);

    enviarMensaje(
      yaAsignado
        ? `Remover al docente ${doc.nombreCompleto}`
        : `Asignar como docente encargado a ${doc.nombreCompleto}`
    );
  };

  const irAFormularioCompleto = () => {
    // Si tenemos un borrador generado, persistirlo directamente en la clave esperada
    const datosAGuardar = ultimoBorrador || estadoFormulario;
    if (datosAGuardar) {
      try {
        const payload = {
          titulo: datosAGuardar.titulo || "",
          descripcion: datosAGuardar.descripcion || "",
          tipo: datosAGuardar.tipo || "HACKATHON",
          modalidadInscripcion: datosAGuardar.modalidadInscripcion || "GRUPAL",
          fechaFinInscripcion: datosAGuardar.fechaFinInscripcion || "2026-11-15",
          cuposMinEquipo: datosAGuardar.cuposMinEquipo !== undefined ? datosAGuardar.cuposMinEquipo : 2,
          cuposMaxEquipo: datosAGuardar.cuposMaxEquipo !== undefined ? datosAGuardar.cuposMaxEquipo : 5,
          requisitos: Array.isArray(datosAGuardar.requisitos) ? datosAGuardar.requisitos : [],
          selectedDocenteIds: Array.isArray(datosAGuardar.selectedDocenteIds) ? datosAGuardar.selectedDocenteIds : [],
          savedAt: new Date().toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        };
        localStorage.setItem("ficct_convocatoria_nueva_draft", JSON.stringify(payload));
      } catch (e) {
        console.warn("No se pudo escribir el borrador en localStorage:", e);
      }
    }
    onClose();
    window.location.href = "/dashboard/convocatorias/nueva";
  };

  const borradorVisible = ultimoBorrador || estadoFormulario;
  const docenteIds = borradorVisible?.selectedDocenteIds || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
      <div className="flex flex-col h-[92vh] w-full max-w-5xl bg-paper-raised rounded-2xl border border-line shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera del Agente */}
        <div className="px-6 py-4 bg-paper border-b border-line flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-accent to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-base font-bold text-ink">Agente IA de Convocatorias FICCT</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                  Llama 3 / Groq LPU
                </span>
              </div>
              <p className="text-xs text-ink-soft">
                Diseña, redacta y completa los requisitos y docentes de tu convocatoria en lenguaje natural.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Completitud</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-paper-sunken rounded-full overflow-hidden border border-line">
                  <div
                    className="h-full bg-accent transition-all duration-500"
                    style={{ width: `${progreso}%` }}
                  ></div>
                </div>
                <span className="text-xs font-bold text-accent">{progreso}%</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-paper-sunken transition"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra Deslizable de Pastillas de Docentes (Carousel / Chips) */}
        <div className="px-5 py-2.5 bg-paper-sunken/70 border-b border-line flex items-center gap-2 overflow-x-auto flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink-soft whitespace-nowrap mr-2">
            <UserCheck className="w-4 h-4 text-accent" />
            <span>Docentes:</span>
          </div>

          {docentesDisponibles.length === 0 ? (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ No se encontraron docentes activos en la base de datos para asignar.
            </span>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto py-0.5">
              {docentesDisponibles.map((doc) => {
                const seleccionado = docenteIds.includes(doc.id);
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => seleccionarDocente(doc)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                      seleccionado
                        ? "bg-accent text-white shadow-sm ring-2 ring-accent/30"
                        : "bg-paper border border-line text-ink hover:border-accent hover:text-accent"
                    }`}
                  >
                    <span>{doc.nombreCompleto}</span>
                    {seleccionado ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <span className="text-[10px] text-ink-faint">+ Asignar</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cuerpo Principal: Chat (58%) + Panel de Estado Detallado (42%) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Columna Izquierda: Conversación */}
          <div className="flex-1 flex flex-col bg-paper border-r border-line overflow-hidden">
            
            {/* Mensajes */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
              {mensajes.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${msg.remitente === "USER" ? "justify-end" : "justify-start"}`}
                >
                  {msg.remitente === "AGENTE" && (
                    <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                      msg.remitente === "USER"
                        ? "bg-accent text-white rounded-tr-xs"
                        : "bg-paper-sunken text-ink border border-line-soft rounded-tl-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.texto}</p>
                    <span
                      className={`block text-[9px] mt-1.5 text-right ${
                        msg.remitente === "USER" ? "text-white/70" : "text-ink-faint"
                      }`}
                    >
                      {msg.tiempo}
                    </span>
                  </div>
                </div>
              ))}

              {cargando && (
                <div className="flex items-center gap-2 text-xs text-ink-soft bg-paper-sunken p-3 rounded-xl border border-line-soft w-fit">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />
                  <span>El agente está procesando y extrayendo los datos...</span>
                </div>
              )}
            </div>

            {/* Sugerencias Rápidas */}
            <div className="px-4 py-2 bg-paper-sunken/40 border-t border-line flex gap-2 overflow-x-auto text-xs flex-shrink-0">
              <button
                type="button"
                onClick={() =>
                  enviarMensaje("Quiero crear un Hackathon de Cloud y Software para el 15 de noviembre, inscripción grupal de hasta 5 personas")
                }
                className="whitespace-nowrap px-3 py-1 rounded-full bg-paper border border-line text-ink-soft hover:text-accent hover:border-accent transition text-[11px]"
              >
                🚀 Hackathon Cloud (Grupal de 5)
              </button>
              <button
                type="button"
                onClick={() =>
                  enviarMensaje("Crea una Feria Facultativa de Ciencia y Tecnología para fin de semestre con equipos de 2 a 4 estudiantes")
                }
                className="whitespace-nowrap px-3 py-1 rounded-full bg-paper border border-line text-ink-soft hover:text-accent hover:border-accent transition text-[11px]"
              >
                🏆 Feria Facultativa de Proyectos
              </button>
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-paper border-t border-line flex-shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  enviarMensaje();
                }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={inputTexto}
                  onChange={(e) => setInputTexto(e.target.value)}
                  placeholder="Escribe aquí (ej. 'agrega el requisito de ser de 6to semestre' o 'cambia la fecha al 20 de noviembre')..."
                  className="w-full bg-paper-sunken border border-line rounded-xl pl-4 pr-12 py-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:bg-paper transition"
                  disabled={cargando}
                />
                <button
                  type="submit"
                  disabled={cargando || !inputTexto.trim()}
                  className="absolute right-1.5 w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

          </div>

          {/* Columna Derecha: Tarjeta de Resumen en Vivo Completa con Requisitos y Descripción */}
          <div className="w-full md:w-96 bg-paper-sunken/60 p-4 border-t md:border-t-0 md:border-l border-line flex flex-col justify-between overflow-y-auto">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  Borrador en Vivo
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-accent/10 text-accent">
                  Sincronizado
                </span>
              </div>

              {/* Título */}
              <div className="p-2.5 rounded-lg bg-paper border border-line space-y-1">
                <span className="text-[10px] font-semibold text-ink-faint uppercase block">Título</span>
                <p className="font-bold text-ink text-xs leading-snug">
                  {borradorVisible?.titulo || "Sin título definido aún"}
                </p>
              </div>

              {/* Tipo y Modalidad */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-paper border border-line">
                  <span className="text-[10px] font-semibold text-ink-faint uppercase block">Tipo</span>
                  <span className="font-bold text-accent text-[11px]">
                    {borradorVisible?.tipo || "HACKATHON"}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-paper border border-line">
                  <span className="text-[10px] font-semibold text-ink-faint uppercase block">Modalidad</span>
                  <span className="font-bold text-ink text-[11px] flex items-center gap-1">
                    <Users className="w-3 h-3 text-ink-soft" />
                    {borradorVisible?.modalidadInscripcion || "GRUPAL"}
                    {borradorVisible?.modalidadInscripcion === "GRUPAL" && (
                      <span className="text-[10px] text-ink-soft">
                        ({borradorVisible?.cuposMinEquipo || 2} a {borradorVisible?.cuposMaxEquipo || 5})
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Fecha de Cierre */}
              <div className="p-2 rounded-lg bg-paper border border-line flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-ink-faint uppercase block">Cierre Inscripción</span>
                  <span className="font-bold text-ink text-xs">
                    {borradorVisible?.fechaFinInscripcion || "Sin fecha asignada"}
                  </span>
                </div>
                <Calendar className="w-4 h-4 text-ink-soft" />
              </div>

              {/* Descripción */}
              <div className="p-2.5 rounded-lg bg-paper border border-line space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-ink-faint uppercase">
                  <FileText className="w-3 h-3" />
                  <span>Descripción del Evento</span>
                </div>
                <p className="text-[11px] text-ink-soft leading-relaxed line-clamp-3">
                  {borradorVisible?.descripcion || "El agente redactará una descripción completa..."}
                </p>
              </div>

              {/* Requisitos Generados */}
              <div className="p-2.5 rounded-lg bg-paper border border-line space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-ink-faint uppercase">
                    <ListChecks className="w-3 h-3 text-accent" />
                    <span>Requisitos ({borradorVisible?.requisitos?.length || 0})</span>
                  </div>
                </div>
                {borradorVisible?.requisitos && borradorVisible.requisitos.length > 0 ? (
                  <ul className="space-y-1">
                    {borradorVisible.requisitos.map((req: string, i: number) => (
                      <li key={i} className="text-[11px] text-ink flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span className="leading-tight">{req}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10px] text-ink-faint italic">No se han definido requisitos aún.</p>
                )}
              </div>

              {/* Campos Faltantes */}
              {camposFaltantes.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Faltan definir:</span>
                  </div>
                  <ul className="list-disc list-inside text-[10px] space-y-0.5 ml-1">
                    {camposFaltantes.map((cf, i) => (
                      <li key={i}>{cf}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Botón de Aplicar y Navegar al Formulario */}
            <div className="pt-3 border-t border-line mt-3 space-y-2 flex-shrink-0">
              <button
                type="button"
                onClick={irAFormularioCompleto}
                className="w-full py-2.5 px-4 rounded-xl bg-accent hover:opacity-90 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                <span>Ver y Editar en Formulario</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
