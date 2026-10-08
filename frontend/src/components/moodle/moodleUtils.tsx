import React from "react";
import { FileText, FileArchive, Image as ImageIcon, FileUp } from "lucide-react";
import { TareaDTO } from "@/lib/api";

// Convertir base64 dataURL a File para restaurar borradores
export function dataURLtoFile(dataurl: string, filename: string): File {
  try {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch {
    return new File([], filename, { type: "application/octet-stream" });
  }
}

// Formatear bytes a KB / MB legible
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Función infalible para parsear fechas ISO respetando el reloj de pared local sin desfase horario
export function parseIsoDateWithoutShift(dateStr: string): Date {
  if (!dateStr) return new Date();
  const m = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const [_, year, month, day, hours, minutes, seconds] = m;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      seconds ? Number(seconds) : 0
    );
  }
  return new Date(dateStr);
}

// Formatear fechas con estilo natural y completo Moodle (e.g. "lunes, 29 de septiembre de 2026, 00:00")
export function formatMoodleDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = parseIsoDateWithoutShift(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return d.toLocaleDateString("es-ES", opciones);
  } catch {
    return dateStr;
  }
}

export function formatMoodleDateShort(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = parseIsoDateWithoutShift(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// Formateo de fecha ISO a YYYY-MM-DDTHH:mm para inputs datetime-local sin alterar zona horaria
export function formatForDateTimeLocal(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const str = dateStr.trim();
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (m) {
      return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

// Envío de fecha local a backend sin conversión UTC para evitar desfase de 4 horas
export function formatDateTimeForBackend(dateTimeLocalStr?: string | null): string | undefined {
  if (!dateTimeLocalStr || !dateTimeLocalStr.trim()) return undefined;
  const str = dateTimeLocalStr.trim();
  if (str.length === 16) {
    return `${str}:00`;
  }
  return str;
}

// Formateo gramatical y natural de duraciones en español (evita 'y' huérfana)
export function formatMoodleDuration(diffMin: number): string {
  const absMin = Math.abs(diffMin);
  const dias = Math.floor(absMin / (60 * 24));
  const horas = Math.floor((absMin % (60 * 24)) / 60);
  const minutos = absMin % 60;

  const parts: string[] = [];
  if (dias > 0) {
    parts.push(`${dias} ${dias === 1 ? "día" : "días"}`);
  }
  if (horas > 0) {
    parts.push(`${horas} ${horas === 1 ? "hora" : "horas"}`);
  }
  if (minutos > 0 || parts.length === 0) {
    parts.push(`${minutos} ${minutos === 1 ? "minuto" : "minutos"}`);
  }

  if (parts.length === 1) {
    return parts[0];
  } else if (parts.length === 2) {
    return `${parts[0]} y ${parts[1]}`;
  } else {
    return `${parts[0]}, ${parts[1]} y ${parts[2]}`;
  }
}

// Cálculo de tiempo restante / entrega previa estilo Moodle
export function calcularTiempoRestanteMoodle(
  fechaLimiteStr?: string | null,
  fechaEntregaStr?: string | null,
  fechaHabilitacionStr?: string | null
): { texto: string; temprano: boolean; retraso: boolean; pendienteApertura?: boolean } {
  // 1. Tarea ya enviada por el estudiante
  if (fechaEntregaStr && fechaLimiteStr) {
    const fechaLimite = parseIsoDateWithoutShift(fechaLimiteStr).getTime();
    const fechaEntrega = parseIsoDateWithoutShift(fechaEntregaStr).getTime();
    const diffMs = fechaLimite - fechaEntrega;
    const diffMin = Math.round(Math.abs(diffMs) / (1000 * 60));
    const duracion = formatMoodleDuration(diffMin);

    if (diffMs >= 0) {
      return {
        texto: `La tarea fue enviada ${duracion} antes de la fecha límite`,
        temprano: true,
        retraso: false,
      };
    } else {
      return {
        texto: `La tarea fue enviada ${duracion} después de la fecha límite (con retraso)`,
        temprano: false,
        retraso: true,
      };
    }
  }

  const ahora = Date.now();

  // 2. Si la tarea aún no se ha abierto para entregas
  if (fechaHabilitacionStr) {
    const fechaHab = parseIsoDateWithoutShift(fechaHabilitacionStr).getTime();
    if (ahora < fechaHab) {
      const diffMinHab = Math.round((fechaHab - ahora) / (1000 * 60));
      const duracion = formatMoodleDuration(diffMinHab);
      return {
        texto: `Abre en ${duracion} (${formatMoodleDateShort(fechaHabilitacionStr)})`,
        temprano: false,
        retraso: false,
        pendienteApertura: true,
      };
    }
  }

  if (!fechaLimiteStr) {
    return { texto: "Sin fecha límite asignada", temprano: false, retraso: false };
  }

  const fechaLimite = parseIsoDateWithoutShift(fechaLimiteStr).getTime();
  const diffMs = fechaLimite - ahora;
  if (diffMs <= 0) {
    const diffMin = Math.round(Math.abs(diffMs) / (1000 * 60));
    return {
      texto: `Plazo regular vencido hace ${formatMoodleDuration(diffMin)}`,
      temprano: false,
      retraso: true,
    };
  }

  const diffMin = Math.round(diffMs / (1000 * 60));
  const duracion = formatMoodleDuration(diffMin);
  const prefijo = diffMin === 1 ? "Queda" : "Quedan";
  return { texto: `${prefijo} ${duracion}`, temprano: false, retraso: false };
}

// Analizar extensiones permitidas tipo ".pdf, .docx, .zip"
export function parseAllowedExtensions(allowedStr?: string): string[] {
  if (!allowedStr || allowedStr.trim() === "" || allowedStr.trim() === "*") {
    return [];
  }
  return allowedStr
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => (s.startsWith(".") ? s : `.${s}`));
}

// Validar archivo individual contra requisitos de tarea académica (Moodle)
export function validateFileForTarea(file: File, tarea: TareaDTO): { valid: boolean; error?: string } {
  const allowed = parseAllowedExtensions(tarea.tiposArchivosPermitidos);
  const fileName = file.name.toLowerCase();

  // 1. Validar formato / extensión
  if (allowed.length > 0) {
    const hasValidExt = allowed.some((ext) => fileName.endsWith(ext));
    if (!hasValidExt) {
      return {
        valid: false,
        error: `Formato no permitido: "${file.name}". Solo se admiten archivos con formato: ${tarea.tiposArchivosPermitidos}`,
      };
    }
  }

  // 2. Validar tamaño máximo
  const maxMb = tarea.tamanoMaximoMb || 15;
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    const tamanoMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `El archivo "${file.name}" (${tamanoMb} MB) supera el límite máximo permitido de ${maxMb} MB.`,
    };
  }

  return { valid: true };
}

// Validar lote de N archivos contra formato individual y tamaño total acumulado (Moodle)
export function validateFilesBatchForTarea(
  files: File[],
  tarea: TareaDTO
): { valid: boolean; error?: string } {
  const allowed = parseAllowedExtensions(tarea.tiposArchivosPermitidos);
  const maxMb = tarea.tamanoMaximoMb || 15;
  const maxBytes = maxMb * 1024 * 1024;

  let totalBytes = 0;
  for (const file of files) {
    const fileName = file.name.toLowerCase();
    if (allowed.length > 0) {
      const hasValidExt = allowed.some((ext) => fileName.endsWith(ext));
      if (!hasValidExt) {
        return {
          valid: false,
          error: `Formato no permitido: "${file.name}". Solo se admiten archivos con formato: ${tarea.tiposArchivosPermitidos}`,
        };
      }
    }
    totalBytes += file.size;
  }

  if (totalBytes > maxBytes) {
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `El tamaño total de los archivos (${totalMb} MB) supera el límite máximo permitido de ${maxMb} MB para la tarea.`,
    };
  }

  return { valid: true };
}

// Icono contextual según extensión
export function renderArchivoIcon(filename: string, className = "w-6 h-6") {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") {
    return <FileText className={`${className} text-rose-500`} />;
  }
  if (["doc", "docx", "odt", "txt", "rtf"].includes(ext || "")) {
    return <FileText className={`${className} text-blue-500`} />;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext || "")) {
    return <FileArchive className={`${className} text-amber-500`} />;
  }
  if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext || "")) {
    return <ImageIcon className={`${className} text-emerald-500`} />;
  }
  return <FileUp className={`${className} text-accent`} />;
}
