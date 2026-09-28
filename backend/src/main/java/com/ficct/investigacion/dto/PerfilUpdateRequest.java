package com.ficct.investigacion.dto;

public class PerfilUpdateRequest {

    private String fotoPerfil;
    private String descripcion;
    private Boolean ocultarCursos;

    public PerfilUpdateRequest() {
    }

    public PerfilUpdateRequest(String fotoPerfil, String descripcion, Boolean ocultarCursos) {
        this.fotoPerfil = fotoPerfil;
        this.descripcion = descripcion;
        this.ocultarCursos = ocultarCursos;
    }

    public String getFotoPerfil() {
        return fotoPerfil;
    }

    public void setFotoPerfil(String fotoPerfil) {
        this.fotoPerfil = fotoPerfil;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public Boolean getOcultarCursos() {
        return ocultarCursos;
    }

    public void setOcultarCursos(Boolean ocultarCursos) {
        this.ocultarCursos = ocultarCursos;
    }
}
