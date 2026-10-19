import React, { useEffect, useState } from "react";
import { MessageCircle, RefreshCw, Users, UserRound } from "lucide-react";
import { api, ConvocatoriaDTO, PendienteTareaDTO, TareaDTO } from "@/lib/api";

interface Props {
  convocatoria: ConvocatoriaDTO;
  tareas: TareaDTO[];
}

function numeroWhatsApp(celular?: string): string | null {
  const digitos = (celular || "").replace(/\D/g, "");
  if (digitos.length === 8) return `591${digitos}`;
  return digitos.length >= 10 && digitos.length <= 15 ? digitos : null;
}

function mensajeRecordatorio(pendiente: PendienteTareaDTO, tarea: TareaDTO, convocatoria: ConvocatoriaDTO): string {
  if (pendiente.tipo === "GRUPO") {
    const identificacion = [pendiente.codigoGrupo, pendiente.proyecto ? `(${pendiente.proyecto})` : ""]
      .filter(Boolean).join(" ");
    return `Hola ${pendiente.destinatario}, le recordamos que su grupo ${identificacion} tiene pendiente presentar "${tarea.titulo}" de la convocatoria "${convocatoria.titulo}". Por favor realicen la entrega.`;
  }
  return `Hola ${pendiente.destinatario}, le recordamos que tiene pendiente presentar "${tarea.titulo}" de la convocatoria "${convocatoria.titulo}". Por favor realice la entrega.`;
}

export default function TabSeguimiento({ convocatoria, tareas }: Props) {
  const [tareaId, setTareaId] = useState<number | null>(null);
  const [pendientes, setPendientes] = useState<PendienteTareaDTO[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tarea = tareas.find((item) => item.id === tareaId);

  useEffect(() => {
    if (tareaId === null) {
      setPendientes([]);
      setError(null);
      return;
    }
    let activo = true;
    setCargando(true);
    setPendientes([]);
    setError(null);
    api.getPendientes(tareaId)
      .then((lista) => { if (activo) setPendientes(lista); })
      .catch((err) => { if (activo) setError(err.message || "No se pudieron cargar los pendientes."); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [tareaId]);

  const actualizar = async () => {
    if (tareaId === null) return;
    setCargando(true);
    setError(null);
    try {
      setPendientes(await api.getPendientes(tareaId));
    } catch (err: any) {
      setError(err.message || "No se pudieron cargar los pendientes.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <section className="space-y-5 rounded-2xl border border-line bg-paper p-5 sm:p-6">
      <div>
        <h2 className="font-serif text-lg font-bold text-ink">Seguimiento de entregas</h2>
        <p className="mt-1 text-sm text-ink-soft">Seleccione una actividad para ver quiénes aún no la presentaron.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 space-y-1 text-xs font-semibold text-ink" htmlFor="actividad-seguimiento">
          <span>Actividad</span>
          <select id="actividad-seguimiento" value={tareaId ?? ""}
            onChange={(event) => setTareaId(event.target.value ? Number(event.target.value) : null)}
            className="block w-full rounded-xl border border-line bg-paper-raised px-3 py-2.5 text-sm font-normal text-ink">
            <option value="">Seleccione una actividad</option>
            {tareas.map((item) => (
              <option key={item.id} value={item.id}>{item.moduloTitulo ? `${item.moduloTitulo} · ` : ""}{item.titulo}</option>
            ))}
          </select>
        </label>
        {tarea && (
          <button type="button" onClick={actualizar} disabled={cargando}
            className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm font-semibold text-accent disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} /> Actualizar
          </button>
        )}
      </div>

      {tarea && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-ink">
            {cargando ? "Buscando pendientes..." : `${pendientes.length} ${tarea.esGrupal ? "grupos" : "personas"} sin entrega`}
          </p>
          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
          ) : !cargando && pendientes.length === 0 ? (
            <p className="rounded-xl border border-line bg-paper-sunken p-5 text-sm text-ink-soft">No hay entregas pendientes para esta actividad.</p>
          ) : (
            <div className="space-y-2">
              {pendientes.map((pendiente) => {
                const numero = numeroWhatsApp(pendiente.celular);
                const mensaje = mensajeRecordatorio(pendiente, tarea, convocatoria);
                return (
                  <article key={`${pendiente.tipo}-${pendiente.referenciaId}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper-raised p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      {pendiente.tipo === "GRUPO" ? <Users className="mt-0.5 h-5 w-5 shrink-0 text-accent" /> : <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-accent" />}
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">
                          {pendiente.tipo === "GRUPO" ? pendiente.codigoGrupo || "Grupo sin código" : pendiente.destinatario}
                        </p>
                        {pendiente.proyecto && <p className="text-sm text-ink-soft">{pendiente.proyecto}</p>}
                        {pendiente.tipo === "GRUPO" && <p className="text-xs text-ink-soft">Responsable: {pendiente.destinatario}</p>}
                        <p className="text-xs text-ink-faint">{pendiente.celular || "Sin celular registrado"}</p>
                      </div>
                    </div>
                    {numero ? (
                      <a href={`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                        <MessageCircle className="h-4 w-4" /> Enviar mensaje
                      </a>
                    ) : (
                      <span className="text-xs text-ink-faint">WhatsApp no disponible</span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
      {tareas.length === 0 && <p className="text-sm text-ink-soft">Aún no hay actividades en esta convocatoria.</p>}
    </section>
  );
}
