package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.ConvocatoriaParticipante;
import com.ficct.investigacion.model.Rol;

import java.time.LocalDateTime;

public class ConvocatoriaParticipanteDTO {

    private Long id;
    private Long convocatoriaId;
    private Long usuarioId;
    private String nombre;
    private String apellidos;
    private String email;
    private Rol rol;
    private String nombreEquipo;
    private LocalDateTime fechaAsignacion;
    private String asignadoPorNombre;

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
        this.nombreEquipo = cp.getNombreEquipo();
        this.fechaAsignacion = cp.getFechaAsignacion();
        if (cp.getAsignadoPor() != null) {
            this.asignadoPorNombre = cp.getAsignadoPor().getNombre() + " " + cp.getAsignadoPor().getApellidos();
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

    public String getAsignadoPorNombre() {
        return asignadoPorNombre;
    }

    public void setAsignadoPorNombre(String asignadoPorNombre) {
        this.asignadoPorNombre = asignadoPorNombre;
    }
}
