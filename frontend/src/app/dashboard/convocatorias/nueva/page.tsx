"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, ConvocatoriaRequest } from "@/lib/api";
import {
  Sparkles,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  ArrowLeft,
  UploadCloud,
} from "lucide-react";

export default function NuevaConvocatoriaPage() {
  const router = useRouter();
  const { user, canEditModule } = useAuth();
  const { toast } = useToast();

  const [tipo, setTipo] = useState<"FERIA" | "HACKATHON" | "CONCURSO" | "INVESTIGACION">("FERIA");
  const [titulo, setTitulo] = useState("Feria de Ingeniería 2026");
  const [descripcion, setDescripcion] = useState(
    "Exposición anual de proyectos estudiantiles de todas las carreras de la facultad."
  );
  const [imagenPortada, setImagenPortada] = useState("");
  const [fechaFinInscripcion, setFechaFinInscripcion] = useState("2026-10-30");
  const [cuposMinEquipo, setCuposMinEquipo] = useState(1);
  const [cuposMaxEquipo, setCuposMaxEquipo] = useState(4);

  // Requisitos dinámicos
  const [requisitos, setRequisitos] = useState<string[]>([
    "Estudiante regular de la FICCT",
    "Promedio acumulado ≥ 70",
    "Carta de aval del docente guía",
  ]);
  const [newReq, setNewReq] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRequisito = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newReq.trim() && !requisitos.includes(newReq.trim())) {
      setRequisitos([...requisitos, newReq.trim()]);
      setNewReq("");
    }
  };

  const removeRequisito = (index: number) => {
    setRequisitos(requisitos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (estado: "BORRADOR" | "PUBLICADA") => {
    setError(null);
    if (!titulo.trim()) {
      setError("El título de la convocatoria es obligatorio.");
      return;
    }

    setLoading(true);
    try {
      const payload: ConvocatoriaRequest = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        tipo,
        fechaCierre: fechaFinInscripcion || undefined,
        tamanoEquipo:
          cuposMinEquipo === cuposMaxEquipo
            ? `Hasta ${cuposMaxEquipo} integrantes`
            : `${cuposMinEquipo} a ${cuposMaxEquipo} integrantes`,
        imagenPortada: imagenPortada.trim() || undefined,
        requisitos: requisitos,
      };

      const creada = await api.createConvocatoria(payload);
      if (estado === "PUBLICADA" && creada.id) {
        await api.publicarConvocatoria(creada.id);
        toast("Convocatoria creada y publicada exitosamente en el portal", "success");
      } else {
        toast("Borrador guardado exitosamente", "info");
      }
      router.push("/dashboard/convocatorias");
    } catch (err: any) {
      setError(err.message || "Error al crear la convocatoria");
      setLoading(false);
    }
  };

  const tipoLabelMap: Record<string, string> = {
    FERIA: "Feria de ingeniería",
    HACKATHON: "Hackathon",
    CONCURSO: "Concurso",
    INVESTIGACION: "Investigación",
  };

  if (!canEditModule("CONVOCATORIAS")) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center bg-paper-raised border border-line rounded-xl">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-2" />
          <h2 className="font-serif text-lg text-ink font-semibold">Acceso Denegado</h2>
          <p className="text-xs text-ink-soft mt-1">
            Tu rol actual no cuenta con permisos para crear convocatorias.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cabecera */}
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-accent font-medium mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a Convocatorias
          </button>
          <span className="block text-xs font-semibold text-ink-faint tracking-wider uppercase">
            Gestión de Convocatorias y Ferias
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-ink mt-0.5">
            Nueva Convocatoria
          </h1>
          <p className="text-xs text-ink-soft mt-1">
            Configura los parámetros, fechas y requisitos con previsualización en vivo.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Layout de 2 columnas: Formulario a la izquierda, Previsualización a la derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Formulario (7 columnas) */}
          <div className="lg:col-span-7 bg-paper-raised border border-line rounded-xl p-6 sm:p-7 shadow-sm space-y-5">
            {/* Tipo de Actividad (Pills) */}
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
                Tipo de actividad
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "FERIA", label: "Feria" },
                  { key: "HACKATHON", label: "Hackathon" },
                  { key: "CONCURSO", label: "Concurso" },
                  { key: "INVESTIGACION", label: "Investigación" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTipo(item.key as any)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                      tipo === item.key
                        ? "bg-accent-soft text-accent-dark font-semibold border-2 border-accent"
                        : "bg-paper border border-line text-ink-soft hover:border-ink"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Título */}
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1.5">
                Título del evento
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Feria de Innovación Tecnológica 2026"
                className="w-full px-3.5 py-2.5 rounded-md border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1.5">
                Descripción detallada
              </label>
              <textarea
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe el objetivo y alcance de la actividad..."
                className="w-full px-3.5 py-2.5 rounded-md border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>

            {/* URL Imagen Portada */}
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1.5">
                URL de imagen de portada (opcional)
              </label>
              <input
                type="url"
                value={imagenPortada}
                onChange={(e) => setImagenPortada(e.target.value)}
                placeholder="https://images.unsplash.com/... o deja en blanco"
                className="w-full px-3.5 py-2.5 rounded-md border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="text-[11px] text-ink-faint mt-1">
                Recomendado 1200 × 630 px. Si no se especifica, se aplicará el diseño institucional por defecto.
              </p>
            </div>

            {/* Fechas y Equipos (2 columnas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1.5">
                  Cierre de inscripción
                </label>
                <input
                  type="date"
                  value={fechaFinInscripcion}
                  onChange={(e) => setFechaFinInscripcion(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-md border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1.5">
                  Tamaño de equipo (Integrantes)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] text-ink-faint mb-1">Mínimo</div>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={cuposMinEquipo}
                      onChange={(e) => setCuposMinEquipo(Number(e.target.value) || 1)}
                      placeholder="Min"
                      className="w-full px-2.5 py-2 rounded-md border border-line bg-paper text-ink text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] text-ink-faint mb-1">Máximo</div>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={cuposMaxEquipo}
                      onChange={(e) => setCuposMaxEquipo(Number(e.target.value) || 1)}
                      placeholder="Max"
                      className="w-full px-2.5 py-2 rounded-md border border-line bg-paper text-ink text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-accent font-medium mt-1.5">
                  {cuposMinEquipo === cuposMaxEquipo
                    ? `Hasta ${cuposMaxEquipo} integrantes`
                    : `De ${cuposMinEquipo} a ${cuposMaxEquipo} integrantes`}
                </div>
              </div>
            </div>

            {/* Requisitos de Inscripción */}
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1.5">
                Requisitos de inscripción
              </label>

              <div className="flex flex-wrap gap-2 mb-2.5">
                {requisitos.map((req, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-paper border border-line text-xs text-ink-soft"
                  >
                    <span>{req}</span>
                    <button
                      type="button"
                      onClick={() => removeRequisito(idx)}
                      className="text-ink-faint hover:text-red-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escribe un requisito y presiona agregar..."
                  value={newReq}
                  onChange={(e) => setNewReq(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRequisito();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 rounded-md border border-line bg-paper text-ink text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={() => addRequisito()}
                  className="px-3.5 py-2 rounded-md bg-paper border border-line text-xs font-medium text-ink hover:bg-paper-raised flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="pt-4 border-t border-line-soft flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSubmit("BORRADOR")}
                className="px-4 py-2.5 rounded-lg border border-line text-ink-soft text-xs font-medium hover:bg-paper transition-all disabled:opacity-50"
              >
                Guardar borrador
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleSubmit("PUBLICADA")}
                className="px-5 py-2.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-opacity-95 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {loading ? "Guardando..." : "Publicar convocatoria"}
              </button>
            </div>
          </div>

          {/* Previsualización en Tiempo Real (5 columnas - STICKY) */}
          <div className="lg:col-span-5 sticky top-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-faint tracking-wider uppercase">
                Previsualización en vivo
              </span>
              <span className="text-[11px] text-accent font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Así se verá en el portal público
              </span>
            </div>

            <div className="bg-paper-raised border border-line rounded-xl overflow-hidden shadow-sm">
              {/* Header de la tarjeta */}
              <div className="h-32 bg-accent-soft border-b border-line flex items-center justify-center relative overflow-hidden">
                {imagenPortada ? (
                  <img
                    src={imagenPortada}
                    alt="Portada"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="text-center text-accent-dark font-serif text-sm">
                    <UploadCloud className="w-6 h-6 mx-auto mb-1 opacity-70" />
                    Portada Institucional FICCT
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/90 text-accent-dark shadow-sm backdrop-blur-sm">
                    {tipoLabelMap[tipo]}
                  </span>
                </div>
              </div>

              {/* Contenido de la tarjeta */}
              <div className="p-5 space-y-3">
                <h3 className="font-serif text-lg font-normal text-ink leading-snug">
                  {titulo || "Título de la convocatoria"}
                </h3>

                <p className="text-xs text-ink-soft line-clamp-3 leading-relaxed">
                  {descripcion || "La descripción aparecerá aquí tal como la redactes..."}
                </p>

                {/* Metadatos */}
                <div className="pt-3 border-t border-line-soft flex items-center justify-between text-xs text-ink-faint">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-accent" />
                    {cuposMinEquipo === cuposMaxEquipo
                      ? `Hasta ${cuposMaxEquipo} integrantes`
                      : `${cuposMinEquipo} a ${cuposMaxEquipo} integrantes`}
                  </span>

                  <span className="flex items-center gap-1 font-medium text-ink-soft">
                    <Calendar className="w-3.5 h-3.5 text-seal" />
                    Cierra{" "}
                    {fechaFinInscripcion
                      ? new Date(fechaFinInscripcion).toLocaleDateString("es-BO", {
                          day: "numeric",
                          month: "short",
                        })
                      : "Pronto"}
                  </span>
                </div>

                {/* Requisitos tags */}
                {requisitos.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1">
                    {requisitos.map((r, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-paper border border-line-soft px-2 py-0.5 rounded text-ink-soft"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
