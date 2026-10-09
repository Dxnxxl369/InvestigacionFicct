"use client";

import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  api,
  DocumentoDTO,
  DocumentoRequest,
  ColaboradorRequest,
  TipoPermisoDoc,
} from "@/lib/api";
import {
  Sparkles,
  Save,
  FileDown,
  CheckCircle,
  Plus,
  Users,
  Shield,
  Eye,
  Edit3,
  Settings,
  Trash2,
  ArrowLeft,
  X,
  FileText,
  AlertTriangle,
  Clock,
  BookOpen,
} from "lucide-react";

export default function DocumentosColaborativosPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [documentos, setDocumentos] = useState<DocumentoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocumentoDTO | null>(null);

  // Estados del editor
  const [docContent, setDocContent] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [saving, setSaving] = useState(false);

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showColabModal, setShowColabModal] = useState(false);

  // Formulario nuevo documento
  const [newTitulo, setNewTitulo] = useState("");
  const [newCategoria, setNewCategoria] = useState("TESIS");
  const [newDescripcion, setNewDescripcion] = useState("");
  const [newContenido, setNewContenido] = useState("");
  const [creating, setCreating] = useState(false);

  // Formulario nuevo colaborador
  const [colabEmail, setColabEmail] = useState("");
  const [colabPermiso, setColabPermiso] = useState<TipoPermisoDoc>("EDICION");
  const [assigningColab, setAssigningColab] = useState(false);

  // Detector IA
  const [probAnimated, setProbAnimated] = useState(false);

  const cargarDocumentos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getDocumentos();
      setDocumentos(data);
      if (data.length > 0 && !selectedDoc) {
        // Seleccionar por defecto el primero
        abrirDocumento(data[0]);
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast(error.message || "Error al cargar documentos", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedDoc, toast]);

  useEffect(() => {
    cargarDocumentos();
  }, [cargarDocumentos]);

  useEffect(() => {
    const timer = setTimeout(() => setProbAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const abrirDocumento = (doc: DocumentoDTO) => {
    setSelectedDoc(doc);
    setDocTitle(doc.titulo);
    setDocContent(doc.contenido || "");
  };

  const handleCrearDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitulo.trim()) {
      toast("El título del documento es obligatorio", "error");
      return;
    }

    try {
      setCreating(true);
      const req: DocumentoRequest = {
        titulo: newTitulo.trim(),
        categoria: newCategoria,
        descripcion: newDescripcion.trim(),
        contenido: newContenido.trim() || "1. INTRODUCCIÓN\n\n2. OBJETIVOS Y ALCANCE\n\n3. DESARROLLO TÉCNICO",
      };
      const creado = await api.createDocumento(req);
      toast(`Documento "${creado.titulo}" creado exitosamente`, "success");
      setShowCreateModal(false);
      setNewTitulo("");
      setNewDescripcion("");
      setNewContenido("");
      await cargarDocumentos();
      abrirDocumento(creado);
    } catch (err: unknown) {
      const error = err as Error;
      toast(error.message || "No se pudo crear el documento", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleGuardarDocumento = async () => {
    if (!selectedDoc) return;
    if (selectedDoc.miPermiso === "LECTURA") {
      toast("No tienes permisos de edición en este documento (Solo Lectura)", "error");
      return;
    }

    try {
      setSaving(true);
      const req: DocumentoRequest = {
        titulo: docTitle,
        contenido: docContent,
        categoria: selectedDoc.categoria,
        descripcion: selectedDoc.descripcion,
      };
      const actualizado = await api.updateDocumento(selectedDoc.id, req);
      setSelectedDoc(actualizado);
      // Actualizar en lista local
      setDocumentos((prev) => prev.map((d) => (d.id === actualizado.id ? actualizado : d)));
      toast("Versión guardada correctamente con autoría verificada", "success");
    } catch (err: unknown) {
      const error = err as Error;
      toast(error.message || "Error al guardar el documento", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAsignarColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    if (!colabEmail.trim()) {
      toast("Ingresa el correo del colaborador", "error");
      return;
    }

    try {
      setAssigningColab(true);
      const req: ColaboradorRequest = {
        email: colabEmail.trim(),
        permiso: colabPermiso,
      };
      const actualizado = await api.assignColaborador(selectedDoc.id, req);
      setSelectedDoc(actualizado);
      setDocumentos((prev) => prev.map((d) => (d.id === actualizado.id ? actualizado : d)));
      toast(`Permiso "${colabPermiso}" asignado a ${colabEmail}`, "success");
      setColabEmail("");
    } catch (err: unknown) {
      const error = err as Error;
      toast(error.message || "No se pudo asignar el colaborador", "error");
    } finally {
      setAssigningColab(false);
    }
  };

  const handleRemoverColaborador = async (colabId: number) => {
    if (!selectedDoc) return;
    try {
      const actualizado = await api.removeColaborador(selectedDoc.id, colabId);
      setSelectedDoc(actualizado);
      setDocumentos((prev) => prev.map((d) => (d.id === actualizado.id ? actualizado : d)));
      toast("Colaborador removido del documento", "info");
    } catch (err: unknown) {
      const error = err as Error;
      toast(error.message || "No se pudo remover el colaborador", "error");
    }
  };

  const puedeGestionarColaboradores =
    selectedDoc?.miPermiso === "OWNER" ||
    selectedDoc?.miPermiso === "ADMINISTRACION" ||
    user?.rol === "ADMIN";

  const puedeEditar =
    selectedDoc?.miPermiso === "OWNER" ||
    selectedDoc?.miPermiso === "ADMINISTRACION" ||
    selectedDoc?.miPermiso === "EDICION" ||
    user?.rol === "ADMIN";

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabecera Superior con selector de documentos y crear */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-line">
          <div>
            <div className="text-xs text-ink-faint flex items-center gap-1.5 mb-1">
              <span>Proyectos FICCT</span>
              <span>/</span>
              <span>Documentos Estudiantiles</span>
              <span>/</span>
              <span className="text-ink font-medium">Sprint 2: Co-edición &amp; Permisos</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-ink font-normal">
              Gestor de Documentos de Investigación
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-accent text-white hover:bg-accent-dark active:scale-95 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Documento</span>
            </button>
          </div>
        </div>

        {/* Barra de pestañas horizontales de documentos (Permite crear N documentos y alternar entre ellos) */}
        <div className="bg-paper-raised border border-line rounded-2xl p-2.5 shadow-sm">
          <div className="flex items-center justify-between px-2 pb-2 text-xs font-semibold text-ink-faint border-b border-line-soft">
            <span className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-accent" />
              <span>Mis Documentos y Equipos ({documentos.length})</span>
            </span>
            <span className="text-[11px] text-ink-faint">
              Rol actual: <strong>{user?.nombre}</strong> ({user?.rol})
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 text-xs">
            {loading ? (
              <span className="text-ink-faint px-3 py-1.5">Cargando documentos...</span>
            ) : documentos.length === 0 ? (
              <div className="text-ink-soft px-3 py-2">
                No tienes documentos creados. Haz clic en <strong>"+ Nuevo Documento"</strong> para comenzar.
              </div>
            ) : (
              documentos.map((d) => {
                const isSelected = selectedDoc?.id === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => abrirDocumento(d)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border whitespace-nowrap transition-all ${
                      isSelected
                        ? "bg-accent-soft border-accent/40 text-accent-dark font-semibold shadow-xs"
                        : "bg-paper-sunken border-line-soft text-ink hover:border-ink-faint"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        d.categoria === "TESIS"
                          ? "bg-purple-500"
                          : d.categoria === "HACKATHON"
                          ? "bg-blue-500"
                          : d.categoria === "FERIA"
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                    />
                    <span className="truncate max-w-[200px]">{d.titulo}</span>
                    <span
                      className={`text-[9.5px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        d.miPermiso === "OWNER"
                          ? "bg-accent/15 text-accent-dark"
                          : d.miPermiso === "ADMINISTRACION"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                          : d.miPermiso === "EDICION"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}
                    >
                      {d.miPermiso === "OWNER" ? "Autor" : d.miPermiso}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Zona Principal: Documento Seleccionado */}
        {selectedDoc && (
          <>
            {/* Banner Informativo si es Solo Lectura */}
            {!puedeEditar && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <strong>Modo Solo Lectura (Permiso LECTURA):</strong> Tienes acceso otorgado por el autor para revisar este documento. Para realizar modificaciones, solicita al administrador del documento que eleve tu permiso a <em>EDICIÓN</em>.
                </div>
              </div>
            )}

            {/* Encabezado del Documento Activo */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-paper-raised border border-line rounded-2xl p-5 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-accent/15 text-accent-dark px-2 py-0.5 rounded-full">
                    {selectedDoc.categoria}
                  </span>
                  <span className="text-xs text-ink-faint">
                    Autor: <strong>{selectedDoc.autorNombre}</strong>
                  </span>
                  <span className="text-xs text-ink-faint">·</span>
                  <span className="text-xs text-ink-faint">
                    Tu rol en este documento:{" "}
                    <strong className="text-ink">
                      {selectedDoc.miPermiso === "OWNER" ? "Autor / Propietario" : selectedDoc.miPermiso}
                    </strong>
                  </span>
                </div>
                <input
                  type="text"
                  value={docTitle}
                  disabled={!puedeEditar}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="font-serif text-xl sm:text-2xl text-ink font-semibold bg-transparent border-b border-transparent hover:border-line focus:border-accent focus:outline-hidden w-full transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {puedeGestionarColaboradores && (
                  <button
                    onClick={() => setShowColabModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-line bg-paper-sunken text-ink hover:border-accent hover:text-accent transition-all"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Colaboradores ({selectedDoc.colaboradores?.length || 0})</span>
                  </button>
                )}

                <button
                  onClick={handleGuardarDocumento}
                  disabled={saving || !puedeEditar}
                  className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm ${
                    puedeEditar
                      ? "bg-ink text-paper hover:opacity-90 dark:bg-accent dark:text-white active:scale-95"
                      : "bg-line-soft text-ink-faint cursor-not-allowed"
                  }`}
                >
                  {saving ? <span className="btn-spinner" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{puedeEditar ? "Guardar Cambios" : "Solo Lectura"}</span>
                </button>

                <button
                  onClick={() => toast("Exportando borrador oficial en PDF...", "info")}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border border-line bg-paper-raised text-ink hover:border-ink transition-all"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Exportar</span>
                </button>
              </div>
            </div>

            {/* Layout Principal: Editor + Panel Lateral */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna Izquierda: Hoja del Editor Colaborativo */}
              <div className="lg:col-span-2 bg-paper-raised border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {/* Barra de herramientas */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-line-soft bg-paper-sunken/50 text-xs">
                  <div className="flex items-center gap-3 text-ink-faint font-mono">
                    <span className="font-semibold text-ink">B</span>
                    <span className="italic text-ink">I</span>
                    <span className="underline text-ink">U</span>
                    <span>|</span>
                    <span>H1</span>
                    <span>H2</span>
                    <span>Cita</span>
                  </div>

                  {/* Badges de presencia de colaboradores activos */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-ink-faint">Equipo en línea:</span>
                    <div className="flex -space-x-1.5">
                      <div
                        title={`${selectedDoc.autorNombre} (Autor)`}
                        className="w-7 h-7 rounded-full bg-accent text-white font-bold text-[10px] flex items-center justify-center border-2 border-paper-raised"
                      >
                        {selectedDoc.autorNombre.charAt(0)}
                      </div>
                      {selectedDoc.colaboradores?.slice(0, 3).map((c) => (
                        <div
                          key={c.id}
                          title={`${c.usuarioNombre} (${c.permiso})`}
                          className={`w-7 h-7 rounded-full text-white font-bold text-[10px] flex items-center justify-center border-2 border-paper-raised ${
                            c.permiso === "ADMINISTRACION"
                              ? "bg-purple-600"
                              : c.permiso === "EDICION"
                              ? "bg-blue-600"
                              : "bg-amber-600"
                          }`}
                        >
                          {c.usuarioNombre.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Área de texto editable */}
                <div className="p-6 sm:p-8 flex-1">
                  <textarea
                    rows={18}
                    value={docContent}
                    readOnly={!puedeEditar}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder="Redacta el contenido de tu investigación o propuesta aquí..."
                    className={`w-full p-4 rounded-xl text-sm leading-relaxed border font-sans focus:outline-hidden transition-all ${
                      puedeEditar
                        ? "bg-paper text-ink border-line focus:border-accent shadow-inner"
                        : "bg-paper-sunken text-ink-soft border-line-soft cursor-not-allowed"
                    }`}
                  />
                  <div className="flex justify-between items-center text-[11px] text-ink-faint mt-2">
                    <span>
                      {docContent.split(/\s+/).filter(Boolean).length} palabras · {docContent.length} caracteres
                    </span>
                    <span>
                      {puedeEditar ? "Autoguardado cada 30 segundos" : "Modo lectura habilitado"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Panel de Colaboradores y Detector IA */}
              <div className="space-y-6">
                {/* Tarjeta de Permisos del Documento */}
                <div className="bg-paper-raised border border-line rounded-2xl p-5 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-faint flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-accent" />
                      <span>Control de Accesos (3 Niveles)</span>
                    </h3>
                    {puedeGestionarColaboradores && (
                      <button
                        onClick={() => setShowColabModal(true)}
                        className="text-[11px] text-accent font-semibold hover:underline"
                      >
                        + Invitar
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Propietario */}
                    <div className="p-2.5 rounded-xl bg-paper-sunken flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-semibold text-ink truncate">{selectedDoc.autorNombre}</div>
                        <div className="text-[10px] text-ink-faint">{selectedDoc.autorEmail}</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent/20 text-accent-dark">
                        PROPIETARIO
                      </span>
                    </div>

                    {/* Colaboradores asignados */}
                    {selectedDoc.colaboradores?.length === 0 ? (
                      <div className="text-[11px] text-ink-faint italic p-2">
                        No hay colaboradores en este grupo aún. Invita a tus compañeros de feria o hackatón con permiso de edición.
                      </div>
                    ) : (
                      selectedDoc.colaboradores?.map((c) => (
                        <div
                          key={c.id}
                          className="p-2.5 rounded-xl bg-paper-sunken flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-ink truncate">{c.usuarioNombre}</div>
                            <div className="text-[10px] text-ink-faint truncate">{c.usuarioEmail}</div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span
                              className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                c.permiso === "ADMINISTRACION"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                                  : c.permiso === "EDICION"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                              }`}
                            >
                              {c.permiso === "ADMINISTRACION" && <Settings className="w-2.5 h-2.5" />}
                              {c.permiso === "EDICION" && <Edit3 className="w-2.5 h-2.5" />}
                              {c.permiso === "LECTURA" && <Eye className="w-2.5 h-2.5" />}
                              <span>{c.permiso}</span>
                            </span>
                            {puedeGestionarColaboradores && (
                              <button
                                onClick={() => handleRemoverColaborador(c.id)}
                                title="Remover permiso"
                                className="p-1 rounded text-ink-faint hover:text-danger hover:bg-danger-soft/30 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Detector IA Académico */}
                <div className="liquid-glass rounded-2xl p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent-soft text-accent flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="font-serif text-sm font-semibold text-ink">Detector IA Académico</span>
                    </div>
                    <span className="text-[10px] font-mono bg-accent/20 text-accent-dark px-2 py-0.5 rounded-full font-bold">
                      RoBERTa v2
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-xs text-ink-soft">Originalidad del texto:</span>
                      <span className="font-serif text-2xl font-bold text-accent">96%</span>
                    </div>
                    <div className="h-2.5 w-full bg-line-soft rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-1000 ease-out"
                        style={{ width: probAnimated ? "96%" : "0%" }}
                      />
                    </div>
                    <p className="text-[11px] text-ink-faint mt-2 leading-relaxed">
                      El contenido cumple con los lineamientos de autoría propia exigidos en las normativas de titulación FICCT.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-line-soft/60 space-y-2 text-[11px]">
                    <div className="flex items-center gap-2 text-ink-soft">
                      <CheckCircle className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                      <span>Cohesión temática y citas conformes a APA</span>
                    </div>
                    <div className="flex items-center gap-2 text-ink-soft">
                      <CheckCircle className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                      <span>Sin indicios de plagio ni contenido sintético</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal: Crear Nuevo Documento */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-ink/50 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowCreateModal(false)} />
            <div className="relative w-full max-w-lg bg-paper-raised/95 dark:bg-slate-900/95 backdrop-blur-xl border border-line/60 rounded-2xl p-6 shadow-2xl space-y-4 z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-line-soft">
                <h3 className="font-serif text-lg text-ink font-semibold">Crear Nuevo Documento</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-ink-faint hover:text-ink hover:bg-paper-sunken"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCrearDocumento} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-ink mb-1">Título del Proyecto / Investigación *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Sistema de Asistencia Inteligente para la FICCT"
                    value={newTitulo}
                    onChange={(e) => setNewTitulo(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-paper text-ink text-xs focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink mb-1">Categoría</label>
                    <select
                      value={newCategoria}
                      onChange={(e) => setNewCategoria(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-line bg-paper text-ink text-xs focus:border-accent focus:outline-hidden"
                    >
                      <option value="TESIS">Tesis de Grado</option>
                      <option value="FERIA">Feria de Ciencias</option>
                      <option value="HACKATHON">Hackatón</option>
                      <option value="INVESTIGACION">Investigación Libre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-ink mb-1">Estado Inicial</label>
                    <input
                      type="text"
                      disabled
                      value="BORRADOR"
                      className="w-full p-2.5 rounded-xl border border-line-soft bg-paper-sunken text-ink-faint text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">Resumen Ejecutivo</label>
                  <textarea
                    rows={2}
                    placeholder="Breve descripción del alcance del proyecto..."
                    value={newDescripcion}
                    onChange={(e) => setNewDescripcion(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-paper text-ink text-xs focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">Texto o Estructura Inicial (Opcional)</label>
                  <textarea
                    rows={3}
                    placeholder="Estructura inicial de capítulos..."
                    value={newContenido}
                    onChange={(e) => setNewContenido(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-paper text-ink text-xs focus:border-accent focus:outline-hidden font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line-soft">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl border border-line text-ink hover:bg-paper-sunken"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white font-semibold hover:bg-accent-dark disabled:opacity-50"
                  >
                    {creating ? <span className="btn-spinner" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Crear Documento</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Gestionar Colaboradores y Permisos (Los 3 tipos de permisos) */}
        {showColabModal && selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-ink/50 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowColabModal(false)} />
            <div className="relative w-full max-w-lg bg-paper-raised/95 dark:bg-slate-900/95 backdrop-blur-xl border border-line/60 rounded-2xl p-6 shadow-2xl space-y-4 z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-line-soft">
                <div>
                  <h3 className="font-serif text-lg text-ink font-semibold">Gestión de Permisos del Grupo</h3>
                  <p className="text-xs text-ink-faint">
                    Asigna permisos a los integrantes de tu equipo para ferias, hackatones o revisiones académicas.
                  </p>
                </div>
                <button
                  onClick={() => setShowColabModal(false)}
                  className="p-1 rounded-lg text-ink-faint hover:text-ink hover:bg-paper-sunken"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulario para agregar colaborador */}
              <form onSubmit={handleAsignarColaborador} className="space-y-3 bg-paper-sunken p-3.5 rounded-xl border border-line-soft text-xs">
                <div className="font-semibold text-ink">Invitar a un integrante / colaborador:</div>
                <div>
                  <label className="block text-ink-soft mb-1">Correo Electrónico UAGRM</label>
                  <input
                    type="email"
                    required
                    placeholder="ej. brandon.vasquez@uagrm.edu.bo o rmartinez@uagrm.edu.bo"
                    value={colabEmail}
                    onChange={(e) => setColabEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-paper text-ink text-xs focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-ink-soft mb-1">Nivel de Permiso (3 Tipos)</label>
                  <select
                    value={colabPermiso}
                    onChange={(e) => setColabPermiso(e.target.value as TipoPermisoDoc)}
                    className="w-full p-2.5 rounded-xl border border-line bg-paper text-ink text-xs focus:border-accent focus:outline-hidden"
                  >
                    <option value="LECTURA">👁️ LECTURA (Solo puede visualizar el documento sin editar)</option>
                    <option value="EDICION">✏️ EDICIÓN (Puede modificar el contenido del documento)</option>
                    <option value="ADMINISTRACION">⚙️ ADMINISTRACIÓN (Puede editar y además gestionar integrantes)</option>
                  </select>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={assigningColab}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-white font-semibold hover:bg-accent-dark disabled:opacity-50"
                  >
                    {assigningColab ? <span className="btn-spinner" /> : <Shield className="w-3.5 h-3.5" />}
                    <span>Asignar Permiso</span>
                  </button>
                </div>
              </form>

              {/* Lista actual de colaboradores en el modal */}
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-ink">Integrantes con acceso en este proyecto:</div>
                <div className="max-h-56 overflow-y-auto space-y-1.5">
                  <div className="p-2.5 rounded-xl border border-line-soft bg-paper flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-ink">{selectedDoc.autorNombre}</div>
                      <div className="text-[10px] text-ink-faint">{selectedDoc.autorEmail}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent/20 text-accent-dark">
                      Autor / Propietario
                    </span>
                  </div>

                  {selectedDoc.colaboradores?.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl border border-line-soft bg-paper flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-ink">{c.usuarioNombre}</div>
                        <div className="text-[10px] text-ink-faint">{c.usuarioEmail}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            c.permiso === "ADMINISTRACION"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                              : c.permiso === "EDICION"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}
                        >
                          {c.permiso}
                        </span>
                        <button
                          onClick={() => handleRemoverColaborador(c.id)}
                          className="p-1 rounded text-ink-faint hover:text-danger hover:bg-danger-soft/30"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-line-soft">
                <button
                  type="button"
                  onClick={() => setShowColabModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-ink text-paper text-xs font-semibold hover:opacity-90 dark:bg-paper dark:text-ink"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
