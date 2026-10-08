export type RemoteConflictSource = "snapshot" | "steps" | "rest";

export type RemoteConflictInfo = {
  source: RemoteConflictSource;
  usuario?: string;
  at?: string;
  serverVersion?: number;
  hasPendingSnapshot: boolean;
  hasLocalPendingChanges?: boolean;
};

export function remoteConflictStatusLabel(conflict: RemoteConflictInfo | null) {
  if (!conflict) return "Otro usuario guardo cambios";
  const user = conflict.usuario ? ` de ${conflict.usuario}` : "";
  if (conflict.source === "steps") return `Cambios en vivo${user} requieren sincronizacion`;
  if (conflict.hasPendingSnapshot) return `Snapshot remoto${user} listo para aplicar`;
  return `Version remota${user} disponible`;
}

export function remoteConflictActionLabel(conflict: RemoteConflictInfo | null) {
  if (conflict?.hasPendingSnapshot) return "Aplicar snapshot";
  return "Traer version remota";
}

export function remoteConflictTitle(conflict: RemoteConflictInfo | null) {
  if (!conflict) return "Cargar los cambios remotos disponibles";
  const parts = [
    conflict.hasPendingSnapshot ? "Aplica el snapshot remoto pendiente." : "Trae la version guardada del servidor.",
    conflict.hasLocalPendingChanges ? "Reemplazara cambios locales pendientes." : "",
    conflict.usuario ? `Autor: ${conflict.usuario}.` : "",
    conflict.serverVersion ? `Version live: ${conflict.serverVersion}.` : "",
    conflict.at ? `Recibido: ${new Date(conflict.at).toLocaleString()}.` : "",
  ].filter(Boolean);
  return parts.join(" ");
}
