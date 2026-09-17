package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.Requisito;

public class RequisitoDTO {

    private Long id;
    private String descripcion;

    public RequisitoDTO() {
    }

    public RequisitoDTO(Long id, String descripcion) {
        this.id = id;
        this.descripcion = descripcion;
    }

    public RequisitoDTO(Requisito requisito) {
        this.id = requisito.getId();
        this.descripcion = requisito.getDescripcion();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }
}
