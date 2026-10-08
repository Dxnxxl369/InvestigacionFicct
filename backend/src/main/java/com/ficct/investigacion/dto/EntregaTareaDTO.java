package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.EstadoEntrega;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class EntregaTareaDTO {

    private Long id;
    private Long tareaId;
    private String tareaTitulo;
    private Long estudianteId;
    private String estudianteNombre;
    private String estudianteEmail;
    private Long documentoId;
    private String documentoTitulo;
    private String nombreArchivo;
    private String archivoUrl;
    private String comentarioEstudiante;
    private LocalDateTime fechaEntrega;
    private EstadoEntrega estado;
    private Double calificacion;
    private String retroalimentacion;
    private LocalDateTime fechaCalificacion;
    private String calificadoPorNombre;
    private boolean esGrupal;
    private Long entregadoPorId;
    private String entregadoPorNombre;
    private String entregadoPorEmail;
    private boolean esMiEntregaPropia = true;
    private Long grupoId;
    private String grupoNombre;
    private List<String> companerosEquipo = new ArrayList<>();

    public EntregaTareaDTO() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTareaId() {
        return tareaId;
    }

    public void setTareaId(Long tareaId) {
        this.tareaId = tareaId;
    }

    public String getTareaTitulo() {
        return tareaTitulo;
    }

    public void setTareaTitulo(String tareaTitulo) {
        this.tareaTitulo = tareaTitulo;
    }

    public Long getEstudianteId() {
        return estudianteId;
    }

    public void setEstudianteId(Long estudianteId) {
        this.estudianteId = estudianteId;
    }

    public String getEstudianteNombre() {
        return estudianteNombre;
    }

    public void setEstudianteNombre(String estudianteNombre) {
        this.estudianteNombre = estudianteNombre;
    }

    public String getEstudianteEmail() {
        return estudianteEmail;
    }

    public void setEstudianteEmail(String estudianteEmail) {
        this.estudianteEmail = estudianteEmail;
    }

    public Long getDocumentoId() {
        return documentoId;
    }

    public void setDocumentoId(Long documentoId) {
        this.documentoId = documentoId;
    }

    public String getDocumentoTitulo() {
        return documentoTitulo;
    }

    public void setDocumentoTitulo(String documentoTitulo) {
        this.documentoTitulo = documentoTitulo;
    }

    public String getNombreArchivo() {
        return nombreArchivo;
    }

    public void setNombreArchivo(String nombreArchivo) {
        this.nombreArchivo = nombreArchivo;
    }

    public String getArchivoUrl() {
        return archivoUrl;
    }

    public void setArchivoUrl(String archivoUrl) {
        this.archivoUrl = archivoUrl;
    }

    public String getComentarioEstudiante() {
        return comentarioEstudiante;
    }

    public void setComentarioEstudiante(String comentarioEstudiante) {
        this.comentarioEstudiante = comentarioEstudiante;
    }

    public LocalDateTime getFechaEntrega() {
        return fechaEntrega;
    }

    public void setFechaEntrega(LocalDateTime fechaEntrega) {
        this.fechaEntrega = fechaEntrega;
    }

    public EstadoEntrega getEstado() {
        return estado;
    }

    public void setEstado(EstadoEntrega estado) {
        this.estado = estado;
    }

    public Double getCalificacion() {
        return calificacion;
    }

    public void setCalificacion(Double calificacion) {
        this.calificacion = calificacion;
    }

    public String getRetroalimentacion() {
        return retroalimentacion;
    }

    public void setRetroalimentacion(String retroalimentacion) {
        this.retroalimentacion = retroalimentacion;
    }

    public LocalDateTime getFechaCalificacion() {
        return fechaCalificacion;
    }

    public void setFechaCalificacion(LocalDateTime fechaCalificacion) {
        this.fechaCalificacion = fechaCalificacion;
    }

    public String getCalificadoPorNombre() {
        return calificadoPorNombre;
    }

    public void setCalificadoPorNombre(String calificadoPorNombre) {
        this.calificadoPorNombre = calificadoPorNombre;
    }

    public boolean isEsGrupal() {
        return esGrupal;
    }

    public void setEsGrupal(boolean esGrupal) {
        this.esGrupal = esGrupal;
    }

    public Long getEntregadoPorId() {
        return entregadoPorId;
    }

    public void setEntregadoPorId(Long entregadoPorId) {
        this.entregadoPorId = entregadoPorId;
    }

    public String getEntregadoPorNombre() {
        return entregadoPorNombre;
    }

    public void setEntregadoPorNombre(String entregadoPorNombre) {
        this.entregadoPorNombre = entregadoPorNombre;
    }

    public String getEntregadoPorEmail() {
        return entregadoPorEmail;
    }

    public void setEntregadoPorEmail(String entregadoPorEmail) {
        this.entregadoPorEmail = entregadoPorEmail;
    }

    public boolean isEsMiEntregaPropia() {
        return esMiEntregaPropia;
    }

    public void setEsMiEntregaPropia(boolean esMiEntregaPropia) {
        this.esMiEntregaPropia = esMiEntregaPropia;
    }

    public Long getGrupoId() {
        return grupoId;
    }

    public void setGrupoId(Long grupoId) {
        this.grupoId = grupoId;
    }

    public String getGrupoNombre() {
        return grupoNombre;
    }

    public void setGrupoNombre(String grupoNombre) {
        this.grupoNombre = grupoNombre;
    }

    public List<String> getCompanerosEquipo() {
        return companerosEquipo;
    }

    public void setCompanerosEquipo(List<String> companerosEquipo) {
        this.companerosEquipo = companerosEquipo;
    }

    // ---- Mejoras: retraso, intentos y puntajes por criterio ----
    private boolean conRetraso;
    private int intentos = 1;
    private Double puntajeMaximoTarea;
    private java.util.List<MejorasDTOs.PuntajeDTO> puntajesCriterios = new java.util.ArrayList<>();

    public boolean isConRetraso() {
        return conRetraso;
    }

    public void setConRetraso(boolean conRetraso) {
        this.conRetraso = conRetraso;
    }

    public int getIntentos() {
        return intentos;
    }

    public void setIntentos(int intentos) {
        this.intentos = intentos;
    }

    public Double getPuntajeMaximoTarea() {
        return puntajeMaximoTarea;
    }

    public void setPuntajeMaximoTarea(Double puntajeMaximoTarea) {
        this.puntajeMaximoTarea = puntajeMaximoTarea;
    }

    public java.util.List<MejorasDTOs.PuntajeDTO> getPuntajesCriterios() {
        return puntajesCriterios;
    }

    public void setPuntajesCriterios(java.util.List<MejorasDTOs.PuntajeDTO> puntajesCriterios) {
        this.puntajesCriterios = puntajesCriterios;
    }
}
