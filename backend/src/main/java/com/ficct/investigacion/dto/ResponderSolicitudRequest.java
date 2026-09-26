package com.ficct.investigacion.dto;

public class ResponderSolicitudRequest {

    private String accion; // "ADMITIR" o "RECHAZAR"
    private String motivo; // Opcional, motivo si se rechaza

    public ResponderSolicitudRequest() {
    }

    public ResponderSolicitudRequest(String accion, String motivo) {
        this.accion = accion;
        this.motivo = motivo;
    }

    public String getAccion() {
        return accion;
    }

    public void setAccion(String accion) {
        this.accion = accion;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }
}
