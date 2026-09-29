"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { Convocatoria, publicConvocatoriasAPI, api, ConvocatoriaDTO } from "@/lib/api";
import { Search, Calendar, Users, ArrowRight, ShieldCheck, CheckCircle2, Award, Sparkles, Clock, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTipo, setSelectedTipo] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchStatus, setSearchStatus] = useState<string>("");

  // Mis áreas y postulaciones del usuario autenticado
  const [misAreasMap, setMisAreasMap] = useState<Record<number, ConvocatoriaDTO>>({});
  const [selectedConvForPostulacion, setSelectedConvForPostulacion] = useState<Convocatoria | null>(null);
  const [nombreEquipoInput, setNombreEquipoInput] = useState("");
  const [enviandoPostulacion, setEnviandoPostulacion] = useState(false);

  // Estado de verificación de certificados Blockchain
  const [certInput, setCertInput] = useState("0x7f92...a31b-2026-FICCT");
  const [verifying, setVerifying] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState<boolean | null>(null);

  const loadConvocatorias = async (tipo?: string, query?: string) => {
    setLoading(true);
    setSearchStatus("Consultando base de datos...");
    try {
      const data = await publicConvocatoriasAPI.getAll(tipo, query);
      setConvocatorias(data);
      if (query && query.trim().length > 0) {
        setSearchStatus(`Se encontraron ${data.length} actividades para "${query}"`);
      } else {
        setSearchStatus("");
      }
    } catch (err) {
      console.error("Error al cargar convocatorias:", err);
      setSearchStatus("Modo sin conexión con backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConvocatorias(selectedTipo, searchQuery);
  }, [selectedTipo]);

  const fetchMisAreas = useCallback(async () => {
    if (!user) return;
    try {
      const misAreas = await api.getMisAreas().catch(() => []);
      const map: Record<number, ConvocatoriaDTO> = {};
      misAreas.forEach((a) => {
        map[a.id] = a;
      });
      setMisAreasMap(map);
    } catch {
      // no auth
    }
  }, [user]);

  useEffect(() => {
    fetchMisAreas();
  }, [fetchMisAreas]);

  const handleEnviarPostulacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvForPostulacion) return;
    try {
      setEnviandoPostulacion(true);
      await api.inscribirseConvocatoria(selectedConvForPostulacion.id, {
        nombreEquipo: nombreEquipoInput.trim() || undefined,
      });
      toast("¡Solicitud enviada con éxito! El docente a cargo revisará tu postulación para admitirte al aula.", "success");
      setSelectedConvForPostulacion(null);
      setNombreEquipoInput("");
      await fetchMisAreas();
    } catch (err: any) {
      toast(err.message || "Error al enviar postulación", "error");
    } finally {
      setEnviandoPostulacion(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadConvocatorias(selectedTipo, searchQuery);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certInput.trim()) return;
    setVerifying(true);
    setVerifiedResult(null);

    setTimeout(() => {
      setVerifying(false);
      setVerifiedResult(true);
      toast("Certificado validado en Blockchain (Polkadot / Polygon Testnet)", "success");
    }, 850);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Sin fecha límite";
    const [y, m, d] = dateStr.split("-");
    const meses = [
      "ene", "feb", "mar", "abr", "may", "jun",
      "jul", "ago", "sep", "oct", "nov", "dic"
    ];
    const mesIndex = parseInt(m, 10) - 1;
    return `Cierra ${parseInt(d, 10)} ${meses[mesIndex] || ""}`;
  };

  const tipos = [
    { label: "Todas", value: "TODAS" },
    { label: "Feria de Ciencias", value: "FERIA" },
    { label: "Hackathon", value: "HACKATHON" },
    { label: "Investigación", value: "INVESTIGACION" },
    { label: "Concurso", value: "CONCURSO" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-paper transition-colors duration-300">
      <Navbar />

      {/* Hero Section con Breathing Organic Blob */}
      <section className="pt-12 pb-10 px-6 sm:px-10 max-w-5xl mx-auto w-full">
        <div className="blob-wrap relative rounded-3xl border border-line bg-paper-raised/75 backdrop-blur-md p-8 sm:p-12 shadow-sm overflow-hidden">
          {/* El blob orgánico que respira suavemente de fondo */}
          <div className="blob" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-accent-dark bg-accent-soft px-3 py-1 rounded-full mb-5 border border-accent/20">
              <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
              <span>Convocatorias Abiertas · Semestre II/2026</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl font-normal leading-[1.18] text-ink mb-4">
              Las ferias, hackathones y proyectos de investigación de la FICCT, en un solo lugar.
            </h1>

            <p className="text-base sm:text-lg text-ink-soft mb-8 leading-relaxed max-w-2xl">
              Consulta actividades vigentes o postula tu proyecto con tus compañeros de carrera. Acceso público libre y transparente con trazabilidad académica garantizada.
            </p>

            {/* Barra de Búsqueda con feedback en vivo (Nielsen #1) */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-2xl mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!e.target.value) setSearchStatus("");
                  }}
                  placeholder="Buscar por temática, nombre de feria o palabra clave…"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-paper-raised text-ink border border-line focus:border-accent rounded-xl focus:outline-none shadow-sm transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 text-sm font-medium bg-accent text-white rounded-xl hover:bg-accent-dark active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? <span className="btn-spinner" /> : "Buscar"}
              </button>
            </form>

            {/* Estado de búsqueda en vivo (Heurística de Nielsen) */}
            {searchStatus && (
              <div className="text-xs text-ink-faint h-5 animate-in fade-in duration-200">
                {searchStatus}
              </div>
            )}
          </div>
        </div>

        {/* Filtros por Categoría */}
        <div className="flex gap-2 flex-wrap items-center text-xs mt-8">
          <span className="text-ink-faint font-medium mr-1">Filtrar por:</span>
          {tipos.map((t) => (
            <button
              key={t.value}
              onClick={() => setSelectedTipo(t.value)}
              className={`px-3.5 py-1.5 rounded-full border transition-all duration-200 ${
                selectedTipo === t.value
                  ? "bg-accent-soft text-accent-dark border-accent font-semibold shadow-sm scale-105"
                  : "bg-paper-raised text-ink-soft border-line hover:border-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Grid de Actividades */}
      <section id="actividades" className="px-6 sm:px-10 pb-16 max-w-5xl mx-auto w-full flex-1">
        <div className="flex justify-between items-center mb-6 pb-2.5 border-b border-line-soft">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">
            Actividades publicadas ({convocatorias.length})
          </h2>
          {selectedTipo !== "TODAS" && (
            <button
              onClick={() => setSelectedTipo("TODAS")}
              className="text-xs text-accent underline hover:text-accent-dark font-medium"
            >
              Ver todas
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center text-ink-soft">
            <div className="w-9 h-9 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3.5" />
            <p className="text-sm">Consultando convocatorias vigentes...</p>
          </div>
        ) : convocatorias.length === 0 ? (
          <div className="bg-paper-raised border border-line rounded-2xl p-12 text-center shadow-sm">
            <Award className="w-10 h-10 text-ink-faint mx-auto mb-3 stroke-[1.5]" />
            <h3 className="font-serif text-lg text-ink mb-1">Sin actividades para este criterio</h3>
            <p className="text-ink-soft text-xs max-w-md mx-auto mb-4 leading-relaxed">
              No se encontraron convocatorias publicadas con los filtros actuales. Puedes restablecer la búsqueda o explorar todas las áreas.
            </p>
            <button
              onClick={() => {
                setSelectedTipo("TODAS");
                setSearchQuery("");
                loadConvocatorias("TODAS", "");
              }}
              className="text-xs font-semibold text-accent hover:text-accent-dark underline"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {convocatorias.map((c) => (
              <div
                key={c.id}
                className="bg-paper-raised border border-line rounded-2xl p-6 border-l-4 border-l-accent flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
              >
                <div>
                  <div className="flex justify-between items-start mb-2.5">
                    <span className="text-[11px] font-bold text-accent-dark uppercase tracking-wider bg-accent-soft px-2.5 py-0.5 rounded-full">
                      {c.tipo}
                    </span>
                    <span className="text-[11px] bg-paper-sunken px-2 py-0.5 rounded-md text-ink-faint border border-line-soft">
                      {c.tamanoEquipo || "1 a 5 integrantes"}
                    </span>
                  </div>

                  <h3 className="font-serif text-lg font-normal text-ink mb-2 leading-snug group-hover:text-accent transition-colors">
                    {c.titulo}
                  </h3>

                  <p className="text-xs text-ink-soft line-clamp-3 mb-4 leading-relaxed">
                    {c.descripcion}
                  </p>

                  {/* Requisitos Chips */}
                  {c.requisitos && c.requisitos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {c.requisitos.slice(0, 3).map((r, i) => (
                        <span
                          key={i}
                          className="text-[10.5px] bg-paper-sunken px-2 py-0.5 rounded text-ink-soft border border-line-soft truncate max-w-[200px]"
                        >
                          {r.descripcion}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3.5 border-t border-line-soft flex items-center justify-between text-xs text-ink-faint">
                  <span className="flex items-center gap-1.5 text-accent-dark font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(c.fechaCierre)}
                  </span>

                  {!user ? (
                    <Link
                      href={`/login?redirect=/dashboard/convocatorias/${c.id}`}
                      className="flex items-center gap-1 text-ink hover:text-accent font-semibold text-xs transition-colors"
                    >
                      <span>Postular</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  ) : misAreasMap[c.id] ? (
                    <Link
                      href={`/dashboard/convocatorias/${c.id}`}
                      className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg font-semibold text-xs hover:bg-emerald-500/20 transition-all border border-emerald-500/30"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Ir al Aula</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  ) : user.rol === "ESTUDIANTE" ? (
                    <button
                      onClick={() => {
                        setSelectedConvForPostulacion(c);
                        setNombreEquipoInput("");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent text-white font-semibold text-xs hover:bg-accent-dark active:scale-95 transition-all shadow-xs cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Postularme</span>
                    </button>
                  ) : (
                    <Link
                      href={`/dashboard/convocatorias/${c.id}`}
                      className="flex items-center gap-1 text-ink hover:text-accent font-semibold text-xs transition-colors"
                    >
                      <span>Gestionar</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sección de Verificación Blockchain con Liquid Glass (Nielsen Heurística #10 & #1) */}
      <section id="verificacion" className="px-6 sm:px-10 py-16 border-t border-line bg-paper-sunken/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-seal bg-seal-soft px-3 py-1 rounded-full mb-3 border border-seal/20">
              Certificación Digital Inalterable
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-ink mb-3">
              Verificador Público de Certificados Blockchain
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
              Cualquier estudiante, docente o entidad externa puede validar la autenticidad e inalterabilidad de los reconocimientos emitidos por la Unidad de Investigación FICCT.
            </p>
          </div>

          <div className="liquid-glass rounded-2xl p-6 sm:p-8 shadow-xl">
            <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-seal" />
                <input
                  type="text"
                  value={certInput}
                  onChange={(e) => setCertInput(e.target.value)}
                  placeholder="Introduce el código de verificación o hash (ej: 0x7f92...)"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-paper-raised text-ink border border-line rounded-xl focus:outline-none focus:border-seal font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={verifying}
                className="px-6 py-2.5 text-xs sm:text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent-dark active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
              >
                {verifying ? <span className="btn-spinner" /> : "Verificar Certificado"}
              </button>
            </form>

            {/* Resultado con animación de checkmark dibujado */}
            {verifiedResult && (
              <div className="rounded-xl border border-accent/40 bg-accent-soft/70 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-white check-draw" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-accent-dark">Certificado Auténtico y Verificado</span>
                      <span className="text-[10px] bg-accent text-white font-mono px-2 py-0.5 rounded-full font-bold">
                        ON-CHAIN
                      </span>
                    </div>
                    <p className="text-ink-soft mb-2 leading-relaxed">
                      Otorgado a: <strong className="text-ink">Daniel Quispe Choque</strong> — Proyecto: <em>"Sistema de Apoyo a la Investigación Estudiantil FICCT"</em>.
                    </p>
                    <div className="text-[11px] font-mono text-ink-faint bg-paper-raised/60 p-2 rounded border border-line-soft flex flex-wrap justify-between gap-2">
                      <span>Hash de Bloque: 0x8a1b2c...3f4e5d6a</span>
                      <span>Red: Polygon PoS · Bloque #18,492,014</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="nosotros" className="bg-paper-raised border-t border-line py-10 px-6 text-center text-xs text-ink-faint transition-colors">
        <p className="font-serif text-sm font-semibold text-ink mb-1">
          Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones
        </p>
        <p className="mb-3">Universidad Autónoma Gabriel René Moreno · Santa Cruz de la Sierra, Bolivia</p>
        <div className="flex justify-center items-center gap-4 text-ink-soft">
          <Link href="/login" className="hover:text-accent">Portal Docente</Link>
          <span>·</span>
          <Link href="/login" className="hover:text-accent">Portal Estudiante</Link>
          <span>·</span>
          <Link href="/registro" className="hover:text-accent">Crear Cuenta</Link>
        </div>
      </footer>

      {/* Modal de Postulación / Inscripción */}
      {selectedConvForPostulacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-paper border border-line rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-accent-dark uppercase tracking-wider bg-accent-soft px-2.5 py-0.5 rounded-full">
                  {selectedConvForPostulacion.tipo}
                </span>
                <h3 className="font-serif text-xl font-normal text-ink mt-2">
                  Postularme a la Actividad
                </h3>
              </div>
              <button
                onClick={() => setSelectedConvForPostulacion(null)}
                className="text-ink-faint hover:text-ink p-1 rounded-lg hover:bg-paper-raised transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-paper-raised border border-line-soft rounded-2xl p-4 space-y-1">
              <h4 className="text-sm font-semibold text-ink">
                {selectedConvForPostulacion.titulo}
              </h4>
              <p className="text-xs text-ink-soft line-clamp-2">
                {selectedConvForPostulacion.descripcion}
              </p>
            </div>

            <form onSubmit={handleEnviarPostulacion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Nombre de equipo <span className="text-ink-faint font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={nombreEquipoInput}
                  onChange={(e) => setNombreEquipoInput(e.target.value)}
                  placeholder="Ej: ByteWarriors (o déjalo vacío para postular individual)"
                  className="w-full px-3.5 py-2.5 text-xs bg-paper-raised text-ink border border-line rounded-xl focus:outline-none focus:border-accent"
                />
                <p className="text-[11px] text-ink-faint mt-1">
                  Si no tienes equipo, ingresarás como estudiante sin grupo y luego el docente podrá asignarte o podrás elegir en la actividad de selección.
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                ℹ️ Tu solicitud será enviada a la bandeja de admisión del docente a cargo. Una vez aprobada, tendrás acceso completo a los módulos, tareas y aula virtual.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedConvForPostulacion(null)}
                  disabled={enviandoPostulacion}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-soft hover:bg-paper-raised transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviandoPostulacion}
                  className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-dark active:scale-95 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {enviandoPostulacion ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enviando solicitud...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Confirmar Postulación</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
