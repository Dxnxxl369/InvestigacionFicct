"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Download,
  FileSpreadsheet,
  FileJson,
  BarChart3,
  PieChart,
  LineChart,
  Table as TableIcon,
  MoveLeft,
  MoveRight,
  TrendingUp,
  Coins,
  Award,
  Layers,
  ArrowUpDown,
  Search,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Clock,
  GripVertical,
} from "lucide-react";

export default function ReportesGenerativosPage() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [tablaFiltro, setTablaFiltro] = useState("");
  const [cargando, setCargando] = useState(false);
  const [escuchandoVoz, setEscuchandoVoz] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resultado del reporte
  const [reporte, setReporte] = useState<{
    titulo: string;
    explicacion: string;
    sqlEjecutado: string;
    columnas: string[];
    filas: Array<Record<string, any>>;
    kpis: Array<{ etiqueta: string; valor: string; subtitulo: string; icono: string }>;
    grafico?: {
      tipo: "BAR" | "PIE" | "LINE";
      ejeX: string;
      ejeY: string;
      series: Array<{ label: string; value: number }>;
    };
    tiempoEjecucionMs: number;
  } | null>(null);

  // Vista activa: Tabla o Gráfico
  const [vistaActiva, setVistaActiva] = useState<"TABLA" | "GRAFICO">("TABLA");

  // Orden de columnas arrastrable / reordenable con feedback visual
  const [columnasOrdenadas, setColumnasOrdenadas] = useState<string[]>([]);
  const [columnaArrastrada, setColumnaArrastrada] = useState<string | null>(null);
  const [columnaSobre, setColumnaSobre] = useState<string | null>(null);

  // Filtro de búsqueda local sobre la tabla
  const [filtroTabla, setFiltroTabla] = useState("");
  const [columnaOrden, setColumnaOrden] = useState<string | null>(null);
  const [ordenAsc, setOrdenAsc] = useState(true);

  // Speech Recognition ref
  const recognitionRef = useRef<any>(null);

  // Inicializar Web Speech API si el navegador lo soporta
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "es-ES";

        rec.onresult = (event: any) => {
          const texto = event.results[0][0].transcript;
          setPrompt(texto);
          setEscuchandoVoz(false);
          ejecutarConsulta(texto);
        };

        rec.onerror = () => {
          setEscuchandoVoz(false);
        };

        rec.onend = () => {
          setEscuchandoVoz(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  // Al llegar un nuevo reporte, sincronizar columnas
  useEffect(() => {
    if (reporte?.columnas) {
      setColumnasOrdenadas(reporte.columnas);
      setColumnaOrden(null);
      setFiltroTabla("");
    }
  }, [reporte]);

  const toggleVoz = () => {
    if (!recognitionRef.current) {
      alert("Tu navegador no soporta entrada de voz por Web Speech API. Usa Chrome o Edge.");
      return;
    }

    if (escuchandoVoz) {
      recognitionRef.current.stop();
      setEscuchandoVoz(false);
    } else {
      setError(null);
      setEscuchandoVoz(true);
      try {
        recognitionRef.current.start();
      } catch {
        setEscuchandoVoz(false);
      }
    }
  };

  const ejecutarConsulta = async (promptPersonalizado?: string) => {
    const texto = (promptPersonalizado || prompt).trim();
    if (!texto || cargando) return;

    setCargando(true);
    setError(null);

    try {
      const resp = await api.consultarReporteIA({
        prompt: texto,
        tablaFiltro: tablaFiltro || undefined,
      });

      if (!resp.exito) {
        throw new Error(resp.error || "No se pudo generar el reporte.");
      }

      setReporte(resp);
      if (resp.grafico && resp.grafico.series && resp.grafico.series.length > 0) {
        setVistaActiva("TABLA");
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con el motor de reportes IA.");
    } finally {
      setCargando(false);
    }
  };

  // Reordenar columnas mediante drag & drop con animaciones y estilos reactivos
  const handleDragStart = (e: React.DragEvent, col: string) => {
    setColumnaArrastrada(col);
    e.dataTransfer.setData("text/plain", col);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (columnaSobre !== col) {
      setColumnaSobre(col);
    }
  };

  const handleDragEnter = (col: string) => {
    if (columnaArrastrada && columnaArrastrada !== col) {
      setColumnaSobre(col);
    }
  };

  const handleDragLeave = (e: React.DragEvent, col: string) => {
    if (e.currentTarget === e.target && columnaSobre === col) {
      setColumnaSobre(null);
    }
  };

  const handleDragEnd = () => {
    setColumnaArrastrada(null);
    setColumnaSobre(null);
  };

  const handleDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    if (!columnaArrastrada || columnaArrastrada === targetCol) {
      setColumnaArrastrada(null);
      setColumnaSobre(null);
      return;
    }
    const items = [...columnasOrdenadas];
    const fromIndex = items.indexOf(columnaArrastrada);
    const toIndex = items.indexOf(targetCol);

    if (fromIndex >= 0 && toIndex >= 0) {
      items.splice(fromIndex, 1);
      items.splice(toIndex, 0, columnaArrastrada);
      setColumnasOrdenadas(items);
    }

    setColumnaArrastrada(null);
    setColumnaSobre(null);
  };

  const moverColumna = (col: string, direccion: "IZQ" | "DER") => {
    const items = [...columnasOrdenadas];
    const index = items.indexOf(col);
    if (index < 0) return;

    const nuevoIndex = direccion === "IZQ" ? index - 1 : index + 1;
    if (nuevoIndex < 0 || nuevoIndex >= items.length) return;

    items.splice(index, 1);
    items.splice(nuevoIndex, 0, col);
    setColumnasOrdenadas(items);
  };

  // Exportar a Excel con formato CSV delimitado por ';' y UTF-8 BOM
  const exportarCSV = () => {
    if (!reporte || !reporte.filas || reporte.filas.length === 0) return;

    const cols = columnasOrdenadas.length > 0 ? columnasOrdenadas : reporte.columnas;
    const encabezados = cols.join(";");

    const lineas = reporte.filas.map((fila) => {
      return cols
        .map((col) => {
          let val = fila[col];
          if (val === null || val === undefined) return '""';
          const str = String(val).replace(/"/g, '""').replace(/\r?\n/g, " ");
          return `"${str}"`;
        })
        .join(";");
    });

    // \ufeff antepuesto para forzar a Excel a leerlo en UTF-8 con tildes y caracteres latinos
    const csvContent = "\ufeff" + [encabezados, ...lineas].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_ficct_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Exportar a JSON
  const exportarJSON = () => {
    if (!reporte || !reporte.filas) return;
    const blob = new Blob([JSON.stringify(reporte.filas, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_ficct_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtrado y ordenamiento de filas
  const filasFiltradas = (reporte?.filas || []).filter((fila) => {
    if (!filtroTabla.trim()) return true;
    const busqueda = filtroTabla.toLowerCase();
    return Object.values(fila).some((v) => String(v).toLowerCase().includes(busqueda));
  });

  if (columnaOrden) {
    filasFiltradas.sort((a, b) => {
      const valA = a[columnaOrden];
      const valB = b[columnaOrden];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (typeof valA === "number" && typeof valB === "number") {
        return ordenAsc ? valA - valB : valB - valA;
      }
      return ordenAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }

  // Píldoras de sugerencias rápidas
  const sugerenciasRapidas = [
    { label: "Usuarios por Rol", prompt: "Total de usuarios agrupados por rol" },
    { label: "Convocatorias y Estados", prompt: "Listar todas las convocatorias con su tipo, modalidad y estado" },
    { label: "Participantes por Convocatoria", prompt: "Total de estudiantes inscritos por convocatoria" },
    { label: "Docentes Activos", prompt: "Listar docentes activos con su correo y celular" },
    { label: "Entregas y Promedio de Tareas", prompt: "Promedio de notas y total de entregas por tarea" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Encabezado Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                Inteligencia Artificial y Analítica
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Groq LPU Engine
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
              Reportes Generativos con IA
            </h1>
            <p className="text-xs text-ink-soft mt-1">
              Consulta en lenguaje natural o mediante voz. La IA genera la consulta SQL óptima, calcula métricas ejecutivas y construye gráficos al instante.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {reporte && (
              <>
                <button
                  type="button"
                  onClick={exportarCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-paper text-ink text-xs font-semibold hover:border-accent hover:text-accent transition shadow-xs"
                  title="Exportar a CSV separado por ';' compatible con Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel (CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={exportarJSON}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-paper text-ink text-xs font-semibold hover:border-accent hover:text-accent transition shadow-xs"
                >
                  <FileJson className="w-3.5 h-3.5 text-blue-600" />
                  <span>JSON</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Barra de Entrada Multimodal (Texto + Micrófono) */}
        <div className="bg-paper-raised border border-line rounded-2xl p-4 shadow-sm space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ejecutarConsulta();
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            {/* Selector de Tabla Objetivo (Opcional) */}
            <select
              value={tablaFiltro}
              onChange={(e) => setTablaFiltro(e.target.value)}
              className="bg-paper border border-line rounded-xl px-3 py-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent font-medium"
            >
              <option value="">Todas las tablas</option>
              <option value="usuarios">Usuarios y Roles</option>
              <option value="convocatorias">Convocatorias y Ferias</option>
              <option value="convocatoria_participantes">Inscritos y Equipos</option>
              <option value="feria_postulaciones">Postulaciones de Feria</option>
              <option value="tareas">Tareas y Evaluaciones</option>
              <option value="biblioteca_documentos">Biblioteca Virtual</option>
            </select>

            {/* Input de Consulta */}
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Escribe tu consulta (ej. 'Muestra los docentes activos y su cantidad de convocatorias')..."
                className="w-full bg-paper border border-line rounded-xl pl-4 pr-12 py-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent transition shadow-2xs"
                disabled={cargando}
              />
              {prompt && (
                <button
                  type="button"
                  onClick={() => setPrompt("")}
                  className="absolute right-3 text-ink-faint hover:text-ink text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Botón de Voz (Speech-to-Text) */}
            <button
              type="button"
              onClick={toggleVoz}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                escuchandoVoz
                  ? "bg-rose-500 text-white border-rose-600 animate-pulse ring-4 ring-rose-500/20"
                  : "bg-paper border-line text-ink hover:border-accent hover:text-accent shadow-xs"
              }`}
              title={escuchandoVoz ? "Escuchando... haz clic para detener" : "Dictar por voz"}
            >
              {escuchandoVoz ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-accent" />}
              <span className="hidden md:inline">{escuchandoVoz ? "Escuchando..." : "Dictar"}</span>
            </button>

            {/* Botón de Ejecutar */}
            <button
              type="submit"
              disabled={cargando || !prompt.trim()}
              className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition shadow-sm flex items-center justify-center gap-1.5"
            >
              {cargando ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analizando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Consultar</span>
                </>
              )}
            </button>
          </form>

          {/* Sugerencias Rápidas */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-xs">
            <span className="text-[11px] text-ink-faint font-semibold uppercase tracking-wider whitespace-nowrap mr-1">
              Sugerencias:
            </span>
            {sugerenciasRapidas.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setPrompt(sug.prompt);
                  ejecutarConsulta(sug.prompt);
                }}
                className="whitespace-nowrap px-3 py-1 rounded-full bg-paper border border-line-soft text-ink-soft hover:border-accent hover:text-accent transition text-[11px] font-medium"
              >
                {sug.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="p-4 rounded-xl bg-danger-soft/20 border border-danger/30 text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Indicador de Carga */}
        {cargando && (
          <div className="p-8 rounded-2xl bg-paper-raised border border-line text-center space-y-3">
            <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-ink">El Agente SQL está procesando tu consulta...</p>
            <p className="text-xs text-ink-soft max-w-md mx-auto">
              Interpretando la semántica, generando consulta ANSI SQL segura y deduciendo KPIs ejecutivos.
            </p>
          </div>
        )}

        {/* Visualización de Resultados */}
        {reporte && !cargando && (
          <div className="space-y-5 animate-in fade-in duration-300">
            
            {/* Tarjetas de Métricas Ejecutivas (KPIs) */}
            {reporte.kpis && reporte.kpis.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {reporte.kpis.map((kpi, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-paper-raised border border-line shadow-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-ink-faint">
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        {kpi.etiqueta}
                      </span>
                      {kpi.icono === "money" ? (
                        <Coins className="w-4 h-4 text-emerald-500" />
                      ) : kpi.icono === "score" ? (
                        <TrendingUp className="w-4 h-4 text-accent" />
                      ) : (
                        <Layers className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <div className="text-xl sm:text-2xl font-serif font-bold text-ink">
                      {kpi.valor}
                    </div>
                    <p className="text-[10px] text-ink-soft truncate">{kpi.subtitulo}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Pestañas de Vista (Tabla, Gráfico) y Tiempo */}
            <div className="bg-paper-raised border border-line rounded-2xl overflow-hidden shadow-xs">
              <div className="px-5 py-3 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-paper">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setVistaActiva("TABLA")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      vistaActiva === "TABLA"
                        ? "bg-accent text-white shadow-xs"
                        : "text-ink-soft hover:bg-paper-sunken hover:text-ink"
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Tabla ({filasFiltradas.length})</span>
                  </button>

                  {reporte.grafico && (
                    <button
                      type="button"
                      onClick={() => setVistaActiva("GRAFICO")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        vistaActiva === "GRAFICO"
                          ? "bg-accent text-white shadow-xs"
                          : "text-ink-soft hover:bg-paper-sunken hover:text-ink"
                      }`}
                    >
                      {reporte.grafico.tipo === "PIE" ? (
                        <PieChart className="w-3.5 h-3.5" />
                      ) : (
                        <BarChart3 className="w-3.5 h-3.5" />
                      )}
                      <span>Gráfico</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-ink-faint">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    <span>Tiempo: {reporte.tiempoEjecucionMs} ms</span>
                  </span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Consulta ANSI
                  </span>
                </div>
              </div>

              {/* VISTA 1: TABLA REACTIVA CON REORDENAMIENTO DE COLUMNAS */}
              {vistaActiva === "TABLA" && (
                <div className="p-4 space-y-3">
                  {/* Buscador Rápido sobre Resultados */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 absolute left-3 text-ink-faint" />
                      <input
                        type="text"
                        value={filtroTabla}
                        onChange={(e) => setFiltroTabla(e.target.value)}
                        placeholder="Filtrar resultados en vivo..."
                        className="w-full bg-paper border border-line rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    <span className="text-[11px] text-ink-faint hidden sm:inline">
                      Arrastra los encabezados o usa las flechas para reordenar las columnas
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-line rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-paper-sunken/80 border-b border-line text-ink-soft font-bold uppercase tracking-wider text-[10px]">
                          {columnasOrdenadas.map((col, index) => {
                            const isDragging = columnaArrastrada === col;
                            const isOver = columnaSobre === col && columnaArrastrada !== col;

                            return (
                              <th
                                key={col}
                                draggable
                                onDragStart={(e) => handleDragStart(e, col)}
                                onDragOver={(e) => handleDragOver(e, col)}
                                onDragEnter={() => handleDragEnter(col)}
                                onDragLeave={(e) => handleDragLeave(e, col)}
                                onDragEnd={handleDragEnd}
                                onDrop={(e) => handleDrop(e, col)}
                                className={`px-3.5 py-2.5 whitespace-nowrap select-none group border-r border-line-soft last:border-r-0 transition-all duration-150 cursor-grab active:cursor-grabbing ${
                                  isDragging
                                    ? "opacity-30 scale-95 bg-accent/20 border-dashed border-2 border-accent shadow-inner"
                                    : isOver
                                    ? "border-l-4 border-l-accent bg-accent/15 text-accent scale-[1.02] shadow-md z-10 relative"
                                    : "hover:bg-paper"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <GripVertical className="w-3 h-3 text-ink-faint opacity-40 group-hover:opacity-100 transition" />
                                    <span
                                      onClick={() => {
                                        if (columnaOrden === col) {
                                          setOrdenAsc(!ordenAsc);
                                        } else {
                                          setColumnaOrden(col);
                                          setOrdenAsc(true);
                                        }
                                      }}
                                      className="cursor-pointer hover:text-accent flex items-center gap-1 font-semibold"
                                    >
                                      {col}
                                      <ArrowUpDown className="w-3 h-3 text-ink-faint opacity-50 group-hover:opacity-100" />
                                    </span>
                                  </div>

                                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                                    {index > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => moverColumna(col, "IZQ")}
                                        className="p-0.5 text-ink-faint hover:text-accent"
                                        title="Mover a la izquierda"
                                      >
                                        <MoveLeft className="w-3 h-3" />
                                      </button>
                                    )}
                                    {index < columnasOrdenadas.length - 1 && (
                                      <button
                                        type="button"
                                        onClick={() => moverColumna(col, "DER")}
                                        className="p-0.5 text-ink-faint hover:text-accent"
                                        title="Mover a la derecha"
                                      >
                                        <MoveRight className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line-soft text-ink">
                        {filasFiltradas.length === 0 ? (
                          <tr>
                            <td
                              colSpan={columnasOrdenadas.length}
                              className="p-6 text-center text-xs text-ink-soft"
                            >
                              No se encontraron registros para el filtro aplicado.
                            </td>
                          </tr>
                        ) : (
                          filasFiltradas.map((fila, rowIdx) => (
                            <tr
                              key={rowIdx}
                              className="hover:bg-paper-sunken/40 transition-colors"
                            >
                              {columnasOrdenadas.map((col) => {
                                const val = fila[col];
                                return (
                                  <td
                                    key={col}
                                    className="px-3.5 py-2.5 whitespace-nowrap text-xs border-r border-line-soft last:border-r-0"
                                  >
                                    {val === null || val === undefined
                                      ? "—"
                                      : typeof val === "boolean"
                                      ? val
                                        ? "Sí"
                                        : "No"
                                      : String(val)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VISTA 2: GRÁFICO INTELIGENTE SVG */}
              {vistaActiva === "GRAFICO" && reporte.grafico && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-ink">
                        Distribución por {reporte.grafico.ejeX}
                      </h3>
                      <p className="text-xs text-ink-soft">
                        Métrica evaluada: {reporte.grafico.ejeY}
                      </p>
                    </div>
                  </div>

                  {/* Render de Barras Proporcionales */}
                  {reporte.grafico.tipo === "BAR" && (
                    <div className="space-y-3 pt-2">
                      {(() => {
                        const maxVal = Math.max(
                          ...reporte.grafico.series.map((s) => Number(s.value) || 0),
                          1
                        );
                        return reporte.grafico.series.map((item, idx) => {
                          const pct = Math.round(((Number(item.value) || 0) / maxVal) * 100);
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold text-ink">
                                <span>{item.label}</span>
                                <span>{item.value}</span>
                              </div>
                              <div className="w-full h-3 bg-paper-sunken rounded-full overflow-hidden border border-line-soft">
                                <div
                                  className="h-full bg-gradient-to-r from-accent to-indigo-500 rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}

                  {/* Render de Dona / Pastel Vectorial */}
                  {reporte.grafico.tipo === "PIE" && (
                    <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
                      <div className="relative w-44 h-44 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          {(() => {
                            const total = reporte.grafico.series.reduce(
                              (acc, s) => acc + (Number(s.value) || 0),
                              0
                            );
                            let accumulatedPercent = 0;
                            const colors = [
                              "#10b981",
                              "#3b82f6",
                              "#8b5cf6",
                              "#f59e0b",
                              "#ec4899",
                              "#14b8a6",
                            ];

                            return reporte.grafico.series.map((item, i) => {
                              const val = Number(item.value) || 0;
                              const pct = total > 0 ? (val / total) * 100 : 0;
                              const strokeDash = `${pct} ${100 - pct}`;
                              const strokeOffset = 100 - accumulatedPercent;
                              accumulatedPercent += pct;

                              return (
                                <circle
                                  key={i}
                                  cx="18"
                                  cy="18"
                                  r="15.91549430918954"
                                  fill="transparent"
                                  stroke={colors[i % colors.length]}
                                  strokeWidth="3.5"
                                  strokeDasharray={strokeDash}
                                  strokeDashoffset={strokeOffset}
                                  className="transition-all duration-500"
                                />
                              );
                            });
                          })()}
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-xl font-serif font-bold text-ink block">
                            {reporte.filas.length}
                          </span>
                          <span className="text-[10px] text-ink-faint font-semibold uppercase">
                            Registros
                          </span>
                        </div>
                      </div>

                      {/* Leyenda del gráfico */}
                      <div className="space-y-2 max-w-xs">
                        {reporte.grafico.series.map((item, i) => {
                          const colors = [
                            "bg-emerald-500",
                            "bg-blue-500",
                            "bg-purple-500",
                            "bg-amber-500",
                            "bg-pink-500",
                            "bg-teal-500",
                          ];
                          return (
                            <div
                              key={i}
                              className="flex items-center justify-between gap-4 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`}
                                />
                                <span className="text-ink font-medium truncate max-w-[140px]">
                                  {item.label}
                                </span>
                              </div>
                              <span className="font-bold text-ink">{item.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
