package com.ficct.investigacion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public class TareaRequest {

    private Long convocatoriaId;

    @NotBlank(message = "El titulo de la tarea es obligatorio")
    @Size(max = 180, message = "El titulo no debe exceder los 180 caracteres")
    private String titulo;

    private String descripcion;

    // Triple control de fechas Moodle
    private LocalDateTime fechaHabilitacion;

    private LocalDateTime fechaEntrega;

    private LocalDateTime fechaCorte;

    private LocalDateTime fechaLimite; // Compatibilidad

    private boolean habilitada = true;

    private String tiposArchivosPermitidos = ".pdf, .docx, .zip";

    private Integer tamanoMaximoMb = 10;

    private Double puntajeMaximo = 100.0;

    private Long moduloId;

    private boolean esGrupal;
    private Long actividadGrupoId;

    public TareaRequest() {
    }

    public Long getModuloId() {
        return moduloId;
    }

    public void setModuloId(Long moduloId) {
        this.moduloId = moduloId;
    }

    public Long getConvocatoriaId() {
        return convocatoriaId;
    }

    public void setConvocatoriaId(Long convocatoriaId) {
        this.convocatoriaId = convocatoriaId;
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

    public LocalDateTime getFechaHabilitacion() {
        return fechaHabilitacion;
    }

    public void setFechaHabilitacion(LocalDateTime fechaHabilitacion) {
        this.fechaHabilitacion = fechaHabilitacion;
    }

    public LocalDateTime getFechaEntrega() {
        return fechaEntrega != null ? fechaEntrega : fechaLimite;
    }

    public void setFechaEntrega(LocalDateTime fechaEntrega) {
        this.fechaEntrega = fechaEntrega;
    }

    public LocalDateTime getFechaCorte() {
        return fechaCorte;
    }

    public void setFechaCorte(LocalDateTime fechaCorte) {
        this.fechaCorte = fechaCorte;
    }

    public LocalDateTime getFechaLimite() {
        return fechaEntrega != null ? fechaEntrega : fechaLimite;
    }

    public void setFechaLimite(LocalDateTime fechaLimite) {
        this.fechaLimite = fechaLimite;
        if (this.fechaEntrega == null) {
            this.fechaEntrega = fechaLimite;
        }
    }

    public boolean isHabilitada() {
        return habilitada;
    }

    public void setHabilitada(boolean habilitada) {
        this.habilitada = habilitada;
    }

    public String getTiposArchivosPermitidos() {
        return tiposArchivosPermitidos;
    }

    public void setTiposArchivosPermitidos(String tiposArchivosPermitidos) {
        this.tiposArchivosPermitidos = tiposArchivosPermitidos;
    }

    public Integer getTamanoMaximoMb() {
        return tamanoMaximoMb;
    }

    public void setTamanoMaximoMb(Integer tamanoMaximoMb) {
        this.tamanoMaximoMb = tamanoMaximoMb;
    }

    public Double getPuntajeMaximo() {
        return puntajeMaximo;
    }

    public void setPuntajeMaximo(Double puntajeMaximo) {
        this.puntajeMaximo = puntajeMaximo;
    }

    public boolean isEsGrupal() {
        return esGrupal;
    }

    public void setEsGrupal(boolean esGrupal) {
        this.esGrupal = esGrupal;
    }

    public Long getActividadGrupoId() {
        return actividadGrupoId;
    }

    public void setActividadGrupoId(Long actividadGrupoId) {
        this.actividadGrupoId = actividadGrupoId;
    }

    // ---- Mejoras: rubrica editable (null = no tocar; [] = borrar) ----
    private java.util.List<MejorasDTOs.CriterioRequest> rubrica;

    public java.util.List<MejorasDTOs.CriterioRequest> getRubrica() {
        return rubrica;
    }

    public void setRubrica(java.util.List<MejorasDTOs.CriterioRequest> rubrica) {
        this.rubrica = rubrica;
    }
}
