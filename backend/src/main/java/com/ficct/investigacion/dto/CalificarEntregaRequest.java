package com.ficct.investigacion.dto;

import jakarta.validation.constraints.Min;

public class CalificarEntregaRequest {

    @Min(value = 0, message = "La calificacion minima es 0")
    private Double calificacion;

    private String retroalimentacion;

    public CalificarEntregaRequest() {
    }

    public CalificarEntregaRequest(Double calificacion, String retroalimentacion) {
        this.calificacion = calificacion;
        this.retroalimentacion = retroalimentacion;
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

    // ---- Mejoras: calificacion por rubrica ----
    private java.util.List<MejorasDTOs.PuntajeRequest> puntajesCriterios;

    public java.util.List<MejorasDTOs.PuntajeRequest> getPuntajesCriterios() {
        return puntajesCriterios;
    }

    public void setPuntajesCriterios(java.util.List<MejorasDTOs.PuntajeRequest> puntajesCriterios) {
        this.puntajesCriterios = puntajesCriterios;
    }
}
