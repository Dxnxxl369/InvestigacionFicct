package com.ficct.investigacion.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Contenedores de DTOs (records) para rubrica, seguimiento, historial y lote.
 */
public final class MejorasDTOs {

    private MejorasDTOs() {
    }

    // ---------- Rubrica ----------
    public record CriterioDTO(Long id, String nombre, String descripcion, Double puntajeMaximo, Integer orden) {
    }

    public record CriterioRequest(Long id, String nombre, String descripcion, Double puntajeMaximo) {
    }

    public record PuntajeRequest(Long criterioId, Double puntaje) {
    }

    public record PuntajeDTO(Long criterioId, String nombre, Double puntaje, Double puntajeMaximo) {
    }

    // ---------- Seguimiento ----------
    public record ResumenSeguimiento(int totalEstudiantes, int entregados, int sinEntregar,
                                     int conRetraso, int calificados, int porCalificar) {
    }

    public record ItemSeguimiento(Long estudianteId, String estudianteNombre, String estudianteEmail,
                                  String fotoPerfil, String grupoNombre, String estadoSeguimiento,
                                  boolean conRetraso, EntregaTareaDTO entrega) {
    }

    public record SeguimientoTarea(Long tareaId, String titulo, Double puntajeMaximo, boolean esGrupal,
                                   LocalDateTime fechaEntrega, LocalDateTime fechaCorte,
                                   ResumenSeguimiento resumen, List<ItemSeguimiento> items) {
    }

    // ---------- Historial ----------
    public record VersionDTO(Long id, Integer intento, String nombreArchivo, String archivoUrl,
                             String comentario, LocalDateTime fechaEntrega, boolean conRetraso) {
    }

    // ---------- Admision en lote ----------
    public record ResponderLoteRequest(List<Long> participanteIds, String accion, String motivo) {
    }

    public record ResultadoLote(int procesados, List<String> errores) {
    }

    // ---------- Notificaciones ----------
    public record NotificacionDTO(Long id, String tipo, String titulo, String mensaje, boolean leida,
                                  LocalDateTime createdAt, Long convocatoriaId, Long tareaId, Long entregaId) {
    }
}
