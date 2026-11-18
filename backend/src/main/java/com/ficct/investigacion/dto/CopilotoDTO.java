package com.ficct.investigacion.dto;

import java.util.ArrayList;
import java.util.List;

public class CopilotoDTO {

    public static class ChatMessage {
        private String remitente; // USER o COPILOTO
        private String texto;

        public ChatMessage() {}
        public ChatMessage(String remitente, String texto) {
            this.remitente = remitente;
            this.texto = texto;
        }

        public String getRemitente() { return remitente; }
        public void setRemitente(String remitente) { this.remitente = remitente; }
        public String getTexto() { return texto; }
        public void setTexto(String texto) { this.texto = texto; }
    }

    public static class CopilotoRequest {
        private String mensaje;
        private String rutaActual;
        private List<ChatMessage> historial;

        public String getMensaje() { return mensaje; }
        public void setMensaje(String mensaje) { this.mensaje = mensaje; }
        public String getRutaActual() { return rutaActual; }
        public void setRutaActual(String rutaActual) { this.rutaActual = rutaActual; }
        public List<ChatMessage> getHistorial() { return historial; }
        public void setHistorial(List<ChatMessage> historial) { this.historial = historial; }
    }

    public static class OpcionNavegacion {
        private String titulo;
        private String subtitulo;
        private String ruta;
        private String badge;
        private String tipoAccion; // NAVEGAR o ABRIR_AGENTE

        public OpcionNavegacion() {}

        public OpcionNavegacion(String titulo, String subtitulo, String ruta, String badge, String tipoAccion) {
            this.titulo = titulo;
            this.subtitulo = subtitulo;
            this.ruta = ruta;
            this.badge = badge;
            this.tipoAccion = tipoAccion;
        }

        public String getTitulo() { return titulo; }
        public void setTitulo(String titulo) { this.titulo = titulo; }
        public String getSubtitulo() { return subtitulo; }
        public void setSubtitulo(String subtitulo) { this.subtitulo = subtitulo; }
        public String getRuta() { return ruta; }
        public void setRuta(String ruta) { this.ruta = ruta; }
        public String getBadge() { return badge; }
        public void setBadge(String badge) { this.badge = badge; }
        public String getTipoAccion() { return tipoAccion; }
        public void setTipoAccion(String tipoAccion) { this.tipoAccion = tipoAccion; }
    }

    public static class CopilotoResponse {
        private String mensaje;
        private String accion = "NONE"; // NONE, NAVEGAR, MOSTRAR_OPCIONES, ABRIR_AGENTE_CONVOCATORIA
        private String rutaDestino;
        private String mensajeInicialAgente;
        private List<OpcionNavegacion> opciones = new ArrayList<>();

        public String getMensaje() { return mensaje; }
        public void setMensaje(String mensaje) { this.mensaje = mensaje; }
        public String getAccion() { return accion; }
        public void setAccion(String accion) { this.accion = accion; }
        public String getRutaDestino() { return rutaDestino; }
        public void setRutaDestino(String rutaDestino) { this.rutaDestino = rutaDestino; }
        public String getMensajeInicialAgente() { return mensajeInicialAgente; }
        public void setMensajeInicialAgente(String mensajeInicialAgente) { this.mensajeInicialAgente = mensajeInicialAgente; }
        public List<OpcionNavegacion> getOpciones() { return opciones; }
        public void setOpciones(List<OpcionNavegacion> opciones) { this.opciones = opciones; }
    }
}
