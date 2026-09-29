package com.ficct.investigacion.dto;

public class CrearGrupoRequest {
    private String nombre;
    private String descripcion;
    private Integer capacidadMaxima;
    private Long actividadGrupoId;

    public CrearGrupoRequest() {
    }

    public CrearGrupoRequest(String nombre, String descripcion, Integer capacidadMaxima, Long actividadGrupoId) {
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.capacidadMaxima = capacidadMaxima;
        this.actividadGrupoId = actividadGrupoId;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public Integer getCapacidadMaxima() {
        return capacidadMaxima;
    }

    public void setCapacidadMaxima(Integer capacidadMaxima) {
        this.capacidadMaxima = capacidadMaxima;
    }

    public Long getActividadGrupoId() {
        return actividadGrupoId;
    }

    public void setActividadGrupoId(Long actividadGrupoId) {
        this.actividadGrupoId = actividadGrupoId;
    }
}
