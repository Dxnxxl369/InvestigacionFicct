package com.ficct.investigacion.dto;

public class InscribirseAreaRequest {

    private String nombreEquipo;
    private FeriaProyectoRequest feriaProyecto;

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

    public FeriaProyectoRequest getFeriaProyecto() {
        return feriaProyecto;
    }

    public void setFeriaProyecto(FeriaProyectoRequest feriaProyecto) {
        this.feriaProyecto = feriaProyecto;
    }
}
