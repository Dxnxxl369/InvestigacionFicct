package com.ficct.investigacion.model;

/**
 * Estado del ciclo de vida de una inscripción a un área o convocatoria.
 */
public enum EstadoInscripcion {
    PENDIENTE,   // Solicitud enviada por el estudiante, en espera de revisión
    ACEPTADO,    // Admitido formalmente por el docente a cargo o administrador
    RECHAZADO,   // Solicitud rechazada por el docente a cargo o administrador
    CANCELADO    // El estudiante declinó su postulación antes de ser admitido
}
