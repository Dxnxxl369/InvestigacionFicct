package com.ficct.investigacion.dto;

public class GenerarLoteGruposRequest {
    private String prefijo = "Gr1erPar ";
    private int cantidad = 10;
    private Integer capacidadMaxima = 5;
    private Long actividadGrupoId;

    public GenerarLoteGruposRequest() {
    }

    public GenerarLoteGruposRequest(String prefijo, int cantidad, Integer capacidadMaxima, Long actividadGrupoId) {
        this.prefijo = prefijo;
        this.cantidad = cantidad;
        this.capacidadMaxima = capacidadMaxima;
        this.actividadGrupoId = actividadGrupoId;
    }

    public String getPrefijo() {
        return prefijo;
    }

    public void setPrefijo(String prefijo) {
        this.prefijo = prefijo;
    }

    public int getCantidad() {
        return cantidad;
    }

    public void setCantidad(int cantidad) {
        this.cantidad = cantidad;
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
