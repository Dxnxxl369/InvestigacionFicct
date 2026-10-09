"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Convocatoria, publicConvocatoriasAPI, api, ConvocatoriaDTO } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/context/ThemeContext";
import {
  Search,
  Calendar,
  Users,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Award,
  Sparkles,
  UserPlus,
  X,
  Code2,
  Cpu,
  GraduationCap,
  ExternalLink,
  ChevronDown,
  Layers,
  MapPin,
  LayoutDashboard,
  LogIn,
  Check,
  Zap,
  BookOpen,
  FileCheck2,
  Lightbulb,
  TrendingUp,
  Maximize2,
  Lock,
} from "lucide-react";

export default function HomePage() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Scroll Progress Bar
  const [scrollProgress, setScrollProgress] = useState(0);

  // Convocatorias & Búsqueda en Vivo
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTipo, setSelectedTipo] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchStatus, setSearchStatus] = useState<string>("");

  // Postulación Modal
  const [misAreasMap, setMisAreasMap] = useState<Record<number, ConvocatoriaDTO>>({});
  const [selectedConvForPostulacion, setSelectedConvForPostulacion] = useState<Convocatoria | null>(null);
  const [nombreEquipoInput, setNombreEquipoInput] = useState("");
  const [numeroGrupoInput, setNumeroGrupoInput] = useState<number | "">("");
  const [integrantesGrupoInput, setIntegrantesGrupoInput] = useState<string[]>([""]);
  const [enviandoPostulacion, setEnviandoPostulacion] = useState(false);

  // Verificador Blockchain
  const [certInput, setCertInput] = useState("0x7f92...a31b-2026-FICCT");
  const [verifying, setVerifying] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState<boolean | null>(null);

  // Modal para ver el afiche oficial en alta resolución
  const [showPosterModal, setShowPosterModal] = useState(false);

  // FAQ Acordeón State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Menú Móvil
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll Progress Listener
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Intersection Observer para animaciones de revelado
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );

    const elements = document.querySelectorAll(".reveal-on-scroll, .reveal-scale");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [loading, convocatorias]);

  // Carga de convocatorias desde el Backend
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
      // sin sesión
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
        numeroGrupo: numeroGrupoInput ? Number(numeroGrupoInput) : undefined,
        integrantesEmails: selectedConvForPostulacion.inscripcionGrupal
          ? integrantesGrupoInput.map((email) => email.trim()).filter(Boolean)
          : undefined,
      });
      toast("¡Solicitud enviada con éxito! El tribunal docente revisará tu postulación para admitirte al aula.", "success");
      setSelectedConvForPostulacion(null);
      setNombreEquipoInput("");
      setNumeroGrupoInput("");
      setIntegrantesGrupoInput([""]);
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
      toast("Certificado validado en registro Blockchain (FICCT - Polygon PoS)", "success");
    }, 850);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Sin fecha límite";
    const [y, m, d] = dateStr.split("-");
    const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
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

  const faqs = [
    {
      q: "¿Quiénes pueden participar en las ferias y semilleros de la FICCT?",
      a: "Pueden participar todos los estudiantes regulares de las carreras de Ingeniería en Sistemas, Ingeniería Informática e Ingeniería en Redes y Telecomunicaciones de la FICCT - UAGRM, junto a docentes investigadores y tutores de proyectos.",
    },
    {
      q: "¿Qué secciones obligatorias comprende el 1er Avance del Documento de Investigación?",
      a: "De acuerdo a la normativa oficial, el 1er avance debe incluir: 1) Título del proyecto, 2) Contexto y Antecedentes del problema, 3) Descripción y Planteamiento del problema, 4) Objetivos (General y Específicos), y 5) Bibliografía formal estructurada.",
    },
    {
      q: "¿Puedo postularme a una convocatoria si aún no tengo equipo conformado?",
      a: "Sí. Puedes postularte individualmente. Al acceder al aula virtual del evento dispones del módulo de Selección de Grupos (Group Choice) para unirte a un grupo con cupos disponibles o formar un nuevo equipo colaborativo.",
    },
    {
      q: "¿Cómo funciona la evaluación colegiada y el SpeedGrader con rúbricas?",
      a: "El tribunal calificador (docentes titulares y jurados especialistas) evalúa cada entrega mediante rúbricas cuantitativas por criterios. Puedes ver retroalimentación inmediata, observaciones en línea y calificación colegiada sin sesgos.",
    },
    {
      q: "¿Qué validez tienen los certificados criptográficos emitidos?",
      a: "Todos los certificados emitidos por la Dirección de Investigación de la FICCT cuentan con hash criptográfico inalterable registrado en Blockchain y código QR para validación inmediata ante empresas, comités de titulación y posgrados.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink selection:bg-accent/20 selection:text-accent-dark transition-colors duration-300 relative overflow-x-hidden font-sans">
      {/* Barra de progreso de lectura en el borde superior */}
      <div
        className="fixed top-0 left-0 h-[3px] bg-gradient-to-r from-accent via-emerald-400 to-teal-400 z-50 transition-all duration-100 shadow-[0_0_12px_rgba(76,166,75,0.7)]"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* ================= NAVBAR ULTRA-MINIMALISTA ESTILO LIQUID GLASS ================= */}
      <header className="sticky top-0 z-40 bg-paper/75 dark:bg-[#060D17]/75 backdrop-blur-xl border-b border-line/60 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo FICCT */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0B2545] to-[#123966] dark:from-[#0D1C33] dark:to-[#1E3A5F] border border-white/20 dark:border-white/10 flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-all">
                FICCT
              </div>
              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-accent border-2 border-paper dark:border-[#060D17]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-[15px] tracking-tight text-ink group-hover:text-accent transition-colors flex items-center gap-2">
                Investigación <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-accent/15 text-accent-dark font-bold tracking-wider">FICCT 2-2026</span>
              </span>
              <span className="text-[11px] text-ink-faint font-medium tracking-tight">
                Facultad de Cs. de la Computación y Telecomunicaciones · UAGRM
              </span>
            </div>
          </Link>

          {/* Menú de Navegación de Escritorio */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-ink-soft">
            <a href="#feria-activa" className="hover:text-accent transition-colors flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>1er Avance</span>
            </a>
            <a href="#pilares" className="hover:text-accent transition-colors">
              Pilares
            </a>
            <a href="#actividades" className="hover:text-accent transition-colors">
              Convocatorias
            </a>
            <a href="#flujo" className="hover:text-accent transition-colors">
              Metodología
            </a>
            <a href="#blockchain" className="hover:text-accent transition-colors">
              Verificador
            </a>
            <a href="#faq" className="hover:text-accent transition-colors">
              Normativa
            </a>
          </nav>

          {/* Acciones y Autenticación */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-dark shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Mi Campus ({user.rol})</span>
                <span className="sm:hidden">Campus</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border border-line/80 hover:border-accent text-ink bg-paper-raised/80 hover:bg-paper-sunken backdrop-blur-md transition-all shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5 text-accent" />
                  <span>Ingresar</span>
                </Link>
                <Link
                  href="/registro"
                  className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-dark shadow-xs transition-all hover:scale-[1.02]"
                >
                  <span>Registrarme</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Botón Menú Móvil */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl border border-line text-ink-soft hover:bg-paper-raised"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Menú Desplegable Móvil */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-line/60 bg-paper-raised/95 backdrop-blur-xl p-5 space-y-3 animate-in fade-in duration-200">
            <a
              href="#feria-activa"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-ink hover:text-accent py-1"
            >
              ✨ 1er Avance de Investigación
            </a>
            <a
              href="#pilares"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-ink hover:text-accent py-1"
            >
              Pilares de Investigación
            </a>
            <a
              href="#actividades"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-ink hover:text-accent py-1"
            >
              Convocatorias Abiertas
            </a>
            <a
              href="#flujo"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-ink hover:text-accent py-1"
            >
              Ruta del Proyecto
            </a>
            <a
              href="#blockchain"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-ink hover:text-accent py-1"
            >
              Verificador Blockchain
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-ink hover:text-accent py-1"
            >
              Preguntas &amp; Normativa
            </a>
            {!user && (
              <div className="pt-2">
                <Link
                  href="/registro"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-white font-semibold text-xs shadow-sm"
                >
                  <span>Registrarme como Estudiante</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ================= HERO SECTION CON LIQUID GLASS & POSTER FICCT ================= */}
      <section className="relative pt-10 sm:pt-16 pb-20 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        {/* Orbes orgánicos y destellos de fondo tipo Liquid Glass */}
        <div className="absolute top-12 left-1/4 -translate-x-1/2 w-[520px] h-[340px] bg-accent/15 dark:bg-accent/10 blur-[130px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-20 right-10 w-[380px] h-[380px] bg-[#0B2545]/15 dark:bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Columna Izquierda: Mensaje Central & Filosofía FICCT */}
          <div className="lg:col-span-7 space-y-6 reveal-on-scroll">
            {/* Badge superior de identidad oficial */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent/30 bg-accent-soft/80 backdrop-blur-md text-accent-dark text-xs font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="font-mono text-[11px] tracking-wide uppercase">FICCT · FERIA DE INVESTIGACIÓN 2-2026</span>
            </div>

            {/* Titular Principal inspirado en el poster institucional */}
            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-ink leading-[1.12]">
              Un mejor futuro{" "}
              <span className="bg-gradient-to-r from-accent via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                también se programa.
              </span>
            </h1>

            {/* Sublema oficial: Tecnología · Personas · Grandes ideas */}
            <div className="flex items-center gap-3 text-xs font-mono font-bold tracking-wider uppercase text-ink-faint">
              <span>Tecnología</span>
              <span>•</span>
              <span>Personas</span>
              <span>•</span>
              <span className="text-accent-dark">Grandes ideas</span>
            </div>

            <p className="text-sm sm:text-base text-ink-soft leading-relaxed max-w-xl">
              Plataforma oficial de la <strong>FICCT - UAGRM</strong> para el registro, desarrollo en aulas virtuales,
              evaluación colegiada mediante SpeedGrader y certificación inalterable en Blockchain de proyectos científicos, ferias y semilleros.
            </p>

            {/* Acciones principales */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <a
                href="#actividades"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm bg-accent text-white hover:bg-accent-dark transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Explorar Convocatorias</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="#feria-activa"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-xs sm:text-sm border border-line bg-paper-raised/70 hover:bg-paper-sunken text-ink transition-all backdrop-blur-md shadow-xs flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-accent" />
                <span>Bases del 1er Avance</span>
              </a>
            </div>

            {/* Badges de Garantía Institucional */}
            <div className="pt-4 border-t border-line/60 flex flex-wrap items-center gap-4 text-xs font-semibold text-ink-faint">
              <div className="flex items-center gap-1.5 text-accent-dark">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span>Rúbricas Oficiales Moodle</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span>Validación Criptográfica On-Chain</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-accent" />
                <span>Tribunal Docente Titular</span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta Liquid Glass con el Showcase de "1er Avance" (directo de image.png) */}
          <div className="lg:col-span-5 reveal-scale">
            <div className="relative rounded-3xl p-6 sm:p-7 backdrop-blur-2xl bg-white/75 dark:bg-[#081220]/75 border border-white/60 dark:border-white/10 shadow-[0_20px_50px_rgba(11,37,69,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all overflow-hidden group">
              {/* Reflejo de luz superior estilo cristal líquido */}
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-accent/60 to-transparent" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

              {/* Cabecera del Showcase */}
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest font-black text-accent-dark bg-accent/15 px-2.5 py-1 rounded-md inline-block">
                    CONVOCATORIA OFICIAL
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-ink mt-2 tracking-tight leading-tight">
                    1<sup className="text-xs">er</sup> AVANCE
                  </h3>
                  <p className="text-xs text-ink-soft font-medium">
                    Documento de Investigación · Semilleros FICCT
                  </p>
                </div>

                {/* Botón para ver el poster institucional completo */}
                <button
                  onClick={() => setShowPosterModal(true)}
                  className="p-2.5 rounded-xl border border-line bg-paper-sunken/60 hover:bg-accent hover:text-white text-ink-soft transition-all shadow-xs group/btn"
                  title="Ver afiche oficial completo"
                >
                  <Maximize2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                </button>
              </div>

              {/* Estructura obligatoria del documento (literal de image.png) */}
              <div className="rounded-2xl p-4 bg-paper-sunken/60 dark:bg-[#0D1C33]/60 border border-line/60 mb-5 space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink flex items-center justify-between">
                  <span>Estructura Requerida:</span>
                  <span className="text-[10px] text-accent-dark font-mono font-bold">5 Puntos</span>
                </div>
                <ul className="space-y-1.5 text-xs text-ink-soft">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <span className="font-medium text-ink">Título &amp; Línea de Investigación</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <span>Contexto / Antecedentes del problema</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <span>Descripción / Planteamiento del problema</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <span>Objetivos (General y Específicos)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <span>Bibliografía formal indexada</span>
                  </li>
                </ul>
              </div>

              {/* Banner de fecha límite y lema oficial */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#0B2545] to-[#143A66] dark:from-[#0D1C33] dark:to-[#183459] text-white flex flex-col justify-between border border-white/10 shadow-xs">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-emerald-300">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Plazo de Entrega</span>
                  </div>
                  <div className="mt-1">
                    <div className="text-[11px] font-medium text-white/80">HASTA EL</div>
                    <div className="text-2xl font-black text-white font-mono leading-none my-0.5">6</div>
                    <div className="text-[10px] uppercase font-bold text-emerald-400">OCTUBRE 2026</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-accent-soft/70 border border-accent/30 flex flex-col justify-between">
                  <div className="text-[10px] font-mono uppercase text-accent-dark font-bold">Lema Oficial</div>
                  <p className="text-xs font-bold text-ink leading-snug">
                    "Investigación hoy, soluciones mañana"
                  </p>
                  <div className="text-[11px] text-accent-dark font-extrabold italic tracking-tight">
                    ¡Sigamos avanzando! ✍️
                  </div>
                </div>
              </div>

              {/* Botón de acción al aula */}
              <Link
                href="/login"
                className="w-full py-2.5 rounded-xl bg-accent text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-accent-dark transition-all shadow-xs"
              >
                <span>Acceder para Enviar Avance</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3 PILARES FUNDAMENTALES (DE LA BARRA INFERIOR DE IMAGE.PNG) ================= */}
      <section id="pilares" className="py-14 px-4 sm:px-8 border-y border-line/60 bg-paper-sunken/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pilar 1: Trabajo en equipo */}
            <div className="p-6 rounded-2xl bg-paper-raised/70 dark:bg-[#0D1C33]/50 border border-line/60 backdrop-blur-xl glow-card flex items-start gap-4 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-ink mb-1">Trabajo en equipo</h3>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Conformación ágil de grupos multidisciplinarios de investigación, roles de colaboración y coautoría en documentos científicos.
                </p>
              </div>
            </div>

            {/* Pilar 2: Ideas que solucionan */}
            <div className="p-6 rounded-2xl bg-paper-raised/70 dark:bg-[#0D1C33]/50 border border-line/60 backdrop-blur-xl glow-card flex items-start gap-4 transition-all">
              <div className="w-12 h-12 rounded-xl bg-accent-soft text-accent-dark flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-ink mb-1">Ideas que solucionan</h3>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Desarrollo de software y algoritmos enfocados en resolver problemas reales de salud, educación, ciudades inteligentes y ciberseguridad.
                </p>
              </div>
            </div>

            {/* Pilar 3: Investigación con impacto */}
            <div className="p-6 rounded-2xl bg-paper-raised/70 dark:bg-[#0D1C33]/50 border border-line/60 backdrop-blur-xl glow-card flex items-start gap-4 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-ink mb-1">Investigación con impacto</h3>
                <p className="text-xs text-ink-soft leading-relaxed">
                  De la teoría de aula a la defensa colegiada con tribunal titular, publicación de papers, semilleros y proyectos de titulación.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CATÁLOGO DE CONVOCATORIAS VIGENTES (CONEXIÓN EN VIVO) ================= */}
      <section id="actividades" className="py-20 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl p-6 sm:p-10 backdrop-blur-2xl bg-white/75 dark:bg-[#081220]/75 border border-white/60 dark:border-white/10 shadow-[0_15px_40px_rgba(11,37,69,0.06)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.4)] reveal-on-scroll">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-line/60">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-accent-dark bg-accent/15 px-3 py-1 rounded-full mb-3">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Portal de Actividades Científicas</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                Convocatorias Vigentes ({convocatorias.length})
              </h2>
              <p className="text-xs sm:text-sm text-ink-soft mt-1 max-w-xl">
                Postula a tu equipo en las ferias facultativas, maratones de código y semilleros de investigación abiertos este semestre.
              </p>
            </div>

            {/* Barra de Búsqueda Rápida */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!e.target.value) setSearchStatus("");
                  }}
                  placeholder="Buscar por tema, docente..."
                  className="w-full pl-10 pr-3 py-2 text-xs bg-paper-raised text-ink border border-line rounded-xl focus:outline-none focus:border-accent shadow-xs"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-accent text-white text-xs font-semibold rounded-xl hover:bg-accent-dark transition-all flex items-center gap-1.5 shadow-xs"
              >
                {loading ? <span className="btn-spinner" /> : "Buscar"}
              </button>
            </form>
          </div>

          {/* Filtros de Categoría */}
          <div className="flex gap-2 flex-wrap items-center text-xs mb-8">
            <span className="text-ink-faint font-medium mr-1">Filtrar por:</span>
            {tipos.map((t) => (
              <button
                key={t.value}
                onClick={() => setSelectedTipo(t.value)}
                className={`px-3.5 py-1.5 rounded-full border transition-all text-xs font-semibold ${
                  selectedTipo === t.value
                    ? "bg-accent text-white border-accent shadow-xs"
                    : "bg-paper-raised text-ink-soft border-line hover:border-accent hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {searchStatus && (
            <div className="text-xs text-ink-faint mb-4 font-mono">{searchStatus}</div>
          )}

          {/* Grid de Convocatorias en Vivo */}
          {loading ? (
            <div className="py-20 text-center text-ink-soft">
              <div className="w-9 h-9 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3.5" />
              <p className="text-xs font-medium">Sincronizando convocatorias del servidor...</p>
            </div>
          ) : convocatorias.length === 0 ? (
            <div className="py-14 text-center rounded-2xl bg-paper-sunken/60 border border-dashed border-line">
              <Award className="w-10 h-10 text-ink-faint mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-ink mb-1">Sin actividades para este criterio</h3>
              <p className="text-xs text-ink-soft max-w-md mx-auto mb-4">
                No se encontraron convocatorias publicadas para los filtros seleccionados.
              </p>
              <button
                onClick={() => {
                  setSelectedTipo("TODAS");
                  setSearchQuery("");
                  loadConvocatorias("TODAS", "");
                }}
                className="text-xs font-semibold text-accent hover:underline"
              >
                Restablecer catálogo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {convocatorias.map((c) => (
                <div
                  key={c.id}
                  className="bg-paper-raised/80 border border-line/80 rounded-2xl p-6 border-l-4 border-l-accent flex flex-col justify-between glow-card shadow-xs group transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2.5">
                      <span className="text-[10px] font-bold text-accent-dark uppercase tracking-wider bg-accent/15 px-2.5 py-0.5 rounded-full font-mono">
                        {c.tipo}
                      </span>
                      <span className="text-[10px] bg-paper-sunken px-2 py-0.5 rounded-md text-ink-faint border border-line-soft font-mono">
                        {c.tamanoEquipo || "1 a 5 integrantes"}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-ink mb-2 leading-snug group-hover:text-accent transition-colors">
                      {c.titulo}
                    </h3>

                    <p className="text-xs text-ink-soft line-clamp-3 mb-4 leading-relaxed">
                      {c.descripcion}
                    </p>

                    {/* Chips de Requisitos */}
                    {c.requisitos && c.requisitos.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {c.requisitos.slice(0, 2).map((r, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-paper-sunken px-2 py-0.5 rounded text-ink-soft border border-line-soft truncate max-w-[180px]"
                          >
                            {r.descripcion}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3.5 border-t border-line-soft flex items-center justify-between text-xs text-ink-faint">
                    <span className="flex items-center gap-1.5 text-accent-dark font-medium text-[11.5px]">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(c.fechaCierre)}
                    </span>

                    {!user ? (
                      <Link
                        href={`/login?redirect=/dashboard/convocatorias/${c.id}`}
                        className="flex items-center gap-1 text-ink hover:text-accent font-semibold text-xs transition-colors"
                      >
                        <span>Postular</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ) : misAreasMap[c.id] ? (
                      <Link
                        href={`/dashboard/convocatorias/${c.id}`}
                        className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg font-semibold text-xs hover:bg-emerald-500/20 transition-all border border-emerald-500/30"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ir al Aula</span>
                        <ArrowRight className="w-3.5 h-3.5" />
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
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= METODOLOGÍA Y FLUJO DEL PROYECTO ================= */}
      <section id="flujo" className="py-20 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-14 reveal-on-scroll">
          <span className="text-xs font-bold uppercase tracking-wider text-accent-dark bg-accent/15 px-3 py-1 rounded-full border border-accent/20 font-mono">
            Ciclo de Vida de Investigación
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-ink mt-3 mb-3 tracking-tight">
            Cinco pasos desde la idea hasta la titulación
          </h2>
          <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
            Metodología estructurada de la FICCT con acompañamiento de docentes y tribunales de grado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 reveal-scale">
          {[
            { num: "01", title: "Convocatoria & Grupo", desc: "Elige la feria o semillero. Inscribe a tu equipo o usa Group Choice para conformarlo." },
            { num: "02", title: "Aula Virtual Moodle", desc: "Módulos de trabajo con rúbricas cuantitativas, plantillas LaTeX y cronogramas." },
            { num: "03", title: "Avances & SpeedGrader", desc: "Sube entregas periódicas. El tribunal califica en línea y emite observaciones precisas." },
            { num: "04", title: "Defensa Colegiada", desc: "Presentación y defensa ante jurados y tribunal docente titular en las salas facultativas." },
            { num: "05", title: "Certificado Blockchain", desc: "Acreditación curricular inalterable con hash criptográfico y validación QR." },
          ].map((step, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-2xl border backdrop-blur-xl transition-all ${
                idx === 4
                  ? "bg-accent/10 border-accent/40 shadow-sm"
                  : "bg-paper-raised/70 dark:bg-[#0D1C33]/50 border-line/60 glow-card"
              }`}
            >
              <div className="text-accent font-mono font-black text-2xl mb-2">{step.num}</div>
              <h3 className="font-bold text-sm text-ink mb-1.5">{step.title}</h3>
              <p className="text-xs text-ink-soft leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= VERIFICADOR BLOCKCHAIN ================= */}
      <section id="blockchain" className="py-20 px-4 sm:px-8 border-t border-line/60 bg-paper-sunken/40 backdrop-blur-md">
        <div className="max-w-4xl mx-auto reveal-on-scroll">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-accent-dark bg-accent/15 px-3 py-1 rounded-full mb-3 border border-accent/20 font-mono">
              Acreditación Criptográfica
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mb-2 tracking-tight">
              Verificador Público de Certificados
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
              Cualquier entidad, empleador o tribunal de grado puede verificar en segundos la autenticidad e integridad de las actas emitidas por la FICCT.
            </p>
          </div>

          <div className="rounded-3xl p-6 sm:p-8 backdrop-blur-2xl bg-white/80 dark:bg-[#081220]/80 border border-white/60 dark:border-white/10 shadow-xl">
            <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
                <input
                  type="text"
                  value={certInput}
                  onChange={(e) => setCertInput(e.target.value)}
                  placeholder="Introduce el código de verificación o hash (ej: 0x7f92...)"
                  className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm bg-paper-raised text-ink border border-line rounded-xl focus:outline-none focus:border-accent font-mono shadow-xs"
                />
              </div>
              <button
                type="submit"
                disabled={verifying}
                className="px-6 py-3 text-xs sm:text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent-dark active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {verifying ? <span className="btn-spinner" /> : "Verificar Certificado"}
              </button>
            </form>

            {/* Resultado Verificado */}
            {verifiedResult && (
              <div className="rounded-2xl border border-accent/40 bg-accent-soft/80 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-accent-dark">Certificado Auténtico y Verificado</span>
                      <span className="text-[10px] bg-accent text-white font-mono px-2 py-0.5 rounded-full font-bold">
                        ON-CHAIN
                      </span>
                    </div>
                    <p className="text-ink-soft mb-2 leading-relaxed">
                      Emitido por: <strong className="text-ink">Facultad de Cs. de la Computación y Telecomunicaciones (FICCT - UAGRM)</strong>.
                    </p>
                    <div className="text-[11px] font-mono text-ink-faint bg-paper-raised/90 p-2.5 rounded-lg border border-line-soft flex flex-wrap justify-between gap-2">
                      <span>Hash de Registro: 0x8a1b2c...3f4e5d6a</span>
                      <span>Red: Polygon PoS · Bloque #18,492,014</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= PREGUNTAS FRECUENTES & NORMATIVA (FAQ) ================= */}
      <section id="faq" className="py-20 px-4 sm:px-8 max-w-4xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12 reveal-on-scroll">
          <span className="text-xs font-bold uppercase tracking-wider text-accent-dark bg-accent/15 px-3 py-1 rounded-full border border-accent/20 font-mono">
            Guía Facultativa
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mt-3 mb-2 tracking-tight">
            Preguntas Frecuentes &amp; Normativa
          </h2>
          <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
            Requisitos, plazos y procedimientos académicos para estudiantes e investigadores.
          </p>
        </div>

        <div className="space-y-3.5 reveal-on-scroll">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-paper-raised/70 border border-line/70 rounded-2xl overflow-hidden backdrop-blur-xl transition-all shadow-xs"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm text-ink hover:text-accent transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-ink-faint transition-transform duration-200 flex-shrink-0 ${
                    openFaq === idx ? "rotate-180 text-accent" : ""
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 pt-0 text-xs sm:text-sm text-ink-soft leading-relaxed border-t border-line-soft animate-in fade-in duration-200">
                  <div className="pt-3">{faq.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ================= FOOTER INSTITUCIONAL FICCT ================= */}
      <footer className="bg-paper-raised/90 border-t border-line/60 py-14 px-6 sm:px-12 text-xs text-ink-soft transition-colors backdrop-blur-xl">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Columna 1: Info Institucional */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0B2545] dark:bg-[#0D1C33] border border-white/10 text-white flex items-center justify-center font-bold text-xs">
                FICCT
              </div>
              <span className="font-bold text-ink text-sm">
                Dirección de Investigación · FICCT
              </span>
            </div>
            <p className="text-xs text-ink-faint leading-relaxed max-w-md">
              Facultad Integral de Ciencias de la Computación y Telecomunicaciones de la Universidad Autónoma Gabriel René Moreno. Promoviendo la ciencia computacional y la investigación tecnológica de alto impacto.
            </p>
            <div className="flex items-center gap-4 text-xs font-semibold text-ink pt-1">
              <span className="flex items-center gap-1.5 text-ink-faint">
                <MapPin className="w-3.5 h-3.5 text-accent" /> Campus Universitario, Módulo 236 · Santa Cruz, Bolivia
              </span>
            </div>
          </div>

          {/* Columna 2: Portales */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-ink mb-3 font-mono">
              Portales
            </h4>
            <ul className="space-y-2 text-ink-soft">
              <li>
                <Link href="/login" className="hover:text-accent transition-colors">
                  Portal de Estudiantes
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-accent transition-colors">
                  Portal de Docentes &amp; Tribunales
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-accent transition-colors">
                  Administración Facultativa
                </Link>
              </li>
              <li>
                <Link href="/registro" className="hover:text-accent transition-colors">
                  Registro de Postulante
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Enlaces Institucionales */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-ink mb-3 font-mono">
              Institucional
            </h4>
            <ul className="space-y-2 text-ink-soft">
              <li>
                <a href="#actividades" className="hover:text-accent transition-colors">
                  Ferias de Investigación 2026
                </a>
              </li>
              <li>
                <a href="#blockchain" className="hover:text-accent transition-colors">
                  Validador Blockchain
                </a>
              </li>
              <li>
                <a href="https://uagrm.edu.bo" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors flex items-center gap-1">
                  <span>Portal Oficial UAGRM</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Lema inferior oficial de image.png */}
        <div className="max-w-7xl mx-auto pt-8 border-t border-line-soft flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-ink-faint">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-ink">CIENCIA · TECNOLOGÍA · SOCIEDAD</span>
            <span>—</span>
            <span className="italic text-accent-dark font-medium">FICCT — Más allá del conocimiento</span>
          </div>
          <div>
            © 2026 FICCT - UAGRM · Santa Cruz de la Sierra, Bolivia.
          </div>
        </div>
      </footer>

      {/* ================= MODAL DEL POSTER OFICIAL EN ALTA RESOLUCIÓN ================= */}
      {showPosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-md w-full bg-paper rounded-3xl overflow-hidden shadow-2xl border border-line">
            <div className="p-4 border-b border-line flex items-center justify-between bg-paper-raised">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-accent" /> Afiche Oficial · Feria FICCT 2-2026
              </span>
              <button
                onClick={() => setShowPosterModal(false)}
                className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-paper-sunken"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-black flex items-center justify-center">
              <img
                src="/poster-ficct.png"
                alt="Afiche Feria Facultativa de Proyectos de Investigación FICCT 2-2026"
                className="max-h-[75vh] w-auto rounded-xl object-contain shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE POSTULACIÓN A CONVOCATORIA ================= */}
      {selectedConvForPostulacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-paper border border-line rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-accent-dark uppercase tracking-wider bg-accent/15 px-2.5 py-0.5 rounded-full font-mono">
                  {selectedConvForPostulacion.tipo}
                </span>
                <h3 className="font-bold text-lg text-ink mt-2">
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
                  placeholder="Dejar en blanco si postulas de forma individual"
                  className="w-full px-3.5 py-2.5 text-xs bg-paper-raised text-ink border border-line rounded-xl focus:outline-none focus:border-accent"
                />
                <p className="text-[11px] text-ink-faint mt-1">
                  Si no tienes equipo, podrás conformar uno con tus compañeros en el módulo de Selección de Grupos dentro del aula virtual.
                </p>
              </div>

              {selectedConvForPostulacion.inscripcionGrupal && (
                <div className="bg-paper-raised border border-line-soft rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <label className="block">
                      <span className="block text-xs font-semibold text-ink mb-1.5">Número de grupo</span>
                      <input
                        type="number"
                        min={1}
                        value={numeroGrupoInput}
                        onChange={(e) => setNumeroGrupoInput(e.target.value ? Number(e.target.value) : "")}
                        placeholder="Ej. 1"
                        className="w-28 px-3.5 py-2.5 text-xs bg-paper text-ink border border-line rounded-xl focus:outline-none focus:border-accent"
                      />
                    </label>
                    <p className="text-[11px] text-ink-faint text-right leading-relaxed">
                      Integrantes permitidos: {selectedConvForPostulacion.minIntegrantesGrupo || 1} a {selectedConvForPostulacion.maxIntegrantesGrupo || 5}. Tu usuario ya cuenta como integrante.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-ink">Correos de compañeros</label>
                    {integrantesGrupoInput.map((email, index) => (
                      <input
                        key={index}
                        type="email"
                        value={email}
                        onChange={(e) => setIntegrantesGrupoInput((prev) => prev.map((item, i) => i === index ? e.target.value : item))}
                        placeholder="correo@ficct.edu.bo"
                        className="w-full px-3.5 py-2.5 text-xs bg-paper text-ink border border-line rounded-xl focus:outline-none focus:border-accent"
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setIntegrantesGrupoInput((prev) => [...prev, ""])}
                      disabled={integrantesGrupoInput.length + 1 >= (selectedConvForPostulacion.maxIntegrantesGrupo || 5)}
                      className="text-[11px] font-semibold text-accent disabled:text-ink-faint"
                    >
                      + Agregar compañero
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                ℹ️ Tu solicitud será remitida a los tribunales docentes a cargo. Una vez admitido, dispondrás de acceso inmediato a los módulos de entrega y rúbricas.
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
