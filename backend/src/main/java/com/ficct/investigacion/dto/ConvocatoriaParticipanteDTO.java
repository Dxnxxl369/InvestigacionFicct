package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.ConvocatoriaParticipante;
import com.ficct.investigacion.model.EstadoInscripcion;
import com.ficct.investigacion.model.Rol;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class ConvocatoriaParticipanteDTO {

    private Long id;
    private Long convocatoriaId;
    private Long usuarioId;
    private String nombre;
    private String apellidos;
    private String email;
    private Rol rol;
    private EstadoInscripcion estadoInscripcion;
    private String nombreEquipo;
    private LocalDateTime fechaSolicitud;
    private LocalDateTime fechaRespuesta;
    private LocalDateTime fechaAsignacion;
    private String motivoRechazo;
    private String asignadoPorNombre;
    private Long grupoId;
    private List<String> gruposNombres = new ArrayList<>();

    public ConvocatoriaParticipanteDTO() {
    }

    public ConvocatoriaParticipanteDTO(ConvocatoriaParticipante cp) {
        this.id = cp.getId();
        this.convocatoriaId = cp.getConvocatoria() != null ? cp.getConvocatoria().getId() : null;
        if (cp.getUsuario() != null) {
            this.usuarioId = cp.getUsuario().getId();
            this.nombre = cp.getUsuario().getNombre();
            this.apellidos = cp.getUsuario().getApellidos();
            this.email = cp.getUsuario().getEmail();
        }
        this.rol = cp.getRol();
        this.estadoInscripcion = cp.getEstadoInscripcion();
        this.nombreEquipo = cp.getNombreEquipo();
        this.fechaSolicitud = cp.getFechaSolicitud();
        this.fechaRespuesta = cp.getFechaRespuesta();
        this.fechaAsignacion = cp.getFechaAsignacion();
        this.motivoRechazo = cp.getMotivoRechazo();
        if (cp.getAsignadoPor() != null) {
            this.asignadoPorNombre = cp.getAsignadoPor().getNombre() + " " + cp.getAsignadoPor().getApellidos();
        }
        if (cp.getGrupo() != null) {
            this.grupoId = cp.getGrupo().getId();
        }
        if (cp.getGrupos() != null && !cp.getGrupos().isEmpty()) {
            this.gruposNombres = cp.getGrupos().stream()
                    .map(g -> g.getNombre())
                    .filter(n -> n != null && !n.trim().isEmpty())
                    .distinct()
                    .sorted(String.CASE_INSENSITIVE_ORDER)
                    .collect(Collectors.toList());
        } else if (cp.getGrupo() != null) {
            this.gruposNombres = List.of(cp.getGrupo().getNombre());
        } else {
            this.gruposNombres = new ArrayList<>();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getConvocatoriaId() {
        return convocatoriaId;
    }

    public void setConvocatoriaId(Long convocatoriaId) {
        this.convocatoriaId = convocatoriaId;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApellidos() {
        return apellidos;
    }

    public void setApellidos(String apellidos) {
        this.apellidos = apellidos;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
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

    public String getAsignadoPorNombre() {
        return asignadoPorNombre;
    }

    public void setAsignadoPorNombre(String asignadoPorNombre) {
        this.asignadoPorNombre = asignadoPorNombre;
    }

    public Long getGrupoId() {
        return grupoId;
    }

    public void setGrupoId(Long grupoId) {
        this.grupoId = grupoId;
    }

    public List<String> getGruposNombres() {
        return gruposNombres;
    }

    public void setGruposNombres(List<String> gruposNombres) {
        this.gruposNombres = gruposNombres;
    }
}
