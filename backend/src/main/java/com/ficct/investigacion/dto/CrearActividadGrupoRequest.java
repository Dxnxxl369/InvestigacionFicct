package com.ficct.investigacion.dto;

import java.time.LocalDateTime;

public class CrearActividadGrupoRequest {
    private Long moduloId;
    private String titulo;
    private String descripcion;
    private LocalDateTime fechaApertura;
    private LocalDateTime fechaCierre;
    private Integer capacidadPorGrupo = 5;
    private Boolean permitirCambio = true;
    private Boolean mostrarMiembros = true;
    private Boolean generarGrupos = false;
    private Integer cantidadGrupos = 10;
    private String prefijoGrupos = "Gr1erPar ";

    public CrearActividadGrupoRequest() {
    }

    public Long getModuloId() {
        return moduloId;
    }

    public void setModuloId(Long moduloId) {
        this.moduloId = moduloId;
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

    public LocalDateTime getFechaApertura() {
        return fechaApertura;
    }

    public void setFechaApertura(LocalDateTime fechaApertura) {
        this.fechaApertura = fechaApertura;
    }

    public LocalDateTime getFechaCierre() {
        return fechaCierre;
    }

    public void setFechaCierre(LocalDateTime fechaCierre) {
        this.fechaCierre = fechaCierre;
    }

    public Integer getCapacidadPorGrupo() {
        return capacidadPorGrupo;
    }

    public void setCapacidadPorGrupo(Integer capacidadPorGrupo) {
        this.capacidadPorGrupo = capacidadPorGrupo;
    }

    public Boolean getPermitirCambio() {
        return permitirCambio;
    }

    public void setPermitirCambio(Boolean permitirCambio) {
        this.permitirCambio = permitirCambio;
    }

    public Boolean getMostrarMiembros() {
        return mostrarMiembros;
    }

    public void setMostrarMiembros(Boolean mostrarMiembros) {
        this.mostrarMiembros = mostrarMiembros;
    }

    public Boolean getGenerarGrupos() {
        return generarGrupos;
    }

    public void setGenerarGrupos(Boolean generarGrupos) {
        this.generarGrupos = generarGrupos;
    }

    public Integer getCantidadGrupos() {
        return cantidadGrupos;
    }

    public void setCantidadGrupos(Integer cantidadGrupos) {
        this.cantidadGrupos = cantidadGrupos;
    }

    public String getPrefijoGrupos() {
        return prefijoGrupos;
    }

    public void setPrefijoGrupos(String prefijoGrupos) {
        this.prefijoGrupos = prefijoGrupos;
    }
}
