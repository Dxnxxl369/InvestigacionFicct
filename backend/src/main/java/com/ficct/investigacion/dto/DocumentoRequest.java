package com.ficct.investigacion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class DocumentoRequest {

    @NotBlank(message = "El titulo es obligatorio")
    @Size(max = 180, message = "El titulo no debe exceder los 180 caracteres")
    private String titulo;

    private String descripcion;

    private String categoria; // TESIS, FERIA, HACKATHON, INVESTIGACION

    private String contenido;

    private Long convocatoriaId;

    public DocumentoRequest() {
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

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public String getContenido() {
        return contenido;
    }

    public void setContenido(String contenido) {
        this.contenido = contenido;
    }

    public Long getConvocatoriaId() {
        return convocatoriaId;
    }

    public void setConvocatoriaId(Long convocatoriaId) {
        this.convocatoriaId = convocatoriaId;
    }
}
