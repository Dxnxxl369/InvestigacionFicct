"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CursosRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir a las Aulas Virtuales de Áreas y Convocatorias (Feria, Hackatón, etc.)
    router.replace("/dashboard/convocatorias");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
    </div>
  );
}
