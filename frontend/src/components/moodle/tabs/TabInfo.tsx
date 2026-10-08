import React from "react";
import { CheckCircle2 } from "lucide-react";
import { ConvocatoriaDTO } from "@/lib/api";

interface TabInfoProps {
  convocatoria: ConvocatoriaDTO;
}

export default function TabInfo({ convocatoria }: TabInfoProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-paper border border-line rounded-2xl p-6 space-y-4">
        <h3 className="font-serif text-lg font-bold text-ink">Bases de la Convocatoria</h3>
        <p className="text-xs text-ink-soft leading-relaxed whitespace-pre-line">
          {convocatoria.descripcion}
        </p>

        <div className="pt-4 border-t border-line space-y-2">
          <h4 className="text-xs font-bold uppercase text-ink tracking-wider">
            Requisitos Obligatorios de Postulación
          </h4>
          {convocatoria.requisitos && convocatoria.requisitos.length > 0 ? (
            <ul className="space-y-2 text-xs text-ink-soft">
              {convocatoria.requisitos.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{r.descripcion}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-faint italic">Sin requisitos adicionales configurados.</p>
          )}
        </div>
      </div>

      <div className="bg-paper border border-line rounded-2xl p-6 space-y-4 text-xs">
        <h3 className="font-serif text-base font-bold text-ink">Detalles del Evento</h3>
        <div className="space-y-3 divide-y divide-line">
          <div className="pt-2">
            <span className="text-ink-faint block uppercase text-[10px] font-semibold">Tipo</span>
            <span className="font-semibold text-ink">{convocatoria.tipo}</span>
          </div>
          <div className="pt-2">
            <span className="text-ink-faint block uppercase text-[10px] font-semibold">Tamaño de Equipo</span>
            <span className="font-semibold text-ink">{convocatoria.tamanoEquipo || "Flexible"}</span>
          </div>
          <div className="pt-2">
            <span className="text-ink-faint block uppercase text-[10px] font-semibold">Fecha de Cierre</span>
            <span className="font-semibold text-ink">{convocatoria.fechaCierre || "Abierto"}</span>
          </div>
          <div className="pt-2">
            <span className="text-ink-faint block uppercase text-[10px] font-semibold">Creado por</span>
            <span className="font-semibold text-ink">{convocatoria.creadorNombre || "Administración FICCT"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
