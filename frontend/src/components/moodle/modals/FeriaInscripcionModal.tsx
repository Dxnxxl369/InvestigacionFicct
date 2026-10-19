"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { api, ConvocatoriaDTO, FeriaIntegranteRequest, FeriaProyectoRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  convocatoria: ConvocatoriaDTO;
  onSuccess: () => void;
  toast: (text: string, type?: "success" | "error" | "info") => void;
}

const proyectoVacio = (): FeriaProyectoRequest => ({
  tema: "", area: "", categoria: "", materia: "", sigla: "",
  grupoMateria: "", docente: "", integrantes: [],
});

const integranteVacio = (nombre = "", correo = "", registro = "", celular = ""): FeriaIntegranteRequest => ({
  registro, nombre, carrera: "", celular, semestre: 0, ferias: 0, correo,
});

export default function FeriaInscripcionModal({ isOpen, onClose, convocatoria, onSuccess, toast }: Props) {
  const { user } = useAuth();
  const [paso, setPaso] = useState<1 | 2>(1);
  const [proyecto, setProyecto] = useState<FeriaProyectoRequest>(proyectoVacio);
  const [integrantes, setIntegrantes] = useState<FeriaIntegranteRequest[]>([]);
  const [busquedas, setBusquedas] = useState<Record<number, "existente" | "nuevo" | "crear" | "buscando">>({});
  const [enviando, setEnviando] = useState(false);
  const esFeria = convocatoria.tipo === "FERIA";
  const maximo = convocatoria.maxIntegrantesFeria ?? Number(convocatoria.tamanoEquipo?.match(/\d+/g)?.at(-1) || 5);
  const minimo = Number(convocatoria.tamanoEquipo?.match(/^\s*(\d+)\s+a\s+\d+/i)?.[1] || 2);

  useEffect(() => {
    if (!isOpen || !user) return;
    const correo = user.email.toLowerCase();
    setIntegrantes([integranteVacio(`${user.nombre} ${user.apellido}`.trim(), correo,
      user.registroUniversitario || "", user.celular || "")]);
    setBusquedas({ 0: "existente" });
    setPaso(1);
    setProyecto(proyectoVacio());
  }, [isOpen, convocatoria.id, user]);

  if (!isOpen) return null;

  const actualizarIntegrante = (indice: number, campo: keyof FeriaIntegranteRequest, valor: string | number) => {
    setIntegrantes((actual) => actual.map((i, n) => n === indice ? { ...i, [campo]: valor } : i));
    if (campo === "correo") {
      setBusquedas((actual) => { const siguiente = { ...actual }; delete siguiente[indice]; return siguiente; });
      setIntegrantes((actual) => actual.map((i, n) => n === indice ? { ...i, crearCuenta: false } : i));
    }
  };

  const buscarCorreo = async (indice: number) => {
    const correo = integrantes[indice].correo.trim().toLowerCase();
    if (!/^[A-Za-z0-9._%+-]+@(uagrm\.edu\.bo|gmail\.com)$/.test(correo)) { toast("Usa un correo @uagrm.edu.bo o @gmail.com.", "error"); return; }
    setBusquedas((actual) => ({ ...actual, [indice]: "buscando" }));
    try {
      const resultado = await api.buscarIntegranteFeria(convocatoria.id, correo);
      setBusquedas((actual) => ({ ...actual, [indice]: resultado.existe ? "existente" : "nuevo" }));
      if (resultado.existe) {
        setIntegrantes((actual) => actual.map((i, n) => n === indice ? {
          ...i, correo, nombre: resultado.nombre || "", registro: resultado.registro || "",
          celular: resultado.celular || "", crearCuenta: false,
        } : i));
      }
    } catch (error: any) {
      setBusquedas((actual) => { const siguiente = { ...actual }; delete siguiente[indice]; return siguiente; });
      toast(error.message || "No se pudo buscar el correo.", "error");
    }
  };

  const validarProyecto = () => {
    const campos = esFeria ? [proyecto.tema, proyecto.area, proyecto.categoria, proyecto.materia,
      proyecto.sigla, proyecto.grupoMateria, proyecto.docente] : [proyecto.tema];
    if (campos.some((c) => !c.trim())) {
      toast("Completa todos los datos del proyecto.", "error");
      return false;
    }
    return true;
  };

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validarProyecto()) { setPaso(1); return; }
    if (integrantes.length < minimo || integrantes.length > maximo) {
      toast(`Registra entre ${minimo} y ${maximo} integrantes.`, "error"); return;
    }
    if (integrantes.some((_, indice) => busquedas[indice] !== "existente" && busquedas[indice] !== "crear")) {
      toast("Busca el correo de cada integrante y confirma si se debe crear su cuenta.", "error"); return;
    }
    if (integrantes.some((i) => !i.nombre.trim() || (esFeria && !i.carrera.trim()) ||
      !i.celular.trim() || !i.correo.trim() || i.semestre < 0 || i.ferias < 0)) {
      toast("Completa todos los datos de cada integrante.", "error"); return;
    }
    const correos = integrantes.map((i) => i.correo.trim().toLowerCase());
    const registros = integrantes.map((i) => i.registro.trim());
    const registrosInformados = registros.filter(Boolean);
    if (new Set(correos).size !== correos.length || new Set(registrosInformados).size !== registrosInformados.length) {
      toast("No repitas correos ni registros en el equipo.", "error"); return;
    }
    if (!correos.includes(user?.email.toLowerCase() || "")) {
      toast("Inclúyete como integrante con el mismo correo de tu cuenta.", "error"); return;
    }
    setEnviando(true);
    try {
      await api.inscribirseConvocatoria(convocatoria.id, {
        feriaProyecto: {
          ...proyecto,
          integrantes: integrantes.map((i) => ({ ...i, correo: i.correo.trim().toLowerCase() })),
        },
      });
      toast("Inscripción del equipo enviada para revisión.", "success");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast(error.message || "No se pudo enviar la postulación.", "error");
    } finally {
      setEnviando(false);
    }
  };

  const campoProyecto = (clave: keyof Omit<FeriaProyectoRequest, "integrantes">, etiqueta: string) => (
    <label className="block text-xs font-semibold text-ink-soft" key={clave}>
      {etiqueta} *
      <input required value={proyecto[clave]} onChange={(e) => setProyecto((p) => ({ ...p, [clave]: e.target.value }))}
        className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-paper-raised p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-ink">Inscripción grupal</h2>
            <p className="text-xs text-ink-soft">{convocatoria.titulo} · De {minimo} a {maximo} integrantes</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={enviar} className="space-y-5 pt-4">
          <div className="flex gap-2 text-xs font-semibold">
            <button type="button" onClick={() => setPaso(1)} className={`rounded-lg px-3 py-2 ${paso === 1 ? "bg-accent text-white" : "bg-paper-sunken text-ink-soft"}`}>1. {esFeria ? "Proyecto" : "Equipo"}</button>
            <button type="button" onClick={() => { if (validarProyecto()) setPaso(2); }} className={`rounded-lg px-3 py-2 ${paso === 2 ? "bg-accent text-white" : "bg-paper-sunken text-ink-soft"}`}>2. Integrantes</button>
          </div>

          {paso === 1 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{campoProyecto("tema", esFeria ? "Tema del proyecto" : "Nombre del proyecto o equipo")}</div>
              {esFeria && <>{campoProyecto("area", "Área")}
              {campoProyecto("categoria", "Categoría")}
              {campoProyecto("materia", "Materia")}
              {campoProyecto("sigla", "Sigla")}
              {campoProyecto("grupoMateria", "Grupo de la materia")}
              {campoProyecto("docente", "Docente")}</>}
              <p className="sm:col-span-2 text-xs text-ink-soft">El código del equipo se asignará al aprobar la inscripción.</p>
              <div className="sm:col-span-2 flex justify-end">
                <button type="button" onClick={() => { if (validarProyecto()) setPaso(2); }} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Continuar con integrantes</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-ink-soft">Incluye al responsable (jefe). Busca primero el correo de cada integrante. Si existe, se usará el nombre de su cuenta; si no, podrás crearla con una contraseña temporal: primera letra del nombre + punto + registro, o + .000000 sin registro.</p>
              {integrantes.map((integrante, indice) => (
                <div key={indice} className="rounded-xl border border-line bg-paper p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-ink">Integrante {indice + 1}{integrante.correo.toLowerCase() === user?.email.toLowerCase() ? " · Jefe" : ""}</h3>
                    {integrantes.length > 1 && <button type="button" onClick={() => {
                      setIntegrantes((a) => a.filter((_, n) => n !== indice));
                      setBusquedas((a) => Object.fromEntries(Object.entries(a)
                        .filter(([key]) => Number(key) !== indice)
                        .map(([key, value]) => [Number(key) > indice ? Number(key) - 1 : Number(key), value])));
                    }} aria-label="Quitar integrante" className="text-danger"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                  <div className="mb-3 flex flex-wrap items-end gap-2">
                    <label className="min-w-56 flex-1 text-xs font-semibold text-ink-soft">Correo electrónico *
                      <input required type="email" value={integrante.correo} onChange={(e) => actualizarIntegrante(indice, "correo", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm text-ink" />
                    </label>
                    <button type="button" onClick={() => buscarCorreo(indice)} disabled={busquedas[indice] === "buscando"}
                      className="rounded-lg border border-accent px-3 py-2 text-xs font-semibold text-accent disabled:opacity-50">{busquedas[indice] === "buscando" ? "Buscando..." : "Buscar"}</button>
                  </div>
                  {busquedas[indice] === "nuevo" && (
                    <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-ink">
                      No existe una cuenta con este correo. <button type="button" onClick={() => {
                        setBusquedas((actual) => ({ ...actual, [indice]: "crear" }));
                        setIntegrantes((actual) => actual.map((i, n) => n === indice ? { ...i, crearCuenta: true } : i));
                      }} className="font-bold text-accent underline">Crear cuenta temporal</button>
                    </div>
                  )}
                  {busquedas[indice] === "existente" && <p className="mb-3 text-xs text-emerald-700">Cuenta encontrada. Se utilizará el nombre registrado.</p>}
                  {busquedas[indice] === "crear" && <p className="mb-3 text-xs text-amber-700">Se creará una cuenta temporal al enviar la postulación.</p>}
                  {(busquedas[indice] === "existente" || busquedas[indice] === "crear") && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {([ ["registro", "Registro universitario (opcional)"], ["nombre", "Nombre completo"], ...(esFeria ? [["carrera", "Carrera"]] : []), ["celular", "Celular"] ] as Array<["registro" | "nombre" | "carrera" | "celular", string]>).map(([campo, etiqueta]) => (
                      <label key={campo} className="text-xs font-semibold text-ink-soft">{etiqueta}{campo !== "registro" ? " *" : ""}
                        <input required={campo !== "registro"} readOnly={campo === "nombre" && busquedas[indice] === "existente"} type="text" value={integrante[campo]}
                          onChange={(e) => actualizarIntegrante(indice, campo, e.target.value)}
                          className="mt-1 w-full rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm text-ink" />
                      </label>
                    ))}
                    {esFeria && <><label className="text-xs font-semibold text-ink-soft">Semestre *
                      <input required type="number" min={0} value={integrante.semestre} onChange={(e) => actualizarIntegrante(indice, "semestre", Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm text-ink" />
                    </label>
                    <label className="text-xs font-semibold text-ink-soft">Ferias anteriores *
                      <input required type="number" min={0} value={integrante.ferias} onChange={(e) => actualizarIntegrante(indice, "ferias", Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm text-ink" />
                    </label>
                    </>}
                  </div>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" disabled={integrantes.length >= maximo} onClick={() => setIntegrantes((a) => [...a, integranteVacio()])}
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-xs font-semibold disabled:opacity-50"><Plus className="h-4 w-4" /> Agregar integrante ({integrantes.length}/{maximo})</button>
                <button type="submit" disabled={enviando} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {enviando ? "Enviando..." : "Enviar postulación del equipo"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
