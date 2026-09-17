package com.ficct.investigacion.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class CalificarEntregaRequest {

    @NotNull(message = "La calificacion es obligatoria")
    @Min(value = 0, message = "La calificacion minima es 0")
    @Max(value = 100, message = "La calificacion maxima no puede exceder 100")
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
}
