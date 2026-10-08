import React, { useState, useEffect } from "react";
import {
  FileText,
  XCircle,
  ShieldCheck,
  Check,
  Download,
  Users,
  Award,
  PlusCircle,
  Trash2,
} from "lucide-react";
import {
  api,
  TareaDTO,
  TareaRequest,
  ModuloDTO,
  ActividadGrupoDTO,
  EntregaTareaDTO,
  CriterioRequest,
  getMediaUrl,
} from "@/lib/api";
import {
  formatMoodleDate,
  formatForDateTimeLocal,
  formatDateTimeForBackend,
} from "../moodleUtils";

interface CrearEditarTareaModalProps {
  isOpen: boolean;
  onClose: () => void;
  convocatoriaId: number;
  tareaEditing: TareaDTO | null;
  moduloIdDefault: number | null;
  modulos: ModuloDTO[];
  actividadesGrupo: ActividadGrupoDTO[];
  onSuccess: (updatedTareas: TareaDTO[], updatedTareaDetalle?: TareaDTO) => void;
  toast: (text: string, type?: "success" | "error" | "info") => void;
}

export default function CrearEditarTareaModal({
  isOpen,
  onClose,
  convocatoriaId,
  tareaEditing,
  moduloIdDefault,
  modulos,
  actividadesGrupo,
  onSuccess,
  toast,
}: CrearEditarTareaModalProps) {
  const [tituloTarea, setTituloTarea] = useState("");
  const [descTarea, setDescTarea] = useState("");
  const [tareaModuloId, setTareaModuloId] = useState<number | "">("");
  const [tareaActividadGrupoId, setTareaActividadGrupoId] = useState<number | "">("");
  const [fechaHabilitacion, setFechaHabilitacion] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [fechaCorte, setFechaCorte] = useState("");
  const [archivosPermitidos, setArchivosPermitidos] = useState(".pdf, .docx, .zip");
  const [tamanoMb, setTamanoMb] = useState(15);
  const [puntajeMax, setPuntajeMax] = useState(100);
  const [esGrupalTarea, setEsGrupalTarea] = useState(false);
  const [documentoColaborativoHabilitado, setDocumentoColaborativoHabilitado] = useState(false);
  const [tieneRubricaTarea, setTieneRubricaTarea] = useState(false);
  const [criteriosRubricaTarea, setCriteriosRubricaTarea] = useState<CriterioRequest[]>([]);
  const [creandoTarea, setCreandoTarea] = useState(false);

  const [entregasTareaEditing, setEntregasTareaEditing] = useState<EntregaTareaDTO[]>([]);
  const [loadingEntregasEditing, setLoadingEntregasEditing] = useState(false);

  useEffect(() => {
    if (tareaEditing) {
      setTareaModuloId(
        tareaEditing.moduloId !== undefined && tareaEditing.moduloId !== null
          ? tareaEditing.moduloId
          : ""
      );
      setTareaActividadGrupoId(
        tareaEditing.actividadGrupoId !== undefined && tareaEditing.actividadGrupoId !== null
          ? tareaEditing.actividadGrupoId
          : ""
      );
      setTituloTarea(tareaEditing.titulo || "");
      setDescTarea(tareaEditing.descripcion || "");
      setFechaHabilitacion(formatForDateTimeLocal(tareaEditing.fechaHabilitacion));
      setFechaEntrega(formatForDateTimeLocal(tareaEditing.fechaEntrega || tareaEditing.fechaLimite));
      setFechaCorte(formatForDateTimeLocal(tareaEditing.fechaCorte));
      setArchivosPermitidos(tareaEditing.tiposArchivosPermitidos || ".pdf, .docx, .zip");
      setTamanoMb(tareaEditing.tamanoMaximoMb || 15);
      setPuntajeMax(tareaEditing.puntajeMaximo || 100);
      setEsGrupalTarea(Boolean(tareaEditing.esGrupal));
      setDocumentoColaborativoHabilitado(Boolean(tareaEditing.documentoColaborativoHabilitado));

      if (tareaEditing.rubrica && tareaEditing.rubrica.length > 0) {
        setTieneRubricaTarea(true);
        setCriteriosRubricaTarea(
          tareaEditing.rubrica.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            descripcion: c.descripcion || "",
            puntajeMaximo: c.puntajeMaximo,
          }))
        );
      } else {
        setTieneRubricaTarea(false);
        setCriteriosRubricaTarea([]);
      }

      setLoadingEntregasEditing(true);
      api
        .getEntregasTarea(tareaEditing.id)
        .then((entregas) => setEntregasTareaEditing(entregas || []))
        .catch(() => setEntregasTareaEditing([]))
        .finally(() => setLoadingEntregasEditing(false));
    } else {
      setTituloTarea("");
      setDescTarea("");
      setTareaModuloId(moduloIdDefault !== null && moduloIdDefault !== undefined ? moduloIdDefault : "");
      setTareaActividadGrupoId("");
      setFechaHabilitacion("");
      setFechaEntrega("");
      setFechaCorte("");
      setArchivosPermitidos(".pdf, .docx, .zip");
      setTamanoMb(15);
      setPuntajeMax(100);
      setEsGrupalTarea(false);
      setDocumentoColaborativoHabilitado(false);
      setTieneRubricaTarea(false);
      setCriteriosRubricaTarea([]);
      setEntregasTareaEditing([]);
    }
  }, [tareaEditing, moduloIdDefault, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloTarea.trim()) {
      toast("El título de la tarea es obligatorio", "error");
      return;
    }

    if (documentoColaborativoHabilitado && (!esGrupalTarea || !tareaActividadGrupoId)) {
      toast("El documento colaborativo debe estar vinculado a una actividad de grupos.", "error");
      return;
    }

    if (tieneRubricaTarea) {
      if (criteriosRubricaTarea.length === 0) {
        toast("Debes agregar al menos un criterio a la rúbrica o desactivarla.", "error");
        return;
      }
      for (const crit of criteriosRubricaTarea) {
        if (!crit.nombre.trim()) {
          toast("Todos los criterios de la rúbrica deben tener nombre.", "error");
          return;
        }
        if (Number(crit.puntajeMaximo) <= 0) {
          toast("El puntaje máximo de cada criterio debe ser mayor a 0.", "error");
          return;
        }
      }
      const sumRubrica = criteriosRubricaTarea.reduce((acc, c) => acc + Number(c.puntajeMaximo || 0), 0);
      if (sumRubrica > Number(puntajeMax)) {
        toast(`La suma de los criterios de la rúbrica (${sumRubrica} pts) supera el puntaje máximo de la tarea (${puntajeMax} pts).`, "error");
        return;
      }
    }

    try {
      setCreandoTarea(true);
      const payload: TareaRequest = {
        convocatoriaId,
        moduloId: tareaModuloId ? Number(tareaModuloId) : 0,
        titulo: tituloTarea.trim(),
        descripcion: descTarea.trim() || undefined,
        fechaHabilitacion: formatDateTimeForBackend(fechaHabilitacion),
        fechaEntrega: formatDateTimeForBackend(fechaEntrega),
        fechaCorte: formatDateTimeForBackend(fechaCorte),
        habilitada: tareaEditing && tareaEditing.habilitada !== undefined ? tareaEditing.habilitada : true,
        tiposArchivosPermitidos: archivosPermitidos.trim() || ".pdf, .docx, .zip",
        tamanoMaximoMb: Number(tamanoMb) || 15,
        puntajeMaximo: Number(puntajeMax) || 100,
        esGrupal: esGrupalTarea,
        actividadGrupoId: esGrupalTarea && tareaActividadGrupoId ? Number(tareaActividadGrupoId) : undefined,
        documentoColaborativoHabilitado,
        rubrica: tieneRubricaTarea
          ? criteriosRubricaTarea.map((c) => ({
              id: c.id,
              nombre: c.nombre.trim(),
              descripcion: c.descripcion?.trim() || undefined,
              puntajeMaximo: Number(c.puntajeMaximo),
            }))
          : tareaEditing
          ? []
          : null,
      };

      let updatedDetalle: TareaDTO | undefined = undefined;
      if (tareaEditing) {
        updatedDetalle = await api.updateTarea(tareaEditing.id, payload);
        toast("Tarea académica actualizada exitosamente. Las entregas registradas se mantienen intactas.", "success");
      } else {
        await api.createTareaConvocatoria(convocatoriaId, payload);
        toast("Tarea académica creada exitosamente con control de fechas Moodle", "success");
      }

      const updatedTareas = await api.getTareasConvocatoria(convocatoriaId);
      onSuccess(updatedTareas, updatedDetalle);
      onClose();
    } catch (err: any) {
      toast(err.message || (tareaEditing ? "No se pudo actualizar la tarea" : "No se pudo crear la tarea"), "error");
    } finally {
      setCreandoTarea(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-paper border border-line rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />{" "}
              {tareaEditing ? "Editar Tarea Académica (Moodle)" : "Nueva Tarea Académica (Moodle)"}
            </h3>
            <p className="text-[11px] text-ink-soft mt-0.5">
              {tareaEditing
                ? "Modifica fechas, instrucciones o restricciones. Las entregas registradas previamente se mantendrán intactas."
                : "Configura las pautas y plazos de entrega para los estudiantes"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-faint hover:text-ink cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Historial de entregas al editar */}
        {tareaEditing && (
          <div className="p-3.5 bg-paper-sunken/80 border border-line rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-xs text-ink">
                  Historial de Entregas ({entregasTareaEditing.length} registradas)
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" /> Entregas Protegidas
              </span>
            </div>

            <p className="text-[11px] text-ink-soft leading-relaxed">
              Si amplías o ajustas la fecha límite o parámetros, <strong>los estudiantes que ya entregaron no perderán su entrega</strong>; sus archivos permanecen registrados formalmente.
            </p>

            {loadingEntregasEditing ? (
              <div className="p-3 text-center text-xs text-ink-faint bg-paper rounded-lg border border-line">
                Cargando historial de entregas...
              </div>
            ) : entregasTareaEditing.length === 0 ? (
              <div className="p-2.5 text-center text-[11px] text-ink-faint bg-paper rounded-lg border border-line">
                No hay entregas previas para esta tarea todavía. Puedes ajustar los plazos con total libertad.
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto divide-y divide-line rounded-lg border border-line bg-paper text-[11px]">
                {entregasTareaEditing.map((entrega) => (
                  <div
                    key={entrega.id}
                    className="p-2.5 flex items-center justify-between gap-2 hover:bg-paper-sunken/40 transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-semibold text-ink truncate">
                        {entrega.estudianteNombre || entrega.estudianteEmail}
                      </p>
                      <p className="text-[10px] text-ink-soft flex items-center gap-1.5 flex-wrap">
                        {entrega.grupoNombre && (
                          <span className="font-medium text-accent">[{entrega.grupoNombre}]</span>
                        )}
                        <span>Entregado: {formatMoodleDate(entrega.fechaEntrega)}</span>
                        {entrega.estado === "CALIFICADO" ? (
                          <span className="text-emerald-600 font-semibold">({entrega.calificacion} pts)</span>
                        ) : null}
                      </p>
                    </div>

                    {entrega.nombreArchivo && (
                      <div className="shrink-0 flex items-center gap-1">
                        {entrega.archivoUrl ? (
                          <a
                            href={getMediaUrl(entrega.archivoUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-paper-sunken hover:bg-paper text-accent border border-line rounded-md text-[10px] font-medium flex items-center gap-1 transition-colors"
                            title={`Descargar ${entrega.nombreArchivo}`}
                          >
                            <FileText className="w-3 h-3" />
                            <span className="max-w-[110px] truncate">{entrega.nombreArchivo}</span>
                            <Download className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-ink-soft">{entrega.nombreArchivo}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-ink block mb-1">Módulo de Aprendizaje (Opcional)</label>
            <select
              value={tareaModuloId}
              onChange={(e) => setTareaModuloId(e.target.value ? Number(e.target.value) : "")}
              className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
            >
              <option value="">-- Tarea General (Sin Módulo) --</option>
              {modulos.map((m) => (
                <option key={m.id} value={m.id}>
                  Módulo #{m.orden}: {m.titulo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-ink block mb-1">Título de la Tarea *</label>
            <input
              type="text"
              required
              value={tituloTarea}
              onChange={(e) => setTituloTarea(e.target.value)}
              placeholder="Ej. Entrega 1: Perfil de Proyecto y Objetivos"
              className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="font-semibold text-ink block mb-1">Instrucciones y Pautas</label>
            <textarea
              rows={3}
              value={descTarea}
              onChange={(e) => setDescTarea(e.target.value)}
              placeholder="Detalla qué deben entregar los estudiantes, formato esperado y criterios de evaluación..."
              className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink focus:outline-none focus:border-accent resize-none"
            />
          </div>

          {/* TRIPLE CONTROL DE FECHAS */}
          <div className="p-3 bg-paper-sunken/60 rounded-xl border border-line space-y-3">
            <span className="font-bold text-ink block text-[11px] uppercase tracking-wider text-accent">
              Control de Disponibilidad y Fechas (Moodle)
            </span>

            <div>
              <label className="font-semibold text-ink block mb-1">1. Permitir entregas desde (Habilitación)</label>
              <input
                type="datetime-local"
                value={fechaHabilitacion}
                onChange={(e) => setFechaHabilitacion(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="font-semibold text-ink block mb-1">2. Fecha de Entrega (Límite regular)</label>
              <input
                type="datetime-local"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="font-semibold text-ink block mb-1">3. Fecha de Corte (Cierre definitivo)</label>
              <input
                type="datetime-local"
                value={fechaCorte}
                onChange={(e) => setFechaCorte(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-line rounded-xl text-ink focus:outline-none focus:border-accent"
              />
              <span className="text-[10px] text-ink-faint mt-1 block">
                Tras la fecha de corte, no se permitirán más entregas ni reenvíos bajo ninguna circunstancia.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-ink block mb-1">Puntaje Máximo</label>
              <input
                type="number"
                value={puntajeMax}
                onChange={(e) => setPuntajeMax(Number(e.target.value))}
                className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink"
              />
            </div>

            <div>
              <label className="font-semibold text-ink block mb-1">Tamaño Máx (MB)</label>
              <input
                type="number"
                value={tamanoMb}
                onChange={(e) => setTamanoMb(Number(e.target.value))}
                className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink"
              />
            </div>

            <div>
              <label className="font-semibold text-ink block mb-1">Formatos Permitidos</label>
              <input
                type="text"
                value={archivosPermitidos}
                onChange={(e) => setArchivosPermitidos(e.target.value)}
                placeholder=".pdf, .docx, .zip"
                className="w-full px-3 py-2 bg-paper-sunken border border-line rounded-xl text-ink"
              />
            </div>
          </div>

          {/* Entrega Grupal */}
          <div className="p-3 bg-paper-sunken/60 rounded-xl border border-line flex items-center justify-between">
            <div className="pr-3">
              <label className="font-bold text-ink block text-xs flex items-center gap-1.5 cursor-pointer">
                <Users className="w-4 h-4 text-accent" />
                Entrega Grupal (por equipos)
              </label>
              <p className="text-[10px] text-ink-faint mt-0.5">
                Si se activa, el envío de cualquier integrante del equipo figurará como entregado para todos los compañeros.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={esGrupalTarea}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setEsGrupalTarea(checked);
                  if (!checked) {
                    setDocumentoColaborativoHabilitado(false);
                    setTareaActividadGrupoId("");
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-paper-sunken peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent border border-line"></div>
            </label>
          </div>

          <div className="p-3 bg-sky-500/5 rounded-xl border border-sky-500/20 flex items-center justify-between">
            <div className="pr-3">
              <label className="font-bold text-ink block text-xs flex items-center gap-1.5 cursor-pointer">
                <FileText className="w-4 h-4 text-sky-600" />
                Documento colaborativo por grupo
              </label>
              <p className="text-[10px] text-ink-faint mt-0.5">
                Crea un documento tipo Word para que editen solo los estudiantes del grupo seleccionado. El docente lo abre en modo vista.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={documentoColaborativoHabilitado}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setDocumentoColaborativoHabilitado(checked);
                  if (checked) setEsGrupalTarea(true);
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-paper-sunken peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600 border border-line"></div>
            </label>
          </div>

          {/* Agrupamiento / Actividad de Grupos */}
          {esGrupalTarea && (
            <div className="p-3 bg-paper-sunken/40 rounded-xl border border-line space-y-1.5">
              <label className="font-semibold text-ink block text-xs">
                Agrupamiento / Actividad de Grupos (Moodle Grouping)
              </label>
              <p className="text-[11px] text-ink-soft">
                Asocia la tarea al conjunto de grupos de una actividad específica (ej: grupos de laboratorio vs proyecto).
              </p>
              <select
                value={tareaActividadGrupoId}
                onChange={(e) => setTareaActividadGrupoId(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 bg-paper border border-line rounded-xl text-ink focus:outline-none focus:border-accent text-xs"
              >
                <option value="">-- Todos los grupos generales del aula --</option>
                {actividadesGrupo.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.titulo} ({act.grupos?.length || 0} grupos)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Rúbrica Pedagógica */}
          <div className="p-3 bg-paper-sunken/60 rounded-xl border border-line space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-bold text-ink block text-xs flex items-center gap-1.5 cursor-pointer">
                  <Award className="w-4 h-4 text-accent" />
                  Rúbrica de Evaluación Pedagógica
                </label>
                <p className="text-[10px] text-ink-faint mt-0.5">
                  Define criterios específicos con puntajes parciales para evaluación SpeedGrader.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={tieneRubricaTarea}
                  onChange={(e) => {
                    const activar = e.target.checked;
                    setTieneRubricaTarea(activar);
                    if (activar && criteriosRubricaTarea.length === 0) {
                      setCriteriosRubricaTarea([
                        { nombre: "Criterio 1", descripcion: "", puntajeMaximo: Math.round(puntajeMax / 2) || 50 },
                        { nombre: "Criterio 2", descripcion: "", puntajeMaximo: puntajeMax - (Math.round(puntajeMax / 2) || 50) },
                      ]);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-paper-sunken peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent border border-line"></div>
              </label>
            </div>

            {tieneRubricaTarea && (
              <div className="space-y-3 pt-2 border-t border-line">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-ink">Criterios definidos ({criteriosRubricaTarea.length})</span>
                  {(() => {
                    const suma = criteriosRubricaTarea.reduce((acc, c) => acc + (Number(c.puntajeMaximo) || 0), 0);
                    const excede = suma > Number(puntajeMax);
                    return (
                      <span className={`font-bold ${excede ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                        Total rúbrica: {suma} / {puntajeMax} pts {excede ? "⚠️ (Excede el máximo)" : ""}
                      </span>
                    );
                  })()}
                </div>

                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {criteriosRubricaTarea.map((crit, idx) => (
                    <div key={idx} className="p-2.5 bg-paper rounded-xl border border-line space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          placeholder={`Nombre del criterio #${idx + 1}`}
                          value={crit.nombre}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCriteriosRubricaTarea((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, nombre: val } : c))
                            );
                          }}
                          className="flex-1 px-2.5 py-1.5 bg-paper-sunken border border-line rounded-lg text-xs text-ink focus:outline-none focus:border-accent"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            min={1}
                            max={puntajeMax}
                            required
                            placeholder="Pts"
                            value={crit.puntajeMaximo}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setCriteriosRubricaTarea((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, puntajeMaximo: val } : c))
                              );
                            }}
                            className="w-16 px-2 py-1.5 bg-paper-sunken border border-line rounded-lg text-xs font-bold text-center text-ink focus:outline-none focus:border-accent"
                          />
                          <span className="text-[10px] text-ink-faint font-semibold">pts</span>
                        </div>
                        {criteriosRubricaTarea.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setCriteriosRubricaTarea((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 text-ink-faint hover:text-rose-600 transition-colors"
                            title="Eliminar criterio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Descripción u orientación de evaluación (opcional)..."
                        value={crit.descripcion || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCriteriosRubricaTarea((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, descripcion: val } : c))
                          );
                        }}
                        className="w-full px-2.5 py-1 bg-paper-sunken/60 border border-line rounded-lg text-[11px] text-ink-soft focus:outline-none focus:border-accent"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCriteriosRubricaTarea((prev) => [
                      ...prev,
                      { nombre: `Criterio #${prev.length + 1}`, descripcion: "", puntajeMaximo: 10 },
                    ]);
                  }}
                  className="w-full py-1.5 border border-dashed border-line hover:border-accent rounded-xl text-xs font-semibold text-ink-soft hover:text-accent flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Agregar Criterio a la Rúbrica
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-line rounded-xl text-ink hover:bg-paper-sunken cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creandoTarea}
              className="px-4 py-2 bg-accent text-white rounded-xl font-semibold hover:bg-accent-dark disabled:opacity-50 cursor-pointer"
            >
              {creandoTarea
                ? "Guardando..."
                : tareaEditing
                ? "Guardar Cambios de Tarea"
                : "Publicar Tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
