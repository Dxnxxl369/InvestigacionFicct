package com.ficct.investigacion.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class ActividadGrupoDTO {
    private Long id;
    private Long convocatoriaId;
    private Long moduloId;
    private String titulo;
    private String descripcion;
    private LocalDateTime fechaApertura;
    private LocalDateTime fechaCierre;
    private Integer capacidadPorGrupo;
    private boolean permitirCambio;
    private boolean mostrarMiembros;
    private boolean habilitada;
    private boolean abierta;
    private boolean cerrada;
    private Long grupoSeleccionadoId;
    private String grupoSeleccionadoNombre;
    private List<GrupoDTO> grupos = new ArrayList<>();

    public ActividadGrupoDTO() {
    }

    public ActividadGrupoDTO(Long id, Long convocatoriaId, Long moduloId, String titulo, String descripcion,
                             LocalDateTime fechaApertura, LocalDateTime fechaCierre, Integer capacidadPorGrupo,
                             boolean permitirCambio, boolean mostrarMiembros, boolean habilitada,
                             boolean abierta, boolean cerrada, Long grupoSeleccionadoId, String grupoSeleccionadoNombre,
                             List<GrupoDTO> grupos) {
        this.id = id;
        this.convocatoriaId = convocatoriaId;
        this.moduloId = moduloId;
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.fechaApertura = fechaApertura;
        this.fechaCierre = fechaCierre;
        this.capacidadPorGrupo = capacidadPorGrupo;
        this.permitirCambio = permitirCambio;
        this.mostrarMiembros = mostrarMiembros;
        this.habilitada = habilitada;
        this.abierta = abierta;
        this.cerrada = cerrada;
        this.grupoSeleccionadoId = grupoSeleccionadoId;
        this.grupoSeleccionadoNombre = grupoSeleccionadoNombre;
        this.grupos = grupos != null ? grupos : new ArrayList<>();
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

    public boolean isPermitirCambio() {
        return permitirCambio;
    }

    public void setPermitirCambio(boolean permitirCambio) {
        this.permitirCambio = permitirCambio;
    }

    public boolean isMostrarMiembros() {
        return mostrarMiembros;
    }

    public void setMostrarMiembros(boolean mostrarMiembros) {
        this.mostrarMiembros = mostrarMiembros;
    }

    public boolean isHabilitada() {
        return habilitada;
    }

    public void setHabilitada(boolean habilitada) {
        this.habilitada = habilitada;
    }

    public boolean isAbierta() {
        return abierta;
    }

    public void setAbierta(boolean abierta) {
        this.abierta = abierta;
    }

    public boolean isCerrada() {
        return cerrada;
    }

    public void setCerrada(boolean cerrada) {
        this.cerrada = cerrada;
    }

    public Long getGrupoSeleccionadoId() {
        return grupoSeleccionadoId;
    }

    public void setGrupoSeleccionadoId(Long grupoSeleccionadoId) {
        this.grupoSeleccionadoId = grupoSeleccionadoId;
    }

    public String getGrupoSeleccionadoNombre() {
        return grupoSeleccionadoNombre;
    }

    public void setGrupoSeleccionadoNombre(String grupoSeleccionadoNombre) {
        this.grupoSeleccionadoNombre = grupoSeleccionadoNombre;
    }

    public List<GrupoDTO> getGrupos() {
        return grupos;
    }

    public void setGrupos(List<GrupoDTO> grupos) {
        this.grupos = grupos;
    }
}
