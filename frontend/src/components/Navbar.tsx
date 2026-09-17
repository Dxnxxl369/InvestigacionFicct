"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { User, LogIn, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/context/ThemeContext";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between px-6 sm:px-10 py-3.5 bg-paper/85 backdrop-blur-md border-b border-line transition-colors">
      <Link href="/" className="font-serif text-lg tracking-tight group flex items-center gap-1.5">
        <b className="font-bold text-ink group-hover:text-accent transition-colors">FICCT</b>
        <span className="text-ink-soft text-sm sm:text-[15px]">· Investigación &amp; Innovación</span>
      </Link>

      <div className="hidden md:flex items-center gap-7 text-sm text-ink-soft">
        <Link href="/#actividades" className="hover:text-ink transition-colors">
          Convocatorias y Ferias
        </Link>
        <Link href="/#verificacion" className="hover:text-ink transition-colors">
          Verificación Blockchain
        </Link>
        <Link href="/#nosotros" className="hover:text-ink transition-colors">
          Unidad de Investigación
        </Link>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Toggle Claro / Oscuro Conveniente en la barra superior */}
        <ThemeToggle />

        {user ? (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs sm:text-sm font-medium px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-dark shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Mi Panel ({user.rol})</span>
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3.5 py-1.5 rounded-lg border border-line hover:border-ink text-ink bg-paper-raised/60 hover:bg-paper-raised transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Ingresar</span>
            </Link>
            <Link
              href="/registro"
              className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3.5 py-1.5 rounded-lg bg-ink text-paper hover:opacity-90 shadow-sm transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span>Crear cuenta</span>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
