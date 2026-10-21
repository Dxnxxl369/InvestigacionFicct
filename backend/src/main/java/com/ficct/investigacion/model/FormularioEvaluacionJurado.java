package com.ficct.investigacion.model;

import jakarta.persistence.*;

@Entity
@Table(name = "formularios_evaluacion_jurado", uniqueConstraints =
        @UniqueConstraint(columnNames = "convocatoria_id"))
public class FormularioEvaluacionJurado {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "convocatoria_id", nullable = false)
    private Convocatoria convocatoria;
    @Column(name = "contenido_json", nullable = false, columnDefinition = "TEXT")
    private String contenidoJson;
    @Column(nullable = false)
    private int revision;

    public FormularioEvaluacionJurado() {}
    public FormularioEvaluacionJurado(Convocatoria convocatoria, String contenidoJson) {
        this.convocatoria = convocatoria;
        this.contenidoJson = contenidoJson;
    }
    public String getContenidoJson() { return contenidoJson; }
    public void setContenidoJson(String contenidoJson) { this.contenidoJson = contenidoJson; }
    public int getRevision() { return revision; }
    public void incrementarRevision() { revision++; }
}
