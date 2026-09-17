package com.ficct.investigacion.dto;

public class EntregaRequest {

    private Long documentoId; // Opcional: vincula un documento creado en la plataforma

    private String nombreArchivo; // Nombre del archivo subido o entregado

    private String archivoUrl; // URL del archivo o hash

    private String comentarioEstudiante;

    public EntregaRequest() {
    }

    public Long getDocumentoId() {
        return documentoId;
    }

    public void setDocumentoId(Long documentoId) {
        this.documentoId = documentoId;
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
}
