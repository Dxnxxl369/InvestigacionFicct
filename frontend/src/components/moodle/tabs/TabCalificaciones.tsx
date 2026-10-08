import React from "react";
import {
  Lock,
  AlertCircle,
  Award,
  Users,
  CheckCircle2,
  Download,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  User,
  ConvocatoriaDTO,
  TareaDTO,
  EntregaTareaDTO,
  ConvocatoriaParticipanteDTO,
} from "@/lib/api";
import { formatMoodleDate } from "../moodleUtils";

interface TabCalificacionesProps {
  user: User | null;
  convocatoria: ConvocatoriaDTO;
  esEstudianteInscrito: boolean;
  esEstudiantePendiente: boolean;
  esEstudianteRechazado: boolean;
  tareas: TareaDTO[];
  estudiantesAdmitidos: ConvocatoriaParticipanteDTO[];
  estudiantesFiltradosGradebook: ConvocatoriaParticipanteDTO[];
  todasLasEntregas: Record<number, EntregaTareaDTO[]>;
  cargandoGradebook: boolean;
  searchGradebookEstudiante: string;
  setSearchGradebookEstudiante: (val: string) => void;
  onExportarCalificacionesCSV: () => void;
  onCargarTodasLasEntregas: () => void;
  onSelectTarea: (t: TareaDTO) => void;
  updateUrlParams: (params: { tab?: string; modulo?: number | null; tarea?: number | null }) => void;
}

