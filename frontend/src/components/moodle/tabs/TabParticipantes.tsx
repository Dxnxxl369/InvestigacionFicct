import React from "react";
import {
  Lock,
  Clock,
  Search,
  Filter,
  UserPlus,
  Trash2,
  Tag,
} from "lucide-react";
import {
  User,
  ConvocatoriaDTO,
  ConvocatoriaParticipanteDTO,
} from "@/lib/api";

interface TabParticipantesProps {
  user: User | null;
  convocatoria: ConvocatoriaDTO;
  esEstudianteInscrito: boolean;
  esEstudiantePendiente: boolean;
  esAdmin: boolean;
  puedeDesignarJurado: boolean;
  participantes: ConvocatoriaParticipanteDTO[];
  participantesFiltrados: ConvocatoriaParticipanteDTO[];
  searchParticipante: string;
  setSearchParticipante: (val: string) => void;
  filtroParticipanteRol: string;
  setFiltroParticipanteRol: (val: string) => void;
  conteoDocentes: number;
  conteoJurados: number;
  conteoEstudiantes: number;
  onOpenDesignarModal: (rol: "DOCENTE" | "JURADO") => void;
  onRemoverParticipante: (id: number, nombre: string) => void;
  onAbrirPerfilParticipante: (usuarioId: number) => void;
}

export default function TabParticipantes({
  user,
  convocatoria,
  esEstudianteInscrito,
  esEstudiantePendiente,
  esAdmin,
  puedeDesignarJurado,
  participantes,
  participantesFiltrados,
  searchParticipante,
  setSearchParticipante,
  filtroParticipanteRol,
  setFiltroParticipanteRol,
  conteoDocentes,
  conteoJurados,
  conteoEstudiantes,
  onOpenDesignarModal,
  onRemoverParticipante,
  onAbrirPerfilParticipante,
}: TabParticipantesProps) {
  if (user?.rol === "ESTUDIANTE" && !esEstudianteInscrito && convocatoria.estado !== "FINALIZADA") {
    return (
      <div className="bg-paper border border-line rounded-2xl p-12 text-center space-y-3 shadow-xs">
        <Lock className="w-10 h-10 text-ink-faint mx-auto" />
        <h3 className="text-base font-serif font-bold text-ink">
          Directorio de participantes reservado
        </h3>
        <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
          El directorio de estudiantes, equipos y participantes de esta área solo es visible para estudiantes formalmente admitidos, y se publicará de manera general una vez culminada la actividad.
        </p>
        {esEstudiantePendiente && (
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              <Clock className="w-3.5 h-3.5" /> Tu postulación está en revisión por el docente encargado
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* BANDEJA DE SOLICITUDES DE ADMISIÓN (Solo para Docentes y Admin) */}
      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-paper border border-line rounded-2xl p-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o equipo..."
            value={searchParticipante}
            onChange={(e) => setSearchParticipante(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-paper-sunken border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-ink-faint" />
          <select
            value={filtroParticipanteRol}
            onChange={(e) => setFiltroParticipanteRol(e.target.value)}
            className="bg-paper-sunken border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-accent"
          >
            <option value="TODOS">Todos los roles ({participantes.length})</option>
            <option value="DOCENTE">Docentes ({conteoDocentes})</option>
            <option value="JURADO">Jurados ({conteoJurados})</option>
            <option value="ESTUDIANTE">Estudiantes ({conteoEstudiantes})</option>
          </select>

          {puedeDesignarJurado && (
            <button
              onClick={() => onOpenDesignarModal(esAdmin ? "DOCENTE" : "JURADO")}
              className="ml-auto sm:ml-2 px-3 py-2 bg-accent text-white rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" /> Designar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Participantes estilo Moodle */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-paper-sunken/80 border-b border-line text-ink-faint font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Participante</th>
                <th className="py-3 px-4">Correo electrónico</th>
                <th className="py-3 px-4 text-center">Rol en el Área</th>
                <th className="py-3 px-4">Equipo / Grupo</th>
                <th className="py-3 px-4">Fecha Asignación</th>
                {esAdmin && convocatoria.tipo !== "FERIA" && <th className="py-3 px-4 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {participantesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={esAdmin && convocatoria.tipo !== "FERIA" ? 6 : 5} className="py-8 text-center text-ink-soft">
                    No se encontraron participantes con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                participantesFiltrados.map((p) => (
                  <tr key={`${p.id}-${p.nombreEquipo || "sin-equipo"}`} className="hover:bg-paper-sunken/30 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => onAbrirPerfilParticipante(p.usuarioId)}
                        className="flex items-center gap-3 text-left group hover:opacity-85 transition-opacity cursor-pointer"
                        title="Ver ficha académica y cursos del participante"
                      >
                        <div className="w-8 h-8 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-xs group-hover:bg-accent group-hover:text-white transition-colors">
                          {p.nombre.charAt(0)}
                          {p.apellidos?.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-ink block group-hover:text-accent transition-colors underline-offset-2 hover:underline">
                            {p.nombre} {p.apellidos}
                          </span>
                          {p.asignadoPorNombre && (
                            <span className="text-[10px] text-ink-faint block">
                              Por: {p.asignadoPorNombre}
                            </span>
                          )}
                        </div>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-ink-soft">{p.email}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                          p.rol === "DOCENTE"
                            ? "bg-blue-500/10 text-blue-700"
                            : p.rol === "JURADO"
                            ? "bg-purple-500/10 text-purple-700"
                            : "bg-emerald-500/10 text-emerald-700"
                        }`}
                      >
                        {p.rol}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {p.nombreEquipo ? (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {(p.gruposNombres && p.gruposNombres.length > 0
                            ? p.gruposNombres
                            : p.nombreEquipo.split(",").map((s) => s.trim())
                          ).map((grp, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 text-accent font-medium text-xs border border-accent/20"
                            >
                              <Tag className="w-3 h-3 text-accent shrink-0" /> {grp}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-ink-faint italic text-sm">{convocatoria.tipo === "FERIA" ? "Sin equipo asignado" : "Individual"}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-ink-soft">
                      {p.fechaAsignacion ? new Date(p.fechaAsignacion).toLocaleDateString() : "-"}
                    </td>
                    {esAdmin && convocatoria.tipo !== "FERIA" && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onRemoverParticipante(p.id, `${p.nombre} ${p.apellidos}`)}
                          title="Remover de esta área"
                          className="p-1.5 text-ink-faint hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
