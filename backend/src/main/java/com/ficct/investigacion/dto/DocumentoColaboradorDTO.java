package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.TipoPermisoDoc;
import java.time.LocalDateTime;

public class DocumentoColaboradorDTO {
    private Long id;
    private Long usuarioId;
    private String usuarioNombre;
    private String usuarioEmail;
    private TipoPermisoDoc permiso;
    private LocalDateTime fechaAsignacion;

    public DocumentoColaboradorDTO() {
    }

    public DocumentoColaboradorDTO(Long id, Long usuarioId, String usuarioNombre, String usuarioEmail,
                                   TipoPermisoDoc permiso, LocalDateTime fechaAsignacion) {
        this.id = id;
        this.usuarioId = usuarioId;
        this.usuarioNombre = usuarioNombre;
        this.usuarioEmail = usuarioEmail;
        this.permiso = permiso;
        this.fechaAsignacion = fechaAsignacion;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getUsuarioNombre() {
        return usuarioNombre;
    }

    public void setUsuarioNombre(String usuarioNombre) {
        this.usuarioNombre = usuarioNombre;
    }

    public String getUsuarioEmail() {
        return usuarioEmail;
    }

    public void setUsuarioEmail(String usuarioEmail) {
        this.usuarioEmail = usuarioEmail;
    }

    public TipoPermisoDoc getPermiso() {
        return permiso;
    }

    public void setPermiso(TipoPermisoDoc permiso) {
        this.permiso = permiso;
    }

    public LocalDateTime getFechaAsignacion() {
        return fechaAsignacion;
    }

    public void setFechaAsignacion(LocalDateTime fechaAsignacion) {
        this.fechaAsignacion = fechaAsignacion;
    }
}
