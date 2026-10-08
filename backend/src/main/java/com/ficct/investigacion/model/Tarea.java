package com.ficct.investigacion.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tareas")
public class Tarea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "convocatoria_id", nullable = false)
    private Convocatoria convocatoria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "modulo_id")
    private Modulo modulo;

    @Column(nullable = false, length = 180)
    private String titulo;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    // Triple control de fechas tipo Moodle:
    @Column(name = "fecha_habilitacion")
    private LocalDateTime fechaHabilitacion;

    @Column(name = "fecha_entrega")
    private LocalDateTime fechaEntrega;

    @Column(name = "fecha_corte")
    private LocalDateTime fechaCorte;

    @Column(nullable = false)
    private boolean habilitada = true;

    @Column(name = "tipos_archivos_permitidos", length = 150)
    private String tiposArchivosPermitidos = ".pdf, .docx, .zip";

    @Column(name = "tamano_maximo_mb")
    private Integer tamanoMaximoMb = 10;

    @Column(name = "puntaje_maximo")
    private Double puntajeMaximo = 100.0;

    @Column(name = "es_grupal", nullable = false)
    private boolean esGrupal = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actividad_grupo_id")
    private ActividadGrupo actividadGrupo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creador_id")
    private User creador;

    @Column(name = "documento_colaborativo_habilitado", nullable = false)
    private boolean documentoColaborativoHabilitado = false;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "documento_colaborativo_id")
    private Documento documentoColaborativo;

    @OneToMany(mappedBy = "tarea", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EntregaTarea> entregas = new ArrayList<>();

    @OneToMany(mappedBy = "tarea", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orden ASC")
    private List<RubricaCriterio> rubrica = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Tarea() {
    }

    public Tarea(Convocatoria convocatoria, String titulo, String descripcion,
                 LocalDateTime fechaHabilitacion, LocalDateTime fechaEntrega, LocalDateTime fechaCorte,
                 boolean habilitada, String tiposArchivosPermitidos, Integer tamanoMaximoMb, Double puntajeMaximo, User creador) {
        this.convocatoria = convocatoria;
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.fechaHabilitacion = fechaHabilitacion;
        this.fechaEntrega = fechaEntrega;
        this.fechaCorte = fechaCorte;
        this.habilitada = habilitada;
        this.tiposArchivosPermitidos = tiposArchivosPermitidos != null ? tiposArchivosPermitidos : ".pdf, .docx, .zip";
        this.tamanoMaximoMb = tamanoMaximoMb != null ? tamanoMaximoMb : 10;
        this.puntajeMaximo = puntajeMaximo != null ? puntajeMaximo : 100.0;
        this.creador = creador;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.tiposArchivosPermitidos == null) this.tiposArchivosPermitidos = ".pdf, .docx, .zip";
        if (this.tamanoMaximoMb == null) this.tamanoMaximoMb = 10;
        if (this.puntajeMaximo == null) this.puntajeMaximo = 100.0;
        if (this.fechaHabilitacion == null) this.fechaHabilitacion = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Convocatoria getConvocatoria() {
        return convocatoria;
    }

    public void setConvocatoria(Convocatoria convocatoria) {
        this.convocatoria = convocatoria;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public LocalDateTime getFechaHabilitacion() {
        return fechaHabilitacion;
    }

    public void setFechaHabilitacion(LocalDateTime fechaHabilitacion) {
        this.fechaHabilitacion = fechaHabilitacion;
    }

    public LocalDateTime getFechaEntrega() {
        return fechaEntrega;
    }

    public void setFechaEntrega(LocalDateTime fechaEntrega) {
        this.fechaEntrega = fechaEntrega;
    }

    public LocalDateTime getFechaCorte() {
        return fechaCorte;
    }

    public void setFechaCorte(LocalDateTime fechaCorte) {
        this.fechaCorte = fechaCorte;
    }

    // Compatibilidad para fechaLimite -> fechaEntrega
    public LocalDateTime getFechaLimite() {
        return fechaEntrega != null ? fechaEntrega : fechaCorte;
    }

    public void setFechaLimite(LocalDateTime fechaLimite) {
        this.fechaEntrega = fechaLimite;
    }

    public boolean isHabilitada() {
        return habilitada;
    }

    public void setHabilitada(boolean habilitada) {
        this.habilitada = habilitada;
    }

    public String getTiposArchivosPermitidos() {
        return tiposArchivosPermitidos;
    }

    public void setTiposArchivosPermitidos(String tiposArchivosPermitidos) {
        this.tiposArchivosPermitidos = tiposArchivosPermitidos;
    }

    public Integer getTamanoMaximoMb() {
        return tamanoMaximoMb;
    }

    public void setTamanoMaximoMb(Integer tamanoMaximoMb) {
        this.tamanoMaximoMb = tamanoMaximoMb;
    }

    public Double getPuntajeMaximo() {
        return puntajeMaximo;
    }

    public void setPuntajeMaximo(Double puntajeMaximo) {
        this.puntajeMaximo = puntajeMaximo;
    }

    public User getCreador() {
        return creador;
    }

    public void setCreador(User creador) {
        this.creador = creador;
    }

    public boolean isDocumentoColaborativoHabilitado() {
        return documentoColaborativoHabilitado;
    }

    public void setDocumentoColaborativoHabilitado(boolean documentoColaborativoHabilitado) {
        this.documentoColaborativoHabilitado = documentoColaborativoHabilitado;
    }

    public Documento getDocumentoColaborativo() {
        return documentoColaborativo;
    }

    public void setDocumentoColaborativo(Documento documentoColaborativo) {
        this.documentoColaborativo = documentoColaborativo;
    }

    public List<RubricaCriterio> getRubrica() {
        return rubrica;
    }

    public void setRubrica(List<RubricaCriterio> rubrica) {
        this.rubrica = rubrica;
    }

    public List<EntregaTarea> getEntregas() {
        return entregas;
    }

    public void setEntregas(List<EntregaTarea> entregas) {
        this.entregas = entregas;
    }

    public Modulo getModulo() {
        return modulo;
    }

    public void setModulo(Modulo modulo) {
        this.modulo = modulo;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public boolean isEsGrupal() {
        return esGrupal;
    }

    public void setEsGrupal(boolean esGrupal) {
        this.esGrupal = esGrupal;
    }

    public ActividadGrupo getActividadGrupo() {
        return actividadGrupo;
    }

    public void setActividadGrupo(ActividadGrupo actividadGrupo) {
        this.actividadGrupo = actividadGrupo;
    }
}
