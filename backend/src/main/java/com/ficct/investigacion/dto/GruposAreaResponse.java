package com.ficct.investigacion.dto;

import java.util.ArrayList;
import java.util.List;

public class GruposAreaResponse {
    private List<GrupoDTO> grupos = new ArrayList<>();
    private List<ConvocatoriaParticipanteDTO> estudiantesSinEquipo = new ArrayList<>();
    private int totalEstudiantes;
    private int totalConEquipo;
    private int totalSinEquipo;

    public GruposAreaResponse() {
    }

    public GruposAreaResponse(List<GrupoDTO> grupos, List<ConvocatoriaParticipanteDTO> estudiantesSinEquipo,
                              int totalEstudiantes, int totalConEquipo, int totalSinEquipo) {
        this.grupos = grupos != null ? grupos : new ArrayList<>();
        this.estudiantesSinEquipo = estudiantesSinEquipo != null ? estudiantesSinEquipo : new ArrayList<>();
        this.totalEstudiantes = totalEstudiantes;
        this.totalConEquipo = totalConEquipo;
        this.totalSinEquipo = totalSinEquipo;
    }

    public List<GrupoDTO> getGrupos() {
        return grupos;
    }

    public void setGrupos(List<GrupoDTO> grupos) {
        this.grupos = grupos;
    }

    public List<ConvocatoriaParticipanteDTO> getEstudiantesSinEquipo() {
        return estudiantesSinEquipo;
    }

    public void setEstudiantesSinEquipo(List<ConvocatoriaParticipanteDTO> estudiantesSinEquipo) {
        this.estudiantesSinEquipo = estudiantesSinEquipo;
    }

    public int getTotalEstudiantes() {
        return totalEstudiantes;
    }

    public void setTotalEstudiantes(int totalEstudiantes) {
        this.totalEstudiantes = totalEstudiantes;
    }

    public int getTotalConEquipo() {
        return totalConEquipo;
    }

    public void setTotalConEquipo(int totalConEquipo) {
        this.totalConEquipo = totalConEquipo;
    }

    public int getTotalSinEquipo() {
        return totalSinEquipo;
    }

    public void setTotalSinEquipo(int totalSinEquipo) {
        this.totalSinEquipo = totalSinEquipo;
    }
}
