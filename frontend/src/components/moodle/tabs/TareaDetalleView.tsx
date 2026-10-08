import React from "react";
import {
  FileText,
  FileUp,
  Users,
  Award,
  Pencil,
  Lock,
  Unlock,
  History,
  Download,
  ShieldCheck,
  Clock,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import {
  TareaDTO,
  ConvocatoriaDTO,
  ConvocatoriaParticipanteDTO,
  getMediaUrl,
} from "@/lib/api";
import {
  formatMoodleDate,
  formatMoodleDateShort,
  parseIsoDateWithoutShift,
  calcularTiempoRestanteMoodle,
  renderArchivoIcon,
} from "../moodleUtils";

interface TareaDetalleViewProps {
  tarea: TareaDTO;
  convocatoria: ConvocatoriaDTO;
  estudiantesAdmitidos: ConvocatoriaParticipanteDTO[];
  puedeGestionarTareas: boolean;
  esJuradoEnEstaArea: boolean;
  onVolver: () => void;
  onAbrirEntregaModal: (t: TareaDTO) => void;
  onAbrirEditarTarea: (t: TareaDTO) => void;
  onAbrirDocumentoColaborativo: (t: TareaDTO) => void;
  abriendoDocumentoColaborativo: number | null;
  onToggleHabilitar: (tId: number) => void;
  onVerEntregas: (t: TareaDTO) => void;
  onVerHistorialVersiones: (entregaId: number) => void;
}

export default function TareaDetalleView({
  tarea,
  convocatoria,
  estudiantesAdmitidos,
  puedeGestionarTareas,
  esJuradoEnEstaArea,
  onVolver,
  onAbrirEntregaModal,
  onAbrirEditarTarea,
  onAbrirDocumentoColaborativo,
  abriendoDocumentoColaborativo,
  onToggleHabilitar,
  onVerEntregas,
  onVerHistorialVersiones,
}: TareaDetalleViewProps) {
  const [ahoraMs, setAhoraMs] = React.useState(Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setAhoraMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const miEntrega = tarea.miEntrega;
  const fechaLimite = tarea.fechaEntrega || tarea.fechaLimite;
  const tiempoRestante = calcularTiempoRestanteMoodle(
    fechaLimite,
    miEntrega?.fechaEntrega,
    tarea.fechaHabilitacion
  );

  const habMs = tarea.fechaHabilitacion
    ? parseIsoDateWithoutShift(tarea.fechaHabilitacion).getTime()
    : null;
  const corteMs = tarea.fechaCorte
    ? parseIsoDateWithoutShift(tarea.fechaCorte).getTime()
    : null;

  const deshabilitada = !tarea.habilitada || tarea.estadoMoodle === "DESHABILITADA";
  const noAbiertaAun = habMs ? ahoraMs < (habMs - 500) : tarea.estadoMoodle === "PENDIENTE_APERTURA";
  const cerradaCorte = corteMs ? ahoraMs > corteMs : tarea.estadoMoodle === "CERRADA_CORTE";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Navegación y Breadcrumbs estilo Moodle */}
      <div>
        <button
          onClick={onVolver}
          className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-accent font-medium mb-3 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {tarea.moduloTitulo
            ? `Volver al Módulo: ${tarea.moduloTitulo}`
            : "Volver a Convocatoria y Módulos"}
        </button>
        <div className="flex items-center gap-2 text-xs text-ink-faint">
          <span className="hover:text-accent cursor-pointer" onClick={onVolver}>
            {convocatoria.titulo}
          </span>
          <ChevronRight className="w-3.5 h-3.5" />
          {tarea.moduloTitulo && (
            <>
              <span className="text-ink-soft hover:text-accent cursor-pointer" onClick={onVolver}>
                {tarea.moduloTitulo}
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
          <span className="text-ink font-semibold truncate max-w-xs">{tarea.titulo}</span>
        </div>
      </div>

      {/* Encabezado Moodle */}
      <div className="bg-paper border border-line rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center shrink-0">
              <FileUp className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-ink">
                  {tarea.titulo}
                </h1>
                {tarea.esGrupal && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Grupal
                  </span>
                )}
              </div>

              {/* Apertura y Cierre */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-y-1 gap-x-5 text-xs text-ink-soft pt-1">
                <div>
                  <span className="font-semibold text-ink">Apertura: </span>
                  <span>{formatMoodleDate(tarea.fechaHabilitacion)}</span>
                </div>
                <div>
                  <span className="font-semibold text-ink">Cierre: </span>
                  <span>{formatMoodleDate(fechaLimite)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Puntaje máximo y badge de recepción */}
          <div className="flex sm:flex-col items-end gap-2 shrink-0">
            <span className="px-3 py-1 bg-paper-sunken border border-line rounded-xl text-xs font-bold text-ink">
              {tarea.puntajeMaximo} puntos
            </span>
            {(() => {
              if (deshabilitada) {
                return (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-paper-sunken text-ink-faint border border-line">
                    Deshabilitada
                  </span>
                );
              }
              if (noAbiertaAun && !cerradaCorte) {
                return (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                    Próxima apertura
                  </span>
                );
              }
              if (cerradaCorte) {
                return (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                    Cerrada
                  </span>
                );
              }
              if (tarea.estadoMoodle === "ENTREGA_CON_RETRASO") {
                return (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    Entrega con retraso
                  </span>
                );
              }
              return (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  Abierta
                </span>
              );
            })()}
          </div>
        </div>

        {/* Descripción / Instrucciones */}
        {tarea.descripcion && (
          <div className="pt-3 border-t border-line-soft">
            <p className="text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-line">
              {tarea.descripcion}
            </p>
          </div>
        )}

        {/* Parámetros de entrega */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-ink-soft border-t border-line-soft">
          <span><strong>Formatos permitidos:</strong> {tarea.tiposArchivosPermitidos || "*"}</span>
          <span>•</span>
          <span><strong>Tamaño máximo:</strong> {tarea.tamanoMaximoMb || 10} MB</span>
          {tarea.fechaCorte && (
            <>
              <span>•</span>
              <span className="text-rose-700 dark:text-rose-300">
                <strong>Límite estricto de corte:</strong> {formatMoodleDate(tarea.fechaCorte)}
              </span>
            </>
          )}
        </div>

        {tarea.documentoColaborativoHabilitado && (
          <div className="pt-3 border-t border-line-soft">
            <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-ink">Documento colaborativo del grupo</h4>
                  <p className="text-[11px] text-ink-soft mt-0.5">
                    {puedeGestionarTareas
                      ? "Acceso docente en modo vista, sin edicion."
                      : "Solo los integrantes del grupo vinculado pueden editar este documento."}
                  </p>
                  {tarea.actividadGrupoTitulo && (
                    <p className="text-[10px] text-sky-700 dark:text-sky-300 font-semibold mt-1">
                      Actividad de grupos: {tarea.actividadGrupoTitulo}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={abriendoDocumentoColaborativo === tarea.id}
                onClick={() => onAbrirDocumentoColaborativo(tarea)}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-xs"
              >
                <FileText className="w-4 h-4" />
                {abriendoDocumentoColaborativo === tarea.id ? "Abriendo..." : "Abrir documento"}
              </button>
            </div>
          </div>
        )}

        {/* Rúbrica de evaluación pedagógica si aplica */}
        {tarea.rubrica && tarea.rubrica.length > 0 && (
          <div className="pt-3 border-t border-line-soft space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                <Award className="w-4 h-4 text-accent" /> Rúbrica de Evaluación ({tarea.rubrica.length} criterios)
              </h4>
              <span className="text-[11px] font-semibold text-accent">
                Total: {tarea.rubrica.reduce((acc, c) => acc + (c.puntajeMaximo || 0), 0)} pts
              </span>
            </div>
            <div className="border border-line rounded-xl overflow-hidden bg-paper">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper-sunken border-b border-line text-[10px] text-ink-faint uppercase font-bold">
                  <tr>
                    <th className="py-2.5 px-3.5">Criterio</th>
                    <th className="py-2.5 px-3.5">Descripción u Orientaciones</th>
                    <th className="py-2.5 px-3.5 text-right">Puntaje Máximo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  {tarea.rubrica.map((crit) => (
                    <tr key={crit.id || crit.orden} className="hover:bg-paper-sunken/40">
                      <td className="py-2.5 px-3.5 font-bold text-ink">{crit.nombre}</td>
                      <td className="py-2.5 px-3.5 text-ink-soft text-[11px] leading-relaxed">
                        {crit.descripcion || <span className="text-ink-faint italic">-</span>}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-accent whitespace-nowrap">
                        {crit.puntajeMaximo} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Sumario de Calificaciones para Docentes / Jurados */}
      {(puedeGestionarTareas || esJuradoEnEstaArea) && (
        <div className="bg-paper border border-line rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-serif font-bold text-ink">
              Sumario de calificaciones
            </h2>
            {puedeGestionarTareas && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onAbrirEditarTarea(tarea)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-line bg-paper-sunken hover:bg-paper text-ink flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Editar información, plazos y restricciones de la tarea"
                >
                  <Pencil className="w-3.5 h-3.5 text-accent" />
                  Editar Tarea
                </button>
                <button
                  onClick={() => onToggleHabilitar(tarea.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                    tarea.habilitada
                      ? "bg-paper-sunken border-line text-ink hover:bg-paper"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  {tarea.habilitada ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  {tarea.habilitada ? "Cerrar Recepción" : "Habilitar Recepción"}
                </button>
              </div>
            )}
          </div>

          <div className="border border-line rounded-xl overflow-hidden bg-paper shadow-2xs divide-y divide-line text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3">
              <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                Participantes
              </div>
              <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
                {estudiantesAdmitidos.length}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3">
              <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                Enviados
              </div>
              <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper font-medium">
                {tarea.totalEntregas || 0}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3">
              <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                Fecha de entrega
              </div>
              <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
                {formatMoodleDate(fechaLimite)}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3">
              <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                Tiempo restante
              </div>
              <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
                {calcularTiempoRestanteMoodle(fechaLimite).texto}
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onVerEntregas(tarea)}
              className="px-5 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4" /> Ver / Calificar todas las entregas
            </button>
          </div>
        </div>
      )}

      {/* Tabla de "Estado de la entrega" */}
      <div className="bg-paper border border-line rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-base sm:text-lg font-serif font-bold text-ink">
          Estado de la entrega
        </h2>

        {/* Aviso de Entrega Protegida Previa a la Edición */}
        {miEntrega && tarea.updatedAt && new Date(miEntrega.fechaEntrega) < new Date(tarea.updatedAt) && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-200 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-emerald-900 dark:text-emerald-100">
                Tu entrega se encuentra registrada y resguardada
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                Tu trabajo fue enviado exitosamente el <strong>{formatMoodleDate(miEntrega.fechaEntrega)}</strong> con anterioridad a la última modificación de plazos del docente ({formatMoodleDate(tarea.updatedAt)}). Tu entrega se mantiene formalmente archivada y válida.
              </p>
            </div>
          </div>
        )}

        <div className="border border-line rounded-xl overflow-hidden bg-paper shadow-2xs divide-y divide-line text-xs sm:text-sm">
          {/* Estado de la entrega */}
          <div className="grid grid-cols-1 sm:grid-cols-3">
            <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
              Estado de la entrega
            </div>
            <div
              className={`sm:col-span-2 p-3 sm:px-4 font-medium flex items-center justify-between flex-wrap gap-2 ${
                miEntrega ? "bg-accent-soft text-accent-dark" : "text-ink-soft bg-paper"
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  {miEntrega
                    ? miEntrega.conRetraso
                      ? "Enviado para calificar (con retraso)"
                      : "Enviado para calificar"
                    : "No entregado"}
                </span>
                {miEntrega?.intentos && miEntrega.intentos > 1 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-paper border border-line font-bold text-ink">
                    Intento #{miEntrega.intentos}
                  </span>
                )}
              </div>
              {miEntrega && miEntrega.intentos && miEntrega.intentos > 1 && (
                <button
                  type="button"
                  onClick={() => onVerHistorialVersiones(miEntrega.id)}
                  className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" /> Ver historial
                </button>
              )}
            </div>
          </div>

          {/* Estado de la calificación */}
          <div className="grid grid-cols-1 sm:grid-cols-3">
            <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
              Estado de la calificación
            </div>
            <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
              {miEntrega?.estado === "CALIFICADO" ? (
                <div className="space-y-1.5">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300 block">
                    Calificado ({miEntrega.calificacion} / {tarea.puntajeMaximo} pts)
                  </span>
                  {miEntrega.puntajesCriterios && miEntrega.puntajesCriterios.length > 0 && (
                    <div className="pt-1 border-t border-line space-y-1">
                      {miEntrega.puntajesCriterios.map((pc) => (
                        <div key={pc.criterioId} className="flex items-center justify-between text-[11px] text-ink-soft">
                          <span>• {pc.nombre}:</span>
                          <strong className="text-ink">{pc.puntaje} / {pc.puntajeMaximo} pts</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                "Sin calificar"
              )}
            </div>
          </div>

          {/* Fecha de entrega */}
          <div className="grid grid-cols-1 sm:grid-cols-3">
            <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
              Fecha de entrega
            </div>
            <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
              {formatMoodleDate(fechaLimite)}
            </div>
          </div>

          {/* Tiempo restante */}
          <div className="grid grid-cols-1 sm:grid-cols-3">
            <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
              Tiempo restante
            </div>
            <div
              className={`sm:col-span-2 p-3 sm:px-4 font-medium ${
                tiempoRestante.temprano
                  ? "bg-accent-soft text-accent-dark"
                  : tiempoRestante.retraso
                  ? "text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/20"
                  : "text-ink-soft bg-paper"
              }`}
            >
              {tiempoRestante.texto}
            </div>
          </div>

          {/* Última modificación */}
          <div className="grid grid-cols-1 sm:grid-cols-3">
            <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
              Última modificación
            </div>
            <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper flex items-center gap-2 flex-wrap">
              <span>{miEntrega ? formatMoodleDate(miEntrega.fechaEntrega) : "-"}</span>
              {miEntrega && tarea.updatedAt && new Date(miEntrega.fechaEntrega) < new Date(tarea.updatedAt) && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  Entregado antes de la última edición
                </span>
              )}
            </div>
          </div>

          {/* Archivos enviados (N archivos) */}
          <div className="grid grid-cols-1 sm:grid-cols-3">
            <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
              Archivos enviados
            </div>
            <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
              {miEntrega?.nombreArchivo ? (
                <div className="space-y-1.5">
                  {miEntrega.archivoUrl?.includes(",") || miEntrega.nombreArchivo?.includes(",") ? (
                    miEntrega.archivoUrl?.split(",").map((rawUrl, idx) => {
                      const url = rawUrl.trim();
                      const nombres = miEntrega.nombreArchivo ? miEntrega.nombreArchivo.split(",") : [];
                      const nombre = (nombres[idx] || nombres[0] || `Archivo ${idx + 1}`).trim();
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          {renderArchivoIcon(nombre, "w-4 h-4 text-ink-faint shrink-0")}
                          {url ? (
                            <a
                              href={getMediaUrl(url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent hover:underline font-medium inline-flex items-center gap-1.5"
                            >
                              {nombre}
                              <Download className="w-3.5 h-3.5 shrink-0" />
                            </a>
                          ) : (
                            <span className="font-medium text-ink">{nombre}</span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center gap-2">
                      {renderArchivoIcon(miEntrega.nombreArchivo, "w-4 h-4 text-ink-faint shrink-0")}
                      {miEntrega.archivoUrl ? (
                        <a
                          href={getMediaUrl(miEntrega.archivoUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline font-medium inline-flex items-center gap-1.5"
                        >
                          {miEntrega.nombreArchivo}
                          <Download className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      ) : (
                        <span className="font-medium text-ink">{miEntrega.nombreArchivo}</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-ink-faint italic">No se han adjuntado archivos</span>
              )}
            </div>
          </div>

          {/* Comentarios de la entrega */}
          <div className="grid grid-cols-1 sm:grid-cols-3">
            <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
              Comentarios de la entrega
            </div>
            <div className="sm:col-span-2 p-3 sm:px-4 text-ink bg-paper leading-relaxed">
              {miEntrega?.comentarioEstudiante ? (
                <p className="italic text-ink-soft">&ldquo;{miEntrega.comentarioEstudiante}&rdquo;</p>
              ) : (
                <span className="text-ink-faint italic">Sin comentarios</span>
              )}
            </div>
          </div>
        </div>

        {/* Botón de Agregar / Modificar Entrega */}
        <div className="pt-3 flex flex-col items-center justify-center text-center space-y-2">
          {(() => {
            if (deshabilitada) {
              return (
                <div className="p-3.5 bg-paper-sunken border border-line rounded-xl text-xs text-ink-faint">
                  La recepción de entregas para esta tarea ha sido deshabilitada por el docente.
                </div>
              );
            }

            if (noAbiertaAun && !cerradaCorte) {
              return (
                <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-blue-600" />
                  <span>
                    Esta actividad aún no está abierta para entregas. Se habilitará el{" "}
                    <strong>{formatMoodleDate(tarea.fechaHabilitacion)}</strong>.
                  </span>
                </div>
              );
            }

            if (cerradaCorte) {
              return (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>
                    Esta tarea ya no acepta entregas debido a que ha expirado la fecha límite de corte (
                    {formatMoodleDate(tarea.fechaCorte)}).
                  </span>
                </div>
              );
            }

            return (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => onAbrirEntregaModal(tarea)}
                  className="px-8 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
                >
                  {miEntrega ? "Modificar entrega" : "Agregar entrega"}
                </button>
                {tarea.estadoMoodle === "ENTREGA_CON_RETRASO" && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    ⚠️ La fecha límite regular ha pasado. Tu entrega será registrada con retraso.
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Retroalimentación Docente */}
      {miEntrega?.estado === "CALIFICADO" && (
        <div className="bg-paper border border-line rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base sm:text-lg font-serif font-bold text-ink">
            Retroalimentación
          </h2>
          <div className="border border-line rounded-xl overflow-hidden bg-paper shadow-2xs divide-y divide-line text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3">
              <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                Calificación
              </div>
              <div className="sm:col-span-2 p-3 sm:px-4 font-bold text-accent bg-paper text-sm">
                {miEntrega.calificacion?.toFixed(2)} / {tarea.puntajeMaximo?.toFixed(2)}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3">
              <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                Calificado el
              </div>
              <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper">
                {formatMoodleDate(miEntrega.fechaCalificacion || miEntrega.fechaEntrega)}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3">
              <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                Calificado por
              </div>
              <div className="sm:col-span-2 p-3 sm:px-4 text-ink-soft bg-paper font-medium">
                {miEntrega.calificadoPorNombre || "Docente / Evaluador"}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3">
              <div className="p-3 sm:px-4 font-semibold text-ink bg-paper-sunken/40 flex items-center">
                Comentarios de retroalimentación
              </div>
              <div className="sm:col-span-2 p-3 sm:px-4 text-ink bg-paper leading-relaxed whitespace-pre-line">
                {miEntrega.retroalimentacion || "Sin comentarios adicionales."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
