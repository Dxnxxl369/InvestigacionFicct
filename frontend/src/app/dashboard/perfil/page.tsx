"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { authAPI, uploadsAPI, convocatoriasAPI, resolveFileUrl, Convocatoria } from "@/lib/api";
import {
  Camera,
  Lock,
  ShieldCheck,
  Mail,
  User as UserIcon,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Trash2,
  GraduationCap,
  Award,
  BookOpen,
  Eye,
  EyeOff,
  ExternalLink,
  Layers,
  ArrowRight,
  Check,
  Search,
} from "lucide-react";

export default function PerfilPage() {
  const { user, refreshProfile } = useAuth();

  // Estados de campos editables
  const [fotoPerfil, setFotoPerfil] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [ocultarCursos, setOcultarCursos] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Estados de UI y peticiones
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [urlDraft, setUrlDraft] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Estados para cursos del usuario (Moodle)
  const [cursos, setCursos] = useState<Convocatoria[]>([]);
  const [loadingCursos, setLoadingCursos] = useState<boolean>(true);
  const [filtroRol, setFiltroRol] = useState<string>("TODOS");
  const [busquedaCurso, setBusquedaCurso] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializar estado con datos del usuario
  useEffect(() => {
    if (user) {
      setFotoPerfil(user.fotoPerfil || "");
      setDescripcion(user.descripcion || "");
      setOcultarCursos(user.ocultarCursos ?? false);
      setPreviewUrl(user.fotoPerfil ? resolveFileUrl(user.fotoPerfil) : null);
    }
  }, [user]);

  // Cargar cursos / áreas en los que participa el usuario
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const fetchCursos = async () => {
      try {
        setLoadingCursos(true);
        const data = await convocatoriasAPI.getMisAreas();
        if (isMounted) {
          setCursos(data || []);
        }
      } catch (err) {
        console.error("Error al cargar cursos del usuario:", err);
      } finally {
        if (isMounted) {
          setLoadingCursos(false);
        }
      }
    };

    fetchCursos();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Limpiar mensaje de feedback tras 5 segundos
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  if (!user) return null;

  const getInitial = (name?: string) => (name ? name.charAt(0).toUpperCase() : "U");

  // Subir imagen local
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setFeedback({
        type: "error",
        message: "Formato no válido. Solo se admiten imágenes JPG, PNG, WEBP o GIF.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({
        type: "error",
        message: "La imagen excede el límite permitido de 5 MB.",
      });
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      setIsUploading(true);
      setFeedback(null);
      const res = await uploadsAPI.uploadImagen(file);
      setFotoPerfil(res.relativePath || res.url);
      setPreviewUrl(resolveFileUrl(res.relativePath || res.url));
      setFeedback({
        type: "success",
        message: "Foto cargada correctamente. Guarda los cambios para conservarla.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Error al subir la imagen. Inténtalo de nuevo.",
      });
      setPreviewUrl(fotoPerfil ? resolveFileUrl(fotoPerfil) : null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleApplyUrl = () => {
    if (!urlDraft.trim()) return;
    setFotoPerfil(urlDraft.trim());
    setPreviewUrl(urlDraft.trim());
    setShowUrlInput(false);
    setUrlDraft("");
    setFeedback({
      type: "success",
      message: "Enlace de foto aplicado. Recuerda hacer clic en 'Guardar Cambios'.",
    });
  };

  const handleRemovePhoto = () => {
    setFotoPerfil("");
    setPreviewUrl(null);
    setFeedback({
      type: "success",
      message: "Foto eliminada. Guarda los cambios para confirmar.",
    });
  };

  const handleReset = () => {
    if (user) {
      setFotoPerfil(user.fotoPerfil || "");
      setDescripcion(user.descripcion || "");
      setOcultarCursos(user.ocultarCursos ?? false);
      setPreviewUrl(user.fotoPerfil ? resolveFileUrl(user.fotoPerfil) : null);
      setShowUrlInput(false);
      setUrlDraft("");
      setFeedback(null);
    }
  };

  const handleSaveChanges = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsSaving(true);
      setFeedback(null);

      await authAPI.updateProfile({
        fotoPerfil: fotoPerfil.trim(),
        descripcion: descripcion.trim(),
        ocultarCursos: ocultarCursos,
      });

      await refreshProfile();

      setFeedback({
        type: "success",
        message: "¡Perfil y preferencias actualizadas con éxito!",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Error al actualizar el perfil. Inténtalo nuevamente.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Determinar rol del usuario en cada curso específico
  const getRolEnCurso = (curso: Convocatoria) => {
    const isDocente =
      curso.creadorId === user.id ||
      (curso.docenteIds && curso.docenteIds.includes(user.id));

    const isJurado =
      curso.juradoIds && curso.juradoIds.includes(user.id);

    const isEstudiante =
      curso.miEstadoInscripcion === "ACEPTADO" ||
      user.rol === "ESTUDIANTE";

    if (isDocente) {
      return {
        key: "DOCENTE",
        label: "Docente Encargado",
        icon: GraduationCap,
        badgeClass: "bg-accent-soft text-accent-dark border-accent/30",
      };
    }

    if (isJurado) {
      return {
        key: "JURADO",
        label: "Jurado Evaluador",
        icon: Award,
        badgeClass: "bg-seal/15 text-seal-dark border-seal/30",
      };
    }

    if (user.rol === "ADMIN") {
      return {
        key: "ADMIN",
        label: "Coordinador / Admin",
        icon: ShieldCheck,
        badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
      };
    }

    if (isEstudiante) {
      return {
        key: "ESTUDIANTE",
        label: "Estudiante Inscrito",
        icon: BookOpen,
        badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      };
    }

    return {
      key: "PARTICIPANTE",
      label: "Participante",
      icon: UserIcon,
      badgeClass: "bg-paper-sunken text-ink-soft border-line",
    };
  };

  const rolLabelMap: Record<string, { label: string; badge: string }> = {
    ADMIN: { label: "Administrador del Sistema", badge: "bg-danger-soft text-danger border-danger/30" },
    DOCENTE: { label: "Docente Investigador", badge: "bg-accent-soft text-accent-dark border-accent/30" },
    JURADO: { label: "Jurado Calificador", badge: "bg-seal/15 text-seal-dark border-seal/30" },
    ESTUDIANTE: { label: "Estudiante Investigador", badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  };

  const currentRolInfo = rolLabelMap[user.rol] || {
    label: user.rol,
    badge: "bg-paper-sunken text-ink-soft border-line",
  };

  // Filtrado de cursos
  const cursosFiltrados = cursos.filter((curso) => {
    const rolInfo = getRolEnCurso(curso);
    const matchesRol =
      filtroRol === "TODOS" ||
      (filtroRol === "DOCENTE" && rolInfo.key === "DOCENTE") ||
      (filtroRol === "JURADO" && rolInfo.key === "JURADO") ||
      (filtroRol === "ESTUDIANTE" && rolInfo.key === "ESTUDIANTE");

    const matchesSearch =
      busquedaCurso.trim() === "" ||
      curso.titulo.toLowerCase().includes(busquedaCurso.toLowerCase()) ||
      (curso.descripcion && curso.descripcion.toLowerCase().includes(busquedaCurso.toLowerCase()));

    return matchesRol && matchesSearch;
  });

  const hasChanges =
    (user.fotoPerfil || "") !== fotoPerfil ||
    (user.descripcion || "") !== descripcion ||
    (user.ocultarCursos ?? false) !== ocultarCursos;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ================= ENCABEZADO DE PÁGINA ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-line-soft">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent/15 text-accent-dark border border-accent/20">
                Cuenta Institucional FICCT
              </span>
              <span className="text-xs text-ink-faint">
                Moodle Academic Profile
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-ink tracking-tight">
              Mi Perfil Académico
            </h1>
            <p className="text-sm text-ink-soft mt-1">
              Gestiona tu imagen pública, biografía investigativa y la privacidad de tus cursos inscritos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasChanges || isSaving}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-line hover:bg-paper-sunken text-ink-soft transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Deshacer</span>
            </button>
            <button
              type="button"
              onClick={() => handleSaveChanges()}
              disabled={!hasChanges || isSaving || isUploading}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent hover:bg-accent-dark text-white transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ================= ALERTA DE FEEDBACK ================= */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-2 ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                : "bg-danger-soft/50 border-danger/40 text-danger"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-danger" />
            )}
            <p className="text-sm font-medium flex-1">{feedback.message}</p>
          </div>
        )}

        {/* ================= AVISO DE DATOS LEGALES PROTEGIDOS ================= */}
        <div className="p-4 rounded-2xl bg-paper-sunken/60 border border-line-soft flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-seal/15 text-seal-dark border border-seal/30 flex-shrink-0 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-xs text-ink-soft space-y-1">
            <b className="text-ink font-semibold flex items-center gap-1.5">
              <span>Identidad y Registros Institucionales Protegidos</span>
              <ShieldCheck className="w-3.5 h-3.5 text-seal" />
            </b>
            <p className="leading-relaxed">
              Por normativa académica de la <b>FICCT</b>, los datos de identidad legal (nombre completo,
              correo electrónico institucional y rol) se encuentran validados y <b>no pueden ser editados directamente</b>.
              Solo se permite personalizar tu foto de perfil, descripción académica y privacidad de cursos.
            </p>
          </div>
        </div>

        {/* ================= SECCIÓN SUPERIOR: IDENTIDAD + FORMULARIO ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ----- COLUMNA 1: AVATAR Y TARJETA PERSONAL ----- */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-paper-raised border border-line rounded-2xl p-6 shadow-xs flex flex-col items-center text-center">
              {/* Contenedor del Avatar */}
              <div className="relative group mb-4">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-paper shadow-md bg-paper-sunken flex items-center justify-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={user.nombre}
                      className="w-full h-full object-cover"
                      onError={() => setPreviewUrl(null)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-accent to-accent-light text-white font-bold text-4xl flex items-center justify-center">
                      {getInitial(user.nombre)}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  title="Cambiar foto de perfil"
                  className="absolute bottom-1 right-1 p-2 rounded-full bg-accent text-white hover:bg-accent-dark shadow-lg transition-transform hover:scale-105 active:scale-95 border-2 border-paper"
                >
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Botones de acción para foto */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-4 w-full">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-accent-soft text-accent-dark hover:bg-accent/20 border border-accent/30 transition-colors flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Subir foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-paper-sunken text-ink-soft hover:text-ink hover:bg-line-soft border border-line transition-colors flex items-center gap-1.5"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Por enlace</span>
                </button>

                {(fotoPerfil || previewUrl) && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    title="Eliminar foto actual"
                    className="p-1.5 rounded-xl text-xs text-danger hover:bg-danger-soft border border-danger/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Desplegable URL */}
              {showUrlInput && (
                <div className="w-full mb-4 p-3 rounded-xl bg-paper-sunken border border-line text-left space-y-2 animate-in fade-in duration-150">
                  <label className="text-[11px] font-semibold text-ink-soft block">
                    URL directa de la imagen (HTTPS)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://ejemplo.com/mifoto.jpg"
                      value={urlDraft}
                      onChange={(e) => setUrlDraft(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-paper border border-line text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      className="px-2.5 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-dark"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Nombre e información */}
              <h2 className="text-lg font-bold text-ink">
                {user.nombre} {user.apellido}
              </h2>
              <p className="text-xs text-ink-faint flex items-center gap-1.5 mt-0.5 justify-center">
                <Mail className="w-3 h-3" />
                <span>{user.email}</span>
              </p>

              <div className="mt-3">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${currentRolInfo.badge}`}
                >
                  {currentRolInfo.label}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-line-soft w-full flex items-center justify-between text-xs text-ink-soft">
                <span className="text-ink-faint">Estado en el sistema:</span>
                <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Activo
                </span>
              </div>
            </div>

            {/* ================= TARJETA DE PRIVACIDAD MOODLE ================= */}
            <div className="bg-paper-raised border border-line rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-line-soft pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-seal" />
                  <h3 className="text-sm font-bold text-ink">
                    Privacidad de Cursos (Moodle)
                  </h3>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    ocultarCursos
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  {ocultarCursos ? "Oculto" : "Visible"}
                </span>
              </div>

              <p className="text-xs text-ink-soft leading-relaxed">
                Tal como en Moodle, puedes configurar si otros participantes y compañeros pueden consultar la lista de cursos
                o áreas donde estás asignado.
              </p>

              {/* Control Switch de Privacidad */}
              <div
                onClick={() => setOcultarCursos(!ocultarCursos)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  ocultarCursos
                    ? "bg-amber-500/10 border-amber-500/30 text-ink"
                    : "bg-paper-sunken border-line-soft text-ink-soft hover:bg-paper-sunken/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      ocultarCursos ? "bg-amber-500/20 text-amber-600" : "bg-paper text-ink-faint"
                    }`}
                  >
                    {ocultarCursos ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-ink">
                      Ocultar mis cursos para otros
                    </span>
                    <span className="text-[11px] text-ink-faint block">
                      {ocultarCursos
                        ? "Solo tú y administración pueden verlos"
                        : "Visible para otros participantes"}
                    </span>
                  </div>
                </div>

                {/* Switch Visual */}
                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                    ocultarCursos ? "bg-amber-500" : "bg-line"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                      ocultarCursos ? "translate-x-5" : ""
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ----- COLUMNA 2: FORMULARIO DE PERFIL Y DATOS LEGALES ----- */}
          <div className="lg:col-span-8 space-y-6">
            <form onSubmit={handleSaveChanges} className="space-y-6">
              {/* Presentación Personal Editable */}
              <div className="bg-paper-raised border border-line rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-line-soft pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <h3 className="text-base font-bold text-ink">
                      Presentación y Biografía
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-accent-dark bg-accent/15 px-2 py-0.5 rounded-md">
                    Editable
                  </span>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="descripcion"
                    className="block text-xs font-semibold text-ink-soft"
                  >
                    Acerca de mí / Líneas de Investigación
                  </label>
                  <textarea
                    id="descripcion"
                    rows={4}
                    maxLength={500}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Escribe una breve reseña sobre tu trayectoria académica, áreas de especialización científica, intereses de grado o proyectos en desarrollo..."
                    className="w-full px-3.5 py-3 rounded-xl bg-paper border border-line text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all resize-y"
                  />
                  <div className="flex items-center justify-between text-[11px] text-ink-faint px-1">
                    <span>
                      Visible en tu ficha académica para la comunidad FICCT.
                    </span>
                    <span className={descripcion.length > 450 ? "text-amber-500 font-semibold" : ""}>
                      {descripcion.length} / 500
                    </span>
                  </div>
                </div>
              </div>

              {/* Datos Legales Bloqueados */}
              <div className="bg-paper-raised border border-line rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-line-soft pb-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-seal" />
                    <h3 className="text-base font-bold text-ink">
                      Datos Legales e Institucionales
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-seal-dark bg-seal/15 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Solo Lectura
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-ink-soft">
                      Nombre(s)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={user.nombre}
                        disabled
                        aria-readonly="true"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-paper-sunken border border-line-soft text-sm text-ink-soft cursor-not-allowed pr-9 select-none"
                      />
                      <Lock className="w-4 h-4 text-ink-faint absolute right-3 top-3" />
                    </div>
                    <span className="text-[10.5px] text-ink-faint">
                      Nombre legal registrado en la facultad
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-ink-soft">
                      Apellido(s)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={user.apellido}
                        disabled
                        aria-readonly="true"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-paper-sunken border border-line-soft text-sm text-ink-soft cursor-not-allowed pr-9 select-none"
                      />
                      <Lock className="w-4 h-4 text-ink-faint absolute right-3 top-3" />
                    </div>
                    <span className="text-[10.5px] text-ink-faint">
                      Apellidos registrados en el sistema FICCT
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-ink-soft">
                      Correo Electrónico Institucional
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        aria-readonly="true"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-paper-sunken border border-line-soft text-sm text-ink-soft cursor-not-allowed pr-9 select-none"
                      />
                      <Lock className="w-4 h-4 text-ink-faint absolute right-3 top-3" />
                    </div>
                    <span className="text-[10.5px] text-ink-faint">
                      Credencial institucional verificada
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-ink-soft">
                      Rol Académico
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={currentRolInfo.label}
                        disabled
                        aria-readonly="true"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-paper-sunken border border-line-soft text-sm text-ink-soft cursor-not-allowed pr-9 font-medium select-none"
                      />
                      <ShieldCheck className="w-4 h-4 text-seal absolute right-3 top-3" />
                    </div>
                    <span className="text-[10.5px] text-ink-faint">
                      Privilegios asignados por administración
                    </span>
                  </div>
                </div>
              </div>

              {/* Botón de Guardado */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={!hasChanges || isSaving}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-line hover:bg-paper-sunken text-ink-soft transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Cancelar cambios</span>
                </button>
                <button
                  type="submit"
                  disabled={!hasChanges || isSaving || isUploading}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-dark text-white transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar perfil</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ================= SECCIÓN INFERIOR: LISTADO DE CURSOS Y ÁREAS (ESTILO MOODLE) ================= */}
        <div className="bg-paper-raised border border-line rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line-soft pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-bold text-ink">
                  Mis Cursos y Áreas Académicas
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-paper-sunken text-ink-soft border border-line">
                  {cursosFiltrados.length} {cursosFiltrados.length === 1 ? "curso" : "cursos"}
                </span>
              </div>
              <p className="text-xs text-ink-faint mt-0.5">
                Áreas, módulos y convocatorias donde ejerces como docente, jurado o estudiante inscrito.
              </p>
            </div>

            {/* Filtros rápidos y buscador */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-ink-faint absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar curso o área..."
                  value={busquedaCurso}
                  onChange={(e) => setBusquedaCurso(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-paper border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex items-center gap-1 bg-paper-sunken p-1 rounded-xl border border-line-soft text-xs">
                {(["TODOS", "DOCENTE", "JURADO", "ESTUDIANTE"] as const).map((rolOption) => (
                  <button
                    key={rolOption}
                    type="button"
                    onClick={() => setFiltroRol(rolOption)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      filtroRol === rolOption
                        ? "bg-paper text-ink font-bold shadow-xs border border-line/60"
                        : "text-ink-faint hover:text-ink"
                    }`}
                  >
                    {rolOption === "TODOS"
                      ? "Todos"
                      : rolOption === "DOCENTE"
                      ? "Docente"
                      : rolOption === "JURADO"
                      ? "Jurado"
                      : "Estudiante"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Estado de Privacidad Moodle para el listado */}
          {ocultarCursos && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <EyeOff className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <b>Modo privado activo:</b> Este listado de cursos está configurado para no ser visible para otros participantes. Solo tú y los administradores pueden verlo.
              </span>
            </div>
          )}

          {/* Lista de Cursos */}
          {loadingCursos ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-ink-soft">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Cargando tus áreas y asignaciones...</span>
            </div>
          ) : cursosFiltrados.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-xl bg-paper-sunken/40 border border-dashed border-line">
              <GraduationCap className="w-10 h-10 text-ink-faint mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-semibold text-ink">
                No se encontraron cursos con los filtros seleccionados
              </h3>
              <p className="text-xs text-ink-faint mt-1 max-w-md mx-auto">
                {cursos.length === 0
                  ? "Actualmente no formas parte de ninguna convocatoria o área de investigación activa."
                  : "Prueba seleccionando otro rol o limpiando la barra de búsqueda."}
              </p>
              {cursos.length === 0 && (
                <div className="mt-4">
                  <Link
                    href="/dashboard/convocatorias"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-accent text-white hover:bg-accent-dark transition-colors shadow-xs"
                  >
                    <span>Explorar convocatorias</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cursosFiltrados.map((curso) => {
                const rolInfo = getRolEnCurso(curso);
                const RolIcon = rolInfo.icon;

                return (
                  <div
                    key={curso.id}
                    className="bg-paper border border-line rounded-2xl p-4 shadow-2xs hover:shadow-md hover:border-line-strong transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Portada o Miniatura */}
                      <div className="w-full h-32 rounded-xl overflow-hidden mb-3 bg-paper-sunken relative border border-line-soft">
                        {curso.imagenPortada ? (
                          <img
                            src={resolveFileUrl(curso.imagenPortada)}
                            alt={curso.titulo}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-accent/20 to-seal/20 flex items-center justify-center text-ink-faint">
                            <GraduationCap className="w-8 h-8 opacity-60 text-accent" />
                          </div>
                        )}
                        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-ink/80 text-paper backdrop-blur-xs">
                          {curso.tipo}
                        </span>
                      </div>

                      {/* Título */}
                      <h4 className="text-sm font-bold text-ink line-clamp-1 group-hover:text-accent transition-colors">
                        {curso.titulo}
                      </h4>
                      <p className="text-xs text-ink-faint line-clamp-2 mt-1">
                        {curso.descripcion || "Sin descripción registrada."}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-line-soft flex items-center justify-between">
                      {/* Badge del Rol en este Curso */}
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${rolInfo.badgeClass}`}
                      >
                        <RolIcon className="w-3.5 h-3.5" />
                        <span>{rolInfo.label}</span>
                      </span>

                      {/* Botón Acceder al Aula */}
                      <Link
                        href={`/dashboard/mis-areas/${curso.id}`}
                        title="Ingresar al aula virtual del curso"
                        className="p-1.5 rounded-lg text-ink-faint hover:text-accent hover:bg-accent-soft transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
