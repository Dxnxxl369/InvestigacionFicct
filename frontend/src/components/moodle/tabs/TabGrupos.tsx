import React from "react";
import {
  Users,
  Calendar,
  Clock,
  Pencil,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Trash2,
  FolderKanban,
  PlusCircle,
  Sparkles,
  ListPlus,
  XCircle,
  Lock,
} from "lucide-react";
import {
  User,
  ConvocatoriaDTO,
  GrupoDTO,
  ActividadGrupoDTO,
  ConvocatoriaParticipanteDTO,
} from "@/lib/api";
import { formatMoodleDate } from "../moodleUtils";

interface TabGruposProps {
  user: User | null;
  convocatoria: ConvocatoriaDTO;
  esEstudianteInscrito: boolean;
  esEstudiantePendiente: boolean;
  puedeGestionarTareas: boolean;
  gruposArea: GrupoDTO[];
  actividadesGrupo: ActividadGrupoDTO[];
  actividadActiva: ActividadGrupoDTO | null;
  setActividadActiva: (act: ActividadGrupoDTO | null) => void;
  totalEstudiantesArea: number;
  totalConEquipoArea: number;
  totalSinEquipoArea: number;
  estudiantesSinEquipo: ConvocatoriaParticipanteDTO[];
  selectedGrupoRadioId: number | null;
  setSelectedGrupoRadioId: (id: number | null) => void;
  ocultarMiembros: boolean;
  setOcultarMiembros: React.Dispatch<React.SetStateAction<boolean>>;
  procesandoEleccion: boolean;
  asignandoParticipanteId: number | null;
  onGuardarEleccionGrupo: (actividadId: number) => void;
  onAnularEleccionGrupo: (actividadId: number) => void;
  onAbrirCrearActividad: () => void;
  onAbrirEditarActividad: (act: ActividadGrupoDTO) => void;
  onAbrirCrearGrupoModal: () => void;
  onAbrirGenerarLoteModal: () => void;
  onEliminarGrupo: (grupoId: number, nombreGrupo: string) => void;
  onAsignarEstudianteAGrupo: (participanteId: number, grupoId: number, nombreEstudiante: string) => void;
  onRemoverEstudianteDeGrupo: (grupoId: number, participanteId: number, nombreEstudiante: string) => void;
}

