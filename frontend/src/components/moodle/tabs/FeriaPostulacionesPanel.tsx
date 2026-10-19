"use client";

import React, { useEffect, useState } from "react";
import { Eye, RefreshCw, X } from "lucide-react";
import { api, FeriaPostulacionDTO } from "@/lib/api";

interface Props {
  convocatoriaId: number;
  postulaciones: FeriaPostulacionDTO[];
  modoSolicitud?: boolean;
  puedeGestionar: boolean;
  correoActual?: string;
  esFeria?: boolean;
  toast: (text: string, type?: "success" | "error" | "info") => void;
  onRefresh: () => Promise<void>;
}

export default function FeriaPostulacionesPanel({
  convocatoriaId, postulaciones, modoSolicitud = false, puedeGestionar, correoActual, esFeria = true, toast, onRefresh,
}: Props) {
  const [seleccionadaId, setSeleccionadaId] = useState<number | null>(null);
  const [editando, setEditando] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [procesando, setProcesando] = useState(false);
  const seleccionada = postulaciones.find((p) => p.id === seleccionadaId);

  useEffect(() => {
    if (seleccionadaId === null) return;
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSeleccionadaId(null);
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [seleccionadaId]);

  const abrir = (postulacion: FeriaPostulacionDTO) => {
    setSeleccionadaId(postulacion.id);
    setEditando(false);
    setCodigo(postulacion.codigoEquipo || "");
  };

  const guardarCodigo = async () => {
    if (!seleccionada || !codigo.trim()) return;
    setProcesando(true);
    try {
      await api.cambiarCodigoEquipoFeria(convocatoriaId, seleccionada.id, codigo.trim());
      await onRefresh();
      setEditando(false);
      toast("Código del equipo actualizado.", "success");
    } catch (error: any) {
      toast(error.message || "No se pudo actualizar el código.", "error");
    } finally {
      setProcesando(false);
    }
  };

  const responder = async (admitir: boolean) => {
    if (!seleccionada) return;
    setProcesando(true);
    try {
      await api.responderPostulacionFeria(convocatoriaId, seleccionada.id, admitir);
      await onRefresh();
      toast(admitir ? "Equipo admitido." : "Equipo rechazado.", "success");
    } catch (error: any) {
      toast(error.message || "No se pudo revisar el equipo.", "error");
    } finally {
      setProcesando(false);
    }
  };

  const detalle = (etiqueta: string, valor: string) => (
    <div className="space-y-0.5" key={etiqueta}>
      <dt className="text-xs text-ink-faint">{etiqueta}</dt>
      <dd className="text-sm text-ink">{valor || "—"}</dd>
    </div>
  );

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-paper p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-base font-bold text-ink">{modoSolicitud ? "Solicitudes de equipos" : esFeria ? "Equipos de Feria" : "Equipos de la convocatoria"}</h3>
          <p className="text-xs text-ink-soft">{postulaciones.length} {modoSolicitud ? "solicitud(es)" : "equipo(s)"}</p>
        </div>
        <button type="button" onClick={() => onRefresh().catch((error) => toast(error.message || "No se pudieron actualizar los equipos.", "error"))}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </button>
      </div>

      {postulaciones.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
          {modoSolicitud ? "No hay solicitudes de equipos por revisar." : "Aún no hay equipos aceptados."}
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {postulaciones.map((p) => (
            <article key={p.id} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-paper-raised p-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="rounded-lg bg-accent-soft px-2 py-1 text-xs text-accent-dark">{p.codigoEquipo || "Por asignar"}</strong>
                  <span className={`text-[11px] font-semibold ${p.estado === "ACEPTADO" ? "text-emerald-700" : p.estado === "RECHAZADO" ? "text-red-600" : "text-amber-600"}`}>
                    {p.estado}
                  </span>
                </div>
                <h4 className="truncate text-sm font-bold text-ink" title={p.tema}>{p.tema}</h4>
                <p className="text-xs text-ink-soft">{p.integrantes.length} integrantes{esFeria && p.area ? ` · ${p.area}` : ""}</p>
              </div>
              <button type="button" onClick={() => abrir(p)} aria-label={`Ver detalles del equipo ${p.codigoEquipo}`}
                title="Ver detalles del equipo"
                className="shrink-0 rounded-lg border border-line p-2 text-accent hover:bg-accent-soft">
                <Eye className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
      )}

      {seleccionada && (
        <div role="dialog" aria-modal="true" aria-labelledby="feria-equipo-titulo"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 sm:p-6"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setSeleccionadaId(null); }}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-line bg-paper-raised p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="rounded-lg bg-accent-soft px-2 py-1 text-xs text-accent-dark">{seleccionada.codigoEquipo || "Por asignar"}</strong>
                  <span className="text-xs font-semibold text-ink-soft">{seleccionada.estado}</span>
                </div>
                <h3 id="feria-equipo-titulo" className="font-serif text-lg font-bold text-ink">
                  {esFeria ? `Proyecto #${seleccionada.id}` : "Equipo"}: {seleccionada.tema}
                </h3>
              </div>
              <button type="button" onClick={() => setSeleccionadaId(null)} aria-label="Cerrar detalles del equipo"
                className="rounded-lg p-1 text-ink-soft hover:bg-paper-sunken"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-5 pt-4">
              {puedeGestionar && (
                <div className="flex flex-wrap items-center gap-2">
                  {editando ? (
                    <>
                      <input aria-label="Nuevo código de equipo" value={codigo} onChange={(event) => setCodigo(event.target.value)}
                        maxLength={30} className="w-36 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" />
                      <button type="button" onClick={guardarCodigo} disabled={procesando || !codigo.trim()}
                        className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Guardar código</button>
                      <button type="button" onClick={() => setEditando(false)} className="text-xs text-ink-soft">Cancelar</button>
                    </>
                  ) : seleccionada.estado === "ACEPTADO" ? (
                    <button type="button" onClick={() => { setCodigo(seleccionada.codigoEquipo || ""); setEditando(true); }}
                      className="text-xs font-semibold text-accent">Cambiar código de equipo</button>
                  ) : null}
                  {seleccionada.estado === "PENDIENTE" && (
                    <div className="flex gap-2 sm:ml-auto">
                      <button type="button" disabled={procesando} onClick={() => responder(true)}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Admitir equipo</button>
                      <button type="button" disabled={procesando} onClick={() => responder(false)}
                        className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50">Rechazar equipo</button>
                    </div>
                  )}
                </div>
              )}

              {esFeria && <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {detalle("Área", seleccionada.area)}
                {detalle("Categoría", seleccionada.categoria)}
                {detalle("Materia", seleccionada.materia)}
                {detalle("Sigla", seleccionada.sigla)}
                {detalle("Grupo de materia", seleccionada.grupoMateria)}
                {detalle("Docente", seleccionada.docente)}
              </dl>}

              <div>
                <h4 className="mb-2 text-sm font-bold text-ink">Integrantes ({seleccionada.integrantes.length})</h4>
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[720px] text-left text-xs">
                    <thead className="bg-paper-sunken text-ink-soft"><tr>
                      <th className="p-2">Rol</th><th className="p-2">Registro</th><th className="p-2">Nombre</th>
                      {esFeria && <th className="p-2">Carrera</th>}<th className="p-2">Celular</th>
                      {esFeria && <><th className="p-2">Sem.</th><th className="p-2">Ferias</th></>}<th className="p-2">Correo</th>
                    </tr></thead>
                    <tbody>{seleccionada.integrantes.map((i) => (
                      <tr key={i.correo} className={`border-t border-line-soft ${i.correo.toLowerCase() === correoActual?.toLowerCase() ? "bg-accent-soft/50" : ""}`}>
                        <td className="p-2 font-semibold">{i.correo.toLowerCase() === seleccionada.jefeCorreo.toLowerCase() ? "Jefe" : "Integrante"}</td>
                        <td className="p-2">{i.registro}</td><td className="p-2">{i.nombre}</td>{esFeria && <td className="p-2">{i.carrera}</td>}
                        <td className="p-2">{i.celular}</td>{esFeria && <><td className="p-2">{i.semestre}</td><td className="p-2">{i.ferias}</td></>}<td className="p-2">{i.correo}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
