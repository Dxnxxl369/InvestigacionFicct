"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, ConvocatoriaRequest, UserDTO, getMediaUrl } from "@/lib/api";
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
  Image as ImageIcon,
  ShieldCheck,
  Award,
  Search,
  Check,
  Trash2,
  Save,
  RotateCcw,
} from "lucide-react";

const DRAFT_KEY = "ficct_convocatoria_nueva_draft";

// Normalizador para búsqueda insensible a acentos
function normalizeText(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Convertir base64 dataURL a File para subir cuando se decida guardar
function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export default function NuevaConvocatoriaPage() {
  const router = useRouter();
  const { user, canEditModule } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tipo, setTipo] = useState<"FERIA" | "HACKATHON" | "CONCURSO" | "INVESTIGACION">("FERIA");
  const [titulo, setTitulo] = useState("Feria de Ingeniería 2026");
  const [descripcion, setDescripcion] = useState(
    "Exposición anual de proyectos estudiantiles de todas las carreras de la facultad."
  );

  // Imagen Portada (Local vs URL)
  const [imageMode, setImageMode] = useState<"LOCAL" | "URL">("LOCAL");
  const [imagenPortada, setImagenPortada] = useState("");
  const [imagenNombre, setImagenNombre] = useState<string>("");

  const [fechaFinInscripcion, setFechaFinInscripcion] = useState("2026-10-30");
  const [inscripcionGrupal, setInscripcionGrupal] = useState(false);
  const [cuposMinEquipo, setCuposMinEquipo] = useState(1);
  const [cuposMaxEquipo, setCuposMaxEquipo] = useState(4);

  // Requisitos dinámicos
  const [requisitos, setRequisitos] = useState<string[]>([
    "Estudiante regular de la FICCT",
    "Promedio acumulado ≥ 70",
    "Carta de aval del docente guía",
  ]);
  const [newReq, setNewReq] = useState("");

  // Asignación de Encargados (Docentes y Jurados)
  const [availableDocentes, setAvailableDocentes] = useState<UserDTO[]>([]);
  const [availableJurados, setAvailableJurados] = useState<UserDTO[]>([]);
  const [selectedDocenteIds, setSelectedDocenteIds] = useState<number[]>([]);
  const [selectedJuradoIds, setSelectedJuradoIds] = useState<number[]>([]);
  const [searchDocente, setSearchDocente] = useState("");
  const [searchJurado, setSearchJurado] = useState("");
  const [loadingEncargados, setLoadingEncargados] = useState(true);

  // LocalStorage Draft State
  const [lastSavedLocal, setLastSavedLocal] = useState<string | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Cargar lista de Docentes y Jurados disponibles
  useEffect(() => {
    const fetchEncargados = async () => {
      try {
        setLoadingEncargados(true);
        const res = await api.getEncargadosDisponibles();
        setAvailableDocentes(res.docentes || []);
        setAvailableJurados(res.jurados || []);
      } catch (err: any) {
        console.error("Error al cargar docentes y jurados:", err);
      } finally {
        setLoadingEncargados(false);
      }
    };
    fetchEncargados();
  }, []);

  // 2. Restaurar borrador de LocalStorage al iniciar (si existe)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedDraftStr = localStorage.getItem(DRAFT_KEY);
      if (savedDraftStr) {
        const d = JSON.parse(savedDraftStr);
        if (d.titulo) setTitulo(d.titulo);
        if (d.descripcion !== undefined) setDescripcion(d.descripcion);
        if (d.tipo) setTipo(d.tipo);
        if (d.fechaFinInscripcion) setFechaFinInscripcion(d.fechaFinInscripcion);
        if (typeof d.inscripcionGrupal === "boolean") setInscripcionGrupal(d.inscripcionGrupal);
        if (d.cuposMinEquipo) setCuposMinEquipo(d.cuposMinEquipo);
        if (d.cuposMaxEquipo) setCuposMaxEquipo(d.cuposMaxEquipo);
        if (d.requisitos) setRequisitos(d.requisitos);
        if (d.selectedDocenteIds) setSelectedDocenteIds(d.selectedDocenteIds);
        if (d.selectedJuradoIds) setSelectedJuradoIds(d.selectedJuradoIds);
        if (d.imagenPortada) setImagenPortada(d.imagenPortada);
        if (d.imagenNombre) setImagenNombre(d.imagenNombre);
        if (d.imageMode) setImageMode(d.imageMode);
        if (d.savedAt) setLastSavedLocal(d.savedAt);
        setHasRestoredDraft(true);
      }
    } catch (e) {
      console.error("Error al leer borrador local:", e);
    }
  }, []);

  // 3. Auto-guardar en LocalStorage cada vez que cambien los datos (sin saturar la base de datos)
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Solo auto-guardar si al menos hay algo escrito
    const now = new Date().toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const draftData = {
      titulo,
      descripcion,
      tipo,
      fechaFinInscripcion,
      inscripcionGrupal,
      cuposMinEquipo,
      cuposMaxEquipo,
      requisitos,
      selectedDocenteIds,
      selectedJuradoIds,
      imagenPortada,
      imagenNombre,
      imageMode,
      savedAt: now,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      setLastSavedLocal(now);
    } catch (e) {
      console.warn("No se pudo guardar en localStorage (posible límite de espacio):", e);
    }
  }, [
    titulo,
    descripcion,
    tipo,
    fechaFinInscripcion,
    inscripcionGrupal,
    cuposMinEquipo,
    cuposMaxEquipo,
    requisitos,
    selectedDocenteIds,
    selectedJuradoIds,
    imagenPortada,
    imagenNombre,
    imageMode,
  ]);

  const descartarBorradorLocal = () => {
    if (confirm("¿Estás seguro de descartar el borrador local? Se restablecerán los valores iniciales.")) {
      localStorage.removeItem(DRAFT_KEY);
      setTitulo("Feria de Ingeniería 2026");
      setDescripcion("Exposición anual de proyectos estudiantiles de todas las carreras de la facultad.");
      setTipo("FERIA");
      setFechaFinInscripcion("2026-10-30");
      setInscripcionGrupal(false);
      setCuposMinEquipo(1);
      setCuposMaxEquipo(4);
      setRequisitos([
        "Estudiante regular de la FICCT",
        "Promedio acumulado ≥ 70",
        "Carta de aval del docente guía",
      ]);
      setSelectedDocenteIds([]);
      setSelectedJuradoIds([]);
      setImagenPortada("");
      setImagenNombre("");
      setImageMode("LOCAL");
      setHasRestoredDraft(false);
      setLastSavedLocal(null);
      toast("Borrador local descartado", "info");
    }
  };

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

  // Manejo de imagen local en memoria (Base64) - NO satura la base de datos ni el servidor hasta confirmar
  const handleLocalImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError("La imagen no debe superar los 8MB para almacenamiento temporal.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagenPortada(base64);
      setImagenNombre(file.name);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  // Toggle de selección docente (soporta N docentes)
  const handleToggleDocente = (id: number) => {
    setSelectedDocenteIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  // Toggle de selección jurado (soporta N jurados)
  const handleToggleJurado = (id: number) => {
    setSelectedJuradoIds((prev) =>
      prev.includes(id) ? prev.filter((jId) => jId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (estado: "BORRADOR" | "PUBLICADA") => {
    setError(null);
    if (!titulo.trim()) {
      setError("El título de la convocatoria es obligatorio.");
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl: string | undefined = imagenPortada.trim() || undefined;

      // Si la imagen es un Base64 local, ahora sí la subimos al servidor para persistirla
      if (imagenPortada && imagenPortada.startsWith("data:image/")) {
        try {
          const fileToUpload = dataURLtoFile(imagenPortada, imagenNombre || "portada_convocatoria.jpg");
          const uploadRes = await api.uploadImagen(fileToUpload);
          finalImageUrl = uploadRes.url;
        } catch (uploadErr) {
          console.warn("No se pudo subir al storage físico, se continuará:", uploadErr);
        }
      }

      const payload: ConvocatoriaRequest = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        tipo,
        fechaCierre: fechaFinInscripcion || undefined,
        inscripcionGrupal,
        minIntegrantesGrupo: cuposMinEquipo,
        maxIntegrantesGrupo: cuposMaxEquipo,
        tamanoEquipo:
          cuposMinEquipo === cuposMaxEquipo
            ? `Hasta ${cuposMaxEquipo} integrantes`
            : `${cuposMinEquipo} a ${cuposMaxEquipo} integrantes`,
        imagenPortada: finalImageUrl,
        requisitos: requisitos,
        docenteIds: selectedDocenteIds,
        juradoIds: selectedJuradoIds,
      };

      const creada = await api.createConvocatoria(payload);

      // Asignar participantes en backend (garantía de compatibilidad total con cualquier versión del servidor)
      if (creada.id) {
        const assignPromises = [
          ...selectedDocenteIds.map((dId) =>
            api.designarParticipante(creada.id, { usuarioId: dId, rol: "DOCENTE" }).catch(() => {})
          ),
          ...selectedJuradoIds.map((jId) =>
            api.designarParticipante(creada.id, { usuarioId: jId, rol: "JURADO" }).catch(() => {})
          ),
        ];
        await Promise.all(assignPromises);

        if (estado === "PUBLICADA") {
          await api.publicarConvocatoria(creada.id);
        }
      }

      // Limpiar borrador local tras guardar exitosamente en la base de datos
      localStorage.removeItem(DRAFT_KEY);

      if (estado === "PUBLICADA") {
        toast("Convocatoria creada y publicada exitosamente en el portal", "success");
      } else {
        toast("Borrador guardado exitosamente en el sistema con sus encargados", "success");
      }
      router.push("/dashboard/convocatorias");
    } catch (err: any) {
      setError(err.message || "Error al registrar la convocatoria");
      setLoading(false);
    }
  };

  const tipoLabelMap: Record<string, string> = {
    FERIA: "Feria de ingeniería",
    HACKATHON: "Hackathon",
    CONCURSO: "Concurso",
    INVESTIGACION: "Investigación",
  };

  // Filtrado flexible e insensible a acentos
  const qDoc = normalizeText(searchDocente);
  const filteredDocentes = availableDocentes.filter((d) => {
    if (!qDoc) return true;
    const full = normalizeText(`${d.nombre} ${d.apellido}`);
    const email = normalizeText(d.email);
    return full.includes(qDoc) || email.includes(qDoc);
  });

  const qJur = normalizeText(searchJurado);
  const filteredJurados = availableJurados.filter((j) => {
    if (!qJur) return true;
    const full = normalizeText(`${j.nombre} ${j.apellido}`);
    const email = normalizeText(j.email);
    return full.includes(qJur) || email.includes(qJur);
  });

  const selectedDocentesObj = availableDocentes.filter((d) => selectedDocenteIds.includes(d.id));
  const selectedJuradosObj = availableJurados.filter((j) => selectedJuradoIds.includes(j.id));

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
        {/* Cabecera y Estado LocalStorage */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
              Configura los parámetros, personal docente/jurados a cargo y fotografía con previsualización en vivo.
            </p>
          </div>

          {/* Indicador de Auto-guardado LocalStorage */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {lastSavedLocal && (
              <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Guardado en LocalStorage ({lastSavedLocal})
              </span>
            )}
            {hasRestoredDraft && (
              <button
                type="button"
                onClick={descartarBorradorLocal}
                className="text-[11px] px-2.5 py-1 rounded-full border border-danger/30 text-danger hover:bg-danger/10 transition-colors flex items-center gap-1"
                title="Descartar borrador local y reiniciar campos"
              >
                <RotateCcw className="w-3 h-3" /> Descartar
              </button>
            )}
          </div>
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
          <div className="lg:col-span-7 bg-paper-raised border border-line rounded-xl p-6 sm:p-7 shadow-sm space-y-6">
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
                Título del evento <span className="text-danger">*</span>
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

            {/* SECCIÓN: FOTO DE PORTADA CON PREVISUALIZACIÓN IN SITU EN EL RECUADRO */}
            <div className="p-4 bg-paper rounded-xl border border-line space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                    Fotografía de Portada
                  </label>
                  <p className="text-[11px] text-ink-faint">
                    Se guarda localmente y solo se sincroniza al servidor cuando confirmes guardar.
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-paper-sunken p-0.5 rounded-lg border border-line-soft">
                  <button
                    type="button"
                    onClick={() => setImageMode("LOCAL")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      imageMode === "LOCAL"
                        ? "bg-accent text-white shadow-xs"
                        : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    Foto local
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode("URL")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      imageMode === "URL"
                        ? "bg-accent text-white shadow-xs"
                        : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    Enlace URL
                  </button>
                </div>
              </div>

              {/* RECUADRO DE PREVISUALIZACIÓN DIRECTA */}
              {imageMode === "LOCAL" ? (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleLocalImageSelect}
                    className="hidden"
                  />

                  {imagenPortada ? (
                    <div className="relative rounded-xl overflow-hidden border-2 border-line bg-paper-sunken group">
                      {/* Imagen mostrada directamente dentro de este recuadro */}
                      <div className="h-52 w-full relative">
                        <img
                          src={getMediaUrl(imagenPortada)}
                          alt="Previsualización de portada"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/70 text-white backdrop-blur-sm">
                            En memoria local
                          </span>
                        </div>
                      </div>

                      {/* Barra de control inferior en el mismo recuadro */}
                      <div className="p-3 bg-paper border-t border-line flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden text-xs text-ink-soft">
                          <ImageIcon className="w-4 h-4 text-accent flex-shrink-0" />
                          <span className="truncate max-w-[220px] font-medium text-ink">
                            {imagenNombre || "Foto de portada seleccionada"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-line bg-paper hover:bg-paper-raised text-ink transition-colors flex items-center gap-1"
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> Cambiar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setImagenPortada("");
                              setImagenNombre("");
                            }}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-danger/30 text-danger hover:bg-danger-soft/20 transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Quitar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-line hover:border-accent rounded-xl p-8 text-center cursor-pointer transition-colors bg-paper-sunken/40 hover:bg-accent-soft/20"
                    >
                      <UploadCloud className="w-9 h-9 text-accent mx-auto mb-2" />
                      <p className="text-xs font-semibold text-ink">
                        Haz clic aquí para seleccionar una foto de tu equipo
                      </p>
                      <p className="text-[11px] text-ink-faint mt-1">
                        Formatos soportados: JPG, PNG, WEBP o GIF (previsualización instantánea en este recuadro)
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="url"
                    value={imagenPortada}
                    onChange={(e) => setImagenPortada(e.target.value)}
                    placeholder="https://images.unsplash.com/... o pega el enlace web"
                    className="w-full px-3.5 py-2.5 rounded-md border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  {imagenPortada && (
                    <div className="rounded-xl overflow-hidden border border-line max-h-48 relative">
                      <img
                        src={getMediaUrl(imagenPortada)}
                        alt="Previsualización URL"
                        className="w-full h-44 object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECCIÓN: ENCARGADOS Y JURADOS (N DOCENTES Y N JURADOS) */}
            <div className="space-y-4 pt-2 border-t border-line-soft">
              <div>
                <span className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Personal a Cargo de la Convocatoria
                </span>
                <p className="text-[11px] text-ink-soft">
                  Selecciona y asigna <b>N docentes guías</b> y <b>N jurados evaluadores</b>. Se guardan en el borrador local automáticamente.
                </p>
              </div>

              {/* 1. Docentes Encargados */}
              <div className="p-4 bg-paper rounded-xl border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    <span className="text-xs font-semibold text-ink">Docentes Encargados</span>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-dark font-semibold">
                    {selectedDocenteIds.length} asignado(s)
                  </span>
                </div>

                {/* Buscador de docentes */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                  <input
                    type="text"
                    placeholder="Buscar docente por nombre o correo (ej: Rolando, rmartinez@uagrm.edu.bo)..."
                    value={searchDocente}
                    onChange={(e) => setSearchDocente(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-paper-sunken border border-line-soft focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Lista de selección de docentes */}
                <div className="max-h-44 overflow-y-auto border border-line-soft rounded-lg divide-y divide-line-soft bg-paper">
                  {loadingEncargados ? (
                    <div className="p-3 text-center text-xs text-ink-faint">Cargando docentes disponibles...</div>
                  ) : filteredDocentes.length === 0 ? (
                    <div className="p-4 text-center text-xs text-ink-soft">
                      No se encontró ningún docente con &quot;{searchDocente}&quot;.
                    </div>
                  ) : (
                    filteredDocentes.map((doc) => {
                      const isSelected = selectedDocenteIds.includes(doc.id);
                      return (
                        <div
                          key={doc.id}
                          onClick={() => handleToggleDocente(doc.id)}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                            isSelected ? "bg-accent-soft/40 hover:bg-accent-soft/60" : "hover:bg-paper-sunken"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-[11px]">
                              {doc.nombre.charAt(0)}{doc.apellido ? doc.apellido.charAt(0) : ""}
                            </div>
                            <div>
                              <span className="font-semibold text-ink block">{doc.nombre} {doc.apellido}</span>
                              <span className="text-[10px] text-ink-faint">{doc.email}</span>
                            </div>
                          </div>
                          <div className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                            isSelected
                              ? "bg-accent text-white"
                              : "bg-paper-sunken text-ink-soft hover:bg-accent hover:text-white"
                          }`}>
                            {isSelected ? (
                              <>
                                <Check className="w-3 h-3" /> Asignado
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" /> Agregar
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Chips de docentes seleccionados */}
                {selectedDocentesObj.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-medium text-ink-faint">Docentes que coordinarán esta área:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedDocentesObj.map((doc) => (
                        <span
                          key={doc.id}
                          className="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-full bg-accent-soft border border-accent/40 text-accent-dark text-xs font-medium shadow-2xs"
                        >
                          <span>{doc.nombre} {doc.apellido}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleDocente(doc.id)}
                            className="w-4 h-4 rounded-full hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-ink-soft"
                            title="Quitar de la lista"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Jurados Evaluadores */}
              <div className="p-4 bg-paper rounded-xl border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-ink">Jurados Evaluadores</span>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold">
                    {selectedJuradoIds.length} asignado(s)
                  </span>
                </div>

                {/* Buscador de jurados */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                  <input
                    type="text"
                    placeholder="Buscar jurado por nombre o correo (ej: Carlos, cfernandez@uagrm.edu.bo)..."
                    value={searchJurado}
                    onChange={(e) => setSearchJurado(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-paper-sunken border border-line-soft focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Lista de selección de jurados */}
                <div className="max-h-44 overflow-y-auto border border-line-soft rounded-lg divide-y divide-line-soft bg-paper">
                  {loadingEncargados ? (
                    <div className="p-3 text-center text-xs text-ink-faint">Cargando jurados disponibles...</div>
                  ) : filteredJurados.length === 0 ? (
                    <div className="p-4 text-center text-xs text-ink-soft">
                      No se encontró ningún jurado con &quot;{searchJurado}&quot;.
                    </div>
                  ) : (
                    filteredJurados.map((jur) => {
                      const isSelected = selectedJuradoIds.includes(jur.id);
                      return (
                        <div
                          key={jur.id}
                          onClick={() => handleToggleJurado(jur.id)}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                            isSelected ? "bg-purple-50 hover:bg-purple-100" : "hover:bg-paper-sunken"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-purple-200 text-purple-800 font-bold flex items-center justify-center text-[11px]">
                              {jur.nombre.charAt(0)}{jur.apellido ? jur.apellido.charAt(0) : ""}
                            </div>
                            <div>
                              <span className="font-semibold text-ink block">{jur.nombre} {jur.apellido}</span>
                              <span className="text-[10px] text-ink-faint">{jur.email}</span>
                            </div>
                          </div>
                          <div className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                            isSelected
                              ? "bg-purple-600 text-white"
                              : "bg-paper-sunken text-ink-soft hover:bg-purple-600 hover:text-white"
                          }`}>
                            {isSelected ? (
                              <>
                                <Check className="w-3 h-3" /> Asignado
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" /> Agregar
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Chips de jurados seleccionados */}
                {selectedJuradosObj.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-medium text-ink-faint">Jurados que evaluarán a los proyectos:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedJuradosObj.map((jur) => (
                        <span
                          key={jur.id}
                          className="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-900 text-xs font-medium shadow-2xs"
                        >
                          <span>{jur.nombre} {jur.apellido}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleJurado(jur.id)}
                            className="w-4 h-4 rounded-full hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-ink-soft"
                            title="Quitar de la lista"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fechas y Equipos */}
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
                  Modo y tamaño de equipo
                </label>
                <label className="mb-2 flex items-center justify-between gap-3 rounded-md border border-line bg-paper-sunken px-3 py-2 text-xs text-ink">
                  <span>
                    <b>Inscripción por grupos</b>
                    <span className="block text-[11px] text-ink-faint">
                      Los estudiantes postulan con número/nombre de grupo e integrantes.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={inscripcionGrupal}
                    onChange={(e) => setInscripcionGrupal(e.target.checked)}
                    className="h-4 w-4 accent-accent"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] text-ink-faint mb-1">Mínimo</div>
                    <input
                      type="number"
                      min={1}
                      max={5}
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
                      max={5}
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
                className="px-4 py-2.5 rounded-lg border border-line text-ink-soft text-xs font-medium hover:bg-paper transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {loading ? "Guardando..." : "Guardar borrador en sistema"}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleSubmit("PUBLICADA")}
                className="px-5 py-2.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-opacity-95 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {loading ? "Publicando..." : "Publicar convocatoria"}
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
                Así se verá en el portal
              </span>
            </div>

            <div className="bg-paper-raised border border-line rounded-xl overflow-hidden shadow-sm">
              {/* Header de la tarjeta con imagen o fallback */}
              <div className="h-36 bg-accent-soft border-b border-line flex items-center justify-center relative overflow-hidden">
                {imagenPortada ? (
                  <img
                    src={getMediaUrl(imagenPortada)}
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

                {/* Encargados seleccionados en preview */}
                {(selectedDocentesObj.length > 0 || selectedJuradosObj.length > 0) && (
                  <div className="p-2.5 rounded-lg bg-paper-sunken border border-line-soft space-y-1.5 text-[11px]">
                    {selectedDocentesObj.length > 0 && (
                      <div className="flex items-center gap-1.5 text-accent-dark">
                        <ShieldCheck className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                        <span className="truncate">
                          <b>Docente(s):</b> {selectedDocentesObj.map((d) => `${d.nombre} ${d.apellido}`).join(", ")}
                        </span>
                      </div>
                    )}
                    {selectedJuradosObj.length > 0 && (
                      <div className="flex items-center gap-1.5 text-purple-900">
                        <Award className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                        <span className="truncate">
                          <b>Jurado(s):</b> {selectedJuradosObj.map((j) => `${j.nombre} ${j.apellido}`).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                )}

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
