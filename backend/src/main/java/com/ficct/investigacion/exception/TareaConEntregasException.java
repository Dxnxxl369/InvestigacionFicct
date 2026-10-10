package com.ficct.investigacion.exception;

public class TareaConEntregasException extends RuntimeException {

    private final int totalEntregas;

    public TareaConEntregasException(String message, int totalEntregas) {
        super(message);
        this.totalEntregas = totalEntregas;
    }

    public int getTotalEntregas() {
        return totalEntregas;
    }
}
