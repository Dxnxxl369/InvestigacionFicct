package com.ficct.investigacion.model;

import jakarta.persistence.*;
import org.hibernate.Hibernate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

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

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_inscripcion", nullable = false, length = 30)
    private EstadoInscripcion estadoInscripcion = EstadoInscripcion.PENDIENTE;

    @Column(name = "nombre_equipo", length = 300)
    private String nombreEquipo;

    @Column(name = "fecha_solicitud")
    private LocalDateTime fechaSolicitud;

    @Column(name = "fecha_respuesta")
    private LocalDateTime fechaRespuesta;

    @Column(name = "fecha_asignacion", nullable = false)
    private LocalDateTime fechaAsignacion;

    @Column(name = "motivo_rechazo", length = 300)
    private String motivoRechazo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asignado_por_id")
    private User asignadoPor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grupo_id")
    private Grupo grupo;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "grupo_participantes",
        joinColumns = @JoinColumn(name = "participante_id"),
        inverseJoinColumns = @JoinColumn(name = "grupo_id")
    )
    private List<Grupo> grupos = new ArrayList<>();

    public ConvocatoriaParticipante() {
    }

    public ConvocatoriaParticipante(Convocatoria convocatoria, User usuario, Rol rol, String nombreEquipo, User asignadoPor) {
        this.convocatoria = convocatoria;
        this.usuario = usuario;
        this.rol = rol != null ? rol : (usuario != null ? usuario.getRol() : Rol.ESTUDIANTE);
        this.nombreEquipo = nombreEquipo;
        this.asignadoPor = asignadoPor;
        this.fechaSolicitud = LocalDateTime.now();
        this.fechaAsignacion = LocalDateTime.now();

        // Si es docente o jurado asignado por admin/docente, entra directamente como ACEPTADO
        if (this.rol == Rol.DOCENTE || this.rol == Rol.JURADO) {
            this.estadoInscripcion = EstadoInscripcion.ACEPTADO;
            this.fechaRespuesta = LocalDateTime.now();
        } else {
            // Estudiantes inician en PENDIENTE
            this.estadoInscripcion = EstadoInscripcion.PENDIENTE;
        }
    }

    public ConvocatoriaParticipante(Convocatoria convocatoria, User usuario, Rol rol, EstadoInscripcion estado, String nombreEquipo, User asignadoPor) {
        this.convocatoria = convocatoria;
        this.usuario = usuario;
        this.rol = rol != null ? rol : (usuario != null ? usuario.getRol() : Rol.ESTUDIANTE);
        this.estadoInscripcion = estado != null ? estado : EstadoInscripcion.PENDIENTE;
        this.nombreEquipo = nombreEquipo;
        this.asignadoPor = asignadoPor;
        this.fechaSolicitud = LocalDateTime.now();
        this.fechaAsignacion = LocalDateTime.now();
        if (this.estadoInscripcion == EstadoInscripcion.ACEPTADO) {
            this.fechaRespuesta = LocalDateTime.now();
        }
    }

    @PrePersist
    protected void onCreate() {
        if (this.fechaAsignacion == null) {
            this.fechaAsignacion = LocalDateTime.now();
        }
        if (this.fechaSolicitud == null) {
            this.fechaSolicitud = LocalDateTime.now();
        }
        if (this.rol == null && this.usuario != null) {
            this.rol = this.usuario.getRol();
        }
        if (this.estadoInscripcion == null) {
            if (this.rol == Rol.DOCENTE || this.rol == Rol.JURADO) {
                this.estadoInscripcion = EstadoInscripcion.ACEPTADO;
                this.fechaRespuesta = LocalDateTime.now();
            } else {
                this.estadoInscripcion = EstadoInscripcion.PENDIENTE;
            }
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

    public EstadoInscripcion getEstadoInscripcion() {
        return estadoInscripcion;
    }

    public void setEstadoInscripcion(EstadoInscripcion estadoInscripcion) {
        this.estadoInscripcion = estadoInscripcion;
    }

    public String getNombreEquipo() {
        return nombreEquipo;
    }

    public void setNombreEquipo(String nombreEquipo) {
        this.nombreEquipo = nombreEquipo;
    }

    public LocalDateTime getFechaSolicitud() {
        return fechaSolicitud;
    }

    public void setFechaSolicitud(LocalDateTime fechaSolicitud) {
        this.fechaSolicitud = fechaSolicitud;
    }

    public LocalDateTime getFechaRespuesta() {
        return fechaRespuesta;
    }

    public void setFechaRespuesta(LocalDateTime fechaRespuesta) {
        this.fechaRespuesta = fechaRespuesta;
    }

    public LocalDateTime getFechaAsignacion() {
        return fechaAsignacion;
    }

    public void setFechaAsignacion(LocalDateTime fechaAsignacion) {
        this.fechaAsignacion = fechaAsignacion;
    }

    public String getMotivoRechazo() {
        return motivoRechazo;
    }

    public void setMotivoRechazo(String motivoRechazo) {
        this.motivoRechazo = motivoRechazo;
    }

    public User getAsignadoPor() {
        return asignadoPor;
    }

    public void setAsignadoPor(User asignadoPor) {
        this.asignadoPor = asignadoPor;
    }

    public Grupo getGrupo() {
        return grupo;
    }

    public void setGrupo(Grupo grupo) {
        this.grupo = grupo;
        if (grupo != null) {
            if (this.grupos == null) {
                this.grupos = new ArrayList<>();
            }
            if (!Hibernate.isInitialized(this.grupos)) {
                this.nombreEquipo = grupo.getNombre();
                return;
            }
            if (this.grupos.stream().noneMatch(g -> mismoGrupo(g, grupo))) {
                this.grupos.add(grupo);
            }
            actualizarNombreEquipoDesdeGrupos();
        } else {
            if (this.grupos != null) {
                this.grupos.clear();
            }
            this.nombreEquipo = null;
        }
    }

    public List<Grupo> getGrupos() {
        if (this.grupos == null) {
            this.grupos = new ArrayList<>();
        }
        return this.grupos;
    }

    public void setGrupos(List<Grupo> grupos) {
        this.grupos = grupos != null ? grupos : new ArrayList<>();
        actualizarNombreEquipoDesdeGrupos();
    }

    public void agregarGrupo(Grupo g) {
        if (g == null) return;
        if (this.grupos == null) {
            this.grupos = new ArrayList<>();
        }
        if (this.grupos.stream().noneMatch(existing -> mismoGrupo(existing, g))) {
            this.grupos.add(g);
        }
        this.grupo = g;
        actualizarNombreEquipoDesdeGrupos();
    }

    public void removerGrupo(Long grupoId) {
        if (grupoId == null || this.grupos == null) return;
        this.grupos.removeIf(g -> g.getId().equals(grupoId));
        if (this.grupo != null && grupoId.equals(this.grupo.getId())) {
            this.grupo = this.grupos.isEmpty() ? null : this.grupos.get(this.grupos.size() - 1);
        }
        actualizarNombreEquipoDesdeGrupos();
    }

    public void actualizarNombreEquipoDesdeGrupos() {
        if (this.grupos != null && !Hibernate.isInitialized(this.grupos)) {
            this.nombreEquipo = this.grupo != null ? this.grupo.getNombre() : this.nombreEquipo;
            return;
        }
        if (this.grupos == null || this.grupos.isEmpty()) {
            this.nombreEquipo = null;
            this.grupo = null;
        } else {
            String nombres = this.grupos.stream()
                    .map(Grupo::getNombre)
                    .filter(n -> n != null && !n.trim().isEmpty())
                    .distinct()
                    .sorted(String.CASE_INSENSITIVE_ORDER)
                    .collect(Collectors.joining(", "));
            this.nombreEquipo = nombres.isEmpty() ? null : nombres;
            if (this.grupo == null || this.grupos.stream().noneMatch(g -> mismoGrupo(g, this.grupo))) {
                this.grupo = this.grupos.get(this.grupos.size() - 1);
            }
        }
    }

    private boolean mismoGrupo(Grupo a, Grupo b) {
        if (a == null || b == null) {
            return false;
        }
        if (a == b) {
            return true;
        }
        Long aId = a.getId();
        Long bId = b.getId();
        return aId != null && bId != null && aId.equals(bId);
    }
}
