"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/context/ThemeContext";
import {
  Home,
  FileText,
  PlusCircle,
  Users,
  LogOut,
  LayoutDashboard,
  FileEdit,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout, canViewModule, canEditModule } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (user.estado === "SUSPENDIDO") {
        logout();
        router.push("/login?error=suspended");
      }
    }
  }, [user, loading, router, logout]);

  // Cerrar menú móvil al navegar
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper text-ink-soft">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Cargando sesión...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const getInitial = (name?: string) => (name ? name.charAt(0).toUpperCase() : "U");

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-paper transition-colors duration-300">
      {/* ================= BARRA SUPERIOR EN MÓVIL / TABLET (< 1024px) ================= */}
      <header className="lg:hidden sticky top-0 z-40 bg-paper-raised/90 backdrop-blur-md border-b border-line px-4 py-3 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menú de navegación"
            className="p-1.5 -ml-1 rounded-xl text-ink hover:bg-paper-sunken border border-line-soft transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link href="/" className="font-serif text-lg tracking-tight">
            <b className="font-bold text-ink">FICCT</b>
            <span className="text-xs text-ink-faint ml-1.5 font-sans">Investigación</span>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-accent text-white font-bold text-xs flex items-center justify-center">
              {getInitial(user.nombre)}
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border-2 border-paper-raised status-dot-ping" />
          </div>
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-ink-faint hover:text-danger hover:bg-danger-soft/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ================= MENÚ DESPLEGABLE MÓVIL (DRAWER) ================= */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed top-0 left-0 bottom-0 w-72 max-w-[82vw] bg-paper-raised border-r border-line p-5 shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 mb-3 border-b border-line-soft">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="font-serif text-lg tracking-tight">
                <b className="font-bold text-ink">FICCT</b>
                <span className="block text-xs font-sans text-ink-faint">Investigación &amp; Innovación</span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-paper-sunken"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-ink-soft hover:bg-paper-sunken transition-colors"
              >
                <Home className="w-4 h-4 text-ink-faint" />
                <span>Portal público</span>
              </Link>

              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  pathname === "/dashboard"
                    ? "bg-accent-soft text-accent-dark font-semibold shadow-xs"
                    : "text-ink-soft hover:bg-paper-sunken"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Panel Principal</span>
              </Link>

              {canViewModule("CONVOCATORIAS") && (
                <Link
                  href="/dashboard/convocatorias"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    pathname === "/dashboard/convocatorias"
                      ? "bg-accent-soft text-accent-dark font-semibold shadow-xs"
                      : "text-ink-soft hover:bg-paper-sunken"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Convocatorias y Ferias</span>
                </Link>
              )}

              {canEditModule("CONVOCATORIAS") && (
                <Link
                  href="/dashboard/convocatorias/nueva"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    pathname === "/dashboard/convocatorias/nueva"
                      ? "bg-accent-soft text-accent-dark font-semibold shadow-xs"
                      : "text-ink-soft hover:bg-paper-sunken"
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Nueva convocatoria</span>
                </Link>
              )}

              <Link
                href="/dashboard/documentos"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  pathname === "/dashboard/documentos"
                    ? "bg-accent-soft text-accent-dark font-semibold shadow-xs"
                    : "text-ink-soft hover:bg-paper-sunken"
                }`}
              >
                <FileEdit className="w-4 h-4" />
                <span className="flex-1">Documentos &amp; IA</span>
                <span className="text-[10px] bg-accent/20 text-accent-dark px-1.5 py-0.5 rounded font-bold">
                  Colaborativo
                </span>
              </Link>

              <Link
                href="/dashboard/cursos"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  pathname.startsWith("/dashboard/cursos")
                    ? "bg-accent-soft text-accent-dark font-semibold shadow-xs"
                    : "text-ink-soft hover:bg-paper-sunken"
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span className="flex-1">Aulas &amp; Tareas</span>
                <span className="text-[10px] bg-seal/20 text-seal-dark px-1.5 py-0.5 rounded font-bold">
                  Moodle
                </span>
              </Link>

              {canViewModule("USUARIOS") && (
                <Link
                  href="/dashboard/usuarios"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    pathname === "/dashboard/usuarios"
                      ? "bg-accent-soft text-accent-dark font-semibold shadow-xs"
                      : "text-ink-soft hover:bg-paper-sunken"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Gestión de Usuarios</span>
                </Link>
              )}
            </nav>

            <div className="mt-auto pt-4 border-t border-line-soft flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-accent text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                  {getInitial(user.nombre)}
                </div>
                <div className="text-xs min-w-0">
                  <b className="block text-ink font-semibold truncate">
                    {user.nombre} {user.apellido}
                  </b>
                  <span className="text-ink-faint capitalize text-[11px] block">
                    {user.rol.toLowerCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-2 rounded-lg text-ink-faint hover:text-danger hover:bg-danger-soft/40 transition-all ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ================= SIDEBAR DE ESCRITORIO (>= 1024px) ================= */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-paper-raised border-r border-line p-5 sticky top-0 h-screen flex-col transition-colors">
        <div className="pb-4 mb-4 border-b border-line-soft flex items-center justify-between">
          <Link href="/" className="font-serif text-lg tracking-tight block">
            <b className="font-bold text-ink hover:text-accent transition-colors">FICCT</b>
            <span className="block text-xs font-sans text-ink-faint mt-0.5">
              Gestión de Investigación
            </span>
          </Link>
          <ThemeToggle />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-ink-soft hover:bg-paper-sunken transition-colors"
          >
            <Home className="w-4 h-4 text-ink-faint" />
            <span>Portal público</span>
          </Link>

          <Link
            href="/dashboard"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
              pathname === "/dashboard"
                ? "bg-accent-soft text-accent-dark font-semibold shadow-xs"
                : "text-ink-soft hover:bg-paper-sunken"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Panel Principal</span>
          </Link>

          {canViewModule("CONVOCATORIAS") && (
            <Link
              href="/dashboard/convocatorias"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === "/dashboard/convocatorias"
                  ? "bg-accent-soft text-accent-dark font-semibold shadow-xs"
                  : "text-ink-soft hover:bg-paper-sunken"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Convocatorias y Ferias</span>
            </Link>
          )}

          {canEditModule("CONVOCATORIAS") && (
            <Link
              href="/dashboard/convocatorias/nueva"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === "/dashboard/convocatorias/nueva"
                  ? "bg-accent-soft text-accent-dark font-semibold shadow-xs"
                  : "text-ink-soft hover:bg-paper-sunken"
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nueva convocatoria</span>
            </Link>
          )}

          <Link
            href="/dashboard/documentos"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
              pathname === "/dashboard/documentos"
                ? "bg-accent-soft text-accent-dark font-semibold shadow-xs"
                : "text-ink-soft hover:bg-paper-sunken"
            }`}
          >
            <FileEdit className="w-4 h-4" />
            <span className="flex-1">Documentos &amp; IA</span>
            <span className="text-[10px] bg-accent/20 text-accent-dark px-1.5 py-0.5 rounded font-bold">
              Colaborativo
            </span>
          </Link>

          <Link
            href="/dashboard/cursos"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
              pathname.startsWith("/dashboard/cursos")
                ? "bg-accent-soft text-accent-dark font-semibold shadow-xs"
                : "text-ink-soft hover:bg-paper-sunken"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span className="flex-1">Aulas &amp; Tareas</span>
            <span className="text-[10px] bg-seal/20 text-seal-dark px-1.5 py-0.5 rounded font-bold">
              Moodle
            </span>
          </Link>

          {canViewModule("USUARIOS") && (
            <Link
              href="/dashboard/usuarios"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === "/dashboard/usuarios"
                  ? "bg-accent-soft text-accent-dark font-semibold shadow-xs"
                  : "text-ink-soft hover:bg-paper-sunken"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Gestión de Usuarios</span>
            </Link>
          )}
        </nav>

        {/* Footer Usuario Desktop */}
        <div className="mt-auto pt-4 border-t border-line-soft flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-accent text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                {getInitial(user.nombre)}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-paper-raised status-dot-ping" />
            </div>
            <div className="text-xs min-w-0">
              <b className="block text-ink font-semibold truncate">
                {user.nombre} {user.apellido}
              </b>
              <span className="text-ink-faint capitalize text-[11px] block">
                {user.rol.toLowerCase()}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            title="Cerrar sesión"
            className="p-2 rounded-lg text-ink-faint hover:text-danger hover:bg-danger-soft/40 transition-all ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ================= CONTENIDO PRINCIPAL ================= */}
      <main className="flex-1 min-w-0 p-4 sm:p-7 pb-28 lg:pb-8 overflow-y-auto">
        {children}
      </main>

      {/* ================= BARRA DE NAVEGACIÓN INFERIOR MÓVIL (LIQUID GLASS) ================= */}
      <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-30 h-16 rounded-2xl liquid-glass flex items-center justify-around px-2 shadow-2xl border border-line/60">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10.5px] font-semibold transition-all ${
            pathname === "/" ? "text-accent scale-105" : "text-ink-faint hover:text-ink"
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Inicio</span>
        </Link>

        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10.5px] font-semibold transition-all ${
            pathname === "/dashboard" ? "text-accent scale-105" : "text-ink-faint hover:text-ink"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Panel</span>
        </Link>

        <Link
          href="/dashboard/documentos"
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10.5px] font-semibold transition-all ${
            pathname === "/dashboard/documentos" ? "text-accent scale-105" : "text-ink-faint hover:text-ink"
          }`}
        >
          <FileEdit className="w-4 h-4" />
          <span>Docs</span>
        </Link>

        <Link
          href="/dashboard/cursos"
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10.5px] font-semibold transition-all ${
            pathname.startsWith("/dashboard/cursos") ? "text-accent scale-105" : "text-ink-faint hover:text-ink"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Aulas</span>
        </Link>

        <Link
          href="/dashboard/convocatorias"
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10.5px] font-semibold transition-all ${
            pathname.startsWith("/dashboard/convocatorias") ? "text-accent scale-105" : "text-ink-faint hover:text-ink"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Ferias</span>
        </Link>

        {canViewModule("USUARIOS") && (
          <Link
            href="/dashboard/usuarios"
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10.5px] font-semibold transition-all ${
              pathname === "/dashboard/usuarios" ? "text-accent scale-105" : "text-ink-faint hover:text-ink"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuarios</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
