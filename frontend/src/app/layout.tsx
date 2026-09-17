import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { AssistantChat } from "@/components/AssistantChat";

export const metadata: Metadata = {
  title: "FICCT · Sistema de Apoyo a la Investigación",
  description: "Plataforma de gestión de convocatorias, ferias y proyectos de investigación de la FICCT - UAGRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-paper text-ink font-sans transition-colors duration-300">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              {children}
              <AssistantChat />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
