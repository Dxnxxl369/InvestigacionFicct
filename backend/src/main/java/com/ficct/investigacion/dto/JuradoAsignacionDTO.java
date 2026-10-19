package com.ficct.investigacion.dto;

import java.util.List;

public record JuradoAsignacionDTO(Long participanteId, Long usuarioId, String nombre,
                                  String correo, boolean todos, List<Long> proyectoIds) {}
