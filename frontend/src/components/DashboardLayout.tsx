"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/context/ThemeContext";
import { resolveFileUrl } from "@/lib/api";
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
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
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
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Cargar preferencia persistida del sidebar
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // Ignorar si localStorage no está disponible
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

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

  // Definición de ítems del menú de navegación
  const navItems = [
    {
      href: "/",
      label: "Portal público",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      href: "/dashboard",
      label: "Panel Principal",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard",
    },
    ...(canViewModule("CONVOCATORIAS")
      ? [
          {
            href: "/dashboard/convocatorias",
            label: "Convocatorias y Ferias",
            icon: FileText,
            isActive: pathname === "/dashboard/convocatorias",
          },
        ]
      : []),
    ...(canEditModule("CONVOCATORIAS")
      ? [
          {
            href: "/dashboard/convocatorias/nueva",
            label: "Nueva convocatoria",
            icon: PlusCircle,
            isActive: pathname === "/dashboard/convocatorias/nueva",
          },
        ]
      : []),
    {
      href: "/dashboard/documentos",
      label: "Documentos & IA",
      icon: FileEdit,
      isActive: pathname === "/dashboard/documentos",
      badge: "Colaborativo",
      badgeColor: "bg-accent/20 text-accent-dark",
    },
    {
      href: "/dashboard/mis-areas",
      label: "Mis Áreas",
      icon: GraduationCap,
      isActive: pathname.startsWith("/dashboard/mis-areas"),
      badge: "Moodle",
      badgeColor: "bg-seal/20 text-seal-dark",
    },
    {
      href: "/dashboard/perfil",
      label: "Mi Perfil",
      icon: UserIcon,
      isActive: pathname === "/dashboard/perfil",
    },
    ...(canViewModule("USUARIOS")
      ? [
          {
            href: "/dashboard/usuarios",
            label: "Gestión de Usuarios",
            icon: Users,
            isActive: pathname === "/dashboard/usuarios",
          },
        ]
      : []),
  ];

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
          <Link href="/dashboard/perfil" title="Mi Perfil" className="relative block">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-accent text-white font-bold text-xs flex items-center justify-center border border-line/40">
              {user.fotoPerfil ? (
                <img
                  src={resolveFileUrl(user.fotoPerfil)}
                  alt={user.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{getInitial(user.nombre)}</span>
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border-2 border-paper-raised status-dot-ping" />
          </Link>
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
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      item.isActive
                        ? "bg-accent-soft text-accent-dark font-semibold shadow-xs"
                        : "text-ink-soft hover:bg-paper-sunken"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto pt-4 border-t border-line-soft flex items-center justify-between">
              <Link
                href="/dashboard/perfil"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 min-w-0 hover:opacity-85 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-accent text-white font-bold text-xs flex items-center justify-center flex-shrink-0 border border-line/40">
                  {user.fotoPerfil ? (
                    <img
                      src={resolveFileUrl(user.fotoPerfil)}
                      alt={user.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{getInitial(user.nombre)}</span>
                  )}
                </div>
                <div className="text-xs min-w-0">
                  <b className="block text-ink font-semibold truncate">
                    {user.nombre} {user.apellido}
                  </b>
                  <span className="text-ink-faint capitalize text-[11px] block">
                    {user.rol.toLowerCase()}
                  </span>
                </div>
              </Link>
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

      {/* ================= SIDEBAR DE ESCRITORIO (>= 1024px) - COLAPSABLE / DESPLEGABLE ================= */}
      <aside
        className={`hidden lg:flex flex-shrink-0 bg-paper-raised border-r border-line sticky top-0 h-screen flex-col transition-all duration-300 ease-in-out z-20 ${
          isCollapsed ? "w-[76px] p-3" : "w-64 p-5"
        }`}
      >
        {/* Cabecera del Sidebar con botón de colapso */}
        <div
          className={`pb-4 mb-4 border-b border-line-soft flex items-center ${
            isCollapsed ? "flex-col gap-3 justify-center" : "justify-between"
          }`}
        >
          {isCollapsed ? (
            <>
              {/* Modo Colapsado: Ícono / Letra de Marca */}
              <Link
                href="/"
                title="FICCT Investigación"
                className="w-10 h-10 rounded-xl bg-accent-soft text-accent-dark flex items-center justify-center font-bold text-base hover:scale-105 transition-transform"
              >
                F
              </Link>

              {/* Botón para Desplegar */}
              <button
                type="button"
                onClick={toggleSidebar}
                title="Desplegar menú lateral"
                className="p-2 rounded-xl text-ink-soft hover:text-ink hover:bg-paper-sunken border border-line-soft transition-colors"
                aria-label="Desplegar menú lateral"
              >
                <PanelLeftOpen className="w-4 h-4 text-accent" />
              </button>

              <ThemeToggle />
            </>
          ) : (
            <>
              {/* Modo Expandido: Título Completo */}
              <Link href="/" className="font-serif text-lg tracking-tight block">
                <b className="font-bold text-ink hover:text-accent transition-colors">FICCT</b>
                <span className="block text-xs font-sans text-ink-faint mt-0.5">
                  Gestión de Investigación
                </span>
              </Link>

              <div className="flex items-center gap-1.5">
                <ThemeToggle />
                {/* Botón para Colapsar */}
                <button
                  type="button"
                  onClick={toggleSidebar}
                  title="Colapsar menú lateral"
                  className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-paper-sunken border border-line-soft transition-colors"
                  aria-label="Colapsar menú lateral"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Lista de Navegación */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const IconComponent = item.icon;

            if (isCollapsed) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center justify-center w-full h-11 rounded-xl transition-all relative group ${
                    item.isActive
                      ? "bg-accent-soft text-accent-dark shadow-xs"
                      : "text-ink-soft hover:bg-paper-sunken hover:text-ink"
                  }`}
                >
                  <IconComponent className="w-5 h-5 flex-shrink-0" />
                  {/* Badge en miniatura (punto) si aplica */}
                  {item.badge && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
                  )}

                  {/* Tooltip flotante en hover para modo colapsado */}
                  <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-paper opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                  item.isActive
                    ? "bg-accent-soft text-accent-dark font-semibold shadow-xs"
                    : "text-ink-soft hover:bg-paper-sunken"
                }`}
              >
                <IconComponent className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Usuario Desktop */}
        <div
          className={`mt-auto pt-4 border-t border-line-soft ${
            isCollapsed ? "flex flex-col items-center gap-3" : "flex items-center justify-between"
          }`}
        >
          {isCollapsed ? (
            <>
              {/* Avatar colapsado que enlaza a Mi Perfil con tooltip */}
              <Link
                href="/dashboard/perfil"
                title={`Mi Perfil (${user.nombre} ${user.apellido})`}
                className="relative group block"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-accent text-white font-bold text-sm flex items-center justify-center border-2 border-line hover:border-accent transition-colors shadow-xs">
                  {user.fotoPerfil ? (
                    <img
                      src={resolveFileUrl(user.fotoPerfil)}
                      alt={user.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{getInitial(user.nombre)}</span>
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-paper-raised status-dot-ping" />

                {/* Tooltip flotante */}
                <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-paper opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  Mi Perfil: {user.nombre}
                </span>
              </Link>

              {/* Botón cerrar sesión colapsado */}
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-2 rounded-xl text-ink-faint hover:text-danger hover:bg-danger-soft/40 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {/* Tarjeta de usuario expandida que enlaza a Mi Perfil */}
              <Link
                href="/dashboard/perfil"
                title="Ver mi perfil"
                className="flex items-center gap-2.5 min-w-0 hover:opacity-85 transition-opacity"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-accent text-white font-bold text-xs flex items-center justify-center border border-line/40">
                    {user.fotoPerfil ? (
                      <img
                        src={resolveFileUrl(user.fotoPerfil)}
                        alt={user.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{getInitial(user.nombre)}</span>
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-paper-raised status-dot-ping" />
                </div>
                <div className="text-xs min-w-0">
                  <b className="block text-ink font-semibold truncate hover:text-accent transition-colors">
                    {user.nombre} {user.apellido}
                  </b>
                  <span className="text-ink-faint capitalize text-[11px] block">
                    {user.rol.toLowerCase()}
                  </span>
                </div>
              </Link>

              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-2 rounded-lg text-ink-faint hover:text-danger hover:bg-danger-soft/40 transition-all ml-1 flex-shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
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
          href="/dashboard/mis-areas"
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10.5px] font-semibold transition-all ${
            pathname.startsWith("/dashboard/mis-areas") ? "text-accent scale-105" : "text-ink-faint hover:text-ink"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Áreas</span>
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
          href="/dashboard/perfil"
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10.5px] font-semibold transition-all ${
            pathname === "/dashboard/perfil" ? "text-accent scale-105" : "text-ink-faint hover:text-ink"
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Perfil</span>
        </Link>
      </nav>
    </div>
  );
}
