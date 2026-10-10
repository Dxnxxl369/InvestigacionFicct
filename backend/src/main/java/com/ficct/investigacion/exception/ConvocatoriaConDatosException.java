package com.ficct.investigacion.exception;

public class ConvocatoriaConDatosException extends RuntimeException {

    private final int totalParticipantes;
    private final int totalTareas;

    public ConvocatoriaConDatosException(String message, int totalParticipantes, int totalTareas) {
        super(message);
        this.totalParticipantes = totalParticipantes;
        this.totalTareas = totalTareas;
    }

    public int getTotalParticipantes() {
        return totalParticipantes;
    }

    public int getTotalTareas() {
        return totalTareas;
    }
}
