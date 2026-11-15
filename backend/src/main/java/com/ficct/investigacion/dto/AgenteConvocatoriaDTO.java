package com.ficct.investigacion.dto;

import java.util.List;

public class AgenteConvocatoriaDTO {

    public static class ChatRequest {
        private String mensaje;
        private ConvocatoriaBorradorDTO estadoActual;
        private List<ChatMessage> historial;

        public String getMensaje() { return mensaje; }
        public void setMensaje(String mensaje) { this.mensaje = mensaje; }
        public ConvocatoriaBorradorDTO getEstadoActual() { return estadoActual; }
        public void setEstadoActual(ConvocatoriaBorradorDTO estadoActual) { this.estadoActual = estadoActual; }
        public List<ChatMessage> getHistorial() { return historial; }
        public void setHistorial(List<ChatMessage> historial) { this.historial = historial; }
    }

    public static class ChatMessage {
        private String remitente; // USER o AGENTE
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

    public static class ConvocatoriaBorradorDTO {
        private String tipo; // HACKATHON, FERIA, CONCURSO, INVESTIGACION
        private String modalidadInscripcion; // INDIVIDUAL, GRUPAL
        private String titulo;
        private String descripcion;
        private String fechaFinInscripcion; // YYYY-MM-DD
        private Integer cuposMinEquipo;
        private Integer cuposMaxEquipo;
        private List<String> requisitos;
        private List<Long> selectedDocenteIds;
        private String docenteSugeridoNombre;

        public String getTipo() { return tipo; }
        public void setTipo(String tipo) { this.tipo = tipo; }
        public String getModalidadInscripcion() { return modalidadInscripcion; }
        public void setModalidadInscripcion(String modalidadInscripcion) { this.modalidadInscripcion = modalidadInscripcion; }
        public String getTitulo() { return titulo; }
        public void setTitulo(String titulo) { this.titulo = titulo; }
        public String getDescripcion() { return descripcion; }
        public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
        public String getFechaFinInscripcion() { return fechaFinInscripcion; }
        public void setFechaFinInscripcion(String fechaFinInscripcion) { this.fechaFinInscripcion = fechaFinInscripcion; }
        public Integer getCuposMinEquipo() { return cuposMinEquipo; }
        public void setCuposMinEquipo(Integer cuposMinEquipo) { this.cuposMinEquipo = cuposMinEquipo; }
        public Integer getCuposMaxEquipo() { return cuposMaxEquipo; }
        public void setCuposMaxEquipo(Integer cuposMaxEquipo) { this.cuposMaxEquipo = cuposMaxEquipo; }
        public List<String> getRequisitos() { return requisitos; }
        public void setRequisitos(List<String> requisitos) { this.requisitos = requisitos; }
        public List<Long> getSelectedDocenteIds() { return selectedDocenteIds; }
        public void setSelectedDocenteIds(List<Long> selectedDocenteIds) { this.selectedDocenteIds = selectedDocenteIds; }
        public String getDocenteSugeridoNombre() { return docenteSugeridoNombre; }
        public void setDocenteSugeridoNombre(String docenteSugeridoNombre) { this.docenteSugeridoNombre = docenteSugeridoNombre; }
    }

    public static class ChatResponse {
        private String mensajeAgente;
        private ConvocatoriaBorradorDTO borradorActualizado;
        private List<String> camposFaltantes;
        private List<DocenteOpcionDTO> docentesDisponibles;
        private int porcentajeProgreso;

        public String getMensajeAgente() { return mensajeAgente; }
        public void setMensajeAgente(String mensajeAgente) { this.mensajeAgente = mensajeAgente; }
        public ConvocatoriaBorradorDTO getBorradorActualizado() { return borradorActualizado; }
        public void setBorradorActualizado(ConvocatoriaBorradorDTO borradorActualizado) { this.borradorActualizado = borradorActualizado; }
        public List<String> getCamposFaltantes() { return camposFaltantes; }
        public void setCamposFaltantes(List<String> camposFaltantes) { this.camposFaltantes = camposFaltantes; }
        public List<DocenteOpcionDTO> getDocentesDisponibles() { return docentesDisponibles; }
        public void setDocentesDisponibles(List<DocenteOpcionDTO> docentesDisponibles) { this.docentesDisponibles = docentesDisponibles; }
        public int getPorcentajeProgreso() { return porcentajeProgreso; }
        public void setPorcentajeProgreso(int porcentajeProgreso) { this.porcentajeProgreso = porcentajeProgreso; }
    }

    public static class DocenteOpcionDTO {
        private Long id;
        private String nombreCompleto;
        private String email;

        public DocenteOpcionDTO(Long id, String nombreCompleto, String email) {
            this.id = id;
            this.nombreCompleto = nombreCompleto;
            this.email = email;
        }

        public Long getId() { return id; }
        public String getNombreCompleto() { return nombreCompleto; }
        public String getEmail() { return email; }
    }
}
