"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Award, Pencil, Save, Trash2, UserPlus } from "lucide-react";
import { api, JuradoAsignacionDTO, JuradosConvocatoriaDTO, User } from "@/lib/api";
import EditorFormularioJurado from "./EditorFormularioJurado";

type Alcance = "NINGUNO" | "TODOS" | "SELECCION";

export default function TabJurados({ convocatoriaId, allUsers, onRefresh, toast }: {
  convocatoriaId: number;
  allUsers: User[];
  onRefresh: () => Promise<void>;
  toast: (text: string, type?: "success" | "error" | "info") => void;
}) {
  const [datos, setDatos] = useState<JuradosConvocatoriaDTO | null>(null);
  const [seleccion, setSeleccion] = useState<Record<number, { alcance: Alcance; ids: number[] }>>({});
  const [usuarioId, setUsuarioId] = useState("");
  const [guardando, setGuardando] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [editarFormulario, setEditarFormulario] = useState(false);
  const [nuevoJurado, setNuevoJurado] = useState({ nombre: "", apellido: "", correo: "", contrasena: "" });

  const cargar = async () => {
    try {
      setCargando(true);
      const resultado = await api.getJurados(convocatoriaId);
      setDatos(resultado);
      setSeleccion(Object.fromEntries(resultado.jurados.map(j => [j.participanteId, {
        alcance: j.todos ? "TODOS" : j.proyectoIds.length ? "SELECCION" : "NINGUNO",
        ids: j.proyectoIds,
      }])));
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "No se pudieron cargar los jurados", "error");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { void cargar(); }, [convocatoriaId]);

  const agregar = async () => {
    if (!usuarioId) return;
    try {
      setGuardando(0);
      await api.designarParticipante(convocatoriaId, { usuarioId: Number(usuarioId), rol: "JURADO" });
      setUsuarioId("");
      await Promise.all([cargar(), onRefresh()]);
      toast("Jurado designado. Inicialmente no tiene proyectos asignados.");
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "No se pudo designar el jurado", "error");
    } finally { setGuardando(null); }
  };

  const crearYAnadir = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setGuardando(0);
      await api.crearYAnadirJurado(convocatoriaId, {
        nombre: nuevoJurado.nombre.trim(),
        apellido: nuevoJurado.apellido.trim(),
        correo: nuevoJurado.correo.trim().toLowerCase(),
        contrasena: nuevoJurado.contrasena,
      });
      setNuevoJurado({ nombre: "", apellido: "", correo: "", contrasena: "" });
      setMostrarCrear(false);
      await Promise.all([cargar(), onRefresh()]);
      toast("Jurado creado y añadido a la convocatoria. Inicialmente no tiene proyectos asignados.");
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "No se pudo crear el jurado", "error");
    } finally { setGuardando(null); }
  };

  const guardar = async (jurado: JuradoAsignacionDTO) => {
    const valor = seleccion[jurado.participanteId];
    if (!valor) return;
    try {
      setGuardando(jurado.participanteId);
      const actualizado = await api.guardarAsignacionJurado(convocatoriaId, jurado.participanteId, {
        todos: valor.alcance === "TODOS",
        proyectoIds: valor.alcance === "SELECCION" ? valor.ids : [],
      });
      setDatos(actualizado);
      toast("Asignación del jurado guardada.");
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "No se pudo guardar la asignación", "error");
    } finally { setGuardando(null); }
  };

  const quitar = async (jurado: JuradoAsignacionDTO) => {
    if (!confirm(`¿Quitar a ${jurado.nombre} como jurado de esta convocatoria?`)) return;
    try {
      setGuardando(jurado.participanteId);
      await api.removerParticipante(convocatoriaId, jurado.participanteId);
      await Promise.all([cargar(), onRefresh()]);
      toast("Jurado retirado de la convocatoria.");
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "No se pudo retirar al jurado", "error");
    } finally { setGuardando(null); }
  };

  const disponibles = allUsers.filter(u => u.rol === "JURADO"
    && !datos?.jurados.some(j => j.usuarioId === u.id));

  return <div className="space-y-4">
    <div className="bg-paper border border-line rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-ink font-semibold"><Award className="w-5 h-5 text-accent" /> Jurados de la convocatoria</div><button type="button" onClick={() => setEditarFormulario(true)} className="flex items-center gap-2 rounded-xl border border-accent px-3 py-2 text-sm font-semibold text-accent"><Pencil size={15} /> Editar formulario de evaluación</button></div>
      <p className="text-xs text-ink-soft">Cada jurado comienza sin proyectos. Puedes asignarle algunos o todos; «Todos» incluye también los proyectos que se admitan después.</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <select aria-label="Seleccionar jurado" value={usuarioId} onChange={e => setUsuarioId(e.target.value)}
          className="flex-1 bg-paper-sunken border border-line rounded-xl px-3 py-2 text-sm text-ink">
          <option value="">Seleccionar jurado registrado...</option>
          {disponibles.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido} ({u.email})</option>)}
        </select>
        <button type="button" disabled={!usuarioId || guardando !== null} onClick={agregar}
          className="bg-accent text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 flex items-center gap-2 justify-center">
          <UserPlus className="w-4 h-4" /> Añadir jurado
        </button>
      </div>
      <button type="button" onClick={() => setMostrarCrear(valor => !valor)} disabled={guardando !== null}
        className="border border-accent text-accent rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2">
        <UserPlus className="w-4 h-4" /> Crear y añadir jurado
      </button>
      {mostrarCrear && <form onSubmit={crearYAnadir} className="border border-line rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(["nombre", "apellido", "correo", "contrasena"] as const).map(campo => <label key={campo} className="text-sm text-ink space-y-1">
          <span>{campo === "contrasena" ? "Contraseña" : campo.charAt(0).toUpperCase() + campo.slice(1)}</span>
          <input required minLength={campo === "contrasena" ? 8 : campo === "correo" ? undefined : 2}
            type={campo === "correo" ? "email" : campo === "contrasena" ? "password" : "text"}
            autoComplete={campo === "correo" ? "email" : campo === "contrasena" ? "new-password" : "off"}
            value={nuevoJurado[campo]}
            onChange={e => setNuevoJurado(prev => ({ ...prev, [campo]: e.target.value }))}
            className="w-full bg-paper-sunken border border-line rounded-xl px-3 py-2 text-ink" />
        </label>)}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" onClick={() => { setMostrarCrear(false); setNuevoJurado({ nombre: "", apellido: "", correo: "", contrasena: "" }); }}
            className="border border-line text-ink rounded-xl px-4 py-2 text-sm">Cancelar</button>
          <button type="submit" disabled={guardando !== null}
            className="bg-accent text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">Crear y añadir jurado</button>
        </div>
      </form>}
    </div>

    {cargando && <p className="text-sm text-ink-soft">Cargando jurados...</p>}
    {!cargando && datos?.jurados.length === 0 && <div className="bg-paper border border-line rounded-2xl p-8 text-center text-ink-soft">Aún no hay jurados designados.</div>}
    {datos?.jurados.map(j => {
      const valor = seleccion[j.participanteId] || { alcance: "NINGUNO" as Alcance, ids: [] as number[] };
      return <div key={j.participanteId} className="bg-paper border border-line rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="font-semibold text-ink">{j.nombre}</h3><p className="text-xs text-ink-soft">{j.correo}</p></div>
          <button type="button" onClick={() => quitar(j)} disabled={guardando !== null}
            className="text-rose-600 dark:text-rose-300 text-xs flex items-center gap-1 disabled:opacity-50"><Trash2 className="w-4 h-4" /> Quitar jurado</button>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-ink">
          {(["NINGUNO", "TODOS", "SELECCION"] as Alcance[]).map(opcion =>
            <label key={opcion} className="inline-flex items-center gap-2 cursor-pointer">
              <input type="radio" name={`alcance-${j.participanteId}`} checked={valor.alcance === opcion}
                onChange={() => setSeleccion(prev => ({ ...prev, [j.participanteId]: { ...valor, alcance: opcion } }))} />
              {opcion === "NINGUNO" ? "Ninguno" : opcion === "TODOS" ? "Todos los proyectos" : "Proyectos específicos"}
            </label>)}
        </div>
        {valor.alcance === "SELECCION" && <div className="border border-line rounded-xl p-3 max-h-64 overflow-y-auto space-y-2">
          {!datos.proyectos.length && <p className="text-xs text-ink-soft">Aún no hay proyectos o grupos disponibles.</p>}
          {datos.proyectos.map(p => <label key={p.id} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={valor.ids.includes(p.id)} onChange={e => setSeleccion(prev => ({ ...prev,
              [j.participanteId]: { ...valor, ids: e.target.checked ? [...valor.ids, p.id] : valor.ids.filter(id => id !== p.id) } }))} />
            <span className="font-semibold">{p.codigo || `#${p.id}`}</span><span className="text-ink-soft">{p.nombre}</span>
          </label>)}
        </div>}
        <div className="flex justify-end"><button type="button" onClick={() => guardar(j)} disabled={guardando !== null}
          className="bg-accent text-white rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50 flex items-center gap-2">
          <Save className="w-4 h-4" /> Guardar asignación</button></div>
      </div>;
    })}
    {editarFormulario && <EditorFormularioJurado convocatoriaId={convocatoriaId} onClose={() => setEditarFormulario(false)} toast={toast} />}
  </div>;
}
