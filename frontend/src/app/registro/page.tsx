"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import { ArrowLeft, CheckCircle2, AlertCircle, Check, Info, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";

export default function RegistroPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validaciones inline dinámicas
  const isEmailUagrm = email.trim().toLowerCase().endsWith("@uagrm.edu.bo");
  const isPasswordValid = password.length >= 6;
  const doPasswordsMatch = isPasswordValid && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isEmailUagrm) {
      setError("El correo debe ser institucional con terminación @uagrm.edu.bo");
      return;
    }

    if (!isPasswordValid) {
      setError("La contraseña debe tener un mínimo de 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await authAPI.register({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      setSuccess(true);
      toast("Cuenta creada con éxito. Redirigiendo...", "success");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Error al registrar la cuenta. Verifique los datos o si el correo ya está en uso.");
      toast("Error en el registro", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper p-4 transition-colors duration-300">
      {/* Barra superior con Volver y ThemeToggle */}
      <div className="w-full max-w-[460px] mb-4 flex justify-between items-center px-1">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-accent font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a iniciar sesión</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Card de Registro con Hero Header Orgánico */}
      <div className="w-full max-w-[460px] bg-paper-raised border border-line rounded-2xl shadow-xl overflow-hidden transition-colors">
        <div className="relative h-28 bg-ink text-paper flex flex-col items-center justify-center overflow-hidden">
          <div className="blob" style={{ opacity: 0.85, filter: "blur(0px)" }} />
          <div className="relative z-10 text-center">
            <div className="font-serif text-2xl font-bold tracking-tight text-paper">
              FICCT · UAGRM
            </div>
            <span className="text-xs text-paper/80 font-sans tracking-wide block mt-0.5">
              Registro de Investigador Estudiantil
            </span>
          </div>
        </div>

        <div className="p-7 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-danger-soft/50 border border-danger/30 flex items-start gap-2.5 text-xs text-danger animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-6 animate-in zoom-in-95 duration-300">
              <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 check-draw" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-serif text-xl font-bold text-ink mb-1">¡Registro Completado!</h2>
              <p className="text-xs text-ink-soft max-w-xs mx-auto mb-4 leading-relaxed">
                Tu cuenta estudiantil ha sido creada. Serás redirigido al inicio de sesión...
              </p>
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Daniel"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-line bg-paper-sunken text-ink text-xs sm:text-sm focus:outline-none focus:bg-paper-raised focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">
                    Apellido
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Quispe"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-line bg-paper-sunken text-ink text-xs sm:text-sm focus:outline-none focus:bg-paper-raised focus:border-accent"
                  />
                </div>
              </div>

              {/* Correo con validación de sufijo @uagrm.edu.bo */}
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Correo Institucional (@uagrm.edu.bo)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="daniel.quispe@uagrm.edu.bo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm bg-paper-sunken text-ink transition-all focus:outline-none focus:bg-paper-raised ${
                      isEmailUagrm
                        ? "border-accent focus:ring-2 focus:ring-accent/20"
                        : "border-line focus:border-ink"
                    }`}
                  />
                  {isEmailUagrm && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-accent/20 text-accent flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Contraseña (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-3.5 pr-14 py-2 rounded-xl border text-xs sm:text-sm bg-paper-sunken text-ink transition-all focus:outline-none focus:bg-paper-raised ${
                      isPasswordValid
                        ? "border-accent focus:ring-2 focus:ring-accent/20"
                        : "border-line focus:border-ink"
                    }`}
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {isPasswordValid && (
                      <div className="w-4 h-4 rounded-full bg-accent/20 text-accent flex items-center justify-center">
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

              {/* Confirmación de Contraseña */}
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-3.5 pr-14 py-2 rounded-xl border text-xs sm:text-sm bg-paper-sunken text-ink transition-all focus:outline-none focus:bg-paper-raised ${
                      doPasswordsMatch
                        ? "border-accent focus:ring-2 focus:ring-accent/20"
                        : "border-line focus:border-ink"
                    }`}
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {doPasswordsMatch && (
                      <div className="w-4 h-4 rounded-full bg-accent/20 text-accent flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? "Ocultar contraseña" : "Ver contraseña"}
                      className="p-1 rounded-lg text-ink-faint hover:text-ink hover:bg-paper-raised transition-colors"
                    >
                      {showConfirmPassword ? (
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
                className="w-full py-2.5 rounded-xl bg-ink text-paper hover:opacity-90 dark:bg-accent dark:text-white font-semibold text-xs sm:text-sm active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <span className="btn-spinner" /> : "Crear mi cuenta"}
              </button>

              <div className="mt-4 text-center text-xs text-ink-faint">
                ¿Ya tienes una cuenta registrada?{" "}
                <Link href="/login" className="text-accent font-semibold hover:underline">
                  Inicia sesión aquí
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
