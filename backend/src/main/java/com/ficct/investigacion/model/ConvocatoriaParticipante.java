package com.ficct.investigacion.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "convocatoria_participantes",
    uniqueConstraints = @UniqueConstraint(columnNames = {"convocatoria_id", "usuario_id"})
)
public class ConvocatoriaParticipante {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "convocatoria_id", nullable = false)
    private Convocatoria convocatoria;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "usuario_id", nullable = false)
    private User usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Rol rol;

    @Column(name = "nombre_equipo", length = 120)
    private String nombreEquipo;

    @Column(name = "fecha_asignacion", nullable = false)
    private LocalDateTime fechaAsignacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asignado_por_id")
    private User asignadoPor;

    public ConvocatoriaParticipante() {
    }

    public ConvocatoriaParticipante(Convocatoria convocatoria, User usuario, Rol rol, String nombreEquipo, User asignadoPor) {
        this.convocatoria = convocatoria;
        this.usuario = usuario;
        this.rol = rol != null ? rol : (usuario != null ? usuario.getRol() : Rol.ESTUDIANTE);
        this.nombreEquipo = nombreEquipo;
        this.asignadoPor = asignadoPor;
    }

    @PrePersist
    protected void onCreate() {
        if (this.fechaAsignacion == null) {
            this.fechaAsignacion = LocalDateTime.now();
        }
        if (this.rol == null && this.usuario != null) {
            this.rol = this.usuario.getRol();
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

    public User getUsuario() {
        return usuario;
    }

    public void setUsuario(User usuario) {
        this.usuario = usuario;
    }

    public Rol getRol() {
        return rol;
    }

    public void setRol(Rol rol) {
        this.rol = rol;
    }

    public String getNombreEquipo() {
        return nombreEquipo;
    }

    public void setNombreEquipo(String nombreEquipo) {
        this.nombreEquipo = nombreEquipo;
    }

    public LocalDateTime getFechaAsignacion() {
        return fechaAsignacion;
    }

    public void setFechaAsignacion(LocalDateTime fechaAsignacion) {
        this.fechaAsignacion = fechaAsignacion;
    }

    public User getAsignadoPor() {
        return asignadoPor;
    }

    public void setAsignadoPor(User asignadoPor) {
        this.asignadoPor = asignadoPor;
    }
}
