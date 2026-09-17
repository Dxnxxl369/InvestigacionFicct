"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { api, ConvocatoriaDTO } from "@/lib/api";
import {
  PlusCircle,
  Search,
  CheckCircle2,
  ArrowUpRight,
  Filter,
  Users,
  Calendar,
  AlertCircle,
  Pencil,
} from "lucide-react";

export default function ConvocatoriasListPage() {
  const { user, canEditModule } = useAuth();
  const [convocatorias, setConvocatorias] = useState<ConvocatoriaDTO[]>([]);
  const [filtered, setFiltered] = useState<ConvocatoriaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODAS");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchConvocatorias = async () => {
    try {
      setLoading(true);
      const data = await api.getConvocatorias();
      setConvocatorias(data);
      setFiltered(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar las convocatorias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConvocatorias();
  }, []);

  // Filter effect
  useEffect(() => {
    let list = [...convocatorias];

    if (statusFilter !== "TODAS") {
      list = list.filter((c) => c.estado === statusFilter);
    }

    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.titulo.toLowerCase().includes(q) ||
          c.descripcion?.toLowerCase().includes(q) ||
          c.tipo.toLowerCase().includes(q)
      );
    }

    setFiltered(list);
  }, [searchTerm, statusFilter, convocatorias]);

  const handlePublicar = async (id: number) => {
    try {
      setActionLoading(id);
      await api.publicarConvocatoria(id);
      setActionSuccess(`¡Convocatoria #${id} publicada exitosamente! Ya es visible en el portal público.`);
      await fetchConvocatorias();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "No se pudo publicar la convocatoria");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-ink-faint tracking-wider uppercase">
              Gestión de Convocatorias y Actividades
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-ink mt-0.5">
              Convocatorias y Ferias
            </h1>
            <p className="text-xs text-ink-soft mt-1">
              Catálogo de convocatorias de investigación, hackathones y ferias con control de ciclo de vida.
            </p>
          </div>

          {canEditModule("CONVOCATORIAS") && (
            <Link
              href="/dashboard/convocatorias/nueva"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-opacity-95 transition-all shadow-sm flex-shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              Nueva Convocatoria
            </Link>
          )}
        </div>

        {/* Notificaciones */}
        {actionSuccess && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filtros y Buscador */}
        <div className="bg-paper-raised border border-line rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-ink-faint" />
            <input
              type="text"
              placeholder="Buscar por título, tipo o contenido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-line bg-paper text-ink text-xs focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-ink-faint" />
            <span className="text-xs text-ink-faint">Estado:</span>
            {["TODAS", "PUBLICADA", "BORRADOR", "FINALIZADA"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  statusFilter === st
                    ? "bg-ink text-paper"
                    : "bg-paper border border-line text-ink-soft hover:border-ink"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Convocatorias */}
        {loading ? (
          <div className="bg-paper-raised border border-line rounded-xl p-12 text-center text-ink-faint text-sm">
            Cargando catálogo de convocatorias...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-paper-raised border border-line rounded-xl p-12 text-center text-ink-faint text-sm">
            No se encontraron convocatorias con los criterios seleccionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((conv) => (
              <div
                key={conv.id}
                className="bg-paper-raised border border-line rounded-xl p-5 hover:border-ink-faint transition-all shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Detalles principales */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-dark">
                        {conv.tipo}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                          conv.estado === "PUBLICADA"
                            ? "bg-emerald-100 text-emerald-800"
                            : conv.estado === "BORRADOR"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {conv.estado}
                      </span>
                    </div>

                    <h2 className="font-serif text-lg text-ink font-semibold hover:text-accent transition-colors">
                      <Link href={`/dashboard/convocatorias/${conv.id}`}>
                        {conv.titulo}
                      </Link>
                    </h2>

                    <p className="text-xs text-ink-soft leading-relaxed max-w-3xl">
                      {conv.descripcion}
                    </p>

                    {/* Metadatos */}
                    <div className="pt-2 flex flex-wrap items-center gap-5 text-xs text-ink-faint">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-accent" />
                        <span>{conv.tamanoEquipo || "Individual o equipo"}</span>
                      </div>

                      {conv.fechaCierre && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-seal" />
                          <span>
                            Cierre:{" "}
                            <b>
                              {new Date(conv.fechaCierre).toLocaleDateString("es-BO", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </b>
                          </span>
                        </div>
                      )}

                      {conv.creadorNombre && (
                        <span className="text-[11px] text-ink-faint">
                          Creado por: {conv.creadorNombre}
                        </span>
                      )}
                    </div>

                    {/* Requisitos */}
                    {conv.requisitos && conv.requisitos.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-1.5">
                        {conv.requisitos.map((req, idx) => (
                          <span
                            key={req.id || idx}
                            className="text-[11px] bg-paper border border-line-soft px-2.5 py-0.5 rounded-md text-ink-soft"
                          >
                            • {req.descripcion}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex sm:flex-col items-end gap-2 flex-shrink-0 pt-2 sm:pt-0">
                    <Link
                      href={`/dashboard/convocatorias/${conv.id}`}
                      className="px-3 py-1.5 rounded-lg bg-ink text-white text-xs font-semibold hover:bg-black transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Users className="w-3.5 h-3.5 text-accent" />
                      <span>Ingresar al Aula</span>
                    </Link>

                    {/* Botón Editar para Admin o Docente con permiso */}
                    {canEditModule("CONVOCATORIAS") && (
                      <Link
                        href={`/dashboard/convocatorias/${conv.id}/editar`}
                        className="px-3 py-1.5 rounded-lg border border-accent/40 bg-accent-soft text-accent-dark text-xs font-semibold hover:bg-accent hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </Link>
                    )}

                    {conv.estado === "BORRADOR" && canEditModule("CONVOCATORIAS") && (
                      <button
                        onClick={() => handlePublicar(conv.id)}
                        disabled={actionLoading === conv.id}
                        className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-opacity-95 disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {actionLoading === conv.id ? "Publicando..." : "Publicar"}
                      </button>
                    )}

                    <Link
                      href="/"
                      target="_blank"
                      className="px-3 py-1.5 rounded-lg border border-line text-ink-soft text-xs font-medium hover:bg-paper transition-all flex items-center gap-1"
                    >
                      <span>Ver en portal</span>
                      <ArrowUpRight className="w-3 h-3 text-ink-faint" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
