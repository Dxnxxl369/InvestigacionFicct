"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  actionUrl?: string;
  actionLabel?: string;
}

export function AssistantChat() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: "¡Hola! Soy tu asistente de investigación FICCT. ¿En qué puedo orientarte hoy?",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = (userText?: string) => {
    const query = (userText || input).trim();
    if (!query) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!userText) setInput("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const lower = query.toLowerCase();
      let botResponse: Message = {
        id: Math.random().toString(),
        sender: "bot",
        text: "Entiendo tu consulta. Puedes explorar todas las opciones activas desde el portal o el panel institucional.",
      };

      if (lower.includes("convocatoria") || lower.includes("feria") || lower.includes("evento")) {
        botResponse = {
          id: Math.random().toString(),
          sender: "bot",
          text: "Tenemos convocatorias vigentes para la Feria Científica y Hackathons 2026. ¿Deseas revisarlas o crear una nueva?",
          actionUrl: "/dashboard/convocatorias",
          actionLabel: "Ver Convocatorias",
        };
      } else if (lower.includes("crear") || lower.includes("nueva")) {
        botResponse = {
          id: Math.random().toString(),
          sender: "bot",
          text: "Como docente u organizador puedes parametrizar fechas, rangos de integrantes y requisitos con vista previa en vivo.",
          actionUrl: "/dashboard/convocatorias/nueva",
          actionLabel: "Abrir Formulario de Convocatoria",
        };
      } else if (lower.includes("ia") || lower.includes("detector") || lower.includes("originalidad")) {
        botResponse = {
          id: Math.random().toString(),
          sender: "bot",
          text: "El clasificador inteligente RoBERTa analiza la coherencia y originalidad de informes científicos antes de la revisión formal por jurados.",
        };
      } else if (lower.includes("certificado") || lower.includes("blockchain")) {
        botResponse = {
          id: Math.random().toString(),
          sender: "bot",
          text: "Los certificados de investigación emitidos cuentan con hash criptográfico verificable para evitar falsificaciones.",
        };
      } else if (lower.includes("usuario") || lower.includes("rol") || lower.includes("permiso")) {
        botResponse = {
          id: Math.random().toString(),
          sender: "bot",
          text: "La administración de roles (Admin, Docente, Jurado, Estudiante) está protegida con control granular y defensa en profundidad.",
          actionUrl: "/dashboard/usuarios",
          actionLabel: "Ir a Gestión de Usuarios",
        };
      }

      setMessages((prev) => [...prev, botResponse]);
    }, 850);
  };

  const handleChipClick = (text: string) => {
    handleSend(text);
  };

  return (
    <>
      {/* Botón flotante Liquid Glass */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Asistente Virtual Inteligente"
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-ink text-paper dark:bg-accent dark:text-white shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center border border-white/20 group hover:opacity-90"
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <div className="relative flex items-center justify-center">
            {/* Sparkle / Bot icon */}
            <svg className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-seal border-2 border-white status-dot-ping" />
          </div>
        )}
      </button>

      {/* Panel del Chatbot en Liquid Glass */}
      <div
        className={`fixed bottom-40 right-4 md:bottom-24 md:right-6 z-50 w-[350px] max-w-[calc(100vw-32px)] liquid-glass rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 translate-y-4 pointer-events-none"
        }`}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line-soft bg-paper-raised/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center font-bold text-xs">
              AI
            </div>
            <div>
              <div className="text-[13px] font-semibold text-ink leading-tight">Asistente FICCT</div>
              <div className="text-[11px] text-ink-faint flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                Inteligencia de Apoyo
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-ink-faint hover:text-ink text-xs p-1.5 rounded-md hover:bg-paper-raised"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo de Mensajes */}
        <div className="p-3.5 flex flex-col gap-3 max-h-[360px] min-h-[220px] overflow-y-auto text-[13px]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed ${
                m.sender === "user"
                  ? "self-end bg-ink text-paper rounded-br-none shadow-sm"
                  : "self-start bg-paper-raised/90 border border-line-soft text-ink rounded-bl-none shadow-sm"
              }`}
            >
              <p className="whitespace-pre-line">{m.text}</p>
              {m.actionUrl && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push(m.actionUrl!);
                  }}
                  className="mt-2 text-xs font-semibold text-accent-dark bg-accent-soft px-2.5 py-1 rounded-md hover:bg-accent hover:text-white transition-colors flex items-center gap-1.5"
                >
                  {m.actionLabel || "Abrir enlace"} →
                </button>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="self-start bg-paper-raised/90 border border-line-soft rounded-xl rounded-bl-none px-3.5 py-2 flex items-center gap-1.5">
              <span className="typing-dot" style={{ animationDelay: "0ms" }} />
              <span className="typing-dot" style={{ animationDelay: "150ms" }} />
              <span className="typing-dot" style={{ animationDelay: "300ms" }} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chips de sugerencias rápidas */}
        <div className="px-3 py-2 border-t border-line-soft/60 flex items-center gap-1.5 overflow-x-auto text-[11.5px] bg-paper-raised/20">
          <button
            onClick={() => handleChipClick("Ver convocatorias abiertas")}
            className="whitespace-nowrap px-2.5 py-1 rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors"
          >
            📋 Convocatorias
          </button>
          <button
            onClick={() => handleChipClick("¿Cómo crear una feria?")}
            className="whitespace-nowrap px-2.5 py-1 rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors"
          >
            ➕ Nueva Feria
          </button>
          <button
            onClick={() => handleChipClick("¿Cómo funciona el detector IA?")}
            className="whitespace-nowrap px-2.5 py-1 rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors"
          >
            🧠 Detector IA
          </button>
        </div>

        {/* Input de envío */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 p-2.5 border-t border-line-soft bg-paper-raised/40"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregúntame algo..."
            className="flex-1 bg-paper-sunken/80 border border-line rounded-full px-3.5 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-dark disabled:opacity-40 transition-all flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}
