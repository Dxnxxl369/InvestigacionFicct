package com.ficct.investigacion.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Historial de envios (intentos) de una entrega: cada reenvio genera una version.
 */
@Entity
@Table(name = "entrega_versiones")
public class EntregaVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entrega_id", nullable = false)
    private EntregaTarea entrega;

    @Column(nullable = false)
    private Integer intento;

    @Column(name = "nombre_archivo", length = 255)
    private String nombreArchivo;

    @Column(name = "archivo_url", length = 500)
    private String archivoUrl;

    @Column(columnDefinition = "TEXT")
    private String comentario;

    @Column(name = "fecha_entrega", nullable = false)
    private LocalDateTime fechaEntrega;

    @Column(name = "con_retraso", nullable = false)
    private boolean conRetraso = false;

    public EntregaVersion() {
    }

    public EntregaVersion(EntregaTarea entrega, Integer intento, String nombreArchivo, String archivoUrl,
                          String comentario, LocalDateTime fechaEntrega, boolean conRetraso) {
        this.entrega = entrega;
        this.intento = intento;
        this.nombreArchivo = nombreArchivo;
        this.archivoUrl = archivoUrl;
        this.comentario = comentario;
        this.fechaEntrega = fechaEntrega;
        this.conRetraso = conRetraso;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public EntregaTarea getEntrega() { return entrega; }
    public void setEntrega(EntregaTarea entrega) { this.entrega = entrega; }
    public Integer getIntento() { return intento; }
    public void setIntento(Integer intento) { this.intento = intento; }
    public String getNombreArchivo() { return nombreArchivo; }
    public void setNombreArchivo(String nombreArchivo) { this.nombreArchivo = nombreArchivo; }
    public String getArchivoUrl() { return archivoUrl; }
    public void setArchivoUrl(String archivoUrl) { this.archivoUrl = archivoUrl; }
    public String getComentario() { return comentario; }
    public void setComentario(String comentario) { this.comentario = comentario; }
    public LocalDateTime getFechaEntrega() { return fechaEntrega; }
    public void setFechaEntrega(LocalDateTime fechaEntrega) { this.fechaEntrega = fechaEntrega; }
    public boolean isConRetraso() { return conRetraso; }
    public void setConRetraso(boolean conRetraso) { this.conRetraso = conRetraso; }
}