export default function TabCalificaciones({
  user,
  convocatoria,
  esEstudianteInscrito,
  esEstudiantePendiente,
  esEstudianteRechazado,
  tareas,
  estudiantesAdmitidos,
  estudiantesFiltradosGradebook,
  todasLasEntregas,
  cargandoGradebook,
  searchGradebookEstudiante,
  setSearchGradebookEstudiante,
  onExportarCalificacionesCSV,
  onCargarTodasLasEntregas,
  onSelectTarea,
  updateUrlParams,
}: TabCalificacionesProps) {
  if (user?.rol === "ESTUDIANTE" && !esEstudianteInscrito && convocatoria.estado !== "FINALIZADA") {
    return (
      <div className="bg-paper border border-line rounded-2xl p-12 text-center space-y-3 shadow-xs">
        {esEstudianteRechazado ? (
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        ) : (
          <Lock className="w-10 h-10 text-ink-faint mx-auto" />
        )}
        <h3 className="text-base font-serif font-bold text-ink">
          {esEstudiantePendiente
            ? "Solicitud de admisión en revisión"
            : esEstudianteRechazado
            ? "Postulación no admitida"
            : "Calificaciones reservadas para estudiantes admitidos"}
        </h3>
        <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
          {esEstudiantePendiente
            ? "Tu postulación se encuentra en revisión. Una vez admitido, podrás visualizar tus calificaciones y retroalimentaciones."
            : esEstudianteRechazado
            ? "Tu solicitud a esta área no fue admitida."
            : "Debes solicitar tu inscripción al área y esperar la admisión del docente encargado para consultar tus calificaciones."}
        </p>
      </div>
    );
  }

  if (user?.rol === "ESTUDIANTE") {
    const tareasCalificadas = tareas.filter((t) => t.miEntrega?.estado === "CALIFICADO");
    const tareasEntregadas = tareas.filter((t) => !!t.miEntrega);
    const tareasPendientes = tareas.filter((t) => t.miEntrega && t.miEntrega.estado !== "CALIFICADO");
    const puntosObtenidos = tareasCalificadas.reduce((acc, t) => acc + (t.miEntrega?.calificacion || 0), 0);
    const puntosEvaluadosMax = tareasCalificadas.reduce((acc, t) => acc + (t.puntajeMaximo || 100), 0);
    const puntosCursoMax = tareas.reduce((acc, t) => acc + (t.puntajeMaximo || 100), 0);
    const promedioPct = puntosEvaluadosMax > 0 ? Math.round((puntosObtenidos / puntosEvaluadosMax) * 100) : 0;
    const avancePct = tareas.length > 0 ? Math.round((tareasEntregadas.length / tareas.length) * 100) : 0;

    return (
      <div className="space-y-6">
        {/* Header y Tarjetas KPI del Estudiante */}
        <div className="bg-paper border border-line rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <Award className="w-5 h-5 text-accent" /> Calificaciones del Estudiante
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Resumen oficial de entregas académicas, evaluaciones ponderadas y retroalimentación docente.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 bg-paper-sunken/60 border border-line rounded-xl">
              <span className="text-[11px] font-semibold text-ink-faint block">Promedio Calificado</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 block">
                {puntosObtenidos.toFixed(1)} / {puntosEvaluadosMax}
              </span>
              <span className="text-[10px] text-ink-soft">{promedioPct}% de rendimiento</span>
            </div>

            <div className="p-3.5 bg-paper-sunken/60 border border-line rounded-xl">
              <span className="text-[11px] font-semibold text-ink-faint block">Avance de Entregas</span>
              <span className="text-lg font-bold text-ink mt-0.5 block">
                {tareasEntregadas.length} / {tareas.length}
              </span>
              <span className="text-[10px] text-ink-soft">{avancePct}% entregado</span>
            </div>

            <div className="p-3.5 bg-paper-sunken/60 border border-line rounded-xl">
              <span className="text-[11px] font-semibold text-ink-faint block">Tareas Calificadas</span>
              <span className="text-lg font-bold text-accent mt-0.5 block">
                {tareasCalificadas.length}
              </span>
              <span className="text-[10px] text-ink-soft">Con nota y feedback</span>
            </div>

            <div className="p-3.5 bg-paper-sunken/60 border border-line rounded-xl">
              <span className="text-[11px] font-semibold text-ink-faint block">En Revisión</span>
              <span className="text-lg font-bold text-blue-600 mt-0.5 block">
                {tareasPendientes.length}
              </span>
              <span className="text-[10px] text-ink-soft">Pendientes de calificar</span>
            </div>
          </div>
        </div>

        {/* Tabla Detallada de Calificaciones por Tarea */}
        <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-line flex items-center justify-between">
            <h4 className="font-serif text-sm font-bold text-ink">
              Detalle de Tareas y Calificaciones ({tareas.length})
            </h4>
            <span className="text-xs text-ink-soft">
              Total acumulable: {puntosCursoMax} pts
            </span>
          </div>

          {tareas.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-faint">
              No hay tareas configuradas en esta convocatoria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper-sunken/60 text-ink-soft uppercase text-[10px] tracking-wider border-b border-line">
                  <tr>
                    <th className="py-3 px-4">Actividad / Tarea</th>
                    <th className="py-3 px-4">Modalidad</th>
                    <th className="py-3 px-4">Fecha Límite</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Calificación</th>
                    <th className="py-3 px-4">Retroalimentación Docente</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {tareas.map((t) => {
                    const entrega = t.miEntrega;
                    const fechaLim = t.fechaEntrega || t.fechaLimite;
                    const esTardia = Boolean(
                      entrega?.fechaEntrega &&
                        fechaLim &&
                        new Date(entrega.fechaEntrega) > new Date(fechaLim)
                    );

                    return (
                      <tr key={t.id} className="hover:bg-paper-sunken/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-ink block">{t.titulo}</span>
                            {t.moduloTitulo && (
                              <span className="text-[10px] text-ink-faint bg-paper-sunken px-1.5 py-0.5 rounded border border-line inline-block">
                                {t.moduloTitulo}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-ink-soft">
                          {t.esGrupal ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium text-[11px] border border-blue-500/20">
                              <Users className="w-3 h-3" />
                              {entrega?.grupoNombre ? entrega.grupoNombre : "Grupal"}
                            </span>
                          ) : (
                            <span className="text-ink-faint text-[11px]">Individual</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-ink-soft text-[11px]">
                          {fechaLim ? formatMoodleDate(fechaLim) : "Sin límite"}
                        </td>

                        <td className="py-3.5 px-4">
                          {entrega ? (
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  entrega.estado === "CALIFICADO"
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                    : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                                }`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                {entrega.estado === "CALIFICADO" ? "Calificado" : "Entregado"}
                              </span>
                              {esTardia && (
                                <span className="block text-[9px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                  ⚠️ Con retraso
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-paper-sunken text-ink-faint border border-line">
                              Sin entrega
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {entrega?.estado === "CALIFICADO" &&
                          entrega.calificacion !== undefined &&
                          entrega.calificacion !== null ? (
                            <div className="space-y-1">
                              <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                                {entrega.calificacion} / {t.puntajeMaximo}
                              </span>
                              <div className="h-1 w-20 bg-paper-sunken border border-line rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.round((entrega.calificacion / (t.puntajeMaximo || 100)) * 100)
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-ink-faint">- / {t.puntajeMaximo}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          {entrega?.retroalimentacion ? (
                            <p className="text-[11px] text-ink-soft italic bg-paper-sunken/50 p-2 rounded-lg border border-line leading-relaxed">
                              &ldquo;{entrega.retroalimentacion}&rdquo;
                            </p>
                          ) : (
                            <span className="text-ink-faint text-[11px]">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              onSelectTarea(t);
                              updateUrlParams({ tarea: t.id, modulo: t.moduloId || null });
                            }}
                            className="px-2.5 py-1 text-xs text-accent hover:text-accent-dark font-medium border border-accent/30 hover:border-accent rounded-lg transition-colors cursor-pointer"
                          >
                            Ver Tarea
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // VISTA DE CALIFICACIONES: DOCENTE / ADMIN (MATRIZ)
  return (
    <div className="space-y-5">
      {/* Header del Gradebook Docente */}
      <div className="bg-paper border border-line rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
            <Award className="w-5 h-5 text-accent" /> Libro Central de Calificaciones
          </h3>
          <p className="text-xs text-ink-soft mt-0.5">
            Matriz global de calificaciones y avance de estudiantes admitidos ({estudiantesAdmitidos.length}) en {tareas.length} actividades académicas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onExportarCalificacionesCSV}
            disabled={estudiantesAdmitidos.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Exportar a CSV
          </button>
          <button
            onClick={onCargarTodasLasEntregas}
            disabled={cargandoGradebook}
            className="px-3 py-2 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Refrescar entregas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargandoGradebook ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtro de Búsqueda */}
      <div className="bg-paper border border-line rounded-2xl p-3 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-ink-faint shrink-0 ml-2" />
        <input
          type="text"
          value={searchGradebookEstudiante}
          onChange={(e) => setSearchGradebookEstudiante(e.target.value)}
          placeholder="Buscar estudiante por nombre, correo o equipo..."
          className="w-full bg-transparent text-xs text-ink placeholder:text-ink-faint focus:outline-none"
        />
        {searchGradebookEstudiante && (
          <button
            onClick={() => setSearchGradebookEstudiante("")}
            className="text-xs text-ink-faint hover:text-ink p-1 mr-1 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Matriz Tabular estilo Moodle Gradebook */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
        {cargandoGradebook ? (
          <div className="p-12 text-center text-xs text-ink-faint space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-accent" />
            <p>Sincronizando entregas y calificaciones del aula...</p>
          </div>
        ) : estudiantesFiltradosGradebook.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-faint">
            {estudiantesAdmitidos.length === 0
              ? "No hay estudiantes admitidos en esta convocatoria todavía."
              : "No se encontraron estudiantes con el criterio de búsqueda especificado."}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-paper-sunken/80 text-ink text-[11px] sticky top-0 z-10 border-b border-line shadow-2xs backdrop-blur-xs">
                <tr>
                  <th className="py-3 px-4 font-bold sticky left-0 bg-paper-sunken z-20 min-w-[200px] border-r border-line">
                    Estudiante
                  </th>
                  <th className="py-3 px-3 font-semibold text-ink-soft min-w-[120px]">
                    Equipo
                  </th>
                  {tareas.map((t) => (
                    <th
                      key={t.id}
                      className="py-3 px-3 font-semibold text-center min-w-[120px] max-w-[160px] truncate"
                      title={`${t.titulo} (Máx: ${t.puntajeMaximo || 100} pts)`}
                    >
                      <span className="block truncate">{t.titulo}</span>
                      <span className="text-[10px] text-ink-faint font-normal block">
                        Máx {t.puntajeMaximo || 100} pts
                      </span>
                    </th>
                  ))}
                  <th className="py-3 px-3 font-bold text-center min-w-[100px] bg-accent/5 text-accent">
                    Total Acum.
                  </th>
                  <th className="py-3 px-3 font-bold text-center min-w-[90px]">
                    Progreso
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line text-xs">
                {estudiantesFiltradosGradebook.map((est) => {
                  let totalNota = 0;
                  let totalMax = 0;
                  let entregasRealizadas = 0;

                  return (
                    <tr key={est.id} className="hover:bg-paper-sunken/30 transition-colors">
                      {/* Estudiante (Sticky) */}
                      <td className="py-3 px-4 sticky left-0 bg-paper hover:bg-paper-sunken/30 z-10 border-r border-line">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-ink block">
                            {est.nombre} {est.apellidos}
                          </span>
                          <span className="text-[10px] text-ink-faint block truncate">
                            {est.email}
                          </span>
                        </div>
                      </td>

                      {/* Equipo */}
                      <td className="py-3 px-3 text-ink-soft text-[11px]">
                        {est.nombreEquipo ? (
                          <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent font-medium text-[10px] border border-accent/20 truncate block max-w-[130px]">
                            {est.nombreEquipo}
                          </span>
                        ) : (
                          <span className="text-ink-faint italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Celdas por cada Tarea */}
                      {tareas.map((t) => {
                        const maxP = t.puntajeMaximo || 100;
                        totalMax += maxP;
                        const entrega = todasLasEntregas[t.id]?.find(
                          (e) => e.estudianteId === est.usuarioId
                        );

                        if (entrega) {
                          entregasRealizadas++;
                          if (entrega.calificacion !== undefined && entrega.calificacion !== null) {
                            totalNota += entrega.calificacion;
                          }
                        }

                        const fechaLim = t.fechaEntrega || t.fechaLimite;
                        const esTardia = Boolean(
                          entrega?.fechaEntrega &&
                            fechaLim &&
                            new Date(entrega.fechaEntrega) > new Date(fechaLim)
                        );

                        return (
                          <td key={t.id} className="py-3 px-3 text-center">
                            {entrega ? (
                              entrega.estado === "CALIFICADO" &&
                              entrega.calificacion !== undefined &&
                              entrega.calificacion !== null ? (
                                <div className="inline-flex items-center gap-1">
                                  <span className="px-2 py-0.5 rounded-md font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-500/15 border border-emerald-500/30 text-xs">
                                    {entrega.calificacion}
                                  </span>
                                  {esTardia && (
                                    <span title="Entregado con retraso" className="text-amber-600 text-[10px]">
                                      ⚠️
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/20">
                                    Entregado
                                  </span>
                                  {esTardia && (
                                    <span title="Entregado con retraso" className="text-amber-600 text-[10px]">
                                      ⚠️
                                    </span>
                                  )}
                                </div>
                              )
                            ) : (
                              <span className="text-ink-faint text-xs">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Total Acumulado */}
                      <td className="py-3 px-3 text-center font-bold text-accent bg-accent/5">
                        {totalNota} / {totalMax}
                      </td>

                      {/* Progreso */}
                      <td className="py-3 px-3 text-center">
                        <span className="text-[11px] font-semibold text-ink">
                          {totalMax > 0 ? Math.round((totalNota / totalMax) * 100) : 0}%
                        </span>
                        <span className="text-[9px] text-ink-faint block">
                          {entregasRealizadas}/{tareas.length} entr.
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer con Promedios Generales por Actividad */}
              {tareas.length > 0 && estudiantesFiltradosGradebook.length > 0 && (
                <tfoot className="bg-paper-sunken/90 font-semibold text-[11px] text-ink border-t-2 border-line">
                  <tr>
                    <td className="py-3 px-4 sticky left-0 bg-paper-sunken z-20 border-r border-line">
                      Promedio de la Clase
                    </td>
                    <td className="py-3 px-3 text-ink-faint">-</td>
                    {tareas.map((t) => {
                      const entregasCalif = (todasLasEntregas[t.id] || []).filter(
                        (e) => e.calificacion !== undefined && e.calificacion !== null
                      );
                      const sumaNotas = entregasCalif.reduce(
                        (acc, e) => acc + (e.calificacion || 0),
                        0
                      );
                      const prom = entregasCalif.length > 0 ? (sumaNotas / entregasCalif.length).toFixed(1) : "-";

                      return (
                        <td key={t.id} className="py-3 px-3 text-center text-ink-soft">
                          {prom !== "-" ? `${prom} pts` : "-"}
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-center text-accent bg-accent/5">-</td>
                    <td className="py-3 px-3 text-center text-ink-soft">-</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
