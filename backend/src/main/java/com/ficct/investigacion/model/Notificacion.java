package com.ficct.investigacion.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Notificacion in-app dirigida a un usuario (admision, calificacion, nuevas entregas, recordatorios).
 */
@Entity
@Table(
    name = "notificaciones",
    indexes = {
        @Index(name = "idx_notif_usuario_leida", columnList = "usuario_id, leida"),
        @Index(name = "idx_notif_usuario_fecha", columnList = "usuario_id, created_at")
    }
)
public class Notificacion {

    public static final String INSCRIPCION_ADMITIDA = "INSCRIPCION_ADMITIDA";
    public static final String INSCRIPCION_RECHAZADA = "INSCRIPCION_RECHAZADA";
    public static final String NUEVA_POSTULACION = "NUEVA_POSTULACION";
    public static final String NUEVA_ENTREGA = "NUEVA_ENTREGA";
    public static final String ENTREGA_CALIFICADA = "ENTREGA_CALIFICADA";
    public static final String NUEVA_TAREA = "NUEVA_TAREA";
    public static final String CORTE_PROXIMO = "CORTE_PROXIMO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(nullable = false, length = 40)
    private String tipo;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(length = 600)
    private String mensaje;

    @Column(nullable = false)
    private boolean leida = false;

    @Column(name = "convocatoria_id")
    private Long convocatoriaId;

    @Column(name = "tarea_id")
    private Long tareaId;

    @Column(name = "entrega_id")
    private Long entregaId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Notificacion() {
    }

    public Notificacion(Long usuarioId, String tipo, String titulo, String mensaje,
                        Long convocatoriaId, Long tareaId, Long entregaId) {
        this.usuarioId = usuarioId;
        this.tipo = tipo;
        this.titulo = titulo;
        this.mensaje = mensaje;
        this.convocatoriaId = convocatoriaId;
        this.tareaId = tareaId;
        this.entregaId = entregaId;
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }
    public boolean isLeida() { return leida; }
    public void setLeida(boolean leida) { this.leida = leida; }
    public Long getConvocatoriaId() { return convocatoriaId; }
    public void setConvocatoriaId(Long convocatoriaId) { this.convocatoriaId = convocatoriaId; }
    public Long getTareaId() { return tareaId; }
    public void setTareaId(Long tareaId) { this.tareaId = tareaId; }
    public Long getEntregaId() { return entregaId; }
    public void setEntregaId(Long entregaId) { this.entregaId = entregaId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
