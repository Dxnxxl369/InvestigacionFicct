"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, AlertCircle, Check, Sparkles, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "suspended") {
        setError("Tu cuenta ha sido suspendida por el administrador. Se ha revocado el acceso de forma inmediata.");
      } else if (params.get("error") === "session_expired") {
        setError("Tu sesión ha expirado o no es válida. Inicia sesión nuevamente.");
      }
    }
  }, []);

  // Validaciones inline (Nielsen Heurística #5: Prevención de errores y reconocimiento)
  const isEmailValid = email.includes("@") && email.includes(".");
  const isPasswordValid = password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const resp = await login(email.trim(), password);
      toast(`Sesión iniciada como ${resp.nombre} ${resp.apellido}`, "success");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Credenciales incorrectas. Verifique su correo y contraseña.");
      toast("Error de autenticación", "error");
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper p-4 transition-colors duration-300">
      {/* Barra superior con Volver y ThemeToggle */}
      <div className="w-full max-w-[420px] mb-4 flex justify-between items-center px-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-accent font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al portal público</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Card de Login con Header Curvo y Breathing Organic Blob */}
      <div className="w-full max-w-[420px] bg-paper-raised border border-line rounded-2xl shadow-xl overflow-hidden transition-colors">
        {/* Hero Header Orgánico con Blob */}
        <div className="relative h-32 bg-ink text-paper flex flex-col items-center justify-center overflow-hidden">
          <div className="blob" style={{ opacity: 0.85, filter: "blur(0px)" }} />
          <div className="relative z-10 text-center">
            <div className="font-serif text-2xl font-bold tracking-tight text-paper">
              FICCT
            </div>
            <span className="text-xs text-paper/80 font-sans tracking-wide block mt-0.5">
              Investigación &amp; Innovación
            </span>
          </div>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-7 sm:p-8">
          <h1 className="font-serif text-xl font-normal text-ink text-center mb-6">
            Ingreso a la Plataforma
          </h1>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-danger-soft/50 border border-danger/30 flex items-start gap-2.5 text-xs text-danger animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Correo con Checkmark Inline de Validación */}
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1.5">
                Correo institucional
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="usuario@uagrm.edu.bo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-paper-sunken text-ink transition-all focus:outline-none focus:bg-paper-raised ${
                    isEmailValid
                      ? "border-accent focus:ring-2 focus:ring-accent/20"
                      : "border-line focus:border-ink"
                  }`}
                />
                {isEmailValid && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center animate-in zoom-in-50 duration-200">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>
            </div>

            {/* Campo Contraseña con Checkmark Inline de Validación */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-medium text-ink-soft">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-3.5 pr-14 py-2.5 rounded-xl border text-sm bg-paper-sunken text-ink transition-all focus:outline-none focus:bg-paper-raised ${
                    isPasswordValid
                      ? "border-accent focus:ring-2 focus:ring-accent/20"
                      : "border-line focus:border-ink"
                  }`}
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {isPasswordValid && (
                    <div className="w-4 h-4 rounded-full bg-accent/20 text-accent flex items-center justify-center animate-in zoom-in-50 duration-200">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                    className="p-1 rounded-lg text-ink-faint hover:text-ink hover:bg-paper-raised transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-ink text-paper hover:opacity-90 dark:bg-accent dark:text-white font-semibold text-sm active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span className="btn-spinner" />
              ) : (
                <span>Iniciar sesión</span>
              )}
            </button>
          </form>

          {/* Accesos rápidos de desarrollo */}
          <div className="mt-7 pt-5 border-t border-line-soft">
            <p className="text-[11px] font-bold text-ink-faint uppercase tracking-wider mb-2.5 text-center">
              Credenciales de prueba
            </p>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <button
                type="button"
                onClick={() => fillCredentials("admin@uagrm.edu.bo", "admin369")}
                className="px-2 py-1.5 rounded-lg border border-line bg-paper-sunken hover:border-accent hover:text-accent text-[11px] font-medium text-ink-soft transition-all"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("docente@uagrm.edu.bo", "docente369")}
                className="px-2 py-1.5 rounded-lg border border-line bg-paper-sunken hover:border-accent hover:text-accent text-[11px] font-medium text-ink-soft transition-all"
              >
                Docente
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("daniel.quispe@uagrm.edu.bo", "estudiante369")}
                className="px-2 py-1.5 rounded-lg border border-line bg-paper-sunken hover:border-accent hover:text-accent text-[11px] font-medium text-ink-soft transition-all"
              >
                Estudiante
              </button>
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-ink-faint">
            ¿Aún no tienes cuenta?{" "}
            <Link href="/registro" className="text-accent font-semibold hover:underline">
              Regístrate aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
