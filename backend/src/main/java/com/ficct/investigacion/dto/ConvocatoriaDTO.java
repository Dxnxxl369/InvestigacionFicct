package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.Convocatoria;
import com.ficct.investigacion.model.EstadoConvocatoria;
import com.ficct.investigacion.model.TipoConvocatoria;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class ConvocatoriaDTO {

    private Long id;
    private String titulo;
    private String descripcion;
    private TipoConvocatoria tipo;
    private EstadoConvocatoria estado;
    private LocalDate fechaCierre;
    private String tamanoEquipo;
    private String imagenPortada;
    private Long creadorId;
    private String creadorNombre;
    private String creadorEmail;
    private List<RequisitoDTO> requisitos = new ArrayList<>();
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ConvocatoriaDTO() {
    }

    public ConvocatoriaDTO(Convocatoria c) {
        this.id = c.getId();
        this.titulo = c.getTitulo();
        this.descripcion = c.getDescripcion();
        this.tipo = c.getTipo();
        this.estado = c.getEstado();
        this.fechaCierre = c.getFechaCierre();
        this.tamanoEquipo = c.getTamanoEquipo();
        this.imagenPortada = c.getImagenPortada();
        if (c.getCreador() != null) {
            this.creadorId = c.getCreador().getId();
            this.creadorNombre = c.getCreador().getNombreCompleto();
            this.creadorEmail = c.getCreador().getEmail();
        }
        if (c.getRequisitos() != null) {
            this.requisitos = c.getRequisitos().stream()
                    .map(RequisitoDTO::new)
                    .collect(Collectors.toList());
        }
        this.createdAt = c.getCreatedAt();
        this.updatedAt = c.getUpdatedAt();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public TipoConvocatoria getTipo() {
        return tipo;
    }

    public void setTipo(TipoConvocatoria tipo) {
        this.tipo = tipo;
    }

    public EstadoConvocatoria getEstado() {
        return estado;
    }

    public void setEstado(EstadoConvocatoria estado) {
        this.estado = estado;
    }

    public LocalDate getFechaCierre() {
        return fechaCierre;
    }

    public void setFechaCierre(LocalDate fechaCierre) {
        this.fechaCierre = fechaCierre;
    }

    public String getTamanoEquipo() {
        return tamanoEquipo;
    }

    public void setTamanoEquipo(String tamanoEquipo) {
        this.tamanoEquipo = tamanoEquipo;
    }

    public String getImagenPortada() {
        return imagenPortada;
    }

    public void setImagenPortada(String imagenPortada) {
        this.imagenPortada = imagenPortada;
    }

    public Long getCreadorId() {
        return creadorId;
    }

    public void setCreadorId(Long creadorId) {
        this.creadorId = creadorId;
    }

    public String getCreadorNombre() {
        return creadorNombre;
    }

    public void setCreadorNombre(String creadorNombre) {
        this.creadorNombre = creadorNombre;
    }

    public String getCreadorEmail() {
        return creadorEmail;
    }

    public void setCreadorEmail(String creadorEmail) {
        this.creadorEmail = creadorEmail;
    }

    public List<RequisitoDTO> getRequisitos() {
        return requisitos;
    }

    public void setRequisitos(List<RequisitoDTO> requisitos) {
        this.requisitos = requisitos;
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
