package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.Modulo;
import java.time.LocalDateTime;

public class ModuloDTO {

    private Long id;
    private Long convocatoriaId;
    private String convocatoriaTitulo;
    private String titulo;
    private String descripcion;
    private String imagenUrl;
    private Integer orden;
    private boolean activo;
    private int totalTareas;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ModuloDTO() {
    }

    public ModuloDTO(Modulo modulo) {
        if (modulo != null) {
            this.id = modulo.getId();
            if (modulo.getConvocatoria() != null) {
                this.convocatoriaId = modulo.getConvocatoria().getId();
                this.convocatoriaTitulo = modulo.getConvocatoria().getTitulo();
            }
            this.titulo = modulo.getTitulo();
            this.descripcion = modulo.getDescripcion();
            this.imagenUrl = modulo.getImagenUrl();
            this.orden = modulo.getOrden();
            this.activo = modulo.isActivo();
            this.totalTareas = modulo.getTareas() != null ? modulo.getTareas().size() : 0;
            this.createdAt = modulo.getCreatedAt();
            this.updatedAt = modulo.getUpdatedAt();
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

    public String getConvocatoriaTitulo() {
        return convocatoriaTitulo;
    }

    public void setConvocatoriaTitulo(String convocatoriaTitulo) {
        this.convocatoriaTitulo = convocatoriaTitulo;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public String getImagenUrl() {
        return imagenUrl;
    }

    public void setImagenUrl(String imagenUrl) {
        this.imagenUrl = imagenUrl;
    }

    public Integer getOrden() {
        return orden;
    }

    public void setOrden(Integer orden) {
        this.orden = orden;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
    }

    public int getTotalTareas() {
        return totalTareas;
    }

    public void setTotalTareas(int totalTareas) {
        this.totalTareas = totalTareas;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
