package com.ficct.investigacion.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "evaluaciones_jurado", uniqueConstraints = @UniqueConstraint(
        columnNames = {"convocatoria_id", "jurado_usuario_id", "tipo_proyecto", "proyecto_id"}))
public class EvaluacionJurado {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "convocatoria_id", nullable = false)
    private Convocatoria convocatoria;
    @Column(name = "jurado_usuario_id", nullable = false)
    private Long juradoUsuarioId;
    @Column(name = "jurado_nombre", nullable = false, length = 200)
    private String juradoNombre;
    @Column(name = "tipo_proyecto", nullable = false, length = 10)
    private String tipoProyecto;
    @Column(name = "proyecto_id", nullable = false)
    private Long proyectoId;
    @Column(name = "formulario_json", nullable = false, columnDefinition = "TEXT")
    private String formularioJson;
    @Column(name = "respuestas_json", nullable = false, columnDefinition = "TEXT")
    private String respuestasJson;
    @Column(name = "comentarios", columnDefinition = "TEXT")
    private String comentarios;
    @Column(name = "nota_final", nullable = false)
    private double notaFinal;
    @Column(name = "fecha_envio", nullable = false)
    private LocalDateTime fechaEnvio;

    public EvaluacionJurado() {}
    public EvaluacionJurado(Convocatoria convocatoria, User jurado, String tipoProyecto,
                            Long proyectoId, String formularioJson, String respuestasJson,
                            String comentarios, double notaFinal) {
        this.convocatoria = convocatoria;
        this.juradoUsuarioId = jurado.getId();
        this.juradoNombre = jurado.getNombreCompleto();
        this.tipoProyecto = tipoProyecto;
        this.proyectoId = proyectoId;
        this.formularioJson = formularioJson;
        this.respuestasJson = respuestasJson;
        this.comentarios = comentarios;
        this.notaFinal = notaFinal;
        this.fechaEnvio = LocalDateTime.now();
    }
    public Long getId() { return id; }
    public String getFormularioJson() { return formularioJson; }
    public String getRespuestasJson() { return respuestasJson; }
    public String getComentarios() { return comentarios; }
    public double getNotaFinal() { return notaFinal; }
    public LocalDateTime getFechaEnvio() { return fechaEnvio; }
    public String getJuradoNombre() { return juradoNombre; }
    public String getTipoProyecto() { return tipoProyecto; }
    public Long getProyectoId() { return proyectoId; }
}
