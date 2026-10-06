package com.ficct.investigacion.dto;

import java.time.LocalDateTime;

public class TareaDTO {

    private Long id;
    private Long convocatoriaId;
    private String convocatoriaTitulo;
    private String titulo;
    private String descripcion;
    private LocalDateTime fechaHabilitacion;
    private LocalDateTime fechaEntrega;
    private LocalDateTime fechaCorte;
    private LocalDateTime fechaLimite; // Compatibilidad
    private boolean habilitada;
    private String tiposArchivosPermitidos;
    private Integer tamanoMaximoMb;
    private Double puntajeMaximo;
    private Long creadorId;
    private String creadorNombre;
    private int totalEntregas;
    private String estadoMoodle; // "ABIERTA", "PENDIENTE_APERTURA", "CERRADA_CORTE", "DESHABILITADA"
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private EntregaTareaDTO miEntrega;
    private Long moduloId;
    private String moduloTitulo;
    private boolean esGrupal;
    private Long actividadGrupoId;
    private String actividadGrupoTitulo;

    public TareaDTO() {
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

    public LocalDateTime getFechaHabilitacion() {
        return fechaHabilitacion;
    }

    public void setFechaHabilitacion(LocalDateTime fechaHabilitacion) {
        this.fechaHabilitacion = fechaHabilitacion;
    }

    public LocalDateTime getFechaEntrega() {
        return fechaEntrega;
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
        return fechaEntrega != null ? fechaEntrega : fechaCorte;
    }

    public void setFechaLimite(LocalDateTime fechaLimite) {
        this.fechaLimite = fechaLimite;
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

    public int getTotalEntregas() {
        return totalEntregas;
    }

    public void setTotalEntregas(int totalEntregas) {
        this.totalEntregas = totalEntregas;
    }

    public String getEstadoMoodle() {
        return estadoMoodle;
    }

    public void setEstadoMoodle(String estadoMoodle) {
        this.estadoMoodle = estadoMoodle;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public EntregaTareaDTO getMiEntrega() {
        return miEntrega;
    }

    public void setMiEntrega(EntregaTareaDTO miEntrega) {
        this.miEntrega = miEntrega;
    }

    public Long getModuloId() {
        return moduloId;
    }

    public void setModuloId(Long moduloId) {
        this.moduloId = moduloId;
    }

    public String getModuloTitulo() {
        return moduloTitulo;
    }

    public void setModuloTitulo(String moduloTitulo) {
        this.moduloTitulo = moduloTitulo;
    }

    public boolean isEsGrupal() {
        return esGrupal;
    }

    public void setEsGrupal(boolean esGrupal) {
        this.esGrupal = esGrupal;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getActividadGrupoId() {
        return actividadGrupoId;
    }

    public void setActividadGrupoId(Long actividadGrupoId) {
        this.actividadGrupoId = actividadGrupoId;
    }

    public String getActividadGrupoTitulo() {
        return actividadGrupoTitulo;
    }

    public void setActividadGrupoTitulo(String actividadGrupoTitulo) {
        this.actividadGrupoTitulo = actividadGrupoTitulo;
    }
}
