package com.ficct.investigacion.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "actividades_grupo")
public class ActividadGrupo {

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

    @Column(name = "fecha_apertura")
    private LocalDateTime fechaApertura;

    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    @Column(name = "capacidad_por_grupo")
    private Integer capacidadPorGrupo = 5;

    @Column(name = "permitir_cambio", nullable = false)
    private boolean permitirCambio = true;

    @Column(name = "mostrar_miembros", nullable = false)
    private boolean mostrarMiembros = true;

    @Column(nullable = false)
    private boolean habilitada = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creado_por_id")
    private User creadoPor;

    @OneToMany(mappedBy = "actividadGrupo", cascade = CascadeType.ALL)
    @OrderBy("nombre ASC")
    private List<Grupo> grupos = new ArrayList<>();

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    public ActividadGrupo() {
    }

    public ActividadGrupo(Convocatoria convocatoria, Modulo modulo, String titulo, String descripcion,
                          LocalDateTime fechaApertura, LocalDateTime fechaCierre, Integer capacidadPorGrupo,
                          boolean permitirCambio, boolean mostrarMiembros, boolean habilitada, User creadoPor) {
        this.convocatoria = convocatoria;
        this.modulo = modulo;
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.fechaApertura = fechaApertura;
        this.fechaCierre = fechaCierre;
        this.capacidadPorGrupo = capacidadPorGrupo != null ? capacidadPorGrupo : 5;
        this.permitirCambio = permitirCambio;
        this.mostrarMiembros = mostrarMiembros;
        this.habilitada = habilitada;
        this.creadoPor = creadoPor;
        this.fechaCreacion = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (this.fechaCreacion == null) {
            this.fechaCreacion = LocalDateTime.now();
        }
        if (this.capacidadPorGrupo == null) {
            this.capacidadPorGrupo = 5;
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

    public Modulo getModulo() {
        return modulo;
    }

    public void setModulo(Modulo modulo) {
        this.modulo = modulo;
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

    public LocalDateTime getFechaApertura() {
        return fechaApertura;
    }

    public void setFechaApertura(LocalDateTime fechaApertura) {
        this.fechaApertura = fechaApertura;
    }

    public LocalDateTime getFechaCierre() {
        return fechaCierre;
    }

    public void setFechaCierre(LocalDateTime fechaCierre) {
        this.fechaCierre = fechaCierre;
    }

    public Integer getCapacidadPorGrupo() {
        return capacidadPorGrupo;
    }

    public void setCapacidadPorGrupo(Integer capacidadPorGrupo) {
        this.capacidadPorGrupo = capacidadPorGrupo;
    }

    public boolean isPermitirCambio() {
        return permitirCambio;
    }

    public void setPermitirCambio(boolean permitirCambio) {
        this.permitirCambio = permitirCambio;
    }

    public boolean isMostrarMiembros() {
        return mostrarMiembros;
    }

    public void setMostrarMiembros(boolean mostrarMiembros) {
        this.mostrarMiembros = mostrarMiembros;
    }

    public boolean isHabilitada() {
        return habilitada;
    }

    public void setHabilitada(boolean habilitada) {
        this.habilitada = habilitada;
    }

    public User getCreadoPor() {
        return creadoPor;
    }

    public void setCreadoPor(User creadoPor) {
        this.creadoPor = creadoPor;
    }

    public List<Grupo> getGrupos() {
        return grupos;
    }

    public void setGrupos(List<Grupo> grupos) {
        this.grupos = grupos;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }

    public boolean isAbierta() {
        if (!habilitada) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        if (fechaApertura != null && now.isBefore(fechaApertura)) {
            return false;
        }
        if (fechaCierre != null && now.isAfter(fechaCierre)) {
            return false;
        }
        return true;
    }

    public boolean isCerrada() {
        if (!habilitada) {
            return true;
        }
        LocalDateTime now = LocalDateTime.now();
        return fechaCierre != null && now.isAfter(fechaCierre);
    }
}
