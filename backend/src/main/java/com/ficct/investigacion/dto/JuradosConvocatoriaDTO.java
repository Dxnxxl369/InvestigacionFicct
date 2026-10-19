package com.ficct.investigacion.dto;

import java.util.List;

public record JuradosConvocatoriaDTO(List<JuradoProyectoDTO> proyectos,
                                    List<JuradoAsignacionDTO> jurados) {}
