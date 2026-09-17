package com.ficct.investigacion.dto;

public class InscribirseAreaRequest {

    private String nombreEquipo;

    public InscribirseAreaRequest() {
    }

    public InscribirseAreaRequest(String nombreEquipo) {
        this.nombreEquipo = nombreEquipo;
    }

    public String getNombreEquipo() {
        return nombreEquipo;
    }

    public void setNombreEquipo(String nombreEquipo) {
        this.nombreEquipo = nombreEquipo;
    }
}
