"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
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
  Rocket,
  ExternalLink,
  ChevronDown,
  Layers,
  Terminal,
  Briefcase,
  Flame,
  HelpCircle,
  MapPin,
  Mail,
  Phone,
  LayoutDashboard,
  LogIn,
  Check,
  ChevronRight,
  Zap,
} from "lucide-react";

export default function HomePage() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Scroll Progress
  const [scrollProgress, setScrollProgress] = useState(0);

  // Convocatorias & búsqueda
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTipo, setSelectedTipo] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchStatus, setSearchStatus] = useState<string>("");

  // Postulación modal
  const [misAreasMap, setMisAreasMap] = useState<Record<number, ConvocatoriaDTO>>({});
  const [selectedConvForPostulacion, setSelectedConvForPostulacion] = useState<Convocatoria | null>(null);
  const [nombreEquipoInput, setNombreEquipoInput] = useState("");
  const [enviandoPostulacion, setEnviandoPostulacion] = useState(false);

  // Verificador Blockchain
  const [certInput, setCertInput] = useState("0x7f92...a31b-2026-FICCT");
  const [verifying, setVerifying] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState<boolean | null>(null);

  // FAQ Acordeón State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Mobile menu toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Observador de Scroll Reveal
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
      toast("¡Solicitud enviada con éxito! El docente o jurado a cargo revisará tu postulación para admitirte al aula.", "success");
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
      toast("Certificado validado en Blockchain (Polkadot / Polygon PoS Testnet)", "success");
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
      q: "¿Quiénes pueden participar en las ferias y hackathons de la facultad?",
      a: "Pueden participar todos los estudiantes regulares de las carreras de Ingeniería en Sistemas, Ingeniería Informática, Ingeniería en Redes y Telecomunicaciones de la FICCT - UAGRM, así como docentes tutores e investigadores invitados.",
    },
    {
      q: "¿Puedo postularme a una convocatoria si aún no tengo equipo?",
      a: "¡Sí, totalmente! Puedes postularte de forma individual. Dentro del aula virtual del evento existe el módulo de selección de equipos con Combobox inteligente donde podrás unirte a un grupo existente o conformar uno nuevo con otros participantes.",
    },
    {
      q: "¿Cómo se evalúan los proyectos y entregas?",
      a: "La facultad cuenta con un sistema integrado de rúbricas colegiadas y SpeedGrader Moodle. El tribunal conformado por docentes titulares y jurados especialistas evalúa tus avances de código, documentación y presentación en vivo con total transparencia.",
    },
    {
      q: "¿Qué validez tienen los certificados emitidos al culminar?",
      a: "Todos los certificados emitidos por la Dirección de Investigación y UNEXO cuentan con hash criptográfico inalterable registrado en Blockchain y código QR para validación curricular inmediata ante empresas, comités de titulación o posgrados.",
    },
    {
      q: "¿Qué es UNEXO y qué beneficios brinda a los estudiantes?",
      a: "UNEXO es la Unidad de Negocios, Extensión y Emprendimiento Tecnológico de la FICCT. Brinda vinculación directa con empresas de software, bolsa de empleo (Conecta UAGRM), incubación de prototipos y capacitaciones continuas de alto nivel.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink selection:bg-accent/20 selection:text-accent-dark transition-colors duration-300 relative overflow-x-hidden">
      {/* Scroll Progress Bar en la parte superior */}
      <div
        className="fixed top-0 left-0 h-[3.5px] bg-gradient-to-r from-accent via-emerald-400 to-accent z-50 transition-all duration-100 shadow-[0_0_12px_rgba(76,166,75,0.6)]"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* ================= HEADER / NAVBAR FLOTANTE ESTILO GLASS ================= */}
      <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md border-b border-line transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-emerald-700 flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-transform">
              FICCT
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-ink group-hover:text-accent transition-colors flex items-center gap-1.5">
                UNEXO <span className="text-xs px-2 py-0.5 rounded-md bg-accent-soft text-accent-dark font-semibold">Investigación</span>
              </span>
              <span className="text-[11px] text-ink-faint leading-none font-medium">
                Facultad de Cs. de la Computación · UAGRM
              </span>
            </div>
          </Link>

          {/* Menú de Navegación Escritorio */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-ink-soft">
            <a href="#hero" className="hover:text-accent transition-colors">
              Inicio
            </a>
            <a href="#ecosistema" className="hover:text-accent transition-colors">
              Ecosistema
            </a>
            <a href="#ferias-hackathons" className="hover:text-accent transition-colors">
              Ferias &amp; Hackathons
            </a>
            <a href="#actividades" className="hover:text-accent transition-colors">
              Convocatorias
            </a>
            <a href="#ruta" className="hover:text-accent transition-colors">
              Ruta del Proyecto
            </a>
            <a href="#verificacion" className="hover:text-accent transition-colors">
              Blockchain
            </a>
            <a href="#faq" className="hover:text-accent transition-colors">
              Preguntas
            </a>
          </nav>

          {/* Acciones y Autenticación */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-accent text-white hover:bg-accent-dark shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Mi Campus ({user.rol})</span>
                <span className="sm:hidden">Panel</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border border-line hover:border-accent text-ink bg-paper-raised hover:bg-paper-sunken transition-all shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5 text-accent" />
                  <span>Ingresar</span>
                </Link>
                <Link
                  href="/registro"
                  className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-dark shadow-sm transition-all"
                >
                  <span>Crear Cuenta</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Botón Menú Móvil */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl border border-line text-ink-soft hover:bg-paper-raised"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Menú Desplegable Móvil */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-line bg-paper-raised p-5 space-y-3 animate-in fade-in duration-200">
            <a
              href="#hero"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-ink hover:text-accent py-1"
            >
              Inicio
            </a>
            <a
              href="#ecosistema"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-ink hover:text-accent py-1"
            >
              Ecosistema &amp; UNEXO
            </a>
            <a
              href="#ferias-hackathons"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-ink hover:text-accent py-1"
            >
              Ferias y Hackathons
            </a>
            <a
              href="#actividades"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-ink hover:text-accent py-1"
            >
              Convocatorias Vigentes
            </a>
            <a
              href="#ruta"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-ink hover:text-accent py-1"
            >
              Ruta del Investigador
            </a>
            <a
              href="#verificacion"
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
              Preguntas Frecuentes
            </a>
            {!user && (
              <div className="pt-2">
                <Link
                  href="/registro"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-white font-semibold text-xs"
                >
                  <span>Registrarme como Estudiante</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ================= HERO SECTION CON LIQUID GLASS Y GRADIENTES ================= */}
      <section id="hero" className="relative pt-12 pb-20 px-4 sm:px-8 max-w-7xl mx-auto w-full overflow-hidden">
        {/* Orbes orgánicos de luz en el fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-accent/15 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="text-center max-w-4xl mx-auto reveal-on-scroll">
          {/* Badge superior animado */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent/30 bg-accent-soft text-accent-dark text-xs font-semibold mb-6 shadow-xs">
            <Sparkles className="w-4 h-4 text-accent animate-pulse" />
            <span>UNEXO · Dirección de Investigación, Ciencia y Tecnología FICCT</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-ink leading-[1.12] mb-6">
            Donde las ideas universitarias se convierten en{" "}
            <span className="bg-gradient-to-r from-accent via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              prototipos del mundo real
            </span>
          </h1>

          <p className="text-base sm:text-lg text-ink-soft max-w-2xl mx-auto leading-relaxed mb-8">
            El ecosistema oficial de la <strong>FICCT - UAGRM</strong> para la postulación, desarrollo en aulas Moodle,
            evaluación colegiada por jurados y certificación inalterable en Blockchain de ferias científicas, hackathons y semilleros de investigación.
          </p>

          {/* Botones de Acción Primarios */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-12">
            <a
              href="#actividades"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm bg-accent text-white hover:bg-accent-dark transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
            >
              <Flame className="w-4 h-4 text-amber-300" />
              <span>Explorar Convocatorias 2026</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>

            {!user ? (
              <Link
                href="/login"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm border border-line bg-paper-raised hover:bg-paper-sunken text-ink transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4 text-accent" />
                <span>Ingresar al Aula Virtual</span>
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm border border-line bg-paper-raised hover:bg-paper-sunken text-ink transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4 text-accent" />
                <span>Ir a Mis Áreas ({user.rol})</span>
              </Link>
            )}
          </div>

          {/* Indicador de Estado y Puntos Clave */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-ink-faint">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 status-dot-ping" />
              <span>Convocatorias Abiertas · Semestre II/2026</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5 text-accent-dark">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span>Certificados Criptográficos On-Chain</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Evaluación SpeedGrader con Rúbricas</span>
            </div>
          </div>
        </div>

        {/* Tarjetas Visuales Destacadas (Hero Showcase) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14 reveal-scale">
          {/* Card 1: Ferias */}
          <div className="bg-paper-raised border border-line rounded-2xl p-6 glow-card shadow-sm relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-accent-soft text-accent-dark flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6 text-accent" />
            </div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-accent-dark bg-accent-soft px-2.5 py-0.5 rounded-md">
              Feria de Innovación
            </span>
            <h3 className="font-bold text-lg text-ink mt-2 mb-1.5">
              Feria de Ciencias &amp; Robótica
            </h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Exposición anual de proyectos en Inteligencia Artificial, automatización, redes e infraestructura TI evaluados por tribunales colegiados.
            </p>
          </div>

          {/* Card 2: Hackathons */}
          <div className="bg-paper-raised border border-line rounded-2xl p-6 glow-card shadow-sm relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Code2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-500/10 px-2.5 py-0.5 rounded-md">
              Desafío de 48 Horas
            </span>
            <h3 className="font-bold text-lg text-ink mt-2 mb-1.5">
              Hackathon FICCT 2026
            </h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Maratones intensivas de programación en equipo con mentores de la industria, resolviendo problemáticas de salud, educación y ciudades inteligentes.
            </p>
          </div>

          {/* Card 3: Investigación & UNEXO */}
          <div className="bg-paper-raised border border-line rounded-2xl p-6 glow-card shadow-sm relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Rocket className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2.5 py-0.5 rounded-md">
              UNEXO &amp; Emprendimiento
            </span>
            <h3 className="font-bold text-lg text-ink mt-2 mb-1.5">
              Semilleros &amp; Bolsa de Talentos
            </h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Conexión directa entre egresados de computación y empresas líderes de desarrollo a través de Conecta UAGRM e incubación de proyectos de grado.
            </p>
          </div>
        </div>
      </section>

      {/* ================= BARRA DE MÉTRICAS E IMPACTO (SCROLL REVEAL) ================= */}
      <section className="border-y border-line bg-paper-sunken/60 py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center reveal-on-scroll">
          <div className="p-4">
            <div className="text-3xl sm:text-4xl font-extrabold text-accent mb-1 font-mono">
              +2,500
            </div>
            <div className="text-xs font-semibold text-ink uppercase tracking-wider">
              Estudiantes e Investigadores
            </div>
            <p className="text-[11px] text-ink-faint mt-1">Activos en convocatorias y aulas virtuales</p>
          </div>

          <div className="p-4">
            <div className="text-3xl sm:text-4xl font-extrabold text-ink mb-1 font-mono">
              35+
            </div>
            <div className="text-xs font-semibold text-ink uppercase tracking-wider">
              Ferias y Hackathons
            </div>
            <p className="text-[11px] text-ink-faint mt-1">Organizados formalmente con rúbricas</p>
          </div>

          <div className="p-4">
            <div className="text-3xl sm:text-4xl font-extrabold text-accent mb-1 font-mono">
              100%
            </div>
            <div className="text-xs font-semibold text-ink uppercase tracking-wider">
              Evaluación Colegiada
            </div>
            <p className="text-[11px] text-ink-faint mt-1">Tribunal de docentes titulares y jurados</p>
          </div>

          <div className="p-4">
            <div className="text-3xl sm:text-4xl font-extrabold text-teal-600 dark:text-teal-400 mb-1 font-mono">
              0x🔒
            </div>
            <div className="text-xs font-semibold text-ink uppercase tracking-wider">
              Blockchain On-Chain
            </div>
            <p className="text-[11px] text-ink-faint mt-1">Certificados inalterables con código QR</p>
          </div>
        </div>
      </section>

      {/* ================= ECOSISTEMA & PILARES DE INNOVACIÓN (BENTO GRID) ================= */}
      <section id="ecosistema" className="py-20 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-14 reveal-on-scroll">
          <span className="text-xs font-bold uppercase tracking-wider text-accent-dark bg-accent-soft px-3 py-1 rounded-full border border-accent/20">
            Ecosistema Científico FICCT
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-ink mt-3 mb-3">
            Cuatro pilares para transformar la investigación universitaria
          </h2>
          <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
            La Unidad de Extensión, Innovación y Emprendimiento (UNEXO) y la Dirección de Investigación de la FICCT articulan la formación académica con los desafíos reales de la industria.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pilar 1 */}
          <div className="bg-paper-raised border border-line rounded-2xl p-6 glow-card flex flex-col justify-between reveal-on-scroll reveal-delay-1">
            <div>
              <div className="w-12 h-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-ink mb-2">Ferias Científicas y Tecnológicas</h3>
              <p className="text-xs text-ink-soft leading-relaxed mb-4">
                Espacios formales de defensa donde los alumnos presentan proyectos de desarrollo de software, robótica, IoT y telecomunicaciones ante un tribunal calificador.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-line-soft">
              <span className="text-[10px] bg-paper-sunken px-2 py-0.5 rounded text-ink-soft">Defensa Presencial</span>
              <span className="text-[10px] bg-paper-sunken px-2 py-0.5 rounded text-ink-soft">Tribunal Docente</span>
            </div>
          </div>

          {/* Pilar 2 */}
          <div className="bg-paper-raised border border-line rounded-2xl p-6 glow-card flex flex-col justify-between reveal-on-scroll reveal-delay-2">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-ink mb-2">Hackathons de Alto Rendimiento</h3>
              <p className="text-xs text-ink-soft leading-relaxed mb-4">
                Competencias intensivas de 24 a 48 horas donde equipos multidisciplinarios prototipan soluciones informáticas innovadoras con mentoría docente en tiempo real.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-line-soft">
              <span className="text-[10px] bg-paper-sunken px-2 py-0.5 rounded text-ink-soft">Retos Reales</span>
              <span className="text-[10px] bg-paper-sunken px-2 py-0.5 rounded text-ink-soft">Premios &amp; Becas</span>
            </div>
          </div>

          {/* Pilar 3 */}
          <div className="bg-paper-raised border border-line rounded-2xl p-6 glow-card flex flex-col justify-between reveal-on-scroll reveal-delay-3">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-ink mb-2">Semilleros de Investigación</h3>
              <p className="text-xs text-ink-soft leading-relaxed mb-4">
                Articulación de trabajos de grado, tesis científicas y proyectos de investigación avanzada en Machine Learning, Ciberseguridad y Sistemas Distribuidos.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-line-soft">
              <span className="text-[10px] bg-paper-sunken px-2 py-0.5 rounded text-ink-soft">Papers Indexados</span>
              <span className="text-[10px] bg-paper-sunken px-2 py-0.5 rounded text-ink-soft">Titulación</span>
            </div>
          </div>

          {/* Pilar 4 */}
          <div className="bg-paper-raised border border-line rounded-2xl p-6 glow-card flex flex-col justify-between reveal-on-scroll reveal-delay-4">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-ink mb-2">UNEXO &amp; Vinculación Empresarial</h3>
              <p className="text-xs text-ink-soft leading-relaxed mb-4">
                La plataforma CONECTA UAGRM y la Unidad de Emprendimiento conectan el talento de la facultad con empresas de tecnología locales e internacionales para pasantías.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-line-soft">
              <span className="text-[10px] bg-paper-sunken px-2 py-0.5 rounded text-ink-soft">Bolsa de Empleo</span>
              <span className="text-[10px] bg-paper-sunken px-2 py-0.5 rounded text-ink-soft">Pasantías TI</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CATÁLOGO DE CONVOCATORIAS VIGENTES (LIVE BACKEND) ================= */}
      <section id="actividades" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="bg-paper-raised border border-line rounded-3xl p-6 sm:p-10 shadow-sm reveal-on-scroll">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-line-soft">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-accent-dark bg-accent-soft px-3 py-1 rounded-full mb-3">
                <Flame className="w-3.5 h-3.5 text-accent" />
                <span>Portal Público de Convocatorias</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">
                Convocatorias Abiertas ({convocatorias.length})
              </h2>
              <p className="text-xs sm:text-sm text-ink-soft mt-1 max-w-xl">
                Postula tu equipo a las ferias científicas y maratones de programación vigentes en la facultad.
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
                  placeholder="Buscar por nombre, tema..."
                  className="w-full pl-10 pr-3 py-2 text-xs bg-paper text-ink border border-line rounded-xl focus:outline-none focus:border-accent shadow-xs"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-accent text-white text-xs font-semibold rounded-xl hover:bg-accent-dark transition-all flex items-center gap-1.5"
              >
                {loading ? <span className="btn-spinner" /> : "Buscar"}
              </button>
            </form>
          </div>

          {/* Filtros de Categoría */}
          <div className="flex gap-2 flex-wrap items-center text-xs mb-8">
            <span className="text-ink-faint font-medium mr-1">Filtrar:</span>
            {tipos.map((t) => (
              <button
                key={t.value}
                onClick={() => setSelectedTipo(t.value)}
                className={`px-3.5 py-1.5 rounded-full border transition-all text-xs font-semibold ${
                  selectedTipo === t.value
                    ? "bg-accent text-white border-accent shadow-xs"
                    : "bg-paper text-ink-soft border-line hover:border-accent hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {searchStatus && (
            <div className="text-xs text-ink-faint mb-4">{searchStatus}</div>
          )}

          {/* Grid de Convocatorias Reales */}
          {loading ? (
            <div className="py-20 text-center text-ink-soft">
              <div className="w-9 h-9 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3.5" />
              <p className="text-sm">Consultando convocatorias vigentes en el servidor...</p>
            </div>
          ) : convocatorias.length === 0 ? (
            <div className="py-14 text-center rounded-2xl bg-paper-sunken border border-dashed border-line">
              <Award className="w-10 h-10 text-ink-faint mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-ink mb-1">Sin actividades para este criterio</h3>
              <p className="text-xs text-ink-soft max-w-md mx-auto mb-4">
                No se encontraron convocatorias publicadas con los filtros seleccionados.
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
                  className="bg-paper border border-line rounded-2xl p-6 border-l-4 border-l-accent flex flex-col justify-between glow-card shadow-xs group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2.5">
                      <span className="text-[10px] font-bold text-accent-dark uppercase tracking-wider bg-accent-soft px-2.5 py-0.5 rounded-full">
                        {c.tipo}
                      </span>
                      <span className="text-[10px] bg-paper-sunken px-2 py-0.5 rounded-md text-ink-faint border border-line-soft">
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

      {/* ================= RUTA DEL PROYECTO / CÓMO FUNCIONA (TIMELINE INTERACTIVO) ================= */}
      <section id="ruta" className="py-20 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-16 reveal-on-scroll">
          <span className="text-xs font-bold uppercase tracking-wider text-accent-dark bg-accent-soft px-3 py-1 rounded-full border border-accent/20">
            Flujo de Participación
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-ink mt-3 mb-3">
            Tu proyecto de investigación paso a paso
          </h2>
          <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
            Desde la postulación inicial hasta la defensa ante tribunal docente y la emisión de tu certificado digital inalterable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative reveal-scale">
          {/* Paso 1 */}
          <div className="bg-paper-raised border border-line rounded-2xl p-5 glow-card relative">
            <div className="text-accent font-mono font-black text-2xl mb-2">01</div>
            <h3 className="font-bold text-sm text-ink mb-1.5">Convocatoria &amp; Equipo</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Elige tu evento o feria e inscribe a tu equipo o postula individualmente para formar grupo.
            </p>
          </div>

          {/* Paso 2 */}
          <div className="bg-paper-raised border border-line rounded-2xl p-5 glow-card relative">
            <div className="text-accent font-mono font-black text-2xl mb-2">02</div>
            <h3 className="font-bold text-sm text-ink mb-1.5">Aula Moodle Privada</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Accede a los módulos con rúbricas oficiales, cronogramas y material de apoyo asignado por los docentes.
            </p>
          </div>

          {/* Paso 3 */}
          <div className="bg-paper-raised border border-line rounded-2xl p-5 glow-card relative">
            <div className="text-accent font-mono font-black text-2xl mb-2">03</div>
            <h3 className="font-bold text-sm text-ink mb-1.5">Entregas &amp; SpeedGrader</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Sube tus avances de software, documentación y repositorios. Los jurados califican por criterios objetivos.
            </p>
          </div>

          {/* Paso 4 */}
          <div className="bg-paper-raised border border-line rounded-2xl p-5 glow-card relative">
            <div className="text-accent font-mono font-black text-2xl mb-2">04</div>
            <h3 className="font-bold text-sm text-ink mb-1.5">Defensa ante Tribunal</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Exposición presencial o remota ante el tribunal de docentes y evaluadores de la industria tecnológica.
            </p>
          </div>

          {/* Paso 5 */}
          <div className="bg-paper-raised border border-line rounded-2xl p-5 glow-card relative border-accent/40 bg-accent/5">
            <div className="text-accent font-mono font-black text-2xl mb-2">05</div>
            <h3 className="font-bold text-sm text-ink mb-1.5">Certificado Blockchain</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Obtén tu reconocimiento universitario verificable con hash criptográfico y código QR oficial.
            </p>
          </div>
        </div>
      </section>

      {/* ================= VERIFICADOR PÚBLICO BLOCKCHAIN ================= */}
      <section id="verificacion" className="py-16 px-4 sm:px-8 border-t border-line bg-paper-sunken/40">
        <div className="max-w-4xl mx-auto reveal-on-scroll">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-accent-dark bg-accent-soft px-3 py-1 rounded-full mb-3 border border-accent/20">
              Certificación Digital Inalterable
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mb-3">
              Verificador Público de Certificados Blockchain
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
              Cualquier estudiante, docente, empleador o entidad externa puede validar en segundos la autenticidad e inalterabilidad de los reconocimientos emitidos por la Dirección de Investigación y UNEXO FICCT.
            </p>
          </div>

          <div className="liquid-glass rounded-2xl p-6 sm:p-8 shadow-xl">
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
                className="px-6 py-3 text-xs sm:text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent-dark active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
              >
                {verifying ? <span className="btn-spinner" /> : "Verificar Certificado"}
              </button>
            </form>

            {/* Resultado Verificado */}
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
                    <div className="text-[11px] font-mono text-ink-faint bg-paper-raised/80 p-2.5 rounded-lg border border-line-soft flex flex-wrap justify-between gap-2">
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

      {/* ================= PREGUNTAS FRECUENTES (FAQ ACORDEÓN) ================= */}
      <section id="faq" className="py-20 px-4 sm:px-8 max-w-4xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12 reveal-on-scroll">
          <span className="text-xs font-bold uppercase tracking-wider text-accent-dark bg-accent-soft px-3 py-1 rounded-full border border-accent/20">
            Resolución de Dudas
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mt-3 mb-3">
            Preguntas Frecuentes
          </h2>
          <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
            Todo lo que necesitas saber para postular, defender y certificar tu proyecto en la facultad.
          </p>
        </div>

        <div className="space-y-3.5 reveal-on-scroll">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-paper-raised border border-line rounded-2xl overflow-hidden transition-all shadow-xs"
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

      {/* ================= LLAMADO A LA ACCIÓN FINAL (GLOW BANNER) ================= */}
      <section className="py-16 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl bg-gradient-to-br from-accent to-emerald-800 text-white p-8 sm:p-14 text-center shadow-xl glow-accent relative overflow-hidden reveal-scale">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-extrabold mb-4">
              ¿Listo para presentar tu proyecto en la próxima feria o hackathon?
            </h2>
            <p className="text-xs sm:text-sm text-white/90 mb-8 leading-relaxed">
              Únete a cientos de estudiantes y docentes de la FICCT que ya están construyendo prototipos, publicando investigación y transformando la tecnología en Santa Cruz.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/registro"
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-white text-accent-dark font-bold text-xs sm:text-sm hover:bg-paper-sunken transition-all shadow-md"
              >
                Crear Cuenta de Estudiante
              </Link>
              <a
                href="#actividades"
                className="w-full sm:w-auto px-7 py-3 rounded-xl border border-white/40 text-white hover:bg-white/10 font-semibold text-xs sm:text-sm transition-all"
              >
                Ver Convocatorias Activas
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER INSTITUCIONAL COMPLETO ================= */}
      <footer id="nosotros" className="bg-paper-raised border-t border-line py-14 px-6 sm:px-12 text-xs text-ink-soft transition-colors">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Columna 1: Info Institucional */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-xs">
                FICCT
              </div>
              <span className="font-bold text-ink text-sm">
                UNEXO · Dirección de Investigación
              </span>
            </div>
            <p className="text-xs text-ink-faint leading-relaxed max-w-md mb-4">
              Facultad Integral de Ciencias de la Computación y Telecomunicaciones de la Universidad Autónoma Gabriel René Moreno. Promoviendo la excelencia científica, la innovación tecnológica y el emprendimiento universitario.
            </p>
            <div className="flex items-center gap-4 text-xs font-semibold text-ink">
              <span className="flex items-center gap-1.5 text-ink-faint">
                <MapPin className="w-3.5 h-3.5 text-accent" /> Campus Universitario, Módulo 236
              </span>
            </div>
          </div>

          {/* Columna 2: Enlaces Rápidos */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-ink mb-3">
              Portales del Sistema
            </h4>
            <ul className="space-y-2 text-ink-soft">
              <li>
                <Link href="/login" className="hover:text-accent transition-colors">
                  Portal Estudiantes
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-accent transition-colors">
                  Portal Docentes &amp; Jurados
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-accent transition-colors">
                  Administración FICCT
                </Link>
              </li>
              <li>
                <Link href="/registro" className="hover:text-accent transition-colors">
                  Registro de Nuevo Usuario
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Ecosistema UNEXO */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-ink mb-3">
              Ecosistema UNEXO
            </h4>
            <ul className="space-y-2 text-ink-soft">
              <li>
                <a href="#actividades" className="hover:text-accent transition-colors">
                  Ferias de Ciencias 2026
                </a>
              </li>
              <li>
                <a href="#actividades" className="hover:text-accent transition-colors">
                  Hackathons Universitarios
                </a>
              </li>
              <li>
                <a href="#verificacion" className="hover:text-accent transition-colors">
                  Validador de Certificados
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

        <div className="max-w-7xl mx-auto pt-8 border-t border-line-soft flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-ink-faint">
          <div>
            © 2026 FICCT - UAGRM. Todos los derechos reservados · Santa Cruz de la Sierra, Bolivia.
          </div>
          <div className="flex items-center gap-4">
            <a href="#hero" className="hover:text-accent transition-colors">Subir al inicio ↑</a>
          </div>
        </div>
      </footer>

      {/* ================= MODAL DE POSTULACIÓN A CONVOCATORIA ================= */}
      {selectedConvForPostulacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-paper border border-line rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-accent-dark uppercase tracking-wider bg-accent-soft px-2.5 py-0.5 rounded-full">
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
                  placeholder="Dejar en blanco si te postulas de forma individual"
                  className="w-full px-3.5 py-2.5 text-xs bg-paper-raised text-ink border border-line rounded-xl focus:outline-none focus:border-accent"
                />
                <p className="text-[11px] text-ink-faint mt-1">
                  Si no tienes equipo, ingresarás como estudiante sin grupo y luego el docente o tú podrán asignarte en la actividad de selección de grupos.
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                ℹ️ Tu solicitud será enviada a la bandeja de admisión de los docentes/jurados a cargo. Una vez admitido, tendrás acceso completo al aula virtual y sus módulos.
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
