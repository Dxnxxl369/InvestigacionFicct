"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Download, Eye, Search, ArrowLeft, FileText, Sparkles } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface DocumentoPublico {
  id: number;
  categoriaId: number | null;
  categoria: string | null;
  titulo: string;
  descripcion: string | null;
  area: string | null;
  nivel: string | null;
  nombreArchivo: string;
  tienePortada: boolean;
  publicado: boolean;
  creadoEn: string;
}

interface CategoriaPublica {
  id: number;
  nombre: string;
}

export default function BibliotecaPublicaPage() {
  const [documentos, setDocumentos] = useState<DocumentoPublico[]>([]);
  const [categorias, setCategorias] = useState<CategoriaPublica[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [niveles, setNiveles] = useState<string[]>([]);

  const [texto, setTexto] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [area, setArea] = useState("");
  const [nivel, setNivel] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarFiltros = async () => {
      try {
        const [fRes, cRes] = await Promise.all([
          fetch(`${API_BASE_URL}/biblioteca/filtros`),
          fetch(`${API_BASE_URL}/biblioteca/categorias`),
        ]);
        if (fRes.ok) {
          const f = await fRes.json();
          setAreas(f.areas || []);
          setNiveles(f.niveles || []);
        }
        if (cRes.ok) {
          setCategorias(await cRes.json());
        }
      } catch {
        // ignore
      }
    };
    cargarFiltros();
  }, []);

  useEffect(() => {
    const cargarDocs = async () => {
      setCargando(true);
      try {
        const params = new URLSearchParams();
        if (texto.trim()) params.set("texto", texto.trim());
        if (categoriaId) params.set("categoriaId", categoriaId);
        if (area) params.set("area", area);
        if (nivel) params.set("nivel", nivel);
        const res = await fetch(`${API_BASE_URL}/biblioteca/documentos?${params.toString()}`);
        if (res.ok) {
          setDocumentos(await res.json());
        }
      } finally {
        setCargando(false);
      }
    };
    const timer = setTimeout(cargarDocs, 200);
    return () => clearTimeout(timer);
  }, [texto, categoriaId, area, nivel]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 bg-paper/80 backdrop-blur-xl border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-line hover:border-accent transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Inicio</span>
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" />
              <span className="font-extrabold text-sm sm:text-base">
                Biblioteca Virtual FICCT
              </span>
            </div>
          </div>

          <Link
            href="/login"
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-dark transition-colors"
          >
            Ingresar al Campus
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <section className="rounded-2xl border border-line bg-paper-raised/70 p-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Acceso Abierto para Visitantes y Estudiantes</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Proyectos Culminados y Documentos Académicos
          </h1>
          <p className="text-sm text-ink-soft mt-1.5 max-w-3xl">
            Explora los proyectos finales concluidos en ferias, hackathones y convocatorias del
            Departamento de Investigación de la FICCT.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Buscar por título o contenido..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-line bg-paper focus:outline-none focus:border-accent"
              />
            </div>

            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-line bg-paper focus:outline-none focus:border-accent"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-line bg-paper focus:outline-none focus:border-accent"
            >
              <option value="">Todas las áreas</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            <select
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-line bg-paper focus:outline-none focus:border-accent"
            >
              <option value="">Todos los niveles</option>
              {niveles.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </section>

        {cargando ? (
          <div className="text-center py-16 text-sm text-ink-faint">
            Cargando documentos de la biblioteca...
          </div>
        ) : documentos.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-line">
            <FileText className="w-10 h-10 text-ink-faint mx-auto mb-2" />
            <p className="text-sm font-semibold">No se encontraron proyectos con esos filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {documentos.map((doc) => (
              <article
                key={doc.id}
                className="rounded-2xl border border-line bg-paper-raised/80 overflow-hidden flex flex-col justify-between shadow-xs hover:border-accent/40 transition-all"
              >
                <div>
                  <div className="h-40 bg-paper-sunken flex items-center justify-center overflow-hidden border-b border-line">
                    {doc.tienePortada ? (
                      <img
                        src={`${API_BASE_URL}/biblioteca/documentos/${doc.id}/portada`}
                        alt={doc.titulo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-ink-faint">
                        <FileText className="w-10 h-10 text-accent/70" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider">
                          Proyecto PDF
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {doc.categoria && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                          {doc.categoria}
                        </span>
                      )}
                      {doc.area && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-paper-sunken text-ink-soft">
                          {doc.area}
                        </span>
                      )}
                      {doc.nivel && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-paper-sunken text-ink-soft">
                          {doc.nivel}
                        </span>
                      )}
                    </div>

                    <h2 className="font-bold text-sm leading-snug line-clamp-2">{doc.titulo}</h2>
                    {doc.descripcion && (
                      <p className="text-xs text-ink-soft line-clamp-3">{doc.descripcion}</p>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center gap-2">
                  <a
                    href={`${API_BASE_URL}/biblioteca/documentos/${doc.id}/archivo`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-line hover:border-accent transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visualizar</span>
                  </a>
                  <a
                    href={`${API_BASE_URL}/biblioteca/documentos/${doc.id}/archivo?descargar=true`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-accent text-white hover:bg-accent-dark transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
