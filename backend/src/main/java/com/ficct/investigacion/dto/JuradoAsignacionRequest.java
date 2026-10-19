package com.ficct.investigacion.dto;

import java.util.List;

public record JuradoAsignacionRequest(boolean todos, List<Long> proyectoIds) {}
