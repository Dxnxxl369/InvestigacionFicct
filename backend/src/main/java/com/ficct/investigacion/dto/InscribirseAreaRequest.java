package com.ficct.investigacion.dto;

import java.util.ArrayList;
import java.util.List;

public class InscribirseAreaRequest {

    private String nombreEquipo;
    private Integer numeroGrupo;
    private List<String> integrantesEmails = new ArrayList<>();

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

    public Integer getNumeroGrupo() {
        return numeroGrupo;
    }

    public void setNumeroGrupo(Integer numeroGrupo) {
        this.numeroGrupo = numeroGrupo;
    }

    public List<String> getIntegrantesEmails() {
        return integrantesEmails;
    }

    public void setIntegrantesEmails(List<String> integrantesEmails) {
        this.integrantesEmails = integrantesEmails != null ? integrantesEmails : new ArrayList<>();
    }
}
