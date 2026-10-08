package com.ficct.investigacion.dto;

import java.util.ArrayList;
import java.util.List;

public class GrupoDTO {
    private Long id;
    private Long convocatoriaId;
    private Long actividadGrupoId;
    private String nombre;
    private String descripcion;
    private Integer capacidadMaxima;
    private int cantidadMiembros;
    private boolean completo;
    private List<MiembroGrupoDTO> miembros = new ArrayList<>();

    public GrupoDTO() {
    }

    public GrupoDTO(Long id, Long convocatoriaId, Long actividadGrupoId, String nombre, String descripcion,
                    Integer capacidadMaxima, int cantidadMiembros, boolean completo, List<MiembroGrupoDTO> miembros) {
        this.id = id;
        this.convocatoriaId = convocatoriaId;
        this.actividadGrupoId = actividadGrupoId;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.capacidadMaxima = capacidadMaxima;
        this.cantidadMiembros = cantidadMiembros;
        this.completo = completo;
        this.miembros = miembros != null ? miembros : new ArrayList<>();
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

    public Long getActividadGrupoId() {
        return actividadGrupoId;
    }

    public void setActividadGrupoId(Long actividadGrupoId) {
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

    public int getCantidadMiembros() {
        return cantidadMiembros;
    }

    public void setCantidadMiembros(int cantidadMiembros) {
        this.cantidadMiembros = cantidadMiembros;
    }

    public boolean isCompleto() {
        return completo;
    }

    public void setCompleto(boolean completo) {
        this.completo = completo;
    }

    public List<MiembroGrupoDTO> getMiembros() {
        return miembros;
    }

    public void setMiembros(List<MiembroGrupoDTO> miembros) {
        this.miembros = miembros;
    }
}
