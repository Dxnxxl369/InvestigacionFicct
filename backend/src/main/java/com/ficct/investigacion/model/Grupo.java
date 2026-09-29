package com.ficct.investigacion.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "grupos")
public class Grupo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "convocatoria_id", nullable = false)
    private Convocatoria convocatoria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actividad_grupo_id")
    private ActividadGrupo actividadGrupo;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "capacidad_maxima")
    private Integer capacidadMaxima = 5;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creado_por_id")
    private User creadoPor;

    @OneToMany(mappedBy = "grupo")
    private List<ConvocatoriaParticipante> miembros = new ArrayList<>();

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    public Grupo() {
    }

    public Grupo(Convocatoria convocatoria, String nombre, String descripcion, Integer capacidadMaxima, User creadoPor) {
        this.convocatoria = convocatoria;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.capacidadMaxima = capacidadMaxima != null ? capacidadMaxima : 5;
        this.creadoPor = creadoPor;
        this.fechaCreacion = LocalDateTime.now();
    }

    public Grupo(Convocatoria convocatoria, ActividadGrupo actividadGrupo, String nombre, String descripcion, Integer capacidadMaxima, User creadoPor) {
        this.convocatoria = convocatoria;
        this.actividadGrupo = actividadGrupo;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.capacidadMaxima = capacidadMaxima != null ? capacidadMaxima : 5;
        this.creadoPor = creadoPor;
        this.fechaCreacion = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (this.fechaCreacion == null) {
            this.fechaCreacion = LocalDateTime.now();
        }
        if (this.capacidadMaxima == null) {
            this.capacidadMaxima = 5;
        }
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

    public ActividadGrupo getActividadGrupo() {
        return actividadGrupo;
    }

    public void setActividadGrupo(ActividadGrupo actividadGrupo) {
        this.actividadGrupo = actividadGrupo;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public Integer getCapacidadMaxima() {
        return capacidadMaxima;
    }

    public void setCapacidadMaxima(Integer capacidadMaxima) {
        this.capacidadMaxima = capacidadMaxima;
    }

    public User getCreadoPor() {
        return creadoPor;
    }

    public void setCreadoPor(User creadoPor) {
        this.creadoPor = creadoPor;
    }

    public List<ConvocatoriaParticipante> getMiembros() {
        return miembros;
    }

    public void setMiembros(List<ConvocatoriaParticipante> miembros) {
        this.miembros = miembros;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }

    public int getCantidadMiembros() {
        return miembros != null ? miembros.size() : 0;
    }

    public boolean isCompleto() {
        if (capacidadMaxima == null || capacidadMaxima <= 0) {
            return false;
        }
        return getCantidadMiembros() >= capacidadMaxima;
    }
}
