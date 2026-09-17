package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.EstadoDocumento;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class DocumentoDTO {

    private Long id;
    private String titulo;
    private String descripcion;
    private String categoria;
    private String contenido;
    private EstadoDocumento estado;

    private Long autorId;
    private String autorNombre;
    private String autorEmail;

    private Long convocatoriaId;
    private String convocatoriaTitulo;

    private String miPermiso; // "OWNER", "ADMINISTRACION", "EDICION", "LECTURA"
    private List<DocumentoColaboradorDTO> colaboradores = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public DocumentoDTO() {
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

    public EstadoDocumento getEstado() {
        return estado;
    }

    public void setEstado(EstadoDocumento estado) {
        this.estado = estado;
    }

    public Long getAutorId() {
        return autorId;
    }

    public void setAutorId(Long autorId) {
        this.autorId = autorId;
    }

    public String getAutorNombre() {
        return autorNombre;
    }

    public void setAutorNombre(String autorNombre) {
        this.autorNombre = autorNombre;
    }

    public String getAutorEmail() {
        return autorEmail;
    }

    public void setAutorEmail(String autorEmail) {
        this.autorEmail = autorEmail;
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

    public String getMiPermiso() {
        return miPermiso;
    }

    public void setMiPermiso(String miPermiso) {
        this.miPermiso = miPermiso;
    }

    public List<DocumentoColaboradorDTO> getColaboradores() {
        return colaboradores;
    }

    public void setColaboradores(List<DocumentoColaboradorDTO> colaboradores) {
        this.colaboradores = colaboradores;
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