export default function TabGrupos({
  user,
  convocatoria,
  esEstudianteInscrito,
  esEstudiantePendiente,
  puedeGestionarTareas,
  gruposArea,
  actividadesGrupo,
  actividadActiva,
  setActividadActiva,
  totalEstudiantesArea,
  totalConEquipoArea,
  totalSinEquipoArea,
  estudiantesSinEquipo,
  selectedGrupoRadioId,
  setSelectedGrupoRadioId,
  ocultarMiembros,
  setOcultarMiembros,
  procesandoEleccion,
  asignandoParticipanteId,
  onGuardarEleccionGrupo,
  onAnularEleccionGrupo,
  onAbrirCrearActividad,
  onAbrirEditarActividad,
  onAbrirCrearGrupoModal,
  onAbrirGenerarLoteModal,
  onEliminarGrupo,
  onAsignarEstudianteAGrupo,
  onRemoverEstudianteDeGrupo,
}: TabGruposProps) {
  if (user?.rol === "ESTUDIANTE" && !esEstudianteInscrito && convocatoria.estado !== "FINALIZADA") {
    return (
      <div className="bg-paper border border-line rounded-2xl p-12 text-center space-y-3 shadow-xs">
        <Lock className="w-10 h-10 text-ink-faint mx-auto" />
        <h3 className="text-base font-serif font-bold text-ink">
          Acceso a Grupos y Equipos Reservado
        </h3>
        <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
          Para participar en la selección o asignación de grupos debes estar formalmente admitido por el docente en esta área.
        </p>
        {esEstudiantePendiente && (
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              <Clock className="w-3.5 h-3.5" /> Tu postulación está siendo revisada por el docente
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen de Métricas de Grupos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-paper border border-line rounded-2xl p-4 space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider block">
            Total Grupos
          </span>
          <b className="text-xl font-bold text-ink">{gruposArea.length}</b>
          <span className="text-[10px] text-ink-soft block">Grupos configurados</span>
        </div>

        <div className="bg-paper border border-line rounded-2xl p-4 space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider block">
            Estudiantes en Aula
          </span>
          <b className="text-xl font-bold text-blue-600">{totalEstudiantesArea}</b>
          <span className="text-[10px] text-ink-soft block">Admitidos oficialmente</span>
        </div>

        <div className="bg-paper border border-line rounded-2xl p-4 space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider block">
            Con Equipo
          </span>
          <b className="text-xl font-bold text-emerald-600">{totalConEquipoArea}</b>
          <span className="text-[10px] text-ink-soft block">
            {totalEstudiantesArea > 0 ? `${Math.round((totalConEquipoArea / totalEstudiantesArea) * 100)}% asignados` : "0%"}
          </span>
        </div>

        <div className="bg-paper border border-line rounded-2xl p-4 space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider block">
            Sin Equipo
          </span>
          <b className={`text-xl font-bold ${totalSinEquipoArea > 0 ? "text-amber-600" : "text-ink"}`}>
            {totalSinEquipoArea}
          </b>
          <span className="text-[10px] text-ink-soft block">
            {totalSinEquipoArea > 0 ? "Requieren asignación" : "Todos tienen grupo"}
          </span>
        </div>
      </div>

      {/* Selector destacado de Actividades de Elección de Grupo si hay múltiples */}
      {actividadesGrupo.length > 1 && (
        <div className="bg-paper border border-line rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600 shrink-0" />
              <span className="text-xs font-bold text-ink uppercase tracking-wider">
                Actividades de Elección de Grupo Disponibles ({actividadesGrupo.length})
              </span>
            </div>
            <span className="text-[11px] text-ink-faint">
              Haz clic en una actividad para gestionar tu equipo en ella
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {actividadesGrupo.map((act) => {
              const isCurrent = actividadActiva?.id === act.id;
              return (
                <button
                  key={act.id}
                  onClick={() => {
                    setActividadActiva(act);
                    setSelectedGrupoRadioId(act.grupoSeleccionadoId || null);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? "bg-purple-500/10 border-purple-500/50 shadow-xs ring-2 ring-purple-500/20"
                      : "bg-paper-sunken/40 hover:bg-paper-sunken border-line text-ink"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          act.abierta
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        {act.abierta ? "Abierta" : "Cerrada"}
                      </span>
                      <h4
                        className={`text-xs font-bold ${
                          isCurrent ? "text-purple-700 dark:text-purple-300 font-serif" : "text-ink"
                        }`}
                      >
                        {act.titulo}
                      </h4>
                    </div>
                    <p className="text-[11px] text-ink-soft">
                      {act.grupoSeleccionadoNombre ? (
                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                          ✓ Tu grupo: <u>{act.grupoSeleccionadoNombre}</u>
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-300">
                          Aún no has seleccionado grupo
                        </span>
                      )}
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold shrink-0 ${
                      isCurrent
                        ? "bg-purple-600 text-white shadow-2xs"
                        : "bg-paper border border-line text-ink-soft"
                    }`}
                  >
                    {isCurrent ? "Activa" : "Abrir"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SECCIÓN 1: ACTIVIDAD DE SELECCIÓN DE GRUPO (MOODLE CHOICE) */}
      {actividadActiva ? (
        <div className="bg-paper border border-line rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          {/* Encabezado Moodle con Icono Púrpura */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-line pb-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    Actividad Moodle Choice
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      actividadActiva.abierta
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                    }`}
                  >
                    {actividadActiva.abierta ? "Abierta para Registro" : "Actividad Cerrada"}
                  </span>
                  {!actividadActiva.permitirCambio && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                      Sin cambios de grupo
                    </span>
                  )}
                  {!actividadActiva.mostrarMiembros && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                      Miembros ocultos
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-serif text-ink">
                  {actividadActiva.titulo}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-ink-soft pt-1">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-ink-faint" />
                    <b>Abierto:</b> {formatMoodleDate(actividadActiva.fechaApertura)}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-ink-faint" />
                    <b>Cierra:</b> {formatMoodleDate(actividadActiva.fechaCierre)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {puedeGestionarTareas && (
                <button
                  type="button"
                  onClick={() => onAbrirEditarActividad(actividadActiva)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Editar plazos de apertura/cierre y configuración de la actividad"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar Plazos y Reglas
                </button>
              )}

              {/* Selector si hay múltiples actividades de grupo */}
              {actividadesGrupo.length > 1 && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-ink-faint">Actividad:</span>
                  <select
                    value={actividadActiva.id}
                    onChange={(e) => {
                      const found = actividadesGrupo.find((a) => a.id === Number(e.target.value));
                      if (found) {
                        setActividadActiva(found);
                        setSelectedGrupoRadioId(found.grupoSeleccionadoId || null);
                      }
                    }}
                    className="bg-paper-sunken border border-line rounded-xl px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
                  >
                    {actividadesGrupo.map((act) => (
                      <option key={act.id} value={act.id}>
                        {act.titulo}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Descripción / Instrucciones de la actividad */}
          {actividadActiva.descripcion && (
            <div className="bg-paper-sunken/60 border border-line rounded-xl p-4 text-xs text-ink-soft leading-relaxed">
              <p>{actividadActiva.descripcion}</p>
            </div>
          )}

          {/* Banner de Estado del Estudiante */}
          {actividadActiva.cerrada ? (
            <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-4 flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs font-medium">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <div>
                <span>
                  Lamentablemente esta actividad cerró el <b>{formatMoodleDate(actividadActiva.fechaCierre)}</b> y ya no está disponible para cambios o nuevas elecciones.
                </span>
                {actividadActiva.grupoSeleccionadoNombre && (
                  <span className="block mt-1 font-semibold">
                    Quedaste formalmente registrado en: <u>{actividadActiva.grupoSeleccionadoNombre}</u>.
                  </span>
                )}
              </div>
            </div>
          ) : actividadActiva.grupoSeleccionadoNombre ? (
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4 flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 text-xs">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
                <div>
                  <span className="font-normal text-ink-soft">Su elección confirmada:</span>{" "}
                  <b className="text-sm font-bold text-ink">{actividadActiva.grupoSeleccionadoNombre}</b>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider shadow-2xs">
                Registrado
              </span>
            </div>
          ) : (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3 text-blue-700 dark:text-blue-300 text-xs">
              <Info className="w-5 h-5 shrink-0 text-blue-600" />
              <span>
                Aún no ha seleccionado un grupo. Seleccione el grupo de su preferencia marcando la casilla correspondiente en la tabla y confirme con el botón <b>Guardar mi elección</b>.
              </span>
            </div>
          )}

          {/* Tabla de Selección estilo Moodle */}
          <div className="border border-line rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-paper-sunken/90 border-b border-line text-ink-faint font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 text-center w-20">Elección</th>
                    <th className="py-3 px-4">Grupo</th>
                    <th className="py-3 px-4 text-center w-36">Miembros / Capacidad</th>
                    <th className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <span>Miembros del grupo</span>
                        {(!actividadActiva || actividadActiva.mostrarMiembros || puedeGestionarTareas) && (
                          <button
                            type="button"
                            onClick={() => setOcultarMiembros(!ocultarMiembros)}
                            className="px-2.5 py-1 rounded-lg bg-paper border border-line text-[11px] font-semibold text-ink hover:bg-paper-sunken transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            {ocultarMiembros ? <Eye className="w-3.5 h-3.5 text-accent" /> : <EyeOff className="w-3.5 h-3.5 text-ink-faint" />}
                            {ocultarMiembros ? "Mostrar miembros del grupo" : "Ocultar miembros del grupo"}
                          </button>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(actividadActiva.grupos && actividadActiva.grupos.length > 0 ? actividadActiva.grupos : gruposArea).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-ink-soft">
                        No hay grupos configurados para esta actividad aún.
                      </td>
                    </tr>
                  ) : (
                    (actividadActiva.grupos && actividadActiva.grupos.length > 0 ? actividadActiva.grupos : gruposArea).map((g) => {
                      const esMiEleccion = actividadActiva.grupoSeleccionadoId === g.id;
                      const isRadioSelected = selectedGrupoRadioId === g.id;
                      const maxCap = g.capacidadMaxima || actividadActiva.capacidadPorGrupo || 5;
                      const pct = Math.min(100, Math.round((g.cantidadMiembros / maxCap) * 100));
                      const isDisabled = (g.completo && !esMiEleccion) || actividadActiva.cerrada || (!esEstudianteInscrito && !puedeGestionarTareas);

                      return (
                        <tr
                          key={g.id}
                          className={`transition-colors ${
                            isRadioSelected
                              ? "bg-accent/5 dark:bg-accent/10"
                              : "hover:bg-paper-sunken/40"
                          }`}
                        >
                          <td className="py-3 px-4 text-center align-middle">
                            <input
                              type="radio"
                              id={`radio-grupo-${g.id}`}
                              name="moodle_choice_radio"
                              checked={isRadioSelected}
                              disabled={isDisabled}
                              onChange={() => setSelectedGrupoRadioId(g.id)}
                              className="w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </td>

                          <td className="py-3 px-4 align-middle">
                            <div className="flex flex-wrap items-center gap-2">
                              <label
                                htmlFor={`radio-grupo-${g.id}`}
                                className={`font-semibold text-ink cursor-pointer ${
                                  isDisabled && !isRadioSelected ? "opacity-60 cursor-not-allowed" : ""
                                }`}
                              >
                                {g.nombre}
                              </label>

                              {g.completo && (
                                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/25">
                                  (Completo)
                                </span>
                              )}

                              {esMiEleccion && (
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                                  Tu elección
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center align-middle">
                            <span className="font-semibold text-ink block text-xs">
                              {g.cantidadMiembros} / {maxCap}
                            </span>
                            <div className="w-20 mx-auto bg-line-soft h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  g.completo
                                    ? "bg-rose-500"
                                    : pct > 75
                                    ? "bg-amber-500"
                                    : "bg-purple-600"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3 px-4 align-middle">
                            {actividadActiva && !actividadActiva.mostrarMiembros && !puedeGestionarTareas ? (
                              <div className="flex items-center gap-1.5 text-ink-faint italic text-xs py-1">
                                <EyeOff className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                                <span>Lista de integrantes oculta por el docente</span>
                              </div>
                            ) : ocultarMiembros ? (
                              <span className="text-ink-faint italic text-xs">
                                Nombres ocultos por preferencia
                              </span>
                            ) : g.miembros && g.miembros.length > 0 ? (
                              <div className="space-y-1">
                                {g.miembros.map((m, idx) => (
                                  <div
                                    key={m.participanteId}
                                    className="flex items-center justify-between text-xs py-0.5 group/m"
                                  >
                                    <span className="text-ink">
                                      <b className="text-ink-faint mr-1">{idx + 1}.</b>
                                      <span className="uppercase font-medium tracking-wide">
                                        {m.nombreCompleto}
                                      </span>
                                    </span>

                                    {puedeGestionarTareas && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onRemoverEstudianteDeGrupo(
                                            g.id,
                                            m.participanteId,
                                            m.nombreCompleto
                                          )
                                        }
                                        className="text-ink-faint hover:text-rose-600 opacity-0 group-hover/m:opacity-100 transition-opacity p-0.5 ml-2 cursor-pointer"
                                        title="Retirar estudiante de este grupo"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-ink-faint italic text-xs">
                                Sin miembros registrados
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Acciones de Elección */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-line">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onGuardarEleccionGrupo(actividadActiva.id)}
                disabled={
                  procesandoEleccion ||
                  !selectedGrupoRadioId ||
                  actividadActiva.cerrada ||
                  (!esEstudianteInscrito && !puedeGestionarTareas)
                }
                className="px-5 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {procesandoEleccion ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Guardar mi elección
              </button>

              {actividadActiva.grupoSeleccionadoId && !actividadActiva.cerrada && (
                <button
                  type="button"
                  onClick={() => onAnularEleccionGrupo(actividadActiva.id)}
                  disabled={procesandoEleccion}
                  className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  Eliminar mi elección
                </button>
              )}
            </div>

            <span className="text-[11px] text-ink-faint">
              {actividadActiva.cerrada
                ? "El plazo límite ha finalizado."
                : "Puedes modificar tu selección mientras la actividad permanezca abierta."}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-paper border border-line rounded-2xl p-8 text-center space-y-3 shadow-2xs">
          <Users className="w-10 h-10 text-ink-faint mx-auto" />
          <h3 className="text-base font-serif font-bold text-ink">
            Sin actividades de selección de grupo activas
          </h3>
          <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
            {puedeGestionarTareas
              ? "Puedes crear una actividad de selección de grupo (Moodle Choice) para que los estudiantes se registren autónomamente, o asignar los grupos de forma manual a continuación."
              : "El docente aún no ha publicado una actividad de elección de grupo. Te informaremos cuando esté disponible para el registro."}
          </p>
          {puedeGestionarTareas && (
            <button
              onClick={onAbrirCrearActividad}
              className="mt-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" /> Crear Actividad de Selección de Grupo
            </button>
          )}
        </div>
      )}

      {/* SECCIÓN 2: GESTIÓN DOCENTE Y ADMIN DE GRUPOS & EQUIPOS */}
      {puedeGestionarTareas && (
        <div className="bg-paper border border-line rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-accent" /> Panel Docente: Orquestación de Equipos
              </h3>
              <p className="text-xs text-ink-soft">
                Administra cupos, genera lotes de grupos y asigna a los estudiantes admitidos.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onAbrirCrearGrupoModal}
                className="px-3.5 py-2 bg-paper-sunken hover:bg-paper border border-line text-ink rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <PlusCircle className="w-3.5 h-3.5 text-accent" /> + Crear Grupo
              </button>

              <button
                onClick={onAbrirGenerarLoteModal}
                className="px-3.5 py-2 bg-paper-sunken hover:bg-paper border border-line text-ink rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Generar Lote (N Grupos)
              </button>

              <button
                onClick={onAbrirCrearActividad}
                className="px-3.5 py-2 bg-ink hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <ListPlus className="w-3.5 h-3.5" /> + Actividad de Registro
              </button>
            </div>
          </div>

          {/* BANDEJA: ESTUDIANTES SIN EQUIPO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold uppercase text-ink tracking-wider">
                  Estudiantes sin equipo ({estudiantesSinEquipo.length})
                </h4>
              </div>
              {estudiantesSinEquipo.length > 0 && (
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Pendientes de asignación
                </span>
              )}
            </div>

            {estudiantesSinEquipo.length === 0 ? (
              <div className="bg-paper-sunken/40 border border-line rounded-xl p-4 text-center text-xs text-ink-soft">
                ✓ Todos los estudiantes admitidos en esta área ya se encuentran asignados a un grupo de trabajo.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {estudiantesSinEquipo.map((est) => (
                  <div
                    key={est.id}
                    className="bg-paper-sunken/50 border border-line rounded-xl p-3 flex flex-col justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                        {est.nombre.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <b className="text-xs text-ink block truncate">
                          {est.nombre} {est.apellidos}
                        </b>
                        <span className="text-[11px] text-ink-faint block truncate">
                          {est.email}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-line-soft">
                      <label className="text-[10px] font-semibold text-ink-faint block mb-1">
                        Asignar rápidamente a:
                      </label>
                      <select
                        disabled={asignandoParticipanteId === est.id}
                        onChange={(e) => {
                          const gid = Number(e.target.value);
                          if (gid) {
                            onAsignarEstudianteAGrupo(
                              est.id,
                              gid,
                              `${est.nombre} ${est.apellidos}`
                            );
                          }
                        }}
                        value=""
                        className="w-full bg-paper border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent cursor-pointer"
                      >
                        <option value="">-- Seleccionar grupo destino --</option>
                        {gruposArea.map((g) => (
                          <option key={g.id} value={g.id} disabled={g.completo}>
                            {g.nombre} ({g.cantidadMiembros}/{g.capacidadMaxima || "∞"}{g.completo ? " - COMPLETO" : ""})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DIRECTORIO DE TODOS LOS GRUPOS DEL ÁREA */}
          <div className="space-y-3 pt-4 border-t border-line">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase text-ink tracking-wider">
                Directorio de Grupos del Área ({gruposArea.length})
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gruposArea.map((g) => {
                const maxCap = g.capacidadMaxima || 5;
                const pct = Math.min(100, Math.round((g.cantidadMiembros / maxCap) * 100));

                return (
                  <div
                    key={g.id}
                    className="bg-paper-sunken/40 border border-line rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs transition-shadow"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <b className="text-sm font-semibold text-ink">{g.nombre}</b>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              g.completo
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25"
                                : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25"
                            }`}
                          >
                            {g.cantidadMiembros} / {g.capacidadMaxima || "∞"} cupos
                          </span>
                          <button
                            onClick={() => onEliminarGrupo(g.id, g.nombre)}
                            title="Eliminar grupo"
                            className="p-1 text-ink-faint hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {g.descripcion && (
                        <p className="text-[11px] text-ink-soft line-clamp-1">{g.descripcion}</p>
                      )}

                      <div className="w-full bg-line-soft h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            g.completo
                              ? "bg-rose-500"
                              : pct > 75
                              ? "bg-amber-500"
                              : "bg-purple-600"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="pt-2 border-t border-line-soft space-y-1">
                        <span className="text-[10px] font-semibold text-ink-faint uppercase block">
                          Integrantes ({g.miembros.length}):
                        </span>
                        {g.miembros.length === 0 ? (
                          <span className="text-[11px] text-ink-faint italic block">
                            Sin integrantes registrados
                          </span>
                        ) : (
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {g.miembros.map((m) => (
                              <div
                                key={m.participanteId}
                                className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-paper border border-line-soft text-ink"
                              >
                                <div className="truncate pr-1">
                                  <span className="font-medium uppercase block truncate text-[11px]">
                                    {m.nombreCompleto}
                                  </span>
                                  <span className="text-[9px] text-ink-faint block truncate">
                                    {m.email}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRemoverEstudianteDeGrupo(
                                      g.id,
                                      m.participanteId,
                                      m.nombreCompleto
                                    )
                                  }
                                  className="text-ink-faint hover:text-rose-600 p-0.5 rounded cursor-pointer"
                                  title="Retirar del grupo"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {!g.completo && estudiantesSinEquipo.length > 0 && (
                      <div className="pt-2 border-t border-line-soft">
                        <select
                          onChange={(e) => {
                            const pid = Number(e.target.value);
                            if (pid) {
                              const est = estudiantesSinEquipo.find((x) => x.id === pid);
                              if (est) {
                                onAsignarEstudianteAGrupo(
                                  est.id,
                                  g.id,
                                  `${est.nombre} ${est.apellidos}`
                                );
                              }
                            }
                          }}
                          value=""
                          className="w-full bg-paper border border-line rounded-lg px-2 py-1 text-[11px] text-ink focus:outline-none focus:border-accent cursor-pointer"
                        >
                          <option value="">+ Añadir estudiante sin equipo...</option>
                          {estudiantesSinEquipo.map((est) => (
                            <option key={est.id} value={est.id}>
                              {est.nombre} {est.apellidos}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
