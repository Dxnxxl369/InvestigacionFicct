package com.ficct.investigacion.dto;

import java.time.LocalDateTime;

public class MiembroGrupoDTO {
    private Long participanteId;
    private Long usuarioId;
    private String nombreCompleto;
    private String email;
    private String fotoPerfil;
    private LocalDateTime fechaAsignacion;

    public MiembroGrupoDTO() {
    }

    public MiembroGrupoDTO(Long participanteId, Long usuarioId, String nombreCompleto, String email, String fotoPerfil, LocalDateTime fechaAsignacion) {
        this.participanteId = participanteId;
        this.usuarioId = usuarioId;
        this.nombreCompleto = nombreCompleto;
        this.email = email;
        this.fotoPerfil = fotoPerfil;
        this.fechaAsignacion = fechaAsignacion;
    }

    public Long getParticipanteId() {
        return participanteId;
    }

    public void setParticipanteId(Long participanteId) {
        this.participanteId = participanteId;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getNombreCompleto() {
        return nombreCompleto;
    }

    public void setNombreCompleto(String nombreCompleto) {
        this.nombreCompleto = nombreCompleto;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFotoPerfil() {
        return fotoPerfil;
    }

    public void setFotoPerfil(String fotoPerfil) {
        this.fotoPerfil = fotoPerfil;
    }

    public LocalDateTime getFechaAsignacion() {
        return fechaAsignacion;
    }

    public void setFechaAsignacion(LocalDateTime fechaAsignacion) {
        this.fechaAsignacion = fechaAsignacion;
    }
}
