import React from "react";
import {
  FolderKanban,
  FileText,
  PlusCircle,
  Pencil,
  Trash2,
  ChevronRight,
  ArrowLeft,
  FileUp,
  Lock,
  AlertCircle,
  Clock,
  UserPlus,
  Layers,
  Users,
  CheckCircle,
} from "lucide-react";
import {
  ConvocatoriaDTO,
  ConvocatoriaParticipanteDTO,
  TareaDTO,
  ModuloDTO,
  ActividadGrupoDTO,
  User,
  getMediaUrl,
} from "@/lib/api";
import {
  formatMoodleDate,
  formatMoodleDateShort,
} from "../moodleUtils";

interface TabTareasProps {
  user: User | null;
  convocatoria: ConvocatoriaDTO;
  miParticipacion: ConvocatoriaParticipanteDTO | null;
  esEstudianteInscrito: boolean;
  esEstudiantePendiente: boolean;
  esEstudianteRechazado: boolean;
  puedeGestionarTareas: boolean;
  tareas: TareaDTO[];
  modulos: ModuloDTO[];
  actividadesGrupo: ActividadGrupoDTO[];
  selectedModuloId: number | null;
  setSelectedModuloId: (id: number | null) => void;
  onSelectTarea: (t: TareaDTO) => void;
  onAbrirCrearTarea: (moduloId?: number) => void;
  onAbrirEditarTarea: (t: TareaDTO) => void;
  onAbrirCrearModulo: () => void;
  onAbrirEditarModulo: (m: ModuloDTO) => void;
  onEliminarModulo: (modId: number) => void;
  onDeclinarSolicitudPropia: () => void;
  onAbrirInscripcionModal: () => void;
  onSeleccionarActividadGrupo: (act: ActividadGrupoDTO) => void;
  updateUrlParams: (params: { tab?: string; modulo?: number | null; tarea?: number | null }) => void;
}

