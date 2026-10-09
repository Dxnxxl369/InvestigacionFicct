package com.ficct.investigacion.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "convocatorias")
public class Convocatoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String descripcion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoConvocatoria tipo = TipoConvocatoria.FERIA;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EstadoConvocatoria estado = EstadoConvocatoria.BORRADOR;

    @Column(name = "fecha_cierre")
    private LocalDate fechaCierre;

    @Column(name = "tamano_equipo", length = 100)
    private String tamanoEquipo;

    @Column(name = "inscripcion_grupal")
    private boolean inscripcionGrupal = false;

    @Column(name = "min_integrantes_grupo")
    private Integer minIntegrantesGrupo = 1;

    @Column(name = "max_integrantes_grupo")
    private Integer maxIntegrantesGrupo = 5;

    @Column(name = "imagen_portada", length = 500)
    private String imagenPortada;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creador_id", nullable = false)
    private User creador;

    @OneToMany(mappedBy = "convocatoria", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Requisito> requisitos = new ArrayList<>();

    @OneToMany(mappedBy = "convocatoria", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ConvocatoriaParticipante> participantes = new ArrayList<>();

    @OneToMany(mappedBy = "convocatoria", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Tarea> tareas = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Convocatoria() {
    }

    public Convocatoria(String titulo, String descripcion, TipoConvocatoria tipo, EstadoConvocatoria estado,
                        LocalDate fechaCierre, String tamanoEquipo, String imagenPortada, User creador) {
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.tipo = tipo != null ? tipo : TipoConvocatoria.FERIA;
        this.estado = estado != null ? estado : EstadoConvocatoria.BORRADOR;
        this.fechaCierre = fechaCierre;
        this.tamanoEquipo = tamanoEquipo;
        this.imagenPortada = imagenPortada;
        this.creador = creador;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.tipo == null) this.tipo = TipoConvocatoria.FERIA;
        if (this.estado == null) this.estado = EstadoConvocatoria.BORRADOR;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void addRequisito(Requisito requisito) {
        this.requisitos.add(requisito);
        requisito.setConvocatoria(this);
    }

    public void removeRequisito(Requisito requisito) {
        this.requisitos.remove(requisito);
        requisito.setConvocatoria(null);
    }

    public void clearRequisitos() {
        for (Requisito req : this.requisitos) {
            req.setConvocatoria(null);
        }
        this.requisitos.clear();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public TipoConvocatoria getTipo() {
        return tipo;
    }

    public void setTipo(TipoConvocatoria tipo) {
        this.tipo = tipo;
    }

    public EstadoConvocatoria getEstado() {
        return estado;
    }

    public void setEstado(EstadoConvocatoria estado) {
        this.estado = estado;
    }

    public LocalDate getFechaCierre() {
        return fechaCierre;
    }

    public void setFechaCierre(LocalDate fechaCierre) {
        this.fechaCierre = fechaCierre;
    }

    public String getTamanoEquipo() {
        return tamanoEquipo;
    }

    public void setTamanoEquipo(String tamanoEquipo) {
        this.tamanoEquipo = tamanoEquipo;
    }

    public boolean isInscripcionGrupal() {
        return inscripcionGrupal;
    }

    public void setInscripcionGrupal(boolean inscripcionGrupal) {
        this.inscripcionGrupal = inscripcionGrupal;
    }

    public Integer getMinIntegrantesGrupo() {
        return minIntegrantesGrupo;
    }

    public void setMinIntegrantesGrupo(Integer minIntegrantesGrupo) {
        this.minIntegrantesGrupo = minIntegrantesGrupo;
    }

    public Integer getMaxIntegrantesGrupo() {
        return maxIntegrantesGrupo;
    }

    public void setMaxIntegrantesGrupo(Integer maxIntegrantesGrupo) {
        this.maxIntegrantesGrupo = maxIntegrantesGrupo;
    }

    public String getImagenPortada() {
        return imagenPortada;
    }

    public void setImagenPortada(String imagenPortada) {
        this.imagenPortada = imagenPortada;
    }

    public User getCreador() {
        return creador;
    }

    public void setCreador(User creador) {
        this.creador = creador;
    }

    public List<Requisito> getRequisitos() {
        return requisitos;
    }

    public void setRequisitos(List<Requisito> requisitos) {
        this.requisitos = requisitos;
    }

    public List<ConvocatoriaParticipante> getParticipantes() {
        return participantes;
    }

    public void setParticipantes(List<ConvocatoriaParticipante> participantes) {
        this.participantes = participantes;
    }

    public void addParticipante(ConvocatoriaParticipante p) {
        this.participantes.add(p);
        p.setConvocatoria(this);
    }

    public void removeParticipante(ConvocatoriaParticipante p) {
        this.participantes.remove(p);
        p.setConvocatoria(null);
    }

    public List<Tarea> getTareas() {
        return tareas;
    }

    public void setTareas(List<Tarea> tareas) {
        this.tareas = tareas;
    }

    public void addTarea(Tarea t) {
        this.tareas.add(t);
        t.setConvocatoria(this);
    }

    public void removeTarea(Tarea t) {
        this.tareas.remove(t);
        t.setConvocatoria(null);
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
