package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.TipoConvocatoria;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class ConvocatoriaRequest {

    @NotBlank(message = "El título de la convocatoria es obligatorio")
    private String titulo;

    @NotBlank(message = "La descripción de la convocatoria es obligatoria")
    private String descripcion;

    @NotNull(message = "El tipo de actividad es obligatorio")
    private TipoConvocatoria tipo = TipoConvocatoria.FERIA;

    private LocalDate fechaCierre;

    private String tamanoEquipo;

    private String imagenPortada;

    private List<String> requisitos = new ArrayList<>();

    // Encargados y Jurados asignados al crear o editar
    private List<Long> docenteIds = new ArrayList<>();
    private List<Long> juradoIds = new ArrayList<>();

    public ConvocatoriaRequest() {
    }

    public ConvocatoriaRequest(String titulo, String descripcion, TipoConvocatoria tipo,
                               LocalDate fechaCierre, String tamanoEquipo, String imagenPortada, List<String> requisitos) {
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.tipo = tipo != null ? tipo : TipoConvocatoria.FERIA;
        this.fechaCierre = fechaCierre;
        this.tamanoEquipo = tamanoEquipo;
        this.imagenPortada = imagenPortada;
        this.requisitos = requisitos != null ? requisitos : new ArrayList<>();
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

    public List<String> getRequisitos() {
        return requisitos;
    }

    public void setRequisitos(List<String> requisitos) {
        this.requisitos = requisitos;
    }

    public List<Long> getDocenteIds() {
        return docenteIds;
    }

    public void setDocenteIds(List<Long> docenteIds) {
        this.docenteIds = docenteIds;
    }

    public List<Long> getJuradoIds() {
        return juradoIds;
    }

    public void setJuradoIds(List<Long> juradoIds) {
        this.juradoIds = juradoIds;
    }
}
