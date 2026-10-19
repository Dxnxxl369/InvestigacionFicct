package com.ficct.investigacion.dto;

import java.util.List;

public record FeriaProyectoRequest(
        String tema, String area, String categoria, String materia, String sigla,
        String grupoMateria, String docente, List<FeriaIntegranteRequest> integrantes
) {
    public record FeriaIntegranteRequest(
            String registro, String nombre, String carrera, String celular,
            Integer semestre, Integer ferias, String correo, Boolean crearCuenta
    ) {}
}