export default function TabTareas({
  user,
  convocatoria,
  miParticipacion,
  esEstudianteInscrito,
  esEstudiantePendiente,
  esEstudianteRechazado,
  puedeGestionarTareas,
  tareas,
  modulos,
  actividadesGrupo,
  selectedModuloId,
  setSelectedModuloId,
  onSelectTarea,
  onAbrirCrearTarea,
  onAbrirEditarTarea,
  onAbrirCrearModulo,
  onAbrirEditarModulo,
  onEliminarModulo,
  onDeclinarSolicitudPropia,
  onAbrirInscripcionModal,
  onSeleccionarActividadGrupo,
  updateUrlParams,
}: TabTareasProps) {
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
            : "Tareas reservadas para estudiantes admitidos"}
        </h3>
        <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
          {esEstudiantePendiente
            ? "Tu postulación a esta convocatoria se encuentra actualmente en revisión por el docente o administrador. Tan pronto como seas admitido, tendrás acceso a los módulos, tareas y evaluaciones."
            : esEstudianteRechazado
            ? miParticipacion?.motivoRechazo
              ? `Motivo indicado por el docente: "${miParticipacion.motivoRechazo}". Puedes enviar una nueva solicitud si has subsanado las observaciones.`
              : "Tu postulación a esta área no fue aprobada por el docente o administrador. Puedes enviar una nueva postulación si lo deseas."
            : "Debes solicitar tu inscripción al área y esperar la admisión del docente encargado para acceder a los módulos y tareas del aula virtual."}
        </p>
        {esEstudiantePendiente && (
          <div className="pt-2 flex items-center justify-center gap-3">
            <span className="text-xs px-3.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30 flex items-center gap-1.5 shadow-xs">
              <Clock className="w-4 h-4" /> En espera de respuesta del docente encargado
            </span>
            <button
              onClick={onDeclinarSolicitudPropia}
              className="px-3.5 py-1.5 bg-danger-soft/20 text-danger hover:bg-danger-soft/40 rounded-xl text-xs font-semibold border border-danger/30 transition-all cursor-pointer"
            >
              Declinar Solicitud
            </button>
          </div>
        )}
        {esEstudianteRechazado && (
          <div className="pt-2 flex items-center justify-center">
            <button
              onClick={onAbrirInscripcionModal}
              className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Volver a Postular
            </button>
          </div>
        )}
        {!esEstudiantePendiente && !esEstudianteRechazado && (
          <div className="pt-2 flex items-center justify-center">
            <button
              onClick={onAbrirInscripcionModal}
              className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Solicitar Inscripción al Área
            </button>
          </div>
        )}
      </div>
    );
  }

  if (selectedModuloId === null) {
    return (
      <div className="space-y-6">
        {/* Banner de Actividades de Selección de Grupo */}
        {actividadesGrupo.length > 0 && (
          <div className="space-y-3">
            {actividadesGrupo.map((act) => (
              <div
                key={act.id}
                className="bg-paper border border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-500/5 via-paper to-paper hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                        Actividad de Selección de Grupo
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                          act.abierta
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                        }`}
                      >
                        {act.abierta ? "Abierta" : "Cerrada"}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-ink font-serif">
                      {act.titulo}
                    </h4>
                    <p className="text-[11px] text-ink-soft">
                      {act.grupoSeleccionadoNombre ? (
                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                          ✓ Estás registrado en: <u>{act.grupoSeleccionadoNombre}</u>
                        </span>
                      ) : (
                        <span>Cupos limitados por grupo. Cierra el {formatMoodleDate(act.fechaCierre)}.</span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onSeleccionarActividadGrupo(act)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-2xs justify-center"
                >
                  {act.grupoSeleccionadoNombre ? "Ver / Modificar Elección" : "Seleccionar Grupo"} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Cabecera de la sección Módulos */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-paper border border-line rounded-2xl p-4 sm:p-5 shadow-xs">
          <div>
            <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-accent" /> Módulos de Aprendizaje
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Contenido temático y fases organizadas para esta convocatoria.
            </p>
          </div>

          {puedeGestionarTareas && (
            <div className="flex items-center gap-2">
              <button
                onClick={onAbrirCrearModulo}
                className="px-3.5 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Nuevo Módulo
              </button>
              <button
                onClick={() => onAbrirCrearTarea()}
                className="px-3.5 py-2 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4 text-accent" /> + Tarea General
              </button>
            </div>
          )}
        </div>

        {/* Grid de Cards de Módulos */}
        {modulos.length === 0 ? (
          <div className="bg-paper border border-line rounded-2xl p-8 text-center space-y-3">
            <Layers className="w-10 h-10 text-ink-faint mx-auto" />
            <h4 className="text-base font-serif font-bold text-ink">No hay módulos configurados aún</h4>
            <p className="text-xs text-ink-soft max-w-md mx-auto">
              {puedeGestionarTareas
                ? "Crea módulos temáticos para estructurar las tareas y fases de investigación de manera ordenada estilo Moodle."
                : "El docente aún no ha organizado los contenidos en módulos."}
            </p>
            {puedeGestionarTareas && (
              <button
                onClick={onAbrirCrearModulo}
                className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Crear Primer Módulo
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {modulos.map((mod) => {
              const tareasDelMod = tareas.filter((t) => t.moduloId === mod.id);
              const entregadasDelMod = tareasDelMod.filter((t) => t.miEntrega).length;
              const totalTareas = tareasDelMod.length;
              const pctEstudiante = totalTareas > 0 ? Math.round((entregadasDelMod / totalTareas) * 100) : 0;
              const pctDocente = totalTareas > 0 ? Math.round((tareasDelMod.filter((t) => (t.totalEntregas || 0) > 0).length / totalTareas) * 100) : 0;

              return (
                <div
                  key={mod.id}
                  className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Portada o banner del Módulo */}
                    <div className="w-full h-36 bg-paper-sunken relative overflow-hidden border-b border-line flex items-center justify-center">
                      {mod.imagenUrl ? (
                        <img
                          src={getMediaUrl(mod.imagenUrl)}
                          alt={mod.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-ink-faint">
                          <FolderKanban className="w-10 h-10 text-accent/50" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            Módulo Académico
                          </span>
                        </div>
                      )}
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                        Módulo #{mod.orden}
                      </span>
                    </div>

                    {/* Contenido del Módulo */}
                    <div className="p-5 space-y-2">
                      <h4 className="font-serif text-base font-bold text-ink group-hover:text-accent transition-colors line-clamp-1">
                        {mod.titulo}
                      </h4>
                      {mod.descripcion ? (
                        <p className="text-xs text-ink-soft line-clamp-2 leading-relaxed">
                          {mod.descripcion}
                        </p>
                      ) : (
                        <p className="text-xs text-ink-faint italic">Sin descripción complementaria.</p>
                      )}

                      {/* Indicadores y Barra de Progreso del Módulo */}
                      <div className="pt-2 space-y-1.5 text-xs text-ink-soft">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 font-medium">
                            <FileText className="w-3.5 h-3.5 text-accent" />
                            {totalTareas} {totalTareas === 1 ? "tarea" : "tareas"}
                          </span>
                          {totalTareas > 0 && (
                            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                              {user?.rol === "ESTUDIANTE"
                                ? `${entregadasDelMod}/${totalTareas} entregadas`
                                : `${pctDocente}% activas`}
                            </span>
                          )}
                        </div>
                        {totalTareas > 0 && (
                          <div className="h-1.5 w-full bg-paper-sunken border border-line rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{
                                width: `${user?.rol === "ESTUDIANTE" ? pctEstudiante : pctDocente}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer con acciones */}
                  <div className="p-4 pt-0 border-t border-line-soft mt-3 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedModuloId(mod.id);
                        updateUrlParams({ modulo: mod.id });
                      }}
                      className="px-3.5 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all flex-1 justify-center shadow-xs cursor-pointer"
                    >
                      Entrar al Módulo <ChevronRight className="w-4 h-4" />
                    </button>

                    {puedeGestionarTareas && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onAbrirEditarModulo(mod)}
                          title="Editar Módulo"
                          className="p-2 text-ink-faint hover:text-ink rounded-lg border border-line hover:bg-paper-sunken transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEliminarModulo(mod.id)}
                          title="Eliminar Módulo"
                          className="p-2 text-ink-faint hover:text-red-600 rounded-lg border border-line hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SECCIÓN DE TAREAS GENERALES (FUERA DE MÓDULOS) */}
        <div className="pt-4 border-t border-line space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" /> Tareas Generales y Transversales
              </h4>
              <p className="text-xs text-ink-soft">
                Actividades y entregas no adscritas a un módulo específico.
              </p>
            </div>

            {puedeGestionarTareas && (
              <button
                onClick={() => onAbrirCrearTarea()}
                className="px-3 py-1.5 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-accent" /> Nueva Tarea General
              </button>
            )}
          </div>

          {(() => {
            const tareasGenerales = tareas.filter((t) => !t.moduloId);
            if (tareasGenerales.length === 0) {
              return (
                <div className="p-6 bg-paper-sunken/40 border border-line rounded-xl text-center text-xs text-ink-faint">
                  No hay tareas generales fuera de módulos.
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {tareasGenerales.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onSelectTarea(t);
                      updateUrlParams({ tarea: t.id, modulo: t.moduloId || null });
                    }}
                    className="bg-paper hover:bg-paper-sunken/60 border border-line rounded-xl p-3.5 sm:p-4 transition-all flex items-center justify-between gap-3.5 cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileUp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-ink font-serif group-hover:text-accent transition-colors truncate">
                            {t.titulo}
                          </h4>
                          {t.esGrupal && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                              Grupal
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-ink-soft flex items-center gap-2 flex-wrap">
                          <span>Vence: {formatMoodleDateShort(t.fechaEntrega || t.fechaLimite)}</span>
                          <span>•</span>
                          <span>{t.puntajeMaximo} pts</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {user?.rol === "ESTUDIANTE" ? (
                        t.miEntrega?.estado === "CALIFICADO" ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            ✓ Calificado ({t.miEntrega.calificacion}/{t.puntajeMaximo})
                          </span>
                        ) : t.miEntrega ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            ✓ Enviado
                          </span>
                        ) : !t.habilitada || t.estadoMoodle === "CERRADA_CORTE" ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-paper-sunken text-ink-faint border border-line">
                            No entregado
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                            Pendiente
                          </span>
                        )
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-ink-soft hidden sm:inline">
                            {t.totalEntregas || 0} {t.totalEntregas === 1 ? "entrega" : "entregas"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              t.habilitada
                                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                : "bg-paper-sunken text-ink-faint border border-line"
                            }`}
                          >
                            {t.habilitada ? "Abierta" : "Cerrada"}
                          </span>
                          {puedeGestionarTareas && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAbrirEditarTarea(t);
                              }}
                              title="Editar tarea (plazos, restricciones y detalles)"
                              className="p-1 text-ink-soft hover:text-accent hover:bg-paper-sunken rounded-lg border border-line transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-accent transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // SUBVISTA 1.B: VISTA DETALLADA DEL MÓDULO ENFOCADO
  const moduloActual = modulos.find((m) => m.id === selectedModuloId);
  if (!moduloActual) {
    return (
      <div className="p-8 text-center bg-paper border border-line rounded-2xl">
        <p className="text-xs text-ink-soft">El módulo seleccionado no existe.</p>
        <button
          onClick={() => {
            setSelectedModuloId(null);
            updateUrlParams({ modulo: null });
          }}
          className="mt-3 px-4 py-2 bg-accent text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Volver a Módulos
        </button>
      </div>
    );
  }

  const tareasDelModulo = tareas.filter((t) => t.moduloId === moduloActual.id);

  return (
    <div className="space-y-6">
      {/* Barra de navegación de retorno */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-paper border border-line rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <button
            onClick={() => {
              setSelectedModuloId(null);
              updateUrlParams({ modulo: null });
            }}
            className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-accent font-medium mb-1 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a todos los Módulos
          </button>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent/10 text-accent">
              Módulo #{moduloActual.orden}
            </span>
            <h3 className="font-serif text-lg font-bold text-ink">{moduloActual.titulo}</h3>
          </div>
        </div>

        {puedeGestionarTareas && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAbrirCrearTarea(moduloActual.id)}
              className="px-3.5 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> + Tarea en este Módulo
            </button>
            <button
              onClick={() => onAbrirEditarModulo(moduloActual)}
              className="px-3 py-2 bg-paper hover:bg-paper-sunken border border-line text-ink rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
          </div>
        )}
      </div>

      {/* Banner y descripción del módulo */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
        {moduloActual.imagenUrl && (
          <div className="w-full h-44 sm:h-52 bg-paper-sunken border-b border-line overflow-hidden">
            <img
              src={getMediaUrl(moduloActual.imagenUrl)}
              alt={moduloActual.titulo}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        {moduloActual.descripcion && (
          <div className="p-5 text-xs text-ink-soft leading-relaxed whitespace-pre-line border-b border-line-soft">
            {moduloActual.descripcion}
          </div>
        )}
      </div>

      {/* Actividades de Selección de Grupo asociadas a este Módulo */}
      {actividadesGrupo.filter((a) => a.moduloId === moduloActual.id).length > 0 && (
        <div className="space-y-3">
          {actividadesGrupo
            .filter((a) => a.moduloId === moduloActual.id)
            .map((act) => (
              <div
                key={act.id}
                className="bg-paper border border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-500/5 via-paper to-paper hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                        Actividad de Selección de Grupo
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                          act.abierta
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                        }`}
                      >
                        {act.abierta ? "Abierta" : "Cerrada"}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-ink font-serif">
                      {act.titulo}
                    </h4>
                    <p className="text-[11px] text-ink-soft">
                      {act.grupoSeleccionadoNombre ? (
                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                          ✓ Estás registrado en: <u>{act.grupoSeleccionadoNombre}</u>
                        </span>
                      ) : (
                        <span>Cupos limitados por grupo. Cierra el {formatMoodleDate(act.fechaCierre)}.</span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onSeleccionarActividadGrupo(act)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-2xs justify-center"
                >
                  {act.grupoSeleccionadoNombre ? "Ver / Modificar Elección" : "Seleccionar Grupo"} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Progreso del Estudiante en este Módulo */}
      {user?.rol === "ESTUDIANTE" && tareasDelModulo.length > 0 && (
        <div className="bg-paper border border-line rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold text-ink">
              Progreso en Módulo #{moduloActual.orden}:{" "}
              <strong>
                {tareasDelModulo.filter((t) => !!t.miEntrega).length} de {tareasDelModulo.length} entregadas
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-3 sm:w-48">
            <div className="flex-1 h-2 bg-paper-sunken border border-line rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round(
                    (tareasDelModulo.filter((t) => !!t.miEntrega).length / tareasDelModulo.length) * 100
                  )}%`,
                }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
              {Math.round(
                (tareasDelModulo.filter((t) => !!t.miEntrega).length / tareasDelModulo.length) * 100
              )}
              %
            </span>
          </div>
        </div>
      )}

      {/* Lista de Tareas en este Módulo */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-serif text-base font-bold text-ink flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" /> Tareas de este Módulo ({tareasDelModulo.length})
          </h4>
        </div>

        {tareasDelModulo.length === 0 ? (
          <div className="bg-paper border border-line rounded-2xl p-10 text-center space-y-3">
            <FileText className="w-10 h-10 text-ink-faint mx-auto" />
            <h4 className="text-base font-serif font-bold text-ink">
              No hay tareas registradas en este módulo
            </h4>
            <p className="text-xs text-ink-soft max-w-sm mx-auto">
              {puedeGestionarTareas
                ? "Agrega la primera tarea o entrega académica para este módulo temático."
                : "El docente no ha asignado tareas en este módulo aún."}
            </p>
            {puedeGestionarTareas && (
              <button
                onClick={() => onAbrirCrearTarea(moduloActual.id)}
                className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Crear Tarea en este Módulo
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {tareasDelModulo.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  onSelectTarea(t);
                  updateUrlParams({ tarea: t.id, modulo: t.moduloId || selectedModuloId || null });
                }}
                className="bg-paper hover:bg-paper-sunken/60 border border-line rounded-xl p-3.5 sm:p-4 transition-all flex items-center justify-between gap-3.5 cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileUp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-ink font-serif group-hover:text-accent transition-colors truncate">
                        {t.titulo}
                      </h4>
                      {t.esGrupal && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                          Grupal
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-soft flex items-center gap-2 flex-wrap">
                      <span>Vence: {formatMoodleDateShort(t.fechaEntrega || t.fechaLimite)}</span>
                      <span>•</span>
                      <span>{t.puntajeMaximo} pts</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {user?.rol === "ESTUDIANTE" ? (
                    t.miEntrega?.estado === "CALIFICADO" ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        ✓ Calificado ({t.miEntrega.calificacion}/{t.puntajeMaximo})
                      </span>
                    ) : t.miEntrega ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        ✓ Enviado
                      </span>
                    ) : !t.habilitada || t.estadoMoodle === "CERRADA_CORTE" ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-paper-sunken text-ink-faint border border-line">
                        No entregado
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                        Pendiente
                      </span>
                    )
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-soft hidden sm:inline">
                        {t.totalEntregas || 0} {t.totalEntregas === 1 ? "entrega" : "entregas"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          t.habilitada
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                            : "bg-paper-sunken text-ink-faint border border-line"
                        }`}
                      >
                        {t.habilitada ? "Abierta" : "Cerrada"}
                      </span>
                      {puedeGestionarTareas && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAbrirEditarTarea(t);
                          }}
                          title="Editar tarea (plazos, restricciones y detalles)"
                          className="p-1 text-ink-soft hover:text-accent hover:bg-paper-sunken rounded-lg border border-line transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-accent transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
