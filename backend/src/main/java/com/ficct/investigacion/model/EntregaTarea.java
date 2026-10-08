package com.ficct.investigacion.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "tarea_entregas",
    uniqueConstraints = @UniqueConstraint(columnNames = {"tarea_id", "estudiante_id"})
)
public class EntregaTarea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tarea_id", nullable = false)
    private Tarea tarea;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "estudiante_id", nullable = false)
    private User estudiante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "documento_id")
    private Documento documento;

    @Column(name = "nombre_archivo", columnDefinition = "TEXT")
    private String nombreArchivo;

    @Column(name = "archivo_url", columnDefinition = "TEXT")
    private String archivoUrl;

    @Column(name = "comentario_estudiante", columnDefinition = "TEXT")
    private String comentarioEstudiante;

    @Column(name = "fecha_entrega", nullable = false)
    private LocalDateTime fechaEntrega;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EstadoEntrega estado = EstadoEntrega.ENTREGADO;

    @Column
    private Double calificacion;

    @Column(columnDefinition = "TEXT")
    private String retroalimentacion;

    @Column(name = "fecha_calificacion")
    private LocalDateTime fechaCalificacion;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "calificado_por_id")
    private User calificadoPor;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "entregado_por_id")
    private User entregadoPor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grupo_id")
    private Grupo grupo;

    @Column(name = "nombre_equipo", length = 300)
    private String nombreEquipo;

    // Nullable en BD para no romper filas previas; null se interpreta como false
    @Column(name = "con_retraso")
    private Boolean conRetraso = false;

    @OneToMany(mappedBy = "entrega", cascade = CascadeType.REMOVE)
    private java.util.List<EntregaVersion> versiones = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "entrega", cascade = CascadeType.REMOVE)
    private java.util.List<EntregaPuntajeCriterio> puntajesCriterios = new java.util.ArrayList<>();

    public EntregaTarea() {
    }

    public EntregaTarea(Tarea tarea, User estudiante, Documento documento, String nombreArchivo, String archivoUrl, String comentarioEstudiante) {
        this.tarea = tarea;
        this.estudiante = estudiante;
        this.documento = documento;
        this.nombreArchivo = nombreArchivo;
        this.archivoUrl = archivoUrl;
        this.comentarioEstudiante = comentarioEstudiante;
        this.estado = EstadoEntrega.ENTREGADO;
    }

    @PrePersist
    protected void onCreate() {
        this.fechaEntrega = LocalDateTime.now();
        if (this.estado == null) this.estado = EstadoEntrega.ENTREGADO;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Tarea getTarea() {
        return tarea;
    }

    public void setTarea(Tarea tarea) {
        this.tarea = tarea;
    }

    public User getEstudiante() {
        return estudiante;
    }

    public void setEstudiante(User estudiante) {
        this.estudiante = estudiante;
    }

    public Documento getDocumento() {
        return documento;
    }

    public void setDocumento(Documento documento) {
        this.documento = documento;
    }

    public String getNombreArchivo() {
        return nombreArchivo;
    }

    public void setNombreArchivo(String nombreArchivo) {
        this.nombreArchivo = nombreArchivo;
    }

    public String getArchivoUrl() {
        return archivoUrl;
    }

    public void setArchivoUrl(String archivoUrl) {
        this.archivoUrl = archivoUrl;
    }

    public String getComentarioEstudiante() {
        return comentarioEstudiante;
    }

    public void setComentarioEstudiante(String comentarioEstudiante) {
        this.comentarioEstudiante = comentarioEstudiante;
    }

    public LocalDateTime getFechaEntrega() {
        return fechaEntrega;
    }

    public void setFechaEntrega(LocalDateTime fechaEntrega) {
        this.fechaEntrega = fechaEntrega;
    }

    public EstadoEntrega getEstado() {
        return estado;
    }

    public void setEstado(EstadoEntrega estado) {
        this.estado = estado;
    }

    public Double getCalificacion() {
        return calificacion;
    }

    public void setCalificacion(Double calificacion) {
        this.calificacion = calificacion;
    }

    public String getRetroalimentacion() {
        return retroalimentacion;
    }

    public void setRetroalimentacion(String retroalimentacion) {
        this.retroalimentacion = retroalimentacion;
    }

    public LocalDateTime getFechaCalificacion() {
        return fechaCalificacion;
    }

    public void setFechaCalificacion(LocalDateTime fechaCalificacion) {
        this.fechaCalificacion = fechaCalificacion;
    }

    public User getCalificadoPor() {
        return calificadoPor;
    }

    public void setCalificadoPor(User calificadoPor) {
        this.calificadoPor = calificadoPor;
    }

    public User getEntregadoPor() {
        return entregadoPor;
    }

    public void setEntregadoPor(User entregadoPor) {
        this.entregadoPor = entregadoPor;
    }

    public Grupo getGrupo() {
        return grupo;
    }

    public void setGrupo(Grupo grupo) {
        this.grupo = grupo;
    }

    public String getNombreEquipo() {
        return nombreEquipo;
    }

    public void setNombreEquipo(String nombreEquipo) {
        this.nombreEquipo = nombreEquipo;
    }

    public boolean isConRetraso() {
        return Boolean.TRUE.equals(conRetraso);
    }

    public void setConRetraso(boolean conRetraso) {
        this.conRetraso = conRetraso;
    }
}
