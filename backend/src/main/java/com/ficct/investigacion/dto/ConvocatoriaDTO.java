package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.Convocatoria;
import com.ficct.investigacion.model.EstadoConvocatoria;
import com.ficct.investigacion.model.EstadoInscripcion;
import com.ficct.investigacion.model.Rol;
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

    // Resumen de asignaciones y métricas del área
    private List<Long> docenteIds = new ArrayList<>();
    private List<Long> juradoIds = new ArrayList<>();
    private List<String> docentesEncargados = new ArrayList<>();
    private List<String> juradosAsignados = new ArrayList<>();
    private long totalAdmitidos = 0;
    private long totalSolicitudesPendientes = 0;
    private EstadoInscripcion miEstadoInscripcion;
    private Rol miRol;

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

        if (c.getParticipantes() != null) {
            this.docenteIds = c.getParticipantes().stream()
                    .filter(p -> p.getRol() == Rol.DOCENTE && p.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO && p.getUsuario() != null)
                    .map(p -> p.getUsuario().getId())
                    .distinct()
                    .collect(Collectors.toList());

            this.juradoIds = c.getParticipantes().stream()
                    .filter(p -> p.getRol() == Rol.JURADO && p.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO && p.getUsuario() != null)
                    .map(p -> p.getUsuario().getId())
                    .distinct()
                    .collect(Collectors.toList());

            this.docentesEncargados = c.getParticipantes().stream()
                    .filter(p -> p.getRol() == Rol.DOCENTE && p.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO)
                    .map(p -> p.getUsuario() != null ? p.getUsuario().getNombreCompleto() : "Docente")
                    .distinct()
                    .collect(Collectors.toList());

            this.juradosAsignados = c.getParticipantes().stream()
                    .filter(p -> p.getRol() == Rol.JURADO && p.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO)
                    .map(p -> p.getUsuario() != null ? p.getUsuario().getNombreCompleto() : "Jurado")
                    .distinct()
                    .collect(Collectors.toList());

            this.totalAdmitidos = c.getParticipantes().stream()
                    .filter(p -> p.getRol() == Rol.ESTUDIANTE && p.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO)
                    .count();

            this.totalSolicitudesPendientes = c.getParticipantes().stream()
                    .filter(p -> p.getRol() == Rol.ESTUDIANTE && p.getEstadoInscripcion() == EstadoInscripcion.PENDIENTE)
                    .count();
        }
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

    public List<String> getDocentesEncargados() {
        return docentesEncargados;
    }

    public void setDocentesEncargados(List<String> docentesEncargados) {
        this.docentesEncargados = docentesEncargados;
    }

    public List<String> getJuradosAsignados() {
        return juradosAsignados;
    }

    public void setJuradosAsignados(List<String> juradosAsignados) {
        this.juradosAsignados = juradosAsignados;
    }

    public long getTotalAdmitidos() {
        return totalAdmitidos;
    }

    public void setTotalAdmitidos(long totalAdmitidos) {
        this.totalAdmitidos = totalAdmitidos;
    }

    public long getTotalSolicitudesPendientes() {
        return totalSolicitudesPendientes;
    }

    public void setTotalSolicitudesPendientes(long totalSolicitudesPendientes) {
        this.totalSolicitudesPendientes = totalSolicitudesPendientes;
    }

    public EstadoInscripcion getMiEstadoInscripcion() {
        return miEstadoInscripcion;
    }

    public void setMiEstadoInscripcion(EstadoInscripcion miEstadoInscripcion) {
        this.miEstadoInscripcion = miEstadoInscripcion;
    }

    public Rol getMiRol() {
        return miRol;
    }

    public void setMiRol(Rol miRol) {
        this.miRol = miRol;
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
