package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.Rol;

public class DesignarParticipanteRequest {

    private Long usuarioId;
    private String email;
    private Rol rol; // DOCENTE o JURADO
    private String nombreEquipo;

    public DesignarParticipanteRequest() {
    }

    public DesignarParticipanteRequest(Long usuarioId, String email, Rol rol, String nombreEquipo) {
        this.usuarioId = usuarioId;
        this.email = email;
        this.rol = rol;
        this.nombreEquipo = nombreEquipo;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
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
}
