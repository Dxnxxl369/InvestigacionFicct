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

    public static class ItemConfirmacion {
        private Long id;
        private String titulo;
        private String subtitulo;
        private boolean seleccionado = true;

        public ItemConfirmacion() {}

        public ItemConfirmacion(Long id, String titulo, String subtitulo, boolean seleccionado) {
            this.id = id;
            this.titulo = titulo;
            this.subtitulo = subtitulo;
            this.seleccionado = seleccionado;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getTitulo() { return titulo; }
        public void setTitulo(String titulo) { this.titulo = titulo; }
        public String getSubtitulo() { return subtitulo; }
        public void setSubtitulo(String subtitulo) { this.subtitulo = subtitulo; }
        public boolean isSeleccionado() { return seleccionado; }
        public void setSeleccionado(boolean seleccionado) { this.seleccionado = seleccionado; }
    }

    public static class ConfirmacionPendiente {
        private String tipoAccion; // GESTIONAR_TAREA, GESTIONAR_PLANTILLA_TAREA, CAMBIAR_ESTADO_LOTE, CAMBIAR_ESTADO_CONVOCATORIA
        private String titulo;
        private String detalle;
        private Long targetId;
        private String valorTexto;
        private Boolean habilitada;
        private String aulaNombre;
        private String moduloNombre;
        private String tipoActividad;
        private String fechaHabilitacion;
        private String fechaEntrega;
        private String fechaCorte;
        private List<ItemConfirmacion> items = new ArrayList<>();

        public ConfirmacionPendiente() {}

        public ConfirmacionPendiente(String tipoAccion, String titulo, String detalle, Long targetId, String valorTexto, Boolean habilitada) {
            this.tipoAccion = tipoAccion;
            this.titulo = titulo;
            this.detalle = detalle;
            this.targetId = targetId;
            this.valorTexto = valorTexto;
            this.habilitada = habilitada;
        }

        public String getTipoAccion() { return tipoAccion; }
        public void setTipoAccion(String tipoAccion) { this.tipoAccion = tipoAccion; }
        public String getTitulo() { return titulo; }
        public void setTitulo(String titulo) { this.titulo = titulo; }
        public String getDetalle() { return detalle; }
        public void setDetalle(String detalle) { this.detalle = detalle; }
        public Long getTargetId() { return targetId; }
        public void setTargetId(Long targetId) { this.targetId = targetId; }
        public String getValorTexto() { return valorTexto; }
        public void setValorTexto(String valorTexto) { this.valorTexto = valorTexto; }
        public Boolean getHabilitada() { return habilitada; }
        public void setHabilitada(Boolean habilitada) { this.habilitada = habilitada; }
        public String getAulaNombre() { return aulaNombre; }
        public void setAulaNombre(String aulaNombre) { this.aulaNombre = aulaNombre; }
        public String getModuloNombre() { return moduloNombre; }
        public void setModuloNombre(String moduloNombre) { this.moduloNombre = moduloNombre; }
        public String getTipoActividad() { return tipoActividad; }
        public void setTipoActividad(String tipoActividad) { this.tipoActividad = tipoActividad; }
        public String getFechaHabilitacion() { return fechaHabilitacion; }
        public void setFechaHabilitacion(String fechaHabilitacion) { this.fechaHabilitacion = fechaHabilitacion; }
        public String getFechaEntrega() { return fechaEntrega; }
        public void setFechaEntrega(String fechaEntrega) { this.fechaEntrega = fechaEntrega; }
        public String getFechaCorte() { return fechaCorte; }
        public void setFechaCorte(String fechaCorte) { this.fechaCorte = fechaCorte; }
        public List<ItemConfirmacion> getItems() { return items; }
        public void setItems(List<ItemConfirmacion> items) { this.items = items; }
    }

    public static class ConfirmarAccionRequest {
        private String tipoAccion;
        private Long targetId;
        private List<Long> targetIds;
        private String valorTexto;
        private Boolean habilitada;
        private String fechaHabilitacion;
        private String fechaEntrega;
        private String fechaCorte;

        public String getTipoAccion() { return tipoAccion; }
        public void setTipoAccion(String tipoAccion) { this.tipoAccion = tipoAccion; }
        public Long getTargetId() { return targetId; }
        public void setTargetId(Long targetId) { this.targetId = targetId; }
        public List<Long> getTargetIds() { return targetIds; }
        public void setTargetIds(List<Long> targetIds) { this.targetIds = targetIds; }
        public String getValorTexto() { return valorTexto; }
        public void setValorTexto(String valorTexto) { this.valorTexto = valorTexto; }
        public Boolean getHabilitada() { return habilitada; }
        public void setHabilitada(Boolean habilitada) { this.habilitada = habilitada; }
        public String getFechaHabilitacion() { return fechaHabilitacion; }
        public void setFechaHabilitacion(String fechaHabilitacion) { this.fechaHabilitacion = fechaHabilitacion; }
        public String getFechaEntrega() { return fechaEntrega; }
        public void setFechaEntrega(String fechaEntrega) { this.fechaEntrega = fechaEntrega; }
        public String getFechaCorte() { return fechaCorte; }
        public void setFechaCorte(String fechaCorte) { this.fechaCorte = fechaCorte; }
    }

    public static class ReporteGeneradoDTO {
        private String titulo;
        private String resumen;
        private String nombreArchivo;
        private String pdfBase64;
        private String rutaReportes;

        public ReporteGeneradoDTO() {}

        public ReporteGeneradoDTO(String titulo, String resumen, String nombreArchivo, String pdfBase64, String rutaReportes) {
            this.titulo = titulo;
            this.resumen = resumen;
            this.nombreArchivo = nombreArchivo;
            this.pdfBase64 = pdfBase64;
            this.rutaReportes = rutaReportes;
        }

        public String getTitulo() { return titulo; }
        public void setTitulo(String titulo) { this.titulo = titulo; }
        public String getResumen() { return resumen; }
        public void setResumen(String resumen) { this.resumen = resumen; }
        public String getNombreArchivo() { return nombreArchivo; }
        public void setNombreArchivo(String nombreArchivo) { this.nombreArchivo = nombreArchivo; }
        public String getPdfBase64() { return pdfBase64; }
        public void setPdfBase64(String pdfBase64) { this.pdfBase64 = pdfBase64; }
        public String getRutaReportes() { return rutaReportes; }
        public void setRutaReportes(String rutaReportes) { this.rutaReportes = rutaReportes; }
    }

    public static class CopilotoResponse {
        private String mensaje;
        private String accion = "NONE"; // NONE, NAVEGAR, MOSTRAR_OPCIONES, ABRIR_AGENTE_CONVOCATORIA, CONFIRMAR_ACCION, REPORTE_PDF
        private String rutaDestino;
        private String mensajeInicialAgente;
        private List<OpcionNavegacion> opciones = new ArrayList<>();
        private ConfirmacionPendiente confirmacionPendiente;
        private ReporteGeneradoDTO reporteGenerado;

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
        public ConfirmacionPendiente getConfirmacionPendiente() { return confirmacionPendiente; }
        public void setConfirmacionPendiente(ConfirmacionPendiente confirmacionPendiente) { this.confirmacionPendiente = confirmacionPendiente; }
        public ReporteGeneradoDTO getReporteGenerado() { return reporteGenerado; }
        public void setReporteGenerado(ReporteGeneradoDTO reporteGenerado) { this.reporteGenerado = reporteGenerado; }
    }
}
